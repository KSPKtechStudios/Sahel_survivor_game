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
// Iskusarja: viidakkoveitsellä kolme iskua, nuijalla lyhyt kahden iskun sarja
// (sessio 18); muilla (myös kirveellä, sessio 19) yksi isku ja jäähdytys.
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
      // Sessio 19: kirves on raskas eikä puuta voi kombottaa: yksi hidas isku.
      { anim: 'swing', dur: 0.55, hitAt: 0.5, chain: 1, cd: 0.38, dmg: 13, kb: 7.5, up: 1.7, stam: 8, arc: 0.5 },
    ],
    leap: { anim: 'leap', dur: 0.62, hitAt: 0.6, chain: 1, cd: 0.6, dmg: 26, kb: 9, up: 2.4, stam: 12, arc: 0.7, reach: 0.35, stagger: 0.8, heavy: true, crit: true },
  },
  pick: {
    name: 'Hakku', block: 'tool', reach: 2.4, combo: [
      { anim: 'swing', dur: 0.55, hitAt: 0.5, chain: 1, cd: 0.28, dmg: 11, kb: 7, up: 1.6, stam: 8, arc: 0.45 },
    ],
  },
  club: {
    name: 'Puunuija', block: 'weapon', reach: 2.5, combo: [
      { anim: 'slashR', dur: 0.62, hitAt: 0.52, chain: 0.85, cd: 0.6, dmg: 19, kb: 11, up: 3.8, stam: 15, arc: 0.85, multi: true, stagger: 0.5, heavy: true },
      { anim: 'slashL', dur: 0.7, hitAt: 0.52, chain: 1, cd: 0.9, dmg: 23, kb: 13, up: 4.5, stam: 20, arc: 0.85, multi: true, stagger: 0.65, heavy: true },
    ],
    leap: { anim: 'leap', dur: 0.7, hitAt: 0.6, chain: 1, cd: 0.8, dmg: 36, kb: 14, up: 4, stam: 18, arc: 0.85, reach: 0.3, multi: true, stagger: 1, heavy: true, crit: true },
  },
  // Sessio 22: uudet asetyypit. Tikari: kaksi nopeaa viiltoa. Miekka: kolmen
  // iskun sarja. Moukari: yksi hyvin hidas murskaava isku ja hyppyisku.
  dagger: {
    name: 'Tikari', block: 'tool', reach: 2.0, combo: [
      { anim: 'slashR', dur: 0.3, hitAt: 0.5, chain: 0.85, cd: 0.25, dmg: 7, kb: 4, up: 1, stam: 5, arc: 0.8 },
      { anim: 'slashL', dur: 0.3, hitAt: 0.5, chain: 1, cd: 0.4, dmg: 8, kb: 4.5, up: 1, stam: 7, arc: 0.8 },
    ],
  },
  sword: {
    name: 'Miekka', block: 'weapon', reach: 2.5, combo: [
      { anim: 'slashR', dur: 0.5, hitAt: 0.5, chain: 0.9, cd: 0.5, dmg: 12, kb: 6, up: 1.4, stam: 9, arc: 0.85, multi: true },
      { anim: 'slashL', dur: 0.5, hitAt: 0.5, chain: 0.9, cd: 0.5, dmg: 12, kb: 6, up: 1.4, stam: 13, arc: 0.85, multi: true },
      { anim: 'thrust', dur: 0.55, hitAt: 0.48, chain: 1, cd: 1.0, dmg: 18, kb: 9, up: 2.5, stam: 20, arc: 0.35, reach: 0.4, stagger: 0.5 },
    ],
  },
  sledge: {
    name: 'Moukari', block: 'weapon', reach: 2.7, combo: [
      { anim: 'smash', dur: 1.0, hitAt: 0.6, chain: 1, cd: 0.9, dmg: 32, kb: 17, up: 5, stam: 24, arc: 0.9, multi: true, stagger: 1.0, heavy: true },
    ],
    leap: { anim: 'leap', dur: 0.8, hitAt: 0.6, chain: 1, cd: 0.9, dmg: 52, kb: 20, up: 5.5, stam: 26, arc: 0.95, reach: 0.3, multi: true, stagger: 1.3, heavy: true, crit: true },
  },
  machete: {
    name: 'Viidakkoveitsi', block: 'weapon', reach: 2.4, combo: [
      { anim: 'slashR', dur: 0.5, hitAt: 0.5, chain: 0.9, cd: 0.5, dmg: 10, kb: 5.5, up: 1.3, stam: 9, arc: 0.9, multi: true },
      { anim: 'slashL', dur: 0.5, hitAt: 0.5, chain: 0.9, cd: 0.5, dmg: 10, kb: 5.5, up: 1.3, stam: 14, arc: 0.9, multi: true },
      { anim: 'thrust', dur: 0.55, hitAt: 0.48, chain: 1, cd: 1.1, dmg: 19, kb: 9.5, up: 3, stam: 22, arc: 0.35, reach: 0.5, stagger: 0.5 },
    ],
  },
};
// Sessio 29: käyttäjä toivoi todella pehmeitä ja sulavia isku- ja
// torjunta-animaatioita. Animaatio kestää n. 35 % pidempään ja osuma tulee
// hieman myöhemmin (n. 12 %), mutta yhden iskun kierto (kesto + jäähdytys)
// pysyy ennallaan: pidempi palautus syö jäähdytystä (soft = siirretty aika).
// Sarjan seuraava isku voi alkaa palautuksen aikana entiseen tahtiin.
const SOFT_DUR = 1.35;
const SOFT_HIT = 1.12;
for (const w of Object.values(WEAPONS)) {
  for (const st of [...w.combo, ...(w.leap ? [w.leap] : [])]) {
    const dur = st.dur * SOFT_DUR;
    const hitT = st.dur * st.hitAt * SOFT_HIT;
    if (st.chain < 1) st.chain = Math.min(1, Math.max(hitT / dur + 0.05, (st.dur * st.chain * 1.06) / dur));
    st.soft = dur - st.dur;
    st.hitAt = hitT / dur;
    st.dur = dur;
  }
}

