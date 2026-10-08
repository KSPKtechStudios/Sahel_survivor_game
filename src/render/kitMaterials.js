// Sessio 24: Quaternius-kitin mallien materiaalit (assets/models/nature/).
// Lehdet ja kukat ovat alfaleikattuja kortteja, jotka huojuvat tuulessa;
// kivet ja kuollut puu saavat märkyyden. aAO = mallin oma varjostus.
import * as THREE from 'three';
import { addWind, addWet, addTranslucency } from './materials.js';

const DIR = 'assets/models/nature';
const loader = new THREE.TextureLoader();
const texCache = {};
function tex(file, srgb = true) {
  if (texCache[file]) return texCache[file];
  const t = loader.load(`${DIR}/${file}`);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
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
  leaves: () => addTranslucency(addWet(addAO(addWind(new THREE.MeshStandardMaterial({
    map: tex('leaves.png'), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.8, metalness: 0,
  }), 0.35, 0.6), true), 1, 0.3), 0.3, false),
  flowers: () => addAO(addWind(new THREE.MeshStandardMaterial({
    map: tex('flowers.png'), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.7, metalness: 0,
  }), 0.35, 0.6), true),
  mushrooms: () => addWet(addAO(new THREE.MeshStandardMaterial({ map: tex('mushrooms.jpg'), roughness: 0.6, metalness: 0 }), true), 1, 0.5),
  rocks: () => addWet(addAO(new THREE.MeshStandardMaterial({ map: tex('rocks.jpg'), roughness: 0.92, metalness: 0 })), 0.9, 0.6),
  deadbark: () => addWet(addAO(new THREE.MeshStandardMaterial({
    map: tex('deadbark.jpg'), normalMap: tex('deadbark_nrm.jpg', false), roughness: 0.95, metalness: 0,
  })), 0.8, 0.4),
};
const matCache = {};

export function kitMaterial(key) {
  if (!matCache[key]) matCache[key] = (BUILD[key] || BUILD.rocks)();
  return matCache[key];
}

// Mallin materiaalit ryhmien järjestyksessä (yksi ryhmä -> yksi materiaali).
export function kitMaterials(keys) {
  return keys.length === 1 ? kitMaterial(keys[0]) : keys.map(kitMaterial);
}
