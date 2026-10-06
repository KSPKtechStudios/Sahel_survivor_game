// Chunkin generointi puhtaana laskentana (ei three.js:ää). Ajetaan
// generointisäikeessä (genWorker.js), tai pääsäikeessä varajärjestelmänä.
// Palauttaa tyypitetyt taulukot, joista pääsäie rakentaa verkot ja instanssit.
import { CONFIG } from '../config.js';
import { mulberry32, hashSeed } from '../noise.js';
import {
  sampleTerrain, heightAt, groundColor, getWorldSeed, WATER_LEVEL, BIOME_KEYS, insideStructure, mapColorRGB,
} from './terrain.js';
import { OBJECT_TYPES, OBJECT_TYPE_KEYS, DECOR_TYPES } from './objectTypes.js';

const SIZE = CONFIG.chunkSize;
const SEG = CONFIG.chunkSegments;
const STEP = SIZE / SEG;
export const OBJ_STRIDE = 8;   // typeIndex, candidate, x, y, z, rot, scale, variant
export const DECOR_STRIDE = 8; // decorIndex, variant, x, y, z, rotY, sxz, sy

function slope(x, z, h) {
  const nx = h - heightAt(x + 1, z);
  const nz = h - heightAt(x, z + 1);
  return 1 - 1 / Math.hypot(nx, 1, nz);
}

export function generateChunk(cx, cz, variantCounts) {
  const x0 = cx * SIZE;
  const z0 = cz * SIZE;
  const row = SEG + 1;
  const B = SEG + 3;

  // --- Maasto
  const heights = new Float32Array(B * B);
  const samples = new Array(row * row);
  for (let j = -1; j <= SEG + 1; j++) {
    for (let i = -1; i <= SEG + 1; i++) {
      const inside = i >= 0 && j >= 0 && i <= SEG && j <= SEG;
      const s = sampleTerrain(x0 + i * STEP, z0 + j * STEP, {});
      heights[(j + 1) * B + (i + 1)] = s.h;
      if (inside) samples[j * row + i] = s;
    }
  }
  const positions = new Float32Array(row * row * 3);
  const normals = new Float32Array(row * row * 3);
  const colors = new Float32Array(row * row * 3);
  const uvs = new Float32Array(row * row * 2);
  const col = [0, 0, 0];
  const uvOx = Math.floor(x0 / 3) * 3;
  const uvOz = Math.floor(z0 / 3) * 3;
  let minH = Infinity;
  let rain = 0;
  for (let j = 0; j <= SEG; j++) {
    for (let i = 0; i <= SEG; i++) {
      const v = j * row + i;
      const x = x0 + i * STEP;
      const z = z0 + j * STEP;
      const h = heights[(j + 1) * B + (i + 1)];
      minH = Math.min(minH, h);
      positions[v * 3] = i * STEP;
      positions[v * 3 + 1] = h;
      positions[v * 3 + 2] = j * STEP;
      const hl = heights[(j + 1) * B + i];
      const hr = heights[(j + 1) * B + (i + 2)];
      const hd = heights[j * B + (i + 1)];
      const hu = heights[(j + 2) * B + (i + 1)];
      let nx = hl - hr, ny = 2 * STEP, nz = hd - hu;
      const nl = Math.hypot(nx, ny, nz);
      nx /= nl; ny /= nl; nz /= nl;
      normals[v * 3] = nx;
      normals[v * 3 + 1] = ny;
      normals[v * 3 + 2] = nz;
      groundColor(x, z, samples[v], 1 - ny, col);
      colors[v * 3] = col[0];
      colors[v * 3 + 1] = col[1];
      colors[v * 3 + 2] = col[2];
      uvs[v * 2] = (x - uvOx) / 3;
      uvs[v * 2 + 1] = (z - uvOz) / 3;
      rain += samples[v].rainforest;
    }
  }

  // --- Esineet
  const seed = getWorldSeed();
  const objs = [];
  const s = {};
  for (let t = 0; t < OBJECT_TYPE_KEYS.length; t++) {
    const type = OBJECT_TYPE_KEYS[t];
    const def = OBJECT_TYPES[type];
    if (def.decorative) continue;
    const rand = mulberry32(hashSeed(seed, cx, cz, t + 1));
    const maxD = Math.max(...Object.values(def.density));
    const candidates = Math.floor(maxD) + (rand() < maxD % 1 ? 1 : 0);
    const nv = variantCounts[def.model] || 1;
    for (let i = 0; i < candidates; i++) {
      const x = x0 + rand() * SIZE;
      const z = z0 + rand() * SIZE;
      const r1 = rand(), r2 = rand(), r3 = rand(), r4 = rand();
      sampleTerrain(x, z, s);
      let p = 0;
      for (const b of BIOME_KEYS) p += (def.density[b] || 0) * s[b];
      if (r1 >= p / maxD) continue;
      if (s.h < WATER_LEVEL + 0.15) continue;
      if (def.maxSlope < 1 && slope(x, z, s.h) > def.maxSlope) continue;
      if (insideStructure(x, z, def.kind === 'pickup' ? 0 : 2)) continue;
      const scale = def.scale[0] + r3 * (def.scale[1] - def.scale[0]);
      objs.push(t, i, x, s.h - (def.kind === 'pickup' ? 0.02 : 0.05), z, r2 * Math.PI * 2, scale, Math.floor(r4 * nv));
    }
  }

  // --- Koristeet (ruoho ym.)
  const decor = [];
  DECOR_TYPES.forEach((type, ti) => {
    const def = OBJECT_TYPES[type];
    const rand = mulberry32(hashSeed(seed, cx, cz, 900 + ti));
    const maxD = Math.max(...Object.values(def.density));
    const nv = variantCounts[def.model] || 1;
    for (let i = 0; i < maxD; i++) {
      const x = x0 + rand() * SIZE;
      const z = z0 + rand() * SIZE;
      const r1 = rand(), r2 = rand(), r3 = rand(), r4 = rand();
      sampleTerrain(x, z, s);
      let p = 0;
      for (const b of BIOME_KEYS) p += (def.density[b] || 0) * s[b];
      if (r1 >= p / maxD) continue;
      if (def.nearWater) {
        if (s.h < WATER_LEVEL - 0.35 || s.h > WATER_LEVEL + 0.9) continue;
      } else if (s.h < WATER_LEVEL + 0.05) continue;
      if (insideStructure(x, z, -1)) continue;
      const sc = def.scale[0] + r3 * (def.scale[1] - def.scale[0]);
      decor.push(ti, Math.floor(r4 * nv), x, s.h - 0.03, z, r2 * Math.PI * 2, sc, sc * (0.8 + s.mare * 0.5));
    }
  });

  return {
    cx, cz, minH, rain: rain / (row * row),
    positions, normals, colors, uvs,
    objects: new Float32Array(objs),
    decor: new Float32Array(decor),
  };
}

