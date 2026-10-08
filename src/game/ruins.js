// Maailman rakennelmat (kivikehät, leirit, rauniot) ja niiden arkut.
// Paikat tulevat siemenestä (terrain.js: structureInCell). Rakennelma
// rakennetaan, kun pelaaja tulee lähelle, ja puretaan kauempana.
// Arkun avaaminen [E]: kansi aukeaa ja saaliit lennähtävät maahan.
import * as THREE from 'three';
import { mulberry32 } from '../noise.js';
import { structuresNear } from '../world/terrain.js';
import { buildStructure, makeChestModels } from '../models/structures.js';
import { events } from './events.js';
import { LORE, drawRunes, loreFor } from './lore.js';

const BUILD_RANGE = 300;
const COMMON = [
  ['stick', 3, 8], ['stone', 2, 6], ['fiber', 2, 6], ['wood', 1, 4], ['flint', 2, 5], ['rope', 1, 3],
  ['arrow_flint', 3, 8], ['gum', 1, 3], ['torch', 1, 2], ['shea_nuts', 2, 5], ['herbal_remedy', 1, 1],
];
// Laivanhylyn arkussa merellisempää tavaraa.
const WRECK = [['rope', 2, 5], ['seashell', 2, 6], ['wood', 2, 5], ['coconut', 1, 3], ['arrow_bone', 4, 8], ['leather', 1, 3]];
const VALUABLE = [['gold_nugget', 1, 3], ['cowrie', 3, 8], ['bronze_bracelet', 1, 1]];

export const STRUCT_NAMES = {
  stoneCircle: 'Kivikehä', camp: 'Hylätty leiri', ruinHouse: 'Talon rauniot', ruinVillage: 'Kylän rauniot', shipwreck: 'Laivanhylky',
  runestone: 'Riimukivi', runeTablet: 'Riimutaulu',
};

// Kaiverrustekstuuri: riimut vaalealle pohjalle (läpinäkyvä tausta).
function runeTexture(text, w, h) {
  const px = 256;
  const c = document.createElement('canvas');
  c.width = px;
  c.height = Math.round((px * h) / w);
  const g = c.getContext('2d');
  drawRunes(g, text, c.width * 0.08, c.height * 0.06, c.width * 0.84, c.height * 0.88, {
    lineW: c.width * 0.032, color: 'rgba(16,11,7,0.96)', light: 'rgba(255,246,228,0.6)',
  });
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 4;
  return tex;
}

// Arkun sisältö on siemenestä laskettu, joten se on joka kerta sama.
export function rollLoot(st) {
  const r = mulberry32((st.seed ^ 0xc0ffee) >>> 0);
  const loot = [];
  const pool = (st.type === 'shipwreck' ? WRECK : COMMON).slice();
  const n = 2 + Math.floor(r() * 2);
  for (let i = 0; i < n && pool.length; i++) {
    const [item, a, b] = pool.splice(Math.floor(r() * pool.length), 1)[0];
    loot.push([item, a + Math.floor(r() * (b - a + 1))]);
  }
  // Viidakkoveitsi: oma satunnaisvirta, jotta muu sisältö pysyy ennallaan.
  const rm = mulberry32((st.seed ^ 0xb1ade5) >>> 0);
  if (rm() < (st.type === 'camp' ? 0.4 : 0.2)) loot.push(['machete', 1]);
  // Kello (sessio 20): ei harvinainen, mutta ei yleinenkään (n. joka 8. arkku).
  const rc = mulberry32((st.seed ^ 0xc10c4) >>> 0);
  if (rc() < 0.13) loot.push(['clock', 1]);
  if (st.valuables) {
    const vp = VALUABLE.slice();
    const nv = 1 + Math.floor(r() * 2);
    for (let i = 0; i < nv && vp.length; i++) {
      const [item, a, b] = vp.splice(Math.floor(r() * vp.length), 1)[0];
      loot.push([item, a + Math.floor(r() * (b - a + 1))]);
    }
  }
  return loot;
}

