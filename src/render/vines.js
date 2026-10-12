// Sessio 27: liaanien fysiikka (käyttäjä: köynnösten pitää heilua tuulessa,
// heilahtaa kun pää osuu niihin ja liikkua oikein, kun puu kaadetaan).
//
// Jokainen liaani on köysi (Verlet-integrointi, pituusrajoitteet): yläpää on
// kiinni puun oksassa, alapää joko maassa (löysä kaari) tai vapaana
// (riippuu suoraan). Puumallit kertovat liaanien kiinnityskohdat
// (geometry.userData.vines); tämä järjestelmä luo köydet pelaajan lähellä
// oleville puille ja piirtää ne yhtenä verkkona.
// - Tuuli heiluttaa (puuskittain), pelaajan pää ja vartalo työntävät sivuun.
// - Kun puu kaatuu, yläpää seuraa kaatuvaa latvaa; maahan kiinnittynyt pää
//   repeää irti, kun köysi kiristyy liikaa. Kaatunut runko kantaa liaaneja,
//   kunnes se pilkotaan; sitten ne putoavat ja häviävät.
import * as THREE from 'three';
import { windUniforms } from './materials.js';
import { OBJECT_TYPES } from '../world/objectTypes.js';

const N = 11;            // pisteitä köydessä
const SIDES = 5;         // putken sivut
const LEAVES = 7;        // lehtiä köyttä kohti
const MAX_VINES = 260;
const RADIUS = 46;       // m: näin lähellä olevien puiden liaanit näytetään
const SIM_RADIUS = 26;   // m: näin lähellä simuloidaan joka ruudulla
const GRAV = -9.8;
const ITER = 6;

const VPR = N * SIDES + LEAVES * 4;      // verteksejä köyttä kohti
const IPR = (N - 1) * SIDES * 6 + LEAVES * 6;

const _v = new THREE.Vector3();
const _t = new THREE.Vector3();
const _n = new THREE.Vector3();
const _b = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _c = new THREE.Color();
const _pn = new THREE.Vector3();

function hash(n) {
  const s = Math.sin(n * 127.1) * 43758.5453;
  return s - Math.floor(s);
}

class Rope {
  constructor(spec, seed) {
    this.spec = spec;
    this.p = new Float32Array(N * 3);
    this.q = new Float32Array(N * 3); // edellinen paikka
    this.rest = spec.len / (N - 1);
    this.r = spec.r;
    this.pin = null;       // alapään kiinnitys maahan (maailma) tai null
    this.ground = 0;
    this.seed = seed;
    this.phase = hash(seed) * 6.28;
    this.fade = 1;
    this.free = false;     // yläpää irti (puu pilkottu)
    this.age = 0;
    this.sleep = 0;
  }
}

