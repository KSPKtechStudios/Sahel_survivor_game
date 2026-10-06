// HUD: pikapalkki, tähtäin ja kohteen nimi, kestävyyspalkki, ilmoitukset.
import { CONFIG } from '../config.js';
import { ITEMS } from '../game/items.js';
import { events } from '../game/events.js';

const $ = (id) => document.getElementById(id);

export class Hud {
  constructor(inventory, icons) {
    this.inventory = inventory;
    this.icons = icons;
    this.hotbar = $('hotbar');
    this.targetBox = $('target');
    this.targetName = this.targetBox.querySelector('.name');
    this.targetAction = this.targetBox.querySelector('.action');
    this.targetHp = this.targetBox.querySelector('.hpbar');
    this.targetHpFill = this.targetBox.querySelector('.hpbar i');
    this.stamina = $('stamina');
    this.staminaFill = this.stamina.querySelector('i');
    this.notifyBox = $('notifications');
    this.messageBox = $('message');
    this.itemName = $('item-name');
    this.tint = $('weather-tint');
    this.crosshair = $('crosshair');
    this.messageTimer = 0;
    this.itemNameTimer = 0;
    this.lastSelected = -1;

    this.slots = [];
    for (let i = 0; i < CONFIG.hotbarSize; i++) {
      const el = document.createElement('div');
      el.className = 'slot';
      el.innerHTML = `<span class="key">${i + 1}</span><img alt=""><span class="count"></span>`;
      this.hotbar.appendChild(el);
      this.slots.push(el);
    }

    events.on('inventory', () => this.renderHotbar());
    events.on('notify', (d) => this.notify(d));
    events.on('message', (d) => this.message(d.text));
    this.renderHotbar();
  }

  renderHotbar() {
    const inv = this.inventory;
    for (let i = 0; i < this.slots.length; i++) {
      const el = this.slots[i];
      const s = inv.slots[i];
      const img = el.querySelector('img');
      const count = el.querySelector('.count');
      el.classList.toggle('selected', i === inv.selected);
      if (s) {
        img.src = this.icons[s.id] || '';
        img.style.visibility = 'visible';
        el.title = ITEMS[s.id].name;
        count.textContent = s.count > 1 ? s.count : '';
      } else {
        img.removeAttribute('src');
        img.style.visibility = 'hidden';
        el.title = '';
        count.textContent = '';
      }
    }
    if (inv.selected !== this.lastSelected) {
      this.lastSelected = inv.selected;
      const s = inv.selectedItem;
      if (s) {
        this.itemName.textContent = ITEMS[s.id].name;
        this.itemName.classList.add('show');
        this.itemNameTimer = 1.6;
      } else {
        this.itemName.classList.remove('show');
      }
    }
  }

  notify({ item, count }) {
    const el = document.createElement('div');
    el.className = 'note';
    const sign = count > 0 ? '+' : '−';
    el.innerHTML = `<img src="${this.icons[item] || ''}" alt=""><span>${sign}${Math.abs(count)} ${ITEMS[item].name}</span>`;
    this.notifyBox.appendChild(el);
    while (this.notifyBox.children.length > 6) this.notifyBox.firstChild.remove();
    setTimeout(() => el.classList.add('fade'), 2200);
    setTimeout(() => el.remove(), 3000);
  }

  message(text) {
    this.messageBox.textContent = text;
    this.messageBox.classList.add('show');
    this.messageTimer = 1.8;
  }

  update(dt, { prompt, player, env, visible }) {
    // Kohde
    if (prompt && visible) {
      this.targetBox.classList.add('show');
      this.targetName.textContent = prompt.name;
      this.targetAction.textContent = prompt.action || '';
      this.targetAction.classList.toggle('warn', !!prompt.warn);
      if (prompt.hp != null) {
        this.targetHp.style.display = 'block';
        this.targetHpFill.style.width = `${Math.max(0, prompt.hp) * 100}%`;
      } else {
        this.targetHp.style.display = 'none';
      }
      this.crosshair.classList.add('active');
    } else {
      this.targetBox.classList.remove('show');
      this.crosshair.classList.remove('active');
    }

    // Kestävyys näkyy vain kun se ei ole täynnä (kuten Valheimissa).
    const st = player.stamina / CONFIG.staminaMax;
    this.staminaFill.style.width = `${st * 100}%`;
    this.stamina.classList.toggle('show', st < 0.995);
    this.stamina.classList.toggle('low', st < 0.25);

    if (this.messageTimer > 0) {
      this.messageTimer -= dt;
      if (this.messageTimer <= 0) this.messageBox.classList.remove('show');
    }
    if (this.itemNameTimer > 0) {
      this.itemNameTimer -= dt;
      if (this.itemNameTimer <= 0) this.itemName.classList.remove('show');
    }

    // Sään sävy ja vinjetti (hiekkamyrsky/usva)
    const w = env.w;
    const day = 0.25 + 0.75 * env.daylight;
    const hex = w.tint.getHex(); // sRGB
    const r = (hex >> 16) & 255;
    const g = (hex >> 8) & 255;
    const b = hex & 255;
    const a = (w.haze * 0.16 + w.dust * 0.12) * day;
    this.tint.style.background = `radial-gradient(ellipse at center, rgba(${r},${g},${b},${a * 0.5}) 0%, rgba(${r},${g},${b},${a}) 55%, rgba(${Math.round(r * 0.5)},${Math.round(g * 0.4)},${Math.round(b * 0.3)},${Math.min(0.75, a * 2.6 + 0.12)}) 100%)`;
  }
}
