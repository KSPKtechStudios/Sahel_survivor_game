// Jaetut materiaalit ja tuulen huojunta (vertex shader -lisäys).
import * as THREE from 'three';
import { applyTerrainSurfaces, addSurfaceDetail, leafTexture } from './surfaces.js';

// Kaikki tuulta käyttävät materiaalit jakavat nämä uniformit.
export const windUniforms = {
  uTime: { value: 0 },
  uWindDir: { value: new THREE.Vector2(-0.7071, 0.7071) }, // harmattan koillisesta
  uWindStrength: { value: 0.3 },
};

// amount: kuinka paljon taipuu suhteessa korkeuteen (y^2).
// flutter: nopean lepatuksen osuus. Korkeille kasveille (bambu) pieni, sillä
// pisteittäin vaihteleva lepatus sai pitkät varret värisemään.
export function addWind(material, amount, flutter = 1) {
  const uAmount = { value: amount };
  const uFlutter = { value: flutter };
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = windUniforms.uTime;
    shader.uniforms.uWindDir = windUniforms.uWindDir;
    shader.uniforms.uWindStrength = windUniforms.uWindStrength;
    shader.uniforms.uWindAmount = uAmount;
    shader.uniforms.uFlutter = uFlutter;
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
uniform float uTime;
uniform vec2 uWindDir;
uniform float uWindStrength;
uniform float uWindAmount;
uniform float uFlutter;`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
#ifdef USE_INSTANCING
{
  vec3 instPos = instanceMatrix[3].xyz;
  float hh = max(position.y, 0.0);
  float ph = uTime * (1.3 + uWindStrength * 2.5) + instPos.x * 0.21 + instPos.z * 0.17;
  float sway = sin(ph) * 0.6 + sin(ph * 2.3 + 1.7) * 0.3 + sin(ph * 5.1 + position.x * 3.0 * uFlutter) * 0.1 * uFlutter;
  float bend = uWindStrength * (0.45 + sway * 0.55) * uWindAmount * hh * hh;
  // Taipuessa latva laskee hieman (pehmeästi, ei terävää käännettä).
  float drop = bend * bend / (2.0 * max(hh, 0.3));
  vec3 worldOff = vec3(uWindDir.x * bend, -drop, uWindDir.y * bend);
  mat3 im = mat3(instanceMatrix);
  float s2 = max(dot(im[0], im[0]), 1e-4);
  transformed += (transpose(im) * worldOff) / s2;
}
#endif`,
      );
  };
  material.customProgramCacheKey = () => 'wind';
  return material;
}

// Sessio 25: lehtien läpikuultavuus (subsurface-tyyppinen). Auringonvalo
// kuultaa lehtien läpi: vastavaloon katsottaessa lehdet hehkuvat, ja
// latvuksen varjon puoli saa vihreää läpäisevää valoa (ei mustaa massaa).
// main.js päivittää auringon suunnan ja värin (sunUniforms).
export const sunUniforms = {
  uTrSunDir: { value: new THREE.Vector3(0, 1, 0) },
  uTrSunCol: { value: new THREE.Color(1, 1, 1) },
};
// leafOnly: vain lehtiatlasta käyttävät kohdat (rungot = atlaksen valkoinen nurkka).
export function addTranslucency(material, k = 0.35, leafOnly = true) {
  const prev = material.onBeforeCompile;
  material.onBeforeCompile = (shader, renderer) => {
    if (prev) prev(shader, renderer);
    shader.uniforms.uTrSunDir = sunUniforms.uTrSunDir;
    shader.uniforms.uTrSunCol = sunUniforms.uTrSunCol;
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
uniform vec3 uTrSunDir;
uniform vec3 uTrSunCol;`)
      .replace('#include <opaque_fragment>', `{
  float trM = 1.0;
#if defined(USE_MAP)
  ${leafOnly ? 'trM = 1.0 - step(0.985, vMapUv.x) * step(0.97, vMapUv.y);' : ''}
#endif
  if (trM > 0.0) {
    vec3 trL = normalize((viewMatrix * vec4(uTrSunDir, 0.0)).xyz);
    vec3 trV = normalize(vViewPosition);
    float trBack = pow(clamp(dot(-trV, trL), 0.0, 1.0), 4.0);
    float trDiff = clamp(-dot(normal, trL), 0.0, 1.0);
    // Läpäisevä valo on vihertävää (lehtivihreä suodattaa).
    vec3 trCol = diffuseColor.rgb * vec3(0.9, 1.15, 0.7);
    outgoingLight += trCol * uTrSunCol * (trBack * 0.7 + trDiff * 0.45 + 0.1) * ${k.toFixed(3)} * trM;
  }
}
#include <opaque_fragment>`);
  };
  const prevKey = material.customProgramCacheKey;
  material.customProgramCacheKey = () => `${prevKey ? prevKey.call(material) : ''}-tr${k}${leafOnly ? 'L' : ''}`;
  return material;
}

