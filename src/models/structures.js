// Rakennelmien mallit: kivikehät, hylätyt leirit sekä talojen ja kylien rauniot.
// buildStructure(st) palauttaa yhdistetyn geometrian (paikalliset koordinaatit,
// maa y = 0), törmäysalueet ja arkun paikan. Kaikki arvotaan st.seed:stä.
import * as THREE from 'three';
import { mulberry32 } from '../noise.js';
import { V, displace, paint, limb, flatNormals, merge, prep } from './util.js';

const STYLE = {
  mud: { wall: [0xb27a4c, 0x9c6a42, 0xc08a5a], trim: 0x7a5232, roof: 0xb89a5a, rubble: 0x9a6a44 },
  stone: { wall: [0x8a7f72, 0x776d62, 0x9a8e80], trim: 0x5e564c, roof: 0x7a6a4a, rubble: 0x80766a },
  jungle: { wall: [0x8a7a5e, 0x6f6a4e, 0x7c7458], trim: 0x4a5a2a, roof: 0x5a6a3a, rubble: 0x6a6a4a, moss: 0x4f6e30 },
};

function box(cx, cy, cz, sx, sy, sz, rotY = 0) {
  const g = new THREE.BoxGeometry(sx, sy, sz);
  g.rotateY(rotY);
  g.translate(cx, cy, cz);
  return g;
}

// Raunioitunut seinä pisteestä a pisteeseen b: palat eri korkuisia, välillä aukkoja.
function ruinedWall(out, colliders, a, b, H, thick, style, rand, gaps = []) {
  const dx = b.x - a.x, dz = b.z - a.z;
  const len = Math.hypot(dx, dz);
  const ang = Math.atan2(dz, dx);
  const n = Math.max(2, Math.round(len / 0.9));
  let segStart = null;
  for (let i = 0; i < n; i++) {
    const t0 = i / n, t1 = (i + 1) / n;
    const mid = (t0 + t1) / 2;
    const inGap = gaps.some(([g0, g1]) => mid > g0 && mid < g1);
    const crumble = rand() < 0.12;
    if (inGap || crumble) {
      if (segStart !== null) { pushSeg(colliders, a, dx, dz, segStart, t0, thick, H); segStart = null; }
      if (crumble && !inGap) out.push(paint(box(a.x + dx * mid, 0.15, a.z + dz * mid, len / n * 0.9, 0.3, thick, -ang), style.rubble, { rand }));
      continue;
    }
    if (segStart === null) segStart = t0;
    const h = H * (0.35 + rand() * 0.65);
    const col = style.wall[Math.floor(rand() * style.wall.length)];
    out.push(paint(box(a.x + dx * mid, h / 2 - 0.1, a.z + dz * mid, len / n + 0.02, h + 0.2, thick, -ang), col, { rand, jitter: 0.06 }));
    if (style.moss && rand() < 0.35) {
      out.push(paint(box(a.x + dx * mid, h - 0.05, a.z + dz * mid, len / n * 0.8, 0.12, thick + 0.06, -ang), style.moss, { rand }));
    }
  }
  if (segStart !== null) pushSeg(colliders, a, dx, dz, segStart, 1, thick, H);
}

function pushSeg(colliders, a, dx, dz, t0, t1, thick, H) {
  colliders.push({ seg: true, ax: a.x + dx * t0, az: a.z + dz * t0, bx: a.x + dx * t1, bz: a.z + dz * t1, r: thick / 2 + 0.05, top: H * 0.5 });
}

function rubblePile(out, cx, cz, n, style, rand) {
  for (let i = 0; i < n; i++) {
    const s = 0.2 + rand() * 0.35;
    const g = box(cx + (rand() - 0.5) * 1.6, s / 2 - 0.05, cz + (rand() - 0.5) * 1.6, s * 1.4, s, s, rand() * 3);
    out.push(paint(g, style.rubble, { rand, jitter: 0.12 }));
  }
}

