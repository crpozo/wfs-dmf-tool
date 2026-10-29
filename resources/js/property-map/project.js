/*
 * Property map project: vertices (lat/lng, never pixels), runs between consecutive
 * vertices, per-run overrides, and undo/redo.
 *
 * Runs are keyed by the ids of their two vertices, so moving a vertex keeps the run's
 * manual length (override_ft), wall flag and gates. toJSON() returns the format agreed
 * in the Phase 2 requirements (vertices and runs by index).
 */
import { History } from './history.js';
import { defaultGate, fitGate } from './gates.js';

const MAX_OVERRIDE_FT = 5000;

let lastVertexId = 0;
const newVertexId = () => `v${++lastVertexId}`;

let lastGateId = 0;
const newGateId = () => `g${++lastGateId}`;

const runKey = (fromId, toId) => `${fromId}>${toId}`;

// material is the fence slot (1 to 3) of the configuration, as in the canvas.
const emptyRunProps = () => ({ override_ft: null, is_existing_wall: false, material: 1, gates: [] });

export function createProjectStore({ distanceFt }) {
    const state = {
        address: '',
        placeId: null,
        center: null,
        zoom: 20,
        vertices: [],
        closed: false,
        runProps: new Map(),
        selectedRun: null,
    };
    const listeners = new Set();
    const history = new History(50);

    function runs() {
        const { vertices, closed } = state;
        const list = [];
        for (let i = 0; i < vertices.length - 1; i++) {
            list.push(makeRun(i, i + 1));
        }
        if (closed && vertices.length >= 3) {
            list.push(makeRun(vertices.length - 1, 0));
        }
        return list;
    }

    function makeRun(fromIndex, toIndex) {
        const a = state.vertices[fromIndex];
        const b = state.vertices[toIndex];
        const key = runKey(a.id, b.id);
        const props = state.runProps.get(key) || emptyRunProps();
        const calcFt = distanceFt(a, b);
        const effectiveFt = props.override_ft ?? calcFt;
        return {
            key,
            from: fromIndex,
            to: toIndex,
            a,
            b,
            calc_ft: calcFt,
            override_ft: props.override_ft,
            is_existing_wall: props.is_existing_wall,
            material: props.material ?? 1,
            gates: props.gates,
            effective_ft: effectiveFt,
            gates_fit: props.gates.every((gate, index) =>
                fitGate(gate, effectiveFt, props.gates.filter((_, other) => other !== index)) !== null),
        };
    }

    function propsFor(key) {
        if (!state.runProps.has(key)) {
            state.runProps.set(key, emptyRunProps());
        }
        return state.runProps.get(key);
    }

    function snapshot() {
        return JSON.stringify({
            address: state.address,
            placeId: state.placeId,
            vertices: state.vertices,
            closed: state.closed,
            runProps: [...state.runProps.entries()],
        });
    }

    function restore(json) {
        const data = JSON.parse(json);
        state.address = data.address;
        state.placeId = data.placeId;
        state.vertices = data.vertices;
        state.closed = data.closed;
        state.runProps = new Map(data.runProps);
        syncVertexIdCounter();
        if (state.selectedRun && !runs().some((run) => run.key === state.selectedRun)) {
            state.selectedRun = null;
        }
    }

    function syncVertexIdCounter() {
        for (const vertex of state.vertices) {
            lastVertexId = Math.max(lastVertexId, Number(vertex.id.slice(1)) || 0);
        }
        for (const props of state.runProps.values()) {
            for (const gate of props.gates) {
                lastGateId = Math.max(lastGateId, Number(gate.id.slice(1)) || 0);
            }
        }
    }

    function findRun(key) {
        return runs().find((run) => run.key === key) || null;
    }

    // Drop the properties of runs that no longer exist so they don't come back if
    // the same two vertices are connected again later.
    function pruneRunProps() {
        const live = new Set(runs().map((run) => run.key));
        for (const key of state.runProps.keys()) {
            if (!live.has(key)) {
                state.runProps.delete(key);
            }
        }
        if (state.selectedRun && !live.has(state.selectedRun)) {
            state.selectedRun = null;
        }
    }

    function commit(reason) {
        pruneRunProps();
        history.push(snapshot());
        emit(reason);
    }

    function emit(reason) {
        listeners.forEach((listener) => listener(reason));
    }

    history.reset(snapshot());

    return {
        state,
        runs,

        subscribe(listener) {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },

        setLocation({ address, placeId, center }) {
            state.address = address || '';
            state.placeId = placeId || null;
            if (center) {
                state.center = center;
            }
            commit('location');
        },

        // Camera changes are saved with the project but are not undo steps.
        setView({ center, zoom }) {
            state.center = center;
            state.zoom = zoom;
        },

        canAddVertex() {
            return !state.closed;
        },

        addVertex(latLng) {
            if (state.closed) {
                return false;
            }
            state.vertices.push({ id: newVertexId(), lat: latLng.lat, lng: latLng.lng });
            commit('vertex-added');
            return true;
        },

        moveVertex(id, latLng, { commit: isFinal = true } = {}) {
            const vertex = state.vertices.find((item) => item.id === id);
            if (!vertex) {
                return;
            }
            vertex.lat = latLng.lat;
            vertex.lng = latLng.lng;
            if (isFinal) {
                commit('vertex-moved');
            } else {
                emit('vertex-dragging');
            }
        },

        removeVertex(id) {
            const index = state.vertices.findIndex((item) => item.id === id);
            if (index === -1) {
                return;
            }
            state.vertices.splice(index, 1);
            if (state.vertices.length < 3) {
                state.closed = false;
            }
            commit('vertex-removed');
        },

        canClose() {
            return !state.closed && state.vertices.length >= 3;
        },

        closeShape() {
            if (!this.canClose()) {
                return false;
            }
            state.closed = true;
            commit('closed');
            return true;
        },

        setOverride(key, value) {
            const props = propsFor(key);
            const number = value === null || value === '' ? null : Math.round(Number(value));
            props.override_ft = Number.isFinite(number) && number > 0 && number <= MAX_OVERRIDE_FT ? number : null;
            commit('override');
        },

        setExistingWall(key, isWall) {
            const props = propsFor(key);
            props.is_existing_wall = Boolean(isWall);
            if (props.is_existing_wall) {
                props.gates = []; // an existing wall gets no fence and no gates
            }
            commit('wall');
        },

        setRunMaterial(key, slot) {
            propsFor(key).material = Number(slot) || 1;
            commit('material');
        },

        // Returns false when the gate doesn't fit on the run.
        addGate(key, type = 'single') {
            const run = findRun(key);
            if (!run || run.is_existing_wall) {
                return false;
            }
            const props = propsFor(key);
            const gate = { id: newGateId(), ...defaultGate(type) };
            const t = fitGate(gate, run.effective_ft, props.gates);
            if (t === null) {
                return false;
            }
            gate.t = t;
            props.gates.push(gate);
            state.selectedRun = key;
            commit('gate-added');
            return true;
        },

        // Returns false (and changes nothing) when the change would not fit on the run.
        updateGate(key, gateId, changes, { commit: isFinal = true } = {}) {
            const run = findRun(key);
            const props = propsFor(key);
            const gate = props.gates.find((item) => item.id === gateId);
            if (!run || !gate) {
                return false;
            }
            const next = { ...gate, ...changes };
            const t = fitGate(next, run.effective_ft, props.gates.filter((item) => item.id !== gateId));
            if (t === null) {
                return false;
            }
            Object.assign(gate, next, { t });
            if (isFinal) {
                commit('gate-changed');
            } else {
                emit('gate-dragging');
            }
            return true;
        },

        removeGate(key, gateId) {
            const props = propsFor(key);
            props.gates = props.gates.filter((gate) => gate.id !== gateId);
            commit('gate-removed');
        },

        selectRun(key) {
            state.selectedRun = state.selectedRun === key ? null : key;
            emit('selection');
        },

        clear() {
            state.vertices = [];
            state.closed = false;
            state.runProps.clear();
            state.selectedRun = null;
            commit('cleared');
        },

        isEmpty() {
            return state.vertices.length === 0;
        },

        canUndo: () => history.canUndo(),
        canRedo: () => history.canRedo(),

        undo() {
            const previous = history.undo();
            if (previous !== null) {
                restore(previous);
                emit('undo');
            }
        },

        redo() {
            const next = history.redo();
            if (next !== null) {
                restore(next);
                emit('redo');
            }
        },

        totalFenceFt() {
            return runs()
                .filter((run) => !run.is_existing_wall)
                .reduce((sum, run) => sum + run.effective_ft, 0);
        },

        toJSON() {
            return {
                source: 'map',
                address: state.address,
                place_id: state.placeId,
                center: state.center,
                zoom: state.zoom,
                vertices: state.vertices.map(({ lat, lng }) => ({ lat, lng })),
                runs: runs().map((run) => ({
                    from: run.from,
                    to: run.to,
                    calc_ft: run.calc_ft,
                    override_ft: run.override_ft,
                    is_existing_wall: run.is_existing_wall,
                    material: run.material,
                    gates: run.gates.map(({ type, style, width_ft, t }) => ({ type, style, width_ft, t })),
                })),
            };
        },

        // Rebuilds a project saved with toJSON() (save and resume by link).
        load(project) {
            const vertices = (project.vertices || []).map(({ lat, lng }) => ({ id: newVertexId(), lat, lng }));
            const savedRuns = project.runs || [];
            state.address = project.address || '';
            state.placeId = project.place_id || null;
            state.center = project.center || null;
            state.zoom = project.zoom || 20;
            state.vertices = vertices;
            state.closed = vertices.length >= 3 && savedRuns.some((run) => run.from === vertices.length - 1 && run.to === 0);
            state.runProps = new Map();
            state.selectedRun = null;
            for (const run of savedRuns) {
                const a = vertices[run.from];
                const b = vertices[run.to];
                if (!a || !b) {
                    continue;
                }
                state.runProps.set(runKey(a.id, b.id), {
                    override_ft: run.override_ft ?? null,
                    is_existing_wall: Boolean(run.is_existing_wall),
                    material: run.material ?? 1,
                    gates: (Array.isArray(run.gates) ? run.gates : []).map((gate) => ({
                        id: newGateId(),
                        type: gate.type === 'double' ? 'double' : 'single',
                        style: gate.style || (gate.type === 'sliding' ? 'sliding' : 'swing'),
                        width_ft: Number(gate.width_ft) || 4,
                        t: Number(gate.t) || 0.5,
                    })),
                });
            }
            history.reset(snapshot());
            emit('loaded');
        },
    };
}
