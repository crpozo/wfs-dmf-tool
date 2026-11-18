/*
 * What must hold for any label placement, whatever drew it. Used by the unit tests (on
 * the engine's output) and by the browser tests (on boxes measured in the page).
 *
 * scene: { segments: [{key, a, b}], vertices: [{x, y}], gates: [{key, segment, from, to, at}],
 *          labels: [{key, kind, segment, gate?, level, box, leader}], bounds?, scale? }
 * Returns a list of problems (empty when everything holds).
 */
import { boxesOverlap, distanceBoxSegment, distancePointSegment, segmentsIntersect } from '../../../resources/js/property-map/label-layout.js';

const pointBox = (p, box) => Math.hypot(
    Math.max(box.x - p.x, 0, p.x - (box.x + box.width)),
    Math.max(box.y - p.y, 0, p.y - (box.y + box.height)),
);

export function checkPlacement(scene, { maxGap = 48, vertexRadius = 9, leaderFrom = 9, tolerance = 1.5 } = {}) {
    const scale = scene.scale || 1;
    const problems = [];
    const segments = new Map(scene.segments.map((segment) => [segment.key, segment]));
    const gates = new Map((scene.gates || []).map((gate) => [gate.key, gate]));
    const visible = scene.labels.filter((label) => label.box);

    for (let i = 0; i < visible.length; i++) {
        for (let j = i + 1; j < visible.length; j++) {
            if (boxesOverlap(visible[i].box, visible[j].box, -tolerance)) {
                problems.push(`labels overlap: ${visible[i].key} and ${visible[j].key}`);
            }
        }
    }

    for (const label of visible) {
        const own = segments.get(label.segment);
        const anchorDistance = label.kind === 'gate'
            ? pointBox(gates.get(label.gate).at, label.box)
            : distanceBoxSegment(label.box, own.a, own.b);

        if (anchorDistance > maxGap * scale + tolerance) {
            problems.push(`too far from its ${label.kind}: ${label.key} (${Math.round(anchorDistance / scale)} px)`);
        }
        if (anchorDistance >= leaderFrom * scale + tolerance && !label.leader) {
            problems.push(`away from its ${label.kind} without a connector: ${label.key}`);
        }
        if (label.leader) {
            const onOwn = distancePointSegment(label.leader.from, own.a, own.b);
            if (onOwn > tolerance) {
                problems.push(`connector does not start on its side: ${label.key}`);
            }
            for (const other of visible) {
                if (other !== label && distanceBoxSegment(other.box, label.leader.from, label.leader.to) === 0) {
                    problems.push(`connector of ${label.key} crosses label ${other.key}`);
                }
            }
            for (const other of segments.values()) {
                if (other.key !== label.segment && segmentsIntersect(label.leader.from, label.leader.to, other.a, other.b)) {
                    problems.push(`connector of ${label.key} crosses side ${other.key}`);
                }
            }
        }
        for (const vertex of scene.vertices) {
            if (pointBox(vertex, label.box) < vertexRadius * scale - tolerance) {
                problems.push(`covers a corner: ${label.key}`);
            }
        }
        for (const other of segments.values()) {
            if (other.key === label.segment) {
                continue;
            }
            const distance = distanceBoxSegment(label.box, other.a, other.b);
            if (distance === 0) {
                problems.push(`covers another side: ${label.key} over ${other.key}`);
            } else if (!label.leader && label.kind === 'side' && distance + tolerance < distanceBoxSegment(label.box, own.a, own.b)) {
                problems.push(`nearer to another side than to its own: ${label.key} (${other.key})`);
            }
        }
        for (const gate of gates.values()) {
            if (gate.key !== label.gate && distanceBoxSegment(label.box, gate.from, gate.to) === 0) {
                problems.push(`covers a gate: ${label.key} over ${gate.key}`);
            }
        }
        if (scene.bounds) {
            const b = scene.bounds;
            if (label.box.x < b.x - tolerance || label.box.y < b.y - tolerance
                || label.box.x + label.box.width > b.x + b.width + tolerance
                || label.box.y + label.box.height > b.y + b.height + tolerance) {
                problems.push(`outside the image: ${label.key}`);
            }
        }
    }
    return problems;
}
