// Esinemallit (kädessä, maassa ja kuvakkeissa). Kahva origossa, esine +Y-suuntaan.
import * as THREE from 'three';
import { mulberry32 } from '../noise.js';
import { V, displace, paint, limb, flatNormals, merge, prep } from './util.js';
import { makeStone } from './rocks.js';
import { createItemModels2 } from './items2.js';

// Nuotion runko (kivikehä + tukit). Liekit lisätään erikseen.
export function makeCampfireBase(seed = 3) {
  const rand = mulberry32(seed);
  const parts = [];
  const ns = 9;
  for (let i = 0; i < ns; i++) {
    const a = (i / ns) * Math.PI * 2;
    let s = new THREE.DodecahedronGeometry(0.13, 0);
    displace(s, () => [(rand() - 0.5) * 0.05, (rand() - 0.5) * 0.04, (rand() - 0.5) * 0.05]);
    s.scale(1.2, 0.8, 1);
    s.rotateY(a);
    s.translate(Math.cos(a) * 0.48, 0.06, Math.sin(a) * 0.48);
    parts.push(paint(flatNormals(s), rand() < 0.5 ? 0x7a746c : 0x8f5a3e, { rand }));
  }
  const nl = 5;
  for (let i = 0; i < nl; i++) {
    const a = (i / nl) * Math.PI * 2 + 0.3;
    parts.push(paint(limb(V(Math.cos(a) * 0.4, 0.02, Math.sin(a) * 0.4), V(Math.cos(a) * 0.05, 0.45, Math.sin(a) * 0.05), 0.05, 0.035, 5), 0x5a4030, { rand }));
  }
  const ash = new THREE.CylinderGeometry(0.3, 0.34, 0.04, 10);
  ash.translate(0, 0.01, 0);
  parts.push(paint(ash, 0x2e2925, { rand, jitter: 0.2 }));
  return merge(parts);
}

function itemStick() {
  const rand = mulberry32(5);
  return merge([
    paint(limb(V(0, -0.12, 0), V(0.01, 0.5, 0.01), 0.022, 0.016, 6, true), 0x6e5238, { rand }),
    paint(limb(V(0.005, 0.25, 0), V(0.09, 0.4, 0.02), 0.01, 0.006, 4), 0x6e5238, { rand }),
  ]);
}

function itemStone() {
  const g = makeStone(4).clone();
  g.translate(0, -0.05, 0);
  return g;
}

function itemFiber() {
  const rand = mulberry32(9);
  const parts = [];
  for (let i = 0; i < 14; i++) {
    const a = rand() * Math.PI * 2;
    const r = rand() * 0.03;
    const b = V(Math.cos(a) * r, -0.05, Math.sin(a) * r);
    const t = V(Math.cos(a) * (0.05 + rand() * 0.06), 0.3 + rand() * 0.12, Math.sin(a) * (0.05 + rand() * 0.06));
    parts.push(paint(limb(b, t, 0.006, 0.003, 3), rand() < 0.5 ? 0xd2bd84 : 0xb9a36a, { rand }));
  }
  const band = new THREE.CylinderGeometry(0.038, 0.038, 0.03, 8);
  band.translate(0, 0.06, 0);
  parts.push(paint(band, 0x8a6a40, { rand }));
  return merge(parts);
}

