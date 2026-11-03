/* Geometria de la cerca, generada a partir de lo que eligio el usuario.
 *
 * No hay modelos descargados: cada perfil se construye con sus medidas reales
 * (poste de 2", rail de 1", picket de 3/4" con 3,9" de luz) para que lo que se
 * ve en la casa sea la cerca que se va a pedir, no una aproximacion decorativa.
 * Las cotas salen de las fichas tecnicas de assets/specs.
 */
import { MeshStandardMaterial, DoubleSide, Color } from 'three';
import { Ensamblador } from './piezas.js';
import * as T from './texturas.js';

var PUL = 1 / 12;   // una pulgada, en pies

/* Anchura de vano por material: es el panel que se fabrica, no una eleccion
   estetica. Cambiarla mueve los postes de sitio y deja de parecerse al
   producto real. */
var VANO = { aluminum: 6, 'chain-link': 10, vinyl: 8, metal: 6, ecfence: 8 };

/* ── base local del tramo ──────────────────────────────────────────────────
   u avanza a lo largo del tramo, v cruza. Una caja girada rotY sobre Y lleva
   su +X local a (cos, 0, -sin), de ahi el atan2(-dz, dx). */
function marco(a, b) {
  var dx = b[0] - a[0], dz = b[1] - a[1];
  var largo = Math.hypot(dx, dz);
  dx /= largo; dz /= largo;
  var rotY = Math.atan2(-dz, dx);
  return {
    largo: largo, rotY: rotY,
    p: function (u, y, v) {
      v = v || 0;
      return [a[0] + dx * u - dz * v, y, a[1] + dz * u + dx * v];
    }
  };
}

/* ── materiales ───────────────────────────────────────────────────────────── */

function metalico(hex, rug, met) {
  return new MeshStandardMaterial({ color: new Color(hex), roughness: rug, metalness: met });
}

/**
 * El bastidor del porton, cuando no es del mismo material que el panel.
 *
 * Muchos portones de la casa son panel de vinilo dentro de un marco de acero o
 * aluminio de otro color: eso es lo que se ve en las fotos de la pagina. Con un
 * solo material salia todo blanco y no se parecia a la foto que el cliente
 * acaba de pulsar.
 */
function conMarco(m, marcoHex) {
  /* Sin marco explicito, el bastidor de la hoja va del MISMO material que las
     tablas. Antes iba del metal de la estructura, y con negro daba igual (todo
     negro) pero con woodgrain o bronce el marco oscuro resaltaba como un cajon
     alrededor de la hoja y el porton parecia otro producto. */
  m.marcoExplicito = !!marcoHex;
  m.marco = marcoHex ? metalico(marcoHex, 0.42, 0.4) : (m.tabla || m.estructura);
  return m;
}

/**
 * Los materiales de la cerca segun material y color elegidos.
 *
 * El aluminio de una cerca va con pintura en polvo, no pulido: darle
 * metalness alto lo convierte en cromo y deja de parecer lo que es.
 */
