/*
 * Satellite / Plan background of the map. Plan covers the imagery with plain white
 * tiles, so the same drawing, with the same corners, gates and labels, reads like a
 * technical plan. It is only a way of looking at the drawing: the project, its lengths
 * and the quote are untouched, and the choice is not saved with the project.
 *
 * The white tiles are an overlay map type: Google draws those above the base map and
 * below polylines and markers, so drawing and editing work the same on both backgrounds
 * and switching is immediate. Google's logo, attribution and scale bar stay; the
 * Map / Satellite switch goes, since it changes an image Plan does not show.
 */
import { fitView } from './geometry.js';

const MIN_ZOOM = 18;
const MAX_ZOOM = 21;

export function mountPlanView({ map, background, store, Size }) {
    const whiteTiles = {
        tileSize: new Size(256, 256),
        maxZoom: 22,
        name: 'Plan',
        alt: 'Technical plan: the drawing without the satellite image',
        getTile(coordinate, zoom, ownerDocument) {
            const tile = ownerDocument.createElement('div');
            // One pixel over each edge: at fractional screen scales the tiles leave hairline
            // gaps between them, and the imagery underneath showed through as thin lines.
            tile.style.cssText = 'width:256px;height:256px;background:#ffffff;box-shadow:0 0 0 1px #ffffff;';
            tile.dataset.pmPlanTile = ''; // property-map.css shows it at once, without Google's fade
            return tile;
        },
        releaseTile() {},
    };

    // Entering Plan with the drawing out of view, or small enough to show at least twice
    // as large, frames it. A drawing already well in view is left where the customer put it.
    function frameDrawing() {
        const vertices = store?.state.vertices || [];
        if (vertices.length === 0) {
            return;
        }
        const box = map.getDiv().getBoundingClientRect();
        if (!(box.width > 0 && box.height > 0)) {
            return;
        }
        const fit = fitView(vertices, { width: box.width, height: box.height }, { minZoom: MIN_ZOOM, maxZoom: MAX_ZOOM });
        const bounds = map.getBounds();
        const inView = bounds ? vertices.every((vertex) => bounds.contains({ lat: vertex.lat, lng: vertex.lng })) : false;
        if (!inView || fit.zoom > map.getZoom()) {
            // One camera move, not a pan and then a zoom.
            if (map.moveCamera) {
                map.moveCamera({ center: fit.center, zoom: fit.zoom });
            } else {
                map.setCenter(fit.center);
                map.setZoom(fit.zoom);
            }
        }
    }

    function apply() {
        const plan = background.get() === 'plan';
        const layers = map.overlayMapTypes;
        const index = layers.getArray().indexOf(whiteTiles);
        if (plan && index === -1) {
            frameDrawing();
            layers.insertAt(0, whiteTiles);
            map.setOptions({ mapTypeControl: false });
        } else if (!plan && index !== -1) {
            layers.removeAt(index);
            map.setOptions({ mapTypeControl: true });
        }
    }

    background.subscribe(apply);
    apply();
}