// Sessio 46: lehvästöjen "pikselimössö" ja välkyntä kameraa käännettäessä.
// Syy: kaukaisissa latvuksissa on satoja muutaman pikselin kokoisia
// lehtikortteja, joiden kova alfareuna ja tekstuurin pienet yksityiskohdat
// (tummat ja vaaleat lehdet, pikselin kokoiset reiät) vaihtuvat pikselistä
// toiseen pienimmästäkin liikkeestä. Korjaus:
// 1) yli 4 m:n päässä lehdet luetaan pehmeämmältä mipmap-tasolta (20 m:stä
//    alkaen yhden tason verran); lähellä tekstuuri on ennallaan;
// 2) alfareuna muuttuu MSAA:n peittävyydeksi keskitetysti noin 1,5 pikselin
//    matkalla (three: 1 pikseli ja vain rajan yläpuolella), joten reunat ja
//    reiät eivät hypi pikselistä toiseen.
// Mittaus (sama näkymä, kamera kääntyy alle pikselin): latvusten muutos
// pieneni 15-33 %. Käytä uloimpana kääreenä (korvaa map- ja alfakohdan).
const FOLIAGE_MAP = THREE.ShaderChunk.map_fragment.replace(
  'texture2D( map, vMapUv )',
  'texture2D( map, vMapUv, smoothstep( 4.0, 20.0, vViewPosition.z ) )',
);
export function softFoliage(material) {
  const prev = material.onBeforeCompile;
  material.onBeforeCompile = (shader, renderer) => {
    if (prev) prev(shader, renderer);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <map_fragment>', FOLIAGE_MAP)
      .replace('#include <alphatest_fragment>', `#ifdef USE_ALPHATEST
  diffuseColor.a = clamp((diffuseColor.a - alphaTest) / max(fwidth(diffuseColor.a) * 1.5, 1e-4) + 0.5, 0.0, 1.0);
  if (diffuseColor.a <= 0.0) discard;
#endif`);
  };
  const prevKey = material.customProgramCacheKey;
  material.customProgramCacheKey = () => `${prevKey ? prevKey.call(material) : ''}-soft`;
  return material;
}

// Märkyys (sademetsä, sade): pinnat tummuvat, siloittuvat (terävämmät
// auringon heijastukset) ja heijastavat taivasta viistossa kulmassa.
// Märkyys vaihtelee laikuittain, ettei pinta näytä tasaisen sumuiselta.
// uWet 0..1 (environment.js), uWetSky = taivaan väri heijastukseen,
// uRain = sateen voimakkuus (lammikoiden renkaat).
export const wetUniforms = {
  uWet: { value: 0 },
  uWetSky: { value: new THREE.Color(0.5, 0.55, 0.6) },
  uRain: { value: 0 },
  uPuddle: { value: 0 }, // sateen jälkeinen vesi lammikoissa 0..1 (kuivuu hitaasti)
};

const WET_NOISE = `
float wetH(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float wetN(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(wetH(i), wetH(i + vec2(1.0, 0.0)), f.x), mix(wetH(i + vec2(0.0, 1.0)), wetH(i + vec2(1.0, 1.0)), f.x), f.y);
}`;

