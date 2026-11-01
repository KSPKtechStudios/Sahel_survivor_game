// Eläinten ja vihollisten mallit. Jokainen malli on ryhmä, jonka osat
// (jalat, pää, häntä, kädet) liikkuvat erikseen (src/game/mobs.js).
// Malli katsoo +Z-suuntaan, jalat maassa (y = 0).
import * as THREE from 'three';
import { mulberry32 } from '../noise.js';
import { V, displace, paint, limb, flatNormals, merge } from './util.js';
import { GhostCloak, ghostClothMaps } from './ghostCloak.js';
import { buildGhostPart, ghostClothUv, GHOST_EYES } from './ghost.js';
import { buildGolemPart } from './clayGolem.js';
import { organicAsset } from './organicAssets.js';
import { addSurfaceDetail } from '../render/surfaces.js';

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
// Sessio 58: savipeikko uusiksi (clayGolem.js, käyttäjän tarina: maahan
// kuolleiden sielut, joiden ruumis on savea, risuja ja kiviä). Nivelet ovat
// samoissa kohdissa kuin ennen, joten animaatiot toimivat ennallaan.
// Savi ja kivet saavat oikean pintatekstuurin (surfaces.js); verteksiväri
// kertoo, mikä on savea ja mikä kiveä.
export function makeClayGolem(seed = 1, eyeMaterial = null) {
  const v = ((seed - 1) % 3 + 3) % 3;
  const material = addSurfaceDetail(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.93, metalness: 0 }), [
    { layer: 'soil', mask: 'warm', scale: 0.35, strength: 0.75, normal: 1.0 },
    { layer: 'rock', mask: 'grey', scale: 0.25, strength: 0.9, normal: 1.0 },
  ]);
  const geo = (part) => organicAsset(`golem_${part}`, 1 + v * 101, 1) || buildGolemPart(part, v, 1);
  const group = new THREE.Group();

  // Vartalo (nivel lantiossa, kumartuu eteen).
  const torso = joint(geo('torso'), material, 0, 0.5, 0);
  torso.rotation.x = 0.35;
  group.add(torso);

  // Pää (nivel kaulassa) ja hiillossilmät silmäkuopissa.
  const head = joint(geo('head'), material, 0, 0.5, 0.02);
  torso.add(head);
  const eyeMat = eyeMaterial || new THREE.MeshBasicMaterial({ color: 0xffb347 });
  const eyes = [];
  for (const sx of [-1, 1]) {
    // Pieni hiillos syvällä silmäkuopassa.
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.015, 8, 6), eyeMat);
    e.position.set(sx * 0.045, 0.112, 0.112);
    head.add(e);
    eyes.push(e);
  }

  // Kädet (nivel olkapäässä) ja jalat (nivel lonkassa).
  const arms = [];
  for (const [sx, part] of [[-1, 'armL'], [1, 'armR']]) {
    const a = joint(geo(part), material, sx * 0.22, 0.4, 0.0);
    torso.add(a);
    arms.push(a);
  }
  const legs = [];
  for (const [sx, part] of [[-1, 'legL'], [1, 'legR']]) {
    const l = joint(geo(part), material, sx * 0.11, 0.5, 0);
    group.add(l);
    legs.push(l);
  }

  return { group, material, torso, head, arms, legs, eyes, kind: 'clay' };
}

