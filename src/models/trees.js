// Puut. Jokaisesta puusta on kolme tarkkuutta (q):
//   0 = kaukana (kevyt, ei varjoa), 1 = lähellä (instanssi), 2 = hakattava
//   (tiheämpi runko, johon lovet tehdään).
// Muoto arvotaan aina samassa järjestyksessä, joten kaikki tarkkuudet näyttävät
// samalta puulta. geometry.userData.tree kertoo rungon akselin ja kaatokohdan.
import * as THREE from 'three';
import { mulberry32 } from '../noise.js';
import { V, partRand, displace, paint, limb, flatNormals, strip, merge, tag } from './util.js';

function treeMeta(geo, meta) {
  geo.userData.tree = meta;
  return geo;
}

// Runko kahtena (tai useampana) palana niin, että kaatokohdassa on rengas.
function trunkParts(base, top, r0, r1, cutY, q, hex, jr, radial) {
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
  displace(g, () => [(r() - 0.5) * 0.35, (r() - 0.5) * 0.4, (r() - 0.5) * 0.35]);
  g.scale(scale.x, scale.y, scale.z);
  g.rotateY(rotY);
  g.translate(center.x, center.y, center.z);
  g = flatNormals(g);
  const shade = shadeCut !== null ? (x, y) => (y < shadeCut ? 0.55 : 1.0) : null;
  return paint(g, hex, { rand: r, jitter: 0.12, shade });
}

// --- Akasia ------------------------------------------------------------------

export function makeAcacia(seed, q = 1) {
  const rand = mulberry32(seed);
  let k = 0;
  const jr = () => partRand(seed, k++);
  const parts = [];
  const bark = [0x4f3f33, 0x5b4838, 0x4a3b30][seed % 3];
  const leaf = [0x6f7d3c, 0x7b8442, 0x858646][seed % 3];

  const lean = V((rand() - 0.5) * 0.9, 0, (rand() - 0.5) * 0.9);
  const base = V(0, -0.2, 0);
  const top = V(lean.x, 1.8 + rand() * 0.8, lean.z);
  const cutY = 0.8;
  parts.push(...trunkParts(base, top, 0.24, 0.17, cutY, q, bark, jr, 7));

  const canopyH = top.y + 1.6 + rand() * 0.9;
  const nb = 3 + Math.floor(rand() * 2);
  const tips = [];
  for (let i = 0; i < nb; i++) {
    const a = (i / nb) * Math.PI * 2 + rand() * 0.8;
    const r = 1.3 + rand() * 1.1;
    const tip = V(top.x + Math.cos(a) * r, canopyH - 0.2 - rand() * 0.4, top.z + Math.sin(a) * r);
    const mid = V(top.x + Math.cos(a) * r * 0.45, top.y + (tip.y - top.y) * 0.55, top.z + Math.sin(a) * r * 0.45);
    const j1 = jr(), j2 = jr();
    parts.push(paint(limb(top, mid, 0.15, 0.11, q ? 5 : 3), bark, { rand: j1 }));
    if (q) parts.push(paint(limb(mid, tip, 0.11, 0.05, 5), bark, { rand: j2 }));
    tips.push(tip);
  }
  const center = V(top.x, canopyH + 0.15, top.z);
  const pads = [{ p: center, s: V(3.0 + rand(), 0.55, 2.8 + rand()), rot: rand() * Math.PI }];
  for (const t of tips) pads.push({ p: V(t.x, t.y + 0.25, t.z), s: V(1.4 + rand() * 0.6, 0.45, 1.4 + rand() * 0.6), rot: rand() * Math.PI });
  for (const pad of pads) {
    parts.push(blob(pad.p, pad.s, q ? 1 : 0, leaf, jr, pad.p.y - pad.s.y * 0.2, pad.rot));
  }
  return treeMeta(merge(parts), {
    kind: 'acacia', base: base.toArray(), top: top.toArray(), r0: 0.24, r1: 0.17, cutY,
    height: canopyH + 0.6, fallLen: canopyH - cutY + 0.4, logR: 0.3,
  });
}

// --- Baobab (ei kaadettava) ------------------------------------------------------