const _v = new THREE.Vector3();

export class Ruins {
  constructor({ scene, world, drops, bursts }) {
    Object.assign(this, { scene, world, drops, bursts });
    this.active = new Map(); // id -> { st, group, colliders, chest, rune }
    this.opened = new Set();
    this.read = new Set();   // käännetyt riimukivet
    this.material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 });
    this.chestModels = makeChestModels();
    this.timer = 0;
  }

  clear() {
    for (const id of [...this.active.keys()]) this._remove(id);
    this.opened = new Set();
    this.read = new Set();
  }

  update(dt, playerPos) {
    // Arkkujen kansien animaatio
    for (const a of this.active.values()) {
      const c = a.chest;
      if (c && c.anim < 1 && c.opening) {
        c.anim = Math.min(1, c.anim + dt / 0.7);
        const t = c.anim;
        // Pehmeä avaus pienellä ylilyönnillä
        const ease = 1 - Math.pow(1 - t, 3) + Math.sin(t * Math.PI) * 0.08;
        c.lid.rotation.x = -1.95 * ease;
        if (!c.spilled && t > 0.35) {
          c.spilled = true;
          this._spill(a);
        }
      }
    }
    this.timer -= dt;
    if (this.timer > 0) return;
    this.timer = 0.5;
    const near = structuresNear(playerPos.x, playerPos.z, BUILD_RANGE);
    const keep = new Set();
    for (const st of near) {
      keep.add(st.id);
      if (!this.active.has(st.id)) this._build(st);
    }
    for (const id of [...this.active.keys()]) {
      const a = this.active.get(id);
      if (!keep.has(id) && Math.hypot(a.st.x - playerPos.x, a.st.z - playerPos.z) > BUILD_RANGE + 80) this._remove(id);
    }
  }

  _build(st) {
    const built = buildStructure(st);
    const group = new THREE.Group();
    group.position.set(st.x, st.baseH - 0.05, st.z);
    group.rotation.y = st.rot;
    const mesh = new THREE.Mesh(built.geometry, this.material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    this.scene.add(group);
    group.updateMatrixWorld(true);

    // Törmäykset maailman koordinaatteihin
    const c = Math.cos(st.rot), s = Math.sin(st.rot);
    const tx = (x, z) => [st.x + x * c + z * s, st.z - x * s + z * c];
    const colliders = built.colliders.map((col) => {
      if (col.seg) {
        const [ax, az] = tx(col.ax, col.az);
        const [bx, bz] = tx(col.bx, col.bz);
        return { seg: true, ax, az, bx, bz, r: col.r, top: st.baseH + (col.top ?? 1.5), obj: null };
      }
      const [x, z] = tx(col.x, col.z);
      return { x, z, r: col.r, obj: null };
    });
    this.world.extraColliders.push(...colliders);

    let chest = null;
    if (built.chest) {
      const holder = new THREE.Group();
      holder.position.set(built.chest.x, 0, built.chest.z);
      holder.rotation.y = built.chest.rot;
      const body = new THREE.Mesh(this.chestModels.body, this.material);
      const lid = new THREE.Mesh(this.chestModels.lid, this.material);
      lid.position.set(0, 0.44, -0.275);
      body.castShadow = lid.castShadow = true;
      holder.add(body, lid);
      group.add(holder);
      holder.updateMatrixWorld(true);
      const opened = this.opened.has(st.id);
      if (opened) lid.rotation.x = -1.95;
      chest = { holder, lid, opened, anim: opened ? 1 : 0, opening: false, spilled: opened, world: holder.getWorldPosition(new THREE.Vector3()) };
      const [cx, cz] = [chest.world.x, chest.world.z];
      const cc = { x: cx, z: cz, r: 0.45, obj: null };
      colliders.push(cc);
      this.world.extraColliders.push(cc);
    }
    // Riimut: kaiverrustaso kiven pinnalle (oma tekstuuri jokaiselle kivelle)
    let rune = null;
    if (built.rune) {
      const r = built.rune;
      const idx = loreFor(st.seed);
      const tex = runeTexture(LORE[idx], r.w, r.h);
      const mat = new THREE.MeshStandardMaterial({
        map: tex, transparent: true, depthWrite: false, roughness: 1,
        polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
      });
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(r.w, r.h), mat);
      plane.position.set(r.x, r.y, r.z);
      plane.rotation.x = r.rx;
      group.add(plane);
      group.updateMatrixWorld(true);
      rune = { mesh: plane, idx, size: r.size, world: plane.getWorldPosition(new THREE.Vector3()), name: STRUCT_NAMES[st.type] };
    }
    this.active.set(st.id, { st, group, colliders, chest, rune });
  }

  _remove(id) {
    const a = this.active.get(id);
    if (!a) return;
    this.scene.remove(a.group);
    a.group.children[0].geometry.dispose();
    if (a.rune) {
      a.rune.mesh.geometry.dispose();
      a.rune.mesh.material.map.dispose();
      a.rune.mesh.material.dispose();
    }
    for (const col of a.colliders) {
      const i = this.world.extraColliders.indexOf(col);
      if (i >= 0) this.world.extraColliders.splice(i, 1);
    }
    this.active.delete(id);
  }

  // Säde arkkuun. Palauttaa { obj: { ruin }, t }.
  raycast(origin, dir, maxDist) {
    let best = null;
    for (const a of this.active.values()) {
      if (!a.chest) continue;
      const p = _v.copy(a.chest.world);
      p.y += 0.3;
      const oc = p.sub(origin);
      const r = 0.6;
      const tca = oc.dot(dir);
      if (tca < -r) continue;
      const d2 = oc.lengthSq() - tca * tca;
      if (d2 > r * r) continue;
      const t = Math.max(0, tca - Math.sqrt(r * r - d2));
      if (t <= maxDist && (!best || t < best.t)) best = { obj: a, t };
    }
    return best;
  }

  // Säde riimukiveen. Palauttaa { obj: { ruin }, t }.
  raycastRunes(origin, dir, maxDist) {
    let best = null;
    for (const a of this.active.values()) {
      if (!a.rune) continue;
      const oc = _v.copy(a.rune.world).sub(origin);
      const r = a.rune.size;
      const tca = oc.dot(dir);
      if (tca < -r) continue;
      const d2 = oc.lengthSq() - tca * tca;
      if (d2 > r * r) continue;
      const t = Math.max(0, tca - Math.sqrt(r * r - d2));
      if (t <= maxDist && (!best || t < best.t)) best = { obj: a, t };
    }
    return best;
  }

  // Kivi käännetty: teksti ja tieto, oliko se jo luettu.
  translate(a) {
    const first = !this.read.has(a.st.id);
    this.read.add(a.st.id);
    events.emit('runeRead', { first, idx: a.rune.idx });
    return { text: LORE[a.rune.idx], first, name: a.rune.name, count: this.read.size };
  }

  open(a) {
    if (!a.chest || a.chest.opened) return false;
    a.chest.opened = true;
    a.chest.opening = true;
    this.opened.add(a.st.id);
    events.emit('chestOpened', { type: a.st.type, valuables: a.st.valuables });
    return true;
  }

  _spill(a) {
    const p = a.chest.world.clone();
    p.y += 0.5;
    this.bursts.spawn(p, a.st.valuables ? 0xffd060 : 0xc9a77a, 14, 1.6);
    for (const [item, n] of rollLoot(a.st)) this.drops.spawn(item, n, p, { spread: 0.7, up: 1.1 });
  }

  serialize() {
    return { opened: [...this.opened], read: [...this.read] };
  }

  load(data) {
    // Vanha tallennus: pelkkä lista avatuista arkuista.
    const opened = Array.isArray(data) ? data : data && Array.isArray(data.opened) ? data.opened : [];
    this.opened = new Set(opened);
    this.read = new Set(data && Array.isArray(data.read) ? data.read : []);
  }
}
