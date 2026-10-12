// Ilmassa leijuva pöly/hiekka (määrä sään mukaan) ja pienet osumapöllähdykset.
import * as THREE from 'three';
import { createSoftDotTexture } from './textures.js';

const DUST_COUNT = 6000;
const BOX = new THREE.Vector3(70, 26, 70);
const DUST_LIGHT = new THREE.Color(0xe0c49a);

const dustVS = /* glsl */ `
attribute vec4 aSeed;
uniform vec3 uCam;
uniform vec3 uBox;
uniform vec3 uWind;
uniform float uTime;
uniform float uAmount;
uniform float uSize;
varying float vAlpha;
void main() {
  // Vain osa partikkeleista näkyy, määrä riippuu säästä.
  float visible = step(aSeed.w, uAmount);
  vec3 p = aSeed.xyz * uBox;
  p += uWind * uTime * (0.7 + aSeed.w * 0.6);
  p.y += sin(uTime * 0.7 + aSeed.x * 40.0) * 0.6;
  p.x += sin(uTime * 1.3 + aSeed.z * 31.0) * 0.4;
  // Kääri kameran ympärille
  p = mod(p - uCam + uBox * 0.5, uBox) - uBox * 0.5 + uCam;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  float dist = -mv.z;
  gl_PointSize = visible * uSize * (0.6 + aSeed.w) * 300.0 / max(dist, 0.5);
  // Häivytä hyvin läheltä ja laatikon reunoilta
  vAlpha = visible * smoothstep(0.3, 2.0, dist) * (1.0 - smoothstep(uBox.x * 0.32, uBox.x * 0.5, dist));
}
`;

const dustFS = /* glsl */ `
uniform sampler2D uMap;
uniform vec3 uColor;
uniform float uOpacity;
varying float vAlpha;
void main() {
  float a = texture2D(uMap, gl_PointCoord).a * vAlpha * uOpacity;
  if (a < 0.003) discard;
  gl_FragColor = vec4(uColor, a);
  #include <colorspace_fragment>
}
`;

export class Dust {
  constructor(scene) {
    const seeds = new Float32Array(DUST_COUNT * 4);
    for (let i = 0; i < DUST_COUNT; i++) {
      seeds[i * 4] = Math.random();
      seeds[i * 4 + 1] = Math.random();
      seeds[i * 4 + 2] = Math.random();
      seeds[i * 4 + 3] = Math.random();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(DUST_COUNT * 3), 3));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4));
    this.uniforms = {
      uCam: { value: new THREE.Vector3() },
      uBox: { value: BOX.clone() },
      uWind: { value: new THREE.Vector3() },
      uTime: { value: 0 },
      uAmount: { value: 0.05 },
      uSize: { value: 0.05 },
      uMap: { value: createSoftDotTexture() },
      uColor: { value: new THREE.Color(0xd8b88a) },
      uOpacity: { value: 0.6 },
    };
    const mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: dustVS,
      fragmentShader: dustFS,
      transparent: true,
      depthWrite: false,
    });
    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = 5;
    scene.add(this.points);
  }

  update(elapsed, camPos, env) {
    const w = env.w;
    const u = this.uniforms;
    u.uCam.value.copy(camPos);
    u.uTime.value = elapsed;
    const speed = 0.5 + w.wind * 16;
    u.uWind.value.set(env.windDir.x * speed, 0.0, env.windDir.y * speed);
    u.uAmount.value = w.dust;
    // Myrskyssä isompia ja tiheämpiä hiukkasia.
    u.uSize.value = 0.035 + w.dust * 0.09;
    u.uOpacity.value = 0.35 + w.dust * 0.45;
    // Väri sumun mukaan, hieman vaaleampi
    u.uColor.value.copy(env.scene.fog.color).lerp(DUST_LIGHT, 0.35 * env.daylight);
  }
}

// Pienet pöllähdykset (puunlastut, pöly) osumista.
export class Bursts {
  constructor(scene) {
    this.scene = scene;
    this.list = [];
    this.tex = createSoftDotTexture(32);
  }

  // opts: size (m), life (s), gravity, opacity (sessio 12c: salaman isku).
  spawn(pos, color, count = 14, spread = 1.5, { size = 0.09, life = 0.7, gravity = 6, opacity = 1, lit = false } = {}) {
    const geo = new THREE.BufferGeometry();
    const p = new Float32Array(count * 3);
    const v = [];
    for (let i = 0; i < count; i++) {
      p[i * 3] = pos.x;
      p[i * 3 + 1] = pos.y;
      p[i * 3 + 2] = pos.z;
      v.push(new THREE.Vector3((Math.random() - 0.5) * spread, Math.random() * spread * 1.2, (Math.random() - 0.5) * spread));
    }
    geo.setAttribute('position', new THREE.BufferAttribute(p, 3));
    const mat = new THREE.PointsMaterial({
      color,
      size,
      map: this.tex,
      transparent: true,
      depthWrite: false,
      sizeAttenuation: true,
      // lit = salaman valaisema: sumu ja hämärä eivät himmennä.
      fog: !lit,
      toneMapped: !lit,
    });
    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    this.scene.add(pts);
    this.list.push({ pts, v, t: 0, life, gravity, opacity });
  }

  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const b = this.list[i];
      b.t += dt;
      const arr = b.pts.geometry.attributes.position.array;
      for (let k = 0; k < b.v.length; k++) {
        b.v[k].y -= b.gravity * dt;
        arr[k * 3] += b.v[k].x * dt;
        arr[k * 3 + 1] += b.v[k].y * dt;
        arr[k * 3 + 2] += b.v[k].z * dt;
      }
      b.pts.geometry.attributes.position.needsUpdate = true;
      b.pts.material.opacity = Math.max(0, 1 - b.t / b.life) * b.opacity;
      if (b.t > b.life) {
        this.scene.remove(b.pts);
        b.pts.geometry.dispose();
        b.pts.material.dispose();
        this.list.splice(i, 1);
      }
    }
  }
}
