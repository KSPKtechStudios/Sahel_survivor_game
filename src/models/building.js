// Rakennusosien mallit (vasaralla rakennettavat). Origo on osan pohjan
// keskellä; ruudukko-osat ovat 2 m leveitä. Seinät kulkevat x-akselin
// suuntaisesti (z = 0), katon matala reuna on -z-puolella.
import * as THREE from 'three';
import { mulberry32 } from '../noise.js';
import { V, displace, paint, limb, flatNormals, merge } from './util.js';
import { makeCampfireBase } from './items.js';

const PLANK = [0x8a6a44, 0x7a5c3a, 0x93734a, 0x806040];

function box(cx, cy, cz, sx, sy, sz, rotY = 0) {
  const g = new THREE.BoxGeometry(sx, sy, sz);
  g.rotateY(rotY);
  g.translate(cx, cy, cz);
  return g;
}

export function makeWorkbench() {
  const rand = mulberry32(301);
  const parts = [];
  // Pöytälevy lankuista
  for (let i = 0; i < 4; i++) {
    parts.push(paint(box(0, 0.86, -0.27 + i * 0.18, 1.6, 0.07, 0.17), PLANK[i % 4], { rand, jitter: 0.08 }));
  }
  // Jalat ja poikkituet
  for (const x of [-0.7, 0.7]) {
    for (const z of [-0.28, 0.28]) parts.push(paint(limb(V(x, 0, z), V(x * 0.98, 0.84, z * 0.95), 0.05, 0.045, 6, true), 0x5e4028, { rand }));
    parts.push(paint(box(x, 0.3, 0, 0.06, 0.06, 0.6), 0x5e4028, { rand }));
  }
  parts.push(paint(box(0, 0.3, 0, 1.4, 0.05, 0.05), 0x5e4028, { rand }));
  // Alahylly ja sen päällä halkoja
  parts.push(paint(box(0, 0.32, 0, 1.36, 0.04, 0.5), 0x7a5c3a, { rand }));
  for (let i = 0; i < 3; i++) {
    parts.push(paint(limb(V(-0.5, 0.39, -0.12 + i * 0.12), V(0.1, 0.39, -0.12 + i * 0.12), 0.05, 0.05, 6, true), 0x6e5238, { rand }));
  }
  // Kivialasin ja työkaluja pöydällä
  const anvil = new THREE.DodecahedronGeometry(0.16, 0);
  displace(anvil, () => [(rand() - 0.5) * 0.04, (rand() - 0.5) * 0.03, (rand() - 0.5) * 0.04]);
  anvil.scale(1.3, 0.6, 1);
  anvil.translate(0.48, 0.97, 0.02);
  parts.push(paint(flatNormals(anvil), 0x8a8178, { rand, jitter: 0.12 }));
  parts.push(paint(limb(V(-0.55, 0.92, -0.1), V(-0.2, 0.92, 0.05), 0.016, 0.016, 5, true), 0x6e5238, { rand }));
  parts.push(paint(box(-0.18, 0.93, 0.06, 0.12, 0.06, 0.06, 0.4), 0x7d776e, { rand }));
  parts.push(paint(box(0.05, 0.9, -0.18, 0.25, 0.02, 0.12, 0.2), 0x3b3836, { rand }));
  return merge(parts);
}

export function makeFloor() {
  const rand = mulberry32(302);
  const parts = [];
  const n = 8;
  for (let i = 0; i < n; i++) {
    const z = -1 + (i + 0.5) * (2 / n);
    parts.push(paint(box(0, 0.075, z, 2, 0.1, 2 / n - 0.012), PLANK[Math.floor(rand() * 4)], { rand, jitter: 0.08 }));
  }
  // Alla palkit ja kulmatolpat maahan
  for (const x of [-0.85, 0.85]) parts.push(paint(box(x, -0.04, 0, 0.14, 0.14, 2), 0x5e4028, { rand }));
  for (const x of [-0.9, 0.9]) {
    for (const z of [-0.9, 0.9]) parts.push(paint(box(x, -0.5, z, 0.16, 1.0, 0.16), 0x5e4028, { rand }));
  }
  return merge(parts);
}

