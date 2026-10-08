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
const SPLASHES = 700; // sessio 24: ennen 220

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
  // Sessio 25: ylös katsottaessa pisara näkyy päästä (lyhyt viiru = tumma
  // neliö taivasta vasten). Lyhyet viirut häivytetään pois.
  float endOn = smoothstep(4.0, 12.0, dl);
  vAlpha = vis * fade * endOn * (0.3 + 0.7 * h1(s * 2.3));
}
`;
const dropFS = /* glsl */ `
uniform vec3 uColor;
uniform float uOpacity;
varying float vAlpha;
varying vec2 vC;
void main() {
  // Pehmeät reunat sivuttain, pää kirkkain, häntä haalistuu.
  // Interpoloitu vC voi ylittää hieman välin 0..1: pow(negatiivinen) = NaN, joka
  // näkyi mustina läiskinä (liike-epäterävyys levitti ne).
  float ty = clamp(vC.y, 0.0, 1.0);
  float a = vAlpha * max(0.0, 1.0 - abs(vC.x)) * smoothstep(0.0, 0.12, ty) * pow(1.0 - ty, 0.7);
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
  float a = clamp(rainA * 0.38 + mistA * 0.4, 0.0, 0.5);
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
varying float vK;
varying float vSeed;
void main() {
  float age = uTime - aBirth;
  float k = clamp(age / 0.3, 0.0, 1.0);
  vec4 mv = modelViewMatrix * vec4(position + vec3(0.0, 0.05, 0.0), 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = 0.2 * 420.0 / max(-mv.z, 0.3);
  vA = (age < 0.0 || age > 0.3) ? 0.0 : smoothstep(0.0, 0.02, age);
  vK = k;
  vSeed = fract(aBirth * 7.31);
}
`;
// Sessio 24: roiske kruununa: maahan leviävä litteä rengas ja pisarat, jotka
// lentävät kaarena ylös ja ulos (ennen pelkkä välähdys).
const splashFS = /* glsl */ `
uniform vec3 uColor;
uniform float uOpacity;
varying float vA;
varying float vK;
varying float vSeed;
void main() {
  vec2 q = gl_PointCoord * 2.0 - 1.0;
  q.y = -q.y;
  float k = vK;
  float a = 0.0;
  // Rengas maassa (litistetty ellipsi alareunassa).
  float e = length(vec2(q.x, (q.y + 0.72) * 3.2));
  a += smoothstep(0.07, 0.0, abs(e - k * 0.85)) * (1.0 - k) * 0.6;
  // Keskellä nouseva pylväs alussa.
  float col = smoothstep(0.06, 0.0, abs(q.x)) * step(-0.75, q.y) * step(q.y, -0.75 + 0.55 * sin(min(k * 2.2, 1.0) * 3.14159));
  a += col * (1.0 - smoothstep(0.2, 0.5, k)) * 0.8;
  // Kruunun pisarat kaarena.
  for (int i = 0; i < 6; i++) {
    float fi = float(i);
    float ang = fi * 1.0472 + vSeed * 6.2832;
    float sp = 0.55 + 0.35 * fract(sin(fi * 12.7 + vSeed * 31.0) * 4375.5);
    vec2 dp = vec2(cos(ang) * k * sp * 0.9, -0.72 + sin(k * 3.14159) * 0.55 * sp + sin(ang) * k * 0.08);
    a += smoothstep(0.075, 0.0, length(q - dp)) * (1.0 - k * 0.8);
  }
  a *= vA * uOpacity;
  if (a < 0.01) discard;
  gl_FragColor = vec4(uColor, min(a, 1.0));
  #include <colorspace_fragment>
}
`;

const _size = new THREE.Vector2();
const _d = new THREE.Vector3(), _e = new THREE.Vector3(), _f = new THREE.Vector3();
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

    // --- Sadeverhot ja usva (lähi- ja kaukolieriö). Säde seuraa sumun
    // kantamaa (sessio 12): verho on siellä, missä sumu jo peittää maiseman,
    // joten sen eteen ja taakse jäävien puiden välille ei synny "seinää".
    this.veils = [];
    this.fogFar = 150;
    for (const k of [0.7, 0.95]) {
      const radius = 1;
      const g = new THREE.CylinderGeometry(radius, radius, 70, 48, 1, true);
      g.translate(0, 25, 0);
      const u = {
        uTime: { value: 0 }, uAmount: { value: 0 }, uMist: { value: 0 }, uWind: { value: new THREE.Vector2() },
        uColor: { value: new THREE.Color() }, uCam: { value: new THREE.Vector3() }, uRadius: { value: 50 },
      };
      const m = new THREE.Mesh(g, new THREE.ShaderMaterial({
        uniforms: u, vertexShader: veilVS, fragmentShader: veilFS, transparent: true, depthWrite: false, side: THREE.BackSide,
      }));
      m.frustumCulled = false;
      m.renderOrder = 3;
      m.visible = false;
      scene.add(m);
      this.veils.push({ mesh: m, uniforms: u, k });
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
    // Ydin täysin valkoinen (ei sävykartoitusta), jotta se erottuu myös
    // vaaleaa myrskytaivasta vasten; hehku additiivinen.
    // Nauhan reunat häipyvät (aSide = −1 … 1 poikittain).
    const boltMat = (color, power, additive) => new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color(color) }, uOpacity: { value: 1 } },
      vertexShader: 'attribute float aSide; varying float vS; void main() { vS = aSide; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `uniform vec3 uColor; uniform float uOpacity; varying float vS;
        void main() { float a = pow(max(0.0, 1.0 - abs(vS)), ${power.toFixed(1)}) * uOpacity; if (a < 0.003) discard; gl_FragColor = vec4(uColor, a); }`,
      transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.boltMat = boltMat(0xffffff, 0.5, false);
    this.boltGlowMat = boltMat(0xa8bcff, 2.0, true);
    this.bolt = null;
    this.boltT = 0;

    // Salaman iskukohdan pieni tulipallo (sessio 12c): ydin ja hehku.
    this.fireballs = [];
    this.fbGeo = new THREE.SphereGeometry(1, 14, 10);
  }

  // Salama osuu maahan kohdassa p: pieni leimahtava tulipallo.
  impact(p) {
    const mk = (color, op) => {
      const m = new THREE.Mesh(this.fbGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: op, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, fog: false }));
      m.position.copy(p);
      m.renderOrder = 7;
      this.scene.add(m);
      return m;
    };
    this.fireballs.push({ core: mk(0xffe2a0, 1), glow: mk(0xff7a20, 0.5), t: 0, life: 0.6 });
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

    // Verhot ja usva: vain kunnon sateessa (ei sademetsän tihkussa).
    const heavy = Math.max(0, (a - 0.3) / 0.7);
    this.mist += (0.7 * heavy - this.mist) * Math.min(1, fadeDt * 0.25);
    for (const v of this.veils) {
      v.mesh.visible = heavy > 0.01 || this.mist > 0.02;
      if (!v.mesh.visible) continue;
      const R = Math.max(35, this.fogFar * v.k);
      v.mesh.position.set(camera.position.x, camera.position.y - 10, camera.position.z);
      v.mesh.scale.set(R, 1, R);
      const vu = v.uniforms;
      vu.uRadius.value = R;
      vu.uTime.value = this.t;
      vu.uAmount.value = heavy;
      vu.uMist.value = this.mist * (v.k < 0.8 ? 0.7 : 0.5);
      vu.uWind.value.set(wind.x, wind.y);
      vu.uCam.value.copy(camera.position);
      if (fog) vu.uColor.value.copy(fog); else vu.uColor.value.setRGB(0.55, 0.58, 0.62);
    }

    // Roiskeet maassa pelaajan ympärillä (vedessä väreet tulevat muualta).
    this.splashes.visible = a > 0.15;
    this.splashU.uTime.value = this.t;
    if (fog) this.splashU.uColor.value.copy(fog).multiplyScalar(1.25).addScalar(0.05);
    if (this.splashes.visible && dt > 0) {
      this.splashAcc += dt * 260 * a;
      const pos = this.splashes.geometry.attributes.position;
      const birth = this.splashes.geometry.attributes.aBirth;
      let n = 0;
      while (this.splashAcc >= 1 && n < 30) {
        this.splashAcc -= 1;
        n++;
        const ang = Math.random() * Math.PI * 2, r = 0.8 + Math.pow(Math.random(), 0.8) * 11;
        const x = camera.position.x + Math.cos(ang) * r, z = camera.position.z + Math.sin(ang) * r;
        const w = waterAt(x, z, _wq);
        // Myös vedenpinnalle (sessio 12d): pisara ponnauttaa pienen kruunun,
        // väreet piirtää vesi itse.
        const wet = w.wl > w.h + 0.02;
        const i = this.splashIdx;
        this.splashIdx = (i + 1) % SPLASHES;
        pos.setXYZ(i, x, (wet ? w.wl + 0.03 : w.h + 0.02), z);
        birth.setX(i, this.t + Math.random() * 0.03);
      }
      if (n > 0) { pos.needsUpdate = true; birth.needsUpdate = true; }
      if (this.splashAcc > 30) this.splashAcc = 0;
    }

    for (let i = this.fireballs.length - 1; i >= 0; i--) {
      const f = this.fireballs[i];
      f.t += fadeDt;
      const k = f.t / f.life;
      if (k >= 1) {
        this.scene.remove(f.core, f.glow);
        f.core.material.dispose();
        f.glow.material.dispose();
        this.fireballs.splice(i, 1);
        continue;
      }
      // Leimahtaa nopeasti, laajenee hieman ja nousee, sitten sammuu.
      const grow = 0.35 + 0.9 * Math.sqrt(k);
      f.core.scale.setScalar(grow * 0.55);
      f.glow.scale.setScalar(grow * 1.4);
      f.core.position.y += fadeDt * 0.8;
      f.glow.position.y = f.core.position.y;
      const fade = 1 - k * k;
      f.core.material.opacity = fade;
      f.glow.material.opacity = 0.5 * fade;
      f.core.material.color.setRGB(1, 0.88 - 0.4 * k, 0.6 - 0.5 * k);
    }

    if (this.bolt) {
      this.boltT -= dt;
      const op = Math.max(0, Math.min(1, this.boltT * 6)) * (0.6 + 0.4 * Math.sin(this.boltT * 80));
      this.boltMat.uniforms.uOpacity.value = op;
      this.boltGlowMat.uniforms.uOpacity.value = op * 0.45;
      if (this.boltT <= 0) this._dropBolt();
    }
  }

  // Salama: sahalaitainen nauha taivaalta maahan suunnassa angle, etäisyydellä
  // dist. Nauha käännetään kameraan päin (viivat piirtyisivät vain 1 px:n
  // levyisinä), ja sen ympärillä on leveämpi, himmeä hehku. near = lähelle
  // iskevä salama (sessio 12): leveämpi, kirkkaampi ja pidempään näkyvä.
  strike(camera, angle, dist, near = false) {
    this._dropBolt();
    const cam = camera.position;
    const cx = cam.x + Math.cos(angle) * dist;
    const cz = cam.z + Math.sin(angle) * dist;
    const ground = waterAt(cx, cz, _wq);
    const bottom = Math.max(ground.h, ground.wl);
    const top = bottom + 160 + Math.random() * 60;
    const jag = near ? 9 : 22;
    const main = [];
    const branches = [];
    let x = cx, z = cz, y = top;
    const seg = 16;
    main.push([x, y, z]);
    for (let i = 0; i < seg; i++) {
      const ny = top - ((i + 1) / seg) * (top - bottom);
      const last = i === seg - 1;
      const nx = last ? cx : x + (Math.random() - 0.5) * jag, nz = last ? cz : z + (Math.random() - 0.5) * jag;
      main.push([nx, ny, nz]);
      if (Math.random() < 0.3 && i < seg - 3) {
        const b = [[nx, ny, nz]];
        let bx = nx, by = ny, bz = nz;
        for (let k = 0; k < 3; k++) {
          bx += (Math.random() - 0.5) * jag * 1.4; bz += (Math.random() - 0.5) * jag * 1.4; by -= 8 + Math.random() * 8;
          b.push([bx, by, bz]);
        }
        branches.push(b);
      }
      x = nx; y = ny; z = nz;
    }
    const w = near ? 1.3 : 2.6;
    const core = [], glow = [];
    this._ribbon(main, w, cam, core);
    this._ribbon(main, w * 7, cam, glow);
    for (const b of branches) { this._ribbon(b, w * 0.5, cam, core); this._ribbon(b, w * 3, cam, glow); }
    const mk = (pts, mat) => {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
      const side = new Float32Array(pts.length / 3);
      for (let i = 0; i < side.length; i += 6) side.set([-1, 1, 1, -1, 1, -1], i);
      g.setAttribute('aSide', new THREE.BufferAttribute(side, 1));
      const m = new THREE.Mesh(g, mat);
      m.frustumCulled = false;
      m.renderOrder = 6;
      return m;
    };
    this.bolt = new THREE.Group();
    this.bolt.add(mk(glow, this.boltGlowMat), mk(core, this.boltMat));
    this.scene.add(this.bolt);
    this.boltT = near ? 0.5 : 0.35;
  }

  // Polku nauhaksi: jokaiselle osalle nelikulmio, joka on kohtisuorassa sekä
  // osan suuntaan että katsesuuntaan nähden.
  _ribbon(path, w, cam, out) {
    for (let i = 0; i < path.length - 1; i++) {
      const [ax, ay, az] = path[i], [bx, by, bz] = path[i + 1];
      _d.set(bx - ax, by - ay, bz - az);
      _e.set((ax + bx) / 2 - cam.x, (ay + by) / 2 - cam.y, (az + bz) / 2 - cam.z);
      _f.crossVectors(_d, _e).normalize().multiplyScalar(w / 2);
      out.push(ax - _f.x, ay - _f.y, az - _f.z, ax + _f.x, ay + _f.y, az + _f.z, bx + _f.x, by + _f.y, bz + _f.z);
      out.push(ax - _f.x, ay - _f.y, az - _f.z, bx + _f.x, by + _f.y, bz + _f.z, bx - _f.x, by - _f.y, bz - _f.z);
    }
  }

  _dropBolt() {
    if (!this.bolt) return;
    this.scene.remove(this.bolt);
    for (const c of this.bolt.children) c.geometry.dispose();
    this.bolt = null;
  }
}
