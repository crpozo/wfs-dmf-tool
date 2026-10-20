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
    @vite(['resources/css/app.css', 'resources/js/app.js'])
    @stack('head')
</head>
<body class="wfs-page @yield('body-class')">

    <header class="wfs-header">
        <div class="wfs-container">
            <a class="wfs-logo" href="{{ route('quote.create') }}" aria-label="Draw Your Fence home">
                <img src="@assetv('images/wfs-logo.svg')" alt="Western Fence Supply" />
            </a>
            <div class="wfs-header-right">
                <a class="wfs-header-link" href="https://www.westernfencesupply.com">
                    <i class="fas fa-arrow-left me-1"></i> westernfencesupply.com
                </a>
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
            <span>&copy; {{ date('Y') }} Western Fence Supply</span>
            <span>Fences and gates at wholesale prices &middot; Southwest Florida &middot; <a href="https://www.westernfencesupply.com">westernfencesupply.com</a></span>
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
