// HUD: pikapalkki, tähtäin ja kohteen nimi, terveys ja kestävyys, osuma- ja
// hukkumistehosteet, kuolemaruutu, ilmoitukset.
import { CONFIG } from '../config.js';
import { AMMO_ORDER } from '../game/archery.js';
import { ITEMS } from '../game/items.js';
import { events } from '../game/events.js';
import { EFFECTS, MAX_CAP, Survival, foodValues } from '../game/survival.js';

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
    this.numShown = -1;   // näytetty terveysarvo
    this.numT = 0;
    this.stShowT = 0;
    // Syödyt ruoat: oma lasiympyrä jokaiselle ruoalle (avain = ruoka-olio),
    // jotta lisäys ja poisto voidaan animoida.
    this.foodsEl = $('foods');
    this.foodNodes = new Map();
    // Näytetyt arvot pehmenevät kohti todellisia (nopea mutta ei hyppivä).
    this.dHp = 1; this.dHpMax = 1; this.dSt = 1; this.dStMax = 1;
    this.lastHealth = -1;
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
    this.bowDraw = $('bow-draw');
    this.bowDrawFill = this.bowDraw.querySelector('i');
    this.ammoEl = $('ammo');
    this.ammoNum = this.ammoEl.querySelector('span');
    this.ammoShown = -1;
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
      this.trailDelay = 0.45;
      // Pieni, nopea tärähdys ja palkin välähdys (sessio 16).
      const a = Math.min(3, 1 + amount / 12);
      this.hp.animate([
        { transform: 'translateX(0)' }, { transform: `translateX(${-a}px)` }, { transform: `translateX(${a * 0.7}px)` },
        { transform: `translateX(${-a * 0.35}px)` }, { transform: 'translateX(0)' },
      ], { duration: 260, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' });
      this.hpFill.animate([{ filter: 'brightness(1.9)' }, { filter: 'brightness(1)' }], { duration: 340, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' });
    });
    events.on('parry', () => { this.flash = 1; this.showCombatText('Parry!'); });
    events.on('blocked', ({ broken }) => {
      this.flash = Math.max(this.flash, broken ? 0 : 0.35);
      if (broken) this.showCombatText('Torjunta murtui');
    });
    this.renderHotbar();
  }

  // Ruokaympyrät: uudet ponnahtavat esiin, loppuneet kutistuvat pois ja muut
  // liukuvat paikoilleen (FLIP). Lopussa oleva ruoka välkkyy hennosti.
  _syncFoods(foods, visible) {
    const show = visible ? foods.slice(0, MAX_FOODS) : [];
    const nodes = this.foodNodes;
    let changed = show.length !== nodes.size;
    if (!changed) for (const f of show) if (!nodes.has(f)) { changed = true; break; }
    if (changed) {
      const want = new Set(show);
      const first = new Map();
      for (const [f, n] of nodes) if (want.has(f)) first.set(n, n.el.offsetLeft);
      for (const [f, n] of nodes) {
        if (want.has(f)) continue;
        nodes.delete(f);
        const el = n.el;
        el.style.left = `${el.offsetLeft}px`;
        el.style.top = `${el.offsetTop}px`;
        el.style.position = 'absolute';
        el.animate([{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(0.55)' }],
          { duration: visible ? 220 : 0, easing: 'cubic-bezier(0.4, 0, 1, 1)', fill: 'forwards' }).onfinish = () => el.remove();
      }
      for (const f of show) {
        let n = nodes.get(f);
        if (!n) {
          n = this._foodNode(f);
          nodes.set(f, n);
          n.fresh = true;
        }
        this.foodsEl.appendChild(n.el);
      }
      for (const n of nodes.values()) {
        if (n.fresh) {
          n.fresh = false;
          n.el.animate([{ opacity: 0, transform: 'scale(0.4)' }, { opacity: 1, transform: 'scale(1)' }],
            { duration: 380, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' });
        } else if (first.has(n)) {
          const dx = first.get(n) - n.el.offsetLeft;
          if (dx) n.el.animate([{ transform: `translateX(${dx}px)` }, { transform: 'translateX(0)' }], { duration: 260, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' });
        }
      }
    }
    const C = 2 * Math.PI * 16;
    let i = 0;
    for (const f of show) {
      const n = nodes.get(f);
      const p = Math.round(Math.max(0, f.t / f.dur) * 300) / 300;
      if (p !== n.p) { n.p = p; n.arc.style.strokeDasharray = `${(p * C).toFixed(1)} ${C.toFixed(1)}`; }
      n.el.classList.toggle('fading', Survival.weight(f) < 1);
      // Viimeinen minuutti: hento himmenevä välke ja pieni oranssi hehku.
      n.el.classList.toggle('ending', f.t < 60);
      const extra = i === show.length - 1 ? foods.length - show.length : 0;
      if (extra !== n.extra) {
        n.extra = extra;
        n.more.style.display = extra > 0 ? '' : 'none';
        n.more.textContent = extra > 0 ? `+${extra}` : '';
      }
      i++;
    }
  }

  _foodNode(f) {
    const el = document.createElement('div');
    el.className = 'food glass';
    el.innerHTML = '<svg viewBox="0 0 36 36"><circle class="bg" cx="18" cy="18" r="16"/><circle class="arc" cx="18" cy="18" r="16"/></svg><img alt=""><span class="more"></span>';
    const img = el.querySelector('img');
    img.src = this.icons[f.id] || this.icons.fonio_porridge || '';
    const v = foodValues(f.id);
    el.title = v ? `${v.name}: terveys +${v.hp}, kestävyys +${v.st}` : '';
    const more = el.querySelector('.more');
    more.style.display = 'none';
    return { el, img, arc: el.querySelector('.arc'), more, p: -1, extra: 0 };
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

  update(dt, { prompt, player, env, visible, cooldown = 0, archery = null }) {
    // Jousi kädessä: plus-tähtäin, jännityspalkki ja nuolten määrä (sessio 17).
    const sel = this.inventory.selectedItem;
    const bowHeld = !!(visible && sel && ITEMS[sel.id] && ITEMS[sel.id].bow && !player.dead);
    const draw = bowHeld && archery ? archery.draw : 0;
    this.crosshair.classList.toggle('bow', bowHeld);
    if (bowHeld) this.crosshair.style.setProperty('--spread', (1.15 - 0.4 * draw).toFixed(3));
    this.bowDraw.classList.toggle('on', bowHeld && draw > 0.01);
    if (draw > 0.01) this.bowDrawFill.style.width = `${(draw * 100).toFixed(1)}%`;
    this.bowDraw.classList.toggle('full', draw >= 0.999);
    let arrows = 0;
    if (bowHeld) for (const k of AMMO_ORDER) arrows += this.inventory.count(k);
    this.ammoEl.classList.toggle('on', bowHeld);
    if (bowHeld && arrows !== this.ammoShown) {
      if (this.ammoShown >= 0 && arrows < this.ammoShown) {
        this.ammoNum.animate([{ transform: 'translateY(-3px)', opacity: 0.4 }, { transform: 'none', opacity: 1 }], { duration: 200, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' });
      }
      this.ammoShown = arrows;
      this.ammoNum.textContent = arrows;
      this.ammoEl.classList.toggle('empty', arrows === 0);
    }
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

    // Terveys: näytetty arvo seuraa nopeasti (vahinko lähes heti, parannus
    // pehmeämmin); menetetty osa näkyy hetken vaaleana ennen kuin se kutistuu.
    // Palkki vastaa arvoa 100; maksimin yläpuoli on lukittu.
    const ease = (rate) => 1 - Math.exp(-dt * rate);
    const hp = Math.max(0, player.health / MAX_CAP);
    const hpMax = player.maxHealth / MAX_CAP;
    if (this.lastHealth < 0) { this.dHp = hp; this.trail = hp; this.dHpMax = hpMax; }
    this.dHp += (hp - this.dHp) * ease(hp < this.dHp ? 32 : 9);
    this.dHpMax += (hpMax - this.dHpMax) * ease(8);
    if (this.trailDelay > 0) this.trailDelay -= dt;
    else this.trail += (this.dHp - this.trail) * ease(7);
    if (this.trail < this.dHp) this.trail = this.dHp;
    // Parannus (syöminen, voide): hento hehku palkissa.
    if (this.lastHealth >= 0 && player.health > this.lastHealth + 1.5 && visible) {
      this.hpFill.animate([{ filter: 'brightness(1.45) saturate(1.15)' }, { filter: 'brightness(1)' }], { duration: 520, easing: 'ease-out' });
    }
    this.lastHealth = player.health;
    this.hpFill.style.width = `${(this.dHp * 100).toFixed(2)}%`;
    this.hpTrail.style.width = `${(this.trail * 100).toFixed(2)}%`;
    this.hpLock.style.width = `${((1 - this.dHpMax) * 100).toFixed(2)}%`;
    const rel = player.health / Math.max(1, player.maxHealth);
    this.hp.classList.toggle('low', rel < 0.25 && !player.dead);
    // Numero on himmeä; kirkastuu hetkeksi, kun terveys muuttuu (isompi
    // muutos myös hypähtää).
    const hpInt = Math.ceil(player.health);
    if (hpInt !== this.numShown) {
      if (this.numShown >= 0 && visible) {
        this.hpNum.classList.toggle('down', hpInt < this.numShown);
        this.hpNum.classList.toggle('up', hpInt > this.numShown);
        this.hpNum.classList.add('flash');
        this.numT = 1.6;
        if (Math.abs(hpInt - this.numShown) >= 2) {
          this.hpNum.animate([{ transform: 'scale(1.25)' }, { transform: 'scale(1)' }], { duration: 260, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' });
        }
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
    this.dSt += (player.stamina / MAX_CAP - this.dSt) * ease(22);
    this.dStMax += (stMax - this.dStMax) * ease(8);
    this.staminaFill.style.width = `${(this.dSt * 100).toFixed(2)}%`;
    this.staminaLock.style.width = `${((1 - this.dStMax) * 100).toFixed(2)}%`;
    this.staminaNotch.style.left = `${(this.dStMax * 50).toFixed(2)}%`;
    if (stRel < 0.995 && visible) this.stShowT = 1.1;
    else this.stShowT = Math.max(0, this.stShowT - dt);
    this.stamina.classList.toggle('shown', this.stShowT > 0);
    this.stamina.classList.toggle('low', stRel < 0.25);
    this.stamina.classList.toggle('nocombo', stRel <= 0.5 && stRel >= 0.25);
    this.stamina.classList.toggle('out', stRel <= 0.001 && player.inWater === 2);

    // Syödyt ruoat ja tilavaikutukset
    if (this.survival) {
      this._syncFoods(this.survival.foods, visible);
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
