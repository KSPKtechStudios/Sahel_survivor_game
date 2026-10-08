// Sessio 29: ensimmäisen persoonan kädet käyttäjän antamasta mallista
// (FPS_Female_Arms.fbx → assets/models/arms/arms.glb, tekstuurit samassa kansiossa).
//
// Luuranko: Root → Shoulder{R,L} (solisluu) → Shoulder_2 (olkavarsi) → Forearm
// → Hand → sormet (Finger_1x pikkusormi … Finger_4x etusormi, Finger_5x peukalo).
// Muunnoksessa luiden lepokierrot nollattiin, joten luun kierto on suoraan sen
// poikkeama lepoasennosta (T-asento, kasvot -Z, metreinä, olkapäiden keskikohta
// origossa). GLB:n userData.poses sisältää mallin valmiit asennot (nyrkki,
// kivääriote jne.), joista sormien otteet otetaan.
//
// Käsi ohjataan otteella: kahvan keskipiste ja suunta (paikallinen Y = varsi
// peukalon puolelle, Z = kohti rannetta, X = oikealla kädellä kämmenselän,
// vasemmalla kämmenen puolelle; vasemman käden kehys on oikean peilikuva).
// Kyynärpää ratkaistaan kahden luun IK:lla, kyynärvarsi kiertyy osittain
// ranteen mukana, ja jos ote on ulottumattomissa, olkapää siirtyy perään.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const DIR = 'assets/models/arms/';
// Otteen keskipiste ranteesta (Hand-luusta): sormien suuntaan, kämmenen
// puolelle ja rystyslinjaa pitkin (etusormen suuntaan) metreinä.
const GRIP_AT = [0.08, 0.04, -0.006];
// Varren vinous kämmenessä (rad).
const GRIP_DIAG = 0.35;
// Olkapään (solisluun) suurin siirtymä, jotta olkavarsi ylettää kyynärpäähän.
const SHIFT_MAX = 0.3;
// Olkapään luonteva jousto (vartalo kääntyy), kun käsi saa liikkua vapaasti.
const SHOULDER_GIVE = 0.22;
const HAND_MOVE_MAX = 0.14;
// Olkanivelen raja rigin koordinaateissa (kamera origossa, katse -Z).
const SHOULDER_MIN_Z = 0.01;
const SHOULDER_MAX_Y = -0.23;
// Ranteen lepokulma otteessa: kevyesti ojennettu ja pikkusormen puolelle.
const NEUTRAL_FLEX = -0.12;
const NEUTRAL_DEV = -0.22;
// Kyynärvarren kierto ranteen mukana (loput kiertyy ranteessa, rajattuna).
const TWIST = 0.8;
const FINGERS = ['1', '2', '3', '4', '5'];

const _v = new THREE.Vector3();
const _w = new THREE.Vector3();
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _c = new THREE.Vector3();
const _n = new THREE.Vector3();
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _qa = new THREE.Quaternion();
const _qb = new THREE.Quaternion();
const _qh = new THREE.Quaternion();
const _qu = new THREE.Quaternion();
const _qf = new THREE.Quaternion();
const _nn = new THREE.Vector3();
const _fdI = new THREE.Vector3();
const _ei = new THREE.Vector3();
const _sh = new THREE.Vector3();
const _pole = new THREE.Vector3();
const _qn = new THREE.Quaternion();
const _qg = new THREE.Quaternion();
const _rq = new THREE.Quaternion();
const _rh = new THREE.Quaternion();
const _rt = new THREE.Vector3();
const _re = new THREE.Vector3();
const _yw = new THREE.Vector3();
const _sh0 = new THREE.Vector3();
const _T = new THREE.Vector3();
const _h1 = new THREE.Vector3();
const _h2 = new THREE.Vector3();
const _p1 = new THREE.Vector3();
const _p2 = new THREE.Vector3();
const _t1 = new THREE.Vector3();
const _rel = new THREE.Quaternion();
const _qs = new THREE.Quaternion();
const _qt = new THREE.Quaternion();
const _qc = new THREE.Quaternion();
const _fx = new THREE.Vector3();

