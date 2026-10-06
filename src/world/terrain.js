// Maailman generointi: korkeus, biomit ja vesi pisteessä (x, z).
//
// Maailma on valtava (säde WORLD.radius) ja se generoidaan siemenestä.
// Rakenne on vyöhykkeellinen (käyttäjän luonnos, docs/DESIGN.md):
//   keskellä spawn-alue (Sahelin savanni)
//   -> tier 1: Sahel ja sen muunnelmat (dyynit, lateriitti, kausilammet, akasiametsät)
//   -> tier 2: aavikko ja sademetsä
//   -> ulkoreuna: vuoristo aavikon puolella, meri ja hiekkarannat sademetsän puolella.
// Vyöhykkeiden rajat vääristetään kohinalla, joten ne ovat epäsäännöllisiä ja
// joka siemenellä erilaisia.
//
// Vesi: merenpinta (WATER_LEVEL) on kaikkialla; sen alla oleva maa on vettä
// (meri, kausilammet, keitaat). Lisäksi joet ja purot (sademetsä, harvoin
// Sahel, vuoriston tasaisemmat kohdat) sekä järvet ja lammet (sademetsä,
// vuoristo) ovat omalla korkeudellaan. Näyte kertoo veden pinnan (wl):
// piste on veden alla, jos h < wl.
//
// Kaikki funktiot ovat puhtaita (x, z) -> arvo, joten samaa logiikkaa käyttävät
// maaston verkko, vesi, esineiden sijoittelu, pelaajan törmäys ja kartat.
// Koordinaatit: +x = itä, -z = pohjoinen.

import { CONFIG } from '../config.js';
import { createNoise2D, fbm, smoothstep, mulberry32 } from '../noise.js';

export const WORLD = {
  radius: 10000,  // metriä keskeltä reunaan
  spawnR: 0.24,   // osuus säteestä
  tier1R: 0.6,
  rimR: 0.93,     // tästä alkaa vuoristoreuna
  coastR: 0.885,  // meren puolella rannikko
};

export const WATER_LEVEL = CONFIG.waterLevel;

// Biomien nimet näkyvät minikartassa. Värit (sRGB) ovat karttoja varten.
export const BIOMES = {
  savanna: { name: 'Sahelin savanni', map: '#b89a60' },
  // Dyynit on yhdistetty aavikkoon (sama nimi, väri ja musiikki); maaston
  // muoto lasketaan edelleen omana painonaan.
  dunes: { name: 'Aavikko', map: '#e6bd84' },
  laterite: { name: 'Laterittitasanko', map: '#94502f' },
  mare: { name: 'Kausilampi', map: '#7a7448' },
  woodland: { name: 'Akasiametsikkö', map: '#9a8a52' },
  desert: { name: 'Aavikko', map: '#e6bd84' },
  oasis: { name: 'Keidas', map: '#6f8f48' },
  rainforest: { name: 'Sademetsä', map: '#4a6a2c' },
  mountains: { name: 'Vuoristo', map: '#7a6a60' },
  beach: { name: 'Hiekkaranta', map: '#e2cf9c' },
  ocean: { name: 'Meri', map: '#3f6f8e' },
};
export const BIOME_KEYS = Object.keys(BIOMES);
const BIOME_MAP_RGB = Object.fromEntries(
  BIOME_KEYS.map((k) => {
    const hex = parseInt(BIOMES[k].map.slice(1), 16);
    return [k, [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255]];
  }),
);

// Mistä veden pinta tulee: merenpinta (meri, lammet), järvi, joki vai puro.
export const WATER = { SEA: 1, LAKE: 2, RIVER: 3, STREAM: 4 };

// --- Siemen ------------------------------------------------------------------

let SEED = 0;
let N = null;
let desertAngle = 0;
let rainAngle = 0;
const structCache = new Map();
const lakeCache = new Map();
const featCache = new Map();