// k = märkyyden voimakkuus, sky = taivasheijastuksen voimakkuus (maassa
// vesikalvot heijastavat taivasta, lehdissä vain vähän).
export function addWet(material, k = 1, sky = 1) {
  const prev = material.onBeforeCompile;
  const uK = { value: k };
  const uSky = { value: sky };
  material.onBeforeCompile = (shader, renderer) => {
    if (prev) prev(shader, renderer);
    shader.uniforms.uWet = wetUniforms.uWet;
    shader.uniforms.uWetSky = wetUniforms.uWetSky;
    shader.uniforms.uWetK = uK;
    shader.uniforms.uWetSkyK = uSky;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
varying vec3 vWetW;`)
      .replace('#include <project_vertex>', `#include <project_vertex>
{
  vec4 wp = vec4(transformed, 1.0);
#ifdef USE_INSTANCING
  wp = instanceMatrix * wp;
#endif
  vWetW = (modelMatrix * wp).xyz;
}`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
uniform float uWet;
uniform vec3 uWetSky;
uniform float uWetK;
uniform float uWetSkyK;
varying vec3 vWetW;
${WET_NOISE}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
  float wetAmt = 0.0, wetPool = 0.0;
  if (uWet * uWetK > 0.001) {
    float wetN1 = wetN(vWetW.xz * 0.23) * 0.7 + wetN(vWetW.xz * 1.1) * 0.3;
    wetAmt = uWet * uWetK * (0.6 + 0.4 * smoothstep(0.3, 0.7, wetN1));
    // Vesikalvot: laikut, jotka kiiltävät kuin peili.
    wetPool = uWet * uWetK * uWetSkyK * smoothstep(0.6, 0.7, wetN1);
    float wetL = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
    diffuseColor.rgb = max(mix(vec3(wetL), diffuseColor.rgb, 1.0 + 0.35 * wetAmt), 0.0) * (1.0 - 0.25 * wetAmt - 0.2 * wetPool);
  }`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
  roughnessFactor = mix(mix(roughnessFactor, 0.28, wetAmt), 0.1, wetPool);`)
      .replace('#include <lights_physical_fragment>', `#include <lights_physical_fragment>
  material.specularColor *= 1.0 + 1.5 * wetAmt;`)
      .replace('#include <opaque_fragment>', `if (wetAmt > 0.0) {
    float nv = clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0);
    float fw = 0.02 + 0.98 * pow(1.0 - nv, 5.0);
    float up = smoothstep(0.6, 0.9, inverseTransformDirection(normal, viewMatrix).y);
    // Metsässä heijastuu enimmäkseen tumma latvusto: heijastusväri on
    // taivaan ja tumman vihreän sekoitus.
    vec3 wetRefl = mix(vec3(0.03, 0.05, 0.03), uWetSky, 0.6);
    outgoingLight += wetRefl * fw * (wetAmt * 0.06 * uWetSkyK + wetPool * up * 0.28);
  }
  #include <opaque_fragment>`);
  };
  const prevKey = material.customProgramCacheKey;
  material.customProgramCacheKey = () => `${prevKey ? prevKey.call(material) : ''}-wet`;
  return material;
}

// Lammikko: läpikuultava, sileä vesipinta, jonka reuna sulautuu maahan.
// Ylhäältä katsottuna pohja näkyy tummana, viistosti pinta heijastaa taivasta
// (Schlickin fresnel, veden F0 ~0.03). Sade piirtää laajenevia renkaita.
function createPuddleMaterial() {
  const m = new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 0.06, metalness: 0,
    transparent: true, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2,
  });
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = windUniforms.uTime;
    shader.uniforms.uRain = wetUniforms.uRain;
    shader.uniforms.uWetSky = wetUniforms.uWetSky;
    shader.uniforms.uPuddle = wetUniforms.uPuddle;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
varying vec3 vPudW;
varying float vPudRim;
varying float vPudPerm;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
// Keskipiste 0, reunapisteet 1: interpoloituna etäisyys reunasta.
vPudRim = length(position.xz) > 0.01 ? 1.0 : 0.0;
vPudPerm = 1.0;
{
  vec4 pw = vec4(transformed, 1.0);
#ifdef USE_INSTANCING
  pw = instanceMatrix * pw;
  // Pysyvyys y-skaalassa (chunkGen.js): 0,05 = vain sateen jälkeen, 1 = aina.
  vPudPerm = clamp((length(instanceMatrix[1].xyz) - 0.05) / 0.95, 0.0, 1.0);
#endif
  vPudW = (modelMatrix * pw).xyz;
}`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
uniform float uTime;
uniform float uRain;
uniform vec3 uWetSky;
uniform float uPuddle;
varying vec3 vPudW;
varying float vPudRim;
varying float vPudPerm;
float pudH(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float pudRings(vec2 p, float t) {
  float r = 0.0;
  vec2 cell = floor(p * 3.0);
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 c = cell + vec2(float(i), float(j));
      float h = pudH(c);
      if (pudH(c + 11.0) > uRain * 1.4) continue;
      vec2 ctr = (c + 0.5 + (vec2(pudH(c + 7.3), pudH(c + 3.1)) - 0.5) * 0.8) / 3.0;
      float ph = fract(t * (0.7 + h * 0.9) + h * 10.0);
      float d = length(p - ctr);
      r += (1.0 - ph) * smoothstep(0.025, 0.0, abs(d - ph * 0.3));
    }
  }
  return r;
}`)
      .replace('#include <lights_physical_fragment>', `#include <lights_physical_fragment>
  material.specularColor = vec3(0.1);`)
      .replace('#include <opaque_fragment>', `{
    // Kuivuessa lammikko kutistuu reunoilta keskelle ja katoaa.
    float pudVis = max(vPudPerm, uPuddle);
    float pudR = sqrt(pudVis);
    if (vPudRim > pudR) discard;
    float nv = clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0);
    float fr = 0.03 + 0.97 * pow(1.0 - nv, 5.0);
    float rg = clamp(pudRings(vPudW.xz, uTime), 0.0, 1.0);
    outgoingLight += uWetSky * (fr * (1.0 - 0.5 * rg) + rg * 0.1);
    diffuseColor.a = smoothstep(pudR, pudR * 0.6, vPudRim) * (0.6 + 0.4 * fr);
  }
  #include <opaque_fragment>`);
  };
  m.customProgramCacheKey = () => 'puddle';
  return m;
}

