// Sessio 33: käyttäjän antamat esinemallit (puunuija ja soihtu). Geometria on
// muunnettu GLB:stä valmiiksi (data/userItems.js), joten se on käytössä heti
// käynnistyksessä. Värit on näytteistetty tekstuurista verteksiväreiksi:
// kuvakkeet ja maassa olevat esineet piirtyvät niillä, ja kädessä esine saa
// oikeat tekstuurit (väri, normaali, karheus) geo.userData.material-kentästä.
import * as THREE from 'three';
import { CLUB, TORCH } from './data/userItems.js';

const DIR = 'assets/models/items/';
const loader = new THREE.TextureLoader();
const texCache = new Map();
function tex(name, srgb) {
  if (!name) return null;
  if (!texCache.has(name)) {
    const t = loader.load(DIR + name + '.webp');
    t.flipY = false; // glTF-tekstuurien UV-suunta
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    texCache.set(name, t);
  }
  return texCache.get(name);
}

function dec(b64, T) {
  const bin = atob(b64);
  const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return new T(u8.buffer);
}

const _c = new THREE.Color();
function build(D, matOpts = {}) {
  let nv = 0, ni = 0;
  for (const g of D.groups) { nv += g.count; ni += g.idx ? dec(g.idx, Uint16Array).length : g.count; }
  const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), uv = new Float32Array(nv * 2), col = new Float32Array(nv * 3);
  const index = new Uint32Array(ni);
  const geo = new THREE.BufferGeometry();
  const mats = [];
  let v0 = 0, i0 = 0;
  D.groups.forEach((g, gi) => {
    pos.set(dec(g.pos, Float32Array), v0 * 3);
    const n = dec(g.nor, Int8Array), u = dec(g.uv, Uint16Array), c = dec(g.col, Uint8Array);
    const [u0, u1, w0, w1] = g.uvr;
    for (let i = 0; i < g.count; i++) {
      const k = (v0 + i) * 3;
      nor[k] = n[i * 3] / 127; nor[k + 1] = n[i * 3 + 1] / 127; nor[k + 2] = n[i * 3 + 2] / 127;
      uv[(v0 + i) * 2] = u0 + (u[i * 2] / 65535) * (u1 - u0);
      uv[(v0 + i) * 2 + 1] = w0 + (u[i * 2 + 1] / 65535) * (w1 - w0);
      _c.setRGB(c[i * 3] / 255, c[i * 3 + 1] / 255, c[i * 3 + 2] / 255, THREE.SRGBColorSpace);
      col[k] = _c.r; col[k + 1] = _c.g; col[k + 2] = _c.b;
    }
    const idx = g.idx ? dec(g.idx, Uint16Array) : null;
    const cnt = idx ? idx.length : g.count;
    for (let i = 0; i < cnt; i++) index[i0 + i] = v0 + (idx ? idx[i] : i);
    geo.addGroup(i0, cnt, gi);
    const rm = tex(g.rmMap, false);
    mats.push(new THREE.MeshStandardMaterial({
      map: tex(g.map, true), normalMap: tex(g.normalMap, false), roughnessMap: rm, metalnessMap: rm,
      roughness: 1, metalness: matOpts.metalness ?? 0,
      alphaTest: g.alpha ? 0.45 : 0, side: g.alpha ? THREE.DoubleSide : THREE.FrontSide,
    }));
    v0 += g.count;
    i0 += cnt;
  });
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setIndex(new THREE.BufferAttribute(index, 1));
  geo.computeBoundingSphere();
  // Tekstuurimateriaalit luodaan vasta käytettäessä (kuvat latautuvat taustalla).
  geo.userData.material = mats;
  return geo;
}

// Puunuija: varsi +Y, kahva alhaalla (y -0,17 ... 0,61), nuppi ylhäällä.
export function userClub() {
  return build(CLUB);
}

// Soihtu: varsi +Y, kangaspää ylhäällä; kärki y = 0,44 (liekki, ks. viewmodel).
export function userTorch() {
  return build(TORCH);
}

