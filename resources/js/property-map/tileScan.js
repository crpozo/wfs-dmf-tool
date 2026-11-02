/*
 * Reads the scan of the Google 3D Tiles (googleTiles3d.js scan()): a grid of heights and
 * colors over the property, in scene feet (+X east, +Z south). Finds, as clean shapes for
 * house3d.js and site3d.js:
 *   - the ground level: the 15th percentile of all heights (roofs, cars and canopies sit
 *     above it);
 *   - the building by the fence: cells over 7.5 ft above the ground that are smooth (a
 *     roof is even cell to cell, a tree canopy is not, whatever its color) and not leafy
 *     green, never on the fence line or inside an open fence's yard, with thin links to
 *     trees cut; the block nearest the fence's ends (or its corners). Its outline is one
 *     or two rectangles (an L) fitted at the block's own angle, so an L at 45 degrees
 *     stays an L at 45 degrees. Also its eave and ridge heights, whether the roof is flat,
 *     and the roof color;
 *   - the trees: leafy green cells over 6 ft, grouped; one tree per clump (or per ~18 ft
 *     of a big one), at its real height;
 *   - the paving: gray cells at ground level, cleaned of stray cells and small patches
 *     (shadows on the lawn read gray too), joined into strips.
 */

const GROUND_PERCENTILE = 0.15;
const BUILDING_MIN_FT = 7.5;
const TREE_MIN_FT = 6;
const PAVING_BAND_FT = 2.5;
const BUILDING_MIN_AREA = 200; // sq ft
const TREE_MIN_AREA = 12; // sq ft
// Paving patches smaller than this (sq ft) are shadows or stray pixels, not paving.
const PAVING_MIN_AREA = { light: 40, dark: 150 };
// A roof whose typical slope (rise per foot over SLOPE_SPAN cells, which evens out the
// mesh's noise) is below this is flat, even with steps between parts; a pitched roof
// rises about 0.3 to 0.6.
const FLAT_SLOPE = 0.12;
const SLOPE_SPAN = 3;
// Concrete is even; sand and dry lots, as light and gray, are mottled: the brightness
// spread (0-255) over 5 x 5 cells must stay below this.
const CONCRETE_EVENNESS = 12;
// A cell more than this (ft) off the mean of its four neighbors is foliage, not roof.
const ROOF_ROUGHNESS = 0.9;
// Building cells this close (ft) to the fence line are trees over it: fences do not cross
// buildings.
const FENCE_CLEARANCE = 2;
// Two rectangles (an L) are used when they leave this share of the mismatch of one or less.
const L_GAIN = 0.6;

function percentile(values, p) {
    const sorted = Float32Array.from(values).sort();
    return sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p))] : NaN;
}

const saturation = (r, g, b) => {
    const max = Math.max(r, g, b);
    return max ? (max - Math.min(r, g, b)) / max : 0;
};
// Leafy green, as the tiles' textures show trees and lawns. Green must also beat blue:
// gray-blue roofs have more green than red too.
const isGreen = (r, g, b) => g > r * 1.12 && g >= b && saturation(r, g, b) >= 0.28;

