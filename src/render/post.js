// Jälkikäsittely: valonsäteet (god rays), ilmakehän hehku sumussa,
// syväterävyys (DOF) ja liike-epäterävyys. Maailma piirretään ensin
// HDR-kuvaan syvyyksineen; käsi piirretään lopuksi suoraan ruudulle, joten
// tehosteet eivät sumenna sitä.
//
// Jos kaikki tehosteet ovat pois päältä, maailma piirretään suoraan ruudulle
// kuten ennenkin (heikoille koneille).
import * as THREE from 'three';

const quadVS = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

// Valonsäteiden lähde: taivaan kirkkaat kohdat auringon lähellä.
const maskFS = /* glsl */ `
uniform sampler2D tColor;
uniform sampler2D tDepth;
uniform vec2 uSun;
uniform float uAspect;
varying vec2 vUv;
void main() {
  float d = texture2D(tDepth, vUv).r;
  float sky = step(0.99999, d);
  vec3 c = min(texture2D(tColor, vUv).rgb, vec3(6.0));
  vec2 dd = vUv - uSun;
  dd.x *= uAspect;
  float fall = exp(-dot(dd, dd) * 3.2);
  float lum = dot(c, vec3(0.2126, 0.7152, 0.0722));
  gl_FragColor = vec4(c * sky * fall * smoothstep(0.1, 0.8, lum), 1.0);
}
`;

// Säteittäinen sumennus kohti aurinkoa.
const radialFS = /* glsl */ `
uniform sampler2D tInput;
uniform vec2 uSun;
uniform float uLength;
varying vec2 vUv;
void main() {
  const int N = 28;
  vec2 delta = (vUv - uSun) * uLength / float(N);
  vec2 uv = vUv;
  vec3 acc = vec3(0.0);
  float w = 1.0, ws = 0.0;
  for (int i = 0; i < N; i++) {
    acc += texture2D(tInput, uv).rgb * w;
    ws += w;
    w *= 0.965;
    uv -= delta;
  }
  gl_FragColor = vec4(acc / ws, 1.0);
}
`;

// Tarkennusetäisyys: keskikohdan syvyys, pehmeästi muuttuva (silmän mukautuminen).
const focusFS = /* glsl */ `
#include <packing>
uniform sampler2D tDepth;
uniform sampler2D tPrev;
uniform float uNear;
uniform float uFar;
uniform float uBlend;
varying vec2 vUv;
float lin(vec2 uv) { return -perspectiveDepthToViewZ(texture2D(tDepth, uv).r, uNear, uFar); }
void main() {
  float d = min(min(lin(vec2(0.5)), lin(vec2(0.5, 0.47))), min(lin(vec2(0.47, 0.5)), lin(vec2(0.53, 0.5))));
  d = min(d, 400.0);
  float prev = texture2D(tPrev, vec2(0.5)).r;
  if (prev <= 0.0) prev = d;
  gl_FragColor = vec4(mix(prev, d, uBlend), 0.0, 0.0, 1.0);
}
`;

// Syväterävyys: sumennus epätarkkuusympyrän (CoC) koon mukaan (puolikas tarkkuus).
const dofFS = /* glsl */ `
#include <packing>
uniform sampler2D tColor;
uniform sampler2D tDepth;
uniform sampler2D tFocus;
uniform vec2 uTexel;
uniform float uNear;
uniform float uFar;
uniform float uMaxR;
varying vec2 vUv;
float coc(vec2 uv, float focus) {
  float z = -perspectiveDepthToViewZ(texture2D(tDepth, uv).r, uNear, uFar);
  float c = abs(1.0 - focus / max(z, 0.05));
  // Kauempana kuin tarkennus sumenee pehmeämmin, lähellä nopeammin.
  c = z > focus ? min(c, 1.0) * 0.8 : min(c, 1.0);
  return c;
}
void main() {
  float focus = texture2D(tFocus, vec2(0.5)).r;
  float c0 = coc(vUv, focus);
  vec3 acc = texture2D(tColor, vUv).rgb;
  float ws = 1.0;
  const int N = 20;
  for (int i = 1; i < N; i++) {
    float r = sqrt(float(i) / float(N)) * uMaxR * c0;
    float a = float(i) * 2.39996;
    vec2 off = vec2(cos(a), sin(a)) * r * uTexel;
    vec2 suv = vUv + off;
    float cs = coc(suv, focus);
    // Terävä etuala ei vuoda sumean taustan päälle.
    float w = smoothstep(0.0, 0.25, cs) + 0.05;
    acc += texture2D(tColor, suv).rgb * w;
    ws += w;
  }
  gl_FragColor = vec4(acc / ws, c0);
}
`;

