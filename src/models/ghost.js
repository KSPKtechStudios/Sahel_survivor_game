// Sessio 58: haamun huppu, hartiaviitta, kallo ja luiset kädet
// etäisyyskentästä (sdfMesh.js). Käyttäjä: haamun 3D-malli ja tekstuurit
// realistisemmiksi.
//
// Huppu on oikea kaapumainen huppu laskoksineen: paksumpi käännetty reuna,
// kasvoaukko ja taakse roikkuva kärki. Hupun pimeydessä on tuskin erottuva,
// riutunut kallo, jonka silmäkuopissa hehkuu (silmät ovat erillisiä, mobs.js
// sykyttää niitä). Hihojen suista roikkuvat luiset, nivelikkäät sormet.
// Huppu ja hartiaviitta käyttävät viitan kangastekstuuria (UV lasketaan
// muodosta, ghostClothUv); verteksiväri on niissä vain varjostus.
import * as THREE from 'three';
import { SdfField, fbm3, noise3, smax } from './sdfMesh.js';

const _a = new THREE.Color();
const ss = (e0, e1, x) => { const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };
function setHex(out, hex) { _a.set(hex); out[0] = _a.r; out[1] = _a.g; out[2] = _a.b; return out; }
function mixOut(out, hex, t) {
  if (t <= 0) return;
  _a.set(hex);
  out[0] += (_a.r - out[0]) * t; out[1] += (_a.g - out[1]) * t; out[2] += (_a.b - out[2]) * t;
}

// Solun koko laatutason mukaan (0 kauko, 1 käynnistyksessä, 2 valmiiksi laskettu).
const CELL = { cloth: [0.03, 0.012, 0.0055], bone: [0.016, 0.006, 0.0026] };

export const GHOST_PARTS = ['hood', 'mantle', 'face', 'handL', 'handR'];

// Hupun sisäontelo (myös värityksessä: sisäpuoli on pimeä).
const CAV = { c: [0, 0.12, 0.03], r: [0.118, 0.16, 0.17] };
const inCavity = (x, y, z) => Math.hypot(x / CAV.r[0], (Math.max(0, y - CAV.c[1]) + Math.min(0, y - CAV.c[1]) * 0.5) / CAV.r[1], (z - CAV.c[2]) / CAV.r[2]);

// Kangas: väri tulee tekstuurista, verteksiväri on varjostus (laskosten
// pohjat ja hupun sisus tummempia).
function clothShade(x, y, z, nx, ny, nz, ao, out, dark = 1) {
  const v = 0.82 + 0.18 * ss(-0.3, 0.4, fbm3(x * 5, y * 5, z * 5, 3));
  const k = v * (0.3 + 0.7 * ao) * dark;
  out[0] = 0.92 * k; out[1] = 0.9 * k; out[2] = k;
  return out;
}

// Luu: tuhkanharmaa, hieman violetti; kolot ja saumat tummempia.
function boneColor(x, y, z, nx, ny, nz, ao, out, pale = 0) {
  setHex(out, pale ? 0x6a6470 : 0x4a4650);
  mixOut(out, pale ? 0x9a92a0 : 0x746e7a, ss(-0.1, 0.5, fbm3(x * 40, y * 40, z * 40, 5)) * 0.55);
  mixOut(out, 0x1a171e, ss(0.25, 0.6, noise3(x * 90, y * 90, z * 90, 9)) * 0.45);
  const k = 0.2 + 0.8 * ao * ao;
  out[0] *= k; out[1] *= k; out[2] *= k;
  return out;
}

// Laskokset: kankaan pinta aaltoilee kulman mukaan (pystysuorat poimut).
function folds(F, cx, cz, amp, n, seed) {
  F.map((x, y, z, d) => {
    const a = Math.atan2(x - cx, z - cz);
    return d - amp * (Math.sin(a * n + y * 6 + seed) * 0.7 + noise3(x * 12, y * 4, z * 12, seed) * 0.5);
  }, 0.03);
}