// Connected groups of the cells for which keep(index) holds (4- or 8-neighbors).
function components(size, keep, diagonal) {
    const label = new Int32Array(size * size).fill(-1);
    const groups = [];
    const steps = diagonal
        ? [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]
        : [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (let start = 0; start < size * size; start++) {
        if (label[start] !== -1 || !keep(start)) continue;
        const cells = [];
        const stack = [start];
        label[start] = groups.length;
        while (stack.length) {
            const index = stack.pop();
            cells.push(index);
            const row = Math.floor(index / size);
            const col = index % size;
            for (const [dc, dr] of steps) {
                const c = col + dc;
                const r = row + dr;
                if (c < 0 || r < 0 || c >= size || r >= size) continue;
                const next = r * size + c;
                if (label[next] === -1 && keep(next)) {
                    label[next] = groups.length;
                    stack.push(next);
                }
            }
        }
        groups.push(cells);
    }
    return groups;
}

/*
 * Outer outline of a group of cells, along the cell edges, as grid corners [col, row].
 * Every edge between a cell in the group and one outside is directed with the group on
 * its left, then edges are chained into loops; the longest loop is the outer one.
 */
function traceOutline(size, cells) {
    const inside = new Set(cells);
    const has = (col, row) => col >= 0 && row >= 0 && col < size && row < size && inside.has(row * size + col);
    const next = new Map();
    const add = (a, b) => {
        const key = `${a[0]},${a[1]}`;
        if (!next.has(key)) next.set(key, []);
        next.get(key).push(b);
    };
    for (const index of cells) {
        const row = Math.floor(index / size);
        const col = index % size;
        if (!has(col - 1, row)) add([col, row], [col, row + 1]);
        if (!has(col, row + 1)) add([col, row + 1], [col + 1, row + 1]);
        if (!has(col + 1, row)) add([col + 1, row + 1], [col + 1, row]);
        if (!has(col, row - 1)) add([col + 1, row], [col, row]);
    }
    let best = [];
    while (next.size) {
        const [startKey] = next.keys();
        const loop = [];
        let key = startKey;
        while (next.has(key)) {
            const list = next.get(key);
            const point = list.pop();
            if (!list.length) next.delete(key);
            loop.push(key.split(',').map(Number));
            key = `${point[0]},${point[1]}`;
            if (key === startKey) break;
        }
        if (loop.length > best.length) best = loop;
    }
    return best;
}

function pointInRing(point, ring) {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const [xi, zi] = ring[i];
        const [xj, zj] = ring[j];
        if ((zi > point[1]) !== (zj > point[1]) && point[0] < ((xj - xi) * (point[1] - zi)) / (zj - zi) + xi) {
            inside = !inside;
        }
    }
    return inside;
}

function distanceToSegment(p, a, b) {
    const dx = b[0] - a[0];
    const dz = b[1] - a[1];
    const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / (dx * dx + dz * dz || 1)));
    return Math.hypot(p[0] - a[0] - dx * t, p[1] - a[1] - dz * t);
}

// Erodes (grow = false) or dilates the cells of a mask by one cell, 4-neighbors.
function morph(mask, size, grow) {
    const out = new Uint8Array(size * size);
    for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
            const i = row * size + col;
            const near = [[col - 1, row], [col + 1, row], [col, row - 1], [col, row + 1]]
                .map(([c, r]) => (c < 0 || r < 0 || c >= size || r >= size ? 0 : mask[r * size + c]));
            out[i] = grow ? (mask[i] || near.some(Boolean) ? 1 : 0) : (mask[i] && near.every(Boolean) ? 1 : 0);
        }
    }
    return out;
}

/*
 * A clean outline for a block of building cells (world centers): the angle of its
 * smallest bounding rectangle, then in that frame one rectangle, or two (an L) when they
 * fit the cells much better, grown by one cell for the edge cells lost to the roughness
 * test. The outline of their union is returned in world feet.
 */
