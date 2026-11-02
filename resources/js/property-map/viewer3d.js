/*
 * 3D view of the customer's property (Phase 2): the chosen fence, built along the drawn
 * sides with its gates. Loaded on demand the first time "View in 3D" is pressed.
 *
 * Two scenes share the same fence:
 *   - "Outside" and "From above": the real property as the satellite photo on a model
 *     board (site3d.js buildPhotoBoard), mapped point by point at its true scale, with the
 *     fence in 3D on it casting its shadow. The camera stays high (at least 38 degrees
 *     above the ground), where a flat photo still reads as the real place.
 *   - "Close up": the fence on a clean drawn yard (site3d.js buildSite), with the house as
 *     a plain gray volume from its FEMA USA Structures footprint where there is one, so
 *     the fence's posts, panels and gates read sharp and large.
 * Without the photo (no server, as in the static demo) every view uses the drawn yard.
 *
 * Lighting comes from a generated sky (PMREM, no HDRI file) and the textures are drawn on
 * canvases.
 *
 * Units are feet. World axes: x east, z south, y up; the origin is the centroid of the
 * fence's corners (sceneFeet). The fence geometry comes from fence3d/cerca.js, the same
 * builder as the website's 3D viewer, so every material, style and color looks the same.
 */
import {
    Scene, PerspectiveCamera, WebGLRenderer, Group, Color, FogExp2, HemisphereLight, DirectionalLight,
    Mesh, SphereGeometry, PlaneGeometry, MeshBasicMaterial, MeshStandardMaterial, ShaderMaterial, BackSide,
    PCFSoftShadowMap, ACESFilmicToneMapping, SRGBColorSpace, Vector3, Box3, PMREMGenerator, BoxGeometry,
    OrthographicCamera, CanvasTexture, ClampToEdgeWrapping, Shape, Vector2, ExtrudeGeometry,
} from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import * as Cerca from './fence3d/cerca.js';
import * as T from './fence3d/texturas.js';
import * as Person from './fence3d/persona.js';
import { pointInPolygon } from './house3d.js';
import { buildSite, buildPhotoBoard } from './site3d.js';
import { COLOR_CHOICES, COLOR_LABELS, SWATCHES, fenceOptions } from './fence-catalog.js';

const FEET_PER_METER = 1 / 0.3048;
// WGS84, the ellipsoid of the 3D tiles: semi-major axis (m) and eccentricity squared.
const WGS84 = { a: 6378137, e2: 0.00669437999014 };
const WALL_THICKNESS_FT = 0.7;
// Mid-afternoon Florida sun, from the south-west.
const SUN_DIRECTION = new Vector3(-0.42, 0.8, 0.43).normalize();
// The cameras stand this far around to the right of the way they face (toward the house
// from the yard, or north).
const VIEW_ANGLE = 0.5;
const FOV_DEGREES = 42;
const CAMERA_RANGE = { near: 0.5, far: 3000 };
const SKY = { zenith: '#5c9ad6', horizon: '#d8e7f2', below: '#c6d0d8', fog: '#dce6ed' };
// Static Maps image: 640 logical pixels (1280 at scale 2) on each side.
const GROUND_PIXELS = 640;
// The photo board reaches this far (ft) past the fence and the house.
const PHOTO_MARGIN_FT = 40;
// Over the photo the camera stays at least this high: polar angle from straight down
// (0.9 rad: 38 degrees above the ground).
const PHOTO_MAX_POLAR = 0.9;
const PHOTO_OUTSIDE_POLAR = 0.78;
// On the drawn yard it may come down to the ground.
const YARD_MAX_POLAR = 1.52;
const YARD_OUTSIDE_POLAR = ((90 - 20) * Math.PI) / 180;
// An open fence's end this close (ft) to the house's walls is carried on to the wall.
const WALL_REACH_FT = 15;
// The house volume in the close-up: plain gray, one story unless the records say taller.
const MASSING = { wall: '#c9c7c2', roof: '#b4b2ad', story: 11 };

/* ── coordinates ─────────────────────────────────────────────────────────── */

/**
 * The one projection of the 3D view, shared by the fence, the footprint, the satellite
 * photo and the 3D tiles: feet from `origin`, +X east, -Z north (+Z south). The scale is
 * WGS84's at the origin's latitude (radii of curvature along the meridian and the parallel),
 * the same local frame the 3D tiles are re-centered in, so both line up 1:1.
 */
