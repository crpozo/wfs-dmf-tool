/*
 * The house for the 3D view: a Florida home (stucco, base band, hip tile roofs, framed
 * windows with real sills and crowns, entry porch with columns, garage) sized and shaped
 * like the customer's real house.
 *
 * Two steps, both in local coordinates (feet, centered on the footprint, front face
 * toward +z, x to the right as seen from the street):
 *   planHouse()  turns the footprint into volumes: the main body and, when the outline is
 *                an L, a wing (a garage when it juts out toward the street). A plain
 *                rectangle gets a garage pushed slightly forward at one end. Also places the
 *                entry door, porch and planting beds, which the site needs for its paths.
 *                Commercial buildings and large footprints get a flat roof instead.
 *   buildHouse() builds the geometry from that plan. With a real footprint, the walls are
 *                the footprint's own polygon extruded, with windows and doors on its
 *                real edges; the hip roofs stay on the rectangles of the plan, whose
 *                eaves cover the outline.
 *
 * Small boxes (windows, trims, fascias) are merged per material, so a whole house costs a
 * dozen draw calls instead of a few hundred.
 */
import {
    Group, Mesh, BoxGeometry, CylinderGeometry, SphereGeometry, BufferGeometry, Float32BufferAttribute,
    InstancedMesh, Object3D, MeshStandardMaterial, Color, Vector2, Vector3, Matrix4, Quaternion, CanvasTexture,
    SRGBColorSpace, RepeatWrapping, Shape, Path, ExtrudeGeometry,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import * as T from './fence3d/texturas.js';

export const STORY_FT = 10;
// Roof rise per foot of run (about 5:12, the usual Florida hip roof) and eave overhang.
const PITCH = 0.42;
const OVERHANG = 2;
// An outline that fills less than 88% of its bounding rectangle is split into two volumes.
const SPLIT_THRESHOLD = 0.12;
// Window centers per story, from the floor of that story.
const WINDOW_Y = 5.3;
// Residential hip roofs never rise more than this, so wide houses keep a low, elegant roof.
const MAX_RIDGE_FT = 10;
// FEMA occupancy classes that are built with flat roofs and storefronts.
const FLAT_OCCUPANCY = /commercial|industrial|government|education|assembly|agricultur/i;
const PARAPET_FT = 2.5;
const COMMERCIAL_STORY_FT = 13;

/*
 * Curated Florida palettes: stucco, trims, shutters and roof tile. Picked per property
 * from a seed, so the same address always shows the same house.
 */
const STYLES = [
    { wall: '#ece2cf', base: '#d2c4ab', band: '#f3ecdf', trim: '#fbf8f1', roof: 'terracotta', shutter: '#2f4a5e', door: '#6b4a35', garage: '#f4f0e6' },
    { wall: '#dcc9a8', base: '#c0ad8b', band: '#e8dbc3', trim: '#f6f1e6', roof: 'aged', shutter: '#5a4636', door: '#4f3b2c', garage: '#efe7d8' },
    { wall: '#cdc7bc', base: '#b1aa9c', band: '#ddd8cf', trim: '#ffffff', roof: 'slate', shutter: '#2e3742', door: '#2e3742', garage: '#fbfbf9' },
    { wall: '#f1ede4', base: '#d8d0c1', band: '#f8f5ef', trim: '#ffffff', roof: 'terracotta', shutter: '#5f7560', door: '#7a5238', garage: '#f6f3ec' },
];
// Barrel tile tones: field, shadow, highlight, deep shadow.
const ROOF_TONES = {
    terracotta: ['#a8613f', '#7d4229', '#c2794f', '#6f3a24'],
    aged: ['#80684f', '#5c4838', '#9a8066', '#4d3c2f'],
    slate: ['#6d747c', '#50565d', '#888f96', '#43484e'],
};

// Small deterministic random generator (mulberry32).
export function random(seed) {
    let s = seed >>> 0;
    return () => {
        s = (s + 0x6d2b79f5) >>> 0;
        let t = s;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/* ── footprint ───────────────────────────────────────────────────────────── */

function polygonArea(points) {
    let area = 0;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
        area += (points[j][0] + points[i][0]) * (points[j][1] - points[i][1]);
    }
    return Math.abs(area / 2);
}

export function pointInPolygon(point, polygon) {
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

// Footprint ring without the closing duplicate, near-duplicate corners or straight-through corners.
function cleanRing(points) {
    let ring = points.filter((p, i) => {
        const q = points[(i + 1) % points.length];
        return Math.hypot(q[0] - p[0], q[1] - p[1]) > 0.3;
    });
    ring = ring.filter((p, i) => {
        const a = ring[(i + ring.length - 1) % ring.length];
        const b = ring[(i + 1) % ring.length];
        const cross = (p[0] - a[0]) * (b[1] - p[1]) - (p[1] - a[1]) * (b[0] - p[0]);
        return Math.abs(cross) > 0.05 * Math.hypot(p[0] - a[0], p[1] - a[1]) * Math.hypot(b[0] - p[0], b[1] - p[1]);
    });
    return ring.length >= 3 ? ring : null;
}

// Outward unit normal of each edge (edge i runs from ring[i] to ring[i + 1]).
function edgeNormals(ring) {
    return ring.map((a, i) => {
        const b = ring[(i + 1) % ring.length];
        const length = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
        const normal = [(b[1] - a[1]) / length, -(b[0] - a[0]) / length];
        const probe = [(a[0] + b[0]) / 2 + normal[0] * 0.3, (a[1] + b[1]) / 2 + normal[1] * 0.3];
        return pointInPolygon(probe, ring) ? [-normal[0], -normal[1]] : normal;
    });
}

// The ring with every edge moved outward by d (inward when negative), mitered corners.
function offsetRing(ring, d) {
    const normals = edgeNormals(ring);
    return ring.map((p, i) => {
        const n1 = normals[(i + ring.length - 1) % ring.length];
        const n2 = normals[i];
        const k = 1 + n1[0] * n2[0] + n1[1] * n2[1];
        if (k < 0.2) return [p[0] + n2[0] * d, p[1] + n2[1] * d];
        return [p[0] + ((n1[0] + n2[0]) * d) / k, p[1] + ((n1[1] + n2[1]) * d) / k];
    });
}

/*
 * Splits an L-shaped (or otherwise notched) outline into two rectangles. The outline is
 * rasterized on a ~1 ft grid inside its bounding rectangle; every straight cut across x
 * or z splits the cells in two groups, each covered by its bounding box, and the cut whose
 * two boxes best match the cells wins. Returns [main, wing] or null when one box is as
 * good (a rectangle) or the shape is too irregular to read as two volumes.
 */
function splitFootprint(outline, width, depth) {
    const fill = polygonArea(outline) / (width * depth);
    if (1 - fill <= SPLIT_THRESHOLD) {
        return null;
    }
    const cell = Math.max(0.75, Math.max(width, depth) / 90);
    const nx = Math.max(4, Math.ceil(width / cell));
    const nz = Math.max(4, Math.ceil(depth / cell));
    const cx = width / nx;
    const cz = depth / nz;
    const occupied = [];
    let empty = 0;
    for (let i = 0; i < nx; i++) {
        occupied[i] = [];
        for (let j = 0; j < nz; j++) {
            occupied[i][j] = pointInPolygon([-width / 2 + (i + 0.5) * cx, -depth / 2 + (j + 0.5) * cz], outline);
            if (!occupied[i][j]) empty++;
        }
    }

    // Bounding box (in cells) of the occupied cells for which keep(i, j) holds.
    const boxOf = (keep) => {
        let i0 = Infinity;
        let i1 = -Infinity;
        let j0 = Infinity;
        let j1 = -Infinity;
        for (let i = 0; i < nx; i++) {
            for (let j = 0; j < nz; j++) {
                if (occupied[i][j] && keep(i, j)) {
                    i0 = Math.min(i0, i); i1 = Math.max(i1, i); j0 = Math.min(j0, j); j1 = Math.max(j1, j);
                }
            }
        }
        return i0 === Infinity ? null : { i0, i1, j0, j1 };
    };
    const inBox = (box, i, j) => box && i >= box.i0 && i <= box.i1 && j >= box.j0 && j <= box.j1;

    let best = null;
    for (const axis of ['x', 'z']) {
        const count = axis === 'x' ? nx : nz;
        for (let k = 2; k <= count - 2; k++) {
            const first = boxOf((i, j) => (axis === 'x' ? i : j) < k);
            const second = boxOf((i, j) => (axis === 'x' ? i : j) >= k);
            if (!first || !second) continue;
            let error = 0;
            for (let i = 0; i < nx; i++) {
                for (let j = 0; j < nz; j++) {
                    if ((inBox(first, i, j) || inBox(second, i, j)) !== occupied[i][j]) error++;
                }
            }
            // On a tie (an L splits cleanly both ways) the cut across z wins: the main body
            // then spans the whole facade and the wing juts out to the front or back.
            const score = error + (axis === 'x' ? 0.5 : 0);
            if (!best || score < best.score) best = { score, error, first, second };
        }
    }
    if (!best || best.error > empty * 0.55) {
        return null;
    }
    const toRect = (box) => ({
        x0: -width / 2 + box.i0 * cx,
        x1: -width / 2 + (box.i1 + 1) * cx,
        z0: -depth / 2 + box.j0 * cz,
        z1: -depth / 2 + (box.j1 + 1) * cz,
    });
    const rects = [toRect(best.first), toRect(best.second)];
    if (rects.some((r) => Math.min(r.x1 - r.x0, r.z1 - r.z0) < 8)) {
        return null;
    }
    const area = (r) => (r.x1 - r.x0) * (r.z1 - r.z0);
    return area(rects[0]) >= area(rects[1]) ? rects : [rects[1], rects[0]];
}

/* ── plan ────────────────────────────────────────────────────────────────── */

// Pieces of [from, to] left after removing the blocked intervals.
function freeIntervals(from, to, blocked) {
    let free = [[from, to]];
    for (const [b0, b1] of blocked) {
        free = free.flatMap(([f0, f1]) => {
            if (b1 <= f0 || b0 >= f1) return [[f0, f1]];
            const pieces = [];
            if (b0 > f0) pieces.push([f0, b0]);
            if (b1 < f1) pieces.push([b1, f1]);
            return pieces;
        });
    }
    return free;
}

/**
 * Volumes, door, porch, garage and planting of the house.
 * @param width      facade length (local x), ft
 * @param depth      front-to-back size (local z), ft
 * @param outline    the real footprint in local coordinates, or null for a standard home
 * @param height     height of the building, ft (above 18 ft it gets two stories)
 * @param seed       picks the palette
 * @param garageSide +1 or -1: the end of the facade that gets the garage (the driveway side)
 * @param occupancy  FEMA OCC_CLS (Residential, Commercial, ...) or null
 * @param roof       'flat' or 'pitched' when measured (3D scan); overrides the guesses below
 */
export function planHouse({ width, depth, outline = null, height = 11, seed = 1, garageSide = 1, occupancy = null, roof = null }) {
    width = Math.max(16, width);
    depth = Math.max(14, depth);
    const stories = height > 18 ? 2 : 1;
    const style = STYLES[Math.floor(random(seed)() * STYLES.length)];
    const full = { x0: -width / 2, x1: width / 2, z0: -depth / 2, z1: depth / 2 };

    const split = outline ? splitFootprint(outline, width, depth) : null;

    // Commercial use, or a footprint too big for a home (a known residence keeps its hip
    // roof unless it is over 55 ft deep), gets a flat roof with a parapet.
    const area = outline ? polygonArea(outline) : width * depth;
    const residential = /residential/i.test(occupancy || '');
    const guessedFlat = FLAT_OCCUPANCY.test(occupancy || '') || Math.min(width, depth) > 55 || (!residential && area > 5000);
    if (roof === 'flat' || (roof === null && guessedFlat)) {
        return planFlat({ full, split, height, style, ring: outline ? cleanRing(outline) : null });
    }

    const ring = outline ? cleanRing(outline) : null;
    const main = { ...(split ? split[0] : full), stories, role: 'main' };
    const parts = [main];
    let garage = null;

    if (split) {
        // With the real outline, the extruded walls are one height: so are the volumes.
        const wing = { ...split[1], stories: ring ? stories : 1, role: 'wing' };
        const wingWidth = wing.x1 - wing.x0;
        // A wing that juts out toward the street and is one or two cars wide reads as the garage.
        if (wing.z1 > main.z1 + 3 && wingWidth >= 11 && wingWidth <= 32) {
            wing.role = 'garage';
        }
        parts.push(wing);
    } else if (width >= 34 && depth >= 24) {
        // Plain rectangle: a garage at one end, pushed a few feet toward the street (kept
        // within a real footprint).
        const garageWidth = width >= 46 ? 22 : 12;
        const x0 = garageSide > 0 ? main.x1 - garageWidth : main.x0;
        parts.push({ x0, x1: x0 + garageWidth, z0: main.z1 - Math.min(22, depth - 2), z1: main.z1 + (ring ? 0 : 3), stories: 1, role: 'garage' });
    }
    const garagePart = parts.find((part) => part.role === 'garage');
    if (garagePart) {
        const partWidth = garagePart.x1 - garagePart.x0;
        const garageX = (garagePart.x0 + garagePart.x1) / 2;
        garage = {
            x: garageX,
            z: ring ? frontWallAt(ring, garageX, garagePart.z1) : garagePart.z1,
            doorWidth: partWidth >= 19 ? 16 : Math.min(9, partWidth - 2.5),
            width: partWidth,
        };
    }

    // Entry door: on the main front, in the widest stretch not covered by a volume in front of it.
    const blocked = parts.filter((part) => part !== main && part.z1 > main.z1 - 0.5)
        .map((part) => [part.x0 - 1.5, part.x1 + 1.5]);
    const free = freeIntervals(main.x0 + 3, main.x1 - 3, blocked).sort((a, b) => (b[1] - b[0]) - (a[1] - a[0]));
    let doorX = (main.x0 + main.x1) / 2;
    if (free.length && free[0][1] - free[0][0] >= 9) {
        const [f0, f1] = free[0];
        // Toward the garage, as in most tract homes, but clear of the ends.
        const lean = garage ? Math.sign(garage.x - (f0 + f1) / 2) * 0.18 : -0.12;
        doorX = Math.max(f0 + 5, Math.min(f1 - 5, (f0 + f1) / 2 + lean * (f1 - f0)));
    }
    const porchWidth = 10;
    const porchDepth = 6.5;
    const doorZ = ring ? frontWallAt(ring, doorX, main.z1) : main.z1;
    const porch = { x0: doorX - porchWidth / 2, x1: doorX + porchWidth / 2, z0: doorZ, z1: doorZ + porchDepth };

    // Planting beds along the front walls not taken by the porch or a garage.
    const beds = [];
    for (const part of parts) {
        if (part.role === 'garage') continue;
        const inFront = parts.filter((other) => other !== part && other.z1 > part.z1 - 0.5).map((other) => [other.x0 - 1, other.x1 + 1]);
        if (part === main) inFront.push([porch.x0 - 0.5, porch.x1 + 0.5]);
        for (const [f0, f1] of freeIntervals(part.x0, part.x1, inFront)) {
            if (f1 - f0 >= 5) beds.push({ x0: f0, x1: f1, z0: part.z1 + 0.4, z1: part.z1 + 4 });
        }
    }
    const shrubs = beds.flatMap((bed) => {
        const count = Math.max(1, Math.floor((bed.x1 - bed.x0) / 6.5));
        const step = (bed.x1 - bed.x0) / count;
        return Array.from({ length: count }, (_, i) => {
            const x = bed.x0 + step * (i + 0.5);
            return [x, (bed.z0 + bed.z1) / 2, 1.05 + ((Math.abs(x) * 7) % 5) / 10];
        });
    });

    const bounds = boundsOf(parts.concat([porch]));

    // The A/C unit stands on the side wall away from the garage.
    const acUnit = [garage && garage.x > 0 ? main.x0 - 1.9 : main.x1 + 1.9, main.z0 + (main.z1 - main.z0) * 0.3];

    return { kind: 'house', parts, main, garage, door: { x: doorX, z: doorZ }, porch, beds, shrubs, acUnit, stories, style, bounds, ring };
}

// z of the front-most wall of the ring at x (where a door on the front goes), or fallback.
function frontWallAt(ring, x, fallback) {
    let best = null;
    ring.forEach((a, i) => {
        const b = ring[(i + 1) % ring.length];
        if (Math.abs(b[0] - a[0]) < 0.5 || x < Math.min(a[0], b[0]) || x > Math.max(a[0], b[0])) return;
        const z = a[1] + ((b[1] - a[1]) * (x - a[0])) / (b[0] - a[0]);
        if (best === null || z > best) best = z;
    });
    return best === null ? fallback : best;
}

function boundsOf(rects) {
    return rects.reduce((b, r) => ({
        x0: Math.min(b.x0, r.x0), x1: Math.max(b.x1, r.x1), z0: Math.min(b.z0, r.z0), z1: Math.max(b.z1, r.z1),
    }), { x0: Infinity, x1: -Infinity, z0: Infinity, z1: -Infinity });
}

/* A flat-roofed commercial building: storefront on the front, entry stoop, rooftop HVAC. */
function planFlat({ full, split, height, style, ring }) {
    const wallHeight = Math.max(COMMERCIAL_STORY_FT, Math.min(48, height));
    const stories = Math.max(1, Math.round(wallHeight / COMMERCIAL_STORY_FT));
    const main = { ...(split ? split[0] : full), stories, role: 'main' };
    const parts = [main];
    if (split) {
        parts.push({ ...split[1], stories, role: 'wing' });
    }
    const doorX = (main.x0 + main.x1) / 2;
    const doorZ = ring ? frontWallAt(ring, doorX, main.z1) : main.z1;
    const porch = { x0: doorX - 7, x1: doorX + 7, z0: doorZ, z1: doorZ + 5 };
    const width = main.x1 - main.x0;
    const depth = main.z1 - main.z0;
    const count = width * depth > 6000 ? 3 : 2;
    const hvac = Array.from({ length: count }, (_, i) => [
        main.x0 + (width * (i + 1)) / (count + 1),
        main.z0 + depth * (i % 2 ? 0.35 : 0.6),
    ]).filter((point) => !ring || pointInPolygon(point, offsetRing(ring, -5)));
    return {
        kind: 'flat', parts, main, garage: null, door: { x: doorX, z: doorZ }, porch, beds: [], shrubs: [], acUnit: null,
        stories, wallHeight, hvac, style, bounds: boundsOf(parts.concat([porch])), ring,
    };
}

/*
 * The plan with the roof color read from the satellite photo. The palette closest to it
 * keeps walls and trims in harmony with the real roof.
 */
export function withRoofColor(plan, hex) {
    const [r, g, b] = hexToRgb(hex);
    const distance = (style) => {
        const [sr, sg, sb] = hexToRgb(ROOF_TONES[style.roof][0]);
        return (sr - r) ** 2 + (sg - g) ** 2 + (sb - b) ** 2;
    };
    const nearest = [...STYLES].sort((a, b2) => distance(a) - distance(b2))[0];
    return { ...plan, style: { ...nearest, roofColor: hex } };
}

/* ── geometry helpers ────────────────────────────────────────────────────── */

// Collects box and cylinder geometries per material and merges them into one mesh each.
class Kit {
    constructor(materials) {
        this.materials = materials;
        this.lists = new Map();
    }

    add(key, geometry, x, y, z, rotY = 0) {
        geometry.applyMatrix4(new Matrix4().makeRotationY(rotY).setPosition(x, y, z));
        if (!this.lists.has(key)) this.lists.set(key, []);
        this.lists.get(key).push(geometry);
    }

    box(key, w, h, d, x, y, z, rotY = 0) {
        this.add(key, new BoxGeometry(w, h, d), x, y, z, rotY);
    }

    // A bar between two 3D points.
    bar(key, p, q, diameter) {
        const direction = new Vector3(q[0] - p[0], q[1] - p[1], q[2] - p[2]);
        const geometry = new CylinderGeometry(diameter / 2, diameter / 2, direction.length(), 6);
        geometry.applyMatrix4(new Matrix4().makeRotationFromQuaternion(
            new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), direction.clone().normalize())
        ).setPosition((p[0] + q[0]) / 2, (p[1] + q[1]) / 2, (p[2] + q[2]) / 2));
        if (!this.lists.has(key)) this.lists.set(key, []);
        this.lists.get(key).push(geometry);
    }

    into(group) {
        for (const [key, list] of this.lists) {
            const mesh = new Mesh(mergeGeometries(list), this.materials[key]);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            group.add(mesh);
            list.forEach((geometry) => geometry.dispose());
        }
        this.lists.clear();
    }
}

function canvas(width, height) {
    const element = document.createElement('canvas');
    element.width = width;
    element.height = height;
    return element;
}

function hexToRgb(hex) {
    return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
}

const textureCache = {};

// Field, shade, highlight and deep shade of a tile color.
function tileTones(hex) {
    const [r, g, b] = hexToRgb(hex);
    const tone = (k) => `#${[r, g, b].map((c) => Math.max(0, Math.min(255, Math.round(c * k))).toString(16).padStart(2, '0')).join('')}`;
    return [hex, tone(0.76), tone(1.16), tone(0.62)];
}

/*
 * Barrel tile in a palette tone (or tones from any color); one texture spans 5.4 ft by
 * 8.8 ft of roof.
 */
function roofTiles(tone) {
    if (textureCache[tone]) return textureCache[tone];
    const [field, shade, light, deep] = ROOF_TONES[tone] || tileTones(tone);
    const n = 512;
    const element = canvas(n, n);
    const g = element.getContext('2d');
    g.fillStyle = field;
    g.fillRect(0, 0, n, n);
    const rows = 8;
    const rowHeight = n / rows;
    const vary = (hex, j) => {
        const [r, v, b] = hexToRgb(hex);
        const k = (value, f) => Math.max(0, Math.min(255, value + j * f)) | 0;
        return `rgb(${k(r, 1)},${k(v, 0.8)},${k(b, 0.7)})`;
    };
    for (let f = 0; f < rows; f++) {
        const y = f * rowHeight;
        const offset = (f % 2) * (n / 12);
        for (let x = -n / 12; x < n; x += n / 6) {
            // Each tile its own shade: identical tiles read as a printed pattern.
            const j = (Math.sin((x + offset) * 0.7 + f * 13.7) * 0.5 + 0.5) * 24 - 12;
            const gradient = g.createLinearGradient(x + offset, 0, x + offset + n / 6, 0);
            gradient.addColorStop(0, vary(shade, j));
            gradient.addColorStop(0.35, vary(light, j));
            gradient.addColorStop(0.7, vary(field, j));
            gradient.addColorStop(1, vary(deep, j));
            g.fillStyle = gradient;
            g.beginPath();
            g.moveTo(x + offset, y + rowHeight);
            g.bezierCurveTo(x + offset, y - rowHeight * 0.15, x + offset + n / 6, y - rowHeight * 0.15, x + offset + n / 6, y + rowHeight);
            g.fill();
        }
        g.fillStyle = 'rgba(0,0,0,0.22)';
        g.fillRect(0, y + rowHeight - 2, n, 2);
    }
    const texture = new CanvasTexture(element);
    texture.wrapS = texture.wrapT = RepeatWrapping;
    texture.colorSpace = SRGBColorSpace;
    texture.anisotropy = 8;
    textureCache[tone] = texture;
    return texture;
}

/* Sectional garage door: raised panels in rows, with the grooves between sections. */
function garageDoor(columns, hex) {
    const key = `garage${columns}${hex}`;
    if (textureCache[key]) return textureCache[key];
    const rows = 4;
    const panel = 64;
    const element = canvas(columns * panel, rows * panel);
    const g = element.getContext('2d');
    const [r, v, b] = hexToRgb(hex);
    g.fillStyle = hex;
    g.fillRect(0, 0, element.width, element.height);
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < columns; col++) {
            const x = col * panel + 7;
            const y = row * panel + 9;
            const w = panel - 14;
            const h = panel - 18;
            g.fillStyle = `rgb(${r - 10},${v - 10},${b - 12})`;
            g.fillRect(x, y, w, h);
            g.fillStyle = `rgb(${Math.min(255, r + 8)},${Math.min(255, v + 8)},${Math.min(255, b + 8)})`;
            g.fillRect(x + 4, y + 4, w - 8, h - 8);
            g.fillStyle = 'rgba(255,255,255,0.55)';
            g.fillRect(x, y, w, 2);
            g.fillRect(x, y, 2, h);
            g.fillStyle = 'rgba(0,0,0,0.18)';
            g.fillRect(x, y + h - 2, w, 2);
            g.fillRect(x + w - 2, y, 2, h);
        }
        g.fillStyle = 'rgba(0,0,0,0.28)';
        g.fillRect(0, row * panel, element.width, 3);
    }
    const texture = new CanvasTexture(element);
    texture.colorSpace = SRGBColorSpace;
    texture.anisotropy = 4;
    textureCache[key] = texture;
    return texture;
}