export function materiales(mat, estilo, colorHex, ancho, altoMalla, marcoHex) {
  var m = {};
  if (mat === 'chain-link') {
    var acabados = {
      'Galvanized':       { hilo: '#b9bec4', poste: '#b0b6bc', calibre: 5,   met: 0.85, rug: 0.38 },
      'Black PVC-coated': { hilo: '#232323', poste: '#2a2a2a', calibre: 6,   met: 0.25, rug: 0.6 },
      'Green PVC-coated': { hilo: '#2f5233', poste: '#33563a', calibre: 6,   met: 0.25, rug: 0.6 },
      'Heavy Gauge':      { hilo: '#a7adb4', poste: '#9aa1a8', calibre: 7.5, met: 0.85, rug: 0.34 }
    };
    var a = acabados[estilo] || acabados.Galvanized;
    m.estructura = metalico(a.poste, a.rug, a.met);
    /* Un material de malla por cada ancho de vano.
       La repeticion de la textura es del material, pero el plano se escala por
       instancia: con un solo material, un tramo corto o una hoja de porton
       metian los mismos rombos en menos ancho y el rombo salia el doble de
       fino que en la cerca de al lado. El rombo mide unas 2": el mosaico trae
       4, o sea 8" de lado. */
    var cache = {};
    m.malla = function (anchoVano, altoVano) {
      var k = anchoVano.toFixed(2) + 'x' + altoVano.toFixed(2);
      if (cache[k]) { return cache[k]; }
      var tex = T.malla(a.calibre).clone();
      tex.needsUpdate = true;
      tex.repeat.set(Math.max(1, anchoVano / (8 * PUL)), Math.max(1, altoVano / (8 * PUL)));
      /* alphaTest bajo + mezcla: con el umbral alto de antes, al alejarse los
         mipmaps promedian el alambre (~15% de cobertura) por debajo del corte
         y la malla desaparecia entera: la cerca de chain link no se veia en la
         vista de la casa. Asi, de cerca el rombo sale nitido y de lejos queda
         el velo semitransparente que es exactamente como se ve una malla real
         a esa distancia. */
      cache[k] = new MeshStandardMaterial({
        color: new Color(a.hilo), roughness: a.rug, metalness: a.met,
        alphaMap: tex, transparent: true, alphaTest: 0.06, side: DoubleSide
      });
      return cache[k];
    };
    return conMarco(m, marcoHex);
  }
  if (mat === 'vinyl') {
    m.estructura = new MeshStandardMaterial({ color: new Color(colorHex || '#f2f2ee'), roughness: 0.72, metalness: 0 });
    m.tabla = m.estructura;
    return conMarco(m, marcoHex);
  }
  if (mat === 'metal') {
    if (colorHex === '#7a5c3e') {   // woodgrain
      m.tabla = new MeshStandardMaterial({ map: T.veta(), roughness: 0.62, metalness: 0.12 });
      m.tablaFondo = new MeshStandardMaterial({ map: T.veta(), color: new Color('#b9b9b9'), roughness: 0.7, metalness: 0.12 });
      m.estructura = metalico('#6b5136', 0.6, 0.15);
    } else {
      /* Chapa pintada: satinada, poco metalica. El color se aclara un 80%
         porque, medido contra la foto del perfil, el bronce salia a la mitad
         de brillo (#281b0c frente a #4d3b2c; con +45% se quedo en #372613): la cara vertical recibe el sol
         de lado y el tone mapping se come los medios tonos. El negro sigue
         negro y el blanco satura, que es lo que toca. */
      var base = new Color(colorHex || '#1c1c1c').multiplyScalar(1.8);
      /* El negro pintado no es un agujero: bajo el sol se lee gris muy
         oscuro con brillo. Un suelo de luminancia para los colores casi
         negros, que si no "parece que no tiene luz". */
      if (base.r * 0.3 + base.g * 0.59 + base.b * 0.11 < 0.06) { base.setRGB(0.085, 0.085, 0.085); }
      m.tabla = new MeshStandardMaterial({ color: base, roughness: 0.38, metalness: 0.12 });
      /* Los planos entre nervios, un poco mas oscuros: es lo que hace leer el
         relieve de frente, cuando los lados del nervio apenas se ven. */
      m.tablaFondo = new MeshStandardMaterial({ color: base.clone().multiplyScalar(0.8), roughness: 0.5, metalness: 0.12 });
      m.estructura = m.tabla;
    }
    return conMarco(m, marcoHex);
  }
  if (mat === 'ecfence') {
    /* Dos acabados, blanco y "bronce", que en su foto ES NEGRO (el cliente:
       "bronze y matching gates son del mismo color pero son negros"). Lo que
       no puede es comerse la luz: mismo suelo de luminancia y satinado que el
       negro del metal, para que se lea como chapa negra al sol y no como un
       agujero. */
    if (estilo === 'White') {
      m.estructura = metalico('#eceae4', 0.55, 0.12);
    } else {
      m.estructura = new MeshStandardMaterial({ color: new Color().setRGB(0.085, 0.085, 0.085), roughness: 0.38, metalness: 0.12 });
    }
    m.tabla = m.estructura;
    return m;
  }
  /* aluminio: pintura en polvo */
  m.estructura = metalico(colorHex || '#1c1c1c', 0.55, 0.18);
  m.tabla = m.estructura;
  return conMarco(m, marcoHex);
}

/* ── vanos por material ────────────────────────────────────────────────────
   Cada uno recibe el marco del tramo, el inicio del vano en u, y rellena.
   El eje v==0 es el plano de la cerca. */

