// Selviytyminen: ravinto (nälkä), syöminen ja tilavaikutukset.
//
// Ravinto vähenee hitaasti (juostessa nopeammin). Kylläisenä terveys palautuu
// normaalisti, nälkäisenä hitaasti ja kestävyyskin hitaammin; tyhjällä
// vatsalla terveys hupenee. Ruoat täyttävät eri verran: sienet ja raaka liha
// ovat huonoa ruokaa, ja niistä voi saada myrkytyksen. Myrkytys vie terveyttä
// (ei kuitenkaan tapa yksinään) ja hidastaa palautumista.
//
// HUOM: arvot ovat prototyypin paikkamerkkejä (ks. docs/DESIGN.md).
import { CONFIG } from '../config.js';
import { ITEMS } from './items.js';
import { events } from './events.js';

export const HUNGER_MAX = 100;
const HUNGER_DRAIN = HUNGER_MAX / (34 * 60); // täydestä tyhjään noin 34 minuutissa
const STARVE_DPS = 0.5;                      // terveyttä sekunnissa tyhjällä vatsalla
const POISON_DPS = 0.45;                     // myrkytyksen vahinko (kerrotaan voimakkuudella)
const POISON_FLOOR = 4;                      // myrkytys ei vie terveyttä tämän alle

export const EFFECTS = {
  poison: { name: 'Myrkytys', bad: true },
  energized: { name: 'Virkeä' },
  salve: { name: 'Haavavoide' },
  hungry: { name: 'Nälkä', bad: true },
};

// Esineen tiedot tekstinä (reppu ja valmistus).
export function itemStats(d) {
  const parts = [];
  const f = d.food;
  if (f) {
    if (f.hunger) parts.push(`Ravinto +${f.hunger}`);
    if (f.heal) parts.push(`Terveys +${f.heal}`);
    if (f.regen) parts.push(`Terveys +${f.regen} vähitellen`);
    if (f.stamina) parts.push(`Kestävyys +${f.stamina}`);
    if (f.effect === 'energized') parts.push('Virkistää');
    if (f.cure >= 1) parts.push('Parantaa myrkytyksen');
    else if (f.cure) parts.push('Lievittää myrkytystä');
    if (f.poison) parts.push(`Myrkytysriski ${Math.round(f.poison * 100)} %`);
  }
  if (d.ammo) parts.push(`Vahinko ${d.ammo.dmg}`);
  if (d.bow) parts.push(`Voima ×${d.bow.power}`);
  if (d.tool === 'axe' || d.tool === 'pickaxe') parts.push(`Teho ×${d.damage || 1}`);
  return parts.join(' · ');
}

export class Survival {
  constructor(player) {
    this.player = player;
    this.hunger = HUNGER_MAX;
    this.effects = {}; // avain -> { t: jäljellä (s), max, power }
    this.starveMsgT = 0;
  }

  reset(hunger = HUNGER_MAX) {
    this.hunger = hunger;
    this.effects = {};
    events.emit('effects');
  }

  has(key) {
    return !!this.effects[key];
  }

  add(key, seconds, power = 1) {
    const e = this.effects[key];
    if (e) {
      e.t = Math.max(e.t, seconds);
      e.max = Math.max(e.max, e.t);
      e.power = Math.max(e.power, power);
    } else {
      this.effects[key] = { t: seconds, max: seconds, power };
    }
    events.emit('effects');
  }

  update(dt) {
    const p = this.player;
    if (p.dead || dt <= 0) return;
    if (p.god) this.hunger = HUNGER_MAX;
    const drain = HUNGER_DRAIN * (p.sprinting ? 1.7 : 1) * (p.inWater === 2 ? 1.4 : 1);
    this.hunger = Math.max(0, this.hunger - drain * dt);

    let changed = false;
    for (const [k, e] of Object.entries(this.effects)) {
      e.t -= dt;
      if (e.t <= 0) { delete this.effects[k]; changed = true; }
    }
    if (changed) events.emit('effects');

    const poison = this.effects.poison;
    if (poison && p.health > POISON_FLOOR) {
      p.health = Math.max(POISON_FLOOR, p.health - POISON_DPS * poison.power * dt);
    }
    if (this.hunger <= 0 && !p.god) {
      p.health = Math.max(0, p.health - STARVE_DPS * dt);
      this.starveMsgT -= dt;
      if (this.starveMsgT <= 0) {
        this.starveMsgT = 20;
        events.emit('message', { text: 'Olet nälissäsi: syö jotain' });
      }
      if (p.health <= 0) p.die('starve');
    }
    const salve = this.effects.salve;
    if (salve) p.health = Math.min(CONFIG.healthMax, p.health + salve.power * dt);

    // Palautuminen: kylläisenä normaalisti, nälkäisenä hitaasti.
    const h = this.hunger;
    p.survivalHealthMul = poison ? 0 : h > 60 ? 1 : h > 30 ? 0.5 : h > 0 ? 0.15 : 0;
    p.survivalStaminaMul = (h < 20 ? 0.6 : 1) * (poison ? 0.6 : 1) * (this.effects.energized ? 1.5 : 1);
  }

  // Syö / käytä esine. Palauttaa true, jos esine kului.
  eat(id) {
    const d = ITEMS[id];
    const f = d && d.food;
    const p = this.player;
    if (!f || p.dead) return false;
    const medicine = f.cure || f.regen || (f.heal && !f.hunger);
    if (!medicine && this.hunger >= HUNGER_MAX - 1) {
      events.emit('message', { text: 'Et ole nälkäinen' });
      return false;
    }
    this.hunger = Math.min(HUNGER_MAX, this.hunger + (f.hunger || 0));
    if (f.heal) p.health = Math.min(CONFIG.healthMax, p.health + f.heal);
    if (f.stamina) p.stamina = Math.min(CONFIG.staminaMax, p.stamina + f.stamina);
    if (f.regen) this.add('salve', 14, f.regen / 14);
    if (f.effect === 'energized') this.add('energized', 150);
    const poison = this.effects.poison;
    if (f.cure && poison) {
      if (f.cure >= 1) {
        delete this.effects.poison;
        events.emit('message', { text: 'Myrkytys parani' });
      } else {
        poison.t *= 1 - f.cure;
        events.emit('message', { text: 'Myrkytys lievittyi' });
      }
      events.emit('effects');
    }
    if (f.poison && Math.random() < f.poison) {
      const power = f.poisonPower || 1;
      this.add('poison', 22 + Math.random() * 18 * power, power);
      events.emit('message', { text: `Myrkytys! ${d.name} ei sopinut vatsalle.` });
      events.emit('poisoned', { item: id });
    } else if (!f.cure) {
      events.emit('message', { text: `Söit: ${d.name}` });
    }
    events.emit('ate', { item: id });
    return true;
  }

  serialize() {
    const fx = {};
    for (const [k, e] of Object.entries(this.effects)) fx[k] = { t: Math.round(e.t), max: Math.round(e.max), power: e.power };
    return { hunger: Math.round(this.hunger * 10) / 10, effects: fx };
  }

  load(data) {
    this.hunger = data && Number.isFinite(data.hunger) ? Math.max(0, Math.min(HUNGER_MAX, data.hunger)) : HUNGER_MAX;
    this.effects = {};
    if (data && data.effects) {
      for (const [k, e] of Object.entries(data.effects)) {
        if (EFFECTS[k] && e && e.t > 0) this.effects[k] = { t: e.t, max: e.max || e.t, power: e.power || 1 };
      }
    }
    events.emit('effects');
  }
}
