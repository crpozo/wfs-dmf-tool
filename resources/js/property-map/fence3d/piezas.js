/* Acumulador de piezas.
 *
 * Una cerca de perimetro con pickets cada 4" son facilmente 800 barrotes. Como
 * mallas sueltas serian 800 llamadas de dibujo, y con sombras el doble: en un
 * portatil eso se nota. Aqui todo lo rectangular se acumula y sale como UNA
 * InstancedMesh de caja unitaria por material, con el tamaño metido en la
 * escala de la matriz. Una cerca entera acaba en unas pocas llamadas.
 */
import { BoxGeometry, CylinderGeometry, ConeGeometry, PlaneGeometry,
         InstancedMesh, Matrix4, Group, Euler, Quaternion, Vector3 } from 'three';

var CAJA = null, CILINDRO = null, CONO = null, PLANO = null;
function caja()     { return CAJA     || (CAJA     = new BoxGeometry(1, 1, 1)); }
function cilindro() { return CILINDRO || (CILINDRO = new CylinderGeometry(0.5, 0.5, 1, 12)); }
function cono()     { return CONO     || (CONO     = new ConeGeometry(0.5, 1, 8)); }
function plano()    { return PLANO    || (PLANO    = new PlaneGeometry(1, 1)); }

var _q = new Quaternion(), _e = new Euler(), _p = new Vector3(), _s = new Vector3();

export function Ensamblador() {
  this.lotes = {};
}

Ensamblador.prototype._lote = function (clave, geo, material) {
  var l = this.lotes[clave];
  if (!l) { l = this.lotes[clave] = { geo: geo, material: material, m: [] }; }
  return l;
};

/**
 * Una pieza. Todo se expresa como centro + tamaño + rotacion en Y, que es lo
 * unico que hace falta: una cerca no tiene piezas inclinadas salvo las hojas
 * de porton abiertas, y esas giran justamente en Y.
 */
Ensamblador.prototype.pieza = function (forma, material, clave, c, t, rotY, rotX, rotZ) {
  var geo = forma === 'cilindro' ? cilindro() : forma === 'cono' ? cono() : forma === 'plano' ? plano() : caja();
  var l = this._lote(forma + '|' + clave, geo, material);
  /* rotZ: giro en el plano de la pieza (las diagonales de un porton). Con
     'YXZ' se aplica primero, y luego la orientacion del tramo (rotY). */
  _e.set(rotX || 0, rotY || 0, rotZ || 0, 'YXZ');
  if (forma === 'plano') { _e.set(0, rotY || 0, 0); }
  _q.setFromEuler(_e);
  _p.set(c[0], c[1], c[2]);
  _s.set(t[0], t[1], t[2]);
  l.m.push(new Matrix4().compose(_p, _q, _s));
  return this;
};

Ensamblador.prototype.caja = function (material, clave, c, t, rotY, rotZ) {
  return this.pieza('caja', material, clave, c, t, rotY, 0, rotZ);
};

/** Cilindro vertical (postes redondos de chain link). */
Ensamblador.prototype.tubo = function (material, clave, cx, cy, cz, diam, alto) {
  return this.pieza('cilindro', material, clave, [cx, cy, cz], [diam, alto, diam], 0);
};

/** Cilindro tumbado a lo largo de una direccion horizontal (rail superior). */
Ensamblador.prototype.tuboH = function (material, clave, c, diam, largo, rotY) {
  var geo = cilindro();
  var l = this._lote('cilindroH|' + clave, geo, material);
  _e.set(0, rotY, Math.PI / 2, 'YXZ');
  _q.setFromEuler(_e);
  _p.set(c[0], c[1], c[2]);
  _s.set(diam, largo, diam);
  l.m.push(new Matrix4().compose(_p, _q, _s));
  return this;
};

Ensamblador.prototype.plano = function (material, clave, c, t, rotY) {
  return this.pieza('plano', material, clave, c, t, rotY);
};

/** Materializa todo lo acumulado. */
Ensamblador.prototype.grupo = function () {
  var g = new Group();
  var claves = Object.keys(this.lotes);
  for (var i = 0; i < claves.length; i++) {
    var l = this.lotes[claves[i]];
    if (!l.m.length) { continue; }
    var im = new InstancedMesh(l.geo, l.material, l.m.length);
    for (var j = 0; j < l.m.length; j++) { im.setMatrixAt(j, l.m[j]); }
    im.instanceMatrix.needsUpdate = true;
    im.castShadow = true;
    im.receiveShadow = true;
    /* Las mallas de chain link son planos con recorte: si proyectan sombra
       opaca se ve un muro negro en el suelo, asi que solo la reciben. */
    if (claves[i].indexOf('plano|') === 0 && l.material.alphaMap) { im.castShadow = false; }
    im.frustumCulled = false;
    g.add(im);
  }
  return g;
};

Ensamblador.prototype.contar = function () {
  var n = 0, k = Object.keys(this.lotes);
  for (var i = 0; i < k.length; i++) { n += this.lotes[k[i]].m.length; }
  return { piezas: n, llamadas: k.length };
};
