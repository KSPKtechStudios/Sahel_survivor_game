// Vuorokausi ja sää: aurinko/kuu, valot, sumu, taivaan värit ja tuuli.
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { windUniforms } from './materials.js';
import { smoothstep, lerp } from '../noise.js';

// Värien avainkohdat tunnin mukaan (sRGB-heksat).
const KEYS = [
  { h: 0.0, zen: 0x04060d, hor: 0x0b1222, sun: 0x000000, sunI: 0, hemiS: 0x24304f, hemiG: 0x14110e, hemiI: 0.42, fog: 0x0a0f1a },
  { h: 4.8, zen: 0x070b18, hor: 0x161d30, sun: 0x000000, sunI: 0, hemiS: 0x283452, hemiG: 0x16120f, hemiI: 0.42, fog: 0x121827 },
  { h: 5.7, zen: 0x22345a, hor: 0x8a6a6a, sun: 0xff8a50, sunI: 0.3, hemiS: 0x5a6688, hemiG: 0x3a2c22, hemiI: 0.5, fog: 0x6a5a62 },
  { h: 6.4, zen: 0x3d6094, hor: 0xeea36a, sun: 0xffa060, sunI: 1.4, hemiS: 0x95a0bc, hemiG: 0x6a4a34, hemiI: 0.75, fog: 0xd2a27e },
  { h: 8.0, zen: 0x3a72c0, hor: 0xe6cfae, sun: 0xffdcb0, sunI: 2.6, hemiS: 0xaabbd4, hemiG: 0x8a6646, hemiI: 0.95, fog: 0xdccab0 },
  { h: 12.0, zen: 0x2f6cc8, hor: 0xd2dade, sun: 0xfff3e2, sunI: 3.3, hemiS: 0xb8cbe2, hemiG: 0x957250, hemiI: 1.05, fog: 0xd8d6cc },
  { h: 16.2, zen: 0x386fbc, hor: 0xe2cfb0, sun: 0xffe2bc, sunI: 2.7, hemiS: 0xacbcd6, hemiG: 0x8e6a4a, hemiI: 0.95, fog: 0xdcc8ae },
  { h: 17.6, zen: 0x3a5a8e, hor: 0xf2a060, sun: 0xffa055, sunI: 1.5, hemiS: 0x98a0bc, hemiG: 0x6e4a34, hemiI: 0.75, fog: 0xd49870 },
  { h: 18.3, zen: 0x24345e, hor: 0xd06a48, sun: 0xff6a3a, sunI: 0.35, hemiS: 0x5a5e80, hemiG: 0x3e2c22, hemiI: 0.55, fog: 0x8a5a50 },
  { h: 19.2, zen: 0x0c1430, hor: 0x3a2a3e, sun: 0x000000, sunI: 0, hemiS: 0x303a5c, hemiG: 0x1a1512, hemiI: 0.45, fog: 0x1e1c2a },
  { h: 20.5, zen: 0x05080f, hor: 0x0e1424, sun: 0x000000, sunI: 0, hemiS: 0x24304f, hemiG: 0x14110e, hemiI: 0.42, fog: 0x0b101c },
  { h: 24.0, zen: 0x04060d, hor: 0x0b1222, sun: 0x000000, sunI: 0, hemiS: 0x24304f, hemiG: 0x14110e, hemiI: 0.42, fog: 0x0a0f1a },
].map((k) => ({
  ...k,
  zen: new THREE.Color(k.zen),
  hor: new THREE.Color(k.hor),
  sun: new THREE.Color(k.sun),
  hemiS: new THREE.Color(k.hemiS),
  hemiG: new THREE.Color(k.hemiG),
  fog: new THREE.Color(k.fog),
}));

export const WEATHER = {
  clear: { name: 'Selkeä', cloud: 0.12, vis: 330, sunMul: 1.0, wind: 0.22, dust: 0.05, haze: 0.0, tint: 0xffffff, tintAmt: 0, grey: 0 },
  cloudy: { name: 'Pilvinen', cloud: 0.82, vis: 300, sunMul: 0.32, wind: 0.42, dust: 0.06, haze: 0.12, tint: 0xa6aab0, tintAmt: 0.35, grey: 0.6 },
  haze: { name: 'Hiekkausva', cloud: 0.25, vis: 150, sunMul: 0.55, wind: 0.4, dust: 0.35, haze: 0.6, tint: 0xe2b85e, tintAmt: 0.75, grey: 0 },
  sandstorm: { name: 'Hiekkamyrsky', cloud: 0.65, vis: 34, sunMul: 0.18, wind: 1.0, dust: 1.0, haze: 1.0, tint: 0xb87a3e, tintAmt: 0.92, grey: 0 },
};
export const WEATHER_KEYS = Object.keys(WEATHER);
// Päävalikon taustan tunnelmallinen auringonlasku (ei satunnaisessa säässä).
WEATHER.menu = { name: 'Selkeä', cloud: 0.5, vis: 330, sunMul: 1.0, wind: 0.25, dust: 0.08, haze: 0.04, tint: 0xffffff, tintAmt: 0, grey: 0 };
const HUMID_TINT = new THREE.Color(0xa9b5a2);
const CANOPY_GREEN = new THREE.Color(0x6f9a5a);

