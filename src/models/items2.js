// Sessio 9: uusien esineiden mallit (materiaalit, ruoat, rohdot, työkalut,
// aseet ja nuolet). Kahva tai pohja origossa, esine +Y-suuntaan.
import { userTorch, userKnife } from './userItems.js';
import * as THREE from 'three';
import { mulberry32 } from '../noise.js';
import { V, displace, paint, limb, flatNormals, merge, strip } from './util.js';
import { glowShell } from './items3.js';
import { makeShell } from './shells.js';

function lash(y, r, col = 0xb39a68) {
  const g = new THREE.CylinderGeometry(r, r, 0.045, 8);
  g.translate(0, y, 0);
  return paint(g, col, { jitter: 0.15 });
}

function sphere(r, sx, sy, sz, x, y, z, col, rand, ws = 8, hs = 6, jitter = 0.08, shade = null) {
  const g = new THREE.SphereGeometry(r, ws, hs);
  g.scale(sx, sy, sz);
  g.translate(x, y, z);
  return paint(g, col, { rand, jitter, shade });
}

// --- Materiaalit --------------------------------------------------------------------

export function itemFlint() {
  const rand = mulberry32(61);
  const g = new THREE.OctahedronGeometry(0.075, 0);
  displace(g, () => [(rand() - 0.5) * 0.03, (rand() - 0.5) * 0.02, (rand() - 0.5) * 0.03]);
  g.scale(1.35, 0.6, 1);
  g.rotateY(0.4);
  g.translate(0, 0.04, 0);
  // Tumma, kiiltävä lohkopinta ja vaalea kuori alapuolella
  return merge([paint(flatNormals(g), 0x3b3836, { rand, jitter: 0.22, shade: (x, y) => (y > 0.045 ? 1.35 : y < 0.025 ? 1.9 : 0.9) })]);
}

export function itemBone() {
  const rand = mulberry32(62);
  const col = 0xe8dfca;
  const parts = [paint(limb(V(0, -0.1, 0), V(0, 0.22, 0), 0.016, 0.014, 6, true), col, { rand })];
  for (const y of [-0.1, 0.22]) {
    for (const x of [-0.018, 0.018]) parts.push(sphere(0.022, 1, 0.9, 1, x, y, 0, col, rand, 7, 5));
  }
  return merge(parts);
}

export function itemFeather(seed = 63) {
  const rand = mulberry32(seed);
  const pts = [], w = [];
  for (let i = 0; i <= 6; i++) {
    const t = i / 6;
    pts.push(V(Math.sin(t * 1.2) * 0.02, 0.02 + t * 0.26, 0));
    w.push(Math.sin(Math.min(1, t * 1.25) * Math.PI) * 0.05 + 0.004);
  }
  const vane = strip(pts, w, V(0, 0, 1), 0x2e2a2c, rand);
  // Helmikanan sulka: tummassa pohjassa vaaleat täplät
  const spots = [];
  for (let i = 0; i < 7; i++) {
    const p = pts[1 + Math.floor(rand() * 4)];
    const s = new THREE.CircleGeometry(0.006, 5);
    s.translate(p.x, p.y + (rand() - 0.5) * 0.03, (rand() - 0.5) * 0.06);
    const back = s.clone().rotateY(Math.PI);
    s.translate(0.002, 0, 0);
    back.translate(-0.002, 0, 0);
    s.rotateY(Math.PI / 2);
    back.rotateY(Math.PI / 2);
    spots.push(paint(s, 0xe8e8e0, { rand }), paint(back, 0xe8e8e0, { rand }));
  }
  const shaft = paint(limb(V(0, -0.04, 0), V(0.02, 0.29, 0), 0.004, 0.002, 4, true), 0xd8d0c0, { rand });
  return merge([vane, shaft, ...spots]);
}

