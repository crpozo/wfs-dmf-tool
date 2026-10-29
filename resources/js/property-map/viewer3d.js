/*
 * 3D view of the customer's property (Phase 2): a home in the style of the website's
 * viewer, sized, turned and placed like the customer's real house (footprint from FEMA
 * USA Structures), on a lawn with sky and tree line, and the chosen fence built along the
 * drawn sides with its gates. Loaded on demand the first time "View in 3D" is pressed.
 *
 * The satellite photo is not used here: laid flat and seen at an angle it looks smeared.
 *
 * Units are feet. World axes: x east, z south, y up; the origin is the middle of the
 * drawing. The fence geometry comes from fence3d/cerca.js, the same builder as the
 * website's 3D viewer, so every material, style and color looks the same. Lighting, sky
 * and camera controls follow that viewer (wfs-design-preview/src-3d/escena.js).
 */
import {
    Scene, PerspectiveCamera, WebGLRenderer, Group, Color, Fog, HemisphereLight, DirectionalLight,
    AmbientLight, Mesh, SphereGeometry, PlaneGeometry,
    MeshBasicMaterial, MeshStandardMaterial, BackSide, CanvasTexture, PCFSoftShadowMap,
    ACESFilmicToneMapping, SRGBColorSpace, Vector3, PMREMGenerator, BoxGeometry,
} from 'three';
import * as Cerca from './fence3d/cerca.js';
import * as T from './fence3d/texturas.js';
import * as Person from './fence3d/persona.js';
import { buildHouse, buildSurroundings } from './house3d.js';
import { COLOR_CHOICES, COLOR_LABELS, SWATCHES, fenceOptions } from './fence-catalog.js';

const FEET_PER_METER = 3.28084;
const METERS_PER_DEGREE_LAT = 110574;
const METERS_PER_DEGREE_LNG = 111320;
const WALL_THICKNESS_FT = 0.7;
// The website viewer's standard home, used when the real footprint is not found.
const STANDARD_HOUSE = { width: 48, depth: 34, height: 10 };

/* ── coordinates ─────────────────────────────────────────────────────────── */

function projector(origin) {
    const cosLat = Math.cos((origin.lat * Math.PI) / 180);
    return (lat, lng) => [
        (lng - origin.lng) * METERS_PER_DEGREE_LNG * cosLat * FEET_PER_METER,
        (origin.lat - lat) * METERS_PER_DEGREE_LAT * FEET_PER_METER,
    ];
}

function boundsCenter(vertices) {
    const lats = vertices.map((v) => v.lat);
    const lngs = vertices.map((v) => v.lng);
    return { lat: (Math.min(...lats) + Math.max(...lats)) / 2, lng: (Math.min(...lngs) + Math.max(...lngs)) / 2 };
}

/* ── fence layout from the map project ───────────────────────────────────── */

/*
 * cerca.js puts the good face of each section on the right of its a->b direction
 * (v > 0). Sides are flipped as needed so the good face looks away from the yard: the
 * reference point inside is the house when there is one, else the middle of the drawing.
 */
function layout(project, toXZ, insidePoint) {
    const points = project.vertices.map((v) => toXZ(v.lat, v.lng));
    const bySlot = new Map();
    const walls = [];

    for (const run of project.runs) {
        let a = points[run.from];
        let b = points[run.to];
        let gates = run.gates || [];

        const dx = b[0] - a[0];
        const dz = b[1] - a[1];
        const length = Math.hypot(dx, dz);
        if (length < 0.5) {
            continue;
        }
        if (run.is_existing_wall) {
            walls.push({ a, b });
            continue;
        }

        // Normal of the good face: (-dz, dx). Flip the side if it points at the yard.
        const middle = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
        const towardsInside = (insidePoint[0] - middle[0]) * (-dz) + (insidePoint[1] - middle[1]) * dx;
        if (towardsInside > 0) {
            [a, b] = [b, a];
            gates = gates.map((gate) => ({ ...gate, t: 1 - gate.t }));
        }

        const slot = run.material || 1;
        if (!bySlot.has(slot)) {
            bySlot.set(slot, { tramos: [], huecos: [] });
        }
        const target = bySlot.get(slot);
        const at = (ft) => [a[0] + ((b[0] - a[0]) * ft) / length, a[1] + ((b[1] - a[1]) * ft) / length];

        let cursor = 0;
        for (const gate of [...gates].sort((g1, g2) => g1.t - g2.t)) {
            const start = Math.max(cursor, gate.t * length - gate.width_ft / 2);
            const end = Math.min(length, start + gate.width_ft);
            if (start - cursor > 0.3) {
                target.tramos.push({ a: at(cursor), b: at(start) });
            }
            const tipo = gate.style === 'swing' ? gate.type : gate.style;
            target.huecos.push({
                a: at(start),
                b: at(end),
                tipo,
                abierto: false,
                apertura: tipo === 'cantilever' ? 0.12 : 0.3,
            });
            cursor = end;
        }
        if (length - cursor > 0.3) {
            target.tramos.push({ a: at(cursor), b: at(length) });
        }
    }

    return { points, bySlot, walls };
}

