// Mihin pelaaja katsoo ja mitä sille voi tehdä: poimi [E], hakkaa [Hiiri 1],
// aseta rakennelma [Hiiri 2].
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { OBJECT_TYPES } from '../world/objectTypes.js';
import { heightAt, sampleTerrain, WATER_LEVEL } from '../world/terrain.js';
import { ITEMS } from './items.js';
import { events } from './events.js';

const _dir = new THREE.Vector3();
const _hit = new THREE.Vector3();
const _place = new THREE.Vector3();
const _cols = [];

const BURST_COLORS = {
  bush: 0x8a7350,
  acacia: 0xc9a679,
  boulder: 0x8f7a68,
  tumbleweed: 0xc8b07a,
  stick: 0x7a5a3a,
  stone: 0x8a8178,
  baobab: 0x9a8a78,
  termite: 0x9a5a36,
};

export class Interaction {
  constructor({ camera, player, world, tumbleweeds, inventory, viewmodel, structures, bursts }) {
    Object.assign(this, { camera, player, world, tumbleweeds, inventory, viewmodel, structures, bursts });
    this.target = null; // { obj, t, kind: 'object'|'tumbleweed' }
    this.prompt = null; // HUD:lle
    this.placeValid = false;
  }

  _raycast() {
    this.camera.getWorldDirection(_dir);
    const origin = this.camera.position;
    const reach = CONFIG.reach;
    const a = this.world.raycast(origin, _dir, reach);
    const b = this.tumbleweeds.raycast(origin, _dir, reach);
    let best = null;
    if (a) best = { ...a, kind: 'object' };
    if (b && (!best || b.t < best.t)) best = { ...b, kind: 'tumbleweed' };
    return best;
  }

  update(dt, input) {
    const item = this.inventory.selectedItem;
    const def = item ? ITEMS[item.id] : null;

    // --- Asetustila (esim. nuotio valittuna)
    if (def && def.place) {
      this.target = null;
      const pos = this._placementPoint();
      this.placeValid = !!pos && this._canPlace(pos);
      this.structures.showGhost(pos, this.placeValid);
      this.prompt = pos
        ? { name: def.name, action: this.placeValid ? '[Hiiri 2] Aseta' : 'Ei voi asettaa tähän', warn: !this.placeValid }
        : { name: def.name, action: 'Katso maahan asettaaksesi', warn: false };
      if (input.clicked.has(2) && pos && this.placeValid) this._place(pos, item);
      if (input.buttons.has(0) && !this.viewmodel.busy) this._swing(def);
      return;
    }
    this.structures.showGhost(null);

    // --- Kohde
    this.target = this._raycast();
    this.prompt = this._promptFor(this.target, def);

    if (input.pressed.has('KeyE') && input.enabled && this.target) this._tryPickup(this.target);
    if (input.buttons.has(0) && !this.viewmodel.busy) this._swing(def);
  }

  _promptFor(target, def) {
    if (!target) return null;
    if (target.kind === 'tumbleweed') return { name: 'Tumbleweed', action: '[Hiiri 1] Hakkaa' };
    const t = OBJECT_TYPES[target.obj.type];
    if (t.pickup) return { name: t.name, action: '[E] Poimi' };
    if (t.harvest) {
      const h = t.harvest;
      const ok = this._toolOk(h, def);
      const hp = h.hp ? target.obj.hp / h.hp : 1;
      return {
        name: t.name,
        action: ok ? '[Hiiri 1] Hakkaa' : h.needMsg,
        warn: !ok,
        hp: ok && hp < 1 ? hp : null,
      };
    }
    return { name: t.name, action: '' };
  }

  _toolOk(h, def) {
    if (h.tool === 'never') return false;
    if (!h.tool) return true;
    return def && def.tool === h.tool;
  }

  _tryPickup(target) {
    if (target.kind !== 'object') return false;
    const t = OBJECT_TYPES[target.obj.type];
    if (!t.pickup) return false;
    const left = this.inventory.add(t.pickup.item, t.pickup.count);
    if (left > 0) {
      events.emit('message', { text: 'Reppu on täynnä' });
      return false;
    }
    this.viewmodel.pickup();
    this.world.removeObject(target.obj);
    events.emit('notify', { item: t.pickup.item, count: t.pickup.count });
    events.emit('pickup', { type: target.obj.type });
    this.target = null;
    return true;
  }

