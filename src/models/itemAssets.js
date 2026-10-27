// Sessio 54 (käyttäjä: kaikille esineille paremmat mallit ja tekstuurit):
// Blenderissä tehdyt esinemallit (tools/blender/, assets/models/items/items.glb).
// Jokainen GLB:n solmu on yksi esine (nimi = esineen tunnus): origo otteen
// kohdalla, esine +Y-suuntaan kuten aiemmissa malleissa. Materiaalipaikan nimi
// viittaa materiaalikirjastoon (LIB): toistuvat CC0-tekstuurit (ambientCG,
// assets/textures/items/), esim. 'wood' tai sävytettynä 'cloth:9a8060'.
// 'bake:<tunnus>' = esineen oma leivottu tekstuuri. Varjostus (AO) on
// verteksiväreissä, jotka kertovat tekstuurin värin.
//
// Mallit ladataan ennen pelin käynnistystä (loadItemAssets); jos lataus
// epäonnistuu, käytetään vanhoja koodilla tehtyjä malleja.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { MeshoptDecoder } from '../../vendor/meshopt/meshopt_decoder.module.js';

const GLB = 'assets/models/items/items.glb';
const TEX = 'assets/textures/items/';

// Materiaalikirjasto. rough/metal = kertoimet karheus- ja metallisuusarvoille,
// env = heijastuksen voimakkuus (metallit), nrm = normaalikartan voimakkuus.
const LIB = {
  wood: { rough: 0.9 },
  hardwood: { rough: 0.8 },
  heartwood: { rough: 0.75 },
  bark: { rough: 1 },
  stone: { rough: 0.95 },
  flint: { rough: 0.45, env: 0.6, nrm: 0.6 },
  clay: { rough: 1 },
  iron: { rough: 0.8, metal: 0.85, env: 1 },
  steel: { rough: 0.45, metal: 1, env: 1.2 },
  copper: { rough: 0.6, metal: 0.9, env: 1 },
  gold: { rough: 0.35, metal: 1, env: 1.2 },
  brass: { rough: 0.5, metal: 1, env: 1.1 },
  leather: { rough: 0.85 },
  rope: { rough: 1 },
  cloth: { rough: 1 },
  bone: { rough: 0.7 },
  fur: { rough: 1, nrm: 1.4 },
  // Proseduraaliset (tools/blender/prep_textures.py --procedural).
  chain: { rough: 1, metal: 0.9, env: 1 },
  scales: { rough: 1, metal: 0.9, env: 1 },
  ruby: { special: 'ruby' },
  // Eloperäiset: väri ja kuviot verteksiväreissä (Blender maalaa), ei tekstuuria.
  skin: { vc: true, rough: 0.55 },
  flesh: { vc: true, rough: 0.45, env: 0.3 },
  cap: { vc: true, rough: 0.75 },
  plant: { vc: true, rough: 0.6, side: true },
  straw: { vc: true, rough: 0.9, side: true },
  feather: { vc: true, rough: 0.85, side: true },
  liquid: { vc: true, rough: 0.12, env: 0.45 },
  paste: { vc: true, rough: 0.8 },
  shell: { vc: true, rough: 0.3, env: 0.5 },
  chitin: { vc: true, rough: 0.25, env: 0.7 },
  gum: { vc: true, rough: 0.15, env: 0.8 },
  endgrain: { vc: true, rough: 0.95 },
  ash: { vc: true, rough: 1 }, // sessio 56: nuotion tuhka ja hiilet
  coal: { vc: true, rough: 0.8 },
  vc: { vc: true, rough: 0.8 },
};

const loader = new THREE.TextureLoader();
const texCache = new Map();
function tex(file, srgb) {
  if (!texCache.has(file)) {
    const t = loader.load(TEX + file);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 4;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    texCache.set(file, t);
  }
  return texCache.get(file);
}
// Odotetaan, että kaikki käytetyt tekstuurit ovat ladattu (kuvakkeet piirretään heti).
function texturesReady() {
  return Promise.all([...texCache.values()].map((t) => (t.image ? null : new Promise((res) => {
    const check = () => (t.image ? res() : setTimeout(check, 30));
    check();
  }))));
}

// Taivas-maa-liukuma heijastuksiksi (metallit myös maailmassa, jossa ei ole ympäristökarttaa).
let envTex = null;
function env() {
  if (envTex) return envTex;
  const w = 64, h = 32, d = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) {
    const t = y / (h - 1);
    const sky = Math.max(0, (t - 0.5) * 2), ground = Math.max(0, (0.5 - t) * 2);
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const sun = Math.max(0, 1 - Math.hypot((x / w - 0.3) * 4, (t - 0.8) * 5));
      d[i] = Math.min(255, 150 + 95 * sky - 95 * ground + 100 * sun);
      d[i + 1] = Math.min(255, 155 + 88 * sky - 105 * ground + 95 * sun);
      d[i + 2] = Math.min(255, 165 + 80 * sky - 125 * ground + 80 * sun);
      d[i + 3] = 255;
    }
  }
  envTex = new THREE.DataTexture(d, w, h);
  envTex.mapping = THREE.EquirectangularReflectionMapping;
  envTex.colorSpace = THREE.SRGBColorSpace;
  envTex.needsUpdate = true;
  return envTex;
}

