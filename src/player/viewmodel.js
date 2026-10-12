// Ensimmäisen persoonan käsi ja kädessä oleva esine. Piirretään omana
// näkymänään maailman päälle, jottei käsi leikkaudu seinien/puiden sisään.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { itemBowBody, bowPoints, makeArrowGeometry, BOW_STYLES } from '../models/items2.js';
import { attachGlow } from '../render/itemGlow.js';
import { ITEMS } from '../game/items.js';
import { createFlameTexture } from '../render/textures.js';
import { Arms } from './arms.js';
import { TorchFlame } from '../render/torchFlame.js';
import { windUniforms } from '../render/materials.js';

const _qi = new THREE.Quaternion();

const SKIN = 0x6a4330;
// Ranteen kohta nyrkin koordinaateissa ja kyynärpää perusasennon koordinaateissa
// (kyynärvarsi suunnataan ranteesta kyynärpäähän).
const WRIST = new THREE.Vector3(0.04, -0.035, 0.03);
const ELBOW = new THREE.Vector3(0.126, -0.373, 0.518);
const SKIN_DARK = 0x573625;
// Hyppyisku (sessio 21): vasen käsi tarttuu samaan varteen oikean alapuolelta.
const GRIP = new THREE.Vector3(0, -0.12, 0.004);
const LEFT_ELBOW = new THREE.Vector3(-0.55, -0.42, 0.2);
const GRIP_REST = new THREE.Vector3(-0.3, -0.55, 0.1);
const SLEEVE = 0x2c3c66;
const SLEEVE_BAND = 0xc9a24a;

