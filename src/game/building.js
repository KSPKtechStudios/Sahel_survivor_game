// Rakentaminen vasaralla: [Hiiri 2] avaa rakennusvalikon, [Hiiri 1] rakentaa
// valitun osan haamun kohdalle, [R] kääntää, [X] purkaa katsotun osan (kaikki
// materiaalit palautuvat).
//
// Ruudukko-osat (lattia, seinät, katto, aita, pylväs) asettuvat 2 m:n
// ruudukkoon ja liittyvät viereisiin osiin: seinä asettuu lattian reunalle sen
// pinnan tasolle ja voidaan pinota toisen seinän päälle, katto asettuu
// seinien yläreunaan. Muut osat (työstöpenkki, nuotio, soihtuteline,
// makuualusta) asetetaan vapaasti maahan tai lattialle. Kaikki paitsi
// työstöpenkki vaativat työstöpenkin BENCH_RANGE-säteelle.
//
// Veneet asetetaan vain veteen: haamu alkaa katsotusta kohdasta ja jatkuu
// katseen suuntaan, ja koko rungon alla pitää olla tarpeeksi syvää vettä.
// Vasara korjaa venettä [Hiiri 1] ja purkaa sen [X].
import * as THREE from 'three';
import { heightAt, waterAt } from '../world/terrain.js';
import { ITEMS, TAG_NAMES } from './items.js';
import { PIECES, GRID, BENCH_RANGE } from './pieces.js';
import { BOATS } from './boats.js';
import { events } from './events.js';
import { CONFIG } from '../config.js';

const REACH = 7;
const BOAT_REACH = CONFIG.reach + 1.5; // sama kuin kyytiin nousussa
const _dir = new THREE.Vector3();
const _p = new THREE.Vector3();
const _wq = {};
const _cols = [];

export class BuildSystem {
  constructor({ camera, player, inventory, structures, world, viewmodel, drops, boats }) {
    Object.assign(this, { camera, player, inventory, structures, world, viewmodel, drops, boats });
    this.selected = null; // valittu osa (PIECES-avain)
    this.rot = 0;         // käännös (vapaat osat 45°, katto 90° askelin)
    this.plan = null;     // { type, x, y, z, rot, key, valid, reason }
    this.prompt = null;
    this.openMenu = null; // main.js: avaa rakennusvalikon
  }

  // Onko vasara kädessä.
  get active() {
    const item = this.inventory.selectedItem;
    return !!(item && ITEMS[item.id].build);
  }

  select(type) {
    this.selected = PIECES[type] ? type : null;
    this.rot = 0;
  }

  update(dt, input) {
    this.prompt = null;
    this.plan = null;
    if (!this.active || this.player.dead || this.player.riding) {
      if (this.active) this.structures.showGhost(null);
      return false;
    }
    const cam = this.camera;
    cam.getWorldDirection(_dir);
    let target = this.structures.raycast(cam.position, _dir, REACH);
    if (input.enabled && input.clicked.has(2) && this.openMenu) {
      this.openMenu();
      return true;
    }
    if (input.enabled && input.pressed.has('KeyR')) this.rot = (this.rot + 1) % 8;
    // Vene katseen edessä: korjaus ja purku.
    const boat = this.boats ? this.boats.raycast(cam.position, _dir, BOAT_REACH) : null;
    if (boat && (!target || boat.t < target.t)) {
      target = null;
      if (!this.selected || PIECES[this.selected].boat || boat.t < 3.5) return this._boatTarget(boat.obj, input);
    }
    if (input.enabled && input.pressed.has('KeyX') && target) {
      this.removePiece(target.obj);
      return true;
    }
    if (!this.selected) {
      this.structures.showGhost(null);
      const t = target ? PIECES[target.obj.type].name : 'Vasara';
      this.prompt = { name: t, action: '[Hiiri 2] Valitse rakennettava' + (target ? ' · [X] Pura' : '') };
      return true;
    }
    const plan = this._plan(target);
    this.plan = plan;
    this.structures.showGhost(plan ? _p.set(plan.x, plan.y, plan.z) : null, plan && plan.valid, this.selected, plan ? plan.rot : 0);
    const name = PIECES[this.selected].name;
    if (!plan) {
      this.prompt = { name, action: `Katso ${PIECES[this.selected].boat ? 'veteen' : 'maahan'} asettaaksesi · [Hiiri 2] Valikko`, warn: false };
    } else {
      this.prompt = plan.valid
        ? { name, action: '[Hiiri 1] Rakenna · [R] Käännä · [Hiiri 2] Valikko' + (target ? ' · [X] Pura' : '') }
        : { name, action: plan.reason, warn: true };
      if (input.enabled && input.clicked.has(0)) {
        if (plan.valid) this._build(plan);
        else events.emit('message', { text: plan.reason });
      }
    }
    return true;
  }

