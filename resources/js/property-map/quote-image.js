/*
 * Images of the drawing: the satellite photo with the fence (what the quote sends to
 * email, Odoo and S3), the technical plan (same drawing on white, with every length
 * listed) and both together.
 *
 * The server only returns the plain photo and the frame it asked Google for. The whole
 * fence (sides, walls, gates, corners, connectors, labels) is drawn here with the shared
 * projection (geometry.js) and the shared label placement (label-layout.js), so nothing
 * can drift apart and the image shows what the customer sees on the map.
 */
import { createFitProjection, createProjection, gateSpan, lerp } from './geometry.js';
import { layoutLabels } from './label-layout.js';
import { describeLabels } from './labels.js';
import { BRAND, THEMES } from './theme.js';

const OUTPUT_WIDTH = 1280;
const UI_WIDTH = 640; // label sizes below are for an image this wide
const FONT_FAMILY = 'Montserrat, "Segoe UI", Roboto, sans-serif';
const FONT_SIZE = 14;
const LABEL_BACKGROUND = 'rgba(38, 49, 102, 0.92)';

const LABEL_STYLES = {
    side: { background: LABEL_BACKGROUND, color: BRAND.white, border: null, radius: 100 },
    adjustedSide: { background: BRAND.white, color: BRAND.ink, border: BRAND.blue, radius: 100 },
    gate: { background: BRAND.ink, color: BRAND.white, border: BRAND.white, radius: 6 },
};

// Google's logo (bottom left) and attribution (bottom edge) on a Static Maps photo, in
// Google's pixels. Labels keep out of them; they must stay readable.
const ATTRIBUTION = { stripHeight: 18, logoWidth: 76, logoHeight: 30 };

function loadImage(source) {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('The quote image could not be read.'));
        image.src = source;
    });
}

async function ready() {
    await document.fonts?.load(`700 ${FONT_SIZE * 2}px Montserrat`).catch(() => {});
}

function newCanvas(width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(width);
    canvas.height = Math.round(height);
    return canvas;
}

function labelFont(scale) {
    return `700 ${FONT_SIZE * scale}px ${FONT_FAMILY}`;
}

function measure(context, text, scale, round = false) {
    const height = (FONT_SIZE * 1.2 + 8) * scale;
    const width = context.measureText(text).width + (round ? 12 : 20) * scale;
    return { width: Math.max(width, round ? height : 0), height };
}

function drawSides(context, sides, theme, scale) {
    context.lineJoin = 'round';
    for (const { run, a, b } of sides) {
        context.beginPath();
        context.moveTo(a.x, a.y);
        context.lineTo(b.x, b.y);
        if (run.is_existing_wall) {
            // Dashed, like the map draws an existing wall.
            context.setLineDash([6 * scale, 8 * scale]);
            context.lineCap = 'butt';
            context.lineWidth = 4 * scale;
            context.strokeStyle = theme.wall;
        } else {
            context.setLineDash([]);
            context.lineCap = 'round';
            context.lineWidth = 5 * scale;
            context.strokeStyle = theme.fence;
        }
        context.stroke();
    }
    context.setLineDash([]);
}

function drawGateStretches(context, gates, theme, scale) {
    context.lineCap = 'butt';
    context.lineWidth = 7 * scale;
    context.strokeStyle = theme.gate;
    for (const gate of gates) {
        context.beginPath();
        context.moveTo(gate.from.x, gate.from.y);
        context.lineTo(gate.to.x, gate.to.y);
        context.stroke();
    }
}

function drawCorner(context, point, isFirst, scale) {
    const radius = (isFirst ? 11 : 8) * scale;
    context.beginPath();
    context.arc(point.x, point.y, radius - 1.5 * scale, 0, Math.PI * 2);
    context.shadowColor = 'rgba(0, 0, 0, 0.5)';
    context.shadowBlur = 4 * scale;
    context.shadowOffsetY = scale;
    context.fillStyle = isFirst ? BRAND.blue : BRAND.white;
    context.fill();
    context.shadowColor = 'transparent';
    context.shadowBlur = 0;
    context.shadowOffsetY = 0;
    context.lineWidth = 3 * scale;
    context.strokeStyle = isFirst ? BRAND.white : BRAND.blue;
    context.stroke();
}

