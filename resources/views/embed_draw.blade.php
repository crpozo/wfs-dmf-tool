@php
    // Render the canonical drawing page first, then add only the embed adapter.
    // This keeps simple_draw.blade.php as the single source for the actual tool.
    $drawFenceHtml = view('simple_draw', [
        'step' => $step,
        'materials' => $materials,
        'hayAl' => $hayAl,
        'hayChain' => $hayChain,
        'hayMetal' => $hayMetal,
        'hayPVC' => $hayPVC,
        'm' => $m,
        'c' => $c,
    ])->render();

    $embedCssPath = 'css/drawfence-embed.css';
    $embedJsPath = 'js/drawfence-embed.js';
    $embedCssUrl = asset($embedCssPath).'?v='.(file_exists(public_path($embedCssPath)) ? filemtime(public_path($embedCssPath)) : time());
    $embedJsUrl = asset($embedJsPath).'?v='.(file_exists(public_path($embedJsPath)) ? filemtime(public_path($embedJsPath)) : time());
    $parentOriginJson = json_encode($embedParentOrigin, JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_AMP | JSON_HEX_QUOT);

    $headAdditions = '<base href="'.e(url('/').'/').'">'
        .'<link rel="stylesheet" href="'.e($embedCssUrl).'">';
    $bodyAdditions = '<script>window.WFS_DRAWING_PARENT_ORIGIN='.$parentOriginJson.';</script>'
        .'<script src="'.e($embedJsUrl).'"></script>';

    $headPosition = stripos($drawFenceHtml, '<head>');
    if ($headPosition !== false) {
        $drawFenceHtml = substr_replace(
            $drawFenceHtml,
            '<head>'.$headAdditions,
            $headPosition,
            strlen('<head>')
        );
    }

    // The drawing JavaScript contains literal </body> text for its print
    // document. Inject at the final closing tag so that script is not split.
    $bodyPosition = strripos($drawFenceHtml, '</body>');
    if ($bodyPosition !== false) {
        $drawFenceHtml = substr_replace($drawFenceHtml, $bodyAdditions, $bodyPosition, 0);
    }
@endphp
{!! $drawFenceHtml !!}
