// Tuli ja savu hiukkasina: liekit ja kipinät (lisäävä sekoitus) sekä savu.
// Kaksi pisterykelmää, joihin hiukkaset varataan kiertävästä taulukosta.
import * as THREE from 'three';
import { createSoftDotTexture } from './textures.js';

const vs = /* glsl */ `
attribute float aSize;
attribute float aAge;    // 0 = syntyi, 1 = sammuu
attribute float aAlpha;
varying float vAge;
varying float vAlpha;
#include <fog_pars_vertex>
void main() {
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  gl_PointSize = aSize * 320.0 / max(-mvPosition.z, 0.3);
  vAge = aAge;
  vAlpha = aAlpha;
  #include <fog_vertex>
}
`;

// Liekki: valkoisen keltaisesta oranssin kautta tummanpunaiseen.
const fsFire = /* glsl */ `
uniform sampler2D uMap;
varying float vAge;
varying float vAlpha;
#include <fog_pars_fragment>
void main() {
  float a = texture2D(uMap, gl_PointCoord).a * vAlpha;
  if (a < 0.01) discard;
  vec3 c = mix(vec3(1.0, 0.92, 0.6), vec3(1.0, 0.55, 0.12), smoothstep(0.0, 0.35, vAge));
  c = mix(c, vec3(0.55, 0.12, 0.04), smoothstep(0.45, 1.0, vAge));
  gl_FragColor = vec4(c * 1.6, a * (1.0 - smoothstep(0.6, 1.0, vAge)));
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}
`;

// Savu: tumma, hajoaa ja vaalenee.
const fsSmoke = /* glsl */ `
uniform sampler2D uMap;
uniform vec3 uColor;
varying float vAge;
varying float vAlpha;
#include <fog_pars_fragment>
void main() {
  float a = texture2D(uMap, gl_PointCoord).a * vAlpha;
  a *= smoothstep(0.0, 0.15, vAge) * (1.0 - smoothstep(0.5, 1.0, vAge));
  if (a < 0.005) discard;
  vec3 c = mix(uColor * 0.45, uColor, vAge);
  gl_FragColor = vec4(c, a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}
`;

class Pool {
  constructor(scene, max, fragmentShader, blending, extra = {}) {
    this.max = max;
    this.pos = new Float32Array(max * 3);
    this.vel = new Float32Array(max * 3);
    this.size = new Float32Array(max);
    this.size0 = new Float32Array(max);
    this.size1 = new Float32Array(max);
    this.age = new Float32Array(max).fill(1);
    this.alpha = new Float32Array(max);
    this.alpha0 = new Float32Array(max);
    this.life = new Float32Array(max).fill(1);
    this.t = new Float32Array(max).fill(1e9);
    this.lift = new Float32Array(max);
    this.next = 0;
    this.alive = 0;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('aAge', new THREE.BufferAttribute(this.age, 1).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage));
    this.uniforms = {
      ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
      uMap: { value: createSoftDotTexture(32) },
      ...extra,
    };
    this.material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: vs,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      blending,
      fog: true,
    });
    this.points = new THREE.Points(geo, this.material);
    this.points.frustumCulled = false;
    this.points.renderOrder = 4;
    scene.add(this.points);
  }

  spawn(x, y, z, vx, vy, vz, life, s0, s1, alpha, lift) {
    const i = this.next;
    this.next = (this.next + 1) % this.max;
    this.pos[i * 3] = x; this.pos[i * 3 + 1] = y; this.pos[i * 3 + 2] = z;
    this.vel[i * 3] = vx; this.vel[i * 3 + 1] = vy; this.vel[i * 3 + 2] = vz;
    this.life[i] = life;
    this.t[i] = 0;
    this.size0[i] = s0;
    this.size1[i] = s1;
    this.alpha0[i] = alpha;
    this.lift[i] = lift;
    this.alive = this.max;
  }

  update(dt) {
    if (this.alive <= 0) return;
    let any = 0;
    const drag = Math.exp(-dt * 1.6);
    for (let i = 0; i < this.max; i++) {
      if (this.t[i] >= this.life[i]) { this.alpha[i] = 0; continue; }
      this.t[i] += dt;
      const k = Math.min(1, this.t[i] / this.life[i]);
      this.vel[i * 3] *= drag;
      this.vel[i * 3 + 2] *= drag;
      this.vel[i * 3 + 1] += this.lift[i] * dt;
      this.pos[i * 3] += this.vel[i * 3] * dt;
      this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt;
      this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
      this.age[i] = k;
      this.size[i] = this.size0[i] + (this.size1[i] - this.size0[i]) * k;
      this.alpha[i] = k < 1 ? this.alpha0[i] : 0;
      if (k < 1) any++;
    }
    this.alive = any;
    const g = this.points.geometry;
    g.attributes.position.needsUpdate = true;
    g.attributes.aSize.needsUpdate = true;
    g.attributes.aAge.needsUpdate = true;
    g.attributes.aAlpha.needsUpdate = true;
  }

  clear() {
    this.t.fill(1e9);
    this.alpha.fill(0);
    this.alive = 0;
    this.points.geometry.attributes.aAlpha.needsUpdate = true;
  }
}

