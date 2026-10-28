// Sessio 58: muinainen juurakko ja sammaloitunut runko etäisyyskentästä
// (sdfMesh.js). Käyttäjä: "Muinainen juurakko" ja sen 3D-malli ja tekstuurit
// paljon paremmiksi; sammaloituneen rungon mallia huomattavasti paremmaksi.
//
// Juuret ja oksantyngät sulautuvat pehmeästi toisiinsa, kaarnassa on
// kiertyviä uurteita, juuret ovat litteähköjä ja sukeltavat maan alle, ja
// värit lasketaan pinnan suunnasta ja kentän peittävyydestä: sammal
// laikkuina yläpinnoilla ja maan rajassa, harmaantunut kaarna ja jäkälä
// kyljissä, laho punaruskea puu ontoissa kohdissa, tummuus koloissa.
// Vihreäksi väritetyt kohdat saavat materiaalissa sammaltekstuurin, muut
// kaarnan (materials.js, solid_mossy).
import * as THREE from 'three';
import { mulberry32 } from '../noise.js';
import { SdfField, fbm3, noise3, smin, smax } from './sdfMesh.js';

const _a = new THREE.Color(), _b = new THREE.Color();
// Ruudukon solun koko laatutason mukaan: 0 = kaukomalli, 1 = lähimalli
// (pelin käynnistyksessä, jos valmiiksi laskettu tiedosto puuttuu),
// 2 = tarkka (tools/organic/build.mjs laskee ja harventaa sen valmiiksi).
const CELL = { roots: [0.16, 0.1, 0.045], log: [0.12, 0.08, 0.035] };
const ss = (e0, e1, x) => { const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };
function setHex(out, hex) { _a.set(hex); out[0] = _a.r; out[1] = _a.g; out[2] = _a.b; return out; }
function mixOut(out, hex, t) {
  if (t <= 0) return;
  _a.set(hex);
  out[0] += (_a.r - out[0]) * t; out[1] += (_a.g - out[1]) * t; out[2] += (_a.b - out[2]) * t;
}

// Sammallaikku (sama funktio muodolle ja värille): > 0 = sammalta.
function mossPatch(x, y, z, ns) {
  return fbm3(x * 1.25, y * 1.25, z * 1.25, ns + 9) + noise3(x * 4.2, y * 4.2, z * 4.2, ns + 13) * 0.18;
}
// Sammalen väri: tumma oliivi -> kellanvihreä kärjet.
function mossColor(out, x, y, z, ns, t) {
  if (t <= 0) return;
  const v = ss(-0.45, 0.45, noise3(x * 2.6, y * 2.6, z * 2.6, ns + 2));
  _b.set(0x2c3f16).lerp(_a.set(0x55682a), v);
  if (v > 0.75) _b.lerp(_a.set(0x6c7832), (v - 0.75) * 2);
  out[0] += (_b.r - out[0]) * t; out[1] += (_b.g - out[1]) * t; out[2] += (_b.b - out[2]) * t;
}
// Varjostus: kolot, juurten välit ja maan raja.
function shade(out, ao, y) {
  const k = (0.28 + 0.72 * ao) * (0.58 + 0.42 * ss(-0.22, 0.14, y));
  out[0] *= k; out[1] *= k; out[2] *= k;
  return out;
}

// Juuren keskilinja: kulkee ulospäin mutkitellen, painuu maahan, voi nousta
// matalalle kaarelle ja sukeltaa lopuksi maan alle. Palauttaa pisteet ja säteet.
function rootPath(rand, start, heading, len, r0, opt) {
  const pts = [], rs = [];
  const n = Math.max(3, Math.round(len / opt.ds));
  const step = len / n;
  const s1 = len * (0.2 + rand() * 0.15);
  const arch = rand() < opt.archP ? 0.18 + rand() * opt.archH : 0;
  const wob = rand() * 100, wobA = 0.6 + rand() * 0.7;
  let x = start[0], z = start[2], a = heading;
  for (let i = 0; i <= n; i++) {
    const s = i * step, t = s / len;
    // Paksu tyvi ohenee nopeasti, kyhmyjä matkan varrella.
    const r = r0 * (0.16 + 0.84 * Math.pow(1 - t, 1.6)) * (1 + 0.18 * Math.max(0, noise3(s * 2.3, wob, 0, 7)));
    let y;
    if (s < s1) {
      const u = s / s1;
      y = start[1] + (r * 0.3 - start[1]) * (1 - Math.pow(1 - u, 2));
    } else {
      const u = (s - s1) / (len - s1);
      y = r * 0.3 + arch * Math.pow(Math.sin(Math.PI * Math.min(1, u * 1.25)), 1.4) - ss(0.55, 1, u) * (r * 1.4 + 0.12);
    }
    pts.push([x, y, z]);
    rs.push(r);
    a += noise3(s * 0.85, wob, 3, 11) * wobA * step * 1.3;
    x += Math.cos(a) * step;
    z += Math.sin(a) * step;
  }
  return { pts, rs };
}

