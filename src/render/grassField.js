// Sessio 24: tiheä ruohokenttä. Tupsut lasketaan generointisäikeessä
// (world/groundCover.js); tässä ne piirretään instansseina, chunkin
// osaruuduittain (2 x 2), jotta näkymättömät ja kaukaiset ruudut karsitaan.
//
// Tupsu = kolme ristikkäistä korttia ruohoatlaksesta (assets/textures/grass.png,
// datakanavat: R sävy, G korkeus korressa, B korren tunniste / tähkä, A peitto).
// Värit tulevat instanssilta (pohja ja latva biomin mukaan), joten sama atlas
// käy kuivalle savannille ja rehevälle keitaalle.
//
// Sävytin: tuulen puuskat kulkevat aaltoina kentän yli, pelaaja taivuttaa
// heinää ympäriltään, kaukana tupsut painuvat maahan (ei äkillistä katoamista),
// ja vastavaloon katsottaessa ohuet korret hehkuvat läpi.
import * as THREE from 'three';
import { loadAlphaTexture } from './alphaMips.js';
import { windUniforms } from './materials.js';
import { COVER_STRIDE, COVER_CELLS } from '../world/groundCover.js';

const SIZE = 64;
const CELL = SIZE / COVER_CELLS;

export const grassUniforms = {
  uGrassTex: { value: null },
  uFloorTex: { value: null }, // metsänpohjan kortit (lajit 4..7, oikeat värit)
  uPush: { value: new THREE.Vector3(0, -999, 0) },
  uFadeR: { value: 46 },
  uSunDir: { value: new THREE.Vector3(0, 1, 0) },
  uSunCol: { value: new THREE.Color(1, 1, 1) },
  uGrassWet: { value: 0 },
};

// Lajien kortin mitat (m): nurmi, niitty, sara, kuiva heinä (ruohoatlas) ja
// saniaisryhmä, lehväkasvi, apilamatto, korkea lehtiyrtti (metsänpohja-atlas).
const KIND_WH = [0.8, 0.34, 0.9, 0.62, 1.0, 1.0, 1.0, 1.45, 1.4, 0.8, 0.9, 0.7, 0.8, 0.32, 1.0, 1.15];

function createClumpGeometry() {
  // Kolme korttia 60° välein, kukin kahdessa kerroksessa (taipuminen).
  const pos = [], uv = [], idx = [];
  for (let q = 0; q < 3; q++) {
    const a = (q / 3) * Math.PI + 0.3;
    const ca = Math.cos(a), sa = Math.sin(a);
    const base = pos.length / 3;
    for (let r = 0; r <= 2; r++) {
      const v = r / 2;
      for (const u of [0, 1]) {
        const x = u - 0.5;
        pos.push(x * ca, v, x * sa);
        uv.push(u, v);
      }
    }
    for (let r = 0; r < 2; r++) {
      const i0 = base + r * 2;
      idx.push(i0, i0 + 1, i0 + 2, i0 + 1, i0 + 3, i0 + 2);
    }
  }
  const g = new THREE.InstancedBufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(new Array(pos.length).fill(0).map((_, i) => (i % 3 === 1 ? 1 : 0)), 3));
  g.setIndex(idx);
  return g;
}

