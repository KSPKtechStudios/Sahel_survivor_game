// Taistelu: iskusarjat (kombot) [Hiiri 1], torjunta [Hiiri 2], täydellinen
// torjunta (parry) heti torjunnan alussa, tönäisyt ja osumat olentoihin.
// Jos isku ei osu olentoon, se hakkaa maailmaa kuten ennen (interaction.js).
// Sarja jatkuu vain, kun kestävyyttä on yli puolet (COMBO_MIN), ja sarjan
// iskut ovat kalliita: täydellä kestävyydellä ehtii yhden sarjan.
//
// HUOM: arvot ovat prototyypin paikkamerkkejä (ks. docs/DESIGN.md).
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { ITEMS } from './items.js';
import { events } from './events.js';

// Iskut. anim = käden animaatio (viewmodel.js), dur = kesto (s),
// hitAt = osumahetki, chain = milloin sarjan seuraava isku voi alkaa,
// cd = jäähdytys iskun jälkeen ennen kuin voi lyödä uudelleen (s),
// dmg = vahinko, kb = tönäisy, up = heitto ylös, stam = kestävyys,
// arc = osumakaaren puolikulma (rad), reach = lisäulottuvuus,
// multi = osuu useampaan, stagger = horjuttaa (s).
// Iskusarja (useampi isku) on vain nopeilla ja kevyillä aseilla
// (viidakkoveitsi); muilla on yksi isku ja jäähdytys.
// Sessio 11: tahti on sujuva mutta ei loputon. Yhden iskun kierto (kesto +
// jäähdytys) on nyrkeillä n. 0,65 s, kirveellä n. 0,8 s ja raskaalla nuijalla
// n. 1,45 s. Kun isku osuu maailmaan (puu, kivi, pensas) tai ilmaan, jäähdytys
// on lyhyempi (GATHER_CD), joten hakkuu ei tunnu kankealta. Jatkuvaa
// huitomista rajoittaa kestävyys (jatkuvassa lyönnissä se ei ehdi palautua).
export const WEAPONS = {
  fist: {
    name: 'Nyrkit', block: 'fist', reach: 1.9, combo: [
      { anim: 'punch', dur: 0.36, hitAt: 0.45, chain: 1, cd: 0.28, dmg: 6, kb: 5.5, up: 1.3, stam: 5, arc: 0.6 },
    ],
  },
  stick: {
    name: 'Risu', block: 'tool', reach: 2.3, combo: [
      { anim: 'swing', dur: 0.42, hitAt: 0.5, chain: 1, cd: 0.3, dmg: 6, kb: 6, up: 1.3, stam: 5, arc: 0.55 },
    ],
  },
  knife: {
    name: 'Kivipuukko', block: 'tool', reach: 2.0, combo: [
      { anim: 'slashR', dur: 0.32, hitAt: 0.5, chain: 1, cd: 0.22, dmg: 7, kb: 4.5, up: 1, stam: 5, arc: 0.8 },
    ],
  },
  spear: {
    name: 'Keihäs', block: 'weapon', reach: 3.0, combo: [
      { anim: 'thrust', dur: 0.5, hitAt: 0.48, chain: 1, cd: 0.45, dmg: 15, kb: 7, up: 1.5, stam: 10, arc: 0.3, reach: 0.4 },
    ],
  },
  axe: {
    name: 'Kirves', block: 'tool', reach: 2.4, combo: [
      { anim: 'swing', dur: 0.5, hitAt: 0.5, chain: 1, cd: 0.28, dmg: 12, kb: 7, up: 1.6, stam: 7, arc: 0.5 },
    ],
  },
  pick: {
    name: 'Hakku', block: 'tool', reach: 2.4, combo: [
      { anim: 'swing', dur: 0.55, hitAt: 0.5, chain: 1, cd: 0.28, dmg: 11, kb: 7, up: 1.6, stam: 8, arc: 0.45 },
    ],
  },
  club: {
    name: 'Puunuija', block: 'weapon', reach: 2.5, combo: [
      { anim: 'slashR', dur: 0.75, hitAt: 0.52, chain: 1, cd: 0.7, dmg: 21, kb: 12, up: 4.2, stam: 18, arc: 0.85, multi: true, stagger: 0.6, heavy: true },
    ],
  },
  machete: {
    name: 'Viidakkoveitsi', block: 'weapon', reach: 2.4, combo: [
      { anim: 'slashR', dur: 0.38, hitAt: 0.5, chain: 0.8, cd: 0.5, dmg: 10, kb: 5.5, up: 1.3, stam: 9, arc: 0.9, multi: true },
      { anim: 'slashL', dur: 0.38, hitAt: 0.5, chain: 0.8, cd: 0.5, dmg: 10, kb: 5.5, up: 1.3, stam: 14, arc: 0.9, multi: true },
      { anim: 'thrust', dur: 0.5, hitAt: 0.48, chain: 1, cd: 1.1, dmg: 19, kb: 9.5, up: 3, stam: 22, arc: 0.35, reach: 0.5, stagger: 0.5 },
    ],
  },
};
// Jäähdytyksen kerroin, kun isku ei osunut olentoon (hakkuu, louhinta, ohi).
const GATHER_CD = 0.55;