// --- Sessio 9: arat eläimet --------------------------------------------------------
// Yleinen nelijalkainen: runko, kaula+pää (nivel), neljä jalkaa (nivel ylhäällä)
// ja häntä. o = mitat ja värit.
function quadruped(rand, o) {
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 });
  const group = new THREE.Group();
  const { L, H, W, legLen, col, belly, dark } = o;
  const under = (x, y) => (y < H - W * 0.25 ? 1.15 : 1);
  const bodyParts = [
    blob(0.5, W, W * 0.95, L, 0, H, 0, col, rand, { shade: under }),
    blob(0.42, W * 0.9, W * 0.7, L * 0.8, 0, H - W * 0.18, 0, belly, rand, { rough: 0.05 }),
  ];
  if (o.stripe) bodyParts.push(blob(0.5, W * 1.02, W * 0.18, L * 0.85, 0, H - W * 0.05, 0, o.stripe, rand, { rough: 0.02 }));
  if (o.extraBody) o.extraBody(bodyParts, rand);
  const body = new THREE.Mesh(merge(bodyParts), material);
  body.castShadow = true;
  group.add(body);
  // Pää kaulan nivelestä
  const headParts = [];
  o.headParts(headParts, rand);
  const head = joint(merge(headParts), material, 0, H + o.neckY, L * 0.42);
  group.add(head);
  // Jalat
  const legGeo = (front) => merge([
    paint(limb(V(0, 0.02, 0), V(0, -legLen * 0.55, front ? 0.02 : -0.03), o.legR, o.legR * 0.7, 5), col, { rand }),
    paint(limb(V(0, -legLen * 0.55, front ? 0.02 : -0.03), V(0, -legLen, 0.01), o.legR * 0.7, o.legR * 0.55, 5, true), dark, { rand }),
  ]);
  const legs = [];
  const lx = W * 0.32, lz = L * 0.33;
  for (const [x, z, front] of [[-lx, lz, true], [lx, lz, true], [-lx, -lz, false], [lx, -lz, false]]) {
    const l = joint(legGeo(front), material, x, legLen, z);
    group.add(l);
    legs.push(l);
  }
  const tail = joint(o.tailGeo(rand), material, 0, H + W * 0.2, -L * 0.48);
  group.add(tail);
  return { group, material, body, head, legs, tail };
}

// Gaselli (Gazella dorcas / rufifrons): hento, pitkäjalkainen, lyyrasarvet.
export function makeGazelle(seed = 1) {
  const rand = mulberry32(seed + 50);
  const COL = 0xc89a62, BELLY = 0xf0e6d6, DARK = 0x3a2a20;
  const m = quadruped(rand, {
    L: 0.75, H: 0.72, W: 0.3, legLen: 0.6, legR: 0.03, col: COL, belly: BELLY, dark: DARK, stripe: 0x5a3a24, neckY: 0.14,
    headParts: (p, r) => {
      p.push(paint(limb(V(0, -0.2, -0.08), V(0, 0.16, 0.08), 0.065, 0.045, 6), COL, { rand: r }));
      p.push(blob(0.08, 0.9, 0.95, 1.6, 0, 0.2, 0.15, COL, r));
      p.push(blob(0.05, 0.9, 0.8, 1.2, 0, 0.17, 0.27, 0x9a7650, r));
      for (const sx of [-1, 1]) {
        // Lyyrasarvet ja korvat
        const h0 = V(sx * 0.03, 0.26, 0.12), h1 = V(sx * 0.07, 0.42, 0.08), h2 = V(sx * 0.05, 0.52, 0.12);
        p.push(paint(limb(h0, h1, 0.014, 0.01, 5), 0x2a221c, { rand: r }));
        p.push(paint(limb(h1, h2, 0.01, 0.004, 5, true), 0x2a221c, { rand: r }));
        const ear = new THREE.ConeGeometry(0.03, 0.12, 5);
        ear.rotateZ(sx * -1.0);
        ear.translate(sx * 0.08, 0.27, 0.08);
        p.push(paint(flatNormals(ear), COL, { rand: r }));
        const eye = new THREE.SphereGeometry(0.014, 6, 5);
        eye.translate(sx * 0.055, 0.22, 0.2);
        p.push(paint(eye, 0x120c08, { rand: r, jitter: 0 }));
        p.push(paint(limb(V(sx * 0.035, 0.24, 0.17), V(sx * 0.04, 0.16, 0.3), 0.008, 0.008, 3), 0xf0e6d6, { rand: r }));
      }
    },
    tailGeo: (r) => merge([
      paint(limb(V(0, 0, 0), V(0, -0.14, -0.04), 0.018, 0.012, 4, true), 0x2a221c, { rand: r }),
    ]),
  });
  return { ...m, kind: 'gazelle' };
}

