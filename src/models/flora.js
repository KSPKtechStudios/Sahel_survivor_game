// Lisää kasvillisuutta ja pieniä yksityiskohtia biomeihin:
// karitepuu ja doumpalmu (Sahel), kookospalmu ja ajopuu (ranta), villibanaani,
// sammaloituneet rungot ja sienet (sademetsä), aavikkopensas ja luut (aavikko),
// kivikko (vuoristo), lumpeet (järvet), korkea heinä, kukat ja merilevä.
import * as THREE from 'three';
import { mulberry32 } from '../noise.js';
import { V, partRand, displace, paint, limb, flatNormals, strip, merge, tag } from './util.js';

function treeMeta(geo, meta) {
  geo.userData.tree = meta;
  return geo;
}

// Runko kahtena palana kaatokohdan kohdalta (hakattava versio q = 2).
function trunk(base, top, r0, r1, cutY, q, hex, jr, radial) {
  const parts = [];
  if (q === 2) {
    const t = (cutY - base.y) / (top.y - base.y);
    const cut = base.clone().lerp(top, t);
    const rc = r0 + (r1 - r0) * t;
    parts.push(tag(paint(limb(base, cut, r0, rc, radial + 3, false, 9), hex, { rand: jr() }), 'trunk'));
    parts.push(tag(paint(limb(cut, top, rc, r1, radial + 3, false, 9), hex, { rand: jr() }), 'trunk'));
  } else {
    jr(); jr();
    parts.push(paint(limb(base, top, r0, r1, q === 1 ? radial : 4, false, 1), hex, { rand: partRand(0, 0) }));
  }
  return parts;
}

function blob(center, scale, detail, hex, jr, shadeCut = null, rotY = 0) {
  const r = jr();
  let g = new THREE.IcosahedronGeometry(1, detail);
  displace(g, () => [(r() - 0.5) * 0.3, (r() - 0.5) * 0.35, (r() - 0.5) * 0.3]);
  g.scale(scale.x, scale.y, scale.z);
  g.rotateY(rotY);
  g.translate(center.x, center.y, center.z);
  g = flatNormals(g);
  const shade = shadeCut !== null ? (x, y) => (y < shadeCut ? 0.55 : 1.0) : null;
  return paint(g, hex, { rand: r, jitter: 0.12, shade });
}

// Viuhkalehti (doumpalmu): säteittäisiä suikaleita yhdestä pisteestä.
function fanLeaf(at, dir, size, hex, rand, segs) {
  const parts = [];
  const side = V(-dir.z, 0, dir.x).normalize();
  for (let i = 0; i < segs; i++) {
    const t = (i / (segs - 1) - 0.5) * 1.6;
    const d = dir.clone().multiplyScalar(Math.cos(t)).addScaledVector(side, Math.sin(t)).normalize();
    const tip = at.clone().addScaledVector(d, size).add(V(0, size * 0.25 - Math.abs(t) * size * 0.15, 0));
    const mid = at.clone().lerp(tip, 0.5).add(V(0, size * 0.12, 0));
    const s2 = V(-d.z, 0, d.x);
    parts.push(strip([at, mid, tip], [0.05, 0.16, 0.02], s2, hex, rand));
  }
  return parts;
}

// --- Karitepuu (shea): matala, kyhmyinen runko ja tiheä pyöreä latvus ----------------

