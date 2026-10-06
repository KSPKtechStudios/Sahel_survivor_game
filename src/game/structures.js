// Pelaajan asettamat rakennelmat (tällä hetkellä nuotio).
// Valoja on kiinteä määrä, ja ne jaetaan lähimmille nuotioille: näin
// valojen määrä ei muutu eikä shadereita tarvitse kääntää uudelleen.
import * as THREE from 'three';
import { createFlameTexture } from '../render/textures.js';

const MAX_FIRE_LIGHTS = 3;

export class Structures {
  constructor(scene, models, world) {
    this.scene = scene;
    this.world = world;
    this.list = [];
    this.baseGeo = models.campfire;
    this.material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 });
    this.flameMat = new THREE.SpriteMaterial({
      map: createFlameTexture(),
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      fog: true,
    });
    this.lights = [];
    for (let i = 0; i < MAX_FIRE_LIGHTS; i++) {
      const l = new THREE.PointLight(0xff8a3a, 0, 22, 1.6);
      l.castShadow = false;
      scene.add(l);
      this.lights.push(l);
    }

    // Esikatselu ("haamu") asettamista varten
    this.ghostMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.55,
      color: 0x88ff88,
      depthWrite: false,
    });
    this.ghost = new THREE.Mesh(this.baseGeo, this.ghostMat);
    this.ghost.visible = false;
    scene.add(this.ghost);
    this.nearestFire = Infinity;
  }

  add(type, x, y, z, rot = 0) {
    const group = new THREE.Group();
    group.position.set(x, y, z);
    group.rotation.y = rot;
    const base = new THREE.Mesh(this.baseGeo, this.material);
    base.castShadow = true;
    base.receiveShadow = true;
    group.add(base);
    const flames = [];
    for (let i = 0; i < 3; i++) {
      const s = new THREE.Sprite(this.flameMat);
      s.position.set((i - 1) * 0.08, 0.35, (i % 2) * 0.06 - 0.03);
      s.scale.set(0.5, 0.9, 1);
      group.add(s);
      flames.push(s);
    }
    this.scene.add(group);
    const collider = { x, z, r: 0.55, obj: null };
    this.world.extraColliders.push(collider);
    const st = { type, x, y, z, rot, group, flames, collider, seed: Math.random() * 100 };
    this.list.push(st);
    return st;
  }

  update(dt, elapsed, playerPos) {
    // Liekkien lepatus
    for (const st of this.list) {
      st.flames.forEach((f, i) => {
        const t = elapsed * (7 + i * 1.7) + st.seed + i * 2;
        const k = 0.85 + Math.sin(t) * 0.1 + Math.sin(t * 2.3) * 0.06;
        f.scale.set(0.45 * k + i * 0.03, 0.85 * k * (1.05 - i * 0.12), 1);
        f.position.y = 0.32 + (0.85 * k) * 0.35;
      });
    }
    // Valot lähimmille nuotioille
    const sorted = this.list
      .map((st) => ({ st, d: (st.x - playerPos.x) ** 2 + (st.z - playerPos.z) ** 2 }))
      .sort((a, b) => a.d - b.d);
    this.nearestFire = sorted.length ? Math.sqrt(sorted[0].d) : Infinity;
    this.lights.forEach((l, i) => {
      const e = sorted[i];
      if (!e || e.d > 120 * 120) { l.intensity = 0; return; }
      const st = e.st;
      l.position.set(st.x, st.y + 0.9, st.z);
      const t = elapsed * 9 + st.seed;
      l.intensity = 9 * (0.85 + Math.sin(t) * 0.08 + Math.sin(t * 2.7) * 0.07);
    });
  }

  showGhost(pos, valid) {
    if (!pos) { this.ghost.visible = false; return; }
    this.ghost.visible = true;
    this.ghost.position.copy(pos);
    this.ghostMat.color.set(valid ? 0x88ff88 : 0xff6655);
  }

  clear() {
    for (const st of this.list) {
      this.scene.remove(st.group);
      const i = this.world.extraColliders.indexOf(st.collider);
      if (i >= 0) this.world.extraColliders.splice(i, 1);
    }
    this.list = [];
    this.nearestFire = Infinity;
    for (const l of this.lights) l.intensity = 0;
  }

  serialize() {
    return this.list.map((s) => ({ type: s.type, x: s.x, y: s.y, z: s.z, rot: s.rot }));
  }

  load(list) {
    this.clear();
    if (!Array.isArray(list)) return;
    for (const s of list) {
      if (s && s.type === 'campfire' && Number.isFinite(s.x) && Number.isFinite(s.z)) {
        this.add(s.type, s.x, s.y, s.z, s.rot || 0);
      }
    }
  }
}
