// Veneiden mallit: soutuvene, purjevene (latinalaispurje) ja suuri
// kolmimastoinen purjelaiva (Santa Maria -tyylinen karakki).
//
// Mallin koordinaatit: +z = keula, +x = vasen laita (paapuuri), y = 0 on
// vesiraja. Mallit palauttavat ryhmän ja liikkuvat osat (airot, purjeet,
// raakapuut, viirit, ruori), joita game/boats.js animoi.
import * as THREE from 'three';
import { addSurfaceDetail } from '../render/surfaces.js';
import { mulberry32 } from '../noise.js';
import { V, paint, limb, merge } from './util.js';

const _c = new THREE.Color();
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _n = new THREE.Vector3();
const _p = new THREE.Vector3();

// Kolmiolista (x, y, z, ...) geometriaksi; väri kolmion keskipisteen mukaan.
function triGeo(pos, colFn, rand, jitter = 0.07) {
  const col = new Float32Array(pos.length);
  for (let o = 0; o < pos.length; o += 9) {
    _c.set(colFn((pos[o] + pos[o + 3] + pos[o + 6]) / 3, (pos[o + 1] + pos[o + 4] + pos[o + 7]) / 3, (pos[o + 2] + pos[o + 5] + pos[o + 8]) / 3));
    const j = 1 + (rand() - 0.5) * 2 * jitter;
    for (let v = 0; v < 9; v += 3) {
      col[o + v] = _c.r * j;
      col[o + v + 1] = _c.g * j;
      col[o + v + 2] = _c.b * j;
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
}

// Nelikulmio molemmin puolin näkyväksi (4 kolmiota).
function quad2(out, a, b, c, d) {
  out.push(...a, ...b, ...c, ...a, ...c, ...d);
  out.push(...a, ...c, ...b, ...a, ...d, ...c);
}

function box(cx, cy, cz, sx, sy, sz, col, rand, jitter = 0.08) {
  const g = new THREE.BoxGeometry(sx, sy, sz);
  g.translate(cx, cy, cz);
  return paint(g, col, { rand, jitter });
}

function rod(a, b, r0, r1, col, rand, seg = 6) {
  return paint(limb(a, b, r0, r1, seg, true), col, { rand });
}

// ---- Runko ------------------------------------------------------------------
// Asemat perästä (t = 0) keulaan (t = 1): puolileveys w, kölin korkeus keel ja
// laidan yläreuna top. Poikkileikkaus on U: x = sin(a)·w, korkeus nousee
// kölistä laitaan (pw > 1 = täyteläinen pohja). tumble = laidan kallistus
// sisäänpäin yläosassa (karakin "tumblehome").
function stations(n, L, f) {
  const st = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    st.push({ t, z: (t - 0.5) * L, w: f.w(t), keel: f.keel(t), top: f.top(t) });
  }
  return st;
}

function secPoint(s, a, pw, tumble = 0) {
  const yf = Math.pow(1 - Math.cos(a), pw);
  const k = 1 - tumble * Math.max(0, (yf - 0.55) / 0.45) ** 2;
  return [Math.sin(a) * s.w * k, s.keel + (s.top - s.keel) * yf, s.z];
}

// Rungon puolileveys korkeudella y (kansien ja penkkien leveys).
function widthAt(s, y, pw, tumble = 0) {
  if (y <= s.keel) return 0;
  if (y >= s.top) return secPoint(s, Math.PI / 2, pw, tumble)[0];
  let lo = 0, hi = Math.PI / 2;
  for (let i = 0; i < 18; i++) {
    const m = (lo + hi) / 2;
    if (secPoint(s, m, pw, tumble)[1] < y) lo = m; else hi = m;
  }
  return secPoint(s, lo, pw, tumble)[0];
}

function nearestStation(st, z) {
  return st.reduce((a, s) => (Math.abs(s.z - z) < Math.abs(a.z - z) ? s : a));
}

// Rungon kuori: nK kaistaa laidasta laitaan. colFn(x, y, z, kaista) -> väri,
// kaista 0 = laidan yläreuna, kasvaa kohti kölia; -1 = peräpeili.
function hullSkin(st, { nK, pw, tumble = 0 }, colFn, rand) {
  const pos = [];
  const sec = st.map((s) => {
    const row = [];
    for (let k = 0; k <= nK; k++) row.push(secPoint(s, (k / nK - 0.5) * Math.PI, pw, tumble));
    return row;
  });
  const bandOf = [];
  for (let i = 0; i < st.length - 1; i++) {
    for (let k = 0; k < nK; k++) {
      quad2(pos, sec[i][k], sec[i + 1][k], sec[i + 1][k + 1], sec[i][k + 1]);
      for (let q = 0; q < 4; q++) bandOf.push(Math.min(k, nK - 1 - k));
    }
  }
  // Peräpeili: täyttö laidan yläreunan keskeltä.
  const s0 = sec[0];
  if (st[0].w > 0.05) {
    const c = [0, st[0].top, st[0].z];
    for (let k = 0; k < nK; k++) {
      pos.push(...c, ...s0[k], ...s0[k + 1], ...c, ...s0[k + 1], ...s0[k]);
      bandOf.push(-1, -1);
    }
  }
  let tri = 0;
  return { geo: triGeo(pos, (x, y, z) => colFn(x, y, z, bandOf[tri++]), rand), sec };
}

// Tasainen kansi korkeudella y asemien i0..i1 välillä (lankut pituussuunnassa).
function deck(st, y, i0, i1, { pw, tumble = 0, inset = 0.05 }, cols, rand) {
  const pos = [];
  const w = st.map((s) => Math.max(0, widthAt(s, y, pw, tumble) - inset));
  const wmax = Math.max(...w.slice(i0, i1 + 1));
  const n = Math.max(2, Math.ceil((2 * wmax) / 0.32));
  const strip = [];
  for (let i = i0; i < i1; i++) {
    const z0 = st[i].z, z1 = st[i + 1].z;
    for (let j = 0; j < n; j++) {
      const u0 = (j / n) * 2 - 1, u1 = ((j + 1) / n) * 2 - 1;
      quad2(pos, [u0 * w[i], y, z0], [u1 * w[i], y, z0], [u1 * w[i + 1], y, z1], [u0 * w[i + 1], y, z1]);
      for (let q = 0; q < 4; q++) strip.push(j);
    }
  }
  let tri = 0;
  return triGeo(pos, () => cols[strip[tri++] % cols.length], rand, 0.06);
}

// Kastelli: rungon yläreunan ääriviiva jatkuu ylöspäin top-korkeuteen asti
// (alkaen base-korkeudelta tai laidan yläreunasta). Pääty asemalla endAt
// (laivan keskiosaa kohti) ulottuu endFrom-korkeudelta ylös.
function castle(st, { i0, i1, base = -Infinity, top, endFrom, endAt }, { pw, tumble = 0 }, colFn, rand) {
  const pos = [];
  const half = st.map((s) => secPoint(s, Math.PI / 2, pw, tumble)[0]);
  for (let i = i0; i < i1; i++) {
    for (const sx of [1, -1]) {
      const y0 = Math.max(base, st[i].top - 0.05), y1 = Math.max(base, st[i + 1].top - 0.05);
      if (top <= Math.min(y0, y1)) continue;
      quad2(pos, [sx * half[i], y0, st[i].z], [sx * half[i + 1], y1, st[i + 1].z], [sx * half[i + 1], top, st[i + 1].z], [sx * half[i], top, st[i].z]);
    }
  }
  const e = endAt;
  if (half[e] > 0.05) quad2(pos, [-half[e], endFrom, st[e].z], [half[e], endFrom, st[e].z], [half[e], top, st[e].z], [-half[e], top, st[e].z]);
  return triGeo(pos, colFn, rand);
}

// Kaide ääriviivaa pitkin (sivut ja päädyt): tolpat ja käsijohde.
function railing(st, i0, i1, y, h, ends, { pw, tumble = 0 }, col, rand, out) {
  const half = st.map((s) => secPoint(s, Math.PI / 2, pw, tumble)[0] * 0.97);
  for (let i = i0; i <= i1; i++) {
    for (const sx of [1, -1]) {
      out.push(rod(V(sx * half[i], y, st[i].z), V(sx * half[i], y + h, st[i].z), 0.05, 0.05, col, rand, 4));
      if (i < i1) out.push(rod(V(sx * half[i], y + h, st[i].z), V(sx * half[i + 1], y + h, st[i + 1].z), 0.06, 0.06, col, rand, 4));
    }
  }
  for (const e of ends) {
    if (half[e] < 0.05) continue;
    const z = st[e].z;
    out.push(rod(V(-half[e], y + h, z), V(half[e], y + h, z), 0.06, 0.06, col, rand, 4));
    for (let x = -half[e] + 0.6; x < half[e] - 0.3; x += 0.7) out.push(rod(V(x, y, z), V(x, y + h, z), 0.04, 0.04, col, rand, 4));
  }
}

// Laidan yläreunan listat, köli ja keularanka.
function trims(st, sec, nK, col, rand, r, out) {
  for (let i = 0; i < st.length - 1; i++) {
    for (const k of [0, nK]) out.push(rod(V(...sec[i][k]), V(...sec[i + 1][k]), r, r, col, rand, 5));
    out.push(rod(V(0, st[i].keel - r * 0.4, st[i].z), V(0, st[i + 1].keel - r * 0.4, st[i + 1].z), r * 1.1, r * 1.1, col, rand, 5));
  }
  const s = st[st.length - 1];
  out.push(rod(V(0, s.keel, s.z), V(0, s.top + r * 2, s.z + r), r * 1.2, r, col, rand, 5));
}

// ---- Purjeet ------------------------------------------------------------------
// Purje on verkko, jonka muoto lasketaan joka ruudulla: rullaus (amount),
// pullistus (fill, suunta side) ja lepatus (flap). Nelikulmion yläreuna ja
// kolmion etureuna (luff) ovat raakapuuta pitkin, ja purje rullautuu niitä
// kohti. corners: nelikulmio [vasen ylä, oikea ylä, oikea ala, vasen ala] tai
// kolmio [luffin alapää, luffin yläpää, kolmas kulma].
function sailMesh(material, corners, nu, nv, colFn) {
  const tri = corners.length === 3;
  const W = nu + 1;
  const G = W * (nv + 1);
  const gu = new Float32Array(G), gv = new Float32Array(G);
  for (let j = 0; j <= nv; j++) {
    for (let i = 0; i <= nu; i++) {
      gu[j * W + i] = i / nu;
      gv[j * W + i] = j / nv;
    }
  }
  // Kolmiot viittaavat ruudukon pisteisiin; värit ruuduittain (terävät saumat).
  const map = [];
  const col = [];
  for (let j = 0; j < nv; j++) {
    for (let i = 0; i < nu; i++) {
      const a = j * W + i, b = a + 1, c = a + W + 1, d = a + W;
      map.push(a, b, c, a, c, d);
      // Kolmiopurjeessa kankaan kaistat kulkevat takaliepeen suuntaisesti
      // (ruudukon u-sarakkeet suppenevat kulmaan ja näyttivät viuhkalta).
      _c.set(colFn((i + 0.5) / nu, (j + 0.5) / nv));
      const jt = 1 + (Math.random() - 0.5) * 0.02;
      for (let v = 0; v < 6; v++) col.push(_c.r * jt, _c.g * jt, _c.b * jt);
    }
  }
  // Saumaparametri kärkipisteittäin; kaistat ja saumat piirretään sävyttimessä
  // pikselitarkasti (ruuduittain väritetyt kaistat näkyivät porrasmaisina
  // laikkuina). Kolmiopurjeessa parametri on 1 - luffin alakulman painokerroin,
  // joten saumat ovat suoria ja takaliepeen suuntaisia.
  const seam = new Float32Array(map.length);
  for (let i = 0; i < map.length; i++) {
    const u = gu[map[i]], v = gv[map[i]];
    seam[i] = tri ? 1 - (1 - u) * (1 - v) : u;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(map.length * 3), 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(new Float32Array(map.length * 3), 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute('aSeam', new THREE.Float32BufferAttribute(seam, 1));
  const m = new THREE.Mesh(g, material);
  m.castShadow = true;
  const P = corners.map((p) => new THREE.Vector3(...p));
  // Purjeen normaali: pullistuksen suunta, kun side = 1.
  _n.crossVectors(_a.subVectors(P[1], P[0]), _b.subVectors(P[tri ? 2 : 3], P[0])).normalize();
  const size = Math.min(P[0].distanceTo(P[1]), P[0].distanceTo(P[tri ? 2 : 3]));
  m.userData.sail = {
    tri, P, nu, nv, gu, gv, map: new Uint16Array(map), gpos: new Float32Array(G * 3), gnor: new Float32Array(G * 3),
    normal: _n.clone(), depth: size * 0.17, seed: Math.random() * 10,
  };
  updateSail(m, 1, 0, 1, 0, 0);
  // Rajaava pallo kattaa kaikki pullistukset (ei lasketa joka ruudulla).
  g.computeBoundingSphere();
  g.boundingSphere.radius += size * 0.3;
  return m;
}

// amount 0..1 = kuinka paljon purjetta on auki, fill 0..1 = tuulen täyttämä,
// side = ±1 pullistuksen suunta, flap 0..1 = lepatus (vastatuuli), t = aika.
// Muoto lasketaan ruudukon pisteisiin, normaalit naapureista (pehmeä varjostus).
export function updateSail(mesh, amount, fill, side, flap, t) {
  const S = mesh.userData.sail;
  const { P, nu, nv, gu, gv, gpos, gnor, map } = S;
  const n = S.normal;
  const am = Math.max(0.04, amount);
  const depth = S.depth * fill * side * am;
  const fl = flap * am * S.depth * 0.14;
  const W = nu + 1;
  for (let g = 0, k = 0; g < gu.length; g++, k += 3) {
    const u = gu[g], v0 = gv[g];
    const v = v0 * am;
    let w;
    if (S.tri) {
      const ax = P[0].x + (P[1].x - P[0].x) * u, ay = P[0].y + (P[1].y - P[0].y) * u, az = P[0].z + (P[1].z - P[0].z) * u;
      _p.set(ax + (P[2].x - ax) * v, ay + (P[2].y - ay) * v, az + (P[2].z - az) * v);
      w = Math.sin(Math.PI * u) * 4 * v0 * (1 - v0);
    } else {
      const tx = P[0].x + (P[1].x - P[0].x) * u, ty = P[0].y + (P[1].y - P[0].y) * u, tz = P[0].z + (P[1].z - P[0].z) * u;
      const bx = P[3].x + (P[2].x - P[3].x) * u, by = P[3].y + (P[2].y - P[3].y) * u, bz = P[3].z + (P[2].z - P[3].z) * u;
      _p.set(tx + (bx - tx) * v, ty + (by - ty) * v, tz + (bz - tz) * v);
      w = (Math.sin(Math.PI * u) * (v0 * (1 - 0.6 * v0))) / 0.4167;
    }
    let d = depth * w;
    // Lepatus: pieniä nopeita väreitä, voimakkaimmin takaliepeessä.
    if (fl > 0) d += fl * Math.sin(t * 13 + u * 11 + v0 * 7 + S.seed) * Math.sin(Math.PI * u) * v0;
    gpos[k] = _p.x + n.x * d;
    gpos[k + 1] = _p.y + n.y * d;
    gpos[k + 2] = _p.z + n.z * d;
  }
  for (let j = 0; j <= nv; j++) {
    for (let i = 0; i <= nu; i++) {
      const i0 = Math.max(0, i - 1), i1 = Math.min(nu, i + 1), j0 = Math.max(0, j - 1), j1 = Math.min(nv, j + 1);
      const a = (j * W + i1) * 3, b = (j * W + i0) * 3, c = (j1 * W + i) * 3, e = (j0 * W + i) * 3;
      _a.set(gpos[a] - gpos[b], gpos[a + 1] - gpos[b + 1], gpos[a + 2] - gpos[b + 2]);
      _b.set(gpos[c] - gpos[e], gpos[c + 1] - gpos[e + 1], gpos[c + 2] - gpos[e + 2]);
      _a.cross(_b);
      const len = _a.length();
      if (len < 1e-8) _a.copy(n); else _a.multiplyScalar(1 / len);
      const k = (j * W + i) * 3;
      gnor[k] = _a.x;
      gnor[k + 1] = _a.y;
      gnor[k + 2] = _a.z;
    }
  }
  const pos = mesh.geometry.attributes.position.array;
  const nor = mesh.geometry.attributes.normal.array;
  for (let i = 0, o = 0; i < map.length; i++, o += 3) {
    const k = map[i] * 3;
    pos[o] = gpos[k]; pos[o + 1] = gpos[k + 1]; pos[o + 2] = gpos[k + 2];
    nor[o] = gnor[k]; nor[o + 1] = gnor[k + 1]; nor[o + 2] = gnor[k + 2];
  }
  mesh.geometry.attributes.position.needsUpdate = true;
  mesh.geometry.attributes.normal.needsUpdate = true;
}

// Purjekankaan väri ja valinnainen punainen risti (saumat: sailMaterial).
function canvasCol(base, cross = false) {
  return (u, v) => {
    if (cross && (Math.abs(u - 0.5) < 0.07 || Math.abs(v - 0.42) < 0.075) && Math.abs(u - 0.5) < 0.36 && v > 0.1 && v < 0.85) return 0xa3271d;
    return base;
  };
}

// Viiri: kapea kolmio, joka osoittaa tuulen suuntaan (+z = viirin kärki).
function pennant(rand, len, col) {
  const pos = [0, 0, 0, 0, -len * 0.18, 0, 0, -len * 0.09, len];
  const back = [0, 0, 0, 0, -len * 0.09, len, 0, -len * 0.18, 0];
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([...pos, ...back], 3));
  g.computeVertexNormals();
  const out = paint(g, col, { rand, jitter: 0.04 });
  // Purjemateriaali lukee saumaparametrin; 1/16 = keskellä kaistaa (ei saumaa).
  out.setAttribute('aSeam', new THREE.Float32BufferAttribute(new Float32Array(out.attributes.position.count).fill(1 / 16), 1));
  return out;
}

// Vesisuoja: näkymätön pinta laidan yläreunan tasolla. Se kirjoittaa vain
// syvyyden (ei väriä) heti veneen sisustan jälkeen ja ennen vettä (vesi on
// läpinäkyvä ja piirretään viimeisenä), joten vedenpinta ei näy rungon
// sisällä, vaikka veneen pohja on vesirajan alapuolella.
const waterCapMat = new THREE.MeshBasicMaterial({ colorWrite: false, side: THREE.DoubleSide });
function waterCap(st, sec, nK) {
  const pos = [];
  for (let i = 0; i < st.length - 1; i++) {
    const a = sec[i][0], b = sec[i][nK], c = sec[i + 1][nK], d = sec[i + 1][0];
    pos.push(...a, ...b, ...c, ...a, ...c, ...d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  const m = new THREE.Mesh(g, waterCapMat);
  m.renderOrder = 10;
  m.userData.waterCap = true;
  m.raycast = () => {};
  return m;
}

// Purjekangas on ohutta: vastavalossa aurinko kuultaa läpi (muuten purjeen
// varjopuoli näkyi lähes mustana). Kankaan kaistat (8 kpl) vuorottelevat
// hieman sävyltään, ja saumat ovat kapeita tummempia viivoja, jotka erottuvat
// vastavalossa selvemmin (kaksinkertainen kangas).
function sailMaterial() {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, side: THREE.DoubleSide });
  m.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aSeam;\nvarying float vSeam;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n  vSeam = aSeam;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vSeam;')
      .replace('#include <color_fragment>', `#include <color_fragment>
  float seamF = vSeam * 8.0;
  float seamD = abs(fract(seamF + 0.5) - 0.5) * 0.125;
  float seamAA = fwidth(vSeam) + 1e-4;
  float seamLine = 1.0 - smoothstep(0.003 - seamAA, 0.003 + seamAA, seamD);
  diffuseColor.rgb *= (1.0 - 0.03 * mod(floor(seamF), 2.0)) * (1.0 - 0.1 * seamLine);`)
      .replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
#if NUM_SUN_LIGHTS > 0
  {
    float sailTr = max(0.0, -dot(normal, sunLights[0].direction)) * (1.0 - 0.45 * seamLine);
    reflectedLight.directDiffuse += diffuseColor.rgb * sunLights[0].color * sailTr * 0.45 * RECIPROCAL_PI;
  }
#endif`);
  };
  m.customProgramCacheKey = () => 'sail';
  return m;
}

function boatMaterials() {
  return {
    wood: addSurfaceDetail(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.88 }), 'planks', { scale: 1.6, strength: 0.85, mask: 'notGreen' }),
    sail: sailMaterial(),
  };
}