function basisQuat(x, y, z, out) {
  _m.makeBasis(x, y, z);
  return out.setFromRotationMatrix(_m);
}

// Peilaa kierron X-tason yli (oikean käden asento vasemmalle ja päinvastoin).
function mirrorQ(q, out) {
  return out.set(q.x, -q.y, -q.z, q.w);
}


// Pehmeä raja: arvo [lo, hi] sisällä ennallaan, rajan lähellä loivenee.
function softClamp(x, lo, hi, knee = 0.22) {
  if (x > hi - knee) return hi - knee + knee * Math.tanh((x - hi + knee) / knee);
  if (x < lo + knee) return lo + knee - knee * Math.tanh((lo + knee - x) / knee);
  return x;
}

// Ranteen liikealue (rad): koukistus / ojennus, kallistus peukalon (värttinäluun)
// ja pikkusormen (kyynärluun) puolelle sekä jäljelle jäävä kierto.
const FLEX = [-0.55, 0.45];
const DEV = [-0.45, 0.22];
const WTWIST = [-0.3, 0.3];

// Rajoittaa ranteen suhteellisen kierron rel (lepoasennon suunnissa) paikallaan.
function limitWrist(rel, S) {
  const h1 = _h1.copy(S.h0).applyQuaternion(rel);
  // Koukistus: kierto rystyslinjan ympäri; kallistus: kämmenselän normaalin ympäri.
  const p = _p1.copy(h1).addScaledVector(S.l0, -h1.dot(S.l0));
  const flex = Math.atan2(_t1.crossVectors(S.h0, p).dot(S.flexAxis), S.h0.dot(p));
  const q = _p2.copy(h1).addScaledVector(S.b0, -h1.dot(S.b0));
  const dev = Math.atan2(_t1.crossVectors(S.h0, q).dot(S.radAxis), S.h0.dot(q));
  const f2 = softClamp(flex, FLEX[0], FLEX[1]);
  const d2 = softClamp(dev, DEV[0], DEV[1]);
  // Rajattu sormien suunta.
  const h2 = _h2.copy(S.h0).applyAxisAngle(S.flexAxis, f2).applyAxisAngle(S.radAxis, d2).normalize();
  const swing = _qs.setFromUnitVectors(S.h0, h2);
  // Jäljelle jäävä kierto sormien suunnan ympäri.
  _qt.copy(swing).invert().multiply(_qc.setFromUnitVectors(h1, h2).multiply(rel));
  const tw = 2 * Math.atan2(_qt.x * S.h0.x + _qt.y * S.h0.y + _qt.z * S.h0.z, _qt.w);
  const tw2 = softClamp(Math.atan2(Math.sin(tw), Math.cos(tw)), WTWIST[0], WTWIST[1]);
  rel.copy(swing).multiply(_qt.setFromAxisAngle(S.h0, tw2));
  // Viimeisimmät kulmat (kehitystyökaluille): ennen ja jälkeen rajojen.
  const w = S.wristAngles;
  w[0] = flex; w[1] = dev; w[2] = tw; w[3] = f2; w[4] = d2; w[5] = tw2;
}

// Otteen kierron hinta: kyynärpään etäisyysvirhe olkavarren pituudesta
// (neliönä) + pieni hinta kierrosta, jottei ote kierry turhaan.
const ROLL_EPS = 0.04;
const ROLL_MAX = 0.7;
const ROLL_W = 0.015;
function rollCost(S, gripPos, gripQuat, Sh, th) {
  _rq.setFromAxisAngle(_yw, th).multiply(gripQuat);
  _rh.copy(_rq).multiply(S.qG0inv).multiply(S.neutralInv);
  _rt.copy(S.wrist).applyQuaternion(_rq).add(gripPos);
  _re.copy(S.f0).applyQuaternion(_rh).multiplyScalar(-S.b).add(_rt).sub(Sh);
  const e = _re.length() - S.a;
  return e * e + ROLL_W * th * th;
}

