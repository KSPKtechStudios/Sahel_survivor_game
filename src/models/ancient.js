// Sessio 24: ympäristön tarinankerronta ja köynnökset.
// - Muinainen kivipylväs: murenevat rummut, osa kaatunut viereen.
// - Ruostunut kilpi maassa (osassa katkennut miekka vieressä).
// - Ikivanhat juuret, jotka nousevat kaarina maasta ja painuvat takaisin.
// - Liaanit ja runkoa kiertävät köynnökset sademetsän puihin (trees.js).
// Kaikki vertex-väritettyjä; pinnat saavat tekstuurit materiaalista
// (muinainen kivi: sammaloitunut kivi + sammal yläpinnoille).
import * as THREE from 'three';
import { mulberry32 } from '../noise.js';
import { V, paint, limb, merge, displace, partRand } from './util.js';

const _c = new THREE.Color();

// Lohkeillut kivi: säteittäinen ja pystysuuntainen kohina (saumat pysyvät kiinni).
function chip(geo, rand, amt) {
  const seed = rand() * 1000;
  return displace(geo, (x, y, z) => {
    const n = Math.sin(x * 9.1 + seed) * Math.cos(z * 8.3 - seed) + Math.sin(y * 11.7 + x * 3.1);
    const k = amt * (0.5 + 0.5 * n);
    const r = Math.hypot(x, z) || 1;
    return [-(x / r) * k * 0.6, -Math.abs(n) * amt * 0.3, -(z / r) * k * 0.6];
  });
}

// Kivinen pylväsrumpu: sylinteri, jonka yläpinta voi olla katkennut (rosoinen).
function drum(r, h, rand, broken, q) {
  const g = new THREE.CylinderGeometry(r, r * 1.01, h, q ? 12 : 8, q ? 2 : 1, false);
  g.translate(0, h / 2, 0);
  if (broken) {
    const s = rand() * 100;
    displace(g, (x, y, z) => (y > h - 0.01 ? [0, -(0.08 + 0.3 * (0.5 + 0.5 * Math.sin(x * 6 + s) * Math.cos(z * 5 - s))), 0] : [0, 0, 0]));
  }
  return chip(g, rand, 0.035);
}

function stonePaint(geo, hex, rand) {
  // Tyvi tummempi (maa ja kosteus), yläpinnat vaaleammat.
  return paint(geo, hex, { rand, jitter: 0.07, shade: (x, y) => 0.72 + 0.28 * Math.min(1, Math.max(0, (y + 0.1) / 1.2)) });
}

export function makeAncientPillar(seed, q = 1) {
  const rand = mulberry32(seed);
  let k = 0;
  const jr = () => partRand(seed, k++);
  const parts = [];
  const stone = [0x8d877b, 0x80796c, 0x958e80][seed % 3];
  // Jalusta (osin maan sisällä)
  const plinth = chip(new THREE.BoxGeometry(1.25, 0.42, 1.25, q ? 2 : 1, 1, q ? 2 : 1), rand, 0.04);
  plinth.translate(0, 0.06, 0);
  parts.push(stonePaint(plinth, stone, jr()));
  const n = 2 + Math.floor(rand() * 3);
  const broken = rand() < 0.75;
  let y = 0.27;
  let ox = 0, oz = 0;
  for (let i = 0; i < n; i++) {
    const h = 0.55 + rand() * 0.18;
    const r = 0.4 - i * 0.012;
    const g = drum(r, h, jr(), broken && i === n - 1, q);
    // Rummut ovat hieman siirtyneet ja kallistuneet vuosisatojen aikana.
    g.rotateX((rand() - 0.5) * 0.06);
    g.rotateZ((rand() - 0.5) * 0.06);
    ox += (rand() - 0.5) * 0.05;
    oz += (rand() - 0.5) * 0.05;
    g.translate(ox, y, oz);
    parts.push(stonePaint(g, stone, jr()));
    y += h - 0.01;
  }
  if (!broken) {
    // Kapiteeli, yksi kulma lohjennut.
    const cap = chip(new THREE.BoxGeometry(0.98, 0.26, 0.98, q ? 2 : 1, 1, q ? 2 : 1), rand, 0.05);
    cap.translate(ox, y + 0.13, oz);
    parts.push(stonePaint(cap, stone, jr()));
  }
  // Kaatuneet rummut vieressä, osin maahan painuneina.
  const fallen = broken ? 1 + Math.floor(rand() * 2) : Math.floor(rand() * 2);
  for (let i = 0; i < fallen; i++) {
    const h = 0.55 + rand() * 0.15;
    const g = drum(0.39, h, jr(), rand() < 0.5, q);
    g.translate(0, -h / 2, 0);
    g.rotateZ(Math.PI / 2 + (rand() - 0.5) * 0.2);
    const a = rand() * Math.PI * 2, d = 1.1 + rand() * 1.0;
    g.rotateY(rand() * Math.PI);
    g.translate(Math.cos(a) * d, 0.26, Math.sin(a) * d);
    parts.push(stonePaint(g, stone, jr()));
  }
  // Pieniä lohkareita ja sirpaleita juurella.
  if (q) {
    for (let i = 0; i < 4; i++) {
      const s = 0.08 + rand() * 0.14;
      const g = chip(new THREE.DodecahedronGeometry(s, 0), jr(), 0.02);
      const a = rand() * Math.PI * 2, d = 0.75 + rand() * 0.9;
      g.translate(Math.cos(a) * d, s * 0.3, Math.sin(a) * d);
      parts.push(stonePaint(g, stone, jr()));
    }
  }
  return merge(parts);
}

