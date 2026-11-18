/*
 * Label placement shared by the interactive map, the quote image and the technical plan.
 *
 * Pure geometry in pixels: no DOM, no Google Maps. The caller measures each label and
 * projects the drawing; this module decides where every label goes so that it
 *   - stays on or right beside its own side (bounded distance, never proportional to the
 *     label's width),
 *   - never covers another label, a corner, a gate or another side,
 *   - gets a short connector as soon as it no longer touches its side,
 *   - steps down to a shorter form (compact, then a numbered reference) when there is no
 *     room, and only as a last resort is left to the legend.
 * The same input always gives the same output. `previous` (the last result) only adds a
 * little stickiness so labels do not hop between equivalent spots while zooming.
 */

export const LAYOUT_DEFAULTS = {
    gap: 4, // free space kept between two labels
    vertexRadius: 9, // corner markers are kept clear by this radius
    lineClear: 5, // distance between a side and a label sitting beside it
    step: 9, // each further try moves the label this much away from its side
    maxGap: 48, // a label is never further than this from its side or gate (room for one label in between)
    leaderFrom: 9, // from this distance on, a connector links the label to its anchor
    otherClear: 4, // distance kept to the other sides
    gateClear: 3, // distance kept to gate openings
    boundsMargin: 4, // distance kept to the edge of the image
    keepCost: 8, // how much worse the previous spot may be and still be kept
};

// Where along a side its label may sit, best first.
const SIDE_POSITIONS = [0.5, 0.4, 0.6, 0.3, 0.7, 0.2, 0.8];
// How far a gate label may slide along the side, in label widths.
const ON_GATE_COST = 1000; // above any place beside the gate
const GATE_SHIFTS = [0, -0.3, 0.3, -0.55, 0.55, -0.85, 0.85];

/* ---------- geometry ---------- */

export function distancePointSegment(p, a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lengthSq = dx * dx + dy * dy;
    const t = lengthSq ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSq)) : 0;
    return Math.hypot(p.x - a.x - dx * t, p.y - a.y - dy * t);
}

function cross(o, a, b) {
    return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
}

export function segmentsIntersect(a, b, c, d) {
    const d1 = cross(c, d, a);
    const d2 = cross(c, d, b);
    const d3 = cross(a, b, c);
    const d4 = cross(a, b, d);
    return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}

function pointInBox(p, box) {
    return p.x >= box.x && p.x <= box.x + box.width && p.y >= box.y && p.y <= box.y + box.height;
}

function distancePointBox(p, box) {
    const dx = Math.max(box.x - p.x, 0, p.x - (box.x + box.width));
    const dy = Math.max(box.y - p.y, 0, p.y - (box.y + box.height));
    return Math.hypot(dx, dy);
}

function boxCorners(box) {
    return [
        { x: box.x, y: box.y },
        { x: box.x + box.width, y: box.y },
        { x: box.x + box.width, y: box.y + box.height },
        { x: box.x, y: box.y + box.height },
    ];
}

// 0 when the segment touches or crosses the box.
export function distanceBoxSegment(box, a, b) {
    if (pointInBox(a, box) || pointInBox(b, box)) {
        return 0;
    }
    const corners = boxCorners(box);
    let best = Math.min(distancePointBox(a, box), distancePointBox(b, box));
    for (let i = 0; i < 4; i++) {
        const c = corners[i];
        const d = corners[(i + 1) % 4];
        if (segmentsIntersect(a, b, c, d)) {
            return 0;
        }
        best = Math.min(best, distancePointSegment(c, a, b));
    }
    return best;
}

export function boxesOverlap(a, b, gap = 0) {
    return a.x < b.x + b.width + gap && b.x < a.x + a.width + gap
        && a.y < b.y + b.height + gap && b.y < a.y + a.height + gap;
}

function nearestPointOnBox(p, box) {
    return {
        x: Math.max(box.x, Math.min(box.x + box.width, p.x)),
        y: Math.max(box.y, Math.min(box.y + box.height, p.y)),
    };
}

function pointInPolygon(p, polygon) {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const a = polygon[i];
        const b = polygon[j];
        if ((a.y > p.y) !== (b.y > p.y) && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) {
            inside = !inside;
        }
    }
    return inside;
}

function frameOf(segment) {
    const dx = segment.b.x - segment.a.x;
    const dy = segment.b.y - segment.a.y;
    const length = Math.hypot(dx, dy) || 1;
    const u = { x: dx / length, y: dy / length };
    return { length: Math.hypot(dx, dy), u, n: { x: -u.y, y: u.x } };
}

