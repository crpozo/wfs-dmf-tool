/*
 * Static demo of "Draw on your property" for client review (GitHub Pages, no Laravel).
 *
 * It runs the same map and 3D modules as the app. What needs the server (materials list,
 * save by link, quote) is replaced by a short note, the fence configuration comes from the
 * picker in this page instead of the app's steps, and the 3D house is looked up from the
 * browser. Built with `npm run build:demo` (vite.demo.config.js).
 */
import '../../public/css/wfs-brand.css';
// Panel, labels and buttons as on the drawing pages (scoped to body.drawing).
import '../../public/drawfence-embed/embed.css';
import '../css/property-map.css';
import './demo.css';
import { fetchScene } from './footprints.js';

// The same answers as resources/steps.json; the first digit of the code is the material.
const CATALOG = {
    aluminum: {
        code: '1',
        name: 'Aluminum',
        style: ['2 rail smooth bottom residential', '3 rail smooth bottom residential', '3 rail rake bottom residential',
            '3 rail puppy picket bottom residential', '2 rail smooth bottom commercial (Pool Code)'],
        height: ['4 Feet', '5 Feet', '6 Feet'],
        color: ['Black', 'Bronze', 'White'],
    },
    vinyl: {
        code: '4',
        name: 'Vinyl',
        style: ['Vinyl Privacy Fence', 'Vinyl Semi Privacy Fence', 'Vinyl Picket Fence'],
        height: ['4 Feet', '5 Feet', '6 Feet'],
        color: ['White', 'Sand', 'Gray'],
    },
    metal: {
        code: '3',
        name: 'Metal',
        style: ['Modern Style', 'Original Style'],
        height: ['6 Feet', '8 Feet'],
        color: ['Black', 'Bronze', 'White', 'Woodgrain'],
        rails: ['2 Rails', '3 Rails'],
    },
    chain: {
        code: '2',
        name: 'Chain Link',
        type: ['Residential', 'Light Commercial', 'Heavy Commercial'],
        height: ['4 Feet', '5 Feet', '6 Feet'],
        color: ['Galvanized', 'Black Vinyl Coated', 'Green Vinyl Coated'],
    },
};

const FIELDS = [
    ['style', 'Style'],
    ['type', 'Type'],
    ['height', 'Height'],
    ['color', 'Color'],
    ['rails', 'Rails'],
];

// One fence slot, as the app's configuration. The object is updated in place so the map
// and the 3D view, which keep a reference to it, always read the current choice.
const material = { slot: 1, code: '1', label: '', fields: {} };

const picker = document.querySelector('[data-demo-picker]');
const materialSelect = picker.querySelector('[data-demo="material"]');
const fieldsBox = picker.querySelector('[data-demo-fields]');

materialSelect.innerHTML = Object.entries(CATALOG)
    .map(([key, item]) => `<option value="${key}">${item.name}</option>`).join('');

function renderFields() {
    const item = CATALOG[materialSelect.value];
    fieldsBox.innerHTML = FIELDS.filter(([field]) => item[field]).map(([field, label]) => `
        <label class="demo-field">
            <span>${label}</span>
            <select class="form-select wfs-input" data-field="${field}">
                ${item[field].map((value) => `<option>${value}</option>`).join('')}
            </select>
        </label>`).join('');
    apply();
}

function apply() {
    const item = CATALOG[materialSelect.value];
    const fields = { material: `${item.name} Fence` };
    fieldsBox.querySelectorAll('[data-field]').forEach((select) => {
        fields[select.dataset.field] = select.value;
    });
    material.code = item.code;
    material.fields = fields;
    material.label = [fields.height, item.name, fields.style || fields.type, fields.color].filter(Boolean).join(' · ');
}

materialSelect.addEventListener('change', renderFields);
fieldsBox.addEventListener('change', apply);
renderFields();

window.WFS_PROPERTY_MAP = {
    browserKey: __DEMO_MAPS_KEY__,
    mapId: __DEMO_MAP_ID__,
    materials: [material],
    fetchScene,
};
document.body.classList.add('pm-map-active');

// After the configuration exists: the map module reads it when it loads.
import('../js/property-map/index.js');
