// Yksi InstancedMesh, johon chunkit lisäävät ja josta ne poistavat
// instansseja. Näin samaa mallia piirretään yhdellä draw callilla koko
// näkyvälle alueelle. Kapasiteetti kasvaa tarvittaessa.
//
// Pooli pysyy tiiviinä: poistetun instanssin paikalle siirretään viimeinen,
// joten piirrettäviä instansseja on vain niin monta kuin oikeasti näkyy.
// Jokaisella instanssilla on omistaja-olio, jonka .slot päivitetään siirrossa.

import * as THREE from 'three';

const _arr = new Float32Array(16);

export class InstancePool {
  // layer: kerros, jolla verkko näkyy (sessio 57: 1 = vain varjokamerat, ks.
  // world.js varjokopiot).
  constructor(scene, geometry, material, { capacity = 256, castShadow = false, receiveShadow = true, layer = 0 } = {}) {
    this.scene = scene;
    this.geometry = geometry;
    this.material = material;
    this.castShadow = castShadow;
    this.receiveShadow = receiveShadow;
    this.layer = layer;
    this.owners = [];
    this.used = 0;
    this.mesh = this._createMesh(capacity);
  }

  _createMesh(capacity) {
    const mesh = new THREE.InstancedMesh(this.geometry, this.material, capacity);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.count = 0;
    mesh.frustumCulled = false;
    mesh.castShadow = this.castShadow;
    mesh.receiveShadow = this.receiveShadow;
    if (this.layer) mesh.layers.set(this.layer);
    this.scene.add(mesh);
    return mesh;
  }

  _grow() {
    const old = this.mesh;
    const next = this._createMesh(old.instanceMatrix.count * 2);
    next.instanceMatrix.array.set(old.instanceMatrix.array);
    next.count = old.count;
    next.instanceMatrix.needsUpdate = true;
    this.scene.remove(old);
    old.dispose();
    this.mesh = next;
  }

  // Lisää instanssi; owner.slot asetetaan.
  add(matrix, owner) {
    if (this.used >= this.mesh.instanceMatrix.count) this._grow();
    const slot = this.used++;
    this.owners[slot] = owner;
    owner.slot = slot;
    this.mesh.count = this.used;
    this.mesh.setMatrixAt(slot, matrix);
    this.mesh.instanceMatrix.needsUpdate = true;
    return slot;
  }

  set(slot, matrix) {
    this.mesh.setMatrixAt(slot, matrix);
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  // Tyhjennä kaikki instanssit (maailman vaihto).
  clear() {
    this.owners.length = 0;
    this.used = 0;
    this.mesh.count = 0;
  }

  remove(slot) {
    const last = this.used - 1;
    if (slot < 0 || slot > last) return;
    if (slot !== last) {
      const a = this.mesh.instanceMatrix.array;
      for (let i = 0; i < 16; i++) _arr[i] = a[last * 16 + i];
      a.set(_arr, slot * 16);
      const moved = this.owners[last];
      this.owners[slot] = moved;
      moved.slot = slot;
    }
    this.owners[last] = undefined;
    this.used = last;
    this.mesh.count = this.used;
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
