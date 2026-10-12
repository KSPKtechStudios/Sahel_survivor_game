// Sessio 48: sademetsän hyönteiset (käyttäjä: "niitä sademetsissä piisaa").
// - Mäkäräparvet: pieniä tummia pisteitä tiheinä parvina 0,8–2,4 m:n
//   korkeudella; parvi pörrää nopeasti paikallaan. Auringonvalossa (valokeilat)
//   ne erottuvat vaaleina. Parvet siirtyvät pelaajan mukana.
// - Perhoset: pieniä 3D-malleja (kaksi siipeä, lepattavat), mutkitteleva
//   lento 0,5–3,5 m:n korkeudella; päivällä. Lajeina sininen morfo, oranssi,
//   keltainen ja mustavalkoinen.
// Molemmat näkyvät vain sademetsässä (env.humid). Yksi piirtokutsu kummallekin.
import * as THREE from 'three';
import { waterAt } from '../world/terrain.js';

const SWARMS = 9;
const PER_SWARM = 34;
const SWARM_R = 26;      // parvet tämän säteen sisällä pelaajasta
const BUTTERFLIES = 9;
const BF_R = 18;

const gnatVS = /* glsl */ `
attribute vec3 aCenter;
attribute vec4 aSeed;
uniform float uTime;
uniform float uAmount;
uniform float uSize;
varying float vAlpha;
void main() {
  // Nopea, siksakkaava pörräys parven keskipisteen ympärillä.
  float t = uTime * (2.2 + aSeed.w * 2.5);
  vec3 off = vec3(
    sin(t + aSeed.x * 40.0) * 0.35 + sin(t * 2.7 + aSeed.y * 13.0) * 0.12,
    sin(t * 1.4 + aSeed.z * 30.0) * 0.22 + sin(t * 3.3 + aSeed.x * 9.0) * 0.06,
    cos(t * 0.9 + aSeed.z * 25.0) * 0.35 + cos(t * 2.3 + aSeed.w * 17.0) * 0.12);
  off *= 0.6 + aSeed.y * 0.8;
  vec4 mv = modelViewMatrix * vec4(aCenter + off, 1.0);
  gl_Position = projectionMatrix * mv;
  float dist = -mv.z;
  gl_PointSize = uSize * 300.0 / max(dist, 0.3);
  vAlpha = uAmount * smoothstep(0.25, 1.0, dist) * (1.0 - smoothstep(18.0, 26.0, dist));
}
`;

const gnatFS = /* glsl */ `
uniform sampler2D uMap;
uniform vec3 uColor;
varying float vAlpha;
void main() {
  float a = texture2D(uMap, gl_PointCoord).a * vAlpha;
  if (a < 0.01) discard;
  gl_FragColor = vec4(uColor, a);
  #include <colorspace_fragment>
}
`;

// Perhosen siivet: kaksi nelikulmiota, runko z-akselilla (eteen +z).
function wingGeometry() {
  const P = [], UV = [];
  const quad = (side) => {
    // Etusiipi isompi (etureuna), takasiipi pyöreämpi: yksi nelikulmio,
    // muoto tehdään alfalla (fragmentshader).
    const x0 = 0, x1 = side * 0.055;
    const z0 = -0.03, z1 = 0.035;
    const v = [[x0, z0, 0, 0], [x1, z0, 1, 0], [x1, z1, 1, 1], [x0, z0, 0, 0], [x1, z1, 1, 1], [x0, z1, 0, 1]];
    for (const [x, z, u, w] of v) { P.push(x, 0, z); UV.push(u, w); }
  };
  quad(1);
  quad(-1);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2));
  g.computeVertexNormals();
  return g;
}

const BF_COLORS = [0x2f7fe0, 0xe07a1e, 0xe8c838, 0xeeeee6, 0x2f7fe0, 0xd85a20];

