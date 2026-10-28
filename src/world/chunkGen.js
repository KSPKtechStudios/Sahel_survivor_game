// Chunkin generointi puhtaana laskentana (ei three.js:ää). Ajetaan
// generointisäikeessä (genWorker.js), tai pääsäikeessä varajärjestelmänä.
// Palauttaa tyypitetyt taulukot, joista pääsäie rakentaa verkot ja instanssit.
import { CONFIG } from '../config.js';
import { mulberry32, hashSeed } from '../noise.js';
import {
  sampleTerrain, heightAt, groundColor, groundWeights, getWorldSeed, BIOME_KEYS, insideStructure, mapColorRGB,
  karstNear, insideKarst,
} from './terrain.js';
import { OBJECT_TYPES, OBJECT_TYPE_KEYS, DECOR_TYPES } from './objectTypes.js';
import { openFactor } from './waves.js';
import { generateCover } from './groundCover.js';

// Tiheyden avaimet: biomit sekä muodostumat (graniittikallio, pöytävuori).
const DENSITY_KEYS = [...BIOME_KEYS, 'rock', 'mesa', 'cliff']; // cliff: sessio 57, sademetsän jyrkänteet
const SIZE = CONFIG.chunkSize;
const SEG = CONFIG.chunkSegments;
const STEP = SIZE / SEG;
export const OBJ_STRIDE = 8;   // typeIndex, candidate, x, y, z, rot, scale, variant
export const DECOR_STRIDE = 8; // decorIndex, variant, x, y, z, rotY, sxz, sy

// Piirretyn maastoverkon korkeus (kolmiot kuten world.js:n indeksissä:
// lävistäjä kulmasta (i+1, j) kulmaan (i, j+1)). Analyyttinen korkeus voi olla
// kuperalla maalla verkon yläpuolella, jolloin litteä lammikko leijui.
function meshHeight(x, z) {
  const gx = Math.floor(x / STEP), gz = Math.floor(z / STEP);
  const fx = x / STEP - gx, fz = z / STEP - gz;
  const X = gx * STEP, Z = gz * STEP;
  const ha = heightAt(X, Z), hb = heightAt(X + STEP, Z), hc = heightAt(X, Z + STEP);
  if (fx + fz <= 1) return ha + (hb - ha) * fx + (hc - ha) * fz;
  const hd = heightAt(X + STEP, Z + STEP);
  return hd + (hc - hd) * (1 - fx) + (hb - hd) * (1 - fz);
}

