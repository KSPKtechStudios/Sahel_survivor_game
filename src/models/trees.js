// Puut. Jokaisesta puusta on kolme tarkkuutta (q):
//   0 = kaukana (kevyt, ei varjoa), 1 = lähellä (instanssi), 2 = hakattava
//   (tiheämpi runko, johon lovet tehdään).
// Muoto arvotaan aina samassa järjestyksessä, joten kaikki tarkkuudet näyttävät
// samalta puulta. geometry.userData.tree kertoo rungon akselin ja kaatokohdan.
import * as THREE from 'three';
import { mulberry32 } from '../noise.js';
import { V, partRand, displace, paint, limb, merge, tag, leafCards } from './util.js';
import { lianaSpec, climbingVine } from './ancient.js';

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

// Sessio 23: latvus = pienempi, tummempi ydin + lehtikortit (leafCards).
// kind: 'acacia' (pariliuskaiset lehdet) tai 'broad' (leveät lehdet).
function blob(center, scale, detail, hex, jr, shadeCut = null, rotY = 0, kind = 'broad') {
  // Sessio 26: latvus pelkistä lehtikorteista (kiinteä ydin poistettiin, se
  // näkyi alta katsottuna rumana möhkäleenä). Kortteja tiheämmin, myös alapinnalla.
  void shadeCut;
  const r = jr();
  return leafCards(center, scale, rotY, hex, r, kind, detail ? 1.75 : 0.3, detail ? 1.05 : 2.0, 0.85);
}

// Sessio 27: latvus pienistä lehtiryppäistä haarautuvien oksien kärjissä
// (käyttäjä: puut näyttivät kaameilta isoina möykkyinä). Rosoinen siluetti ja
// aukkoja valolle. Lisää ryppäät listaan crowns ({ p, s, sub: true }).
function subCrowns(parts, crowns, tip, dir, q, bark, j, opt) {
  const n = 2 + (j() < 0.5 ? 1 : 0);
  for (let c = 0; c < n; c++) {
    const a = Math.atan2(dir.z, dir.x) + (c - (n - 1) / 2) * 0.95 + (j() - 0.5) * 0.4;
    const len = opt.len * (0.75 + j() * 0.5);
    const end = V(tip.x + Math.cos(a) * len, tip.y + opt.rise * (0.4 + j()), tip.z + Math.sin(a) * len);
    if (q) parts.push(paint(limb(tip, end, opt.r, opt.r * 0.45, 4), bark, { rand: j }));
    const cs = opt.cs * (0.85 + j() * 0.4);
    crowns.push({ p: end, s: V(cs, cs * opt.flat * (0.85 + j() * 0.3), cs * (0.9 + j() * 0.25)), sub: true });
  }
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
    parts.push(blob(pad.p, pad.s, q ? 1 : 0, leaf, jr, pad.p.y - pad.s.y * 0.2, pad.rot, 'acacia'));
  }
  return treeMeta(merge(parts), {
    kind: 'acacia', base: base.toArray(), top: top.toArray(), r0: 0.24, r1: 0.17, cutY,
    height: canopyH + 0.6, fallLen: canopyH - cutY + 0.4, logR: 0.3,
  });
}

// --- Baobab (ei kaadettava) ------------------------------------------------------

