// Sade (sessio 11: realistisempi):
// - Pisarat: ohuita, pehmeäreunaisia liike-epäterävyysviivoja kameran
//   ympärillä. Jokainen viiva on ruudulla vakiolevyinen nauha (ei 1 px
//   viiva), pituus ja kirkkaus vaihtelevat, kaukaiset haalistuvat.
//   Liike lasketaan näytönohjaimella.
// - Sadeverhot ja usva: kaksi kameran ympärillä kulkevaa lieriötä, joihin
//   piirretään tuulen mukana ajelehtivia sadekuuroja ja maanpinnan usvaa
//   (sumuna paikoitellen).
// - Roiskeet: pienet välähdykset maassa pelaajan ympärillä.
// - Salaman isku kaukana (sahalaitainen viiva hetken ajan).
import * as THREE from 'three';
import { waterAt } from '../world/terrain.js';

const N = 9000;     // pisaroita
const R = 16;       // vaakasäde kameran ympärillä (m): näkyvät pisarat ovat lähellä
const H = 14;       // pystysuuntainen toistoalue (m)
const SPEED = 9.5;  // putoamisnopeus (m/s), isot pisarat
const SPLASHES = 220;

const dropVS = /* glsl */ `
attribute float aSeed;
attribute vec2 aCorner; // x = puoli (-1 / 1), y = 0 pää / 1 häntä
uniform float uTime;
uniform vec3 uCam;
uniform vec2 uWind;
uniform float uAmount;
uniform float uDrizzle;
uniform vec2 uRes;
varying float vAlpha;
varying vec2 vC;
float h1(float n) { return fract(sin(n * 12.9898) * 43758.5453); }
void main() {
  float s = aSeed;
  // Enemmän pisaroita lähelle (näkyvät selvimmin).
  float rr = pow(h1(s * 3.1), 0.75) * ${R.toFixed(1)};
  float aa = h1(s * 5.3) * 6.2832;
  vec3 base = vec3(cos(aa) * rr, h1(s * 7.7) * ${H.toFixed(1)}, sin(aa) * rr);
  // Tihkussa pienet pisarat putoavat hitaasti.
  float sp = ${SPEED.toFixed(1)} * (0.75 + 0.5 * h1(s * 1.9)) * (1.0 - 0.55 * uDrizzle);
  vec3 vel = vec3(uWind.x * 4.0, -sp, uWind.y * 4.0);
  vec3 p = base + vel * uTime;
  p.y = mod(p.y - uCam.y + 6.0, ${H.toFixed(1)}) + uCam.y - 6.0;
  p.x = mod(p.x - uCam.x + ${R.toFixed(1)}, ${(2 * R).toFixed(1)}) + uCam.x - ${R.toFixed(1)};
  p.z = mod(p.z - uCam.z + ${R.toFixed(1)}, ${(2 * R).toFixed(1)}) + uCam.z - ${R.toFixed(1)};
  // Liike-epäterävyys: viivan pituus = nopeus × valotusaika.
  float exposure = (0.02 + 0.025 * h1(s * 4.4)) * (1.0 - 0.45 * uDrizzle);
  vec3 tail = p - vel * exposure;
  vec4 c0 = projectionMatrix * viewMatrix * vec4(p, 1.0);
  vec4 c1 = projectionMatrix * viewMatrix * vec4(tail, 1.0);
  vAlpha = 0.0;
  vC = aCorner;
  if (c0.w < 0.15 || c1.w < 0.15) { gl_Position = vec4(0.0, 0.0, -2.0, 1.0); return; }
  vec2 s0 = c0.xy / c0.w, s1 = c1.xy / c1.w;
  vec2 d = (s1 - s0) * uRes;
  float dl = length(d);
  vec2 dir = dl > 1e-4 ? d / dl : vec2(0.0, -1.0);
  vec2 nrm = vec2(-dir.y, dir.x);
  // Lähellä leveämpi (pisara näkyy), kaukana vähintään n. 1 px.
  float widthPx = clamp(7.0 / c0.w, 1.25, 3.0) * (1.0 - 0.25 * uDrizzle);
  vec4 c = mix(c0, c1, aCorner.y);
  c.xy += nrm * aCorner.x * widthPx / uRes * c.w;
  gl_Position = c;
  float vis = step(h1(s * 9.1), uAmount);
  float fade = smoothstep(0.4, 1.6, c0.w) * (1.0 - smoothstep(${(R * 0.55).toFixed(1)}, ${R.toFixed(1)}, c0.w));
  vAlpha = vis * fade * (0.3 + 0.7 * h1(s * 2.3));
}
`;
const dropFS = /* glsl */ `
uniform vec3 uColor;
uniform float uOpacity;
varying float vAlpha;
varying vec2 vC;
void main() {
  // Pehmeät reunat sivuttain, pää kirkkain, häntä haalistuu.
  float a = vAlpha * (1.0 - abs(vC.x)) * smoothstep(0.0, 0.12, vC.y) * pow(1.0 - vC.y, 0.7);
  if (a < 0.004) discard;
  gl_FragColor = vec4(uColor, a * uOpacity);
  #include <colorspace_fragment>
}
`;

