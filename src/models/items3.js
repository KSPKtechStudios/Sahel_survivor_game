// Sessio 22: tasoitettujen työkalujen, aseiden, kilpien, panssarien ja uusien
// materiaalien mallit. Kahva tai pohja origossa, esine +Y-suuntaan (kuten
// items.js ja items2.js). Rubiiniosat saavat lisäksi hehkukuoren
// (geometry.userData.glowGeo), jonka kädessä, maassa ja kuvakkeissa näkyvä
// malli piirtää omana kerroksenaan.
import * as THREE from 'three';
import { mulberry32 } from '../noise.js';
import { V, displace, paint, limb, flatNormals, merge } from './util.js';

// Materiaalien värit.
export const MAT = {
  wood: 0x6a4a2e,
  hardwood: 0x3e281b,
  heartwood: 0x7a3420,
  stone: 0x7d776e,
  flint: 0x34312f,
  copper: 0xc27a45,
  copperDark: 0x8a4e2a,
  iron: 0x8d9298,
  ironDark: 0x4d5257,
  ruby: 0xd3172e,
  leather: 0x6b4428,
  leatherDark: 0x4a2c18,
  bone: 0xe8dfca,
  fiber: 0xb39a68,
};

// Metallin kiilto: reunat ja yläpinnat vaaleampia (vain värit, materiaali on matta).
const metalShade = (x, y, z) => 0.82 + Math.min(0.35, Math.abs(x) * 2.2 + Math.max(0, z) * 3);
const edgeShade = (edgeX) => (x) => (x > edgeX ? 1.3 : 0.92);

// Hehkukuori: osat hieman suurennettuina oman keskipisteensä ympäri.
export function glowShell(parts, k = 1.08) {
  return merge(parts.map((p) => {
    const g = p.clone();
    g.computeBoundingBox();
    const c = g.boundingBox.getCenter(new THREE.Vector3());
    g.translate(-c.x, -c.y, -c.z);
    g.scale(k, k * 0.98, k * 1.25);
    g.translate(c.x, c.y, c.z);
    return g;
  }));
}

function withGlow(geo, glowParts) {
  if (glowParts.length) geo.userData.glowGeo = glowShell(glowParts);
  return geo;
}

// Muoto XY-tasossa pisteistä, paksuus Z-suunnassa (keskitetty).
function plate(points, depth, bevel = 0.002) {
  const shape = new THREE.Shape();
  shape.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) shape.lineTo(points[i][0], points[i][1]);
  shape.closePath();
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 1, curveSegments: 4 });
  g.translate(0, 0, -depth / 2);
  return g;
}

function handle(rand, top, col = MAT.wood, bottom = -0.15, r = 0.02) {
  return paint(limb(V(0, bottom, 0), V(0, top, 0), r, r * 0.9, 6, true), col, { rand });
}

function band(y, r, col, h = 0.03) {
  const g = new THREE.CylinderGeometry(r, r, h, 8);
  g.translate(0, y, 0);
  return paint(g, col, { jitter: 0.1 });
}

function grip(rand, y0, n, r, col = MAT.leather) {
  const parts = [];
  for (let i = 0; i < n; i++) parts.push(band(y0 + i * 0.026, r, i % 2 ? col : MAT.leatherDark, 0.022));
  return parts;
}

function gem(r, x, y, z, rand, sx = 1, sy = 1.4, sz = 0.7) {
  const g = new THREE.OctahedronGeometry(r, 0);
  displace(g, () => [(rand() - 0.5) * r * 0.2, (rand() - 0.5) * r * 0.2, (rand() - 0.5) * r * 0.2]);
  g.scale(sx, sy, sz);
  g.translate(x, y, z);
  return paint(flatNormals(g), MAT.ruby, { rand, jitter: 0.18, shade: (gx, gy) => (gy > y ? 1.35 : 0.8) });
}

// --- Kirveet --------------------------------------------------------------------

