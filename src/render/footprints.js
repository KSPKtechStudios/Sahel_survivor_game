// Sessio 25: jalanjäljet hiekassa (aavikko, dyynit, rannat). Sessio 26:
// isommat ja kolmiulotteiset painaumat (käyttäjä): jäljen muoto on
// korkeuskartta (kantapää, päkiä, varpaat ja niiden ympärille työntynyt
// hiekkavalli), josta lasketaan pinnan normaalit. Jälki valaistaan auringon
// (tai kuun) suunnasta: valoa kohti olevat seinämät kirkastuvat, varjon
// puoleiset tummuvat ja valli saa korostuksen, joten painauma näyttää
// syvältä. Piirretään kertovalla sekoituksella maan päälle, jolloin hiekan
// oma väri ja tekstuuri säilyvät. Haalistuu (tasoittuu) vähitellen.
import * as THREE from 'three';

const MAX = 90;
const LIFE = 50; // s
const W = 0.24, L = 0.44; // jäljen alue (m)
const TW = 64, TH = 128;

// Korkeuskartta metreinä jalan omissa koordinaateissa: x sivulle (oikean
// jalan ulkosyrjä +x), y eteenpäin (varpaat +y).
const WELLS = [
  // [x, y, rx, ry, syvyys]
  [0.0, -0.112, 0.035, 0.046, 0.02],     // kantapää
  [0.022, -0.035, 0.019, 0.07, 0.012],   // ulkosyrjä yhdistää kantapään ja päkiän
  [0.002, 0.045, 0.045, 0.05, 0.018],    // päkiä
  [-0.024, 0.114, 0.015, 0.018, 0.013],  // isovarvas
  [-0.002, 0.112, 0.0095, 0.012, 0.009],
  [0.015, 0.104, 0.0088, 0.011, 0.008],
  [0.028, 0.095, 0.008, 0.0105, 0.007],
  [0.039, 0.083, 0.0075, 0.0095, 0.006],
];

function heightAt(x, y) {
  // Kuopat yhdistetään pehmeästi (ei harjanteita niiden väliin).
  let e = 0, sum = 0;
  for (const [cx, cy, rx, ry, dep] of WELLS) {
    const d = Math.hypot((x - cx) / rx, (y - cy) / ry);
    sum += Math.exp(-d / 0.12);
    if (d < 1.25) e += dep * Math.pow(Math.max(0, 1 - (d / 1.25) ** 2), 1.6);
  }
  const D = -0.12 * Math.log(Math.max(sum, 1e-30)); // pehmeä etäisyys lähimpään kuoppaan
  let h = -Math.min(0.022, e);
  // Painaumasta sivuille työntynyt valli; varpaiden edessä korkeampi
  // (askeleen ponnistus työntää hiekkaa eteen).
  const front = 1 + 1.4 * Math.max(0, Math.min(1, (y - 0.05) / 0.1));
  h += 0.0055 * front * Math.exp(-(((D - 1.2) / 0.32) ** 2));
  return h;
}

function footTexture() {
  const hs = new Float32Array(TW * TH);
  for (let j = 0; j < TH; j++) {
    for (let i = 0; i < TW; i++) {
      const x = ((i + 0.5) / TW - 0.5) * W, y = ((j + 0.5) / TH - 0.5) * L;
      hs[j * TW + i] = heightAt(x, y);
    }
  }
  const dx = W / TW, dy = L / TH;
  const data = new Uint8Array(TW * TH * 4);
  const at = (i, j) => hs[Math.min(TH - 1, Math.max(0, j)) * TW + Math.min(TW - 1, Math.max(0, i))];
  for (let j = 0; j < TH; j++) {
    for (let i = 0; i < TW; i++) {
      const gx = (at(i + 1, j) - at(i - 1, j)) / (2 * dx);
      const gy = (at(i, j + 1) - at(i, j - 1)) / (2 * dy);
      const n = new THREE.Vector3(-gx, -gy, 1).normalize();
      const o = (j * TW + i) * 4;
      data[o] = Math.round((n.x * 0.5 + 0.5) * 255);
      data[o + 1] = Math.round((n.y * 0.5 + 0.5) * 255);
      data[o + 2] = Math.round((n.z * 0.5 + 0.5) * 255);
      data[o + 3] = Math.round(Math.max(0, Math.min(1, 0.5 + at(i, j) / 0.04)) * 255);
    }
  }
  const t = new THREE.DataTexture(data, TW, TH, THREE.RGBAFormat);
  t.colorSpace = THREE.NoColorSpace;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.needsUpdate = true;
  return t;
}

const vs = /* glsl */ `
attribute float aFade;
varying float vFade;
varying vec2 vUv;
varying vec3 vT;
varying vec3 vB;
varying vec3 vN;
void main() {
  mat3 m = mat3(modelMatrix) * mat3(instanceMatrix);
  vT = m * vec3(1.0, 0.0, 0.0);
  vB = m * vec3(0.0, 0.0, -1.0);
  vN = m * vec3(0.0, 1.0, 0.0);
  vUv = uv;
  vFade = aFade;
  gl_Position = projectionMatrix * viewMatrix * modelMatrix * instanceMatrix * vec4(position, 1.0);
}
`;

