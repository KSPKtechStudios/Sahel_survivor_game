// Sade: pisaraviivoja kameran ympärillä (liike lasketaan näytönohjaimella) ja
// salaman isku kaukana (sahalaitainen viiva hetken ajan).
import * as THREE from 'three';

const N = 3200;     // pisaroita
const R = 22;       // vaakasäde kameran ympärillä (m)
const H = 26;       // pystysuuntainen toistoalue (m)
const SPEED = 17;   // putoamisnopeus (m/s)

const vs = /* glsl */ `
attribute float aSeed;
attribute float aEnd;
uniform float uTime;
uniform vec3 uCam;
uniform vec2 uWind;
uniform float uAmount;
varying float vAlpha;
float h1(float n) { return fract(sin(n * 12.9898) * 43758.5453); }
void main() {
  float s = aSeed;
  vec3 base = vec3(h1(s * 3.1) * 2.0 - 1.0, h1(s * 7.7), h1(s * 5.3) * 2.0 - 1.0) * vec3(${R.toFixed(1)}, ${H.toFixed(1)}, ${R.toFixed(1)});
  float sp = ${SPEED.toFixed(1)} * (0.85 + 0.3 * h1(s * 1.9));
  vec3 vel = vec3(uWind.x * 6.0, -sp, uWind.y * 6.0);
  vec3 p = base + vel * uTime;
  // Toisto kameran ympärillä
  p.y = mod(p.y - uCam.y + 6.0, ${H.toFixed(1)}) + uCam.y - 6.0;
  p.x = mod(p.x - uCam.x + ${R.toFixed(1)}, ${(2 * R).toFixed(1)}) + uCam.x - ${R.toFixed(1)};
  p.z = mod(p.z - uCam.z + ${R.toFixed(1)}, ${(2 * R).toFixed(1)}) + uCam.z - ${R.toFixed(1)};
  // Viivan häntä nopeuden suuntaan taaksepäin
  p -= vel * aEnd * 0.035;
  vAlpha = step(h1(s * 9.1), uAmount) * (1.0 - aEnd * 0.7);
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}
`;
const fs = /* glsl */ `
uniform vec3 uColor;
varying float vAlpha;
void main() {
  if (vAlpha < 0.01) discard;
  gl_FragColor = vec4(uColor, vAlpha * 0.42);
  #include <colorspace_fragment>
}
`;

export class Rain {
  constructor(scene) {
    this.scene = scene;
    const pos = new Float32Array(N * 2 * 3);
    const seed = new Float32Array(N * 2);
    const end = new Float32Array(N * 2);
    for (let i = 0; i < N; i++) {
      const s = Math.random() * 1000;
      seed[i * 2] = seed[i * 2 + 1] = s;
      end[i * 2] = 0;
      end[i * 2 + 1] = 1;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    geo.setAttribute('aEnd', new THREE.BufferAttribute(end, 1));
    this.uniforms = {
      uTime: { value: 0 },
      uCam: { value: new THREE.Vector3() },
      uWind: { value: new THREE.Vector2() },
      uAmount: { value: 0 },
      uColor: { value: new THREE.Color(0.75, 0.8, 0.88) },
    };
    const mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms, vertexShader: vs, fragmentShader: fs, transparent: true, depthWrite: false,
    });
    this.lines = new THREE.LineSegments(geo, mat);
    this.lines.frustumCulled = false;
    this.lines.renderOrder = 4;
    this.lines.visible = false;
    scene.add(this.lines);
    this.t = 0;
    this.amount = 0;

    // Salaman isku
    this.boltMat = new THREE.LineBasicMaterial({ color: 0xe8f0ff, transparent: true, opacity: 1, fog: false });
    this.bolt = null;
    this.boltT = 0;
  }

  // amount = sateen voimakkuus 0..1, light = valoisuus (pisaroiden väri).
  // fadeDt = todellinen aika (sade voimistuu ja heikkenee tasaisesti).
  update(dt, camera, amount, wind, light, fadeDt = dt) {
    this.t += dt;
    this.amount += (amount - this.amount) * Math.min(1, fadeDt * 1.5);
    this.lines.visible = this.amount > 0.02;
    const u = this.uniforms;
    u.uTime.value = this.t;
    u.uCam.value.copy(camera.position);
    u.uWind.value.set(wind.x, wind.y);
    u.uAmount.value = this.amount;
    u.uColor.value.setRGB(0.32 + 0.45 * light, 0.35 + 0.47 * light, 0.42 + 0.48 * light);
    if (this.bolt) {
      this.boltT -= dt;
      this.boltMat.opacity = Math.max(0, Math.min(1, this.boltT * 6)) * (0.6 + 0.4 * Math.sin(this.boltT * 80));
      if (this.boltT <= 0) {
        this.scene.remove(this.bolt);
        this.bolt.geometry.dispose();
        this.bolt = null;
      }
    }
  }

  // Salama: sahalaitainen viiva taivaalta maahan suunnassa angle, etäisyydellä dist.
  strike(camera, angle, dist) {
    if (this.bolt) {
      this.scene.remove(this.bolt);
      this.bolt.geometry.dispose();
    }
    const cx = camera.position.x + Math.cos(angle) * dist;
    const cz = camera.position.z + Math.sin(angle) * dist;
    const top = camera.position.y + 140 + Math.random() * 60;
    const pts = [];
    let x = cx, z = cz, y = top;
    const seg = 14;
    const add = (ax, ay, az, bx, by, bz) => pts.push(ax, ay, az, bx, by, bz);
    for (let i = 0; i < seg; i++) {
      const ny = top - ((i + 1) / seg) * (top - camera.position.y + 20);
      const nx = x + (Math.random() - 0.5) * 22, nz = z + (Math.random() - 0.5) * 22;
      add(x, y, z, nx, ny, nz);
      // Sivuhaara
      if (Math.random() < 0.3) add(nx, ny, nz, nx + (Math.random() - 0.5) * 30, ny - 12 - Math.random() * 10, nz + (Math.random() - 0.5) * 30);
      x = nx; y = ny; z = nz;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    this.bolt = new THREE.LineSegments(geo, this.boltMat);
    this.bolt.frustumCulled = false;
    this.bolt.renderOrder = 6;
    this.scene.add(this.bolt);
    this.boltT = 0.35;
  }
}
