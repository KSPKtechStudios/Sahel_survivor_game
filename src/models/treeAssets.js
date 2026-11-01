// Sessio 56: Blenderillä tehdyt puut (tools/blender/build_trees.py ->
// assets/models/trees/trees.glb). Solmut '<malli>_<muunnelma>_<near|far>'.
// Muunnetaan samaan muotoon kuin kitin mallit (kit/build.js): kolmiot ilman
// indeksiä, ryhmä per materiaali (kaarna ensin, sitten lehdet), aAO =
// varjostus. Kaarnan verteksiväri on valkoinen: lovet ja kuoriminen
// värjäävät sen (kitMaterials.js: tuore puu). Solmun extras: tree =
// kaatotiedot (treeCut.js), vines = liaanien kiinnityspisteet.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from '../../vendor/meshopt/meshopt_decoder.module.js';
import { mulberry32 } from '../noise.js';

const GLB = 'assets/models/trees/trees.glb';
const CELLS = 'assets/models/trees/leaf_cells.json';
let cells = {};
// Lehtien keskiväri (lineaarinen) sirpaleille ja muille värejä käyttäville.
const LEAF_AVG = [0.11, 0.18, 0.05];
let trees = {};

function toFloat(attr) {
  const n = attr.count, k = attr.itemSize;
  const out = new Float32Array(n * k);
  for (let i = 0; i < n; i++) for (let j = 0; j < k; j++) out[i * k + j] = attr.getComponent(i, j);
  return out;
}

// Lehtien normaalit latvuksesta ulospäin (pehmeä valaistus kuin pilvessä)
// sekoitettuna kortin omaan normaaliin.
function leafNormals(pos, nrm, from, to) {
  let cx = 0, cy = 0, cz = 0, n = 0;
  for (let i = from; i < to; i++) { cx += pos[i * 3]; cy += pos[i * 3 + 1]; cz += pos[i * 3 + 2]; n++; }
  if (!n) return;
  cx /= n; cy /= n; cz /= n;
  const v = new THREE.Vector3(), f = new THREE.Vector3();
  for (let i = from; i < to; i++) {
    v.set(pos[i * 3] - cx, (pos[i * 3 + 1] - cy) * 1.4 + 0.6, pos[i * 3 + 2] - cz).normalize();
    f.set(nrm[i * 3], nrm[i * 3 + 1], nrm[i * 3 + 2]);
    if (f.dot(v) < 0) f.negate();
    v.multiplyScalar(0.72).addScaledVector(f, 0.28).normalize();
    nrm[i * 3] = v.x; nrm[i * 3 + 1] = v.y; nrm[i * 3 + 2] = v.z;
  }
}

function convert(node) {
  const meshes = [];
  node.updateMatrixWorld(true);
  node.traverse((o) => { if (o.isMesh) meshes.push(o); });
  // Kaarna ensin (runko sen alussa), lehdet viimeiseksi.
  meshes.sort((a, b) => (a.material.name.startsWith('treeLeaf') ? 1 : 0) - (b.material.name.startsWith('treeLeaf') ? 1 : 0));
  const parts = meshes.map((m) => {
    const g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
    for (const name of Object.keys(g.attributes)) g.setAttribute(name, new THREE.BufferAttribute(toFloat(g.attributes[name]), g.attributes[name].itemSize));
    g.applyMatrix4(m.matrixWorld);
    return { g, mat: m.material.name };
  });
  const total = parts.reduce((a, p) => a + p.g.attributes.position.count, 0);
  const pos = new Float32Array(total * 3), nrm = new Float32Array(total * 3), uv = new Float32Array(total * 2);
  const col = new Float32Array(total * 3), ao = new Float32Array(total);
  const geo = new THREE.BufferGeometry();
  let o = 0;
  let trunkEnd = 0;
  parts.forEach(({ g, mat }, gi) => {
    const P = g.attributes.position.array, N = g.attributes.normal.array, U = g.attributes.uv.array;
    const C = g.attributes.color ? g.attributes.color.array : null;
    const cs = g.attributes.color ? g.attributes.color.itemSize : 3;
    const n = g.attributes.position.count;
    const leaf = mat.startsWith('treeLeaf');
    // Kaarna: runkokolmiot (G = 1) ensin, jotta lovet ja leikkaus löytävät ne.
    const tris = [];
    for (let t = 0; t < n / 3; t++) {
      const trunk = !leaf && C && C[t * 3 * cs + 1] > 0.5 && C[(t * 3 + 1) * cs + 1] > 0.5 && C[(t * 3 + 2) * cs + 1] > 0.5;
      tris.push([trunk ? 0 : 1, t]);
    }
    if (!leaf) tris.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const start = o;
    for (const [isOther, t] of tris) {
      for (let k = 0; k < 3; k++) {
        const s = t * 3 + k;
        pos.set(P.subarray(s * 3, s * 3 + 3), o * 3);
        nrm.set(N.subarray(s * 3, s * 3 + 3), o * 3);
        // glTF:n V on käännetty; takaisin Blenderin suuntaan (tekstuurit flipY).
        uv[o * 2] = U[s * 2];
        uv[o * 2 + 1] = 1 - U[s * 2 + 1];
        const a = C ? Math.max(0.2, C[s * cs]) : 1;
        ao[o] = a;
        if (leaf) { col[o * 3] = LEAF_AVG[0] * a; col[o * 3 + 1] = LEAF_AVG[1] * a; col[o * 3 + 2] = LEAF_AVG[2] * a; }
        else { col[o * 3] = 1; col[o * 3 + 1] = 1; col[o * 3 + 2] = 1; }
        o++;
      }
      if (!leaf && !isOther && gi === 0) trunkEnd = o;
    }
    if (leaf) leafNormals(pos, nrm, start, o);
    geo.addGroup(start, o - start, gi);
  });
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.setAttribute('aAO', new THREE.BufferAttribute(ao, 1));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.computeBoundingBox();
  geo.computeBoundingSphere();
  geo.userData.kit = parts.map((p) => p.mat);
  geo.userData.keepUv = true;
  const ex = node.userData || {};
  if (ex.tree) {
    geo.userData.tree = typeof ex.tree === 'string' ? JSON.parse(ex.tree) : ex.tree;
    geo.userData.ranges = { trunk: [0, trunkEnd] };
  }
  if (ex.vines) {
    const pts = typeof ex.vines === 'string' ? JSON.parse(ex.vines) : ex.vines;
    const rng = mulberry32(pts.length * 977 + Math.round(geo.boundingSphere.radius * 100));
    geo.userData.vines = vineSpecs(pts, rng);
  }
  return geo;
}

