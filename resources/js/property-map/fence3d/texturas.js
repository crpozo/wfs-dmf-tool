/* Texturas dibujadas en un canvas, no descargadas.
 *
 * La escena 3D se carga sola al pulsar el boton, y meterle media docena de
 * imagenes detras seria pagar dos veces por lo mismo. Todo lo que aqui hace
 * falta (cesped, estuco, teja, veta, malla de chain link) es repetitivo y sale
 * mas nitido generado que fotografiado, porque se genera a la resolucion que
 * pide la camara y repite sin costura por construccion.
 */
import { CanvasTexture, RepeatWrapping, ClampToEdgeWrapping, SRGBColorSpace } from 'three';

var cache = {};

function lienzo(n) {
  var c = document.createElement('canvas');
  c.width = c.height = n;
  return c;
}

function envolver(c, repX, repY, color) {
  var t = new CanvasTexture(c);
  t.wrapS = t.wrapT = RepeatWrapping;
  t.repeat.set(repX, repY);
  t.anisotropy = 8;
  if (color !== false) { t.colorSpace = SRGBColorSpace; }
  return t;
}

/* Ruido de valor con interpolacion suave. Sirve de base para cesped y estuco:
   sin el, las superficies grandes se leen como plastico plano. */
function ruido(ctx, n, celda, alfa, tinte) {
  var pasos = Math.ceil(n / celda) + 1;
  var v = [];
  for (var i = 0; i < pasos; i++) {
    v[i] = [];
    for (var j = 0; j < pasos; j++) { v[i][j] = Math.random(); }
  }
  var d = ctx.createImageData(n, n);
  for (var y = 0; y < n; y++) {
    for (var x = 0; x < n; x++) {
      var fx = x / celda, fy = y / celda;
      var x0 = Math.floor(fx), y0 = Math.floor(fy);
      var tx = fx - x0, ty = fy - y0;
      var sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
      var a = v[x0][y0] + (v[x0 + 1][y0] - v[x0][y0]) * sx;
      var b = v[x0][y0 + 1] + (v[x0 + 1][y0 + 1] - v[x0][y0 + 1]) * sx;
      var k = (a + (b - a) * sy - 0.5) * alfa;
      var p = (y * n + x) * 4;
      d.data[p] = Math.max(0, Math.min(255, tinte[0] + k * 255));
      d.data[p + 1] = Math.max(0, Math.min(255, tinte[1] + k * 255));
      d.data[p + 2] = Math.max(0, Math.min(255, tinte[2] + k * 255));
      d.data[p + 3] = 255;
    }
  }
  ctx.putImageData(d, 0, 0);
}

/** Cesped: ruido verde con briznas cortas encima. */
export function cesped() {
  if (cache.cesped) { return cache.cesped; }
  /* 1024: son texturas de canvas, la resolucion cuesta milisegundos al
     generar y nada de descarga. Dos capas de ruido (manchas grandes de tono y
     grano fino) y muchas briznas encima: un cesped real no es un verde plano. */
  var n = 1024, c = lienzo(n), g = c.getContext('2d');
  ruido(g, n, 160, 0.10, [96, 132, 66]);
  g.globalCompositeOperation = 'overlay';
  var c2 = lienzo(n), g2 = c2.getContext('2d');
  ruido(g2, n, 14, 0.5, [128, 128, 128]);
  g.drawImage(c2, 0, 0);
  g.globalCompositeOperation = 'source-over';
  for (var i = 0; i < 34000; i++) {
    var x = Math.random() * n, y = Math.random() * n;
    var l = 4 + Math.random() * 9, a = -Math.PI / 2 + (Math.random() - 0.5) * 1.2;
    g.strokeStyle = 'rgba(' + (74 + Math.random() * 64 | 0) + ',' +
      (104 + Math.random() * 66 | 0) + ',' + (48 + Math.random() * 36 | 0) + ',0.55)';
    g.lineWidth = 1 + Math.random();
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
    g.stroke();
  }
  cache.cesped = envolver(c, 52, 52);
  return cache.cesped;
}

