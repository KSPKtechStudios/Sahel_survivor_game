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
// Vahinko puuhun ilman kirvestä (kirveellä 1 / isku).
const BAREHANDED_WOOD = 0.01;
import { events } from './events.js';

const _dir = new THREE.Vector3();
const _hit = new THREE.Vector3();
const _anc = new THREE.Vector3(), _a1 = new THREE.Vector3(), _a2 = new THREE.Vector3();
const _place = new THREE.Vector3();
const _cols = [];

export class Interaction {
  constructor({ camera, player, world, tumbleweeds, inventory, viewmodel, structures, debris, drops, fallen, breakables, ruins, mobs, boats }) {
    Object.assign(this, { camera, player, world, tumbleweeds, inventory, viewmodel, structures, debris, drops, fallen, breakables, ruins, mobs, boats });
    this.target = null; // { obj, t, kind: 'object'|'tumbleweed'|'drop'|'log'|'chest'|'mob'|'piece'|'rune'|'boat' }
    this.prompt = null;
    this.placeValid = false;
    this.useItem = null;  // main.js: syö / käytä valitun paikan esine
    this.usePiece = null; // main.js: [E] rakennelmaan (makuualusta)
    this.readRune = null; // main.js: [E] riimukiveen (käännös)
    this.boardBoat = null; // main.js: [E] veneeseen (kyytiin)
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
    if (this.boats) consider(this.boats.raycast(o, _dir, reach + 1.5), 'boat');
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

    // Kilpi kädessä: hiiren oikea (tai [F]) varustaa sen toiseen käteen.
    if (def && def.shield && !item.eq) {
      this.target = null;
      this.prompt = { name: def.name, action: '[F] / [Hiiri 2] Toiseen käteen' };
      if (input.clicked.has(2) && input.enabled) this.inventory.toggleEquip(this.inventory.selected);
      return;
    }

    this.target = this._raycast();
    this.prompt = this._promptFor(this.target, def);
    // Nimilappu seuraa kohdetta (sessio 13): kohdan paikka maailmassa.
    if (this.prompt && this.target) {
      const a = this._anchor(this.target);
      this.prompt.anchor = { x: a.x, y: a.y, z: a.z };
      this.prompt.key = this.target.obj; // nimilapun esiintuloanimaatio (hud.js)
      if (this.target.kind === 'mob') this.prompt.mob = this.target.obj;
    }
    if (input.pressed.has('KeyE') && input.enabled && this.target && !this.player.dead) this._tryPickup(this.target);

    // Ruoka kädessä: hiiren oikea syö (kohteen kehote näkyy, jos sellainen on).
    if (def && def.food) {
      if (!this.prompt || !this.target || this.target.kind === 'piece') {
        this.prompt = { name: def.name, action: def.cat === 'medicine' ? '[Hiiri 2] Käytä' : '[Hiiri 2] Syö' };
      }
      if (input.clicked.has(2) && input.enabled && !this.player.dead && this.useItem) this.useItem(this.inventory.selected);
    }
  }

  // Kohdan nimilapun paikka: kohteen yläpuolella (puissa rungon kohdalla).
  _anchor(t) {
    const o = t.obj, a = _anc;
    if (t.kind === 'mob') return a.set(o.pos.x, o.pos.y + o.def.height + 0.35, o.pos.z);
    if (t.kind === 'drop' && o.mesh) return a.copy(o.mesh.position).setY(o.mesh.position.y + 0.55);
    if (t.kind === 'log' && this.fallen._trunkWorld) {
      this.fallen._trunkWorld(o, _a1, _a2);
      a.lerpVectors(_a1, _a2, 0.35);
      return a.setY(a.y + 0.9);
    }
    if (t.kind === 'boat') return a.set(o.x, o.y + o.def.top * 0.5 + 0.9, o.z);
    if (t.kind === 'object') {
      const d = OBJECT_TYPES[o.type];
      const sc = o.scale || 1;
      const h = d.kind === 'tree' ? (d.collider > 1 ? 3.4 : 2.3) : d.kind === 'rock' || d.kind === 'static' ? Math.min(3.2, 0.6 + 1.1 * sc) : d.kind === 'bush' ? 0.5 + 0.9 * sc : 0.55;
      return a.set(o.x, (o.y ?? 0) + h, o.z);
    }
    // Muut (arkut, riimukivet, rakennelmat, tumbleweedit): osumakohdan yläpuolella.
    this.camera.getWorldDirection(_dir);
    a.copy(this.camera.position).addScaledVector(_dir, t.t);
    return a.setY(a.y + 0.45);
  }

