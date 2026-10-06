// Repun tietomalli: paikat 0..hotbarSize-1 ovat pikapalkki, loput reppua.
import { CONFIG } from '../config.js';
import { ITEMS, RECIPES, tagged } from './items.js';
import { events } from './events.js';

export class Inventory {
  constructor() {
    this.size = CONFIG.hotbarSize + CONFIG.backpackSize;
    this.slots = new Array(this.size).fill(null); // { id, count }
    this.selected = 0;
  }

  get selectedItem() {
    return this.slots[this.selected];
  }

  // id voi olla myös tunniste ('#pelt' = mikä tahansa talja).
  count(id) {
    if (id[0] === '#') {
      let n = 0;
      for (const t of tagged(id.slice(1))) n += this.count(t);
      return n;
    }
    let n = 0;
    for (const s of this.slots) if (s && s.id === id) n += s.count;
    return n;
  }

  // Lisää esineitä; palauttaa määrän, joka ei mahtunut.
  add(id, count) {
    const max = ITEMS[id].stack;
    let left = count;
    // Täydennä ensin olemassa olevat pinot.
    for (const s of this.slots) {
      if (left <= 0) break;
      if (s && s.id === id && s.count < max) {
        const n = Math.min(max - s.count, left);
        s.count += n;
        left -= n;
      }
    }
    // Sitten tyhjät paikat (pikapalkki ensin).
    for (let i = 0; i < this.size && left > 0; i++) {
      if (!this.slots[i]) {
        const n = Math.min(max, left);
        this.slots[i] = { id, count: n };
        left -= n;
      }
    }
    if (left !== count) events.emit('inventory');
    return left;
  }

  remove(id, count) {
    if (id[0] === '#') {
      let left = count;
      for (const t of tagged(id.slice(1))) {
        if (left <= 0) break;
        left -= this.remove(t, Math.min(left, this.count(t)));
      }
      return count - left;
    }
    let left = count;
    for (let i = this.size - 1; i >= 0 && left > 0; i--) {
      const s = this.slots[i];
      if (s && s.id === id) {
        const n = Math.min(s.count, left);
        s.count -= n;
        left -= n;
        if (s.count <= 0) this.slots[i] = null;
      }
    }
    events.emit('inventory');
    return count - left;
  }

  removeFromSlot(i, count = 1) {
    const s = this.slots[i];
    if (!s) return;
    s.count -= count;
    if (s.count <= 0) this.slots[i] = null;
    events.emit('inventory');
  }

  // Riittävätkö materiaalit (valmistuspaikka tarkistetaan erikseen).
  hasMaterials(recipe) {
    for (const [id, n] of Object.entries(recipe.need)) if (this.count(id) < n) return false;
    return true;
  }

  // stations = lähellä olevat valmistuspaikat (Set: 'workbench', 'campfire').
  canCraft(recipe, stations = null) {
    if (recipe.station && !(stations && stations.has(recipe.station))) return false;
    return this.hasMaterials(recipe);
  }

  // Mahtuuko tuotos reppuun (yksinkertaistettu tarkistus).
  hasRoomFor(id, count) {
    const max = ITEMS[id].stack;
    let room = 0;
    for (const s of this.slots) {
      if (!s) room += max;
      else if (s.id === id) room += max - s.count;
    }
    return room >= count;
  }

  craft(recipeId, stations = null) {
    const r = RECIPES.find((x) => x.id === recipeId);
    if (!r || !this.canCraft(r, stations)) return false;
    const taken = [];
    for (const [id, n] of Object.entries(r.need)) {
      if (id[0] === '#') {
        // Muista, mitkä esineet ryhmästä kuluivat (palautusta varten).
        for (const t of tagged(id.slice(1))) {
          const k = Math.min(n - taken.filter((x) => x.tag === id).reduce((a, x) => a + x.n, 0), this.count(t));
          if (k > 0) { this.remove(t, k); taken.push({ id: t, n: k, tag: id }); }
        }
      } else {
        this.remove(id, n);
        taken.push({ id, n });
      }
    }
    if (!this.hasRoomFor(r.out, r.count)) {
      // Palauta materiaalit, jos tuotos ei mahdu.
      for (const t of taken) this.add(t.id, t.n);
      return false;
    }
    this.add(r.out, r.count);
    events.emit('craft', { item: r.out, station: r.station || null });
    return true;
  }

  // Vaihda/yhdistä kaksi paikkaa (raahaus repussa).
  moveSlot(from, to) {
    if (from === to) return;
    const a = this.slots[from];
    const b = this.slots[to];
    if (a && b && a.id === b.id) {
      const max = ITEMS[a.id].stack;
      const n = Math.min(max - b.count, a.count);
      b.count += n;
      a.count -= n;
      if (a.count <= 0) this.slots[from] = null;
    } else {
      this.slots[from] = b;
      this.slots[to] = a;
    }
    events.emit('inventory');
  }

  // Kilpi pitää varustaa erikseen (vasempaan käteen). Varustettu pino
  // merkitään eq-lipulla, joka kulkee pinon mukana repussa.
  equippedShield() {
    return this.slots.findIndex((s) => s && s.eq && ITEMS[s.id].shield);
  }

  toggleEquip(i) {
    const s = this.slots[i];
    if (!s || !ITEMS[s.id].shield) return false;
    const on = !s.eq;
    for (const o of this.slots) if (o && o.eq) delete o.eq;
    if (on) s.eq = true;
    events.emit('inventory');
    events.emit('equip', { item: s.id, on });
    return true;
  }

  serialize() {
    return { slots: this.slots, selected: this.selected };
  }

  load(data) {
    if (!data || !Array.isArray(data.slots)) return;
    this.slots = new Array(this.size).fill(null);
    data.slots.forEach((s, i) => {
      if (i < this.size && s && ITEMS[s.id] && s.count > 0) {
        this.slots[i] = { id: s.id, count: s.count };
        if (s.eq && ITEMS[s.id].shield && this.equippedShield() < 0) this.slots[i].eq = true;
      }
    });
    this.selected = Math.min(Math.max(0, data.selected | 0), CONFIG.hotbarSize - 1);
    events.emit('inventory');
  }
}
