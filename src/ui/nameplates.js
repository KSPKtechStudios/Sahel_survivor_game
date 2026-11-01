// Nimilaput (sessio 13, muutettu sessiossa 17): nimi seuraa kohdetta eikä ole
// tähtäimen alla.
// - Olennon nimilappu, kestävyyspalkki ja "huomattu"-merkki näkyvät vain, kun
//   olento on lähellä ja siihen katsotaan (käyttäjä: kaukaa näkyvät laput
//   paljastivat liikaa). Lappu viipyy hetken katseen siirryttyä, ja lyödyn
//   olennon lappu pysyy näkyvissä taistelun ajan.
// - Muut kohteet (puut, pensaat, esineet...) saavat nimilapun, kun niihin
//   katsotaan; kestävyyspalkkia niillä ei ole.
import * as THREE from 'three';
import { MOB_TYPES, bodyPoint } from '../game/mobs.js';
import { events } from '../game/events.js';

const LOOK_RANGE = 14;   // katsotun olennon lappu näkyy tämän etäisyyden sisällä (m)
const HIT_RANGE = 32;    // lyödyn olennon lappu näkyy tähän asti
const LINGER = 1.2;      // lappu viipyy katseen siirryttyä (s)
const HIT_LINGER = 5;    // lyödyn olennon lappu (s)
// Tilat, joissa olento on huomannut pelaajan.
// Sessio 51: gorillan varovaisuus (watch, avoid, display) ja karjaisu (roar).
const AWARE = new Set(['circle', 'retreat', 'alert', 'flee', 'fly', 'chase', 'attack', 'recover', 'windup', 'dive', 'rise', 'stalk', 'stagger', 'escape', 'watch', 'avoid', 'display', 'roar', 'freeze', 'snarl', 'gather', 'pounce', 'land', 'maul']);
const HOSTILE = new Set(['circle', 'retreat', 'chase', 'attack', 'windup', 'dive', 'stalk', 'recover', 'roar', 'snarl', 'gather', 'pounce', 'land', 'maul']);
const EYE = '<svg viewBox="0 0 24 24"><path d="M12 5C6.5 5 2.4 9.2 1 12c1.4 2.8 5.5 7 11 7s9.6-4.2 11-7c-1.4-2.8-5.5-7-11-7zm0 11.2A4.2 4.2 0 1 1 12 7.8a4.2 4.2 0 0 1 0 8.4zm0-6.4a2.2 2.2 0 1 0 0 4.4 2.2 2.2 0 0 0 0-4.4z"/></svg>';

const _v = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _bp = { x: 0, z: 0 };

// Säteen ja olennon pystykapselin leikkaus: palauttaa etäisyyden tai null.
function rayCapsule(o, d, m) {
  const r = m.def.radius;
  const y0 = m.pos.y + r * 0.6, y1 = m.pos.y + Math.max(r * 0.6, m.def.height - r * 0.6);
  // Norsu: pystyjana rungon keskilinjan kohdassa, joka on lähinnä sädettä.
  const s0 = (m.pos.x - o.x) * d.x + (m.pos.z - o.z) * d.z;
  const c = bodyPoint(m, o.x + d.x * s0, o.z + d.z * s0, _bp);
  // Lähimmät pisteet säteen ja pystyjanan välillä.
  const wx = o.x - c.x, wy = o.y - y0, wz = o.z - c.z;
  const segLen = y1 - y0;
  const b = d.y;                      // d · u (u = (0,1,0))
  const dd = d.x * wx + d.y * wy + d.z * wz;
  const e = wy;                       // u · w
  const den = 1 - b * b;
  let sc = den > 1e-6 ? (b * e - dd) / den : 0;
  let tc = den > 1e-6 ? (e - b * dd) / den : e;
  tc = Math.max(0, Math.min(segLen, tc));
  sc = Math.max(0, b * tc - dd);
  const px = wx + d.x * sc, py = wy + d.y * sc - tc, pz = wz + d.z * sc;
  return px * px + py * py + pz * pz <= r * r ? sc : null;
}

export class Nameplates {
  constructor(root) {
    this.root = document.createElement('div');
    this.root.id = 'nameplates';
    root.appendChild(this.root);
    this.plates = new Map(); // olento -> { el, name, act, hp, spot, t }
    this.hitT = new WeakMap(); // olento -> jäljellä oleva taistelunäkyvyys (s)
    events.on('mobHit', ({ mob }) => { if (mob) this.hitT.set(mob, HIT_LINGER); });
    // Muiden kohteiden nimilappu (katsottu kohde).
    this.target = document.getElementById('target');
    this.lastT = performance.now();
  }