export function makeSheaTree(seed, q = 1) {
  const rand = mulberry32(seed);
  let k = 0;
  const jr = () => partRand(seed, k++);
  const parts = [];
  const bark = [0x3f342c, 0x4a3d32, 0x362e28][seed % 3];
  const leaves = [0x3c5a24, 0x47662a, 0x52702e];
  const H = 3.8 + rand() * 1.4;
  const base = V(0, -0.25, 0);
  const top = V((rand() - 0.5) * 0.5, H * 0.55, (rand() - 0.5) * 0.5);
  const cutY = 0.8;
  parts.push(...trunk(base, top, 0.3, 0.22, cutY, q, bark, jr, 7));
  const nb = 4 + Math.floor(rand() * 2);
  const tips = [];
  for (let i = 0; i < nb; i++) {
    const a = (i / nb) * Math.PI * 2 + rand() * 0.6;
    const len = 1.0 + rand() * 0.9;
    const tip = V(top.x + Math.cos(a) * len, top.y + 1.0 + rand() * 0.8, top.z + Math.sin(a) * len);
    const j = jr();
    if (q) parts.push(paint(limb(top, tip, 0.14, 0.07, 5), bark, { rand: j }));
    tips.push(tip);
  }
  const crowns = [{ p: V(top.x, H, top.z), s: V(2.2 + rand() * 0.5, 1.5, 2.2 + rand() * 0.5) }];
  for (const t of tips) crowns.push({ p: V(t.x, t.y + 0.5, t.z), s: V(1.4 + rand() * 0.5, 1.1 + rand() * 0.3, 1.4 + rand() * 0.5) });
  crowns.forEach((c, i) => {
    const rot = rand() * Math.PI;
    if (!q && i > 3) { jr(); return; }
    parts.push(blob(c.p, c.s, q ? 1 : 0, leaves[i % leaves.length], jr, c.p.y - c.s.y * 0.3, rot));
  });
  return treeMeta(merge(parts), {
    kind: 'shea', base: base.toArray(), top: top.toArray(), r0: 0.3, r1: 0.22, cutY,
    height: H + 1.5, fallLen: H - cutY + 1.0, logR: 0.3,
  });
}

// --- Doumpalmu: haarautuva palmu, jonka haarojen päissä viuhkalehdet ---------------

export function makeDoumPalm(seed, q = 1) {
  const rand = mulberry32(seed);
  let k = 0;
  const jr = () => partRand(seed, k++);
  const parts = [];
  const bark = [0x6d604f, 0x5f5446][seed % 2];
  const leafCols = [0x6f8a3c, 0x7d9444, 0x8a9a4e];
  const forkY = 2.2 + rand() * 1.2;
  const base = V(0, -0.2, 0);
  const fork = V((rand() - 0.5) * 0.4, forkY, (rand() - 0.5) * 0.4);
  const cutY = 0.8;
  parts.push(...trunk(base, fork, 0.2, 0.17, cutY, q, bark, jr, 7));
  const nb = 2 + Math.floor(rand() * 2);
  for (let i = 0; i < nb; i++) {
    const a = (i / nb) * Math.PI * 2 + rand() * 0.8;
    const len = 1.6 + rand() * 1.4;
    const tip = V(fork.x + Math.cos(a) * len * 0.55, fork.y + len, fork.z + Math.sin(a) * len * 0.55);
    const j = jr();
    parts.push(paint(limb(fork, tip, 0.14, 0.12, q ? 6 : 4), bark, { rand: j }));
    // Joskus haara haarautuu vielä kerran
    const ends = [tip];
    if (rand() < 0.5) {
      const a2 = a + (rand() - 0.5) * 1.4;
      const t2 = V(tip.x + Math.cos(a2) * 0.9, tip.y + 1.0, tip.z + Math.sin(a2) * 0.9);
      const j2 = jr();
      parts.push(paint(limb(tip, t2, 0.11, 0.1, q ? 5 : 3), bark, { rand: j2 }));
      ends.push(t2);
    } else {
      jr();
    }
    for (const e of ends) {
      const nl = q ? 5 : 3;
      for (let l = 0; l < nl; l++) {
        const la = (l / nl) * Math.PI * 2 + rand() * 0.4;
        const dir = V(Math.cos(la), 0.35 + rand() * 0.4, Math.sin(la)).normalize();
        const j3 = jr();
        parts.push(...fanLeaf(e, dir, 1.0 + rand() * 0.4, leafCols[l % 3], j3, q ? 4 : 3));
      }
    }
  }
  return treeMeta(merge(parts), {
    kind: 'doum', base: base.toArray(), top: fork.toArray(), r0: 0.2, r1: 0.17, cutY,
    height: forkY + 4, fallLen: forkY + 2.5 - cutY, logR: 0.22,
  });
}

