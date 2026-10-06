// Maaston korkeus ja biomit. Kaikki on puhtaita funktioita (x, z) -> arvo,
// joten samaa logiikkaa käyttävät maaston verkko, esineiden sijoittelu,
// pelaajan törmäys ja minikartta.
//
// Koordinaatit: +x = itä, -z = pohjoinen. Dyynejä on enemmän pohjoisessa.

import { CONFIG } from '../config.js';
import { createNoise2D, fbm, smoothstep, clamp } from '../noise.js';

const S = CONFIG.seed;
const nBase = createNoise2D(S + 11);
const nDetail = createNoise2D(S + 12);
const nDuneField = createNoise2D(S + 21);
const nDune = createNoise2D(S + 22);
const nRipple = createNoise2D(S + 23);
const nLat = createNoise2D(S + 31);
const nRock = createNoise2D(S + 32);
const nMare = createNoise2D(S + 41);
const nWood = createNoise2D(S + 51);
const nColor = createNoise2D(S + 61);
const nWarp = createNoise2D(S + 71);

export const WATER_LEVEL = CONFIG.waterLevel;

// Biomien nimet näkyvät minikartassa. Värit ovat sRGB-heksoja.
export const BIOMES = {
  savanna: { name: 'Sahelin savanni', map: '#b89a60' },
  dunes: { name: 'Hiekkadyynit', map: '#dcb36f' },
  laterite: { name: 'Laterittitasanko', map: '#94502f' },
  mare: { name: 'Kausilampi', map: '#7a7448' },
  woodland: { name: 'Akasiametsikkö', map: '#9a8a52' },
};
export const BIOME_KEYS = Object.keys(BIOMES);

