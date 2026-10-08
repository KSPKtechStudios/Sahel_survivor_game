// Pensaat, saniaiset, tumbleweed ja ruohotupsut.
import * as THREE from 'three';
import { mulberry32 } from '../noise.js';
import { leafCards, V, paint, limb, flatNormals, strip, merge } from './util.js';

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
      // Sessio 23: kuivat lehtiryppäät lehtikortteina.
      const r = 0.12 + rand() * 0.08;
      parts.push(leafCards(tip, V(r * 1.4, r, r * 1.4), 0, rand() < 0.5 ? 0xa48e58 : 0xb09a62, rand, 'acacia', 1.6, 0.32));
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
    for (let s = 0; s <= 3; s++) {
      const t = s / 3;
      const d = t * len;
      pts.push(V(dir.x * d * Math.cos(elev) * 0.9, Math.sin(elev) * d - t * t * len * 0.55, dir.z * d * Math.cos(elev) * 0.9));
    }
    const widths = pts.map((_, s) => Math.sin((s / 3) * Math.PI) * 0.24 + 0.02);
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

// Bamburyhmä: tiheä nippu korkeita, nivelikkäitä varsia.
export function makeBamboo(seed) {
  const rand = mulberry32(seed);
  const parts = [];
  const n = 9 + Math.floor(rand() * 6);
  for (let i = 0; i < n; i++) {
    const a = rand() * Math.PI * 2;
    const r = rand() * 0.5;
    const H = 5 + rand() * 4;
    const lean = 0.08 + rand() * 0.12;
    const b = V(Math.cos(a) * r, -0.1, Math.sin(a) * r);
    const t = V(b.x + Math.cos(a) * H * lean, H, b.z + Math.sin(a) * H * lean);
    const segs = 3;
    for (let s = 0; s < segs; s++) {
      const p0 = b.clone().lerp(t, s / segs);
      const p1 = b.clone().lerp(t, (s + 1) / segs);
      parts.push(paint(limb(p0, p1, 0.055, 0.05, 4), s % 2 ? 0x7a9a3a : 0x6d8c34, { rand, jitter: 0.06 }));
    }
    // Lehtitupsut latvassa
    for (let l = 0; l < 2; l++) {
      const tp = b.clone().lerp(t, 0.7 + l * 0.12);
      const la = rand() * Math.PI * 2;
      const dir = V(Math.cos(la), 0, Math.sin(la));
      const side = V(-Math.sin(la), 0, Math.cos(la));
      const pts = [tp, tp.clone().addScaledVector(dir, 0.5).add(V(0, 0.1, 0)), tp.clone().addScaledVector(dir, 1.0).add(V(0, -0.15, 0))];
      parts.push(strip(pts, [0.04, 0.16, 0.03], side, 0x5f8a30, rand));
    }
  }
  return merge(parts);
}

// Tiheikkö: matala, leveälehtinen ja vaikeakulkuinen pensaikko.
export function makeThicket(seed) {
  const rand = mulberry32(seed);
  const parts = [];
  const cols = [0x2f5622, 0x3b6a2a, 0x46782f];
  const n = 6 + Math.floor(rand() * 4);
  for (let i = 0; i < n; i++) {
    const a = rand() * Math.PI * 2;
    const r = rand() * 0.9;
    let g = new THREE.IcosahedronGeometry(0.55 + rand() * 0.35, 0);
    const jr = mulberry32(seed * 31 + i);
    g.translate(0, 0, 0);
    const pos = g.attributes.position;
    for (let v = 0; v < pos.count; v++) {
      const x = pos.getX(v), y = pos.getY(v), z = pos.getZ(v);
      const kk = 0.85 + Math.abs(Math.sin(x * 9.1 + y * 7.3 + z * 5.7 + i)) * 0.3;
      pos.setXYZ(v, x * kk, y * kk * 0.85, z * kk);
    }
    const cy = 0.45 + rand() * 0.5;
    g.scale(0.78, 0.78, 0.78);
    g.translate(Math.cos(a) * r, cy, Math.sin(a) * r);
    g = flatNormals(g);
    const col = cols[Math.floor(rand() * 3)];
    parts.push(paint(g, col, { rand: jr, jitter: 0.14, shade: (x, y) => 0.4 + Math.min(0.3, y * 0.3) }));
    // Sessio 23: lehtikortit möhkäleen pinnalle.
    parts.push(leafCards(V(Math.cos(a) * r, cy, Math.sin(a) * r), V(0.62, 0.52, 0.62), rand() * 3, col, jr, 'broad', 1.3, 0.6));
  }
  for (let i = 0; i < 8; i++) {
    const a = rand() * Math.PI * 2;
    parts.push(paint(limb(V(0, -0.05, 0), V(Math.cos(a) * 0.9, 0.9 + rand() * 0.5, Math.sin(a) * 0.9), 0.03, 0.012, 3), 0x4a3a28, { rand }));
  }
  return merge(parts);
}