// Huppu (pään koordinaatistossa): kupu, otsan yli ulottuva lippa,
// hartioille laskeutuva helma ja selkään roikkuva kärki.
function hood(q) {
  const F = new SdfField([-0.24, -0.12, -0.4], [0.24, 0.4, 0.26], CELL.cloth[q]);
  F.ellipsoid([0, 0.16, -0.035], 0.152, 0.19, 0.19, 0);
  F.ellipsoid([0, 0.255, 0.085], 0.105, 0.065, 0.1, 0.06);
  F.cone([0, 0.06, -0.03], [0, -0.09, -0.03], 0.125, 0.165, 0.06, 'add', { flat: 1.3 });
  F.cone([0, 0.27, -0.15], [0, 0.02, -0.29], 0.07, 0.018, 0.06);
  // Keskisauma päälaella (kaksi kangaskappaletta ommeltu yhteen).
  F.map((x, y, z, d) => d - 0.004 * Math.exp(-(x * x) / 0.0002) * ss(0.2, 0.3, y), 0.02);
  folds(F, 0, -0.04, 0.007, 7, 1.3);
  // Sisäpuoli (jatkuu alas kaulaan) ja kasvoaukko.
  F.ellipsoid(CAV.c, CAV.r[0], CAV.r[1], CAV.r[2], 0.02, 0, 0, 'sub');
  F.cone([0, 0.08, 0.02], [0, -0.12, 0.0], 0.085, 0.15, 0.03, 'sub', { flat: 1.3 });
  F.ellipsoid([0, 0.095, 0.205], 0.1, 0.15, 0.115, 0.035, 0, 0, 'sub');
  // Aukon reuna on paksumpi (käännetty kangasreuna).
  F.map((x, y, z, d) => {
    const e = Math.hypot(x / 0.105, (y - 0.1) / 0.155) - 1;
    return z > 0.06 ? d - 0.006 * Math.exp(-(e * e) / 0.02) : d;
  }, 0.02);
  // Helma päättyy hartiaviitan sisään.
  F.map((x, y, z, d) => smax(d, -0.1 - y, 0.01), 0.1);
  return F.mesh((x, y, z, nx, ny, nz, ao, out) => {
    // Sisus on pimeä: mitä syvemmällä aukosta, sitä mustempi.
    const inner = 1 - ss(0.97, 1.12, inCavity(x, y, z));
    const deep = inner * (1 - 0.5 * ss(0.08, 0.17, z));
    return clothShade(x, y, z, nx, ny, nz, ao, out, 1 - 0.9 * deep);
  });
}

function mantle(q) {
  const F = new SdfField([-0.34, 0.36, -0.3], [0.34, 0.68, 0.3], CELL.cloth[q]);
  // Hartioille laskeutuva ohut kangaskuori (hupun helma peittää yläreunan,
  // alareuna aaltoilee laskoksina viitan päällä).
  F.cone([0, 0.64, -0.01], [0, 0.41, -0.01], 0.085, 0.215, 0.02, 'add', { flat: 1.22 });
  F.ellipsoid([0, 0.5, -0.01], 0.2, 0.06, 0.16, 0.06);
  folds(F, 0, -0.01, 0.008, 9, 4.1);
  F.cone([0, 0.61, -0.01], [0, 0.38, -0.01], 0.075, 0.205, 0.015, 'sub', { flat: 1.22 });
  F.map((x, y, z, d) => {
    const a = Math.atan2(x, z + 0.01);
    return smax(d, 0.425 + 0.018 * Math.sin(a * 9 + 1.1) + 0.008 * Math.sin(a * 23) - y, 0.01);
  }, 0.2);
  return F.mesh((x, y, z, nx, ny, nz, ao, out) => clothShade(x, y, z, nx, ny, nz, ao, out, ny < -0.3 ? 0.3 : 1));
}

