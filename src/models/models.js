// Proseduraaliset 3D-mallit (low-poly, vertex-värit).
//
// Väliaikaisia malleja: jokainen malli on BufferGeometry, jossa on position,
// normal ja color. Kun pelin grafiikkaa jalostetaan, nämä voi korvata
// glTF-malleilla samoilla nimillä (ks. docs/DECISIONS.md).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mulberry32 } from '../noise.js';

const _color = new THREE.Color();
const _up = new THREE.Vector3(0, 1, 0);
const _dir = new THREE.Vector3();
const _q = new THREE.Quaternion();

// --- Apufunktiot -----------------------------------------------------------

function prep(geo) {
  if (geo.index) geo = geo.toNonIndexed();
  for (const name of Object.keys(geo.attributes)) {
    if (name !== 'position' && name !== 'normal') geo.deleteAttribute(name);
  }
  return geo;
}

// Siirtää verteksejä niin, että samassa pisteessä olevat verteksit siirtyvät
// samalla tavalla (pinta ei repeä).
function displace(geo, fn) {
  const p = geo.attributes.position;
  const cache = new Map();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const key = `${Math.round(x * 1e4)},${Math.round(y * 1e4)},${Math.round(z * 1e4)}`;
    let d = cache.get(key);
    if (!d) { d = fn(x, y, z); cache.set(key, d); }
    p.setXYZ(i, x + d[0], y + d[1], z + d[2]);
  }
  p.needsUpdate = true;
  return geo;
}

