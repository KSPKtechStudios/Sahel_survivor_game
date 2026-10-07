// Veneet: soutuvene, purjevene ja purjelaiva. Rakennetaan vasaralla veteen
// (työstöpenkin lähelle); kyytiin noustaan [E]:llä.
//
// Soutuvene: [W]/[S] soutaa eteen tai taakse (kuluttaa kestävyyttä, [Shift]
// nopeammin), [A]/[D] kääntää. Purjeveneet: [W]/[S] vaihtaa nopeusasetusta
// (taakse, seis, hiljaa, puolet purjeista, täydet purjeet), [A]/[D] peräsin.
// Purjeet kääntyvät ja täyttyvät tuulen mukaan: suoraan vastatuuleen ei
// pääse (purjeet lepattavat), sivu- ja myötätuulessa kulku on nopeinta.
// Matalikkoon ajo vaurioittaa venettä; vasara korjaa. [E] nousee maihin.
//
// HUOM: nopeudet, kestävyydet ja hinnat ovat prototyypin arvoja (ks. docs/DESIGN.md).
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { waterAt, edgeFactor } from '../world/terrain.js';
import { waveHeight, openFactor } from '../world/waves.js';
import { BOAT_MODELS, updateSail } from '../models/boats.js';
import { events } from './events.js';

// L = pituus, B = puolileveys, keel = kölin syvyys (malli), draft = vapaaseen
// kulkuun tarvittava syvyys, launch = rakentamiseen riittävä syvyys keskellä
// (matalasta rannasta vene ajetaan syvemmälle), reach = haamun ulottuvuus,
// top = rungon korkein kohta (osumalaatikko), mass = keinunnan hitaus (s),
// accel / turnAccel = kiihtyvyyden aikavakiot (s), ground = karilleajon
// vaurio (osuus kestävyydestä / m/s), seat = pelaajan jalat, eye = silmien korkeus.
export const BOATS = {
  rowboat: {
    name: 'Soutuvene', L: 3.8, B: 0.7, keel: 0.32, draft: 0.3, launch: 0.22, reach: 22, hp: 60, top: 0.65, mass: 0.3,
    row: { speed: 2.0, sprint: 2.9, cost: 1.6, sprintCost: 6 },
    turn: 1.0, accel: 1.0, turnAccel: 0.3, ground: 0.05,
    seat: [0, 0.13, -0.95], eye: 0.92, wake: 0.3,
    repair: { wood: 1 }, wreck: { wood: 3 },
  },
  sailboat: {
    name: 'Purjevene', L: 6.6, B: 1.1, keel: 0.6, draft: 0.55, launch: 0.4, reach: 30, hp: 180, top: 1.05, mass: 0.55,
    sail: { max: 5.6, noGo: 0.75, rig: 'lateen' }, slow: 1.0,
    turn: 0.7, accel: 2.6, turnAccel: 0.6, ground: 0.05, heel: 0.16,
    seat: [0, 0.42, -2.55], eye: 0.92, wake: 0.22, hike: 0.42,
    repair: { wood: 2 }, wreck: { wood: 6, rope: 2 },
  },
  ship: {
    name: 'Purjelaiva', L: 24, B: 3.7, keel: 1.6, draft: 1.25, launch: 0.7, reach: 60, hp: 1200, top: 7.8, mass: 2.0,
    sail: { max: 8.4, noGo: 1.05, rig: 'square' }, slow: 0.9,
    turn: 0.22, accel: 7, turnAccel: 1.8, ground: 0.03, heel: 0.05,
    seat: [0, 4.92, -5.7], eye: CONFIG.eyeHeight, wake: 0.12,
    repair: { wood: 6, gum: 1 }, wreck: { wood: 25, rope: 6 },
  },
};

// Purjeveneiden nopeusasetukset ([W] / [S]).
export const SAIL_SETTINGS = { '-1': 'Taaksepäin', 0: 'Seis', 1: 'Hiljaa eteenpäin', 2: 'Puolet purjeista', 3: 'Täysin purjein' };

const _wq = {};
const _wq2 = {};
const _v = new THREE.Vector3();
const _inv = new THREE.Matrix4();
const _ray = new THREE.Ray();
const _hit = new THREE.Vector3();

function smoothstep(a, b, x) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

