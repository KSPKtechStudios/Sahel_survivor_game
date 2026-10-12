// Reppu ja valmistus [Tab] (sessio 19: täydellinen uudistus).
// - Reppu (vasemmalla): 5 × 6 ruudukko ja pikapalkin rivi. Sessio 20: kuten
//   Minecraftissa klikkaus ottaa pinon kursoriin ja seuraava klikkaus laskee sen
//   (myös raahaus toimii); Shift+klikkaus siirtää pikapalkin ja repun välillä;
//   Ctrl+hiiren oikea avaa pinon jakoikkunan; hiiren oikea syö tai varustaa
//   (kilpi / soihtu toiseen käteen, panssarit); repun ulkopuolelle laskettu
//   pino pudotetaan maahan.
// - Valmistus (oikealla, oma ikkuna): vain tässä paikassa tehtävät reseptit
//   (käsin + lähellä olevat työstöpenkki / nuotio). Reseptin valinta näyttää
//   tiedot ja tarvikkeet; Valmista-nappi ja määrä ×1 / ×5 / kaikki. Valmistus
//   kestää hetken (sessio 20: n. 2 s), nappi on sillä välin lukossa.
import { CONFIG } from '../config.js';
import { ITEMS, RECIPES, STATIONS, CATEGORIES, TAG_NAMES, tagged } from '../game/items.js';
import { events } from '../game/events.js';
import { itemStats } from '../game/survival.js';