// Kartan ruutu: koko x koko pikseliä, mpp metriä / pikseli, vasen yläkulma (x0, z0).
const PAPER = [226, 206, 162];
export function generateMapTile(x0, z0, size, mpp) {
  const out = new Uint8ClampedArray(size * size * 4);
  const col = [0, 0, 0];
  const prevRow = new Float32Array(size + 1);
  const cur = new Float32Array(size + 1);
  for (let j = -1; j < size; j++) {
    for (let i = -1; i < size; i++) {
      const x = x0 + (i + 0.5) * mpp;
      const z = z0 + (j + 0.5) * mpp;
      const h = mapColorRGB(x, z, col).h;
      if (j >= 0 && i >= 0) {
        // Rinnevarjostus: vertaa luoteiseen naapuriin.
        const d = h - prevRow[i];
        const k = Math.max(0.72, Math.min(1.25, 1 - d * (0.5 / Math.max(1, mpp))));
        const o = (j * size + i) * 4;
        // Piirretyn kartan sävy: hieman paperin väriin päin.
        out[o] = col[0] * k * 0.82 + PAPER[0] * 0.18;
        out[o + 1] = col[1] * k * 0.82 + PAPER[1] * 0.18;
        out[o + 2] = col[2] * k * 0.82 + PAPER[2] * 0.18;
        out[o + 3] = 255;
      }
      cur[i + 1] = h;
    }
    prevRow.set(cur);
  }
  return out;
}