const along = (segment, t) => ({
    x: segment.a.x + (segment.b.x - segment.a.x) * t,
    y: segment.a.y + (segment.b.y - segment.a.y) * t,
});

/*
 * +1 or -1: the side of the segment (along its normal) that faces the inside of the
 * drawing. Labels prefer it, so they stay on the customer's yard rather than on the
 * neighbour's. An open drawing counts as if its ends were joined.
 */
function inwardSign(segment, frame, polygon) {
    const middle = along(segment, 0.5);
    const probe = (sign) => ({ x: middle.x + frame.n.x * sign * 2, y: middle.y + frame.n.y * sign * 2 });
    if (polygon.length >= 3) {
        const plus = pointInPolygon(probe(1), polygon);
        const minus = pointInPolygon(probe(-1), polygon);
        if (plus !== minus) {
            return plus ? 1 : -1;
        }
        const centre = polygon.reduce((sum, p) => ({ x: sum.x + p.x / polygon.length, y: sum.y + p.y / polygon.length }), { x: 0, y: 0 });
        const toward = (centre.x - middle.x) * frame.n.x + (centre.y - middle.y) * frame.n.y;
        if (Math.abs(toward) > 1e-6) {
            return toward > 0 ? 1 : -1;
        }
    }
    // A single side: above it, or to its right when it is vertical.
    if (Math.abs(frame.n.y) > 1e-6) {
        return frame.n.y < 0 ? 1 : -1;
    }
    return frame.n.x > 0 ? 1 : -1;
}

/* ---------- candidates ---------- */

function boxAround(centre, size) {
    return { x: centre.x - size.width / 2, y: centre.y - size.height / 2, width: size.width, height: size.height };
}

// Distances from the side at which a label may sit beside it.
function distances(options) {
    const list = [];
    for (let d = options.lineClear; d < options.maxGap - 1e-6; d += options.step) {
        list.push(d);
    }
    list.push(options.maxGap);
    return list;
}

function sideCandidates(segment, frame, size, inward, options) {
    const candidates = [];
    const half = (Math.abs(frame.n.x) * size.width + Math.abs(frame.n.y) * size.height) / 2;
    const middle = along(segment, 0.5);
    const slide = (offset) => Math.abs(offset) * 0.12;

    // Along the side, as offsets from its middle. On a side shorter than its label the
    // label may also sit past either end, where there is often the only free room.
    const offsets = SIDE_POSITIONS.map((t) => ({ name: String(t), offset: (t - 0.5) * frame.length, on: true }));
    const alongExtent = Math.abs(frame.u.x) * size.width + Math.abs(frame.u.y) * size.height;
    if (frame.length < alongExtent * 1.5) {
        for (const factor of [0.5, 0.9]) {
            for (const sign of [-1, 1]) {
                offsets.push({ name: `past${sign * factor}`, offset: sign * factor * alongExtent, on: false });
            }
        }
    }
    const at = (offset) => ({ x: middle.x + frame.u.x * offset, y: middle.y + frame.u.y * offset });
    // Where the connector starts: the point of the side nearest to the label, off the corners.
    const reach = frame.length * 0.3;
    const anchorFor = (offset) => at(Math.max(-reach, Math.min(reach, offset)));

    for (const { name, offset, on } of offsets) {
        if (on) {
            candidates.push({ slot: `on:${name}`, anchor: at(offset), box: boxAround(at(offset), size), distance: 0, cost: slide(offset) });
        }
    }
    for (const d of distances(options)) {
        for (const { name, offset } of offsets) {
            const base = at(offset);
            for (const sign of [inward, -inward]) {
                const centre = { x: base.x + frame.n.x * sign * (half + d), y: base.y + frame.n.y * sign * (half + d) };
                const box = boxAround(centre, size);
                // Past the end of a short side the label is further from it than from its line.
                const distance = distanceBoxSegment(box, segment.a, segment.b);
                if (distance > options.maxGap + 0.01) {
                    continue;
                }
                candidates.push({
                    slot: `${sign === inward ? 'in' : 'out'}:${name}:${d}`,
                    anchor: anchorFor(offset),
                    box,
                    distance,
                    cost: 2 + distance + slide(offset) + (sign === inward ? 0 : 3) + (distance >= options.leaderFrom ? 6 : 0),
                });
            }
        }
    }
    return candidates;
}