  _promptFor(target, def) {
    if (!target) return null;
    if (target.kind === 'mob') {
      const m = target.obj;
      const t = MOB_TYPES[m.type];
      return { name: t.name, action: '', hp: Math.max(0, m.hp) / t.hp };
    }
    if (target.kind === 'tumbleweed') return { name: 'Tumbleweed', action: '[Hiiri 1] Hakkaa' };
    if (target.kind === 'chest') {
      return target.obj.chest.opened ? { name: 'Tyhjä arkku', action: '' } : { name: 'Arkku', action: '[E] Avaa' };
    }
    if (target.kind === 'rune') return { name: target.obj.rune.name, action: 'PAINA E KÄÄNTÄÄKSESI', rune: true };
    if (target.kind === 'boat') {
      const b = target.obj;
      return { name: b.def.name, action: '[E] Nouse kyytiin' };
    }
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
      const axe = def && def.tool === 'axe';
      if (axe && !this._tierOk(t.harvest, def)) return { name: t.log.name, action: 'Tarvitset paremman kirveen', warn: true };
      return { name: t.log.name, action: axe ? '[Hiiri 1] Pilko' : '' };
    }
    const t = OBJECT_TYPES[target.obj.type];
    if (t.pickup) return { name: t.name, action: '[E] Poimi' };
    if (t.harvest) {
      const h = t.harvest;
      const ok = this._toolOk(h, def);
      // Kestävyyspalkki vain olennoilla (sessio 13), ei puilla eikä kivillä.
      // Sessio 18: puihin ja kasveihin ei tekstiä ilman kirvestä (niitä voi
      // lyödä millä vain, mutta vahinko on mitätön); kiveen "Liian kovaa!".
      if (!ok && h.tool === 'axe') return { name: t.name, action: '' };
      if (ok && this._peeling(target.obj, h)) return { name: t.name, action: '[Hiiri 1] Kuori' };
      if (ok && !this._tierOk(h, def)) return { name: t.name, action: h.tool === 'pickaxe' ? 'Tarvitset paremman hakun' : 'Tarvitset paremman kirveen', warn: true };
      return { name: t.name, action: ok ? '[Hiiri 1] Hakkaa' : h.needMsg, warn: !ok };
    }
    return { name: t.name, action: '' };
  }

  _toolOk(h, def) {
    if (h.tool === 'never') return false;
    if (!h.tool) return true;
    return def && def.tool === h.tool;
  }

  // Sessio 22: työkalun taso riittää (minTier; oletus kivi).
  _tierOk(h, def) {
    if (!h || !h.tool) return true;
    return !!def && (def.tier ?? 1) >= (h.minTier ?? 1);
  }

  // Baobabin kuorinta kesken (ulkopuuta jäljellä).
  _peeling(obj, h) {
    return !!h.peel && (obj.peel === undefined || obj.peel > 0);
  }

  _tryPickup(target) {
    if (target.kind === 'boat') {
      if (this.boardBoat) this.boardBoat(target.obj);
      this.target = null;
      return true;
    }
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

    if (target.kind === 'drop' || target.kind === 'chest' || target.kind === 'rune' || target.kind === 'piece' || target.kind === 'boat') return;
    if (target.kind === 'tumbleweed') {
      const tw = target.obj;
      tw.mesh.updateMatrixWorld(true);
      this.debris.shatter(tw.mesh.geometry, tw.mesh.matrixWorld, { pieces: 6, inner: 0xb49c6c, power: 1.5, life: 1.6, closed: false });
      this.drops.spawn('fiber', 2, tw.mesh.position);
      this.drops.spawn('stick', 1, tw.mesh.position);
      this.drops.spawn('wood', 1, tw.mesh.position);
      this.tumbleweeds.remove(tw);
      events.emit('harvest', { type: 'tumbleweed' });
      events.emit('hitFeedback', { strength: 0.3 });
      return;
    }
    if (target.kind === 'log') {
      // Ilman kirvestä runkoon tulee vain mitätön vahinko (sessio 18).
      const axe = def && def.tool === 'axe';
      const lt = OBJECT_TYPES[target.obj.type];
      if (axe && !this._tierOk(lt.harvest, def)) {
        // Liian heikko kirves (esim. ydinpuu): kopsahtaa, ei vahinkoa.
        this.debris.chips(_hit, 0x8a6a4a, 3, null, 0.6);
        events.emit('hitFeedback', { strength: 0.2 });
        return;
      }
      this.fallen.hit(target.obj, _hit.clone(), playerPos, axe ? (def.power || 1) : BAREHANDED_WOOD);
      events.emit('hitFeedback', { strength: axe ? 0.6 : 0.2 });
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
    const ok = this._toolOk(h, def);
    // Baobab: ensin kuoritaan ulkopuu millä tahansa kirveellä.
    if (ok && this._peeling(obj, h)) {
      this.breakables.peel(obj, _hit.clone(), playerPos, def.power || 1);
      events.emit('hitFeedback', { strength: 0.5 });
      return;
    }
    if (ok && !this._tierOk(h, def)) {
      // Liian heikko työkalu: kopsahtaa, ei vahinkoa.
      this.world.shake(obj, 0.25);
      this.debris.chips(_hit, t.kind === 'rock' ? 0x8a7a6a : 0x8a6a4a, 3, null, 0.6);
      events.emit('hitFeedback', { strength: 0.25 });
      return;
    }
    if (!ok && h.tool !== 'axe') {
      // Kivi ilman hakkua (tai liian suuri puu): kopsahtaa, ei vahinkoa.
      this.world.shake(obj, 0.3);
      this.debris.chips(_hit, 0x8a7a6a, 3, null, 0.6);
      return;
    }
    // Työkalu tehoaa kaksinkertaisesti pensaisiin. Puu ilman kirvestä:
    // mitätön vahinko (käsin tai vaikka marjoilla se ei käytännössä kaadu).
    // Sessio 22: kirveen ja hakun teho tason mukaan (power).
    const dmg = !ok ? BAREHANDED_WOOD : def && def.tool && !h.tool ? 2 : h.tool ? (def.power || 1) : 1;
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