export function makeBaobab(seed, q = 1) {
  const rand = mulberry32(seed);
  let k = 0;
  const jr = () => partRand(seed, k++);
  const parts = [];
  const bark = 0x8b7c6c;
  const H = 5.6 + rand() * 1.2;
  const prof = [
    [1.75, -0.4], [1.85, 0.3], [1.7, 1.2], [1.55, 2.4], [1.4, 3.6], [1.18, H - 1.0], [0.9, H - 0.3], [0.55, H],
  ].map(([r, y]) => new THREE.Vector2(r, y));
  const jt = jr();
  if (q === 2) {
    // Sessio 22: hakattava baobab. Runko lieriöpaloina (profiilin mukaan) ja
    // kaatokohdassa rengas, jotta lovet ja halkaisu toimivat kuten muilla puilla.
    const cutY = 0.9;
    const pts = [prof[0], prof[1], new THREE.Vector2(1.78, cutY), ...prof.slice(2)];
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      const segs = b.y <= cutY + 0.01 || a.y < cutY + 0.5 ? 6 : 2;
      parts.push(tag(paint(limb(V(0, a.y, 0), V(0, b.y, 0), a.x, b.x, 16, false, segs), bark, { rand: jt, jitter: 0.06, shade: (x, y) => 0.85 + Math.min(0.15, y * 0.03) }), 'trunk'));
    }
  } else {
    let trunk = new THREE.LatheGeometry(prof, q ? 12 : 6);
    displace(trunk, (x, y, z) => {
      const a = Math.atan2(z, x);
      const kk = 1 + Math.sin(a * 5 + y * 0.6) * 0.06 + (jt() - 0.5) * 0.06;
      return [x * (kk - 1), 0, z * (kk - 1)];
    });
    trunk.computeVertexNormals();
    parts.push(paint(trunk, bark, { rand: jt, jitter: 0.06, shade: (x, y) => 0.85 + Math.min(0.15, y * 0.03) }));
  }

  const nb = 6 + Math.floor(rand() * 3);
  for (let i = 0; i < nb; i++) {
    const a = (i / nb) * Math.PI * 2 + rand() * 0.5;
    const b0 = V(Math.cos(a) * 0.5, H - 0.2, Math.sin(a) * 0.5);
    const len = 1.8 + rand() * 1.6;
    const tip = V(Math.cos(a) * (0.5 + len * 0.8), H + len * (0.45 + rand() * 0.4), Math.sin(a) * (0.5 + len * 0.8));
    parts.push(paint(limb(b0, tip, 0.38, 0.14, q ? 6 : 3), bark, { rand: jr() }));
    for (let s = 0; s < 2; s++) {
      const b2 = tip.clone().lerp(b0, 0.25);
      const a2 = a + (rand() - 0.5) * 1.6;
      const t2 = V(b2.x + Math.cos(a2) * 0.9, b2.y + 0.5 + rand() * 0.6, b2.z + Math.sin(a2) * 0.9);
      const j = jr();
      if (q) parts.push(paint(limb(b2, t2, 0.1, 0.04, 4), bark, { rand: j }));
    }
    const hasFruit = rand() < 0.7;
    const j = jr();
    if (hasFruit && q) {
      const f = new THREE.IcosahedronGeometry(0.11, 0);
      f.scale(1, 1.9, 1);
      const fp = tip.clone().lerp(b0, 0.4);
      f.translate(fp.x, fp.y - 0.45, fp.z);
      parts.push(paint(limb(V(fp.x, fp.y - 0.05, fp.z), V(fp.x, fp.y - 0.3, fp.z), 0.012, 0.012, 3), 0x5a4a3a, { rand: j }));
      parts.push(paint(flatNormals(f), 0x9a9772, { rand: j }));
    }
  }
  return treeMeta(merge(parts), {
    kind: 'baobab', base: [0, -0.4, 0], top: [0, H, 0], r0: 1.8, r1: 0.55, cutY: 0.9,
    height: H + 3, fallLen: H + 2.2, logR: 1.25,
  });
}

// --- Kapokkipuu (sademetsä) --------------------------------------------------------

