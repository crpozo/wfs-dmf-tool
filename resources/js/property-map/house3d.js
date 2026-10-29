/*
 * The house and its surroundings for the 3D view, in the style of the website's viewer
 * (wfs-design-preview/src-3d/casa.js: stucco, base band, hip tile roof with ridge and
 * hips, framed windows with shutters, entry door), sized to the customer's real house.
 *
 * buildHouse() works in local coordinates: centered on the origin, front face toward +z.
 * The viewer places and turns it to match the footprint. Units are feet.
 */
import {
    Group, Mesh, BoxGeometry, PlaneGeometry, CylinderGeometry, SphereGeometry, BufferGeometry, Float32BufferAttribute,
    InstancedMesh, Object3D, MeshStandardMaterial, MeshBasicMaterial, BackSide, Color, Vector3, RepeatWrapping,
} from 'three';
import * as T from './fence3d/texturas.js';

// Same helpers as casa.js.
function box(w, h, d, material, x, y, z, rotY = 0) {
    const mesh = new Mesh(new BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z);
    mesh.rotation.y = rotY;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
}

function bar(p, q, diameter, material) {
    const dx = q[0] - p[0];
    const dy = q[1] - p[1];
    const dz = q[2] - p[2];
    const length = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const mesh = new Mesh(new CylinderGeometry(diameter / 2, diameter / 2, length, 6), material);
    mesh.position.set((p[0] + q[0]) / 2, (p[1] + q[1]) / 2, (p[2] + q[2]) / 2);
    mesh.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), new Vector3(dx, dy, dz).normalize());
    mesh.castShadow = true;
    return mesh;
}

function slab(w, d, material, x, y, z) {
    const mesh = new Mesh(new PlaneGeometry(w, d), material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, y, z);
    mesh.receiveShadow = true;
    return mesh;
}

// Hip roof over the rectangle x0..x1, z0..z1 (casa.js cubierta()). Works with the ridge along x,
// so the house is always built with its long side along x.
function hipRoof(x0, x1, z0, z1, yBase, height, overhang, material) {
    const a = x0 - overhang;
    const b = x1 + overhang;
    const c = z0 - overhang;
    const d = z1 + overhang;
    const cz = (c + d) / 2;
    const inset = Math.min((d - c) / 2, (b - a) / 2 - 0.5);
    const r0 = a + inset;
    const r1 = b - inset;
    const yr = yBase + height;

    const positions = [];
    const uvs = [];
    const tri = (p, q, r) => {
        positions.push(...p, ...q, ...r);
        for (const point of [p, q, r]) {
            uvs.push((point[0] - a) / (b - a), (point[2] - c) / (d - c));
        }
    };
    const A = [a, yBase, c];
    const B = [b, yBase, c];
    const C = [b, yBase, d];
    const D = [a, yBase, d];
    const R0 = [r0, yr, cz];
    const R1 = [r1, yr, cz];
    // Winding matters: computeVertexNormals takes the normal from it.
    tri(B, A, R1); tri(A, R0, R1);
    tri(D, C, R0); tri(C, R1, R0);
    tri(A, D, R0);
    tri(C, B, R1);

    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
    geometry.computeVertexNormals();
    const mesh = new Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return { mesh, ridge: [R0, R1], eaves: { a, b, c, d } };
}

function windowOn(group, mats, x, y, z, w, h, rotY = 0) {
    group.add(box(w + 0.5, h + 0.5, 0.34, mats.trim, x, y, z, rotY));
    group.add(box(w, h, 0.42, mats.glass, x, y, z, rotY));
    group.add(box(w, 0.16, 0.5, mats.trim, x, y, z, rotY));
    group.add(box(0.16, h, 0.5, mats.trim, x, y, z, rotY));
    group.add(box(w + 0.9, 0.22, 0.7, mats.trim, x, y - h / 2 - 0.3, z, rotY));
}

