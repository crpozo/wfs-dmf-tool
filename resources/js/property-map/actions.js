/*
 * Panel actions: "Continue to materials" (the same materials calculation as the canvas,
 * through the map's POST route), "Request a quote" (the canvas quote flow, with the
 * satellite image as the sketch) and "Save link" (anonymous, kept for 90 days).
 */
import { mapToGraph } from './map-to-graph.js';

const ROUTES = {
    estimate: '/property-map/estimate',
    snapshot: '/property-map/snapshot',
    projects: '/property-map/projects',
};

export function mountActions({ root, store, notify }) {
    const estimateButton = root.querySelector('[data-pm-action="estimate"]');
    const saveButton = root.querySelector('[data-pm-action="save"]');
    const materialsBox = root.querySelector('[data-pm-materials]');
    const materialsList = root.querySelector('[data-pm-materials-list]');
    const materialsStale = root.querySelector('[data-pm-materials-stale]');
    const savedBox = root.querySelector('[data-pm-saved]');
    const savedUrl = root.querySelector('[data-pm-saved-url]');
    const copyButton = root.querySelector('[data-pm-action="copy-link"]');
    const quoteButton = root.querySelector('[data-pm-action="quote"]');

    let estimatedSnapshot = null;
    let quoteImage = null;

    estimateButton.addEventListener('click', getMaterials);
    saveButton.addEventListener('click', saveLink);
    copyButton.addEventListener('click', copyLink);
    quoteButton.addEventListener('click', requestQuote);

    /*
     * Gets the satellite image of the drawing behind the materials list, then runs the
     * page's own quote flow (#btnQuote): the guest form or the signed-in customer dialog.
     * That flow captures the sketch with exportSketchCanvasImage(), which returns this
     * image while the map is in use. If Google can't produce the image, a plain drawing
     * of the fence is sent instead so the quote is never blocked.
     */
    async function requestQuote() {
        const canvasQuoteButton = window.jQuery?.('#btnQuote');
        if (!canvasQuoteButton?.length) {
            notify('The quote form is not available on this page.');
            return;
        }
        quoteButton.disabled = true;
        try {
            const response = await post(ROUTES.snapshot, {});
            const data = await response.json().catch(() => ({}));
            if (response.status === 409) {
                notify(data.message || 'Get the materials list for your drawing first.');
                return;
            }
            quoteImage = response.ok && data.image ? data.image : drawFallbackImage(store.toJSON());
            canvasQuoteButton.trigger('click');
        } catch (error) {
            console.error(error);
            quoteImage = drawFallbackImage(store.toJSON());
            canvasQuoteButton.trigger('click');
        } finally {
            quoteButton.disabled = false;
        }
    }

    async function getMaterials() {
        const project = store.toJSON();
        const runs = store.runs();
        if (!runs.some((run) => !run.is_existing_wall)) {
            notify('Draw at least one side of fence first.');
            return;
        }
        if (runs.some((run) => !run.gates_fit)) {
            notify('A gate does not fit on its side. Check the sides marked in red.');
            return;
        }

        const concrete = await askConcrete();
        if (concrete === null) {
            return;
        }

        estimateButton.disabled = true;
        try {
            const response = await post(ROUTES.estimate, { graph: mapToGraph(project), concrete, project });
            const text = await response.text();
            if (!response.ok) {
                notify(response.status === 409 ? text : 'We could not get the materials list. Please try again.');
                return;
            }
            materialsList.value = text;
            materialsBox.hidden = false;
            materialsStale.hidden = true;
            estimatedSnapshot = JSON.stringify(project);
            materialsBox.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        } catch (error) {
            console.error(error);
            notify('We could not get the materials list. Check your connection and try again.');
        } finally {
            estimateButton.disabled = false;
        }
    }

    // Same question the canvas asks before its estimate.
    async function askConcrete() {
        if (window.Swal) {
            const result = await window.Swal.fire({
                title: 'Add concrete',
                text: 'Would you like to add concrete to the estimate?',
                icon: 'question',
                showCancelButton: true,
                showDenyButton: false,
                confirmButtonText: 'Yes, add it',
                cancelButtonText: 'No',
                reverseButtons: true,
                allowOutsideClick: false,
            });
            return result.isConfirmed;
        }
        return window.confirm('Would you like to add concrete to the estimate?');
    }

    async function saveLink() {
        if (store.isEmpty()) {
            notify('Draw your fence first, then save a link to come back to it.');
            return;
        }
        saveButton.disabled = true;
        try {
            const response = await post(ROUTES.projects, { project: store.toJSON() });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                notify(data.message || 'We could not save your project. Please try again.');
                return;
            }
            savedUrl.value = data.url;
            savedBox.hidden = false;
            await copyLink();
        } catch (error) {
            console.error(error);
            notify('We could not save your project. Check your connection and try again.');
        } finally {
            saveButton.disabled = false;
        }
    }

    async function copyLink() {
        try {
            await navigator.clipboard.writeText(savedUrl.value);
            notify('Link copied. It keeps your drawing for 90 days.');
        } catch {
            savedUrl.select();
            notify('Copy this link to come back to your drawing. It is kept for 90 days.');
        }
    }

    function render() {
        const hasFence = store.runs().some((run) => !run.is_existing_wall);
        estimateButton.disabled = !hasFence;
        saveButton.disabled = store.isEmpty();
        if (!materialsBox.hidden) {
            const fresh = JSON.stringify(store.toJSON()) === estimatedSnapshot;
            materialsStale.hidden = fresh;
            quoteButton.disabled = !fresh;
        }
    }

    store.subscribe(render);
    render();

    return {
        // Read by exportSketchCanvasImage() in the drawing page; only while the map is showing.
        quoteImage: () => (document.body.classList.contains('pm-map-active') ? quoteImage : null),
    };
}

