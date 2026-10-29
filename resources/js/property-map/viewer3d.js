/*
 * 3D view of the customer's own property (Phase 2): the satellite image of the lot as
 * the ground, the house raised from its real outline (FEMA USA Structures) with its own
 * roof from the satellite image, and the chosen fence built along the drawn sides with
 * its gates. Loaded on demand (dynamic import) the first time "View in 3D" is pressed.
 *
 * Units are feet. World axes: x east, z south, y up; the origin is the center of the
 * satellite ground image. The fence geometry comes from fence3d/cerca.js, the same
 * builder as the website's 3D viewer, so every material, style and color looks the same.
 * Lighting, sky and camera controls follow that viewer (wfs-design-preview/src-3d/escena.js).
 */
import {
    Scene, PerspectiveCamera, WebGLRenderer, Group, Color, Fog, HemisphereLight, DirectionalLight,
    AmbientLight, Mesh, SphereGeometry, PlaneGeometry, ShapeGeometry, ExtrudeGeometry, Shape,
    MeshBasicMaterial, MeshStandardMaterial, BackSide, CanvasTexture, TextureLoader, PCFSoftShadowMap,
    ACESFilmicToneMapping, SRGBColorSpace, Vector3, PMREMGenerator, BoxGeometry,
} from 'three';
import * as Cerca from './fence3d/cerca.js';
import * as T from './fence3d/texturas.js';
import { COLOR_CHOICES, COLOR_LABELS, SWATCHES, fenceOptions } from './fence-catalog.js';

const FEET_PER_METER = 3.28084;
const METERS_PER_DEGREE_LAT = 110574;
const METERS_PER_DEGREE_LNG = 111320;
const WALL_THICKNESS_FT = 0.7;

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

// Ground: the satellite image at real scale, on a wide apron that fades into the fog. The
// apron takes the average color of the image border so the edge of the photo doesn't show.
function ground(groundInfo, satellite) {
    const group = new Group();
    const apronColor = satellite ? borderColor(satellite.image) : new Color('#8fa266');
    const apron = new Mesh(new PlaneGeometry(3000, 3000), new MeshStandardMaterial({ color: apronColor, roughness: 1 }));
    apron.rotation.x = -Math.PI / 2;
    apron.position.y = -0.05;
    apron.receiveShadow = true;
    group.add(apron);

    if (satellite) {
        const size = groundInfo.size_ft;
        const plane = new Mesh(new PlaneGeometry(size, size), new MeshStandardMaterial({ map: satellite, roughness: 0.95 }));
        plane.rotation.x = -Math.PI / 2;
        plane.receiveShadow = true;
        group.add(plane);
    }
    return group;
}

function borderColor(image) {
    const size = 32;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');
    context.drawImage(image, 0, 0, size, size);
    const { data } = context.getImageData(0, 0, size, size);
    let r = 0;
    let g = 0;
    let b = 0;
    let count = 0;
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            if (x > 1 && x < size - 2 && y > 1 && y < size - 2) {
                continue;
            }
            const i = (y * size + x) * 4;
            r += data[i];
            g += data[i + 1];
            b += data[i + 2];
            count++;
        }
    }
    return new Color(`rgb(${Math.round(r / count)}, ${Math.round(g / count)}, ${Math.round(b / count)})`); // three converts CSS colors from sRGB
}

/*
 * The house: walls raised from the footprint, and the roof as the footprint itself at
 * the top, textured with the same satellite image so the customer sees their own roof.
 */
