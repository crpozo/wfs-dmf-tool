<!DOCTYPE html>
<html lang="en">
<head>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.7.0/p5.js"></script>
    <!-- <script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.7.0/addons/p5.sound.min.js"></script> -->
    <link rel="stylesheet" type="text/css" href="@assetv('css/style.css')">
    <link rel="stylesheet" href="@assetv('css/styles.css')" />
    <link rel="stylesheet" href="@assetv('css/fontawesome.css')" />
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-EVSTQN3/azprG1Anm3QDgpJLIm9Nao0Yz1ztcQTwFspd3yD65VohhpuuCOmLASjC" crossorigin="anonymous">
    <link rel="stylesheet" href="@assetv('css/bootstrap.css')" />
    <link rel="stylesheet" href="@assetv('css/styles.css')" />
    <link rel="stylesheet" href="@assetv('css/app.css')" />
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/sweetalert2@11.14.5/dist/sweetalert2.min.css">
    <link href="@assetv('css/select2.min.css')" rel="stylesheet" />
    <link rel="stylesheet" href="@assetv('css/wfs-brand.css')" />
    <link rel="stylesheet" href="@assetv('drawfence-embed/embed.css')" />

    @vite(['resources/css/app.css', 'resources/js/app.js'])
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11.14.5/dist/sweetalert2.all.min.js"></script>
    <link rel="stylesheet" href="https://unpkg.com/shepherd.js/dist/css/shepherd.css">
    <script type="module" src="https://cdn.jsdelivr.net/npm/shepherd.js@13.0.0/dist/esm/shepherd.mjs"></script>

    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>Draw Your Fence | Western Fence Supply</title>
    <style>
        .quote-request-swal {
            padding: 0;
            border-radius: 14px;
            overflow: hidden;
        }

        .quote-request-swal .swal2-title {
            width: 100%;
            margin: 0;
            padding: 18px 24px;
            background: var(--wfs-ink);
            color: #fff;
            font-size: 20px;
            font-weight: 700;
            text-align: left;
        }

        .quote-request-swal .swal2-html-container {
            margin: 0;
            padding: 22px 24px 8px;
        }

        .quote-request-swal .swal2-actions {
            width: 100%;
            margin: 0;
            padding: 10px 24px 24px;
            justify-content: flex-end;
        }

        .quote-request-swal .form-label {
            color: #1f2937;
            font-size: 13px;
            font-weight: 700;
        }

        .quote-request-swal .form-control,
        .quote-request-swal .form-select,
        .quote-request-swal .select2-container--default .select2-selection--single {
            min-height: 42px;
            border-radius: 8px;
            border-color: #cbd5e1;
        }

        .quote-request-swal .swal2-confirm {
            background: var(--wfs-ink) !important;
            border-radius: 8px;
            font-weight: 700;
        }

        .quote-request-swal .swal2-cancel {
            border-radius: 8px;
        }
    </style>
