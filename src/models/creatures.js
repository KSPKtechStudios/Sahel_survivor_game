// Eläinten ja vihollisten mallit. Jokainen malli on ryhmä, jonka osat
// (jalat, pää, häntä, kädet) liikkuvat erikseen (src/game/mobs.js).
// Malli katsoo +Z-suuntaan, jalat maassa (y = 0).
import * as THREE from 'three';
import { mulberry32 } from '../noise.js';
import { V, displace, paint, limb, flatNormals, merge } from './util.js';

function blob(r, sx, sy, sz, x, y, z, hex, rand, { detail = 1, rough = 0.12, jitter = 0.1, shade = null } = {}) {
  let g = new THREE.IcosahedronGeometry(r, detail);
  displace(g, (px, py, pz) => {
    const n = 1 + (rand() - 0.5) * rough;
    return [px * (n - 1), py * (n - 1), pz * (n - 1)];
  });
  g.scale(sx, sy, sz);
  g.translate(x, y, z);
  return paint(flatNormals(g), hex, { rand, jitter, shade });
}

// Nivelellinen osa: ryhmä nivelen kohdalla, mesh roikkuu siitä.
function joint(geo, material, x, y, z) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  const m = new THREE.Mesh(geo, material);
  m.castShadow = true;
  g.add(m);
  return g;
}

// --- Pahkasika (Phacochoerus africanus) --------------------------------------
// Noin 1,3 m pitkä, säkä 0,7 m. Harmaanruskea, harva harja selässä, isot
// syöksyhampaat ja juostessa pystyyn nouseva häntä.
export function makeWarthog(seed = 1) {
  const rand = mulberry32(seed);
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92 });
  const group = new THREE.Group();
  const SKIN = 0x6b5c4f, DARK = 0x3b3029, BELLY = 0x857463;

  // Runko (hartiat korkeammat kuin lantio)
  const belly = (x, y) => (y < 0.42 ? 1.12 : y > 0.62 ? 0.9 : 1);
  const bodyParts = [
    blob(0.5, 0.36, 0.34, 0.62, 0, 0.5, -0.04, SKIN, rand, { shade: belly }),
    blob(0.4, 0.42, 0.44, 0.5, 0, 0.55, 0.2, SKIN, rand, { shade: belly }),
    blob(0.3, 0.6, 0.5, 0.5, 0, 0.38, 0.0, BELLY, rand, { rough: 0.05 }),
  ];
  // Harja: tummia karvatupsuja niskasta selän puoliväliin
  for (let i = 0; i < 11; i++) {
    const z = 0.42 - i * 0.065;
    const y = 0.78 - Math.max(0, -z) * 0.25 + (z > 0.2 ? (0.42 - z) * 0.2 : 0.04);
    const h = 0.09 + rand() * 0.05 - i * 0.004;
    bodyParts.push(paint(limb(V(0, y - 0.03, z), V((rand() - 0.5) * 0.03, y + h, z - 0.04), 0.022, 0.004, 4), DARK, { rand }));
  }
  const body = new THREE.Mesh(merge(bodyParts), material);
  body.castShadow = true;
  group.add(body);

  // Pää: nivel niskassa
  const headParts = [
    blob(0.5, 0.22, 0.2, 0.34, 0, -0.04, 0.17, SKIN, rand),
    blob(0.3, 0.3, 0.26, 0.2, 0, -0.1, 0.36, 0x5c4d42, rand),
    // Kärsän pää
    paint(limb(V(0, -0.12, 0.4), V(0, -0.13, 0.46), 0.075, 0.07, 9, true), 0x3f332c, { rand }),
  ];
  // Syylät (pahkat) poskissa
  for (const sx of [-1, 1]) {
    headParts.push(blob(0.05, 1, 1.2, 1, sx * 0.1, -0.06, 0.25, 0x5a4a3e, rand, { detail: 0 }));
    headParts.push(blob(0.035, 1, 1, 1, sx * 0.085, -0.02, 0.12, 0x5a4a3e, rand, { detail: 0 }));
    // Syöksyhampaat kaartuvat ylös ja ulos
    const t0 = V(sx * 0.07, -0.13, 0.38);
    const t1 = V(sx * 0.13, -0.09, 0.42);
    const t2 = V(sx * 0.15, 0.0, 0.4);
    headParts.push(paint(limb(t0, t1, 0.02, 0.016, 5, true), 0xefe4c8, { rand }));
    headParts.push(paint(limb(t1, t2, 0.016, 0.004, 5, true), 0xefe4c8, { rand }));
    // Korvat ja silmät
    const ear = new THREE.ConeGeometry(0.045, 0.1, 5);
    ear.rotateZ(sx * -0.7);
    ear.rotateX(-0.4);
    ear.translate(sx * 0.1, 0.07, 0.02);
    headParts.push(paint(flatNormals(ear), 0x55463b, { rand }));
    const eye = new THREE.SphereGeometry(0.018, 6, 5);
    eye.translate(sx * 0.095, 0.01, 0.2);
    headParts.push(paint(eye, 0x1a1210, { rand, jitter: 0 }));
  }
  // Harjaa päälaella
  for (let i = 0; i < 4; i++) {
    headParts.push(paint(limb(V(0, 0.05, 0.12 - i * 0.05), V(0, 0.12, 0.08 - i * 0.05), 0.02, 0.004, 4), DARK, { rand }));
  }
  const headGeo = merge(headParts);
  headGeo.scale(1.2, 1.2, 1.2);
  const head = joint(headGeo, material, 0, 0.62, 0.48);
  group.add(head);

  // Jalat (nivel ylhäällä), kaviot tummat
  const legGeo = (front) => merge([
    paint(limb(V(0, 0.02, 0), V(0, -0.3, front ? 0.02 : -0.02), 0.055, 0.035, 6), SKIN, { rand }),
    paint(limb(V(0, -0.3, front ? 0.02 : -0.02), V(0, -0.42, 0.01), 0.035, 0.03, 6, true), 0x2a221d, { rand }),
  ]);
  const legs = [];
  for (const [x, z, front] of [[-0.15, 0.3, true], [0.15, 0.3, true], [-0.15, -0.3, false], [0.15, -0.3, false]]) {
    const l = joint(legGeo(front), material, x, 0.43, z);
    group.add(l);
    legs.push(l);
  }

  // Häntä (tupsu päässä)
  const tailGeo = merge([
    paint(limb(V(0, 0, 0), V(0, -0.26, -0.02), 0.012, 0.008, 4, true), SKIN, { rand }),
    blob(0.035, 0.8, 1.6, 0.8, 0, -0.28, -0.02, DARK, rand, { detail: 0 }),
  ]);
  const tail = joint(tailGeo, material, 0, 0.62, -0.62);
  group.add(tail);

  return { group, material, body, head, legs, tail, kind: 'warthog' };
}