// Sessio 57: liaanit kiinnityskohdista (render/vines.js). Osa kaartuu kahden
// oksan välillä (loop), useimmat laskeutuvat vinosti maahan, osa riippuu
// vapaana mutta ei maahan asti (ennen moni riippui suorana pystyviivana).
//
// Sessio 58 (käyttäjä: liaanit liian paksuja ja kaikki samanlaisia): säde
// 0,5–4 cm (ennen 3–7,5 cm) ja muototyyppi `kind` (render/vines.js):
// thin = ohut sileä vihreä varsi, medium = kierteinen kaksisäikeinen,
// coil = korkkiruuvi, thick = vanha puutunut liaani, ladder = litteä
// aaltoileva "apinanportaat", curtain = vapaana riippuva ilmajuurien verho
// (useita ohuita säikeitä samasta kohdasta).
function pickKind(rng, table) {
  let u = rng();
  for (const [k, p] of table) { if ((u -= p) < 0) return k; }
  return table[table.length - 1][0];
}
const R_KIND = { thin: [0.006, 0.011], medium: [0.012, 0.02], coil: [0.01, 0.016], thick: [0.022, 0.038], ladder: [0.02, 0.03], curtain: [0.004, 0.007] };
function vineSpecs(pts, rng) {
  const out = [];
  const radius = (kind) => R_KIND[kind][0] + rng() * (R_KIND[kind][1] - R_KIND[kind][0]);
  pts.forEach((p, i) => {
    const top = new THREE.Vector3(p[0], p[1], p[2]);
    const u = rng();
    if (u < 0.28 && pts.length > 1) {
      const q = pts[(i + 1 + Math.floor(rng() * (pts.length - 1))) % pts.length];
      const end = new THREE.Vector3(q[0], q[1], q[2]);
      const d = top.distanceTo(end);
      if (d > 1.5 && d < 10) {
        const kind = pickKind(rng, [['medium', 0.4], ['thick', 0.3], ['ladder', 0.15], ['coil', 0.15]]);
        out.push({ top: top.toArray(), end: end.toArray(), onTree: true, len: d * (1.15 + rng() * 0.3), r: radius(kind), kind });
        return;
      }
    }
    if (u < 0.8) {
      const a = rng() * Math.PI * 2, drift = 1.5 + rng() * 3.5;
      const end = [top.x + Math.cos(a) * drift, -0.05, top.z + Math.sin(a) * drift];
      const d = Math.hypot(end[0] - top.x, end[1] - top.y, end[2] - top.z);
      const kind = pickKind(rng, [['thin', 0.38], ['medium', 0.27], ['coil', 0.13], ['thick', 0.14], ['ladder', 0.08]]);
      out.push({ top: top.toArray(), end, len: d * (1.02 + rng() * 0.08), r: radius(kind), kind });
      return;
    }
    // Ilmajuuriverho: 3–5 ohutta säiettä hieman eri kohdista ja eri pituisina.
    const len = Math.max(1.5, Math.min(top.y - 1.2, 2.5 + rng() * 4));
    const n = 3 + Math.floor(rng() * 3);
    for (let k = 0; k < n; k++) {
      const a = rng() * Math.PI * 2, o = 0.05 + rng() * 0.25;
      const t = [top.x + Math.cos(a) * o, top.y - rng() * 0.15, top.z + Math.sin(a) * o];
      out.push({ top: t, end: null, len: len * (0.55 + rng() * 0.6), r: radius('curtain'), kind: 'curtain' });
    }
  });
  return out;
}

// Lehtiatlaksen solu: { uv: [u0, v0, u1, v1] (Blenderin tapa), aspect } tai null.
export function leafCell(name) {
  return cells[name] || null;
}

export async function loadTreeAssets() {
  try {
    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    const [gltf, cj] = await Promise.all([loader.loadAsync(GLB), fetch(CELLS).then((r) => r.json()).catch(() => ({}))]);
    cells = cj;
    const out = {};
    for (const node of gltf.scene.children) out[node.name] = convert(node);
    trees = out;
  } catch (e) {
    console.warn('Puumalleja ei voitu ladata, käytetään vanhoja', e);
    trees = {};
  }
  return trees;
}

// lod: 'near' tai 'far'. Palauttaa null, jos mallia ei ole.
export function treeAsset(model, variant, lod = 'near') {
  return trees[`${model}_${variant}_${lod}`] || null;
}

export function treeVariantCount(model) {
  let n = 0;
  while (trees[`${model}_${n}_near`]) n++;
  return n;
}
