// Sessio 24: Quaternius-kitin mallien materiaalit (assets/models/nature/).
// Lehdet ja kukat ovat alfaleikattuja kortteja, jotka huojuvat tuulessa;
// kivet ja kuollut puu saavat märkyyden. aAO = mallin oma varjostus.
import * as THREE from 'three';
import { loadAlphaTexture } from './alphaMips.js';
import { addWind, addWet, addTranslucency, softFoliage } from './materials.js';

const DIR = 'assets/models/nature';
const loader = new THREE.TextureLoader();
const texCache = {};
function tex(file, srgb = true) {
  if (texCache[file]) return texCache[file];
  // Sessio 26: alfatestatut (lehdet, kukat) peittävyyden säilyttävin mipmapein.
  const t = file.endsWith('.png') ? loadAlphaTexture(`${DIR}/${file}`, { cutoff: 0.5, srgb }) : loader.load(`${DIR}/${file}`);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 16; // sessio 40 (three rajaa maksimiin)
  // Sessio 28: toistuvat tekstuurit (lahopuun UV kiertää rungon pituudella
  // monta kertaa; ennen reunan pikselit venyivät pitkiksi raidoiksi).
  if (!file.endsWith('.png')) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  texCache[file] = t;
  return t;
}

// Pienet kasvit näytetään vain lähellä (world.js, decorDist 44 m): reunalla
// ne painuvat pehmeästi maahan eivätkä ilmesty äkkiä.
export const KIT_FADE = 44;

// Mallin varjostus (tyvi tummempi) ennen valaistusta; fade = häivytys.
function addAO(material, fade = false) {
  const prev = material.onBeforeCompile;
  material.onBeforeCompile = (shader, renderer) => {
    if (prev) prev(shader, renderer);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
attribute float aAO;
varying float vKitAO;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
vKitAO = aAO;
${fade ? `#ifdef USE_INSTANCING
{
  vec3 kitP = (modelMatrix * vec4(instanceMatrix[3].xyz, 1.0)).xyz;
  transformed *= 1.0 - smoothstep(${(KIT_FADE * 0.8).toFixed(1)}, ${KIT_FADE.toFixed(1)}, distance(kitP.xz, cameraPosition.xz));
}
#endif` : ''}`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
varying float vKitAO;`)
      .replace('#include <map_fragment>', `#include <map_fragment>
diffuseColor.rgb *= vKitAO;`);
  };
  const prevKey = material.customProgramCacheKey;
  material.customProgramCacheKey = () => `${prevKey ? prevKey.call(material) : ''}-kitao${fade ? 'f' : ''}`;
  return material;
}