const NUMERIC = ['cloud', 'vis', 'sunMul', 'wind', 'dust', 'haze', 'tintAmt', 'grey'];

const _c = new THREE.Color();
const _c2 = new THREE.Color();
const _grey = new THREE.Color(0x9a9ca0);
const _moonCol = new THREE.Color(0x8ea6d8);
const _v = new THREE.Vector3();
const _right = new THREE.Vector3();
const _upv = new THREE.Vector3();

export class Environment {
  constructor(scene, renderer, sky) {
    this.scene = scene;
    this.renderer = renderer;
    this.sky = sky;
    this.time = CONFIG.startHour; // tunteina 0..24
    this.day = 1;
    this.timeScale = 24 / CONFIG.dayLengthSec;

    this.sun = new THREE.DirectionalLight(0xffffff, 3);
    this.sun.castShadow = true;
    const sh = this.sun.shadow;
    sh.mapSize.set(2048, 2048);
    sh.camera.left = -48;
    sh.camera.right = 48;
    sh.camera.top = 48;
    sh.camera.bottom = -48;
    sh.camera.near = 1;
    sh.camera.far = 300;
    sh.bias = -0.0004;
    sh.normalBias = 0.04;
    scene.add(this.sun);
    scene.add(this.sun.target);

    this.hemi = new THREE.HemisphereLight(0xffffff, 0x886644, 1);
    scene.add(this.hemi);

    scene.fog = new THREE.Fog(0xcccccc, 50, 330);

    // Sää
    this.weatherKey = 'clear';
    this.targetKey = 'clear';
    // gw = koko maailman sää (vaihtuu pehmeästi), w = paikallinen tehollinen sää
    this.gw = { ...WEATHER.clear, tint: new THREE.Color(WEATHER.clear.tint) };
    this.w = { ...WEATHER.clear, tint: new THREE.Color(WEATHER.clear.tint) };
    this.humid = 0;
    this.humidTarget = 0;
    this.frozen = false; // päävalikossa aika ja sää eivät etene
    this.maxVis = 330;   // näköetäisyysasetuksen mukaan
    this.weatherTimer = 240 + Math.random() * 180;
    this.windDir = new THREE.Vector2(-0.7071, 0.7071);
    this.windAngle = Math.atan2(0.7071, -0.7071);

    // Lasketut arvot muille järjestelmille
    this.sunDir = new THREE.Vector3();
    this.moonDir = new THREE.Vector3();
    this.daylight = 1; // 0 = yö, 1 = päivä
    this.lightColor = new THREE.Color();
    this.lightDir = new THREE.Vector3(0, 1, 0); // suunta kohti valonlähdettä
    this.lightIntensity = 1;
  }

  setTime(hour) {
    this.time = ((hour % 24) + 24) % 24;
  }

  setWeather(key, instant = false) {
    if (!WEATHER[key]) return;
    this.targetKey = key;
    this.weatherTimer = this._durationFor(key);
    if (instant) {
      this.weatherKey = key;
      Object.assign(this.gw, WEATHER[key], { tint: new THREE.Color(WEATHER[key].tint) });
    }
  }

  _durationFor(key) {
    if (key === 'sandstorm') return 90 + Math.random() * 120;
    if (key === 'haze') return 150 + Math.random() * 200;
    return 200 + Math.random() * 280;
  }

  _pickNextWeather() {
    // Hiekkamyrsky tulee yleensä usvan kautta.
    const from = this.targetKey;
    const table = {
      clear: { clear: 3, cloudy: 3, haze: 3, sandstorm: 0.5 },
      cloudy: { clear: 4, cloudy: 1, haze: 2, sandstorm: 0.5 },
      haze: { clear: 3, cloudy: 1, haze: 1, sandstorm: 3 },
      sandstorm: { clear: 1, cloudy: 1, haze: 4, sandstorm: 0 },
    }[from] || { clear: 3, cloudy: 1, haze: 1, sandstorm: 0 };
    let total = 0;
    for (const k in table) total += table[k];
    let r = Math.random() * total;
    for (const k in table) {
      r -= table[k];
      if (r <= 0) return k;
    }
    return 'clear';
  }

  get weatherName() {
    return WEATHER[this.targetKey].name;
  }

