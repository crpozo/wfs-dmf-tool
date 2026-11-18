/*
 * The images of the drawing (quote photo, technical plan, both), rendered by the app's
 * own code in a real browser over a generated photo. The frames are the ones the server
 * computes (tests/fixtures/property-map-scenarios.json, kept in step by PHPUnit).
 */
import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { PNG } from './support/png.js';
import { checkPlacement } from '../js/support/invariants.js';
import { openMap } from './support/app.js';
import { FIXTURES, fakeSnapshot, fill, renderImage } from './support/images.js';

test.beforeEach(async ({ page }) => {
    await openMap(page);
});

const names = Object.keys(FIXTURES);

for (const name of names) {
    test(`${name}: satellite image`, async ({ page }) => {
        const snapshot = await fakeSnapshot(page, name);
        const image = await renderImage(page, 'satellite', snapshot);
        const { scene, legend } = image.layout;

        expect(image.width).toBe(1280);
        expect(checkPlacement(scene)).toEqual([]);
        // Every length and gate is written out in full on the photo: nothing needs a legend.
        expect(scene.labels.every((label) => label.box && label.level === 'full')).toBe(true);
        expect(legend).toEqual([]);

        // Labels stay on the photo and off Google's logo and attribution.
        for (const label of scene.labels) {
            for (const area of scene.exclusions) {
                const apart = label.box.x >= area.x + area.width || label.box.x + label.box.width <= area.x
                    || label.box.y >= area.y + area.height || label.box.y + label.box.height <= area.y;
                expect(apart, `${label.text} over the attribution`).toBe(true);
            }
        }

        // The photo is uniformly scaled: same factor both ways, so nothing is distorted.
        const { size } = snapshot.frame;
        expect(Math.abs(image.height / image.width - size.height / size.width)).toBeLessThan(0.005);
    });

    test(`${name}: technical plan`, async ({ page }) => {
        const snapshot = await fakeSnapshot(page, name);
        const image = await renderImage(page, 'plan', snapshot);
        const { scene, legend } = image.layout;
        expect(checkPlacement(scene)).toEqual([]);
        // The plan lists every side and every gate under the drawing.
        const gates = snapshot.project.runs.reduce((sum, run) => sum + run.gates.length, 0);
        expect(legend).toHaveLength(snapshot.project.runs.length + gates);
        expect(legend[0]).toMatch(/^Side 1: /);
        // Sides carry their number, the one the Sides panel uses.
        for (const label of scene.labels.filter((item) => item.kind === 'side' && item.box)) {
            expect(label.text).toMatch(/^\d+( · |$)/);
        }
    });
}

test('the fence takes most of the photo instead of a corner of it', async ({ page }) => {
    const fills = {};
    for (const name of names) {
        const image = await renderImage(page, 'satellite', await fakeSnapshot(page, name));
        fills[name] = Number(fill(image.layout, image.width, image.layout.scene.bounds.height).toFixed(2));
    }
    // 0.72 is the target. Drawings under about 45 ft are limited by the smallest image
    // Google's attribution fits on, and stay a little under it.
    for (const [name, value] of Object.entries(fills)) {
        expect(value, name).toBeGreaterThanOrEqual(0.55);
        expect(value, name).toBeLessThanOrEqual(0.8);
    }
    expect(Object.values(fills).filter((value) => value >= 0.65).length).toBeGreaterThanOrEqual(names.length - 1);
});

test('lines, corners and gates are drawn where the projection puts them', async ({ page }) => {
    const snapshot = await fakeSnapshot(page, 'A-rectangle-two-gates');
    const image = await renderImage(page, 'satellite', snapshot);
    const png = PNG.decode(image.png);
    const { scene } = image.layout;
    const near = (pixel, color, tolerance = 40) => color.every((value, index) => Math.abs(pixel[index] - value) <= tolerance);

    // A corner marker is white at its centre, exactly on the projected corner.
    for (const vertex of scene.vertices) {
        expect(near(png.at(vertex.x, vertex.y), [255, 255, 255]), 'corner').toBe(true);
    }
    // A fifth of the way along each side, clear of corners and labels: fence blue.
    for (const segment of scene.segments) {
        const point = { x: segment.a.x + (segment.b.x - segment.a.x) * 0.2, y: segment.a.y + (segment.b.y - segment.a.y) * 0.2 };
        const covered = scene.labels.some((label) => point.x > label.box.x - 4 && point.x < label.box.x + label.box.width + 4
            && point.y > label.box.y - 4 && point.y < label.box.y + label.box.height + 4);
        if (!covered) {
            expect(near(png.at(point.x, point.y), [79, 125, 255]), `side ${segment.key}`).toBe(true);
        }
    }
    // Each gate opening is white, centred on its side.
    for (const gate of scene.gates) {
        expect(near(png.at(gate.at.x, gate.at.y), [255, 255, 255]), `gate ${gate.key}`).toBe(true);
    }
});

test('the combined image is the photo above the plan', async ({ page }) => {
    const snapshot = await fakeSnapshot(page, 'C-irregular-consecutive-gates');
    const satellite = await renderImage(page, 'satellite', snapshot);
    const plan = await renderImage(page, 'plan', snapshot);
    const combined = await renderImage(page, 'combined', snapshot);
    expect(combined.width).toBe(1280);
    expect(combined.height).toBe(satellite.height + plan.height);
});

test('a length typed by hand is marked and the measured one is kept in the plan', async ({ page }) => {
    const snapshot = await fakeSnapshot(page, 'H-wall-and-adjusted');
    const satellite = await renderImage(page, 'satellite', snapshot);
    expect(satellite.layout.scene.labels.map((label) => label.text)).toContain('52 ft *');
    expect(satellite.layout.scene.labels.map((label) => label.text)).toContain('40 ft · wall');
    const plan = await renderImage(page, 'plan', snapshot);
    expect(plan.layout.legend).toContain('Side 3: 52 ft * (measured 50 ft)');
});

// Evidence for people: set WFS_EVIDENCE_DIR to keep the pictures.
test('writes the images for review', async ({ page }) => {
    const directory = process.env.WFS_EVIDENCE_DIR;
    test.skip(!directory, 'set WFS_EVIDENCE_DIR to write the images');
    fs.mkdirSync(directory, { recursive: true });
    for (const name of names) {
        const snapshot = await fakeSnapshot(page, name);
        for (const kind of ['satellite', 'plan', 'combined']) {
            if (kind === 'combined' && !name.startsWith('C-')) {
                continue;
            }
            const image = await renderImage(page, kind, snapshot);
            fs.writeFileSync(path.join(directory, `${name}-${kind}.png`), image.png);
        }
    }
});
