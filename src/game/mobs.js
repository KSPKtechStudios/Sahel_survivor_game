// Eläimet ja viholliset: syntyminen pelaajan ympärille, tekoäly, liike,
// osumat, tönäisyt ja kuolema.
//
// Pahkasika: neutraali villieläin Sahelin savanneilla. Pakenee, kun pelaaja
// tulee lähelle (kyykyssä pääsee lähemmäs); lyötynä hyökkää takaisin ja
// pakenee haavoittuneena.
// Savipeikko: heikko vihamielinen olento, joka nousee maasta öisin missä
// tahansa biomissa ja murenee aamulla.
import * as THREE from 'three';
import { waterAt, sampleTerrain, insideStructure } from '../world/terrain.js';
import { makeWarthog, makeClayGolem } from '../models/creatures.js';
import { events } from './events.js';

export const MOB_TYPES = {
  warthog: {
    name: 'Pahkasika', hp: 55, radius: 0.5, height: 0.8, walk: 1.1, run: 6.6, mass: 1.6,
    damage: 13, knock: 6.5, up: 2.5, reach: 1.45, windup: 0.5, attack: 0.32, recover: 0.9,
    sight: 10, poise: 15, turn: 5, drops: [['raw_meat', 1, 2], ['hide', 1, 1]], cause: 'warthog',
  },
  clay: {
    name: 'Savipeikko', hp: 28, radius: 0.36, height: 1.25, walk: 0.9, run: 3.5, mass: 0.9,
    damage: 8, knock: 4, up: 0, reach: 1.4, windup: 0.65, attack: 0.28, recover: 0.8,
    sight: 24, poise: 6, turn: 4, drops: [['clay', 1, 2]], cause: 'clay',
  },
};

const MAX_WARTHOGS = 3;
const MAX_CLAY = 3;
const DESPAWN = { warthog: 150, clay: 70 };
const PLAYER_R = 0.35;

const _wq = {};
const _s = {};
const _cols = [];
const _v = new THREE.Vector3();
const _m = new THREE.Matrix4();

// Mallit rakennetaan kerran (3 muunnelmaa / laji) ja kopioidaan jaetuilla
// geometrioilla; joka olennolla on oma materiaali (osumavälähdys).
const VARIANTS = 3;
const templates = new Map();
function instantiate(type, n, eyeMat) {
  const key = `${type}:${n % VARIANTS}`;
  let t = templates.get(key);
  if (!t) {
    t = type === 'warthog' ? makeWarthog(n % VARIANTS + 1) : makeClayGolem(n % VARIANTS + 1, eyeMat);
    templates.set(key, t);
  }
  const group = t.group.clone(true);
  const material = t.material.clone();
  const src = [], dst = [];
  t.group.traverse((o) => src.push(o));
  group.traverse((o) => dst.push(o));
  const map = new Map(src.map((o, i) => [o, dst[i]]));
  for (const o of dst) if (o.isMesh && o.material === t.material) o.material = material;
  const out = { group, material, kind: t.kind };
  for (const k of ['body', 'head', 'tail', 'torso']) if (t[k]) out[k] = map.get(t[k]);
  for (const k of ['legs', 'arms', 'eyes']) if (t[k]) out[k] = t[k].map((o) => map.get(o));
  return out;
}

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

function smooth(t) {
  t = Math.min(1, Math.max(0, t));
  return t * t * (3 - 2 * t);
}

export class Mobs {
  constructor({ scene, world, drops, debris, bursts, player, env, structures }) {
    Object.assign(this, { scene, world, drops, debris, bursts, player, env, structures });
    this.list = [];
    this.eyeMaterial = new THREE.MeshBasicMaterial({ color: 0xffb347 });
    this.spawnTimer = 3;
    this.clayTimer = 6;
    this.combat = null; // asetetaan main.js:ssä (osumat pelaajaan)
    this.enabled = true;
    this.seed = 1;
  }

  // Rakennetaan mallit valmiiksi (latausruudun aikana), jottei ensimmäinen
  // olento nyi peliä.
  prepare() {
    for (const type of Object.keys(MOB_TYPES)) {
      for (let n = 0; n < VARIANTS; n++) instantiate(type, n, this.eyeMaterial).material.dispose();
    }
  }

  count(type) {
    let n = 0;
    for (const m of this.list) if (m.type === type && m.state !== 'dead') n++;
    return n;
  }