const matCache = new Map();
function libMaterial(slot) {
  if (matCache.has(slot)) return matCache.get(slot);
  const [key, arg] = slot.split(':');
  let m;
  if (key === 'bake') {
    m = new THREE.MeshStandardMaterial({
      map: tex(`bake_${arg}_c.webp`, true), normalMap: tex(`bake_${arg}_n.webp`), roughnessMap: tex(`bake_${arg}_r.webp`),
      roughness: 1, metalness: 0, vertexColors: true,
    });
  } else if (key === 'ruby') {
    m = new THREE.MeshPhysicalMaterial({
      color: 0x8a0618, emissive: 0x3a0008, roughness: 0.12, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.05,
      envMap: env(), envMapIntensity: 1.4, vertexColors: true, flatShading: true,
    });
  } else if (LIB[key] && LIB[key].vc) {
    const d = LIB[key];
    m = new THREE.MeshStandardMaterial({ roughness: d.rough, metalness: 0, vertexColors: true, side: d.side ? THREE.DoubleSide : THREE.FrontSide });
    if (d.env) { m.envMap = env(); m.envMapIntensity = d.env; }
    if (arg) m.color.set('#' + arg);
  } else {
    const d = LIB[key] || LIB.wood;
    m = new THREE.MeshStandardMaterial({
      map: tex(`${key}_c.webp`, true), normalMap: tex(`${key}_n.webp`), roughnessMap: tex(`${key}_r.webp`),
      roughness: d.rough ?? 1, metalness: d.metal ?? 0, vertexColors: true,
    });
    if (d.nrm) m.normalScale.setScalar(d.nrm);
    if (d.env) { m.envMap = env(); m.envMapIntensity = d.env; }
    if (arg) m.color.set('#' + arg);
  }
  m.name = slot;
  matCache.set(slot, m);
  return m;
}

// Hehkukuori rubiiniosista (vrt. items3.js glowShell).
function glowFrom(geo, groups) {
  const pos = geo.attributes.position, idx = geo.index;
  const out = [];
  for (const g of groups) {
    const P = [];
    for (let i = g.start; i < g.start + g.count; i++) {
      const v = idx ? idx.getX(i) : i;
      P.push(pos.getX(v), pos.getY(v), pos.getZ(v));
    }
    const s = new THREE.BufferGeometry();
    s.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    s.computeBoundingBox();
    const c = s.boundingBox.getCenter(new THREE.Vector3());
    s.translate(-c.x, -c.y, -c.z);
    s.scale(1.08, 1.06, 1.08);
    s.translate(c.x, c.y, c.z);
    out.push(s);
  }
  return out.length ? mergeGeometries(out, false) : null;
}

let assets = null;
let loading = null;

export function loadItemAssets() {
  if (!loading) {
    loading = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(GLB).then(async (gltf) => {
      const out = {};
      gltf.scene.updateMatrixWorld(true);
      for (const node of gltf.scene.children) {
        const meshes = [];
        node.traverse((o) => { if (o.isMesh) meshes.push(o); });
        if (!meshes.length) continue;
        const geos = [], mats = [];
        for (const m of meshes) {
          const g = m.geometry.clone();
          // Kvantisoidut (kokonaisluku) attribuutit liukuluvuiksi ennen siirtoa ja yhdistämistä.
          for (const k of Object.keys(g.attributes)) {
            if (!['position', 'normal', 'uv', 'color'].includes(k)) { g.deleteAttribute(k); continue; }
            const a = g.attributes[k];
            if (!(a.array instanceof Float32Array) || a.normalized || a.isInterleavedBufferAttribute) {
              const f = new Float32Array(a.count * a.itemSize);
              for (let i = 0; i < a.count; i++) for (let c = 0; c < a.itemSize; c++) f[i * a.itemSize + c] = a.getComponent(i, c);
              g.setAttribute(k, new THREE.BufferAttribute(f, a.itemSize));
            }
          }
          g.applyMatrix4(m.matrixWorld);
          if (g.attributes.normal) g.normalizeNormals();
          geos.push(g);
          mats.push(libMaterial(m.material.name || 'wood'));
        }
        const geo = geos.length > 1 ? mergeGeometries(geos, true) : geos[0];
        if (geos.length === 1) geo.addGroup(0, geo.index ? geo.index.count : geo.attributes.position.count, 0);
        geo.computeBoundingSphere();
        geo.userData.material = mats;
        const rubyGroups = geo.groups.filter((g) => mats[g.materialIndex].name === 'ruby');
        if (rubyGroups.length) geo.userData.glowGeo = glowFrom(geo, rubyGroups);
        out[node.name] = geo;
      }
      await texturesReady();
      assets = out;
      return out;
    }).catch((e) => {
      console.warn('Esinemalleja ei voitu ladata, käytetään vanhoja', e);
      assets = {};
      return assets;
    });
  }
  return loading;
}

// Blender-malli esineelle (tai null, jos sitä ei ole).
export function itemAsset(id) {
  return (assets && assets[id]) || null;
}