function house(houseInfo, toXZ, satellite, groundSize) {
    const outline = houseInfo.outline.map(([lat, lng]) => toXZ(lat, lng));
    if (outline.length > 1) {
        const first = outline[0];
        const last = outline[outline.length - 1];
        if (Math.hypot(first[0] - last[0], first[1] - last[1]) < 0.01) {
            outline.pop();
        }
    }
    const height = houseInfo.height_ft || 11;

    // Shape in the XY plane with y = -z; rotating -90° around X stands it on the ground.
    const shape = new Shape(outline.map(([x, z]) => ({ x, y: -z })));
    const walls = new Mesh(
        new ExtrudeGeometry(shape, { depth: height, bevelEnabled: false }),
        new MeshStandardMaterial({ map: T.estuco('#efe7da'), roughness: 0.9 })
    );
    walls.rotation.x = -Math.PI / 2;
    walls.castShadow = true;
    walls.receiveShadow = true;

    const roofGeometry = new ShapeGeometry(shape);
    if (satellite) {
        // UVs from world position, the same mapping as the ground plane.
        const position = roofGeometry.attributes.position;
        const uv = roofGeometry.attributes.uv;
        for (let i = 0; i < position.count; i++) {
            const x = position.getX(i);
            const z = -position.getY(i);
            uv.setXY(i, 0.5 + x / groundSize, 0.5 - z / groundSize);
        }
        uv.needsUpdate = true;
    }
    const roof = new Mesh(
        roofGeometry,
        satellite
            ? new MeshStandardMaterial({ map: satellite, roughness: 0.85 })
            : new MeshStandardMaterial({ color: new Color('#8a7f74'), roughness: 0.85 })
    );
    roof.rotation.x = -Math.PI / 2;
    roof.position.y = height + 0.03;
    roof.receiveShadow = true;

    const group = new Group();
    group.add(walls, roof);
    return { group, outline };
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

function loadTexture(dataUrl) {
    return new Promise((resolve) => {
        if (!dataUrl) {
            resolve(null);
            return;
        }
        new TextureLoader().load(dataUrl, (texture) => {
            texture.colorSpace = SRGBColorSpace;
            texture.anisotropy = 8;
            resolve(texture);
        }, undefined, () => resolve(null));
    });
}

/**
 * Opens the 3D view.
 * @param project   the map project (store.toJSON())
 * @param materials the fence configuration slots ({ slot, code, label, fields })
 * @param fetchScene async (project) => { ground, house } from POST /property-map/scene
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
        scene = { ground: null, house: null };
    }
    if (current !== session) {
        return; // closed while loading
    }

    const origin = scene.ground?.center || boundsCenter(project.vertices);
    const toXZ = projector(origin);
    const satellite = await loadTexture(scene.ground?.image);
    const groundSize = scene.ground?.size_ft || 0;

    let houseInfo = null;
    const parts = [];
    if (scene.house?.outline?.length >= 3) {
        houseInfo = house(scene.house, toXZ, satellite, groundSize);
        parts.push(houseInfo.group);
    }

    const points = project.vertices.map((v) => toXZ(v.lat, v.lng));
    const spanX = Math.max(...points.map((p) => p[0])) - Math.min(...points.map((p) => p[0]));
    const spanZ = Math.max(...points.map((p) => p[1])) - Math.min(...points.map((p) => p[1]));
    const span = Math.max(spanX, spanZ, 30);
    const middle = [
        (Math.max(...points.map((p) => p[0])) + Math.min(...points.map((p) => p[0]))) / 2,
        (Math.max(...points.map((p) => p[1])) + Math.min(...points.map((p) => p[1]))) / 2,
    ];
    const inside = houseInfo
        ? [houseInfo.outline.reduce((s, p) => s + p[0], 0) / houseInfo.outline.length, houseInfo.outline.reduce((s, p) => s + p[1], 0) / houseInfo.outline.length]
        : middle;
    const fenceLayout = layout(project, toXZ, inside);

    let viewer;
    try {
        viewer = new Viewer(overlay.querySelector('canvas'), span);
    } catch (error) {
        console.error(error);
        status.textContent = 'This browser cannot show the 3D view.';
        return;
    }
    session.viewer = viewer;

    viewer.world.add(ground(scene.ground, satellite));
    parts.forEach((part) => viewer.world.add(part));

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

    // Camera presets.
    const firstGate = [...fenceLayout.bySlot.values()].flatMap((part) => part.huecos)[0];
    const closeTarget = firstGate
        ? [(firstGate.a[0] + firstGate.b[0]) / 2, 3, (firstGate.a[1] + firstGate.b[1]) / 2]
        : [points[0][0], 3, points[0][1]];
    const views = {
        outside: { target: [middle[0], 4, middle[1]], distance: Math.min(380, Math.max(45, span * 1.45)), azimuth: 0.42, polar: 1.12 },
        top: { target: [middle[0], 0, middle[1]], distance: Math.min(380, Math.max(60, span * 1.7)), azimuth: 0, polar: 0.12 },
        close: { target: closeTarget, distance: 18, azimuth: 0.6, polar: 1.32 },
    };
    Object.assign(viewer, { azimuth: 0.42, polar: 1.12, distance: views.outside.distance });
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
    if (!satellite) {
        notes.push('Satellite image not available.');
    }
    notes.push(houseInfo
        ? 'House shape from public building records.'
        : 'We could not find the outline of the house, so only the fence is shown.');
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
