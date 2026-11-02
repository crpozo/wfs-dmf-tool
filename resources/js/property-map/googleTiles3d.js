/*
 * Google Photorealistic 3D Tiles as a hidden 3D scanner of the customer's property.
 *
 * The tiles are never shown: their meshes look melted close up. They are streamed around
 * the fence with 3d-tiles-renderer, then scan() renders them straight down twice, once
 * writing each point's height and once its color, into a grid over the property. From
 * that grid tileScan.js measures the real building's outline, height and roof, the trees
 * and the paving, which the viewer rebuilds as clean geometry.
 *
 * Frame: the tiles are re-centered so the viewer's origin sits at (0, 0, 0), scaled from
 * meters to feet and turned so +X is east, +Y up and -Z north, as in viewer3d.js
 * (sceneFeet). The turn is measured, not assumed: when the root tileset loads, the
 * reoriented north and up directions are read back and the container is rotated to match.
 *
 * Needs a Google Maps key with the Map Tiles API enabled, and float render targets
 * (WebGL 2 with EXT_color_buffer_float). Otherwise `ready` resolves false and the viewer
 * builds the property from public records and the satellite photo instead.
 */
import {
    Group, Raycaster, Vector3, Box3, Matrix4, Scene, OrthographicCamera, WebGLRenderTarget,
    FloatType, RGBAFormat, ShaderMaterial, DoubleSide, Color,
} from 'three';
import { TilesRenderer, OBB } from '3d-tiles-renderer';
import {
    GoogleCloudAuthPlugin, GLTFExtensionsPlugin, ReorientationPlugin, LoadRegionPlugin, OBBRegion,
} from '3d-tiles-renderer/plugins';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

const ROOT_URL = 'https://tile.googleapis.com/v1/3dtiles/root.json';
const DRACO_DECODERS = 'https://www.gstatic.com/draco/versioned/decoders/1.5.7/';
const FEET_PER_METER = 1 / 0.3048;
// How long to wait for real ground under the fence before giving up on the tiles.
const READY_TIMEOUT_MS = 20000;
// Rays and the scan camera start this far above the scene (ft): the ground can sit
// thousands of feet above or below the ellipsoid the tiles are centered on.
const RAY_START_FT = 30000;
// Screen-space error target while scanning: sharp enough for ~1 ft cells.
const ERROR_TARGET = 1.5;
// Ground height range (m, above the ellipsoid) the load region spans: any place in the US.
const REGION_FLOOR_M = -500;
const REGION_CEILING_M = 4500;
// Camera range while the tiles load (ft): the ground may be far from y = 0 until found.
const CAMERA_NEAR = 1;
const CAMERA_FAR = 15000;

const DEG = Math.PI / 180;

/**
 * @param apiKey   Google Maps key with the Map Tiles API enabled
 * @param origin   { lat, lng } of the viewer's (0, 0, 0)
 * @param area     { center: [x, z], half } (ft): the square that is loaded and scanned
 * @param camera   the viewer's camera, which drives the level of detail while loading
 * @param renderer the viewer's WebGLRenderer
 */
