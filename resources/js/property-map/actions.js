/*
 * Panel actions: "Continue to materials" (the same materials calculation as the canvas,
 * through the map's POST route), "Request a quote" (the canvas quote flow, with the
 * satellite image as the sketch), "Save link" (anonymous, kept for 90 days) and
 * "Download image" (satellite, technical plan or both).
 */
import { mapToGraph } from './map-to-graph.js';
import {
    planImage, renderCombinedCanvas, renderPlanCanvas, renderSatelliteCanvas, satelliteImage,
} from './quote-image.js';

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
    // The satellite photo of the estimated drawing, kept so that asking for the quote and
    // downloading the image don't each pay for a new Static Maps request.
    let photo = null;

    estimateButton.addEventListener('click', getMaterials);
    saveButton.addEventListener('click', saveLink);
    copyButton.addEventListener('click', copyLink);
    quoteButton.addEventListener('click', requestQuote);
    for (const kind of ['satellite', 'plan', 'both']) {
        root.querySelector(`[data-pm-action="download-${kind}"]`)?.addEventListener('click', () => download(kind));
    }

    const isFresh = () => estimatedSnapshot !== null && JSON.stringify(store.toJSON()) === estimatedSnapshot;

    /*
     * Photo, frame and project from the server for the drawing behind the materials list.
     * Returns { status } with the photo in `data` when status is 'ok'.
     */
    async function getPhoto() {
        if (photo && photo.snapshot === estimatedSnapshot) {
            return { status: 'ok', data: photo.data };
        }
        const response = await post(ROUTES.snapshot, {});
        const data = await response.json().catch(() => ({}));
        if (response.status === 409) {
            return { status: 'stale', message: data.message };
        }
        if (!response.ok || !data.image) {
            return { status: 'unavailable' };
        }
        photo = { snapshot: estimatedSnapshot, data };
        return { status: 'ok', data };
    }

    /*
     * Gets the satellite image of the drawing behind the materials list, then runs the
     * page's own quote flow (#btnQuote): the guest form or the signed-in customer dialog.
     * That flow captures the sketch with exportSketchCanvasImage(), which returns this
     * image while the map is in use. If Google can't produce the image, the technical
     * plan of the fence is sent instead so the quote is never blocked.
     */
    async function requestQuote() {
        const canvasQuoteButton = window.jQuery?.('#btnQuote');
        if (!canvasQuoteButton?.length) {
            notify('The quote form is not available on this page.');
            return;
        }
        quoteButton.disabled = true;
        try {
            const result = await getPhoto();
            if (result.status === 'stale') {
                notify(result.message || 'Get the materials list for your drawing first.');
                return;
            }
            quoteImage = result.status === 'ok' ? await satelliteImage(result.data) : await planImage(store.toJSON());
            canvasQuoteButton.trigger('click');
        } catch (error) {
            console.error(error);
            quoteImage = await planImage(store.toJSON()).catch(() => null);
            canvasQuoteButton.trigger('click');
        } finally {
            quoteButton.disabled = false;
        }
    }

    /*
     * Saves the drawing as a JPEG: on the satellite photo, as a technical plan, or both in
     * one image. The plan is drawn in the browser and is always available; the photo is the
     * one of the quote, so it exists once the materials list is up to date.
     */
    async function download(kind) {
        if (!store.runs().length) {
            notify('Draw at least one side of fence first.');
            return;
        }
        try {
            let canvas;
            if (kind === 'plan') {
                canvas = await renderPlanCanvas({ project: store.toJSON() });
            } else {
                if (!isFresh()) {
                    notify('Select "Continue to materials" first: the satellite image is made for that drawing. The plan can be downloaded at any time.');
                    return;
                }
                const result = await getPhoto();
                if (result.status !== 'ok') {
                    notify('The satellite image is not available right now. You can download the plan instead.');
                    return;
                }
                canvas = kind === 'both' ? await renderCombinedCanvas(result.data) : await renderSatelliteCanvas(result.data);
            }
            const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92));
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `fence-drawing-${kind === 'both' ? 'satellite-and-plan' : kind}.jpg`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            setTimeout(() => URL.revokeObjectURL(link.href), 10000);
        } catch (error) {
            console.error(error);
            notify('The image could not be created. Please try again.');
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
            const fresh = isFresh();
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

// Loads a project saved by link when the page was opened with ?project=<token>.
export async function loadSavedProject({ token, loadProject, notify }) {
    // Saved links carry a ULID (26 Crockford base32 characters); anything else is not ours.
    if (!/^[0-9A-HJKMNP-TV-Z]{26}$/i.test(token)) {
        notify('This saved drawing link is not valid. You can start a new one.');
        return;
    }
    try {
        const response = await fetch(`${ROUTES.projects}/${token}`, {
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
