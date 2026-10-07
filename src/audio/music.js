// Musiikki. Päävalikossa soi oma kappale normaalilla voimakkuudella; pelissä
// biomikohtaiset kappaleet soivat hiljaa taustalla, jotta tuleville
// äänitehosteille jää tilaa. Kappaleet soivat silmukkana.
//
// Biomin musiikki alkaa vasta, kun biomissa on oltu hetki (viive), ja vaihtuu
// pitkillä häivytyksillä. Kappale soi vähintään MIN_HOLD sekuntia ennen kuin se
// vaihtuu toiseen, joten biomien rajalla kulkiessa musiikki ei vaihtele.

export const TRACKS = {
  menu: { file: 'assets/music/deep-exploration.mp3', name: 'Deep Exploration', lufs: -14.1 },
  savanna: { file: 'assets/music/savannah-dawn.mp3', name: 'Savannah Dawn', lufs: -15.2 },
  desert: { file: 'assets/music/caravan-of-the-desert.mp3', name: 'Caravan of the Desert', lufs: -14.4 },
  ocean: { file: 'assets/music/grand-ocean-adventure.mp3', name: 'Grand Ocean Adventure', lufs: -15.0 },
  // Sademetsälle ei ole omaa kappaletta: väliaikaisesti päävalikon kappale
  // (pelin hiljaisella tasolla), kunnes käyttäjä toimittaa oman.
  jungle: { file: 'assets/music/deep-exploration.mp3', name: 'Deep Exploration (sademetsä)', lufs: -14.1 },
  // assets/music/hiekan-jaljet.mp3: ei vielä paikkaa (kysytään käyttäjältä).
};

// Biomi (terrain.js: displayBiome) -> kappale. Sahelin savanni muunnelmineen
// soittaa savannin kappaletta, aavikko (dyynit ja keitaat mukaan lukien)
// aavikon kappaletta, meri meren kappaletta ja sademetsä (väliaikaisesti)
// päävalikon kappaletta. Vuoristossa ja rannalla on hiljaista.
export const BIOME_MUSIC = {
  savanna: 'savanna', laterite: 'savanna', mare: 'savanna', woodland: 'savanna',
  desert: 'desert', oasis: 'desert',
  ocean: 'ocean',
  rainforest: 'jungle',
};

// Voimakkuudet. Kappaleet tasataan samaan äänekkyyteen (mitattu EBU R128
// -menetelmällä), sitten valikko soi täydellä ja peli 12 dB hiljempaa.
const REF_LUFS = -16;
export const MENU_LEVEL = 1.0;
export const GAME_LEVEL = 0.25;   // −12 dB: taustamusiikki

// Ajat sekunteina
const FIRST_DELAY = 3;     // pelin alussa ennen ensimmäistä kappaletta
const ENTER_DELAY = 5;     // uudessa biomissa oltava näin kauan ennen vaihtoa
const LEAVE_DELAY = 10;    // musiikittomalle alueelle: hiljenee vasta tämän jälkeen
const MIN_HOLD = 20;       // kappale soi vähintään näin kauan ennen vaihtoa
const FADE_IN = 6;         // biomin kappale voimistuu
const FADE_OUT = 3.5;      // biomin kappale hiljenee
const GAP = 1;             // hiljaisuus kahden biomikappaleen välissä
const MENU_FADE_IN = 3;
const QUICK_FADE_OUT = 2.5; // valikosta peliin ja pelistä valikkoon
const RESUME_WITHIN = 90;  // palataanko kesken jääneeseen kohtaan (muuten alusta)

export class Music {
  constructor() {
    this.tracks = {};
    for (const [key, t] of Object.entries(TRACKS)) {
      this.tracks[key] = { key, ...t, norm: Math.min(1, 10 ** ((REF_LUFS - t.lufs) / 20)), el: null, fade: 0, playing: false, stoppedAt: -1e9, blocked: false };
    }
    this.master = 1;
    this.music = 0.8;
    this.unlocked = false;
    this.mode = 'none';       // 'menu' | 'game' | 'none'
    this.current = null;      // soiva (tai hiljenevä) kappale
    this.wanted = null;       // kappale, jonka pitäisi soida
    this.candidate = undefined; // pelissä: biomin kappale, joka odottaa vaihtoa
    this.candT = 0;
    this.holdT = 0;
    this.gap = 0;
    this.firstZone = true;
    this.time = 0;
    this.hidden = false;
    document.addEventListener('visibilitychange', () => this._visibility());
  }

  // Selain sallii äänen vasta käyttäjän eleen jälkeen.
  unlock() {
    if (this.unlocked) return;
    this.unlocked = true;
    for (const t of Object.values(this.tracks)) {
      if (t.playing && t.el && t.el.paused) {
        // Esto purkautui: kappale alkaa alusta ja voimistuu pehmeästi.
        t.fade = 0;
        try { t.el.currentTime = 0; } catch { /* ei vielä ladattu */ }
        this._play(t);
      }
    }
  }

  // Musiikki väistää hetkeksi (to = kerroin, hold = s).
  duck(to, hold) {
    if (!Number.isFinite(to) || !Number.isFinite(hold)) return;
    this.duckTo = Math.min(this.duckHold > 0 ? this.duckTo : 1, to);
    this.duckHold = Math.max(this.duckHold || 0, hold);
  }

  setVolumes(master, music) {
    this.master = Math.max(0, Math.min(1, master));
    this.music = Math.max(0, Math.min(1, music));
  }

  // 'menu' = päävalikko, 'game' = pelissä (biomit), 'none' = hiljaisuus (lataus).
  setMode(mode) {
    if (mode === this.mode) return;
    if (mode === 'game') {
      // Uusi peli: ensimmäinen biomi pienellä viiveellä.
      this.firstZone = true;
      this.candidate = undefined;
      this.candT = 0;
    }
    this.mode = mode;
  }

