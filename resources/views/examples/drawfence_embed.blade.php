<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Draw My Fence | Western Fence Supply</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="@assetv('css/drawfence-example.css')">
</head>
<body>
    <header class="site-header">
        <div class="utility-bar">
            <div class="header-container utility-inner">
                <nav class="audience-links" aria-label="Customer type">
                    <a href="https://westernfencesupply.com/homeowners/">Homeowner <span aria-hidden="true">→</span></a>
                    <span class="utility-divider" aria-hidden="true"></span>
                    <a href="https://westernfencesupply.com/contractors/">Contractor <span aria-hidden="true">→</span></a>
                </nav>

                <div class="utility-contact">
                    <a href="tel:2394652482" class="phone-link" aria-label="Call Western Fence Supply">
                        <svg viewBox="0 0 16 16" aria-hidden="true">
                            <path d="M3 3h3l1.5 4-2 1c1 2 2.5 3.5 4.5 4.5l1-2 4 1.5v3c0 .5-.5 1-1 1C8 16 0 8 0 4c0-.5.5-1 1-1z"/>
                        </svg>
                        (239) 465-2482
                    </a>
                    <span class="utility-divider" aria-hidden="true"></span>
                    <div class="language-switch" aria-label="Language selector">
                        <button type="button" class="is-active" aria-pressed="true">🇺🇸 EN</button>
                        <button type="button" aria-pressed="false">🇲🇽 ES</button>
                    </div>
                </div>
            </div>
        </div>

        <div class="primary-bar">
            <div class="header-container primary-inner">
                <a href="https://westernfencesupply.com/" class="brand-link" aria-label="Western Fence Supply home">
                    <img src="{{ asset('images/wfs-logo-clr.png') }}" alt="Western Fence Supply">
                </a>

                <nav class="desktop-navigation" aria-label="Primary navigation">
                    <a href="https://westernfencesupply.com/products/">Fences <span aria-hidden="true">⌄</span></a>
                    <a href="https://westernfencesupply.com/estimate/">Gates <span aria-hidden="true">⌄</span></a>
                    <a href="https://westernfencesupply.com/contact/">Get a Quote <span aria-hidden="true">⌄</span></a>
                    <a href="https://westernfencesupply.com/about/">Company <span aria-hidden="true">⌄</span></a>
                    <a href="https://westernfencesupply.com/blog/">Fence Education Hub <span aria-hidden="true">⌄</span></a>
                </nav>

                <div class="header-actions">
                    <a href="#drawing-tool" class="draw-action">
                        <svg viewBox="0 0 16 16" aria-hidden="true">
                            <path d="M3 3h10v10H3zM3 6h10M6 3v10"/>
                        </svg>
                        Draw My Fence
                    </a>
                    <a href="https://westernfencesupply.com/contact/#get-a-quote" class="quote-action">
                        <span class="status-dot" aria-hidden="true"></span>
                        <span>Get a Free Quote</span>
                        <span class="quote-arrow" aria-hidden="true">→</span>
                    </a>
                    <button type="button" class="mobile-trigger" aria-expanded="false" aria-controls="mobileMenu" aria-label="Open menu">
                        <span></span><span></span><span></span>
                    </button>
                </div>
            </div>
        </div>

        <div id="mobileMenu" class="mobile-menu" hidden>
            <nav aria-label="Mobile navigation">
                <a href="https://westernfencesupply.com/products/">Fences</a>
                <a href="https://westernfencesupply.com/estimate/">Gates</a>
                <a href="https://westernfencesupply.com/contact/">Get a Quote</a>
                <a href="https://westernfencesupply.com/about/">Company</a>
                <a href="https://westernfencesupply.com/blog/">Fence Education Hub</a>
                <a href="#drawing-tool" class="mobile-draw-link">Draw My Fence</a>
            </nav>
        </div>
    </header>

    <section class="aluminum-hero" aria-labelledby="aluminumHeroTitle">
        <img
            class="aluminum-hero-image"
            src="https://crpozo.github.io/wfs-design-preview/assets/ALUM.webp"
            alt=""
            aria-hidden="true"
        >
        <div class="aluminum-hero-overlay" aria-hidden="true"></div>
        <div class="header-container aluminum-hero-content">
            <div class="aluminum-eyebrow">Powder-coat aluminum</div>
            <h1 id="aluminumHeroTitle">
                Powder-Coated Aluminum
                <span>Fence Materials.</span>
            </h1>
            <p>
                Aluminum fence materials for residential, commercial, and community projects,
                with pool-code compliant options available where required. Choose from multiple
                heights and styles, with gates, posts, rails, and hardware included as part of
                your complete material package.
            </p>
            <div class="aluminum-hero-actions">
                <a href="#drawing-tool" class="hero-primary-action">Request a Material Quote</a>
                <a href="#drawing-tool" class="hero-secondary-action">View Aluminum Styles</a>
            </div>
        </div>
    </section>

    <main id="drawing-tool" class="drawing-stage">
        <iframe
            id="drawFenceFrame"
            src="{{ $drawFenceEmbedUrl }}"
            title="Draw your fence"
            loading="eager"
            allow="fullscreen"
        ></iframe>
    </main>

    <script>
        window.WFS_DRAWFENCE_EMBED_ORIGIN = @json(url('/'));
    </script>
    <script src="@assetv('js/drawfence-example.js')"></script>
</body>
</html>
