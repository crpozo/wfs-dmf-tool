/*
 * Pictures for people to review, not assertions: the map at several zoom levels, the
 * Plan background, a whole page on desktop and phone, and how many labels overlap in
 * each. Skipped unless WFS_EVIDENCE_DIR is set:
 *
 *   WFS_EVIDENCE_DIR=docs/property-map-rendering/evidence/after npx playwright test evidence images
 */
import fs from 'node:fs';
import path from 'node:path';
import { test } from '@playwright/test';
import { SCENARIOS } from '../js/fixtures/scenarios.js';
import { loadDrawing, openMap, settle } from './support/app.js';

const directory = process.env.WFS_EVIDENCE_DIR;
const SHOTS = [
    ['A-rectangle-two-gates', [18, 20]],
    ['B-backyard-short-returns', [20, 21]],
    ['C-irregular-consecutive-gates', [18, 20, 21]],
    ['D-staircase-small-segments', [20, 21]],
    ['E-large-lot', [18, 19]],
    ['F-narrow-side-yard', [20, 21]],
    ['I-single-long-side-three-gates', [20]],
    ['J-dense-zigzag', [21]],
];

// Counted on whatever labels the page shows, so it reads the same on any version of the app.
const overlaps = (page) => page.evaluate(() => {
    const boxes = [...document.querySelectorAll('[data-pm-map] .pm-label, [data-pm-map] .pm-gate-label')]
        .map((node) => node.getBoundingClientRect())
        .filter((box) => box.width > 0);
    let pairs = 0;
    for (let i = 0; i < boxes.length; i++) {
        for (let j = i + 1; j < boxes.length; j++) {
            const [a, b] = [boxes[i], boxes[j]];
            if (a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom) {
                pairs += 1;
            }
        }
    }
    const corners = [...document.querySelectorAll('[data-pm-map] .pm-vertex')].map((node) => node.getBoundingClientRect());
    const covered = corners.filter((corner) => boxes.some((box) => {
        const x = corner.left + corner.width / 2;
        const y = corner.top + corner.height / 2;
        return x > box.left && x < box.right && y > box.top && y < box.bottom;
    })).length;
    return { labels: boxes.length, overlappingPairs: pairs, cornersCovered: covered };
});

test('map pictures and overlap counts', async ({ page }, info) => {
    test.skip(!directory, 'set WFS_EVIDENCE_DIR to write the pictures');
    test.setTimeout(120000);
    fs.mkdirSync(directory, { recursive: true });
    const device = info.project.name;
    const metrics = {};
    await openMap(page);
    const map = page.locator('[data-pm-map]');

    for (const [name, zooms] of SHOTS) {
        for (const zoom of zooms) {
            await loadDrawing(page, SCENARIOS[name], zoom);
            metrics[`${name}-z${zoom}`] = await overlaps(page);
            await map.screenshot({ path: path.join(directory, `${device}-map-${name}-z${zoom}.png`) });
        }
    }

    // The same drawing on the Plan background, where the app has one.
    const planButton = page.locator('[data-pm-action="bg-plan"]');
    if (await planButton.count()) {
        for (const [name, zoom] of [['C-irregular-consecutive-gates', 21], ['B-backyard-short-returns', 20]]) {
            await loadDrawing(page, SCENARIOS[name], zoom);
            await planButton.click();
            await settle(page);
            await map.screenshot({ path: path.join(directory, `${device}-plan-${name}-z${zoom}.png`) });
            await page.locator('[data-pm-action="bg-satellite"]').click();
        }
    }

    // The whole step, as the customer sees it.
    await loadDrawing(page, SCENARIOS['B-backyard-short-returns'], 20);
    await page.locator('#propertyMap').scrollIntoViewIfNeeded();
    await page.locator('#propertyMap').screenshot({ path: path.join(directory, `${device}-page.png`) });

    fs.writeFileSync(path.join(directory, `${device}-metrics.json`), `${JSON.stringify(metrics, null, 1)}\n`);
});