const BUILD = {
  // Sessio 46: softFoliage (pehmeämpi mipmap kaukana, keskitetty alfareuna).
  leaves: () => softFoliage(addTranslucency(addWet(addAO(addWind(new THREE.MeshStandardMaterial({
    map: tex('leaves.png'), alphaTest: 0.5, alphaToCoverage: true, side: THREE.DoubleSide, roughness: 0.95, metalness: 0,
  }), 0.35, 0.6), true), 0.08, 0), 0.3, false)),
  flowers: () => softFoliage(addAO(addWind(new THREE.MeshStandardMaterial({
    map: tex('flowers.png'), alphaTest: 0.5, alphaToCoverage: true, side: THREE.DoubleSide, roughness: 0.7, metalness: 0,
  }), 0.35, 0.6), true)),
  mushrooms: () => addWet(addAO(new THREE.MeshStandardMaterial({ map: tex('mushrooms.jpg'), roughness: 0.6, metalness: 0 }), true), 1, 0.5),
  rocks: () => addWet(addAO(new THREE.MeshStandardMaterial({ map: tex('rocks.jpg'), roughness: 0.92, metalness: 0 })), 0.9, 0.6),
  // Sessio 28: haalistunut kuori (Poly Haven bark_willow_02, CC0), noin
  // metri tekstuuria rungon pituudella.
  deadbark: () => {
    const map = tex('deadbark.jpg'), nrm = tex('deadbark_nrm.jpg', false);
    map.repeat.set(1, 0.5);
    nrm.repeat.set(1, 0.5);
    return addWet(addAO(new THREE.MeshStandardMaterial({ map, normalMap: nrm, roughness: 0.95, metalness: 0 })), 0.8, 0.4);
  },
};
// Sessio 48: Poly Havenin trooppiset kasvit (oikea lehtigeometria, ei
// alfaleikkausta): tuuli, läpikuultavuus ja märkyys kuten lehdillä.
function tropicalLeaf(file, wind = 0.3) {
  return () => addTranslucency(addWet(addAO(addWind(new THREE.MeshStandardMaterial({
    map: tex(file), side: THREE.DoubleSide, roughness: 0.93, metalness: 0,
  }), wind, 0.6), true), 0.1, 0), 0.3, false);
}
Object.assign(BUILD, {
  calathea: tropicalLeaf('calathea.jpg'),
  fern2: tropicalLeaf('fern2.jpg', 0.4),
});
// Sessio 49: käyttäjän tuomat banaani ja bambut. Nämä ovat maailman
// esineitä (ei koristeita), joten ne eivät häivy 44 m:ssä. Saman mallin
// kaikilla osilla sama tuuli, ettei lehdet irtoa varresta.
// Sessio 58: lehdet mattapintaisiksi (käyttäjä: kiiltävät muovisen näköisesti);
// märkyys tummentaa lehtiä mutta ei juuri kiillota.
function plantCard(file, wind, flutter, { tint = 0xffffff, rough = 0.95 } = {}) {
  return () => softFoliage(addTranslucency(addWet(addAO(addWind(new THREE.MeshStandardMaterial({
    map: tex(file), color: tint, alphaTest: 0.5, alphaToCoverage: true, side: THREE.DoubleSide, roughness: rough, metalness: 0,
  }), wind, flutter)), 0.08, 0), 0.3, false));
}
function plantSolid(params, wind, flutter, wet = 0.6) {
  return () => addWet(addAO(addWind(new THREE.MeshStandardMaterial({ metalness: 0, ...params() }), wind, flutter)), wet, 0.2);
}
Object.assign(BUILD, {
  bananaTrunk: plantSolid(() => ({ map: tex('banana_trunk.jpg'), roughness: 0.85 }), 0.06, 1),
  bananaLeaf: plantCard('banana_leaf.png', 0.06, 1, { tint: 0xc8d0c0, rough: 0.96 }),
  bananaFruit: plantSolid(() => ({ color: new THREE.Color().setRGB(0.62, 0.46, 0.04), roughness: 0.6 }), 0.06, 1, 0.4),
  bananaFlower: plantSolid(() => ({ color: new THREE.Color().setRGB(0.3, 0.02, 0.14), roughness: 0.55, side: THREE.DoubleSide }), 0.06, 1, 0.4),
  bambooStalk: plantSolid(() => ({ map: tex('bamboo_stalk.jpg'), roughness: 0.55 }), 0.012, 0.15, 0.7),
  bambooLeaf: plantCard('bamboo_leaf.png', 0.012, 0.15),
  bambooBush: plantCard('bamboo_bush.png', 0.06, 1),
});
// Sessio 56: Blenderillä tehdyt puut (models/treeAssets.js). Kaarna ja
// lehdet huojuvat samalla tuulella kuin vanhat puut (vegetation-materiaali),
// jotta lehdet eivät irtoa oksista. Lehdet eivät häivy etäisyyden mukaan.
const TREE_DIR = 'assets/models/trees';
const TREE_WIND = 0.0045;
const treeTexCache = {};
// Liaanin varsiatlaksen oikea (puutunut) puolisko: oma tekstuuri-instanssi,
// jossa u siirretään puoliskon alkuun (Blenderin UV u 0..0,3).
function vineTex(file, srgb = true) {
  const t = loader.load(`${TREE_DIR}/${file}`);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.offset.set(0.5, 0);
  return t;
}

