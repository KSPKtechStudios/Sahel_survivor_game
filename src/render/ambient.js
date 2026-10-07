// Biomien tunnelmatehosteet (sessio 10):
// - Tulikärpäset: savannin, metsien ja sademetsän illoissa ja öissä vilkkuvat
//   kellanvihreät valopisteet kameran ympärillä.
// - Pölypyörteet: kuumina, selkeinä päivinä aavikolla ja savannilla
//   (laterittitasanko mukaan lukien) kaukana maisemassa kiertyvät pölypatsaat.
import * as THREE from 'three';
import { createSoftDotTexture } from './textures.js';
import { waterAt } from '../world/terrain.js';
import { smoothstep } from '../noise.js';

const FLY_COUNT = 400;
const FLY_BOX = new THREE.Vector3(40, 5, 40);

const flyVS = /* glsl */ `
attribute vec4 aSeed;
uniform vec3 uCam;
uniform vec3 uBox;
uniform float uTime;
uniform float uAmount;
varying float vAlpha;
void main() {
  float visible = step(aSeed.w, uAmount);
  vec3 p = aSeed.xyz * uBox;
  // Hidas, mutkitteleva lento
  float t = uTime * (0.25 + aSeed.w * 0.3);
  p += vec3(sin(t + aSeed.w * 30.0), sin(t * 1.7 + aSeed.x * 20.0) * 0.35, cos(t * 1.3 + aSeed.y * 25.0)) * 1.6;
  // Kääri kameran ympärille; korkeus enimmäkseen silmien alapuolella.
  vec3 c = uCam - vec3(0.0, 1.0, 0.0);
  p = mod(p - c + uBox * 0.5, uBox) - uBox * 0.5 + c;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  float dist = -mv.z;
  // Vilkkuu: lyhyitä välähdyksiä eri tahdissa.
  float blink = pow(max(0.0, sin(uTime * (0.9 + aSeed.w * 1.4) + aSeed.x * 40.0)), 4.0);
  gl_PointSize = visible * (0.12 + 0.1 * blink) * 300.0 / max(dist, 0.5);
  vAlpha = visible * blink * smoothstep(0.4, 1.5, dist) * (1.0 - smoothstep(uBox.x * 0.3, uBox.x * 0.5, dist));
}
`;

const dotFS = /* glsl */ `
uniform sampler2D uMap;
uniform vec3 uColor;
uniform float uOpacity;
varying float vAlpha;
void main() {
  float a = texture2D(uMap, gl_PointCoord).a * vAlpha * uOpacity;
  if (a < 0.003) discard;
  gl_FragColor = vec4(uColor, a);
  #include <colorspace_fragment>
}
`;

