/*
 * Fence drawing on the map, built on Polyline and draggable AdvancedMarkerElement
 * (DrawingManager was retired and never allowed fine vertex editing).
 *
 * - Draw mode: each click or tap adds a corner; tapping the first corner closes the shape.
 *   With a mouse, pressing and dragging on the map draws a whole side too: the press point
 *   becomes a corner (unless it is the last one) and the release point the next one, so a
 *   customer who drags like in a paint program gets a fence instead of a panned map. Map
 *   panning is off while that applies; Navigate mode pans.
 * - A dotted preview line follows the pointer from the last corner while drawing.
 * - Corners can be dragged; tapping one opens a menu to delete it.
 * - Each run gets a polyline and a length label; each gate a label too. Where the labels
 *   sit is decided by label-layout.js (the same placement the quote image uses): on the
 *   side when there is room, right beside it otherwise, with a thin connector when a
 *   label has to step away, and in a shorter form ("G1 · 4 ft", then a number) when the
 *   drawing is too small on screen. It is worked out again when the drawing or the zoom
 *   changes; panning moves nothing.
 * Everything is re-rendered from the project store, so undo/redo and loading a saved
 * project need no extra code here.
 */

import { gateSpan, pointOnSide, worldPoint, worldToLatLng } from './geometry.js';
import { layoutLabels, rememberLayout } from './label-layout.js';
import { describeLabels } from './labels.js';
import { hasFinePointer } from './mode.js';
import { THEMES, WEIGHTS } from './theme.js';

// Pointer travel that turns a press into a drag, and the snap radius to an existing corner.
const DRAG_PX = 6;
const SNAP_PX = 14;

// Pencil cursor with its tip (the hotspot) at the bottom-left corner: 3,29 of 32x32.
const PENCIL_CURSOR = `url("data:image/svg+xml,${encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">'
    + '<path d="M4 28 L7 19 L22 4 L28 10 L13 25 Z" fill="#ffffff" stroke="#263166" stroke-width="2" stroke-linejoin="round"/>'
    + '<path d="M19 7 L25 13" stroke="#263166" stroke-width="2"/>'
    + '<path d="M4 28 L7 19 L13 25 Z" fill="#2e59c1" stroke="#263166" stroke-width="1.5" stroke-linejoin="round"/>'
    + '</svg>'
)}") 3 29, crosshair`;

// Small dot where a connector meets the side (a symbol on the connector's polyline).
const LEADER_DOT = 'M -1,0 A 1,1 0 1,1 1,0 A 1,1 0 1,1 -1,0 Z';

