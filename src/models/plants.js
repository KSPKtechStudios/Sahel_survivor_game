// Pensaat, saniaiset, tumbleweed ja ruohotupsut.
import * as THREE from 'three';
import { mulberry32 } from '../noise.js';
import { leafCards, V, paint, limb, strip, merge } from './util.js';

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
// Sessio 28: uusi malli (käyttäjä: bambun tekstuurit huonot). Pyöreät,
// hieman kaartuvat varret; nivelet tummina renkaina ja niiden alla
// vahamainen vaalea vyö; vanhemmat varret kellertäviä; tyvellä kuivia
// tuppia. Yläosan nivelistä lähtee ohuita sivuoksia, joiden kärjessä on
// viuhka kapeita, roikkuvia lehtiä.
function bambooLeaves(parts, at, dir, rand, col) {
  const P = [], N = [], C = [];
  const n = 4 + Math.floor(rand() * 3);
  const c = new THREE.Color(col);
  for (let i = 0; i < n; i++) {
    const a = Math.atan2(dir.z, dir.x) + (i - (n - 1) / 2) * 0.55 + (rand() - 0.5) * 0.3;
    const L = 0.2 + rand() * 0.1, W = 0.028 + rand() * 0.01;
    const d = V(Math.cos(a), -0.35 - rand() * 0.4, Math.sin(a)).normalize();
    const side = V(-Math.sin(a), 0, Math.cos(a));
    const tip = at.clone().addScaledVector(d, L).add(V(0, -L * 0.25, 0));
    const mid = at.clone().addScaledVector(d, L * 0.45);
    const k = 0.85 + rand() * 0.3;
    const tri = (p, q, r) => {
      for (const v of [p, q, r]) { P.push(v.x, v.y, v.z); N.push(0.2 * d.x, 0.95, 0.2 * d.z); C.push(c.r * k, c.g * k, c.b * k); }
    };
    const l = mid.clone().addScaledVector(side, W), rr = mid.clone().addScaledVector(side, -W);
    tri(at, l, tip);
    tri(at, tip, rr);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
  parts.push(g);
}

export function makeBamboo(seed, q = 1) {
  const rand = mulberry32(seed);
  const parts = [];
  const n = 6 + Math.floor(rand() * 4);
  const greens = [0x5f9032, 0x6c9c36, 0x4f8030, 0x8f9a3c, 0xa0a246];
  for (let i = 0; i < n; i++) {
    const a = rand() * Math.PI * 2;
    const r = rand() * 0.5;
    const H = 6 + rand() * 4;
    const lean = 0.06 + rand() * 0.12;
    const R = 0.045 + rand() * 0.025;
    const old = rand() < 0.35;
    const col = old ? greens[3 + Math.floor(rand() * 2)] : greens[Math.floor(rand() * 3)];
    const b = V(Math.cos(a) * r, -0.1, Math.sin(a) * r);
    const dir = V(Math.cos(a), 0, Math.sin(a));
    // Kaartuva varsi: sivusiirtymä kasvaa korkeuden mukana neliöllisesti.
    const at = (t) => V(b.x + dir.x * H * lean * t * t, b.y + H * t, b.z + dir.z * H * lean * t * t);
    if (!q) {
      // Kaukoversio: varsi muutamana palana, lehtiviuhkat latvassa.
      for (let s = 0; s < 4; s++) {
        const t0 = s / 4, t1 = (s + 1) / 4;
        parts.push(paint(limb(at(t0), at(t1), R * (1 - 0.45 * t0), R * (1 - 0.45 * t1), 5), col, { rand, jitter: 0.04 }));
      }
      for (let l = 0; l < 4; l++) bambooLeaves(parts, at(0.7 + l * 0.1), V(Math.cos(a + l * 1.9), 0, Math.sin(a + l * 1.9)), rand, 0x568e2e);
      continue;
    }
    const segs = Math.round(H / 0.62);
    for (let s = 0; s < segs; s++) {
      const t0 = s / segs, t1 = (s + 1) / segs;
      const p0 = at(t0), p1 = at(t1);
      const r0 = R * (1 - 0.45 * t0), r1 = R * (1 - 0.45 * t1);
      const seg = p1.clone().sub(p0), len = seg.length();
      seg.divideScalar(len);
      // Nivel tummana renkaana, sen yläpuolella vahamainen vaalea vyö
      // (varren sävy vaalenee kohti seuraavaa niveltä).
      const pr = p0.clone().addScaledVector(seg, 0.045);
      parts.push(paint(limb(p0, pr, r0 * 1.1, r0 * 1.06, 6), col, { rand, jitter: 0.03, shade: () => 0.58 }));
      const shade = (x, y, z) => {
        const u = ((x - p0.x) * seg.x + (y - p0.y) * seg.y + (z - p0.z) * seg.z) / len;
        return 1.12 - 0.22 * Math.pow(Math.min(1, u), 2.5);
      };
      parts.push(paint(limb(pr, p1, r0, r1, 6, false, 2), col, { rand, jitter: 0.04, shade }));
      // Kuivat tupet tyven nivelissä.
      if (s < 2 && rand() < 0.6) {
        parts.push(paint(limb(p0, p0.clone().addScaledVector(seg, 0.22), r0 * 1.25, r0 * 1.05, 7, false, 1), 0x9a7a4a, { rand, jitter: 0.1 }));
      }
      // Sivuoksat ja lehtiviuhkat yläosan nivelissä.
      if (t0 > 0.45 && rand() < 0.75) {
        const ba = rand() * Math.PI * 2;
        const bd = V(Math.cos(ba), 0.35 + rand() * 0.3, Math.sin(ba)).normalize();
        const bl = 0.3 + rand() * 0.35;
        const tip = p0.clone().addScaledVector(bd, bl);
        parts.push(paint(limb(p0, tip, 0.01, 0.006, 3), col, { rand }));
        bambooLeaves(parts, tip, V(bd.x, 0, bd.z), rand, old ? 0x6a8a30 : 0x4f8a2a);
        bambooLeaves(parts, p0.clone().lerp(tip, 0.55), V(bd.z, 0, -bd.x), rand, 0x568e2e);
      }
    }
    // Latvan lehtiviuhkat.
    const top = at(1);
    for (let l = 0; l < 2; l++) bambooLeaves(parts, top, V(Math.cos(a + l * 2.5), 0, Math.sin(a + l * 2.5)), rand, 0x5a9230);
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
    rand(); // (ennen ytimen koko; arvontajärjestys säilyy)
    const jr = mulberry32(seed * 31 + i);
    const cy = 0.45 + rand() * 0.5;
    const col = cols[Math.floor(rand() * 3)];
    // Sessio 26: pelkät lehtikortit (kiinteä ydin poistettiin), tiheämmin.
    parts.push(leafCards(V(Math.cos(a) * r, cy, Math.sin(a) * r), V(0.7, 0.58, 0.7), rand() * 3, col, jr, 'broad', 2.4, 0.66, 0.8));
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