export class FireFx {
  constructor(scene) {
    this.fire = new Pool(scene, 700, fsFire, THREE.AdditiveBlending);
    this.smoke = new Pool(scene, 360, fsSmoke, THREE.NormalBlending, { uColor: { value: new THREE.Color(0x6a625c) } });
  }

  // Liekkejä kohtaan (x, y, z), säde r, voimakkuus k (0..1+).
  flames(x, y, z, r = 0.2, k = 1) {
    const a = Math.random() * Math.PI * 2;
    const d = Math.random() * r;
    this.fire.spawn(
      x + Math.cos(a) * d, y + (Math.random() - 0.3) * r, z + Math.sin(a) * d,
      (Math.random() - 0.5) * 0.5, 0.6 + Math.random() * 0.8, (Math.random() - 0.5) * 0.5,
      0.35 + Math.random() * 0.35, (0.16 + Math.random() * 0.12) * k, 0.03, 0.9, 1.6,
    );
  }

  // Kipinä: pieni, nopea, lentää korkealle.
  ember(x, y, z) {
    this.fire.spawn(
      x, y, z,
      (Math.random() - 0.5) * 1.6, 1.5 + Math.random() * 2.5, (Math.random() - 0.5) * 1.6,
      0.6 + Math.random() * 0.7, 0.035, 0.015, 1, -1.2,
    );
  }

  smokePuff(x, y, z, r = 0.25, k = 1) {
    const a = Math.random() * Math.PI * 2;
    const d = Math.random() * r;
    this.smoke.spawn(
      x + Math.cos(a) * d, y, z + Math.sin(a) * d,
      (Math.random() - 0.5) * 0.4, 0.5 + Math.random() * 0.5, (Math.random() - 0.5) * 0.4,
      1.6 + Math.random() * 1.2, 0.18 * k, (0.7 + Math.random() * 0.5) * k, 0.35, 0.25,
    );
  }

  // Leimahdus: iso liekkipurkaus kerralla.
  burst(x, y, z, r = 0.4, n = 30) {
    for (let i = 0; i < n; i++) this.flames(x, y, z, r, 1.5);
    for (let i = 0; i < n / 3; i++) this.ember(x, y, z);
  }

  update(dt, ambient) {
    this.fire.update(dt);
    this.smoke.update(dt);
    // Savu on yöllä tummaa, päivällä harmaata
    if (ambient) this.smoke.uniforms.uColor.value.setRGB(0.42, 0.39, 0.36).multiplyScalar(0.35 + Math.min(1, ambient.r * 2.2) * 0.65);
  }

  clear() {
    this.fire.clear();
    this.smoke.clear();
  }
}
