// Sessio 26: uudet palmut ja banaanit (käyttäjä: vanhat "karmeen näköisiä").
// Vanhoissa lehdet olivat yksittäisiä litteitä nauhoja. Nyt:
// - Sulkalehti: kaartuva lehtiruoti, jonka molemmin puolin kymmeniä kapeita,
//   riippuvia lehdyköitä V-asennossa; vanhat lehdet roikkuvat ruskeina.
// - Runko: rengaskuvio (lehtiarvet), tyvipaksunnos ja juurikaulus;
//   öljypalmumaisessa palmussa lehtituppien tyngät rungolla.
// - Latva: lehtitupet ja kookospalmussa kookostertut.
// - Doumpalmu: viuhkalehdet kapeista, taitetuista liuskoista.
// (Sessio 49: banaani on nyt käyttäjän tuoma malli, models/kit/userKit.js.)
import * as THREE from 'three';
import { mulberry32 } from '../noise.js';
import { V, paint, limb, merge, tag } from './util.js';

const UP = new THREE.Vector3(0, 1, 0);
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _n = new THREE.Vector3();

// Kolmioiden kerääjä (paikka, normaali, väri) suoraan taulukoihin.
class Mesher {
  constructor() { this.p = []; this.n = []; this.c = []; this.two = false; this.back = 1; }
  // Kolmio; normaali käännetään ylöspäin ja taivutetaan kohti ylöstä
  // (lehdet valaistuvat pehmeämmin kuin litteinä tasoina).
  tri(a, b, c, ca, cb = ca, cc = ca, upBias = 0.5) {
    _a.subVectors(b, a);
    _b.subVectors(c, a);
    _n.crossVectors(_a, _b).normalize();
    if (_n.y < 0) _n.negate();
    _n.addScaledVector(UP, upBias).normalize();
    for (const [v, col] of [[a, ca], [b, cb], [c, cc]]) {
      this.p.push(v.x, v.y, v.z);
      this.n.push(_n.x, _n.y, _n.z);
      this.c.push(col.r, col.g, col.b);
    }
    // Sessio 27: kaksipuolinen (banaaninlehti): erillinen takapinta, jonka
    // normaali osoittaa myös ylöspäin. Muuten alapinta näytti mustalta
    // (DoubleSide kääntää normaalin alaspäin); kuultava lehti on alta vaalea.
    if (this.two) {
      const k = this.back;
      for (const [v, col] of [[c, cc], [b, cb], [a, ca]]) {
        this.p.push(v.x, v.y, v.z);
        this.n.push(_n.x, _n.y, _n.z);
        this.c.push(Math.min(1, col.r * k), Math.min(1, col.g * k), Math.min(1, col.b * k * 0.95));
      }
    }
  }
  quad(a, b, c, d, ca, cb, cc, cd, upBias) {
    this.tri(a, b, c, ca, cb, cc, upBias);
    this.tri(a, c, d, ca, cc, cd, upBias);
  }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    return g;
  }
}

function treeMeta(geo, meta) {
  geo.userData.tree = meta;
  return geo;
}

function col(hex, k = 1) {
  return new THREE.Color(hex).multiplyScalar(k);
}