</head>
<body class="drawing">

    
    <nav id="navbar" class="navbar" role="navigation">
        <div class="nav-inner">
            <div class="nav-inner-left">
                <div class="logo-wrap">
                    <a href="https://app.westernfencesupply.com" class="navbar-brand mr-auto align-left">
                        <!-- <img class="site-logo site-logo-scroll" src="/wp-content/themes/westernfencesupply/img/global/western-fence-supply-logo.svg" alt="Western Fence Supply Logo"> -->
                        <img class="site-logo-white" style="height:36px;" src="/images/wfs-logo.svg" alt="Western Fence Supply">
                    </a>
                </div>
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
                    <div id="dropdownContent" class="hidden absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none" style="z-index: 2001;">
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
    </nav>

    <header id="header" class="header wfs-toolbar">
        <div class="hero">
            <div>
                <div class="row">
                    <div class="col-md-9 wfs-toolbar-actions">
                        <button id="btnRestart" type="button" class="btn btn-files" onclick="restart();">
                            <i class="fas fa-repeat me-2"></i> Restart Project
                        </button>
                        <input type="file" id="fileInput" style="display: none;" accept=".wfs">

                        <button
                            id="btnLoad"
                            type="button"
                            class="btn btn-files"
                            data-toolbar-help-video="Load Project"
                            data-toolbar-help-label="Load Project"
                        >
                            <i class="fas fa-folder-open me-2"></i> Load Project
                        </button>
                        <button
                            id="btnSave"
                            type="button"
                            class="btn btn-files"
                            data-toolbar-help-video="Save Project"
                            data-toolbar-help-label="Save Project"
                        >
                            <i class="fas fa-save me-2"></i> Save Project
                        </button>
                        <button
                            id="btnTemplate"
                            type="button"
                            class="btn btn-files"
                            onclick="loadTemplates();"
                            data-toolbar-help-video="Use Template"
                            data-toolbar-help-label="Use Template"
                        >
                            <i class="fas fa-map me-2"></i> Use Template
                        </button>

                        <a href="/goto?m={{ $m }}&c={{ $c }}" class="btn btn-files">
                            <i class="fas fa-arrow-left me-2"></i> Previous Step
                        </a>

                        <button id="btnPrintSketch" type="button" class="btn btn-files" onclick="printFenceCanvas();">
                            <i class="fas fa-print me-2"></i> Print Sketch
                        </button>

                        <button id="btnHelp" type="button" class="btn btn-files btn-files-help">
                            <i class="fas fa-question me-2"></i> Help
                        </button>
                    </div>

                    <div class="col-md-3 wfs-toolbar-title">
                        <div class="text-container d-flex flex-column justify-content-center h-100">
                            <span class="wfs-eyebrow">Easy</span>
                            <h1 class="wfs-display">Draw Your Fence</h1>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </header>

    <div
        class="video-help-modal"
        id="toolHelpVideoModal"
        aria-hidden="true"
        role="dialog"
        aria-modal="true"
        aria-labelledby="toolHelpVideoTitle"
    >
        <div class="video-help-dialog">
            <button
                type="button"
                class="video-help-close"
                id="toolHelpVideoClose"
                aria-label="Close tool help video"
            >
                X
            </button>
            <h2 class="visually-hidden" id="toolHelpVideoTitle">Tool help video</h2>
            <video
                class="video-help-player"
                id="toolHelpVideoPlayer"
                controls
                playsinline
                preload="metadata"
            >
                <source src="@assetv('vid/wfs.mp4')" type="video/mp4" />
            </video>
        </div>
    </div>

    <button id="btnDim" style="display:none;" type="button" class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#modalDim" data-bs-whatever="@mdo">Dim</button>
    <div class="modal fade" id="modalDim" tabindex="-1" data-bs-backdrop="static" aria-labelledby="modalLbl" aria-hidden="true">
        <div class="modal-dialog">
            <div class="modal-content" id="modalContentDim">
                <div class="modal-header">
                    <h5 class="modal-title wfs-display" id="modalLbl">Enter length</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <form>
                        <div class="mb-3">
                            <div class="input-group mb-3">
                                <span id="spDim" class="input-group-text">d</span>
                                <input id="txtLength" type="text" class="form-control" placeholder="Enter length" aria-label="Enter length" aria-describedby="basic-addon2">
                                <span class="input-group-text" id="basic-addon2">ft</span>
                            </div>
                        </div>
                    </form>
                </div>
                <div class="modal-footer justify-content-between">
                    <div class="col-1">
                        <!-- <button class="btn btn-warning float-left" data-bs-target="#modalDims" data-bs-toggle="modal" data-bs-dismiss="modal">List</button> -->
                        <!-- <button class="btn btn-warning float-left" onclick="loadDynamicContentModal()" data-bs-target="#modalDims" data-bs-toggle="modal" data-bs-dismiss="modal">List</button>-->

                    </div>
                    <div class="col-4">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button id="btnDimOK" type="button" class="btn btn-primary">OK</button>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div class="modal fade" id="modalDims" tabindex="-1" data-bs-backdrop="static" aria-labelledby="modalLbl" aria-hidden="true">
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title wfs-display" id="modalLbl">Enter length</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <form>
                        <div id="formDims" class="mb-3">
                            <!--
                            <div class="input-group mb-3">
                                <span id="spDim" class="input-group-text">d</span>
                                <input id="txtLength" type="text" class="form-control" placeholder="Enter length" aria-label="Enter length" aria-describedby="basic-addon2">
                                <span class="input-group-text" id="basic-addon2">ft</span>
                            </div>
                            -->
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                    <button id="btnDimsOK" type="button" class="btn btn-primary">OK</button>
                </div>
            </div>
        </div>
    </div>

    <button id="btnGate" style="display:none;" type="button" class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#modalGates" data-bs-whatever="@mdo">Gate</button>
    <div class="modal fade" id="modalGates" tabindex="-1" data-bs-backdrop="static" aria-labelledby="modalGatesLbl" aria-hidden="true">
        <div class="modal-dialog" style="display:table;">
            <div class="modal-content" >
                <div class="modal-header">
                    <h5 class="modal-title wfs-display" id="modalGatesLbl">Select Gate Type</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <form>
                        <div class="row mb-3">
                            <div class="btn-group" role="group" aria-label="Basic radio toggle button group">
                                <!--
                                <input type="radio" class="btn-check" name="radioGate" id="btnSwing" autocomplete="off" checked>
                                <label class="btn btn-outline-primary" for="btnSwing">Swing Gate</label>

                                <input type="radio" class="btn-check" name="radioGate" id="btnRolling" autocomplete="off">
                                <label class="btn btn-outline-primary" for="btnRolling">Rolling Gate</label>

                                <input type="radio" class="btn-check" name="radioGate" id="btnSliding" autocomplete="off">
                                <label class="btn btn-outline-primary" for="btnSliding">Sliding Gate</label>

                                <input type="radio" class="btn-check" name="radioGate" id="btnCantilever" autocomplete="off">
                                <label class="btn btn-outline-primary" for="btnCantilever">Cantilever Gate</label>
                                -->
                                @if($hayAl)
                                <label class="lbl-door">
                                    <input type="radio" class="btn-check" name="radioGate" id="btnSwing" value="0" autocomplete="off" checked>
                                    <img class="btn-door" src="img/Alum_Single_Swing_Gate.png" alt="Swing Gate">
                                </label>
                                <label class="lbl-door">
                                    <input type="radio" class="btn-check" name="radioGate" id="btnSliding" value="2" autocomplete="off">
                                    <img class="btn-door"src="img/Alum_Sliding_Gate.png" alt="Sliding Gate">
                                </label>
                                <label class="lbl-door">
                                    <input type="radio" class="btn-check" name="radioGate" id="btnCantilever" value="3" autocomplete="off">
                                    <img class="btn-door" src="img/Alum_Cantilever_Gate.png" alt="Cantilever Gate">
                                </label>
                                @endif
                                @if($hayChain)
                                <label class="lbl-door">
                                    <input type="radio" class="btn-check" name="radioGate" id="btnSwing" value="0" autocomplete="off" checked>
                                    <img class="btn-door" src="img/Chain_Single_Swing_Gate.png" alt="Swing Gate">
                                </label>
                                <label class="lbl-door">
                                    <input type="radio" class="btn-check" name="radioGate" id="btnSliding" value="2" autocomplete="off">
                                    <img class="btn-door"src="img/Chain_Sliding_Gate.png" alt="Sliding Gate">
                                </label>
                                <label class="lbl-door">
                                    <input type="radio" class="btn-check" name="radioGate" id="btnRolling" value="1" autocomplete="off">
                                    <img class="btn-door" src="img/Chain_Rolling_Gate.png" alt="Rolling Gate">
                                </label>
                                <label class="lbl-door">
                                    <input type="radio" class="btn-check" name="radioGate" id="btnCantilever" value="3" autocomplete="off">
                                    <img class="btn-door" src="img/Chain_Cantilever_Gate.png" alt="Cantilever Gate">
                                </label>
                                @endif
                                @if($hayPVC)
                                <label class="lbl-door">
                                    <input type="radio" class="btn-check" name="radioGate" id="btnSwing" value="0" autocomplete="off" checked>
                                    <img class="btn-door" src="img/Vinyl_Single_Swing_Gate.png" alt="Swing Gate">
                                </label>
                                <label class="lbl-door">
                                    <input type="radio" class="btn-check" name="radioGate" id="btnSliding" value="2" autocomplete="off">
                                    <img class="btn-door"src="img/Vinyl_Sliding_Gate.png" alt="Sliding Gate">
                                </label>
                                @endif
                                @if($hayMetal)
                                <label class="lbl-door">
                                    <input type="radio" class="btn-check" name="radioGate" id="btnSwing" value="0" autocomplete="off" checked>
                                    <img class="btn-door" src="img/Metal_Single_Swing_Gate.png" alt="Swing Gate">
                                </label>
                                <label class="lbl-door">
                                    <input type="radio" class="btn-check" name="radioGate" id="btnSliding" value="2" autocomplete="off">
                                    <img class="btn-door"src="img/Metal_Sliding_Gate.png" alt="Sliding Gate">
                                </label>
                                @endif
                            </div>
                        </div>
                        <div class="row mb-3">

                            <div class="btn-group" role="group" aria-label="Door Width">
                                <!--
                                <button type="button" class="btn btn-primary">4 FT</button>
                                <button type="button" class="btn btn-primary">5 FT</button>
                                <button type="button" class="btn btn-primary">6 FT</button>
                                <button type="button" class="btn btn-primary">CUSTOM</button>
                                -->


                                <label class="btn btn-primary dwBtn active">
                                    <input type="radio" class="doorWidth" name="sDoorWidth" id="sdoor4" value="4" checked> 4 FT
                                </label>
                                <label class="btn btn-primary dwBtn">
                                    <input type="radio" class="doorWidth" name="sDoorWidth" id="sdoor5" value="5"> 5 FT
                                </label>
                                <label class="btn btn-primary dwBtn">
                                    <input type="radio" class="doorWidth" name="sDoorWidth" id="sdoor6" value="6"> 6 FT
                                </label>
                                <label class="btn btn-primary dwBtn text-end" id="lblSCustom">
                                    <input type="radio" class="doorWidth" name="sDoorWidth" id="sdoorCustom" onclick="$.noop(); $('#sDoorCustomWidth').focus();" value="0"> CUSTOM:
                                </label>

                                <input type="text" id="sDoorCustomWidth" style="width:100px;" class="form-control" aria-label="Custom Width FT">
                                <span class="input-group-text">FT</span>
                            </div>
                        </div>
                    </form>
                </div>
                <div id="gateDisclaimer" class="px-3 pb-2 text-danger fw-bold" style="display: none;font-size:13px;">
                    * Specialty or custom width gates require sales representative review before final quote confirmation
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                    <button id="btnGateOK" type="button" class="btn btn-primary">OK</button>
                </div>
            </div>
        </div>
    </div>

    <button id="btnDblGate" style="display:none;" type="button" class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#modalDblGates" data-bs-whatever="@mdo">Double Gate</button>
    <div class="modal fade" id="modalDblGates" tabindex="-1" data-bs-backdrop="static" aria-labelledby="modalDblGatesLbl" aria-hidden="true">
        <div class="modal-dialog" style="display:table;">
            <div class="modal-content" >
                <div class="modal-header">
                    <h5 class="modal-title wfs-display" id="modalDblGatesLbl">Select Gate Type</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <form>
                        <div class="row mb-3">
                            <div class="btn-group" role="group" aria-label="Basic radio toggle button group">
                                @if($hayAl)
                                <label class="lbl-door">
                                    <input type="radio" class="btn-check" name="radioGate" id="btnDblSwing" value="0" autocomplete="off" checked>
                                    <img class="btn-door" src="img/Alum_Double_Swing_Gate.png" alt="Double Swing Gate">
                                </label>
                                <label class="lbl-door">
                                    <input type="radio" class="btn-check" name="radioGate" id="btnSliding" value="2" autocomplete="off">
                                    <img class="btn-door"src="img/Alum_Sliding_Gate.png" alt="Sliding Gate">
                                </label>
                                <label class="lbl-door">
                                    <input type="radio" class="btn-check" name="radioGate" id="btnCantilever" value="3" autocomplete="off">
                                    <img class="btn-door" src="img/Alum_Cantilever_Gate.png" alt="Cantilever Gate">
                                </label>
                                @endif
                                @if($hayChain)
                                <label class="lbl-door">
                                    <input type="radio" class="btn-check" name="radioGate" id="btnDblSwing" value="0" autocomplete="off" checked>
                                    <img class="btn-door" src="img/Chain_Double_Swing_Gate.png" alt="Double Swing Gate">
                                </label>
                                <label class="lbl-door">
                                    <input type="radio" class="btn-check" name="radioGate" id="btnSliding" value="2" autocomplete="off">
                                    <img class="btn-door"src="img/Chain_Sliding_Gate.png" alt="Sliding Gate">
                                </label>
                                <label class="lbl-door">
                                    <input type="radio" class="btn-check" name="radioGate" id="btnRolling" value="1" autocomplete="off">
                                    <img class="btn-door" src="img/Chain_Rolling_Gate.png" alt="Rolling Gate">
                                </label>
                                <label class="lbl-door">
                                    <input type="radio" class="btn-check" name="radioGate" id="btnCantilever" value="3" autocomplete="off">
                                    <img class="btn-door" src="img/Chain_Cantilever_Gate.png" alt="Cantilever Gate">
                                </label>
                                @endif
                                @if($hayPVC)
                                <label class="lbl-door">
                                    <input type="radio" class="btn-check" name="radioGate" id="btnDblSwing" value="0" autocomplete="off" checked>
                                    <img class="btn-door" src="img/Vinyl_Double_Swing_Gate.png" alt="Double Swing Gate">
                                </label>
                                <label class="lbl-door">
                                    <input type="radio" class="btn-check" name="radioGate" id="btnSliding" value="2" autocomplete="off">
                                    <img class="btn-door"src="img/Vinyl_Sliding_Gate.png" alt="Sliding Gate">
                                </label>
                                @endif
                                @if($hayMetal)
                                    <label class="lbl-door">
                                        <input type="radio" class="btn-check" name="radioGate" id="btnDblSwing" value="0" autocomplete="off" checked>
                                        <img class="btn-door" src="img/Metal_Double_Swing_Gate.png" alt="Double Swing Gate">
                                    </label>
                                    <label class="lbl-door">
                                        <input type="radio" class="btn-check" name="radioGate" id="btnSliding" value="2" autocomplete="off">
                                        <img class="btn-door"src="img/Metal_Sliding_Gate.png" alt="Sliding Gate">
                                    </label>
                                @endif
                            </div>
                        </div>
                        <div class="row mb-3">

                            <div class="btn-group" role="group" aria-label="Door Width">

                                <label class="btn btn-primary dwBtn active">
                                    <input type="radio" class="dDoorWidth" name="dDoorWidth" id="ddoor8" value="8" checked> 8 FT
                                </label>
                                <label class="btn btn-primary dwBtn">
                                    <input type="radio" class="dDoorWidth" name="dDoorWidth" id="ddoor10" value="10"> 10 FT
                                </label>
                                <label class="btn btn-primary dwBtn">
                                    <input type="radio" class="dDoorWidth" name="dDoorWidth" id="ddoor12" value="12"> 12 FT
                                </label>
                                <label class="btn btn-primary dwBtn text-end" id="lblDCustom">
                                    <input type="radio" class="dDoorWidth" name="dDoorWidth" id="ddoorCustom" onclick="$.noop(); $('#dDoorCustomWidth').focus();" value="0"> CUSTOM:
                                </label>

                                <input type="text" id="dDoorCustomWidth" style="width:100px;" class="form-control" aria-label="Custom Width FT">
                                <span class="input-group-text">FT</span>
                            </div>
                        </div>
                    </form>
                </div>
                <div id="dblGateDisclaimer" class="px-3 pb-2 text-danger fw-bold" style="display: none;font-size:13px;">
                    * Specialty or custom width gates require sales representative review before final quote confirmation
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                    <button id="btnDblGateOK" type="button" class="btn btn-primary">OK</button>
                </div>
            </div>
        </div>
    </div>

    <button id="btnTemplates" style="display:none;" type="button" class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#modalTemplates" data-bs-whatever="@mdo">Gate</button>
    <div class="modal fade" id="modalTemplates" tabindex="-1" data-bs-backdrop="static" aria-labelledby="modalTemplatesLbl" aria-hidden="true">
        <div class="modal-dialog" style="display:table;">
            <div class="modal-content" >
                <div class="modal-header">
                    <h5 class="modal-title wfs-display" id="modalTemplatesLbl">Load Sketch from Template</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <form>
                        <div class="row mb-3">
                            <div class="btn-group" role="group" aria-label="Basic radio toggle button group">
                                <label class="lbl-door">
                                    <input type="radio" class="btn-check" name="radioGate" id="btnRTemplate" value="r" autocomplete="off">
                                    <img class="btn-door" src="img/Template_R.jpg" alt="Rectangular">
                                </label>
                                <label class="lbl-door">
                                    <input type="radio" class="btn-check" name="radioGate" id="btnUTemplate" value="u" autocomplete="off">
                                    <img class="btn-door"src="img/Template_U.jpg" alt="UShaped">
                                </label>
                                <label class="lbl-door">
                                    <input type="radio" class="btn-check" name="radioGate" id="btnCTemplate" value="c" autocomplete="off">
                                    <img class="btn-door"src="img/Template_C.jpg" alt="CShaped">
                                </label>
                            </div>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onClick="canvasEnabled = true;" data-bs-dismiss="modal">Cancel</button>
                    <button id="btnTemplateOK" type="button" onClick="loadTemplate();" class="btn btn-primary">OK</button>
                </div>
            </div>
        </div>
    </div>

    <div class="row wfs-workspace">
        <div class="col-10 wfs-canvas-column">
            <main></main>
        </div>
        <div id="panelDims" class="col-2 wfs-panel">
            <form>
                <div class="wfs-panel-head">
                    <span class="wfs-eyebrow">Your sketch</span>
                    <h2 class="wfs-display">Dimensions</h2>
                    <p class="wfs-panel-hint">Draw each side of your fence, then enter its length in feet.</p>
                </div>
                <div class="table-responsive">
                    <table class="table wfs-dims-table" id="dynamic_field">

                    </table>
                    <input type="button" name="submit" id="submitDims" style="display:none;" class="btn wfs-btn wfs-btn-outline" value="Update Layout" />
                    <div class="d-flex justify-content-center">
                        <input type="button" name="estimate" id="btnEstimate" style="display:none;" class="btn wfs-btn wfs-btn-primary wfs-btn-block" value="Get Estimate" />
                    </div>
                    <div class="form-group wfs-materials" id="formEstimate" style="display:none;">
                        <label class="wfs-label" for="txtMaterials">List of Materials</label>
                        <textarea class="form-control wfs-input" id="txtMaterials" rows="10"></textarea>
                    </div>
                    <div class="d-flex justify-content-center">
                        <button type="button" class="btn wfs-btn wfs-btn-ink wfs-btn-block" id="btnQuote" style="display:none;">
                            Request a quote <i class="fas fa-arrow-right ms-2"></i>
                        </button>
                    </div>
                </div>
            </form>
            @auth
                <form id="quoteRequestUserForm" method="POST" action="{{ route('estimate.store') }}" style="display:none;">
                    @csrf
                    <input type="hidden" name="customer_id" id="quoteCustomerId">
                    <input type="hidden" name="full_name" id="quoteFullName">
                    <input type="hidden" name="email" id="quoteEmail">
                    <input type="hidden" name="phone" id="quotePhone">
                    <input type="hidden" name="ref" id="quoteRef">
                    <input type="hidden" name="pricelist" id="quotePricelist">
                    <input type="hidden" name="lead_source_id" id="quoteLeadSourceId">
                    <input type="hidden" name="hear_about_us" id="quoteLeadSourceName">
                    <input type="hidden" name="fulfillment_method" id="quoteFulfillmentMethod" value="pickup">
                    <input type="hidden" name="company_id" id="quotePickupLocationId" value="1">
                    <input type="hidden" name="canvas_image" id="quoteCanvasImage">
                </form>
            @endauth
            @auth
                <!--
            <button id="copyToSheet" class="btn btn-success">Copy to Google Sheet</button>
                -->
            @endauth
        </div>
    </div>

    <script
        src="https://code.jquery.com/jquery-3.7.1.min.js"
        integrity="sha256-/JqT3SQfawRcv/BIHPThkBvs0OEvtFFmqPF/lYI/Cxo="
        crossorigin="anonymous"></script>
    <script
        src="https://code.jquery.com/ui/1.12.1/jquery-ui.min.js"
        integrity="sha256-VazP97ZCwtekAsvgPBSUwPFKdrwD3unUfSGVYrahUqU="
        crossorigin="anonymous"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/js/bootstrap.bundle.min.js" integrity="sha384-MrcW6ZMFYlzcLA8Nl+NtUVF0sA7MsXsP1UyJoMp4YLEuNSfAP+JcXn/tWtIaxVXM" crossorigin="anonymous"></script>

    <script src="@assetv('js/select2.min.js')"></script>

    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>


    <script>
        var materials = {!! json_encode($materials, JSON_HEX_TAG) !!};
        var quoteRequestSketchToLoad = {!! json_encode(session()->pull('quote_request_sketch_to_load'), JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_AMP | JSON_HEX_QUOT) !!};
        var printSketchLogoUrl = @json(asset('images/wfs-logo-wht.svg'));

        function escapePrintHtml(value) {
            return String(value || '').replace(/[&<>"']/g, function (char) {
                return {
                    '&': '&amp;',
                    '<': '&lt;',
                    '>': '&gt;',
                    '"': '&quot;',
                    "'": '&#039;'
                }[char];
            });
        }

        function getPrintMaterialSelection() {
            if (!materials) {
                return '';
            }

            var fieldOrder = {
                '1': ['material', 'type', 'height', 'color', 'style'],
                '2': ['material', 'type', 'height', 'color', 'bottom', 'barbwire', 'barbarms'],
                '3': ['material', 'style', 'height', 'color', 'rails'],
                '4': ['material', 'style', 'design', 'color', 'height', 'type']
            };

            return Object.keys(materials).map(function (materialKey) {
                var material = materials[materialKey] || {};
                var materialType = String(material.code || '').charAt(0);
                var order = fieldOrder[materialType] || Object.keys(material).filter(function (key) {
                    return key !== 'code';
                });

                return order.map(function (key) {
                    return material[key];
                }).filter(function (value) {
                    return value !== undefined && value !== null && String(value).trim() !== '';
                }).join(' / ');
            }).filter(function (selection) {
                return selection !== '';
            }).join(' | ');
        }

        function printFenceCanvas() {
            var sourceCanvas = document.querySelector('canvas');

            if (!sourceCanvas) {
                alert('The sketch canvas is not ready yet.');
                return;
            }

            var printWindow = window.open('', '_blank');

            if (!printWindow) {
                alert('Please allow pop-ups to print the sketch.');
                return;
            }

            printWindow.document.write('<!DOCTYPE html><html><head><title>Fence Sketch</title></head><body>Preparing sketch...</body></html>');
            printWindow.document.close();

            redrawing = true;

            window.requestAnimationFrame(function () {
                var canvasRect = sourceCanvas.getBoundingClientRect();
                var canvasScaleX = canvasRect.width > 0 ? sourceCanvas.width / canvasRect.width : 1;
                var cropX = typeof toolbarWidth === 'number' ? Math.ceil(toolbarWidth * canvasScaleX) : 0;
                var cropWidth = Math.max(sourceCanvas.width - cropX, 1);
                var printCanvas = document.createElement('canvas');
                printCanvas.width = cropWidth;
                printCanvas.height = sourceCanvas.height;

                var ctx = printCanvas.getContext('2d');
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, printCanvas.width, printCanvas.height);
                ctx.drawImage(
                    sourceCanvas,
                    cropX,
                    0,
                    cropWidth,
                    printCanvas.height,
                    0,
                    0,
                    printCanvas.width,
                    printCanvas.height
                );

                var imageUrl = printCanvas.toDataURL('image/png');
                var materialSelection = escapePrintHtml(getPrintMaterialSelection());

                printWindow.document.open();
                printWindow.document.write(
                    '<!DOCTYPE html>' +
                    '<html lang="en">' +
                    '<head>' +
                    '<meta charset="UTF-8">' +
                    '<meta name="viewport" content="width=device-width, initial-scale=1.0">' +
                    '<title>Fence Sketch</title>' +
                    '<style>' +
                    '@page{size:letter landscape;margin:0.35in;}' +
                    '*{box-sizing:border-box;}' +
                    'body{margin:0;background:#fff;color:#111827;font-family:Arial,Helvetica,sans-serif;}' +
                    '.page{width:100vw;min-height:100vh;padding:12px;}' +
                    '.print-header{display:flex;align-items:center;justify-content:space-between;gap:20px;margin-bottom:12px;padding:12px 16px;background:#0b1547;color:#fff;}' +
                    '.brand{display:flex;align-items:center;gap:14px;min-width:0;flex:1;}' +
                    '.brand img{display:block;height:38px;width:auto;max-width:210px;}' +
                    '.brand-text{min-width:0;}' +
                    '.brand-title{font-size:18px;font-weight:700;line-height:1.2;}' +
                    '.brand-subtitle{font-size:12px;font-weight:400;line-height:1.35;opacity:.9;overflow-wrap:anywhere;}' +
                    '.print-date{font-size:12px;text-align:right;opacity:.9;}' +
                    '.sketch-wrap{display:flex;align-items:center;justify-content:center;height:6.75in;border:1px solid #d1d5db;}' +
                    '.sketch-wrap img{display:block;max-width:100%;max-height:100%;object-fit:contain;}' +
                    '@media print{.page{height:auto;min-height:0;padding:0;}.print-header{break-inside:avoid;print-color-adjust:exact;-webkit-print-color-adjust:exact;}.sketch-wrap{height:6.5in;}}' +
                    '</style>' +
                    '</head>' +
                    '<body>' +
                    '<main class="page">' +
                    '<header class="print-header">' +
                    '<div class="brand">' +
                    '<img src="' + printSketchLogoUrl + '" alt="Western Fence Supply">' +
                    '<div class="brand-text"><div class="brand-title">Fence Sketch</div><div class="brand-subtitle">' + materialSelection + '</div></div>' +
                    '</div>' +
                    '<div class="print-date">' + new Date().toLocaleDateString() + '</div>' +
                    '</header>' +
                    '<section class="sketch-wrap"><img src="' + imageUrl + '" alt="Fence sketch"></section>' +
                    '</main>' +
                    '<script>window.addEventListener("load",function(){setTimeout(function(){window.focus();window.print();},150);});<\/script>' +
                    '</body>' +
                    '</html>'
                );
                printWindow.document.close();
            });
        }
    </script>

    <script>
        function exportCanvasRegion(canvas, x, y, width, height) {
            const tmpCanvas = document.createElement('canvas');
            tmpCanvas.width = width;
            tmpCanvas.height = height;

            const ctx = tmpCanvas.getContext('2d');

            ctx.drawImage(
                canvas,
                x, y, width, height,
                0, 0, width, height
            );

            return tmpCanvas.toDataURL('image/png');
        }

        function exportSketchCanvasImage(canvas) {
            const logicalCanvasWidth = typeof _W === 'number' && _W > 0 ? _W : canvas.width;
            const logicalCanvasHeight = typeof _H === 'number' && _H > 0 ? _H : canvas.height;
            const scaleX = canvas.width / logicalCanvasWidth;
            const scaleY = canvas.height / logicalCanvasHeight;
            const logicalToolbarWidth = typeof toolbarWidth === 'number' ? toolbarWidth : 0;
            const scanStartX = Math.min(canvas.width, Math.max(0, Math.ceil(logicalToolbarWidth * scaleX)));
            const scanWidth = canvas.width - scanStartX;

            if (scanWidth <= 0 || canvas.height <= 0) {
                throw new Error('The drawable canvas area is empty.');
            }

            const context = canvas.getContext('2d');
            const pixels = context.getImageData(scanStartX, 0, scanWidth, canvas.height).data;
            const blackThreshold = 80;
            let minX = scanWidth;
            let minY = canvas.height;
            let maxX = -1;
            let maxY = -1;

            for (let y = 0; y < canvas.height; y++) {
                for (let x = 0; x < scanWidth; x++) {
                    const pixelIndex = (y * scanWidth + x) * 4;
                    const red = pixels[pixelIndex];
                    const green = pixels[pixelIndex + 1];
                    const blue = pixels[pixelIndex + 2];
                    const alpha = pixels[pixelIndex + 3];

                    if (
                        alpha > 0
                        && red <= blackThreshold
                        && green <= blackThreshold
                        && blue <= blackThreshold
                    ) {
                        minX = Math.min(minX, x);
                        minY = Math.min(minY, y);
                        maxX = Math.max(maxX, x);
                        maxY = Math.max(maxY, y);
                    }
                }
            }

            if (maxX < 0 || maxY < 0) {
                return exportCanvasRegion(canvas, scanStartX, 0, scanWidth, canvas.height);
            }

            const marginX = Math.ceil(20 * scaleX);
            const marginY = Math.ceil(20 * scaleY);
            const cropX = Math.max(scanStartX, scanStartX + minX - marginX);
            const cropY = Math.max(0, minY - marginY);
            const cropRight = Math.min(canvas.width, scanStartX + maxX + 1 + marginX);
            const cropBottom = Math.min(canvas.height, maxY + 1 + marginY);
            const cropWidth = Math.max(1, cropRight - cropX);
            const cropHeight = Math.max(1, cropBottom - cropY);

            return exportCanvasRegion(canvas, cropX, cropY, cropWidth, cropHeight);
        }
    </script>

    @auth
        @php
            $authUser = Auth::user();
            $authCustomer = is_numeric($authUser->username)
                ? \App\Models\Customer::find((int) $authUser->username)
                : null;
            $quoteUser = [
                'account_type' => $authUser->account_type,
                'customer_id' => optional($authCustomer)->id,
                'name' => optional($authCustomer)->name ?: $authUser->name,
                'email' => optional($authCustomer)->email ?: $authUser->email,
                'phone' => optional($authCustomer)->phone ?: '',
            ];
        @endphp
        <script>
            const quoteUser = {!! json_encode($quoteUser, JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_AMP | JSON_HEX_QUOT) !!};
            const quoteWalkInCustomerId = {{ (int) config('services.odoo.customer') }};
            const quoteSubmissionErrors = @json($errors->all());
            let quoteCustomers = null;
            let quoteLeadSources = null;

            if (quoteSubmissionErrors.length) {
                Swal.fire({
                    icon: 'error',
                    title: 'Quote could not be created',
                    text: quoteSubmissionErrors.join(' ')
                });
            }

            function fetchQuoteCustomers() {
                if (quoteCustomers) {
                    return Promise.resolve(quoteCustomers);
                }

                return $.ajax({
                    url: "{{ route('customers') }}",
                    method: "GET"
                }).then(function (customers) {
                    quoteCustomers = customers;
                    return quoteCustomers;
                });
            }

            function fetchQuoteLeadSources() {
                if (quoteLeadSources) {
                    return Promise.resolve(quoteLeadSources);
                }

                return $.ajax({
                    url: "{{ route('odoo.lead_sources.index') }}",
                    method: "GET"
                }).then(function (response) {
                    quoteLeadSources = response.data || [];
                    return quoteLeadSources;
                });
            }

            function quoteLeadSourceFieldHtml() {
                return `
                    <div id="swalLeadSourceGroup" class="mt-3" style="display:none;">
                        <label class="form-label" for="swalLeadSource">How Did You Hear About Us? <span class="text-danger">*</span></label>
                        <select id="swalLeadSource" class="form-select" disabled>
                            <option value="">Loading lead sources...</option>
                        </select>
                    </div>
                `;
            }

            function setUpQuoteLeadSource(show) {
                $('#swalLeadSourceGroup').toggle(show);

                if (!show) {
                    $('#swalLeadSource').val('');
                    return Promise.resolve();
                }

                $('#swalLeadSource').prop('disabled', true);

                return fetchQuoteLeadSources().then(function (sources) {
                    const options = ['<option value="">Select...</option>']
                        .concat(sources.map(source =>
                            `<option value="${quoteEscapeAttr(source.id)}">${quoteEscapeAttr(source.name)}</option>`
                        ));

                    $('#swalLeadSource').html(options.join('')).prop('disabled', false);
                }).catch(function () {
                    $('#swalLeadSource').html('<option value="">Unable to load lead sources</option>');
                    Swal.showValidationMessage('Unable to load lead sources from Odoo.');
                });
            }

            function stopDrawingLoop() {
                if (typeof noLoop === 'function') {
                    noLoop();
                }
            }

            function resumeDrawingLoop() {
                if (typeof loop === 'function') {
                    loop();
                }
            }

            function showQuoteProcessingFeedback() {
                var quoteButton = $('#btnQuote');

                quoteButton.prop('disabled', true)
                    .text('Processing quote...');

                Swal.fire({
                    title: 'Processing quote',
                    text: 'Please wait while your quote is being created.',
                    allowOutsideClick: false,
                    allowEscapeKey: false,
                    showConfirmButton: false,
                    backdrop: true,
                    didOpen: () => {
                        Swal.showLoading();
                    }
                });
            }

            function submitAuthenticatedQuote(values) {
                const fenceCanvas = document.querySelector('canvas');

                if (!fenceCanvas) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Sketch unavailable',
                        text: 'The fence sketch could not be captured. Please try again.'
                    });
                    return;
                }

                let canvasImage;

                try {
                    canvasImage = exportSketchCanvasImage(fenceCanvas);
                } catch (error) {
                    console.error('Unable to capture fence sketch:', error);
                    Swal.fire({
                        icon: 'error',
                        title: 'Sketch unavailable',
                        text: 'The fence sketch could not be captured. Please try again.'
                    });
                    return;
                }

                showQuoteProcessingFeedback();
                $('#quoteCustomerId').val(values.customer_id || '');
                $('#quoteFullName').val(values.full_name || '');
                $('#quoteEmail').val(values.email || '');
                $('#quotePhone').val(values.phone || '');
                $('#quoteRef').val(values.ref || '');
                $('#quotePricelist').val(values.pricelist || '');
                $('#quoteLeadSourceId').val(values.lead_source_id || '');
                $('#quoteLeadSourceName').val(values.lead_source_name || '');
                $('#quoteFulfillmentMethod').val(values.fulfillment_method || 'pickup');
                $('#quotePickupLocationId').val(values.fulfillment_method === 'delivery' ? '' : (values.pickup_location_id || '1'));
                $('#quoteCanvasImage').val(canvasImage);
                $('#quoteRequestUserForm').trigger('submit');
            }

            function quoteFulfillmentFieldsHtml() {
                return `
                    <div class="mt-3">
                        <label class="form-label d-block">Fulfillment</label>
                        <div class="btn-group w-100" role="group" aria-label="Fulfillment method">
                            <input type="radio" class="btn-check" name="swalFulfillmentMethod" id="swalFulfillmentPickup" value="pickup" autocomplete="off" checked>
                            <label class="btn btn-outline-primary" for="swalFulfillmentPickup">Pick Up</label>

                            <input type="radio" class="btn-check" name="swalFulfillmentMethod" id="swalFulfillmentDelivery" value="delivery" autocomplete="off">
                            <label class="btn btn-outline-primary" for="swalFulfillmentDelivery">Delivery</label>
                        </div>
                    </div>

                    <div id="swalPickupLocationGroup" class="mt-3">
                        <label class="form-label d-block">Pick Up Location</label>
                        <div class="btn-group w-100" role="group" aria-label="Pick up location">
                            <input type="radio" class="btn-check" name="swalPickupLocationId" id="swalPickupFortMyers" value="1" autocomplete="off" checked>
                            <label class="btn btn-outline-primary" for="swalPickupFortMyers">Fort Myers</label>

                            <input type="radio" class="btn-check" name="swalPickupLocationId" id="swalPickupPortCharlotte" value="2" autocomplete="off">
                            <label class="btn btn-outline-primary" for="swalPickupPortCharlotte">Port Charlotte</label>
                        </div>
                    </div>
                `;
            }

            function bindQuoteFulfillmentFields() {
                $('input[name="swalFulfillmentMethod"]').on('change', function () {
                    const isPickup = $('input[name="swalFulfillmentMethod"]:checked').val() === 'pickup';
                    $('#swalPickupLocationGroup').toggle(isPickup);
                }).trigger('change');
            }

            function getQuoteFulfillmentValues() {
                const fulfillmentMethod = $('input[name="swalFulfillmentMethod"]:checked').val() || 'pickup';

                return {
                    fulfillment_method: fulfillmentMethod,
                    pickup_location_id: fulfillmentMethod === 'pickup'
                        ? ($('input[name="swalPickupLocationId"]:checked').val() || '1')
                        : ''
                };
            }

            function quoteEscapeAttr(value) {
                return String(value || '')
                    .replace(/&/g, '&amp;')
                    .replace(/"/g, '&quot;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;');
            }

            function showCompanyQuotePopup() {
                Swal.fire({
                    title: 'Quote Request',
                    customClass: {
                        popup: 'quote-request-swal'
                    },
                    html: `
                        <div class="text-start">
                            <label class="form-label" for="swalCustomer">Customer <span class="text-danger">*</span></label>
                            <select id="swalCustomer" class="form-select" style="width:100%"></select>

                            <label class="form-label mt-3" for="swalEmail">Email <span class="text-danger">*</span></label>
                            <input id="swalEmail" type="email" class="form-control">

                            <label class="form-label mt-3" for="swalPhone">Phone</label>
                            <input id="swalPhone" type="tel" class="form-control">

                            <label class="form-label mt-3" for="swalRef">Reference / PO</label>
                            <input id="swalRef" type="text" class="form-control">

                            ${quoteFulfillmentFieldsHtml()}

                            ${quoteLeadSourceFieldHtml()}

                            <div id="swalPricelistGroup" style="display:none;">
                                <label class="form-label mt-3" for="swalPricelist">Pricelist</label>
                                <select id="swalPricelist" class="form-select">
                                    <option value="HO" selected>HO - Homeowner</option>
                                    <option value="GC">GC - General Contractor</option>
                                </select>
                            </div>
                        </div>
                    `,
                    confirmButtonText: 'Create quote',
                    showCancelButton: true,
                    allowOutsideClick: false,
                    backdrop: true,
                    didOpen: () => {
                        stopDrawingLoop();
                        bindQuoteFulfillmentFields();
                        fetchQuoteCustomers().then(function (customers) {
                            const options = customers.map(customer => ({
                                id: customer.id,
                                text: customer.name,
                                email: customer.email || '',
                                phone: customer.phone || ''
                            }));

                            $('#swalCustomer').select2({
                                data: options,
                                dropdownParent: $('.swal2-popup'),
                                placeholder: 'Select a customer',
                                allowClear: true,
                                width: '100%'
                            }).val(null).trigger('change');

                            $('#swalCustomer').on('change', function () {
                                const selected = $('#swalCustomer').select2('data')[0];
                                $('#swalEmail').val(selected?.email || '');
                                $('#swalPhone').val(selected?.phone || '');

                                const showPricelist = String(selected?.id || '') === '1886';
                                $('#swalPricelistGroup').toggle(showPricelist);
                                $('#swalPricelist').val('HO');
                                setUpQuoteLeadSource(Number(selected?.id) === quoteWalkInCustomerId);
                            });
                        }).catch(function () {
                            Swal.showValidationMessage('Unable to load customers.');
                        });
                    },
                    willClose: () => resumeDrawingLoop(),
                    preConfirm: () => {
                        const selected = $('#swalCustomer').select2('data')[0];
                        const email = ($('#swalEmail').val() || '').trim();

                        if (!selected) {
                            Swal.showValidationMessage('Please select a customer.');
                            return false;
                        }

                        if (!email) {
                            Swal.showValidationMessage('Please enter an email address.');
                            return false;
                        }

                        const isWalkIn = Number(selected.id) === quoteWalkInCustomerId;
                        const leadSourceId = $('#swalLeadSource').val();

                        if (isWalkIn && !leadSourceId) {
                            Swal.showValidationMessage('Please select how the customer heard about us.');
                            return false;
                        }

                        const fulfillmentValues = getQuoteFulfillmentValues();

                        return {
                            customer_id: selected.id,
                            full_name: selected.text,
                            email: email,
                            phone: ($('#swalPhone').val() || '').trim(),
                            ref: ($('#swalRef').val() || '').trim(),
                            pricelist: String(selected.id) === '1886'
                                ? ($('#swalPricelist').val() || 'HO')
                                : '',
                            lead_source_id: leadSourceId,
                            lead_source_name: leadSourceId ? $('#swalLeadSource option:selected').text() : '',
                            ...fulfillmentValues
                        };
                    }
                }).then((result) => {
                    if (result.isConfirmed) {
                        submitAuthenticatedQuote(result.value);
                    }
                });
            }

            function showCustomerQuotePopup() {
                Swal.fire({
                    title: 'Quote Request',
                    customClass: {
                        popup: 'quote-request-swal'
                    },
                    html: `
                        <div class="text-start">
                            <label class="form-label" for="swalFullName">Customer</label>
                            <input id="swalFullName" type="text" class="form-control" value="${quoteEscapeAttr(quoteUser.name)}" readonly>

                            <label class="form-label mt-3" for="swalEmail">Email <span class="text-danger">*</span></label>
                            <input id="swalEmail" type="email" class="form-control" value="${quoteEscapeAttr(quoteUser.email)}">

                            <label class="form-label mt-3" for="swalPhone">Phone</label>
                            <input id="swalPhone" type="tel" class="form-control" value="${quoteEscapeAttr(quoteUser.phone)}">

                            <label class="form-label mt-3" for="swalRef">Reference / PO</label>
                            <input id="swalRef" type="text" class="form-control">

                            ${quoteFulfillmentFieldsHtml()}

                            ${quoteLeadSourceFieldHtml()}
                        </div>
                    `,
                    confirmButtonText: 'Create quote',
                    showCancelButton: true,
                    allowOutsideClick: false,
                    backdrop: true,
                    didOpen: () => {
                        stopDrawingLoop();
                        bindQuoteFulfillmentFields();
                        setUpQuoteLeadSource(Number(quoteUser.customer_id) === quoteWalkInCustomerId);
                    },
                    willClose: () => resumeDrawingLoop(),
                    preConfirm: () => {
                        const fullName = ($('#swalFullName').val() || '').trim();
                        const email = ($('#swalEmail').val() || '').trim();

                        if (!fullName) {
                            Swal.showValidationMessage('Customer name is required.');
                            return false;
                        }

                        if (!email) {
                            Swal.showValidationMessage('Please enter an email address.');
                            return false;
                        }

                        const isWalkIn = Number(quoteUser.customer_id) === quoteWalkInCustomerId;
                        const leadSourceId = $('#swalLeadSource').val();

                        if (isWalkIn && !leadSourceId) {
                            Swal.showValidationMessage('Please select how you heard about us.');
                            return false;
                        }

                        const fulfillmentValues = getQuoteFulfillmentValues();

                        return {
                            full_name: fullName,
                            email: email,
                            phone: ($('#swalPhone').val() || '').trim(),
                            ref: ($('#swalRef').val() || '').trim(),
                            lead_source_id: leadSourceId,
                            lead_source_name: leadSourceId ? $('#swalLeadSource option:selected').text() : '',
                            ...fulfillmentValues
                        };
                    }
                }).then((result) => {
                    if (result.isConfirmed) {
                        submitAuthenticatedQuote(result.value);
                    }
                });
            }

            $('#btnQuote').on('click', function (e) {
                e.preventDefault();

                if (this.disabled) {
                    return;
                }

                if (quoteUser.account_type === 'company') {
                    showCompanyQuotePopup();
                    return;
                }

                showCustomerQuotePopup();
            });
        </script>
    @endauth

    @guest
        <script>
            $('#btnQuote').on('click', function (event) {
                event.preventDefault();

                const fenceCanvas = document.querySelector('canvas');

                if (!fenceCanvas) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Sketch unavailable',
                        text: 'The fence sketch could not be captured. Please try again.'
                    });
                    return;
                }

                try {
                    sessionStorage.setItem('quoteCanvasImage', exportSketchCanvasImage(fenceCanvas));
                    window.location.href = @json(route('estimate.index'));
                } catch (error) {
                    console.error('Unable to capture fence sketch:', error);
                    Swal.fire({
                        icon: 'error',
                        title: 'Sketch unavailable',
                        text: 'The fence sketch could not be captured. Please try again.'
                    });
                }
            });
        </script>
    @endguest

    <script type="module">
        import Shepherd from "https://cdn.jsdelivr.net/npm/shepherd.js@13.0.0/dist/esm/shepherd.mjs";

        const btnEstimate = document.getElementById("btnEstimate");
        let wasHidden = false; // Track if the button was initially hidden

        const tour = new Shepherd.Tour({
            useModalOverlay: true,
            defaultStepOptions: {
                classes: 'shepherd-theme-arrows',
                scrollTo: true
            }
        });

        tour.addStep({
            title: "Welcome",
            //text: "This tour will guide you through the tools that allow you to make a sketch of your fence project to get an estimate.",
            text: "This guided tour will walk you through the tools needed to sketch your fence project and receive an accurate estimate.",
            attachTo: { element: "#btnHelp", on: "bottom" },
            buttons: [{ text: "Next", action: tour.next },
                      { text: "Exit", action: tour.cancel }
            ]
        });

        tour.addStep({
            title: "Canvas",
            //text: "This area is the canvas to draw the sketch of your fence project.",
            text: "This is your drawing canvas, where you can sketch your fence project using the tools on the left.",
            orphan: true,
            buttons: [
                { text: "Back", action: tour.back },
                { text: "Next", action: tour.next },
                { text: "Exit", action: tour.cancel }
            ]
        });

        tour.addStep({
            title: "Draw Line",
            //text: "Use this to start draw a fence or wall section on your sketch. Click over the canvas at the start of the line and click again at the end of the line.",
            text: "Select this tool to draw a fence or wall section on your sketch. Click on the canvas to set the starting point, then click again to define the endpoint.",
            attachTo: { element: "#LineTooltip", on: "right" },
            buttons: [
                { text: "Back", action: tour.back },
                { text: "Next", action: tour.next },
                { text: "Exit", action: tour.cancel }
            ]
        });

        tour.addStep({
            title: "Draw Rectangle",
            //text: "Use this to draw a rectangular shape of fence or wall on your sketch. Click over the canvas to start the rectangle and then click again in the opposite corner position.",
            text: "Select this tool to draw a rectangular section of fence or wall. Click on the canvas to set one corner, then click again at the opposite corner to complete the shape.",
            attachTo: { element: "#RectangleTooltip", on: "right" },
            buttons: [
                { text: "Back", action: tour.back },
                { text: "Next", action: tour.next },
                { text: "Exit", action: tour.cancel }
            ]
        });

        tour.addStep({
            title: "Erase",
            //text: "Use this to erase a fence or wall section or gate from your sketch. Just put the cursor over the section or gate (it should turn red) and click to delete it.",
            text: "Use the eraser to remove a fence/wall section, or gate from your sketch. Hover over the item until it turns red, then click to delete it.",
            attachTo: { element: "#EraserTooltip", on: "right" },
            buttons: [
                { text: "Back", action: tour.back },
                { text: "Next", action: tour.next },
                { text: "Exit", action: tour.cancel }
            ]
        });

        tour.addStep({
            title: "Fence",
            //text: "When this control is selected, line and rectangle tools will be used to define Fence sections.",
            text: "When enabled, the line and rectangle tools will be used to define fence sections.",
            attachTo: { element: "#FenceTooltip", on: "right" },
            buttons: [
                { text: "Back", action: tour.back },
                { text: "Next", action: tour.next },
                { text: "Exit", action: tour.cancel }
            ]
        });
        tour.addStep({
            title: "Wall",
            //text: "When this control is selected, line and rectangle tools will be used to define Wall sections.",
            text: "When enabled, the line and rectangle tools will be used to define wall sections.",
            attachTo: { element: "#WallTooltip", on: "right" },
            buttons: [
                { text: "Back", action: tour.back },
                { text: "Next", action: tour.next },
                { text: "Exit", action: tour.cancel }
            ]
        });
        tour.addStep({
            title: "Gate",
            //text: "Use this button to include a Single Gate in a fence section of your sketch.",
            text: "Use this button to add a single gate to a fence section in your sketch.",
            attachTo: { element: "#GateTooltip", on: "right" },
            buttons: [
                { text: "Back", action: tour.back },
                { text: "Next", action: tour.next },
                { text: "Exit", action: tour.cancel }
            ]
        });
        tour.addStep({
            title: "Double Gate",
            //text: "Use this to include a Double Gate in a fence section of your sketch.",
            text: "Use this button to add a double gate to a fence section in your sketch.",
            attachTo: { element: "#DblGateTooltip", on: "right" },
            buttons: [
                { text: "Back", action: tour.back },
                { text: "Next", action: tour.next },
                { text: "Exit", action: tour.cancel }
            ]
        });
        tour.addStep({
            title: "Orthogonal",
            //text: "When this button is selected, the lines drawn in the sketch will be horizontal or vertical. You can press the SHIFT key in your keyboard while drawing for the same effect.",
            text: "When this option is selected, all lines drawn in the sketch will be restricted to horizontal or vertical. You can also hold the Shift key while drawing to achieve the same effect.",
            attachTo: { element: "#OrthogonalTooltip", on: "right" },
            buttons: [
                { text: "Back", action: tour.back },
                { text: "Next", action: tour.next },
                { text: "Exit", action: tour.cancel }
            ]
        });

        tour.addStep({
            title: "Clear Sketch",
            //text: "Use this to clear the sketch and start over.",
            text: "Use the trash can to clear your sketch and start over.",
            attachTo: { element: "#ClearTooltip", on: "right" },
            buttons: [
                { text: "Back", action: tour.back },
                { text: "Next", action: tour.next },
                { text: "Exit", action: tour.cancel }
            ]
        });

        tour.addStep({
            title: "Restart Project",
            //text: "Click this button to restart this project from the beginning (material selection).",
            text: "Click this button to return to Step 1 (Material Selection) and restart your project.",
            attachTo: { element: "#btnRestart", on: "bottom" },
            buttons: [
                { text: "Back", action: tour.back },
                { text: "Next", action: tour.next },
                { text: "Exit", action: tour.cancel }
            ]
        });

        tour.addStep({
            title: "Save Project",
            //text: "Click this button to save your sketch in a .wfs file, for future use.",
            text: "Click this button to save your sketch as a .WFS file for future use. This file format stores all details of your drawing, including fence sections, gates, and measurements, allowing you to reload and modify your project later.",
            attachTo: { element: "#btnSave", on: "bottom" },
            buttons: [
                { text: "Back", action: tour.back },
                { text: "Next", action: tour.next },
                { text: "Exit", action: tour.cancel }
            ]
        });

        tour.addStep({
            title: "Load Project",
            //text: "Click this button to load an existing .wfs file and load that sketch in the canvas.",
            text: "Click this button to load an existing .WFS file and restore your saved fence sketch on the canvas.",
            attachTo: { element: "#btnLoad", on: "bottom" },
            buttons: [
                { text: "Back", action: tour.back },
                { text: "Next", action: tour.next },
                { text: "Exit", action: tour.cancel }
            ]
        });

        tour.addStep({
            title: "Use Template",
            //text: "Click this button to load a generic sketch from a list of common fence projects.",
            text: "Click this button to load a generic sketch from a list of common fence projects, providing a quick starting point for your design.",
            attachTo: { element: "#btnTemplate", on: "bottom" },
            buttons: [
                { text: "Back", action: tour.back },
                { text: "Next", action: tour.next },
                { text: "Exit", action: tour.cancel }
            ]
        });

        tour.addStep({
            title: "Estimate Button",
            //text: "Once your sketch is ready, and all the dimensions are set, this button will show. Click it to get your estimate.",
            text: "Once your sketch is complete and all dimensions are set, this button will appear. Click it to generate your estimate.",
            attachTo: { element: "#btnEstimate", on: "left" },
            buttons: [
                { text: "Back", action: tour.back },
                { text: "Done", action: tour.complete }],

            beforeShowPromise: () => {
                return new Promise((resolve) => {
                    // Check if the button was hidden before showing it
                    wasHidden = btnEstimate.style.display === "none";
                    if (wasHidden) {
                        btnEstimate.style.display = "block"; // Show button
                    }
                    resolve();
                });
            },
            when: {
                hide: () => {
                    if (wasHidden) {
                        btnEstimate.style.display = "none"; // Hide button again
                    }
                }
            }
        });

        tour.on("complete", () => {
            canvasEnabled = true;
            if (wasHidden) {
                btnEstimate.style.display = "none"; // Hide the button again
            }
        });

        tour.on("cancel", () => {
            canvasEnabled = true;
            if (wasHidden) {
                btnEstimate.style.display = "none";
            }
        });

        document.querySelector("#btnHelp").addEventListener("click", () => {
            canvasEnabled = false;
            tour.start();
        });
    </script>

    <script>
        var mat_count = 1;
        var canvasEnabled = true;

        if(materials){
            mat_count = Object.keys(materials).length;
        }
        var dimOver;
        var modalDim = document.getElementById('modalDim');
        modalDim.addEventListener('hidden.bs.modal', function (event) {
            modal = false;
        });

        modalDim.addEventListener('shown.bs.modal', function (event){
            document.getElementById('txtLength').focus();
        });

        ['modalGates', 'modalDblGates'].forEach(function (modalId) {
            const gateModal = document.getElementById(modalId);

            gateModal.addEventListener('show.bs.modal', function () {
                canvasEnabled = false;
                drawable = false;
            });

            gateModal.addEventListener('hidden.bs.modal', function () {
                canvasEnabled = true;
                drawable = true;
            });

            ['pointerdown', 'mousedown', 'click'].forEach(function (eventName) {
                gateModal.addEventListener(eventName, function (event) {
                    event.stopPropagation();
                });
            });
        });

        var sDoorWidth = 4;

        function updateGateDisclaimer() {
            const selectedGateType = document.querySelector('#modalGates input[name="radioGate"]:checked');
            const selectedWidth = document.querySelector('#modalGates input[name="sDoorWidth"]:checked');
            const isStandardSwingGate = selectedGateType?.value === '0'
                && ['4', '5', '6'].includes(selectedWidth?.value);

            document.getElementById('gateDisclaimer').style.display = isStandardSwingGate ? 'none' : 'block';
        }

        function updateDblGateDisclaimer() {
            const selectedGateType = document.querySelector('#modalDblGates input[name="radioGate"]:checked');
            const selectedWidth = document.querySelector('#modalDblGates input[name="dDoorWidth"]:checked');
            const isStandardDoubleSwingGate = selectedGateType?.value === '0'
                && ['8', '10', '12'].includes(selectedWidth?.value);

            document.getElementById('dblGateDisclaimer').style.display = isStandardDoubleSwingGate ? 'none' : 'block';
        }

        function toggleDropdown() {
            const dropdown = document.getElementById('dropdownContent');
            dropdown.classList.toggle('hidden');
        }


        $(document).ready(function(){
            /*
            $('input.btn-check').click(function(){
                sDoorWidth = (this).attr('value');
            });
             */

            const canvasButtons = [];
            const btnSize = 53;
            const sepSize = 20;
            let startY = 108;

            // Define button labels
            const buttonLabels = ["Line", "Rectangle", "Eraser", "Sep1", "Fence", "Wall", "Sep2", "Gate", "DblGate", "Sep3", "Orthogonal", "Sep4", "Clear"];
            var posY = startY;
            // Generate canvas buttons dynamically
            buttonLabels.forEach((label, index) => {
                if(label.substr(0,3) == "Sep"){
                    posY = posY + sepSize;
                }
                else {
                    canvasButtons.push({
                        key: label,
                        x: 5, // X position of the buttons
                        y: posY,
                        width: btnSize,
                        height: btnSize,
                        label: label
                    });
                    posY = posY + btnSize;
                }
            });

            function createTooltipElement(buttonKey) {
                const button = canvasButtons[buttonKey];
                const $tooltip = $('<div>')
                    .attr('id', `${button.key}Tooltip`)
                    .css({
                        position: 'absolute',
                        top: `${button.y}px`,
                        left: `${button.x}px`,
                        width: `${button.width}px`,
                        height: `${button.height}px`,
                        background: 'rgba(0, 0, 0, 0)', // Transparent overlay to show area
                        zIndex: 1000,
                    });
                $('body').append($tooltip);
                return `#${buttonKey}Tooltip`;
            }
            Object.keys(canvasButtons).forEach((key) => createTooltipElement(key));


            @auth
            /*
            // CUSTOMERS
            $('#customer').select2({
                placeholder: 'Select a customer',
                allowClear: true
            });

            $('#customer').on('change', function () {
                const selectedValue = $(this).val(); // Get the selected value
                console.log('Selected value:', selectedValue);
                $('#btnFishbowl').css('display','block');
            });

            // Fetch customers using AJAX
            $.ajax({
                url: "/customers", // Replace with your API route
                method: "GET",
                success: function(data) {
                    // Add customers to the Select2 input
                    const parsedData = JSON.parse(data);

                    const customerOptions = parsedData.map(customer => ({
                        id: customer.id, // Unique identifier
                        text: customer.name // Display name
                    }));

                    $('#customer').select2({
                        data: customerOptions,
                        placeholder: 'Select a customer',
                        allowClear: true
                    });
                },
                error: function(xhr, status, error) {
                    console.error('Error fetching customers:', error);
                }
            });
             */
            @endauth

            $('.doorWidth').click(function(){
                $(this).closest('.btn-group').find('.active').removeClass("active");
                $(this).closest('.btn').addClass('active');
                wSDoor = this.value;
                wDoor = this.value;
            });

            $('#modalGates input[name="radioGate"], #modalGates input[name="sDoorWidth"]').on('change', updateGateDisclaimer);
            $('#modalGates').on('show.bs.modal', updateGateDisclaimer);

            $('.dDoorWidth').click(function(){
                $(this).closest('.btn-group').find('.active').removeClass("active");
                $(this).closest('.btn').addClass('active');
                wDDoor = this.value;
                wDoor = this.value;
            });

            $('#modalDblGates input[name="radioGate"], #modalDblGates input[name="dDoorWidth"]').on('change', updateDblGateDisclaimer);
            $('#modalDblGates').on('show.bs.modal', updateDblGateDisclaimer);


        });

        function restart() {
            window.location.href = '/';
        }

        function removeDimFromPanel(name){
            var txtDimMod = document.getElementsByName(name);
            if(txtDimMod != null && txtDimMod.length == 1){
                var row = txtDimMod[0].closest("tr");
                if(row) {
                    row.remove();
                    if(document.getElementsByClassName("rowDim").length == 0){
                        $('#submitDims').css('display','none');
                        $('#btnEstimate').css('display','block');
                    }
                }
            }
        }

        function substituteDims_old(before, after){
            dimensions.forEach((values, keys) => {
                var dims = keys.split("+");
                if(dims.length == 1){
                    if(dims[0] == before){
                        dimensions.set(after, dimensions.get(before));
                        dimensions.delete(before);
                    }
                }
                else {
                    dims.forEach((element) => {
                        if (element == before) {
                            var newKey = keys.replace(before + "+", after + "+");
                            if (newKey.substring(newKey.length - before.length - 1) == ("+" + before)) {
                                newKey = newKey.substring(0, newKey.length - before.length) + after;
                            }
                            dimensions.set(newKey, values);
                            dimensions.delete(keys);
                        }
                    });
                }
            });
        }

        function substituteDims(before, after) {
            // Create a new map to store the updated entries.
            let updatedDimensions = new Map();

            // Iterate through the dimensions map.
            dimensions.forEach((values, keys) => {
                // Split the key by '+' to handle multipart keys.
                let dims = keys.split("+");
                let updatedKey = null;

                if (dims.length === 1) {
                    // Single dimension key, directly replace if it matches.
                    if (dims[0] === before) {
                        updatedKey = after;
                    }
                } else {
                    // Multi-part key, replace 'before' part wherever it appears.
                    updatedKey = dims.map(dim => (dim === before ? after : dim)).join("+");
                }

                // If there's an update, store it in the new map.
                if (updatedKey !== null) {
                    updatedDimensions.set(updatedKey, values);
                } else {
                    // Keep the original key if no change was made.
                    updatedDimensions.set(keys, values);
                }
            });

            // Replace the original dimensions map with the updated one.
            dimensions.clear();
            updatedDimensions.forEach((value, key) => dimensions.set(key, value));
        }

        function recalculateDims(llave, valor){
            dimensions.forEach((values, keys) => {
                var dims = keys.split("+");
                dims.forEach((element) => {
                    if(element == llave){
                        var newKey = keys.replace(llave + "+","");
                        if(newKey.substring(newKey.length - llave.length - 1) == ("+" + llave)){
                            newKey = newKey.substring(0, newKey.length - llave.length -1);
                        }
                        var newVal = values - valor;
                        if(newVal > 0) {
                            dimensions.set(newKey, newVal);
                            if (newKey.length < 5) {
                                graph.setDim(newKey, newVal);
                                removeDimFromPanel(newKey);
                            }
                        }
                        dimensions.delete(keys);
                    }
                });
            });
        }

        var modalBtnOK = document.getElementById('btnDimOK');
        modalBtnOK.addEventListener('click', function (){
            var lengthInput = document.getElementById("txtLength");
            var val = Number(lengthInput.value);

            if (!Number.isFinite(val) || val <= 0) {
                lengthInput.setCustomValidity('Length must be greater than zero.');
                lengthInput.reportValidity();
                return;
            }

            lengthInput.setCustomValidity('');
            document.getElementById("btnDim").click();
            var key = dimOver.texto; // dimOver.ref;

            if((key+"").includes("d")) {
                var delKey = dimOver.texto;
                dimensions.set(key, val);

                //dimOver.setTexto(val);
                graph.setDim(delKey, eval(val));

                recalculateDims(key, val);
                removeDimFromPanel(delKey);

                if (dimOver.linked != null) {
                    dimOver.linked.setTexto(document.getElementById("txtLength").value);
                }
            }
            else{
                graph.setDim(dimOver, val);
            }
            redrawing = true;
        });

        var dimsTable = document.getElementById('dynamic_field');
        dimsTable.addEventListener('keydown', function(event) {
            if (event.target.matches('input[id^="txt_"]') && event.key === 'Enter') {
                event.preventDefault(); // Prevent form submission on Enter

                // Get all inputs that match the 'name^="d"' selector
                const inputs = dimsTable.querySelectorAll('input[id^="txt_"]');

                // Find the index of the current input
                const index = Array.from(inputs).indexOf(event.target);

                // If it's not the last input, focus the next one
                if (index < inputs.length - 1) {
                    inputs[index + 1].focus();
                } else {
                    // If it's the last input, simulate a button click
                    $("#submitDims").click();
                }
            }
        });

        var modalBtnDimsOK = document.getElementById('btnDimsOK');
        modalBtnDimsOK.addEventListener('click', function (){
            function setDim(item) {
                if(item.value.trim() != "") {
                    var value = Number(item.value);
                    if (!Number.isFinite(value) || value <= 0) {
                        item.setCustomValidity('Length must be greater than zero.');
                        item.reportValidity();
                        return;
                    }
                    item.setCustomValidity('');
                    graph.setDim(item.name, item.value);
                }
            }

            var dims = $("#formDims input").toArray();
            dims.forEach(setDim);

            $("#modalDims").hide();
        });

        var panelDimsSubmit = document.getElementById('submitDims');
        function requestSketchRedraw() {
            redrawing = true;

            if (typeof loop === 'function') {
                loop();
            }

            if (typeof redraw === 'function') {
                redraw();
            }

            window.requestAnimationFrame(function () {
                redrawing = true;

                if (typeof redraw === 'function') {
                    redraw();
                }
            });
        }

        panelDimsSubmit.addEventListener('click', function (){
            var removed = 0;
            function setDim(item) {
                if(item.value.trim() != "") {
                    var value = Number(item.value);
                    if (!Number.isFinite(value) || value <= 0) {
                        item.setCustomValidity('Length must be greater than zero.');
                        item.reportValidity();
                        return;
                    }
                    item.setCustomValidity('');
                    graph.setDim(item.name, value);
                    recalculateDims(item.name, value);
                    dimensions.set(item.name, value);
                    removeDimFromPanel(item.name);
                    /*
                    var row = item.closest("tr");
                    if(row) {
                        row.remove();
                        removed++;
                    }
                     */
                }
            }

            var dims = $("#panelDims .rowDim input:not(:button):not(:file)").toArray(); // $("#panelDims input").toArray();
            dims.forEach(setDim);
            /*
            if(removed == dims.length){
                $('#submitDims').css('display','none');
            }
             */
            //$('#dynamic_field').html("");
            requestSketchRedraw();
            //redrawing=true;
        });

        $('#btnEstimate').on('click', function(e) {
            e.preventDefault();

            Swal.fire({
                title: 'Add concrete',
                text: `Would you like to add concrete to the estimate?`,
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: 'Yes, add it',
                cancelButtonText: 'No',
                reverseButtons: true,
                allowOutsideClick: false,     // Prevent closing by clicking outside
                backdrop: true,               // Ensures a full overlay layer
                didOpen: () => noLoop(),      // ⛔ Stop p5 from capturing clicks
                willClose: () => loop()       // ✅ Resume p5 when alert closes
            }).then((result) => {
                var data = graph.getData();
                if (result.isConfirmed) {
                    data.push({ id: "concrete", value: true });
                }
                else{
                    data.push({ id: "concrete", value: false });
                }
                var jsonStr = JSON.stringify(data);
                $.ajax({
                    type: "GET",
                    headers: {
                        'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                    },
                    url: 'estimate/' + jsonStr,
                    success: function(msg){
                        $('#formEstimate').css('display','block');
                        $('#txtMaterials').val(msg);
                        //$('#fishbowlForm').css('display','block');
                        $('#btnEstimate').css('display','block');
                        $('#btnQuote').css('display','block');
                    },
                    error: function(XMLHttpRequest, textStatus, errorThrown) {
                    }
                });
            });
        });

        @auth
        /*
        // FISHBOWL
        $('#btnFishbowl').on('click', function(e) {
            e.preventDefault();
            var customer = $("#customer").val()
            $.ajax({
                type: "GET",
                headers: {
                    'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                },
                url: '/sendtoFB/' + customer,
                success: function(msg){
                    console.log(msg);
                    if(msg.equals == "ERROR"){
                        Swal.fire({
                            title: 'FISHBOWL ESTIMATE',
                            text: "There was an error when trying to create the estimate in Fishbowl",
                            icon: 'error', // Icons: 'success', 'error', 'warning', 'info', 'question'
                            confirmButtonText: 'OK'
                        });
                    }
                    else{
                        Swal.fire({
                            title: 'FISHBOWL ESTIMATE',
                            text: msg,
                            icon: 'success', // Icons: 'success', 'error', 'warning', 'info', 'question'
                            confirmButtonText: 'OK'
                        });
                        $('#btnFishbowl').css('display','none');
                        $('#fishbowlForm').css('display','none');
                    }
                },
                error: function(XMLHttpRequest, textStatus, errorThrown) {
                }
            });
        });
         */
        //GOOGLE SHEETS
        /*
        document.getElementById('copyToSheet').addEventListener('click', async () => {
            const res = await fetch("{{ route('results.copy') }}", {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN': '{{ csrf_token() }}',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    id: "106"
                })
            });
            const data = await res.json();
            alert(data.message || 'Done');
        });
        */
        @endauth

        $('#fileInput').change(function() {
            var file = $(this).prop('files')[0];
            if (file) {
                var formData = new FormData();
                formData.append('file', file);

                $.ajax({
                    url: 'load', // URL to your file upload route
                    type: 'POST',
                    headers: {
                        'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                    },
                    data: formData,
                    contentType: false,
                    processData: false,
                    success: function(response) {
                        clearSc();

                        buffer = createGraphics(_W - toolbarWidth, _H);
                        gridlines();

                        redrawing = true;
                        graph.setData(JSON.parse(response.data));

                    },
                    error: function(xhr, status, error) {
                        // Handle the error here
                        console.error(xhr.responseText);
                    }
                });
            }
        });

        function applySketchData(sketchData) {
            sketchData = (sketchData || []).filter(function (item) {
                return item
                    && Object.prototype.hasOwnProperty.call(item, 'node1')
                    && Object.prototype.hasOwnProperty.call(item, 'node2')
                    && Object.prototype.hasOwnProperty.call(item, 'x1')
                    && Object.prototype.hasOwnProperty.call(item, 'y1')
                    && Object.prototype.hasOwnProperty.call(item, 'x2')
                    && Object.prototype.hasOwnProperty.call(item, 'y2');
            });

            clearSc();

            buffer = createGraphics(_W - toolbarWidth, _H);
            gridlines();

            actual = null;
            dimOver = null;
            drawable = true;
            redrawing = true;
            graph.setData(sketchData);
        }

        function loadQuoteRequestSketchWhenReady() {
            if (!quoteRequestSketchToLoad) {
                return;
            }

            var attempts = 0;
            var timer = setInterval(function () {
                attempts++;

                if (typeof graph !== 'undefined' && graph && typeof graph.setData === 'function') {
                    clearInterval(timer);
                    applySketchData(quoteRequestSketchToLoad);
                    quoteRequestSketchToLoad = null;
                    return;
                }

                if (attempts > 50) {
                    clearInterval(timer);
                    console.error('Unable to auto-load quote request sketch: graph was not ready.');
                }
            }, 100);
        }

        loadQuoteRequestSketchWhenReady();

        $('#btnLoad').on('click', function(e) {
            e.preventDefault();
            $('#fileInput').click();
        });

        $('#btnSave').on('click', function(e) {
            e.preventDefault();
            var jsonStr = JSON.stringify(graph.getData());
            var url = 'save/' + jsonStr;

            fetch(url, {
                method: 'GET',
                headers: {
                    'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                }
            })
                .then(response => response.blob())
                .then(blob => {
                    // Create a link element, set its href to a URL representing the blob, and trigger a download
                    const link = document.createElement('a');
                    link.href = URL.createObjectURL(blob);
                    link.download = 'project_' + new Date().toISOString().replace(/:/g, '-') + '.wfs';
                    link.click();
                })
                .catch(error => console.error('Error downloading the file:', error));
        });

        document.getElementById('modalTemplates').addEventListener('click', function(event) {
            event.stopPropagation(); // Stop the event from reaching the canvas
        });

        function loadTemplates(){
            canvasEnabled =false;
            document.getElementById("btnTemplates").click();
        }

        function loadTemplate(){
            document.getElementById("btnTemplates").click();
            var sel = $('#modalTemplates input:radio:checked')[0].value;
            $.ajax({
                url: 'template/' + sel, // URL to your file upload route
                type: 'GET',
                headers: {
                    'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                },
                contentType: false,
                processData: false,
                success: function(response) {
                    clearSc();
                    graph.setData(JSON.parse(response.data));
                    canvasEnabled = true;
                },
                error: function(xhr, status, error) {
                    // Handle the error here
                    console.error(xhr.responseText);
                    canvasEnabled = true;
                }
            });
        }

        var modalBtnGateOK = document.getElementById('btnGateOK');
        modalBtnGateOK.addEventListener('click', function (){
            document.getElementById("btnGate").click();
            var sel = $('#modalGates input:radio:checked')[0].value;
            doorType = parseInt(sel);
            wSDoor = $("#sDoorCustomWidth").closest('.btn-group').find('.active').children()[0].value;
            if(wSDoor == "0"){
                if($("#sDoorCustomWidth")[0].value.trim().length == 0){
                    Swal.fire({
                        icon: 'warning',
                        title: 'Missing Custom Door Width Value',
                        text: 'Please enter a custom width before proceeding.',
                        confirmButtonText: 'OK',
                        customClass: {
                            popup: 'small-swal',
                        }
                    }).then(() => {
                        document.getElementById("btnGate").click();
                    });
                }
                else {
                    wSDoor = $("#sDoorCustomWidth")[0].value;
                    wDoor = wSDoor;
                }
            }
        });

        var modalBtnDblGateOK = document.getElementById('btnDblGateOK');
        modalBtnDblGateOK.addEventListener('click', function (){
            document.getElementById("btnDblGate").click();
            var sel = $('#modalDblGates input:radio:checked')[0].value;
            doorType = parseInt(sel);
            wDDoor = $("#dDoorCustomWidth").closest('.btn-group').find('.active').children()[0].value;
            if(wDDoor == "0"){
                if($("#dDoorCustomWidth")[0].value.trim().length == 0){
                    Swal.fire({
                        icon: 'warning',
                        title: 'Missing Custom Door Width Value',
                        text: 'Please enter a custom width before proceeding.',
                        confirmButtonText: 'OK',
                        customClass: {
                            popup: 'small-swal',
                        }
                    }).then(() => {
                        document.getElementById("btnDblGate").click();
                    });
                }
                else {
                    wDDoor = $("#dDoorCustomWidth")[0].value;
                    wDoor = wDDoor;
                }
            }
        });

        $('#sDoorCustomWidth').on('focus', function() {
            $('#sdoorCustom').prop('checked', true);
            $('#lblSCustom').addClass('active');
            $('.dwBtn').not('#lblSCustom').removeClass('active');
            updateGateDisclaimer();
        });

        $('#dDoorCustomWidth').on('focus', function() {
            $('#ddoorCustom').prop('checked', true);
            $('#lblDCustom').addClass('active');
            $('.dwBtn').not('#lblDCustom').removeClass('active');
            updateDblGateDisclaimer();
        });

        $("#modalDim").keypress(function(e)
        {
            if (e.which == 13) {
                modalBtnOK.click();
                return false;
            }
        });

        $('#txtLength').keypress(function (e) {
            var charCode = (e.which) ? e.which : event.keyCode
            if (String.fromCharCode(charCode).match(/[^0-9]/g))
                return false;
        });

        /*
        $('.modal').modal({ keyboard: false,
            show: true
        });

        // Jquery draggable
        $('.modal-dialog').draggable({
            handle: ".modal-header"
        });
        */

        function loadDynamicContentModal(modal) {
            var options = {
                modal : true,
                height : 300,
                width : 500
            };
            var dims = graph.getDims();
            var jsonDims = JSON.stringify(dims.sort(
                function(x,y){
                    var valX = parseInt(x.substring(1));
                    var valY = parseInt(y.substring(1));
                    if (valX < valY) {
                        return -1;
                    }
                    if (valX > valY) {
                        return 1;
                    }
                    return 0;
                }

            ));


            $('#formDims').load('getDims/' + jsonDims,
                function() {
                    /*
                    $('#modalDims').modal({
                        show : true
                    });

                     */
                });
        }

    </script>
    <script src="@assetv('js/s_utils.js')"></script>
    <script src="@assetv('js/s_tool.js')"></script>
    <script src="@assetv('js/s_toolbar.js')"></script>
    <script src="@assetv('js/s_dim.js')"></script>
    <script src="@assetv('js/s_edge.js')"></script>
    <script src="@assetv('js/s_vert.js')"></script>
    <script src="@assetv('js/s_graph.js')"></script>
    <script src="@assetv('js/point.js')"></script>
    <script src="@assetv('js/s_sketch.js')"></script>
    <script>
        const toolHelpVideos = {
            default: @json(asset('vid/wfs.mp4')),
            Eraser: @json(asset('vid/erase.mp4')),
            Line: @json(asset('vid/draw.mp4')),
            Fence: @json(asset('vid/draw.mp4')),
            "Existing Wall": @json(asset('vid/wall.mp4')),
            "Single Gate": @json(asset('vid/gates.mp4')),
            "Double Gate": @json(asset('vid/gates.mp4')),
            Orto: @json(asset('vid/ortho.mp4')),
            "Load Project": @json(asset('vid/project.mp4')),
            "Save Project": @json(asset('vid/project.mp4')),
            "Use Template": @json(asset('vid/templates.mp4')),
        };

        const toolHelpVideoModal = document.getElementById('toolHelpVideoModal');
        const toolHelpVideoPlayer = document.getElementById('toolHelpVideoPlayer');
        const toolHelpVideoSource = toolHelpVideoPlayer.querySelector('source');
        const toolHelpVideoTitle = document.getElementById('toolHelpVideoTitle');
        const toolHelpVideoClose = document.getElementById('toolHelpVideoClose');

        function openToolHelpVideo(toolLabel) {            
            const toolName = toolLabel ? toolLabel.replace(/\s+\([^)]*\)$/, '') : 'Tool';
            const videoSource = toolHelpVideos[toolName] || toolHelpVideos.default;

            toolHelpVideoTitle.textContent = `${toolName} help video`;

            if (toolHelpVideoSource.getAttribute('src') !== videoSource) {
                toolHelpVideoSource.setAttribute('src', videoSource);
                toolHelpVideoPlayer.load();
            }

            toolHelpVideoModal.classList.add('is-open');
            toolHelpVideoModal.setAttribute('aria-hidden', 'false');
            toolHelpVideoPlayer.currentTime = 0;
            toolHelpVideoPlayer.play().catch(function () {});
        }

        const toolbarVideoTooltip = document.createElement('div');
        toolbarVideoTooltip.className = 'toolbar-video-tooltip';
        toolbarVideoTooltip.innerHTML = '<button type="button" class="toolbar-video-tooltip-help" aria-label="Watch help video">?</button>';
        document.body.appendChild(toolbarVideoTooltip);

        const toolbarVideoTooltipHelp = toolbarVideoTooltip.querySelector('.toolbar-video-tooltip-help');
        let activeToolbarHelpButton = null;
        let toolbarTooltipHideTimer = null;

        function positionToolbarVideoTooltip(button) {
            const buttonRect = button.getBoundingClientRect();
            const tooltipRect = toolbarVideoTooltip.getBoundingClientRect();
            const top = Math.max(8, buttonRect.top - tooltipRect.height - 6);
            const left = Math.max(8, Math.min(
                buttonRect.right - tooltipRect.width,
                window.innerWidth - tooltipRect.width - 8
            ));

            toolbarVideoTooltip.style.top = `${top}px`;
            toolbarVideoTooltip.style.left = `${left}px`;
        }

        function showToolbarVideoTooltip(button) {
            clearTimeout(toolbarTooltipHideTimer);
            activeToolbarHelpButton = button;
            const label = button.dataset.toolbarHelpLabel || button.textContent.trim();
            toolbarVideoTooltipHelp.setAttribute('aria-label', `Watch ${label} help video`);
            toolbarVideoTooltip.classList.add('is-visible');
            positionToolbarVideoTooltip(button);
        }

        function scheduleToolbarVideoTooltipHide() {
            clearTimeout(toolbarTooltipHideTimer);
            toolbarTooltipHideTimer = setTimeout(function () {
                toolbarVideoTooltip.classList.remove('is-visible');
                activeToolbarHelpButton = null;
            }, 120);
        }

        document.querySelectorAll('[data-toolbar-help-video]').forEach(function (button) {
            button.addEventListener('pointerenter', function () {
                showToolbarVideoTooltip(button);
            });

            button.addEventListener('pointerleave', scheduleToolbarVideoTooltipHide);
        });

        toolbarVideoTooltip.addEventListener('pointerenter', function () {
            clearTimeout(toolbarTooltipHideTimer);
        });

        toolbarVideoTooltip.addEventListener('pointerleave', scheduleToolbarVideoTooltipHide);

        toolbarVideoTooltipHelp.addEventListener('click', function (event) {
            event.preventDefault();
            event.stopPropagation();

            if (!activeToolbarHelpButton) {
                return;
            }

            toolbarVideoTooltip.classList.remove('is-visible');
            openToolHelpVideo(activeToolbarHelpButton.dataset.toolbarHelpVideo);
        });

        window.addEventListener('resize', function () {
            if (activeToolbarHelpButton && toolbarVideoTooltip.classList.contains('is-visible')) {
                positionToolbarVideoTooltip(activeToolbarHelpButton);
            }
        });

        function closeToolHelpVideo() {
            toolHelpVideoModal.classList.remove('is-open');
            toolHelpVideoModal.setAttribute('aria-hidden', 'true');
            toolHelpVideoPlayer.pause();
            toolHelpVideoPlayer.currentTime = 0;
        }

        toolHelpVideoModal.addEventListener('pointerdown', function (event) {
            suppressCanvasPointerInteraction(event, false);
        });
        toolHelpVideoModal.addEventListener('mousedown', function (event) {
            suppressCanvasPointerInteraction(event, false);
        });
        toolHelpVideoClose.addEventListener('pointerdown', function (event) {
            suppressCanvasPointerInteraction(event);
        });
        toolHelpVideoClose.addEventListener('mousedown', function (event) {
            suppressCanvasPointerInteraction(event);
        });
        toolHelpVideoClose.addEventListener('click', function (event) {
            event.preventDefault();
            event.stopPropagation();
            closeToolHelpVideo();
            releaseCanvasPointerInteraction();
        });
        toolHelpVideoModal.addEventListener('click', function (event) {
            if (event.target === toolHelpVideoModal) {
                event.preventDefault();
                event.stopPropagation();
                closeToolHelpVideo();
                releaseCanvasPointerInteraction();
            }
        });

        document.addEventListener('keydown', function (event) {
            if (event.key === 'Escape' && toolHelpVideoModal.classList.contains('is-open')) {
                closeToolHelpVideo();
            }
        });
    </script>

</body>
</html>