  spawn(type, x, z, { emerge = false } = {}) {
    const def = MOB_TYPES[type];
    const model = instantiate(type, this.seed++, this.eyeMaterial);
    model.group.rotation.set(0, 0, 0);
    const w = waterAt(x, z, _wq);
    const m = {
      type, def, model,
      pos: new THREE.Vector3(x, w.h, z),
      vel: new THREE.Vector3(),
      knock: new THREE.Vector3(),
      vy: 0,
      yaw: Math.random() * Math.PI * 2,
      hp: def.hp,
      state: emerge ? 'emerge' : type === 'warthog' ? 'graze' : 'wander',
      stateT: 0,
      timer: 1 + Math.random() * 4,
      tx: x, tz: z,          // vaelluksen kohde
      provoked: 0,           // aika, jonka pahkasika on vihainen
      staggerDur: 0,
      vulnerable: false,     // parryn jälkeen ottaa enemmän vahinkoa
      hitDone: false,
      flash: 0,
      phase: Math.random() * 6,
      stuckT: 0, detourT: 0, detour: 0,
      deadT: 0,
      crumbleAt: -1,
      yOff: emerge ? -1.4 : 0,
    };
    model.group.position.copy(m.pos);
    this.scene.add(model.group);
    this.list.push(m);
    return m;
  }

  remove(m) {
    const i = this.list.indexOf(m);
    if (i >= 0) this.list.splice(i, 1);
    this.scene.remove(m.model.group);
    m.model.material.dispose(); // geometriat ovat yhteisiä (templates)
  }

  clear() {
    for (const m of this.list.slice()) this.remove(m);
    this.spawnTimer = 3;
    this.clayTimer = 6;
  }

  // Lähin olento säteellä (kohteen nimi ja terveys tähtäimessä).
  raycast(origin, dir, maxDist) {
    let best = null;
    for (const m of this.list) {
      if (m.state === 'dead' || m.yOff < -0.6) continue;
      const r = m.def.radius * 1.15;
      _v.set(m.pos.x - origin.x, m.pos.y + m.def.height * 0.5 - origin.y, m.pos.z - origin.z);
      const tca = _v.dot(dir);
      if (tca < -r) continue;
      const d2 = _v.lengthSq() - tca * tca;
      if (d2 > r * r * 1.6) continue;
      const t = Math.max(0, tca - r);
      if (t <= maxDist && (!best || t < best.t)) best = { obj: m, t };
    }
    return best;
  }

  // Olennot iskun kaaressa (lähin ensin): reach = ulottuvuus pelaajasta
  // olennon pintaan, cosArc = kaaren puolikulman kosini.
  inArc(px, pz, eyeY, dir, reach, cosArc, out = []) {
    out.length = 0;
    const hl = Math.hypot(dir.x, dir.z) || 1;
    const fx = dir.x / hl, fz = dir.z / hl;
    const pitch = Math.atan2(dir.y, hl);
    for (const m of this.list) {
      if (m.state === 'dead' || m.yOff < -0.6) continue;
      const dx = m.pos.x - px, dz = m.pos.z - pz;
      const d = Math.hypot(dx, dz);
      const surf = d - m.def.radius;
      if (surf > reach) continue;
      // Hyvin lähellä oleva osuu aina, kun se on edessä päin.
      const c = d > 1e-3 ? (dx * fx + dz * fz) / d : 1;
      if (c < cosArc && !(surf < 0.4 && c > 0)) continue;
      // Pystysuunta: katse ei saa osoittaa aivan ohi (taivaalle / jalkoihin).
      const toPitch = Math.atan2(m.pos.y + m.def.height * 0.5 - eyeY, Math.max(0.3, d));
      if (Math.abs(toPitch - pitch) > 0.95) continue;
      m._d = d;
      out.push(m);
    }
    out.sort((a, b) => a._d - b._d);
    return out;
  }

  // Vahinko olentoon. opts: { fromX, fromZ, knock, up, stagger }
  damage(m, amount, opts = {}) {
    if (m.state === 'dead' || m.state === 'crumble') return false;
    if (m.vulnerable) amount *= 1.5;
    m.hp -= amount;
    m.flash = 1;
    this.push(m, m.pos.x - (opts.fromX ?? m.pos.x), m.pos.z - (opts.fromZ ?? m.pos.z), opts.knock || 3, opts.up || 0);
    events.emit('mobHit', { type: m.type, amount });
    if (m.hp <= 0) {
      this._kill(m);
      return true;
    }
    const def = m.def;
    if (m.type === 'warthog') {
      if (m.hp / def.hp < 0.35) {
        m.provoked = 0;
        if (!opts.stagger && amount < def.poise) this._set(m, 'flee', 5 + Math.random() * 2);
      } else {
        m.provoked = 16;
        if (m.state !== 'windup' && m.state !== 'attack' && m.state !== 'stagger') this._set(m, 'chase');
      }
    }
    if (m.state === 'emerge') return true;
    const st = opts.stagger || (amount >= def.poise ? 0.45 : 0);
    if (st > 0) this.stagger(m, st, false);
    return true;
  }