function buttress(angle, rTrunk, height, out, thick, hex, rand) {
  const shape = new THREE.Shape();
  shape.moveTo(0, -0.35);
  shape.lineTo(out, -0.35);
  shape.quadraticCurveTo(out * 0.35, height * 0.25, 0, height);
  shape.lineTo(0, -0.35);
  const g = new THREE.ExtrudeGeometry(shape, { depth: thick, bevelEnabled: false, curveSegments: 3 });
  g.translate(rTrunk * 0.85, 0, -thick / 2);
  g.rotateY(-angle);
  return paint(g, hex, { rand, jitter: 0.06 });
}

export function makeJungleTree(seed, q = 1) {
  const rand = mulberry32(seed);
  let k = 0;
  const jr = () => partRand(seed, k++);
  const parts = [];
  const bark = [0x8c8474, 0x7d7566, 0x958c7a][seed % 3];
  const leaves = [0x3d6b2a, 0x4a7a2e, 0x355f26];
  const H = 9 + rand() * 3;
  const r0 = 0.55, r1 = 0.3;
  const base = V(0, -0.3, 0);
  const cutY = 1.9;
  const top = V((rand() - 0.5) * 0.4, H, (rand() - 0.5) * 0.4);
  if (q === 2) {
    // Alaosa tiheänä (lovet), yläosa harvempana
    const mid = base.clone().lerp(top, (3.2 - base.y) / (top.y - base.y));
    const t = (cutY - base.y) / (top.y - base.y);
    const cut = base.clone().lerp(top, t);
    const rc = r0 + (r1 - r0) * t;
    const rm = r0 + (r1 - r0) * ((3.2 - base.y) / (top.y - base.y));
    parts.push(tag(paint(limb(base, cut, r0, rc, 12, false, 9), bark, { rand: jr() }), 'trunk'));
    parts.push(tag(paint(limb(cut, mid, rc, rm, 12, false, 6), bark, { rand: jr() }), 'trunk'));
    parts.push(tag(paint(limb(mid, top, rm, r1, 8, false, 3), bark, { rand: jr() }), 'trunk'));
  } else {
    jr(); jr(); jr();
    parts.push(paint(limb(base, top, r0, r1, q ? 8 : 5, false, q ? 3 : 1), bark, { rand: partRand(seed, 99) }));
  }

  // Pönkkäjuuret
  const nf = 4 + Math.floor(rand() * 2);
  for (let i = 0; i < nf; i++) {
    const a = (i / nf) * Math.PI * 2 + rand() * 0.5;
    const hgt = 1.1 + rand() * 0.6;
    const out = 0.9 + rand() * 0.6;
    const j = jr();
    if (q) parts.push(buttress(a, r0, hgt, out, 0.13, bark, j));
  }

  // Oksat ja latvus
  const nb = 5 + Math.floor(rand() * 2);
  const tips = [];
  for (let i = 0; i < nb; i++) {
    const a = (i / nb) * Math.PI * 2 + rand() * 0.6;
    const hb = H * (0.72 + rand() * 0.2);
    const len = 2.6 + rand() * 1.6;
    const b0 = V(top.x * (hb / H), hb, top.z * (hb / H));
    const tip = V(b0.x + Math.cos(a) * len, hb + 1.0 + rand() * 1.2, b0.z + Math.sin(a) * len);
    const j = jr();
    if (q) parts.push(paint(limb(b0, tip, 0.17, 0.08, 5), bark, { rand: j }));
    tips.push(tip);
    // Liaani
    const hasLiana = rand() < 0.45;
    const lj = jr();
    if (hasLiana && q) {
      const lp = b0.clone().lerp(tip, 0.6);
      parts.push(paint(limb(V(lp.x, lp.y - 3.5 - lj() * 2, lp.z), lp, 0.025, 0.025, 3), 0x4a5a2a, { rand: lj }));
    }
  }
  const crowns = [{ p: V(top.x, H + 1.0, top.z), s: V(2.8 + rand(), 1.1, 2.8 + rand()) }];
  for (const t of tips) crowns.push({ p: V(t.x, t.y + 0.3, t.z), s: V(2.0 + rand() * 1.2, 0.9 + rand() * 0.3, 2.0 + rand() * 1.2) });
  crowns.forEach((c, i) => {
    const rot = rand() * Math.PI;
    const skip = !q && i > 3;
    const j = jr;
    if (!skip) parts.push(blob(c.p, c.s, q ? 1 : 0, leaves[i % 3], j, c.p.y - c.s.y * 0.3, rot));
    else j();
  });
  return treeMeta(merge(parts), {
    kind: 'jungle', base: base.toArray(), top: top.toArray(), r0, r1, cutY,
    height: H + 2, fallLen: H - cutY + 1.5, logR: 0.5,
  });
}

