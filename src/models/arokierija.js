// Sessio 58: arokierijä (tumbleweed) käyttäjän antamasta mallista
// (Sketchfab "Tumbleweed Jumping", ThymKruijt, CC-BY-4.0;
// assets/models/nature/arokierija.glb). Malli on risupallo läpinäkyvillä
// korteilla (valokuvatekstuuri). Mallin animaatio on jäykän kappaleen
// liikerata: vierintää pienin töyssyin ja kaksi isoa loikkaa. Siitä otetaan
// pystysuuntainen loikkakäyrä (korkeus säteinä ajan funktiona), jota
// world/tumbleweeds.js toistaa tuulen vauhdin mukaan; pyöriminen lasketaan
// vierimisestä kuten animaatiossa.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from '../../vendor/meshopt/meshopt_decoder.module.js';

const URL = 'assets/models/nature/arokierija.glb';
// Pelin säde skaalalla 1 (sama kuin vanhalla mallilla).
export const AROKIERIJA_R = 0.5;
// Animaation vauhti säteinä sekunnissa (144 yksikköä/s, säde 26,4 yksikköä):
// tällä vauhdilla loikkakäyrä toistuu samassa tahdissa kuin animaatiossa.
export const AROKIERIJA_RPS = 5.45;
const SAMPLES = 128;

let asset = null;

// { geometry, material, hop: Float32Array (korkeus säteinä), dur (s) } tai null.
export function arokierijaAsset() {
  return asset;
}

export async function loadArokierija() {
  try {
    const gltf = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(URL);
    let mesh = null;
    gltf.scene.traverse((o) => { if (o.isMesh && !mesh) mesh = o; });
    const clip = gltf.animations[0];
    const track = clip && clip.tracks.find((t) => t.name.endsWith('.position'));
    if (!mesh || !track) throw new Error('arokierijä: verkko tai animaatio puuttuu');
    // Maakosketus animaation alussa: keskipisteen korkeus = näkyvän pallon
    // säde (korttien kulmat ulottuvat kauemmas, mutta ne ovat läpinäkyviä).
    const T = track.times, Y = (i) => track.values[i * 3 + 1];
    const contact = Y(0);
    // Pakatut (kvantisoidut) attribuutit liukuluvuiksi ja verkon solmun
    // muunnos (sisältää kvantisoinnin purun) geometriaan: animaation
    // yksiköt ovat verkon emosolmun koordinaatistossa.
    const geometry = new THREE.BufferGeometry();
    for (const [name, at] of Object.entries(mesh.geometry.attributes)) {
      const arr = new Float32Array(at.count * at.itemSize);
      for (let i = 0; i < at.count; i++) for (let j = 0; j < at.itemSize; j++) arr[i * at.itemSize + j] = at.getComponent(i, j);
      geometry.setAttribute(name, new THREE.BufferAttribute(arr, at.itemSize));
    }
    if (mesh.geometry.index) geometry.setIndex(mesh.geometry.index.clone());
    mesh.updateMatrix();
    geometry.applyMatrix4(mesh.matrix);
    geometry.computeBoundingBox();
    const c = geometry.boundingBox.getCenter(new THREE.Vector3());
    geometry.translate(-c.x, -c.y, -c.z);
    geometry.scale(AROKIERIJA_R / contact, AROKIERIJA_R / contact, AROKIERIJA_R / contact);
    geometry.computeBoundingSphere();
    // Pallo on sisäkkäisiä risukuoria: sisemmät kuoret tummemmiksi (valo ei
    // pääse vyyhdin sisään), jolloin läpi näkyy syvyyttä eikä pallo näytä
    // umpinaiselta.
    const pos = geometry.attributes.position;
    const col = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const r = Math.hypot(pos.getX(i), pos.getY(i), pos.getZ(i)) / AROKIERIJA_R;
      const t = Math.min(1, Math.max(0, (r - 0.55) / 0.6));
      const k = 0.38 + 0.52 * t * t * (3 - 2 * t);
      col[i * 3] = k; col[i * 3 + 1] = k * 0.97; col[i * 3 + 2] = k * 0.93;
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const src = mesh.material;
    const material = new THREE.MeshStandardMaterial({
      map: src.map, vertexColors: true, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.9, metalness: 0,
    });
    // Loikkakäyrä tasavälein (lineaarinen interpolointi kuten animaatiossa).
    // Animaation silmukan paluukohdassa käyrä painuu alle maan: rajataan nollaan.
    const dur = T[T.length - 1];
    const hop = new Float32Array(SAMPLES);
    let k = 0;
    for (let i = 0; i < SAMPLES; i++) {
      const t = (i / SAMPLES) * dur;
      while (k < T.length - 2 && T[k + 1] < t) k++;
      const f = Math.min(1, Math.max(0, (t - T[k]) / Math.max(1e-6, T[k + 1] - T[k])));
      hop[i] = Math.max(0, (Y(k) + (Y(k + 1) - Y(k)) * f - contact) / contact);
    }
    asset = { geometry, material, hop, dur };
  } catch (e) {
    console.warn('arokierija.glb ei latautunut, käytetään vanhaa mallia', e);
  }
}

// Loikan korkeus säteinä kohdassa t (s, kiertää).
export function arokierijaHop(t) {
  if (!asset) return 0;
  const { hop, dur } = asset;
  const x = (((t / dur) % 1) + 1) % 1 * SAMPLES;
  const i = Math.floor(x), f = x - i;
  return hop[i] + (hop[(i + 1) % SAMPLES] - hop[i]) * f;
}
