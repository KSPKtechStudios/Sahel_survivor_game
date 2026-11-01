// Sessio 59: päävalikon nuotioleiri (käyttäjä: valikon pitää olla kotoisa,
// idyllinen ja taiteellinen paikka, jossa voi viettää aikaa; tausta 3D-scene,
// nuotioleiri hämärässä, joka vaihtuu hiljalleen yöksi; ei hahmoa, vain
// leirin merkit; kamera liukuu leirin eri kohtiin valikon mukaan).
//
// Leiri rakennetaan valikkomaailman aukiolle (terrain.js MENU_CAMP), joka on
// kumpareella joen itäpuolella: kamera katsoo länteen auringonlaskuun.
// Varusteet ovat pelin omia Blender-esinemalleja (itemAssets.js); viltti,
// kartta ja tuulessa lepattava katos tehdään tässä. Tuli: liekki-, kipinä- ja
// savu (render/campfire.js, sama kuin pelin nuotioissa) ja lepattava
// lämmin valo.
import * as THREE from 'three';
import { itemAsset } from '../models/itemAssets.js';
import { heightAt, MENU_CAMP } from '../world/terrain.js';
import { makeCampfireBase } from '../models/items.js';
import { CampfireFx } from '../render/campfire.js';
import { addSurfaceDetail } from '../render/surfaces.js';

// Kamerakuvat suhteessa nuotioon (x itään, z etelään): sijainti ja katsekohde.
export const CAMP_SHOTS = {
  main: { pos: [3.9, 1.35, 1.6], at: [-14, 0.6, 5.2] },
  worlds: { pos: [2.6, 1.35, -0.55], at: [1.5, 0.0, -1.4] },
  settings: { pos: [0.9, 1.0, 1.35], at: [-1.6, 0.35, 0.6] },
  credits: { pos: [2.9, 0.7, 1.6], at: [-14, 10, -2.5] },
};

const _box = new THREE.Box3();
const _q = new THREE.Quaternion();
const _q2 = new THREE.Quaternion();
const _v = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);
const AXES = [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1)];

