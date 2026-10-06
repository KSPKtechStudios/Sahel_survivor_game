// Pää- ja taukovalikko, maailmojen valinta, asetukset ja latausruutu.
import { listWorlds, createWorld, deleteWorld, saveSettings } from '../game/save.js';
import { seedFromString, randomSeed, setWorldSeed, getWorldSeed, drawWorldMap } from '../world/terrain.js';

const $ = (id) => document.getElementById(id);

function makeScroll(subtitle = '') {
  const node = $('tpl-scroll').content.firstElementChild.cloneNode(true);
  node.querySelector('.scroll-sub').textContent = subtitle;
  return node;
}

function openScroll(scroll, delay = 60) {
  scroll.classList.remove('open');
  setTimeout(() => scroll.classList.add('open'), delay);
}

// Pehmeä hiekkapöllähdys napin painalluksesta.
function puff(x, y) {
  const host = $('puffs');
  for (let i = 0; i < 12; i++) {
    const p = document.createElement('i');
    p.className = 'puff';
    const a = Math.random() * Math.PI * 2;
    const d = 18 + Math.random() * 30;
    p.style.left = `${x}px`;
    p.style.top = `${y}px`;
    p.style.setProperty('--dx', `${Math.cos(a) * d}px`);
    p.style.setProperty('--dy', `${Math.sin(a) * d - 8}px`);
    p.style.setProperty('--s', `${1.2 + Math.random() * 1.6}`);
    host.appendChild(p);
    setTimeout(() => p.remove(), 750);
  }
}

