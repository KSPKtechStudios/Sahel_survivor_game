// Maailman generointi: korkeus ja biomit pisteessä (x, z).
//
// Maailma on valtava (säde WORLD.radius) ja se generoidaan siemenestä.
// Rakenne on vyöhykkeellinen (käyttäjän luonnos, docs/DESIGN.md):
//   keskellä spawn-alue (Sahelin savanni)
//   -> tier 1: Sahel ja sen muunnelmat (dyynit, lateriitti, kausilammet, akasiametsät)
//   -> tier 2: aavikko ja sademetsä
//   -> ulkoreuna: vuoristo (harvinainen), jonka takana on maailman reuna.
// Vyöhykkeiden rajat vääristetään kohinalla, joten ne ovat epäsäännöllisiä ja
// joka siemenellä erilaisia.
//
// Kaikki funktiot ovat puhtaita (x, z) -> arvo, joten samaa logiikkaa käyttävät
// maaston verkko, esineiden sijoittelu, pelaajan törmäys ja kartat.
// Koordinaatit: +x = itä, -z = pohjoinen.

import { CONFIG } from '../config.js';
import { createNoise2D, fbm, smoothstep, mulberry32 } from '../noise.js';

export const WORLD = {
  radius: 10000,  // metriä keskeltä reunaan
  spawnR: 0.24,   // osuus säteestä
  tier1R: 0.6,
  rimR: 0.93,     // tästä alkaa vuoristoreuna
};

export const WATER_LEVEL = CONFIG.waterLevel;

// Biomien nimet näkyvät minikartassa. Värit (sRGB) ovat karttoja varten.
export const BIOMES = {
  savanna: { name: 'Sahelin savanni', map: '#b89a60' },
  dunes: { name: 'Hiekkadyynit', map: '#dcb36f' },
  laterite: { name: 'Laterittitasanko', map: '#94502f' },
  mare: { name: 'Kausilampi', map: '#7a7448' },
  woodland: { name: 'Akasiametsikkö', map: '#9a8a52' },
  desert: { name: 'Aavikko', map: '#e6bd84' },
  rainforest: { name: 'Sademetsä', map: '#4a6a2c' },
  mountains: { name: 'Vuoristo', map: '#7a6a60' },
};
export const BIOME_KEYS = Object.keys(BIOMES);
const BIOME_MAP_RGB = Object.fromEntries(
  BIOME_KEYS.map((k) => {
    const hex = parseInt(BIOMES[k].map.slice(1), 16);
    return [k, [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255]];
  }),
);

// --- Siemen ------------------------------------------------------------------

let SEED = 0;
let N = null;
let desertAngle = 0;

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
    bigDune: n(15), hills: n(16), mount: n(17), mount2: n(18),
  };
  // Aavikko painottuu yhdelle puolelle ja sademetsä vastakkaiselle (kuten
  // Sahara pohjoisessa ja Guinean metsät etelässä), suunta vaihtelee siemenen mukaan.
  desertAngle = mulberry32(SEED ^ 0x5eed)() * Math.PI * 2;
}

export function getWorldSeed() {
  return SEED;
}

setWorldSeed(CONFIG.seed);

// --- Näytteenotto --------------------------------------------------------------

// Vyöhykearvot: d = vääristetty etäisyys keskeltä (0..1 = reunaan).
function zones(x, z, out) {
  const R = WORLD.radius;
  const wx = x + fbm(N.zoneWarp, x / 2600, z / 2600, 3) * R * 0.1;
  const wz = z + fbm(N.zoneWarp, x / 2600 + 31.7, z / 2600 - 12.3, 3) * R * 0.1;
  const d = Math.hypot(wx, wz) / R;
  // Ulkoreuna on rosoisempi, kuin rantaviiva.
  const dEdge = d + fbm(N.edge, x / 700, z / 700, 4) * 0.035;
  out.d = d;
  out.dEdge = dEdge;
  return out;
}

// Kenttä, josta sekä korkeus että biomipainot lasketaan.
export function sampleTerrain(x, z, out = {}) {
  zones(x, z, out);
  const { d, dEdge } = out;

  // --- Vyöhykepainot
  const rim = smoothstep(WORLD.rimR - 0.015, WORLD.rimR + 0.015, dEdge);
  const t1 = (1 - smoothstep(WORLD.tier1R - 0.02, WORLD.tier1R + 0.02, d)) * (1 - rim);
  const t2 = Math.max(0, 1 - t1 - rim);
  const spawnW = 1 - smoothstep(WORLD.spawnR - 0.03, WORLD.spawnR + 0.03, d);

  // --- Tier 1: Sahel ja sen muunnelmat
  let savanna = 0, dunes = 0, laterite = 0, mare = 0, woodland = 0, plateau = 0, basin = 0;
  let hSahel = 0;
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
    const u = (x + z) * 0.7071;
    const v = (x - z) * 0.7071;
    if (dn > 0.001) {
      const ridge = 1 - Math.abs(N.dune(u / 85 + N.warp(x / 140, z / 140) * 0.4, v / 190));
      const duneH = ridge * ridge * 9 + (1 - Math.abs(N.dune(u / 32, v / 60))) * 1.6;
      h += dn * (duneH + N.ripple(u / 2.2, v / 9) * 0.05);
    }
    plateau = smoothstep(0.3, 0.36, latField) * (1 - spawnW * 0.4);
    if (plateau > 0.001) h += plateau * (1 - dn) * (4.5 + N.rock(x / 40, z / 40) * 0.6);
    if (lt > 0.001) h += lt * Math.abs(N.rock(x / 9, z / 9)) * 0.35;
    basin = smoothstep(0.4, 0.62, mareField) * (1 - dn) * (1 - plateau) * t1;
    h -= basin * 4.2;
    hSahel = h;
  }

  // --- Tier 2: aavikko ja sademetsä
  let desert = 0, rainforest = 0, hDesert = 0, hRain = 0;
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
    }
    if (rainforest > 0.0005) {
      hRain = 3 + fbm(N.hills, x / 320, z / 320, 4) * 7 + N.detail(x / 40, z / 40) * 0.6;
    }
  }

  // --- Ulkoreuna: vuoristo ja maailman reuna
  let mountains = 0, hMount = 0;
  if (rim > 0.0005) {
    mountains = rim;
    const ridged = (nx, nz) => {
      let s = 0, a = 1, f = 1, w = 0;
      for (let o = 0; o < 5; o++) {
        const r = 1 - Math.abs(N.mount(nx * f, nz * f));
        s += r * r * a; w += a; a *= 0.5; f *= 2.1;
      }
      return s / w;
    };
    const rise = smoothstep(WORLD.rimR - 0.01, WORLD.rimR + 0.05, dEdge);
    hMount = 6 + ridged(x / 650, z / 650) * 110 * rise + Math.abs(N.mount2(x / 60, z / 60)) * 3;
    // Reunan takana nousee läpäisemätön seinämä.
    if (dEdge > 1.0) hMount += (dEdge - 1.0) * 6000;
  }

  out.h = t1 * hSahel + desert * hDesert + rainforest * hRain + mountains * hMount;
  out.savanna = savanna;
  out.dunes = dunes;
  out.laterite = laterite;
  out.mare = mare;
  out.woodland = woodland;
  out.desert = desert;
  out.rainforest = rainforest;
  out.mountains = mountains;
  out.plateau = plateau;
  out.basin = basin;
  out.spawn = spawnW;
  return out;
}