// Purjeen veto kulman mukaan (theta = kulma tuulen tulosuunnasta: 0 =
// vastatuuli, π = myötätuuli). Raakapurjeet vetävät parhaiten myötätuulessa,
// latinalaispurje sivutuulessa.
export function sailPolar(theta, noGo, rig) {
  const s = smoothstep(noGo, noGo + 0.45, theta);
  return rig === 'square' ? s * (0.62 + 0.38 * (1 - Math.cos(theta)) / 2) : s * (0.8 + 0.2 * Math.sin(theta));
}

// Tuulen nimi suhteessa veneen kulkusuuntaan.
export function windName(theta, noGo) {
  if (theta < noGo) return 'Vastatuuli';
  if (theta < 1.25) return 'Vastainen';
  if (theta < 1.95) return 'Sivutuuli';
  if (theta < 2.65) return 'Laitamyötäinen';
  return 'Myötätuuli';
}

export class Boats {
  constructor({ scene, camera, player, env, drops, waves }) {
    Object.assign(this, { scene, camera, player, env, drops, waves });
    this.list = [];
    this.riding = null;
    this.fx = null; // main.js: { ripple(x, z, r, s), splash(x, y, z, voima, opts) }
    this.prompt = null;
  }

  // Hylyn näytteet: rungon pisteet (veneen koordinaatit) ja syväyskerroin.
  _samples(def) {
    const { L, B } = def;
    return [
      [0, 0, 1], [0, L * 0.42, 0.5], [0, -L * 0.42, 0.75],
      [B * 0.8, 0, 0.75], [-B * 0.8, 0, 0.75],
      [B * 0.6, L * 0.25, 0.7], [-B * 0.6, L * 0.25, 0.7],
      [B * 0.65, -L * 0.25, 0.8], [-B * 0.65, -L * 0.25, 0.8],
    ];
  }

  // Vapaa vesi rungon alla: pienin (syvyys - tarvittava syvyys). Negatiivinen
  // = pohja tai ranta on liian lähellä. Eri vesistö (tason ero) = -1.
  // draft = 0: pienin veden syvyys rungon alla (onko koko vene vedessä).
  clearance(type, x, z, yaw, draft = null) {
    const def = BOATS[type];
    const need = draft === null ? def.draft : draft;
    const fx = Math.sin(yaw), fz = Math.cos(yaw), px = Math.cos(yaw), pz = -Math.sin(yaw);
    let min = Infinity, wl0 = null;
    for (const [lx, lz, k] of def.samples || (def.samples = this._samples(def))) {
      const w = waterAt(x + lx * px + lz * fx, z + lx * pz + lz * fz, _wq2);
      if (wl0 === null) wl0 = w.wl;
      const c = Math.abs(w.wl - wl0) > 0.6 ? -1 : w.wl - w.h - need * k;
      if (c < min) min = c;
    }
    return min;
  }

  add(type, x, z, yaw = 0) {
    const def = BOATS[type];
    if (!def) return null;
    const parts = BOAT_MODELS[type](Math.floor(Math.random() * 1000));
    const w = waterAt(x, z, _wq);
    const b = {
      type, def, parts, group: parts.group, x, z, yaw, y: w.wl, pitch: 0, roll: 0,
      speed: 0, yawRate: 0, rudder: 0, hp: def.hp, setting: 0, drive: 0,
      sailAmt: 0.02, hoisted: 0, fill: 0, flap: 0, theta: Math.PI, windK: 1, wakeT: 0, sinking: -1,
      clear: 0, floorC: 0, atEdge: false, tired: false,
      box: new THREE.Box3(new THREE.Vector3(-def.B - 0.1, -def.keel, -def.L / 2 - 0.1), new THREE.Vector3(def.B + 0.1, def.top, def.L / 2 + 0.1)),
    };
    for (const s of parts.sails) s.side = 1;
    // Matalaan rantaveteen laskettu vene saa liikkua, kunhan se ei mene
    // matalammalle kuin missä se jo on käynyt (floorC nousee syvemmällä).
    b.clear = this.clearance(type, x, z, yaw);
    b.floorC = Math.min(0, b.clear);
    b.group.position.set(x, b.y, z);
    b.group.rotation.set(0, yaw, 0, 'YXZ');
    this.scene.add(b.group);
    this.list.push(b);
    this._pose(b, 0, 0, true);
    return b;
  }