export function itemReed() {
  const rand = mulberry32(64);
  const parts = [];
  for (let i = 0; i < 9; i++) {
    const a = rand() * Math.PI * 2, r = rand() * 0.02;
    const b = V(Math.cos(a) * r, -0.12, Math.sin(a) * r);
    const t = V(Math.cos(a) * (0.03 + rand() * 0.03), 0.5 + rand() * 0.12, Math.sin(a) * (0.03 + rand() * 0.03));
    parts.push(paint(limb(b, t, 0.006, 0.004, 4), rand() < 0.5 ? 0xb8b070 : 0x9ca860, { rand }));
  }
  parts.push(lash(0.08, 0.03));
  return merge(parts);
}

export function itemBamboo() {
  const rand = mulberry32(65);
  const parts = [];
  for (let s = 0; s < 3; s++) {
    const y0 = -0.1 + s * 0.2;
    parts.push(paint(limb(V(0, y0, 0), V(0, y0 + 0.2, 0), 0.026, 0.025, 8, s === 2), 0x9ab04a, { rand, jitter: 0.06 }));
    const node = new THREE.CylinderGeometry(0.029, 0.029, 0.014, 8);
    node.translate(0, y0 + 0.2, 0);
    parts.push(paint(node, 0x7d8c38, { rand }));
  }
  return merge(parts);
}

export function itemPalmLeaf() {
  const rand = mulberry32(66);
  const parts = [];
  const rib = [];
  for (let i = 0; i <= 8; i++) {
    const t = i / 8;
    rib.push(V(0, -0.1 + t * 0.6, -Math.sin(t * 2) * 0.05));
  }
  for (let i = 0; i < 8; i++) parts.push(paint(limb(rib[i], rib[i + 1], 0.008, 0.006, 4), 0x8a9a40, { rand }));
  for (let i = 1; i < 8; i++) {
    for (const side of [-1, 1]) {
      const p = rib[i];
      const tip = V(side * (0.12 - i * 0.008), p.y + 0.05, p.z - 0.02);
      parts.push(strip([p, p.clone().lerp(tip, 0.5), tip], [0.03, 0.025, 0.004], V(0, 1, 0.3).normalize(), 0x5f8a30, rand));
    }
  }
  return merge(parts);
}

export function itemGum() {
  const rand = mulberry32(67);
  const parts = [];
  for (let i = 0; i < 3; i++) {
    const g = new THREE.IcosahedronGeometry(0.03 + rand() * 0.015, 1);
    displace(g, () => [(rand() - 0.5) * 0.012, (rand() - 0.5) * 0.01, (rand() - 0.5) * 0.012]);
    g.scale(1, 0.8, 1);
    g.translate((rand() - 0.5) * 0.06, 0.025 + i * 0.012, (rand() - 0.5) * 0.06);
    parts.push(paint(g, i === 0 ? 0xd8902a : 0xc0701c, { rand, jitter: 0.1, shade: (x, y) => (y > 0.035 ? 1.3 : 0.85) }));
  }
  return merge(parts);
}

export function itemRope() {
  const rand = mulberry32(68);
  const parts = [];
  for (let i = 0; i < 3; i++) {
    const g = new THREE.TorusGeometry(0.06 - i * 0.004, 0.012, 5, 18);
    g.rotateX(Math.PI / 2);
    g.translate(0, 0.012 + i * 0.02, 0);
    parts.push(paint(g, i % 2 ? 0xb39a68 : 0xa08758, { rand, jitter: 0.12 }));
  }
  return merge(parts);
}

// Sessio 26: kampasimpukka (shells.js).
export function itemShell() {
  return makeShell('scallop', 69);
}

export function itemSinew() {
  const rand = mulberry32(70);
  const parts = [];
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const pts = [];
    for (let k = 0; k <= 4; k++) pts.push(V(Math.cos(a + k * 0.9) * 0.012, -0.08 + k * 0.08, Math.sin(a + k * 0.9) * 0.012));
    for (let k = 0; k < 4; k++) parts.push(paint(limb(pts[k], pts[k + 1], 0.005, 0.005, 3), 0xd8c6a0, { rand }));
  }
  return merge(parts);
}

