// Ensimmäisen persoonan käsi ja kädessä oleva esine. Piirretään omana
// näkymänään maailman päälle, jottei käsi leikkaudu seinien/puiden sisään.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { itemBowBody, bowPoints, makeArrowGeometry } from '../models/items2.js';
import { createFlameTexture } from '../render/textures.js';

const _qi = new THREE.Quaternion();

const SKIN = 0x6a4330;
// Ranteen kohta nyrkin koordinaateissa ja kyynärpää perusasennon koordinaateissa
// (kyynärvarsi suunnataan ranteesta kyynärpäähän).
const WRIST = new THREE.Vector3(0.04, -0.035, 0.03);
const ELBOW = new THREE.Vector3(0.126, -0.373, 0.518);
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
  gold_nugget: { pos: [0.0, 0.03, -0.035], rot: [0.4, 0.3, 0], s: 1.1 },
  cowrie: { pos: [0.0, 0.03, -0.035], rot: [0.4, 0.3, 0], s: 1.1 },
  bronze_bracelet: { pos: [0.0, 0.0, -0.04], rot: [0.6, 0, 0], s: 1.1 },
  wooden_club: { pos: [0, -0.05, 0], rot: [0, 0, 0], s: 0.8 },
  machete: { pos: [0, -0.02, 0], rot: [0, Math.PI / 2, 0], s: 0.85 },
  raw_meat: { pos: [0.0, 0.0, -0.04], rot: [0.4, 0.3, 0], s: 0.85 },
  hide: { pos: [0.0, 0.0, -0.05], rot: [1.2, 0, 0.3], s: 0.75 },
  clay: { pos: [0.0, 0.0, -0.035], rot: [0.4, 0.3, 0], s: 0.85 },
  // Varustamaton kilpi kädessä (varustettuna se on vasemmassa kädessä).
  shield: { pos: [-0.02, 0.06, -0.05], rot: [0.15, Math.PI - 0.5, 0.25], s: 0.42 },
  // Sessio 9
  stone_knife: { pos: [0, -0.03, 0], rot: [0, Math.PI / 2, 0], s: 0.85 },
  flint_axe: { pos: [0, -0.07, 0], rot: [0, Math.PI / 2, 0], s: 0.78 },
  flint_pick: { pos: [0, -0.07, 0], rot: [0, Math.PI / 2, 0], s: 0.78 },
  hammer: { pos: [0, -0.06, 0], rot: [0, Math.PI / 2, 0], s: 0.74 },
  torch: { pos: [0, -0.05, 0], rot: [0, 0, 0], s: 0.85 },
  spear: { pos: [0, -0.02, 0], rot: [-0.35, 0, 0], s: 0.72 },
  bow: { pos: [0, 0, 0], rot: [0, Math.PI / 2, 0], s: 0.8 },
  sinew_bow: { pos: [0, 0, 0], rot: [0, Math.PI / 2, 0], s: 0.8 },
  bamboo: { pos: [0, -0.06, 0], rot: [0, 0, 0], s: 0.85 },
  reed: { pos: [0, -0.04, 0], rot: [0, 0, 0], s: 0.85 },
  palm_leaf: { pos: [0, -0.04, 0], rot: [0, 0, 0.3], s: 0.75 },
  fonio: { pos: [0, -0.04, 0], rot: [0, 0, 0], s: 0.85 },
  bone: { pos: [0, -0.02, 0], rot: [0, 0, 0], s: 0.9 },
  feather: { pos: [0, -0.02, 0], rot: [0, 0, 0], s: 1 },
  banana: { pos: [0, -0.02, 0], rot: [0, 0, -0.3], s: 1 },
  gazelle_pelt: { pos: [0.0, 0.0, -0.05], rot: [1.2, 0, 0.3], s: 0.75 },
  monkey_pelt: { pos: [0.0, 0.0, -0.05], rot: [1.2, 0, 0.3], s: 0.75 },
  fox_pelt: { pos: [0.0, 0.0, -0.05], rot: [1.2, 0, 0.3], s: 0.75 },
  leather: { pos: [0.0, 0.0, -0.05], rot: [0.9, 0, 0.3], s: 0.8 },
  fonio_porridge: { pos: [0, -0.02, -0.06], rot: [0.3, 0, 0], s: 0.85 },
  meat_stew: { pos: [0, -0.02, -0.06], rot: [0.3, 0, 0], s: 0.85 },
  shea_butter: { pos: [0, -0.02, -0.05], rot: [0.3, 0, 0], s: 0.9 },
  bissap: { pos: [0, -0.02, -0.05], rot: [0.2, 0, 0], s: 0.9 },
  arrow_wood: { pos: [0, -0.03, 0], rot: [0, 0, 0], s: 0.6 },
  arrow_bone: { pos: [0, -0.03, 0], rot: [0, 0, 0], s: 0.6 },
  arrow_flint: { pos: [0, -0.03, 0], rot: [0, 0, 0], s: 0.6 },
};
// Pienet esineet, joille ei ole omaa otetta: kämmenellä kuin kivi.
const DEFAULT_HOLD = { pos: [0.0, 0.03, -0.035], rot: [0.4, 0.3, 0], s: 0.9 };
const BOWS = { bow: false, sinew_bow: true };
const BOW_SCALE = 0.7;

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
// Kyynärvarsi on erillinen osa (buildForearmGeometry), joka suunnataan joka
// ruudulla ranteesta kyynärpäähän, jotta se ei käänny iskuissa näkökenttään.
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
  // Ranne
  const wrist = new THREE.SphereGeometry(1, 10, 8);
  wrist.scale(0.04, 0.034, 0.04);
  wrist.translate(WRIST.x, WRIST.y, WRIST.z);
  parts.push(colorize(wrist, SKIN));
  return mergeGeometries(parts, false);
}

