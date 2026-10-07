// Eläimet ja viholliset: syntyminen pelaajan ympärille, tekoäly, liike,
// osumat, tönäisyt ja kuolema.
//
// Pahkasika: neutraali villieläin Sahelin savanneilla. Pakenee, kun pelaaja
// tulee lähelle (kyykyssä pääsee lähemmäs); lyötynä hyökkää takaisin ja
// pakenee haavoittuneena.
// Savipeikko: heikko vihamielinen olento, joka nousee maasta öisin missä
// tahansa biomissa. Aamulla se joutuu paniikkiin, syttyy itsestään palamaan,
// juoksee liekeissä sinne tänne ja palaa lopuksi tuhkaksi.
// Arat eläimet (sessio 9): gaselli, helmikana, apina, aavikkokettu ja pienet
// linnut. Ne huomaavat pelaajan kaukaa (hiipiessä vasta lähellä), pysähtyvät
// tarkkailemaan ja pakenevat koko lauma; linnut ja helmikanat lentävät.
// Niiden pyytämiseen tarvitaan yleensä jousi.
// Haamu (sessio 10): harvinainen, vaarallinen mustakaapuinen olento, joka
// leijuu öisin sademetsässä latvusten alla runkojen välissä (sessio 11).
// Huomattuaan pelaajan se kiertää tätä ja syöksyy iskuun (varoitus: hehku
// kirkastuu). Vähillä voimilla se pakenee latvusten yläpuolelle. Aamulla se
// haihtuu.
import * as THREE from 'three';
import { waterAt, sampleTerrain, insideStructure } from '../world/terrain.js';
import { makeWarthog, makeClayGolem, makeGazelle, makeFennec, makeMonkey, makeGuineafowl, makeBird, makeHaamu } from '../models/creatures.js';
import { createFlameTexture } from '../render/textures.js';
import { events } from './events.js';

export const MOB_TYPES = {
  warthog: {
    name: 'Pahkasika', hp: 55, radius: 0.5, height: 0.8, walk: 1.1, run: 6.6, mass: 1.6,
    damage: 13, knock: 6.5, up: 2.5, reach: 1.45, windup: 0.5, attack: 0.32, recover: 0.9,
    sight: 10, poise: 15, turn: 5, drops: [['raw_meat', 1, 2], ['hide', 1, 1], ['bone', 0, 1], ['sinew', 0, 1]], cause: 'warthog',
  },
  clay: {
    name: 'Savipeikko', hp: 28, radius: 0.36, height: 1.25, walk: 0.9, run: 3.5, mass: 0.9,
    damage: 8, knock: 4, up: 0, reach: 1.4, windup: 0.65, attack: 0.28, recover: 0.8,
    sight: 24, poise: 6, turn: 4, drops: [['clay', 1, 2]], cause: 'clay',
  },
  // --- Arat eläimet. sight = huomaamisetäisyys kävelevästä pelaajasta
  // (paikallaan 0,75 ×, kyykyssä 0,3 ×, paikallaan kyykyssä 0,22 ×, juostessa
  // 1,3 ×), run = pakonopeus (pelaaja juoksee 7,2 m/s), group = laumakoko,
  // max = enimmäismäärä, habitat = biomipainot. Sessio 10: arkuutta ja
  // nopeutta vähennetty, jotta jousella ehtii ampua.
  gazelle: {
    name: 'Gaselli', hp: 26, radius: 0.32, height: 1.0, walk: 1.3, run: 7.6, mass: 0.9, sight: 18, turn: 6, poise: 6,
    drops: [['raw_meat', 1, 2], ['gazelle_pelt', 1, 1], ['bone', 0, 1], ['sinew', 0, 1]],
    skittish: true, group: [2, 4], max: 6, habitat: (s) => s.savanna + s.woodland * 0.8 + s.laterite * 0.5 + s.mare * 0.5 + s.desert * 0.3,
  },
  guineafowl: {
    name: 'Helmikana', hp: 7, radius: 0.18, height: 0.45, walk: 0.8, run: 5.2, mass: 0.3, sight: 11, turn: 9, poise: 1,
    drops: [['raw_meat', 1, 1], ['feather', 2, 4]],
    skittish: true, flies: true, group: [3, 6], max: 8, habitat: (s) => s.savanna + s.woodland + s.mare * 0.7 + s.laterite * 0.4,
  },
  monkey: {
    name: 'Apina', hp: 18, radius: 0.24, height: 0.6, walk: 1.2, run: 6.2, mass: 0.6, sight: 13, turn: 8, poise: 4,
    drops: [['raw_meat', 1, 1], ['monkey_pelt', 1, 1], ['bone', 0, 1]],
    skittish: true, group: [2, 4], max: 5, habitat: (s) => s.rainforest + s.woodland * 0.25 + s.oasis * 0.5,
  },
  fennec: {
    name: 'Aavikkokettu', hp: 10, radius: 0.2, height: 0.45, walk: 1.0, run: 6.8, mass: 0.35, sight: 14, turn: 8, poise: 2,
    drops: [['raw_meat', 1, 1], ['fox_pelt', 1, 1]],
    skittish: true, group: [1, 2], max: 2, habitat: (s) => (s.desert + s.dunes) * 1.2,
  },
  bird: {
    name: 'Kutojalintu', hp: 3, radius: 0.08, height: 0.18, walk: 0.5, run: 2.5, mass: 0.05, sight: 7, turn: 12, poise: 0,
    drops: [['feather', 1, 2]],
    skittish: true, flies: true, bird: true, group: [4, 7], max: 12,
    habitat: (s) => s.savanna + s.woodland + s.mare + s.oasis + s.rainforest * 0.5 + s.beach * 0.3,
  },
  // Haamu: walk = vaellus, run = kiertely, dive = syöksyn nopeus (m/s).
  haamu: {
    name: 'Haamu', hp: 70, radius: 0.42, height: 1.8, walk: 2.2, run: 4.5, dive: 10.5, mass: 0.8,
    damage: 17, knock: 7, up: 2.2, reach: 1.1, windup: 0.9, sight: 30, poise: 12, turn: 3.5,
    drops: [['cowrie', 1, 3], ['bronze_bracelet', 0, 1]], cause: 'haamu', ghost: true,
  },
};
const WILD = ['gazelle', 'guineafowl', 'monkey', 'fennec', 'bird'];
const FACTORY = { warthog: makeWarthog, gazelle: makeGazelle, fennec: makeFennec, monkey: makeMonkey, guineafowl: makeGuineafowl, bird: makeBird, haamu: makeHaamu };

const MAX_WARTHOGS = 3;
const MAX_CLAY = 3;
const MAX_HAAMU = 1;
const DESPAWN = { warthog: 150, clay: 70, gazelle: 170, guineafowl: 150, monkey: 150, fennec: 150, bird: 120, haamu: 120 };
const PLAYER_R = 0.35;

const _wq = {};
const _s = {};
const _cols = [];
const _v = new THREE.Vector3();
const _m = new THREE.Matrix4();
const _w = new THREE.Vector3();