export function makeBaobab(seed, q = 1) {
  // Sessio 27: uusi baobab (käyttäjä: vanha "aika kaamea"). Leveä pullorunko
  // pystyuurteineen ja kuhmuineen, paksut mutkittelevat oksat, jotka
  // haarautuvat kolmeen tasoon kuin juuret ("ylösalaisin kasvava puu"),
  // harvat lehtitupsut ja roikkuvat hedelmät.
  const rand = mulberry32(seed);
  let k = 0;
  const jr = () => partRand(seed, k++);
  const parts = [];
  const bark = [0x8d8174, 0x857a6e, 0x95887a][seed % 3];
  const H = 5.6 + rand() * 1.2;
  const prof = [
    [2.05, -0.4], [1.95, 0.05], [1.82, 0.6], [1.74, 1.4], [1.7, 2.3], [1.62, 3.2], [1.45, H - 1.3], [1.12, H - 0.55], [0.8, H - 0.1], [0.6, H + 0.15],
  ].map(([r, y]) => new THREE.Vector2(r, y));
  const jt = jr();
  const groove = (x, y, z) => {
    const a = Math.atan2(z, x);
    const g = Math.pow(Math.abs(Math.sin(a * 9 + Math.sin(y * 0.7 + a * 2) * 0.6)), 3);
    return 0.78 + 0.22 * (1 - g) + Math.min(0.08, y * 0.015);
  };
  if (q === 2) {
    // Hakattava baobab: runko lieriöpaloina profiilin mukaan, kaatokohdassa rengas.
    const cutY = 0.9;
    const pts = [prof[0], prof[1], prof[2], new THREE.Vector2(1.79, cutY), ...prof.slice(3)];
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      const segs = b.y <= cutY + 0.01 || a.y < cutY + 0.5 ? 6 : 3;
      parts.push(tag(paint(limb(V(0, a.y, 0), V(0, b.y, 0), a.x, b.x, 20, false, segs), bark, { rand: jt, jitter: 0.04, shade: groove }), 'trunk'));
    }
  } else {
    let trunk = new THREE.LatheGeometry(prof, q ? 22 : 9);
    displace(trunk, (x, y, z) => {
      const a = Math.atan2(z, x);
      // Pystyuurteet, kuhmut ja tyven juurilevenemät.
      const g = Math.pow(Math.abs(Math.sin(a * 9 + Math.sin(y * 0.7 + a * 2) * 0.6)), 3);
      const lump = Math.sin(a * 3 + y * 1.3 + seed) * Math.sin(y * 0.9 - a * 2) * 0.05;
      const foot = y < 0.6 ? Math.max(0, Math.sin(a * 5 + seed)) * 0.16 * (0.6 - y) : 0;
      const kk = 1 - g * 0.045 + lump + foot;
      return [x * (kk - 1), 0, z * (kk - 1)];
    });
    trunk.computeVertexNormals();
    parts.push(paint(trunk, bark, { rand: jt, jitter: 0.04, shade: groove }));
  }

  // Oksat: mutkitteleva ketju, joka kapenee ja haarautuu.
  const branch = (from, dir, len, r0, depth, j) => {
    const segs = q ? 3 : 2;
    let p = from.clone();
    let d = dir.clone().normalize();
    const pts = [p.clone()];
    for (let s = 0; s < segs; s++) {
      d.x += (j() - 0.5) * 0.5;
      d.z += (j() - 0.5) * 0.5;
      d.y += (j() - 0.35) * 0.35;
      d.normalize();
      p = p.clone().addScaledVector(d, len / segs);
      pts.push(p);
    }
    for (let s = 0; s < segs; s++) {
      const ra = r0 * (1 - (s / segs) * 0.55), rb = r0 * (1 - ((s + 1) / segs) * 0.55);
      parts.push(paint(limb(pts[s], pts[s + 1], ra, rb, q ? (depth === 0 ? 9 : 6) : 4), bark, { rand: j, jitter: 0.05, shade: (x, y) => 0.88 + Math.min(0.12, (y - H) * 0.04) }));
    }
    const tip = pts[segs];
    if (depth < (q ? 2 : 1)) {
      const nk = depth === 0 ? 2 + Math.floor(j() * 2) : 2;
      for (let c = 0; c < nk; c++) {
        const a = Math.atan2(d.z, d.x) + (c - (nk - 1) / 2) * 0.9 + (j() - 0.5) * 0.4;
        const nd = V(Math.cos(a), 0.45 + j() * 0.5, Math.sin(a));
        branch(tip, nd, len * 0.6, r0 * 0.42, depth + 1, j);
      }
    } else if (q && j() < 0.55) {
      // Harvat lehtitupsut oksien kärjissä (kuivana aikana osa puista lehdetön).
      parts.push(leafCards(tip.clone().add(V(0, 0.15, 0)), V(0.55, 0.35, 0.55), j() * 3, 0x5a7a34, j, 'acacia', 0.9, 0.8, 0.6));
    }
    return tip;
  };
  const nb = 6 + Math.floor(rand() * 3);
  for (let i = 0; i < nb; i++) {
    const a = (i / nb) * Math.PI * 2 + rand() * 0.5;
    const b0 = V(Math.cos(a) * 0.45, H - 0.15, Math.sin(a) * 0.45);
    const len = 1.9 + rand() * 1.5;
    const j = jr();
    const tip = branch(b0, V(Math.cos(a), 0.55 + rand() * 0.45, Math.sin(a)), len, 0.42, 0, j);
    // Hedelmät roikkuvat pitkissä varsissa.
    const hasFruit = rand() < 0.7;
    const fj = jr();
    if (hasFruit && q) {
      const fp = tip.clone().lerp(b0, 0.45);
      const stem = 0.35 + fj() * 0.3;
      parts.push(paint(limb(V(fp.x, fp.y, fp.z), V(fp.x, fp.y - stem, fp.z), 0.012, 0.01, 3), 0x5a4a3a, { rand: fj }));
      const f = new THREE.SphereGeometry(0.1, 8, 6);
      f.scale(1, 2.0, 1);
      f.translate(fp.x, fp.y - stem - 0.18, fp.z);
      parts.push(paint(f, 0x9a9772, { rand: fj, jitter: 0.05 }));
    }
  }
  return treeMeta(merge(parts), {
    kind: 'baobab', base: [0, -0.4, 0], top: [0, H, 0], r0: 1.8, r1: 0.6, cutY: 0.9,
    height: H + 3, fallLen: H + 2.2, logR: 1.25,
  });
}