// --- Ruostunut kilpi ---------------------------------------------------------

function rustPaint(geo, rand) {
  geo = paint(geo, 0x7a3f1e, { rand, jitter: 0.05 });
  const p = geo.attributes.position, c = geo.attributes.color;
  const s = rand() * 50;
  const cols = [new THREE.Color(0x7a3f1e), new THREE.Color(0x92522a), new THREE.Color(0x4a3a2e), new THREE.Color(0x5e3018)];
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), y = p.getY(i);
    const n = 0.5 + 0.5 * Math.sin(x * 13 + s) * Math.cos(z * 11 - s) * Math.sin(y * 7 + x * 5);
    const t = Math.min(3, Math.floor(n * 4));
    _c.copy(cols[t]).lerp(cols[(t + 1) % 4], n * 4 - t);
    c.setXYZ(i, _c.r, _c.g, _c.b);
  }
  return geo;
}

export function makeRustyShield(seed, q = 1) {
  const rand = mulberry32(seed);
  let k = 0;
  const jr = () => partRand(seed, k++);
  const parts = [];
  const R = 0.4 + rand() * 0.06;
  const disc = new THREE.CylinderGeometry(R, R, 0.03, q ? 20 : 12, 1, false);
  // Lommoja ja ruostereikiä
  const s = rand() * 30;
  displace(disc, (x, y, z) => [0, Math.sin(x * 7 + s) * Math.cos(z * 6 - s) * 0.012, 0]);
  parts.push(rustPaint(disc, jr()));
  const rim = new THREE.TorusGeometry(R, 0.022, 4, q ? 20 : 12);
  rim.rotateX(Math.PI / 2);
  parts.push(rustPaint(rim, jr()));
  const boss = new THREE.SphereGeometry(0.1, q ? 10 : 6, 4, 0, Math.PI * 2, 0, Math.PI / 2);
  boss.translate(0, 0.012, 0);
  parts.push(rustPaint(boss, jr()));
  const v = seed % 3;
  let g = merge(parts);
  const out = [];
  if (v === 2) {
    // Pystyssä vinossa, puoliksi maahan uponneena.
    g.rotateX(-1.15);
    g.translate(0, R * 0.45, 0);
  } else {
    g.rotateX(-0.18 - rand() * 0.15);
    g.rotateZ((rand() - 0.5) * 0.25);
    g.translate(0, 0.02, 0);
  }
  out.push(g);
  if (v === 1) {
    // Katkennut, ruostunut miekka kilven vieressä.
    const blade = new THREE.BoxGeometry(0.05, 0.012, 0.55);
    blade.translate(0.62, 0.02, 0.05);
    out.push(rustPaint(blade, jr()));
    const guard = new THREE.BoxGeometry(0.2, 0.03, 0.035);
    guard.translate(0.62, 0.025, -0.24);
    out.push(rustPaint(guard, jr()));
    const grip = new THREE.CylinderGeometry(0.018, 0.018, 0.16, 6);
    grip.rotateX(Math.PI / 2);
    grip.translate(0.62, 0.025, -0.34);
    out.push(paint(grip, 0x3a2a1e, { rand: jr() }));
    g = merge(out);
    g.rotateY(rand() * Math.PI * 2);
    return g;
  }
  return merge(out);
}

