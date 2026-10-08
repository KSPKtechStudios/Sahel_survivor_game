// Sessio 27: kookospähkinät palmujen latvassa (käyttäjä: niitä saa
// kaatamalla tai ravistelemalla palmua, ja ne kasvavat takaisin).
//
// Palmumallit kertovat pähkinöiden paikat (geometry.userData.fruit).
// Pähkinät piirretään yhtenä instanssiverkkona pelaajan lähellä olevista
// palmuista; jokaisen palmun jäljellä oleva määrä lasketaan pelin kellosta:
// otetun tilalle kasvaa uusi REGROW_H pelitunnin välein. Tila tallentuu.
import * as THREE from 'three';
import { OBJECT_TYPES } from '../world/objectTypes.js';

const MAX = 700;
const RADIUS = 70;
const REGROW_H = 6;     // pelitunteja yhtä pähkinää kohti
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
const _c = new THREE.Color();
const RIPE = [0x5e7a2a, 0x6f7f2c, 0x8a7a2e, 0x6a4a28];

function nutGeometry() {
  const g = new THREE.SphereGeometry(0.15, 10, 8);
  g.scale(1, 1.15, 0.95);
  // Kuidun juovat ja tumma kärki värityksenä.
  const p = g.attributes.position;
  const col = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const a = Math.atan2(z, x);
    const k = (0.82 + 0.18 * Math.abs(Math.sin(a * 3))) * (y < -0.13 ? 0.6 : 1);
    col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = k;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}

export class Coconuts {
  constructor(scene, world, models, drops) {
    this.world = world;
    this.models = models;
    this.drops = drops;
    this.state = new Map();   // obj.id -> { n, h } (n jäljellä hetkellä h pelitunteina)
    this.near = [];           // lähellä olevat palmut { obj, pts }
    this.scanT = 0;
    this.mesh = new THREE.InstancedMesh(nutGeometry(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.62, metalness: 0 }), MAX);
    this.mesh.count = 0;
    this.mesh.castShadow = true;
    this.mesh.frustumCulled = false;
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(this.mesh);
    this.dirty = true;
  }

  _points(obj) {
    const def = OBJECT_TYPES[obj.type];
    if (!def || def.kind !== 'tree') return null;
    const g = this.models.world[def.model] && this.models.world[def.model][obj.variant];
    const f = g && g.userData.fruit;
    return f && f.length ? f : null;
  }

  has(obj) { return !!this._points(obj); }

  // Montako pähkinää palmussa on nyt (nowH = pelin kello tunteina).
  count(obj, nowH) {
    const pts = this._points(obj);
    if (!pts) return 0;
    const s = this.state.get(obj.id);
    if (!s) return pts.length;
    return Math.min(pts.length, s.n + Math.floor(Math.max(0, nowH - s.h) / REGROW_H));
  }

  _take(obj, nowH, k) {
    const pts = this._points(obj);
    const have = this.count(obj, nowH);
    const n = Math.min(k, have);
    if (n <= 0) return 0;
    const left = have - n;
    // Kasvuaika jatkuu siitä, mihin edellinen pähkinä ehti.
    const s = this.state.get(obj.id);
    const partial = s && have < pts.length ? (nowH - s.h) % REGROW_H : 0;
    this.state.set(obj.id, { n: left, h: nowH - partial });
    // Ylimmät pähkinät putoavat ensin (indeksit left..have-1).
    const m = this.world.matrixOf(obj);
    for (let i = left; i < have; i++) {
      const p = pts[i];
      _p.set(p[0], p[1], p[2]).applyMatrix4(m);
      this.drops.spawn('coconut', 1, _p, { spread: 0.25, up: 0.08 });
    }
    this.dirty = true;
    return n;
  }

  // [E] ravistaa palmua: 1–2 pähkinää putoaa.
  shake(obj, nowH) {
    this.world.shake(obj, 0.7);
    return this._take(obj, nowH, 1 + (Math.random() < 0.5 ? 1 : 0));
  }

  // Isku runkoon (kirveellä tai käsin): välillä yksi putoaa.
  onHit(obj, nowH) {
    if (!this.has(obj)) return;
    if (Math.random() < 0.35) this._take(obj, nowH, 1);
  }

  // Palmu kaatui: kaikki jäljellä olevat putoavat.
  onFell(obj, nowH) {
    if (!this.has(obj)) return;
    this._take(obj, nowH, 99);
    this.state.delete(obj.id);
  }

  update(dt, playerPos, nowH) {
    this.scanT -= dt;
    if (this.scanT <= 0) {
      this.scanT = 0.6;
      this.near.length = 0;
      this.world.forEachChunkNear(playerPos.x, playerPos.z, RADIUS, (ch) => {
        for (const obj of ch.objects) {
          if (obj.stump) continue;
          const pts = this._points(obj);
          if (!pts) continue;
          if ((obj.x - playerPos.x) ** 2 + (obj.z - playerPos.z) ** 2 > RADIUS * RADIUS) continue;
          this.near.push({ obj, pts });
        }
      });
      this.dirty = true;
    }
    if (!this.dirty) return;
    this.dirty = false;
    let n = 0;
    for (const { obj, pts } of this.near) {
      const c = this.count(obj, nowH);
      if (!c) continue;
      const m = this.world.matrixOf(obj);
      for (let i = 0; i < c && n < MAX; i++) {
        const p = pts[i];
        _p.set(p[0], p[1], p[2]);
        _e.set(0, 0, p[4]);
        _q.setFromEuler(_e);
        _s.setScalar(p[3]);
        _m.compose(_p, _q, _s).premultiply(m);
        this.mesh.setMatrixAt(n, _m);
        this.mesh.setColorAt(n, _c.setHex(RIPE[p[5]]));
        n++;
      }
    }
    this.mesh.count = n;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  // Kello etenee ilman ruutupäivitystä (pähkinät kasvavat): päivitä silloin tällöin.
  tick() { this.dirty = true; }

  clear() {
    this.state.clear();
    this.near.length = 0;
    this.dirty = true;
  }

  serialize() {
    return [...this.state].map(([id, s]) => [id, s.n, Math.round(s.h * 100) / 100]);
  }

  load(list) {
    this.clear();
    for (const [id, n, h] of list || []) this.state.set(id, { n, h });
  }
}
