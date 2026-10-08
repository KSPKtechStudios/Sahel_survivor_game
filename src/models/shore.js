// Sessio 25: rannat ja vedenalainen maailma.
// - Levä: pystyssä huojuvia, aaltoilevia nauhoja järvien ja meren pohjassa.
// - Pohjakivet: pyöristyneitä kiviä, joissa levän vihreää.
// - Rantakivikko: isompia, märkiä kiviä vesirajassa.
// - Rantakivet ja simpukat: pieniä kiviä ja ajautuneita simpukankuoria.
// Kaikki vertex-väritettyjä, kevyitä (vedenalaiset eivät näy tarkasti).
import * as THREE from 'three';
import { mulberry32 } from '../noise.js';
import { V, paint, merge, displace, strip, flatNormals } from './util.js';

function rock(rand, r, cols, algae = 0) {
  let g = new THREE.IcosahedronGeometry(r, 1);
  const s = rand() * 100;
  displace(g, (x, y, z) => {
    const n = Math.sin(x * 7 + s) * Math.cos(z * 6 - s) * 0.5 + Math.sin(y * 9 + s) * 0.3;
    return [x * n * 0.18, y * n * 0.12, z * n * 0.18];
  });
  g.scale(1.2, 0.55 + rand() * 0.25, 1 + rand() * 0.3);
  g = flatNormals(g);
  const base = cols[Math.floor(rand() * cols.length)];
  const algaeC = new THREE.Color(0x3e4a22);
  g = paint(g, base, { rand, jitter: 0.12 });
  if (algae > 0) {
    // Levä alapinnoilla ja kyljissä (yläpinta jää paljaammaksi).
    const p = g.attributes.position, c = g.attributes.color;
    for (let i = 0; i < p.count; i++) {
      const k = algae * (1 - Math.min(1, Math.max(0, p.getY(i) / (r * 0.6)))) * (0.6 + 0.4 * Math.sin(p.getX(i) * 13 + s));
      if (k <= 0) continue;
      c.setXYZ(i, c.getX(i) + (algaeC.r - c.getX(i)) * k, c.getY(i) + (algaeC.g - c.getY(i)) * k, c.getZ(i) + (algaeC.b - c.getZ(i)) * k);
    }
  }
  return g;
}

export function makeKelp(seed) {
  const rand = mulberry32(seed);
  const parts = [];
  const n = 4 + Math.floor(rand() * 4);
  const cols = [0x4a5222, 0x5e5a26, 0x3a4a20, 0x6a5e2a];
  for (let i = 0; i < n; i++) {
    const a = rand() * Math.PI * 2, r = rand() * 0.25;
    const bx = Math.cos(a) * r, bz = Math.sin(a) * r;
    const H = 0.6 + rand() * 1.3;
    const ph = rand() * 6;
    const side = V(Math.cos(a + 1.57), 0, Math.sin(a + 1.57));
    const pts = [], widths = [];
    const segs = 6;
    for (let s = 0; s <= segs; s++) {
      const t = s / segs;
      pts.push(V(bx + Math.sin(t * 4 + ph) * 0.12 * t, t * H, bz + Math.cos(t * 3 + ph) * 0.1 * t));
      widths.push((0.05 + 0.07 * Math.sin(t * Math.PI)) * (1 - t * 0.4));
    }
    parts.push(strip(pts, widths, side, cols[Math.floor(rand() * cols.length)], rand, (x, y) => 0.55 + 0.45 * Math.min(1, y / H)));
  }
  return merge(parts);
}

export function makeSeabedRocks(seed) {
  const rand = mulberry32(seed);
  const parts = [];
  const cols = [0x6e665a, 0x5e584e, 0x7a7062];
  const n = 2 + Math.floor(rand() * 4);
  for (let i = 0; i < n; i++) {
    const g = rock(rand, 0.15 + rand() * 0.35, cols, 0.75);
    const a = rand() * Math.PI * 2, r = i === 0 ? 0 : 0.3 + rand() * 0.6;
    g.translate(Math.cos(a) * r, 0.02, Math.sin(a) * r);
    parts.push(g);
  }
  return merge(parts);
}

export function makeShoreRocks(seed) {
  const rand = mulberry32(seed);
  const parts = [];
  const cols = [0x5a5650, 0x6a645a, 0x4e4a44, 0x7a7266];
  const n = 3 + Math.floor(rand() * 4);
  for (let i = 0; i < n; i++) {
    const big = i < 2;
    const g = rock(rand, big ? 0.35 + rand() * 0.45 : 0.1 + rand() * 0.2, cols, 0.45);
    const a = rand() * Math.PI * 2, r = i === 0 ? 0 : 0.4 + rand() * 1.0;
    g.translate(Math.cos(a) * r, big ? 0.05 : 0.02, Math.sin(a) * r);
    parts.push(g);
  }
  return merge(parts);
}

// Simpukankuori: litistetty puolipallo uurteineen (kampasimpukka) tai
// kartiomainen kotilo.
function shell(rand) {
  const cols = [0xe8dcc8, 0xe6c8b0, 0xd8c0a0, 0xf0e6d8, 0xc8a890];
  const col = cols[Math.floor(rand() * cols.length)];
  if (rand() < 0.6) {
    let g = new THREE.SphereGeometry(0.045 + rand() * 0.025, 10, 4, 0, Math.PI * 2, 0, Math.PI / 2);
    displace(g, (x, y, z) => {
      const a = Math.atan2(z, x);
      return [0, Math.abs(Math.sin(a * 6)) * 0.004, 0];
    });
    g.scale(1, 0.45, 1.1);
    if (rand() < 0.4) g.rotateX(Math.PI); // ylösalaisin
    g = flatNormals(g);
    return paint(g, col, { rand, jitter: 0.08 });
  }
  let g = new THREE.ConeGeometry(0.03, 0.09, 7, 3);
  displace(g, (x, y, z) => [x * Math.sin(y * 60) * 0.15, 0, z * Math.sin(y * 60) * 0.15]);
  g.rotateZ(Math.PI / 2);
  g.translate(0, 0.02, 0);
  g = flatNormals(g);
  return paint(g, col, { rand, jitter: 0.1 });
}

export function makeBeachStones(seed) {
  const rand = mulberry32(seed);
  const parts = [];
  const cols = [0x8a8274, 0x9a9282, 0x6e685e, 0xa89c88, 0x7a6a5a];
  const n = 3 + Math.floor(rand() * 5);
  for (let i = 0; i < n; i++) {
    const g = rock(rand, 0.03 + rand() * 0.07, cols, 0);
    g.scale(1, 0.7, 1);
    const a = rand() * Math.PI * 2, r = rand() * 0.6;
    g.translate(Math.cos(a) * r, 0.01, Math.sin(a) * r);
    parts.push(g);
  }
  const ns = 1 + Math.floor(rand() * 3);
  for (let i = 0; i < ns; i++) {
    const g = shell(rand);
    g.rotateY(rand() * Math.PI * 2);
    const a = rand() * Math.PI * 2, r = rand() * 0.7;
    g.translate(Math.cos(a) * r, 0.005, Math.sin(a) * r);
    parts.push(g);
  }
  return merge(parts);
}