export class Arms {
  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'arms';
    this.ready = false;
    this.failed = false;
    this.mesh = null;
    this.sides = {};
    this._load();
  }

  _load() {
    const tl = new THREE.TextureLoader();
    const tex = (f, srgb) => {
      const t = tl.load(DIR + f);
      if (srgb) t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 4;
      return t;
    };
    // Iho mattapintaiseksi (käyttäjä: ei kiiltävä eikä muovinen): karheus
    // 0,6–0,8 (tekstuuri uudelleenskaalattu), heikompi peiliheijastus kuin
    // tavallisella materiaalilla, hento "nukka"-hohde reunoilla ja
    // ihonalaisen sironnan jäljitelmä: valon ja varjon raja punertaa ja
    // pehmenee (valo kulkee ihon läpi).
    this.material = new THREE.MeshPhysicalMaterial({
      map: tex('arms_color.webp', true),
      normalMap: tex('arms_normal.webp'),
      normalScale: new THREE.Vector2(0.8, 0.8),
      roughnessMap: tex('arms_rough.webp'),
      roughness: 1,
      metalness: 0,
      specularIntensity: 0.5,
      sheen: 0.25,
      sheenRoughness: 0.75,
      sheenColor: new THREE.Color(0xffd2bc),
    });
    this.material.onBeforeCompile = (sh) => {
      sh.fragmentShader = sh.fragmentShader.replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
        #if NUM_DIR_LIGHTS > 0
        {
          float wn = dot(normal, directionalLights[0].direction);
          float sss = max(0.0, (wn + 0.6) / 1.6) - max(0.0, wn);
          reflectedLight.directDiffuse += directionalLights[0].color * vec3(1.0, 0.5, 0.38) * sss * 0.3 * diffuseColor.rgb;
        }
        #endif`);
    };
    this.material.customProgramCacheKey = () => 'arms-skin';
    new GLTFLoader().load(DIR + 'arms.glb', (gltf) => {
      try {
        this._setup(gltf);
        this.ready = true;
      } catch (e) {
        console.warn('Kädet: mallin käsittely epäonnistui', e);
        this.failed = true;
      }
    }, undefined, (e) => {
      console.warn('Kädet: mallia ei voitu ladata', e);
      this.failed = true;
    });
  }

  _setup(gltf) {
    const rig = gltf.scene.getObjectByName('ArmsRig') || gltf.scene;
    const poses = rig.userData.poses || {};
    const names = rig.userData.names || [];
    let mesh = null;
    gltf.scene.traverse((o) => { if (o.isSkinnedMesh) mesh = o; });
    if (!mesh) throw new Error('ei SkinnedMeshiä');
    mesh.material = this.material;
    mesh.frustumCulled = false;
    mesh.castShadow = mesh.receiveShadow = false;
    this.mesh = mesh;
    this.group.add(gltf.scene);
    const bone = (n) => {
      const b = rig.getObjectByName(n);
      if (!b || !b.isBone) throw new Error('luu puuttuu: ' + n);
      return b;
    };
    this.root = bone('Root');
    this.root.position.set(0, 0, 0);
    // Malli: juuri lattiatasolla, solisluut 1,65 m korkeudella. Juuri siirretään
    // olkapäiden keskikohtaan (setChest), joten solisluut juuren kohdalle.
    bone('ShoulderR').position.set(0, 0, 0);
    bone('ShoulderL').position.set(0, 0, 0);
    // Lepopaikat juuren suhteen (lepokierrot ovat nollia).
    const restOf = (b) => {
      const p = new THREE.Vector3();
      for (let o = b; o && o !== this.root; o = o.parent) p.add(o.position);
      return p;
    };
    // Asennon sormikierrot (luun paikallinen kierto) nimen mukaan.
    const poseQ = (pose, n) => {
      const arr = poses[pose] && poses[pose][names.indexOf(n)];
      return arr ? new THREE.Quaternion().fromArray(arr) : new THREE.Quaternion();
    };
    // Sormien otteet oikealle kädelle (vasen saa peilikuvan).
    // GRIP: kivääriote, etusormi kiertää kahvan kuten keskisormi.
    // FIST: nyrkki. CUP: avoin, kevyesti koukistettu kämmen (kiväärin tukikäsi).
    const fingerNames = (s) => {
      const out = [];
      for (const f of FINGERS) for (let j = 1; j <= (f === '5' ? 3 : 4); j++) out.push(`Finger_${f}${j}${s}`);
      return out;
    };
    const rNames = fingerNames('R');
    const lNames = fingerNames('L');
    const lib = { FLAT: [], FIST: [], GRIP: [], CUP: [] };
    rNames.forEach((n, i) => {
      lib.FLAT.push(new THREE.Quaternion());
      lib.FIST.push(poseQ('Fists Pose', n));
      const src = n.startsWith('Finger_4') ? n.replace('Finger_4', 'Finger_3') : n;
      lib.GRIP.push(poseQ('Riffle Gun Pose', src).slerp(poseQ('Fists Pose', n), 0.12));
      lib.CUP.push(mirrorQ(poseQ('Riffle Gun Pose', lNames[i]), new THREE.Quaternion()));
    });
    // Rento: puolivälissä avoimen ja kupin välillä; koukku (jousen jänne).
    lib.RELAX = lib.CUP.map((q) => new THREE.Quaternion().slerp(q, 0.75));
    lib.HOOK = lib.FIST.map((q, i) => (rNames[i].startsWith('Finger_5') ? lib.CUP[i].clone() : new THREE.Quaternion().slerp(q, 0.62)));
    // Varattu (esim. poiminta): auki.
    lib.OPEN = lib.FLAT.map((q, i) => new THREE.Quaternion().slerp(lib.CUP[i], 0.3));
    this.lib = lib;

    for (const s of ['R', 'L']) {
      const sign = s === 'R' ? 1 : -1;
      const clav = bone('Shoulder' + s), upper = bone('Shoulder_2' + s), fore = bone('Forearm' + s), hand = bone('Hand' + s);
      const Pu = restOf(upper), Pf = restOf(fore), Ph = restOf(hand);
      const Pm = restOf(bone('Finger_32' + s)), Pi = restOf(bone('Finger_42' + s)), Pp = restOf(bone('Finger_12' + s));
      const a = Pf.distanceTo(Pu), b = Ph.distanceTo(Pf);
      const u0 = Pf.clone().sub(Pu).normalize();
      const f0 = Ph.clone().sub(Pf).normalize();
      const bd0 = f0.clone().addScaledVector(u0, -f0.dot(u0));
      if (bd0.lengthSq() < 1e-6) bd0.set(0, 0, -1);
      bd0.normalize();
      const n0 = u0.clone().cross(bd0).normalize();
      const h0 = Pm.clone().sub(Ph).normalize();
      const l0 = Pi.clone().sub(Pp);
      l0.addScaledVector(h0, -l0.dot(h0)).normalize();
      const b0 = s === 'R' ? h0.clone().cross(l0) : l0.clone().cross(h0);
      b0.normalize();
      // Otteen lepokehys. Varsi kulkee kämmenen poikki vinosti (etusormen
      // tyvestä pikkusormen puoleiseen kämmenen tyveen) kuten nyrkkiotteessa.
      const X = s === 'R' ? b0.clone() : b0.clone().negate();
      const Y = l0.clone().multiplyScalar(Math.cos(GRIP_DIAG)).addScaledVector(h0, Math.sin(GRIP_DIAG)).normalize();
      const Z = X.clone().cross(Y).normalize();
      Y.crossVectors(Z, X).normalize();
      const qG0 = basisQuat(X, Y, Z, new THREE.Quaternion());
      // Otteen keskipiste levossa: kämmenen puolella sormien tyven kohdalla.
      const Cg = Ph.clone().addScaledVector(h0, GRIP_AT[0]).addScaledVector(b0, -GRIP_AT[1]).addScaledVector(l0, GRIP_AT[2]);
      const wrist = Ph.clone().sub(Cg).applyQuaternion(qG0.clone().invert());
      const fingers = (s === 'R' ? rNames : lNames).map((n) => bone(n));
      this.sides[s] = {
        s, sign, clav, upper, fore, hand, fingers,
        upperRest: upper.position.clone(),
        Pu, a, b, u0, f0, bd0, n0, b0,
        qU0: basisQuat(u0, bd0, n0, new THREE.Quaternion()),
        qF0: basisQuat(f0, n0, f0.clone().cross(n0), new THREE.Quaternion()),
        qG0, qG0inv: qG0.clone().invert(),
        wrist,
        h0, l0,
        // Koukistus- ja värttinäluun puoleisen kallistuksen akselit (peilattu vasemmalle).
        flexAxis: l0.clone().multiplyScalar(sign),
        radAxis: b0.clone().multiplyScalar(sign),
        shift: new THREE.Vector3(),
        roll: 0,
        rawShift: 0,
        handMove: 0,
        wristAngles: [0, 0, 0, 0, 0, 0],
        outPos: new THREE.Vector3(),
        outQuat: new THREE.Quaternion(),
        // Sormien nykyinen tila ja tavoite.
        cur: fingers.map(() => new THREE.Quaternion()),
        tgt: fingers.map(() => new THREE.Quaternion()),
        fingerRate: 12,
      };
      const Sd = this.sides[s];
      Sd.neutralInv = new THREE.Quaternion().setFromAxisAngle(Sd.radAxis, NEUTRAL_DEV)
        .multiply(new THREE.Quaternion().setFromAxisAngle(Sd.flexAxis, NEUTRAL_FLEX)).invert();
      this.setFingers(s, 'RELAX', 1, true);
    }
  }

  // Sormien ote: name = FIST | GRIP | CUP | RELAX | HOOK | OPEN | FLAT,
  // mix = 0..1 (sekoitus edelliseen nimettyyn otteeseen), snap = heti.
  setFingers(side, name, mix = 1, snap = false, name2 = null) {
    const S = this.sides[side];
    if (!S) return;
    const A = this.lib[name] || this.lib.RELAX;
    const B = name2 ? this.lib[name2] || A : null;
    for (let i = 0; i < S.fingers.length; i++) {
      const t = S.tgt[i];
      t.copy(A[i]);
      if (B) t.slerp(B[i], mix);
      if (side === 'L') mirrorQ(t, t);
      if (snap) S.cur[i].copy(t);
    }
  }

  // Ratkaisee käden: gripPos / gripQuat = toivottu ote rigin koordinaateissa,
  // pole = kyynärpään suunta. Ranne pysyy luonnollisissa rajoissa: jos ote
  // vaatisi liikaa taivutusta, kättä käännetään ranteen ympäri, ja korjattu
  // ote palautetaan (S.outPos / S.outQuat), jotta esine voi seurata kättä.
  // pinned = käsi pysyy otteessa (jousi, kahden käden ote): vain olkapää joustaa.
  // Muuten käsi saa siirtyä sinne, minne käsivarsi sen luontevasti vie, ja
  // esine seuraa (isku kaartaa olkapään ja kyynärpään ympäri).
  solve(side, gripPos, gripQuat, pole, dt, pinned = false, shrug = 0) {
    const S = this.sides[side];
    if (!S) return null;
    // Ote voi kiertyä varren ympäri (käsi kiertyy kahvan ympäri) siihen
    // asentoon, jossa käsivarsi on luontevin: kyynärpää olkavarren
    // ulottuvilla ja ranne lähes suorana. Lähtöarvo edellisestä ruudusta.
    S.clav.quaternion.setFromAxisAngle(_v.set(0, 0, 1), shrug * S.sign);
    const Sh0 = _sh0.copy(S.upperRest).applyQuaternion(S.clav.quaternion).add(this.root.position);
    _yw.set(0, 1, 0).applyQuaternion(gripQuat);
    let th = S.roll;
    for (let it = 0; it < 3; it++) {
      const c0 = rollCost(S, gripPos, gripQuat, Sh0, th);
      const cp = rollCost(S, gripPos, gripQuat, Sh0, th + ROLL_EPS);
      const cm = rollCost(S, gripPos, gripQuat, Sh0, th - ROLL_EPS);
      const g = (cp - cm) / (2 * ROLL_EPS);
      const h2 = (cp - 2 * c0 + cm) / (ROLL_EPS * ROLL_EPS);
      th -= Math.max(-0.25, Math.min(0.25, h2 > 1e-4 ? g / h2 : g * 4));
      th = Math.max(-ROLL_MAX, Math.min(ROLL_MAX, th));
    }
    S.roll = th;
    _qg.setFromAxisAngle(_yw, th).multiply(gripQuat);
    gripQuat = _qg;
    // Käden kierto ja ranteen paikka.
    _qh.copy(gripQuat).multiply(S.qG0inv);
    const T = _a.copy(S.wrist).applyQuaternion(gripQuat).add(gripPos);
    _T.copy(T);
    // Käsi ohjaa kyynärvartta: luonteva kyynärvarren suunta saadaan käden
    // kierrosta (ranne lähes suorana), joten kyynärpää on siellä, missä
    // kyynärvarsi päättyy. Isku tehdään näin olkapäällä ja kyynärpäällä, ei
    // ranteella (kuten oikeasti). Olkapää (solisluu) joustaa sen verran, että
    // olkavarsi ylettää kyynärpäähän (vartalo kääntyy ja nojaa iskuun).
    _fdI.copy(S.f0).applyQuaternion(_qn.copy(_qh).multiply(S.neutralInv));
    const EI = _ei.copy(T).addScaledVector(_fdI, -S.b);
    S.upper.position.copy(S.upperRest);
    const Sh = _b.copy(S.upperRest).applyQuaternion(S.clav.quaternion).add(this.root.position);
    _sh.subVectors(EI, Sh);
    const le = _sh.length();
    const excess = le - S.a;
    S.rawShift = Math.abs(excess);
    const lim = pinned ? SHIFT_MAX : SHOULDER_GIVE;
    _sh.multiplyScalar(le > 1e-6 ? softClamp(excess, -lim, lim, lim * 0.5) / le : 0);
    // Olkapää pysyy kameran takana ja alapuolella (muuten olkavarren
    // katkaisupää näkyisi kuvassa).
    _sh.add(Sh);
    _sh.z = Math.max(_sh.z, SHOULDER_MIN_Z);
    _sh.y = Math.min(_sh.y, SHOULDER_MAX_Y);
    _sh.sub(Sh);
    S.shift.copy(_sh);
    S.clav.position.copy(S.shift);
    Sh.add(S.shift);
    if (!pinned) {
      // Loput: käsi ja kyynärvarsi siirtyvät niin, että kyynärpää osuu
      // olkavarren ulottuville (kyynärvarren suunta säilyy).
      _v.subVectors(EI, Sh);
      const l2 = _v.length();
      if (l2 > 1e-6) {
        _v.multiplyScalar(S.a / l2).add(Sh).sub(EI);
        const lm = _v.length();
        if (lm > 1e-6) _v.multiplyScalar(softClamp(lm, -1, HAND_MOVE_MAX, HAND_MOVE_MAX * 0.5) / lm);
        // Käsi ei vetäydy kameraa kohti (se peittäisi näkymän).
        _v.z = Math.min(_v.z, 0.02);
        S.handMove = lm;
        T.add(_v);
        EI.add(_v);
        _T.copy(T);
      }
    }
    // Kyynärpään suunta kohti luontevaa kyynärpäätä (tai oletussuunta).
    _pole.subVectors(EI, Sh).normalize().lerp(pole, 0.15).normalize();
    pole = _pole;
    const d = _c.subVectors(T, Sh);
    let dist = d.length();
    const maxR = (S.a + S.b) * 0.985;
    const minR = Math.abs(S.a - S.b) + 0.03;
    dist = Math.min(maxR, Math.max(minR, dist));
    d.normalize();
    const x = (S.a * S.a - S.b * S.b + dist * dist) / (2 * dist);
    const h = Math.sqrt(Math.max(0, S.a * S.a - x * x));
    _n.copy(pole).addScaledVector(d, -pole.dot(d));
    if (_n.lengthSq() < 1e-6) _n.set(0, -1, 0).addScaledVector(d, d.y);
    _n.normalize();
    const E = _w.copy(Sh).addScaledVector(d, x).addScaledVector(_n, h);
    // Olkavarsi: (u, taivutussuunta).
    const u = _v.subVectors(E, Sh).normalize();
    const fd = _c.subVectors(T, E).normalize();
    const bd = _b.copy(fd).addScaledVector(u, -fd.dot(u));
    if (bd.lengthSq() < 1e-8) bd.copy(_n);
    bd.normalize();
    const nn = _nn.crossVectors(u, bd).normalize();
    basisQuat(u, bd, nn, _qu).multiply(_qa.copy(S.qU0).invert());
    // Kyynärvarsi saranana + kierto (pronaatio) ranteen mukana.
    const fx = _fx.crossVectors(fd, nn);
    basisQuat(fd, nn, fx, _qf).multiply(_qa.copy(S.qF0).invert());
    const bf = _w.copy(S.b0).applyQuaternion(_qf);
    const bh = _n.copy(S.b0).applyQuaternion(_qh);
    bf.addScaledVector(fd, -bf.dot(fd));
    bh.addScaledVector(fd, -bh.dot(fd));
    if (bf.lengthSq() > 1e-8 && bh.lengthSq() > 1e-8) {
      const ang = Math.atan2(fd.dot(_v.crossVectors(bf, bh)), bf.dot(bh));
      _qf.premultiply(_qb.setFromAxisAngle(fd, ang * TWIST));
    }
    // Ranteen rajat: käden kierto kyynärvarren suhteen (lepoasennossa suora).
    _rel.copy(_qf).invert().multiply(_qh);
    limitWrist(_rel, S);
    _qh.copy(_qf).multiply(_rel);
    // Korjattu ote (ranne paikallaan, käsi kiertyi).
    S.outQuat.copy(_qh).multiply(S.qG0);
    S.outPos.copy(S.wrist).applyQuaternion(S.outQuat).negate().add(_T);
    // Paikalliset kierrot (juuri ja solisluu tunnetaan).
    _q.copy(S.clav.quaternion).invert();
    S.upper.quaternion.copy(_q).multiply(_qu);
    S.fore.quaternion.copy(_qa.copy(_qu).invert()).multiply(_qf);
    S.hand.quaternion.copy(_qa.copy(_qf).invert()).multiply(_qh);
    // Sormet liukuvat tavoitteeseen.
    const k = 1 - Math.exp(-dt * S.fingerRate);
    for (let i = 0; i < S.fingers.length; i++) {
      S.cur[i].slerp(S.tgt[i], k);
      S.fingers[i].quaternion.copy(S.cur[i]);
    }
    return S;
  }

  // Rintakehän (olkapäiden keskikohdan) paikka rigin koordinaateissa.
  setChest(x, y, z) {
    if (this.root) this.root.position.set(x, y, z);
  }
}
