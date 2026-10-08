// Sirpaleet ja lastut: esineen murskautuessa sen geometria jaetaan paloihin,
// jotka lentävät fysiikalla, pomppivat maassa ja häviävät hetken päästä.
// Lisäksi pienet lastut/kivensirut jokaisesta osumasta.
import * as THREE from 'three';
import { heightAt } from '../world/terrain.js';
import { leafTexture } from './surfaces.js';
import { kitMaterial } from './kitMaterials.js';
import { WHITE_UV } from '../models/util.js';

const _q = new THREE.Quaternion();
const _axis = new THREE.Vector3();

// Jaa (ei-indeksoitu, vertex-väritetty) geometria k palaan. Palat suljetaan
// lisäämällä jokaisesta kolmion sivusta kolmio palan keskipisteeseen.
// closed = lisätäänkö sisäpinnat (vain umpinaisille kappaleille, esim. kivet;
// ohuista oksista ja lehdistä syntyisi muuten isoja levyjä).
export function fractureGeometry(geo, k, innerHex = 0x8a6a48, seed = 1, closed = true) {
  let s = seed >>> 0;
  const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  const pos = geo.attributes.position;
  const col = geo.attributes.color;
  // Sessio 25: UV ja varjostus mukaan (lehtikortit pysyvät lehtinä).
  const uvA = geo.attributes.uv;
  const aoA = geo.attributes.aAO;
  const triCount = Math.floor(pos.count / 3);
  if (triCount === 0) return [];
  const cents = new Float32Array(triCount * 3);
  for (let t = 0; t < triCount; t++) {
    for (let c = 0; c < 3; c++) {
      cents[t * 3 + c] = (pos.array[t * 9 + c] + pos.array[t * 9 + 3 + c] + pos.array[t * 9 + 6 + c]) / 3;
    }
  }
  k = Math.max(1, Math.min(k, triCount));
  const seeds = [];
  for (let i = 0; i < k; i++) {
    const t = Math.floor(rnd() * triCount);
    seeds.push([cents[t * 3], cents[t * 3 + 1], cents[t * 3 + 2]]);
  }
  const groups = Array.from({ length: k }, () => []);
  for (let t = 0; t < triCount; t++) {
    let best = 0, bd = Infinity;
    for (let i = 0; i < k; i++) {
      const dx = cents[t * 3] - seeds[i][0];
      const dy = cents[t * 3 + 1] - seeds[i][1];
      const dz = cents[t * 3 + 2] - seeds[i][2];
      const d = dx * dx + dy * dy + dz * dz;
      if (d < bd) { bd = d; best = i; }
    }
    groups[best].push(t);
  }
  const inner = new THREE.Color(innerHex);
  const out = [];
  for (const g of groups) {
    if (!g.length) continue;
    const c = new THREE.Vector3();
    for (const t of g) c.x += cents[t * 3], c.y += cents[t * 3 + 1], c.z += cents[t * 3 + 2];
    c.divideScalar(g.length);
    const P = [], C = [], U = [], A = [];
    for (const t of g) {
      const v = [0, 1, 2].map((i) => new THREE.Vector3().fromArray(pos.array, t * 9 + i * 3).sub(c));
      for (let i = 0; i < 3; i++) {
        P.push(v[i].x, v[i].y, v[i].z);
        C.push(col.array[t * 9 + i * 3], col.array[t * 9 + i * 3 + 1], col.array[t * 9 + i * 3 + 2]);
        if (uvA) U.push(uvA.array[t * 6 + i * 2], uvA.array[t * 6 + i * 2 + 1]);
        if (aoA) A.push(aoA.array[t * 3 + i]);
      }
      // Sisäpinnat (sulkevat palan)
      for (let i = 0; closed && i < 3; i++) {
        const a = v[i], b = v[(i + 1) % 3];
        P.push(b.x, b.y, b.z, a.x, a.y, a.z, 0, 0, 0);
        C.push(inner.r, inner.g, inner.b, inner.r, inner.g, inner.b, inner.r * 0.8, inner.g * 0.8, inner.b * 0.8);
        if (uvA) U.push(WHITE_UV[0], WHITE_UV[1], WHITE_UV[0], WHITE_UV[1], WHITE_UV[0], WHITE_UV[1]);
        if (aoA) A.push(1, 1, 1);
      }
    }
    const fg = new THREE.BufferGeometry();
    fg.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    fg.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
    if (uvA) fg.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2));
    if (aoA) fg.setAttribute('aAO', new THREE.Float32BufferAttribute(A, 1));
    fg.computeVertexNormals();
    fg.computeBoundingSphere();
    out.push({ geometry: fg, center: c });
  }
  return out;
}