// --- Kapokkipuu (sademetsä) --------------------------------------------------------

// Sessio 27: pönkkäjuuri sileänä, kaarevana levynä (ennen särmikäs suulake).
// Poikkileikkaus on pyöristetty kaari, joka ohenee ja madaltuu ulospäin.
function buttress(angle, rTrunk, height, out, thick, hex, rand) {
  const nu = 9, nv = 8;
  const pos = [], idx = [];
  const bend = (rand() - 0.5) * 0.5;
  for (let i = 0; i <= nu; i++) {
    const t = i / nu;
    const x = rTrunk * 0.7 + t * (out + rTrunk * 0.25);
    const yTop = height * Math.pow(1 - t, 1.7) - 0.05 * t;
    const w = thick * (1 - 0.6 * t) + 0.02;
    const zc = Math.sin(t * Math.PI) * bend;
    for (let j = 0; j <= nv; j++) {
      const ph = (j / nv) * Math.PI;
      const y = -0.35 + (yTop + 0.35) * Math.pow(Math.sin(ph), 0.45);
      pos.push(x, y, zc + Math.cos(ph) * w);
    }
  }
  for (let i = 0; i < nu; i++) {
    for (let j = 0; j < nv; j++) {
      const a = i * (nv + 1) + j, b = a + nv + 1;
      idx.push(a, a + 1, b, b, a + 1, b + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  g.rotateY(-angle);
  return paint(g, hex, { rand, jitter: 0.04, shade: (x, y) => 0.8 + Math.min(0.2, (y + 0.35) * 0.15) });
}

export function makeJungleTree(seed, q = 1) {
  const rand = mulberry32(seed);
  let k = 0;
  const jr = () => partRand(seed, k++);
  const parts = [];
  const vines = []; // sessio 27: liaanit (render/vines.js)
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
      // Sessio 27: liaani fysiikkaköytenä (render/vines.js).
      const lp = b0.clone().lerp(tip, 0.6);
      vines.push(lianaSpec(lp, lj));
    }
  }
  const crowns = [{ p: V(top.x, H + 1.0, top.z), s: V(q ? 2.1 + rand() * 0.6 : 2.8 + rand(), q ? 0.95 : 1.1, q ? 2.1 + rand() * 0.6 : 2.8 + rand()) }];
  const sj = partRand(seed, 778);
  for (const t of tips) {
    if (q) {
      // Sessio 27: sateenvarjomainen latvus ryppäinä (lähellä).
      crowns.push({ p: V(t.x, t.y + 0.25, t.z), s: V(1.5 + sj() * 0.5, 0.8, 1.5 + sj() * 0.5) });
      subCrowns(parts, crowns, t, V(t.x - top.x, 0, t.z - top.z), q, bark, sj, { len: 1.6, rise: 0.35, r: 0.08, cs: 1.3, flat: 0.6 });
    } else {
      crowns.push({ p: V(t.x, t.y + 0.3, t.z), s: V(2.0 + rand() * 1.2, 0.9 + rand() * 0.3, 2.0 + rand() * 1.2) });
    }
  }
  crowns.forEach((c, i) => {
    const rot = rand() * Math.PI;
    const skip = !q && i > 3;
    const j = jr;
    if (skip) { j(); return; }
    if (q) parts.push(leafCards(c.p, c.s, rot, leaves[i % 3], j(), 'broad', c.sub ? 1.3 : 1.5, 1.0, 0.7));
    else parts.push(blob(c.p, c.s, 0, leaves[i % 3], j, c.p.y - c.s.y * 0.3, rot));
  });
  // Sessio 24: runkoa kiertävä köynnös osassa puista.
  const cv = partRand(seed, 950);
  if (q && cv() < 0.55) parts.push(...climbingVine(base, top, r0, cv, q));
  const geo = treeMeta(merge(parts), {
    kind: 'jungle', base: base.toArray(), top: top.toArray(), r0, r1, cutY,
    height: H + 2, fallLen: H - cutY + 1.5, logR: 0.5,
  });
  geo.userData.vines = vines;
  return geo;
}

// --- Sademetsän keskikerroksen puu (tiheä, pyöreä latvus) --------------------------

export function makeCanopyTree(seed, q = 1) {
  const rand = mulberry32(seed);
  let k = 0;
  const jr = () => partRand(seed, k++);
  const parts = [];
  const vines = []; // sessio 27: liaanit (render/vines.js)
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
  let crowns;
  if (q) {
    // Sessio 27: lähellä latvus ryppäinä oksien kärjissä.
    crowns = [{ p: V(top.x, H, top.z), s: V(1.9 + rand() * 0.5, 1.15, 1.9 + rand() * 0.5) }];
    const sj = partRand(seed, 777);
    tips.forEach((t) => {
      const dir = V(t.x - top.x, 0, t.z - top.z);
      crowns.push({ p: V(t.x, t.y + 0.3, t.z), s: V(1.35 + sj() * 0.4, 0.95, 1.35 + sj() * 0.4) });
      subCrowns(parts, crowns, t, dir, q, bark, sj, { len: 1.3, rise: 0.6, r: 0.06, cs: 1.15, flat: 0.72 });
    });
  } else {
    crowns = [{ p: V(top.x, H, top.z), s: V(2.6 + rand(), 1.7, 2.6 + rand()) }];
    for (const t of tips) crowns.push({ p: V(t.x, t.y + 0.4, t.z), s: V(2.0 + rand() * 0.9, 1.4 + rand() * 0.4, 2.0 + rand() * 0.9) });
  }
  crowns.forEach((c, i) => {
    const rot = rand() * Math.PI;
    if (!q && i > 2) { jr(); return; }
    if (q) {
      // Ryppäät: tiheys hieman pienempi kuin yhdellä isolla latvuksella.
      parts.push(leafCards(c.p, c.s, rot, leaves[i % leaves.length], jr(), 'broad', c.sub ? 1.35 : 1.55, 1.0, 0.75));
      return;
    }
    parts.push(blob(c.p, c.s, 0, leaves[i % leaves.length], jr, c.p.y - c.s.y * 0.35, rot));
  });
  // Sessio 24: liaanit roikkuvat latvuksista, osassa puista köynnös rungolla.
  if (q) {
    const vr = partRand(seed, 900);
    const nl = vr() < 0.25 ? 0 : 1 + Math.floor(vr() * 3);
    for (let i = 0; i < nl; i++) {
      const c = crowns[1 + (i % Math.max(1, crowns.length - 1))] || crowns[0];
      const p = V(c.p.x + (vr() - 0.5) * c.s.x, c.p.y - c.s.y * 0.55, c.p.z + (vr() - 0.5) * c.s.z);
      vines.push(lianaSpec(p, vr));
    }
    if (vr() < 0.45) parts.push(...climbingVine(base, top, 0.34, vr, q));
  }
  const geo = treeMeta(merge(parts), {
    kind: 'canopy', base: base.toArray(), top: top.toArray(), r0: 0.34, r1: 0.2, cutY,
    height: H + 1.7, fallLen: H - cutY + 1.2, logR: 0.32,
  });
  geo.userData.vines = vines;
  return geo;
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