// Sessio 58: jalanjäljen säde (m), jonka alla pitää olla maata. Kivet saavat
// olla rinteessä ja kallioseinällä (maxSlope 1), poimittavat ja koristeet ovat pieniä.
function footRadius(def) {
  if (def.kind === 'pickup' || def.decorative || def.maxSlope >= 1) return 0;
  if (def.kind === 'tree') return Math.max(1.2, (def.collider || 0.3) * 2.5);
  if (def.hit) return Math.max(0.5, def.hit.r * 0.9);
  return Math.max(0.4, def.collider || 0);
}

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
  const gw = new Float32Array(row * row * 4);
  const col = [0, 0, 0];
  const gwv = [0, 0, 0, 0];
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
      groundWeights(x, z, samples[v], 1 - ny, gwv);
      gw[v * 4] = gwv[0]; gw[v * 4 + 1] = gwv[1]; gw[v * 4 + 2] = gwv[2]; gw[v * 4 + 3] = gwv[3];
      uvs[v * 2] = (x - uvOx) / 3;
      uvs[v * 2 + 1] = (z - uvOz) / 3;
      rain += samples[v].rainforest;
    }
  }

  const water = buildWater(samples, row);

  // Maaston korkeus palan ruudukosta (reunojen ulkopuolella maastofunktiosta).
  const groundAt = (wx, wz) => {
    const fi = (wx - x0) / STEP + 1, fj = (wz - z0) / STEP + 1;
    if (fi < 0 || fj < 0 || fi > B - 1.001 || fj > B - 1.001) return heightAt(wx, wz);
    const gi = Math.floor(fi), gj = Math.floor(fj), fx = fi - gi, fz = fj - gj;
    const a = gj * B + gi;
    return (heights[a] * (1 - fx) + heights[a + 1] * fx) * (1 - fz) + (heights[a + B] * (1 - fx) + heights[a + B + 1] * fx) * fz;
  };
  // Sessio 58: koko jalanjäljen alla maata. Ennen tarkistettiin vain metrin
  // päästä kahteen suuntaan, joten jyrkänteen ja pöytävuoren reunalle syntyi
  // puita ja juurakoita, joiden alta puuttui maa (käyttäjän kuva).
  const footOk = (x, z, h, R) => {
    const drop = 0.6 + 0.5 * R, rise = 1.4 + 0.8 * R;
    for (let k = 0; k < 8; k++) {
      const a = k * Math.PI / 4;
      const g = groundAt(x + Math.cos(a) * R, z + Math.sin(a) * R) - h;
      if (g < -drop || g > rise) return false;
    }
    return true;
  };

  // --- Esineet
  const seed = getWorldSeed();
  const objs = [];
  const s = {};
  const foot = OBJECT_TYPE_KEYS.map((k) => footRadius(OBJECT_TYPES[k]));
  const karst = rain > 1 ? karstNear(x0 + SIZE / 2, z0 + SIZE / 2, SIZE * 0.75) : [];
  for (let t = 0; t < OBJECT_TYPE_KEYS.length; t++) {
    const type = OBJECT_TYPE_KEYS[t];
    const def = OBJECT_TYPES[type];
    if (def.decorative || def.special) continue;
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
      for (const b of DENSITY_KEYS) p += (def.density[b] || 0) * s[b];
      // Kalliolla ja pöytävuorella kasvaa vähemmän (paitsi niille tarkoitetut).
      if (!def.density.rock) p *= 1 - s.rock * 0.85;
      if (!def.density.cliff) p *= 1 - Math.min(1, (s.cliff || 0) * 1.5); // ei puita kallioseinämälle
      if (!def.density.mesa) p *= 1 - s.mesa * 0.75;
      if (r1 >= p / maxD) continue;
      if (def.nearWater) {
        // Vain vesirajassa (joet, järvet, lammet, meren ranta)
        if (s.h < s.wl - 0.1 || s.h > s.wl + 1.0) continue;
      } else if (s.h < s.wl + 0.15) continue;
      // Sessio 58: karstialueella puut vain alle n. 40° rinteille (massiivien
      // kumpuilevat laet ja huiput ovat paikoin hyvin jyrkkiä).
      const maxSlope = def.kind === 'tree' && s.karstM > 0.05 ? Math.min(def.maxSlope, 0.24) : def.maxSlope;
      if (maxSlope < 1 && slope(x, z, s.h) > maxSlope) continue;
      if (insideStructure(x, z, def.kind === 'pickup' ? 0 : 2)) continue;
      if (karst.length && insideKarst(x, z, def.kind === 'pickup' ? 0.3 : 1.5)) continue;
      const scale = def.scale[0] + r3 * (def.scale[1] - def.scale[0]);
      if (foot[t] && !footOk(x, z, s.h, foot[t] * scale)) continue;
      objs.push(t, i, x, s.h - (def.kind === 'pickup' ? 0.02 : 0.05), z, r2 * Math.PI * 2, scale, Math.floor(r4 * nv));
    }
  }

  // Sessio 58: karstimaisema. Kalkkikivitornit (keskipiste tässä chunkissa)
  // ja jyrkänteen seinään upotetut lohkareet: yksi ehdokas 2,6 m:n
  // maailmanruutua kohden (sama ruudukko kaikissa chunkeissa), etupuoli
  // alamäkeen. Ennen seinä oli pelkkä sileä rinne (käyttäjä: "ruohoseinä").
  const tTower = OBJECT_TYPE_KEYS.indexOf('karstTower');
  for (const k of karst) {
    if (k.x < x0 || k.z < z0 || k.x >= x0 + SIZE || k.z >= z0 + SIZE) continue;
    objs.push(tTower, 0, k.x, k.y, k.z, k.rot, k.scale, k.variant);
  }
  if (rain > 1) {
    const tCliff = OBJECT_TYPE_KEYS.indexOf('cliffRock');
    const nCliff = variantCounts.cliffRock || 1;
    const CELL = 2.6;
    const ci0 = Math.floor(x0 / CELL), cj0 = Math.floor(z0 / CELL);
    for (let cj = cj0; cj <= Math.floor((z0 + SIZE) / CELL); cj++) {
      for (let ci = ci0; ci <= Math.floor((x0 + SIZE) / CELL); ci++) {
        const r = mulberry32(hashSeed(seed, ci, cj, 9001));
        const x = (ci + 0.1 + r() * 0.8) * CELL, z = (cj + 0.1 + r() * 0.8) * CELL;
        const keep = r(), jr = r(), sc = r(), va = r();
        if (x < x0 || z < z0 || x >= x0 + SIZE || z >= z0 + SIZE) continue;
        const sv = samples[Math.round((z - z0) / STEP) * row + Math.round((x - x0) / STEP)];
        if (!(sv.cliff > 0.25) || keep > 0.3 + sv.cliff * 0.7 || sv.h < sv.wl + 0.3) continue;
        const gx = groundAt(x + 1, z) - groundAt(x - 1, z), gz = groundAt(x, z + 1) - groundAt(x, z - 1);
        if (Math.hypot(gx, gz) < 1.5) continue; // vain jyrkkä seinä (n. 37° ja yli)
        if (karst.length && insideKarst(x, z, 1)) continue;
        objs.push(tCliff, 100000 + (cj - cj0) * 64 + (ci - ci0), x, groundAt(x, z), z, Math.atan2(-gx, -gz) + (jr - 0.5) * 0.5, 0.75 + sc * 0.5, Math.floor(va * nCliff));
      }
    }
  }

  // --- Koristeet (ruoho ym.)
  // Sessio 24: koristeita on paljon (kerroksellinen maanpeite), joten ne
  // käyttävät lähimmän verkon kärjen maastonäytettä ja piirretyn verkon
  // korkeutta eivätkä laske maastoa erikseen jokaiselle ehdokkaalle.
  const gridHeight = (lx, lz) => {
    const fi = Math.min(SEG - 1e-4, Math.max(0, lx / STEP)), fj = Math.min(SEG - 1e-4, Math.max(0, lz / STEP));
    const gi = Math.floor(fi), gj = Math.floor(fj);
    const fx = fi - gi, fz = fj - gj;
    const a = gj * row + gi, b = a + 1, c = a + row, d = c + 1;
    const ha = positions[a * 3 + 1], hb = positions[b * 3 + 1], hc = positions[c * 3 + 1], hd = positions[d * 3 + 1];
    return fx + fz <= 1 ? ha + (hb - ha) * fx + (hc - ha) * fz : hd + (hc - hd) * (1 - fx) + (hb - hd) * (1 - fz);
  };
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
      const vi = Math.min(SEG, Math.max(0, Math.round((z - z0) / STEP))) * row + Math.min(SEG, Math.max(0, Math.round((x - x0) / STEP)));
      const sv = samples[vi];
      let p = 0;
      for (const b of DENSITY_KEYS) p += (def.density[b] || 0) * (sv[b] || 0);
      if (!def.density.cliff) p *= 1 - Math.min(1, (sv.cliff || 0) * 1.5);
      if (r1 >= p / maxD) continue;
      const h = gridHeight(x - x0, z - z0);
      let y = def.lift !== undefined ? h + def.lift : h - 0.03;
      if (def.slopeCheck && 1 - normals[vi * 3 + 1] > def.maxSlope) continue;
      // Sessio 58: ei ruohoa tai aluskasveja karstin pystyseinillä (yli n. 48°).
      if (!def.density.cliff && sv.karstM > 0.05 && 1 - normals[vi * 3 + 1] > 0.33) continue;
      if (def.onWater) {
        // Kelluu tyynellä vedellä (ei joissa eikä meressä), 0.3..2.2 m syvyydessä.
        const depth = sv.wl - h;
        if (depth < 0.3 || depth > 2.2 || sv.wtype === 3 || sv.wtype === 4 || sv.ocean + sv.beach > 0.2) continue;
        y = sv.wl + 0.005;
      } else if (def.nearWater) {
        if (h < sv.wl - 0.35 || h > sv.wl + 0.9) continue;
        // Sessio 27: kaislat eivät kasva hiekkarannoilla eivätkä meren rannassa.
        if (def.notBeach && sv.beach + sv.ocean > 0.25) continue;
      } else if (def.seabed) {
        // Sessio 25: veden alla pohjassa (levät, pohjakivet).
        const depth = sv.wl - h;
        if (depth < def.seabed[0] || depth > def.seabed[1]) continue;
        y = h - 0.02;
      } else if (h < sv.wl + 0.05) continue;
      if (insideStructure(x, z, -1)) continue;
      const sc = def.scale[0] + r3 * (def.scale[1] - def.scale[0]);
      if (def.puddleWeight) {
        // Lammikko lepää verkon matalimmassa kohdassa reunansa alueella; jos
        // reuna ei ole tasainen, kohta hylätään (sessio 13: lammikot leijuivat).
        // Mallin säde on enintään ~1,8 × skaala: tarkistetaan kaksi kehää.
        let lo = meshHeight(x, z), hi = lo;
        for (const R of [sc * 0.9, sc * 1.85]) {
          for (let k = 0; k < 12; k++) {
            const a = (k / 12) * Math.PI * 2;
            const hk = meshHeight(x + Math.cos(a) * R, z + Math.sin(a) * R);
            lo = Math.min(lo, hk);
            hi = Math.max(hi, hk);
          }
        }
        if (hi - lo > 0.12) continue;
        y = lo + 0.015;
      }
      // Lammikon pysyvyys (1 = sademetsä, aina vettä; 0 = vain sateen jälkeen)
      // kulkee y-skaalassa (litteä malli, pystyskaala ei näy).
      const sy = def.puddleWeight ? 0.05 + 0.95 * Math.min(1, sv.rainforest + sv.oasis)
        : def.onWater ? sc : sc * (0.8 + sv.mare * 0.5);
      decor.push(ti, Math.floor(r4 * nv), x, y, z, r2 * Math.PI * 2, sc, sy);
    }
  });

  // --- Sessio 27: sademetsän lammikot maaston kuoppiin (käyttäjä: aina
  // matalimpiin kohtiin). Etsitään verkon paikalliset minimit; vedenpinta on
  // kuopan reunan matalimmassa kohdassa, joten vesi täyttää notkon eikä
  // reuna jää leijumaan.
  {
    const ti = DECOR_TYPES.indexOf('puddle');
    if (ti >= 0) {
      const prand = mulberry32(hashSeed(seed, cx, cz, 1700));
      const nv = variantCounts.puddle || 1;
      const H = (i, j) => positions[(j * row + i) * 3 + 1];
      let placed = 0;
      for (let j = 2; j <= SEG - 2 && placed < 6; j++) {
        for (let i = 2; i <= SEG - 2 && placed < 6; i++) {
          const sv = samples[j * row + i];
          if (sv.rainforest < 0.45) continue;
          const h = H(i, j);
          if (h < sv.wl + 0.15) continue;
          let isMin = true;
          for (let dj = -2; dj <= 2 && isMin; dj++) {
            for (let di = -2; di <= 2; di++) {
              if ((di || dj) && H(i + di, j + dj) < h) { isMin = false; break; }
            }
          }
          if (!isMin || prand() > 0.8) continue;
          const x = x0 + i * STEP, z = z0 + j * STEP;
          for (const R of [3.6, 2.7, 1.9]) {
            let ringMin = Infinity;
            for (let k = 0; k < 16; k++) {
              const a = (k / 16) * Math.PI * 2;
              ringMin = Math.min(ringMin, meshHeight(x + Math.cos(a) * R, z + Math.sin(a) * R));
            }
            const level = ringMin - 0.02;
            const depth = level - meshHeight(x, z);
            if (depth >= 0.05 && depth <= 0.8 && !insideStructure(x, z, -1)) {
              decor.push(ti, Math.floor(prand() * nv), x, level, z, prand() * Math.PI * 2, R / 1.8, 1);
              placed++;
              break;
            }
          }
        }
      }
    }
  }

  // --- Sessio 24: tiheä ruohokenttä (render/grassField.js)
  const { cover, coverCells } = generateCover(cx, cz, samples, positions, normals, gw);

  return {
    cx, cz, minH, rain: rain / (row * row),
    positions, normals, colors, uvs, gw,
    objects: new Float32Array(objs),
    decor: new Float32Array(decor),
    cover, coverCells,
    water,
  };
}

