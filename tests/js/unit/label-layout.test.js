import { describe, expect, it } from 'vitest';
import { layoutLabels, rememberLayout } from '../../../resources/js/property-map/label-layout.js';
import { AUDIT_SCENARIOS, SCENARIOS, makeProject } from '../fixtures/scenarios.js';
import { checkPlacement } from '../support/invariants.js';
import { buildScene, placedScene } from '../support/scene.js';

const ZOOMS = [18, 19, 20, 21];

function run(project, zoom) {
    const scene = buildScene(project, zoom);
    const placements = layoutLabels(scene);
    return { scene, placements, placed: placedScene(scene, placements) };
}

describe('label placement on the audit scenarios', () => {
    for (const [name, project] of Object.entries(SCENARIOS)) {
        for (const zoom of ZOOMS) {
            it(`${name} at zoom ${zoom} keeps every rule`, () => {
                const { placements, placed } = run(project, zoom);
                expect(checkPlacement(placed)).toEqual([]);
                // One result per label, in the order they were given: none is dropped.
                expect(placements.map((p) => p.key)).toEqual(placed.labels.map((l) => l.key));
            });
        }
    }

    it('shows every length and gate in full at the zoom the map opens with, except on sides shorter than a label', () => {
        for (const name of AUDIT_SCENARIOS) {
            const { placements, scene } = run(SCENARIOS[name], 21);
            for (const placement of placements) {
                const segment = scene.segments.find((item) => item.key === placement.segment);
                const length = Math.hypot(segment.b.x - segment.a.x, segment.b.y - segment.a.y);
                if (length >= 60) {
                    expect(placement.box, `${name} ${placement.key}`).not.toBeNull();
                }
            }
        }
    });
});

describe('progressive detail', () => {
    it('prefers the original spot: the middle of the side, on the line', () => {
        const { placements } = run(makeProject([[0, 0], [100, 0]]), 20);
        expect(placements[0]).toMatchObject({ level: 'full', slot: 'on:0.5', leader: null });
    });

    it('moves the gate label beside its gate instead of hiding the opening, and keeps the side length touching its side', () => {
        const project = makeProject([[0, 0], [100, 0]], { gates: { 0: [{ type: 'single', style: 'swing', width_ft: 4, t: 0.5 }] } });
        const { placements, scene } = run(project, 20);
        const gate = placements.find((p) => p.kind === 'gate');
        const side = placements.find((p) => p.kind === 'side');
        expect(gate.level).toBe('full');
        expect(gate.slot).not.toBe('on');
        // The label touches neither the gate opening nor the length.
        const opening = scene.gates[0];
        expect(Math.abs(gate.box.y + gate.box.height / 2 - opening.at.y)).toBeGreaterThan(gate.box.height / 2);
        expect(side.level).toBe('full');
        expect(side.leader).toBeNull();
    });

    it('steps down to compact and reference forms as the drawing gets smaller, never to nothing while a number fits', () => {
        const project = SCENARIOS['C-irregular-consecutive-gates'];
        const levels = (zoom) => run(project, zoom).placements.filter((p) => p.kind === 'gate').map((p) => p.level);
        expect(levels(21)).toEqual(['full', 'full', 'full']);
        const far = levels(18);
        expect(far.some((level) => level !== 'full')).toBe(true);
    });

    it('never moves a label further than the limit, whatever its width', () => {
        const project = makeProject([[0, 0], [0, 40]], {
            gates: { 0: [{ type: 'double', style: 'cantilever', width_ft: 12, t: 0.5 }] },
        });
        const { placed } = run(project, 20);
        expect(checkPlacement(placed, { maxGap: 48 })).toEqual([]);
    });

    it('identical lengths stay on their own sides', () => {
        const { placed } = run(SCENARIOS['D-staircase-small-segments'], 21);
        expect(checkPlacement(placed)).toEqual([]);
    });
});