export function sceneFeet(origin) {
    const lat = (origin.lat * Math.PI) / 180;
    const w = 1 - WGS84.e2 * Math.sin(lat) ** 2;
    const perDegree = (meters) => (meters * Math.PI / 180) * FEET_PER_METER;
    const northFeet = perDegree((WGS84.a * (1 - WGS84.e2)) / w ** 1.5);
    const eastFeet = perDegree((WGS84.a / Math.sqrt(w)) * Math.cos(lat));
    return {
        latLngToSceneFeet: (pointLat, pointLng) => [(pointLng - origin.lng) * eastFeet, -(pointLat - origin.lat) * northFeet],
        sceneFeetToLatLng: ([x, z]) => ({ lat: origin.lat - z / northFeet, lng: origin.lng + x / eastFeet }),
    };
}

// Web Mercator pixel coordinates of a point at a zoom level (256 px tiles), as Google uses.
function mercator(lat, lng, zoom) {
    const size = 256 * 2 ** zoom;
    const sin = Math.sin((lat * Math.PI) / 180);
    return [((lng + 180) / 360) * size, (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * size];
}

// The fence's corners' centroid: the scene's origin.
function nodesCentroid(vertices) {
    return {
        lat: vertices.reduce((total, v) => total + v.lat, 0) / vertices.length,
        lng: vertices.reduce((total, v) => total + v.lng, 0) / vertices.length,
    };
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

/* ── house ───────────────────────────────────────────────────────────────── */

function centroid(points) {
    return [points.reduce((s, p) => s + p[0], 0) / points.length, points.reduce((s, p) => s + p[1], 0) / points.length];
}

/*
 * The house as a plain gray volume: its footprint (scene feet) extruded to its height. In
 * the close-up it only shows where the fence stands against the house.
 */
function massing(outline, height) {
    const shape = new Shape(outline.map(([x, z]) => new Vector2(x, -z)));
    const geometry = new ExtrudeGeometry(shape, { depth: height, bevelEnabled: false });
    geometry.rotateX(-Math.PI / 2);
    const mesh = new Mesh(geometry, [
        new MeshStandardMaterial({ color: new Color(MASSING.roof), roughness: 0.9 }),
        new MeshStandardMaterial({ color: new Color(MASSING.wall), roughness: 0.9 }),
    ]);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
}

// The nearest point of an outline's walls to `point`, if within reach (and not on it).
function wallPoint(point, outline, reach) {
    let best = null;
    outline.forEach((a, i) => {
        const b = outline[(i + 1) % outline.length];
        const dx = b[0] - a[0];
        const dz = b[1] - a[1];
        const t = Math.max(0, Math.min(1, ((point[0] - a[0]) * dx + (point[1] - a[1]) * dz) / (dx * dx + dz * dz || 1)));
        const at = [a[0] + dx * t, a[1] + dz * t];
        const distance = Math.hypot(point[0] - at[0], point[1] - at[1]);
        if (!best || distance < best.distance) best = { at, distance };
    });
    return best && best.distance > 0.5 && best.distance <= reach ? best.at : null;
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

/* ── satellite photo ─────────────────────────────────────────────────────── */

/*
 * The satellite photo of an area (scene [x, z] corners) as a texture: centered on it at the
 * highest zoom whose image covers it within its middle 92% (Google's logo and credits run
 * along the bottom edge). Every point maps into it through its own latitude and longitude
 * in Web Mercator, so it never stretches. Null without a photo.
 * Returns { texture, uvOf([x, z]) -> [u, v] }.
 */
async function loadPhoto({ url, unproject, corners }) {
    if (!url) return null;
    const xs = corners.map((p) => p[0]);
    const zs = corners.map((p) => p[1]);
    const middle = unproject([(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...zs) + Math.max(...zs)) / 2]);
    // The server caches by rounded center; the mapping must use that same center.
    const center = { lat: Math.round(middle.lat * 1e5) / 1e5, lng: Math.round(middle.lng * 1e5) / 1e5 };
    const extentMeters = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...zs) - Math.min(...zs), 30) / FEET_PER_METER;
    // Meters per logical pixel at zoom z: 156543.03392 * cos(lat) / 2^z.
    const metersPerPixelAtZero = 156543.03392 * Math.cos((center.lat * Math.PI) / 180);
    const zoom = Math.min(20, Math.floor(Math.log2((metersPerPixelAtZero * GROUND_PIXELS * 0.92) / extentMeters)));
    const source = zoom >= 16 ? url(center.lat, center.lng, zoom) : null;
    if (!source) return null;

    const image = await new Promise((resolve, reject) => {
        const element = new Image();
        element.crossOrigin = 'anonymous';
        const timer = setTimeout(() => reject(new Error('Satellite image timed out')), 9000);
        element.onload = () => { clearTimeout(timer); resolve(element); };
        element.onerror = () => { clearTimeout(timer); reject(new Error('Satellite image failed')); };
        element.src = source;
    });
    const texture = new CanvasTexture(image);
    texture.colorSpace = SRGBColorSpace;
    texture.wrapS = texture.wrapT = ClampToEdgeWrapping;
    texture.anisotropy = 8;

    const [cx, cy] = mercator(center.lat, center.lng, zoom);
    const uvOf = (point) => {
        const { lat, lng } = unproject(point);
        const [px, py] = mercator(lat, lng, zoom);
        return [0.5 + (px - cx) / GROUND_PIXELS, 0.5 - (py - cy) / GROUND_PIXELS];
    };
    return { texture, uvOf };
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

        this.camera = new PerspectiveCamera(FOV_DEGREES, 16 / 9, CAMERA_RANGE.near, CAMERA_RANGE.far);
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
        this.touch = touch;
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
        // The lowest the camera may go (polar angle from straight down).
        this.maxPolar = YARD_MAX_POLAR;

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
                this.polar = Math.max(0.12, Math.min(this.maxPolar, this.polar - dy * 0.005));
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
 * @param project    the map project (store.toJSON())
 * @param materials  the fence configuration slots ({ slot, code, label, fields })
 * @param fetchScene async (project) => { house } from POST /property-map/scene
 * @param groundUrl  (lat, lng, zoom) => URL of the satellite photo for the views from
 *                   above, or null (the drawn yard is used for every view)
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

    // One origin and one projection for the fence, the footprint and the photo.
    const origin = nodesCentroid(project.vertices);
    const { latLngToSceneFeet: toXZ, sceneFeetToLatLng } = sceneFeet(origin);
    const points = project.vertices.map((v) => toXZ(v.lat, v.lng));
    const xs = points.map((p) => p[0]);
    const zs = points.map((p) => p[1]);
    const middle = [(Math.max(...xs) + Math.min(...xs)) / 2, (Math.max(...zs) + Math.min(...zs)) / 2];
    const last = points.length - 1;
    const closed = project.runs.some((run) => run.from === last && run.to === 0);
    const fenceSpan = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...zs) - Math.min(...zs), 20);
    const runs = project.runs.filter((run) => points[run.from] && points[run.to]);
    const segments = runs.map((run) => [points[run.from], points[run.to]]);

    // The house, for the close-up's gray volume and to face the fence's good side out.
    const outline = scene.house?.outline?.length >= 3
        ? scene.house.outline.map(([lat, lng]) => toXZ(lat, lng)).filter((p, i, list) => i === 0 || Math.hypot(p[0] - list[i - 1][0], p[1] - list[i - 1][1]) > 0.3)
        : null;
    const houseCenter = outline ? centroid(outline) : null;
    const fenceLayout = layout(project, toXZ, houseCenter || middle);

    let viewer;
    try {
        viewer = new Viewer(overlay.querySelector('canvas'), fenceSpan + 60);
    } catch (error) {
        console.error(error);
        status.textContent = 'This browser cannot show the 3D view.';
        return;
    }
    session.viewer = viewer;

    const stage = overlay.querySelector('.pm3d-stage');
    const measure = () => {
        const rect = stage.getBoundingClientRect();
        viewer.resize(rect.width || 1280, rect.height || 720);
    };
    measure();
    session.observer = new ResizeObserver(measure);
    session.observer.observe(stage);
    const loop = () => {
        session.loop = requestAnimationFrame(loop);
        viewer.frame();
    };
    loop();

    /*
     * The real property: the satellite photo on a board around the fence and the house.
     * North-up, so the photo's own orientation is kept.
     */
    const covered = points.concat(outline || []);
    const board = {
        x0: Math.min(...covered.map((p) => p[0])) - PHOTO_MARGIN_FT,
        x1: Math.max(...covered.map((p) => p[0])) + PHOTO_MARGIN_FT,
        z0: Math.min(...covered.map((p) => p[1])) - PHOTO_MARGIN_FT,
        z1: Math.max(...covered.map((p) => p[1])) + PHOTO_MARGIN_FT,
    };
    let photo = null;
    if (groundUrl) {
        status.textContent = 'Loading the satellite view…';
        photo = await loadPhoto({
            url: groundUrl,
            unproject: sceneFeetToLatLng,
            corners: [[board.x0, board.z0], [board.x1, board.z1]],
        }).catch((error) => {
            console.warn(error);
            return null;
        });
        if (current !== session) {
            return;
        }
    }
    const photoWorld = photo ? buildPhotoBoard({ board, texture: photo.texture, uvOf: photo.uvOf }) : null;

    /*
     * The drawn yard for the close-up: the fence on a clean lawn, with the house as a plain
     * gray volume where the records have it. No street or driveway is made up.
     */
    const yardWorld = new Group();
    const seed = Math.floor(Math.abs(project.vertices[0].lat * 1e5) + Math.abs(project.vertices[0].lng * 1e5)) % 2147483647;
    // The cameras face the house from the yard when the house is outside it, else north.
    const yardCenter = centroid(points);
    const houseOutsideYard = houseCenter && points.length >= 3 && !pointInPolygon(houseCenter, points);
    const facing = houseOutsideYard
        ? Math.atan2(yardCenter[0] - houseCenter[0], yardCenter[1] - houseCenter[1]) + VIEW_ANGLE * 0.7
        : VIEW_ANGLE;
    const lot = buildSite({
        plan: null,
        fence: { segments, points, yard: points.length >= 3 ? points : null },
        seed,
        view: facing,
        paving: [],
    });
    yardWorld.add(lot.group);
    const house = outline
        ? massing(outline, scene.house.height_ft > 18 ? Math.min(30, scene.house.height_ft) : MASSING.story)
        : null;
    if (house) {
        yardWorld.add(house);
    }
    if (photoWorld) {
        viewer.world.add(photoWorld);
    }
    viewer.world.add(yardWorld);

    const configs = new Map(materials.map((material) => [material.slot, material]));
    const tallest = Math.max(...materials.map((material) => fenceOptions(material).alto), 6);
    if (fenceLayout.walls.length) {
        viewer.world.add(existingWalls(fenceLayout.walls, tallest));
    }

    // An open fence that stops short of the house is carried on to its wall.
    if (outline && !closed && runs.length) {
        for (const [end, run] of [[points[0], runs[0]], [points[last], runs[runs.length - 1]]]) {
            const wall = wallPoint(end, outline, WALL_REACH_FT);
            const part = wall && fenceLayout.bySlot.get(run.material || 1);
            if (part) {
                part.tramos.push({ a: end, b: wall });
            }
        }
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

    /*
     * Camera presets. "Outside" and "From above" look at the real place on the photo (the
     * drawn yard without it); "Close up" brings the fence up close on the drawn yard.
     */
    const scenery = photoWorld ? 'photo' : 'yard';
    const boardSize = Math.hypot(board.x1 - board.x0, board.z1 - board.z0);
    const closeTarget = firstGate
        ? [(firstGate.a[0] + firstGate.b[0]) / 2, 3, (firstGate.a[1] + firstGate.b[1]) / 2]
        : [middle[0], 3, middle[1]];
    const closeFacing = firstGate
        ? Math.atan2(-(firstGate.b[1] - firstGate.a[1]), firstGate.b[0] - firstGate.a[0])
        : facing;
    const views = {
        outside: {
            world: scenery,
            target: [middle[0], 2, middle[1]],
            distance: Math.min(390, Math.max(55, fenceSpan * 1.6)),
            azimuth: facing,
            polar: photoWorld ? PHOTO_OUTSIDE_POLAR : YARD_OUTSIDE_POLAR,
        },
        // Straight down on the whole board, fence and house in frame.
        top: { world: scenery, target: [(board.x0 + board.x1) / 2, 0, (board.z0 + board.z1) / 2], distance: Math.min(390, Math.max(70, boardSize * 0.9)), azimuth: 0, polar: 0.12 },
        close: { world: 'yard', target: closeTarget, distance: 22, azimuth: closeFacing + 0.4, polar: 1.25 },
    };
    // Shows one scene: the photo board or the drawn yard (and the gray house with it).
    const showWorld = (name) => {
        if (photoWorld) {
            photoWorld.visible = name === 'photo';
        }
        yardWorld.visible = name === 'yard';
        viewer.maxPolar = name === 'photo' ? PHOTO_MAX_POLAR : YARD_MAX_POLAR;
        viewer.dirty = true;
    };
    showWorld(views.outside.world);
    Object.assign(viewer, { azimuth: views.outside.azimuth, polar: views.outside.polar, distance: views.outside.distance });
    viewer.target.set(...views.outside.target);
    viewer.place();
    overlay.querySelectorAll('[data-view]').forEach((button) => {
        button.addEventListener('click', () => {
            overlay.querySelectorAll('[data-view]').forEach((item) => item.classList.toggle('is-active', item === button));
            const preset = views[button.dataset.view];
            showWorld(preset.world);
            viewer.view(preset);
        });
    });

    const notes = [];
    if (photoWorld) {
        notes.push('Your fence drawn on the satellite view of your property; the close-up shows it on a sample yard.');
    }
    notes.push('Colors are a preview; your order keeps the color you chose.');
    if (photoWorld) {
        notes.push('Satellite imagery © Google.');
    }
    note.textContent = notes.join(' ');

    status.remove();
}

export { close };