// `dot` marks where the connector meets a side; a gate's own opening already does.
function drawLeader(context, leader, theme, scale, dot) {
    context.save();
    context.globalAlpha = theme.leaderOpacity;
    context.shadowColor = 'rgba(0, 0, 0, 0.45)';
    context.shadowBlur = 2 * scale;
    context.beginPath();
    context.moveTo(leader.from.x, leader.from.y);
    context.lineTo(leader.to.x, leader.to.y);
    context.lineCap = 'round';
    context.lineWidth = 1.5 * scale;
    context.strokeStyle = theme.leader;
    context.stroke();
    if (dot) {
        context.beginPath();
        context.arc(leader.from.x, leader.from.y, 2.5 * scale, 0, Math.PI * 2);
        context.fillStyle = theme.leader;
        context.fill();
    }
    context.restore();
}

function drawLabel(context, text, style, box, scale) {
    context.beginPath();
    context.roundRect(box.x, box.y, box.width, box.height, Math.min(style.radius * scale, box.height / 2));
    context.shadowColor = 'rgba(0, 0, 0, 0.4)';
    context.shadowBlur = 4 * scale;
    context.shadowOffsetY = scale;
    context.fillStyle = style.background;
    context.fill();
    context.shadowColor = 'transparent';
    context.shadowBlur = 0;
    context.shadowOffsetY = 0;
    if (style.border) {
        context.lineWidth = 2 * scale;
        context.strokeStyle = style.border;
        context.stroke();
    }
    context.fillStyle = style.color;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, box.x + box.width / 2, box.y + box.height / 2);
}

/**
 * Draws the fence and its labels. Returns what the legend must explain: the labels that
 * had to be shortened, or every label when `fullLegend` is set.
 */
export function drawScene(context, { project, toPixels, scale, theme, bounds, exclusions = [], numbered = false, fullLegend = false }) {
    const { vertices, runs } = project;
    const points = vertices.map(toPixels);
    const sides = runs
        .map((run, index) => ({ run, index, key: `side:${index}`, a: points[run.from], b: points[run.to] }))
        .filter(({ a, b }) => a && b);
    const sideOf = new Map(sides.map((side) => [side.index, side]));
    const described = describeLabels(runs, { numbered });

    const gates = described.gates
        .filter((item) => sideOf.has(item.runIndex))
        .map((item) => {
            const { a, b } = sideOf.get(item.runIndex);
            const span = gateSpan(item.run, item.gate);
            return {
                ...item,
                key: `gate:${item.runIndex}:${item.gateIndex}`,
                segment: `side:${item.runIndex}`,
                from: lerp(a, b, span.from),
                to: lerp(a, b, span.to),
                at: lerp(a, b, item.gate.t),
            };
        });

    drawSides(context, sides, theme, scale);
    drawGateStretches(context, gates, theme, scale);

    // Same rule as the map: the first corner is highlighted while the shape can still close.
    const closed = runs.some((run) => run.from === vertices.length - 1 && run.to === 0);
    points.forEach((point, index) => {
        drawCorner(context, point, index === 0 && !closed && vertices.length >= 3, scale);
    });

    context.font = labelFont(scale);
    const texts = new Map();
    const labels = [];
    for (const gate of gates) {
        texts.set(gate.key, { item: gate, style: LABEL_STYLES.gate });
        labels.push({
            key: gate.key,
            kind: 'gate',
            segment: gate.segment,
            gate: gate.key,
            variants: [
                { level: 'full', ...measure(context, gate.full, scale) },
                { level: 'compact', ...measure(context, gate.compact, scale) },
                { level: 'ref', ...measure(context, gate.ref, scale) },
            ],
        });
    }
    for (const side of described.sides.filter((item) => sideOf.has(item.index))) {
        const key = `side:${side.index}`;
        const star = side.adjusted ? ' *' : '';
        texts.set(key, { item: { ...side, full: side.full + star }, style: side.adjusted ? LABEL_STYLES.adjustedSide : LABEL_STYLES.side });
        labels.push({
            key,
            kind: 'side',
            segment: key,
            variants: [
                { level: 'full', ...measure(context, side.full + star, scale) },
                { level: 'ref', ...measure(context, side.ref, scale, true) },
            ],
        });
    }

    const placements = layoutLabels({
        segments: sides.map(({ key, a, b }) => ({ key, a, b })),
        vertices: points,
        gates: gates.map(({ key, segment, from, to, at }) => ({ key, segment, from, to, at })),
        labels,
        bounds,
        exclusions,
        scale,
    });

    // Every connector first, so none is drawn over a label.
    for (const placement of placements) {
        if (placement.leader) {
            drawLeader(context, placement.leader, theme, scale, placement.kind === 'side');
        }
    }
    context.font = labelFont(scale);
    const legend = [];
    for (const placement of placements) {
        const { item, style } = texts.get(placement.key);
        if (placement.box) {
            drawLabel(context, item[placement.level], style, placement.box, scale);
        }
        if (fullLegend || placement.level !== 'full') {
            legend.push(item.legend);
        }
    }
    // Sides first, then gates, each in drawing order.
    legend.sort((x, y) => (x.startsWith('G') ? 1 : 0) - (y.startsWith('G') ? 1 : 0)
        || x.localeCompare(y, 'en', { numeric: true }));
    return {
        placements,
        legend,
        // For inspection (tests, support): what was drawn and where.
        scene: {
            segments: sides.map(({ key, a, b }) => ({ key, a, b })),
            vertices: points,
            gates: gates.map(({ key, segment, from, to, at }) => ({ key, segment, from, to, at })),
            labels: placements.map((placement) => ({ ...placement, gate: placement.kind === 'gate' ? placement.key : undefined, text: placement.box ? texts.get(placement.key).item[placement.level] : '' })),
            bounds,
            exclusions,
            scale,
        },
    };
}

