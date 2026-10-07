// HUD: pikapalkki, tähtäin ja kohteen nimi, terveys ja kestävyys, osuma- ja
// hukkumistehosteet, kuolemaruutu, ilmoitukset.
import { CONFIG } from '../config.js';
import { ITEMS } from '../game/items.js';
import { events } from '../game/events.js';
import { EFFECTS, MAX_CAP, Survival, foodValues } from '../game/survival.js';
import { woodPanel } from './woodArt.js';

const MAX_FOODS = 4;

const $ = (id) => document.getElementById(id);

// Kuinka kauan kuolemaruutu näkyy ennen kuin voi herätä (s).
export const RESPAWN_WAIT = 1.8;
const DEATH_TEXT = {
  '': 'Voimasi loppuivat.',
  drown: 'Hukuit. Uidessa kestävyys kuluu: lepää rannalla ajoissa.',
  warthog: 'Pahkasika puski sinut kumoon.',
  clay: 'Savipeikot saivat sinut.',
  haamu: 'Haamu syöksyi kimppuusi latvusten pimeydestä. Nuotion valo pitää haamut loitolla.',
  starve: 'Nääntyit nälkään. Syö ajoissa: marjat, hedelmät ja paistettu liha täyttävät.',
};

export class Hud {
  constructor(inventory, icons, survival = null) {
    this.inventory = inventory;
    this.icons = icons;
    this.survival = survival;
    this.effectsEl = $('effects');
    this.poisonEl = $('poison');
    this.effectEls = {};
    this.hotbar = $('hotbar');
    this.targetBox = $('target');
    this.targetName = this.targetBox.querySelector('.name');
    this.targetAction = this.targetBox.querySelector('.action');
    this.targetHp = this.targetBox.querySelector('.hpbar');
    this.targetHpFill = this.targetBox.querySelector('.hpbar i');
    this.stamina = $('stamina');
    this.staminaFill = this.stamina.querySelector('.bar i');
    this.staminaLock = this.stamina.querySelector('.lock');
    this.staminaNotch = this.stamina.querySelector('.notch');
    this.hp = document.querySelector('.vital.hp');
    this.hpFill = this.hp.querySelector('.bar i');
    this.hpTrail = this.hp.querySelector('.bar b');
    this.hpLock = this.hp.querySelector('.lock');
    this.hpNum = this.hp.querySelector('.num');
    // Puiset kyltit ikoneille (piirretään kerran).
    this.hp.querySelector('.tag').style.backgroundImage = `url(${woodPanel(46, 46, { seed: 8, r: 8 })})`;
    this.stamina.querySelector('.tag').style.backgroundImage = `url(${woodPanel(26, 22, { seed: 6, r: 6 })})`;
    this.numShown = -1;   // näytetty terveysarvo
    this.numT = 0;
    this.stShowT = 0;
    // Syödyt ruoat: kiinteä joukko lasiympyröitä.
    this.foodsEl = $('foods');
    this.foodEls = [];
    const C = 2 * Math.PI * 16;
    for (let i = 0; i < MAX_FOODS; i++) {
      const el = document.createElement('div');
      el.className = 'food glass';
      el.innerHTML = '<svg viewBox="0 0 36 36"><circle class="bg" cx="18" cy="18" r="16"/><circle class="arc" cx="18" cy="18" r="16"/></svg><img alt=""><span class="more"></span>';
      el.style.display = 'none';
      this.foodsEl.appendChild(el);
      const arc = el.querySelector('.arc');
      arc.style.strokeDasharray = `0 ${C.toFixed(1)}`;
      this.foodEls.push({ el, img: el.querySelector('img'), arc, more: el.querySelector('.more'), id: null, p: -1 });
    }
    this.foodCirc = C;
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
    events.on('effects', () => this.renderEffects());
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

  // Tilavaikutukset pikapalkin yläpuolella (nimi ja jäljellä oleva aika).
  renderEffects() {
    if (!this.survival) return;
    const fx = this.survival.effects;
    for (const k of Object.keys(this.effectEls)) {
      if (!fx[k]) { this.effectEls[k].remove(); delete this.effectEls[k]; }
    }
    for (const k of Object.keys(fx)) {
      if (this.effectEls[k]) continue;
      const def = EFFECTS[k];
      const el = document.createElement('div');
      el.className = 'effect ' + (def.bad ? 'bad' : 'good');
      el.innerHTML = `<span></span><i><b></b></i>`;
      el.querySelector('span').textContent = def.name;
      this.effectsEl.appendChild(el);
      this.effectEls[k] = el;
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

  update(dt, { prompt, player, env, visible, cooldown = 0 }) {
    // Iskun jäähdytys: tähtäin himmenee, kunnes voi lyödä uudelleen.
    this.crosshair.classList.toggle('cooldown', cooldown > 0.02);
    // Kohde
    // Olennon nimilappu on olennon päällä (nameplates.js), ei tähtäimen alla.
    if (prompt && visible && !prompt.mob) {
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
      this.crosshair.classList.toggle('active', !!(prompt && visible));
    }

    // Terveys: menetetty osa näkyy hetken vaaleana ennen kuin se kutistuu.
    // Kehys vastaa arvoa 100; maksimin yläpuoli on lukittu.
    const hp = Math.max(0, player.health / MAX_CAP);
    const hpMax = player.maxHealth / MAX_CAP;
    if (this.trailDelay > 0) this.trailDelay -= dt;
    else this.trail += (hp - this.trail) * Math.min(1, dt * 5);
    if (this.trail < hp) this.trail = hp;
    this.hpFill.style.width = `${hp * 100}%`;
    this.hpTrail.style.width = `${this.trail * 100}%`;
    this.hpLock.style.width = `${(1 - hpMax) * 100}%`;
    const rel = player.health / Math.max(1, player.maxHealth);
    this.hp.classList.toggle('low', rel < 0.25 && !player.dead);
    // Numero on himmeä; kirkastuu hetkeksi, kun terveys muuttuu.
    const hpInt = Math.ceil(player.health);
    if (hpInt !== this.numShown) {
      if (this.numShown >= 0 && visible) {
        this.hpNum.classList.toggle('down', hpInt < this.numShown);
        this.hpNum.classList.toggle('up', hpInt > this.numShown);
        this.hpNum.classList.add('flash');
        this.numT = 1.6;
      }
      this.hpNum.textContent = hpInt;
      this.numShown = hpInt;
    }
    if (this.numT > 0) {
      this.numT -= dt;
      if (this.numT <= 0) this.hpNum.classList.remove('flash');
    }

    // Kestävyys (keskellä): näkyy vain kun sitä kuluu.
    const stMax = player.maxStamina / MAX_CAP;
    const stRel = player.stamina / Math.max(1, player.maxStamina);
    this.staminaFill.style.width = `${(player.stamina / MAX_CAP) * 100}%`;
    this.staminaLock.style.width = `${(1 - stMax) * 100}%`;
    this.staminaNotch.style.left = `${stMax * 50}%`;
    if (stRel < 0.995 && visible) this.stShowT = 1.2;
    else this.stShowT = Math.max(0, this.stShowT - dt);
    this.stamina.classList.toggle('shown', this.stShowT > 0);
    this.stamina.classList.toggle('low', stRel < 0.25);
    this.stamina.classList.toggle('nocombo', stRel <= 0.5 && stRel >= 0.25);
    this.stamina.classList.toggle('out', stRel <= 0.001 && player.inWater === 2);

    // Syödyt ruoat ja tilavaikutukset
    if (this.survival) {
      const foods = this.survival.foods;
      for (let i = 0; i < MAX_FOODS; i++) {
        const f = foods[i];
        const fe = this.foodEls[i];
        if (!f || !visible) { if (fe.el.style.display !== 'none') fe.el.style.display = 'none'; continue; }
        if (fe.el.style.display === 'none') fe.el.style.display = '';
        if (fe.id !== f.id) {
          fe.id = f.id;
          fe.img.src = this.icons[f.id] || this.icons.fonio_porridge || '';
          const v = foodValues(f.id);
          fe.el.title = v ? `${v.name}: terveys +${v.hp}, kestävyys +${v.st}` : '';
        }
        const p = Math.round(Math.max(0, f.t / f.dur) * 200) / 200;
        if (p !== fe.p) { fe.p = p; fe.arc.style.strokeDasharray = `${(p * this.foodCirc).toFixed(1)} ${this.foodCirc.toFixed(1)}`; }
        fe.el.classList.toggle('fading', Survival.weight(f) < 1);
        const extra = i === MAX_FOODS - 1 ? foods.length - MAX_FOODS : 0;
        fe.more.style.display = extra > 0 ? '' : 'none';
        if (extra > 0) fe.more.textContent = `+${extra}`;
      }
      for (const [k, el] of Object.entries(this.effectEls)) {
        const e = this.survival.effects[k];
        if (e) el.querySelector('b').style.width = `${Math.max(0, e.t / e.max) * 100}%`;
      }
      const poison = this.survival.effects.poison;
      const pk = poison && !player.dead ? 0.55 + 0.3 * Math.sin(performance.now() * 0.0025) : 0;
      this.poisonEl.style.opacity = pk.toFixed(3);
    }

    // Osuma (punainen reunus), matala terveys sykkii, hukkuminen (sininen).
    this.hurtFlash = Math.max(0, this.hurtFlash - dt * 1.6);
    const lowPulse = rel < 0.3 && !player.dead ? (0.18 + 0.12 * Math.sin(performance.now() * 0.006)) * (1 - rel / 0.3) : 0;
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
