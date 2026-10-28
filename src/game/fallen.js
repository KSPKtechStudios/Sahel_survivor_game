// Kaatuvat ja kaatuneet puut. Puu kaatuu satunnaiseen suuntaan kaatokohdan
// ympäri (painovoima kiihdyttää kaatumista), pomppaa maahan osuessaan ja jää
// makaamaan. Kaatunut runko pitää vielä pilkkoa hakkaamalla; silloin siihen
// tulee lovia ja lopuksi se hajoaa paloiksi ja puut putoavat maahan.
import * as THREE from 'three';
import { heightAt } from '../world/terrain.js';
import { OBJECT_TYPES } from '../world/objectTypes.js';
import { makeChoppable, addNotch, splitTree, trunkAxis } from './treeCut.js';
import { events } from './events.js';
import { kitMaterials } from '../render/kitMaterials.js';

const UP = new THREE.Vector3(0, 1, 0);
const _v = new THREE.Vector3();
const _w = new THREE.Vector3();
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
// Pienet kasvit, jotka kaatuva puu murskaa (sessio 19).
const CRUSHABLE = new Set(['flowers', 'jujubeBush', 'moringaPlant', 'hibiscusPlant', 'reedClump', 'fonioTuft', 'mushBrown', 'mushPale', 'mushRed', 'mushTermite']);
const _cols = [];

export class FallenTrees {
  constructor({ scene, world, models, material, debris, drops, bursts }) {
    // main.js: pelaaja, olennot ja puun kaato ketjureaktiota varten (sessio 13).
    this.player = null;
    this.mobs = null;
    this.knockTree = null;
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
    const mesh = new THREE.Mesh(geo, geo.userData.kit ? kitMaterials(geo.userData.kit) : this.material);
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
    else this._initSway(log);
    this.list.push(log);
    return log;
  }

  // Sessio 27: kaatuvan latvuksen lehdet laahaavat liikkeen perässä ja
  // heilahtavat eteen, kun runko iskeytyy maahan (jousi + vaimennus).
  // Lehdet tunnistetaan UV:sta (rungot ja oksat osoittavat atlaksen
  // valkoiseen nurkkaan).
  _initSway(log) {
    const geo = log.mesh.geometry;
    const uv = geo.attributes.uv;
    if (!uv || geo.userData.kit) return; // kitin malleissa (lahopuu) ei lehtiä
    const pos = geo.attributes.position;
    const meta = geo.userData.tree;
    const ax = new THREE.Vector3().fromArray(meta.top);
    const len = Math.max(1, ax.length());
    ax.divideScalar(len);
    const idx = [];
    for (let i = 0; i < pos.count; i++) if (uv.getX(i) < 0.98 || uv.getY(i) < 0.98) idx.push(i);
    if (!idx.length) return;
    const orig = new Float32Array(idx.length * 3);
    const w = new Float32Array(idx.length);
    const reach = Math.max(len, meta.fallLen || len);
    idx.forEach((vi, k) => {
      const x = pos.getX(vi), y = pos.getY(vi), z = pos.getZ(vi);
      orig[k * 3] = x; orig[k * 3 + 1] = y; orig[k * 3 + 2] = z;
      const h = Math.max(0, x * ax.x + y * ax.y + z * ax.z) / reach;
      w[k] = Math.min(1.3, h) ** 1.5;
    });
    log.sway = { idx: Uint32Array.from(idx), orig, w, amt: 0, vel: 0, t: 0, done: false };
  }

