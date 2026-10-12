// Lisää kasvillisuutta ja pieniä yksityiskohtia biomeihin:
// karitepuu ja doumpalmu (Sahel), kookospalmu ja ajopuu (ranta), villibanaani,
// sammaloituneet rungot ja sienet (sademetsä), aavikkopensas ja luut (aavikko),
// kivikko (vuoristo), lumpeet (järvet), korkea heinä, kukat ja merilevä.
import * as THREE from 'three';
import { mulberry32 } from '../noise.js';
import { V, partRand, displace, paint, limb, flatNormals, strip, merge, tag, leafCards } from './util.js';

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

// Sessio 23: latvus = pienempi, tummempi ydin + lehtikortit (leafCards).
// kind: 'acacia' (pariliuskaiset lehdet) tai 'broad' (leveät lehdet).
function blob(center, scale, detail, hex, jr, shadeCut = null, rotY = 0, kind = 'broad') {
  // Sessio 26: latvus pelkistä lehtikorteista (kiinteä ydin poistettiin, se
  // näkyi alta katsottuna rumana möhkäleenä). Kortteja tiheämmin, myös alapinnalla.
  void shadeCut;
  const r = jr();
  // Sessio 43: kaukoversio tiheämpi ja pienemmin kortein (ennen 0,3 / 2,0: kulmikkaat "PS1"-möhkäleet).
  return leafCards(center, scale, rotY, hex, r, kind, detail ? 1.75 : 0.85, detail ? 1.05 : 1.35, 0.85);
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
  // Sessio 28: runko jatkuu kapenevana latvukseen (ei tylppää päätä).
  if (q) parts.push(paint(limb(top, V(top.x, H - 0.2, top.z), 0.22, 0.05, 8, true, 2), bark, { rand: partRand(seed, 603) }));
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
