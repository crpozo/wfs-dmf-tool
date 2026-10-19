(function () {
    const trigger = document.querySelector('.mobile-trigger');
    const menu = document.getElementById('mobileMenu');
    const frame = document.getElementById('drawFenceFrame');
    const expectedOrigin = new URL(window.WFS_DRAWFENCE_EMBED_ORIGIN).origin;

    trigger?.addEventListener('click', function () {
        const willOpen = menu.hasAttribute('hidden');

        menu.toggleAttribute('hidden', !willOpen);
        trigger.setAttribute('aria-expanded', String(willOpen));
        trigger.setAttribute('aria-label', willOpen ? 'Close menu' : 'Open menu');
    });

    menu?.querySelectorAll('a').forEach(function (link) {
        link.addEventListener('click', function () {
            menu.setAttribute('hidden', '');
            trigger?.setAttribute('aria-expanded', 'false');
            trigger?.setAttribute('aria-label', 'Open menu');
        });
    });

    window.addEventListener('message', function (event) {
        if (event.origin !== expectedOrigin || event.source !== frame?.contentWindow) {
            return;
        }

        if (event.data?.type === 'wfs:drawfence:resize') {
            const height = Number(event.data.height);

            if (Number.isFinite(height) && height >= 520) {
                frame.style.minHeight = `${Math.ceil(height)}px`;
            }
        }
    });
})();
