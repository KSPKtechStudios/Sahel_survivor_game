// Äänitehosteet (sessio 12). Web Audio -verkko:
//   kerrokset (taustaäänet) ─┐
//   kertaäänet (puu kaatuu) ─┼─> sfx-gain (asetukset) ─> master ─> kaiuttimet
//   askeleet (syntetisoitu) ─┘
//
// Taustaäänet (tuuli, viidakko, sade, kaukainen ukkonen) ovat pitkiä, joten ne
// soitetaan audio-elementeistä (striimaus, ei puretakaan muistiin; purettuina
// ne veisivät n. 200 Mt). Silmukan sauma peitetään ristiinhäivytyksellä: kaksi
// elementtiä vuorottelee, ja uusi kierros alkaa ennen kuin edellinen loppuu.
// Tiedostot on tasattu samaan äänekkyyteen (−20 LUFS), joten tasot alla ovat
// suoraan suhteellisia voimakkuuksia. Musiikki soi pelissä n. −28 LUFS:ssä;
// taustaäänet ovat sen tuntumassa tai hiljempaa.

const BEDS = {
  wind: { file: 'assets/sfx/wind.mp3', level: 0.3, tau: 1.6 },
  jungle: { file: 'assets/sfx/jungle.mp3', level: 0.36, tau: 0.9 },
  rain: { file: 'assets/sfx/rain.mp3', level: 0.42, tau: 1.2 },
  thunder: { file: 'assets/sfx/thunder-distant.mp3', level: 0.42, tau: 2.2 },
};
const OVERLAP = 3;         // silmukan ristiinhäivytys (s)
const IDLE_STOP = 6;       // hiljainen kerros pysäytetään tämän jälkeen (s)

// Puun kaatuminen: räsähdyksen kohta tiedostossa (s) ja voimakkuus 10 m:stä.
const TREE_FILE = 'assets/sfx/tree-fall.mp3';
const TREE_CRASH_AT = 0.92;
const TREE_LEVEL = 0.3;

class Bed {
  constructor(sfx, key, def) {
    this.sfx = sfx;
    this.key = key;
    this.def = def;
    this.target = 0;
    this.idle = 0;
    this.els = [];
    this.active = -1;      // soiva elementti (0/1), -1 = pysähdyksissä
    this.out = sfx.ctx.createGain();
    this.out.gain.value = 0;
    this.out.connect(sfx.bus);
  }

  _el(i) {
    if (!this.els[i]) {
      const el = new window.Audio();
      el.src = this.def.file;
      el.preload = 'auto';
      const g = this.sfx.ctx.createGain();
      g.gain.value = 0;
      this.sfx.ctx.createMediaElementSource(el).connect(g);
      g.connect(this.out);
      this.els[i] = { el, g, started: false };
    }
    return this.els[i];
  }

  _start(i, offset) {
    const e = this._el(i);
    const now = this.sfx.ctx.currentTime;
    try { e.el.currentTime = offset; } catch { /* ei vielä ladattu */ }
    e.el.play().catch(() => {});
    e.started = true;
    e.g.gain.cancelScheduledValues(now);
    e.g.gain.setValueAtTime(e.g.gain.value, now);
    e.g.gain.linearRampToValueAtTime(1, now + OVERLAP);
    this.active = i;
  }

  _fadeOut(i) {
    const e = this.els[i];
    if (!e || !e.started) return;
    const now = this.sfx.ctx.currentTime;
    e.g.gain.cancelScheduledValues(now);
    e.g.gain.setValueAtTime(e.g.gain.value, now);
    e.g.gain.linearRampToValueAtTime(0, now + OVERLAP);
    e.stopAt = now + OVERLAP + 0.1;
  }

  stop() {
    for (const e of this.els) {
      if (!e) continue;
      e.el.pause();
      e.started = false;
      e.stopAt = 0;
      e.g.gain.value = 0;
    }
    this.active = -1;
  }

  update(dt) {
    const ctx = this.sfx.ctx;
    const now = ctx.currentTime;
    this.out.gain.setTargetAtTime(this.target * this.def.level, now, this.def.tau);
    if (this.target > 0.002) {
      this.idle = 0;
      if (this.active < 0) {
        // Ensimmäinen kierros satunnaisesta kohdasta (ei aina samaa alkua).
        const e = this._el(0);
        const d = e.el.duration;
        this._start(0, Number.isFinite(d) ? Math.random() * Math.max(0, d - OVERLAP * 3) : 0);
      }
    } else if (this.active >= 0) {
      this.idle += dt;
      if (this.idle > IDLE_STOP) this.stop();
    }
    if (this.active < 0) return;
    // Silmukka: kun soiva lähestyy loppua, toinen alkaa ja ne ristiinhäivytetään.
    const cur = this.els[this.active];
    const d = cur.el.duration;
    if (Number.isFinite(d) && d > OVERLAP * 2 && cur.el.currentTime > d - OVERLAP - 0.2) {
      const next = 1 - this.active;
      this._fadeOut(this.active);
      this._start(next, 0);
    }
    for (const e of this.els) if (e && e.stopAt && now > e.stopAt) { e.el.pause(); e.started = false; e.stopAt = 0; }
  }
}

