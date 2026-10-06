// Mihin pelaaja katsoo ja mitä sille voi tehdä: poimi [E], hakkaa [Hiiri 1],
// aseta rakennelma [Hiiri 2]. Iskut ja torjunta ovat combat.js:ssä; kun isku ei
// osu olentoon, combat kutsuu _onHit()-funktiota (hakkuu).
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { OBJECT_TYPES } from '../world/objectTypes.js';
import { heightAt, sampleTerrain } from '../world/terrain.js';
import { ITEMS } from './items.js';
import { MOB_TYPES } from './mobs.js';
import { PIECES, BENCH_RANGE } from './pieces.js';
import { events } from './events.js';

const _dir = new THREE.Vector3();
const _hit = new THREE.Vector3();
const _place = new THREE.Vector3();
const _cols = [];

export class Interaction {
  constructor({ camera, player, world, tumbleweeds, inventory, viewmodel, structures, debris, drops, fallen, breakables, ruins, mobs }) {
    Object.assign(this, { camera, player, world, tumbleweeds, inventory, viewmodel, structures, debris, drops, fallen, breakables, ruins, mobs });
    this.target = null; // { obj, t, kind: 'object'|'tumbleweed'|'drop'|'log'|'chest'|'mob'|'piece' }
    this.prompt = null;
    this.placeValid = false;
    this.useItem = null;  // main.js: syö / käytä valitun paikan esine
    this.usePiece = null; // main.js: [E] rakennelmaan (makuualusta)
    this.readRune = null; // main.js: [E] riimukiveen (käännös)
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
    consider(this.ruins.raycast(o, _dir, reach), 'chest');
    consider(this.ruins.raycastRunes(o, _dir, reach + 1.5), 'rune');
    consider(this.structures.raycast(o, _dir, reach), 'piece');
    if (this.mobs) consider(this.mobs.raycast(o, _dir, reach + 2), 'mob');
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
      const noBench = pos && !this.structures.nearest('workbench', pos.x, pos.z, BENCH_RANGE);
      this.prompt = pos
        ? { name: def.name, action: this.placeValid ? '[Hiiri 2] Aseta' : noBench ? 'Vaatii työstöpenkin lähelle' : 'Ei voi asettaa tähän', warn: !this.placeValid }
        : { name: def.name, action: 'Katso maahan asettaaksesi', warn: false };
      if (input.clicked.has(2) && pos && this.placeValid) this._place(pos, item);
      return;
    }
    this.structures.showGhost(null);

    // Kilpi kädessä: hiiren oikea varustaa sen vasempaan käteen.
    if (def && def.shield && !item.eq) {
      this.target = null;
      this.prompt = { name: def.name, action: '[Hiiri 2] Varusta vasempaan käteen' };
      if (input.clicked.has(2) && input.enabled) {
        this.inventory.toggleEquip(this.inventory.selected);
        events.emit('message', { text: 'Kilpi varustettu: torju [Hiiri 2]' });
      }
      return;
    }

    this.target = this._raycast();
    this.prompt = this._promptFor(this.target, def);
    if (input.pressed.has('KeyE') && input.enabled && this.target && !this.player.dead) this._tryPickup(this.target);

    // Ruoka kädessä: hiiren oikea syö (kohteen kehote näkyy, jos sellainen on).
    if (def && def.food) {
      if (!this.prompt || !this.target || this.target.kind === 'piece') {
        this.prompt = { name: def.name, action: def.cat === 'medicine' ? '[Hiiri 2] Käytä' : '[Hiiri 2] Syö' };
      }
      if (input.clicked.has(2) && input.enabled && !this.player.dead && this.useItem) this.useItem(this.inventory.selected);
    }
  }

  _promptFor(target, def) {
    if (!target) return null;
    if (target.kind === 'mob') {
      const m = target.obj;
      const t = MOB_TYPES[m.type];
      return { name: t.name, action: m.state === 'dead' ? '' : m.state === 'stagger' && m.vulnerable ? 'Horjuu, lyö nyt!' : '', hp: Math.max(0, m.hp) / t.hp };
    }
    if (target.kind === 'tumbleweed') return { name: 'Tumbleweed', action: '[Hiiri 1] Hakkaa' };
    if (target.kind === 'chest') {
      return target.obj.chest.opened ? { name: 'Tyhjä arkku', action: '' } : { name: 'Arkku', action: '[E] Avaa' };
    }
    if (target.kind === 'rune') return { name: target.obj.rune.name, action: 'PAINA E KÄÄNTÄÄKSESI', rune: true };
    if (target.kind === 'drop') {
      const d = target.obj;
      return { name: ITEMS[d.item].name + (d.count > 1 ? ` ×${d.count}` : ''), action: '[E] Poimi' };
    }
    if (target.kind === 'piece') {
      const pd = PIECES[target.obj.type];
      const hint = pd.bed ? '[E] Nuku / aseta herätyspaikka' : pd.station === 'workbench' ? '[Tab] Valmista työkaluja ja aseita'
        : pd.station === 'campfire' ? '[Tab] Valmista ruokaa ja rohtoja' : '';
      return { name: pd.name, action: hint };
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
    if (target.kind === 'rune') {
      if (this.readRune) this.readRune(target.obj);
      return true;
    }
    if (target.kind === 'piece') {
      if (PIECES[target.obj.type].bed && this.usePiece) this.usePiece(target.obj);
      return true;
    }
    if (target.kind === 'chest') {
      if (this.ruins.open(target.obj)) this.viewmodel.pickup();
      return true;
    }
    if (target.kind === 'drop') {
      this.viewmodel.pickup();
      this.drops.pick(target.obj, true);
      this.target = null;
      return true;
    }
    if (target.kind !== 'object') return false;
    const t = OBJECT_TYPES[target.obj.type];
    if (!t.pickup) return false;
    // pickup: { item, count } tai { drops: [[esine, min, max], ...] } (satunnainen määrä)
    const list = t.pickup.drops
      ? t.pickup.drops.map(([item, a, b]) => [item, a + Math.floor(Math.random() * (b - a + 1))]).filter(([, n]) => n > 0)
      : [[t.pickup.item, t.pickup.count]];
    for (const [item, n] of list) {
      if (!this.inventory.hasRoomFor(item, n)) {
        events.emit('message', { text: 'Reppu on täynnä' });
        return false;
      }
    }
    for (const [item, n] of list) {
      this.inventory.add(item, n);
      events.emit('notify', { item, count: n });
    }
    this.viewmodel.pickup();
    this.world.removeObject(target.obj);
    events.emit('pickup', { type: target.obj.type });
    this.target = null;
    return true;
  }

  // Kutsutaan iskun hetkellä (combat.js), kun isku ei osunut olentoon.
  _onHit(def) {
    const target = this._raycast();
    if (!target || target.kind === 'mob') return;
    _hit.copy(this.camera.position).addScaledVector(this.camera.getWorldDirection(_dir), target.t);
    const playerPos = this.camera.position;

    if (target.kind === 'drop' || target.kind === 'chest' || target.kind === 'rune' || target.kind === 'piece') return;
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
    // Nuotio (ja muut rakennelmat) vaativat työstöpenkin lähelle.
    if (!this.structures.nearest('workbench', pos.x, pos.z, BENCH_RANGE)) return false;
    const s = sampleTerrain(pos.x, pos.z, {});
    if (s.h < s.wl + 0.1) return false;
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