// --- Kaatunut runko: kuiva (Sahel) tai sammaloitunut (sademetsä) ---------------------

export function makeLog(seed, mossy = false) {
  const rand = mulberry32(seed);
  const parts = [];
  const len = 2.6 + rand() * 1.8;
  const r = 0.22 + rand() * 0.1;
  const bark = mossy ? 0x4a4232 : [0x7a6a58, 0x6e5f4e][seed % 2];
  const a = V(-len / 2, r * 0.8, 0);
  const b = V(len / 2, r * 0.75, (rand() - 0.5) * 0.3);
  parts.push(paint(limb(a, b, r, r * 0.85, 7, true), bark, { rand, shade: (x, y) => (y < r * 0.4 ? 0.7 : 1) }));
  // Oksantyngät
  for (let i = 0; i < 3; i++) {
    const p = a.clone().lerp(b, 0.25 + rand() * 0.6);
    const ang = rand() * Math.PI * 2;
    const tip = V(p.x + (rand() - 0.5) * 0.4, p.y + Math.abs(Math.sin(ang)) * 0.5 + 0.1, p.z + Math.cos(ang) * 0.5);
    parts.push(paint(limb(p, tip, 0.07, 0.03, 4), bark, { rand }));
  }
  if (mossy) {
    // Sammalläiskiä rungon päällä ja pieniä saniaisia
    for (let i = 0; i < 5; i++) {
      const p = a.clone().lerp(b, rand());
      let m = new THREE.IcosahedronGeometry(0.18 + rand() * 0.12, 0);
      m.scale(1.6, 0.45, 1.1);
      m.translate(p.x, p.y + r * 0.85, p.z);
      m = flatNormals(m);
      parts.push(paint(m, rand() < 0.5 ? 0x4d7a2a : 0x5d8a32, { rand, jitter: 0.15 }));
    }
  } else {
    // Halkeama ja vaalea puun pää
    let end = new THREE.CircleGeometry(r * 0.9, 7);
    end.rotateY(Math.PI / 2);
    end.translate(b.x + 0.01, b.y, b.z);
    parts.push(paint(end, 0xb89a72, { rand }));
  }
  return merge(parts);
}

// --- Villibanaani: isot, repaleiset lehdet ---------------------------------------------

export function makeBanana(seed) {
  const rand = mulberry32(seed);
  const parts = [];
  const H = 1.6 + rand() * 1.0;
  const lean = V((rand() - 0.5) * 0.3, H, (rand() - 0.5) * 0.3);
  parts.push(paint(limb(V(0, -0.1, 0), lean, 0.13, 0.09, 6), 0x5a7a34, { rand, shade: (x, y) => 0.75 + Math.min(0.25, y * 0.1) }));
  const n = 7 + Math.floor(rand() * 3);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rand() * 0.5;
    const len = 1.5 + rand() * 0.8;
    const elev = 0.5 + rand() * 0.5;
    const dir = V(Math.cos(a), 0, Math.sin(a));
    const side = V(-Math.sin(a), 0, Math.cos(a));
    const pts = [];
    for (let s = 0; s <= 4; s++) {
      const t = s / 4;
      const d = t * len;
      pts.push(V(lean.x + dir.x * d * Math.cos(elev), lean.y + Math.sin(elev) * d - t * t * len * 0.75, lean.z + dir.z * d * Math.cos(elev)));
    }
    const widths = pts.map((_, s) => Math.sin((s / 4) * Math.PI) * 0.55 + 0.04);
    const col = i % 3 === 0 ? 0x6f8f34 : rand() < 0.5 ? 0x3f7a2a : 0x4c8a30;
    parts.push(strip(pts, widths, side, col, rand, (x, y) => 0.65 + Math.min(0.35, (y / H) * 0.4)));
  }
  return merge(parts);
}