/** Aluminio ornamental y sus 7 perfiles. */
function vanoAluminio(e, m, est, mk, u0, ancho, alto) {
  var rail = 1 * PUL, pk = 0.75 * PUL;
  var rotY = mk.rotY;
  var yTop = alto - 1.5 * PUL;                 // eje del rail superior
  var pitch = est.indexOf('3" Spacing') !== -1 ? 3.75 * PUL : 4.65 * PUL;
  if (est === 'Pool Code') { pitch = 4.65 * PUL; }

  /* Donde va cada riel, MEDIDO en la foto de su perfil (fraccion de la altura,
     0 = base). Antes iban a ojo y el resultado no era la cerca elegida: el
     intermedio del 3-Rail estaba a 0,42 cuando la foto lo tiene a 0,81, Pool
     Code se quedaba sin riel inferior y Spear Top sin su doble riel de arriba. */
  var RIELES = {
    '2-Rail Smooth Bottom':      [0.96, 0.05],
    '2-Rail Smooth, 3" Spacing': [0.96, 0.05],
    '3-Rail Rake Bottom':        [0.95, 0.81, 0.08],
    '3-Rail Puppy Picket':       [0.92, 0.36, 0.07],
    'Pool Code':                 [0.97, 0.88, 0.06],
    'Spear Top':                 [0.86, 0.77, 0.10],
    '4-Rail Custom':             [0.86, 0.77, 0.16, 0.07]
  };
  var rails = (RIELES[est] || [0.96, 0.05]).map(function (f) { return f * alto; });
  yTop = rails[0];

  for (var i = 0; i < rails.length; i++) {
    var c = mk.p(u0 + ancho / 2, rails[i], 0);
    e.caja(m.estructura, 'rail', c, [ancho, rail, rail], rotY);
  }

  /* Donde empieza y acaba el picket. El rake bottom es justo eso: el barrote
     sobresale por debajo del rail inferior. */
  var abajo = rails[rails.length - 1] - rail / 2;
  var arriba = yTop + rail / 2;
  if (est === '3-Rail Rake Bottom') { abajo -= 3 * PUL; }
  if (est === 'Pool Code') { abajo = 2 * PUL; }
  /* En spear top los rieles quedan mas abajo porque encima van las puntas:
     el picket sigue hasta casi la cima y la punta remata por encima. */
  /* 4-Rail Custom tambien lleva puntas: su foto es un spear top con doble
     riel arriba y doble riel abajo. */
  var conPunta = est === 'Spear Top' || est === '4-Rail Custom';
  if (conPunta) { arriba = alto - 1 * PUL; }

  var n = Math.max(2, Math.round((ancho - pk) / pitch));
  var paso = (ancho - pk) / n;
  for (var j = 0; j <= n; j++) {
    var u = u0 + pk / 2 + j * paso;
    var h = arriba - abajo;
    e.caja(m.estructura, 'picket', mk.p(u, abajo + h / 2, 0), [pk, h, pk], rotY);
    if (conPunta) {
      e.pieza('cono', m.estructura, 'punta', mk.p(u, arriba + 2.2 * PUL, 0), [1.6 * PUL, 4.4 * PUL, 1.6 * PUL], rotY);
    }
  }

  /* Puppy picket: barrotes extra abajo, a media separacion, para que no pase
     un perro pequeño. */
  if (est === '3-Rail Puppy Picket') {
    var yA = rails[2] + rail / 2, yB = rails[1] - rail / 2;
    for (var k = 0; k < n; k++) {
      var uu = u0 + pk / 2 + (k + 0.5) * paso;
      e.caja(m.estructura, 'picket', mk.p(uu, (yA + yB) / 2, 0), [pk, yB - yA, pk], rotY);
    }
  }
}

/** Chain link: postes redondos, rail superior y malla recortada. */
function vanoChainLink(e, m, est, mk, u0, ancho, alto) {
  var rotY = mk.rotY;
  var yMalla = 2 * PUL, hMalla = alto - yMalla - 1.5 * PUL;
  var mat = m.malla(ancho, hMalla);
  e.plano(mat, 'malla' + ancho.toFixed(2), mk.p(u0 + ancho / 2, yMalla + hMalla / 2, 0),
          [ancho, hMalla, 1], rotY);
  e.tuboH(m.estructura, 'railsup', mk.p(u0 + ancho / 2, alto - 1 * PUL, 0), 1.375 * PUL, ancho, rotY);
  /* Alambre de tension abajo: sin el, la malla flota. */
  e.tuboH(m.estructura, 'tension', mk.p(u0 + ancho / 2, yMalla, 0), 0.4 * PUL, ancho, rotY);
}

