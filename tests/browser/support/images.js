/*
 * Helpers for the image tests: a generated "satellite photo" of the size the server would
 * ask Google for (with a mock logo and attribution where Google puts them), and running
 * the app's own image renderers in the page.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

// Scenarios with the frame PropertyMapImage::frame() gives each (checked by PHPUnit).
export const FIXTURES = JSON.parse(fs.readFileSync(path.join(here, '../../fixtures/property-map-scenarios.json'), 'utf8'));

// What POST /property-map/snapshot answers, with a generated photo instead of Google's.
export async function fakeSnapshot(page, name) {
    const { project, frame } = FIXTURES[name];
    const image = await page.evaluate(({ width, height }) => {
        const canvas = document.createElement('canvas');
        canvas.width = width * 2; // scale=2
        canvas.height = height * 2;
        const context = canvas.getContext('2d');
        context.fillStyle = '#586f4d';
        context.fillRect(0, 0, canvas.width, canvas.height);
        // Lawns, roofs and a street, so labels are judged over uneven ground.
        context.fillStyle = '#4b6243';
        for (let i = 0; i < 40; i++) {
            context.fillRect((i * 97) % canvas.width, (i * 61) % canvas.height, 46, 30);
        }
        context.fillStyle = '#8f8676';
        context.fillRect(canvas.width * 0.36, canvas.height * 0.3, canvas.width * 0.24, canvas.height * 0.2);
        context.fillStyle = '#b9b4a8';
        context.fillRect(canvas.width * 0.08, canvas.height * 0.62, canvas.width * 0.16, canvas.height * 0.12);
        context.fillStyle = '#6d6f6a';
        context.fillRect(0, 0, canvas.width, 26);
        // Where Static Maps puts Google's logo and the attribution, at their real size.
        context.fillStyle = '#ffffff';
        context.font = 'bold 30px sans-serif';
        context.textBaseline = 'bottom';
        context.fillText('Google', 10, canvas.height - 8);
        context.font = '18px sans-serif';
        context.textAlign = 'right';
        context.fillText('Imagery ©2026 (test image)', canvas.width - 8, canvas.height - 6);
        return canvas.toDataURL('image/jpeg', 0.9);
    }, frame.size);
    return { image, frame, project };
}

/*
 * Renders one of the app's images ('satellite', 'plan' or 'combined') in the page and
 * returns its size, what was laid out on it and the picture itself as PNG bytes.
 */
export async function renderImage(page, kind, snapshot) {
    const result = await page.evaluate(async ({ kind, snapshot }) => {
        const canvas = await window.WFS.propertyMap.images[kind](kind === 'plan' ? { project: snapshot.project } : snapshot);
        return {
            width: canvas.width,
            height: canvas.height,
            layout: canvas.layout || null,
            png: canvas.toDataURL('image/png'),
        };
    }, { kind, snapshot });
    return { ...result, png: Buffer.from(result.png.split(',')[1], 'base64') };
}

// Share of the image the fence takes, along its longer dimension.
export function fill(layout, width, height) {
    const xs = layout.scene.vertices.map((p) => p.x);
    const ys = layout.scene.vertices.map((p) => p.y);
    return Math.max((Math.max(...xs) - Math.min(...xs)) / width, (Math.max(...ys) - Math.min(...ys)) / height);
}
