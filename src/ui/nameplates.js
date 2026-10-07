// Nimilaput (sessio 13): nimi seuraa kohdetta eikä ole tähtäimen alla.
// - Olennoilla (eläimet ja viholliset) on lähellä aina nimilappu, kestävyys-
//   palkki ja "huomattu"-merkki (silmä), kun olento on havainnut pelaajan.
// - Muut kohteet (puut, pensaat, esineet...) saavat nimilapun, kun niihin
//   katsotaan; kestävyyspalkkia niillä ei ole.
import * as THREE from 'three';
import { MOB_TYPES } from '../game/mobs.js';

const RANGE = 24;        // olentojen nimilaput näkyvät tämän etäisyyden sisällä (m)
const MAX_PLATES = 12;
// Tilat, joissa olento on huomannut pelaajan.
const AWARE = new Set(['alert', 'flee', 'fly', 'chase', 'attack', 'recover', 'windup', 'dive', 'rise', 'stalk', 'stagger', 'escape']);
const HOSTILE = new Set(['chase', 'attack', 'windup', 'dive', 'stalk', 'recover']);
const EYE = '<svg viewBox="0 0 24 24"><path d="M12 5C6.5 5 2.4 9.2 1 12c1.4 2.8 5.5 7 11 7s9.6-4.2 11-7c-1.4-2.8-5.5-7-11-7zm0 11.2A4.2 4.2 0 1 1 12 7.8a4.2 4.2 0 0 1 0 8.4zm0-6.4a2.2 2.2 0 1 0 0 4.4 2.2 2.2 0 0 0 0-4.4z"/></svg>';

const _v = new THREE.Vector3();

export class Nameplates {
  constructor(root) {
    this.root = document.createElement('div');
    this.root.id = 'nameplates';
    root.appendChild(this.root);
    this.pool = [];
    for (let i = 0; i < MAX_PLATES; i++) {
      const el = document.createElement('div');
      el.className = 'plate';
      el.innerHTML = `<div class="pl-name"></div><div class="pl-act"></div><div class="pl-hp"><i></i></div><div class="pl-spot">${EYE}</div>`;
      el.style.display = 'none';
      this.root.appendChild(el);
      this.pool.push({ el, name: el.children[0], act: el.children[1], hp: el.children[2].firstChild, spot: el.children[3], key: null });
    }
    // Muiden kohteiden nimilappu (katsottu kohde).
    this.target = document.getElementById('target');
  }

  // Ruudun koordinaatit maailman pisteelle (null, jos takana tai kaukana ruudusta).
  _project(camera, x, y, z, w, h) {
    _v.set(x, y, z).project(camera);
    if (_v.z > 1 || _v.z < -1 || Math.abs(_v.x) > 1.2 || Math.abs(_v.y) > 1.2) return null;
    return { x: (_v.x * 0.5 + 0.5) * w, y: (-_v.y * 0.5 + 0.5) * h };
  }

  update(camera, mobs, prompt, visible) {
    const w = window.innerWidth, h = window.innerHeight;
    // --- Olennot
    let n = 0;
    if (visible && mobs) {
      const cp = camera.position;
      const list = [];
      for (const m of mobs.list) {
        if (m.state === 'dead') continue;
        const d = Math.hypot(m.pos.x - cp.x, m.pos.z - cp.z);
        if (d > RANGE) continue;
        list.push({ m, d });
      }
      list.sort((a, b) => a.d - b.d);
      for (const { m, d } of list) {
        if (n >= MAX_PLATES) break;
        const s = this._project(camera, m.pos.x, m.pos.y + m.def.height + 0.35, m.pos.z, w, h);
        if (!s) continue;
        const p = this.pool[n++];
        const def = MOB_TYPES[m.type];
        p.el.style.display = '';
        p.el.style.transform = `translate(${s.x.toFixed(1)}px, ${s.y.toFixed(1)}px) translate(-50%, -100%)`;
        p.el.style.opacity = (1 - Math.max(0, (d - RANGE * 0.7) / (RANGE * 0.3))).toFixed(2);
        if (p.key !== m) { p.key = m; p.name.textContent = def.name; }
        p.hp.style.width = `${Math.max(0, Math.min(1, m.hp / def.hp)) * 100}%`;
        const aware = AWARE.has(m.state);
        p.spot.style.display = aware ? '' : 'none';
        p.spot.classList.toggle('hostile', aware && HOSTILE.has(m.state));
        const isTarget = prompt && prompt.mob === m;
        p.el.classList.toggle('target', !!isTarget);
        p.act.textContent = isTarget && prompt.action ? prompt.action : '';
      }
    }
    for (let i = n; i < this.pool.length; i++) {
      if (this.pool[i].el.style.display !== 'none') this.pool[i].el.style.display = 'none';
      this.pool[i].key = null;
    }
    // --- Katsottu kohde (ei olento): nimilappu kohteen kohdalla.
    const tb = this.target;
    if (visible && prompt && !prompt.mob && prompt.anchor) {
      const a = prompt.anchor;
      const s = this._project(camera, a.x, a.y, a.z, w, h);
      if (s) {
        tb.classList.add('anchored');
        // Pidetään lappu kokonaan ruudulla (esim. kun seistään rungon vieressä).
        const bw = tb.offsetWidth || 120, bh = tb.offsetHeight || 40;
        const x = Math.min(w - bw / 2 - 8, Math.max(bw / 2 + 8, s.x));
        const y = Math.min(h - 8, Math.max(bh + 8, s.y));
        tb.style.left = `${x.toFixed(1)}px`;
        tb.style.top = `${y.toFixed(1)}px`;
        return;
      }
    }
    tb.classList.remove('anchored');
    tb.style.left = '';
    tb.style.top = '';
  }
}
