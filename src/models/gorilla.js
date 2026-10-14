// Sessio 51: gorilla (käyttäjän antama malli: Sketchfab "Gorilla",
// planeta-elefante, CC-BY-4.0; assets/models/gorilla/gorilla.glb).
// Mallissa on valmis luuranko ja neljä animaatiota: idle (seisoo rystysillään),
// run (laukka), stomp (nousee takajaloilleen ja tömähtää alas) ja attack
// (lyönti). Malli käännetään latauksessa katsomaan +Z-suuntaan (pään ja
// lantion luiden perusteella) ja skaalataan pelin kokoon.
// Tiedostoa on kevennetty: animaatioista turhat avainkehykset pois
// (gltf-transform resample), tekstuuri JPEG:ksi (1,29 Mt -> 0,49 Mt).
// Sessio 53 (käyttäjä: animaatiot liian nopeita): animaatioita ohjataan itse
// (animateGorilla): kävely rystysillä tehdään laukasta raajat eri vaiheisiin
// siirtämällä, nousu ja lyönti venytetään tilan kestolle ja rintaa lyödään
// käsien IK:lla.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';

const URL = 'assets/models/gorilla/gorilla.glb';
// Pään laki rystysillä seisten (iso urosgorilla, n. 1,5 m).
export const GORILLA_HEIGHT = 1.5;

let template = null;
let loading = null;

export function gorillaReady() {
  return !!template;
}

export function loadGorilla() {
  if (!loading) {
    loading = new GLTFLoader().loadAsync(URL).then((gltf) => {
      const clips = {};
      for (const c of gltf.animations) clips[c.name.replace(/^gorilla/, '')] = c;
      // Lyönnissä koko malli on siirretty 1,7–2,2 m eteen (juurisolmun
      // siirto): ristihäivytyksessä gorilla hyppäsi silmänräpäyksessä eteen
      // ja liukui sitten takaisin. Syöksy hoidetaan liikkeellä (mobs.js).
      if (clips.attack) clips.attack.tracks = clips.attack.tracks.filter((t) => !/^Gorilla\(0\)\.position$/.test(t.name));
      const model = gltf.scene;
      // Mittaus lepoasennossa (idle, alku).
      const mixer = new THREE.AnimationMixer(model);
      if (clips.idle) mixer.clipAction(clips.idle).play();
      mixer.update(0);
      model.updateMatrixWorld(true);
      let head = null, pelvis = null, mesh = null;
      model.traverse((o) => {
        if (o.isBone && !head && /Head/.test(o.name) && !/Nub/.test(o.name)) head = o;
        if (o.isBone && !pelvis && /Pelvis/.test(o.name)) pelvis = o;
        if (o.isSkinnedMesh && !mesh) mesh = o;
      });
      if (!mesh || !head || !pelvis) throw new Error('gorilla: luut tai verkko puuttuu');
      const hp = head.getWorldPosition(new THREE.Vector3());
      const pp = pelvis.getWorldPosition(new THREE.Vector3());
      const yaw = Math.atan2(hp.x - pp.x, hp.z - pp.z); // kuono tähän suuntaan
      const box = new THREE.Box3().setFromObject(model, true);
      const size = box.getSize(new THREE.Vector3());
      const k = GORILLA_HEIGHT / Math.max(1e-6, size.y);
      // Kääre: kierto +Z:aan, koko ja jalat origoon (keskikohta lantion alle).
      const inner = new THREE.Group();
      inner.add(model);
      inner.rotation.y = -yaw;
      inner.scale.setScalar(k);
      inner.updateMatrixWorld(true);
      const box2 = new THREE.Box3().setFromObject(inner, true);
      const pw = pelvis.getWorldPosition(new THREE.Vector3());
      inner.position.set(-pw.x, -box2.min.y, -pw.z);
      const root = new THREE.Group();
      root.add(inner);
      mixer.stopAllAction();
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      template = {
        root, clips, material: mesh.material,
        run: clips.run ? { ...splitClip(clips.run), legRm: mirrorLeg(clips.run) } : null,
        idleBody: clips.idle ? splitClip(clips.idle).body : null,
        info: { yaw: +yaw.toFixed(3), scale: +k.toFixed(2), size: size.toArray().map((v) => +(v * k).toFixed(2)) },
      };
      return template;
    }).catch((e) => {
      console.warn('Gorillaa ei voitu ladata', e);
      return null;
    });
  }
  return loading;
}

export function gorillaInfo() {
  return template && template.info;
}

