/*
 * The interactive map in a real browser: the app's own page and bundle, with the stand-in
 * for Google Maps. Labels are read back from the page and checked against the same rules
 * as the layout engine's unit tests.
 */
import { expect, test } from '@playwright/test';
import { AUDIT_SCENARIOS, SCENARIOS } from '../js/fixtures/scenarios.js';
import { checkPlacement } from '../js/support/invariants.js';
import { loadDrawing, openMap, readScene, setZoom, settle } from './support/app.js';

// Boxes measured in the page are up to 1 px smaller per edge than the ones laid out.
const RULES = { maxGap: 50 };

test.beforeEach(async ({ page }) => {
    await openMap(page);
});

for (const [name, project] of Object.entries(SCENARIOS)) {
    test(`${name}: labels keep every rule at zoom 18 to 21`, async ({ page }) => {
        for (const zoom of [18, 19, 20, 21]) {
            await loadDrawing(page, project, zoom);
            const scene = await readScene(page);
            expect(checkPlacement(scene, RULES), `zoom ${zoom}`).toEqual([]);
            // Every label is either on the map or named in its tooltip and the panel.
            for (const label of scene.labels.filter((item) => item.box)) {
                expect(label.title, `${label.key} at zoom ${zoom}`).toMatch(label.kind === 'gate' ? /^G\d+: / : /^Side \d+: /);
            }
        }
    });
}

test('at the closest zoom every length and gate of the audit drawings is on the map', async ({ page }) => {
    for (const name of AUDIT_SCENARIOS) {
        await loadDrawing(page, SCENARIOS[name], 21);
        const scene = await readScene(page);
        const hidden = scene.labels.filter((label) => !label.box).map((label) => label.key);
        // The staircase has five 5 ft sides in a row; one of them has no room even here.
        expect(hidden.length, `${name}: ${hidden}`).toBeLessThanOrEqual(name.startsWith('D-') ? 1 : 0);
    }
});

test('a new gate does not move, and its label does not cover the length of its side', async ({ page }) => {
    await loadDrawing(page, SCENARIOS['E-large-lot'], 19);
    const before = await page.evaluate(() => window.WFS.propertyMap.getProject());
    // Side 2 has no gate yet: add one from the panel.
    await page.locator('.pm-run').nth(1).locator('[data-role="select"]').click();
    await page.locator('.pm-run').nth(1).locator('[data-role="gate-add"] button').first().click();
    await settle(page);
    const after = await page.evaluate(() => window.WFS.propertyMap.getProject());
    expect(after.runs[1].gates).toHaveLength(1);
    expect(after.runs[1].gates[0].t).toBe(0.5); // where the app puts a new gate: untouched
    expect(after.vertices).toEqual(before.vertices);
    const scene = await readScene(page);
    expect(checkPlacement(scene, RULES)).toEqual([]);
    expect(scene.labels.every((label) => label.box)).toBe(true);
});

test('zooming re-places the labels, and coming back gives the same picture', async ({ page }) => {
    await loadDrawing(page, SCENARIOS['C-irregular-consecutive-gates'], 21);
    const first = await readScene(page);
    for (const zoom of [20, 19, 18, 19, 20, 21]) {
        await setZoom(page, zoom);
        expect(checkPlacement(await readScene(page), RULES), `zoom ${zoom}`).toEqual([]);
    }
    const again = await readScene(page);
    expect(again.labels.map((label) => `${label.text}@${label.level}`)).toEqual(first.labels.map((label) => `${label.text}@${label.level}`));
    expect(again.counts).toEqual(first.counts);
});

test('panning moves the labels with the drawing and re-places nothing', async ({ page }) => {
    await loadDrawing(page, SCENARIOS['B-backyard-short-returns'], 20);
    await page.locator('[data-pm-action="mode-navigate"]').click();
    const relative = (scene) => scene.labels.filter((label) => label.box)
        .map((label) => [Math.round(label.box.x - scene.vertices[0].x), Math.round(label.box.y - scene.vertices[0].y)]);
    const before = await readScene(page);
    await page.evaluate(() => {
        const map = window.__fakeMap;
        map.setCenter(map.toLatLng({ x: map.size().width / 2 + 90, y: map.size().height / 2 - 60 }));
    });
    await settle(page);
    const after = await readScene(page);
    expect(Math.round(after.vertices[0].x - before.vertices[0].x)).toBe(-90);
    expect(relative(after)).toEqual(relative(before));
});