function treeTex(file, srgb = true) {
  if (treeTexCache[file]) return treeTexCache[file];
  const t = file.startsWith('leaves') ? loadAlphaTexture(`${TREE_DIR}/${file}`, { cutoff: 0.5, srgb }) : loader.load(`${TREE_DIR}/${file}`);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 16;
  if (!file.startsWith('leaves')) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  treeTexCache[file] = t;
  return t;
}
// Kaksipuolisten lehtikorttien normaali pysyy latvuksesta ulospäin myös
// takapuolelta katsottuna (muuten kortin takapinta tummuu).
function keepLeafNormal(material) {
  const prev = material.onBeforeCompile;
  material.onBeforeCompile = (shader, renderer) => {
    if (prev) prev(shader, renderer);
    shader.fragmentShader = shader.fragmentShader.replace('#include <normal_fragment_begin>', `#include <normal_fragment_begin>
normal = normalize( vNormal );`);
  };
  const prevKey = material.customProgramCacheKey;
  material.customProgramCacheKey = () => `${prevKey ? prevKey.call(material) : ''}-leafn`;
  return material;
}
// Kaarnan verteksiväri on valkoinen; lovet ja kuoriminen (treeCut.js,
// breakables.js) värjäävät sen tuoreen puun väriseksi, joka näkyy tekstuurin päällä.
// Sessio 57: kaatopinnan (kannon ja rungon pään) syykuvio. Kannen UV on
// 100 + paikka kannen tasossa säteen yksiköissä (treeCut.js), väri = puulaji.
const END_GRAIN = `
vec3 endGrain( vec2 q, vec3 wood ) {
  float r = length( q );
  float a = atan( q.y, q.x );
  float rr = r * ( 1.0 + 0.035 * sin( a * 3.0 + 1.7 ) + 0.02 * sin( a * 7.0 + r * 9.0 ) + 0.012 * sin( a * 13.0 ) );
  float rings = pow( 0.5 + 0.5 * cos( rr * 6.2832 * 17.0 ), 5.0 );
  vec3 sap = wood * 1.1;
  vec3 heart = wood * vec3( 0.66, 0.52, 0.42 );
  vec3 c = mix( heart, sap, smoothstep( 0.48, 0.7, rr + 0.03 * sin( a * 5.0 + 2.0 ) ) );
  c *= 1.0 - 0.24 * rings;
  c *= mix( 0.5, 1.0, smoothstep( 0.015, 0.06, r ) );
  float ck = pow( max( 0.0, cos( a * 3.0 + 0.6 + 1.2 * sin( r * 5.0 ) ) ), 900.0 ) * smoothstep( 0.1, 0.35, r ) * ( 1.0 - smoothstep( 0.55, 0.75, r ) );
  c *= 1.0 - 0.55 * ck;
  c *= 0.92 + 0.08 * sin( ( q.x * 0.8 + q.y * 0.6 ) * 46.0 + sin( q.y * 9.0 ) * 2.0 );
  c = mix( c, wood * vec3( 0.34, 0.27, 0.22 ), smoothstep( 0.9, 0.97, r ) );
  return c;
}
`;

