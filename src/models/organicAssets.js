// Sessio 58: valmiiksi lasketut juurakko- ja runkomallit
// (assets/models/organic.bin, tehty työkalulla tools/organic/build.mjs).
// Jos tiedosto ei lataudu, models.js laskee mallit käynnistyksessä
// karkeammalla ruudukolla (organic.js).
import * as THREE from 'three';

// [malli, muunnelmien määrä, ensimmäinen siemen] (sama kuin models.js:n VARIANTS).
export const ORGANIC_MODELS = [
  ['ancientRoots', 3, 781],
  ['mossyLog', 3, 191],
];

const URL_BIN = 'assets/models/organic.bin';
const cache = new Map(); // 'malli:muunnelma:lod' -> BufferGeometry

export async function loadOrganicAssets() {
  try {
    const res = await fetch(URL_BIN);
    if (!res.ok) throw new Error(res.status);
    const buf = await res.arrayBuffer();
    const dv = new DataView(buf);
    if (dv.getUint32(0, true) !== 0x3147524f) throw new Error('väärä tiedosto');
    const jl = dv.getUint32(4, true);
    const meta = JSON.parse(new globalThis.TextDecoder().decode(new Uint8Array(buf, 8, jl)));
    const base = 8 + jl;
    for (const m of meta.meshes) {
      const [oP, oN, oC, oI] = m.off;
      const qp = new Uint16Array(buf, base + oP, m.n * 3);
      const pos = new Float32Array(m.n * 3);
      for (let i = 0; i < m.n * 3; i++) {
        const k = i % 3;
        pos[i] = m.mn[k] + (qp[i] / 65535) * (m.mx[k] - m.mn[k]);
      }
      const qn = new Int8Array(buf, base + oN, m.n * 4), qc = new Uint8Array(buf, base + oC, m.n * 4);
      const nrm = new Float32Array(m.n * 3), col = new Float32Array(m.n * 3);
      for (let i = 0; i < m.n; i++) {
        for (let k = 0; k < 3; k++) {
          nrm[i * 3 + k] = qn[i * 4 + k] / 127;
          col[i * 3 + k] = qc[i * 4 + k] / 255;
        }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
      g.setAttribute('color', new THREE.BufferAttribute(col, 3));
      g.setIndex(new THREE.BufferAttribute(new Uint16Array(buf.slice(base + oI, base + oI + m.ni * 2)), 1));
      g.computeBoundingBox();
      g.computeBoundingSphere();
      cache.set(`${m.model}:${m.v}:${m.lod}`, g);
    }
  } catch (e) {
    console.warn('organic.bin ei latautunut, mallit lasketaan käynnistyksessä', e);
  }
}

// q = 1 lähimalli, 0 kaukomalli. Palauttaa null, jos mallia ei ole ladattu.
export function organicAsset(model, seed, q) {
  const spec = ORGANIC_MODELS.find((m) => m[0] === model);
  if (!spec) return null;
  const v = Math.round((seed - spec[2]) / 101);
  return cache.get(`${model}:${v}:${q ? 0 : 1}`) || null;
}