function itemWood() {
  const rand = mulberry32(11);
  let g = new THREE.CylinderGeometry(0.085, 0.09, 0.42, 9);
  g.translate(0, 0.12, 0);
  g = prep(g);
  // Kyljet kaarnan värisiksi, päädyt vaaleiksi.
  const pos = g.attributes.position;
  const nrm = g.attributes.normal;
  const colors = new Float32Array(pos.count * 3);
  const barkC = new THREE.Color(0x5b4838);
  const endC = new THREE.Color(0xc9a679);
  for (let i = 0; i < pos.count; i++) {
    const c = Math.abs(nrm.getY(i)) > 0.9 ? endC : barkC;
    const j = 0.9 + rand() * 0.2;
    colors.set([c.r * j, c.g * j, c.b * j], i * 3);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  return merge([g]);
}

function lashing(y, r) {
  const g = new THREE.CylinderGeometry(r, r, 0.05, 8);
  g.translate(0, y, 0);
  return paint(g, 0xb39a68, { jitter: 0.15 });
}

function itemStoneAxe() {
  const rand = mulberry32(13);
  const parts = [paint(limb(V(0, -0.15, 0), V(0, 0.5, 0), 0.02, 0.018, 6, true), 0x7a5a3a, { rand })];
  let head = new THREE.DodecahedronGeometry(0.1, 0);
  displace(head, () => [(rand() - 0.5) * 0.02, (rand() - 0.5) * 0.02, (rand() - 0.5) * 0.02]);
  head.scale(1.5, 0.95, 0.42);
  head.translate(0.09, 0.44, 0);
  parts.push(paint(flatNormals(head), 0x7d776e, { rand, jitter: 0.1 }));
  parts.push(lashing(0.44, 0.028));
  return merge(parts);
}

function itemStonePick() {
  const rand = mulberry32(17);
  const parts = [paint(limb(V(0, -0.15, 0), V(0, 0.5, 0), 0.02, 0.018, 6, true), 0x7a5a3a, { rand })];
  let head = new THREE.DodecahedronGeometry(0.08, 0);
  displace(head, () => [(rand() - 0.5) * 0.02, (rand() - 0.5) * 0.02, (rand() - 0.5) * 0.02]);
  head.scale(2.6, 0.7, 0.6);
  head.translate(0.0, 0.45, 0);
  parts.push(paint(flatNormals(head), 0x8f5a3e, { rand, jitter: 0.1 }));
  parts.push(lashing(0.45, 0.027));
  return merge(parts);
}

function itemCampfire() {
  const g = makeCampfireBase(7).clone();
  g.scale(0.45, 0.45, 0.45);
  return g;
}

function itemNugget() {
  const rand = mulberry32(19);
  const parts = [];
  for (let i = 0; i < 3; i++) {
    let g = new THREE.DodecahedronGeometry(0.05 + rand() * 0.03, 0);
    displace(g, () => [(rand() - 0.5) * 0.02, (rand() - 0.5) * 0.02, (rand() - 0.5) * 0.02]);
    g.translate((rand() - 0.5) * 0.07, 0.04 + rand() * 0.04, (rand() - 0.5) * 0.07);
    parts.push(paint(flatNormals(g), i === 0 ? 0xe8b830 : 0xd4a020, { rand, jitter: 0.15 }));
  }
  return merge(parts);
}

function itemCowrie() {
  const rand = mulberry32(23);
  const parts = [];
  for (let i = 0; i < 3; i++) {
    let g = new THREE.SphereGeometry(0.035, 8, 6);
    g.scale(1.4, 0.75, 1);
    g.rotateY(rand() * 3);
    g.translate((rand() - 0.5) * 0.08, 0.03 + i * 0.02, (rand() - 0.5) * 0.08);
    parts.push(paint(g, 0xf2ead8, { rand, jitter: 0.05, shade: (x, y) => (y > 0.03 + i * 0.02 ? 1.05 : 0.8) }));
  }
  return merge(parts);
}

function itemBracelet() {
  const rand = mulberry32(29);
  const g = new THREE.TorusGeometry(0.07, 0.014, 6, 16);
  g.rotateX(Math.PI / 2.4);
  g.translate(0, 0.06, 0);
  const parts = [paint(g, 0xb07a3a, { rand, jitter: 0.12 })];
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    let k = new THREE.IcosahedronGeometry(0.018, 0);
    k.translate(Math.cos(a) * 0.07, 0.06 + Math.sin(a) * 0.07 * Math.sin(Math.PI / 2.4) * 0, Math.sin(a) * 0.07 * Math.cos(Math.PI / 2.4));
    parts.push(paint(flatNormals(k), 0xc8902f, { rand }));
  }
  return merge(parts);
}

// Taskukello (sessio 20): messinkikuori, vaalea taulu, viisarit, nuppi ja rengas.
function itemClock() {
  const rand = mulberry32(53);
  const parts = [];
  const body = new THREE.CylinderGeometry(0.065, 0.065, 0.022, 20);
  body.rotateX(Math.PI / 2);
  body.translate(0, 0.07, 0);
  parts.push(paint(body, 0xb48a3c, { rand, jitter: 0.06 }));
  const face = new THREE.CylinderGeometry(0.054, 0.054, 0.004, 20);
  face.rotateX(Math.PI / 2);
  face.translate(0, 0.07, 0.0115);
  parts.push(paint(face, 0xefe2c4, { rand, jitter: 0.02 }));
  const hand = (len, w, a) => {
    const g = new THREE.BoxGeometry(w, len, 0.003);
    g.translate(0, len / 2, 0);
    g.rotateZ(a);
    g.translate(0, 0.07, 0.0145);
    return paint(g, 0x2a1a0e, { rand });
  };
  parts.push(hand(0.03, 0.006, -0.9), hand(0.044, 0.004, 0.5));
  const crown = new THREE.CylinderGeometry(0.008, 0.008, 0.014, 8);
  crown.translate(0, 0.142, 0);
  parts.push(paint(crown, 0xc89a48, { rand }));
  const ring = new THREE.TorusGeometry(0.013, 0.0035, 6, 12);
  ring.translate(0, 0.158, 0);
  parts.push(paint(ring, 0xc89a48, { rand }));
  return merge(parts);
}

