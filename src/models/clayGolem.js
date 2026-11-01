// Sessio 58: savipeikon malli etäisyyskentästä (sdfMesh.js).
//
// Tarina (käyttäjä): savipeikot ovat alueella aiemmin eläneiden ihmisten
// kuolleita sieluja, jotka nousevat yöllä maasta ja ottavat ruumiikseen
// kaiken, mitä maasta löytyy: savea, risuja, kiviä ja muuta maan ainesta.
//
// Siksi hahmo on kumara ihmismuoto: halkeillutta punaista savea, jonka sisään
// on uponnut kiviä; rintakehä on paikoin auki ja kylkiluina on risuja;
// käsivarsissa risukimppuja ja sormina juurimaiset kynnet; jaloista roikkuu
// juuria, kuin hahmo olisi yhä kiinni maassa. Kallomaisessa päässä hehkuvat
// hiillossilmät, ja menneistä ihmisistä muistuttavat otsaan painunut
// saviruukun pala ja muutama savihelmi kaulassa.
//
// Osat ovat samoissa nivelissä kuin ennen (vartalo lantiossa, pää kaulassa,
// kädet olkapäissä, jalat lonkissa), joten animaatiot (mobs.js) toimivat
// sellaisinaan. Tarkat osat lasketaan valmiiksi (tools/organic/build.mjs,
// assets/models/organic.bin); muuten käynnistyksessä karkeammin.
import * as THREE from 'three';
import { mulberry32 } from '../noise.js';
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
const CELL = { head: [0.03, 0.016, 0.0075], body: [0.04, 0.022, 0.011] };

export const GOLEM_PARTS = ['torso', 'head', 'armL', 'armR', 'legL', 'legR'];

// Merkityt alueet värejä varten (kivet, risut, ruukunpala, helmet).
class Marks {
  constructor() { this.list = []; }
  add(kind, c, r) { this.list.push({ kind, c, r }); }
  // Lähin merkki, jonka sisällä piste on (r * k).
  at(x, y, z, k = 1.25) {
    let best = null, bd = 1;
    for (const m of this.list) {
      const d = Math.hypot(x - m.c[0], y - m.c[1], z - m.c[2]) / (m.r * k);
      if (d < bd) { bd = d; best = m; }
    }
    return best;
  }
}
// Risut ja juuret janoina (väri lähimmän janan mukaan).
function segDist(p, a, b) {
  const bx = b[0] - a[0], by = b[1] - a[1], bz = b[2] - a[2];
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * bx + (p[1] - a[1]) * by + (p[2] - a[2]) * bz) / (bx * bx + by * by + bz * bz || 1)));
  return Math.hypot(p[0] - a[0] - bx * t, p[1] - a[1] - by * t, p[2] - a[2] - bz * t);
}

// Kyhmyjä raajan pinnalle (kasautunutta savea).
function lumps(F, rand, a, b, r, n) {
  for (let i = 0; i < n; i++) {
    const t = 0.15 + rand() * 0.7, an = rand() * Math.PI * 2;
    const c = [a[0] + (b[0] - a[0]) * t + Math.cos(an) * r * 0.8, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t + Math.sin(an) * r * 0.8];
    const rr = r * (0.35 + rand() * 0.3);
    F.ellipsoid(c, rr, rr * 1.2, rr, 0.02);
  }
}
// Kaksiosainen, taipuva juuri tai risu.
function root(F, sticks, rand, a, dir, len, r) {
  const m = [a[0] + dir[0] * len * 0.5, a[1] + dir[1] * len * 0.5, a[2] + dir[2] * len * 0.5];
  const b = [m[0] + dir[0] * len * 0.5 + (rand() - 0.5) * len * 0.4, m[1] + dir[1] * len * 0.5 + (rand() - 0.5) * len * 0.3, m[2] + dir[2] * len * 0.5 + (rand() - 0.5) * len * 0.4];
  twig(F, sticks, a, m, r, r * 0.7, 0.012);
  twig(F, sticks, m, b, r * 0.7, r * 0.25, 0.004);
}

function twig(F, sticks, a, b, r0, r1, k = 0.01) {
  F.cone(a, b, r0, r1, k);
  sticks.push({ a, b, r: Math.max(r0, r1) });
}