/*
 * Hip roof over a rectangle: ridge along the longer side, hips at 45 degrees. UVs follow
 * each slope (u along the eave, v up the slope, in feet scaled to the tile texture) so the
 * tile rows run parallel to the eaves on all four faces.
 */
function hipRoof(rect, yBase, overhang, material, maxRise = Infinity) {
    const a = rect.x0 - overhang;
    const b = rect.x1 + overhang;
    const c = rect.z0 - overhang;
    const d = rect.z1 + overhang;
    const alongX = b - a >= d - c;
    const [p0, p1, q0, q1] = alongX ? [a, b, c, d] : [c, d, a, b];
    const half = (q1 - q0) / 2;
    const rise = Math.min(half * PITCH, maxRise);
    const inset = Math.min(half, (p1 - p0) / 2 - 0.01);
    const qm = (q0 + q1) / 2;
    const slope = Math.sqrt(1 + (rise / half) ** 2);
    const toXYZ = (p, y, q) => (alongX ? [p, y, q] : [q, y, p]);

    const positions = [];
    const uvs = [];
    // Triangle given in (p, y, q); uv(p, q) maps a point to tile space.
    const tri = (points, uv) => {
        const ordered = alongX ? points : [points[0], points[2], points[1]]; // swapping axes mirrors the winding
        for (const [p, y, q] of ordered) {
            positions.push(...toXYZ(p, y, q));
            const [u, v] = uv(p, q);
            uvs.push(u / 5.4, (v * slope) / 8.8);
        }
    };
    const A = [p0, yBase, q0];
    const B = [p1, yBase, q0];
    const C = [p1, yBase, q1];
    const D = [p0, yBase, q1];
    const R0 = [p0 + inset, yBase + rise, qm];
    const R1 = [p1 - inset, yBase + rise, qm];
    const sideQ0 = (p, q) => [p, q - q0];
    const sideQ1 = (p, q) => [-p, q1 - q];
    const endP0 = (p, q) => [-q, p - p0];
    const endP1 = (p, q) => [q, p1 - p];
    tri([B, A, R1], sideQ0); tri([A, R0, R1], sideQ0);
    tri([D, C, R0], sideQ1); tri([C, R1, R0], sideQ1);
    tri([A, D, R0], endP0);
    tri([C, B, R1], endP1);

    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
    geometry.computeVertexNormals();
    const mesh = new Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return {
        mesh,
        ridge: [toXYZ(...R0), toXYZ(...R1)],
        corners: { A: toXYZ(...A), B: toXYZ(...B), C: toXYZ(...C), D: toXYZ(...D) },
        eaves: { a, b, c, d },
    };
}