// Miten kukin esine asettuu nyrkkiin (kahva paikallisella Y-akselilla).
// Sessio 29: oikea käsi on n. 9 cm leveä, joten terä-aseiden kahvan keskikohta
// on otteen keskellä (ennen käsi osui terän juureen) ja nuija pidetään
// lähempää varren päätä.
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
  wooden_club: { pos: [0, 0.06, 0], rot: [0, 0, 0], s: 0.8 },
  machete: { pos: [0, 0.047, 0], rot: [0, Math.PI / 2, 0], s: 0.85 },
  raw_meat: { pos: [0.0, 0.0, -0.04], rot: [0.4, 0.3, 0], s: 0.85 },
  hide: { pos: [0.0, 0.0, -0.05], rot: [1.2, 0, 0.3], s: 0.75 },
  clay: { pos: [0.0, 0.0, -0.035], rot: [0.4, 0.3, 0], s: 0.85 },
  // Varustamaton kilpi kädessä (varustettuna se on vasemmassa kädessä).
  shield: { pos: [-0.02, 0.06, -0.05], rot: [0.15, Math.PI - 0.5, 0.25], s: 0.42 },
  // Sessio 9
  stone_knife: { pos: [0, 0.032, 0], rot: [0, Math.PI / 2, 0], s: 0.85 },
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
// Sessio 22: uusien esineiden otteet tyypin mukaan.
const HOLD_BY_WEAPON = {
  axe: HOLD.stone_axe, pick: HOLD.stone_pick, knife: HOLD.stone_knife, dagger: HOLD.stone_knife,
  sword: { pos: [0, 0.055, 0], rot: [0, Math.PI / 2, 0], s: 0.82 }, machete: HOLD.machete,
  club: HOLD.wooden_club, sledge: { pos: [0, -0.26, 0], rot: [0, Math.PI / 2, 0], s: 0.6 }, spear: HOLD.spear,
};
const ARMOR_HOLD = { pos: [0.0, 0.02, -0.06], rot: [0.5, 0.4, 0], s: 0.55 };
function holdFor(id) {
  if (HOLD[id]) return HOLD[id];
  const d = ITEMS[id];
  if (!d) return DEFAULT_HOLD;
  if (d.shield) return HOLD.shield;
  if (d.weapon && HOLD_BY_WEAPON[d.weapon]) return HOLD_BY_WEAPON[d.weapon];
  if (d.armor) return ARMOR_HOLD;
  if (d.ammo) return HOLD.arrow_flint;
  return DEFAULT_HOLD;
}
const BOWS = BOW_STYLES;
const ARROWS = ['arrow_wood', 'arrow_bone', 'arrow_flint', 'arrow_copper', 'arrow_iron'];
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
    this.geos = itemGeometries;
    this.shieldId = 'shield';
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(55, 1, 0.01, 20);
    this.hemi = new THREE.HemisphereLight(0xffffff, 0x886644, 1);
    this.light = new THREE.DirectionalLight(0xffffff, 2);
    this.fire = new THREE.PointLight(0xff9a40, 0, 3, 2);
    this.fire.position.set(0.2, -0.3, -0.6);
    this.scene.add(this.hemi, this.light, this.light.target, this.fire);
    // Sessio 41: tasaiset täytevalot (sessiot 38-40) poistettu. Tilalle
    // reunavalo (Fresnel) käden ja esineiden materiaaleihin (vmRim) sekä
    // himmeä taivasheijastus (ympäristökartta): yöllä vain ääriviivat ja
    // kiiltävät pinnat erottuvat, ydin jää varjoon.
    this.scene.environment = skyEnvTexture();

    this.material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75, metalness: 0 });
    const itemMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0 });

    // Peiliryhmä: jousen kanssa koko asetelma peilataan vaakasuunnassa
    // (sessio 11: jousi oikeassa kädessä, vasen käsi vetää jännettä).
    this.rig = new THREE.Group();
    this.scene.add(this.rig);
    this.root = new THREE.Group(); // perusasento
    this.anim = new THREE.Group(); // animaatiot
    this.root.add(this.anim);
    this.rig.add(this.root);

    this.hand = new THREE.Mesh(buildHandGeometry(), this.material);
    this.anim.add(this.hand);
    this.forearm = new THREE.Mesh(buildForearmGeometry(), this.material);
    this.root.add(this.forearm);
    // Toinen käsi samassa varressa (hyppyisku): peilattu nyrkki + kyynärvarsi.
    this.gripHand = new THREE.Mesh(this.hand.geometry, this.material);
    this.gripHand.scale.set(-1, 1, 1);
    this.gripForearm = new THREE.Mesh(this.forearm.geometry, this.material);
    this.gripHand.visible = this.gripForearm.visible = false;
    this.root.add(this.gripHand, this.gripForearm);
    this.gripK = 0;

    this.items = {};
    this.sockets = {};  // sessio 30: kahvan keskipiste ja säde otteen kohdalla
    for (const [id, geo] of Object.entries(itemGeometries)) {
      // Sessio 33: tekstuuroiduilla malleilla (käyttäjän nuija ja soihtu) on omat materiaalit.
      const m = new THREE.Mesh(geo, geo.userData.material || itemMat);
      const h = holdFor(id);
      m.position.set(...h.pos);
      m.rotation.set(...h.rot);
      m.scale.setScalar(h.s);
      m.visible = false;
      attachGlow(m);
      this.anim.add(m);
      this.items[id] = m;
      if (h) this.sockets[id] = measureSocket(m);
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
    for (const [id, style] of Object.entries(BOWS)) {
      const body = new THREE.Mesh(itemBowBody(style), itemMat);
      attachGlow(body);
      body.rotation.y = Math.PI / 2; // kaari eteenpäin (-Z), jänne pelaajaa kohti
      body.scale.setScalar(BOW_SCALE);
      body.visible = false;
      this.bowGroup.add(body);
      this.bowBodies[id] = { body, pts: bowPoints(style.recurve, 10, style.long || 1), sock: measureSocket(body, BOW_HAND_Y) };
    }
    const strGeo = new THREE.CylinderGeometry(0.0022, 0.0022, 1, 4);
    strGeo.translate(0, 0.5, 0);
    const strMat = new THREE.MeshBasicMaterial({ color: 0xe8dcc0 });
    this.strings = [new THREE.Mesh(strGeo, strMat), new THREE.Mesh(strGeo, strMat)];
    this.bowGroup.add(...this.strings);
    this.nocked = {};
    for (const kind of ARROWS) {
      const a = new THREE.Mesh(makeArrowGeometry(kind), itemMat);
      a.visible = false;
      this.bowGroup.add(a);
      this.nocked[kind] = a;
    }
    this.bowGroup.visible = false;
    this.rig.add(this.bowGroup);
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
    // Soihtu toisessa kädessä (sessio 20) ja sen liekki.
    this.leftTorch = new THREE.Mesh(itemGeometries.torch || new THREE.CylinderGeometry(0.02, 0.025, 0.5, 6), (itemGeometries.torch && itemGeometries.torch.userData.material) || itemMat);
    this.leftTorch.position.set(0, -0.04, 0);
    this.leftTorch.scale.setScalar(0.6);
    this.leftTorch.visible = false;
    this.torchSock = measureSocket(this.leftTorch);
    this.leftAnim.add(this.shieldMesh, this.leftTorch, this.leftArm);
    this.leftFlames = [];
    for (let i = 0; i < 2; i++) {
      const f = new THREE.Sprite(this.flameMat);
      f.visible = false;
      this.leftAnim.add(f);
      this.leftFlames.push(f);
    }
    this.left.visible = false;
    this.rig.add(this.left);
    // Sessio 34: realistiset liekit (shader, noste ja ilmavirta, kipinät).
    // Vanhat liekkispritet jäävät piiloon.
    this.torchFlames = [new TorchFlame(this.scene, 1), new TorchFlame(this.scene, 2)];
    for (const f of this.torchFlames) f.setVisible(false);
    this.hasShield = false;
    this.offhand = null;  // 'shield' | 'torch' | null (main.js)
    this.torchPose = 0;   // 0 = kilven asento, 1 = soihdun asento
    this.shieldT = 0;     // 0 = piilossa, 1 = esillä

    // Sessio 29: oikeat kädet (skinnattu malli). Proseduraaliset kädet
    // näkyvät vain, kunnes malli on ladattu (tai jos lataus epäonnistuu).
    this.arms = new Arms();
    addRim(this.arms.material); // sessio 41: vain käden oma materiaali
    this.rig.add(this.arms.group);
    this.fistT = 0;       // nyrkki pysyy puristettuna hetken lyönnin jälkeen

    this.basePos = new THREE.Vector3(0.17, -0.155, -0.5);
    this.baseRot = new THREE.Euler(-0.25, 0.15, 0.22);
    this.current = null;
    this.pending = undefined;
    this.equipT = 1;
    this.action = null; // { type, t, dur, hitAt, onHit, hitDone, from }
    this.pose = ZERO.slice(); // viimeisin animaation asento (iskujen ketjutus)
    // Sessio 29: pehmennetty asento (jousi) ja sen nopeus.
    this.sp = ZERO.slice();
    this.sv = ZERO.slice();
    this.strikeK = 0;
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
    // Sessio 41: esineille omat materiaalit reunavalolla.
    this.scene.traverse((o) => {
      if (!o.isMesh || o.isSkinnedMesh) return;
      o.material = Array.isArray(o.material) ? o.material.map(vmMaterial) : vmMaterial(o.material);
    });
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

  // Toisen käden esine (sessio 20): 'shield', 'torch' tai null.
  setOffhand(kind, id = null) {
    this.offhand = kind;
    // Sessio 22: varustetun kilven oma malli vasemmassa kädessä.
    if (kind === 'shield' && id && id !== this.shieldId && this.geos[id]) {
      this.shieldId = id;
      this.shieldMesh.geometry = this.geos[id];
    }
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
    // Sessio 25: iskuilla on useita muunnelmia, jotka vuorottelevat
    // (välillä yksi hypätään yli, ettei rytmi ole ennustettava).
    let type = anim;
    const vars = VARIANTS[anim];
    if (vars) {
      if (!this.varIdx) this.varIdx = {};
      const i = ((this.varIdx[anim] ?? -1) + 1 + (Math.random() < 0.3 ? 1 : 0)) % vars.length;
      this.varIdx[anim] = i;
      type = vars[i];
    }
    this.action = { type, t: 0, dur, hitAt, onHit, hitDone: false, from: this.pose.slice() };
    return true;
  }

  // Lyönti / hakkuu. onHit kutsutaan iskun hetkellä.
  swing(kind, onHit) {
    if (this.action) return false;
    return this.play(kind, kind === 'punch' ? { dur: 0.5, hitAt: 0.36, onHit } : { dur: 0.66, hitAt: 0.42, onHit });
  }

  pickup() {
    if (this.action) return;
    this.action = { type: 'pickup', t: 0, dur: 0.5, hitAt: 2, onHit: null, hitDone: true, from: this.pose.slice() };
  }

  // Syöminen: käsi suun eteen.
  eat() {
    if (this.action) return;
    this.action = { type: 'eat', t: 0, dur: 1.0, hitAt: 2, onHit: null, hitDone: true, from: this.pose.slice() };
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
    // Sessio 41: reunavalo ja taivasheijastus. Pimeys arvioidaan maailman
    // valojen kirkkaudesta; reunavalo on viileä kuunvalo ja voimistuu
    // pimeässä, heijastus seuraa taivaan (hajavalon) kirkkautta.
    const skyLum = env.hemi.intensity * lumOf(env.hemi.color);
    const envLum = skyLum + env.lightIntensity * lumOf(env.lightColor) * 0.6 + fireLight * 0.15;
    const dark = THREE.MathUtils.clamp(1 - envLum / 0.7, 0, 1);
    vmRim.uRimCol.value.copy(env.hemi.color).multiplyScalar(1 / Math.max(0.05, lumOf(env.hemi.color)))
      .lerp(_rimNight, dark).multiplyScalar(0.03 + 0.26 * dark);
    this.scene.environmentIntensity = Math.min(0.5, skyLum * 0.8);

    // Esineen vaihto: käsi laskee alas, esine vaihtuu, käsi nousee.
    if (this.pending !== undefined) {
      this.equipT += dt / 0.2;
      if (this.equipT >= 1) {
        if (this.current && this.items[this.current]) this.items[this.current].visible = false;
        this.current = this.pending;
        if (this.current) this.items[this.current].visible = true;
        this.pending = undefined;
        this.equipT = 0;
      }
    } else if (this.equipT < 1) {
      this.equipT = Math.min(1, this.equipT + dt / 0.36);
    }
    const lowered = smoother(this.pending !== undefined ? this.equipT : 1 - this.equipT);

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
      this.baseRot.x - sp * 0.34 + sinP * 0.06 * sp + step * 0.015 * bob + lowered * 0.5 + this.sway.y * 1.2,
      this.baseRot.y + sp * 0.24 - this.sway.x * 1.4,
      this.baseRot.z + cosP * 0.028 * bob + this.sway.x * 0.8,
    );

    // Toiminta-animaatiot avainkehyksistä pehmeillä siirtymillä.
    // Osumapysäys jäädyttää iskun hetkeksi.
    let adt = dt;
    if (this.stop > 0) {
      this.stop -= dt;
      adt = dt * 0.25;
    }
    const a = this.action;
    const pose = this.pose;
    if (a) {
      a.t += adt / a.dur;
      const t = Math.min(1, a.t);
      const keys = ANIMS[a.type] || ANIMS.punch;
      // Jousen viive kompensoidaan katsomalla hieman eteenpäin.
      keyframes(keys, warpTime(keys, Math.min(1, t + SOFT_LEAD / a.dur), a.hitAt), a.from, pose);
      if (!a.hitDone && t >= a.hitAt) {
        a.hitDone = true;
        if (a.onHit) a.onHit();
      }
      if (a.t >= 1 && this.action === a) this.action = null;
    } else {
      // Keskeytetty isku (esim. torjunta) palaa pehmeästi lepoon.
      const k = Math.exp(-dt * 7);
      for (let i = 0; i < 7; i++) pose[i] *= k;
    }

    // Torjunta-asento liukuu iskujen päälle.
    const bt = this.blockMode ? 1 : 0;
    this.blockBlend += (bt - this.blockBlend) * (1 - Math.exp(-dt * (bt ? 10 : 6)));
    const bb = smooth(this.blockBlend);
    this.impact *= Math.exp(-dt * 7);
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
    this._soften(_pose, dt, a);
    applyPose(this.anim, this.sp);
    // Kyynärvarsi ranteesta kohti kyynärpäätä
    this.anim.updateMatrix();
    _w.copy(WRIST).applyMatrix4(this.anim.matrix);
    _d.subVectors(ELBOW, _w).normalize();
    this.forearm.position.copy(_w);
    this.forearm.quaternion.setFromUnitVectors(_down, _d);

    // Hyppyisku: vasen käsi nousee tarttumaan varteen kahdella kädellä.
    const twoHand = !!(a && a.type === 'leap' && a.t < 0.86);
    this.gripK += ((twoHand ? 1 : 0) - this.gripK) * (1 - Math.exp(-dt * (twoHand ? 22 : 12)));
    const gv = this.gripK > 0.01;
    this.gripHand.visible = this.gripForearm.visible = gv;
    if (gv) {
      const gk = smooth(this.gripK);
      _w.copy(GRIP).applyMatrix4(this.anim.matrix);
      this.gripHand.position.lerpVectors(GRIP_REST, _w, gk);
      this.gripHand.quaternion.copy(this.anim.quaternion);
      this.gripHand.updateMatrix();
      _w.copy(WRIST).applyMatrix4(this.gripHand.matrix);
      _d.subVectors(LEFT_ELBOW, _w).normalize();
      this.gripForearm.position.copy(_w);
      this.gripForearm.quaternion.setFromUnitVectors(_down, _d);
    }

    // Soihdun liekki lepattaa kärjessä.
    // torchFlame (main.js, sessio 13): 1 = palaa, < 1 = yskii sateessa, 0 = sammunut.
    const fk = this.torchFlame ?? 1;
    const torch = this.current === 'torch' && this.items.torch && this.items.torch.visible && fk > 0.02;
    for (let i = 0; i < this.flames.length; i++) {
      const f = this.flames[i];
      f.visible = false;
      if (!torch) continue;
      const m = this.items.torch;
      // Heikkokin liekki näkyy selvästi (sateessa ei näytä sammuneelta).
      const k = (0.85 + Math.sin(this.time * (9 + i * 3.1) + i) * 0.1 + Math.sin(this.time * 23 + i * 2) * 0.05) * (0.45 + 0.55 * Math.min(1, fk));
      f.position.set(m.position.x + (i - 0.5) * 0.012, m.position.y + 0.43 * m.scale.y + 0.03 * k, m.position.z);
      f.scale.set(0.085 * k * (1 - i * 0.25), 0.15 * k * (1 - i * 0.2), 1);
    }

    // Jousi: malli on rakennettu vasempaan käteen (oikea käsi vetää), ja koko
    // asetelma peilataan, joten jousi on oikeassa kädessä ja vasen vetää.
    // Peili vaihtuu esineen vaihtuessa, kun käsi on alhaalla poissa näkyvistä.
    this.rig.scale.x = this.bowMode ? -1 : 1;
    const bowOn = this.bowMode && !player.dead && this.pending === undefined;
    this.bowT += ((bowOn ? 1 : 0) - this.bowT) * (1 - Math.exp(-dt * 9));
    if (this.bowMode && this.items[this.current]) this.items[this.current].visible = false;
    this.bowGroup.visible = this.bowT > 0.01 && this.bowMode;
    if (this.bowGroup.visible) this._updateBow(dt, player, bob, sinP, cosP, step, amp, breathe, sp);

    // Toinen käsi: kilpi tai soihtu (ei jousen kanssa).
    const off = this.offhand || (this.hasShield ? 'shield' : null);
    // Hyppyiskussa toinen käsi on varressa: kilpi / soihtu laskee hetkeksi.
    this.shieldT += ((off && !player.dead && !this.bowMode && this.gripK < 0.5 ? 1 : 0) - this.shieldT) * (1 - Math.exp(-dt * (this.gripK > 0.5 ? 18 : 8)));
    this.left.visible = this.shieldT > 0.01;
    this.torchPose += ((off === 'torch' ? 1 : 0) - this.torchPose) * (1 - Math.exp(-dt * 10));
    if (off) {
      this.shieldMesh.visible = off === 'shield';
      this.leftTorch.visible = off === 'torch';
    }
    const ft = this.left.visible && this.leftTorch.visible && (this.torchFlame ?? 1) > 0.02;
    for (let i = 0; i < this.leftFlames.length; i++) {
      const f = this.leftFlames[i];
      f.visible = false;
      if (!ft) continue;
      const m = this.leftTorch;
      const k = (0.85 + Math.sin(this.time * (8 + i * 3.3) + i * 2) * 0.1 + Math.sin(this.time * 21 + i) * 0.05) * (0.45 + 0.55 * Math.min(1, this.torchFlame ?? 1));
      f.position.set(m.position.x + (i - 0.5) * 0.012, m.position.y + 0.43 * m.scale.y + 0.03 * k, m.position.z);
      f.scale.set(0.085 * k * (1 - i * 0.25), 0.15 * k * (1 - i * 0.2), 1);
    }
    if (this.left.visible) {
      const sb = shieldUp && off === 'shield' ? bb : 0;
      const hide = 1 - smooth(this.shieldT);
      const tp = smooth(this.torchPose);
      // Soihtu pidetään pystymmässä ja hieman edempänä kuin kilpi.
      this.left.position.set(
        // Sessio 30: sama kävely- ja juoksuheilunta kuin oikealla kädellä,
        // vastavaiheessa (kädet heiluvat vuorotellen).
        -0.36 + 0.07 * tp + 0.22 * sb + this.sway.x * 0.8 - cosP * 0.011 * amp - sp * 0.01,
        -0.34 + 0.07 * tp + 0.12 * sb + this.sway.y * 0.8 - step * 0.016 * amp - hide * 0.35 - sp * 0.045 - this.crouchBlend * 0.012 + breathe,
        -0.52 - 0.06 * tp + 0.08 * sb + this.impact * 0.05 * sb - parryK * 0.1 - sinP * 0.02 * sp,
      );
      this.left.rotation.set(
        0.18 - 0.08 * tp - 0.12 * sb + this.sway.y * 0.8 + this.impact * 0.1 * sb - sp * 0.28 - sinP * 0.06 * sp + step * 0.015 * bob,
        0.95 - 0.7 * tp - 0.8 * sb - this.sway.x * 1.2 + parryK * 0.2 - sp * 0.15,
        0.12 - 0.22 * tp - 0.1 * sb - cosP * 0.028 * bob,
      );
    }
    this._updateArms(dt, player);
    this._updateTorchFlames(dt, mainCamera);
  }

  // Sessio 34: liekit soihtujen kärkiin (kärki mallin y = 0,44).
  _updateTorchFlames(dt, cam) {
    const fk = this.torchFlame ?? 1;
    const wind = { x: windUniforms.uWindDir.value.x * windUniforms.uWindStrength.value * 4, z: windUniforms.uWindDir.value.y * windUniforms.uWindStrength.value * 4 };
    const list = [
      [this.current === 'torch' && this.items.torch && this.items.torch.visible && !this.bowMode, this.items.torch],
      [this.left.visible && this.leftTorch.visible, this.leftTorch],
    ];
    list.forEach(([on, m], i) => {
      const f = this.torchFlames[i];
      const vis = !!on && fk > 0.02 && !!cam;
      f.setVisible(vis);
      // Sessio 36: piilotettunakin päivitetään, jotta ilmassa olevat kipinät
      // ja savu leijuvat ja häipyvät loppuun. Liekki ~30 % isompi.
      if (vis) {
        m.updateWorldMatrix(true, false);
        _tip.set(0, 0.425, 0).applyMatrix4(m.matrixWorld);
      }
      f.update(dt, this.time, vis ? _tip : null, cam, wind, Math.min(1, fk), 0.42 * m.scale.y / 0.85);
    });
  }
}
const _tip = new THREE.Vector3();
const _rimNight = new THREE.Color(0.7, 0.8, 1);
const lumOf = (c) => c.r * 0.2126 + c.g * 0.7152 + c.b * 0.0722;

