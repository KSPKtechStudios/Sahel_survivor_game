// Reppu ja valmistus [Tab] (sessio 19: täydellinen uudistus).
// - Reppu (vasemmalla): 5 × 6 ruudukko ja pikapalkin rivi. Esineitä vedetään
//   hiirellä; Shift+klikkaus siirtää pikapalkin ja repun välillä; hiiren
//   oikealla raahaaminen jakaa pinon puoliksi; hiiren oikea klikkaus syö tai
//   varustaa (kilpi, panssarit); repusta ulos raahattu pino pudotetaan maahan.
// - Valmistus (oikealla, oma ikkuna): vain tässä paikassa tehtävät reseptit
//   (käsin + lähellä olevat työstöpenkki / nuotio). Reseptin valinta näyttää
//   tiedot ja tarvikkeet; Valmista-nappi ja määrä ×1 / ×5 / kaikki.
import { CONFIG } from '../config.js';
import { ITEMS, RECIPES, STATIONS, CATEGORIES, TAG_NAMES, tagged } from '../game/items.js';
import { events } from '../game/events.js';
import { itemStats } from '../game/survival.js';

const DRAG_START = 5; // px, ennen kuin painallus muuttuu raahaukseksi

export class InventoryUI {
  // stations() palauttaa lähellä olevat valmistuspaikat (Set), use(i) käyttää
  // paikan esineen (syö / juo), drop(i, n) pudottaa n kpl paikasta maahan.
  constructor(inventory, icons, { stations = () => new Set(), use = () => false, drop = () => false } = {}) {
    this.inventory = inventory;
    this.icons = icons;
    this.stations = stations;
    this.use = use;
    this.drop = drop;
    this.root = document.getElementById('inventory');
    this.invWin = document.getElementById('inv-window');
    this.craftWin = document.getElementById('craft-window');
    this.grid = document.getElementById('inv-grid');
    this.hotGrid = document.getElementById('inv-hotbar');
    this.tip = document.getElementById('inv-tooltip');
    this.ghost = document.getElementById('drag-ghost');
    this.craftWhere = document.getElementById('craft-where');
    this.craftTabs = document.getElementById('craft-tabs');
    this.craftList = document.getElementById('craft-list');
    this.craftDetail = document.getElementById('craft-detail');
    this.open = false;
    this.tab = 'all';
    this.near = new Set();
    this.sel = null;     // valittu resepti (id)
    this.qty = 1;
    this.press = null;   // { i, button, x, y, shift }
    this.drag = null;    // { from, count }
    this.hover = -1;

    this.slotEls = [];
    for (let i = 0; i < inventory.size; i++) {
      const hot = i < CONFIG.hotbarSize;
      const el = document.createElement('div');
      el.className = 'islot' + (hot ? ' hot' : '');
      el.dataset.i = i;
      el.innerHTML = `${hot ? `<span class="key">${i + 1}</span>` : ''}<img alt="" draggable="false"><span class="count"></span><span class="eq" title="Varustettu"></span>`;
      el.addEventListener('pointerdown', (e) => this._down(e, i));
      el.addEventListener('pointerenter', () => { this.hover = i; this._tipFor(i); });
      el.addEventListener('pointerleave', () => { if (this.hover === i) { this.hover = -1; this._hideTip(); } });
      (hot ? this.hotGrid : this.grid).appendChild(el);
      this.slotEls.push(el);
    }
    this.root.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('pointermove', (e) => this._move(e));
    window.addEventListener('pointerup', (e) => this._up(e));

    // Valmistuksen välilehdet
    for (const [key, label] of CATEGORIES) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = label;
      b.dataset.tab = key;
      b.addEventListener('click', () => { this.tab = key; this.render(); });
      this.craftTabs.appendChild(b);
    }

