// Sessio 23: skannattujen mallien materiaalit (oma väri- ja normaalikartta).
// Sama materiaali jaetaan kaikille saman tekstuurin malleille.
import * as THREE from 'three';
import { addWet } from './materials.js';

const loader = new THREE.TextureLoader();
const cache = {};

export function scannedMaterial(tex, { dir = 'assets/models/rocks', roughness = 0.9, wet = [0.8, 0.6] } = {}) {
  if (cache[tex]) return cache[tex];
  const map = loader.load(`${dir}/${tex}_diff.jpg`);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 16; // sessio 40 (three rajaa maksimiin)
  const normalMap = loader.load(`${dir}/${tex}_nrm.jpg`);
  const m = new THREE.MeshStandardMaterial({ map, normalMap, roughness, metalness: 0 });
  addWet(m, wet[0], wet[1]);
  cache[tex] = m;
  return m;
}
