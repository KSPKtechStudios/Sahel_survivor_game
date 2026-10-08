// Sessio 24: tiheä ruohokenttä (maanpeite). Lasketaan generointisäikeessä
// chunkin maastoverkon kärkipisteistä: jokaiselle kärjelle tiheys, lajien
// osuudet ja värit, ja ruudukon soluihin arvotaan tupsut. Korkeus lasketaan
// piirretystä verkosta, joten tupsut istuvat tarkasti maassa.
//
// Tupsun lajit (atlasten ruudut, render/grassField.js):
//   0 = lyhyt nurmi, 1 = niittyheinä, 2 = sara, 3 = kuiva savanniheinä,
//   4 = saniaisryhmä, 5 = lehväkasvi, 6 = apilamatto, 7 = korkea lehtiyrtti
import { CONFIG } from '../config.js';
import { mulberry32, hashSeed, createNoise2D, smoothstep } from '../noise.js';
import { getWorldSeed, insideStructure } from './terrain.js';

const SIZE = CONFIG.chunkSize;
const SEG = CONFIG.chunkSegments;
const STEP = SIZE / SEG;
export const COVER_STRIDE = 10; // x, y, z, rot + laji * 8 | leveys, korkeus, kuolleet, vaihtelu | pohja, latva
export const COVER_CELLS = 2;   // osaruudukko (2 x 2) näkyvyyttä ja karsintaa varten

function srgb(hex) {
  const f = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  return [f((hex >> 16) & 255), f((hex >> 8) & 255), f(hex & 255)];
}

// Biomien ruohot: tiheys (tupsua / m²), lajien painot [nurmi, niitty, sara, kuiva,
// saniainen, lehväkasvi, apila, lehtiyrtti],
// pohjan ja latvan värit, kuolleiden korsien osuus ja korkeuden kerroin.
const B = {
  savanna:    { d: 1.15, k: [0.2, 0.35, 0.05, 0.4, 0, 0, 0, 0], base: 0x4c4822, tip: 0xc9ad66, dead: 0.35, h: 1.0 },
  woodland:   { d: 1.0,  k: [0.25, 0.4, 0.05, 0.25, 0, 0.02, 0.03, 0], base: 0x464b22, tip: 0xb8aa62, dead: 0.28, h: 0.95 },
  mare:       { d: 1.35, k: [0.15, 0.3, 0.42, 0.05, 0.02, 0.02, 0.04, 0], base: 0x3c5020, tip: 0x9fae55, dead: 0.12, h: 1.05 },
  oasis:      { d: 1.2,  k: [0.3, 0.32, 0.2, 0, 0.05, 0.04, 0.06, 0.03], base: 0x34501d, tip: 0x88aa45, dead: 0.05, h: 1.0 },
  rainforest: { d: 1.5, k: [0.12, 0, 0.06, 0, 0.32, 0.2, 0.18, 0.12], base: 0x233a14, tip: 0x5f8a30, dead: 0.04, h: 0.75 },
  laterite:   { d: 0.28, k: [0.45, 0.15, 0, 0.4, 0, 0, 0, 0], base: 0x675530, tip: 0xc9a868, dead: 0.5, h: 0.8 },
  mountains:  { d: 0.6,  k: [0.66, 0.28, 0, 0, 0.02, 0, 0.04, 0], base: 0x46522c, tip: 0x9aa066, dead: 0.25, h: 0.85 },
  desert:     { d: 0.03, k: [0.2, 0, 0, 0.8, 0, 0, 0, 0], base: 0x7a6a40, tip: 0xd8c48a, dead: 0.6, h: 0.7 },
  dunes:      { d: 0.02, k: [0.2, 0, 0, 0.8, 0, 0, 0, 0], base: 0x7a6a40, tip: 0xd8c48a, dead: 0.6, h: 0.7 },
  beach:      { d: 0.1,  k: [0.5, 0, 0.5, 0, 0, 0, 0, 0], base: 0x5a6a30, tip: 0xb8b878, dead: 0.3, h: 0.8 },
  ocean:      { d: 0, k: [1, 0, 0, 0, 0, 0, 0, 0], base: 0x5a6a30, tip: 0xb8b878, dead: 0, h: 1 },
};
for (const b of Object.values(B)) { b.cb = srgb(b.base); b.ct = srgb(b.tip); }
const KEYS = Object.keys(B);
// Vesirajan rehevä kasvu (järvet, joet): vihreämpää ja enemmän saraa.
const WET = { cb: srgb(0x34501d), ct: srgb(0x8aa848) };

