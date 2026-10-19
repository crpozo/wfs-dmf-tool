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
    -->
    <section>
        <div class="hero text-black">
            <div class="container-xl">
                <div class="row">
                    <div class="col-md-3">
                        <div class="row">
                            {!! Blade::compileString($breadcrums) !!}
                        </div>
                        <div class="row">
                            <a href="{{ route('quote.create') }}" class="btn btn-primary home" role="button">
                                <i class="fas fa-home me-2"></i>
                            </a>

                            <a href="{{ $from }}" class="btn btn-primary prev_step" role="button">Previous Step</a>
                        </div>
                    </div>
                    <!--
                    <div class="col-md-6">
                        <div class="text-container p-3 d-flex flex-column justify-content-center h-100" style="margin-top:15px;">
                            <p class="text-uppercase text-center hide-margin fw-bold">
                                {{ $title }}
                            </p>
                            <p class="text-center small hide-margin">Click to select</p>
                        </div>
                    </div>
                    -->
                </div>
            </div>
        </div>
    </section>

    <section>
        <div class="hero text-black">
            <div class="container-xl">
                <div class="row">
                    <div class="col-md-12">
                        <div class="text-container p-3 d-flex flex-column justify-content-center h-100">
                            <p class="headline hide-margin fw-bold text-center">
                                {{ $title }}
                            </p>
                            <p class="small hide-margin text-center">Click to select</p>
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
        <div class="text-container p-3 d-flex flex-column justify-content-center h-100">            
            <p class="small hide-margin text-center step_note">{{ $step_note }}</p>
        </div>
      </div>
    </section>

    <section>
        <button id="btnInput" style="display:none;" type="button" class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#modalInput" data-bs-whatever="@mdo">Input</button>
        <div class="modal fade" id="modalInput" tabindex="-1" data-bs-backdrop="static" aria-labelledby="modalLbl" aria-hidden="true">
            <div class="modal-dialog">
                <div class="modal-content" id="modalContentInput">
                    <div class="modal-header">
                        <h5 class="modal-title" id="modalLbl">Enter height</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <form>
                            <div class="mb-3">
                                <div class="input-group mb-3">
                                    <span id="spInput" class="input-group-text">h</span>
                                    <input id="txtLength" type="number" steps="1" onkeydown="return event.key !== '.'" class="form-control" placeholder="Enter height" aria-label="Enter height" aria-describedby="basic-addon2">
                                    <span class="input-group-text" id="basic-addon2">ft</span>
                                </div>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer justify-content-between">
                        <div class="col-1">
                            <!-- <button class="btn btn-warning float-left" data-bs-target="#modalInputs" data-bs-toggle="modal" data-bs-dismiss="modal">List</button> -->
                            <!-- <button class="btn btn-warning float-left" onclick="loadDynamicContentModal()" data-bs-target="#modalInputs" data-bs-toggle="modal" data-bs-dismiss="modal">List</button>-->

                        </div>
                        <div class="col-4">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            {!! Blade::compileString($inputBtn) !!}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>
    <!--
    <script>
        $('a').bind('click', function(e) {
            console.log("FOLLOW");
            var url = $(this).attr('href');
            if(url.includes("draw")){
                window.location.href = url;
            }
            else {
                if(!url.includes("javascript")) {
                    if(this.id == 'btnInputOK') {
                        url += "/" + document.getElementById('txtLength').value;
                    }
                    $('#contenido').load(url);
                }
            }
            e.preventDefault();
        });
    </script>
    -->
