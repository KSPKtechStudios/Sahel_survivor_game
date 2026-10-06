// Avoin maailma chunkeina: maasto, vesi ja esineet ladataan pelaajan ympärille
// ja puretaan kauempaa. Raskas laskenta (maasto, esineiden sijoittelu) tehdään
// generointisäikeessä (genPool.js); tässä vain rakennetaan valmiista datasta
// verkot ja instanssit. Generointi on deterministista (maailman siemen), joten
// poistetut esineet ja kannot muistetaan pelkillä tunnisteilla.
//
// Esineet piirretään instansseina. Etäisyyden mukaan esine on
//   lähellä: tarkka malli varjoineen, kauempana: kevyt malli ilman varjoa,
//   tai kokonaan piilossa (pienet esineet kaukana).
// Hakattava esine irrotetaan poolista omaksi Meshikseen (obj.active).
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { WATER_LEVEL } from './terrain.js';
import { OBJECT_TYPES, OBJECT_TYPE_KEYS, DECOR_TYPES } from './objectTypes.js';
import { InstancePool } from './instancePool.js';
import { GenPool } from './genPool.js';
import { OBJ_STRIDE, DECOR_STRIDE } from './chunkGen.js';
import { splitTree } from '../game/treeCut.js';

const SIZE = CONFIG.chunkSize;
const SEG = CONFIG.chunkSegments;
const LOD_NEAR = 1.6; // chunkia: tätä lähempänä tarkka malli + varjo
const APPLY_BUDGET_MS = 4; // valmiiden chunkkien rakentaminen / ruutu

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
const _oc = new THREE.Vector3();