export class Sfx {
  constructor() {
    this.ctx = null;
    this.master = 1;
    this.volume = 1;
    this.beds = {};
    this.levels = { wind: 0, jungle: 0, rain: 0, thunder: 0 };
    this.treeBuf = null;
    this.noise = null;
    this.hidden = false;
    document.addEventListener('visibilitychange', () => {
      this.hidden = document.hidden;
      if (!this.ctx) return;
      if (this.hidden) this.ctx.suspend(); else this.ctx.resume();
    });
  }

  // Selain sallii äänen vasta käyttäjän eleen jälkeen.
  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended' && !this.hidden) this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.bus = this.ctx.createGain();
    this.bus.connect(this.ctx.destination);
    this._applyVolume();
    for (const [k, def] of Object.entries(BEDS)) this.beds[k] = new Bed(this, k, def);
    // Valkoinen kohina askelia varten (1 s).
    const n = this.ctx.sampleRate;
    this.noise = this.ctx.createBuffer(1, n, n);
    const ch = this.noise.getChannelData(0);
    for (let i = 0; i < n; i++) ch[i] = Math.random() * 2 - 1;
    window.fetch(TREE_FILE).then((r) => r.arrayBuffer()).then((b) => this.ctx.decodeAudioData(b)).then((buf) => { this.treeBuf = buf; }).catch(() => {});
  }

  setVolumes(master, sfx) {
    this.master = master;
    this.volume = sfx;
    this._applyVolume();
  }

  _applyVolume() {
    if (this.bus) this.bus.gain.value = this.master * this.volume;
  }

  // Taustaäänten tavoitetasot 0..1 (pelissä joka ruudulla).
  setLevels(levels) {
    for (const k in this.levels) this.levels[k] = levels[k] ?? 0;
  }

  update(dt) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    for (const [k, b] of Object.entries(this.beds)) {
      b.target = this.levels[k];
      b.update(dt);
    }
  }

  // Suunta ja etäisyys kuulijaan: palauttaa { gain, pan, dist }.
  _spatial(x, z, listener, ref = 10) {
    const dx = x - listener.x, dz = z - listener.z;
    const dist = Math.hypot(dx, dz);
    // Kameran oikea puoli: yaw 0 = katse -z, oikea = +x.
    const rx = Math.cos(listener.yaw), rz = -Math.sin(listener.yaw);
    const pan = dist > 0.5 ? Math.max(-1, Math.min(1, (dx * rx + dz * rz) / dist)) * 0.8 : 0;
    const gain = ref / Math.max(ref, dist) * Math.max(0, 1 - dist / 140);
    return { gain, pan, dist };
  }

  // Puu kaatuu: ääni alkaa kaatumisen alkaessa ja räsähdys osuu kohtaan, jossa
  // runko iskeytyy maahan (fallTime s). size 0..1 = puun koko.
  treeFall(x, z, fallTime, size, listener) {
    if (!this.ctx || !this.treeBuf || this.ctx.state !== 'running') return;
    const sp = this._spatial(x, z, listener, 12);
    if (sp.gain < 0.01) return;
    const ctx = this.ctx, now = ctx.currentTime;
    const out = ctx.createGain();
    out.gain.value = TREE_LEVEL * sp.gain * (0.65 + 0.35 * size);
    const pan = ctx.createStereoPanner();
    pan.pan.value = sp.pan;
    // Kaukana korkeat taajuudet vaimenevat.
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 18000 / (1 + sp.dist / 25);
    out.connect(lp).connect(pan).connect(this.bus);
    const delay = fallTime - TREE_CRASH_AT;
    const src = ctx.createBufferSource();
    src.buffer = this.treeBuf;
    src.connect(out);
    if (delay >= 0) {
      src.start(now + delay);
      // Pitkä kaatuminen: tiedoston alun narina soi jo heti, jotta ääni alkaa
      // puun lähtiessä kaatumaan (häivytetään pois ennen varsinaista ääntä).
      if (delay > 0.25) {
        const creak = ctx.createBufferSource();
        creak.buffer = this.treeBuf;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(1, now + 0.15);
        g.gain.setValueAtTime(1, now + delay);
        g.gain.linearRampToValueAtTime(0, now + delay + 0.3);
        creak.connect(g).connect(out);
        creak.start(now, 0.05, Math.min(TREE_CRASH_AT - 0.1, delay + 0.3));
      }
    } else {
      src.start(now, -delay);
    }
  }

  // Askel. kind: sand | grass | leaves | rock | gravel | wood | water.
  // k = voimakkuus (juoksu > kävely > hiipiminen).
  step(kind, k = 1) {
    if (!this.ctx || !this.noise || this.ctx.state !== 'running') return;
    const ctx = this.ctx, t = ctx.currentTime + 0.005;
    const P = STEPS[kind] || STEPS.grass;
    const v = (0.85 + Math.random() * 0.3) * k * P.gain;
    const out = ctx.createGain();
    out.gain.value = v;
    out.connect(this.bus);
    // Kohinaosa (hiekan rahina, ruohon rapina, soran rapse, veden loiske).
    for (let b = 0; b < P.bursts; b++) {
      const t0 = t + b * P.spread * (0.7 + Math.random() * 0.6);
      const src = ctx.createBufferSource();
      src.buffer = this.noise;
      const f = ctx.createBiquadFilter();
      f.type = P.filter;
      const freq = P.freq * (0.85 + Math.random() * 0.3);
      f.frequency.setValueAtTime(freq, t0);
      if (P.sweep) f.frequency.exponentialRampToValueAtTime(freq * P.sweep, t0 + P.decay);
      f.Q.value = P.q;
      const g = ctx.createGain();
      const amp = b === 0 ? 1 : P.tail;
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(amp, t0 + P.attack);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + P.attack + P.decay);
      src.connect(f).connect(g).connect(out);
      src.start(t0, Math.random() * 0.8, P.attack + P.decay + 0.02);
    }
    // Matala tömähdys (kantapää maahan; puulattialla ontto).
    if (P.thud) {
      const o = ctx.createOscillator();
      o.type = 'sine';
      const f0 = P.thud * (0.9 + Math.random() * 0.2);
      o.frequency.setValueAtTime(f0, t);
      o.frequency.exponentialRampToValueAtTime(f0 * 0.6, t + P.thudDecay);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(P.thudGain, t + 0.006);
      g.gain.exponentialRampToValueAtTime(0.001, t + P.thudDecay);
      o.connect(g).connect(out);
      o.start(t);
      o.stop(t + P.thudDecay + 0.02);
    }
  }
}

