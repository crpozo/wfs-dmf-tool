/*
 * Switches between the property map and the classic canvas. The classic canvas stays
 * on the page the whole time, so the current flow (materials list, quote, Odoo, sales
 * email) keeps working if the map is off or fails to load.
 */

const MAP_ACTIVE_CLASS = 'pm-map-active';

const NOTICES = {
    auth: 'The property map is not available right now, so we switched to the classic drawing canvas.',
    load: 'The property map could not be loaded, so we switched to the classic drawing canvas.',
};

// p5 runs in global mode and listens for mouse, touch and keys on the whole window, so the
// hidden classic canvas would keep adding corners (and open its "Enter length" dialog) while
// the customer pans or clicks the map. p5 looks these handlers up on every event, so
// wrapping them is enough to mute the canvas while the map is showing.
const CANVAS_INPUT_HANDLERS = [
    'mousePressed', 'mouseReleased', 'mouseClicked', 'mouseDragged', 'mouseMoved', 'doubleClicked', 'mouseWheel',
    'touchStarted', 'touchMoved', 'touchEnded', 'keyPressed', 'keyReleased', 'keyTyped',
];

function muteCanvasWhileMapIsActive() {
    for (const name of CANVAS_INPUT_HANDLERS) {
        const handler = window[name];
        if (typeof handler !== 'function' || handler.pmMuted) {
            continue;
        }
        const muted = function (...args) {
            if (document.body.classList.contains(MAP_ACTIVE_CLASS)) {
                return undefined; // let the event reach the map untouched
            }
            return handler.apply(this, args);
        };
        muted.pmMuted = true;
        window[name] = muted;
    }
}

// draw() also polls mouseIsPressed every frame, so pause the p5 loop while the map shows.
// p5 starts on window load, after this module runs; wait for it if needed.
function setCanvasRunning(running) {
    const apply = () => {
        if (typeof window.loop !== 'function' || typeof window.noLoop !== 'function') {
            return false;
        }
        if (running) {
            window.loop();
        } else {
            window.noLoop();
        }
        return true;
    };
    if (!apply()) {
        window.addEventListener('load', () => setTimeout(() => {
            if (document.body.classList.contains(MAP_ACTIVE_CLASS) !== running) {
                apply();
            }
        }), { once: true });
    }
}

export function createViewSwitch({ root, classicBar }) {
    muteCanvasWhileMapIsActive();
    // The Blade partial already shows the map view; pause the canvas while Maps loads.
    if (document.body.classList.contains(MAP_ACTIVE_CLASS)) {
        setCanvasRunning(false);
    }
    const notice = classicBar?.querySelector('[data-pm-notice]');
    const backToMap = classicBar?.querySelector('[data-pm-action="map"]');
    let mapAvailable = true;
    let scrolledToStep = false;
    const listeners = new Set();

    root.querySelectorAll('[data-pm-action="classic"]').forEach((link) => {
        link.addEventListener('click', (event) => {
            event.preventDefault();
            showClassic();
        });
    });
    backToMap?.addEventListener('click', showMap);

    function showMap() {
        if (!mapAvailable) {
            return;
        }
        document.body.classList.add(MAP_ACTIVE_CLASS);
        root.hidden = false;
        if (classicBar) {
            classicBar.hidden = true;
        }
        setCanvasRunning(false);
        scrollToStep();
        listeners.forEach((listener) => listener('map'));
    }

    // Land on Step 1 instead of the site header. Only on the standalone page: inside the
    // website's iframe the parent page owns the scroll.
    function scrollToStep() {
        if (scrolledToStep || window.parent !== window) {
            return;
        }
        scrolledToStep = true;
        requestAnimationFrame(() => root.scrollIntoView({ block: 'start' }));
    }

    function showClassic(reason) {
        document.body.classList.remove(MAP_ACTIVE_CLASS);
        setCanvasRunning(true);
        root.hidden = true;
        if (classicBar) {
            classicBar.hidden = false;
            notice.textContent = NOTICES[reason] || '';
            notice.hidden = !NOTICES[reason];
            backToMap.hidden = !mapAvailable;
        }
        // The p5 canvas was sized while hidden; let the layout adapter measure it again.
        window.dispatchEvent(new Event('resize'));
        listeners.forEach((listener) => listener('classic'));
    }

    return {
        showMap,
        showClassic,
        // Maps failed (invalid key, blocked script, no network): classic canvas for good.
        fail(reason) {
            mapAvailable = false;
            showClassic(reason);
        },
        onChange(listener) {
            listeners.add(listener);
        },
    };
}
