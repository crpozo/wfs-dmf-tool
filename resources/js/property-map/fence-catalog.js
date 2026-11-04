/*
 * Translates the app's fence configuration (session "materials", the answers from
 * resources/steps.json) into the options of the 3D fence builder (fence3d/cerca.js):
 * { mat, estilo, alto, color, rieles }.
 *
 * The two catalogs don't match one to one. Where the 3D builder has no exact style the
 * closest one is used, noted below:
 *   - Aluminum "3 rail smooth bottom" -> 'Pool Code' (three rails, pickets end at the bottom rail)
 *   - Vinyl designs (lattice, shadowbox, louvered, two tone) -> their base style
 *   - Two-tone vinyl colors -> the first color
 * Colors use the website viewer's palette, tuned against product photos.
 */

const PALETTE = {
    black: '#1c1c1c',
    bronze: '#4a3728',
    white: '#f2f2ee',
    sand: '#d6c9ae',
    gray: '#8b8b88',
    woodgrain: '#7a5c3e', // cerca.js switches to the wood texture on this exact value
};

// Colors offered in the 3D view per material (preview only).
export const COLOR_CHOICES = {
    aluminum: ['black', 'bronze', 'white'],
    metal: ['black', 'bronze', 'white', 'woodgrain'],
    vinyl: ['white', 'sand', 'gray'],
    'chain-link': ['galvanized', 'black', 'green'],
};

export const COLOR_LABELS = {
    black: 'Black', bronze: 'Bronze', white: 'White', sand: 'Sand', gray: 'Gray',
    woodgrain: 'Woodgrain', galvanized: 'Galvanized', green: 'Green',
};

export const SWATCHES = {
    ...PALETTE,
    galvanized: '#b9bec4',
    green: '#2f5233',
};

const MATERIAL_BY_DIGIT = { 1: 'aluminum', 2: 'chain-link', 3: 'metal', 4: 'vinyl' };

const lower = (value) => String(value || '').toLowerCase();

function colorKey(text) {
    const value = lower(text);
    if (value.includes('wood')) return 'woodgrain';
    if (value.includes('bronze')) return 'bronze';
    if (value.includes('black')) return 'black';
    if (value.includes('green')) return 'green';
    if (value.includes('galvan')) return 'galvanized';
    if (value.includes('sand') || value.includes('tan')) return 'sand';
    if (value.includes('gray') || value.includes('grey')) {
        return value.includes('white') && value.indexOf('white') < value.indexOf('gr') ? 'white' : 'gray';
    }
    return 'white';
}

function aluminumStyle(style) {
    const value = lower(style);
    if (value.includes('pool')) return 'Pool Code';
    if (value.includes('puppy')) return '3-Rail Puppy Picket';
    if (value.includes('rake')) return '3-Rail Rake Bottom';
    if (value.includes('3 rail')) return 'Pool Code';
    return '2-Rail Smooth Bottom';
}

function vinylStyle(style, design) {
    const value = `${lower(style)} ${lower(design)}`;
    if (value.includes('semi')) return 'Semi-Privacy';
    if (value.includes('picket')) return 'Picket';
    return 'Privacy';
}

function chainLinkStyle(colorChoice, type) {
    if (colorChoice === 'black') return 'Black PVC-coated';
    if (colorChoice === 'green') return 'Green PVC-coated';
    return lower(type).includes('heavy') ? 'Heavy Gauge' : 'Galvanized';
}

function heightFt(text) {
    const value = parseFloat(String(text || '').replace(/[^0-9.]/g, ''));
    return Number.isFinite(value) && value > 0 ? value : 6;
}

/**
 * @param material one entry of the configuration: { code, fields: { style, color, height, ... } }
 * @param colorOverride optional color key from COLOR_CHOICES (3D preview only)
 */
export function fenceOptions(material, colorOverride = null) {
    const fields = material?.fields || {};
    const mat = MATERIAL_BY_DIGIT[String(material?.code || '').charAt(0)] || 'aluminum';
    const color = colorOverride || colorKey(fields.color);
    const options = { mat, alto: heightFt(fields.height), rieles: 2, colorKey: color };

    if (mat === 'chain-link') {
        options.estilo = chainLinkStyle(color, fields.type);
        options.color = null;
    } else if (mat === 'vinyl') {
        options.estilo = vinylStyle(fields.style, fields.design);
        options.color = PALETTE[color] || PALETTE.white;
    } else if (mat === 'metal') {
        options.estilo = lower(fields.style).includes('modern') ? 'Modern' : 'Original';
        options.rieles = lower(fields.rails).includes('3') ? 3 : 2;
        options.color = PALETTE[color] || PALETTE.black;
    } else {
        options.estilo = aluminumStyle(fields.style);
        options.color = PALETTE[color] || PALETTE.black;
    }
    return options;
}
