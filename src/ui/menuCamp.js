// Sessio 59: päävalikon nuotioleiri (käyttäjä: valikon pitää olla kotoisa,
// idyllinen ja taiteellinen paikka, jossa voi viettää aikaa; tausta 3D-scene,
// nuotioleiri hämärässä, joka vaihtuu hiljalleen yöksi; ei hahmoa, vain
// leirin merkit; kamera liukuu leirin eri kohtiin valikon mukaan).
//
// Leiri rakennetaan valikkomaailman aukiolle (terrain.js MENU_CAMP), joka on
// kumpareella joen itäpuolella: kamera katsoo länteen auringonlaskuun.
// Varusteet ovat pelin omia Blender-esinemalleja (itemAssets.js); viltti,
// kartta ja tuulessa lepattava katos tehdään tässä. Tuli: liekki-, kipinä- ja
// savu (render/campfire.js, sama kuin pelin nuotioissa) ja lepattava
// lämmin valo.
import * as THREE from 'three';
import { itemAsset } from '../models/itemAssets.js';
import { heightAt, MENU_CAMP } from '../world/terrain.js';
import { makeCampfireBase } from '../models/items.js';
import { CampfireFx } from '../render/campfire.js';
import { addSurfaceDetail } from '../render/surfaces.js';

// Kamerakuvat suhteessa nuotioon (x itään, z etelään): sijainti ja katsekohde.
export const CAMP_SHOTS = {
  main: { pos: [3.9, 1.35, 1.6], at: [-14, 0.6, 5.2] },
  // Sessio 60: katse hieman kartan vasemmalle, jolloin kartta näkyy paneelin oikealla puolella.
  worlds: { pos: [2.6, 1.35, -0.55], at: [1.0, 0.0, -0.75] },
  settings: { pos: [0.9, 1.0, 1.35], at: [-1.6, 0.35, 0.6] },
  credits: { pos: [2.9, 0.7, 1.6], at: [-14, 10, -2.5] },
};

const _box = new THREE.Box3();
const _q = new THREE.Quaternion();
const _q2 = new THREE.Quaternion();
const _v = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);
const AXES = [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1)];