// Sulkalehti. crown = kiinnityskohta, a = suunta (rad), elev = nousukulma,
// len = pituus, droop = roikkuminen, old = kuivunut. q = tarkkuus.
function pinnateFrond(m, crown, a, elev, len, droop, rand, q, o = {}) {
  const old = !!o.old;
  const dir = V(Math.cos(a), 0, Math.sin(a));
  const side = V(-Math.sin(a), 0, Math.cos(a));
  const segs = q ? 7 : 4;
  const twist = (rand() - 0.5) * 0.5;
  const rach = [];
  for (let s = 0; s <= segs; s++) {
    const t = s / segs, d = t * len;
    rach.push(V(
      crown.x + dir.x * d * Math.cos(elev),
      crown.y + Math.sin(elev) * d - droop * t * t * len,
      crown.z + dir.z * d * Math.cos(elev),
    ));
  }
  const green = o.green ?? 0x4f8a2e;
  const base = old ? col(rand() < 0.5 ? 0x8a6a3a : 0x9a8048) : col(green, 0.85 + rand() * 0.3);
  const tipC = old ? col(0x6a5030) : base.clone().lerp(col(0xa8a050), 0.25);
  const rachC = old ? col(0x7a5a32) : col(0x9a9858);
  // Lehtiruoti: kapea, kaksi kolmiota per pätkä, kaventuu kärkeä kohti.
  for (let s = 0; s < segs; s++) {
    const w0 = 0.035 * (1 - s / segs) + 0.008, w1 = 0.035 * (1 - (s + 1) / segs) + 0.008;
    const p0 = rach[s], p1 = rach[s + 1];
    m.quad(
      p0.clone().addScaledVector(side, -w0), p0.clone().addScaledVector(side, w0),
      p1.clone().addScaledVector(side, w1), p1.clone().addScaledVector(side, -w1),
      rachC, rachC, rachC, rachC, 0.3,
    );
  }
  // Lehdykät
  const nL = q ? (o.leaflets ?? 26) : 9;
  const maxL = o.leafLen ?? len * 0.32;
  const lw = (o.leafW ?? 0.045) * (q ? 1 : 2.2);
  const vAng = old ? -0.9 : (o.vAngle ?? 0.35);
  const at = (t) => {
    const f = t * segs, i = Math.min(segs - 1, Math.floor(f)), r = f - i;
    return rach[i].clone().lerp(rach[i + 1], r);
  };
  const tanAt = (t) => {
    const f = t * segs, i = Math.min(segs - 1, Math.floor(f));
    return rach[i + 1].clone().sub(rach[i]).normalize();
  };
  for (let i = 0; i < nL; i++) {
    const t = 0.1 + 0.88 * (i + rand() * 0.5) / nL;
    const p = at(t), tan = tanAt(t);
    const L = maxL * Math.pow(Math.sin(Math.PI * (0.12 + 0.82 * t)), 0.6) * (0.85 + rand() * 0.3);
    const nrm = new THREE.Vector3().crossVectors(tan, side).normalize();
    if (nrm.y < 0) nrm.negate();
    for (const sgn of [-1, 1]) {
      if (old && rand() < 0.3) continue; // repaleiset vanhat lehdet
      // Suunta: sivulle, hieman eteenpäin ja V-kulmaan ylös; kärki roikkuu.
      const ang = vAng + twist * sgn + (rand() - 0.5) * 0.2;
      const d = side.clone().multiplyScalar(sgn * Math.cos(ang)).addScaledVector(nrm, Math.sin(ang)).addScaledVector(tan, 0.45).normalize();
      const sag = (old ? 0.55 : 0.28 + t * 0.25) * L;
      const mid = p.clone().addScaledVector(d, L * 0.5).addScaledVector(UP, -sag * 0.2);
      const tip = p.clone().addScaledVector(d, L).addScaledVector(UP, -sag);
      // Lehdykän leveys sen tasossa (kohtisuoraan suuntaan ja ruotiin).
      const wv = new THREE.Vector3().crossVectors(d, nrm).normalize().multiplyScalar(lw * 0.5);
      const cb = base.clone().multiplyScalar(0.8), cm = base, ct = tipC;
      if (q) {
        m.quad(p.clone().addScaledVector(wv, -0.3), p.clone().addScaledVector(wv, 0.3), mid.clone().add(wv), mid.clone().sub(wv), cb, cb, cm, cm, 0.6);
        m.tri(mid.clone().sub(wv), mid.clone().add(wv), tip, cm, cm, ct, 0.6);
      } else {
        m.tri(p.clone().addScaledVector(wv, -0.5), p.clone().addScaledVector(wv, 0.5), tip, cb, cb, ct, 0.6);
      }
    }
  }
  return rach[segs];
}

// Rungon rengaskuvio (lehtiarvet) värityksen varjostuksena.
function ringShade(freq, k = 0.22) {
  return (x, y) => 1 - k * Math.pow(Math.abs(Math.sin(y * freq)), 6) + 0.05 * Math.sin(y * 1.7);
}