function finish(parts, mats) {
  const group = new THREE.Group();
  const hull = new THREE.Mesh(merge(parts), mats.wood);
  hull.castShadow = true;
  hull.receiveShadow = true;
  group.add(hull);
  return group;
}

// ---- Soutuvene (n. 3,8 m) ---------------------------------------------------
export function makeRowboat(seed = 1) {
  const rand = mulberry32(seed + 700);
  const mats = boatMaterials();
  const L = 3.8, B = 0.7;
  const opt = { nK: 8, pw: 1.35 };
  const st = stations(12, L, {
    w: (t) => B * (t < 0.3 ? 0.62 + 0.38 * Math.sin((t / 0.3) * Math.PI / 2) : t > 0.6 ? Math.pow(Math.max(0, 1 - ((t - 0.6) / 0.4) ** 1.8), 0.7) : 1),
    keel: (t) => -0.3 + (t > 0.75 ? 0.18 * ((t - 0.75) / 0.25) ** 2 : 0) + (t < 0.12 ? 0.08 * (1 - t / 0.12) : 0),
    top: (t) => 0.3 + 0.2 * Math.max(0, (t - 0.6) / 0.4) ** 2 + 0.1 * Math.max(0, 1 - t / 0.25) ** 2,
  });
  // Sahelin piroggien tapaan maalattu yläkaista
  const { geo, sec } = hullSkin(st, opt, (x, y, z, band) => {
    if (band < 0) return y > st[0].top - 0.12 ? 0x2f7f86 : 0x6e5034;
    if (band === 0) return 0x2f7f86;
    if (band === 1) return Math.abs(z) < L * 0.42 ? 0xd8b23a : 0x2f7f86;
    if (y < -0.08) return 0x3c2c20;
    return band % 2 ? 0x7a5a3a : 0x6e5034;
  }, rand);
  const parts = [geo];
  trims(st, sec, opt.nK, 0x3a2a1c, rand, 0.035, parts);
  // Penkit, pohjalaudat ja hankaimet
  for (const z of [-0.95, -0.25, 0.75]) parts.push(box(0, 0.1, z, (widthAt(nearestStation(st, z), 0.12, opt.pw) - 0.02) * 2, 0.05, 0.26, 0x8a6a44, rand));
  parts.push(box(0, -0.2, 0, 0.6, 0.03, 2.6, 0x5e4028, rand));
  for (const sx of [1, -1]) parts.push(box(sx * 0.68, 0.38, 0.25, 0.05, 0.14, 0.05, 0x2a2018, rand));
  const group = finish(parts, mats);
  group.add(waterCap(st, sec, opt.nK));
  // Airot: nivel hankaimessa, mela ulospäin (+x vasen, -x oikea)
  const oarGeo = merge([
    rod(V(-0.55, 0, 0), V(1.75, 0, 0), 0.024, 0.022, 0x9a7a52, rand),
    box(1.98, 0, 0, 0.5, 0.025, 0.15, 0x2f7f86, rand),
  ]);
  const oars = [];
  for (const sx of [1, -1]) {
    const pivot = new THREE.Group();
    pivot.position.set(sx * 0.68, 0.46, 0.25);
    const m = new THREE.Mesh(oarGeo, mats.wood);
    m.castShadow = true;
    if (sx < 0) m.rotation.y = Math.PI;
    pivot.add(m);
    pivot.userData.side = sx;
    group.add(pivot);
    oars.push(pivot);
  }
  return { group, mats, oars, sails: [], pennants: [], wheel: null };
}