// Plain drawing of the fence (white background, sides, lengths and gates) as a JPEG data URL.
function drawFallbackImage(project) {
    const size = 1280;
    const margin = 120;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, size, size);

    const { vertices, runs } = project;
    if (vertices.length) {
        const scaleX = Math.cos((vertices[0].lat * Math.PI) / 180);
        const raw = vertices.map(({ lat, lng }) => ({ x: lng * scaleX, y: -lat }));
        const minX = Math.min(...raw.map((p) => p.x));
        const minY = Math.min(...raw.map((p) => p.y));
        const span = Math.max(Math.max(...raw.map((p) => p.x)) - minX, Math.max(...raw.map((p) => p.y)) - minY) || 1;
        const k = (size - 2 * margin) / span;
        const points = raw.map((p) => ({ x: margin + (p.x - minX) * k, y: margin + (p.y - minY) * k }));

        context.lineCap = 'round';
        context.font = 'bold 28px Montserrat, Arial, sans-serif';
        context.textAlign = 'center';
        for (const run of runs) {
            const a = points[run.from];
            const b = points[run.to];
            context.strokeStyle = run.is_existing_wall ? '#9aa3b5' : '#2e59c1';
            context.lineWidth = 10;
            context.beginPath();
            context.moveTo(a.x, a.y);
            context.lineTo(b.x, b.y);
            context.stroke();

            for (const gate of run.gates) {
                const length = run.override_ft ?? run.calc_ft;
                const half = length > 0 ? gate.width_ft / 2 / length : 0;
                const from = Math.max(0, gate.t - half);
                const to = Math.min(1, gate.t + half);
                context.strokeStyle = '#cf2e2e';
                context.lineWidth = 14;
                context.beginPath();
                context.moveTo(a.x + (b.x - a.x) * from, a.y + (b.y - a.y) * from);
                context.lineTo(a.x + (b.x - a.x) * to, a.y + (b.y - a.y) * to);
                context.stroke();
            }

            context.fillStyle = '#263166';
            context.fillText(`${run.override_ft ?? run.calc_ft} ft`, (a.x + b.x) / 2, (a.y + b.y) / 2 - 18);
        }
    }

    context.fillStyle = '#263166';
    context.textAlign = 'left';
    context.font = '24px Montserrat, Arial, sans-serif';
    context.fillText(project.address || 'Property map drawing', 40, size - 40);
    return canvas.toDataURL('image/jpeg', 0.9);
}

// Loads a project saved by link when the page was opened with ?project=<token>.
export async function loadSavedProject({ token, loadProject, notify }) {
    try {
        const response = await fetch(`${ROUTES.projects}/${encodeURIComponent(token)}`, {
            headers: { Accept: 'application/json' },
        });
        if (!response.ok) {
            notify('This saved drawing has expired or was not found. You can start a new one.');
            return;
        }
        const { project } = await response.json();
        loadProject(project);
    } catch (error) {
        console.error(error);
        notify('We could not open your saved drawing. Please reload the page.');
    }
}

function post(url, body) {
    return fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json, text/plain',
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content || '',
        },
        body: JSON.stringify(body),
    });
}
