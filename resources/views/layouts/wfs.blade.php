<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>@yield('title', 'Draw Your Fence') | Western Fence Supply</title>
    <link rel="icon" href="@assetv('images/favicon.ico')" />
    <link rel="stylesheet" href="@assetv('css/fontawesome.css')" />
    <link rel="stylesheet" href="@assetv('css/bootstrap.css')" />
    <link rel="stylesheet" href="@assetv('css/styles.css')" />
    <link rel="stylesheet" href="@assetv('css/wfs-brand.css')" />
    <link rel="stylesheet" href="@assetv('css/wfs-app.css')" />
    <link rel="stylesheet" href="@assetv('css/wfs-site.css')" />
    @vite(['resources/css/app.css', 'resources/js/app.js'])
    @stack('head')
</head>
<body class="wfs-page @yield('body-class')">

    {{-- Top bar and navigation mirror westernfencesupply.com; links go to the website. --}}
    <div class="wfs-topbar">
        <div class="wfs-container">
            <div class="wfs-topbar-links">
                <a href="https://westernfencesupply.com/homeowners/">Homeowner <span aria-hidden="true">&rarr;</span></a>
                <span class="wfs-topbar-sep"></span>
                <a href="https://westernfencesupply.com/contractors/">Contractor <span aria-hidden="true">&rarr;</span></a>
            </div>
            <div class="wfs-topbar-links">
                <a href="tel:+12392121473"><i class="fas fa-phone-alt"></i> (239) 212-1473</a>
            </div>
        </div>
    </div>

    <header class="wfs-header">
        <div class="wfs-container">
            <a class="wfs-logo" href="https://westernfencesupply.com/" aria-label="Western Fence Supply">
                <img src="@assetv('images/wfs-logo.svg')" alt="Western Fence Supply" />
            </a>

            <nav class="wfs-nav" aria-label="Main">
                <a href="https://westernfencesupply.com/products/">Fences</a>
                <a href="https://westernfencesupply.com/gate-single/">Gates</a>
                <a href="https://westernfencesupply.com/estimate/" class="is-current">Get a Quote</a>
                <a href="https://westernfencesupply.com/about/">Company</a>
                <a href="https://westernfencesupply.com/faq/">Fence Education Hub</a>
            </nav>

            <div class="wfs-header-right">
                <a href="{{ route('quote.create') }}" class="wfs-btn wfs-btn-primary wfs-btn-sm"><i class="fas fa-pencil-ruler"></i> Draw Your Fence</a>
                <a href="https://westernfencesupply.com/contact/#get-a-quote" class="wfs-btn wfs-btn-ink wfs-btn-sm">Get a Free Quote <span class="wfs-btn-arrow"><i class="fas fa-arrow-right"></i></span></a>
                @if (Auth::check())
                    <div class="wfs-user-menu">
                        <button id="settingsDropdown" type="button" onclick="toggleDropdown()">
                            <i class="fas fa-user-circle"></i>
                            <span>{{ Auth::user()->name }}</span>
                            <i class="fas fa-chevron-down" style="font-size: 11px;"></i>
                        </button>
                        <div id="dropdownContent" class="wfs-dropdown hidden">
                            @can('manage-users')
                                <a href="{{ route('admin.users.index') }}">Users</a>
                            @endcan
                            @can('view-quote-requests')
                                <a href="{{ route('quote_requests.index') }}">Quote Requests</a>
                            @endcan
                            <a href="{{ route('profile.edit') }}">{{ __('Profile') }}</a>
                            <form method="POST" action="{{ route('logout') }}">
                                @csrf
                                <button type="submit">{{ __('Log Out') }}</button>
                            </form>
                        </div>
                    </div>
                @endif
            </div>
        </div>
    </header>

    <main class="wfs-main">
        <div class="wfs-container">
            @yield('content')
        </div>
    </main>

    <footer class="wfs-footer">
        <div class="wfs-container">
            <div class="wfs-footer-grid">
                <div class="wfs-footer-brand">
                    <img src="@assetv('images/wfs-logo-wht.svg')" alt="Western Fence Supply" />
                    <p>Fencing material supplier for contractors, homeowners and DIY projects. Family-owned, factory-direct. We supply, we don't install.</p>
                    <a href="tel:+12392121473" class="wfs-footer-phone"><i class="fas fa-phone-alt"></i> (239) 212-1473</a>
                </div>
                <div>
                    <h4>Products</h4>
                    <a href="https://westernfencesupply.com/vinyl/">Vinyl / PVC</a>
                    <a href="https://westernfencesupply.com/aluminum/">Aluminum</a>
                    <a href="https://westernfencesupply.com/chain-link/">Chain Link</a>
                    <a href="https://westernfencesupply.com/metal/">Metal / DuraFence</a>
                    <a href="https://westernfencesupply.com/ecfence/">EC Fence</a>
                    <a href="https://westernfencesupply.com/products/">Full catalog</a>
                </div>
                <div>
                    <h4>Solutions</h4>
                    <a href="https://westernfencesupply.com/contractors/">For Contractors</a>
                    <a href="https://westernfencesupply.com/homeowners/">For Homeowners</a>
                    <a href="https://westernfencesupply.com/solutions/">For HOA</a>
                    <a href="https://westernfencesupply.com/solutions/">Commercial</a>
                </div>
                <div>
                    <h4>Resources</h4>
                    <a href="https://westernfencesupply.com/faq/">FAQ</a>
                    <a href="https://westernfencesupply.com/materials-comparison/">Materials Comparison</a>
                    <a href="https://westernfencesupply.com/pool-code/">Florida Pool Code</a>
                    <a href="https://westernfencesupply.com/locations/">Yard Locations</a>
                    <a href="https://westernfencesupply.com/areas-we-serve/">Areas We Serve</a>
                </div>
                <div>
                    <h4>Company</h4>
                    <a href="https://westernfencesupply.com/about/">About WFS</a>
                    <a href="https://westernfencesupply.com/contact/">Contact</a>
                    <a href="mailto:sales@westernfencesupply.com">sales@westernfencesupply.com</a>
                    <a href="mailto:salespc@westernfencesupply.com">salespc@westernfencesupply.com</a>
                </div>
            </div>
            <div class="wfs-footer-bottom">
                <span>&copy; {{ date('Y') }} Western Fence Supply &middot; Fort Myers, FL &middot; Port Charlotte, FL</span>
                <span><a href="https://westernfencesupply.com/privacy-policy/">Privacy</a> &middot; <a href="mailto:sales@westernfencesupply.com">sales@westernfencesupply.com</a></span>
            </div>
        </div>
    </footer>

    <script
        src="https://code.jquery.com/jquery-3.7.1.min.js"
        integrity="sha256-/JqT3SQfawRcv/BIHPThkBvs0OEvtFFmqPF/lYI/Cxo="
        crossorigin="anonymous"></script>
    <script src="@assetv('js/bootstrap.bundle.min.js')"></script>
    <script>
        function toggleDropdown() {
            var dropdown = document.getElementById('dropdownContent');
            if (dropdown) { dropdown.classList.toggle('hidden'); }
        }
        document.addEventListener('click', function (event) {
            var menu = document.querySelector('.wfs-user-menu');
            var dropdown = document.getElementById('dropdownContent');
            if (menu && dropdown && !menu.contains(event.target)) { dropdown.classList.add('hidden'); }
        });
    </script>
    @stack('scripts')
</body>
</html>