export function itemPelt(col, seed) {
  const rand = mulberry32(seed);
  const g = new THREE.CircleGeometry(0.17, 10);
  g.rotateX(-Math.PI / 2);
  displace(g, (x, y, z) => {
    const r = Math.hypot(x, z);
    return [x * (rand() - 0.5) * 0.35, r * r * 1.4 + (rand() - 0.5) * 0.01, z * (rand() - 0.5) * 0.35];
  });
  g.translate(0, 0.02, 0);
  const bottom = g.clone();
  const idx = bottom.index.array;
  for (let i = 0; i < idx.length; i += 3) { const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t; }
  bottom.translate(0, -0.003, 0);
  return merge([paint(flatNormals(g), col, { rand, jitter: 0.15 }), paint(flatNormals(bottom), 0xc9a98a, { rand, jitter: 0.08 })]);
}

export function itemLeather() {
  const rand = mulberry32(71);
  const a = new THREE.BoxGeometry(0.22, 0.012, 0.16);
  a.translate(0, 0.01, 0);
  const b = new THREE.BoxGeometry(0.2, 0.012, 0.15);
  b.rotateZ(0.25);
  b.translate(0.02, 0.035, 0.005);
  return merge([paint(a, 0x7a4e2c, { rand, jitter: 0.1 }), paint(b, 0x8a5a34, { rand, jitter: 0.1 })]);
}

// Savikulho, jossa sisältö (puuro, pata, voi).
function bowl(rand, content, r = 0.1, h = 0.075) {
  const outer = new THREE.CylinderGeometry(r, r * 0.68, h, 14, 1, true);
  outer.translate(0, h / 2, 0);
  const inner = outer.clone();
  const idx = inner.index.array;
  for (let i = 0; i < idx.length; i += 3) { const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t; }
  inner.scale(0.92, 1, 0.92);
  const bottom = new THREE.CircleGeometry(r * 0.68, 14);
  bottom.rotateX(Math.PI / 2);
  const fill = new THREE.CircleGeometry(r * 0.9, 14);
  fill.rotateX(-Math.PI / 2);
  fill.translate(0, h * 0.78, 0);
  const rim = new THREE.TorusGeometry(r, 0.008, 4, 16);
  rim.rotateX(Math.PI / 2);
  rim.translate(0, h, 0);
  return [
    paint(outer, 0x9a5634, { rand, jitter: 0.08 }), paint(inner, 0x7a4024, { rand }),
    paint(bottom, 0x8a4a2c, { rand }), paint(rim, 0xa86040, { rand }),
    paint(fill, content, { rand, jitter: 0.15 }),
  ];
}

export function itemSheaButter() {
  const rand = mulberry32(72);
  const parts = bowl(rand, 0xf2ead2, 0.075, 0.06);
  parts.push(sphere(0.05, 1, 0.45, 1, 0, 0.05, 0, 0xf4eedc, rand, 8, 5));
  return merge(parts);
}

export function itemMushroom(kind) {
  const rand = mulberry32({ brown: 74, pale: 75, red: 76, termite: 77, roasted: 78 }[kind]);
  const cap = { brown: 0x8a5a32, pale: 0xe8e2cc, red: 0xc8281e, termite: 0xd8cfb8, roasted: 0x5a3820 }[kind];
  const stemCol = kind === 'roasted' ? 0x8a6a48 : 0xece4d0;
  const parts = [];
  const tall = kind === 'termite' ? 0.14 : 0.08;
  parts.push(paint(limb(V(0, 0, 0), V(0, tall, 0), 0.016, 0.013, 6, true), stemCol, { rand }));
  const r = kind === 'termite' ? 0.05 : 0.055;
  const c = new THREE.SphereGeometry(r, 9, 4, 0, Math.PI * 2, 0, Math.PI / 2);
  c.scale(1, kind === 'termite' ? 1.1 : 0.6, 1);
  if (kind === 'termite') displace(c, (x, y) => [0, y > 0.03 ? y * 0.4 : 0, 0]);
  c.translate(0, tall - 0.006, 0);
  parts.push(paint(flatNormals(c), cap, { rand, jitter: 0.1 }));
  const under = new THREE.CircleGeometry(r, 9);
  under.rotateX(Math.PI / 2);
  under.translate(0, tall - 0.005, 0);
  parts.push(paint(under, kind === 'red' ? 0xf0e8d0 : 0xb8a888, { rand }));
  if (kind === 'red') {
    for (let i = 0; i < 6; i++) {
      const a = rand() * Math.PI * 2, d = rand() * 0.035;
      parts.push(sphere(0.007, 1, 0.5, 1, Math.cos(a) * d, tall + 0.03 - d * 0.5, Math.sin(a) * d, 0xf8f4ea, rand, 5, 3));
    }
  }
  if (kind === 'roasted') parts.push(paint(limb(V(0, -0.12, 0), V(0, 0.16, 0), 0.006, 0.005, 4, true), 0x6e5238, { rand }));
  return merge(parts);
}

