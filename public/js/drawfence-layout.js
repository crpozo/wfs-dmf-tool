/*
 * Draw Your Fence - layout adapter shared by the embedded tool (base.html) and the
 * standalone drawing page (simple_draw.blade.php). It sizes the p5 canvas to its host,
 * stacks the panel under the canvas on small screens (see embed.css) and reports its
 * height to the parent page when embedded in an iframe.
 */

/*
 * Customizable Draw Fence behavior.
 *
 * External developers can edit this file to move tool elements, rename or hide
 * buttons, and customize how the canvas responds to its host. The core drawing
 * implementation continues to come from /drawfence.
 */
(function () {
    const config = {
        minimumCanvasHeight: 360,
        selectors: {
            dimensionsPanel: '#panelDims',
            header: '#header',
            workspace: '#panelDims',
            canvasHost: 'main'
        }
    };

    const parentOrigin = window.WFS_DRAWING_PARENT_ORIGIN;
    const dimensionsPanel = document.querySelector(config.selectors.dimensionsPanel);
    const workspace = dimensionsPanel?.parentElement;
    const canvasColumn = workspace?.firstElementChild;
    const canvasHost = canvasColumn?.querySelector(config.selectors.canvasHost);
    const header = document.querySelector(config.selectors.header);
    const toolbarRow = header?.querySelector('.row');
    const toolbarActions = toolbarRow?.firstElementChild;
    const toolbarTitle = toolbarRow?.lastElementChild;
    let drawingHostResizeFrame = null;

    document.body.classList.add('drawing-embedded');
    header?.classList.add('drawing-embed-toolbar');
    workspace?.classList.add('drawing-workspace');
    canvasColumn?.classList.add('drawing-canvas-column');
    canvasHost?.classList.add('drawing-canvas-host');
    toolbarActions?.classList.add('drawing-toolbar-actions');
    toolbarTitle?.classList.add('drawing-toolbar-title');

    function canvasSize() {
        return {
            width: Math.max(toolbarWidth + 1, Math.floor(canvasHost?.clientWidth || window.innerWidth)),
            height: Math.max(
                config.minimumCanvasHeight,
                Math.floor(canvasHost?.clientHeight || window.innerHeight)
            )
        };
    }

    function resizeEmbeddedCanvas() {
        if (typeof resizeCanvas !== 'function' || typeof createGraphics !== 'function') {
            return;
        }

        const size = canvasSize();

        if (size.width === _W && size.height === _H) {
            return;
        }

        _W = size.width;
        _H = size.height;
        $(dimensionsPanel).css('max-height', _H + 'px');
        buffer = createGraphics(_W - toolbarWidth, _H);
        gridlines();
        redrawing = true;
        resizeCanvas(_W, _H);
    }

    const standardSetup = window.setup;

    window.setup = function () {
        if (typeof standardSetup === 'function') {
            standardSetup();
        }

        const canvas = document.querySelector('canvas');
        if (canvasHost && canvas) {
            canvasHost.appendChild(canvas);
        }

        resizeEmbeddedCanvas();

        if (canvasHost && typeof ResizeObserver === 'function') {
            new ResizeObserver(function () {
                cancelAnimationFrame(drawingHostResizeFrame);
                drawingHostResizeFrame = requestAnimationFrame(resizeEmbeddedCanvas);
            }).observe(canvasHost);
        }
    };

    window.windowResized = resizeEmbeddedCanvas;
    if (typeof window.restart !== 'function') {
        window.restart = function () {
            window.location.reload();
        };
    }

    function notifyParent(type, details) {
        if (!parentOrigin || window.parent === window) {
            return;
        }

        window.parent.postMessage({
            type: type,
            version: 1,
            ...(details || {})
        }, parentOrigin);
    }

    function reportSize() {
        notifyParent('wfs:drawfence:resize', {
            height: Math.ceil(document.documentElement.scrollHeight)
        });
    }

    window.addEventListener('load', function () {
        notifyParent('wfs:drawfence:ready');
        reportSize();
    });

    window.addEventListener('resize', reportSize);

    if (typeof ResizeObserver === 'function') {
        new ResizeObserver(reportSize).observe(document.body);
    }
})();
