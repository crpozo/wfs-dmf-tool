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
                    <div
                        class="text-container p-3 d-flex flex-column justify-content-center h-100"
                    >
                        <p class="text-uppercase text-center hide-margin">
                            Please complete this information
                        </p>
                        <h1 class="text-uppercase text-center fw-bold">
                            to receive your quote
                        </h1>
                    </div>
                </div>
            </div>
        </div>
    </div>
</header>

<!-- Instructions -->

<div class="container-xs">
    <form method="POST" action="{{ route('quote.store') }}" class="row g-3" id="quoteRequestForm">
        @csrf
        <input type="hidden" name="canvas_image" id="quoteCanvasImage">

        <div class="row rowForm">
            <div class="col-md-6">
                <label class="form-label">
                    Full Name <span class="text-danger">*</span>
                </label>
                <input type="text"
                       name="full_name"
                       class="form-control inputForm"
                       required>
            </div>
        </div>

        {{-- Email --}}
        <div class="row rowForm">
            <div class="col-md-6">
                <label class="form-label">
                    Email Address <span class="text-danger">*</span>
                </label>
                <small class="text-muted d-block mb-1">
                    This is where you’ll receive your quote
                </small>
                <input type="email"
                       name="email"
                       class="form-control inputForm"
                       required>
            </div>
        </div>

        {{-- Phone --}}
        <div class="row rowForm">
            <div class="col-md-6">
                <label class="form-label">
                    Phone Number
                </label>
                <input type="tel"
                       name="phone"
                       class="form-control inputForm">
            </div>

            {{-- Preferred Contact --}}
            <div class="col-md-6">
                <label class="form-label">
                    Preferred Contact Method
                </label>
                <select name="preferred_contact_method" class="form-select">
                    <option value="">Select…</option>
                    <option>Email</option>
                    <option>Phone</option>
                    <option>Text</option>
                </select>
            </div>
        </div>

        <div class="row rowForm">
            <div class="col-md-6">
                <label class="form-label d-block">
                    Fulfillment
                </label>
                <div class="btn-group w-100" role="group" aria-label="Fulfillment method">
                    <input type="radio"
                           class="btn-check"
                           name="fulfillment_method"
                           id="fulfillmentPickup"
                           value="pickup"
                           autocomplete="off"
                           checked>
                    <label class="btn btn-outline-primary" for="fulfillmentPickup">Pick Up</label>

                    <input type="radio"
                           class="btn-check"
                           name="fulfillment_method"
                           id="fulfillmentDelivery"
                           value="delivery"
                           autocomplete="off">
                    <label class="btn btn-outline-primary" for="fulfillmentDelivery">Delivery</label>
                </div>
            </div>

            <div class="col-md-6" id="pickupLocationGroup">
                <label class="form-label d-block">
                    Pick Up Location
                </label>
                <div class="btn-group w-100" role="group" aria-label="Pick up location">
                    <input type="radio"
                           class="btn-check"
                           name="company_id"
                           id="pickupFortMyers"
                           value="1"
                           autocomplete="off"
                           checked>
                    <label class="btn btn-outline-primary" for="pickupFortMyers">Fort Myers</label>

                    <input type="radio"
                           class="btn-check"
                           name="company_id"
                           id="pickupPortCharlotte"
                           value="2"
                           autocomplete="off">
                    <label class="btn btn-outline-primary" for="pickupPortCharlotte">Port Charlotte</label>
                </div>
            </div>
        </div>

        <div class="row rowForm">
            {{-- ZIP Code --}}
            <div class="col-md-4">
                <label class="form-label">
                    Service Address ZIP Code
                </label>
                <input type="text"
                       name="zip_code"
                       class="form-control inputForm">
            </div>

            {{-- Property Type --}}
            <div class="col-md-4">
                <label class="form-label">
                    Property Type
                </label>
                <select name="property_type" class="form-select">
                    <option value="">Select…</option>
                    <option>Residential</option>
                    <option>Commercial</option>
                    <option>Industrial</option>
                    <option>HOA</option>
                    <option>Multi-unit</option>
                </select>
            </div>

            {{-- Project Type --}}
            <div class="col-md-4">
                <label class="form-label">
                    Type of Project
                </label>
                <select name="project_type" class="form-select">
                    <option value="">Select…</option>
                    <option>New installation</option>
                    <option>Replacement</option>
                    <option>Repair</option>
                    <option>Temporary</option>
                </select>
            </div>
        </div>        

        <div class="row rowForm">
            {{-- Timeline --}}
            <div class="col-md-4">
                <label class="form-label">
                    Timeline
                </label>
                <select name="timeline" class="form-select">
                    <option value="">Select…</option>
                    <option>ASAP</option>
                    <option>1–3 months</option>
                    <option>3–6 months</option>
                    <option>Just researching</option>
                </select>
            </div>

            {{-- Primary Reason --}}
            <div class="col-md-4">
                <label class="form-label">
                    Primary Reason for Project
                </label>
                <select name="primary_reason" class="form-select">
                    <option value="">Select…</option>
                    <option>Privacy</option>
                    <option>Security</option>
                    <option>Pets</option>
                    <option>Aesthetics</option>
                    <option>Compliance / HOA</option>
                    <option>Commercial requirements</option>
                </select>
            </div>

            {{-- How did you hear --}}
            <div class="col-md-4">
                <label class="form-label">
                    How Did You Hear About Us? <span class="text-danger">*</span>
                </label>
                <select name="lead_source_id" id="quoteLeadSource" class="form-select" required disabled>
                    <option value="">Select…</option>
                </select>
                <input type="hidden" name="hear_about_us" id="quoteLeadSourceName">
                <small id="quoteLeadSourceError" class="text-danger d-none">
                    Lead sources could not be loaded. Please refresh and try again.
                </small>
            </div>
        </div>

        {{-- Submit --}}
        <div class="col-12">
            <button type="submit" class="btn btn-primary px-4" id="quoteRequestSubmit">
                Request Quote
            </button>
        </div>
    </form>
