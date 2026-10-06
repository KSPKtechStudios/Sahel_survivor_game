// Kehittäjätyökalut [F3]: tiedot, siirtyminen, olentojen ja esineiden
// kutsuminen, lentäminen, nopeus, kuolemattomuus, kartan paljastus, sää ja aika.
// Paneeli on ruudun oikeassa reunassa; maailma jatkaa kulkuaan sen takana.
import { CONFIG } from '../config.js';
import { ITEMS } from '../game/items.js';
import { STRUCT_NAMES } from '../game/ruins.js';
import { WEATHER, WEATHER_KEYS } from '../render/environment.js';
import { findSpawn, findBiome, findWater, placeName, sampleTerrain, structuresNear, WATER } from '../world/terrain.js';

const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};

export class DevTools {
  // ctx: { player, env, world, mobs, inventory, explored, ruins, drops, fps,
  //        teleport(x, z, look) -> Promise, music, fmtTime }
  constructor(ctx) {
    this.ctx = ctx;
    this.root = document.getElementById('devtools');
    this.visible = false;
    this.infoTimer = 0;
    this._s = {};
    this.toggles = [];
    this._build();
  }

  show() {
    this.visible = true;
    this.root.classList.remove('hidden');
    this._refresh();
  }

  hide() {
    this.visible = false;
    this.root.classList.add('hidden');
    if (document.activeElement && this.root.contains(document.activeElement)) document.activeElement.blur();
  }

  update(dt) {
    if (!this.visible) return;
    this.infoTimer -= dt;
    if (this.infoTimer <= 0) {
      this.infoTimer = 0.25;
      this._info();
    }
  }

  status(text) {
    this.statusEl.textContent = text;
  }