export function createGrassMaterial() {
  const m = new THREE.MeshLambertMaterial({ side: THREE.DoubleSide });
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = windUniforms.uTime;
    shader.uniforms.uWindDir = windUniforms.uWindDir;
    shader.uniforms.uWindStrength = windUniforms.uWindStrength;
    Object.assign(shader.uniforms, grassUniforms);
    shader.uniforms.uKindWH = { value: KIND_WH };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
attribute vec4 iPos;
attribute vec4 iDat;
attribute vec2 iCol;
uniform float uTime;
uniform vec2 uWindDir;
uniform float uWindStrength;
uniform vec3 uPush;
uniform float uFadeR;
uniform float uKindWH[16];
varying vec2 vGUv;
varying float vGKind;
varying vec3 vGBase;
varying vec3 vGTip;
varying float vGDead;
varying float vGH;
varying float vGVar;
vec3 gUnpack(float f) {
  // +0,5: jakolaskun pyöristysvirhe ei saa pudottaa tavua (GPU:n tarkkuus).
  float r = floor((f + 0.5) / 65536.0);
  float g = floor((f - r * 65536.0 + 0.5) / 256.0);
  float b = clamp(f - r * 65536.0 - g * 256.0, 0.0, 255.0);
  vec3 c = vec3(r, g, b) / 255.0;
  return c * c;
}`)
      .replace('#include <beginnormal_vertex>', `vec3 objectNormal = vec3(0.0, 1.0, 0.0);
#ifdef USE_TANGENT
  vec3 objectTangent = vec3(1.0, 0.0, 0.0);
#endif`)
      .replace('#include <begin_vertex>', `
float gKind = floor(iPos.w / 8.0);
float gRot = iPos.w - gKind * 8.0;
int gk = int(gKind + 0.5);
float gW = uKindWH[gk * 2] * iDat.x;
float gHt = uKindWH[gk * 2 + 1] * iDat.y;
float gc = cos(gRot), gs = sin(gRot);
vec3 transformed = vec3(position.x * gW, position.y * gHt, position.z * gW);
transformed.xz = vec2(gc * transformed.x - gs * transformed.z, gs * transformed.x + gc * transformed.z);
vec3 gWorld = (modelMatrix * vec4(iPos.xyz, 1.0)).xyz;
// Kaukana tupsu painuu maahan.
float gDist = distance(gWorld.xz, cameraPosition.xz);
float gFade = 1.0 - smoothstep(uFadeR * 0.72, uFadeR, gDist);
float gh = position.y;
transformed.y *= gFade;
// Tuuli: hidas huojunta + puuskat aaltoina tuulen suuntaan.
float gPh = dot(gWorld.xz, uWindDir) * 0.11 - uTime * (0.9 + uWindStrength * 1.6);
float gGust = 0.5 + 0.5 * sin(gPh) * sin(gPh * 0.37 + 1.3);
float gSway = sin(uTime * 2.3 + iDat.w * 6.283 + gWorld.x * 0.7) * 0.25;
float gBend = (0.08 + uWindStrength * 0.55) * (0.35 + gGust + gSway) * gh * gh * gHt;
vec2 gOff = uWindDir * gBend;
// Pelaaja taivuttaa heinää ympäriltään.
vec2 gTo = gWorld.xz - uPush.xz;
float gPd = length(gTo);
float gPush = (1.0 - smoothstep(0.25, 1.1, gPd)) * step(abs(gWorld.y - uPush.y), 2.0) * gh;
gOff += (gPd > 0.001 ? gTo / gPd : vec2(0.0)) * gPush * 0.55 * gHt;
transformed.xz += gOff;
transformed.y -= dot(gOff, gOff) / max(2.0 * gHt, 0.05) + gPush * 0.25 * gHt;
transformed += iPos.xyz;
vGUv = vec2((mod(gKind, 4.0) + 0.02 + uv.x * 0.96) * 0.25, uv.y * 0.985 + 0.005);
vGKind = gKind;
vGBase = gUnpack(iCol.x);
vGTip = gUnpack(iCol.y);
vGDead = iDat.z;
vGH = gh;
vGVar = iDat.w;
`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
uniform sampler2D uGrassTex;
uniform sampler2D uFloorTex;
uniform vec3 uSunDir;
uniform vec3 uSunCol;
uniform float uGrassWet;
varying vec2 vGUv;
varying vec3 vGBase;
varying vec3 vGTip;
varying float vGDead;
varying float vGH;
varying float vGVar;
varying float vGKind;`)
      .replace('#include <map_fragment>', `{
  // Molemmat atlakset luetaan aina (derivaatat eivät saa olla haarassa).
  vec4 gt = texture2D(uGrassTex, vGUv);
  vec4 gf = texture2D(uFloorTex, vGUv);
  bool gFloor = vGKind > 3.5;
  // Peiton säilytys kaukana (mipmapit keskiarvoistavat ohuet korret pois).
  vec2 gts = vGUv * vec2(1024.0, 512.0);
  vec2 gdx = dFdx(gts), gdy = dFdy(gts);
  float glod = max(0.0, 0.5 * log2(max(dot(gdx, gdx), dot(gdy, gdy))));
  float ga = (gFloor ? gf.a : gt.a) * (1.0 + glod * 0.28);
  if (ga < 0.5) discard;
  vec3 gcol = mix(vGBase, vGTip, smoothstep(0.0, 1.0, gt.g));
  // Osa korsista on kuolleita (olki), tähkät vaaleita.
  float gid = gt.b / 0.85;
  float gdead = step(1.0 - vGDead, gid) * step(gt.b, 0.9);
  vec3 gstraw = vec3(0.4, 0.31, 0.17) * (0.55 + 0.45 * gt.g);
  gcol = mix(gcol, gstraw, gdead * 0.85);
  gcol = mix(gcol, vec3(0.36, 0.25, 0.15), step(0.93, gt.b));
  // Tyvi jää mättään varjoon (tiheä heinikko on alhaalta tumma).
  gcol *= gt.r * (0.95 + (vGVar - 0.5) * 0.35) * mix(0.4, 1.0, smoothstep(0.0, 0.55, gt.g));
  if (gFloor) {
    // Metsänpohjan kortit: tekstuurin omat värit, biomin sävy kevyesti päälle.
    // Latvuston alla hillitympi: tummempi ja vähemmän kylläinen.
    vec3 gfc = mix(vec3(dot(gf.rgb, vec3(0.299, 0.587, 0.114))), gf.rgb, 0.78);
    gcol = gfc * (0.5 + 0.3 * vGVar) * mix(0.45, 1.0, smoothstep(0.0, 0.6, vGH));
    gcol *= mix(vec3(1.0), vGTip / max(dot(vGTip, vec3(0.3333)), 0.001), 0.25);
  }
  // Märkänä tummempi.
  gcol *= 1.0 - uGrassWet * 0.25;
  diffuseColor.rgb = gcol;
}`)
      .replace('#include <normal_fragment_begin>', `#include <normal_fragment_begin>
  normal = normalize(vNormal);`)
      .replace('#include <opaque_fragment>', `{
  // Vastavalo: ohuet korret hehkuvat, kun aurinko on korsien takana.
  vec3 gV = normalize(vViewPosition);
  vec3 gL = normalize((viewMatrix * vec4(uSunDir, 0.0)).xyz);
  float gBack = pow(clamp(dot(-gV, gL), 0.0, 1.0), 6.0);
  outgoingLight += diffuseColor.rgb * uSunCol * gBack * (0.35 + 0.65 * vGH) * 0.5;
}
#include <opaque_fragment>`);
  };
  m.customProgramCacheKey = () => 'grassField';
  return m;
}

