// Pelaajan rakennelmat: vasaralla rakennetut osat (työstöpenkki, nuotio,
// lattiat, seinät, katot, aidat, soihtutelineet, makuualusta).
//
// Tulisijat (nuotiot ja soihtutelineet) jakavat kiinteän määrän valoja:
// valot annetaan lähimmille, joten valojen määrä ei muutu eikä shadereita
// tarvitse kääntää uudelleen. Lattiat ovat kävelypintoja (world.platforms).
import * as THREE from 'three';
import { createFlameTexture } from '../render/textures.js';
import { PIECES } from './pieces.js';
import { STATIONS } from './items.js';

const MAX_FIRE_LIGHTS = 3;
const _ray = new THREE.Ray();
const _hit = new THREE.Vector3();

export class Structures {
  constructor(scene, models, world) {
    this.scene = scene;
    this.world = world;
    this.list = [];
    this.geos = models.build;
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
    this.ghost = new THREE.Mesh(this.geos.campfire, this.ghostMat);
    this.ghost.visible = false;
    this.ghost.renderOrder = 5;
    scene.add(this.ghost);
    this.nearestFire = Infinity;
    // Muut tulenlähteet (palavat savipeikot, mobs.js korvaa listan joka
    // ruudulla) jakavat samat valot: { x, y, z, seed }.
    this.extraFires = [];
    this.held = null; // kädessä oleva soihtu (main.js)
    this.keys = new Map(); // ruudukkoavain -> osa
    this.bed = null;       // herätyspaikka (viimeisin makuualusta)
  }