  remove(b) {
    const i = this.list.indexOf(b);
    if (i < 0) return;
    if (this.riding === b) this.detach();
    this.list.splice(i, 1);
    this.scene.remove(b.group);
    b.group.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
    b.parts.mats.wood.dispose();
    b.parts.mats.sail.dispose();
  }

  clear() {
    for (const b of this.list.slice()) this.remove(b);
    this.riding = null;
    this.player.riding = null;
  }

  // ---- Kyytiin ja maihin ---------------------------------------------------------
  board(b, silent = false) {
    if (!b || b.sinking >= 0 || this.player.dead) return false;
    this.riding = b;
    this.player.riding = b;
    this.player.crouching = false;
    this.player.velocity.set(0, 0, 0);
    this.player.knock.set(0, 0, 0);
    this._placeRider();
    if (!silent) {
      events.emit('boardBoat', { type: b.type });
      events.emit('message', { text: b.def.row ? `${b.def.name}: [W]/[S] soutu, [A]/[D] käänny` : `${b.def.name}: [W]/[S] purjeet, [A]/[D] peräsin` });
    }
    return true;
  }

  // Irrota pelaaja veneestä paikalleen (kuolema, siirto).
  detach() {
    if (this.riding) this.riding.setting = 0;
    this.riding = null;
    this.player.riding = null;
  }

  // Maihin: kuiva (tai matala) paikka veneen vierestä, muuten veteen laidan viereen.
  disembark() {
    const b = this.riding;
    if (!b) return;
    this.detach();
    const spot = this._landingSpot(b);
    const p = this.player;
    if (spot) {
      p.position.set(spot.x, spot.y, spot.z);
      p.velocity.set(0, 0, 0);
    } else {
      const s = Math.cos(b.yaw), c = -Math.sin(b.yaw);
      p.teleport(b.x + s * (b.def.B + 1.0), b.z + c * (b.def.B + 1.0));
    }
    events.emit('leaveBoat', { type: b.type });
  }

  _landingSpot(b) {
    const fx = Math.sin(b.yaw), fz = Math.cos(b.yaw), px = Math.cos(b.yaw), pz = -Math.sin(b.yaw);
    const seat = this.player.position;
    for (let ring = 0; ring < 8; ring++) {
      const off = 0.6 + ring * 0.8;
      let best = null, bd = Infinity;
      for (let i = 0; i < 20; i++) {
        const a = (i / 20) * Math.PI * 2;
        const lx = Math.cos(a) * (b.def.B + off), lz = Math.sin(a) * (b.def.L * 0.5 + off);
        const x = b.x + lx * px + lz * fx, z = b.z + lx * pz + lz * fz;
        const w = waterAt(x, z, _wq2);
        if (w.wl - w.h > 0.45) continue;
        const d = (x - seat.x) ** 2 + (z - seat.z) ** 2;
        if (d < bd) { bd = d; best = { x, y: w.h + 0.05, z }; }
      }
      if (best) return best;
    }
    return null;
  }

  _placeRider() {
    const b = this.riding;
    b.group.updateMatrixWorld();
    // Purjeveneessä istutaan tuulen puoleisella laidalla.
    _v.set(b.def.seat[0] + (b.hikeX || 0), b.def.seat[1], b.def.seat[2]);
    b.group.localToWorld(_v);
    this.player.position.copy(_v);
    this.player.rideEye = b.def.eye;
    this.player.rideRoll = b.roll * 0.35;
  }

  // ---- Vauriot, korjaus ja uppoaminen ---------------------------------------------
  damage(b, amount) {
    if (b.sinking >= 0 || amount <= 0) return;
    b.hp = Math.max(0, b.hp - amount);
    if (this.riding === b) {
      events.emit('hitFeedback', { strength: Math.min(1, 0.3 + amount / (b.def.hp * 0.15)) });
      events.emit('message', { text: b.hp > 0 ? `${b.def.name} kolhiintui (kunto ${Math.round((b.hp / b.def.hp) * 100)} %)` : `${b.def.name} uppoaa!` });
    }
    if (b.hp <= 0) this._sink(b);
  }

  repair(b) {
    if (b.hp >= b.def.hp) return false;
    b.hp = Math.min(b.def.hp, b.hp + b.def.hp * 0.25);
    return true;
  }