function axe(kind) {
  const rand = mulberry32(kind === 'copper' ? 301 : kind === 'iron' ? 302 : 303);
  const parts = [];
  const glow = [];
  const hcol = kind === 'copper' ? MAT.hardwood : kind === 'iron' ? MAT.hardwood : MAT.heartwood;
  parts.push(handle(rand, 0.56, hcol));
  parts.push(...grip(rand, -0.12, 4, 0.023));
  if (kind === 'copper') {
    // Leveä, viuhkamainen kuparinen terä ja lyhyt hamara.
    const blade = plate([[0.02, 0.4], [0.1, 0.38], [0.17, 0.33], [0.2, 0.44], [0.17, 0.55], [0.1, 0.5], [0.02, 0.48]], 0.022);
    parts.push(paint(flatNormals(blade), MAT.copper, { rand, jitter: 0.05, shade: edgeShade(0.16) }));
    const sock = new THREE.CylinderGeometry(0.03, 0.03, 0.1, 8);
    sock.translate(0, 0.44, 0);
    parts.push(paint(sock, MAT.copperDark, { rand }));
  } else if (kind === 'iron') {
    // Parrakas rautaterä, takana lyhyt nuija.
    const blade = plate([[0.02, 0.41], [0.09, 0.4], [0.14, 0.3], [0.2, 0.27], [0.22, 0.42], [0.2, 0.56], [0.12, 0.51], [0.02, 0.49]], 0.024);
    parts.push(paint(flatNormals(blade), MAT.iron, { rand, jitter: 0.04, shade: edgeShade(0.19) }));
    const poll = new THREE.BoxGeometry(0.07, 0.07, 0.05);
    poll.translate(-0.03, 0.45, 0);
    parts.push(paint(flatNormals(poll), MAT.ironDark, { rand }));
  } else {
    // Rubiini: tumma rautarunko, hehkuva kristalliterä.
    const body = plate([[0.0, 0.41], [0.08, 0.4], [0.11, 0.44], [0.08, 0.5], [0.0, 0.49]], 0.03);
    parts.push(paint(flatNormals(body), MAT.ironDark, { rand }));
    const crystal = plate([[0.08, 0.36], [0.16, 0.3], [0.23, 0.4], [0.22, 0.52], [0.15, 0.6], [0.09, 0.52]], 0.018, 0.003);
    const c = paint(flatNormals(crystal), MAT.ruby, { rand, jitter: 0.15, shade: edgeShade(0.18) });
    parts.push(c);
    glow.push(c);
    const tip = new THREE.ConeGeometry(0.018, 0.06, 5);
    tip.translate(0, 0.6, 0);
    parts.push(paint(tip, MAT.ironDark, { rand }));
  }
  return withGlow(merge(parts), glow);
}

// --- Hakut ----------------------------------------------------------------------

function pick(kind) {
  const rand = mulberry32(kind === 'copper' ? 311 : kind === 'iron' ? 312 : 313);
  const parts = [];
  const glow = [];
  const hcol = kind === 'ruby' ? MAT.heartwood : MAT.hardwood;
  parts.push(handle(rand, 0.53, hcol));
  parts.push(...grip(rand, -0.12, 4, 0.023));
  const col = kind === 'copper' ? MAT.copper : kind === 'iron' ? MAT.iron : MAT.ironDark;
  // Kaartuva kaksipäinen hakku: piikit hieman alaspäin.
  const y = 0.47;
  for (const sx of [1, -1]) {
    const mid = V(sx * 0.12, y + 0.01, 0);
    const tip = V(sx * 0.22, y - 0.05, 0);
    parts.push(paint(limb(V(0, y, 0), mid, 0.028, 0.02, 6), col, { rand, shade: metalShade }));
    if (kind === 'ruby' && sx > 0) {
      const g = paint(limb(mid, tip, 0.022, 0.003, 5), MAT.ruby, { rand, jitter: 0.12 });
      parts.push(g);
      glow.push(g);
    } else {
      parts.push(paint(limb(mid, tip, 0.02, 0.004, 6), col, { rand, shade: metalShade }));
    }
  }
  parts.push(band(y, 0.034, kind === 'copper' ? MAT.copperDark : MAT.ironDark, 0.06));
  return withGlow(merge(parts), glow);
}

