{{-- Loads configurator steps into #contenido without a full page reload.
     The controller answers /step/... with an HTML fragment, or redirects to /drawfence when the
     configuration is complete; redirects are followed as a normal navigation. --}}
<script>
    (function () {
        var contenido = document.getElementById('contenido');

        function loadStep(url) {
            contenido.classList.add('is-loading');
            fetch(url, { headers: { 'X-Requested-With': 'XMLHttpRequest' }, credentials: 'same-origin' })
                .then(function (response) {
                    if (response.redirected) {
                        window.location.href = response.url;
                        return;
                    }
                    return response.text().then(function (html) {
                        contenido.innerHTML = html;
                        contenido.classList.remove('is-loading');
                        // The final summary scrolls to the result itself; steps scroll to the top of the configurator.
                        var target = contenido.querySelector('.wfs-summary') || contenido;
                        var header = document.querySelector('.wfs-header');
                        var offset = (header ? header.offsetHeight : 90) + 16;
                        var top = target.getBoundingClientRect().top + window.pageYOffset - offset;
                        window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
                    });
                })
                .catch(function () {
                    window.location.href = url;
                });
        }

        document.addEventListener('click', function (event) {
            var link = event.target.closest('a');
            if (!link) return;
            var url = link.getAttribute('href');
            if (!url || url === '#' || url.indexOf('javascript') === 0) return;
            if (url.indexOf('/step/') !== 0) return;
            event.preventDefault();
            loadStep(url);
        });

        window.wfsLoadStep = loadStep;
    })();
</script>