// Uusi gorilla: oma luuranko, materiaali (osumavälähdys) ja animaatiomikseri.
export function makeGorilla() {
  if (!template) return null;
  const group = cloneSkinned(template.root);
  let mesh = null;
  group.traverse((o) => { if (o.isSkinnedMesh) mesh = o; });
  const material = template.material.clone();
  mesh.material = material;
  // Luut liikkuvat paljon (pystyyn nousu), joten ei rajausta.
  mesh.frustumCulled = false;
  const mixer = new THREE.AnimationMixer(group);
  // Kaikki toiminnot soivat koko ajan; painot ja ajat asetetaan itse.
  const actions = {};
  const add = (name, clip) => {
    if (!clip) return;
    const a = mixer.clipAction(clip);
    a.play();
    a.weight = 0;
    actions[name] = a;
  };
  for (const [name, clip] of Object.entries(template.clips)) add(name, clip);
  if (template.run) for (const k of [...PARTS, 'legRm']) add('run_' + k, template.run[k]);
  add('idleBody', template.idleBody);
  if (actions.idle) actions.idle.weight = 1;
  for (const n of ['stomp', 'attack', 'run_legRm', ...PARTS.map((k) => 'run_' + k)]) if (actions[n]) actions[n].timeScale = 0;
  const bones = {};
  group.traverse((o) => { if (o.isBone) bones[o.name.replace(/^Bip01_/, '').replace(/_\d+$/, '')] = o; });
  return { group, material, kind: 'gorilla', mixer, actions, bones };
}

// --- Animaatio --------------------------------------------------------------

// Laukan raidat raajoittain (kävely saadaan siirtämällä raajojen vaiheita).
const PARTS = ['armL', 'armR', 'legL', 'legR', 'body'];
const LIMB_RE = {
  armL: /_L_(Clavicle|UpperArm|Forearm|Hand|Finger)/,
  armR: /_R_(Clavicle|UpperArm|Forearm|Hand|Finger)/,
  legL: /_L_(Thigh|Calf|Foot|Toe)/,
  legR: /_R_(Thigh|Calf|Foot|Toe)/,
};
function splitClip(clip) {
  const parts = Object.fromEntries(PARTS.map((k) => [k, []]));
  for (const t of clip.tracks) {
    const k = Object.keys(LIMB_RE).find((n) => LIMB_RE[n].test(t.name)) || 'body';
    parts[k].push(t);
  }
  return Object.fromEntries(PARTS.map((k) => [k, new THREE.AnimationClip(`${clip.name}_${k}`, clip.duration, parts[k])]));
}

// Laukan johtava oikea jalka potkaisee lantion korkeudelle, mikä näyttää
// kävelyssä oudolta: kävelyyn oikealle jalalle peilataan vasemman jalan liike.
// Bipedin luissa oikea = vasen peilattuna: kierrosta x ja y vaihtavat merkkiä,
// siirrosta z (tarkistettu lepoasennosta).
function mirrorLeg(clip) {
  const tracks = [];
  for (const t of clip.tracks) {
    const m = /^Bip01_L_(\w+?)_\d+\.(quaternion|position|scale)$/.exec(t.name);
    if (!m || !LIMB_RE.legL.test(t.name)) continue;
    const r = clip.tracks.find((u) => new RegExp(`^Bip01_R_${m[1]}_\\d+\\.`).test(u.name));
    if (!r) continue;
    const node = r.name.slice(0, r.name.lastIndexOf('.'));
    const v = t.values.slice();
    if (m[2] === 'quaternion') for (let i = 0; i < v.length; i += 4) { v[i] = -v[i]; v[i + 1] = -v[i + 1]; }
    else if (m[2] === 'position') for (let i = 2; i < v.length; i += 3) v[i] = -v[i];
    const Track = t.constructor;
    tracks.push(new Track(`${node}.${m[2]}`, t.times.slice(), v));
  }
  return new THREE.AnimationClip(`${clip.name}_legRm`, clip.duration, tracks);
}

// Laukassa raajat osuvat maahan (etummaisin kohta) vaiheissa vasen käsi 0,89,
// oikea käsi 0,74, vasen jalka 0,64 ja oikea jalka 0,43 (mitattu). Kävelyssä
// järjestys on apinoiden ristikkäinen nelitahti: vasen jalka 0, oikea käsi
// 0,25, oikea jalka 0,5, vasen käsi 0,75. Siirto = laukan vaihe - kävelyn vaihe.
// Oikea jalka kävelyssä = peilattu vasen (legRm, vaihe 0,64 - 0,5).
const WALK_OFF = { legL: 0.64, armR: 0.49, legR: -0.07, armL: 0.14, body: 0, legRm: 0.14 };
// Laukan luonnollinen nopeus (käden siirtymä tukivaiheessa / aika), m/s.
const RUN_SPEED = 2.3;
// Rinnan lyönnin kohta rintakehän keskeltä (m): eteen, sivulle, ylös ja
// käden vetäytyminen lyöntien välissä.
export const CHEST = { fwd: 0.2, side: 0.15, up: 0.02, away: 0.16 };