export function itemCookedMeat() {
  const rand = mulberry32(79);
  const g = new THREE.IcosahedronGeometry(0.075, 1);
  displace(g, () => [(rand() - 0.5) * 0.02, (rand() - 0.5) * 0.015, (rand() - 0.5) * 0.02]);
  g.scale(1.3, 0.7, 1);
  g.translate(0, 0.05, 0);
  const meat = paint(flatNormals(g), 0x6e3a1e, { rand, jitter: 0.14, shade: (x, y) => (y > 0.075 ? 1.1 : 0.85) });
  const bone = limb(V(-0.12, 0.05, 0), V(-0.075, 0.05, 0), 0.014, 0.012, 6, true);
  return merge([meat, paint(bone, 0xeee6d6, { rand })]);
}

export function itemJujube() {
  const rand = mulberry32(80);
  const parts = [paint(limb(V(0, 0, 0), V(0.02, 0.12, 0), 0.004, 0.003, 3), 0x5a4a30, { rand })];
  for (let i = 0; i < 6; i++) {
    const a = rand() * Math.PI * 2;
    parts.push(sphere(0.02, 1, 1.1, 1, Math.cos(a) * 0.03, 0.03 + rand() * 0.06, Math.sin(a) * 0.03, rand() < 0.5 ? 0x9a3a1c : 0xb8662a, rand, 7, 5));
  }
  const leaf = new THREE.OctahedronGeometry(0.03, 0);
  leaf.scale(1.2, 0.2, 0.7);
  leaf.translate(0.03, 0.12, 0);
  parts.push(paint(flatNormals(leaf), 0x5a7a30, { rand }));
  return merge(parts);
}

export function itemBanana() {
  const rand = mulberry32(81);
  const parts = [];
  const pts = [];
  for (let i = 0; i <= 5; i++) {
    const t = i / 5;
    pts.push(V(Math.sin(t * 1.6) * 0.06, t * 0.22, 0));
  }
  for (let i = 0; i < 5; i++) {
    const r0 = 0.018 + Math.sin(((i + 0.0) / 5) * Math.PI) * 0.012;
    const r1 = 0.018 + Math.sin(((i + 1) / 5) * Math.PI) * 0.012;
    parts.push(paint(limb(pts[i], pts[i + 1], r0, r1, 6, i === 4), 0xe8c838, { rand, jitter: 0.06 }));
  }
  parts.push(paint(limb(pts[0], V(-0.01, -0.03, 0), 0.008, 0.007, 5, true), 0x5a4a20, { rand }));
  return merge(parts);
}

export function itemCoconut() {
  const rand = mulberry32(82);
  const g = new THREE.IcosahedronGeometry(0.09, 1);
  displace(g, () => [(rand() - 0.5) * 0.012, (rand() - 0.5) * 0.012, (rand() - 0.5) * 0.012]);
  g.scale(1, 1.08, 1);
  g.translate(0, 0.09, 0);
  const parts = [paint(flatNormals(g), 0x6a4a2a, { rand, jitter: 0.2 })];
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    parts.push(sphere(0.01, 1, 1, 1, Math.cos(a) * 0.02, 0.18, Math.sin(a) * 0.02, 0x2a1a10, rand, 5, 4));
  }
  return merge(parts);
}

export function itemBaobabFruit() {
  const rand = mulberry32(83);
  const parts = [sphere(0.055, 1, 2.0, 1, 0, 0.11, 0, 0x8a9070, rand, 9, 7, 0.1)];
  parts.push(paint(limb(V(0, 0.21, 0), V(0.01, 0.27, 0), 0.006, 0.004, 4, true), 0x5a4a30, { rand }));
  return merge(parts);
}

