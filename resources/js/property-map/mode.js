/*
 * Draw / Navigate mode. In Navigate mode taps never add points, so pinching and
 * panning on a phone can't drop a corner by accident.
 */
export function createModeState(initial) {
    let mode = initial;
    const listeners = new Set();

    return {
        get: () => mode,
        isDrawing: () => mode === 'draw',
        set(next) {
            if (next === mode) {
                return;
            }
            mode = next;
            listeners.forEach((listener) => listener(mode));
        },
        subscribe(listener) {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
    };
}

// Always start in Navigate so finding the property never drops a corner; the customer
// switches to Draw when ready.
export function initialMode() {
    return 'navigate';
}