// Kyynärvarsi ja hiha -Y-suuntaan origosta (ranteesta).
function buildForearmGeometry() {
  const parts = [];
  const fore = new THREE.CylinderGeometry(0.036, 0.046, 0.42, 10, 1, false);
  fore.translate(0, -0.21, 0);
  parts.push(colorize(fore, SKIN));
  const sleeve = new THREE.CylinderGeometry(0.058, 0.07, 0.3, 12, 1, true);
  sleeve.translate(0, -0.42, 0);
  parts.push(colorize(sleeve, SLEEVE));
  const band = new THREE.CylinderGeometry(0.06, 0.06, 0.03, 12, 1, true);
  band.translate(0, -0.29, 0);
  parts.push(colorize(band, SLEEVE_BAND));
  return mergeGeometries(parts, false);
}

// Vasen käsivarsi kilven kahvassa: nyrkki origossa (kahva X-suunnassa),
// kyynärvarsi kohti kameraa ja alavasemmalle.
function buildLeftArmGeometry() {
  const parts = [];
  const fist = new THREE.SphereGeometry(1, 10, 8);
  fist.scale(0.05, 0.04, 0.045);
  parts.push(colorize(fist, SKIN));
  parts.push(capsule(0.013, 0.07, SKIN_DARK, [0, 0.012, -0.012], [0, 0, Math.PI / 2]));
  const dir = new THREE.Vector3(-0.32, -0.42, 0.85).normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  const fore = new THREE.CylinderGeometry(0.04, 0.034, 0.42, 10, 1, false);
  fore.translate(0, 0.21, 0);
  fore.applyQuaternion(q);
  parts.push(colorize(fore, SKIN));
  const sleeve = new THREE.CylinderGeometry(0.07, 0.058, 0.32, 12, 1, true);
  sleeve.translate(0, 0.44, 0);
  sleeve.applyQuaternion(q);
  parts.push(colorize(sleeve, SLEEVE));
  const band = new THREE.CylinderGeometry(0.06, 0.06, 0.03, 12, 1, true);
  band.translate(0, 0.29, 0);
  band.applyQuaternion(q);
  parts.push(colorize(band, SLEEVE_BAND));
  return mergeGeometries(parts, false);
}

// Vasen käsi jousen kahvassa: nyrkki origossa pystysuoran kahvan ympärillä,
// kyynärvarsi alavasemmalle.
function buildBowArmGeometry() {
  const parts = [];
  const fist = new THREE.SphereGeometry(1, 10, 8);
  fist.scale(0.042, 0.05, 0.045);
  fist.translate(-0.01, 0, 0.01);
  parts.push(colorize(fist, SKIN));
  parts.push(capsule(0.013, 0.06, SKIN_DARK, [0.012, 0, -0.02], [0, 0, 0]));
  const dir = new THREE.Vector3(-0.42, -0.5, 0.76).normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  const fore = new THREE.CylinderGeometry(0.04, 0.034, 0.42, 10, 1, false);
  fore.translate(0, 0.21, 0);
  fore.applyQuaternion(q);
  parts.push(colorize(fore, SKIN));
  const sleeve = new THREE.CylinderGeometry(0.07, 0.058, 0.32, 12, 1, true);
  sleeve.translate(0, 0.44, 0);
  sleeve.applyQuaternion(q);
  parts.push(colorize(sleeve, SLEEVE));
  return mergeGeometries(parts, false);
}

