// Sessio 59: nuotion tuli kokonaan uusiksi (käyttäjä: nuotion tuli on huono
// ja "harva" sekä pelissä että valikossa). Ennen kolme litteää liekkikuvaa
// (sprite) tai harvoja liekkipisteitä.
//
// Uusi tuli:
//  - Liekki: kolme ristikkäistä tasoa, jotka kääntyvät kameraan päin
//    pystyakselin ympäri. Sävytin piirtää yhtenäisen, ylös virtaavan liekin
//    kohinasta (fbm + vääristys): leveä tyvi, kapeneva ja lepattava kärki,
//    väri valkokeltaisesta ytimestä oranssin kautta tummanpunaisiin
//    reunoihin. Tasot ovat eri vaiheessa, joten tuli näyttää tilavalta.
//  - Hiillos: hehkuvat hiilenmurikat, jotka sykkivät kukin omassa tahdissaan,
//    ja pehmeä hehku maassa.
//  - Kipinät ja savu: kevyet pistejärjestelmät (kipinät nousevat pyörteinä
//    ja sammuvat, savu laajenee ja ajautuu tuulen mukana).
// Sessio 60 (käyttäjä: nuotiolle realistisemmat tulifysiikat, samanlaiset
// liekkifysiikat kuin soihtu-itemissä): litteät tasot vaihdettu soihdun
// tilavuusliekkeihin (render/torchFlame.js). Jokainen liekin kieli on neljä
// sisäkkäistä pisaranmuotoista kuorta, joita nouseva 3D-kohina muovaa; reunat
// häipyvät katselukulman mukaan, joten liekki on tilava joka suunnasta. Tuli
// on yksi iso pääliekki ja pienempiä kieliä sen ympärillä, kullakin oma
// vaihe, sykkivä korkeus ja jousella taipuva kärki, jota tuuli ja puuskat
// taivuttavat (kuten soihdussa). Sumu häivyttää kaukaiset tulet.
// Valot hoitaa kutsuja (game/structures.js, ui/menuCamp.js).
import * as THREE from 'three';
import { FLAME_VERT, FLAME_FRAG, flameShellGeometry, FLAME_LAYERS } from './torchFlame.js';

// Sessio 60: soihdun liekkikuoret maailmaan: sumu ja kirkkauskerroin lisätty.
const flameVS = FLAME_VERT
  .replace('varying vec3 vPv;', 'varying vec3 vPv;\n#include <fog_pars_vertex>')
  .replace('gl_Position = projectionMatrix * mv;', 'gl_Position = projectionMatrix * mv;\n  vec4 mvPosition = mv;\n  #include <fog_vertex>');
const flameFS = FLAME_FRAG
  .replace('varying vec3 vPv;', 'varying vec3 vPv;\nuniform float uGain;\n#include <fog_pars_fragment>')
  .replace('gl_FragColor = vec4(col * a * 1.3, a * 0.5);', `gl_FragColor = vec4(col * a * 1.3 * uGain, a * 0.5);
  #ifdef USE_FOG
    #ifdef FOG_EXP2
      float fogF = 1.0 - exp(-fogDensity * fogDensity * vFogDepth * vFogDepth);
    #else
      float fogF = smoothstep(fogNear, fogFar, vFogDepth);
    #endif
    gl_FragColor *= 1.0 - fogF;
  #endif`);
if (!flameFS.includes('uGain;') || !flameVS.includes('fog_vertex')) console.warn('campfire: liekin sävyttimen korvaus epäonnistui');