// --- Palmu ---------------------------------------------------------------------

export function makePalm(seed, q = 1) {
  const rand = mulberry32(seed);
  let k = 0;
  const jr = () => partRand(seed, k++);
  const parts = [];
  const H = 5.5 + rand() * 2.5;
  const bendA = rand() * Math.PI * 2;
  const bend = 0.6 + rand() * 0.8;
  const n = 5;
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    pts.push(V(Math.cos(bendA) * bend * t * t, -0.2 + t * (H + 0.2), Math.sin(bendA) * bend * t * t));
  }
  const cutY = 0.8;
  const ringCols = [0x7a6a52, 0x6a5a45];
  const rAt = (i) => 0.21 - (i / n) * 0.06;
  if (q === 2) {
    const t = (cutY - pts[0].y) / (pts[1].y - pts[0].y);
    const cut = pts[0].clone().lerp(pts[1], t);
    const rc = rAt(0) + (rAt(1) - rAt(0)) * t;
    parts.push(tag(paint(limb(pts[0], cut, rAt(0), rc, 10, false, 6), ringCols[0], { rand: jr() }), 'trunk'));
    parts.push(tag(paint(limb(cut, pts[1], rc, rAt(1), 10, false, 4), ringCols[0], { rand: jr() }), 'trunk'));
  } else {
    jr(); jr();
    parts.push(paint(limb(pts[0], pts[1], rAt(0), rAt(1), q ? 7 : 4), ringCols[0], { rand: partRand(seed, 98) }));
  }
  for (let i = 1; i < n; i++) {
    const j = jr();
    parts.push(paint(limb(pts[i], pts[i + 1], rAt(i), rAt(i + 1), q ? 7 : 4, true), ringCols[i % 2], { rand: j }));
  }
  const crown = pts[n];
  const nf = 12 + Math.floor(rand() * 3);
  for (let i = 0; i < nf; i++) {
    const a = (i / nf) * Math.PI * 2 + rand() * 0.3;
    const old = i % 4 === 0;
    const elev = old ? -0.2 - rand() * 0.3 : 0.35 + rand() * 0.5;
    const len = 2.6 + rand() * 0.9;
    const dir = V(Math.cos(a), 0, Math.sin(a));
    const side = V(-Math.sin(a), 0, Math.cos(a));
    const segs = q ? 6 : 3;
    const fp = [];
    for (let s = 0; s <= segs; s++) {
      const t = s / segs;
      const d = t * len;
      const droop = (old ? 1.6 : 1.1) * t * t * len * 0.45;
      fp.push(V(crown.x + dir.x * d * Math.cos(elev), crown.y + Math.sin(elev) * d - droop, crown.z + dir.z * d * Math.cos(elev)));
    }
    const widths = fp.map((_, s) => Math.sin((s / segs) * Math.PI) * 0.42 + 0.03);
    const col = old ? 0x8f8044 : rand() < 0.5 ? 0x4e7d2e : 0x5f8f36;
    const j = jr();
    if (q || i % 2 === 0) parts.push(strip(fp, widths, side, col, j));
  }
  const hasFruit = rand() < 0.8;
  const fj = jr();
  if (hasFruit && q) {
    let f = new THREE.IcosahedronGeometry(0.28, 0);
    f.translate(crown.x + 0.15, crown.y - 0.35, crown.z);
    f = flatNormals(f);
    parts.push(paint(f, 0xb5521f, { rand: fj, jitter: 0.2 }));
  }
  return treeMeta(merge(parts), {
    // logTop: kaarevan rungon latva (kaatuneen rungon osumat; top on vain
    // ensimmäinen pätkä, jota käytetään kaatokohdan laskentaan).
    kind: 'palm', base: pts[0].toArray(), top: pts[1].toArray(), logTop: pts[n].toArray(), r0: rAt(0), r1: rAt(1), cutY,
    height: H + 1, fallLen: H - cutY + 1.5, logR: 0.22,
  });
}

// --- Sademetsän keskikerroksen puu (tiheä, pyöreä latvus) --------------------------