// Värittää geometrian. jitter = kolmiokohtainen kirkkausvaihtelu,
// shade(x, y, z) = paikkakohtainen kerroin (esim. tummempi alapinta).
function paint(geo, hex, { jitter = 0.08, rand = Math.random, shade = null } = {}) {
  geo = prep(geo);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  _color.set(hex);
  for (let i = 0; i < pos.count; i += 3) {
    const j = 1 + (rand() - 0.5) * 2 * jitter;
    for (let k = 0; k < 3 && i + k < pos.count; k++) {
      const vi = i + k;
      const s = shade ? shade(pos.getX(vi), pos.getY(vi), pos.getZ(vi)) : 1;
      colors[vi * 3] = _color.r * j * s;
      colors[vi * 3 + 1] = _color.g * j * s;
      colors[vi * 3 + 2] = _color.b * j * s;
    }
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  return geo;
}

// Sylinteri pisteestä a pisteeseen b. Päädyt jätetään pois (eivät näy),
// mikä puolittaa ohuiden oksien kolmiomäärän.
function limb(a, b, r0, r1, seg = 5, capped = false) {
  _dir.subVectors(b, a);
  const len = _dir.length();
  const geo = new THREE.CylinderGeometry(r1, r0, len, seg, 1, !capped);
  geo.translate(0, len / 2, 0);
  _q.setFromUnitVectors(_up, _dir.normalize());
  geo.applyQuaternion(_q);
  geo.translate(a.x, a.y, a.z);
  return geo;
}

function merge(geos) {
  const prepared = geos.map((g) => (g.attributes.color ? g : paint(g, 0xff00ff)));
  const out = mergeGeometries(prepared, false);
  out.computeBoundingBox();
  out.computeBoundingSphere();
  return out;
}

function flatNormals(geo) {
  geo = prep(geo);
  geo.computeVertexNormals();
  return geo;
}

const V = (x, y, z) => new THREE.Vector3(x, y, z);

// --- Maailman mallit -------------------------------------------------------

// Akasia (Acacia tortilis): kalteva runko, haarat ja litteä "sateenvarjo".
export function makeAcacia(seed) {
  const rand = mulberry32(seed);
  const parts = [];
  const bark = [0x4f3f33, 0x5b4838, 0x4a3b30][seed % 3];
  const leaf = [0x6f7d3c, 0x7b8442, 0x858646][seed % 3];

  const lean = V((rand() - 0.5) * 0.9, 0, (rand() - 0.5) * 0.9);
  const trunkTop = V(lean.x, 1.8 + rand() * 0.8, lean.z);
  const trunk = limb(V(0, -0.2, 0), trunkTop, 0.24, 0.17, 7);
  parts.push(paint(trunk, bark, { rand, jitter: 0.1 }));

  const canopyH = trunkTop.y + 1.6 + rand() * 0.9;
  const nb = 3 + Math.floor(rand() * 2);
  const tips = [];
  for (let i = 0; i < nb; i++) {
    const a = (i / nb) * Math.PI * 2 + rand() * 0.8;
    const r = 1.3 + rand() * 1.1;
    const tip = V(trunkTop.x + Math.cos(a) * r, canopyH - 0.2 - rand() * 0.4, trunkTop.z + Math.sin(a) * r);
    const mid = V(
      trunkTop.x + Math.cos(a) * r * 0.45,
      trunkTop.y + (tip.y - trunkTop.y) * 0.55,
      trunkTop.z + Math.sin(a) * r * 0.45,
    );
    parts.push(paint(limb(trunkTop, mid, 0.15, 0.11, 5), bark, { rand }));
    parts.push(paint(limb(mid, tip, 0.11, 0.05, 5), bark, { rand }));
    tips.push(tip);
  }

  const leafShade = (cy) => (x, y) => (y < cy ? 0.55 : 1.0);
  // Iso yhtenäinen latvus + pienempiä tyynyjä haarojen päissä.
  const center = V(trunkTop.x, canopyH + 0.15, trunkTop.z);
  const pads = [{ p: center, s: V(3.0 + rand(), 0.55, 2.8 + rand()) }];
  for (const t of tips) pads.push({ p: V(t.x, t.y + 0.25, t.z), s: V(1.4 + rand() * 0.6, 0.45, 1.4 + rand() * 0.6) });
  for (const pad of pads) {
    let g = new THREE.IcosahedronGeometry(1, 1);
    displace(g, () => [(rand() - 0.5) * 0.35, (rand() - 0.5) * 0.4, (rand() - 0.5) * 0.35]);
    g.scale(pad.s.x, pad.s.y, pad.s.z);
    g.rotateY(rand() * Math.PI);
    g.translate(pad.p.x, pad.p.y, pad.p.z);
    g = flatNormals(g);
    parts.push(paint(g, leaf, { rand, jitter: 0.12, shade: leafShade(pad.p.y - pad.s.y * 0.2) }));
  }
  return merge(parts);
}

// Baobab: paksu pullea runko, tylpät haarat, kuivakauden lehdettömyys.
export function makeBaobab(seed) {
  const rand = mulberry32(seed);
  const parts = [];
  const bark = 0x8b7c6c;
  const H = 5.6 + rand() * 1.2;
  const prof = [
    [1.75, -0.4], [1.85, 0.3], [1.7, 1.2], [1.55, 2.4], [1.4, 3.6], [1.18, H - 1.0], [0.9, H - 0.3], [0.55, H],
  ].map(([r, y]) => new THREE.Vector2(r, y));
  let trunk = new THREE.LatheGeometry(prof, 12);
  displace(trunk, (x, y, z) => {
    const a = Math.atan2(z, x);
    const k = 1 + Math.sin(a * 5 + y * 0.6) * 0.06 + (rand() - 0.5) * 0.06;
    return [x * (k - 1), 0, z * (k - 1)];
  });
  trunk.computeVertexNormals();
  parts.push(paint(trunk, bark, { rand, jitter: 0.06, shade: (x, y) => 0.85 + Math.min(0.15, y * 0.03) }));

  const nb = 6 + Math.floor(rand() * 3);
  for (let i = 0; i < nb; i++) {
    const a = (i / nb) * Math.PI * 2 + rand() * 0.5;
    const base = V(Math.cos(a) * 0.5, H - 0.2, Math.sin(a) * 0.5);
    const len = 1.8 + rand() * 1.6;
    const tip = V(Math.cos(a) * (0.5 + len * 0.8), H + len * (0.45 + rand() * 0.4), Math.sin(a) * (0.5 + len * 0.8));
    parts.push(paint(limb(base, tip, 0.38, 0.14, 6), bark, { rand }));
    // Pienet sivuhaarat
    for (let k = 0; k < 2; k++) {
      const b2 = tip.clone().lerp(base, 0.25);
      const a2 = a + (rand() - 0.5) * 1.6;
      const t2 = V(b2.x + Math.cos(a2) * 0.9, b2.y + 0.5 + rand() * 0.6, b2.z + Math.sin(a2) * 0.9);
      parts.push(paint(limb(b2, t2, 0.1, 0.04, 4), bark, { rand }));
    }
    // Riippuva hedelmä ("apinanleipä")
    if (rand() < 0.7) {
      const f = new THREE.IcosahedronGeometry(0.11, 0);
      f.scale(1, 1.9, 1);
      const fp = tip.clone().lerp(base, 0.4);
      f.translate(fp.x, fp.y - 0.45, fp.z);
      parts.push(paint(limb(V(fp.x, fp.y - 0.05, fp.z), V(fp.x, fp.y - 0.3, fp.z), 0.012, 0.012, 3), 0x5a4a3a, { rand }));
      parts.push(paint(flatNormals(f), 0x9a9772, { rand }));
    }
  }
  return merge(parts);
}

// Kuivunut pensas: ohuita oksia ja muutama kuiva lehtitupsu.
export function makeBush(seed) {
  const rand = mulberry32(seed);
  const parts = [];
  const cols = [0x93806a, 0xa38f78, 0x8a7d70];
  const n = 11 + Math.floor(rand() * 6);
  const H = 0.8 + rand() * 0.6;
  for (let i = 0; i < n; i++) {
    const a = rand() * Math.PI * 2;
    const spread = 0.4 + rand() * 0.7;
    const mid = V(Math.cos(a) * spread * 0.4, H * (0.35 + rand() * 0.2), Math.sin(a) * spread * 0.4);
    const tip = V(Math.cos(a + (rand() - 0.5) * 0.6) * spread, H * (0.6 + rand() * 0.5), Math.sin(a + (rand() - 0.5) * 0.6) * spread);
    const col = cols[Math.floor(rand() * cols.length)];
    parts.push(paint(limb(V(0, -0.05, 0), mid, 0.03, 0.022, 3), col, { rand }));
    parts.push(paint(limb(mid, tip, 0.022, 0.008, 3), col, { rand }));
    if (rand() < 0.55) {
      const side = V(tip.x * 0.8 + (rand() - 0.5) * 0.4, tip.y + 0.1 + rand() * 0.15, tip.z * 0.8 + (rand() - 0.5) * 0.4);
      parts.push(paint(limb(mid.clone().lerp(tip, 0.5), side, 0.012, 0.005, 3), col, { rand }));
    }
    if (rand() < 0.45) {
      let leaf = new THREE.IcosahedronGeometry(0.12 + rand() * 0.08, 0);
      leaf.scale(1, 0.6, 1);
      leaf.translate(tip.x, tip.y, tip.z);
      leaf = flatNormals(leaf);
      parts.push(paint(leaf, rand() < 0.5 ? 0xa48e58 : 0xb09a62, { rand, jitter: 0.15 }));
    }
  }
  return merge(parts);
}

// Tumbleweed: pallomainen oksavyyhti.
export function makeTumbleweed(seed) {
  const rand = mulberry32(seed);
  const parts = [];
  const R = 0.5;
  const pts = [];
  for (let i = 0; i < 64; i++) {
    const u = rand() * 2 - 1;
    const t = rand() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);
    const rr = R * (0.7 + rand() * 0.3);
    pts.push(V(Math.cos(t) * s * rr, u * rr, Math.sin(t) * s * rr));
  }
  // Jokainen piste yhdistetään lähimpiin naapureihin kaarevalla oksalla,
  // jonka keskikohta työnnetään pallon pinnalle -> pyöreä vyyhti.
  for (let i = 0; i < pts.length; i++) {
    const near = pts
      .map((p, j) => ({ j, d: p.distanceTo(pts[i]) }))
      .filter((e) => e.j !== i)
      .sort((a, b) => a.d - b.d);
    for (let k = 0; k < 3; k++) {
      const j = near[k + Math.floor(rand() * 2)].j;
      if (j < i && k > 0) continue;
      const a = pts[i];
      const b = pts[j];
      const mid = a.clone().add(b).multiplyScalar(0.5);
      mid.setLength(R * (0.8 + rand() * 0.25));
      const col = rand() < 0.5 ? 0xb49c6c : 0x9c8256;
      parts.push(paint(limb(a, mid, 0.01, 0.009, 3), col, { rand, jitter: 0.12 }));
      parts.push(paint(limb(mid, b, 0.009, 0.008, 3), col, { rand, jitter: 0.12 }));
    }
  }
  // Muutama oksa myös sisälle, ettei vyyhti näytä ontolta.
  for (let i = 0; i < 14; i++) {
    const a = pts[Math.floor(rand() * pts.length)];
    const b = pts[Math.floor(rand() * pts.length)];
    const mid = a.clone().add(b).multiplyScalar(0.25);
    parts.push(paint(limb(a, mid, 0.01, 0.008, 3), 0x8e7550, { rand }));
  }
  return merge(parts);
}