// Sessio 41: reunavalo (Fresnel) käden ja esineiden materiaaleihin: valo
// ääriviivoilla, ei pinnan keskellä (ammattimainen FPS-kädenvalaistus).
const vmRim = { uRimCol: { value: new THREE.Color(0, 0, 0) } };
function addRim(m) {
  const prev = m.onBeforeCompile;
  const baseKey = m.customProgramCacheKey();
  m.onBeforeCompile = (sh, r) => {
    if (prev) prev.call(m, sh, r);
    sh.uniforms.uRimCol = vmRim.uRimCol;
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uRimCol;')
      .replace('#include <opaque_fragment>', `{
  float vmF = 1.0 - clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0);
  outgoingLight += uRimCol * pow(vmF, 3.0) * (0.35 + 0.65 * diffuseColor.rgb);
}
#include <opaque_fragment>`);
  };
  m.customProgramCacheKey = () => baseKey + '|vmRim';
  m.needsUpdate = true;
  return m;
}

// Kädessä olevien esineiden materiaalit: oma kopio (maassa olevat esineet
// käyttävät alkuperäistä), reunavalo, ja puu ja kahvat hieman sileämmiksi,
// jotta ne poimivat himmeän taivasheijastuksen.
const _vmMats = new Map();
function vmMaterial(mat) {
  if (!mat || !(mat.isMeshStandardMaterial || mat.isMeshLambertMaterial)) return mat;
  let c = _vmMats.get(mat);
  if (!c) {
    c = mat.clone();
    c.onBeforeCompile = mat.onBeforeCompile;
    if (Object.prototype.hasOwnProperty.call(mat, 'customProgramCacheKey')) c.customProgramCacheKey = mat.customProgramCacheKey;
    if (c.isMeshStandardMaterial && !c.metalness) c.roughness = Math.min(c.roughness, 0.62);
    addRim(c);
    _vmMats.set(mat, c);
  }
  return c;
}