// Suorakaiteen muotoinen talon raunio. ox, oz = keskipiste, rot = kierto.
function house(out, colliders, ox, oz, rot, style, rand, chestSpot) {
  const w = 3.6 + rand() * 2.2;
  const d = 3.4 + rand() * 2;
  const H = 2.2 + rand() * 0.8;
  const c = Math.cos(rot), s = Math.sin(rot);
  const P = (x, z) => V(ox + x * c - z * s, 0, oz + x * s + z * c);
  const corners = [P(-w / 2, -d / 2), P(w / 2, -d / 2), P(w / 2, d / 2), P(-w / 2, d / 2)];
  const doorSide = Math.floor(rand() * 4);
  for (let i = 0; i < 4; i++) {
    const gaps = [];
    if (i === doorSide) { const g = 0.35 + rand() * 0.3; gaps.push([g, g + 0.28]); }
    else if (rand() < 0.5) { const g = 0.3 + rand() * 0.4; gaps.push([g, g + 0.12]); }
    ruinedWall(out, colliders, corners[i], corners[(i + 1) % 4], H, 0.35, style, rand, gaps);
  }
  // Kaatuneet kattopalkit
  for (let i = 0; i < 2 + Math.floor(rand() * 2); i++) {
    const a = P((rand() - 0.5) * w * 0.8, (rand() - 0.5) * d * 0.8);
    const b = P((rand() - 0.5) * w * 0.8, (rand() - 0.5) * d * 0.8);
    a.y = 0.1; b.y = 0.4 + rand() * 1.2;
    out.push(paint(limb(a, b, 0.07, 0.06, 5, true), style.trim, { rand }));
  }
  rubblePile(out, P((rand() - 0.5) * w * 0.5, (rand() - 0.5) * d * 0.5).x, P(0, 0).z + (rand() - 0.5), 4, style, rand);
  if (chestSpot) chestSpot.push({ x: P(-w / 2 + 0.7, -d / 2 + 0.7).x, z: P(-w / 2 + 0.7, -d / 2 + 0.7).z, rot: rot + Math.PI / 4 });
}

// Pyöreä vilja-aitta / maja: matala pyöreä seinä ja rikkinäinen kartiokatto.
function granary(out, colliders, ox, oz, style, rand) {
  const R = 1.2 + rand() * 0.6;
  const H = 1.6 + rand() * 0.6;
  const n = 10;
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    pts.push(V(ox + Math.cos(a) * R, 0, oz + Math.sin(a) * R));
  }
  for (let i = 0; i < n; i++) {
    if (rand() < 0.15) continue;
    ruinedWall(out, [], pts[i], pts[i + 1], H, 0.25, style, rand);
  }
  colliders.push({ x: ox, z: oz, r: R + 0.15 });
  if (rand() < 0.6) {
    let roof = new THREE.ConeGeometry(R * 1.35, R * 1.4, 9, 1, true);
    const jr = mulberry32(Math.floor(rand() * 1e9));
    displace(roof, () => [(jr() - 0.5) * 0.15, (jr() - 0.5) * 0.15, (jr() - 0.5) * 0.15]);
    roof = prep(roof);
    // Poista osa kolmioista (reikäinen olkikatto)
    const pos = roof.attributes.position.array;
    const keep = [];
    for (let t = 0; t < pos.length; t += 9) if (jr() > 0.3) keep.push(...pos.slice(t, t + 9));
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(keep, 3));
    g.computeVertexNormals();
    const tilt = (rand() - 0.5) * 0.6;
    g.rotateZ(tilt);
    g.translate(ox, H * (0.7 + rand() * 0.2) + R * 0.5, oz);
    out.push(paint(g, style.roof, { rand, jitter: 0.15 }));
  }
}

