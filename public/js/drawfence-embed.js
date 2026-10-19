(function () {
    const parentOrigin = window.WFS_DRAWING_PARENT_ORIGIN;
    const workspace = document.getElementById('panelDims')?.parentElement;
    const canvasColumn = workspace?.firstElementChild;
    const canvasHost = canvasColumn?.querySelector('main');
    const header = document.getElementById('header');
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
            height: Math.max(360, Math.floor(canvasHost?.clientHeight || window.innerHeight))
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
        $('#panelDims').css('max-height', _H + 'px');
        buffer = createGraphics(_W - toolbarWidth, _H);
        gridlines();
        redrawing = true;
        resizeCanvas(_W, _H);
    }

    const standardSetup = window.setup;

    window.setup = function () {
        standardSetup();

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
    window.restart = function () {
        window.location.reload();
    };

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