  // Paikallinen kosteus 0..1 (sademetsä): hiekka-ilmiöt muuttuvat sumuksi.
  setLocalHumidity(h) {
    this.humidTarget = h;
  }

  update(dt, playerPos, elapsed) {
    if (!this.frozen) {
      this.time += dt * this.timeScale;
      if (this.time >= 24) { this.time -= 24; this.day++; }
      this.weatherTimer -= dt;
      if (this.weatherTimer <= 0) this.setWeather(this._pickNextWeather());
    }

    // --- Sään pehmeä siirtymä
    const target = WEATHER[this.targetKey];
    const k = 1 - Math.exp(-dt / 9); // n. 25-30 s täyteen siirtymään
    const g = this.gw;
    for (const n of NUMERIC) g[n] = lerp(g[n], target[n], k);
    g.tint.lerp(_c.set(target.tint), k);
    if (Math.abs(g.vis - target.vis) < 1) this.weatherKey = this.targetKey;

    // --- Paikallinen tehollinen sää
    this.humid += (this.humidTarget - this.humid) * Math.min(1, dt * 0.5);
    const H = this.humid;
    const we = this.w;
    for (const n of NUMERIC) we[n] = g[n];
    we.tint.copy(g.tint);
    if (H > 0.001) {
      we.dust = g.dust * (1 - H);
      we.haze = lerp(g.haze, Math.min(g.haze, 0.3), H);
      we.vis = lerp(g.vis, Math.max(g.vis, 170), H);
      we.wind = g.wind * (1 - 0.6 * H);
      we.tintAmt = lerp(g.tintAmt, Math.min(g.tintAmt, 0.3), H);
      we.tint.lerp(HUMID_TINT, H);
    }

    // Tuulen suunta vaihtelee hitaasti koillisen ympärillä.
    const ang = this.windAngle + Math.sin(elapsed * 0.03) * 0.35;
    this.windDir.set(Math.cos(ang), Math.sin(ang));
    windUniforms.uTime.value = elapsed;
    windUniforms.uWindDir.value.copy(this.windDir);
    windUniforms.uWindStrength.value = this.w.wind * (0.85 + Math.sin(elapsed * 0.4) * 0.15);

    // --- Aurinko ja kuu
    const a = ((this.time - 6) / 12) * Math.PI;
    this.sunDir.set(Math.cos(a), Math.sin(a), 0.28).normalize();
    this.moonDir.set(-Math.cos(a), -Math.sin(a), -0.15).normalize();

    // --- Avainkohtien interpolointi
    let i = 0;
    while (i < KEYS.length - 2 && KEYS[i + 1].h <= this.time) i++;
    const A = KEYS[i];
    const B = KEYS[i + 1];
    const f = (this.time - A.h) / (B.h - A.h);
    const lerpC = (key, out) => out.copy(A[key]).lerp(B[key], f);
    const sunI = lerp(A.sunI, B.sunI, f);
    this.daylight = smoothstep(-0.12, 0.25, this.sunDir.y);

    const w = this.w;
    const greyAmt = w.grey;
    const tintAmt = w.tintAmt;
    // Sävy skaalautuu päivänvalon mukaan, ettei yö muutu keltaiseksi.
    const dayLum = 0.12 + 0.88 * this.daylight;
    const tinted = (col) => {
      if (greyAmt > 0.001) col.lerp(_c2.copy(_grey).multiplyScalar(dayLum), greyAmt);
      if (tintAmt > 0.001) col.lerp(_c2.copy(w.tint).multiplyScalar(dayLum), tintAmt);
      return col;
    };

    const u = this.sky.uniforms;
    tinted(lerpC('zen', u.uZenith.value));
    // Pilvisellä ja pölyisellä säällä zeniitti vaalenee kohti horisonttia.
    tinted(lerpC('hor', u.uHorizon.value));
    u.uZenith.value.lerp(u.uHorizon.value, Math.min(1, w.haze * 0.8 + greyAmt * 0.3));
    u.uGround.value.copy(u.uHorizon.value).multiplyScalar(0.6);
    lerpC('sun', u.uSunColor.value);
    u.uSunDir.value.copy(this.sunDir);
    u.uMoonDir.value.copy(this.moonDir);
    u.uSunVisible.value = smoothstep(-0.05, 0.02, this.sunDir.y) * (1 - w.haze * 0.75) * (0.3 + w.sunMul * 0.7);
    u.uMoonVisible.value = smoothstep(-0.02, 0.1, this.moonDir.y) * (1 - w.haze * 0.9);
    u.uStars.value = (1 - smoothstep(-0.2, 0.02, this.sunDir.y)) * (1 - w.haze) * (1 - w.cloud * 0.7);
    u.uCloudCover.value = w.cloud;
    u.uHaze.value = w.haze;
    u.uTime.value = elapsed;
    u.uCloudWind.value.set(this.windDir.x, this.windDir.y).multiplyScalar(0.004 + w.wind * 0.02);
    // Pilvien värit
    const cl = u.uCloudLit.value;
    lerpC('hor', cl).lerp(_c2.setRGB(1, 1, 1).multiplyScalar(dayLum), 0.55);
    cl.lerp(_c2.copy(u.uSunColor.value).multiplyScalar(0.9), 0.25 * (1 - this.daylight * 0.6));
    u.uCloudShade.value.copy(cl).multiplyScalar(0.55 + 0.1 * (1 - greyAmt));

    // Sumu
    const fogC = tinted(lerpC('fog', this.scene.fog.color));
    u.uFogColor.value.copy(fogC);
    // Selkeällä/pilvisellä säällä näkyvyys = näköetäisyys, usvassa ja myrskyssä sään oma.
    let vis = Math.min(w.vis >= 290 ? this.maxVis : w.vis, this.maxVis);
    // Sademetsässä näkyvyys on lyhyt (tiheä kasvillisuus ja kosteus).
    if (this.humid > 0.001) vis = lerp(vis, Math.min(vis, 95), this.humid * 0.9);
    this.scene.fog.far = vis;
    this.scene.fog.near = vis < 100 ? 0 : vis * 0.12;

    // Valot: päivällä aurinko, yöllä kuu.
    const sunUp = this.sunDir.y > 0;
    const dir = sunUp ? this.sunDir : this.moonDir;
    let intensity;
    if (sunUp) {
      intensity = sunI * smoothstep(0.0, 0.12, this.sunDir.y) * w.sunMul;
      this.sun.color.copy(u.uSunColor.value);
      if (tintAmt > 0.001) this.sun.color.lerp(w.tint, tintAmt * 0.5);
    } else {
      intensity = 0.55 * smoothstep(0.0, 0.15, this.moonDir.y) * (1 - w.cloud * 0.6) * (1 - w.haze * 0.6);
      this.sun.color.copy(_moonCol);
    }
    // Latvusto varjostaa sademetsässä.
    intensity *= 1 - 0.45 * this.humid;
    this.sun.intensity = intensity;
    this.lightColor.copy(this.sun.color);
    this.lightIntensity = intensity;
    this.lightDir.copy(dir);

    // Hemisfäärivalo (taivaan ja maan heijastama valo)
    tinted(lerpC('hemiS', this.hemi.color));
    tinted(lerpC('hemiG', this.hemi.groundColor));
    const hemiI = lerp(A.hemiI, B.hemiI, f);
    // Pilvisellä säällä hajavaloa on suhteessa enemmän.
    this.hemi.intensity = hemiI * (1 + greyAmt * 0.25 + w.haze * 0.15) * (1 - 0.2 * this.humid);
    if (this.humid > 0.001) this.hemi.color.lerp(_c2.copy(CANOPY_GREEN).multiplyScalar(dayLum), 0.35 * this.humid);

    // Varjokamera seuraa pelaajaa, ja sen paikka lukitaan tekseliruudukkoon
    // (vähentää varjojen värinää liikkuessa).
    const texel = (this.sun.shadow.camera.right - this.sun.shadow.camera.left) / this.sun.shadow.mapSize.x;
    _v.copy(dir).negate();
    _right.crossVectors(_v, THREE.Object3D.DEFAULT_UP).normalize();
    _upv.crossVectors(_right, _v).normalize();
    const pr = playerPos.dot(_right);
    const pu = playerPos.dot(_upv);
    const pf = playerPos.dot(_v);
    const sr = Math.round(pr / texel) * texel;
    const su = Math.round(pu / texel) * texel;
    const target2 = this.sun.target.position;
    target2.copy(_right).multiplyScalar(sr).addScaledVector(_upv, su).addScaledVector(_v, pf);
    this.sun.position.copy(target2).addScaledVector(dir, 150);
    this.sun.target.updateMatrixWorld();
    // Varjot pysyvät päällä (päälle/pois vaihto kääntäisi kaikki shaderit uudelleen).
    this.sun.shadow.intensity = smoothstep(0.03, 0.3, intensity);

    // Valotus: yöllä hieman enemmän, jotta peli on pelattava.
    this.renderer.toneMappingExposure = lerp(1.35, 0.95, this.daylight);
  }

  serialize() {
    return { time: this.time, day: this.day, weather: this.targetKey };
  }

  load(data) {
    if (!data) return;
    if (typeof data.time === 'number') this.time = data.time;
    if (typeof data.day === 'number') this.day = data.day;
    if (data.weather && WEATHER[data.weather]) this.setWeather(data.weather, true);
  }
}
