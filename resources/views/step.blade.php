{{-- Configurator step. Rendered as an HTML fragment and loaded into #contenido by partials/step-loader. --}}
@php
    $types = [
        1 => ['Aluminum Fence',   'images/cover-aluminum-fence.jpg',   'Lightweight, Lasting Protection'],
        2 => ['Chain Link Fence', 'images/cover-chain-link-fence.jpg', 'A cost-effective solution'],
        3 => ['Metal Fence',      'images/cover-metal-fence.jpg',      'Ultimate Privacy, Impeccable Design'],
        4 => ['Vinyl Fence',      'images/cover-vinyl-fence.jpg',      'Timeless Elegance, Zero Maintenance'],
    ];
    $type = $types[(int) substr((string) ($code ?? '1'), 0, 1)] ?? $types[1];
    $shortName = trim(str_replace('Fence', '', $type[0]));

    // Breadcrumb links carry the selections made so far; the first one is the material itself.
    preg_match_all("/<a href='#'>(.*?)<\\/a>/", $breadcrums ?? '', $matches);
    $chosen = array_slice($matches[1] ?? [], 1);
    $stepNote = $step_note ?? '';
@endphp

<div class="wfs-page-head">
    <h1>{{ $shortName }}<br><em>At A Glance.</em></h1>
    <p>Pick each option and the next one appears. Same options as the Easy Draw Your Fence tool.</p>
</div>

<div class="wfs-step-actions">
    <a href="{{ route('quote.create') }}" class="wfs-btn wfs-btn-outline"><i class="fas fa-arrow-left"></i> Change material</a>
    <a href="{{ $from }}" class="wfs-btn wfs-btn-outline">Previous step</a>
</div>

<div class="wfs-step">
    <aside class="wfs-step-aside">
        <div class="wfs-material-card">
            <div class="wfs-material-img">
                {{-- Shows the chosen design/color once there is one; the material cover until then. --}}
                <img src="{{ asset(ltrim($preview ?? $type[1], '/')) }}" alt="{{ $type[0] }}" />
            </div>
        </div>
        <span class="wfs-eyebrow">{{ $type[2] }}</span>
        <h2>{{ $type[0] }}</h2>
    </aside>

    <section class="wfs-step-main">
        @if (count($chosen))
            <div class="wfs-chosen">
                <span class="wfs-label">Your selections</span>
                <div class="wfs-chosen-chips">
                    @foreach ($chosen as $choice)
                        <span class="wfs-chip is-active">{{ $choice }}</span>
                    @endforeach
                </div>
            </div>
        @endif

        <div class="wfs-question">
            <span class="wfs-label">{{ $title }}</span>
        </div>

        <div class="wfs-options">
            <div class="row g-4">
                {!! Blade::compileString($cardsTxt) !!}
            </div>
        </div>

        @if ($stepNote !== '')
            <p class="wfs-step-note">{{ $stepNote }}</p>
        @endif
    </section>
</div>

{{-- Custom height dialog: ids and the OK button are wired by the controller, keep them as they are. --}}
<button id="btnInput" style="display:none;" type="button" class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#modalInput">Input</button>
<div class="modal fade" id="modalInput" tabindex="-1" data-bs-backdrop="static" aria-labelledby="modalInputLbl" aria-hidden="true">
    <div class="modal-dialog">
        <div class="modal-content" id="modalContentInput">
            <div class="modal-header">
                <h5 class="modal-title" id="modalInputLbl">Enter height</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <form>
                    <div class="input-group">
                        <span id="spInput" class="input-group-text">h</span>
                        <input id="txtLength" type="number" steps="1" onkeydown="return event.key !== '.'" class="form-control" placeholder="Enter height" aria-label="Enter height" aria-describedby="basic-addon2">
                        <span class="input-group-text" id="basic-addon2">ft</span>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                {!! Blade::compileString($inputBtn ?? '') !!}
            </div>
        </div>
    </div>
</div>
