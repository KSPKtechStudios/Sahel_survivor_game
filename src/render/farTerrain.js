// Sessio 58: kaukaisten vuorten siluetit (käyttäjä: vuoret saisivat erottua
// jo kauempaa usvaisina, kaukaisina hahmoina; etäisyys säädettävä niin, ettei
// mitään turhaa piirretä eikä fps putoa).
//
// Maaston palat ladataan vain näköetäisyydelle (asetus "Näköetäisyys"). Sen
// ulkopuolelle piirretään karkea maastoverkko niistä 192 m:n ruuduista, joissa
// on korkeuseroja (karstimassiivit, vuoret, graniittikalliot), asetuksen
// "Kaukaiset vuoret" etäisyydelle asti. Turhaa ei piirretä:
// - tasaiset ruudut ja ruutujen tasainen pohja jätetään kokonaan pois;
// - verkon tiheys etäisyyden mukaan (8 / 16 / 32 m);
// - ruutu, jonka korkein kohta jää kokonaan sumuun, piilotetaan (sumu on
//   korkeusriippuvainen, fogPatch.js: vain selvästi kameran yläpuolella oleva
//   näkyy kaukaa);
// - ei varjoja, yksi yhteinen kevyt materiaali, ruudut rajataan näkökentästä;
// - ruudut lasketaan vähitellen (aikabudjetti ruutua kohden).
// Ruutu piirtyy vain kohtiin, joissa oikeaa maastoa ei ole ladattu
// (latausruudukko tekstuurina), joten ne eivät mene päällekkäin.
import * as THREE from 'three';
import { sampleRelief } from '../world/terrain.js';

const TILE = 192;
const MIN_RELIEF = 12;   // m: tätä tasaisempia ruutuja ei piirretä
const BUDGET_MS = 3;     // ms / ruutu
const CHUNK = 64;
const OCC = 32;          // latausruudukon koko (chunkia)

const _s = {};

// Verkon väli etäisyyden mukaan.
function stepFor(d) {
  return d < 700 ? 8 : d < 1300 ? 16 : 32;
}

