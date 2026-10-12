// Riimukiven käännös: kiven riimut ja niiden alla suomennos, joka
// "kääntyy" näkyviin kirjain kerrallaan. Sulkeutuu [E]:llä, kun pelaaja
// kävelee pois tai hetken kuluttua.
import { drawRunes } from '../game/lore.js';

const CLOSE_DIST = 6;
const STAY = 30; // s

export class RunePanel {
  constructor() {
    this.root = document.getElementById('rune-panel');
    this.canvas = this.root.querySelector('canvas');
    this.textEl = this.root.querySelector('.rp-text');
    this.footEl = this.root.querySelector('.rp-foot');
    this.titleEl = this.root.querySelector('.rp-title');
    this.open = false;
    this.key = null;
    this.text = '';
    this.shown = 0;
    this.t = 0;
    this.at = null;
  }

  // r = { text, first, name, count }, key = kiven tunnus, at = kiven sijainti.
  toggle(r, key, at) {
    if (this.open && this.key === key) { this.hide(); return; }
    this.open = true;
    this.key = key;
    this.text = r.text;
    this.shown = 0;
    this.t = 0;
    this.at = at;
    this.titleEl.textContent = r.name || 'Riimukivi';
    this.footEl.textContent = (r.first ? `Uusi kivi käännetty (${r.count}) · ` : '') + '[E] sulje';
    this.textEl.textContent = '';
    const c = this.canvas;
    const g = c.getContext('2d');
    g.clearRect(0, 0, c.width, c.height);
    drawRunes(g, r.text, 10, 6, c.width - 20, c.height - 12, { color: 'rgba(242,214,160,0.95)', light: 'rgba(0,0,0,0.4)', lineW: 3 });
    this.root.classList.remove('hidden');
  }

  hide() {
    this.open = false;
    this.key = null;
    this.root.classList.add('hidden');
  }

  update(dt, playerPos) {
    if (!this.open) return;
    this.t += dt;
    // Käännös etenee kirjain kerrallaan.
    if (this.shown < this.text.length) {
      this.shown = Math.min(this.text.length, this.shown + dt * 55);
      this.textEl.textContent = this.text.slice(0, Math.floor(this.shown));
    }
    const far = this.at && Math.hypot(playerPos.x - this.at.x, playerPos.z - this.at.z) > CLOSE_DIST;
    if (far || this.t > STAY) this.hide();
  }
}