// Kallo hupun sisällä (pään koordinaatistossa). Silmäkuoppien keskikohdat:
// GHOST_EYES (silmät asetetaan niihin).
export const GHOST_EYES = [[-0.034, 0.124, 0.112], [0.034, 0.124, 0.112]];
function face(q) {
  const F = new SdfField([-0.1, -0.005, -0.07], [0.1, 0.25, 0.16], CELL.bone[q]);
  // Aivokoppa, kasvojen luut, kulmakaari ja poskiluut.
  F.ellipsoid([0, 0.152, 0.035], 0.068, 0.078, 0.082, 0);
  F.ellipsoid([0, 0.1, 0.07], 0.05, 0.05, 0.05, 0.03);
  F.ellipsoid([0, 0.145, 0.105], 0.06, 0.014, 0.018, 0.02);
  for (const sx of [-1, 1]) F.ellipsoid([sx * 0.048, 0.102, 0.09], 0.017, 0.011, 0.022, 0.015);
  // Alaleuka hieman auki, ylä- ja alahampaat.
  F.ellipsoid([0, 0.032, 0.078], 0.042, 0.017, 0.04, 0.02);
  for (const sx of [-1, 1]) F.cone([sx * 0.04, 0.035, 0.05], [sx * 0.05, 0.09, 0.03], 0.008, 0.007, 0.012);
  for (let i = 0; i < 8; i++) {
    const a = (i / 7 - 0.5) * 1.9;
    F.ellipsoid([Math.sin(a) * 0.03, 0.068, 0.075 + Math.cos(a) * 0.038], 0.0055, 0.009, 0.0055, 0.002);
    F.ellipsoid([Math.sin(a) * 0.028, 0.047, 0.074 + Math.cos(a) * 0.035], 0.005, 0.008, 0.005, 0.002);
  }
  // Silmäkuopat, nenäaukko, ohimoiden ja poskien kuopat (riutunut).
  for (const sx of [-1, 1]) {
    F.ellipsoid([sx * 0.034, 0.124, 0.125], 0.02, 0.018, 0.024, 0.006, 0, 0, 'sub');
    F.ellipsoid([sx * 0.068, 0.135, 0.055], 0.012, 0.03, 0.03, 0.02, 0, 0, 'sub');
    F.ellipsoid([sx * 0.045, 0.078, 0.095], 0.012, 0.012, 0.02, 0.01, 0, 0, 'sub');
  }
  F.ellipsoid([0, 0.09, 0.122], 0.009, 0.015, 0.014, 0.004, 0, 0, 'sub');
  F.map((x, y, z, d) => d + noise3(x * 70, y * 70, z * 70, 2) * 0.0012, 0.01);
  return F.mesh(boneColor);
}

// Luinen käsi hihan suusta (olkanivelen koordinaatistossa; käsivarsi
// osoittaa suuntaan ARM kuten hihassa, ghostCloak.js).
const ARM = new THREE.Vector3(0.05, -0.46, 0.06).normalize();
const along = (sx, s) => [sx * ARM.x * s, ARM.y * s, ARM.z * s];
function hand(sx, q) {
  const F = new SdfField([-0.15, -0.82, -0.05], [0.15, -0.3, 0.28], CELL.bone[q]);
  // Kyynärvarren kaksi luuta (värttinäluu ja kyynärluu) ja ranne.
  const e = along(sx, 0.36), w = along(sx, 0.6);
  F.cone([e[0] - 0.012, e[1], e[2]], [w[0] - 0.013, w[1] + 0.012, w[2]], 0.01, 0.008, 0.004);
  F.cone([e[0] + 0.012, e[1], e[2]], [w[0] + 0.013, w[1] + 0.012, w[2]], 0.008, 0.01, 0.004);
  const wrist = w;
  F.ellipsoid(wrist, 0.025, 0.015, 0.019, 0.006);
  // Neljä sormea: kämmenluu ja kolme niveltä, kaartuvat kynsimäisesti eteen.
  for (let i = 0; i < 4; i++) {
    const o = (i - 1.5) * 0.02;
    const knuckle = [wrist[0] + o * 1.35, wrist[1] - 0.062, wrist[2] + 0.018];
    F.cone([wrist[0] + o * 0.6, wrist[1] - 0.008, wrist[2]], knuckle, 0.0066, 0.0074, 0.003);
    F.ellipsoid(knuckle, 0.0098, 0.0098, 0.0098, 0.003);
    const L = [0.048, 0.034, 0.025].map((l) => l * (i === 0 || i === 3 ? 0.86 : 1));
    let p = knuckle, ang = 0.2 + i * 0.06;
    for (let j = 0; j < 3; j++) {
      ang += 0.38;
      const nq = [p[0] + o * 0.18, p[1] - Math.cos(ang) * L[j], p[2] + Math.sin(ang) * L[j]];
      F.cone(p, nq, 0.0066 - j * 0.0011, 0.0058 - j * 0.0015, 0.002);
      if (j < 2) F.ellipsoid(nq, 0.0078 - j * 0.0012, 0.0075 - j * 0.0012, 0.0078 - j * 0.0012, 0.002);
      p = nq;
    }
  }
  // Peukalo.
  const t0 = [wrist[0] - sx * 0.024, wrist[1] - 0.014, wrist[2] + 0.014];
  const t1 = [t0[0] - sx * 0.025, t0[1] - 0.034, t0[2] + 0.024];
  const t2 = [t1[0] - sx * 0.009, t1[1] - 0.031, t1[2] + 0.022];
  F.cone(t0, t1, 0.0078, 0.0066, 0.003);
  F.ellipsoid(t1, 0.0082, 0.0082, 0.0082, 0.002);
  F.cone(t1, t2, 0.0066, 0.0045, 0.002);
  return F.mesh((x, y, z, nx, ny, nz, ao, out) => boneColor(x, y, z, nx, ny, nz, ao, out, 1));
}