// Juuri ei saa ylittää ruudukon reunaa (muuten pää katkeaa suoraksi
// leikkauspinnaksi): katkaistaan ennen rajaa ja pää sukeltaa maan alle.
function clampToBounds(p, lim) {
  const { pts, rs } = p;
  const i = pts.findIndex((q) => Math.hypot(q[0], q[2]) > lim);
  if (i < 0) return;
  const n = Math.max(2, i);
  pts.length = n; rs.length = n;
  const last = pts[n - 1];
  rs[n - 1] = Math.min(rs[n - 1], 0.06);
  last[1] = Math.min(last[1], -0.3);
  if (n > 2) pts[n - 2][1] = Math.min(pts[n - 2][1], rs[n - 2] * 0.2);
}

// Juuri haaroineen kenttään. lvl = haarautumistaso.
function addRoot(F, rand, start, heading, len, r0, opt, k0, lvl = 0) {
  const p = rootPath(rand, start, heading, len, r0, opt);
  clampToBounds(p, opt.lim);
  const fo = { flute: lvl ? 0.07 : 0.1, n: lvl ? 4 : 5, twist: 0.5 + rand() * 0.6, phase: rand() * 6, flatAt: (t) => 1.15 - 0.45 * Math.min(1, t * 2.5) };
  F.chain(p.pts, p.rs, k0, 0.05, fo);
  if (lvl < opt.depth) {
    const nb = lvl === 0 ? 1 + (rand() < 0.5 ? 1 : 0) : (rand() < 0.5 ? 1 : 0);
    for (let b = 0; b < nb; b++) {
      const bi = Math.floor(p.pts.length * (0.3 + rand() * 0.35));
      const bp = p.pts[bi], prev = p.pts[Math.max(0, bi - 1)];
      const h = Math.atan2(bp[2] - prev[2], bp[0] - prev[0]) + (rand() < 0.5 ? -1 : 1) * (0.45 + rand() * 0.55);
      addRoot(F, rand, bp, h, len * (0.4 + rand() * 0.2), p.rs[bi] * 0.6, { ...opt, archP: opt.archP * 0.5 }, 0.07, lvl + 1);
    }
  }
}

// Kannon tai rungon rosoinen, lahonnut yläreuna.
function jaggedTop(F, rOuter, top, depth, js) {
  F.region([-rOuter - 0.3, top - depth - 0.4, -rOuter - 0.3], [rOuter + 0.3, top + 2.5, rOuter + 0.3], (x, y, z, d) => {
    const a = Math.atan2(z, x);
    const cut = top - Math.max(0, fbm3(Math.cos(a) * 1.7, Math.sin(a) * 1.7, js, 5) + 0.15) * depth - Math.abs(noise3(a * 3.4, js, 1, 9)) * 0.14;
    return smax(d, y - cut, 0.05);
  });
}

// --- Muinainen juurakko -----------------------------------------------------------
// Muunnelmat: 0 = korkea ontto kanto, uurteinen tyvi ja paksut juuret,
// 1 = kuristajaviikunan juurihäkki (isäntäpuu lahonnut pois, juuret jääneet
// onton lieriön muotoon), 2 = matala, laho kanto ja laaja juurimatto.

