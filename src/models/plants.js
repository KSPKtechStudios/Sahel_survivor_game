// Pensaat, saniaiset, tumbleweed ja ruohotupsut.
import * as THREE from 'three';
import { mulberry32 } from '../noise.js';
import { V, paint, limb, flatNormals, strip, merge } from './util.js';

// Kuivunut pensas: ohuita oksia ja muutama kuiva lehtitupsu.
export function makeBush(seed) {
  const rand = mulberry32(seed);
  const parts = [];
  const cols = [0x93806a, 0xa38f78, 0x8a7d70];
  const n = 11 + Math.floor(rand() * 6);
  const H = 0.8 + rand() * 0.6;
  for (let i = 0; i < n; i++) {
    const a = rand() * Math.PI * 2;
    const spread = 0.4 + rand() * 0.7;
    const mid = V(Math.cos(a) * spread * 0.4, H * (0.35 + rand() * 0.2), Math.sin(a) * spread * 0.4);
    const tip = V(Math.cos(a + (rand() - 0.5) * 0.6) * spread, H * (0.6 + rand() * 0.5), Math.sin(a + (rand() - 0.5) * 0.6) * spread);
    const col = cols[Math.floor(rand() * cols.length)];
    parts.push(paint(limb(V(0, -0.05, 0), mid, 0.03, 0.022, 3), col, { rand }));
    parts.push(paint(limb(mid, tip, 0.022, 0.008, 3), col, { rand }));
    if (rand() < 0.55) {
      const side = V(tip.x * 0.8 + (rand() - 0.5) * 0.4, tip.y + 0.1 + rand() * 0.15, tip.z * 0.8 + (rand() - 0.5) * 0.4);
      parts.push(paint(limb(mid.clone().lerp(tip, 0.5), side, 0.012, 0.005, 3), col, { rand }));
    }
    if (rand() < 0.45) {
      let leaf = new THREE.IcosahedronGeometry(0.12 + rand() * 0.08, 0);
      leaf.scale(1, 0.6, 1);
      leaf.translate(tip.x, tip.y, tip.z);
      leaf = flatNormals(leaf);
      parts.push(paint(leaf, rand() < 0.5 ? 0xa48e58 : 0xb09a62, { rand, jitter: 0.15 }));
    }
  }
  return merge(parts);
}

// Saniainen (sademetsän aluskasvillisuus): kaartuvia lehtiä keskeltä ulos.
export function makeFern(seed) {
  const rand = mulberry32(seed);
  const parts = [];
  const n = 9 + Math.floor(rand() * 4);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rand() * 0.4;
    const len = 0.8 + rand() * 0.6;
    const elev = 0.7 + rand() * 0.5;
    const dir = V(Math.cos(a), 0, Math.sin(a));
    const side = V(-Math.sin(a), 0, Math.cos(a));
    const pts = [];
    for (let s = 0; s <= 4; s++) {
      const t = s / 4;
      const d = t * len;
      pts.push(V(dir.x * d * Math.cos(elev) * 0.9, Math.sin(elev) * d - t * t * len * 0.55, dir.z * d * Math.cos(elev) * 0.9));
    }
    const widths = pts.map((_, s) => Math.sin((s / 4) * Math.PI) * 0.22 + 0.02);
    const col = rand() < 0.5 ? 0x4f7d2e : 0x66953a;
    parts.push(strip(pts, widths, side, col, rand, (x, y) => 0.6 + Math.min(0.4, y * 0.8)));
  }
  return merge(parts);
}

// Tumbleweed: pallomainen oksavyyhti.
export function makeTumbleweed(seed) {
  const rand = mulberry32(seed);
  const parts = [];
  const R = 0.5;
  const pts = [];
  for (let i = 0; i < 64; i++) {
    const u = rand() * 2 - 1;
    const t = rand() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);
    const rr = R * (0.7 + rand() * 0.3);
    pts.push(V(Math.cos(t) * s * rr, u * rr, Math.sin(t) * s * rr));
  }
  // Jokainen piste yhdistetään lähimpiin naapureihin kaarevalla oksalla,
  // jonka keskikohta työnnetään pallon pinnalle -> pyöreä vyyhti.
  for (let i = 0; i < pts.length; i++) {
    const near = pts
      .map((p, j) => ({ j, d: p.distanceTo(pts[i]) }))
      .filter((e) => e.j !== i)
      .sort((a, b) => a.d - b.d);
    for (let k = 0; k < 3; k++) {
      const j = near[k + Math.floor(rand() * 2)].j;
      if (j < i && k > 0) continue;
      const a = pts[i];
      const b = pts[j];
      const mid = a.clone().add(b).multiplyScalar(0.5);
      mid.setLength(R * (0.8 + rand() * 0.25));
      const col = rand() < 0.5 ? 0xb49c6c : 0x9c8256;
      parts.push(paint(limb(a, mid, 0.01, 0.009, 3), col, { rand, jitter: 0.12 }));
      parts.push(paint(limb(mid, b, 0.009, 0.008, 3), col, { rand, jitter: 0.12 }));
    }
  }
  for (let i = 0; i < 14; i++) {
    const a = pts[Math.floor(rand() * pts.length)];
    const b = pts[Math.floor(rand() * pts.length)];
    const mid = a.clone().add(b).multiplyScalar(0.25);
    parts.push(paint(limb(a, mid, 0.01, 0.008, 3), 0x8e7550, { rand }));
  }
  return merge(parts);
}

// Ruohotupsu. Normaalit osoittavat ylös, jotta valaistus on pehmeä.
export function makeGrassTuft(seed, palette = 'dry') {
  const rand = mulberry32(seed);
  const n = 10 + Math.floor(rand() * 6);
  const pos = [];
  const col = [];
  const P = palette === 'green'
    ? { base: 0x34501d, tips: [0x6f9a38, 0x7fa842, 0x5f8a30] }
    : { base: 0x7d6d3e, tips: [0xd9c58a, 0xc9b06a, 0xbfae78] };
  const base = new THREE.Color(P.base);
  const tipCols = P.tips.map((c) => new THREE.Color(c));
  const tall = palette === 'green' ? 1.25 : 1;
  for (let i = 0; i < n; i++) {
    const a = rand() * Math.PI * 2;
    const r = rand() * 0.12;
    const bx = Math.cos(a) * r, bz = Math.sin(a) * r;
    const h = (0.35 + rand() * 0.45) * tall;
    const lean = 0.1 + rand() * 0.25;
    const la = a + (rand() - 0.5) * 0.8;
    const w = 0.025 + rand() * 0.015;
    const px = -Math.sin(la) * w, pz = Math.cos(la) * w;
    const tip = tipCols[Math.floor(rand() * tipCols.length)];
    pos.push(bx - px, 0, bz - pz, bx + px, 0, bz + pz, bx + Math.cos(la) * lean, h, bz + Math.sin(la) * lean);
    col.push(base.r, base.g, base.b, base.r, base.g, base.b, tip.r, tip.g, tip.b);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  const normals = new Float32Array(pos.length);
  for (let i = 1; i < normals.length; i += 3) normals[i] = 1;
  g.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  g.computeBoundingSphere();
  return g;
}