// --- Vesipinta -----------------------------------------------------------------
// Sama ruudukko kuin maastolla. Mukaan otetaan ruudut, joiden jokin kulma on
// veden alla; muut kulmat jäävät maan alle piiloon. Pisteen tiedot:
// syvyys, avoimuus (aallot), virtaus (joet) ja veden värit (syvä / matala).

function srgbLin(hex) {
  const f = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return [f(((hex >> 16) & 255) / 255), f(((hex >> 8) & 255) / 255), f((hex & 255) / 255)];
}
const W_COL = {
  sea: [srgbLin(0x0d3a50), srgbLin(0x3aa59c)],
  rain: [srgbLin(0x1c2614), srgbLin(0x55603a)],
  sahel: [srgbLin(0x352c1c), srgbLin(0x7e6c45)],
  mount: [srgbLin(0x0e3644), srgbLin(0x4a9a94)],
  oasis: [srgbLin(0x123c3c), srgbLin(0x4c9a7c)],
};

function buildWater(samples, row) {
  const n = row * row;
  const wet = new Uint8Array(n);
  let any = false;
  for (let v = 0; v < n; v++) {
    if (samples[v].h < samples[v].wl) { wet[v] = 1; any = true; }
  }
  if (!any) return null;
  const idx = [];
  for (let j = 0; j < SEG; j++) {
    for (let i = 0; i < SEG; i++) {
      const a = j * row + i;
      const b = a + 1;
      const c = a + row;
      const d = c + 1;
      if (wet[a] | wet[b] | wet[c] | wet[d]) idx.push(a, c, b, b, c, d);
    }
  }
  const positions = new Float32Array(n * 3);
  const data = new Float32Array(n * 4);
  const deep = new Float32Array(n * 3);
  const shallow = new Float32Array(n * 3);
  for (let j = 0; j <= SEG; j++) {
    for (let i = 0; i <= SEG; i++) {
      const v = j * row + i;
      const s = samples[v];
      // Kuivan kulman korkeus: enintään märän naapurin pinta ja aina hieman
      // maan alla. Näin eri korkuisten vesien rajalle ei synny pystyseinämiä.
      let y = s.wl;
      if (!wet[v]) {
        let m = -Infinity;
        for (let dj = -1; dj <= 1; dj++) {
          for (let di = -1; di <= 1; di++) {
            const ii = i + di, jj = j + dj;
            if (ii < 0 || jj < 0 || ii > SEG || jj > SEG) continue;
            const k = jj * row + ii;
            if (wet[k] && samples[k].wl > m) m = samples[k].wl;
          }
        }
        if (m > -Infinity) y = Math.min(m, s.h - 0.05);
      }
      positions[v * 3] = i * STEP;
      positions[v * 3 + 1] = y;
      positions[v * 3 + 2] = j * STEP;
      const depth = y - s.h;
      // Avoimuus: meri aaltoilee, järvet vähän, joet tuskin lainkaan.
      data[v * 4] = depth;
      data[v * 4 + 1] = openFactor(s.wtype, depth, s.ocean + s.beach, s.lakeR);
      // Virtaus uoman suuntaan alamäkeen (vain joet ja purot).
      data[v * 4 + 2] = s.flowX || 0;
      data[v * 4 + 3] = s.flowZ || 0;
      // Värit biomin mukaan
      const wSea = s.ocean + s.beach;
      const wRain = s.rainforest;
      const wMount = s.mountains;
      const wOasis = s.oasis;
      const wSahel = Math.max(0, 1 - wSea - wRain - wMount - wOasis);
      for (let c = 0; c < 3; c++) {
        deep[v * 3 + c] = W_COL.sea[0][c] * wSea + W_COL.rain[0][c] * wRain + W_COL.mount[0][c] * wMount + W_COL.oasis[0][c] * wOasis + W_COL.sahel[0][c] * wSahel;
        shallow[v * 3 + c] = W_COL.sea[1][c] * wSea + W_COL.rain[1][c] * wRain + W_COL.mount[1][c] * wMount + W_COL.oasis[1][c] * wOasis + W_COL.sahel[1][c] * wSahel;
      }
    }
  }
  return { positions, data, deep, shallow, index: new Uint32Array(idx) };
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
      const sm = mapColorRGB(x, z, col);
      const h = sm.h < sm.wl ? sm.wl : sm.h;
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