export function makeAncientRoots(seed, q = 1) {
  const rand = mulberry32(seed * 7 + 3);
  const v = ((Math.round((seed - 781) / 101) % 3) + 3) % 3;
  const R = 3.6;
  const H = v === 1 ? 3.2 : 2.0;
  const F = new SdfField([-R, -0.34, -R], [R, H, R], CELL.roots[q]);
  const ns = seed % 97;
  const opt = { ds: q ? 0.2 : 0.4, archP: 0.45, archH: 0.3, depth: 1, lim: R - 0.65 };
  let sr = 0, sh = 0;
  if (v === 1) {
    // Juurihäkki: 7–9 juurta nousee maasta lieriön kylkeä pitkin kiertyen,
    // vierekkäiset juuret yhdistyvät poikittaisilla sulaumilla.
    const n = 7 + Math.floor(rand() * 3);
    const rc = 0.62 + rand() * 0.18;
    const top = 2.1 + rand() * 0.8;
    const spin = (rand() < 0.5 ? -1 : 1) * (0.5 + rand() * 0.4);
    const cols = [];
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2 + (rand() - 0.5) * 0.35;
      const ht = top * (0.75 + rand() * 0.25);
      const pts = [], rs = [];
      const steps = q ? 9 : 5;
      const r0 = 0.15 + rand() * 0.04;
      for (let j = 0; j <= steps; j++) {
        const t = j / steps;
        const y = -0.2 + t * ht;
        const a = a0 + spin * t + noise3(t * 3, i, 0, ns) * 0.18;
        const flare = 1 + 1.3 * Math.pow(Math.max(0, 1 - t * 3.2), 2);
        const rr = rc * flare + noise3(t * 4, i, 2, ns) * 0.06;
        pts.push([Math.cos(a) * rr, y, Math.sin(a) * rr]);
        rs.push(r0 * (1 + 0.8 * Math.max(0, 1 - t * 4)) * (1 - 0.35 * t));
      }
      cols.push(pts);
      F.chain(pts, rs, 0.12, 0.05, { flute: 0.08, n: 4, twist: 1.2, phase: rand() * 6 });
      // Pintajuuri ulospäin tyvestä.
      addRoot(F, rand, pts[0], a0 + (rand() - 0.5) * 0.5, 1.4 + rand() * 1.1, 0.16 + rand() * 0.05, { ...opt, archP: 0.3, depth: 0 }, 0.14, 0);
    }
    // Sulaumat vierekkäisten juurten välillä.
    const nb = 11 + Math.floor(rand() * 5);
    for (let b = 0; b < nb; b++) {
      const i = Math.floor(rand() * n), j = (i + 1) % n;
      const A = cols[i][1 + Math.floor(rand() * (cols[i].length - 3))];
      const B = cols[j][Math.max(1, Math.min(cols[j].length - 2, Math.round((A[1] + 0.2) / ((cols[j][cols[j].length - 1][1] + 0.2) / (cols[j].length - 1))) + (rand() < 0.5 ? 0 : 1)))];
      F.cone(A, B, 0.085, 0.075, 0.1);
    }
    // Katkenneet latvat: vino, rosoinen murtopinta.
    for (const pts of cols) {
      const tip = pts[pts.length - 1], pre = pts[pts.length - 2];
      const dx = tip[0] - pre[0], dy = tip[1] - pre[1], dz = tip[2] - pre[2];
      const dl = Math.hypot(dx, dy, dz);
      const nx = dx / dl + (rand() - 0.5) * 0.9, ny = dy / dl, nz = dz / dl + (rand() - 0.5) * 0.9;
      const nl = Math.hypot(nx, ny, nz);
      const c = [tip[0] - (dx / dl) * 0.12, tip[1] - (dy / dl) * 0.12, tip[2] - (dz / dl) * 0.12];
      F.region([tip[0] - 0.45, tip[1] - 0.45, tip[2] - 0.45], [tip[0] + 0.45, tip[1] + 0.45, tip[2] + 0.45], (x, y, z, d) => {
        const s1 = ((x - c[0]) * nx + (y - c[1]) * ny + (z - c[2]) * nz) / nl;
        return smax(d, s1 + noise3(x * 12, y * 12, z * 12, ns + 5) * 0.04, 0.02);
      });
    }
    // Keskellä lahonneen rungon jättämä kuoppa.
    F.ellipsoid([0, 0.0, 0], rc * 0.75, 0.3, rc * 0.75, 0.1, 0, 0, 'sub');
  } else {
    // Kanto: rengas uurteisia, tyveltä leviäviä lohkoja (kuin vanhan puun
    // tyvi), ontto sisus ja rosoinen yläreuna.
    sr = v === 2 ? 0.95 + rand() * 0.15 : 0.72 + rand() * 0.12;
    sh = v === 2 ? 0.55 + rand() * 0.2 : 1.25 + rand() * 0.5;
    F.cone([0, -0.34, 0], [0, sh, 0], sr * 1.02, sr * 0.88, 0, 'add', { flute: 0.06, n: 9, twist: 0.25, phase: rand() * 6 });
    const nl = v === 2 ? 7 : 6 + Math.floor(rand() * 3);
    const la = rand() * Math.PI * 2;
    for (let i = 0; i < nl; i++) {
      const a = la + (i / nl) * Math.PI * 2 + (rand() - 0.5) * 0.4;
      const ca = Math.cos(a), sa = Math.sin(a);
      const lr = 0.24 + rand() * 0.1;
      // Lohko: kannon kylkeä alas, levenee maan rajassa ja jatkuu juureksi.
      const top = [ca * sr * 0.8, sh * (0.55 + rand() * 0.35), sa * sr * 0.8];
      const foot = [ca * (sr + 0.35), lr * 0.4, sa * (sr + 0.35)];
      F.cone(top, foot, lr * 0.55, lr * 1.05, 0.2, 'add', { flute: 0.05, n: 3, flat: 1.0 });
      const heading = a + (rand() - 0.5) * 0.35;
      addRoot(F, rand, foot, heading, (v === 2 ? 2.2 : 1.8) + rand() * 1.0, lr * 0.95, { ...opt, depth: v === 2 ? 2 : 1, archP: v === 2 ? 0.55 : 0.4 }, 0.12, 0);
    }
    // Ontto sisus ja lahonnut, rosoinen yläreuna.
    F.cone([0, 0.08, 0], [0, sh + 0.8, 0], sr * 0.6, sr * 0.68, 0.08, 'sub');
    jaggedTop(F, sr * 1.3, sh, sh * (v === 2 ? 0.5 : 0.65), rand() * 100);
    // Halkeama kyljessä (näkee sisään).
    if (v === 0 && rand() < 0.75) {
      const a = rand() * Math.PI * 2;
      F.ellipsoid([Math.cos(a) * sr * 0.9, sh * 0.45, Math.sin(a) * sr * 0.9], 0.2, sh * 0.32, 0.12, 0.05, -a + Math.PI / 2, 0, 'sub');
    }
  }
  // Kaarnan kyhmyt (kohina lähellä pintaa).
  F.map((x, y, z, d) => d + fbm3(x * 1.6, y * 1.6, z * 1.6, ns) * 0.045 + noise3(x * 5, y * 5, z * 5, ns + 3) * 0.012, 0.22);
  // Sammalpatjat.
  F.map((x, y, z, d) => d - Math.max(0, mossPatch(x, y, z, ns)) * 0.035, 0.08);

  const bark = [0x4a3c2e, 0x6a6052, 0x463a2c][v];
  const grey = [0x6e6455, 0x8e8676, 0x675b4c][v];
  return F.mesh((x, y, z, nx, ny, nz, ao, out) => {
    setHex(out, bark);
    mixOut(out, grey, ss(-0.15, 0.45, fbm3(x * 1.1, y * 1.1, z * 1.1, ns + 5)) * 0.85);
    mixOut(out, 0x5a3a24, ss(0.15, 0.5, fbm3(x * 0.7, y * 0.7, z * 0.7, ns + 17)) * 0.5);
    // Kannon sisus: laho, punaruskea, kuituinen.
    const rr = Math.hypot(x, z);
    let inner = 0;
    if (sr > 0 && y > 0.05) {
      inner = ss(sr * 0.8, sr * 0.68, rr);
      mixOut(out, noise3(x * 6, y * 10, z * 6, ns) > 0 ? 0x6a3a20 : 0x3c2214, inner);
    }
    // Jäkälä (vaalea, ei vihreä) kyljissä.
    mixOut(out, 0xb0aa94, ss(0.3, 0.55, fbm3(x * 4.2, y * 4.2, z * 4.2, ns + 21)) * (1 - Math.abs(ny)) * 0.7);
    // Sammal: laikkuina yläpinnoilla, maan rajassa enemmän.
    const m = mossPatch(x, y, z, ns);
    const moss = Math.min(1, ss(0.15, 0.6, ny) * ss(-0.05, 0.12, m) + (1 - ss(0.0, 0.3, y)) * ss(0.0, 0.2, m) * 0.6) * (1 - inner);
    mossColor(out, x, y, z, ns, moss);
    return shade(out, ao, y);
  });
}