// ---- Purjevene (n. 6,6 m, latinalaispurje) ---------------------------------
export function makeSailboat(seed = 1) {
  const rand = mulberry32(seed + 710);
  const mats = boatMaterials();
  const L = 6.6, B = 1.1;
  const opt = { nK: 10, pw: 1.15 };
  const st = stations(16, L, {
    w: (t) => B * (t < 0.25 ? 0.5 + 0.5 * Math.sin((t / 0.25) * Math.PI / 2) : t > 0.55 ? Math.pow(Math.max(0, 1 - ((t - 0.55) / 0.45) ** 1.7), 0.65) : 1),
    keel: (t) => -0.58 + (t > 0.7 ? 0.38 * ((t - 0.7) / 0.3) ** 2 : 0) + (t < 0.15 ? 0.15 * (1 - t / 0.15) : 0),
    top: (t) => 0.5 + 0.5 * Math.max(0, (t - 0.55) / 0.45) ** 2 + 0.25 * Math.max(0, 1 - t / 0.3) ** 2,
  });
  const { geo, sec } = hullSkin(st, opt, (x, y, z, band) => {
    if (band < 0) return y > st[0].top - 0.15 ? 0xe6e0d0 : 0x2c5c8a;
    if (band === 0) return 0xe6e0d0;
    if (band === 1) return 0xa8442e;
    if (y < -0.1) return 0x2a2a2a;
    return band % 2 ? 0x2c5c8a : 0x27527c;
  }, rand);
  const parts = [geo];
  trims(st, sec, opt.nK, 0x3a2a1c, rand, 0.05, parts);
  // Kannet keulassa ja perässä, penkit ja pohjalaudat
  const n = st.length - 1;
  const planks = [0x9a7a52, 0x8d6e48];
  parts.push(deck(st, 0.42, Math.round(n * 0.72), Math.round(n * 0.97), opt, planks, rand));
  parts.push(deck(st, 0.4, 0, Math.round(n * 0.2), opt, planks, rand));
  parts.push(deck(st, -0.32, Math.round(n * 0.2), Math.round(n * 0.72), opt, [0x6e5034, 0x664a30], rand));
  for (const z of [-1.2, 0.2]) parts.push(box(0, 0.22, z, 1.9, 0.06, 0.3, 0x8a6a44, rand));
  // Masto (hieman etukenossa), peräsin ja ruorinvarsi, köydet
  const mastZ = 1.15;
  parts.push(rod(V(0, -0.4, mastZ), V(0, 6.3, mastZ + 0.25), 0.085, 0.05, 0x6e5238, rand, 7));
  parts.push(box(0, -0.25, -L / 2 - 0.05, 0.07, 0.95, 0.45, 0x3a2a1c, rand));
  parts.push(rod(V(0, 0.65, -L / 2 + 0.05), V(0, 0.75, -L / 2 + 0.95), 0.03, 0.025, 0x3a2a1c, rand, 5));
  for (const sx of [1, -1]) parts.push(rod(V(0, 6.1, mastZ + 0.24), V(sx * 0.95, 0.55, mastZ - 0.4), 0.012, 0.012, 0x2a2018, rand, 3));
  parts.push(rod(V(0, 6.1, mastZ + 0.24), V(0, 1.0, L / 2 - 0.05), 0.012, 0.012, 0x2a2018, rand, 3));
  const group = finish(parts, mats);
  group.add(waterCap(st, sec, opt.nK));
  // Latinalaispurje: vino raakapuu kääntyy maston ympäri. Kun purje on
  // käärittynä, raakapuu lasketaan alas veneen suuntaiseksi (hoist kääntyy
  // etupään ympäri).
  const yard = new THREE.Group();
  yard.position.set(0, 0, mastZ);
  const T = [0, 1.05, 1.9], P = [0, 8.4, -1.3], C = [0, 2.1, -4.1];
  const rel = (q) => [q[0] - T[0], q[1] - T[1], q[2] - T[2]];
  const hoist = new THREE.Group();
  hoist.position.set(...T);
  yard.add(hoist);
  const spar = new THREE.Mesh(merge([rod(V(0, 0, 0), V(...rel(P)), 0.06, 0.04, 0x6e5238, rand, 6)]), mats.wood);
  spar.castShadow = true;
  hoist.add(spar);
  const sail = sailMesh(mats.sail, [[0, 0, 0], rel(P), rel(C)], 10, 8, canvasCol(0xe8e0cb));
  hoist.add(sail);
  group.add(yard);
  const pen = new THREE.Group();
  pen.position.set(0, 6.35, mastZ + 0.25);
  pen.add(new THREE.Mesh(pennant(rand, 1.1, 0xa8442e), mats.sail));
  group.add(pen);
  return { group, mats, oars: [], sails: [{ mesh: sail, rig: 'lateen', yard, hoist, lower: 0.97 }], pennants: [pen], wheel: null };
}

