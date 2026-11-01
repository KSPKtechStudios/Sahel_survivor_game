// Jousiammunta: [Hiiri 1] pohjassa jännittää (kestävyys kuluu hitaasti),
// päästäminen ampuu. Nuoli lentää painovoiman alaisena ja osuu eläimiin,
// puihin, kiviin ja maahan. Maahan tai puuhun osunut nuoli jää yleensä
// ehjäksi ja sen voi poimia takaisin; eläimeen osunut putoaa saaliin viereen
// toisinaan ehjänä.
import * as THREE from 'three';
import { ITEMS } from './items.js';
import { events } from './events.js';
import { waterAt } from '../world/terrain.js';
import { makeArrowGeometry } from '../models/items2.js';
import { itemAsset } from '../models/itemAssets.js';
import { bodyPoint } from './mobs.js';
import { OBJECT_TYPES } from '../world/objectTypes.js';

const GRAVITY = 9.8;
const MAX_ARROWS = 24;
export const AMMO_ORDER = ['arrow_iron', 'arrow_copper', 'arrow_flint', 'arrow_bone', 'arrow_wood'];
const _dir = new THREE.Vector3();
const _p = new THREE.Vector3();
const _q = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _r = new THREE.Vector3();
const _wq = {};
const _bp = { x: 0, z: 0 };
const TRAIL_LEN = 3.2;   // nuolen perässä näkyvä juova (m)
const TRAIL_LIFE = 0.9;  // juova häipyy (s)
const _cols = [];