// leap = hyppyisku (sessio 21): ilmasta aloitettu isku kahdella kädellä
// ylhäältä alas; osuessaan olentoon kriittinen (enemmän vahinkoa). Vain
// raskailla aseilla (kirves, nuija).
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

const ARMOR_K = 30;       // panssarin vähennyksen puolikasarvo
const LIFESTEAL = 0.12;   // rubiiniaseen osuma palauttaa osuuden vahingosta
const MYSTIC_REGEN = 0.35; // rubiiniotsaripa: terveyttä / s
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
      const st = this.attacking.step;
      const cd = Math.max(0.03, (st.cd || 0) * (this.attacking.hitMob ? 1 : GATHER_CD) - (st.soft || 0));
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
      const comboOk = player.stamina > COMBO_MIN * player.maxStamina;
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
        // Hyppyisku: isku aloitetaan ilmassa (hypyn aikana).
        const airborne = !player.onGround && !player.inWater && !player.riding && !player.flying;
        const leap = weapon.leap && airborne && this.comboIdx === 0 ? weapon.leap : null;
        const step = leap || weapon.combo[this.comboIdx % weapon.combo.length];
        if (!player.useStamina(step.stam)) {
          // Ei tekstiä (sessio 18): kestävyyspalkki hehkuu punaisena.
          events.emit('staminaOut');
          this.buffer = 0;
        } else {
          const idx = this.comboIdx;
          const ok = vm.play(step.anim, { dur: step.dur, hitAt: step.hitAt, onHit: () => this._onHit(step, def, weapon) });
          if (ok) {
            // Huitaisun ääni (sessio 12d): työkaluilla ja aseilla, hiljempaa
            // jos olento on iskun tiellä.
            if (weapon !== WEAPONS.fist) {
              const cam = this.camera;
              cam.getWorldDirection(_dir);
              const near = this.mobs.inArc(player.position.x, player.position.z, cam.position.y, _dir, weapon.reach + (step.reach || 0), Math.cos(step.arc || 0.6), _hits).length > 0;
              events.emit('swing', { heavy: !!step.heavy || weapon === WEAPONS.spear, quiet: near });
            }
            this.attacking = { action: vm.action, step, idx };
            this.cooldown = 0;
            this.comboIdx = leap ? 0 : (idx + 1) % weapon.combo.length;
            this.sinceAttack = 0;
            this.buffer = 0;
          }
        }
      }
    }
    if (this.attacking) this.sinceAttack = 0;

    // Rubiinipanssari (sessio 22): haavat sulkeutuvat hitaasti itsestään.
    if (!player.dead && player.health < player.maxHealth && this.inventory.slots.some((s) => s && s.eq && ITEMS[s.id].armor && ITEMS[s.id].mystic)) {
      player.health = Math.min(player.maxHealth, player.health + MYSTIC_REGEN * dt);
    }

    // Torjuessa ja lyödessä liikutaan hitaammin; torjuessa kestävyys palautuu hitaasti.
    player.moveMul = this.blocking ? 0.5 : this.attacking ? (this.attacking.step.heavy ? 0.55 : 0.8) : 1;
    player.staminaRegenMul = this.blocking ? 0.35 : 1;
  }

  // Sarjaan ei riitä kestävyys: ei tekstiä (sessio 18), palkki hehkuu punaisena.
  _comboDenied(weapon) {
    if (weapon.combo.length < 2) return;
    events.emit('staminaOut');
  }

  // Rubiini (sessio 22): osuma palauttaa hiukan terveyttä, ja olennosta
  // virtaa punaisia kipinöitä pelaajaa kohti.
  _lifesteal(m, dealt) {
    const pl = this.player;
    if (dealt <= 0 || pl.dead) return;
    pl.health = Math.min(pl.maxHealth, pl.health + dealt * LIFESTEAL);
    if (this.bursts) {
      _v.set(m.pos.x, m.pos.y + m.def.height * 0.6, m.pos.z);
      this.bursts.spawn(_v, 0xff2a3c, 10, 1.6, { size: 0.06, life: 0.5, gravity: -1.5, lit: true });
    }
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
      // Sessio 22: tason vahinkokerroin (wmul) ja rubiinin voima.
      const dmg = step.dmg * ((def && def.wmul) || 1);
      for (let i = 0; i < n; i++) {
        const m = hits[i];
        const hp0 = m.hp;
        this.mobs.damage(m, dmg, { fromX: p.x, fromZ: p.z, knock: step.kb, up: step.up || 0, stagger: step.stagger || 0 });
        if (def && def.mystic) this._lifesteal(m, Math.max(0, hp0 - m.hp));
        if (m.state === 'dead' || !this.mobs.list.includes(m)) killed = true;
        // Osumakohta olennon pinnalla pelaajan puolella
        const dx = p.x - m.pos.x, dz = p.z - m.pos.z;
        const d = Math.hypot(dx, dz) || 1;
        _v.set(m.pos.x + (dx / d) * m.def.radius, m.pos.y + m.def.height * 0.55, m.pos.z + (dz / d) * m.def.radius);
        if (m.type === 'clay') this.debris.chips(_v, 0x9c4a2a, 5, null, 0.9);
        this.mobs.bleed(m, _v, -dx, -dz, dmg);
        // Soihtu sytyttää lyödyn olennon palamaan (sessio 12e).
        const sel = this.inventory.selectedItem;
        if (sel && sel.id === 'torch' && !sel.unlit) this.mobs.setOnFire(m);
      }
      // Iskuääni elävään olentoon osuessa (sessio 12e).
      events.emit('punch', { heavy: !!step.heavy, n });
      if (step.crit) {
        // Kriittinen hyppyisku: pidempi pysäys, kova tärähdys, pöllähdys ja
        // pelaaja painuu iskun mukana alas.
        const m = hits[0];
        _v.set(m.pos.x, m.pos.y + m.def.height * 0.8, m.pos.z);
        if (this.bursts) {
          this.bursts.spawn(_v, 0xfff0c8, 18, 4, { size: 0.06, life: 0.32, gravity: 4, lit: true });
          this.bursts.spawn(_v.set(m.pos.x, m.pos.y + 0.1, m.pos.z), 0xa88a68, 16, 2.6, { size: 0.15, life: 0.8, gravity: 5 });
        }
        if (!this.player.onGround) this.player.velocity.y = Math.min(this.player.velocity.y, -5);
        this.viewmodel.hitStop(0.16);
        events.emit('crit', { x: m.pos.x, z: m.pos.z });
        events.emit('hitFeedback', { strength: 1.2 });
        return;
      }
      this.viewmodel.hitStop(step.heavy || killed ? 0.11 : 0.06);
      events.emit('hitFeedback', { strength: 0.3 + Math.min(dmg, 40) / 35 });
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
      const b = this._blockStats();
      if (this.elapsed - this.blockStart <= b.parry) {
        // Täydellinen torjunta: ei vahinkoa, hyökkääjä lentää taaksepäin ja
        // taintuu hetkeksi (sessio 21: tähdet pään ympärillä, ei tekstiä).
        this.mobs.stagger(attacker, 1.8, true);
        this.mobs.push(attacker, dx, dz, 7.5, 2);
        // Pieni kipinäpurske iskun kohdassa.
        if (this.bursts) {
          _v.set(p.x + (dx / len) * 0.85, p.y + 1.25, p.z + (dz / len) * 0.85);
          this.bursts.spawn(_v, 0xfff1c8, 16, 3.4, { size: 0.05, life: 0.3, gravity: 3, lit: true });
          this.bursts.spawn(_v, 0xffb04a, 8, 2.2, { size: 0.08, life: 0.22, gravity: 1, lit: true });
        }
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
        const taken = dmg * (1 - b.reduce) * this._armorMul();
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
      player.hurt(dmg * 0.6 * this._armorMul(), { cause, fromX: ax, fromZ: az, knock: knock * 0.8 });
      events.emit('blocked', { broken: true });
      return 'broken';
    }
    player.hurt(dmg * this._armorMul(), { cause, fromX: ax, fromZ: az, knock, up });
    return 'hit';
  }

  // Sessio 22: kilven omat torjunta-arvot (esineen shield-kenttä).
  _blockStats() {
    if (this.blockType === 'shield') {
      const i = this.inventory.equippedShield();
      const d = i >= 0 ? ITEMS[this.inventory.slots[i].id] : null;
      if (d && typeof d.shield === 'object') return d.shield;
    }
    return BLOCKS[this.blockType];
  }

  // Panssari vähentää olentojen iskujen vahinkoa: osuus = a / (a + 30)
  // (esim. 10 → 25 %, 23 → 43 %).
  _armorMul() {
    const a = this.inventory.armor();
    return a > 0 ? 1 - a / (a + ARMOR_K) : 1;
  }
}
