/*
 * Side panel with one row per run, kept in sync with the map both ways: typing a length
 * updates the label on the map, moving a corner updates the row. Rows are reused between
 * renders so a field keeps its focus while the customer drags corners.
 *
 * Each row also holds the run's fence material (when the configuration has more than
 * one) and its gates, with the same choices as the classic canvas gate dialogs.
 */
import { SPECIALTY_NOTE, STANDARD_WIDTHS, STYLE_LABELS, TYPE_LABELS, isStandard, stylesFor } from './gates.js';

export function mountPanel({ root, store, materials, notify, onRunFocus }) {
    const list = root.querySelector('[data-pm-runs]');
    const empty = root.querySelector('[data-pm-runs-empty]');
    const total = root.querySelector('[data-pm-total]');
    const rows = new Map();
    const hasSeveralMaterials = materials.length > 1;

    const materialCode = (slot) => (materials.find((item) => item.slot === slot) || materials[0])?.code;

    function createRow(key) {
        const row = document.createElement('li');
        row.className = 'pm-run';
        row.dataset.key = key;
        row.innerHTML = `
            <div class="pm-run-head">
                <button type="button" class="pm-run-name" data-role="select"></button>
                <span class="pm-run-measured" data-role="measured"></span>
            </div>
            <div class="pm-run-fields">
                <label class="pm-run-length">
                    <span class="pm-run-field-label">Length</span>
                    <input type="number" class="form-control wfs-input" data-role="override"
                        min="1" max="5000" step="1" inputmode="numeric">
                    <span class="pm-run-unit">ft</span>
                </label>
                <button type="button" class="pm-run-reset" data-role="reset">Use measured</button>
                <label class="pm-run-wall">
                    <input type="checkbox" data-role="wall">
                    <span>Existing wall</span>
                </label>
            </div>
            <label class="pm-run-material" data-role="material-field" hidden>
                <span class="pm-run-field-label">Fence</span>
                <select class="form-select wfs-input" data-role="material"></select>
            </label>
            <div class="pm-gates" data-role="gates"></div>
            <div class="pm-gate-add" data-role="gate-add">
                <button type="button" class="pm-link-button" data-role="add-single">+ Single gate</button>
                <button type="button" class="pm-link-button" data-role="add-double">+ Double gate</button>
            </div>`;

        if (hasSeveralMaterials) {
            row.querySelector('[data-role="material-field"]').hidden = false;
            row.querySelector('[data-role="material"]').innerHTML = materials
                .map((item) => `<option value="${item.slot}">${escapeHtml(item.label)}</option>`)
                .join('');
        }
        return row;
    }

    function gateMarkup(gate, code) {
        const styles = stylesFor(code);
        const widths = STANDARD_WIDTHS[gate.type];
        const custom = !widths.includes(gate.width_ft);
        return `
            <div class="pm-gate" data-gate-id="${gate.id}">
                <div class="pm-gate-fields">
                    <select class="form-select wfs-input" data-role="gate-type" aria-label="Gate type">
                        ${Object.entries(TYPE_LABELS).map(([value, label]) =>
                            `<option value="${value}" ${value === gate.type ? 'selected' : ''}>${label}</option>`).join('')}
                    </select>
                    <select class="form-select wfs-input" data-role="gate-style" aria-label="Gate style">
                        ${styles.map((style) =>
                            `<option value="${style}" ${style === gate.style ? 'selected' : ''}>${STYLE_LABELS[style]}</option>`).join('')}
                    </select>
                    <select class="form-select wfs-input" data-role="gate-width" aria-label="Gate width">
                        ${widths.map((width) =>
                            `<option value="${width}" ${!custom && width === gate.width_ft ? 'selected' : ''}>${width} ft</option>`).join('')}
                        <option value="custom" ${custom ? 'selected' : ''}>Custom</option>
                    </select>
                    <label class="pm-gate-custom" ${custom ? '' : 'hidden'}>
                        <input type="number" class="form-control wfs-input" data-role="gate-custom" min="1" max="40" step="1"
                            inputmode="numeric" value="${gate.width_ft}" aria-label="Custom gate width in feet">
                        <span class="pm-run-unit">ft</span>
                    </label>
                    <button type="button" class="pm-link-button pm-link-danger" data-role="gate-remove">Remove</button>
                </div>
                <p class="pm-gate-note" ${isStandard(gate) ? 'hidden' : ''}>* ${SPECIALTY_NOTE}</p>
            </div>`;
    }

    function render() {
        const runs = store.runs();
        const live = new Set(runs.map((run) => run.key));

        for (const [key, row] of rows) {
            if (!live.has(key)) {
                row.remove();
                rows.delete(key);
            }
        }

        runs.forEach((run, index) => {
            let row = rows.get(run.key);
            if (!row) {
                row = createRow(run.key);
                rows.set(run.key, row);
            }
            list.appendChild(row); // keeps DOM order equal to run order

            const adjusted = run.override_ft !== null;
            row.classList.toggle('is-selected', run.key === store.state.selectedRun);
            row.classList.toggle('is-adjusted', adjusted);
            row.classList.toggle('is-wall', run.is_existing_wall);
            row.classList.toggle('has-problem', !run.gates_fit);

            row.querySelector('[data-role="select"]').textContent = `Side ${index + 1}`;
            row.querySelector('[data-role="measured"]').textContent = adjusted
                ? `Measured ${run.calc_ft} ft · adjusted`
                : `Measured ${run.calc_ft} ft`;

            const input = row.querySelector('[data-role="override"]');
            input.placeholder = String(run.calc_ft);
            input.setAttribute('aria-label', `Side ${index + 1} length in feet`);
            if (document.activeElement !== input) {
                input.value = adjusted ? String(run.override_ft) : '';
            }

            row.querySelector('[data-role="reset"]').hidden = !adjusted;
            row.querySelector('[data-role="wall"]').checked = run.is_existing_wall;

            const material = row.querySelector('[data-role="material"]');
            if (hasSeveralMaterials && document.activeElement !== material) {
                material.value = String(run.material);
            }

            // Gates are rebuilt only when they changed and no field inside is being edited.
            const gatesBox = row.querySelector('[data-role="gates"]');
            const signature = JSON.stringify([run.material, run.gates]);
            if (gatesBox.dataset.signature !== signature && !gatesBox.contains(document.activeElement)) {
                gatesBox.innerHTML = run.gates.map((gate) => gateMarkup(gate, materialCode(run.material))).join('');
                gatesBox.dataset.signature = signature;
            }
            row.querySelector('[data-role="gate-add"]').hidden = run.is_existing_wall;
        });

        empty.hidden = runs.length > 0;
        empty.textContent = store.state.vertices.length === 0
            ? 'Find your property, choose Draw, then tap the map to add the first corner of your fence.'
            : 'Add another corner to create the first side.';

        const fenceRuns = runs.filter((run) => !run.is_existing_wall);
        const gates = fenceRuns.flatMap((run) => run.gates);
        total.hidden = runs.length === 0;
        total.textContent = `${fenceRuns.length} ${fenceRuns.length === 1 ? 'side' : 'sides'} · ${store.totalFenceFt()} ft of fence`
            + (gates.length ? ` · ${gates.length} ${gates.length === 1 ? 'gate' : 'gates'}` : '');
    }

    function gateContext(target) {
        const row = target.closest('.pm-run');
        const gate = target.closest('.pm-gate');
        return { key: row?.dataset.key, gateId: gate?.dataset.gateId, gateBox: gate };
    }

    function updateGate(key, gateId, changes) {
        if (!store.updateGate(key, gateId, changes)) {
            notify('That gate does not fit on this side. Make the side longer or the gate narrower.');
            render();
        }
    }

    list.addEventListener('change', (event) => {
        const row = event.target.closest('.pm-run');
        if (!row) {
            return;
        }
        const role = event.target.dataset.role;
        const { key, gateId, gateBox } = gateContext(event.target);

        if (role === 'override') {
            store.setOverride(key, event.target.value);
        } else if (role === 'wall') {
            store.setExistingWall(key, event.target.checked);
        } else if (role === 'material') {
            store.setRunMaterial(key, event.target.value);
        } else if (role === 'gate-type') {
            const type = event.target.value;
            updateGate(key, gateId, { type, width_ft: STANDARD_WIDTHS[type][0] });
        } else if (role === 'gate-style') {
            updateGate(key, gateId, { style: event.target.value });
        } else if (role === 'gate-width') {
            if (event.target.value === 'custom') {
                const field = gateBox.querySelector('.pm-gate-custom');
                field.hidden = false;
                field.querySelector('input').focus();
                return;
            }
            updateGate(key, gateId, { width_ft: Number(event.target.value) });
        } else if (role === 'gate-custom') {
            const width = Math.round(Number(event.target.value));
            if (width > 0) {
                updateGate(key, gateId, { width_ft: width });
            }
        }
    });

    list.addEventListener('keydown', (event) => {
        const role = event.target.dataset.role;
        if (event.key === 'Enter' && (role === 'override' || role === 'gate-custom')) {
            event.preventDefault();
            event.target.blur(); // fires change
        }
    });

    list.addEventListener('click', (event) => {
        const row = event.target.closest('.pm-run');
        if (!row) {
            return;
        }
        const role = event.target.dataset.role;
        const { key, gateId } = gateContext(event.target);

        if (role === 'reset') {
            store.setOverride(key, null);
        } else if (role === 'select') {
            store.selectRun(key);
            onRunFocus?.(key);
        } else if (role === 'add-single' || role === 'add-double') {
            if (!store.addGate(key, role === 'add-double' ? 'double' : 'single')) {
                notify('There is no room for that gate on this side.');
            }
        } else if (role === 'gate-remove') {
            store.removeGate(key, gateId);
        }
    });

    list.addEventListener('focusin', (event) => {
        const row = event.target.closest('.pm-run');
        if (row && event.target.dataset.role === 'override' && store.state.selectedRun !== row.dataset.key) {
            store.selectRun(row.dataset.key);
            onRunFocus?.(row.dataset.key);
        }
    });

    store.subscribe(render);
    render();

    // Called when a run is picked on the map: bring its row into view.
    return {
        focusRun(key) {
            const row = rows.get(key);
            if (row && store.state.selectedRun === key) {
                row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }
        },
    };
}

function escapeHtml(text) {
    return String(text).replace(/[&<>"']/g, (char) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    })[char]);
}
