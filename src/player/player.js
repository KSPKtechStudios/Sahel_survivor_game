// Pelaajan liikkuminen: kävely, juoksu, kyykky, hyppy, uinti, törmäykset,
// kestävyys ja terveys (osumat, tönäisyt, hukkuminen, kuolema).
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { events } from '../game/events.js';
import { heightAt, edgeFactor, waterAt } from '../world/terrain.js';
import { waveHeight, openFactor } from '../world/waves.js';

const _fwd = new THREE.Vector3();
const _right = new THREE.Vector3();
const _wish = new THREE.Vector3();
const _colliders = [];
const _wq = {};

export class Player {
  constructor(camera) {
    this.camera = camera;
    this.position = new THREE.Vector3(0, 10, 0); // jalkojen kohta
    this.velocity = new THREE.Vector3();
    this.yaw = 0;
    this.pitch = 0;
    this.onGround = false;
    this.inWater = 0; // 0 = kuiva, 1 = kahlaa, 2 = ui
    this.stamina = CONFIG.staminaMax;
    this.staminaDelay = 0;
    this.sprinting = false;
    this.bobPhase = 0;
    this.bobAmount = 0;
    this.landDip = 0;
    this.speedNow = 0;
    this.atEdge = false;
    this.speedMul = 1; // esim. sademetsän tiheä aluskasvillisuus hidastaa
    // Veden tila: pinnan korkeus aaltoineen ja aaltojen parametrit (main.js).
    this.waves = { amp: 0, windX: 1, windZ: 0, t: 0 };
    this.surface = -Infinity;
    this.waterDepth = 0;
    this.onWater = null; // (laji, x, y, z, voima) roiskeita ja väreilyä varten
    this.wakeTimer = 0;
    // Terveys ja taistelu
    this.health = CONFIG.healthMax;
    this.healthDelay = 0;
    this.dead = false;
    this.deathCause = '';
    this.deathT = 0;
    this.knock = new THREE.Vector3(); // tönäisy (vaimenee itsestään)
    this.moveMul = 1;                 // taistelu: torjunta ja isku hidastavat
    this.staminaRegenMul = 1;
    // Ravinto ja tilavaikutukset (survival.js): palautumisen kertoimet
    this.survivalHealthMul = 1;
    this.survivalStaminaMul = 1;
    this.hurtKick = 0;                // kameran nytkähdys osumasta
    this.hurtRoll = 0;
    // Kyykky ja hukkuminen
    this.crouching = false;
    this.crouchBlend = 0;
    this.drowning = 0;                // 0..1 (HUD:n sininen reunus)
    this.drownTimer = 0;
    this.swimTime = 0;
    // Veneessä (game/boats.js asettaa paikan, silmien korkeuden ja kallistuksen)
    this.riding = null;
    this.rideEye = CONFIG.eyeHeight;
    this.rideRoll = 0;
    // Kehittäjätyökalut [F3]
    this.flying = false;
    this.god = false;                 // ei vahinkoa, kestävyys ei kulu
    this.speedBoost = 1;
  }

  get eye() {
    return this.camera.position;
  }

  useStamina(amount) {
    if (this.god) return true;
    if (this.stamina < amount * 0.5) return false;
    this.stamina = Math.max(0, this.stamina - amount);
    this.staminaDelay = CONFIG.staminaRegenDelay;
    return true;
  }

  // Vahinko. opts: { cause, fromX, fromZ, knock, up }
  hurt(amount, opts = {}) {
    if (this.dead || amount <= 0 || this.god) return;
    this.health = Math.max(0, this.health - amount);
    this.healthDelay = CONFIG.healthRegenDelay;
    this.hurtKick = Math.min(0.09, 0.025 + amount * 0.003);
    this.hurtRoll = (Math.random() < 0.5 ? -1 : 1) * this.hurtKick * 0.8;
    if (opts.fromX !== undefined && opts.knock) {
      this.push(this.position.x - opts.fromX, this.position.z - opts.fromZ, opts.knock, opts.up || 0);
    }
    events.emit('playerHurt', { amount, cause: opts.cause || '' });
    if (this.health <= 0) this.die(opts.cause || '');
  }

  // Tönäisy suuntaan (dx, dz) voimalla (m/s); up = pieni hypähdys.
  push(dx, dz, strength, up = 0) {
    const len = Math.hypot(dx, dz) || 1;
    this.knock.x += (dx / len) * strength;
    this.knock.z += (dz / len) * strength;
    if (up > 0 && this.inWater < 2) {
      this.velocity.y = Math.max(this.velocity.y, up);
      this.onGround = false;
    }
  }

