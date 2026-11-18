# Property map: medidas, puertas e imágenes — informe de la corrección

Noviembre de 2026 · rama `claude/vibrant-franklin-l1ioj8`

## Resumen

El cliente reportó que las medidas se amontonaban, se alejaban de sus lados, caían sobre
propiedades vecinas y no se sabía a qué lado pertenecían, y que las etiquetas de las
puertas ocupaban demasiado. La auditoría confirmó que no era un mal uso: el mapa no tenía
ningún manejo de colisiones y la imagen del quote alejaba las etiquetas sin límite útil.

Ahora el mapa, la imagen del quote y el plano técnico colocan sus etiquetas con un mismo
motor. La aplicación se ve igual que antes (mismas etiquetas, colores, tipografía, barra
de herramientas y panel); cambia dónde se colocan las etiquetas y cómo se encuadra la
imagen.

| Medido en los mismos dibujos, zoom y pantalla | Antes | Ahora |
|---|---|---|
| Pares de etiquetas superpuestas en el mapa (15 vistas, escritorio) | 109 | 0 |
| Esquinas tapadas por una etiqueta (15 vistas) | 46 | 0 |
| Distancia máxima de una etiqueta a su lado en la imagen del quote | 145 px (63 ft) | 48 px, con conector |
| Etiquetas alejadas de su lado sin conector | todas las desplazadas | ninguna |
| Parte de la foto que ocupa una cerca de 60 × 80 ft | 29 % | 72 % |
| Desfase entre las líneas y sus esquinas en la foto | hasta ~5 px | 0 (mismo dibujo, misma proyección) |

Los mismos números salen en tamaño de teléfono. Los datos por vista están en
`evidence/overlap-metrics-desktop.json` y `evidence/overlap-metrics-phone.json`.