// Runko kaarevana ketjuna; q === 2: ensimmäinen pätkä kahtena 'trunk'-palana
// kaatokohdan (cutY) kohdalta (treeCut.js).
function palmTrunk(parts, pts, rAt, cutY, q, cols, jr, seed, ringF) {
  const n = pts.length - 1;
  const shade = ringShade(ringF);
  if (q === 2) {
    const t = (cutY - pts[0].y) / (pts[1].y - pts[0].y);
    const cut = pts[0].clone().lerp(pts[1], t);
    const rc = rAt(0) + (rAt(1) - rAt(0)) * t;
    parts.push(tag(paint(limb(pts[0], cut, rAt(0), rc, 10, false, 6), cols[0], { rand: jr(), shade }), 'trunk'));
    parts.push(tag(paint(limb(cut, pts[1], rc, rAt(1), 10, false, 8), cols[0], { rand: jr(), shade }), 'trunk'));
  } else {
    jr(); jr();
    parts.push(paint(limb(pts[0], pts[1], rAt(0), rAt(1), q ? 9 : 5, false, q ? 8 : 1), cols[0], { rand: mulberry32(seed + 98), shade }));
  }
  for (let i = 1; i < n; i++) {
    const j = jr();
    parts.push(paint(limb(pts[i], pts[i + 1], rAt(i), rAt(i + 1), q ? 9 : 5, true, q ? 8 : 1), cols[i % 2 ? 1 : 0], { rand: j, shade }));
  }
}

// Tyvipaksunnos ja juurikaulus (näkyvät juuret hiekassa).
function palmBase(parts, p0, r, hex, rand, q) {
  parts.push(paint(limb(V(p0.x, p0.y - 0.05, p0.z), V(p0.x, p0.y + 0.55, p0.z), r * 1.55, r * 1.02, q ? 10 : 6, false, 3), hex, { rand, shade: (x, y) => 0.82 + 0.18 * Math.min(1, y * 2) }));
  if (!q) return;
  const nr = 9 + Math.floor(rand() * 6);
  for (let i = 0; i < nr; i++) {
    const a = rand() * Math.PI * 2, l = r * (1.6 + rand() * 0.8);
    const s = V(p0.x + Math.cos(a) * r * 1.1, p0.y + 0.14 + rand() * 0.12, p0.z + Math.sin(a) * r * 1.1);
    const e = V(p0.x + Math.cos(a) * l, p0.y - 0.05, p0.z + Math.sin(a) * l);
    parts.push(paint(limb(s, e, 0.035, 0.022, 4), 0x6a5a48, { rand }));
  }
}

// Kookosterttu latvan alla. Sessio 27: pähkinät ovat erillisiä (game/coconuts.js),
// malli kertoo vain niiden paikat: [x, y, z, koko, kallistus, väri].
function coconutPoints(crown, rand, n) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = rand() * Math.PI * 2, r = 0.16 + rand() * 0.14;
    const ripe = rand();
    pts.push([crown.x + Math.cos(a) * r, crown.y - 0.22 - rand() * 0.22, crown.z + Math.sin(a) * r,
      0.9 + rand() * 0.2, (rand() - 0.5) * 0.8, ripe < 0.45 ? 0 : ripe < 0.7 ? 1 : ripe < 0.9 ? 2 : 3]);
  }
  return pts;
}

// Lehtitupet latvassa (kuitumainen kaulus lehtien tyvissä).
function crownSheaths(parts, crown, rTop, rand, q, hex = 0x7a6a48) {
  const n = q ? 7 : 3;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rand() * 0.4;
    const s = V(crown.x, crown.y - 0.55, crown.z);
    const e = V(crown.x + Math.cos(a) * 0.32, crown.y + 0.05, crown.z + Math.sin(a) * 0.32);
    parts.push(paint(limb(s, e, rTop * 0.75, 0.06, q ? 5 : 3), hex, { rand, jitter: 0.12 }));
  }
}