  die(cause) {
    if (this.dead) return;
    this.dead = true;
    this.deathCause = cause;
    this.deathT = 0;
    this.crouching = false;
    events.emit('playerDied', { cause });
  }

  // Herätys henkiin (täysi terveys ja kestävyys).
  respawn(x, z) {
    this.dead = false;
    this.deathT = 0;
    this.health = CONFIG.healthMax;
    this.stamina = CONFIG.staminaMax;
    this.healthDelay = 0;
    this.drowning = 0;
    this.drownTimer = 0;
    this.knock.set(0, 0, 0);
    this.teleport(x, z);
  }

  update(dt, input, world) {
    const alive = !this.dead;
    // --- Katse
    if (input.locked && input.enabled && alive) {
      this.yaw -= input.mouseDX * input.sensitivity;
      this.pitch -= input.mouseDY * input.sensitivity * (input.invertY ? -1 : 1);
      this.pitch = Math.max(-1.55, Math.min(1.55, this.pitch));
    }

    // --- Liikkumissuunta
    _fwd.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    _right.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    _wish.set(0, 0, 0);
    if (alive) {
      if (input.down('KeyW') || input.down('ArrowUp')) _wish.add(_fwd);
      if (input.down('KeyS') || input.down('ArrowDown')) _wish.sub(_fwd);
      if (input.down('KeyD') || input.down('ArrowRight')) _wish.add(_right);
      if (input.down('KeyA') || input.down('ArrowLeft')) _wish.sub(_right);
    }
    const moving = _wish.lengthSq() > 0;
    if (moving) _wish.normalize();

    if (this.flying && alive) {
      this._fly(dt, input);
      this._post(dt, alive);
      return;
    }
    if (this.riding) {
      this._ride();
      this._post(dt, alive);
      return;
    }

    // Kyykky [Ctrl] tai [C] (päälle/pois). Juoksu tai hyppy nostaa ylös.
    if (alive && input.enabled && (input.pressed.has('ControlLeft') || input.pressed.has('ControlRight') || input.pressed.has('KeyC'))) {
      this.crouching = !this.crouching && this.inWater < 2;
    }
    if (this.inWater === 2) this.crouching = false;

    const wantSprint = (input.down('ShiftLeft') || input.down('ShiftRight')) && moving && alive;
    this.sprinting = wantSprint && this.stamina > 1 && this.inWater < 2 && this.moveMul > 0.9;
    if (this.sprinting) {
      this.crouching = false;
      this.stamina = Math.max(0, this.stamina - CONFIG.staminaSprintPerSec * dt);
      this.staminaDelay = CONFIG.staminaRegenDelay;
    }

    let speed = this.sprinting ? CONFIG.sprintSpeed : CONFIG.walkSpeed;
    speed *= this.speedMul * this.moveMul * this.speedBoost;
    if (this.crouching) speed *= CONFIG.crouchSpeed;
    if (this.inWater === 1) speed *= 0.7;
    if (this.inWater === 2) speed *= this.stamina > 0 ? 0.5 : 0.35;

    // --- Kiihtyvyys
    const accel = this.onGround || this.inWater ? 14 : 2.5;
    const tvx = _wish.x * speed;
    const tvz = _wish.z * speed;
    const k = 1 - Math.exp(-accel * dt);
    this.velocity.x += (tvx - this.velocity.x) * k;
    this.velocity.z += (tvz - this.velocity.z) * k;

    // --- Hyppy ja painovoima
    if (input.pressed.has('Space') && input.enabled && alive && this.onGround && this.inWater < 2) {
      if (this.crouching) {
        this.crouching = false;
      } else if (this.useStamina(CONFIG.staminaJump)) {
        this.velocity.y = CONFIG.jumpSpeed;
        this.onGround = false;
      }
    }
    if (this.inWater < 2) this.velocity.y -= CONFIG.gravity * dt;

    // --- Liike + törmäykset
    const p = this.position;
    p.x += (this.velocity.x + this.knock.x) * dt;
    p.z += (this.velocity.z + this.knock.z) * dt;
    p.y += this.velocity.y * dt;
    this.knock.multiplyScalar(Math.exp(-dt * (this.inWater ? 9 : 6)));

    const pr = CONFIG.playerRadius;
    world.collidersNear(p.x, p.z, 3, _colliders);
    for (const c of _colliders) {
      let cx = c.x, cz = c.z;
      if (c.seg) {
        // Kaatunut runko: lähin piste janalla. Rungon päälle voi hypätä.
        if (p.y > c.top - 0.15) continue;
        const ux = c.bx - c.ax, uz = c.bz - c.az;
        const t = Math.max(0, Math.min(1, ((p.x - c.ax) * ux + (p.z - c.az) * uz) / (ux * ux + uz * uz || 1)));
        cx = c.ax + ux * t;
        cz = c.az + uz * t;
      }
      const dx = p.x - cx;
      const dz = p.z - cz;
      const min = c.r + pr;
      const d2 = dx * dx + dz * dz;
      if (d2 < min * min && d2 > 1e-8) {
        const d = Math.sqrt(d2);
        const push = (min - d) / d;
        p.x += dx * push;
        p.z += dz * push;
      }
    }

    // --- Maailman reuna: työnnä takaisin kohti keskustaa
    const edge = edgeFactor(p.x, p.z);
    if (edge > 0.985) {
      const len = Math.hypot(p.x, p.z) || 1;
      const push = (edge - 0.985) * 400 * dt + 0.02;
      p.x -= (p.x / len) * push;
      p.z -= (p.z / len) * push;
      this.atEdge = true;
    } else {
      this.atEdge = false;
    }

    // --- Maa ja vesi (meri, järvet ja joet omalla korkeudellaan)
    waterAt(p.x, p.z, _wq);
    let ground = _wq.h;
    // Rakennetut lattiat: päälle voi astua (askel enintään 0,5 m).
    for (const pf of world.platforms) {
      if (p.x < pf.x0 - 0.1 || p.x > pf.x1 + 0.1 || p.z < pf.z0 - 0.1 || p.z > pf.z1 + 0.1) continue;
      if (pf.y > ground && p.y >= pf.y - 0.5) ground = pf.y;
    }
    this.onPlatform = ground > _wq.h + 0.05; // askeleiden ääni: puulattia
    const still = _wq.wl - ground;
    const W = this.waves;
    const amp = W.amp * openFactor(_wq.type, still, _wq.ocean, _wq.lakeR);
    const surface = _wq.wl + (still > 0 ? waveHeight(p.x, p.z, W.t, amp, W.windX, W.windZ) : 0);
    const depth = surface - ground;
    const prevFeet = p.y - this.velocity.y * dt;
    // Vedessä ollaan vasta, kun jalat ovat pinnan alla (ei ilmassa veden yllä).
    const feetUnder = p.y < surface + 0.05;
    this.inWater = !feetUnder || depth <= 0.1 ? 0 : depth > 1.25 ? 2 : 1;
    this.surface = depth > 0 ? surface : -Infinity;
    this.waterDepth = Math.max(0, depth);
    // Veteen hyppääminen tai putoaminen: roiske kokoa vastaavasti.
    if (depth > 0.05 && prevFeet > surface && p.y <= surface + 0.05 && this.velocity.y < -2.5) {
      this.onWater?.('splash', p.x, surface, p.z, Math.min(2.2, -this.velocity.y / 4));
    }
    if (this.inWater === 2) {
      // Uidaan pinnalla, aaltojen mukana (silmät pysyvät pinnan yläpuolella).
      // Hukkuessa pää painuu lähemmäs pintaa.
      const sink = this.drowning * (0.2 + Math.sin(this.swimTime * 3.1) * 0.05);
      const swimY = surface - 1.25 - sink;
      if (this.velocity.y < -0.5 && p.y > swimY) {
        // Pudottiin veteen: vauhti hidastuu nopeasti
        this.velocity.y *= Math.exp(-dt * 9);
      } else {
        p.y += (swimY - p.y) * Math.min(1, dt * 5);
        this.velocity.y = 0;
      }
      if (p.y < swimY - 0.2) p.y = swimY - 0.2;
      this.onGround = false;
    } else if (p.y <= ground) {
      if (!this.onGround && this.velocity.y < -6) this.landDip = Math.min(0.18, -this.velocity.y * 0.015);
      // Alastulo hypystä tai pudotuksesta: askeleen ääni (voimakkaampi).
      if (!this.onGround && this.velocity.y < -3.5 && !this.riding) this.onFootstep?.(Math.min(1.6, -this.velocity.y / 6));
      p.y = ground;
      this.velocity.y = 0;
      this.onGround = true;
    } else {
      // Pysy kiinni maassa alamäessä.
      this.onGround = this.onGround && p.y - ground < 0.35 && this.velocity.y <= 0;
      if (this.onGround) p.y = ground;
    }

    // Liike vedessä jättää vanan (väreily) ja juostessa roiskii.
    if (this.inWater) {
      const hs0 = Math.hypot(this.velocity.x, this.velocity.z);
      this.wakeTimer -= dt;
      if (hs0 > 0.6 && this.wakeTimer <= 0) {
        this.wakeTimer = this.inWater === 2 ? 0.32 : 0.24;
        this.onWater?.('wake', p.x, surface, p.z, Math.min(1, hs0 / CONFIG.sprintSpeed) * (this.inWater === 2 ? 1 : 0.7));
        if (this.inWater === 1 && hs0 > 3) this.onWater?.('step', p.x, surface, p.z, hs0 / CONFIG.sprintSpeed);
      }
    }

    this._post(dt, alive);
  }