// --- Terät ----------------------------------------------------------------------

function sword(kind) {
  const rand = mulberry32(kind === 'copper' ? 321 : kind === 'iron' ? 322 : 323);
  const parts = [];
  const glow = [];
  let blade;
  if (kind === 'copper') {
    // Lyhyt lehtimäinen terä (kuin pronssikautinen miekka).
    blade = plate([[-0.016, 0.03], [0.016, 0.03], [0.026, 0.25], [0.02, 0.42], [0, 0.52], [-0.02, 0.42], [-0.026, 0.25]], 0.008, 0.002);
    parts.push(paint(flatNormals(blade), MAT.copper, { rand, jitter: 0.04, shade: (x) => (Math.abs(x) > 0.015 ? 1.25 : 0.95) }));
  } else if (kind === 'iron') {
    blade = plate([[-0.019, 0.03], [0.019, 0.03], [0.017, 0.62], [0, 0.7], [-0.017, 0.62]], 0.007, 0.002);
    parts.push(paint(flatNormals(blade), MAT.iron, { rand, jitter: 0.03, shade: (x) => (Math.abs(x) > 0.012 ? 1.25 : x === 0 ? 0.8 : 0.95) }));
  } else {
    blade = plate([[-0.013, 0.03], [0.013, 0.03], [0.012, 0.58], [0, 0.68], [-0.012, 0.58]], 0.006, 0.002);
    const b = paint(flatNormals(blade), MAT.ruby, { rand, jitter: 0.1, shade: (x) => (Math.abs(x) > 0.008 ? 1.3 : 0.85) });
    parts.push(b);
    glow.push(b);
  }
  const guardCol = kind === 'copper' ? MAT.copperDark : MAT.ironDark;
  const gw = kind === 'iron' ? 0.15 : kind === 'ruby' ? 0.12 : 0.08;
  const guard = new THREE.BoxGeometry(gw, 0.018, 0.026);
  guard.translate(0, 0.022, 0);
  parts.push(paint(flatNormals(guard), guardCol, { rand }));
  parts.push(paint(limb(V(0, -0.11, 0), V(0, 0.015, 0), 0.015, 0.014, 6, true), kind === 'ruby' ? MAT.heartwood : MAT.leather, { rand }));
  parts.push(...grip(rand, -0.1, 4, 0.017));
  const pommel = new THREE.SphereGeometry(0.022, 8, 6);
  pommel.translate(0, -0.12, 0);
  parts.push(paint(pommel, guardCol, { rand }));
  if (kind === 'ruby') {
    const g = gem(0.016, 0, -0.125, 0, rand, 1, 1.2, 1);
    parts.push(g);
    glow.push(g);
  }
  return withGlow(merge(parts), glow);
}

function dagger(kind) {
  const rand = mulberry32(kind === 'flint' ? 331 : 332);
  const parts = [];
  const glow = [];
  if (kind === 'flint') {
    const blade = new THREE.OctahedronGeometry(0.035, 0);
    displace(blade, () => [(rand() - 0.5) * 0.008, (rand() - 0.5) * 0.01, (rand() - 0.5) * 0.004]);
    blade.scale(0.75, 4.2, 0.25);
    blade.translate(0, 0.17, 0);
    parts.push(paint(flatNormals(blade), MAT.flint, { rand, jitter: 0.22 }));
    parts.push(paint(limb(V(0, -0.08, 0), V(0, 0.05, 0), 0.016, 0.017, 6, true), MAT.wood, { rand }));
    parts.push(...grip(rand, -0.07, 4, 0.019));
  } else {
    // Verikide: yksi pitkä kide tummassa ydinpuukahvassa.
    const g = gem(0.03, 0, 0.17, 0, rand, 0.8, 4.4, 0.45);
    parts.push(g);
    glow.push(g);
    parts.push(paint(limb(V(0, -0.08, 0), V(0, 0.05, 0), 0.015, 0.018, 6, true), MAT.heartwood, { rand }));
    const ring = new THREE.TorusGeometry(0.02, 0.006, 5, 10);
    ring.rotateX(Math.PI / 2);
    ring.translate(0, 0.05, 0);
    parts.push(paint(ring, MAT.ironDark, { rand }));
  }
  return withGlow(merge(parts), glow);
}