// Lepattava kangas: siirtymä normaalin suuntaan aaltoina (keskeltä eniten).
function windCloth(mat, uniforms) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uClothT = uniforms.uClothT;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uClothT;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        float cw = sin(uv.x * 3.14159) * (1.0 - uv.y) * uv.y * 4.0;
        transformed.z += cw * (0.05 * sin(uClothT * 2.1 + uv.x * 5.0 + uv.y * 3.0) + 0.025 * sin(uClothT * 5.3 + uv.x * 11.0));`);
  };
  mat.customProgramCacheKey = () => 'menuCloth';
  return mat;
}

// Kartta viltillä: pergamentti, rannikko, joki, vuoret, polku ja kompassi.
function mapTexture() {
  const W = 512, H = 384;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(W / 2, H / 2, 40, W / 2, H / 2, W * 0.62);
  grd.addColorStop(0, '#e8d6ad');
  grd.addColorStop(1, '#b8945c');
  g.fillStyle = grd;
  g.fillRect(0, 0, W, H);
  // Pergamentin laikut.
  for (let i = 0; i < 220; i++) {
    g.fillStyle = `rgba(${90 + Math.random() * 40},${60 + Math.random() * 30},30,${0.03 + Math.random() * 0.05})`;
    g.beginPath();
    g.arc(Math.random() * W, Math.random() * H, 4 + Math.random() * 30, 0, Math.PI * 2);
    g.fill();
  }
  g.strokeStyle = 'rgba(70,42,18,0.85)';
  g.lineCap = 'round';
  // Rannikko vasemmalla.
  g.lineWidth = 2.2;
  g.beginPath();
  for (let y = 0; y <= H; y += 8) {
    const x = 70 + Math.sin(y * 0.03) * 22 + Math.sin(y * 0.11) * 8;
    if (y === 0) g.moveTo(x, y); else g.lineTo(x, y);
  }
  g.stroke();
  for (let k = 1; k < 4; k++) {
    g.globalAlpha = 0.5 / k;
    g.beginPath();
    for (let y = 0; y <= H; y += 8) {
      const x = 70 - k * 9 + Math.sin(y * 0.03) * 22 + Math.sin(y * 0.11) * 8;
      if (y === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.stroke();
  }
  g.globalAlpha = 1;
  // Joki.
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(W, 70);
  g.bezierCurveTo(380, 120, 330, 60, 260, 170);
  g.bezierCurveTo(200, 260, 140, 210, 78, 300);
  g.stroke();
  // Vuoret.
  g.lineWidth = 1.8;
  for (let i = 0; i < 9; i++) {
    const x = 330 + (i % 3) * 42 + Math.random() * 10, y = 230 + Math.floor(i / 3) * 34;
    g.beginPath();
    g.moveTo(x - 16, y + 12); g.lineTo(x, y - 12); g.lineTo(x + 16, y + 12);
    g.moveTo(x, y - 12); g.lineTo(x + 5, y + 2);
    g.stroke();
  }
  // Akaasiat.
  for (let i = 0; i < 14; i++) {
    const x = 140 + Math.random() * 170, y = 40 + Math.random() * 110;
    g.beginPath();
    g.moveTo(x, y + 9); g.lineTo(x, y);
    g.moveTo(x - 9, y); g.quadraticCurveTo(x, y - 7, x + 9, y);
    g.stroke();
  }
  // Polku ja leiri (risti).
  g.setLineDash([6, 7]);
  g.lineWidth = 2;
  g.strokeStyle = 'rgba(120,30,18,0.85)';
  g.beginPath();
  g.moveTo(120, 350); g.bezierCurveTo(200, 300, 240, 330, 300, 280); g.bezierCurveTo(340, 250, 300, 200, 360, 170);
  g.stroke();
  g.setLineDash([]);
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(352, 162); g.lineTo(368, 178); g.moveTo(368, 162); g.lineTo(352, 178);
  g.stroke();
  // Kompassi.
  g.strokeStyle = 'rgba(70,42,18,0.8)';
  g.lineWidth = 1.5;
  g.beginPath();
  g.arc(450, 330, 26, 0, Math.PI * 2);
  g.moveTo(450, 296); g.lineTo(456, 330); g.lineTo(450, 364); g.lineTo(444, 330); g.closePath();
  g.stroke();
  // Reunojen kuluma.
  const edge = g.createRadialGradient(W / 2, H / 2, W * 0.35, W / 2, H / 2, W * 0.66);
  edge.addColorStop(0, 'rgba(60,35,10,0)');
  edge.addColorStop(1, 'rgba(60,35,10,0.55)');
  g.fillStyle = edge;
  g.fillRect(0, 0, W, H);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// Sessio 60: tallattu maa leirin ympärillä (käyttäjä: maa voisi olla vähän
// mutaista tai eri väristä, että huomaa, että siinä on kävelty ja temmelletty).
// Kuvat lasketaan kerran: väri ja läpinäkyvyys, karheus ja pinnanmuodosta
// normaalikartta (jalanjäljet painuvat maahan). Pikseli (i, j) vastaa
// leirin paikallista kohtaa x = −R + 2R·i/N, z = −R + 2R·j/N.
const TRAMPLE_R = 5.2;
function hash2(x, y) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function vnoise(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y);
  let fx = x - ix, fy = y - iy;
  fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy), b = hash2(ix + 1, iy), c = hash2(ix, iy + 1), d = hash2(ix + 1, iy + 1);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}
function fbm(x, y, oct = 4) {
  let v = 0, a = 0.5, s = 0;
  for (let o = 0; o < oct; o++) { v += vnoise(x, y) * a; s += a; x = x * 2.03 + 17.1; y = y * 2.03 - 9.7; a *= 0.5; }
  return v / s;
}
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
function segDist(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az;
  const t = Math.min(1, Math.max(0, ((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(px - ax - dx * t, pz - az - dz * t);
}
// Polut: itään (kameran taakse, kuivempi) ja lounaaseen joelle akaasian ohi (märkä).
const PATHS = [
  { pts: [[0.6, 0.2], [2.6, 0.9], [5.4, 1.5]], w: 0.55, wet: 0.15 },
  { pts: [[-0.9, 1.0], [-2.2, 2.6], [-3.6, 3.6], [-5.4, 4.4]], w: 0.6, wet: 1 },
  { pts: [[0.8, -0.8], [1.6, -1.6], [2.4, -2.6], [3.0, -5.4]], w: 0.42, wet: 0.3 },
];
function pathAt(x, z) {
  let best = 0, wet = 0;
  for (const p of PATHS) {
    let d = Infinity;
    for (let k = 0; k < p.pts.length - 1; k++) d = Math.min(d, segDist(x, z, p.pts[k][0], p.pts[k][1], p.pts[k + 1][0], p.pts[k + 1][1]));
    const m = 1 - smooth(p.w * 0.35, p.w, d + (fbm(x * 1.7 + 3, z * 1.7) - 0.5) * 0.35);
    if (m > best) { best = m; wet = p.wet; }
  }
  return [best, wet];
}

function trampledGround() {
  const N = 768, R = TRAMPLE_R, px = (2 * R) / N;
  const H = new Float32Array(N * N);
  const col = new Float32Array(N * N * 3);
  const alpha = new Float32Array(N * N);
  const rough = new Float32Array(N * N);
  const P = (i) => -R + 2 * R * (i + 0.5) / N;
  // Maan sävyt (lineaarinen 0..1, muunnetaan sRGB:ksi lopuksi).
  // sRGB: maa (138, 104, 72) ja (112, 82, 56), muta (82, 60, 41), märkä muta
  // (54, 40, 29), tuhka (150, 145, 138), noki (45, 40, 36).
  const EARTH = [0.254, 0.141, 0.064], EARTH2 = [0.162, 0.084, 0.039], MUD = [0.085, 0.045, 0.022], WETMUD = [0.037, 0.021, 0.012];
  const ASH = [0.30, 0.28, 0.25], SOOT = [0.026, 0.021, 0.018];
  for (let j = 0; j < N; j++) {
    const z = P(j);
    for (let i = 0; i < N; i++) {
      const x = P(i);
      const p = j * N + i;
      const r = Math.hypot(x, z);
      const eN = fbm(x * 0.55 + 11, z * 0.55 - 4, 3);
      const [path, pathWet] = pathAt(x, z);
      // Tallattu alue: nuotion ympärys, istumapuiden ja taljan kohdat ja polut.
      let wear = 1 - smooth(2.3 + eN * 0.9, 3.9 + eN * 1.1, r);
      wear = Math.max(wear, path * 0.92);
      // Rikkonainen reuna: tallattu laikku haihtuu ruohikkoon epätasaisesti.
      const grain = fbm(x * 6 + 2, z * 6 - 7, 3);
      const a = smooth(0.08, 0.55, wear + (grain - 0.5) * 0.45 * (1 - wear));
      alpha[p] = a;
      // Pohjaväri: tiivistynyt maa, jossa sävyvaihtelua.
      const n1 = fbm(x * 1.3, z * 1.3, 4), n2 = fbm(x * 9 + 5, z * 9 + 1, 3);
      const c = [0, 0, 0];
      for (let k = 0; k < 3; k++) c[k] = EARTH[k] + (EARTH2[k] - EARTH[k]) * n1;
      // Muta: notkelmissa ja polulla joelle (vettä kannettu, kengät märkinä).
      const mudN = fbm(x * 0.7 - 21, z * 0.7 + 13, 4);
      let mud = smooth(0.5, 0.68, mudN + pathWet * path * 0.28) * wear;
      mud = Math.max(mud, smooth(0.25, 0.9, path * pathWet) * 0.85 * (0.6 + 0.4 * n1));
      const wetCore = smooth(0.62, 0.8, mudN + pathWet * path * 0.3) * mud;
      for (let k = 0; k < 3; k++) {
        c[k] += (MUD[k] - c[k]) * mud * 0.85;
        c[k] += (WETMUD[k] - c[k]) * wetCore * 0.8;
      }
      // Tuhka ja noki nuotion ympärillä (tuulen mukana enemmän itään).
      const ashR = Math.hypot(x - 0.25, z + 0.05);
      const ash = (1 - smooth(0.75, 1.75 + eN * 0.6, ashR)) * smooth(0.3, 0.7, fbm(x * 3 + 40, z * 3, 3) + 0.15);
      for (let k = 0; k < 3; k++) {
        c[k] += (ASH[k] - c[k]) * ash * 0.55;
        c[k] += (SOOT[k] - c[k]) * (1 - smooth(0.7, 1.15, ashR)) * 0.55;
      }
      // Hienojakoinen kirjo (murut, kuivuneet kokkareet).
      const g = 0.86 + n2 * 0.28;
      col[p * 3] = c[0] * g; col[p * 3 + 1] = c[1] * g; col[p * 3 + 2] = c[2] * g;
      // Pinnanmuoto: kokkareinen maa, muta sileämpää.
      H[p] = (fbm(x * 4, z * 4, 4) * 0.012 + n2 * 0.004) * (1 - mud * 0.6) - mud * 0.006;
      rough[p] = 0.97 - wetCore * 0.45 - mud * 0.12;
    }
  }

  // Leimasimet: kuvapisteet kohdan (x, z) ympäriltä säteellä rr.
  const stamp = (x, z, rr, fn) => {
    const ci = (x + R) / px - 0.5, cj = (z + R) / px - 0.5, rp = Math.ceil(rr / px) + 1;
    for (let j = Math.max(0, Math.floor(cj - rp)); j <= Math.min(N - 1, Math.ceil(cj + rp)); j++) {
      for (let i = Math.max(0, Math.floor(ci - rp)); i <= Math.min(N - 1, Math.ceil(ci + rp)); i++) {
        fn(j * N + i, (i - ci) * px, (j - cj) * px);
      }
    }
  };
  const rand = (() => { let s = 1234567; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; })();

  // Hankaumat: pitkulaisia, tummempia ja sileämpiä laikkuja, enimmäkseen
  // nuotion ympäri kiertäen (askeleet ja raahatut puut). Ne tekevät maasta
  // tallatun näköisen paremmin kuin erilliset jäljet.
  for (let k = 0; k < 170; k++) {
    const a = rand() * Math.PI * 2, r = 0.9 + Math.pow(rand(), 0.8) * 2.9;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    const ang = a + Math.PI / 2 + (rand() - 0.5) * 0.9;
    const len = 0.12 + rand() * 0.3, wid = 0.04 + rand() * 0.06, dk = 0.06 + rand() * 0.12;
    const ca = Math.cos(ang), sa = Math.sin(ang);
    stamp(x, z, len, (p, dx, dz) => {
      const u = dx * ca + dz * sa, v = -dx * sa + dz * ca;
      const d = Math.hypot(u / len, v / wid);
      const m = (1 - smooth(0.4, 1, d)) * alpha[p];
      if (m <= 0) return;
      const kk = 1 - dk * m;
      col[p * 3] *= kk; col[p * 3 + 1] *= kk; col[p * 3 + 2] *= kk;
      H[p] = H[p] * (1 - 0.5 * m) - 0.002 * m;
      rough[p] -= 0.08 * m;
    });
  }

  // Jalanjäljet: harvoja ja osittaisia (kuivunut maa, päällekkäiset askeleet).
  const print = (x, z, ang, side, depth) => {
    const ca = Math.cos(ang), sa = Math.sin(ang);
    const keep = rand();
    stamp(x, z, 0.16, (p, dx, dz) => {
      // Jalan suuntaan u (pituus), sivulle v; kantapää kapeampi kuin päkiä.
      const u = dx * ca + dz * sa, v = -dx * sa + dz * ca;
      const t = Math.min(1, Math.max(0, (u + 0.08) / 0.15));
      const uc = -0.08 + t * 0.15;
      const rad = 0.034 + 0.016 * Math.sin(t * Math.PI * 0.85);
      const d = Math.hypot(u - uc, v - side * 0.008 * t) / rad;
      const brk = smooth(0.3, 0.6, fbm(dx * 30 + x * 7, dz * 30 + z * 7, 2) + keep * 0.35);
      const inside = (1 - smooth(0.7, 1.1, d)) * brk;
      const rim = smooth(1.0, 1.2, d) * (1 - smooth(1.2, 1.7, d)) * brk;
      if (inside <= 0 && rim <= 0) return;
      H[p] += -depth * inside + depth * 0.3 * rim;
      const k = 1 - 0.1 * inside * alpha[p];
      col[p * 3] *= k; col[p * 3 + 1] *= k; col[p * 3 + 2] *= k;
    });
  };
  const walk = (pts, n, depth) => {
    let side = 1;
    for (let k = 0; k < n; k++) {
      const t = (k + rand() * 0.6) / n * (pts.length - 1);
      const s = Math.min(pts.length - 2, Math.floor(t)), f = t - s;
      const ax = pts[s][0], az = pts[s][1], bx = pts[s + 1][0], bz = pts[s + 1][1];
      const ang = Math.atan2(bz - az, bx - ax) + (rand() < 0.5 ? 0 : Math.PI) + (rand() - 0.5) * 0.35;
      const ox = -Math.sin(ang) * 0.09 * side, oz = Math.cos(ang) * 0.09 * side;
      print(ax + (bx - ax) * f + ox + (rand() - 0.5) * 0.2, az + (bz - az) * f + oz + (rand() - 0.5) * 0.2, ang, side, depth);
      side = -side;
    }
  };
  for (const p of PATHS) walk(p.pts, 14, 0.008);
  const ring = [];
  for (let k = 0; k <= 16; k++) { const a = k / 16 * Math.PI * 2; ring.push([Math.cos(a) * 1.85, Math.sin(a) * 1.75]); }
  walk(ring, 18, 0.007);

  // Pikkukivet, hiilenpalat ja risunpätkät.
  for (let k = 0; k < 110; k++) {
    const a = rand() * Math.PI * 2, r = Math.sqrt(rand()) * 3.6;
    const x = Math.cos(a) * r, z = Math.sin(a) * r, s = 0.008 + rand() * rand() * 0.03;
    const grey = 0.1 + rand() * 0.14, warm = rand() * 0.025;
    stamp(x, z, s * 1.6, (p, dx, dz) => {
      const d = Math.hypot(dx, dz * (1.2 + (k % 3) * 0.2)) / s;
      if (d > 1.4) return;
      const m = 1 - smooth(0.85, 1.05, d);
      const sh = smooth(1.0, 1.4, d) * 0.25 * (dz > 0 ? 1 : 0.3); // varjo kiven alla
      H[p] += m * s * 0.5 * Math.sqrt(Math.max(0, 1 - d * d));
      for (let c = 0; c < 3; c++) col[p * 3 + c] = col[p * 3 + c] * (1 - m) * (1 - sh) + m * (grey + (c === 0 ? warm : 0)) * (0.85 + 0.15 * (1 - d));
      rough[p] = rough[p] * (1 - m) + m * 0.75;
    });
  }
  for (let k = 0; k < 70; k++) {
    // Hiiltä ja nokea lähinnä nuotion ympärillä.
    const a = rand() * Math.PI * 2, r = 0.7 + Math.pow(rand(), 1.8) * 2.2;
    const x = Math.cos(a) * r, z = Math.sin(a) * r, s = 0.006 + rand() * 0.016;
    stamp(x, z, s * 1.3, (p, dx, dz) => {
      const d = Math.hypot(dx, dz) / s;
      const m = 1 - smooth(0.6, 1.1, d + (hash2(p, k) - 0.5) * 0.4);
      if (m <= 0) return;
      for (let c = 0; c < 3; c++) col[p * 3 + c] *= 1 - m * 0.85;
      H[p] += m * s * 0.3;
    });
  }
  for (let k = 0; k < 60; k++) {
    const a = rand() * Math.PI * 2, r = 0.8 + rand() * 3.3;
    const x = Math.cos(a) * r, z = Math.sin(a) * r, ang = rand() * Math.PI, len = 0.05 + rand() * 0.14, w = 0.004 + rand() * 0.004;
    const ca = Math.cos(ang), sa = Math.sin(ang), dark = 0.035 + rand() * 0.05;
    stamp(x, z, len, (p, dx, dz) => {
      const u = dx * ca + dz * sa, v = -dx * sa + dz * ca;
      if (Math.abs(u) > len) return;
      const m = 1 - smooth(w * 0.6, w, Math.abs(v));
      if (m <= 0) return;
      col[p * 3] = col[p * 3] * (1 - m) + m * (dark * 1.6 + 0.02);
      col[p * 3 + 1] = col[p * 3 + 1] * (1 - m) + m * (dark * 1.2 + 0.01);
      col[p * 3 + 2] = col[p * 3 + 2] * (1 - m) + m * dark * 0.7;
      H[p] += m * w;
    });
  }

  // Kuvat: väri + läpinäkyvyys, karheus ja normaalit pinnanmuodosta.
  const make = () => { const c = document.createElement('canvas'); c.width = c.height = N; return c; };
  const cC = make(), cR = make(), cN = make();
  const iC = cC.getContext('2d').createImageData(N, N);
  const iR = cR.getContext('2d').createImageData(N, N);
  const iN = cN.getContext('2d').createImageData(N, N);
  const toS = (v) => 255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055);
  const NS = 1 / (2 * px) * 0.9;
  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      const p = j * N + i, o = p * 4;
      iC.data[o] = toS(Math.min(1, col[p * 3]));
      iC.data[o + 1] = toS(Math.min(1, col[p * 3 + 1]));
      iC.data[o + 2] = toS(Math.min(1, col[p * 3 + 2]));
      iC.data[o + 3] = 255 * alpha[p];
      iR.data[o] = iR.data[o + 1] = iR.data[o + 2] = 255 * Math.min(1, Math.max(0, rough[p]));
      iR.data[o + 3] = 255;
      const hl = H[j * N + Math.max(0, i - 1)], hr = H[j * N + Math.min(N - 1, i + 1)];
      const hu = H[Math.max(0, j - 1) * N + i], hd = H[Math.min(N - 1, j + 1) * N + i];
      let nx = (hl - hr) * NS, ny = (hd - hu) * NS;
      const nl = Math.hypot(nx, ny, 1);
      iN.data[o] = 127.5 + 127.5 * nx / nl;
      iN.data[o + 1] = 127.5 + 127.5 * ny / nl;
      iN.data[o + 2] = 127.5 + 127.5 / nl;
      iN.data[o + 3] = 255;
    }
  }
  cC.getContext('2d').putImageData(iC, 0, 0);
  cR.getContext('2d').putImageData(iR, 0, 0);
  cN.getContext('2d').putImageData(iN, 0, 0);
  const tex = (c, srgb) => {
    const t = new THREE.CanvasTexture(c);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  };
  return { map: tex(cC, true), roughnessMap: tex(cR, false), normalMap: tex(cN, false) };
}

export class MenuCamp {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.visible = false;
    scene.add(this.group);
    this.x = MENU_CAMP.x;
    this.z = MENU_CAMP.z;
    this.y = 0;
    this.built = false;
    this.uniforms = { uClothT: { value: 0 } };
    this.flick = 1;
  }

  // Maan korkeus leirin paikallisessa kohdassa (x, z).
  ground(lx, lz) {
    return heightAt(this.x + lx, this.z + lz);
  }

  // Esinemalli maahan. mode: keep (kuten mallinnettu), lay (ohuin akseli
  // ylös), flat (pisin akseli vaakaan suuntaan yaw), stand (pisin akseli
  // ylös, kallistus tilt), lean (ohuin akseli vaakaan, nojaa taaksepäin).
  // thick: poikkileikkauksen paksuus (m), jos pituus ja paksuus skaalataan erikseen (tukit).
  item(id, lx, lz, { len = 1, mode = 'keep', yaw = 0, tilt = 0, roll = 0, lift = 0, sink = 0, thick = 0 } = {}) {
    const geo = itemAsset(id);
    if (!geo) return null;
    if (!geo.boundingBox) geo.computeBoundingBox();
    const size = geo.boundingBox.getSize(_v).toArray();
    const order = [0, 1, 2].sort((a, b) => size[b] - size[a]); // pisin ... ohuin
    const mesh = new THREE.Mesh(geo, geo.userData.material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const q = mesh.quaternion;
    q.identity();
    if (mode === 'lay') q.setFromUnitVectors(AXES[order[2]], UP);
    else if (mode === 'stand') q.setFromUnitVectors(AXES[order[0]], UP);
    else if (mode === 'flat') {
      q.setFromUnitVectors(AXES[order[0]], AXES[0]);
      // Ohuin akseli ylös pisimmän ympäri (makaa leveimmällä puolellaan).
      const thin = AXES[order[2]].clone().applyQuaternion(q);
      const ang = Math.atan2(thin.z, thin.y);
      q.premultiply(_q2.setFromAxisAngle(AXES[0], -ang));
    } else if (mode === 'lean') q.setFromUnitVectors(AXES[order[2]], AXES[0]);
    if (roll) q.premultiply(_q2.setFromAxisAngle(mode === 'flat' ? AXES[0] : UP, roll));
    if (tilt) q.premultiply(_q2.setFromAxisAngle(AXES[2], tilt));
    q.premultiply(_q.setFromAxisAngle(UP, yaw));
    mesh.scale.setScalar(len / size[order[0]]);
    if (thick) for (const k of [order[1], order[2]]) mesh.scale.setComponent(k, thick / size[k]);
    mesh.position.set(lx, 0, lz);
    // Rajat leirin paikallisissa koordinaateissa (ryhmän muunnosta ei tarvita).
    mesh.updateMatrix();
    _box.copy(geo.boundingBox).applyMatrix4(mesh.matrix);
    mesh.position.y = this.ground(lx, lz) - this.y - _box.min.y + lift - sink;
    this.group.add(mesh);
    return mesh;
  }

  build() {
    if (this.built) return;
    this.built = true;
    this.y = heightAt(this.x, this.z);
    this.group.position.set(this.x, this.y, this.z);
    const G = this.group;

    // Sessio 60: tallattu maa. Verkko seuraa maaston verkkoa (sama 1,33 m:n
    // ruudukko bilineaarisesti), joten laikku ei uppoa maahan eikä leiju.
    {
      const R = TRAMPLE_R, STEP = 64 / 48;
      const meshH = (wx, wz) => {
        const gx = wx / STEP, gz = wz / STEP, ix = Math.floor(gx), iz = Math.floor(gz), fx = gx - ix, fz = gz - iz;
        const h00 = heightAt(ix * STEP, iz * STEP), h10 = heightAt((ix + 1) * STEP, iz * STEP);
        const h01 = heightAt(ix * STEP, (iz + 1) * STEP), h11 = heightAt((ix + 1) * STEP, (iz + 1) * STEP);
        return (h00 * (1 - fx) + h10 * fx) * (1 - fz) + (h01 * (1 - fx) + h11 * fx) * fz;
      };
      const geo = new THREE.PlaneGeometry(2 * R, 2 * R, 80, 80).rotateX(-Math.PI / 2);
      const gp = geo.attributes.position;
      for (let i = 0; i < gp.count; i++) {
        const lx = gp.getX(i), lz = gp.getZ(i);
        gp.setY(i, Math.max(meshH(this.x + lx, this.z + lz), heightAt(this.x + lx, this.z + lz)) - this.y + 0.02);
      }
      geo.computeVertexNormals();
      const maps = trampledGround();
      const mat = new THREE.MeshStandardMaterial({
        ...maps, transparent: true, depthWrite: false, roughness: 1, metalness: 0,
        normalScale: new THREE.Vector2(1, 1), polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4,
      });
      const ground = new THREE.Mesh(geo, mat);
      ground.receiveShadow = true;
      ground.renderOrder = -1;
      G.add(ground);
      this.groundPatch = ground;
    }

    // Nuotio: kivikehä, puut ja tuhka (esinemalli), hiillos ja valo.
    const baseMat = addSurfaceDetail(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }), [
      { layer: 'bark', mask: 'darkWood', scale: 1.2, strength: 0.95 },
      { layer: 'rock', mask: 'grey', scale: 2.0, strength: 0.85 },
    ]);
    const base = new THREE.Mesh(makeCampfireBase(3), baseMat);
    base.scale.setScalar(1.15);
    base.position.y = this.ground(0, 0) - this.y - 0.01;
    base.rotation.y = 0.4;
    base.castShadow = true;
    base.receiveShadow = true;
    G.add(base);
    this.fx = new CampfireFx(1.05, { seed: 5 });
    this.fx.group.position.set(0, base.position.y + 0.06, 0);
    G.add(this.fx.group);
    this.light = new THREE.PointLight(0xff8a3a, 9, 12, 1.7);
    // Sessio 60: valo liekin kohdalle (ennen 0,55 m eli keon latvan tasalla:
    // tukkien ulkopinnat jäivät kamerasta katsoen mustiksi).
    this.light.position.set(0, this.ground(0, 0) - this.y + 1.0, 0);
    G.add(this.light);

    // Istumapuut tulen takana ja oikealla (kamera on idässä ja katsoo länteen),
    // polttopuupino vasemmalla edessä.
    this.item('wood', -1.45, 0.35, { len: 1.7, thick: 0.3, mode: 'flat', yaw: Math.PI / 2 + 0.15, roll: 0.4 });
    this.item('wood', 0.15, -1.65, { len: 1.55, thick: 0.28, mode: 'flat', yaw: 0.2, roll: 1.3 });
    for (let i = 0; i < 5; i++) {
      this.item('wood', 0.9 + (i % 3) * 0.17, 2.0 + (i % 3) * 0.04, { len: 0.7, thick: 0.13, mode: 'flat', yaw: 0.1 + (i % 2) * 0.12, roll: i, lift: i >= 3 ? 0.11 : 0 });
    }

    // Viltti (gasellintalja) ja kartta sen päällä (maailmojen kuva).
    const pelt = this.item('gazelle_pelt', 1.6, -1.35, { len: 1.7, mode: 'lay', yaw: 0.5, lift: 0.01 });
    const map = new THREE.Mesh(
      new THREE.PlaneGeometry(0.62, 0.46, 8, 6).rotateX(-Math.PI / 2),
      new THREE.MeshStandardMaterial({ map: mapTexture(), roughness: 0.95, side: THREE.DoubleSide }),
    );
    // Kartan kulmat hieman käpristyneet.
    const mp = map.geometry.attributes.position;
    for (let i = 0; i < mp.count; i++) {
      const x = mp.getX(i) / 0.31, z = mp.getZ(i) / 0.23;
      mp.setY(i, 0.012 * (x * x * z * z) + 0.006 * Math.max(0, x * x - 0.6));
    }
    map.geometry.computeVertexNormals();
    // Kartta taljan päälle (talja on n. 6 cm paksu).
    if (pelt) { pelt.updateMatrix(); _box.copy(pelt.geometry.boundingBox).applyMatrix4(pelt.matrix); }
    map.position.set(1.55, Math.max(this.ground(1.55, -1.4) - this.y + 0.05, pelt ? _box.max.y + 0.012 : 0), -1.4);
    map.rotation.y = 0.25;
    map.receiveShadow = true;
    G.add(map);
    this.item('rope', 2.2, -1.85, { len: 0.38, mode: 'lay', yaw: 1.2, lift: 0.01 });
    this.item('bissap', 1.05, -0.85, { len: 0.16, yaw: 0.3 });

    // Ruoka tulen äärellä.
    this.item('meat_stew', 0.62, -0.38, { len: 0.36, yaw: 1.1 });
    this.item('cooked_meat', -0.55, -0.5, { len: 0.3, mode: 'flat', yaw: -0.6, lift: 0.08 });
    this.item('fonio_porridge', 0.95, 0.75, { len: 0.2, yaw: 0.2 });

    // Varusteet: jousi ja nuolet puuta vasten, keihäs pystyssä auringonlaskua
    // vasten, kilpi ja kirves.
    this.item('bow', -1.25, 0.95, { len: 1.35, mode: 'stand', yaw: 0.2, tilt: 0.3 });
    for (let i = 0; i < 3; i++) this.item('arrow_flint', -1.3 + i * 0.07, 1.45 + i * 0.07, { len: 0.78, mode: 'stand', yaw: 0.6 + i * 0.4, tilt: 0.12 + i * 0.05, sink: 0.12 });
    this.item('wooden_spear', -2.3, 1.7, { len: 2.05, mode: 'stand', yaw: -0.4, tilt: 0.16, sink: 0.15 });
    this.item('hide_shield', 0.45, -2.0, { len: 0.72, mode: 'lean', yaw: Math.PI / 2 + 0.3, tilt: 0.35 });
    this.item('flint_axe', 1.3, 1.25, { len: 0.62, mode: 'flat', yaw: 2.2 });
    this.item('leather_vest', -1.45, -0.05, { len: 0.55, mode: 'lay', yaw: 0.9, lift: 0.3 });

    // Tuulessa lepattava katos bògòlanfini-kankaasta kahden seipään välissä.
    const tex = new THREE.TextureLoader().load('assets/ui/bogolan.png');
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1.4, 1.1);
    const clothMat = windCloth(new THREE.MeshStandardMaterial({ map: tex, roughness: 1, side: THREE.DoubleSide }), this.uniforms);
    const cloth = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.5, 16, 12), clothMat);
    cloth.castShadow = true;
    cloth.receiveShadow = true;
    // Yläreuna seipäissä (1,4 m), alareuna pingotettu maahan taakse.
    const cx = -1.05, cz = -2.75, yaw = 0.42;
    const gy = this.ground(cx, cz) - this.y;
    cloth.position.set(cx, gy + 0.72, cz);
    cloth.rotation.set(-0.95, yaw, 0, 'YXZ');
    G.add(cloth);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x5a4028, roughness: 0.95 });
    for (const s of [-1, 1]) {
      const px = cx + Math.cos(yaw) * 0.9 * s, pz = cz - Math.sin(yaw) * 0.9 * s;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.032, 1.55, 6), poleMat);
      pole.position.set(px + 0.18, this.ground(px, pz) - this.y + 0.7, pz + 0.3);
      pole.rotation.z = 0.06 * s;
      pole.castShadow = true;
      G.add(pole);
    }
    this.cloth = cloth;
  }

  setVisible(v) {
    this.group.visible = v;
    if (this.light) this.light.visible = v;
  }

  // Maailman koordinaatit leirin paikallisesta pisteestä.
  world(p, out) {
    return out.set(this.x + p[0], this.y + p[1], this.z + p[2]);
  }

  update(dt, time, camera, windX = 0, windZ = 0) {
    if (!this.group.visible || !this.built) return;
    this.uniforms.uClothT.value = time;
    // Lepattava valo: hidas ja nopea vaihtelu.
    const f = 0.82 + 0.1 * Math.sin(time * 7.3) + 0.06 * Math.sin(time * 13.1 + 1.3) + 0.06 * (Math.random() - 0.5);
    this.flick += (f - this.flick) * Math.min(1, dt * 12);
    this.light.intensity = 10.5 * this.flick;
    this.fx.power = 0.9 + 0.25 * (this.flick - 0.82);
    this.fx.update(dt, time, camera, windX, windZ);
  }
}