  // Lentäminen (kehittäjätyökalut): Välilyönti ylös, Ctrl/C alas, Shift nopeammin.
  // Ei painovoimaa eikä törmäyksiä; pysyy maan ja veden pinnan yläpuolella.
  _fly(dt, input) {
    const p = this.position;
    let up = 0;
    if (input.down('Space')) up += 1;
    if (input.down('ControlLeft') || input.down('ControlRight') || input.down('KeyC')) up -= 1;
    const fast = input.down('ShiftLeft') || input.down('ShiftRight');
    const speed = 12 * this.speedBoost * (fast ? 2.5 : 1);
    const k = 1 - Math.exp(-dt * 8);
    this.velocity.x += (_wish.x * speed - this.velocity.x) * k;
    this.velocity.z += (_wish.z * speed - this.velocity.z) * k;
    this.velocity.y += (up * speed * 0.7 - this.velocity.y) * k;
    p.addScaledVector(this.velocity, dt);
    const edge = edgeFactor(p.x, p.z);
    this.atEdge = edge > 0.985;
    if (this.atEdge) {
      const len = Math.hypot(p.x, p.z) || 1;
      const push = (edge - 0.985) * 400 * dt + 0.02;
      p.x -= (p.x / len) * push;
      p.z -= (p.z / len) * push;
    }
    const w = waterAt(p.x, p.z, _wq);
    const floor = Math.max(w.h, w.wl);
    if (p.y < floor) { p.y = floor; if (this.velocity.y < 0) this.velocity.y = 0; }
    this.onGround = p.y <= floor + 0.02;
    this.inWater = 0;
    this.surface = w.wl > w.h ? w.wl : -Infinity;
    this.waterDepth = 0;
    this.crouching = false;
    this.sprinting = false;
  }