// --- Aavikkopensas (Calotropis): harmaanvihreä, isolehtinen -------------------------

export function makeDesertShrub(seed) {
  const rand = mulberry32(seed);
  const parts = [];
  const n = 5 + Math.floor(rand() * 3);
  for (let i = 0; i < n; i++) {
    const a = rand() * Math.PI * 2;
    const tip = V(Math.cos(a) * (0.3 + rand() * 0.5), 0.7 + rand() * 0.7, Math.sin(a) * (0.3 + rand() * 0.5));
    parts.push(paint(limb(V(0, -0.05, 0), tip, 0.035, 0.02, 4), 0x9a9478, { rand }));
    for (let l = 0; l < 2; l++) {
      const p = V(0, 0, 0).lerp(tip, 0.55 + l * 0.3);
      let leaf = new THREE.OctahedronGeometry(0.18 + rand() * 0.06, 0);
      leaf.scale(1.3, 0.35, 0.9);
      leaf.rotateY(rand() * Math.PI);
      leaf.translate(p.x, p.y, p.z);
      leaf = flatNormals(leaf);
      parts.push(paint(leaf, rand() < 0.5 ? 0x8fa07a : 0x9cab86, { rand, jitter: 0.1 }));
    }
    if (rand() < 0.3) {
      let fl = new THREE.IcosahedronGeometry(0.06, 0);
      fl.translate(tip.x, tip.y + 0.04, tip.z);
      parts.push(paint(flatNormals(fl), 0xc8a0c8, { rand }));
    }
  }
  return merge(parts);
}

// --- Kookospalmu: kalteva runko ja kookospähkinät ----------------------------------

export function makeCoconutPalm(seed, q = 1) {
  const rand = mulberry32(seed);
  let k = 0;
  const jr = () => partRand(seed, k++);
  const parts = [];
  const H = 6.5 + rand() * 2.5;
  const bendA = rand() * Math.PI * 2;
  const bend = 1.8 + rand() * 1.4;
  const n = 6;
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    pts.push(V(Math.cos(bendA) * bend * Math.pow(t, 1.6), -0.2 + t * (H + 0.2), Math.sin(bendA) * bend * Math.pow(t, 1.6)));
  }
  const cutY = 0.8;
  const rAt = (i) => 0.2 - (i / n) * 0.06;
  const cols = [0x8a7a62, 0x7a6b55];
  if (q === 2) {
    const t = (cutY - pts[0].y) / (pts[1].y - pts[0].y);
    const cut = pts[0].clone().lerp(pts[1], t);
    const rc = rAt(0) + (rAt(1) - rAt(0)) * t;
    parts.push(tag(paint(limb(pts[0], cut, rAt(0), rc, 10, false, 6), cols[0], { rand: jr() }), 'trunk'));
    parts.push(tag(paint(limb(cut, pts[1], rc, rAt(1), 10, false, 4), cols[0], { rand: jr() }), 'trunk'));
  } else {
    jr(); jr();
    parts.push(paint(limb(pts[0], pts[1], rAt(0), rAt(1), q ? 7 : 4), cols[0], { rand: partRand(seed, 98) }));
  }
  for (let i = 1; i < n; i++) {
    const j = jr();
    parts.push(paint(limb(pts[i], pts[i + 1], rAt(i), rAt(i + 1), q ? 7 : 4, true), cols[i % 2], { rand: j }));
  }
  const crown = pts[n];
  const nf = 11 + Math.floor(rand() * 3);
  for (let i = 0; i < nf; i++) {
    const a = (i / nf) * Math.PI * 2 + rand() * 0.3;
    const old = i % 4 === 0;
    const elev = old ? -0.35 - rand() * 0.3 : 0.25 + rand() * 0.45;
    const len = 3.0 + rand() * 1.0;
    const dir = V(Math.cos(a), 0, Math.sin(a));
    const side = V(-Math.sin(a), 0, Math.cos(a));
    const segs = q ? 6 : 3;
    const fp = [];
    for (let s = 0; s <= segs; s++) {
      const t = s / segs;
      const d = t * len;
      const droop = (old ? 1.7 : 1.25) * t * t * len * 0.45;
      fp.push(V(crown.x + dir.x * d * Math.cos(elev), crown.y + Math.sin(elev) * d - droop, crown.z + dir.z * d * Math.cos(elev)));
    }
    const widths = fp.map((_, s) => Math.sin((s / segs) * Math.PI) * 0.5 + 0.03);
    const col = old ? 0x9a8a4a : rand() < 0.5 ? 0x4f8a32 : 0x62993a;
    const j = jr();
    if (q || i % 2 === 0) parts.push(strip(fp, widths, side, col, j));
  }
  const fj = jr();
  if (q) {
    const nc = 3 + Math.floor(rand() * 4);
    for (let i = 0; i < nc; i++) {
      const a = rand() * Math.PI * 2;
      let c = new THREE.IcosahedronGeometry(0.17, 0);
      c.scale(1, 1.15, 1);
      c.translate(crown.x + Math.cos(a) * 0.25, crown.y - 0.3 - rand() * 0.15, crown.z + Math.sin(a) * 0.25);
      parts.push(paint(flatNormals(c), rand() < 0.6 ? 0x5a6a2a : 0x6a4a28, { rand: fj, jitter: 0.15 }));
    }
  }
  return treeMeta(merge(parts), {
    kind: 'coconut', base: pts[0].toArray(), top: pts[1].toArray(), r0: rAt(0), r1: rAt(1), cutY,
    height: H + 1, fallLen: H - cutY + 1.5, logR: 0.2,
  });
}