// Ridge and hip caps plus the white fascia along the eaves of a roof.
function roofTrim(kit, roof, yBase) {
    const [R0, R1] = roof.ridge;
    const { A, B, C, D } = roof.corners;
    if (Math.hypot(R1[0] - R0[0], R1[2] - R0[2]) > 0.1) kit.bar('ridge', R0, R1, 0.55);
    kit.bar('ridge', A, R0, 0.45);
    kit.bar('ridge', D, R0, 0.45);
    kit.bar('ridge', B, R1, 0.45);
    kit.bar('ridge', C, R1, 0.45);
    const { a, b, c, d } = roof.eaves;
    kit.box('trim', b - a, 0.45, 0.4, (a + b) / 2, yBase - 0.15, d);
    kit.box('trim', b - a, 0.45, 0.4, (a + b) / 2, yBase - 0.15, c);
    kit.box('trim', 0.4, 0.45, d - c, a, yBase - 0.15, (c + d) / 2);
    kit.box('trim', 0.4, 0.45, d - c, b, yBase - 0.15, (c + d) / 2);
}

/*
 * The four walls of a rectangle as faces: start point a, direction t along the wall
 * (left to right seen from outside), outward normal n and the turn that makes a box's
 * local +z point outward.
 */
function faces(rect) {
    const { x0, x1, z0, z1 } = rect;
    return [
        { side: 'front', a: [x0, z1], t: [1, 0], n: [0, 1], rotY: 0, length: x1 - x0 },
        { side: 'back', a: [x1, z0], t: [-1, 0], n: [0, -1], rotY: Math.PI, length: x1 - x0 },
        { side: 'left', a: [x0, z0], t: [0, 1], n: [-1, 0], rotY: -Math.PI / 2, length: z1 - z0 },
        { side: 'right', a: [x1, z1], t: [0, -1], n: [1, 0], rotY: Math.PI / 2, length: z1 - z0 },
    ];
}