// Kandelaaberipiikkipuu (Euphorbia): mehikasvi, jonka haarat nousevat kuin kynttelikkö.
export function makeEuphorbia(seed) {
  const rand = mulberry32(seed);
  const parts = [];
  const col = [0x5d7a3a, 0x6b8442][seed % 2];
  const H = 1.6 + rand() * 1.2;
  parts.push(paint(limb(V(0, -0.1, 0), V(0, H, 0), 0.16, 0.13, 6, true), 0x6e6a48, { rand }));
  const n = 4 + Math.floor(rand() * 4);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rand() * 0.4;
    const out = 0.4 + rand() * 0.5;
    const hb = H * (0.75 + rand() * 0.2);
    const elbow = V(Math.cos(a) * out, hb + 0.15, Math.sin(a) * out);
    const tip = V(elbow.x, hb + 0.8 + rand() * 1.0, elbow.z);
    parts.push(paint(limb(V(0, hb, 0), elbow, 0.1, 0.09, 5), col, { rand }));
    parts.push(paint(limb(elbow, tip, 0.09, 0.07, 5, true), col, { rand }));
  }
  return merge(parts);
}

// Ruoko vesirajassa (koriste).
export function makeReeds(seed) {
  const rand = mulberry32(seed);
  const pos = [];
  const col = [];
  const base = new THREE.Color(0x4a5a2a);
  const tips = [new THREE.Color(0x9aa85a), new THREE.Color(0xb8b070), new THREE.Color(0x7f9a48)];
  const n = 14 + Math.floor(rand() * 8);
  for (let i = 0; i < n; i++) {
    const a = rand() * Math.PI * 2;
    const r = rand() * 0.35;
    const bx = Math.cos(a) * r, bz = Math.sin(a) * r;
    const h = 1.2 + rand() * 1.0;
    const la = a + (rand() - 0.5);
    const lean = 0.05 + rand() * 0.2;
    const w = 0.02 + rand() * 0.01;
    const px = -Math.sin(la) * w, pz = Math.cos(la) * w;
    const tip = tips[Math.floor(rand() * 3)];
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

// Leveälehtinen aluskasvillisuus (koriste sademetsässä).
export function makeUndergrowth(seed) {
  const rand = mulberry32(seed);
  const parts = [];
  const n = 4 + Math.floor(rand() * 3);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rand() * 0.5;
    const len = 0.5 + rand() * 0.5;
    const dir = V(Math.cos(a), 0, Math.sin(a));
    const side = V(-Math.sin(a), 0, Math.cos(a));
    const stemTop = V(dir.x * len * 0.4, 0.35 + rand() * 0.3, dir.z * len * 0.4);
    const pts = [stemTop, stemTop.clone().addScaledVector(dir, len * 0.5).add(V(0, 0.06, 0)), stemTop.clone().addScaledVector(dir, len).add(V(0, -0.12, 0))];
    parts.push(paint(limb(V(0, 0, 0), stemTop, 0.012, 0.01, 3), 0x3e5a24, { rand }));
    parts.push(strip(pts, [0.06, 0.34, 0.04], side, rand() < 0.5 ? 0x3f6e2a : 0x4f8034, rand, (x, y) => 0.7 + Math.min(0.3, y)));
  }
  return merge(parts);
}
