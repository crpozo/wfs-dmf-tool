# Draw My Fence · Fase 2: estado y pendientes

Actualizado el 30 de octubre de 2026. Documento de traspaso para seguir el trabajo en un chat nuevo sobre este repositorio. No contiene secretos: los valores reales están en `.env` (ignorado por git).

## 1. Contexto

- **App:** Draw My Fence, de Western Fence Supply (WFS). Laravel 10, PHP 8.1 y PostgreSQL 17, en una EC2 de la cuenta AWS de WFS detrás de CloudFront (`app.westernfencesupply.com`). La migración y el rediseño están en producción desde el 22 oct 2026 (v1.0.0).
- **Fase 2**, pedida por WFS el 23 oct 2026:
  1. Cerca sobre el mapa satelital de la propiedad (Google Maps). **Hecha**, falta probar y desplegar.
  2. Visualizador 3D con la cerca elegida. **Hecho, con mejoras de render pendientes.**
  3. División automática de la cerca. Decidida **sin IA** en esta fase; **no empezada**.
  4. Mejoras del lienzo clásico (deshacer, zoom, barra HTML). **No empezada**, salvo lo que ya trae el mapa.
- **Requerimientos finales de la Feature 1:** `requerimientos_fase2.md` (de Carlos, 26 oct 2026). Mandan sobre cualquier otro documento.
- **Convenciones:**
  - El código, los comentarios, los textos de la interfaz y los commits van en inglés. Los documentos internos, en español.
  - Los `git push` los ejecuta René. El asistente prepara los commits y le pasa los comandos.
  - Nunca `php artisan config:cache` en este proyecto: el código lee `env()` en tiempo de ejecución.

## 2. Repositorios

| Repo | Qué es | Notas |
|---|---|---|
| `github.com/crpozo/wfs-dmf-tool` (**público**) | Esta app (antes carpeta `www/`) | Remoto `origin`, por SSH. Push con la key SSH de trabajo (cuenta `rguzmanmt`, colaborador). La cuenta personal por HTTPS no tiene permiso |
| Remoto `server` | Repo bare en la EC2 de producción | Solo se alcanza con el túnel SSM. Desplegar = `git push server main` + `drawfence-deploy` en el servidor. Independiente de `origin` |
| `github.com/crpozo/wfs-design-preview` (Pages) | Diseño del sitio WordPress + **demo** de la Fase 2 | Fuente del visor 3D del sitio en `src-3d/`. La demo compilada está en `draw-my-fence-demo/` |

**Ramas de `wfs-dmf-tool`:**

| Rama | Contenido |
|---|---|
| `main` | Igual que `redesign`: versión en producción. Adelantada localmente; confirmar que el push de `main` se hizo |
| `redesign` | Rediseño v1.0.0 (producción) |
| `feature/property-map-drawing` | **Fase 2.** Sin fusionar a `main` hasta que WFS la apruebe |

**Commits de la Fase 2** (en `feature/property-map-drawing`):

| Commit | Contenido |
|---|---|
| `ed9f870` | Mapa satelital: dibujo, medidas, puertas, materiales, guardar por enlace, imagen del quote |
| `ba19e20` | Primer 3D (suelo satelital, descartado después) |
| `252768a` | 3D con casa estilizada a la medida de la casa real |
| `d9b0f5f` | Demo estática para GitHub Pages |
| `b14f340` | Preparación del repo: `.gitignore`, scripts GLPK versionados, key propia de la demo |

**Demo para el cliente:** https://crpozo.github.io/wfs-design-preview/draw-my-fence-demo/ (commit `a599f7f` en el design preview).

## 3. Qué está implementado

### 3.1 Mapa (Feature 1)

Se activa solo si `GOOGLE_MAPS_BROWSER_KEY` tiene valor. Sin key, la página es idéntica a antes y el lienzo clásico p5.js sigue debajo como respaldo.