export function createSharedMaterials(groundDetail) {
  // Sessio 23: maasto saa oikeat tekstuurit (surfaces.js); vanha
  // proseduraalinen jyvä jää vain varalle, kun tekstuurit eivät ole latautuneet.
  void groundDetail;
  const terrain = applyTerrainSurfaces(new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.97,
    metalness: 0,
  }));

  // Sessio 23: puiden latvuksissa lehtikortit (lehtiatlas, läpikuultavat
  // kohdat leikataan pois); rungot käyttävät atlaksen valkoista nurkkaa.
  const vegetation = addWind(
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.97, metalness: 0, map: leafTexture, alphaTest: 0.42, side: THREE.DoubleSide , alphaToCoverage: true }),
    0.0045,
  );
  const bush = addWind(
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0, map: leafTexture, alphaTest: 0.42, side: THREE.DoubleSide , alphaToCoverage: true }),
    0.06,
  );
  const grass = addWind(
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0, side: THREE.DoubleSide }),
    0.9,
  );
  // Korkeat, hoikat kasvit (bambu): latva huojuu rauhallisesti.
  const tall = addWind(
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0 }),
    0.01,
    0.15,
  );
  const solid = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0 });
  // Sessio 23: kaarna puiden rungoissa ja oksissa (lehdet jäävät ennalleen),
  // kuivissa pensaissa ohuemmin. Kivet, lahopuut ja maa omina materiaaleinaan.
  addSurfaceDetail(vegetation, 'bark', { scale: 0.9, strength: 0.9, mask: 'notGreen' });
  addSurfaceDetail(bush, 'bark', { scale: 0.45, strength: 0.55, normal: 0.6, mask: 'notGreen' });
  const solidRock = addSurfaceDetail(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0 }), 'rock', { scale: 2.2, strength: 0.95, normal: 1.0 });
  const solidWood = addSurfaceDetail(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0 }), 'bark', { scale: 0.8, strength: 0.9 });
  const solidEarth = addSurfaceDetail(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.97, metalness: 0 }), 'soil', { scale: 1.6, strength: 0.9 });
  // Sessio 24: muinainen kivi (pylväät): sammaloitunut kivi ja sammal yläpinnoilla.
  const solidAncient = addSurfaceDetail(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0 }), [
    { layer: 'mossrock', scale: 1.8, strength: 0.95, normal: 1.0 },
    { layer: 'moss', mask: 'top', scale: 1.2, strength: 1.0, cover: true },
  ]);
  addWet(solidAncient, 0.9, 0.6);
  addWet(solidRock, 0.8, 0.6);
  addWet(solidWood, 0.8, 0.5);
  addWet(solidEarth, 0.8, 0.4);
  addWet(terrain);
  // Sessio 26: lehdet eivät saa kiiltää (märkyys teki niistä peilaavia, yöllä
  // kuunvalo heijastui sinisenä); vain lievä tummuminen.
  // Sessio 58: lehdet eivät kiillä märkinäkään muovisesti (ennen 0,3).
  for (const m of [vegetation, bush]) addWet(m, 0.1, 0);
  addWet(tall, 0.6, 0.2);
  addTranslucency(vegetation, 0.38);
  addTranslucency(bush, 0.3);
  softFoliage(vegetation); // sessio 46 (uloimpana)
  softFoliage(bush);
  addWet(grass, 1, 0.5);
  addWet(solid, 0.8, 0.6);
  const puddle = createPuddleMaterial();

  // Vesi luodaan erikseen (render/water.js), koska se tarvitsee taivaan värit.
  return { terrain, vegetation, bush, grass, tall, solid, solid_rock: solidRock, solid_wood: solidWood, solid_earth: solidEarth, solid_ancient: solidAncient, puddle };
}
