    <!-- Header
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

    <section>
        <div class="hero text-black">
            <div class="container-xl">
                <div class="row">
                    <div class="col-md-3">
                        <div class="row">
                            {!! Blade::compileString($breadcrums) !!}
                        </div>
                        <div class="row">
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
    -->
    <section>
        <div class="hero text-black">
            <div class="container-xl">
                <div class="row">
                    <div class="col-md-12">
                        <div
                            class="text-container p-3 d-flex flex-column justify-content-center h-100"
                        >
                            <p class="headline hide-margin fw-bold">
                                {{ $title }}
                            </p>
                            <p class="small hide-margin">Click to select</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>
    <!-- Selection -->

    <section class="selection py-4" id="selection">
      <div class="container-xl">
        <div class="row g-4">
            {!! Blade::compileString($cardsTxt) !!}
        </div>
      </div>
    </section>

    <script>
        $('a').bind('click', function(e) {
            var url = $(this).attr('href');
            $('#contenido').load(url); // load the html response into a DOM element
            e.preventDefault(); // stop the browser from following the link
        });
    </script>