export function estuco(hex) {
  var k = 'estuco' + hex;
  if (cache[k]) { return cache[k]; }
  var n = 384, c = lienzo(n), g = c.getContext('2d');
  var r = parseInt(hex.slice(1, 3), 16), v = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  ruido(g, n, 9, 0.13, [r, v, b]);
  for (var i = 0; i < 11000; i++) {
    g.fillStyle = 'rgba(255,255,255,' + (Math.random() * 0.07) + ')';
    g.beginPath();
    g.arc(Math.random() * n, Math.random() * n, Math.random() * 1.6, 0, 6.284);
    g.fill();
  }
  cache[k] = envolver(c, 6, 4);
  return cache[k];
}

/** Teja de barril: la cubierta habitual del suroeste de Florida. */
export function teja() {
  if (cache.teja) { return cache.teja; }
  var n = 512, c = lienzo(n), g = c.getContext('2d');
  g.fillStyle = '#a8613f';
  g.fillRect(0, 0, n, n);
  var filas = 8, alto = n / filas;
  for (var f = 0; f < filas; f++) {
    var y = f * alto;
    var desfase = (f % 2) * (n / 12);
    for (var x = -n / 12; x < n; x += n / 6) {
      /* Cada teja con su tono, deterministico: todas identicas se leian como
         un estampado; la teja real varia pieza a pieza. */
      var j = (Math.sin((x + desfase) * 0.7 + f * 13.7) * 0.5 + 0.5) * 26 - 13;
      var aj = function (hx) {
        var r = Math.max(0, Math.min(255, parseInt(hx.slice(1, 3), 16) + j));
        var v = Math.max(0, Math.min(255, parseInt(hx.slice(3, 5), 16) + j * 0.6));
        var b = Math.max(0, Math.min(255, parseInt(hx.slice(5, 7), 16) + j * 0.4));
        return 'rgb(' + (r | 0) + ',' + (v | 0) + ',' + (b | 0) + ')';
      };
      var grd = g.createLinearGradient(x + desfase, 0, x + desfase + n / 6, 0);
      grd.addColorStop(0, aj('#7d4229'));
      grd.addColorStop(0.35, aj('#c2794f'));
      grd.addColorStop(0.7, aj('#a8613f'));
      grd.addColorStop(1, aj('#6f3a24'));
      g.fillStyle = grd;
      g.beginPath();
      g.moveTo(x + desfase, y + alto);
      g.bezierCurveTo(x + desfase, y - alto * 0.15, x + desfase + n / 6, y - alto * 0.15, x + desfase + n / 6, y + alto);
      g.fill();
    }
    g.fillStyle = 'rgba(0,0,0,0.22)';
    g.fillRect(0, y + alto - 2, n, 2);
  }
  cache.teja = envolver(c, 10, 6);
  return cache.teja;
}

/** Hormigon para calzada, acera y terraza. */
export function hormigon() {
  if (cache.hormigon) { return cache.hormigon; }
  var n = 512, c = lienzo(n), g = c.getContext('2d');
  ruido(g, n, 22, 0.1, [176, 172, 164]);
  /* Arido: motas claras y oscuras de tamaño variable. */
  for (var i = 0; i < 9000; i++) {
    var v = Math.random() < 0.5 ? 0 : 255;
    g.fillStyle = 'rgba(' + v + ',' + v + ',' + v + ',' + (Math.random() * 0.09) + ')';
    var s = Math.random() < 0.85 ? 1 : 2;
    g.fillRect(Math.random() * n, Math.random() * n, s, s);
  }
  cache.hormigon = envolver(c, 8, 8);
  return cache.hormigon;
}

/** Una sola hoja de palmera (pinnada): raquis vertical con foliolos a los
 *  lados, para las frondas 3D curvadas. 256x512, de abajo (base) a arriba. */