// Yksinkertainen taivas-maa-liukuma ympäristökartaksi (heijastukset).
function skyEnvTexture() {
  const w = 64, h = 32, d = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) {
    const t = y / (h - 1); // 0 = alas, 1 = ylös
    const sky = Math.max(0, (t - 0.5) * 2), ground = Math.max(0, (0.5 - t) * 2);
    const r = 150 + 90 * sky - 90 * ground, g = 160 + 85 * sky - 100 * ground, b = 175 + 80 * sky - 120 * ground;
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(d, w, h);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

// Sessio 29: pehmeät ja sulavat liikkeet (käyttäjä: ennen liian nopeita ja
// teräviä). Animaation asento kulkee jousen läpi: liike käynnistyy ja
// pysähtyy pehmeästi, ranne laahaa hieman käsivarren perässä (kiertojen jousi
// on hitaampi), ja iskun ympärillä jousi kiristyy, jotta osuma tuntuu.
const SOFT_POS_HZ = 5.2;
const SOFT_ROT_HZ = 4.2;
const SOFT_LEAD = 0.045;
ViewModel.prototype._soften = function (target, dt, a) {
  const strike = !!(a && a.t > a.hitAt - 0.3 && a.t < a.hitAt + 0.12);
  this.strikeK += ((strike ? 1 : 0) - this.strikeK) * (1 - Math.exp(-dt * 10));
  const boost = 1 + 0.55 * this.strikeK;
  let rem = Math.min(dt, 0.1);
  while (rem > 1e-6) {
    const h = Math.min(rem, 1 / 120);
    rem -= h;
    for (let i = 0; i < 7; i++) {
      const w = 2 * Math.PI * (i < 3 ? SOFT_POS_HZ : SOFT_ROT_HZ) * boost;
      const z = i < 3 ? 0.85 : 0.8;
      this.sv[i] += (w * w * (target[i] - this.sp[i]) - 2 * z * w * this.sv[i]) * h;
      this.sp[i] += this.sv[i] * h;
    }
  }
};

ViewModel.prototype._updateBow = function (dt, player, bob, sinP, cosP, step, amp, breathe, sp) {
  const d = smooth(this.bowDraw);
  const hide = 1 - smooth(this.bowT);
  this.bowKick *= Math.exp(-dt * 9);
  const kick = Math.sin(this.bowKick * Math.PI * 3) * this.bowKick;
  // Jousi: levossa alempana vasemmalla, jännitettynä keskellä silmien edessä
  // (yläpää kallistuu hieman oikealle).
  const g = this.bowGroup;
  // Jännitettynä nuoli osoittaa tähtäimeen (jousi vasemmalla alhaalla).
  // Sessio 30: kävely- ja juoksuheilunta koko jouselle (molemmat kädet
  // liikkuvat yhdessä; jännitettynä vähemmän).
  const bw = 1 - 0.6 * d;
  g.position.set(
    -0.24 + 0.11 * d + this.sway.x * 0.8 - cosP * 0.011 * amp * bw,
    -0.26 + 0.16 * d + this.sway.y * 0.8 - step * 0.016 * amp * bw - hide * 0.4 - sp * 0.05 + breathe,
    -0.62 - sinP * 0.015 * sp,
  );
  g.rotation.set(
    0.1 + 0.06 * d + this.sway.y * 0.6 - sp * 0.2 - sinP * 0.05 * sp + step * 0.012 * bob * bw,
    0.25 - 0.45 * d - this.sway.x * 0.8,
    -0.35 + 0.13 * d + kick * 0.03 - cosP * 0.02 * bob * bw,
  );
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
    // Sessio 31: levossa jännekäsi seuraa samaa kävely- ja juoksuheiluntaa
    // kuin muu käsi (ennen se oli paikallaan).
    const rp = this.root.position;
    const tx = THREE.MathUtils.lerp(rp.x - 0.02, _bw.x + 0.035, d);
    const ty = THREE.MathUtils.lerp(rp.y - 0.08, _bw.y - 0.035, d);
    const tz = THREE.MathUtils.lerp(rp.z + 0.05, _bw.z + 0.03, d);
    const k = this.bowT;
    this.root.position.set(
      THREE.MathUtils.lerp(this.root.position.x, tx, k),
      THREE.MathUtils.lerp(this.root.position.y, ty, k),
      THREE.MathUtils.lerp(this.root.position.z, tz, k),
    );
    const rr = this.root.rotation, br = this.baseRot, nd = 1 - d;
    this.root.rotation.set(
      THREE.MathUtils.lerp(rr.x, -0.1 + 0.3 * d + (rr.x - br.x) * nd, k),
      THREE.MathUtils.lerp(rr.y, 0.5 + 0.6 * d + (rr.y - br.y) * nd, k),
      THREE.MathUtils.lerp(rr.z, 0.9 + 0.5 * d + (rr.z - br.z) * nd, k),
    );
    applyPose(this.anim, ZERO);
    this.anim.updateMatrix();
    _w.copy(WRIST).applyMatrix4(this.anim.matrix);
    _d.subVectors(ELBOW, _w).normalize();
    this.forearm.position.copy(_w);
    this.forearm.quaternion.setFromUnitVectors(_down, _d);
  }
};

