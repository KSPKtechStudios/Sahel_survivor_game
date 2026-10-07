// Selviytyminen: syödyt ruoat, syöminen ja tilavaikutukset.
//
// Ruokajärjestelmä (sessio 14, käyttäjän toive): syödyt ruoat nostavat
// maksimiterveyttä ja -kestävyyttä perustasosta (25) enintään 100:aan. Jokainen
// ruoka vaikuttaa ruoan mukaan 5–20 min, ja sen vaikutus hiipuu lopussa.
// Ruokia saa syödä rajattomasti (myös samaa), kunnes maksimiterveys on 100.
// Nälkäpalkkia ei enää ole, eikä nälkään kuole: ilman ruokaa maksimit ovat
// perustasolla. Sienet ja raaka liha voivat aiheuttaa myrkytyksen.
//
// HUOM: arvot ovat prototyypin paikkamerkkejä (ks. docs/DESIGN.md).
import { ITEMS } from './items.js';
import { events } from './events.js';

export const BASE_HEALTH = 25;
export const BASE_STAMINA = 25;
export const MAX_CAP = 100;
const FADE_START = 0.35;       // vaikutus alkaa hiipua, kun jäljellä on 35 % ajasta
const POISON_DPS = 0.45;       // myrkytyksen vahinko (kerrotaan voimakkuudella)
const POISON_FLOOR = 4;        // myrkytys ei vie terveyttä tämän alle
// Paraneminen (sessio 18): nopea vain 30 s syömisen jälkeen, muuten neljäsosa.
const WELL_FED = 30;
const SLOW_HEAL = 0.25;

// Ruokien vaikutukset: [maksimiterveys +, maksimikestävyys +, kesto min].
// Liha ja padat painottavat terveyttä, hedelmät ja juomat kestävyyttä.
export const FOOD = {
  mushroom_brown: [6, 4, 5],
  mushroom_pale: [5, 3, 5],
  mushroom_red: [3, 2, 5],
  mushroom_termite: [10, 6, 6],
  roasted_mushroom: [14, 8, 8],
  raw_meat: [10, 5, 5],
  cooked_meat: [30, 12, 15],
  jujube: [5, 10, 5],
  banana: [10, 18, 8],
  coconut: [8, 25, 10],
  baobab_fruit: [12, 16, 10],
  shea_nuts: [3, 4, 5],
  roasted_nuts: [10, 14, 10],
  moringa: [6, 6, 6],
  hibiscus: [2, 4, 5],
  fonio: [2, 3, 5],
  fonio_porridge: [24, 20, 15],
  meat_stew: [45, 30, 20],
  bissap: [4, 12, 8],
};
// Uuden pelin aloitusateria (ei esine).
export const START_MEAL = { id: 'start_meal', name: 'Lähtöeväät', hp: 45, st: 45, min: 12 };

export function foodValues(id) {
  if (id === START_MEAL.id) return START_MEAL;
  const d = ITEMS[id];
  const f = d && d.food;
  if (!f) return null;
  const v = FOOD[id];
  if (v) return { id, name: d.name, hp: v[0], st: v[1], min: v[2] };
  if (!f.hunger) return null; // lääkkeet eivät ole ruokaa
  return { id, name: d.name, hp: Math.round(f.hunger * 0.7), st: Math.round(f.hunger * 0.5), min: Math.min(20, Math.max(5, 5 + f.hunger * 0.25)) };
}

export const EFFECTS = {
  poison: { name: 'Myrkytys', bad: true },
  energized: { name: 'Virkeä' },
  salve: { name: 'Haavavoide' },
};