// Lepattava kangas: siirtymä normaalin suuntaan aaltoina (keskeltä eniten).
function windCloth(mat, uniforms) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uClothT = uniforms.uClothT;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uClothT;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        float cw = sin(uv.x * 3.14159) * (1.0 - uv.y) * uv.y * 4.0;
        transformed.z += cw * (0.05 * sin(uClothT * 2.1 + uv.x * 5.0 + uv.y * 3.0) + 0.025 * sin(uClothT * 5.3 + uv.x * 11.0));`);
  };
  mat.customProgramCacheKey = () => 'menuCloth';
  return mat;
}

// Kartta viltillä: pergamentti, rannikko, joki, vuoret, polku ja kompassi.
function mapTexture() {
  const W = 512, H = 384;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(W / 2, H / 2, 40, W / 2, H / 2, W * 0.62);
  grd.addColorStop(0, '#e8d6ad');
  grd.addColorStop(1, '#b8945c');
  g.fillStyle = grd;
  g.fillRect(0, 0, W, H);
  // Pergamentin laikut.
  for (let i = 0; i < 220; i++) {
    g.fillStyle = `rgba(${90 + Math.random() * 40},${60 + Math.random() * 30},30,${0.03 + Math.random() * 0.05})`;
    g.beginPath();
    g.arc(Math.random() * W, Math.random() * H, 4 + Math.random() * 30, 0, Math.PI * 2);
    g.fill();
  }
  g.strokeStyle = 'rgba(70,42,18,0.85)';
  g.lineCap = 'round';
  // Rannikko vasemmalla.
  g.lineWidth = 2.2;
  g.beginPath();
  for (let y = 0; y <= H; y += 8) {
    const x = 70 + Math.sin(y * 0.03) * 22 + Math.sin(y * 0.11) * 8;
    if (y === 0) g.moveTo(x, y); else g.lineTo(x, y);
  }
  g.stroke();
  for (let k = 1; k < 4; k++) {
    g.globalAlpha = 0.5 / k;
    g.beginPath();
    for (let y = 0; y <= H; y += 8) {
      const x = 70 - k * 9 + Math.sin(y * 0.03) * 22 + Math.sin(y * 0.11) * 8;
      if (y === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.stroke();
  }
  g.globalAlpha = 1;
  // Joki.
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(W, 70);
  g.bezierCurveTo(380, 120, 330, 60, 260, 170);
  g.bezierCurveTo(200, 260, 140, 210, 78, 300);
  g.stroke();
  // Vuoret.
  g.lineWidth = 1.8;
  for (let i = 0; i < 9; i++) {
    const x = 330 + (i % 3) * 42 + Math.random() * 10, y = 230 + Math.floor(i / 3) * 34;
    g.beginPath();
    g.moveTo(x - 16, y + 12); g.lineTo(x, y - 12); g.lineTo(x + 16, y + 12);
    g.moveTo(x, y - 12); g.lineTo(x + 5, y + 2);
    g.stroke();
  }
  // Akaasiat.
  for (let i = 0; i < 14; i++) {
    const x = 140 + Math.random() * 170, y = 40 + Math.random() * 110;
    g.beginPath();
    g.moveTo(x, y + 9); g.lineTo(x, y);
    g.moveTo(x - 9, y); g.quadraticCurveTo(x, y - 7, x + 9, y);
    g.stroke();
  }
  // Polku ja leiri (risti).
  g.setLineDash([6, 7]);
  g.lineWidth = 2;
  g.strokeStyle = 'rgba(120,30,18,0.85)';
  g.beginPath();
  g.moveTo(120, 350); g.bezierCurveTo(200, 300, 240, 330, 300, 280); g.bezierCurveTo(340, 250, 300, 200, 360, 170);
  g.stroke();
  g.setLineDash([]);
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(352, 162); g.lineTo(368, 178); g.moveTo(368, 162); g.lineTo(352, 178);
  g.stroke();
  // Kompassi.
  g.strokeStyle = 'rgba(70,42,18,0.8)';
  g.lineWidth = 1.5;
  g.beginPath();
  g.arc(450, 330, 26, 0, Math.PI * 2);
  g.moveTo(450, 296); g.lineTo(456, 330); g.lineTo(450, 364); g.lineTo(444, 330); g.closePath();
  g.stroke();
  // Reunojen kuluma.
  const edge = g.createRadialGradient(W / 2, H / 2, W * 0.35, W / 2, H / 2, W * 0.66);
  edge.addColorStop(0, 'rgba(60,35,10,0)');
  edge.addColorStop(1, 'rgba(60,35,10,0.55)');
  g.fillStyle = edge;
  g.fillRect(0, 0, W, H);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export class MenuCamp {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.visible = false;
    scene.add(this.group);
    this.x = MENU_CAMP.x;
    this.z = MENU_CAMP.z;
    this.y = 0;
    this.built = false;
    this.uniforms = { uClothT: { value: 0 } };
    this.flick = 1;
  }

  // Maan korkeus leirin paikallisessa kohdassa (x, z).
  ground(lx, lz) {
    return heightAt(this.x + lx, this.z + lz);
  }

  // Esinemalli maahan. mode: keep (kuten mallinnettu), lay (ohuin akseli
  // ylös), flat (pisin akseli vaakaan suuntaan yaw), stand (pisin akseli
  // ylös, kallistus tilt), lean (ohuin akseli vaakaan, nojaa taaksepäin).
  // thick: poikkileikkauksen paksuus (m), jos pituus ja paksuus skaalataan erikseen (tukit).
  item(id, lx, lz, { len = 1, mode = 'keep', yaw = 0, tilt = 0, roll = 0, lift = 0, sink = 0, thick = 0 } = {}) {
    const geo = itemAsset(id);
    if (!geo) return null;
    if (!geo.boundingBox) geo.computeBoundingBox();
    const size = geo.boundingBox.getSize(_v).toArray();
    const order = [0, 1, 2].sort((a, b) => size[b] - size[a]); // pisin ... ohuin
    const mesh = new THREE.Mesh(geo, geo.userData.material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const q = mesh.quaternion;
    q.identity();
    if (mode === 'lay') q.setFromUnitVectors(AXES[order[2]], UP);
    else if (mode === 'stand') q.setFromUnitVectors(AXES[order[0]], UP);
    else if (mode === 'flat') {
      q.setFromUnitVectors(AXES[order[0]], AXES[0]);
      // Ohuin akseli ylös pisimmän ympäri (makaa leveimmällä puolellaan).
      const thin = AXES[order[2]].clone().applyQuaternion(q);
      const ang = Math.atan2(thin.z, thin.y);
      q.premultiply(_q2.setFromAxisAngle(AXES[0], -ang));
    } else if (mode === 'lean') q.setFromUnitVectors(AXES[order[2]], AXES[0]);
    if (roll) q.premultiply(_q2.setFromAxisAngle(mode === 'flat' ? AXES[0] : UP, roll));
    if (tilt) q.premultiply(_q2.setFromAxisAngle(AXES[2], tilt));
    q.premultiply(_q.setFromAxisAngle(UP, yaw));
    mesh.scale.setScalar(len / size[order[0]]);
    if (thick) for (const k of [order[1], order[2]]) mesh.scale.setComponent(k, thick / size[k]);
    mesh.position.set(lx, 0, lz);
    // Rajat leirin paikallisissa koordinaateissa (ryhmän muunnosta ei tarvita).
    mesh.updateMatrix();
    _box.copy(geo.boundingBox).applyMatrix4(mesh.matrix);
    mesh.position.y = this.ground(lx, lz) - this.y - _box.min.y + lift - sink;
    this.group.add(mesh);
    return mesh;
  }

  build() {
    if (this.built) return;
    this.built = true;
    this.y = heightAt(this.x, this.z);
    this.group.position.set(this.x, this.y, this.z);
    const G = this.group;

    // Nuotio: kivikehä, puut ja tuhka (esinemalli), hiillos ja valo.
    const baseMat = addSurfaceDetail(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }), [
      { layer: 'bark', mask: 'darkWood', scale: 1.2, strength: 0.95 },
      { layer: 'rock', mask: 'grey', scale: 2.0, strength: 0.85 },
    ]);
    const base = new THREE.Mesh(makeCampfireBase(3), baseMat);
    base.scale.setScalar(1.15);
    base.position.y = this.ground(0, 0) - this.y - 0.01;
    base.rotation.y = 0.4;
    base.castShadow = true;
    base.receiveShadow = true;
    G.add(base);
    this.fx = new CampfireFx(1.05, { seed: 5 });
    this.fx.group.position.set(0, base.position.y + 0.06, 0);
    G.add(this.fx.group);
    this.light = new THREE.PointLight(0xff8a3a, 9, 12, 1.7);
    this.light.position.set(0, this.ground(0, 0) - this.y + 0.55, 0);
    G.add(this.light);

    // Istumapuut tulen takana ja oikealla (kamera on idässä ja katsoo länteen),
    // polttopuupino vasemmalla edessä.
    this.item('wood', -1.45, 0.35, { len: 1.7, thick: 0.3, mode: 'flat', yaw: Math.PI / 2 + 0.15, roll: 0.4 });
    this.item('wood', 0.15, -1.65, { len: 1.55, thick: 0.28, mode: 'flat', yaw: 0.2, roll: 1.3 });
    for (let i = 0; i < 5; i++) {
      this.item('wood', 0.9 + (i % 3) * 0.17, 2.0 + (i % 3) * 0.04, { len: 0.7, thick: 0.13, mode: 'flat', yaw: 0.1 + (i % 2) * 0.12, roll: i, lift: i >= 3 ? 0.11 : 0 });
    }

    // Viltti (gasellintalja) ja kartta sen päällä (maailmojen kuva).
    const pelt = this.item('gazelle_pelt', 1.6, -1.35, { len: 1.7, mode: 'lay', yaw: 0.5, lift: 0.01 });
    const map = new THREE.Mesh(
      new THREE.PlaneGeometry(0.62, 0.46, 8, 6).rotateX(-Math.PI / 2),
      new THREE.MeshStandardMaterial({ map: mapTexture(), roughness: 0.95, side: THREE.DoubleSide }),
    );
    // Kartan kulmat hieman käpristyneet.
    const mp = map.geometry.attributes.position;
    for (let i = 0; i < mp.count; i++) {
      const x = mp.getX(i) / 0.31, z = mp.getZ(i) / 0.23;
      mp.setY(i, 0.012 * (x * x * z * z) + 0.006 * Math.max(0, x * x - 0.6));
    }
    map.geometry.computeVertexNormals();
    // Kartta taljan päälle (talja on n. 6 cm paksu).
    if (pelt) { pelt.updateMatrix(); _box.copy(pelt.geometry.boundingBox).applyMatrix4(pelt.matrix); }
    map.position.set(1.55, Math.max(this.ground(1.55, -1.4) - this.y + 0.05, pelt ? _box.max.y + 0.012 : 0), -1.4);
    map.rotation.y = 0.25;
    map.receiveShadow = true;
    G.add(map);
    this.item('rope', 2.2, -1.85, { len: 0.38, mode: 'lay', yaw: 1.2, lift: 0.01 });
    this.item('bissap', 1.05, -0.85, { len: 0.16, yaw: 0.3 });

    // Ruoka tulen äärellä.
    this.item('meat_stew', 0.62, -0.38, { len: 0.36, yaw: 1.1 });
    this.item('cooked_meat', -0.55, -0.5, { len: 0.3, mode: 'flat', yaw: -0.6, lift: 0.08 });
    this.item('fonio_porridge', 0.95, 0.75, { len: 0.2, yaw: 0.2 });

    // Varusteet: jousi ja nuolet puuta vasten, keihäs pystyssä auringonlaskua
    // vasten, kilpi ja kirves.
    this.item('bow', -1.25, 0.95, { len: 1.35, mode: 'stand', yaw: 0.2, tilt: 0.3 });
    for (let i = 0; i < 3; i++) this.item('arrow_flint', -1.3 + i * 0.07, 1.45 + i * 0.07, { len: 0.78, mode: 'stand', yaw: 0.6 + i * 0.4, tilt: 0.12 + i * 0.05, sink: 0.12 });
    this.item('wooden_spear', -2.3, 1.7, { len: 2.05, mode: 'stand', yaw: -0.4, tilt: 0.16, sink: 0.15 });
    this.item('hide_shield', 0.45, -2.0, { len: 0.72, mode: 'lean', yaw: Math.PI / 2 + 0.3, tilt: 0.35 });
    this.item('flint_axe', 1.3, 1.25, { len: 0.62, mode: 'flat', yaw: 2.2 });
    this.item('leather_vest', -1.45, -0.05, { len: 0.55, mode: 'lay', yaw: 0.9, lift: 0.3 });

    // Tuulessa lepattava katos bògòlanfini-kankaasta kahden seipään välissä.
    const tex = new THREE.TextureLoader().load('assets/ui/bogolan.png');
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1.4, 1.1);
    const clothMat = windCloth(new THREE.MeshStandardMaterial({ map: tex, roughness: 1, side: THREE.DoubleSide }), this.uniforms);
    const cloth = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.5, 16, 12), clothMat);
    cloth.castShadow = true;
    cloth.receiveShadow = true;
    // Yläreuna seipäissä (1,4 m), alareuna pingotettu maahan taakse.
    const cx = -1.05, cz = -2.75, yaw = 0.42;
    const gy = this.ground(cx, cz) - this.y;
    cloth.position.set(cx, gy + 0.72, cz);
    cloth.rotation.set(-0.95, yaw, 0, 'YXZ');
    G.add(cloth);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x5a4028, roughness: 0.95 });
    for (const s of [-1, 1]) {
      const px = cx + Math.cos(yaw) * 0.9 * s, pz = cz - Math.sin(yaw) * 0.9 * s;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.032, 1.55, 6), poleMat);
      pole.position.set(px + 0.18, this.ground(px, pz) - this.y + 0.7, pz + 0.3);
      pole.rotation.z = 0.06 * s;
      pole.castShadow = true;
      G.add(pole);
    }
    this.cloth = cloth;
  }

  setVisible(v) {
    this.group.visible = v;
    if (this.light) this.light.visible = v;
  }

  // Maailman koordinaatit leirin paikallisesta pisteestä.
  world(p, out) {
    return out.set(this.x + p[0], this.y + p[1], this.z + p[2]);
  }

  update(dt, time, camera, windX = 0, windZ = 0) {
    if (!this.group.visible || !this.built) return;
    this.uniforms.uClothT.value = time;
    // Lepattava valo: hidas ja nopea vaihtelu.
    const f = 0.82 + 0.1 * Math.sin(time * 7.3) + 0.06 * Math.sin(time * 13.1 + 1.3) + 0.06 * (Math.random() - 0.5);
    this.flick += (f - this.flick) * Math.min(1, dt * 12);
    this.light.intensity = 9 * this.flick;
    this.fx.power = 0.9 + 0.25 * (this.flick - 0.82);
    this.fx.update(dt, time, camera, windX, windZ);
  }
}