// Animaation asento: [x, y, z, kääntö, kallistus eteen, kallistus sivulle, kierto
// varren ympäri]. Kierto lasketaan ensin, sitten sivukallistus, eteen ja kääntö.
const ZERO = [0, 0, 0, 0, 0, 0, 0];
const _qa = new THREE.Quaternion();
const _qb = new THREE.Quaternion();
const _ax = new THREE.Vector3(1, 0, 0);
const _ay = new THREE.Vector3(0, 1, 0);
const _az = new THREE.Vector3(0, 0, 1);
function applyPose(obj, v) {
  obj.position.set(v[0], v[1], v[2]);
  obj.quaternion.setFromAxisAngle(_ay, v[3]);
  obj.quaternion.multiply(_qa.setFromAxisAngle(_ax, v[4]));
  obj.quaternion.multiply(_qa.setFromAxisAngle(_az, v[5]));
  obj.quaternion.multiply(_qb.setFromAxisAngle(_ay, v[6]));
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
    this.forearm = new THREE.Mesh(buildForearmGeometry(), this.material);
    this.root.add(this.forearm);

    this.items = {};
    for (const [id, geo] of Object.entries(itemGeometries)) {
      const m = new THREE.Mesh(geo, itemMat);
      const h = HOLD[id] || DEFAULT_HOLD;
      m.position.set(...h.pos);
      m.rotation.set(...h.rot);
      m.scale.setScalar(h.s);
      m.visible = false;
      this.anim.add(m);
      this.items[id] = m;
    }

    // Soihdun liekki (kädessä olevan soihdun kärjessä)
    this.flameMat = new THREE.SpriteMaterial({ map: createFlameTexture(), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
    this.flames = [];
    for (let i = 0; i < 2; i++) {
      const f = new THREE.Sprite(this.flameMat);
      f.visible = false;
      this.anim.add(f);
      this.flames.push(f);
    }

    // Jousi vasemmassa kädessä: runko, jänne (kaksi osaa) ja jänteelle asetettu nuoli.
    this.bowGroup = new THREE.Group();
    this.bowArm = new THREE.Mesh(buildBowArmGeometry(), this.material);
    this.bowGroup.add(this.bowArm);
    this.bowBodies = {};
    for (const [id, recurve] of Object.entries(BOWS)) {
      const body = new THREE.Mesh(itemBowBody(recurve), itemMat);
      body.rotation.y = Math.PI / 2; // kaari eteenpäin (-Z), jänne pelaajaa kohti
      body.scale.setScalar(BOW_SCALE);
      body.visible = false;
      this.bowGroup.add(body);
      this.bowBodies[id] = { body, pts: bowPoints(recurve) };
    }
    const strGeo = new THREE.CylinderGeometry(0.0022, 0.0022, 1, 4);
    strGeo.translate(0, 0.5, 0);
    const strMat = new THREE.MeshBasicMaterial({ color: 0xe8dcc0 });
    this.strings = [new THREE.Mesh(strGeo, strMat), new THREE.Mesh(strGeo, strMat)];
    this.bowGroup.add(...this.strings);
    this.nocked = {};
    for (const kind of ['arrow_wood', 'arrow_bone', 'arrow_flint']) {
      const a = new THREE.Mesh(makeArrowGeometry(kind), itemMat);
      a.visible = false;
      this.bowGroup.add(a);
      this.nocked[kind] = a;
    }
    this.bowGroup.visible = false;
    this.scene.add(this.bowGroup);
    this.bowDraw = 0;      // 0..1, asetetaan archery.js:ssä
    this.bowArrow = null;  // jänteellä oleva nuoli (esinetunnus) tai null
    this.bowT = 0;         // jousi esillä 0..1
    this.bowKick = 0;      // laukauksen jälkeinen värähdys

    // Vasen käsi ja kilpi (näkyy, kun kilpi on pikapalkissa).
    this.left = new THREE.Group();
    this.leftAnim = new THREE.Group();
    this.left.add(this.leftAnim);
    this.leftArm = new THREE.Mesh(buildLeftArmGeometry(), this.material);
    this.leftArm.position.set(0, 0, 0.036);
    this.shieldMesh = new THREE.Mesh(itemGeometries.shield || new THREE.CylinderGeometry(0.3, 0.3, 0.03, 16).rotateX(Math.PI / 2), itemMat);
    this.shieldMesh.scale.setScalar(0.8);
    this.leftAnim.add(this.shieldMesh, this.leftArm);
    this.left.visible = false;
    this.scene.add(this.left);
    this.hasShield = false;
    this.shieldT = 0;     // 0 = piilossa, 1 = esillä

    this.basePos = new THREE.Vector3(0.17, -0.155, -0.5);
    this.baseRot = new THREE.Euler(-0.25, 0.15, 0.22);
    this.current = null;
    this.pending = undefined;
    this.equipT = 1;
    this.action = null; // { type, t, dur, hitAt, onHit, hitDone, from }
    this.pose = ZERO.slice(); // viimeisin animaation asento (iskujen ketjutus)
    this.time = 0;
    this.stop = 0;      // osumapysäys (s)
    // Torjunta: 'shield' | 'weapon' | 'fist' | null
    this.blockMode = null;
    this.blockBlend = 0;
    this.blockKind = 'fist';
    this.impact = 0;    // torjutun iskun tärähdys
    this.parryT = 0;    // täydellisen torjunnan työntö
    // Pehmennetyt tilat: kaikki siirtymät liukuvat, mikään ei hyppää.
    this.sway = new THREE.Vector2();     // hiiren liikkeen viive
    this.swayVel = new THREE.Vector2();
    this.look = new THREE.Vector2();     // suodatettu hiiren nopeus
    this.sprintBlend = 0;
    this.airBlend = 0;
    this.crouchBlend = 0;
  }

  get busy() {
    return !!this.action;
  }

  // Iskun eteneminen 0..1 (tai null, jos ei iskua).
  get progress() {
    return this.action ? Math.min(1, this.action.t) : null;
  }

  setItem(id) {
    // Varustettu kilpi on vasemmassa kädessä, ei oikeassa.
    const want = id && this.items[id] && !(id === 'shield' && this.hasShield) ? id : null;
    if (want === this.current && this.pending === undefined) return;
    if (want === this.pending) return;
    // Jatka laskua siitä korkeudesta, jossa käsi juuri on.
    if (this.pending === undefined) this.equipT = 1 - this.equipT;
    this.pending = want;
  }

  setShield(on) {
    this.hasShield = !!on;
  }

  // Torjunta-asento (mode null = ei torjuntaa).
  setBlock(mode) {
    this.blockMode = mode;
    if (mode) this.blockKind = mode;
  }

  // Torjuttu isku tärähdyttää kättä / kilpeä.
  blockImpact(strength = 1) {
    this.impact = Math.min(1.5, this.impact + strength);
  }

  parry() {
    this.parryT = 1;
  }

  // Lyhyt pysäys osuman hetkellä (tuntuma).
  hitStop(sec = 0.06) {
    this.stop = Math.max(this.stop, sec);
  }

  // Yleinen isku: anim = ANIMS-avain, dur = kesto (s), hitAt = osumahetki (0..1).
  // Jos edellinen isku on vielä palautumassa, uusi alkaa sen asennosta.
  play(anim, { dur = 0.5, hitAt = 0.5, onHit = null } = {}) {
    if (this.action && this.action.t < 0.999) {
      if (this.action.t < this.action.hitAt || !this.action.hitDone) return false;
    }
    this.action = { type: anim, t: 0, dur, hitAt, onHit, hitDone: false, from: this.pose.slice() };
    return true;
  }

  // Lyönti / hakkuu. onHit kutsutaan iskun hetkellä.
  swing(kind, onHit) {
    if (this.action) return false;
    return this.play(kind, kind === 'punch' ? { dur: 0.38, hitAt: 0.42, onHit } : { dur: 0.5, hitAt: 0.5, onHit });
  }

  pickup() {
    if (this.action) return;
    this.action = { type: 'pickup', t: 0, dur: 0.3, hitAt: 2, onHit: null, hitDone: true, from: this.pose.slice() };
  }

  // Syöminen: käsi suun eteen.
  eat() {
    if (this.action) return;
    this.action = { type: 'eat', t: 0, dur: 0.75, hitAt: 2, onHit: null, hitDone: true, from: this.pose.slice() };
  }

  // Jousi laukesi: jänne värähtää.
  bowShot() {
    this.bowKick = 1;
  }

  get bowMode() {
    return this.current in BOWS;
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
      this.equipT += dt / 0.16;
      if (this.equipT >= 1) {
        if (this.current && this.items[this.current]) this.items[this.current].visible = false;
        this.current = this.pending;
        if (this.current) this.items[this.current].visible = true;
        this.pending = undefined;
        this.equipT = 0;
      }
    } else if (this.equipT < 1) {
      this.equipT = Math.min(1, this.equipT + dt / 0.24);
    }
    const lowered = smooth(this.pending !== undefined ? this.equipT : 1 - this.equipT);

    // Hiiren liikkeen viive: nopeus (ei ruutukohtainen siirtymä) suodatetaan,
    // ja käsi seuraa sitä vaimennetulla jousella.
    const idt = dt > 0 ? 1 / dt : 0;
    const lk = 1 - Math.exp(-dt * 14);
    this.look.x += (THREE.MathUtils.clamp(input.mouseDX * idt, -3000, 3000) - this.look.x) * lk;
    this.look.y += (THREE.MathUtils.clamp(input.mouseDY * idt, -3000, 3000) - this.look.y) * lk;
    const tx = THREE.MathUtils.clamp(-this.look.x * 0.000011, -0.045, 0.045);
    const ty = THREE.MathUtils.clamp(this.look.y * 0.000011, -0.045, 0.045);
    if (dt > 0) {
      const sdt = Math.min(dt, 1 / 30);
      const K = 160, C = 2 * Math.sqrt(K) * 0.85; // lähes kriittisesti vaimennettu
      this.swayVel.x += ((tx - this.sway.x) * K - this.swayVel.x * C) * sdt;
      this.swayVel.y += ((ty - this.sway.y) * K - this.swayVel.y * C) * sdt;
      this.sway.x += this.swayVel.x * sdt;
      this.sway.y += this.swayVel.y * sdt;
    }

    // Juoksu, ilmassa olo ja kyykky liukuvat sisään ja ulos.
    this.sprintBlend += ((player.sprinting && player.bobAmount > 0.3 ? 1 : 0) - this.sprintBlend) * (1 - Math.exp(-dt * 7));
    this.airBlend += ((player.onGround ? 0 : 1) - this.airBlend) * (1 - Math.exp(-dt * 6));
    this.crouchBlend += ((player.crouching ? 1 : 0) - this.crouchBlend) * (1 - Math.exp(-dt * 8));
    const sp = this.sprintBlend * (1 - this.blockBlend);
    const dead = player.dead ? 1 : 0;

    // Perusasento + kävelyheilunta (pehmeä kahdeksikko) + hengitys
    const bob = player.bobAmount;
    const ph = player.bobPhase;
    const sinP = Math.sin(ph), cosP = Math.cos(ph);
    const step = sinP * sinP; // askelrytmi ilman terävää pohjaa
    const amp = bob * (1 + 0.9 * sp);
    const breathe = Math.sin(this.time * 1.6) * 0.004 * (1 - bob * 0.6);
    const idleX = Math.sin(this.time * 0.9) * 0.0025 * (1 - bob);
    this.root.position.set(
      this.basePos.x + cosP * 0.011 * amp + this.sway.x + idleX + sp * 0.01,
      this.basePos.y - step * 0.016 * amp + breathe + this.sway.y - lowered * 0.35 - sp * 0.035
        - (player.landDip || 0) * 0.35 + this.airBlend * 0.012 - this.crouchBlend * 0.012 - dead * 0.5,
      this.basePos.z + sinP * 0.02 * sp,
    );
    this.root.rotation.set(
      this.baseRot.x - sp * 0.34 + sinP * 0.1 * sp + step * 0.015 * bob + lowered * 0.5 + this.sway.y * 1.2,
      this.baseRot.y + sp * 0.24 - this.sway.x * 1.4,
      this.baseRot.z + cosP * 0.028 * bob + this.sway.x * 0.8,
    );

    // Toiminta-animaatiot avainkehyksistä pehmeillä siirtymillä.
    // Osumapysäys jäädyttää iskun hetkeksi.
    let adt = dt;
    if (this.stop > 0) {
      this.stop -= dt;
      adt = dt * 0.08;
    }
    const a = this.action;
    const pose = this.pose;
    if (a) {
      a.t += adt / a.dur;
      const t = Math.min(1, a.t);
      const keys = ANIMS[a.type] || ANIMS.punch;
      keyframes(keys, t, a.from, pose);
      if (!a.hitDone && t >= a.hitAt) {
        a.hitDone = true;
        if (a.onHit) a.onHit();
      }
      if (a.t >= 1 && this.action === a) this.action = null;
    } else {
      // Keskeytetty isku (esim. torjunta) palaa pehmeästi lepoon.
      const k = Math.exp(-dt * 14);
      for (let i = 0; i < 7; i++) pose[i] *= k;
    }

    // Torjunta-asento liukuu iskujen päälle.
    const bt = this.blockMode ? 1 : 0;
    this.blockBlend += (bt - this.blockBlend) * (1 - Math.exp(-dt * (bt ? 16 : 9)));
    const bb = smooth(this.blockBlend);
    this.impact *= Math.exp(-dt * 10);
    this.parryT = Math.max(0, this.parryT - dt * 4);
    const parryK = Math.sin(this.parryT * Math.PI) * (this.parryT > 0 ? 1 : 0);
    const rightBlock = BLOCK_POSE[this.blockKind] || BLOCK_POSE.fist;
    const shieldUp = this.blockKind === 'shield';
    for (let i = 0; i < 7; i++) _pose[i] = pose[i] + (rightBlock[i] - pose[i]) * bb;
    if (!shieldUp && bb > 0.01) {
      _pose[2] += this.impact * 0.06 - parryK * 0.08;
      _pose[4] += this.impact * 0.12;
      _pose[3] += parryK * 0.25;
    }
    applyPose(this.anim, _pose);
    // Kyynärvarsi ranteesta kohti kyynärpäätä
    this.anim.updateMatrix();
    _w.copy(WRIST).applyMatrix4(this.anim.matrix);
    _d.subVectors(ELBOW, _w).normalize();
    this.forearm.position.copy(_w);
    this.forearm.quaternion.setFromUnitVectors(_down, _d);

    // Soihdun liekki lepattaa kärjessä.
    const torch = this.current === 'torch' && this.items.torch && this.items.torch.visible;
    for (let i = 0; i < this.flames.length; i++) {
      const f = this.flames[i];
      f.visible = torch;
      if (!torch) continue;
      const m = this.items.torch;
      const k = 0.85 + Math.sin(this.time * (9 + i * 3.1) + i) * 0.1 + Math.sin(this.time * 23 + i * 2) * 0.05;
      f.position.set(m.position.x + (i - 0.5) * 0.012, m.position.y + 0.43 * m.scale.y + 0.03 * k, m.position.z);
      f.scale.set(0.085 * k * (1 - i * 0.25), 0.15 * k * (1 - i * 0.2), 1);
    }

    // Jousi vasemmassa kädessä; oikea käsi vetää jännettä.
    const bowOn = this.bowMode && !player.dead && this.pending === undefined;
    this.bowT += ((bowOn ? 1 : 0) - this.bowT) * (1 - Math.exp(-dt * 9));
    if (this.bowMode && this.items[this.current]) this.items[this.current].visible = false;
    this.bowGroup.visible = this.bowT > 0.01 && this.bowMode;
    if (this.bowGroup.visible) this._updateBow(dt, player, bob, sinP, cosP, step, amp, breathe, sp);

    // Kilpi vasemmassa kädessä (ei jousen kanssa)
    this.shieldT += ((this.hasShield && !player.dead && !this.bowMode ? 1 : 0) - this.shieldT) * (1 - Math.exp(-dt * 8));
    this.left.visible = this.shieldT > 0.01;
    if (this.left.visible) {
      const sb = shieldUp ? bb : 0;
      const hide = 1 - smooth(this.shieldT);
      this.left.position.set(
        -0.36 + 0.22 * sb + this.sway.x * 0.8 - cosP * 0.008 * amp,
        -0.34 + 0.12 * sb + this.sway.y * 0.8 - step * 0.014 * amp - hide * 0.35 - sp * 0.05 - this.crouchBlend * 0.01 + breathe,
        -0.52 + 0.08 * sb + this.impact * 0.05 * sb - parryK * 0.1,
      );
      this.left.rotation.set(
        0.18 - 0.12 * sb + this.sway.y * 0.8 + this.impact * 0.1 * sb - sp * 0.2,
        0.95 - 0.8 * sb - this.sway.x * 1.2 + parryK * 0.2,
        0.12 - 0.1 * sb,
      );
    }
  }
}