// ---- Purjelaiva (karakki, n. 24 m) -------------------------------------------
export function makeShip(seed = 1) {
  const rand = mulberry32(seed + 720);
  const mats = boatMaterials();
  const L = 24, B = 3.7;
  const opt = { nK: 14, pw: 1.45, tumble: 0.14 };
  const st = stations(24, L, {
    w: (t) => B * (t < 0.3 ? 0.7 + 0.3 * Math.sin((t / 0.3) * Math.PI / 2) : t > 0.62 ? Math.pow(Math.max(0, 1 - ((t - 0.62) / 0.38) ** 2), 0.55) : 1),
    keel: (t) => -1.6 + (t > 0.8 ? 1.3 * ((t - 0.8) / 0.2) ** 2 : 0) + (t < 0.08 ? 0.25 * (1 - t / 0.08) : 0),
    top: (t) => 2.9 + 1.5 * Math.max(0, (t - 0.62) / 0.38) ** 2 + 1.6 * Math.max(0, 1 - t / 0.35) ** 2,
  });
  const n = st.length - 1;
  const { geo, sec } = hullSkin(st, opt, (x, y, z, band) => {
    if (y < -0.15) return 0x2b2119;
    if (band < 0) return y > st[0].top - 0.45 ? 0x6e2a20 : y > 1.2 && y < 1.5 ? 0x231a14 : 0x4f3521;
    if (band === 0) return 0x6e2a20;
    if (band === 2 || band === 4) return 0x231a14;
    return band % 2 ? 0x5a3d26 : 0x4f3521;
  }, rand);
  const parts = [geo];
  trims(st, sec, opt.nK, 0x231a14, rand, 0.11, parts);
  const deckCols = [0x9a7a52, 0x8d6e48, 0x94744c];
  // Pääkansi, peräkastelli (kaksi tasoa) ja keulakastelli
  const iQ = Math.round(n * 0.35), iP = Math.round(n * 0.17), iF = Math.round(n * 0.83);
  const yMain = 2.0, yQ = 4.9, yP = 6.9, yF = 4.4;
  const box50 = { ...opt, pw: 50 };
  const castleCol = (x, y) => ((y > yQ - 0.5 && y < yQ - 0.15) || (y > yP - 0.5 && y < yP - 0.15) || (y > yF - 0.5 && y < yF - 0.15) ? 0x6e2a20 : 0x7a5a36);
  parts.push(deck(st, yMain, 0, n, opt, deckCols, rand));
  parts.push(castle(st, { i0: 0, i1: iQ, top: yQ, endFrom: yMain, endAt: iQ }, opt, castleCol, rand));
  parts.push(deck(st, yQ, 0, iQ, box50, deckCols, rand));
  parts.push(castle(st, { i0: 0, i1: iP, base: yQ, top: yP, endFrom: yQ, endAt: iP }, opt, castleCol, rand));
  parts.push(deck(st, yP, 0, iP, box50, deckCols, rand));
  parts.push(castle(st, { i0: iF, i1: n, top: yF, endFrom: yMain, endAt: iF }, opt, castleCol, rand));
  parts.push(deck(st, yF, iF, n, box50, deckCols, rand));
  railing(st, iP, iQ, yQ, 0.85, [iQ], opt, 0x3a2818, rand, parts);
  railing(st, 0, iP, yP, 0.85, [iP, 0], opt, 0x3a2818, rand, parts);
  railing(st, iF, n, yF, 0.8, [iF], opt, 0x3a2818, rand, parts);
  // Ovi peräkastellin etuseinässä ja ikkunat perässä
  parts.push(box(0, yMain + 0.95, st[iQ].z + 0.06, 1.0, 1.9, 0.08, 0x2a1d14, rand));
  for (const x of [-1.2, 0, 1.2]) parts.push(box(x, yQ + 0.9, st[0].z - 0.02, 0.5, 0.42, 0.1, 0x1c140e, rand));
  // Lyhty perässä
  parts.push(rod(V(0, yP + 0.85, st[0].z + 0.25), V(0, yP + 1.6, st[0].z + 0.25), 0.05, 0.05, 0x231a14, rand, 5));
  parts.push(box(0, yP + 1.85, st[0].z + 0.25, 0.4, 0.55, 0.4, 0xf2c060, rand, 0.02));
  // Keulapuu, peräsin ja ruorin jalka (ruori pyörii erikseen)
  parts.push(rod(V(0, 3.9, st[n].z - 0.8), V(0, 7.2, st[n].z + 6.2), 0.24, 0.12, 0x6e5238, rand, 8));
  parts.push(box(0, 0.15, st[0].z - 0.3, 0.22, 3.5, 1.0, 0x2a1d14, rand));
  const helmZ = -4.4;
  parts.push(rod(V(0, yQ, helmZ), V(0, yQ + 0.9, helmZ), 0.09, 0.07, 0x3a2818, rand, 6));
  // Mastot ja märssyt
  const masts = [
    { z: 8.6, base: yMain, top: 20.5, r: 0.32 },  // keulamasto
    { z: 0.8, base: yMain, top: 27.5, r: 0.45 },  // isomasto
    { z: -9.6, base: yP, top: 17, r: 0.24 },      // peräsmasto
  ];
  for (const m of masts) parts.push(rod(V(0, m.base - 0.5, m.z), V(0, m.top, m.z), m.r, m.r * 0.55, 0x6e5238, rand, 9));
  for (const [z, y, r] of [[8.6, 16.3, 1.0], [0.8, 19.7, 1.25]]) {
    const top = new THREE.CylinderGeometry(r, r * 0.75, 0.75, 12, 1, true);
    top.translate(0, y, z);
    parts.push(paint(top, 0x5e4028, { rand }));
    const floor = new THREE.CylinderGeometry(r * 0.98, r * 0.98, 0.08, 12);
    floor.translate(0, y - 0.3, z);
    parts.push(paint(floor, 0x4e3522, { rand }));
  }
  // Köysistö: vantit laitoihin, harukset keulapuuhun ja mastojen välille
  const rope = 0x231a14;
  const railAt = (z) => {
    const s = nearestStation(st, z);
    const hw = secPoint(s, Math.PI / 2, opt.pw, opt.tumble)[0];
    const y = z <= st[iP].z ? yP + 0.85 : z <= st[iQ].z ? yQ + 0.85 : z >= st[iF].z ? yF + 0.8 : s.top;
    return [hw, y];
  };
  for (const [z, y] of [[8.6, 16.1], [0.8, 19.4], [-9.6, 14.5]]) {
    for (const sx of [1, -1]) {
      for (const dz of [-1.6, -0.8, 0, 0.8]) {
        const [hw, ty] = railAt(z + dz);
        parts.push(rod(V(0, y, z), V(sx * hw, ty + 0.05, z + dz), 0.025, 0.025, rope, rand, 3));
      }
    }
  }
  parts.push(rod(V(0, 20.2, 8.6), V(0, 7.0, st[n].z + 6.0), 0.03, 0.03, rope, rand, 3));
  parts.push(rod(V(0, 27.2, 0.8), V(0, 16.5, 8.6), 0.03, 0.03, rope, rand, 3));
  parts.push(rod(V(0, 19.6, 0.8), V(0, 5.0, 8.6), 0.03, 0.03, rope, rand, 3));
  parts.push(rod(V(0, 16.8, -9.6), V(0, 24, 0.8), 0.025, 0.025, rope, rand, 3));
  const group = finish(parts, mats);
  // Ruori
  const wheelG = merge([
    paint(new THREE.TorusGeometry(0.4, 0.035, 5, 16), 0x7a5634, { rand }),
    ...[0, 1, 2, 3].map((k) => {
      const a = (k / 4) * Math.PI;
      return rod(V(-Math.cos(a) * 0.5, -Math.sin(a) * 0.5, 0), V(Math.cos(a) * 0.5, Math.sin(a) * 0.5, 0), 0.025, 0.025, 0x7a5634, rand, 4);
    }),
  ]);
  const wheel = new THREE.Mesh(wheelG, mats.wood);
  wheel.position.set(0, yQ + 0.95, helmZ - 0.08);
  wheel.castShadow = true;
  group.add(wheel);
  // Raakapurjeet keula- ja isomastossa, keulapuun alla räikkäpurje,
  // peräsmastossa latinalaispurje.
  const sails = [], pennants = [];
  const square = (z, yTop, yBot, head, foot, cross = false, nu = 12, nv = 10) => {
    const yard = new THREE.Group();
    yard.position.set(0, 0, z);
    const spar = new THREE.Mesh(merge([rod(V(-head / 2 - 0.5, yTop, 0), V(head / 2 + 0.5, yTop, 0), 0.17, 0.17, 0x6e5238, rand, 7)]), mats.wood);
    spar.castShadow = true;
    yard.add(spar);
    const zz = 0.35;
    const sail = sailMesh(mats.sail, [[head / 2, yTop - 0.15, zz], [-head / 2, yTop - 0.15, zz], [-foot / 2, yBot, zz], [foot / 2, yBot, zz]], nu, nv,
      canvasCol(0xe8dfc8, cross));
    yard.add(sail);
    group.add(yard);
    sails.push({ mesh: sail, rig: 'square', yard, hoist: null, lower: 0 });
  };
  square(8.6, 15.6, 6.8, 9.5, 10.8, true, 16, 14);
  square(8.6, 20.0, 16.6, 6.0, 8.2);
  square(0.8, 18.6, 7.9, 12.5, 14.5, true, 16, 14);
  square(0.8, 25.6, 20.1, 7.4, 10.4);
  square(st[n].z + 3.6, 5.6, 1.9, 5.8, 6.6);
  const miz = new THREE.Group();
  miz.position.set(0, 0, -9.6);
  const T = [0, yP + 1.6, 3.6], P = [0, 19.5, -3.6], C = [0, yP + 1.4, -4.6];
  miz.add(new THREE.Mesh(merge([rod(V(...T), V(...P), 0.14, 0.09, 0x6e5238, rand, 6)]), mats.wood));
  const msail = sailMesh(mats.sail, [T, P, C], 12, 10, canvasCol(0xe8dfc8));
  miz.add(msail);
  group.add(miz);
  sails.push({ mesh: msail, rig: 'lateen', yard: miz, hoist: null, lower: 0 });
  for (const [z, y, len] of [[0.8, 27.5, 4.5], [8.6, 20.5, 3.4], [-9.6, 17, 2.6]]) {
    const pen = new THREE.Group();
    pen.position.set(0, y, z);
    pen.add(new THREE.Mesh(pennant(rand, len, 0xa3271d), mats.sail));
    group.add(pen);
    pennants.push(pen);
  }
  return { group, mats, oars: [], sails, pennants, wheel };
}

export const BOAT_MODELS = { rowboat: makeRowboat, sailboat: makeSailboat, ship: makeShip };

// Haamu- ja kuvakemalli: kaikki osat yhtenä geometriana.
export function boatGeometry(type) {
  const m = BOAT_MODELS[type]();
  for (const s of m.sails) updateSail(s.mesh, 1, 0.7, 1, 0, 0);
  for (const o of m.oars) o.rotation.y = o.userData.side * 1.45; // airot veneen sisällä
  m.group.updateMatrixWorld(true);
  const geos = [];
  m.group.traverse((o) => {
    if (!o.isMesh || o.userData.waterCap) return;
    const g = o.geometry.clone();
    g.applyMatrix4(o.matrixWorld);
    geos.push(g);
  });
  return merge(geos);
}