function frondSet(m, crown, rand, q, o) {
  const nf = q ? o.count : Math.ceil(o.count * 0.7);
  for (let i = 0; i < nf; i++) {
    const a = (i / nf) * Math.PI * 2 + rand() * 0.35;
    const old = i % o.oldEvery === 0;
    const young = !old && i % 5 === 2;
    // Kuolleet lehdet: lyhyempiä, roikkuvat vinosti rungon vierellä.
    const elev = old ? -0.3 - rand() * 0.35 : young ? 0.95 + rand() * 0.25 : o.elev[0] + rand() * (o.elev[1] - o.elev[0]);
    const len = (young ? 0.75 : old ? 0.62 : 1) * (o.len[0] + rand() * (o.len[1] - o.len[0]));
    const droop = old ? 0.35 : o.droop * (young ? 0.4 : 0.8 + rand() * 0.4);
    pinnateFrond(m, crown, a, elev, len, droop, rand, q, { ...o.frond, old });
  }
}

// --- Palmu (sademetsä, keidas): suorahko runko lehtituppien tyngin -------------------

export function makePalm(seed, q = 1) {
  const rand = mulberry32(seed);
  let k = 0;
  const jr = () => mulberry32(seed * 31 + 1000 + k++);
  const parts = [];
  const H = 5.5 + rand() * 2.5;
  const bendA = rand() * Math.PI * 2;
  const bend = 0.4 + rand() * 0.7;
  const n = 6;
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    pts.push(V(Math.cos(bendA) * bend * t * t, -0.2 + t * (H + 0.2), Math.sin(bendA) * bend * t * t));
  }
  const cutY = 0.8;
  const rAt = (i) => 0.24 - (i / n) * 0.06;
  const cols = [0x6e604c, 0x655843];
  palmTrunk(parts, pts, rAt, cutY, q, cols, jr, seed, 11);
  palmBase(parts, pts[0], rAt(0), 0x6a5c48, jr(), q);
  // Lehtituppien tyngät rungon yläosassa (öljypalmu).
  const bj = jr();
  if (q) {
    for (let i = 0; i < 22; i++) {
      const t = 0.45 + bj() * 0.5, f = t * n, si = Math.min(n - 1, Math.floor(f));
      const p = pts[si].clone().lerp(pts[si + 1], f - si);
      const a = bj() * Math.PI * 2, r = rAt(si);
      const s = V(p.x + Math.cos(a) * r * 0.8, p.y, p.z + Math.sin(a) * r * 0.8);
      const e = V(p.x + Math.cos(a) * (r + 0.22), p.y + 0.18 + bj() * 0.1, p.z + Math.sin(a) * (r + 0.22));
      parts.push(paint(limb(s, e, 0.07, 0.03, 4), bj() < 0.5 ? 0x5e5240 : 0x6e5e44, { rand: bj }));
    }
  }
  const crown = pts[n];
  crownSheaths(parts, crown, rAt(n), jr(), q, 0x6a5a3e);
  // Sessio 27: myös tällä palmulla kookoksia (käyttäjä).
  const fj = mulberry32(seed * 53 + 7);
  const fruit = coconutPoints(crown, fj, 4 + Math.floor(fj() * 4));
  const m = new Mesher();
  frondSet(m, crown, jr(), q, {
    count: 14 + Math.floor(rand() * 3), oldEvery: 6, elev: [0.25, 0.7], len: [2.7, 3.5], droop: 0.42,
    frond: { green: [0x3f7a2a, 0x4a8530, 0x56903a][seed % 3], leaflets: 21, leafW: 0.06, vAngle: 0.45 },
  });
  parts.push(m.geometry());
  const geo = treeMeta(merge(parts), {
    kind: 'palm', base: pts[0].toArray(), top: pts[1].toArray(), logTop: pts[n].toArray(), r0: rAt(0), r1: rAt(1), cutY,
    height: H + 1, fallLen: H - cutY + 1.5, logR: 0.24,
  });
  geo.userData.fruit = fruit;
  return geo;
}