export function makeWall() {
  const rand = mulberry32(303);
  const parts = [];
  const n = 9;
  for (let i = 0; i < n; i++) {
    const x = -1 + (i + 0.5) * (2 / n);
    const h = 2.0 + (rand() - 0.5) * 0.06;
    parts.push(paint(box(x, h / 2 - 0.05, 0, 2 / n - 0.01, h + 0.1, 0.12), PLANK[Math.floor(rand() * 4)], { rand, jitter: 0.08 }));
  }
  for (const y of [0.4, 1.6]) parts.push(paint(box(0, y, 0.09, 2.02, 0.12, 0.06), 0x5e4028, { rand }));
  for (const x of [-1, 1]) parts.push(paint(box(x, 1.0, 0, 0.14, 2.1, 0.16), 0x5e4028, { rand }));
  return merge(parts);
}

// Saviseinä: Sahelin tapaan muurattu savi, pinta käsin silitetty.
export function makeMudWall() {
  const rand = mulberry32(304);
  const g = new THREE.BoxGeometry(2.04, 2.08, 0.26, 8, 8, 1);
  displace(g, (x, y, z) => [0, 0, (Math.sin(x * 9 + y * 3) * 0.008 + (rand() - 0.5) * 0.012) * Math.sign(z)]);
  g.translate(0, 0.99, 0);
  const parts = [paint(flatNormals(g), 0xa8643a, { rand, jitter: 0.06, shade: (x, y) => (y < 0.15 ? 0.82 : 1) })];
  // Ulkonevat orret (tyypillisiä Sahelin savirakennuksille)
  for (const x of [-0.6, 0.6]) parts.push(paint(limb(V(x, 1.75, -0.35), V(x, 1.75, 0.35), 0.035, 0.035, 5, true), 0x5e4028, { rand }));
  return merge(parts);
}

export function makeDoorWall() {
  const rand = mulberry32(305);
  const parts = [];
  const n = 9;
  for (let i = 0; i < n; i++) {
    const x = -1 + (i + 0.5) * (2 / n);
    if (Math.abs(x) < 0.5) {
      // Oviaukon yläpuolella lyhyet laudat
      parts.push(paint(box(x, 1.85, 0, 2 / n - 0.01, 0.3, 0.12), PLANK[Math.floor(rand() * 4)], { rand }));
      continue;
    }
    parts.push(paint(box(x, 0.975, 0, 2 / n - 0.01, 2.05, 0.12), PLANK[Math.floor(rand() * 4)], { rand, jitter: 0.08 }));
  }
  parts.push(paint(box(0, 1.68, 0.09, 1.2, 0.12, 0.08), 0x5e4028, { rand }));
  for (const x of [-0.52, 0.52]) parts.push(paint(box(x, 0.9, 0.06, 0.1, 1.8, 0.1), 0x5e4028, { rand }));
  for (const x of [-1, 1]) parts.push(paint(box(x, 1.0, 0, 0.14, 2.1, 0.16), 0x5e4028, { rand }));
  return merge(parts);
}

// Olkikatto: kalteva ruoko-olkikerros (matala reuna -z, korkea +z) ja orret.
export function makeRoof() {
  const rand = mulberry32(306);
  const parts = [];
  const rise = 1.15;
  const slope = Math.atan2(rise, 2);
  const len = Math.hypot(2.4, rise * 1.2);
  const g = new THREE.BoxGeometry(2.3, 0.16, len, 6, 1, 8);
  displace(g, (x, y, z) => [(rand() - 0.5) * 0.03, (y > 0 ? 1 : 0) * (Math.sin(z * 14) * 0.02 + (rand() - 0.5) * 0.04), 0]);
  g.rotateX(-slope);
  g.translate(0, rise / 2 + 0.08, 0);
  parts.push(paint(flatNormals(g), 0xc8a85e, { rand, jitter: 0.14, shade: (x, y) => 0.85 + y * 0.15 }));
  for (const x of [-0.95, 0, 0.95]) {
    parts.push(paint(limb(V(x, -0.02, -1.2), V(x, rise + 0.08, 1.05), 0.05, 0.05, 5, true), 0x5e4028, { rand }));
  }
  return merge(parts);
}