// Halkeamat: kapeat uurteet, jotka kulkevat savessa (harjanteinen kohina).
function crackField(F, ns, depth, freq) {
  F.map((x, y, z, d) => {
    const n = Math.abs(noise3(x * freq, y * freq * 1.3, z * freq, ns + 41) + noise3(x * freq * 2.1, y * freq * 2.1, z * freq * 2.1, ns + 43) * 0.35);
    return d + ss(0.07, 0.0, n) * depth + fbm3(x * 9, y * 9, z * 9, ns + 7) * 0.004;
  }, 0.03);
}

function colorFn(ns, marks, sticks, crackFreq) {
  return (x, y, z, nx, ny, nz, ao, out) => {
    // Savi: märkä tumma ja kuivunut vaalea laikuittain, pölyä yläpinnoilla.
    setHex(out, 0x7a4430);
    mixOut(out, 0x9a6242, ss(-0.25, 0.35, fbm3(x * 5, y * 5, z * 5, ns + 3)));
    mixOut(out, 0xb98a62, ss(0.4, 0.9, ny) * ss(0.0, 0.4, fbm3(x * 7, y * 7, z * 7, ns + 5)) * 0.55);
    // Valumajuovat (pystysuuntaiset).
    mixOut(out, 0x5e2a18, ss(0.25, 0.5, noise3(x * 22, y * 3, z * 22, ns + 9)) * 0.35);
    // Halkeamat tummina.
    const n = Math.abs(noise3(x * crackFreq, y * crackFreq * 1.3, z * crackFreq, ns + 41) + noise3(x * crackFreq * 2.1, y * crackFreq * 2.1, z * crackFreq * 2.1, ns + 43) * 0.35);
    mixOut(out, 0x2e140c, ss(0.06, 0.0, n) * 0.85);
    const m = marks.at(x, y, z);
    if (m) {
      if (m.kind === 'stone') {
        setHex(out, (m.c[0] * 7 + m.c[1] * 3) % 1 > 0.5 ? 0x77716a : 0x5f5a54);
        mixOut(out, 0x9a958c, ss(-0.1, 0.5, fbm3(x * 30, y * 30, z * 30, ns)) * 0.5);
        mixOut(out, 0x7a4430, 0.2); // saven tahrimaa
      } else if (m.kind === 'shard') {
        setHex(out, 0xc4703a);
        // Ruukun maalatut vyöt ja siksak-kuvio.
        const band = Math.sin((y - m.c[1]) * 140 + Math.sin(x * 90) * 1.6);
        if (band > 0.55) setHex(out, 0x3a2418);
        mixOut(out, 0x7a4430, ss(0.7, 1.0, Math.hypot(x - m.c[0], y - m.c[1], z - m.c[2]) / m.r) * 0.7);
      } else if (m.kind === 'bead') {
        setHex(out, 0xd9c8a4);
        mixOut(out, 0x8a6a48, ss(0.3, 0.9, noise3(x * 60, y * 60, z * 60, ns)) * 0.4);
      }
    }
    for (const s of sticks) {
      const d = segDist([x, y, z], s.a, s.b);
      if (d < s.r * 1.35) {
        setHex(out, 0xa89c84);
        mixOut(out, 0x5e5040, ss(-0.2, 0.4, noise3(x * 40, y * 120, z * 40, ns + 11)) * 0.55);
        mixOut(out, 0x7a4430, ss(s.r * 0.9, s.r * 1.35, d) * 0.6);
        break;
      }
    }
    const k = (0.3 + 0.7 * ao);
    out[0] *= k; out[1] *= k; out[2] *= k;
    return out;
  };
}

// --- Osat -----------------------------------------------------------------------------
// Nivelen kohta on origossa. Malli katsoo +Z-suuntaan.