export class Debris {
  constructor(scene) {
    this.scene = scene;
    this.list = [];
    this.material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, side: THREE.DoubleSide });
    // Sessio 25: lehtiatlasta käyttävien mallien (puut, pensaat) sirpaleet.
    this.leafMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, side: THREE.DoubleSide, map: leafTexture, alphaTest: 0.42 });
    this.chipGeo = new THREE.TetrahedronGeometry(0.06, 0);
    this.chipMats = new Map();
  }

  // Murskaa geometria (mallin koordinaatistossa) paloiksi. matrix = mallin
  // maailmamatriisi. power = lentonopeus.
  shatter(geometry, matrix, { pieces = 8, inner = 0x8a6a48, power = 2.5, life = 2.6, seed = 1, up = 1, closed = true } = {}) {
    const frags = fractureGeometry(geometry, pieces, inner, seed, closed);
    // Materiaali mallin mukaan: kitin mallit omallaan, lehtiatlasta käyttävät
    // (UV, ei skannattu tekstuuri) lehtimateriaalilla, muut vertex-väreillä.
    const ud = geometry.userData || {};
    const material = ud.kit ? kitMaterial(ud.kit[0]) : geometry.attributes.uv && !ud.tex ? this.leafMaterial : this.material;
    const objPos = new THREE.Vector3();
    const objQuat = new THREE.Quaternion();
    const objScale = new THREE.Vector3();
    matrix.decompose(objPos, objQuat, objScale);
    const center = new THREE.Vector3();
    for (const f of frags) center.add(f.center);
    center.divideScalar(Math.max(1, frags.length));
    for (const f of frags) {
      const mesh = new THREE.Mesh(f.geometry, material);
      mesh.castShadow = true;
      mesh.position.copy(f.center).applyMatrix4(matrix);
      mesh.quaternion.copy(objQuat);
      mesh.scale.copy(objScale);
      const out = f.center.clone().sub(center).applyQuaternion(objQuat);
      out.y = Math.abs(out.y) * 0.5;
      if (out.lengthSq() < 1e-4) out.set(Math.random() - 0.5, 0.5, Math.random() - 0.5);
      out.normalize();
      const vel = out.multiplyScalar(power * (0.6 + Math.random() * 0.8));
      vel.y += up * (1.5 + Math.random() * 2);
      this.scene.add(mesh);
      this.list.push({
        mesh,
        vel,
        spin: new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(8),
        life: life * (0.8 + Math.random() * 0.4),
        age: 0,
        radius: (f.geometry.boundingSphere?.radius || 0.1) * objScale.x * 0.5,
        baseScale: objScale.clone(),
        owned: true,
      });
    }
  }

  // Pienet lastut osumasta.
  chips(pos, hex, count = 8, dir = null, size = 1) {
    let mat = this.chipMats.get(hex);
    if (!mat) {
      mat = new THREE.MeshStandardMaterial({ color: hex, roughness: 0.9, flatShading: true });
      this.chipMats.set(hex, mat);
    }
    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(this.chipGeo, mat);
      mesh.position.copy(pos);
      const s = (0.5 + Math.random() * 0.9) * size;
      mesh.scale.setScalar(s);
      mesh.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
      const vel = new THREE.Vector3((Math.random() - 0.5) * 3, 1.5 + Math.random() * 2.5, (Math.random() - 0.5) * 3);
      if (dir) vel.addScaledVector(dir, 2 + Math.random() * 2);
      this.scene.add(mesh);
      this.list.push({
        mesh,
        vel,
        spin: new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(14),
        life: 1.2 + Math.random() * 0.8,
        age: 0,
        radius: 0.03 * s,
        baseScale: new THREE.Vector3(s, s, s),
        owned: false,
      });
    }
  }

  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const d = this.list[i];
      d.age += dt;
      const p = d.mesh.position;
      d.vel.y -= 14 * dt;
      p.addScaledVector(d.vel, dt);
      const ground = heightAt(p.x, p.z) + d.radius;
      if (p.y < ground) {
        p.y = ground;
        if (d.vel.y < -1) d.vel.y *= -0.3; else d.vel.y = 0;
        d.vel.x *= 0.6;
        d.vel.z *= 0.6;
        d.spin.multiplyScalar(0.6);
      }
      const sp = d.spin.length();
      if (sp > 0.01) {
        _axis.copy(d.spin).divideScalar(sp);
        _q.setFromAxisAngle(_axis, sp * dt);
        d.mesh.quaternion.premultiply(_q);
      }
      // Lopussa pala kutistuu ja painuu maahan.
      const fade = THREE.MathUtils.clamp((d.age - (d.life - 0.6)) / 0.6, 0, 1);
      if (fade > 0) {
        d.mesh.scale.copy(d.baseScale).multiplyScalar(1 - fade);
      }
      if (d.age >= d.life) {
        this.scene.remove(d.mesh);
        if (d.owned) d.mesh.geometry.dispose();
        this.list.splice(i, 1);
      }
    }
  }

  clear() {
    for (const d of this.list) {
      this.scene.remove(d.mesh);
      if (d.owned) d.mesh.geometry.dispose();
    }
    this.list = [];
  }
}