// Merkkijono tai luku -> 32-bittinen siemen.
export function seedFromString(text) {
  const s = String(text ?? '').trim();
  if (/^-?\d+$/.test(s)) return (parseInt(s, 10) >>> 0);
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function randomSeed() {
  return Math.floor(Math.random() * 2147483647);
}

export function setWorldSeed(seed) {
  SEED = seed >>> 0;
  const n = (k) => createNoise2D((SEED + k * 7919) >>> 0);
  N = {
    base: n(1), detail: n(2), duneField: n(3), dune: n(4), ripple: n(5), lat: n(6), rock: n(7),
    mare: n(8), wood: n(9), color: n(10), warp: n(11), zoneWarp: n(12), edge: n(13), dr: n(14),
    bigDune: n(15), hills: n(16), mount: n(17), mount2: n(18), oasis: n(19), gully: n(20), strata: n(21),
    river: n(22), rwarp: n(23), stream: n(24), swarp: n(25), lakeShape: n(26), coast: n(27),
    island: n(28), wet: n(29), hills2: n(30), feat: n(31), width: n(32),
  };
  structCache.clear();
  lakeCache.clear();
  featCache.clear();
  // Aavikko painottuu yhdelle puolelle ja sademetsä vastakkaiselle (kuten
  // Sahara pohjoisessa ja Guinean metsät etelässä), suunta vaihtelee siemenen mukaan.
  // Sademetsän takana on meri (kuten Guineanlahti), aavikon takana vuoret.
  desertAngle = mulberry32(SEED ^ 0x5eed)() * Math.PI * 2;
  rainAngle = desertAngle + Math.PI;
}

export function getWorldSeed() {
  return SEED;
}

setWorldSeed(CONFIG.seed);

// --- Vyöhykkeet --------------------------------------------------------------

// d = vääristetty etäisyys keskeltä (0..1 = reunaan), sea = meren puoleisuus.
function zones(x, z, out) {
  const R = WORLD.radius;
  const wx = x + fbm(N.zoneWarp, x / 2600, z / 2600, 3) * R * 0.1;
  const wz = z + fbm(N.zoneWarp, x / 2600 + 31.7, z / 2600 - 12.3, 3) * R * 0.1;
  const d = Math.hypot(wx, wz) / R;
  // Ulkoreuna on rosoisempi, kuin rantaviiva.
  const dEdge = d + fbm(N.edge, x / 700, z / 700, 4) * 0.035;
  const os = Math.cos(Math.atan2(z, x) - rainAngle) + fbm(N.coast, x / 3200, z / 3200, 2) * 0.45;
  out.d = d;
  out.dEdge = dEdge;
  out.sea = smoothstep(0.05, 0.35, os);
  return out;
}

function ridged(nx, nz, octaves) {
  let s = 0, a = 1, f = 1, w = 0;
  for (let o = 0; o < octaves; o++) {
    const r = 1 - Math.abs(N.mount(nx * f, nz * f));
    s += r * r * a; w += a; a *= 0.5; f *= 2.1;
  }
  return s / w;
}

// Rannikon korkeusprofiili. c = dEdge - coastR (0.01 = noin 100 m merelle päin).
function coastHeight(x, z, c) {
  const dune = N.dune(x / 45, z / 45) * 0.5 + 0.5;
  let h = 1.1 + dune * 0.8 * (1 - smoothstep(-0.004, 0.004, c));
  h -= 2.6 * smoothstep(-0.002, 0.009, c);     // ranta laskee veteen
  h -= 15 * smoothstep(0.006, 0.07, c);         // merenpohja
  h += N.ripple(x / 14, z / 30) * 0.15;
  // Harvinaiset saaret avomerellä
  const isl = smoothstep(0.62, 0.84, fbm(N.island, x / 800, z / 800, 3)) * smoothstep(0.02, 0.05, c);
  if (isl > 0) h += isl * 24 + Math.abs(N.detail(x / 26, z / 26)) * isl * 2;
  return h;
}

// Maa ilman erikoismuodostumia ja vesistöjä.
function sampleLand(x, z, out) {
  zones(x, z, out);
  const { d, dEdge, sea } = out;
  const c = dEdge - WORLD.coastR;

  // --- Vyöhykepainot
  const rim = smoothstep(WORLD.rimR - 0.015, WORLD.rimR + 0.015, dEdge);
  const t1 = (1 - smoothstep(WORLD.tier1R - 0.02, WORLD.tier1R + 0.02, d)) * (1 - rim);
  const mountW = rim * (1 - sea);
  const coastW = sea * smoothstep(-0.009, 0.002, c);
  const t2 = Math.max(0, 1 - t1 - mountW - coastW);
  const spawnW = 1 - smoothstep(WORLD.spawnR - 0.03, WORLD.spawnR + 0.03, d);

  // --- Tier 1: Sahel ja sen muunnelmat
  let savanna = 0, dunes = 0, laterite = 0, mare = 0, woodland = 0, plateau = 0, basin = 0;
  let hSahel = 0, hills2 = 0;
  if (t1 > 0.0005) {
    const wx = x + N.warp(x / 300, z / 300) * 60;
    const wz = z + N.warp(x / 300 + 17.3, z / 300 - 9.1) * 60;
    // Dyynejä on enemmän kohti aavikkoa, spawn-alueella ei lainkaan.
    const duneBias = (d - WORLD.spawnR) * 1.4;
    const duneField = fbm(N.duneField, wx / 950, wz / 950, 3) + duneBias;
    const latField = fbm(N.lat, wx / 560, wz / 560, 3);
    const mareField = fbm(N.mare, wx / 340, wz / 340, 3);
    const woodField = fbm(N.wood, wx / 420, wz / 420, 3);

    let rem = 1;
    const dn = smoothstep(0.3, 0.48, duneField) * (1 - spawnW) * rem; rem -= dn;
    const lt = smoothstep(0.26, 0.4, latField) * (1 - spawnW * 0.4) * rem; rem -= lt;
    const mr = smoothstep(0.36, 0.5, mareField) * rem; rem -= mr;
    const wd = smoothstep(0.14, 0.32, woodField) * rem; rem -= wd;
    dunes = dn * t1; laterite = lt * t1; mare = mr * t1; woodland = wd * t1; savanna = Math.max(0, rem) * t1;

    let h = 1.7 + fbm(N.base, x / 230, z / 230, 4) * 1.8 + N.detail(x / 22, z / 22) * 0.18;
    // Laajat, loivat kumpareet (vain ylöspäin, ettei tasanko jää veden alle)
    hills2 = fbm(N.hills2, x / 1100, z / 1100, 2) * 0.5 + 0.5;
    h += hills2 * 6 * (1 - spawnW * 0.5);
    const u = (x + z) * 0.7071;
    const v = (x - z) * 0.7071;
    if (dn > 0.001) {
      const ridge = 1 - Math.abs(N.dune(u / 85 + N.warp(x / 140, z / 140) * 0.4, v / 190));
      const duneH = ridge * ridge * 9 + (1 - Math.abs(N.dune(u / 32, v / 60))) * 1.6;
      h += dn * (duneH + N.ripple(u / 2.2, v / 9) * 0.05);
    }
    plateau = smoothstep(0.3, 0.36, latField) * (1 - spawnW * 0.4);
    if (plateau > 0.001) h += plateau * (1 - dn) * (4.5 + (N.rock(x / 300, z / 300) * 0.5 + 0.5) * 3 + N.rock(x / 40, z / 40) * 0.6);
    if (lt > 0.001) h += lt * Math.abs(N.rock(x / 9, z / 9)) * 0.35;
    // Kausilampien painanteet ulottuvat aina veden alle maaston korkeudesta riippumatta.
    basin = smoothstep(0.4, 0.62, mareField) * (1 - dn) * (1 - plateau) * t1;
    if (basin > 0.001) h += (-2.0 + N.detail(x / 30, z / 30) * 0.3 - h) * basin;
    hSahel = h;
  }

  // --- Tier 2: aavikko ja sademetsä
  let desert = 0, rainforest = 0, oasis = 0, hDesert = 0, hRain = 0;
  if (t2 > 0.0005) {
    const ang = Math.atan2(z, x);
    const side = Math.cos(ang - desertAngle) * 0.6;
    const n = fbm(N.dr, x / 5200, z / 5200, 3) * 0.8 + side;
    const dW = smoothstep(-0.1, 0.1, n);
    desert = t2 * dW;
    rainforest = t2 * (1 - dW);
    if (desert > 0.0005) {
      // Valtavat dyynit (erg)
      const u = (x + z) * 0.7071;
      const v = (x - z) * 0.7071;
      const r1 = 1 - Math.abs(N.bigDune(u / 230 + N.warp(x / 500, z / 500) * 0.5, v / 520));
      const r2 = 1 - Math.abs(N.bigDune(u / 70 + 13, v / 140 - 7));
      hDesert = 3 + r1 * r1 * 22 + r2 * r2 * 3.5 + fbm(N.base, x / 600, z / 600, 2) * 3 + N.ripple(u / 2.5, v / 10) * 0.06;
      // Keidas: harvinainen painanne, jossa on vettä ja vehreyttä.
      const of = fbm(N.oasis, x / 650, z / 650, 3);
      const ow = smoothstep(0.42, 0.56, of);
      if (ow > 0.001) {
        const bowl = smoothstep(0.46, 0.66, of);
        hDesert = hDesert * (1 - ow) + (2.2 - bowl * 4.4) * ow;
        oasis = desert * smoothstep(0.42, 0.5, of);
        desert -= oasis;
      }
    }
    if (rainforest > 0.0005) {
      // Kumpuileva, rosoinen maasto ja kuivien rotkojen uomat.
      const gw = N.gully(x / 260 + N.warp(x / 500, z / 500) * 0.6, z / 260);
      const gully = Math.pow(1 - Math.min(1, Math.abs(gw) * 3.2), 3);
      hRain = 5.5 + fbm(N.hills, x / 320, z / 320, 4) * 11 + Math.abs(N.detail(x / 30, z / 30)) * 1.2 - gully * 4.6;
    }
  }

  // --- Ulkoreuna: vuoristo ja maailman reuna
  let mountains = 0, hMount = 0, rise = 0;
  if (mountW > 0.0005) {
    mountains = mountW;
    rise = smoothstep(WORLD.rimR - 0.01, WORLD.rimR + 0.05, dEdge);
    hMount = 6 + ridged(x / 650, z / 650, 5) * 110 * rise + Math.abs(N.mount2(x / 60, z / 60)) * 3;
    // Reunan takana nousee läpäisemätön seinämä.
    if (dEdge > 1.0) hMount += (dEdge - 1.0) * 6000;
  }

  // --- Meri ja hiekkaranta
  let beach = 0, ocean = 0, hCoast = 0;
  if (coastW > 0.0005) {
    hCoast = coastHeight(x, z, c);
    // Rantaviivan lähellä ja saarilla hiekkarantaa, kauempana merta.
    const share = Math.max(1 - smoothstep(0.008, 0.016, c), smoothstep(-2.0, 0.2, hCoast));
    beach = coastW * share;
    ocean = coastW - beach;
  }

  out.h = t1 * hSahel + (desert + oasis) * hDesert + rainforest * hRain + mountains * hMount + coastW * hCoast;
  out.savanna = savanna;
  out.dunes = dunes;
  out.laterite = laterite;
  out.mare = mare;
  out.woodland = woodland;
  out.desert = desert;
  out.oasis = oasis;
  out.rainforest = rainforest;
  out.mountains = mountains;
  out.beach = beach;
  out.ocean = ocean;
  out.plateau = plateau;
  out.basin = basin;
  out.spawn = spawnW;
  out.t1 = t1;
  out.coastW = coastW;
  out.c = c;
  out.rise = rise;
  out.hills2 = hills2;
  out.hCoast = hCoast;
  out.hDesert = hDesert;
  out.rock = 0;
  out.mesa = 0;
  out.wl = WATER_LEVEL;
  out.wtype = WATER.SEA;
  out.lakeR = 0;
  out.chan = 0;
  out.flowX = 0;
  out.flowZ = 0;
  return out;
}

// --- Erikoismuodostumat: graniittikalliot (Sahel, sademetsä) ja pöytävuoret (aavikko)

const FEAT_CELL = 560;
const _fs = {};

function featureInCell(ix, iz) {
  const key = ix * 131071 + iz;
  if (featCache.has(key)) return featCache.get(key);
  let f = null;
  const rand = mulberry32((Math.imul(ix, 2654435761) ^ Math.imul(iz, 40503) ^ Math.imul(SEED + 11, 2246822519)) >>> 0);
  const x = (ix + 0.2 + rand() * 0.6) * FEAT_CELL;
  const z = (iz + 0.2 + rand() * 0.6) * FEAT_CELL;
  sampleLand(x, z, _fs);
  const sahelRock = _fs.t1 > 0.8 ? (_fs.savanna + _fs.woodland + _fs.laterite) / _fs.t1 : 0;
  if (sahelRock > 0.6 && _fs.dunes < 0.15 && Math.hypot(x, z) > 300 && rand() < 0.3) {
    const R = 26 + rand() * 50;
    f = { type: 'dome', x, z, R, H: R * (0.35 + rand() * 0.3), seed: (rand() * 997) | 0 };
  } else if (_fs.rainforest > 0.9 && rand() < 0.12) {
    const R = 30 + rand() * 40;
    f = { type: 'dome', x, z, R, H: R * (0.4 + rand() * 0.25), seed: (rand() * 997) | 0 };
  } else if (_fs.desert > 0.9 && rand() < 0.35) {
    const R = 45 + rand() * 80;
    f = { type: 'mesa', x, z, R, H: 16 + rand() * 30, baseH: _fs.h, seed: (rand() * 997) | 0 };
  }
  featCache.set(key, f);
  return f;
}

function applyFeatures(x, z, out) {
  if (out.t1 + out.desert + out.rainforest < 0.01) return;
  const ix = Math.floor(x / FEAT_CELL), iz = Math.floor(z / FEAT_CELL);
  for (let j = iz - 1; j <= iz + 1; j++) {
    for (let i = ix - 1; i <= ix + 1; i++) {
      const F = featureInCell(i, j);
      if (!F) continue;
      const d = Math.hypot(x - F.x, z - F.z);
      if (d > F.R * 1.3) continue;
      const Rw = F.R * (1 + 0.16 * N.feat(x / (F.R * 0.6) + F.seed, z / (F.R * 0.6)));
      const u = d / Rw;
      if (F.type === 'dome') {
        if (u < 1) {
          const add = F.H * Math.pow(1 - u * u, 1.35) + N.detail(x / 7, z / 7) * 0.25 * (1 - u);
          out.h += add;
          out.rock = Math.max(out.rock, smoothstep(0.02, 0.2, add / F.H));
        }
      } else {
        const prof = 1 - smoothstep(0.78, 1.0, u);
        if (prof > 0) {
          const top = F.baseH + F.H + N.detail(x / 12, z / 12) * 0.4;
          out.h = Math.max(out.h, out.h + (top - out.h) * prof);
          out.mesa = Math.max(out.mesa, prof);
        }
      }
    }
  }
}

// Maa erikoismuodostumineen, ilman vesistöjen kaivamista.
function sampleBase(x, z, out) {
  sampleLand(x, z, out);
  applyFeatures(x, z, out);
  return out;
}

// --- Joet ja purot ---------------------------------------------------------------
// Uoma kulkee kohinakentän nollakohtaa pitkin (domain warp tekee mutkat).
// Etäisyys uomasta arvioidaan kentän arvosta ja gradientista. Veden pinta
// seuraa maaston loivaa muotoa (smoothRef) selvästi maan pinnan alapuolella,
// joten joet virtaavat laaksoissa. Maastoon kaivetaan uoma ja laakso; jos maa
// olisi rannalla pinnan alapuolella (rotko), sitä täytetään loivasti.

const RIVER_S = 4000;  // jokiverkon mittakaava (m)
const STREAM_S = 1400; // puroverkon mittakaava (m)

function channelField(noise, warp, S, x, z) {
  const a = S * 0.17, b = S * 0.045;
  const u = x / S + warp(x / a, z / a) * 0.1 + warp(x / b + 50, z / b) * 0.012;
  const v = z / S + warp(x / a + 31, z / a - 17) * 0.1 + warp(x / b - 20, z / b + 70) * 0.012;
  return noise(u, v);
}

// Etäisyys uoman keskilinjasta metreinä (Infinity, jos kauempana kuin maxD).
// Kentän gradientti (per metri) jää muuttujiin _cgx, _cgz.
let _cgx = 0, _cgz = 0;
function channelDist(noise, warp, S, x, z, maxD) {
  const f0 = channelField(noise, warp, S, x, z);
  // Gradientti on harvoin yli 9 / S, joten tätä kauempana uomaa ei voi olla.
  if (Math.abs(f0) > (maxD * 9) / S) return Infinity;
  const fx = channelField(noise, warp, S, x + 1, z) - f0;
  const fz = channelField(noise, warp, S, x, z + 1) - f0;
  _cgx = fx;
  _cgz = fz;
  const g = Math.max(Math.hypot(fx, fz), 1.1 / S);
  return Math.abs(f0) / g;
}

// Loiva vertailukorkeus (maaston suuret muodot) veden pinnaksi.
function smoothRef(x, z, s) {
  let h = 0;
  if (s.t1 > 0.001) {
    let hs = 1.7 + fbm(N.base, x / 230, z / 230, 2) * 1.8 + s.hills2 * 6 * (1 - s.spawn * 0.5);
    hs += (-2.0 - hs) * s.basin;
    h += s.t1 * hs;
  }
  if (s.rainforest > 0.001) h += s.rainforest * (5.5 + fbm(N.hills, x / 320, z / 320, 2) * 11);
  if (s.desert + s.oasis > 0.001) h += (s.desert + s.oasis) * s.hDesert;
  if (s.mountains > 0.001) h += s.mountains * (6 + ridged(x / 650, z / 650, 2) * 110 * s.rise);
  if (s.coastW > 0.001) h += s.coastW * s.hCoast;
  return h;
}

// Virtaus uoman suuntaan alamäkeen.
const _fl = {};
function setFlow(out, x, z, gx, gz, ref, speedMul) {
  let tx = -gz, tz = gx;
  const len = Math.hypot(tx, tz);
  if (len < 1e-9) return;
  tx /= len; tz /= len;
  Object.assign(_fl, out);
  const ahead = smoothRef(x + tx * 6, z + tz * 6, _fl);
  const drop = (ref - ahead) / 6;
  if (drop < 0) { tx = -tx; tz = -tz; }
  const speed = Math.min(1.5, 0.3 + Math.abs(drop) * 12) * speedMul;
  out.flowX = tx * speed;
  out.flowZ = tz * speed;
}

// Kaiva uoma ja laakso. w = veden puolileveys, V = laakson puolileveys.
function carveChannel(out, dc, w, V, wl, depth) {
  const raw = out.h;
  let target;
  if (dc < w) {
    const u = dc / w;
    target = wl - depth * (1 - u * u);
  } else {
    target = wl + 0.15 + (dc - w) * 0.35;
  }
  let h = Math.min(raw, target);
  h = h + (raw - h) * smoothstep(V * 0.6, V, dc);
  // Rotkon kohdalla ranta täytetään loivasti pinnan yläpuolelle (ei seinämiä).
  // Lampien ja meren kohdalla ei täytetä.
  if (dc >= w && h < wl + 0.15 && raw > WATER_LEVEL) {
    h += (wl + 0.15 - h) * (1 - smoothstep(w + 3, Math.max(V, w + 9), dc));
  }
  out.h = h;
}

const _sx = {}, _sz = {};
function applyRivers(x, z, out) {
  if (out.ocean > 0.9) return; // avomeren pohjassa ei jokia
  const rf = out.rainforest, mt = out.mountains, cw = out.coastW, t1 = out.t1;
  // Sahelissa jokia on harvoin: vain kosteammilla alueilla, ei dyyneillä eikä tasangoilla.
  let sahelWet = 0;
  if (t1 > 0.01) {
    sahelWet = smoothstep(0.4, 0.52, fbm(N.wet, x / 3200, z / 3200, 2))
      * (1 - smoothstep(0.1, 0.3, out.dunes / t1)) * (1 - smoothstep(0.05, 0.25, out.plateau)) * (1 - out.spawn * 0.8);
  }
  const notRock = 1 - Math.min(1, out.rock * 2 + out.mesa * 2);
  const vary = 0.8 + 0.4 * (N.width(x / 420, z / 420) * 0.5 + 0.5);
  const wR = ((rf + cw) * 8 + t1 * sahelWet * 3.6) * notRock * vary;
  const wS = (rf * 2.9 + mt * 2.6) * notRock * vary;
  if (wR < 0.3 && wS < 0.3) return;

  const VR = wR * 2.4 + 12 * Math.min(1, wR / 3);
  const VS = wS * 3 + 7 * Math.min(1, wS / 1.5);
  const dR = wR > 0.3 ? channelDist(N.river, N.rwarp, RIVER_S, x, z, VR) : Infinity;
  const rgx = _cgx, rgz = _cgz;
  const dS = wS > 0.3 ? channelDist(N.stream, N.swarp, STREAM_S, x, z, VS) : Infinity;
  const sgx = _cgx, sgz = _cgz;
  if (dR >= VR && dS >= VS) return;

  const ref = smoothRef(x, z, out);
  // Alangoilla pinta lähestyy merenpintaa, muualla se on laakson pohjalla.
  const low = 1 - smoothstep(WATER_LEVEL + 1, WATER_LEVEL + 4, ref);
  const raw = out.h;
  if (dR < VR) {
    const wl = Math.max(WATER_LEVEL, ref - 2.0 * (1 - low) - 0.8 * low);
    // Kapenevan joen pohja nousee pinnan yläpuolelle: vesi loppuu pehmeästi
    // ja uoma jatkuu kuivana.
    const depth = (0.6 + wR * 0.2) * smoothstep(1.0, 3.0, wR) - 0.25 * (1 - smoothstep(1.0, 3.0, wR));
    carveChannel(out, dR, wR, VR, wl, depth);
    if (dR < wR + 1.5 && wl > out.wl && raw > WATER_LEVEL) {
      out.wl = wl;
      out.wtype = WATER.RIVER;
      setFlow(out, x, z, rgx, rgz, ref, 1);
    }
    out.chan = Math.max(out.chan, 1 - smoothstep(wR, VR, dR));
  }
  if (dS < VS) {
    // Sama taso kuin joilla, jotta risteyksiin ei tule porrasta.
    const wl = Math.max(WATER_LEVEL, ref - 2.0 * (1 - low) - 0.8 * low);
    let w = wS;
    // Vuoristossa purot vain loivissa kohdissa (jyrkässä rinteessä uoma kuivuu).
    if (mt > 0.05) {
      Object.assign(_sx, out);
      Object.assign(_sz, out);
      const gx = smoothRef(x + 4, z, _sx) - ref;
      const gz = smoothRef(x, z + 4, _sz) - ref;
      const slope = Math.hypot(gx, gz) / 4;
      w *= 1 - mt * smoothstep(0.08, 0.2, slope);
    }
    if (w > 0.3) {
      const V = w * 3 + 7 * Math.min(1, w / 1.5);
      if (dS < V) {
        const depth = (0.35 + w * 0.15) * smoothstep(1.0, 2.2, w) - 0.2 * (1 - smoothstep(1.0, 2.2, w));
        carveChannel(out, dS, w, V, wl, depth);
        if (dS < w + 1.5 && wl > out.wl && raw > WATER_LEVEL) {
          out.wl = wl;
          out.wtype = WATER.STREAM;
          setFlow(out, x, z, sgx, sgz, ref, 1.2);
        }
        out.chan = Math.max(out.chan, 1 - smoothstep(w, V, dS));
      }
    }
  }
}

// --- Järvet ja lammet (sademetsä, vuoristo) ---------------------------------------

const LAKE_CELL = 380;
const _lb = {};

// Onko pisteen lähellä joki tai puro (järvet eivät osu uomiin).
function nearChannel(x, z, margin) {
  return channelDist(N.river, N.rwarp, RIVER_S, x, z, margin + 45) < margin + 45
    || channelDist(N.stream, N.swarp, STREAM_S, x, z, margin + 28) < margin + 28;
}

function lakeInCell(ix, iz) {
  const key = ix * 131071 + iz;
  if (lakeCache.has(key)) return lakeCache.get(key);
  let lake = null;
  const rand = mulberry32((Math.imul(ix, 1103515245) ^ Math.imul(iz, 12345) ^ Math.imul(SEED + 3, 2654435761)) >>> 0);
  const cx = (ix + 0.5) * LAKE_CELL, cz = (iz + 0.5) * LAKE_CELL;
  sampleBase(cx, cz, _lb);
  const chance = _lb.rainforest * 0.75 + _lb.mountains * 0.6;
  if (rand() < chance) {
    let R;
    if (_lb.rainforest >= _lb.mountains) R = rand() < 0.15 ? 70 + rand() * 60 : 18 + rand() * 36;
    else R = 25 + rand() * 55;
    const inset = Math.min(0.45, (R * 1.7) / LAKE_CELL);
    // Valitse muutamasta paikasta matalin (järvet syntyvät notkoihin).
    let best = null;
    for (let k = 0; k < 6; k++) {
      const x = (ix + inset + rand() * (1 - 2 * inset)) * LAKE_CELL;
      const z = (iz + inset + rand() * (1 - 2 * inset)) * LAKE_CELL;
      sampleBase(x, z, _lb);
      if (_lb.rainforest + _lb.mountains < 0.9 || _lb.rock > 0.05) continue;
      if (best && _lb.h >= best.h) continue;
      if (nearChannel(x, z, R * 1.75)) continue;
      best = { x, z, h: _lb.h, mt: _lb.mountains };
    }
    if (best) {
      // Pinta reunan matalimman kohdan alapuolelle, jottei vesi valu yli.
      let minRim = Infinity, maxRim = -Infinity;
      for (let a = 0; a < 16; a++) {
        const ang = (a / 16) * Math.PI * 2;
        const h = sampleBase(best.x + Math.cos(ang) * R * 1.3, best.z + Math.sin(ang) * R * 1.3, _lb).h;
        minRim = Math.min(minRim, h);
        maxRim = Math.max(maxRim, h);
      }
      const wl = minRim - 0.35;
      // Vuoristossa järvi saa olla jyrkkärantaisempi (kuten kirkkojärvet).
      const steep = best.mt > 0.5 ? 2 : 1;
      if (wl > WATER_LEVEL + 0.4 && best.h - wl < 7 * steep && maxRim - minRim < 30 * steep) {
        lake = { x: best.x, z: best.z, R, wl, depth: Math.min(8, Math.max(1.4, R * 0.075)) };
      }
    }
  }
  lakeCache.set(key, lake);
  return lake;
}

function applyLakes(x, z, out) {
  if (out.rainforest + out.mountains < 0.02) return;
  const ix = Math.floor(x / LAKE_CELL), iz = Math.floor(z / LAKE_CELL);
  for (let j = iz - 1; j <= iz + 1; j++) {
    for (let i = ix - 1; i <= ix + 1; i++) {
      const L = lakeInCell(i, j);
      if (!L) continue;
      const d = Math.hypot(x - L.x, z - L.z);
      if (d > L.R * 1.75) continue;
      // Rantaviiva on epäsäännöllinen.
      const Rw = L.R * (1 + 0.18 * N.lakeShape(x / 34, z / 34));
      const t = d / Rw;
      const target = t < 1 ? L.wl - L.depth * (1 - t * t) : L.wl + (t - 1) * L.R * 0.22;
      let h = Math.min(out.h, target);
      // Pehmeä penger rannan takana (ei pystysuoria seinämiä)
      if (t >= 1 && h < L.wl + 0.15) h += (L.wl + 0.15 - h) * (1 - smoothstep(1.15, 1.4, t));
      out.h = h + (out.h - h) * smoothstep(1.3, 1.7, t);
      if (t < 1.25 && L.wl > out.wl) {
        out.wl = L.wl;
        out.wtype = WATER.LAKE;
        out.lakeR = L.R;
        out.flowX = 0;
        out.flowZ = 0;
      }
    }
  }
}

// Kenttä, josta korkeus, biomipainot ja vesi lasketaan (ilman rakennelmien tasoitusta).
function sampleTerrainRaw(x, z, out) {
  sampleBase(x, z, out);
  applyRivers(x, z, out);
  applyLakes(x, z, out);
  return out;
}

// Rakennelmien alla maasto tasoitetaan.
export function sampleTerrain(x, z, out = {}) {
  sampleTerrainRaw(x, z, out);
  const st = structureInCell(Math.floor(x / STRUCT_CELL), Math.floor(z / STRUCT_CELL));
  if (st) {
    const d = Math.hypot(x - st.x, z - st.z);
    const r = st.radius;
    if (d < r * 1.5) {
      const w = 1 - smoothstep(r * 0.75, r * 1.5, d);
      out.h += (st.baseH - out.h) * w;
    }
  }
  return out;
}

// --- Rakennelmat (rauniot, kivikehät, leirit) --------------------------------------
// Maailma jaetaan soluihin; joka solussa voi olla yksi rakennelma. Kaikki on
// siemenestä laskettua, joten sijainnit ja arkkujen sisällöt pysyvät samoina.

export const STRUCT_CELL = 320;
const STRUCT_CHANCE = 0.24;
export const STRUCT_RADIUS = { stoneCircle: 8, camp: 10, ruinHouse: 7, ruinVillage: 21 };
// Painot biomeittain; null = ei rakennelmaa. Talon ja kylän rauniot ovat
// kaikissa biomeissa harvinaisia (n. 7–8 % soluista), muut ovat biomin omia.
const STRUCT_TABLE = {
  savanna: [['stoneCircle', 5], ['ruinHouse', 2], ['ruinVillage', 0.6]],
  woodland: [['stoneCircle', 4], ['ruinHouse', 2.2], ['ruinVillage', 0.7]],
  laterite: [['stoneCircle', 6], ['ruinHouse', 2], ['ruinVillage', 0.6]],
  dunes: [['camp', 3], ['stoneCircle', 2], ['ruinHouse', 1.2], [null, 1]],
  mare: [['ruinHouse', 1.5], ['ruinVillage', 0.6], [null, 5]],
  desert: [['camp', 6.5], ['ruinHouse', 1.5], ['ruinVillage', 0.6]],
  oasis: [['camp', 4], ['ruinVillage', 1.2], [null, 1]],
  rainforest: [['ruinHouse', 2.2], ['ruinVillage', 0.8], [null, 7]],
  mountains: [['ruinHouse', 2.2], ['ruinVillage', 0.8], [null, 7]],
  beach: [['camp', 2], ['ruinHouse', 1.5], [null, 4]],
  ocean: [[null, 1]],
};

const _sraw = {};
export function structureInCell(ix, iz) {
  const key = ix * 131071 + iz;
  if (structCache.has(key)) return structCache.get(key);
  let result = null;
  const rand = mulberry32((Math.imul(ix, 73856093) ^ Math.imul(iz, 19349663) ^ Math.imul(SEED + 7, 83492791)) >>> 0);
  if (rand() < STRUCT_CHANCE) {
    // Kokeile muutamaa paikkaa ja valitse tasaisin (ei vettä lähellä).
    let best = null;
    for (let k = 0; k < 3; k++) {
      const x = (ix + 0.15 + rand() * 0.7) * STRUCT_CELL;
      const z = (iz + 0.15 + rand() * 0.7) * STRUCT_CELL;
      sampleTerrainRaw(x, z, _sraw);
      if (_sraw.h < _sraw.wl + 0.8 || _sraw.dEdge > 0.97 || _sraw.rock > 0.05 || _sraw.mesa > 0.05 || _sraw.chan > 0.01) continue;
      const h0 = _sraw.h;
      let rough = 0;
      let wet = false;
      for (let a = 0; a < 6; a++) {
        sampleTerrainRaw(x + Math.cos(a) * 12, z + Math.sin(a) * 12, _sraw);
        rough += Math.abs(_sraw.h - h0);
        if (_sraw.h < _sraw.wl + 0.5 || _sraw.chan > 0.01) wet = true;
      }
      if (wet) continue;
      sampleTerrainRaw(x, z, _sraw);
      if (!best || rough < best.rough) best = { x, z, rough, h: _sraw.h, biome: biomeOf(_sraw), spawn: _sraw.spawn };
    }
    let type = null;
    if (best && Math.hypot(best.x, best.z) > 60) {
      const table = STRUCT_TABLE[best.biome] || STRUCT_TABLE.savanna;
      let total = 0;
      for (const [, w] of table) total += w;
      let r = rand() * total;
      type = table[0][0];
      for (const [t, w] of table) { r -= w; if (r <= 0) { type = t; break; } }
    }
    if (type) {
      const seed = (rand() * 4294967296) >>> 0;
      const chest = rand() < 0.45;
      const valuables = chest && rand() < 0.1;
      const style = best.biome === 'mountains' ? 'stone' : best.biome === 'rainforest' ? 'jungle' : 'mud';
      result = {
        id: `s${ix},${iz}`, ix, iz, type, x: best.x, z: best.z, rot: rand() * Math.PI * 2,
        radius: STRUCT_RADIUS[type], baseH: best.h, seed, chest, valuables, biome: best.biome, style,
      };
    }
  }
  structCache.set(key, result);
  return result;
}

// Rakennelmat, jotka ovat säteen r sisällä pisteestä (x, z).
export function structuresNear(x, z, r) {
  const out = [];
  const i0 = Math.floor((x - r) / STRUCT_CELL), i1 = Math.floor((x + r) / STRUCT_CELL);
  const j0 = Math.floor((z - r) / STRUCT_CELL), j1 = Math.floor((z + r) / STRUCT_CELL);
  for (let j = j0; j <= j1; j++) {
    for (let i = i0; i <= i1; i++) {
      const st = structureInCell(i, j);
      if (st && Math.hypot(st.x - x, st.z - z) < r + st.radius) out.push(st);
    }
  }
  return out;
}

// Onko piste rakennelman alueella (esineitä ei sijoiteta sinne).
export function insideStructure(x, z, margin = 2) {
  const st = structureInCell(Math.floor(x / STRUCT_CELL), Math.floor(z / STRUCT_CELL));
  return !!st && Math.hypot(x - st.x, z - st.z) < st.radius + margin;
}

// --- Kyselyt -----------------------------------------------------------------------

const _tmp = {};
export function heightAt(x, z) {
  return sampleTerrain(x, z, _tmp).h;
}

// Maan korkeus ja veden pinta samalla kertaa (pelaaja, pudonneet esineet).
const _wq = {};
export function waterAt(x, z, out = {}) {
  sampleTerrain(x, z, _wq);
  out.h = _wq.h;
  out.wl = _wq.wl;
  out.type = _wq.wtype;
  out.ocean = _wq.ocean + _wq.beach;
  out.lakeR = _wq.lakeR;
  out.flowX = _wq.flowX;
  out.flowZ = _wq.flowZ;
  return out;
}

export function biomeOf(sample) {
  let best = 'savanna';
  let bestW = -1;
  for (const k of BIOME_KEYS) {
    if (sample[k] > bestW) { bestW = sample[k]; best = k; }
  }
  return best;
}

// Biomi pelaajalle näytettävänä (nimi, musiikki): dyynit kuuluvat aavikkoon.
export function displayBiome(sample) {
  const b = biomeOf(sample);
  return b === 'dunes' ? 'desert' : b;
}

export function biomeAt(x, z) {
  return biomeOf(sampleTerrain(x, z, _tmp));
}

// Paikan nimi minikarttaan: vedessä vesistön nimi, muuten biomi.
export function placeName(s) {
  if (s.wl - s.h > 0.5) {
    if (s.wtype === WATER.LAKE) return s.lakeR < 35 ? 'Lampi' : 'Järvi';
    if (s.wtype === WATER.RIVER) return 'Joki';
    if (s.wtype === WATER.STREAM) return 'Puro';
    if (s.ocean + s.beach > 0.3) return 'Meri';
    if (s.oasis > 0.3) return BIOMES.oasis.name;
    if (s.mare > 0.3) return BIOMES.mare.name;
    return 'Lampi';
  }
  return BIOMES[biomeOf(s)].name;
}

// Kuinka lähellä maailman reunaa ollaan (1 = reuna).
export function edgeFactor(x, z) {
  return zones(x, z, _tmp).dEdge;
}

// --- Värit -------------------------------------------------------------------

function srgb(hex) {
  const f = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return [f(((hex >> 16) & 255) / 255), f(((hex >> 8) & 255) / 255), f((hex & 255) / 255)];
}

const C = {
  savA: srgb(0xc9ab72), savB: srgb(0xa98c55), savGrass: srgb(0xbfa865),
  duneA: srgb(0xe6bd80), duneB: srgb(0xd4a263),
  latA: srgb(0xa5532f), latB: srgb(0x7f3f24), latGravel: srgb(0x8e6346),
  mareA: srgb(0x7b6646), mareWet: srgb(0x564633), mareGreen: srgb(0x7f7d4a),
  woodA: srgb(0xae9160), woodB: srgb(0x8f7748),
  desA: srgb(0xecc48c), desB: srgb(0xdca46a), desRock: srgb(0xa47a58),
  rainA: srgb(0x55602e), rainB: srgb(0x404a22), rainLitter: srgb(0x6c5832), rainMoss: srgb(0x5d7330),
  mntA: srgb(0x8a7a6c), mntB: srgb(0x6e5e54), mntSand: srgb(0x9c6a4c), mntScree: srgb(0x958a7e),
  strata: [srgb(0xa86a48), srgb(0x8e5a40), srgb(0xc08a62), srgb(0x7a5a4a), srgb(0xb47a52), srgb(0x94786a)],
  oasA: srgb(0x6f7a3c), oasB: srgb(0x58652e), oasWet: srgb(0x4a4430), oasSand: srgb(0xd8b27a),
  cliff: srgb(0x8a4a2c), cliffRock: srgb(0x5e5049),
  sandA: srgb(0xe9d6a8), sandB: srgb(0xd8c08e), sandWet: srgb(0xa8916a), seaFloor: srgb(0xbca67a),
  granite: srgb(0x9a948b), graniteDark: srgb(0x6f6a63), lichen: srgb(0x8c8a6a),
  mud: srgb(0x4b3f2e), mudGreen: srgb(0x4a4a2c), pebble: srgb(0x7a746c),
};

function mix3(out, a, b, t) {
  out[0] = a[0] + (b[0] - a[0]) * t;
  out[1] = a[1] + (b[1] - a[1]) * t;
  out[2] = a[2] + (b[2] - a[2]) * t;
  return out;
}

const _c1 = [0, 0, 0];
// Maan väri (lineaarinen RGB) vertex-väreihin. slope: 0 = tasainen, 1 = pysty.
export function groundColor(x, z, s, slope, out) {
  const n1 = N.color(x / 18, z / 18) * 0.5 + 0.5;
  const n2 = N.color(x / 5 + 40, z / 5 - 40) * 0.5 + 0.5;
  out[0] = out[1] = out[2] = 0;
  const add = (col, w) => { out[0] += col[0] * w; out[1] += col[1] * w; out[2] += col[2] * w; };

  if (s.savanna > 0) {
    mix3(_c1, C.savA, C.savB, n1);
    mix3(_c1, _c1, C.savGrass, smoothstep(0.55, 0.8, n2) * 0.6);
    add(_c1, s.savanna);
  }
  if (s.dunes > 0) add(mix3(_c1, C.duneA, C.duneB, n1 * 0.8), s.dunes);
  if (s.laterite > 0) {
    mix3(_c1, C.latA, C.latB, n1);
    mix3(_c1, _c1, C.latGravel, smoothstep(0.5, 0.75, n2) * 0.7);
    add(_c1, s.laterite);
  }
  if (s.mare > 0) {
    const wet = 1 - smoothstep(WATER_LEVEL, WATER_LEVEL + 1.2, s.h);
    mix3(_c1, C.mareA, C.mareGreen, smoothstep(0.35, 0.7, n1) * (1 - wet));
    mix3(_c1, _c1, C.mareWet, wet);
    add(_c1, s.mare);
  }
  if (s.woodland > 0) add(mix3(_c1, C.woodA, C.woodB, n1), s.woodland);
  if (s.desert > 0) {
    mix3(_c1, C.desA, C.desB, n1 * 0.85);
    mix3(_c1, _c1, C.desRock, smoothstep(0.78, 0.95, n2) * 0.6);
    add(_c1, s.desert);
  }
  if (s.oasis > 0) {
    const wet = 1 - smoothstep(WATER_LEVEL, WATER_LEVEL + 1.0, s.h);
    const dry = smoothstep(1.4, 2.6, s.h);
    mix3(_c1, C.oasA, C.oasB, n1);
    mix3(_c1, _c1, C.oasWet, wet);
    mix3(_c1, _c1, C.oasSand, dry * 0.8);
    add(_c1, s.oasis);
  }
  if (s.rainforest > 0) {
    mix3(_c1, C.rainA, C.rainB, n1);
    mix3(_c1, _c1, C.rainLitter, smoothstep(0.5, 0.8, n2) * 0.7);
    mix3(_c1, _c1, C.rainMoss, smoothstep(0.6, 0.9, 1 - n1) * 0.5);
    add(_c1, s.rainforest);
  }
  if (s.mountains > 0) {
    // Kerrostunut hiekkakivi: värivyöhykkeet korkeuden mukaan.
    const band = s.h / 4.5 + N.strata(x / 140, z / 140) * 1.6;
    const bi = Math.floor(band);
    const bf = band - bi;
    const ca = C.strata[((bi % 6) + 6) % 6];
    const cb = C.strata[(((bi + 1) % 6) + 6) % 6];
    mix3(_c1, ca, cb, smoothstep(0.75, 1, bf));
    mix3(_c1, _c1, C.mntB, n1 * 0.35);
    mix3(_c1, _c1, C.mntScree, smoothstep(0.7, 0.95, 1 - n2) * 0.45 * (1 - slope));
    add(_c1, s.mountains);
  }
  if (s.beach + s.ocean > 0) {
    mix3(_c1, C.sandA, C.sandB, n1 * 0.7);
    mix3(_c1, _c1, C.seaFloor, smoothstep(-1.5, -4, s.h));
    add(_c1, s.beach + s.ocean);
  }

  // Jyrkät rinteet: Sahelissa punaista lateriittia, vuoristossa kalliota.
  const cliffT = smoothstep(0.35, 0.7, slope);
  if (cliffT > 0) {
    mix3(_c1, C.cliff, C.cliffRock, Math.min(1, s.mountains + s.rainforest * 0.5 + s.beach + s.ocean));
    mix3(out, out, _c1, cliffT * 0.85);
  }
  // Graniittikalliot: harmaata kiveä ja jäkälää.
  if (s.rock > 0) {
    mix3(_c1, C.granite, C.graniteDark, n1 * 0.6 + slope * 0.4);
    mix3(_c1, _c1, C.lichen, smoothstep(0.65, 0.9, n2) * 0.5 * (1 - slope));
    mix3(out, out, _c1, s.rock);
  }
  // Pöytävuoret: kerrostunutta hiekkakiveä jyrkissä kohdissa.
  if (s.mesa > 0) {
    const band = s.h / 3.2 + N.strata(x / 90, z / 90) * 0.8;
    const bi = Math.floor(band);
    mix3(_c1, C.strata[((bi % 6) + 6) % 6], C.desRock, 0.25 + (1 - slope) * 0.4);
    mix3(out, out, _c1, s.mesa * Math.min(1, 0.35 + slope * 1.5));
  }
  // Vesirajassa märkää, veden alla pohjan väriä.
  const under = s.wl - s.h;
  if (under > -0.8) {
    const sandy = Math.min(1, s.beach + s.ocean + s.desert + s.oasis * 0.5 + s.dunes);
    const rocky = s.mountains;
    mix3(_c1, C.mud, C.mudGreen, s.rainforest * 0.6);
    mix3(_c1, _c1, C.pebble, rocky);
    mix3(_c1, _c1, C.sandWet, sandy);
    const wet = smoothstep(-0.8, 0.05, under);
    mix3(out, out, _c1, wet * 0.55);
    const k = 1 - smoothstep(0.2, 4, under) * 0.35;
    out[0] *= k; out[1] *= k; out[2] *= k;
  }
  const b = 0.94 + n2 * 0.12;
  out[0] *= b; out[1] *= b; out[2] *= b;
  return out;
}

// Kartan väri (sRGB 0..255).
const _mapCache = {};
export function mapColorRGB(x, z, out) {
  const s = sampleTerrain(x, z, _mapCache);
  const depth = s.wl - s.h;
  if (depth > 0) {
    const k = Math.min(1, depth / 8);
    if (s.ocean + s.beach > 0.3) {
      out[0] = 92 - 44 * k; out[1] = 142 - 46 * k; out[2] = 156 - 24 * k;
    } else {
      out[0] = 74 - 20 * k; out[1] = 116 - 24 * k; out[2] = 124 - 14 * k;
    }
    return s;
  }
  let r = 0, g = 0, b = 0;
  for (const k of BIOME_KEYS) {
    const w = s[k];
    if (w <= 0) continue;
    const c = BIOME_MAP_RGB[k];
    r += c[0] * w; g += c[1] * w; b += c[2] * w;
  }
  // Korkeat vuoret ja kalliot vaaleammiksi
  if (s.mountains > 0) {
    const k = Math.min(1, Math.max(0, (s.h - 30) / 80));
    r += (200 - r) * k * 0.6; g += (190 - g) * k * 0.6; b += (180 - b) * k * 0.6;
  }
  if (s.rock > 0) { r += (150 - r) * s.rock; g += (146 - g) * s.rock; b += (138 - b) * s.rock; }
  if (s.mesa > 0) { r += (170 - r) * s.mesa * 0.6; g += (112 - g) * s.mesa * 0.6; b += (78 - b) * s.mesa * 0.6; }
  out[0] = r; out[1] = g; out[2] = b;
  return s;
}

// --- Paikkojen haku -------------------------------------------------------------

// Pelaajan aloituspaikka: kuivaa savannia mahdollisimman läheltä keskustaa.
export function findSpawn() {
  const s = {};
  for (let r = 0; r < 2000; r += 16) {
    const steps = Math.max(1, Math.floor((2 * Math.PI * r) / 16));
    for (let i = 0; i < steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      sampleTerrain(x, z, s);
      if (biomeOf(s) === 'savanna' && s.h > s.wl + 1 && s.plateau < 0.05 && s.rock < 0.02 && s.chan < 0.01 && !insideStructure(x, z, 6)) return { x, z };
    }
  }
  return { x: 0, z: 0 };
}

// Lähin paikka, jossa annettu biomi hallitsee (testaustyökaluja varten).
export function findBiome(key, fromX = 0, fromZ = 0) {
  const s = {};
  let best = null;
  let bestD = Infinity;
  const R = WORLD.radius;
  for (let r = 50; r < R * 1.0; r += r < 1000 ? 40 : 120) {
    const steps = Math.max(12, Math.floor((2 * Math.PI * r) / (r < 1000 ? 60 : 300)));
    for (let i = 0; i < steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      const x = fromX + Math.cos(a) * r;
      const z = fromZ + Math.sin(a) * r;
      if (Math.hypot(x, z) > R) continue;
      sampleTerrain(x, z, s);
      if (s[key] > 0.85 && s.h > s.wl + 0.5 && s.dEdge < 0.985 && s.rock < 0.05) {
        if (r < bestD) { bestD = r; best = { x, z }; }
      }
    }
    if (best) return best;
  }
  return best;
}

// Lähin vesistön ranta (testaustyökaluja varten): järvi, joki tai meri.
export function findWater(type, fromX = 0, fromZ = 0) {
  const s = {};
  const R = WORLD.radius;
  for (let r = 40; r < R; r += r < 1000 ? 24 : 80) {
    const steps = Math.max(12, Math.floor((2 * Math.PI * r) / (r < 1000 ? 30 : 120)));
    for (let i = 0; i < steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      const x = fromX + Math.cos(a) * r;
      const z = fromZ + Math.sin(a) * r;
      if (Math.hypot(x, z) > R * 0.98) continue;
      sampleTerrain(x, z, s);
      const wet = s.wl - s.h;
      const match = type === 'sea' ? s.ocean > 0.5 : s.wtype === type;
      if (match && wet > 0.8) {
        // Etsi kuiva ranta läheltä
        for (let k = 0; k < 24; k++) {
          const b = (k / 24) * Math.PI * 2;
          for (let dd = 4; dd < 120; dd += 4) {
            const px = x + Math.cos(b) * dd, pz = z + Math.sin(b) * dd;
            sampleTerrain(px, pz, s);
            if (s.h > s.wl + 0.3) return { x: px, z: pz, wx: x, wz: z };
          }
        }
      }
    }
  }
  return null;
}