// --- Murskaavat -----------------------------------------------------------------

function stoneMace() {
  const rand = mulberry32(341);
  const parts = [handle(rand, 0.46, MAT.wood, -0.16, 0.021)];
  let head = new THREE.DodecahedronGeometry(0.085, 0);
  displace(head, () => [(rand() - 0.5) * 0.025, (rand() - 0.5) * 0.025, (rand() - 0.5) * 0.025]);
  head.scale(1.1, 1.25, 1.05);
  head.translate(0, 0.5, 0);
  parts.push(paint(flatNormals(head), MAT.stone, { rand, jitter: 0.12 }));
  parts.push(band(0.43, 0.026, MAT.fiber, 0.05));
  parts.push(band(0.47, 0.03, MAT.fiber, 0.03));
  parts.push(...grip(rand, -0.13, 3, 0.024, MAT.fiber));
  return merge(parts);
}

function copperSledge() {
  const rand = mulberry32(342);
  const parts = [handle(rand, 0.74, MAT.hardwood, -0.3, 0.022)];
  const head = new THREE.BoxGeometry(0.26, 0.13, 0.13, 2, 1, 1);
  displace(head, () => [(rand() - 0.5) * 0.008, (rand() - 0.5) * 0.008, (rand() - 0.5) * 0.008]);
  head.translate(0, 0.76, 0);
  parts.push(paint(flatNormals(head), MAT.copper, { rand, jitter: 0.06, shade: metalShade }));
  for (const sx of [-1, 1]) {
    const face = new THREE.BoxGeometry(0.02, 0.145, 0.145);
    face.translate(sx * 0.135, 0.76, 0);
    parts.push(paint(flatNormals(face), MAT.copperDark, { rand }));
  }
  parts.push(...grip(rand, -0.28, 5, 0.025));
  return merge(parts);
}

function ironMace() {
  const rand = mulberry32(343);
  const parts = [handle(rand, 0.46, MAT.heartwood, -0.15, 0.02)];
  const ball = new THREE.IcosahedronGeometry(0.07, 1);
  ball.translate(0, 0.5, 0);
  parts.push(paint(flatNormals(ball), MAT.iron, { rand, jitter: 0.06, shade: metalShade }));
  const dirs = new THREE.IcosahedronGeometry(1, 0).attributes.position;
  const seen = new Set();
  for (let i = 0; i < dirs.count; i++) {
    const d = V(dirs.getX(i), dirs.getY(i), dirs.getZ(i)).normalize();
    const k = `${d.x.toFixed(2)},${d.y.toFixed(2)},${d.z.toFixed(2)}`;
    if (seen.has(k) || d.y < -0.6) continue;
    seen.add(k);
    const c = new THREE.ConeGeometry(0.016, 0.06, 5);
    c.translate(0, 0.08, 0);
    c.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d));
    c.translate(0, 0.5, 0);
    parts.push(paint(c, MAT.ironDark, { rand }));
  }
  parts.push(band(0.43, 0.026, MAT.ironDark, 0.04));
  parts.push(...grip(rand, -0.12, 4, 0.023));
  return merge(parts);
}

// --- Keihäät --------------------------------------------------------------------

function woodenSpear() {
  const rand = mulberry32(351);
  const parts = [paint(limb(V(0, -0.45, 0), V(0, 0.98, 0), 0.018, 0.016, 6, true), MAT.wood, { rand })];
  const tip = new THREE.ConeGeometry(0.016, 0.16, 6);
  tip.translate(0, 1.06, 0);
  // Tulessa karkaistu kärki: tumma.
  parts.push(paint(tip, 0x2e2118, { rand, shade: (x, y) => (y > 1.08 ? 0.7 : 1) }));
  return merge(parts);
}