ViewModel.prototype._updateBow = function (dt, player, bob, sinP, cosP, step, amp, breathe, sp) {
  const d = smooth(this.bowDraw);
  const hide = 1 - smooth(this.bowT);
  this.bowKick *= Math.exp(-dt * 9);
  const kick = Math.sin(this.bowKick * Math.PI * 3) * this.bowKick;
  // Jousi: levossa alempana vasemmalla, jännitettynä keskellä silmien edessä
  // (yläpää kallistuu hieman oikealle).
  const g = this.bowGroup;
  // Jännitettynä nuoli osoittaa tähtäimeen (jousi vasemmalla alhaalla).
  g.position.set(
    -0.24 + 0.11 * d + this.sway.x * 0.8 - cosP * 0.008 * amp,
    -0.26 + 0.16 * d + this.sway.y * 0.8 - step * 0.014 * amp * (1 - d) - hide * 0.4 - sp * 0.05 + breathe,
    -0.62,
  );
  g.rotation.set(0.1 + 0.06 * d + this.sway.y * 0.6 - sp * 0.2, 0.25 - 0.45 * d - this.sway.x * 0.8, -0.35 + 0.13 * d + kick * 0.03);
  for (const [id, b] of Object.entries(this.bowBodies)) b.body.visible = id === this.current;
  const bb = this.bowBodies[this.current];
  if (!bb) return;
  // Jänteen päät ja vetokohta jousen koordinaatistossa (kaari -Z, jänne +Z).
  const s = BOW_SCALE;
  const top = _bt.set(0, bb.pts[bb.pts.length - 1].y * s, bb.pts[bb.pts.length - 1].x * -s);
  const bot = _bb.set(0, bb.pts[0].y * s, bb.pts[0].x * -s);
  const pull = 0.01 + d * 0.4;
  const nock = _bn.set(0, 0, pull - kick * 0.01);
  const setStr = (m, a, b2) => {
    _bd.subVectors(b2, a);
    m.position.copy(a);
    m.scale.set(1, _bd.length(), 1);
    m.quaternion.setFromUnitVectors(_up, _bd.normalize());
  };
  setStr(this.strings[0], top, nock);
  setStr(this.strings[1], bot, nock);
  for (const [kind, a] of Object.entries(this.nocked)) {
    a.visible = this.bowArrow === kind && d > 0.02;
    if (!a.visible) continue;
    // Nuoli jänteeltä eteenpäin (-Z), kahvan vierestä: pää jänteellä.
    a.position.set(0.012, 0.0, nock.z - 0.1);
    a.rotation.set(-Math.PI / 2, 0, 0);
  }
  // Oikea käsi jänteelle: lepoasennossa alhaalla, jännittäessä poskella.
  if (d > 0.001 || this.bowT > 0.01) {
    _bw.copy(nock).applyEuler(g.rotation).add(g.position);
    const tx = THREE.MathUtils.lerp(this.basePos.x - 0.02, _bw.x + 0.035, d);
    const ty = THREE.MathUtils.lerp(this.basePos.y - 0.08, _bw.y - 0.035, d);
    const tz = THREE.MathUtils.lerp(this.basePos.z + 0.05, _bw.z + 0.03, d);
    const k = this.bowT;
    this.root.position.set(
      THREE.MathUtils.lerp(this.root.position.x, tx, k),
      THREE.MathUtils.lerp(this.root.position.y, ty, k),
      THREE.MathUtils.lerp(this.root.position.z, tz, k),
    );
    this.root.rotation.set(
      THREE.MathUtils.lerp(this.root.rotation.x, -0.1 + 0.3 * d, k),
      THREE.MathUtils.lerp(this.root.rotation.y, 0.5 + 0.6 * d, k),
      THREE.MathUtils.lerp(this.root.rotation.z, 0.9 + 0.5 * d, k),
    );
    applyPose(this.anim, ZERO);
    this.anim.updateMatrix();
    _w.copy(WRIST).applyMatrix4(this.anim.matrix);
    _d.subVectors(ELBOW, _w).normalize();
    this.forearm.position.copy(_w);
    this.forearm.quaternion.setFromUnitVectors(_down, _d);
  }
};

