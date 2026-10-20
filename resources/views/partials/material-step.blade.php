{{--
    Material picker used by the home page (slot 1) and by the "second/third material" step.
    $slot     material slot the selection goes into (1, 2 or 3) -> builds /step/{slot}/{id}
    $headline main title; the last word is highlighted in blue
    $lead     short paragraph on the right
--}}
@php
    $slot = $slot ?? 1;
    $headline = $headline ?? 'Start With The Material.';
    $lead = $lead ?? 'Pick a material to configure your fence. Same options as the Easy Draw Your Fence tool.';
    $words = preg_split('/\s+/', trim($headline));
    $last = array_pop($words);
    $materials = [
        ['id' => 10, 'name' => 'Aluminum Fence',   'tag' => 'Lightweight, Lasting Protection',   'heights' => '4 FT / 5 FT / 6 FT', 'img' => 'images/cover-aluminum-fence.jpg',   'meta' => ['Commercial / Residential', 'White / Black / Bronze']],
        ['id' => 20, 'name' => 'Chain Link Fence', 'tag' => 'A cost-effective solution',          'heights' => '4 FT / 5 FT / 6 FT', 'img' => 'images/cover-chain-link-fence.jpg', 'meta' => ['Commercial / Residential', 'Black / Green / Galvanized']],
        ['id' => 30, 'name' => 'Metal Fence',      'tag' => 'Ultimate Privacy, Impeccable Design', 'heights' => '6 FT / 8 FT',        'img' => 'images/cover-metal-fence.jpg',      'meta' => ['Original / Modern', 'White / Bronze / Woodgrain / Black']],
        ['id' => 40, 'name' => 'Vinyl Fence',      'tag' => 'Timeless Elegance, Zero Maintenance', 'heights' => '4 FT / 5 FT / 6 FT', 'img' => 'images/cover-vinyl-fence.jpg',      'meta' => ['Privacy / Semi Privacy / Picket / Ranch', 'White / Sand / Grey']],
    ];
@endphp

<div class="wfs-page-head">
    <h1>{{ implode(' ', $words) }}<br><em>{{ $last }}</em></h1>
    <p>{{ $lead }}</p>
</div>

<div class="wfs-materials">
    @foreach ($materials as $m)
        <a href="/step/{{ $slot }}/{{ $m['id'] }}" class="wfs-material-card">
            <div class="wfs-material-img">
                <img src="{{ asset($m['img']) }}" alt="{{ $m['name'] }}" loading="lazy" />
            </div>
            <div class="wfs-material-body">
                <span class="wfs-eyebrow">{{ $m['heights'] }}</span>
                <h3>{{ $m['name'] }}</h3>
                <p>{{ $m['tag'] }}</p>
                <div class="wfs-material-meta">
                    <span><i class="fas fa-th-large"></i>{{ $m['meta'][0] }}</span>
                    <span><i class="fas fa-palette"></i>{{ $m['meta'][1] }}</span>
                </div>
            </div>
        </a>
    @endforeach
</div>
