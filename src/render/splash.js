// Vesiroiskeet: pisarat lentävät ja putoavat takaisin veteen.
// Yksi pisteryhmä, johon pisarat varataan kiertävästä taulukosta.
import * as THREE from 'three';
import { createSoftDotTexture } from './textures.js';

const MAX = 900;
const _c = new THREE.Color();

const vs = /* glsl */ `
attribute float aSize;
attribute float aAlpha;
varying float vAlpha;
#include <fog_pars_vertex>
void main() {
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  gl_PointSize = aSize * 320.0 / max(-mvPosition.z, 0.3);
  vAlpha = aAlpha;
  #include <fog_vertex>
}
`;

const fs = /* glsl */ `
uniform sampler2D uMap;
uniform vec3 uColor;
varying float vAlpha;
#include <fog_pars_fragment>
void main() {
  float a = texture2D(uMap, gl_PointCoord).a * vAlpha;
  if (a < 0.01) discard;
  gl_FragColor = vec4(uColor, a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}
`;

export class Splashes {
  constructor(scene) {
    this.pos = new Float32Array(MAX * 3);
    this.vel = new Float32Array(MAX * 3);
    this.life = new Float32Array(MAX);  // jäljellä oleva aika
    this.maxLife = new Float32Array(MAX).fill(1);
    this.floorY = new Float32Array(MAX);
    this.size = new Float32Array(MAX);
    this.alpha = new Float32Array(MAX);
    this.next = 0;
    this.alive = 0;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage));
    this.uniforms = {
      ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
      uMap: { value: createSoftDotTexture(32) },
      uColor: { value: new THREE.Color(0xe8f2f4) },
    };
    this.material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: vs,
      fragmentShader: fs,
      transparent: true,
      depthWrite: false,
      fog: true,
    });
    this.points = new THREE.Points(geo, this.material);
    this.points.frustumCulled = false;
    this.points.renderOrder = 3;
    scene.add(this.points);
  }

  // Roiske kohtaan (x, y = veden pinta, z). power ~ 0.2 (askel) .. 2 (iso hyppy).
  spawn(x, y, z, power = 1, opts = {}) {
    const count = Math.min(140, Math.round(10 + power * 45));
    const spread = opts.spread ?? 1;
    for (let n = 0; n < count; n++) {
      const i = this.next;
      this.next = (this.next + 1) % MAX;
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * 0.35 * spread * (0.5 + power * 0.3);
      // Kruunu: osa lentää ylös, osa sivuille
      const up = (1.2 + Math.random() * 2.6) * (0.55 + power * 0.45);
      const out = (0.4 + Math.random() * 1.4) * (0.6 + power * 0.4) * spread;
      this.pos[i * 3] = x + Math.cos(a) * r;
      this.pos[i * 3 + 1] = y + 0.02;
      this.pos[i * 3 + 2] = z + Math.sin(a) * r;
      this.vel[i * 3] = Math.cos(a) * out + (opts.vx || 0) * 0.3;
      this.vel[i * 3 + 1] = up;
      this.vel[i * 3 + 2] = Math.sin(a) * out + (opts.vz || 0) * 0.3;
      this.maxLife[i] = this.life[i] = 0.5 + Math.random() * 0.7;
      this.floorY[i] = y - 0.05;
      // Osa isoja, sumumaisia roiskeita, osa pieniä pisaroita
      this.size[i] = Math.random() < 0.25 ? 0.12 + Math.random() * 0.12 * (0.6 + power * 0.4) : 0.05 + Math.random() * 0.07;
      this.alpha[i] = 0.9;
    }
    this.alive = MAX;
  }

  update(dt, lightColor, ambient) {
    if (this.alive <= 0) return;
    let any = 0;
    for (let i = 0; i < MAX; i++) {
      if (this.life[i] <= 0) continue;
      this.life[i] -= dt;
      this.vel[i * 3 + 1] -= 9.8 * dt;
      // Ilmanvastus pienentää pisaroita nopeasti
      const drag = Math.exp(-dt * 1.2);
      this.vel[i * 3] *= drag;
      this.vel[i * 3 + 2] *= drag;
      this.pos[i * 3] += this.vel[i * 3] * dt;
      this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt;
      this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
      if (this.pos[i * 3 + 1] < this.floorY[i] && this.vel[i * 3 + 1] < 0) this.life[i] = 0;
      const t = Math.max(0, this.life[i] / this.maxLife[i]);
      this.alpha[i] = this.life[i] > 0 ? Math.min(1, t * 2.5) * 0.85 : 0;
      if (this.life[i] > 0) any++;
    }
    this.alive = any;
    const g = this.points.geometry;
    g.attributes.position.needsUpdate = true;
    g.attributes.aAlpha.needsUpdate = true;
    g.attributes.aSize.needsUpdate = true;
    // Valaistus: päivällä kirkas, yöllä tumma
    if (lightColor) {
      this.uniforms.uColor.value.copy(ambient).multiplyScalar(1.2).add(_c.copy(lightColor).multiplyScalar(0.35));
    }
  }

  clear() {
    this.life.fill(0);
    this.alpha.fill(0);
    this.alive = 0;
    this.points.geometry.attributes.aAlpha.needsUpdate = true;
  }
}
