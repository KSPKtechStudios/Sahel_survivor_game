// Sessio 57: vesiputoukset. Maasto, lähdepuro, allas ja laskupuro tulevat
// maastosta (terrain.js: fallsNear); tämä piirtää putoavan vesiverhon,
// vaahdon altaassa ja vesisumun sekä kertoo äänelle lähimmän putouksen.
import * as THREE from 'three';
import { fallsNear, heightAt } from '../world/terrain.js';
import { createSoftDotTexture } from './textures.js';

const NEAR = 320;        // m: putoukset rakennetaan tätä lähempänä
const FAR = 380;         // m: ja puretaan tätä kauempana
const MIST_NEAR = 140;   // m: sumu ja roiskeet vain lähellä
const MIST_N = 48;       // sumuhiukkasia / putous
const G = 9.8;
const _c = new THREE.Color();

// Pystysuuntaiset vesijuovat (saumaton kumpaankin suuntaan).
function streakTexture() {
  const W = 128, H = 256;
  const data = new Uint8Array(W * H * 4);
  const waves = [];
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let k = 0; k < 26; k++) {
    waves.push({ fx: 1 + Math.floor(rnd() * 30), fy: Math.floor(rnd() * 4), ph: rnd() * 6.283, a: 0.4 + rnd() });
  }
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let v = 0, s = 0;
      for (const w of waves) {
        v += w.a * Math.sin(6.2832 * (w.fx * x / W + w.fy * y / H) + w.ph);
        s += w.a;
      }
      v = 0.5 + 0.5 * v / Math.sqrt(s * 2.2);
      const c = Math.max(0, Math.min(255, Math.round(v * 255)));
      const o = (y * W + x) * 4;
      data[o] = data[o + 1] = data[o + 2] = c;
      data[o + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, W, H);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.needsUpdate = true;
  return tex;
}

const sheetVs = /* glsl */ `
attribute float aAlpha;
attribute float aFoam;
varying vec2 vUv;
varying float vAlpha;
varying float vFoam;
#include <fog_pars_vertex>
void main() {
  vUv = uv;
  vAlpha = aAlpha;
  vFoam = aFoam;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
`;

const sheetFs = /* glsl */ `
uniform sampler2D uMap;
uniform vec3 uColor;
uniform float uTime;
uniform float uSpeed;
uniform float uLayer;
varying vec2 vUv;
varying float vAlpha;
varying float vFoam;
#include <fog_pars_fragment>
void main() {
  float t = uTime * uSpeed;
  float n1 = texture2D(uMap, vec2(vUv.x * 1.3 + uLayer * 0.37, vUv.y * 0.55 - t)).r;
  float n2 = texture2D(uMap, vec2(vUv.x * 2.4 + 0.21, vUv.y * 1.2 - t * 1.6)).r;
  float n3 = texture2D(uMap, vec2(vUv.x * 4.1 - 0.4, vUv.y * 2.3 - t * 2.4)).r;
  float n = n1 * 0.5 + n2 * 0.32 + n3 * 0.18;
  // Ilmastunut vaahto lisääntyy alaspäin.
  float foam = smoothstep(0.52 - vFoam * 0.3, 0.8 - vFoam * 0.25, n);
  vec3 water = uColor * vec3(0.5, 0.58, 0.6);
  vec3 col = mix(water, uColor, foam);
  float a = vAlpha * mix(0.28 + vFoam * 0.3, 0.95, foam);
  if (a < 0.01) discard;
  gl_FragColor = vec4(col, a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}
`;

const foamFs = /* glsl */ `
uniform sampler2D uMap;
uniform vec3 uColor;
uniform float uTime;
varying vec2 vUv;
varying float vAlpha;
#include <fog_pars_fragment>
void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float r = length(p);
  float ang = atan(p.y, p.x) / 6.2832;
  float n1 = texture2D(uMap, vec2(ang * 3.0, r * 0.9 - uTime * 0.22)).r;
  float n2 = texture2D(uMap, vec2(ang * 5.0 + 0.3, r * 1.7 - uTime * 0.37)).r;
  float n = n1 * 0.6 + n2 * 0.4;
  float edge = 1.0 - smoothstep(0.25, 1.0, r);
  float foam = smoothstep(0.62 - edge * 0.35, 0.85, n) * edge;
  float a = foam * vAlpha;
  if (a < 0.01) discard;
  gl_FragColor = vec4(uColor, a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}
`;

const mistVs = /* glsl */ `
attribute float aSize;
attribute float aAlpha;
varying float vAlpha;
#include <fog_pars_vertex>
void main() {
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  gl_PointSize = aSize * 320.0 / max(-mvPosition.z, 0.3);
  vAlpha = aAlpha;
  #include <fog_vertex>
}
`;

