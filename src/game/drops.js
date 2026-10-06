// Maahan pudonneet esineet. Kun jotain hajoaa, saaliit lennähtävät maahan
// fyysisinä esineinä. Ne poimitaan [E]:llä tai ne imaistaan automaattisesti,
// kun pelaaja kävelee niiden yli.
import * as THREE from 'three';
import { heightAt, WATER_LEVEL } from '../world/terrain.js';
import { ITEMS } from './items.js';
import { events } from './events.js';

const PICK_RADIUS = 1.5;    // automaattinen poiminta
// Kuinka korkealla maasta esine lepää (mallin paksuus makuuasennossa).
const REST_Y = { stick: 0.025, stone: 0.07, fiber: 0.03, wood: 0.09, stone_axe: 0.03, stone_pick: 0.03, campfire: 0.05, gold_nugget: 0.02, cowrie: 0.02, bronze_bracelet: 0.02 };
const MAX_DROPS = 250;
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
    this.fullWarned = 0;
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
    const d = {
      item, count, mesh, vel, rest,
      spin: resting ? new THREE.Vector3() : new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(10),
      resting, age: resting ? 10 : 0, magnet: null, blockedUntil: 0,
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
    const chest = _v.copy(player.position);
    chest.y += 1.0;
    for (let i = this.list.length - 1; i >= 0; i--) {
      const d = this.list[i];
      d.age += dt;
      const p = d.mesh.position;

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
        d.vel.y -= 14 * dt;
        p.addScaledVector(d.vel, dt);
        const ground = Math.max(heightAt(p.x, p.z), WATER_LEVEL - 0.3) + (REST_Y[d.item] ?? 0.05);
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
      } else {
        // Asetu makaamaan
        d.mesh.quaternion.slerp(d.rest, Math.min(1, dt * 8));
        p.y += (Math.max(heightAt(p.x, p.z), WATER_LEVEL - 0.3) + (REST_Y[d.item] ?? 0.05) - p.y) * Math.min(1, dt * 8);
      }

      // Automaattinen poiminta, kun pelaaja kävelee yli
      if (d.age > 0.6 && elapsed > d.blockedUntil) {
        const dx = p.x - player.position.x;
        const dz = p.z - player.position.z;
        const dy = p.y - player.position.y;
        if (dx * dx + dz * dz < PICK_RADIUS * PICK_RADIUS && dy > -1 && dy < 2.2) this.pick(d);
      }
    }
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
      .map((d) => ({ item: d.item, count: d.count, x: +d.mesh.position.x.toFixed(2), y: +d.mesh.position.y.toFixed(2), z: +d.mesh.position.z.toFixed(2) }));
  }

  load(list) {
    this.clear();
    if (!Array.isArray(list)) return;
    for (const s of list) {
      if (s && ITEMS[s.item] && s.count > 0 && Number.isFinite(s.x) && Number.isFinite(s.z)) {
        this._add(s.item, s.count, new THREE.Vector3(s.x, s.y, s.z), new THREE.Vector3(), true);
      }
    }
  }
}