// --- Ikivanhat juuret --------------------------------------------------------

export function makeAncientRoots(seed, q = 1) {
  const rand = mulberry32(seed);
  let k = 0;
  const jr = () => partRand(seed, k++);
  const parts = [];
  const bark = [0x4e3b2a, 0x56422e, 0x463626][seed % 3];
  const n = 3 + Math.floor(rand() * 3);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rand() * 0.8;
    const len = 2.4 + rand() * 1.8;
    const lift = 0.35 + rand() * 0.55;
    const ca = Math.cos(a), sa = Math.sin(a);
    const bend = (rand() - 0.5) * 0.8;
    const pts = [];
    const segs = q ? 9 : 5;
    for (let j = 0; j <= segs; j++) {
      const t = j / segs;
      const d = 0.2 + t * len;
      const y = -0.35 + Math.sin(t * Math.PI) * (lift + 0.35) - t * 0.1;
      const side = Math.sin(t * Math.PI * 1.3) * bend;
      pts.push(V(ca * d - sa * side, y, sa * d + ca * side));
    }
    const r0 = 0.2 + rand() * 0.08;
    for (let j = 0; j < segs; j++) {
      const ra = r0 * (1 - (j / segs) * 0.7), rb = r0 * (1 - ((j + 1) / segs) * 0.7);
      parts.push(limb(pts[j], pts[j + 1], ra, rb, q ? 7 : 5, false));
    }
  }
  const g = merge(parts.map((p) => paint(p, bark, { rand: jr(), jitter: 0.1 })));
  // Sammal juurten yläpinnoilla.
  const c = g.attributes.color, nrm = g.attributes.normal;
  const moss = new THREE.Color(0x3c5a1e);
  for (let i = 0; i < c.count; i++) {
    const m = Math.max(0, Math.min(1, (nrm.getY(i) - 0.45) * 2.2)) * 0.75;
    if (m <= 0) continue;
    c.setXYZ(i, c.getX(i) + (moss.r - c.getX(i)) * m, c.getY(i) + (moss.g - c.getY(i)) * m, c.getZ(i) + (moss.b - c.getZ(i)) * m);
  }
  return g;
}

// --- Köynnökset (sademetsän puihin) ------------------------------------------

// Pieni lehtikortti lehtiatlaksen leveälehtisestä puoliskosta.
function sprig(p, size, hex, rand, P, N, C, U) {
  const a = rand() * Math.PI * 2, tilt = (rand() - 0.3) * 1.4;
  const ax = V(Math.cos(a), 0, Math.sin(a));
  const ay = V(-Math.sin(a) * Math.sin(tilt), Math.cos(tilt), Math.cos(a) * Math.sin(tilt));
  const nrm = ax.clone().cross(ay).normalize();
  if (nrm.y < 0) nrm.negate();
  nrm.y += 0.5;
  nrm.normalize();
  _c.set(hex).multiplyScalar(0.8 + rand() * 0.35);
  for (const [cx, cy] of [[-1, -1], [1, -1], [1, 1], [-1, -1], [1, 1], [-1, 1]]) {
    P.push(p.x + (ax.x * cx + ay.x * cy) * size, p.y + (ax.y * cx + ay.y * cy) * size, p.z + (ax.z * cx + ay.z * cy) * size);
    N.push(nrm.x, nrm.y, nrm.z);
    C.push(_c.r, _c.g, _c.b);
    U.push(0.5 + (cx * 0.5 + 0.5) * 0.5, cy * 0.5 + 0.5);
  }
}

function sprigGeo(P, N, C, U) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2));
  g.userData.keepUv = true;
  return g;
}

