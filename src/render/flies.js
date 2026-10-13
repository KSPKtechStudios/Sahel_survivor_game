// Sessio 49: kärpäset ja paarmat (käyttäjä: viidakkoon vielä enemmän "eloa
// kuhiseva" tunnelma: mustia pikkuolentoja, jotka vilahtavat nopeasti
// näkökentän ohi; surinaääni käyttäjältä).
// - Ohilento: silloin tällöin kärpänen viuhahtaa pelaajan pään ohi. Rata on
//   kameran suhteen ja seuraa äänitiedoston panorointia
//   (assets/sfx/fly-buzz.mp3, kolme pätkää); peilattuna (kanavat ristiin)
//   se tulee toiselta puolelta.
// - Syöksyjät: muutama kärpänen sinkoilee lähistöllä (1–6 m) nopein, suorin
//   syöksyin ja lyhyin pysähdyksin; joskus aivan kasvojen edestä. Hiljaisia.
// Vain sademetsässä (env.humid); päivällä paljon, yöllä vähän.
import * as THREE from 'three';
import { waterAt } from '../world/terrain.js';

const DARTERS = 7;
const DART_R = 6;
// Koko: iso trooppinen paarma (noin 3,5 cm). Luonnollisen kokoinen (2 cm)
// kärpänen oli pelissä näkymätön tummaa metsää vasten.
const SIZE = 1.7;
// Äänitiedoston pätkät: alku ja kesto (s) sekä rata kameran suhteen
// [aika, x (oikealle), y (ylös), z (eteen)] metreinä. Kovimmillaan ääni on
// silloin, kun kärpänen on korvan vieressä.
const PASSES = [
  // Pörrää vasemman korvan ohi, kiertää eteen ja poistuu vasemmalle.
  { at: 0.0, dur: 1.8, key: [
    [0.0, -1.2, 0.25, -0.5], [0.3, -0.5, 0.1, 0.0], [0.5, -0.22, 0.05, 0.12], [0.7, -0.3, 0.1, 0.55],
    [0.9, 0.05, 0.15, 0.85], [1.1, 0.45, 0.1, 0.9], [1.3, 0.15, 0.2, 1.1], [1.5, -0.35, 0.2, 1.0],
    [1.6, -0.6, 0.25, 0.9], [1.8, -1.6, 0.45, 0.6]] },
  // Kaukaa vasemmalta suoraan oikean korvan ohi taakse.
  { at: 2.0, dur: 1.4, key: [
    [0.0, -3.0, 0.4, 3.2], [0.5, -1.6, 0.2, 2.0], [0.85, -0.5, 0.08, 0.9], [1.0, 0.22, 0.02, 0.15],
    [1.2, 0.7, 0.05, -0.5], [1.4, 1.5, 0.2, -1.6]] },
  // Nopea vilahdus oikealta vasemmalle metrin päästä.
  { at: 3.6, dur: 0.55, key: [
    [0.0, 1.5, 0.25, 1.5], [0.05, 1.2, 0.2, 1.4], [0.3, -0.1, 0.1, 1.2], [0.55, -1.7, 0.15, 1.2]] },
];

