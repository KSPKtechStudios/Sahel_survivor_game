// Esineiden hakkaaminen: puihin tulee lovia ja ne kaatuvat, kiviin tulee
// säröjä ja ne murskautuvat, pensaat rytisevät ja hajoavat. Saaliit putoavat
// aina maahan fyysisinä esineinä.
import * as THREE from 'three';
import { OBJECT_TYPES } from '../world/objectTypes.js';
import { makeChoppable, addNotch, trunkAxis } from './treeCut.js';
import { events } from './events.js';

const CHIP = {
  acacia: [0xd2ad78, 0x5b4838],
  jungle: [0xd8b98a, 0x8c8474],
  palm: [0xc9a46e, 0x7a6a52],
  boulder: [0x8f7a68, 0x6e5a4c],
  bush: [0x93806a, 0xa48e58],
  fern: [0x4f7d2e, 0x66953a],
  baobab: [0x9a8a78, 0x8b7c6c],
  canopy: [0xd2b48a, 0x6a5a48],
  deadTree: [0xd8ccb6, 0xb9ab96],
  thicket: [0x3b6a2a, 0x4a3a28],
  bamboo: [0x9ab04a, 0x6d8c34],
  shea: [0xd2b080, 0x4a3d32],
  doum: [0xc9a46e, 0x6d604f],
  coconut: [0xd2b080, 0x8a7a62],
  log: [0xc8a878, 0x7a6a58],
  mossyLog: [0xb89a70, 0x4d7a2a],
  banana: [0x5a8a30, 0x6f8f34],
  desertShrub: [0x9cab86, 0x9a9478],
};

// Kiven materiaali, johon piirtyy säröjä vaurion kasvaessa (uDamage 0..1).
function createCrackMaterial(seed) {
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92 });
  const uDamage = { value: 0 };
  const uSeed = { value: seed };
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uDamage = uDamage;
    shader.uniforms.uSeed = uSeed;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vObjPos;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvObjPos = position;');
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
varying vec3 vObjPos;
uniform float uDamage;
uniform float uSeed;
vec3 crHash(vec3 p) {
  p = vec3(dot(p, vec3(127.1, 311.7, 74.7)), dot(p, vec3(269.5, 183.3, 246.1)), dot(p, vec3(113.5, 271.9, 124.6)));
  return fract(sin(p) * 43758.5453);
}
vec2 crVoronoi(vec3 p, out float id) {
  vec3 ip = floor(p);
  vec3 fp = fract(p);
  float f1 = 8.0, f2 = 8.0;
  id = 0.0;
  for (int k = -1; k <= 1; k++) for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
    vec3 g = vec3(float(i), float(j), float(k));
    vec3 o = crHash(ip + g);
    vec3 r = g + o - fp;
    float d = dot(r, r);
    if (d < f1) { f2 = f1; f1 = d; id = crHash(ip + g + 7.0).x; }
    else if (d < f2) { f2 = d; }
  }
  return vec2(sqrt(f1), sqrt(f2));
}`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
if (uDamage > 0.001) {
  float id;
  vec2 f = crVoronoi(vObjPos * 2.4 + uSeed, id);
  float w = 0.03 + 0.05 * uDamage;
  float crack = (1.0 - smoothstep(w * 0.35, w, f.y - f.x)) * step(id, uDamage * 1.15);
  float id2;
  vec2 g = crVoronoi(vObjPos * 6.5 + uSeed + 3.1, id2);
  float fine = (1.0 - smoothstep(0.012, 0.03, g.y - g.x)) * step(id2, uDamage - 0.15);
  diffuseColor.rgb *= mix(1.0, 0.12, max(crack, fine * 0.7));
}`,
      );
  };
  mat.customProgramCacheKey = () => 'crack';
  mat.userData.uDamage = uDamage;
  return mat;
}

const _v = new THREE.Vector3();

export class Breakables {
  constructor({ world, models, debris, drops, fallen, material }) {
    Object.assign(this, { world, models, debris, drops, fallen, material });
  }

  // Lyönti esineeseen, jonka työkalu kelpaa. Palauttaa true, jos esine hajosi.
  hit(obj, hitPoint, playerPos, dmg = 1) {
    const def = OBJECT_TYPES[obj.type];
    const maxHp = def.harvest.hp;
    obj.hp -= dmg;
    const from = new THREE.Vector3().subVectors(playerPos, hitPoint).setY(0).normalize();
    const [c1, c2] = CHIP[obj.type] || [0x8a7a6a, 0x6a5a4a];

    if (def.kind === 'tree') {
      events.emit('woodHit', { x: hitPoint.x, z: hitPoint.z });
      return this._hitTree(obj, from, hitPoint, c1, c2, dmg);
    }
    if (def.kind === 'rock') return this._hitRock(obj, from, hitPoint, maxHp, c1, c2);

    // Pensaat: rytisee, oksia ja lehtiä lentää, lopuksi hajoaa.
    this.world.shake(obj, 1);
    this.debris.chips(hitPoint, c1, 5, from, 0.7);
    this.debris.chips(hitPoint, c2, 3, null, 0.6);
    if (obj.hp > 0) return false;
    const geo = this.models.world[def.model][obj.variant];
    this.debris.shatter(geo, this.world.matrixOf(obj), { pieces: 7, inner: c1, power: 1.6, life: 1.8, seed: obj.id.length * 77, closed: false });
    this._drop(def.harvest.drops, new THREE.Vector3(obj.x, obj.y + 0.5, obj.z));
    this.world.removeObject(obj);
    events.emit('harvest', { type: obj.type });
    return true;
  }

