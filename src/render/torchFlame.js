// Soihdun liekki. Sessio 34: ensimmäinen shaderiliekki (kaksi ristikkäistä
// tasoa). Sessio 35: kirjoitettu uusiksi käyttäjän kuvauksen mukaan (liekki
// näytti litteältä ja jäykältä):
//  1. Tilavuus: neljä sisäkkäistä, pisaranmuotoista kuorta (lathe). Vertex-
//     shader vääristää niitä 3D-simplex-kohinalla, joka nousee ylöspäin, joten
//     liekki lepattaa ja venyy orgaanisesti. Kuoret häipyvät reunoiltaan
//     (katselukulma), joten reunoja ei näy ja liekki näyttää täyteläiseltä
//     joka suunnasta.
//  2. Tuuli ja liike: liekin akseli on aina maailman ylös. Kärki taipuu
//     kaarelle ilmavirran mukaan (tuuli miinus soihdun nopeus, eli pelaajan
//     liike, kääntyminen ja heilautukset). Taipuma on jousi, joten liekki
//     laahaa ja heilahtaa takaisin.
//  3. Kipinät ja savu: kaksi kevyttä THREE.Points-järjestelmää omalla
//     shaderilla (pehmeät pyöreät pisteet). Kipinät hehkuvat (additiivinen
//     sekoitus), savu on tummaa ja laajenee. Molemmat perivät tuulen ja
//     häipyvät elinikänsä mukaan.
//  4. Väri: ytimen valkokeltaisesta oranssin kautta tummanpunaiseen
//     reunaan, pehmeä läpinäkyvyys; tyvessä hento sininen.
import * as THREE from 'three';

const NOISE = /* glsl */`
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
// 3D simplex-kohina (Ashima Arts / Ian McEwan, MIT).
float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}`;

const VERT = /* glsl */`
uniform float uTime;
uniform float uSeed;
uniform vec2 uBend;      // kärjen sivusiirtymä (liekin korkeuden suhteen), maailman x/z
uniform float uStretch;
varying vec3 vObj;
varying float vY;
varying vec3 vNv;
varying vec3 vPv;
${NOISE}
void main() {
  vec3 p = position;
  float y = clamp(p.y, 0.0, 1.0);
  float t = uTime + uSeed;
  // Nouseva kohina: pullistumat ja kuroumat kulkevat ylöspäin.
  vec3 q = vec3(p.x * 3.2, y * 2.6 - t * 2.3, p.z * 3.2);
  float n1 = snoise(q + uSeed);
  float n2 = snoise(q * 2.3 + vec3(7.1, -t * 1.1, 3.7));
  vec2 rad = p.xz;
  p.xz += rad * (n1 * 0.55 + n2 * 0.25) * (0.35 + y);
  // Sivuttainen lepatus voimistuu ylöspäin.
  float fx = snoise(vec3(t * 1.6, y * 1.8 - t * 1.4, uSeed));
  float fz = snoise(vec3(uSeed + 11.0, y * 1.8 - t * 1.4, t * 1.5));
  p.x += fx * 0.13 * y * y;
  p.z += fz * 0.13 * y * y;
  // Korkeus sykkii; liike venyttää.
  p.y *= uStretch * (1.0 + 0.14 * snoise(vec3(t * 2.1, uSeed, 0.0)));
  // Tuuli ja liike taivuttavat kärkeä (kaari).
  p.xz += uBend * y * y;
  vObj = position;
  vY = y;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vNv = normalize(normalMatrix * normal);
  vPv = mv.xyz;
  gl_Position = projectionMatrix * mv;
}`;