export class Insects {
  constructor(scene, map) {
    this.scene = scene;
    // --- Mäkärät
    const n = SWARMS * PER_SWARM;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    this.centers = new Float32Array(n * 3);
    g.setAttribute('aCenter', new THREE.BufferAttribute(this.centers, 3));
    const seed = new Float32Array(n * 4);
    for (let i = 0; i < seed.length; i++) seed[i] = Math.random();
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 4));
    this.gnatU = {
      uTime: { value: 0 }, uAmount: { value: 0 }, uSize: { value: 0.022 },
      uMap: { value: map }, uColor: { value: new THREE.Color(0.08, 0.07, 0.05) },
    };
    this.gnats = new THREE.Points(g, new THREE.ShaderMaterial({
      uniforms: this.gnatU, vertexShader: gnatVS, fragmentShader: gnatFS, transparent: true, depthWrite: false,
    }));
    this.gnats.frustumCulled = false;
    this.gnats.visible = false;
    this.gnats.renderOrder = 3;
    scene.add(this.gnats);
    this.swarms = [];
    for (let i = 0; i < SWARMS; i++) this.swarms.push({ x: 0, y: -1000, z: 0, placed: false });

    // --- Perhoset
    this.bfTime = { value: 0 };
    const mat = new THREE.MeshLambertMaterial({ side: THREE.DoubleSide });
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uTime = this.bfTime;
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', `#include <common>
uniform float uTime;
varying vec2 vWingUv;`)
        .replace('#include <begin_vertex>', `#include <begin_vertex>
  vWingUv = uv;
  {
    // Siipien lepatus: kierto rungon (z) ympäri, eri tahdissa yksilöittäin.
    float ph = float(gl_InstanceID) * 2.17;
    float flap = 0.15 + 1.05 * (0.5 + 0.5 * sin(uTime * 13.0 + ph));
    float sd = sign(transformed.x);
    float r = abs(transformed.x);
    transformed.x = sd * r * cos(flap);
    transformed.y = r * sin(flap);
  }`);
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', `#include <common>
varying vec2 vWingUv;`)
        .replace('#include <alphatest_fragment>', `{
    // Siiven muoto: etusiipi (ylä) ja takasiipi (ala), tumma reunus.
    vec2 w = vWingUv;
    float fore = length((w - vec2(0.0, 0.62)) * vec2(1.0, 1.25));
    float hind = length((w - vec2(0.0, 0.25)) * vec2(1.35, 1.5));
    float inside = min(fore, hind);
    if (inside > 0.95) discard;
    diffuseColor.rgb *= mix(1.0, 0.12, smoothstep(0.72, 0.9, inside));
    diffuseColor.rgb *= 0.85 + 0.3 * w.x;
  }`);
    };
    this.bfMesh = new THREE.InstancedMesh(wingGeometry(), mat, BUTTERFLIES);
    this.bfMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.bfMesh.frustumCulled = false;
    this.bfMesh.visible = false;
    const c = new THREE.Color();
    for (let i = 0; i < BUTTERFLIES; i++) this.bfMesh.setColorAt(i, c.set(BF_COLORS[i % BF_COLORS.length]));
    scene.add(this.bfMesh);
    this.bfs = [];
    for (let i = 0; i < BUTTERFLIES; i++) {
      this.bfs.push({ pos: new THREE.Vector3(0, -1000, 0), yaw: Math.random() * 6.28, vy: 0, turn: 0, t: Math.random() * 10, placed: false, hgt: 1.5 });
    }
    this._m = new THREE.Matrix4();
    this._q = new THREE.Quaternion();
    this._e = new THREE.Euler();
    this._s = new THREE.Vector3(1, 1, 1);
    this._wq = {};
  }

  _groundY(x, z) {
    const w = waterAt(x, z, this._wq);
    return Math.max(w.h, w.wl);
  }

  _placeSwarm(sw, i, cam) {
    const a = Math.random() * Math.PI * 2;
    const r = 4 + Math.random() * (SWARM_R - 6);
    sw.x = cam.x + Math.cos(a) * r;
    sw.z = cam.z + Math.sin(a) * r;
    sw.y = this._groundY(sw.x, sw.z) + 0.8 + Math.random() * 1.6;
    sw.placed = true;
    const c = this.centers;
    for (let k = 0; k < PER_SWARM; k++) {
      const o = (i * PER_SWARM + k) * 3;
      c[o] = sw.x; c[o + 1] = sw.y; c[o + 2] = sw.z;
    }
    this.gnats.geometry.attributes.aCenter.needsUpdate = true;
  }

  _placeButterfly(b, cam) {
    const a = Math.random() * Math.PI * 2;
    const r = 5 + Math.random() * (BF_R - 6);
    b.pos.set(cam.x + Math.cos(a) * r, 0, cam.z + Math.sin(a) * r);
    b.hgt = 0.6 + Math.random() * 2.6;
    b.pos.y = this._groundY(b.pos.x, b.pos.z) + b.hgt;
    b.placed = true;
  }

  update(dt, elapsed, camPos, env, rain = 0) {
    const humid = env.humid || 0;
    // Mäkärät: päivällä ja hämärässä, sateella vähemmän.
    const gAmt = Math.max(0, (humid - 0.25) / 0.75) * (0.35 + 0.65 * Math.min(1, env.daylight * 3)) * (1 - 0.7 * rain);
    this.gnatU.uAmount.value = gAmt;
    this.gnats.visible = gAmt > 0.01;
    if (this.gnats.visible) {
      this.gnatU.uTime.value = elapsed % 10000;
      // Valossa (aurinko) vaaleammat: siivet ja ruumis heijastavat.
      this.gnatU.uColor.value.setRGB(0.08, 0.07, 0.05).lerp(env.sun.color, 0.12 * env.daylight);
      this.swarms.forEach((sw, i) => {
        const d2 = (sw.x - camPos.x) ** 2 + (sw.z - camPos.z) ** 2;
        if (!sw.placed || d2 > SWARM_R * SWARM_R) this._placeSwarm(sw, i, camPos);
      });
    }
    // Perhoset: vain päivällä, ei sateella.
    const bAmt = Math.max(0, (humid - 0.3) / 0.7) * Math.min(1, env.daylight * 2) * (1 - rain);
    this.bfMesh.visible = bAmt > 0.05;
    if (!this.bfMesh.visible) return;
    this.bfTime.value = elapsed % 1000;
    const show = Math.round(bAmt * BUTTERFLIES);
    for (let i = 0; i < BUTTERFLIES; i++) {
      const b = this.bfs[i];
      if (i >= show) {
        this._m.makeScale(0, 0, 0);
        this.bfMesh.setMatrixAt(i, this._m);
        b.placed = false;
        continue;
      }
      const d2 = (b.pos.x - camPos.x) ** 2 + (b.pos.z - camPos.z) ** 2;
      if (!b.placed || d2 > BF_R * BF_R) this._placeButterfly(b, camPos);
      // Mutkitteleva lento: suunta vaihtelee, korkeus aaltoilee.
      b.t += dt;
      b.turn += (Math.sin(b.t * 0.7 + i * 3.1) * 1.8 - b.turn) * Math.min(1, dt * 2);
      b.yaw += b.turn * dt;
      const sp = 1.1 + 0.4 * Math.sin(b.t * 1.3 + i);
      b.pos.x += Math.sin(b.yaw) * sp * dt;
      b.pos.z += Math.cos(b.yaw) * sp * dt;
      const gy = this._groundY(b.pos.x, b.pos.z);
      const want = gy + b.hgt + Math.sin(b.t * 2.1 + i) * 0.35;
      b.pos.y += (want - b.pos.y) * Math.min(1, dt * 1.5) + Math.sin(b.t * 13 + i) * 0.004;
      // Lepatuksen tahdissa pieni pystyheilahdus.
      this._e.set(Math.sin(b.t * 2.3 + i) * 0.25, b.yaw, Math.sin(b.t * 1.7) * 0.2);
      this._q.setFromEuler(this._e);
      const sc = i % 3 === 0 ? 1.35 : 1; // morfot isompia
      this._s.set(sc, sc, sc);
      this._m.compose(b.pos, this._q, this._s);
      this.bfMesh.setMatrixAt(i, this._m);
    }
    this.bfMesh.instanceMatrix.needsUpdate = true;
  }

  clear() {
    for (const sw of this.swarms) sw.placed = false;
    for (const b of this.bfs) b.placed = false;
  }
}
