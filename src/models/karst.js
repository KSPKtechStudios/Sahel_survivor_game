// Sessio 58: karstimaisema sademetsään (käyttäjän kuvat: jyrkkiä
// kalkkikiviseinämiä, joissa kivenlohkareita ja köynnöksiä, sekä yksittäinen
// kalkkikivitorni, jonka huipulla kasvaa metsää).
//   makeCliffRock:  jyrkänteen seinään upotettava lohkare (paikallinen +z = ulos seinästä)
//   makeKarstTower: kalkkikivitorni (mitat terrain.js KARST_DIMS)
// Ryhmä 0 = limestone (kalkkikivi; verteksiväri = juovat ja sammal),
// ryhmä 1 = karstLeaf (puiden lehtiatlas, ei tuulta). aAO = mallin varjostus.
import * as THREE from 'three';
import { mulberry32, createNoise2D, smoothstep } from '../noise.js';
import { leafCell } from './treeAssets.js';
import { KARST_DIMS } from '../world/terrain.js';

// Värikertoimet kalkkikivitekstuurin päälle (lineaarisia).
const PALE = [1.32, 1.27, 1.15];
const ORANGE = [1.32, 0.88, 0.52];
const DARK = [0.34, 0.33, 0.3];
const MOSS = [0.34, 0.45, 0.19];
const LEAF_CELLS = ['broad_a', 'broad_b', 'kapok'];
const CREEPER_CELLS = ['sapling', 'broad_b'];

const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _u = new THREE.Vector3(), _r = new THREE.Vector3();