// --- Kookospalmu: kalteva, kaareva sileä runko, riippuvat lehdet ja kookokset -----

export function makeCoconutPalm(seed, q = 1) {
  const rand = mulberry32(seed);
  let k = 0;
  const jr = () => mulberry32(seed * 37 + 2000 + k++);
  const parts = [];
  const H = 6.5 + rand() * 2.5;
  const bendA = rand() * Math.PI * 2;
  const bend = 1.8 + rand() * 1.6;
  const n = 7;
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    pts.push(V(Math.cos(bendA) * bend * Math.pow(t, 1.5), -0.2 + t * (H + 0.2) - bend * 0.15 * t * t, Math.sin(bendA) * bend * Math.pow(t, 1.5)));
  }
  const cutY = 0.8;
  const rAt = (i) => 0.21 - (i / n) * 0.07;
  const cols = [0x8a7c66, 0x82745e];
  palmTrunk(parts, pts, rAt, cutY, q, cols, jr, seed, 14);
  palmBase(parts, pts[0], rAt(0), 0x7a6c58, jr(), q);
  const crown = pts[n];
  crownSheaths(parts, crown, rAt(n), jr(), q, 0x8a7a50);
  const cj = jr();
  const fruit = coconutPoints(crown, cj, 6 + Math.floor(cj() * 5));
  const m = new Mesher();
  frondSet(m, crown, jr(), q, {
    count: 13 + Math.floor(rand() * 3), oldEvery: 6, elev: [0.15, 0.55], len: [3.2, 4.1], droop: 0.55,
    frond: { green: [0x4f8a2e, 0x5a9434, 0x62993a][seed % 3], leaflets: 22, leafW: 0.05, vAngle: 0.2 },
  });
  parts.push(m.geometry());
  const geo = treeMeta(merge(parts), {
    kind: 'coconut', base: pts[0].toArray(), top: pts[1].toArray(), logTop: pts[n].toArray(), r0: rAt(0), r1: rAt(1), cutY,
    height: H + 1, fallLen: H - cutY + 1.5, logR: 0.21,
  });
  geo.userData.fruit = fruit;
  return geo;
}

// --- Doumpalmu: haarautuva runko, viuhkalehdet --------------------------------------

// Viuhkalehti: ruoti ja siitä säteittäin kapeat, keskeltä taitetut liuskat.
function fanLeaf(m, p, dir, size, hex, rand, q) {
  const petEnd = p.clone().addScaledVector(dir, size * 0.55);
  const side = new THREE.Vector3().crossVectors(dir, UP).normalize();
  if (side.lengthSq() < 0.01) side.set(1, 0, 0);
  const up = new THREE.Vector3().crossVectors(side, dir).normalize();
  const pc = col(0x8a8a50);
  m.quad(p.clone().addScaledVector(side, -0.02), p.clone().addScaledVector(side, 0.02), petEnd.clone().addScaledVector(side, 0.015), petEnd.clone().addScaledVector(side, -0.015), pc, pc, pc, pc, 0.3);
  const nseg = q ? 15 : 8;
  const spread = 2.3;
  const base = col(hex, 0.9 + rand() * 0.2);
  for (let i = 0; i < nseg; i++) {
    const t = i / (nseg - 1) - 0.5;
    const ang = t * spread;
    const L = size * (0.85 + 0.15 * Math.cos(t * 3)) * (0.9 + rand() * 0.2);
    const d = dir.clone().multiplyScalar(Math.cos(ang)).addScaledVector(side, Math.sin(ang)).addScaledVector(up, 0.25).normalize();
    const tip = petEnd.clone().addScaledVector(d, L).addScaledVector(UP, -L * (0.25 + Math.abs(t) * 0.35));
    const mid = petEnd.clone().addScaledVector(d, L * 0.55).addScaledVector(UP, -L * 0.05);
    const w = new THREE.Vector3().crossVectors(d, up).normalize().multiplyScalar(size * 0.06);
    const ridge = up.clone().multiplyScalar(size * 0.025);
    const ct = base.clone().lerp(col(0xa09a58), 0.3);
    // Liuska keskeltä taitettuna (kaksi puoliskoa harjanteesta).
    m.tri(petEnd, mid.clone().add(ridge), mid.clone().add(w), base, base, base, 0.5);
    m.tri(petEnd, mid.clone().sub(w), mid.clone().add(ridge), base, base, base, 0.5);
    m.tri(mid.clone().add(ridge), tip, mid.clone().add(w), base, ct, base, 0.5);
    m.tri(mid.clone().sub(w), tip, mid.clone().add(ridge), base, ct, base, 0.5);
  }
}

