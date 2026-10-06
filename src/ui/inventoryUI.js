// Reppu- ja valmistusikkuna [Tab]. Esineitä siirretään klikkaamalla:
// ensimmäinen klikkaus nostaa pinon, toinen laskee sen (tai vaihtaa paikkaa).
// Hiiren oikea kilven päällä varustaa / riisuu sen.
import { CONFIG } from '../config.js';
import { ITEMS, RECIPES } from '../game/items.js';
import { events } from '../game/events.js';

export class InventoryUI {
  constructor(inventory, icons) {
    this.inventory = inventory;
    this.icons = icons;
    this.root = document.getElementById('inventory');
    this.grid = document.getElementById('inv-grid');
    this.recipes = document.getElementById('recipes');
    this.info = document.getElementById('inv-info');
    this.cursor = document.getElementById('drag-cursor');
    this.open = false;
    this.held = -1; // nostetun pinon paikka

    this.slotEls = [];
    for (let i = 0; i < inventory.size; i++) {
      const el = document.createElement('div');
      el.className = 'slot' + (i < CONFIG.hotbarSize ? ' hot' : '');
      el.innerHTML = `${i < CONFIG.hotbarSize ? `<span class="key">${i + 1}</span>` : ''}<img alt=""><span class="count"></span>`;
      el.addEventListener('click', () => this.clickSlot(i));
      el.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        const s = this.inventory.slots[i];
        if (s && ITEMS[s.id].shield && this.held < 0) {
          this.inventory.toggleEquip(i);
          this.showInfo(i);
        }
      });
      el.addEventListener('mouseenter', () => this.showInfo(i));
      el.addEventListener('mouseleave', () => this.showInfo(-1));
      this.grid.appendChild(el);
      this.slotEls.push(el);
    }
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

  showInfo(i) {
    const s = i >= 0 ? this.inventory.slots[i] : null;
    if (s) {
      const d = ITEMS[s.id];
      this.info.innerHTML = `<b></b><span></span>`;
      this.info.querySelector('b').textContent = d.name + (s.eq ? ' (varustettu)' : '');
      this.info.querySelector('span').textContent = (d.desc || '') + (d.shield ? (s.eq ? ' Hiiren oikea: riisu.' : ' Hiiren oikea: varusta.') : '');
    } else {
      this.info.innerHTML = '<span class="muted">Klikkaa esinettä siirtääksesi sitä. Ylin rivi on pikapalkki.</span>';
    }
  }

  render() {
    const inv = this.inventory;
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

    this.recipes.innerHTML = '';
    for (const r of RECIPES) {
      const can = inv.canCraft(r);
      const card = document.createElement('div');
      card.className = 'recipe' + (can ? ' can' : '');
      const reqs = Object.entries(r.need)
        .map(([id, n]) => {
          const have = inv.count(id);
          return `<span class="req ${have >= n ? 'ok' : 'miss'}" title="${ITEMS[id].name}"><img src="${this.icons[id] || ''}" alt="">${Math.min(have, 999)}/${n}</span>`;
        })
        .join('');
      card.innerHTML = `
        <img class="ricon" src="${this.icons[r.out] || ''}" alt="">
        <div class="rbody"><div class="rname">${ITEMS[r.out].name}</div><div class="reqs">${reqs}</div></div>
        <button ${can ? '' : 'disabled'}>Valmista</button>`;
      card.querySelector('button').addEventListener('click', () => {
        if (inv.craft(r.id)) {
          events.emit('notify', { item: r.out, count: r.count });
          card.classList.add('crafted');
        } else if (inv.canCraft(r)) {
          events.emit('message', { text: 'Reppu on täynnä' });
        }
      });
      this.recipes.appendChild(card);
    }
  }
}