export function makeFence() {
  const rand = mulberry32(307);
  const parts = [];
  for (const x of [-1, 0, 1]) parts.push(paint(limb(V(x, -0.2, 0), V(x, 1.15, 0), 0.05, 0.04, 6, true), 0x6e5238, { rand }));
  for (const y of [0.35, 0.8]) parts.push(paint(limb(V(-1.05, y, 0.03), V(1.05, y + (rand() - 0.5) * 0.06, 0.03), 0.03, 0.03, 5, true), 0x7a5a3a, { rand }));
  // Punotut oksat alaosassa
  for (let i = 0; i < 11; i++) {
    const x = -0.95 + i * 0.19;
    parts.push(paint(limb(V(x, -0.05, (i % 2 ? 0.04 : -0.04)), V(x + 0.05, 0.85, (i % 2 ? -0.03 : 0.03)), 0.014, 0.01, 4), 0x8a6a48, { rand }));
  }
  return merge(parts);
}

export function makePole() {
  const rand = mulberry32(308);
  return merge([paint(limb(V(0, -0.3, 0), V(0, 2.1, 0), 0.11, 0.1, 8, true), 0x6e5238, { rand, jitter: 0.08 })]);
}

export function makeTorchStand() {
  const rand = mulberry32(309);
  const parts = [paint(limb(V(0, -0.2, 0), V(0.02, 1.55, 0), 0.04, 0.03, 6, true), 0x6e5238, { rand })];
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    parts.push(paint(limb(V(Math.cos(a) * 0.3, 0, Math.sin(a) * 0.3), V(0, 0.55, 0), 0.025, 0.02, 4, true), 0x6e5238, { rand }));
  }
  const head = new THREE.CylinderGeometry(0.07, 0.05, 0.2, 8);
  head.translate(0.02, 1.6, 0);
  parts.push(paint(head, 0x4a3420, { rand, jitter: 0.15 }));
  const band = new THREE.CylinderGeometry(0.075, 0.075, 0.04, 8);
  band.translate(0.02, 1.55, 0);
  parts.push(paint(band, 0xb39a68, { rand }));
  return merge(parts);
}

export function makeBed() {
  const rand = mulberry32(310);
  const parts = [];
  // Ruokomatto
  const n = 14;
  for (let i = 0; i < n; i++) {
    const z = -0.45 + (i + 0.5) * (0.9 / n);
    parts.push(paint(box(0, 0.03, z, 2.0, 0.05, 0.9 / n - 0.004), i % 2 ? 0xc8b070 : 0xb8a060, { rand, jitter: 0.06 }));
  }
  // Talja ja päänalunen
  const pelt = new THREE.BoxGeometry(1.3, 0.04, 0.75, 4, 1, 3);
  displace(pelt, () => [(rand() - 0.5) * 0.05, (rand() - 0.5) * 0.02, (rand() - 0.5) * 0.05]);
  pelt.translate(0.2, 0.08, 0);
  parts.push(paint(pelt, 0x8a6a48, { rand, jitter: 0.15 }));
  const pillow = new THREE.CylinderGeometry(0.11, 0.11, 0.6, 8);
  pillow.rotateX(Math.PI / 2);
  pillow.translate(-0.78, 0.14, 0);
  parts.push(paint(pillow, 0xd8c8a0, { rand, jitter: 0.08 }));
  return merge(parts);
}

export function createBuildModels() {
  return {
    workbench: makeWorkbench(),
    campfire: makeCampfireBase(3),
    floor: makeFloor(),
    wall: makeWall(),
    mud_wall: makeMudWall(),
    door_wall: makeDoorWall(),
    roof: makeRoof(),
    fence: makeFence(),
    pole: makePole(),
    torch_stand: makeTorchStand(),
    bed: makeBed(),
  };
}