function materials() {
    return {
        wall: new MeshStandardMaterial({ map: T.estuco('#e8e1d4'), roughness: 0.95 }),
        base: new MeshStandardMaterial({ color: new Color('#cfc6b6'), roughness: 0.95 }),
        band: new MeshStandardMaterial({ color: new Color('#d9d0bf'), roughness: 0.95 }),
        tile: new MeshStandardMaterial({ map: T.teja(), roughness: 0.85 }),
        ridge: new MeshStandardMaterial({ color: new Color('#8d4a2c'), roughness: 0.8 }),
        trim: new MeshStandardMaterial({ color: new Color('#ffffff'), roughness: 0.6 }),
        glass: new MeshStandardMaterial({ color: new Color('#22323f'), roughness: 0.08, metalness: 0.75 }),
        door: new MeshStandardMaterial({ color: new Color('#5d4436'), roughness: 0.55 }),
        shutter: new MeshStandardMaterial({ color: new Color('#2f3a4a'), roughness: 0.7 }),
        concrete: new MeshStandardMaterial({ map: T.hormigon(), roughness: 0.92 }),
        mulch: new MeshStandardMaterial({ color: new Color('#4b3527'), roughness: 1 }),
        ac: new MeshStandardMaterial({ color: new Color('#b9bcb8'), roughness: 0.6, metalness: 0.3 }),
    };
}

// Windows spread along a wall, skipping the span [skipFrom, skipTo] (the door).
function windowsAlong(length, every, skipFrom = null, skipTo = null) {
    const count = Math.max(1, Math.floor(length / every));
    const step = length / count;
    const positions = [];
    for (let i = 0; i < count; i++) {
        const u = -length / 2 + step * (i + 0.5);
        if (skipFrom !== null && u > skipFrom - 3.5 && u < skipTo + 3.5) {
            continue;
        }
        positions.push(u);
    }
    return positions;
}

/**
 * A one-story Florida home of the given size. width runs along x (the ridge),
 * depth along z, front face at z = +depth/2.
 */
export function buildHouse({ width, depth, height = 10 }) {
    const g = new Group();
    const mats = materials();
    width = Math.max(16, width);
    depth = Math.max(14, Math.min(depth, width));
    height = Math.max(9, Math.min(height, 20));
    const x0 = -width / 2;
    const x1 = width / 2;
    const z0 = -depth / 2;
    const z1 = depth / 2;
    const roofHeight = Math.min(9, Math.max(5, depth * 0.24));
    const overhang = 2.2;

    g.add(box(width, height, depth, mats.wall, 0, height / 2, 0));
    g.add(box(width + 0.6, 1.4, depth + 0.6, mats.base, 0, 0.7, 0));
    g.add(box(width + 0.16, 0.55, depth + 0.16, mats.band, 0, height - 1.9, 0));

    const roof = hipRoof(x0, x1, z0, z1, height, roofHeight, overhang, mats.tile);
    g.add(roof.mesh);
    const [R0, R1] = roof.ridge;
    const { a, b, c, d } = roof.eaves;
    g.add(bar(R0, R1, 0.55, mats.ridge));
    g.add(bar([a, height, c], R0, 0.5, mats.ridge));
    g.add(bar([a, height, d], R0, 0.5, mats.ridge));
    g.add(bar([b, height, c], R1, 0.5, mats.ridge));
    g.add(bar([b, height, d], R1, 0.5, mats.ridge));
    // Fascias / gutters on the four eaves.
    g.add(box(b - a, 0.4, 0.45, mats.trim, 0, height - 0.1, d));
    g.add(box(b - a, 0.4, 0.45, mats.trim, 0, height - 0.1, c));
    g.add(box(0.45, 0.4, d - c, mats.trim, a, height - 0.1, 0));
    g.add(box(0.45, 0.4, d - c, mats.trim, b, height - 0.1, 0));

    // Front: entry door (with sidelights and a small porch) a third of the way along, windows with shutters.
    const zf = z1 + 0.01;
    const doorX = x0 + width * 0.38;
    g.add(slab(9, 6, mats.concrete, doorX, 0.09, zf + 3));
    g.add(box(3.4, 7.4, 0.45, mats.door, doorX, 3.7, zf + 0.22));
    g.add(box(6.6, 8.1, 0.28, mats.trim, doorX, 4.05, zf - 0.06));
    g.add(box(1.1, 6.8, 0.42, mats.glass, doorX - 2.45, 3.9, zf + 0.22));
    g.add(box(1.1, 6.8, 0.42, mats.glass, doorX + 2.45, 3.9, zf + 0.22));
    g.add(box(2.4, 2.6, 0.5, mats.door, doorX, 5.3, zf + 0.30));
    g.add(box(2.4, 2.6, 0.5, mats.door, doorX, 2.1, zf + 0.30));
    const windowY = Math.min(5.4, height - 4);
    for (const u of windowsAlong(width, 12, doorX - 3.3, doorX + 3.3)) {
        windowOn(g, mats, u, windowY, zf, 4.6, 4.4);
        g.add(box(0.9, 4.9, 0.3, mats.shutter, u - 3.2, windowY, zf));
        g.add(box(0.9, 4.9, 0.3, mats.shutter, u + 3.2, windowY, zf));
    }
    // Back and sides: plain framed windows.
    for (const u of windowsAlong(width, 14)) {
        windowOn(g, mats, u, windowY, z0 - 0.01, 4.6, 4.4, Math.PI);
    }
    for (const u of windowsAlong(depth, 14)) {
        windowOn(g, mats, x0 - 0.01, windowY, u, 4.2, 4.4, -Math.PI / 2);
        windowOn(g, mats, x1 + 0.01, windowY, u, 4.2, 4.4, Math.PI / 2);
    }

    // Planting bed along the front, and the A/C unit on one side.
    g.add(slab(width + 4, 4, mats.mulch, 0, 0.05, z1 + 2.3));
    g.add(shrubs(windowsAlong(width, 7).map((u) => [u, z1 + 2.3, 1.1 + ((Math.abs(u) * 7) % 5) / 10])));
    g.add(box(2.6, 2.4, 2.6, mats.ac, x1 + 1.8, 1.25, z0 + depth * 0.3));

    return g;
}