/* ── scene pieces ────────────────────────────────────────────────────────── */

function sky() {
    // Same gradient and clouds as the website viewer.
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const g = canvas.getContext('2d');
    const gradient = g.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#3f7fc4');
    gradient.addColorStop(0.42, '#8dc0e6');
    gradient.addColorStop(0.76, '#cfe2f0');
    gradient.addColorStop(1, '#e8e4d8');
    g.fillStyle = gradient;
    g.fillRect(0, 0, 1024, 512);
    let seed = 7;
    const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    for (let i = 0; i < 26; i++) {
        const cx = rnd() * 1024;
        const cy = 155 + rnd() * 75;
        const width = 40 + rnd() * 60;
        const blobs = 5 + Math.floor(rnd() * 6);
        for (let k = 0; k < blobs; k++) {
            const mx = cx + (rnd() - 0.5) * width;
            const my = cy + (rnd() - 0.5) * width * 0.28;
            const r = width * (0.18 + rnd() * 0.22);
            const rg = g.createRadialGradient(mx, my, 0, mx, my, r);
            rg.addColorStop(0, `rgba(255,255,255,${0.45 + rnd() * 0.3})`);
            rg.addColorStop(0.6, `rgba(255,255,255,${0.18 + rnd() * 0.15})`);
            rg.addColorStop(1, 'rgba(255,255,255,0)');
            g.fillStyle = rg;
            g.beginPath();
            g.arc(mx, my, r, 0, Math.PI * 2);
            g.fill();
        }
    }
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    return new Mesh(new SphereGeometry(900, 32, 20), new MeshBasicMaterial({ map: texture, side: BackSide, fog: false }));
}

/* ── house placement ─────────────────────────────────────────────────────── */

// Convex hull (monotone chain) of [x, z] points.
function hull(points) {
    const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lower = [];
    for (const p of sorted) {
        while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
        lower.push(p);
    }
    const upper = [];
    for (const p of [...sorted].reverse()) {
        while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
        upper.push(p);
    }
    return lower.slice(0, -1).concat(upper.slice(0, -1));
}

/*
 * Smallest rectangle around the footprint (one side always lies on a hull edge):
 * center, long side (width), short side (depth) and the long side direction.
 */
function orientedRectangle(points) {
    const shape = hull(points);
    let best = null;
    for (let i = 0; i < shape.length; i++) {
        const p = shape[i];
        const q = shape[(i + 1) % shape.length];
        const length = Math.hypot(q[0] - p[0], q[1] - p[1]);
        if (length < 0.01) continue;
        const ux = (q[0] - p[0]) / length;
        const uz = (q[1] - p[1]) / length;
        let minU = Infinity;
        let maxU = -Infinity;
        let minV = Infinity;
        let maxV = -Infinity;
        for (const [x, z] of shape) {
            const u = x * ux + z * uz;
            const v = -x * uz + z * ux;
            minU = Math.min(minU, u);
            maxU = Math.max(maxU, u);
            minV = Math.min(minV, v);
            maxV = Math.max(maxV, v);
        }
        const area = (maxU - minU) * (maxV - minV);
        if (!best || area < best.area) {
            const cu = (minU + maxU) / 2;
            const cv = (minV + maxV) / 2;
            best = { area, ux, uz, lengthU: maxU - minU, lengthV: maxV - minV, center: [cu * ux - cv * uz, cu * uz + cv * ux] };
        }
    }
    if (!best) return null;
    return best.lengthU >= best.lengthV
        ? { center: best.center, width: best.lengthU, depth: best.lengthV, axis: [best.ux, best.uz] }
        : { center: best.center, width: best.lengthV, depth: best.lengthU, axis: [-best.uz, best.ux] };
}