const fs = /* glsl */ `
uniform sampler2D map;
uniform vec3 uL;     // valon suunta (kohti aurinkoa tai kuuta)
uniform float uAmb;  // taivaan valon osuus suhteessa suoraan valoon
varying float vFade;
varying vec2 vUv;
varying vec3 vT;
varying vec3 vB;
varying vec3 vN;
void main() {
  vec4 t = texture2D(map, vUv);
  vec3 nt = t.xyz * 2.0 - 1.0;
  vec3 N = normalize(vN);
  vec3 n = normalize(normalize(vT) * nt.x + normalize(vB) * nt.y + N * nt.z);
  float flatL = max(dot(N, uL), 0.0);
  float lit = max(dot(n, uL), 0.0);
  // Seinämät näkevät vähemmän taivasta (painauma tummuu myös varjossa ja yöllä).
  float sky = 0.5 + 0.5 * max(dot(n, N), 0.0);
  float sh = (uAmb * sky + lit) / (uAmb + flatL);
  // Painauman pohja hieman tummempi (tiivistynyt, kosteampi hiekka).
  float h = t.w - 0.5;
  sh *= 1.0 - 0.55 * clamp(-h, 0.0, 0.5);
  gl_FragColor = vec4(vec3(mix(1.0, clamp(sh, 0.35, 1.6), vFade)), 1.0);
}
`;

export class Footprints {
  constructor(scene) {
    const geo = new THREE.PlaneGeometry(W, L);
    geo.rotateX(-Math.PI / 2);
    this.fade = new Float32Array(MAX);
    geo.setAttribute('aFade', new THREE.InstancedBufferAttribute(this.fade, 1));
    this.uniforms = { map: { value: footTexture() }, uL: { value: new THREE.Vector3(0, 1, 0) }, uAmb: { value: 0.4 } };
    const mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms, vertexShader: vs, fragmentShader: fs,
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
      blending: THREE.MultiplyBlending, premultipliedAlpha: true,
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4,
    });
    this.mesh = new THREE.InstancedMesh(geo, mat, MAX);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 2;
    this.mesh.count = MAX;
    const zero = new THREE.Matrix4().makeScale(0, 0, 0);
    for (let i = 0; i < MAX; i++) this.mesh.setMatrixAt(i, zero);
    scene.add(this.mesh);
    this.age = new Float32Array(MAX).fill(LIFE);
    this.depth = new Float32Array(MAX);
    this.next = 0;
    this._m = new THREE.Matrix4();
    this._q = new THREE.Quaternion();
    this._q2 = new THREE.Quaternion();
    this._p = new THREE.Vector3();
    this._s = new THREE.Vector3();
    this._n = new THREE.Vector3();
  }

  // x, z = jalan kohta, yaw = kulkusuunta, side = -1 vasen / 1 oikea,
  // heightAt(x, z) = maan korkeus, depth = painauman voimakkuus 0..1.
  add(x, z, yaw, side, heightAt, depth = 1) {
    const ox = Math.cos(yaw) * 0.12 * side, oz = -Math.sin(yaw) * 0.12 * side;
    const px = x + ox, pz = z + oz;
    const h = heightAt(px, pz);
    const hx = heightAt(px + 0.3, pz), hz = heightAt(px, pz + 0.3);
    this._n.set(h - hx, 0.3, h - hz).normalize();
    this._q.setFromUnitVectors(THREE.Object3D.DEFAULT_UP, this._n);
    this._q2.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, yaw + (Math.random() - 0.5) * 0.15);
    this._q.multiply(this._q2);
    this._p.set(px, h + 0.012, pz);
    const s = side < 0 ? -1 : 1; // vasen jalka peilikuvana
    const k = 0.95 + Math.random() * 0.1;
    this._s.set(s * k, 1, k);
    this._m.compose(this._p, this._q, this._s);
    const i = this.next;
    this.next = (i + 1) % MAX;
    this.mesh.setMatrixAt(i, this._m);
    this.mesh.instanceMatrix.needsUpdate = true;
    this.age[i] = 0;
    this.depth[i] = depth;
    this.fade[i] = depth;
    this.mesh.geometry.attributes.aFade.needsUpdate = true;
  }

  // lightDir = suunta valoon (env.sun.position), amb = taivaan / suoran valon suhde.
  update(dt, lightDir, amb) {
    if (lightDir) this.uniforms.uL.value.copy(lightDir).normalize();
    if (amb !== undefined) this.uniforms.uAmb.value = Math.max(0.25, Math.min(6, amb));
    let any = false;
    for (let i = 0; i < MAX; i++) {
      if (this.age[i] >= LIFE) continue;
      this.age[i] += dt;
      const f = 1 - Math.min(1, this.age[i] / LIFE);
      this.fade[i] = this.depth[i] * f * f * (3 - 2 * f);
      any = true;
    }
    if (any) this.mesh.geometry.attributes.aFade.needsUpdate = true;
  }

  clear() {
    this.age.fill(LIFE);
    this.fade.fill(0);
    this.mesh.geometry.attributes.aFade.needsUpdate = true;
  }
}