const _bt = new THREE.Vector3();
const _bb = new THREE.Vector3();
const _bn = new THREE.Vector3();
const _bd = new THREE.Vector3();
const _bw = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _pose = ZERO.slice();
const _w = new THREE.Vector3();
const _d = new THREE.Vector3();
const _down = new THREE.Vector3(0, -1, 0);

// Avainkehykset: [aika, asento, siirtymän pehmennys kohti tätä kehystä].
// Ensimmäinen kehys on aina iskun alkuasento (edellisen iskun asento ketjussa).
// Asento: [x, y, z, kääntö, kallistus eteen, kallistus sivulle, kierto].
const Q = Math.PI / 2;
const ANIMS = {
  // Työkalun isku ylhäältä alas (hakkuu); osuma 0.5.
  swing: [
    [0, ZERO],
    [0.3, [0, 0.065, 0.055, 0, 0.72, -0.108, 0], 'inOut'],
    [0.5, [-0.049, -0.1, -0.16, 0, -1.22, 0.183, 0], 'strike'],
    [0.6, [-0.043, -0.085, -0.13, 0, -1.08, 0.162, 0], 'out'],
    [1, ZERO, 'inOut'],
  ],
  // Suora lyönti nyrkillä; osuma 0.42.
  punch: [
    [0, ZERO],
    [0.18, [0.018, -0.007, 0.045, 0, 0.054, -0.045, 0], 'inOut'],
    [0.42, [-0.1, 0.04, -0.25, 0.25, -0.3, -0.15, 0], 'strike'],
    [0.54, [-0.088, 0.035, -0.22, 0.222, -0.264, -0.135, 0], 'out'],
    [1, ZERO, 'inOut'],
  ],
  // Koukku sivulta (nyrkkisarjan toinen isku); osuma 0.45.
  hook: [
    [0, ZERO],
    [0.24, [0.09, 0.02, 0.05, -0.55, 0.05, -0.45, 0], 'inOut'],
    [0.45, [-0.13, 0.05, -0.2, 0.65, -0.35, 0.55, 0], 'strike'],
    [0.58, [-0.14, 0.05, -0.18, 0.72, -0.35, 0.6, 0], 'out'],
    [1, ZERO, 'inOut'],
  ],
  // Vino isku oikealta ylhäältä vasemmalle alas; osuma 0.5.
  slashR: [
    [0, ZERO],
    [0.3, [0.12, 0.15, 0.04, -1.45, -0.95, -0.5, Q], 'inOut'],
    [0.5, [-0.03, 0.08, -0.12, 0.35, -1.38, 0.45, Q], 'strike'],
    [0.64, [-0.18, 0.0, -0.05, 1.15, -1.3, 0.6, Q], 'out'],
    [1, ZERO, 'inOut'],
  ],
  // Rystyisku vasemmalta ylhäältä oikealle alas; osuma 0.5.
  slashL: [
    [0, ZERO],
    [0.3, [-0.12, 0.15, 0.02, 1.35, -0.95, 0.5, -Q], 'inOut'],
    [0.5, [0.01, 0.08, -0.12, -0.35, -1.38, -0.45, -Q], 'strike'],
    [0.64, [0.14, 0.0, -0.04, -1.15, -1.3, -0.6, -Q], 'out'],
    [1, ZERO, 'inOut'],
  ],
  // Murskaava isku ylhäältä (nuijan sarjan loppu); osuma 0.6.
  smash: [
    [0, ZERO],
    [0.36, [0.0, 0.2, 0.08, -0.12, 1.0, -0.18, 0], 'inOut'],
    [0.46, [0.0, 0.22, 0.1, -0.12, 1.15, -0.18, 0], 'out'],
    [0.6, [-0.05, 0.12, -0.2, 0.0, -1.75, 0.05, 0], 'strike'],
    [0.72, [-0.05, 0.11, -0.19, 0.0, -1.7, 0.05, 0], 'out'],
    [1, ZERO, 'inOut'],
  ],
  // Pisto eteenpäin (viidakkoveitsen sarjan loppu); osuma 0.48.
  thrust: [
    [0, ZERO],
    [0.3, [0.04, 0.03, 0.1, -0.08, -1.45, 0.0, 0], 'inOut'],
    [0.48, [-0.08, 0.07, -0.3, 0.14, -1.52, -0.2, 0], 'strike'],
    [0.62, [-0.08, 0.07, -0.28, 0.14, -1.52, -0.2, 0], 'out'],
    [1, ZERO, 'inOut'],
  ],
  pickup: [
    [0, ZERO],
    [0.5, [-0.05, -0.12, -0.1, 0, 0.5, 0.2, 0], 'inOut'],
    [1, ZERO, 'inOut'],
  ],
  // Syöminen: käsi suun eteen ja takaisin.
  eat: [
    [0, ZERO],
    [0.3, [-0.11, 0.13, 0.12, 0.35, 0.55, 0.25, 0], 'inOut'],
    [0.5, [-0.12, 0.12, 0.13, 0.4, 0.62, 0.3, 0], 'out'],
    [0.62, [-0.11, 0.13, 0.12, 0.35, 0.55, 0.25, 0], 'inOut'],
    [1, ZERO, 'inOut'],
  ],
};

