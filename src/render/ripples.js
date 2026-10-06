// Veden väreily pelaajan ympärillä: aaltoyhtälö näytönohjaimella.
// Alue (RIPPLE_SIZE m) seuraa pelaajaa; roiskeet ja liike vedessä lisäävät
// siihen "tönäisyjä", joista renkaat leviävät ja vaimenevat.
import * as THREE from 'three';

const RES = 256;
const RIPPLE_SIZE = 51.2;           // metriä (0.2 m / teksel)
const TEXEL_M = RIPPLE_SIZE / RES;
const STEP_HZ = 30;                 // simulaation askeleet / s
const MAX_DROPS = 8;

const quadVS = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const stepFS = /* glsl */ `
uniform sampler2D uPrev;
uniform vec2 uTexel;
uniform vec2 uShift;     // keskipisteen siirto tekseleinä (uv-yksiköissä)
uniform vec4 uDrops[${MAX_DROPS}]; // x, y (uv), säde (uv), voimakkuus
uniform int uDropCount;
varying vec2 vUv;

vec2 sampleAt(vec2 uv) {
  if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) return vec2(0.0);
  return texture2D(uPrev, uv).rg;
}

void main() {
  vec2 uv = vUv + uShift;
  vec2 c = sampleAt(uv);
  float h = c.r, v = c.g;
  float avg = (sampleAt(uv + vec2(uTexel.x, 0.0)).r + sampleAt(uv - vec2(uTexel.x, 0.0)).r
             + sampleAt(uv + vec2(0.0, uTexel.y)).r + sampleAt(uv - vec2(0.0, uTexel.y)).r) * 0.25;
  v += (avg - h) * 0.5;
  v *= 0.985;
  h += v;
  h *= 0.997;
  for (int i = 0; i < ${MAX_DROPS}; i++) {
    if (i >= uDropCount) break;
    vec4 d = uDrops[i];
    float r = length(vUv - d.xy) / d.z;
    if (r < 1.0) h -= d.w * (0.5 + 0.5 * cos(r * 3.14159));
  }
  // Reunoilla vaimenee (alue liikkuu pelaajan mukana)
  vec2 e = abs(vUv - 0.5) * 2.0;
  float edge = 1.0 - smoothstep(0.85, 1.0, max(e.x, e.y));
  gl_FragColor = vec4(h * edge, v * edge, 0.0, 1.0);
}
`;

export class Ripples {
  constructor(renderer) {
    this.renderer = renderer;
    const opts = {
      type: THREE.HalfFloatType,
      format: THREE.RGBAFormat,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: false,
      generateMipmaps: false,
    };
    this.targets = [new THREE.WebGLRenderTarget(RES, RES, opts), new THREE.WebGLRenderTarget(RES, RES, opts)];
    this.current = 0;
    this.drops = [];
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uPrev: { value: null },
        uTexel: { value: new THREE.Vector2(1 / RES, 1 / RES) },
        uShift: { value: new THREE.Vector2() },
        uDrops: { value: Array.from({ length: MAX_DROPS }, () => new THREE.Vector4()) },
        uDropCount: { value: 0 },
      },
      vertexShader: quadVS,
      fragmentShader: stepFS,
      depthTest: false,
      depthWrite: false,
    });
    this.scene = new THREE.Scene();
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material);
    quad.frustumCulled = false;
    this.scene.add(quad);
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    // Alueen vasen yläkulma maailmassa (lukittu tekseliruudukkoon)
    this.origin = new THREE.Vector2(0, 0);
    this.acc = 0;
    this.active = 0; // sekunteja viimeisestä tönäisystä (lepotilassa ei lasketa)
    this.cleared = false;
    // Veden materiaali lukee nämä
    this.rect = new THREE.Vector4(0, 0, RIPPLE_SIZE, 0.6);
    this.texel = new THREE.Vector2(1 / RES, 1 / RES);
  }

  get texture() {
    return this.targets[this.current].texture;
  }

  // Tönäisy kohtaan (x, z): säde metreinä, voimakkuus ~ 0.05..1.
  disturb(x, z, radius, strength) {
    if (this.drops.length >= 32) return;
    this.drops.push({ x, z, radius, strength });
    this.active = 0;
  }

  _clear() {
    const r = this.renderer;
    const prev = r.getRenderTarget();
    const oldColor = new THREE.Color();
    r.getClearColor(oldColor);
    const oldAlpha = r.getClearAlpha();
    r.setClearColor(0x000000, 1);
    for (const t of this.targets) {
      r.setRenderTarget(t);
      r.clear(true, false, false);
    }
    r.setClearColor(oldColor, oldAlpha);
    r.setRenderTarget(prev);
    this.cleared = true;
  }

  update(dt, cx, cz) {
    if (!this.cleared) this._clear();
    this.active += dt;
    // Uusi keskipiste tekseliruudukkoon lukittuna
    const ox = Math.round((cx - RIPPLE_SIZE / 2) / TEXEL_M) * TEXEL_M;
    const oz = Math.round((cz - RIPPLE_SIZE / 2) / TEXEL_M) * TEXEL_M;
    const shiftX = (ox - this.origin.x) / RIPPLE_SIZE;
    const shiftZ = (oz - this.origin.y) / RIPPLE_SIZE;
    this.origin.set(ox, oz);
    this.rect.x = ox;
    this.rect.y = oz;
    // Ei laskentaa, kun kaikki on jo tasaantunut.
    if (this.active > 12 && !this.drops.length) return;
    this.acc = Math.min(this.acc + dt, 3 / STEP_HZ);
    let first = true;
    while (this.acc >= 1 / STEP_HZ) {
      this.acc -= 1 / STEP_HZ;
      this._step(first ? shiftX : 0, first ? shiftZ : 0);
      first = false;
    }
    if (first && (shiftX || shiftZ)) this._step(shiftX, shiftZ);
  }

  _step(shiftX, shiftZ) {
    const u = this.material.uniforms;
    u.uPrev.value = this.targets[this.current].texture;
    u.uShift.value.set(shiftX, shiftZ);
    const n = Math.min(MAX_DROPS, this.drops.length);
    for (let i = 0; i < n; i++) {
      const d = this.drops[i];
      u.uDrops.value[i].set(
        (d.x - this.origin.x) / RIPPLE_SIZE,
        (d.z - this.origin.y) / RIPPLE_SIZE,
        Math.max(d.radius, TEXEL_M * 1.5) / RIPPLE_SIZE,
        d.strength,
      );
    }
    u.uDropCount.value = n;
    this.drops.splice(0, n);
    const r = this.renderer;
    const prev = r.getRenderTarget();
    const next = 1 - this.current;
    r.setRenderTarget(this.targets[next]);
    r.render(this.scene, this.camera);
    r.setRenderTarget(prev);
    this.current = next;
  }
}
