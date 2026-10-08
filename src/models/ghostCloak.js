// Sessio 27: haamun viitta kankaana (käyttäjä: viitta oikeasti viittamaiseksi,
// paremmat tekstuurit ja mieluiten fysiikka, jolloin se heiluu ja lepattaa
// haamun liikkeiden mukaan).
//
// Viitta on kangasverkko (COLS × ROWS pistettä), jonka ylin rivi on kiinni
// hartioissa. Muut pisteet simuloidaan maailmassa (Verlet + pituusrajoitteet):
// liikkeessä viitta laahaa perässä, helma lepattaa pyörteissä ja nousee
// leijuessa (haamu on kevyt), eikä kangas painu vartalon sisään.
// Tekstuuri piirretään kankaalle: tumma, kulunut kudos, riekaleinen helma
// (läpinäkyvät repeämät) ja himmeästi hohtavat violetit kirjailut.
import * as THREE from 'three';

const COLS = 16;
const ROWS = 11;
const TOP_R = 0.17;      // kiinnityskehän säde hartioilla
const HEM_R = 0.5;       // helman säde levossa
const LEN = 1.42;        // viitan pituus
const TOP_Y = 0.5;       // kiinnityskorkeus vartalon koordinaatistossa

let texCache = null;
function cloakTextures() {
  if (texCache) return texCache;
  const W = 256, H = 256;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  const img = g.createImageData(W, H);
  const e = document.createElement('canvas');
  e.width = W; e.height = H;
  const ge = e.getContext('2d');
  ge.fillStyle = '#000';
  ge.fillRect(0, 0, W, H);
  const hash = (x, y) => {
    const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
    return s - Math.floor(s);
  };
  const noise = (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = hash(xi, yi), b = hash(xi + 1, yi), cc = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
    return a + (b - a) * u + (cc - a) * v + (a - b - cc + d) * u * v;
  };
  // Helman repeämät: kunkin sarakkeen alaraja vaihtelee (u kiertää, joten jatkuva).
  const hem = (u) => 0.86 + 0.08 * Math.sin(u * Math.PI * 2 * 5 + 1.3) + 0.05 * Math.sin(u * Math.PI * 2 * 13) + 0.04 * (noise(u * 40, 3) - 0.5);
  for (let y = 0; y < H; y++) {
    const v = y / (H - 1);
    for (let x = 0; x < W; x++) {
      const u = x / (W - 1);
      // Kudos: hienot pysty- ja vaakalangat + laikukas kuluminen.
      const weave = 0.92 + 0.08 * Math.sin(x * 2.4) * Math.sin(y * 2.4);
      const wear = 0.75 + 0.35 * noise(u * 12, v * 12) + 0.15 * noise(u * 40, v * 40);
      // Laskosten varjo (pystyraidat) ja tummuus helmaa kohti.
      const fold = 0.8 + 0.2 * Math.sin(u * Math.PI * 2 * 6 + noise(u * 3, v * 2) * 2);
      const k = weave * wear * fold * (1 - 0.35 * v);
      let r = 22 * k, gg = 16 * k, b = 34 * k;
      let a = 255;
      const h = hem(u);
      if (v > h) a = 0;
      else if (v > h - 0.06) { const t = (v - (h - 0.06)) / 0.06; r *= 1 - 0.5 * t; gg *= 1 - 0.5 * t; b *= 1 - 0.4 * t; }
      // Reikiä kuluneessa kankaassa helman yläpuolella.
      if (v > 0.55 && noise(u * 28 + 7, v * 18) > 0.83 - (v - 0.55) * 0.25) a = 0;
      const o = (y * W + x) * 4;
      img.data[o] = r; img.data[o + 1] = gg; img.data[o + 2] = b; img.data[o + 3] = a;
    }
  }
  g.putImageData(img, 0, 0);
  // Kirjailut: kaksi nauhaa riimumaisia kuvioita, himmeä violetti hehku.
  ge.strokeStyle = 'rgba(150,90,255,0.9)';
  ge.lineWidth = 2;
  for (const band of [0.66, 0.74]) {
    const y0 = band * H;
    for (let i = 0; i < 18; i++) {
      const x0 = (i / 18) * W + 3;
      ge.beginPath();
      const sh = Math.floor(hash(i, band * 10) * 4);
      if (sh === 0) { ge.moveTo(x0, y0 - 5); ge.lineTo(x0 + 5, y0 + 5); ge.lineTo(x0 + 10, y0 - 5); }
      else if (sh === 1) { ge.moveTo(x0 + 5, y0 - 6); ge.lineTo(x0 + 5, y0 + 6); ge.moveTo(x0, y0); ge.lineTo(x0 + 10, y0); }
      else if (sh === 2) { ge.arc(x0 + 5, y0, 4, 0, Math.PI * 2); }
      else { ge.moveTo(x0, y0 + 5); ge.lineTo(x0 + 5, y0 - 5); ge.lineTo(x0 + 10, y0 + 5); ge.lineTo(x0, y0 + 5); }
      ge.stroke();
    }
    ge.fillStyle = 'rgba(120,70,220,0.5)';
    ge.fillRect(0, y0 - 9, W, 1);
    ge.fillRect(0, y0 + 8, W, 1);
  }
  // Kirjailut näkyvät myös värikartassa hieman vaaleampina.
  g.globalCompositeOperation = 'lighter';
  g.globalAlpha = 0.25;
  g.drawImage(e, 0, 0);
  const map = new THREE.CanvasTexture(c);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  const emissiveMap = new THREE.CanvasTexture(e);
  emissiveMap.colorSpace = THREE.SRGBColorSpace;
  emissiveMap.wrapS = THREE.RepeatWrapping;
  texCache = { map, emissiveMap };
  return texCache;
}

