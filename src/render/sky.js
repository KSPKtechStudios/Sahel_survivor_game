// Taivaskupu: väriliukuma, aurinko, kuu, tähdet ja proseduraaliset pilvet.
// Kaikki arvot tulevat Environment-luokalta (vuorokausi + sää).
import * as THREE from 'three';

const vertexShader = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position = p.xyww; // aina kaukaisimpana
}
`;

const fragmentShader = /* glsl */ `
uniform vec3 uZenith;
uniform vec3 uHorizon;
uniform vec3 uGround;
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform float uSunVisible;
uniform vec3 uMoonDir;
uniform float uMoonVisible;
uniform float uStars;
uniform float uCloudCover;
uniform vec3 uCloudLit;
uniform vec3 uCloudShade;
uniform vec3 uFogColor;
uniform float uHaze;
uniform float uTime;
uniform vec2 uCloudWind;
varying vec3 vDir;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
float hash3(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453123); }
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float s = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) { s += vnoise(p) * a; p = p * 2.03 + 7.1; a *= 0.5; }
  return s;
}

void main() {
  vec3 dir = normalize(vDir);
  float y = dir.y;

  // Perusliukuma
  float t = pow(clamp(y, 0.0, 1.0), 0.45);
  vec3 col = mix(uHorizon, uZenith, t);
  col = mix(col, uGround, smoothstep(0.0, -0.25, y));

  // Auringon hehku ja kiekko
  float sd = max(dot(dir, uSunDir), 0.0);
  col += uSunColor * (pow(sd, 6.0) * 0.25 + pow(sd, 64.0) * 0.5) * uSunVisible;
  float disc = smoothstep(0.99955, 0.99975, sd);

  // Tähdet
  float starAmt = 0.0;
  if (uStars > 0.001 && y > 0.0) {
    vec3 sp = dir * 220.0;
    vec3 cell = floor(sp);
    float h = hash3(cell);
    if (h > 0.9965) {
      vec3 c = cell + 0.5;
      float d = length(sp - c);
      float tw = 0.7 + 0.3 * sin(uTime * (2.0 + h * 40.0) + h * 100.0);
      starAmt = smoothstep(0.45, 0.0, d) * tw * (h - 0.9965) / 0.0035;
    }
  }

  // Kuu
  float md = max(dot(dir, uMoonDir), 0.0);
  float moon = smoothstep(0.99935, 0.9996, md) * uMoonVisible;
  col += vec3(0.6, 0.65, 0.8) * pow(md, 200.0) * 0.12 * uMoonVisible;

  // Pilvet: projisoidaan tasolle taivaalla.
  float cloud = 0.0;
  if (y > 0.0) {
    vec2 cp = dir.xz / (y + 0.08) * 1.6 + uCloudWind * uTime;
    float n = fbm(cp * 0.55);
    float n2 = fbm(cp * 1.7 + 3.3);
    float dens = n * 0.75 + n2 * 0.25;
    float thresh = mix(0.72, 0.28, uCloudCover);
    cloud = smoothstep(thresh, thresh + 0.18, dens);
    cloud *= smoothstep(0.0, 0.18, y);
    // Pilven valaistus: kohti aurinkoa kirkkaampi reuna.
    float lit = clamp(0.55 + (dens - thresh) * -1.2 + pow(sd, 4.0) * 0.6, 0.0, 1.0);
    vec3 cc = mix(uCloudShade, uCloudLit, lit);
    col = mix(col, cc, cloud * 0.92);
  }

  col += vec3(disc) * uSunColor * 6.0 * uSunVisible * (1.0 - cloud * 0.9);
  col += vec3(0.95, 0.95, 0.88) * moon * 1.4 * (1.0 - cloud);
  col += vec3(starAmt) * uStars * (1.0 - cloud);

  // Usva/pöly peittää horisontin (sama väri kuin maaston sumu).
  float hazeMask = mix(pow(1.0 - clamp(y, 0.0, 1.0), 4.0), 1.0, uHaze * uHaze);
  col = mix(col, uFogColor, clamp(hazeMask * (0.35 + uHaze * 0.65), 0.0, 1.0));
  if (y < 0.0) col = mix(col, uFogColor, 0.85);

  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

export class Sky {
  constructor(scene) {
    this.uniforms = {
      uZenith: { value: new THREE.Color() },
      uHorizon: { value: new THREE.Color() },
      uGround: { value: new THREE.Color() },
      uSunDir: { value: new THREE.Vector3(0, 1, 0) },
      uSunColor: { value: new THREE.Color() },
      uSunVisible: { value: 1 },
      uMoonDir: { value: new THREE.Vector3(0, -1, 0) },
      uMoonVisible: { value: 0 },
      uStars: { value: 0 },
      uCloudCover: { value: 0.2 },
      uCloudLit: { value: new THREE.Color(1, 1, 1) },
      uCloudShade: { value: new THREE.Color(0.6, 0.6, 0.65) },
      uFogColor: { value: new THREE.Color() },
      uHaze: { value: 0 },
      uTime: { value: 0 },
      uCloudWind: { value: new THREE.Vector2(-0.01, 0.01) },
    };
    const mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader,
      fragmentShader,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
    });
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(900, 48, 24), mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = -10;
    scene.add(this.mesh);
  }

  update(cameraPosition) {
    this.mesh.position.copy(cameraPosition);
  }
}