/** Vinilo: privacidad, semiprivacidad, picket y ranch rail. */
function vanoVinilo(e, m, est, mk, u0, ancho, alto) {
  var rotY = mk.rotY;
  /* Medidas de las fotos de perfil: el riel superior REMATA las tablas (nada
     asoma por encima) y los rieles quedan casi a ras de las tablas, que van
     dentro del bolsillo del riel. La version anterior dejaba los rieles muy
     salidos y en semi-privacidad inventaba un zocalo solido con lamas encima:
     el cliente lo vio como "rieles por fuera y bordes off". */
  var railH = 3.5 * PUL, railG = 1.3 * PUL, tablaG = 1.0 * PUL;

  if (est === 'Ranch Rail') {
    /* Tres rieles siempre, como la foto: con dos a cuatro pies faltaba
       "la mitad de la valla". */
    var n = 3;
    for (var i = 0; i < n; i++) {
      var y = alto - 4 * PUL - i * (alto - 10 * PUL) / Math.max(1, n - 1);
      e.caja(m.estructura, 'ranch', mk.p(u0 + ancho / 2, y, 0), [ancho, 5.5 * PUL, 1.5 * PUL], rotY);
    }
    return;
  }

  var yInf = 2 * PUL + railH / 2;
  var ySup = alto - railH / 2;                 // riel superior a ras de la cima
  var yA = yInf + railH / 2, yB = ySup - railH / 2;

  if (est === 'Picket') {
    /* Picket: tablas de 1,5" con 3" de luz, montadas POR DELANTE de los
       rieles y con punta por encima del riel superior, como en la foto. */
    e.caja(m.estructura, 'rail', mk.p(u0 + ancho / 2, yInf, -0.7 * PUL), [ancho, railH, railG], rotY);
    e.caja(m.estructura, 'rail', mk.p(u0 + ancho / 2, ySup - 4 * PUL, -0.7 * PUL), [ancho, railH, railG], rotY);
    var pitch = 4.5 * PUL, tabla = 1.5 * PUL;
    var np = Math.max(2, Math.round((ancho - tabla) / pitch));
    var paso = (ancho - tabla) / np;
    for (var j = 0; j <= np; j++) {
      var u = u0 + tabla / 2 + j * paso;
      var alt = alto - 1 * PUL - 2 * PUL;
      e.caja(m.estructura, 'picket', mk.p(u, 1 * PUL + alt / 2, 0.2 * PUL), [tabla, alt, tablaG], rotY);
      e.pieza('cono', m.estructura, 'punta', mk.p(u, 1 * PUL + alt + 1 * PUL, 0.2 * PUL), [tabla, 2 * PUL, tablaG], rotY);
    }
    return;
  }

  /* Rieles superior e inferior, con las tablas dentro. */
  e.caja(m.estructura, 'rail', mk.p(u0 + ancho / 2, yInf, 0), [ancho, railH, railG], rotY);
  e.caja(m.estructura, 'rail', mk.p(u0 + ancho / 2, ySup, 0), [ancho, railH, railG], rotY);

  if (est === 'Semi-Privacy') {
    /* Tablas de 6" separadas 2", a toda altura entre los dos rieles. */
    var pitchS = 8 * PUL, tabS = 6 * PUL;
    var ns = Math.max(2, Math.round((ancho - tabS) / pitchS));
    var pasoS = (ancho - tabS) / ns;
    for (var q = 0; q <= ns; q++) {
      e.caja(m.estructura, 'tabla', mk.p(u0 + tabS / 2 + q * pasoS, (yA + yB) / 2, 0), [tabS, yB - yA, tablaG], rotY);
    }
    return;
  }

  /* Privacidad: tablas de 6" machihembradas, una a una, porque el ritmo de
     la junta es lo que hace que se lea como vinilo y no como pared lisa. */
  var ancT = 6 * PUL;
  var nt = Math.max(1, Math.round(ancho / ancT));
  var pasoT = ancho / nt;
  for (var k = 0; k < nt; k++) {
    e.caja(m.estructura, 'tabla', mk.p(u0 + pasoT / 2 + k * pasoT, (yA + yB) / 2, 0), [pasoT - 0.03 * PUL, yB - yA, tablaG], rotY);
  }
}

/** DuraFence: tablas horizontales de aluminio. */
/** DuraFence: chapa de acero CORRUGADA VERTICAL con remate redondeado.
 *  Antes se dibujaba como tablas horizontales anchas y no se parecia en nada a
 *  la foto del perfil. Las medidas salen de contar ondas en las fotos sobre
 *  un panel de 8 pies: Modern ~13 ondas anchas, Original ~15 nervios finos
 *  con planos anchos, P1 ~17 intermedios. */