function fitRectilinear(points, cell) {
    let best = null;
    for (let degrees = 0; degrees < 90; degrees += 1) {
        const angle = (degrees * Math.PI) / 180;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        let u0 = Infinity; let u1 = -Infinity; let v0 = Infinity; let v1 = -Infinity;
        for (const [x, z] of points) {
            const u = x * cos + z * sin;
            const v = -x * sin + z * cos;
            u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v);
        }
        const area = (u1 - u0) * (v1 - v0);
        if (!best || area < best.area) best = { area, angle, cos, sin, u0, v0, u1, v1 };
    }
    const { cos, sin } = best;
    const nu = Math.ceil((best.u1 - best.u0) / cell) + 1;
    const nv = Math.ceil((best.v1 - best.v0) / cell) + 1;
    let grid = new Uint8Array(nu * nv);
    for (const [x, z] of points) {
        const iu = Math.floor((x * cos + z * sin - best.u0) / cell);
        const iv = Math.floor((-x * sin + z * cos - best.v0) / cell);
        grid[iv * nu + iu] = 1;
    }
    // Close the small holes rotating a grid leaves.
    const square = Math.max(nu, nv);
    const padded = new Uint8Array(square * square);
    for (let v = 0; v < nv; v++) for (let u = 0; u < nu; u++) padded[v * square + u] = grid[v * nu + u];
    const closed = morph(morph(padded, square, true), square, false);
    grid = new Uint8Array(nu * nv);
    for (let v = 0; v < nv; v++) for (let u = 0; u < nu; u++) grid[v * nu + u] = closed[v * square + u];

    const filled = [];
    for (let v = 0; v < nv; v++) for (let u = 0; u < nu; u++) if (grid[v * nu + u]) filled.push([u, v]);
    const boxOf = (cells) => cells.reduce((b, [u, v]) => ({
        u0: Math.min(b.u0, u), u1: Math.max(b.u1, u), v0: Math.min(b.v0, v), v1: Math.max(b.v1, v),
    }), { u0: Infinity, u1: -Infinity, v0: Infinity, v1: -Infinity });
    const mismatch = (boxes) => {
        let wrong = 0;
        for (let v = 0; v < nv; v++) {
            for (let u = 0; u < nu; u++) {
                const covered = boxes.some((b) => u >= b.u0 && u <= b.u1 && v >= b.v0 && v <= b.v1);
                if (covered !== Boolean(grid[v * nu + u])) wrong++;
            }
        }
        return wrong;
    };
    let boxes = [boxOf(filled)];
    const single = mismatch(boxes);
    let bestPair = null;
    for (const axis of [0, 1]) {
        const count = axis === 0 ? nu : nv;
        for (let k = 2; k < count - 1; k++) {
            const first = filled.filter((c) => c[axis] < k);
            const second = filled.filter((c) => c[axis] >= k);
            if (first.length < 4 || second.length < 4) continue;
            const pair = [boxOf(first), boxOf(second)];
            const wrong = mismatch(pair);
            if (!bestPair || wrong < bestPair.wrong) bestPair = { wrong, pair };
        }
    }
    if (bestPair && bestPair.wrong <= single * L_GAIN) {
        boxes = bestPair.pair;
    }

    // Union of the boxes, one cell bigger all round, traced at quarter-cell steps.
    const step = cell / 4;
    const toFine = (b) => ({ a0: b.u0 * 4 - 4, a1: b.u1 * 4 + 7, b0: b.v0 * 4 - 4, b1: b.v1 * 4 + 7 });
    const fine = boxes.map(toFine);
    const fu = Math.max(...fine.map((b) => b.a1)) + 2;
    const fv = Math.max(...fine.map((b) => b.b1)) + 2;
    const offset = 5;
    const fineSize = Math.max(fu, fv) + offset * 2;
    const cellsIn = [];
    for (const b of fine) {
        for (let v = b.b0; v <= b.b1; v++) {
            for (let u = b.a0; u <= b.a1; u++) cellsIn.push((v + offset) * fineSize + (u + offset));
        }
    }
    const loop = traceOutline(fineSize, [...new Set(cellsIn)]);
    // Keep only the corners (drop points along straight runs).
    const corners = loop.filter((p, i) => {
        const a = loop[(i + loop.length - 1) % loop.length];
        const b = loop[(i + 1) % loop.length];
        return (p[0] - a[0]) * (b[1] - p[1]) !== (p[1] - a[1]) * (b[0] - p[0]);
    });
    return corners.map(([fu2, fv2]) => {
        const u = best.u0 + (fu2 - offset) * step;
        const v = best.v0 + (fv2 - offset) * step;
        return [u * cos - v * sin, u * sin + v * cos];
    });
}

function distanceToRing(point, ring) {
    let best = { distance: Infinity, at: null };
    ring.forEach((a, i) => {
        const b = ring[(i + 1) % ring.length];
        const dx = b[0] - a[0];
        const dz = b[1] - a[1];
        const t = Math.max(0, Math.min(1, ((point[0] - a[0]) * dx + (point[1] - a[1]) * dz) / (dx * dx + dz * dz || 1)));
        const at = [a[0] + dx * t, a[1] + dz * t];
        const distance = Math.hypot(point[0] - at[0], point[1] - at[1]);
        if (distance < best.distance) best = { distance, at };
    });
    return best;
}

/**
 * @param scan     the grid from googleTiles3d scan()
 * @param anchors  fence points the building is looked for next to (an open fence's two
 *                 ends, else all its corners)
 * @param fence    { segments: [[a, b]], yard: polygon or null } in scene feet: no building
 *                 is on the fence line, nor inside the yard of an open fence (pass its
 *                 polygon, closed by the line between its ends)
 * @returns { building: { outline, eave, ridge, flat, roofColor } or null,
 *            trees: [{ at, radius, height }], paving: [{ x0, x1, z0, z1, light }] }
 *          in scene feet, heights above the ground
 */