  _sink(b) {
    if (this.riding === b) this.disembark();
    b.sinking = 0;
    b.setting = 0;
    b.rollDir = Math.random() < 0.5 ? -1 : 1;
    // Hylystä jää kelluvia tarvikkeita.
    if (this.drops) {
      for (const [id, n] of Object.entries(b.def.wreck)) this.drops.spawn(id, n, _v.set(b.x, b.y + 0.6, b.z));
    }
  }

  // ---- Säde (kyytiin nousu, vasara) -------------------------------------------------
  raycast(origin, dir, maxDist, exclude = this.riding) {
    let best = null;
    for (const b of this.list) {
      if (b === exclude || b.sinking >= 0) continue;
      const r = b.def.L * 0.5 + maxDist + 1;
      if ((b.x - origin.x) ** 2 + (b.z - origin.z) ** 2 > r * r) continue;
      _inv.copy(b.group.matrixWorld).invert();
      _ray.set(origin, dir).applyMatrix4(_inv);
      if (!_ray.intersectBox(b.box, _hit)) continue;
      const t = _hit.applyMatrix4(b.group.matrixWorld).distanceTo(origin);
      if (t <= maxDist && (!best || t < best.t)) best = { obj: b, t };
    }
    return best;
  }

  // Lähin vene säteellä r (pisteestä).
  nearest(x, z, r) {
    let best = null, bd = Infinity;
    for (const b of this.list) {
      if (b.sinking >= 0) continue;
      const d = Math.hypot(b.x - x, b.z - z) - b.def.L * 0.5;
      if (d < r && d < bd) { bd = d; best = b; }
    }
    return best;
  }

  // ---- Päivitys ---------------------------------------------------------------------------
  update(dt, input, t) {
    this.prompt = null;
    if (!this.list.length) return;
    this._pushOut();
    for (const b of this.list.slice()) this._updateBoat(b, dt, input, t);
    if (this.riding) {
      this._placeRider();
      this.prompt = { name: this.riding.def.name, action: '[E] Nouse maihin', hp: this.riding.hp < this.riding.def.hp ? this.riding.hp / this.riding.def.hp : null };
    }
  }