// Torjunta: reduce = kuinka suuri osa vahingosta torjutaan, cost = kestävyys
// torjuttua vahinkoa kohti, parry = täydellisen torjunnan ikkuna (s).
export const BLOCKS = {
  shield: { name: 'kilpi', reduce: 0.9, cost: 0.55, parry: 0.28 },
  weapon: { name: 'ase', reduce: 0.6, cost: 1.0, parry: 0.22 },
  tool: { name: 'työkalu', reduce: 0.5, cost: 1.1, parry: 0.2 },
  fist: { name: 'kädet', reduce: 0.3, cost: 1.25, parry: 0.18 },
};

const COMBO_RESET = 0.55; // näin pitkän tauon jälkeen sarja alkaa alusta
export const COMBO_MIN = 0.5; // sarjan jatkaminen vaatii yli puolet kestävyydestä
const BUFFER = 0.35;      // ennakkoon painettu isku muistetaan näin kauan
const _dir = new THREE.Vector3();
const _hits = [];
const _v = new THREE.Vector3();

export class Combat {
  constructor({ camera, player, inventory, viewmodel, interaction, mobs, debris, bursts }) {
    Object.assign(this, { camera, player, inventory, viewmodel, interaction, mobs, debris, bursts });
    this.blocking = false;
    this.blockStart = -10;
    this.blockType = 'fist';
    this.comboIdx = 0;
    this.comboWeapon = null;
    this.sinceAttack = 10;
    this.buffer = 0;
    this.attacking = null;   // käynnissä olevan iskun tiedot
    this.stun = 0;           // torjunnan murtuminen: ei voi lyödä eikä torjua
    this.elapsed = 0;
    this.comboMsgT = 0;      // ilmoitus "kestävyys ei riitä sarjaan" harvoin
    this.cooldown = 0;       // jäähdytys: ei uutta iskua ennen kuin tämä on 0
  }

  // 0..1: kuinka paljon jäähdytystä on jäljellä (HUD:n tähtäin).
  get cooldownFrac() {
    return this.cooldownMax > 0 ? Math.max(0, this.cooldown / this.cooldownMax) : 0;
  }

  weaponKey(def) {
    if (!def) return 'fist';
    if (def.weapon) return def.weapon;
    if (def === ITEMS.stick) return 'stick';
    return 'fist';
  }

  // Kilpi on käytössä vain, kun se on varustettu (ks. Inventory.toggleEquip).
  hasShield() {
    return this.inventory.equippedShield() >= 0;
  }

  reset() {
    this.blocking = false;
    this.attacking = null;
    this.buffer = 0;
    this.comboIdx = 0;
    this.stun = 0;
    this.cooldown = 0;
    this.viewmodel.setBlock(null);
    this.player.moveMul = 1;
    this.player.staminaRegenMul = 1;
  }

