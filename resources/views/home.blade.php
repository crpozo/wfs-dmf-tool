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
    <!--
    <nav class="navbar navbar-expand-sm fix-top navbar-dark bg-primary">
      <div class="container">
        <div class="collapse navbar-collapse" id="navbarText">
          <a
            href="https://westernfencesupply.com/fl/"
            class="navbar-brand"
            target="_blank"
          >
            <img
              src="images/service-area-icon.png"
              alt="rush truck icon"
              width="170"
            />
          </a>
          <a href="#" class="navbar-text ms-auto">
            <img
              src="images/email-icon.png"
              alt="rush truck icon"
              width="300"
            />
          </a>
        </div>
      </div>
    </nav>
    -->

    <!-- Lower Nav Bar -->
    <!--
    <nav class="navbar navbar-expand-sm">
      <div class="container">
        <div class="navbar-collapse" id="navbarText">
          <span class="navbar-text">
            <img src="/images/fence-icon.png" width="37" alt="phone icon" />
            <a class="deco-none" href="/">HOME</a>
          </span>
          <span class="navbar-text mx-auto d-none d-sm-block">
            <a href="index.html">
              <img
                src="/images/logo.JPG"
                width="125"
                alt="western fence supply logo"
              />
            </a>
          </span>
          <span class="navbar-text d-none d-sm-block">
            <img
              src="/images/western-fence-supply-phone.svg"
              height="27"
              alt="phone icon"
            />
            Call us: (239) 689-5496
          </span>
        </div>
      </div>
    </nav>
    -->

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
        <section>
          <div class="hero text-black">
            <div class="container-xl">
              <div class="row">
                <div class="col-md-12">
                  <div
                    class="text-container p-3 d-flex flex-column justify-content-center h-100"
                  >
                    <p class="headline hide-margin fw-bold text-center mt-3">
                      Choose Your Fence Material
                    </p>
                    <p class="small hide-margin text-center">Click to select</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Selection -->

        <section class="selection" id="selection">
          <div class="container-xl">
            <div class="row g-4">
              <!-- Cards -->
              <div class="col-md-3">
                <div class="card border-0 justify-content-center">
                    <a href="/step/1/10">
                    <img
                      src="/images/cover-aluminum-fence.jpg"
                      alt=""
                      class="img-fluid mt-3 img-fence"
                    />
                        <div class="card-body p-0">
                            <div class="text-center mt-3">
                                <img
                                    src="images/colors_al.png"
                                    alt="Blue Line"
                                    width="100px"
                                    class="img-fluid"
                                />
                            </div>

                        </div>
                    </a>

                  <div class="card-title text-center fw-bold text-decoration-none pb-3">
                    Aluminum Fence
                  </div>
                    <ul class="card-text text-center text-ul">
                        <li>
                            <p class="nobotmar">Lightweight,</p>
                        </li>
                        <li>
                            <p>Lasting Protection</p>
                        </li>
                        <li>
                            <img class="icon-info" src="images/height.png" />
                        </li>
                        <li>
                            <p>4 ft / 5 ft / 6 ft</p>
                        </li>
                        <li>
                            <img class="icon-info" src="images/style.png" />
                        </li>
                        <li>
                            <p>Commercial / Residential</p>
                        </li>
                        <li>
                            <img class="icon-info" src="images/palette.png" />
                        </li>
                        <li>
                            <p>White / Black / Bronze</p>
                        </li>
                    </ul>
                </div>
              </div>

              <div class="col-md-3 fence-margin">
                <div class="card border-0 justify-content-center">
                  <a href="/step/1/20">
                    <img
                      src="images/cover-chain-link-fence.jpg"
                      alt=""
                      class="img-fluid mt-3 img-fence"
                    />
                    <div class="card-body p-0">
                      <div class="text-center mt-3">
                        <img
                          src="images/colors_cl.png"
                          alt="Blue Line"
                          width="100px"
                          class="img-fluid"
                        />
                      </div>

                    </div>
                  </a>
                  <div class="card-title text-center fw-bold deco-none pb-3">
                    Chain Link Fence
                  </div>
                    <ul class="card-text text-center text-ul">
                        <li>
                            <p class="nobotmar">A cost-effective</p>
                        </li>
                        <li>
                            <p>solution</p>
                        </li>
                        <li>
                            <img class="icon-info" src="images/height.png" />
                        </li>
                        <li>
                            <p>4 ft / 5 ft / 6 ft</p>
                        </li>
                        <li>
                            <img class="icon-info" src="images/style.png" />
                        </li>
                        <li>
                            <p>Commercial / Residential</p>
                        </li>
                        <li>
                            <img class="icon-info" src="images/palette.png" />
                        </li>
                        <li>
                            <p>Black / Green / Galvanized</p>
                        </li>
                    </ul>
                </div>
              </div>

              <div class="col-md-3">
                <div class="card border-0 justify-content-center">
                  <a href="/step/1/30">
                    <img
                      src="images/cover-metal-fence.jpg"
                      alt=""
                      class="img-fluid mt-3 img-fence"
                    />
                    <div class="card-body p-0">
                      <div class="text-center mt-3">
                        <img
                          src="images/colors_mt.png"
                          alt="Blue Line"
                          width="100px"
                          class="img-fluid"
                        />
                      </div>

                    </div>
                  </a>
                  <div class="card-title text-center fw-bold deco-none pb-3">
                    Metal Fence
                  </div>
                    <ul class="card-text text-center text-ul">
                        <li>
                            <p class="nobotmar">Ultimate Privacy,</p>
                        </li>
                        <li>
                            <p>Impeccable Design</p>
                        </li>
                        <li>
                            <img class="icon-info" src="images/height.png" />
                        </li>
                        <li>
                            <p>6 ft / 8 ft</p>
                        </li>
                        <li>
                            <img class="icon-info" src="images/style.png" />
                        </li>
                        <li>
                            <p>Original / Modern</p>
                        </li>
                        <li>
                            <img class="icon-info" src="images/palette.png" />
                        </li>
                        <li>
                            <p>White / Bronze / Woodgrain / Black</p>
                        </li>
                    </ul>
                </div>
              </div>

              <div class="col-md-3">
                <div class="card border-0 justify-content-center">
                  <a href="/step/1/40">
                    <img
                      src="images/cover-vinyl-fence.jpg"
                      alt=""
                      class="img-fluid mt-3 img-fence"
                    />
                    <div class="card-body p-0">
                      <div class="text-center mt-3">
                        <img
                          src="images/colors_vn.png"
                          alt="Blue Line"
                          width="100px"
                          class="img-fluid"
                        />
                      </div>

                    </div>
                  </a>
                  <div class="card-title text-center fw-bold deco-none pb-3">
                    Vinyl Fence
                  </div>
                    <ul class="card-text text-center text-ul">
                        <li>
                            <p class="nobotmar">Timeless Elegance,</p>
                        </li>
                        <li>
                            <p>Zero Maintenance</p>
                        </li>
                        <li>
                            <img class="icon-info" src="images/height.png" />
                        </li>
                        <li>
                            <p>4 ft / 5 ft / 6 ft</p>
                        </li>
                        <li>
                            <img class="icon-info" src="images/style.png" />
                        </li>
                        <li>
                            <p>Privacy / Semi Privacy / Picket / Ranch</p>
                        </li>
                        <li>
                            <img class="icon-info" src="images/palette.png" />
                        </li>
                        <li>
                            <p>White / Sand / Grey</p>
                        </li>
                    </ul>
                </div>
              </div>
            </div>
          </div>
        </section>
    </div>

    <div class="video-help-control" id="videoHelpControl">
      <button
        type="button"
        class="video-help-button"
        id="videoHelpButton"
        aria-label="Open help video"
      >
        <img src="@assetv('images/howTo.png')" alt="" class="video-help-button-image" />
        <span class="video-help-question" aria-hidden="true">?</span>
      </button>
      <button
        type="button"
        class="video-help-toggle"
        id="videoHelpToggle"
        aria-label="Minimize help video button"
        aria-pressed="false"
        title="Minimize help button"
      >
        <span aria-hidden="true">−</span>
      </button>
    </div>

    <div
      class="video-help-modal"
      id="videoHelpModal"
      aria-hidden="true"
      role="dialog"
      aria-label="Help video"
    >
      <div class="video-help-dialog">
        <button
          type="button"
          class="video-help-close"
          id="videoHelpClose"
          aria-label="Close help video"
        >
          X
        </button>
        <video
          class="video-help-player"
          id="videoHelpPlayer"
          playsinline
          preload="metadata"
        >
          <source src="@assetv('vid/wfs.mp4')" type="video/mp4" />
        </video>
      </div>
    </div>


    <!-- Footer
    <section>
      <div class="hero text-black">
        <div class="container-xl">
          <div class="row">
            <div class="col-md-12">
              <div
                class="text-container p-2 d-flex flex-column justify-content-center h-100"
              >
                <p
                  class="text-center hide-margin text-secondary small"
                  style="color: #c9a75c !important"
                >
                  Fences and Gates at Wholesale Prices.
                </p>
                <p class="text-center hide-margin text-uppercase fw-bold">
                  #1 Best Place to buy Fence in Southwest Florida
                </p>
                <p class="text-center hide-margin small">
                  We provide a simple and easy fence material order process from
                  start to finish.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
    -->

    <script src="@assetv('js/bootstrap.bundle.min.js')"></script>
    <script src="@assetv('js/script.js')"></script>
    <script
        src="https://code.jquery.com/jquery-3.7.1.min.js"
        integrity="sha256-/JqT3SQfawRcv/BIHPThkBvs0OEvtFFmqPF/lYI/Cxo="
        crossorigin="anonymous"></script>
    <script>
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

        const videoHelpButton = document.getElementById('videoHelpButton');
        const videoHelpControl = document.getElementById('videoHelpControl');
        const videoHelpToggle = document.getElementById('videoHelpToggle');
        const videoHelpModal = document.getElementById('videoHelpModal');
        const videoHelpClose = document.getElementById('videoHelpClose');
        const videoHelpPlayer = document.getElementById('videoHelpPlayer');

        function openVideoHelp() {
            videoHelpModal.classList.add('is-open');
            videoHelpModal.setAttribute('aria-hidden', 'false');
            videoHelpPlayer.currentTime = 0;
            videoHelpPlayer.play();
        }

        function closeVideoHelp() {
            videoHelpModal.classList.remove('is-open');
            videoHelpModal.setAttribute('aria-hidden', 'true');
            videoHelpPlayer.pause();
            videoHelpPlayer.currentTime = 0;
        }

        function toggleVideoHelpSize() {
            const isMinimized = videoHelpControl.classList.toggle('is-minimized');
            const toggleLabel = isMinimized
                ? 'Restore full help video button'
                : 'Minimize help video button';

            videoHelpButton.classList.remove('attention');
            videoHelpToggle.setAttribute('aria-label', toggleLabel);
            videoHelpToggle.setAttribute('aria-pressed', String(isMinimized));
            videoHelpToggle.setAttribute('title', isMinimized ? 'Restore help button' : 'Minimize help button');
            videoHelpToggle.querySelector('span').textContent = isMinimized ? '+' : '−';
        }

        videoHelpButton.addEventListener('click', openVideoHelp);
        videoHelpToggle.addEventListener('click', toggleVideoHelpSize);
        videoHelpClose.addEventListener('click', closeVideoHelp);
        videoHelpModal.addEventListener('click', function (event) {
            if (event.target === videoHelpModal) {
                closeVideoHelp();
            }
        });
        document.addEventListener('keydown', function (event) {
            if (event.key === 'Escape' && videoHelpModal.classList.contains('is-open')) {
                closeVideoHelp();
            }
        });

        window.addEventListener('load', function () {
            videoHelpButton.classList.add('attention');
        });
    </script>
  </body>
</html>
