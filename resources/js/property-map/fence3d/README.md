# fence3d

`cerca.js`, `piezas.js` and `texturas.js` are copied from the website's 3D viewer
source (`wfs-design-preview/src-3d/`, the same viewer the WordPress theme ships as
`apps/fence-3d.js`). The only change is the import path: `'three'` (npm, pinned to
0.169.0 like the website) instead of `'../vendor/three/three.module.js'`.

Keep them in sync with that source so a fence style looks the same on the website and
in Draw My Fence. Code specific to the property map lives one folder up
(`../viewer3d.js`, `../fence-catalog.js`).