  update(dt, input, elapsed, active) {
    this.elapsed = elapsed;
    const vm = this.viewmodel;
    const player = this.player;
    const item = this.inventory.selectedItem;
    const def = item ? ITEMS[item.id] : null;
    const shield = this.hasShield();
    vm.setShield(shield);
    this.stun = Math.max(0, this.stun - dt);
    this.comboMsgT = Math.max(0, this.comboMsgT - dt);
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.sinceAttack += dt;
    if (this.attacking && vm.action !== this.attacking.action) {
      // Isku päättyi (tai keskeytettiin) ilman sarjan jatkoa: jäähdytys alkaa
      // (lyhyempi, jos isku ei osunut olentoon).
      const cd = (this.attacking.step.cd || 0) * (this.attacking.hitMob ? 1 : GATHER_CD);
      this.cooldown = this.cooldownMax = cd;
      this.attacking = null;
    }

    const can = active && !player.dead && input.enabled && input.locked;
    const wkey = this.weaponKey(def);
    const weapon = WEAPONS[wkey];
    this.blockType = shield ? 'shield' : weapon.block;

    // --- Torjunta [Hiiri 2] (paitsi kun kädessä on asetettava esine tai
    // varustamaton kilpi: silloin hiiren oikea asettaa / varustaa)
    // Vasara, jousi ja ruoka käyttävät hiiren painikkeita muuhun.
    const special = !!(def && (def.build || def.bow));
    const rmbOther = !!(def && (def.place || def.food || def.build || def.bow || (def.shield && !shield)));
    const wantBlock = can && this.stun <= 0 && input.buttons.has(2) && !rmbOther;
    if (wantBlock && !this.blocking) {
      const a = vm.action;
      // Iskun alkuvaihetta ei voi perua, palautumisen voi.
      if (!a || a.hitDone) {
        this.blocking = true;
        this.blockStart = elapsed;
        if (a) vm.action = null;
        this.attacking = null;
        this.buffer = 0;
        vm.setBlock(this.blockType === 'shield' ? 'shield' : this.blockType === 'fist' ? 'fist' : 'weapon');
      }
    } else if (!wantBlock && this.blocking) {
      this.blocking = false;
      vm.setBlock(null);
    }
    if (this.blocking) vm.setBlock(this.blockType === 'shield' ? 'shield' : this.blockType === 'fist' ? 'fist' : 'weapon');

    // --- Isku [Hiiri 1]: painallus muistetaan hetken; pohjassa pitäminen jatkaa sarjaa.
    if (can && !special && (input.clicked.has(0) || input.buttons.has(0))) this.buffer = BUFFER;
    else this.buffer = Math.max(0, this.buffer - dt);
    if (!can) this.buffer = 0;

    if (this.buffer > 0 && !this.blocking && this.stun <= 0) {
      if (this.comboWeapon !== wkey) { this.comboIdx = 0; this.comboWeapon = wkey; }
      const a = vm.action;
      const cur = this.attacking;
      const comboOk = player.stamina > COMBO_MIN * CONFIG.staminaMax;
      let start = false;
      if (!a) start = this.cooldown <= 0;
      else if (cur && a === cur.action && a.hitDone && a.t >= cur.step.chain) {
        // Sarjan seuraava isku heti, jos kestävyys riittää; muuten odotetaan,
        // että isku päättyy, ja aloitetaan alusta.
        if (this.comboIdx > 0 && !comboOk) {
          this._comboDenied(weapon);
          this.comboIdx = 0;
        } else start = true;
      }
      if (start) {
        if (!cur && this.sinceAttack > COMBO_RESET) this.comboIdx = 0;
        if (this.comboIdx > 0 && !comboOk) { this._comboDenied(weapon); this.comboIdx = 0; }
        const step = weapon.combo[this.comboIdx % weapon.combo.length];
        if (!player.useStamina(step.stam)) {
          events.emit('message', { text: 'Olet liian väsynyt' });
          this.buffer = 0;
        } else {
          const idx = this.comboIdx;
          const ok = vm.play(step.anim, { dur: step.dur, hitAt: step.hitAt, onHit: () => this._onHit(step, def, weapon) });
          if (ok) {
            this.attacking = { action: vm.action, step, idx };
            this.cooldown = 0;
            this.comboIdx = (idx + 1) % weapon.combo.length;
            this.sinceAttack = 0;
            this.buffer = 0;
          }
        }
      }
    }
    if (this.attacking) this.sinceAttack = 0;

    // Torjuessa ja lyödessä liikutaan hitaammin; torjuessa kestävyys palautuu hitaasti.
    player.moveMul = this.blocking ? 0.5 : this.attacking ? (this.attacking.step.heavy ? 0.55 : 0.8) : 1;
    player.staminaRegenMul = this.blocking ? 0.35 : 1;
  }