/* ---------- legend strip ---------- */

function legendLayout(context, lines, width, scale) {
    context.font = `600 ${12.5 * scale}px ${FONT_FAMILY}`;
    const padding = 14 * scale;
    const widest = Math.max(...lines.map((line) => context.measureText(line).width), 0);
    const columns = Math.max(1, Math.min(3, Math.floor((width - 2 * padding) / (widest + 24 * scale))));
    const rows = Math.ceil(lines.length / columns);
    const rowHeight = 20 * scale;
    return { padding, columns, rows, rowHeight, height: lines.length ? 2 * padding + rows * rowHeight : 0 };
}

function drawLegend(context, lines, top, width, scale, layout) {
    if (!lines.length) {
        return;
    }
    context.fillStyle = BRAND.white;
    context.fillRect(0, top, width, layout.height);
    context.font = `600 ${12.5 * scale}px ${FONT_FAMILY}`;
    context.fillStyle = BRAND.ink;
    context.textAlign = 'left';
    context.textBaseline = 'middle';
    const columnWidth = (width - 2 * layout.padding) / layout.columns;
    lines.forEach((line, index) => {
        const column = Math.floor(index / layout.rows);
        const row = index % layout.rows;
        context.fillText(line, layout.padding + column * columnWidth, top + layout.padding + (row + 0.5) * layout.rowHeight);
    });
}

function withLegend(picture, lines, scale) {
    if (!lines.length) {
        return picture;
    }
    const probe = newCanvas(1, 1).getContext('2d');
    const layout = legendLayout(probe, lines, picture.width, scale);
    const canvas = newCanvas(picture.width, picture.height + layout.height);
    const context = canvas.getContext('2d');
    context.drawImage(picture, 0, 0);
    drawLegend(context, lines, picture.height, picture.width, scale, layout);
    return canvas;
}

/* ---------- the three images ---------- */

/**
 * The satellite photo with the fence drawn on it. `image` is the plain photo, `frame`
 * the center, zoom and size the server asked Google for, `project` the drawing.
 */
export async function renderSatelliteCanvas({ image, frame, project }) {
    const photo = await loadImage(image);
    await ready();

    const size = frame.size || { width: 640, height: 640 };
    const canvas = newCanvas(OUTPUT_WIDTH, (OUTPUT_WIDTH * size.height) / size.width);
    const context = canvas.getContext('2d');
    context.imageSmoothingQuality = 'high';
    // The whole photo, uniformly scaled: Google's logo and attribution stay on it.
    context.drawImage(photo, 0, 0, canvas.width, canvas.height);

    const scale = OUTPUT_WIDTH / UI_WIDTH;
    const toPixels = createProjection({ center: frame.center, zoom: frame.zoom, size, width: canvas.width, height: canvas.height });
    const k = toPixels.scale;
    const { legend, scene } = drawScene(context, {
        project,
        toPixels,
        scale,
        theme: THEMES.satellite,
        bounds: { x: 0, y: 0, width: canvas.width, height: canvas.height },
        exclusions: [
            { x: 0, y: canvas.height - ATTRIBUTION.stripHeight * k, width: canvas.width, height: ATTRIBUTION.stripHeight * k },
            { x: 0, y: canvas.height - ATTRIBUTION.logoHeight * k, width: ATTRIBUTION.logoWidth * k, height: ATTRIBUTION.logoHeight * k },
        ],
    });
    const result = withLegend(canvas, legend, scale);
    result.layout = { scene, legend };
    return result;
}

const SCALE_BAR_FEET = [5, 10, 20, 50, 100, 200, 500, 1000];