// --- Ajopuu rannalla (poimitaan: puuta) -------------------------------------------

export function makeDriftwood(seed) {
  const rand = mulberry32(seed);
  const len = 0.9 + rand() * 0.6;
  const a = V(-len / 2, 0.06, 0);
  const b = V(len / 2, 0.05, (rand() - 0.5) * 0.25);
  const col = [0xc9bca6, 0xb8ab94, 0xd2c6b0][seed % 3];
  const parts = [paint(limb(a, b, 0.07, 0.05, 6, true), col, { rand, jitter: 0.1 })];
  const m = a.clone().lerp(b, 0.35 + rand() * 0.3);
  parts.push(paint(limb(m, V(m.x + 0.25, 0.08, m.z + (rand() < 0.5 ? 0.25 : -0.25)), 0.035, 0.015, 4), col, { rand }));
  return merge(parts);
}

// --- Koristeet ------------------------------------------------------------------------

// Korkea kultainen heinä (Sahel)
export function makeTallGrass(seed) {
  const rand = mulberry32(seed);
  const n = 16 + Math.floor(rand() * 8);
  const pos = [];
  const col = [];
  const base = new THREE.Color(0x7a6a3a);
  const tips = [new THREE.Color(0xe0c98a), new THREE.Color(0xd2b56e), new THREE.Color(0xc4a866)];
  for (let i = 0; i < n; i++) {
    const a = rand() * Math.PI * 2;
    const r = rand() * 0.22;
    const bx = Math.cos(a) * r, bz = Math.sin(a) * r;
    const h = 0.9 + rand() * 0.8;
    const la = a + (rand() - 0.5) * 0.8;
    const lean = 0.15 + rand() * 0.3;
    const w = 0.022 + rand() * 0.01;
    const px = -Math.sin(la) * w, pz = Math.cos(la) * w;
    const tip = tips[Math.floor(rand() * 3)];
    pos.push(bx - px, 0, bz - pz, bx + px, 0, bz + pz, bx + Math.cos(la) * lean, h, bz + Math.sin(la) * lean);
    col.push(base.r, base.g, base.b, base.r, base.g, base.b, tip.r, tip.g, tip.b);
  }
  return upGeo(pos, col);
}

