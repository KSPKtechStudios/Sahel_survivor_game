// Avoin maailma chunkeina: maasto, vesi ja esineet ladataan pelaajan ympärille
// ja puretaan kauempaa. Generointi on deterministista (maailman siemen), joten
// poistetut esineet ja kannot muistetaan pelkillä tunnisteilla.
//
// Esineet piirretään instansseina. Etäisyyden mukaan esine on
//   lähellä: tarkka malli varjoineen, kauempana: kevyt malli ilman varjoa,
//   tai kokonaan piilossa (pienet esineet kaukana).
// Hakattava esine irrotetaan poolista omaksi Meshikseen (obj.active).
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { mulberry32, hashSeed } from '../noise.js';
import { sampleTerrain, heightAt, groundColor, getWorldSeed, WATER_LEVEL, BIOME_KEYS } from './terrain.js';
import { OBJECT_TYPES, OBJECT_TYPE_KEYS, DECOR_TYPES } from './objectTypes.js';
import { InstancePool } from './instancePool.js';
import { splitTree } from '../game/treeCut.js';

const SIZE = CONFIG.chunkSize;
const SEG = CONFIG.chunkSegments;
const STEP = SIZE / SEG;
const LOD_NEAR = 1.6; // chunkia: tätä lähempänä tarkka malli + varjo

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
    this.queue = [];
    this.removed = new Set();
    this.stumps = new Set();
    this.centerKey = null;
    this.center = null;
    this.viewRadius = CONFIG.viewRadius;
    this.terrainIndex = createTerrainIndex();
    // Vesitaso jaettu pienempiin kolmioihin: isot kolmiot kameran alla piirtyivät
    // osalla renderöijistä väärin (vesi näkyi maan päällä).
    this.waterGeo = new THREE.PlaneGeometry(SIZE, SIZE, 16, 16).rotateX(-Math.PI / 2);
    this.shakes = [];
    this.extraColliders = []; // pelaajan rakennelmat, kaatuneet rungot

    // Poolit: lähi- ja kaukomallit per tyyppi ja variantti, sekä kannot.
    this.pools = {};
    this.stumpPools = {};
    this.stumpGeos = {};
    for (const type of OBJECT_TYPE_KEYS) {
      const def = OBJECT_TYPES[type];
      const near = models.world[def.model];
      const far = models.far[def.model];
      const mat = materials[def.material];
      this.pools[type] = {
        near: near.map((geo) => new InstancePool(scene, geo, mat, { capacity: def.decorative ? 4096 : 256, castShadow: def.castShadow })),
        far: far ? far.map((geo) => new InstancePool(scene, geo, mat, { capacity: 512, castShadow: false })) : null,
      };
      if (def.kind === 'tree') {
        this.stumpGeos[type] = near.map((_, v) => splitTree(models.hi(def.model, v)).stump);
        this.stumpPools[type] = this.stumpGeos[type].map((geo) => new InstancePool(scene, geo, materials.solid, { capacity: 64, castShadow: true }));
      }
    }
  }

  key(cx, cz) {
    return `${cx},${cz}`;
  }

  // --- Maailman vaihto ----------------------------------------------------------

  // Tyhjennä kaikki (uusi siemen asetetaan terrain.js:n setWorldSeed:llä).
  reset() {
    for (const [k, ch] of [...this.chunks]) this._disposeChunk(k, ch);
    this.chunks.clear();
    this.queue = [];
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
  }

  setViewRadius(r) {
    this.viewRadius = r;
    this.centerKey = null;
  }

  // --- Streamaus -------------------------------------------------------------

  update(px, pz, dt, budget = CONFIG.chunksPerFrame) {
    const ccx = Math.floor(px / SIZE);
    const ccz = Math.floor(pz / SIZE);
    const ck = this.key(ccx, ccz);
    if (ck !== this.centerKey) {
      this.centerKey = ck;
      this._refresh(ccx, ccz);
    }
    let built = 0;
    while (this.queue.length && built < budget) {
      const { cx, cz } = this.queue.shift();
      if (this.chunks.has(this.key(cx, cz))) continue;
      this._buildChunk(cx, cz);
      built++;
    }
    this._updateShakes(dt);
    return built;
  }

  _refresh(ccx, ccz) {
    this.center = { cx: ccx, cz: ccz };
    const R = this.viewRadius;
    const need = [];
    for (let dz = -R; dz <= R; dz++) {
      for (let dx = -R; dx <= R; dx++) {
        if (dx * dx + dz * dz > (R + 0.5) * (R + 0.5)) continue;
        const cx = ccx + dx;
        const cz = ccz + dz;
        if (!this.chunks.has(this.key(cx, cz))) need.push({ cx, cz, d: dx * dx + dz * dz });
      }
    }
    need.sort((a, b) => a.d - b.d);
    this.queue = need;

    const unloadR = (R + 1.5) * (R + 1.5);
    for (const [k, ch] of [...this.chunks]) {
      const dx = ch.cx - ccx;
      const dz = ch.cz - ccz;
      if (dx * dx + dz * dz > unloadR) this._disposeChunk(k, ch);
    }
    for (const ch of this.chunks.values()) this._applyLod(ch);
  }

  _chunkDist(ch) {
    if (!this.center) return 0;
    return Math.hypot(ch.cx - this.center.cx, ch.cz - this.center.cz);
  }

  // Valitse jokaiselle esineelle oikea pooli etäisyyden mukaan.
  _poolFor(obj, dist) {
    if (obj.active) return null;
    const def = OBJECT_TYPES[obj.type];
    if (obj.stump) return dist <= 3.5 ? this.stumpPools[obj.type][obj.variant] : null;
    if (dist > def.drawDist + 0.5) return null;
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
    obj.slot = want ? want.add(this._matrixFor(obj)) : -1;
  }

  // Rakenna kaikki lähimmät chunkit heti.
  buildAllNow(px, pz) {
    this.centerKey = null;
    this.update(px, pz, 0, 0);
    while (this.queue.length) this.update(px, pz, 0, 64);
  }

  isReady(px, pz) {
    return this.chunks.has(this.key(Math.floor(px / SIZE), Math.floor(pz / SIZE)));
  }

  // --- Chunkin rakennus ------------------------------------------------------

  _buildChunk(cx, cz) {
    const x0 = cx * SIZE;
    const z0 = cz * SIZE;
    const row = SEG + 1;
    const B = SEG + 3;

    const heights = new Float32Array(B * B);
    const samples = new Array(row * row);
    for (let j = -1; j <= SEG + 1; j++) {
      for (let i = -1; i <= SEG + 1; i++) {
        const inside = i >= 0 && j >= 0 && i <= SEG && j <= SEG;
        const s = sampleTerrain(x0 + i * STEP, z0 + j * STEP, {});
        heights[(j + 1) * B + (i + 1)] = s.h;
        if (inside) samples[j * row + i] = s;
      }
    }

    // Verkko chunkin omissa koordinaateissa (tarkkuus säilyy kaukana keskeltä).
    const positions = new Float32Array(row * row * 3);
    const normals = new Float32Array(row * row * 3);
    const colors = new Float32Array(row * row * 3);
    const uvs = new Float32Array(row * row * 2);
    const col = [0, 0, 0];
    const uvOx = Math.floor(x0 / 3) * 3;
    const uvOz = Math.floor(z0 / 3) * 3;
    let minH = Infinity;
    for (let j = 0; j <= SEG; j++) {
      for (let i = 0; i <= SEG; i++) {
        const v = j * row + i;
        const x = x0 + i * STEP;
        const z = z0 + j * STEP;
        const h = heights[(j + 1) * B + (i + 1)];
        minH = Math.min(minH, h);
        positions[v * 3] = i * STEP;
        positions[v * 3 + 1] = h;
        positions[v * 3 + 2] = j * STEP;

        const hl = heights[(j + 1) * B + i];
        const hr = heights[(j + 1) * B + (i + 2)];
        const hd = heights[j * B + (i + 1)];
        const hu = heights[(j + 2) * B + (i + 1)];
        let nx = hl - hr, ny = 2 * STEP, nz = hd - hu;
        const nl = Math.hypot(nx, ny, nz);
        nx /= nl; ny /= nl; nz /= nl;
        normals[v * 3] = nx;
        normals[v * 3 + 1] = ny;
        normals[v * 3 + 2] = nz;

        groundColor(x, z, samples[v], 1 - ny, col);
        colors[v * 3] = col[0];
        colors[v * 3 + 1] = col[1];
        colors[v * 3 + 2] = col[2];
        uvs[v * 2] = (x - uvOx) / 3;
        uvs[v * 2 + 1] = (z - uvOz) / 3;
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
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
    if (minH < WATER_LEVEL) {
      water = new THREE.Mesh(this.waterGeo, this.materials.water);
      water.position.set(x0 + SIZE / 2, WATER_LEVEL, z0 + SIZE / 2);
      water.updateMatrix();
      water.matrixAutoUpdate = false;
      water.renderOrder = 1;
      this.scene.add(water);
    }

    const chunk = { cx, cz, mesh, water, objects: [], colliders: [], decor: null };
    this._spawnObjects(chunk);
    this.chunks.set(this.key(cx, cz), chunk);
    this._applyLod(chunk);
    return chunk;
  }

  _spawnObjects(chunk) {
    const { cx, cz } = chunk;
    const x0 = cx * SIZE;
    const z0 = cz * SIZE;
    const s = {};
    const seed = getWorldSeed();
    for (let t = 0; t < OBJECT_TYPE_KEYS.length; t++) {
      const type = OBJECT_TYPE_KEYS[t];
      const def = OBJECT_TYPES[type];
      if (def.decorative) continue;
      const rand = mulberry32(hashSeed(seed, cx, cz, t + 1));
      const maxD = Math.max(...Object.values(def.density));
      const candidates = Math.floor(maxD) + (rand() < maxD % 1 ? 1 : 0);
      for (let i = 0; i < candidates; i++) {
        const x = x0 + rand() * SIZE;
        const z = z0 + rand() * SIZE;
        const r1 = rand(), r2 = rand(), r3 = rand(), r4 = rand();
        const id = `${cx},${cz},${type},${i}`;
        const isStump = this.stumps.has(id);
        if (this.removed.has(id) && !isStump) continue;
        sampleTerrain(x, z, s);
        let p = 0;
        for (const b of BIOME_KEYS) p += (def.density[b] || 0) * s[b];
        if (r1 >= p / maxD) continue;
        if (s.h < WATER_LEVEL + 0.15) continue;
        if (def.maxSlope < 1 && this._slope(x, z, s.h) > def.maxSlope) continue;

        const obj = {
          id,
          type,
          x,
          y: s.h - (def.kind === 'pickup' ? 0.02 : 0.05),
          z,
          rot: r2 * Math.PI * 2,
          scale: def.scale[0] + r3 * (def.scale[1] - def.scale[0]),
          variant: Math.floor(r4 * this.pools[type].near.length),
          hp: def.harvest?.hp ?? 1,
          chunk,
          slot: -1,
          pool: null,
          active: null,
          stump: isStump,
        };
        chunk.objects.push(obj);
        const cr = isStump ? 0.25 : def.collider;
        if (cr > 0) chunk.colliders.push({ x, z, r: cr * obj.scale, obj });
      }
    }
  }

  // Koriste-esineet (ruoho) vain lähimpiin chunkeihin.
  _setDecor(chunk, on) {
    if (on && !chunk.decor) {
      const x0 = chunk.cx * SIZE;
      const z0 = chunk.cz * SIZE;
      const s = {};
      chunk.decor = [];
      DECOR_TYPES.forEach((type, ti) => {
        const def = OBJECT_TYPES[type];
        const rand = mulberry32(hashSeed(getWorldSeed(), chunk.cx, chunk.cz, 900 + ti));
        const maxD = Math.max(...Object.values(def.density));
        const pools = this.pools[type].near;
        for (let i = 0; i < maxD; i++) {
          const x = x0 + rand() * SIZE;
          const z = z0 + rand() * SIZE;
          const r1 = rand(), r2 = rand(), r3 = rand(), r4 = rand();
          sampleTerrain(x, z, s);
          let p = 0;
          for (const b of BIOME_KEYS) p += (def.density[b] || 0) * s[b];
          if (r1 >= p / maxD) continue;
          if (s.h < WATER_LEVEL + 0.05) continue;
          const pool = pools[Math.floor(r4 * pools.length)];
          const sc = def.scale[0] + r3 * (def.scale[1] - def.scale[0]);
          _p.set(x, s.h - 0.03, z);
          _q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, r2 * Math.PI * 2);
          _s.set(sc, sc * (0.8 + s.mare * 0.5), sc);
          _m.compose(_p, _q, _s);
          chunk.decor.push([pool, pool.add(_m)]);
        }
      });
    } else if (!on && chunk.decor) {
      for (const [pool, slot] of chunk.decor) pool.remove(slot);
      chunk.decor = null;
    }
  }

  _slope(x, z, h) {
    const nx = h - heightAt(x + 1, z);
    const nz = h - heightAt(x, z + 1);
    return 1 - 1 / Math.hypot(nx, 1, nz);
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
  toStump(obj) {
    if (obj.active) {
      this.scene.remove(obj.active);
      obj.active = null;
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
