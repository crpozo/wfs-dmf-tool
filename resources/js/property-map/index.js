/*
 * Draw on your property (Phase 2, Feature 1).
 *
 * Entry point loaded only on the drawing step. Google Maps is fetched here, on demand,
 * with the browser key from GOOGLE_MAPS_BROWSER_KEY. If the key is invalid or the
 * script can't load, the page falls back to the classic canvas with a notice.
 *
 * Not in this module yet: usage logging.
 */
import { importLibrary, setOptions } from '@googlemaps/js-api-loader';
import { createProjectStore } from './project.js';
import { createMap } from './map-view.js';
import { createModeState, initialMode } from './mode.js';
import { mountSearch } from './search.js';
import { mountDrawing } from './drawing.js';
import { mountPanel } from './panel.js';
import { mountToolbar } from './toolbar.js';
import { createViewSwitch } from './view-switch.js';
import { loadSavedProject, mountActions } from './actions.js';

const FEET_PER_METER = 3.28084;

const root = document.getElementById('propertyMap');
const config = window.WFS_PROPERTY_MAP || {};

if (root) {
    boot();
}

async function boot() {
    config.booted = true; // tells the inline safety timer in the Blade partial that this bundle ran
    const view = createViewSwitch({ root, classicBar: document.getElementById('propertyMapClassicBar') });

    if (!config.browserKey) {
        view.fail();
        return;
    }

    // Google calls this global when the key is rejected (wrong key, referrer, billing).
    window.gm_authFailure = () => view.fail('auth');

    try {
        setOptions({ key: config.browserKey, v: 'weekly', language: 'en', region: 'US' });
        const [maps, marker, geometry, places, geocoding] = await Promise.all([
            importLibrary('maps'),
            importLibrary('marker'),
            importLibrary('geometry'),
            importLibrary('places'),
            importLibrary('geocoding'),
        ]);
        start({ view, maps, marker, geometry, places, geocoding });
    } catch (error) {
        console.error('Property map failed to load', error);
        view.fail('load');
    }
}

function start({ view, maps, marker, geometry, places, geocoding }) {
    const { spherical } = geometry;
    const distanceFt = (a, b) => Math.round(
        spherical.computeDistanceBetween({ lat: a.lat, lng: a.lng }, { lat: b.lat, lng: b.lng }) * FEET_PER_METER
    );

    const store = createProjectStore({ distanceFt });
    const mode = createModeState(initialMode());
    const notify = createNotifier(root.querySelector('[data-pm-message]'));

    const map = createMap({ element: root.querySelector('[data-pm-map]'), Map: maps.Map, mapId: config.mapId });
    map.addListener('idle', () => store.setView({ center: map.getCenter().toJSON(), zoom: map.getZoom() }));

    let panel;
    const drawing = mountDrawing({
        map,
        store,
        mode,
        notify,
        libs: {
            Polyline: maps.Polyline,
            InfoWindow: maps.InfoWindow,
            AdvancedMarkerElement: marker.AdvancedMarkerElement,
            spherical,
        },
        onRunFocus: (key) => panel?.focusRun(key),
    });
    panel = mountPanel({
        root,
        store,
        notify,
        materials: config.materials || [],
        onRunFocus: (key) => drawing.revealRun(key),
    });
    const actions = mountActions({ root, store, notify });
    mountToolbar({ root, store, mode, onBeforeChange: drawing.closeMenu });
    mountSearch({
        root,
        map,
        store,
        places,
        geocoder: new geocoding.Geocoder(),
        notify,
    });

    // 3D view: three.js and the scene builder are downloaded on the first click only.
    root.querySelector('[data-pm-action="view3d"]')?.addEventListener('click', async (event) => {
        const button = event.currentTarget;
        button.disabled = true;
        try {
            const viewer3d = await import('./viewer3d.js');
            await viewer3d.open({
                project: store.toJSON(),
                materials: config.materials || [],
                fetchScene: fetchScene3d,
            });
        } catch (error) {
            console.error(error);
            notify('The 3D view could not be opened. Please try again.');
        } finally {
            button.disabled = false;
        }
    });

    view.showMap();

    const loadProject = (project) => {
        store.load(project);
        if (project.center) {
            map.setCenter(project.center);
            map.setZoom(project.zoom || 20);
        }
    };

    // Opened from a saved link (/property-map/p/<token> redirects here with ?project=).
    const savedToken = new URLSearchParams(window.location.search).get('project');
    if (savedToken) {
        loadSavedProject({ token: savedToken, loadProject, notify });
    }

    // Access for the next steps (quote image) and for debugging.
    window.WFS = window.WFS || {};
    window.WFS.propertyMap = {
        getProject: () => store.toJSON(),
        quoteImage: actions.quoteImage,
        loadProject,
        showMap: view.showMap,
        showClassic: view.showClassic,
    };
}

function createNotifier(element) {
    let timer = null;
    return (message) => {
        if (!element) {
            return;
        }
        element.textContent = message;
        element.hidden = false;
        clearTimeout(timer);
        timer = setTimeout(() => {
            element.hidden = true;
        }, 6000);
    };
}

async function fetchScene3d(project) {
    const response = await fetch('/property-map/scene', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content || '',
        },
        body: JSON.stringify({ project }),
    });
    if (!response.ok) {
        throw new Error(`Scene request failed with ${response.status}`);
    }
    return response.json();
}
