$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$jsDir = Join-Path $root 'public\js'
$files = @(
    's_utils.js',
    's_tool.js',
    's_toolbar.js',
    's_dim.js',
    's_edge.js',
    's_vert.js',
    's_graph.js',
    's_sketch.js'
)

$decoder = @'
(function (w) {
  w.__wfsSBundle = w.__wfsSBundle || [];
  w.__wfsSDecode = w.__wfsSDecode || function (input) {
    var binary = atob(input);
    var bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    if (typeof TextDecoder !== 'undefined') {
      return new TextDecoder().decode(bytes);
    }
    var encoded = '';
    for (var j = 0; j < bytes.length; j++) {
      encoded += '%' + ('00' + bytes[j].toString(16)).slice(-2);
    }
    return decodeURIComponent(encoded);
  };
})(window);
'@

foreach ($index in 0..($files.Count - 1)) {
    $name = $files[$index]
    $path = Join-Path $jsDir $name
    if (-not (Test-Path $path)) {
        throw "Missing file: $path"
    }

    $content = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)
    $payload = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($content))

    if ($index -lt $files.Count - 1) {
        $output = $decoder + @"
window.__wfsSBundle.push('$payload');
"@
    }
    else {
        $output = $decoder + @"
window.__wfsSBundle.push('$payload');
(function () {
  var output = '';
  for (var i = 0; i < window.__wfsSBundle.length; i++) {
    output += window.__wfsSDecode(window.__wfsSBundle[i]);
  }
  window.__wfsSBundle = [];
  (0, eval)(output);
})();
"@
    }

    [System.IO.File]::WriteAllText($path, $output, (New-Object System.Text.UTF8Encoding($false)))
}
