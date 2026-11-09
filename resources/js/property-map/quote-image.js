/*
 * Lengths, gates and corners over the satellite image of the quote, styled like the map.
 * The Maps Static API can't write text, so they are drawn here on the photo the server
 * returns; email, Odoo and S3 all receive this result.
 */
import { gateLabel } from './gates.js';

const TILE_SIZE = 256;
const LOGICAL_WIDTH = 640; // the image is requested at size=640x640, scale=2

const BLUE = '#2e59c1';
const WHITE = '#ffffff';
const INK = '#263166';
const LABEL_BACKGROUND = 'rgba(38, 49, 102, 0.92)';
const FONT_FAMILY = 'Montserrat, "Segoe UI", Roboto, sans-serif';
const FONT_SIZE = 14;

const LABEL_STYLES = {
    side: { background: LABEL_BACKGROUND, color: WHITE, border: null, radius: 100 },
    adjustedSide: { background: WHITE, color: INK, border: BLUE, radius: 100 },
    gate: { background: INK, color: WHITE, border: WHITE, radius: 6 },
};

// Where along a side its length may sit, best first.
const LABEL_POSITIONS = [0.5, 0.3, 0.7, 0.2, 0.8];

function worldPoint({ lat, lng }, zoom) {
    const size = TILE_SIZE * 2 ** zoom;
    const sin = Math.sin((lat * Math.PI) / 180);
    return {
        x: ((lng + 180) / 360) * size,
        y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * size,
    };
}

// Function from latitude and longitude to pixels of an image of the given size.
export function createProjection({ center, zoom, width, height }) {
    const origin = worldPoint(center, zoom);
    const scale = width / LOGICAL_WIDTH;
    return (point) => {
        const world = worldPoint(point, zoom);
        return {
            x: width / 2 + (world.x - origin.x) * scale,
            y: height / 2 + (world.y - origin.y) * scale,
        };
    };
}

function loadImage(source) {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('The quote image could not be read.'));
        image.src = source;
    });
}

function runLabel(run) {
    const adjusted = run.override_ft !== null && run.override_ft !== undefined;
    const feet = adjusted ? run.override_ft : run.calc_ft;
    return {
        text: `${feet} ft${run.is_existing_wall ? ' · wall' : ''}${adjusted ? ' *' : ''}`,
        style: adjusted ? LABEL_STYLES.adjustedSide : LABEL_STYLES.side,
    };
}