function torso(v, q) {
  const rand = mulberry32(911 + v * 37);
  const ns = 300 + v * 17;
  const F = new SdfField([-0.34, -0.14, -0.26], [0.34, 0.62, 0.3], CELL.body[q]);
  const marks = new Marks(), sticks = [];
  // Lantio, vatsa, rintakehä, kumara selkä ja hartiat.
  F.ellipsoid([0, 0.03, 0], 0.17, 0.12, 0.13, 0);
  F.cone([0, 0.06, 0.01], [0, 0.26, 0.03], 0.095, 0.125, 0.08);
  F.ellipsoid([0, 0.33, 0.03], 0.2, 0.16, 0.145, 0.08);
  F.ellipsoid([0, 0.4, -0.07], 0.17, 0.12, 0.12, 0.08);
  for (const sx of [-1, 1]) F.ellipsoid([sx * 0.2, 0.42, -0.01], 0.085, 0.075, 0.085, 0.06);
  // Selkään kasautunut multakyttyrä (vino, toisen olkapään puolella).
  const hs = v === 1 ? -1 : 1;
  F.ellipsoid([hs * 0.06, 0.4, -0.13], 0.16, 0.13, 0.11, 0.06, hs * 0.3, 0);
  F.ellipsoid([hs * 0.16, 0.47, -0.06], 0.09, 0.07, 0.08, 0.05);
  // Kaula.
  F.cone([0, 0.42, 0.02], [0, 0.56, 0.05], 0.065, 0.05, 0.05);
  // Selkäranka: kyhmyjä selässä.
  for (let i = 0; i < 6; i++) F.ellipsoid([0, 0.1 + i * 0.065, -0.1 - Math.sin(i * 0.5) * 0.05], 0.03, 0.022, 0.03, 0.02);
  // Rintakehän aukko ja risukylkiluut.
  const side = rand() < 0.5 ? -1 : 1;
  F.ellipsoid([side * 0.06, 0.29, 0.15], 0.09, 0.08, 0.07, 0.025, 0, 0, 'sub');
  for (let i = 0; i < 3; i++) {
    const y = 0.24 + i * 0.045;
    twig(F, sticks, [side * -0.03, y + 0.01, 0.13], [side * 0.17, y - 0.02, 0.09], 0.015, 0.011, 0.008);
  }
  // Risukylkiluita myös toisella kyljellä (savi ohutta).
  for (let i = 0; i < 2; i++) {
    const y = 0.22 + i * 0.05;
    twig(F, sticks, [-side * 0.06, y, 0.12], [-side * 0.19, y - 0.03, 0.04], 0.013, 0.01, 0.01);
  }
  // Kiviä uponneena saveen (hartiat, kylki, lantio, selkä).
  const spots = [[0.21, 0.47, 0.02], [-0.16, 0.2, 0.09], [0.12, 0.02, -0.1], [-0.08, 0.38, -0.15], [0.15, 0.3, 0.1]];
  for (let i = 0; i < 4; i++) {
    const p = spots[(i + v) % spots.length];
    const r = 0.045 + rand() * 0.025;
    const c = [p[0] * (v === 1 ? -1 : 1), p[1], p[2]];
    F.ellipsoid(c, r, r * 0.8, r * 0.9, 0.012, rand() * 3, rand());
    marks.add('stone', c, r);
  }
  // Juuria ja risuja törröttää kyttyrästä ja hartioista.
  for (let i = 0; i < 7; i++) {
    const sx = rand() < 0.65 ? hs : -hs;
    const a = [sx * (0.02 + rand() * 0.14), 0.32 + rand() * 0.16, -0.16 - rand() * 0.05];
    const dl = Math.hypot(sx * 0.4, 0.9, -0.6);
    root(F, sticks, rand, a, [sx * (0.2 + rand() * 0.4) / dl, (0.5 + rand() * 0.5) / dl, -(0.4 + rand() * 0.5) / dl], 0.16 + rand() * 0.2, 0.014 + rand() * 0.006);
  }
  // Ruukunpala rinnassa (kupera, ohut kuori) ja savihelmiä kaulassa.
  const sh = [-side * 0.1, 0.36, 0.17];
  F.ellipsoid(sh, 0.075, 0.06, 0.025, 0.012, -side * 0.4, 0.1);
  marks.add('shard', sh, 0.075);
  for (let i = 0; i < 7; i++) {
    const t = (i / 6 - 0.5) * 2.4;
    const c = [Math.sin(t) * 0.09, 0.46 - Math.cos(t) * 0.03, 0.04 + Math.cos(t) * 0.07];
    F.ellipsoid(c, 0.019, 0.016, 0.019, 0.004);
    marks.add('bead', c, 0.02);
  }
  crackField(F, ns, 0.012, 9);
  return F.mesh(colorFn(ns, marks, sticks, 9));
}