  _updateSway(log, dt) {
    const s = log.sway;
    if (!s || s.done) return;
    s.t += dt;
    // Tavoite: lehdet jäävät jälkeen kulmanopeuden mukaan.
    const target = log.state === 'falling' ? -log.omega * 0.55 : 0;
    s.vel += ((target - s.amt) * 38 - s.vel * 5.5) * dt;
    s.amt += s.vel * dt;
    if (log.state === 'down' && Math.abs(s.amt) < 0.003 && Math.abs(s.vel) < 0.02) s.done = true;
    // Liikesuunta mallin koordinaatistossa: puu kaatuu suuntaan dir, joten
    // latvan liike on (mallin omassa kehyksessä) kohti dir-suuntaa.
    _v.copy(log.dir).applyAxisAngle(UP, -log.rot).divideScalar(log.scale);
    const pos = log.mesh.geometry.attributes.position;
    const amt = s.done ? 0 : s.amt;
    for (let k = 0; k < s.idx.length; k++) {
      const vi = s.idx[k], o = k * 3, wk = s.w[k] * amt;
      const fl = Math.sin(s.t * 19 + k * 0.37) * 0.04 * Math.min(1, Math.abs(amt));
      pos.setXYZ(vi, s.orig[o] + _v.x * wk + fl, s.orig[o + 1] - Math.abs(wk) * 0.25, s.orig[o + 2] + _v.z * wk + fl);
    }
    pos.needsUpdate = true;
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
    // Kaarevilla palmuilla koko runko tyvestä latvaan (sessio 12d: ennen
    // osuma-alue oli vain ensimmäinen pätkä, joten kaatunutta palmua ei
    // voinut hakata).
    if (meta.logTop) outB.fromArray(meta.logTop);
    else outB.copy(ax.base).addScaledVector(ax.axis, Math.min(ax.len, meta.fallLen));
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
  // forcedDir: ketjukaadossa toisen puun suunta (sessio 13).
  fell(obj, geometry, playerPos, forcedDir = null, chainDepth = 0) {
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
    if (forcedDir) {
      dir.set(forcedDir.x, 0, forcedDir.z).normalize();
      dir.applyAxisAngle(UP, (Math.random() - 0.5) * 0.7);
    } else {
      const away = _v.set(obj.x - playerPos.x, 0, obj.z - playerPos.z);
      if (away.lengthSq() > 0.01 && dir.dot(away.normalize()) < -0.6) dir.negate();
    }
    const log = this._create({
      type: obj.type, variant: obj.variant, scale: obj.scale, rot: obj.rot, cutWorld, dir, topGeo: split.top,
    });
    log.src = obj;
    log.chainDepth = chainDepth;
    // Sessio 27: liaanit seuraavat kaatuvaa latvaa (render/vines.js).
    if (this.vines) this.vines.bindToLog(obj, log, split.cutLocal);
    // Sessio 27: palmun kookokset putoavat.
    if (this.coconuts && this.clock) this.coconuts.onFell(obj, this.clock());
    const stump = new THREE.Mesh(split.stump, split.stump.userData.kit ? kitMaterials(split.stump.userData.kit) : this.material);
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
      if (log.sway) this._updateSway(log, dt);
      if (log.state === 'falling') {
        // Ala-askeleet: matalalla ruudunpäivityksellä latva ei hyppää
        // pelaajan tai olennon yli yhdessä askeleessa (murskaus, sessio 13).
        const steps = Math.min(8, Math.ceil(dt * 60));
        const h = dt / steps;
        for (let k = 0; k < steps && log.state === 'falling'; k++) {
          // Sauvan kaatuminen tukipisteen ympäri: kiihtyvyys ~ sin(kulma)
          const alpha = ((3 * 9.8) / (2 * log.L)) * Math.sin(log.theta) + 0.15;
          log.omega += alpha * h;
          log.theta += log.omega * h;
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
          if (log.state === 'falling' || log.omega > 0.6) this._crush(log);
        }
        if (log.state === 'down') this._makeCollider(log);
        if (log.impacted && log.sway && !log.swayKick) { log.swayKick = true; log.sway.vel += log.omega * 6 + 3; }
      } else if (log.shake > 0) {
        log.shake = Math.max(0, log.shake - dt * 3);
        this._applyRotation(log);
      }
    }
  }