// Maassa makaava risu.
export function makeGroundStick(seed) {
  const rand = mulberry32(seed);
  const len = 0.7 + rand() * 0.4;
  const a = V(-len / 2, 0.035, 0);
  const b = V(len / 2, 0.03, (rand() - 0.5) * 0.15);
  const parts = [paint(limb(a, b, 0.032, 0.022, 5, true), 0x6e5238, { rand })];
  const m = a.clone().lerp(b, 0.4 + rand() * 0.3);
  parts.push(paint(limb(m, V(m.x + 0.18, 0.04, m.z + (rand() < 0.5 ? 0.2 : -0.2)), 0.016, 0.008, 3), 0x6e5238, { rand }));
  return merge(parts);
}

// Pieni kivi, jonka voi poimia.
export function makeStone(seed) {
  const rand = mulberry32(seed);
  let g = new THREE.DodecahedronGeometry(0.17, 0);
  displace(g, () => [(rand() - 0.5) * 0.06, (rand() - 0.5) * 0.05, (rand() - 0.5) * 0.06]);
  g.scale(1.1, 0.7, 0.95);
  g.translate(0, 0.07, 0);
  g = flatNormals(g);
  const col = [0x8a8178, 0x8f5a3e, 0x6f6a64][seed % 3];
  return merge([paint(g, col, { rand, jitter: 0.12 })]);
}