function ironSpear() {
  const rand = mulberry32(352);
  const parts = [paint(limb(V(0, -0.45, 0), V(0, 0.98, 0), 0.017, 0.015, 6, true), MAT.hardwood, { rand })];
  const head = plate([[-0.014, 0.98], [0.014, 0.98], [0.034, 1.08], [0, 1.24], [-0.034, 1.08]], 0.01, 0.003);
  parts.push(paint(flatNormals(head), MAT.iron, { rand, jitter: 0.03, shade: (x) => (Math.abs(x) > 0.02 ? 1.25 : 0.9) }));
  parts.push(band(0.97, 0.02, MAT.ironDark, 0.05));
  parts.push(...grip(rand, 0.0, 4, 0.019));
  return merge(parts);
}

// --- Kilvet (XY-tasossa, etupuoli -Z, kahva origossa; kuten puukilpi) -----------

function roundShield(kind) {
  const rand = mulberry32(kind === 'hide' ? 361 : kind === 'copper' ? 362 : 363);
  const parts = [];
  const R = kind === 'iron' ? 0.31 : 0.29;
  const face = new THREE.CylinderGeometry(R, R, 0.026, 24, 1);
  face.rotateX(Math.PI / 2);
  const faceCol = kind === 'hide' ? 0xa07a50 : kind === 'copper' ? MAT.hardwood : MAT.iron;
  parts.push(paint(face, faceCol, { rand, jitter: kind === 'hide' ? 0.14 : 0.06, shade: kind === 'iron' ? metalShade : null }));
  const rimCol = kind === 'hide' ? MAT.leatherDark : kind === 'copper' ? MAT.copper : MAT.ironDark;
  const rim = new THREE.TorusGeometry(R - 0.004, kind === 'hide' ? 0.012 : 0.016, 5, 30);
  parts.push(paint(rim, rimCol, { rand, jitter: 0.08 }));
  const boss = new THREE.SphereGeometry(kind === 'hide' ? 0.05 : 0.065, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2);
  boss.rotateX(-Math.PI / 2);
  boss.translate(0, 0, -0.013);
  parts.push(paint(boss, kind === 'hide' ? MAT.wood : kind === 'copper' ? MAT.copper : MAT.ironDark, { rand, shade: kind === 'hide' ? null : metalShade }));
  if (kind === 'hide') {
    // Ompeleet ristiin.
    for (const a of [0, Math.PI / 2]) {
      const st = new THREE.BoxGeometry(R * 1.8, 0.008, 0.006);
      st.rotateZ(a);
      st.translate(0, 0, -0.015);
      parts.push(paint(st, MAT.fiber, { rand }));
    }
  } else {
    // Niitit kehällä; kuparikilvessä myös kuparivanteet puun päällä.
    const n = kind === 'iron' ? 14 : 10;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = new THREE.SphereGeometry(0.011, 6, 4);
      r.translate(Math.cos(a) * (R - 0.04), Math.sin(a) * (R - 0.04), -0.015);
      parts.push(paint(r, kind === 'copper' ? MAT.copperDark : 0xb5babf, { rand }));
    }
    if (kind === 'copper') {
      for (const y of [-0.12, 0.12]) {
        const b = new THREE.BoxGeometry(R * 1.75, 0.03, 0.01);
        b.translate(0, y, -0.015);
        parts.push(paint(b, MAT.copper, { rand, shade: metalShade }));
      }
    }
  }
  parts.push(paint(limb(V(-0.07, 0, 0.04), V(0.07, 0, 0.04), 0.012, 0.012, 6, true), MAT.leather, { rand }));
  for (const x of [-0.08, 0.08]) {
    const p = new THREE.BoxGeometry(0.02, 0.03, 0.035);
    p.translate(x, 0, 0.028);
    parts.push(paint(p, MAT.leatherDark, { rand }));
  }
  return merge(parts);
}

// --- Panssarit ------------------------------------------------------------------

function dome(r, col, rand, jitter = 0.08, shade = null, h = Math.PI / 2) {
  const g = new THREE.SphereGeometry(r, 14, 8, 0, Math.PI * 2, 0, h);
  return paint(g, col, { rand, jitter, shade });
}