  // dt = sekunnit, zone = biomin kappaleen avain tai null (vain pelissä).
  update(dt, zone = null) {
    this.time += dt;
    // --- Mitä pitäisi soida
    if (this.mode === 'menu') {
      this.wanted = 'menu';
    } else if (this.mode === 'game') {
      if (this.wanted === 'menu') this.wanted = null;
      if (zone !== this.candidate) { this.candidate = zone; this.candT = 0; } else this.candT += dt;
      if (this.candidate !== this.wanted) {
        const need = this.firstZone ? FIRST_DELAY : this.candidate === null ? LEAVE_DELAY : ENTER_DELAY;
        const holdOk = !this.current || this.current !== this.wanted || this.holdT >= MIN_HOLD;
        if (this.candT >= need && holdOk) {
          this.wanted = this.candidate;
          this.firstZone = false;
        }
      }
      // Ladataan odottava kappale valmiiksi, jottei sen alku viivästy.
      if (this.candidate && this.candidate !== this.current) this._ensure(this.tracks[this.candidate]);
    } else {
      this.wanted = null;
    }

    // --- Häivytykset
    if (this.current) {
      const t = this.tracks[this.current];
      if (this.current === this.wanted) {
        t.fade = Math.min(1, t.fade + dt / (this.current === 'menu' ? MENU_FADE_IN : FADE_IN));
        this.holdT += dt;
      } else {
        const quick = this.current === 'menu' || this.mode !== 'game';
        t.fade = Math.max(0, t.fade - dt / (quick ? QUICK_FADE_OUT : FADE_OUT));
        if (t.fade <= 0) {
          this._stop(t);
          const fromMenu = this.current === 'menu';
          this.current = null;
          this.gap = this.wanted && !fromMenu && this.wanted !== 'menu' ? GAP : 0.3;
        }
      }
    }
    if (!this.current && this.wanted) {
      this.gap -= dt;
      if (this.gap <= 0) {
        this.current = this.wanted;
        this.holdT = 0;
        this._start(this.tracks[this.current]);
      }
    }

    // --- Voimakkuudet
    // Väistö (sessio 12e): tärkeä äänitehoste painaa musiikkia hetkeksi
    // hiljemmaksi (sfx.js: duck), jotta tehosteet erottuvat.
    if (!Number.isFinite(dt)) return;
    this.duckHold = (this.duckHold || 0) - dt;
    const duckT = this.duckHold > 0 ? this.duckTo : 1;
    this.duckMul = (this.duckMul ?? 1) + (duckT - (this.duckMul ?? 1)) * Math.min(1, dt * (duckT < (this.duckMul ?? 1) ? 25 : 2.5));
    if (!Number.isFinite(this.duckMul)) this.duckMul = 1;
    for (const t of Object.values(this.tracks)) {
      if (!t.el) continue;
      if (!Number.isFinite(t.fade)) t.fade = 0;
      const level = t.key === 'menu' ? MENU_LEVEL : GAME_LEVEL;
      // Neliöllinen käyrä: häivytys kuulostaa tasaiselta (lähes desibeleinä).
      const v = t.norm * level * t.fade * t.fade * this.music * this.master * (t.key === 'menu' ? 1 : this.duckMul);
      // Varmistus: ei-äärellinen arvo heittäisi virheen ja pysäyttäisi pelisilmukan.
      if (Number.isFinite(v)) t.el.volume = Math.max(0, Math.min(1, v));
    }
  }

  // Tekstinä kehittäjätyökaluihin.
  describe() {
    const parts = [];
    if (this.current) {
      const t = this.tracks[this.current];
      parts.push(`${t.name} ${Math.round(t.fade * 100)} %${this.current === this.wanted ? '' : ' (hiljenee)'}`);
    } else {
      parts.push('hiljaista');
    }
    if (this.mode === 'game' && this.candidate !== this.wanted) {
      const name = this.candidate ? this.tracks[this.candidate].name : 'hiljaisuus';
      const need = this.firstZone ? FIRST_DELAY : this.candidate === null ? LEAVE_DELAY : ENTER_DELAY;
      parts.push(`seuraavaksi ${name} ${Math.min(need, this.candT).toFixed(0)}/${need} s`);
    }
    if (!this.unlocked) parts.push('odottaa klikkausta');
    return parts.join(' · ');
  }

  // --- Sisäiset --------------------------------------------------------------
  _ensure(t) {
    if (t.el) return t.el;
    const el = document.createElement('audio');
    el.preload = 'auto';
    el.loop = true;
    el.volume = 0;
    el.src = t.file;
    t.el = el;
    return el;
  }

  _start(t) {
    const el = this._ensure(t);
    t.fade = 0;
    t.playing = true;
    // Pian takaisin tultaessa jatketaan samasta kohdasta, muuten alusta.
    if (this.time - t.stoppedAt > RESUME_WITHIN) {
      try { el.currentTime = 0; } catch { /* ei vielä ladattu */ }
    }
    this._play(t);
  }

  _play(t) {
    if (this.hidden) return;
    const p = t.el.play();
    if (p && p.catch) {
      p.then(() => { t.blocked = false; }).catch(() => { t.blocked = true; });
    }
  }

  _stop(t) {
    t.playing = false;
    t.fade = 0;
    t.stoppedAt = this.time;
    if (t.el) t.el.pause();
  }

  // Välilehti piilossa: musiikki tauolle.
  _visibility() {
    this.hidden = document.hidden;
    for (const t of Object.values(this.tracks)) {
      if (!t.el || !t.playing) continue;
      if (this.hidden) t.el.pause();
      else if (this.unlocked) this._play(t);
    }
  }
}