// --- Sammaloitunut runko -----------------------------------------------------------
// Kaatunut, lahoava sademetsän runko: ontto katkennut latvapää, tyvessä joko
// irti revennyt juuripaakku tai katkeama, painunut ja halkeillut kylki,
// katkenneita oksantynkiä, kääpiä ja laikukas sammal.

export function makeMossyLog(seed, q = 1) {
  const rand = mulberry32(seed * 13 + 1);
  const v = ((Math.round((seed - 191) / 101) % 3) + 3) % 3;
  const len = 3.4 + rand() * 1.6;
  const r = 0.3 + rand() * 0.12;
  const x0 = -len / 2, x1 = len / 2;
  const bendZ = (rand() - 0.5) * 0.5, sag = 0.03 + rand() * 0.05;
  const cy = r * 0.7;
  const rootEnd = v !== 1;
  const ns = seed % 89;
  const path = (x) => {
    const t = Math.max(0, Math.min(1, (x - x0) / len));
    return [cy - sag * Math.sin(Math.PI * t), bendZ * Math.sin(Math.PI * t)];
  };
  const radAt = (x) => {
    const t = Math.max(0, Math.min(1, (x - x0) / len));
    return r * (1 - 0.22 * t) * (1 + (rootEnd ? 0.32 * Math.pow(Math.max(0, 1 - t * 4.5), 2) : 0));
  };
  const plate = rootEnd ? radAt(x0) * 1.9 + 0.15 : 0;
  const W = Math.max(r * 1.6 + 0.5, radAt(x0) + plate * 1.1 + 0.3);
  const F = new SdfField([x0 - (rootEnd ? 1.0 : 0.25), -0.24, -W], [x1 + 0.25, Math.max(cy + r * 1.4 + 0.6, cy + radAt(x0) + plate * 1.1 + 0.3), W], CELL.log[q]);
  const hollow = 0.55 + rand() * 0.9;
  const hollow0 = !rootEnd && rand() < 0.6;
  const fis = rand() * Math.PI * 2, fisX = x0 + len * (0.2 + rand() * 0.4), fisL = len * (0.25 + rand() * 0.3);
  const sinkX = x0 + len * (0.35 + rand() * 0.4);
  F.map((x, y, z, d) => {
    if (x < x0 - 0.3 || x > x1 + 0.25) return d;
    const [py, pz] = path(x);
    const dy = y - py, dz = z - pz;
    const rad = Math.hypot(dy, dz);
    const ang = Math.atan2(dz, dy);
    let rr = radAt(x);
    // Kaarnan harjanteet, kyhmyt ja painumat.
    rr *= 1 + 0.03 * Math.sin(ang * 11 + 2.2 * Math.sin(x * 0.9 + ns)) + 0.07 * fbm3(x * 0.8, Math.cos(ang) * 0.9, Math.sin(ang) * 0.9, ns);
    // Lahonnut, painunut yläpinta yhdessä kohdassa.
    const up = dy / (rad || 1);
    rr -= Math.max(0, up) * r * 0.22 * Math.exp(-(((x - sinkX) / 0.6) ** 2));
    // Pitkä halkeama kyljessä.
    const da = Math.atan2(Math.sin(ang - fis), Math.cos(ang - fis));
    rr -= 0.05 * Math.exp(-((da / 0.09) ** 2)) * ss(fisX - 0.2, fisX + 0.2, x) * ss(fisX + fisL + 0.2, fisX + fisL - 0.2, x);
    let e = rad - rr;
    // Sammalpatja.
    e -= Math.max(0, up + 0.1) * Math.max(0, mossPatch(x, y, z, ns)) * 0.05;
    // Päät: latvapää katkennut rosoisesti, tyvi joko katkennut tai juurellinen.
    const jag = fbm3(dy * 4.5, dz * 4.5, ns, 3) * 0.18 + noise3(dy * 10, dz * 10, ns, 6) * 0.045;
    e = smax(e, (x - x1) + jag, 0.04);
    e = smax(e, (x0 - x) + (rootEnd ? 0 : jag * 0.7), 0.04);
    // Ontot päät (lahonnut sydänpuu).
    e = smax(e, -Math.max(rad - rr * 0.64, (x1 - hollow) - x), 0.05);
    if (hollow0) e = smax(e, -Math.max(rad - rr * 0.6, x - (x0 + hollow * 0.7)), 0.05);
    return smin(d, e, 0);
  });
  // Juuripaakku tyvessä: pystyssä oleva multakiekko, josta juuret
  // törröttävät ja kaartuvat maahan.
  if (rootEnd) {
    const [py, pz] = path(x0);
    const rb = radAt(x0);
    F.ellipsoid([x0 - 0.1, py + plate * 0.15, pz], 0.2, plate * 0.72, plate * 0.82, 0.15);
    F.map((x, y, z, d) => (x < x0 + 0.1 ? d + fbm3(x * 1.6, y * 1.6, z * 1.6, ns + 31) * 0.16 + noise3(x * 6, y * 6, z * 6, ns + 33) * 0.03 : d), 0.35);
    const n = 8 + Math.floor(rand() * 4);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rand() * 0.5;
      const ca = Math.cos(a), sa = Math.sin(a);
      const l = plate * (0.6 + rand() * 0.45);
      const p0 = [x0 + 0.2, py + ca * rb * 0.55, pz + sa * rb * 0.55];
      const p1 = [x0 - 0.14 - rand() * 0.1, py + ca * (rb + l * 0.65), pz + sa * (rb + l * 0.65)];
      // Osa juurista törröttää paakusta ulospäin (poispäin rungosta).
      const out = rand() < 0.45 ? 0.35 + rand() * 0.4 : 0.05 + rand() * 0.2;
      const p2 = [x0 - out, py + ca * (rb + l), pz + sa * (rb + l)];
      p1[1] = Math.max(-0.12, p1[1]); p2[1] = Math.max(-0.22, Math.min(p2[1], p1[1] + 0.15));
      const r0 = 0.09 + rand() * 0.06;
      F.chain([p0, p1, p2], [r0, r0 * 0.65, 0.03], 0.08, 0.04, { flute: 0.08, n: 4, twist: 1, phase: rand() * 6 });
    }
  }
  // Oksantyngät: kartiot, tyvessä paksu kaulus, kärki katkennut vinosti.
  const nb = 2 + Math.floor(rand() * 3);
  for (let i = 0; i < nb; i++) {
    const x = x0 + len * (0.3 + rand() * 0.6);
    const [py, pz] = path(x);
    const a = (rand() - 0.5) * 2.4;
    const dir = [0.3 + rand() * 0.5, Math.cos(a), Math.sin(a)];
    const dl = Math.hypot(...dir);
    const l = radAt(x) + 0.15 + rand() * 0.45;
    const rb = 0.06 + rand() * 0.05;
    const tip = [x + (dir[0] / dl) * l, py + (dir[1] / dl) * l, pz + (dir[2] / dl) * l];
    F.cone([x, py, pz], tip, rb * 1.5, rb * 0.75, 0.1, 'add', { flute: 0.08, n: 3, twist: 2, phase: rand() * 6 });
    const cut = [-dir[0] / dl + (rand() - 0.5), -dir[1] / dl + (rand() - 0.5) * 0.6, -dir[2] / dl + (rand() - 0.5) * 0.6];
    const cl = Math.hypot(...cut);
    const cc = [tip[0] - (dir[0] / dl) * 0.06, tip[1] - (dir[1] / dl) * 0.06, tip[2] - (dir[2] / dl) * 0.06];
    F.region([tip[0] - 0.3, tip[1] - 0.3, tip[2] - 0.3], [tip[0] + 0.3, tip[1] + 0.3, tip[2] + 0.3], (px, py2, pz2, d) => {
      const s = ((px - cc[0]) * cut[0] + (py2 - cc[1]) * cut[1] + (pz2 - cc[2]) * cut[2]) / cl;
      return smax(d, -s + noise3(px * 14, py2 * 14, pz2 * 14, ns + i) * 0.03, 0.015);
    });
  }
  // Kääpiä kyljissä, 2–3 päällekkäin ryhmissä.
  const fungi = [];
  const nf = 1 + Math.floor(rand() * 3);
  for (let i = 0; i < nf; i++) {
    const x = x0 + len * (0.15 + rand() * 0.7);
    const side = rand() < 0.5 ? -1 : 1;
    const [py, pz] = path(x);
    const rr = radAt(x);
    const k = 2 + Math.floor(rand() * 2);
    for (let j = 0; j < k; j++) {
      const fx = x + (rand() - 0.5) * 0.25;
      const fy = py - rr * 0.15 + j * 0.12 + rand() * 0.04;
      const s = (0.1 + rand() * 0.07) * (1 - j * 0.15);
      const c = [fx, fy, pz + side * (Math.sqrt(Math.max(0, rr * rr - (fy - py) ** 2)) + s * 0.5)];
      F.ellipsoid(c, s * 1.25, s * 0.26, s, 0.02, 0, side * 0.1);
      fungi.push({ c, s });
    }
  }
  F.map((x, y, z, d) => d + noise3(x * 4.5, y * 4.5, z * 4.5, ns + 7) * 0.012, 0.15);

  const bark = [0x4a3b2c, 0x524131, 0x433628][v];
  const tmp = [0, 0, 0];
  return F.mesh((x, y, z, nx, ny, nz, ao, out) => {
    const [py, pz] = path(x);
    const rad = Math.hypot(y - py, z - pz);
    setHex(out, bark);
    mixOut(out, 0x6a5c4c, ss(-0.05, 0.5, fbm3(x * 1.2, y * 1.2, z * 1.2, ns + 5)) * 0.75);
    // Kuoriutuneet kohdat: harmaa, kulunut puu.
    const peel = ss(0.28, 0.4, fbm3(x * 0.9, y * 2.2, z * 2.2, ns + 41));
    mixOut(out, 0x8a7c66, peel * 0.85);
    // Laho sisus ja katkeamat (sydänpuu näkyy).
    const inner = ss(radAt(x) * 0.88, radAt(x) * 0.72, rad) * (rootEnd && x < x0 + 0.05 ? 0 : 1);
    mixOut(out, noise3(x * 3, y * 14, z * 14, ns) > 0 ? 0x7a4626 : 0x56301c, inner);
    // Juuripaakun multa.
    if (rootEnd && x < x0 + 0.08) {
      const soil = ss(x0 + 0.08, x0 - 0.12, x) * ss(-0.2, 0.25, fbm3(x * 2.2, y * 2.2, z * 2.2, ns + 35) + 0.15);
      mixOut(out, noise3(x * 5, y * 5, z * 5, ns + 3) > 0 ? 0x6a5236 : 0x4a3a28, soil);
    }
    // Kääpä: yläpinta ruskea, reuna vaalea, alapinta kermanvaalea.
    for (const f of fungi) {
      const dd = Math.hypot((x - f.c[0]) / (f.s * 1.3), (y - f.c[1]) / (f.s * 0.42), (z - f.c[2]) / (f.s * 1.05));
      if (dd < 1.15) {
        if (ny > 0) { setHex(tmp, 0x8a5c30); mixOut(tmp, 0xd4b07a, ss(0.35, 0.95, dd)); } else setHex(tmp, 0xe4dabc);
        const t = ss(1.15, 0.95, dd);
        out[0] += (tmp[0] - out[0]) * t; out[1] += (tmp[1] - out[1]) * t; out[2] += (tmp[2] - out[2]) * t;
        return shade(out, Math.max(ao, 0.6), y);
      }
    }
    // Sammal: laikkuina yläpinnalla, valuu kyljille.
    const m = mossPatch(x, y, z, ns);
    const moss = Math.min(1, ss(-0.1, 0.45, ny) * ss(-0.02, 0.14, m) + (1 - ss(0.0, 0.16, y)) * ss(0.05, 0.25, m) * 0.5) * (1 - inner) * (1 - peel * 0.8);
    mossColor(out, x, y, z, ns, moss);
    return shade(out, ao, y);
  });
}
