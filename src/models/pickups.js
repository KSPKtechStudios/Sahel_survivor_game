// Sessio 9: maasta poimittavien asioiden mallit (piikivet, simpukat, sulat,
// hedelmät, sienet, marjapensaat, yrtit, ruoko, fonio, savi).
import * as THREE from 'three';
import { mulberry32 } from '../noise.js';
import { V, displace, paint, limb, flatNormals, merge } from './util.js';
import { itemFlint, itemShell, itemFeather, itemCoconut, itemBaobabFruit, itemNuts, itemMushroom } from './items2.js';

// Esineen kopioita satunnaisesti maahan (pieni kasa).
function scatter(seed, make, n, scale, spread, lie = false) {
  const rand = mulberry32(seed);
  const parts = [];
  for (let i = 0; i < n; i++) {
    const g = make(i).clone();
    if (lie) g.rotateZ(Math.PI / 2 * (0.85 + rand() * 0.3));
    g.scale(scale, scale, scale);
    g.rotateY(rand() * Math.PI * 2);
    const a = rand() * Math.PI * 2, r = i === 0 ? 0 : spread * (0.5 + rand() * 0.5);
    g.translate(Math.cos(a) * r, lie ? 0.03 : 0, Math.sin(a) * r);
    parts.push(g);
  }
  return merge(parts);
}

export const makeFlintGround = (seed) => scatter(seed, () => itemFlint(), 1 + (seed % 3), 1.7, 0.18);
export const makeShellGround = (seed) => scatter(seed, () => itemShell(), 1 + (seed % 2), 1.9, 0.15);
export const makeFeatherGround = (seed) => scatter(seed, (i) => itemFeather(63 + i + seed), 1, 1.8, 0, true);
export const makeCoconutGround = (seed) => scatter(seed, () => itemCoconut(), 1 + (seed % 2), 1.25, 0.25);
export const makeBaobabFruitGround = (seed) => scatter(seed, () => itemBaobabFruit(), 1 + (seed % 2), 1.4, 0.25, true);
export const makeSheaNutsGround = (seed) => scatter(seed, () => itemNuts(0x8a5a30, 84), 2, 1.7, 0.12);

const MUSH = { brown: 'brown', pale: 'pale', red: 'red', termite: 'termite' };
export function makeMushPatch(kind, seed) {
  const rand = mulberry32(seed);
  const n = 2 + Math.floor(rand() * 3);
  const parts = [];
  for (let i = 0; i < n; i++) {
    const g = itemMushroom(MUSH[kind]).clone();
    const s = (kind === 'termite' ? 1.6 : 1.4) * (0.7 + rand() * 0.6);
    g.scale(s, s, s);
    g.rotateY(rand() * Math.PI * 2);
    if (rand() < 0.3) g.rotateX((rand() - 0.5) * 0.4);
    const a = rand() * Math.PI * 2, r = i === 0 ? 0 : 0.08 + rand() * 0.16;
    g.translate(Math.cos(a) * r, 0, Math.sin(a) * r);
    parts.push(g);
  }
  return merge(parts);
}

// Jujubapensas: okaisia oksia, pieniä lehtiä ja punaruskeita marjoja.
export function makeJujubeBush(seed) {
  const rand = mulberry32(seed);
  const parts = [];
  const n = 7 + Math.floor(rand() * 4);
  for (let i = 0; i < n; i++) {
    const a = rand() * Math.PI * 2;
    const tip = V(Math.cos(a) * (0.3 + rand() * 0.35), 0.5 + rand() * 0.45, Math.sin(a) * (0.3 + rand() * 0.35));
    parts.push(paint(limb(V(0, -0.05, 0), tip, 0.025, 0.01, 4), 0x6a5038, { rand }));
    for (let l = 0; l < 3; l++) {
      const p = V(0, 0, 0).lerp(tip, 0.45 + l * 0.22);
      const leaf = new THREE.IcosahedronGeometry(0.1 + rand() * 0.05, 0);
      leaf.scale(1.2, 0.5, 1);
      leaf.translate(p.x + (rand() - 0.5) * 0.1, p.y, p.z + (rand() - 0.5) * 0.1);
      parts.push(paint(flatNormals(leaf), rand() < 0.5 ? 0x5a7a32 : 0x6a8a3a, { rand, jitter: 0.12 }));
      if (rand() < 0.75) {
        const b = new THREE.SphereGeometry(0.026, 6, 4);
        b.translate(p.x + (rand() - 0.5) * 0.16, p.y - 0.05, p.z + (rand() - 0.5) * 0.16);
        parts.push(paint(b, rand() < 0.5 ? 0x9a3a1c : 0xb8662a, { rand }));
      }
    }
  }
  return merge(parts);
}