export class FarTerrain {
  constructor(scene, world) {
    this.world = world;
    this.scene = scene;
    this.tiles = new Map();
    this.queue = [];
    this.scanT = 0;
    this.range = 1400;   // m (asetus farView; 0 = pois)
    this.mistTop = 20;   // m: usvan yläraja (main.js; fogPatch.js)
    this.group = new THREE.Group();
    this.group.name = 'farTerrain';
    scene.add(this.group);
    this.occ = new Uint8Array(OCC * OCC);
    this.occTex = new THREE.DataTexture(this.occ, OCC, OCC, THREE.RedFormat, THREE.UnsignedByteType);
    this.occTex.magFilter = this.occTex.minFilter = THREE.NearestFilter;
    this.occTex.needsUpdate = true;
    this.uniforms = { uOcc: { value: this.occTex }, uOccOrigin: { value: new THREE.Vector2() } };
    this.material = new THREE.MeshLambertMaterial({ vertexColors: true });
    this.material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, this.uniforms);
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec2 vFarXZ;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvFarXZ = (modelMatrix * vec4(transformed, 1.0)).xz;');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>
varying vec2 vFarXZ;
uniform sampler2D uOcc;
uniform vec2 uOccOrigin;`)
        .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
  {
    // Ladattu maastopala tässä kohdassa: oikea maasto piirtyy, siluetti ei.
    vec2 oc = floor(vFarXZ / ${CHUNK.toFixed(1)}) - uOccOrigin;
    if (oc.x >= 0.0 && oc.y >= 0.0 && oc.x < ${OCC.toFixed(1)} && oc.y < ${OCC.toFixed(1)}
      && texture2D(uOcc, (oc + 0.5) / ${OCC.toFixed(1)}).r > 0.5) discard;
  }`);
    };
    this.material.customProgramCacheKey = () => 'farTerrain1';
  }

  setRange(m) {
    this.range = Math.max(0, m || 0);
    this.scanT = 0;
  }

  clear() {
    for (const t of this.tiles.values()) this._drop(t);
    this.tiles.clear();
    this.queue = [];
    this.scanT = 0;
  }

  // Kolmiot ja piirtokutsut (testejä ja F3-paneelia varten).
  stats() {
    let tris = 0, meshes = 0, visible = 0;
    for (const t of this.tiles.values()) {
      if (!t.mesh) continue;
      meshes++;
      if (t.mesh.visible) { visible++; tris += t.mesh.geometry.index.count / 3; }
    }
    return { tiles: this.tiles.size, meshes, visible, tris, queue: this.queue.length };
  }

  update(dt, pos) {
    if (this.range < 1) { this.group.visible = false; return; }
    this.group.visible = true;
    this._updateOcc(pos);
    this.scanT -= dt;
    if (this.scanT <= 0) {
      this.scanT = 0.75;
      this._scan(pos);
    }
    const t0 = performance.now();
    while (this.queue.length && performance.now() - t0 < BUDGET_MS) {
      const t = this.tiles.get(this.queue.shift());
      if (t && t.want) this._build(t, t.want);
    }
  }

  _drop(t) {
    if (t.mesh) { this.group.remove(t.mesh); t.mesh.geometry.dispose(); t.mesh = null; }
  }

  // Ladattujen maastopalojen ruudukko kameran ympärillä.
  _updateOcc(pos) {
    const ox = Math.floor(pos.x / CHUNK) - OCC / 2, oz = Math.floor(pos.z / CHUNK) - OCC / 2;
    this.occ.fill(0);
    for (const ch of this.world.chunks.values()) {
      const i = ch.cx - ox, j = ch.cz - oz;
      if (i >= 0 && j >= 0 && i < OCC && j < OCC) this.occ[j * OCC + i] = 255;
    }
    this.occTex.needsUpdate = true;
    this.uniforms.uOccOrigin.value.set(ox, oz);
  }

  _scan(pos) {
    const R = this.range;
    const fogFar = this.scene.fog ? this.scene.fog.far : 400;
    const ix0 = Math.floor((pos.x - R) / TILE), ix1 = Math.floor((pos.x + R) / TILE);
    const iz0 = Math.floor((pos.z - R) / TILE), iz1 = Math.floor((pos.z + R) / TILE);
    // Kokonaan ladattujen palojen sisällä olevia ruutuja ei tarvita.
    const inner = (this.world.viewRadius - 1) * CHUNK;
    const want = [];
    for (let iz = iz0; iz <= iz1; iz++) {
      for (let ix = ix0; ix <= ix1; ix++) {
        const d = Math.hypot((ix + 0.5) * TILE - pos.x, (iz + 0.5) * TILE - pos.z);
        if (d > R + TILE * 0.7 || d + TILE * 0.72 < inner) continue;
        const key = ix * 65536 + iz;
        let t = this.tiles.get(key);
        if (!t) { t = { ix, iz, mesh: null, step: 0, want: 0, empty: false, maxH: -Infinity }; this.tiles.set(key, t); }
        if (t.empty) continue;
        const st = stepFor(d);
        if (t.step !== st && t.want !== st) {
          t.want = st;
          want.push({ key, d });
        }
      }
    }
    want.sort((a, b) => a.d - b.d);
    this.queue = want.map((w) => w.key).concat(this.queue.filter((k) => !want.some((w) => w.key === k)));
    // Kaukaiset pois; sumuun kokonaan jäävät piiloon.
    for (const [key, t] of this.tiles) {
      const d = Math.hypot((t.ix + 0.5) * TILE - pos.x, (t.iz + 0.5) * TILE - pos.z);
      if (d > R + TILE * 1.5) { this._drop(t); this.tiles.delete(key); continue; }
      if (t.mesh) t.mesh.visible = d - TILE * 0.72 < fogFar || t.maxH > this.mistTop + 2;
    }
  }

  _build(t, step) {
    t.want = 0;
    const x0 = t.ix * TILE, z0 = t.iz * TILE;
    if (!t.step) {
      // Nopea esitarkistus harvalla ruudukolla: tasainen ruutu jää tyhjäksi.
      let lo = Infinity, hi = -Infinity;
      for (let j = 0; j <= 4; j++) {
        for (let i = 0; i <= 4; i++) {
          const h = sampleRelief(x0 + i * TILE / 4, z0 + j * TILE / 4, _s).h;
          lo = Math.min(lo, h); hi = Math.max(hi, h);
        }
      }
      if (hi - lo < MIN_RELIEF * 0.6) { t.empty = true; return; }
    }
    // Verkko yhden välin verran ruudun reunojen yli: eri tiheyksisten
    // naapuriruutujen väliin ei jää rakoja.
    const nv = TILE / step + 3;
    const n = nv * nv;
    const H = new Float32Array(n);
    const pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
    const veg = new Float32Array(n * 3), rock = new Float32Array(n * 3);
    let lo = Infinity, hi = -Infinity;
    for (let j = 0; j < nv; j++) {
      for (let i = 0; i < nv; i++) {
        const k = j * nv + i;
        const s = sampleRelief(x0 + (i - 1) * step, z0 + (j - 1) * step, _s);
        H[k] = s.h;
        lo = Math.min(lo, s.h); hi = Math.max(hi, s.h);
        // Kasvillisuuden ja kiven värit biomin mukaan (lineaarinen RGB).
        const rf = s.rainforest || 0, dz = (s.desert || 0) + (s.dunes || 0);
        const other = Math.max(0, 1 - rf - dz);
        veg[k * 3] = 0.05 * rf + 0.16 * other + 0.42 * dz;
        veg[k * 3 + 1] = 0.085 * rf + 0.15 * other + 0.3 * dz;
        veg[k * 3 + 2] = 0.04 * rf + 0.07 * other + 0.17 * dz;
        const lime = Math.min(1, (s.karstM || 0) * 2);
        rock[k * 3] = 0.3 + 0.12 * lime;
        rock[k * 3 + 1] = 0.27 + 0.13 * lime;
        rock[k * 3 + 2] = 0.23 + 0.12 * lime;
      }
    }
    this._drop(t);
    t.step = step;
    t.maxH = hi;
    if (hi - lo < MIN_RELIEF) { t.empty = true; return; }
    const floor = lo + 5;
    for (let j = 0; j < nv; j++) {
      for (let i = 0; i < nv; i++) {
        const k = j * nv + i;
        const hx = H[j * nv + Math.min(nv - 1, i + 1)] - H[j * nv + Math.max(0, i - 1)];
        const hz = H[Math.min(nv - 1, j + 1) * nv + i] - H[Math.max(0, j - 1) * nv + i];
        const g = Math.hypot(hx, hz) / (2 * step);
        const r = Math.min(1, Math.max(0, (g - 0.55) / 0.5));
        for (let c = 0; c < 3; c++) col[k * 3 + c] = veg[k * 3 + c] + (rock[k * 3 + c] - veg[k * 3 + c]) * r;
        pos[k * 3] = (i - 1) * step;
        pos[k * 3 + 1] = H[k];
        pos[k * 3 + 2] = (j - 1) * step;
      }
    }
    // Vain korkeuserojen kohdat (tasainen pohja jää pois).
    const idx = [];
    for (let j = 0; j < nv - 1; j++) {
      for (let i = 0; i < nv - 1; i++) {
        const a = j * nv + i, b = a + 1, c = a + nv, d = c + 1;
        if (Math.max(H[a], H[b], H[c], H[d]) < floor) continue;
        idx.push(a, c, b, b, c, d);
      }
    }
    if (!idx.length) { t.empty = true; return; }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    geo.computeBoundingSphere();
    const mesh = new THREE.Mesh(geo, this.material);
    mesh.position.set(x0, 0, z0);
    mesh.matrixAutoUpdate = false;
    mesh.updateMatrix();
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    this.group.add(mesh);
    t.mesh = mesh;
  }
}