export function mountDrawing({ map, store, mode, background, libs, onRunFocus, notify }) {
    const { Polyline, InfoWindow, AdvancedMarkerElement } = libs;
    const isPlan = () => background?.get() === 'plan';
    const theme = () => (isPlan() ? THEMES.plan : THEMES.satellite);

    const vertexMarkers = new Map();
    const runLines = new Map();
    const runLabels = new Map();
    const gateViews = new Map();
    const leaders = new Map();
    const labelSizes = new Map();
    let measurer = null;
    let lastLayout = null;
    let layoutFrame = 0;
    const menu = new InfoWindow({ headerDisabled: true });
    const preview = new Polyline({ map: null, clickable: false, zIndex: 5, ...previewStyle() });
    // Labels are laid out for a zoom level; when it changes they are placed again, once per frame.
    map.addListener('zoom_changed', scheduleLayout);
    document.fonts?.ready
        .then(() => {
            labelSizes.clear(); // measured before the brand font arrived
            scheduleLayout();
        })
        .catch(() => {}); // without the brand font the labels keep the sizes already measured
    let draggingId = null;
    let draggingGateId = null;
    // Mouse press on the map in Draw mode (drag-to-draw): where it started and the last
    // pointer position seen, in case the release lands on a marker or outside the map.
    let press = null;
    // Maps fires 'click' shortly after the mouseup that ended a drag-to-draw; ignore that one.
    let swallowClicksUntil = 0;

    const dragToDraw = () => mode.isDrawing() && hasFinePointer();
    const lastVertex = () => store.state.vertices[store.state.vertices.length - 1] || null;

    map.addListener('click', (event) => {
        menu.close();
        if (Date.now() < swallowClicksUntil) {
            return;
        }
        if (!mode.isDrawing()) {
            return;
        }
        addCorner(event.latLng.toJSON());
    });

    function addCorner(latLng) {
        if (!store.addVertex(latLng)) {
            notify('The shape is closed. Drag a corner to adjust it, or delete a corner to reopen it.');
            return false;
        }
        return true;
    }

    map.addListener('mousedown', (event) => {
        if (!dragToDraw() || !event.domEvent || event.domEvent.button !== 0) {
            return;
        }
        menu.close();
        const { clientX, clientY } = event.domEvent;
        press = { latLng: event.latLng.toJSON(), clientX, clientY, current: event.latLng.toJSON(), dragging: false };
    });

    map.addListener('mousemove', (event) => {
        const point = event.latLng.toJSON();
        if (press) {
            press.current = point;
            if (!press.dragging && event.domEvent
                && Math.hypot(event.domEvent.clientX - press.clientX, event.domEvent.clientY - press.clientY) >= DRAG_PX) {
                press.dragging = true;
            }
        }
        updatePreview(point);
    });

    map.addListener('mouseout', () => {
        if (!press) {
            preview.setMap(null);
        }
    });

    map.addListener('mouseup', (event) => finishPress(event.domEvent));
    // The release may land on a corner, a label or outside the map, where the map gets no mouseup.
    document.addEventListener('mouseup', (event) => finishPress(event), true);

    function finishPress(domEvent) {
        if (!press) {
            return;
        }
        const { latLng: start, current, dragging } = press;
        const startsAtLastCorner = pressOnLastCorner(press);
        press = null;
        if (!dragging || !store.canAddVertex()) {
            return; // a plain click: the click listener adds the corner
        }
        swallowClicksUntil = Date.now() + 400;

        if (!startsAtLastCorner) {
            addCorner(start);
        }
        const first = store.state.vertices[0];
        if (first && store.canClose() && domEvent && nearMarker(domEvent.clientX, domEvent.clientY, vertexMarkers.get(first.id))) {
            store.closeShape();
        } else {
            addCorner(current);
        }
        updatePreview(current);
    }

    // The map does not pan while a press is held, so the marker boxes measured now match the press.
    function pressOnLastCorner(pressed) {
        const last = lastVertex();
        return Boolean(last) && nearMarker(pressed.clientX, pressed.clientY, vertexMarkers.get(last.id));
    }

    // Is the screen point within SNAP_PX of a corner marker? Uses the marker's box, so no projection is needed.
    function nearMarker(x, y, marker) {
        const box = marker?.content?.getBoundingClientRect();
        if (!box || !Number.isFinite(x) || !Number.isFinite(y)) {
            return false;
        }
        return Math.hypot(x - (box.left + box.width / 2), y - (box.top + box.height / 2)) <= box.width / 2 + SNAP_PX;
    }

    function updatePreview(point) {
        const last = lastVertex();
        // A drag starts the side at the press point, also for the very first side (no corner yet).
        const dragStart = press?.dragging && !pressOnLastCorner(press) ? press.latLng : null;
        const from = dragStart || (last ? { lat: last.lat, lng: last.lng } : null);
        if (!mode.isDrawing() || store.state.closed || !from || draggingId || draggingGateId) {
            preview.setMap(null);
            return;
        }
        preview.setPath([from, point]);
        if (!preview.getMap()) {
            preview.setMap(map);
        }
    }

    function createVertexMarker(id) {
        const content = document.createElement('div');
        content.className = 'pm-vertex';
        const marker = new AdvancedMarkerElement({
            map,
            content,
            zIndex: 30,
            title: 'Fence corner',
            gmpDraggable: mode.isDrawing(),
        });

        marker.addListener('dragstart', () => {
            draggingId = id;
            menu.close();
        });
        marker.addListener('drag', (event) => {
            store.moveVertex(id, event.latLng.toJSON(), { commit: false });
        });
        marker.addListener('dragend', (event) => {
            draggingId = null;
            store.moveVertex(id, event.latLng.toJSON());
        });
        marker.addListener('click', () => onVertexClick(id, marker));

        return marker;
    }

    function onVertexClick(id, marker) {
        const index = store.state.vertices.findIndex((vertex) => vertex.id === id);
        if (mode.isDrawing() && index === 0 && store.canClose()) {
            store.closeShape();
            return;
        }
        openVertexMenu(id, marker);
    }

    function openVertexMenu(id, marker) {
        const content = document.createElement('div');
        content.className = 'pm-menu';
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'pm-menu-item pm-menu-item-danger';
        remove.textContent = 'Delete corner';
        remove.addEventListener('click', () => {
            menu.close();
            store.removeVertex(id);
        });
        content.appendChild(remove);
        menu.setContent(content);
        menu.open({ map, anchor: marker });
    }

    function createRunLine(key) {
        const line = new Polyline({ map, clickable: true, zIndex: 10 });
        line.addListener('click', () => {
            store.selectRun(key);
            onRunFocus?.(key);
        });
        return line;
    }

    function createRunLabel(key) {
        const content = document.createElement('button');
        content.type = 'button';
        content.className = 'pm-label';
        const label = new AdvancedMarkerElement({ map: null, content, zIndex: 20 });
        label.addListener('click', () => {
            store.selectRun(key);
            onRunFocus?.(key);
        });
        return label;
    }

    // Gates: a white stretch over the run, the same for every kind of gate, plus a label
    // that slides along the run in Draw mode. The outline is only on the map where the
    // background needs it for the white to show (Plan).
    function createGateView(gateId) {
        const outline = new Polyline({ map: null, clickable: false, zIndex: 14, strokeOpacity: 1 });
        const line = new Polyline({ map, clickable: false, zIndex: 15, strokeWeight: WEIGHTS.gate, strokeOpacity: 1 });
        const content = document.createElement('div');
        content.className = 'pm-gate-label';
        const marker = new AdvancedMarkerElement({ map: null, content, zIndex: 25, gmpDraggable: mode.isDrawing() });

        const runOf = () => store.runs().find((run) => run.gates.some((gate) => gate.id === gateId));
        marker.addListener('dragstart', () => {
            draggingGateId = gateId;
            menu.close();
        });
        marker.addListener('drag', (event) => {
            const run = runOf();
            if (run) {
                store.updateGate(run.key, gateId, { t: positionOnRun(run, event.latLng.toJSON()) }, { commit: false });
            }
        });
        marker.addListener('dragend', (event) => {
            draggingGateId = null;
            const run = runOf();
            if (run) {
                store.updateGate(run.key, gateId, { t: positionOnRun(run, event.latLng.toJSON()) });
            }
            render();
        });
        marker.addListener('click', () => {
            const run = runOf();
            if (run) {
                store.selectRun(run.key);
                onRunFocus?.(run.key);
            }
        });

        return { line, outline, marker, map: null };
    }

    // Fraction (0..1) of the run closest to a point; a flat projection is plenty for a yard.
    function positionOnRun(run, point) {
        const scaleX = Math.cos((run.a.lat * Math.PI) / 180);
        const bx = (run.b.lng - run.a.lng) * scaleX;
        const by = run.b.lat - run.a.lat;
        const px = (point.lng - run.a.lng) * scaleX;
        const py = point.lat - run.a.lat;
        const lengthSq = bx * bx + by * by;
        return lengthSq ? Math.min(1, Math.max(0, (px * bx + py * by) / lengthSq)) : 0.5;
    }

    function renderGates(runs) {
        const live = new Set();
        const colors = theme();
        for (const run of runs) {
            const a = { lat: run.a.lat, lng: run.a.lng };
            const b = { lat: run.b.lat, lng: run.b.lng };
            for (const gate of run.gates) {
                live.add(gate.id);
                let view = gateViews.get(gate.id);
                if (!view) {
                    view = createGateView(gate.id);
                    gateViews.set(gate.id, view);
                }
                const span = gateSpan(run, gate);
                const path = [pointOnSide(a, b, span.from), pointOnSide(a, b, span.to)];
                view.line.setPath(path);
                view.line.setOptions({ strokeColor: run.gates_fit ? colors.gate : colors.gateProblem });
                const outlined = Boolean(colors.gateOutline) && run.gates_fit;
                if (outlined) {
                    view.outline.setPath(path);
                    view.outline.setOptions({ strokeColor: colors.gateOutline, strokeWeight: WEIGHTS.gate + 2 * WEIGHTS.gateOutline });
                }
                const outlineMap = outlined ? map : null;
                if (view.outline.getMap() !== outlineMap) {
                    view.outline.setMap(outlineMap);
                }
                view.marker.gmpDraggable = mode.isDrawing();
                view.marker.content.classList.toggle('is-problem', !run.gates_fit);
            }
        }
        for (const [id, view] of gateViews) {
            if (!live.has(id)) {
                view.line.setMap(null);
                view.outline.setMap(null);
                view.marker.map = null;
                gateViews.delete(id);
            }
        }
    }

    /* ---------- label placement ---------- */

    // Size of a label as the page's CSS renders it; measured once per text and style.
    function labelSize(className, text) {
        const cacheKey = `${className}|${text}`;
        let size = labelSizes.get(cacheKey);
        if (!size) {
            if (!measurer) {
                measurer = document.createElement('div');
                measurer.setAttribute('aria-hidden', 'true');
                measurer.style.cssText = 'position:absolute;left:-9999px;top:0;visibility:hidden;pointer-events:none;';
                map.getDiv().appendChild(measurer);
            }
            const probe = document.createElement('span');
            probe.className = className;
            probe.style.cssText = 'display:inline-block;transform:none;';
            probe.textContent = text;
            measurer.appendChild(probe);
            const box = probe.getBoundingClientRect();
            probe.remove();
            // The outline of a selected or adjusted label is part of what must not be covered.
            size = { width: Math.ceil(box.width) + 2, height: Math.ceil(box.height) + 2 };
            if (box.width > 0) {
                labelSizes.set(cacheKey, size);
            }
        }
        return size;
    }

    function scheduleLayout() {
        if (!layoutFrame) {
            layoutFrame = requestAnimationFrame(() => {
                layoutFrame = 0;
                layout();
            });
        }
    }

    function setOnMap(item, shown) {
        const next = shown ? map : null;
        if (item.map !== next) {
            item.map = next;
        }
    }

    function layout() {
        const zoom = map.getZoom();
        if (!Number.isFinite(zoom)) {
            return;
        }
        const runs = store.runs();
        const drawing = mode.isDrawing();
        const { selectedRun, vertices } = store.state;
        const described = describeLabels(runs);
        const toWorld = (point) => worldPoint(point, zoom);
        const at = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

        const segments = runs.map((run) => ({ key: run.key, a: toWorld(run.a), b: toWorld(run.b) }));
        const segmentOf = new Map(segments.map((segment) => [segment.key, segment]));
        const gates = [];
        const labels = [];
        const details = new Map();

        for (const item of described.gates) {
            const view = gateViews.get(item.gate.id);
            if (!view || item.gate.id === draggingGateId) {
                continue; // the gate being dragged follows the pointer
            }
            const { a, b } = segmentOf.get(item.run.key);
            const span = gateSpan(item.run, item.gate);
            gates.push({ key: item.gate.id, segment: item.run.key, from: at(a, b, span.from), to: at(a, b, span.to), at: at(a, b, item.gate.t) });
            const className = `pm-gate-label${item.run.gates_fit ? '' : ' is-problem'}`;
            details.set(item.gate.id, { item, marker: view.marker, className });
            labels.push({
                key: item.gate.id,
                kind: 'gate',
                segment: item.run.key,
                gate: item.gate.id,
                variants: ['full', 'compact', 'ref'].map((level) => ({ level, ...labelSize(`${className} is-${level}`, item[level]) })),
            });
        }
        for (const item of described.sides) {
            const marker = runLabels.get(item.run.key);
            const className = `pm-label${item.adjusted ? ' is-adjusted' : ''}${item.run.key === selectedRun ? ' is-selected' : ''}`;
            details.set(item.run.key, { item, marker, className });
            labels.push({
                key: item.run.key,
                kind: 'side',
                segment: item.run.key,
                variants: ['full', 'ref'].map((level) => ({ level, ...labelSize(`${className} is-${level}`, item[level]) })),
            });
        }

        const placements = layoutLabels({
            segments,
            vertices: vertices.map(toWorld),
            gates,
            labels,
            previous: lastLayout,
        });
        lastLayout = rememberLayout(placements);

        const colors = theme();
        const liveLeaders = new Set();
        for (const placement of placements) {
            const { item, marker, className } = details.get(placement.key);
            const shown = Boolean(placement.box);
            if (shown) {
                const text = item[placement.level];
                if (marker.content.textContent !== text) {
                    marker.content.textContent = text;
                }
                marker.content.className = `${className} is-${placement.level}`;
                marker.content.dataset.pmLabel = item.id; // side number or gate name, as in the panel
                marker.position = worldToLatLng({
                    x: placement.box.x + placement.box.width / 2,
                    y: placement.box.y + placement.box.height / 2,
                }, zoom);
            }
            setOnMap(marker, shown);
            if (placement.kind === 'gate') {
                marker.title = drawing ? `${item.title}. Drag along the side to move the gate` : item.title;
            } else {
                marker.title = item.title;
                marker.content.setAttribute('aria-label', item.title);
            }

            if (placement.leader) {
                liveLeaders.add(placement.key);
                let line = leaders.get(placement.key);
                if (!line) {
                    line = new Polyline({ map, clickable: false, zIndex: 12 });
                    leaders.set(placement.key, line);
                }
                line.setPath([worldToLatLng(placement.leader.from, zoom), worldToLatLng(placement.leader.to, zoom)]);
                line.setOptions({
                    strokeColor: colors.leader,
                    strokeOpacity: colors.leaderOpacity,
                    strokeWeight: 1.5,
                    // A dot where the connector meets a side; a gate's own opening already marks it.
                    icons: placement.kind === 'gate' ? [] : [{
                        icon: { path: LEADER_DOT, scale: 2.5, fillColor: colors.leader, fillOpacity: 1, strokeOpacity: 0 },
                        offset: '0%',
                    }],
                });
            }
        }
        for (const [key, line] of leaders) {
            if (!liveLeaders.has(key)) {
                line.setMap(null);
                leaders.delete(key);
            }
        }
    }

    function previewStyle() {
        return {
            strokeOpacity: 0,
            icons: [{
                icon: { path: 'M 0,-1 0,1', strokeOpacity: 0.9, strokeWeight: 3, strokeColor: THEMES.satellite.fence, scale: 2 },
                offset: '0',
                repeat: '10px',
            }],
        };
    }

    function lineStyle(run, isSelected) {
        const colors = theme();
        if (run.is_existing_wall) {
            // Dashed line: invisible stroke with a repeated dash symbol.
            return {
                strokeOpacity: 0,
                strokeWeight: 5,
                icons: [{
                    icon: { path: 'M 0,-1 0,1', strokeOpacity: 1, strokeWeight: isSelected ? 6 : 4, strokeColor: colors.wall, scale: 3 },
                    offset: '0',
                    repeat: '14px',
                }],
            };
        }
        // A selected side stays blue and gets heavier: white on a side always means a gate.
        return {
            strokeColor: colors.fence,
            strokeOpacity: 1,
            strokeWeight: isSelected ? WEIGHTS.fenceSelected : WEIGHTS.fence,
            icons: [],
        };
    }

    function syncMap(liveKeys, items, create) {
        for (const [key, item] of items) {
            if (!liveKeys.has(key)) {
                item.map = null;
                item.setMap?.(null);
                items.delete(key);
            }
        }
        for (const key of liveKeys) {
            if (!items.has(key)) {
                items.set(key, create(key));
            }
        }
    }

    function render() {
        const { vertices, closed, selectedRun } = store.state;
        const runs = store.runs();
        const drawing = mode.isDrawing();

        syncMap(new Set(vertices.map((vertex) => vertex.id)), vertexMarkers, createVertexMarker);
        vertices.forEach((vertex, index) => {
            const marker = vertexMarkers.get(vertex.id);
            if (vertex.id !== draggingId) {
                marker.position = { lat: vertex.lat, lng: vertex.lng };
            }
            marker.gmpDraggable = drawing;
            const canCloseHere = index === 0 && !closed && vertices.length >= 3;
            marker.content.classList.toggle('is-first', canCloseHere);
            marker.title = canCloseHere && drawing ? 'Tap to close the shape' : 'Fence corner';
        });

        const runKeys = new Set(runs.map((run) => run.key));
        syncMap(runKeys, runLines, createRunLine);
        syncMap(runKeys, runLabels, createRunLabel);

        runs.forEach((run) => {
            const isSelected = run.key === selectedRun;
            const path = [{ lat: run.a.lat, lng: run.a.lng }, { lat: run.b.lat, lng: run.b.lng }];

            const line = runLines.get(run.key);
            line.setPath(path);
            line.setOptions(lineStyle(run, isSelected));

        });

        renderGates(runs);
        map.getDiv().classList.toggle('is-plan', isPlan());
        layout();
    }

    // Bring a run into view when it is picked from the side panel.
    function revealRun(key) {
        const run = store.runs().find((item) => item.key === key);
        if (!run) {
            return;
        }
        const middle = pointOnSide(run.a, run.b, 0.5);
        if (!map.getBounds()?.contains(middle)) {
            map.panTo(middle);
        }
    }

    // Draw mode shows a pencil over the map instead of the open hand. With a mouse the map
    // stops panning in Draw mode so that a press and drag draws a side (see the header).
    function applyInteraction() {
        const drawing = mode.isDrawing();
        const draggable = !dragToDraw();
        map.setOptions({
            draggable,
            draggableCursor: drawing ? PENCIL_CURSOR : null,
            draggingCursor: drawing && !draggable ? PENCIL_CURSOR : null,
        });
        const element = map.getDiv();
        element.classList.toggle('is-drawing', drawing);
        element.style.setProperty('--pm-pencil-cursor', PENCIL_CURSOR);
        if (!drawing) {
            press = null;
            preview.setMap(null);
        }
    }

    store.subscribe(() => {
        render();
        if (store.state.closed || !lastVertex()) {
            preview.setMap(null);
        }
    });
    mode.subscribe(() => {
        menu.close();
        applyInteraction();
        render();
    });
    background?.subscribe(render);
    applyInteraction();
    render();

    return { revealRun, closeMenu: () => menu.close() };
}
