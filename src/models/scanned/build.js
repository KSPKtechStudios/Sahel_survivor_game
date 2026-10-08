// Sessio 23: skannattujen mallien (base64-upotettu geometria) purku
// BufferGeometryksi. Malli piirretään omalla tekstuurillaan (userData.tex,
// render/scannedMaterials.js); vertex-värit (tekstuurista näytteistetyt) ovat
// mukana sirpaleita ja muita värejä käyttäviä järjestelmiä varten.
import * as THREE from 'three';
import { BOULDERS } from './boulders.js';

function decode(b64, Type) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Type(bytes.buffer);
}

function build(d, tex) {
  let g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(decode(d.pos, Float32Array), 3));
  g.setAttribute('normal', new THREE.BufferAttribute(decode(d.nrm, Float32Array), 3));
  g.setAttribute('uv', new THREE.BufferAttribute(decode(d.uv, Float32Array), 2));
  g.setAttribute('color', new THREE.BufferAttribute(decode(d.col, Float32Array), 3));
  g.setIndex(new THREE.BufferAttribute(decode(d.idx, Uint16Array), 1));
  // Muu koodi (sirpaleet, säröily) olettaa kolmiot ilman indeksiä.
  g = g.toNonIndexed();
  g.computeBoundingBox();
  g.computeBoundingSphere();
  g.userData.tex = tex;
  return g;
}

export const SCANNED_BOULDER_COUNT = BOULDERS.length;
const cache = {};
// i = muunnelma, q = 0 kaukomalli, muuten lähimalli.
export function scannedBoulder(i, q = 1) {
  const key = `${i}:${q ? 1 : 0}`;
  if (!cache[key]) cache[key] = build(q ? BOULDERS[i].near : BOULDERS[i].far, BOULDERS[i].tex);
  return cache[key];
}