  _comboDenied(weapon) {
    if (weapon.combo.length < 2 || this.comboMsgT > 0) return;
    this.comboMsgT = 8;
    events.emit('message', { text: 'Sarjaan tarvitaan yli puolet kestävyydestä' });
  }

  // Iskun osumahetki: ensin olennot kaaressa, muuten maailma (hakkuu).
  _onHit(step, def, weapon) {
    const cam = this.camera;
    const p = this.player.position;
    cam.getWorldDirection(_dir);
    const reach = weapon.reach + (step.reach || 0);
    const hits = this.mobs.inArc(p.x, p.z, cam.position.y, _dir, reach, Math.cos(step.arc || 0.6), _hits);
    if (this.attacking) this.attacking.hitMob = hits.length > 0;
    if (hits.length) {
      const n = step.multi ? Math.min(3, hits.length) : 1;
      let killed = false;
      for (let i = 0; i < n; i++) {
        const m = hits[i];
        this.mobs.damage(m, step.dmg, { fromX: p.x, fromZ: p.z, knock: step.kb, up: step.up || 0, stagger: step.stagger || 0 });
        if (m.state === 'dead' || !this.mobs.list.includes(m)) killed = true;
        // Osumakohta olennon pinnalla pelaajan puolella
        const dx = p.x - m.pos.x, dz = p.z - m.pos.z;
        const d = Math.hypot(dx, dz) || 1;
        _v.set(m.pos.x + (dx / d) * m.def.radius, m.pos.y + m.def.height * 0.55, m.pos.z + (dz / d) * m.def.radius);
        if (m.type === 'clay') this.debris.chips(_v, 0x9c4a2a, 5, null, 0.9);
        this.mobs.bleed(m, _v, -dx, -dz, step.dmg);
      }
      this.viewmodel.hitStop(step.heavy || killed ? 0.11 : 0.06);
      events.emit('hitFeedback', { strength: 0.3 + step.dmg / 35 });
      return;
    }
    this.interaction._onHit(def);
  }

  // Olento osuu pelaajaan. Palauttaa 'parry' | 'block' | 'broken' | 'hit'.
  receiveHit(attacker, dmg, { knock = 4, up = 0, cause = '' } = {}) {
    const player = this.player;
    if (player.dead) return 'none';
    const p = player.position;
    const ax = attacker.pos.x, az = attacker.pos.z;
    const dx = ax - p.x, dz = az - p.z;
    const len = Math.hypot(dx, dz) || 1;
    // Torjunta toimii vain edestä tuleviin iskuihin.
    const fx = -Math.sin(player.yaw), fz = -Math.cos(player.yaw);
    const facing = (dx * fx + dz * fz) / len > 0.34;
    const vm = this.viewmodel;
    if (this.blocking && facing) {
      const b = BLOCKS[this.blockType];
      if (this.elapsed - this.blockStart <= b.parry) {
        // Täydellinen torjunta: ei vahinkoa, hyökkääjä horjuu ja lentää taaksepäin.
        this.mobs.stagger(attacker, 1.8, true);
        this.mobs.push(attacker, dx, dz, 6, 1.5);
        vm.parry();
        vm.hitStop(0.1);
        events.emit('parry', {});
        events.emit('hitFeedback', { strength: 0.5 });
        return 'parry';
      }
      const cost = dmg * b.cost;
      if (player.stamina >= cost) {
        player.stamina -= cost;
        player.staminaDelay = CONFIG.staminaRegenDelay;
        const taken = dmg * (1 - b.reduce);
        if (taken >= 0.5) player.hurt(taken, { cause, fromX: ax, fromZ: az, knock: knock * 0.35 });
        else player.push(-dx, -dz, knock * 0.35);
        vm.blockImpact(0.6 + dmg / 25);
        events.emit('blocked', { broken: false });
        events.emit('hitFeedback', { strength: 0.3 });
        return 'block';
      }
      // Kestävyys ei riitä: torjunta murtuu.
      player.stamina = 0;
      player.staminaDelay = 1.5;
      this.blocking = false;
      vm.setBlock(null);
      this.stun = 0.7;
      vm.blockImpact(1.2);
      player.hurt(dmg * 0.6, { cause, fromX: ax, fromZ: az, knock: knock * 0.8 });
      events.emit('blocked', { broken: true });
      return 'broken';
    }
    player.hurt(dmg, { cause, fromX: ax, fromZ: az, knock, up });
    return 'hit';
  }
}