function helmet(kind) {
  const rand = mulberry32(371 + kind.length * 7);
  const parts = [];
  const glow = [];
  if (kind === 'rag') {
    const g = dome(0.13, 0x8a6a4a, rand, 0.16);
    g.scale(1, 1.25, 1.05);
    parts.push(g);
    const tail = new THREE.ConeGeometry(0.07, 0.14, 7);
    tail.rotateX(-1.1);
    tail.translate(0, 0.04, 0.13);
    parts.push(paint(tail, 0x7a5c40, { rand, jitter: 0.15 }));
  } else if (kind === 'leather') {
    parts.push(dome(0.125, MAT.leather, rand, 0.1));
    parts.push(band(0.01, 0.128, MAT.leatherDark, 0.035));
  } else if (kind === 'bone') {
    parts.push(dome(0.128, MAT.bone, rand, 0.12, (x, y) => (y > 0.08 ? 1.05 : 0.88)));
    parts.push(band(0.01, 0.13, MAT.leather, 0.035));
    for (const sx of [-1, 1]) {
      parts.push(paint(limb(V(sx * 0.1, 0.07, 0), V(sx * 0.2, 0.2, -0.02), 0.022, 0.004, 6), MAT.bone, { rand }));
    }
  } else if (kind === 'copper') {
    parts.push(dome(0.13, MAT.copper, rand, 0.05, metalShade));
    parts.push(band(0.01, 0.135, MAT.copperDark, 0.03));
    const nose = new THREE.BoxGeometry(0.02, 0.1, 0.012);
    nose.translate(0, -0.02, -0.135);
    parts.push(paint(nose, MAT.copperDark, { rand }));
  } else if (kind === 'chain') {
    parts.push(dome(0.13, 0x9aa0a6, rand, 0.28));
    const hang = new THREE.CylinderGeometry(0.13, 0.15, 0.12, 14, 1, true);
    hang.translate(0, -0.06, 0);
    parts.push(paint(hang, 0x8c9298, { rand, jitter: 0.3 }));
  } else if (kind === 'iron') {
    parts.push(dome(0.13, MAT.iron, rand, 0.05, metalShade));
    const cyl = new THREE.CylinderGeometry(0.13, 0.13, 0.13, 14, 1, true);
    cyl.translate(0, -0.065, 0);
    parts.push(paint(cyl, MAT.iron, { rand, jitter: 0.05, shade: metalShade }));
    const slit = new THREE.BoxGeometry(0.16, 0.018, 0.02);
    slit.translate(0, -0.035, -0.125);
    parts.push(paint(slit, 0x15161a, { rand }));
    const ridge = new THREE.BoxGeometry(0.014, 0.02, 0.27);
    ridge.translate(0, 0.125, 0);
    parts.push(paint(ridge, MAT.ironDark, { rand }));
  } else {
    // Rubiiniotsaripa: kapea rengas ja kivi otsalla.
    const ring = new THREE.TorusGeometry(0.11, 0.014, 6, 28);
    ring.rotateX(Math.PI / 2);
    ring.scale(1, 2.2, 1);
    parts.push(paint(ring, MAT.ironDark, { rand, shade: metalShade }));
    const g = gem(0.036, 0, 0.015, -0.118, rand, 0.9, 1.3, 0.7);
    parts.push(g);
    glow.push(g);
  }
  return withGlow(merge(parts), glow);
}

