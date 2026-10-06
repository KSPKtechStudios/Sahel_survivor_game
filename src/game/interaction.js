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

export class Interaction {
  constructor({ camera, player, world, tumbleweeds, inventory, viewmodel, structures, debris, drops, fallen, breakables }) {
    Object.assign(this, { camera, player, world, tumbleweeds, inventory, viewmodel, structures, debris, drops, fallen, breakables });
    this.target = null; // { obj, t, kind: 'object'|'tumbleweed'|'drop'|'log' }
    this.prompt = null;
    this.placeValid = false;
  }

  _raycast() {
    this.camera.getWorldDirection(_dir);
    const o = this.camera.position;
    const reach = CONFIG.reach;
    let best = null;
    const consider = (res, kind) => {
      if (res && (!best || res.t < best.t)) best = { ...res, kind };
    };
    consider(this.world.raycast(o, _dir, reach), 'object');
    consider(this.tumbleweeds.raycast(o, _dir, reach), 'tumbleweed');
    consider(this.drops.raycast(o, _dir, reach), 'drop');
    consider(this.fallen.raycast(o, _dir, reach + 0.4), 'log');
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

    this.target = this._raycast();
    this.prompt = this._promptFor(this.target, def);
    if (input.pressed.has('KeyE') && input.enabled && this.target) this._tryPickup(this.target);
    if (input.buttons.has(0) && !this.viewmodel.busy) this._swing(def);
  }

  _promptFor(target, def) {
    if (!target) return null;
    if (target.kind === 'tumbleweed') return { name: 'Tumbleweed', action: '[Hiiri 1] Hakkaa' };
    if (target.kind === 'drop') {
      const d = target.obj;
      return { name: ITEMS[d.item].name + (d.count > 1 ? ` ×${d.count}` : ''), action: '[E] Poimi' };
    }
    if (target.kind === 'log') {
      const log = target.obj;
      const t = OBJECT_TYPES[log.type];
      const ok = def && def.tool === 'axe';
      return { name: t.log.name, action: ok ? '[Hiiri 1] Pilko' : 'Tarvitset kirveen', warn: !ok, hp: ok && log.hp < t.log.hp ? log.hp / t.log.hp : null };
    }
    const t = OBJECT_TYPES[target.obj.type];
    if (t.pickup) return { name: t.name, action: '[E] Poimi' };
    if (t.harvest) {
      const h = t.harvest;
      const ok = this._toolOk(h, def);
      const hp = h.hp ? target.obj.hp / h.hp : 1;
      return { name: t.name, action: ok ? '[Hiiri 1] Hakkaa' : h.needMsg, warn: !ok, hp: ok && hp < 1 ? hp : null };
    }
    return { name: t.name, action: '' };
  }

  _toolOk(h, def) {
    if (h.tool === 'never') return false;
    if (!h.tool) return true;
    return def && def.tool === h.tool;
  }

  _tryPickup(target) {
    if (target.kind === 'drop') {
      this.viewmodel.pickup();
      this.drops.pick(target.obj, true);
      this.target = null;
      return true;
    }
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
    const playerPos = this.camera.position;

    if (target.kind === 'drop') return;
    if (target.kind === 'tumbleweed') {
      const tw = target.obj;
      tw.mesh.updateMatrixWorld(true);
      this.debris.shatter(tw.mesh.geometry, tw.mesh.matrixWorld, { pieces: 6, inner: 0xb49c6c, power: 1.5, life: 1.6, closed: false });
      this.drops.spawn('fiber', 2, tw.mesh.position);
      this.drops.spawn('stick', 1, tw.mesh.position);
      this.tumbleweeds.remove(tw);
      events.emit('harvest', { type: 'tumbleweed' });
      events.emit('hitFeedback', { strength: 0.3 });
      return;
    }
    if (target.kind === 'log') {
      if (!def || def.tool !== 'axe') {
        this.debris.chips(_hit, 0x5b4838, 3, null, 0.6);
        events.emit('message', { text: 'Tarvitset kirveen' });
        return;
      }
      this.fallen.hit(target.obj, _hit.clone(), playerPos);
      events.emit('hitFeedback', { strength: 0.6 });
      return;
    }

    const obj = target.obj;
    const t = OBJECT_TYPES[obj.type];
    if (t.pickup) {
      this._tryPickup(target);
      return;
    }
    if (!t.harvest) {
      this.debris.chips(_hit, 0x9a5a36, 4, null, 0.6);
      return;
    }
    const h = t.harvest;
    if (!this._toolOk(h, def)) {
      this.world.shake(obj, 0.3);
      this.debris.chips(_hit, 0x8a7a6a, 3, null, 0.6);
      events.emit('message', { text: h.needMsg });
      return;
    }
    // Työkalu tehoaa kaksinkertaisesti pensaisiin.
    const dmg = def && def.tool && !h.tool ? 2 : 1;
    this.breakables.hit(obj, _hit.clone(), playerPos, dmg);
    events.emit('hitFeedback', { strength: t.kind === 'bush' ? 0.3 : 0.6 });
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
        let lo = prev, hi = t;
        for (let i = 0; i < 6; i++) {
          const m = (lo + hi) / 2;
          if (o.y + _dir.y * m <= heightAt(o.x + _dir.x * m, o.z + _dir.z * m)) hi = m; else lo = m;
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
    if (Math.hypot(pos.x - p.x, pos.z - p.z) < 1.1) return false;
    const s = sampleTerrain(pos.x, pos.z, {});
    if (s.h < WATER_LEVEL + 0.1) return false;
    const slope = Math.abs(heightAt(pos.x + 0.6, pos.z) - heightAt(pos.x - 0.6, pos.z)) + Math.abs(heightAt(pos.x, pos.z + 0.6) - heightAt(pos.x, pos.z - 0.6));
    if (slope > 0.7) return false;
    this.world.collidersNear(pos.x, pos.z, 2, _cols);
    for (const c of _cols) {
      if (c.seg) continue;
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