// Puunuija: suora varsi ja raskas nuppi (kuin knobkerrie), kahvassa kuitusidos.
function itemClub() {
  const rand = mulberry32(31);
  const parts = [];
  parts.push(paint(limb(V(0, -0.16, 0), V(0.004, 0.46, 0.002), 0.019, 0.026, 7, true), 0x6a4a2e, { rand }));
  let knob = new THREE.IcosahedronGeometry(0.068, 1);
  displace(knob, (x, y, z) => {
    const n = 0.86 + rand() * 0.28;
    return [x * (n - 1), y * (n - 1) + Math.max(0, y) * 0.25, z * (n - 1)];
  });
  knob.translate(0.004, 0.52, 0.002);
  parts.push(paint(flatNormals(knob), 0x5e3f25, { rand, jitter: 0.12 }));
  // Muutama oksan tynkä nupissa
  for (let i = 0; i < 3; i++) {
    const a = rand() * Math.PI * 2;
    const y = 0.5 + rand() * 0.06;
    parts.push(paint(limb(V(Math.cos(a) * 0.05, y, Math.sin(a) * 0.05), V(Math.cos(a) * 0.085, y + 0.015, Math.sin(a) * 0.085), 0.014, 0.008, 4, true), 0x523620, { rand }));
  }
  // Kahvan sidos
  for (let i = 0; i < 4; i++) {
    const g = new THREE.CylinderGeometry(0.0225, 0.0225, 0.022, 8);
    g.translate(0, -0.12 + i * 0.03, 0);
    parts.push(paint(g, i % 2 ? 0xb39a68 : 0x9c8456, { rand, jitter: 0.1 }));
  }
  return merge(parts);
}

// Viidakkoveitsi: leveä, kärkeä kohti levenevä terä ja puukahva niitteineen.
// Terän leveys X-suunnassa (terä +X, selkä -X), pituus +Y.
function itemMachete() {
  const rand = mulberry32(37);
  const parts = [];
  const shape = new THREE.Shape();
  shape.moveTo(-0.012, 0.02);
  shape.lineTo(0.02, 0.02);
  shape.quadraticCurveTo(0.03, 0.25, 0.038, 0.43);
  shape.quadraticCurveTo(0.03, 0.5, -0.004, 0.52);
  shape.quadraticCurveTo(-0.012, 0.3, -0.012, 0.02);
  const blade = new THREE.ExtrudeGeometry(shape, { depth: 0.004, bevelEnabled: true, bevelThickness: 0.0015, bevelSize: 0.002, bevelSegments: 1, curveSegments: 8 });
  blade.translate(0, 0, -0.002);
  // Terän reuna kirkkaampi, selkä tummempi
  parts.push(paint(blade, 0xb9bec2, { rand, jitter: 0.04, shade: (x) => (x > 0.015 ? 1.12 : x < -0.006 ? 0.72 : 0.95) }));
  const handle = new THREE.CylinderGeometry(0.014, 0.017, 0.13, 8);
  handle.scale(1, 1, 0.75);
  handle.translate(0, -0.05, 0);
  parts.push(paint(handle, 0x4a3020, { rand, jitter: 0.1 }));
  const guard = new THREE.BoxGeometry(0.044, 0.012, 0.022);
  guard.translate(0.003, 0.018, 0);
  parts.push(paint(guard, 0x3a3532, { rand }));
  for (const y of [-0.08, -0.03]) {
    const r = new THREE.CylinderGeometry(0.004, 0.004, 0.028, 6);
    r.rotateX(Math.PI / 2);
    r.translate(0, y, 0);
    parts.push(paint(r, 0xc8a050, { rand }));
  }
  return merge(parts);
}

