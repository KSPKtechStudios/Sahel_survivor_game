// HUD: pikapalkki, tähtäin ja kohteen nimi, terveys ja kestävyys, osuma- ja
// hukkumistehosteet, kuolemaruutu, ilmoitukset.
import { CONFIG } from '../config.js';
import { ITEMS } from '../game/items.js';
import { events } from '../game/events.js';
import { EFFECTS, MAX_CAP, Survival, foodValues } from '../game/survival.js';
import { barFrame, woodDisc } from './woodArt.js';

// Palkin kehyksen mitat (CSS px, vastaa styles.css:n .vital .frame / .well).
const HP_FRAME = { W: 30, H: 250, k: 1.25, well: { x: 11, y: 33, w: 8, h: 157 }, rope: [[17, 5.6], [197.5, 5.6]], rivets: [[15, 23], [15, 194.4]], iconY: 220, icon: 'blood' };
// Kestävyys piirretään pystyyn ja käännetään vaakaan (ikoni vasemmalle).
const ST_FRAME = { W: 24, H: 230, k: 1, well: { x: 9, y: 26, w: 6, h: 156 }, rope: [[13.5, 4.5], [188, 4.5]], rivets: [[12, 18.5], [12, 185.5]], iconY: 206, icon: 'foot', horizontal: true };
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
    this.staminaFill = this.stamina.querySelector('.well i');
    this.staminaLock = this.stamina.querySelector('.lock');
    this.staminaNotch = this.stamina.querySelector('.notch');
    this.hp = document.querySelector('.vital.hp');
    this.hpFill = this.hp.querySelector('.well i');
    this.hpTrail = this.hp.querySelector('.well b');
    this.hpLock = this.hp.querySelector('.lock');
    // Puiset kehykset ja ikonikiekot (piirretään kerran).
    this.hp.querySelector('.frame').style.backgroundImage = `url(${barFrame(HP_FRAME, 3)})`;
    this.stamina.querySelector('.frame').style.backgroundImage = `url(${barFrame(ST_FRAME, 8)})`;
    this.hpPop = this.hp.querySelector('.pop');
    this.popShown = -1;   // näytetty terveysarvo
    this.popT = 0;
    this.stShowT = 0;
    // Syödyt ruoat: kiinteä joukko kiekkoja.
    this.foodsEl = $('foods');
    this.foodEls = [];
    for (let i = 0; i < MAX_FOODS; i++) {
      const el = document.createElement('div');
      el.className = 'food';
      el.innerHTML = '<div class="ring"></div><div class="disc"></div><img alt=""><span class="more"></span>';
      el.querySelector('.disc').style.backgroundImage = `url(${woodDisc(30, 60 + i, 4)})`;
      el.style.display = 'none';
      this.foodsEl.appendChild(el);
      this.foodEls.push({ el, img: el.querySelector('img'), more: el.querySelector('.more'), id: null });
    }
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
    this.hpFill.style.height = `${hp * 100}%`;
    this.hpTrail.style.height = `${this.trail * 100}%`;
    this.hpLock.style.height = `${(1 - hpMax) * 100}%`;
    const rel = player.health / Math.max(1, player.maxHealth);
    this.hp.classList.toggle('low', rel < 0.25 && !player.dead);
    // Numero vain, kun terveys muuttuu (osuma, syöminen, parantuminen).
    const hpInt = Math.ceil(player.health);
    if (this.popShown < 0) this.popShown = hpInt;
    if (hpInt !== this.popShown && visible) {
      this.hpPop.textContent = hpInt;
      this.hpPop.classList.toggle('down', hpInt < this.popShown);
      this.hpPop.classList.toggle('up', hpInt > this.popShown);
      this.hpPop.classList.add('show');
      this.popShown = hpInt;
      this.popT = 1.6;
    }
    if (this.popT > 0) {
      this.popT -= dt;
      this.hpPop.style.top = `${(33 + 157 * (1 - hp)).toFixed(1)}px`;
      if (this.popT <= 0) this.hpPop.classList.remove('show');
    }

    // Kestävyys (vaakapalkki keskellä): näkyy vain kun sitä kuluu.
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
        fe.el.style.setProperty('--p', Math.max(0, f.t / f.dur).toFixed(3));
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