const smooth = (t) => { t = Math.min(1, Math.max(0, t)); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
const frac = (x) => x - Math.floor(x);
const _s = new THREE.Vector3(), _e = new THREE.Vector3(), _h = new THREE.Vector3(), _t = new THREE.Vector3();
const _d = new THREE.Vector3(), _p = new THREE.Vector3(), _n = new THREE.Vector3(), _f = new THREE.Vector3();
const _q = new THREE.Quaternion(), _qw = new THREE.Quaternion(), _qp = new THREE.Quaternion();
const _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3();
const _fw = new THREE.Vector3(), _sd = new THREE.Vector3(), _tg = new THREE.Vector3(), _pl = new THREE.Vector3(), _ch = new THREE.Vector3();

// Kiertää luuta maailmassa niin, että suunta a kääntyy suunnaksi b.
function aim(bone, a, b) {
  _q.setFromUnitVectors(_v1.copy(a).normalize(), _v2.copy(b).normalize());
  bone.getWorldQuaternion(_qw).premultiply(_q);
  bone.parent.getWorldQuaternion(_qp).invert();
  bone.quaternion.copy(_qp.multiply(_qw));
  bone.updateMatrixWorld(true);
}

// Kahden luun IK (olkavarsi + kyynärvarsi): käsi kohti pistettä T painolla w,
// kyynärpää osoittaa suuntaan pole.
function armIK(up, fore, hand, T, pole, w) {
  if (w <= 0.001) return;
  up.getWorldPosition(_s); fore.getWorldPosition(_e); hand.getWorldPosition(_h);
  const a = _s.distanceTo(_e), b = _e.distanceTo(_h);
  _t.copy(_h).lerp(T, w);
  _d.subVectors(_t, _s);
  const d = Math.max(Math.abs(a - b) + 1e-3, Math.min(a + b - 1e-3, _d.length()));
  _d.normalize();
  const x = (a * a - b * b + d * d) / (2 * d), hh = Math.sqrt(Math.max(0, a * a - x * x));
  _n.copy(pole).addScaledVector(_d, -pole.dot(_d)).normalize();
  _p.copy(_s).addScaledVector(_d, x).addScaledVector(_n, hh); // uusi kyynärpää
  aim(up, _v1.subVectors(_e, _s), _f.subVectors(_p, _s));
  fore.getWorldPosition(_e); hand.getWorldPosition(_h);
  aim(fore, _v1.subVectors(_h, _e), _f.subVectors(_t, _e));
}

// o: state, stateT (s), stateDur (s, tilan kokonaiskesto), speed (m/s),
// turn (rad/s), windup / attack / recover (s, lyönnin vaiheiden kestot).
export function animateGorilla(e, o, dt) {
  const A = e.actions;
  const S = e.anim || (e.anim = { w: { idle: 1, loco: 0, stomp: 0, attack: 0 }, ph: Math.random(), walk: 1, sp: 0, ik: 0 });
  const k = (hz) => 1 - Math.exp(-dt * hz);
  const st = o.state, T = o.stateT || 0;
  // Nopeus suodatetaan; paikallaan kääntyessä astellaan hitaasti.
  S.sp += (Math.max(o.speed, Math.min(0.6, Math.abs(o.turn || 0) * 0.35)) - S.sp) * k(5);

  // Mikä liike nyt: seisoo, liikkuu, nousee pystyyn (varoitus/karjaisu), lyö.
  let want = 'move';
  if (st === 'display' || st === 'roar') want = 'stomp';
  else if (st === 'windup' || st === 'attack' || (st === 'recover' && T < (o.recover || 0.9) * 0.3)) want = 'attack';
  const tg = { idle: 0, loco: 0, stomp: 0, attack: 0 };
  if (want === 'move') { tg.loco = smooth((S.sp - 0.08) / 0.45); tg.idle = 1 - tg.loco; } else tg[want] = 1;
  // Lyönnin valmistelu nousee koko valmisteluajan; muut häivytykset pehmeitä.
  const rate = want === 'attack' ? (st === 'windup' ? 4.5 : 14) : want === 'stomp' ? 5 : 3;
  let sum = 0;
  for (const n in S.w) { S.w[n] += (tg[n] - S.w[n]) * k(rate); sum += S.w[n]; }
  for (const n in S.w) S.w[n] /= sum || 1;

  // Liikkuminen: kävely (raajat eri vaiheissa, runko rauhallinen) -> laukka.
  if (A.run_body) {
    const D = A.run_body.getClip().duration;
    S.walk += (smooth((2.7 - S.sp) / 1.0) - S.walk) * k(3);
    // Käynnissä tahti seuraa nopeutta (kädet eivät luista); laukassa tahti
    // kasvaa maltillisesti (ei hätäistä vipellystä).
    const ts = lerp(Math.min(1.0, 0.5 + S.sp * 0.11), S.sp / RUN_SPEED, S.walk);
    S.ph = frac(S.ph + dt * ts / D);
    const wl = S.w.loco;
    for (const kk of [...PARTS, 'legRm']) {
      const a = A['run_' + kk];
      if (!a) continue;
      a.time = frac(S.ph + WALK_OFF[kk] * S.walk) * D;
      a.weight = kk === 'body' ? wl * lerp(1, 0.3, S.walk) : kk === 'legR' ? wl * (1 - S.walk) : kk === 'legRm' ? wl * S.walk : wl;
    }
    if (A.idleBody) {
      A.idleBody.weight = wl * (1 - lerp(1, 0.3, S.walk));
      A.idleBody.time = A.idle ? A.idle.time : 0;
    }
  }
  if (A.idle) A.idle.weight = S.w.idle;

  // Nousu pystyyn: nousu rauhallisesti, pito (rinnan lyönti) ja tömähdys alas
  // venytettynä tilan kestolle (klipissä kaikki tapahtuu 0,57 sekunnissa).
  let beat = 0;
  if (A.stomp) {
    A.stomp.weight = S.w.stomp;
    if (want === 'stomp') {
      const Td = Math.max(0.9, o.stateDur || 1.5);
      const r = Math.min(0.6, Td * 0.38), s0 = Td - 0.32;
      let c;
      if (T < r) c = 0.31 * smooth(T / r);
      else if (T < s0) c = 0.31 + 0.16 * (T - r) / Math.max(0.01, s0 - r);
      else c = 0.47 + 0.09 * smooth((T - s0) / 0.32);
      A.stomp.time = Math.min(0.56, c);
      beat = smooth((T - r * 0.8) / 0.2) * (1 - smooth((T - s0 + 0.12) / 0.12));
    }
  }
  S.ik += (beat - S.ik) * k(12);

  // Lyönti: valmistelussa käsi nousee, isku osuu vahingon hetkellä (mobs.js:
  // 45 % iskun ajasta), sitten saattoliike ja paluu.
  if (A.attack) {
    A.attack.weight = S.w.attack;
    let c = 0.199;
    if (st === 'windup') c = 0.03 * smooth(T / (o.windup || 0.6));
    else if (st === 'attack') {
      const u = Math.min(1, T / (o.attack || 0.5));
      c = u < 0.5 ? 0.03 + 0.08 * smooth(u / 0.5) : 0.11 + 0.089 * (u - 0.5) / 0.5;
    }
    if (want === 'attack') A.attack.time = c;
  }

  e.mixer.update(dt);

  // Rinnan lyönti: kädet vuorotellen rintaan (n. 3 lyöntiä/s kummallakin),
  // kyynärpäät ulos sivuille.
  const B = e.bones;
  if (S.ik > 0.01 && B.L_UpperArm && B.Spine2 && B.Neck) {
    e.group.updateMatrixWorld(true);
    B.Spine2.getWorldPosition(_ch).lerp(B.Neck.getWorldPosition(_v2), 0.55);
    e.group.getWorldDirection(_fw); // eteen (+Z)
    _sd.set(_fw.z, 0, -_fw.x); // vasen
    const sc = e.group.getWorldScale(_v2).x;
    const ph = T * Math.PI * 2 * 3;
    for (const [up, fore, hand, sgn, off] of [[B.L_UpperArm, B.L_Forearm, B.L_Hand, 1, 0], [B.R_UpperArm, B.R_Forearm, B.R_Hand, -1, Math.PI]]) {
      const hit = Math.pow(0.5 + 0.5 * Math.sin(ph + off), 4);
      _tg.copy(_ch).addScaledVector(_fw, (CHEST.fwd + CHEST.away * (1 - hit)) * sc).addScaledVector(_sd, sgn * CHEST.side * sc);
      _tg.y += CHEST.up * sc;
      _pl.copy(_sd).multiplyScalar(sgn * 1.3).addScaledVector(_fw, -0.3);
      _pl.y -= 0.4;
      armIK(up, fore, hand, _tg, _pl.normalize(), S.ik);
    }
  }
}