/*
 * Places the styled house. buildHouse() faces +z locally; it is turned so its long side
 * follows the real house and its front faces frontHint (the widest gate, usually the
 * driveway, or else the south side of the drawing).
 */
function placeHouse(rect, height, frontHint) {
    let rotation = Math.atan2(-rect.axis[1], rect.axis[0]);
    // Local +z after the turn points to (sin r, cos r).
    const front = [Math.sin(rotation), Math.cos(rotation)];
    if ((frontHint[0] - rect.center[0]) * front[0] + (frontHint[1] - rect.center[1]) * front[1] < 0) {
        rotation += Math.PI;
    }
    const group = buildHouse({ width: rect.width, depth: rect.depth, height });
    group.rotation.y = rotation;
    group.position.set(rect.center[0], 0, rect.center[1]);
    return { group, center: rect.center, front: [Math.sin(rotation), Math.cos(rotation)] };
}

function pointInPolygon(point, polygon) {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const [xi, zi] = polygon[i];
        const [xj, zj] = polygon[j];
        if ((zi > point[1]) !== (zj > point[1]) && point[0] < ((xj - xi) * (point[1] - zi)) / (zj - zi) + xi) {
            inside = !inside;
        }
    }
    return inside;
}

/*
 * Without a footprint, the standard home goes in the middle of a closed fence, turned
 * like its longest side and made smaller if needed so it stays clear of the fence.
 * Open fences (one side, an L) get no house: there is no telling where it would stand.
 */
function standardHouseRect(points, closed) {
    if (!closed || points.length < 3) return null;
    const middle = [points.reduce((s, p) => s + p[0], 0) / points.length, points.reduce((s, p) => s + p[1], 0) / points.length];
    let longest = null;
    for (let i = 0; i < points.length; i++) {
        const p = points[i];
        const q = points[(i + 1) % points.length];
        const length = Math.hypot(q[0] - p[0], q[1] - p[1]);
        if (length > 0 && (!longest || length > longest.length)) {
            longest = { length, axis: [(q[0] - p[0]) / length, (q[1] - p[1]) / length] };
        }
    }
    if (!longest) return null;
    const [ux, uz] = longest.axis;
    const margin = 8;
    for (const scale of [1, 0.8, 0.65, 0.5]) {
        const width = STANDARD_HOUSE.width * scale;
        const depth = STANDARD_HOUSE.depth * scale;
        const corners = [[1, 1], [1, -1], [-1, 1], [-1, -1]].map(([su, sv]) => [
            middle[0] + ux * su * (width / 2 + margin) - uz * sv * (depth / 2 + margin),
            middle[1] + uz * su * (width / 2 + margin) + ux * sv * (depth / 2 + margin),
        ]);
        if (corners.every((corner) => pointInPolygon(corner, points))) {
            return { center: middle, width, depth, axis: longest.axis };
        }
    }
    return null;
}

function existingWalls(walls, height) {
    const group = new Group();
    const material = new MeshStandardMaterial({ map: T.estuco('#e3dccf'), roughness: 0.9 });
    for (const { a, b } of walls) {
        const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
        const mesh = new Mesh(new BoxGeometry(length, height, WALL_THICKNESS_FT), material);
        mesh.position.set((a[0] + b[0]) / 2, height / 2, (a[1] + b[1]) / 2);
        mesh.rotation.y = Math.atan2(-(b[1] - a[1]), b[0] - a[0]);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        group.add(mesh);
    }
    return group;
}

/* ── viewer ──────────────────────────────────────────────────────────────── */