  // Kaatuva runko osuu pelaajaan, olentoihin ja toisiin puihin (sessio 13).
  // Iso, nopeasti kaatuva puu voi tappaa; osuessaan pystyssä olevaan puuhun
  // se voi kaataa senkin (ketjureaktio, enintään 3 puuta peräkkäin).
  _crush(log) {
    if (log.theta < 0.25) return;
    // Koko kaatuva pituus latvuksineen (hakattava runko on lyhyempi).
    this._trunkWorld(log, _a, _b);
    _b.sub(_a);
    _b.multiplyScalar(log.L / Math.max(0.01, _b.length())).add(_a);
    const meta = log.mesh.geometry.userData.tree;
    const r = Math.max(0.25, meta.logR * log.scale);
    const speed = Math.min(1, Math.abs(log.omega) / 2.2);
    const dmg = (18 + log.L * 6) * (0.4 + 0.6 * speed);
    // Latvus ulottuu rungon akselia alemmas: korkeussietoon sen paksuus.
    const crownR = Math.min(1.5, 0.15 * log.L);
    log.crushed = log.crushed || new Set();
    // Pelaaja (kapseli jaloista päähän)
    const P = this.player;
    if (P && !P.dead && !P.riding && !log.crushed.has(P)) {
      const p = P.position;
      if (segDist(_a, _b, p.x, p.y + 0.9, p.z) < r + 0.55 && segMinY(_a, _b, p.x, p.z) < p.y + 1.8 + crownR) {
        log.crushed.add(P);
        P.hurt(dmg, { cause: 'Kaatuva puu', fromX: (_a.x + _b.x) / 2, fromZ: (_a.z + _b.z) / 2, knock: 5 });
        events.emit('hitFeedback', { strength: 1 });
      }
    }
    // Olennot
    if (this.mobs) {
      for (const m of this.mobs.list) {
        if (m.state === 'dead' || log.crushed.has(m) || m.def.ghost) continue;
        if (segDist2D(_a, _b, m.pos.x, m.pos.z) < r + m.def.radius + 0.35 && segMinY(_a, _b, m.pos.x, m.pos.z) < m.pos.y + m.def.height + r + crownR) {
          log.crushed.add(m);
          this.mobs.damage(m, dmg, { fromX: _a.x, fromZ: _a.z, knock: 4 });
        }
      }
    }
    // Kasvit rungon alla (sessio 19): pensaat ja pienet kasvit murskautuvat,
    // todennäköisyys osuman voiman mukaan (iso, nopeasti kaatuva puu murskaa).
    if (this.crushPlant && log.theta > 0.5) {
      log.plantT = (log.plantT || 0) - 1;
      if (log.plantT <= 0) {
        log.plantT = 3; // tarkistetaan joka kolmas ala-askel
        const power = Math.min(1, speed * 0.6 + log.L / 22);
        const mx = (_a.x + _b.x) / 2, mz = (_a.z + _b.z) / 2;
        this.world.forEachChunkNear(mx, mz, log.L * 0.6 + 2, (ch) => {
          for (const o of ch.objects) {
            if (o.removed || o.stump || log.crushed.has(o)) continue;
            const def = OBJECT_TYPES[o.type];
            if (!def || !(def.kind === 'bush' || CRUSHABLE.has(o.type))) continue;
            if (segDist2D(_a, _b, o.x, o.z) > r + crownR * 0.8 + 0.4) continue;
            if (segMinY(_a, _b, o.x, o.z) > (o.y ?? 0) + 1.4 + crownR * 0.5) continue;
            log.crushed.add(o);
            this._hitFx(o.x, (o.y ?? 0) + 0.5, o.z, 'plant');
            if (Math.random() < 0.25 + 0.75 * power) this.crushPlant(o, power, _a);
          }
        });
      }
    }
    // Pystyssä olevat puut ja kivet rungon tiellä
    const mx = (_a.x + _b.x) / 2, mz = (_a.z + _b.z) / 2;
    this.world.collidersNear(mx, mz, log.L * 0.5 + 2, _cols);
    for (const c of _cols) {
      const o = c.obj;
      if (!o || c.seg || o.stump || o === log.src || log.crushed.has(o)) continue;
      const def = OBJECT_TYPES[o.type];
      if (!def) continue;
      if (def.kind === 'rock' || def.kind === 'static') {
        // Sessio 58: osuma kiveen, termiittikekoon tms. (vain pölähdys).
        const top = (o.y ?? 0) + (def.hit ? (def.hit.y + def.hit.r) * o.scale : 1);
        if (segDist2D(_a, _b, o.x, o.z) > c.r + r + 0.3 || segMinY(_a, _b, o.x, o.z) > top + crownR * 0.3) continue;
        log.crushed.add(o);
        this._hitFx(o.x, Math.min(top, segMinY(_a, _b, o.x, o.z)), o.z, def.surface || 'rock');
        continue;
      }
      if (def.kind !== 'tree') continue;
      // Rungon on oltava puun kohdalla vielä ilmassa (latvuksen korkeudella).
      if (segDist2D(_a, _b, o.x, o.z) > c.r + r + 0.8) continue;
      const hy = segMinY(_a, _b, o.x, o.z);
      if (hy < (o.y ?? 0) + 1.2) continue;
      log.crushed.add(o);
      this._hitFx(o.x, hy, o.z, 'tree');
      // Iso runko kaataa todennäköisemmin (ketjussa enintään 3 puuta).
      if (this.knockTree && (log.chainDepth || 0) < 3 && Math.random() < Math.min(0.9, 0.35 + log.L / 18)) {
        this.knockTree(o, log.dir, (log.chainDepth || 0) + 1);
      }
    }
  }