// Riippuva liaani pisteestä top: roikkuu kaarena ja päättyy maahan tai
// vapaana ilmaan. groundY = maan taso mallissa. Palauttaa osalistan.
export function liana(top, rand, groundY = 0, q = 1) {
  const parts = [];
  const a = rand() * Math.PI * 2;
  const drift = 0.6 + rand() * 1.6;
  const toGround = rand() < 0.45;
  const endY = toGround ? groundY - 0.1 : groundY + 1.2 + rand() * 2.5;
  const end = V(top.x + Math.cos(a) * drift, endY, top.z + Math.sin(a) * drift);
  const segs = q ? 8 : 4;
  const pts = [];
  const sag = 0.4 + rand() * 0.8;
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const p = top.clone().lerp(end, t);
    // Painuu keskeltä ulospäin (riippuva kaari), pieni kiemurtelu.
    p.x += Math.sin(t * Math.PI) * sag * Math.cos(a + 1.3) + Math.sin(t * 9 + a) * 0.06;
    p.z += Math.sin(t * Math.PI) * sag * Math.sin(a + 1.3) + Math.cos(t * 7 + a) * 0.06;
    pts.push(p);
  }
  // Sessio 26: liaani on paksumpi eikä siinä ole irtolehtiä (kaukaa ohut
  // varsi katosi ja lehtitupsut näyttivät leijuvilta pikseleiltä).
  const r = 0.04 + rand() * 0.025;
  for (let i = 0; i < segs; i++) parts.push(paint(limb(pts[i], pts[i + 1], r, r * 0.85, 5), 0x4a4626, { rand, jitter: 0.12 }));
  return parts;
}

// Runkoa kiertävä köynnös (base -> top -rungon akselia pitkin).
export function climbingVine(base, top, rTrunk, rand, q = 1) {
  const parts = [];
  const turns = 1.5 + rand() * 1.5;
  const segs = q ? 18 : 8;
  const pts = [];
  const a0 = rand() * Math.PI * 2;
  const h = 0.45 + rand() * 0.35;
  for (let i = 0; i <= segs; i++) {
    const t = (i / segs) * h;
    const c = base.clone().lerp(top, t);
    const rr = rTrunk * (1 - t * 0.4) + 0.035;
    const a = a0 + (i / segs) * turns * Math.PI * 2;
    pts.push(V(c.x + Math.cos(a) * rr, c.y, c.z + Math.sin(a) * rr));
  }
  for (let i = 0; i < segs; i++) parts.push(paint(limb(pts[i], pts[i + 1], 0.03, 0.025, 4), 0x45452a, { rand, jitter: 0.12 }));
  if (q) {
    const P = [], N = [], C = [], U = [];
    for (let i = 0; i < segs; i++) {
      const p = pts[i];
      const out = V(p.x - base.x, 0, p.z - base.z).normalize().multiplyScalar(0.12);
      sprig(p.clone().add(out), 0.18 + rand() * 0.1, 0x35622a, rand, P, N, C, U);
    }
    parts.push(sprigGeo(P, N, C, U));
  }
  return parts;
}

// --- Pudonneet oksat (maanpeite) --------------------------------------------

export function makeTwigs(seed, q = 1) {
  const rand = mulberry32(seed);
  const parts = [];
  const col = [0x6a5a48, 0x5e5040, 0x7a6a56][seed % 3];
  const n = 2 + Math.floor(rand() * 3);
  for (let i = 0; i < n; i++) {
    const a = rand() * Math.PI * 2;
    const len = 0.5 + rand() * 0.8;
    const r = 0.018 + rand() * 0.018;
    const p0 = V((rand() - 0.5) * 0.4, 0.02 + r, (rand() - 0.5) * 0.4);
    const mid = V(p0.x + Math.cos(a) * len * 0.5, p0.y + rand() * 0.04, p0.z + Math.sin(a) * len * 0.5);
    const a2 = a + (rand() - 0.5) * 0.5;
    const p1 = V(mid.x + Math.cos(a2) * len * 0.5, 0.02 + r * 0.6, mid.z + Math.sin(a2) * len * 0.5);
    parts.push(paint(limb(p0, mid, r, r * 0.8, q ? 5 : 4), col, { rand, jitter: 0.12 }));
    parts.push(paint(limb(mid, p1, r * 0.8, r * 0.5, q ? 5 : 4), col, { rand, jitter: 0.12 }));
    // Sivuhaara
    if (rand() < 0.7) {
      const a3 = a + (rand() < 0.5 ? 0.8 : -0.8);
      const t = mid.clone().lerp(p1, rand() * 0.6);
      parts.push(paint(limb(t, V(t.x + Math.cos(a3) * len * 0.3, t.y + 0.02, t.z + Math.sin(a3) * len * 0.3), r * 0.5, r * 0.25, 4), col, { rand, jitter: 0.12 }));
    }
  }
  return merge(parts);
}
