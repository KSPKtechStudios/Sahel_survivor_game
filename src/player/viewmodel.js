// Ensimmäisen persoonan käsi ja kädessä oleva esine. Piirretään omana
// näkymänään maailman päälle, jottei käsi leikkaudu seinien/puiden sisään.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const _qi = new THREE.Quaternion();

const SKIN = 0x6a4330;
const SKIN_DARK = 0x573625;
const SLEEVE = 0x2c3c66;
const SLEEVE_BAND = 0xc9a24a;

// Miten kukin esine asettuu nyrkkiin (kahva paikallisella Y-akselilla).
const HOLD = {
  none: null,
  stick: { pos: [0, -0.06, 0], rot: [0, 0, 0], s: 0.85 },
  stone: { pos: [0.0, 0.035, -0.035], rot: [0.4, 0.3, 0], s: 0.85 },
  fiber: { pos: [0, -0.03, 0], rot: [0, 0, 0], s: 1 },
  wood: { pos: [0.0, 0.0, -0.06], rot: [0, 0, Math.PI / 2], s: 0.9 },
  stone_axe: { pos: [0, -0.07, 0], rot: [0, Math.PI / 2, 0], s: 0.78 },
  stone_pick: { pos: [0, -0.07, 0], rot: [0, Math.PI / 2, 0], s: 0.78 },
  campfire: { pos: [0, 0.03, -0.1], rot: [0.2, 0, 0], s: 0.85 },
};

function colorize(geo, hex) {
  geo = geo.index ? geo.toNonIndexed() : geo;
  for (const n of Object.keys(geo.attributes)) if (n !== 'position' && n !== 'normal') geo.deleteAttribute(n);
  const c = new THREE.Color(hex);
  const arr = new Float32Array(geo.attributes.position.count * 3);
  for (let i = 0; i < arr.length; i += 3) { arr[i] = c.r; arr[i + 1] = c.g; arr[i + 2] = c.b; }
  geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return geo;
}

function capsule(r, len, hex, pos, rot) {
  const g = new THREE.CapsuleGeometry(r, len, 4, 8);
  g.rotateX(rot[0]); g.rotateY(rot[1]); g.rotateZ(rot[2]);
  g.translate(pos[0], pos[1], pos[2]);
  return colorize(g, hex);
}

// Nyrkki, joka puristaa pystysuoraa kahvaa origossa. Kämmenselkä +X-suuntaan
// (kohti katsojan oikeaa reunaa), sormet kiertävät kahvan edestä.
function buildHandGeometry() {
  const parts = [];
  // Kämmen ja kämmenselkä (pyöristetty)
  const palm = new THREE.SphereGeometry(1, 12, 10);
  palm.scale(0.03, 0.052, 0.042);
  palm.translate(0.03, -0.002, 0.012);
  parts.push(colorize(palm, SKIN));
  // Rystysrivi kahvan etupuolella
  parts.push(capsule(0.014, 0.06, SKIN_DARK, [0.03, 0.0, -0.022], [0, 0, 0]));
  // Sormet (4 kpl) kiertävät kahvan
  for (let i = 0; i < 4; i++) {
    const y = 0.033 - i * 0.022;
    parts.push(capsule(0.0115, 0.045, i % 2 ? SKIN : SKIN_DARK, [0.012, y, -0.028], [0, 0, Math.PI / 2]));
    parts.push(capsule(0.011, 0.018, SKIN, [-0.017, y, -0.012], [Math.PI / 2, 0, 0]));
  }
  // Peukalo kahvan yli
  parts.push(capsule(0.012, 0.04, SKIN, [-0.008, 0.052, 0.008], [0.4, 0, 1.2]));
  // Ranne ja kyynärvarsi (kohti kameraa ja alas)
  const fore = new THREE.CylinderGeometry(0.036, 0.046, 0.42, 10, 1, false);
  fore.translate(0, -0.21, 0);
  fore.rotateX(-0.95);
  fore.rotateZ(0.25);
  fore.translate(0.04, -0.035, 0.03);
  parts.push(colorize(fore, SKIN));
  // Hiha
  const sleeve = new THREE.CylinderGeometry(0.058, 0.07, 0.3, 12, 1, true);
  sleeve.translate(0, -0.42, 0);
  sleeve.rotateX(-0.95);
  sleeve.rotateZ(0.25);
  sleeve.translate(0.04, -0.035, 0.03);
  parts.push(colorize(sleeve, SLEEVE));
  const band = new THREE.CylinderGeometry(0.06, 0.06, 0.03, 12, 1, true);
  band.translate(0, -0.29, 0);
  band.rotateX(-0.95);
  band.rotateZ(0.25);
  band.translate(0.04, -0.035, 0.03);
  parts.push(colorize(band, SLEEVE_BAND));
  return mergeGeometries(parts, false);
}