class Viewer {
    constructor(canvas, span) {
        this.canvas = canvas;
        this.dirty = true;
        this.scene = new Scene();
        this.scene.background = new Color('#8dc0e6');
        this.scene.fog = new Fog(new Color('#cfe2f0'), Math.max(160, span * 2.2), Math.max(520, span * 6));
        this.scene.add(sky());

        this.camera = new PerspectiveCamera(42, 16 / 9, 0.5, 2000);
        this.renderer = new WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = PCFSoftShadowMap;
        this.renderer.toneMapping = ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.12;
        this.renderer.outputColorSpace = SRGBColorSpace;

        // Mid-afternoon sun, as in the website viewer; the shadow box follows the lot size.
        const sun = new DirectionalLight(0xfff2df, 2.7);
        sun.position.set(-40, 100, 70).normalize().multiplyScalar(Math.max(140, span * 1.6));
        sun.castShadow = true;
        const touch = window.matchMedia?.('(pointer: coarse)').matches;
        sun.shadow.mapSize.set(touch ? 2048 : 4096, touch ? 2048 : 4096);
        const reach = Math.max(70, span * 0.9);
        Object.assign(sun.shadow.camera, { left: -reach, right: reach, top: reach, bottom: -reach, near: 1, far: Math.max(400, span * 4) });
        sun.shadow.bias = -0.00005;
        sun.shadow.normalBias = 0.07;
        this.scene.add(sun, new HemisphereLight(0xbcd8f0, 0x6d7a52, 0.7), new AmbientLight(0xffffff, 0.1));

        const pmrem = new PMREMGenerator(this.renderer);
        const environment = new Scene();
        environment.add(sky());
        const floor = new Mesh(new PlaneGeometry(4000, 4000), new MeshBasicMaterial({ color: new Color('#6f8a4a') }));
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -2;
        environment.add(floor);
        this.scene.environment = pmrem.fromScene(environment, 0.04).texture;
        this.scene.environmentIntensity = 0.55;
        pmrem.dispose();

        this.world = new Group();
        this.scene.add(this.world);
        this.fence = null;

        this.target = new Vector3(0, 4, 0);
        this.distance = 80;
        this.azimuth = 0.42;
        this.polar = 1.2;
        this.transition = null;
        this.place();
        this.bindControls();
    }

    place() {
        const sp = Math.sin(this.polar);
        this.camera.position.set(
            this.target.x + this.distance * sp * Math.sin(this.azimuth),
            this.target.y + this.distance * Math.cos(this.polar),
            this.target.z + this.distance * sp * Math.cos(this.azimuth)
        );
        this.camera.lookAt(this.target);
        this.dirty = true;
    }

    // Orbit, zoom and pan (right button or Shift), and pinch on touch; as in the website viewer.
    bindControls() {
        const canvas = this.canvas;
        let drag = null;
        let pinch = null;

        canvas.addEventListener('pointerdown', (event) => {
            drag = { x: event.clientX, y: event.clientY, pan: event.button === 2 || event.shiftKey };
            canvas.setPointerCapture?.(event.pointerId);
            this.transition = null;
        });
        canvas.addEventListener('pointermove', (event) => {
            if (!drag || pinch) {
                return;
            }
            const dx = event.clientX - drag.x;
            const dy = event.clientY - drag.y;
            drag.x = event.clientX;
            drag.y = event.clientY;
            if (drag.pan) {
                const k = this.distance * 0.0016;
                const right = new Vector3().setFromMatrixColumn(this.camera.matrix, 0);
                const up = new Vector3().setFromMatrixColumn(this.camera.matrix, 1);
                this.target.addScaledVector(right, -dx * k).addScaledVector(up, dy * k);
                this.target.y = Math.max(0.5, Math.min(40, this.target.y));
            } else {
                this.azimuth -= dx * 0.006;
                this.polar = Math.max(0.12, Math.min(1.52, this.polar - dy * 0.005));
            }
            this.place();
        });
        const release = (event) => {
            drag = null;
            canvas.releasePointerCapture?.(event.pointerId);
        };
        canvas.addEventListener('pointerup', release);
        canvas.addEventListener('pointercancel', release);
        canvas.addEventListener('contextmenu', (event) => event.preventDefault());
        canvas.addEventListener('wheel', (event) => {
            event.preventDefault();
            this.transition = null;
            this.distance = Math.max(7, Math.min(400, this.distance * (1 + Math.sign(event.deltaY) * 0.11)));
            this.place();
        }, { passive: false });

        canvas.addEventListener('touchstart', (event) => {
            if (event.touches.length === 2) {
                pinch = Math.hypot(event.touches[0].clientX - event.touches[1].clientX, event.touches[0].clientY - event.touches[1].clientY);
            }
        }, { passive: true });
        canvas.addEventListener('touchmove', (event) => {
            if (event.touches.length === 2 && pinch) {
                const d = Math.hypot(event.touches[0].clientX - event.touches[1].clientX, event.touches[0].clientY - event.touches[1].clientY);
                this.distance = Math.max(7, Math.min(400, this.distance * (pinch / d)));
                pinch = d;
                this.transition = null;
                this.place();
                event.preventDefault();
            }
        }, { passive: false });
        canvas.addEventListener('touchend', () => { pinch = null; }, { passive: true });
    }

