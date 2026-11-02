/*
 * 3D view of the customer's property (Phase 2): the customer's house, shaped, sized and
 * turned like the real one (footprint from FEMA USA Structures), on a lot built like an
 * architectural model (lawn, driveway, walkway, sidewalk and street, palms), with the
 * chosen fence built along the drawn sides with its gates. Loaded on demand the first
 * time "View in 3D" is pressed.
 *
 * Lighting comes from a generated sky (PMREM, no HDRI file) and the textures are drawn on
 * canvases. The ground is the real satellite photo when the server can provide it
 * (GET /property-map/ground), mapped at its true Web Mercator scale; otherwise a noise
 * shader lawn.
 *
 * Units are feet. World axes: x east, z south, y up; the origin is the middle of the
 * drawing. The fence geometry comes from fence3d/cerca.js, the same builder as the
 * website's 3D viewer, so every material, style and color looks the same. The house and
 * the lot are built in the house's own frame (house3d.js, site3d.js) and placed together.
 */
import {
    Scene, PerspectiveCamera, WebGLRenderer, Group, Color, FogExp2, HemisphereLight, DirectionalLight,
    Mesh, SphereGeometry, PlaneGeometry, MeshBasicMaterial, MeshStandardMaterial, ShaderMaterial, BackSide,
    PCFSoftShadowMap, ACESFilmicToneMapping, SRGBColorSpace, Vector3, Box3, PMREMGenerator, BoxGeometry,
    OrthographicCamera, CanvasTexture, ClampToEdgeWrapping,
} from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import * as Cerca from './fence3d/cerca.js';
import * as T from './fence3d/texturas.js';
import * as Person from './fence3d/persona.js';
import { planHouse, buildHouse, withRoofColor, pointInPolygon } from './house3d.js';
import { buildSite, lotBounds } from './site3d.js';
import { COLOR_CHOICES, COLOR_LABELS, SWATCHES, fenceOptions } from './fence-catalog.js';

const FEET_PER_METER = 3.28084;
const METERS_PER_DEGREE_LAT = 110574;
const METERS_PER_DEGREE_LNG = 111320;
const WALL_THICKNESS_FT = 0.7;
// The website viewer's standard home, used when the real footprint is not found.
const STANDARD_HOUSE = { width: 48, depth: 34, height: 11 };
// Mid-afternoon Florida sun, from the south-west.
const SUN_DIRECTION = new Vector3(-0.42, 0.8, 0.43).normalize();
// The "Outside" camera stands this far around to the right of the way it faces (the house
// front or the yard), 20 degrees above the ground.
const VIEW_ANGLE = 0.5;
const OUTSIDE_POLAR = ((90 - 20) * Math.PI) / 180;
const FOV_DEGREES = 42;
const SKY = { zenith: '#5c9ad6', horizon: '#d8e7f2', below: '#c6d0d8', fog: '#dce6ed' };
// Static Maps image: 640 logical pixels (1280 at scale 2) on each side.
const GROUND_PIXELS = 640;

/* ── coordinates ─────────────────────────────────────────────────────────── */

function projector(origin) {
    const cosLat = Math.cos((origin.lat * Math.PI) / 180);
    return (lat, lng) => [
        (lng - origin.lng) * METERS_PER_DEGREE_LNG * cosLat * FEET_PER_METER,
        (origin.lat - lat) * METERS_PER_DEGREE_LAT * FEET_PER_METER,
    ];
}

// Inverse of projector(): [x, z] in feet back to { lat, lng }.
function unprojector(origin) {
    const cosLat = Math.cos((origin.lat * Math.PI) / 180);
    return ([x, z]) => ({
        lat: origin.lat - z / (METERS_PER_DEGREE_LAT * FEET_PER_METER),
        lng: origin.lng + x / (METERS_PER_DEGREE_LNG * cosLat * FEET_PER_METER),
    });
}

