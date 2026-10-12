// Vesi: materiaali (aallot, heijastus, vaahto, virtaus) ja aaltojen korkeus
// pelilogiikalle (uinti, kelluvat esineet).
//
// Aallot ovat Gerstner-aaltoja: avomerellä isoja ja sään mukaan kasvavia,
// järvillä pieniä ja joissa lähes olemattomia (aData.y kertoo, kuinka avointa
// vesi on). Pelaajan ympärillä vesi väreilee (ripples.js), ja väreily näkyy
// sekä pinnan muodossa että valaistuksessa.
import * as THREE from 'three';
import { WAVES, VERTEX_WAVES } from '../world/waves.js';

export { waveHeight } from '../world/waves.js';

// Saumaton normaalikartta pienille väreille (lasketaan kerran käynnistyksessä).
function createNormalTexture(size = 256) {
  const H = new Float32Array(size * size);
  const lattice = (n, seed) => {
    const g = new Float32Array(n * n);
    let s = seed;
    for (let i = 0; i < g.length; i++) {
      s = (s * 1664525 + 1013904223) >>> 0;
      g[i] = s / 4294967296;
    }
    return g;
  };
  const octaves = [[8, 1.0, 11], [16, 0.5, 23], [32, 0.25, 37], [64, 0.12, 51]];
  for (const [n, amp, seed] of octaves) {
    const g = lattice(n, seed);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const fx = (x / size) * n, fy = (y / size) * n;
        const ix = Math.floor(fx), iy = Math.floor(fy);
        const tx = fx - ix, ty = fy - iy;
        const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
        const x0 = ix % n, x1 = (ix + 1) % n, y0 = iy % n, y1 = (iy + 1) % n;
        const a = g[y0 * n + x0], b = g[y0 * n + x1], c = g[y1 * n + x0], d = g[y1 * n + x1];
        H[y * size + x] += amp * ((a + (b - a) * sx) + ((c + (d - c) * sx) - (a + (b - a) * sx)) * sy);
      }
    }
  }
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const l = H[y * size + ((x + size - 1) % size)], r = H[y * size + ((x + 1) % size)];
      const u = H[((y + size - 1) % size) * size + x], d = H[((y + 1) % size) * size + x];
      let nx = (l - r) * 6, ny = (u - d) * 6;
      const nz = 1;
      const len = Math.hypot(nx, ny, nz);
      const o = (y * size + x) * 4;
      data[o] = ((nx / len) * 0.5 + 0.5) * 255;
      data[o + 1] = ((ny / len) * 0.5 + 0.5) * 255;
      data[o + 2] = ((nz / len) * 0.5 + 0.5) * 255;
      data[o + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.colorSpace = THREE.NoColorSpace;
  tex.needsUpdate = true;
  return tex;
}

const wavesGLSL = WAVES.map(([a, L, f, , p]) => `vec4(${a.toFixed(3)}, ${L.toFixed(3)}, ${f.toFixed(3)}, ${p.toFixed(3)})`).join(',\n  ');
const steepGLSL = WAVES.map((w) => w[3].toFixed(3)).join(', ');

// Aaltojen taulukko ja suunta: ensimmäinen kohti maailman keskustaa (rantaa),
// muut kiinteistä suunnista tuulen keskisuunnan ympäriltä.
const wavesCommon = /* glsl */ `
const vec4 WAVES[${WAVES.length}] = vec4[](
  ${wavesGLSL}
);
const float STEEP[${WAVES.length}] = float[](${steepGLSL});
vec2 waveDir(int i, vec2 p, float a) {
  if (i == 0) {
    float l = length(p);
    return l > 1.0 ? -p / l : vec2(1.0, 0.0);
  }
  float c = cos(a), s = sin(a);
  return vec2(uSwellDir.x * c - uSwellDir.y * s, uSwellDir.x * s + uSwellDir.y * c);
}
`;