function vanoMetal(e, m, est, mk, u0, ancho, alto) {
  var rotY = mk.rotY;
  var P = est === 'Modern' ? { paso: 7.4 * PUL, rib: 4.4 * PUL }
        : est === 'P1'     ? { paso: 5.6 * PUL, rib: 3.0 * PUL }
        :                    { paso: 6.4 * PUL, rib: 2.2 * PUL };
  var prof = 1.2 * PUL;                      // relieve del nervio
  var y0 = 2 * PUL, h = alto - y0;
  var n = Math.max(1, Math.round(ancho / P.paso)), paso = ancho / n;
  /* Chapa de fondo, un pelo mas baja que los nervios: entre remate y remate
     el borde superior baja, que es el festoneado de la foto. */
  e.caja(m.tablaFondo || m.tabla, 'chapa', mk.p(u0 + ancho / 2, y0 + (h - P.rib / 2) / 2, -prof / 2),
         [ancho, h - P.rib / 2, 0.3 * PUL], rotY);
  for (var i = 0; i < n; i++) {
    var u = u0 + paso / 2 + i * paso;
    e.caja(m.tabla, 'nervio', mk.p(u, y0 + h / 2, 0), [P.rib, h, prof], rotY);
    /* Remate redondeado de cada nervio: medio cilindro visto de frente. */
    e.pieza('cilindro', m.tabla, 'remate', mk.p(u, y0 + h, 0), [P.rib, prof, P.rib], rotY, Math.PI / 2);
  }
  /* Los dos rails van DETRAS de la chapa, como en el producto: desde la calle
     no se ven, desde el jardin si. */
  var fr = (m.rieles === 3) ? [0.20, 0.50, 0.80] : [0.22, 0.80];
  for (var r = 0; r < fr.length; r++) {
    e.caja(m.estructura, 'rail', mk.p(u0 + ancho / 2, y0 + h * fr[r], -prof - 0.9 * PUL), [ancho, 1.5 * PUL, 1.5 * PUL], rotY);
  }
}

/** EC Fence: tablas HORIZONTALES de acero que encajan entre si. La foto del
 *  perfil tiene nueve tablas en seis pies; se generan las mismas. Antes iban
 *  verticales, que no es este producto. */
function vanoEc(e, m, est, mk, u0, ancho, alto) {
  var rotY = mk.rotY;
  var n = Math.max(3, Math.round(alto * 1.5));      // 9 tablas a 6'
  var y0 = 2 * PUL, y1 = alto - 1 * PUL, luz = 0.12 * PUL;   // junta fina: en la foto no se ve a traves
  var altT = (y1 - y0 - luz * (n - 1)) / n;
  for (var i = 0; i < n; i++) {
    /* El encaje alterna un pelo el plano de cada tabla: es el relieve que
       distingue el machihembrado de una chapa lisa. */
    var v = (i % 2) ? 0.12 * PUL : -0.12 * PUL;
    e.caja(m.tabla, 'tabla', mk.p(u0 + ancho / 2, y0 + i * (altT + luz) + altT / 2, v), [ancho, altT, 1.0 * PUL], rotY);
  }
}

var VANOS = {
  aluminum: vanoAluminio, 'chain-link': vanoChainLink, vinyl: vanoVinilo,
  metal: vanoMetal, ecfence: vanoEc
};

/** Poste, con la seccion y el remate que le toca al material. */
function poste(e, m, mat, x, z, alto) {
  if (mat === 'chain-link') {
    e.tubo(m.estructura, 'poste', x, (alto + 2 * PUL) / 2, z, 2.375 * PUL, alto + 2 * PUL);
    e.tubo(m.estructura, 'tapa', x, alto + 2.5 * PUL, z, 2.6 * PUL, 1 * PUL);
    return;
  }
  var s = mat === 'vinyl' ? 5 * PUL : mat === 'aluminum' ? 2.5 * PUL : 4 * PUL;
  var h = alto + 2 * PUL;
  e.caja(m.estructura, 'poste', [x, h / 2, z], [s, h, s], 0);
  /* Tapa: en vinilo es una piramide, en metal una plaquita. */
  if (mat === 'vinyl') {
    e.pieza('cono', m.estructura, 'tapa', [x, h + 1.6 * PUL, z], [s * 1.16, 3.2 * PUL, s * 1.16], Math.PI / 4);
  } else {
    e.caja(m.estructura, 'tapa', [x, h + 0.4 * PUL, z], [s * 1.12, 0.8 * PUL, s * 1.12], 0);
  }
}