// Aavikkokettu eli fennekki: pieni, isot korvat, tuuhea häntä.
export function makeFennec(seed = 1) {
  const rand = mulberry32(seed + 60);
  const COL = 0xe2c08a, BELLY = 0xf4ead6, DARK = 0x6a4a2a;
  const m = quadruped(rand, {
    L: 0.42, H: 0.28, W: 0.17, legLen: 0.22, legR: 0.018, col: COL, belly: BELLY, dark: DARK, neckY: 0.06,
    headParts: (p, r) => {
      p.push(blob(0.07, 1, 0.9, 1.1, 0, 0.04, 0.05, COL, r));
      p.push(paint(limb(V(0, 0.02, 0.1), V(0, 0.0, 0.18), 0.035, 0.012, 6, true), COL, { rand: r }));
      p.push(blob(0.012, 1, 1, 1, 0, 0.0, 0.185, 0x1a1210, r, { detail: 0 }));
      for (const sx of [-1, 1]) {
        const ear = new THREE.ConeGeometry(0.05, 0.16, 6);
        ear.scale(1, 1, 0.45);
        ear.rotateZ(sx * -0.45);
        ear.translate(sx * 0.06, 0.15, 0.02);
        p.push(paint(flatNormals(ear), COL, { rand: r, shade: (x, y, z) => (z > 0.02 ? 1.15 : 0.9) }));
        const eye = new THREE.SphereGeometry(0.012, 6, 5);
        eye.translate(sx * 0.035, 0.06, 0.1);
        p.push(paint(eye, 0x120c08, { rand: r, jitter: 0 }));
      }
    },
    tailGeo: (r) => merge([
      blob(0.06, 0.8, 0.8, 2.4, 0, -0.06, -0.12, COL, r),
      blob(0.035, 1, 1, 1.2, 0, -0.1, -0.27, 0x3a2a1a, r),
    ]),
  });
  return { ...m, kind: 'fennec' };
}

// Apina (vervetti): harmaa turkki, musta naama, pitkä häntä.
export function makeMonkey(seed = 1) {
  const rand = mulberry32(seed + 70);
  const COL = 0x8a8478, BELLY = 0xcfc8b8, DARK = 0x2a2420;
  const m = quadruped(rand, {
    L: 0.42, H: 0.36, W: 0.22, legLen: 0.3, legR: 0.03, col: COL, belly: BELLY, dark: DARK, neckY: 0.1,
    headParts: (p, r) => {
      p.push(blob(0.09, 1, 1, 1, 0, 0.06, 0.04, COL, r));
      p.push(blob(0.06, 1, 0.9, 0.7, 0, 0.04, 0.1, DARK, r));
      for (const sx of [-1, 1]) {
        p.push(blob(0.025, 0.5, 1, 1, sx * 0.09, 0.07, 0.02, 0x5a5048, r, { detail: 0 }));
        const eye = new THREE.SphereGeometry(0.012, 6, 5);
        eye.translate(sx * 0.028, 0.07, 0.14);
        p.push(paint(eye, 0xc89a40, { rand: r, jitter: 0 }));
      }
      // Valkoinen kulmakarvaraita
      p.push(blob(0.07, 1.2, 0.2, 0.6, 0, 0.11, 0.08, 0xe8e2d4, r, { rough: 0.02 }));
    },
    tailGeo: (r) => {
      const parts = [];
      const pts = [V(0, 0, 0), V(0, 0.05, -0.15), V(0, 0.18, -0.3), V(0, 0.36, -0.36), V(0, 0.5, -0.3)];
      for (let i = 0; i < pts.length - 1; i++) parts.push(paint(limb(pts[i], pts[i + 1], 0.022 - i * 0.003, 0.019 - i * 0.003, 5, i === pts.length - 2), COL, { rand: r }));
      return merge(parts);
    },
  });
  return { ...m, kind: 'monkey' };
}

