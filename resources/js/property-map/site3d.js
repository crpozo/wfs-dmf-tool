/*
 * The lot around the house for the 3D view, as an architectural model: a board with
 * rounded corners on a 4.5 ft base (soil, stone and a dark studio plinth), the lawn on
 * top, the sidewalk, curb and street in front, a driveway with control joints from the
 * garage, a curved walkway to the porch, clusters of palms over low shrubs, and soft
 * contact shadows where things meet the ground.
 *
 * Two boards share the same base (buildBoard): buildSite() is the drawn lot for the
 * "Close up" view, and buildPhotoBoard() carries the real satellite photo for the views
 * from above, mapped vertex by vertex so it keeps its true proportions.
 *
 * Works in the house's local coordinates (feet, front toward +z, see house3d.js); the
 * viewer turns and places the whole group like the house.
 */
import {
    Group, Mesh, Shape, ExtrudeGeometry, BoxGeometry, PlaneGeometry, BufferGeometry, Float32BufferAttribute,
    CylinderGeometry, IcosahedronGeometry, SphereGeometry, TubeGeometry, CatmullRomCurve3, InstancedMesh, Object3D,
    MeshStandardMaterial, MeshBasicMaterial, Color, Vector2, Vector3, CanvasTexture, SRGBColorSpace, RepeatWrapping,
    DoubleSide,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import * as T from './fence3d/texturas.js';
import { random, pointInPolygon, buildShrubs } from './house3d.js';

const BOARD_MARGIN = 36;
const BOARD_THICKNESS = 4.5;
const BOARD_BEVEL = 0.4;
// Bands of the board's edge, in feet from its bottom.
const PLINTH_TOP = 1.3;
const STONE_TOP = 2.4;
const FRONT_YARD = 24;
const SIDEWALK = 5;
const PARKWAY = 3;
const STREET = 24;

/* ── shaders ─────────────────────────────────────────────────────────────── */

// 2D simplex noise (Ashima Arts / Stefan Gustavson, MIT) and a 4-octave fBm.
const NOISE_GLSL = /* glsl */ `
vec3 pmMod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 pmMod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 pmPermute(vec3 x) { return pmMod289(((x * 34.0) + 1.0) * x); }
float pmSimplex(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
    vec2 i = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = pmMod289(i);
    vec3 p = pmPermute(pmPermute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
    m = m * m;
    m = m * m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
    vec3 g;
    g.x = a0.x * x0.x + h.x * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
}
float pmFbm(vec2 p) {
    float sum = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 4; i++) {
        sum += amplitude * pmSimplex(p);
        p = p * 2.03 + 17.1;
        amplitude *= 0.5;
    }
    return sum;
}
`;

/*
 * Lawn: the color comes from noise in board coordinates (no texture, so nothing repeats):
 * broad patches of deeper and lighter green, a few drier spots, a fine grain that reads as
 * blades up close, and soft diagonal mowing stripes.
 */
function lawnMaterial() {
    const material = new MeshStandardMaterial({ color: new Color('#6e9a40'), roughness: 0.96, metalness: 0 });
    const uniforms = {
        uLawnDeep: { value: new Color('#4f7d2f') },
        uLawnLight: { value: new Color('#7faa48') },
        uLawnDry: { value: new Color('#a3a85a') },
        uStripeDir: { value: new Vector2(Math.SQRT1_2, Math.SQRT1_2) },
        uStripeWidth: { value: 7.5 },
    };
    material.onBeforeCompile = (shader) => {
        Object.assign(shader.uniforms, uniforms);
        shader.vertexShader = shader.vertexShader
            .replace('#include <common>', '#include <common>\nvarying vec2 vBoard;')
            .replace('#include <begin_vertex>', '#include <begin_vertex>\nvBoard = position.xy;');
        shader.fragmentShader = shader.fragmentShader
            .replace('#include <common>', `#include <common>
varying vec2 vBoard;
uniform vec3 uLawnDeep;
uniform vec3 uLawnLight;
uniform vec3 uLawnDry;
uniform vec2 uStripeDir;
uniform float uStripeWidth;
${NOISE_GLSL}`)
            .replace('#include <color_fragment>', `#include <color_fragment>
{
    vec2 p = vBoard;
    float large = pmFbm(p * 0.017);
    float middle = pmSimplex(p * 0.12 + 31.0);
    float grain = pmSimplex(p * 1.9) * 0.55 + pmSimplex(p * 5.3 + 7.0) * 0.45;
    vec3 grass = mix(uLawnDeep, uLawnLight, smoothstep(-1.0, 1.0, large * 0.8 + middle * 0.15) * 0.7 + 0.15);
    grass = mix(grass, uLawnDry, smoothstep(0.45, 1.0, middle * 0.5 + large * 0.5) * 0.22);
    grass *= 0.94 + 0.08 * grain;
    float stripe = smoothstep(-0.3, 0.3, sin(dot(p, uStripeDir) / uStripeWidth * 3.14159265));
    grass *= mix(0.935, 1.05, stripe);
    diffuseColor.rgb = grass;
}`);
    };
    material.customProgramCacheKey = () => 'pm-lawn';
    return material;
}

/*
 * Board edge: a grass lip, layered soil, a band of stone and, at the bottom, a dark
 * plinth with a light edge, like the base of an architectural model.
 */
function soilMaterial() {
    const material = new MeshStandardMaterial({ color: new Color('#7a5a3c'), roughness: 1 });
    const uniforms = {
        uGrass: { value: new Color('#5e8a37') },
        uSoilA: { value: new Color('#6e4f34') },
        uSoilB: { value: new Color('#8a6845') },
        uStoneA: { value: new Color('#a59a88') },
        uStoneB: { value: new Color('#c7bca9') },
        uBase: { value: new Color('#2b2e32') },
        uBaseEdge: { value: new Color('#9a9fa4') },
        uBevel: { value: BOARD_BEVEL },
        uBaseTop: { value: PLINTH_TOP },
        uStoneTop: { value: STONE_TOP },
        uTop: { value: BOARD_THICKNESS },
    };
    material.onBeforeCompile = (shader) => {
        Object.assign(shader.uniforms, uniforms);
        shader.vertexShader = shader.vertexShader
            .replace('#include <common>', '#include <common>\nvarying vec3 vSoil;')
            .replace('#include <begin_vertex>', '#include <begin_vertex>\nvSoil = position;');
        shader.fragmentShader = shader.fragmentShader
            .replace('#include <common>', `#include <common>
varying vec3 vSoil;
uniform vec3 uGrass;
uniform vec3 uSoilA;
uniform vec3 uSoilB;
uniform vec3 uStoneA;
uniform vec3 uStoneB;
uniform vec3 uBase;
uniform vec3 uBaseEdge;
uniform float uBevel;
uniform float uBaseTop;
uniform float uStoneTop;
uniform float uTop;
${NOISE_GLSL}`)
            .replace('#include <color_fragment>', `#include <color_fragment>
{
    float h = vSoil.z + uBevel;
    float along = vSoil.x + vSoil.y;
    float n = pmSimplex(vec2(along * 0.35, h * 2.5));
    vec3 soil = mix(uSoilA, uSoilB, smoothstep(-0.6, 0.6, n + sin(h * 7.0 + along * 0.05) * 0.3));
    vec2 cell = vec2(along * 0.9, h * 2.6);
    vec3 rock = mix(uStoneA, uStoneB, pmSimplex(floor(cell) * 1.7) * 0.5 + 0.5);
    rock *= 0.82 + 0.18 * smoothstep(0.0, 0.12, min(fract(cell.x), fract(cell.y)));
    vec3 color = mix(rock, soil, smoothstep(uStoneTop - 0.1, uStoneTop + 0.05, h + n * 0.08));
    color = mix(uBase, color, smoothstep(uBaseTop - 0.02, uBaseTop + 0.02, h));
    color = mix(color, uBaseEdge, (1.0 - smoothstep(0.0, 0.05, abs(h - uBaseTop))) * 0.85);
    color = mix(color, uGrass, smoothstep(uTop - 0.32, uTop - 0.2, h));
    diffuseColor.rgb = color;
}`);
    };
    material.customProgramCacheKey = () => 'pm-soil';
    return material;
}

/*
 * Satellite photo on the board. The photo carries its own light, so it is dimmed a little
 * and given a touch more contrast and saturation: the scene's sun and the fence's shadows
 * then sit on it like on real ground.
 */
function satelliteMaterial(texture) {
    const material = new MeshStandardMaterial({ map: texture, roughness: 1, metalness: 0 });
    material.onBeforeCompile = (shader) => {
        shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
{
    vec3 c = diffuseColor.rgb;
    float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
    c = mix(vec3(l), c, 1.15);
    c = max((c - 0.2) * 1.1 + 0.2, 0.0);
    diffuseColor.rgb = c * 0.78;
}`);
    };
    material.customProgramCacheKey = () => 'pm-satellite';
    return material;
}

/* ── textures ────────────────────────────────────────────────────────────── */

function canvas(width, height) {
    const element = document.createElement('canvas');
    element.width = width;
    element.height = height;
    return element;
}

function speckle(g, width, height, count, alpha) {
    for (let i = 0; i < count; i++) {
        const v = Math.random() < 0.5 ? 0 : 255;
        g.fillStyle = `rgba(${v},${v},${v},${Math.random() * alpha})`;
        g.fillRect(Math.random() * width, Math.random() * height, Math.random() < 0.85 ? 1 : 2, Math.random() < 0.85 ? 1 : 2);
    }
}

function texture(element, colored = true) {
    const result = new CanvasTexture(element);
    if (colored) result.colorSpace = SRGBColorSpace;
    result.anisotropy = 8;
    return result;
}

/*
 * Light broom-finished concrete with saw-cut control joints, drawn to the size of the slab
 * (x across, y along) so joints land every `every` feet; `center` adds a joint down the middle.
 */
function paving(widthFt, lengthFt, every, { center = false, across = 0, base = [196, 192, 183] } = {}) {
    const pxPerFt = Math.min(10, 2048 / Math.max(widthFt, lengthFt));
    const w = Math.max(8, Math.round(widthFt * pxPerFt));
    const h = Math.max(8, Math.round(lengthFt * pxPerFt));
    const element = canvas(w, h);
    const g = element.getContext('2d');
    g.fillStyle = `rgb(${base.join(',')})`;
    g.fillRect(0, 0, w, h);
    // Slab-to-slab tone shifts, as poured concrete does.
    const slabs = Math.max(1, Math.round(lengthFt / every));
    for (let i = 0; i < slabs; i++) {
        const k = (Math.random() - 0.5) * 10;
        g.fillStyle = `rgba(${k > 0 ? 255 : 0},${k > 0 ? 255 : 0},${k > 0 ? 255 : 0},${Math.abs(k) / 100})`;
        g.fillRect(0, (i * h) / slabs, w, h / slabs);
    }
    speckle(g, w, h, w * h * 0.12, 0.08);
    g.strokeStyle = 'rgba(70,66,60,0.55)';
    g.lineWidth = Math.max(1, pxPerFt * 0.12);
    for (let i = 1; i < slabs; i++) {
        const y = (i * h) / slabs;
        g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke();
    }
    if (center) {
        g.beginPath(); g.moveTo(w / 2, 0); g.lineTo(w / 2, h); g.stroke();
    }
    if (across) {
        for (let x = across * pxPerFt; x < w - 1; x += across * pxPerFt) {
            g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke();
        }
    }
    // Darker edges where the slab meets the lawn.
    g.strokeStyle = 'rgba(0,0,0,0.12)';
    g.lineWidth = 2;
    g.strokeRect(1, 1, w - 2, h - 2);
    return texture(element);
}

// Tan pavers in a running bond, 1.75 ft each; repeats along the walkway.
function pavers() {
    const n = 256;
    const element = canvas(n, n);
    const g = element.getContext('2d');
    g.fillStyle = '#7d7266';
    g.fillRect(0, 0, n, n);
    const size = n / 2;
    for (let row = 0; row < 2; row++) {
        for (let col = -1; col < 2; col++) {
            const x = col * size + (row % 2) * (size / 2);
            const tone = 188 + Math.random() * 26;
            g.fillStyle = `rgb(${tone | 0},${(tone - 18) | 0},${(tone - 40) | 0})`;
            g.fillRect(x + 3, row * size + 3, size - 6, size - 6);
        }
    }
    speckle(g, n, n, 5000, 0.1);
    const result = texture(element);
    result.wrapS = result.wrapT = RepeatWrapping;
    return result;
}

function asphalt() {
    const n = 256;
    const element = canvas(n, n);
    const g = element.getContext('2d');
    g.fillStyle = '#56595c';
    g.fillRect(0, 0, n, n);
    speckle(g, n, n, 14000, 0.16);
    const result = texture(element);
    result.wrapS = result.wrapT = RepeatWrapping;
    return result;
}

/* ── contact shadows ─────────────────────────────────────────────────────── */

/*
 * Soft dark patches on the grass under walls, fence lines, shrubs and trees, so nothing
 * looks pasted on the lawn. They are cheap decals (no extra render pass): the shadow map
 * gives the cast shadows, these give the occlusion where objects touch the ground.
 */
const SHADOW_Y = 0.03;

function shadowMaterial(map, opacity) {
    return new MeshBasicMaterial({
        map, color: 0x000000, transparent: true, opacity, depthWrite: false, toneMapped: false,
        polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    });
}

function blobTexture() {
    const n = 128;
    const element = canvas(n, n);
    const g = element.getContext('2d');
    const gradient = g.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2);
    gradient.addColorStop(0, 'rgba(0,0,0,1)');
    gradient.addColorStop(0.45, 'rgba(0,0,0,0.55)');
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gradient;
    g.fillRect(0, 0, n, n);
    return texture(element, false);
}

// Across a strip: dark in the middle, clear at the edges; the ends fade too.
function stripTexture() {
    const w = 64;
    const h = 64;
    const element = canvas(w, h);
    const g = element.getContext('2d');
    const image = g.createImageData(w, h);
    for (let y = 0; y < h; y++) {
        const across = Math.exp(-(((y + 0.5) / h - 0.5) ** 2) / 0.035);
        for (let x = 0; x < w; x++) {
            const ends = Math.min(1, Math.min(x + 0.5, w - x - 0.5) / 6);
            image.data[(y * w + x) * 4 + 3] = across * ends * 255;
        }
    }
    g.putImageData(image, 0, 0);
    return texture(element, false);
}

// A blurred rectangle: the occlusion around a building's walls.
function rectangleTexture(width, depth, spread) {
    const n = 256;
    const element = canvas(n, n);
    const g = element.getContext('2d');
    const ix = (spread / (width + spread * 2)) * n;
    const iz = (spread / (depth + spread * 2)) * n;
    g.shadowColor = 'rgba(0,0,0,1)';
    g.shadowBlur = Math.min(ix, iz) * 0.9;
    g.shadowOffsetX = n * 2;
    g.fillStyle = '#000';
    g.fillRect(ix - n * 2, iz, n - ix * 2, n - iz * 2);
    return texture(element, false);
}

function flat(geometry) {
    geometry.rotateX(-Math.PI / 2);
    return geometry;
}

/** Contact shadows in local coordinates. */
function contactShadows({ rects, strips, blobs }) {
    const group = new Group();
    for (const { x0, x1, z0, z1, spread = 3.5, opacity = 0.55 } of rects) {
        const w = x1 - x0 + spread * 2;
        const d = z1 - z0 + spread * 2;
        const mesh = new Mesh(flat(new PlaneGeometry(w, d)), shadowMaterial(rectangleTexture(x1 - x0, z1 - z0, spread), opacity));
        mesh.position.set((x0 + x1) / 2, SHADOW_Y, (z0 + z1) / 2);
        mesh.renderOrder = 1;
        group.add(mesh);
    }
    const dummy = new Object3D();
    if (strips.length) {
        const mesh = new InstancedMesh(flat(new PlaneGeometry(1, 1)), shadowMaterial(stripTexture(), 0.5), strips.length);
        strips.forEach(({ a, b, width }, i) => {
            const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
            dummy.position.set((a[0] + b[0]) / 2, SHADOW_Y, (a[1] + b[1]) / 2);
            dummy.rotation.set(0, Math.atan2(-(b[1] - a[1]), b[0] - a[0]), 0);
            dummy.scale.set(length + 0.8, 1, width);
            dummy.updateMatrix();
            mesh.setMatrixAt(i, dummy.matrix);
        });
        mesh.renderOrder = 1;
        group.add(mesh);
    }
    if (blobs.length) {
        const mesh = new InstancedMesh(flat(new PlaneGeometry(1, 1)), shadowMaterial(blobTexture(), 0.42), blobs.length);
        blobs.forEach(([x, z, radius], i) => {
            dummy.position.set(x, SHADOW_Y + 0.004, z);
            dummy.rotation.set(0, 0, 0);
            dummy.scale.set(radius * 2, 1, radius * 2);
            dummy.updateMatrix();
            mesh.setMatrixAt(i, dummy.matrix);
        });
        mesh.renderOrder = 1;
        group.add(mesh);
    }
    return group;
}

/* ── trees ───────────────────────────────────────────────────────────────── */

// Pinnate frond: a strip that rises, then droops toward the tip, folded along its rib.
function frondGeometry(length, width) {
    const segments = 12;
    const positions = [];
    const uvs = [];
    const indices = [];
    for (let i = 0; i <= segments; i++) {
        const s = i / segments;
        const x = s * length;
        const y = x * 0.38 - x * x * (0.5 / length);
        const half = (width / 2) * Math.sin(Math.PI * (0.06 + 0.94 * s)) ** 0.7;
        const fold = half * 0.35;
        positions.push(x, y - fold, -half, x, y, 0, x, y - fold, half);
        uvs.push(0, s, 0.5, s, 1, s);
        if (i < segments) {
            const k = i * 3;
            indices.push(k, k + 3, k + 1, k + 1, k + 3, k + 4, k + 1, k + 4, k + 2, k + 2, k + 4, k + 5);
        }
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
}

// Curved trunk that narrows toward the top, with a flared base.
function trunkGeometry(points, radius) {
    const curve = new CatmullRomCurve3(points.map(([x, y, z]) => new Vector3(x, y, z)));
    const tubular = 24;
    const radial = 9;
    const geometry = new TubeGeometry(curve, tubular, radius, radial, false);
    const position = geometry.attributes.position;
    const vertex = new Vector3();
    for (let i = 0; i <= tubular; i++) {
        const t = i / tubular;
        const center = curve.getPointAt(t);
        const scale = 1.12 - 0.42 * t + 0.55 * Math.exp(-t * 14);
        for (let j = 0; j <= radial; j++) {
            const index = i * (radial + 1) + j;
            vertex.fromBufferAttribute(position, index).sub(center).multiplyScalar(scale).add(center);
            position.setXYZ(index, vertex.x, vertex.y, vertex.z);
        }
    }
    geometry.computeVertexNormals();
    return { geometry, top: curve.getPointAt(1) };
}

/*
 * Palms (Florida's sabal and royal palms, stylized) and round shade trees. Trunks are
 * merged into one mesh; fronds, canopy puffs and coconuts are instanced.
 */
function buildTrees(list, seed) {
    const rnd = random(seed * 7 + 3);
    const group = new Group();
    const bark = T.corteza().clone();
    bark.needsUpdate = true;
    bark.center.set(0.5, 0.5);
    bark.rotation = Math.PI / 2;
    bark.repeat.set(1, 6);
    const trunkMaterial = new MeshStandardMaterial({ map: bark, roughness: 0.95 });
    const woodMaterial = new MeshStandardMaterial({ color: new Color('#5b4636'), roughness: 0.95 });
    const trunks = [];
    const branches = [];
    const frondMatrices = [];
    const puffMatrices = [];
    const puffColors = [];
    const nutMatrices = [];
    const dummy = new Object3D();
    const shadows = [];

    for (const tree of list) {
        const [x, z] = tree.at;
        if (tree.kind === 'palm') {
            const height = tree.height || 17 + rnd() * 9;
            const lean = 1.5 + rnd() * 3.5;
            const angle = rnd() * Math.PI * 2;
            const lx = Math.cos(angle) * lean;
            const lz = Math.sin(angle) * lean;
            const { geometry, top } = trunkGeometry([
                [x, 0, z], [x + lx * 0.12, height * 0.33, z + lz * 0.12], [x + lx * 0.5, height * 0.68, z + lz * 0.5], [x + lx, height, z + lz],
            ], 0.48);
            trunks.push(geometry);
            const count = 12 + Math.floor(rnd() * 4);
            for (let k = 0; k < count; k++) {
                const upper = k % 3 === 0;
                dummy.position.copy(top);
                dummy.rotation.set(0, (k / count) * Math.PI * 2 + rnd() * 0.35, upper ? 0.25 + rnd() * 0.3 : -0.15 - rnd() * 0.4, 'YZX');
                dummy.scale.setScalar(upper ? 0.72 + rnd() * 0.15 : 0.92 + rnd() * 0.22);
                dummy.updateMatrix();
                frondMatrices.push(dummy.matrix.clone());
            }
            for (let k = 0; k < 4; k++) {
                const a = (k / 4) * Math.PI * 2 + rnd();
                dummy.position.set(top.x + Math.cos(a) * 0.55, top.y - 0.7, top.z + Math.sin(a) * 0.55);
                dummy.rotation.set(0, 0, 0);
                dummy.scale.setScalar(0.42);
                dummy.updateMatrix();
                nutMatrices.push(dummy.matrix.clone());
            }
            shadows.push([x, z, 2.6], [x + lx, z + lz, 7.5]);
        } else {
            const height = tree.height || 15 + rnd() * 6;
            const radius = tree.radius || 7 + rnd() * 3;
            const trunkHeight = height * 0.45;
            const trunk = new CylinderGeometry(0.55, 0.85, trunkHeight, 10);
            trunk.translate(x, trunkHeight / 2, z);
            branches.push(trunk);
            for (let k = 0; k < 3; k++) {
                const a = (k / 3) * Math.PI * 2 + rnd();
                const branch = new CylinderGeometry(0.22, 0.4, radius * 0.8, 6);
                branch.translate(0, radius * 0.4, 0);
                branch.rotateZ(0.75);
                branch.rotateY(a);
                branch.translate(x, trunkHeight * 0.85, z);
                branches.push(branch);
            }
            const center = new Vector3(x, trunkHeight + radius * 0.55, z);
            const puffs = 9 + Math.floor(rnd() * 4);
            for (let k = 0; k < puffs; k++) {
                const a = rnd() * Math.PI * 2;
                const r = k === 0 ? 0 : radius * (0.35 + rnd() * 0.45);
                dummy.position.set(center.x + Math.cos(a) * r, center.y + (rnd() - 0.35) * radius * 0.5, center.z + Math.sin(a) * r);
                dummy.rotation.set(rnd(), rnd(), rnd());
                const size = radius * (k === 0 ? 0.7 : 0.38 + rnd() * 0.22);
                dummy.scale.set(size, size * 0.82, size);
                dummy.updateMatrix();
                puffMatrices.push(dummy.matrix.clone());
                puffColors.push(new Color().setHSL(0.26 + rnd() * 0.04, 0.42 + rnd() * 0.12, 0.27 + rnd() * 0.08));
            }
            shadows.push([x, z, radius * 1.15]);
        }
    }

    const add = (mesh) => {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        group.add(mesh);
    };
    if (trunks.length) add(new Mesh(mergeGeometries(trunks), trunkMaterial));
    if (branches.length) add(new Mesh(mergeGeometries(branches), woodMaterial));
    if (frondMatrices.length) {
        const frondMaterial = new MeshStandardMaterial({
            map: T.frondaHoja(), alphaTest: 0.45, side: DoubleSide, roughness: 0.75, color: new Color('#f2ffe6'),
        });
        const fronds = new InstancedMesh(frondGeometry(9.5, 3.4), frondMaterial, frondMatrices.length);
        frondMatrices.forEach((matrix, i) => fronds.setMatrixAt(i, matrix));
        add(fronds);
        const nuts = new InstancedMesh(new SphereGeometry(1, 10, 8), new MeshStandardMaterial({ color: new Color('#6b5530'), roughness: 0.7 }), nutMatrices.length);
        nutMatrices.forEach((matrix, i) => nuts.setMatrixAt(i, matrix));
        add(nuts);
    }
    if (puffMatrices.length) {
        const puffs = new InstancedMesh(new IcosahedronGeometry(1, 2), new MeshStandardMaterial({ roughness: 0.9 }), puffMatrices.length);
        puffMatrices.forEach((matrix, i) => {
            puffs.setMatrixAt(i, matrix);
            puffs.setColorAt(i, puffColors[i]);
        });
        add(puffs);
    }
    return { group, shadows };
}

/* ── car ─────────────────────────────────────────────────────────────────── */

const CAR_COLORS = ['#f2f2ef', '#b9bdc1', '#2c3e57', '#8e2a2a', '#3b3f44'];

/* A stylized sedan parked at [x, z], nose toward -z (the house). */
function buildCar(x, z, seed) {
    const color = CAR_COLORS[Math.floor(random(seed * 13 + 5)() * CAR_COLORS.length)];
    const paint = new MeshStandardMaterial({ color: new Color(color), roughness: 0.3, metalness: 0.5 });
    const glass = new MeshStandardMaterial({ color: new Color('#1f2a33'), roughness: 0.08, metalness: 0.6 });
    const tire = new MeshStandardMaterial({ color: new Color('#1b1b1b'), roughness: 0.9 });
    const group = new Group();
    const part = (geometry, material, px, py, pz) => {
        const mesh = new Mesh(geometry, material);
        mesh.position.set(px, py, pz);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        group.add(mesh);
        return mesh;
    };
    part(new BoxGeometry(6.1, 1.9, 15), paint, 0, 1.75, 0);
    part(new BoxGeometry(5.5, 1.7, 7.4), glass, 0, 3.5, 0.6);
    part(new BoxGeometry(5.3, 0.25, 6.6), paint, 0, 4.4, 0.7);
    part(new BoxGeometry(5.8, 0.5, 0.3), glass, 0, 2.1, -7.55); // grille
    for (const [wx, wz] of [[-2.85, -4.6], [2.85, -4.6], [-2.85, 4.7], [2.85, 4.7]]) {
        const wheel = part(new CylinderGeometry(1.15, 1.15, 0.8, 16), tire, wx, 1.15, wz);
        wheel.rotation.z = Math.PI / 2;
    }
    group.position.set(x, 0.2, z);
    return group;
}

/* ── layout helpers ──────────────────────────────────────────────────────── */

function distanceToSegment(p, a, b) {
    const dx = b[0] - a[0];
    const dz = b[1] - a[1];
    const lengthSquared = dx * dx + dz * dz;
    const t = lengthSquared ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / lengthSquared)) : 0;
    return Math.hypot(p[0] - a[0] - dx * t, p[1] - a[1] - dz * t);
}

const insideRect = (p, r, margin = 0) => p[0] > r.x0 - margin && p[0] < r.x1 + margin && p[1] > r.z0 - margin && p[1] < r.z1 + margin;

function slab(material, x0, x1, z0, z1, top, thickness = 0.2) {
    const mesh = new Mesh(new BoxGeometry(x1 - x0, thickness, z1 - z0), material);
    mesh.position.set((x0 + x1) / 2, top - thickness / 2, (z0 + z1) / 2);
    mesh.receiveShadow = true;
    return mesh;
}

// Flat ribbon along a curve in the ground plane (the walkway).
function ribbon(points, width, y) {
    const curve = new CatmullRomCurve3(points.map(([x, z]) => new Vector3(x, y, z)));
    const steps = 40;
    const length = curve.getLength();
    const positions = [];
    const uvs = [];
    const indices = [];
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const p = curve.getPointAt(t);
        const tangent = curve.getTangentAt(t);
        const nx = -tangent.z;
        const nz = tangent.x;
        const norm = Math.hypot(nx, nz) || 1;
        positions.push(p.x + (nx / norm) * (width / 2), y, p.z + (nz / norm) * (width / 2));
        positions.push(p.x - (nx / norm) * (width / 2), y, p.z - (nz / norm) * (width / 2));
        uvs.push(0, (t * length) / width, 1, (t * length) / width);
        if (i < steps) {
            const k = i * 2;
            indices.push(k, k + 2, k + 1, k + 1, k + 2, k + 3);
        }
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return { geometry, curve };
}

/* ── site ────────────────────────────────────────────────────────────────── */

/*
 * The model's base: a board with rounded corners on a 4.5 ft plinth, with a soft shadow
 * under it so it sits on the backdrop. `top` is the material of its top face; uvOf([x, z])
 * gives each top vertex its own place in that material's texture (the satellite photo).
 */
function buildBoard(board, top, uvOf = null) {
    const group = new Group();
    // Rounded rectangle extruded down. The shape's y is -z once laid flat.
    const radius = 9;
    const shape = new Shape();
    const [sx0, sx1, sy0, sy1] = [board.x0, board.x1, -board.z1, -board.z0];
    shape.moveTo(sx0 + radius, sy0);
    shape.lineTo(sx1 - radius, sy0);
    shape.quadraticCurveTo(sx1, sy0, sx1, sy0 + radius);
    shape.lineTo(sx1, sy1 - radius);
    shape.quadraticCurveTo(sx1, sy1, sx1 - radius, sy1);
    shape.lineTo(sx0 + radius, sy1);
    shape.quadraticCurveTo(sx0, sy1, sx0, sy1 - radius);
    shape.lineTo(sx0, sy0 + radius);
    shape.quadraticCurveTo(sx0, sy0, sx0 + radius, sy0);
    const depth = BOARD_THICKNESS - BOARD_BEVEL * 2;
    const geometry = new ExtrudeGeometry(shape, {
        depth, bevelEnabled: true, bevelThickness: BOARD_BEVEL, bevelSize: BOARD_BEVEL, bevelSegments: 3, curveSegments: 10,
    });
    if (uvOf) {
        const position = geometry.attributes.position;
        const uv = geometry.attributes.uv;
        for (let i = 0; i < position.count; i++) {
            const [u, v] = uvOf([position.getX(i), -position.getY(i)]);
            uv.setXY(i, u, v);
        }
    }
    const mesh = new Mesh(geometry, [top, soilMaterial()]);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = -(depth + BOARD_BEVEL);
    mesh.receiveShadow = true;
    group.add(mesh);

    const width = board.x1 - board.x0;
    const length = board.z1 - board.z0;
    const under = new Mesh(flat(new PlaneGeometry(width + 36, length + 36)), shadowMaterial(rectangleTexture(width, length, 18), 0.4));
    under.position.set((board.x0 + board.x1) / 2, -BOARD_THICKNESS - 0.05, (board.z0 + board.z1) / 2);
    group.add(under);
    return group;
}

/**
 * The board with the satellite photo on top, for the views from above.
 * @param board   { x0, x1, z0, z1 } in scene feet
 * @param texture the photo
 * @param uvOf    [x, z] -> [u, v]: where a scene point falls in the photo
 */
export function buildPhotoBoard({ board, texture, uvOf }) {
    return buildBoard(board, satelliteMaterial(texture), uvOf);
}

/*
 * Extent of the model lot: the drawing and the house with a margin on every side, and in
 * front the yard, sidewalk, parkway, curb and street. With `street` (the z of the fence run
 * that faces the street), the sidewalk starts just past that run and the curb is 10 ft out.
 */
function layoutLot(plan, fence, street = null, bare = false) {
    const xs = fence.points.map((p) => p[0]);
    const zs = fence.points.map((p) => p[1]);
    if (plan) {
        xs.push(plan.bounds.x0, plan.bounds.x1);
        zs.push(plan.bounds.z0, plan.bounds.z1);
    }
    const houseFront = plan ? plan.bounds.z1 : Math.max(...zs);
    const sidewalk = street !== null ? street + 1.5 : Math.max(houseFront + FRONT_YARD, Math.max(...zs) + 6);
    const curb = sidewalk + SIDEWALK + PARKWAY;
    const streetEnd = curb + 0.6 + STREET;
    let x0 = Math.min(...xs) - BOARD_MARGIN;
    let x1 = Math.max(...xs) + BOARD_MARGIN;
    const widen = Math.max(0, 130 - (x1 - x0)) / 2;
    x0 -= widen;
    x1 += widen;
    // A bare lot (real paving from the scan) has no made-up street in front.
    return {
        xs, zs, houseFront, sidewalk, curb, streetEnd,
        board: { x0, x1, z0: Math.min(...zs) - BOARD_MARGIN, z1: bare ? Math.max(...zs) + BOARD_MARGIN : streetEnd + 0.6 + PARKWAY + 1 },
    };
}

/**
 * The lot, in the house's local coordinates.
 * @param plan    house plan from planHouse(), or null when no house is shown
 * @param fence   { segments: [[a, b]], yard: [[x, z]] or null (the fenced area), points: [[x, z]] }
 * @param gate    the widest gate { x, z, width }, or null
 * @param seed    varies trees and their positions per property
 * @param view    angle (radians, from the front, toward +x) the default camera looks from;
 *                trees stay out of that line of sight
 * From the satellite photo, when it was read (else null):
 * @param street  z of the fence run facing the street
 * @param paved   { x0, x1 } of the real driveway between the house and the street
 * @param trees   [{ at: [x, z], radius, height? }] where the photo or the scan shows trees
 * From the 3D scan, when there is one:
 * @param paving  [{ corners: [[x, z] x 4], light }] the real paving (light: concrete, else
 *                asphalt); the lot then gets no made-up street, sidewalk or driveway
 * @returns { group, casters (objects that cast shadows, for the shadow box), board }
 */
export function buildSite({ plan, fence, gate = null, seed = 1, view = 0, street = null, paved = null, trees: seen = null, paving: real = null }) {
    const group = new Group();
    const { xs, houseFront, sidewalk, curb, streetEnd, board } = layoutLot(plan, fence, street, Boolean(real));
    // With the real paving, the made-up street, sidewalk, driveway and walkway are left out.
    const made = real ? new Group() : group;

    group.add(buildBoard(board, lawnMaterial()));

    // Sidewalk, parkway strip, curb and street across the front of the lot.
    const walkLength = board.x1 - board.x0 - 0.4;
    made.add(slab(new MeshStandardMaterial({ map: paving(walkLength, SIDEWALK, SIDEWALK, { across: 5 }), roughness: 0.9 }),
        board.x0 + 0.2, board.x1 - 0.2, sidewalk, sidewalk + SIDEWALK, 0.24, 0.3));
    const curbMaterial = new MeshStandardMaterial({ color: new Color('#cfcac0'), roughness: 0.85 });
    const road = asphalt();
    road.repeat.set((board.x1 - board.x0) / 18, STREET / 18);
    made.add(slab(curbMaterial, board.x0 + 0.2, board.x1 - 0.2, curb, curb + 0.6, 0.42, 0.6));
    made.add(slab(new MeshStandardMaterial({ map: road, roughness: 0.88 }), board.x0 + 0.2, board.x1 - 0.2, curb + 0.6, streetEnd, 0.06, 0.2));
    made.add(slab(curbMaterial, board.x0 + 0.2, board.x1 - 0.2, streetEnd, streetEnd + 0.6, 0.42, 0.6));

    // Driveway: where the photo shows it, else from the garage door to the street, or from
    // the street to the widest gate.
    let driveway = null;
    if (real) {
        // The real driveway is part of the scanned paving.
    } else if (paved) {
        driveway = { x0: paved.x0, x1: paved.x1, z0: plan ? plan.main.z1 - 1 : sidewalk - 30, z1: curb };
    } else if (plan?.garage) {
        const width = Math.max(plan.garage.doorWidth + 2.5, 11);
        driveway = { x0: plan.garage.x - width / 2, x1: plan.garage.x + width / 2, z0: plan.garage.z, z1: curb };
    } else if (gate && gate.width >= 8 && gate.z < sidewalk - 6 && (!plan || gate.z > plan.main.z1)) {
        driveway = { x0: gate.x - gate.width / 2 - 1, x1: gate.x + gate.width / 2 + 1, z0: gate.z - 1, z1: curb };
    }
    if (driveway) {
        const w = driveway.x1 - driveway.x0;
        const l = driveway.z1 - driveway.z0;
        made.add(slab(new MeshStandardMaterial({ map: paving(w, l, 10, { center: w >= 16 }), roughness: 0.88 }),
            driveway.x0, driveway.x1, driveway.z0, driveway.z1, 0.2, 0.3));
        // Apron flares where it meets the curb.
        made.add(slab(new MeshStandardMaterial({ map: paving(w + 4, PARKWAY, PARKWAY), roughness: 0.88 }),
            driveway.x0 - 2, driveway.x1 + 2, sidewalk + SIDEWALK, curb, 0.21, 0.3));
    }
    // The real driveway has the household's car on it, parked near the house.
    const car = paved && driveway.z1 - driveway.z0 > 22 ? buildCar((driveway.x0 + driveway.x1) / 2, driveway.z0 + 10, seed) : null;
    if (car) {
        group.add(car);
    }

    // The real paving from the scan: flat strips just above the lawn, cut to the board.
    if (real) {
        const inBoard = ([x, z]) => x > board.x0 + 1 && x < board.x1 - 1 && z > board.z0 + 1 && z < board.z1 - 1;
        for (const light of [true, false]) {
            const positions = [];
            for (const strip of real) {
                if (strip.light !== light || !strip.corners.every(inBoard)) continue;
                const [a, b, c, d] = strip.corners;
                positions.push(a[0], 0.08, a[1], c[0], 0.08, c[1], b[0], 0.08, b[1], a[0], 0.08, a[1], d[0], 0.08, d[1], c[0], 0.08, c[1]);
            }
            if (!positions.length) continue;
            const geometry = new BufferGeometry();
            geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
            geometry.computeVertexNormals();
            const mesh = new Mesh(geometry, new MeshStandardMaterial({
                color: new Color(light ? '#cbc7be' : '#5b5e61'), roughness: 0.9, side: DoubleSide,
                polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1,
            }));
            mesh.receiveShadow = true;
            group.add(mesh);
        }
    }

    // Walkway from the porch steps, curving to the driveway (or straight out to the sidewalk).
    let walkway = null;
    if (plan) {
        const start = [plan.door.x, plan.porch.z1 + 1.2];
        let points;
        if (driveway && Math.min(Math.abs(plan.door.x - driveway.x0), Math.abs(plan.door.x - driveway.x1)) < 45
            && (plan.door.x < driveway.x0 || plan.door.x > driveway.x1)) {
            const edge = plan.door.x < driveway.x0 ? driveway.x0 : driveway.x1;
            const zEnd = Math.min(sidewalk - 4, start[1] + Math.max(6, (sidewalk - start[1]) * 0.45));
            points = [start, [start[0], start[1] + 3], [(start[0] + edge) / 2, zEnd - 1.2], [edge + Math.sign(start[0] - edge) * 0.2, zEnd]];
        } else {
            points = [start, [start[0], start[1] + 4], [start[0] + 2.5, (start[1] + sidewalk) / 2 + 2], [start[0] + 1.5, sidewalk + 0.5]];
        }
        const map = pavers();
        const { geometry, curve } = ribbon(points, 3.8, 0.16);
        const mesh = new Mesh(geometry, new MeshStandardMaterial({ map, roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -1 }));
        mesh.receiveShadow = true;
        made.add(mesh);
        walkway = real ? null : curve;
    }

    /*
     * Vegetation in small natural clusters, two or three palms of different heights over
     * low shrubs, by the building's corners and the lot's corners and edges. They stay
     * outside the fenced yard, clear of the fence, house and paving, and out of the default
     * camera's line of sight. Palms are scaled to the building: 18 to 26 ft.
     */
    const rnd = random(seed);
    const front = plan ? plan.bounds : { x0: Math.min(...xs), x1: Math.max(...xs), z0: 0, z1: houseFront };
    const middle = [(front.x0 + front.x1) / 2, (front.z0 + front.z1) / 2];
    const houseSize = plan ? Math.max(plan.main.x1 - plan.main.x0, plan.main.z1 - plan.main.z0) : 40;
    const tall = Math.max(18, Math.min(26, 14 + houseSize * 0.12 + (plan?.kind === 'flat' ? 4 : 0)));
    const walkSamples = walkway ? Array.from({ length: 24 }, (_, i) => walkway.getPointAt(i / 23)) : [];
    // A real tree may stand in the yard; it only has to clear the fence line, house and paving.
    const clearOfBuilt = (p, radius) => {
        if (fence.segments.some(([a, b]) => distanceToSegment(p, a, b) < Math.min(4, radius))) return false;
        if (plan && plan.parts.some((r) => insideRect(p, r, 2))) return false;
        if (driveway && insideRect(p, driveway, 1)) return false;
        return real || p[1] < sidewalk - 2;
    };
    const clear = (p) => {
        if (p[0] < board.x0 + 9 || p[0] > board.x1 - 9 || p[1] < board.z0 + 9 || p[1] > sidewalk - 7) return false;
        if (fence.yard && pointInPolygon(p, fence.yard)) return false;
        if (fence.segments.some(([a, b]) => distanceToSegment(p, a, b) < 9)) return false;
        if (plan && plan.parts.concat([plan.porch]).some((r) => insideRect(p, r, 8))) return false;
        if (driveway && insideRect(p, driveway, 7)) return false;
        return !walkSamples.some((w) => Math.hypot(w.x - p[0], w.z - p[1]) < 7);
    };
    const anchors = [];
    if (plan) {
        const b = plan.bounds;
        for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
            anchors.push({ p: [(sx < 0 ? b.x0 : b.x1) + sx * 11, (sz < 0 ? b.z0 : b.z1) + sz * 11], weight: 1.6 });
        }
    }
    for (const x of [board.x0 + 16, board.x1 - 16]) {
        for (const z of [board.z0 + 16, sidewalk - 11]) {
            anchors.push({ p: [x, z], weight: 1 });
        }
    }
    anchors.push(
        { p: [(board.x0 + board.x1) / 2, board.z0 + 14], weight: 0.6 },
        { p: [board.x0 + 14, (board.z0 + sidewalk) / 2], weight: 0.6 },
        { p: [board.x1 - 14, (board.z0 + sidewalk) / 2], weight: 0.6 },
    );
    const scored = anchors.map((anchor) => {
        const [x, z] = anchor.p;
        const inFront = z > front.z1 && x > front.x0 - 6 && x < front.x1 + 6;
        const bearing = Math.atan2(x - middle[0], z - middle[1]);
        const inSight = Math.abs(Math.atan2(Math.sin(bearing - view), Math.cos(bearing - view))) < 0.6;
        return { ...anchor, score: anchor.weight + rnd() * 0.6 - (inFront ? 1.2 : 0) - (inSight ? 1.5 : 0) };
    }).sort((a, b) => b.score - a.score);
    const wanted = seen ? 0 : rnd() < 0.6 ? 3 : 2;
    const clusters = [];
    for (const anchor of scored) {
        if (clusters.length >= wanted) break;
        // The anchor itself or a spot a few feet around it.
        const spot = [[0, 0], [6, 0], [-6, 0], [0, 6], [0, -6], [6, 6], [-6, -6]]
            .map(([dx, dz]) => [anchor.p[0] + dx, anchor.p[1] + dz])
            .find((p) => clear(p) && !clusters.some((c) => Math.hypot(c.p[0] - p[0], c.p[1] - p[1]) < 30));
        if (spot) clusters.push({ p: spot, weight: anchor.weight });
    }
    const plants = [];
    const bushes = [];
    // Trees where the photo has them: broad canopies as shade trees, small ones as palms.
    const onBoard = ([x, z]) => x > board.x0 + 4 && x < board.x1 - 4 && z > board.z0 + 4 && z < board.z1 - 4;
    for (const { at, radius, height } of seen || []) {
        if (!onBoard(at) || !clearOfBuilt(at, radius)) continue;
        plants.push(radius >= 6
            ? { at, kind: 'oak', radius, height: height || Math.min(34, 6 + radius * 1.6) }
            : { at, kind: 'palm', height: height || Math.max(18, Math.min(26, 14 + radius * 2)) });
    }
    for (const cluster of clusters) {
        const [x, z] = cluster.p;
        if (cluster.weight <= 1 && rnd() < 0.3) {
            plants.push({ at: [x, z], kind: 'oak', height: tall * 0.82 });
        } else {
            const count = rnd() < 0.5 ? 3 : 2;
            const turn = rnd() * Math.PI * 2;
            [1, 0.8, 0.64].slice(0, count).forEach((scale, k) => {
                const r = k === 0 ? 0 : 3.6 + rnd() * 1.4;
                const a = turn + k * 2.3;
                plants.push({ at: [x + Math.cos(a) * r, z + Math.sin(a) * r], kind: 'palm', height: tall * scale });
            });
        }
        const shrubCount = 3 + Math.floor(rnd() * 3);
        for (let k = 0; k < shrubCount; k++) {
            const a = (k / shrubCount) * Math.PI * 2 + rnd() * 0.6;
            const r = 3 + rnd() * 2.5;
            bushes.push([x + Math.cos(a) * r, z + Math.sin(a) * r, 0.9 + rnd() * 0.6]);
        }
    }
    const trees = buildTrees(plants, seed);
    group.add(trees.group);
    const casters = [trees.group, car].filter(Boolean);
    if (bushes.length) {
        const shrubGroup = buildShrubs(bushes);
        group.add(shrubGroup);
        casters.push(shrubGroup);
    }

    // Contact shadows.
    const rects = plan ? plan.parts.map((part) => ({ ...part, spread: 3.5, opacity: 0.6 })) : [];
    if (plan?.acUnit) {
        rects.push({ x0: plan.acUnit[0] - 1.3, x1: plan.acUnit[0] + 1.3, z0: plan.acUnit[1] - 1.3, z1: plan.acUnit[1] + 1.3, spread: 1.2, opacity: 0.5 });
    }
    const strips = fence.segments.map(([a, b]) => ({ a, b, width: 1.9 }));
    const blobs = (plan ? plan.shrubs : []).concat(bushes).map(([x, z, r]) => [x, z, r * 1.7]).concat(trees.shadows);
    if (car) {
        rects.push({ x0: car.position.x - 3.2, x1: car.position.x + 3.2, z0: car.position.z - 7.6, z1: car.position.z + 7.6, spread: 1.4, opacity: 0.55 });
    }
    group.add(contactShadows({ rects, strips, blobs }));

    return { group, casters, board };
}