// --- Savipeikko ----------------------------------------------------------------
// Pieni, kumara olento punaisesta lateriittisavesta; hehkuvat silmät.
// Nousee maasta öisin ja murenee aamulla. (Paikkamerkki, ks. DESIGN.md.)
export function makeClayGolem(seed = 1, eyeMaterial = null) {
  const rand = mulberry32(seed);
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 });
  const group = new THREE.Group();
  const CLAY = 0x9c4a2a, CLAY_D = 0x7a3820, CLAY_L = 0xb35e36;
  const crack = (x, y, z) => {
    // Halkeamat: tummempia juovia
    const v = Math.sin(x * 37 + y * 23) * Math.sin(z * 41 - y * 17);
    return v > 0.82 ? 0.55 : 1;
  };

  // Vartalo (nivel lantiossa, kumartuu eteen)
  const torsoParts = [
    blob(0.5, 0.3, 0.42, 0.24, 0, 0.24, 0.02, CLAY, rand, { rough: 0.22, shade: crack }),
    blob(0.3, 0.55, 0.4, 0.5, 0, 0.0, 0, CLAY_D, rand, { rough: 0.25 }),
  ];
  // Kiviä ja kuivaa heinää kiinni savessa
  for (let i = 0; i < 5; i++) {
    const a = rand() * Math.PI * 2;
    torsoParts.push(blob(0.035 + rand() * 0.02, 1, 0.8, 1, Math.cos(a) * 0.15, 0.1 + rand() * 0.3, Math.sin(a) * 0.12, 0x6e665c, rand, { detail: 0 }));
  }
  for (let i = 0; i < 4; i++) {
    const x = (rand() - 0.5) * 0.2;
    torsoParts.push(paint(limb(V(x, 0.42, -0.05), V(x + (rand() - 0.5) * 0.12, 0.56 + rand() * 0.06, -0.1), 0.006, 0.002, 3), 0xc9b37a, { rand }));
  }
  const torso = joint(merge(torsoParts), material, 0, 0.5, 0);
  torso.rotation.x = 0.35;
  group.add(torso);

  // Pää (nivel kaulassa, vartalon mukana)
  const headGeo = merge([
    blob(0.16, 1, 0.9, 0.95, 0, 0.1, 0.03, CLAY_L, rand, { rough: 0.25, shade: crack }),
    // Otsaharjanne silmien yllä
    blob(0.1, 1.5, 0.45, 0.7, 0, 0.15, 0.12, CLAY_D, rand, { rough: 0.2 }),
  ]);
  const head = joint(headGeo, material, 0, 0.5, 0.02);
  torso.add(head);
  const eyeMat = eyeMaterial || new THREE.MeshBasicMaterial({ color: 0xffb347 });
  const eyes = [];
  for (const sx of [-1, 1]) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.026, 8, 6), eyeMat);
    e.position.set(sx * 0.06, 0.1, 0.16);
    head.add(e);
    eyes.push(e);
  }

  // Kädet (nivel olkapäässä): pitkät, nyrkit maata viistäen
  const armGeo = (sx) => merge([
    paint(limb(V(0, 0, 0), V(sx * 0.04, -0.3, 0.04), 0.06, 0.045, 6), CLAY, { rand, shade: crack }),
    paint(limb(V(sx * 0.04, -0.3, 0.04), V(sx * 0.05, -0.52, 0.1), 0.045, 0.04, 6), CLAY_D, { rand }),
    blob(0.075, 1, 1.1, 1, sx * 0.05, -0.58, 0.11, CLAY_L, rand, { rough: 0.3 }),
  ]);
  const arms = [];
  for (const sx of [-1, 1]) {
    const a = joint(armGeo(sx), material, sx * 0.22, 0.4, 0.0);
    torso.add(a);
    arms.push(a);
  }

  // Lyhyet, paksut jalat
  const legGeo = merge([
    paint(limb(V(0, 0, 0), V(0, -0.42, 0.02), 0.075, 0.06, 6), CLAY_D, { rand }),
    blob(0.08, 1.1, 0.6, 1.4, 0, -0.45, 0.05, CLAY, rand, { rough: 0.2 }),
  ]);
  const legs = [];
  for (const sx of [-1, 1]) {
    const l = joint(legGeo, material, sx * 0.11, 0.5, 0);
    group.add(l);
    legs.push(l);
  }

  return { group, material, torso, head, arms, legs, eyes, kind: 'clay' };
}