export function makeDoumPalm(seed, q = 1) {
  const rand = mulberry32(seed);
  let k = 0;
  const jr = () => mulberry32(seed * 41 + 3000 + k++);
  const parts = [];
  const bark = [0x6d604f, 0x5f5446][seed % 2];
  const leafCols = [0x7a9444, 0x87a04c, 0x93a656];
  const forkY = 2.2 + rand() * 1.2;
  const base = V(0, -0.2, 0);
  const fork = V((rand() - 0.5) * 0.4, forkY, (rand() - 0.5) * 0.4);
  const cutY = 0.8;
  const shade = ringShade(13, 0.18);
  if (q === 2) {
    const t = (cutY - base.y) / (fork.y - base.y);
    const cut = base.clone().lerp(fork, t);
    const rc = 0.21 + (0.17 - 0.21) * t;
    parts.push(tag(paint(limb(base, cut, 0.21, rc, 10, false, 6), bark, { rand: jr(), shade }), 'trunk'));
    parts.push(tag(paint(limb(cut, fork, rc, 0.17, 10, false, 9), bark, { rand: jr(), shade }), 'trunk'));
  } else {
    jr(); jr();
    parts.push(paint(limb(base, fork, 0.21, 0.17, q ? 8 : 5, false, q ? 9 : 1), bark, { rand: jr(), shade }));
  }
  palmBase(parts, base, 0.21, bark, jr(), q);
  const m = new Mesher();
  const nb = 2 + Math.floor(rand() * 2);
  for (let i = 0; i < nb; i++) {
    const a = (i / nb) * Math.PI * 2 + rand() * 0.8;
    const len = 1.6 + rand() * 1.4;
    const tip = V(fork.x + Math.cos(a) * len * 0.55, fork.y + len, fork.z + Math.sin(a) * len * 0.55);
    parts.push(paint(limb(fork, tip, 0.15, 0.12, q ? 7 : 4, false, q ? 5 : 1), bark, { rand: jr(), shade }));
    const ends = [tip];
    if (rand() < 0.5) {
      const a2 = a + (rand() - 0.5) * 1.4;
      const t2 = V(tip.x + Math.cos(a2) * 0.9, tip.y + 1.0, tip.z + Math.sin(a2) * 0.9);
      parts.push(paint(limb(tip, t2, 0.12, 0.1, q ? 6 : 3, false, q ? 4 : 1), bark, { rand: jr(), shade }));
      ends.push(t2);
    }
    for (const e of ends) {
      // Kuivat lehdet roikkuvat latvan alla, vihreät viuhkana sen yllä.
      const nl = q ? 9 : 5;
      for (let l = 0; l < nl; l++) {
        const la = (l / nl) * Math.PI * 2 + rand() * 0.4;
        const dead = l % 4 === 3;
        const dir = V(Math.cos(la), dead ? -0.8 : 0.3 + rand() * 0.6, Math.sin(la)).normalize();
        fanLeaf(m, e, dir, (dead ? 0.8 : 1.0) + rand() * 0.35, dead ? 0x8a7040 : leafCols[l % 3], rand, q);
      }
    }
  }
  parts.push(m.geometry());
  return treeMeta(merge(parts), {
    kind: 'doum', base: base.toArray(), top: fork.toArray(), r0: 0.21, r1: 0.17, cutY,
    height: forkY + 4, fallLen: forkY + 2.5 - cutY, logR: 0.22,
  });
}