  _updateBoat(b, dt, input, t) {
    const def = b.def;
    if (b.sinking >= 0) {
      b.sinking += dt;
      b.y -= dt * (0.2 + b.sinking * 0.1);
      b.roll += dt * 0.06 * b.rollDir;
      b.pitch += dt * 0.025;
      b.group.position.set(b.x, b.y, b.z);
      b.group.rotation.set(b.pitch, b.yaw, b.roll, 'YXZ');
      if (b.sinking > 16) this.remove(b);
      return;
    }
    const rider = this.riding === b;
    const p = this.player;
    let steer = 0, throttle = 0, boost = false;
    if (rider && input.enabled && !p.dead && dt > 0) {
      steer = (input.down('KeyA') || input.down('ArrowLeft') ? 1 : 0) - (input.down('KeyD') || input.down('ArrowRight') ? 1 : 0);
      if (def.row) {
        throttle = (input.down('KeyW') || input.down('ArrowUp') ? 1 : 0) - (input.down('KeyS') || input.down('ArrowDown') ? 1 : 0);
        boost = input.down('ShiftLeft') || input.down('ShiftRight');
      } else {
        if (input.pressed.has('KeyW') || input.pressed.has('ArrowUp')) b.setting = Math.min(3, b.setting + 1);
        if (input.pressed.has('KeyS') || input.pressed.has('ArrowDown')) b.setting = Math.max(-1, b.setting - 1);
      }
    }
    b.throttle = throttle;
    b.steer = steer;

    // Tuuli veneen koordinaateissa (x = vasen laita, z = keula).
    const fx = Math.sin(b.yaw), fz = Math.cos(b.yaw), px = Math.cos(b.yaw), pz = -Math.sin(b.yaw);
    const wd = this.env.windDir;
    const wf = wd.x * fx + wd.y * fz;
    const wp = wd.x * px + wd.y * pz;
    b.wf = wf;
    b.wp = wp;
    b.theta = Math.acos(Math.max(-1, Math.min(1, -wf)));
    b.windK = 0.6 + 0.55 * Math.min(1, this.env.w.wind) * (0.85 + 0.15 * Math.sin(t * 0.4));

    // Tavoitenopeus
    let target = 0;
    b.drive = 0;
    if (def.row) {
      b.tired = p.stamina <= 0.5 && !p.god;
      const sp = boost && !b.tired ? def.row.sprint : def.row.speed;
      target = throttle * sp * (b.tired ? 0.45 : 1);
      if (rider && (throttle !== 0 || steer !== 0) && !p.god) {
        const cost = (boost ? def.row.sprintCost : def.row.cost) * (throttle !== 0 ? 1 : 0.5);
        p.stamina = Math.max(0, p.stamina - cost * dt);
        p.staminaDelay = CONFIG.staminaRegenDelay;
      }
    } else {
      const s = b.setting;
      if (s === -1) target = -def.slow * 0.7;
      else if (s === 1) target = def.slow;
      else if (s >= 2) {
        const amt = s === 3 ? 1 : 0.55;
        b.drive = sailPolar(b.theta, def.sail.noGo, def.sail.rig);
        target = def.sail.max * b.drive * b.windK * amt;
        if (b.theta < def.sail.noGo) target -= 0.35 * amt;
      }
    }
    b.speed += (target - b.speed) * (1 - Math.exp(-dt / def.accel));
    if (target === 0 && Math.abs(b.speed) < 0.02) b.speed = 0;

    // Kääntyminen: peräsin tehoaa vauhdissa; soutuvene kääntyy paikallaan.
    const v = Math.abs(b.speed);
    const eff = def.row ? 1 - 0.25 * Math.min(1, v / def.row.sprint) : Math.min(1, 0.3 + v / (def.sail.max * 0.4));
    b.rudder += (steer - b.rudder) * (1 - Math.exp(-dt / 0.25));
    b.yawRate += (b.rudder * def.turn * eff - b.yawRate) * (1 - Math.exp(-dt / def.turnAccel));
    if (steer === 0 && Math.abs(b.yawRate) < 0.002) b.yawRate = 0;

    // Liike ja karilleajo
    const w0 = waterAt(b.x, b.z, _wq);
    const flowK = rider ? 0.6 : 0;
    const nyaw = b.yaw + b.yawRate * dt;
    const dx = Math.sin(nyaw) * b.speed * dt + w0.flowX * flowK * dt;
    const dz = Math.cos(nyaw) * b.speed * dt + w0.flowZ * flowK * dt;
    if (Math.abs(dx) + Math.abs(dz) > 1e-6 || Math.abs(b.yawRate * dt) > 1e-7) {
      // Pohjan pienet kumpareet eivät pysäytä (toleranssi syväyksen mukaan).
      const ok = (c) => c >= b.floorC - Math.min(0.25, def.draft * 0.3);
      const c = this.clearance(b.type, b.x + dx, b.z + dz, nyaw);
      if (ok(c)) {
        if (rider) p.yaw += nyaw - b.yaw;
        b.x += dx;
        b.z += dz;
        b.yaw = nyaw;
        b.clear = c;
        if (c > b.floorC) b.floorC = Math.min(0, c);
      } else {
        const c2 = this.clearance(b.type, b.x, b.z, nyaw);
        if (ok(c2)) {
          if (rider) p.yaw += nyaw - b.yaw;
          b.yaw = nyaw;
          b.clear = c2;
        } else {
          b.yawRate = 0;
        }
        const impact = Math.abs(b.speed);
        if (impact > 1.6) this.damage(b, (impact - 1.6) * def.ground * def.hp);
        else if (impact > 0.5 && rider) events.emit('hitFeedback', { strength: 0.25 });
        b.speed *= -0.2;
      }
      // Maailman reuna: virta työntää takaisin.
      const e = edgeFactor(b.x, b.z);
      b.atEdge = e > 0.985;
      if (b.atEdge) {
        const len = Math.hypot(b.x, b.z) || 1;
        const push = (e - 0.985) * 400 * dt + 0.02;
        b.x -= (b.x / len) * push;
        b.z -= (b.z / len) * push;
        b.speed *= Math.exp(-dt * 2);
      }
    }
    if (b.sinking >= 0) return;
    this._pose(b, dt, t);
    this._animate(b, dt, t, rider, boost);
  }

