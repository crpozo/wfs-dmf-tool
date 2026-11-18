import { describe, expect, it } from 'vitest';
import { describeLabels } from '../../../resources/js/property-map/labels.js';
import { SCENARIOS } from '../fixtures/scenarios.js';

describe('label texts', () => {
    it('numbers sides like the Sides panel and gates in the order the panel lists them', () => {
        const { sides, gates } = describeLabels(SCENARIOS['C-irregular-consecutive-gates'].runs);
        expect(sides.map((side) => side.ref)).toEqual(['1', '2', '3', '4', '5']);
        expect(gates.map((gate) => [gate.id, gate.runIndex])).toEqual([['G1', 0], ['G2', 0], ['G3', 1]]);
    });

    it('keeps the wording the map always had', () => {
        const { sides, gates } = describeLabels(SCENARIOS['C-irregular-consecutive-gates'].runs);
        expect(sides[0].full).toBe('40 ft');
        expect(gates.map((gate) => gate.full)).toEqual(['Single gate · 4 ft', 'Double gate sliding · 12 ft', 'Single gate · 5 ft']);
        expect(gates.map((gate) => gate.compact)).toEqual(['G1 · 4 ft', 'G2 · 12 ft', 'G3 · 5 ft']);
    });

    it('says in the legend what a short label stands for', () => {
        const { sides, gates } = describeLabels(SCENARIOS['H-wall-and-adjusted'].runs);
        // The length itself never shows the side's number, on any background.
        expect(sides.map((side) => side.full)).toEqual(['50 ft', '40 ft · wall', '52 ft', '40 ft']);
        expect(sides.map((side) => side.ref)).toEqual(['1', '2', '3', '4']);
        expect(sides[2].legend).toBe('Side 3: 52 ft * (measured 50 ft)');
        expect(gates[0].legend).toBe('G1: Double gate · 8 ft (side 3)');
    });
});
