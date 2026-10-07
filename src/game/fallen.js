// Kaatuvat ja kaatuneet puut. Puu kaatuu satunnaiseen suuntaan kaatokohdan
// ympäri (painovoima kiihdyttää kaatumista), pomppaa maahan osuessaan ja jää
// makaamaan. Kaatunut runko pitää vielä pilkkoa hakkaamalla; silloin siihen
// tulee lovia ja lopuksi se hajoaa paloiksi ja puut putoavat maahan.
import * as THREE from 'three';
import { heightAt } from '../world/terrain.js';
import { OBJECT_TYPES } from '../world/objectTypes.js';
import { makeChoppable, addNotch, splitTree, trunkAxis } from './treeCut.js';
import { events } from './events.js';

const UP = new THREE.Vector3(0, 1, 0);
const _v = new THREE.Vector3();
const _w = new THREE.Vector3();
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();

export class FallenTrees {
  constructor({ scene, world, models, material, debris, drops, bursts }) {
    Object.assign(this, { scene, world, models, material, debris, drops, bursts });
    this.list = [];
  }

  // Luo kaatuva runko. topGeo = halkaistu yläosa (kaatokohta origossa),
  // cutWorld = kaatokohta maailmassa.
  _create({ type, variant, scale, rot, cutWorld, dir, theta = 0.03, omega = 0.2, hp, topGeo, state = 'falling' }) {
    const def = OBJECT_TYPES[type];
    const geo = makeChoppable(topGeo);
    const pivot = new THREE.Group();
    pivot.position.copy(cutWorld);
    const inner = new THREE.Group();
    inner.rotation.y = rot;
    inner.scale.setScalar(scale);
    const mesh = new THREE.Mesh(geo, this.material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    inner.add(mesh);
    pivot.add(inner);
    this.scene.add(pivot);
    const meta = geo.userData.tree;
    const L = meta.fallLen * scale;
    const log = {
      type, variant, scale, rot, dir: dir.clone().normalize(), theta, omega, state, hp: hp ?? def.log.hp,
      pivot, inner, mesh, L, collider: null, impacted: state !== 'falling',
      axis: new THREE.Vector3().crossVectors(UP, dir).normalize(),
      thetaMax: this._restAngle(cutWorld, dir, L, scale),
      shake: 0,
    };
    this._applyRotation(log);
    if (state !== 'falling') this._makeCollider(log);
    this.list.push(log);
    return log;
  }

  // Missä kulmassa runko lepää maassa (latvus kannattelee hieman).
  _restAngle(cut, dir, L, scale) {
    const reach = L * 0.8;
    const tipX = cut.x + dir.x * reach;
    const tipZ = cut.z + dir.z * reach;
    const rest = heightAt(tipX, tipZ) + 0.55 * scale;
    const c = THREE.MathUtils.clamp((rest - cut.y) / reach, -0.6, 0.6);
    return THREE.MathUtils.clamp(Math.acos(c), 1.1, 2.0);
  }

  _applyRotation(log) {
    log.pivot.quaternion.setFromAxisAngle(log.axis, log.theta);
    if (log.shake > 0) {
      const w = Math.sin(log.shake * 50) * 0.02 * log.shake;
      log.pivot.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(log.dir, w));
    }
    log.pivot.updateMatrixWorld(true);
  }

  // Rungon akseli maailmassa: kaatokohta -> rungon pää.
  _trunkWorld(log, outA, outB) {
    const meta = log.mesh.geometry.userData.tree;
    const ax = trunkAxis({ ...meta, cutY: 0 });
    outA.copy(ax.base);
    outB.copy(ax.base).addScaledVector(ax.axis, Math.min(ax.len, meta.fallLen));
    log.mesh.localToWorld(outA);
    log.mesh.localToWorld(outB);
  }

  _makeCollider(log) {
    this._trunkWorld(log, _a, _b);
    const meta = log.mesh.geometry.userData.tree;
    const r = Math.max(0.2, meta.logR * log.scale);
    if (!log.collider) {
      log.collider = { seg: true, ax: 0, az: 0, bx: 0, bz: 0, r, top: 0, obj: log };
      this.world.extraColliders.push(log.collider);
    }
    Object.assign(log.collider, { ax: _a.x, az: _a.z, bx: _b.x, bz: _b.z, r, top: Math.max(_a.y, _b.y) + r });
  }