function gateCandidates(segment, frame, gate, size, inward, options) {
    const candidates = [];
    const anchor = gate.at;
    const half = (Math.abs(frame.n.x) * size.width + Math.abs(frame.n.y) * size.height) / 2;
    const alongExtent = Math.abs(frame.u.x) * size.width + Math.abs(frame.u.y) * size.height;
    const opening = Math.hypot(gate.to.x - gate.from.x, gate.to.y - gate.from.y);

    // On the gate itself only when the opening stays visible on both ends of the label,
    // and only when there is no room beside it: the white stretch is what says "gate".
    if (opening >= alongExtent + 12 * options.scale) {
        candidates.push({ slot: 'on', anchor, box: boxAround(anchor, size), distance: 0, cost: ON_GATE_COST });
    }
    for (const d of distances(options)) {
        for (const shift of GATE_SHIFTS) {
            for (const sign of [inward, -inward]) {
                const centre = {
                    x: anchor.x + frame.n.x * sign * (half + d) + frame.u.x * shift * size.width,
                    y: anchor.y + frame.n.y * sign * (half + d) + frame.u.y * shift * size.width,
                };
                const box = boxAround(centre, size);
                const distance = distancePointBox(anchor, box);
                if (distance > options.maxGap + 0.01) {
                    continue;
                }
                candidates.push({
                    slot: `${sign === inward ? 'in' : 'out'}:${shift}:${d}`,
                    anchor,
                    box,
                    distance,
                    cost: 2 + d + Math.abs(shift) * size.width * 0.5 + (sign === inward ? 0 : 3) + (distance >= options.leaderFrom ? 6 : 0),
                });
            }
        }
    }
    return candidates;
}

/* ---------- placement ---------- */

/**
 * @param {object} input
 * @param {{key: string, a: {x, y}, b: {x, y}}[]} input.segments  the sides, in drawing order
 * @param {{x, y}[]} input.vertices  the corners, in drawing order
 * @param {{key: string, segment: string, from: {x, y}, to: {x, y}, at: {x, y}}[]} [input.gates]
 * @param {{key: string, kind: 'side'|'gate', segment: string, gate?: string,
 *          variants: {level: string, width: number, height: number}[]}[]} input.labels
 * @param {{x, y, width, height}} [input.bounds]  labels stay inside (the image); omit for a map that pans
 * @param {{x, y, width, height}[]} [input.exclusions]  areas labels keep out of (attribution, legend)
 * @param {Map<string, {level: string, slot: string}>} [input.previous]
 * @param {number} [input.scale]  multiplies every distance (device pixels per CSS pixel)
 * @returns {{key, kind, segment, level, slot, box, anchor, leader}[]} one entry per label, in
 *          input order. `level` is the variant used, or 'legend' (box null) when nothing fits.
 */
