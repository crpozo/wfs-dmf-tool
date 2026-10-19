@php
    $publicFolder = public_path('drawfence-embed');
    $basePath = $publicFolder.DIRECTORY_SEPARATOR.'base.html';
    $cssPath = $publicFolder.DIRECTORY_SEPARATOR.'embed.css';
    $jsPath = $publicFolder.DIRECTORY_SEPARATOR.'embed.js';

    foreach ([$basePath, $cssPath, $jsPath] as $requiredFile) {
        if (! file_exists($requiredFile)) {
            throw new RuntimeException('Missing customizable Draw Fence file: '.$requiredFile);
        }
    }

    $baseHtml = file_get_contents($basePath);
    $embedCss = file_get_contents($cssPath);
    $embedJs = file_get_contents($jsPath);

    foreach (['/* WFS_EMBED_CSS */', '/* WFS_EMBED_JS */'] as $placeholder) {
        if (! str_contains($baseHtml, $placeholder)) {
            throw new RuntimeException('Missing required Draw Fence placeholder: '.$placeholder);
        }
    }

    // Insert the public CSS and JavaScript before compiling the complete public
    // template. The three public files remain the editable source of this view.
    $publicTemplate = str_replace(
        ['/* WFS_EMBED_CSS */', '/* WFS_EMBED_JS */'],
        [$embedCss, $embedJs],
        $baseHtml
    );

    $customizableHtml = \Illuminate\Support\Facades\Blade::render($publicTemplate, [
        'step' => $step,
        'materials' => $materials,
        'hayAl' => $hayAl,
        'hayChain' => $hayChain,
        'hayMetal' => $hayMetal,
        'hayPVC' => $hayPVC,
        'm' => $m,
        'c' => $c,
        'embedParentOrigin' => $embedParentOrigin,
    ], true);
@endphp
{!! $customizableHtml !!}