  // Kelluminen: korkeus ja kallistus aaltojen mukaan.
  _pose(b, dt, t, snap = false) {
    const def = b.def;
    const W = this.waves;
    const fx = Math.sin(b.yaw), fz = Math.cos(b.yaw), px = Math.cos(b.yaw), pz = -Math.sin(b.yaw);
    const wq = waterAt(b.x, b.z, _wq);
    b.wl = wq.wl;
    const amp = W ? W.amp * openFactor(wq.type, wq.wl - wq.h, wq.ocean, wq.lakeR) : 0;
    const hw = (lx, lz) => (amp > 0.0001 ? waveHeight(b.x + lx * px + lz * fx, b.z + lx * pz + lz * fz, W.t, amp, W.windX, W.windZ) : 0);
    const hc = hw(0, 0), hb = hw(0, def.L * 0.4), hs = hw(0, -def.L * 0.4), hp = hw(def.B, 0), hst = hw(-def.B, 0);
    const yT = wq.wl + (hc * 2 + hb + hs + hp + hst) / 6;
    const pitchT = -Math.atan2(hb - hs, def.L * 0.8);
    let rollT = Math.atan2(hp - hst, def.B * 2);
    // Purjeet kallistavat tuulen alapuolelle.
    if (def.heel && b.drive > 0) rollT += (b.wp < 0 ? 1 : -1) * def.heel * b.drive * b.sailAmt * b.windK;
    const k = snap ? 1 : 1 - Math.exp(-dt / def.mass);
    // Keulan iskeytyminen aaltoon: vesi nousee keulaa vasten nopeammin kuin
    // runko ehtii nousta (tyrskyjen voimakkuus, sessio 12d).
    const rel = wq.wl + hb - b.y;
    b.slam = dt > 0 && b.prevRel !== undefined ? Math.max(0, (rel - b.prevRel) / dt) : 0;
    b.prevRel = rel;
    b.waveAmp = amp;
    b.y += (yT - b.y) * k;
    b.pitch += (pitchT - b.pitch) * k;
    b.roll += (rollT - b.roll) * k;
    b.group.position.set(b.x, b.y, b.z);
    b.group.rotation.set(b.pitch, b.yaw, b.roll, 'YXZ');
    b.group.updateMatrixWorld();
  }