// Moringa: hento taimi, ohuet oksat ja höyhenmäiset lehdet.
export function makeMoringa(seed) {
  const rand = mulberry32(seed);
  const parts = [];
  const H = 1.0 + rand() * 0.5;
  const top = V((rand() - 0.5) * 0.1, H, (rand() - 0.5) * 0.1);
  parts.push(paint(limb(V(0, -0.05, 0), top, 0.03, 0.015, 5), 0x8a7a60, { rand }));
  for (let i = 0; i < 6; i++) {
    const p = V(0, 0, 0).lerp(top, 0.45 + i * 0.09);
    const a = rand() * Math.PI * 2;
    const tip = V(p.x + Math.cos(a) * 0.35, p.y + 0.12, p.z + Math.sin(a) * 0.35);
    parts.push(paint(limb(p, tip, 0.008, 0.004, 3), 0x7a8a50, { rand }));
    for (let k = 1; k <= 5; k++) {
      const q = p.clone().lerp(tip, k / 5.5);
      const leaf = new THREE.SphereGeometry(0.028, 5, 3);
      leaf.scale(1.4, 0.35, 0.9);
      leaf.rotateY(a);
      leaf.translate(q.x, q.y, q.z);
      parts.push(paint(leaf, rand() < 0.5 ? 0x5f8a2e : 0x4f7a26, { rand }));
    }
  }
  return merge(parts);
}

// Hibiskus (bissap): pensas, jossa punaiset kukat ja verhiöt.
export function makeHibiscus(seed) {
  const rand = mulberry32(seed);
  const parts = [];
  const n = 6 + Math.floor(rand() * 3);
  for (let i = 0; i < n; i++) {
    const a = rand() * Math.PI * 2;
    const tip = V(Math.cos(a) * (0.2 + rand() * 0.25), 0.45 + rand() * 0.35, Math.sin(a) * (0.2 + rand() * 0.25));
    parts.push(paint(limb(V(0, -0.03, 0), tip, 0.018, 0.008, 4), 0x6a3a2a, { rand }));
    const leaf = new THREE.IcosahedronGeometry(0.11, 0);
    leaf.scale(1.1, 0.45, 1);
    leaf.translate(tip.x * 0.8, tip.y * 0.8, tip.z * 0.8);
    parts.push(paint(flatNormals(leaf), 0x3f6a2a, { rand, jitter: 0.12 }));
    const fl = new THREE.OctahedronGeometry(0.045, 0);
    fl.scale(1, 1.3, 1);
    fl.translate(tip.x, tip.y + 0.03, tip.z);
    parts.push(paint(flatNormals(fl), rand() < 0.6 ? 0xa8142a : 0xd83050, { rand, jitter: 0.1 }));
  }
  return merge(parts);
}

// Ruokotupas vesirajassa: korkeat varret ja tummat tähkät.
export function makeReedClump(seed) {
  const rand = mulberry32(seed);
  const parts = [];
  const n = 10 + Math.floor(rand() * 6);
  for (let i = 0; i < n; i++) {
    const a = rand() * Math.PI * 2, r = rand() * 0.25;
    const b = V(Math.cos(a) * r, -0.1, Math.sin(a) * r);
    const h = 1.2 + rand() * 0.8;
    const t = V(b.x + Math.cos(a) * 0.15, h, b.z + Math.sin(a) * 0.15);
    parts.push(paint(limb(b, t, 0.012, 0.006, 3), rand() < 0.5 ? 0x8a9a50 : 0x9aa860, { rand }));
    if (rand() < 0.5) {
      const head = new THREE.CylinderGeometry(0.02, 0.018, 0.16, 5);
      head.translate(t.x, t.y - 0.1, t.z);
      parts.push(paint(head, 0x5a4028, { rand }));
    }
  }
  return merge(parts);
}

// Villifonio: matala heinätupas, jossa kultaiset tähkät.
export function makeFonio(seed) {
  const rand = mulberry32(seed);
  const parts = [];
  const n = 14 + Math.floor(rand() * 6);
  for (let i = 0; i < n; i++) {
    const a = rand() * Math.PI * 2, r = rand() * 0.12;
    const b = V(Math.cos(a) * r, 0, Math.sin(a) * r);
    const t = V(b.x + Math.cos(a) * (0.12 + rand() * 0.15), 0.45 + rand() * 0.3, b.z + Math.sin(a) * (0.12 + rand() * 0.15));
    parts.push(paint(limb(b, t, 0.006, 0.003, 3), 0x9a9a50, { rand }));
    const head = new THREE.SphereGeometry(0.014, 4, 3);
    head.scale(0.8, 3.2, 0.8);
    head.translate(t.x, t.y + 0.03, t.z);
    parts.push(paint(head, 0xe0c060, { rand }));
  }
  return merge(parts);
}

// Savikokkare: märkä, punaruskea kasa joen tai lammen rannassa.
export function makeClayLump(seed) {
  const rand = mulberry32(seed);
  const parts = [];
  for (let i = 0; i < 3; i++) {
    const g = new THREE.IcosahedronGeometry(0.18 + rand() * 0.1, 1);
    displace(g, () => [(rand() - 0.5) * 0.06, (rand() - 0.5) * 0.04, (rand() - 0.5) * 0.06]);
    g.scale(1.3, 0.45, 1.1);
    const a = rand() * Math.PI * 2, r = i ? 0.2 + rand() * 0.15 : 0;
    g.translate(Math.cos(a) * r, 0.03, Math.sin(a) * r);
    parts.push(paint(flatNormals(g), i % 2 ? 0x8e4a2a : 0xa5532e, { rand, jitter: 0.08, shade: (x, y) => (y > 0.08 ? 1.12 : 0.9) }));
  }
  return merge(parts);
}