export class Vines {
  constructor(scene, world, models) {
    this.world = world;
    this.models = models;
    this.sets = new Map();   // obj.id -> { obj, log, cut, ropes }
    this.loose = [];         // irronneet köydet (putoavat ja häviävät)
    this.scanT = 0;
    this.time = 0;
    this.enabled = true;
    const geo = new THREE.BufferGeometry();
    this.pos = new Float32Array(MAX_VINES * VPR * 3);
    this.nrm = new Float32Array(MAX_VINES * VPR * 3);
    this.col = new Float32Array(MAX_VINES * VPR * 3);
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('normal', new THREE.BufferAttribute(this.nrm, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('color', new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    const idx = new Uint32Array(MAX_VINES * IPR);
    for (let v = 0; v < MAX_VINES; v++) {
      const b = v * VPR;
      let o = v * IPR;
      for (let i = 0; i < N - 1; i++) {
        for (let s = 0; s < SIDES; s++) {
          const a = b + i * SIDES + s, a2 = b + i * SIDES + ((s + 1) % SIDES);
          const c = a + SIDES, c2 = a2 + SIDES;
          idx[o++] = a; idx[o++] = c; idx[o++] = a2;
          idx[o++] = a2; idx[o++] = c; idx[o++] = c2;
        }
      }
      const lb = b + N * SIDES;
      for (let l = 0; l < LEAVES; l++) {
        const k = lb + l * 4;
        idx[o++] = k; idx[o++] = k + 1; idx[o++] = k + 2;
        idx[o++] = k; idx[o++] = k + 2; idx[o++] = k + 3;
      }
    }
    geo.setIndex(new THREE.BufferAttribute(idx, 1));
    geo.setDrawRange(0, 0);
    this.geo = geo;
    this.material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.88, metalness: 0, side: THREE.DoubleSide });
    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.frustumCulled = false;
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    scene.add(this.mesh);
  }

  _specsFor(obj) {
    const def = OBJECT_TYPES[obj.type];
    if (!def || def.kind !== 'tree') return null;
    const list = this.models.world[def.model];
    const g = list && list[obj.variant];
    return g && g.userData.vines && g.userData.vines.length ? g.userData.vines : null;
  }

  // Yläpään kiinnityskohta maailmassa.
  _anchor(set, spec, out) {
    if (set.log) {
      out.fromArray(spec.top).sub(set.cut).applyMatrix4(set.log.mesh.matrixWorld);
    } else {
      out.fromArray(spec.top).applyMatrix4(set.matrix);
    }
    return out;
  }

  _makeSet(obj, specs) {
    const set = { obj, log: null, cut: null, matrix: this.world.matrixOf(obj), ropes: [] };
    specs.forEach((spec, i) => {
      const rope = new Rope(spec, (obj.x * 13.1 + obj.z * 7.7 + i * 3.3) % 1000);
      rope.r = spec.r * obj.scale;
      rope.rest = (spec.len * obj.scale) / (N - 1);
      const a = this._anchor(set, spec, _v);
      rope.ground = obj.y;
      let ex, ey, ez;
      if (spec.end) {
        _t.fromArray(spec.end).applyMatrix4(set.matrix);
        rope.pin = _t.clone();
        ex = _t.x; ey = _t.y; ez = _t.z;
      } else {
        ex = a.x; ey = a.y - spec.len * obj.scale; ez = a.z;
      }
      for (let k = 0; k < N; k++) {
        const f = k / (N - 1);
        rope.p[k * 3] = a.x + (ex - a.x) * f;
        rope.p[k * 3 + 1] = a.y + (ey - a.y) * f;
        rope.p[k * 3 + 2] = a.z + (ez - a.z) * f;
      }
      rope.q.set(rope.p);
      // Lepoasento: muutama askel painovoimalla (löysä kaari tai suora riippuminen).
      for (let s = 0; s < 40; s++) this._step(set, rope, 1 / 30, null, 0);
      rope.q.set(rope.p);
      set.ropes.push(rope);
    });
    return set;
  }

  // Puu kaatui: liaanit seuraavat kaatuvaa latvaa (fallen.js).
  bindToLog(obj, log, cutLocal) {
    const set = this.sets.get(obj.id);
    if (!set) return;
    set.log = log;
    set.cut = cutLocal.clone();
    log.vineSet = set;
  }

  // Kaatunut runko pilkottiin: liaanit irtoavat ja putoavat.
  releaseLog(log) {
    const set = log.vineSet;
    if (!set) return;
    for (const r of set.ropes) { r.free = true; r.pin = null; this.loose.push(r); }
    set.ropes = [];
    this.sets.delete(set.obj.id);
    log.vineSet = null;
  }

  clear() {
    this.sets.clear();
    this.loose = [];
  }

  _scan(px, pz) {
    const seen = new Set();
    this.world.forEachChunkNear(px, pz, RADIUS, (ch) => {
      for (const obj of ch.objects) {
        if (obj.stump) continue;
        const dx = obj.x - px, dz = obj.z - pz;
        if (dx * dx + dz * dz > RADIUS * RADIUS) continue;
        const specs = this._specsFor(obj);
        if (!specs) continue;
        seen.add(obj.id);
        if (!this.sets.has(obj.id)) this.sets.set(obj.id, this._makeSet(obj, specs));
      }
    });
    for (const [id, set] of this.sets) {
      if (set.log) {
        // Kaatunut runko: pidetään, kunnes se poistuu tai jää kauas.
        const p = set.log.pivot.position;
        if ((p.x - px) ** 2 + (p.z - pz) ** 2 > (RADIUS + 15) ** 2) { set.log.vineSet = null; this.sets.delete(id); }
      } else if (!seen.has(id)) {
        this.sets.delete(id);
      }
    }
  }

  // Yksi aika-askel köydelle. player = { x, y, z } tai null.
  _step(set, rope, dt, player, wind) {
    const p = rope.p, q = rope.q;
    const dt2 = dt * dt;
    const damp = rope.free ? 0.99 : 0.975;
    const wx = windUniforms.uWindDir.value.x, wz = windUniforms.uWindDir.value.y;
    for (let k = 0; k < N; k++) {
      const i = k * 3;
      const f = k / (N - 1);
      // Tuuli: puuskat ja pieni pyörre (eri vaihe joka köydellä ja pisteellä).
      const g = wind * (0.55 + 0.45 * Math.sin(this.time * 1.3 + rope.phase + k * 0.35)) * (0.3 + 0.7 * f);
      const swirl = wind * 0.35 * Math.sin(this.time * 2.1 + rope.phase * 2 + k * 0.6);
      const ax = wx * g * 3.2 - wz * swirl;
      const az = wz * g * 3.2 + wx * swirl;
      const vx = (p[i] - q[i]) * damp, vy = (p[i + 1] - q[i + 1]) * damp, vz = (p[i + 2] - q[i + 2]) * damp;
      q[i] = p[i]; q[i + 1] = p[i + 1]; q[i + 2] = p[i + 2];
      p[i] += vx + ax * dt2;
      p[i + 1] += vy + GRAV * dt2;
      p[i + 2] += vz + az * dt2;
    }
    const anchor = rope.free ? null : this._anchor(set, rope.spec, _b);
    for (let it = 0; it < ITER; it++) {
      if (anchor) { p[0] = anchor.x; p[1] = anchor.y; p[2] = anchor.z; }
      if (rope.pin) {
        const e = (N - 1) * 3;
        p[e] = rope.pin.x; p[e + 1] = rope.pin.y; p[e + 2] = rope.pin.z;
      }
      for (let k = 0; k < N - 1; k++) {
        const i = k * 3, j = i + 3;
        const dx = p[j] - p[i], dy = p[j + 1] - p[i + 1], dz = p[j + 2] - p[i + 2];
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-6;
        const diff = (d - rope.rest) / d;
        // Kiinnitetyt päät eivät liiku.
        const wi = (k === 0 && anchor) ? 0 : 1;
        const wj = (k + 1 === N - 1 && rope.pin) ? 0 : 1;
        const ws = wi + wj;
        if (!ws) continue;
        const ci = (wi / ws) * diff, cj = (wj / ws) * diff;
        p[i] += dx * ci; p[i + 1] += dy * ci; p[i + 2] += dz * ci;
        p[j] -= dx * cj; p[j + 1] -= dy * cj; p[j + 2] -= dz * cj;
      }
    }
    // Maa ja pelaaja (pää ja vartalo kapselina).
    for (let k = 1; k < N; k++) {
      const i = k * 3;
      if (p[i + 1] < rope.ground + 0.03) p[i + 1] = rope.ground + 0.03;
      if (player) {
        const cy = Math.min(Math.max(p[i + 1], player.y + 0.4), player.y + 1.75);
        const dx = p[i] - player.x, dy = p[i + 1] - cy, dz = p[i + 2] - player.z;
        const d2 = dx * dx + dy * dy + dz * dz, R = 0.38 + rope.r;
        if (d2 < R * R) {
          const d = Math.sqrt(d2) || 1e-4;
          const push = (R - d) / d;
          p[i] += dx * push; p[i + 1] += dy * push * 0.5; p[i + 2] += dz * push;
        }
      }
    }
    // Liian kireä maahan kiinnitys repeää (puu kaatuu).
    if (rope.pin && anchor) {
      const e = (N - 1) * 3;
      const d = Math.hypot(anchor.x - p[e], anchor.y - p[e + 1], anchor.z - p[e + 2]);
      if (d > rope.rest * (N - 1) * 1.02) rope.pin = null;
    }
  }

  update(dt, player) {
    if (!this.enabled) { this.geo.setDrawRange(0, 0); return; }
    dt = Math.min(dt, 1 / 30);
    this.time += dt;
    this.scanT -= dt;
    if (this.scanT <= 0) {
      this.scanT = 0.5;
      this._scan(player.x, player.z);
    }
    const wind = 0.25 + windUniforms.uWindStrength.value * 1.6;
    const pl = { x: player.x, y: player.y, z: player.z };
    let n = 0;
    const draw = (set, rope) => {
      if (n >= MAX_VINES) return;
      const p0x = rope.p[0], p0z = rope.p[2];
      const near = (p0x - pl.x) ** 2 + (p0z - pl.z) ** 2 < SIM_RADIUS * SIM_RADIUS;
      const moving = set && set.log && set.log.state === 'falling';
      if (near || moving || rope.free) {
        // Kaatuessa pienemmät askeleet (yläpää liikkuu nopeasti).
        const sub = moving ? 3 : 1;
        for (let s = 0; s < sub; s++) this._step(set, rope, dt / sub, near ? pl : null, wind);
      }
      this._write(rope, n++);
    };
    for (const set of this.sets.values()) for (const rope of set.ropes) draw(set, rope);
    this.loose = this.loose.filter((rope) => {
      rope.age += dt;
      if (rope.age > 6) return false;
      rope.fade = Math.max(0, 1 - Math.max(0, rope.age - 4) / 2);
      draw(null, rope);
      return true;
    });
    this.geo.setDrawRange(0, n * IPR);
    for (const name of ['position', 'normal', 'color']) {
      const a = this.geo.attributes[name];
      a.clearUpdateRanges();
      a.addUpdateRange(0, n * VPR * 3);
      a.needsUpdate = true;
    }
  }

  // Köyden putki ja lehdet verkkoon paikkaan v.
  _write(rope, v) {
    const p = rope.p, P = this.pos, Nn = this.nrm, C = this.col;
    const base = v * VPR;
    const bark = _c.setHex(0x6b5a3a);
    const shrink = rope.fade;
    let havePrev = false;
    for (let k = 0; k < N; k++) {
      const i = k * 3;
      const a = Math.max(0, k - 1) * 3, b = Math.min(N - 1, k + 1) * 3;
      _t.set(p[b] - p[a], p[b + 1] - p[a + 1], p[b + 2] - p[a + 2]).normalize();
      // Kehyksen sivuvektori: edellinen projisoituna (ei kiertymistä).
      if (havePrev) _n.copy(_pn).addScaledVector(_t, -_pn.dot(_t));
      else _n.copy(Math.abs(_t.y) > 0.9 ? _v.set(1, 0, 0) : _up).cross(_t);
      if (_n.lengthSq() < 1e-6) _n.set(1, 0, 0);
      _n.normalize();
      _pn.copy(_n);
      havePrev = true;
      _b.crossVectors(_t, _n);
      const r = rope.r * (1 - 0.35 * (k / (N - 1))) * shrink;
      const shade = 0.85 + 0.15 * hash(rope.seed + k);
      for (let s = 0; s < SIDES; s++) {
        const ang = (s / SIDES) * Math.PI * 2 + k * 0.5;
        const cx = Math.cos(ang), sx = Math.sin(ang);
        const nx = _n.x * cx + _b.x * sx, ny = _n.y * cx + _b.y * sx, nz = _n.z * cx + _b.z * sx;
        const o = (base + k * SIDES + s) * 3;
        P[o] = p[i] + nx * r; P[o + 1] = p[i + 1] + ny * r; P[o + 2] = p[i + 2] + nz * r;
        Nn[o] = nx; Nn[o + 1] = ny; Nn[o + 2] = nz;
        const kk = shade * (0.85 + 0.15 * cx);
        C[o] = bark.r * kk; C[o + 1] = bark.g * kk; C[o + 2] = bark.b * kk;
      }
    }
    // Lehdet köyden yläosassa (läpinäkymättömiä, ei leijuvia pikseleitä).
    const leaf = _c.setHex(0x3f6a26);
    for (let l = 0; l < LEAVES; l++) {
      const k = 1 + Math.floor(l * (N - 3) / (LEAVES - 1) * (0.55 + 0.45 * hash(rope.seed + l)));
      const i = Math.min(N - 2, k) * 3, j = i + 3;
      _t.set(p[j] - p[i], p[j + 1] - p[i + 1], p[j + 2] - p[i + 2]).normalize();
      const ang = rope.phase * 3 + l * 2.4;
      _n.set(Math.cos(ang), 0, Math.sin(ang));
      const sz = (0.17 + 0.09 * hash(rope.seed + l * 7)) * shrink;
      const cx = p[i] + (p[j] - p[i]) * 0.5, cy = p[i + 1] + (p[j + 1] - p[i + 1]) * 0.5, cz = p[i + 2] + (p[j + 2] - p[i + 2]) * 0.5;
      // Lehti riippuu ulospäin ja alas (pystyasento näkyy sivulta).
      const lx = _n.x * 0.6, ly = -0.8, lz = _n.z * 0.6;
      const wx = -_n.z, wz = _n.x;
      const pts = [
        [cx, cy, cz],
        [cx + lx * sz * 0.5 + wx * sz * 0.24, cy + ly * sz * 0.5, cz + lz * sz * 0.5 + wz * sz * 0.24],
        [cx + lx * sz, cy + ly * sz, cz + lz * sz],
        [cx + lx * sz * 0.5 - wx * sz * 0.24, cy + ly * sz * 0.5, cz + lz * sz * 0.5 - wz * sz * 0.24],
      ];
      const k2 = 0.85 + 0.3 * hash(rope.seed + l * 3);
      for (let c = 0; c < 4; c++) {
        const o = (base + N * SIDES + l * 4 + c) * 3;
        P[o] = pts[c][0]; P[o + 1] = pts[c][1]; P[o + 2] = pts[c][2];
        Nn[o] = 0; Nn[o + 1] = 1; Nn[o + 2] = 0;
        C[o] = leaf.r * k2; C[o + 1] = leaf.g * k2; C[o + 2] = leaf.b * k2;
      }
    }
  }
}