  // Purjeet, viirit, ruori, airot ja vana.
  _animate(b, dt, t, rider, boost) {
    const def = b.def;
    const P = b.parts;
    const near = this.camera.position.distanceToSquared(b.group.position) < 260 * 260;
    if (P.sails.length) {
      const s = b.setting;
      const want = s >= 2;
      // Purjeet: ensin raakapuu ylös, sitten purje auki; laskiessa päinvastoin.
      const hoistT = want ? 1 : b.sailAmt < 0.08 ? 0 : 1;
      b.hoisted += (hoistT - b.hoisted) * (1 - Math.exp(-dt * 1.4));
      const amtT = want && b.hoisted > 0.9 ? (s === 3 ? 1 : 0.55) : 0.02;
      b.sailAmt += (amtT - b.sailAmt) * (1 - Math.exp(-dt * 1.2));
      const fillT = s >= 2 ? Math.min(1, b.drive * 1.4) : 0;
      b.fill += (fillT - b.fill) * (1 - Math.exp(-dt * 2));
      const flapT = s >= 2 ? Math.max(0, 1 - b.drive * 2.5) : 0.2;
      b.flap += (flapT - b.flap) * (1 - Math.exp(-dt * 2));
      const fromPort = b.wp < 0;
      // Paikallaan oleva, purjeet kääritty: muotoa ei tarvitse laskea joka ruudulla.
      const idle = !rider && s < 2 && b.sailAmt < 0.03 && b.hoisted < 0.02 && b.fill < 0.01 && b.speed === 0;
      for (const sl of P.sails) {
        let ang = 0;
        if (!want) {
          ang = 0; // käärityt purjeet keskilinjassa
        } else if (sl.rig === 'square') {
          const brace = Math.min(0.75, Math.max(0, (Math.PI - b.theta) * 0.5));
          ang = fromPort ? -brace : brace;
        } else {
          const boom = Math.min(1.2, Math.max(0.12, (b.theta - 0.5) * 0.6));
          ang = fromPort ? boom : -boom;
        }
        sl.yard.rotation.y += (ang - sl.yard.rotation.y) * (1 - Math.exp(-dt * 1.2));
        if (sl.hoist) sl.hoist.rotation.x = -sl.lower * (1 - b.hoisted);
        if (!near || (idle && sl.idle)) continue;
        sl.idle = idle;
        // Pullistus tuulen alapuolelle: purjeen normaali veneen koordinaateissa.
        const n = sl.mesh.userData.sail.normal;
        const ca = Math.cos(sl.yard.rotation.y), sa = Math.sin(sl.yard.rotation.y);
        const nx = n.x * ca + n.z * sa, nz = -n.x * sa + n.z * ca;
        sl.side += ((nx * b.wp + nz * b.wf >= 0 ? 1 : -1) - sl.side) * (1 - Math.exp(-dt * 3));
        updateSail(sl.mesh, b.sailAmt, b.fill, sl.side, b.flap, t + sl.yard.id * 1.7);
      }
    }
    for (const pen of P.pennants) {
      pen.rotation.y = Math.atan2(b.wp, b.wf) + Math.sin(t * 6.3 + pen.id) * 0.1;
      pen.rotation.z = Math.sin(t * 9.1 + pen.id * 2) * 0.12;
    }
    if (P.wheel) P.wheel.rotation.z = -b.rudder * 2.2;
    if (def.hike) {
      const want = b.setting >= 2 ? (b.wp < 0 ? 1 : -1) * def.hike : 0;
      b.hikeX = (b.hikeX || 0) + (want - (b.hikeX || 0)) * (1 - Math.exp(-dt * 1.5));
    }
    // Airot: vasen ja oikea erikseen (kääntyessä toinen soutaa taaksepäin).
    for (const oar of P.oars) {
      const sx = oar.userData.side;
      const thr = Math.max(-1, Math.min(1, b.throttle + (sx > 0 ? -b.steer : b.steer) * 0.8));
      let sweep, lift;
      const u = oar.userData;
      if (rider && thr !== 0) {
        const prev = Math.sin(u.phase || 0);
        u.phase = (u.phase || 0) + dt * (boost && !b.tired ? 7.5 : b.tired ? 3.5 : 5.5) * thr;
        sweep = -0.55 * Math.cos(u.phase);
        lift = -0.09 - 0.15 * Math.sin(u.phase);
        // Mela osuu veteen: pieni roiske.
        if (prev <= 0 && Math.sin(u.phase) > 0 && this.fx && near) {
          oar.children[0].localToWorld(_v.set(1.98, 0, 0));
          this.fx.splash(_v.x, b.wl, _v.z, 0.25, { spread: 0.3 });
          this.fx.ripple(_v.x, _v.z, 0.5, 0.12);
        }
      } else if (rider) {
        sweep = -0.15;
        lift = 0.04;
      } else {
        sweep = 1.45;
        lift = 0.02;
      }
      const k = 1 - Math.exp(-dt * 12);
      u.sweep = (u.sweep ?? sweep) + (sweep - (u.sweep ?? sweep)) * k;
      u.lift = (u.lift ?? lift) + (lift - (u.lift ?? lift)) * k;
      oar.rotation.set(0, sx * u.sweep, sx * u.lift);
    }
    // Vana ja keularoiskeet
    b.wakeT -= dt;
    const v = Math.abs(b.speed);
    // Tyrskyt: keula iskeytyy aaltoon (aallokossa) tai halkoo vettä vauhdilla.
    // Pisarat lentävät keulan molemmin puolin ulos ja ylös, tuuli kantaa niitä.
    b.sprayT = (b.sprayT || 0) - dt;
    const slamI = (b.slam || 0) * Math.min(1, (b.waveAmp || 0) * 3) * (0.5 + Math.min(1, v / 3));
    const sprayI = Math.min(2.4, slamI * 1.4 + Math.max(0, v - 1.4) * 0.22);
    if (this.fx && near && b.speed > 0.3 && sprayI > 0.22 && b.sprayT <= 0) {
      const big = b.type === 'ship';
      b.sprayT = big ? 0.09 : 0.12;
      const fx = Math.sin(b.yaw), fz = Math.cos(b.yaw), px = Math.cos(b.yaw), pz = -Math.sin(b.yaw);
      const W = this.waves;
      for (const sx of [1, -1]) {
        const along = def.L * (big ? 0.4 : 0.38);
        const x = b.x + fx * along + px * sx * def.B * 0.75, z = b.z + fz * along + pz * sx * def.B * 0.75;
        // Suunta: ulos laidalta ja hieman eteen; tuuli lisää sivuttaista ajoa.
        const dx = px * sx * 0.8 + fx * 0.5 + (W ? W.windX * 0.4 : 0), dz = pz * sx * 0.8 + fz * 0.5 + (W ? W.windZ * 0.4 : 0);
        this.fx.splash(x, b.wl + (b.y - b.wl) * 0.5, z, sprayI * (big ? 1.5 : 1.0), {
          spread: big ? 1.0 : 0.5, dx, dz, push: 1.2 + sprayI * (big ? 2.2 : 1.3), upMul: 0.8 + sprayI * 0.5,
        });
      }
    }
    if (this.fx && near && v > 0.6 && b.wakeT <= 0) {
      b.wakeT = def.wake;
      const fx = Math.sin(b.yaw), fz = Math.cos(b.yaw), px = Math.cos(b.yaw), pz = -Math.sin(b.yaw);
      const back = b.speed > 0 ? -1 : 1;
      const big = b.type === 'ship';
      const r = big ? 2.2 : b.type === 'sailboat' ? 1.0 : 0.6;
      this.fx.ripple(b.x + fx * back * def.L * 0.48, b.z + fz * back * def.L * 0.48, r, 0.06 + Math.min(1, v / 6) * 0.12);
      for (const sx of [1, -1]) {
        this.fx.ripple(b.x + px * sx * def.B * 1.05, b.z + pz * sx * def.B * 1.05, r * 0.7, 0.04 + Math.min(1, v / 8) * 0.08);
      }
      if (v > 3 && b.speed > 0) {
        const bx = b.x + fx * def.L * 0.47, bz = b.z + fz * def.L * 0.47;
        this.fx.splash(bx, b.wl, bz, Math.min(1.6, (v / 8) * (big ? 1.6 : 0.8)), { spread: big ? 1.6 : 0.6 });
      }
    }
  }