export class ViewModel {
  constructor(itemGeometries) {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(55, 1, 0.01, 20);
    this.hemi = new THREE.HemisphereLight(0xffffff, 0x886644, 1);
    this.light = new THREE.DirectionalLight(0xffffff, 2);
    this.fire = new THREE.PointLight(0xff9a40, 0, 3, 2);
    this.fire.position.set(0.2, -0.3, -0.6);
    this.scene.add(this.hemi, this.light, this.light.target, this.fire);

    this.material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75, metalness: 0 });
    const itemMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0 });

    this.root = new THREE.Group(); // perusasento
    this.anim = new THREE.Group(); // animaatiot
    this.root.add(this.anim);
    this.scene.add(this.root);

    this.hand = new THREE.Mesh(buildHandGeometry(), this.material);
    this.anim.add(this.hand);

    this.items = {};
    for (const [id, geo] of Object.entries(itemGeometries)) {
      const m = new THREE.Mesh(geo, itemMat);
      const h = HOLD[id];
      if (h) {
        m.position.set(...h.pos);
        m.rotation.set(...h.rot);
        m.scale.setScalar(h.s);
      }
      m.visible = false;
      this.anim.add(m);
      this.items[id] = m;
    }

    this.basePos = new THREE.Vector3(0.17, -0.155, -0.5);
    this.baseRot = new THREE.Euler(-0.25, 0.15, 0.22);
    this.current = null;
    this.pending = undefined;
    this.equipT = 1;
    this.action = null; // { type, t, dur, hitAt, onHit, hitDone }
    this.sway = new THREE.Vector2();
    this.time = 0;
  }

  get busy() {
    return !!this.action;
  }

  setItem(id) {
    const want = id && this.items[id] ? id : null;
    if (want === this.current && this.pending === undefined) return;
    if (want === this.pending) return;
    // Jatka laskua siitä korkeudesta, jossa käsi juuri on.
    if (this.pending === undefined) this.equipT = 1 - this.equipT;
    this.pending = want;
  }

  // Lyönti / hakkuu. onHit kutsutaan iskun hetkellä.
  swing(kind, onHit) {
    if (this.action) return false;
    const dur = kind === 'punch' ? 0.38 : 0.5;
    this.action = { type: kind, t: 0, dur, hitAt: kind === 'punch' ? 0.42 : 0.5, onHit, hitDone: false };
    return true;
  }

  pickup() {
    if (this.action) return;
    this.action = { type: 'pickup', t: 0, dur: 0.3, hitAt: 2, onHit: null, hitDone: true };
  }

  resize(aspect) {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  update(dt, player, input, env, mainCamera, fireLight) {
    this.time += dt;

    // Valaistus seuraa maailmaa (valon suunta kameran koordinaatistoon).
    this.hemi.color.copy(env.hemi.color);
    this.hemi.groundColor.copy(env.hemi.groundColor);
    this.hemi.intensity = env.hemi.intensity;
    this.light.color.copy(env.lightColor);
    this.light.intensity = env.lightIntensity * 0.9;
    _qi.copy(mainCamera.quaternion).invert();
    this.light.position.copy(env.lightDir).applyQuaternion(_qi).multiplyScalar(5);
    this.fire.intensity = fireLight;

    // Esineen vaihto: käsi laskee alas, esine vaihtuu, käsi nousee.
    if (this.pending !== undefined) {
      this.equipT += dt / 0.14;
      if (this.equipT >= 1) {
        if (this.current && this.items[this.current]) this.items[this.current].visible = false;
        this.current = this.pending;
        if (this.current) this.items[this.current].visible = true;
        this.pending = undefined;
        this.equipT = 0;
      }
    } else if (this.equipT < 1) {
      this.equipT = Math.min(1, this.equipT + dt / 0.2);
    }
    const lowered = this.pending !== undefined ? this.equipT : 1 - this.equipT;

    // Hiiren liikkeen viive (sway)
    const tx = THREE.MathUtils.clamp(-input.mouseDX * 0.0006, -0.05, 0.05);
    const ty = THREE.MathUtils.clamp(input.mouseDY * 0.0006, -0.05, 0.05);
    this.sway.x += (tx - this.sway.x) * Math.min(1, dt * 10);
    this.sway.y += (ty - this.sway.y) * Math.min(1, dt * 10);

    // Perusasento + kävelyheilunta + hengitys
    const bob = player.bobAmount;
    const sprint = player.sprinting ? 1 : 0;
    const ph = player.bobPhase;
    const breathe = Math.sin(this.time * 1.6) * 0.004;
    this.root.position.set(
      this.basePos.x + Math.cos(ph) * 0.012 * bob * (1 + sprint) + this.sway.x,
      this.basePos.y + Math.abs(Math.sin(ph)) * -0.014 * bob * (1 + sprint) + breathe + this.sway.y - lowered * 0.35 - sprint * 0.03,
      this.basePos.z,
    );
    this.root.rotation.set(
      this.baseRot.x - sprint * 0.35,
      this.baseRot.y + sprint * 0.25,
      this.baseRot.z + Math.cos(ph) * 0.03 * bob,
    );

    // Toiminta-animaatiot
    this.anim.position.set(0, 0, 0);
    this.anim.rotation.set(0, 0, 0);
    const a = this.action;
    if (a) {
      a.t += dt / a.dur;
      const t = Math.min(1, a.t);
      if (a.type === 'swing') {
        // Taakse - isku eteen-alas - palautus
        let rx, py, pz;
        if (t < 0.35) {
          const k = easeOut(t / 0.35);
          rx = 0.7 * k; py = 0.06 * k; pz = 0.05 * k;
        } else if (t < 0.6) {
          const k = easeIn((t - 0.35) / 0.25);
          rx = 0.7 - 1.9 * k; py = 0.06 - 0.16 * k; pz = 0.05 - 0.2 * k;
        } else {
          const k = easeInOut((t - 0.6) / 0.4);
          rx = -1.2 * (1 - k); py = -0.1 * (1 - k); pz = -0.15 * (1 - k);
        }
        this.anim.rotation.x = rx;
        this.anim.rotation.z = -rx * 0.15;
        this.anim.position.set(-0.04 * Math.max(0, -rx), py, pz);
      } else if (a.type === 'punch') {
        const k = t < 0.4 ? easeOut(t / 0.4) : 1 - easeInOut((t - 0.4) / 0.6);
        this.anim.position.set(-0.1 * k, 0.04 * k, -0.25 * k);
        this.anim.rotation.set(-0.3 * k, 0.15 * k, 0);
      } else if (a.type === 'pickup') {
        const k = Math.sin(t * Math.PI);
        this.anim.position.set(-0.05 * k, -0.12 * k, -0.1 * k);
        this.anim.rotation.set(0.5 * k, 0, 0.2 * k);
      }
      if (!a.hitDone && t >= a.hitAt) {
        a.hitDone = true;
        if (a.onHit) a.onHit();
      }
      if (a.t >= 1) this.action = null;
    }
  }
}

function easeOut(t) { return 1 - (1 - t) * (1 - t); }
function easeIn(t) { return t * t; }
function easeInOut(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