const vertexShader = /* glsl */ `
#include <common>
#include <fog_pars_vertex>
uniform float uTime;
uniform float uWaveAmp;
uniform vec2 uSwellDir;
uniform sampler2D uRipple;
uniform vec4 uRippleRect;   // x0, z0, koko, voimakkuus
attribute vec4 aData;       // syvyys, avoimuus, virtaus x, virtaus z
attribute vec3 aDeep;
attribute vec3 aShallow;
varying vec3 vWorld;
varying vec2 vBase;
varying float vAmp;
varying vec4 vData;
varying vec3 vDeep;
varying vec3 vShallow;
varying float vCrest;

${wavesCommon}

void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  float amp = aData.y * uWaveAmp;
  vec3 disp = vec3(0.0);
  float crest = 0.0;
  vBase = wp.xz;
  if (amp > 0.0005) {
    for (int i = 0; i < ${VERTEX_WAVES}; i++) {
      vec4 W = WAVES[i];
      vec2 d = waveDir(i, wp.xz, W.x);
      float k = 6.2831853 / W.y;
      float w = sqrt(9.81 * k);
      float A = amp * W.z;
      float ph = k * dot(d, wp.xz) - w * uTime + W.w;
      float sn = sin(ph), cs = cos(ph);
      float Q = min(STEEP[i] / max(k * A * ${WAVES.length}.0, 1e-4), 1.0);
      disp.xz += Q * A * d * cs;
      disp.y += A * sn;
      crest += sn * W.z;
    }
  }
  // Väreily pelaajan ympärillä
  vec2 ruv = (wp.xz - uRippleRect.xy) / uRippleRect.z;
  if (ruv.x > 0.0 && ruv.y > 0.0 && ruv.x < 1.0 && ruv.y < 1.0) {
    vec2 e = abs(ruv - 0.5) * 2.0;
    float fade = 1.0 - smoothstep(0.75, 1.0, max(e.x, e.y));
    disp.y += texture2D(uRipple, ruv).r * uRippleRect.w * fade;
  }
  // Rantaviivalla ei aaltoja, ettei vesi nouse maan päälle.
  disp *= smoothstep(-0.2, 0.6, aData.x);
  wp.xyz += disp;
  vWorld = wp.xyz;
  vData = aData;
  vDeep = aDeep;
  vShallow = aShallow;
  vAmp = amp * smoothstep(-0.2, 0.6, aData.x);
  vCrest = crest / 2.02;
  vec4 mvPosition = viewMatrix * wp;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
`;