// Sessio 29: skinnattujen käsien ohjaus. Oikea käsi seuraa animaatioiden
// otetta (this.anim: kahva origossa, Y-akselilla), vasen käsi kilpeä / soihtua,
// jousta tai (hyppyiskussa) samaa vartta; muuten se lepää näkymän alapuolella.
const CHEST = new THREE.Vector3(0, -0.27, 0.06);
const POLE_R = new THREE.Vector3(0.55, -1, 0.3).normalize();
const POLE_L = new THREE.Vector3(-0.55, -1, 0.3).normalize();
const HANG_POS = new THREE.Vector3(-0.3, -0.78, 0.02);
const HANG_Q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(
  new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 1, 0)));
// Kilven kahva on vaakasuorassa (X), soihtu pystyssä (Y).
const SHIELD_GRIP_Q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -Math.PI / 2);
const SHIELD_GRIP_P = new THREE.Vector3(0, 0, 0.03);
const TORCH_GRIP_Q = new THREE.Quaternion();
const SHIELD_R = 0.014;
// Jousen kahvassa käsi on nuolen alapuolella (nuoli kulkee y = 0).
const BOW_HAND_Y = -0.048;
const _sv = new THREE.Vector3();

// Sessio 30: esineen kahva ("socket", käyttäjän ehdotus): keskipiste ja säde
// otteen kohdalla (y0) luetaan esineen mallista vanhemman koordinaateissa.
// Käsi asettuu tähän ja sormet kiertyvät kahvan ympäri (arms.js).
function measureSocket(mesh, y0 = 0) {
  mesh.updateMatrix();
  const geo = mesh.geometry;
  const pa = geo.attributes.position;
  const xs = [], zs = [];
  for (let i = 0; i < pa.count; i++) {
    _sv.fromBufferAttribute(pa, i).applyMatrix4(mesh.matrix);
    if (Math.abs(_sv.y - y0) < 0.03) { xs.push(_sv.x); zs.push(_sv.z); }
  }
  // Sessio 34: harvoissa malleissa (esim. soihdun varsi) otekohdalla ei ole
  // verteksejä; poikkileikkaus kolmioiden reunojen ja tason y0 leikkauksista.
  if (xs.length < 6) {
    const idx = geo.index ? geo.index.array : null;
    const n = idx ? idx.length : pa.count;
    const tri = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
    for (let t = 0; t < n; t += 3) {
      for (let k = 0; k < 3; k++) tri[k].fromBufferAttribute(pa, idx ? idx[t + k] : t + k).applyMatrix4(mesh.matrix);
      for (let k = 0; k < 3; k++) {
        const a = tri[k], b = tri[(k + 1) % 3];
        if ((a.y - y0) * (b.y - y0) < 0) {
          const f = (y0 - a.y) / (b.y - a.y);
          xs.push(a.x + (b.x - a.x) * f);
          zs.push(a.z + (b.z - a.z) * f);
        }
      }
    }
  }
  if (xs.length < 6) return { x: 0, z: 0, r: 0.015 };
  let cx = 0, cz = 0;
  for (let i = 0; i < xs.length; i++) { cx += xs[i]; cz += zs[i]; }
  cx /= xs.length; cz /= xs.length;
  const rs = xs.map((x, i) => Math.hypot(x - cx, zs[i] - cz)).sort((a, b) => a - b);
  return { x: cx, z: cz, r: rs[Math.floor(rs.length * 0.6)] };
}
const PUNCHES = new Set(['punch', 'punchB', 'punchC', 'punchD', 'uppercut', 'hook']);
const _am = new THREE.Matrix4();
const _ap = new THREE.Vector3();
const _aq = new THREE.Quaternion();
const _as = new THREE.Vector3();
const _lp = new THREE.Vector3();
const _lq = new THREE.Quaternion();
const _gq = new THREE.Quaternion();
const _gp = new THREE.Vector3();
const _am2 = new THREE.Matrix4();
const _offQ = new THREE.Quaternion();
const _offP = new THREE.Vector3();
const ONE = new THREE.Vector3(1, 1, 1);

// Esine kahvasta (varsi otteen läpi) vai kämmenellä (pienet esineet, ruoat)?
function cupHold(id) {
  const h = holdFor(id);
  return !!h && Math.abs(h.pos[2]) > 0.01;
}