function shrubs(list) {
    const geometry = new SphereGeometry(1, 12, 9);
    const dark = new InstancedMesh(geometry, new MeshStandardMaterial({ color: new Color('#3f7a34'), roughness: 0.95 }), list.length * 2);
    const light = new InstancedMesh(geometry, new MeshStandardMaterial({ color: new Color('#4f8f3c'), roughness: 0.95 }), list.length);
    const balls = [[0, 0.72, 0, 0.78], [-0.45, 0.55, 0.3, 0.6], [0.45, 0.6, -0.25, 0.62]];
    const dummy = new Object3D();
    let darkIndex = 0;
    let lightIndex = 0;
    for (const [x, z, r] of list) {
        balls.forEach((ball, i) => {
            dummy.position.set(x + ball[0] * r, ball[1] * r, z + ball[2] * r);
            dummy.scale.setScalar(ball[3] * r);
            dummy.updateMatrix();
            if (i === 1) {
                light.setMatrixAt(lightIndex++, dummy.matrix);
            } else {
                dark.setMatrixAt(darkIndex++, dummy.matrix);
            }
        });
    }
    dark.castShadow = true;
    light.castShadow = true;
    const group = new Group();
    group.add(dark, light);
    return group;
}

/**
 * Lawn around the property, a duller field beyond it and the tree line on the horizon,
 * as in the website viewer (no satellite photo: seen at an angle it looks smeared).
 */
export function buildSurroundings(center, span) {
    const g = new Group();
    const lawnSize = Math.max(240, span * 3);
    const lawnTexture = T.cesped().clone();
    lawnTexture.wrapS = RepeatWrapping;
    lawnTexture.wrapT = RepeatWrapping;
    // Same grain as the website lawn: one tile every ~6 ft (52 over its 320 ft lawn).
    lawnTexture.repeat.set(lawnSize / 6.15, lawnSize / 6.15);
    lawnTexture.needsUpdate = true;
    g.add(slab(lawnSize, lawnSize, new MeshStandardMaterial({ map: lawnTexture, roughness: 1 }), center[0], 0, center[1]));

    const field = new MeshStandardMaterial({ map: T.cesped(), color: new Color('#b9bf9c'), roughness: 1 });
    g.add(slab(lawnSize * 6, lawnSize * 6, field, center[0], -0.02, center[1]));

    const radius = lawnSize * 0.55;
    const treeLine = new Mesh(
        new CylinderGeometry(radius, radius, Math.max(44, radius * 0.26), 64, 1, true),
        new MeshBasicMaterial({ map: T.arboleda(), side: BackSide, transparent: true, alphaTest: 0.35 })
    );
    treeLine.position.set(center[0], Math.max(44, radius * 0.26) / 2 - 2, center[1]);
    g.add(treeLine);
    return g;
}