  // Puu kaatuu: geometry = hakattu (loveutunut) puu, matrix = sen maailmamatriisi.
  fell(obj, geometry, playerPos) {
    const split = splitTree(geometry);
    const m = new THREE.Matrix4().compose(
      new THREE.Vector3(obj.x, obj.y, obj.z),
      new THREE.Quaternion().setFromAxisAngle(UP, obj.rot),
      new THREE.Vector3(obj.scale, obj.scale, obj.scale),
    );
    const cutWorld = split.cutLocal.clone().applyMatrix4(m);
    // Satunnainen suunta (käyttäjän toive). Pieni painotus poispäin pelaajasta,
    // ettei puu kaadu suoraan päälle.
    const a = Math.random() * Math.PI * 2;
    const dir = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
    const away = _v.set(obj.x - playerPos.x, 0, obj.z - playerPos.z);
    if (away.lengthSq() > 0.01 && dir.dot(away.normalize()) < -0.6) dir.negate();
    const log = this._create({
      type: obj.type, variant: obj.variant, scale: obj.scale, rot: obj.rot, cutWorld, dir, topGeo: split.top,
    });
    const stump = new THREE.Mesh(split.stump, this.material);
    stump.position.set(obj.x, obj.y, obj.z);
    stump.rotation.y = obj.rot;
    stump.scale.setScalar(obj.scale);
    stump.castShadow = true;
    stump.receiveShadow = true;
    this.world.toStump(obj, stump);
    // Kaatumisen kesto (sama integrointi kuin update()): ääni ajoitetaan niin,
    // että räsähdys osuu hetkeen, jolloin runko iskeytyy maahan.
    let th = log.theta, om = log.omega, ft = 0;
    while (th < log.thetaMax && ft < 6) {
      om += (((3 * 9.8) / (2 * log.L)) * Math.sin(th) + 0.15) / 60;
      th += om / 60;
      ft += 1 / 60;
    }
    events.emit('treeFell', { type: obj.type, x: obj.x, z: obj.z, fallTime: ft, size: Math.min(1, log.L / 14) });
    return log;
  }

  update(dt) {
    for (const log of this.list) {
      if (log.state === 'falling') {
        // Sauvan kaatuminen tukipisteen ympäri: kiihtyvyys ~ sin(kulma)
        const alpha = ((3 * 9.8) / (2 * log.L)) * Math.sin(log.theta) + 0.15;
        log.omega += alpha * dt;
        log.theta += log.omega * dt;
        if (log.theta >= log.thetaMax) {
          log.theta = log.thetaMax;
          if (!log.impacted) {
            log.impacted = true;
            this._impact(log);
          }
          if (log.omega > 0.5) log.omega *= -0.22;
          else { log.omega = 0; log.state = 'down'; }
        }
        this._applyRotation(log);
        if (log.state === 'down') this._makeCollider(log);
      } else if (log.shake > 0) {
        log.shake = Math.max(0, log.shake - dt * 3);
        this._applyRotation(log);
      }
    }
  }

  _impact(log) {
    this._trunkWorld(log, _a, _b);
    const strength = Math.min(1, log.L / 8);
    for (let i = 0; i < 4; i++) {
      _w.lerpVectors(_a, _b, 0.4 + i * 0.25);
      _w.y = heightAt(_w.x, _w.z) + 0.3;
      this.bursts.spawn(_w, 0xc9a77a, 16, 2.5);
    }
    events.emit('impact', { x: _b.x, z: _b.z, strength });
  }

  // Säde vs. kapseli (runko). Palauttaa { obj, t }.
  raycast(origin, dir, maxDist) {
    let best = null;
    for (const log of this.list) {
      if (log.state === 'falling') continue;
      this._trunkWorld(log, _a, _b);
      const meta = log.mesh.geometry.userData.tree;
      const r = Math.max(0.35, meta.logR * log.scale * 1.4);
      const t = raySegment(origin, dir, _a, _b, r);
      if (t !== null && t <= maxDist && (!best || t < best.t)) best = { obj: log, t };
    }
    return best;
  }