// Web Mercator pixel coordinates of a point at a zoom level (256 px tiles), as Google uses.
function mercator(lat, lng, zoom) {
    const size = 256 * 2 ** zoom;
    const sin = Math.sin((lat * Math.PI) / 180);
    return [((lng + 180) / 360) * size, (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * size];
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

// Clean gradient sky behind the lot: blue overhead, pale at the horizon, soft haze below.
function backdrop() {
    const material = new ShaderMaterial({
        uniforms: {
            zenith: { value: new Color(SKY.zenith) },
            horizon: { value: new Color(SKY.horizon) },
            below: { value: new Color(SKY.below) },
        },
        vertexShader: /* glsl */ `
            varying vec3 vDirection;
            void main() {
                vDirection = normalize(position);
                vec4 clip = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                gl_Position = clip.xyww;
            }`,
        fragmentShader: /* glsl */ `
            uniform vec3 zenith;
            uniform vec3 horizon;
            uniform vec3 below;
            varying vec3 vDirection;
            void main() {
                float h = vDirection.y;
                vec3 color = h > 0.0
                    ? mix(horizon, zenith, pow(smoothstep(0.0, 0.9, h), 0.75))
                    : mix(horizon, below, smoothstep(0.0, 0.4, -h));
                gl_FragColor = vec4(color, 1.0);
                #include <colorspace_fragment>
            }`,
        side: BackSide,
        depthWrite: false,
    });
    const mesh = new Mesh(new SphereGeometry(1500, 32, 16), material);
    mesh.frustumCulled = false;
    mesh.renderOrder = -1;
    return mesh;
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
 * Without a footprint, the standard home goes in the middle of a closed fence, turned
 * like its longest side and made smaller if needed so it stays clear of the fence.
 */
function standardHouseRect(points) {
    if (points.length < 3) return null;
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

/*
 * Without a footprint, an open fence (a U or an L around the back yard) most likely
 * starts and ends on the house: the standard home is set with its back wall on the line
 * between the first and last corner, on the side away from the fenced yard, facing out.
 * A single straight side gets the house set back behind it.
 */
function openFenceHouse(points) {
    const a = points[0];
    const b = points[points.length - 1];
    const gap = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const yardCenter = centroid(points);
    if (points.length >= 3 && gap >= 12) {
        const axis = [(b[0] - a[0]) / gap, (b[1] - a[1]) / gap];
        const middle = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
        let out = [-axis[1], axis[0]];
        if ((yardCenter[0] - middle[0]) * out[0] + (yardCenter[1] - middle[1]) * out[1] > 0) {
            out = [-out[0], -out[1]];
        }
        const width = Math.max(26, Math.min(64, gap));
        const depth = Math.max(28, Math.min(36, width * 0.66));
        return {
            rect: { center: [middle[0] + out[0] * (depth / 2), middle[1] + out[1] * (depth / 2)], width, depth, axis },
            front: out,
        };
    }
    if (points.length >= 3) {
        const rect = standardHouseRect(points);
        if (rect) return { rect, front: null };
    }
    // One side (or a nearly closed shape that fits no house): the house stands behind it.
    let longest = null;
    for (let i = 0; i + 1 < points.length; i++) {
        const length = Math.hypot(points[i + 1][0] - points[i][0], points[i + 1][1] - points[i][1]);
        if (length > 1 && (!longest || length > longest.length)) {
            longest = { length, a: points[i], axis: [(points[i + 1][0] - points[i][0]) / length, (points[i + 1][1] - points[i][1]) / length] };
        }
    }
    if (!longest) return null;
    let out = [-longest.axis[1], longest.axis[0]];
    if (out[1] > 0) out = [-out[0], -out[1]]; // north of the fence, so the fence closes its back yard
    const width = Math.max(30, Math.min(56, longest.length * 0.8));
    const depth = STANDARD_HOUSE.depth;
    const middle = [longest.a[0] + (longest.axis[0] * longest.length) / 2, longest.a[1] + (longest.axis[1] * longest.length) / 2];
    // The back wall 18 ft from the fence; the house faces away from it.
    const setBack = 18 + depth / 2;
    return {
        rect: { center: [middle[0] + out[0] * setBack, middle[1] + out[1] * setBack], width, depth, axis: longest.axis },
        front: out,
    };
}

function centroid(points) {
    return [points.reduce((s, p) => s + p[0], 0) / points.length, points.reduce((s, p) => s + p[1], 0) / points.length];
}

/*
 * The direction the front of the house faces: the side of its rectangle closest to
 * `hint`. A long side is preferred; an end only wins when the hint points almost straight
 * at it.
 */
function facadeDirection(rect, hint) {
    const u = rect.axis;
    const v = [-u[1], u[0]];
    const du = hint[0] * u[0] + hint[1] * u[1];
    const dv = hint[0] * v[0] + hint[1] * v[1];
    if (Math.abs(du) > 0.85) return du > 0 ? u : [-u[0], -u[1]];
    return dv >= 0 ? v : [-v[0], -v[1]];
}

/*
 * Local frame of the house: origin at its center, front toward `front`. Objects built in
 * it are placed with rotation.y = rotation, and toLocal() turns world [x, z] into it.
 */
function houseFrame(origin, front) {
    const right = [front[1], -front[0]];
    return {
        origin,
        rotation: Math.atan2(front[0], front[1]),
        toWorld: ([x, z]) => [origin[0] + right[0] * x + front[0] * z, origin[1] + right[1] * x + front[1] * z],
        toLocal: ([x, z]) => {
            const dx = x - origin[0];
            const dz = z - origin[1];
            return [dx * right[0] + dz * right[1], dx * front[0] + dz * front[1]];
        },
    };
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

/* ── satellite ground ────────────────────────────────────────────────────── */

/*
 * Satellite photo for the ground, centered on the model lot, at the highest zoom whose
 * image covers the lot within its middle 92% (Google's logo and credits run along the
 * bottom edge). Every point maps to the photo through its own latitude and longitude in
 * Web Mercator, so the photo keeps its true proportions.
 *
 * Returns { texture, uvOf(world), plantable(world), roofColor(outline) } or null when
 * there is no photo (no URL, an error, or a lot too big).
 */
async function loadGround({ url, unproject, corners }) {
    if (!url) return null;
    const xs = corners.map((p) => p[0]);
    const zs = corners.map((p) => p[1]);
    const middle = unproject([(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...zs) + Math.max(...zs)) / 2]);
    // The server caches by rounded center; the mapping must use that same center.
    const center = { lat: Math.round(middle.lat * 1e5) / 1e5, lng: Math.round(middle.lng * 1e5) / 1e5 };
    const extentMeters = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...zs) - Math.min(...zs)) / FEET_PER_METER;
    // Meters per logical pixel at zoom z: 156543.03392 * cos(lat) / 2^z.
    const metersPerPixelAtZero = 156543.03392 * Math.cos((center.lat * Math.PI) / 180);
    const zoom = Math.min(20, Math.floor(Math.log2((metersPerPixelAtZero * GROUND_PIXELS * 0.92) / extentMeters)));
    if (zoom < 16) return null;
    const source = url(center.lat, center.lng, zoom);
    if (!source) return null;

    const image = await new Promise((resolve, reject) => {
        const element = new Image();
        element.crossOrigin = 'anonymous';
        const timer = setTimeout(() => reject(new Error('Satellite image timed out')), 9000);
        element.onload = () => { clearTimeout(timer); resolve(element); };
        element.onerror = () => { clearTimeout(timer); reject(new Error('Satellite image failed')); };
        element.src = source;
    });

    const size = image.naturalWidth;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    context.drawImage(image, 0, 0, size, size);
    let pixels = null;
    try {
        pixels = context.getImageData(0, 0, size, size).data;
    } catch {
        pixels = null; // a cross-origin photo without CORS: shown, but not sampled
    }

    const [cx, cy] = mercator(center.lat, center.lng, zoom);
    const uvOf = (point) => {
        const { lat, lng } = unproject(point);
        const [px, py] = mercator(lat, lng, zoom);
        return [0.5 + (px - cx) / GROUND_PIXELS, 0.5 - (py - cy) / GROUND_PIXELS];
    };
    const pixelAt = (point) => {
        const [u, v] = uvOf(point);
        const x = Math.round(u * size);
        const y = Math.round((1 - v) * size);
        if (!pixels || x < 0 || y < 0 || x >= size || y >= size) return null;
        const i = (y * size + x) * 4;
        return [pixels[i], pixels[i + 1], pixels[i + 2]];
    };

    // Ground that can take a planting: colored (grass, soil, sand), not gray paving or roofs.
    const plantable = (point) => {
        let colored = 0;
        let seen = 0;
        for (const dx of [-3, 0, 3]) {
            for (const dz of [-3, 0, 3]) {
                const pixel = pixelAt([point[0] + dx, point[1] + dz]);
                if (!pixel) continue;
                seen++;
                const [r, g, b] = pixel;
                if (Math.max(r, g, b) - Math.min(r, g, b) > 16 && g >= b && (r + g + b) / 3 < 205) colored++;
            }
        }
        return seen === 0 || colored >= seen * 0.6;
    };

    /*
     * Typical roof color inside a footprint (world [x, z] outline): pixels well inside the
     * outline, without the darkest 30% (shadows, vents) and the brightest 5% (glare).
     */
    const roofColor = (outline) => {
        if (!pixels) return null;
        const mid = [outline.reduce((t, p) => t + p[0], 0) / outline.length, outline.reduce((t, p) => t + p[1], 0) / outline.length];
        const inner = outline.map(([x, z]) => [mid[0] + (x - mid[0]) * 0.8, mid[1] + (z - mid[1]) * 0.8]);
        const ox = inner.map((p) => p[0]);
        const oz = inner.map((p) => p[1]);
        const samples = [];
        for (let x = Math.min(...ox); x <= Math.max(...ox); x += 1) {
            for (let z = Math.min(...oz); z <= Math.max(...oz); z += 1) {
                if (!pointInPolygon([x, z], inner)) continue;
                const pixel = pixelAt([x, z]);
                if (pixel) samples.push(pixel);
            }
        }
        if (samples.length < 30) return null;
        samples.sort((a, b) => (a[0] + a[1] + a[2]) - (b[0] + b[1] + b[2]));
        const kept = samples.slice(Math.floor(samples.length * 0.3), Math.ceil(samples.length * 0.95));
        const mean = [0, 1, 2].map((k) => Math.round(kept.reduce((t, pixel) => t + pixel[k], 0) / kept.length));
        return `#${mean.map((c) => c.toString(16).padStart(2, '0')).join('')}`;
    };

    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    texture.wrapS = texture.wrapT = ClampToEdgeWrapping;
    texture.anisotropy = 8;
    return { texture, uvOf, plantable, roofColor };
}

/* ── viewer ──────────────────────────────────────────────────────────────── */

class Viewer {
    constructor(canvas, span) {
        this.canvas = canvas;
        this.dirty = true;
        this.scene = new Scene();
        this.scene.background = new Color(SKY.horizon);
        // Soft haze that fades the far edge of the lot into the horizon.
        this.scene.fog = new FogExp2(new Color(SKY.fog), 0.34 / Math.max(120, span * 2.4));
        this.scene.add(backdrop());

        this.camera = new PerspectiveCamera(FOV_DEGREES, 16 / 9, 0.5, 3000);
        this.renderer = new WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = PCFSoftShadowMap;
        this.renderer.toneMapping = ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.05;
        this.renderer.outputColorSpace = SRGBColorSpace;

        // Warm sun plus sky/grass bounce. The shadow box is fitted to the house and fence
        // (fitShadows), so the map's resolution goes where the shadows are.
        const sun = new DirectionalLight(0xfff4e0, 2.6);
        sun.position.copy(SUN_DIRECTION).multiplyScalar(200);
        sun.castShadow = true;
        const touch = window.matchMedia?.('(pointer: coarse)').matches;
        sun.shadow.mapSize.set(touch ? 1024 : 2048, touch ? 1024 : 2048);
        sun.shadow.bias = -0.0002;
        sun.shadow.normalBias = 0.05;
        this.sun = sun;
        this.scene.add(sun, sun.target, new HemisphereLight(0xddeeff, 0x7a9a55, 0.55));

        // Image-based lighting from a physical sky rendered once into a PMREM: vinyl,
        // aluminum, wood and glass get natural reflections with no HDRI download.
        const pmrem = new PMREMGenerator(this.renderer);
        const environment = new Scene();
        const sky = new Sky();
        sky.scale.setScalar(1000);
        const skyUniforms = sky.material.uniforms;
        skyUniforms.turbidity.value = 3.2;
        skyUniforms.rayleigh.value = 1.4;
        skyUniforms.mieCoefficient.value = 0.004;
        skyUniforms.mieDirectionalG.value = 0.8;
        skyUniforms.sunPosition.value.copy(SUN_DIRECTION);
        environment.add(sky);
        const floor = new Mesh(new PlaneGeometry(4000, 4000), new MeshBasicMaterial({ color: new Color('#7a9a55') }));
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -5;
        environment.add(floor);
        this.scene.environment = pmrem.fromScene(environment, 0.03, 0.1, 3000).texture;
        this.scene.environmentIntensity = 0.6;
        pmrem.dispose();
        environment.traverse((object) => {
            object.geometry?.dispose();
            object.material?.dispose();
        });

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

    // Fits the sun's shadow box to the objects that cast shadows, seen from the sun.
    fitShadows(objects) {
        const box = new Box3();
        for (const object of objects) {
            object.updateWorldMatrix(true, true);
            box.expandByObject(object);
        }
        if (box.isEmpty()) {
            return;
        }
        const center = box.getCenter(new Vector3());
        const radius = box.getSize(new Vector3()).length() / 2;
        this.sun.target.position.copy(center);
        this.sun.position.copy(center).addScaledVector(SUN_DIRECTION, radius + 60);
        this.sun.updateMatrixWorld();
        this.sun.target.updateMatrixWorld();

        // The shadow camera looks from the sun at the target, like this one.
        const eye = new OrthographicCamera();
        eye.position.copy(this.sun.position);
        eye.lookAt(center);
        eye.updateMatrixWorld();
        const inLight = new Box3();
        for (const x of [box.min.x, box.max.x]) {
            for (const y of [box.min.y, box.max.y]) {
                for (const z of [box.min.z, box.max.z]) {
                    inLight.expandByPoint(new Vector3(x, y, z).applyMatrix4(eye.matrixWorldInverse));
                }
            }
        }
        const pad = 2;
        Object.assign(this.sun.shadow.camera, {
            left: inLight.min.x - pad,
            right: inLight.max.x + pad,
            bottom: inLight.min.y - pad,
            top: inLight.max.y + pad,
            near: Math.max(0.5, -inLight.max.z - pad),
            far: -inLight.min.z + pad,
        });
        this.sun.shadow.camera.updateProjectionMatrix();
        this.dirty = true;
    }

    view({ target, distance, azimuth, polar }) {
        this.transition = { target: new Vector3(...target), distance, azimuth, polar };
        this.dirty = true;
    }

    resize(width, height) {
        // Capped: past 1.75 phones pay a lot of fill rate for little visible gain.
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
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
 * @param groundUrl  (lat, lng, zoom) => URL of the satellite photo for the ground, or null
 *                   for the drawn lawn
 */
export async function open({ project, materials, fetchScene, groundUrl = null }) {
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

    const origin = boundsCenter(project.vertices);
    const toXZ = projector(origin);
    const points = project.vertices.map((v) => toXZ(v.lat, v.lng));
    const xs = points.map((p) => p[0]);
    const zs = points.map((p) => p[1]);
    const middle = [(Math.max(...xs) + Math.min(...xs)) / 2, (Math.max(...zs) + Math.min(...zs)) / 2];
    const last = points.length - 1;
    const closed = project.runs.some((run) => run.from === last && run.to === 0);

    // The widest gate (usually the driveway gate).
    let widestGate = null;
    for (const run of project.runs) {
        for (const gate of run.gates || []) {
            if (!widestGate || gate.width_ft > widestGate.width) {
                const a = points[run.from];
                const b = points[run.to];
                widestGate = { at: [a[0] + (b[0] - a[0]) * gate.t, a[1] + (b[1] - a[1]) * gate.t], width: gate.width_ft };
            }
        }
    }

    /*
     * Where the front of the house faces: with the house inside a closed fence, toward the
     * widest gate (else south); with the house outside the fenced area, away from the yard.
     */
    const yardCenter = centroid(points);
    const frontHint = (center) => {
        const insideYard = closed && pointInPolygon(center, points);
        const toward = insideYard
            ? (widestGate ? [widestGate.at[0] - center[0], widestGate.at[1] - center[1]] : [0, 1])
            : [center[0] - yardCenter[0], center[1] - yardCenter[1]];
        const length = Math.hypot(toward[0], toward[1]);
        return length > 1 ? [toward[0] / length, toward[1] / length] : [0, 1];
    };

    const outline = scene.house?.outline?.length >= 3 ? scene.house.outline.map(([lat, lng]) => toXZ(lat, lng)) : null;
    const footprint = outline ? orientedRectangle(outline) : null;
    let site = null;
    if (footprint) {
        site = { rect: footprint, front: null };
    } else if (closed) {
        const rect = standardHouseRect(points);
        site = rect ? { rect, front: null } : null;
    } else if (points.length >= 2) {
        site = openFenceHouse(points);
    }
    if (site && !site.front) {
        site.front = facadeDirection(site.rect, frontHint(site.rect.center));
    }

    // The house's frame; without a house, the lot is laid out around the drawing, facing south.
    const frame = houseFrame(site ? site.rect.center : middle, site ? site.front : [0, 1]);
    const seed = Math.floor(Math.abs(project.vertices[0].lat * 1e5) + Math.abs(project.vertices[0].lng * 1e5)) % 2147483647;
    const gate = widestGate ? { at: frame.toLocal(widestGate.at), width: widestGate.width } : null;
    let plan = null;
    if (site) {
        // The rectangle's long side is its width; it is the facade unless the house faces an end.
        const facesLongSide = Math.abs(site.front[0] * site.rect.axis[0] + site.front[1] * site.rect.axis[1]) < 0.5;
        plan = planHouse({
            width: facesLongSide ? site.rect.width : site.rect.depth,
            depth: facesLongSide ? site.rect.depth : site.rect.width,
            outline: outline ? outline.map(frame.toLocal) : null,
            height: footprint ? scene.house.height_ft || STANDARD_HOUSE.height : STANDARD_HOUSE.height,
            seed,
            // The garage goes on the side of the widest gate, where the driveway is.
            garageSide: gate && Math.abs(gate.at[0]) > 4 ? Math.sign(gate.at[0]) : (seed % 2 ? 1 : -1),
            occupancy: footprint ? scene.house.occupancy : null,
        });
    }

    const reach = site ? Math.max(site.rect.width, site.rect.depth) : 0;
    const span = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...zs) - Math.min(...zs), reach, 30);
    const fenceLayout = layout(project, toXZ, site ? site.rect.center : middle);

    let viewer;
    try {
        viewer = new Viewer(overlay.querySelector('canvas'), span);
    } catch (error) {
        console.error(error);
        status.textContent = 'This browser cannot show the 3D view.';
        return;
    }
    session.viewer = viewer;

    /*
     * Where the "Outside" camera stands. With the yard beside or behind the house, it looks
     * from the yard back toward the house, so the building does not hide the fence; with
     * the house inside the fence, from the street, three-quarters on. Trees keep out of
     * that line of sight.
     */
    const houseOutsideYard = site && points.length >= 3 && !pointInPolygon(site.rect.center, points);
    const outsideAzimuth = houseOutsideYard
        ? Math.atan2(yardCenter[0] - site.rect.center[0], yardCenter[1] - site.rect.center[1]) + VIEW_ANGLE * 0.7
        : frame.rotation + VIEW_ANGLE;

    const localPoints = points.map(frame.toLocal);
    const fence = {
        segments: project.runs.filter((run) => points[run.from] && points[run.to]).map((run) => [localPoints[run.from], localPoints[run.to]]),
        points: localPoints,
        // The fenced yard; an open fence is closed by the line between its ends.
        yard: localPoints.length >= 3 ? localPoints : null,
    };

    // Satellite ground under the whole lot; the roof takes its color from the photo.
    const board = lotBounds({ plan, fence });
    let ground = null;
    if (groundUrl) {
        status.textContent = 'Loading the satellite view…';
        try {
            ground = await loadGround({
                url: groundUrl,
                unproject: unprojector(origin),
                corners: [[board.x0, board.z0], [board.x1, board.z0], [board.x0, board.z1], [board.x1, board.z1]].map(frame.toWorld),
            });
        } catch (error) {
            console.warn(error);
        }
        if (current !== session) {
            return;
        }
    }
    const roofColor = ground && outline ? ground.roofColor(outline) : null;
    if (plan && roofColor) {
        plan = withRoofColor(plan, roofColor);
    }

    // House and lot, built in the house's frame and placed together.
    const estate = new Group();
    estate.rotation.y = frame.rotation;
    estate.position.set(frame.origin[0], 0, frame.origin[1]);
    const house = plan ? buildHouse(plan) : null;
    if (house) {
        estate.add(house);
    }
    const lot = buildSite({
        plan,
        fence,
        gate: gate ? { x: gate.at[0], z: gate.at[1], width: gate.width } : null,
        seed,
        view: outsideAzimuth - frame.rotation,
        ground: ground && {
            texture: ground.texture,
            uvOf: (point) => ground.uvOf(frame.toWorld(point)),
            plantable: (point) => ground.plantable(frame.toWorld(point)),
        },
    });
    estate.add(lot.group);
    viewer.world.add(estate);

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
    viewer.fitShadows([house, viewer.fence, ...lot.casters].filter(Boolean));

    // Camera presets. "Outside" looks at the front of the house, three-quarters on.
    const facing = frame.rotation;
    const closeTarget = firstGate
        ? [(firstGate.a[0] + firstGate.b[0]) / 2, 3, (firstGate.a[1] + firstGate.b[1]) / 2]
        : [points[0][0], 3, points[0][1]];
    const closeFacing = firstGate
        ? Math.atan2(-(firstGate.b[1] - firstGate.a[1]), firstGate.b[0] - firstGate.a[0])
        : facing;
    /*
     * "Outside": a low, three-quarter view framed tight on the fence and the house beside
     * it (sized to fit their width in the view); "top": the whole model lot straight down.
     */
    const houseCorners = plan
        ? [[plan.bounds.x0, plan.bounds.z0], [plan.bounds.x1, plan.bounds.z0], [plan.bounds.x0, plan.bounds.z1], [plan.bounds.x1, plan.bounds.z1]].map(frame.toWorld)
        : [];
    const focus = points.concat(houseCorners);
    const fx = focus.map((p) => p[0]);
    const fz = focus.map((p) => p[1]);
    const focusCenter = [(Math.min(...fx) + Math.max(...fx)) / 2, (Math.min(...fz) + Math.max(...fz)) / 2];
    const focusRadius = Math.hypot(Math.max(...fx) - Math.min(...fx), Math.max(...fz) - Math.min(...fz)) / 2;
    const halfWidthAngle = Math.atan(Math.tan(((FOV_DEGREES / 2) * Math.PI) / 180) * (16 / 9));
    const boardSize = Math.hypot(board.x1 - board.x0, board.z1 - board.z0);
    const boardCenter = frame.toWorld([(board.x0 + board.x1) / 2, (board.z0 + board.z1) / 2 - (board.z1 - board.z0) * 0.08]);
    const views = {
        outside: {
            target: [focusCenter[0], 3, focusCenter[1]],
            distance: Math.min(390, Math.max(45, (focusRadius / Math.tan(halfWidthAngle)) * 1.25)),
            azimuth: outsideAzimuth,
            polar: OUTSIDE_POLAR,
        },
        top: { target: [boardCenter[0], 0, boardCenter[1]], distance: Math.min(390, Math.max(70, boardSize * 0.98)), azimuth: facing, polar: 0.12 },
        close: { target: closeTarget, distance: 18, azimuth: closeFacing + 0.4, polar: 1.32 },
    };
    Object.assign(viewer, { azimuth: views.outside.azimuth, polar: views.outside.polar, distance: views.outside.distance });
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
        notes.push(plan?.kind === 'flat'
            ? 'Building size and position from public building records; its look is illustrative.'
            : 'House size and position from public building records; its look is illustrative.');
    } else if (plan) {
        notes.push('We could not find your house in public records, so a standard home is shown.');
    } else {
        notes.push('We could not find your house in public records, so only the fence is shown.');
    }
    notes.push('Colors are a preview; your order keeps the color you chose.');
    if (ground) {
        notes.push('Satellite imagery © Google.');
    }
    note.textContent = notes.join(' ');

    status.remove();
    const loop = () => {
        session.loop = requestAnimationFrame(loop);
        viewer.frame();
    };
    loop();
}

export { close };
