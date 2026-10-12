// Sessio 48: herkuleskuoriainen (Dynastes hercules, koiras), oma 3D-malli.
// Anatomia (todellinen koiras, sarvineen enintään n. 17 cm):
// - peitinsiivet: oliivinkellertävät, mustia täpliä (kosteassa tummuvat);
// - etuselkä kiiltävän musta, siitä eteen kaartuva pitkä sarvi, jonka
//   alapinnalla kullanruskea karvoitus;
// - pää pieni ja musta, siitä ylös kaartuva lyhyempi sarvi (hampaineen);
// - kuusi jalkaa (etujalat pisimmät), lyhyet lehdykkätuntosarvet;
// - lentosiivet kalvomaiset ja ruskehtavat, taitettuina peitinsiipien alla.
// Malli rakennetaan senttimetreinä ja skaalataan lopuksi (S): pelissä noin
// 20 cm sarvineen (hieman suurinta todellista kokoa isompi, jotta erottuu).
// Malli katsoo +Z-suuntaan, jalat maassa (y = 0).
import * as THREE from 'three';
import { mulberry32 } from '../noise.js';
import { V, paint, limb, merge } from './util.js';

const S = 0.0125; // m / cm

const BLACK = 0x0d0b0a;
const HAIR = 0x8f5f2a;
const UNDER = 0x24170e;
const ELYTRA = [0x9a8c4a, 0x8a7d3e, 0xa69454];

// Ellipsoidi senttimetreinä (x, y, z = säteet), maalattuna.
function ellipsoid(rx, ry, rz, x, y, z, hex, rand, { w = 14, h = 10, jitter = 0.05, shade = null } = {}) {
  const g = new THREE.SphereGeometry(1, w, h);
  g.scale(rx, ry, rz);
  g.translate(x, y, z);
  return paint(g, hex, { rand, jitter, shade });
}

// Kaareva sarvi pisteketjuna: säde kapenee r0 -> r1.
function horn(points, r0, r1, hex, rand, seg = 7) {
  const parts = [];
  for (let i = 0; i < points.length - 1; i++) {
    const t0 = i / (points.length - 1), t1 = (i + 1) / (points.length - 1);
    const ra = r0 + (r1 - r0) * t0, rb = r0 + (r1 - r0) * t1;
    parts.push(paint(limb(points[i], points[i + 1], ra, rb, seg, i === points.length - 2), hex, { rand, jitter: 0.04 }));
    // Nivelkohtiin pieni pallo, ettei kaareen jää rakoa.
    if (i > 0) {
      const b = new THREE.SphereGeometry(ra, seg, 4);
      b.translate(points[i].x, points[i].y, points[i].z);
      parts.push(paint(b, hex, { rand, jitter: 0.04 }));
    }
  }
  return parts;
}

// Peitinsiipi (puolikas kupu). side = +1 oikea, -1 vasen. Täplät maalataan
// yksikköpallon pinnalle ennen skaalausta. Palauttaa geometrian, jonka origo
// on saranassa (etureuna keskellä), ja saranan paikan.
function elytron(side, rand, hex) {
  const g = new THREE.SphereGeometry(1, 12, 10, side > 0 ? Math.PI / 2 : -Math.PI / 2, Math.PI, 0, Math.PI * 0.6);
  const spots = [];
  for (let i = 0; i < 16; i++) {
    const a = rand() * Math.PI * 2, b = 0.15 + rand() * 1.2;
    spots.push(V(Math.cos(a) * Math.sin(b) * 0.8, Math.cos(b), Math.sin(a) * Math.sin(b)).normalize());
  }
  const p = new THREE.Vector3();
  const shaded = paint(g, hex, {
    rand, jitter: 0.06,
    shade: (x, y, z) => {
      p.set(x, y, z);
      // Saumaa kohti hieman tummempi, reunoilla vaalea kiilto.
      let s = 0.85 + 0.25 * Math.min(1, Math.abs(x) * 1.6);
      for (const c of spots) if (p.distanceToSquared(c) < 0.035) s *= 0.12;
      return s;
    },
  });
  shaded.scale(2.35, 1.75, 3.9);
  // Kupu peittää takaruumiin: keskipiste (0, 2.0, -1.3).
  shaded.translate(0, 2.0, -1.3);
  const hinge = V(side * 0.15, 3.55, 2.2);
  shaded.translate(-hinge.x, -hinge.y, -hinge.z);
  return { geo: shaded, hinge };
}

// Jalka paikallisissa koordinaateissa (nivel origossa). k = 0 etu, 1 keski, 2 taka.
function legGeo(side, k, rand) {
  const L = [1.3, 1.0, 1.1][k];
  const fz = [1.0, 0.15, -0.85][k];
  const tz = [2.4, 0.3, -2.3][k];
  const A = V(0, 0, 0);
  const F = V(side * 1.9 * L, 0.55, fz * L);
  const T = V(side * 3.2 * L, -1.35, (fz + tz) * L * 0.75);
  const E = V(side * 3.7 * L, -1.55, (fz + tz) * L * 0.75 + [1.3, 0.35, -1.0][k] * L);
  const parts = [
    paint(limb(A, F, 0.36, 0.3, 6, true), BLACK, { rand, jitter: 0.05 }),
    paint(limb(F, T, 0.26, 0.16, 6, true), BLACK, { rand, jitter: 0.05 }),
    paint(limb(T, E, 0.11, 0.06, 5, true), 0x1a120c, { rand, jitter: 0.05 }),
  ];
  // Säären piikit
  for (let i = 1; i <= 2; i++) {
    const q = F.clone().lerp(T, i / 3);
    parts.push(paint(limb(q, q.clone().add(V(side * 0.25, -0.15, 0.2)), 0.06, 0.01, 4, true), BLACK, { rand }));
  }
  return merge(parts);
}