/*
 * The edges of a footprint ring as faces (same shape as faces()): each starts where boxes
 * placed on it run left to right seen from outside. 'front', 'back' or 'side' by where
 * the edge looks.
 */
function ringFaces(ring) {
    const normals = edgeNormals(ring);
    return ring.map((a, i) => {
        const b = ring[(i + 1) % ring.length];
        const n = normals[i];
        const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
        // A box's +x runs along (n.z, -n.x): start from whichever end makes that the direction.
        const t = [n[1], -n[0]];
        const forward = (b[0] - a[0]) * t[0] + (b[1] - a[1]) * t[1] > 0;
        const side = n[1] > 0.7 ? 'front' : n[1] < -0.7 ? 'back' : 'side';
        return { side, a: forward ? a : b, t, n, rotY: Math.atan2(n[0], n[1]), length };
    }).filter((face) => face.length >= 1);
}

// The face (of the given side, if any) closest to a point, and where along it the point falls.
function nearestFace(list, point, side = null) {
    let best = null;
    for (const face of list) {
        if (side && face.side !== side) continue;
        const s = Math.max(0, Math.min(face.length, (point[0] - face.a[0]) * face.t[0] + (point[1] - face.a[1]) * face.t[1]));
        const distance = Math.hypot(face.a[0] + face.t[0] * s - point[0], face.a[1] + face.t[1] * s - point[1]);
        if (!best || distance < best.distance) best = { face, s, distance };
    }
    return best;
}