function torso(kind) {
  const rand = mulberry32(381 + kind.length * 5);
  const parts = [];
  const col = { rag: 0x8a6a4a, leather: MAT.leather, copper: MAT.copper, chain: 0x949aa0, iron: MAT.iron }[kind];
  const jit = kind === 'chain' ? 0.3 : kind === 'rag' ? 0.18 : 0.07;
  // Paita: rinnasta levenevä vartalo, umpinainen yläosa ja kaula-aukko.
  const body = new THREE.CylinderGeometry(0.175, 0.14, 0.32, 16, 3, false);
  body.scale(1, 1, 0.6);
  body.translate(0, 0.16, 0);
  parts.push(paint(body, col, { rand, jitter: jit, shade: kind === 'iron' || kind === 'copper' ? metalShade : (x, y) => (y > 0.3 ? 1.08 : 1) }));
  const neck = new THREE.CylinderGeometry(0.055, 0.055, 0.01, 12);
  neck.scale(1, 1, 0.8);
  neck.translate(0, 0.322, 0);
  parts.push(paint(neck, 0x1e1a16, { rand }));
  for (const sx of [-1, 1]) {
    const sh = new THREE.SphereGeometry(0.075, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2);
    sh.scale(1.15, 0.6, 0.85);
    sh.translate(sx * 0.15, 0.3, 0);
    parts.push(paint(sh, kind === 'iron' ? MAT.ironDark : kind === 'copper' ? MAT.copperDark : col, { rand, jitter: jit }));
    // Lyhyet hihat
    parts.push(paint(limb(V(sx * 0.16, 0.29, 0), V(sx * 0.25, 0.17, 0), 0.055, 0.048, 10, true), col, { rand, jitter: jit }));
  }
  if (kind === 'copper') {
    // Suomurivit.
    for (let r = 0; r < 4; r++) {
      const ring = new THREE.CylinderGeometry(0.163 - r * 0.006, 0.158 - r * 0.006, 0.012, 14, 1, true);
      ring.scale(1, 1, 0.64);
      ring.translate(0, 0.07 + r * 0.065, 0);
      parts.push(paint(ring, MAT.copperDark, { rand, jitter: 0.08 }));
    }
  } else if (kind === 'iron') {
    const plateF = new THREE.BoxGeometry(0.18, 0.2, 0.02);
    plateF.translate(0, 0.19, -0.098);
    parts.push(paint(flatNormals(plateF), MAT.iron, { rand, shade: metalShade }));
  } else if (kind === 'leather') {
    for (let i = 0; i < 6; i++) {
      const rv = new THREE.SphereGeometry(0.008, 5, 4);
      rv.translate(-0.06 + (i % 3) * 0.06, 0.12 + Math.floor(i / 3) * 0.1, -0.1);
      parts.push(paint(rv, 0xc8a050, { rand }));
    }
  }
  const belt = new THREE.CylinderGeometry(0.137, 0.137, 0.035, 14, 1, true);
  belt.scale(1, 1, 0.64);
  belt.translate(0, 0.03, 0);
  parts.push(paint(belt, kind === 'rag' ? MAT.fiber : MAT.leatherDark, { rand }));
  return merge(parts);
}

function legs(kind) {
  const rand = mulberry32(391 + kind.length * 3);
  const parts = [];
  const col = { rag: 0x7a5c40, leather: MAT.leather, chain: 0x949aa0 }[kind];
  const jit = kind === 'chain' ? 0.3 : kind === 'rag' ? 0.2 : 0.08;
  for (const sx of [-1, 1]) {
    parts.push(paint(limb(V(sx * 0.055, 0.3, 0), V(sx * 0.07, -0.05, 0), 0.06, 0.045, 10, true, 3), col, { rand, jitter: jit }));
    if (kind === 'rag') {
      // Kääreiden sidokset.
      for (let i = 0; i < 3; i++) {
        const w = new THREE.CylinderGeometry(0.056 + i * 0.004, 0.056 + i * 0.004, 0.018, 10, 1, true);
        w.translate(sx * (0.068 - i * 0.004), 0.02 + i * 0.1, 0);
        parts.push(paint(w, MAT.fiber, { rand }));
      }
    }
  }
  const hip = new THREE.CylinderGeometry(0.12, 0.12, 0.06, 12, 1, false);
  hip.scale(1, 1, 0.7);
  hip.translate(0, 0.3, 0);
  parts.push(paint(hip, kind === 'chain' ? MAT.leatherDark : col, { rand, jitter: jit }));
  return merge(parts);
}

// --- Materiaalit ----------------------------------------------------------------