export function makeHerculesBeetle(seed = 1) {
  const rand = mulberry32(seed * 7 + 3);
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.42, metalness: 0.05 });
  const group = new THREE.Group();
  const shellHex = ELYTRA[seed % ELYTRA.length];

  // Runko: takaruumiin alapuoli, etuselkä ja sen sarvi.
  const bodyParts = [
    ellipsoid(2.15, 1.05, 3.6, 0, 1.55, -1.3, UNDER, rand),
    ellipsoid(2.05, 1.45, 1.75, 0, 2.35, 2.55, BLACK, rand, { shade: (x, y) => (y > 3.2 ? 1.6 : 1) }),
    ellipsoid(1.2, 0.9, 1.0, 0, 1.55, 1.3, UNDER, rand),
  ];
  const hornPts = [V(0, 3.2, 2.9), V(0, 3.95, 4.9), V(0, 4.35, 7.1), V(0, 4.25, 9.0), V(0, 3.75, 10.3), V(0, 3.1, 10.8)];
  bodyParts.push(...horn(hornPts, 0.72, 0.16, BLACK, rand));
  // Kullanruskea karvoitus sarven alapinnalla
  const hairPts = hornPts.slice(1, 5).map((p, i) => V(p.x, p.y - 0.42 + i * 0.04, p.z - 0.1));
  bodyParts.push(...horn(hairPts, 0.38, 0.2, HAIR, rand, 5));
  const body = new THREE.Mesh(merge(bodyParts).scale(S, S, S), material);
  body.castShadow = true;
  group.add(body);

  // Pää ja pään sarvi (nivel niskassa).
  const neck = V(0, 1.85, 3.9);
  const headParts = [ellipsoid(1.05, 0.85, 1.0, 0, 1.75 - neck.y, 4.6 - neck.z, BLACK, rand, { w: 10, h: 8 })];
  const ch = [V(0, 1.75, 5.2), V(0, 2.05, 6.7), V(0, 2.75, 8.1), V(0, 3.3, 8.9)].map((p) => p.sub(neck));
  headParts.push(...horn(ch, 0.5, 0.12, BLACK, rand));
  // Hammas pään sarven yläpinnalla
  const tooth = ch[1].clone().lerp(ch[2], 0.5);
  headParts.push(paint(limb(tooth, tooth.clone().add(V(0, 0.55, 0.15)), 0.18, 0.03, 5, true), BLACK, { rand }));
  // Tuntosarvet ja silmät
  for (const sx of [-1, 1]) {
    const a0 = V(sx * 0.75, 1.9 - neck.y, 5.2 - neck.z);
    headParts.push(paint(limb(a0, a0.clone().add(V(sx * 0.7, 0.35, 0.55)), 0.07, 0.05, 4, true), 0x3a2414, { rand }));
    const eye = new THREE.SphereGeometry(0.22, 6, 5);
    eye.translate(sx * 0.85, 1.85 - neck.y, 4.9 - neck.z);
    headParts.push(paint(eye, 0x2a2420, { rand, jitter: 0 }));
  }
  const head = new THREE.Group();
  head.position.copy(neck).multiplyScalar(S);
  const headMesh = new THREE.Mesh(merge(headParts).scale(S, S, S), material);
  headMesh.castShadow = true;
  head.add(headMesh);
  group.add(head);

  // Jalat: kolme paria; nivel rungon alla.
  const legs = [];
  const attach = [[2.4, 1.5], [0.8, 1.45], [-1.0, 1.45]];
  for (let k = 0; k < 3; k++) {
    for (const side of [-1, 1]) {
      const g = new THREE.Group();
      g.position.set(side * 1.2 * S, attach[k][1] * S, attach[k][0] * S);
      const mesh = new THREE.Mesh(legGeo(side, k, rand).scale(S, S, S), material);
      mesh.castShadow = true;
      g.add(mesh);
      g.userData.side = side;
      g.userData.pair = k;
      group.add(g);
      legs.push(g);
    }
  }

  // Peitinsiivet (avautuvat lentäessä) ja kalvomaiset lentosiivet.
  const wings = [];
  for (const side of [-1, 1]) {
    const { geo, hinge } = elytron(side, rand, shellHex);
    const g = new THREE.Group();
    g.position.copy(hinge).multiplyScalar(S);
    const mesh = new THREE.Mesh(geo.scale(S, S, S), material);
    mesh.castShadow = true;
    g.add(mesh);
    g.userData.side = side;
    group.add(g);
    wings.push(g);
  }
  const membrane = new THREE.MeshStandardMaterial({
    color: 0x6a4a2a, roughness: 0.6, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false,
  });
  for (const side of [-1, 1]) {
    const w = new THREE.Shape();
    w.moveTo(0, 0);
    w.quadraticCurveTo(side * 3.5, 1.2, side * 7.5, -0.6);
    w.quadraticCurveTo(side * 5.5, -2.6, side * 1.0, -2.2);
    w.lineTo(0, 0);
    const wg = new THREE.ShapeGeometry(w, 6);
    wg.rotateX(Math.PI / 2); // tasoon x-z (muodon -y = taaksepäin)
    wg.scale(S, S, S);
    const g = new THREE.Group();
    g.position.set(side * 0.5 * S, 3.0 * S, 1.6 * S);
    g.add(new THREE.Mesh(wg, membrane));
    g.visible = false;
    g.userData.side = side;
    group.add(g);
    wings.push(g);
  }

  return { group, material, body, head, legs, wings, kind: 'beetle' };
}