const DRAG_START = 6; // px, ennen kuin painallus muuttuu raahaukseksi
const CRAFT_TIME = 2;  // s, yhden valmistuksen kesto (sarja hieman pidempi)

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
    this.held = null;    // kursorissa oleva pino { from, count, x, y, moved }
    this.hover = -1;
    this.crafting = null; // { r, qty, t0, dur }
    this.splitEl = document.getElementById('split-dialog');

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
    this.root.addEventListener('pointerdown', (e) => this._rootDown(e));
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
    this._closeSplit();
    this.crafting = null;
    this._cancelDrag();
    this._hideTip();
    this.root.classList.remove('on');
    this.root.classList.add('hidden');
  }

  // --- Ottaminen ja laskeminen (sessio 20) ---------------------------------------
  _down(e, i) {
    if (e.button !== 0 && e.button !== 2) return;
    e.preventDefault();
    e.stopPropagation();
    this._closeSplit();
    const s = this.inventory.slots[i];
    if (e.button === 2) {
      if (this.held) return;
      if (!s) return;
      if (e.ctrlKey && s.count > 1) { this._openSplit(i, e.clientX, e.clientY); return; }
      // Hiiren oikea: syö tai varustaa.
      const d = ITEMS[s.id];
      if (this.inventory.canEquip(s.id)) this.inventory.toggleEquip(i);
      else if (d.food) this.use(i);
      this._pop(i);
      this._tipFor(i);
      return;
    }
    if (this.held) { this._place(i); return; }
    if (!s) {
      // Tyhjä pikapaikka: valitaan käteen.
      if (i < CONFIG.hotbarSize) { this.inventory.selected = i; events.emit('inventory'); }
      return;
    }
    if (e.shiftKey) { this.inventory.quickMove(i); this._pop(i); return; }
    this._pick(i, s.count, e.clientX, e.clientY);
  }

  _pick(i, count, x, y) {
    const s = this.inventory.slots[i];
    if (!s) return;
    this.held = { from: i, count, x, y, moved: false };
    this.ghost.querySelector('img').src = this.icons[s.id] || '';
    this.ghost.querySelector('span').textContent = count > 1 ? count : '';
    this.ghost.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
    this.ghost.classList.add('on');
    this.slotEls[i].classList.add('dragging');
    this._hideTip();
  }

  // Lasketaan kursorin pino paikkaan i (vaihto, yhdistys tai osa pinosta).
  _place(i) {
    const h = this.held;
    if (!h) return;
    const s = this.inventory.slots[h.from];
    if (!s) { this._release(); return; }
    if (i === h.from) { this._release(); this._pop(i); return; }
    let ok = true;
    if (h.count >= s.count) this.inventory.moveSlot(h.from, i);
    else ok = this.inventory.splitTo(h.from, i, h.count) > 0;
    if (!ok) {
      // Ei mahdu (eri esine): pieni tärähdys.
      this.slotEls[i].animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-3px)' }, { transform: 'translateX(3px)' }, { transform: 'translateX(0)' }], { duration: 180 });
      return;
    }
    this._release();
    this._pop(i);
    this.render();
  }

  _release() {
    if (this.held && this.slotEls[this.held.from]) this.slotEls[this.held.from].classList.remove('dragging');
    this.held = null;
    this.ghost.classList.remove('on', 'out');
    for (const el of this.slotEls) el.classList.remove('drop');
  }

  _cancelDrag() {
    this._release();
  }

  _move(e) {
    if (!this.open) return;
    const h = this.held;
    if (h) {
      if (!h.moved && Math.hypot(e.clientX - h.x, e.clientY - h.y) > DRAG_START) h.moved = true;
      this.ghost.style.transform = `translate(${e.clientX}px, ${e.clientY}px) translate(-50%, -50%)`;
      const over = this._slotAt(e.clientX, e.clientY);
      for (const el of this.slotEls) el.classList.toggle('drop', el === over && +el.dataset.i !== h.from);
      this.ghost.classList.toggle('out', !this._inWindows(e.clientX, e.clientY));
    } else if (this.hover >= 0) {
      this._placeTip(e.clientX, e.clientY);
    }
  }

  _up(e) {
    if (!this.open || e.button !== 0) return;
    const h = this.held;
    // Raahaus: vapautus toisen paikan päällä laskee pinon. Pelkkä klikkaus
    // jättää pinon kursoriin (seuraava klikkaus laskee).
    if (h && h.moved) {
      const over = this._slotAt(e.clientX, e.clientY);
      if (over && +over.dataset.i !== h.from) this._place(+over.dataset.i);
      else if (!over && !this._inWindows(e.clientX, e.clientY)) this._dropHeld();
    }
  }

  // Klikkaus ikkunoiden ulkopuolella kursorin pinon kanssa: pudotetaan maahan.
  _rootDown(e) {
    if (!this.held || e.button !== 0) return;
    if (!this._inWindows(e.clientX, e.clientY)) this._dropHeld();
  }

  _dropHeld() {
    const h = this.held;
    if (!h) return;
    const s = this.inventory.slots[h.from];
    if (s) this.drop(h.from, Math.min(h.count, s.count));
    this._release();
    this.render();
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

  // --- Pinon jako (Ctrl + hiiren oikea) -----------------------------------------
  _openSplit(i, x, y) {
    const s = this.inventory.slots[i];
    if (!s || s.count < 2) return;
    const el = this.splitEl;
    const half = Math.floor(s.count / 2);
    el.innerHTML = `<b>Jaa pino</b><div class="sp-row"><img alt=""><span class="sp-a"></span><input type="range" min="1" max="${s.count - 1}" value="${half}"><span class="sp-b"></span></div><div class="sp-btns"><button type="button" class="sp-cancel">Peruuta</button><button type="button" class="sp-ok">Ota</button></div>`;
    el.querySelector('img').src = this.icons[s.id] || '';
    const range = el.querySelector('input');
    const upd = () => { el.querySelector('.sp-a').textContent = s.count - +range.value; el.querySelector('.sp-b').textContent = range.value; };
    range.addEventListener('input', upd);
    upd();
    const ok = () => {
      const n = +range.value;
      this._closeSplit();
      const r = this.slotEls[i].getBoundingClientRect();
      this._pick(i, n, r.left + r.width / 2, r.top + r.height / 2);
    };
    el.querySelector('.sp-ok').addEventListener('click', ok);
    el.querySelector('.sp-cancel').addEventListener('click', () => this._closeSplit());
    el.addEventListener('pointerdown', (ev) => ev.stopPropagation());
    this._splitKey = (ev) => {
      if (ev.code === 'Enter') { ev.preventDefault(); ok(); }
      else if (ev.code === 'Escape') { ev.preventDefault(); ev.stopPropagation(); this._closeSplit(); }
    };
    window.addEventListener('keydown', this._splitKey, true);
    const w = 250, h = 120;
    el.style.left = `${Math.min(window.innerWidth - w - 8, Math.max(8, x - w / 2))}px`;
    el.style.top = `${Math.min(window.innerHeight - h - 8, y + 16)}px`;
    el.classList.add('on');
    range.focus();
  }

  _closeSplit() {
    if (!this.splitEl || !this.splitEl.classList.contains('on')) return;
    this.splitEl.classList.remove('on');
    if (this._splitKey) window.removeEventListener('keydown', this._splitKey, true);
    this._splitKey = null;
  }

  // Pieni hypähdys paikassa (siirto, varustus).
  _pop(i) {
    const el = this.slotEls[i];
    if (el) el.animate([{ transform: 'scale(0.9)' }, { transform: 'scale(1.06)' }, { transform: 'scale(1)' }], { duration: 220, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' });
  }

  // --- Työkaluvihje ------------------------------------------------------------
  _tipFor(i) {
    const s = this.inventory.slots[i];
    if (!s || this.held) { this._hideTip(); return; }
    const d = ITEMS[s.id];
    const stats = itemStats(d, s.id);
    const hints = [];
    if (this.inventory.canEquip(s.id)) hints.push(s.eq ? 'Hiiren oikea: riisu' : d.offhand ? 'Hiiren oikea: toiseen käteen' : 'Hiiren oikea: varusta');
    else if (d.food) hints.push('Hiiren oikea: syö');
    hints.push(i < CONFIG.hotbarSize ? 'Shift+klikkaus: reppuun' : 'Shift+klikkaus: pikapalkkiin');
    if (s.count > 1) hints.push('Ctrl+hiiren oikea: jaa pino');
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
    const mk = box.querySelector('.make');
    if (this.crafting) { mk.disabled = true; mk.classList.add('busy'); mk.textContent = 'Valmistetaan…'; }
    mk.addEventListener('click', () => this._craft(r, qty));
  }

  // Valmistus kestää hetken: nappi lukittuu ("Valmistetaan…") ja täyttyy.
  _craft(r, qty) {
    if (this.crafting) return;
    const dur = Math.min(5, CRAFT_TIME + 0.3 * (qty - 1));
    this.crafting = { r, qty, t0: performance.now(), dur };
    const tick = () => {
      const c = this.crafting;
      if (!c || !this.open) return;
      const p = Math.min(1, (performance.now() - c.t0) / (c.dur * 1000));
      const b = this.craftDetail.querySelector('.make');
      if (b) {
        b.disabled = true;
        b.classList.add('busy');
        b.textContent = 'Valmistetaan…';
        b.style.setProperty('--p', p.toFixed(3));
      }
      if (p < 1) { requestAnimationFrame(tick); return; }
      this.crafting = null;
      this._finishCraft(c.r, c.qty);
    };
    requestAnimationFrame(tick);
  }

  _finishCraft(r, qty) {
    let made = 0;
    for (let k = 0; k < qty; k++) {
      if (!this.inventory.craft(r.id, this.stations())) break;
      made++;
    }
    if (made > 0) {
      events.emit('notify', { item: r.out, count: r.count * made });
    } else if (this.inventory.canCraft(r, this.stations())) {
      events.emit('message', { text: 'Reppu on täynnä' });
    }
    this.render();
    const b = this.craftDetail.querySelector('.make');
    if (b && made > 0) b.animate([{ transform: 'scale(0.95)' }, { transform: 'scale(1.03)' }, { transform: 'scale(1)' }], { duration: 240, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' });
  }
}