const FRAG = /* glsl */`
uniform float uTime;
uniform float uSeed;
uniform float uLayer;   // 0 = ydin ... 1 = uloin kuori
uniform float uPower;
varying vec3 vObj;
varying float vY;
varying vec3 vNv;
varying vec3 vPv;
${NOISE}
vec3 fireRamp(float t) {
  vec3 c = mix(vec3(0.22, 0.03, 0.01), vec3(0.85, 0.16, 0.02), smoothstep(0.0, 0.25, t));
  c = mix(c, vec3(1.0, 0.48, 0.07), smoothstep(0.22, 0.5, t));
  c = mix(c, vec3(1.0, 0.78, 0.32), smoothstep(0.48, 0.75, t));
  c = mix(c, vec3(1.0, 0.95, 0.82), smoothstep(0.75, 1.0, t));
  return c;
}
void main() {
  float facing = abs(dot(normalize(vNv), normalize(-vPv)));
  float edge = pow(facing, 1.2 + uLayer * 0.9);
  float t = uTime + uSeed;
  vec3 q = vec3(vObj.x * 5.0, vObj.y * 3.4 - t * 3.0, vObj.z * 5.0);
  float nz = 0.5 + 0.5 * (snoise(q) * 0.65 + snoise(q * 2.2 + 5.0) * 0.35);
  float y = vY;
  // Kärki repeilee kohinan mukaan; tyvi häipyy kankaaseen.
  float top = 1.0 - smoothstep(0.2 + 0.55 * nz, 0.98, y);
  float base = smoothstep(0.0, 0.1, y);
  float dens = edge * top * base * smoothstep(0.12, 0.65, nz + 0.3 - y * 0.25);
  float temp = clamp((1.0 - uLayer) * 0.78 + (1.0 - y) * 0.42 + (nz - 0.5) * 0.55 - 0.22, 0.0, 1.0);
  vec3 col = fireRamp(temp);
  float blue = (1.0 - smoothstep(0.0, 0.14, y)) * (1.0 - uLayer) * 0.55;
  col = mix(col, vec3(0.3, 0.45, 1.0), blue * (1.0 - temp * 0.6));
  float a = dens * mix(0.9, 0.3, uLayer) * uPower;
  if (a < 0.002) discard;
  // Esikerrottu: enimmäkseen lisäävä hehku, vähän peittoa.
  gl_FragColor = vec4(col * a * 1.3, a * 0.5);
}`;

const PVERT = /* glsl */`
attribute vec4 aColor;
attribute float aSize;
uniform float uPx;
varying vec4 vColor;
void main() {
  vColor = aColor;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = max(1.0, aSize * uPx / max(0.01, -mv.z));
  gl_Position = projectionMatrix * mv;
}`;

const PFRAG = /* glsl */`
uniform float uSharp;
varying vec4 vColor;
void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  if (d > 1.0) discard;
  float a = pow(1.0 - d, uSharp) * vColor.a;
  gl_FragColor = vec4(vColor.rgb * a, a);
}`;

// Pisaranmuotoinen kuori: y 0..1, säde 0,5 tyven yläpuolella.
function shellGeometry() {
  const pts = [];
  for (let i = 0; i <= 30; i++) {
    const y = i / 30;
    const r = 0.5 * Math.pow(1 - y, 0.85) * (0.4 + 0.6 * Math.min(1, Math.sqrt(y / 0.2)));
    pts.push(new THREE.Vector2(Math.max(0.0005, r), y));
  }
  return new THREE.LatheGeometry(pts, 24);
}

// Pistejoukko (kipinät tai savu) omalla shaderilla.
class PointPool {
  constructor(scene, max, additive, sharp) {
    this.max = max;
    this.list = [];
    const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(max * 3);
    this.col = new Float32Array(max * 4);
    this.size = new Float32Array(max);
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aColor', new THREE.BufferAttribute(this.col, 4).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    g.setDrawRange(0, 0);
    this.uniforms = { uPx: { value: 500 }, uSharp: { value: sharp } };
    this.points = new THREE.Points(g, new THREE.ShaderMaterial({
      uniforms: this.uniforms, vertexShader: PVERT, fragmentShader: PFRAG,
      transparent: true, depthWrite: false,
      blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: additive ? THREE.OneFactor : THREE.OneMinusSrcAlphaFactor,
    }));
    this.points.frustumCulled = false;
    this.points.renderOrder = additive ? 9 : 4;
    // Pikselikoko kameran mukaan (kuten PointsMaterial).
    this.points.onBeforeRender = (renderer, sc, camera) => {
      renderer.getDrawingBufferSize(_v2);
      this.uniforms.uPx.value = _v2.y * 0.5 * camera.projectionMatrix.elements[5];
    };
    scene.add(this.points);
  }

  clear() {
    this.list.length = 0;
    this.points.geometry.setDrawRange(0, 0);
  }

