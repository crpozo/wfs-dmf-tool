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
@endphp

<div class="wfs-page-head">
    <h1>Ready To Draw<br><em>Your Fence.</em></h1>
    <p>Review your configuration. The drawing tool opens with these exact options.</p>
</div>

<div class="wfs-step-actions">
    <a href="{{ $from }}" class="wfs-btn wfs-btn-outline"><i class="fas fa-arrow-left"></i> Edit options</a>
    <a href="{{ route('quote.create') }}" class="wfs-btn wfs-btn-outline">Start over</a>
</div>

<div class="wfs-summary">
    <span class="wfs-eyebrow">Your fence configuration</span>
    <h2>{{ $heading }}</h2>

    @foreach ($materials as $slot => $attributes)
        <div class="wfs-summary-group">
            @if ($materials->count() > 1)
                <span class="wfs-eyebrow">Material {{ $loop->iteration }}</span>
            @endif
            @if (!empty($previews[$slot]))
                <div class="wfs-summary-preview">
                    <img src="{{ asset(ltrim($previews[$slot], '/')) }}" alt="{{ $attributes['material'] ?? 'Fence' }}" />
                </div>
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
    @endforeach

    <div class="wfs-summary-actions">
        <a href="/drawfence" class="wfs-btn wfs-btn-ice">Continue to the drawing tool <i class="fas fa-arrow-right"></i></a>
        <a href="https://westernfencesupply.com/contact/#get-a-quote" class="wfs-btn wfs-btn-ghost">Request a quote without drawing <i class="fas fa-external-link-alt"></i></a>
    </div>
    <p class="wfs-summary-note">
        Draw your fence to get the instant list of materials and a quote based on your exact measurements.
        If you prefer to send measurements by hand, our sales team can quote from the contact form.
    </p>
</div>