  // Uimari ei mene rungon läpi: työnnetään ulos veneen ääriviivalta.
  _pushOut() {
    const p = this.player;
    if (p.riding || p.flying) return;
    const pos = p.position;
    for (const b of this.list) {
      if (b.sinking >= 0) continue;
      const dx = pos.x - b.x, dz = pos.z - b.z;
      const R = b.def.L * 0.5 + 1;
      if (dx * dx + dz * dz > R * R || pos.y > b.y + b.def.top) continue;
      const fx = Math.sin(b.yaw), fz = Math.cos(b.yaw), px = Math.cos(b.yaw), pz = -Math.sin(b.yaw);
      let lx = dx * px + dz * pz, lz = dx * fx + dz * fz;
      const ax = b.def.B + 0.35, az = b.def.L * 0.5 + 0.35;
      const e = (lx / ax) ** 2 + (lz / az) ** 2;
      if (e >= 1) continue;
      if (e < 1e-6) { lx = ax; lz = 0; } else {
        const k = 1 / Math.sqrt(e);
        lx *= k;
        lz *= k;
      }
      pos.x = b.x + lx * px + lz * fx;
      pos.z = b.z + lx * pz + lz * fz;
    }
  }

  // ---- Tallennus ------------------------------------------------------------------------------
  serialize() {
    const live = this.list.filter((b) => b.sinking < 0);
    const r = (x, k = 100) => Math.round(x * k) / k;
    return {
      list: live.map((b) => ({ type: b.type, x: r(b.x), z: r(b.z), yaw: r(b.yaw, 1000), hp: Math.round(b.hp) })),
      riding: this.riding ? live.indexOf(this.riding) : -1,
    };
  }

  load(d) {
    this.clear();
    if (!d || !Array.isArray(d.list)) return;
    for (const s of d.list) {
      if (!s || !BOATS[s.type] || !Number.isFinite(s.x) || !Number.isFinite(s.z)) continue;
      const b = this.add(s.type, s.x, s.z, Number.isFinite(s.yaw) ? s.yaw : 0);
      if (Number.isFinite(s.hp)) b.hp = Math.max(1, Math.min(b.def.hp, s.hp));
    }
    if (Number.isInteger(d.riding) && this.list[d.riding]) this.board(this.list[d.riding], true);
  }
}