  // Päivitys: f(p, i) palauttaa [r, g, b, a, koko]; sijainnit maailmassa ->
  // näkymään (inv = kameran käänteismatriisi).
  write(inv, f) {
    let n = 0;
    for (const p of this.list) {
      const [r, g, b, a, s] = f(p);
      _v.copy(p.p).applyMatrix4(inv);
      this.pos[n * 3] = _v.x; this.pos[n * 3 + 1] = _v.y; this.pos[n * 3 + 2] = _v.z;
      this.col[n * 4] = r; this.col[n * 4 + 1] = g; this.col[n * 4 + 2] = b; this.col[n * 4 + 3] = a;
      this.size[n] = s;
      n++;
    }
    const g = this.points.geometry;
    g.setDrawRange(0, n);
    g.attributes.position.needsUpdate = true;
    g.attributes.aColor.needsUpdate = true;
    g.attributes.aSize.needsUpdate = true;
  }
}

const _v = new THREE.Vector3();
const _w = new THREE.Vector3();
const _v2 = new THREE.Vector2();
const _qi = new THREE.Quaternion();
const _up = new THREE.Vector3();

// Kuoret: [leveys, korkeus, kerros (0 ydin ... 1 uloin), siemen].
const LAYERS = [[1, 1, 1, 0.0], [0.78, 0.86, 0.66, 3.1], [0.56, 0.68, 0.33, 6.7], [0.34, 0.44, 0.0, 9.2]];

export class TorchFlame {
  constructor(scene, seed = 0) {
    this.scene = scene;
    const shared = { uTime: { value: 0 }, uBend: { value: new THREE.Vector2() }, uStretch: { value: 1 }, uPower: { value: 1 } };
    this.shared = shared;
    const geo = shellGeometry();
    this.group = new THREE.Group();
    LAYERS.forEach(([w, h, layer, s], i) => {
      const mat = new THREE.ShaderMaterial({
        uniforms: { ...shared, uSeed: { value: seed * 13.7 + s }, uLayer: { value: layer } },
        vertexShader: VERT, fragmentShader: FRAG,
        transparent: true, depthWrite: false, side: THREE.FrontSide,
        blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
      });
      const m = new THREE.Mesh(geo, mat);
      m.scale.set(w, h, w);
      m.renderOrder = 5 + i; // uloin ensin, ydin päällimmäisenä
      m.frustumCulled = false;
      this.group.add(m);
    });
    scene.add(this.group);
    this.embers = new PointPool(scene, 48, true, 1.6);
    this.smoke = new PointPool(scene, 40, false, 1.2);
    this.bend = new THREE.Vector2();
    this.bendV = new THREE.Vector2();
    this.vel = new THREE.Vector3();
    this.prevTip = null;
    this.emitE = 0;
    this.emitS = 0;
    this.visible = true;
    this.setVisible(false);
  }

  // Piilotus piilottaa myös kipinät ja savun ja tyhjentää ne (ennen jäätyneet
  // kipinät jäivät näkyviin valkoisina pisteinä).
  setVisible(v) {
    if (v === this.visible) return;
    this.visible = v;
    this.group.visible = v;
    this.embers.points.visible = v;
    this.smoke.points.visible = v;
    if (!v) {
      this.prevTip = null;
      this.embers.clear();
      this.smoke.clear();
    }
  }