// Iso lohkare (louhitaan hakulla).
export function makeBoulder(seed) {
  const rand = mulberry32(seed);
  let g = new THREE.IcosahedronGeometry(1, 1);
  displace(g, (x, y, z) => {
    const k = 0.78 + rand() * 0.38;
    return [x * (k - 1), y * (k - 1), z * (k - 1)];
  });
  g.scale(1.25, 0.75, 1.05);
  g.translate(0, 0.35, 0);
  g = flatNormals(g);
  const col = [0x7d4a33, 0x8c847a, 0x6e4a3a][seed % 3];
  return merge([paint(g, col, { rand, jitter: 0.1, shade: (x, y) => (y > 0.6 ? 1.12 : 0.92) })]);
}

// Termiittikeko (lateriitinpunainen "katedraali").
export function makeTermiteMound(seed) {
  const rand = mulberry32(seed);
  const parts = [];
  const col = 0x9a5a36;
  const spires = 1 + Math.floor(rand() * 3);
  for (let s = 0; s < spires; s++) {
    const H = s === 0 ? 2.2 + rand() * 0.9 : 1.0 + rand() * 0.9;
    const R = s === 0 ? 0.85 : 0.45 + rand() * 0.2;
    const ox = s === 0 ? 0 : (rand() - 0.5) * 1.2;
    const oz = s === 0 ? 0 : (rand() - 0.5) * 1.2;
    const prof = [[R, -0.3], [R * 0.95, 0.2], [R * 0.7, H * 0.4], [R * 0.45, H * 0.75], [R * 0.2, H * 0.95], [0.02, H]]
      .map(([r, y]) => new THREE.Vector2(r, y));
    const g = new THREE.LatheGeometry(prof, 9);
    displace(g, (x, y, z) => {
      const k = 1 + (rand() - 0.5) * 0.3;
      return [x * (k - 1), (rand() - 0.5) * 0.08, z * (k - 1)];
    });
    g.translate(ox, 0, oz);
    parts.push(paint(flatNormals(g), col, { rand, jitter: 0.1, shade: (x, y) => 0.85 + Math.min(0.25, y * 0.1) }));
  }
  return merge(parts);
}

