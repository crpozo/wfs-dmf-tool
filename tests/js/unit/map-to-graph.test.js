/*
 * The drawing handed to the materials calculation. Nothing in the rendering work may
 * change it: lengths, gates and their order are what the quote is priced on.
 */
import { describe, expect, it } from 'vitest';
import { mapToGraph } from '../../../resources/js/property-map/map-to-graph.js';
import { SCENARIOS } from '../fixtures/scenarios.js';

const summary = (project) => mapToGraph(project).map((edge) => `${edge.type}:${edge.length ?? '-'}${edge.door ? `:d${edge.doorType}` : ''}`);

describe('graph sent for materials', () => {
    it('splits a side around its gates, with the gate widths as typed', () => {
        expect(summary(SCENARIOS['C-irregular-consecutive-gates'])).toEqual([
            '3:10', '7:4:d0', '3:8', '8:12:d2', '3:6', // 40 ft: fence, gate, fence, sliding double gate, fence
            '3:16', '7:5:d0', '3:16', // 37 ft with a 5 ft gate in the middle
            '3:41', '3:39', '3:36',
        ]);
    });

    it('uses the typed length of a side, and sends an existing wall as a wall', () => {
        expect(summary(SCENARIOS['H-wall-and-adjusted'])).toEqual([
            '3:50', '6:-', '3:17', '8:8:d0', '3:27', '3:40',
        ]);
    });

    it('keeps the total length of every scenario', () => {
        for (const [name, project] of Object.entries(SCENARIOS)) {
            const fence = project.runs.filter((run) => !run.is_existing_wall).reduce((sum, run) => sum + (run.override_ft ?? run.calc_ft), 0);
            const sent = mapToGraph(project).filter((edge) => edge.type !== 6).reduce((sum, edge) => sum + edge.length, 0);
            expect(Math.abs(sent - fence), name).toBeLessThanOrEqual(project.runs.length); // rounding of the pieces around gates
        }
    });
});