  // --- Rakennus ---------------------------------------------------------------
  _build() {
    const r = this.root;
    r.innerHTML = '';
    const card = el('div', 'dev-card');
    r.appendChild(card);
    const head = el('div', 'dev-head');
    head.appendChild(el('h2', '', 'Kehittäjätyökalut'));
    head.appendChild(el('span', 'dev-key', '[F3] / [Esc] sulje'));
    card.appendChild(head);
    this.infoEl = el('pre', 'dev-info');
    card.appendChild(this.infoEl);
    this.statusEl = el('div', 'dev-status');
    card.appendChild(this.statusEl);
    // Paneelin kentät eivät saa ohjata peliä.
    r.addEventListener('keydown', (e) => {
      if ((e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') && e.code !== 'Escape' && e.code !== 'F3') e.stopPropagation();
    });

    const { player, env, mobs, inventory, explored } = this.ctx;

    // Pelaaja
    let sec = this._section(card, 'Pelaaja');
    let row = this._row(sec);
    this._toggle(row, 'Lentäminen', () => player.flying, (v) => {
      player.flying = v;
      player.velocity.set(0, 0, 0);
      this.status(v ? 'Lentäminen päällä: välilyönti ylös, Ctrl/C alas, Shift nopeammin' : 'Lentäminen pois');
    });
    this._toggle(row, 'Kuolematon', () => player.god, (v) => { player.god = v; });
    row = this._row(sec);
    this._range(row, 'Nopeus', 0.5, 10, 0.5, () => player.speedBoost, (v) => { player.speedBoost = v; }, (v) => `${v}×`);
    row = this._row(sec);
    this._button(row, 'Paranna', () => { player.health = CONFIG.healthMax; player.stamina = CONFIG.staminaMax; player.drowning = 0; return 'Terveys ja kestävyys täynnä'; });
    this._button(row, 'Kuole (testi)', () => { player.hurt(9999, { cause: '' }); if (!player.dead) player.die(''); return 'Kuolit'; });

    // Siirry
    sec = this._section(card, 'Siirry');
    row = this._row(sec);
    const places = [
      ['Aloituspaikka', () => findSpawn()],
      ['Sahel', () => this._near((x, z) => findBiome('savanna', x, z))],
      ['Aavikko', () => this._near((x, z) => findBiome('desert', x, z))],
      ['Sademetsä', () => this._near((x, z) => findBiome('rainforest', x, z))],
      ['Vuoristo', () => this._near((x, z) => findBiome('mountains', x, z))],
      ['Ranta', () => this._near((x, z) => findBiome('beach', x, z))],
      ['Meri', () => this._near((x, z) => findWater('sea', x, z))],
      ['Järvi', () => this._near((x, z) => findWater(WATER.LAKE, x, z))],
      ['Joki', () => this._near((x, z) => findWater(WATER.RIVER, x, z))],
      ['Puro', () => this._near((x, z) => findWater(WATER.STREAM, x, z))],
      ['Rakennelma', () => this._structure(false)],
      ['Avaamaton arkku', () => this._structure(true)],
    ];
    for (const [label, find] of places) {
      this._button(row, label, async () => {
        this.status('Etsitään…');
        await new Promise((res) => setTimeout(res, 20));
        const p = find();
        if (!p) return 'Paikkaa ei löytynyt';
        this.status('Siirrytään…');
        await this.ctx.teleport(p.x, p.z, p.wx !== undefined ? { x: p.wx, z: p.wz } : p.look);
        return `${label}: ${Math.round(p.x)}, ${Math.round(p.z)}${p.name ? ` (${p.name})` : ''}`;
      });
    }
    row = this._row(sec, 'dev-coords');
    const xi = el('input'); xi.type = 'number'; xi.placeholder = 'X';
    const zi = el('input'); zi.type = 'number'; zi.placeholder = 'Z';
    row.append(el('span', 'dev-label', 'Koordinaatit'), xi, zi);
    this.xInput = xi;
    this.zInput = zi;
    this._button(row, 'Siirry', async () => {
      const x = parseFloat(xi.value), z = parseFloat(zi.value);
      if (!Number.isFinite(x) || !Number.isFinite(z)) return 'Anna X ja Z';
      const R = 9800;
      const d = Math.hypot(x, z);
      const k = d > R ? R / d : 1;
      await this.ctx.teleport(x * k, z * k);
      return `Siirretty: ${Math.round(x * k)}, ${Math.round(z * k)}`;
    });
    this.wpRow = this._row(sec, 'dev-wps');

    // Olennot
    sec = this._section(card, 'Olennot');
    row = this._row(sec);
    this._button(row, 'Pahkasika', () => (mobs.spawnInFront('warthog', 10) ? 'Pahkasika kutsuttu' : 'Paikkaa ei löytynyt'));
    this._button(row, 'Savipeikko', () => (mobs.spawnInFront('clay', 8) ? `Savipeikko kutsuttu${env.daylight > 0.18 ? ' (päivällä se syttyy pian palamaan)' : ''}` : 'Paikkaa ei löytynyt'));
    this._button(row, 'Poista olennot', () => { mobs.clear(); return 'Olennot poistettu'; });
    row = this._row(sec);
    this._toggle(row, 'Olentoja syntyy', () => mobs.enabled, (v) => { mobs.enabled = v; });

    // Esineet
    sec = this._section(card, 'Esineet');
    row = this._row(sec, 'dev-items');
    const sel = el('select');
    for (const [id, d] of Object.entries(ITEMS).sort((a, b) => a[1].name.localeCompare(b[1].name, 'fi'))) {
      const o = el('option', '', d.name);
      o.value = id;
      sel.appendChild(o);
    }
    const cnt = el('input'); cnt.type = 'number'; cnt.min = '1'; cnt.value = '1';
    sel.addEventListener('change', () => { cnt.value = String(Math.min(10, ITEMS[sel.value].stack)); });
    row.append(sel, cnt);
    this._button(row, 'Anna', () => {
      const n = Math.max(1, Math.min(999, parseInt(cnt.value, 10) || 1));
      const left = inventory.add(sel.value, n);
      return left > 0 ? `Reppu täynnä (${n - left} / ${n})` : `+${n} ${ITEMS[sel.value].name}`;
    });
    row = this._row(sec);
    this._button(row, 'Aseet', () => {
      for (const id of ['wooden_club', 'machete', 'shield', 'spear', 'bow']) if (inventory.count(id) === 0) inventory.add(id, 1);
      inventory.add('arrow_flint', 20);
      return 'Nuija, viidakkoveitsi, kilpi, keihäs, jousi ja 20 nuolta';
    });
    this._button(row, 'Materiaalit', () => {
      for (const id of ['stick', 'stone', 'fiber', 'wood', 'flint', 'rope', 'clay', 'reed', 'gum']) inventory.add(id, 20);
      return '+20 kutakin perusmateriaalia';
    });
    this._button(row, 'Rakentaminen', () => {
      if (inventory.count('hammer') === 0) inventory.add('hammer', 1);
      for (const id of ['wood', 'stick', 'stone', 'fiber', 'reed', 'clay']) inventory.add(id, 30);
      return 'Vasara ja rakennusmateriaalit';
    });
    this._button(row, 'Ruokaa', () => {
      inventory.add('cooked_meat', 5);
      inventory.add('herbal_remedy', 2);
      return '+5 paistettua lihaa, +2 yrttirohtoa';
    });

    // Maailma
    sec = this._section(card, 'Maailma');
    row = this._row(sec);
    row.appendChild(el('span', 'dev-label', 'Sää'));
    this.weatherBtns = [];
    for (const k of WEATHER_KEYS) {
      const b = this._button(row, WEATHER[k].name, () => { env.setWeather(k, true); this._refresh(); return `Sää: ${WEATHER[k].name}`; });
      b.dataset.key = k;
      this.weatherBtns.push(b);
    }
    row = this._row(sec);
    row.appendChild(el('span', 'dev-label', 'Aika'));
    for (const [label, h] of [['Aamu', 7], ['Päivä', 12.5], ['Ilta', 17.8], ['Yö', 23], ['+1 h', null]]) {
      this._button(row, label, () => { env.setTime(h === null ? env.time + 1 : h); return `Kello ${this.ctx.fmtTime(env.time)}`; });
    }
    row = this._row(sec);
    this._toggle(row, 'Aika pysähdyksissä', () => env.frozen, (v) => { env.frozen = v; });

    // Kartta
    sec = this._section(card, 'Kartta');
    row = this._row(sec);
    this._button(row, 'Paljasta koko kartta', () => {
      explored.revealAll();
      return 'Koko kartta paljastettu (yleiskuva latautuu hetken, tarkat ruudut lähennettäessä)';
    });

    card.appendChild(el('div', 'dev-foot', 'Pikanäppäimet pelissä: [O] seuraava sää, [L] +1 tunti'));
  }

  _section(parent, title) {
    const s = el('section', 'dev-sec');
    s.appendChild(el('h3', '', title));
    parent.appendChild(s);
    return s;
  }

  _row(parent, cls = '') {
    const r = el('div', `dev-row ${cls}`);
    parent.appendChild(r);
    return r;
  }

  _button(parent, label, fn) {
    const b = el('button', 'mini-btn', label);
    b.type = 'button';
    b.addEventListener('click', async () => {
      try {
        const msg = await fn();
        if (msg) this.status(msg);
      } catch (err) {
        this.status(`Virhe: ${err.message}`);
      }
      this._refresh();
    });
    parent.appendChild(b);
    return b;
  }

  _toggle(parent, label, get, set) {
    const lab = el('label', 'dev-toggle');
    const cb = el('input');
    cb.type = 'checkbox';
    cb.addEventListener('change', () => set(cb.checked));
    lab.append(cb, el('span', '', label));
    parent.appendChild(lab);
    this.toggles.push(() => { cb.checked = !!get(); });
    return cb;
  }

  _range(parent, label, min, max, step, get, set, fmt) {
    const lab = el('label', 'dev-range');
    const inp = el('input');
    inp.type = 'range';
    Object.assign(inp, { min, max, step });
    const out = el('output');
    inp.addEventListener('input', () => { set(parseFloat(inp.value)); out.textContent = fmt(parseFloat(inp.value)); });
    lab.append(el('span', 'dev-label', label), inp, out);
    parent.appendChild(lab);
    this.toggles.push(() => { inp.value = get(); out.textContent = fmt(get()); });
  }

  // Päivitä kytkimet, sää ja karttamerkit nykytilaan.
  _refresh() {
    for (const f of this.toggles) f();
    for (const b of this.weatherBtns) b.classList.toggle('on', b.dataset.key === this.ctx.env.targetKey);
    const p = this.ctx.player.position;
    if (document.activeElement !== this.xInput && document.activeElement !== this.zInput) {
      this.xInput.value = Math.round(p.x);
      this.zInput.value = Math.round(p.z);
    }
    // Karttamerkit siirtymiskohteiksi
    const row = this.wpRow;
    row.innerHTML = '';
    const wps = this.ctx.explored.waypoints;
    if (wps.length) {
      row.appendChild(el('span', 'dev-label', 'Merkit'));
      wps.slice(0, 16).forEach((w, i) => {
        this._button(row, w.name || `Merkki ${i + 1}`, async () => {
          await this.ctx.teleport(w.x + 3, w.z + 3, { x: w.x, z: w.z });
          return `Siirretty merkkiin ${w.name || i + 1}`;
        });
      });
    }
    this._info();
  }

  _info() {
    const { player, env, world, mobs, drops, fps, music } = this.ctx;
    const p = player.position;
    const s = sampleTerrain(p.x, p.z, this._s);
    const lines = [
      `X ${p.x.toFixed(1)}   Z ${p.z.toFixed(1)}   Y ${p.y.toFixed(1)} m   (maa ${s.h.toFixed(1)}, vesi ${s.wl.toFixed(1)})`,
      `${placeName(s)} · päivä ${env.day}, klo ${this.ctx.fmtTime(env.time)} · ${env.weatherName}`,
      `${Math.round(fps ? fps.value : 0)} FPS · chunkit ${world.chunks.size} · olennot ${mobs.list.length} · maassa ${drops.list.length} esinettä`,
      `Terveys ${Math.ceil(player.health)} · kestävyys ${Math.round(player.stamina)}${player.flying ? ' · lentää' : ''}${player.god ? ' · kuolematon' : ''}`,
    ];
    if (music) lines.push(`Musiikki: ${music.describe()}`);
    this.infoEl.textContent = lines.join('\n');
  }

  // --- Haut ------------------------------------------------------------------
  _near(fn) {
    const p = this.ctx.player.position;
    return fn(p.x, p.z);
  }

  // Lähin rakennelma (tai avaamaton arkku) 3 km säteellä.
  _structure(chestOnly) {
    const p = this.ctx.player.position;
    const opened = this.ctx.ruins.opened;
    let best = null, bd = Infinity;
    for (const st of structuresNear(p.x, p.z, 3000)) {
      if (chestOnly && (!st.chest || opened.has(st.id))) continue;
      const d = Math.hypot(st.x - p.x, st.z - p.z);
      if (d > 30 && d < bd) { bd = d; best = st; }
    }
    if (!best) return null;
    const a = Math.random() * Math.PI * 2;
    const off = best.radius + 4;
    return { x: best.x + Math.cos(a) * off, z: best.z + Math.sin(a) * off, look: { x: best.x, z: best.z }, name: STRUCT_NAMES[best.type] };
  }
}