function upGeo(pos, col) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  const normals = new Float32Array(pos.length);
  for (let i = 1; i < normals.length; i += 3) normals[i] = 1;
  g.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  g.computeBoundingSphere();
  return g;
}

// Pieniä kukkia: varret ja värikkäät terälehdet
export function makeFlowers(seed) {
  const rand = mulberry32(seed);
  const parts = [];
  const palette = [[0xd8402a, 0xe8a030], [0xe8c838, 0xf0e070], [0xc050a0, 0xe080c0], [0xf0f0e8, 0xe8d860]][seed % 4];
  const n = 5 + Math.floor(rand() * 5);
  for (let i = 0; i < n; i++) {
    const a = rand() * Math.PI * 2;
    const r = rand() * 0.3;
    const h = 0.18 + rand() * 0.25;
    const top = V(Math.cos(a) * r, h, Math.sin(a) * r);
    parts.push(paint(limb(V(top.x * 0.8, 0, top.z * 0.8), top, 0.008, 0.006, 3), 0x4a6a2a, { rand }));
    let f = new THREE.OctahedronGeometry(0.05 + rand() * 0.03, 0);
    f.scale(1, 0.5, 1);
    f.translate(top.x, top.y, top.z);
    parts.push(paint(flatNormals(f), palette[i % 2], { rand, jitter: 0.1 }));
  }
  return merge(parts);
}

// Sieniryhmä sademetsän maassa
export function makeMushrooms(seed) {
  const rand = mulberry32(seed);
  const parts = [];
  const capCol = [0xd06a2a, 0xe8dcc0, 0xb04a28][seed % 3];
  const n = 3 + Math.floor(rand() * 4);
  for (let i = 0; i < n; i++) {
    const a = rand() * Math.PI * 2;
    const r = rand() * 0.25;
    const h = 0.06 + rand() * 0.12;
    const p = V(Math.cos(a) * r, 0, Math.sin(a) * r);
    parts.push(paint(limb(p, V(p.x, h, p.z), 0.018, 0.014, 4), 0xe8e0cc, { rand }));
    let cap = new THREE.SphereGeometry(0.05 + h * 0.4, 6, 2, 0, Math.PI * 2, 0, Math.PI / 2);
    cap.scale(1, 0.6, 1);
    cap.translate(p.x, h - 0.01, p.z);
    parts.push(paint(flatNormals(cap), capCol, { rand, jitter: 0.12 }));
  }
  return merge(parts);
}

// Lumpeet: kelluvia lehtiä ja joskus kukka (asetetaan veden pinnalle)
export function makeLilies(seed) {
  const rand = mulberry32(seed);
  const parts = [];
  const n = 3 + Math.floor(rand() * 4);
  for (let i = 0; i < n; i++) {
    const a = rand() * Math.PI * 2;
    const r = rand() * 0.7;
    const size = 0.16 + rand() * 0.14;
    // Pyöreä lehti, jossa lovi
    const notch = rand() * Math.PI * 2;
    let pad = new THREE.CircleGeometry(size, 9, notch + 0.35, Math.PI * 2 - 0.7);
    pad.rotateX(-Math.PI / 2);
    pad.translate(Math.cos(a) * r, 0.01, Math.sin(a) * r);
    parts.push(paint(pad, rand() < 0.5 ? 0x3f6e2a : 0x4c7a30, { rand, jitter: 0.12 }));
    if (rand() < 0.3) {
      let fl = new THREE.ConeGeometry(0.06, 0.07, 6, 1, true);
      fl.translate(Math.cos(a) * r, 0.045, Math.sin(a) * r);
      parts.push(paint(flatNormals(fl), rand() < 0.5 ? 0xf0e8f0 : 0xf0a0c0, { rand }));
    }
  }
  return merge(parts);
}

