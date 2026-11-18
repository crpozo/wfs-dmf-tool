/*
 * Builds the layout engine's input from a project, the way the renderers do, with label
 * sizes estimated from the text length (the real renderers measure the text).
 */
import { gateSpan, lerp, worldPoint } from '../../../resources/js/property-map/geometry.js';
import { describeLabels } from '../../../resources/js/property-map/labels.js';

export const estimateSize = (text, round = false) => ({
    width: Math.max(round ? 24 : 0, Math.round(text.length * 7.4) + (round ? 12 : 20)),
    height: 24,
});

export function buildScene(project, zoom, { numbered = false } = {}) {
    const points = project.vertices.map((vertex) => worldPoint(vertex, zoom));
    const segments = project.runs.map((run, index) => ({ key: `side:${index}`, a: points[run.from], b: points[run.to] }));
    const described = describeLabels(project.runs, { numbered });
    const gates = described.gates.map((item) => {
        const { a, b } = segments[item.runIndex];
        const span = gateSpan(item.run, item.gate);
        return {
            key: `gate:${item.runIndex}:${item.gateIndex}`,
            segment: `side:${item.runIndex}`,
            from: lerp(a, b, span.from),
            to: lerp(a, b, span.to),
            at: lerp(a, b, item.gate.t),
        };
    });
    const labels = [
        ...described.gates.map((item, index) => ({
            key: gates[index].key,
            kind: 'gate',
            segment: gates[index].segment,
            gate: gates[index].key,
            variants: ['full', 'compact', 'ref'].map((level) => ({ level, ...estimateSize(item[level]) })),
        })),
        ...described.sides.map((item) => ({
            key: `side:${item.index}`,
            kind: 'side',
            segment: `side:${item.index}`,
            variants: [{ level: 'full', ...estimateSize(item.full) }, { level: 'ref', ...estimateSize(item.ref, true) }],
        })),
    ];
    return { segments, vertices: points, gates, labels };
}

// Engine output merged back into a scene the invariants can check.
export function placedScene(scene, placements, extra = {}) {
    const byKey = new Map(scene.labels.map((label) => [label.key, label]));
    return {
        ...scene,
        ...extra,
        labels: placements.map((placement) => ({ ...byKey.get(placement.key), ...placement })),
    };
}