export function layoutLabels(input) {
    const scale = input.scale || 1;
    const options = { scale };
    for (const [name, value] of Object.entries({ ...LAYOUT_DEFAULTS, ...(input.options || {}) })) {
        options[name] = name === 'keepCost' ? value : value * scale;
    }

    const segments = new Map(input.segments.map((segment) => [segment.key, { ...segment, frame: frameOf(segment) }]));
    const gates = new Map((input.gates || []).map((gate) => [gate.key, gate]));
    const vertices = input.vertices || [];
    const polygon = vertices;
    const exclusions = input.exclusions || [];
    const bounds = input.bounds || null;
    const previous = input.previous || null;

    let placedBoxes = [];
    let placedLeaders = [];

    function isFree(candidate, label, segment) {
        const { box } = candidate;
        if (bounds) {
            const m = options.boundsMargin;
            if (box.x < bounds.x + m || box.y < bounds.y + m
                || box.x + box.width > bounds.x + bounds.width - m || box.y + box.height > bounds.y + bounds.height - m) {
                return false;
            }
        }
        if (exclusions.some((area) => boxesOverlap(box, area, options.gap))) {
            return false;
        }
        if (placedBoxes.some((other) => boxesOverlap(box, other, options.gap))) {
            return false;
        }
        if (vertices.some((vertex) => distancePointBox(vertex, box) < options.vertexRadius)) {
            return false;
        }

        const needsLeader = candidate.distance >= options.leaderFrom;
        const ownDistance = distanceBoxSegment(box, segment.a, segment.b);
        for (const other of segments.values()) {
            if (other.key === segment.key) {
                continue;
            }
            const distance = distanceBoxSegment(box, other.a, other.b);
            // Without a connector the label must be clearly nearer to its own side.
            if (distance < options.otherClear || (!needsLeader && distance < ownDistance + options.otherClear)) {
                return false;
            }
        }
        for (const gate of gates.values()) {
            if (gate.key !== label.gate && distanceBoxSegment(box, gate.from, gate.to) < options.gateClear) {
                return false;
            }
        }
        if (placedLeaders.some((leader) => distanceBoxSegment(box, leader.from, leader.to) < options.gap / 2)) {
            return false;
        }

        if (needsLeader) {
            const leader = { from: candidate.anchor, to: nearestPointOnBox(candidate.anchor, box) };
            if (placedBoxes.some((other) => distanceBoxSegment(other, leader.from, leader.to) < options.gap / 2)) {
                return false;
            }
            for (const other of segments.values()) {
                if (other.key !== segment.key && segmentsIntersect(leader.from, leader.to, other.a, other.b)) {
                    return false;
                }
            }
            if (placedLeaders.some((other) => segmentsIntersect(leader.from, leader.to, other.from, other.to))) {
                return false;
            }
        }
        return true;
    }

    function place(label) {
        const segment = segments.get(label.segment);
        const gate = label.kind === 'gate' ? gates.get(label.gate) : null;
        if (!segment || (label.kind === 'gate' && !gate)) {
            return { level: 'legend', slot: null, box: null, anchor: null, leader: null };
        }
        const inward = inwardSign(segment, segment.frame, polygon);
        const before = previous?.get(label.key);

        for (const variant of label.variants) {
            const candidates = gate
                ? gateCandidates(segment, segment.frame, gate, variant, inward, options)
                : sideCandidates(segment, segment.frame, variant, inward, options);
            // Stable sort: equal costs keep the order they were generated in.
            const ordered = candidates.map((candidate, index) => ({ candidate, index }))
                .sort((x, y) => x.candidate.cost - y.candidate.cost || x.index - y.index)
                .map((item) => item.candidate);

            let chosen = ordered.find((candidate) => isFree(candidate, label, segment));
            if (!chosen) {
                continue;
            }
            if (before && before.level === variant.level && before.slot !== chosen.slot) {
                const kept = ordered.find((candidate) => candidate.slot === before.slot);
                if (kept && kept.cost <= chosen.cost + options.keepCost * scale && isFree(kept, label, segment)) {
                    chosen = kept;
                }
            }
            const leader = chosen.distance >= options.leaderFrom
                ? { from: chosen.anchor, to: nearestPointOnBox(chosen.anchor, chosen.box) }
                : null;
            placedBoxes.push(chosen.box);
            if (leader) {
                placedLeaders.push(leader);
            }
            return { level: variant.level, slot: chosen.slot, box: chosen.box, anchor: chosen.anchor, leader };
        }
        return { level: 'legend', slot: null, box: null, anchor: gate ? gate.at : along(segment, 0.5), leader: null };
    }

    /*
     * Gates first: their anchor is fixed. Then the sides, shortest first, because a short
     * side has the fewest spots to choose from. Ties keep the drawing order. With
     * `shortFirst`, sides shorter than their own label go before the gates: on such a side
     * the gate label can step aside, the length cannot.
     */
    function orderFor(shortFirst) {
        const rank = ({ label }) => {
            const length = segments.get(label.segment)?.frame.length ?? 0;
            if (label.kind === 'gate') {
                return -1;
            }
            return shortFirst && length < label.variants[0].width * 1.5 ? -2 + length / 1e6 : length;
        };
        return input.labels.map((label, index) => ({ label, index })).sort((x, y) => rank(x) - rank(y) || x.index - y.index);
    }

    function attempt({ shortFirst = false, ...shorten }) {
        placedBoxes = [];
        placedLeaders = [];
        const results = new Array(input.labels.length);
        for (const { label, index } of orderFor(shortFirst)) {
            const skip = Math.min(shorten[label.kind] || 0, label.variants.length - 1);
            const variants = label.variants.slice(skip);
            results[index] = { key: label.key, kind: label.kind, segment: label.segment, ...place({ ...label, variants }) };
        }
        return results;
    }

    /*
     * A crowded side can leave a label with no room at all. Rather than dropping it to the
     * legend, the whole drawing is tried again: short sides first, then with shorter gate
     * labels, then shorter side labels too. The first try that shows every label wins;
     * failing that, the one that shows the most.
     */
    const tries = [
        {}, { shortFirst: true },
        { gate: 1 }, { gate: 1, shortFirst: true },
        { gate: 2 }, { gate: 2, shortFirst: true },
        { gate: 2, side: 1 },
    ];
    let best = null;
    for (const variation of tries) {
        const results = attempt(variation);
        const missing = results.filter((result) => !result.box).length;
        if (!best || missing < best.missing) {
            best = { results, missing };
        }
        if (missing === 0) {
            break;
        }
    }
    return best.results;
}

// The result as the `previous` argument of the next call.
export function rememberLayout(placements) {
    return new Map(placements.map((placement) => [placement.key, { level: placement.level, slot: placement.slot }]));
}
