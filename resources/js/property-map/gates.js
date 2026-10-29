/*
 * Gates offered on the map: the same choices as the classic canvas gate dialogs
 * (resources/views/simple_draw.blade.php, #modalGates and #modalDblGates).
 *
 * A gate is { id, type: 'single' | 'double', style, width_ft, t }, where style maps to
 * the canvas doorType and t is the gate centre along its run (0 = start, 1 = end).
 */

// Canvas doorType values (s_sketch.js: doorTypes).
export const DOOR_TYPES = { swing: 0, rolling: 1, sliding: 2, cantilever: 3 };

export const STYLE_LABELS = {
    swing: 'Swing',
    rolling: 'Rolling',
    sliding: 'Sliding',
    cantilever: 'Cantilever',
};

// By the first digit of the material code: 1 Aluminum, 2 Chain Link, 3 Metal, 4 Vinyl.
const STYLES_BY_MATERIAL = {
    1: ['swing', 'sliding', 'cantilever'],
    2: ['swing', 'sliding', 'rolling', 'cantilever'],
    3: ['swing', 'sliding'],
    4: ['swing', 'sliding'],
};

export const STANDARD_WIDTHS = {
    single: [4, 5, 6],
    double: [8, 10, 12],
};

export const TYPE_LABELS = { single: 'Single gate', double: 'Double gate' };

export const SPECIALTY_NOTE = 'Specialty or custom width gates require sales representative review before final quote confirmation.';

export function stylesFor(materialCode) {
    return STYLES_BY_MATERIAL[String(materialCode || '').charAt(0)] || ['swing', 'sliding'];
}

export function defaultGate(type = 'single') {
    return { type, style: 'swing', width_ft: STANDARD_WIDTHS[type][0], t: 0.5 };
}

// Same rule as the canvas disclaimers: only swing gates in a standard width are standard.
export function isStandard(gate) {
    return gate.style === 'swing' && STANDARD_WIDTHS[gate.type].includes(gate.width_ft);
}

export function gateLabel(gate) {
    const kind = gate.type === 'double' ? 'Double gate' : 'Gate';
    const style = gate.style === 'swing' ? '' : ` ${STYLE_LABELS[gate.style].toLowerCase()}`;
    return `${kind}${style} · ${gate.width_ft} ft`;
}

/*
 * Keeps a gate inside its run and clear of the other gates on it. Returns the corrected
 * centre `t`, or null when the gate can't fit at all.
 */
export function fitGate(gate, runLengthFt, otherGates = []) {
    if (!(runLengthFt > 0) || gate.width_ft > runLengthFt) {
        return null;
    }
    const half = gate.width_ft / 2 / runLengthFt;
    let t = Math.min(Math.max(gate.t, half), 1 - half);

    for (const other of otherGates) {
        const otherHalf = other.width_ft / 2 / runLengthFt;
        const gap = half + otherHalf;
        if (Math.abs(t - other.t) < gap) {
            // Push to whichever side of the other gate is closer and still inside the run.
            const before = other.t - gap;
            const after = other.t + gap;
            const candidates = [before, after].filter((value) => value >= half && value <= 1 - half);
            if (candidates.length === 0) {
                return null;
            }
            t = candidates.reduce((best, value) => (Math.abs(value - t) < Math.abs(best - t) ? value : best));
        }
    }
    const used = otherGates.reduce((sum, other) => sum + other.width_ft, gate.width_ft);
    return used <= runLengthFt ? t : null;
}
