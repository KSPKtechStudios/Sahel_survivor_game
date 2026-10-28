// Sessio 58: ohut pilviverho karstihuippujen tuntumassa (käyttäjä: vuoren
// huippujen lähellä aivan kevyt höyry tai pieni usva, joka tuo suuruuden ja
// korkeuden tunnetta, "oho"-elämys yksinäiselle viidakontutkijalle; ei liikaa).
//
// Verho piirretään jälkikäsittelyssä (post.js) korkeusvyöhykkeenä noin
// massiivien yläkolmanneksen korkeudella. Tämä moduuli laskee kameran
// ympärille kartan (48 x 48 ruutua à 64 m), jossa on massiiveja: verho on vain
// niiden kohdalla ja vähän ympärillä. Kartta lasketaan vähitellen, kun
// pelaaja on siirtynyt kauas edellisestä keskipisteestä. Ei uusia piirrettäviä
// kappaleita, joten kustannus on muutama laskutoimitus kuvapistettä kohden.
import * as THREE from 'three';
import { sampleRelief } from '../world/terrain.js';

const N = 48;
const CELL = 64;
const PER_FRAME = 160;   // näytettä ruutua kohden laskennan aikana
const BAND = [30, 52];   // m laakson pohjan yläpuolella

const _s = {};

export class PeakMist {
  constructor(post) {
    this.post = post;
    this.data = new Uint8Array(N * N);
    this.tex = new THREE.DataTexture(this.data, N, N, THREE.RedFormat, THREE.UnsignedByteType);
    this.tex.magFilter = this.tex.minFilter = THREE.LinearFilter;
    this.tex.needsUpdate = true;
    this.work = new Float32Array(N * N);
    this.job = null;       // { x0, z0, i }
    this.center = null;
    this.any = false;
    this.drift = new THREE.Vector2();
  }

  clear() {
    this.job = null;
    this.center = null;
    this.any = false;
    this.post.veil.tex = null;
  }

  // floorY = laakson pohja pelaajan kohdalla (main.js), windDir = tuulen suunta (x, z).
  update(dt, pos, floorY, windDir, light, enabled = true) {
    const v = this.post.veil;
    if (!enabled) { v.strength = 0; return; }
    if (!this.job && (!this.center || Math.hypot(pos.x - this.center.x, pos.z - this.center.z) > CELL * 8)) {
      this.job = { x0: Math.floor(pos.x / CELL) * CELL - (N / 2) * CELL, z0: Math.floor(pos.z / CELL) * CELL - (N / 2) * CELL, i: 0 };
    }
    if (this.job) this._step();
    // Vyöhyke laakson pohjan mukaan; voimakkuus häivytetään sisään ja ulos.
    v.y0 = floorY + BAND[0];
    v.y1 = floorY + BAND[1];
    v.light = light;
    const target = this.any ? 1 : 0;
    v.strength += (target - v.strength) * Math.min(1, dt * 0.5);
    v.tex = v.strength > 0.001 ? this.tex : null;
    // Ajelehtii hitaasti tuulen mukana (n. 0,7 m/s).
    this.drift.x += windDir.x * 0.7 * dt;
    this.drift.y += windDir.y * 0.7 * dt;
    v.drift.copy(this.drift);
  }

  _step() {
    const J = this.job;
    const end = Math.min(N * N, J.i + PER_FRAME);
    for (; J.i < end; J.i++) {
      const i = J.i % N, j = Math.floor(J.i / N);
      const s = sampleRelief(J.x0 + (i + 0.5) * CELL, J.z0 + (j + 0.5) * CELL, _s);
      // Massiivin korotus (sisältää sademetsän painon).
      const k = (s.escSharp || 0) - 14;
      this.work[J.i] = k <= 0 ? 0 : Math.min(1, k / 16);
    }
    if (J.i < N * N) return;
    // Laajennus yhdellä ruudulla: verho kietoutuu huippujen ympärille.
    let any = false;
    for (let j = 0; j < N; j++) {
      for (let i = 0; i < N; i++) {
        let m = 0;
        for (let dj = -1; dj <= 1; dj++) {
          for (let di = -1; di <= 1; di++) {
            const ii = i + di, jj = j + dj;
            if (ii < 0 || jj < 0 || ii >= N || jj >= N) continue;
            const w = this.work[jj * N + ii] * (di || dj ? 0.75 : 1);
            if (w > m) m = w;
          }
        }
        this.data[j * N + i] = Math.round(m * 255);
        if (m > 0.05) any = true;
      }
    }
    this.tex.needsUpdate = true;
    this.post.veil.rect.set(J.x0, J.z0, N * CELL, 0);
    this.center = { x: J.x0 + (N / 2) * CELL, z: J.z0 + (N / 2) * CELL };
    this.any = any;
    this.job = null;
  }
}