// Paarman runko (+z eteen): takaruumis, keskiruumis ja pää isoine silmineen.
function bodyGeometry() {
  const parts = [];
  const add = (r, sx, sy, sz, z, y = 0) => {
    const g = new THREE.SphereGeometry(r, 8, 6);
    g.scale(sx, sy, sz);
    g.translate(0, y, z);
    parts.push(g);
  };
  add(1, 0.0042, 0.0036, 0.0085, -0.006);
  add(1, 0.0038, 0.0036, 0.0042, 0.0045, 0.0005);
  add(1, 0.0042, 0.0034, 0.0028, 0.0095, 0.0003);
  const pos = [], idx = [];
  for (const g of parts) {
    const base = pos.length / 3;
    pos.push(...g.attributes.position.array);
    for (const i of g.index.array) idx.push(i + base);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// Siivet: kaksi soikeaa, läpikuultavaa levyä selän päällä (lyönti on niin
// nopea, että siivet näkyvät vain sumeana hohteena).
function wingGeometry() {
  const P = [];
  for (const side of [-1, 1]) {
    const n = 10;
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2;
      const pt = (a) => [side * (0.0075 + Math.cos(a) * 0.0068), 0.0035, -0.004 + Math.sin(a) * 0.0042];
      P.push(side * 0.001, 0.0035, 0.0, ...pt(a0), ...pt(a1));
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.computeVertexNormals();
  return g;
}

// Catmull-Rom avainkohtien välillä.
function samplePath(key, t, out) {
  let i = 0;
  while (i < key.length - 2 && key[i + 1][0] < t) i++;
  const k1 = key[i], k2 = key[i + 1];
  const k0 = key[Math.max(0, i - 1)], k3 = key[Math.min(key.length - 1, i + 2)];
  const u = Math.max(0, Math.min(1, (t - k1[0]) / Math.max(1e-4, k2[0] - k1[0])));
  const u2 = u * u, u3 = u2 * u;
  const c = (a, b, cc, d) => 0.5 * (2 * b + (-a + cc) * u + (2 * a - 5 * b + 4 * cc - d) * u2 + (-a + 3 * b - 3 * cc + d) * u3);
  out.set(c(k0[1], k1[1], k2[1], k3[1]), c(k0[2], k1[2], k2[2], k3[2]), -c(k0[3], k1[3], k2[3], k3[3]));
  return out;
}

export class Flies {
  constructor(scene, sfx) {
    this.sfx = sfx;
    const n = DARTERS + 1;
    // Kiiltävä runko välähtää auringossa; vaaleat siivet hohtavat tummaa
    // taustaa vasten (tumma runko erottuu vaaleaa vasten).
    this.body = new THREE.InstancedMesh(bodyGeometry(), new THREE.MeshStandardMaterial({ color: 0x120f0b, roughness: 0.28, metalness: 0.35 }), n);
    this.wings = new THREE.InstancedMesh(wingGeometry(), new THREE.MeshBasicMaterial({
      color: 0xdedbd0, transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false,
    }), n);
    for (const m of [this.body, this.wings]) {
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      m.frustumCulled = false;
      m.visible = false;
      scene.add(m);
    }
    this.flies = [];
    for (let i = 0; i < DARTERS; i++) {
      this.flies.push({ pos: new THREE.Vector3(), from: new THREE.Vector3(), to: new THREE.Vector3(), t: 0, dur: 0, pause: 0, placed: false, dir: new THREE.Vector3(0, 0, 1) });
    }
    this.pass = null;
    this.forced = null;
    this.passTimer = 6 + Math.random() * 10;
    this.passPos = new THREE.Vector3();
    this.passPrev = new THREE.Vector3();
    this._v = new THREE.Vector3();
    this._d = new THREE.Vector3();
    this._m = new THREE.Matrix4();
    this._r = new THREE.Matrix4();
    this._q = new THREE.Quaternion();
    this._t = new THREE.Vector3();
    this._s = new THREE.Vector3();
    this._up = new THREE.Vector3(0, 1, 0);
    this._wq = {};
  }

  _groundY(x, z) {
    const w = waterAt(x, z, this._wq);
    return Math.max(w.h, w.wl);
  }

  // Uusi syöksyn kohde: lähelle nykyistä paikkaa, joskus kasvojen eteen.
  _target(f, cam, camera) {
    const toCam = Math.hypot(f.pos.x - cam.x, f.pos.z - cam.z);
    if (Math.random() < 0.2) {
      // Kasvojen editse: 0,5–0,9 m kameran eteen, sivulle.
      this._v.set((Math.random() - 0.5) * 0.9, (Math.random() - 0.4) * 0.4, -(0.5 + Math.random() * 0.4)).applyMatrix4(camera.matrixWorld);
      f.to.copy(this._v);
    } else if (toCam > DART_R) {
      const a = Math.random() * Math.PI * 2, r = 1 + Math.random() * 3.5;
      f.to.set(cam.x + Math.cos(a) * r, 0, cam.z + Math.sin(a) * r);
      f.to.y = this._groundY(f.to.x, f.to.z) + 0.3 + Math.random() * 1.9;
    } else {
      const a = Math.random() * Math.PI * 2, r = 0.4 + Math.random() * 2.6;
      f.to.set(f.pos.x + Math.cos(a) * r, 0, f.pos.z + Math.sin(a) * r);
      f.to.y = Math.max(this._groundY(f.to.x, f.to.z) + 0.2, Math.min(f.pos.y + (Math.random() - 0.5) * 1.2, this._groundY(f.to.x, f.to.z) + 2.6));
    }
    f.from.copy(f.pos);
    const d = f.from.distanceTo(f.to);
    f.dur = Math.max(0.08, d / (3 + Math.random() * 4));
    f.t = 0;
  }

  _place(f, cam) {
    const a = Math.random() * Math.PI * 2, r = 1 + Math.random() * (DART_R - 2);
    f.pos.set(cam.x + Math.cos(a) * r, 0, cam.z + Math.sin(a) * r);
    f.pos.y = this._groundY(f.pos.x, f.pos.z) + 0.3 + Math.random() * 1.9;
    f.placed = true;
    f.pause = Math.random() * 0.8;
    f.dur = 0;
  }

  // Asento lentosuuntaan; vauhdissa venytys (liike-epäterävyyden tapaan).
  _write(i, pos, dir, speed, dt) {
    const len = 0.022 * SIZE;
    const streak = 1 + Math.min(3, (speed * Math.min(dt, 1 / 30) * 0.7) / len);
    // lookAt(silmä, kohde): +z osoittaa kohteesta silmään, joten kohde taakse.
    this._t.copy(pos).sub(dir);
    this._r.lookAt(pos, this._t, this._up);
    this._q.setFromRotationMatrix(this._r);
    this._s.set(SIZE, SIZE, SIZE * streak);
    this._m.compose(pos, this._q, this._s);
    this.body.setMatrixAt(i, this._m);
    // Siivet: lyönti näkyy sumeana hohteena, joka värisee koon mukana.
    const w = SIZE * (0.85 + Math.random() * 0.3);
    this._s.set(w, SIZE, w);
    this._m.compose(pos, this._q, this._s);
    this.wings.setMatrixAt(i, this._m);
  }

  _hide(i) {
    this._m.makeScale(0, 0, 0);
    this.body.setMatrixAt(i, this._m);
    this.wings.setMatrixAt(i, this._m);
  }

  update(dt, camera, env, rain = 0) {
    const cam = camera.position;
    const humid = env.humid || 0;
    let amt = Math.max(0, Math.min(1, (humid - 0.3) / 0.6)) * (0.2 + 0.8 * Math.min(1, env.daylight * 3)) * (1 - 0.7 * rain);
    if (cam.y < waterAt(cam.x, cam.z, this._wq).wl) amt = 0;
    const show = Math.round(amt * DARTERS);
    const on = show > 0 || this.pass || this.forced;
    this.body.visible = this.wings.visible = !!on;
    if (!on || dt <= 0) return;
    camera.updateMatrixWorld();

    for (let i = 0; i < DARTERS; i++) {
      const f = this.flies[i];
      if (i >= show) { f.placed = false; this._hide(i); continue; }
      if (!f.placed || Math.hypot(f.pos.x - cam.x, f.pos.z - cam.z) > DART_R + 4) this._place(f, cam);
      let speed = 0;
      if (f.pause > 0) {
        // Paikallaan pörrääminen: pientä nykivää värinää.
        f.pause -= dt;
        f.pos.x += (Math.random() - 0.5) * 0.012;
        f.pos.y += (Math.random() - 0.5) * 0.01;
        f.pos.z += (Math.random() - 0.5) * 0.012;
        if (f.pause <= 0) this._target(f, cam, camera);
      } else {
        f.t += dt;
        const u = Math.min(1, f.t / f.dur);
        this._v.copy(f.pos);
        f.pos.lerpVectors(f.from, f.to, u);
        // Pieni sivuheitto syöksyn keskellä.
        f.pos.y += Math.sin(u * Math.PI) * 0.05;
        this._d.copy(f.pos).sub(this._v);
        speed = this._d.length() / dt;
        if (speed > 0.01) f.dir.copy(this._d).normalize();
        if (u >= 1) f.pause = Math.random() < 0.3 ? 0.4 + Math.random() * 1.2 : Math.random() * 0.25;
      }
      this._write(i, f.pos, f.dir, speed, dt);
    }

    // --- Ohilento pään ohi äänen kanssa
    const pi = DARTERS;
    if (!this.pass) {
      this.passTimer -= dt;
      if (this.passTimer <= 0 || this.forced) {
        this.passTimer = (10 + Math.random() * 25) / Math.max(0.3, amt);
        if (amt > 0.35 || this.forced) {
          const P = this.forced?.P || PASSES[Math.floor(Math.random() * PASSES.length)];
          const mirror = this.forced?.mirror ?? Math.random() < 0.5;
          this.pass = { P, mirror, t: 0 };
          this.sfx?.flyBuzz(P.at, P.dur, mirror, 0.6 + 0.4 * Math.max(amt, this.forced ? 1 : 0));
          samplePath(P.key, 0, this.passPrev);
          if (mirror) this.passPrev.x = -this.passPrev.x;
          this.passPrev.applyMatrix4(camera.matrixWorld);
        }
        this.forced = null;
      }
      this._hide(pi);
    } else {
      const ps = this.pass;
      ps.t += dt;
      if (ps.t >= ps.P.dur) {
        this.pass = null;
        this._hide(pi);
      } else {
        samplePath(ps.P.key, ps.t, this.passPos);
        if (ps.mirror) this.passPos.x = -this.passPos.x;
        this.passPos.applyMatrix4(camera.matrixWorld);
        this._d.copy(this.passPos).sub(this.passPrev);
        const speed = this._d.length() / dt;
        if (speed > 0.01) this._d.normalize(); else this._d.set(0, 0, 1);
        this._write(pi, this.passPos, this._d, speed, dt);
        this.passPrev.copy(this.passPos);
      }
    }
    this.body.instanceMatrix.needsUpdate = true;
    this.wings.instanceMatrix.needsUpdate = true;
  }

  // Ohilento heti (F3-kehitystyökalu, testit). i = pätkä 0–2, mirror = suunta.
  trigger(i = null, mirror = null) {
    this.forced = { P: PASSES[i ?? Math.floor(Math.random() * PASSES.length)], mirror: mirror ?? Math.random() < 0.5 };
    this.pass = null;
  }

  clear() {
    for (const f of this.flies) f.placed = false;
    this.pass = null;
    this.forced = null;
  }
}