- **Mapa:** `@googlemaps/js-api-loader` 2.1.3, cargado solo en el paso de dibujo. Satélite, `tilt` 0, zoom 18 a 21 (empieza en 20), escala en pies, selector Map / Satellite, sin Street View ni rotación.
- **Buscador y ubicación:** `PlaceAutocompleteElement` (Places New) limitado a EE. UU. y sesgado a Lee y Charlotte; geocodifica y guarda `place_id`. "Use my location" con reverse geocoding.
- **Dibujo propio** con `Polyline` y `AdvancedMarkerElement` (no DrawingManager, retirado por Google):
  - vértices en lat/lng; cada lado ("run") une dos vértices consecutivos;
  - mover, borrar (menú al tocar), cerrar la figura, deshacer y rehacer (Ctrl+Z / Ctrl+Y), limpiar todo con confirmación;
  - arranca en **Navigate**; en **Draw** el cursor es un lápiz.
- **Medidas:** `computeDistanceBetween` × 3,28084, redondeado al pie. `override_ft` por lado, que se conserva al mover vértices. Opción de pared existente. Mapa y panel sincronizados.
- **Puertas:** mismas opciones que el lienzo según el material:
  - aluminio: swing, sliding y cantilever;
  - chain link: swing, sliding, rolling y cantilever;
  - vinyl y metal: swing y sliding.

  Anchos estándar (4/5/6 y 8/10/12) o a medida, aviso de puerta especial y posición `t` que se arrastra sobre el lado.
- **Lista de materiales:** `mapToGraph` convierte el dibujo al formato del lienzo y lo envía a `POST /property-map/estimate`, que llama al **mismo** `HomeController@estimate`. Verificado: misma lista que la ruta GET del lienzo.
- **Guardar por enlace:** tabla `saved_projects` (anónima, proyecto cifrado, 90 días, `model:prune` diario). El enlace es `/property-map/p/{token}`.
- **Quote:**
  - `POST /property-map/snapshot` genera la imagen con Static Maps (key de servidor) y la pasa como `canvas_image`, así que llega a Odoo por la vía existente.
  - Al guardar el quote, la imagen se sube a S3 (`wfs-drawfence-quote-images`), se rellenan `quote_requests.map_data` y `sketch_image_path`, y el correo a ventas la adjunta.
- **Mientras el mapa está activo**, el lienzo p5 oculto se silencia y se pausa.

### 3.2 Visor 3D

- Botón **"View in 3D"**. three.js 0.169.0 y el visor se cargan bajo demanda (~137 KB comprimidos).
- **Cerca:** `fence3d/cerca.js`, copia del visor del sitio (`wfs-design-preview/src-3d`). Todos los materiales, estilos y colores. Sigue los lados y las puertas del mapa, con la cara buena hacia fuera.
- **Casa:** `house3d.js`, al estilo del sitio: estuco, zócalo, techo de teja a cuatro aguas, ventanas con contraventanas, puerta y arbustos.
  - Tamaño, giro y posición salen de la huella de **FEMA USA Structures** (`BuildingFootprints`, caché de 30 días), mediante el rectángulo orientado mínimo.
  - Sin huella: casa estándar de 48 × 34 ft dentro de una cerca cerrada; en cercas abiertas, solo la cerca.
- **Entorno:** césped, cielo y arboleda. **Sin satélite**: se descartó porque se veía estirado.
- **Escena:** figura de escala junto a la primera puerta; vistas Outside / From above / Close up; chips de color como vista previa.
- **Traducción de la configuración a estilos 3D** en `fence-catalog.js`. Aproximaciones conocidas:
  - aluminio "3 rail smooth" se muestra como Pool Code;
  - los diseños de vinyl (lattice, shadowbox, two tone) se muestran con su estilo base.

### 3.3 Demo estática

- **Fuente:** `resources/demo/` (`index.html`, `demo.js`, `footprints.js`, `demo.css`). Usa los mismos módulos del mapa y del 3D.
- **Diferencias con la app:** selector de cerca propio, casa consultada a FEMA desde el navegador, y sin materiales, enlace ni quote (se explican con un texto).
- **Compilar:** `npm run build:demo` (`vite.demo.config.js`) escribe en `../../wfs-design-preview/draw-my-fence-demo`. Usa **`GOOGLE_MAPS_DEMO_KEY`** y se niega a compilar con la key de la app.

## 4. Mapa de archivos