  // Ruudun koordinaatit maailman pisteelle (null, jos takana tai kaukana ruudusta).
  _project(camera, x, y, z, w, h) {
    _v.set(x, y, z).project(camera);
    if (_v.z > 1 || _v.z < -1 || Math.abs(_v.x) > 1.2 || Math.abs(_v.y) > 1.2) return null;
    return { x: (_v.x * 0.5 + 0.5) * w, y: (-_v.y * 0.5 + 0.5) * h };
  }

  _plate(m) {
    const el = document.createElement('div');
    el.className = 'plate';
    el.innerHTML = `<div class="pl-name"></div><div class="pl-act"></div><div class="pl-hp"><i></i></div><div class="pl-spot">${EYE}</div>`;
    el.children[0].textContent = MOB_TYPES[m.type].name;
    // Sessio 50: NPC:llä (kuoriainen) ei terveyspalkkia eikä huomasi-merkkiä.
    if (MOB_TYPES[m.type].npc) el.classList.add('npc');
    this.root.appendChild(el);
    // Esiin pehmeästi (seuraavassa ruudussa, jotta siirtymä käynnistyy).
    requestAnimationFrame(() => el.classList.add('on'));
    return { el, act: el.children[1], hp: el.children[2].firstChild, spot: el.children[3], t: 0, gone: false };
  }

  update(camera, mobs, prompt, visible) {
    const now = performance.now();
    const dt = Math.min(0.5, (now - this.lastT) / 1000);
    this.lastT = now;
    const w = window.innerWidth, h = window.innerHeight;
    // --- Olennot: katsottu (lähellä ja tähtäimen kohdalla) + lyödyt
    // Sessio 18: lappu vain, kun tähtäin osuu olentoon oikeasti (säde vs.
    // olennon kapseli todellisilla mitoilla) eikä esine ole edessä.
    let looked = prompt && prompt.mob ? prompt.mob : null;
    if (visible && mobs && !looked) {
      camera.getWorldDirection(_dir);
      const o = camera.position;
      let bestT = LOOK_RANGE;
      for (const m of mobs.list) {
        if (m.state === 'dead') continue;
        const t = rayCapsule(o, _dir, m);
        if (t !== null && t < bestT) { bestT = t; looked = m; }
      }
      if (looked && this.world) {
        const wh = this.world.raycast(o, _dir, bestT);
        if (wh && wh.t < bestT - 0.3) looked = null;
      }
    }
    if (looked && visible) {
      let p = this.plates.get(looked);
      if (!p) { p = this._plate(looked); this.plates.set(looked, p); }
      p.t = LINGER;
    }
    if (visible && mobs) {
      for (const m of mobs.list) {
        const ht = this.hitT.get(m);
        if (!ht) continue;
        const left = ht - dt;
        if (left <= 0 || m.state === 'dead') { this.hitT.delete(m); continue; }
        this.hitT.set(m, left);
        const cp = camera.position;
        if (Math.hypot(m.pos.x - cp.x, m.pos.z - cp.z) > HIT_RANGE) continue;
        let p = this.plates.get(m);
        if (!p) { p = this._plate(m); this.plates.set(m, p); }
        p.t = Math.max(p.t, 0.3);
      }
    }
    for (const [m, p] of this.plates) {
      p.t -= dt;
      const s = visible && m.state !== 'dead' ? this._project(camera, m.pos.x, m.pos.y + m.def.height + 0.35, m.pos.z, w, h) : null;
      if (p.t <= 0 || !s) {
        // Pois pehmeästi; poistetaan siirtymän jälkeen.
        if (!p.gone) {
          p.gone = true;
          p.el.classList.remove('on');
          setTimeout(() => p.el.remove(), 260);
          this.plates.delete(m);
        }
        continue;
      }
      p.el.style.transform = `translate(${s.x.toFixed(1)}px, ${s.y.toFixed(1)}px) translate(-50%, -100%)`;
      p.hp.style.width = `${Math.max(0, Math.min(1, m.hp / m.def.hp)) * 100}%`;
      const aware = AWARE.has(m.state) && !m.def.npc;
      p.spot.style.display = aware ? '' : 'none';
      p.spot.classList.toggle('hostile', aware && HOSTILE.has(m.state));
      const isTarget = prompt && prompt.mob === m;
      p.el.classList.toggle('target', !!isTarget);
      const act = isTarget && prompt.action ? prompt.action : '';
      if (p.act.textContent !== act) p.act.textContent = act;
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
