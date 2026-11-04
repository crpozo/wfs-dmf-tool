/* Una persona, como referencia de altura.
 *
 * Es lo unico que hace legible una altura en 3D. Con una casa al lado se
 * intuye, pero entre una cerca de 5 pies y una de 6 hay doce pulgadas que
 * nadie ve si no hay al lado algo cuya altura todo el mundo tiene calibrada.
 *
 * Va deliberadamente sin cara ni ropa: es un maniqui de escala, no un
 * personaje. En cuanto tiene rasgos, la mirada se va a el y deja de mirarse
 * la cerca, que es lo que se esta comprando.
 */
import { Group, Mesh, SphereGeometry, CapsuleGeometry,
         MeshStandardMaterial, Color } from 'three';

/* 5 pies 9: la estatura media de un adulto en Estados Unidos, redondeada.
   Cambiarla desajusta la lectura de todas las alturas. */
export var ALTURA = 5.75;

var GEO = null;

function piezas() {
  if (GEO) { return GEO; }
  /* Proporciones de un adulto de 5'9", en pies: hombros de pie y medio, cabeza
     de tres cuartos, pies a un pie de distancia. Con la capsula del tronco sin
     ensanchar salia un bolo: hay que escalarla en X para que haya hombros. */
  GEO = {
    cabeza: new SphereGeometry(0.37, 16, 12),
    cuello: new CapsuleGeometry(0.15, 0.16, 3, 8),
    tronco: new CapsuleGeometry(0.38, 1.31, 4, 14),
    brazo:  new CapsuleGeometry(0.15, 1.48, 4, 8),
    pierna: new CapsuleGeometry(0.17, 2.31, 4, 8)
  };
  return GEO;
}

/**
 * @param x,z    donde se planta, en pies
 * @param rotY   hacia donde mira
 * @param tono   gris del maniqui; mas oscuro sobre fondo claro y al reves
 */
export function crear(x, z, rotY, tono) {
  var g = new Group();
  var P = piezas();
  var mat = new MeshStandardMaterial({
    color: new Color(tono || '#7c8390'), roughness: 0.72, metalness: 0.05
  });

  function pieza(geo, px, py, pz) {
    var m = new Mesh(geo, mat);
    m.position.set(px, py, pz);
    m.castShadow = true;
    g.add(m);
    return m;
  }

  /* Reparto de la estatura, de suelo a coronilla:
     piernas 0 → 2,65 · tronco 2,65 → 4,72 · cuello · cabeza hasta 5,75. */
  /* De pie con los pies separados. Juntas y verticales, las dos piernas se
     funden en una columna y la silueta acaba pareciendo un bolo. */
  var pi = pieza(P.pierna, -0.24, 1.325, 0);
  var pd = pieza(P.pierna,  0.24, 1.325, 0);
  pi.rotation.z = 0.07;
  pd.rotation.z = -0.07;
  var tr = pieza(P.tronco, 0, 3.685, 0);
  tr.scale.set(1.9, 1, 1);          // hombros de 1,44 pies de ancho
  pieza(P.cuello, 0, 4.85, 0);
  pieza(P.cabeza, 0, 5.38, 0);
  /* Los brazos van POR FUERA del tronco ensanchado; dentro no se veian y la
     silueta perdia los hombros. */
  var bi = pieza(P.brazo, -0.80, 3.60, 0.04);
  var bd = pieza(P.brazo,  0.80, 3.60, 0.04);
  bi.rotation.z = 0.13;
  bd.rotation.z = -0.13;

  g.position.set(x, 0, z);
  g.rotation.y = rotY || 0;
  return g;
}