  // Katseen osuma: maasto, lattioiden pinnat tai rakennelmat.
  _aim(target) {
    const o = this.camera.position;
    let best = null;
    // Maasto
    let prev = 0.3;
    for (let t = 0.3; t <= REACH; t += 0.1) {
      const x = o.x + _dir.x * t, y = o.y + _dir.y * t, z = o.z + _dir.z * t;
      if (y <= heightAt(x, z)) {
        let lo = prev, hi = t;
        for (let i = 0; i < 6; i++) {
          const m = (lo + hi) / 2;
          if (o.y + _dir.y * m <= heightAt(o.x + _dir.x * m, o.z + _dir.z * m)) hi = m; else lo = m;
        }
        best = { t: hi, x: o.x + _dir.x * hi, y: o.y + _dir.y * hi, z: o.z + _dir.z * hi, on: 'ground' };
        break;
      }
      prev = t;
    }
    // Lattioiden yläpinnat
    if (_dir.y < -0.01) {
      for (const pf of this.world.platforms) {
        const t = (pf.y - o.y) / _dir.y;
        if (t <= 0 || t > REACH || (best && t >= best.t)) continue;
        const x = o.x + _dir.x * t, z = o.z + _dir.z * t;
        if (x < pf.x0 || x > pf.x1 || z < pf.z0 || z > pf.z1) continue;
        best = { t, x, y: pf.y, z, on: 'floor', pf };
      }
    }
    // Muut rakennelmat (esim. seinän yläreuna)
    if (target && (!best || target.t < best.t)) {
      const t = target.t;
      best = { t, x: o.x + _dir.x * t, y: o.y + _dir.y * t, z: o.z + _dir.z * t, on: 'piece', piece: target.obj };
    }
    return best;
  }

  // Samaa ruudukkopaikkaa käyttävät osat.
  _at(key) {
    return this.structures.list.filter((s) => s.key === key);
  }