/*
 * A ring extruded from y0 up by height (with an optional hole ring), as one mesh. Wall
 * texture coordinates come out in feet; uvScale brings them to the texture's size.
 */
function prism(ring, y0, height, material, { hole = null, uvScale = 1 / 36 } = {}) {
    const shape = new Shape(ring.map(([x, z]) => new Vector2(x, -z)));
    if (hole) {
        shape.holes.push(new Path(hole.map(([x, z]) => new Vector2(x, -z))));
    }
    const geometry = new ExtrudeGeometry(shape, { depth: height, bevelEnabled: false });
    geometry.rotateX(-Math.PI / 2);
    geometry.translate(0, y0, 0);
    const uv = geometry.attributes.uv;
    for (let i = 0; i < uv.count; i++) {
        uv.setXY(i, uv.getX(i) * uvScale, uv.getY(i) * uvScale);
    }
    const mesh = new Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
}

// Box on a face: u along the wall from s, y up, o out of the wall.
function onFace(kit, face, key, w, h, d, s, y, o) {
    kit.box(key, w, h, d, face.a[0] + face.t[0] * s + face.n[0] * o, y, face.a[1] + face.t[1] * s + face.n[1] * o, face.rotY);
}

/* A window in relief: recessed glass, casing, muntins, a projecting sill and a crown. */
function windowOn(kit, face, s, y, w, h, shutters) {
    const f = 0.32;
    onFace(kit, face, 'glass', w, h, 0.12, s, y, 0.02);
    onFace(kit, face, 'trim', w + 2 * f, f, 0.36, s, y + h / 2 + f / 2, 0.12);
    onFace(kit, face, 'trim', f, h, 0.36, s - w / 2 - f / 2, y, 0.12);
    onFace(kit, face, 'trim', f, h, 0.36, s + w / 2 + f / 2, y, 0.12);
    onFace(kit, face, 'trim', 0.11, h, 0.14, s, y, 0.09);
    onFace(kit, face, 'trim', w, 0.11, 0.14, s, y + h * 0.08, 0.09);
    onFace(kit, face, 'trim', w + 2 * f + 0.5, 0.22, 0.75, s, y - h / 2 - 0.11, 0.32);
    onFace(kit, face, 'trim', w + 2 * f + 0.25, 0.1, 0.62, s, y - h / 2 - 0.28, 0.24);
    onFace(kit, face, 'trim', w + 2 * f + 0.7, 0.3, 0.5, s, y + h / 2 + f + 0.15, 0.2);
    onFace(kit, face, 'trim', w + 2 * f + 0.95, 0.12, 0.6, s, y + h / 2 + f + 0.36, 0.25);
    if (shutters) {
        const sw = w * 0.42;
        onFace(kit, face, 'shutter', sw, h + 0.3, 0.16, s - w / 2 - f - sw / 2 - 0.12, y, 0.1);
        onFace(kit, face, 'shutter', sw, h + 0.3, 0.16, s + w / 2 + f + sw / 2 + 0.12, y, 0.1);
    }
}

function materials(style) {
    return {
        wall: new MeshStandardMaterial({ map: T.estuco(style.wall), roughness: 0.93 }),
        base: new MeshStandardMaterial({ color: new Color(style.base), roughness: 0.95 }),
        band: new MeshStandardMaterial({ color: new Color(style.band), roughness: 0.9 }),
        roof: new MeshStandardMaterial({ map: roofTiles(style.roofColor || style.roof), roughness: 0.82 }),
        ridge: new MeshStandardMaterial({ color: new Color((ROOF_TONES[style.roofColor] || tileTones(style.roofColor || ROOF_TONES[style.roof][0]))[1]), roughness: 0.8 }),
        trim: new MeshStandardMaterial({ color: new Color(style.trim), roughness: 0.55 }),
        glass: new MeshStandardMaterial({ color: new Color('#2a3d4e'), roughness: 0.05, metalness: 0.6, envMapIntensity: 1.5 }),
        door: new MeshStandardMaterial({ color: new Color(style.door), roughness: 0.5 }),
        shutter: new MeshStandardMaterial({ color: new Color(style.shutter), roughness: 0.7 }),
        concrete: new MeshStandardMaterial({ map: T.hormigon(), roughness: 0.92 }),
        mulch: new MeshStandardMaterial({ color: new Color('#4b3527'), roughness: 1 }),
        metal: new MeshStandardMaterial({ color: new Color('#b9bcb8'), roughness: 0.45, metalness: 0.5 }),
        dark: new MeshStandardMaterial({ color: new Color('#3a3f44'), roughness: 0.6 }),
    };
}

/* ── house ───────────────────────────────────────────────────────────────── */