// Helmikana: pyöreä, tummanharmaa valkopilkullinen, sininen pää ja luinen kypärä.
export function makeGuineafowl(seed = 1) {
  const rand = mulberry32(seed + 80);
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 });
  const group = new THREE.Group();
  const spotty = (x, y, z) => {
    const v = Math.sin(x * 70) * Math.sin(y * 66) * Math.sin(z * 74);
    return v > 0.35 ? 3.4 : 1;
  };
  const body = new THREE.Mesh(merge([
    blob(0.15, 0.95, 0.85, 1.35, 0, 0.29, 0, 0x3a3c44, rand, { detail: 2, shade: spotty, jitter: 0.05 }),
  ]), material);
  body.castShadow = true;
  group.add(body);
  const head = joint(merge([
    paint(limb(V(0, -0.02, -0.02), V(0, 0.12, 0.04), 0.035, 0.022, 6), 0x8aa0c8, { rand }),
    blob(0.04, 1, 1, 1.15, 0, 0.14, 0.05, 0x6a8ac0, rand),
    paint(limb(V(0, 0.17, 0.04), V(0, 0.22, 0.02), 0.016, 0.008, 5, true), 0xc8a060, { rand }),
    paint(limb(V(0, 0.13, 0.09), V(0, 0.12, 0.13), 0.012, 0.004, 4, true), 0xd8c8a0, { rand }),
    blob(0.015, 1, 1.4, 0.6, 0.02, 0.1, 0.08, 0xc8202a, rand, { detail: 0 }),
    blob(0.015, 1, 1.4, 0.6, -0.02, 0.1, 0.08, 0xc8202a, rand, { detail: 0 }),
  ]), material, 0, 0.36, 0.17);
  group.add(head);
  const legGeo = merge([
    paint(limb(V(0, 0, 0), V(0, -0.16, 0.01), 0.012, 0.01, 4, true), 0x5a5048, { rand }),
  ]);
  const legs = [];
  for (const x of [-0.06, 0.06]) {
    const l = joint(legGeo, material, x, 0.17, 0);
    group.add(l);
    legs.push(l);
  }
  // Siivet (lentäessä lepattavat)
  const wingGeo = (sx) => {
    const g = new THREE.BoxGeometry(0.28, 0.02, 0.2);
    g.translate(sx * 0.14, 0, -0.02);
    return merge([paint(g, 0x34363e, { rand, shade: spotty })]);
  };
  const wings = [];
  for (const sx of [-1, 1]) {
    const w = joint(wingGeo(sx), material, sx * 0.1, 0.36, 0);
    w.visible = false;
    group.add(w);
    wings.push(w);
  }
  const tail = joint(merge([blob(0.05, 1, 0.6, 1.2, 0, 0, -0.04, 0x2a2c34, rand)]), material, 0, 0.32, -0.2);
  group.add(tail);
  return { group, material, body, head, legs, tail, wings, kind: 'guineafowl' };
}

// Pieni lintu (kutojalintu): keltainen, musta naamari; parvissa maassa.
export function makeBird(seed = 1) {
  const rand = mulberry32(seed + 90);
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 });
  const group = new THREE.Group();
  const COL = [0xe8c838, 0xd8a838, 0x8a6a40][seed % 3];
  const body = new THREE.Mesh(merge([blob(0.06, 0.9, 0.85, 1.4, 0, 0.09, 0, COL, rand)]), material);
  body.castShadow = true;
  group.add(body);
  const head = joint(merge([
    blob(0.04, 1, 1, 1, 0, 0.0, 0.0, COL, rand),
    blob(0.03, 1.1, 0.8, 0.8, 0, -0.005, 0.02, 0x2a2018, rand),
    paint(limb(V(0, -0.005, 0.03), V(0, -0.01, 0.06), 0.012, 0.003, 4, true), 0x3a3028, { rand }),
  ]), material, 0, 0.14, 0.07);
  group.add(head);
  const legGeo = merge([paint(limb(V(0, 0, 0), V(0, -0.05, 0.005), 0.005, 0.004, 3, true), 0x6a5040, { rand })]);
  const legs = [];
  for (const x of [-0.02, 0.02]) {
    const l = joint(legGeo, material, x, 0.05, 0);
    group.add(l);
    legs.push(l);
  }
  const wings = [];
  for (const sx of [-1, 1]) {
    const g = new THREE.BoxGeometry(0.12, 0.008, 0.07);
    g.translate(sx * 0.06, 0, -0.01);
    const w = joint(merge([paint(g, 0x5a4a30, { rand })]), material, sx * 0.03, 0.11, 0);
    group.add(w);
    wings.push(w);
  }
  const tail = joint(merge([blob(0.03, 0.8, 0.3, 1.6, 0, 0, -0.04, 0x5a4a30, rand, { detail: 0 })]), material, 0, 0.1, -0.07);
  group.add(tail);
  return { group, material, body, head, legs, tail, wings, kind: 'bird' };
}