function freshWood(material) {
  const prev = material.onBeforeCompile;
  material.onBeforeCompile = (shader, renderer) => {
    if (prev) prev(shader, renderer);
    shader.fragmentShader = shader.fragmentShader
      .replace('void main() {', `${END_GRAIN}\nvoid main() {`)
      // Kannen pinnalla ei kaarnan kohoumia.
      .replace('#include <normal_fragment_maps>', `#if defined( USE_MAP )
  if ( vMapUv.x < 50.0 ) {
#endif
#include <normal_fragment_maps>
#if defined( USE_MAP )
  }
#endif`)
      .replace('#include <color_fragment>', `#if defined( USE_COLOR )
  float freshK = clamp( ( 2.97 - ( vColor.r + vColor.g + vColor.b ) ) * 6.0, 0.0, 1.0 );
  vec3 freshC = vColor.rgb;
#if defined( USE_MAP )
  // Lovessa syyt pitkittäin (kuitujuovat).
  freshC *= 0.86 + 0.14 * sin( vMapUv.x * 230.0 + sin( vMapUv.y * 9.0 ) * 3.0 );
  if ( vMapUv.x > 50.0 ) { freshC = endGrain( vMapUv - 100.0, vColor.rgb ); freshK = 1.0; }
#endif
  diffuseColor.rgb = mix( diffuseColor.rgb, freshC, freshK );
#endif`);
  };
  const prevKey = material.customProgramCacheKey;
  material.customProgramCacheKey = () => `${prevKey ? prevKey.call(material) : ''}-fresh2`;
  return material;
}
function treeBark(key, tint = 0xffffff) {
  return () => {
    const map = treeTex(`bark_${key}_c.webp`), normalMap = treeTex(`bark_${key}_n.webp`, false);
    return freshWood(addWet(addAO(addWind(new THREE.MeshStandardMaterial({
      map, normalMap, color: tint, roughness: 0.95, metalness: 0, vertexColors: true,
    }), TREE_WIND)), 0.8, 0.4));
  };
}
Object.assign(BUILD, {
  treeLeaf: () => keepLeafNormal(softFoliage(addTranslucency(addWet(addAO(addWind(new THREE.MeshStandardMaterial({
    map: treeTex('leaves.webp'), alphaTest: 0.5, alphaToCoverage: true, side: THREE.DoubleSide, roughness: 0.97, metalness: 0,
  }), TREE_WIND)), 0.08, 0), 0.35, false))),
  treeBark_acacia: treeBark('acacia', 0xbcac9c),
  treeBark_shea: treeBark('shea'),
  treeBark_baobab: treeBark('baobab'),
  treeBark_rain: treeBark('rain', 0xb0aa98),
  treeBark_kapok: treeBark('kapok', 0xd8d8d0),
  treeBark_emergent: treeBark('emergent', 0xe0dcd4),
  treeBark_sapling: treeBark('sapling', 0xa89a80),
  // Sessio 58: rungon ympäri kiertävä liaani: liaanien varsiatlaksen puutunut
  // puolisko (render/vines.js, tools/blender/vinetex.py). Tumma sävy x
  // tekstuuri x AO teki siitä ensin varjopuolella täysin mustan.
  treeVine: () => addWet(addAO(addWind(new THREE.MeshStandardMaterial({
    map: vineTex('vine_stem_c.webp'), normalMap: vineTex('vine_stem_n.webp', false), color: 0xf2eedc, roughness: 0.92, metalness: 0,
  }), TREE_WIND)), 0.6, 0.2),
});
// Sessio 58: kalkkikivi (karstiseinämät ja -tornit, models/karst.js).
// ambientCG Rock026 (CC0); verteksiväri tuo juovat ja sammalen.
const TEX_DIR = 'assets/textures';
function rockTex(file, srgb = true) {
  if (texCache[`T:${file}`]) return texCache[`T:${file}`];
  const t = loader.load(`${TEX_DIR}/${file}`);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 16;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  texCache[`T:${file}`] = t;
  return t;
}
Object.assign(BUILD, {
  limestone: () => addWet(addAO(new THREE.MeshStandardMaterial({
    map: rockTex('limestone_col.jpg'), normalMap: rockTex('limestone_nrm.jpg', false), normalScale: new THREE.Vector2(0.6, 0.6),
    vertexColors: true, roughness: 0.93, metalness: 0,
  })), 0.8, 0.3),
  // Lehdet kuten puissa, mutta ilman tuulta (tornin huippu on 30–40 m:ssä).
  karstLeaf: () => keepLeafNormal(softFoliage(addTranslucency(addWet(addAO(new THREE.MeshStandardMaterial({
    map: treeTex('leaves.webp'), alphaTest: 0.5, alphaToCoverage: true, side: THREE.DoubleSide, roughness: 0.97, metalness: 0,
  })), 0.08, 0), 0.35, false))),
});
const matCache = {};

export function kitMaterial(key) {
  if (!matCache[key]) matCache[key] = (BUILD[key] || BUILD.rocks)();
  return matCache[key];
}

// Mallin materiaalit ryhmien järjestyksessä (yksi ryhmä -> yksi materiaali).
export function kitMaterials(keys) {
  return keys.length === 1 ? kitMaterial(keys[0]) : keys.map(kitMaterial);
}