function fmtDate(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return `${d.getDate()}.${d.getMonth() + 1}. klo ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export class Menu {
  constructor({ settings, onPlay, onResume, onQuit, onSettings }) {
    Object.assign(this, { settings, onPlay, onResume, onQuit, onSettings });
    this.main = $('mainmenu');
    this.pause = $('pausemenu');
    this.loading = $('loading');
    this.settingsPanel = $('settings-panel');

    this.mainScroll = makeScroll();
    this.main.querySelector('.scroll-slot').appendChild(this.mainScroll);
    this.pauseScroll = makeScroll('Tauko');
    this.pause.querySelector('.scroll-slot').appendChild(this.pauseScroll);
    this.loadScroll = makeScroll();
    this.loading.querySelector('.scroll-slot').appendChild(this.loadScroll);
    openScroll(this.loadScroll, 30);

    this.root = { main: 'main', pause: 'pause' };
    this.introDone = false;

    document.addEventListener('pointerdown', (e) => {
      const b = e.target.closest('.wood-btn, .mini-btn');
      if (b && !b.disabled) puff(e.clientX, e.clientY);
    });

    // Asetuspaneeli siirretään aina näkyvän valikon sisään, joten kuuntelijat riittävät näkymille.
    for (const screen of [this.main, this.pause]) {
      screen.addEventListener('click', (e) => {
        const b = e.target.closest('[data-action]');
        if (!b || b.disabled) return;
        this._action(b.dataset.action, b);
      });
    }

    this._bindWorlds();
    this._bindSettings();
  }

  // --- Näkymät ---------------------------------------------------------------

  showMain() {
    this.pause.classList.add('hidden');
    this.main.classList.remove('hidden');
    const first = !this.introDone;
    this.introDone = true;
    this._go(this.main, 'main', true, first);
    openScroll(this.mainScroll, first ? 200 : 40);
  }

  hideMain() {
    this.main.classList.add('hidden');
  }

  showPause(status = '') {
    this.pause.classList.remove('hidden');
    $('pm-status').textContent = status;
    this._go(this.pause, 'pause', true);
    openScroll(this.pauseScroll, 20);
  }

  hidePause() {
    this.pause.classList.add('hidden');
  }

  isPauseOpen() {
    return !this.pause.classList.contains('hidden');
  }

  // Jos alipaneeli (esim. asetukset) on auki, palaa juureen. Palauttaa true, jos palattiin.
  back(screenEl) {
    const active = screenEl.querySelector('.panel.active');
    const rootName = screenEl === this.main ? 'main' : 'pause';
    if (active && active.dataset.panel !== rootName) {
      this._go(screenEl, rootName);
      return true;
    }
    return false;
  }

  showLoading(text, overWorld = false) {
    this.loading.classList.remove('hidden');
    this.loading.classList.toggle('over-world', overWorld);
    $('load-text').textContent = text;
    $('load-fill').style.width = '0%';
    $('load-fill').parentElement.classList.remove('hidden');
    $('btn-enter').classList.add('hidden');
    openScroll(this.loadScroll, 30);
  }

  setLoading(p) {
    $('load-fill').style.width = `${Math.round(p * 100)}%`;
  }

  // Lataus valmis: odota klikkausta (hiiren lukitus vaatii käyttäjän eleen).
  loadingReady(text, onEnter) {
    // Näytä valmis maailma taustalla.
    this.loading.classList.add('over-world');
    $('load-text').textContent = text;
    $('load-fill').parentElement.classList.add('hidden');
    const btn = $('btn-enter');
    btn.classList.remove('hidden');
    btn.onclick = () => onEnter();
  }

  hideLoading() {
    this.loading.classList.add('hidden');
  }

  // --- Paneelit -----------------------------------------------------------------

  _go(screenEl, name, instant = false, intro = false) {
    const panels = screenEl.querySelector('.panels');
    if (name === 'settings' && this.settingsPanel.parentElement !== panels) {
      panels.appendChild(this.settingsPanel);
      this._syncSettings();
    }
    const current = panels.querySelector('.panel.active');
    const next = panels.querySelector(`.panel[data-panel="${name}"]`);
    if (!next || current === next) {
      if (next && intro) next.classList.add('intro');
      return;
    }
    if (current) {
      current.classList.remove('active', 'intro');
      if (!instant) {
        current.classList.add('leaving');
        setTimeout(() => current.classList.remove('leaving'), 270);
      }
    }
    next.classList.toggle('intro', intro);
    next.classList.add('active');
    const slot = screenEl.querySelector('.scroll-slot');
    slot.classList.toggle('shrink', name !== 'main' && name !== 'pause');
    if (name === 'worlds') this._renderWorlds();
  }

  _action(action, btn) {
    const screenEl = this.main.contains(btn) ? this.main : this.pause.contains(btn) ? this.pause : this.settingsPanel.closest('.screen');
    // Pieni viive, jotta painalluksen animaatio ehtii näkyä.
    const later = (fn) => setTimeout(fn, 110);
    switch (action) {
      case 'worlds': later(() => this._go(this.main, 'worlds')); break;
      case 'settings': later(() => this._go(screenEl, 'settings')); break;
      case 'back': later(() => this._go(screenEl, screenEl === this.main ? 'main' : 'pause')); break;
      case 'resume': later(() => this.onResume()); break;
      case 'quit': later(() => this.onQuit()); break;
      default: break;
    }
  }

  // --- Maailmat -----------------------------------------------------------------

  _bindWorlds() {
    this.nameInput = $('nw-name');
    this.seedInput = $('nw-seed');
    this.mapCanvas = $('nw-map');
    this.mapCtx = this.mapCanvas.getContext('2d');
    this.randomSeed = randomSeed();
    let timer = 0;
    this.seedInput.addEventListener('input', () => {
      clearTimeout(timer);
      this.mapCanvas.classList.add('busy');
      timer = setTimeout(() => this._drawPreview(), 280);
    });
    $('nw-dice').addEventListener('click', () => {
      this.seedInput.value = String(randomSeed());
      this._drawPreview();
    });
    $('nw-create').addEventListener('click', () => {
      const seed = this._currentSeed();
      const meta = createWorld(this.nameInput.value, seed);
      setTimeout(() => this.onPlay(meta), 120);
    });
    // Enter-näppäin syöttökentissä ei saa käynnistää muita toimintoja.
    for (const inp of [this.nameInput, this.seedInput]) {
      inp.addEventListener('keydown', (e) => {
        e.stopPropagation();
        if (e.key === 'Enter') $('nw-create').click();
      });
    }
  }

  _currentSeed() {
    const txt = this.seedInput.value.trim();
    return txt ? seedFromString(txt) : this.randomSeed;
  }

  _drawPreview() {
    const seed = this._currentSeed();
    const prev = getWorldSeed();
    setWorldSeed(seed);
    drawWorldMap(this.mapCtx, this.mapCanvas.width);
    setWorldSeed(prev);
    const ctx = this.mapCtx;
    const c = this.mapCanvas.width / 2;
    ctx.beginPath();
    ctx.arc(c, c, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#ff8a2a';
    ctx.strokeStyle = '#2a1405';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fill();
    this.mapCanvas.classList.remove('busy');
  }

  _renderWorlds() {
    const list = listWorlds();
    const host = $('world-list');
    host.innerHTML = '';
    if (!list.length) {
      host.innerHTML = '<div class="world-empty">Ei vielä maailmoja. Luo ensimmäinen oikealla.</div>';
    }
    list.forEach((w, i) => {
      const row = document.createElement('div');
      row.className = 'world-row';
      row.style.animationDelay = `${i * 0.05}s`;
      row.innerHTML = `
        <div class="w-info"><div class="w-name"></div><div class="w-meta"></div></div>
        <button class="mini-btn play" type="button">Pelaa</button>
        <button class="mini-btn del" type="button" title="Poista maailma">✕</button>`;
      row.querySelector('.w-name').textContent = w.name;
      row.querySelector('.w-meta').textContent = `Siemen ${w.seed} · ${fmtDate(w.lastPlayed)}`;
      row.querySelector('.play').addEventListener('click', () => setTimeout(() => this.onPlay(w), 120));
      const del = row.querySelector('.del');
      del.addEventListener('click', () => {
        if (!del.classList.contains('confirm')) {
          del.classList.add('confirm');
          del.textContent = 'Poista?';
          setTimeout(() => { del.classList.remove('confirm'); del.textContent = '✕'; }, 2600);
          return;
        }
        row.style.transition = 'opacity .25s, transform .25s';
        row.style.opacity = '0';
        row.style.transform = 'translateX(20px)';
        setTimeout(() => { deleteWorld(w.id); this._renderWorlds(); }, 250);
      });
      host.appendChild(row);
    });
    this.nameInput.value = `Maailma ${list.length + 1}`;
    this.randomSeed = randomSeed();
    this.seedInput.value = '';
    this.seedInput.placeholder = `satunnainen (${this.randomSeed})`;
    this.mapCanvas.classList.add('busy');
    setTimeout(() => this._drawPreview(), 60);
  }

  // --- Asetukset ------------------------------------------------------------------

  _bindSettings() {
    const s = this.settings;
    const bindRange = (id, key, fmt) => {
      const el = $(id);
      const out = el.parentElement.querySelector('output');
      el.addEventListener('input', () => {
        s[key] = parseFloat(el.value);
        out.textContent = fmt(s[key]);
        this._changed();
      });
    };
    bindRange('set-sens', 'sensitivity', (v) => `${v.toFixed(2)}×`);
    bindRange('set-fov', 'fov', (v) => `${v}°`);
    bindRange('set-view', 'viewDistance', (v) => `${v * 64} m`);
    bindRange('set-scale', 'renderScale', (v) => `${Math.round(v * 100)} %`);
    $('set-invert').addEventListener('change', (e) => { s.invertY = e.target.checked; this._changed(); });
    $('set-fps').addEventListener('change', (e) => { s.showFps = e.target.checked; this._changed(); });
    $('set-shadows').addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      s.shadows = b.dataset.v;
      this._syncSettings();
      this._changed();
    });
    this._syncSettings();
  }

  _syncSettings() {
    const s = this.settings;
    const set = (id, v, txt) => {
      const el = $(id);
      el.value = v;
      el.parentElement.querySelector('output').textContent = txt;
    };
    set('set-sens', s.sensitivity, `${(+s.sensitivity).toFixed(2)}×`);
    set('set-fov', s.fov, `${s.fov}°`);
    set('set-view', s.viewDistance, `${s.viewDistance * 64} m`);
    set('set-scale', s.renderScale, `${Math.round(s.renderScale * 100)} %`);
    $('set-invert').checked = !!s.invertY;
    $('set-fps').checked = !!s.showFps;
    for (const b of $('set-shadows').children) b.classList.toggle('on', b.dataset.v === s.shadows);
  }

  _changed() {
    saveSettings(this.settings);
    this.onSettings(this.settings);
  }
}