const mistFs = /* glsl */ `
uniform sampler2D uMap;
uniform vec3 uColor;
varying float vAlpha;
#include <fog_pars_fragment>
void main() {
  float a = texture2D(uMap, gl_PointCoord).a * vAlpha;
  if (a < 0.005) discard;
  gl_FragColor = vec4(uColor, a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}
`;

function shaderMat(uniforms, vs, fs, extra = {}) {
  return new THREE.ShaderMaterial({
    uniforms: { ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog), ...uniforms },
    vertexShader: vs,
    fragmentShader: fs,
    transparent: true,
    depthWrite: false,
    fog: true,
    side: THREE.DoubleSide,
    ...extra,
  });
}

// Vesiverhon keskilinja: reunan yli kaarena (vaakanopeus v0) ja seinämää
// pitkin, jos kallio on loivempi kuin putoamiskaari. Palauttaa pisteet
// { s (matka reunasta), y, t (lentoaika) }.
function sheetPath(F, v0) {
  const pts = [];
  const top = F.lipWl + 0.05;
  // Puron loppu reunalle (vesi kiihtyy ja kaartuu reunan yli).
  for (let s = -1.6; s < 0; s += 0.4) {
    pts.push({ s, y: top - 0.08 * (1 + s / 1.6) });
  }
  const y0 = top - 0.1;
  for (let k = 1; k < 90; k++) {
    const t = k * 0.035 * (1 + k * 0.02);
    const s = v0 * t;
    let y = y0 - 0.5 * G * t * t;
    const hx = F.lipX + F.dx * s, hz = F.lipZ + F.dz * s;
    y = Math.max(y, heightAt(hx, hz) + 0.12);
    if (y <= F.poolWl - 0.08) {
      pts.push({ s, y: F.poolWl - 0.08 });
      break;
    }
    pts.push({ s, y });
  }
  // Lentoaika pitkin kaarta: juovat venyvät nopeuden mukana.
  let tAcc = 0;
  for (let i = 0; i < pts.length; i++) {
    if (i) {
      const a = pts[i - 1], b = pts[i];
      const len = Math.hypot(b.s - a.s, b.y - a.y);
      const speed = Math.sqrt(v0 * v0 + 2 * G * Math.max(0, y0 - (a.y + b.y) / 2)) + 0.6;
      tAcc += len / speed;
    }
    pts[i].t = tAcc;
  }
  return pts;
}