  // Horjahdus: keskeyttää hyökkäyksen. Parryn jälkeen olento on haavoittuvainen.
  stagger(m, dur, vulnerable) {
    if (m.state === 'dead' || m.state === 'crumble' || m.state === 'emerge') return;
    m.staggerDur = dur;
    m.vulnerable = !!vulnerable;
    this._set(m, 'stagger');
  }

  push(m, dx, dz, strength, up = 0) {
    const len = Math.hypot(dx, dz) || 1;
    const k = strength / m.def.mass;
    m.knock.x += (dx / len) * k;
    m.knock.z += (dz / len) * k;
    if (up > 0) m.vy = Math.max(m.vy, up / m.def.mass);
  }

  _set(m, state, timer) {
    m.state = state;
    m.stateT = 0;
    m.hitDone = false;
    if (timer !== undefined) m.timer = timer;
    if (state !== 'stagger') m.vulnerable = false;
  }

  _kill(m) {
    const def = m.def;
    _v.copy(m.pos);
    _v.y += def.height * 0.5;
    for (const [item, a, b] of def.drops) {
      const n = a + Math.floor(Math.random() * (b - a + 1));
      this.drops.spawn(item, n, _v, { spread: 0.6, up: 0.8 });
    }
    events.emit('mobKilled', { type: m.type });
    if (m.type === 'clay') {
      this._shatter(m);
      this.remove(m);
      return;
    }
    this._set(m, 'dead');
    m.deadT = 0;
    m.deathSide = Math.random() < 0.5 ? -1 : 1;
  }

  // Savipeikko murenee paloiksi.
  _shatter(m) {
    m.model.group.updateMatrixWorld(true);
    let seed = 1;
    m.model.group.traverse((o) => {
      if (!o.isMesh || o.material === this.eyeMaterial) return;
      _m.copy(o.matrixWorld);
      this.debris.shatter(o.geometry, _m, { pieces: 5, inner: 0x6e3018, power: 1.6, life: 2.2, seed: seed++, up: 0.6 });
    });
    _v.copy(m.pos);
    _v.y += 0.6;
    this.bursts.spawn(_v, 0xa0603a, 16, 1.4);
  }