    setFence(group) {
        if (this.fence) {
            this.world.remove(this.fence);
            this.fence.traverse((object) => object.geometry?.dispose?.());
        }
        this.fence = group;
        this.world.add(group);
        this.dirty = true;
    }

    view({ target, distance, azimuth, polar }) {
        this.transition = { target: new Vector3(...target), distance, azimuth, polar };
        this.dirty = true;
    }

    resize(width, height) {
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        this.renderer.setSize(width, height, false);
        this.camera.aspect = width / Math.max(1, height);
        this.camera.updateProjectionMatrix();
        this.dirty = true;
    }

    // Renders only when something changed, so an idle view costs nothing on a phone.
    frame() {
        if (this.transition) {
            const t = this.transition;
            const k = 0.12;
            this.target.lerp(t.target, k);
            this.distance += (t.distance - this.distance) * k;
            this.azimuth += (t.azimuth - this.azimuth) * k;
            this.polar += (t.polar - this.polar) * k;
            const done = Math.abs(t.distance - this.distance) < 0.4 && this.target.distanceTo(t.target) < 0.4
                && Math.abs(t.azimuth - this.azimuth) < 0.01 && Math.abs(t.polar - this.polar) < 0.01;
            if (done) {
                this.transition = null;
            }
            this.place();
        }
        if (this.dirty) {
            this.dirty = false;
            this.renderer.render(this.scene, this.camera);
        }
    }

    dispose() {
        // dispose() does not free the WebGL context, and browsers allow only ~16 of them.
        this.scene.traverse((object) => {
            object.geometry?.dispose?.();
            const materials = Array.isArray(object.material) ? object.material : object.material ? [object.material] : [];
            for (const material of materials) {
                material.map?.dispose?.();
                material.alphaMap?.dispose?.();
                material.dispose();
            }
        });
        this.renderer.dispose();
        this.renderer.getContext?.()?.getExtension?.('WEBGL_lose_context')?.loseContext();
    }
}

/* ── window ──────────────────────────────────────────────────────────────── */

const MARKUP = `
    <div class="pm3d-box" role="dialog" aria-modal="true" aria-labelledby="pm3dTitle">
        <header class="pm3d-top">
            <div>
                <span class="wfs-eyebrow">3D view</span>
                <h2 class="wfs-display" id="pm3dTitle">Your fence on your property</h2>
            </div>
            <button type="button" class="pm3d-close" data-pm3d="close" aria-label="Close 3D view">&times;</button>
        </header>
        <div class="pm3d-stage">
            <canvas></canvas>
            <p class="pm3d-status" data-pm3d="status">Building your property…</p>
        </div>
        <footer class="pm3d-bottom">
            <div class="pm3d-views" role="group" aria-label="Camera">
                <button type="button" class="pm-tool is-active" data-view="outside">Outside</button>
                <button type="button" class="pm-tool" data-view="top">From above</button>
                <button type="button" class="pm-tool" data-view="close">Close up</button>
            </div>
            <div class="pm3d-colors" role="group" aria-label="Fence color" data-pm3d="colors"></div>
            <p class="pm3d-note" data-pm3d="note"></p>
        </footer>
    </div>`;

let current = null;

function close() {
    if (!current) {
        return;
    }
    cancelAnimationFrame(current.loop);
    current.observer?.disconnect();
    current.viewer?.dispose();
    current.overlay.remove();
    document.removeEventListener('keydown', current.onKey);
    document.documentElement.classList.remove('pm3d-open');
    current = null;
}

