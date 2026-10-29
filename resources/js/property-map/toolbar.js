/*
 * Map toolbar: Draw / Navigate, undo, redo, close shape, clear all, plus keyboard
 * shortcuts (Ctrl+Z, Ctrl+Y, Ctrl+Shift+Z) and the contextual hint under the toolbar.
 */

export function mountToolbar({ root, store, mode, onBeforeChange }) {
    const button = (action) => root.querySelector(`[data-pm-action="${action}"]`);
    const drawButton = button('mode-draw');
    const navigateButton = button('mode-navigate');
    const undoButton = button('undo');
    const redoButton = button('redo');
    const closeButton = button('close');
    const clearButton = button('clear');
    const hint = root.querySelector('[data-pm-hint]');

    drawButton.addEventListener('click', () => mode.set('draw'));
    navigateButton.addEventListener('click', () => mode.set('navigate'));
    undoButton.addEventListener('click', () => run(() => store.undo()));
    redoButton.addEventListener('click', () => run(() => store.redo()));
    closeButton.addEventListener('click', () => run(() => store.closeShape()));
    clearButton.addEventListener('click', confirmClear);

    function run(action) {
        onBeforeChange?.();
        action();
    }

    async function confirmClear() {
        if (store.isEmpty()) {
            return;
        }
        const title = 'Clear the whole drawing?';
        const text = 'Every corner and side will be removed. You can undo this.';
        let confirmed;
        if (window.Swal) {
            const result = await window.Swal.fire({
                title,
                text,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Clear all',
                cancelButtonText: 'Keep drawing',
            });
            confirmed = result.isConfirmed;
        } else {
            confirmed = window.confirm(`${title}\n${text}`);
        }
        if (confirmed) {
            run(() => store.clear());
        }
    }

    document.addEventListener('keydown', (event) => {
        if (root.closest('[hidden]') || root.offsetParent === null) {
            return; // map view not visible
        }
        if (event.target.closest('input, textarea, select, [contenteditable="true"], gmp-place-autocomplete')) {
            return;
        }
        if (!(event.ctrlKey || event.metaKey)) {
            return;
        }
        const key = event.key.toLowerCase();
        if (key === 'z' && !event.shiftKey) {
            event.preventDefault();
            run(() => store.undo());
        } else if (key === 'y' || (key === 'z' && event.shiftKey)) {
            event.preventDefault();
            run(() => store.redo());
        }
    });

    function render() {
        const drawing = mode.isDrawing();
        drawButton.classList.toggle('is-active', drawing);
        drawButton.setAttribute('aria-pressed', String(drawing));
        navigateButton.classList.toggle('is-active', !drawing);
        navigateButton.setAttribute('aria-pressed', String(!drawing));
        undoButton.disabled = !store.canUndo();
        redoButton.disabled = !store.canRedo();
        closeButton.disabled = !store.canClose();
        clearButton.disabled = store.isEmpty();

        if (!drawing) {
            hint.textContent = 'Navigate: drag and pinch to move the map. Switch to Draw to add corners.';
        } else if (store.state.closed) {
            hint.textContent = 'Shape closed. Drag a corner to adjust it, or tap it to delete it.';
        } else if (store.state.vertices.length === 0) {
            hint.textContent = 'Tap the map where your fence starts.';
        } else if (store.canClose()) {
            hint.textContent = 'Tap the next corner, or tap the first corner to close the shape.';
        } else {
            hint.textContent = 'Tap the next corner of your fence.';
        }
    }

    store.subscribe(render);
    mode.subscribe(render);
    render();
}
