/*
 * Fence drawing on the map, built on Polyline and draggable AdvancedMarkerElement
 * (DrawingManager was retired and never allowed fine vertex editing).
 *
 * - Draw mode: each click or tap adds a corner; tapping the first corner closes the shape.
 *   With a mouse, pressing and dragging on the map draws a whole side too: the press point
 *   becomes a corner (unless it is the last one) and the release point the next one, so a
 *   customer who drags like in a paint program gets a fence instead of a panned map. Map
 *   panning is off while that applies; Navigate mode pans.
 * - A dotted preview line follows the pointer from the last corner while drawing.
 * - Corners can be dragged; tapping one opens a menu to delete it.
 * - Each run gets a polyline and a length label at its midpoint.
 * Everything is re-rendered from the project store, so undo/redo and loading a saved
 * project need no extra code here.
 */

import { gateLabel } from './gates.js';
import { hasFinePointer } from './mode.js';

// Pointer travel that turns a press into a drag, and the snap radius to an existing corner.
const DRAG_PX = 6;
const SNAP_PX = 14;

// Pencil cursor with its tip (the hotspot) at the bottom-left corner: 3,29 of 32x32.
const PENCIL_CURSOR = `url("data:image/svg+xml,${encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">'
    + '<path d="M4 28 L7 19 L22 4 L28 10 L13 25 Z" fill="#ffffff" stroke="#263166" stroke-width="2" stroke-linejoin="round"/>'
    + '<path d="M19 7 L25 13" stroke="#263166" stroke-width="2"/>'
    + '<path d="M4 28 L7 19 L13 25 Z" fill="#2e59c1" stroke="#263166" stroke-width="1.5" stroke-linejoin="round"/>'
    + '</svg>'
)}") 3 29, crosshair`;

const COLORS = {
    fence: '#4f7dff',
    selected: '#ffffff',
    wall: '#c4c9d6',
    gate: '#ffffff',
    gateProblem: '#cf2e2e',
};