let noiseSeed = -1;
let NZ = null;
function noise() {
  const s = getWorldSeed();
  if (s !== noiseSeed) { noiseSeed = s; NZ = createNoise2D(hashSeed(s, 4242)); }
  return NZ;
}

function pack(c) {
  const q = (v) => Math.max(0, Math.min(255, Math.round(Math.sqrt(Math.max(0, v)) * 255)));
  return q(c[0]) * 65536 + q(c[1]) * 256 + q(c[2]);
}

// samples: chunkin kärkipisteiden maastonäytteet, positions: verkon kärjet
// (y = korkeus), normals ja gw (maalajien painot, ks. terrain.groundWeights).
export function generateCover(cx, cz, samples, positions, normals, gw) {
  const row = SEG + 1;
  const x0 = cx * SIZE, z0 = cz * SIZE;
  const nz = noise();
  const nV = row * row;
  const dens = new Float32Array(nV);
  const kinds = new Float32Array(nV * 8);
  const cols = new Float32Array(nV * 7); // pohja rgb, latva rgb, kuolleet
  const hmul = new Float32Array(nV);
  const k4 = [0, 0, 0, 0, 0, 0, 0, 0];
  for (let v = 0; v < nV; v++) {
    const s = samples[v];
    const x = x0 + positions[v * 3], z = z0 + positions[v * 3 + 2];
    let d = 0, dead = 0, hm = 0, wsum = 0;
    k4.fill(0);
    const cb = [0, 0, 0], ct = [0, 0, 0];
    for (const key of KEYS) {
      const w = s[key] || 0;
      if (w <= 0) continue;
      const b = B[key];
      d += b.d * w;
      dead += b.dead * w;
      hm += b.h * w;
      wsum += w;
      for (let i = 0; i < 8; i++) k4[i] += b.k[i] * w;
      for (let i = 0; i < 3; i++) { cb[i] += b.cb[i] * w; ct[i] += b.ct[i] * w; }
    }
    if (wsum > 0) {
      dead /= wsum; hm /= wsum;
      for (let i = 0; i < 3; i++) { cb[i] /= wsum; ct[i] /= wsum; }
    }
    // Laajat laikut: tiheät heinäniityt ja harvemmat kohdat vuorottelevat,
    // ja korkea heinä kasvaa omina alueinaan.
    const p1 = nz(x / 38, z / 38) * 0.5 + 0.5;
    const p2 = nz(x / 9 + 17, z / 9 - 31) * 0.5 + 0.5;
    d *= 0.35 + 1.1 * smoothstep(0.2, 0.7, p1) + 0.25 * (p2 - 0.5);
    const tallPatch = smoothstep(0.45, 0.75, p1);
    k4[3] *= 0.4 + tallPatch * 1.4;
    k4[2] *= 0.6 + tallPatch * 0.8;
    k4[0] *= 1.3 - tallPatch * 0.8;
    hm *= 0.85 + tallPatch * 0.3;
    // Vesirajassa rehevää; veden alla, kalliolla ja hiekalla ei kasva.
    const above = s.h - s.wl;
    if (above < 0.08) d = 0;
    const shore = 1 - smoothstep(0.3, 2.0, above);
    if (shore > 0 && s.ocean + s.beach < 0.3) {
      d *= 1 + shore * 0.6;
      k4[2] += shore * 0.8;
      dead *= 1 - shore * 0.7;
      for (let i = 0; i < 3; i++) { cb[i] += (WET.cb[i] - cb[i]) * shore * 0.6; ct[i] += (WET.ct[i] - ct[i]) * shore * 0.6; }
    }
    const ny = normals[v * 3 + 1];
    d *= 1 - smoothstep(0.86, 0.75, ny); // jyrkkä rinne
    const sand = gw[v * 4], rock = gw[v * 4 + 3];
    d *= (1 - rock * 0.95) * (1 - sand * 0.92);
    if (s.chan > 0.3) d *= 1 - s.chan;
    if (insideStructure(x, z, -1)) d = 0;
    dens[v] = Math.max(0, d);
    let ks = 0;
    for (let i = 0; i < 8; i++) ks += k4[i];
    for (let i = 0; i < 8; i++) kinds[v * 8 + i] = k4[i] / (ks || 1);
    // Pieni sävyvaihtelu laikuittain (kuivempia ja vihreämpiä kohtia).
    const dry = (p2 - 0.5) * 0.35;
    for (let i = 0; i < 3; i++) {
      cols[v * 7 + i] = cb[i];
      cols[v * 7 + 3 + i] = ct[i] * (1 + dry * (i === 2 ? -0.6 : 0.25));
    }
    cols[v * 7 + 6] = Math.min(0.9, Math.max(0, dead + dry * 0.5));
    hmul[v] = hm || 1;
  }

  // Tupsut soluittain; osaruutuihin ryhmiteltyinä.
  const per = SEG / COVER_CELLS;
  const lists = [];
  const ranges = new Float32Array(COVER_CELLS * COVER_CELLS * 4);
  const rand = mulberry32(hashSeed(getWorldSeed(), cx, cz, 7777));
  const area = STEP * STEP;
  const bc = [0, 0, 0], tc = [0, 0, 0];
  for (let cj = 0; cj < COVER_CELLS; cj++) {
    for (let ci = 0; ci < COVER_CELLS; ci++) {
      const out = [];
      let minY = Infinity, maxY = -Infinity;
      for (let j = cj * per; j < (cj + 1) * per; j++) {
        for (let i = ci * per; i < (ci + 1) * per; i++) {
          const a = j * row + i, b = a + 1, c = a + row, dd = c + 1;
          const dmax = Math.max(dens[a], dens[b], dens[c], dens[dd]);
          if (dmax <= 0.001) continue;
          const want = dmax * area;
          const n = Math.floor(want) + (rand() < want % 1 ? 1 : 0);
          for (let q = 0; q < n; q++) {
            const fx = rand(), fz = rand();
            const r1 = rand(), r2 = rand(), r3 = rand(), r4 = rand();
            const dv = (dens[a] * (1 - fx) + dens[b] * fx) * (1 - fz) + (dens[c] * (1 - fx) + dens[dd] * fx) * fz;
            if (r1 * dmax > dv) continue;
            // Lähin kärki: laji, värit
            const vn = (fz < 0.5 ? (fx < 0.5 ? a : b) : (fx < 0.5 ? c : dd));
            let kind = 0;
            let acc = 0;
            for (let t = 0; t < 8; t++) { acc += kinds[vn * 8 + t]; if (r2 < acc) { kind = t; break; } }
            // Korkeus piirretystä verkosta (lävistäjä kuten world.js:n indeksissä).
            const ha = positions[a * 3 + 1], hb = positions[b * 3 + 1], hc = positions[c * 3 + 1], hd = positions[dd * 3 + 1];
            const y = fx + fz <= 1 ? ha + (hb - ha) * fx + (hc - ha) * fz : hd + (hc - hd) * (1 - fx) + (hb - hd) * (1 - fz);
            const lx = (i + fx) * STEP, lz = (j + fz) * STEP;
            const hm = hmul[vn];
            const sc = 0.75 + r3 * 0.55;
            const sy = sc * hm * (0.8 + r4 * 0.4);
            for (let t = 0; t < 3; t++) { bc[t] = cols[vn * 7 + t]; tc[t] = cols[vn * 7 + 3 + t]; }
            out.push(lx, y - 0.04, lz, rand() * 6.283 + kind * 8, sc, sy, cols[vn * 7 + 6], rand(), pack(bc), pack(tc));
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }
      // Satunnainen järjestys: alkuosa on tasainen otos (tiheyden säätö).
      const cnt = out.length / COVER_STRIDE;
      for (let m = cnt - 1; m > 0; m--) {
        const r = Math.floor(rand() * (m + 1));
        if (r === m) continue;
        for (let t = 0; t < COVER_STRIDE; t++) {
          const tmp = out[m * COVER_STRIDE + t];
          out[m * COVER_STRIDE + t] = out[r * COVER_STRIDE + t];
          out[r * COVER_STRIDE + t] = tmp;
        }
      }
      const ri = (cj * COVER_CELLS + ci) * 4;
      ranges[ri + 1] = cnt;
      ranges[ri + 2] = cnt ? minY : 0;
      ranges[ri + 3] = cnt ? maxY : 0;
      lists.push(out);
    }
  }
  let total = 0;
  for (let c = 0; c < lists.length; c++) { ranges[c * 4] = total; total += lists[c].length / COVER_STRIDE; }
  const cover = new Float32Array(total * COVER_STRIDE);
  let o = 0;
  for (const l of lists) { cover.set(l, o); o += l.length; }
  return { cover, coverCells: ranges };
}
