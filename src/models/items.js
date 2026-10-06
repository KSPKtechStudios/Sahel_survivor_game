// Esinemallit (kädessä, maassa ja kuvakkeissa). Kahva origossa, esine +Y-suuntaan.
import * as THREE from 'three';
import { mulberry32 } from '../noise.js';
import { V, displace, paint, limb, flatNormals, merge, prep } from './util.js';
import { makeStone } from './rocks.js';

// Nuotion runko (kivikehä + tukit). Liekit lisätään erikseen.
export function makeCampfireBase(seed = 3) {
  const rand = mulberry32(seed);
  const parts = [];
  const ns = 9;
  for (let i = 0; i < ns; i++) {
    const a = (i / ns) * Math.PI * 2;
    let s = new THREE.DodecahedronGeometry(0.13, 0);
    displace(s, () => [(rand() - 0.5) * 0.05, (rand() - 0.5) * 0.04, (rand() - 0.5) * 0.05]);
    s.scale(1.2, 0.8, 1);
    s.rotateY(a);
    s.translate(Math.cos(a) * 0.48, 0.06, Math.sin(a) * 0.48);
    parts.push(paint(flatNormals(s), rand() < 0.5 ? 0x7a746c : 0x8f5a3e, { rand }));
  }
  const nl = 5;
  for (let i = 0; i < nl; i++) {
    const a = (i / nl) * Math.PI * 2 + 0.3;
    parts.push(paint(limb(V(Math.cos(a) * 0.4, 0.02, Math.sin(a) * 0.4), V(Math.cos(a) * 0.05, 0.45, Math.sin(a) * 0.05), 0.05, 0.035, 5), 0x5a4030, { rand }));
  }
  const ash = new THREE.CylinderGeometry(0.3, 0.34, 0.04, 10);
  ash.translate(0, 0.01, 0);
  parts.push(paint(ash, 0x2e2925, { rand, jitter: 0.2 }));
  return merge(parts);
}

function itemStick() {
  const rand = mulberry32(5);
  return merge([
    paint(limb(V(0, -0.12, 0), V(0.01, 0.5, 0.01), 0.022, 0.016, 6, true), 0x6e5238, { rand }),
    paint(limb(V(0.005, 0.25, 0), V(0.09, 0.4, 0.02), 0.01, 0.006, 4), 0x6e5238, { rand }),
  ]);
}

function itemStone() {
  const g = makeStone(4).clone();
  g.translate(0, -0.05, 0);
  return g;
}

function itemFiber() {
  const rand = mulberry32(9);
  const parts = [];
  for (let i = 0; i < 14; i++) {
    const a = rand() * Math.PI * 2;
    const r = rand() * 0.03;
    const b = V(Math.cos(a) * r, -0.05, Math.sin(a) * r);
    const t = V(Math.cos(a) * (0.05 + rand() * 0.06), 0.3 + rand() * 0.12, Math.sin(a) * (0.05 + rand() * 0.06));
    parts.push(paint(limb(b, t, 0.006, 0.003, 3), rand() < 0.5 ? 0xd2bd84 : 0xb9a36a, { rand }));
  }
  const band = new THREE.CylinderGeometry(0.038, 0.038, 0.03, 8);
  band.translate(0, 0.06, 0);
  parts.push(paint(band, 0x8a6a40, { rand }));
  return merge(parts);
}

function itemWood() {
  const rand = mulberry32(11);
  let g = new THREE.CylinderGeometry(0.085, 0.09, 0.42, 9);
  g.translate(0, 0.12, 0);
  g = prep(g);
  // Kyljet kaarnan värisiksi, päädyt vaaleiksi.
  const pos = g.attributes.position;
  const nrm = g.attributes.normal;
  const colors = new Float32Array(pos.count * 3);
  const barkC = new THREE.Color(0x5b4838);
  const endC = new THREE.Color(0xc9a679);
  for (let i = 0; i < pos.count; i++) {
    const c = Math.abs(nrm.getY(i)) > 0.9 ? endC : barkC;
    const j = 0.9 + rand() * 0.2;
    colors.set([c.r * j, c.g * j, c.b * j], i * 3);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  return merge([g]);
}

function lashing(y, r) {
  const g = new THREE.CylinderGeometry(r, r, 0.05, 8);
  g.translate(0, y, 0);
  return paint(g, 0xb39a68, { jitter: 0.15 });
}

function itemStoneAxe() {
  const rand = mulberry32(13);
  const parts = [paint(limb(V(0, -0.15, 0), V(0, 0.5, 0), 0.02, 0.018, 6, true), 0x7a5a3a, { rand })];
  let head = new THREE.DodecahedronGeometry(0.1, 0);
  displace(head, () => [(rand() - 0.5) * 0.02, (rand() - 0.5) * 0.02, (rand() - 0.5) * 0.02]);
  head.scale(1.5, 0.95, 0.42);
  head.translate(0.09, 0.44, 0);
  parts.push(paint(flatNormals(head), 0x7d776e, { rand, jitter: 0.1 }));
  parts.push(lashing(0.44, 0.028));
  return merge(parts);
}

function itemStonePick() {
  const rand = mulberry32(17);
  const parts = [paint(limb(V(0, -0.15, 0), V(0, 0.5, 0), 0.02, 0.018, 6, true), 0x7a5a3a, { rand })];
  let head = new THREE.DodecahedronGeometry(0.08, 0);
  displace(head, () => [(rand() - 0.5) * 0.02, (rand() - 0.5) * 0.02, (rand() - 0.5) * 0.02]);
  head.scale(2.6, 0.7, 0.6);
  head.translate(0.0, 0.45, 0);
  parts.push(paint(flatNormals(head), 0x8f5a3e, { rand, jitter: 0.1 }));
  parts.push(lashing(0.45, 0.027));
  return merge(parts);
}

function itemCampfire() {
  const g = makeCampfireBase(7).clone();
  g.scale(0.45, 0.45, 0.45);
  return g;
}

export function createItemModels() {
  return {
    stick: itemStick(),
    stone: itemStone(),
    fiber: itemFiber(),
    wood: itemWood(),
    stone_axe: itemStoneAxe(),
    stone_pick: itemStonePick(),
    campfire: itemCampfire(),
  };
}