export class GrassField {
  constructor(scene) {
    this.scene = scene;
    this.base = createClumpGeometry();
    this.material = createGrassMaterial();
    this.cells = new Set();
    this.density = 1;  // osuus tupsuista (asetus)
    this.enabled = true;
    // Sessio 26: peittävyyden säilyttävät mipmapit (kaukainen ruoho ei harvene pisteiksi).
    grassUniforms.uGrassTex.value = loadAlphaTexture(new URL('../../assets/textures/grass.png', import.meta.url).href, { srgb: false });
    grassUniforms.uFloorTex.value = loadAlphaTexture(new URL('../../assets/textures/forestfloor.png', import.meta.url).href);
  }

  // Chunkin tupsut (chunkGen.generateChunk: cover + coverCells).
  addChunk(chunk, cover, cells) {
    chunk.grass = [];
    if (!cover || !cover.length) return;
    for (let c = 0; c < COVER_CELLS * COVER_CELLS; c++) {
      const start = cells[c * 4], count = cells[c * 4 + 1];
      if (!count) continue;
      const arr = cover.subarray(start * COVER_STRIDE, (start + count) * COVER_STRIDE);
      const buf = new THREE.InstancedInterleavedBuffer(arr, COVER_STRIDE, 1);
      const g = new THREE.InstancedBufferGeometry();
      g.index = this.base.index;
      g.setAttribute('position', this.base.attributes.position);
      g.setAttribute('uv', this.base.attributes.uv);
      g.setAttribute('normal', this.base.attributes.normal);
      g.setAttribute('iPos', new THREE.InterleavedBufferAttribute(buf, 4, 0));
      g.setAttribute('iDat', new THREE.InterleavedBufferAttribute(buf, 4, 4));
      g.setAttribute('iCol', new THREE.InterleavedBufferAttribute(buf, 2, 8));
      const ci = c % COVER_CELLS, cj = Math.floor(c / COVER_CELLS);
      const y0 = cells[c * 4 + 2], y1 = cells[c * 4 + 3];
      g.boundingSphere = new THREE.Sphere(
        new THREE.Vector3((ci + 0.5) * CELL, (y0 + y1) / 2 + 0.7, (cj + 0.5) * CELL),
        Math.hypot(CELL / 2, CELL / 2, (y1 - y0) / 2 + 1.5) + 1.5,
      );
      g.instanceCount = Math.ceil(count * this.density);
      const mesh = new THREE.Mesh(g, this.material);
      mesh.position.set(chunk.cx * SIZE, 0, chunk.cz * SIZE);
      mesh.updateMatrix();
      mesh.matrixAutoUpdate = false;
      mesh.receiveShadow = true;
      mesh.castShadow = false;
      mesh.userData.full = count;
      mesh.userData.cx = chunk.cx * SIZE + (ci + 0.5) * CELL;
      mesh.userData.cz = chunk.cz * SIZE + (cj + 0.5) * CELL;
      mesh.visible = false;
      this.scene.add(mesh);
      chunk.grass.push(mesh);
      this.cells.add(mesh);
    }
  }

  removeChunk(chunk) {
    if (!chunk.grass) return;
    for (const mesh of chunk.grass) {
      this.scene.remove(mesh);
      // Pohjageometrian attribuutit ovat yhteisiä: vapautetaan vain instanssit.
      mesh.geometry.dispose();
      this.cells.delete(mesh);
    }
    chunk.grass = null;
  }

  setDensity(d) {
    this.density = d;
    for (const mesh of this.cells) mesh.geometry.instanceCount = Math.ceil(mesh.userData.full * d);
  }

  // Näkyvät osaruudut: lähin piste kameran häivytyssäteen sisällä.
  update(camPos, pushPos, env) {
    const R = grassUniforms.uFadeR.value + 1;
    for (const mesh of this.cells) {
      const dx = Math.max(Math.abs(camPos.x - mesh.userData.cx) - CELL / 2, 0);
      const dz = Math.max(Math.abs(camPos.z - mesh.userData.cz) - CELL / 2, 0);
      mesh.visible = this.enabled && this.density > 0 && dx * dx + dz * dz < R * R;
    }
    if (pushPos) grassUniforms.uPush.value.copy(pushPos);
    if (env) {
      grassUniforms.uSunDir.value.copy(env.sunDir);
      grassUniforms.uSunCol.value.copy(env.sun.color).multiplyScalar(Math.min(1.5, env.sun.intensity / 3) * env.daylight);
    }
  }
}