const _m = new THREE.Matrix4();
const _v = new THREE.Vector3();
const _ax = new THREE.Vector3();
const _o = new THREE.Vector3();

export class GhostCloak {
  constructor(seed = 1) {
    const { map, emissiveMap } = cloakTextures();
    this.material = new THREE.MeshStandardMaterial({
      map, emissiveMap, emissive: new THREE.Color(0x6a40ff), emissiveIntensity: 0.6,
      roughness: 0.92, metalness: 0, side: THREE.DoubleSide, alphaTest: 0.5, transparent: false,
    });
    const n = (COLS + 1) * ROWS;
    this.p = new Float32Array(n * 3);
    this.q = new Float32Array(n * 3);
    this.ready = false;
    this.seed = seed;
    // Verkko: sarake COLS on sama kuin 0 (sauma), jotta UV kiertää ympäri.
    const geo = new THREE.BufferGeometry();
    this.pos = new THREE.BufferAttribute(new Float32Array(n * 3), 3).setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('position', this.pos);
    const uv = new Float32Array(n * 2);
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c <= COLS; c++) {
        const i = r * (COLS + 1) + c;
        uv[i * 2] = c / COLS;
        uv[i * 2 + 1] = 1 - r / (ROWS - 1);
      }
    }
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    const idx = [];
    for (let r = 0; r < ROWS - 1; r++) {
      for (let c = 0; c < COLS; c++) {
        const a = r * (COLS + 1) + c, b = a + 1, d = a + COLS + 1, e = d + 1;
        idx.push(a, d, b, b, d, e);
      }
    }
    geo.setIndex(idx);
    this.geo = geo;
    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.castShadow = true;
    this.mesh.frustumCulled = false;
    // Kangas simuloidaan maailman koordinaateissa.
    this.mesh.matrixAutoUpdate = false;
    this.mesh.matrixWorldAutoUpdate = false;
    // Lepoasento vartalon koordinaatistossa ja pituudet.
    this.restV = LEN / (ROWS - 1);
    this.restH = [];
    this.hemK = [];
    for (let r = 0; r < ROWS; r++) {
      const t = r / (ROWS - 1);
      this.restH.push((2 * Math.PI * (TOP_R + (HEM_R - TOP_R) * Math.pow(t, 0.8))) / COLS);
    }
    for (let c = 0; c <= COLS; c++) this.hemK.push(0.6 + 0.4 * Math.sin(c * 1.7 + seed));
  }

  _local(r, c, out) {
    const t = r / (ROWS - 1);
    const a = (c / COLS) * Math.PI * 2;
    const rad = TOP_R + (HEM_R - TOP_R) * Math.pow(t, 0.8);
    return out.set(Math.cos(a) * rad, TOP_Y - t * LEN, Math.sin(a) * rad);
  }

  // torso = vartalon Object3D (päivitetty matriisi), dt (s), time (s),
  // wind = { x, z } (maailma, m/s²), scale = haamun koko.
  update(torso, dt, time, wind) {
    const W = COLS + 1;
    const P = this.p, Q = this.q;
    _m.copy(torso.matrixWorld);
    const sc = _v.setFromMatrixScale(_m).x || 1;
    if (!this.ready) {
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c <= COLS; c++) {
          this._local(r, c, _v).applyMatrix4(_m);
          const i = (r * W + c) * 3;
          P[i] = Q[i] = _v.x; P[i + 1] = Q[i + 1] = _v.y; P[i + 2] = Q[i + 2] = _v.z;
        }
      }
      this.ready = true;
    }
    const steps = dt > 1 / 45 ? 2 : 1;
    const h = Math.min(dt, 1 / 20) / steps;
    // Vartalon akseli (alaspäin) ja keskikohta hartioilla.
    _ax.set(0, -1, 0).transformDirection(_m);
    _o.set(0, TOP_Y, 0).applyMatrix4(_m);
    for (let s = 0; s < steps; s++) {
      const tt = time + s * h;
      for (let r = 1; r < ROWS; r++) {
        const t = r / (ROWS - 1);
        for (let c = 0; c < COLS; c++) {
          const i = (r * W + c) * 3;
          // Leijuva kangas: heikko painovoima, pyörteet ja hento nousu helmassa.
          const ph = tt * 2.3 + c * 0.75 + r * 0.45 + this.seed;
          const turb = (Math.sin(ph) + 0.6 * Math.sin(ph * 1.9 + 2.1)) * 2.2 * t;
          const ax = wind.x * t + Math.cos(c * 0.39 + tt * 1.7) * turb;
          const az = wind.z * t + Math.sin(c * 0.39 + tt * 1.3) * turb;
          const ay = -3.2 + 2.6 * t * (0.5 + 0.5 * Math.sin(tt * 1.1 + c * 0.6 + this.seed)) * this.hemK[c];
          const vx = (P[i] - Q[i]) * 0.965, vy = (P[i + 1] - Q[i + 1]) * 0.965, vz = (P[i + 2] - Q[i + 2]) * 0.965;
          Q[i] = P[i]; Q[i + 1] = P[i + 1]; Q[i + 2] = P[i + 2];
          P[i] += vx + ax * h * h; P[i + 1] += vy + ay * h * h; P[i + 2] += vz + az * h * h;
        }
      }
      for (let it = 0; it < 5; it++) {
        // Ylin rivi kiinni hartioissa.
        for (let c = 0; c < COLS; c++) {
          this._local(0, c, _v).applyMatrix4(_m);
          const i = c * 3;
          P[i] = _v.x; P[i + 1] = _v.y; P[i + 2] = _v.z;
        }
        for (let r = 0; r < ROWS; r++) {
          for (let c = 0; c < COLS; c++) {
            const i = (r * W + c) * 3;
            // Vaakasuunta (kehä, sarake COLS = 0) ja pystysuunta.
            const j = (r * W + ((c + 1) % COLS)) * 3;
            this._link(i, j, this.restH[r] * sc, r === 0, r === 0);
            if (r < ROWS - 1) {
              const k = ((r + 1) * W + c) * 3;
              this._link(i, k, this.restV * sc * (r === ROWS - 2 ? 0.75 + 0.35 * this.hemK[c] : 1), r === 0, false);
            }
          }
        }
        // Kangas ei painu vartalon sisään (kartio hartioista alas).
        for (let r = 1; r < ROWS; r++) {
          const t = r / (ROWS - 1);
          const rb = (0.13 + 0.17 * t) * sc;
          for (let c = 0; c < COLS; c++) {
            const i = (r * W + c) * 3;
            const dx = P[i] - _o.x, dy = P[i + 1] - _o.y, dz = P[i + 2] - _o.z;
            const along = dx * _ax.x + dy * _ax.y + dz * _ax.z;
            const rx = dx - _ax.x * along, ry = dy - _ax.y * along, rz = dz - _ax.z * along;
            const d = Math.hypot(rx, ry, rz);
            if (along > -0.1 && d < rb && d > 1e-5) {
              const k = rb / d;
              P[i] = _o.x + _ax.x * along + rx * k;
              P[i + 1] = _o.y + _ax.y * along + ry * k;
              P[i + 2] = _o.z + _ax.z * along + rz * k;
            }
          }
        }
      }
    }
    // Sauma: sarake COLS = sarake 0.
    const A = this.pos.array;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c <= COLS; c++) {
        const src = (r * W + (c % COLS)) * 3, dst = (r * W + c) * 3;
        A[dst] = P[src]; A[dst + 1] = P[src + 1]; A[dst + 2] = P[src + 2];
      }
    }
    this.pos.needsUpdate = true;
    this.geo.computeVertexNormals();
  }

  _link(i, j, rest, pinI, pinJ) {
    const P = this.p;
    const dx = P[j] - P[i], dy = P[j + 1] - P[i + 1], dz = P[j + 2] - P[i + 2];
    const d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-6;
    const diff = (d - rest) / d;
    const wi = pinI ? 0 : 1, wj = pinJ ? 0 : 1;
    const ws = wi + wj;
    if (!ws) return;
    const ci = (wi / ws) * diff, cj = (wj / ws) * diff;
    P[i] += dx * ci; P[i + 1] += dy * ci; P[i + 2] += dz * ci;
    P[j] -= dx * cj; P[j + 1] -= dy * cj; P[j + 2] -= dz * cj;
  }

  reset() { this.ready = false; }
}