export function frondaHoja() {
  if (cache.frondaHoja) { return cache.frondaHoja; }
  var w = 256, h = 512, c = document.createElement('canvas');
  c.width = w; c.height = h;
  var g = c.getContext('2d');
  g.clearRect(0, 0, w, h);
  var cx = w / 2;
  g.strokeStyle = 'rgba(96,110,52,1)';
  g.lineWidth = 5;
  g.beginPath(); g.moveTo(cx, h); g.lineTo(cx, 6); g.stroke();
  for (var y = h - 10; y > 12; y -= 6) {
    var t = 1 - y / h;                                  // 0 base, 1 punta
    var largo = Math.sin(Math.min(1, t * 1.15) * Math.PI) * w * 0.48 + 6;
    var ang = 0.55 + t * 0.5;                           // mas caidos hacia la punta
    for (var lado = -1; lado <= 1; lado += 2) {
      g.strokeStyle = 'rgba(' + (40 + Math.random() * 40 | 0) + ',' + (100 + Math.random() * 50 | 0) + ',' + (40 + Math.random() * 20 | 0) + ',0.95)';
      /* Foliolos de 3px cada 6px: con 2px y alphaTest, los mipmaps los
         diluian y a distancia la copa quedaba rala; con 4px cada 4px se
         tocaban y de cerca la hoja era una lamina rayada. */
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(cx, y);
      g.lineTo(cx + lado * Math.cos(ang) * largo, y - Math.sin(ang) * largo * 0.55 + largo * 0.25);
      g.stroke();
    }
  }
  cache.frondaHoja = envolver(c, 1, 1);
  cache.frondaHoja.wrapS = cache.frondaHoja.wrapT = ClampToEdgeWrapping;
  return cache.frondaHoja;
}

export function veta() {
  if (cache.veta) { return cache.veta; }
  var n = 256, c = lienzo(n), g = c.getContext('2d');
  g.fillStyle = '#7a5c3e';
  g.fillRect(0, 0, n, n);
  for (var i = 0; i < 150; i++) {
    var y = Math.random() * n;
    g.strokeStyle = 'rgba(' + (60 + Math.random() * 40 | 0) + ',' +
      (42 + Math.random() * 30 | 0) + ',' + (26 + Math.random() * 22 | 0) + ',' + (0.15 + Math.random() * 0.35) + ')';
    g.lineWidth = 0.6 + Math.random() * 2.2;
    g.beginPath();
    g.moveTo(0, y);
    for (var x = 0; x <= n; x += 16) {
      g.lineTo(x, y + Math.sin(x / 34 + i) * 2.4);
    }
    g.stroke();
  }
  cache.veta = envolver(c, 1, 6);
  return cache.veta;
}

/**
 * Malla de chain link, como mapa de opacidad.
 *
 * La malla se dibuja una sola vez y se aplica a un plano con alphaMap: modelar
 * cada alambre en geometria son cientos de miles de triangulos por tramo y se
 * ve igual, porque a la distancia a la que se mira una cerca lo que se lee es
 * el patron, no el alambre.
 */
export function malla(calibre) {
  var k = 'malla' + calibre;
  if (cache[k]) { return cache[k]; }
  var n = 256, c = lienzo(n), g = c.getContext('2d');
  g.fillStyle = '#000';
  g.fillRect(0, 0, n, n);
  g.strokeStyle = '#fff';
  g.lineWidth = calibre;
  g.lineCap = 'square';
  var paso = n / 4;
  /* Rombo: dos familias de diagonales. El zigzag vertical es lo que distingue
     una malla tejida de una simple rejilla en diagonal. */
  for (var d = -n; d <= n * 2; d += paso) {
    g.beginPath();
    for (var y = 0; y <= n; y += paso) {
      var x = d + (Math.floor(y / paso) % 2 ? paso : 0);
      if (y === 0) { g.moveTo(x, y); } else { g.lineTo(x, y); }
    }
    g.stroke();
    g.beginPath();
    for (var y2 = 0; y2 <= n; y2 += paso) {
      var x2 = d - (Math.floor(y2 / paso) % 2 ? paso : 0);
      if (y2 === 0) { g.moveTo(x2, y2); } else { g.lineTo(x2, y2); }
    }
    g.stroke();
  }
  cache[k] = envolver(c, 1, 1, false);
  return cache[k];
}