// --- Sessio 52: harmaapapukaija (sademetsä) ----------------------------------
// Noin 33 cm: harmaa, suomukuvioinen höyhenpuku, valkoinen paljas naamari,
// musta koukkunokka ja kirkkaanpunainen pyrstö. Runko on lonkkanivelessä
// (hip), jota kallistetaan: istuessa pystyssä, lennossa vaakatasossa.
// Kokoon taitetut siivet ovat osa vartaloa; lentosiivet (sivuttain, kierrot
// järjestyksessä ZYX: Y taittaa, Z lyö) näkyvät vain siivet avattuina.
export function makeParrot(seed = 1) {
  const rand = mulberry32(seed + 140);
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 });
  const group = new THREE.Group();
  const GREY = 0x868b90, PALE = 0xa9adb1, DARK = 0x50555a, FACE = 0xe4e0d8, RED = 0xc0121a;
  // Suomukuvio: höyhenten vaaleat reunat.
  const scale = (x, y, z) => (Math.sin(x * 140 + z * 60) * Math.sin(z * 150 - y * 40) > 0.45 ? 1.18 : 1);
  const hip = new THREE.Group();
  hip.position.set(0, 0.05, 0);
  group.add(hip);
  const body = new THREE.Mesh(merge([
    blob(0.06, 0.85, 0.85, 1.45, 0, 0.0, -0.005, GREY, rand, { detail: 2, shade: scale, jitter: 0.04 }),
    blob(0.048, 1, 1, 1, 0, 0.012, 0.05, PALE, rand, { detail: 2, shade: scale, jitter: 0.04 }),
    blob(0.035, 1.1, 0.8, 1.2, 0, 0.0, -0.075, PALE, rand, { detail: 1 }),
    // Kokoon taitetut siivet kyljillä (lennossa erilliset siivet).
    blob(0.05, 0.42, 0.78, 1.95, 0.036, 0.014, -0.035, DARK, rand, { detail: 1, shade: scale, jitter: 0.05 }),
    blob(0.05, 0.42, 0.78, 1.95, -0.036, 0.014, -0.035, DARK, rand, { detail: 1, shade: scale, jitter: 0.05 }),
  ]), material);
  body.castShadow = true;
  hip.add(body);
  const head = joint(merge([
    blob(0.038, 1, 0.95, 1.12, 0, 0.012, 0.012, PALE, rand, { detail: 2, shade: scale, jitter: 0.03 }),
    blob(0.018, 0.55, 1, 1.35, 0.026, 0.014, 0.03, FACE, rand, { detail: 1, jitter: 0.02 }),
    blob(0.018, 0.55, 1, 1.35, -0.026, 0.014, 0.03, FACE, rand, { detail: 1, jitter: 0.02 }),
    blob(0.0055, 1, 1, 1, 0.034, 0.018, 0.032, 0xe8dfa2, rand, { detail: 0, jitter: 0 }),
    blob(0.0055, 1, 1, 1, -0.034, 0.018, 0.032, 0xe8dfa2, rand, { detail: 0, jitter: 0 }),
    paint(limb(V(0, 0.004, 0.04), V(0, -0.022, 0.066), 0.016, 0.003, 6, true), 0x17171a, { rand, jitter: 0.02 }),
    paint(limb(V(0, -0.008, 0.038), V(0, -0.012, 0.05), 0.011, 0.006, 5, true), 0x26262a, { rand, jitter: 0.02 }),
  ]), material, 0, 0.045, 0.075);
  hip.add(head);
  // Siipi: tyvestä kärkeen kapeneva levy; käsisulat (kärki) tummemmat.
  const wingGeo = (sx) => {
    const g = new THREE.BoxGeometry(0.21, 0.012, 0.1, 5, 1, 1);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const t = p.getX(i) / 0.105 * 0.5 + 0.5; // 0 tyvi .. 1 kärki
      p.setZ(i, p.getZ(i) * (1 - 0.5 * t * t) - t * 0.025);
    }
    g.translate(sx * 0.105, 0, -0.015);
    return merge([paint(g, DARK, { rand, jitter: 0.06, shade: (x) => (Math.abs(x) > 0.13 ? 0.6 : Math.abs(x) < 0.05 ? 1.35 : 1) })]);
  };
  const wings = [];
  for (const sx of [-1, 1]) {
    const w = joint(wingGeo(sx), material, sx * 0.05, 0.022, 0.035);
    w.rotation.order = 'ZYX';
    hip.add(w);
    wings.push(w);
  }
  const tail = joint(merge([
    blob(0.04, 1.05, 0.28, 1.55, 0, 0, -0.05, RED, rand, { detail: 1, jitter: 0.05 }),
  ]), material, 0, 0.0, -0.085);
  hip.add(tail);
  const legGeo = merge([
    paint(limb(V(0, 0, 0), V(0, -0.05, 0.006), 0.007, 0.006, 4, true), 0x3a3a3e, { rand }),
    blob(0.012, 1.2, 0.5, 1.4, 0, -0.05, 0.008, 0x3a3a3e, rand, { detail: 0 }),
  ]);
  const legs = [];
  for (const x of [-0.022, 0.022]) {
    const l = joint(legGeo, material, x, 0.05, 0);
    group.add(l);
    legs.push(l);
  }
  return { group, material, hip, body, head, legs, tail, wings, kind: 'parrot' };
}

