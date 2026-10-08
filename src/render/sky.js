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
uniform float uMoonPhase;   // 0 uusikuu, 0,5 täysikuu (sessio 13)
uniform sampler2D uMoonTex; // sessio 25: kuun pinta valokuvasta
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
uniform vec3 uMeteorA;   // tähdenlennon alku- ja loppusuunta
uniform vec3 uMeteorB;
uniform vec4 uMeteor;    // x = eteneminen 0..1, y = vanan kirkkaus, z = kärjen kirkkaus, w = vanan pituus
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
    // Linnunrata (sessio 11: himmeä ja rakeinen kuten oikeasti pimeällä
    // taivaalla): leveä, epätasareunainen vyö, joka koostuu lukemattomista
    // himmeistä tähdistä ja tähtipilvistä. Kirkkain galaksin keskustan
    // suunnassa, hennot pölykaistat, lähes väritön. Horisontissa ilmakehä
    // himmentää.
    float b0 = dot(dir, uGalaxyN);
    vec3 gu = uGalaxyC;
    vec3 gv = cross(uGalaxyN, gu);
    float along = atan(dot(dir, gv), dot(dir, gu));
    // Kohinan koordinaatit ilman kulman ±180° hyppyä (sessio 12d: atan-
    // koordinaatti teki vyöhön saumaviivan): vyön suuntainen ympyrä + leveys.
    vec2 ring = vec2(dot(dir, gu), dot(dir, gv)) * 6.0;
    vec2 gp = ring + vec2(b0 * 26.0, -b0 * 17.0);
    float edge = fbm(gp * 0.7 + 5.0);
    float b = b0 + (edge - 0.5) * 0.06;
    float band = exp(-b * b / 0.016);
    float core = exp(-along * along / 0.5);
    float clouds = fbm(gp * 1.3 + 3.0);
    float dust = fbm(gp * vec2(1.8, 3.2) + 11.0);
    float lane = smoothstep(0.5, 0.66, dust) * exp(-b0 * b0 / 0.0025) * (0.25 + 0.3 * core);
    // Rakeisuus tulee himmeistä tähdistä (alla); pikseliä pienempi rae
    // välkkyi ja näkyi pikseleinä (sessio 12d).
    float glow = band * (0.35 + 0.65 * clouds) * (1.0 - lane) * (0.35 + 0.9 * core);
    vec3 mwCol = mix(vec3(0.82, 0.86, 1.0), vec3(1.0, 0.94, 0.84), clamp(core * band, 0.0, 1.0));
    float extinction = smoothstep(0.02, 0.4, y);
    // Sessio 20: himmeämpi (käyttäjä: liian kirkas/voimakas).
    milky = mwCol * glow * 0.018 * extinction;
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
    // Himmeät tähdet, tiheimmillään linnunradan vyössä. Solu n. 2 px, ja
    // tähden reuna on pehmeä, jotta ne eivät välky pikseleinä.
    vec3 sp2 = dir * 340.0;
    vec3 cell2 = floor(sp2);
    float h2 = hash3(cell2 + 17.0);
    float thr = 0.992 - band * 0.028 * (0.6 + clouds);
    if (h2 > thr) {
      vec3 c2 = cell2 + 0.25 + 0.5 * vec3(hash3(cell2 + 3.1), hash3(cell2 + 5.7), hash3(cell2 + 8.3));
      float d2 = length(sp2 - c2);
      starAmt += smoothstep(0.5, 0.05, d2) * (0.25 + 0.25 * fract(h2 * 731.0)) * (0.75 + 0.25 * sin(uTime * 2.0 + h2 * 50.0)) * extinction;
    }
  }

  // Kuu. Sessio 21: kiekon reuna ja vaihe lasketaan samasta säteestä, eikä
  // täysikuun reuna jää himmeäksi (ennen kiekon ympärille jäi harmaa kehä).
  float md = max(dot(dir, uMoonDir), 0.0);
  float moon = 0.0;
  if (md > 0.999 && uMoonVisible > 0.0) {
    vec3 mr = normalize(cross(uMoonDir, vec3(0.0, 1.0, 0.0)));
    vec3 mu = cross(mr, uMoonDir);
    vec3 off = dir - uMoonDir * md;
    vec2 q = vec2(dot(off, mr), dot(off, mu)) / 0.0285;
    float r = length(q);
    float mDisc = 1.0 - smoothstep(0.92, 1.0, r);
    vec2 qn = q / max(r, 1.0);
    float qz = sqrt(max(0.0, 1.0 - dot(qn, qn)));
    // Valaistu osa: pallon pinta, valo vaiheen suunnasta; varjopuoli hohtaa
    // hyvin himmeästi (maanvalo), reuna hieman tummempi.
    float th = uMoonPhase * 6.2832;
    // Reunalla (qz = 0) valon raja on tarkalleen kiekon reunassa: siirretään
    // rajaa vaiheen mukaan, jottei täysikuulle jää tumma eikä uudellekuulle
    // vaalea kehä.
    float lit = smoothstep(-0.05, 0.05, dot(vec3(qn, qz), vec3(-sin(th), 0.0, -cos(th))) - 0.08 * cos(th));
    // Sessio 25: pinnan kuviot valokuvasta (mare-alueet tummempia).
    float alb = pow(texture2D(uMoonTex, clamp(q * 0.5 + 0.5, 0.0, 1.0)).r, 1.5) / 0.2;
    alb = mix(1.0, alb, 0.85);
    moon = mDisc * mix(0.022, 0.84 + 0.16 * qz, lit) * alb * uMoonVisible;
  }
  float moonIllum = 0.5 - 0.5 * cos(uMoonPhase * 6.2832);
  col += vec3(0.6, 0.65, 0.8) * pow(md, 200.0) * 0.12 * uMoonVisible * moonIllum;

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
  // Kuunvalo peittää himmeän linnunradan.
  col += milky * uStars * (1.0 - cloud) * (1.0 - 0.3 * moonIllum * uMoonVisible * smoothstep(0.0, 0.4, uMoonDir.y));
  // Tähdenlento: ohut, nopeasti häipyvä viiva, kirkkain kärjestä.
  if (uMeteor.y + uMeteor.z > 0.001) {
    vec3 mh = normalize(mix(uMeteorA, uMeteorB, uMeteor.x));
    vec3 mt = normalize(mix(uMeteorA, uMeteorB, max(0.0, uMeteor.x - uMeteor.w)));
    vec3 seg = mh - mt;
    float sl = max(dot(seg, seg), 1e-8);
    float k = clamp(dot(dir - mt, seg) / sl, 0.0, 1.0);
    float md2 = length(dir - (mt + seg * k));
    float trail = smoothstep(0.0016, 0.0, md2) * k * k;
    float head = smoothstep(0.003, 0.0, length(dir - mh));
    col += vec3(0.85, 0.9, 1.0) * (trail * 0.9 * uMeteor.y + head * 0.6 * uMeteor.z) * (1.0 - cloud);
  }
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
      uMoonPhase: { value: 0.5 },
      uMoonTex: { value: null },
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
      uMeteorA: { value: new THREE.Vector3(0, 1, 0) },
      uMeteorB: { value: new THREE.Vector3(0, 1, 0) },
      uMeteor: { value: new THREE.Vector4(0, 0, 0, 0.35) },
    };
    // Sessio 25: kuun valokuva (128 px, ilman mipmappeja: kiekko on pieni).
    const moonPh = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
    moonPh.needsUpdate = true;
    this.uniforms.uMoonTex.value = moonPh;
    new THREE.TextureLoader().load('assets/textures/moon.jpg', (t) => {
      t.generateMipmaps = false;
      t.minFilter = THREE.LinearFilter;
      this.uniforms.uMoonTex.value = t;
    });
    // Tähdenlennot: satunnaisesti kirkkaina öinä.
    this.meteorTimer = 6 + Math.random() * 10;
    this.meteorT = -1;
    this.meteorDur = 0.6;
    this.meteorFade = 1;
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

  // dt = todellinen aika, clear = tähtien näkyvyys × selkeys (0..1).
  updateMeteors(dt, clear) {
    const u = this.uniforms;
    // Sessio 29: kärki syttyy, hidastuu ja hiipuu loppumatkalla; vana jää
    // hehkumaan ja häipyy pehmeästi (lyhenee hännästä), ei katoa kerralla.
    if (this.meteorT >= 0) {
      this.meteorT += dt;
      const t = this.meteorT, dur = this.meteorDur, fade = this.meteorFade;
      const n = Math.min(1, t / dur);
      const rise = Math.min(1, n / 0.12);
      const x = 1 - (1 - n) ** 1.5;
      const f = Math.max(0, (t - dur) / fade);
      const tail = 1 - f * f * (3 - 2 * Math.min(1, f));
      const head = rise * (1 - smoothstep(0.55, 1, n)) * (1 + 0.25 * Math.sin(t * 40) * n);
      u.uMeteor.value.set(x, rise * tail * this.meteorB, head * this.meteorB, 0.35 * (1 - 0.65 * Math.min(1, f)));
      if (f >= 1) { this.meteorT = -1; u.uMeteor.value.set(0, 0, 0, 0.35); }
      return;
    }
    if (clear < 0.4) return;
    this.meteorTimer -= dt;
    if (this.meteorTimer > 0) return;
    this.meteorTimer = 5 + Math.random() * 17; // sessio 29: hieman useammin (ennen 8–38 s)
    // Alku 30-70° korkeudella, kulkee 8-22° enimmäkseen alaspäin.
    const az = Math.random() * Math.PI * 2, el = (30 + Math.random() * 40) * Math.PI / 180;
    u.uMeteorA.value.set(Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az));
    const len = (8 + Math.random() * 14) * Math.PI / 180;
    const dAz = (Math.random() - 0.5) * 2.2, dEl = -(0.4 + Math.random() * 0.8);
    const el2 = Math.max(0.1, el + dEl * len), az2 = az + dAz * len / Math.max(0.3, Math.cos(el));
    u.uMeteorB.value.set(Math.cos(el2) * Math.cos(az2), Math.sin(el2), Math.cos(el2) * Math.sin(az2));
    this.meteorDur = 0.45 + Math.random() * 0.6;
    this.meteorFade = 0.7 + Math.random() * 0.6;
    this.meteorB = (0.5 + Math.random() * 0.5) * clear;
    this.meteorT = 0;
  }
}

function smoothstep(a, b, x) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}
