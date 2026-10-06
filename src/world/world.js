// Avoin maailma chunkeina: maasto, vesi ja esineet ladataan pelaajan ympärille
// ja puretaan kauempaa. Generointi on deterministista, joten poistetut esineet
// (kerätyt risut, kaadetut puut) muistetaan pelkillä tunnisteilla.
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { mulberry32, hashSeed } from '../noise.js';
import { sampleTerrain, heightAt, groundColor, WATER_LEVEL, BIOME_KEYS } from './terrain.js';
import { OBJECT_TYPES, OBJECT_TYPE_KEYS } from './objectTypes.js';
import { InstancePool } from './instancePool.js';

const SIZE = CONFIG.chunkSize;
const SEG = CONFIG.chunkSegments;
const STEP = SIZE / SEG;

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
    this.centerKey = null;
    this.terrainIndex = createTerrainIndex();
    this.waterGeo = new THREE.PlaneGeometry(SIZE, SIZE, 1, 1).rotateX(-Math.PI / 2);
    this.shakes = [];
    this.extraColliders = []; // pelaajan rakennelmat

    // Yksi pooli per (tyyppi, mallivariantti).
    this.pools = {};
    for (const type of OBJECT_TYPE_KEYS) {
      const def = OBJECT_TYPES[type];
      const variants = models.world[def.model];
      this.pools[type] = variants.map(
        (geo) =>
          new InstancePool(scene, geo, materials[def.material], {
            capacity: def.decorative ? 4096 : 512,
            castShadow: def.castShadow,
            receiveShadow: true,
          }),
      );
    }
  }

  key(cx, cz) {
    return `${cx},${cz}`;
  }

  // --- Streamaus -------------------------------------------------------------

  update(px, pz, dt, budget = CONFIG.chunksPerFrame) {
    const ccx = Math.floor(px / SIZE);
    const ccz = Math.floor(pz / SIZE);
    const ck = this.key(ccx, ccz);
    if (ck !== this.centerKey) {
      this.centerKey = ck;
      this._refreshQueue(ccx, ccz);
    }
    let built = 0;
    while (this.queue.length && built < budget) {
      const { cx, cz } = this.queue.shift();
      const k = this.key(cx, cz);
      if (this.chunks.has(k)) continue;
      this._buildChunk(cx, cz);
      built++;
    }
    this._updateShakes(dt);
    return built;
  }

  // Rakenna kaikki lähimmät chunkit heti (pelin alussa / teleportissa).
  buildAllNow(px, pz) {
    this.centerKey = null;
    this.update(px, pz, 0, 0);
    while (this.queue.length) this.update(px, pz, 0, 64);
  }

  isReady(px, pz) {
    const k = this.key(Math.floor(px / SIZE), Math.floor(pz / SIZE));
    return this.chunks.has(k);
  }

  _refreshQueue(ccx, ccz) {
    this.center = { cx: ccx, cz: ccz };
    const R = CONFIG.viewRadius;
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
    for (const [k, ch] of this.chunks) {
      const dx = ch.cx - ccx;
      const dz = ch.cz - ccz;
      if (dx * dx + dz * dz > unloadR) this._disposeChunk(k, ch);
    }

    // Ruoho vain lähimpiin chunkeihin.
    const G = CONFIG.grassRadius;
    for (const ch of this.chunks.values()) {
      const dx = ch.cx - ccx;
      const dz = ch.cz - ccz;
      this._setGrass(ch, dx * dx + dz * dz <= (G + 0.5) * (G + 0.5));
    }
  }

  // --- Chunkin rakennus ------------------------------------------------------

  _buildChunk(cx, cz) {
    const x0 = cx * SIZE;
    const z0 = cz * SIZE;
    const row = SEG + 1;
    const B = SEG + 3; // reunan kanssa normaaleja varten

    const heights = new Float32Array(B * B);
    const samples = new Array(row * row);
    for (let j = -1; j <= SEG + 1; j++) {
      for (let i = -1; i <= SEG + 1; i++) {
        const x = x0 + i * STEP;
        const z = z0 + j * STEP;
        const inside = i >= 0 && j >= 0 && i <= SEG && j <= SEG;
        const s = sampleTerrain(x, z, inside ? {} : undefined);
        heights[(j + 1) * B + (i + 1)] = s.h;
        if (inside) samples[j * row + i] = s;
      }
    }

    const positions = new Float32Array(row * row * 3);
    const normals = new Float32Array(row * row * 3);
    const colors = new Float32Array(row * row * 3);
    const uvs = new Float32Array(row * row * 2);
    const col = [0, 0, 0];
    let minH = Infinity;
    for (let j = 0; j <= SEG; j++) {
      for (let i = 0; i <= SEG; i++) {
        const v = j * row + i;
        const x = x0 + i * STEP;
        const z = z0 + j * STEP;
        const h = heights[(j + 1) * B + (i + 1)];
        minH = Math.min(minH, h);
        positions[v * 3] = x;
        positions[v * 3 + 1] = h;
        positions[v * 3 + 2] = z;

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
        uvs[v * 2] = x / 3;
        uvs[v * 2 + 1] = z / 3;
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
    mesh.receiveShadow = true;
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

    const chunk = { cx, cz, mesh, water, objects: [], colliders: [], grass: null, grassSlots: null };
    this._spawnObjects(chunk);
    this.chunks.set(this.key(cx, cz), chunk);
    if (this.center) {
      const dx = cx - this.center.cx;
      const dz = cz - this.center.cz;
      const G = CONFIG.grassRadius + 0.5;
      this._setGrass(chunk, dx * dx + dz * dz <= G * G);
    }
    return chunk;
  }

  _spawnObjects(chunk) {
    const { cx, cz } = chunk;
    const x0 = cx * SIZE;
    const z0 = cz * SIZE;
    const s = {};
    for (let t = 0; t < OBJECT_TYPE_KEYS.length; t++) {
      const type = OBJECT_TYPE_KEYS[t];
      const def = OBJECT_TYPES[type];
      if (def.decorative) continue;
      const rand = mulberry32(hashSeed(CONFIG.seed, cx, cz, t + 1));
      const maxD = Math.max(...Object.values(def.density));
      const candidates = Math.floor(maxD) + (rand() < maxD % 1 ? 1 : 0);
      for (let i = 0; i < candidates; i++) {
        const x = x0 + rand() * SIZE;
        const z = z0 + rand() * SIZE;
        const r1 = rand();
        const r2 = rand();
        const r3 = rand();
        const r4 = rand();
        const id = `${cx},${cz},${type},${i}`;
        sampleTerrain(x, z, s);
        let p = 0;
        for (const b of BIOME_KEYS) p += (def.density[b] || 0) * s[b];
        if (r1 >= p / maxD) continue;
        if (s.h < WATER_LEVEL + 0.15) continue;
        if (def.maxSlope < 1 && this._slope(x, z, s.h) > def.maxSlope) continue;
        if (this.removed.has(id)) continue;

        const variants = this.pools[type].length;
        const obj = {
          id,
          type,
          x,
          y: s.h,
          z,
          rot: r2 * Math.PI * 2,
          scale: def.scale[0] + r3 * (def.scale[1] - def.scale[0]),
          variant: Math.floor(r4 * variants),
          hp: def.harvest?.hp ?? 1,
          chunk,
          slot: -1,
        };
        // Pienet esineet painuvat hieman maahan; puut syvemmälle rinteessä.
        obj.y -= type === 'stick' || type === 'stone' ? 0.02 : 0.05;
        obj.slot = this.pools[type][obj.variant].add(this._matrixFor(obj));
        chunk.objects.push(obj);
        if (def.collider > 0) chunk.colliders.push({ x, z, r: def.collider * obj.scale, obj });
      }
    }
  }

  _setGrass(chunk, on) {
    if (on && !chunk.grassSlots) {
      const def = OBJECT_TYPES.grass;
      const rand = mulberry32(hashSeed(CONFIG.seed, chunk.cx, chunk.cz, 999));
      const maxD = Math.max(...Object.values(def.density));
      const x0 = chunk.cx * SIZE;
      const z0 = chunk.cz * SIZE;
      const s = {};
      chunk.grassSlots = [];
      for (let i = 0; i < maxD; i++) {
        const x = x0 + rand() * SIZE;
        const z = z0 + rand() * SIZE;
        const r1 = rand(), r2 = rand(), r3 = rand(), r4 = rand();
        sampleTerrain(x, z, s);
        let p = 0;
        for (const b of BIOME_KEYS) p += (def.density[b] || 0) * s[b];
        if (r1 >= p / maxD) continue;
        if (s.h < WATER_LEVEL + 0.05) continue;
        const v = Math.floor(r4 * this.pools.grass.length);
        const sc = def.scale[0] + r3 * (def.scale[1] - def.scale[0]);
        _p.set(x, s.h - 0.03, z);
        _q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, r2 * Math.PI * 2);
        _s.set(sc, sc * (0.8 + s.mare * 0.5), sc);
        _m.compose(_p, _q, _s);
        chunk.grassSlots.push([v, this.pools.grass[v].add(_m)]);
      }
    } else if (!on && chunk.grassSlots) {
      for (const [v, slot] of chunk.grassSlots) this.pools.grass[v].remove(slot);
      chunk.grassSlots = null;
    }
  }

  _slope(x, z, h) {
    const hx = heightAt(x + 1, z);
    const hz = heightAt(x, z + 1);
    const nx = h - hx, nz = h - hz;
    return 1 - 1 / Math.hypot(nx, 1, nz);
  }

  _matrixFor(obj, wobble = 0) {
    _p.set(obj.x, obj.y, obj.z);
    _e.set(wobble * 0.7, obj.rot, wobble);
    _q.setFromEuler(_e);
    _s.setScalar(obj.scale);
    return _m.compose(_p, _q, _s);
  }

  _disposeChunk(k, ch) {
    this.scene.remove(ch.mesh);
    ch.mesh.geometry.dispose();
    if (ch.water) this.scene.remove(ch.water);
    for (const obj of ch.objects) this.pools[obj.type][obj.variant].remove(obj.slot);
    this._setGrass(ch, false);
    this.chunks.delete(k);
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
        if (!def.hit) continue;
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
    const r2 = (radius + 2) * (radius + 2);
    for (const c of this.extraColliders) {
      if ((c.x - x) ** 2 + (c.z - z) ** 2 < r2) out.push(c);
    }
    return out;
  }

  removeObject(obj) {
    const ch = obj.chunk;
    this.pools[obj.type][obj.variant].remove(obj.slot);
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
      const pool = this.pools[s.obj.type][s.obj.variant];
      if (s.t >= DUR) {
        pool.set(s.obj.slot, this._matrixFor(s.obj));
        return false;
      }
      const k = 1 - s.t / DUR;
      const w = Math.sin(s.t * 45) * 0.06 * k * s.strength;
      pool.set(s.obj.slot, this._matrixFor(s.obj, w));
      return true;
    });
  }

  // Poistettujen esineiden tunnisteet tallennusta varten.
  serialize() {
    return [...this.removed];
  }

  load(removedIds) {
    this.removed = new Set(removedIds || []);
  }
}
