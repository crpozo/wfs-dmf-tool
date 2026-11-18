/*
 * Colors of the drawing, one set per background. Satellite is the look the map always
 * had; Plan is the same drawing on white.
 *
 * One rule on every background and for every kind of gate: blue is fence, white is gate.
 * On the white of the plan a white stretch only shows with an edge, so there the gate
 * gets a dark blue outline all around (gateOutline). Nothing else is drawn white on a
 * side: a selected side keeps its color and is drawn heavier.
 */
export const BRAND = {
    blue: '#2e59c1',
    ink: '#263166',
    white: '#ffffff',
    danger: '#cf2e2e',
};

// Line widths, in map pixels (the images scale them).
export const WEIGHTS = {
    fence: 5,
    fenceSelected: 9,
    gate: 7,
    gateOutline: 2, // on each edge of the gate, where the theme has an outline
};

export const THEMES = {
    satellite: {
        fence: '#4f7dff',
        wall: '#c4c9d6',
        gate: BRAND.white,
        gateOutline: null,
        gateProblem: BRAND.danger,
        leader: '#ffffff',
        leaderOpacity: 0.95,
    },
    plan: {
        fence: '#4f7dff',
        wall: '#9aa3b5',
        gate: BRAND.white,
        gateOutline: BRAND.ink,
        gateProblem: BRAND.danger,
        leader: BRAND.ink,
        leaderOpacity: 0.8,
    },
};
