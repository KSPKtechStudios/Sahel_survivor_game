// Sessio 24: Quaternius-kitin mallien (natureKit.js, base64) purku
// BufferGeometryksi. Jokainen materiaali on oma ryhmänsä (geometry.groups);
// world.js valitsee materiaalit userData.kit-listan mukaan
// (render/kitMaterials.js). Vertex-värit = tekstuurin keskiväri × varjostus,
// jotta sirpaleet ja muut värejä käyttävät järjestelmät toimivat.
import * as THREE from 'three';
import { KIT as NATURE } from './natureKit.js';
import { TROPICAL } from './tropicalKit.js';

// Sessio 48: Poly Havenin trooppiset aluskasvit samaan kirjastoon.
const KIT = { ...NATURE, ...TROPICAL };

// Tekstuurien keskivärit (lineaarinen RGB), kun malli hajoaa sirpaleiksi.
const AVG = {
  leaves: [0.18, 0.3, 0.06],
  flowers: [0.6, 0.3, 0.2],
  mushrooms: [0.45, 0.3, 0.18],
  rocks: [0.1, 0.12, 0.07],
  deadbark: [0.2, 0.19, 0.17],
  // Sessio 48 (Poly Haven)
  calathea: [0.08, 0.16, 0.05],
  fern2: [0.09, 0.17, 0.04],
};

function decode(b64, Type) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Type(bytes.buffer);
}

function build(groups, indexed) {
  const parts = groups.map((g) => ({
    m: g.m,
    pos: decode(g.pos, Float32Array),
    nrm: decode(g.nrm, Int8Array),
    uv: decode(g.uv, Float32Array),
    ao: decode(g.ao, Uint8Array),
    idx: decode(g.idx, Uint16Array),
  }));
  const nV = parts.reduce((a, p) => a + p.pos.length / 3, 0);
  const nI = parts.reduce((a, p) => a + p.idx.length, 0);
  const pos = new Float32Array(nV * 3), nrm = new Float32Array(nV * 3), uv = new Float32Array(nV * 2);
  const ao = new Float32Array(nV), col = new Float32Array(nV * 3);
  const idx = new Uint32Array(nI);
  const g = new THREE.BufferGeometry();
  let vo = 0, io = 0;
  parts.forEach((p, gi) => {
    const n = p.pos.length / 3;
    pos.set(p.pos, vo * 3);
    uv.set(p.uv, vo * 2);
    const avg = AVG[p.m] || [0.5, 0.5, 0.5];
    for (let v = 0; v < n; v++) {
      for (let c = 0; c < 3; c++) nrm[(vo + v) * 3 + c] = p.nrm[v * 3 + c] / 127;
      // Kitin vertex-väri on varjostus (tyvi tumma): pehmennetään hieman.
      const a = 0.3 + 0.7 * (p.ao[v] / 255);
      ao[vo + v] = a;
      for (let c = 0; c < 3; c++) col[(vo + v) * 3 + c] = avg[c] * a;
    }
    for (let k = 0; k < p.idx.length; k++) idx[io + k] = p.idx[k] + vo;
    g.addGroup(io, p.idx.length, gi);
    vo += n;
    io += p.idx.length;
  });
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setAttribute('aAO', new THREE.BufferAttribute(ao, 1));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  // Muu koodi (sirpaleet, säröily) olettaa kolmiot ilman indeksiä; pelkät
  // koristeet saavat pitää indeksin (vähemmän kärkipisteitä piirrettäväksi).
  const out = indexed ? g : g.toNonIndexed();
  out.computeBoundingBox();
  out.computeBoundingSphere();
  out.userData.kit = parts.map((p) => p.m);
  out.userData.keepUv = true;
  return out;
}

const cache = {};
// q = 0 kaukomalli (jos on), muuten lähimalli.
export function kitModel(name, q = 1, indexed = false) {
  const d = KIT[name];
  const far = !q && d.far;
  const key = `${name}:${far ? 0 : 1}:${indexed ? 1 : 0}`;
  if (!cache[key]) cache[key] = build(far ? d.far : d.near, indexed);
  return cache[key];
}

export const KIT_NAMES = Object.keys(KIT);