export function itemNuts(col = 0x8a5a30, seed = 84) {
  const rand = mulberry32(seed);
  const parts = [];
  for (let i = 0; i < 4; i++) {
    const a = rand() * Math.PI * 2;
    const g = new THREE.SphereGeometry(0.022, 7, 5);
    g.scale(1.3, 0.85, 0.9);
    g.rotateY(rand() * 3);
    g.translate(Math.cos(a) * 0.03, 0.02 + (i === 3 ? 0.02 : 0), Math.sin(a) * 0.03);
    parts.push(paint(g, col, { rand, jitter: 0.12 }));
  }
  return merge(parts);
}

export function itemMoringa() {
  const rand = mulberry32(85);
  const parts = [paint(limb(V(0, -0.06, 0), V(0, 0.22, 0), 0.004, 0.003, 3), 0x5a6a30, { rand })];
  for (let i = 0; i < 8; i++) {
    const y = 0.0 + i * 0.026;
    for (const s of [-1, 1]) {
      const g = new THREE.SphereGeometry(0.011, 5, 3);
      g.scale(1.5, 0.35, 1);
      g.translate(s * 0.018, y, 0);
      parts.push(paint(g, i % 2 ? 0x5f8a2e : 0x4f7a26, { rand }));
    }
  }
  return merge(parts);
}

export function itemHibiscus() {
  const rand = mulberry32(86);
  const parts = [];
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.3;
    const x = Math.cos(a) * 0.03, z = Math.sin(a) * 0.03;
    const g = new THREE.OctahedronGeometry(0.03, 0);
    g.scale(0.8, 1.3, 0.8);
    g.translate(x, 0.05, z);
    parts.push(paint(flatNormals(g), 0xa8142a, { rand, jitter: 0.12 }));
    parts.push(paint(limb(V(x * 0.4, 0, z * 0.4), V(x, 0.02, z), 0.003, 0.003, 3), 0x4a5a28, { rand }));
  }
  return merge(parts);
}

export function itemFonio() {
  const rand = mulberry32(87);
  const parts = [];
  for (let i = 0; i < 12; i++) {
    const a = rand() * Math.PI * 2, r = rand() * 0.015;
    const t = V(Math.cos(a) * (0.03 + rand() * 0.05), 0.3 + rand() * 0.1, Math.sin(a) * (0.03 + rand() * 0.05));
    parts.push(paint(limb(V(Math.cos(a) * r, -0.08, Math.sin(a) * r), t, 0.003, 0.002, 3), 0xc8b070, { rand }));
    const head = new THREE.SphereGeometry(0.008, 4, 3);
    head.scale(0.8, 3, 0.8);
    head.translate(t.x, t.y + 0.015, t.z);
    parts.push(paint(head, 0xe0c060, { rand }));
  }
  parts.push(lash(0.02, 0.022));
  return merge(parts);
}

export function itemPorridge() {
  const rand = mulberry32(88);
  return merge(bowl(rand, 0xe8dcb0));
}

export function itemStew() {
  const rand = mulberry32(89);
  const parts = bowl(rand, 0x6a3a1a);
  for (let i = 0; i < 5; i++) {
    const a = rand() * Math.PI * 2, d = rand() * 0.05;
    parts.push(sphere(0.014, 1, 0.6, 1, Math.cos(a) * d, 0.062, Math.sin(a) * d, i % 2 ? 0x4f7a26 : 0x8a5a32, rand, 5, 4));
  }
  return merge(parts);
}

export function itemBissap() {
  const rand = mulberry32(90);
  return merge(bowl(rand, 0x7a0e22, 0.05, 0.09));
}

// --- Rohdot -------------------------------------------------------------------------