export function readScan(scan, anchors, fence = { segments: [], yard: null }) {
    const { size, cell, x0, z0, height, color } = scan;
    const known = [];
    for (let i = 0; i < height.length; i++) {
        if (!Number.isNaN(height[i])) known.push(height[i]);
    }
    if (known.length < size * size * 0.3) return null;
    const ground = percentile(known, GROUND_PERCENTILE);
    const rgb = (i) => [color[i * 3], color[i * 3 + 1], color[i * 3 + 2]];
    const above = (i) => (Number.isNaN(height[i]) ? -Infinity : height[i] - ground);
    const center = (i) => [x0 + ((i % size) + 0.5) * cell, z0 + (Math.floor(i / size) + 0.5) * cell];

    // The building next to the fence: smooth, high, not green, clear of the fence and yard.
    let building = null;
    const valueAt = (row, col) => (row < 0 || col < 0 || row >= size || col >= size ? NaN : height[row * size + col]);
    const roof = new Uint8Array(size * size);
    for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
            const i = row * size + col;
            if (!(above(i) > BUILDING_MIN_FT) || isGreen(...rgb(i))) continue;
            const near = [valueAt(row - 1, col), valueAt(row + 1, col), valueAt(row, col - 1), valueAt(row, col + 1)];
            if (near.some(Number.isNaN)) continue;
            const mean = near.reduce((t, v) => t + v, 0) / 4;
            if (Math.abs(height[i] - mean) > ROOF_ROUGHNESS) continue;
            const p = center(i);
            if (fence.segments.some(([a, b]) => distanceToSegment(p, a, b) < FENCE_CLEARANCE)) continue;
            if (fence.yard && pointInRing(p, fence.yard)) continue;
            roof[i] = 1;
        }
    }
    // Opening: cuts the thin links between a roof and the trees against it.
    const opened = morph(morph(roof, size, false), size, true);
    const blocks = components(size, (i) => opened[i] === 1, false)
        .filter((cells) => cells.length * cell * cell >= BUILDING_MIN_AREA);
    let nearest = null;
    for (const cells of blocks) {
        let gap = Infinity;
        for (const anchor of anchors) {
            for (const i of cells) {
                const [x, z] = center(i);
                gap = Math.min(gap, Math.hypot(x - anchor[0], z - anchor[1]));
            }
        }
        if (!nearest || gap < nearest.gap) nearest = { cells, gap };
    }
    if (nearest && nearest.gap < 40) {
        const outline = fitRectilinear(nearest.cells.map(center), cell);
        const tops = nearest.cells.map(above);
        const eave = percentile(tops, 0.2);
        const ridge = percentile(tops, 0.9);
        const middle = percentile(tops, 0.5);
        // Slope at each roof cell toward the cells SLOPE_SPAN east and south, in the block.
        const inBlock = new Set(nearest.cells);
        const slopes = [];
        for (const i of nearest.cells) {
            const east = i + SLOPE_SPAN;
            const south = i + size * SLOPE_SPAN;
            if ((i % size) + SLOPE_SPAN < size && inBlock.has(east) && inBlock.has(south)) {
                slopes.push(Math.hypot(height[east] - height[i], height[south] - height[i]) / (cell * SLOPE_SPAN));
            }
        }
        const roofColors = nearest.cells.map(rgb).sort((a, b) => (a[0] + a[1] + a[2]) - (b[0] + b[1] + b[2]));
        const kept = roofColors.slice(Math.floor(roofColors.length * 0.3), Math.ceil(roofColors.length * 0.95));
        const mean = [0, 1, 2].map((k) => Math.round(kept.reduce((t, c) => t + c[k], 0) / kept.length));
        building = {
            outline,
            eave,
            // A flat roof's height is its typical level, not its highest points (parapets,
            // equipment, overhanging trees).
            ridge: slopes.length && percentile(slopes, 0.5) < FLAT_SLOPE ? middle : ridge,
            // A flat roof is level cell to cell (even with steps between parts); a pitched
            // one slopes up to its ridge.
            flat: slopes.length ? percentile(slopes, 0.5) < FLAT_SLOPE : ridge - eave < 2.5,
            roofColor: `#${mean.map((c) => c.toString(16).padStart(2, '0')).join('')}`,
        };
    }

    // Trees: leafy clumps above head height, at their real height.
    const trees = [];
    for (const cells of components(size, (i) => above(i) > TREE_MIN_FT && isGreen(...rgb(i)), true)) {
        const area = cells.length * cell * cell;
        if (area < TREE_MIN_AREA) continue;
        const tall = percentile(cells.map(above), 0.9);
        const radius = Math.sqrt(area / Math.PI);
        if (radius <= 16) {
            const points = cells.map(center);
            trees.push({
                at: [points.reduce((t, p) => t + p[0], 0) / points.length, points.reduce((t, p) => t + p[1], 0) / points.length],
                radius: Math.max(3, radius),
                height: tall,
            });
        } else {
            // A grove or a row: trees about 18 ft apart across it.
            const placed = [];
            for (const i of cells) {
                const p = center(i);
                if (placed.every((q) => Math.hypot(q[0] - p[0], q[1] - p[1]) >= 18)) placed.push(p);
            }
            placed.forEach((p) => trees.push({ at: p, radius: 9, height: tall }));
        }
    }

    /*
     * Paving: gray at ground level, light (concrete) or dark (asphalt, which must also be
     * grayer: shadows on the lawn are dark and dull too). A 3 x 3 majority vote removes
     * stray cells and smooths edges; patches below PAVING_MIN_AREA are dropped. The rest
     * is joined along each row into strips.
     */
    const NONE = 0;
    const LIGHT = 1;
    const DARK = 2;
    const brightness = (i) => (color[i * 3] + color[i * 3 + 1] + color[i * 3 + 2]) / 3;
    const spread = (i) => {
        const row = Math.floor(i / size);
        const col = i % size;
        const values = [];
        for (let dr = -2; dr <= 2; dr++) {
            for (let dc = -2; dc <= 2; dc++) {
                const r = row + dr;
                const c = col + dc;
                if (r >= 0 && c >= 0 && r < size && c < size) values.push(brightness(r * size + c));
            }
        }
        const mean = values.reduce((t, v) => t + v, 0) / values.length;
        return Math.sqrt(values.reduce((t, v) => t + (v - mean) ** 2, 0) / values.length);
    };
    const raw = new Uint8Array(size * size);
    for (let i = 0; i < size * size; i++) {
        const [r, g, b] = rgb(i);
        const light = (r + g + b) / 3;
        if (Math.abs(above(i)) > PAVING_BAND_FT) continue;
        // Concrete is near neutral and even; sand and dry soil are warmer or mottled.
        if (light > 140 && light < 235 && saturation(r, g, b) < 0.1 && spread(i) < CONCRETE_EVENNESS) raw[i] = LIGHT;
        else if (light > 60 && light <= 140 && saturation(r, g, b) < 0.1) raw[i] = DARK;
    }
    const kind = new Uint8Array(size * size);
    for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
            const votes = [0, 0, 0];
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    const r = row + dr;
                    const c = col + dc;
                    votes[r < 0 || c < 0 || r >= size || c >= size ? NONE : raw[r * size + c]]++;
                }
            }
            kind[row * size + col] = votes[LIGHT] >= 5 ? LIGHT : votes[DARK] >= 5 ? DARK : NONE;
        }
    }
    for (const [type, minArea] of [[LIGHT, PAVING_MIN_AREA.light], [DARK, PAVING_MIN_AREA.dark]]) {
        for (const cells of components(size, (i) => kind[i] === type, false)) {
            if (cells.length * cell * cell < minArea) {
                for (const i of cells) kind[i] = NONE;
            }
        }
    }
    const paving = [];
    for (let row = 0; row < size; row++) {
        let open = null;
        for (let col = 0; col <= size; col++) {
            const type = col < size ? kind[row * size + col] : NONE;
            if (type !== NONE && open && open.type === type) {
                open.x1 = x0 + (col + 1) * cell;
            } else {
                if (open) paving.push({ x0: open.x0, x1: open.x1, z0: open.z0, z1: open.z1, light: open.type === LIGHT });
                open = type !== NONE ? { type, x0: x0 + col * cell, x1: x0 + (col + 1) * cell, z0: z0 + row * cell, z1: z0 + (row + 1) * cell } : null;
            }
        }
    }

    return { building, trees, paving, ground };
}

/** Where an open fence's end should meet the building wall: the nearest wall point within reach. */
export function wallPoint(point, outline, reach = 15) {
    const { distance, at } = distanceToRing(point, outline);
    return distance > 0.5 && distance <= reach ? at : null;
}
