// Sessio 60: kipinät viiruina (käyttäjä: kipinät eivät saa olla vain
// keltaisena hohtavia palloja, vaan oikeasti kipinän näköisiä; koskee soihtua
// ja nuotiota).
//
// Oikea kipinä on pieni, hyvin kirkas hehkuva hiukkanen, joka näkyy silmälle
// ja kameralle liikkeen suuntaan venyneenä viiruna. Jokainen kipinä piirretään
// ohueksi nelikulmioksi kärjestä (nykyinen paikka) pyrstöön (paikka hetki
// sitten, eli nopeus × "suljinaika"). Leveys on ruudulla 1–3 kuvapistettä,
// pyrstö himmenee ja reunat ovat pehmeät. Väri kertoo lämpötilan:
// valkokeltaisesta oranssin kautta tummanpunaiseen (sparkColor).
// Simulaatio on kutsujalla (campfire.js, torchFlame.js); tämä vain piirtää.
import * as THREE from 'three';

const VS = /* glsl */`
attribute vec3 aTail;
attribute vec2 aCorner;   // x: sivu (−1/1), y: 0 = pyrstö, 1 = kärki
attribute vec4 aColor;
attribute float aWidth;   // leveys maailmassa (m)
uniform vec2 uRes;        // piirtopuskurin koko (px)
varying vec4 vColor;
varying vec2 vUv;
#include <fog_pars_vertex>
void main() {
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vec4 h = projectionMatrix * mvPosition;
  vec4 t = projectionMatrix * modelViewMatrix * vec4(aTail, 1.0);
  if (t.w < 0.02) t = h; // pyrstö kameran takana
  vec2 hr = uRes * 0.5;
  vec2 hs = h.xy / h.w * hr, ts = t.xy / t.w * hr;
  vec2 d = hs - ts;
  float L = length(d);
  vec2 dir = L > 0.001 ? d / L : vec2(0.0, 1.0);
  vec2 nrm = vec2(-dir.y, dir.x);
  // Leveys kuvapisteinä etäisyyden mukaan; vähintään n. 1,3 px, enintään 3,5 px.
  float wpx = clamp(aWidth * hr.y * projectionMatrix[1][1] / h.w, 1.3, 3.5);
  vec2 base = aCorner.y > 0.5 ? hs + dir * wpx * 0.6 : ts - dir * wpx * 0.6;
  vec2 p = base + nrm * aCorner.x * wpx * 0.5;
  vec4 c = aCorner.y > 0.5 ? h : t;
  gl_Position = vec4(p / hr * c.w, c.z, c.w);
  // Hyvin ohut viiru himmenee (ei välkettä alle kuvapisteen leveydellä).
  vColor = aColor;
  vUv = aCorner;
  #include <fog_vertex>
}`;

const FS = /* glsl */`
varying vec4 vColor;
varying vec2 vUv;
#include <fog_pars_fragment>
void main() {
  float across = 1.0 - abs(vUv.x);
  across = smoothstep(0.0, 0.85, across);
  float along = mix(0.15, 1.0, vUv.y * vUv.y);
  float a = vColor.a * across * along;
  if (a < 0.002) discard;
  vec4 col = vec4(vColor.rgb * a, a);
  #ifdef USE_FOG
    #ifdef FOG_EXP2
      float fogF = 1.0 - exp(-fogDensity * fogDensity * vFogDepth * vFogDepth);
    #else
      float fogF = smoothstep(fogNear, fogFar, vFogDepth);
    #endif
    col *= 1.0 - fogF;
  #endif
  gl_FragColor = col;
}`;

const _v2 = new THREE.Vector2();

