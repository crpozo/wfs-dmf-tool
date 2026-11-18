/*
 * Web Mercator, the projection of Google Maps, shared by every renderer: the interactive
 * map lays its labels out in these pixels, and the quote image and the technical plan
 * draw the whole fence with them, so lines, corners, gates and labels always agree.
 */

const TILE_SIZE = 256;

// Pixels of the whole world at a zoom level (fractional zooms included).
export function worldPoint({ lat, lng }, zoom) {
    const size = TILE_SIZE * 2 ** zoom;
    const sin = Math.sin((lat * Math.PI) / 180);
    return {
        x: ((lng + 180) / 360) * size,
        y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * size,
    };
}

export function worldToLatLng({ x, y }, zoom) {
    const size = TILE_SIZE * 2 ** zoom;
    const n = Math.PI * (1 - (2 * y) / size);
    return {
        lat: (Math.atan(Math.sinh(n)) * 180) / Math.PI,
        lng: (x / size) * 360 - 180,
    };
}

/*
 * Latitude and longitude to pixels of a Static Maps photo. `frame` is what the server
 * asked Google for: center, zoom and the size in Google's pixels (before scale=2);
 * `width` is the width in pixels the photo is drawn at.
 */
export function createProjection({ center, zoom, size, width, height }) {
    const origin = worldPoint(center, zoom);
    const scale = width / (size?.width || 640);
    const project = (point) => {
        const world = worldPoint(point, zoom);
        return {
            x: width / 2 + (world.x - origin.x) * scale,
            y: height / 2 + (world.y - origin.y) * scale,
        };
    };
    project.scale = scale;
    return project;
}

/*
 * Projection that fits the drawing into a box, keeping its proportions: the technical
 * plan. `fill` is the share of the box the drawing may take.
 */
export function createFitProjection(vertices, box, fill = 0.72) {
    const zoom = 20;
    const world = vertices.map((vertex) => worldPoint(vertex, zoom));
    const xs = world.map((p) => p.x);
    const ys = world.map((p) => p.y);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const spanX = Math.max(...xs) - minX;
    const spanY = Math.max(...ys) - minY;
    const scale = Math.min((box.width * fill) / (spanX || 1), (box.height * fill) / (spanY || 1));
    const offsetX = box.x + (box.width - spanX * scale) / 2;
    const offsetY = box.y + (box.height - spanY * scale) / 2;
    const project = (point) => {
        const p = worldPoint(point, zoom);
        return { x: offsetX + (p.x - minX) * scale, y: offsetY + (p.y - minY) * scale };
    };
    project.scale = scale;
    return project;
}

/*
 * Center and whole zoom level that show a drawing in a map of the given size in pixels,
 * taking at most `fill` of each dimension.
 */
export function fitView(vertices, size, { minZoom = 0, maxZoom = 22, fill = 0.7 } = {}) {
    const world = vertices.map((vertex) => worldPoint(vertex, 0));
    const xs = world.map((p) => p.x);
    const ys = world.map((p) => p.y);
    const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    const scale = Math.min((size.width * fill) / (maxX - minX || 1e-12), (size.height * fill) / (maxY - minY || 1e-12));
    const zoom = Math.max(minZoom, Math.min(maxZoom, Math.floor(Math.log2(scale))));
    return { center: worldToLatLng({ x: (minX + maxX) / 2, y: (minY + maxY) / 2 }, 0), zoom };
}

export function lerp(a, b, t) {
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

/*
 * The point a fraction `t` of the way along a side, on the straight line the map draws.
 * Not google.maps.geometry.spherical.interpolate: that one returns the start point when
 * the two ends are closer than a millionth of a radian (about 21 ft), so anything placed
 * with it on a short side collapses onto the side's first corner.
 */
export function pointOnSide(a, b, t) {
    const zoom = 20;
    return worldToLatLng(lerp(worldPoint(a, zoom), worldPoint(b, zoom), t), zoom);
}

/*
 * The stretch of a side a gate takes up, as fractions of the side. It is drawn to the
 * scale of the ground (the measured length), so it matches the photo even when the
 * customer typed a different length for the side; the quote keeps using the typed one.
 */
export function gateSpan(run, gate) {
    const feet = run.calc_ft > 0 ? run.calc_ft : (run.override_ft ?? 0);
    const half = feet > 0 ? gate.width_ft / 2 / feet : 0;
    return { from: Math.max(0, gate.t - half), to: Math.min(1, gate.t + half) };
}