| Área | Archivos |
|---|---|
| Vista | `resources/views/partials/property_map.blade.php` (incluida en `simple_draw.blade.php` y `public/drawfence-embed/base.html`) |
| Front del mapa | `resources/js/property-map/`: `index.js`, `project.js`, `history.js`, `map-view.js`, `mode.js`, `search.js`, `drawing.js`, `panel.js`, `toolbar.js`, `actions.js`, `gates.js`, `map-to-graph.js`, `view-switch.js` |
| 3D | `resources/js/property-map/viewer3d.js`, `house3d.js`, `fence-catalog.js`, `fence3d/` (copia de `src-3d`: `cerca`, `piezas`, `texturas`, `persona`) |
| Estilos | `resources/css/property-map.css` |
| Backend | `app/Http/Controllers/PropertyMapController.php`, `app/Services/PropertyMapImage.php`, `PropertyMapQuote.php`, `BuildingFootprints.php`, `app/Models/SavedProject.php` |
| Integración en el quote | `QuoteRequestController` (store y storeUser), `app/Mail/QuoteRequestReceived.php`, `resources/views/emails/quote_request_received.blade.php` |
| Base de datos | `2026_10_28_000001_create_saved_projects_table`, `2026_10_29_000001_add_property_map_fields_to_quote_requests_table` |
| Rutas | `routes/web.php`, prefijo `property-map`: estimate, snapshot, scene, projects, p/{token} |
| Config | `config/services.php` (`google_maps`), `config/filesystems.php` (disco `quote_images`), `.env.example` |

## 5. Configuración externa

- **Google Cloud** (proyecto "Draw My Fence", cuenta de WFS):
  - APIs: Maps JavaScript, Places (New), Geocoding y Maps Static. Alerta de presupuesto de 20 USD.
  - **La cuenta está en Free Trial hasta el 26 ene 2027.** WFS debe hacer Upgrade antes, o Maps deja de funcionar.

  | Key | Restricción | Variable |
  |---|---|---|
  | `drawfence-browser` (rotada el 30 oct tras filtrarse) | Websites: `localhost:8080`, `app.westernfencesupply.com` | `GOOGLE_MAPS_BROWSER_KEY` |
  | `drawfence-server` | IP del servidor, solo Static Maps | `GOOGLE_MAPS_SERVER_KEY` |
  | `drawfence-demo` | Solo `https://crpozo.github.io/wfs-design-preview/*`; Maps JS, Places y Geocoding | `GOOGLE_MAPS_DEMO_KEY` (solo para compilar la demo) |
  | Map ID `drawfence-satellite` (raster) | No es secreto | `GOOGLE_MAPS_MAP_ID` |
  | URL signing secret de Static Maps | Opcional | `GOOGLE_MAPS_SIGNING_SECRET` |

- **AWS:** bucket privado `wfs-drawfence-quote-images` y política inline `drawfence-quote-images` (Put, Get, List) en el rol de la EC2, creada por WFS. Verificado. Retención de imágenes por definir.
- **Paquetes nuevos:** `league/flysystem-aws-s3-v3` (composer); `@googlemaps/js-api-loader` y `three` (npm).

## 6. Desarrollo local

- **Arranque:** Docker Desktop, luego `docker start wfs-pg` (PostgreSQL de pruebas en el puerto 5433) y `docker compose up -d` en `www/`. La app queda en `http://localhost:8080`.
  - El proyecto `paymerch` también usa el 8080: detenerlo antes.
  - La key de navegador solo admite `localhost:8080`.
- **El `.env` local es una copia del de producción** (Odoo real y relay de correo), con la base apuntando a `host.docker.internal:5433`. **No enviar quotes desde local:** crearían un presupuesto real en Odoo y mandarían un correo a ventas.
- **Base local:** se creó el rol `drawfence_app` y se cambió el dueño de `quote_requests`, solo en la base local. Hay dos migraciones antiguas sin aplicar en local (las de julio y septiembre de 2026); no tocarlas.
- **Entrar al paso de dibujo:** por `/embed/drawfence/customizable?materials={...}` (fija los materiales en la sesión) y después `/drawfence`.
- **Build:** `npm run build` para la app; `npm run build:demo` para la demo.

## 7. Pendientes