/* ── hoja de porton ───────────────────────────────────────────────────────── */

/**
 * Una hoja: el mismo relleno del vano, con un bastidor alrededor.
 *
 * Un porton no es un trozo de cerca colgado: lleva marco perimetral porque si
 * no se descuelga. Modelarlo importa, es lo primero que se mira de cerca.
 */
function hoja(e, m, mat, est, a, b, alto, ref) {
  var mk = marco(a, b);
  var ancho = mk.largo;
  var tubo = mat === 'vinyl' ? 3 * PUL : 2 * PUL;
  /* El relleno se construye a la altura COMPLETA, no descontando el bastidor:
     descontandolo quedaba una ranura de dos pulgadas entre el rail superior
     del panel y el tubo de arriba, y se leia como una hoja mal montada. Que
     solapen es lo correcto, es como se fabrica. */
  var interior = { u0: tubo, ancho: ancho - 2 * tubo, alto: alto };

  (VANOS[mat] || vanoAluminio)(e, m, est, mk, interior.u0, Math.max(0.5, interior.ancho), interior.alto);

  /* Bastidor. En chapa y tablas va DETRAS del panel, como se fabrica: desde
     la calle no asoma nada (el tubo superior asomando sobre el panel era el
     "adorno" que el cliente pidio quitar). En aluminio y chain link el
     bastidor es parte del aspecto y va en el plano. */
  var mm = m.marco || m.estructura;
  /* Con marco explicito (el bastidor metalico negro del Custom Opening Gate
     de su foto) el bastidor va a la vista, en el plano de la hoja. */
  var vB = (mat === 'aluminum' || mat === 'chain-link' || m.marcoExplicito) ? 0 : -(tubo / 2 + 1.2 * PUL);
  var yTop = vB === 0 ? alto - tubo / 2 : alto - tubo / 2 - 2 * PUL;
  /* En aluminio los rieles del propio panel YA son el bastidor horizontal:
     añadir los tubos de arriba y abajo dejaba dos barras a cuatro pulgadas
     una de otra en la cima de cada porton ("un riel extra arriba"). Solo van
     los montantes verticales. */
  if (mat !== 'aluminum') {
    e.caja(mm, 'marco', mk.p(ancho / 2, yTop, vB), [ancho, tubo, tubo * 1.1], mk.rotY);
    e.caja(mm, 'marco', mk.p(ancho / 2, 3 * PUL + tubo / 2, vB), [ancho, tubo, tubo * 1.1], mk.rotY);
  }
  e.caja(mm, 'marco', mk.p(tubo / 2, alto / 2 + 1.5 * PUL, vB), [tubo, alto - 3 * PUL, tubo * 1.1], mk.rotY);
  e.caja(mm, 'marco', mk.p(ancho - tubo / 2, alto / 2 + 1.5 * PUL, vB), [tubo, alto - 3 * PUL, tubo * 1.1], mk.rotY);
  /* Refuerzos, como en las fotos: el walk gate de chain link lleva una barra
     horizontal a media altura ("el palito en la mitad"); el Custom Opening
     Gate con bastidor metalico lleva una cruz (montante central y travesaño). */
  if (ref && ref.diagonales) {
    /* Hoja de correderas y cantilever, como la foto: montantes cada tramo y
       una DIAGONAL por tramo, de abajo a arriba, que es lo que arriostra una
       hoja larga que vuela. Sin travesaño horizontal. */
    var ns = ref.secciones || 2, w = (ancho - 2 * tubo) / ns, hh = alto - 3 * PUL - 2 * tubo;
    for (var si = 0; si < ns; si++) {
      var u0 = tubo + si * w;
      if (si > 0) { e.caja(mm, 'marco', mk.p(u0, alto / 2 + 1.5 * PUL, vB), [tubo, alto - 3 * PUL, tubo * 1.1], mk.rotY); }
      var len = Math.sqrt(w * w + hh * hh), ang = Math.atan2(hh, w);
      e.caja(mm, 'diag', mk.p(u0 + w / 2, 3 * PUL + tubo + hh / 2, vB), [len, tubo * 0.8, tubo * 0.9], mk.rotY, ang);
    }
  } else if (mat === 'chain-link') {
    e.caja(mm, 'marco', mk.p(ancho / 2, alto / 2, vB), [ancho - 2 * tubo, tubo, tubo * 1.1], mk.rotY);
  } else if (m.marcoExplicito) {
    e.caja(mm, 'marco', mk.p(ancho / 2, alto / 2, vB), [ancho - 2 * tubo, tubo, tubo * 1.1], mk.rotY);
    e.caja(mm, 'marco', mk.p(ancho / 2, alto / 2 + 1.5 * PUL, vB), [tubo, alto - 3 * PUL, tubo * 1.1], mk.rotY);
  }
}