// Lämpötila 0..1 -> väri (HDR, bloom tekee hehkun). out = [r, g, b].
export function sparkColor(temp, out) {
  const t = Math.max(0, Math.min(1, temp));
  let r, g, b;
  if (t > 0.7) { const k = (t - 0.7) / 0.3; r = 1; g = 0.62 + 0.33 * k; b = 0.18 + 0.55 * k; }
  else if (t > 0.35) { const k = (t - 0.35) / 0.35; r = 1; g = 0.28 + 0.34 * k; b = 0.04 + 0.14 * k; }
  else { const k = t / 0.35; r = 0.45 + 0.55 * k; g = 0.05 + 0.23 * k; b = 0.01 + 0.03 * k; }
  const I = 1.2 + 3.3 * t * t; // kuumat ovat paljon kirkkaampia
  out[0] = r * I; out[1] = g * I; out[2] = b * I;
  return out;
}

export class SparkStreaks {
  constructor(max, { fog = true } = {}) {
    this.max = max;
    const g = new THREE.BufferGeometry();
    this.head = new Float32Array(max * 12);
    this.tail = new Float32Array(max * 12);
    this.col = new Float32Array(max * 16);
    this.wid = new Float32Array(max * 4);
    const corner = new Float32Array(max * 8);
    const idx = new Uint32Array(max * 6);
    for (let i = 0; i < max; i++) {
      corner.set([-1, 0, 1, 0, -1, 1, 1, 1], i * 8);
      const o = i * 4;
      idx.set([o, o + 1, o + 2, o + 2, o + 1, o + 3], i * 6);
    }
    const dyn = (arr, n) => new THREE.BufferAttribute(arr, n).setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('position', dyn(this.head, 3));
    g.setAttribute('aTail', dyn(this.tail, 3));
    g.setAttribute('aColor', dyn(this.col, 4));
    g.setAttribute('aWidth', dyn(this.wid, 1));
    g.setAttribute('aCorner', new THREE.BufferAttribute(corner, 2));
    g.setIndex(new THREE.BufferAttribute(idx, 1));
    g.setDrawRange(0, 0);
    this.uniforms = { uRes: { value: new THREE.Vector2(1280, 720) } };
    this.mat = new THREE.ShaderMaterial({
      uniforms: fog ? THREE.UniformsUtils.merge([THREE.UniformsLib.fog, this.uniforms]) : this.uniforms,
      vertexShader: VS, fragmentShader: FS, fog,
      transparent: true, depthWrite: false, side: THREE.DoubleSide, // nelikulmion kiertosuunta riippuu liikkeestä
      blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
    });
    this.mesh = new THREE.Mesh(g, this.mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 9;
    this.mesh.onBeforeRender = (renderer) => {
      renderer.getDrawingBufferSize(_v2);
      this.mat.uniforms.uRes.value.copy(_v2);
    };
    this.n = 0;
  }

  begin() { this.n = 0; }

  // Kärki (hx, hy, hz), pyrstö (tx, ty, tz), väri ja peitto, leveys (m).
  push(hx, hy, hz, tx, ty, tz, r, g, b, a, w) {
    if (this.n >= this.max) return;
    const i = this.n++;
    for (let k = 0; k < 4; k++) {
      const j = (i * 4 + k) * 3;
      this.head[j] = hx; this.head[j + 1] = hy; this.head[j + 2] = hz;
      this.tail[j] = tx; this.tail[j + 1] = ty; this.tail[j + 2] = tz;
      const c = (i * 4 + k) * 4;
      this.col[c] = r; this.col[c + 1] = g; this.col[c + 2] = b; this.col[c + 3] = a;
      this.wid[i * 4 + k] = w;
    }
  }

  end() {
    const g = this.mesh.geometry;
    g.setDrawRange(0, this.n * 6);
    this.mesh.visible = this.n > 0;
    if (!this.n) return;
    g.attributes.position.needsUpdate = true;
    g.attributes.aTail.needsUpdate = true;
    g.attributes.aColor.needsUpdate = true;
    g.attributes.aWidth.needsUpdate = true;
  }

  dispose() {
    this.mesh.geometry.dispose();
    this.mat.dispose();
  }
}