function stoneCircle(out, colliders, rand, chestSpot) {
  const n = 9 + Math.floor(rand() * 6);
  const R = 3.8 + rand() * 2;
  const lat = [0x9a5a36, 0x8a4e30, 0xa8663e];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + (rand() - 0.5) * 0.15;
    const x = Math.cos(a) * R, z = Math.sin(a) * R;
    const h = 1.0 + rand() * 1.4;
    const w = 0.45 + rand() * 0.2;
    let g = new THREE.CylinderGeometry(w * 0.75, w, h, 6, 2);
    const jr = mulberry32(Math.floor(rand() * 1e9));
    displace(g, () => [(jr() - 0.5) * 0.08, (jr() - 0.5) * 0.06, (jr() - 0.5) * 0.08]);
    const fallen = rand() < 0.18;
    if (fallen) {
      g.rotateZ(Math.PI / 2);
      g.rotateY(-a + (rand() - 0.5));
      g.translate(x, w * 0.8, z);
    } else {
      g.rotateX((rand() - 0.5) * 0.18);
      g.rotateZ((rand() - 0.5) * 0.18);
      g.translate(x, h / 2 - 0.2, z);
      colliders.push({ x, z, r: w + 0.05 });
    }
    out.push(paint(flatNormals(g), lat[Math.floor(rand() * 3)], { rand: jr, jitter: 0.1, shade: (px, py) => 0.85 + Math.min(0.25, py * 0.12) }));
  }
  // Keskikivi (alttari)
  let altar = new THREE.CylinderGeometry(0.9, 1.0, 0.45, 7);
  altar.translate(0, 0.15, 0);
  out.push(paint(flatNormals(altar), 0x8a5a3a, { rand }));
  colliders.push({ x: 0, z: 0, r: 0.95 });
  if (chestSpot) chestSpot.push({ x: 1.6, z: 0.4, rot: Math.PI / 2 });
}