function woodPiece(bark, inner, seed) {
  const rand = mulberry32(seed);
  let g = new THREE.CylinderGeometry(0.08, 0.085, 0.42, 9);
  g.translate(0, 0.12, 0);
  g = flatNormals(g);
  const pos = g.attributes.position;
  const nrm = g.attributes.normal;
  const colors = new Float32Array(pos.count * 3);
  const b = new THREE.Color(bark);
  const e = new THREE.Color(inner);
  for (let i = 0; i < pos.count; i += 3) {
    const c = Math.abs(nrm.getY(i)) > 0.9 ? e : b;
    const j = 0.9 + rand() * 0.2;
    for (let k = 0; k < 3; k++) colors.set([c.r * j, c.g * j, c.b * j], (i + k) * 3);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  return merge([g]);
}

function ingot(col, dark, seed) {
  const rand = mulberry32(seed);
  const parts = [];
  for (let i = 0; i < 2; i++) {
    const g = new THREE.CylinderGeometry(0.05, 0.068, 0.045, 4, 1);
    g.rotateY(Math.PI / 4);
    g.scale(2.1, 1, 0.9);
    g.translate(0, 0.023 + i * 0.047, i * 0.012);
    if (i) g.rotateY(0.25);
    parts.push(paint(flatNormals(g), i ? col : dark, { rand, jitter: 0.06, shade: (x, y) => (y > 0.04 + i * 0.045 ? 1.25 : 0.9) }));
  }
  return merge(parts);
}

function rubyGem() {
  const rand = mulberry32(401);
  const g = gem(0.05, 0, 0.06, 0, rand, 1, 1.3, 1);
  return withGlow(merge([g]), [g]);
}

function ironRings() {
  const rand = mulberry32(402);
  const parts = [];
  for (let i = 0; i < 7; i++) {
    const r = new THREE.TorusGeometry(0.022, 0.0045, 4, 10);
    r.rotateX(Math.PI / 2 + (rand() - 0.5) * 1.2);
    r.rotateZ((rand() - 0.5) * 1.2);
    r.translate((rand() - 0.5) * 0.09, 0.01 + rand() * 0.04, (rand() - 0.5) * 0.09);
    parts.push(paint(r, MAT.iron, { rand, jitter: 0.1 }));
  }
  return merge(parts);
}

export function createItemModels3() {
  return {
    hardwood: woodPiece(0x2f2017, 0x6a4430, 411),
    heartwood: woodPiece(0x5a3d2a, 0x9a3a22, 412),
    copper_ingot: ingot(MAT.copper, MAT.copperDark, 413),
    iron_ingot: ingot(MAT.iron, MAT.ironDark, 414),
    ruby: rubyGem(),
    iron_rings: ironRings(),
    copper_axe: axe('copper'),
    iron_axe: axe('iron'),
    ruby_axe: axe('ruby'),
    copper_pick: pick('copper'),
    iron_pick: pick('iron'),
    ruby_pick: pick('ruby'),
    flint_dagger: dagger('flint'),
    ruby_dagger: dagger('ruby'),
    copper_sword: sword('copper'),
    iron_sword: sword('iron'),
    ruby_sword: sword('ruby'),
    stone_mace: stoneMace(),
    copper_sledge: copperSledge(),
    iron_mace: ironMace(),
    wooden_spear: woodenSpear(),
    iron_spear: ironSpear(),
    hide_shield: roundShield('hide'),
    copper_shield: roundShield('copper'),
    iron_shield: roundShield('iron'),
    rag_hood: helmet('rag'),
    leather_cap: helmet('leather'),
    bone_helm: helmet('bone'),
    copper_helm: helmet('copper'),
    chain_coif: helmet('chain'),
    iron_helm: helmet('iron'),
    ruby_circlet: helmet('ruby'),
    rag_tunic: torso('rag'),
    leather_vest: torso('leather'),
    copper_scale: torso('copper'),
    chainmail: torso('chain'),
    iron_plate: torso('iron'),
    rag_wraps: legs('rag'),
    leather_pants: legs('leather'),
    chain_legs: legs('chain'),
  };
}