// Sadeverhot: lieriö kameran ympärillä. Kuviot sidotaan maailman
// koordinaatteihin ja ajelehtivat tuulen mukana.
const veilVS = /* glsl */ `
varying vec3 vW;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vW = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}
`;
const veilFS = /* glsl */ `
uniform float uTime;
uniform float uAmount;
uniform float uMist;
uniform vec2 uWind;
uniform vec3 uColor;
uniform vec3 uCam;
uniform float uRadius;
varying vec3 vW;
float hh(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vn(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hh(i), hh(i + vec2(1.0, 0.0)), f.x), mix(hh(i + vec2(0.0, 1.0)), hh(i + vec2(1.0, 1.0)), f.x), f.y);
}
void main() {
  vec3 d = vW - uCam;
  float h = d.y;
  float ang = atan(d.z, d.x);
  // Kuurot: isoja laikkuja, jotka ajelehtivat tuulen mukana.
  vec2 wq = vW.xz * 0.012 - uWind * uTime * 0.035;
  float patchN = vn(wq) * 0.65 + vn(wq * 2.3 + 7.1) * 0.35;
  float patchy = smoothstep(0.3, 0.75, patchN);
  // Pystysuuntaiset juovat (putoava vesi), liikkuvat alaspäin.
  float st = vn(vec2(ang * uRadius * 0.9, h * 0.05 + uTime * 1.6)) * 0.6 + vn(vec2(ang * uRadius * 2.7, h * 0.11 + uTime * 2.9)) * 0.4;
  float top = 1.0 - smoothstep(14.0, 42.0, h);
  float rainA = uAmount * (0.25 + 0.75 * patchy) * (0.55 + 0.45 * st) * top;
  // Maanpinnan usva: matala, laikukas kerros.
  float ground = 1.0 - smoothstep(-4.0, 7.0, h);
  float mistA = uMist * ground * smoothstep(0.25, 0.7, vn(wq * 1.7 + 3.3));
  float a = clamp(rainA * 0.42 + mistA * 0.5, 0.0, 0.7);
  if (a < 0.003) discard;
  gl_FragColor = vec4(uColor * (0.96 + 0.08 * st), a);
  #include <colorspace_fragment>
}
`;

// Roiskeet: pieni laajeneva välähdys maassa.
const splashVS = /* glsl */ `
attribute float aBirth;
uniform float uTime;
varying float vA;
void main() {
  float age = uTime - aBirth;
  float k = clamp(age / 0.22, 0.0, 1.0);
  vec4 mv = modelViewMatrix * vec4(position + vec3(0.0, k * 0.05, 0.0), 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = (0.03 + 0.07 * k) * 420.0 / max(-mv.z, 0.3);
  vA = (age < 0.0 || age > 0.22) ? 0.0 : (1.0 - k) * smoothstep(0.0, 0.03, age);
}
`;
const splashFS = /* glsl */ `
uniform vec3 uColor;
uniform float uOpacity;
varying float vA;
void main() {
  vec2 q = gl_PointCoord * 2.0 - 1.0;
  float r = length(q);
  // Pehmeä välähdys ja himmeä rengas (pisara iskeytyy ja roiskuu).
  float ring = smoothstep(1.0, 0.8, r) * smoothstep(0.45, 0.8, r);
  float a = vA * (ring * 0.35 + smoothstep(0.6, 0.0, r) * 0.7) * uOpacity;
  if (a < 0.01) discard;
  gl_FragColor = vec4(uColor, a);
  #include <colorspace_fragment>
}
`;

const _size = new THREE.Vector2();
const _wq = {};