// --- Sessio 33: kivipuukko uusiksi (käyttäjä: parempi malli, realistiset
// tekstuurit ja terä, joka kiiltää valossa). Kahva on pähkinäpuuta, sidos
// kierrettyä nyöriä (ambientCG Wood051 ja Rope001, CC0). Terä on lohkottua
// tummaa piikiveä: lehden muotoinen, linssimäinen poikkileikkaus ja
// lohkaisuarvet (koverat simpukkamaiset pinnat) molemmin puolin. Kiiltävä
// pinta (lakkakerros) ja pieni ympäristökartta, joten fasetit välkkyvät.
let envTex = null;
function knifeEnv() {
  if (envTex) return envTex;
  const c = document.createElement('canvas');
  c.width = 256; c.height = 128;
  const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 128);
  gr.addColorStop(0, '#b9cde6');
  gr.addColorStop(0.45, '#f4e6cc');
  gr.addColorStop(0.52, '#8a7458');
  gr.addColorStop(1, '#3a2e22');
  g.fillStyle = gr;
  g.fillRect(0, 0, 256, 128);
  // Muutama kirkas kohta (aurinko ja pilvet) välkkeeksi.
  for (const [x, y, r, a] of [[70, 30, 10, 1], [180, 22, 18, 0.5], [120, 45, 26, 0.35]]) {
    const rg = g.createRadialGradient(x, y, 0, x, y, r);
    rg.addColorStop(0, `rgba(255,250,235,${a})`);
    rg.addColorStop(1, 'rgba(255,250,235,0)');
    g.fillStyle = rg;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  envTex = new THREE.CanvasTexture(c);
  envTex.mapping = THREE.EquirectangularReflectionMapping;
  envTex.colorSpace = THREE.SRGBColorSpace;
  return envTex;
}

function hash(n) {
  const s = Math.sin(n * 127.1) * 43758.5453;
  return s - Math.floor(s);
}

