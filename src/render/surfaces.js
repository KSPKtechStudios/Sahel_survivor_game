// Sessio 23: oikeat pintatekstuurit (CC0, ambientCG). Maasto saa maalajien
// mukaan sekoitetut väri- ja normaalikartat; mallit (puut, kivet, laudat)
// saavat kolmitasoprojektion mallin omissa koordinaateissa, joten tekstuuri
// ei liu'u liikkuvassa mallissa eikä tarvitse UV-koordinaatteja.
//
// Värit säilyvät taiteellisesti ennallaan: tekstuuri kertoo vain yksityiskohdat
// (tekstuuri / sen keskiväri), ja vertex-väri antaa sävyn.
import * as THREE from 'three';
import { applyCoverageMips } from './alphaMips.js';

// Tekstuurien keskivärit (lineaarinen RGB), laskettu valmiiksi.
const AVG = {
  sand: [0.3312, 0.2572, 0.1549],
  soil: [0.283, 0.1729, 0.0866],
  forest: [0.3138, 0.1721, 0.0651],
  rock: [0.0797, 0.0743, 0.0615],
  bark: [0.1935, 0.1347, 0.0821],
  planks: [0.0942, 0.0608, 0.0367],
  // Sessio 24: sammal (maaston laikut) ja sammaloitunut kivi (muinaiset rakenteet).
  moss: [0.0742, 0.1393, 0.0112],
  mossrock: [0.1879, 0.1634, 0.0759],
};
const NAMES = Object.keys(AVG);

// Yhteiset uniformit: kaikki materiaalit jakavat samat tekstuurit.
// uMoss: sammalen määrä rakenteiden yläpinnoilla (sessio 24, kosteus).
export const surfaceUniforms = { uSurfOn: { value: 0 }, uMoss: { value: 0.35 } };
for (const n of NAMES) {
  surfaceUniforms[`tC_${n}`] = { value: null };
  surfaceUniforms[`tN_${n}`] = { value: null };
  surfaceUniforms[`uAvg_${n}`] = { value: new THREE.Vector3(...AVG[n]) };
}

// Sessio 23: lehtiatlas (lehtikortit). Paikkamerkkinä valkoinen pikseli, jotta
// rungot (atlaksen valkoinen nurkka) näkyvät jo ennen latautumista.
const _ph = document.createElement('canvas');
_ph.width = _ph.height = 1;
_ph.getContext('2d').fillStyle = '#fff';
_ph.getContext('2d').fillRect(0, 0, 1, 1);
export const leafTexture = new THREE.Texture(_ph);
leafTexture.colorSpace = THREE.SRGBColorSpace;
leafTexture.needsUpdate = true;

let started = false;
// Lataa tekstuurit (taustalla). Kunnes kaikki ovat ladattu, pinnat näkyvät
// kuten ennen (uSurfOn = 0).
export function loadSurfaces(renderer, onDone = null) {
  if (started) return;
  started = true;
  const manager = new THREE.LoadingManager();
  manager.onLoad = () => {
    surfaceUniforms.uSurfOn.value = 1;
    if (onDone) onDone();
  };
  const loader = new THREE.TextureLoader(manager);
  // Sessio 40: suurin anisotrooppinen suodatus (maasto ja lehdet viistossa).
  const aniso = renderer ? Math.min(16, renderer.capabilities.getMaxAnisotropy()) : 8;
  new THREE.ImageLoader(manager).load('assets/textures/leaves.png', (img) => {
    // Sessio 26: reunavärit ja peittävyyden säilyttävät mipmapit (alphaMips.js).
    leafTexture.anisotropy = aniso;
    applyCoverageMips(leafTexture, img, 0.42);
  });
  for (const n of NAMES) {
    const c = loader.load(`assets/textures/${n}_col.jpg`);
    c.colorSpace = THREE.SRGBColorSpace;
    const nm = loader.load(`assets/textures/${n}_nrm.jpg`);
    for (const t of [c, nm]) {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.anisotropy = aniso;
    }
    surfaceUniforms[`tC_${n}`].value = c;
    surfaceUniforms[`tN_${n}`].value = nm;
  }
}