/** Copa de palmera: una fronda recortada, para cruzar dos quads. */
export function fronda() {
  if (cache.fronda) { return cache.fronda; }
  var n = 256, c = lienzo(n), g = c.getContext('2d');
  g.clearRect(0, 0, n, n);
  var cx = n / 2, cy = n * 0.52;
  for (var i = 0; i < 11; i++) {
    var a = (i / 11) * Math.PI * 2 + 0.2;
    var largo = n * (0.36 + Math.random() * 0.12);
    var caida = 0.55;
    g.strokeStyle = 'rgba(' + (44 + Math.random() * 34 | 0) + ',' + (96 + Math.random() * 40 | 0) + ',48,0.95)';
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(cx, cy);
    var ex = cx + Math.cos(a) * largo, ey = cy + Math.sin(a) * largo * 0.7 + largo * caida * 0.4;
    g.quadraticCurveTo(cx + Math.cos(a) * largo * 0.6, cy + Math.sin(a) * largo * 0.4, ex, ey);
    g.stroke();
    /* Foliolos a lado y lado del raquis. */
    for (var t = 0.15; t < 1; t += 0.075) {
      var px = cx + (ex - cx) * t, py = cy + (ey - cy) * t;
      var ancho = Math.sin(t * Math.PI) * n * 0.055;
      g.strokeStyle = 'rgba(' + (52 + Math.random() * 40 | 0) + ',' + (108 + Math.random() * 44 | 0) + ',52,0.9)';
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(px, py);
      g.lineTo(px + Math.cos(a + 1.5) * ancho, py + Math.sin(a + 1.5) * ancho);
      g.moveTo(px, py);
      g.lineTo(px + Math.cos(a - 1.5) * ancho, py + Math.sin(a - 1.5) * ancho);
      g.stroke();
    }
  }
  cache.fronda = envolver(c, 1, 1);
  return cache.fronda;
}

/** Follaje generico de arbusto, tambien recortado. */
export function follaje() {
  if (cache.follaje) { return cache.follaje; }
  var n = 128, c = lienzo(n), g = c.getContext('2d');
  g.clearRect(0, 0, n, n);
  for (var i = 0; i < 210; i++) {
    var a = Math.random() * 6.284, r = Math.pow(Math.random(), 0.6) * n * 0.46;
    var x = n / 2 + Math.cos(a) * r, y = n / 2 + Math.sin(a) * r * 0.9;
    g.fillStyle = 'rgba(' + (40 + Math.random() * 46 | 0) + ',' + (86 + Math.random() * 56 | 0) + ',' + (40 + Math.random() * 30 | 0) + ',0.92)';
    g.beginPath();
    g.arc(x, y, 4 + Math.random() * 8, 0, 6.284);
    g.fill();
  }
  cache.follaje = envolver(c, 1, 1);
  return cache.follaje;
}

/** Agua de piscina, con caustica suave. */
export function agua() {
  if (cache.agua) { return cache.agua; }
  var n = 256, c = lienzo(n), g = c.getContext('2d');
  g.fillStyle = '#2e8fb5';
  g.fillRect(0, 0, n, n);
  for (var i = 0; i < 90; i++) {
    g.strokeStyle = 'rgba(255,255,255,' + (0.04 + Math.random() * 0.12) + ')';
    g.lineWidth = 1 + Math.random() * 3;
    g.beginPath();
    var y = Math.random() * n;
    for (var x = 0; x <= n; x += 8) {
      g.lineTo(x, y + Math.sin(x / 18 + i) * 6);
    }
    g.stroke();
  }
  cache.agua = envolver(c, 3, 3);
  return cache.agua;
}