// Esineen tiedot tekstinä (reppu ja valmistus).
export function itemStats(d, id) {
  const parts = [];
  const f = d.food;
  const fv = f && foodValues(id);
  if (f) {
    if (fv) parts.push(`Terveys +${fv.hp} maks.`, `Kestävyys +${fv.st} maks.`, `${Math.round(fv.min)} min`);
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
    this.foods = [];   // { id, t: jäljellä (s), dur, hp, st }
    this.effects = {}; // avain -> { t: jäljellä (s), max, power }
    this.maxHealth = BASE_HEALTH;
    this.maxStamina = BASE_STAMINA;
    this.wellFedT = 0;   // nopean paranemisen aika syömisen jälkeen (s)
  }

  // Uusi peli: aloitusateria.
  reset(withStartMeal = true) {
    this.foods = [];
    if (withStartMeal) this._addFood(START_MEAL);
    this.effects = {};
    this._recalc();
    events.emit('effects');
    events.emit('foods');
  }

  // Herätessä kuoleman jälkeen tilavaikutukset nollataan, ruoat säilyvät.
  clearEffects() {
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

  // Ruoan vaikutuksen osuus 0..1 (hiipuu lopussa).
  static weight(food) {
    return Math.max(0, Math.min(1, food.t / food.dur / FADE_START));
  }

  _addFood(v) {
    const dur = v.min * 60;
    this.foods.unshift({ id: v.id, t: dur, dur, hp: v.hp, st: v.st });
  }

  _recalc() {
    let hp = BASE_HEALTH, st = BASE_STAMINA;
    for (const f of this.foods) {
      const w = Survival.weight(f);
      hp += f.hp * w;
      st += f.st * w;
    }
    this.maxHealth = Math.min(MAX_CAP, hp);
    this.maxStamina = Math.min(MAX_CAP, st);
    const p = this.player;
    p.maxHealth = this.maxHealth;
    p.maxStamina = this.maxStamina;
    if (p.health > p.maxHealth) p.health = p.maxHealth;
    if (p.stamina > p.maxStamina) p.stamina = p.maxStamina;
  }

  update(dt) {
    const p = this.player;
    if (p.dead || dt <= 0) { this._recalc(); return; }
    let gone = false;
    if (!p.god) {
      for (let i = this.foods.length - 1; i >= 0; i--) {
        const f = this.foods[i];
        f.t -= dt;
        if (f.t <= 0) {
          this.foods.splice(i, 1);
          gone = true;
          const v = foodValues(f.id);
          if (v) events.emit('message', { text: `${v.name}: vaikutus loppui` });
        }
      }
    }
    if (gone) events.emit('foods');
    this._recalc();

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
    const salve = this.effects.salve;
    if (salve) p.health = Math.min(p.maxHealth, p.health + salve.power * dt);

    this.wellFedT = Math.max(0, this.wellFedT - dt);
    p.survivalHealthMul = poison ? 0 : this.wellFedT > 0 ? 1 : SLOW_HEAL;
    p.survivalStaminaMul = (poison ? 0.6 : 1) * (this.effects.energized ? 1.5 : 1);
  }

  // Syö / käytä esine. Palauttaa true, jos esine kului.
  eat(id) {
    const d = ITEMS[id];
    const f = d && d.food;
    const p = this.player;
    if (!f || p.dead) return false;
    const fv = foodValues(id);
    if (fv && this.maxHealth >= MAX_CAP - 0.5) {
      events.emit('message', { text: 'Olet kylläinen' });
      return false;
    }
    if (!fv && !(f.cure || f.regen || f.heal)) return false;
    if (fv) { this._addFood(fv); this._recalc(); this.wellFedT = WELL_FED; events.emit('foods'); }
    if (f.heal) p.health = Math.min(p.maxHealth, p.health + f.heal);
    if (f.stamina) p.stamina = Math.min(p.maxStamina, p.stamina + f.stamina);
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
    const foods = this.foods.map((f) => ({ id: f.id, t: Math.round(f.t), dur: f.dur, hp: f.hp, st: f.st }));
    return { foods, effects: fx };
  }

  load(data) {
    this.foods = [];
    if (data && Array.isArray(data.foods)) {
      for (const f of data.foods) {
        if (f && foodValues(f.id) && f.t > 0 && f.dur > 0) this.foods.push({ id: f.id, t: f.t, dur: f.dur, hp: f.hp | 0, st: f.st | 0 });
      }
    } else if (data && Number.isFinite(data.hunger) && data.hunger > 0) {
      // Vanha tallennus (nälkäpalkki): kylläisyys muuttuu aloitusateriaksi.
      this._addFood(START_MEAL);
      this.foods[0].t *= Math.min(1, data.hunger / 100);
    } else if (!data) {
      this._addFood(START_MEAL);
    }
    this.effects = {};
    if (data && data.effects) {
      for (const [k, e] of Object.entries(data.effects)) {
        if (EFFECTS[k] && e && e.t > 0) this.effects[k] = { t: e.t, max: e.max || e.t, power: e.power || 1 };
      }
    }
    this._recalc();
    events.emit('effects');
    events.emit('foods');
  }
}