function buildSheet(F, path, layer) {
  const cols = 9;
  const rows = path.length;
  const pos = new Float32Array(rows * cols * 3);
  const uv = new Float32Array(rows * cols * 2);
  const alpha = new Float32Array(rows * cols);
  const foam = new Float32Array(rows * cols);
  const w0 = F.width * 0.92;
  const sEnd = path[rows - 1].s;
  const back = layer ? 0.18 : 0;   // takakerros hieman seinämää kohti
  const yEnd = path[rows - 1].y;
  const yTop = path[0].y;
  for (let r = 0; r < rows; r++) {
    const p = path[r];
    const fall = Math.max(0, Math.min(1, (yTop - p.y) / Math.max(1, yTop - yEnd)));
    const wid = w0 * (1 + 0.38 * fall) * (layer ? 0.9 : 1);
    for (let c = 0; c < cols; c++) {
      const u = c / (cols - 1);
      const off = (u - 0.5) * wid;
      // Reunat kaartuvat hieman taaksepäin (vesi ei ole tasainen levy).
      const bow = (u - 0.5) * (u - 0.5) * 0.5 * fall;
      const s = p.s - back - bow;
      const x = F.lipX + F.dx * s + F.tx * off;
      const z = F.lipZ + F.dz * s + F.tz * off;
      let y = p.y - back * 0.5;
      if (p.s > 0.2) y = Math.max(y, heightAt(x, z) + 0.1);
      const i = r * cols + c;
      pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
      uv[i * 2] = u * F.width * 0.45;
      uv[i * 2 + 1] = p.t * 2.2;
      const eu = Math.min(1, Math.min(u, 1 - u) / 0.2);
      const head = Math.min(1, (p.s + 1.6) / 0.8);
      const tail = rows > 2 && sEnd > 0 ? 1 - Math.max(0, Math.min(1, (r - (rows - 3)) / 2)) * 0.6 : 1;
      alpha[i] = eu * eu * (3 - 2 * eu) * head * tail * (layer ? 0.75 : 1);
      foam[i] = fall;
    }
  }
  const idx = [];
  for (let r = 0; r < rows - 1; r++) {
    for (let c = 0; c < cols - 1; c++) {
      const a = r * cols + c, b = a + 1, d = a + cols, e = d + 1;
      idx.push(a, d, b, b, d, e);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setAttribute('aAlpha', new THREE.BufferAttribute(alpha, 1));
  g.setAttribute('aFoam', new THREE.BufferAttribute(foam, 1));
  g.setIndex(idx);
  g.computeBoundingSphere();
  return g;
}

export class Waterfalls {
  constructor(scene, splashes = null, ripples = null) {
    this.scene = scene;
    this.splashes = splashes;
    this.ripples = ripples;
    this.items = new Map();
    this.scanT = 0;
    this.time = 0;
    this.sound = { level: 0, pan: 0 };
    const map = streakTexture();
    this.color = new THREE.Color(1, 1, 1);
    this.sheetMats = [0, 1].map((layer) => shaderMat({
      uMap: { value: map }, uColor: { value: this.color }, uTime: { value: 0 },
      uSpeed: { value: layer ? 0.75 : 1.0 }, uLayer: { value: layer },
    }, sheetVs, sheetFs));
    this.foamMat = shaderMat({ uMap: { value: map }, uColor: { value: this.color }, uTime: { value: 0 } }, sheetVs, foamFs);
    this.mistMat = shaderMat({ uMap: { value: createSoftDotTexture(32) }, uColor: { value: this.color } }, mistVs, mistFs);
  }

  _build(F) {
    const group = new THREE.Group();
    const v0 = 1.5 + (F.width - 2.7) * 0.4;
    const path = sheetPath(F, v0);
    for (const layer of [1, 0]) {
      const m = new THREE.Mesh(buildSheet(F, path, layer), this.sheetMats[layer]);
      m.renderOrder = 4 + (1 - layer);
      m.frustumCulled = true;
      group.add(m);
    }
    // Vaahto altaassa putoamiskohdan ympärillä.
    const end = path[path.length - 1];
    const ix = F.lipX + F.dx * end.s, iz = F.lipZ + F.dz * end.s;
    const fr = Math.min(F.poolR * 0.95, F.width * 1.5 + 1);
    const fg = new THREE.PlaneGeometry(fr * 2, fr * 2, 1, 1);
    fg.rotateX(-Math.PI / 2);
    fg.setAttribute('aAlpha', new THREE.BufferAttribute(new Float32Array([0.9, 0.9, 0.9, 0.9]), 1));
    fg.setAttribute('aFoam', new THREE.BufferAttribute(new Float32Array(4), 1));
    const foam = new THREE.Mesh(fg, this.foamMat);
    foam.position.set(ix + F.dx * fr * 0.35, F.poolWl + 0.03, iz + F.dz * fr * 0.35);
    foam.renderOrder = 4;
    group.add(foam);
    // Sumu: hiukkaset nousevat putoamiskohdasta ja ajelehtivat alavirtaan.
    const mg = new THREE.BufferGeometry();
    const mp = new Float32Array(MIST_N * 3);
    const ms = new Float32Array(MIST_N);
    const ma = new Float32Array(MIST_N);
    mg.setAttribute('position', new THREE.BufferAttribute(mp, 3).setUsage(THREE.DynamicDrawUsage));
    mg.setAttribute('aSize', new THREE.BufferAttribute(ms, 1).setUsage(THREE.DynamicDrawUsage));
    mg.setAttribute('aAlpha', new THREE.BufferAttribute(ma, 1).setUsage(THREE.DynamicDrawUsage));
    const mist = new THREE.Points(mg, this.mistMat);
    mist.frustumCulled = false;
    mist.renderOrder = 5;
    group.add(mist);
    this.scene.add(group);
    const P = {
      F, group, mist, ix, iz, iy: F.poolWl,
      vel: new Float32Array(MIST_N * 3), life: new Float32Array(MIST_N), maxLife: new Float32Array(MIST_N).fill(1),
      splashT: 0,
    };
    // Alkutila: hiukkaset eri elämänvaiheissa.
    for (let i = 0; i < MIST_N; i++) this._spawnMist(P, i, Math.random());
    return P;
  }

  _spawnMist(P, i, age = 0) {
    const F = P.F;
    const p = P.mist.geometry.attributes.position.array;
    const off = (Math.random() - 0.5) * F.width * 1.2;
    p[i * 3] = P.ix + F.tx * off + F.dx * (Math.random() * 0.8);
    p[i * 3 + 1] = P.iy + Math.random() * 0.4;
    p[i * 3 + 2] = P.iz + F.tz * off + F.dz * (Math.random() * 0.8);
    const out = 0.4 + Math.random() * 1.1;
    P.vel[i * 3] = F.dx * out + (Math.random() - 0.5) * 0.5;
    P.vel[i * 3 + 1] = 0.5 + Math.random() * 1.1;
    P.vel[i * 3 + 2] = F.dz * out + (Math.random() - 0.5) * 0.5;
    P.maxLife[i] = 2 + Math.random() * 2.2;
    P.life[i] = P.maxLife[i] * (1 - age);
  }

  _dispose(P) {
    this.scene.remove(P.group);
    P.group.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
  }

  clear() {
    for (const P of this.items.values()) this._dispose(P);
    this.items.clear();
    this.scanT = 0;
    this.sound.level = 0;
  }

  // lightColor ja ambient kuten roiskeilla: päivällä kirkas, yöllä tumma.
  update(dt, pos, yaw, lightColor, ambient) {
    this.time += dt;
    this.scanT -= dt;
    if (this.scanT <= 0) {
      this.scanT = 0.7;
      const keep = new Set();
      for (const F of fallsNear(pos.x, pos.z, NEAR)) {
        const key = `${Math.round(F.x)},${Math.round(F.z)}`;
        keep.add(key);
        if (!this.items.has(key)) this.items.set(key, this._build(F));
      }
      for (const [key, P] of this.items) {
        if (keep.has(key)) continue;
        if (Math.hypot(P.F.x - pos.x, P.F.z - pos.z) > FAR) {
          this._dispose(P);
          this.items.delete(key);
        }
      }
    }
    if (lightColor) this.color.copy(ambient).multiplyScalar(1.15).add(_c.copy(lightColor).multiplyScalar(0.4));
    for (const m of this.sheetMats) m.uniforms.uTime.value = this.time;
    this.foamMat.uniforms.uTime.value = this.time;
    // Lähin putous äänelle (kuulija: yaw 0 = katse -z, oikea = +x).
    let best = Infinity, bx = 0, bz = 0;
    for (const P of this.items.values()) {
      const d = Math.hypot(P.ix - pos.x, P.iz - pos.z);
      if (d < best) { best = d; bx = P.ix; bz = P.iz; }
      this._updateMist(P, dt, d);
    }
    if (best < Infinity) {
      const dx = bx - pos.x, dz = bz - pos.z;
      const rx = Math.cos(yaw), rz = -Math.sin(yaw);
      this.sound.pan = best > 1 ? Math.max(-1, Math.min(1, (dx * rx + dz * rz) / best)) * 0.7 : 0;
      this.sound.level = Math.min(1, 14 / Math.max(14, best)) * Math.max(0, 1 - best / 120);
    } else {
      this.sound.level = 0;
    }
  }

  _updateMist(P, dt, dist) {
    const near = dist < MIST_NEAR;
    P.mist.visible = near;
    if (!near) return;
    const g = P.mist.geometry;
    const p = g.attributes.position.array, s = g.attributes.aSize.array, a = g.attributes.aAlpha.array;
    for (let i = 0; i < MIST_N; i++) {
      P.life[i] -= dt;
      if (P.life[i] <= 0) this._spawnMist(P, i);
      const drag = Math.exp(-dt * 0.6);
      P.vel[i * 3] *= drag;
      P.vel[i * 3 + 2] *= drag;
      P.vel[i * 3 + 1] = P.vel[i * 3 + 1] * Math.exp(-dt * 0.4) + 0.05 * dt;
      p[i * 3] += P.vel[i * 3] * dt;
      p[i * 3 + 1] += P.vel[i * 3 + 1] * dt;
      p[i * 3 + 2] += P.vel[i * 3 + 2] * dt;
      const t = 1 - P.life[i] / P.maxLife[i];
      s[i] = 0.9 + t * 2.4;
      a[i] = Math.min(1, t * 5) * (1 - t) * 0.22;
    }
    g.attributes.position.needsUpdate = true;
    g.attributes.aSize.needsUpdate = true;
    g.attributes.aAlpha.needsUpdate = true;
    // Pisarat ja väreily vain aivan lähellä.
    if (dist < 60) {
      P.splashT -= dt;
      if (P.splashT <= 0) {
        P.splashT = 0.12 + Math.random() * 0.1;
        const off = (Math.random() - 0.5) * P.F.width;
        const x = P.ix + P.F.tx * off, z = P.iz + P.F.tz * off;
        if (this.splashes) this.splashes.spawn(x, P.iy, z, 0.35 + Math.random() * 0.4, { spread: 1.2 });
        if (this.ripples) this.ripples.disturb(x, z, 0.5 + Math.random() * 0.4, 0.25);
      }
    }
  }
}