export function itemRemedy() {
  const rand = mulberry32(91);
  return merge([
    sphere(0.055, 1, 0.95, 1, 0, 0.05, 0, 0xc8a060, rand, 10, 8),
    sphere(0.032, 1, 1, 1, 0, 0.12, 0, 0xc8a060, rand, 8, 6),
    paint(limb(V(0, 0.14, 0), V(0, 0.18, 0), 0.012, 0.01, 6, true), 0x6a4a2a, { rand }),
    paint((() => { const g = new THREE.TorusGeometry(0.045, 0.006, 4, 12); g.rotateX(Math.PI / 2); g.translate(0, 0.075, 0); return g; })(), 0x4f7a26, { rand }),
  ]);
}

export function itemSalve() {
  const rand = mulberry32(92);
  const pot = new THREE.CylinderGeometry(0.05, 0.05, 0.04, 14);
  pot.translate(0, 0.02, 0);
  const lid = new THREE.CylinderGeometry(0.053, 0.053, 0.014, 14);
  lid.translate(0, 0.046, 0);
  const knob = new THREE.CylinderGeometry(0.012, 0.012, 0.01, 8);
  knob.translate(0, 0.058, 0);
  return merge([paint(pot, 0x9a5634, { rand }), paint(lid, 0xa86040, { rand }), paint(knob, 0xf2ead2, { rand })]);
}

// --- Työkalut -----------------------------------------------------------------------

const HANDLE = 0x7a5a3a;

export function itemFlintAxe() {
  const rand = mulberry32(94);
  const head = new THREE.OctahedronGeometry(0.09, 0);
  displace(head, () => [(rand() - 0.5) * 0.02, (rand() - 0.5) * 0.02, (rand() - 0.5) * 0.01]);
  head.scale(1.6, 1.0, 0.3);
  head.translate(0.1, 0.44, 0);
  return merge([
    paint(limb(V(0, -0.15, 0), V(0, 0.52, 0), 0.02, 0.018, 6, true), 0x6a4a2e, { rand }),
    paint(flatNormals(head), 0x34312f, { rand, jitter: 0.2, shade: (x) => (x > 0.15 ? 1.4 : 1) }),
    lash(0.44, 0.028, 0x7a5a3a), lash(0.4, 0.026, 0x7a5a3a),
  ]);
}

export function itemFlintPick() {
  const rand = mulberry32(95);
  const head = new THREE.OctahedronGeometry(0.08, 0);
  displace(head, () => [(rand() - 0.5) * 0.015, (rand() - 0.5) * 0.015, (rand() - 0.5) * 0.015]);
  head.scale(2.9, 0.6, 0.5);
  head.translate(0, 0.46, 0);
  return merge([
    paint(limb(V(0, -0.15, 0), V(0, 0.5, 0), 0.02, 0.018, 6, true), 0x6a4a2e, { rand }),
    paint(flatNormals(head), 0x34312f, { rand, jitter: 0.2 }),
    lash(0.46, 0.027, 0x7a5a3a),
  ]);
}

export function itemHammer() {
  const rand = mulberry32(96);
  const head = new THREE.BoxGeometry(0.13, 0.065, 0.065, 2, 1, 1);
  displace(head, () => [(rand() - 0.5) * 0.012, (rand() - 0.5) * 0.012, (rand() - 0.5) * 0.012]);
  head.translate(0, 0.42, 0);
  return merge([
    paint(limb(V(0, -0.14, 0), V(0, 0.46, 0), 0.019, 0.017, 6, true), HANDLE, { rand }),
    paint(flatNormals(head), 0x8a8178, { rand, jitter: 0.12 }),
    lash(0.42, 0.026), lash(0.38, 0.024),
  ]);
}

// --- Aseet ---------------------------------------------------------------------------

export function itemSpear() {
  const rand = mulberry32(98);
  const head = new THREE.OctahedronGeometry(0.04, 0);
  displace(head, () => [(rand() - 0.5) * 0.006, (rand() - 0.5) * 0.01, (rand() - 0.5) * 0.004]);
  head.scale(0.9, 3.4, 0.3);
  head.translate(0, 1.08, 0);
  return merge([
    paint(limb(V(0, -0.45, 0), V(0, 0.98, 0), 0.017, 0.015, 6, true), 0x6a4a2e, { rand }),
    paint(flatNormals(head), 0x3b3836, { rand, jitter: 0.2 }),
    lash(0.97, 0.02), lash(0.93, 0.019),
  ]);
}

