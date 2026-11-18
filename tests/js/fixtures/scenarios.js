/*
 * Synthetic drawings (no customer data) around Fort Myers, in the project format the
 * map saves. They are the six scenarios of the November 2026 rendering audit plus a few
 * more shapes; every renderer test runs on them.
 */
const LAT0 = 26.6406;
const LNG0 = -81.8723;
const FEET_PER_DEGREE_LAT = 364000;
const FEET_PER_DEGREE_LNG = FEET_PER_DEGREE_LAT * Math.cos((LAT0 * Math.PI) / 180);

const gate = (type, width_ft, t, style = 'swing') => ({ type, style, width_ft, t });

// points: corners in feet (x east, y north). gates and extra: by side index.
export function makeProject(points, { closed = false, gates = {}, extra = {}, address = '' } = {}) {
    const vertices = points.map(([x, y]) => ({ lat: LAT0 + y / FEET_PER_DEGREE_LAT, lng: LNG0 + x / FEET_PER_DEGREE_LNG }));
    const runs = [];
    const count = points.length;
    for (let i = 0; i < count - 1 + (closed && count >= 3 ? 1 : 0); i++) {
        const j = (i + 1) % count;
        runs.push({
            from: i,
            to: j,
            calc_ft: Math.round(Math.hypot(points[i][0] - points[j][0], points[i][1] - points[j][1])),
            override_ft: null,
            is_existing_wall: false,
            material: 1,
            gates: gates[i] || [],
            ...extra[i],
        });
    }
    return { source: 'map', address, place_id: null, center: vertices[0], zoom: 20, vertices, runs };
}

export const SCENARIOS = {
    'A-rectangle-two-gates': makeProject([[0, 0], [60, 0], [60, 80], [0, 80]], {
        closed: true,
        gates: { 0: [gate('single', 4, 0.5)], 2: [gate('double', 10, 0.5)] },
        address: '100 Example St, Fort Myers, FL',
    }),
    'B-backyard-short-returns': makeProject([[0, 0], [8, 0], [8, -70], [68, -70], [68, 0], [76, 0]], {
        gates: { 0: [gate('single', 4, 0.5)], 4: [gate('single', 4, 0.5)] },
    }),
    'C-irregular-consecutive-gates': makeProject([[0, 0], [40, 6], [55, 40], [20, 62], [-8, 35]], {
        closed: true,
        gates: { 0: [gate('single', 4, 0.3), gate('double', 12, 0.7, 'sliding')], 1: [gate('single', 5, 0.5)] },
    }),
    'D-staircase-small-segments': makeProject([[0, 0], [20, 0], [20, 5], [25, 5], [25, 10], [30, 10], [30, 15], [50, 15], [50, 60], [0, 60]], {
        closed: true,
        gates: { 7: [gate('single', 4, 0.5)] },
    }),
    'E-large-lot': makeProject([[0, 0], [300, 0], [300, 200], [0, 200]], {
        closed: true,
        gates: { 0: [gate('double', 12, 0.5, 'cantilever')], 3: [gate('single', 4, 0.5)] },
    }),
    'F-narrow-side-yard': makeProject([[0, 0], [12, 0], [12, 60], [0, 60]], {
        closed: true,
        gates: { 0: [gate('single', 4, 0.5)], 2: [gate('single', 4, 0.5)] },
    }),
    // Beyond the audit: diagonals, identical lengths, walls and typed lengths, a single side.
    'G-diagonal-diamond': makeProject([[0, 0], [40, 40], [0, 80], [-40, 40]], {
        closed: true,
        gates: { 1: [gate('single', 6, 0.5)] },
    }),
    'H-wall-and-adjusted': makeProject([[0, 0], [50, 0], [50, 40], [0, 40]], {
        closed: true,
        extra: { 1: { is_existing_wall: true }, 2: { override_ft: 52 } },
        gates: { 2: [gate('double', 8, 0.4)] },
    }),
    'I-single-long-side-three-gates': makeProject([[0, 0], [150, 30]], {
        gates: { 0: [gate('single', 4, 0.2), gate('double', 12, 0.5, 'rolling'), gate('single', 6, 0.8, 'sliding')] },
    }),
    'J-dense-zigzag': makeProject(
        Array.from({ length: 14 }, (_, i) => [i * 9, i % 2 ? 9 : 0]),
        { gates: { 3: [gate('single', 4, 0.5)], 8: [gate('single', 4, 0.5)] } },
    ),
};

export const AUDIT_SCENARIOS = Object.keys(SCENARIOS).slice(0, 6);
