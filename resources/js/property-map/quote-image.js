/*
 * Length labels and corners over the satellite image of the quote, styled like the map.
 * The Maps Static API can't write text, so they are drawn here on the photo the server
 * returns; email, Odoo and S3 all receive this result.
 */
const TILE_SIZE = 256;
const LOGICAL_WIDTH = 640; // the image is requested at size=640x640, scale=2

const BLUE = '#2e59c1';
const WHITE = '#ffffff';
const INK = '#263166';
const LABEL_BACKGROUND = 'rgba(38, 49, 102, 0.92)';
const FONT_FAMILY = 'Montserrat, "Segoe UI", Roboto, sans-serif';
const FONT_SIZE = 14;

// Where along a side the label may sit, best first: away from any gate marker.
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
    return { text: `${feet} ft${run.is_existing_wall ? ' · wall' : ''}${adjusted ? ' *' : ''}`, adjusted };
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

// The first position clear of every gate marker or, on a short side, the one farthest from them.
function labelPoint(a, b, gatePoints, clearance) {
    let best = null;
    let bestDistance = -1;
    for (const t of LABEL_POSITIONS) {
        const point = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
        const distance = Math.min(Infinity, ...gatePoints.map((gate) => Math.hypot(gate.x - point.x, gate.y - point.y)));
        if (distance >= clearance) {
            return point;
        }
        if (distance > bestDistance) {
            best = point;
            bestDistance = distance;
        }
    }
    return best;
}

function drawLabel(context, { text, adjusted }, point, scale, canvasSize) {
    context.font = `700 ${FONT_SIZE * scale}px ${FONT_FAMILY}`;
    const width = context.measureText(text).width + 20 * scale;
    const height = (FONT_SIZE * 1.2 + 8) * scale;
    const margin = 4 * scale;
    const x = Math.min(canvasSize.width - width - margin, Math.max(margin, point.x - width / 2));
    const y = Math.min(canvasSize.height - height - margin, Math.max(margin, point.y - height / 2));

    context.beginPath();
    context.roundRect(x, y, width, height, height / 2);
    context.shadowColor = 'rgba(0, 0, 0, 0.4)';
    context.shadowBlur = 4 * scale;
    context.shadowOffsetY = scale;
    context.fillStyle = adjusted ? WHITE : LABEL_BACKGROUND;
    context.fill();
    context.shadowColor = 'transparent';
    if (adjusted) {
        context.lineWidth = 2 * scale;
        context.strokeStyle = BLUE;
        context.stroke();
    }

    context.fillStyle = adjusted ? INK : WHITE;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, x + width / 2, y + height / 2);
}

/**
 * Returns the image as a JPEG data URL with the labels and corners drawn on it.
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

    // Same rule as the map: the first corner is highlighted while the shape can still close.
    const closed = runs.some((run) => run.from === vertices.length - 1 && run.to === 0);
    points.forEach((point, index) => {
        drawCorner(context, point, index === 0 && !closed && vertices.length >= 3, scale);
    });

    for (const run of runs) {
        const a = points[run.from];
        const b = points[run.to];
        if (!a || !b) {
            continue;
        }
        const gatePoints = (run.gates || []).map(({ t }) => ({
            x: a.x + (b.x - a.x) * t,
            y: a.y + (b.y - a.y) * t,
        }));
        drawLabel(context, runLabel(run), labelPoint(a, b, gatePoints, 44 * scale), scale, canvas);
    }

    return canvas.toDataURL('image/jpeg', 0.92);
}