const fragmentShader = /* glsl */ `
#include <common>
#include <fog_pars_fragment>
uniform float uTime;
uniform float uWaveAmp;
uniform vec2 uSwellDir;
uniform vec2 uScroll;
uniform sampler2D uNormalMap;
uniform sampler2D uRipple;
uniform vec4 uRippleRect;
uniform vec2 uRippleTexel;
uniform vec3 uZenith;
uniform vec3 uHorizon;
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform float uSunVisible;
uniform vec3 uLightDir;
uniform vec3 uLightColor;
uniform float uLightI;
uniform vec3 uAmbient;
varying vec3 vWorld;
varying vec2 vBase;
varying float vAmp;
varying vec4 vData;
varying vec3 vDeep;
varying vec3 vShallow;
varying float vCrest;

${wavesCommon}

vec2 nrm(vec2 uv) {
  return texture2D(uNormalMap, uv).xy * 2.0 - 1.0;
}

void main() {
  vec3 V = normalize(cameraPosition - vWorld);
  float depth = vData.x;
  vec2 flow = vData.zw;
  float flowSpeed = length(flow);

  // Aaltojen normaali (kaikki aallot, myös lyhyet) laskettuna pikselikohtaisesti.
  vec3 waveN = vec3(0.0, 1.0, 0.0);
  if (vAmp > 0.0005) {
    for (int i = 0; i < ${WAVES.length}; i++) {
      vec4 W = WAVES[i];
      vec2 d = waveDir(i, vBase, W.x);
      float k = 6.2831853 / W.y;
      float w = sqrt(9.81 * k);
      float A = vAmp * W.z;
      float ph = k * dot(d, vBase) - w * uTime + W.w;
      float Q = min(STEEP[i] / max(k * A * ${WAVES.length}.0, 1e-4), 1.0);
      waveN.xz -= d * k * A * cos(ph);
      waveN.y -= Q * k * A * sin(ph);
    }
  }

  // Pienet väreet: kaksi liikkuvaa kerrosta normaalikartasta, joissa virtaus.
  vec2 p = vWorld.xz;
  vec2 dn;
  if (flowSpeed > 0.02) {
    float ph0 = fract(uTime * 0.22);
    float ph1 = fract(uTime * 0.22 + 0.5);
    float wA = 1.0 - abs(ph0 * 2.0 - 1.0);
    vec2 base = p / 5.0;
    vec2 a = nrm(base - flow * ph0 * 0.9) * wA + nrm(base - flow * ph1 * 0.9 + 0.5) * (1.0 - wA);
    vec2 b = nrm(base * 2.3 - flow * ph0 * 2.0 + 0.3) * wA + nrm(base * 2.3 - flow * ph1 * 2.0 + 0.8) * (1.0 - wA);
    dn = a * 0.55 + b * 0.35;
  } else {
    dn = nrm(p / 7.0 + uScroll) * 0.5 + nrm(p / 2.9 - uScroll.yx * 1.6) * 0.35 + nrm(p / 1.3 + vec2(uScroll.x, -uScroll.y) * 2.4) * 0.15;
  }
  float calm = 0.3 + 0.7 * clamp(vData.y * 1.5 + flowSpeed * 0.35 + 0.15, 0.0, 1.0);
  dn *= calm * (0.55 + uWaveAmp * 0.25);

  // Väreily (pelaajan liike, roiskeet)
  float rippleFoam = 0.0;
  vec2 ruv = (p - uRippleRect.xy) / uRippleRect.z;
  if (ruv.x > 0.0 && ruv.y > 0.0 && ruv.x < 1.0 && ruv.y < 1.0) {
    vec2 e = abs(ruv - 0.5) * 2.0;
    float fade = 1.0 - smoothstep(0.75, 1.0, max(e.x, e.y));
    float hl = texture2D(uRipple, ruv - vec2(uRippleTexel.x, 0.0)).r;
    float hr = texture2D(uRipple, ruv + vec2(uRippleTexel.x, 0.0)).r;
    float hd = texture2D(uRipple, ruv - vec2(0.0, uRippleTexel.y)).r;
    float hu = texture2D(uRipple, ruv + vec2(0.0, uRippleTexel.y)).r;
    vec2 g = vec2(hl - hr, hd - hu) * uRippleRect.w * fade;
    dn += g * 9.0;
    rippleFoam = smoothstep(0.05, 0.25, length(g)) * 0.6;
  }

  vec3 n = normalize(vec3(waveN.x + dn.x, waveN.y, waveN.z + dn.y));
  if (dot(n, V) < 0.02) n = normalize(n + V * (0.02 - dot(n, V)));

  // Heijastus: taivaan väri heijastussuunnassa + aurinko.
  float cosT = clamp(dot(n, V), 0.0, 1.0);
  float F = 0.02 + 0.98 * pow(1.0 - cosT, 5.0);
  vec3 R = reflect(-V, n);
  R.y = abs(R.y);
  vec3 sky = mix(uHorizon, uZenith, pow(clamp(R.y, 0.0, 1.0), 0.45));
  float sd = max(dot(R, uSunDir), 0.0);
  sky += uSunColor * (pow(sd, 8.0) * 0.25 + pow(sd, 64.0) * 0.6) * uSunVisible;

  // Vesimassa: matala vesi on vaaleaa ja läpinäkyvää, syvä tummaa.
  float tDeep = 1.0 - exp(-max(depth, 0.0) * 0.45);
  vec3 body = mix(vShallow, vDeep, tDeep);
  float lightUp = max(uLightDir.y, 0.0);
  vec3 lit = body * (uAmbient + uLightColor * uLightI * (0.25 + 0.5 * lightUp));
  // Valo siroaa aallon harjan läpi (vihertävä hehku)
  float sss = pow(max(dot(-V, uLightDir), 0.0), 4.0) * clamp(vCrest, 0.0, 1.0) * clamp(uWaveAmp, 0.0, 1.5);
  lit += vShallow * uLightColor * uLightI * sss * 0.5;

  // Kimallus: terävä auringon heijastus ja laajempi kiilto
  vec3 Hh = normalize(uLightDir + V);
  float nh = max(dot(n, Hh), 0.0);
  float spec = pow(nh, 400.0) * 4.0 + pow(nh, 48.0) * 0.12;

  vec3 col = mix(lit, sky, F) + uLightColor * uLightI * spec;

  // Vaahto: rantaviiva, aallonharjat myrskyssä ja väreily
  float fn = texture2D(uNormalMap, p / 3.7 + uTime * 0.01).b;
  float fn2 = texture2D(uNormalMap, p / 1.7 - uTime * 0.013).r;
  float shore = (1.0 - smoothstep(0.0, 0.3 + vData.y * 0.6, depth)) * smoothstep(-0.02, 0.05, depth);
  // Rantavaahtoa lähinnä meressä; järvillä ja joissa vain häivähdys.
  shore *= mix(0.12, 1.0, smoothstep(0.15, 0.5, vData.y));
  shore *= smoothstep(0.35, 0.65, fn * 0.6 + fn2 * 0.4 + 0.15 * sin(uTime * 1.3 + p.x * 0.4 + p.y * 0.3));
  float crestFoam = smoothstep(0.45, 0.85, vCrest) * smoothstep(0.2, 0.6, uWaveAmp) * vData.y * smoothstep(0.4, 0.7, fn2);
  float rapids = smoothstep(1.3, 1.8, flowSpeed) * smoothstep(0.5, 0.75, fn2) * 0.25;
  // Jyrkkä pinta (pieni putous kahden vesistön välissä) kuohuu valkoisena.
  vec3 geoN = normalize(cross(dFdx(vWorld), dFdy(vWorld)));
  float steep = (1.0 - smoothstep(0.75, 0.93, abs(geoN.y))) * (1.0 - smoothstep(0.1, 0.5, vData.y));
  // Putoava vesi: pystysuuntaiset juovat liikkuvat alaspäin.
  float streak = texture2D(uNormalMap, vec2((p.x + p.y) * 0.9, vWorld.y * 0.45 + uTime * 0.8)).g;
  rapids += steep * (0.25 + 0.45 * smoothstep(0.35, 0.75, streak));
  float foam = clamp(shore + crestFoam + rippleFoam + rapids, 0.0, 1.0);
  vec3 foamCol = uAmbient * 1.1 + uLightColor * uLightI * (0.35 + 0.5 * lightUp);
  col = mix(col, foamCol, foam * 0.85);

  // Läpinäkyvyys: rantaviiva häviää pehmeästi maahan.
  float alpha = mix(0.3, 0.95, smoothstep(0.0, 2.8, depth));
  alpha = max(alpha, F * 0.9);
  alpha = max(alpha, foam * 0.9);
  alpha *= smoothstep(-0.02, 0.12, depth);

  gl_FragColor = vec4(col, alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}
`;