</div>

<script>
    try {
        var quoteCanvasImage = sessionStorage.getItem('quoteCanvasImage');

        if (quoteCanvasImage) {
            document.getElementById('quoteCanvasImage').value = quoteCanvasImage;
        }
    } catch (error) {
        console.error('Unable to restore fence sketch:', error);
    }

    var fulfillmentInputs = document.querySelectorAll('input[name="fulfillment_method"]');
    var pickupLocationGroup = document.getElementById('pickupLocationGroup');

    fetch(@json(route('odoo.lead_sources.index')), {
        headers: { 'Accept': 'application/json' }
    })
        .then(function (response) {
            if (!response.ok) {
                throw new Error('Unable to load lead sources.');
            }

            return response.json();
        })
        .then(function (payload) {
            var select = document.getElementById('quoteLeadSource');
            select.innerHTML = '<option value="">Select...</option>';

            (payload.data || []).forEach(function (source) {
                var option = document.createElement('option');
                option.value = source.id;
                option.textContent = source.name;
                select.appendChild(option);
            });

            select.disabled = false;
        })
        .catch(function (error) {
            console.error(error);
            document.getElementById('quoteLeadSource').innerHTML = '<option value="">Unavailable</option>';
            document.getElementById('quoteLeadSourceError').classList.remove('d-none');
        });

    document.getElementById('quoteLeadSource').addEventListener('change', function () {
        var selected = this.options[this.selectedIndex];
        document.getElementById('quoteLeadSourceName').value = this.value ? selected.text : '';
    });

    function syncPickupLocationVisibility() {
        var selectedFulfillment = document.querySelector('input[name="fulfillment_method"]:checked');
        var isPickup = !selectedFulfillment || selectedFulfillment.value === 'pickup';

        pickupLocationGroup.style.display = isPickup ? '' : 'none';
    }

    fulfillmentInputs.forEach(function (input) {
        input.addEventListener('change', syncPickupLocationVisibility);
    });

    syncPickupLocationVisibility();

    document.getElementById('quoteRequestForm').addEventListener('submit', function (event) {
        var submitButton = document.getElementById('quoteRequestSubmit');

        if (!document.getElementById('quoteCanvasImage').value) {
            event.preventDefault();
            alert('The fence sketch could not be captured. Please return to the drawing and try again.');
            return;
        }

        if (submitButton.disabled) {
            return;
        }

        submitButton.disabled = true;
        submitButton.textContent = 'Processing quote...';
    });
</script>

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
