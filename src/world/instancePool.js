// Yksi InstancedMesh, johon chunkit lisäävät ja josta ne poistavat
// instansseja. Näin samaa mallia piirretään yhdellä draw callilla koko
// näkyvälle alueelle. Kapasiteetti kasvaa tarvittaessa.
import * as THREE from 'three';

const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);

export class InstancePool {
  constructor(scene, geometry, material, { capacity = 256, castShadow = false, receiveShadow = true } = {}) {
    this.scene = scene;
    this.geometry = geometry;
    this.material = material;
    this.castShadow = castShadow;
    this.receiveShadow = receiveShadow;
    this.free = [];
    this.used = 0; // korkein käytetty paikka + 1
    this.mesh = this._createMesh(capacity);
  }

  _createMesh(capacity) {
    const mesh = new THREE.InstancedMesh(this.geometry, this.material, capacity);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.count = 0;
    mesh.frustumCulled = false;
    mesh.castShadow = this.castShadow;
    mesh.receiveShadow = this.receiveShadow;
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

  add(matrix) {
    let slot;
    if (this.free.length) {
      slot = this.free.pop();
    } else {
      if (this.used >= this.mesh.instanceMatrix.count) this._grow();
      slot = this.used++;
      this.mesh.count = this.used;
    }
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
    this.free = [];
    this.used = 0;
    this.mesh.count = 0;
  }

  remove(slot) {
    this.mesh.setMatrixAt(slot, ZERO);
    this.mesh.instanceMatrix.needsUpdate = true;
    this.free.push(slot);
  }
}