describe('determinism and stability', () => {
    it('gives the same result for the same input', () => {
        for (const project of Object.values(SCENARIOS)) {
            const first = JSON.stringify(run(project, 20).placements);
            const second = JSON.stringify(run(project, 20).placements);
            expect(second).toBe(first);
        }
    });

    it('does not depend on the map being panned (a translation of every point)', () => {
        const scene = buildScene(SCENARIOS['C-irregular-consecutive-gates'], 20);
        const shift = (p) => ({ x: p.x + 1234.5, y: p.y - 987.25 });
        const moved = {
            ...scene,
            segments: scene.segments.map((s) => ({ ...s, a: shift(s.a), b: shift(s.b) })),
            vertices: scene.vertices.map(shift),
            gates: scene.gates.map((g) => ({ ...g, from: shift(g.from), to: shift(g.to), at: shift(g.at) })),
        };
        const slots = (input) => layoutLabels(input).map((p) => `${p.level}/${p.slot}`);
        expect(slots(moved)).toEqual(slots(scene));
    });

    it('keeps labels where they were across a small zoom step when that spot is still good', () => {
        const project = SCENARIOS['A-rectangle-two-gates'];
        const before = layoutLabels(buildScene(project, 20));
        const after = layoutLabels({ ...buildScene(project, 20.25), previous: rememberLayout(before) });
        expect(after.map((p) => p.slot)).toEqual(before.map((p) => p.slot));
    });

    it('respects the image bounds and the areas to keep clear', () => {
        const scene = buildScene(makeProject([[0, 0], [60, 0], [60, 40], [0, 40]], { closed: true }), 20);
        const xs = scene.vertices.map((p) => p.x);
        const ys = scene.vertices.map((p) => p.y);
        const bounds = { x: Math.min(...xs) - 40, y: Math.min(...ys) - 40, width: Math.max(...xs) - Math.min(...xs) + 80, height: Math.max(...ys) - Math.min(...ys) + 80 };
        const exclusion = { x: bounds.x, y: bounds.y + bounds.height - 30, width: bounds.width, height: 30 };
        const placements = layoutLabels({ ...scene, bounds, exclusions: [exclusion] });
        expect(checkPlacement(placedScene(scene, placements, { bounds }))).toEqual([]);
        for (const placement of placements.filter((p) => p.box)) {
            expect(placement.box.y + placement.box.height).toBeLessThanOrEqual(exclusion.y);
        }
    });
});

// Seeded generator, so a failure can be reproduced from the seed in its name.
function random(seed) {
    let state = seed;
    return () => {
        state = (state * 1664525 + 1013904223) % 4294967296;
        return state / 4294967296;
    };
}

function randomProject(seed) {
    const next = random(seed);
    const count = 2 + Math.floor(next() * 9);
    const points = [];
    // Corners around a centre, at growing angles: irregular but not self-crossing.
    const radius = 15 + next() * 120;
    for (let i = 0; i < count; i++) {
        const angle = ((i + next() * 0.6) / count) * Math.PI * 2;
        const r = radius * (0.45 + next() * 0.55);
        points.push([Math.round(Math.cos(angle) * r), Math.round(Math.sin(angle) * r)]);
    }
    const closed = count >= 3 && next() > 0.3;
    const gates = {};
    const sides = count - 1 + (closed ? 1 : 0);
    for (let i = 0; i < sides; i++) {
        const [a, b] = [points[i], points[(i + 1) % count]];
        const length = Math.hypot(a[0] - b[0], a[1] - b[1]);
        if (length > 14 && next() > 0.6) {
            const wide = next() > 0.5 && length > 30;
            gates[i] = [{ type: wide ? 'double' : 'single', style: ['swing', 'sliding', 'cantilever'][Math.floor(next() * 3)], width_ft: wide ? 12 : 4, t: 0.25 + next() * 0.5 }];
            if (length > 60 && next() > 0.5) {
                gates[i].push({ type: 'single', style: 'swing', width_ft: 5, t: gates[i][0].t > 0.5 ? 0.15 : 0.85 });
            }
        }
    }
    return makeProject(points, { closed, gates });
}

describe('geometric invariants on random drawings', () => {
    for (let seed = 1; seed <= 150; seed++) {
        it(`seed ${seed}`, () => {
            const project = randomProject(seed);
            let previous = null;
            for (const zoom of [18, 19.5, 20, 20.5, 21]) {
                const scene = buildScene(project, zoom);
                const placements = layoutLabels({ ...scene, previous });
                previous = rememberLayout(placements);
                expect(checkPlacement(placedScene(scene, placements)), `zoom ${zoom}`).toEqual([]);
                expect(placements).toHaveLength(scene.labels.length);
            }
        });
    }
});