function head(v, q) {
  const rand = mulberry32(977 + v * 41);
  const ns = 500 + v * 13;
  const F = new SdfField([-0.16, -0.08, -0.16], [0.16, 0.3, 0.2], CELL.head[q]);
  const marks = new Marks(), sticks = [];
  // Kallo, kasvot ja leuka, otsaharjanne, posket.
  F.ellipsoid([0, 0.14, -0.01], 0.1, 0.11, 0.12, 0);
  F.ellipsoid([0, 0.07, 0.06], 0.075, 0.075, 0.08, 0.04);
  F.ellipsoid([0, 0.15, 0.085], 0.1, 0.028, 0.045, 0.03);
  for (const sx of [-1, 1]) F.ellipsoid([sx * 0.06, 0.085, 0.09], 0.03, 0.025, 0.03, 0.03);
  F.cone([0, -0.06, -0.01], [0, 0.04, 0.0], 0.05, 0.06, 0.04); // kaulan yläosa
  // Silmäkuopat ja suu.
  for (const sx of [-1, 1]) F.ellipsoid([sx * 0.045, 0.115, 0.13], 0.034, 0.03, 0.045, 0.012, 0, 0, 'sub');
  // Poskiluut ja roikkuva leuka (suu ammollaan).
  for (const sx of [-1, 1]) F.ellipsoid([sx * 0.072, 0.075, 0.075], 0.025, 0.018, 0.035, 0.02);
  F.ellipsoid([0, 0.035, 0.125], 0.045, 0.022, 0.035, 0.008, 0, 0, 'sub');
  F.ellipsoid([0, 0.005, 0.07], 0.055, 0.03, 0.06, 0.025, 0, 0.25);
  // Otsaan painunut ruukunpala (vino).
  const sh = [(rand() - 0.5) * 0.06, 0.19, 0.1];
  F.ellipsoid(sh, 0.06, 0.045, 0.016, 0.01, (rand() - 0.5) * 0.6, (rand() - 0.5) * 0.5);
  marks.add('shard', sh, 0.06);
  // Kivi ohimossa, risuja päälaella kuin karvoina.
  const st = [(v === 2 ? -1 : 1) * 0.095, 0.17, -0.02];
  F.ellipsoid(st, 0.035, 0.03, 0.03, 0.008, rand() * 3, rand());
  marks.add('stone', st, 0.035);
  for (let i = 0; i < 3 + v; i++) {
    const a = rand() * Math.PI * 2;
    const p0 = [Math.cos(a) * 0.05, 0.22, -0.04 + Math.sin(a) * 0.05];
    twig(F, sticks, p0, [p0[0] * 2.2, 0.3 + rand() * 0.04, p0[2] * 2 - 0.05], 0.008, 0.003);
  }
  crackField(F, ns, 0.007, 14);
  return F.mesh(colorFn(ns, marks, sticks, 14));
}

function arm(v, sx, q) {
  const rand = mulberry32(1033 + v * 53 + (sx > 0 ? 7 : 0));
  const ns = 700 + v * 19 + (sx > 0 ? 5 : 0);
  const F = new SdfField([-0.14, -0.74, -0.1], [0.14, 0.08, 0.26], CELL.body[q]);
  const marks = new Marks(), sticks = [];
  const elbow = [sx * 0.04, -0.3, 0.04], wrist = [sx * 0.05, -0.53, 0.1];
  F.ellipsoid([0, -0.02, 0], 0.07, 0.065, 0.07, 0);
  F.cone([0, 0, 0], elbow, 0.055, 0.04, 0.04);
  F.ellipsoid(elbow, 0.046, 0.042, 0.046, 0.03);
  F.cone(elbow, wrist, 0.04, 0.03, 0.03);
  lumps(F, rand, [0, 0, 0], elbow, 0.05, 3);
  // Kyynärvarressa savi on lohjennut: risukimppu näkyy.
  F.ellipsoid([sx * 0.07, -0.42, 0.08], 0.03, 0.08, 0.035, 0.015, 0, 0, 'sub');
  for (let i = 0; i < 3; i++) {
    const o = (i - 1) * 0.014;
    twig(F, sticks, [elbow[0] + sx * 0.03 + o, elbow[1] - 0.02, elbow[2] + 0.015], [wrist[0] + sx * 0.025 + o, wrist[1] + 0.02, wrist[2]], 0.012, 0.01, 0.006);
  }
  // Kämmen ja juurimaiset sormet.
  const palm = [sx * 0.052, -0.585, 0.115];
  F.ellipsoid(palm, 0.05, 0.065, 0.04, 0.03);
  for (let i = 0; i < 4; i++) {
    const fx = palm[0] + (i - 1.5) * 0.022;
    const k1 = [fx, palm[1] - 0.05, palm[2] + 0.025];
    const k2 = [fx + (i - 1.5) * 0.008, palm[1] - 0.1, palm[2] + 0.04 + rand() * 0.02];
    const tip = [k2[0] + (i - 1.5) * 0.006, k2[1] - 0.04, k2[2] - 0.01];
    F.cone([fx, palm[1] - 0.02, palm[2] + 0.01], k1, 0.015, 0.012, 0.012);
    F.cone(k1, k2, 0.012, 0.009, 0.008);
    twig(F, sticks, k2, tip, 0.008, 0.002, 0.005);
  }
  // Peukalo.
  twig(F, sticks, [palm[0] - sx * 0.035, palm[1] + 0.01, palm[2] + 0.02], [palm[0] - sx * 0.05, palm[1] - 0.06, palm[2] + 0.06], 0.012, 0.004, 0.012);
  // Kivi olkapäässä tai kyynärvarressa.
  const sc = rand() < 0.5 ? [sx * 0.05, -0.05, -0.02] : [sx * 0.045, -0.24, 0.05];
  const r = 0.035 + rand() * 0.015;
  F.ellipsoid(sc, r, r * 0.8, r * 0.85, 0.01, rand() * 3, rand());
  marks.add('stone', sc, r);
  crackField(F, ns, 0.009, 12);
  return F.mesh(colorFn(ns, marks, sticks, 12));
}

