// Repun tietomalli: paikat 0..hotbarSize-1 ovat pikapalkki, loput reppua.
import { CONFIG } from '../config.js';
import { ITEMS, RECIPES } from './items.js';
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

  count(id) {
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

  canCraft(recipe) {
    for (const [id, n] of Object.entries(recipe.need)) if (this.count(id) < n) return false;
    return true;
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

  craft(recipeId) {
    const r = RECIPES.find((x) => x.id === recipeId);
    if (!r || !this.canCraft(r)) return false;
    for (const [id, n] of Object.entries(r.need)) this.remove(id, n);
    if (!this.hasRoomFor(r.out, r.count)) {
      // Palauta materiaalit, jos tuotos ei mahdu.
      for (const [id, n] of Object.entries(r.need)) this.add(id, n);
      return false;
    }
    this.add(r.out, r.count);
    events.emit('craft', { item: r.out });
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

  serialize() {
    return { slots: this.slots, selected: this.selected };
  }

  load(data) {
    if (!data || !Array.isArray(data.slots)) return;
    this.slots = new Array(this.size).fill(null);
    data.slots.forEach((s, i) => {
      if (i < this.size && s && ITEMS[s.id] && s.count > 0) this.slots[i] = { id: s.id, count: s.count };
    });
    this.selected = Math.min(Math.max(0, data.selected | 0), CONFIG.hotbarSize - 1);
    events.emit('inventory');
  }
}
