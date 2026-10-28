// Sessio 58: muinaisen juurakon ja sammaloituneen rungon mallit valmiiksi.
//
// Mallit (src/models/organic.js) lasketaan tarkalla ruudukolla, harvennetaan
// meshoptimizerilla (muoto ja värirajat säilyvät, maan rajan reuna lukittu)
// ja tallennetaan tiedostoon assets/models/organic.bin. Peli lataa tiedoston
// (src/models/organicAssets.js); jos se puuttuu, mallit lasketaan
// käynnistyksessä karkeammalla ruudukolla.
//
// Käyttö (repon juuresta):
//   cd tools/organic && npm install && cd ../..
//   node --import ./tools/organic/register.mjs tools/organic/build.mjs
import { writeFileSync } from 'node:fs';
import { MeshoptSimplifier } from 'meshoptimizer';
import { makeAncientRoots, makeMossyLog } from '../../src/models/organic.js';
import { ORGANIC_MODELS } from '../../src/models/organicAssets.js';

const BUILDERS = { ancientRoots: makeAncientRoots, mossyLog: makeMossyLog };
// Kolmioiden tavoitemäärät (lähi- ja kaukomalli).
const TARGET = { ancientRoots: [9000, 1600], mossyLog: [6500, 1100] };

await MeshoptSimplifier.ready;
MeshoptSimplifier.useExperimentalFeatures = true;

function simplify(geo, tris) {
  const pos = geo.attributes.position.array;
  const col = geo.attributes.color.array;
  const idx = new Uint32Array(geo.index.array);
  if (idx.length / 3 <= tris) return idx;
  const [out, err] = MeshoptSimplifier.simplifyWithAttributes(idx, pos, 3, col, 3, [0.6, 0.6, 0.6], null, tris * 3, 0.05, ['LockBorder']);
  console.log(`  ${idx.length / 3} -> ${out.length / 3} kolmiota, virhe ${(err * MeshoptSimplifier.getScale(pos, 3)).toFixed(3)} m`);
  return out;
}

// Pakkaa yhden mallin: sijainnit 16-bittisinä rajojen sisällä, normaalit ja
// värit 8-bittisinä, indeksit 16-bittisinä.
function pack(geo, idx) {
  const remap = new Int32Array(geo.attributes.position.count).fill(-1);
  const order = [];
  const ind = new Uint16Array(idx.length);
  for (let i = 0; i < idx.length; i++) {
    const v = idx[i];
    if (remap[v] < 0) { remap[v] = order.length; order.push(v); }
    ind[i] = remap[v];
  }
  const n = order.length;
  if (n > 65535) throw new Error('liikaa kärkipisteitä');
  const P = geo.attributes.position.array, N = geo.attributes.normal.array, C = geo.attributes.color.array;
  const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
  for (const v of order) for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], P[v * 3 + k]); mx[k] = Math.max(mx[k], P[v * 3 + k]); }
  const pos = new Uint16Array(n * 3 + (n * 3) % 2);
  const nrm = new Int8Array(n * 4), clr = new Uint8Array(n * 4);
  order.forEach((v, i) => {
    for (let k = 0; k < 3; k++) {
      pos[i * 3 + k] = Math.round(((P[v * 3 + k] - mn[k]) / Math.max(1e-6, mx[k] - mn[k])) * 65535);
      nrm[i * 4 + k] = Math.round(Math.max(-1, Math.min(1, N[v * 3 + k])) * 127);
      clr[i * 4 + k] = Math.round(Math.max(0, Math.min(1, C[v * 3 + k])) * 255);
    }
  });
  return { n, ni: ind.length, mn, mx, bufs: [pos, nrm, clr, ind.length % 2 ? new Uint16Array([...ind, 0]) : ind] };
}

const meshes = [];
const blobs = [];
let off = 0;
for (const [model, count, base] of ORGANIC_MODELS) {
  for (let v = 0; v < count; v++) {
    const seed = base + v * 101;
    console.log(`${model} ${v}`);
    const t0 = Date.now();
    const geo = BUILDERS[model](seed, 2);
    console.log(`  laskettu ${Date.now() - t0} ms, ${geo.index.count / 3} kolmiota`);
    TARGET[model].forEach((tris, lod) => {
      const p = pack(geo, simplify(geo, tris));
      const entry = { model, v, lod, n: p.n, ni: p.ni, mn: p.mn, mx: p.mx, off: [] };
      for (const b of p.bufs) { entry.off.push(off); blobs.push(b); off += b.byteLength; }
      meshes.push(entry);
    });
  }
}
const json = new TextEncoder().encode(JSON.stringify({ v: 1, meshes }));
const jl = Math.ceil(json.length / 4) * 4;
const out = new Uint8Array(8 + jl + off);
const dv = new DataView(out.buffer);
dv.setUint32(0, 0x3147524f, true); // 'ORG1'
dv.setUint32(4, jl, true);
out.set(json, 8);
out.fill(32, 8 + json.length, 8 + jl);
let p = 8 + jl;
for (const b of blobs) { out.set(new Uint8Array(b.buffer, b.byteOffset, b.byteLength), p); p += b.byteLength; }
writeFileSync(new URL('../../assets/models/organic.bin', import.meta.url), out);
console.log(`assets/models/organic.bin ${(out.length / 1024).toFixed(0)} kt`);