function leg(v, sx, q) {
  const rand = mulberry32(1103 + v * 59 + (sx > 0 ? 11 : 0));
  const ns = 900 + v * 23 + (sx > 0 ? 3 : 0);
  const F = new SdfField([-0.16, -0.56, -0.2], [0.16, 0.08, 0.2], CELL.body[q]);
  const marks = new Marks(), sticks = [];
  const knee = [sx * 0.01, -0.24, 0.04];
  F.ellipsoid([0, -0.02, 0], 0.085, 0.07, 0.08, 0);
  F.cone([0, 0, 0], knee, 0.072, 0.052, 0.04);
  F.ellipsoid(knee, 0.056, 0.05, 0.056, 0.03);
  F.cone(knee, [0, -0.43, 0.02], 0.048, 0.066, 0.03);
  lumps(F, rand, [0, 0, 0], knee, 0.06, 2);
  lumps(F, rand, knee, [0, -0.43, 0.02], 0.055, 2);
  // Jalkaterä: savi valuu leveäksi kuin kasaksi.
  F.ellipsoid([0, -0.47, 0.05], 0.075, 0.04, 0.11, 0.04);
  F.ellipsoid([0, -0.44, 0.0], 0.08, 0.05, 0.08, 0.04);
  // Juuria roikkuu kantapäästä ja nilkasta maahan.
  for (let i = 0; i < 3; i++) {
    const a = Math.PI + (i - 1) * 0.7 + (rand() - 0.5) * 0.3;
    const p0 = [Math.sin(a) * 0.05, -0.42, Math.cos(a) * 0.05];
    const p1 = [Math.sin(a) * 0.1, -0.5, Math.cos(a) * 0.11];
    const p2 = [Math.sin(a) * 0.16 + (rand() - 0.5) * 0.04, -0.5, Math.cos(a) * 0.17];
    twig(F, sticks, p0, p1, 0.012, 0.008, 0.012);
    twig(F, sticks, p1, p2, 0.008, 0.003, 0.004);
  }
  // Kivi reidessä.
  const sc = [sx * 0.06, -0.1 - rand() * 0.06, 0.03];
  const r = 0.04 + rand() * 0.015;
  F.ellipsoid(sc, r, r * 0.85, r * 0.8, 0.01, rand() * 3, rand());
  marks.add('stone', sc, r);
  crackField(F, ns, 0.01, 10);
  // Maan raja: pohja leikataan suoraksi (jalka seisoo maassa).
  F.map((x, y, z, d) => smax(d, -0.51 - y, 0.01), 0.1);
  return F.mesh(colorFn(ns, marks, sticks, 10));
}

export function buildGolemPart(part, v, q = 1) {
  switch (part) {
    case 'torso': return torso(v, q);
    case 'head': return head(v, q);
    case 'armL': return arm(v, -1, q);
    case 'armR': return arm(v, 1, q);
    case 'legL': return leg(v, -1, q);
    default: return leg(v, 1, q);
  }
}