### Feature 1 (mapa)
- [ ] Pasar el checklist de pruebas en local (mapa, medidas, puertas, materiales, enlace, quote hasta el formulario, 3D).
- [ ] Probar en Safari iOS, Chrome Android, Chrome y Edge de escritorio.
- [ ] **Logging de uso** (requerimiento 10): dirección buscada, número de vértices, lados con override, tiempo en el paso, mapa o lienzo.
- [ ] Confirmar que la key `drawfence-server` está restringida a la IP del servidor: en una prueba respondió desde la PC local.
- [ ] Topes diarios (Quotas) en la key de la demo y revisar los de la app.
- [ ] Cerrar las alertas de GitHub: la key vieja de la app como "Revoked"; la de la demo como "Won't fix" (key de navegador, pública por diseño).
- [ ] Retención de las imágenes en S3 (regla de ciclo de vida del bucket).
- [ ] Revisar los términos de Google sobre archivar la imagen satelital (se aceptó para pruebas).

### Despliegue a producción (cuando WFS apruebe)
- [ ] Fusionar `feature/property-map-drawing` en `main`, hacer `git push server main` y ejecutar `drawfence-deploy`.
- [ ] **El deploy no corre migraciones.** Antes:
  - revisar en producción quién es el dueño de `quote_requests`;
  - ver qué migraciones están pendientes;
  - ejecutar `php artisan migrate --force`.
- [ ] Variables en el `.env` del servidor: `GOOGLE_MAPS_BROWSER_KEY`, `GOOGLE_MAPS_SERVER_KEY`, `GOOGLE_MAPS_MAP_ID`, `QUOTE_IMAGES_BUCKET` y, si se usa, `GOOGLE_MAPS_SIGNING_SECRET`.
- [ ] Añadir swap a la EC2 (2 GB de RAM; el build compila three.js).
- [ ] Comprobar `which glpsol` en el servidor y cambiar `/tmp/panels.mod` por un archivo temporal único.
- [ ] Invalidar CloudFront en `/js/*` y `/css/*` si se tocan los `s_*.js`. Lo de la Fase 2 va en `/build/`, con hash.
- [ ] Probar en el servidor la subida a S3 con el rol de la EC2.

### 3D: mejoras de render (siguiente trabajo)
- [ ] Más fidelidad de la casa:
  - variantes con ala de garaje adelantada y pórtico (como `src-3d/casa.js`);
  - colores de estuco y teja;
  - casas de dos pisos cuando la altura de FEMA lo indique.
- [ ] Techo para huellas en L o irregulares; hoy se usa el rectángulo orientado.
- [ ] Entorno:
  - entrada de coches hasta la puerta más ancha;
  - camino a la puerta principal;
  - algunas palmeras o árboles fuera del trazado.
- [ ] Revisar la orientación de la fachada. Hoy mira hacia la puerta más ancha, o al sur si no hay puertas.
- [ ] Calidad visual: sombras, exposición y antialiasing en móvil. Revisar el rendimiento en teléfonos de gama media.
- [ ] Validar con WFS cada estilo de cerca frente a sus fotos, incluidas las aproximaciones del catálogo (sección 3.2).
- [ ] Mantener `fence3d/` sincronizado con `wfs-design-preview/src-3d` si cambia el visor del sitio.

### Otras funcionalidades de la Fase 2
- [ ] **Feature 3, propuesta automática sin IA:**
  - polígono del lote desde el GIS de Lee y Charlotte;
  - huella de la casa (ya disponible);
  - reglas para patio trasero, perímetro y un lado, con Turf.js;
  - toque del cliente para marcar la entrada de coches.

  Avisar a WFS de que va sin IA.
- [ ] **Feature 4, lienzo clásico:** deshacer y rehacer, zoom y desplazamiento, barra de herramientas en HTML, edición de tramo y ayuda de primer uso.
- [ ] Decidir con WFS: Upgrade de Google Cloud, retención en S3, términos de Google y preguntas abiertas del documento de features.

## 8. Documentos relacionados (fuera de este repo)

En la carpeta del proyecto (`Migración AWS - Draw my Fence - WFS/`):
- `docs/FEATURES_FASE_2_DRAW_MY_FENCE.md`: qué se construye.
- `docs/HERRAMIENTAS_FASE_2_DRAW_MY_FENCE.md`: cómo, y dudas abiertas.
- `docs/ESTADO_MIGRACION.md`: estado de la migración.
- `deploy/DESPLIEGUE_Y_CORTE.md`: cómo desplegar.