// Puukilpi: pyöreä lankkukilpi, reunassa sidos, edessä nuppi, takana kahva.
// Kilpi on XY-tasossa, etupuoli -Z, kahva origossa.
function itemShield() {
  const rand = mulberry32(41);
  const parts = [];
  const R = 0.3;
  const planks = 5;
  const w = (R * 2) / planks;
  for (let i = 0; i < planks; i++) {
    const x0 = -R + i * w;
    const xc = x0 + w / 2;
    const half = Math.sqrt(Math.max(0, R * R - Math.min(Math.abs(x0), Math.abs(x0 + w)) ** 2));
    const g = new THREE.BoxGeometry(w - 0.006, half * 2, 0.024, 1, 4, 1);
    // Pyöristä lankun päät ympyrän muotoon
    const pos = g.attributes.position;
    for (let v = 0; v < pos.count; v++) {
      const x = pos.getX(v) + xc;
      const y = pos.getY(v);
      const lim = Math.sqrt(Math.max(0, R * R - x * x));
      if (Math.abs(y) > lim) pos.setY(v, Math.sign(y) * lim);
      pos.setX(v, x);
    }
    const tone = [0x7a5634, 0x6c4a2c, 0x845e3a, 0x70502f, 0x7e5a36][i];
    parts.push(paint(flatNormals(g), tone, { rand, jitter: 0.08 }));
  }
  // Reunasidos
  const rim = new THREE.TorusGeometry(R - 0.004, 0.014, 5, 28);
  parts.push(paint(rim, 0xa88c5c, { rand, jitter: 0.12 }));
  // Etunuppi
  const boss = new THREE.SphereGeometry(0.06, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2);
  boss.rotateX(-Math.PI / 2);
  boss.translate(0, 0, -0.012);
  parts.push(paint(boss, 0x5a3c22, { rand }));
  // Takana poikkituet ja kahva
  for (const y of [-0.15, 0.15]) {
    const b = new THREE.BoxGeometry(0.5, 0.04, 0.018);
    b.translate(0, y, 0.02);
    parts.push(paint(b, 0x5e4028, { rand }));
  }
  parts.push(paint(limb(V(-0.07, 0, 0.045), V(0.07, 0, 0.045), 0.012, 0.012, 6, true), 0x8a6a40, { rand }));
  for (const x of [-0.08, 0.08]) {
    const p = new THREE.BoxGeometry(0.02, 0.03, 0.04);
    p.translate(x, 0, 0.03);
    parts.push(paint(p, 0x5e4028, { rand }));
  }
  return merge(parts);
}

function itemMeat() {
  const rand = mulberry32(43);
  let g = new THREE.IcosahedronGeometry(0.075, 1);
  displace(g, () => [(rand() - 0.5) * 0.02, (rand() - 0.5) * 0.015, (rand() - 0.5) * 0.02]);
  g.scale(1.3, 0.7, 1);
  g.translate(0, 0.05, 0);
  const meat = paint(flatNormals(g), 0xa8322a, { rand, jitter: 0.1, shade: (x, y) => (y > 0.075 ? 1.15 : 0.9) });
  let fat = new THREE.IcosahedronGeometry(0.05, 1);
  fat.scale(1.7, 0.45, 0.8);
  fat.translate(0.012, 0.085, 0.03);
  const bone = limb(V(-0.12, 0.05, 0), V(-0.075, 0.05, 0), 0.014, 0.012, 6, true);
  return merge([meat, paint(flatNormals(fat), 0xecdcc4, { rand }), paint(bone, 0xeee6d6, { rand })]);
}

function itemHide() {
  const rand = mulberry32(47);
  const g = new THREE.CircleGeometry(0.17, 10);
  g.rotateX(-Math.PI / 2);
  displace(g, (x, y, z) => {
    const r = Math.hypot(x, z);
    return [x * (rand() - 0.5) * 0.35, r * r * 1.4 + (rand() - 0.5) * 0.01, z * (rand() - 0.5) * 0.35];
  });
  g.translate(0, 0.02, 0);
  // Alapuoli: sama pinta käännetyllä kolmiojärjestyksellä (vaalea lihapuoli).
  const bottom = g.clone();
  const idx = bottom.index.array;
  for (let i = 0; i < idx.length; i += 3) { const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t; }
  bottom.translate(0, -0.003, 0);
  return merge([paint(flatNormals(g), 0x6e5a48, { rand, jitter: 0.15 }), paint(flatNormals(bottom), 0xc9a98a, { rand, jitter: 0.08 })]);
}

function itemClay() {
  const rand = mulberry32(53);
  let g = new THREE.IcosahedronGeometry(0.07, 1);
  displace(g, () => [(rand() - 0.5) * 0.025, (rand() - 0.5) * 0.02, (rand() - 0.5) * 0.025]);
  g.scale(1.15, 0.8, 1);
  g.translate(0, 0.05, 0);
  return merge([paint(flatNormals(g), 0xa5532e, { rand, jitter: 0.08 })]);
}

export function createItemModels() {
  return {
    stick: itemStick(),
    stone: itemStone(),
    fiber: itemFiber(),
    wood: itemWood(),
    stone_axe: itemStoneAxe(),
    stone_pick: itemStonePick(),
    campfire: itemCampfire(),
    gold_nugget: itemNugget(),
    cowrie: itemCowrie(),
    bronze_bracelet: itemBracelet(),
    clock: itemClock(),
    wooden_club: itemClub(),
    machete: itemMachete(),
    shield: itemShield(),
    raw_meat: itemMeat(),
    hide: itemHide(),
    clay: itemClay(),
    ...createItemModels2(),
  };
}