function mix(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

class Part {
  constructor() {
    this.p = []; this.n = []; this.c = []; this.uv = []; this.ao = []; this.idx = [];
  }
  vert(p, n, c, u, v, ao) {
    this.p.push(p.x, p.y, p.z);
    this.n.push(n.x, n.y, n.z);
    this.c.push(c[0], c[1], c[2]);
    this.uv.push(u, v);
    this.ao.push(ao);
    return this.p.length / 3 - 1;
  }
}

// Lehtikortti atlaksesta (kuten build_trees.py build_leaves): kanta pos:ssa,
// kortti ylös-suuntaan up, normaali nrm.
function card(L, pos, up, nrm, w, cellName, ao) {
  const cell = leafCell(cellName) || leafCell('broad_a');
  if (!cell) return;
  const h = w * cell.aspect;
  _u.copy(up).addScaledVector(nrm, -up.dot(nrm));
  if (_u.lengthSq() < 1e-6) _u.set(0, 1, 0);
  _u.normalize();
  _r.crossVectors(nrm, _u).normalize();
  const b0 = pos.clone().addScaledVector(_u, -h * 0.08);
  const pts = [
    b0.clone().addScaledVector(_r, -w / 2),
    b0.clone().addScaledVector(_r, w / 2),
    b0.clone().addScaledVector(_r, w / 2).addScaledVector(_u, h).addScaledVector(nrm, -h * 0.1),
    b0.clone().addScaledVector(_r, -w / 2).addScaledVector(_u, h).addScaledVector(nrm, -h * 0.1),
  ];
  const [u0, v0, u1, v1] = cell.uv;
  const uvs = [[u0, v0], [u1, v0], [u1, v1], [u0, v1]];
  const base = L.p.length / 3;
  for (let k = 0; k < 4; k++) L.vert(pts[k], nrm, [1, 1, 1], uvs[k][0], uvs[k][1], ao);
  L.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
}

function finish(rock, leaf) {
  const nr = rock.p.length / 3;
  const g = new THREE.BufferGeometry();
  const cat = (k) => new Float32Array([...rock[k], ...leaf[k]]);
  g.setAttribute('position', new THREE.BufferAttribute(cat('p'), 3));
  g.setAttribute('normal', new THREE.BufferAttribute(cat('n'), 3));
  g.setAttribute('color', new THREE.BufferAttribute(cat('c'), 3));
  g.setAttribute('uv', new THREE.BufferAttribute(cat('uv'), 2));
  g.setAttribute('aAO', new THREE.BufferAttribute(cat('ao'), 1));
  const idx = [...rock.idx, ...leaf.idx.map((i) => i + nr)];
  g.setIndex(idx);
  g.addGroup(0, rock.idx.length, 0);
  g.addGroup(rock.idx.length, leaf.idx.length, 1);
  g.computeBoundingBox();
  g.computeBoundingSphere();
  g.userData.kit = ['limestone', 'karstLeaf'];
  g.userData.keepUv = true;
  return g;
}

// Kivipinnan väri ja varjostus: vaalea kalkkikivi, oranssit vyöhykkeet,
// tummat pystysuorat valumajuovat, sammal ylöspäin katsovilla pinnoilla.
function rockShade(N2, N3, hx, hz, y, ny, groove, ground) {
  const sOr = smoothstep(0.05, 0.55, N2(hx * 0.45 + 7, hz * 0.45 + y * 0.03));
  const sDk = smoothstep(0.3, 0.8, N3(hx * 1.3 + hz * 0.6, y * 0.022 + hx * 0.3));
  let c = mix(PALE, ORANGE, sOr * 0.8);
  c = mix(c, DARK, sDk * 0.75);
  c = mix(c, MOSS, Math.min(1, smoothstep(0.3, 0.7, ny) * 0.9 + ground * 0.5));
  let ao = 0.72 + 0.28 * groove;
  if (ny < -0.2) ao *= 0.75;
  ao *= 0.75 + 0.25 * (1 - ground);
  return [c, ao];
}

// --- Kalkkikivitorni ----------------------------------------------------------------

export function makeKarstTower(vi, seed, q = 1) {
  const { R: R0, H } = KARST_DIMS[vi];
  const rand = mulberry32(seed);
  const N1 = createNoise2D(seed + 1), N2 = createNoise2D(seed + 2), N3 = createNoise2D(seed + 3);
  const ph1 = rand() * 6.28, ph2 = rand() * 6.28;
  const leanA = rand() * 6.28, lean = R0 * (0.12 + rand() * 0.18);
  const nF = 9 + Math.floor(rand() * 6);
  const ledges = [];
  for (let k = 0; k < 4; k++) ledges.push({ y: H * (0.28 + 0.13 * k + rand() * 0.08), a: rand() * 6.28, w: 0.7 + rand() * 1.1, d: 0.5 + rand() * 0.7 });
  const TD = 0.84; // kupolin alku (osuus korkeudesta)

  const center = (y, out) => {
    const t = Math.pow(Math.min(1, Math.max(0, y / H)), 1.6);
    out[0] = Math.cos(leanA) * lean * t;
    out[1] = Math.sin(leanA) * lean * t;
    return out;
  };
  const flute = (a, y) => Math.pow(Math.abs(Math.sin(a * nF + N3(Math.cos(a) * 0.8, y * 0.04) * 3)), 0.35);
  const radius = (a, y) => {
    const t = y / H;
    let p = 1 + 0.22 * (1 - smoothstep(0, 0.07, t));
    p *= 1 - 0.16 * Math.max(0, t) + 0.08 * Math.sin(t * 6.5 + ph1) + 0.04 * Math.sin(t * 15 + ph2);
    const ca = Math.cos(a), sa = Math.sin(a);
    const big = N1(ca * 1.2 + y * 0.03, sa * 1.2 - y * 0.017) * 0.17;
    const mid = N2(ca * 3 + y * 0.08, sa * 3 + y * 0.05) * 0.06;
    let r = R0 * p * (1 + big + mid + (flute(a, y) - 1) * 0.05 * smoothstep(0.05, 0.2, t));
    for (const L of ledges) {
      const da = Math.abs(((a - L.a + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
      const m = 1 - smoothstep(L.w * 0.7, L.w, da);
      if (m > 0) r -= L.d * m * smoothstep(L.y - 0.1, L.y + 0.35, y);
    }
    if (t > TD) {
      const s = (t - TD) / (1 - TD);
      r *= Math.sqrt(Math.max(0, 1 - s * s));
    }
    return Math.max(0, r);
  };
  const cc = [0, 0];
  const surf = (a, y, out) => {
    const r = radius(a, y);
    center(y, cc);
    return out.set(cc[0] + Math.cos(a) * r, y, cc[1] + Math.sin(a) * r);
  };
  const normalAt = (a, y, out) => {
    surf(a + 0.02, y, _a).sub(surf(a - 0.02, y, _b));
    const ta = _a.clone();
    surf(a, y + 0.3, _a).sub(surf(a, y - 0.3, _b));
    out.crossVectors(_a, ta);
    if (out.lengthSq() < 1e-8) out.set(0, 1, 0);
    return out.normalize();
  };

  const rock = new Part(), leaf = new Part();
  // Renkaat: tasavälein kupoliin asti, kupolissa tiheämmin.
  const NS = q ? 44 : 14;
  const ys = [];
  const dy = q ? 0.75 : 2.4;
  for (let y = -8; y < H * TD; y += dy) ys.push(y); // sessio 58: juuri syvemmälle (rinteinen pohja)
  const nd = q ? 9 : 4;
  for (let k = 0; k <= nd; k++) ys.push(H * (TD + (1 - TD) * Math.sin((k / nd) * Math.PI / 2)));
  const tilesU = Math.max(1, Math.round((2 * Math.PI * R0) / 5));
  const grid = [];
  const P = new THREE.Vector3(), Nn = new THREE.Vector3();
  for (let j = 0; j < ys.length; j++) {
    const row = [];
    for (let i = 0; i <= NS; i++) {
      const a = (i / NS) * Math.PI * 2;
      surf(a, ys[j], P);
      normalAt(a, ys[j], Nn);
      const ground = 1 - smoothstep(0, 2.5, ys[j]);
      const [c, ao] = rockShade(N2, N3, Math.cos(a) * R0, Math.sin(a) * R0, ys[j], Nn.y, flute(a, ys[j]), ground);
      // Tekstuuri venytetty pystyyn: pystysuorat juovat kuten kalkkikiviseinässä.
      row.push(rock.vert(P, Nn, c, (i / NS) * tilesU, ys[j] / 11, ao));
    }
    grid.push(row);
  }
  for (let j = 0; j < ys.length - 1; j++) {
    for (let i = 0; i < NS; i++) {
      const a = grid[j][i], b = grid[j][i + 1], c = grid[j + 1][i + 1], d = grid[j + 1][i];
      rock.idx.push(a, c, b, a, d, c);
    }
  }

  // Kasvillisuus: latvus kupolilla, puuryhmiä sen päällä, hyllyillä pensaita,
  // reunalta riippuvia köynnöksiä.
  const pos = new THREE.Vector3(), nrm = new THREE.Vector3(), up = new THREE.Vector3(), tan = new THREE.Vector3();
  const jit = () => new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5);
  const nCrown = q ? 700 : 170;
  for (let k = 0; k < nCrown; k++) {
    const a = rand() * Math.PI * 2;
    const t = TD - 0.1 + (1 - TD + 0.1) * (1 - Math.pow(rand(), 1.7));
    const y = Math.min(H * 0.995, H * t);
    surf(a, y, P);
    normalAt(a, y, Nn);
    const off = 0.15 + rand() * 0.9;
    pos.copy(P).addScaledVector(Nn, off);
    nrm.copy(Nn).multiplyScalar(0.9).addScaledVector(new THREE.Vector3(0, 1, 0), 0.4).add(jit().multiplyScalar(0.8)).normalize();
    tan.set(-Math.sin(a), 0, Math.cos(a));
    up.set(0, 0.7, 0).addScaledVector(Nn, 0.5).addScaledVector(tan, (rand() - 0.5) * 0.8).normalize();
    card(leaf, pos, up, nrm, (q ? 1.5 + rand() * 1.3 : 3 + rand() * 2) * (0.9 + 0.2 * R0 / 8), LEAF_CELLS[Math.floor(rand() * 3)], 0.6 + 0.4 * (off / 1.05));
  }
  // Seinään takertuvaa kasvillisuutta yläosassa (harvenee alaspäin).
  const nWall = q ? 260 : 50;
  for (let k = 0; k < nWall; k++) {
    const a = rand() * Math.PI * 2;
    const t = TD - 0.05 - 0.3 * Math.pow(rand(), 1.8);
    const y = H * t;
    surf(a, y, P);
    normalAt(a, y, Nn);
    pos.copy(P).addScaledVector(Nn, 0.1 + rand() * 0.35);
    nrm.copy(Nn).add(jit().multiplyScalar(0.5)).normalize();
    tan.set(-Math.sin(a), 0, Math.cos(a));
    up.set(0, 1, 0).addScaledVector(tan, (rand() - 0.5) * 1.2).addScaledVector(Nn, 0.3).normalize();
    card(leaf, pos, up, nrm, q ? 0.8 + rand() * 0.9 : 2 + rand(), ['broad_b', 'kapok', 'sapling'][Math.floor(rand() * 3)], 0.65 + rand() * 0.3);
  }
  // Puuryhmät kupolin päällä (kumpuileva siluetti kuten kuvassa).
  const nClump = 5 + Math.floor(rand() * 4);
  for (let m = 0; m < nClump; m++) {
    const a = rand() * Math.PI * 2;
    const y = H * (TD + (1 - TD) * (0.2 + rand() * 0.6));
    surf(a, y, P);
    const cr = 1.8 + rand() * 1.6;
    const cy = P.y + cr * (0.25 + rand() * 0.25);
    const nn = q ? 26 : 8;
    for (let k = 0; k < nn; k++) {
      const u = rand() * Math.PI * 2, v = Math.acos(2 * rand() - 1);
      Nn.set(Math.sin(v) * Math.cos(u), Math.abs(Math.cos(v)) * 0.8 + 0.2, Math.sin(v) * Math.sin(u)).normalize();
      pos.set(P.x, cy, P.z).addScaledVector(Nn, cr * (0.7 + rand() * 0.3));
      up.copy(Nn).add(new THREE.Vector3(0, 0.6, 0)).normalize();
      card(leaf, pos, up, Nn.clone().add(jit().multiplyScalar(0.5)).normalize(), q ? 1.7 + rand() * 1.0 : 3.2 + rand() * 1.5, LEAF_CELLS[Math.floor(rand() * 3)], 0.75 + rand() * 0.25);
    }
  }
  // Hyllyt: pensaita ja reunalta riippuvia köynnöksiä.
  for (const L of ledges) {
    const n = q ? 46 : 12;
    for (let k = 0; k < n; k++) {
      const a = L.a + (rand() - 0.5) * 2 * L.w * 0.8;
      surf(a, L.y + 0.45, P);
      const hx = Math.cos(a), hz = Math.sin(a);
      pos.copy(P).add(new THREE.Vector3(hx, 0, hz).multiplyScalar(rand() * L.d * 0.9)).add(new THREE.Vector3(0, 0.05 + rand() * 0.5, 0));
      nrm.set(hx, 0.9, hz).add(jit().multiplyScalar(0.6)).normalize();
      up.set(hx * 0.5, 1, hz * 0.5).normalize();
      card(leaf, pos, up, nrm, q ? 0.8 + rand() * 0.8 : 1.8 + rand() * 0.8, ['broad_b', 'sapling', 'kapok'][Math.floor(rand() * 3)], 0.7 + rand() * 0.3);
    }
  }
  const creeper = (a, y0, len) => {
    const step = q ? 0.32 : 0.9;
    let aa = a;
    for (let d = 0; d < len; d += step) {
      const y = y0 - d;
      if (y < 0.5) break;
      if (rand() < 0.2 + 0.5 * (d / len)) continue;
      aa += (rand() - 0.5) * 0.02;
      surf(aa, y, P);
      normalAt(aa, y, Nn);
      Nn.y *= 0.3;
      Nn.normalize();
      pos.copy(P).addScaledVector(Nn, 0.12 + rand() * 0.12);
      tan.set(-Math.sin(aa), 0, Math.cos(aa));
      up.copy(Nn).multiplyScalar(0.7).add(new THREE.Vector3(0, -0.6, 0)).addScaledVector(tan, (rand() - 0.5) * 0.8).normalize();
      nrm.copy(Nn).add(new THREE.Vector3(0, 0.25, 0)).normalize();
      card(leaf, pos, up, nrm, (q ? 0.32 + rand() * 0.3 : 0.9 + rand() * 0.4), CREEPER_CELLS[Math.floor(rand() * 2)], 0.7 + rand() * 0.3);
    }
  };
  const nCreep = q ? 50 : 10;
  for (let k = 0; k < nCreep; k++) creeper(rand() * Math.PI * 2, H * (TD - 0.02 - rand() * 0.05), 4 + rand() * 12);
  for (const L of ledges) {
    for (let k = 0; k < (q ? 4 : 1); k++) creeper(L.a + (rand() - 0.5) * L.w, L.y + 0.2, 2 + rand() * 6);
  }
  return finish(rock, leaf);
}

// --- Seinälohkare -------------------------------------------------------------------

export function makeCliffRock(seed, q = 1) {
  const rand = mulberry32(seed);
  const N1 = createNoise2D(seed + 1), N2 = createNoise2D(seed + 2), N3 = createNoise2D(seed + 3);
  const W = 2.8 + rand() * 1.8, Hs = 2.6 + rand() * 1.8, D = 1.1 + rand() * 0.7;
  const BACK = 0.95; // takaosa seinän sisällä
  const NU = q ? 16 : 6, NV = q ? 14 : 5;
  const at = (u, v, out) => {
    const x = (u - 0.5) * W * (1 + 0.12 * N1(v * 2 + 3, 0.5));
    const y = (v - 0.5) * Hs;
    const ex = 1 - Math.pow(Math.abs(2 * u - 1), 3.5), ey = 1 - Math.pow(Math.abs(2 * v - 1), 3.5);
    const bulge = Math.pow(Math.max(0, ex * ey), 0.55);
    const sv = (v * Hs) / 0.75 + N2(u * 2, v) * 0.6;
    const step = smoothstep(0.75, 0.95, sv - Math.floor(sv));
    const crack = 1 - Math.pow(Math.abs(Math.sin(u * W * 1.6 + N3(v * 1.5, u) * 2.5)), 0.3);
    const z = D * bulge + (0.18 * N1(u * 3.1, v * 2.7) - 0.16 * step - 0.12 * crack) * bulge - BACK;
    out.set(x, y, z);
    return crack;
  };
  const rock = new Part(), leaf = new Part();
  const P = new THREE.Vector3(), Nn = new THREE.Vector3();
  const du = 1 / NU, dv = 1 / NV;
  const grid = [];
  const uo = rand() * 4, vo = rand() * 4;
  for (let j = 0; j <= NV; j++) {
    const row = [];
    for (let i = 0; i <= NU; i++) {
      const u = i * du, v = j * dv;
      const crack = at(u, v, P);
      at(Math.min(1, u + du * 0.5), v, _a);
      at(Math.max(0, u - du * 0.5), v, _b);
      const tu = _a.clone().sub(_b);
      at(u, Math.min(1, v + dv * 0.5), _a);
      at(u, Math.max(0, v - dv * 0.5), _b);
      Nn.crossVectors(tu, _a.sub(_b)).normalize();
      const edge = Math.min(u, 1 - u, v, 1 - v);
      const [c, ao0] = rockShade(N2, N3, P.x + uo * 3, 0, P.y + vo * 9, Nn.y, 1 - crack, 0);
      const ao = ao0 * (0.6 + 0.4 * smoothstep(0, 0.18, edge));
      row.push(rock.vert(P, Nn, c, P.x / 2.5 + uo, P.y / 5 + vo, ao));
    }
    grid.push(row);
  }
  for (let j = 0; j < NV; j++) {
    for (let i = 0; i < NU; i++) {
      const a = grid[j][i], b = grid[j][i + 1], c = grid[j + 1][i + 1], d = grid[j + 1][i];
      rock.idx.push(a, b, c, a, c, d);
    }
  }
  // Kasvillisuus: sammalta ja saniaisia yläreunalla, köynnöksiä alas.
  const pos = new THREE.Vector3(), nrm = new THREE.Vector3(), up = new THREE.Vector3();
  const UPV = new THREE.Vector3(0, 1, 0);
  const normalUV = (u, v, out) => {
    at(Math.min(1, u + 0.02), v, _a);
    at(Math.max(0, u - 0.02), v, _b);
    const tu = _a.clone().sub(_b);
    at(u, Math.min(1, v + 0.02), _a);
    at(u, Math.max(0, v - 0.02), _b);
    return out.crossVectors(tu, _a.sub(_b)).normalize();
  };
  if (rand() < 0.8) {
    const n = q ? 4 + Math.floor(rand() * 5) : 2;
    for (let k = 0; k < n; k++) {
      const u = 0.15 + rand() * 0.7, v = 0.86 + rand() * 0.1;
      at(u, v, P);
      normalUV(u, v, Nn);
      pos.copy(P).addScaledVector(Nn, 0.08);
      nrm.copy(Nn).add(UPV).normalize();
      up.copy(UPV).multiplyScalar(0.6).addScaledVector(Nn, 0.6).add(new THREE.Vector3(rand() - 0.5, 0, 0)).normalize();
      card(leaf, pos, up, nrm, q ? 0.5 + rand() * 0.5 : 1.0 + rand() * 0.4, ['kapok', 'broad_b', 'sapling'][Math.floor(rand() * 3)], 0.8 + rand() * 0.2);
    }
  }
  if (q && rand() < 0.6) {
    const ns = 1 + Math.floor(rand() * 3);
    for (let s = 0; s < ns; s++) {
      let u = 0.2 + rand() * 0.6;
      const len = Hs * (0.4 + rand() * 0.6);
      for (let d = 0; d < len; d += 0.28) {
        if (rand() < 0.25) continue;
        const v = 0.93 - d / Hs;
        if (v < 0.05) break;
        u = Math.min(0.9, Math.max(0.1, u + (rand() - 0.5) * 0.03));
        at(u, v, P);
        normalUV(u, v, Nn);
        pos.copy(P).addScaledVector(Nn, 0.08);
        up.copy(Nn).multiplyScalar(0.6).add(new THREE.Vector3((rand() - 0.5) * 0.6, -0.7, 0)).normalize();
        nrm.copy(Nn).add(new THREE.Vector3(0, 0.25, 0)).normalize();
        card(leaf, pos, up, nrm, 0.28 + rand() * 0.18, CREEPER_CELLS[Math.floor(rand() * 2)], 0.75 + rand() * 0.25);
      }
    }
  }
  return finish(rock, leaf);
}