// Sectional garage door with trim and coach lights at s along a face.
function garageDoorOn(kit, mats, face, s, garage, style) {
    const h = 7.6;
    const columns = garage.doorWidth > 12 ? 8 : 4;
    mats[`garage${columns}`] = new MeshStandardMaterial({ map: garageDoor(columns, style.garage), roughness: 0.5, metalness: 0.1 });
    onFace(kit, face, `garage${columns}`, garage.doorWidth, h, 0.2, s, h / 2 + 0.05, -0.05);
    onFace(kit, face, 'trim', garage.doorWidth + 1, 0.45, 0.4, s, h + 0.27, 0.1);
    onFace(kit, face, 'trim', 0.45, h, 0.4, s - garage.doorWidth / 2 - 0.22, h / 2, 0.1);
    onFace(kit, face, 'trim', 0.45, h, 0.4, s + garage.doorWidth / 2 + 0.22, h / 2, 0.1);
    for (const side of [-1, 1]) {
        onFace(kit, face, 'dark', 0.5, 0.9, 0.4, s + side * (garage.doorWidth / 2 + 1.4), 6.4, 0.25);
    }
}

/** Builds the house of a plan from planHouse(). */
export function buildHouse(plan) {
    if (plan.kind === 'flat') {
        return buildFlat(plan);
    }
    const g = new Group();
    const mats = materials(plan.style);
    const kit = new Kit(mats);
    const { parts, main, porch, door, garage, ring } = plan;

    const inside = (part, x, z) => x > part.x0 + 0.1 && x < part.x1 - 0.1 && z > part.z0 + 0.1 && z < part.z1 - 0.1;
    if (ring) {
        // The real footprint's walls, with base, frieze and floor bands following its outline.
        const wallHeight = main.stories * STORY_FT;
        g.add(prism(ring, 0, wallHeight, mats.wall));
        g.add(prism(offsetRing(ring, 0.25), 0, 1.3, mats.base));
        g.add(prism(offsetRing(ring, 0.09), wallHeight - 1.85, 0.5, mats.band));
        if (main.stories > 1) {
            g.add(prism(offsetRing(ring, 0.15), STORY_FT - 0.12, 0.45, mats.band));
        }
    }
    // A point just outside a wall that falls inside another volume means that wall is hidden;
    // one just inside it that falls in the garage means that stretch of wall is the garage's.
    const hidden = (face, s, self) => parts.some((part) => part !== self && (
        inside(part, face.a[0] + face.t[0] * s + face.n[0] * 1.5, face.a[1] + face.t[1] * s + face.n[1] * 1.5)
        || (part.role === 'garage' && inside(part, face.a[0] + face.t[0] * s - face.n[0], face.a[1] + face.t[1] * s - face.n[1]))
    ));

    for (const part of parts) {
        const width = part.x1 - part.x0;
        const depth = part.z1 - part.z0;
        const cx = (part.x0 + part.x1) / 2;
        const cz = (part.z0 + part.z1) / 2;
        const wallHeight = part.stories * STORY_FT;
        if (!ring) {
            kit.box('wall', width, wallHeight, depth, cx, wallHeight / 2, cz);
            kit.box('base', width + 0.5, 1.3, depth + 0.5, cx, 0.65, cz);
            kit.box('band', width + 0.18, 0.5, depth + 0.18, cx, wallHeight - 1.6, cz);
            if (part.stories > 1) {
                kit.box('band', width + 0.3, 0.45, depth + 0.3, cx, STORY_FT + 0.1, cz);
            }
        }

        // Roof. A wing reaches into the main body so the two hip roofs intersect cleanly.
        let roofRect = part;
        if (part.role === 'wing') {
            const reach = Math.min(Math.min(width, depth), Math.max(main.x1 - main.x0, main.z1 - main.z0) - 1);
            roofRect = { ...part };
            if (Math.abs(part.z1 - main.z0) < 1) roofRect.z1 += Math.min(reach, main.z1 - main.z0 - 1);
            else if (Math.abs(part.z0 - main.z1) < 1) roofRect.z0 -= Math.min(reach, main.z1 - main.z0 - 1);
            else if (Math.abs(part.x1 - main.x0) < 1) roofRect.x1 += Math.min(reach, main.x1 - main.x0 - 1);
            else if (Math.abs(part.x0 - main.x1) < 1) roofRect.x0 -= Math.min(reach, main.x1 - main.x0 - 1);
        }
        // Rise capped at 28% of the span and 10 ft: a wide house must not wear a pyramid.
        const span = Math.min(roofRect.x1 - roofRect.x0, roofRect.z1 - roofRect.z0);
        const roof = hipRoof(roofRect, wallHeight, OVERHANG, mats.roof, Math.min(span * 0.28, MAX_RIDGE_FT));
        g.add(roof.mesh);
        roofTrim(kit, roof, wallHeight);

        // Openings on each visible wall (on the real outline's edges instead, below).
        for (const face of ring ? [] : faces(part)) {
            const isFront = face.side === 'front';
            const blocked = [];
            let garageDoorAt = null;
            if (isFront && part.role === 'garage' && garage) {
                garageDoorAt = garage.x - part.x0;
                blocked.push([garageDoorAt - garage.doorWidth / 2 - 2, garageDoorAt + garage.doorWidth / 2 + 2]);
            }
            if (isFront && part === main) {
                blocked.push([porch.x0 - part.x0 - 1, porch.x1 - part.x0 + 1]);
            }
            // Garages have plain walls besides the door.
            for (let story = 0; story < (part.role === 'garage' ? 0 : part.stories); story++) {
                const every = isFront ? 11 : 13;
                const count = Math.max(1, Math.floor(face.length / every));
                const step = face.length / count;
                for (let i = 0; i < count; i++) {
                    const s = step * (i + 0.5);
                    // Upper floor windows also go over the porch.
                    const inDoorway = story === 0 && blocked.some(([b0, b1]) => s > b0 - 2.4 && s < b1 + 2.4);
                    if (inDoorway || hidden(face, s, part) || s < 3 || s > face.length - 3) continue;
                    const wide = isFront ? 4.6 : 4.2;
                    windowOn(kit, face, s, story * STORY_FT + WINDOW_Y, wide, story ? 4 : 4.4, isFront);
                }
            }
            if (garageDoorAt !== null) {
                garageDoorOn(kit, mats, face, garageDoorAt, garage, plan.style);
            }
        }
    }

    if (ring) {
        // Windows along the real outline: not in the doorway, not on the garage's walls.
        const edges = ringFaces(ring);
        const garagePart = parts.find((part) => part.role === 'garage');
        for (const face of edges) {
            const isFront = face.side === 'front';
            const count = Math.max(1, Math.floor(face.length / (isFront ? 11 : 13)));
            const step = face.length / count;
            for (let story = 0; story < main.stories; story++) {
                for (let i = 0; i < count; i++) {
                    const s = step * (i + 0.5);
                    const x = face.a[0] + face.t[0] * s;
                    const z = face.a[1] + face.t[1] * s;
                    const inDoorway = story === 0 && Math.hypot(x - door.x, z - door.z) < 7.5;
                    const onGarage = garagePart && inside(garagePart, x - face.n[0], z - face.n[1]);
                    if (inDoorway || onGarage || s < 3 || s > face.length - 3) continue;
                    windowOn(kit, face, s, story * STORY_FT + WINDOW_Y, isFront ? 4.6 : 4.2, story ? 4 : 4.4, isFront);
                }
            }
        }
        if (garage) {
            const spot = nearestFace(edges, [garage.x, garage.z], 'front') || nearestFace(edges, [garage.x, garage.z]);
            if (spot) {
                garageDoorOn(kit, mats, spot.face, spot.s, garage, plan.style);
            }
        }
    }

    // Entry door with sidelights and transom, under a porch with two columns.
    const front = { a: [door.x, door.z], t: [1, 0], n: [0, 1], rotY: 0 };
    const s = 0;
    onFace(kit, front, 'door', 3.3, 7.3, 0.3, s, 3.75, 0.05);
    onFace(kit, front, 'trim', 6.6, 8.6, 0.24, s, 4.3, -0.02);
    onFace(kit, front, 'glass', 1.05, 6.6, 0.3, s - 2.35, 3.75, 0.06);
    onFace(kit, front, 'glass', 1.05, 6.6, 0.3, s + 2.35, 3.75, 0.06);
    onFace(kit, front, 'glass', 5.6, 0.75, 0.3, s, 7.85, 0.06);
    onFace(kit, front, 'door', 2.5, 2.7, 0.38, s, 5.35, 0.1);
    onFace(kit, front, 'door', 2.5, 2.7, 0.38, s, 2.15, 0.1);
    onFace(kit, front, 'metal', 0.15, 0.15, 0.5, s + 1.25, 3.6, 0.3);

    const porchHeight = 8.8;
    const pw = porch.x1 - porch.x0;
    const pd = porch.z1 - porch.z0;
    kit.box('concrete', pw, 0.45, pd, (porch.x0 + porch.x1) / 2, 0.225, (porch.z0 + porch.z1) / 2);
    kit.box('concrete', pw - 3, 0.22, 1.4, (porch.x0 + porch.x1) / 2, 0.11, porch.z1 + 0.7);
    for (const x of [porch.x0 + 0.8, porch.x1 - 0.8]) {
        const z = porch.z1 - 0.8;
        kit.add('trim', new CylinderGeometry(0.36, 0.42, porchHeight - 1.2, 14), x, 0.45 + (porchHeight - 1.2) / 2, z);
        kit.box('trim', 1.15, 0.5, 1.15, x, 0.7, z);
        kit.box('trim', 1.05, 0.4, 1.05, x, porchHeight - 0.55, z);
    }
    kit.box('trim', pw, 0.9, 0.6, (porch.x0 + porch.x1) / 2, porchHeight - 0.2, porch.z1 - 0.8);
    const porchRoof = hipRoof({ x0: porch.x0, x1: porch.x1, z0: porch.z0 - 1.5, z1: porch.z1 - 0.5 }, porchHeight + 0.2, 0.9, mats.roof);
    g.add(porchRoof.mesh);
    roofTrim(kit, porchRoof, porchHeight + 0.2);

    // Planting beds, shrubs and the A/C unit on a side wall.
    for (const bed of plan.beds) {
        kit.box('mulch', bed.x1 - bed.x0, 0.12, bed.z1 - bed.z0, (bed.x0 + bed.x1) / 2, 0.06, (bed.z0 + bed.z1) / 2);
    }
    const [acX, acZ] = plan.acUnit;
    kit.box('metal', 2.6, 2.5, 2.6, acX, 1.35, acZ);
    kit.box('concrete', 3.4, 0.2, 3.4, acX, 0.1, acZ);

    kit.into(g);
    if (plan.shrubs.length) {
        g.add(buildShrubs(plan.shrubs));
    }
    return g;
}