  _activeMesh(obj, geometry, material) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(obj.x, obj.y, obj.z);
    mesh.rotation.y = obj.rot;
    mesh.scale.setScalar(obj.scale);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.updateMatrixWorld(true);
    return mesh;
  }

  // Toinen puu kaatui tämän päälle (ketjureaktio, sessio 13): kaatuu suuntaan dir.
  fellTree(obj, dir, chainDepth = 1) {
    const def = OBJECT_TYPES[obj.type];
    if (!def || def.kind !== 'tree' || obj.stump || obj.removed) return false;
    if (!obj.active) {
      const geo = makeChoppable(this.models.hi(def.model, obj.variant));
      this.world.activate(obj, this._activeMesh(obj, geo, this.material));
    }
    obj.hp = 0;
    this.fallen.fell(obj, obj.active.geometry, null, dir, chainDepth);
    return true;
  }

  _hitTree(obj, from, hitPoint, c1, c2, dmg = 1) {
    const def = OBJECT_TYPES[obj.type];
    if (!obj.active) {
      const geo = makeChoppable(this.models.hi(def.model, obj.variant));
      this.world.activate(obj, this._activeMesh(obj, geo, this.material));
    }
    const mesh = obj.active;
    const geo = mesh.geometry;
    const ax = trunkAxis(geo.userData.tree);
    // Lovi tulee aina kaatokohtaan, sille puolelle josta lyödään.
    const fromLocal = mesh.worldToLocal(hitPoint.clone().addScaledVector(from, 2)).sub(mesh.worldToLocal(hitPoint.clone()));
    addNotch(geo, null, fromLocal, ax.cutS, Math.min(1, dmg));
    const cutWorld = ax.base.clone().addScaledVector(ax.axis, ax.cutS);
    mesh.localToWorld(cutWorld);
    cutWorld.addScaledVector(from, geo.userData.tree.r0 * obj.scale);
    const weak = dmg < 0.5; // ilman kirvestä: vähemmän lastuja
    this.debris.chips(cutWorld, c1, weak ? 2 : 7, from, 0.9);
    this.debris.chips(cutWorld, c2, weak ? 1 : 3, from, 0.8);
    this.world.shake(obj, weak ? 0.15 : 0.35);
    if (obj.hp > 0) return false;
    this.fallen.fell(obj, geo, hitPoint.clone().addScaledVector(from, 2));
    events.emit('harvest', { type: obj.type });
    return true;
  }

  _hitRock(obj, from, hitPoint, maxHp, c1, c2) {
    const def = OBJECT_TYPES[obj.type];
    if (!obj.active) {
      const geo = this.models.world[def.model][obj.variant].clone();
      const mat = createCrackMaterial((obj.x * 13.1 + obj.z * 7.7) % 100);
      const mesh = this._activeMesh(obj, geo, mat);
      mesh.userData.onDispose = () => { mat.dispose(); geo.dispose(); };
      this.world.activate(obj, mesh);
    }
    const mesh = obj.active;
    const damage = 1 - Math.max(0, obj.hp) / maxHp;
    mesh.material.userData.uDamage.value = damage;
    // Lohkeile: osumakohdan ympäriltä painuu kuoppa.
    const geo = mesh.geometry;
    const local = mesh.worldToLocal(hitPoint.clone());
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      _v.fromBufferAttribute(pos, i);
      const d = _v.distanceTo(local);
      if (d < 0.45) {
        const k = (1 - d / 0.45) * 0.07;
        _v.multiplyScalar(1 - k);
        pos.setXYZ(i, _v.x, _v.y, _v.z);
      }
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
    this.debris.chips(hitPoint, c1, 8, from, 1.1);
    this.debris.chips(hitPoint, c2, 3, from, 0.8);
    this.world.shake(obj, 0.2);
    if (obj.hp > 0) return false;
    mesh.updateMatrixWorld(true);
    this.debris.shatter(geo, mesh.matrixWorld, { pieces: 11, inner: 0x5e5048, power: 3, life: 2.6, seed: obj.id.length * 131 });
    this._drop(def.harvest.drops, new THREE.Vector3(obj.x, obj.y + 0.6 * obj.scale, obj.z));
    this.world.removeObject(obj);
    mesh.userData.onDispose?.();
    events.emit('harvest', { type: obj.type });
    return true;
  }

  _drop(drops, pos) {
    for (const [item, n] of drops) this.drops.spawn(item, n, pos);
  }
}