export function createWaterMaterial(sky) {
  const su = sky.uniforms;
  const uniforms = {
    ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
    uTime: { value: 0 },
    uWaveAmp: { value: 0.3 },
    uSwellDir: { value: new THREE.Vector2(-0.7071, 0.7071) },
    uScroll: { value: new THREE.Vector2() },
    uNormalMap: { value: createNormalTexture() },
    uRipple: { value: null },
    uRippleRect: { value: new THREE.Vector4(0, 0, 1, 0) },
    uRippleTexel: { value: new THREE.Vector2(1 / 256, 1 / 256) },
    uZenith: su.uZenith,
    uHorizon: su.uHorizon,
    uSunDir: su.uSunDir,
    uSunColor: su.uSunColor,
    uSunVisible: su.uSunVisible,
    uLightDir: { value: new THREE.Vector3(0, 1, 0) },
    uLightColor: { value: new THREE.Color(1, 1, 1) },
    uLightI: { value: 1 },
    uAmbient: { value: new THREE.Color(0.4, 0.45, 0.5) },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: true,
    fog: true,
  });
  return mat;
}

// Päivitä veden uniformit ympäristöstä (kutsutaan joka ruudulla).
export function updateWaterMaterial(mat, env, elapsed, dt) {
  const u = mat.uniforms;
  u.uTime.value = elapsed;
  u.uSwellDir.value.copy(env.swellDir);
  // Pienten väreiden liike kertyy ajan mukana (ei hyppää tuulen kääntyessä).
  const sp = (0.02 + env.waveAmp * 0.03) * dt;
  u.uScroll.value.x = (u.uScroll.value.x + env.windDir.x * sp) % 1000;
  u.uScroll.value.y = (u.uScroll.value.y + env.windDir.y * sp) % 1000;
  u.uWaveAmp.value = env.waveAmp;
  u.uLightDir.value.copy(env.lightDir);
  u.uLightColor.value.copy(env.lightColor);
  u.uLightI.value = env.lightIntensity;
  u.uAmbient.value.copy(env.hemi.color).multiplyScalar(env.hemi.intensity * 0.6);
}