/* Storefront along a front wall: glass bays between aluminum mullions, a canopy, double doors. */
function storefront(kit, face, doorS, wallHeight) {
    const top = Math.min(10, wallHeight - 2.5);
    const bottom = 1.2;
    const glassHeight = top - bottom;
    const from = 3;
    const to = face.length - 3;
    if (to - from < 6) return;
    const middle = (from + to) / 2;
    onFace(kit, face, 'frame', to - from + 1, 0.5, 3.6, middle, top + 0.75, 1.8);
    onFace(kit, face, 'frame', to - from, 0.25, 0.35, middle, bottom - 0.12, 0.12);
    onFace(kit, face, 'frame', to - from, 0.3, 0.35, middle, top + 0.15, 0.12);
    const blocked = doorS === null ? [] : [[doorS - 3.6, doorS + 3.6]];
    for (const [f0, f1] of freeIntervals(from, to, blocked)) {
        const count = Math.max(1, Math.round((f1 - f0) / 5.5));
        const step = (f1 - f0) / count;
        for (let i = 0; i < count; i++) {
            const s = f0 + step * (i + 0.5);
            onFace(kit, face, 'glass', step - 0.25, glassHeight, 0.15, s, bottom + glassHeight / 2, 0.03);
            onFace(kit, face, 'frame', 0.28, glassHeight, 0.32, f0 + step * i, bottom + glassHeight / 2, 0.12);
        }
        onFace(kit, face, 'frame', 0.28, glassHeight, 0.32, f1, bottom + glassHeight / 2, 0.12);
    }
    if (doorS !== null) {
        const doorHeight = 7.4;
        for (const side of [-1, 1]) {
            const s = doorS + side * 1.55;
            onFace(kit, face, 'glass', 2.8, doorHeight, 0.14, s, 0.35 + doorHeight / 2, 0.08);
            onFace(kit, face, 'frame', 0.3, doorHeight, 0.3, doorS + side * 3.1, 0.35 + doorHeight / 2, 0.12);
            onFace(kit, face, 'metal', 1.6, 0.14, 0.3, s, 3.6, 0.3);
        }
        onFace(kit, face, 'frame', 0.22, doorHeight, 0.3, doorS, 0.35 + doorHeight / 2, 0.12);
        onFace(kit, face, 'frame', 6.5, 0.3, 0.32, doorS, 0.35 + doorHeight + 0.15, 0.12);
        onFace(kit, face, 'glass', 6.2, top - doorHeight - 0.8, 0.14, doorS, (doorHeight + 0.65 + top) / 2, 0.05);
    }
}