export function makeCanopyTree(seed, q = 1) {
  const rand = mulberry32(seed);
  let k = 0;
  const jr = () => partRand(seed, k++);
  const parts = [];
  const bark = [0x6a5a48, 0x5c4f40, 0x74644e][seed % 3];
  const leaves = [0x2e5a22, 0x3a6a28, 0x44752c, 0x335f25];
  const H = 7 + rand() * 2.5;
  const base = V(0, -0.3, 0);
  const top = V((rand() - 0.5) * 0.8, H * 0.78, (rand() - 0.5) * 0.8);
  const cutY = 0.9;
  parts.push(...trunkParts(base, top, 0.34, 0.2, cutY, q, bark, jr, 7));
  const nb = 3 + Math.floor(rand() * 2);
  const tips = [];
  for (let i = 0; i < nb; i++) {
    const a = (i / nb) * Math.PI * 2 + rand() * 0.7;
    const hb = top.y * (0.7 + rand() * 0.25);
    const b0 = V(top.x * (hb / top.y), hb, top.z * (hb / top.y));
    const len = 1.6 + rand() * 1.4;
    const tip = V(b0.x + Math.cos(a) * len, hb + 1.2 + rand() * 1.0, b0.z + Math.sin(a) * len);
    const j = jr();
    if (q) parts.push(paint(limb(b0, tip, 0.13, 0.06, 5), bark, { rand: j }));
    tips.push(tip);
  }
  const crowns = [{ p: V(top.x, H, top.z), s: V(2.6 + rand(), 1.7, 2.6 + rand()) }];
  for (const t of tips) crowns.push({ p: V(t.x, t.y + 0.4, t.z), s: V(2.0 + rand() * 0.9, 1.4 + rand() * 0.4, 2.0 + rand() * 0.9) });
  crowns.forEach((c, i) => {
    const rot = rand() * Math.PI;
    if (!q && i > 2) { jr(); return; }
    // Lähiversiossa vain keskimmäinen latvus tarkkana (puita on sademetsässä paljon).
    const detail = q === 2 || (q === 1 && i === 0) ? 1 : 0;
    parts.push(blob(c.p, c.s, detail, leaves[i % leaves.length], jr, c.p.y - c.s.y * 0.35, rot));
  });
  return treeMeta(merge(parts), {
    kind: 'canopy', base: base.toArray(), top: top.toArray(), r0: 0.34, r1: 0.2, cutY,
    height: H + 1.7, fallLen: H - cutY + 1.2, logR: 0.32,
  });
}

// --- Kuollut puu (aavikko): vaalea, lehdetön ja kiemurainen ----------------------------

export function makeDeadTree(seed, q = 1) {
  const rand = mulberry32(seed);
  let k = 0;
  const jr = () => partRand(seed, k++);
  const parts = [];
  const col = [0xb9ab96, 0xa8987f, 0xc4b8a4][seed % 3];
  const H = 2.6 + rand() * 1.6;
  const top = V((rand() - 0.5) * 1.0, H, (rand() - 0.5) * 1.0);
  parts.push(paint(limb(V(0, -0.2, 0), top, 0.17, 0.09, q ? 6 : 4), col, { rand: jr() }));
  const nb = 4 + Math.floor(rand() * 3);
  for (let i = 0; i < nb; i++) {
    const t = 0.45 + rand() * 0.5;
    const b0 = V(top.x * t, (H + 0.2) * t - 0.2, top.z * t);
    const a = rand() * Math.PI * 2;
    const len = 0.8 + rand() * 1.4;
    const tip = V(b0.x + Math.cos(a) * len, b0.y + 0.4 + rand() * 1.0, b0.z + Math.sin(a) * len);
    const j = jr();
    parts.push(paint(limb(b0, tip, 0.07, 0.025, q ? 4 : 3), col, { rand: j }));
    const tw = rand() < 0.6;
    const a2 = a + (rand() - 0.5) * 1.5;
    const j2 = jr();
    if (tw && q) {
      const m = b0.clone().lerp(tip, 0.65);
      parts.push(paint(limb(m, V(m.x + Math.cos(a2) * 0.6, m.y + 0.5, m.z + Math.sin(a2) * 0.6), 0.03, 0.01, 3), col, { rand: j2 }));
    }
  }
  return merge(parts);
}