// Merilevää rantaviivalla
export function makeSeaweed(seed) {
  const rand = mulberry32(seed);
  const parts = [];
  const n = 3 + Math.floor(rand() * 3);
  for (let i = 0; i < n; i++) {
    const a = rand() * Math.PI * 2;
    const len = 0.5 + rand() * 0.6;
    const dir = V(Math.cos(a), 0, Math.sin(a));
    const side = V(-Math.sin(a), 0, Math.cos(a));
    const pts = [];
    for (let s = 0; s <= 3; s++) {
      const t = s / 3;
      pts.push(V(dir.x * t * len + side.x * Math.sin(t * 5 + i) * 0.08, 0.02, dir.z * t * len + side.z * Math.sin(t * 5 + i) * 0.08));
    }
    parts.push(strip(pts, [0.08, 0.1, 0.08, 0.03], side, rand() < 0.5 ? 0x3a4a22 : 0x5a5228, rand));
  }
  return merge(parts);
}

// Kamelin luita ja kallo (aavikko)
export function makeBones(seed) {
  const rand = mulberry32(seed);
  const parts = [];
  const col = 0xe6dcc6;
  // Kallo
  let skull = new THREE.IcosahedronGeometry(0.16, 0);
  skull.scale(1.7, 0.8, 0.9);
  skull.translate(0, 0.1, 0);
  parts.push(paint(flatNormals(skull), col, { rand, jitter: 0.08 }));
  parts.push(paint(limb(V(0.2, 0.08, 0), V(0.5, 0.05, 0.02), 0.06, 0.04, 5, true), col, { rand }));
  // Kylkiluita
  for (let i = 0; i < 5; i++) {
    const x = -0.5 - i * 0.16;
    const a = V(x, 0.05, -0.05);
    parts.push(paint(limb(a, V(x - 0.05, 0.22 + rand() * 0.08, 0.35), 0.018, 0.012, 3), col, { rand }));
    parts.push(paint(limb(a, V(x - 0.05, 0.2 + rand() * 0.08, -0.4), 0.018, 0.012, 3), col, { rand }));
  }
  parts.push(paint(limb(V(-0.4, 0.05, -0.05), V(-1.3, 0.05, -0.1), 0.03, 0.03, 4, true), col, { rand }));
  return merge(parts);
}

// Kivikko: muutama kivi kasassa (vuoristo, pöytävuorten juuret)
export function makeScree(seed) {
  const rand = mulberry32(seed);
  const parts = [];
  const cols = [0x8a7a6c, 0x7a6a5e, 0x9a8a7a, 0x94664a];
  const n = 4 + Math.floor(rand() * 4);
  for (let i = 0; i < n; i++) {
    const a = rand() * Math.PI * 2;
    const r = rand() * 0.6;
    let g = new THREE.IcosahedronGeometry(0.12 + rand() * 0.16, 0);
    displace(g, () => [(rand() - 0.5) * 0.05, (rand() - 0.5) * 0.04, (rand() - 0.5) * 0.05]);
    g.scale(1.2, 0.6, 1);
    g.translate(Math.cos(a) * r, 0.05, Math.sin(a) * r);
    parts.push(paint(flatNormals(g), cols[Math.floor(rand() * cols.length)], { rand, jitter: 0.1 }));
  }
  return merge(parts);
}

// Vesilammikko sademetsän maahan: epäsäännöllinen litteä läikkä (materiaali
// tekee heijastuksen ja sadepisaroiden renkaat).
export function makePuddle(seed) {
  const rand = mulberry32(seed);
  const n = 16;
  const pos = [];
  const R = [];
  const k1 = rand() * 6, k2 = rand() * 6;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    R.push(1 + 0.22 * Math.sin(a * 2 + k1) + 0.12 * Math.sin(a * 3 + k2) + (rand() - 0.5) * 0.12);
  }
  const sx = 0.8 + rand() * 0.5;
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2;
    const r0 = R[i], r1 = R[(i + 1) % n];
    pos.push(0, 0, 0, Math.cos(a1) * r1 * sx, 0, Math.sin(a1) * r1, Math.cos(a0) * r0 * sx, 0, Math.sin(a0) * r0);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return paint(g, 0x2a2318, { rand, jitter: 0.03 });
}
