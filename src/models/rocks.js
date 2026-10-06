// Kivet, lohkareet, termiittikeot ja maassa makaavat risut.
import * as THREE from 'three';
import { mulberry32 } from '../noise.js';
import { V, partRand, displace, paint, limb, flatNormals, merge } from './util.js';

export function makeGroundStick(seed) {
  const rand = mulberry32(seed);
  const len = 0.7 + rand() * 0.4;
  const a = V(-len / 2, 0.035, 0);
  const b = V(len / 2, 0.03, (rand() - 0.5) * 0.15);
  const parts = [paint(limb(a, b, 0.032, 0.022, 5, true), 0x6e5238, { rand })];
  const m = a.clone().lerp(b, 0.4 + rand() * 0.3);
  parts.push(paint(limb(m, V(m.x + 0.18, 0.04, m.z + (rand() < 0.5 ? 0.2 : -0.2)), 0.016, 0.008, 3), 0x6e5238, { rand }));
  return merge(parts);
}

export function makeStone(seed) {
  const rand = mulberry32(seed);
  let g = new THREE.DodecahedronGeometry(0.17, 0);
  displace(g, () => [(rand() - 0.5) * 0.06, (rand() - 0.5) * 0.05, (rand() - 0.5) * 0.06]);
  g.scale(1.1, 0.7, 0.95);
  g.translate(0, 0.07, 0);
  g = flatNormals(g);
  const col = [0x8a8178, 0x8f5a3e, 0x6f6a64][seed % 3];
  return merge([paint(g, col, { rand, jitter: 0.12 })]);
}

// Iso lohkare (louhitaan hakulla). q = 0 kaukainen, 1 tavallinen.
export function makeBoulder(seed, q = 1) {
  const jr = partRand(seed, 1);
  let g = new THREE.IcosahedronGeometry(1, q ? 1 : 0);
  displace(g, (x, y, z) => {
    // Sama muoto molemmilla tarkkuuksilla: siirtymä riippuu suunnasta.
    const h = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719 + seed) * 43758.5453;
    const kk = 0.78 + (h - Math.floor(h)) * 0.38;
    return [x * (kk - 1), y * (kk - 1), z * (kk - 1)];
  });
  g.scale(1.25, 0.75, 1.05);
  g.translate(0, 0.35, 0);
  g = flatNormals(g);
  const col = [0x7d4a33, 0x8c847a, 0x6e4a3a][seed % 3];
  return merge([paint(g, col, { rand: jr, jitter: 0.1, shade: (x, y) => (y > 0.6 ? 1.12 : 0.92) })]);
}

export function makeTermiteMound(seed, q = 1) {
  const rand = mulberry32(seed);
  const parts = [];
  const col = 0x9a5a36;
  const spires = 1 + Math.floor(rand() * 3);
  for (let s = 0; s < spires; s++) {
    const H = s === 0 ? 2.2 + rand() * 0.9 : 1.0 + rand() * 0.9;
    const R = s === 0 ? 0.85 : 0.45 + rand() * 0.2;
    const ox = s === 0 ? 0 : (rand() - 0.5) * 1.2;
    const oz = s === 0 ? 0 : (rand() - 0.5) * 1.2;
    const prof = [[R, -0.3], [R * 0.95, 0.2], [R * 0.7, H * 0.4], [R * 0.45, H * 0.75], [R * 0.2, H * 0.95], [0.02, H]]
      .map(([r, y]) => new THREE.Vector2(r, y));
    const g = new THREE.LatheGeometry(prof, q ? 9 : 5);
    const jr = partRand(seed, s + 1);
    displace(g, (x, y, z) => {
      const kk = 1 + (jr() - 0.5) * 0.3;
      return [x * (kk - 1), (jr() - 0.5) * 0.08, z * (kk - 1)];
    });
    g.translate(ox, 0, oz);
    parts.push(paint(flatNormals(g), col, { rand: jr, jitter: 0.1, shade: (x, y) => 0.85 + Math.min(0.25, y * 0.1) }));
  }
  return merge(parts);
}

// Tuulen kuluttama kalliomuodostelma (aavikko, vuoristo).
export function makeOutcrop(seed, q = 1) {
  const rand = mulberry32(seed);
  const parts = [];
  const col = [0xb07a52, 0x9a6a4a, 0xc49064][seed % 3];
  const n = 2 + Math.floor(rand() * 3);
  for (let i = 0; i < n; i++) {
    const w = 1.2 + rand() * 1.4;
    const h = 1.5 + rand() * 3;
    let g = new THREE.CylinderGeometry(w * (0.6 + rand() * 0.3), w, h, q ? 7 : 5, q ? 3 : 1);
    const jr = partRand(seed, i + 3);
    displace(g, (x, y, z) => {
      const kk = 0.85 + jr() * 0.3;
      // Kerroksellinen eroosio: kapeampi keskeltä
      const waist = 1 - Math.exp(-Math.pow((y / h) * 2.2, 2)) * 0.15;
      return [x * (kk * waist - 1), (jr() - 0.5) * 0.15, z * (kk * waist - 1)];
    });
    g.translate((rand() - 0.5) * 2, h / 2 - 0.3, (rand() - 0.5) * 2);
    g.rotateY(rand() * Math.PI);
    parts.push(paint(flatNormals(g), col, { rand: jr, jitter: 0.08, shade: (x, y) => 0.85 + ((Math.floor(y * 1.5) % 2) ? 0.1 : 0) }));
  }
  return merge(parts);
}

// Hiekkakivitorni (vuoristo), kuin Hombori-vuorten pylväät.
export function makeSpire(seed, q = 1) {
  const rand = mulberry32(seed);
  const parts = [];
  const H = 7 + rand() * 9;
  const R = 1.3 + rand() * 0.8;
  const prof = [[R * 1.25, -0.5], [R * 1.1, H * 0.15], [R * 0.95, H * 0.4], [R, H * 0.6], [R * 0.85, H * 0.85], [R * 0.95, H * 0.95], [R * 0.5, H]]
    .map(([r, y]) => new THREE.Vector2(r, y));
  const g = new THREE.LatheGeometry(prof, q ? 8 : 5);
  const jr = partRand(seed, 2);
  displace(g, (x, y, z) => {
    const kk = 0.85 + jr() * 0.3;
    return [x * (kk - 1), (jr() - 0.5) * 0.2, z * (kk - 1)];
  });
  const bands = [0xa86a48, 0x8e5a40, 0xc08a62, 0x7a5a4a];
  parts.push(paint(flatNormals(g), 0xffffff, { rand: jr, jitter: 0.06 }));
  // Värivyöhykkeet korkeuden mukaan
  const geo = parts[0];
  const pos = geo.attributes.position;
  const colAttr = geo.attributes.color;
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i += 3) {
    const y = (pos.getY(i) + pos.getY(i + 1) + pos.getY(i + 2)) / 3;
    const bi = Math.floor(y / 1.6);
    c.set(bands[((bi % bands.length) + bands.length) % bands.length]);
    const j = 0.92 + jr() * 0.16;
    for (let kk = 0; kk < 3; kk++) colAttr.setXYZ(i + kk, c.r * j, c.g * j, c.b * j);
  }
  return merge(parts);
}