export function mountDrawing({ map, store, mode, libs, onRunFocus, notify }) {
    const { Polyline, InfoWindow, AdvancedMarkerElement, spherical } = libs;

    const vertexMarkers = new Map();
    const runLines = new Map();
    const runLabels = new Map();
    const gateViews = new Map();
    const menu = new InfoWindow({ headerDisabled: true });
    const preview = new Polyline({ map: null, clickable: false, zIndex: 5, ...previewStyle() });
    let draggingId = null;
    let draggingGateId = null;
    // Mouse press on the map in Draw mode (drag-to-draw): where it started and the last
    // pointer position seen, in case the release lands on a marker or outside the map.
    let press = null;
    // Maps fires 'click' shortly after the mouseup that ended a drag-to-draw; ignore that one.
    let swallowClicksUntil = 0;

    const dragToDraw = () => mode.isDrawing() && hasFinePointer();
    const lastVertex = () => store.state.vertices[store.state.vertices.length - 1] || null;

    map.addListener('click', (event) => {
        menu.close();
        if (Date.now() < swallowClicksUntil) {
            return;
        }
        if (!mode.isDrawing()) {
            return;
        }
        addCorner(event.latLng.toJSON());
    });

    function addCorner(latLng) {
        if (!store.addVertex(latLng)) {
            notify('The shape is closed. Drag a corner to adjust it, or delete a corner to reopen it.');
            return false;
        }
        return true;
    }

    map.addListener('mousedown', (event) => {
        if (!dragToDraw() || !event.domEvent || event.domEvent.button !== 0) {
            return;
        }
        menu.close();
        const { clientX, clientY } = event.domEvent;
        press = { latLng: event.latLng.toJSON(), clientX, clientY, current: event.latLng.toJSON(), dragging: false };
    });

    map.addListener('mousemove', (event) => {
        const point = event.latLng.toJSON();
        if (press) {
            press.current = point;
            if (!press.dragging && event.domEvent
                && Math.hypot(event.domEvent.clientX - press.clientX, event.domEvent.clientY - press.clientY) >= DRAG_PX) {
                press.dragging = true;
            }
        }
        updatePreview(point);
    });

    map.addListener('mouseout', () => {
        if (!press) {
            preview.setMap(null);
        }
    });

    map.addListener('mouseup', (event) => finishPress(event.domEvent));
    // The release may land on a corner, a label or outside the map, where the map gets no mouseup.
    document.addEventListener('mouseup', (event) => finishPress(event), true);

    function finishPress(domEvent) {
        if (!press) {
            return;
        }
        const { latLng: start, current, dragging } = press;
        const startsAtLastCorner = pressOnLastCorner(press);
        press = null;
        if (!dragging || !store.canAddVertex()) {
            return; // a plain click: the click listener adds the corner
        }
        swallowClicksUntil = Date.now() + 400;

        if (!startsAtLastCorner) {
            addCorner(start);
        }
        const first = store.state.vertices[0];
        if (first && store.canClose() && domEvent && nearMarker(domEvent.clientX, domEvent.clientY, vertexMarkers.get(first.id))) {
            store.closeShape();
        } else {
            addCorner(current);
        }
        updatePreview(current);
    }

    // The map does not pan while a press is held, so the marker boxes measured now match the press.
    function pressOnLastCorner(pressed) {
        const last = lastVertex();
        return Boolean(last) && nearMarker(pressed.clientX, pressed.clientY, vertexMarkers.get(last.id));
    }

    // Is the screen point within SNAP_PX of a corner marker? Uses the marker's box, so no projection is needed.
    function nearMarker(x, y, marker) {
        const box = marker?.content?.getBoundingClientRect();
        if (!box || !Number.isFinite(x) || !Number.isFinite(y)) {
            return false;
        }
        return Math.hypot(x - (box.left + box.width / 2), y - (box.top + box.height / 2)) <= box.width / 2 + SNAP_PX;
    }

    function updatePreview(point) {
        const last = lastVertex();
        if (!mode.isDrawing() || store.state.closed || !last || draggingId || draggingGateId) {
            preview.setMap(null);
            return;
        }
        const from = press?.dragging && !pressOnLastCorner(press) ? press.latLng : { lat: last.lat, lng: last.lng };
        preview.setPath([from, point]);
        if (!preview.getMap()) {
            preview.setMap(map);
        }
    }

    function createVertexMarker(id) {
        const content = document.createElement('div');
        content.className = 'pm-vertex';
        const marker = new AdvancedMarkerElement({
            map,
            content,
            zIndex: 30,
            title: 'Fence corner',
            gmpDraggable: mode.isDrawing(),
        });

        marker.addListener('dragstart', () => {
            draggingId = id;
            menu.close();
        });
        marker.addListener('drag', (event) => {
            store.moveVertex(id, event.latLng.toJSON(), { commit: false });
        });
        marker.addListener('dragend', (event) => {
            draggingId = null;
            store.moveVertex(id, event.latLng.toJSON());
        });
        marker.addListener('click', () => onVertexClick(id, marker));

        return marker;
    }

    function onVertexClick(id, marker) {
        const index = store.state.vertices.findIndex((vertex) => vertex.id === id);
        if (mode.isDrawing() && index === 0 && store.canClose()) {
            store.closeShape();
            return;
        }
        openVertexMenu(id, marker);
    }

    function openVertexMenu(id, marker) {
        const content = document.createElement('div');
        content.className = 'pm-menu';
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'pm-menu-item pm-menu-item-danger';
        remove.textContent = 'Delete corner';
        remove.addEventListener('click', () => {
            menu.close();
            store.removeVertex(id);
        });
        content.appendChild(remove);
        menu.setContent(content);
        menu.open({ map, anchor: marker });
    }

    function createRunLine(key) {
        const line = new Polyline({ map, clickable: true, zIndex: 10 });
        line.addListener('click', () => {
            store.selectRun(key);
            onRunFocus?.(key);
        });
        return line;
    }

    function createRunLabel(key) {
        const content = document.createElement('button');
        content.type = 'button';
        content.className = 'pm-label';
        const label = new AdvancedMarkerElement({ map, content, zIndex: 20 });
        label.addListener('click', () => {
            store.selectRun(key);
            onRunFocus?.(key);
        });
        return label;
    }

    // Gates: a white stretch over the run plus a label that slides along the run in Draw mode.
    function createGateView(gateId) {
        const line = new Polyline({ map, clickable: false, zIndex: 15, strokeWeight: 7, strokeOpacity: 1 });
        const content = document.createElement('div');
        content.className = 'pm-gate-label';
        const marker = new AdvancedMarkerElement({ map, content, zIndex: 25, gmpDraggable: mode.isDrawing() });

        const runOf = () => store.runs().find((run) => run.gates.some((gate) => gate.id === gateId));
        marker.addListener('dragstart', () => {
            draggingGateId = gateId;
            menu.close();
        });
        marker.addListener('drag', (event) => {
            const run = runOf();
            if (run) {
                store.updateGate(run.key, gateId, { t: positionOnRun(run, event.latLng.toJSON()) }, { commit: false });
            }
        });
        marker.addListener('dragend', (event) => {
            draggingGateId = null;
            const run = runOf();
            if (run) {
                store.updateGate(run.key, gateId, { t: positionOnRun(run, event.latLng.toJSON()) });
            }
            render();
        });
        marker.addListener('click', () => {
            const run = runOf();
            if (run) {
                store.selectRun(run.key);
                onRunFocus?.(run.key);
            }
        });

        return { line, marker, map: null };
    }

    // Fraction (0..1) of the run closest to a point; a flat projection is plenty for a yard.
    function positionOnRun(run, point) {
        const scaleX = Math.cos((run.a.lat * Math.PI) / 180);
        const bx = (run.b.lng - run.a.lng) * scaleX;
        const by = run.b.lat - run.a.lat;
        const px = (point.lng - run.a.lng) * scaleX;
        const py = point.lat - run.a.lat;
        const lengthSq = bx * bx + by * by;
        return lengthSq ? Math.min(1, Math.max(0, (px * bx + py * by) / lengthSq)) : 0.5;
    }

    function renderGates(runs) {
        const live = new Set();
        for (const run of runs) {
            const a = { lat: run.a.lat, lng: run.a.lng };
            const b = { lat: run.b.lat, lng: run.b.lng };
            for (const gate of run.gates) {
                live.add(gate.id);
                let view = gateViews.get(gate.id);
                if (!view) {
                    view = createGateView(gate.id);
                    gateViews.set(gate.id, view);
                }
                const half = run.effective_ft > 0 ? gate.width_ft / 2 / run.effective_ft : 0;
                view.line.setPath([
                    spherical.interpolate(a, b, Math.max(0, gate.t - half)),
                    spherical.interpolate(a, b, Math.min(1, gate.t + half)),
                ]);
                view.line.setOptions({ strokeColor: run.gates_fit ? COLORS.gate : COLORS.gateProblem });
                if (gate.id !== draggingGateId) {
                    view.marker.position = spherical.interpolate(a, b, gate.t);
                }
                view.marker.gmpDraggable = mode.isDrawing();
                view.marker.content.textContent = gateLabel(gate);
                view.marker.content.classList.toggle('is-problem', !run.gates_fit);
                view.marker.title = mode.isDrawing() ? 'Drag along the side to move the gate' : gateLabel(gate);
            }
        }
        for (const [id, view] of gateViews) {
            if (!live.has(id)) {
                view.line.setMap(null);
                view.marker.map = null;
                gateViews.delete(id);
            }
        }
    }

    function previewStyle() {
        return {
            strokeOpacity: 0,
            icons: [{
                icon: { path: 'M 0,-1 0,1', strokeOpacity: 0.9, strokeWeight: 3, strokeColor: COLORS.fence, scale: 2 },
                offset: '0',
                repeat: '10px',
            }],
        };
    }

    function lineStyle(run, isSelected) {
        if (run.is_existing_wall) {
            // Dashed line: invisible stroke with a repeated dash symbol.
            return {
                strokeOpacity: 0,
                strokeWeight: 5,
                icons: [{
                    icon: { path: 'M 0,-1 0,1', strokeOpacity: 1, strokeWeight: isSelected ? 6 : 4, strokeColor: isSelected ? COLORS.selected : COLORS.wall, scale: 3 },
                    offset: '0',
                    repeat: '14px',
                }],
            };
        }
        return {
            strokeColor: isSelected ? COLORS.selected : COLORS.fence,
            strokeOpacity: 1,
            strokeWeight: isSelected ? 7 : 5,
            icons: [],
        };
    }

    function syncMap(liveKeys, items, create) {
        for (const [key, item] of items) {
            if (!liveKeys.has(key)) {
                item.map = null;
                item.setMap?.(null);
                items.delete(key);
            }
        }
        for (const key of liveKeys) {
            if (!items.has(key)) {
                items.set(key, create(key));
            }
        }
    }

    function render() {
        const { vertices, closed, selectedRun } = store.state;
        const runs = store.runs();
        const drawing = mode.isDrawing();

        syncMap(new Set(vertices.map((vertex) => vertex.id)), vertexMarkers, createVertexMarker);
        vertices.forEach((vertex, index) => {
            const marker = vertexMarkers.get(vertex.id);
            if (vertex.id !== draggingId) {
                marker.position = { lat: vertex.lat, lng: vertex.lng };
            }
            marker.gmpDraggable = drawing;
            const canCloseHere = index === 0 && !closed && vertices.length >= 3;
            marker.content.classList.toggle('is-first', canCloseHere);
            marker.title = canCloseHere && drawing ? 'Tap to close the shape' : 'Fence corner';
        });

        const runKeys = new Set(runs.map((run) => run.key));
        syncMap(runKeys, runLines, createRunLine);
        syncMap(runKeys, runLabels, createRunLabel);

        runs.forEach((run, index) => {
            const isSelected = run.key === selectedRun;
            const path = [{ lat: run.a.lat, lng: run.a.lng }, { lat: run.b.lat, lng: run.b.lng }];

            const line = runLines.get(run.key);
            line.setPath(path);
            line.setOptions(lineStyle(run, isSelected));

            const label = runLabels.get(run.key);
            label.position = spherical.interpolate(path[0], path[1], 0.5);
            label.content.textContent = `${run.effective_ft} ft${run.is_existing_wall ? ' · wall' : ''}`;
            label.content.classList.toggle('is-adjusted', run.override_ft !== null);
            label.content.classList.toggle('is-selected', isSelected);
            label.content.setAttribute(
                'aria-label',
                `Side ${index + 1}: ${run.effective_ft} feet${run.override_ft !== null ? ', adjusted by hand' : ''}`
            );
            label.title = run.override_ft !== null ? `Adjusted by hand (measured ${run.calc_ft} ft)` : 'Measured on the map';
        });

        renderGates(runs);
    }

    // Bring a run into view when it is picked from the side panel.
    function revealRun(key) {
        const run = store.runs().find((item) => item.key === key);
        if (!run) {
            return;
        }
        const middle = spherical.interpolate({ lat: run.a.lat, lng: run.a.lng }, { lat: run.b.lat, lng: run.b.lng }, 0.5);
        if (!map.getBounds()?.contains(middle)) {
            map.panTo(middle);
        }
    }

    // Draw mode shows a pencil over the map instead of the open hand. With a mouse the map
    // stops panning in Draw mode so that a press and drag draws a side (see the header).
    function applyInteraction() {
        const drawing = mode.isDrawing();
        const draggable = !dragToDraw();
        map.setOptions({
            draggable,
            draggableCursor: drawing ? PENCIL_CURSOR : null,
            draggingCursor: drawing && !draggable ? PENCIL_CURSOR : null,
        });
        const element = map.getDiv();
        element.classList.toggle('is-drawing', drawing);
        element.style.setProperty('--pm-pencil-cursor', PENCIL_CURSOR);
        if (!drawing) {
            press = null;
            preview.setMap(null);
        }
    }

    store.subscribe(() => {
        render();
        if (store.state.closed || !lastVertex()) {
            preview.setMap(null);
        }
    });
    mode.subscribe(() => {
        menu.close();
        applyInteraction();
        render();
    });
    applyInteraction();
    render();

    return { revealRun, closeMenu: () => menu.close() };
}