test('no markers, lines or listeners pile up after many changes', async ({ page }) => {
    await loadDrawing(page, SCENARIOS['D-staircase-small-segments'], 20);
    const before = await readScene(page);
    const listeners = () => page.evaluate(() => Object.fromEntries(Object.entries(window.__fakeMap.handlers).map(([name, set]) => [name, set.size])));
    const listenersBefore = await listeners();
    for (let i = 0; i < 12; i++) {
        await setZoom(page, 18 + (i % 4));
        await page.evaluate((plan) => window.WFS.propertyMap.setBackground(plan ? 'plan' : 'satellite'), i % 2 === 0);
    }
    await page.evaluate(() => window.WFS.propertyMap.setBackground('satellite'));
    await setZoom(page, 20);
    const after = await readScene(page);
    // One marker per corner and per label on the map, one line per side and gate, one
    // connector per label that has one: nothing left behind by earlier layouts.
    expect(after.counts.vertexMarkers).toBe(before.counts.vertexMarkers);
    expect(after.counts.polylines).toBe(before.counts.polylines);
    expect(after.counts.markers).toBe(after.vertices.length + after.labels.filter((label) => label.box).length);
    expect(after.counts.connectors).toBe(after.labels.filter((label) => label.leader).length);
    expect(await listeners()).toEqual(listenersBefore);
});

test('Plan shows the same drawing on white, numbers the sides, and changes nothing in the project', async ({ page }) => {
    await loadDrawing(page, SCENARIOS['A-rectangle-two-gates'], 21);
    const project = await page.evaluate(() => JSON.stringify(window.WFS.propertyMap.getProject()));
    const satellite = await readScene(page);
    expect(satellite.labels.filter((label) => label.kind === 'side').map((label) => label.text)).toEqual(['60 ft', '80 ft', '60 ft', '80 ft']);

    await page.locator('[data-pm-action="bg-plan"]').click();
    await settle(page);
    await expect(page.locator('[data-pm-action="bg-plan"]')).toHaveAttribute('aria-pressed', 'true');
    expect(await page.evaluate(() => window.__fakeMap.overlayMapTypes.getLength())).toBe(1);
    const plan = await readScene(page);
    expect(plan.labels.filter((label) => label.kind === 'side').map((label) => label.text)).toEqual(['1 · 60 ft', '2 · 80 ft', '3 · 60 ft', '4 · 80 ft']);
    expect(checkPlacement(plan, RULES)).toEqual([]);
    expect(plan.vertices).toEqual(satellite.vertices);
    expect(await page.evaluate(() => JSON.stringify(window.WFS.propertyMap.getProject()))).toBe(project);

    await page.locator('[data-pm-action="bg-satellite"]').click();
    await settle(page);
    expect(await page.evaluate(() => window.__fakeMap.overlayMapTypes.getLength())).toBe(0);
    const back = await readScene(page);
    expect(back.labels.map((label) => label.text)).toEqual(satellite.labels.map((label) => label.text));
    expect(await page.evaluate(() => JSON.stringify(window.WFS.propertyMap.getProject()))).toBe(project);
});

test('a side picked on the map is the same side in the panel', async ({ page }) => {
    await loadDrawing(page, SCENARIOS['A-rectangle-two-gates'], 21);
    await page.locator('.pm-label[data-pm-label="3"]').click();
    await expect(page.locator('.pm-run').nth(2)).toHaveClass(/is-selected/);
    await expect(page.locator('.pm-run').nth(2).locator('[data-role="select"]')).toHaveText('Side 3');
    // Gates carry in the panel the short name they get on the map when space is tight.
    await expect(page.locator('.pm-gate-id')).toHaveText(['G1', 'G2']);
});

test('dragging a corner keeps the labels in order', async ({ page, isMobile }) => {
    test.skip(isMobile, 'corner dragging with a mouse');
    await loadDrawing(page, SCENARIOS['A-rectangle-two-gates'], 21);
    await page.locator('[data-pm-action="mode-draw"]').click();
    const corner = page.locator('.pm-vertex').nth(2);
    const box = await corner.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    for (let step = 1; step <= 8; step++) {
        await page.mouse.move(box.x + box.width / 2 - step * 12, box.y + box.height / 2 + step * 9);
    }
    await page.mouse.up();
    await settle(page);
    const scene = await readScene(page);
    expect(checkPlacement(scene, RULES)).toEqual([]);
    expect(scene.counts.vertexMarkers).toBe(4);
});

test('the rest of the page still works: 3D button, classic canvas and back', async ({ page }) => {
    await loadDrawing(page, SCENARIOS['A-rectangle-two-gates'], 20);
    await expect(page.locator('[data-pm-action="view3d"]')).toBeEnabled();
    await expect(page.locator('[data-pm-action="undo"]')).toBeVisible();
    // Printing belongs to the classic canvas; it stays hidden on the map and comes back with it.
    await expect(page.locator('#btnPrintSketch')).toBeHidden();
    await page.locator('[data-pm-action="classic"]').click();
    await expect(page.locator('body')).not.toHaveClass(/pm-map-active/);
    await page.locator('[data-pm-action="map"]').click();
    await expect(page.locator('body')).toHaveClass(/pm-map-active/);
    await settle(page); // the map was hidden: let it take its size back
    expect(checkPlacement(await readScene(page), RULES)).toEqual([]);
});
