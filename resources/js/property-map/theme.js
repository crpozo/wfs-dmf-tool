/*
 * Colors of the drawing, one set per background. Satellite is the look the map always
 * had; Plan is the same drawing on white, where white gates and white selection would
 * not show.
 */
export const BRAND = {
    blue: '#2e59c1',
    ink: '#263166',
    white: '#ffffff',
    danger: '#cf2e2e',
};

export const THEMES = {
    satellite: {
        fence: '#4f7dff',
        selected: '#ffffff',
        wall: '#c4c9d6',
        gate: '#ffffff',
        gateProblem: BRAND.danger,
        leader: '#ffffff',
        leaderOpacity: 0.95,
    },
    plan: {
        fence: '#4f7dff',
        selected: BRAND.ink,
        wall: '#9aa3b5',
        gate: BRAND.ink,
        gateProblem: BRAND.danger,
        leader: BRAND.ink,
        leaderOpacity: 0.8,
    },
};