// Ruohotupsu. Normaalit osoittavat ylös, jotta valaistus on pehmeä.
export function makeGrassTuft(seed) {
  const rand = mulberry32(seed);
  const n = 10 + Math.floor(rand() * 6);
  const pos = [];
  const col = [];
  const base = new THREE.Color(0x7d6d3e);
  const tipCols = [new THREE.Color(0xd9c58a), new THREE.Color(0xc9b06a), new THREE.Color(0xbfae78)];
  for (let i = 0; i < n; i++) {
    const a = rand() * Math.PI * 2;
    const r = rand() * 0.12;
    const bx = Math.cos(a) * r, bz = Math.sin(a) * r;
    const h = 0.35 + rand() * 0.45;
    const lean = 0.1 + rand() * 0.25;
    const la = a + (rand() - 0.5) * 0.8;
    const w = 0.025 + rand() * 0.015;
    const px = -Math.sin(la) * w, pz = Math.cos(la) * w;
    const tip = tipCols[Math.floor(rand() * tipCols.length)];
    pos.push(bx - px, 0, bz - pz, bx + px, 0, bz + pz, bx + Math.cos(la) * lean, h, bz + Math.sin(la) * lean);
    col.push(base.r, base.g, base.b, base.r, base.g, base.b, tip.r, tip.g, tip.b);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  const normals = new Float32Array(pos.length);
  for (let i = 1; i < normals.length; i += 3) normals[i] = 1;
  g.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  g.computeBoundingSphere();
  return g;
}

// Nuotion runko (kivikehä + tukit). Liekit lisätään erikseen.
export function makeCampfireBase(seed = 3) {
  const rand = mulberry32(seed);
  const parts = [];
  const ns = 9;
  for (let i = 0; i < ns; i++) {
    const a = (i / ns) * Math.PI * 2;
    let s = new THREE.DodecahedronGeometry(0.13, 0);
    displace(s, () => [(rand() - 0.5) * 0.05, (rand() - 0.5) * 0.04, (rand() - 0.5) * 0.05]);
    s.scale(1.2, 0.8, 1);
    s.rotateY(a);
    s.translate(Math.cos(a) * 0.48, 0.06, Math.sin(a) * 0.48);
    parts.push(paint(flatNormals(s), rand() < 0.5 ? 0x7a746c : 0x8f5a3e, { rand }));
  }
  const nl = 5;
  for (let i = 0; i < nl; i++) {
    const a = (i / nl) * Math.PI * 2 + 0.3;
    parts.push(paint(limb(V(Math.cos(a) * 0.4, 0.02, Math.sin(a) * 0.4), V(Math.cos(a) * 0.05, 0.45, Math.sin(a) * 0.05), 0.05, 0.035, 5), 0x5a4030, { rand }));
  }
  const ash = new THREE.CylinderGeometry(0.3, 0.34, 0.04, 10);
  ash.translate(0, 0.01, 0);
  parts.push(paint(ash, 0x2e2925, { rand, jitter: 0.2 }));
  return merge(parts);
}

// --- Esinemallit (käsi ja ikonit). Kahva origossa, esine +Y-suuntaan. -------

function itemStick() {
  const rand = mulberry32(5);
  return merge([
    paint(limb(V(0, -0.12, 0), V(0.01, 0.5, 0.01), 0.022, 0.016, 6, true), 0x6e5238, { rand }),
    paint(limb(V(0.005, 0.25, 0), V(0.09, 0.4, 0.02), 0.01, 0.006, 4), 0x6e5238, { rand }),
  ]);
}

function itemStone() {
  const g = makeStone(4).clone();
  g.translate(0, -0.05, 0);
  return g;
}

function itemFiber() {
  const rand = mulberry32(9);
  const parts = [];
  for (let i = 0; i < 14; i++) {
    const a = rand() * Math.PI * 2;
    const r = rand() * 0.03;
    const b = V(Math.cos(a) * r, -0.05, Math.sin(a) * r);
    const t = V(Math.cos(a) * (0.05 + rand() * 0.06), 0.3 + rand() * 0.12, Math.sin(a) * (0.05 + rand() * 0.06));
    parts.push(paint(limb(b, t, 0.006, 0.003, 3), rand() < 0.5 ? 0xd2bd84 : 0xb9a36a, { rand }));
  }
  const band = new THREE.CylinderGeometry(0.038, 0.038, 0.03, 8);
  band.translate(0, 0.06, 0);
  parts.push(paint(band, 0x8a6a40, { rand }));
  return merge(parts);
}

function itemWood() {
  const rand = mulberry32(11);
  let g = new THREE.CylinderGeometry(0.085, 0.09, 0.42, 9);
  g.translate(0, 0.12, 0);
  g = prep(g);
  // Kyljet kaarnan värisiksi, päädyt vaaleiksi.
  const pos = g.attributes.position;
  const nrm = g.attributes.normal;
  const colors = new Float32Array(pos.count * 3);
  const barkC = new THREE.Color(0x5b4838);
  const endC = new THREE.Color(0xc9a679);
  for (let i = 0; i < pos.count; i++) {
    const c = Math.abs(nrm.getY(i)) > 0.9 ? endC : barkC;
    const j = 0.9 + rand() * 0.2;
    colors.set([c.r * j, c.g * j, c.b * j], i * 3);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  return merge([g]);
}

function lashing(y, r) {
  const g = new THREE.CylinderGeometry(r, r, 0.05, 8);
  g.translate(0, y, 0);
  return paint(g, 0xb39a68, { jitter: 0.15 });
}

function itemStoneAxe() {
  const rand = mulberry32(13);
  const parts = [paint(limb(V(0, -0.15, 0), V(0, 0.5, 0), 0.02, 0.018, 6, true), 0x7a5a3a, { rand })];
  let head = new THREE.DodecahedronGeometry(0.1, 0);
  displace(head, () => [(rand() - 0.5) * 0.02, (rand() - 0.5) * 0.02, (rand() - 0.5) * 0.02]);
  head.scale(1.5, 0.95, 0.42);
  head.translate(0.09, 0.44, 0);
  parts.push(paint(flatNormals(head), 0x7d776e, { rand, jitter: 0.1 }));
  parts.push(lashing(0.44, 0.028));
  return merge(parts);
}

function itemStonePick() {
  const rand = mulberry32(17);
  const parts = [paint(limb(V(0, -0.15, 0), V(0, 0.5, 0), 0.02, 0.018, 6, true), 0x7a5a3a, { rand })];
  let head = new THREE.DodecahedronGeometry(0.08, 0);
  displace(head, () => [(rand() - 0.5) * 0.02, (rand() - 0.5) * 0.02, (rand() - 0.5) * 0.02]);
  head.scale(2.6, 0.7, 0.6);
  head.translate(0.0, 0.45, 0);
  parts.push(paint(flatNormals(head), 0x8f5a3e, { rand, jitter: 0.1 }));
  parts.push(lashing(0.45, 0.027));
  return merge(parts);
}

function itemCampfire() {
  const g = makeCampfireBase(7).clone();
  g.scale(0.45, 0.45, 0.45);
  return g;
}

export function createModelLibrary() {
  const range = (n, f, base) => Array.from({ length: n }, (_, i) => f(base + i * 101));
  return {
    world: {
      acacia: range(4, makeAcacia, 1),
      baobab: range(2, makeBaobab, 2),
      bush: range(4, makeBush, 3),
      stick: range(3, makeGroundStick, 4),
      stone: range(3, makeStone, 5),
      boulder: range(3, makeBoulder, 6),
      termite: range(2, makeTermiteMound, 7),
      grass: range(3, makeGrassTuft, 8),
    },
    tumbleweed: makeTumbleweed(42),
    campfire: makeCampfireBase(3),
    items: {
      stick: itemStick(),
      stone: itemStone(),
      fiber: itemFiber(),
      wood: itemWood(),
      stone_axe: itemStoneAxe(),
      stone_pick: itemStonePick(),
      campfire: itemCampfire(),
    },
  };
}