// Hiilet: väri tummasta hehkuvaan, kukin murikka sykkii omassa tahdissaan.
const coalVS = /* glsl */`
attribute float aPhase;
attribute float aHeat;
varying float vPhase;
varying float vHeat;
varying vec3 vN;
#include <fog_pars_vertex>
void main() {
  vPhase = aPhase;
  vHeat = aHeat;
  vN = normalize(normalMatrix * normal);
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;
const coalFS = /* glsl */`
uniform float uTime;
uniform float uPower;
varying float vPhase;
varying float vHeat;
varying vec3 vN;
#include <fog_pars_fragment>
void main() {
  float p = 0.55 + 0.3 * sin(uTime * (1.3 + vPhase) + vPhase * 9.0) + 0.15 * sin(uTime * 3.7 + vPhase * 21.0);
  float heat = vHeat * p * uPower;
  vec3 dark = vec3(0.05, 0.035, 0.03) * (0.6 + 0.4 * vN.y);
  vec3 hot = mix(vec3(0.7, 0.08, 0.01), vec3(1.0, 0.45, 0.08), smoothstep(0.4, 1.0, heat));
  gl_FragColor = vec4(mix(dark, hot * 2.2, smoothstep(0.15, 0.7, heat)), 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}`;

// Pistehiukkaset (kipinät ja savu).
const ptsVS = /* glsl */`
attribute float aSize;
attribute float aAge;
varying float vAge;
#include <fog_pars_vertex>
void main() {
  vAge = aAge;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  gl_PointSize = aAge >= 1.0 ? 0.0 : aSize * 300.0 / max(-mvPosition.z, 0.3);
  #include <fog_vertex>
}`;
const emberFS = /* glsl */`
varying float vAge;
#include <fog_pars_fragment>
void main() {
  vec2 d = gl_PointCoord - 0.5;
  float a = smoothstep(0.5, 0.0, length(d));
  if (a < 0.01) discard;
  vec3 c = mix(vec3(1.0, 0.85, 0.45), vec3(1.0, 0.3, 0.04), smoothstep(0.0, 0.6, vAge));
  a *= 1.0 - smoothstep(0.55, 1.0, vAge);
  gl_FragColor = vec4(c * 3.0, a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}`;
const smokeFS = /* glsl */`
uniform vec3 uColor;
varying float vAge;
#include <fog_pars_fragment>
void main() {
  vec2 d = gl_PointCoord - 0.5;
  float a = smoothstep(0.5, 0.1, length(d));
  if (a < 0.01) discard;
  a *= smoothstep(0.0, 0.15, vAge) * (1.0 - smoothstep(0.5, 1.0, vAge)) * 0.22;
  gl_FragColor = vec4(uColor, a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}`;

class Particles {
  constructor(n, fs, blending, uniforms = {}) {
    this.n = n;
    this.p = new Float32Array(n * 3);
    this.v = new Float32Array(n * 3);
    this.life = new Float32Array(n);
    this.t = new Float32Array(n).fill(1e9);
    this.s0 = new Float32Array(n);
    this.s1 = new Float32Array(n);
    const g = new THREE.BufferGeometry();
    this.pos = new THREE.BufferAttribute(this.p, 3).setUsage(THREE.DynamicDrawUsage);
    this.size = new THREE.BufferAttribute(new Float32Array(n), 1).setUsage(THREE.DynamicDrawUsage);
    this.age = new THREE.BufferAttribute(new Float32Array(n).fill(1), 1).setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('position', this.pos);
    g.setAttribute('aSize', this.size);
    g.setAttribute('aAge', this.age);
    this.mat = new THREE.ShaderMaterial({
      vertexShader: ptsVS, fragmentShader: fs, uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, uniforms]),
      transparent: true, depthWrite: false, blending, fog: true,
    });
    this.points = new THREE.Points(g, this.mat);
    this.points.frustumCulled = false;
    this.next = 0;
  }

  spawn(x, y, z, vx, vy, vz, life, s0, s1) {
    const i = this.next;
    this.next = (i + 1) % this.n;
    this.p[i * 3] = x; this.p[i * 3 + 1] = y; this.p[i * 3 + 2] = z;
    this.v[i * 3] = vx; this.v[i * 3 + 1] = vy; this.v[i * 3 + 2] = vz;
    this.life[i] = life;
    this.t[i] = 0;
    this.s0[i] = s0;
    this.s1[i] = s1;
  }

  update(dt, time, swirl, drag, windX, windZ) {
    const P = this.p, V = this.v, A = this.age.array, S = this.size.array;
    for (let i = 0; i < this.n; i++) {
      if (this.t[i] > this.life[i]) { A[i] = 1; continue; }
      this.t[i] += dt;
      const k = this.t[i] / this.life[i];
      const j = i * 3;
      V[j] += (Math.sin(time * 3.1 + i * 1.7) * swirl + windX - V[j] * drag) * dt;
      V[j + 2] += (Math.cos(time * 2.7 + i * 2.3) * swirl + windZ - V[j + 2] * drag) * dt;
      V[j + 1] -= V[j + 1] * drag * 0.5 * dt;
      P[j] += V[j] * dt; P[j + 1] += V[j + 1] * dt; P[j + 2] += V[j + 2] * dt;
      A[i] = Math.min(1, k);
      S[i] = this.s0[i] + (this.s1[i] - this.s0[i]) * k;
    }
    this.pos.needsUpdate = true;
    this.age.needsUpdate = true;
    this.size.needsUpdate = true;
  }
}

function coalGeometry(size, seed) {
  let s = seed;
  const rnd = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  const geos = [];
  const n = 26;
  for (let i = 0; i < n; i++) {
    const r = Math.sqrt(rnd()) * 0.3 * size;
    const a = rnd() * Math.PI * 2;
    const g = new THREE.DodecahedronGeometry((0.03 + rnd() * 0.035) * size, 0);
    g.scale(1, 0.6 + rnd() * 0.4, 1 + rnd() * 0.5);
    g.rotateY(rnd() * 6);
    g.translate(Math.cos(a) * r, 0.02 * size, Math.sin(a) * r);
    const cnt = g.attributes.position.count;
    const heat = 0.35 + 0.65 * (1 - r / (0.3 * size)) * (0.6 + 0.4 * rnd());
    g.setAttribute('aPhase', new THREE.BufferAttribute(new Float32Array(cnt).fill(rnd() * 3), 1));
    g.setAttribute('aHeat', new THREE.BufferAttribute(new Float32Array(cnt).fill(heat), 1));
    geos.push(g);
  }
  // Yhdistä (dodekaedrit ovat valmiiksi indeksoimattomia).
  const total = geos.reduce((t, g) => t + g.attributes.position.count, 0);
  const out = new THREE.BufferGeometry();
  for (const [name, size2] of [['position', 3], ['normal', 3], ['aPhase', 1], ['aHeat', 1]]) {
    const arr = new Float32Array(total * size2);
    let o = 0;
    for (const g of geos) { arr.set(g.attributes[name].array, o); o += g.attributes[name].array.length; }
    out.setAttribute(name, new THREE.BufferAttribute(arr, size2));
  }
  return out;
}

let glowTex = null;
function groundGlowTexture() {
  if (glowTex) return glowTex;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,170,80,1)');
  grd.addColorStop(0.4, 'rgba(255,90,20,0.55)');
  grd.addColorStop(1, 'rgba(120,20,0,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  glowTex = new THREE.CanvasTexture(c);
  return glowTex;
}

let shellGeo = null;
const _wq = new THREE.Quaternion();
const _e = new THREE.Euler();

// Liekin kieli: soihdun neljä (tai kolme) sisäkkäistä kuorta, oma vaihe,
// jousella taipuva kärki ja sykkivä korkeus.
class Tongue {
  constructor(parent, { x, z, w, h, lean, seed, shells, speed, k, gain }) {
    if (!shellGeo) shellGeo = flameShellGeometry();
    this.uni = {
      uTime: { value: 0 }, uFlow: { value: seed * 3.7 }, uBend: { value: new THREE.Vector2() }, uStretch: { value: 1 },
      uPower: { value: 1 }, uWind: { value: new THREE.Vector2() }, uGain: { value: gain },
    };
    const fog = THREE.UniformsUtils.clone(THREE.UniformsLib.fog);
    this.group = new THREE.Group();
    this.group.position.set(x, 0, z);
    this.mats = [];
    FLAME_LAYERS.slice(4 - shells).forEach(([lw, lh, layer, s], i) => {
      const mat = new THREE.ShaderMaterial({
        uniforms: { ...fog, ...this.uni, uSeed: { value: seed * 13.7 + s }, uLayer: { value: layer } },
        vertexShader: flameVS, fragmentShader: flameFS, fog: true,
        transparent: true, depthWrite: false, side: THREE.FrontSide,
        blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
      });
      const m = new THREE.Mesh(shellGeo, mat);
      m.scale.set(lw, lh, lw);
      m.renderOrder = 3 + i; // uloin ensin, ydin päällimmäisenä
      m.frustumCulled = false;
      this.group.add(m);
      this.mats.push(mat);
    });
    this.w = w; this.h = h; this.lean = lean; this.speed = speed; this.k = k;
    this.bend = new THREE.Vector2(lean[0], lean[1]);
    this.bendV = new THREE.Vector2();
    this.flick = 1; this.flickT = 1; this.ph = seed * 2.17;
    parent.add(this.group);
  }

  // wx, wz = tuuli liekin omassa koordinaatistossa (m/s).
  update(dt, time, wx, wz, power) {
    const u = this.uni, ph = this.ph;
    const gust = Math.max(0.15, 1 + 0.35 * Math.sin(time * 1.37 + ph) + 0.25 * Math.sin(time * 3.1 + ph * 2) * Math.sin(time * 0.53 + ph)
      + 0.15 * Math.sin(time * 7.3 + ph * 3));
    const wl = Math.hypot(wx, wz);
    const wk = Math.min(1.5, wl * 0.4 * gust);
    if (wl > 1e-4) u.uWind.value.set(wx / wl * wk, wz / wl * wk);
    else u.uWind.value.set(0, 0);
    u.uFlow.value += dt * this.speed * (1 + wk * 1.1);
    // Kärjen taipuma: tuuli + kielen oma kallistus ulospäin (jousi).
    let tx = this.lean[0] + (wl > 1e-4 ? wx / wl * wk * 0.85 : 0);
    let tz = this.lean[1] + (wl > 1e-4 ? wz / wl * wk * 0.85 : 0);
    const tl = Math.hypot(tx, tz);
    if (tl > 1.5) { tx *= 1.5 / tl; tz *= 1.5 / tl; }
    const c = 8;
    this.bendV.x += ((tx - this.bend.x) * this.k - this.bendV.x * c) * dt;
    this.bendV.y += ((tz - this.bend.y) * this.k - this.bendV.y * c) * dt;
    this.bend.x += this.bendV.x * dt;
    this.bend.y += this.bendV.y * dt;
    u.uBend.value.set(this.bend.x, this.bend.y);
    // Korkeus sykkii satunnaisesti (liekki nuolaisee välillä korkealle).
    if (Math.random() < dt * 2.2) this.flickT = 0.82 + Math.random() * 0.36;
    this.flick += (this.flickT - this.flick) * Math.min(1, dt * 6);
    const bl = Math.hypot(this.bend.x, this.bend.y);
    u.uStretch.value = this.flick - Math.min(0.2, bl * 0.1);
    u.uTime.value = time;
    u.uPower.value = 0.5 + 0.5 * power;
    const s = this.h * (0.65 + 0.35 * power);
    this.group.scale.set(this.w * (0.85 + 0.15 * power), s, this.w * (0.85 + 0.15 * power));
  }

  dispose() { for (const m of this.mats) m.dispose(); }
}

export class CampfireFx {
  // size: liekin koko (1 = nuotio, n. 1,2 m korkea liekki); opts: smoke,
  // embers, coals (hiillos ja maan hehku).
  constructor(size = 1, { smoke = true, embers = true, coals = true, seed = 1 } = {}) {
    this.size = size;
    this.group = new THREE.Group();
    this.uniforms = { uTime: { value: 0 }, uPower: { value: 1 } };
    // Pääliekki ja pienemmät kielet sen ympärillä (pienessä tulessa kaksi).
    let rs = Math.floor(seed * 1000) % 2147483646 + 1;
    const rnd = () => { rs = (rs * 16807) % 2147483647; return (rs - 1) / 2147483646; };
    this.flames = [new Tongue(this.group, { x: 0, z: 0, w: 0.95 * size, h: 1.45 * size, lean: [0, 0], seed: seed + 0.3, shells: 4, speed: 1.05, k: 36, gain: 1.8 })];
    const n = size >= 0.6 ? 5 : 2;
    const a0 = rnd() * Math.PI * 2;
    for (let i = 0; i < n; i++) {
      const a = a0 + (i / n) * Math.PI * 2 + (rnd() - 0.5) * 0.6;
      const r = (0.12 + rnd() * 0.08) * size;
      const lean = 0.14 + rnd() * 0.14;
      this.flames.push(new Tongue(this.group, {
        x: Math.cos(a) * r, z: Math.sin(a) * r,
        w: (0.5 + rnd() * 0.16) * size, h: (0.72 + rnd() * 0.3) * size,
        lean: [Math.cos(a) * lean, Math.sin(a) * lean], seed: seed + 1.7 + i * 2.3,
        shells: 3, speed: 1.15 + rnd() * 0.3, k: 42 + rnd() * 20, gain: 1.6,
      }));
    }
    if (coals) {
      this.coals = new THREE.Mesh(coalGeometry(size, Math.floor(seed * 1000) + 7), new THREE.ShaderMaterial({
        vertexShader: coalVS, fragmentShader: coalFS,
        uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uTime: { value: 0 }, uPower: { value: 1 } }]), fog: true,
      }));
      this.group.add(this.coals);
      this.glow = new THREE.Mesh(
        new THREE.PlaneGeometry(1.5 * size, 1.5 * size).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ map: groundGlowTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.9 }),
      );
      this.glow.position.y = 0.03;
      this.glow.renderOrder = 2;
      this.group.add(this.glow);
    }
    if (embers) {
      this.embers = new Particles(Math.ceil(60 * size), emberFS, THREE.AdditiveBlending);
      this.group.add(this.embers.points);
    }
    if (smoke) {
      this.smoke = new Particles(40, smokeFS, THREE.NormalBlending, { uColor: { value: new THREE.Color(0x3a3532) } });
      this.group.add(this.smoke.points);
    }
    this._acc = { e: 0, s: 0 };
    this.power = 1;
  }

  // Pistehiukkaset ovat ryhmän koordinaateissa (ryhmä ei saa kiertyä).
  update(dt, time, camera, windX = 0, windZ = 0) {
    const S = this.size, pw = this.power;
    // Emon kierto (tuulen suunta liekin koordinaatistoon).
    _e.setFromQuaternion(this.group.getWorldQuaternion(_wq), 'YXZ');
    // Tuuli nuotion omaan koordinaatistoon (rakennettu nuotio voi olla käännetty).
    const cy = Math.cos(_e.y), sy = Math.sin(_e.y);
    const lx = windX * cy - windZ * sy, lz = windX * sy + windZ * cy;
    for (let i = 0; i < this.flames.length; i++) this.flames[i].update(dt, time, lx, lz, i === 0 ? pw : pw * 0.92);
    if (this.coals) {
      this.coals.material.uniforms.uTime.value = time;
      this.coals.material.uniforms.uPower.value = 0.6 + 0.4 * pw;
      this.glow.material.opacity = 0.7 + 0.2 * Math.sin(time * 5.3) * Math.sin(time * 2.1);
    }
    const a = this._acc;
    if (this.embers) {
      a.e += dt * 9 * S * pw;
      for (; a.e >= 1; a.e--) {
        const r = Math.random() * 0.2 * S, ang = Math.random() * Math.PI * 2;
        this.embers.spawn(Math.cos(ang) * r, 0.25 * S, Math.sin(ang) * r,
          (Math.random() - 0.5) * 0.6, (1.2 + Math.random() * 1.6) * Math.sqrt(S), (Math.random() - 0.5) * 0.6,
          0.9 + Math.random() * 1.6, 0.03 * S, 0.012 * S);
      }
      this.embers.update(dt, time, 1.4, 0.6, windX * 0.6, windZ * 0.6);
    }
    if (this.smoke) {
      a.s += dt * 3.5 * pw;
      for (; a.s >= 1; a.s--) {
        this.smoke.spawn((Math.random() - 0.5) * 0.2 * S, 1.0 * S, (Math.random() - 0.5) * 0.2 * S,
          (Math.random() - 0.5) * 0.15, 0.45 + Math.random() * 0.3, (Math.random() - 0.5) * 0.15,
          4 + Math.random() * 3, 0.35 * S, 1.6 * S);
      }
      this.smoke.update(dt, time, 0.08, 0.15, windX * 0.5, windZ * 0.5);
    }
  }

  // Savu on yöllä tummaa, päivällä harmaata (ambient = ympäristövalon väri).
  setAmbient(ambient) {
    if (this.smoke && ambient) this.smoke.mat.uniforms.uColor.value.setRGB(0.42, 0.39, 0.36).multiplyScalar(0.3 + Math.min(1, ambient.r * 2.2) * 0.7);
  }

  dispose() {
    for (const t of this.flames) t.dispose();
    if (this.coals) { this.coals.geometry.dispose(); this.coals.material.dispose(); this.glow.material.dispose(); this.glow.geometry.dispose(); }
    for (const p of [this.embers, this.smoke]) if (p) { p.points.geometry.dispose(); p.mat.dispose(); }
  }
}
