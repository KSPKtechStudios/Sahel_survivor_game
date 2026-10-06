// HUD: pikapalkki, tähtäin ja kohteen nimi, terveys ja kestävyys, osuma- ja
// hukkumistehosteet, kuolemaruutu, ilmoitukset.
import { CONFIG } from '../config.js';
import { ITEMS } from '../game/items.js';
import { events } from '../game/events.js';

const $ = (id) => document.getElementById(id);

// Kuinka kauan kuolemaruutu näkyy ennen kuin voi herätä (s).
export const RESPAWN_WAIT = 1.8;
const DEATH_TEXT = {
  '': 'Voimasi loppuivat.',
  drown: 'Hukuit. Uidessa kestävyys kuluu: lepää rannalla ajoissa.',
  warthog: 'Pahkasika puski sinut kumoon.',
  clay: 'Savipeikot saivat sinut.',
};

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
    this.hp = document.querySelector('.vital.hp');
    this.hpFill = this.hp.querySelector('.bar i');
    this.hpTrail = this.hp.querySelector('.bar b');
    this.hpNum = this.hp.querySelector('.num');
    this.hurtEl = $('hurt');
    this.drownEl = $('drown');
    this.flashEl = $('flash');
    this.combatText = $('combat-text');
    this.death = $('death');
    this.deathCause = this.death.querySelector('.cause');
    this.deathHint = this.death.querySelector('.hint');
    this.trail = 1;        // terveyspalkin viivästetty osa
    this.trailDelay = 0;
    this.hurtFlash = 0;
    this.flash = 0;
    this.combatTextTimer = 0;
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
    events.on('playerHurt', ({ amount }) => {
      this.hurtFlash = Math.min(1, Math.max(this.hurtFlash, 0.35 + amount / 25));
      this.trailDelay = 0.55;
    });
    events.on('parry', () => { this.flash = 1; this.showCombatText('Parry!'); });
    events.on('blocked', ({ broken }) => {
      this.flash = Math.max(this.flash, broken ? 0 : 0.35);
      if (broken) this.showCombatText('Torjunta murtui');
    });
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
      el.classList.toggle('equipped', !!(s && s.eq));
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

  showCombatText(text) {
    this.combatText.textContent = text;
    this.combatText.classList.add('show');
    this.combatTextTimer = 0.7;
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

    // Terveys: menetetty osa näkyy hetken vaaleana ennen kuin se kutistuu.
    const hp = Math.max(0, player.health / CONFIG.healthMax);
    if (this.trailDelay > 0) this.trailDelay -= dt;
    else this.trail += (hp - this.trail) * Math.min(1, dt * 5);
    if (this.trail < hp) this.trail = hp;
    this.hpFill.style.width = `${hp * 100}%`;
    this.hpTrail.style.width = `${this.trail * 100}%`;
    this.hpNum.textContent = Math.ceil(player.health);
    this.hp.classList.toggle('low', hp < 0.25 && !player.dead);

    // Kestävyys: himmeä, kun täynnä.
    const st = player.stamina / CONFIG.staminaMax;
    this.staminaFill.style.width = `${st * 100}%`;
    this.stamina.classList.toggle('full', st >= 0.995);
    this.stamina.classList.toggle('low', st < 0.25);
    this.stamina.classList.toggle('nocombo', st <= 0.5 && st >= 0.25);
    this.stamina.classList.toggle('out', st <= 0.001 && player.inWater === 2);

    // Osuma (punainen reunus), matala terveys sykkii, hukkuminen (sininen).
    this.hurtFlash = Math.max(0, this.hurtFlash - dt * 1.6);
    const lowPulse = hp < 0.3 && !player.dead ? (0.18 + 0.12 * Math.sin(performance.now() * 0.006)) * (1 - hp / 0.3) : 0;
    this.hurtEl.style.opacity = Math.min(1, this.hurtFlash + lowPulse).toFixed(3);
    this.drownEl.style.opacity = (player.drowning * (0.75 + 0.25 * Math.sin(performance.now() * 0.005))).toFixed(3);
    this.flash = Math.max(0, this.flash - dt * 4);
    this.flashEl.style.opacity = this.flash.toFixed(3);
    if (this.combatTextTimer > 0) {
      this.combatTextTimer -= dt;
      if (this.combatTextTimer <= 0) this.combatText.classList.remove('show');
    }

    // Kuolemaruutu
    if (player.dead && visible) {
      if (this.death.classList.contains('hidden')) {
        this.death.classList.remove('hidden');
        this.deathCause.textContent = DEATH_TEXT[player.deathCause] || DEATH_TEXT[''];
      }
      this.deathHint.classList.toggle('show', player.deathT > RESPAWN_WAIT);
    } else if (!this.death.classList.contains('hidden')) {
      this.death.classList.add('hidden');
      this.deathHint.classList.remove('show');
    }

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