  _swing(def) {
    const kind = def && (def.tool || ITEMS.stick === def) ? 'swing' : 'punch';
    if (!this.player.useStamina(CONFIG.staminaSwing)) {
      events.emit('message', { text: 'Olet liian väsynyt' });
      return;
    }
    this.viewmodel.swing(kind, () => this._onHit(def));
  }

  // Kutsutaan iskun hetkellä (animaation keskellä).
  _onHit(def) {
    const target = this._raycast();
    if (!target) return;
    _hit.copy(this.camera.position).addScaledVector(this.camera.getWorldDirection(_dir), target.t);

    if (target.kind === 'tumbleweed') {
      this.bursts.spawn(_hit, BURST_COLORS.tumbleweed, 18, 2);
      this.tumbleweeds.remove(target.obj);
      this._give([['fiber', 2], ['stick', 1]]);
      events.emit('harvest', { type: 'tumbleweed' });
      return;
    }

    const obj = target.obj;
    const t = OBJECT_TYPES[obj.type];
    if (t.pickup) {
      this._tryPickup(target);
      return;
    }
    if (!t.harvest) {
      this.bursts.spawn(_hit, BURST_COLORS[obj.type] || 0x8a7a6a, 6, 1);
      return;
    }
    const h = t.harvest;
    if (!this._toolOk(h, def)) {
      this.world.shake(obj, 0.3);
      this.bursts.spawn(_hit, BURST_COLORS[obj.type] || 0x8a7a6a, 5, 0.8);
      events.emit('message', { text: h.needMsg });
      return;
    }
    // Työkalu tehoaa kaksinkertaisesti pensaisiin.
    const dmg = def && def.tool && !h.tool ? 2 : 1;
    obj.hp -= dmg;
    this.world.shake(obj, obj.type === 'boulder' ? 0.25 : 1);
    this.bursts.spawn(_hit, BURST_COLORS[obj.type] || 0x8a7a6a, 14, 1.6);
    if (obj.hp <= 0) {
      this.world.removeObject(obj);
      this._give(h.drops);
      events.emit('harvest', { type: obj.type });
    }
  }

  _give(drops) {
    for (const [id, n] of drops) {
      const left = this.inventory.add(id, n);
      if (n - left > 0) events.emit('notify', { item: id, count: n - left });
      if (left > 0) events.emit('message', { text: 'Reppu on täynnä' });
    }
  }

  // Missä kohtaa katse osuu maahan (asettamista varten).
  _placementPoint() {
    this.camera.getWorldDirection(_dir);
    const o = this.camera.position;
    let prev = 0;
    for (let t = 0.5; t <= 5; t += 0.1) {
      const x = o.x + _dir.x * t;
      const y = o.y + _dir.y * t;
      const z = o.z + _dir.z * t;
      if (y <= heightAt(x, z)) {
        // Hienosäätö puolittamalla
        let lo = prev, hi = t;
        for (let i = 0; i < 6; i++) {
          const m = (lo + hi) / 2;
          const yy = o.y + _dir.y * m;
          if (yy <= heightAt(o.x + _dir.x * m, o.z + _dir.z * m)) hi = m; else lo = m;
        }
        const px = o.x + _dir.x * hi;
        const pz = o.z + _dir.z * hi;
        return _place.set(px, heightAt(px, pz), pz);
      }
      prev = t;
    }
    return null;
  }

  _canPlace(pos) {
    const p = this.player.position;
    const d = Math.hypot(pos.x - p.x, pos.z - p.z);
    if (d < 1.1) return false;
    const s = sampleTerrain(pos.x, pos.z, {});
    if (s.h < WATER_LEVEL + 0.1) return false;
    const slope = Math.abs(heightAt(pos.x + 0.6, pos.z) - heightAt(pos.x - 0.6, pos.z)) + Math.abs(heightAt(pos.x, pos.z + 0.6) - heightAt(pos.x, pos.z - 0.6));
    if (slope > 0.7) return false;
    this.world.collidersNear(pos.x, pos.z, 2, _cols);
    for (const c of _cols) {
      if (Math.hypot(c.x - pos.x, c.z - pos.z) < c.r + 0.7) return false;
    }
    return true;
  }

  _place(pos, item) {
    const def = ITEMS[item.id];
    this.structures.add(def.place, pos.x, pos.y, pos.z, this.player.yaw);
    this.inventory.removeFromSlot(this.inventory.selected, 1);
    events.emit('place', { item: item.id });
    events.emit('notify', { item: item.id, count: -1 });
  }
}