// Lopullinen kuva: liike-epäterävyys, DOF, valonsäteet, ilmakehän hehku ja sävytys.
const compositeFS = /* glsl */ `
uniform sampler2D tColor;
uniform sampler2D tDepth;
uniform sampler2D tRays;
uniform sampler2D tDof;
uniform float uUseRays;
uniform float uUseDof;
uniform float uRayStrength;
uniform vec3 uRayColor;
uniform mat4 uInvViewProj;
uniform mat4 uPrevViewProj;
uniform float uMBScale;
uniform float uNear;
uniform float uFar;
uniform vec3 uCamPos;
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform float uInscatter;
uniform float uFogNear;
uniform float uFogFar;
varying vec2 vUv;

vec3 sceneAt(vec2 uv) {
  vec3 c = texture2D(tColor, uv).rgb;
  if (uUseDof > 0.5) {
    vec4 d = texture2D(tDof, uv);
    c = mix(c, d.rgb, smoothstep(0.08, 0.5, d.a));
  }
  return c;
}

void main() {
  float depth = texture2D(tDepth, vUv).r;
  vec4 ndc = vec4(vUv * 2.0 - 1.0, depth * 2.0 - 1.0, 1.0);
  vec4 wp = uInvViewProj * ndc;
  wp /= wp.w;

  vec3 col;
  if (uMBScale > 0.0) {
    vec4 pp = uPrevViewProj * wp;
    vec2 prevUv = pp.xy / pp.w * 0.5 + 0.5;
    vec2 vel = (vUv - prevUv) * uMBScale;
    float len = length(vel);
    if (len > 0.045) vel *= 0.045 / len;
    if (len > 0.0006) {
      col = vec3(0.0);
      const int M = 9;
      for (int i = 0; i < M; i++) {
        float t = float(i) / float(M - 1) - 0.5;
        col += sceneAt(clamp(vUv + vel * t, vec2(0.001), vec2(0.999)));
      }
      col /= float(M);
    } else {
      col = sceneAt(vUv);
    }
  } else {
    col = sceneAt(vUv);
  }

  // Ilmakehä: sumu hehkuu auringon suunnassa (aamu- ja iltavalo, usva).
  vec3 ray = normalize(wp.xyz - uCamPos);
  if (uInscatter > 0.0 && depth < 0.99999) {
    float dist = length(wp.xyz - uCamPos);
    float f = clamp((dist - uFogNear) / max(uFogFar - uFogNear, 1.0), 0.0, 1.0);
    float mu = max(dot(ray, uSunDir), 0.0);
    float phase = pow(mu, 6.0) * 0.55 + pow(mu, 40.0) * 0.45;
    col += uSunColor * phase * f * uInscatter;
  }

  if (uUseRays > 0.5) col += texture2D(tRays, vUv).rgb * uRayColor * uRayStrength;

  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

function makeRT(w, h, opts = {}) {
  return new THREE.WebGLRenderTarget(w, h, {
    type: THREE.HalfFloatType,
    format: THREE.RGBAFormat,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    depthBuffer: false,
    generateMipmaps: false,
    ...opts,
  });
}

const _v = new THREE.Vector3();
const _fwd = new THREE.Vector3();
const _sun = new THREE.Vector2();
const _m = new THREE.Matrix4();
const _size = new THREE.Vector2();

export class PostFX {
  constructor(renderer) {
    this.renderer = renderer;
    this.godRays = true;
    this.motionBlur = 0; // 0 = pois, 1 = kevyt, 2 = vahva
    this.dof = false;

    const depthTexture = new THREE.DepthTexture(1, 1);
    depthTexture.type = THREE.UnsignedIntType;
    this.sceneRT = makeRT(1, 1, { depthBuffer: true, depthTexture, samples: 4 });
    this.raysA = makeRT(1, 1);
    this.raysB = makeRT(1, 1);
    this.dofRT = makeRT(1, 1);
    this.focusRT = [makeRT(1, 1, { type: THREE.FloatType, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter }),
      makeRT(1, 1, { type: THREE.FloatType, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter })];
    this.focusIdx = 0;

    const mat = (fs, uniforms, extra = {}) => new THREE.ShaderMaterial({
      uniforms, vertexShader: quadVS, fragmentShader: fs, depthTest: false, depthWrite: false, ...extra,
    });
    this.maskMat = mat(maskFS, {
      tColor: { value: null }, tDepth: { value: depthTexture }, uSun: { value: new THREE.Vector2() }, uAspect: { value: 1 },
    }, { toneMapped: false });
    this.radialMat = mat(radialFS, {
      tInput: { value: null }, uSun: { value: new THREE.Vector2() }, uLength: { value: 0.6 },
    }, { toneMapped: false });
    this.focusMat = mat(focusFS, {
      tDepth: { value: depthTexture }, tPrev: { value: null }, uNear: { value: 0.1 }, uFar: { value: 1500 }, uBlend: { value: 0.1 },
    }, { toneMapped: false });
    this.dofMat = mat(dofFS, {
      tColor: { value: null }, tDepth: { value: depthTexture }, tFocus: { value: null }, uTexel: { value: new THREE.Vector2() },
      uNear: { value: 0.1 }, uFar: { value: 1500 }, uMaxR: { value: 6 },
    }, { toneMapped: false });
    this.compMat = mat(compositeFS, {
      tColor: { value: null }, tDepth: { value: depthTexture }, tRays: { value: null }, tDof: { value: null },
      uUseRays: { value: 0 }, uUseDof: { value: 0 }, uRayStrength: { value: 0 }, uRayColor: { value: new THREE.Color() },
      uInvViewProj: { value: new THREE.Matrix4() }, uPrevViewProj: { value: new THREE.Matrix4() }, uMBScale: { value: 0 },
      uNear: { value: 0.1 }, uFar: { value: 1500 }, uCamPos: { value: new THREE.Vector3() },
      uSunDir: { value: new THREE.Vector3() }, uSunColor: { value: new THREE.Color() }, uInscatter: { value: 0 },
      uFogNear: { value: 50 }, uFogFar: { value: 330 },
    });

    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.compMat);
    this.quad.frustumCulled = false;
    this.quadScene = new THREE.Scene();
    this.quadScene.add(this.quad);
    this.quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.prevViewProj = new THREE.Matrix4();
    this.hasPrev = false;
    this.w = 0;
    this.h = 0;
  }

  get active() {
    return this.godRays || this.motionBlur > 0 || this.dof;
  }

  _resize() {
    this.renderer.getDrawingBufferSize(_size);
    const w = Math.max(1, Math.floor(_size.x));
    const h = Math.max(1, Math.floor(_size.y));
    if (w === this.w && h === this.h) return;
    this.w = w;
    this.h = h;
    this.sceneRT.setSize(w, h);
    const hw = Math.max(1, w >> 1), hh = Math.max(1, h >> 1);
    this.raysA.setSize(hw, hh);
    this.raysB.setSize(hw, hh);
    this.dofRT.setSize(hw, hh);
    this.dofMat.uniforms.uTexel.value.set(1 / hw, 1 / hh);
    this.maskMat.uniforms.uAspect.value = w / h;
  }

  _pass(material, target) {
    this.quad.material = material;
    this.renderer.setRenderTarget(target);
    this.renderer.render(this.quadScene, this.quadCam);
  }

  // Piirrä maailma tehosteineen ruudulle. env: aurinko, sumu ja sää.
  render(scene, camera, env, dt) {
    const r = this.renderer;
    if (!this.active) {
      r.setRenderTarget(null);
      r.clear();
      r.render(scene, camera);
      this.hasPrev = false;
      return;
    }
    this._resize();
    r.setRenderTarget(this.sceneRT);
    r.clear();
    r.render(scene, camera);

    const near = camera.near, far = camera.far;
    const viewProj = _m.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    const cu = this.compMat.uniforms;
    cu.tColor.value = this.sceneRT.texture;
    cu.uInvViewProj.value.copy(viewProj).invert();
    cu.uNear.value = near;
    cu.uFar.value = far;
    cu.uCamPos.value.copy(camera.position);

    // --- Valonsäteet
    let rays = 0;
    const sunUp = env.sunDir.y > -0.02;
    if (this.godRays && sunUp) {
      _v.copy(camera.position).addScaledVector(env.sunDir, 800).project(camera);
      const facing = camera.getWorldDirection(_fwd).dot(env.sunDir);
      const onScreen = 1 - THREE.MathUtils.smoothstep(Math.max(Math.abs(_v.x), Math.abs(_v.y)), 1.2, 2.2);
      const w = env.w;
      // Matala aurinko, usva ja kosteus vahvistavat säteitä.
      const low = 1 - THREE.MathUtils.smoothstep(env.sunDir.y, 0.15, 0.75) * 0.6;
      rays = THREE.MathUtils.smoothstep(facing, 0.0, 0.35) * onScreen * env.daylight * low
        * (0.55 + w.haze * 0.8 + env.humid * 0.9) * (1 - w.cloud * 0.5) * (w.vis < 80 ? 0.3 : 1);
      if (rays > 0.01) {
        const sun = _sun.set(_v.x * 0.5 + 0.5, _v.y * 0.5 + 0.5);
        this.maskMat.uniforms.tColor.value = this.sceneRT.texture;
        this.maskMat.uniforms.uSun.value.copy(sun);
        this._pass(this.maskMat, this.raysA);
        this.radialMat.uniforms.uSun.value.copy(sun);
        this.radialMat.uniforms.tInput.value = this.raysA.texture;
        this.radialMat.uniforms.uLength.value = 0.65;
        this._pass(this.radialMat, this.raysB);
        this.radialMat.uniforms.tInput.value = this.raysB.texture;
        this.radialMat.uniforms.uLength.value = 0.28;
        this._pass(this.radialMat, this.raysA);
        cu.tRays.value = this.raysA.texture;
        cu.uRayColor.value.copy(env.sun.color);
      }
    }
    cu.uUseRays.value = rays > 0.01 ? 1 : 0;
    cu.uRayStrength.value = rays * 1.35;

    // --- Syväterävyys
    if (this.dof) {
      const prev = this.focusRT[this.focusIdx];
      const next = this.focusRT[1 - this.focusIdx];
      const fu = this.focusMat.uniforms;
      fu.tPrev.value = prev.texture;
      fu.uNear.value = near;
      fu.uFar.value = far;
      fu.uBlend.value = 1 - Math.exp(-Math.max(dt, 0.001) * 5);
      this._pass(this.focusMat, next);
      this.focusIdx = 1 - this.focusIdx;
      const du = this.dofMat.uniforms;
      du.tColor.value = this.sceneRT.texture;
      du.tFocus.value = next.texture;
      du.uNear.value = near;
      du.uFar.value = far;
      this._pass(this.dofMat, this.dofRT);
      cu.tDof.value = this.dofRT.texture;
    }
    cu.uUseDof.value = this.dof ? 1 : 0;

    // --- Liike-epäterävyys: nopeus edellisen ruudun kamerasta.
    if (this.motionBlur > 0 && this.hasPrev && dt > 0) {
      const strength = this.motionBlur === 2 ? 0.9 : 0.45;
      cu.uMBScale.value = Math.min(2.5, strength * (1 / 60) / Math.max(dt, 1 / 240));
      cu.uPrevViewProj.value.copy(this.prevViewProj);
    } else {
      cu.uMBScale.value = 0;
    }
    this.prevViewProj.copy(viewProj);
    this.hasPrev = true;

    // --- Ilmakehän hehku
    cu.uSunDir.value.copy(env.sunDir);
    cu.uSunColor.value.copy(env.sky.uniforms.uSunColor.value).multiplyScalar(env.sky.uniforms.uSunVisible.value);
    cu.uInscatter.value = 0.9 * env.daylight * (1 - env.w.cloud * 0.6);
    cu.uFogNear.value = env.scene.fog.near;
    cu.uFogFar.value = env.scene.fog.far;

    this._pass(this.compMat, null);
  }
}