export function buildGhostPart(part, q = 1) {
  switch (part) {
    case 'hood': return hood(q);
    case 'mantle': return mantle(q);
    case 'face': return face(q);
    case 'handL': return hand(-1, q);
    default: return hand(1, q);
  }
}

// Kankaan UV muodosta (uusi geometria; ladattu malli on jaettu): u kiertää
// pystyakselin ympäri, v korkeuden mukaan tekstuurin yläosassa (ei helman
// repeämiä). Sauman (takana) ylittävät kolmiot saavat omat kärkipisteet.
export function ghostClothUv(src, cx, cz, y0, y1) {
  const p = src.attributes.position, n = p.count;
  const u = new Float32Array(n), v = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    u[i] = (Math.atan2(p.getX(i) - cx, p.getZ(i) - cz) / (Math.PI * 2) + 0.5) * 2;
    v[i] = 1 - ((y1 - p.getY(i)) / (y1 - y0)) * 0.42;
  }
  const idx = Array.from(src.index.array);
  const dup = new Map(), extra = [];
  for (let t = 0; t < idx.length; t += 3) {
    const a = u[idx[t]], b = u[idx[t + 1]], c = u[idx[t + 2]];
    if (Math.max(a, b, c) - Math.min(a, b, c) < 1) continue;
    for (let k = t; k < t + 3; k++) {
      const s = idx[k];
      if (u[s] >= 1) continue;
      if (!dup.has(s)) { dup.set(s, n + extra.length); extra.push(s); }
      idx[k] = dup.get(s);
    }
  }
  const total = n + extra.length;
  const geo = new THREE.BufferGeometry();
  for (const name of Object.keys(src.attributes)) {
    const at = src.attributes[name], is = at.itemSize;
    const arr = new Float32Array(total * is);
    for (let i = 0; i < n * is; i++) arr[i] = at.array[i];
    extra.forEach((s, j) => { for (let k = 0; k < is; k++) arr[(n + j) * is + k] = at.array[s * is + k]; });
    geo.setAttribute(name, new THREE.BufferAttribute(arr, is));
  }
  const uv = new Float32Array(total * 2);
  for (let i = 0; i < total; i++) {
    const s = i < n ? i : extra[i - n];
    uv[i * 2] = u[s] + (i < n ? 0 : 2);
    uv[i * 2 + 1] = v[s];
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.setIndex(total > 65535 ? idx : new THREE.BufferAttribute(new Uint16Array(idx), 1));
  geo.computeBoundingSphere();
  return geo;
}