  add(type, x, y, z, rot = 0, key = null) {
    const def = PIECES[type];
    if (!def) return null;
    const group = new THREE.Group();
    group.position.set(x, y, z);
    group.rotation.y = rot;
    const mesh = new THREE.Mesh(this.geos[type], this.material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    const st = { type, x, y, z, rot, key, group, colliders: [], platform: null, flames: [], seed: Math.random() * 100 };
    if (def.fire) {
      const n = def.fire === 'campfire' ? 3 : 2;
      const fy = def.fire === 'campfire' ? 0.35 : 1.72;
      for (let i = 0; i < n; i++) {
        const s = new THREE.Sprite(this.flameMat);
        s.position.set((i - (n - 1) / 2) * 0.08, fy, (i % 2) * 0.06 - 0.03);
        group.add(s);
        st.flames.push(s);
      }
      st.fireY = def.fire === 'campfire' ? 0.9 : 1.9;
      st.fireScale = def.fire === 'campfire' ? 1 : 0.55;
    }
    this.scene.add(group);
    // Törmäykset ja lattiapinta maailman koordinaatteihin
    const c = Math.cos(rot), s = Math.sin(rot);
    const tx = (lx, lz) => [x + lx * c + lz * s, z - lx * s + lz * c];
    for (const col of def.colliders) {
      let wc;
      if (col.seg) {
        const [ax, az] = tx(col.ax, col.az);
        const [bx, bz] = tx(col.bx, col.bz);
        wc = { seg: true, ax, az, bx, bz, r: col.r, top: y + col.top, obj: null, piece: st };
      } else {
        const [cx, cz] = tx(col.x, col.z);
        wc = { x: cx, z: cz, r: col.r, obj: null, piece: st };
      }
      st.colliders.push(wc);
      this.world.extraColliders.push(wc);
    }
    if (def.platform) {
      const [x0, z0, x1, z1, top] = def.platform;
      const [ax, az] = tx(x0, z0);
      const [bx, bz] = tx(x1, z1);
      st.platform = { x0: Math.min(ax, bx), z0: Math.min(az, bz), x1: Math.max(ax, bx), z1: Math.max(az, bz), y: y + top, piece: st };
      this.world.platforms.push(st.platform);
    }
    // Osumalaatikko (säde vasaralle ja [E]-toiminnoille)
    const [bx0, by0, bz0, bx1, by1, bz1] = def.box;
    st.box = new THREE.Box3();
    for (const lx of [bx0, bx1]) for (const lz of [bz0, bz1]) {
      const [wx, wz] = tx(lx, lz);
      st.box.expandByPoint(_hit.set(wx, y + by0, wz));
      st.box.expandByPoint(_hit.set(wx, y + by1, wz));
    }
    if (key) this.keys.set(key, st);
    if (def.bed) this.bed = st;
    this.list.push(st);
    return st;
  }

  remove(st) {
    const i = this.list.indexOf(st);
    if (i < 0) return;
    this.list.splice(i, 1);
    this.scene.remove(st.group);
    for (const c of st.colliders) {
      const k = this.world.extraColliders.indexOf(c);
      if (k >= 0) this.world.extraColliders.splice(k, 1);
    }
    if (st.platform) {
      const k = this.world.platforms.indexOf(st.platform);
      if (k >= 0) this.world.platforms.splice(k, 1);
    }
    if (st.key && this.keys.get(st.key) === st) this.keys.delete(st.key);
    if (this.bed === st) this.bed = [...this.list].reverse().find((p) => PIECES[p.type].bed) || null;
  }

  // Lähin tietyn tyypin osa säteellä r (tai null).
  nearest(type, x, z, r) {
    let best = null, bd = r * r;
    for (const st of this.list) {
      if (st.type !== type) continue;
      const d = (st.x - x) ** 2 + (st.z - z) ** 2;
      if (d <= bd) { bd = d; best = st; }
    }
    return best;
  }

  // Lähellä olevat valmistuspaikat (Set: 'workbench', 'campfire').
  stationsNear(x, z) {
    const out = new Set();
    for (const st of this.list) {
      const station = PIECES[st.type].station;
      if (!station || out.has(station)) continue;
      const r = STATIONS[station].range;
      if ((st.x - x) ** 2 + (st.z - z) ** 2 <= r * r) out.add(station);
    }
    return out;
  }

  // Säde osiin: { obj: osa, t } tai null.
  raycast(origin, dir, maxDist) {
    _ray.set(origin, dir);
    let best = null;
    for (const st of this.list) {
      if (st.box.distanceToPoint(origin) > maxDist) continue;
      if (!_ray.intersectBox(st.box, _hit)) continue;
      const t = _hit.distanceTo(origin);
      if (t <= maxDist && (!best || t < best.t)) best = { obj: st, t };
    }
    return best;
  }

  update(dt, elapsed, playerPos) {
    // Liekkien lepatus
    for (const st of this.list) {
      if (!st.flames.length) continue;
      const k0 = st.fireScale;
      st.flames.forEach((f, i) => {
        const t = elapsed * (7 + i * 1.7) + st.seed + i * 2;
        const k = 0.85 + Math.sin(t) * 0.1 + Math.sin(t * 2.3) * 0.06;
        f.scale.set((0.45 * k + i * 0.03) * k0, 0.85 * k * (1.05 - i * 0.12) * k0, 1);
        if (k0 === 1) f.position.y = 0.32 + (0.85 * k) * 0.35;
      });
    }
    // Valot lähimmille tulisijoille (ja muille tulille)
    const sorted = [];
    for (const st of this.list) {
      if (st.flames.length) sorted.push({ st, d: (st.x - playerPos.x) ** 2 + (st.z - playerPos.z) ** 2 });
    }
    sorted.sort((a, b) => a.d - b.d);
    this.nearestFire = sorted.length ? Math.sqrt(sorted[0].d) : Infinity;
    for (const f of this.extraFires) sorted.push({ st: f, d: (f.x - playerPos.x) ** 2 + (f.z - playerPos.z) ** 2 });
    if (this.held) sorted.push({ st: this.held, d: 0 });
    if (this.extraFires.length || this.held) sorted.sort((a, b) => a.d - b.d);
    this.lights.forEach((l, i) => {
      const e = sorted[i];
      if (!e || e.d > 120 * 120) { l.intensity = 0; return; }
      const st = e.st;
      l.position.set(st.x, st.y + (st.fireY ?? 0.9), st.z);
      const t = elapsed * 9 + st.seed;
      l.intensity = 9 * (st.fireScale ? 0.55 + 0.45 * st.fireScale : 1) * (st.light ?? 1) * (0.85 + Math.sin(t) * 0.08 + Math.sin(t * 2.7) * 0.07);
    });
  }

  // Haamu: type = osan tyyppi (tai null piiloon), valid = vihreä / punainen.
  showGhost(pos, valid, type = 'campfire', rot = 0) {
    if (!pos) { this.ghost.visible = false; return; }
    const geo = this.geos[type] || this.geos.campfire;
    if (this.ghost.geometry !== geo) this.ghost.geometry = geo;
    this.ghost.visible = true;
    this.ghost.position.copy(pos);
    this.ghost.rotation.y = rot;
    this.ghostMat.color.set(valid ? 0x88ff88 : 0xff6655);
  }

  clear() {
    for (const st of this.list.slice()) this.remove(st);
    this.list = [];
    this.keys.clear();
    this.bed = null;
    this.nearestFire = Infinity;
    for (const l of this.lights) l.intensity = 0;
  }

  serialize() {
    return this.list.map((s) => ({ type: s.type, x: s.x, y: s.y, z: s.z, rot: s.rot, key: s.key || undefined }));
  }

  load(list) {
    this.clear();
    if (!Array.isArray(list)) return;
    for (const s of list) {
      if (s && PIECES[s.type] && Number.isFinite(s.x) && Number.isFinite(s.z) && Number.isFinite(s.y)) {
        this.add(s.type, s.x, s.y, s.z, s.rot || 0, typeof s.key === 'string' ? s.key : null);
      }
    }
  }
}
