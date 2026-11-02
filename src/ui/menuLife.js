// Sessio 60: elämää valikon leirin ympärille (käyttäjä: valikossa pitää
// haluta viettää aikaa; valitut: tulikärpäset ja yöäänet, elämää
// horisontissa, sää vaihtelee).
//  - Gasellilauma laiduntaa ja vaeltaa kaukana pääkuvan suunnassa
//    (auringonlaskua vasten). Lauma kulkee edestakaisin polkua, jonka
//    jokaisen kohdan pitää olla kuivaa ja loivaa maata.
//  - Lintuparvi lentää välillä taivaan poikki hämärän aikaan (tummat
//    siluetit, siivet lyövät ja välillä liitävät).
//  - Tulikärpäsparvet leirin lähellä (render/ambient.js: extra-parvet).
// Yöäänet ovat audio/sfx.js:ssä (nightCalls) ja sään vaihtelu main.js:ssä.
import * as THREE from 'three';
import { heightAt, waterAt } from '../world/terrain.js';
import { makeGazelle } from '../models/creatures.js';

const _w = {};

// Kuiva ja loiva kohta, jossa eläin voi kävellä.
function walkable(x, z) {
  waterAt(x, z, _w);
  if (_w.wl > _w.h - 0.15) return false;
  const h = _w.h;
  return Math.abs(heightAt(x + 2, z) - h) < 1.4 && Math.abs(heightAt(x, z + 2) - h) < 1.4;
}

// Lintu: pieni vartalo ja kaksi siipeä, jotka lyövät (rotation.z).
function makeBirdShape(mat) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 4).scale(0.8, 0.7, 2.6), mat);
  g.add(body);
  const wingGeo = new THREE.BufferGeometry();
  // Kolmio siiven tyvestä kärkeen, takareuna hieman kaareva (kaksi kolmiota).
  wingGeo.setAttribute('position', new THREE.Float32BufferAttribute([
    0, 0, 0.12, 0.72, 0, -0.05, 0, 0, -0.1,
    0.72, 0, -0.05, 0.38, 0, -0.16, 0, 0, -0.1,
  ], 3));
  wingGeo.computeVertexNormals();
  const wings = [];
  for (const s of [1, -1]) {
    const w = new THREE.Mesh(wingGeo, mat);
    w.scale.x = s;
    g.add(w);
    wings.push(w);
  }
  return { group: g, wings };
}