export class Archery {
  constructor({ scene, camera, player, inventory, viewmodel, mobs, world, drops, debris }) {
    Object.assign(this, { scene, camera, player, inventory, viewmodel, mobs, world, drops, debris });
    this.draw = 0;          // 0..1
    this.drawing = false;
    this.arrows = [];
    this.material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 });
    this.geos = {};
    this.mats = {};
    for (const k of AMMO_ORDER) {
      // Sessio 54: Blender-malli (arrow1_<tunnus>), jos se on ladattu.
      const a = itemAsset('arrow1_' + k);
      this.geos[k] = a || makeArrowGeometry(k);
      this.mats[k] = (a && a.userData.material) || this.material;
    }
    this.noAmmoT = 0;
  }

  // Paras repussa oleva nuoli (tai null).
  ammo() {
    for (const k of AMMO_ORDER) if (this.inventory.count(k) > 0) return k;
    return null;
  }

  get zoom() {
    return this.drawing ? this.draw : 0;
  }

  reset() {
    this.draw = 0;
    this.drawing = false;
    this.viewmodel.bowDraw = 0;
  }

  clear() {
    for (const a of this.arrows) { this.scene.remove(a.mesh); this._dropTrail(a); }
    this.arrows = [];
    this.reset();
  }

  update(dt, input, active) {
    const item = this.inventory.selectedItem;
    const def = item ? ITEMS[item.id] : null;
    const bow = def && def.bow;
    const p = this.player;
    this.noAmmoT = Math.max(0, this.noAmmoT - dt);
    if (!bow || !active || p.dead) {
      if (this.drawing || this.draw > 0) this.reset();
    } else {
      const ammo = this.ammo();
      const held = input.enabled && input.locked && input.buttons.has(0);
      if (held && !ammo) {
        if (input.clicked.has(0) && this.noAmmoT <= 0) {
          events.emit('message', { text: 'Ei nuolia: valmista nuolia (Puunuoli: risuja ja kuitua)' });
          this.noAmmoT = 2;
        }
      } else if (held && (this.drawing || input.clicked.has(0)) && p.stamina > 0.5) {
        this.drawing = true;
        this.draw = Math.min(1, this.draw + dt / bow.draw);
        // Jänteen pitäminen vie kestävyyttä (täysi veto enemmän).
        if (!p.god) p.stamina = Math.max(0, p.stamina - (1.8 + this.draw * 4.4) * dt);
        p.staminaDelay = Math.max(p.staminaDelay, 0.4);
        p.moveMul *= 0.55;
      } else if (this.drawing) {
        // Päästettiin (tai kestävyys loppui): ammu, jos veto riittää.
        if (this.draw > 0.18 && ammo) this._shoot(bow, ammo);
        this.draw = 0;
        this.drawing = false;
      } else {
        this.draw = Math.max(0, this.draw - dt * 4);
      }
      this.viewmodel.bowDraw = this.draw;
      this.viewmodel.bowArrow = this.drawing ? ammo : null;
    }
    this._updateArrows(dt);
  }

  _shoot(bow, kind) {
    const a = ITEMS[kind].ammo;
    this.inventory.remove(kind, 1);
    const d = this.draw;
    this.camera.getWorldDirection(_dir);
    // Epätarkkuus: puunuolet ja vajaa veto hajoavat enemmän.
    const spread = (kind === 'arrow_wood' ? 0.025 : 0.008) + (1 - d) * 0.02;
    _dir.x += (Math.random() - 0.5) * spread * 2;
    _dir.y += (Math.random() - 0.5) * spread * 2;
    _dir.z += (Math.random() - 0.5) * spread * 2;
    _dir.normalize();
    const speed = (16 + 44 * d * d) * bow.power * a.speed;
    const mesh = new THREE.Mesh(this.geos[kind], this.mats[kind]);
    mesh.castShadow = true;
    // Lähtö jousen kohdalta (hieman oikealla ja alempana), jotta nuolen
    // lennon näkee ruudulla.
    _r.crossVectors(_dir, _up).normalize();
    const pos = this.camera.position.clone().addScaledVector(_dir, 0.5).addScaledVector(_r, 0.05);
    pos.y -= 0.08;
    mesh.position.copy(pos);
    this.scene.add(mesh);
    // Valojuova: ohut, nopeasti häipyvä viiva nuolen perässä.
    const tg = new THREE.BufferGeometry();
    tg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
    const trail = new THREE.Line(tg, new THREE.LineBasicMaterial({ color: 0xfff6e0, transparent: true, opacity: 0.6, depthWrite: false }));
    trail.frustumCulled = false;
    trail.renderOrder = 4;
    this.scene.add(trail);
    if (this.arrows.length >= MAX_ARROWS) this._remove(this.arrows[0]);
    this.arrows.push({
      kind, mesh, pos, start: pos.clone(), trail, vel: _dir.clone().multiplyScalar(speed),
      dmg: a.dmg * (0.35 + 0.65 * d) * bow.power, life: 0, done: false,
    });
    this.viewmodel.bowShot();
    events.emit('arrowShot', { kind, power: d });
  }

  _remove(a) {
    this.scene.remove(a.mesh);
    this._dropTrail(a);
    const i = this.arrows.indexOf(a);
    if (i >= 0) this.arrows.splice(i, 1);
  }

  _dropTrail(a) {
    if (!a.trail) return;
    this.scene.remove(a.trail);
    a.trail.geometry.dispose();
    a.trail.material.dispose();
    a.trail = null;
  }

  // Nuoli pysähtyi: ehjä nuoli jää poimittavaksi.
  _land(a, keepChance) {
    // Sessio 52: nuolen osuma lähelle säikäyttää linnut lentoon.
    this.mobs.arrowImpact(a.pos.x, a.pos.y, a.pos.z);
    if (Math.random() < keepChance) {
      this.drops.spawn(a.kind, 1, _p.copy(a.pos).addScaledVector(_q.copy(a.vel).normalize(), -0.2), { spread: 0.05, up: 0.15 });
    }
    this._remove(a);
  }

  _updateArrows(dt) {
    for (const a of this.arrows.slice()) {
      a.life += dt;
      if (a.life > 10) { this._remove(a); continue; }
      // Pienet askeleet, jotta nopea nuoli ei hyppää kohteen läpi.
      const sp = a.vel.length();
      const steps = Math.max(1, Math.ceil((sp * dt) / 0.4));
      const h = dt / steps;
      let stopped = false;
      for (let s = 0; s < steps && !stopped; s++) {
        a.vel.y -= GRAVITY * h;
        a.vel.multiplyScalar(1 - 0.02 * h);
        const ox = a.pos.x, oy = a.pos.y, oz = a.pos.z;
        a.pos.addScaledVector(a.vel, h);
        stopped = this._collide(a, ox, oy, oz);
      }
      if (stopped || !this.arrows.includes(a)) continue;
      a.mesh.position.copy(a.pos);
      a.mesh.quaternion.setFromUnitVectors(_up, _q.copy(a.vel).normalize());
      if (a.trail) {
        if (a.life > TRAIL_LIFE) { this._dropTrail(a); continue; }
        // Juova lentoradan suuntaan taaksepäin (ei lähtöpisteen ohi).
        const back = Math.min(TRAIL_LEN, a.pos.distanceTo(a.start));
        const tp = a.trail.geometry.attributes.position;
        tp.setXYZ(0, a.pos.x, a.pos.y, a.pos.z);
        tp.setXYZ(1, a.pos.x - _q.x * back, a.pos.y - _q.y * back, a.pos.z - _q.z * back);
        tp.needsUpdate = true;
        a.trail.material.opacity = 0.6 * (1 - a.life / TRAIL_LIFE);
      }
    }
  }

  // Esineen yläpinnan korkeus (puu: runko 6 m; muut mallin rajauslaatikosta).
  _objTop(o) {
    const def = OBJECT_TYPES[o.type];
    const sc = o.scale || 1;
    if (!def || def.kind === 'tree') return o.y + 6 * sc;
    const geo = this.world.models?.world?.[def.model]?.[o.variant];
    if (!geo) return o.y + 6 * sc;
    if (!geo.boundingBox) geo.computeBoundingBox();
    return o.y + geo.boundingBox.max.y * sc;
  }

  _collide(a, ox, oy, oz) {
    // Eläimet ja viholliset
    for (const m of this.mobs.list) {
      if (m.state === 'dead' || m.yOff < -0.6 || m.def.npc) continue; // sessio 50: NPC:t läpi
      const r = m.def.radius + 0.12;
      // Lähin kohta liikkeen janalla olennon keskilinjaan (2D) ja korkeus.
      const dx = a.pos.x - ox, dz = a.pos.z - oz;
      const L2 = dx * dx + dz * dz || 1e-6;
      const bp = bodyPoint(m, a.pos.x, a.pos.z, _bp); // norsu: koko rungon pituudelta
      let t = ((bp.x - ox) * dx + (bp.z - oz) * dz) / L2;
      t = Math.max(0, Math.min(1, t));
      const cx = ox + dx * t, cz = oz + dz * t, cy = oy + (a.pos.y - oy) * t;
      if ((cx - bp.x) ** 2 + (cz - bp.z) ** 2 > r * r) continue;
      if (cy < m.pos.y - 0.1 || cy > m.pos.y + m.def.height + 0.15) continue;
      const killed = this.mobs.damage(m, a.dmg, { fromX: ox, fromZ: oz, knock: 2.5, up: 0.4, arrow: true });
      _p.set(cx, cy, cz);
      this.mobs.bleed(m, _p, -dx, -dz, a.dmg);
      events.emit('hitFeedback', { strength: 0.15 });
      events.emit('arrowHit', { type: m.type, killed });
      a.pos.copy(_p);
      this._land(a, 0.35);
      return true;
    }
    // Puut, kivet ja rakennelmat (törmäysympyrät ja -janat)
    this.world.collidersNear(a.pos.x, a.pos.z, 1.5, _cols);
    for (const c of _cols) {
      if (c.seg) {
        const ex = c.bx - c.ax, ez = c.bz - c.az;
        const L2 = ex * ex + ez * ez || 1e-6;
        let t = ((a.pos.x - c.ax) * ex + (a.pos.z - c.az) * ez) / L2;
        t = Math.max(0, Math.min(1, t));
        const px = c.ax + ex * t, pz = c.az + ez * t;
        if ((a.pos.x - px) ** 2 + (a.pos.z - pz) ** 2 > c.r * c.r) continue;
        if (c.top !== undefined && a.pos.y > c.top) continue;
      } else {
        if ((a.pos.x - c.x) ** 2 + (a.pos.z - c.z) ** 2 > c.r * c.r) continue;
        // Puiden rungot ja kivet: korkeus karkeasti esineen mukaan (sessio 52:
        // kivien ja pensaiden yli menevä nuoli ei enää pysähdy ilmaan, joten
        // kiven päällä istuvaan lintuun voi osua).
        const top = c.obj ? this._objTop(c.obj) : (c.top ?? Infinity);
        if (a.pos.y > top) continue;
      }
      this.debris.chips(a.pos, 0x8a7a6a, 3, null, 0.4);
      this._land(a, 0.75);
      return true;
    }
    // Maa ja vesi
    const w = waterAt(a.pos.x, a.pos.z, _wq);
    if (a.pos.y <= w.h) {
      a.pos.y = w.h + 0.05;
      this._land(a, 0.85);
      return true;
    }
    if (a.pos.y < w.wl && !a.wet) {
      a.wet = true;
      a.vel.multiplyScalar(0.25);
    }
    return false;
  }
}