function createTerrainIndex() {
  const idx = [];
  const row = SEG + 1;
  for (let j = 0; j < SEG; j++) {
    for (let i = 0; i < SEG; i++) {
      const a = j * row + i;
      const b = a + 1;
      const c = a + row;
      const d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  }
  return new THREE.Uint32BufferAttribute(idx, 1);
}

export class World {
  constructor(scene, materials, models) {
    this.scene = scene;
    this.materials = materials;
    this.models = models;
    this.chunks = new Map();
    this.requested = new Set();
    this.ready = [];
    this.needed = [];
    this.removed = new Set();
    this.stumps = new Set();
    this.centerKey = null;
    this.center = null;
    this.viewRadius = CONFIG.viewRadius;
    this.detailRange = Infinity; // sademetsässä esineitä piirretään lyhyemmälle
    this.terrainIndex = createTerrainIndex();
    // Vesitaso jaettu pienempiin kolmioihin: isot kolmiot kameran alla piirtyivät
    // osalla renderöijistä väärin (vesi näkyi maan päällä).
    this.waterGeo = new THREE.PlaneGeometry(SIZE, SIZE, 16, 16).rotateX(-Math.PI / 2);
    this.shakes = [];
    this.extraColliders = []; // pelaajan rakennelmat, kaatuneet rungot, rauniot

    // Poolit: lähi- ja kaukomallit per tyyppi ja variantti, sekä kannot.
    this.pools = {};
    this.stumpPools = {};
    const variantCounts = {};
    for (const type of OBJECT_TYPE_KEYS) {
      const def = OBJECT_TYPES[type];
      const near = models.world[def.model];
      const far = models.far[def.model];
      variantCounts[def.model] = near.length;
      const mat = materials[def.material];
      this.pools[type] = {
        near: near.map((geo) => new InstancePool(scene, geo, mat, { capacity: def.decorative ? 4096 : 256, castShadow: def.castShadow })),
        far: far ? far.map((geo) => new InstancePool(scene, geo, mat, { capacity: 512, castShadow: false })) : null,
      };
      if (def.kind === 'tree') {
        this.stumpPools[type] = near.map((_, v) => new InstancePool(scene, splitTree(models.hi(def.model, v)).stump, materials.solid, { capacity: 64, castShadow: true }));
      }
    }
    this.gen = new GenPool(variantCounts);
    this.gen.onChunk = (data) => this.ready.push(data);
  }

  key(cx, cz) {
    return `${cx},${cz}`;
  }

  // --- Maailman vaihto ----------------------------------------------------------

  // Tyhjennä kaikki ja vaihda siemen (terrain.js:n setWorldSeed asetetaan erikseen).
  reset(seed) {
    for (const [k, ch] of [...this.chunks]) this._disposeChunk(k, ch);
    this.chunks.clear();
    this.requested.clear();
    this.ready = [];
    this.needed = [];
    this.removed = new Set();
    this.stumps = new Set();
    this.centerKey = null;
    this.center = null;
    this.shakes = [];
    this.extraColliders.length = 0;
    for (const P of Object.values(this.pools)) {
      for (const pool of P.near) pool.clear();
      if (P.far) for (const pool of P.far) pool.clear();
    }
    for (const list of Object.values(this.stumpPools)) for (const pool of list) pool.clear();
    if (seed !== undefined) this.gen.setSeed(seed);
  }

  setViewRadius(r) {
    this.viewRadius = r;
    this.centerKey = null;
  }

  // Sademetsässä näkyvyys on lyhyt: piirretään esineet vain lähelle.
  setDetailRange(chunks) {
    if (Math.abs(chunks - this.detailRange) < 0.01) return;
    this.detailRange = chunks;
    for (const ch of this.chunks.values()) this._applyLod(ch);
  }

  // --- Streamaus -------------------------------------------------------------

  update(px, pz, dt, budgetMs = APPLY_BUDGET_MS) {
    const ccx = Math.floor(px / SIZE);
    const ccz = Math.floor(pz / SIZE);
    const ck = this.key(ccx, ccz);
    if (ck !== this.centerKey) {
      this.centerKey = ck;
      this._refresh(ccx, ccz);
    }
    this.gen.pump(budgetMs);
    // Rakenna valmiit chunkit lähimmät ensin, aikabudjetin puitteissa.
    if (this.ready.length) {
      const t0 = performance.now();
      this.ready.sort((a, b) => this._distTo(a.cx, a.cz) - this._distTo(b.cx, b.cz));
      while (this.ready.length && performance.now() - t0 < budgetMs) {
        const data = this.ready.shift();
        const k = this.key(data.cx, data.cz);
        this.requested.delete(k);
        if (this.chunks.has(k) || this._distTo(data.cx, data.cz) > this.viewRadius + 1.5) continue;
        this._buildChunk(data);
      }
    }
    this._updateShakes(dt);
  }

  _distTo(cx, cz) {
    if (!this.center) return 0;
    return Math.hypot(cx - this.center.cx, cz - this.center.cz);
  }

  _refresh(ccx, ccz) {
    this.center = { cx: ccx, cz: ccz };
    const R = this.viewRadius;
    const need = [];
    for (let dz = -R; dz <= R; dz++) {
      for (let dx = -R; dx <= R; dx++) {
        if (dx * dx + dz * dz > (R + 0.5) * (R + 0.5)) continue;
        need.push({ cx: ccx + dx, cz: ccz + dz, d: dx * dx + dz * dz });
      }
    }
    need.sort((a, b) => a.d - b.d);
    this.needed = need;
    for (const n of need) {
      const k = this.key(n.cx, n.cz);
      if (this.chunks.has(k) || this.requested.has(k)) continue;
      this.requested.add(k);
      this.gen.requestChunk(n.cx, n.cz);
    }
    const unloadR = (R + 1.5) * (R + 1.5);
    for (const [k, ch] of [...this.chunks]) {
      const dx = ch.cx - ccx;
      const dz = ch.cz - ccz;
      if (dx * dx + dz * dz > unloadR) this._disposeChunk(k, ch);
    }
    for (const ch of this.chunks.values()) this._applyLod(ch);
  }

  // Montako tarvittavista chunkeista on valmiina (latausruutua varten).
  loadProgress() {
    if (!this.needed.length) return 1;
    let n = 0;
    for (const c of this.needed) if (this.chunks.has(this.key(c.cx, c.cz))) n++;
    return n / this.needed.length;
  }

  // Odota, että pisteen ympäristö on rakennettu (lataus, siirtyminen).
  async ensureLoaded(x, z, onProgress, nextFrame) {
    this.centerKey = null;
    this.update(x, z, 0);
    for (;;) {
      this.update(x, z, 0, 30);
      const p = this.loadProgress();
      onProgress?.(p);
      if (p >= 1) break;
      await nextFrame();
    }
  }

  isReady(px, pz) {
    return this.chunks.has(this.key(Math.floor(px / SIZE), Math.floor(pz / SIZE)));
  }

  _chunkDist(ch) {
    return this._distTo(ch.cx, ch.cz);
  }

  // Valitse jokaiselle esineelle oikea pooli etäisyyden mukaan.
  _poolFor(obj, dist) {
    if (obj.active) return null;
    const def = OBJECT_TYPES[obj.type];
    if (obj.stump) return dist <= 3.5 ? this.stumpPools[obj.type][obj.variant] : null;
    if (dist > Math.min(def.drawDist, this.detailRange) + 0.5) return null;
    const P = this.pools[obj.type];
    if (P.far && dist > LOD_NEAR) return P.far[obj.variant];
    return P.near[obj.variant];
  }

  _applyLod(ch) {
    const dist = this._chunkDist(ch);
    for (const obj of ch.objects) this._assignPool(obj, dist);
    this._setDecor(ch, dist <= CONFIG.grassRadius + 0.5);
  }

  _assignPool(obj, dist) {
    const want = this._poolFor(obj, dist);
    if (want === obj.pool) return;
    if (obj.pool) obj.pool.remove(obj.slot);
    obj.pool = want;
    obj.slot = -1;
    if (want) want.add(this._matrixFor(obj), obj);
  }

  // --- Chunkin rakennus valmiista datasta --------------------------------------

  _buildChunk(data) {
    const { cx, cz } = data;
    const x0 = cx * SIZE;
    const z0 = cz * SIZE;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(data.positions, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(data.normals, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(data.colors, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(data.uvs, 2));
    geo.setIndex(this.terrainIndex);
    geo.computeBoundingSphere();
    geo.computeBoundingBox();
    const mesh = new THREE.Mesh(geo, this.materials.terrain);
    mesh.position.set(x0, 0, z0);
    mesh.receiveShadow = true;
    mesh.updateMatrix();
    mesh.matrixAutoUpdate = false;
    this.scene.add(mesh);

    let water = null;
    if (data.minH < WATER_LEVEL) {
      water = new THREE.Mesh(this.waterGeo, this.materials.water);
      water.position.set(x0 + SIZE / 2, WATER_LEVEL, z0 + SIZE / 2);
      water.updateMatrix();
      water.matrixAutoUpdate = false;
      water.renderOrder = 1;
      this.scene.add(water);
    }

    const chunk = { cx, cz, mesh, water, objects: [], colliders: [], decor: null, decorData: data.decor, rain: data.rain };
    const o = data.objects;
    for (let n = 0; n < o.length; n += OBJ_STRIDE) {
      const type = OBJECT_TYPE_KEYS[o[n]];
      const def = OBJECT_TYPES[type];
      const id = `${cx},${cz},${type},${o[n + 1]}`;
      const isStump = this.stumps.has(id);
      if (this.removed.has(id) && !isStump) continue;
      const obj = {
        id, type, x: o[n + 2], y: o[n + 3], z: o[n + 4], rot: o[n + 5], scale: o[n + 6], variant: o[n + 7],
        hp: def.harvest?.hp ?? 1, chunk, slot: -1, pool: null, active: null, stump: isStump,
      };
      chunk.objects.push(obj);
      const cr = isStump ? 0.25 : def.collider;
      if (cr > 0) chunk.colliders.push({ x: obj.x, z: obj.z, r: cr * obj.scale, obj });
    }
    this.chunks.set(this.key(cx, cz), chunk);
    this._applyLod(chunk);
    return chunk;
  }

  // Koriste-esineet (ruoho ym.) vain lähimpiin chunkeihin.
  _setDecor(chunk, on) {
    if (on && !chunk.decor) {
      chunk.decor = [];
      const d = chunk.decorData;
      for (let n = 0; n < d.length; n += DECOR_STRIDE) {
        const pool = this.pools[DECOR_TYPES[d[n]]].near[d[n + 1]];
        _p.set(d[n + 2], d[n + 3], d[n + 4]);
        _q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, d[n + 5]);
        _s.set(d[n + 6], d[n + 7], d[n + 6]);
        _m.compose(_p, _q, _s);
        const e = { pool, slot: -1 };
        pool.add(_m, e);
        chunk.decor.push(e);
      }
    } else if (!on && chunk.decor) {
      for (const e of chunk.decor) e.pool.remove(e.slot);
      chunk.decor = null;
    }
  }

  _matrixFor(obj, wobble = 0) {
    _p.set(obj.x, obj.y, obj.z);
    _e.set(wobble * 0.7, obj.rot, wobble);
    _q.setFromEuler(_e);
    _s.setScalar(obj.scale);
    return _m.compose(_p, _q, _s);
  }

  // Esineen maailmamatriisi (uusi Matrix4).
  matrixOf(obj) {
    return this._matrixFor(obj).clone();
  }

  _disposeChunk(k, ch) {
    this.scene.remove(ch.mesh);
    ch.mesh.geometry.dispose();
    if (ch.water) this.scene.remove(ch.water);
    for (const obj of ch.objects) {
      if (obj.pool) obj.pool.remove(obj.slot);
      obj.pool = null;
      if (obj.active) this.deactivate(obj, true);
    }
    this._setDecor(ch, false);
    this.chunks.delete(k);
  }

  // --- Hakattavat esineet ------------------------------------------------------

  // Irrota esine poolista omaksi Meshikseen (lovet, säröt).
  activate(obj, mesh) {
    if (obj.pool) obj.pool.remove(obj.slot);
    obj.pool = null;
    obj.slot = -1;
    obj.active = mesh;
    this.scene.add(mesh);
  }

  deactivate(obj, dispose = false) {
    if (!obj.active) return;
    this.scene.remove(obj.active);
    if (obj.active.userData.onDispose) obj.active.userData.onDispose();
    obj.active = null;
    obj.hp = OBJECT_TYPES[obj.type].harvest?.hp ?? 1;
    if (!dispose) this._assignPool(obj, this._chunkDist(obj.chunk));
  }

  // Puu kaatui: tilalle jää kanto.
  toStump(obj, mesh = null) {
    if (obj.active) {
      this.scene.remove(obj.active);
      obj.active = null;
    }
    // Loveutunut kanto näkyy omana Meshinään, kunnes chunk puretaan.
    if (mesh) {
      obj.active = mesh;
      this.scene.add(mesh);
    }
    obj.stump = true;
    this.removed.add(obj.id);
    this.stumps.add(obj.id);
    const c = obj.chunk.colliders.find((cc) => cc.obj === obj);
    if (c) c.r = 0.25 * obj.scale;
    this._assignPool(obj, this._chunkDist(obj.chunk));
  }

  // --- Kyselyt ---------------------------------------------------------------

  forEachChunkNear(x, z, radius, fn) {
    const c0x = Math.floor((x - radius) / SIZE);
    const c1x = Math.floor((x + radius) / SIZE);
    const c0z = Math.floor((z - radius) / SIZE);
    const c1z = Math.floor((z + radius) / SIZE);
    for (let cz = c0z; cz <= c1z; cz++) {
      for (let cx = c0x; cx <= c1x; cx++) {
        const ch = this.chunks.get(this.key(cx, cz));
        if (ch) fn(ch);
      }
    }
  }

  // Lähin osuma säteelle (origin, dir). Palauttaa { obj, t } tai null.
  raycast(origin, dir, maxDist) {
    let best = null;
    this.forEachChunkNear(origin.x, origin.z, maxDist + 2.5, (ch) => {
      for (const obj of ch.objects) {
        const def = OBJECT_TYPES[obj.type];
        if (!def.hit || obj.stump) continue;
        _oc.set(obj.x - origin.x, obj.y + def.hit.y * obj.scale - origin.y, obj.z - origin.z);
        const r = def.hit.r * obj.scale;
        const tca = _oc.dot(dir);
        if (tca < -r) continue;
        const d2 = _oc.lengthSq() - tca * tca;
        if (d2 > r * r) continue;
        const t = Math.max(0, tca - Math.sqrt(r * r - d2));
        if (t <= maxDist && (!best || t < best.t)) best = { obj, t };
      }
    });
    return best;
  }

  collidersNear(x, z, radius, out = []) {
    out.length = 0;
    this.forEachChunkNear(x, z, radius + 2, (ch) => {
      for (const c of ch.colliders) out.push(c);
    });
    const r2 = (radius + 12) * (radius + 12);
    for (const c of this.extraColliders) {
      const cx = c.seg ? (c.ax + c.bx) / 2 : c.x;
      const cz = c.seg ? (c.az + c.bz) / 2 : c.z;
      if ((cx - x) ** 2 + (cz - z) ** 2 < r2) out.push(c);
    }
    return out;
  }

  removeObject(obj) {
    const ch = obj.chunk;
    if (obj.pool) obj.pool.remove(obj.slot);
    obj.pool = null;
    if (obj.active) {
      this.scene.remove(obj.active);
      obj.active = null;
    }
    this.removed.add(obj.id);
    const i = ch.objects.indexOf(obj);
    if (i >= 0) ch.objects.splice(i, 1);
    const ci = ch.colliders.findIndex((c) => c.obj === obj);
    if (ci >= 0) ch.colliders.splice(ci, 1);
    this.shakes = this.shakes.filter((s) => s.obj !== obj);
  }

  shake(obj, strength = 1) {
    const existing = this.shakes.find((s) => s.obj === obj);
    if (existing) { existing.t = 0; existing.strength = strength; return; }
    this.shakes.push({ obj, t: 0, strength });
  }

  _updateShakes(dt) {
    if (!this.shakes.length) return;
    const DUR = 0.35;
    this.shakes = this.shakes.filter((s) => {
      s.t += dt;
      const o = s.obj;
      const done = s.t >= DUR;
      const k = done ? 0 : 1 - s.t / DUR;
      const w = Math.sin(s.t * 45) * 0.06 * k * s.strength;
      if (o.active) {
        o.active.rotation.set(w * 0.7, o.rot, w);
      } else if (o.pool) {
        o.pool.set(o.slot, this._matrixFor(o, w));
      }
      return !done;
    });
  }

  serialize() {
    return { removed: [...this.removed], stumps: [...this.stumps] };
  }

  load(data) {
    this.removed = new Set((data && data.removed) || []);
    this.stumps = new Set((data && data.stumps) || []);
  }
}
