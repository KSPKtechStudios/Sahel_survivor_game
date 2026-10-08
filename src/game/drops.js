// Maahan pudonneet esineet. Kun jotain hajoaa, saaliit lennähtävät maahan
// fyysisinä esineinä. Ne poimitaan [E]:llä tai ne imaistaan automaattisesti,
// kun pelaaja kävelee niiden yli. Esineillä on pieni hehku, jotta ne erottaa
// maasta. Heitettyä esinettä ei poimita automaattisesti heti takaisin:
// pelaaja heitti sen tarkoituksella (ks. throwItem).
import * as THREE from 'three';
import { heightAt, waterAt, WATER } from '../world/terrain.js';
import { waveHeight, openFactor } from '../world/waves.js';
import { ITEMS } from './items.js';
import { events } from './events.js';

const PICK_RADIUS = 1.5;    // automaattinen poiminta
const THROW_BLOCK = 10;     // s: heitettyä esinettä ei poimita automaattisesti
const THROW_AWAY = 3;       // m: ja vasta kun pelaaja on välillä käynyt kauempana

// Kiillon tekstuuri: pieni pehmeä ydin ja neljä ohutta sädettä (sessio 11:
// hento kiilto, ei isoa hehkua).
function glowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 14);
  gr.addColorStop(0, 'rgba(255,250,235,1)');
  gr.addColorStop(0.35, 'rgba(255,240,205,0.35)');
  gr.addColorStop(1, 'rgba(255,230,190,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 64, 64);
  g.globalCompositeOperation = 'lighter';
  for (const [w, h] of [[30, 1.6], [1.6, 30]]) {
    const lg = w > h ? g.createLinearGradient(32 - w, 0, 32 + w, 0) : g.createLinearGradient(0, 32 - h, 0, 32 + h);
    lg.addColorStop(0, 'rgba(255,245,220,0)');
    lg.addColorStop(0.5, 'rgba(255,245,220,0.55)');
    lg.addColorStop(1, 'rgba(255,245,220,0)');
    g.fillStyle = lg;
    g.fillRect(32 - w, 32 - h, w * 2, h * 2);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
// Kuinka korkealla maasta esine lepää (mallin paksuus makuuasennossa).
const REST_Y = {
  stick: 0.025, stone: 0.07, fiber: 0.03, wood: 0.09, stone_axe: 0.03, stone_pick: 0.03, campfire: 0.05, gold_nugget: 0.02, cowrie: 0.02, bronze_bracelet: 0.02,
  wooden_club: 0.06, machete: 0.016, shield: 0.06, raw_meat: 0.03, hide: 0.01, clay: 0.03,
};
const MAX_DROPS = 250;
// Sessio 21: maassa oleva esine katoaa 10 minuutissa (kutistuu pois).
const DESPAWN = 600;
const DESPAWN_FADE = 0.5;
const LIE = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2);
const _q = new THREE.Quaternion();
const _axis = new THREE.Vector3();
const _v = new THREE.Vector3();
const _oc = new THREE.Vector3();

export class Drops {
  constructor(scene, itemGeometries) {
    this.scene = scene;
    this.geos = itemGeometries;
    this.list = [];
    this.material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.8,
      emissive: 0xffd9a0,
      emissiveIntensity: 0.06,
    });
    // Arvoesineet kiiltävät ja hehkuvat kullanvärisinä.
    this.valuableMaterial = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.35,
      metalness: 0.6,
      emissive: 0xffc040,
      emissiveIntensity: 0.25,
    });
    // Hehku (kasvot aina kameraan päin, lisäävä sekoitus)
    const map = glowTexture();
    this.glowMat = new THREE.SpriteMaterial({ map, color: 0xfff0d0, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.18 });
    this.glowMatValuable = new THREE.SpriteMaterial({ map, color: 0xffd070, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.3 });
    this.fullWarned = 0;
    this.waves = { amp: 0, windX: 1, windZ: 0, t: 0 };
    this.onWater = null; // (laji, x, y, z, voima) roiskeet ja väreily
  }

  // Pudota count kappaletta esinettä. Isot määrät jaetaan muutamaan kasaan.
  spawn(item, count, pos, { spread = 1, up = 1 } = {}) {
    if (!ITEMS[item] || count <= 0) return;
    const piles = Math.min(count, 4);
    const base = Math.floor(count / piles);
    let extra = count - base * piles;
    for (let i = 0; i < piles; i++) {
      const n = base + (extra-- > 0 ? 1 : 0);
      const vel = new THREE.Vector3((Math.random() - 0.5) * 3 * spread, (2.5 + Math.random() * 2) * up, (Math.random() - 0.5) * 3 * spread);
      this._add(item, n, pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.3, 0.2, (Math.random() - 0.5) * 0.3)), vel, false);
    }
  }

  _add(item, count, pos, vel, resting) {
    if (this.list.length >= MAX_DROPS) this._remove(this.list[0]);
    const mesh = new THREE.Mesh(this.geos[item], ITEMS[item].valuable ? this.valuableMaterial : this.material);
    mesh.castShadow = true;
    mesh.position.copy(pos);
    const yaw = Math.random() * Math.PI * 2;
    const rest = new THREE.Quaternion().setFromAxisAngle(THREE.Object3D.DEFAULT_UP, yaw).multiply(LIE);
    if (resting) mesh.quaternion.copy(rest);
    else mesh.quaternion.setFromEuler(new THREE.Euler(Math.random() * 6, Math.random() * 6, Math.random() * 6));
    this.scene.add(mesh);
    // Hehku esineen ympärille (koko mallin mukaan)
    const geo = this.geos[item];
    if (!geo.boundingSphere) geo.computeBoundingSphere();
    const glow = new THREE.Sprite(ITEMS[item].valuable ? this.glowMatValuable : this.glowMat);
    const gs = Math.min(0.6, Math.max(0.3, 0.25 + geo.boundingSphere.radius * 0.7));
    glow.scale.setScalar(gs);
    glow.renderOrder = 3;
    glow.userData.base = gs;
    glow.userData.phase = Math.random() * 100;
    mesh.add(glow);
    const d = {
      item, count, mesh, vel, rest,
      spin: resting ? new THREE.Vector3() : new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(10),
      resting, age: resting ? 10 : 0, left: DESPAWN, magnet: null, blockedUntil: 0, thrown: false, leftZone: true, glow,
      // Vesi: w = viimeisin näyte, floating = kelluu pinnalla, wet = osui veteen
      w: null, wTimer: 0, floating: false, wet: false, flowX: 0, flowZ: 0, bob: Math.random() * 6,
    };
    this.list.push(d);
    return d;
  }

  _remove(d) {
    const i = this.list.indexOf(d);
    if (i >= 0) this.list.splice(i, 1);
    this.scene.remove(d.mesh);
  }

  // Aloita poiminta (lentää pelaajaan). manual = [E]-painallus.
  pick(d, manual = false) {
    if (d.magnet) return;
    d.magnet = { t: 0, from: d.mesh.position.clone(), manual };
  }

  update(dt, elapsed, player, inventory) {
    this.material.emissiveIntensity = 0.05 + (Math.sin(elapsed * 3) * 0.5 + 0.5) * 0.08;
    this.valuableMaterial.emissiveIntensity = 0.2 + (Math.sin(elapsed * 4) * 0.5 + 0.5) * 0.35;
    this.glowMat.opacity = 0.14 + (Math.sin(elapsed * 2.4) * 0.5 + 0.5) * 0.06;
    this.glowMatValuable.opacity = 0.24 + (Math.sin(elapsed * 3.2) * 0.5 + 0.5) * 0.12;
    const chest = _v.copy(player.position);
    chest.y += 1.0;
    for (let i = this.list.length - 1; i >= 0; i--) {
      const d = this.list[i];
      d.age += dt;
      if (!d.magnet) {
        d.left -= dt;
        if (d.left <= 0) {
          const k = Math.min(1, -d.left / DESPAWN_FADE);
          d.mesh.scale.setScalar(Math.max(0.001, 1 - k * k));
          if (k >= 1) { this._remove(d); continue; }
        }
      }
      const p = d.mesh.position;
      // Kiilto välähtää silloin tällöin pikkuisen isompana (oma tahti).
      if (d.glow) {
        const gu = d.glow.userData;
        const gl = Math.pow(Math.max(0, Math.sin(elapsed * 0.9 + gu.phase)), 40);
        d.glow.scale.setScalar(gu.base * (1 + 0.8 * gl));
      }

      if (d.magnet) {
        d.magnet.t += dt / 0.2;
        const t = Math.min(1, d.magnet.t);
        p.lerpVectors(d.magnet.from, chest, t * t);
        d.mesh.scale.setScalar(1 - t * 0.6);
        if (t >= 1) {
          const left = inventory.add(d.item, d.count);
          const got = d.count - left;
          if (got > 0) {
            events.emit('notify', { item: d.item, count: got });
            for (let k = 0; k < got; k++) events.emit('pickup', { type: d.item, drop: true });
          }
          if (left > 0) {
            // Ei mahtunut: jää maahan
            d.count = left;
            d.magnet = null;
            d.mesh.scale.setScalar(1);
            p.copy(chest).addScaledVector(new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5), 1.2);
            d.vel.set(0, 1, 0);
            d.resting = false;
            d.blockedUntil = elapsed + 4;
            if (elapsed > this.fullWarned) {
              events.emit('message', { text: 'Reppu on täynnä' });
              this.fullWarned = elapsed + 3;
            }
          } else {
            this._remove(d);
          }
        }
        continue;
      }

      if (!d.resting) {
        const rest = REST_Y[d.item] ?? 0.05;
        // Veden näyte harvakseltaan (kallis), aallot joka ruudulla.
        d.wTimer -= dt;
        if (!d.w || d.wTimer <= 0) {
          d.w = waterAt(p.x, p.z, d.w || {});
          d.wTimer = d.floating ? 0.25 : 0.05;
          this._flow(d);
        }
        const still = d.w.wl - d.w.h;
        const W = this.waves;
        const surf = still > 0.03 ? d.w.wl + waveHeight(p.x, p.z, W.t, W.amp * openFactor(d.w.type, still, d.w.ocean, d.w.lakeR), W.windX, W.windZ) : -Infinity;
        if (surf > -Infinity && p.y <= surf + 0.02 && !d.wet) {
          // Osui veteen: roiske ja väreily esineen koon ja vauhdin mukaan
          d.wet = true;
          const speed = d.vel.length();
          this.onWater?.('drop', p.x, surf, p.z, Math.min(1.2, 0.15 + speed * 0.08) * (ITEMS[d.item].floats ? 0.8 : 1));
        }
        if (d.wet && surf > -Infinity && p.y < surf + 0.2) {
          if (ITEMS[d.item].floats) {
            // Kelluu: noste painaa pintaan, virta ja tuuli kuljettavat.
            const target = surf + rest * 0.4;
            d.vel.y += ((target - p.y) * 40 - d.vel.y * 6) * dt;
            const k = Math.exp(-dt * 2.5);
            d.vel.x = d.flowX + (d.vel.x - d.flowX) * k;
            d.vel.z = d.flowZ + (d.vel.z - d.flowZ) * k;
            d.floating = true;
            d.spin.multiplyScalar(Math.exp(-dt * 4));
            d.mesh.quaternion.slerp(d.rest, Math.min(1, dt * 3));
          } else {
            // Uppoaa hitaasti pohjaan
            d.vel.y = Math.max(d.vel.y - 3 * dt, -1.1);
            d.vel.x *= Math.exp(-dt * 3);
            d.vel.z *= Math.exp(-dt * 3);
            d.floating = false;
          }
          p.addScaledVector(d.vel, dt);
          if (p.y <= d.w.h + rest) {
            p.y = d.w.h + rest;
            // Kelluva esine nousee pohjasta takaisin pintaan, jos vettä riittää.
            if (ITEMS[d.item].floats && still > 0.15) {
              d.vel.y = Math.max(0, d.vel.y);
            } else {
              d.vel.set(0, 0, 0);
              d.resting = true;
              d.floating = false;
            }
          }
          // Kelluva esine ajautui rantaan
          if (d.floating && still <= 0.03) d.floating = false;
          if (d.floating) {
            d.bob += dt;
            const tilt = Math.sin(d.bob * 1.7) * 0.06;
            _q.setFromAxisAngle(_axis.set(1, 0, 0), tilt * dt);
            d.mesh.quaternion.premultiply(_q);
          }
        } else {
          if (still <= 0.03) d.wet = false;
          this._fall(d, p, dt, d.w.h + rest);
        }
      } else {
        // Asetu makaamaan
        d.mesh.quaternion.slerp(d.rest, Math.min(1, dt * 8));
        if (d.age < 12) p.y += (heightAt(p.x, p.z) + (REST_Y[d.item] ?? 0.05) - p.y) * Math.min(1, dt * 8);
      }

      // Automaattinen poiminta, kun pelaaja kävelee yli. Heitetty esine
      // odottaa, kunnes pelaaja on käynyt kauempana (ei poimita heti takaisin).
      if (d.age > 0.6) {
        const dx = p.x - player.position.x;
        const dz = p.z - player.position.z;
        const dy = p.y - player.position.y;
        const d2 = dx * dx + dz * dz;
        if (!d.leftZone && elapsed > d.blockedUntil && d2 > THROW_AWAY * THROW_AWAY) d.leftZone = true;
        if (elapsed > d.blockedUntil && d.leftZone && d2 < PICK_RADIUS * PICK_RADIUS && dy > -1 && dy < 2.2) this.pick(d);
      }
    }
  }

  // Lento ilmassa ja pomppu maahan.
  _fall(d, p, dt, ground) {
    d.vel.y -= 14 * dt;
    p.addScaledVector(d.vel, dt);
    if (p.y <= ground) {
      p.y = ground;
      if (d.vel.y < -1.5) {
        d.vel.y *= -0.3;
        d.vel.x *= 0.55;
        d.vel.z *= 0.55;
        d.spin.multiplyScalar(0.5);
      } else {
        d.vel.set(0, 0, 0);
        d.resting = true;
      }
    }
    const sp = d.spin.length();
    if (sp > 0.01 && !d.resting) {
      _axis.copy(d.spin).divideScalar(sp);
      _q.setFromAxisAngle(_axis, sp * dt);
      d.mesh.quaternion.premultiply(_q);
    }
  }

  // Virtauksen nopeus esineen kohdalla (joet ja purot: alamäkeen pintaa pitkin;
  // meri ja järvet: tuuli kuljettaa hiljaa).
  _flow(d) {
    d.flowX = 0;
    d.flowZ = 0;
    const w = d.w;
    if (!w || w.wl <= w.h) return;
    if (w.type === WATER.RIVER || w.type === WATER.STREAM) {
      d.flowX = w.flowX * 0.9;
      d.flowZ = w.flowZ * 0.9;
    } else {
      d.flowX = this.waves.windX * 0.15;
      d.flowZ = this.waves.windZ * 0.15;
    }
  }

  // Heitä esine (Q): lentää katseen suuntaan.
  throwItem(item, count, pos, dir, elapsed) {
    if (!ITEMS[item] || count <= 0) return null;
    const vel = new THREE.Vector3().copy(dir).multiplyScalar(7.5).add(new THREE.Vector3(0, 2.2, 0));
    const d = this._add(item, count, pos.clone(), vel, false);
    d.blockedUntil = elapsed + THROW_BLOCK;
    d.thrown = true;
    d.leftZone = false;
    return d;
  }

  raycast(origin, dir, maxDist) {
    let best = null;
    for (const d of this.list) {
      if (d.magnet) continue;
      _oc.subVectors(d.mesh.position, origin);
      const r = 0.38;
      const tca = _oc.dot(dir);
      if (tca < -r) continue;
      const d2 = _oc.lengthSq() - tca * tca;
      if (d2 > r * r) continue;
      const t = Math.max(0, tca - Math.sqrt(r * r - d2));
      if (t <= maxDist && (!best || t < best.t)) best = { obj: d, t };
    }
    return best;
  }

  clear() {
    for (const d of this.list) this.scene.remove(d.mesh);
    this.list = [];
  }

  serialize() {
    return this.list
      .filter((d) => !d.magnet)
      .filter((d) => d.left > 0)
      .map((d) => ({ item: d.item, count: d.count, x: +d.mesh.position.x.toFixed(2), y: +d.mesh.position.y.toFixed(2), z: +d.mesh.position.z.toFixed(2), t: Math.round(d.left) }));
  }

  load(list) {
    this.clear();
    if (!Array.isArray(list)) return;
    for (const s of list) {
      if (s && ITEMS[s.item] && s.count > 0 && Number.isFinite(s.x) && Number.isFinite(s.z)) {
        const d = this._add(s.item, s.count, new THREE.Vector3(s.x, s.y, s.z), new THREE.Vector3(), true);
        if (Number.isFinite(s.t)) d.left = Math.max(1, Math.min(DESPAWN, s.t));
      }
    }
  }
}
