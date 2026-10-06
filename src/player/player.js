// Pelaajan liikkuminen: kävely, juoksu, hyppy, törmäykset ja kestävyys.
import * as THREE from 'three';
import { CONFIG } from '../config.js';
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
  }

  get eye() {
    return this.camera.position;
  }

  useStamina(amount) {
    if (this.stamina < amount * 0.5) return false;
    this.stamina = Math.max(0, this.stamina - amount);
    this.staminaDelay = CONFIG.staminaRegenDelay;
    return true;
  }

  update(dt, input, world) {
    // --- Katse
    if (input.locked && input.enabled) {
      this.yaw -= input.mouseDX * input.sensitivity;
      this.pitch -= input.mouseDY * input.sensitivity * (input.invertY ? -1 : 1);
      this.pitch = Math.max(-1.55, Math.min(1.55, this.pitch));
    }

    // --- Liikkumissuunta
    _fwd.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    _right.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    _wish.set(0, 0, 0);
    if (input.down('KeyW') || input.down('ArrowUp')) _wish.add(_fwd);
    if (input.down('KeyS') || input.down('ArrowDown')) _wish.sub(_fwd);
    if (input.down('KeyD') || input.down('ArrowRight')) _wish.add(_right);
    if (input.down('KeyA') || input.down('ArrowLeft')) _wish.sub(_right);
    const moving = _wish.lengthSq() > 0;
    if (moving) _wish.normalize();

    const wantSprint = (input.down('ShiftLeft') || input.down('ShiftRight')) && moving;
    this.sprinting = wantSprint && this.stamina > 1 && this.inWater < 2;
    if (this.sprinting) {
      this.stamina = Math.max(0, this.stamina - CONFIG.staminaSprintPerSec * dt);
      this.staminaDelay = CONFIG.staminaRegenDelay;
    }

    let speed = this.sprinting ? CONFIG.sprintSpeed : CONFIG.walkSpeed;
    speed *= this.speedMul;
    if (this.inWater === 1) speed *= 0.7;
    if (this.inWater === 2) speed *= 0.5;

    // --- Kiihtyvyys
    const accel = this.onGround || this.inWater ? 14 : 2.5;
    const tvx = _wish.x * speed;
    const tvz = _wish.z * speed;
    const k = 1 - Math.exp(-accel * dt);
    this.velocity.x += (tvx - this.velocity.x) * k;
    this.velocity.z += (tvz - this.velocity.z) * k;

    // --- Hyppy ja painovoima
    if (input.pressed.has('Space') && input.enabled && this.onGround && this.inWater < 2) {
      if (this.useStamina(CONFIG.staminaJump)) {
        this.velocity.y = CONFIG.jumpSpeed;
        this.onGround = false;
      }
    }
    if (this.inWater < 2) this.velocity.y -= CONFIG.gravity * dt;

    // --- Liike + törmäykset
    const p = this.position;
    p.x += this.velocity.x * dt;
    p.z += this.velocity.z * dt;
    p.y += this.velocity.y * dt;

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
    const ground = _wq.h;
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
      const swimY = surface - 1.25;
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

    // --- Kestävyyden palautuminen
    if (this.staminaDelay > 0) this.staminaDelay -= dt;
    else this.stamina = Math.min(CONFIG.staminaMax, this.stamina + CONFIG.staminaRegenPerSec * dt);

    // --- Pään heilunta
    const hs = Math.hypot(this.velocity.x, this.velocity.z);
    this.speedNow = hs;
    const bobTarget = this.onGround && hs > 0.5 ? Math.min(1, hs / CONFIG.walkSpeed) : 0;
    this.bobAmount += (bobTarget - this.bobAmount) * Math.min(1, dt * 8);
    this.bobPhase += hs * dt * 1.9;
    this.landDip *= Math.exp(-dt * 8);

    const bobY = Math.sin(this.bobPhase * 2) * 0.045 * this.bobAmount;
    const bobX = Math.cos(this.bobPhase) * 0.03 * this.bobAmount;
    this.camera.position.set(
      p.x + _right.x * bobX,
      p.y + CONFIG.eyeHeight + bobY - this.landDip,
      p.z + _right.z * bobX,
    );
    this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
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
    return { x: p.x, y: p.y, z: p.z, yaw: this.yaw, pitch: this.pitch };
  }

  load(d) {
    if (!d || !Number.isFinite(d.x) || !Number.isFinite(d.z)) return false;
    this.position.set(d.x, Math.max(d.y || 0, heightAt(d.x, d.z)), d.z);
    this.yaw = d.yaw || 0;
    this.pitch = d.pitch || 0;
    return true;
  }
}