/**
 * Opens the 3D view.
 * @param project   the map project (store.toJSON())
 * @param materials the fence configuration slots ({ slot, code, label, fields })
 * @param fetchScene async (project) => { house } from POST /property-map/scene
 */
export async function open({ project, materials, fetchScene }) {
    close();
    const overlay = document.createElement('div');
    overlay.className = 'pm3d';
    overlay.innerHTML = MARKUP;
    document.body.appendChild(overlay);
    document.documentElement.classList.add('pm3d-open');

    const onKey = (event) => { if (event.key === 'Escape') { close(); } };
    document.addEventListener('keydown', onKey);
    current = { overlay, onKey, loop: 0 };
    const session = current;

    const status = overlay.querySelector('[data-pm3d="status"]');
    const note = overlay.querySelector('[data-pm3d="note"]');
    overlay.querySelector('[data-pm3d="close"]').addEventListener('click', close);
    overlay.addEventListener('mousedown', (event) => { if (event.target === overlay) { close(); } });

    let scene;
    try {
        scene = await fetchScene(project);
    } catch (error) {
        console.error(error);
        scene = { house: null };
    }
    if (current !== session) {
        return; // closed while loading
    }

    const toXZ = projector(boundsCenter(project.vertices));
    const points = project.vertices.map((v) => toXZ(v.lat, v.lng));
    const xs = points.map((p) => p[0]);
    const zs = points.map((p) => p[1]);
    const middle = [(Math.max(...xs) + Math.min(...xs)) / 2, (Math.max(...zs) + Math.min(...zs)) / 2];
    const last = points.length - 1;
    const closed = project.runs.some((run) => run.from === last && run.to === 0);

    // Front of the house: toward the widest gate (usually the driveway), else south of the drawing.
    let frontHint = [middle[0], middle[1] + 1000];
    let widest = 0;
    for (const run of project.runs) {
        for (const gate of run.gates || []) {
            if (gate.width_ft > widest) {
                widest = gate.width_ft;
                const a = points[run.from];
                const b = points[run.to];
                frontHint = [a[0] + (b[0] - a[0]) * gate.t, a[1] + (b[1] - a[1]) * gate.t];
            }
        }
    }

    const outline = scene.house?.outline?.length >= 3 ? scene.house.outline.map(([lat, lng]) => toXZ(lat, lng)) : null;
    const footprint = outline ? orientedRectangle(outline) : null;
    const houseRect = footprint || standardHouseRect(points, closed);
    const housePlaced = houseRect
        ? placeHouse(houseRect, footprint ? Math.min(12, scene.house.height_ft || 10) : STANDARD_HOUSE.height, frontHint)
        : null;

    const reach = houseRect ? Math.max(houseRect.width, houseRect.depth) : 0;
    const span = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...zs) - Math.min(...zs), reach, 30);
    const fenceLayout = layout(project, toXZ, housePlaced ? housePlaced.center : middle);

    let viewer;
    try {
        viewer = new Viewer(overlay.querySelector('canvas'), span);
    } catch (error) {
        console.error(error);
        status.textContent = 'This browser cannot show the 3D view.';
        return;
    }
    session.viewer = viewer;

    viewer.world.add(buildSurroundings(middle, span));
    if (housePlaced) {
        viewer.world.add(housePlaced.group);
    }

    const configs = new Map(materials.map((material) => [material.slot, material]));
    const tallest = Math.max(...materials.map((material) => fenceOptions(material).alto), 6);
    if (fenceLayout.walls.length) {
        viewer.world.add(existingWalls(fenceLayout.walls, tallest));
    }

    // Builds every fence slot; colorOverride is the preview color picked in the view.
    let colorOverride = null;
    function buildFence() {
        const group = new Group();
        for (const [slot, part] of fenceLayout.bySlot) {
            const options = fenceOptions(configs.get(slot) || materials[0], colorOverride);
            if (!part.tramos.length && !part.huecos.length) {
                continue;
            }
            const built = Cerca.construir({
                mat: options.mat,
                estilo: options.estilo,
                alto: options.alto,
                color: options.color,
                rieles: options.rieles,
                tramos: part.tramos,
                huecos: part.huecos,
            });
            group.add(built.grupo);
        }
        viewer.setFence(group);
    }
    buildFence();

    // Color chips: the colors of the first fence material (preview only).
    const primary = fenceOptions(materials[0]);
    const colors = overlay.querySelector('[data-pm3d="colors"]');
    colors.innerHTML = (COLOR_CHOICES[primary.mat] || []).map((key) => `
        <button type="button" class="pm3d-swatch ${key === primary.colorKey ? 'is-active' : ''}" data-color="${key}"
            aria-pressed="${key === primary.colorKey}">
            <span style="background:${SWATCHES[key]}"></span>${COLOR_LABELS[key]}
        </button>`).join('');
    colors.addEventListener('click', (event) => {
        const button = event.target.closest('[data-color]');
        if (!button) {
            return;
        }
        colorOverride = button.dataset.color;
        colors.querySelectorAll('[data-color]').forEach((item) => {
            item.classList.toggle('is-active', item === button);
            item.setAttribute('aria-pressed', String(item === button));
        });
        buildFence();
    });

    // A person just outside the first gate, as on the website: the height reference that
    // tells a 4 ft fence from a 6 ft one. The good face of a gate looks outward (-dz, dx).
    const firstGate = [...fenceLayout.bySlot.values()].flatMap((part) => part.huecos)[0];
    if (firstGate) {
        const dx = firstGate.b[0] - firstGate.a[0];
        const dz = firstGate.b[1] - firstGate.a[1];
        const length = Math.hypot(dx, dz) || 1;
        const out = [-dz / length, dx / length];
        const spot = [(firstGate.a[0] + firstGate.b[0]) / 2 + out[0] * 4 + (dx / length) * (length / 2 + 2.5),
            (firstGate.a[1] + firstGate.b[1]) / 2 + out[1] * 4 + (dz / length) * (length / 2 + 2.5)];
        viewer.world.add(Person.crear(spot[0], spot[1], Math.atan2(-out[0], -out[1]), '#ff7133'));
    }

    // Camera presets. "Outside" looks at the front of the house, three-quarters on.
    const facing = housePlaced ? Math.atan2(housePlaced.front[0], housePlaced.front[1]) : 0;
    const closeTarget = firstGate
        ? [(firstGate.a[0] + firstGate.b[0]) / 2, 3, (firstGate.a[1] + firstGate.b[1]) / 2]
        : [points[0][0], 3, points[0][1]];
    const closeFacing = firstGate
        ? Math.atan2(-(firstGate.b[1] - firstGate.a[1]), firstGate.b[0] - firstGate.a[0])
        : facing;
    const views = {
        outside: { target: [middle[0], 4, middle[1]], distance: Math.min(380, Math.max(45, span * 1.45)), azimuth: facing + 0.42, polar: 1.12 },
        top: { target: [middle[0], 0, middle[1]], distance: Math.min(380, Math.max(60, span * 1.7)), azimuth: facing, polar: 0.12 },
        close: { target: closeTarget, distance: 18, azimuth: closeFacing + 0.4, polar: 1.32 },
    };
    Object.assign(viewer, { azimuth: views.outside.azimuth, polar: 1.12, distance: views.outside.distance });
    viewer.target.set(...views.outside.target);
    viewer.place();
    overlay.querySelectorAll('[data-view]').forEach((button) => {
        button.addEventListener('click', () => {
            overlay.querySelectorAll('[data-view]').forEach((item) => item.classList.toggle('is-active', item === button));
            viewer.view(views[button.dataset.view]);
        });
    });

    const stage = overlay.querySelector('.pm3d-stage');
    const measure = () => {
        const rect = stage.getBoundingClientRect();
        viewer.resize(rect.width || 1280, rect.height || 720);
    };
    measure();
    session.observer = new ResizeObserver(measure);
    session.observer.observe(stage);

    const notes = [];
    if (footprint) {
        notes.push('House size and position from public building records; its look is illustrative.');
    } else if (housePlaced) {
        notes.push('We could not find your house in public records, so a standard home is shown.');
    } else {
        notes.push('We could not find your house in public records, so only the fence is shown.');
    }
    notes.push('Colors are a preview; your order keeps the color you chose.');
    note.textContent = notes.join(' ');

    status.remove();
    const loop = () => {
        session.loop = requestAnimationFrame(loop);
        viewer.frame();
    };
    loop();
}

export { close };