  _plan(target) {
    const type = this.selected;
    const def = PIECES[type];
    if (def.boat) return this._planBoat(type, def);
    const aim = this._aim(target);
    if (!aim) return null;
    let x, y, z, rot = 0, key = null;
    const g = GRID;
    if (def.grid === 'floor' || def.grid === 'roof') {
      const gx = Math.floor(aim.x / g), gz = Math.floor(aim.z / g);
      x = (gx + 0.5) * g;
      z = (gz + 0.5) * g;
      key = `${def.grid === 'floor' ? 'f' : 'r'}:${gx}:${gz}`;
      // Ruudun reunojen seinät (katon taso, toisen kerroksen lattia)
      const walls = [`e:x:${gx}:${gz}`, `e:x:${gx}:${gz + 1}`, `e:z:${gx}:${gz}`, `e:z:${gx + 1}:${gz}`]
        .flatMap((k) => this._at(k)).filter((s) => PIECES[s.type].height >= 2);
      const wallTop = walls.length ? Math.max(...walls.map((s) => s.y + PIECES[s.type].height)) : null;
      if (def.grid === 'floor') {
        // Viereisen lattian taso, seinien yläreuna tai maaston korkein kohta.
        const near = [[1, 0], [-1, 0], [0, 1], [0, -1]].flatMap(([dx, dz]) => this._at(`f:${gx + dx}:${gz + dz}`));
        const cand = near.filter((s) => Math.abs(s.y - aim.y) < 1.6).sort((a, b) => Math.abs(a.y - aim.y) - Math.abs(b.y - aim.y));
        if (wallTop !== null && aim.y > wallTop - 0.8) y = wallTop - 0.125;
        else if (cand.length) y = cand[0].y;
        else {
          let h = -Infinity;
          for (const [dx, dz] of [[-0.9, -0.9], [0.9, -0.9], [-0.9, 0.9], [0.9, 0.9], [0, 0]]) h = Math.max(h, heightAt(x + dx, z + dz));
          y = h + 0.02;
        }
      } else {
        rot = (this.rot % 4) * (Math.PI / 2);
        if (wallTop !== null) y = wallTop;
        else {
          const fl = this._at(`f:${gx}:${gz}`);
          y = fl.length ? Math.max(...fl.map((s) => s.y)) + 2.125 : heightAt(x, z) + 2;
        }
      }
    } else if (def.grid === 'wall') {
      const gx = Math.floor(aim.x / g), gz = Math.floor(aim.z / g);
      const u = aim.x - gx * g, v = aim.z - gz * g;
      const opts = [
        { d: v, key: `e:x:${gx}:${gz}`, x: (gx + 0.5) * g, z: gz * g, rot: 0, sides: [[gx, gz - 1], [gx, gz]] },
        { d: g - v, key: `e:x:${gx}:${gz + 1}`, x: (gx + 0.5) * g, z: (gz + 1) * g, rot: 0, sides: [[gx, gz], [gx, gz + 1]] },
        { d: u, key: `e:z:${gx}:${gz}`, x: gx * g, z: (gz + 0.5) * g, rot: Math.PI / 2, sides: [[gx - 1, gz], [gx, gz]] },
        { d: g - u, key: `e:z:${gx + 1}:${gz}`, x: (gx + 1) * g, z: (gz + 0.5) * g, rot: Math.PI / 2, sides: [[gx, gz], [gx + 1, gz]] },
      ];
      opts.sort((a, b) => a.d - b.d);
      const e = opts[0];
      ({ x, z, rot, key } = e);
      const stack = this._at(key).sort((a, b) => a.y - b.y);
      const floors = e.sides.flatMap(([cx, cz]) => this._at(`f:${cx}:${cz}`));
      if (stack.length) {
        const top = stack[stack.length - 1];
        y = top.y + (PIECES[top.type].height || 2);
      } else if (floors.length) {
        floors.sort((a, b) => Math.abs(a.y - aim.y) - Math.abs(b.y - aim.y));
        y = floors[0].y + 0.125;
      } else {
        const dx = rot ? 0 : 0.9, dz = rot ? 0.9 : 0;
        y = Math.min(heightAt(x - dx, z - dz), heightAt(x, z), heightAt(x + dx, z + dz)) - 0.05;
      }
    } else if (def.grid === 'corner') {
      const ix = Math.round(aim.x / g), iz = Math.round(aim.z / g);
      x = ix * g;
      z = iz * g;
      key = `c:${ix}:${iz}`;
      y = aim.on === 'floor' ? aim.y : heightAt(x, z) - 0.05;
    } else {
      x = aim.x;
      z = aim.z;
      y = aim.on === 'floor' ? aim.y : heightAt(x, z);
      rot = this.player.yaw + Math.PI + this.rot * (Math.PI / 4);
    }
    const plan = { type, x, y, z, rot, key, valid: false, reason: '' };
    plan.reason = this._check(plan, aim);
    plan.valid = !plan.reason;
    return plan;
  }