export class MenuLife {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.visible = false;
    scene.add(this.group);
    this.herd = [];
    this.flocks = [];
    this.birdMat = new THREE.MeshBasicMaterial({ color: 0x1b140f, side: THREE.DoubleSide, fog: true });
    this.flockT = 9;
    this.built = false;
  }

  // camp = MenuCamp (rakennettu), view = pääkuvan [sijainti, katsekohde] leirin koordinaateissa.
  build(camp, view) {
    if (this.built) return;
    this.built = true;
    this.camp = camp;
    const [p, a] = view;
    const cx = camp.x + p[0], cz = camp.z + p[2];
    const dx = a[0] - p[0], dz = a[2] - p[2], dl = Math.hypot(dx, dz);
    this.view = { cx, cz, fx: dx / dl, fz: dz / dl };
    this._placeHerd();
  }

  // Lauman polku: poikittain pääkuvan katseeseen 45–110 m:n päässä.
  _placeHerd() {
    const { cx, cz } = this.view;
    let best = null;
    for (const turn of [0, -0.2, 0.2, -0.38, 0.38]) {
      const fx = this.view.fx * Math.cos(turn) - this.view.fz * Math.sin(turn);
      const fz = this.view.fx * Math.sin(turn) + this.view.fz * Math.cos(turn);
      for (let D = 45; D <= 110 && !best; D += 5) {
        const mx = cx + fx * D, mz = cz + fz * D;
        const lx = -fz, lz = fx;
        let ok = true;
        for (let s = -22; s <= 22 && ok; s += 2) ok = walkable(mx + lx * s, mz + lz * s) && walkable(mx + lx * s + fx * 6, mz + lz * s + fz * 6);
        if (ok) best = { mx, mz, lx, lz, fx, fz };
      }
      if (best) break;
    }
    if (!best) return;
    this.path = best;
    const n = 5;
    for (let i = 0; i < n; i++) {
      const g = makeGazelle(i + 3);
      g.group.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = true; } });
      const sc = i === 0 ? 1.08 : 0.82 + Math.random() * 0.2; // pukki ja pienempiä
      g.group.scale.setScalar(sc);
      this.group.add(g.group);
      this.herd.push({
        md: g, s: -14 + i * 3 + (Math.random() - 0.5) * 2, side: (Math.random() - 0.5) * 6, dir: 1,
        state: 'graze', t: 2 + Math.random() * 6, ph: Math.random() * 6, head: 1.4, yaw: 0, phase: Math.random() * 6,
        speed: 0,
      });
    }
  }

  setVisible(v) {
    this.group.visible = v;
  }

  // Tulikärpäsparvet leirin ympärillä (ambient.js lisää ne lähimpien joukkoon).
  fireflySwarms() {
    const c = this.camp;
    const spots = [[-5.6, 3.4, 2.6, 18], [-4.6, -3.2, 3.2, 14], [-9.5, 5.0, 3.6, 20], [5.2, -4.4, 3.0, 12], [1.5, 7.5, 3.4, 14]];
    return spots.map(([x, z, r, n]) => ({ x: c.x + x, y: heightAt(c.x + x, c.z + z), z: c.z + z, r, n }));
  }

  update(dt, time, daylight) {
    if (!this.group.visible || !this.built) return;
    this._updateHerd(dt, time);
    this._updateBirds(dt, time, daylight);
  }

  _updateHerd(dt, time) {
    const P = this.path;
    if (!P) return;
    for (const g of this.herd) {
      g.t -= dt;
      if (g.t <= 0) {
        // Vuorotellen laidunnusta ja hidasta vaellusta; polun päässä käännytään.
        if (g.state === 'graze') { g.state = 'walk'; g.t = 4 + Math.random() * 9; } else { g.state = 'graze'; g.t = 5 + Math.random() * 12; }
        if (Math.abs(g.s) > 16) g.dir = -Math.sign(g.s);
        else if (Math.random() < 0.3) g.dir = -g.dir;
      }
      const want = g.state === 'walk' ? 0.75 : 0;
      g.speed += (want - g.speed) * Math.min(1, dt * 1.5);
      g.s += g.dir * g.speed * dt;
      g.s = Math.max(-21, Math.min(21, g.s));
      g.side += Math.sin(time * 0.1 + g.phase) * 0.05 * dt;
      const x = P.mx + P.lx * g.s + P.fx * g.side;
      const z = P.mz + P.lz * g.s + P.fz * g.side;
      const md = g.md;
      md.group.position.set(x, heightAt(x, z), z);
      // Suunta: kulkusuuntaan; laiduntaessa käännellään hieman.
      const tYaw = Math.atan2(P.lx * g.dir, P.lz * g.dir) + (g.state === 'graze' ? Math.sin(time * 0.2 + g.phase) * 0.6 : 0);
      let dy = tYaw - g.yaw;
      dy = Math.atan2(Math.sin(dy), Math.cos(dy));
      g.yaw += dy * Math.min(1, dt * 1.2);
      md.group.rotation.y = g.yaw;
      // Jalat: käynti (vinot parit samaan tahtiin).
      g.ph += dt * g.speed * 7.5;
      const amp = Math.min(0.55, g.speed * 0.7);
      const a = Math.sin(g.ph) * amp, b = Math.sin(g.ph + Math.PI) * amp;
      md.legs[0].rotation.x = a; md.legs[1].rotation.x = b; md.legs[2].rotation.x = b; md.legs[3].rotation.x = a;
      // Pää alas laiduntaessa, välillä ylös vilkuilemaan.
      const look = g.state === 'graze' && Math.sin(time * 0.37 + g.phase * 3) > 0.85;
      const hx = g.state === 'graze' && !look ? 1.5 + Math.sin(time * 3 + g.phase) * 0.05 : 0.1;
      g.head += (hx - g.head) * Math.min(1, dt * 3);
      md.head.rotation.x = g.head;
      if (md.tail) md.tail.rotation.x = -0.3 + Math.sin(time * 5 + g.phase) * 0.18;
    }
  }

  // Lintuparvi: V-muodostelma tai löyhä parvi kulkee taivaan poikki.
  _spawnFlock() {
    const { cx, cz, fx, fz } = this.view;
    const D = 65 + Math.random() * 70;
    const lx = -fz, lz = fx;
    const dir = Math.random() < 0.5 ? 1 : -1;
    const turn = (Math.random() - 0.5) * 0.5;
    const vx = (lx * Math.cos(turn) - fx * Math.sin(turn)) * dir, vz = (lz * Math.cos(turn) - fz * Math.sin(turn)) * dir;
    const L = 130;
    const sx = cx + fx * D - vx * L, sz = cz + fz * D - vz * L;
    const y = this.camp.y + 16 + Math.random() * 22;
    const n = 7 + Math.floor(Math.random() * 9);
    const vee = Math.random() < 0.6;
    const birds = [];
    for (let i = 0; i < n; i++) {
      const b = makeBirdShape(this.birdMat);
      const sc = 1 + (Math.random() - 0.5) * 0.2;
      b.group.scale.setScalar(sc);
      this.group.add(b.group);
      // V: rivit taaksepäin ja sivuille; löyhä parvi: satunnainen pilvi.
      const k = Math.ceil(i / 2), side = i % 2 ? 1 : -1;
      const off = vee
        ? { back: k * 2.6 + Math.random() * 0.6, lat: side * k * 2.2 + (Math.random() - 0.5) * 0.5, up: (Math.random() - 0.5) * 0.8 }
        : { back: Math.random() * 14, lat: (Math.random() - 0.5) * 12, up: (Math.random() - 0.5) * 5 };
      birds.push({ ...b, off, ph: Math.random() * 6, rate: 3.2 + Math.random() * 0.8, glide: Math.random() * 10 });
    }
    this.flocks.push({ x: sx, y, z: sz, vx, vz, speed: 9 + Math.random() * 3, dist: 0, len: L * 2.2, birds });
  }

  _updateBirds(dt, time, daylight) {
    // Parvia hämärän aikaan (auringonlasku), ei pimeällä.
    this.flockT -= dt;
    if (this.flockT <= 0) {
      this.flockT = 32 + Math.random() * 45;
      if (daylight > 0.12 && this.flocks.length < 2) this._spawnFlock();
    }
    for (let f = this.flocks.length - 1; f >= 0; f--) {
      const F = this.flocks[f];
      const step = F.speed * dt;
      F.x += F.vx * step; F.z += F.vz * step; F.dist += step;
      const yaw = Math.atan2(F.vx, F.vz);
      const lx = F.vz, lz = -F.vx; // sivusuunta
      for (const b of F.birds) {
        const o = b.off;
        const bob = Math.sin(time * 0.7 + b.ph) * 0.4;
        b.group.position.set(F.x - F.vx * o.back + lx * o.lat, F.y + o.up + bob, F.z - F.vz * o.back + lz * o.lat);
        b.group.rotation.set(0, yaw, Math.sin(time * 0.5 + b.ph) * 0.08);
        // Siivenlyönti, välillä liito (siivet hieman koholla).
        const gl = Math.sin(time * 0.35 + b.glide) > 0.55;
        const flap = gl ? 0.12 : Math.sin(time * b.rate * Math.PI * 2 + b.ph) * 0.55 + 0.1;
        b.wings[0].rotation.z = flap;
        b.wings[1].rotation.z = -flap;
      }
      if (F.dist > F.len) {
        for (const b of F.birds) this.group.remove(b.group);
        this.flocks.splice(f, 1);
      }
    }
  }

  clearFlocks() {
    for (const F of this.flocks) for (const b of F.birds) this.group.remove(b.group);
    this.flocks.length = 0;
    this.flockT = 9;
  }
}

