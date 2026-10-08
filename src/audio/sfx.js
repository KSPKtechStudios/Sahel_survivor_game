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
  // Viidakko: hiljempi ja pehmeämpi (sessio 12: linnut kuuluivat terävästi).
  jungle: { file: 'assets/sfx/jungle.mp3', level: 0.22, tau: 0.9, lowpass: 4200 },
  rain: { file: 'assets/sfx/rain.mp3', level: 0.42, tau: 1.2 },
  thunder: { file: 'assets/sfx/thunder-distant.mp3', level: 0.42, tau: 2.2 },
  // Sessio 12c: aavikon tuuli (aina hyvin hiljaa, hiekkamyrskyssä kovaa) ja
  // raju myrskytuuli (merellä ukkosella, hiekkamyrskyssä puuskittain).
  desertWind: { file: 'assets/sfx/desert-wind.mp3', level: 0.3, tau: 1.6 },
  stormWind: { file: 'assets/sfx/storm-wind.mp3', level: 0.3, tau: 1.4 },
};
const OVERLAP = 3;         // silmukan ristiinhäivytys (s)
const IDLE_STOP = 6;       // hiljainen kerros pysäytetään tämän jälkeen (s)

// Kertaäänet (puretaan muistiin; lyhyitä).
const ONESHOTS = {
  tree: 'assets/sfx/tree-fall.mp3',
  clap1: 'assets/sfx/thunder-clap1.mp3',
  clap2: 'assets/sfx/thunder-clap2.mp3',
  ghostSpawn: 'assets/sfx/ghost-spawn.mp3',
  ghostIdle: 'assets/sfx/ghost-idle.mp3',
  ghostAttack: 'assets/sfx/ghost-attack.mp3',
  ghostIdle2: 'assets/sfx/ghost-idle2.mp3',
  click: 'assets/sfx/click.mp3',
  chop: 'assets/sfx/chop-wood.mp3',
  bird: 'assets/sfx/bird.mp3',
  whoosh1: 'assets/sfx/whoosh1.mp3',
  whoosh2: 'assets/sfx/whoosh2.mp3',
  punch1: 'assets/sfx/punch1.mp3',
  punch2: 'assets/sfx/punch2.mp3',
};
// Huitominen: tasattu huipputason mukaan (tiedostojen huiput −1,6 / −6,8 dB),
// jolloin huitaisu on n. −24 dB ja olentoon osuessa n. −31 dB.
const WHOOSH_LEVEL = { whoosh1: 0.06, whoosh2: 0.11 };  // sessio 12e: −2 dB
const BIRD_LEVEL = 0.22;
// Puun kaatuminen: räsähdyksen kohta tiedostossa (s) ja voimakkuus 10 m:stä.
// Räsähdyksen jälkeen ääni häivytetään pois (TREE_TAIL s), ettei maassa
// makaava puu jää rätisemään.
// Sessio 12d: tiedostossa alun narina on venytetty (räsähdys 1,74 s:ssa) ja
// jälkiräsähdys leikattu; ääni hiipuu itsestään n. 1,4 s räsähdyksen jälkeen.
const TREE_CRASH_AT = 1.74;
const TREE_LEVEL = 0.3;
const TREE_TAIL = 1.5;
// Lähisalaman jyrähdys ja Haamun äänet (tiedostot −16 LUFS).
const CLAP_LEVEL = 0.65;
// Haamu kuuluu kauempaa (se ilmestyy 32–52 m:n päähän): vaimennus alkaa vasta
// 22 m:stä (sessio 12c; ennen 8 m, jolloin ilmestymisääni jäi lähes kuulumattomiin).
const GHOST_LEVEL = { ghostSpawn: 0.45, ghostIdle: 0.4, ghostIdle2: 0.38, ghostAttack: 0.4 };
const GHOST_REF = 22, GHOST_RANGE = 95;
const CLICK_LEVEL = 0.45;  // tiedosto on hiljainen (n. −31 LUFS); sessio 12e hiljemmaksi
const CHOP_LEVEL = 0.1;    // puun lyönti: hiljaa (väistö auttaa erottumaan)
// Isku elävään olentoon (sessio 12e): terävä, joten hiljaa ja tummennettuna.
const PUNCH_LEVEL = { punch1: 0.11, punch2: 0.13 };

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
    if (def.lowpass) {
      const lp = sfx.ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = def.lowpass;
      lp.Q.value = 0.5;
      this.out.connect(lp).connect(sfx.bedBus);
    } else {
      this.out.connect(sfx.bedBus);
    }
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
    this.levels = { wind: 0, jungle: 0, rain: 0, thunder: 0, desertWind: 0, stormWind: 0 };
    this.bufs = {};
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
    // Taustaäänet omalla väylällään, jota tärkeät tehosteet painavat hetkeksi
    // hiljemmaksi (väistö, sessio 12e).
    this.bedBus = this.ctx.createGain();
    this.bedBus.connect(this.bus);
    this._applyVolume();
    for (const [k, def] of Object.entries(BEDS)) this.beds[k] = new Bed(this, k, def);
    // Valkoinen kohina askelia varten (1 s).
    const n = this.ctx.sampleRate;
    this.noise = this.ctx.createBuffer(1, n, n);
    const ch = this.noise.getChannelData(0);
    for (let i = 0; i < n; i++) ch[i] = Math.random() * 2 - 1;
    for (const [k, file] of Object.entries(ONESHOTS)) {
      window.fetch(file).then((r) => r.arrayBuffer()).then((b) => this.ctx.decodeAudioData(b)).then((buf) => { this.bufs[k] = buf; }).catch(() => {});
    }
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
  _spatial(x, z, listener, ref = 10, range = 140) {
    const dx = x - listener.x, dz = z - listener.z;
    const dist = Math.hypot(dx, dz);
    // Kameran oikea puoli: yaw 0 = katse -z, oikea = +x.
    const rx = Math.cos(listener.yaw), rz = -Math.sin(listener.yaw);
    const pan = dist > 0.5 ? Math.max(-1, Math.min(1, (dx * rx + dz * rz) / dist)) * 0.8 : 0;
    const gain = ref / Math.max(ref, dist) * Math.max(0, 1 - dist / range);
    return { gain, pan, dist };
  }

  // Puu kaatuu: ääni alkaa kaatumisen alkaessa ja räsähdys osuu kohtaan, jossa
  // runko iskeytyy maahan (fallTime s). size 0..1 = puun koko.
  treeFall(x, z, fallTime, size, listener) {
    const buf = this.bufs.tree;
    if (!this.ctx || !buf || this.ctx.state !== 'running') return;
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
    src.buffer = buf;
    // Häivytys räsähdyksen jälkeen.
    const tail = ctx.createGain();
    const crashT = now + fallTime;
    tail.gain.setValueAtTime(1, crashT + 0.25);
    tail.gain.linearRampToValueAtTime(0, crashT + TREE_TAIL);
    src.connect(tail).connect(out);
    // Yksi yhtenäinen ääni (sessio 12d: erillinen narinakopio katkesi kesken
    // ja ääni "tökkäsi"): lyhyt kaatuminen alkaa tiedostosta myöhemmin, pitkä
    // hieman viiveellä.
    if (delay >= 0) src.start(now + delay);
    else src.start(now, -delay);
    if (sp.dist < 60) this.duck(0.5, Math.max(0.4, fallTime) + 1.2);
    src.stop(crashT + TREE_TAIL + 0.05);
  }

  // Lyhyt ääni paikasta (x, z): suunta ja etäisyysvaimennus.
  _oneShot(name, level, x, z, listener, ref = 10, delay = 0, range = 140, rate = null, fadeIn = 0) {
    const buf = this.bufs[name];
    if (!this.ctx || !buf || this.ctx.state !== 'running') return;
    const sp = this._spatial(x, z, listener, ref, range);
    if (sp.gain < 0.01) return;
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = rate ?? 0.96 + Math.random() * 0.08;
    const g = ctx.createGain();
    const t0 = ctx.currentTime + delay;
    if (fadeIn > 0) {
      // Pehmeä alku (sessio 19: linnun ääni alkoi turhan yhtäkkiä).
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0002, level * sp.gain), t0 + fadeIn);
    } else {
      g.gain.value = level * sp.gain;
    }
    const pan = ctx.createStereoPanner();
    pan.pan.value = sp.pan;
    src.connect(g).connect(pan).connect(this.bus);
    src.start(t0);
  }

  // Lähelle iskevän salaman jyrähdys (satunnaisesti jompikumpi tiedosto).
  // Ääni tulee salaman suunnasta lähes samaan aikaan välähdyksen kanssa.
  thunderClap(x, z, dist, listener) {
    const name = Math.random() < 0.5 ? 'clap1' : 'clap2';
    const k = 1 - Math.min(1, Math.max(0, (dist - 50) / 250)) * 0.5;
    this._oneShot(name, CLAP_LEVEL * k, x, z, listener, 1e4, Math.min(0.25, dist / 900), 1e6);
  }

  // Haamun äänet: spawn (ilmestyy / kirkaisu ennen syöksyä), idle, attack.
  ghost(kind, x, z, listener) {
    const name = kind === 'spawn' ? 'ghostSpawn' : kind === 'attack' ? 'ghostAttack' : Math.random() < 0.5 ? 'ghostIdle' : 'ghostIdle2';
    this._oneShot(name, GHOST_LEVEL[name], x, z, listener, GHOST_REF, 0, GHOST_RANGE);
    if (Math.hypot(x - listener.x, z - listener.z) < 60) this.duck(0.6, 1.2);
  }

  // Esineen heitto (napsahdus, ei suuntaa).
  click() {
    const buf = this.bufs.click;
    if (!this.ctx || !buf || this.ctx.state !== 'running') return;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = 0.95 + Math.random() * 0.1;
    const g = this.ctx.createGain();
    g.gain.value = CLICK_LEVEL;
    src.connect(g).connect(this.bus);
    src.start();
  }

  // Isku puuhun: hiljainen kopsahdus, sävelkorkeus vaihtelee joka iskulla.
  chop(x, z, listener) {
    this._oneShot('chop', CHOP_LEVEL * (0.8 + Math.random() * 0.4), x, z, listener, 4, 0, 60, 0.82 + Math.random() * 0.4);
    this.duck(0.7, 0.25);
  }

  // Väistö: taustaäänet ja musiikki painuvat hetkeksi hiljemmaksi, jotta
  // tärkeä tehoste (puu, isku, olento) erottuu sateen, tuulen ja musiikin alta.
  duck(to = 0.55, hold = 0.45) {
    if (!this.ctx || !this.bedBus) return;
    const now = this.ctx.currentTime, g = this.bedBus.gain;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(Math.min(g.value, to), now + 0.04);
    g.setTargetAtTime(1, now + hold, 0.35);
    if (this.onDuck) this.onDuck(to, hold);
  }

  // Isku elävään olentoon: kumpi tahansa kahdesta, vaihteleva korkeus, hieman
  // tummennettu (terävimmät korkeat pois).
  punch(heavy = false) {
    const name = Math.random() < 0.5 ? 'punch1' : 'punch2';
    const buf = this.bufs[name];
    if (!this.ctx || !buf || this.ctx.state !== 'running') return;
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = (heavy ? 0.78 : 0.9) + Math.random() * 0.22;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 5200;
    const g = ctx.createGain();
    g.gain.value = PUNCH_LEVEL[name] * (heavy ? 1.15 : 1) * (0.85 + Math.random() * 0.3);
    src.connect(lp).connect(g).connect(this.bus);
    src.start();
    this.duck(0.6, 0.35);
  }

  // Huitaisu työkalulla tai aseella: satunnainen tiedosto ja sävelkorkeus.
  // Olentoon osuessa hiljempaa.
  whoosh(heavy = false, quiet = false) {
    const name = Math.random() < 0.5 ? 'whoosh1' : 'whoosh2';
    const buf = this.bufs[name];
    if (!this.ctx || !buf || this.ctx.state !== 'running') return;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    // Raskas ase matalampi ja hitaampi.
    src.playbackRate.value = (heavy ? 0.72 : 0.92) + Math.random() * 0.3;
    const g = this.ctx.createGain();
    g.gain.value = WHOOSH_LEVEL[name] * (quiet ? 0.45 : 1) * (0.85 + Math.random() * 0.3);
    const pan = this.ctx.createStereoPanner();
    pan.pan.value = 0.15 + Math.random() * 0.15;
    src.connect(g).connect(pan).connect(this.bus);
    src.start();
  }

  // Lintu jossain lähellä (satunnainen suunta ja etäisyys).
  bird(listener) {
    const a = Math.random() * Math.PI * 2, r = 8 + Math.random() * 30;
    this._oneShot('bird', BIRD_LEVEL * (0.6 + Math.random() * 0.5), listener.x + Math.cos(a) * r, listener.z + Math.sin(a) * r, listener, 12, 0, 80, 0.88 + Math.random() * 0.25, 0.9);
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