  // Sessio 58: kun kaatuva puu osuu johonkin (toinen puu, pensas, kivi; ei
  // pelkkä maa), osumakohtaan pieni pölähdys ja vähän roiskahtavia
  // partikkeleita, ikään kuin puu rikkoisi jotain. Maahan osuminen on _impact.
  _hitFx(x, y, z, kind) {
    _w.set(x, y, z);
    const FX = {
      tree: { puff: 0xa7ad7c, bits: [0x5b7a2e, 0x6e8a35, 0x5b4838, 0xd2ad78], n: 10 },
      plant: { puff: 0x9fae6a, bits: [0x4f7a2a, 0x6a9a3a, 0x7d6a40], n: 7 },
      rock: { puff: 0xb8b2a6, bits: [0x8a8478, 0x6f6a60, 0xa49d90], n: 6 },
      earth: { puff: 0xb08a62, bits: [0x8a6440, 0x6e4e32], n: 6 },
      wood: { puff: 0xc9a77a, bits: [0xd2ad78, 0x5b4838], n: 7 },
    };
    const f = FX[kind] || FX.rock;
    this.bursts.spawn(_w, f.puff, 9, 1.3, { size: 0.16, life: 0.9, gravity: 1.5, opacity: 0.45 });
    this.debris.splinters(_w, null, f.bits, f.n, 0.9, 0.75);
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
  hit(log, hitPoint, playerPos, dmg = 1) {
    const def = OBJECT_TYPES[log.type];
    events.emit('woodHit', { x: hitPoint.x, z: hitPoint.z });
    const local = log.mesh.worldToLocal(hitPoint.clone());
    const from = log.mesh.worldToLocal(playerPos.clone()).sub(local);
    addNotch(log.mesh.geometry, local, from, null, 1.3 * Math.min(1, dmg));
    log.shake = 1;
    this.debris.chips(hitPoint, 0xd2ad78, 7, from.clone().normalize().applyQuaternion(log.pivot.quaternion), 0.9);
    this.debris.chips(hitPoint, 0x5b4838, 3, null, 0.8);
    this.debris.splinters(hitPoint, null, [0xd2ad78, 0xd2ad78, 0x5b4838, 0x3e3026], 26); // sessio 32
    log.hp -= dmg;
    if (log.hp > 0) return false;

    // Runko hajoaa: palat lentävät ja puut putoavat maahan.
    log.mesh.updateMatrixWorld(true);
    // Sessio 30: rungon palat umpinaisia (sisältä tuoretta puuta), oksat ja lehdet avoimia.
    const trunk = log.mesh.geometry.userData.ranges && log.mesh.geometry.userData.ranges.trunk;
    this.debris.shatter(log.mesh.geometry, log.mesh.matrixWorld, { pieces: 14, inner: 0xc9a679, power: 2, life: 2.4, seed: (Math.random() * 1e9) | 0, closed: trunk || false });
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
    if (this.vines) this.vines.releaseLog(log);
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

// Pisteen etäisyys janasta a-b (3D).
function segDist(a, b, x, y, z) {
  const abx = b.x - a.x, aby = b.y - a.y, abz = b.z - a.z;
  const t = Math.max(0, Math.min(1, ((x - a.x) * abx + (y - a.y) * aby + (z - a.z) * abz) / (abx * abx + aby * aby + abz * abz || 1)));
  return Math.hypot(a.x + abx * t - x, a.y + aby * t - y, a.z + abz * t - z);
}
// Etäisyys vaakatasossa.
function segDist2D(a, b, x, z) {
  const abx = b.x - a.x, abz = b.z - a.z;
  const t = Math.max(0, Math.min(1, ((x - a.x) * abx + (z - a.z) * abz) / (abx * abx + abz * abz || 1)));
  return Math.hypot(a.x + abx * t - x, a.z + abz * t - z);
}
// Rungon korkeus kohdassa (x, z) (lähimmän janan pisteen y).
function segMinY(a, b, x, z) {
  const abx = b.x - a.x, abz = b.z - a.z;
  const t = Math.max(0, Math.min(1, ((x - a.x) * abx + (z - a.z) * abz) / (abx * abx + abz * abz || 1)));
  return a.y + (b.y - a.y) * t;
}
