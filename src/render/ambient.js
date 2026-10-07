// Biomien tunnelmatehosteet (sessio 10, tulikärpäset uusittu sessiossa 11):
// - Tulikärpäset: illalla ja yöllä pieninä parvina jokien, purojen ja
//   lampien rannoilla sekä osan akasioiden alla. Ei merellä, rannalla,
//   vuorilla eikä aavikolla.
// - Pölypyörteet: kuumina, selkeinä päivinä aavikolla ja savannilla
//   (laterittitasanko mukaan lukien) kaukana maisemassa kiertyvät pölypatsaat.
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { createSoftDotTexture } from './textures.js';
import { waterAt, sampleTerrain } from '../world/terrain.js';
import { smoothstep } from '../noise.js';

const FLY_MAX = 320;     // tulikärpäsiä yhteensä
const SWARMS = 12;       // parvia enintään (lähimmät)
const SCAN_R = 63;       // etsintäsäde (m)
const GRID = 7;          // rantojen etsintäruudukko (m)

const flyVS = /* glsl */ `
attribute vec3 aCenter;
attribute vec4 aSeed;
attribute float aR;
uniform float uTime;
uniform float uAmount;
varying float vAlpha;
void main() {
  // Hidas, mutkitteleva lento parven keskuksen ympärillä.
  float t = uTime * (0.2 + aSeed.w * 0.25);
  vec3 off = vec3(
    sin(t + aSeed.x * 30.0) * aR * (0.3 + 0.7 * aSeed.y),
    0.35 + aSeed.z * 2.0 + sin(t * 1.3 + aSeed.y * 20.0) * 0.35,
    cos(t * 0.8 + aSeed.z * 25.0) * aR * (0.3 + 0.7 * aSeed.x));
  vec4 mv = modelViewMatrix * vec4(aCenter + off, 1.0);
  gl_Position = projectionMatrix * mv;
  float dist = -mv.z;
  // Vilkkuu: lyhyitä välähdyksiä eri tahdissa.
  float blink = pow(max(0.0, sin(uTime * (0.9 + aSeed.w * 1.4) + aSeed.x * 40.0)), 4.0);
  gl_PointSize = (0.12 + 0.1 * blink) * 300.0 / max(dist, 0.5);
  vAlpha = uAmount * blink * smoothstep(0.4, 1.5, dist) * (1.0 - smoothstep(55.0, 75.0, dist));
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

function hash2(x, z, k = 0) {
  const v = Math.sin(x * 12.9898 + z * 78.233 + k * 37.719) * 43758.5453;
  return v - Math.floor(v);
}

// Sopiiko paikka tulikärpäsille (ei meri, ranta, vuoret eikä aavikko).
function fireflyLand(s) {
  return s.ocean < 0.1 && s.beach < 0.2 && s.mountains < 0.35 && s.desert + s.dunes < 0.35;
}

class Fireflies {
  constructor(scene, map, world) {
    this.world = world;
    const seeds = new Float32Array(FLY_MAX * 4);
    for (let i = 0; i < seeds.length; i++) seeds[i] = Math.random();
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(FLY_MAX * 3), 3));
    geo.setAttribute('aCenter', new THREE.BufferAttribute(new Float32Array(FLY_MAX * 3), 3));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4));
    geo.setAttribute('aR', new THREE.BufferAttribute(new Float32Array(FLY_MAX), 1));
    geo.setDrawRange(0, 0);
    this.geo = geo;
    this.uniforms = {
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
    this.scan = null;      // keskeneräinen etsintä (rivi kerrallaan)
    this.lastX = 1e9;
    this.lastZ = 1e9;
    this._s = {};
  }

  clear() {
    this.scan = null;
    this.lastX = this.lastZ = 1e9;
    this.geo.setDrawRange(0, 0);
  }

  // Etsintä aloitetaan, kun pelaaja on liikkunut; ruudukko on maailmaan
  // sidottu, joten samat rannat saavat aina samat parvet.
  _startScan(px, pz) {
    const gx = Math.round(px / GRID), gz = Math.round(pz / GRID);
    const n = Math.ceil(SCAN_R / GRID);
    this.scan = { gx, gz, n, row: -n, water: new Map(), land: [], px, pz };
  }

  _scanRow() {
    const sc = this.scan, s = this._s;
    const j = sc.row;
    for (let i = -sc.n; i <= sc.n; i++) {
      const x = (sc.gx + i) * GRID, z = (sc.gz + j) * GRID;
      sampleTerrain(x, z, s);
      const wet = s.wl > s.h + 0.05;
      if (wet) { if (s.ocean < 0.2) sc.water.set(`${i},${j}`, 1); continue; }
      if (fireflyLand(s)) sc.land.push([i, j, x, s.h, z]);
    }
    sc.row++;
  }

  _finishScan() {
    const sc = this.scan;
    const list = [];
    // Rannat: kuiva ruutu, jonka vieressä on sisävettä.
    for (const [i, j, x, y, z] of sc.land) {
      let near = false;
      for (let dj = -1; dj <= 1 && !near; dj++) for (let di = -1; di <= 1; di++) if (sc.water.has(`${i + di},${j + dj}`)) { near = true; break; }
      if (!near || hash2(x, z, 1) > 0.45) continue;
      list.push({ x: x + (hash2(x, z, 2) - 0.5) * 4, y, z: z + (hash2(x, z, 3) - 0.5) * 4, r: 3 + hash2(x, z, 4) * 2.5, n: 14 + Math.floor(hash2(x, z, 5) * 12) });
    }
    // Akasiat: noin joka viidennen alla parvi.
    const SIZE = CONFIG.chunkSize;
    const s = this._s;
    for (const ch of this.world.chunks.values()) {
      const cx = (ch.cx + 0.5) * SIZE, cz = (ch.cz + 0.5) * SIZE;
      if (Math.abs(cx - sc.px) > SCAN_R + SIZE || Math.abs(cz - sc.pz) > SCAN_R + SIZE) continue;
      for (const o of ch.objects) {
        if (o.type !== 'acacia' || o.stump) continue;
        if ((o.x - sc.px) ** 2 + (o.z - sc.pz) ** 2 > SCAN_R * SCAN_R) continue;
        if (hash2(o.x, o.z, 6) > 0.2) continue;
        sampleTerrain(o.x, o.z, s);
        if (!fireflyLand(s)) continue;
        list.push({ x: o.x, y: o.y, z: o.z, r: 2 + 1.6 * o.scale, n: 9 + Math.floor(hash2(o.x, o.z, 7) * 9) });
      }
    }
    for (const w of list) w.d2 = (w.x - sc.px) ** 2 + (w.z - sc.pz) ** 2;
    list.sort((a, b) => a.d2 - b.d2);
    const cen = this.geo.attributes.aCenter, rad = this.geo.attributes.aR;
    let k = 0;
    for (const w of list.slice(0, SWARMS)) {
      for (let q = 0; q < w.n && k < FLY_MAX; q++, k++) {
        cen.setXYZ(k, w.x, w.y, w.z);
        rad.setX(k, w.r);
      }
    }
    cen.needsUpdate = true;
    rad.needsUpdate = true;
    this.geo.setDrawRange(0, k);
    this.lastX = sc.px;
    this.lastZ = sc.pz;
    this.scan = null;
  }

  update(elapsed, camPos, env) {
    const w = env.w;
    const night = 1 - smoothstep(0.05, 0.35, env.daylight);
    const calm = (1 - w.rain) * (1 - smoothstep(0.35, 0.7, w.wind)) * (1 - w.dust);
    const amount = night * calm;
    this.points.visible = amount > 0.01 && this.geo.drawRange.count > 0;
    // Parvet etsitään vain hämärässä ja yöllä, kun pelaaja on liikkunut.
    if (night > 0.01) {
      if (!this.scan && Math.hypot(camPos.x - this.lastX, camPos.z - this.lastZ) > 18) this._startScan(camPos.x, camPos.z);
      if (this.scan) {
        this._scanRow();
        if (this.scan.row > this.scan.n) this._finishScan();
      }
    }
    if (!this.points.visible) return;
    this.uniforms.uTime.value = elapsed;
    this.uniforms.uAmount.value = amount;
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
    const hot = Math.min(1, c.desert * 0.7 + c.sahel + c.dry) * clearSky * smoothstep(0.4, 0.75, env.sunDir.y) * (1 - env.humid);
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
  constructor(scene, world) {
    const map = createSoftDotTexture();
    this.fireflies = new Fireflies(scene, map, world);
    this.devils = new DustDevils(scene, map);
  }

  update(dt, elapsed, camPos, env) {
    this.fireflies.update(elapsed, camPos, env);
    this.devils.update(dt, elapsed, camPos, env);
  }

  clear() {
    this.devils.clear();
    this.fireflies.clear();
  }
}