ViewModel.prototype._updateArms = function (dt, player) {
  const A = this.arms;
  const on = A.ready;
  // Proseduraaliset kädet vain varalla.
  this.hand.visible = this.forearm.visible = !on;
  this.leftArm.visible = this.bowArm.visible = !on;
  if (on) this.gripHand.visible = this.gripForearm.visible = false;
  A.group.visible = on && !player.dead;
  if (!on || !A.group.visible) return;
  A.setChest(CHEST.x, CHEST.y - this.crouchBlend * 0.006, CHEST.z);

  // Oikea käsi: animaation ote. Ranteen rajat voivat kääntää kättä, jolloin
  // esine (this.anim) seuraa korjattua otetta.
  this.root.updateMatrix();
  this.anim.updateMatrix();
  _am.multiplyMatrices(this.root.matrix, this.anim.matrix).decompose(_ap, _aq, _as);
  const a = this.action;
  const punching = !!(a && PUNCHES.has(a.type));
  const fistBlock = this.blockKind === 'fist' && this.blockBlend > 0.3;
  if (punching || fistBlock) this.fistT = 1.2;
  else this.fistT = Math.max(0, this.fistT - dt);
  let fr = 'RELAX';
  if (this.bowMode) fr = this.bowDraw > 0.04 ? 'HOOK' : 'RELAX';
  else if (a && a.type === 'pickup') fr = a.t < 0.5 ? 'OPEN' : this.current ? (cupHold(this.current) ? 'CUP' : 'GRIP') : 'RELAX';
  else if (a && a.type === 'eat') fr = 'CUP';
  else if (this.current) fr = cupHold(this.current) ? 'CUP' : 'GRIP';
  else if (this.fistT > 0) fr = 'FIST';
  // Kahvallinen esine: käsi kahvan kohdalle (socket) ja sormet sen ympärille.
  const sock = fr === 'GRIP' ? this.sockets[this.current] : null;
  if (sock) {
    _ap.add(_w.set(sock.x, 0, sock.z).applyQuaternion(_aq));
    A.setGrip('R', sock.r);
  } else A.setFingers('R', fr);
  const R = A.solve('R', _ap, _aq, POLE_R, dt);
  if (R) {
    // Esine seuraa kättä (otteen kohta takaisin esineen origoon).
    if (sock) R.outPos.sub(_w.set(sock.x, 0, sock.z).applyQuaternion(R.outQuat));
    _am.compose(R.outPos, R.outQuat, ONE);
    _am2.copy(this.root.matrix).invert().multiply(_am).decompose(this.anim.position, this.anim.quaternion, _as);
    this.anim.updateMatrix();
  }

  // Vasen käsi: lepo alhaalla → kilpi / soihtu → jousi → sama varsi.
  _lp.copy(HANG_POS);
  _lq.copy(HANG_Q);
  let fl = 'RELAX';
  let rl = 0.015;
  let kOff = 0;
  this.leftAnim.position.set(0, 0, 0);
  this.leftAnim.quaternion.identity();
  if (this.left.visible) {
    this.left.updateMatrix();
    _gq.copy(this.left.quaternion);
    _gp.copy(this.left.position);
    const tp = smooth(this.torchPose);
    _offQ.slerpQuaternions(SHIELD_GRIP_Q, TORCH_GRIP_Q, tp);
    _offP.lerpVectors(SHIELD_GRIP_P, _w.set(this.torchSock.x, 0, this.torchSock.z), tp);
    _gp.add(_w.copy(_offP).applyQuaternion(_gq));
    _gq.multiply(_offQ);
    kOff = smooth(this.shieldT);
    _lp.lerp(_gp, kOff);
    _lq.slerp(_gq, kOff);
    if (kOff > 0.3) { fl = 'GRIP'; rl = tp > 0.5 ? this.torchSock.r : SHIELD_R; }
  }
  let kBow = 0;
  if (this.bowMode && this.bowGroup.visible) {
    this.bowGroup.updateMatrix();
    this.bowGroup.matrix.decompose(_gp, _gq, _as);
    // Käsi jousen kahvassa nuolen alapuolella (nuoli lepää käden päällä).
    const bs = (this.bowBodies[this.current] || {}).sock || { x: 0, z: 0, r: 0.015 };
    _gp.copy(_w.set(bs.x, BOW_HAND_Y, bs.z).applyMatrix4(this.bowGroup.matrix));
    kBow = smooth(this.bowT);
    _lp.lerp(_gp, kBow);
    _lq.slerp(_gq, kBow);
    if (kBow > 0.3) { fl = 'GRIP'; rl = bs.r; }
  }
  let kGrip = 0;
  if (this.gripK > 0.01) {
    _am.multiplyMatrices(this.root.matrix, this.anim.matrix).decompose(_gp, _gq, _as);
    _gp.copy(GRIP).applyMatrix4(_am);
    kGrip = smooth(this.gripK);
    _lp.lerp(_gp, kGrip);
    _lq.slerp(_gq, kGrip);
    if (kGrip > 0.3) { fl = 'GRIP'; rl = (sock && sock.r) || 0.016; }
  }
  if (fl === 'GRIP') A.setGrip('L', rl);
  else A.setFingers('L', fl);
  const L = A.solve('L', _lp, _lq, POLE_L, dt, kBow > 0.01 || kGrip > 0.01);
  // Kilpi / soihtu seuraa ranteen rajoilla korjattua otetta.
  if (L && kOff > 0.01 && kBow < 0.01 && kGrip < 0.01) {
    _gq.copy(L.outQuat).multiply(_qa.copy(_offQ).invert());
    _gp.copy(_offP).applyQuaternion(_gq).negate().add(L.outPos);
    _am.compose(_gp, _gq, ONE);
    _am2.copy(this.left.matrix).invert().multiply(_am).decompose(_gp, _gq, _as);
    this.leftAnim.position.lerp(_gp, kOff);
    this.leftAnim.quaternion.slerp(_gq, kOff);
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
    [0.6, [-0.03, 0.02, -0.15, 0.0, -1.6, 0.05, 0], 'strike'],
    [0.72, [-0.05, 0.11, -0.19, 0.0, -1.7, 0.05, 0], 'out'],
    [1, ZERO, 'inOut'],
  ],
  // Hyppyisku (sessio 21): kahden käden ote, ase kohoaa pään yli ja iskee
  // ylhäältä suoraan alas; osuma 0.6.
  leap: [
    [0, ZERO],
    [0.36, [-0.09, 0.3, 0.2, 0, 1.2, 0.04, 0], 'inOut'],
    [0.47, [-0.09, 0.33, 0.22, 0, 1.3, 0.04, 0], 'out'],
    [0.6, [-0.11, -0.07, -0.24, 0, -1.62, 0.04, 0], 'strike'],
    [0.74, [-0.11, -0.05, -0.22, 0, -1.52, 0.04, 0], 'out'],
    [1, ZERO, 'inOut'],
  ],
  // Pisto eteenpäin (viidakkoveitsen sarjan loppu); osuma 0.48.
  thrust: [
    [0, ZERO],
    [0.3, [0.04, 0.03, 0.1, -0.08, -1.45, 0.0, 0], 'inOut'],
    [0.48, [-0.05, -0.02, -0.22, 0.14, -1.42, -0.2, 0], 'strike'],
    [0.62, [-0.08, 0.07, -0.28, 0.14, -1.52, -0.2, 0], 'out'],
    [1, ZERO, 'inOut'],
  ],
  // --- Sessio 25: muunnelmat (sama osumahetki kuin perusiskussa).
  // Kirves / hakku: vino hakkuu oikealta ja vasemmalta.
  swingB: [
    [0, ZERO],
    [0.3, [0.05, 0.09, 0.06, -0.38, 0.82, -0.36, 0], 'inOut'],
    [0.5, [-0.075, -0.085, -0.15, 0.32, -1.15, 0.36, 0], 'strike'],
    [0.62, [-0.07, -0.075, -0.13, 0.3, -1.04, 0.33, 0], 'out'],
    [1, ZERO, 'inOut'],
  ],
  swingC: [
    [0, ZERO],
    [0.3, [-0.055, 0.085, 0.06, 0.42, 0.76, 0.22, 0], 'inOut'],
    [0.5, [-0.02, -0.105, -0.155, -0.24, -1.2, -0.06, 0], 'strike'],
    [0.62, [-0.02, -0.09, -0.13, -0.22, -1.08, -0.05, 0], 'out'],
    [1, ZERO, 'inOut'],
  ],
  // Nyrkit: korkeampi suora ja alakoukku.
  punchB: [
    [0, ZERO],
    [0.18, [0.03, 0.01, 0.05, 0.08, 0.12, -0.08, 0], 'inOut'],
    [0.42, [-0.085, 0.065, -0.26, 0.18, -0.42, -0.25, 0], 'strike'],
    [0.54, [-0.077, 0.06, -0.23, 0.16, -0.38, -0.22, 0], 'out'],
    [1, ZERO, 'inOut'],
  ],
  uppercut: [
    [0, ZERO],
    [0.2, [0.03, -0.085, 0.05, 0.12, 0.4, -0.12, 0], 'inOut'],
    [0.42, [-0.085, 0.085, -0.2, 0.18, -0.85, -0.12, 0], 'strike'],
    [0.55, [-0.08, 0.09, -0.18, 0.17, -0.8, -0.11, 0], 'out'],
    [1, ZERO, 'inOut'],
  ],
  // Terät: vaakaviilto ja nouseva viilto.
  slashR2: [
    [0, ZERO],
    [0.3, [0.15, 0.06, 0.03, -1.55, -0.55, -0.25, Q], 'inOut'],
    [0.5, [-0.02, 0.04, -0.13, 0.25, -0.6, 0.15, Q], 'strike'],
    [0.64, [-0.19, 0.02, -0.06, 1.2, -0.55, 0.25, Q], 'out'],
    [1, ZERO, 'inOut'],
  ],
  slashL2: [
    [0, ZERO],
    [0.3, [-0.13, -0.04, 0.03, 1.3, -0.45, 0.65, -Q], 'inOut'],
    [0.5, [0.0, 0.1, -0.12, -0.3, -1.2, -0.25, -Q], 'strike'],
    [0.64, [0.14, 0.15, -0.05, -1.1, -1.35, -0.45, -Q], 'out'],
    [1, ZERO, 'inOut'],
  ],
  // Pisto alempaa kiertäen.
  thrust2: [
    [0, ZERO],
    [0.3, [0.06, -0.02, 0.1, -0.2, -1.35, 0.25, 0], 'inOut'],
    [0.48, [-0.06, -0.05, -0.23, 0.1, -1.38, -0.35, 0], 'strike'],
    [0.62, [-0.09, 0.03, -0.29, 0.1, -1.48, -0.35, 0], 'out'],
    [1, ZERO, 'inOut'],
  ],
  // Moukari vinosti olan yli.
  smash2: [
    [0, ZERO],
    [0.36, [0.08, 0.2, 0.08, -0.5, 0.95, -0.45, 0], 'inOut'],
    [0.46, [0.09, 0.22, 0.1, -0.55, 1.08, -0.5, 0], 'out'],
    [0.6, [-0.05, 0.0, -0.15, 0.35, -1.5, 0.35, 0], 'strike'],
    [0.72, [-0.08, 0.09, -0.19, 0.33, -1.6, 0.33, 0], 'out'],
    [1, ZERO, 'inOut'],
  ],
  // --- Sessio 26: lisää muunnelmia (käyttäjä: enemmän animaatioita ja
  // variaatioita). Osassa ennakoiva liike ja jälkiheilahdus.
  // Raskas hakkuu: pieni notkahdus, korkea nosto, syvä jälkiheilahdus.
  swingD: [
    [0, ZERO],
    [0.12, [0.01, -0.02, 0.02, 0, -0.14, 0, 0], 'out'],
    [0.34, [0.0, 0.11, 0.08, -0.05, 0.98, -0.06, 0], 'inOut'],
    [0.5, [-0.045, -0.12, -0.17, 0.02, -1.3, 0.12, 0], 'strike'],
    [0.66, [-0.04, -0.135, -0.12, 0.02, -1.22, 0.1, 0], 'out'],
    [1, ZERO, 'inOut'],
  ],
  // Vaakahakkuu sivulta (terä vaakatasossa).
  swingE: [
    [0, ZERO],
    [0.3, [0.14, 0.04, 0.03, -1.35, -0.45, -0.3, Q], 'inOut'],
    [0.5, [-0.02, 0.0, -0.13, 0.25, -0.6, 0.15, Q], 'strike'],
    [0.64, [-0.17, -0.01, -0.06, 1.05, -0.55, 0.25, Q], 'out'],
    [1, ZERO, 'inOut'],
  ],
  // Harhautus ja suora: nopea vale-isku, veto takaisin, varsinainen isku.
  punchC: [
    [0, ZERO],
    [0.12, [-0.045, 0.02, -0.09, 0.1, -0.12, -0.05, 0], 'out'],
    [0.24, [0.025, -0.005, 0.05, 0, 0.08, -0.05, 0], 'inOut'],
    [0.42, [-0.11, 0.035, -0.27, 0.28, -0.28, -0.18, 0], 'strike'],
    [0.54, [-0.095, 0.03, -0.23, 0.24, -0.25, -0.15, 0], 'out'],
    [1, ZERO, 'inOut'],
  ],
  // Ylhäältä kaartava isku (overhand).
  punchD: [
    [0, ZERO],
    [0.2, [0.05, 0.065, 0.06, -0.15, 0.45, -0.3, 0], 'inOut'],
    [0.42, [-0.1, -0.01, -0.24, 0.3, -0.55, 0.05, 0], 'strike'],
    [0.55, [-0.095, -0.02, -0.21, 0.28, -0.5, 0.04, 0], 'out'],
    [1, ZERO, 'inOut'],
  ],
  // Jyrkkä vinoviilto ylhäältä.
  slashR3: [
    [0, ZERO],
    [0.28, [0.08, 0.2, 0.05, -0.9, -1.2, -0.75, Q], 'inOut'],
    [0.5, [-0.04, 0.02, -0.13, 0.4, -1.5, 0.6, Q], 'strike'],
    [0.66, [-0.15, -0.05, -0.06, 0.9, -1.45, 0.75, Q], 'out'],
    [1, ZERO, 'inOut'],
  ],
  // Matala, nouseva rystyviilto.
  slashL3: [
    [0, ZERO],
    [0.3, [-0.14, -0.06, 0.03, 1.45, -0.35, 0.3, -Q], 'inOut'],
    [0.5, [0.0, 0.03, -0.13, -0.2, -0.75, -0.1, -Q], 'strike'],
    [0.64, [0.15, 0.08, -0.05, -1.25, -1.0, -0.3, -Q], 'out'],
    [1, ZERO, 'inOut'],
  ],
  // Syöksypisto ranteen kierrolla.
  thrust3: [
    [0, ZERO],
    [0.3, [0.05, 0.07, 0.12, -0.12, -1.5, 0.15, 0.6], 'inOut'],
    [0.48, [-0.05, 0.0, -0.24, 0.12, -1.45, -0.1, 0], 'strike'],
    [0.62, [-0.07, 0.1, -0.31, 0.12, -1.58, -0.1, 0], 'out'],
    [1, ZERO, 'inOut'],
  ],
  // Sessio 32: kevyt vino isku vasemman olan yli (nuija iskee ylhäältä).
  smash4: [
    [0, ZERO],
    [0.36, [-0.05, 0.2, 0.08, 0.25, 0.98, 0.18, 0], 'inOut'],
    [0.46, [-0.05, 0.22, 0.1, 0.28, 1.1, 0.2, 0], 'out'],
    [0.6, [-0.03, 0.01, -0.15, -0.18, -1.52, -0.12, 0], 'strike'],
    [0.72, [-0.04, 0.1, -0.19, -0.17, -1.62, -0.11, 0], 'out'],
    [1, ZERO, 'inOut'],
  ],
  // Nuijan sivupyyhkäisy (sessio 32: ei enää vuorossa, käyttäjä toivoi
  // nuijalle pystysuoria iskuja).
  smash3: [
    [0, ZERO],
    [0.36, [0.14, 0.12, 0.06, -1.1, 0.4, -0.8, 0], 'inOut'],
    [0.46, [0.15, 0.13, 0.07, -1.2, 0.45, -0.85, 0], 'out'],
    [0.6, [-0.08, 0.02, -0.2, 0.7, -1.0, 0.6, 0], 'strike'],
    [0.72, [-0.1, 0.0, -0.18, 0.8, -0.95, 0.65, 0], 'out'],
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

// Sessio 34: nuijan ja terien iskuissa ranne joutui ääriasentoihin (kaikki
// rajat yhtä aikaa), ja IK kiersi kättä varren ympäri. Lyönnin kärkiasentojen
// kallistusta ja kääntöä loivennetaan, jotta isku tulee käsivarresta.
for (const k of ['smash', 'smash2', 'smash4', 'slashR', 'slashR2', 'slashR3', 'slashL', 'slashL2', 'slashL3']) {
  for (const f of ANIMS[k]) {
    if (f[1] === ZERO) continue;
    f[1] = f[1].slice();
    if (Math.abs(f[1][4]) > 0.9) f[1][4] *= 0.78;
    f[1][3] *= 0.8;
  }
}

// Sessio 32: nyrkkiiskut hieman ylempää (tappelun tuntu, käyttäjän toive).
for (const k of ['punch', 'punchB', 'punchC', 'punchD', 'uppercut', 'hook']) {
  for (const f of ANIMS[k]) if (f[1] !== ZERO) { f[1] = f[1].slice(); f[1][1] += 0.045; }
}

// Torjunta-asennot oikealle kädelle.
const BLOCK_POSE = {
  weapon: [-0.08, 0.17, 0.02, 0.25, -0.1, 1.15, 0],   // ase vinosti eteen (sessio 29: luontevampi ranne)
  fist: [-0.09, 0.09, 0.05, 0.35, 0.35, 0.3, 0],      // nyrkki kasvojen eteen
  shield: [0.03, -0.07, 0.04, 0, 0.15, 0, 0],         // kilpi torjuu, käsi alempana
};

const EASE = {
  // Kiihtyy pehmeästi ja osuu vielä vauhdilla, mutta ilman nykäisyä.
  strike: (t) => 2 * t * t - t * t * t,
  out: (t) => 1 - Math.pow(1 - t, 3),
  inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
};

// Sessio 25: iskujen muunnelmat (play valitsee vuorotellen); sessio 26: lisää.
// Sessio 32: vähemmän sivuiskuja (käyttäjä): kirveen vaakahakkuu (swingE) ja
// nuijan sivupyyhkäisy (smash3) pois vuorosta.
const VARIANTS = {
  swing: ['swing', 'swingB', 'swingD', 'swingC'],
  punch: ['punch', 'punchB', 'punchC', 'uppercut', 'punchD'],
  slashR: ['slashR', 'slashR2', 'slashR3'],
  slashL: ['slashL', 'slashL2', 'slashL3'],
  thrust: ['thrust', 'thrust2', 'thrust3'],
  smash: ['smash', 'smash2', 'smash4'],
};

// Sessio 29: iskun jälkeinen asento jatkaa hieman iskun suuntaan
// (jatkoliike), ja palautus alkaa vasta sen jälkeen: liike ei pysähdy
// osumaan kuin seinään. strikeT = lyöntikehyksen aika.
for (const keys of Object.values(ANIMS)) {
  const si = keys.findIndex((k) => k[2] === 'strike');
  keys.strikeT = si > 0 ? keys[si][0] : null;
  if (si < 1 || si + 2 > keys.length - 1 || keys[si + 1][2] !== 'out') continue;
  const sp = keys[si][1], wp = keys[si - 1][1];
  keys[si + 1] = [Math.min(keys[si + 2][0] - 0.12, keys[si][0] + 0.16), sp.map((v, j) => v + (v - wp[j]) * 0.1), 'out'];
}

// Iskun osumahetki (hitAt) voi poiketa lyöntikehyksen ajasta (sessio 29:
// pidempi palautus): aika venytetään niin, että lyöntikehys osuu osumaan.
function warpTime(keys, t, hitAt) {
  const hk = keys.strikeT;
  if (!hk || hitAt >= 1 || hitAt <= 0) return t;
  return t < hitAt ? (t * hk) / hitAt : hk + ((t - hitAt) * (1 - hk)) / (1 - hitAt);
}

// Laskee asennon hetkellä t (out). Ensimmäinen kehys korvataan from-asennolla.
// Sessio 25: avainasentojen välillä kuutiollinen (Hermite) käyrä, jonka
// tangentit lasketaan naapurikehyksistä: liike virtaa kehysten läpi ilman
// nykäyksiä. Osuman kehyksessä tangentti on pieni (napakka isku), ja
// segmentin pehmennys (EASE) muokkaa ajan kulkua (kiihtyvä isku).
const _kp = [ZERO, ZERO, ZERO];
function keyframes(keys, t, from, out) {
  let i = 1;
  while (i < keys.length - 1 && t > keys[i][0]) i++;
  const t0 = keys[i - 1][0], t1 = keys[i][0];
  const ease = keys[i][2];
  const P = (k) => (k === 0 && from ? from : keys[k][1]);
  const a = P(i - 1), b = P(i);
  const h = Math.max(1e-4, t1 - t0);
  const u = Math.min(1, Math.max(0, EASE[ease]((t - t0) / h)));
  // Tangentit (yksikkö: asento / aika). Päät levossa, osumassa pieni.
  const tan = (k, j) => {
    if (k <= 0 || k >= keys.length - 1) return 0;
    const dt = keys[k + 1][0] - keys[k - 1][0];
    const m = (P(k + 1)[j] - P(k - 1)[j]) / Math.max(1e-4, dt);
    return keys[k][2] === 'strike' ? m * 0.42 : m * 0.75;
  };
  const u2 = u * u, u3 = u2 * u;
  const h00 = 2 * u3 - 3 * u2 + 1, h10 = u3 - 2 * u2 + u, h01 = -2 * u3 + 3 * u2, h11 = u3 - u2;
  for (let j = 0; j < 7; j++) out[j] = h00 * a[j] + h10 * h * tan(i - 1, j) + h01 * b[j] + h11 * h * tan(i, j);
  void _kp;
  return out;
}

function smoother(t) {
  t = Math.min(1, Math.max(0, t));
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function smooth(t) {
  t = Math.min(1, Math.max(0, t));
  return t * t * (3 - 2 * t);
}