  // Lyönti kaatuneeseen runkoon. Palauttaa true, jos runko hajosi.
  hit(log, hitPoint, playerPos) {
    const def = OBJECT_TYPES[log.type];
    const local = log.mesh.worldToLocal(hitPoint.clone());
    const from = log.mesh.worldToLocal(playerPos.clone()).sub(local);
    addNotch(log.mesh.geometry, local, from, null, 1.3);
    log.shake = 1;
    this.debris.chips(hitPoint, 0xd2ad78, 7, from.clone().normalize().applyQuaternion(log.pivot.quaternion), 0.9);
    this.debris.chips(hitPoint, 0x5b4838, 3, null, 0.8);
    log.hp -= 1;
    if (log.hp > 0) return false;

    // Runko hajoaa: palat lentävät ja puut putoavat maahan.
    log.mesh.updateMatrixWorld(true);
    this.debris.shatter(log.mesh.geometry, log.mesh.matrixWorld, { pieces: 14, inner: 0xc9a679, power: 2, life: 2.4, seed: (Math.random() * 1e9) | 0, closed: false });
    this._trunkWorld(log, _a, _b);
    for (const [item, n] of def.log.drops) {
      for (let i = 0; i < n; i++) {
        _w.lerpVectors(_a, _b, Math.random());
        _w.y = Math.max(_w.y, heightAt(_w.x, _w.z) + 0.4);
        this.drops.spawn(item, 1, _w, { spread: 0.8 });
      }
    }
    this.remove(log);
    events.emit('harvest', { type: 'log' });
    return true;
  }

  remove(log) {
    const i = this.list.indexOf(log);
    if (i >= 0) this.list.splice(i, 1);
    this.scene.remove(log.pivot);
    log.mesh.geometry.dispose();
    if (log.collider) {
      const ci = this.world.extraColliders.indexOf(log.collider);
      if (ci >= 0) this.world.extraColliders.splice(ci, 1);
    }
  }

  clear() {
    for (const log of [...this.list]) this.remove(log);
  }

  serialize() {
    return this.list.map((l) => ({
      type: l.type, variant: l.variant, scale: l.scale, rot: l.rot,
      x: l.pivot.position.x, y: l.pivot.position.y, z: l.pivot.position.z,
      dx: l.dir.x, dz: l.dir.z, theta: l.state === 'falling' ? l.thetaMax : l.theta, hp: l.hp,
    }));
  }

  load(list) {
    this.clear();
    if (!Array.isArray(list)) return;
    for (const s of list) {
      const def = OBJECT_TYPES[s?.type];
      if (!def || def.kind !== 'tree' || !Number.isFinite(s.x)) continue;
      const split = splitTree(this.models.hi(def.model, s.variant | 0));
      this._create({
        type: s.type, variant: s.variant | 0, scale: s.scale || 1, rot: s.rot || 0,
        cutWorld: new THREE.Vector3(s.x, s.y, s.z), dir: new THREE.Vector3(s.dx || 1, 0, s.dz || 0),
        theta: s.theta || 1.5, omega: 0, hp: s.hp, topGeo: split.top, state: 'down',
      });
    }
  }
}

// Säteen ja janan lähin kohta; palauttaa säteen t, jos etäisyys < r.
function raySegment(o, d, a, b, r) {
  const u = _v.subVectors(b, a);
  const w0 = _w.subVectors(o, a);
  const A = d.dot(d), B = d.dot(u), C = u.dot(u), D = d.dot(w0), E = u.dot(w0);
  const den = A * C - B * B;
  let sc, tc;
  if (den < 1e-8) { sc = 0; tc = E / C; } else { sc = (B * E - C * D) / den; tc = (A * E - B * D) / den; }
  tc = THREE.MathUtils.clamp(tc, 0, 1);
  sc = Math.max(0, (B * tc - D) / A);
  const px = o.x + d.x * sc - (a.x + u.x * tc);
  const py = o.y + d.y * sc - (a.y + u.y * tc);
  const pz = o.z + d.z * sc - (a.z + u.z * tc);
  const dist = Math.hypot(px, py, pz);
  if (dist > r) return null;
  return Math.max(0, sc - Math.sqrt(r * r - dist * dist));
}
