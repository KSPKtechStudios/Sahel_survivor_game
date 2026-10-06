// Taivaskupu: väriliukuma, aurinko, kuu, tähdet, linnunrata ja proseduraaliset pilvet.
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
uniform vec2 uCloudOffset;
uniform vec3 uGalaxyN;   // linnunradan tason normaali
uniform vec3 uGalaxyC;   // galaksin keskustan suunta (tasossa)
uniform float uFlash;    // salaman välähdys 0..1
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

  // Auringon hehku ja kiekko. Ilmakehän sironta: laaja hehku auringon
  // ympärillä (Mie) ja matalan auringon puolella lämmin horisonttivyö.
  float sd = max(dot(dir, uSunDir), 0.0);
  float mu = dot(dir, uSunDir);
  float g = 0.76;
  float mie = (1.0 - g * g) / pow(1.0 + g * g - 2.0 * g * mu, 1.5);
  float lowSun = 1.0 - smoothstep(0.0, 0.45, uSunDir.y);
  col += uSunColor * (pow(sd, 6.0) * 0.25 + pow(sd, 64.0) * 0.5) * uSunVisible;
  col += uSunColor * mie * 0.012 * uSunVisible;
  col += uSunColor * pow(sd, 3.0) * pow(1.0 - clamp(y, 0.0, 1.0), 6.0) * 0.45 * lowSun * uSunVisible;
  float disc = smoothstep(0.99955, 0.99975, sd);

  // Tähdet ja linnunrata (selkeinä öinä)
  float starAmt = 0.0;
  vec3 milky = vec3(0.0);
  if (uStars > 0.001 && y > -0.02) {
    // Linnunradan vyö: etäisyys tasosta ja sijainti vyön suunnassa.
    float b = dot(dir, uGalaxyN);
    vec3 gu = uGalaxyC;
    vec3 gv = cross(uGalaxyN, gu);
    float along = atan(dot(dir, gv), dot(dir, gu));
    float band = exp(-b * b / 0.012);
    float halo = exp(-b * b / 0.05);
    float core = exp(-along * along / 0.7);
    vec2 gp = vec2(along * 6.0, b * 26.0);
    float clouds = fbm(gp * 0.9 + 3.0);
    float dust = fbm(gp * vec2(1.6, 2.6) + 11.0);
    // Pölyvyöhykkeet: tumma repaleinen kaista vyön keskellä.
    float lane = smoothstep(0.45, 0.62, dust) * exp(-b * b / 0.003) * 0.8;
    float knots = pow(clouds, 2.5);
    float glow = (band * (0.25 + 1.1 * knots) * (1.0 - lane) + halo * 0.08) * (0.45 + core * 1.1);
    vec3 mwCol = mix(vec3(0.55, 0.62, 0.9), vec3(1.0, 0.88, 0.72), clamp(core * band, 0.0, 1.0));
    milky = mwCol * glow * 0.068 * smoothstep(-0.02, 0.15, y);
    // Kirkkaat tähdet
    vec3 sp = dir * 220.0;
    vec3 cell = floor(sp);
    float h = hash3(cell);
    if (h > 0.9965) {
      vec3 c = cell + 0.5;
      float d = length(sp - c);
      float tw = 0.7 + 0.3 * sin(uTime * (2.0 + h * 40.0) + h * 100.0);
      starAmt = smoothstep(0.45, 0.0, d) * tw * (h - 0.9965) / 0.0035;
    }
    // Himmeät tähdet, tiheimmillään linnunradan vyössä
    vec3 sp2 = dir * 520.0;
    vec3 cell2 = floor(sp2);
    float h2 = hash3(cell2 + 17.0);
    float thr = 0.993 - band * 0.03 * (0.6 + clouds);
    if (h2 > thr) {
      float d2 = length(sp2 - cell2 - 0.5);
      starAmt += smoothstep(0.42, 0.0, d2) * 0.45 * (0.6 + 0.4 * sin(uTime * 3.0 + h2 * 50.0));
    }
  }

  // Kuu
  float md = max(dot(dir, uMoonDir), 0.0);
  float moon = smoothstep(0.99935, 0.9996, md) * uMoonVisible;
  col += vec3(0.6, 0.65, 0.8) * pow(md, 200.0) * 0.12 * uMoonVisible;

  // Pilvet: projisoidaan tasolle taivaalla.
  float cloud = 0.0;
  if (y > 0.0) {
    vec2 cp = dir.xz / (y + 0.08) * 1.6 + uCloudOffset;
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
  col += milky * uStars * (1.0 - cloud);
  // Salama valaisee pilvet ja taivaan.
  col += vec3(0.75, 0.8, 1.0) * uFlash * (0.25 + cloud * 0.9);

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
      uCloudOffset: { value: new THREE.Vector2() },
      uGalaxyN: { value: new THREE.Vector3(0.35, 0.3, 0.88).normalize() },
      uGalaxyC: { value: new THREE.Vector3(1, 0, 0) },
      uFlash: { value: 0 },
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