// Jousen kaari XY-tasossa: kahva origossa, kärjet ylhäällä ja alhaalla (-X
// kohti ampujaa). recurve = kärjet kääntyvät eteenpäin.
export function bowPoints(recurve = false, n = 10, long = 1) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * 2 - 1;  // -1..1
    const y = t * 0.62 * long;
    let x = 0.12 * (1 - t * t);    // kaari eteenpäin keskeltä
    if (recurve) x += Math.pow(Math.abs(t), 6) * 0.08;
    pts.push(V(x, y, 0));
  }
  return pts;
}

// Sessio 22: jousityylit (puulaji, kaarre, pituus, kärjet, rubiini).
export const BOW_STYLES = {
  bow: { recurve: false, col: 0x7a5634, grip: 0xb39a68 },
  sinew_bow: { recurve: true, col: 0x4a3020, grip: 0x8a6a40, tips: 0xe8dfca },
  hardwood_bow: { recurve: false, long: 1.14, col: 0x3e281b, grip: 0x6b4428 },
  heartwood_bow: { recurve: true, long: 1.08, thick: 1.2, col: 0x7a3420, grip: 0x4a2c18, tips: 0x8d9298 },
  ruby_bow: { recurve: true, col: 0x2e2626, grip: 0x7a3420, tips: 0x4d5257, gem: true },
};

export function itemBowBody(style = false) {
  const st = typeof style === 'object' ? style : (style ? BOW_STYLES.sinew_bow : BOW_STYLES.bow);
  const rand = mulberry32(st.recurve ? 99 : 100);
  const pts = bowPoints(st.recurve, 10, st.long || 1);
  const th = st.thick || 1;
  const parts = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const t0 = Math.abs(i / (pts.length - 1) * 2 - 1), t1 = Math.abs((i + 1) / (pts.length - 1) * 2 - 1);
    parts.push(paint(limb(pts[i], pts[i + 1], (0.016 - t0 * 0.008) * th, (0.016 - t1 * 0.008) * th, 5, true), st.col, { rand, jitter: 0.06 }));
  }
  // Kahvan sidos ja kärjet
  const grip = new THREE.CylinderGeometry(0.02 * th, 0.02 * th, 0.1, 8);
  grip.translate(pts[5].x, 0, 0);
  parts.push(paint(grip, st.grip, { rand, jitter: 0.12 }));
  if (st.tips) {
    for (const p of [pts[0], pts[pts.length - 1]]) parts.push(sphere(0.012, 1, 1.6, 1, p.x, p.y, 0, st.tips, rand, 6, 4));
  }
  const geo = merge(parts);
  if (st.gem) {
    const g = new THREE.OctahedronGeometry(0.022, 0);
    g.scale(0.8, 1.4, 0.8);
    g.translate(pts[5].x - 0.024, 0.0, 0);
    const gp = paint(flatNormals(g), 0xd3172e, { rand, jitter: 0.15 });
    const all = merge([geo, gp]);
    all.userData.glowGeo = glowShell([gp], 1.15);
    return all;
  }
  return geo;
}

export function itemBow(style = false) {
  const st = typeof style === 'object' ? style : (style ? BOW_STYLES.sinew_bow : BOW_STYLES.bow);
  const pts = bowPoints(st.recurve, 10, st.long || 1);
  const a = pts[0], b = pts[pts.length - 1];
  const string = paint(limb(a, b, 0.0025, 0.0025, 4), 0xe8dcc0, { jitter: 0 });
  const body = itemBowBody(st);
  const geo = merge([body, string]);
  if (body.userData.glowGeo) geo.userData.glowGeo = body.userData.glowGeo;
  return geo;
}