// Askelten synteesi materiaaleittain (Clauden arvot): suodatettu kohina +
// matala tömähdys. gain = kokonaisvoimakkuus.
const STEPS = {
  sand: { gain: 0.16, bursts: 2, spread: 0.05, tail: 0.5, filter: 'lowpass', freq: 1500, q: 0.6, attack: 0.02, decay: 0.16, thud: 90, thudGain: 0.35, thudDecay: 0.07 },
  grass: { gain: 0.13, bursts: 3, spread: 0.035, tail: 0.6, filter: 'bandpass', freq: 3200, q: 0.9, attack: 0.008, decay: 0.09, thud: 110, thudGain: 0.3, thudDecay: 0.06 },
  leaves: { gain: 0.14, bursts: 3, spread: 0.04, tail: 0.55, filter: 'bandpass', freq: 1900, q: 0.8, attack: 0.01, decay: 0.12, thud: 85, thudGain: 0.45, thudDecay: 0.08 },
  gravel: { gain: 0.13, bursts: 4, spread: 0.022, tail: 0.7, filter: 'highpass', freq: 2400, q: 0.7, attack: 0.003, decay: 0.05, thud: 120, thudGain: 0.3, thudDecay: 0.05 },
  rock: { gain: 0.12, bursts: 1, spread: 0.02, tail: 0.5, filter: 'bandpass', freq: 2800, q: 1.4, attack: 0.002, decay: 0.045, thud: 140, thudGain: 0.55, thudDecay: 0.05 },
  wood: { gain: 0.15, bursts: 1, spread: 0.02, tail: 0.5, filter: 'bandpass', freq: 900, q: 2.2, attack: 0.002, decay: 0.06, thud: 170, thudGain: 0.8, thudDecay: 0.11 },
  water: { gain: 0.2, bursts: 2, spread: 0.07, tail: 0.6, filter: 'bandpass', freq: 500, q: 1.1, sweep: 3.2, attack: 0.02, decay: 0.22, thud: 0 },
};