function declare(names) {
  return names.map((n) => `uniform sampler2D tC_${n};\nuniform sampler2D tN_${n};\nuniform vec3 uAvg_${n};`).join('\n');
}

function bind(shader, names) {
  shader.uniforms.uSurfOn = surfaceUniforms.uSurfOn;
  shader.uniforms.uMoss = surfaceUniforms.uMoss;
  for (const n of names) {
    shader.uniforms[`tC_${n}`] = surfaceUniforms[`tC_${n}`];
    shader.uniforms[`tN_${n}`] = surfaceUniforms[`tN_${n}`];
    shader.uniforms[`uAvg_${n}`] = surfaceUniforms[`uAvg_${n}`];
  }
}

// Yhteiset apufunktiot: toistumista hajottava kaksoisnäyte ja UDN-normaalit.
const COMMON = `
uniform float uSurfOn;
uniform float uMoss;
float surfH(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float surfVN(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(surfH(i), surfH(i + vec2(1.0, 0.0)), f.x), mix(surfH(i + vec2(0.0, 1.0)), surfH(i + vec2(1.0, 1.0)), f.x), f.y);
}
vec3 surfCol(sampler2D t, vec2 uv) {
  vec3 a = texture2D(t, uv).rgb;
  vec3 b = texture2D(t, uv * 0.27 + vec2(0.37, 0.71)).rgb;
  return mix(a, b, 0.32);
}
vec2 surfNrm(sampler2D t, vec2 uv) {
  return texture2D(t, uv).xy * 2.0 - 1.0;
}
vec3 surfRatio(vec3 c, vec3 avg, float k) {
  return mix(vec3(1.0), clamp(c / max(avg, vec3(0.002)), vec3(0.15), vec3(2.6)), k);
}`;

// --- Maasto ------------------------------------------------------------------

const TERRAIN = ['sand', 'soil', 'forest', 'rock', 'moss'];

