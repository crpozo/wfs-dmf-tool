/*
 * From the materials list to the quote image and the downloads, in the real page.
 *
 * Two server answers are stubbed here, and only here:
 *   - POST /property-map/estimate: the materials calculation needs the product catalog
 *     database, which the test environment does not have. Its input (the graph sent by
 *     the map) is covered by tests/js/unit/map-to-graph.test.js.
 *   - POST /property-map/snapshot: the real one asks Google for the photo. The stub
 *     answers with a generated photo and the frame the server computes for the drawing.
 */
import { expect, test } from '@playwright/test';
import { SCENARIOS } from '../js/fixtures/scenarios.js';
import { loadDrawing, openMap } from './support/app.js';
import { fakeSnapshot } from './support/images.js';

const NAME = 'A-rectangle-two-gates';

async function prepare(page, { photo = true } = {}) {
    await openMap(page);
    await loadDrawing(page, SCENARIOS[NAME], 20);
    const calls = { estimate: [], snapshot: 0 };
    await page.route('**/property-map/estimate', async (route) => {
        calls.estimate.push(route.request().postDataJSON());
        await route.fulfill({ status: 200, contentType: 'text/plain', body: '280 ft of fence (test list)' });
    });
    const snapshot = await fakeSnapshot(page, NAME);
    await page.route('**/property-map/snapshot', async (route) => {
        calls.snapshot += 1;
        await (photo
            ? route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(snapshot) })
            : route.fulfill({ status: 502, contentType: 'application/json', body: JSON.stringify({ message: 'The satellite image is not available right now.' }) }));
    });
    // The page's own quote button opens a form that needs the rest of the flow; only the
    // image the map hands to it matters here.
    await page.evaluate(() => window.jQuery('#btnQuote').off('click').on('click', () => {
        window.__quoteImage = window.WFS.propertyMap.quoteImage();
    }));
    return calls;
}

async function getMaterials(page) {
    await page.locator('[data-pm-action="estimate"]').click();
    await page.locator('.swal2-cancel').click(); // no concrete
    await expect(page.locator('[data-pm-materials-list]')).toHaveValue(/test list/);
}

const imageSize = (page) => page.evaluate(() => new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight, type: window.__quoteImage.slice(0, 15) });
    image.src = window.__quoteImage;
}));

test('the quote gets the satellite image, and the drawing sent for materials is unchanged', async ({ page }) => {
    const calls = await prepare(page);
    const project = await page.evaluate(() => window.WFS.propertyMap.getProject());
    await getMaterials(page);
    expect(calls.estimate).toHaveLength(1);
    expect(calls.estimate[0].project.runs).toEqual(project.runs);
    expect(calls.estimate[0].project.vertices).toEqual(project.vertices);
    // 4 sides, two of them split by a gate: 4 + 2 * 2 edges, lengths as on the map.
    expect(calls.estimate[0].graph).toHaveLength(8);
    expect(calls.estimate[0].graph.filter((edge) => edge.door === 1).map((edge) => edge.length)).toEqual([4, 10]);

    await page.locator('[data-pm-action="quote"]').click();
    await expect.poll(() => page.evaluate(() => typeof window.__quoteImage)).toBe('string');
    const image = await imageSize(page);
    expect(image.type).toBe('data:image/jpeg');
    expect(image.width).toBe(1280);
    expect(image.height).toBe(1632); // 200x255 from the server's frame, scaled evenly
});

test('downloads: plan at any time, satellite and both after the materials list, one photo request for all', async ({ page }) => {
    const calls = await prepare(page);

    // Before the materials list only the plan is available; the satellite one says why.
    const planDownload = page.waitForEvent('download');
    await page.locator('[data-pm-action="download-plan"]').click();
    expect((await planDownload).suggestedFilename()).toBe('fence-drawing-plan.jpg');
    await page.locator('[data-pm-action="download-satellite"]').click();
    await expect(page.locator('[data-pm-message]')).toContainText('Continue to materials');
    expect(calls.snapshot).toBe(0);

    await getMaterials(page);
    const satelliteDownload = page.waitForEvent('download');
    await page.locator('[data-pm-action="download-satellite"]').click();
    expect((await satelliteDownload).suggestedFilename()).toBe('fence-drawing-satellite.jpg');
    const bothDownload = page.waitForEvent('download');
    await page.locator('[data-pm-action="download-both"]').click();
    expect((await bothDownload).suggestedFilename()).toBe('fence-drawing-satellite-and-plan.jpg');
    await page.locator('[data-pm-action="quote"]').click();
    await expect.poll(() => page.evaluate(() => typeof window.__quoteImage)).toBe('string');
    // Google is asked for the photo once, not once per image.
    expect(calls.snapshot).toBe(1);
});

test('without the photo the quote still goes out, with the technical plan', async ({ page }) => {
    await prepare(page, { photo: false });
    await getMaterials(page);
    await page.locator('[data-pm-action="quote"]').click();
    await expect.poll(() => page.evaluate(() => typeof window.__quoteImage)).toBe('string');
    const image = await imageSize(page);
    expect(image.type).toBe('data:image/jpeg');
    expect(image.width).toBe(1280);
});

test('switching between Satellite and Plan does not make the materials list stale', async ({ page }) => {
    await prepare(page);
    await getMaterials(page);
    await page.locator('[data-pm-action="bg-plan"]').click();
    await page.locator('[data-pm-action="bg-satellite"]').click();
    await expect(page.locator('[data-pm-materials-stale]')).toBeHidden();
    await expect(page.locator('[data-pm-action="quote"]')).toBeEnabled();
});