// Yksi nuoli: kärki +Y-suuntaan, pituus noin 0,75 m (y -0,1..0,65).
export function makeArrowGeometry(kind = 'arrow_flint') {
  const rand = mulberry32(101);
  const parts = [paint(limb(V(0, -0.1, 0), V(0, 0.6, 0), 0.0075, 0.0075, 5, true), 0xa8885a, { rand })];
  if (kind === 'arrow_wood') {
    const tip = new THREE.ConeGeometry(0.007, 0.06, 5);
    tip.translate(0, 0.63, 0);
    parts.push(paint(tip, 0x6e5238, { rand }));
  } else {
    const head = new THREE.OctahedronGeometry(0.018, 0);
    head.scale(0.8, 2.2, 0.3);
    head.translate(0, 0.63, 0);
    const headCol = { arrow_bone: 0xe8dfca, arrow_copper: 0xc27a45, arrow_iron: 0x8d9298 }[kind] || 0x34312f;
    parts.push(paint(flatNormals(head), headCol, { rand, jitter: 0.15 }));
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      // Sulat: vaaleat ja yksi punainen, jotta lentävä nuoli erottuu.
      const f = strip([V(0, -0.09, 0), V(0, -0.02, 0), V(0, 0.02, 0)], [0.0, 0.034, 0.005], V(Math.cos(a), 0, Math.sin(a)), i === 0 ? 0xe0402a : 0xf2ede2, rand);
      f.translate(Math.cos(a) * 0.012, 0, Math.sin(a) * 0.012);
      parts.push(f);
    }
  }
  return merge(parts);
}

export function itemArrows(kind) {
  const parts = [];
  for (let i = 0; i < 3; i++) {
    const g = makeArrowGeometry(kind).clone();
    g.rotateZ((i - 1) * 0.12);
    g.translate((i - 1) * 0.02, 0, 0);
    parts.push(g);
  }
  return merge(parts);
}

export function createItemModels2() {
  return {
    flint: itemFlint(),
    bone: itemBone(),
    feather: itemFeather(),
    seashell: itemShell(),
    reed: itemReed(),
    bamboo: itemBamboo(),
    palm_leaf: itemPalmLeaf(),
    gum: itemGum(),
    rope: itemRope(),
    sinew: itemSinew(),
    gazelle_pelt: itemPelt(0xc8a070, 102),
    monkey_pelt: itemPelt(0x8a8478, 103),
    fox_pelt: itemPelt(0xe0c08a, 104),
    leather: itemLeather(),
    shea_butter: itemSheaButter(),
    mushroom_brown: itemMushroom('brown'),
    mushroom_pale: itemMushroom('pale'),
    mushroom_red: itemMushroom('red'),
    mushroom_termite: itemMushroom('termite'),
    roasted_mushroom: itemMushroom('roasted'),
    cooked_meat: itemCookedMeat(),
    jujube: itemJujube(),
    banana: itemBanana(),
    coconut: itemCoconut(),
    baobab_fruit: itemBaobabFruit(),
    shea_nuts: itemNuts(0x8a5a30, 84),
    roasted_nuts: itemNuts(0x5a3418, 105),
    moringa: itemMoringa(),
    hibiscus: itemHibiscus(),
    fonio: itemFonio(),
    fonio_porridge: itemPorridge(),
    meat_stew: itemStew(),
    bissap: itemBissap(),
    herbal_remedy: itemRemedy(),
    shea_salve: itemSalve(),
    stone_knife: userKnife(), // sessio 33: uusi malli tekstuureineen (ennen itemKnife)
    flint_axe: itemFlintAxe(),
    flint_pick: itemFlintPick(),
    hammer: itemHammer(),
    torch: userTorch(), // sessio 33: käyttäjän malli (ennen itemTorch)
    spear: itemSpear(),
    bow: itemBow(BOW_STYLES.bow),
    sinew_bow: itemBow(BOW_STYLES.sinew_bow),
    hardwood_bow: itemBow(BOW_STYLES.hardwood_bow),
    heartwood_bow: itemBow(BOW_STYLES.heartwood_bow),
    ruby_bow: itemBow(BOW_STYLES.ruby_bow),
    arrow_wood: itemArrows('arrow_wood'),
    arrow_bone: itemArrows('arrow_bone'),
    arrow_flint: itemArrows('arrow_flint'),
    arrow_copper: itemArrows('arrow_copper'),
    arrow_iron: itemArrows('arrow_iron'),
  };
}
