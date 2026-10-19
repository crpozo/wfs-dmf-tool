<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link
      href="https://fonts.googleapis.com/css2?family=Open+Sans:ital,wght@0,400;0,600;0,700;1,400&display=swap"
      rel="stylesheet"
    />
    <link rel="stylesheet" href="/css/fontawesome.css" />
    <link rel="stylesheet" href="/css/bootstrap.css" />
    <link rel="stylesheet" href="/css/styles.css" />
    <link rel="icon" href="/images/favicon.ico" />

    <title>Western Fence Supply</title>
  </head>
  <body>
    <!-- Navagation -->

    <!-- Upper Nav Bar -->
    <nav class="navbar navbar-expand-sm fix-top navbar-dark bg-primary">
      <div class="container">
        <div class="collapse navbar-collapse" id="navbarText">
          <a
            href="https://westernfencesupply.com/fl/"
            class="navbar-brand"
            target="_blank"
          >
            <img
              src="/images/service-area-icon.png"
              alt="rush truck icon"
              width="170"
            />
          </a>
          <a href="#" class="navbar-text ms-auto">
            <img
              src="/images/email-icon.png"
              alt="rush truck icon"
              width="300"
            />
          </a>
        </div>
      </div>
    </nav>

    <!-- Lower Nav Bar -->
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

    <!-- Header -->
    <header class="hero-image">
      <div class="hero text-white">
        <div class="container-xl">
          <div class="row">
            <div class="col-md-12">
              <div class="text-container p-3 d-flex flex-column justify-content-center h-100 step">
                <h1 class="text-uppercase text-center fw-bold">
                    {{ $step }}
                </h1>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>

    <!-- Instructions -->

    <section>
      <div class="hero text-black">
        <div class="container-xl">
          <div class="row">
			<div class="col-md-3">
                <div class="row">
                    {!! Blade::compileString($breadcrums) !!}
                </div>
                <div class="row">
                    <!-- <button type="button" class="btn btn-primary step">Previous Step</button> -->
                    <a href="{{ $from }}" class="btn btn-primary prev_step" role="button">Previous Step</a>
                </div>
			</div>
            <div class="col-md-6">
              <div class="text-container p-3 d-flex flex-column justify-content-center h-100" style="margin-top:15px;">
                <p class="text-uppercase text-center hide-margin fw-bold">
                    {{ $title }}
                </p>
                <p class="text-center small hide-margin">Click to select</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Selection -->

    <section class="selection py-4 bg-primary" id="selection">
      <div class="container-xl">
        <div class="row g-4">
            {!! Blade::compileString($cardsTxt) !!}
        </div>
      </div>
    </section>

    <!-- Footer -->

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

    <script src="/js/bootstrap.bundle.min.js"></script>
    <script src="js/script.js"></script>
  </body>
</html>