function along(a, b, t) {
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

// The white stretch of the side the gate takes up, as on the map.
function drawGateStretch(context, a, b, run, gate, scale) {
    const feet = run.override_ft ?? run.calc_ft;
    const half = feet > 0 ? gate.width_ft / 2 / feet : 0;
    const start = along(a, b, Math.max(0, gate.t - half));
    const end = along(a, b, Math.min(1, gate.t + half));
    context.beginPath();
    context.moveTo(start.x, start.y);
    context.lineTo(end.x, end.y);
    context.lineWidth = 7 * scale;
    context.strokeStyle = WHITE;
    context.stroke();
}

function drawCorner(context, point, isFirst, scale) {
    const radius = (isFirst ? 11 : 8) * scale;
    context.beginPath();
    context.arc(point.x, point.y, radius - 1.5 * scale, 0, Math.PI * 2);
    context.shadowColor = 'rgba(0, 0, 0, 0.5)';
    context.shadowBlur = 4 * scale;
    context.shadowOffsetY = scale;
    context.fillStyle = isFirst ? BLUE : WHITE;
    context.fill();
    context.shadowColor = 'transparent';
    context.lineWidth = 3 * scale;
    context.strokeStyle = isFirst ? WHITE : BLUE;
    context.stroke();
}

function labelSize(context, text, scale) {
    return {
        width: context.measureText(text).width + 20 * scale,
        height: (FONT_SIZE * 1.2 + 8) * scale,
    };
}

function overlaps(a, b, gap) {
    return a.x < b.x + b.width + gap && b.x < a.x + a.width + gap
        && a.y < b.y + b.height + gap && b.y < a.y + a.height + gap;
}

// Places a label on the first candidate point that leaves every earlier label readable.
function placeLabel(candidates, size, placed, scale, canvasSize) {
    const margin = 4 * scale;
    const boxes = candidates.map((point) => ({
        ...size,
        x: Math.min(canvasSize.width - size.width - margin, Math.max(margin, point.x - size.width / 2)),
        y: Math.min(canvasSize.height - size.height - margin, Math.max(margin, point.y - size.height / 2)),
    }));
    const box = boxes.find((candidate) => !placed.some((other) => overlaps(candidate, other, margin))) ?? boxes[0];
    placed.push(box);
    return box;
}

// Points beside a spot on a side, alternating sides, each far enough to clear the previous one.
function besideSide(point, a, b, size, scale) {
    const length = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const normal = { x: -(b.y - a.y) / length, y: (b.x - a.x) / length };
    const step = Math.abs(normal.x) * size.width + Math.abs(normal.y) * size.height + 6 * scale;
    return [1, -1, 2, -2, 3, -3].map((times) => ({
        x: point.x + normal.x * step * times,
        y: point.y + normal.y * step * times,
    }));
}

function drawLeader(context, from, box, scale) {
    context.beginPath();
    context.moveTo(from.x, from.y);
    context.lineTo(box.x + box.width / 2, box.y + box.height / 2);
    context.lineWidth = 2 * scale;
    context.strokeStyle = WHITE;
    context.stroke();
}

function drawLabel(context, text, style, box, scale) {
    context.beginPath();
    context.roundRect(box.x, box.y, box.width, box.height, style.radius * scale);
    context.shadowColor = 'rgba(0, 0, 0, 0.4)';
    context.shadowBlur = 4 * scale;
    context.shadowOffsetY = scale;
    context.fillStyle = style.background;
    context.fill();
    context.shadowColor = 'transparent';
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
 * Returns the image as a JPEG data URL with the labels, gates and corners drawn on it.
 * `frame` is the center and zoom the server used for the photo; `project` is the drawing
 * the photo shows. Rejects if the image can't be read, so the caller can keep the plain one.
 */
export async function addLengthLabels({ image, frame, project }) {
    const photo = await loadImage(image);
    await document.fonts?.load(`700 ${FONT_SIZE * 2}px Montserrat`).catch(() => {});

    const canvas = document.createElement('canvas');
    canvas.width = photo.naturalWidth;
    canvas.height = photo.naturalHeight;
    const context = canvas.getContext('2d');
    context.drawImage(photo, 0, 0);

    const scale = canvas.width / LOGICAL_WIDTH;
    const toPixels = createProjection({ ...frame, width: canvas.width, height: canvas.height });
    const { vertices, runs } = project;
    const points = vertices.map(toPixels);
    const sides = runs
        .map((run) => ({ run, a: points[run.from], b: points[run.to] }))
        .filter(({ a, b }) => a && b);

    for (const { run, a, b } of sides) {
        (run.gates || []).forEach((gate) => drawGateStretch(context, a, b, run, gate, scale));
    }

    // Same rule as the map: the first corner is highlighted while the shape can still close.
    const closed = runs.some((run) => run.from === vertices.length - 1 && run.to === 0);
    points.forEach((point, index) => {
        drawCorner(context, point, index === 0 && !closed && vertices.length >= 3, scale);
    });

    context.font = `700 ${FONT_SIZE * scale}px ${FONT_FAMILY}`;
    const placed = [];

    // Gates first, so each label stays on its gate and the side lengths move out of the way.
    for (const { run, a, b } of sides) {
        for (const gate of run.gates || []) {
            const text = gateLabel(gate);
            const size = labelSize(context, text, scale);
            const point = along(a, b, gate.t);
            const box = placeLabel([point, ...besideSide(point, a, b, size, scale)], size, placed, scale, canvas);
            if (Math.hypot(box.x + box.width / 2 - point.x, box.y + box.height / 2 - point.y) > size.height) {
                drawLeader(context, point, box, scale);
            }
            drawLabel(context, text, LABEL_STYLES.gate, box, scale);
        }
    }

    for (const { run, a, b } of sides) {
        const { text, style } = runLabel(run);
        const size = labelSize(context, text, scale);
        const candidates = LABEL_POSITIONS.map((t) => along(a, b, t));
        candidates.push(...besideSide(along(a, b, 0.5), a, b, size, scale));
        drawLabel(context, text, style, placeLabel(candidates, size, placed, scale, canvas), scale);
    }

    return canvas.toDataURL('image/jpeg', 0.92);
}
