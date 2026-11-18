import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createFitProjection, createProjection, fitView, gateSpan, pointOnSide, worldPoint, worldToLatLng } from '../../../resources/js/property-map/geometry.js';
import { SCENARIOS } from '../fixtures/scenarios.js';

const FIXTURES = JSON.parse(fs.readFileSync(new URL('../../fixtures/property-map-scenarios.json', import.meta.url), 'utf8'));

describe('a point along a side', () => {
    // Sides under about 21 ft are where Google's spherical.interpolate gives up.
    it('is where the fraction says, on short sides too', () => {
        const feetPerDegree = 364000;
        for (const feet of [4, 9, 16, 20, 21, 40]) {
            const a = { lat: 26.6406, lng: -81.8723 };
            const b = { lat: a.lat + feet / feetPerDegree, lng: a.lng };
            const from = pointOnSide(a, b, 0.3);
            const to = pointOnSide(a, b, 0.7);
            expect((to.lat - from.lat) * feetPerDegree, `${feet} ft side`).toBeCloseTo(feet * 0.4, 2);
            expect(from.lng).toBeCloseTo(a.lng, 9);
        }
    });
});

describe('framing a drawing', () => {
    it('centres it and picks the closest zoom that shows all of it', () => {
        const { vertices } = SCENARIOS['A-rectangle-two-gates'];
        const size = { width: 900, height: 600 };
        const { center, zoom } = fitView(vertices, size, { minZoom: 18, maxZoom: 21 });
        const points = vertices.map((vertex) => worldPoint(vertex, zoom));
        const middle = worldPoint(center, zoom);
        for (const point of points) {
            expect(Math.abs(point.x - middle.x)).toBeLessThanOrEqual((size.width * 0.7) / 2 + 1);
            expect(Math.abs(point.y - middle.y)).toBeLessThanOrEqual((size.height * 0.7) / 2 + 1);
        }
        expect(zoom).toBe(21); // 60 x 80 ft fits a 900 x 600 map at the closest zoom
    });

    it('stays within the zoom range of the map, for a single corner too', () => {
        const [first] = SCENARIOS['E-large-lot'].vertices;
        expect(fitView([first], { width: 400, height: 400 }, { minZoom: 18, maxZoom: 21 }).zoom).toBe(21);
        expect(fitView(SCENARIOS['E-large-lot'].vertices, { width: 40, height: 40 }, { minZoom: 18, maxZoom: 21 }).zoom).toBe(18);
    });
});

describe('projection', () => {
    it('goes to pixels and back', () => {
        const point = { lat: 26.6406, lng: -81.8723 };
        for (const zoom of [18, 19.5, 21]) {
            const back = worldToLatLng(worldPoint(point, zoom), zoom);
            expect(back.lat).toBeCloseTo(point.lat, 9);
            expect(back.lng).toBeCloseTo(point.lng, 9);
        }
    });

    it('matches the scale of Web Mercator: a foot is the same number of pixels north-south and east-west', () => {
        const base = { lat: 26.6406, lng: -81.8723 };
        const north = { lat: base.lat + 100 / 364000, lng: base.lng };
        const east = { lat: base.lat, lng: base.lng + 100 / (364000 * Math.cos((base.lat * Math.PI) / 180)) };
        const [o, n, e] = [base, north, east].map((p) => worldPoint(p, 20));
        expect(Math.abs(o.y - n.y) / Math.abs(e.x - o.x)).toBeCloseTo(1, 2);
    });

    it('the fixture file holds the same drawings as the scenarios', () => {
        expect(Object.keys(FIXTURES)).toEqual(Object.keys(SCENARIOS));
        for (const [name, project] of Object.entries(SCENARIOS)) {
            expect(FIXTURES[name].project).toEqual(JSON.parse(JSON.stringify(project)));
        }
    });

    it("with the server's frame, the fence is centred and takes about 72% of the photo", () => {
        for (const [name, { project, frame }] of Object.entries(FIXTURES)) {
            const width = 1280;
            const height = (width * frame.size.height) / frame.size.width;
            const toPixels = createProjection({ ...frame, width, height });
            const points = project.vertices.map(toPixels);
            const xs = points.map((p) => p.x);
            const ys = points.map((p) => p.y);
            // The centre is rounded to 6 decimals like Google's center= parameter: a few pixels at most.
            expect(Math.abs((Math.min(...xs) + Math.max(...xs)) / 2 - width / 2), name).toBeLessThan(4);
            expect(Math.abs((Math.min(...ys) + Math.max(...ys)) / 2 - height / 2), name).toBeLessThan(4);
            const fill = Math.max((Math.max(...xs) - Math.min(...xs)) / width, (Math.max(...ys) - Math.min(...ys)) / height);
            expect(fill, name).toBeGreaterThan(0.55);
            expect(fill, name).toBeLessThanOrEqual(0.725);
            // Nothing of the fence is cut off.
            expect(Math.min(...xs, ...ys)).toBeGreaterThan(0);
            expect(Math.max(...xs)).toBeLessThan(width);
            expect(Math.max(...ys)).toBeLessThan(height);
        }
    });

    it('the plan keeps the proportions of the drawing', () => {
        const project = SCENARIOS['A-rectangle-two-gates']; // 60 ft by 80 ft
        const toPixels = createFitProjection(project.vertices, { x: 0, y: 0, width: 1000, height: 1000 }, 0.7);
        const [a, b, c] = project.vertices.map(toPixels);
        const width = Math.hypot(b.x - a.x, b.y - a.y);
        const height = Math.hypot(c.x - b.x, c.y - b.y);
        expect(height / width).toBeCloseTo(80 / 60, 2);
        expect(height).toBeCloseTo(700, 0);
    });
});

describe('gate opening', () => {
    const gate = { width_ft: 4, t: 0.5 };

    it('is drawn to the scale of the ground', () => {
        const span = gateSpan({ calc_ft: 40, override_ft: null }, gate);
        expect(span.to - span.from).toBeCloseTo(0.1);
    });

    it('keeps that scale when the customer typed another length for the side', () => {
        const span = gateSpan({ calc_ft: 40, override_ft: 80 }, gate);
        expect(span.to - span.from).toBeCloseTo(0.1);
    });

    it('never leaves its side', () => {
        expect(gateSpan({ calc_ft: 10, override_ft: null }, { width_ft: 12, t: 0.5 })).toEqual({ from: 0, to: 1 });
    });
});