/* ── cerca completa ───────────────────────────────────────────────────────── */

/**
 * @param opts.mat      clave de material
 * @param opts.estilo   perfil elegido
 * @param opts.alto     en pies
 * @param opts.color    hex del color elegido
 * @param opts.marco    hex del bastidor, si es de otro material que el panel
 * @param opts.tramos   [{a:[x,z], b:[x,z]}]
 * @param opts.huecos   [{a:[x,z], b:[x,z], tipo:'single'|...}]
 */
export function construir(opts) {
  var mat = opts.mat, est = opts.estilo, alto = opts.alto;
  /* Donde van los postes del porton. Los tramos terminan justo ahi, y plantar
     los dos en el mismo punto los dejaba peleandose por el mismo pixel: con el
     marco de otro color salian a rayas de ajedrez. */
  var postesPorton = [];
  var hh = opts.huecos || (opts.hueco ? [opts.hueco] : []);
  for (var q = 0; q < hh.length; q++) {
    postesPorton.push(hh[q].a, hh[q].b);
  }
  function ocupado(x, z) {
    for (var i = 0; i < postesPorton.length; i++) {
      if (Math.abs(postesPorton[i][0] - x) < 0.35 && Math.abs(postesPorton[i][1] - z) < 0.35) { return true; }
    }
    return false;
  }
  var vano = VANO[mat] || 6;
  var m = materiales(mat, est, opts.color, vano, alto, opts.marco);
  m.rieles = opts.rieles || 2;
  var e = new Ensamblador();
  var fn = VANOS[mat] || vanoAluminio;

  for (var i = 0; i < opts.tramos.length; i++) {
    var t = opts.tramos[i];
    var mk = marco(t.a, t.b);
    var n = Math.max(1, Math.round(mk.largo / vano));
    var paso = mk.largo / n;
    for (var j = 0; j < n; j++) {
      fn(e, m, est, mk, j * paso, paso, alto);
    }
    /* Postes: uno por junta, y los dos extremos. */
    for (var k = 0; k <= n; k++) {
      var p = mk.p(k * paso, 0, 0);
      if (ocupado(p[0], p[2])) { continue; }   // ese poste lo pone el porton
      poste(e, m, mat, p[0], p[2], alto);
    }
  }

  var huecos = opts.huecos || (opts.hueco ? [opts.hueco] : []);
  for (var h = 0; h < huecos.length; h++) { porton(e, m, mat, est, alto, huecos[h]); }

  return { grupo: e.grupo(), cuenta: e.contar(), materiales: m };
}

/**
 * El porton dentro del hueco, montado segun su tipo.
 *
 * Las hojas batientes se dejan entreabiertas: cerradas y de frente, un porton
 * batiente y uno corredero son indistinguibles, y justo eso es lo que el
 * usuario acaba de elegir.
 */