**Importante:** todo lo anterior está probado en Chromium con la aplicación real, pero con
un sustituto de Google Maps y con fotos generadas, porque este entorno no tiene llaves de
Google. Lo que falta comprobar con Google real está en
[Lo que no se pudo verificar](#lo-que-no-se-pudo-verificar).

## Qué se corrigió y por qué pasaba

| Problema | Causa | Corrección |
|---|---|---|
| Etiquetas superpuestas en el mapa | `drawing.js` ponía cada medida en el punto medio y cada puerta sobre su puerta, sin revisar nada | El mapa usa el motor `label-layout.js` |
| La puerta nueva tapaba la medida de su lado | La puerta nace en la mitad del lado, igual que la medida | La puerta no se mueve; su etiqueta va al costado |
| Medidas lejos de su lado | `besideSide()` alejaba en pasos del ancho de la etiqueta, hasta 3 veces | Distancia máxima fija de 48 px, sin relación con el ancho |
| Medidas sobre propiedades vecinas | Lo anterior, más una foto donde la cerca ocupaba un cuarto | Se prefiere el lado interior del dibujo y la foto se encuadra en la cerca |
| No se sabe a qué lado pertenece una medida | Sin conector para las medidas, sin revisar los otros lados | Conector en cuanto la etiqueta no toca su lado; nunca queda más cerca de otro lado |
| Etiquetas sobre esquinas, puertas y otros lados | Solo se comparaba etiqueta contra etiqueta | Esquinas, aberturas de puerta, lados y conectores son obstáculos |
| Conectores sobre etiquetas | Se dibujaban en el mismo recorrido que las etiquetas | Se dibujan todos antes y no pueden cruzar una etiqueta ni otro lado |
| Etiquetas de puerta demasiado grandes | Texto completo siempre | Si no hay sitio: `G1 · 4 ft`, luego `G1`; el nombre aparece en el panel |
| Sin identificadores | "Side N" solo existía en el panel | Lados 1, 2, 3… y puertas G1, G2… en el panel. En el dibujo solo aparecen como referencia cuando una etiqueta no cabe, junto con una leyenda en las imágenes |
| Las etiquetas no se reorganizaban con el zoom | No había nada que lo hiciera | Se recolocan al cambiar el dibujo o el zoom (una vez por cuadro); al desplazar no |
| Líneas desfasadas de sus esquinas en la foto | Google redondea los `path` a 1e-5° (~3,6 ft) | La foto se pide sin dibujo; todo se dibuja en el navegador |
| Encuadre pobre | Foto fija de 640 × 640 a zoom entero con tope 20 | Imagen del tamaño y forma de la cerca, que ocupa ~72 % |
| `drawFallbackImage()` limitado | Texto sin fondo, desplazamientos fijos, sin colisiones | Sustituido por el plano técnico, con el mismo motor |
| Dos renderizadores distintos | Código separado con reglas distintas | Proyección, textos, colores y colocación compartidos |
| Sin pruebas de renderizado | Solo existía el workflow de despliegue | Vitest, Playwright, PHPUnit y un workflow de validación |

## Lo que cambia para el cliente

- **Mapa:** las mismas etiquetas, bien colocadas. Nuevo selector **Satellite / Plan** en la
  esquina superior izquierda del mapa. Bajo el mapa, **Download image: Satellite · Plan ·
  Both**. En el panel, cada puerta muestra su nombre corto (G1, G2…).
- **Imagen del quote:** sigue siendo la foto satelital, ahora encuadrada en la cerca. Si
  Google no entrega la foto, se envía el plano técnico.
- **Plano técnico:** el mismo dibujo y las mismas etiquetas sobre blanco, a escala y con
  barra de escala.
- **Etiquetas de medidas:** muestran solo la longitud (`39 ft`), nunca el número del lado,
  en Satellite, en Plan y en las imágenes. El número solo sustituye a una etiqueta que no
  cabe; en ese caso la imagen lleva una leyenda. Las puertas conservan `Gate · 4 ft`.

No cambia nada en el proyecto guardado, los cálculos de materiales, los precios, la base
de datos ni la vista 3D.

## Decisiones

- **Un motor puro.** `label-layout.js` solo recibe geometría en píxeles; no conoce el DOM
  ni Google. Por eso se prueba sin navegador y lo usan los tres renderizadores.
- **Estrategia progresiva.** Posición original (sobre el lado) → deslizada sobre el lado →
  al costado tocándolo → al costado con conector → forma corta → número de referencia →
  leyenda. Si una etiqueta se queda sin sitio, se reintenta todo el dibujo con los lados
  cortos primero y con etiquetas de puerta más cortas, y gana el intento que muestra más.
- **Estabilidad.** El mismo dibujo da siempre el mismo resultado. En el mapa una etiqueta
  conserva su sitio anterior si sigue siendo casi tan bueno, para que no salte al hacer zoom.
- **La geometría del cliente no se toca.** Se mueven etiquetas, nunca puertas ni esquinas.
- **Foto sin dibujo y sin recortes.** El servidor pide a Google una imagen más pequeña y
  con la forma de la cerca; el navegador la escala entera y de forma uniforme, así que el
  logo y la atribución de Google quedan en la imagen y las etiquetas no los tapan.
- **Plan como capa blanca.** En el mapa, Plan es una capa de teselas blancas sobre la
  imagen; todo lo demás (edición, puertas, etiquetas) es el mismo código.
- **Aberturas de puerta a escala del terreno.** Si el cliente escribió otra longitud para
  el lado, la abertura dibujada sigue correspondiendo a la foto; el quote usa la escrita.
- **Sin costo extra de Google.** La foto se pide una vez por estimación, se use para el
  quote, para una descarga o para ambas. El plano no pide nada.

## Archivos

Nuevos en `resources/js/property-map/`: `label-layout.js` (motor), `geometry.js`
(proyección), `labels.js` (textos e identificadores), `theme.js` (colores),
`plan-view.js` (fondo Plan).

Modificados: `drawing.js`, `quote-image.js` (reescrito), `actions.js`, `index.js`,
`toolbar.js`, `panel.js`, `property-map.css`, `partials/property_map.blade.php`,
`PropertyMapImage.php`, `PropertyMapController.php`, `config/services.php`,
`.env.example`, `package.json`.

Pruebas y CI: `tests/js/`, `tests/browser/`, `tests/fixtures/`,
`tests/Unit/PropertyMapImageTest.php`, `tests/Feature/PropertyMapSnapshotTest.php`,
`vitest.config.js`, `playwright.config.js`, `.github/workflows/tests.yml`.

Variable nueva y opcional: `GOOGLE_MAPS_STATIC_MAX_ZOOM` (20 por defecto).

## Pruebas

| Suite | Qué cubre | Resultado |
|---|---|---|
| Vitest (`npm test`) | Motor en 10 dibujos × 4 zooms, 150 dibujos aleatorios con semilla × 5 zooms, proyección, textos, grafo de materiales | 214 de 214 |
| PHPUnit (`--filter PropertyMap`) | Encuadre de la foto en los 10 dibujos, URL sin `path`, firma, ruta snapshot con Google simulado | 29 de 29 |
| Playwright (`npm run test:browser`) | Página real en Chromium, escritorio (1366 × 900) y teléfono (Pixel 7): invariantes leídos del DOM, zoom, desplazamiento, arrastre de esquinas, Plan, imágenes, descargas, flujo del quote, fugas | 93 de 93; 5 omitidas (el arrastre con ratón en teléfono y las 4 que solo generan capturas) |
| Build (`npm run build`) | | correcto |

Los invariantes son los mismos en las tres capas (`tests/js/support/invariants.js`): sin
superposiciones, distancia acotada, conector cuando hace falta, conector que nace en su
lado y no cruza etiquetas ni otros lados, esquinas y puertas libres, etiqueta más cerca de
su lado que de cualquier otro, y dentro de la imagen.

La suite completa de PHPUnit tiene 3 fallos que ya existían antes de este trabajo y no
tienen relación con él (iframe embebido y enlaces del correo). No se tocaron.

El repositorio no tiene linter de JavaScript configurado. Los archivos PHP nuevos pasan
Pint; `PropertyMapImage.php` ya no lo pasaba antes y no se reformateó.

### Qué es simulado

- **Google Maps JavaScript API:** `tests/browser/support/fake-google.js` implementa lo que
  la app usa (mapa, líneas, marcadores, capas, geometría) con la misma proyección.
- **Foto de Static Maps:** imagen generada del tamaño que el servidor pediría, con un logo
  y una atribución de prueba donde Google los pone.
- **Cálculo de materiales** (`POST /property-map/estimate`): necesita la base de datos del
  catálogo, que no existe aquí. Se comprueba lo que el mapa le envía, no su respuesta.
- **Librerías de CDN** (jQuery, Bootstrap, SweetAlert, p5): este entorno las bloquea; se
  sirvieron las mismas versiones desde npm. En GitHub Actions se cargan de su CDN.

## Lo que no se pudo verificar

Hay que revisarlo en staging, con las llaves reales, antes de producción:

1. **Fondo Plan en el mapa real.** Usa `overlayMapTypes`. Según la documentación de Google
   esas capas van sobre el mapa base y bajo líneas y marcadores, pero no se probó con el
   mapa vectorial real (`mapId`). Si las líneas quedaran bajo la capa blanca, el Plan del
   mapa no serviría; el plano técnico exportado no depende de esto.
2. **Atribución en fotos pequeñas.** Se piden imágenes desde 200 × 200 (antes siempre
   640 × 640). Hay que ver que el logo y la atribución de Google salen completos y que la
   zona reservada (franja inferior de 18 px y logo de 76 × 30 px) los cubre.
3. **Nitidez.** Una cerca pequeña se amplía hasta 3,2 veces; la foto se verá más suave que
   antes. Con `GOOGLE_MAPS_STATIC_MAX_ZOOM=21` mejora, pero solo donde Google tenga
   imágenes a ese zoom: probar direcciones reales antes de cambiarlo.
4. **Zoom fraccionado y gestos** en el mapa real (pellizco en teléfono): el motor admite
   zoom fraccionado, pero solo se probó con pasos enteros y cuartos.
5. **Flujo completo del quote** hasta Odoo, S3 y el correo con la imagen nueva. La imagen
   ya no es siempre cuadrada (por ejemplo 1280 × 1632).
6. **Rendimiento en teléfonos reales** con dibujos grandes.
7. **La captura de referencia del cliente** no estaba en la sesión; la referencia visual
   fue el CSS y el comportamiento actuales de la aplicación.

## Límites conocidos

- Con el dibujo muy pequeño en pantalla (zoom 18, o varios lados de 5 ft seguidos) algunas
  etiquetas no caben ni como número. No se muestran en el mapa hasta acercar; siguen en el
  panel. En las 15 vistas comparadas quedan 109 de 115 etiquetas visibles (antes las 115,
  superpuestas). En las imágenes exportadas de los 10 dibujos se muestran todas completas.
- Una cerca de menos de unos 45 ft ocupa menos del 65 % de la foto (57 % en el caso de
  50 × 40 ft), por el tamaño mínimo de imagen.
- "Download image: Satellite" y "Both" requieren la lista de materiales al día, igual que
  el quote: la foto se genera para ese dibujo. "Plan" está siempre disponible.
- Observado, no modificado: mover el mapa después de pedir materiales marca la lista como
  desactualizada, porque el centro y el zoom forman parte del proyecto guardado.
- El modelo de varias cercas independientes sigue pendiente, como se acordó.

## Estado

Listo para revisión en staging. No recomendado para producción hasta completar los puntos
1, 2 y 5 de la lista anterior con Google real.

## Evidencias

- `evidence/before-after/`: el mismo dibujo, zoom y pantalla antes y después.
  - `map-desktop-*`, `map-phone-*`: mapa interactivo.
  - `quote-image-*`: imagen del quote.
  - `page-desktop.jpg`, `page-phone.jpg`: el paso completo.
- `evidence/new-views/`: Plan en el mapa, plano técnico exportado, imagen satelital e
  imagen combinada.

Para regenerarlas: `WFS_EVIDENCE_DIR=<carpeta> npx playwright test evidence images`.
