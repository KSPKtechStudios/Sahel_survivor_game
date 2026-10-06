// Taistelu: iskusarjat (kombot) [Hiiri 1], torjunta [Hiiri 2], täydellinen
// torjunta (parry) heti torjunnan alussa, tönäisyt ja osumat olentoihin.
// Jos isku ei osu olentoon, se hakkaa maailmaa kuten ennen (interaction.js).
//
// HUOM: arvot ovat prototyypin paikkamerkkejä (ks. docs/DESIGN.md).
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { ITEMS } from './items.js';
import { events } from './events.js';

// Iskusarjat. anim = käden animaatio (viewmodel.js), dur = kesto (s),
// hitAt = osumahetki, chain = milloin seuraava isku voi alkaa, dmg = vahinko,
// kb = tönäisy, stam = kestävyys, arc = osumakaaren puolikulma (rad),
// reach = lisäulottuvuus, multi = osuu useampaan, stagger = horjuttaa (s).
export const WEAPONS = {
  fist: {
    name: 'Nyrkit', block: 'fist', reach: 1.9, combo: [
      { anim: 'punch', dur: 0.36, hitAt: 0.42, chain: 0.6, dmg: 4, kb: 2.5, stam: 4, arc: 0.6 },
      { anim: 'hook', dur: 0.42, hitAt: 0.45, chain: 0.75, dmg: 6, kb: 4.5, stam: 5, arc: 0.75 },
    ],
  },
  stick: {
    name: 'Risu', block: 'tool', reach: 2.3, combo: [
      { anim: 'swing', dur: 0.45, hitAt: 0.5, chain: 0.999, dmg: 5, kb: 3, stam: 5, arc: 0.55 },
    ],
  },
  axe: {
    name: 'Kirves', block: 'tool', reach: 2.4, combo: [
      { anim: 'swing', dur: 0.5, hitAt: 0.5, chain: 0.999, dmg: 10, kb: 3.5, stam: 6, arc: 0.5 },
    ],
  },
  pick: {
    name: 'Hakku', block: 'tool', reach: 2.4, combo: [
      { anim: 'swing', dur: 0.55, hitAt: 0.5, chain: 0.999, dmg: 9, kb: 3.5, stam: 7, arc: 0.45 },
    ],
  },
  club: {
    name: 'Puunuija', block: 'weapon', reach: 2.5, combo: [
      { anim: 'slashR', dur: 0.55, hitAt: 0.5, chain: 0.64, dmg: 11, kb: 5, stam: 8, arc: 0.85, multi: true },
      { anim: 'slashL', dur: 0.55, hitAt: 0.5, chain: 0.64, dmg: 11, kb: 5, stam: 8, arc: 0.85, multi: true },
      { anim: 'smash', dur: 0.85, hitAt: 0.6, chain: 0.92, dmg: 24, kb: 9, up: 3, stam: 13, arc: 0.55, stagger: 1.0, heavy: true },
    ],
  },
  machete: {
    name: 'Viidakkoveitsi', block: 'weapon', reach: 2.4, combo: [
      { anim: 'slashR', dur: 0.36, hitAt: 0.5, chain: 0.62, dmg: 9, kb: 2.5, stam: 5, arc: 0.9, multi: true },
      { anim: 'slashL', dur: 0.36, hitAt: 0.5, chain: 0.62, dmg: 9, kb: 2.5, stam: 5, arc: 0.9, multi: true },
      { anim: 'thrust', dur: 0.46, hitAt: 0.48, chain: 0.9, dmg: 17, kb: 5, stam: 8, arc: 0.35, reach: 0.5, stagger: 0.5 },
    ],
  },
};

// Torjunta: reduce = kuinka suuri osa vahingosta torjutaan, cost = kestävyys
// torjuttua vahinkoa kohti, parry = täydellisen torjunnan ikkuna (s).
export const BLOCKS = {
  shield: { name: 'kilpi', reduce: 0.9, cost: 0.55, parry: 0.28 },
  weapon: { name: 'ase', reduce: 0.6, cost: 1.0, parry: 0.22 },
  tool: { name: 'työkalu', reduce: 0.5, cost: 1.1, parry: 0.2 },
  fist: { name: 'kädet', reduce: 0.3, cost: 1.25, parry: 0.18 },
};

const COMBO_RESET = 0.55; // näin pitkän tauon jälkeen sarja alkaa alusta
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
  }

  weaponKey(def) {
    if (!def) return 'fist';
    if (def.weapon) return def.weapon;
    if (def === ITEMS.stick) return 'stick';
    return 'fist';
  }

  hasShield() {
    for (let i = 0; i < CONFIG.hotbarSize; i++) {
      const s = this.inventory.slots[i];
      if (s && ITEMS[s.id].shield) return true;
    }
    return false;
  }

  reset() {
    this.blocking = false;
    this.attacking = null;
    this.buffer = 0;
    this.comboIdx = 0;
    this.stun = 0;
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
    this.sinceAttack += dt;
    if (this.attacking && !vm.action) this.attacking = null;

    const can = active && !player.dead && input.enabled && input.locked;
    const wkey = this.weaponKey(def);
    const weapon = WEAPONS[wkey];
    this.blockType = shield ? 'shield' : weapon.block;

    // --- Torjunta [Hiiri 2] (paitsi kun kädessä on asetettava esine)
    const wantBlock = can && this.stun <= 0 && input.buttons.has(2) && !(def && def.place);
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
    if (can && (input.clicked.has(0) || input.buttons.has(0))) this.buffer = BUFFER;
    else this.buffer = Math.max(0, this.buffer - dt);
    if (!can) this.buffer = 0;

    if (this.buffer > 0 && !this.blocking && this.stun <= 0) {
      if (this.comboWeapon !== wkey) { this.comboIdx = 0; this.comboWeapon = wkey; }
      const a = vm.action;
      const cur = this.attacking;
      let start = false;
      if (!a) start = true;
      else if (cur && a === cur.action && a.hitDone && a.t >= cur.step.chain) start = true;
      if (start) {
        if (!cur && this.sinceAttack > COMBO_RESET) this.comboIdx = 0;
        const step = weapon.combo[this.comboIdx % weapon.combo.length];
        if (!player.useStamina(step.stam)) {
          events.emit('message', { text: 'Olet liian väsynyt' });
          this.buffer = 0;
        } else {
          const idx = this.comboIdx;
          const ok = vm.play(step.anim, { dur: step.dur, hitAt: step.hitAt, onHit: () => this._onHit(step, def, weapon) });
          if (ok) {
            this.attacking = { action: vm.action, step, idx };
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

  // Iskun osumahetki: ensin olennot kaaressa, muuten maailma (hakkuu).
  _onHit(step, def, weapon) {
    const cam = this.camera;
    const p = this.player.position;
    cam.getWorldDirection(_dir);
    const reach = weapon.reach + (step.reach || 0);
    const hits = this.mobs.inArc(p.x, p.z, cam.position.y, _dir, reach, Math.cos(step.arc || 0.6), _hits);
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
        else this.bursts.spawn(_v, 0x7a2a1c, 8, 0.7);
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