function porton(e, m, mat, est, alto, h) {
  var mk = marco(h.a, h.b);
  var L = mk.largo;
  var tipo = h.tipo || 'single';
  var altoP = alto;
  /* Correderas y cantilever aparcan la hoja al lado, SIEMPRE hacia dentro de
     la finca: hacia fuera quedaria invadiendo la acera. v positivo apunta a la
     calle en el tramo frontal, de ahi el signo. */
  var DENTRO = -10 * PUL;
  /* Cuanto se aparta la hoja: 1 es del todo (escena de la casa, donde hay que
     ver que es corredera y no batiente) y menos deja el porton cubriendo parte
     del hueco, que es como se fotografia un producto. */
  var fr = h.apertura === undefined ? 1 : h.apertura;

  /* Postes de porton: mas gruesos, son los que aguantan el peso. */
  var pa = mk.p(0, 0, 0), pb = mk.p(L, 0, 0);
  var sec = mat === 'chain-link' ? 3 * PUL : mat === 'vinyl' ? 5 * PUL : 4 * PUL;
  /* Los postes del porton: del color del bastidor solo cuando ese bastidor es
     un marco metalico explicito (fotos con marco gris); si no, como los demas
     postes de la cerca, que asi no desentonan con la linea. */
  var mp = m.marcoExplicito ? m.marco : m.estructura;
  if (mat === 'chain-link') {
    e.tubo(mp, 'postep', pa[0], (altoP + 4 * PUL) / 2, pa[2], sec, altoP + 4 * PUL);
    e.tubo(mp, 'postep', pb[0], (altoP + 4 * PUL) / 2, pb[2], sec, altoP + 4 * PUL);
  } else {
    e.caja(mp, 'postep', [pa[0], (altoP + 4 * PUL) / 2, pa[2]], [sec, altoP + 4 * PUL, sec], 0);
    e.caja(mp, 'postep', [pb[0], (altoP + 4 * PUL) / 2, pb[2]], [sec, altoP + 4 * PUL, sec], 0);
  }

  function girada(u0, u1, ang) {
    /* Gira la hoja sobre su bisagra en u0. */
    var o = mk.p(u0, 0, 0), f = mk.p(u1, 0, 0);
    var dx = f[0] - o[0], dz = f[2] - o[2];
    var c = Math.cos(ang), s = Math.sin(ang);
    return [[o[0], o[2]], [o[0] + dx * c - dz * s, o[2] + dx * s + dz * c]];
  }

  /* h.abierto === false monta las hojas en el plano de la cerca. En la escena
     de la casa van abiertas, que es como se distingue un batiente de un
     corredero; en la vista previa aislada, abiertas parecen dos paneles mas. */
  var ang = h.abierto === false ? 0 : 1;
  if (tipo === 'double') {
    var iz = girada(0, L / 2, -0.42 * ang), de = girada(L, L / 2, 0.42 * ang);
    hoja(e, m, mat, est, iz[0], iz[1], altoP);
    /* La derecha se pasa de punta a bisagra para que su "cara" apunte a la
       calle como la del resto de la valla: de bisagra a punta salia montada
       al reves y desde la calle se veia su cara trasera, mas oscura. */
    hoja(e, m, mat, est, de[1], de[0], altoP);
  } else if (tipo === 'single') {
    var un = girada(0, L, -0.5 * ang);
    hoja(e, m, mat, est, un[0], un[1], altoP);
  } else if (tipo === 'sliding' || tipo === 'rolling') {
    /* Corredera: la hoja se aparta a un lado, montada sobre el rail. */
    var d = mk.p(L + L * 0.86 * fr, 0, DENTRO), o2 = mk.p(L * 0.86 * fr, 0, DENTRO);
    hoja(e, m, mat, est, [o2[0], o2[2]], [d[0], d[2]], altoP, { diagonales: true, secciones: Math.max(2, Math.round(L / 8)) });
    var rail = mk.p(L * (0.5 + 0.9 * fr), 0.5 * PUL, DENTRO);
    e.caja(m.estructura, 'guia', rail, [L * 1.1, 1 * PUL, 4 * PUL], mk.rotY);
    if (tipo === 'rolling') {
      for (var r = 0; r < 2; r++) {
        var c2 = mk.p(L * (0.09 + 0.86 * fr + r * 0.72), 6 * PUL, DENTRO);
        e.pieza('cilindro', m.estructura, 'rueda', c2, [11 * PUL, 2.4 * PUL, 11 * PUL], mk.rotY, Math.PI / 2);
      }
    }
  } else if (tipo === 'cantilever') {
    /* Cantilever: la hoja vuela sin rail en el suelo, con una cola trasera que
       hace de contrapeso. Es exactamente lo que lo diferencia. */
    var o3 = mk.p(L * 0.9 * fr, 0, DENTRO), d3 = mk.p(L * 0.9 * fr + L * 1.5, 0, DENTRO);
    hoja(e, m, mat, est, [o3[0], o3[2]], [d3[0], d3[2]], altoP, { diagonales: true, secciones: 3 });
    var v1 = mk.p(L * (0.65 + 0.9 * fr), altoP + 3 * PUL, DENTRO);
    e.caja(m.estructura, 'viga', v1, [L * 1.5, 3.5 * PUL, 3.5 * PUL], mk.rotY);
    for (var t2 = 0; t2 < 2; t2++) {
      var pt = mk.p(L * (0.65 + 0.9 * fr + t2 * 0.55), 0, DENTRO - 2 * PUL);
      e.caja(m.estructura, 'torre', [pt[0], (altoP + 6 * PUL) / 2, pt[2]], [4 * PUL, altoP + 6 * PUL, 4 * PUL], 0);
    }
  }
}

export { VANO };