  update(dt, elapsed) {
    const player = this.player;
    const p = player.position;
    const night = this.env.daylight < 0.12;

    // --- Syntyminen ja katoaminen
    if (this.enabled && dt > 0) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        this.spawnTimer = 2.5 + Math.random() * 2.5;
        this._trySpawnWarthogs(night);
      }
      if (night && !player.dead) {
        this.clayTimer -= dt;
        if (this.clayTimer <= 0) {
          this.clayTimer = 18 + Math.random() * 28;
          if (this.count('clay') < MAX_CLAY) this._trySpawnClay();
        }
      } else if (!night) {
        this.clayTimer = 8 + Math.random() * 10;
      }
    }
    for (const m of this.list.slice()) {
      const d = Math.hypot(m.pos.x - p.x, m.pos.z - p.z);
      if (d > DESPAWN[m.type]) { this.remove(m); continue; }
      // Aamulla savipeikot murenevat (eri aikaan).
      if (m.type === 'clay' && this.env.daylight > 0.25 && m.state !== 'crumble' && m.state !== 'dead') {
        if (m.crumbleAt < 0) m.crumbleAt = elapsed + Math.random() * 5;
        else if (elapsed >= m.crumbleAt) this._set(m, 'crumble');
      }
    }

    // --- Tekoäly, liike ja animaatio
    for (const m of this.list.slice()) {
      if (dt > 0) {
        if (m.type === 'warthog') this._thinkWarthog(m, dt);
        else this._thinkClay(m, dt);
        if (!this.list.includes(m)) continue;
        this._physics(m, dt);
      }
      this._animate(m, dt, elapsed);
    }
  }

  // --- Syntyminen -----------------------------------------------------------
  _trySpawnWarthogs(night) {
    if (this.count('warthog') >= MAX_WARTHOGS || Math.random() > (night ? 0.12 : 0.4)) return;
    const p = this.player.position;
    for (let a = 0; a < 6; a++) {
      const ang = Math.random() * Math.PI * 2;
      const r = 42 + Math.random() * 38;
      const x = p.x + Math.cos(ang) * r, z = p.z + Math.sin(ang) * r;
      if (!this._okSpot(x, z)) continue;
      const suit = _s.savanna + _s.woodland + _s.laterite * 0.7 + _s.mare * 0.6;
      if (suit < 0.55) continue;
      const n = 1 + Math.floor(Math.random() * 2.4);
      for (let i = 0; i < n && this.count('warthog') < MAX_WARTHOGS + 1; i++) {
        const ox = x + (Math.random() - 0.5) * 5, oz = z + (Math.random() - 0.5) * 5;
        if (this._okSpot(ox, oz)) this.spawn('warthog', ox, oz);
      }
      return;
    }
  }

  _trySpawnClay() {
    const p = this.player.position;
    for (let a = 0; a < 8; a++) {
      const ang = Math.random() * Math.PI * 2;
      const r = 18 + Math.random() * 14;
      const x = p.x + Math.cos(ang) * r, z = p.z + Math.sin(ang) * r;
      if (!this._okSpot(x, z) || this._nearFire(x, z, 14)) continue;
      this.spawn('clay', x, z, { emerge: true });
      if (Math.random() < 0.25 && this.count('clay') < MAX_CLAY) {
        const ox = x + (Math.random() - 0.5) * 6, oz = z + (Math.random() - 0.5) * 6;
        if (this._okSpot(ox, oz)) this.spawn('clay', ox, oz, { emerge: true });
      }
      return;
    }
  }

  _okSpot(x, z) {
    sampleTerrain(x, z, _s);
    if (_s.h < _s.wl + 0.25 || _s.ocean > 0.3) return false;
    if (insideStructure(x, z, 1)) return false;
    return true;
  }

  _nearFire(x, z, r) {
    for (const st of this.structures.list) {
      if (st.type === 'campfire' && (st.x - x) ** 2 + (st.z - z) ** 2 < r * r) return true;
    }
    return false;
  }

  // Testausta varten: kutsu olento pelaajan eteen.
  spawnInFront(type, dist = 9) {
    const p = this.player.position;
    const yaw = this.player.yaw;
    for (let a = 0; a < 12; a++) {
      const ang = yaw + (a % 2 ? 1 : -1) * Math.floor((a + 1) / 2) * 0.35;
      const x = p.x - Math.sin(ang) * dist, z = p.z - Math.cos(ang) * dist;
      if (!this._okSpot(x, z)) continue;
      const m = this.spawn(type, x, z, { emerge: type === 'clay' });
      m.yaw = Math.atan2(p.x - x, p.z - z);
      return m;
    }
    return null;
  }

  // --- Tekoäly -----------------------------------------------------------------
  _toPlayer(m) {
    const p = this.player.position;
    const dx = p.x - m.pos.x, dz = p.z - m.pos.z;
    const d = Math.hypot(dx, dz) || 1e-3;
    return { dx: dx / d, dz: dz / d, d };
  }

  _sees(m, d) {
    if (this.player.dead) return false;
    const sight = m.def.sight * (this.player.crouching ? 0.45 : 1) * (this.player.inWater === 2 ? 0.8 : 1);
    return d < sight;
  }

  _thinkWarthog(m, dt) {
    const def = m.def;
    m.stateT += dt;
    m.timer -= dt;
    m.provoked = Math.max(0, m.provoked - dt);
    const { dx, dz, d } = this._toPlayer(m);
    const sees = this._sees(m, d);
    switch (m.state) {
      case 'graze':
        this._steer(m, 0, 0, 0, dt);
        if (m.provoked > 0 && !this.player.dead) this._set(m, 'chase');
        else if (sees) this._set(m, 'alert');
        else if (m.timer <= 0) {
          const a = Math.random() * Math.PI * 2, r = 4 + Math.random() * 9;
          m.tx = m.pos.x + Math.cos(a) * r;
          m.tz = m.pos.z + Math.sin(a) * r;
          this._set(m, 'wander', 8);
        }
        break;
      case 'wander': {
        const wx = m.tx - m.pos.x, wz = m.tz - m.pos.z;
        const wd = Math.hypot(wx, wz);
        this._steer(m, wx / (wd || 1), wz / (wd || 1), def.walk, dt);
        if (sees) this._set(m, 'alert');
        else if (wd < 1 || m.timer <= 0) this._set(m, 'graze', 3 + Math.random() * 5);
        break;
      }
      case 'alert':
        this._steer(m, dx, dz, 0, dt, true);
        if (m.provoked > 0) this._set(m, 'chase');
        else if (m.stateT > 0.55) this._set(m, 'flee', 4 + Math.random() * 2);
        break;
      case 'flee': {
        // Juoksee poispäin (pieni mutka, ettei suunta ole täysin suora).
        const wob = Math.sin(m.stateT * 1.3 + m.phase) * 0.35;
        const fx = -dx * Math.cos(wob) + dz * Math.sin(wob);
        const fz = -dz * Math.cos(wob) - dx * Math.sin(wob);
        this._steer(m, fx, fz, def.run * (m.hp / def.hp < 0.35 ? 0.85 : 1), dt);
        if (m.timer <= 0 && (d > def.sight * 1.8 || this.player.dead)) this._set(m, 'graze', 2 + Math.random() * 3);
        else if (m.timer <= 0) m.timer = 1.5;
        break;
      }
      case 'chase':
        if (m.provoked <= 0 || d > 30 || this.player.dead) { this._set(m, 'graze', 2); break; }
        this._steer(m, dx, dz, def.run * 0.92, dt);
        if (d - PLAYER_R < def.reach + 0.6) this._set(m, 'windup');
        break;
      case 'windup':
        // Lyö päätä alas ja kuopii maata ennen syöksyä (varoitus pelaajalle).
        this._steer(m, dx, dz, 0, dt, true);
        if (m.stateT >= def.windup) this._set(m, 'attack');
        break;
      case 'attack': {
        // Syöksy eteenpäin, osuma kerran.
        const fx = Math.sin(m.yaw), fz = Math.cos(m.yaw);
        m.vel.x = fx * def.run * 1.15;
        m.vel.z = fz * def.run * 1.15;
        if (!m.hitDone && m.stateT > def.attack * 0.35) this._tryHit(m);
        if (m.stateT >= def.attack) this._set(m, 'recover');
        break;
      }
      case 'recover':
        this._steer(m, 0, 0, 0, dt);
        if (m.stateT >= def.recover) this._set(m, m.provoked > 0 ? 'chase' : 'flee', 3);
        break;
      case 'stagger':
        this._steer(m, 0, 0, 0, dt);
        if (m.stateT >= m.staggerDur) this._set(m, m.provoked > 0 && m.hp / def.hp >= 0.35 ? 'chase' : 'flee', 4);
        break;
      case 'dead':
        m.deadT += dt;
        m.vel.multiplyScalar(Math.exp(-dt * 6));
        if (m.deadT > 6) this.remove(m);
        break;
      default:
        this._set(m, 'graze', 2);
    }
  }

  _thinkClay(m, dt) {
    const def = m.def;
    m.stateT += dt;
    m.timer -= dt;
    const { dx, dz, d } = this._toPlayer(m);
    const sees = this._sees(m, d);
    switch (m.state) {
      case 'emerge':
        // Nousee maasta.
        m.yOff = -1.4 * (1 - smooth(m.stateT / 1.5));
        if (Math.random() < dt * 8) {
          _v.set(m.pos.x + (Math.random() - 0.5) * 0.6, m.pos.y + 0.05, m.pos.z + (Math.random() - 0.5) * 0.6);
          this.debris.chips(_v, 0x8a4a2c, 1, null, 0.8);
        }
        this._steer(m, dx, dz, 0, dt, true);
        if (m.stateT >= 1.5) { m.yOff = 0; this._set(m, sees ? 'chase' : 'wander', 3); }
        break;
      case 'wander': {
        if (sees) { this._set(m, 'chase'); break; }
        // Aistii elävän: hiipii hitaasti pelaajaa kohti mutkitellen.
        if (!this.player.dead && d < 50) {
          const wob = Math.sin(m.stateT * 0.9 + m.phase) * 0.6;
          this._steer(m, dx * Math.cos(wob) - dz * Math.sin(wob), dz * Math.cos(wob) + dx * Math.sin(wob), def.walk * 1.3, dt);
          break;
        }
        if (m.timer <= 0) {
          const a = Math.random() * Math.PI * 2, r = 3 + Math.random() * 6;
          m.tx = m.pos.x + Math.cos(a) * r;
          m.tz = m.pos.z + Math.sin(a) * r;
          m.timer = 4 + Math.random() * 4;
        }
        const wx = m.tx - m.pos.x, wz = m.tz - m.pos.z;
        const wd = Math.hypot(wx, wz);
        this._steer(m, wx / (wd || 1), wz / (wd || 1), wd > 0.8 ? def.walk : 0, dt);
        break;
      }
      case 'chase':
        if (this.player.dead || d > 45) { this._set(m, 'wander', 0); break; }
        this._steer(m, dx, dz, def.run, dt);
        if (d - PLAYER_R < def.reach + 0.25) this._set(m, 'windup');
        break;
      case 'windup':
        // Nostaa kädet ylös ennen iskua (varoitus).
        this._steer(m, dx, dz, 0, dt, true);
        if (m.stateT >= def.windup) this._set(m, 'attack');
        break;
      case 'attack': {
        const fx = Math.sin(m.yaw), fz = Math.cos(m.yaw);
        m.vel.x = fx * 1.6;
        m.vel.z = fz * 1.6;
        if (!m.hitDone && m.stateT > def.attack * 0.45) this._tryHit(m);
        if (m.stateT >= def.attack) this._set(m, 'recover');
        break;
      }
      case 'recover':
        this._steer(m, 0, 0, 0, dt);
        if (m.stateT >= def.recover) this._set(m, 'chase');
        break;
      case 'stagger':
        this._steer(m, 0, 0, 0, dt);
        if (m.stateT >= m.staggerDur) this._set(m, 'chase');
        break;
      case 'crumble':
        this._steer(m, 0, 0, 0, dt);
        if (m.stateT > 0.8) { this._shatter(m); this.remove(m); }
        break;
      default:
        this._set(m, 'wander', 1);
    }
  }

  // Hyökkäyksen osuma pelaajaan, jos pelaaja on edessä ja ulottuvilla.
  _tryHit(m) {
    const p = this.player.position;
    const dx = p.x - m.pos.x, dz = p.z - m.pos.z;
    const d = Math.hypot(dx, dz) || 1e-3;
    const facing = (dx * Math.sin(m.yaw) + dz * Math.cos(m.yaw)) / d;
    if (d - PLAYER_R > m.def.reach + 0.25 || facing < 0.35 || Math.abs(p.y - m.pos.y) > 1.6) return;
    m.hitDone = true;
    const res = this.combat ? this.combat.receiveHit(m, m.def.damage, { knock: m.def.knock, up: m.def.up, cause: m.def.cause }) : 'hit';
    // Torjunnasta isku kimpoaa takaisin.
    if (res === 'block' || res === 'broken') this.push(m, -dx, -dz, 2.5);
    if (res !== 'parry') m.vel.multiplyScalar(0.3);
  }

  // Kääntyy kohti suuntaa (dx, dz) ja liikkuu nopeudella speed.
  // face = käänny vain (ei liikettä).
  _steer(m, dx, dz, speed, dt, face = false) {
    let want = m.yaw;
    if (dx !== 0 || dz !== 0) {
      want = Math.atan2(dx, dz);
      // Este edessä: kierrä sivun kautta hetki.
      if (m.detourT > 0) { want += m.detour; m.detourT -= dt; }
    }
    const diff = angleDiff(want, m.yaw);
    const turn = m.def.turn * (speed > 3 ? 1.1 : 1);
    m.yaw += Math.max(-turn * dt, Math.min(turn * dt, diff));
    const align = face ? 0 : Math.max(0, Math.cos(diff));
    const tv = speed * align;
    const k = 1 - Math.exp(-dt * 8);
    m.vel.x += (Math.sin(m.yaw) * tv - m.vel.x) * k;
    m.vel.z += (Math.cos(m.yaw) * tv - m.vel.z) * k;
    m.wantSpeed = tv;
  }

  // --- Fysiikka: maasto, vesi (ei mene syvään), esteet ja muut olennot.
  _physics(m, dt) {
    const pos = m.pos;
    const nx = pos.x + (m.vel.x + m.knock.x) * dt;
    const nz = pos.z + (m.vel.z + m.knock.z) * dt;
    m.knock.multiplyScalar(Math.exp(-dt * 6));
    const w = waterAt(nx, nz, _wq);
    const deep = w.wl - w.h > 0.55;
    const ox = pos.x, oz = pos.z;
    let ground;
    if (deep && m.state !== 'dead') {
      // Vesi pysäyttää; vaeltaja kääntyy pois.
      m.vel.set(0, 0, 0);
      m.knock.set(0, 0, 0);
      if (m.state === 'wander' || m.state === 'flee') { m.detour = Math.PI * (0.6 + Math.random() * 0.5) * (Math.random() < 0.5 ? -1 : 1); m.detourT = 1.2; }
      ground = waterAt(pos.x, pos.z, _wq).h;
    } else {
      pos.x = nx;
      pos.z = nz;
      ground = w.h;
    }

    // Puut ja kivet
    const r = m.def.radius;
    this.world.collidersNear(pos.x, pos.z, 1.5, _cols);
    for (const c of _cols) {
      let cx = c.x, cz = c.z;
      if (c.seg) {
        if (pos.y > c.top - 0.15) continue;
        const ux = c.bx - c.ax, uz = c.bz - c.az;
        const t = Math.max(0, Math.min(1, ((pos.x - c.ax) * ux + (pos.z - c.az) * uz) / (ux * ux + uz * uz || 1)));
        cx = c.ax + ux * t;
        cz = c.az + uz * t;
      }
      const ddx = pos.x - cx, ddz = pos.z - cz;
      const min = c.r + r;
      const d2 = ddx * ddx + ddz * ddz;
      if (d2 < min * min && d2 > 1e-8) {
        const dd = Math.sqrt(d2);
        pos.x += (ddx / dd) * (min - dd);
        pos.z += (ddz / dd) * (min - dd);
      }
    }
    // Toiset olennot ja pelaaja
    for (const o of this.list) {
      if (o === m || o.state === 'dead') continue;
      const ddx = pos.x - o.pos.x, ddz = pos.z - o.pos.z;
      const min = r + o.def.radius;
      const d2 = ddx * ddx + ddz * ddz;
      if (d2 < min * min && d2 > 1e-8) {
        const dd = Math.sqrt(d2);
        pos.x += (ddx / dd) * (min - dd) * 0.5;
        pos.z += (ddz / dd) * (min - dd) * 0.5;
      }
    }
    if (m.state !== 'dead') {
      const p = this.player.position;
      const ddx = pos.x - p.x, ddz = pos.z - p.z;
      const min = r + PLAYER_R;
      const d2 = ddx * ddx + ddz * ddz;
      if (d2 < min * min && d2 > 1e-8 && Math.abs(p.y - pos.y) < 1.5) {
        const dd = Math.sqrt(d2);
        pos.x += (ddx / dd) * (min - dd);
        pos.z += (ddz / dd) * (min - dd);
      }
    }

    // Jumittuminen: halutaan liikkua, mutta paikka ei muutu -> kierretään.
    const moved = Math.hypot(pos.x - ox, pos.z - oz) / Math.max(dt, 1e-4);
    if ((m.wantSpeed || 0) > 0.5 && moved < m.wantSpeed * 0.3) {
      m.stuckT += dt;
      if (m.stuckT > 0.5 && m.detourT <= 0) {
        m.detour = (Math.random() < 0.5 ? -1 : 1) * (1.0 + Math.random() * 0.6);
        m.detourT = 0.9;
        m.stuckT = 0;
      }
    } else {
      m.stuckT = Math.max(0, m.stuckT - dt);
    }

    // Painovoima (tönäisyn hypähdys) ja maassa pysyminen
    if (m.vy !== 0 || pos.y > ground + 0.02) {
      m.vy -= 20 * dt;
      pos.y += m.vy * dt;
      if (pos.y <= ground) { pos.y = ground; m.vy = 0; }
    } else {
      pos.y = ground;
    }
  }

  // --- Animaatio ---------------------------------------------------------------
  _animate(m, dt, elapsed) {
    const md = m.model;
    md.group.position.set(m.pos.x, m.pos.y + m.yOff, m.pos.z);
    md.group.rotation.y = m.yaw;
    m.flash *= Math.exp(-dt * 9);
    md.material.emissive.setRGB(m.flash * 0.85, m.flash * 0.22, m.flash * 0.12);
    const speed = Math.hypot(m.vel.x, m.vel.z);
    m.phase += speed * dt * (m.type === 'warthog' ? 4.4 : 3.2);
    if (m.type === 'warthog') this._animWarthog(m, md, speed, dt, elapsed);
    else this._animClay(m, md, speed, dt, elapsed);
  }

  _animWarthog(m, md, speed, dt, elapsed) {
    const ph = m.phase;
    const amp = Math.min(0.75, speed * 0.16);
    const L = md.legs;
    // Ravi: vastakkaiset kulmat yhtä aikaa
    let lf = Math.sin(ph) * amp, rf = Math.sin(ph + Math.PI) * amp;
    let headX = 0.1, tailX = 0.25 + Math.sin(elapsed * 3 + m.phase) * 0.25;
    let bodyY = Math.abs(Math.sin(ph)) * 0.025 * Math.min(1, speed / 2);
    let bodyRX = 0;
    const s = m.state;
    if (s === 'graze') {
      headX = 0.75 + Math.sin(elapsed * 4 + m.phase) * 0.06 * (Math.sin(elapsed * 0.7 + m.phase) > 0 ? 1 : 0);
    } else if (s === 'alert') {
      headX = -0.15;
    } else if (s === 'windup') {
      // Pää alas, etujalka kuopii
      headX = 0.5;
      lf = Math.sin(m.stateT * 16) * 0.5 - 0.2;
      bodyRX = 0.08;
    } else if (s === 'attack') {
      headX = 0.4 - Math.sin(Math.min(1, m.stateT / m.def.attack) * Math.PI) * 0.7;
    } else if (s === 'stagger') {
      headX = -0.3 + Math.sin(m.stateT * 20) * 0.1;
      bodyRX = -0.1;
    }
    if (speed > 3) tailX = Math.PI - 0.25 + Math.sin(elapsed * 9) * 0.06; // häntä pystyssä juostessa
    L[0].rotation.x = lf; L[3].rotation.x = lf;
    L[1].rotation.x = rf; L[2].rotation.x = rf;
    md.body.position.y = bodyY;
    md.body.rotation.x = bodyRX;
    md.head.rotation.x += (headX - md.head.rotation.x) * Math.min(1, dt * 10);
    md.head.position.y = 0.62 + bodyY;
    md.tail.rotation.x += (-tailX - md.tail.rotation.x) * Math.min(1, dt * 8);
    if (s === 'dead') {
      // Kaatuu kyljelleen, jalat suoristuvat; lopuksi vajoaa maahan.
      const k = smooth(m.deadT / 0.45);
      md.group.rotation.z = m.deathSide * k * 1.5;
      md.group.position.y += k * 0.12 - Math.max(0, m.deadT - 4.5) * 0.4;
      for (const l of L) l.rotation.x *= Math.exp(-dt * 6);
    }
  }

  _animClay(m, md, speed, dt, elapsed) {
    const ph = m.phase;
    const amp = Math.min(0.7, speed * 0.28);
    const sw = Math.sin(ph) * amp;
    md.legs[0].rotation.x = sw;
    md.legs[1].rotation.x = -sw;
    let armL = -sw * 0.8, armR = sw * 0.8, lean = 0.35 + Math.min(0.2, speed * 0.05);
    let armZ = 0;
    const s = m.state;
    if (s === 'windup') {
      const k = smooth(m.stateT / m.def.windup);
      armL = armR = -2.5 * k;
      lean = 0.35 - 0.25 * k;
      armZ = 0.25 * k;
    } else if (s === 'attack') {
      const k = smooth(m.stateT / m.def.attack);
      armL = armR = -2.5 + 3.2 * k;
      lean = 0.1 + 0.55 * k;
    } else if (s === 'recover') {
      const k = smooth(m.stateT / m.def.recover);
      armL = armR = 0.7 * (1 - k);
      lean = 0.65 - 0.3 * k;
    } else if (s === 'stagger') {
      armL = 0.6; armR = 0.4;
      lean = -0.15 + Math.sin(m.stateT * 18) * 0.06;
    } else if (s === 'emerge' || s === 'crumble') {
      lean = 0.2 + Math.sin(elapsed * 30) * 0.05;
      armL = -0.4 + Math.sin(elapsed * 23) * 0.2;
      armR = -0.4 + Math.sin(elapsed * 27) * 0.2;
    } else {
      armL += Math.sin(elapsed * 1.7 + m.phase) * 0.05;
      armR += Math.sin(elapsed * 1.9 + m.phase) * 0.05;
    }
    md.arms[0].rotation.x += (armL - md.arms[0].rotation.x) * Math.min(1, dt * 14);
    md.arms[1].rotation.x += (armR - md.arms[1].rotation.x) * Math.min(1, dt * 14);
    md.arms[0].rotation.z = -armZ;
    md.arms[1].rotation.z = armZ;
    md.torso.rotation.x += (lean - md.torso.rotation.x) * Math.min(1, dt * 10);
    md.torso.position.y = 0.5 + Math.abs(Math.sin(ph)) * 0.03 * Math.min(1, speed);
    md.head.rotation.x = -0.25 + Math.sin(elapsed * 2.1 + m.phase) * 0.05;
    // Silmien hehku sykkii hiukan
    const glow = 1 + Math.sin(elapsed * 5 + m.phase) * 0.12 + (s === 'windup' ? 0.35 : 0);
    for (const e of md.eyes) e.scale.setScalar(glow);
  }
}
