// Sessio 34: soihdun liekki (käyttäjä: hyperrealistinen liekki, jossa on
// fysiikka ja joka heiluu tuulen mukana). Liekki piirretään shaderilla:
// kerroksellinen kohina nousee ylös, muoto kapenee ja repeilee kärjestä,
// ja väri kulkee kuumasta valkokeltaisesta ytimestä oranssin kautta
// punaiseen. Tyvessä on sininen hehku. Suunta lasketaan maailmassa: liekki
// pyrkii ylöspäin (noste), ja ilmavirta (soihdun liike ja tuuli) kallistaa
// sitä. Kallistus jousitetaan, joten liekki laahaa liikkeen perässä ja
// taipuu kaarelle. Lisäksi kipinöitä ja pehmeä hehku.
import * as THREE from 'three';

const VERT = /* glsl */`
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const FRAG = /* glsl */`
uniform float uTime;
uniform float uSeed;
uniform float uBend;
uniform float uPower;
varying vec2 vUv;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.03 + 17.1; a *= 0.5; }
  return v;
}
void main() {
  // x -1..1 (leveys), y 0..1 (tyvestä kärkeen)
  float y = vUv.y;
  float x = vUv.x * 2.0 - 1.0;
  // Taipuma: kärki jää jälkeen (laahaus).
  x -= uBend * y * y;
  float t = uTime + uSeed;
  // Nouseva, pyörteinen kohina.
  vec2 q = vec2(x * 1.6, y * 2.2 - t * 2.4);
  float n = fbm(q + vec2(fbm(q * 1.7 + t * 0.6) * 0.9, 0.0));
  float n2 = fbm(vec2(x * 3.5, y * 4.0 - t * 4.2));
  // Muoto: leveä tyvi, kapenee ylöspäin; kohina repii reunat ja kärjen.
  float w = mix(0.8, 0.04, pow(y, 0.7)) * (0.75 + 0.5 * n);
  float d = abs(x + (n2 - 0.5) * 0.35 * y) / max(w, 0.02);
  float body = 1.0 - smoothstep(0.55, 1.0, d);
  float top = 1.0 - smoothstep(0.45 + 0.35 * n, 0.98, y);
  float base = smoothstep(0.0, 0.08, y);
  float flame = body * top * base;
  // Kuumuus: ydin alhaalla keskellä.
  float heat = flame * (1.0 - smoothstep(0.0, 0.9, d)) * (1.0 - y * 0.75) * (0.7 + 0.6 * n2);
  vec3 col = mix(vec3(0.75, 0.12, 0.02), vec3(1.0, 0.45, 0.08), smoothstep(0.05, 0.35, heat));
  col = mix(col, vec3(1.0, 0.82, 0.42), smoothstep(0.3, 0.65, heat));
  col = mix(col, vec3(1.0, 0.97, 0.86), smoothstep(0.6, 0.95, heat));
  // Sininen tyvi (puhdas palaminen kankaan pinnassa).
  float blue = (1.0 - smoothstep(0.0, 0.14, y)) * (1.0 - smoothstep(0.2, 0.8, d)) * 0.5;
  col = mix(col, vec3(0.25, 0.4, 1.0), blue * (1.0 - heat));
  float a = clamp(flame * (0.55 + 0.9 * heat), 0.0, 1.0) * uPower;
  if (a < 0.003) discard;
  gl_FragColor = vec4(col * a * 1.6, a);
}`;

const _v = new THREE.Vector3();
const _w = new THREE.Vector3();
const _x = new THREE.Vector3();
const _z = new THREE.Vector3();
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _up = new THREE.Vector3();

export class TorchFlame {
  constructor(scene, seed = 0, haloTex = null) {
    this.scene = scene;
    this.uniforms = { uTime: { value: 0 }, uSeed: { value: seed * 7.3 }, uBend: { value: 0 }, uPower: { value: 1 } };
    const mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms, vertexShader: VERT, fragmentShader: FRAG,
      transparent: true, depthWrite: false, blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, side: THREE.DoubleSide,
    });
    // Kaksi tasoa ristiin: liekillä on paksuutta katsottiin mistä tahansa.
    const g = new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0);
    this.group = new THREE.Group();
    this.planes = [];
    for (let i = 0; i < 2; i++) {
      const p = new THREE.Mesh(g, mat);
      p.rotation.y = i * Math.PI / 2;
      p.renderOrder = 5;
      p.frustumCulled = false;
      this.group.add(p);
      this.planes.push(p);
    }
    // Toinen, pienempi liekkikieli eri vaiheessa (täyteläisempi liekki).
    this.uniforms2 = { uTime: this.uniforms.uTime, uSeed: { value: seed * 7.3 + 3.1 }, uBend: this.uniforms.uBend, uPower: this.uniforms.uPower };
    const mat2 = mat.clone();
    mat2.uniforms = this.uniforms2;
    this.inner = new THREE.Group();
    for (let i = 0; i < 2; i++) {
      const p = new THREE.Mesh(g, mat2);
      p.rotation.y = Math.PI / 4 + i * Math.PI / 2;
      p.renderOrder = 5;
      p.frustumCulled = false;
      this.inner.add(p);
    }
    this.inner.scale.set(0.75, 0.82, 0.75);
    this.inner.position.set(0.05, 0, 0.03);
    this.group.add(this.inner);
    this.mat = mat;
    scene.add(this.group);
    this.halo = haloTex ? new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex, color: 0xff7a20, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.18 })) : null;
    if (this.halo) { this.halo.renderOrder = 4; scene.add(this.halo); }
    // Kipinät (maailmassa; muunnetaan näkymään joka ruutu).
    this.sparkMax = 40;
    this.sparks = [];
    const sg = new THREE.BufferGeometry();
    this.sparkPos = new Float32Array(this.sparkMax * 3);
    this.sparkCol = new Float32Array(this.sparkMax * 3);
    sg.setAttribute('position', new THREE.BufferAttribute(this.sparkPos, 3).setUsage(THREE.DynamicDrawUsage));
    sg.setAttribute('color', new THREE.BufferAttribute(this.sparkCol, 3).setUsage(THREE.DynamicDrawUsage));
    this.points = new THREE.Points(sg, new THREE.PointsMaterial({ size: 0.006, vertexColors: true, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    this.points.frustumCulled = false;
    this.points.renderOrder = 6;
    scene.add(this.points);
    this.dir = new THREE.Vector3(0, 1, 0);   // liekin suunta maailmassa (jousitettu)
    this.dirV = new THREE.Vector3();
    this.lag = new THREE.Vector3(0, 1, 0);   // kärjen hitaampi suunta (taipuma)
    this.prevTip = null;
    this.vel = new THREE.Vector3();
    this.emit = 0;
    this.visible = true;
  }

  setVisible(v) {
    this.group.visible = v;
    if (this.halo) this.halo.visible = v;
    this.visible = v;
    if (!v) this.prevTip = null;
  }

  // tipView = soihdun kärki näkymän koordinaateissa (viewmodel-kamera),
  // cam = pelin kamera (maailman suunnat), wind = { x, z } m/s,
  // power = 0..1 (sateessa yskivä liekki), size = koko (m).
  update(dt, time, tipView, cam, wind, power = 1, size = 0.16) {
    if (!this.visible || dt <= 0) return;
    cam.updateMatrixWorld();
    // Kärki maailmassa -> nopeus (pelaajan liike, kääntyminen ja isku).
    const tipW = _w.copy(tipView).applyMatrix4(cam.matrixWorld);
    if (!this.prevTip) { this.prevTip = tipW.clone(); this.vel.set(0, 0, 0); }
    _v.subVectors(tipW, this.prevTip).divideScalar(Math.max(dt, 1e-3));
    this.vel.lerp(_v, 1 - Math.exp(-dt * 20));
    this.prevTip.copy(tipW);
    // Ilmavirta liekin suhteen: tuuli miinus soihdun nopeus.
    const ax = (wind ? wind.x : 0) - this.vel.x, az = (wind ? wind.z : 0) - this.vel.z, ay = -this.vel.y;
    // Tavoitesuunta: noste ylös + ilmavirta (heikko liekki taipuu helpommin).
    const lift = 2.2;
    _v.set(ax * 0.55, lift + ay * 0.35, az * 0.55);
    // Pieni lepatus.
    _v.x += Math.sin(time * 11.3 + this.uniforms.uSeed.value) * 0.18 + Math.sin(time * 23.7) * 0.07;
    _v.z += Math.cos(time * 9.1 + this.uniforms.uSeed.value) * 0.18;
    _v.normalize();
    if (_v.y < 0.15) { _v.y = 0.15; _v.normalize(); }
    // Jousi (liekki on kevyt: nopea mutta hieman heiluva).
    const k = 60, c = 9;
    this.dirV.addScaledVector(_z.subVectors(_v, this.dir), k * dt).multiplyScalar(Math.exp(-c * dt));
    this.dir.addScaledVector(this.dirV, dt).normalize();
    this.lag.lerp(this.dir, 1 - Math.exp(-dt * 7)).normalize();
    // Näkymän koordinaatteihin.
    _q.copy(cam.quaternion).invert();
    const dirView = _up.copy(this.dir).applyQuaternion(_q);
    const lagView = _z.copy(this.lag).applyQuaternion(_q);
    // Taso: Y liekin suuntaan, kasvot kameraa kohti (kamera origossa).
    const toCam = _v.copy(tipView).negate().normalize();
    _x.crossVectors(dirView, toCam).normalize();
    const zz = new THREE.Vector3().crossVectors(_x, dirView).normalize();
    _m.makeBasis(_x, dirView, zz);
    this.group.position.copy(tipView).addScaledVector(dirView, -size * 0.32);
    this.group.quaternion.setFromRotationMatrix(_m);
    const flick = 0.9 + Math.sin(time * 13 + this.uniforms.uSeed.value) * 0.06 + Math.sin(time * 31) * 0.04;
    const s = size * (0.55 + 0.45 * power) * flick;
    const stretch = 1 + Math.min(0.35, this.vel.length() * 0.06);
    this.group.scale.set(s * 0.75, s * stretch, s * 0.75);
    // Taipuma: kärjen suunnan ero tasossa.
    this.uniforms.uBend.value = THREE.MathUtils.clamp(lagView.dot(_x) - dirView.dot(_x), -0.6, 0.6) * -1.2;
    this.uniforms.uTime.value = time;
    this.uniforms.uPower.value = 0.55 + 0.45 * power;
    if (this.halo) {
      this.halo.position.copy(tipView).addScaledVector(dirView, s * 0.35);
      this.halo.scale.setScalar(s * 1.5);
      this.halo.material.opacity = (0.12 + 0.04 * Math.sin(time * 17)) * (0.5 + 0.5 * power);
    }
    // Kipinät maailmassa.
    this.emit += dt * (6 + this.vel.length() * 3) * power;
    while (this.emit > 1) {
      this.emit -= 1;
      if (this.sparks.length >= this.sparkMax) this.sparks.shift();
      this.sparks.push({
        p: tipW.clone().addScaledVector(this.dir, size * 0.3 * Math.random()),
        v: new THREE.Vector3((Math.random() - 0.5) * 0.5, 0.6 + Math.random() * 0.9, (Math.random() - 0.5) * 0.5).addScaledVector(this.vel, 0.6),
        age: 0, life: 0.5 + Math.random() * 0.9,
      });
    }
    const inv = cam.matrixWorldInverse;
    let n = 0;
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const sp = this.sparks[i];
      sp.age += dt;
      if (sp.age > sp.life) { this.sparks.splice(i, 1); continue; }
      sp.v.x += ((wind ? wind.x : 0) - sp.v.x) * dt * 1.5 + (Math.random() - 0.5) * dt * 3;
      sp.v.z += ((wind ? wind.z : 0) - sp.v.z) * dt * 1.5 + (Math.random() - 0.5) * dt * 3;
      sp.v.y += dt * 0.4;
      sp.p.addScaledVector(sp.v, dt);
      _v.copy(sp.p).applyMatrix4(inv);
      this.sparkPos.set([_v.x, _v.y, _v.z], n * 3);
      const f = 1 - sp.age / sp.life;
      this.sparkCol.set([1.0 * f, 0.55 * f * f, 0.15 * f * f * f], n * 3);
      n++;
    }
    this.points.geometry.setDrawRange(0, n);
    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.geometry.attributes.color.needsUpdate = true;
  }
}
