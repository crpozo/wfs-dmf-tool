<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link
      href="https://fonts.googleapis.com/css2?family=Open+Sans:ital,wght@0,400;0,600;0,700;1,400&display=swap"
      rel="stylesheet"
    />
    <link rel="stylesheet" href="@assetv('css/fontawesome.css')" />
    <link rel="stylesheet" href="@assetv('css/bootstrap.css')" />
    <link rel="stylesheet" href="@assetv('css/styles.css')" />
    <link rel="stylesheet" href="@assetv('css/app.css')" />
    <link rel="icon" href="@assetv('images/favicon.ico')" />

    @vite(['resources/css/app.css', 'resources/js/app.js'])

    <title>Western Fence Supply</title>
  </head>
  <body>
    <!-- Navigation -->

    <!-- Upper Nav Bar -->
    <nav class="navbar" role="navigation">
        <div class="nav-inner">
            <div class="nav-inner-left">
                <div class="logo-wrap">
                    <a href="https://app.westernfencesupply.com" class="navbar-brand mr-auto align-left">
                        <!-- <img class="site-logo site-logo-scroll" src="/wp-content/themes/westernfencesupply/img/global/western-fence-supply-logo.svg" alt="Western Fence Supply Logo"> -->
                        <img class="site-logo-white" src="/images/wfs-logo-wht.svg" alt="Western Fence Supply Logo White">
                    </a>
                </div>
            </div>
            <!-- Settings Dropdown -->
            @if (Auth::check())
            <div class="hidden sm:flex sm:items-center sm:ms-6">
                <div class="relative">
                    <!-- Trigger Button -->
                    <button id="settingsDropdown" onclick="toggleDropdown()" class="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-gray-500 bg-white hover:text-gray-700 focus:outline-none transition ease-in-out duration-150">
                        <div>{{ Auth::user()->name }}</div>
                        <div class="ms-1">
                            <svg class="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a 1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
                            </svg>
                        </div>
                    </button>

                    <!-- Dropdown Content -->
                    <div id="dropdownContent" class="hidden absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
                        {{-- ADMIN ONLY --}}
                        @can('manage-users')
                            <a href="{{ route('admin.users.index') }}"
                               class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                                Users
                            </a>
                        @endcan

                        {{-- STAFF ONLY --}}
                        @can('view-quote-requests')
                            <a href="{{ route('quote_requests.index') }}"
                               class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                                Quote Requests
                            </a>
                        @endcan

                        <a href="{{ route('profile.edit') }}" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                            {{ __('Profile') }}
                        </a>
                        <form method="POST" action="{{ route('logout') }}">
                            @csrf
                            <button type="submit" class="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                                {{ __('Log Out') }}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
            @endif
        </div>
    </nav>

    <!-- Header -->
    <header class="header">
      <div class="hero text-white header-shadow">
        <div class="container-xl">
          <div class="row">
            <div class="col-md-12">
              <div
                class="text-container p-3 d-flex flex-column justify-content-center h-100"
              >
                <p class="text-uppercase text-center hide-margin">
                  draw your CUSTOM fence to get an instant list of all the
                  project material you need
                </p>
                <h1 class="text-uppercase text-center fw-bold">
                  EASY DRAW YOUR FENCE
                </h1>
                <p class="text-uppercase text-center hide-margin">
                  start your fence project
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>

    <!-- Instructions -->

    <div id="contenido">

    </div>

    <script src="@assetv('js/bootstrap.bundle.min.js')"></script>
    <script src="@assetv('js/script.js')"></script>
    <script
        src="https://code.jquery.com/jquery-3.7.1.min.js"
        integrity="sha256-/JqT3SQfawRcv/BIHPThkBvs0OEvtFFmqPF/lYI/Cxo="
        crossorigin="anonymous"></script>
    <script>
        $(document).ready(function () {
            const params = new URLSearchParams(window.location.search);
            const m = params.get('m');
            const c = params.get('c');
            if (!c || !m) return;

            const url = `/step/${encodeURIComponent(m)}/${encodeURIComponent(c)}`;

            $('#contenido').load(url, function () {
                window.history.replaceState({}, '', '/');
            });
        });
        /*
        $('a').bind('click', function(e) {
            var url = $(this).attr('href');
            if(url.includes("draw")){
                window.location.href = url;
            }
            else {
                $('#contenido').load(url);
            }
            e.preventDefault();
        });
         */
        $(document).on('click', 'a', function(e) {

            var url = $(this).attr('href');

            // ignore empty or JS pseudo-links
            if (!url || url.startsWith('javascript')) return;

            // allow full page for drawfence
            if (!url.endsWith("0")) {
                return;
            }

            // AJAX loading for all steps
            e.preventDefault();
            $('#contenido').load(url);
        });

        function toggleDropdown() {
            const dropdown = document.getElementById('dropdownContent');
            dropdown.classList.toggle('hidden');
        }
    </script>
  </body>
</html>