  // tipView = soihdun kärki näkymän koordinaateissa (viewmodel-kamera on
  // origossa), cam = pelin kamera, wind = { x, z } m/s, power 0..1 (sade),
  // size = liekin korkeus (m).
  update(dt, time, tipView, cam, wind, power = 1, size = 0.24) {
    if (!this.visible || dt <= 0 || !cam) return;
    cam.updateMatrixWorld();
    const tipW = _w.copy(tipView).applyMatrix4(cam.matrixWorld);
    if (!this.prevTip) { this.prevTip = tipW.clone(); this.vel.set(0, 0, 0); }
    _v.subVectors(tipW, this.prevTip).divideScalar(Math.max(dt, 1e-3));
    this.vel.lerp(_v, 1 - Math.exp(-dt * 18));
    this.prevTip.copy(tipW);
    const wx = wind ? wind.x : 0, wz = wind ? wind.z : 0;
    // Ilmavirta liekin suhteen -> kärjen taipuma (jousi).
    const ax = wx - this.vel.x, az = wz - this.vel.z;
    let tx = ax * 0.16, tz = az * 0.16;
    const tl = Math.hypot(tx, tz);
    if (tl > 1.3) { tx *= 1.3 / tl; tz *= 1.3 / tl; }
    const k = 55, c = 8;
    this.bendV.x += ((tx - this.bend.x) * k - this.bendV.x * c) * dt;
    this.bendV.y += ((tz - this.bend.y) * k - this.bendV.y * c) * dt;
    this.bend.x += this.bendV.x * dt;
    this.bend.y += this.bendV.y * dt;
    const sp = this.vel.length();
    this.shared.uBend.value.set(this.bend.x, this.bend.y);
    // Nopea liike venyttää, alaspäin heilautus pidentää liekkiä hetkeksi.
    this.shared.uStretch.value = 1 + Math.min(0.35, sp * 0.04) + THREE.MathUtils.clamp(-this.vel.y * 0.05, -0.15, 0.25);
    this.shared.uTime.value = time;
    this.shared.uPower.value = 0.5 + 0.5 * power;
    // Liekin akseli = maailman ylös (ryhmän kierto = kameran käänteinen).
    _qi.copy(cam.quaternion).invert();
    this.group.quaternion.copy(_qi);
    const s = size * (0.6 + 0.4 * power) * (0.95 + 0.05 * Math.sin(time * 17.3));
    _up.set(0, 1, 0).applyQuaternion(_qi);
    this.group.position.copy(tipView).addScaledVector(_up, -s * 0.22);
    this.group.scale.set(s * 0.48, s, s * 0.48);

    // Kipinät: lähtevät liekin yläosasta, nousevat, kulkevat tuulen mukana.
    this.emitE += dt * (7 + sp * 2.5) * (0.4 + 0.6 * power);
    while (this.emitE > 1) {
      this.emitE -= 1;
      if (this.embers.list.length >= this.embers.max) this.embers.list.shift();
      const a = Math.random() * Math.PI * 2;
      this.embers.list.push({
        p: tipW.clone().add(_v.set(Math.cos(a) * s * 0.08, s * (0.25 + Math.random() * 0.4), Math.sin(a) * s * 0.08)),
        v: new THREE.Vector3(Math.cos(a) * 0.25, 0.6 + Math.random() * 0.8, Math.sin(a) * 0.25).addScaledVector(this.vel, 0.5),
        age: 0, life: 0.5 + Math.random() * 1.0, sz: 0.006 + Math.random() * 0.007, ph: Math.random() * 9,
      });
    }
    // Savu: tummia, laajenevia hattaroita liekin kärjestä.
    this.emitS += dt * 5;
    while (this.emitS > 1) {
      this.emitS -= 1;
      if (this.smoke.list.length >= this.smoke.max) this.smoke.list.shift();
      this.smoke.list.push({
        p: tipW.clone().add(_v.set((Math.random() - 0.5) * s * 0.1, s * 0.85, (Math.random() - 0.5) * s * 0.1)),
        v: new THREE.Vector3((Math.random() - 0.5) * 0.08, 0.32 + Math.random() * 0.25, (Math.random() - 0.5) * 0.08).addScaledVector(this.vel, 0.3),
        age: 0, life: 1.3 + Math.random() * 1.1,
      });
    }
    const step = (list, drag, rise, jitter) => {
      for (let i = list.length - 1; i >= 0; i--) {
        const p = list[i];
        p.age += dt;
        if (p.age > p.life) { list.splice(i, 1); continue; }
        p.v.x += (wx - p.v.x) * dt * drag + (Math.random() - 0.5) * dt * jitter;
        p.v.z += (wz - p.v.z) * dt * drag + (Math.random() - 0.5) * dt * jitter;
        p.v.y += dt * rise;
        p.p.addScaledVector(p.v, dt);
      }
    };
    step(this.embers.list, 1.4, 0.3, 4);
    step(this.smoke.list, 1.8, 0.05, 0.6);
    const inv = cam.matrixWorldInverse;
    this.embers.write(inv, (p) => {
      const f = 1 - p.age / p.life;
      const fl = 0.75 + 0.25 * Math.sin(time * 30 + p.ph);
      return [1.0, 0.45 + 0.45 * f, 0.1 + 0.3 * f * f, f * fl, p.sz * (0.6 + 0.4 * f)];
    });
    this.smoke.write(inv, (p) => {
      const f = p.age / p.life;
      return [0.13, 0.12, 0.11, 0.22 * Math.sin(Math.PI * f) * (0.6 + 0.4 * power), 0.035 + 0.11 * f];
    });
  }
}