export function createGoogleTiles({ apiKey, origin, area, camera, renderer }) {
    const tiles = new TilesRenderer(ROOT_URL);
    tiles.registerPlugin(new GoogleCloudAuthPlugin({ apiToken: apiKey, autoRefreshToken: true }));
    const draco = new DRACOLoader().setDecoderPath(DRACO_DECODERS);
    tiles.registerPlugin(new GLTFExtensionsPlugin({ dracoLoader: draco }));
    tiles.registerPlugin(new ReorientationPlugin({ lat: origin.lat * DEG, lon: origin.lng * DEG, recenter: true }));

    /*
     * Load region: a box in the tileset's frame (meters, east-north-up at the origin) over
     * the scanned square, tall enough for any ground height. As a mask, tiles outside it
     * are never requested; its huge error target leaves the detail to the camera.
     */
    const [cx, cz] = area.center;
    const half = (area.half * 1.1 + Math.hypot(cx, cz)) / FEET_PER_METER;
    const enu = tiles.ellipsoid.getEastNorthUpFrame(origin.lat * DEG, origin.lng * DEG, 0, new Matrix4());
    const box = new OBB(new Box3(new Vector3(-half, -half, REGION_FLOOR_M), new Vector3(half, half, REGION_CEILING_M)), enu);
    const regions = new LoadRegionPlugin();
    regions.addRegion(new OBBRegion({ obb: box, mask: true, errorTarget: Infinity }));
    tiles.registerPlugin(regions);

    // After the Google plugin, which sets its own (coarser) default.
    tiles.errorTarget = ERROR_TARGET;
    tiles.setCamera(camera);
    tiles.setResolutionFromRenderer(camera, renderer);
    camera.near = CAMERA_NEAR;
    camera.far = CAMERA_FAR;
    camera.updateProjectionMatrix();

    // Meters to feet; turned below so +X is east and -Z north. Never shown.
    const container = new Group();
    container.scale.setScalar(FEET_PER_METER);
    container.visible = false;
    container.add(tiles.group);

    /*
     * Axis check. ReorientationPlugin documents X facing west and Z facing north; rather
     * than trusting that, read where points a little north, east and above the origin end
     * up, and turn the container about Y so north is -Z (east then is +X).
     */
    let aligned = false;
    tiles.addEventListener('load-root-tileset', () => {
        tiles.group.updateMatrix();
        const at = (lat, lon, height) => tiles.ellipsoid
            .getCartographicToPosition(lat * DEG, lon * DEG, height, new Vector3())
            .applyMatrix4(tiles.group.matrix);
        const base = at(origin.lat, origin.lng, 0);
        const north = at(origin.lat + 0.001, origin.lng, 0).sub(base).normalize();
        const east = at(origin.lat, origin.lng + 0.001, 0).sub(base).normalize();
        const up = at(origin.lat, origin.lng, 10).sub(base).normalize();
        // Rotating by r about Y adds r to a direction's angle atan2(x, z); north must end at
        // atan2(0, -1) = PI.
        container.rotation.y = Math.PI - Math.atan2(north.x, north.z);
        const eastAfter = east.clone().applyAxisAngle(new Vector3(0, 1, 0), container.rotation.y);
        aligned = up.y > 0.99 && eastAfter.x > 0.99;
        if (!aligned) {
            console.warn('Google 3D Tiles: unexpected axes after reorientation', { north, east, up });
        }
    });

    // Meshes are photos with their light baked in: unlit colors as captured.
    tiles.addEventListener('load-model', ({ scene }) => {
        scene.traverse((object) => {
            const materials = Array.isArray(object.material) ? object.material : object.material ? [object.material] : [];
            for (const material of materials) {
                material.toneMapped = false;
            }
        });
    });

    const raycaster = new Raycaster();
    const down = new Vector3(0, -1, 0);
    const start = new Vector3();
    // World height (ft) of the lowest surface under [x, z], or null where nothing has loaded.
    function groundAt([x, z]) {
        container.updateMatrixWorld(true);
        raycaster.set(start.set(x, container.position.y + RAY_START_FT, z), down);
        const hits = raycaster.intersectObject(tiles.group, true);
        return hits.length ? hits[hits.length - 1].point.y : null;
    }

    // three r169 always runs on WebGL 2; float targets still need this extension.
    const floatTargets = renderer.extensions.has('EXT_color_buffer_float');
    const ready = new Promise((resolve) => {
        let settled = false;
        let timer = null;
        const finish = (ok) => {
            if (!settled) {
                settled = true;
                clearTimeout(timer);
                resolve(ok);
            }
        };
        if (!floatTargets) {
            console.warn('Google 3D Tiles: float render targets not supported, cannot scan');
            finish(false);
            return;
        }
        timer = setTimeout(() => finish(false), READY_TIMEOUT_MS);
        // A failure without a tile is the root tileset: bad key, API not enabled, quota.
        tiles.addEventListener('load-error', ({ tile, error }) => {
            if (!tile) {
                console.warn('Google 3D Tiles unavailable', error);
                finish(false);
            }
        });
        tiles.addEventListener('tiles-load-end', () => {
            const y = aligned ? groundAt(area.center) : null;
            if (y !== null && !settled) {
                // Bring the ground near y = 0 so the camera refines from above it.
                container.position.y -= y;
                finish(true);
            }
        });
    });

    /*
     * Renders the tiles straight down over the scanned square into a size x size grid of
     * `cell` ft: the height (ft, world) and color (sRGB 0-255) at each cell's center, NaN
     * height where no mesh is. Rows run north to south, columns west to east; cell (0, 0)
     * starts at [x0, z0].
     */
    function scan(cell) {
        const size = Math.round((area.half * 2) / cell);
        const scene = new Scene();
        scene.add(container);
        container.visible = true;
        container.updateMatrixWorld(true);

        const eye = new OrthographicCamera(-area.half, area.half, area.half, -area.half, 1, RAY_START_FT * 2);
        eye.position.set(cx, container.position.y + RAY_START_FT, cz);
        eye.up.set(0, 0, -1); // image top is north
        eye.lookAt(cx, container.position.y, cz);
        eye.updateMatrixWorld();

        const target = new WebGLRenderTarget(size, size, { type: FloatType, format: RGBAFormat, depthBuffer: true });
        const previousTarget = renderer.getRenderTarget();
        const previousClear = renderer.getClearColor(new Color());
        const previousAlpha = renderer.getClearAlpha();
        renderer.setClearColor(0x000000, 0);

        // Color: the tiles' own materials, unlit. Render targets come out linear.
        renderer.setRenderTarget(target);
        renderer.clear();
        renderer.render(scene, eye);
        const colors = new Float32Array(size * size * 4);
        renderer.readRenderTargetPixels(target, 0, 0, size, size, colors);

        // Height: each fragment's world y, with alpha marking that a mesh is there.
        scene.overrideMaterial = new ShaderMaterial({
            side: DoubleSide,
            vertexShader: /* glsl */ `
                varying float vHeight;
                void main() {
                    vec4 world = modelMatrix * vec4(position, 1.0);
                    vHeight = world.y;
                    gl_Position = projectionMatrix * viewMatrix * world;
                }`,
            fragmentShader: /* glsl */ `
                varying float vHeight;
                void main() {
                    gl_FragColor = vec4(vHeight, 0.0, 0.0, 1.0);
                }`,
        });
        renderer.clear();
        renderer.render(scene, eye);
        const heights = new Float32Array(size * size * 4);
        renderer.readRenderTargetPixels(target, 0, 0, size, size, heights);

        renderer.setRenderTarget(previousTarget);
        renderer.setClearColor(previousClear, previousAlpha);
        scene.overrideMaterial.dispose();
        target.dispose();

        // readRenderTargetPixels starts at the bottom row (south); flip to north first.
        const toSrgb = (c) => Math.round(255 * Math.min(1, Math.max(0, c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055)));
        const height = new Float32Array(size * size);
        const color = new Uint8Array(size * size * 3);
        for (let row = 0; row < size; row++) {
            for (let col = 0; col < size; col++) {
                const from = ((size - 1 - row) * size + col) * 4;
                const to = row * size + col;
                height[to] = heights[from + 3] > 0.5 ? heights[from] : NaN;
                color[to * 3] = toSrgb(colors[from]);
                color[to * 3 + 1] = toSrgb(colors[from + 1]);
                color[to * 3 + 2] = toSrgb(colors[from + 2]);
            }
        }
        return { size, cell, x0: cx - area.half, z0: cz - area.half, height, color };
    }

    return {
        tiles,
        ready,
        scan,

        // Whether tiles are still downloading or being parsed.
        busy() {
            return tiles.downloadQueue.running || tiles.parseQueue.running;
        },

        // Every frame while loading, so the tiles keep refining.
        update() {
            camera.updateMatrixWorld();
            container.updateMatrixWorld(true);
            tiles.setCamera(camera);
            tiles.setResolutionFromRenderer(camera, renderer);
            tiles.update();
        },

        // Google's required data credits for the loaded tiles.
        attributions() {
            return tiles.getAttributions()
                .filter((item) => item.type === 'string' && item.value)
                .map((item) => item.value)
                .join('; ');
        },

        dispose() {
            tiles.dispose();
            draco.dispose();
        },
    };
}