  // Palauttaa syyn, miksi osaa ei voi rakentaa ('' = voi).
  _check(plan, aim) {
    const def = PIECES[plan.type];
    const p = this.player.position;
    if (Math.hypot(plan.x - p.x, plan.z - p.z) > REACH + 1) return 'Liian kaukana';
    if (!def.noBench && !this.structures.nearest('workbench', plan.x, plan.z, BENCH_RANGE)) return 'Vaatii työstöpenkin lähelle (vasara: Työstöpenkki)';
    if (plan.key) {
      const same = this._at(plan.key);
      const tol = def.grid === 'wall' ? 0.5 : 1.0;
      if (same.some((s) => Math.abs(s.y - plan.y) < tol)) return 'Paikka on jo käytössä';
      if (def.grid === 'wall' && same.length >= 3) return 'Liian korkea';
    }
    const w = waterAt(plan.x, plan.z, _wq);
    if (def.grid === 'floor') {
      if (w.wl - plan.y > 2) return 'Liian syvää vettä';
    } else if (def.grid !== 'roof' && w.wl > plan.y + 0.25 && aim.on !== 'floor') {
      return 'Ei voi rakentaa veteen';
    }
    if (!def.grid) {
      if (aim.on === 'piece') return 'Aseta maahan tai lattialle';
      if (aim.on === 'ground') {
        let lo = Infinity, hi = -Infinity;
        for (const [dx, dz] of [[-0.6, -0.6], [0.6, -0.6], [-0.6, 0.6], [0.6, 0.6]]) {
          const h = heightAt(plan.x + dx, plan.z + dz);
          lo = Math.min(lo, h);
          hi = Math.max(hi, h);
        }
        if (hi - lo > 0.7) return 'Liian jyrkkä';
      }
      this.world.collidersNear(plan.x, plan.z, 2, _cols);
      for (const c of _cols) {
        if (c.seg) continue;
        if (Math.hypot(c.x - plan.x, c.z - plan.z) < c.r + 0.6) return 'Tiellä on jotain';
      }
    }
    // Pelaaja ei saa jäädä seinän sisään.
    const c = Math.cos(plan.rot), s = Math.sin(plan.rot);
    for (const col of def.colliders) {
      if (col.seg) {
        const ax = plan.x + col.ax * c + col.az * s, az = plan.z - col.ax * s + col.az * c;
        const bx = plan.x + col.bx * c + col.bz * s, bz = plan.z - col.bx * s + col.bz * c;
        const ex = bx - ax, ez = bz - az;
        const t = Math.max(0, Math.min(1, ((p.x - ax) * ex + (p.z - az) * ez) / (ex * ex + ez * ez || 1)));
        if (Math.hypot(p.x - (ax + ex * t), p.z - (az + ez * t)) < col.r + 0.45 && p.y < plan.y + col.top && p.y + 1.8 > plan.y) return 'Seiso pois tieltä';
      } else if (Math.hypot(p.x - (plan.x + col.x), p.z - (plan.z + col.z)) < col.r + 0.5 && p.y < plan.y + 1.5 && p.y + 1.8 > plan.y) {
        return 'Seiso pois tieltä';
      }
    }
    const missing = [];
    for (const [id, n] of Object.entries(def.cost)) {
      const have = this.inventory.count(id);
      if (have < n) missing.push(`${id[0] === '#' ? TAG_NAMES[id.slice(1)] : ITEMS[id].name} ${n - have}`);
    }
    if (missing.length) return `Puuttuu: ${missing.join(', ')}`;
    return '';
  }

  // Vasara osoittaa venettä: [Hiiri 1] korjaa, [X] purkaa.
  _boatTarget(b, input) {
    this.structures.showGhost(null);
    const def = b.def;
    const hurt = b.hp < def.hp;
    const cost = Object.entries(def.repair);
    const costText = cost.map(([id, n]) => `${ITEMS[id].name} ${n}`).join(', ');
    this.prompt = {
      name: def.name,
      action: (hurt ? `[Hiiri 1] Korjaa (${costText}) · ` : '') + '[X] Pura · [E] Kyytiin',
      hp: hurt ? b.hp / def.hp : null,
    };
    if (!input.enabled) return true;
    if (input.clicked.has(0) && hurt) {
      const missing = cost.filter(([id, n]) => this.inventory.count(id) < n);
      if (missing.length) {
        events.emit('message', { text: `Korjaus vaatii: ${costText}` });
      } else {
        for (const [id, n] of cost) this.inventory.remove(id, n);
        this.boats.repair(b);
        this.viewmodel.play('swing', { dur: 0.56, hitAt: 0.44 });
        events.emit('hitFeedback', { strength: 0.25 });
        events.emit('message', { text: `${def.name} korjattu (kunto ${Math.round((b.hp / def.hp) * 100)} %)` });
      }
    } else if (input.pressed.has('KeyX')) {
      this.removeBoat(b);
    }
    return true;
  }

  // Veneen haamu: katseen osuma veteen, vene jatkuu katseen suuntaan.
  _planBoat(type, def) {
    const bd = BOATS[def.boat];
    const o = this.camera.position;
    let hit = null;
    for (let t = 0.5; t <= bd.reach; t += t < 20 ? 0.25 : 0.5) {
      const x = o.x + _dir.x * t, y = o.y + _dir.y * t, z = o.z + _dir.z * t;
      const w = waterAt(x, z, _wq);
      if (y <= Math.max(w.h, w.wl)) { hit = { x, z }; break; }
    }
    if (!hit) return null;
    const yaw = this.player.yaw;
    const fx = -Math.sin(yaw), fz = -Math.cos(yaw);
    const rel = this.rot * (Math.PI / 4);
    const ext = Math.abs(Math.cos(rel)) * bd.L * 0.5 + Math.abs(Math.sin(rel)) * bd.B + 0.3;
    const x = hit.x + fx * ext, z = hit.z + fz * ext;
    const w = waterAt(x, z, _wq);
    const plan = { type, boat: def.boat, x, y: Math.max(w.wl, w.h), z, rot: yaw + Math.PI + rel, key: null, valid: false, reason: '' };
    plan.reason = this._checkBoat(plan, def, bd);
    plan.valid = !plan.reason;
    return plan;
  }

