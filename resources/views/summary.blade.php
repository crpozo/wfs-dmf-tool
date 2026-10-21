{{-- Configuration summary shown when all options for a material are chosen.
     Fragment loaded into #contenido. $materials comes from the session (slot => attributes). --}}
@php
    $labels = [
        'material' => 'Material',
        'type'     => 'Type of fence',
        'height'   => 'Height',
        'color'    => 'Color',
        'style'    => 'Style',
        'design'   => 'Design',
        'bottom'   => 'Bottom rail or tension wire',
        'barbwire' => 'Barb wire',
        'barbarms' => 'Barb arms',
        'rails'    => 'Rails',
    ];
    $materials = collect($materials ?? [])->filter()->sortKeys();
    $current = $materials->last() ?? [];
    $heading = trim(($current['material'] ?? 'Your fence') . (isset($current['height']) ? ' · ' . $current['height'] . (is_numeric($current['height']) ? ' feet' : '') : ''));

    // "Request a quote" prefills the quote form on westernfencesupply.com/contact. Field names match
    // the prefill the WordPress quote flow already sends (project_type / details / configuration).
    $projectTypes = [
        'aluminum' => 'Aluminum',
        'chain'    => 'Chain Link',
        'metal'    => 'Metal / DuraFence',
        'vinyl'    => 'Vinyl / PVC',
    ];
    $projectType = 'Other';
    foreach ($projectTypes as $needle => $value) {
        if (stripos($current['material'] ?? '', $needle) !== false) {
            $projectType = $value;
            break;
        }
    }
    $lines = [];
    foreach ($materials as $attributes) {
        foreach ($labels as $key => $label) {
            if (!empty($attributes[$key])) {
                $lines[] = $label . ': ' . $attributes[$key] . ($key === 'height' && is_numeric($attributes[$key]) ? ' feet' : '');
            }
        }
    }
    $quoteUrl = 'https://westernfencesupply.com/contact/?' . http_build_query([
        'project_type'  => $projectType,
        'configuration' => implode(' · ', $lines),
        'details'       => "Fence configuration from Draw My Fence:\n" . implode("\n", $lines) . "\n\nApprox. linear feet: \nLocation / zip: \nTimeline: ",
    ], '', '&', PHP_QUERY_RFC3986) . '#get-a-quote';
@endphp

<div class="wfs-step-actions">
    <a href="{{ $from }}" class="wfs-btn wfs-btn-outline"><i class="fas fa-arrow-left"></i> Edit options</a>
    <a href="{{ route('quote.create') }}" class="wfs-btn wfs-btn-outline">Start over</a>
</div>

<div class="wfs-summary">
    <div class="wfs-summary-head">
        <span class="wfs-eyebrow">Ready to draw your fence</span>
        <h2>{{ $heading }}</h2>
    </div>

    @foreach ($materials as $slot => $attributes)
        <div class="wfs-summary-group {{ empty($previews[$slot]) ? 'is-text-only' : '' }}">
            @if (!empty($previews[$slot]))
                <div class="wfs-summary-preview">
                    <img src="{{ asset(ltrim($previews[$slot], '/')) }}" alt="{{ $attributes['material'] ?? 'Fence' }}" />
                </div>
            @endif
            <div>
                @if ($materials->count() > 1)
                    <span class="wfs-eyebrow">Material {{ $loop->iteration }}</span>
                @endif
                <div class="wfs-summary-rows">
                    @foreach ($labels as $key => $label)
                        @if (!empty($attributes[$key]))
                            <div class="wfs-summary-row">
                                <span class="wfs-label">{{ $label }}</span>
                                <span>{{ $attributes[$key] }}{{ $key === 'height' && is_numeric($attributes[$key]) ? ' feet' : '' }}</span>
                            </div>
                        @endif
                    @endforeach
                </div>
            </div>
        </div>
    @endforeach

    <div class="wfs-summary-actions">
        <a href="/drawfence" class="wfs-btn wfs-btn-ice">Continue to the drawing tool <i class="fas fa-arrow-right"></i></a>
        <a href="{{ $quoteUrl }}" class="wfs-btn wfs-btn-ghost">Request a quote without drawing <i class="fas fa-external-link-alt"></i></a>
    </div>
    <p class="wfs-summary-note">
        Draw your fence to get the instant list of materials and a quote based on your exact measurements.
        Or request a quote without drawing: the contact form opens already filled with this configuration.
    </p>
</div>
