// Yksi InstancedMesh, johon chunkit lisäävät ja josta ne poistavat
// instansseja. Näin samaa mallia piirretään yhdellä draw callilla koko
// näkyvälle alueelle. Kapasiteetti kasvaa tarvittaessa.
//
// Pooli pysyy tiiviinä: poistetun instanssin paikalle siirretään viimeinen,
// joten piirrettäviä instansseja on vain niin monta kuin oikeasti näkyy.
// Jokaisella instanssilla on omistaja-olio, jonka .slot päivitetään siirrossa.
//
// Sessio 62 (käyttäjä: peli ei pyöri hyvälläkään koneella): näkymäkarsinta.
// Ennen jokainen pooli piirsi kaikki instanssinsa joka ruudulla, myös kameran
// takana olevat (frustumCulled = false koko näkymäalueen verkolle), ja
// varjoa heittävät vielä molempiin varjokaskadeihin. Mittaus (sademetsä,
// näköetäisyys 5): 10,7 M kolmiota ruudussa. Nyt kaikki instanssit ovat
// suorittimen muistissa (src), ja cull() kopioi piirrettäväksi vain ne, joiden
// rajapallo osuu kameran näkökeilaan. Varjoa heittävät pidetään mukana myös
// lähellä kameran takana (shadowKeep), etteivät selän takana olevien puiden
// varjot katoa kuvasta. Jos näkyvä joukko ei muutu, puskuria ei lähetetä.

import * as THREE from 'three';

const _c = new THREE.Vector3();

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
    if (!geometry.boundingSphere) geometry.computeBoundingSphere();
    this.sphere = geometry.boundingSphere;
    this.src = new Float32Array(capacity * 16);  // kaikki instanssit
    this.bounds = new Float32Array(capacity * 4); // maailman rajapallot (x, y, z, r)
    this.vis = new Int32Array(capacity);          // edellisen ruudun näkyvät
    this.visN = -1;
    this.dirty = true;
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
    const cap = this.src.length / 16 * 2;
    const src = new Float32Array(cap * 16); src.set(this.src); this.src = src;
    const b = new Float32Array(cap * 4); b.set(this.bounds); this.bounds = b;
    this.vis = new Int32Array(cap);
    const old = this.mesh;
    this.mesh = this._createMesh(cap);
    this.scene.remove(old);
    old.dispose();
    this.visN = -1;
    this.dirty = true;
  }

  // Instanssin matriisi ja rajapallo talteen.
  _write(slot, matrix) {
    matrix.toArray(this.src, slot * 16);
    _c.copy(this.sphere.center).applyMatrix4(matrix);
    const o = slot * 4;
    this.bounds[o] = _c.x; this.bounds[o + 1] = _c.y; this.bounds[o + 2] = _c.z;
    this.bounds[o + 3] = this.sphere.radius * matrix.getMaxScaleOnAxis() + 1; // + tuulihuojunta
    this.dirty = true;
  }

  // Lisää instanssi; owner.slot asetetaan.
  add(matrix, owner) {
    if (this.used * 16 >= this.src.length) this._grow();
    const slot = this.used++;
    this.owners[slot] = owner;
    owner.slot = slot;
    this._write(slot, matrix);
    return slot;
  }

  set(slot, matrix) {
    this._write(slot, matrix);
  }

  // Tyhjennä kaikki instanssit (maailman vaihto).
  clear() {
    this.owners.length = 0;
    this.used = 0;
    this.mesh.count = 0;
    this.visN = -1;
    this.dirty = true;
  }

  remove(slot) {
    const last = this.used - 1;
    if (slot < 0 || slot > last) return;
    if (slot !== last) {
      this.src.copyWithin(slot * 16, last * 16, last * 16 + 16);
      this.bounds.copyWithin(slot * 4, last * 4, last * 4 + 4);
      const moved = this.owners[last];
      this.owners[slot] = moved;
      moved.slot = slot;
    }
    this.owners[last] = undefined;
    this.used = last;
    this.dirty = true;
  }

  // Kopioi näkyvät instanssit piirrettäviksi. planes = näkökeilan 6 tasoa
  // [nx, ny, nz, d] (Float32Array 24), cam = kameran paikka, keep2 = etäisyys²,
  // jonka sisällä varjoa heittävä pidetään, vaikka se olisi näkökeilan ulkopuolella,
  // far2 = etäisyys², jonka takana mitään ei piirretä (sumu peittää kokonaan).
  cull(planes, cx, cy, cz, keep2, far2 = Infinity) {
    const n = this.used;
    if (!n) {
      if (this.mesh.count) { this.mesh.count = 0; this.visN = 0; }
      return 0;
    }
    const B = this.bounds, vis = this.vis, shadow = this.mesh.castShadow;
    let k = 0, same = !this.dirty;
    for (let i = 0; i < n; i++) {
      const o = i * 4, x = B[o], y = B[o + 1], z = B[o + 2], r = B[o + 3];
      const ex = x - cx, ey = y - cy, ez = z - cz, d2 = ex * ex + ey * ey + ez * ez;
      if (d2 > far2 + 2 * r * Math.sqrt(far2) + r * r) continue;
      let inside = true;
      for (let p = 0; p < 24; p += 4) {
        if (planes[p] * x + planes[p + 1] * y + planes[p + 2] * z + planes[p + 3] < -r) { inside = false; break; }
      }
      if (!inside && shadow) inside = d2 < keep2 + r * r;
      if (!inside) continue;
      if (same && (k >= this.visN || vis[k] !== i)) same = false;
      vis[k++] = i;
    }
    if (same && k === this.visN) return k;
    const dst = this.mesh.instanceMatrix.array, S = this.src;
    for (let j = 0; j < k; j++) {
      const s = vis[j] * 16, d = j * 16;
      for (let q = 0; q < 16; q++) dst[d + q] = S[s + q];
    }
    this.mesh.count = k;
    this.mesh.instanceMatrix.needsUpdate = true;
    this.visN = k;
    this.dirty = false;
    return k;
  }
}

// Kameran näkökeilan tasot taulukoksi (InstancePool.cull).
const _proj = new THREE.Matrix4();
const _frustum = new THREE.Frustum();
export function frustumPlanes(camera, out = new Float32Array(24)) {
  _proj.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
  _frustum.setFromProjectionMatrix(_proj);
  _frustum.planes.forEach((p, i) => {
    out[i * 4] = p.normal.x; out[i * 4 + 1] = p.normal.y; out[i * 4 + 2] = p.normal.z; out[i * 4 + 3] = p.constant;
  });
  return out;
}