// Kenttä, josta sekä korkeus että biomipainot lasketaan.
// out: { h, dunes, laterite, mare, woodland, savanna, plateau, basin }
export function sampleTerrain(x, z, out = {}) {
  // Kevyt vääristys, jottei biomien rajat näytä kohinalta.
  const wx = x + nWarp(x / 300, z / 300) * 60;
  const wz = z + nWarp(x / 300 + 17.3, z / 300 - 9.1) * 60;

  // --- Biomipainot (järjestyksessä, jokainen vie osuuden jäljelle jääneestä)
  const northBias = clamp(-z / 2600, -0.35, 0.7);
  const duneField = fbm(nDuneField, wx / 950, wz / 950, 3) + northBias;
  const latField = fbm(nLat, wx / 560, wz / 560, 3);
  const mareField = fbm(nMare, wx / 340, wz / 340, 3);
  const woodField = fbm(nWood, wx / 420, wz / 420, 3);

  let rem = 1;
  const dunes = smoothstep(0.3, 0.48, duneField) * rem; rem -= dunes;
  const laterite = smoothstep(0.26, 0.4, latField) * rem; rem -= laterite;
  const mare = smoothstep(0.36, 0.5, mareField) * rem; rem -= mare;
  const woodland = smoothstep(0.14, 0.32, woodField) * rem; rem -= woodland;
  const savanna = Math.max(0, rem);

  // --- Korkeus
  let h = 1.7 + fbm(nBase, x / 230, z / 230, 4) * 1.8 + nDetail(x / 22, z / 22) * 0.18;

  // Dyynit: harjanteet koillis-lounais -suuntaisen tuulen (harmattan) poikki.
  const u = (x + z) * 0.7071;
  const v = (x - z) * 0.7071;
  const ridge = 1 - Math.abs(nDune(u / 85 + nWarp(x / 140, z / 140) * 0.4, v / 190));
  const duneH = ridge * ridge * 9 + (1 - Math.abs(nDune(u / 32, v / 60))) * 1.6;
  const ripple = nRipple(u / 2.2, v / 9) * 0.05;
  h += dunes * (duneH + ripple);

  // Laterittitasanko: matala, tasalakinen kumpu jyrkin reunoin.
  const plateau = smoothstep(0.3, 0.36, latField);
  h += plateau * (1 - dunes) * (4.5 + nRock(x / 40, z / 40) * 0.6);
  h += laterite * Math.abs(nRock(x / 9, z / 9)) * 0.35;

  // Kausilampi: painanne, johon vesi kerääntyy.
  const basin = smoothstep(0.4, 0.62, mareField) * (1 - dunes) * (1 - plateau);
  h -= basin * 4.2;

  out.h = h;
  out.dunes = dunes;
  out.laterite = laterite;
  out.mare = mare;
  out.woodland = woodland;
  out.savanna = savanna;
  out.plateau = plateau;
  out.basin = basin;
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

// Maan väri (lineaarinen RGB 0..1) vertex-väreihin. sRGB-arvot muunnetaan
// lineaarisiksi, koska three.js laskee valaistuksen lineaarisesti.
function srgb(hex) {
  const r = ((hex >> 16) & 255) / 255;
  const g = ((hex >> 8) & 255) / 255;
  const b = (hex & 255) / 255;
  const f = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return [f(r), f(g), f(b)];
}

const C = {
  savA: srgb(0xc9ab72), savB: srgb(0xa98c55), savGrass: srgb(0xbfa865),
  duneA: srgb(0xe6bd80), duneB: srgb(0xd4a263),
  latA: srgb(0xa5532f), latB: srgb(0x7f3f24), latGravel: srgb(0x8e6346),
  mareA: srgb(0x7b6646), mareWet: srgb(0x564633), mareGreen: srgb(0x7f7d4a),
  woodA: srgb(0xae9160), woodB: srgb(0x8f7748),
  cliff: srgb(0x8a4a2c),
};

function mix3(out, a, b, t) {
  out[0] = a[0] + (b[0] - a[0]) * t;
  out[1] = a[1] + (b[1] - a[1]) * t;
  out[2] = a[2] + (b[2] - a[2]) * t;
  return out;
}

const _c1 = [0, 0, 0];
// slope: 0 = tasainen, 1 = pystysuora
export function groundColor(x, z, s, slope, out) {
  const n1 = nColor(x / 18, z / 18) * 0.5 + 0.5;
  const n2 = nColor(x / 5 + 40, z / 5 - 40) * 0.5 + 0.5;
  out[0] = out[1] = out[2] = 0;

  const add = (col, w) => {
    out[0] += col[0] * w; out[1] += col[1] * w; out[2] += col[2] * w;
  };

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
    const h = s.h;
    const wet = 1 - smoothstep(WATER_LEVEL, WATER_LEVEL + 1.2, h);
    mix3(_c1, C.mareA, C.mareGreen, smoothstep(0.35, 0.7, n1) * (1 - wet));
    mix3(_c1, _c1, C.mareWet, wet);
    add(_c1, s.mare);
  }
  if (s.woodland > 0) add(mix3(_c1, C.woodA, C.woodB, n1), s.woodland);

  // Jyrkät rinteet paljastavat punaista lateriittia.
  const cliffT = smoothstep(0.35, 0.7, slope);
  if (cliffT > 0) mix3(out, out, C.cliff, cliffT * 0.85);

  // Pientä vaihtelua kirkkauteen.
  const b = 0.94 + n2 * 0.12;
  out[0] *= b; out[1] *= b; out[2] *= b;
  return out;
}

// Minikartan väri (sRGB 0..255), halvempi kuin groundColor.
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
    const hex = parseInt(BIOMES[k].map.slice(1), 16);
    r += ((hex >> 16) & 255) * w;
    g += ((hex >> 8) & 255) * w;
    b += (hex & 255) * w;
  }
  out[0] = r; out[1] = g; out[2] = b;
  return s;
}

// Etsi pelaajalle aloituspaikka: kuivaa savannia mahdollisimman läheltä origoa.
export function findSpawn() {
  const s = {};
  for (let r = 0; r < 2000; r += 16) {
    const steps = Math.max(1, Math.floor((2 * Math.PI * r) / 16));
    for (let i = 0; i < steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      sampleTerrain(x, z, s);
      if (biomeOf(s) === 'savanna' && s.h > WATER_LEVEL + 1 && s.plateau < 0.05) {
        return { x, z };
      }
    }
  }
  return { x: 0, z: 0 };
}
