// Veneen tiedot kyydissä: nimi ja kunto, tuulen suunta veneeseen nähden
// (ylös = keula), purjeasetus tai soutu, nopeus ja näppäimet.
import { BOATS, SAIL_SETTINGS, windName } from '../game/boats.js';

export class BoatHud {
  constructor() {
    this.root = document.getElementById('boat-hud');
    this.name = this.root.querySelector('.bh-name');
    this.hp = this.root.querySelector('.bh-hp');
    this.hpBar = this.hp.querySelector('i');
    this.arrow = this.root.querySelector('.bh-arrow');
    this.state = this.root.querySelector('.bh-state');
    this.pips = this.root.querySelector('.bh-pips');
    this.speed = this.root.querySelector('.bh-speed');
    this.keys = this.root.querySelector('.bh-keys');
    this.shown = false;
    this.type = null;
    this.cache = {};
  }

  _set(el, key, text) {
    if (this.cache[key] === text) return;
    this.cache[key] = text;
    el.textContent = text;
  }

  update(boats, visible) {
    const b = boats.riding;
    const show = !!b && visible;
    if (show !== this.shown) {
      this.shown = show;
      this.root.classList.toggle('hidden', !show);
    }
    if (!show) return;
    const def = BOATS[b.type];
    if (this.type !== b.type) {
      this.type = b.type;
      this.cache = {};
      this.name.textContent = def.name;
      this.pips.innerHTML = def.row ? '' : '<i></i><i></i><i></i><i></i><i></i>';
      this.pips.style.display = def.row ? 'none' : '';
      this.keys.textContent = def.row
        ? '[W]/[S] soutu · [A]/[D] käänny · [Shift] nopeammin · [E] maihin'
        : '[W]/[S] purjeet · [A]/[D] peräsin · [E] maihin';
    }
    const frac = b.hp / def.hp;
    this.hpBar.style.width = `${Math.round(frac * 100)}%`;
    this.hp.classList.toggle('low', frac < 0.35);
    // Tuulen nuoli: suunta, johon tuuli puhaltaa (veneen koordinaateissa,
    // ylös = keula). Nuolen kärki on kuvassa alaspäin, joten käännetään 180°.
    const deg = (-Math.atan2(b.wp, b.wf) * 180) / Math.PI + 180;
    this.arrow.style.transform = `rotate(${deg.toFixed(1)}deg)`;
    let state, warn = false;
    if (def.row) {
      state = b.tired ? 'Uupunut: soutu hidastuu' : b.throttle > 0 ? 'Soudetaan' : b.throttle < 0 ? 'Soudetaan taaksepäin' : 'Airot levossa';
      warn = b.tired;
    } else {
      state = SAIL_SETTINGS[b.setting];
      if (b.setting >= 2 && b.theta < def.sail.noGo) { state = 'Vastatuuli: purjeet eivät vedä'; warn = true; }
      const on = b.setting + 1;
      if (this.cache.pip !== on) {
        this.cache.pip = on;
        // Eteenpäin palkki täyttyy (hiljaa .. täydet purjeet); seis ja taakse omina.
        [...this.pips.children].forEach((el, i) => el.classList.toggle('on', on >= 2 ? i >= 2 && i <= on : i === on));
      }
    }
    if (b.clear < 0) { state = 'Matalikko: aja syvempään veteen'; warn = true; }
    this._set(this.state, 'state', state);
    this.state.classList.toggle('warn', warn);
    const kmh = Math.abs(b.speed) * 3.6;
    const wind = def.row ? `Tuuli: ${windName(b.theta, 0.75).toLowerCase()}` : `${windName(b.theta, def.sail.noGo)}`;
    this._set(this.speed, 'speed', `${kmh.toFixed(kmh < 10 ? 1 : 0).replace('.', ',')} km/h · ${wind}`);
  }
}