export function userKnife() {
  const P = [], U = [], C = [], I = [];
  const groups = [];
  let start = 0;
  const vtx = (x, y, z, u, v, col) => { P.push(x, y, z); U.push(u, v); C.push(...col); return P.length / 3 - 1; };
  const lin = (hex) => { _c.setHex(hex); return [_c.r, _c.g, _c.b]; };
  const close = (mi) => { groups.push([start, I.length - start, mi]); start = I.length; };

  // Kahva: soikea, keskeltä hieman paksumpi, pyöristetty pää.
  const HW = lin(0x6a4a32);
  const ring = 18, rows = 16, y0 = -0.08, y1 = 0.068;
  const base = P.length / 3;
  for (let r = 0; r <= rows; r++) {
    const t = r / rows, y = y0 + (y1 - y0) * t;
    const prof = (0.9 + 0.12 * Math.sin(Math.PI * t)) * (t < 0.08 ? Math.sqrt(Math.max(0.15, t / 0.08)) : 1);
    for (let k = 0; k <= ring; k++) {
      const a = (k / ring) * Math.PI * 2;
      vtx(Math.cos(a) * 0.0155 * prof, y, Math.sin(a) * 0.0122 * prof, t * 1.2, (k / ring) * 0.45, HW);
    }
  }
  for (let r = 0; r < rows; r++) for (let k = 0; k < ring; k++) {
    const a = base + r * (ring + 1) + k, b = a + ring + 1;
    I.push(a, b, a + 1, a + 1, b, b + 1);
  }
  const cap = vtx(0, y0 - 0.003, 0, 0, 0.2, HW);
  for (let k = 0; k < ring; k++) I.push(cap, base + k, base + k + 1);
  close(0);

  // Sidos: kierre kahvan yläpäässä.
  const CW = lin(0x9a8458);
  const turns = 7, segs = turns * 14, sides = 6, tr = 0.0024;
  const cb = P.length / 3;
  for (let s2 = 0; s2 <= segs; s2++) {
    const t = s2 / segs, a = t * turns * Math.PI * 2, y = 0.038 + t * 0.034;
    const R = 0.0158 + 0.0012 * Math.sin(t * Math.PI);
    const cx = Math.cos(a) * R, cz = Math.sin(a) * R * 0.8;
    const nx = Math.cos(a), nz = Math.sin(a);
    for (let k = 0; k <= sides; k++) {
      const b = (k / sides) * Math.PI * 2;
      vtx(cx + nx * Math.cos(b) * tr, y + Math.sin(b) * tr, cz + nz * Math.cos(b) * tr, t * 12, k / sides, CW);
    }
  }
  for (let s2 = 0; s2 < segs; s2++) for (let k = 0; k < sides; k++) {
    const a = cb + s2 * (sides + 1) + k, b = a + sides + 1;
    I.push(a, a + 1, b, a + 1, b + 1, b);
  }
  close(1);

  // Terä: lehden muoto, linssimäinen poikkileikkaus, lohkaisuarvet.
  const BW = lin(0x3a3632);
  const nx = 12, ny = 44, ya = 0.052, yb = 0.278;
  const halfW = (t) => {
    const w = t < 0.32 ? 0.0145 + 0.0075 * Math.sin((t / 0.32) * Math.PI / 2) : 0.022 * Math.pow(Math.cos(((t - 0.32) / 0.68) * Math.PI / 2), 0.85);
    return Math.max(0, w * (1 + 0.06 * (hash(Math.floor(t * 26)) - 0.5)));
  };
  const thick = (t) => 0.0042 * (1 - 0.75 * t) + 0.0006;
  for (const side of [1, -1]) {
    // Lohkaisuarvet reunoilta (keskipiste reunalla, kovera).
    const scars = [];
    for (let i = 0; i < 22; i++) {
      const t = (i + 0.5) / 22 + (hash(i * 7 + side) - 0.5) * 0.03;
      const e = i % 2 ? 1 : -1;
      scars.push([e * halfW(t) * (0.95 + 0.1 * hash(i + 3)), t, 0.006 + 0.007 * hash(i * 3.3 + side), 0.0019 + 0.0016 * hash(i * 1.7 + side)]);
    }
    const sb = P.length / 3;
    for (let j = 0; j <= ny; j++) {
      const t = j / ny, y = ya + (yb - ya) * t, w = halfW(t), th = thick(t);
      for (let i = 0; i <= nx; i++) {
        const s = (i / nx) * 2 - 1, x = s * w;
        let z = th * (1 - Math.pow(Math.abs(s), 1.7));
        for (const [sx, st, r, d] of scars) {
          const dd = Math.hypot(x - sx, (t - st) * (yb - ya));
          if (dd < r) z -= d * (1 - (dd / r) ** 2) * (1 - Math.abs(s) ** 4) * 0.9;
        }
        z = Math.max(z, th * 0.15 * (1 - Math.abs(s)));
        vtx(x, y, side * z, x / 0.05 + 0.5, y * 3, BW);
      }
    }
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const a = sb + j * (nx + 1) + i, b = a + nx + 1;
      if (side > 0) I.push(a, a + 1, b, a + 1, b + 1, b); else I.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  close(2);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
  geo.setIndex(I);
  geo.computeVertexNormals();
  for (const [s, n, m] of groups) geo.addGroup(s, n, m);
  geo.computeBoundingSphere();
  const rep = (t, x, y) => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(x, y); return t; };
  geo.userData.material = [
    new THREE.MeshStandardMaterial({ map: rep(tex('knife_wood_color', true), 1, 1), normalMap: rep(tex('knife_wood_normal'), 1, 1), roughnessMap: rep(tex('knife_wood_rough'), 1, 1), roughness: 1, color: 0xd8b89a }),
    new THREE.MeshStandardMaterial({ map: rep(tex('knife_cord_color', true), 1, 1), normalMap: rep(tex('knife_cord_normal'), 1, 1), roughness: 0.85, color: 0xc8b090 }),
    new THREE.MeshPhysicalMaterial({
      map: rep(tex('knife_stone_color', true), 1, 1), normalMap: rep(tex('knife_stone_normal'), 1, 1), normalScale: new THREE.Vector2(0.25, 0.25),
      color: 0x8a8278, roughness: 0.2, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.08,
      envMap: knifeEnv(), envMapIntensity: 1.1, specularIntensity: 1,
    }),
  ];
  // Piikiven tekstuurit eivät ole glTF:stä: tavallinen UV-suunta.
  for (const m of geo.userData.material) for (const k of ['map', 'normalMap', 'roughnessMap']) if (m[k]) m[k].flipY = true;
  return geo;
}