  // Työstöpenkki pelaajan lähellä (rannalla); koko rungon alla vettä ja
  // keskellä vähintään launch-syvyys. Matalasta vedestä vene ajetaan syvemmälle.
  _checkBoat(plan, def, bd) {
    const p = this.player.position;
    if (!this.structures.nearest('workbench', p.x, p.z, BENCH_RANGE)) return 'Vaatii työstöpenkin lähelle (rakenna rannalle)';
    const w = waterAt(plan.x, plan.z, _wq);
    if (w.wl - w.h < 0.05) return 'Vain veteen';
    if (this.boats.clearance(plan.boat, plan.x, plan.z, plan.rot, 0) < 0.05) return 'Vain veteen: osa rungosta on maalla';
    if (w.wl - w.h < bd.launch) return `Liian matalaa (vaatii ${bd.launch.toFixed(1).replace('.', ',')} m): katso kauemmas`;
    const other = this.boats.nearest(plan.x, plan.z, bd.L * 0.5);
    if (other) return 'Toinen vene on tiellä';
    const missing = [];
    for (const [id, n] of Object.entries(def.cost)) {
      const have = this.inventory.count(id);
      if (have < n) missing.push(`${ITEMS[id].name} ${n - have}`);
    }
    if (missing.length) return `Puuttuu: ${missing.join(', ')}`;
    return '';
  }

  // Purku: vene poistetaan ja materiaalit palautetaan kunnon mukaan.
  removeBoat(b) {
    if (this.boats.riding === b) return;
    const def = PIECES[b.type];
    const k = 0.5 + 0.5 * (b.hp / b.def.hp);
    this.boats.remove(b);
    for (const [id, n] of Object.entries(def.cost)) {
      const m = Math.max(1, Math.round(n * k));
      const left = this.inventory.add(id, m);
      if (left > 0) this.drops.spawn(id, left, _p.set(this.player.position.x, this.player.position.y + 0.8, this.player.position.z));
    }
    this.viewmodel.play('swing', { dur: 0.56, hitAt: 0.44 });
    events.emit('message', { text: `${def.name} purettu` });
  }

  _build(plan) {
    const def = PIECES[plan.type];
    for (const [id, n] of Object.entries(def.cost)) this.inventory.remove(id, n);
    if (def.boat) {
      this.boats.add(def.boat, plan.x, plan.z, plan.rot);
      this.viewmodel.play('swing', { dur: 0.56, hitAt: 0.44 });
      events.emit('build', { type: plan.type });
      events.emit('hitFeedback', { strength: 0.3 });
      events.emit('message', { text: `${def.name} valmis: [E] nouse kyytiin` });
      return;
    }
    this.structures.add(plan.type, plan.x, plan.y, plan.z, plan.rot, plan.key);
    this.viewmodel.play('swing', { dur: 0.56, hitAt: 0.44 });
    events.emit('build', { type: plan.type });
    events.emit('place', { item: plan.type });
    events.emit('hitFeedback', { strength: 0.25 });
    if (def.bed) events.emit('message', { text: 'Makuualusta on nyt herätyspaikkasi' });
  }

  // Purku: osa poistetaan ja kaikki materiaalit palautetaan.
  removePiece(st) {
    const def = PIECES[st.type];
    this.structures.remove(st);
    for (const [id, n] of Object.entries(def.cost)) {
      const item = id[0] === '#' ? 'hide' : id;
      const left = this.inventory.add(item, n);
      if (left > 0) this.drops.spawn(item, left, _p.set(st.x, st.y + 0.5, st.z));
    }
    this.viewmodel.play('swing', { dur: 0.56, hitAt: 0.44 });
    events.emit('message', { text: `${def.name} purettu` });
  }
}
