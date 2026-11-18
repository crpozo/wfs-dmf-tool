/*
 * What each label says, at every level of detail, the same for the map, the quote image
 * and the technical plan. Sides are numbered like the Sides panel (Side 1, Side 2...);
 * gates are G1, G2... in the same order as the panel lists them.
 *
 *   full     "42 ft"            "Gate · 4 ft"
 *   compact                     "G1 · 4 ft"
 *   ref      "3"                "G1"            (the rest is in the panel or the legend)
 */
import { gateLabel } from './gates.js';

export function sideText(run) {
    const adjusted = run.override_ft !== null && run.override_ft !== undefined;
    const feet = adjusted ? run.override_ft : run.calc_ft;
    return `${feet} ft${run.is_existing_wall ? ' · wall' : ''}`;
}

/**
 * @param {object[]} runs  runs of the project (store.runs() or project.runs)
 * @param {{numbered?: boolean}} [options]  numbered: every side label carries its number
 */
export function describeLabels(runs, { numbered = false } = {}) {
    const sides = [];
    const gates = [];
    runs.forEach((run, index) => {
        const number = index + 1;
        const adjusted = run.override_ft !== null && run.override_ft !== undefined;
        const text = sideText(run);
        sides.push({
            run,
            index,
            id: String(number),
            adjusted,
            wall: Boolean(run.is_existing_wall),
            full: numbered ? `${number} · ${text}` : text,
            ref: String(number),
            title: `Side ${number}: ${text}${adjusted ? ` (adjusted by hand, measured ${run.calc_ft} ft)` : ''}`,
            legend: `Side ${number}: ${text}${adjusted ? ` * (measured ${run.calc_ft} ft)` : ''}`,
        });
        (run.gates || []).forEach((gate, gateIndex) => {
            const id = `G${gates.length + 1}`;
            const full = gateLabel(gate);
            gates.push({
                run,
                runIndex: index,
                gate,
                gateIndex,
                id,
                full,
                compact: `${id} · ${gate.width_ft} ft`,
                ref: id,
                title: `${id}: ${full} (side ${number})`,
                legend: `${id}: ${full} (side ${number})`,
            });
        });
    });
    return { sides, gates };
}