// --- Sessio 10: Haamu ---------------------------------------------------------------
// Mustakaapuinen olento, joka leijuu öisin sademetsän latvusten tasolla.
// Kaavun helma on riekaleinen, hupun alla on pimeää ja kaksi violettia silmää.
// Ympärillä hohtaa pieni tummansininen / violetti kehä (additiivinen sprite).
// Malli on irti maasta: y = 0 on helman alareuna.
let haamuGlowTex = null;
function haamuGlowTexture() {
  if (haamuGlowTex) return haamuGlowTex;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.35, 'rgba(255,255,255,0.45)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  haamuGlowTex = new THREE.CanvasTexture(c);
  haamuGlowTex.colorSpace = THREE.SRGBColorSpace;
  return haamuGlowTex;
}

export function haamuGlowMaterial(color = 0x4b34e0, opacity = 0.6) {
  return new THREE.SpriteMaterial({
    map: haamuGlowTexture(), color, opacity, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true,
  });
}

export function makeHaamu(seed = 1) {
  const rand = mulberry32(seed);
  // Sessio 58: huppu, hartiaviitta, kallo ja luiset kädet etäisyyskentästä
  // (ghost.js). material = luut (osuman välähdys), cloth = huppu ja
  // hartiaviitta viitan kangastekstuurilla (mobs.js kopioi molemmat).
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.78 });
  const cloth = new THREE.MeshStandardMaterial({
    vertexColors: true, ...ghostClothMaps(), normalScale: new THREE.Vector2(0.5, 0.5), roughness: 0.95,
  });
  const part = (p) => organicAsset(`ghost_${p}`, 1, 1) || buildGhostPart(p, 1);
  const group = new THREE.Group();
  const CLOAK_D = 0x0c0912;
  rand(); rand(); rand();

  // Sessio 27: kaapu on fysiikkaviitta (ghostCloak.js); vartaloon jää
  // hartiaviitta, jonka alta kangas laskeutuu.
  const torso = joint(ghostClothUv(part('mantle'), 0, -0.01, 0.43, 0.66), cloth, 0, 0.8, 0);
  group.add(torso);

  // Huppu ja sen pimeydessä riutunut kallo; silmät hehkuvat silmäkuopissa.
  const head = new THREE.Group();
  head.position.set(0, 0.62, 0);
  const hoodMesh = new THREE.Mesh(ghostClothUv(part('hood'), 0, -0.04, -0.1, 0.35), cloth);
  hoodMesh.castShadow = true;
  head.add(hoodMesh);
  head.add(new THREE.Mesh(part('face'), material));
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xc8a4ff });
  const eyes = [];
  for (const p of GHOST_EYES) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.01, 8, 6), eyeMat);
    e.scale.set(1.2, 0.7, 1);
    e.position.set(...p);
    head.add(e);
    eyes.push(e);
  }
  torso.add(head);

  // Käsivarsi hihan sisällä (tumma) ja luinen käsi hihan suusta (nivel
  // olkapäässä); kangashihat ovat viitan fysiikkaa.
  const arms = [];
  for (const sx of [-1, 1]) {
    const inner = paint(limb(V(0, 0, 0), V(sx * 0.04, -0.38, 0.05), 0.05, 0.045, 6), CLOAK_D, { rand, jitter: 0.05 });
    const a = joint(inner, material, sx * 0.2, 0.52, 0.0);
    const h = new THREE.Mesh(part(sx < 0 ? 'handL' : 'handR'), material);
    h.castShadow = true;
    a.add(h);
    torso.add(a);
    arms.push(a);
  }

  // Hehku: iso himmeä kehä vartalon ympärillä ja pienempi kirkkaampi kasvoilla.
  const glow = new THREE.Sprite(haamuGlowMaterial(0x3a2a9c, 0.45));
  glow.position.set(0, 1.0, 0);
  glow.scale.set(2.3, 2.3, 1);
  glow.renderOrder = 2;
  group.add(glow);
  const core = new THREE.Sprite(haamuGlowMaterial(0x7a58e8, 0.45));
  core.position.set(0, 0.12, 0.1);
  core.scale.set(0.38, 0.38, 1);
  core.renderOrder = 2;
  head.add(core);

  // Viitta: kangasverkko maailman koordinaateissa (mobs.js päivittää).
  const cloak = new GhostCloak(seed);
  group.add(cloak.mesh);

  return { group, material, cloth, torso, head, arms, legs: [], eyes, glow, core, cloak, kind: 'haamu' };
}
