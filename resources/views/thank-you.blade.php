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
    </div>
</nav>

<!-- Header -->
<header class="header">
    <div class="hero text-white header-shadow">
        <div class="container-xl">
            <div class="row">
                <div class="col-md-12">
                    <div class="text-container p-3 d-flex flex-column justify-content-center h-100">
                        <h1 class="text-uppercase text-center fw-bold">
                            THANK YOU !
                        </h1>
                    </div>
                </div>
            </div>
        </div>
    </div>
</header>

<!-- Instructions -->

<div class="container-xs">
    <div class="container py-5">
        <div class="row justify-content-center">
            <div class="col-md-8 col-lg-6 text-center">

                <img src="@assetv('images/success.png')"
                     alt="Quote received"
                     class="mb-4"
                     style="max-width: 180px;">

                <h3 class="fw-semibold mb-2">
                    We’ve received your request!
                </h3>

                <p class="text-muted mb-4">
                    Thank you for contacting us. Our team is already reviewing
                    your information and will work on your quote shortly.
                </p>
                <br>
                <br>
                <a href="{{ route('quote.create') }}" class="d-inline-block">
                    <img src="@assetv('images/new_fence.png')"
                         alt="Start a new quote"
                         class="img-fluid"
                         style="max-width: 300px; cursor: pointer;">
                </a>
                <p class="text-muted small mt-3">
                    Need another estimate? Click above to start a new fence project.
                </p>

            </div>
        </div>
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
</script>
</body>
</html>