  // Veneessä: paikka tulee veneeltä (game/boats.js), ei painovoimaa eikä uintia.
  _ride() {
    this.velocity.set(0, 0, 0);
    this.knock.set(0, 0, 0);
    this.onGround = true;
    this.inWater = 0;
    this.surface = -Infinity;
    this.waterDepth = 0;
    this.crouching = false;
    this.sprinting = false;
    this.atEdge = !!this.riding.atEdge;
  }

  // Kestävyys, terveys, uinnin kulutus ja kamera (joka ruudulla lopuksi).
  _post(dt, alive) {
    const p = this.position;
    // --- Uinti kuluttaa kestävyyttä; kun se loppuu, alkaa hukkuminen.
    if (this.inWater === 2 && alive) {
      this.swimTime += dt;
      const hs1 = Math.hypot(this.velocity.x, this.velocity.z);
      const drain = hs1 > 0.5 ? CONFIG.staminaSwimPerSec : CONFIG.staminaTreadPerSec;
      this.stamina = Math.max(0, this.stamina - drain * dt);
      this.staminaDelay = Math.max(this.staminaDelay, 0.6);
      if (this.stamina <= 0) {
        this.drowning = Math.min(1, this.drowning + dt * 1.5);
        this.drownTimer += dt;
        if (this.drownTimer >= 1) {
          this.drownTimer -= 1;
          this.hurt(CONFIG.drownPerSec, { cause: 'drown' });
          if (!this.dead) this.onWater?.('wake', p.x, this.surface, p.z, 1);
        }
      } else {
        this.drowning = Math.max(0, this.drowning - dt * 0.8);
        this.drownTimer = 0;
      }
    } else {
      this.swimTime = 0;
      this.drowning = Math.max(0, this.drowning - dt * 1.2);
      this.drownTimer = 0;
    }

    // --- Kestävyyden ja terveyden palautuminen
    if (this.god && alive) { this.stamina = CONFIG.staminaMax; this.health = CONFIG.healthMax; }
    if (this.staminaDelay > 0) this.staminaDelay -= dt;
    else this.stamina = Math.min(CONFIG.staminaMax, this.stamina + CONFIG.staminaRegenPerSec * this.staminaRegenMul * this.survivalStaminaMul * dt);
    if (alive) {
      if (this.healthDelay > 0) this.healthDelay -= dt;
      else if (this.health < CONFIG.healthMax) this.health = Math.min(CONFIG.healthMax, this.health + CONFIG.healthRegenPerSec * this.survivalHealthMul * dt);
    } else {
      this.deathT += dt;
    }

    // --- Pään heilunta
    const hs = Math.hypot(this.velocity.x, this.velocity.z);
    this.speedNow = hs;
    const bobTarget = this.onGround && hs > 0.5 ? Math.min(1, hs / CONFIG.walkSpeed) : 0;
    this.bobAmount += (bobTarget - this.bobAmount) * Math.min(1, dt * 8);
    this.bobPhase += hs * dt * 1.9;
    // Askel joka puolikkaalla heiluntajaksolla (pää alimmillaan = jalka maahan).
    const stepN = Math.floor((this.bobPhase + Math.PI * 0.75) / Math.PI);
    if (stepN !== this.stepN) {
      this.stepN = stepN;
      if ((this.onGround || this.inWater === 1) && hs > 1 && !this.riding && !this.flying && !this.dead) {
        this.onFootstep?.(this.sprinting ? 1.25 : this.crouching ? 0.35 : 0.8);
      }
    }
    this.landDip *= Math.exp(-dt * 8);

    // Kyykky laskee silmien korkeutta pehmeästi; kuollessa kamera kaatuu maahan.
    this.crouchBlend += ((this.crouching ? 1 : 0) - this.crouchBlend) * Math.min(1, dt * 10);
    let eyeH = this.riding ? this.rideEye : CONFIG.eyeHeight + (CONFIG.crouchEyeHeight - CONFIG.eyeHeight) * this.crouchBlend;
    let roll = this.riding ? this.rideRoll : 0;
    if (this.dead) {
      const k = 1 - Math.exp(-this.deathT * 3);
      eyeH += (0.32 - eyeH) * (this.inWater === 2 ? 0.25 : k);
      roll = 0.55 * k;
    }
    const bobK = this.crouching ? 0.6 : 1;
    const bobY = Math.sin(this.bobPhase * 2) * 0.045 * this.bobAmount * bobK;
    const bobX = Math.cos(this.bobPhase) * 0.03 * this.bobAmount * bobK;
    this.hurtKick *= Math.exp(-dt * 9);
    this.hurtRoll *= Math.exp(-dt * 7);
    this.camera.position.set(
      p.x + _right.x * bobX,
      p.y + eyeH + bobY - this.landDip,
      p.z + _right.z * bobX,
    );
    this.camera.rotation.set(this.pitch + this.hurtKick, this.yaw, roll + this.hurtRoll, 'YXZ');
  }

  teleport(x, z) {
    const w = waterAt(x, z, _wq);
    // Syvään veteen siirtyessä ollaan heti pinnalla.
    const y = w.wl - w.h > 1.25 ? w.wl - 1.25 : w.h + 0.1;
    this.position.set(x, y, z);
    this.velocity.set(0, 0, 0);
  }

  serialize() {
    const p = this.position;
    return { x: p.x, y: p.y, z: p.z, yaw: this.yaw, pitch: this.pitch, hp: Math.round(this.health * 10) / 10 };
  }

  load(d) {
    if (!d || !Number.isFinite(d.x) || !Number.isFinite(d.z)) return false;
    this.position.set(d.x, Math.max(d.y || 0, heightAt(d.x, d.z)), d.z);
    this.yaw = d.yaw || 0;
    this.pitch = d.pitch || 0;
    this.health = Number.isFinite(d.hp) && d.hp > 0 ? Math.min(CONFIG.healthMax, d.hp) : CONFIG.healthMax;
    this.dead = false;
    return true;
  }
}
