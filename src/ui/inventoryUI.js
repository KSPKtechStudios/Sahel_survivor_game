// Reppu- ja valmistusikkuna [Tab]. Esineitä siirretään klikkaamalla:
// ensimmäinen klikkaus nostaa pinon, toinen laskee sen (tai vaihtaa paikkaa).
// Hiiren oikea: kilpi varustetaan / riisutaan, ruoka syödään.
// Valmistus on jaettu välilehtiin; osa resepteistä vaatii lähelle
// työstöpenkin tai nuotion.
import { CONFIG } from '../config.js';
import { ITEMS, RECIPES, STATIONS, CATEGORIES, TAG_NAMES, tagged } from '../game/items.js';
import { events } from '../game/events.js';
import { itemStats } from '../game/survival.js';

export class InventoryUI {
  // stations() palauttaa lähellä olevat valmistuspaikat (Set), use(i) käyttää
  // paikan esineen (syö / juo).
  constructor(inventory, icons, { stations = () => new Set(), use = () => false } = {}) {
    this.inventory = inventory;
    this.icons = icons;
    this.stations = stations;
    this.use = use;
    this.root = document.getElementById('inventory');
    this.grid = document.getElementById('inv-grid');
    this.recipes = document.getElementById('recipes');
    this.info = document.getElementById('inv-info');
    this.cursor = document.getElementById('drag-cursor');
    this.open = false;
    this.held = -1; // nostetun pinon paikka
    this.tab = 'all';
    this.near = new Set();

    this.slotEls = [];
    for (let i = 0; i < inventory.size; i++) {
      const el = document.createElement('div');
      el.className = 'slot' + (i < CONFIG.hotbarSize ? ' hot' : '');
      el.innerHTML = `${i < CONFIG.hotbarSize ? `<span class="key">${i + 1}</span>` : ''}<img alt=""><span class="count"></span>`;
      el.addEventListener('click', () => this.clickSlot(i));
      el.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        const s = this.inventory.slots[i];
        if (!s || this.held >= 0) return;
        const d = ITEMS[s.id];
        if (d.shield) this.inventory.toggleEquip(i);
        else if (d.food) this.use(i);
        this.showInfo(i);
      });
      el.addEventListener('mouseenter', () => this.showInfo(i));
      el.addEventListener('mouseleave', () => this.showInfo(-1));
      this.grid.appendChild(el);
      this.slotEls.push(el);
    }

    // Välilehdet valmistuslistan yläpuolelle
    this.tabs = document.createElement('div');
    this.tabs.id = 'recipe-tabs';
    for (const [key, label] of CATEGORIES) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = label;
      b.dataset.tab = key;
      b.addEventListener('click', () => { this.tab = key; this.render(); });
      this.tabs.appendChild(b);
    }
    this.stationLine = document.createElement('div');
    this.stationLine.id = 'station-line';
    this.recipes.parentNode.insertBefore(this.tabs, this.recipes);
    this.recipes.parentNode.insertBefore(this.stationLine, this.recipes);

    window.addEventListener('mousemove', (e) => {
      if (this.held >= 0) {
        this.cursor.style.left = `${e.clientX}px`;
        this.cursor.style.top = `${e.clientY}px`;
      }
    });

    events.on('inventory', () => { if (this.open) this.render(); });
  }

  show() {
    this.open = true;
    this.root.classList.remove('hidden');
    this.render();
  }

  hide() {
    this.open = false;
    this.held = -1;
    this.cursor.style.display = 'none';
    this.root.classList.add('hidden');
  }

  clickSlot(i) {
    if (this.held < 0) {
      if (!this.inventory.slots[i]) return;
      this.held = i;
      this.cursor.style.display = 'block';
      this.cursor.querySelector('img').src = this.icons[this.inventory.slots[i].id] || '';
    } else {
      this.inventory.moveSlot(this.held, i);
      this.held = -1;
      this.cursor.style.display = 'none';
    }
    this.render();
  }

  _describe(id, extra = '') {
    const d = ITEMS[id];
    this.info.innerHTML = '<b></b><span></span><em></em>';
    this.info.querySelector('b').textContent = d.name + extra;
    this.info.querySelector('span').textContent = d.desc || '';
    this.info.querySelector('em').textContent = itemStats(d, id);
  }

  showInfo(i) {
    const s = i >= 0 ? this.inventory.slots[i] : null;
    if (s) {
      const d = ITEMS[s.id];
      this._describe(s.id, s.eq ? ' (varustettu)' : '');
      const hint = d.shield ? (s.eq ? ' Hiiren oikea: riisu.' : ' Hiiren oikea: varusta.') : d.food ? ' Hiiren oikea: syö.' : '';
      if (hint) this.info.querySelector('span').textContent += hint;
    } else {
      this.info.innerHTML = '<span class="muted">Klikkaa esinettä siirtääksesi sitä. Ylin rivi on pikapalkki. Hiiren oikea: syö / varusta.</span>';
    }
  }

  render() {
    const inv = this.inventory;
    this.near = this.stations();
    inv.slots.forEach((s, i) => {
      const el = this.slotEls[i];
      const img = el.querySelector('img');
      el.classList.toggle('held', i === this.held);
      el.classList.toggle('selected', i === inv.selected);
      el.classList.toggle('equipped', !!(s && s.eq));
      if (s) {
        img.src = this.icons[s.id] || '';
        img.style.visibility = 'visible';
        el.querySelector('.count').textContent = s.count > 1 ? s.count : '';
      } else {
        img.removeAttribute('src');
        img.style.visibility = 'hidden';
        el.querySelector('.count').textContent = '';
      }
    });
    this.showInfo(-1);

    for (const b of this.tabs.children) b.classList.toggle('on', b.dataset.tab === this.tab);
    const names = Object.entries(STATIONS).map(([k, st]) => `<span class="${this.near.has(k) ? 'ok' : 'miss'}">${st.name}${this.near.has(k) ? ' lähellä' : ' ei lähellä'}</span>`);
    this.stationLine.innerHTML = names.join(' · ');

    const scroll = this.recipes.scrollTop;
    this.recipes.innerHTML = '';
    const list = RECIPES.filter((r) => this.tab === 'all' || (ITEMS[r.out].cat || 'material') === this.tab);
    // Valmistettavissa olevat ensin
    list.sort((a, b) => (inv.canCraft(b, this.near) ? 1 : 0) - (inv.canCraft(a, this.near) ? 1 : 0));
    for (const r of list) {
      const can = inv.canCraft(r, this.near);
      const stationOk = !r.station || this.near.has(r.station);
      const card = document.createElement('div');
      card.className = 'recipe' + (can ? ' can' : '') + (stationOk ? '' : ' far');
      const reqs = Object.entries(r.need)
        .map(([id, n]) => {
          const have = inv.count(id);
          const icon = id[0] === '#' ? tagged(id.slice(1))[0] : id;
          const title = id[0] === '#' ? TAG_NAMES[id.slice(1)] : ITEMS[id].name;
          return `<span class="req ${have >= n ? 'ok' : 'miss'}" title="${title}"><img src="${this.icons[icon] || ''}" alt="">${Math.min(have, 999)}/${n}</span>`;
        })
        .join('');
      const st = r.station ? `<div class="rstation ${stationOk ? 'ok' : 'miss'}">${STATIONS[r.station].name}</div>` : '';
      card.innerHTML = `
        <img class="ricon" src="${this.icons[r.out] || ''}" alt="">
        <div class="rbody"><div class="rname">${ITEMS[r.out].name}${r.count > 1 ? ` ×${r.count}` : ''}</div><div class="reqs">${reqs}</div>${st}</div>
        <button ${can ? '' : 'disabled'}>Valmista</button>`;
      card.addEventListener('mouseenter', () => this._describe(r.out));
      card.addEventListener('mouseleave', () => this.showInfo(-1));
      card.querySelector('button').addEventListener('click', () => {
        if (inv.craft(r.id, this.stations())) {
          events.emit('notify', { item: r.out, count: r.count });
          card.classList.add('crafted');
        } else if (inv.canCraft(r, this.stations())) {
          events.emit('message', { text: 'Reppu on täynnä' });
        }
      });
      this.recipes.appendChild(card);
    }
    this.recipes.scrollTop = scroll;
  }
}