function drawScaleBar(context, project, toPixels, area, scale) {
    const first = project.vertices[0];
    const metersPerWorldPixel = (156543.03392 * Math.cos((first.lat * Math.PI) / 180)) / 2 ** 20;
    const pixelsPerFoot = toPixels.scale / (metersPerWorldPixel * 3.28084);
    const feet = SCALE_BAR_FEET.find((value) => value * pixelsPerFoot >= 60 * scale) ?? SCALE_BAR_FEET[SCALE_BAR_FEET.length - 1];
    const length = feet * pixelsPerFoot;
    const x = area.x + 16 * scale;
    const y = area.y + area.height - 16 * scale;
    context.strokeStyle = BRAND.ink;
    context.lineWidth = 1.5 * scale;
    context.lineCap = 'butt';
    context.beginPath();
    context.moveTo(x, y - 5 * scale);
    context.lineTo(x, y);
    context.lineTo(x + length, y);
    context.lineTo(x + length, y - 5 * scale);
    context.stroke();
    context.font = `600 ${11 * scale}px ${FONT_FAMILY}`;
    context.fillStyle = BRAND.ink;
    context.textAlign = 'left';
    context.textBaseline = 'bottom';
    context.fillText(`${feet} ft`, x + 4 * scale, y - 3 * scale);
    return { x: x - 4 * scale, y: y - 22 * scale, width: Math.max(length, 60 * scale) + 8 * scale, height: 26 * scale };
}

/**
 * The technical plan: the same drawing on white, to scale, every side numbered like the
 * Sides panel and every length and gate listed below. Needs nothing from Google, so it
 * is also what the quote sends when the satellite photo is not available.
 */
export async function renderPlanCanvas({ project }) {
    await ready();
    const scale = OUTPUT_WIDTH / UI_WIDTH;
    const { vertices } = project;
    const header = 44 * scale;

    // The drawing area follows the shape of the fence, within sensible proportions.
    let ratio = 0.75;
    if (vertices.length >= 2) {
        const probe = createFitProjection(vertices, { x: 0, y: 0, width: 1000, height: 1000 }, 1);
        const points = vertices.map(probe);
        const spanX = Math.max(...points.map((p) => p.x)) - Math.min(...points.map((p) => p.x));
        const spanY = Math.max(...points.map((p) => p.y)) - Math.min(...points.map((p) => p.y));
        ratio = Math.max(0.6, Math.min(1.2, spanY / (spanX || 1)));
    }
    const area = { x: 0, y: header, width: OUTPUT_WIDTH, height: Math.round(OUTPUT_WIDTH * ratio) };

    const canvas = newCanvas(OUTPUT_WIDTH, header + area.height);
    const context = canvas.getContext('2d');
    context.fillStyle = BRAND.white;
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.fillStyle = BRAND.ink;
    context.textBaseline = 'middle';
    context.textAlign = 'left';
    context.font = `700 ${15 * scale}px ${FONT_FAMILY}`;
    const title = project.address || 'Fence drawing';
    context.fillText(title, 16 * scale, header / 2, canvas.width - 190 * scale);
    context.textAlign = 'right';
    context.font = `600 ${11.5 * scale}px ${FONT_FAMILY}`;
    context.fillText('Technical plan · approximate lengths', canvas.width - 16 * scale, header / 2);
    context.fillStyle = '#e3e7f0';
    context.fillRect(0, header - scale, canvas.width, scale);

    let legend = [];
    let scene = null;
    if (vertices.length >= 2) {
        const toPixels = createFitProjection(vertices, area, 0.7);
        const scaleBar = drawScaleBar(context, project, toPixels, area, scale);
        ({ legend, scene } = drawScene(context, {
            project,
            toPixels,
            scale,
            theme: THEMES.plan,
            bounds: area,
            exclusions: [scaleBar],
            numbered: true,
            fullLegend: true,
        }));
    }
    const result = withLegend(canvas, legend, scale);
    result.layout = { scene, legend };
    return result;
}

// Satellite photo above, technical plan below, in one image.
export async function renderCombinedCanvas({ image, frame, project }) {
    const satellite = await renderSatelliteCanvas({ image, frame, project });
    const plan = await renderPlanCanvas({ project });
    const canvas = newCanvas(OUTPUT_WIDTH, satellite.height + plan.height);
    const context = canvas.getContext('2d');
    context.drawImage(satellite, 0, 0);
    context.drawImage(plan, 0, satellite.height);
    return canvas;
}

export const toJpeg = (canvas) => canvas.toDataURL('image/jpeg', 0.92);

// Image the quote sends: the satellite photo with the fence, as a JPEG data URL.
export async function satelliteImage(snapshot) {
    return toJpeg(await renderSatelliteCanvas(snapshot));
}

// Image the quote sends when the photo is not available: the technical plan.
export async function planImage(project) {
    return toJpeg(await renderPlanCanvas({ project }));
}