export function applyTerrainSurfaces(material) {
  const prev = material.onBeforeCompile;
  material.onBeforeCompile = (shader, renderer) => {
    if (prev) prev(shader, renderer);
    bind(shader, TERRAIN);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
attribute vec4 groundW;
varying vec4 vGW;
varying vec3 vTerW;
varying vec3 vTerN;`)
      .replace('#include <project_vertex>', `#include <project_vertex>
vGW = groundW;
vTerW = (modelMatrix * vec4(transformed, 1.0)).xyz;
vTerN = normalize(mat3(modelMatrix) * objectNormal);`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
${declare(TERRAIN)}
varying vec4 vGW;
varying vec3 vTerW;
varying vec3 vTerN;
${COMMON}
vec3 terNw;
float terH(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float terVN(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(terH(i), terH(i + vec2(1.0, 0.0)), f.x), mix(terH(i + vec2(0.0, 1.0)), terH(i + vec2(1.0, 1.0)), f.x), f.y);
}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
  terNw = normalize(vTerN);
  if (uSurfOn > 0.5) {
    vec4 w = max(vGW, vec4(0.0));
    w /= max(w.x + w.y + w.z + w.w, 0.001);
    float dist = length(vTerW - cameraPosition);
    float k = mix(0.95, 0.45, smoothstep(40.0, 260.0, dist));
    vec3 ratio = vec3(0.0);
    vec3 nAcc = vec3(0.0);
    vec2 uv = vTerW.xz;
    // Tasaiset maalajit: projektio ylhäältä.
    if (w.x > 0.01) {
      vec2 u = uv / 4.5;
      ratio += w.x * surfRatio(surfCol(tC_sand, u), uAvg_sand, k);
      vec2 tn = surfNrm(tN_sand, u) * 0.8;
      nAcc += w.x * vec3(tn.x + terNw.x, terNw.y, tn.y + terNw.z);
    }
    if (w.y > 0.01) {
      vec2 u = uv / 3.5;
      ratio += w.y * surfRatio(surfCol(tC_soil, u), uAvg_soil, k);
      vec2 tn = surfNrm(tN_soil, u) * 0.9;
      nAcc += w.y * vec3(tn.x + terNw.x, terNw.y, tn.y + terNw.z);
    }
    if (w.z > 0.01) {
      vec2 u = uv / 3.0;
      ratio += w.z * surfRatio(surfCol(tC_forest, u), uAvg_forest, k);
      vec2 tn = surfNrm(tN_forest, u) * 0.9;
      nAcc += w.z * vec3(tn.x + terNw.x, terNw.y, tn.y + terNw.z);
    }
    // Kallio: kolmitasoprojektio (jyrkät rinteet eivät veny).
    if (w.w > 0.01) {
      vec3 bw = pow(abs(terNw), vec3(4.0));
      bw /= bw.x + bw.y + bw.z;
      vec3 p = vTerW / 6.0;
      vec3 c = surfCol(tC_rock, p.zy) * bw.x + surfCol(tC_rock, p.xz) * bw.y + surfCol(tC_rock, p.xy) * bw.z;
      ratio += w.w * surfRatio(c, uAvg_rock, k);
      vec2 nx = surfNrm(tN_rock, p.zy), ny = surfNrm(tN_rock, p.xz), nz = surfNrm(tN_rock, p.xy);
      // UDN-sekoitus: projektioakselin komponentti pysyy pinnan normaalina.
      vec3 tx = vec3(terNw.x, nx.y + terNw.y, nx.x + terNw.z);
      vec3 ty = vec3(ny.x + terNw.x, terNw.y, ny.y + terNw.z);
      vec3 tz = vec3(nz.x + terNw.x, nz.y + terNw.y, terNw.z);
      nAcc += w.w * normalize(tx * bw.x + ty * bw.y + tz * bw.z);
    }
    diffuseColor.rgb *= ratio;
    // Sessio 24: sammalmatto metsämaalla (sademetsä, keidas, kosteikko)
    // laikuittain tasaisilla kohdilla; reunat repaleisia.
    if (w.z > 0.05) {
      float mN = terVN(uv / 7.0) * 0.6 + terVN(uv / 2.1 + 13.0) * 0.28 + terVN(uv * 1.7) * 0.12;
      float mAmt = clamp(w.z * 1.2, 0.0, 1.0) * smoothstep(0.44, 0.6, mN) * smoothstep(0.78, 0.95, terNw.y);
      if (mAmt > 0.01) {
        vec2 mu = uv / 2.2;
        vec3 mc = surfCol(tC_moss, mu) * 0.75;
        diffuseColor.rgb = mix(diffuseColor.rgb, mix(mc, mc * ratio / max(dot(ratio, vec3(0.333)), 0.2), 0.2), mAmt);
        vec2 mn = surfNrm(tN_moss, mu);
        nAcc = mix(nAcc, vec3(mn.x + terNw.x, terNw.y, mn.y + terNw.z), mAmt);
      }
    }
    terNw = normalize(mix(terNw, normalize(nAcc), k));
  }`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
  if (uSurfOn > 0.5) normal = normalize((viewMatrix * vec4(terNw, 0.0)).xyz);`);
  };
  const prevKey = material.customProgramCacheKey;
  material.customProgramCacheKey = () => `${prevKey ? prevKey.call(material) : ''}-terrainSurf`;
  return material;
}

// --- Mallit ------------------------------------------------------------------
// layers: [{ layer, scale, strength, normal, mask }]
//   layer: 'bark' | 'rock' | 'planks' | 'soil' | 'sand'; scale = tekstuurin koko (m)
//   mask (vertex-värin mukaan): 'none', 'notGreen' (lehdet jäävät ennalleen),
//   'darkWood' (tummat ruskeat laudat), 'warm' (punertava savi), 'grey' (kivi).
// Lyhyesti: addSurfaceDetail(material, 'bark', { scale, strength, mask }).
const MASKS = {
  none: '1.0',
  notGreen: 'sNotGreen',
  darkWood: 'sDark',
  warm: '(1.0 - sDark) * sNotGreen * smoothstep(2.0, 3.0, sRB)',
  grey: '(1.0 - sDark) * sNotGreen * (1.0 - smoothstep(1.6, 2.4, sRB))',
  // Sessio 24: yläpinnat (sammal kasvaa sinne, minne sade ja lehdet kertyvät).
  top: 'sNotGreen * smoothstep(0.35, 0.85, n0.y)',
};

export function addSurfaceDetail(material, layerOrList, opts = {}) {
  const list = Array.isArray(layerOrList) ? layerOrList : [{ layer: layerOrList, ...opts }];
  const layers = list.map((l) => ({ scale: 1.2, strength: 0.85, normal: 0.9, mask: 'none', ...l }));
  const names = [...new Set(layers.map((l) => l.layer))];
  const prev = material.onBeforeCompile;
  // cover: true = peittävä kerros (oma väri, esim. sammal), muuten
  // yksityiskohta vertex-värin päällä (tekstuuri / keskiväri).
  const blocks = layers.map((l) => (l.cover ? `
  {
    float m = ${MASKS[l.mask]} * uMoss;
    if (m > 0.01) {
      float cn = surfVN(vSurfP.xz * 0.8 + vSurfP.y * 0.3) * 0.65 + surfVN(vSurfP.xz * 2.9 + 7.0) * 0.35;
      float cov = m * smoothstep(0.42, 0.62, cn) * ${l.strength.toFixed(3)};
      vec3 p = vSurfP / ${l.scale.toFixed(3)};
      vec3 c = surfCol(tC_${l.layer}, p.zy) * bw.x + surfCol(tC_${l.layer}, p.xz) * bw.y + surfCol(tC_${l.layer}, p.xy) * bw.z;
      sCover = mix(sCover, c * 0.8, cov);
      sCoverK = max(sCoverK, cov);
    }
  }` : `
  {
    float m = ${MASKS[l.mask]};
    if (m > 0.01) {
      float k = m * mix(${l.strength.toFixed(3)}, ${(l.strength * 0.5).toFixed(3)}, sFar);${l.weather ? `
      // Harmaantunut (sään kuluttama) puu: vaalea, hopeinen ja vähemmän kylläinen.
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(dot(diffuseColor.rgb, vec3(0.3333))) * vec3(1.45, 1.42, 1.38), m * ${l.weather.toFixed(3)});` : ''}
      vec3 p = vSurfP / ${l.scale.toFixed(3)};
      vec3 c = surfCol(tC_${l.layer}, p.zy) * bw.x + surfCol(tC_${l.layer}, p.xz) * bw.y + surfCol(tC_${l.layer}, p.xy) * bw.z;
      sRatio *= surfRatio(c, uAvg_${l.layer}, k);
      float nk = ${l.normal.toFixed(3)};
      vec2 nx = surfNrm(tN_${l.layer}, p.zy) * nk, ny = surfNrm(tN_${l.layer}, p.xz) * nk, nz = surfNrm(tN_${l.layer}, p.xy) * nk;
      vec3 tx = vec3(n0.x, nx.y + n0.y, nx.x + n0.z);
      vec3 ty = vec3(ny.x + n0.x, n0.y, ny.y + n0.z);
      vec3 tz = vec3(nz.x + n0.x, nz.y + n0.y, n0.z);
      sNAcc += k * normalize(tx * bw.x + ty * bw.y + tz * bw.z);
      surfK += k;
    }
  }`)).join('');
  material.onBeforeCompile = (shader, renderer) => {
    if (prev) prev(shader, renderer);
    bind(shader, names);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
varying vec3 vSurfP;
varying vec3 vSurfN;
varying vec3 vSurfAx;
varying vec3 vSurfAy;
varying vec3 vSurfAz;`)
      .replace('#include <project_vertex>', `#include <project_vertex>
{
  // Mallin omat koordinaatit (instanssin mittakaava mukana) ja akselit näkymässä.
  mat3 im = mat3(1.0);
#ifdef USE_INSTANCING
  im = mat3(instanceMatrix);
#endif
  vec3 sc = vec3(length(im[0]), length(im[1]), length(im[2])) * vec3(length(modelMatrix[0].xyz), length(modelMatrix[1].xyz), length(modelMatrix[2].xyz));
  vSurfP = position * sc;
  vSurfN = normalize(normal);
  vSurfAx = normalize(normalMatrix * (im * vec3(1.0, 0.0, 0.0)));
  vSurfAy = normalize(normalMatrix * (im * vec3(0.0, 1.0, 0.0)));
  vSurfAz = normalize(normalMatrix * (im * vec3(0.0, 0.0, 1.0)));
}`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
${declare(names)}
varying vec3 vSurfP;
varying vec3 vSurfN;
varying vec3 vSurfAx;
varying vec3 vSurfAy;
varying vec3 vSurfAz;
${COMMON}
vec3 surfNl;
float surfK;`)
      .replace('#include <color_fragment>', `#include <color_fragment>
  surfK = 0.0;
  surfNl = normalize(vSurfN);
  if (uSurfOn > 0.5) {
#ifdef USE_COLOR
    vec3 vc = vColor.rgb;
#else
    vec3 vc = vec3(0.3);
#endif
    float sLum = dot(vc, vec3(0.299, 0.587, 0.114));
    float sRB = vc.r / max(vc.b, 0.01);
    float sNotGreen = 1.0 - smoothstep(-0.004, 0.03, vc.g - max(vc.r, vc.b * 1.1));
    float sDark = (1.0 - smoothstep(0.1, 0.16, sLum)) * smoothstep(1.4, 2.2, sRB) * sNotGreen;
    float sFar = smoothstep(25.0, 120.0, length(vViewPosition));
#ifdef USE_MAP
    // Lehtikortit (oma tekstuuri atlaksessa) jäävät ennalleen: vain atlaksen
    // valkoista nurkkaa käyttävät osat (rungot, oksat) saavat pintatekstuurin.
    float sUntex = step(0.985, vMapUv.x) * step(0.97, vMapUv.y);
    sNotGreen *= sUntex;
    sDark *= sUntex;
#endif
    vec3 n0 = surfNl;
    vec3 bw = pow(abs(n0), vec3(4.0));
    bw /= bw.x + bw.y + bw.z;
    vec3 sRatio = vec3(1.0);
    vec3 sNAcc = vec3(0.0);
    vec3 sCover = vec3(0.0);
    float sCoverK = 0.0;
    ${blocks}
    diffuseColor.rgb = mix(diffuseColor.rgb * sRatio, sCover, sCoverK);
    if (surfK > 0.0) surfNl = normalize(mix(n0, normalize(sNAcc), min(1.0, surfK)));
  }`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
  if (surfK > 0.0) {
    vec3 nv = normalize(surfNl.x * vSurfAx + surfNl.y * vSurfAy + surfNl.z * vSurfAz);
    // Taustapuoli (kaksipuoliset pinnat) käännetään kuten three tekee.
    normal = gl_FrontFacing ? nv : -nv;
  }`);
  };
  const key = layers.map((l) => `${l.layer}:${l.mask}:${l.scale}:${l.strength}:${l.normal}:${l.cover ? 1 : 0}:${l.weather || 0}`).join('|');
  const prevKey = material.customProgramCacheKey;
  material.customProgramCacheKey = () => `${prevKey ? prevKey.call(material) : ''}-surf-${key}`;
  return material;
}
