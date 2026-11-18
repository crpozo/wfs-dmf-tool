/*
 * Helpers for the browser tests: open the real drawing page with the stand-in for Google
 * Maps (fake-google.js), load a drawing and read back what is on screen.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const FAKE_GOOGLE = fs.readFileSync(path.join(here, 'fake-google.js'), 'utf8');

const MATERIALS = { 1: { code: '40120', material: 'Vinyl', style: 'Privacy', design: 'Solid', height: '6 ft', color: 'White' } };

/*
 * The page loads jQuery, Bootstrap, SweetAlert, p5 and Shepherd from public CDNs. Where
 * those are blocked (sandboxes), set WFS_CDN_MIRROR to a folder with the same packages
 * installed by npm (its node_modules) and they are served from there instead.
 */
async function mirrorCdn(page) {
    const mirror = process.env.WFS_CDN_MIRROR;
    if (!mirror) {
        return;
    }
    const serve = (file) => async (route) => {
        const full = path.join(mirror, file);
        if (!fs.existsSync(full)) {
            return route.abort();
        }
        const type = full.endsWith('.css') ? 'text/css' : 'text/javascript';
        return route.fulfill({ status: 200, contentType: type, body: fs.readFileSync(full), headers: { 'access-control-allow-origin': '*' } });
    };
    await page.route('https://code.jquery.com/jquery-*.min.js', serve('jquery/dist/jquery.min.js'));
    await page.route('https://code.jquery.com/ui/**', serve('jquery-ui-dist/jquery-ui.min.js'));
    await page.route('https://cdnjs.cloudflare.com/ajax/libs/p5.js/**', serve('p5/lib/p5.js'));
    await page.route('https://cdn.jsdelivr.net/npm/**', (route) => {
        const [, name, file] = new URL(route.request().url()).pathname.match(/^\/npm\/((?:@[^/]+\/)?[^@/]+)@[^/]+\/(.+)$/) || [];
        return name ? serve(`${name}/${file}`)(route) : route.abort();
    });
}

// Opens the drawing step with the map showing. Nothing reaches Google.
export async function openMap(page) {
    await page.addInitScript(FAKE_GOOGLE);
    await mirrorCdn(page);
    await page.route(/https:\/\/maps\.(googleapis|gstatic)\.com\//, (route) => route.abort());
    // The embed entry point stores the fence configuration in the session without a database.
    await page.goto(`/embed/drawfence?materials=${encodeURIComponent(JSON.stringify(MATERIALS))}`);
    await page.goto('/drawfence');
    await page.waitForFunction(() => window.WFS?.propertyMap && window.__fakeMap);
    await page.evaluate(() => document.fonts.ready);
}

// Loads a drawing and frames it: centred, at the given zoom.
export async function loadDrawing(page, project, zoom = 20) {
    await page.evaluate(({ project, zoom }) => {
        const lats = project.vertices.map((v) => v.lat);
        const lngs = project.vertices.map((v) => v.lng);
        const center = { lat: (Math.min(...lats) + Math.max(...lats)) / 2, lng: (Math.min(...lngs) + Math.max(...lngs)) / 2 };
        window.WFS.propertyMap.loadProject({ ...project, center, zoom });
    }, { project, zoom });
    await settle(page);
}

export async function setZoom(page, zoom) {
    await page.evaluate((value) => window.__fakeMap.setZoom(value), zoom);
    await settle(page);
}

// Two frames: the layout runs on the frame after a zoom change.
export async function settle(page) {
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

/*
 * What is on the map right now, in viewport pixels, in the shape checkPlacement() takes:
 * sides, corners and gates from the project, labels and connectors from the page itself.
 */
export async function readScene(page) {
    return page.evaluate(() => {
        const map = window.__fakeMap;
        const project = window.WFS.propertyMap.getProject();
        const points = project.vertices.map((vertex) => map.toClient(vertex));
        const lerp = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
        const segments = project.runs.map((run, index) => ({ key: `side:${index}`, a: points[run.from], b: points[run.to] }));
        const gates = [];
        project.runs.forEach((run, index) => (run.gates || []).forEach((gate, gateIndex) => {
            const half = run.calc_ft > 0 ? gate.width_ft / 2 / run.calc_ft : 0;
            const { a, b } = segments[index];
            gates.push({
                key: `gate:${index}:${gateIndex}`,
                segment: `side:${index}`,
                from: lerp(a, b, Math.max(0, gate.t - half)),
                to: lerp(a, b, Math.min(1, gate.t + half)),
                at: lerp(a, b, gate.t),
            });
        }));

        const lines = [...map.polylines].filter((line) => line.map);
        const connectors = lines.filter((line) => line.options.zIndex === 12).map((line) => ({
            from: map.toClient(line.path[0]),
            to: map.toClient(line.path[1]),
        }));
        const distance = (p, box) => Math.hypot(
            Math.max(box.x - p.x, 0, p.x - (box.x + box.width)),
            Math.max(box.y - p.y, 0, p.y - (box.y + box.height)),
        );
        const pointSegment = (p, a, b) => {
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1)));
            return Math.hypot(p.x - a.x - dx * t, p.y - a.y - dy * t);
        };

        // A label is found by the name the app gives it: the side number or the gate name.
        const read = (id, kind, key, segment) => {
            const selector = kind === 'gate' ? '.pm-gate-label' : '.pm-label';
            const node = [...map.markerLayer.querySelectorAll(selector)].find((item) => item.dataset.pmLabel === id);
            if (!node) {
                return { key, kind, segment, gate: kind === 'gate' ? key : undefined, box: null, leader: null, level: 'legend', text: '', title: '' };
            }
            const rect = node.getBoundingClientRect();
            const box = { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
            // A connector belongs to the label it ends on and the side it starts on.
            const own = segments.find((item) => item.key === segment);
            const leader = connectors.find((line) => distance(line.to, box) < 4 && pointSegment(line.from, own.a, own.b) < 1.5);
            const level = ['full', 'compact', 'ref'].find((name) => node.classList.contains(`is-${name}`));
            return { key, kind, segment, gate: kind === 'gate' ? key : undefined, box, leader: leader || null, level, text: node.textContent, title: node.parentElement?.title || '' };
        };
        const labels = [
            ...segments.map((segment, index) => read(String(index + 1), 'side', segment.key, segment.key)),
            ...gates.map((gate, index) => read(`G${index + 1}`, 'gate', gate.key, gate.segment)),
        ];
        const frame = map.element.getBoundingClientRect();
        return {
            segments,
            vertices: points,
            gates,
            labels,
            connectors,
            frame: { x: frame.x, y: frame.y, width: frame.width, height: frame.height },
            counts: {
                markers: [...map.markers].filter((marker) => marker.map).length,
                polylines: lines.length - connectors.length,
                connectors: connectors.length,
                vertexMarkers: document.querySelectorAll('.pm-vertex').length,
            },
        };
    });
}