export class Rain {
  constructor(scene, renderer = null) {
    this.scene = scene;
    this.renderer = renderer;
    // --- Pisarat (4 kärkeä / pisara)
    const corner = new Float32Array(N * 4 * 2);
    const seed = new Float32Array(N * 4);
    const index = [];
    for (let i = 0; i < N; i++) {
      const s = Math.random() * 1000;
      for (let k = 0; k < 4; k++) seed[i * 4 + k] = s;
      corner.set([-1, 0, 1, 0, 1, 1, -1, 1], i * 8);
      const b = i * 4;
      index.push(b, b + 1, b + 2, b, b + 2, b + 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 4 * 3), 3));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    geo.setAttribute('aCorner', new THREE.BufferAttribute(corner, 2));
    geo.setIndex(index);
    this.uniforms = {
      uTime: { value: 0 },
      uCam: { value: new THREE.Vector3() },
      uWind: { value: new THREE.Vector2() },
      uAmount: { value: 0 },
      uDrizzle: { value: 0 },
      uRes: { value: new THREE.Vector2(1280, 720) },
      uColor: { value: new THREE.Color(0.75, 0.8, 0.88) },
      uOpacity: { value: 0.5 },
    };
    // Nauhan kiertosuunta riippuu viivan suunnasta ruudulla: molemmat puolet.
    const mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms, vertexShader: dropVS, fragmentShader: dropFS, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    });
    this.lines = new THREE.Mesh(geo, mat);
    this.lines.frustumCulled = false;
    this.lines.renderOrder = 4;
    this.lines.visible = false;
    scene.add(this.lines);

    // --- Sadeverhot ja usva (lähi- ja kaukolieriö)
    this.veils = [];
    for (const radius of [26, 70]) {
      const g = new THREE.CylinderGeometry(radius, radius, 70, 48, 1, true);
      g.translate(0, 25, 0);
      const u = {
        uTime: { value: 0 }, uAmount: { value: 0 }, uMist: { value: 0 }, uWind: { value: new THREE.Vector2() },
        uColor: { value: new THREE.Color() }, uCam: { value: new THREE.Vector3() }, uRadius: { value: radius },
      };
      const m = new THREE.Mesh(g, new THREE.ShaderMaterial({
        uniforms: u, vertexShader: veilVS, fragmentShader: veilFS, transparent: true, depthWrite: false, side: THREE.BackSide,
      }));
      m.frustumCulled = false;
      m.renderOrder = 3;
      m.visible = false;
      scene.add(m);
      this.veils.push({ mesh: m, uniforms: u });
    }

    // --- Roiskeet
    const sgeo = new THREE.BufferGeometry();
    sgeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(SPLASHES * 3), 3));
    sgeo.setAttribute('aBirth', new THREE.BufferAttribute(new Float32Array(SPLASHES).fill(-10), 1));
    this.splashU = { uTime: { value: 0 }, uColor: { value: new THREE.Color(0.85, 0.88, 0.92) }, uOpacity: { value: 0.6 } };
    this.splashes = new THREE.Points(sgeo, new THREE.ShaderMaterial({
      uniforms: this.splashU, vertexShader: splashVS, fragmentShader: splashFS, transparent: true, depthWrite: false,
    }));
    this.splashes.frustumCulled = false;
    this.splashes.renderOrder = 4;
    this.splashes.visible = false;
    scene.add(this.splashes);
    this.splashIdx = 0;
    this.splashAcc = 0;

    this.t = 0;
    this.amount = 0;
    this.mist = 0;

    // Salaman isku
    this.boltMat = new THREE.LineBasicMaterial({ color: 0xe8f0ff, transparent: true, opacity: 1, fog: false });
    this.bolt = null;
    this.boltT = 0;
  }

  // amount = sateen voimakkuus 0..1, light = valoisuus (pisaroiden väri).
  // fadeDt = todellinen aika (sade voimistuu ja heikkenee tasaisesti).
  // fog = sumun väri (verhot ja pisarat heijastavat ympäristöä).
  update(dt, camera, amount, wind, light, fadeDt = dt, fog = null) {
    this.t += dt;
    this.amount += (amount - this.amount) * Math.min(1, fadeDt * 1.5);
    const a = this.amount;
    const on = a > 0.02;
    this.lines.visible = on;
    const u = this.uniforms;
    u.uTime.value = this.t;
    u.uCam.value.copy(camera.position);
    u.uWind.value.set(wind.x, wind.y);
    u.uAmount.value = a;
    const drizzle = 1 - Math.min(1, Math.max(0, (a - 0.15) / 0.4));
    u.uDrizzle.value = drizzle;
    if (this.renderer) {
      this.renderer.getDrawingBufferSize(_size);
      u.uRes.value.copy(_size);
    }
    // Pisarat taittavat ympäristön valoa: sumun värinen, hieman vaaleampi.
    if (fog) u.uColor.value.copy(fog).multiplyScalar(1.15).addScalar(0.06 * light);
    else u.uColor.value.setRGB(0.32 + 0.45 * light, 0.35 + 0.47 * light, 0.42 + 0.48 * light);
    u.uOpacity.value = 0.45 + 0.3 * (1 - drizzle);

    // Verhot ja usva: vain kunnon sateessa (tihkussa vain hento usva).
    const heavy = Math.max(0, (a - 0.2) / 0.8);
    this.mist += ((a > 0.1 ? 0.25 + 0.6 * heavy : 0) - this.mist) * Math.min(1, fadeDt * 0.25);
    for (const v of this.veils) {
      v.mesh.visible = heavy > 0.01 || this.mist > 0.02;
      if (!v.mesh.visible) continue;
      v.mesh.position.set(camera.position.x, camera.position.y - 10, camera.position.z);
      const vu = v.uniforms;
      vu.uTime.value = this.t;
      vu.uAmount.value = heavy;
      vu.uMist.value = this.mist * (vu.uRadius.value < 40 ? 1 : 0.6);
      vu.uWind.value.set(wind.x, wind.y);
      vu.uCam.value.copy(camera.position);
      if (fog) vu.uColor.value.copy(fog); else vu.uColor.value.setRGB(0.55, 0.58, 0.62);
    }

    // Roiskeet maassa pelaajan ympärillä (vedessä väreet tulevat muualta).
    this.splashes.visible = a > 0.15;
    this.splashU.uTime.value = this.t;
    if (fog) this.splashU.uColor.value.copy(fog).multiplyScalar(1.25).addScalar(0.05);
    if (this.splashes.visible && dt > 0) {
      this.splashAcc += dt * 90 * a;
      const pos = this.splashes.geometry.attributes.position;
      const birth = this.splashes.geometry.attributes.aBirth;
      let n = 0;
      while (this.splashAcc >= 1 && n < 12) {
        this.splashAcc -= 1;
        n++;
        const ang = Math.random() * Math.PI * 2, r = 0.8 + Math.pow(Math.random(), 0.7) * 8;
        const x = camera.position.x + Math.cos(ang) * r, z = camera.position.z + Math.sin(ang) * r;
        const w = waterAt(x, z, _wq);
        if (w.wl > w.h + 0.02) continue;
        const i = this.splashIdx;
        this.splashIdx = (i + 1) % SPLASHES;
        pos.setXYZ(i, x, w.h + 0.02, z);
        birth.setX(i, this.t + Math.random() * 0.03);
      }
      if (n > 0) { pos.needsUpdate = true; birth.needsUpdate = true; }
      if (this.splashAcc > 12) this.splashAcc = 0;
    }

    if (this.bolt) {
      this.boltT -= dt;
      this.boltMat.opacity = Math.max(0, Math.min(1, this.boltT * 6)) * (0.6 + 0.4 * Math.sin(this.boltT * 80));
      if (this.boltT <= 0) {
        this.scene.remove(this.bolt);
        this.bolt.geometry.dispose();
        this.bolt = null;
      }
    }
  }

  // Salama: sahalaitainen viiva taivaalta maahan suunnassa angle, etäisyydellä dist.
  strike(camera, angle, dist) {
    if (this.bolt) {
      this.scene.remove(this.bolt);
      this.bolt.geometry.dispose();
    }
    const cx = camera.position.x + Math.cos(angle) * dist;
    const cz = camera.position.z + Math.sin(angle) * dist;
    const top = camera.position.y + 140 + Math.random() * 60;
    const pts = [];
    let x = cx, z = cz, y = top;
    const seg = 14;
    const add = (ax, ay, az, bx, by, bz) => pts.push(ax, ay, az, bx, by, bz);
    for (let i = 0; i < seg; i++) {
      const ny = top - ((i + 1) / seg) * (top - camera.position.y + 20);
      const nx = x + (Math.random() - 0.5) * 22, nz = z + (Math.random() - 0.5) * 22;
      add(x, y, z, nx, ny, nz);
      // Sivuhaara
      if (Math.random() < 0.3) add(nx, ny, nz, nx + (Math.random() - 0.5) * 30, ny - 12 - Math.random() * 10, nz + (Math.random() - 0.5) * 30);
      x = nx; y = ny; z = nz;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    this.bolt = new THREE.LineSegments(geo, this.boltMat);
    this.bolt.frustumCulled = false;
    this.bolt.renderOrder = 6;
    this.scene.add(this.bolt);
    this.boltT = 0.35;
  }
}