// Torjunta-asennot oikealle kädelle.
const BLOCK_POSE = {
  weapon: [-0.1, 0.2, 0.0, 0.1, -0.15, 1.42, 0],     // ase vaakasuoraan eteen
  fist: [-0.09, 0.09, 0.05, 0.35, 0.35, 0.3, 0],      // nyrkki kasvojen eteen
  shield: [0.03, -0.07, 0.04, 0, 0.15, 0, 0],         // kilpi torjuu, käsi alempana
};

const EASE = {
  // Kiihtyy pehmeästi ja osuu vielä vauhdilla, mutta ilman nykäisyä.
  strike: (t) => 2 * t * t - t * t * t,
  out: (t) => 1 - Math.pow(1 - t, 3),
  inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
};

// Laskee asennon hetkellä t (out). Ensimmäinen kehys korvataan from-asennolla.
function keyframes(keys, t, from, out) {
  let i = 1;
  while (i < keys.length - 1 && t > keys[i][0]) i++;
  const [t0, a0] = keys[i - 1];
  const [t1, b, ease] = keys[i];
  const a = i === 1 && from ? from : a0;
  const k = Math.min(1, Math.max(0, EASE[ease]((t - t0) / (t1 - t0))));
  for (let j = 0; j < 7; j++) out[j] = a[j] + (b[j] - a[j]) * k;
  return out;
}

function smooth(t) {
  t = Math.min(1, Math.max(0, t));
  return t * t * (3 - 2 * t);
}
