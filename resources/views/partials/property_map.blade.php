{{--
    Draw on your property (Phase 2, Feature 1).
    Included just above the classic canvas workspace in simple_draw.blade.php and in
    public/drawfence-embed/base.html. Without GOOGLE_MAPS_BROWSER_KEY nothing renders and
    the page behaves exactly as before.
--}}
@if (config('services.google_maps.browser_key'))
    @vite(['resources/css/property-map.css', 'resources/js/property-map/index.js'])
    <script>
        window.WFS_PROPERTY_MAP = {!! json_encode(\App\Http\Controllers\PropertyMapController::clientConfig(), JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT) !!};
        // Hide the classic workspace before the first paint; the script falls back to it if Maps fails.
        document.body.classList.add('pm-map-active');
        // If the map bundle itself never runs (blocked or missing asset), bring the classic canvas back.
        setTimeout(function () {
            if (window.WFS_PROPERTY_MAP.booted) {
                return;
            }
            document.body.classList.remove('pm-map-active');
            window.dispatchEvent(new Event('resize'));
        }, 10000);
    </script>

    <section id="propertyMap" class="pm" aria-labelledby="propertyMapTitle">
        <div class="pm-head">
            <div class="pm-title">
                <span class="wfs-eyebrow">Step 1</span>
                <h2 class="wfs-display" id="propertyMapTitle">Draw on your property</h2>
            </div>
            <div class="pm-search">
                <div class="pm-search-field" data-pm-search></div>
                <button type="button" class="wfs-btn wfs-btn-outline pm-locate" data-pm-action="locate">
                    <i class="fas fa-location-arrow" aria-hidden="true"></i> Use my location
                </button>
            </div>
            <p class="pm-address" data-pm-address hidden></p>
        </div>

        <div class="pm-body">
            <div class="pm-map-column">
                <div class="pm-toolbar" role="toolbar" aria-label="Drawing tools">
                    <div class="pm-toolbar-group pm-mode" role="group" aria-label="Mode">
                        <button type="button" class="pm-tool" data-pm-action="mode-draw" aria-pressed="false">
                            <i class="fas fa-pen" aria-hidden="true"></i><span>Draw</span>
                        </button>
                        <button type="button" class="pm-tool" data-pm-action="mode-navigate" aria-pressed="false">
                            <i class="fas fa-hand-paper" aria-hidden="true"></i><span>Navigate</span>
                        </button>
                    </div>
                    <div class="pm-toolbar-group" role="group" aria-label="Edit">
                        <button type="button" class="pm-tool" data-pm-action="undo" aria-label="Undo" title="Undo (Ctrl+Z)">
                            <i class="fas fa-undo" aria-hidden="true"></i><span>Undo</span>
                        </button>
                        <button type="button" class="pm-tool" data-pm-action="redo" aria-label="Redo" title="Redo (Ctrl+Y)">
                            <i class="fas fa-redo" aria-hidden="true"></i><span>Redo</span>
                        </button>
                        <button type="button" class="pm-tool" data-pm-action="close" aria-label="Close shape" title="Join the last corner to the first one">
                            <i class="fas fa-draw-polygon" aria-hidden="true"></i><span>Close shape</span>
                        </button>
                        <button type="button" class="pm-tool pm-tool-danger" data-pm-action="clear" aria-label="Clear all">
                            <i class="fas fa-trash-alt" aria-hidden="true"></i><span>Clear all</span>
                        </button>
                    </div>
                </div>
                <p class="pm-hint" data-pm-hint aria-live="polite"></p>
                <div class="pm-map-frame">
                    <div class="pm-map" data-pm-map></div>
                    <p class="pm-message" data-pm-message role="status" hidden></p>
                </div>
                <p class="pm-disclaimer">
                    Lengths are measured on satellite imagery and are approximate. Our sales team confirms them before your order.
                </p>
            </div>

            <aside class="pm-panel wfs-panel" aria-labelledby="propertyMapRunsTitle">
                <div class="wfs-panel-head">
                    <span class="wfs-eyebrow">Your fence</span>
                    <h2 class="wfs-display" id="propertyMapRunsTitle">Sides</h2>
                    <p class="wfs-panel-hint">Each side is measured for you. If you know the exact length, type it in.</p>
                </div>
                <p class="pm-runs-empty" data-pm-runs-empty></p>
                <ol class="pm-runs" data-pm-runs></ol>
                <p class="pm-total" data-pm-total hidden></p>

                <div class="pm-actions">
                    <button type="button" class="wfs-btn wfs-btn-outline pm-action" data-pm-action="save">
                        <i class="fas fa-link" aria-hidden="true"></i> Save link
                    </button>
                    <button type="button" class="wfs-btn wfs-btn-ink pm-action" data-pm-action="estimate">
                        Continue to materials <i class="fas fa-arrow-right" aria-hidden="true"></i>
                    </button>
                </div>

                <div class="pm-saved" data-pm-saved hidden>
                    <label class="wfs-label" for="propertyMapSavedUrl">Your saved drawing (kept for 90 days)</label>
                    <div class="pm-saved-row">
                        <input type="text" id="propertyMapSavedUrl" class="form-control wfs-input" data-pm-saved-url readonly>
                        <button type="button" class="wfs-btn wfs-btn-outline" data-pm-action="copy-link">Copy</button>
                    </div>
                </div>

                <div class="pm-materials" data-pm-materials hidden>
                    <label class="wfs-label" for="propertyMapMaterials">List of Materials</label>
                    <p class="pm-materials-stale" data-pm-materials-stale hidden>
                        Your drawing changed. Select "Continue to materials" again to update this list.
                    </p>
                    <textarea id="propertyMapMaterials" class="form-control wfs-input" rows="10" data-pm-materials-list readonly></textarea>
                    <button type="button" class="wfs-btn wfs-btn-primary wfs-btn-block pm-action pm-quote" data-pm-action="quote">
                        Request a quote
                    </button>
                </div>
            </aside>
        </div>

        <p class="pm-switch">
            <a href="#" data-pm-action="classic">Use classic canvas instead</a>
        </p>
    </section>

    <div id="propertyMapClassicBar" class="pm-classic-bar" hidden>
        <p class="pm-classic-notice" data-pm-notice hidden></p>
        <button type="button" class="wfs-btn wfs-btn-outline" data-pm-action="map">
            <i class="fas fa-map-marked-alt" aria-hidden="true"></i> Draw on a map of your property
        </button>
    </div>
@endif
