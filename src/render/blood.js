// Veri (ja savipeikoilla savivelli): pisarat lentävät osumasta, putoavat ja
// jättävät maahan läikkiä, jotka haalistuvat hitaasti. Kuollessa olennon alle
// valuu lammikko.
import * as THREE from 'three';
import { heightAt } from '../world/terrain.js';
import { createSoftDotTexture } from './textures.js';

const MAX_DROPS = 600;
const MAX_SPLATS = 48;
const SPLAT_LIFE = 40; // s

const vs = /* glsl */ `
attribute float aSize;
attribute float aAlpha;
attribute vec3 aColor;
varying float vAlpha;
varying vec3 vColor;
#include <fog_pars_vertex>
void main() {
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  gl_PointSize = aSize * 320.0 / max(-mvPosition.z, 0.3);
  vAlpha = aAlpha;
  vColor = aColor;
  #include <fog_vertex>
}
`;
const fs = /* glsl */ `
uniform sampler2D uMap;
uniform float uLight;
varying float vAlpha;
varying vec3 vColor;
#include <fog_pars_fragment>
void main() {
  float a = texture2D(uMap, gl_PointCoord).a * vAlpha;
  if (a < 0.02) discard;
  gl_FragColor = vec4(vColor * uLight, a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}
`;

// Läikän tekstuuri: epäsäännöllinen roiske (pää-läikkä ja pieniä pisaroita).
function createSplatTexture(size = 128) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const blob = (x, y, r) => {
    const gr = g.createRadialGradient(x, y, r * 0.2, x, y, r);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(0.75, 'rgba(255,255,255,0.9)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  };
  const m = size / 2;
  for (let i = 0; i < 9; i++) blob(m + (rnd() - 0.5) * size * 0.25, m + (rnd() - 0.5) * size * 0.25, size * (0.12 + rnd() * 0.12));
  for (let i = 0; i < 16; i++) {
    const a = rnd() * Math.PI * 2, d = size * (0.22 + rnd() * 0.22);
    blob(m + Math.cos(a) * d, m + Math.sin(a) * d, size * (0.015 + rnd() * 0.035));
  }
  const tex = new THREE.CanvasTexture(c);
  return tex;
}

export class Blood {
  constructor(scene) {
    this.scene = scene;
    // Pisarat
    this.pos = new Float32Array(MAX_DROPS * 3);
    this.vel = new Float32Array(MAX_DROPS * 3);
    this.col = new Float32Array(MAX_DROPS * 3);
    this.size = new Float32Array(MAX_DROPS);
    this.alpha = new Float32Array(MAX_DROPS);
    this.life = new Float32Array(MAX_DROPS);
    this.next = 0;
    this.alive = 0;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('aColor', new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    this.uniforms = {
      ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
      uMap: { value: createSoftDotTexture(32) },
      uLight: { value: 1 },
    };
    const mat = new THREE.ShaderMaterial({ uniforms: this.uniforms, vertexShader: vs, fragmentShader: fs, transparent: true, depthWrite: false, fog: true });
    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = 3;
    scene.add(this.points);

    // Läikät maassa (kiinteä joukko, vanhin kierrätetään)
    this.splatTex = createSplatTexture();
    this.splatGeo = new THREE.PlaneGeometry(1, 1);
    this.splatGeo.rotateX(-Math.PI / 2);
    this.splats = [];
    this.splatNext = 0;
    for (let i = 0; i < MAX_SPLATS; i++) {
      const m = new THREE.Mesh(this.splatGeo, new THREE.MeshStandardMaterial({
        map: this.splatTex, color: 0x5a0a08, roughness: 0.25, metalness: 0, transparent: true,
        depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
      }));
      m.visible = false;
      m.renderOrder = 1;
      scene.add(m);
      this.splats.push({ mesh: m, t: 0, grow: 0, size: 1, base: 1 });
    }
  }

  // Pisararoiske kohdasta pos suuntaan dir (voi olla null). color = THREE.Color.
  spray(pos, dir, color, count = 14, power = 1) {
    for (let n = 0; n < count; n++) {
      const i = this.next;
      this.next = (this.next + 1) % MAX_DROPS;
      this.pos[i * 3] = pos.x + (Math.random() - 0.5) * 0.15;
      this.pos[i * 3 + 1] = pos.y + (Math.random() - 0.5) * 0.15;
      this.pos[i * 3 + 2] = pos.z + (Math.random() - 0.5) * 0.15;
      const s = (0.8 + Math.random() * 2.2) * power;
      let vx = (Math.random() - 0.5) * 2.2, vz = (Math.random() - 0.5) * 2.2;
      if (dir) { vx += dir.x * s; vz += dir.z * s; }
      this.vel[i * 3] = vx;
      this.vel[i * 3 + 1] = 0.8 + Math.random() * 2.6 * power;
      this.vel[i * 3 + 2] = vz;
      const k = 0.7 + Math.random() * 0.45;
      this.col[i * 3] = color.r * k; this.col[i * 3 + 1] = color.g * k; this.col[i * 3 + 2] = color.b * k;
      this.size[i] = 0.035 + Math.random() * 0.06;
      this.alpha[i] = 1;
      this.life[i] = 2;
    }
    this.alive = MAX_DROPS;
  }

  // Läikkä maahan (x, z). size = halkaisija (m), grow = kasvaa vähitellen (lammikko).
  splat(x, z, size, color, grow = 0) {
    const s = this.splats[this.splatNext];
    this.splatNext = (this.splatNext + 1) % MAX_SPLATS;
    const m = s.mesh;
    m.position.set(x, heightAt(x, z) + 0.03, z);
    m.rotation.y = Math.random() * Math.PI * 2;
    m.material.color.copy(color).multiplyScalar(0.55);
    m.material.opacity = 0.92;
    m.visible = true;
    s.t = 0;
    s.grow = grow;
    s.base = size;
    m.scale.setScalar(grow > 0 ? size * 0.25 : size);
  }

  update(dt, light = 1) {
    this.uniforms.uLight.value = light;
    if (this.alive > 0) {
      let any = 0;
      for (let i = 0; i < MAX_DROPS; i++) {
        if (this.life[i] <= 0) continue;
        this.life[i] -= dt;
        this.vel[i * 3 + 1] -= 13 * dt;
        this.pos[i * 3] += this.vel[i * 3] * dt;
        this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt;
        this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
        const x = this.pos[i * 3], z = this.pos[i * 3 + 2];
        // Osuu maahan: pieni läikkä joka kolmannesta pisarasta.
        if (this.vel[i * 3 + 1] < 0 && (i % 3 === 0 || this.life[i] < 1.2)) {
          const h = heightAt(x, z);
          if (this.pos[i * 3 + 1] <= h + 0.02) {
            this.life[i] = 0;
            if (i % 3 === 0) this.splat(x, z, 0.12 + Math.random() * 0.18, _c.setRGB(this.col[i * 3], this.col[i * 3 + 1], this.col[i * 3 + 2]));
          }
        }
        this.alpha[i] = this.life[i] > 0 ? Math.min(1, this.life[i] * 2) : 0;
        if (this.life[i] > 0) any++;
      }
      this.alive = any;
      const g = this.points.geometry;
      g.attributes.position.needsUpdate = true;
      g.attributes.aAlpha.needsUpdate = true;
      g.attributes.aSize.needsUpdate = true;
      g.attributes.aColor.needsUpdate = true;
    }
    for (const s of this.splats) {
      if (!s.mesh.visible) continue;
      s.t += dt;
      if (s.grow > 0 && s.t < s.grow) s.mesh.scale.setScalar(s.base * (0.25 + 0.75 * Math.sqrt(s.t / s.grow)));
      const fade = 1 - Math.max(0, (s.t - SPLAT_LIFE * 0.6) / (SPLAT_LIFE * 0.4));
      s.mesh.material.opacity = 0.92 * fade;
      if (fade <= 0) s.mesh.visible = false;
    }
  }

  clear() {
    this.life.fill(0);
    this.alpha.fill(0);
    this.alive = 0;
    for (const s of this.splats) s.mesh.visible = false;
  }
}

const _c = new THREE.Color();