/* Flat-roofed commercial building: parapet with metal coping, storefront, rooftop HVAC. */
function buildFlat(plan) {
    const g = new Group();
    const mats = materials(plan.style);
    mats.deck = new MeshStandardMaterial({ color: new Color(plan.style.roofColor || '#d8d6cf'), roughness: 0.92 });
    mats.frame = new MeshStandardMaterial({ color: new Color('#34393e'), roughness: 0.4, metalness: 0.6 });
    const kit = new Kit(mats);
    const { parts, main, door, porch, ring } = plan;
    const height = plan.wallHeight;
    const inside = (part, x, z) => x > part.x0 + 0.1 && x < part.x1 - 0.1 && z > part.z0 + 0.1 && z < part.z1 - 0.1;
    const hidden = (face, s, self) => parts.some((part) => part !== self
        && inside(part, face.a[0] + face.t[0] * s + face.n[0] * 1.5, face.a[1] + face.t[1] * s + face.n[1] * 1.5));

    if (ring) {
        // The real footprint extruded, with a parapet ring and metal coping on its outline.
        const t = 0.8;
        g.add(prism(ring, 0, height, mats.wall));
        g.add(prism(offsetRing(ring, 0.2), 0, 1.1, mats.base));
        g.add(prism(offsetRing(ring, 0.25), height - 1.1, 0.8, mats.band));
        g.add(prism(ring, height, 0.2, mats.deck));
        g.add(prism(ring, height, PARAPET_FT, mats.wall, { hole: offsetRing(ring, -t) }));
        g.add(prism(offsetRing(ring, 0.2), height + PARAPET_FT, 0.3, mats.metal, { hole: offsetRing(ring, -t - 0.2) }));

        const edges = ringFaces(ring);
        const entry = nearestFace(edges, [door.x, door.z], 'front');
        let service = null;
        for (const face of edges) {
            if (face.side === 'front') {
                storefront(kit, face, entry && face === entry.face ? entry.s : null, height);
            } else {
                const count = Math.floor(face.length / 18);
                for (let i = 0; i < count; i++) {
                    const s = (face.length / count) * (i + 0.5);
                    onFace(kit, face, 'frame', 6.5, 3, 0.3, s, 7.6, 0.08);
                    onFace(kit, face, 'glass', 6, 2.5, 0.34, s, 7.6, 0.06);
                }
                if (face.side === 'back' && (!service || face.length > service.length)) service = face;
            }
            for (let story = 1; story < main.stories; story++) {
                const count = Math.max(1, Math.floor(face.length / 9));
                for (let i = 0; i < count; i++) {
                    const s = (face.length / count) * (i + 0.5);
                    if (s < 3 || s > face.length - 3) continue;
                    onFace(kit, face, 'frame', 5.4, 4.6, 0.3, s, story * COMMERCIAL_STORY_FT + 6.5, 0.08);
                    onFace(kit, face, 'glass', 5, 4.2, 0.34, s, story * COMMERCIAL_STORY_FT + 6.5, 0.06);
                }
            }
        }
        if (service && service.length > 8) {
            onFace(kit, service, 'door', 3.5, 7.2, 0.25, service.length * 0.25, 3.6, 0.05);
            onFace(kit, service, 'frame', 4.1, 0.3, 0.3, service.length * 0.25, 7.35, 0.1);
        }
    }

    for (const part of ring ? [] : parts) {
        const width = part.x1 - part.x0;
        const depth = part.z1 - part.z0;
        const cx = (part.x0 + part.x1) / 2;
        const cz = (part.z0 + part.z1) / 2;
        kit.box('wall', width, height, depth, cx, height / 2, cz);
        kit.box('base', width + 0.4, 1.1, depth + 0.4, cx, 0.55, cz);
        kit.box('band', width + 0.5, 0.8, depth + 0.5, cx, height - 0.7, cz);
        kit.box('deck', width - 0.2, 0.2, depth - 0.2, cx, height + 0.1, cz);
        // Parapet around the roof, capped with metal coping.
        const t = 0.8;
        const y = height + PARAPET_FT / 2;
        kit.box('wall', width, PARAPET_FT, t, cx, y, part.z0 + t / 2);
        kit.box('wall', width, PARAPET_FT, t, cx, y, part.z1 - t / 2);
        kit.box('wall', t, PARAPET_FT, depth - 2 * t, part.x0 + t / 2, y, cz);
        kit.box('wall', t, PARAPET_FT, depth - 2 * t, part.x1 - t / 2, y, cz);
        const cap = height + PARAPET_FT + 0.15;
        kit.box('metal', width + 0.4, 0.3, t + 0.4, cx, cap, part.z0 + t / 2);
        kit.box('metal', width + 0.4, 0.3, t + 0.4, cx, cap, part.z1 - t / 2);
        kit.box('metal', t + 0.4, 0.3, depth + 0.4, part.x0 + t / 2, cap, cz);
        kit.box('metal', t + 0.4, 0.3, depth + 0.4, part.x1 - t / 2, cap, cz);

        for (const face of faces(part)) {
            if (face.side === 'front') {
                storefront(kit, face, part === main ? door.x - part.x0 : null, height);
            } else {
                // Clerestory windows on the sides and back, a service door at the back.
                const count = Math.floor(face.length / 18);
                for (let i = 0; i < count; i++) {
                    const s = (face.length / count) * (i + 0.5);
                    if (hidden(face, s, part)) continue;
                    onFace(kit, face, 'frame', 6.5, 3, 0.3, s, 7.6, 0.08);
                    onFace(kit, face, 'glass', 6, 2.5, 0.34, s, 7.6, 0.06);
                }
                if (face.side === 'back' && part === main) {
                    onFace(kit, face, 'door', 3.5, 7.2, 0.25, face.length * 0.25, 3.6, 0.05);
                    onFace(kit, face, 'frame', 4.1, 0.3, 0.3, face.length * 0.25, 7.35, 0.1);
                }
            }
            // Upper floors: a row of windows per story on every visible wall.
            for (let story = 1; story < part.stories; story++) {
                const count = Math.max(1, Math.floor(face.length / 9));
                for (let i = 0; i < count; i++) {
                    const s = (face.length / count) * (i + 0.5);
                    if (s < 3 || s > face.length - 3 || hidden(face, s, part)) continue;
                    onFace(kit, face, 'frame', 5.4, 4.6, 0.3, s, story * COMMERCIAL_STORY_FT + 6.5, 0.08);
                    onFace(kit, face, 'glass', 5, 4.2, 0.34, s, story * COMMERCIAL_STORY_FT + 6.5, 0.06);
                }
            }
        }
    }

    // Rooftop HVAC units: a box with two fan grilles and a duct.
    for (const [x, z] of plan.hvac) {
        const base = height + 0.2;
        kit.box('concrete', 8, 0.3, 5.5, x, base + 0.15, z);
        kit.box('metal', 7, 3.2, 4.5, x, base + 1.9, z);
        kit.box('dark', 7.2, 0.2, 4.7, x, base + 3.55, z);
        for (const side of [-1.7, 1.7]) {
            kit.add('dark', new CylinderGeometry(1.25, 1.25, 0.25, 18), x + side, base + 3.7, z);
        }
        kit.box('metal', 1.3, 1.3, 1.8, x + 4.2, base + 1, z);
    }
    kit.box('concrete', porch.x1 - porch.x0, 0.35, porch.z1 - porch.z0, (porch.x0 + porch.x1) / 2, 0.175, (porch.z0 + porch.z1) / 2);

    kit.into(g);
    return g;
}

export function buildShrubs(list) {
    const geometry = new SphereGeometry(1, 14, 10);
    const dark = new InstancedMesh(geometry, new MeshStandardMaterial({ color: new Color('#3f7a34'), roughness: 0.95 }), list.length * 2);
    const light = new InstancedMesh(geometry, new MeshStandardMaterial({ color: new Color('#57963f'), roughness: 0.95 }), list.length);
    const balls = [[0, 0.72, 0, 0.78], [-0.45, 0.55, 0.3, 0.6], [0.45, 0.6, -0.25, 0.62]];
    const dummy = new Object3D();
    let darkIndex = 0;
    let lightIndex = 0;
    for (const [x, z, r] of list) {
        balls.forEach((ball, i) => {
            dummy.position.set(x + ball[0] * r, ball[1] * r, z + ball[2] * r);
            dummy.scale.setScalar(ball[3] * r);
            dummy.updateMatrix();
            if (i === 1) {
                light.setMatrixAt(lightIndex++, dummy.matrix);
            } else {
                dark.setMatrixAt(darkIndex++, dummy.matrix);
            }
        });
    }
    dark.castShadow = true;
    light.castShadow = true;
    dark.receiveShadow = true;
    light.receiveShadow = true;
    const group = new Group();
    group.add(dark, light);
    return group;
}
