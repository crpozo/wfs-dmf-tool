/*
 * Satellite / Plan background of the map. Plan covers the imagery with plain white
 * tiles, so the same drawing, with the same corners, gates and labels, reads like a
 * technical plan. It is only a way of looking at the drawing: the project, its lengths
 * and the quote are untouched, and the choice is not saved with the project.
 *
 * The white tiles are an overlay map type: Google draws those above the base map and
 * below polylines and markers.
 */
export function mountPlanView({ map, background, Size }) {
    const whiteTiles = {
        tileSize: new Size(256, 256),
        maxZoom: 22,
        name: 'Plan',
        alt: 'Technical plan: the drawing without the satellite image',
        getTile(coordinate, zoom, ownerDocument) {
            const tile = ownerDocument.createElement('div');
            tile.style.cssText = 'width:256px;height:256px;background:#ffffff;';
            return tile;
        },
        releaseTile() {},
    };

    function apply() {
        const layers = map.overlayMapTypes;
        const index = layers.getArray().indexOf(whiteTiles);
        if (background.get() === 'plan' && index === -1) {
            layers.insertAt(0, whiteTiles);
        } else if (background.get() !== 'plan' && index !== -1) {
            layers.removeAt(index);
        }
    }

    background.subscribe(apply);
    apply();
}