/**
 * Arboleda lejana, como silueta recortada.
 *
 * Sin ella el cesped llega hasta el horizonte y la escena se lee como una
 * pradera infinita, que es justo lo contrario de un barrio. Va sobre un
 * cilindro grande alrededor de todo.
 */
export function arboleda() {
  if (cache.arboleda) { return cache.arboleda; }
  /* Tres capas con perspectiva atmosferica: la de atras azulada y desvaida,
     la del medio apagada, la de delante saturada y con troncos. Cada copa es
     un racimo de circulos (no una elipse: eso eran las piruletas), con la
     parte baja mas oscura y la alta con luz. 2048 de ancho para que las
     copas tengan forma cuando el cilindro las estira. */
  var w = 2048, h = 512, c = document.createElement('canvas');
  c.width = w; c.height = h;
  var g = c.getContext('2d');
  g.clearRect(0, 0, w, h);
  var semilla = 11;
  function rnd() { semilla = (semilla * 9301 + 49297) % 233280; return semilla / 233280; }
  var capas = [
    { base: h * 0.50, esc: 0.62, n: 120, arriba: '#9fb3a6', abajo: '#7f978a', tronco: null },
    { base: h * 0.62, esc: 0.85, n: 110, arriba: '#6f8f5e', abajo: '#4f6d44', tronco: null },
    { base: h * 0.78, esc: 1.0,  n: 95,  arriba: '#4f7d3c', abajo: '#2f5229', tronco: '#4a3a2a' }
  ];
  for (var k = 0; k < capas.length; k++) {
    var cp = capas[k];
    for (var q = 0; q < cp.n; q++) {
      var x = (q / cp.n) * w + (rnd() - 0.5) * (w / cp.n) * 1.5;
      var alto = (70 + rnd() * 110) * cp.esc, r = (22 + rnd() * 26) * cp.esc;
      var cy = cp.base - alto * 0.55;
      if (cp.tronco) {
        g.fillStyle = cp.tronco;
        g.fillRect(x - 3 * cp.esc, cy, 6 * cp.esc, cp.base - cy + 10);
      }
      /* Copa: 6-9 circulos apiñados, mas oscuros abajo. */
      var bolas = 6 + Math.floor(rnd() * 4);
      for (var b = 0; b < bolas; b++) {
        var bx = x + (rnd() - 0.5) * r * 1.6, by = cy + (rnd() - 0.5) * alto * 0.5;
        var br = r * (0.55 + rnd() * 0.55);
        var grd = g.createRadialGradient(bx - br * 0.3, by - br * 0.4, br * 0.1, bx, by, br);
        grd.addColorStop(0, cp.arriba);
        grd.addColorStop(1, cp.abajo);
        g.fillStyle = grd;
        g.beginPath(); g.arc(bx, by, br, 0, 6.284); g.fill();
      }
    }
    /* Masa continua bajo las copas, para que no se vea el cielo entre troncos. */
    g.fillStyle = cp.abajo;
    g.fillRect(0, cp.base, w, h - cp.base);
  }
  var t = new CanvasTexture(c);
  t.wrapS = RepeatWrapping;
  t.repeat.set(7, 1);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 8;
  return (cache.arboleda = t);
}

/** Corteza de palmera: anillos horizontales irregulares. */
export function corteza() {
  if (cache.corteza) { return cache.corteza; }
  var n = 256, c = lienzo(n), g = c.getContext('2d');
  ruido(g, n, 12, 0.18, [138, 115, 85]);
  for (var y = 0; y < n; y += 9 + Math.random() * 5) {
    g.fillStyle = 'rgba(60,45,30,' + (0.25 + Math.random() * 0.3) + ')';
    g.fillRect(0, y, n, 2 + Math.random() * 2);
  }
  cache.corteza = envolver(c, 2, 6);
  return cache.corteza;
}
