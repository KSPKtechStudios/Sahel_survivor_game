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
// Valot hoitaa kutsuja (game/structures.js, ui/menuCamp.js).
import * as THREE from 'three';

const NOISE = /* glsl */`
float fh(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float fn(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(fh(i), fh(i + vec2(1.0, 0.0)), u.x), mix(fh(i + vec2(0.0, 1.0)), fh(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * fn(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; }
  return v;
}`;

const flameVS = /* glsl */`
varying vec2 vUv;
#include <fog_pars_vertex>
void main() {
  vUv = uv;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;

const flameFS = /* glsl */`
uniform float uTime;
uniform float uSeed;
uniform float uPower;
uniform float uLean;
varying vec2 vUv;
#include <fog_pars_fragment>
${NOISE}
void main() {
  float y = vUv.y;
  float x = vUv.x * 2.0 - 1.0;
  float t = uTime + uSeed * 17.0;
  // Tuuli kallistaa kärkeä.
  x -= uLean * y * y;
  vec2 q = vec2(x * 1.7, y * 2.4 - t * 1.9);
  float w = fbm(q * 1.2 + vec2(t * 0.35, -t * 0.2));
  float n = fbm(q + vec2(w * 1.1, 0.0));
  // Muoto: leveä tyvi, kapeneva kärki, reunat ja kärki repeilevät kohinassa.
  float width = mix(0.9, 0.06, pow(y, 0.85));
  float dx = abs(x + (n - 0.5) * 0.45 * y);
  float body = 1.0 - smoothstep(width * 0.45, width, dx);
  float top = 1.0 - smoothstep(0.25, 0.95, y + (n - 0.5) * 0.7);
  float f = body * top * (0.45 + 1.0 * n);
  f *= smoothstep(0.0, 0.07, y);
  f = clamp(f * 1.55 - 0.3, 0.0, 1.0);
  // Väri voimakkuuden mukaan: tummanpunainen reuna -> oranssi -> keltainen -> valkoinen ydin.
  vec3 c = mix(vec3(0.45, 0.05, 0.01), vec3(1.0, 0.36, 0.05), smoothstep(0.05, 0.45, f));
  c = mix(c, vec3(1.0, 0.72, 0.28), smoothstep(0.45, 0.8, f));
  c = mix(c, vec3(1.0, 0.95, 0.78), smoothstep(0.8, 1.0, f));
  // Tyvessä hento sininen palamisvyöhyke.
  c = mix(c, vec3(0.35, 0.45, 1.0), (1.0 - smoothstep(0.0, 0.1, y)) * 0.35 * f);
  gl_FragColor = vec4(c * 2.4 * uPower, f);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}`;

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

const OFFSETS = [0, 1.05, 2.1];
// Kielet: [sivusiirto, leveys, korkeus] (osuus pääliekistä).
const TONGUES = [[0, 1, 1], [-0.17, 0.62, 0.72], [0.19, 0.58, 0.66]];
const _w = new THREE.Vector3();
const _wq = new THREE.Quaternion();
const _e = new THREE.Euler();

export class CampfireFx {
  // size: liekin koko (1 = nuotio, n. 1,2 m korkea liekki); opts: smoke,
  // embers, coals (hiillos ja maan hehku).
  constructor(size = 1, { smoke = true, embers = true, coals = true, seed = 1 } = {}) {
    this.size = size;
    this.group = new THREE.Group();
    this.uniforms = { uTime: { value: 0 }, uPower: { value: 1 } };
    this.flames = [];
    // Pääliekki ja kaksi pienempää sivukieltä (kameran suunnassa sivuttain).
    const geos = TONGUES.map(([dx, w, h]) => new THREE.PlaneGeometry(0.95 * size * w, 1.35 * size * h, 1, 1).translate(dx * size, 0.62 * size * h, 0));
    for (let i = 0; i < OFFSETS.length; i++) {
      const geo = geos[i];
      const mat = new THREE.ShaderMaterial({
        vertexShader: flameVS, fragmentShader: flameFS,
        uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uTime: { value: 0 }, uSeed: { value: seed * 3.1 + i * 1.37 }, uPower: { value: 1 }, uLean: { value: 0 } }]),
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: true,
      });
      const m = new THREE.Mesh(geo, mat);
      m.renderOrder = 3;
      m.frustumCulled = false;
      this.group.add(m);
      this.flames.push(m);
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
    this.group.getWorldPosition(_w);
    // Kameraan päin maailmassa (emon kierto vähennetään).
    _e.setFromQuaternion(this.group.getWorldQuaternion(_wq), 'YXZ');
    const yaw = Math.atan2(camera.position.x - _w.x, camera.position.z - _w.z);
    const lean = Math.max(-0.5, Math.min(0.5, (windX * Math.cos(yaw) - windZ * Math.sin(yaw)) * 0.12));
    for (let i = 0; i < this.flames.length; i++) {
      const m = this.flames[i];
      m.rotation.y = yaw - _e.y + OFFSETS[i] * 0.12;
      const u = m.material.uniforms;
      u.uTime.value = time;
      u.uPower.value = pw * (i === 0 ? 1 : 0.85);
      u.uLean.value = lean;
      m.scale.set(1, 0.85 + 0.15 * Math.sin(time * 2.3 + i * 2.1) + 0.1 * pw, 1);
    }
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
    for (const m of this.flames) m.material.dispose();
    for (const m of this.flames) m.geometry.dispose();
    if (this.coals) { this.coals.geometry.dispose(); this.coals.material.dispose(); this.glow.material.dispose(); this.glow.geometry.dispose(); }
    for (const p of [this.embers, this.smoke]) if (p) { p.points.geometry.dispose(); p.mat.dispose(); }
  }
}