// Veren väri lajeittain (savipeikolla punaruskeaa savivelliä).
const RED = new THREE.Color(0.55, 0.03, 0.02);
const BLOOD = {
  warthog: RED, clay: new THREE.Color(0.45, 0.16, 0.07), gazelle: RED, guineafowl: RED, monkey: RED, fennec: RED, bird: RED,
  haamu: new THREE.Color(0.12, 0.06, 0.26),
};

// Hiiltynyt versio geometriasta (palanut savipeikko murenee mustina paloina).
const charred = new Map();
function charredGeometry(geo) {
  let g = charred.get(geo);
  if (!g) {
    g = geo.clone();
    const c = g.attributes.color;
    if (c) {
      for (let i = 0; i < c.count; i++) {
        const k = 0.16 + ((i * 2654435761) % 997) / 997 * 0.1;
        c.setXYZ(i, c.getX(i) * k + 0.03, c.getY(i) * k + 0.025, c.getZ(i) * k + 0.02);
      }
    }
    charred.set(geo, g);
  }
  return g;
}

// Mallit rakennetaan kerran (3 muunnelmaa / laji) ja kopioidaan jaetuilla
// geometrioilla; joka olennolla on oma materiaali (osumavälähdys).
const VARIANTS = 3;
const templates = new Map();
function instantiate(type, n, eyeMat) {
  const key = `${type}:${n % VARIANTS}`;
  let t = templates.get(key);
  if (!t) {
    t = type === 'clay' ? makeClayGolem(n % VARIANTS + 1, eyeMat) : FACTORY[type](n % VARIANTS + 1);
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
  for (const k of ['body', 'head', 'tail', 'torso', 'glow', 'core']) if (t[k]) out[k] = map.get(t[k]);
  for (const k of ['legs', 'arms', 'eyes', 'wings']) if (t[k]) out[k] = t[k].map((o) => map.get(o));
  // Haamun hehku himmenee ja kirkastuu yksilöllisesti.
  if (out.glow) out.glow.material = out.glow.material.clone();
  if (out.core) out.core.material = out.core.material.clone();
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
  constructor({ scene, world, drops, debris, bursts, player, env, structures, fire, blood }) {
    Object.assign(this, { scene, world, drops, debris, bursts, player, env, structures, fire, blood });
    this.list = [];
    this.eyeMaterial = new THREE.MeshBasicMaterial({ color: 0xffb347 });
    this.flameMat = new THREE.SpriteMaterial({
      map: createFlameTexture(), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: true,
    });
    this.fires = []; // palavat olennot nuotioiden valoille (structures.extraFires)
    this.spawnTimer = 3;
    this.clayTimer = 6;
    this.wildTimer = 2;
    this.haamuTimer = 25;
    this.combat = null; // asetetaan main.js:ssä (osumat pelaajaan)
    this.enabled = true;
    this.seed = 1;
  }

  // Rakennetaan mallit valmiiksi (latausruudun aikana), jottei ensimmäinen
  // olento nyi peliä.
  prepare() {
    for (const type of Object.keys(MOB_TYPES)) {
      for (let n = 0; n < VARIANTS; n++) {
        const inst = instantiate(type, n, this.eyeMaterial);
        inst.material.dispose();
        if (inst.glow) inst.glow.material.dispose();
        if (inst.core) inst.core.material.dispose();
      }
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
      state: emerge ? 'emerge' : type === 'clay' ? 'wander' : 'graze',
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
      panicAt: -1,           // aamu: milloin paniikki alkaa
      burning: false, burnT: 0, burnDur: 0, flames: null,
      yOff: emerge ? -1.4 : 0,
    };
    if (def.ghost) {
      // Haamu leijuu latvusten alla (2,6-4,2 m maasta) runkojen välissä.
      m.alt = 2.6 + Math.random() * 1.6;
      m.pos.y = Math.max(w.h, w.wl) + m.alt;
      m.state = 'appear';
      m.fade = 0;
      events.emit('haamuSound', { kind: 'spawn', x: m.pos.x, z: m.pos.z });
      m.bob = 0;
      m.orbit = Math.random() * Math.PI * 2;
      m.orbitDir = Math.random() < 0.5 ? -1 : 1;
      m.diveDir = new THREE.Vector3();
      // Jälkihehku: muutama himmeä kehä seuraa perässä.
      m.trail = [];
      for (let i = 0; i < 3; i++) {
        const t = new THREE.Sprite(model.glow.material.clone());
        t.scale.setScalar(1.8 - i * 0.4);
        t.renderOrder = 2;
        t.position.set(m.pos.x, m.pos.y + 1, m.pos.z);
        t.material.opacity = 0;
        this.scene.add(t);
        m.trail.push(t);
      }
    }
    model.group.position.copy(m.pos);
    this.scene.add(model.group);
    this.list.push(m);
    return m;
  }

  remove(m) {
    const i = this.list.indexOf(m);
    if (i >= 0) this.list.splice(i, 1);
    // Haamun jälkeen seuraava tulee vasta pitkän ajan päästä (harvinainen).
    if (m.type === 'haamu') this.haamuTimer = Math.max(this.haamuTimer, 90 + Math.random() * 60);
    this.scene.remove(m.model.group);
    m.model.material.dispose(); // geometriat ovat yhteisiä (templates)
    if (m.model.glow) m.model.glow.material.dispose();
    if (m.model.core) m.model.core.material.dispose();
    if (m.trail) for (const t of m.trail) { this.scene.remove(t); t.material.dispose(); }
  }

  clear() {
    for (const m of this.list.slice()) this.remove(m);
    this.fires.length = 0;
    this.spawnTimer = 3;
    this.clayTimer = 6;
    this.wildTimer = 2;
    this.haamuTimer = 25;
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
      // Korkeusero: ylhäällä leijuvaan haamuun ei yletä.
      if (Math.abs(m.pos.y + m.def.height * 0.5 - eyeY) > reach + m.def.height * 0.5 + 0.8) continue;
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
    if (m.state === 'dead') return false;
    if (m.vulnerable) amount *= 1.5;
    m.hp -= amount;
    m.flash = 1;
    m.hitStun = 0.3; // tönäisy ehtii näkyä ennen kuin olento ohjaa taas itse
    this.push(m, m.pos.x - (opts.fromX ?? m.pos.x), m.pos.z - (opts.fromZ ?? m.pos.z), opts.knock || 3, opts.up || 0);
    events.emit('mobHit', { type: m.type, amount });
    if (m.hp <= 0) {
      this._kill(m);
      return true;
    }
    const def = m.def;
    if (def.skittish) {
      // Arka eläin pakenee heti (lintu lentää) ja varoittaa laumaansa.
      this._startFlee(m, true);
      this._alarm(m);
      return true;
    }
    if (m.type === 'haamu') {
      // Vähillä voimilla haamu pakenee latvusten yläpuolelle (ei horju).
      if (m.hp < def.hp * 0.25) {
        if (m.state !== 'escape' && m.state !== 'fade') this._set(m, 'escape', 9);
        return true;
      }
      // Nuoli suututtaa kiertelevän haamun; lähietäisyyden osuma karkottaa
      // sen hetkeksi kauemmas.
      if (opts.arrow && m.state === 'stalk') m.timer = Math.min(m.timer, 0.6);
      else if (m.state === 'dive' || m.state === 'windup') this._set(m, 'rise', 1.6);
    }
    if (m.type === 'warthog') {
      if (m.hp / def.hp < 0.35) {
        m.provoked = 0;
        if (!opts.stagger && amount < def.poise) this._set(m, 'flee', 5 + Math.random() * 2);
      } else {
        m.provoked = 16;
        if (m.state !== 'windup' && m.state !== 'attack' && m.state !== 'stagger') this._set(m, 'chase');
      }
    }
    if (m.state === 'emerge' || m.state === 'panic') return true;
    const st = opts.stagger || (amount >= def.poise ? 0.45 : 0);
    if (st > 0) this.stagger(m, st, false);
    return true;
  }

  // Horjahdus: keskeyttää hyökkäyksen. Parryn jälkeen olento on haavoittuvainen.
  stagger(m, dur, vulnerable) {
    if (m.state === 'dead' || m.state === 'panic' || m.state === 'emerge' || m.state === 'appear' || m.state === 'fade') return;
    m.staggerDur = dur;
    m.vulnerable = !!vulnerable;
    this._set(m, 'stagger');
  }

  push(m, dx, dz, strength, up = 0) {
    const len = Math.hypot(dx, dz) || 1;
    const k = strength / m.def.mass;
    m.knock.x += (dx / len) * k;
    m.knock.z += (dz / len) * k;
    if (up > 0) m.vy = Math.max(m.vy, up / Math.sqrt(m.def.mass));
  }

  _set(m, state, timer) {
    m.state = state;
    m.stateT = 0;
    m.hitDone = false;
    if (timer !== undefined) m.timer = timer;
    if (state !== 'stagger') m.vulnerable = false;
    // Haamun äänet (sessio 12): ilmestyminen, joskus kirkaisu ennen syöksyä
    // (sama ääni) ja hyökkäysääni syöksyn alkaessa.
    if (m.type === 'haamu') {
      const kind = state === 'appear' ? 'spawn' : state === 'windup' && Math.random() < 0.4 ? 'spawn' : state === 'dive' ? 'attack' : null;
      if (kind) events.emit('haamuSound', { kind, x: m.pos.x, z: m.pos.z });
    }
  }

  // Veriroiske osumasta (savipeikolla savivelliä). pos = osumakohta,
  // dx, dz = iskun suunta (pelaajasta olentoon).
  bleed(m, pos, dx, dz, amount) {
    if (!this.blood) return;
    _w.set(dx, 0, dz).normalize();
    this.blood.spray(pos, _w, BLOOD[m.type], Math.min(30, 6 + Math.round(amount * 1.1)), 0.8 + amount / 25);
  }

  _kill(m) {
    const def = m.def;
    _v.copy(m.pos);
    _v.y += def.height * 0.5;
    // Kuolema: iso roiske, pölypöllähdys ja lammikko alle.
    if (this.blood) {
      this.blood.spray(_v, null, BLOOD[m.type], 34, 1.3);
      m.poolAt = 0.35;
    }
    this.bursts.spawn(_v, m.type === 'clay' ? 0x8a5a3a : m.type === 'haamu' ? 0x2a1d48 : 0xb8a888, 18, 1.8);
    if (m.type === 'clay' && this.blood) this.blood.splat(m.pos.x, m.pos.z, 1.3, BLOOD.clay, 1.5);
    for (const [item, a, b] of def.drops) {
      const n = a + Math.floor(Math.random() * (b - a + 1));
      this.drops.spawn(item, n, _v, { spread: 0.6, up: 0.8 });
    }
    events.emit('mobKilled', { type: m.type });
    if (m.type === 'haamu') {
      this._dissolve(m, true);
      this.remove(m);
      return;
    }
    if (m.type === 'clay') {
      this._shatter(m, m.burning);
      this.remove(m);
      return;
    }
    this._set(m, 'dead');
    m.deadT = 0;
    m.deathSide = Math.random() < 0.5 ? -1 : 1;
  }

  // Savipeikko murenee paloiksi (palanut: mustiksi hiiliksi ja tuhkaksi).
  _shatter(m, burnt = false) {
    m.model.group.updateMatrixWorld(true);
    let seed = 1;
    m.model.group.traverse((o) => {
      if (!o.isMesh || o.material === this.eyeMaterial) return;
      _m.copy(o.matrixWorld);
      const geo = burnt ? charredGeometry(o.geometry) : o.geometry;
      this.debris.shatter(geo, _m, { pieces: 5, inner: burnt ? 0x2a2420 : 0x6e3018, power: burnt ? 1.1 : 1.6, life: burnt ? 2.8 : 2.2, seed: seed++, up: 0.6 });
    });
    _v.copy(m.pos);
    _v.y += 0.6;
    if (burnt) {
      this.bursts.spawn(_v, 0x5a5550, 22, 1.2);
      if (this.fire) {
        for (let i = 0; i < 14; i++) this.fire.smokePuff(m.pos.x, m.pos.y + 0.3 + Math.random() * 0.6, m.pos.z, 0.45, 1.4);
        for (let i = 0; i < 10; i++) this.fire.ember(m.pos.x, m.pos.y + 0.5, m.pos.z);
      }
    } else {
      this.bursts.spawn(_v, 0xa0603a, 16, 1.4);
    }
  }

  // Aamu: savipeikko syttyy palamaan (leimahdus ja liekit vartaloon).
  _ignite(m) {
    m.burning = true;
    m.burnT = 0;
    m.burnDur = 3.5 + Math.random() * 2.5;
    const md = m.model;
    m.flames = [];
    const spots = [[md.torso, 0, 0.22, 0.02, 1], [md.torso, 0.1, 0.4, -0.04, 0.8], [md.torso, -0.1, 0.38, 0.03, 0.85], [md.head, 0, 0.16, 0, 0.75]];
    for (const [parent, x, y, z, s] of spots) {
      const f = new THREE.Sprite(this.flameMat);
      f.position.set(x, y, z);
      f.scale.set(0.01, 0.01, 1);
      f.userData = { s, y, seed: Math.random() * 10 };
      parent.add(f);
      m.flames.push(f);
    }
    if (this.fire) this.fire.burst(m.pos.x, m.pos.y + 0.7, m.pos.z, 0.35, 34);
    events.emit('mobIgnite', { type: m.type });
  }

  // Palon tehosteet joka ruudulla: liekit, kipinät, savu, hiiltyminen.
  _burnFx(m, dt, elapsed) {
    const md = m.model;
    const k = Math.min(1, m.burnT / m.burnDur);
    const grow = Math.min(1, m.burnT / 0.5);
    // Hiiltyy vähitellen; hehkuu oranssina ja lepattaa.
    const flick = 0.75 + Math.sin(elapsed * 23 + m.phase) * 0.15 + Math.sin(elapsed * 37) * 0.1;
    md.material.color.setScalar(1 - 0.78 * k);
    md.material.emissive.setRGB(0.9 * flick * (1 - 0.4 * k), 0.32 * flick * (1 - 0.5 * k), 0.06);
    for (const f of m.flames) {
      const u = f.userData;
      const t = elapsed * 9 + u.seed;
      const q = (0.85 + Math.sin(t) * 0.12 + Math.sin(t * 2.3) * 0.08) * grow * u.s * (1 - 0.35 * k);
      f.scale.set(0.42 * q, 0.75 * q, 1);
      f.position.y = u.y + 0.75 * q * 0.3;
    }
    if (!this.fire) return;
    // Hiukkaset maailman koordinaateissa vartalon kohdalta
    md.torso.getWorldPosition(_w);
    const n = Math.floor((dt * 55 + Math.random()) * grow);
    for (let i = 0; i < n; i++) this.fire.flames(_w.x, _w.y + 0.15 + Math.random() * 0.4, _w.z, 0.22, 1.1 - 0.4 * k);
    if (Math.random() < dt * 9) this.fire.ember(_w.x, _w.y + 0.4, _w.z);
    if (Math.random() < dt * 10) this.fire.smokePuff(_w.x, _w.y + 0.7, _w.z, 0.2, 1 + k * 0.5);
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
      this.wildTimer -= dt;
      if (this.wildTimer <= 0) {
        this.wildTimer = 2.5 + Math.random() * 3;
        this._trySpawnWild(night);
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
      // Haamu: harvinainen, vain öisin sademetsässä.
      if (night && !player.dead) {
        this.haamuTimer -= dt;
        if (this.haamuTimer <= 0) {
          this.haamuTimer = 35 + Math.random() * 40;
          if (this.count('haamu') < MAX_HAAMU && Math.random() < 0.4) this._trySpawnHaamu();
        }
      } else if (!night) {
        this.haamuTimer = 20 + Math.random() * 30;
      }
    }
    for (const m of this.list.slice()) {
      const d = Math.hypot(m.pos.x - p.x, m.pos.z - p.z);
      if (d > DESPAWN[m.type]) { this.remove(m); continue; }
      // Aamun valossa haamu haihtuu.
      if (m.type === 'haamu' && this.env.daylight > 0.15 && m.state !== 'fade') this._set(m, 'fade');
      // Aamulla savipeikot joutuvat paniikkiin ja syttyvät palamaan (eri aikaan).
      if (m.type === 'clay' && this.env.daylight > 0.18 && m.state !== 'panic' && m.state !== 'dead') {
        if (m.panicAt < 0) m.panicAt = elapsed + Math.random() * 3.5;
        else if (elapsed >= m.panicAt) {
          this._set(m, 'panic');
          m.igniteAt = 0.5 + Math.random() * 0.9;
          m.panicT = 0;
        }
      }
    }
    // Palavat olennot valaisevat ympäristöään (nuotioiden valot jaetaan).
    this.fires.length = 0;

    // --- Tekoäly, liike ja animaatio
    for (const m of this.list.slice()) {
      if (dt > 0) {
        if (m.def.skittish) this._thinkSkittish(m, dt);
        else if (m.type === 'warthog') this._thinkWarthog(m, dt);
        else if (m.def.ghost) this._thinkHaamu(m, dt);
        else this._thinkClay(m, dt);
        if (!this.list.includes(m)) continue;
        if (m.state === 'fly') this._flyPhysics(m, dt);
        else if (m.def.ghost) this._ghostPhysics(m, dt);
        else this._physics(m, dt);
      }
      this._animate(m, dt, elapsed);
      if (m.burning) {
        this._burnFx(m, dt, elapsed);
        this.fires.push({ x: m.pos.x, y: m.pos.y, z: m.pos.z, seed: m.phase * 10 });
      }
    }
    if (this.structures) this.structures.extraFires = this.fires;
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

  // Haamu ilmestyy 32-52 m päähän, kun pelaaja on sademetsässä (ei nuotion lähelle).
  _trySpawnHaamu() {
    const p = this.player.position;
    sampleTerrain(p.x, p.z, _s);
    if (_s.rainforest < 0.45) return;
    for (let a = 0; a < 6; a++) {
      const ang = Math.random() * Math.PI * 2;
      const r = 32 + Math.random() * 20;
      const x = p.x + Math.cos(ang) * r, z = p.z + Math.sin(ang) * r;
      sampleTerrain(x, z, _s);
      if (_s.rainforest < 0.4 || _s.ocean > 0.3 || this._nearFire(x, z, 18)) continue;
      this.spawn('haamu', x, z);
      if (!this.haamuSeen) {
        this.haamuSeen = true;
        events.emit('message', { text: 'Latvuksissa leijuu jotain... Nuotion valo pitää haamut loitolla.' });
      }
      return;
    }
  }

  // Arat eläimet: valitaan biomiin sopiva laji ja lauma 45–95 m päähän.
  _trySpawnWild(night) {
    const p = this.player.position;
    let wild = 0;
    for (const m of this.list) if (m.def.skittish && m.state !== 'dead') wild++;
    if (wild >= 22) return;
    for (let a = 0; a < 5; a++) {
      const ang = Math.random() * Math.PI * 2;
      const r = 45 + Math.random() * 50;
      const x = p.x + Math.cos(ang) * r, z = p.z + Math.sin(ang) * r;
      if (!this._okSpot(x, z)) continue;
      // Laji painotettuna biomin mukaan (kettu liikkuu enemmän öisin).
      const w = WILD.map((t) => {
        const def = MOB_TYPES[t];
        let v = Math.max(0, def.habitat(_s));
        if (t === 'fennec') v *= night ? 2 : 0.6;
        else if (night) v *= t === 'bird' ? 0.1 : 0.4;
        if (this.count(t) >= def.max) v = 0;
        return v;
      });
      const total = w.reduce((s2, v) => s2 + v, 0);
      if (total < 0.3) continue;
      let pick = Math.random() * total, type = WILD[0];
      for (let i = 0; i < WILD.length; i++) { pick -= w[i]; if (pick <= 0) { type = WILD[i]; break; } }
      const def = MOB_TYPES[type];
      const n = def.group[0] + Math.floor(Math.random() * (def.group[1] - def.group[0] + 1));
      const spread = def.bird ? 3 : 6;
      for (let i = 0; i < n && this.count(type) < def.max; i++) {
        const ox = x + (Math.random() - 0.5) * spread, oz = z + (Math.random() - 0.5) * spread;
        if (this._okSpot(ox, oz)) this.spawn(type, ox, oz);
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
        // Verilammikko levenee ruumiin alle, kun se on kaatunut.
        if (m.poolAt > 0 && m.deadT >= m.poolAt && this.blood) {
          m.poolAt = 0;
          this.blood.splat(m.pos.x, m.pos.z, 1.6, BLOOD.warthog, 4);
        }
        if (m.deadT > 6) this.remove(m);
        break;
      default:
        this._set(m, 'graze', 2);
    }
  }

  // Pakoon: maassa juoksee, linnut ja helmikanat (lähellä) lentävät.
  _startFlee(m, hurt = false) {
    if (m.state === 'dead' || m.state === 'fly') return;
    const def = m.def;
    const { d } = this._toPlayer(m);
    if (def.bird || (def.flies && (hurt || d < def.sight * 0.45))) {
      this._set(m, 'fly', def.bird ? 7 : 1.4 + Math.random() * 0.6);
      m.vy = def.bird ? 3.2 + Math.random() : 4.2;
    } else {
      // Lyhyt pako: pysähtyy pian katsomaan taakseen.
      this._set(m, 'flee', (hurt ? 3.5 : 2.5) + Math.random() * 1.5);
    }
  }

  // Lauman muut jäsenet säikähtävät pienellä viiveellä.
  _alarm(m) {
    for (const o of this.list) {
      if (o === m || o.type !== m.type || o.state === 'dead' || o.state === 'flee' || o.state === 'fly') continue;
      if ((o.pos.x - m.pos.x) ** 2 + (o.pos.z - m.pos.z) ** 2 > 15 * 15) continue;
      o.alarmAt = 0.2 + Math.random() * 0.6;
    }
  }

  // Huomaamisetäisyys pelaajan liikkeen mukaan.
  _sight(def) {
    const P = this.player;
    if (P.dead) return 0;
    const moving = P.speedNow > 0.6;
    const k = P.crouching ? (moving ? 0.3 : 0.22) : P.sprinting ? 1.3 : moving ? 1 : 0.75;
    return def.sight * k * (P.inWater === 2 ? 0.7 : 1);
  }

  _thinkSkittish(m, dt) {
    const def = m.def;
    m.stateT += dt;
    m.timer -= dt;
    const { dx, dz, d } = this._toPlayer(m);
    const P = this.player;
    const sight = this._sight(def);
    const near = d < sight;
    // Väsymys: pitkä pakeneminen hidastaa (palautuu levossa).
    m.tired = Math.max(0, (m.tired || 0) + (m.state === 'flee' ? dt * 0.045 : -dt * 0.02));
    if (m.alarmAt !== undefined && m.state !== 'dead') {
      m.alarmAt -= dt;
      if (m.alarmAt <= 0) { m.alarmAt = undefined; this._startFlee(m); }
    }
    switch (m.state) {
      case 'graze':
        this._steer(m, 0, 0, 0, dt);
        if (near) { this._set(m, 'alert', 1.2 + Math.random() * 1.2); m.alertD = d; }
        else if (m.timer <= 0) {
          const a = Math.random() * Math.PI * 2, r = def.bird ? 1 + Math.random() * 2 : 3 + Math.random() * 7;
          m.tx = m.pos.x + Math.cos(a) * r;
          m.tz = m.pos.z + Math.sin(a) * r;
          this._set(m, 'wander', 6);
        }
        break;
      case 'wander': {
        const wx = m.tx - m.pos.x, wz = m.tz - m.pos.z;
        const wd = Math.hypot(wx, wz);
        this._steer(m, wx / (wd || 1), wz / (wd || 1), def.walk, dt);
        if (near) { this._set(m, 'alert', 1.2 + Math.random() * 1.2); m.alertD = d; }
        else if (wd < 0.5 || m.timer <= 0) this._set(m, 'graze', 2 + Math.random() * 5);
        break;
      }
      case 'alert':
        // Pysähtyy katsomaan. Pakenee, jos pelaaja tulee liian lähelle tai
        // jatkaa lähestymistä; paikalleen pysähtyneestä se rauhoittuu.
        this._steer(m, dx, dz, 0, dt, true);
        if (d < sight * 0.55 || (near && d < m.alertD - 2.5)) {
          this._startFlee(m);
          this._alarm(m);
        } else if (m.timer <= 0) {
          this._set(m, 'graze', 1.5 + Math.random() * 3);
        }
        break;
      case 'flee': {
        const wob = Math.sin(m.stateT * 1.7 + m.phase) * 0.45;
        const fx = -dx * Math.cos(wob) + dz * Math.sin(wob);
        const fz = -dz * Math.cos(wob) - dx * Math.sin(wob);
        // Haavoittunut ja väsynyt eläin juoksee hitaammin.
        const hurt = 0.55 + 0.45 * Math.max(0, m.hp / def.hp);
        this._steer(m, fx, fz, def.run * hurt * (1 - 0.45 * Math.min(1, m.tired)), dt);
        // Helmikana pyrähtää lentoon, jos pelaaja on aivan kintereillä.
        if (def.flies && d < def.sight * 0.35 && m.stateT > 0.3) this._startFlee(m, true);
        else if (m.timer <= 0) {
          if (d > sight * 1.4 || P.dead) { this._set(m, 'alert', 1.5 + Math.random() * 1.5); m.alertD = d; }
          else m.timer = 1.2;
        }
        break;
      }
      case 'fly': {
        // Lento poispäin pelaajasta; lintu katoaa näkyvistä.
        const want = Math.atan2(-dx, -dz) + Math.sin(m.stateT * 1.3 + m.phase) * 0.4;
        const diff = angleDiff(want, m.yaw);
        m.yaw += Math.max(-4 * dt, Math.min(4 * dt, diff));
        const sp = def.bird ? 7 : 6.5;
        m.vel.x = Math.sin(m.yaw) * sp;
        m.vel.z = Math.cos(m.yaw) * sp;
        if (m.timer <= 0) {
          if (def.bird) { this.remove(m); return; }
          if (m.pos.y <= m.groundH + 0.05) this._set(m, 'flee', 2 + Math.random() * 1.5);
        }
        break;
      }
      case 'stagger':
        this._steer(m, 0, 0, 0, dt);
        if (m.stateT >= m.staggerDur) this._startFlee(m, true);
        break;
      case 'dead':
        m.deadT += dt;
        m.vel.multiplyScalar(Math.exp(-dt * 6));
        if (m.poolAt > 0 && m.deadT >= m.poolAt && this.blood) {
          m.poolAt = 0;
          this.blood.splat(m.pos.x, m.pos.z, Math.max(0.4, def.radius * 3), BLOOD[m.type], 4);
        }
        if (m.deadT > 6) this.remove(m);
        break;
      default:
        this._set(m, 'graze', 2);
    }
  }

  // Lento: nousu, liuku ja lasku (ei maaston törmäyksiä ilmassa).
  _flyPhysics(m, dt) {
    const pos = m.pos;
    pos.x += (m.vel.x + m.knock.x) * dt;
    pos.z += (m.vel.z + m.knock.z) * dt;
    m.knock.multiplyScalar(Math.exp(-dt * 3.5));
    const w = waterAt(pos.x, pos.z, _wq);
    m.groundH = Math.max(w.h, w.wl);
    const bird = m.def.bird;
    // Linnut nousevat korkealle; helmikana liitää matalalla ja laskeutuu.
    const lift = bird ? 2.2 : m.timer > 0.4 ? 0.6 : -6;
    m.vy += (lift - m.vy) * Math.min(1, dt * (bird ? 1.2 : 2.5));
    pos.y += m.vy * dt;
    if (pos.y < m.groundH) { pos.y = m.groundH; m.vy = 0; }
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
      case 'panic': {
        // Paniikki: juoksee sinne tänne; syttyy hetken päästä palamaan ja
        // palaa lopulta tuhkaksi.
        m.yOff = Math.min(0, m.yOff + dt * 2.5);
        m.panicT -= dt;
        if (m.panicT <= 0) {
          m.panicT = 0.3 + Math.random() * 0.5;
          m.panicDir = Math.random() * Math.PI * 2;
        }
        this._steer(m, Math.sin(m.panicDir), Math.cos(m.panicDir), def.run * (m.burning ? 1.3 : 1.05), dt);
        if (!m.burning) {
          if (this.fire && Math.random() < dt * 5) this.fire.smokePuff(m.pos.x, m.pos.y + 1.1, m.pos.z, 0.15, 0.6);
          if (m.stateT >= m.igniteAt) this._ignite(m);
        } else {
          m.burnT += dt;
          if (m.burnT >= m.burnDur) { this._shatter(m, true); this.remove(m); }
        }
        break;
      }
      default:
        this._set(m, 'wander', 1);
    }
  }

  // --- Haamu: leijuu latvusten alla, kiertää pelaajaa ja syöksyy iskuun.
  // Syöksy kääntyy hitaasti, joten sivuaskel väistää; torjunta ja täydellinen
  // torjunta toimivat kuten muitakin vastaan. Nuotion lähellä se ei syöksy.
  _thinkHaamu(m, dt) {
    const def = m.def;
    m.stateT += dt;
    m.timer -= dt;
    m.bob += dt;
    const player = this.player;
    const p = player.position;
    const ground = m.groundH ?? m.pos.y - m.alt;
    const dx = p.x - m.pos.x, dz = p.z - m.pos.z;
    const dh = Math.hypot(dx, dz) || 1e-3;
    // Leijuntakorkeus latvusten alla (vähintään 1,4 m pelaajan jalkojen yllä).
    const cruise = Math.max(ground + m.alt, p.y + 1.4) + Math.sin(m.bob * 0.8 + m.phase) * 0.35;
    const sight = def.sight * (player.crouching ? 0.6 : 1);
    const sees = !player.dead && dh < sight;
    const fireSafe = this._nearFire(p.x, p.z, 9);
    if (m.state !== 'appear' && m.state !== 'fade') m.fade = Math.min(1, m.fade + dt);
    // Satunnainen ääntely leijuessa ja kierrellessä (lähellä pelaajaa).
    m.voiceT = (m.voiceT ?? 5 + Math.random() * 6) - dt;
    if (m.voiceT <= 0) {
      m.voiceT = 8 + Math.random() * 10;
      if ((m.state === 'drift' || m.state === 'stalk') && dh < 45) events.emit('haamuSound', { kind: 'idle', x: m.pos.x, z: m.pos.z });
    }
    let vx = 0, vy = 0, vz = 0, faceP = false;
    switch (m.state) {
      case 'appear':
        // Ilmestyy tyhjästä (kasvaa ja hehku voimistuu).
        m.fade = Math.min(1, m.stateT / 2);
        vy = (cruise - m.pos.y) * 0.8;
        if (m.stateT >= 2) this._set(m, sees ? 'stalk' : 'drift', 3 + Math.random() * 3);
        break;
      case 'drift': {
        if (sees) { this._set(m, 'stalk', 3 + Math.random() * 3); break; }
        if (m.timer <= 0 || Math.hypot(m.tx - m.pos.x, m.tz - m.pos.z) < 2) {
          // Uusi kohde: aistii elävän ja ajelehtii sen suuntaan.
          const near = !player.dead && dh < 80;
          const a = Math.random() * Math.PI * 2, r = 6 + Math.random() * 14;
          m.tx = (near ? p.x : m.pos.x) + Math.cos(a) * r;
          m.tz = (near ? p.z : m.pos.z) + Math.sin(a) * r;
          m.timer = 5 + Math.random() * 4;
        }
        const wx = m.tx - m.pos.x, wz = m.tz - m.pos.z, wd = Math.hypot(wx, wz) || 1;
        vx = (wx / wd) * def.walk;
        vz = (wz / wd) * def.walk;
        vy = (cruise - m.pos.y) * 1.2;
        break;
      }
      case 'stalk': {
        if (player.dead || dh > sight * 1.5) { this._set(m, 'drift', 0); break; }
        // Kiertää pelaajaa runkojen välissä (nuotion valossa kauempana).
        m.orbit += dt * 0.4 * m.orbitDir;
        const R = fireSafe ? 16 : 8.5;
        const wx = p.x + Math.cos(m.orbit) * R - m.pos.x, wz = p.z + Math.sin(m.orbit) * R - m.pos.z;
        const wd = Math.hypot(wx, wz) || 1;
        const sp = Math.min(def.run, wd * 1.2);
        vx = (wx / wd) * sp;
        vz = (wz / wd) * sp;
        vy = (cruise - m.pos.y) * 1.2;
        faceP = true;
        if (m.timer <= 0 && !fireSafe && dh < 22) this._set(m, 'windup');
        break;
      }
      case 'windup':
        // Pysähtyy, nousee hiukan ja hehku kirkastuu: varoitus ennen syöksyä.
        vy = 0.6;
        faceP = true;
        if (m.stateT >= def.windup) {
          this._set(m, 'dive');
          m.diveDir.set(dx, p.y + 1.1 - (m.pos.y + 0.9), dz).normalize();
        }
        break;
      case 'dive': {
        _v.set(dx, p.y + 1.1 - (m.pos.y + 0.9), dz);
        const d3 = _v.length() || 1e-3;
        _v.multiplyScalar(1 / d3);
        // Viimeiset metrit suoraan: sivuaskel ajoissa väistää syöksyn.
        if (d3 > 6) m.diveDir.lerp(_v, Math.min(1, dt * 2.2)).normalize();
        vx = m.diveDir.x * def.dive;
        vy = m.diveDir.y * def.dive;
        vz = m.diveDir.z * def.dive;
        faceP = true;
        if (!m.hitDone && d3 < def.reach + 0.3) {
          this._tryHitHaamu(m);
          if (m.state !== 'dive') break; // täydellinen torjunta: horjuu
        }
        // Osui tai meni ohi: nousee takaisin latvuksiin.
        if (m.hitDone || m.stateT > 2.4 || (d3 < 4 && m.diveDir.dot(_v) < 0.2)) this._set(m, 'rise', 1.8 + Math.random() * 0.8);
        break;
      }
      case 'rise':
        // Syöksyn jälkeen takaisin leijuntakorkeuteen ja vähän kauemmas.
        vx = (-dx / dh) * 3.2;
        vz = (-dz / dh) * 3.2;
        vy = (cruise - m.pos.y) * 1.5;
        if (m.timer <= 0 || (m.stateT > 0.6 && Math.abs(m.pos.y - cruise) < 0.5)) this._set(m, 'stalk', 2.5 + Math.random() * 2.5);
        break;
      case 'escape': {
        // Pakenee latvusten yläpuolelle ja pois; kaukana haihtuu (ei saalista).
        const high = ground + 13;
        vx = (-dx / dh) * def.run;
        vz = (-dz / dh) * def.run;
        vy = (high - m.pos.y) * 1.2;
        if (m.timer <= 0 || (dh > 42 && m.pos.y > high - 2)) this._set(m, 'fade');
        break;
      }
      case 'stagger':
        vy = 0.4;
        if (m.stateT >= m.staggerDur) this._set(m, 'rise', 1.5);
        break;
      case 'fade':
        // Aamulla haihtuu savuna.
        m.fade = Math.max(0, m.fade - dt / 1.6);
        vy = 0.5;
        if (m.fade <= 0) { this._dissolve(m, false); this.remove(m); return; }
        break;
      default:
        this._set(m, 'drift', 0);
    }
    // Liike pehmeästi kohti haluttua nopeutta (3D).
    const k = 1 - Math.exp(-dt * (m.state === 'dive' ? 6 : 2.5));
    if (m.hitStun > 0) { m.hitStun -= dt; vx *= 0.2; vz *= 0.2; }
    m.vel.x += (vx - m.vel.x) * k;
    m.vel.z += (vz - m.vel.z) * k;
    m.vy += (Math.max(-def.dive, Math.min(def.dive, vy)) - m.vy) * k;
    const fx = faceP ? dx : m.vel.x, fz = faceP ? dz : m.vel.z;
    if (Math.abs(fx) + Math.abs(fz) > 0.05) {
      const diff = angleDiff(Math.atan2(fx, fz), m.yaw);
      m.yaw += Math.max(-def.turn * dt, Math.min(def.turn * dt, diff));
    }
  }

  // Haamu kiertää puunrungot latvusten alla (lehvistön läpi se leijuu);
  // pysyy maan ja veden yllä.
  _ghostPhysics(m, dt) {
    const pos = m.pos;
    pos.x += (m.vel.x + m.knock.x) * dt;
    pos.z += (m.vel.z + m.knock.z) * dt;
    pos.y += m.vy * dt;
    m.knock.multiplyScalar(Math.exp(-dt * 3));
    const w = waterAt(pos.x, pos.z, _wq);
    m.groundH = Math.max(w.h, w.wl);
    if (pos.y < m.groundH + 7) {
      const r = m.def.radius;
      this.world.collidersNear(pos.x, pos.z, 1.5, _cols);
      for (const c of _cols) {
        if (c.seg) continue;
        const ddx = pos.x - c.x, ddz = pos.z - c.z;
        const min = c.r + r;
        const d2 = ddx * ddx + ddz * ddz;
        if (d2 < min * min && d2 > 1e-8) {
          const dd = Math.sqrt(d2);
          pos.x += (ddx / dd) * (min - dd);
          pos.z += (ddz / dd) * (min - dd);
        }
      }
    }
    const floor = m.groundH + (m.state === 'dive' ? 0.15 : 0.35);
    if (pos.y < floor) {
      pos.y = floor;
      if (m.vy < 0) m.vy = 0;
    }
  }

  _tryHitHaamu(m) {
    const p = this.player.position;
    const d3 = Math.hypot(p.x - m.pos.x, p.y + 1.1 - (m.pos.y + 0.9), p.z - m.pos.z);
    if (d3 > m.def.reach + 0.3 || this.player.dead) return;
    m.hitDone = true;
    const res = this.combat ? this.combat.receiveHit(m, m.def.damage, { knock: m.def.knock, up: m.def.up, cause: m.def.cause }) : 'hit';
    if (res === 'block' || res === 'broken') this.push(m, m.pos.x - p.x, m.pos.z - p.z, 3, 1.5);
  }

  // Haamu hajoaa mustaksi savuksi ja violetiksi hohteeksi.
  _dissolve(m, killed) {
    _v.set(m.pos.x, m.pos.y + 0.9, m.pos.z);
    this.bursts.spawn(_v, 0x1e1430, killed ? 26 : 12, killed ? 1.6 : 0.9);
    this.bursts.spawn(_v, 0x5b3dff, killed ? 12 : 6, 1.2);
    if (!this.fire) return;
    for (let i = 0; i < (killed ? 10 : 5); i++) {
      this.fire.smokePuff(m.pos.x + (Math.random() - 0.5) * 0.6, m.pos.y + 0.4 + Math.random() * 1.2, m.pos.z + (Math.random() - 0.5) * 0.6, 0.35, 1.2);
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
    if (m.hitStun > 0) {
      // Osumasta horjuva olento ei ohjaa itseään (tönäisy vie).
      m.hitStun -= dt;
      m.vel.multiplyScalar(Math.exp(-dt * 10));
      m.wantSpeed = 0;
      return;
    }
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
    m.knock.multiplyScalar(Math.exp(-dt * 3.5));
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
      if (o === m || o.state === 'dead' || o.def.ghost) continue;
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
    if (!m.burning) md.material.emissive.setRGB(m.flash * 0.85, m.flash * 0.22, m.flash * 0.12);
    const speed = Math.hypot(m.vel.x, m.vel.z);
    const kind = md.kind;
    m.phase += speed * dt * (m.type === 'warthog' ? 4.4 : kind === 'bird' ? 14 : kind === 'guineafowl' ? 9 : m.def.skittish ? 5 : 3.2);
    if (m.type === 'warthog') this._animWarthog(m, md, speed, dt, elapsed);
    else if (kind === 'guineafowl' || kind === 'bird') this._animFowl(m, md, speed, dt, elapsed);
    else if (kind === 'haamu') this._animHaamu(m, md, speed, dt, elapsed);
    else if (m.def.skittish) this._animQuad(m, md, speed, dt, elapsed);
    else this._animClay(m, md, speed, dt, elapsed);
  }

  // Nelijalkaiset arat eläimet: käynti ristikkäin, juostessa loikka (etu- ja
  // takajalat parina). Laiduntaessa pää alhaalla, valppaana ylhäällä.
  _animQuad(m, md, speed, dt, elapsed) {
    const ph = m.phase;
    const L = md.legs;
    const run = Math.min(1, Math.max(0, (speed - 2.5) / 4));
    const amp = Math.min(0.85, speed * 0.25);
    const walkA = Math.sin(ph) * amp, walkB = Math.sin(ph + Math.PI) * amp;
    const gal = Math.sin(ph) * amp * 1.1, gal2 = Math.sin(ph + 1.2) * amp * 1.1;
    const lf = walkA * (1 - run) + gal * run, rf = walkB * (1 - run) + gal * run;
    const lb = walkB * (1 - run) - gal2 * run, rb = walkA * (1 - run) - gal2 * run;
    L[0].rotation.x = lf; L[1].rotation.x = rf; L[2].rotation.x = lb; L[3].rotation.x = rb;
    md.body.position.y = Math.abs(Math.sin(ph)) * 0.05 * run;
    md.body.rotation.x = Math.sin(ph + 0.6) * 0.08 * run;
    const s = m.state;
    let headX = 0.1;
    if (s === 'graze') headX = (m.type === 'gazelle' ? 1.55 : m.type === 'monkey' ? 0.55 : 0.9) + Math.sin(elapsed * 3 + m.phase) * 0.05;
    else if (s === 'alert') headX = -0.25;
    else if (s === 'flee') headX = -0.05;
    md.head.rotation.x += (headX - md.head.rotation.x) * Math.min(1, dt * 8);
    if (md.tail) md.tail.rotation.x = -0.3 - run * 0.6 + Math.sin(elapsed * 6 + m.phase) * 0.15;
    if (s === 'dead') {
      const k = smooth(m.deadT / 0.4);
      md.group.rotation.z = (m.deathSide || 1) * k * 1.45;
      md.group.position.y += k * m.def.radius * 0.4 - Math.max(0, m.deadT - 4.5) * 0.3;
      for (const l of L) l.rotation.x *= Math.exp(-dt * 6);
    }
  }

  // Linnut ja helmikana: maassa tepastelu ja nokkiminen, ilmassa siivet lyövät.
  _animFowl(m, md, speed, dt, elapsed) {
    const flying = m.state === 'fly' && m.pos.y > (m.groundH ?? m.pos.y) + 0.05;
    const L = md.legs;
    const amp = Math.min(0.9, speed * 0.4) * (flying ? 0 : 1);
    L[0].rotation.x = Math.sin(m.phase) * amp;
    L[1].rotation.x = Math.sin(m.phase + Math.PI) * amp;
    let headX = 0;
    if (m.state === 'graze') headX = Math.max(0, Math.sin(elapsed * 5 + m.phase)) * 0.9;
    else if (m.state === 'alert') headX = -0.2;
    md.head.rotation.x += (headX - md.head.rotation.x) * Math.min(1, dt * 14);
    if (md.wings) {
      const flap = flying ? Math.sin(elapsed * (m.def.bird ? 34 : 22) + m.phase) * 0.9 : 0;
      for (let i = 0; i < md.wings.length; i++) {
        const w = md.wings[i];
        const sx = i === 0 ? -1 : 1;
        if (m.type === 'guineafowl') w.visible = flying;
        w.rotation.z = flying ? sx * (0.2 + flap) : sx * -0.05;
      }
    }
    md.body.rotation.x = flying ? -0.15 : 0;
    if (m.state === 'dead') {
      const k = smooth(m.deadT / 0.3);
      md.group.rotation.z = (m.deathSide || 1) * k * 1.5;
    }
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

  // Haamu: kaapu huojuu, kädet roikkuvat; varoituksessa kädet nousevat ja
  // hehku kirkastuu, syöksyssä vartalo kallistuu eteen kädet ojossa.
  _animHaamu(m, md, speed, dt, elapsed) {
    const s = m.state;
    const f = m.fade ?? 1;
    md.group.scale.setScalar(0.3 + 0.7 * f);
    let lean = 0.08 + Math.min(0.25, speed * 0.04);
    let armX = -0.15 + Math.sin(elapsed * 1.3 + m.phase) * 0.1, armZ = 0.12, glowK = 1;
    if (s === 'windup') {
      const k = smooth(m.stateT / m.def.windup);
      lean = -0.25 * k;
      armX = -2.3 * k;
      armZ = 0.12 + 0.4 * k;
      glowK = 1 + 0.8 * k;
    } else if (s === 'dive') {
      lean = 0.75;
      armX = -1.45;
      armZ = 0.25;
      glowK = 1.6;
    } else if (s === 'rise' || s === 'escape') {
      lean = -0.15;
      armX = 0.3;
      if (s === 'escape') glowK = 0.7;
    } else if (s === 'stagger') {
      lean = -0.4 + Math.sin(m.stateT * 16) * 0.1;
      armX = 0.6;
      glowK = 0.6;
    }
    // Pää katsoo pelaajaa.
    const p = this.player.position;
    const dh = Math.hypot(p.x - m.pos.x, p.z - m.pos.z) || 1;
    const headX = Math.max(-0.6, Math.min(0.9, Math.atan2(m.pos.y - p.y, dh))) - lean * 0.6;
    md.torso.rotation.x += (lean - md.torso.rotation.x) * Math.min(1, dt * 6);
    md.torso.rotation.z = Math.sin(elapsed * 0.9 + m.phase) * 0.06;
    md.head.rotation.x += (headX - md.head.rotation.x) * Math.min(1, dt * 5);
    for (let i = 0; i < 2; i++) {
      const a = md.arms[i];
      const want = armX + (i ? 0.1 : -0.1) * Math.sin(elapsed * 2 + m.phase);
      a.rotation.x += (want - a.rotation.x) * Math.min(1, dt * 8);
      a.rotation.z = (i ? 1 : -1) * armZ;
    }
    // Hehku sykkii hitaasti.
    const pulse = 1 + Math.sin(elapsed * 2.6 + m.phase) * 0.12;
    md.glow.material.opacity = Math.min(1, 0.4 * f * pulse * glowK);
    md.glow.scale.setScalar(2.3 * (0.9 + 0.1 * glowK));
    md.core.material.opacity = Math.min(1, 0.45 * f * glowK);
    for (const e of md.eyes) e.scale.set(1.2 * glowK, 0.7 * glowK, 1);
    // Jälkihehku seuraa perässä (näkyy liikkeessä).
    if (m.trail) {
      md.glow.getWorldPosition(_w);
      let prev = _w;
      for (let i = 0; i < m.trail.length; i++) {
        const t = m.trail[i];
        t.position.lerp(prev, Math.min(1, dt * (7 - i * 1.5)));
        t.material.opacity = (0.18 - i * 0.04) * f * Math.min(1, 0.3 + speed / 6);
        prev = t.position;
      }
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
    } else if (s === 'emerge') {
      lean = 0.2 + Math.sin(elapsed * 30) * 0.05;
      armL = -0.4 + Math.sin(elapsed * 23) * 0.2;
      armR = -0.4 + Math.sin(elapsed * 27) * 0.2;
    } else if (s === 'panic') {
      // Huitoo käsillä pään yllä ja vapisee
      lean = 0.15 + Math.sin(elapsed * 17 + m.phase) * 0.12;
      armL = -2.3 + Math.sin(elapsed * 19 + m.phase) * 0.9;
      armR = -2.3 + Math.sin(elapsed * 21 + m.phase + 2) * 0.9;
      armZ = 0.3 + Math.sin(elapsed * 13) * 0.2;
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
    md.head.rotation.y = s === 'panic' ? Math.sin(elapsed * 14 + m.phase) * 0.6 : 0;
    // Silmien hehku sykkii hiukan
    const glow = 1 + Math.sin(elapsed * 5 + m.phase) * 0.12 + (s === 'windup' ? 0.35 : 0);
    for (const e of md.eyes) e.scale.setScalar(glow);
  }
}