function tent(out, colliders, ox, oz, rot, rand) {
  const w = 3 + rand() * 1.5, d = 2.4 + rand() * 1;
  const c = Math.cos(rot), s = Math.sin(rot);
  const P = (x, y, z) => V(ox + x * c - z * s, y, oz + x * s + z * c);
  const poles = [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2], [0, -d / 2], [0, d / 2]];
  const hp = 1.3 + rand() * 0.4;
  for (const [x, z] of poles) {
    const lean = (rand() - 0.5) * 0.25;
    const broken = rand() < 0.2;
    out.push(paint(limb(P(x, 0, z), P(x + lean, broken ? hp * 0.5 : hp + (x === 0 ? 0.35 : 0), z + lean), 0.04, 0.035, 5, true), 0x6a4a2c, { rand }));
  }
  // Repeytynyt nahka-/kangaskatto (roikkuva verkko, osa paloista puuttuu)
  const nx = 6, nz = 4;
  const pos = [];
  const cols = [];
  const cloth = [new THREE.Color(0x8a5a3a), new THREE.Color(0x6e4a32), new THREE.Color(0xa87a50), new THREE.Color(0x5a3a5a)];
  const yAt = (u, v) => hp + 0.35 * (1 - Math.abs(u - 0.5) * 2) - Math.sin(u * Math.PI * 2) * 0.05 - Math.sin(v * Math.PI) * 0.12 - (rand() * 0.05);
  for (let i = 0; i < nx; i++) {
    for (let j = 0; j < nz; j++) {
      if (rand() < 0.16) continue;
      const u0 = i / nx, u1 = (i + 1) / nx, v0 = j / nz, v1 = (j + 1) / nz;
      const q = [[u0, v0], [u1, v0], [u1, v1], [u0, v1]].map(([u, v]) => P((u - 0.5) * w, yAt(u, v), (v - 0.5) * d));
      const col = cloth[(i + (j % 2)) % 2 === 0 ? 0 : (j % 3 === 0 ? 3 : 1)];
      for (const tri of [[0, 1, 2], [0, 2, 3], [0, 2, 1], [0, 3, 2]]) {
        for (const k of tri) { pos.push(q[k].x, q[k].y, q[k].z); cols.push(col.r, col.g, col.b); }
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  g.computeVertexNormals();
  out.push(g);
  colliders.push({ x: ox, z: oz, r: Math.min(w, d) * 0.3 });
}

function camp(out, colliders, rand, chestSpot) {
  const nt = 2 + Math.floor(rand() * 2);
  for (let i = 0; i < nt; i++) {
    const a = (i / nt) * Math.PI * 2 + rand() * 0.5;
    tent(out, colliders, Math.cos(a) * 5, Math.sin(a) * 5, a + Math.PI / 2, rand);
  }
  // Nuotiopaikka
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    let st = new THREE.DodecahedronGeometry(0.15, 0);
    st.translate(Math.cos(a) * 0.55, 0.05, Math.sin(a) * 0.55);
    out.push(paint(flatNormals(st), 0x6a625a, { rand }));
  }
  const ash = new THREE.CylinderGeometry(0.42, 0.46, 0.05, 10);
  out.push(paint(ash, 0x2e2925, { rand, jitter: 0.25 }));
  // Saviruukut
  for (let i = 0; i < 3 + Math.floor(rand() * 3); i++) {
    const prof = [[0.01, 0], [0.18, 0.04], [0.24, 0.2], [0.16, 0.4], [0.1, 0.46], [0.12, 0.5]].map(([r, y]) => new THREE.Vector2(r, y));
    const pot = new THREE.LatheGeometry(prof, 8);
    const a = rand() * Math.PI * 2;
    const r = 1.5 + rand() * 2;
    if (rand() < 0.3) { pot.rotateZ(Math.PI / 2); pot.translate(0, 0.2, 0); }
    pot.translate(Math.cos(a) * r, 0, Math.sin(a) * r);
    out.push(paint(pot, rand() < 0.5 ? 0xa0603a : 0x8a5030, { rand }));
  }
  if (chestSpot) chestSpot.push({ x: 1.6, z: -1.8, rot: rand() * 6 });
}

// Laivanhylky: kyljelleen kallistunut, puoliksi hiekkaan uponnut runko.
// Kuori on yhtenäinen lankkupinta, josta puuttuu paloja (kaaret näkyvät
// aukoista); lisäksi köli, keula- ja peräpiikit, katkennut masto, purjeen
// riekale ja tavaraa hiekalla. Runko on x-akselin suuntainen; avoin kansi
// kääntyy +z:n suuntaan.
function shipwreck(out, colliders, rand, chestSpot) {
  const L = 12 + rand() * 3;           // pituus
  const B = 2.3 + rand() * 0.3;        // puolileveys
  const H = 2.5;                       // syvyys
  const roll = 0.3 + rand() * 0.15;    // kallistus
  const sink = 0.35;
  const nI = 14, nK = 8;
  const hull = [];
  // Rungon pinta: asemat i (pituussuunta) ja k (laidasta kölin kautta laitaan).
  const P = [];
  for (let i = 0; i <= nI; i++) {
    const t = i / nI;
    const x = (t - 0.5) * L;
    const end = 1 - Math.sin(Math.PI * t);
    const w = B * Math.pow(Math.sin(Math.PI * (0.04 + t * 0.92)), 0.6) + 0.04;
    const keelY = 0.55 * end * end;
    const top = H + 0.7 * Math.pow(end, 1.5);
    const row = [];
    for (let k = 0; k <= nK; k++) {
      const a = (k / nK - 0.5) * Math.PI;
      row.push([x, keelY + (top - keelY) * Math.pow(1 - Math.cos(a), 0.85), Math.sin(a) * w]);
    }
    P.push(row);
  }
  // Iso murtuma ylemmässä kyljessä ja pienempiä aukkoja.
  const bi = 3 + Math.floor(rand() * (nI - 7)), bk = 1 + Math.floor(rand() * 2);
  const plank = [0x6b5038, 0x5d4530, 0x735a40];
  for (let k = 0; k < nK; k++) {
    const pos = [];
    for (let i = 0; i < nI; i++) {
      const hole = (Math.abs(i - bi) <= 1 + (k === bk ? 1 : 0) && Math.abs(k - bk) <= 1) || rand() < (k < nK / 2 ? 0.16 : 0.05);
      if (hole) continue;
      const q = [P[i][k], P[i + 1][k], P[i + 1][k + 1], P[i][k + 1]];
      // Molemmat puolet (materiaali on yksipuolinen).
      for (const [p0, p1, p2] of [[q[0], q[1], q[2]], [q[0], q[2], q[3]], [q[0], q[2], q[1]], [q[0], q[3], q[2]]]) pos.push(...p0, ...p1, ...p2);
    }
    if (!pos.length) continue;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.computeVertexNormals();
    hull.push(paint(g, plank[k % 3], { rand, jitter: 0.14 }));
  }
  // Kaaret sisäpuolella (näkyvät aukoista) ja reunalista
  for (let i = 1; i < nI; i += 2) {
    const kEnd = rand() < 0.3 ? nK - 2 : nK;
    for (let k = 0; k < kEnd; k++) {
      const a = P[i][k], c = P[i][k + 1];
      hull.push(paint(limb(V(a[0], a[1] * 0.96 + 0.05, a[2] * 0.93), V(c[0], c[1] * 0.96 + 0.05, c[2] * 0.93), 0.09, 0.09, 5, true), 0x4a3624, { rand }));
    }
  }
  for (const k of [0, nK]) {
    for (let i = 0; i < nI; i++) {
      if (k === 0 && Math.abs(i - bi) <= 1) continue;
      const a = P[i][k], c = P[i + 1][k];
      hull.push(paint(limb(V(...a), V(...c), 0.1, 0.1, 5, true), 0x4a3624, { rand }));
    }
  }
  // Köli sekä keula- ja peräpiikit
  hull.push(paint(box(0, 0.05, 0, L * 0.92, 0.3, 0.34), 0x3f2e20, { rand }));
  hull.push(paint(limb(V(L * 0.46, 0.1, 0), V(L * 0.5 + 1.2, H + 1.4, 0), 0.17, 0.1, 6, true), 0x3f2e20, { rand }));
  hull.push(paint(limb(V(-L * 0.46, 0.1, 0), V(-L * 0.5 - 0.4, H + 1.0, 0), 0.2, 0.15, 6, true), 0x3f2e20, { rand }));
  // Kannen palkit (osa katkennut) ja maston tynkä
  for (const t of [0.3, 0.55, 0.75]) {
    const i = Math.round(t * nI);
    const a = P[i][0], c = P[i][nK];
    const half = rand() < 0.4;
    hull.push(paint(limb(V(a[0], a[1] - 0.2, a[2] * 0.95), V(c[0], c[1] - 0.2, half ? 0 : c[2] * 0.95), 0.1, 0.1, 5, true), 0x4e3a28, { rand }));
  }
  hull.push(paint(limb(V(-0.4, 0.2, 0), V(-0.6, H + 2.6, 0.3), 0.2, 0.17, 7, true), 0x56402c, { rand }));
  // Runko kallistuu (laita k = 0 nousee) ja uppoaa hiekkaan.
  for (const g of hull) {
    g.rotateX(roll);
    g.translate(0, -sink, 0);
    out.push(g);
  }
  // Katkennut maston yläosa ja purjeen riekale kölin puolella hiekalla
  const mx = (rand() - 0.5) * 3, mz = -2.8 - rand() * 0.8;
  const mAng = -0.25 - rand() * 0.4;
  const mL = 6 + rand() * 2;
  out.push(paint(limb(V(mx, 0.15, mz), V(mx + Math.cos(mAng) * mL, 0.24, mz + Math.sin(mAng) * mL), 0.17, 0.12, 7, true), 0x56402c, { rand }));
  const sail = new THREE.BoxGeometry(2.8, 0.03, 1.9, 5, 1, 3);
  displace(sail, () => [(rand() - 0.5) * 0.25, rand() * 0.15, (rand() - 0.5) * 0.25]);
  sail.rotateY(-mAng);
  sail.translate(mx + Math.cos(mAng) * mL * 0.55, 0.12, mz + Math.sin(mAng) * mL * 0.55 - 1.2);
  out.push(paint(sail, 0xc8b894, { rand, jitter: 0.1 }));
  // Tynnyreitä ja laudanpaloja hiekalla rungon molemmin puolin
  const side = () => (rand() < 0.5 ? -1 : 1);
  for (let i = 0, n = 2 + Math.floor(rand() * 3); i < n; i++) {
    const x = (rand() - 0.5) * L, z = side() > 0 ? 4.2 + rand() * 2 : -2.6 - rand() * 2;
    const br = new THREE.CylinderGeometry(0.32, 0.32, 0.8, 10);
    if (rand() < 0.6) { br.rotateZ(Math.PI / 2); br.translate(0, -0.08, 0); }
    br.rotateY(rand() * 3);
    br.translate(x, 0.33, z);
    out.push(paint(br, 0x6a4a2c, { rand, jitter: 0.1 }));
    colliders.push({ x, z, r: 0.4 });
  }
  for (let i = 0; i < 8; i++) {
    const x = (rand() - 0.5) * (L + 4), z = side() > 0 ? 4 + rand() * 4 : -2.4 - rand() * 4;
    out.push(paint(box(x, 0.03, z, 1 + rand() * 1.4, 0.06, 0.22, rand() * 3), 0x5d4530, { rand }));
  }
  // Runko on kiinteä este (kallistuneen rungon jalanjälki z ≈ −1,2…3,2).
  colliders.push({ seg: true, ax: -L * 0.42, az: 1.0, bx: L * 0.42, bz: 1.0, r: 2.0, top: 2.6 });
  if (chestSpot) chestSpot.push({ x: (rand() - 0.5) * L * 0.5, z: 4.6, rot: rand() * 0.6 - 0.3 });
}

export function buildStructure(st) {
  const rand = mulberry32(st.seed);
  const style = STYLE[st.style] || STYLE.mud;
  const out = [];
  const colliders = [];
  const chestSpot = st.chest ? [] : null;
  if (st.type === 'stoneCircle') {
    stoneCircle(out, colliders, rand, chestSpot);
  } else if (st.type === 'camp') {
    camp(out, colliders, rand, chestSpot);
  } else if (st.type === 'ruinHouse') {
    house(out, colliders, 0, 0, 0, style, rand, chestSpot);
  } else if (st.type === 'shipwreck') {
    shipwreck(out, colliders, rand, chestSpot);
  } else {
    // Kylä: muutama talo ja aitta keskusaukion ympärillä, matala aita.
    const nh = 3 + Math.floor(rand() * 3);
    const chestHouse = Math.floor(rand() * nh);
    for (let i = 0; i < nh; i++) {
      const a = (i / nh) * Math.PI * 2 + rand() * 0.4;
      const r = 8 + rand() * 5;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (rand() < 0.35) granary(out, colliders, x, z, style, rand);
      else house(out, colliders, x, z, a + Math.PI / 2, style, rand, i === chestHouse ? chestSpot : null);
    }
    // Kaivo keskellä
    const well = new THREE.CylinderGeometry(0.9, 1.0, 0.7, 10, 1, true);
    well.translate(0, 0.3, 0);
    out.push(paint(well, style.wall[1], { rand }));
    colliders.push({ x: 0, z: 0, r: 1.05 });
    // Aidan pätkiä
    for (let i = 0; i < 5; i++) {
      const a0 = rand() * Math.PI * 2;
      const a1 = a0 + 0.3 + rand() * 0.4;
      ruinedWall(out, colliders, V(Math.cos(a0) * 17, 0, Math.sin(a0) * 17), V(Math.cos(a1) * 17, 0, Math.sin(a1) * 17), 1.0, 0.3, style, rand);
    }
    if (chestSpot && !chestSpot.length) chestSpot.push({ x: 2, z: 1, rot: 0 });
  }
  // Viidakkoraunioihin roikkuvia köynnöksiä
  if (st.style === 'jungle') {
    for (let i = 0; i < 6; i++) {
      const x = (rand() - 0.5) * st.radius, z = (rand() - 0.5) * st.radius;
      out.push(paint(limb(V(x, 0, z), V(x + (rand() - 0.5), 1.2 + rand() * 1.5, z + (rand() - 0.5)), 0.03, 0.02, 3), 0x3e5a24, { rand }));
    }
  }
  const geometry = merge(out);
  return { geometry, colliders, chest: chestSpot && chestSpot[0] ? chestSpot[0] : null };
}

// Arkku: runko ja kansi erikseen (kansi aukeaa saranan ympäri).
export function makeChestModels() {
  const rand = mulberry32(77);
  const wood = 0x6a4a2c, band = 0x4a4642;
  const body = merge([
    paint(box(0, 0.22, 0, 0.9, 0.44, 0.55), wood, { rand, jitter: 0.06 }),
    paint(box(-0.3, 0.22, 0, 0.06, 0.46, 0.57), band, { rand }),
    paint(box(0.3, 0.22, 0, 0.06, 0.46, 0.57), band, { rand }),
  ]);
  // Kansi: sarana takareunassa (z = -0.275), joten geometria siirretään sen mukaan.
  const lid = merge([
    paint(box(0, 0.08, 0.275, 0.92, 0.16, 0.57), 0x75532f, { rand, jitter: 0.06 }),
    paint(box(-0.3, 0.09, 0.275, 0.065, 0.18, 0.59), band, { rand }),
    paint(box(0.3, 0.09, 0.275, 0.065, 0.18, 0.59), band, { rand }),
    paint(box(0, 0.02, 0.57, 0.12, 0.14, 0.04), 0xb08a3a, { rand }),
  ]);
  return { body, lid };
}