class Fireflies {
  constructor(scene, map) {
    const seeds = new Float32Array(FLY_COUNT * 4);
    for (let i = 0; i < seeds.length; i++) seeds[i] = Math.random();
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(FLY_COUNT * 3), 3));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4));
    this.uniforms = {
      uCam: { value: new THREE.Vector3() },
      uBox: { value: FLY_BOX.clone() },
      uTime: { value: 0 },
      uAmount: { value: 0 },
      uMap: { value: map },
      uColor: { value: new THREE.Color(0xd8ff6a) },
      uOpacity: { value: 1 },
    };
    this.points = new THREE.Points(geo, new THREE.ShaderMaterial({
      uniforms: this.uniforms, vertexShader: flyVS, fragmentShader: dotFS,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    this.points.frustumCulled = false;
    this.points.renderOrder = 5;
    this.points.visible = false;
    scene.add(this.points);
  }

  update(elapsed, camPos, env) {
    const c = env.climate, w = env.w;
    const night = 1 - smoothstep(0.05, 0.35, env.daylight);
    const where = Math.min(1, c.sahel * 0.8 + c.wet * 0.7 + c.mountain * 0.15);
    const calm = (1 - w.rain) * (1 - smoothstep(0.35, 0.7, w.wind)) * (1 - w.dust);
    const amount = night * where * calm * 0.6;
    this.points.visible = amount > 0.01;
    if (!this.points.visible) return;
    const u = this.uniforms;
    u.uCam.value.copy(camPos);
    u.uTime.value = elapsed;
    u.uAmount.value = amount;
  }
}

// --- Pölypyörteet -------------------------------------------------------------------
const DEVIL_COUNT = 240;
const devilVS = /* glsl */ `
attribute vec4 aSeed;
uniform vec3 uBase;
uniform float uH;
uniform float uTime;
uniform float uSize;
varying float vAlpha;
void main() {
  // Hiukkaset nousevat kierteenä ja alkavat alusta (h 0..1 = korkeus).
  float h = fract(aSeed.x + uTime * (0.07 + aSeed.w * 0.05));
  float r = (0.35 + h * h * 3.4 + aSeed.z * 0.7) * (0.85 + 0.15 * sin(uTime * 1.3 + aSeed.y * 6.0));
  float a = aSeed.y * 6.2832 + uTime * (3.6 - h * 1.6);
  // Pyörteen akseli huojuu.
  vec3 axis = vec3(sin(uTime * 0.7 + h * 2.0), 0.0, cos(uTime * 0.6 + h * 1.7)) * h * 1.4;
  vec3 p = uBase + axis + vec3(cos(a) * r, h * uH, sin(a) * r);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  float dist = -mv.z;
  gl_PointSize = uSize * (0.7 + h * 1.8) * 300.0 / max(dist, 1.0);
  vAlpha = smoothstep(0.0, 0.06, h) * (1.0 - smoothstep(0.6, 1.0, h)) * (0.45 + 0.55 * aSeed.w);
}
`;

const DUST_TINT = new THREE.Color(0xa8704a);

class DustDevils {
  constructor(scene, map) {
    this.scene = scene;
    this.map = map;
    this.list = [];
    this.timer = 10;
    const seeds = new Float32Array(DEVIL_COUNT * 4);
    for (let i = 0; i < seeds.length; i++) seeds[i] = Math.random();
    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(DEVIL_COUNT * 3), 3));
    this.geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4));
    this.color = new THREE.Color();
  }

  _spawn(camPos, env) {
    const ang = Math.random() * Math.PI * 2;
    const r = 45 + Math.random() * 45;
    const x = camPos.x + Math.cos(ang) * r, z = camPos.z + Math.sin(ang) * r;
    const w = waterAt(x, z);
    if (w.wl > w.h - 0.1) return;
    const uniforms = {
      uBase: { value: new THREE.Vector3(x, w.h, z) },
      uH: { value: 14 + Math.random() * 12 },
      uTime: { value: 0 },
      uSize: { value: 1.1 + Math.random() * 0.4 },
      uMap: { value: this.map },
      uColor: { value: this.color },
      uOpacity: { value: 0 },
    };
    const points = new THREE.Points(this.geo, new THREE.ShaderMaterial({
      uniforms, vertexShader: devilVS, fragmentShader: dotFS, transparent: true, depthWrite: false,
    }));
    points.frustumCulled = false;
    points.renderOrder = 4;
    this.scene.add(points);
    const sp = 1.5 + Math.random() * 1.8;
    this.list.push({
      points, uniforms, x, z, age: 0, life: 25 + Math.random() * 20, seed: Math.random() * 100,
      vx: env.windDir.x * sp + (Math.random() - 0.5), vz: env.windDir.y * sp + (Math.random() - 0.5), wet: 0,
    });
  }

  _remove(d) {
    this.scene.remove(d.points);
    d.points.material.dispose();
    this.list.splice(this.list.indexOf(d), 1);
  }

  clear() {
    for (const d of this.list.slice()) this._remove(d);
  }

  update(dt, elapsed, camPos, env) {
    const c = env.climate, w = env.w;
    // Kuuma ja kuiva: aavikko ja savanni, selkeä keskipäivä, ei sadetta.
    const clearSky = smoothstep(0.55, 0.2, w.cloud) * (1 - w.rain);
    const hot = Math.min(1, c.desert * 0.7 + c.sahel) * clearSky * smoothstep(0.4, 0.75, env.sunDir.y) * (1 - env.humid);
    this.timer -= dt;
    if (this.timer <= 0) {
      this.timer = 15 + Math.random() * 30;
      if (this.list.length < 2 && Math.random() < hot * 0.8) this._spawn(camPos, env);
    }
    if (!this.list.length) return;
    // Pölyn väri sumun mukaan, hieman punaruskeampi.
    this.color.copy(env.scene.fog.color).lerp(DUST_TINT, 0.65).multiplyScalar(0.55 + 0.45 * env.daylight);
    for (const d of this.list.slice()) {
      d.age += dt;
      d.x += d.vx * dt;
      d.z += d.vz * dt;
      const wa = waterAt(d.x, d.z);
      // Veden yllä pyörre hajoaa.
      if (wa.wl > wa.h - 0.1) d.wet = Math.min(1, d.wet + dt);
      // Pilvien tai illan tullessa pyörre laantuu.
      const fade = smoothstep(0, 3, d.age) * (1 - smoothstep(d.life - 4, d.life, d.age)) * (1 - d.wet) * smoothstep(0, 0.3, hot);
      const far = Math.hypot(d.x - camPos.x, d.z - camPos.z);
      if (d.age >= d.life || d.wet >= 1 || far > 170) { this._remove(d); continue; }
      const u = d.uniforms;
      u.uBase.value.set(d.x, wa.h, d.z);
      u.uTime.value = elapsed + d.seed;
      u.uOpacity.value = 0.42 * fade;
    }
  }
}

export class Ambient {
  constructor(scene) {
    const map = createSoftDotTexture();
    this.fireflies = new Fireflies(scene, map);
    this.devils = new DustDevils(scene, map);
  }

  update(dt, elapsed, camPos, env) {
    this.fireflies.update(elapsed, camPos, env);
    this.devils.update(dt, elapsed, camPos, env);
  }

  clear() {
    this.devils.clear();
  }
}