    events.on('inventory', () => { if (this.open) this.render(); });
  }

  show() {
    this.open = true;
    this.root.classList.remove('hidden');
    // Ikkunat liukuvat esiin (CSS) seuraavassa ruudussa.
    requestAnimationFrame(() => this.root.classList.add('on'));
    this.render();
  }

  hide() {
    this.open = false;
    this._cancelDrag();
    this._hideTip();
    this.root.classList.remove('on');
    this.root.classList.add('hidden');
  }

  // --- Raahaus ---------------------------------------------------------------
  _down(e, i) {
    if (e.button !== 0 && e.button !== 2) return;
    e.preventDefault();
    this.press = { i, button: e.button, x: e.clientX, y: e.clientY, shift: e.shiftKey };
  }

  _move(e) {
    if (!this.open) return;
    if (this.press && !this.drag) {
      if (Math.hypot(e.clientX - this.press.x, e.clientY - this.press.y) > DRAG_START) {
        const s = this.inventory.slots[this.press.i];
        if (s) {
          const count = this.press.button === 2 && s.count > 1 ? Math.ceil(s.count / 2) : s.count;
          this.drag = { from: this.press.i, count };
          this.ghost.querySelector('img').src = this.icons[s.id] || '';
          this.ghost.querySelector('span').textContent = count > 1 ? count : '';
          this.ghost.classList.add('on');
          this.slotEls[this.press.i].classList.add('dragging');
          this._hideTip();
        }
        this.press = null;
      }
    }
    if (this.drag) {
      this.ghost.style.transform = `translate(${e.clientX}px, ${e.clientY}px) translate(-50%, -50%)`;
      const over = this._slotAt(e.clientX, e.clientY);
      for (const el of this.slotEls) el.classList.toggle('drop', el === over);
      const out = !this._inWindows(e.clientX, e.clientY);
      this.ghost.classList.toggle('out', out);
    } else if (this.hover >= 0) {
      this._placeTip(e.clientX, e.clientY);
    }
  }

  _up(e) {
    if (!this.open) { this.press = null; return; }
    if (this.drag) {
      const { from, count } = this.drag;
      const s = this.inventory.slots[from];
      const over = this._slotAt(e.clientX, e.clientY);
      if (s && over) {
        const to = +over.dataset.i;
        if (count >= s.count) this.inventory.moveSlot(from, to);
        else this.inventory.splitTo(from, to, count);
        this._pop(to);
      } else if (s && !this._inWindows(e.clientX, e.clientY)) {
        this.drop(from, count);
      }
      this._cancelDrag();
      this.render();
      return;
    }
    const p = this.press;
    this.press = null;
    if (!p) return;
    const s = this.inventory.slots[p.i];
    if (p.button === 0) {
      if (p.shift && s) { this.inventory.quickMove(p.i); return; }
      // Pikapalkin paikan klikkaus valitsee sen käteen.
      if (p.i < CONFIG.hotbarSize) { this.inventory.selected = p.i; events.emit('inventory'); }
    } else if (p.button === 2 && s) {
      const d = ITEMS[s.id];
      if (this.inventory.canEquip(s.id)) this.inventory.toggleEquip(p.i);
      else if (d.food) this.use(p.i);
      this._pop(p.i);
      this._tipFor(p.i);
    }
  }

  _cancelDrag() {
    if (this.drag) this.slotEls[this.drag.from].classList.remove('dragging');
    this.drag = null;
    this.press = null;
    this.ghost.classList.remove('on', 'out');
    for (const el of this.slotEls) el.classList.remove('drop');
  }

  _slotAt(x, y) {
    const el = document.elementFromPoint(x, y);
    return el ? el.closest('.islot') : null;
  }

  _inWindows(x, y) {
    for (const w of [this.invWin, this.craftWin]) {
      const r = w.getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return true;
    }
    return false;
  }

  // Pieni hypähdys paikassa (siirto, varustus).
  _pop(i) {
    const el = this.slotEls[i];
    if (el) el.animate([{ transform: 'scale(0.9)' }, { transform: 'scale(1.06)' }, { transform: 'scale(1)' }], { duration: 220, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' });
  }

  // --- Työkaluvihje ------------------------------------------------------------
  _tipFor(i) {
    const s = this.inventory.slots[i];
    if (!s || this.drag) { this._hideTip(); return; }
    const d = ITEMS[s.id];
    const stats = itemStats(d, s.id);
    const hints = [];
    if (this.inventory.canEquip(s.id)) hints.push(s.eq ? 'Hiiren oikea: riisu' : 'Hiiren oikea: varusta');
    else if (d.food) hints.push('Hiiren oikea: syö');
    hints.push(i < CONFIG.hotbarSize ? 'Shift+klikkaus: reppuun' : 'Shift+klikkaus: pikapalkkiin');
    if (s.count > 1) hints.push('Raahaa oikealla: jaa pino');
    this.tip.innerHTML = `<b></b>${s.eq ? '<span class="tag">Varustettu</span>' : ''}<p></p>${stats ? '<em></em>' : ''}<small></small>`;
    this.tip.querySelector('b').textContent = d.name + (s.count > 1 ? ` ×${s.count}` : '');
    this.tip.querySelector('p').textContent = d.desc || '';
    if (stats) this.tip.querySelector('em').textContent = stats;
    this.tip.querySelector('small').textContent = hints.join(' · ');
    this.tip.classList.add('on');
  }

  _placeTip(x, y) {
    const r = this.tip.getBoundingClientRect();
    const w = window.innerWidth, h = window.innerHeight;
    let tx = x + 18, ty = y + 18;
    if (tx + r.width > w - 8) tx = x - r.width - 14;
    if (ty + r.height > h - 8) ty = h - r.height - 8;
    this.tip.style.transform = `translate(${tx}px, ${ty}px)`;
  }

  _hideTip() {
    this.tip.classList.remove('on');
  }

  // --- Piirto ------------------------------------------------------------------
  render() {
    const inv = this.inventory;
    inv.slots.forEach((s, i) => {
      const el = this.slotEls[i];
      const img = el.querySelector('img');
      el.classList.toggle('selected', i === inv.selected);
      el.classList.toggle('equipped', !!(s && s.eq));
      el.classList.toggle('empty', !s);
      if (s) {
        const src = this.icons[s.id] || '';
        if (img.getAttribute('src') !== src) img.src = src;
        img.style.visibility = 'visible';
        el.querySelector('.count').textContent = s.count > 1 ? s.count : '';
      } else {
        img.removeAttribute('src');
        img.style.visibility = 'hidden';
        el.querySelector('.count').textContent = '';
      }
    });
    if (this.hover >= 0) this._tipFor(this.hover);
    this._renderCraft();
  }

  // Tässä paikassa tehtävät reseptit: käsin + lähellä olevat asemat.
  _available() {
    return RECIPES.filter((r) => !r.station || this.near.has(r.station));
  }

  _renderCraft() {
    const inv = this.inventory;
    this.near = this.stations();
    const where = ['Käsin', ...Object.entries(STATIONS).filter(([k]) => this.near.has(k)).map(([, st]) => st.name)];
    this.craftWhere.textContent = where.join(' · ');
    const avail = this._available();
    // Välilehdet: vain ne, joissa on jotain tehtävää tässä.
    for (const b of this.craftTabs.children) {
      const key = b.dataset.tab;
      const has = key === 'all' || avail.some((r) => (ITEMS[r.out].cat || 'material') === key);
      b.style.display = has ? '' : 'none';
      b.classList.toggle('on', key === this.tab);
    }
    if (this.tab !== 'all' && !avail.some((r) => (ITEMS[r.out].cat || 'material') === this.tab)) this.tab = 'all';
    const list = avail.filter((r) => this.tab === 'all' || (ITEMS[r.out].cat || 'material') === this.tab);
    list.sort((a, b) => (inv.canCraft(b, this.near) ? 1 : 0) - (inv.canCraft(a, this.near) ? 1 : 0));
    if (!list.some((r) => r.id === this.sel)) this.sel = list.length ? list[0].id : null;

    const scroll = this.craftList.scrollTop;
    this.craftList.innerHTML = '';
    for (const r of list) {
      const can = inv.canCraft(r, this.near);
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'crow' + (can ? ' can' : '') + (r.id === this.sel ? ' sel' : '');
      row.innerHTML = `<img alt=""><span class="cname"></span>${r.station ? `<span class="cst">${STATIONS[r.station].name}</span>` : ''}`;
      row.querySelector('img').src = this.icons[r.out] || '';
      row.querySelector('.cname').textContent = ITEMS[r.out].name + (r.count > 1 ? ` ×${r.count}` : '');
      row.addEventListener('click', () => { this.sel = r.id; this.qty = 1; this._renderCraft(); });
      this.craftList.appendChild(row);
    }
    this.craftList.scrollTop = scroll;
    if (!list.length) this.craftList.innerHTML = '<div class="cempty">Täällä ei voi valmistaa mitään. Rakenna työstöpenkki tai nuotio.</div>';
    this._renderDetail();
  }

  _maxCraft(r) {
    let n = Infinity;
    for (const [id, need] of Object.entries(r.need)) n = Math.min(n, Math.floor(this.inventory.count(id) / need));
    return Number.isFinite(n) ? n : 0;
  }

  _renderDetail() {
    const r = RECIPES.find((x) => x.id === this.sel);
    const box = this.craftDetail;
    if (!r) { box.innerHTML = ''; return; }
    const inv = this.inventory;
    const d = ITEMS[r.out];
    const max = this._maxCraft(r);
    const qty = this.qty === 'max' ? Math.max(1, max) : this.qty;
    const reqs = Object.entries(r.need).map(([id, n]) => {
      const have = inv.count(id);
      const icon = id[0] === '#' ? tagged(id.slice(1))[0] : id;
      const name = id[0] === '#' ? TAG_NAMES[id.slice(1)] : ITEMS[id].name;
      const need = n * qty;
      return `<div class="req ${have >= need ? 'ok' : 'miss'}"><img src="${this.icons[icon] || ''}" alt=""><span class="rn">${name}</span><span class="rc">${Math.min(have, 999)} / ${need}</span></div>`;
    }).join('');
    const can = max >= qty && inv.canCraft(r, this.near);
    const stats = itemStats(d, r.out);
    box.innerHTML = `
      <div class="dhead"><img alt=""><div><b></b><p></p>${stats ? '<em></em>' : ''}</div></div>
      <div class="dreqs">${reqs}</div>
      <div class="dact">
        <div class="qty">
          <button type="button" data-q="1">×1</button><button type="button" data-q="5">×5</button><button type="button" data-q="max">Kaikki${max > 1 ? ` (${max})` : ''}</button>
        </div>
        <button type="button" class="make" ${can ? '' : 'disabled'}>Valmista</button>
      </div>`;
    box.querySelector('.dhead img').src = this.icons[r.out] || '';
    box.querySelector('b').textContent = d.name + (r.count > 1 ? ` ×${r.count}` : '');
    box.querySelector('p').textContent = d.desc || '';
    if (stats) box.querySelector('em').textContent = stats;
    for (const b of box.querySelectorAll('.qty button')) {
      b.classList.toggle('on', String(this.qty) === b.dataset.q);
      b.addEventListener('click', () => { this.qty = b.dataset.q === 'max' ? 'max' : +b.dataset.q; this._renderDetail(); });
    }
    box.querySelector('.make').addEventListener('click', () => this._craft(r, qty));
  }

  _craft(r, qty) {
    let made = 0;
    for (let k = 0; k < qty; k++) {
      if (!this.inventory.craft(r.id, this.stations())) break;
      made++;
    }
    if (made > 0) {
      events.emit('notify', { item: r.out, count: r.count * made });
      const b = this.craftDetail.querySelector('.make');
      if (b) b.animate([{ transform: 'scale(0.94)' }, { transform: 'scale(1)' }], { duration: 200, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' });
    } else if (this.inventory.canCraft(r, this.stations())) {
      events.emit('message', { text: 'Reppu on täynnä' });
    }
    this.render();
  }
}
