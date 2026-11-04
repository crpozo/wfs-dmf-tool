/*
 * Converts the map project into the canvas drawing format (Graph.getData() in
 * public/js/s_graph.js), which is what HomeController@estimate reads. The materials
 * calculation stays exactly as it is.
 *
 * Per edge: { node1, node2, x1, y1, x2, y2, door, type, material, length, doorType? }
 *   type: 3/4/5 fence of material slot 1/2/3, 6 existing wall, 7 single gate, 8 double gate
 *   length: feet (the run's effective length: manual override, else measured)
 * The estimators only use x/y for the direction of each edge at corners, so corners are
 * projected to a local plane in feet (y grows southward, like the canvas) and scaled to
 * fit the canvas, which keeps "Open sketch" and .wfs files working.
 */
import { DOOR_TYPES } from './gates.js';

const TYPES = { wall: 6, single: 7, double: 8 };
const FEET_PER_DEGREE_LAT = 364000; // about 110.9 km per degree, in feet
const CANVAS_BOX = { width: 700, height: 450, margin: 60 };
const MIN_PIECE_FT = 0.5; // shorter fence pieces next to a gate are dropped

export function mapToGraph(project) {
    const { vertices, runs } = project;
    if (!vertices.length || !runs.length) {
        return [];
    }

    const points = projectToCanvas(vertices);
    let nextNodeId = vertices.length + 1;
    const edges = [];

    const edge = (fromNode, toNode, fromPoint, toPoint, fields) => edges.push({
        node1: fromNode,
        node2: toNode,
        x1: round(fromPoint.x),
        y1: round(fromPoint.y),
        x2: round(toPoint.x),
        y2: round(toPoint.y),
        ...fields,
    });

    for (const run of runs) {
        const start = points[run.from];
        const end = points[run.to];
        const startNode = run.from + 1;
        const endNode = run.to + 1;
        const material = run.material || 1;
        const lengthFt = run.override_ft ?? run.calc_ft;

        if (run.is_existing_wall) {
            edge(startNode, endNode, start, end, { door: 0, type: TYPES.wall, material });
            continue;
        }

        const fence = { door: 0, type: 2 + material, material };
        const gates = [...(run.gates || [])].sort((a, b) => a.t - b.t);
        if (!gates.length) {
            edge(startNode, endNode, start, end, { ...fence, length: lengthFt });
            continue;
        }

        // Walk the run: fence, gate, fence, gate, ... fence (like Graph.addDoor).
        const at = (ft) => lerp(start, end, lengthFt > 0 ? ft / lengthFt : 0);
        let cursorFt = 0;
        let cursorNode = startNode;

        for (const gate of gates) {
            const gateStart = Math.max(cursorFt, gate.t * lengthFt - gate.width_ft / 2);
            const gateEnd = Math.min(lengthFt, gateStart + gate.width_ft);

            if (gateStart - cursorFt >= MIN_PIECE_FT) {
                const node = nextNodeId++;
                edge(cursorNode, node, at(cursorFt), at(gateStart), { ...fence, length: Math.round(gateStart - cursorFt) });
                cursorNode = node;
            }

            const gateEndsRun = lengthFt - gateEnd < MIN_PIECE_FT;
            const gateNode = gateEndsRun ? endNode : nextNodeId++;
            edge(cursorNode, gateNode, at(gateStart), gateEndsRun ? end : at(gateEnd), {
                door: 1,
                type: gate.type === 'double' ? TYPES.double : TYPES.single,
                material,
                doorType: DOOR_TYPES[gate.style] ?? DOOR_TYPES.swing,
                length: gate.width_ft,
            });
            cursorNode = gateNode;
            cursorFt = gateEndsRun ? lengthFt : gateEnd;
        }

        if (cursorNode !== endNode) {
            edge(cursorNode, endNode, at(cursorFt), end, { ...fence, length: Math.round(lengthFt - cursorFt) });
        }
    }

    return edges;
}

// Local equirectangular projection around the first corner, then fit into the canvas box.
function projectToCanvas(vertices) {
    const origin = vertices[0];
    const feetPerDegreeLng = FEET_PER_DEGREE_LAT * Math.cos((origin.lat * Math.PI) / 180);
    const feet = vertices.map(({ lat, lng }) => ({
        x: (lng - origin.lng) * feetPerDegreeLng,
        y: (origin.lat - lat) * FEET_PER_DEGREE_LAT,
    }));

    const minX = Math.min(...feet.map((p) => p.x));
    const minY = Math.min(...feet.map((p) => p.y));
    const spanX = Math.max(...feet.map((p) => p.x)) - minX || 1;
    const spanY = Math.max(...feet.map((p) => p.y)) - minY || 1;
    const scale = Math.min(CANVAS_BOX.width / spanX, CANVAS_BOX.height / spanY);

    return feet.map((p) => ({
        x: CANVAS_BOX.margin + (p.x - minX) * scale,
        y: CANVAS_BOX.margin + (p.y - minY) * scale,
    }));
}

function lerp(a, b, f) {
    return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
}

function round(value) {
    return Math.round(value * 100) / 100;
}
