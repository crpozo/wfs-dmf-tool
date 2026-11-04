/*
 * Satellite map with the options from the Phase 2 requirements: straight-down imagery
 * (no 45° tilt, no rotation), zoom 18 to 21, scale bar, Map / Satellite toggle.
 */

// Fort Myers, used until the customer searches an address or shares their location.
export const DEFAULT_CENTER = { lat: 26.6406, lng: -81.8723 };
export const DEFAULT_ZOOM = 20;

export function createMap({ element, Map, mapId, center }) {
    const map = new Map(element, {
        mapId,
        center: center || DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM,
        minZoom: 18,
        maxZoom: 21,
        mapTypeId: 'satellite',
        mapTypeControl: true,
        mapTypeControlOptions: {
            mapTypeIds: ['roadmap', 'satellite'],
            style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
            position: google.maps.ControlPosition.TOP_RIGHT,
        },
        tilt: 0,
        heading: 0,
        tiltInteractionEnabled: false,
        headingInteractionEnabled: false,
        rotateControl: false,
        scaleControl: true,
        streetViewControl: false,
        fullscreenControl: false,
        clickableIcons: false,
        // A double tap in draw mode must add one point, not zoom the map.
        disableDoubleClickZoom: true,
        gestureHandling: 'greedy',
    });

    // Some areas switch to 45° imagery at high zoom; keep the view straight down.
    map.addListener('tilt_changed', () => {
        if (map.getTilt()) {
            map.setTilt(0);
        }
    });
    map.addListener('heading_changed', () => {
        if (map.getHeading()) {
            map.setHeading(0);
        }
    });

    useImperialScale(element, map);

    return map;
}

// The Maps API has no option for the scale bar units and may start in meters. The bar
// toggles metric/imperial on click, so click it once if it shows meters or kilometers.
function useImperialScale(element, map) {
    const isMetric = (text) => /\d\s*(m|km)\s*$/.test(text.trim());
    const findScale = () => [...element.querySelectorAll('.gm-style-cc')]
        .find((control) => isMetric(control.textContent.replace(/Click to toggle.*$/i, '')));

    google.maps.event.addListenerOnce(map, 'tilesloaded', () => {
        // The control renders a moment after the first tiles.
        setTimeout(() => findScale()?.querySelector('button, [role="button"]')?.click() ?? findScale()?.click(), 300);
    });
}