const _tmp = {};
export function heightAt(x, z) {
  return sampleTerrain(x, z, _tmp).h;
}

export function biomeOf(sample) {
  let best = 'savanna';
  let bestW = -1;
  for (const k of BIOME_KEYS) {
    if (sample[k] > bestW) { bestW = sample[k]; best = k; }
  }
  return best;
}

export function biomeAt(x, z) {
  return biomeOf(sampleTerrain(x, z, _tmp));
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
  cliff: srgb(0x8a4a2c), cliffRock: srgb(0x5e5049),
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
  if (s.rainforest > 0) {
    mix3(_c1, C.rainA, C.rainB, n1);
    mix3(_c1, _c1, C.rainLitter, smoothstep(0.5, 0.8, n2) * 0.7);
    mix3(_c1, _c1, C.rainMoss, smoothstep(0.6, 0.9, 1 - n1) * 0.5);
    add(_c1, s.rainforest);
  }
  if (s.mountains > 0) {
    mix3(_c1, C.mntA, C.mntB, n1);
    mix3(_c1, _c1, C.mntSand, smoothstep(0.55, 0.85, n2) * 0.6);
    mix3(_c1, _c1, C.mntScree, smoothstep(0.7, 0.95, 1 - n2) * 0.4);
    add(_c1, s.mountains);
  }

  // Jyrkät rinteet: Sahelissa punaista lateriittia, vuoristossa kalliota.
  const cliffT = smoothstep(0.35, 0.7, slope);
  if (cliffT > 0) {
    mix3(_c1, C.cliff, C.cliffRock, Math.min(1, s.mountains + s.rainforest * 0.5));
    mix3(out, out, _c1, cliffT * 0.85);
  }
  const b = 0.94 + n2 * 0.12;
  out[0] *= b; out[1] *= b; out[2] *= b;
  return out;
}

// Kartan väri (sRGB 0..255).
const _mapCache = {};
export function mapColorRGB(x, z, out) {
  const s = sampleTerrain(x, z, _mapCache);
  if (s.h < WATER_LEVEL) {
    out[0] = 70; out[1] = 98; out[2] = 98;
    return s;
  }
  let r = 0, g = 0, b = 0;
  for (const k of BIOME_KEYS) {
    const w = s[k];
    if (w <= 0) continue;
    const c = BIOME_MAP_RGB[k];
    r += c[0] * w; g += c[1] * w; b += c[2] * w;
  }
  // Korkeat vuoret vaaleammiksi
  if (s.mountains > 0) {
    const k = Math.min(1, Math.max(0, (s.h - 30) / 80));
    r += (200 - r) * k * 0.6; g += (190 - g) * k * 0.6; b += (180 - b) * k * 0.6;
  }
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
      if (biomeOf(s) === 'savanna' && s.h > WATER_LEVEL + 1 && s.plateau < 0.05) return { x, z };
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
      if (s[key] > 0.85 && s.h > WATER_LEVEL + 0.5 && s.dEdge < 0.985) {
        if (r < bestD) { bestD = r; best = { x, z }; }
      }
    }
    if (best) return best;
  }
  return best;
}

// Koko maailman kartta canvasille (esikatselu uuden maailman luonnissa).
export function drawWorldMap(ctx, size) {
  const img = ctx.createImageData(size, size);
  const R = WORLD.radius * 1.04;
  const col = [0, 0, 0];
  const s = {};
  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      const x = ((i + 0.5) / size * 2 - 1) * R;
      const z = ((j + 0.5) / size * 2 - 1) * R;
      const o = (j * size + i) * 4;
      zones(x, z, s);
      if (s.dEdge > 1.0) {
        img.data[o] = 34; img.data[o + 1] = 24; img.data[o + 2] = 16; img.data[o + 3] = 255;
        continue;
      }
      mapColorRGB(x, z, col);
      img.data[o] = col[0]; img.data[o + 1] = col[1]; img.data[o + 2] = col[2]; img.data[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
}
