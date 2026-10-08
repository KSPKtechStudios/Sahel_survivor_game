// Sessio 25: jalanjäljet hiekassa (aavikko, dyynit, rannat). Jokainen askel
// painaa hiekkaan tumman painauman, joka haalistuu vähitellen. Piirretään
// kertovalla sekoituksella (tummentaa maata sen omassa valaistuksessa, joten
// toimii myös yöllä), maaston kaltevuuden mukaan kallistettuna.
import * as THREE from 'three';

const MAX = 90;
const LIFE = 45; // s

function footTexture() {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#fff';
  g.fillRect(0, 0, 64, 128);
  const blob = (x, y, rx, ry, v) => {
    const gr = g.createRadialGradient(x, y, 0, x, y, Math.max(rx, ry));
    gr.addColorStop(0, `rgb(${v},${v},${v})`);
    gr.addColorStop(0.7, `rgb(${v + 30},${v + 30},${v + 30})`);
    gr.addColorStop(1, 'rgb(255,255,255)');
    g.save();
    g.translate(x, y);
    g.scale(rx / Math.max(rx, ry), ry / Math.max(rx, ry));
    g.translate(-x, -y);
    g.fillStyle = gr;
    g.beginPath();
    g.arc(x, y, Math.max(rx, ry), 0, Math.PI * 2);
    g.fill();
    g.restore();
  };
  blob(32, 96, 17, 24, 150); // kantapää
  blob(33, 52, 21, 30, 140); // päkiä
  for (let i = 0; i < 5; i++) blob(17 + i * 7.5, 20 - Math.abs(i - 1.5) * 2.5, 4.5, 6, 160); // varpaat
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.NoColorSpace;
  return t;
}

export class Footprints {
  constructor(scene) {
    const geo = new THREE.PlaneGeometry(0.15, 0.3);
    geo.rotateX(-Math.PI / 2);
    this.fade = new Float32Array(MAX);
    geo.setAttribute('aFade', new THREE.InstancedBufferAttribute(this.fade, 1));
    const mat = new THREE.MeshBasicMaterial({
      map: footTexture(), transparent: true, depthWrite: false, fog: false, toneMapped: false, side: THREE.DoubleSide,
      blending: THREE.MultiplyBlending, premultipliedAlpha: true,
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4,
    });
    mat.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nattribute float aFade;\nvarying float vFade;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvFade = aFade;');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying float vFade;')
        .replace('#include <opaque_fragment>', `outgoingLight = mix(vec3(1.0), outgoingLight, vFade);
#include <opaque_fragment>`);
    };
    mat.customProgramCacheKey = () => 'footprints';
    this.mesh = new THREE.InstancedMesh(geo, mat, MAX);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 2;
    this.mesh.count = MAX;
    const zero = new THREE.Matrix4().makeScale(0, 0, 0);
    for (let i = 0; i < MAX; i++) this.mesh.setMatrixAt(i, zero);
    scene.add(this.mesh);
    this.age = new Float32Array(MAX).fill(LIFE);
    this.next = 0;
    this._m = new THREE.Matrix4();
    this._q = new THREE.Quaternion();
    this._q2 = new THREE.Quaternion();
    this._p = new THREE.Vector3();
    this._s = new THREE.Vector3();
    this._n = new THREE.Vector3();
  }

  // x, z = jalan kohta, yaw = kulkusuunta, side = -1 vasen / 1 oikea,
  // heightAt(x, z) = maan korkeus, depth = painauman voimakkuus 0..1.
  add(x, z, yaw, side, heightAt, depth = 1) {
    const ox = Math.cos(yaw) * 0.11 * side, oz = -Math.sin(yaw) * 0.11 * side;
    const px = x + ox, pz = z + oz;
    const h = heightAt(px, pz);
    const hx = heightAt(px + 0.3, pz), hz = heightAt(px, pz + 0.3);
    this._n.set(h - hx, 0.3, h - hz).normalize();
    this._q.setFromUnitVectors(THREE.Object3D.DEFAULT_UP, this._n);
    this._q2.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, yaw + (Math.random() - 0.5) * 0.15);
    this._q.multiply(this._q2);
    this._p.set(px, h + 0.015, pz);
    const s = side < 0 ? -1 : 1; // vasen jalka peilikuvana
    this._s.set(s * (0.95 + Math.random() * 0.1), 1, 1);
    this._m.compose(this._p, this._q, this._s);
    const i = this.next;
    this.next = (i + 1) % MAX;
    this.mesh.setMatrixAt(i, this._m);
    this.mesh.instanceMatrix.needsUpdate = true;
    this.age[i] = 0;
    this.fade[i] = depth;
    this.mesh.geometry.attributes.aFade.needsUpdate = true;
  }

  update(dt) {
    let any = false;
    for (let i = 0; i < MAX; i++) {
      if (this.age[i] >= LIFE) continue;
      this.age[i] += dt;
      const f = 1 - Math.min(1, this.age[i] / LIFE);
      this.fade[i] = Math.min(this.fade[i], f * f * (3 - 2 * f));
      any = true;
    }
    if (any) this.mesh.geometry.attributes.aFade.needsUpdate = true;
  }

  clear() {
    this.age.fill(LIFE);
    this.fade.fill(0);
    this.mesh.geometry.attributes.aFade.needsUpdate = true;
  }
}
