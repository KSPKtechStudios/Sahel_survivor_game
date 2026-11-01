// Sessio 52: leopardi (käyttäjän antama malli: Sketchfab "Prowling Leopard 3D
// Model Free", iRahulRajput, CC-BY-4.0; assets/models/leopard/leopard.glb).
// Alkuperäinen malli oli staattinen (ei luurankoa eikä animaatioita, 232 000
// kolmiota). Tiedosto on kevennetty (11 000 kolmiota, irralliset viikset pois),
// käännetty katsomaan +Z-suuntaan ja skaalattu metreiksi (kuonosta lantioon
// 1,4 m, säkä n. 0,7 m).
//
// Luuranko ja painot rakennetaan latauksessa (kuten norsulla):
//  - nivelten paikat on mitattu mallista (malli on hiipivässä käyntiasennossa);
//    kyynär- ja polvinivel lasketaan luiden pituuksista,
//  - oikea etutassu on lähdemallissa käpristynyt ja sulautunut vasemman
//    ranteen taakse, joten oikean etujalan alaosa korvataan vasemman
//    peilikuvalla (fixRightPaw),
//  - jalat erotellaan pintaa pitkin etenevällä täytöllä, häntä etäisyydellä
//    hännän kärjestä,
//  - jokainen verteksi saa lähimmän sallitun luun, ja painot pehmennetään
//    pintaa pitkin (nivelten taitteet; eri jalkojen väliltä ei pehmennetä).
// Animaatio (animateLeopard) on proseduraalinen: askellus ja jalkojen IK,
// selän taivutus, pää ja häntä (ks. alempana).
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';

const URL = 'assets/models/leopard/leopard.glb';
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// Nivelet (metreinä, mallin koordinaatit: +Z eteen, +X vasemmalle, y maasta).
const J = {
  root: V(-0.01, 0.52, -0.5), // lantio (lonkkanivelten kohta)
  spine1: V(-0.02, 0.56, -0.25),
  spine2: V(-0.03, 0.57, 0.0),
  chest: V(-0.04, 0.57, 0.2), // lapojen välissä
  neck: V(-0.03, 0.57, 0.34),
  head: V(0.0, 0.6, 0.45), // kallon tyvi
  nose: V(0.01, 0.52, 0.7),
  rump: V(-0.02, 0.58, -0.66),
  tail: [V(-0.03, 0.59, -0.58), V(-0.035, 0.56, -0.65), V(-0.04, 0.61, -0.72), V(-0.04, 0.7, -0.79), V(-0.045, 0.8, -0.82), V(-0.05, 0.9, -0.78), V(-0.056, 0.98, -0.725)],
};
// Jalat: lapa (vain etujalat), olka/lonkka, ranne/kinner, päkiä ja varpaiden kärki.
const LEGS = [
  { name: 'LF', front: true, side: 1, scap: V(0.03, 0.66, 0.16), top: V(0.07, 0.46, 0.25), low: V(0.035, 0.085, 0.355), ball: V(0.035, 0.035, 0.4), toe: V(0.035, 0.022, 0.445) },
  { name: 'RF', front: true, side: -1, scap: V(-0.11, 0.66, 0.08), top: V(-0.15, 0.46, 0.17), low: V(-0.1, 0.15, 0.37), ball: V(-0.075, 0.075, 0.385), toe: V(-0.06, 0.035, 0.39) },
  { name: 'LH', front: false, side: 1, top: V(0.06, 0.5, -0.5), low: V(0.07, 0.185, -0.665), ball: V(0.075, 0.04, -0.605), toe: V(0.075, 0.02, -0.545) },
  { name: 'RH', front: false, side: -1, top: V(-0.08, 0.5, -0.5), low: V(-0.075, 0.18, -0.335), ball: V(-0.09, 0.035, -0.205), toe: V(-0.095, 0.02, -0.115) },
];
// Luiden pituudet: olkavarsi + kyynärvarsi, reisi + sääri.
const UPPER = { true: 0.19, false: 0.24 };
const LOWER = { true: 0.27, false: 0.24 };
const CUT = 0.27; // jalkojen täyttö tämän korkeuden alapuolella
const TAIL_LEN = 0.57; // häntä pintaetäisyytenä kärjestä

let template = null;
let loading = null;

export function leopardReady() {
  return !!template;
}

export function loadLeopard() {
  if (!loading) {
    loading = new GLTFLoader().loadAsync(URL).then((gltf) => {
      let src = null;
      gltf.scene.traverse((o) => { if (o.isMesh && !src) src = o; });
      if (!src) throw new Error('leopardi: ei verkkoa');
      gltf.scene.updateMatrixWorld(true);
      template = buildRig(src);
      return template;
    }).catch((e) => {
      console.warn('Leopardia ei voitu ladata', e);
      return null;
    });
  }
  return loading;
}

export function leopardInfo() {
  return template && template.info;
}

// Keskimmäinen nivel (kyynär / polvi) kahden luun pituudesta sivutasossa:
// kyynärpää taakse, polvi eteen.
function midJoint(top, low, a, b, front) {
  const dz = low.z - top.z, dy = low.y - top.y;
  const d = Math.min(a + b - 1e-4, Math.hypot(dz, dy));
  const c = Math.max(-1, Math.min(1, (a * a + d * d - b * b) / (2 * a * d)));
  const A = Math.acos(c) * (front ? -1 : 1);
  const uz = dz / d, uy = dy / d;
  // Kierto sivutasossa (z, y): +A kääntää kohti +z:aa (eteen) alas osoittavalle.
  const rz = uz * Math.cos(A) - uy * Math.sin(A), ry = uz * Math.sin(A) + uy * Math.cos(A);
  const k = a / (a + b);
  return V(top.x + (low.x - top.x) * k, top.y + ry * a, top.z + rz * a);
}

// Pisteen etäisyys janaan.
function segDist(px, py, pz, a, b) {
  const abx = b.x - a.x, aby = b.y - a.y, abz = b.z - a.z;
  const t = Math.max(0, Math.min(1, ((px - a.x) * abx + (py - a.y) * aby + (pz - a.z) * abz) / (abx * abx + aby * aby + abz * abz || 1)));
  return Math.hypot(px - a.x - abx * t, py - a.y - aby * t, pz - a.z - abz * t);
}

// Verkon apurakenteet: hitsaus paikan mukaan (UV-saumat), naapurit,
// Dijkstra ja jalkojen osat leikkauskorkeuden alapuolella.
function meshGraph(geo) {
  const P = geo.attributes.position;
  const N0 = P.count;
  const idx = geo.index.array;
  const X = (i) => P.getX(i), Y = (i) => P.getY(i), Z = (i) => P.getZ(i);
  const canon = new Map(), rep = new Int32Array(N0);
  for (let i = 0; i < N0; i++) {
    const k = `${Math.round(X(i) * 1e4)},${Math.round(Y(i) * 1e4)},${Math.round(Z(i) * 1e4)}`;
    if (!canon.has(k)) canon.set(k, i);
    rep[i] = canon.get(k);
  }
  const adj = Array.from({ length: N0 }, () => []);
  const link = (a, b) => { if (a !== b && !adj[a].includes(b)) { adj[a].push(b); adj[b].push(a); } };
  for (let t = 0; t < idx.length; t += 3) {
    const a = rep[idx[t]], b = rep[idx[t + 1]], c = rep[idx[t + 2]];
    link(a, b); link(b, c); link(c, a);
  }
  const elen = (i, j) => Math.hypot(X(i) - X(j), Y(i) - Y(j), Z(i) - Z(j));
  // Dijkstra useasta lähteestä (binäärikeko; etäisyydet 64-bittisinä, jotta
  // keon ja taulukon arvot ovat vertailukelpoisia).
  const dijkstra = (sources, allowed) => {
    const d = new Float64Array(N0).fill(1e9), own = new Int8Array(N0).fill(-1);
    const heap = [];
    const push = (v, i) => {
      heap.push([v, i]);
      let k = heap.length - 1;
      while (k > 0) { const p = (k - 1) >> 1; if (heap[p][0] <= heap[k][0]) break; [heap[p], heap[k]] = [heap[k], heap[p]]; k = p; }
    };
    const pop = () => {
      const top = heap[0], last = heap.pop();
      if (heap.length) {
        heap[0] = last;
        let k = 0;
        for (;;) {
          const l = k * 2 + 1, r = l + 1;
          let m = k;
          if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
          if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
          if (m === k) break;
          [heap[m], heap[k]] = [heap[k], heap[m]];
          k = m;
        }
      }
      return top;
    };
    for (const [i, o] of sources) { d[i] = 0; own[i] = o; push(0, i); }
    while (heap.length) {
      const [dv, i] = pop();
      if (dv > d[i]) continue;
      for (const j of adj[i]) {
        if (!allowed(j)) continue;
        const nd = dv + elen(i, j);
        if (nd < d[j]) { d[j] = nd; own[j] = own[i]; push(nd, j); }
      }
    }
    return { d, own };
  };
  const par = new Int32Array(N0).map((_, i) => i);
  const find = (a) => { while (par[a] !== a) { par[a] = par[par[a]]; a = par[a]; } return a; };
  for (let i = 0; i < N0; i++) {
    if (rep[i] !== i || Y(i) > CUT) continue;
    for (const j of adj[i]) if (Y(j) <= CUT) { const a = find(i), b = find(j); if (a !== b) par[a] = b; }
  }
  const comps = new Map();
  for (let i = 0; i < N0; i++) {
    if (rep[i] !== i || Y(i) > CUT) continue;
    const r = find(i);
    const c = comps.get(r) || { n: 0, x: 0, z: 0, miny: 9, verts: [] };
    c.n++; c.x += X(i); c.z += Z(i); c.miny = Math.min(c.miny, Y(i)); c.verts.push(i);
    comps.set(r, c);
  }
  const legComps = [...comps.values()].filter((c) => c.n > 30 && c.miny < 0.03)
    .map((c) => ({ ...c, x: c.x / c.n, z: c.z / c.n })).sort((a, b) => b.z - a.z);
  return { P, N0, idx, X, Y, Z, rep, adj, dijkstra, legComps };
}

// Mallin korjaus (oikea etujalka): lähdemallissa oikea etutassu on
// käpristynyt (anturat taaksepäin) ja painautunut vasemman ranteen taakse,
// joten maahan painettuna se venyisi ja repeäisi. Oikean etujalan alaosa
// korvataan vasemman etujalan alaosan peilikuvalla: molemmat leikataan
// vaakatasolla kyynärpään alta (y = CUT), kopio siirretään oikean
// leikkausrenkaan kohdalle, ja leikkaukset suljetaan viuhkoilla.
// Palauttaa uuden geometrian, jossa etujalkojen jako on valmiina
// (userData.front: -1 / 0 = vasen / 1 = oikea) ja kopion siirto
// (userData.rfShift: oikean jalan uudet nivelet lasketaan siitä).
function fixRightPaw(geo) {
  const G = meshGraph(geo);
  const { N0, X, Y, rep } = G;
  const idx = G.idx;
  const fc = G.legComps[0];
  if (!fc || G.legComps.length < 3) return geo;
  const inF = new Uint8Array(N0);
  for (const i of fc.verts) inF[i] = 1;
  const top = fc.verts.filter((i) => Y(i) > CUT - 0.05);
  const { own } = G.dijkstra(top.map((i) => [i, Math.abs(X(i) - LEGS[0].top.x) < Math.abs(X(i) - LEGS[1].top.x) ? 0 : 1]), (j) => inF[j]);
  // Vasemmaksi luokitellut palat vanhasta oikeasta tassusta poistetaan (-2):
  // ne ovat jalan sisäpuolella yli 5 cm vasemman jalan keskilinjasta
  // (keskilinja korkeuskerroksittain).
  const own0 = (i) => (own[i] < 0 ? 0 : own[i]);
  const sumX = new Float64Array(20), cntX = new Float64Array(20);
  const bin = (y) => Math.max(0, Math.min(19, Math.floor(y / 0.02)));
  for (const i of fc.verts) if (own0(i) === 0) { sumX[bin(Y(i))] += X(i); cntX[bin(Y(i))]++; }
  const farL = (i) => { const b = bin(Y(i)); return Y(i) < 0.16 && cntX[b] > 0 && X(i) < sumX[b] / cntX[b] - 0.068; };
  const lab = (v) => {
    if (v >= N0 || !inF[rep[v]]) return -1;
    const l = own[rep[v]] < 0 ? 0 : own[rep[v]];
    return l === 0 && farL(rep[v]) ? -2 : l;
  };
  const pos = geo.attributes.position, nrm = geo.attributes.normal, uv = geo.attributes.uv;
  const P = [], N = [], U = [], F = [];
  for (let i = 0; i < N0; i++) {
    P.push(pos.getX(i), pos.getY(i), pos.getZ(i));
    N.push(nrm.getX(i), nrm.getY(i), nrm.getZ(i));
    U.push(uv.getX(i), uv.getY(i));
    F.push(lab(i));
  }
  const addV = (p, n, u, f) => { P.push(p.x, p.y, p.z); N.push(n.x, n.y, n.z); U.push(u[0], u[1]); F.push(f); return F.length - 1; };
  const pv = (v) => V(P[v * 3], P[v * 3 + 1], P[v * 3 + 2]);
  const nv = (v) => V(N[v * 3], N[v * 3 + 1], N[v * 3 + 2]);
  // Leikkauspisteet särmän mukaan (sama piste molemmille kolmioille).
  const cutCache = new Map();
  const cutV = (a, b, da, db, tag, f) => {
    const key = `${tag}:${Math.min(a, b)},${Math.max(a, b)}`;
    let v = cutCache.get(key);
    if (v === undefined) {
      const t = da / (da - db);
      const p = pv(a).lerp(pv(b), t), n = nv(a).lerp(nv(b), t).normalize();
      v = addV(p, n, [U[a * 2] + (U[b * 2] - U[a * 2]) * t, U[a * 2 + 1] + (U[b * 2 + 1] - U[a * 2 + 1]) * t], f);
      cutCache.set(key, v);
    }
    return v;
  };
  // Kolmion leikkaus: säilytetään osa, jossa d <= 0; leikkaussärmät talteen
  // (kiertosuunnassa), jotta aukko voidaan sulkea.
  const cuts = { R: [], L: [] };
  const clip = (tri, d, tag, f, outArr) => {
    const keep = [], isCut = [];
    for (let k = 0; k < 3; k++) {
      const a = tri[k], b = tri[(k + 1) % 3], da = d[k], db = d[(k + 1) % 3];
      if (da <= 0) { keep.push(a); isCut.push(false); }
      if ((da <= 0) !== (db <= 0)) { keep.push(cutV(a, b, da, db, tag, f)); isCut.push(true); }
    }
    for (let k = 1; k + 1 < keep.length; k++) outArr.push(keep[0], keep[k], keep[k + 1]);
    for (let k = 0; k < keep.length; k++) {
      const k2 = (k + 1) % keep.length;
      if (isCut[k] && isCut[k2]) cuts[tag].push([keep[k], keep[k2]]);
    }
  };
  const sliver = (tri) => {
    const a = pv(tri[0]), b = pv(tri[1]), c = pv(tri[2]);
    if (Math.max(a.y, b.y, c.y) > 0.16) return false;
    const ab = a.distanceTo(b), bc = b.distanceTo(c), ca = c.distanceTo(a);
    const long = Math.max(ab, bc, ca);
    const area = b.clone().sub(a).cross(c.clone().sub(a)).length() / 2;
    return long > 0.03 && (2 * area) / long < 0.004;
  };
  const out = [];
  const copySrc = [];
  for (let t = 0; t < idx.length; t += 3) {
    const tri = [idx[t], idx[t + 1], idx[t + 2]];
    const L = tri.map((v) => F[v]);
    if (L.includes(-2) || (L.includes(0) && L.includes(1))) continue; // irtopalat ja jalkojen väliset kolmiot pois
    if (L.includes(1)) {
      // Oikean jalan alaosa pois; rajakolmioista jää yläpuoli (y >= CUT).
      const d = tri.map((v) => CUT - P[v * 3 + 1]);
      if (d.every((x) => x > 0)) continue;
      if (d.some((x) => x > 0)) { clip(tri, d, 'R', 1, out); continue; }
    }
    // Ohuet suikaleet vasemman tassun sisäreunassa (kosketuskohdan jäänteet) pois.
    if (L.every((x) => x === 0) && sliver(tri)) continue;
    out.push(...tri);
    if (L.includes(0)) {
      // Vasemman jalan alaosa kopioitavaksi (rajakolmioista alapuoli).
      const d = tri.map((v) => P[v * 3 + 1] - CUT);
      if (d.every((x) => x <= 0)) copySrc.push(...tri);
      else if (d.some((x) => x <= 0)) clip(tri, d, 'L', 0, copySrc);
    }
  }
  // Leikkausaukkojen silmukat (paikan mukaan ketjutettuna).
  const pk = (v) => `${Math.round(P[v * 3] * 1e5)},${Math.round(P[v * 3 + 1] * 1e5)},${Math.round(P[v * 3 + 2] * 1e5)}`;
  const loops = (edges) => {
    // Useampi lähtevä särmä samasta pisteestä sallitaan (reiät koskettavat).
    const out2 = new Map();
    edges.forEach((e, i) => { const k = pk(e[0]); if (!out2.has(k)) out2.set(k, []); out2.get(k).push(i); });
    const used = new Uint8Array(edges.length), res = [];
    for (let s0 = 0; s0 < edges.length; s0++) {
      if (used[s0]) continue;
      const start = pk(edges[s0][0]);
      const loop = [];
      let e = s0, ok = false;
      for (let guard = 0; guard < 400 && e >= 0; guard++) {
        used[e] = 1;
        loop.push(edges[e]);
        const k = pk(edges[e][1]);
        if (k === start) { ok = true; break; }
        const cand = (out2.get(k) || []).find((i) => !used[i]);
        e = cand === undefined ? -1 : cand;
      }
      if (ok && loop.length >= 3) res.push(loop);
    }
    return res;
  };
  const center = (loop, f) => {
    const c = V(0, 0, 0), n = V(0, 0, 0);
    for (const [a, b] of loop) { c.add(pv(a)); n.add(pv(a).cross(pv(b))); }
    c.divideScalar(loop.length);
    return addV(c, n.normalize().negate(), [U[loop[0][0] * 2], U[loop[0][0] * 2 + 1]], f);
  };
  let fills = 0;
  // Vasemman jalan reiät (poistetut kosketuskolmiot) paikataan ennen
  // kopiointia, jotta kopio on myös ehjä.
  {
    const ek = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);
    const cnt = new Map();
    for (let t = 0; t < out.length; t += 3) for (let k = 0; k < 3; k++) {
      const key = ek(pk(out[t + k]), pk(out[t + (k + 1) % 3]));
      cnt.set(key, (cnt.get(key) || 0) + 1);
    }
    const edges = [];
    for (let t = 0; t < out.length; t += 3) for (let k = 0; k < 3; k++) {
      const a = out[t + k], b = out[t + (k + 1) % 3];
      if (F[a] === 0 && F[b] === 0 && cnt.get(ek(pk(a), pk(b))) === 1) edges.push([a, b]);
    }
    for (const loop of loops(edges)) {
      if (loop.length > 60) continue;
      const c = center(loop, 0);
      for (const [a, b] of loop) { out.push(b, a, c); copySrc.push(b, a, c); }
      fills++;
    }
  }
  const ringC = (ls) => {
    const c = V(0, 0, 0);
    let n = 0;
    for (const loop of ls) for (const [a] of loop) { c.add(pv(a)); n++; }
    return n ? c.divideScalar(n) : null;
  };
  const loopsR = loops(cuts.R), loopsL = loops(cuts.L);
  // Oikean puolen tynkä suljetaan.
  for (const loop of loopsR) { const c = center(loop, 1); for (const [a, b] of loop) out.push(b, a, c); fills++; }
  // Kopio oikeaksi alaosaksi: x peilataan ja rengas siirretään tyngän kohdalle.
  const cR = ringC(loopsR), cL = ringC(loopsL);
  const shift = cR && cL ? V(cR.x + cL.x, 0, cR.z - cL.z) : V(-0.08, 0, -0.04); // x' = shift.x - x
  const map = new Map();
  const cp = (v) => {
    let j = map.get(v);
    if (j === undefined) {
      j = addV(V(shift.x - P[v * 3], P[v * 3 + 1], P[v * 3 + 2] + shift.z), V(-N[v * 3], N[v * 3 + 1], N[v * 3 + 2]), [U[v * 2], U[v * 2 + 1]], 1);
      map.set(v, j);
    }
    return j;
  };
  for (let t = 0; t < copySrc.length; t += 3) out.push(cp(copySrc[t]), cp(copySrc[t + 2]), cp(copySrc[t + 1]));
  for (const loop of loopsL) { const c = center(loop, 0); for (const [a, b] of loop) out.push(cp(b), cp(c), cp(a)); fills++; }
  // Irralliset pienet palat pois.
  let g0dropped = 0;
  {
    const nT = out.length / 3;
    const par = new Int32Array(nT).map((_, i) => i);
    const find = (a) => { while (par[a] !== a) { par[a] = par[par[a]]; a = par[a]; } return a; };
    const owner = new Map();
    for (let t = 0; t < nT; t++) for (let k = 0; k < 3; k++) {
      const key = pk(out[t * 3 + k]);
      const o = owner.get(key);
      if (o === undefined) owner.set(key, t);
      else { const a = find(o), b = find(t); if (a !== b) par[a] = b; }
    }
    const size = new Map();
    for (let t = 0; t < nT; t++) { const r = find(t); size.set(r, (size.get(r) || 0) + 1); }
    const kept = [];
    let dropped = 0;
    for (let t = 0; t < nT; t++) {
      if (size.get(find(t)) < 40) { dropped++; continue; }
      kept.push(out[t * 3], out[t * 3 + 1], out[t * 3 + 2]);
    }
    out.length = 0;
    out.push(...kept);
    g0dropped = dropped;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2));
  g.setIndex(out);
  g.userData.front = F;
  g.userData.fix = { fills, dropped: g0dropped, copied: map.size, shift: shift.toArray().map((v) => +v.toFixed(3)) };
  g.userData.rfShift = shift;
  return g;
}

function buildRig(src) {
  let geo = src.geometry.clone();
  geo.applyMatrix4(src.matrixWorld);
  geo = fixRightPaw(geo);
  // Oikean etujalan kyynärpää, ranne, päkiä ja varpaat: vasemman peilikuva
  // samalla siirrolla kuin kopioitu alaosa (ks. fixRightPaw).
  const sh = geo.userData.rfShift;
  if (sh) {
    const m = (v) => V(sh.x - v.x, v.y, v.z + sh.z);
    const L = LEGS[0];
    LEGS[1].mid = m(midJoint(L.top, L.low, UPPER.true, LOWER.true, true));
    LEGS[1].low = m(L.low);
    LEGS[1].ball = m(L.ball);
    LEGS[1].toe = m(L.toe);
  }
  const fixInfo = geo.userData.fix;
  const front = geo.userData.front;
  const G = meshGraph(geo);
  let P = G.P;
  const { N0, rep, adj, dijkstra, legComps } = G;
  const idx = Array.from(G.idx);
  const X = (i) => P.getX(i), Y = (i) => P.getY(i), Z = (i) => P.getZ(i);

  // 1) Jalat. Etujalat ovat lähdemallissa yksi osa (oikea etutassu on
  // painautunut vasemman ranteen taakse); fixRightPaw jakaa ne
  // pintaetäisyyden mukaan yläreunasta (koveran särmän ylitys on kallis,
  // joten raja asettuu tassujen väliseen uurteeseen) ja korvaa oikean tassun.
  const label = new Int8Array(N0).fill(-1);
  const legs = LEGS.map((L) => ({ ...L, mid: L.mid || midJoint(L.top, L.low, UPPER[L.front], LOWER[L.front], L.front) }));
  // Etujalat: jako tehtiin tassun korjauksessa (fixRightPaw).
  if (front) for (let i = 0; i < N0; i++) if (rep[i] === i && front[i] >= 0) label[i] = front[i];
  // Takajalat: erilliset osat (kaksi takimmaista), vasen = suurempi x.
  const hs = legComps.filter((c) => c.z < -0.05).sort((a, b) => a.z - b.z).slice(0, 2).sort((a, b) => b.x - a.x);
  hs.forEach((c, k) => { for (const i of c.verts) label[i] = 2 + k; });
  // 2) Häntä: pintaetäisyys kärjestä (korkein piste takana).
  let tip = -1;
  for (let i = 0; i < N0; i++) if (rep[i] === i && Z(i) < -0.6 && (tip < 0 || Y(i) > Y(tip))) tip = i;
  const { d: gTail } = dijkstra([[tip, 0]], (j) => Z(j) < -0.45);

  // 3) Luut.
  const bones = [];
  const add = (name, pos, parent) => {
    const b = new THREE.Bone();
    b.name = name;
    b.userData.rest = pos.clone();
    b.position.copy(pos);
    if (parent) { b.position.sub(parent.userData.rest); parent.add(b); }
    bones.push(b);
    return b;
  };
  const root = add('root', J.root, null);
  const spine1 = add('spine1', J.spine1, root);
  const spine2 = add('spine2', J.spine2, spine1);
  const chest = add('chest', J.chest, spine2);
  const neck = add('neck', J.neck, chest);
  add('head', J.head, neck);
  const tails = [];
  let tp = root;
  for (let i = 0; i < J.tail.length - 1; i++) { tp = add('tail' + i, J.tail[i], tp); tails.push(tp); }
  for (const L of legs) {
    const parent = L.front ? add('scap' + L.name, L.scap, chest) : root;
    L.bTop = add('top' + L.name, L.top, parent);
    L.bMid = add('mid' + L.name, L.mid, L.bTop);
    L.bLow = add('low' + L.name, L.low, L.bMid);
    L.bPaw = add('paw' + L.name, L.ball, L.bLow);
    if (L.front) L.bScap = parent;
  }
  const B = Object.fromEntries(bones.map((b, i) => [b.name, i]));
  // Painotusjanat (luu -> seuraava nivel).
  const segs = [];
  // k: etäisyyskerroin (suurempi = luu saa vähemmän rungon verteksejä);
  // z0..z1: raajan yläluiden vaikutusalue rungon pituussuunnassa.
  const seg = (name, a, b, group, k = 1) => segs.push({ bone: B[name], a, b, group, k, z0: Math.min(a.z, b.z) - 0.07, z1: Math.max(a.z, b.z) + 0.07 });
  seg('root', J.root, J.spine1, 'body');
  seg('root', J.rump, J.root, 'body');
  seg('spine1', J.spine1, J.spine2, 'body');
  seg('spine2', J.spine2, J.chest, 'body');
  seg('chest', J.chest, J.neck, 'body');
  seg('neck', J.neck, J.head, 'body');
  seg('head', J.head, J.nose, 'body');
  for (let i = 0; i < tails.length; i++) seg('tail' + i, J.tail[i], J.tail[i + 1], 'tail');
  legs.forEach((L, l) => {
    if (L.front) seg('scap' + L.name, L.scap, L.top, 'up' + L.side + 'F', 1.35);
    seg('top' + L.name, L.top, L.mid, L.front ? 'up' + L.side + 'F' : 'up' + L.side + 'H', L.front ? 1.15 : 1.1);
    seg('mid' + L.name, L.mid, L.low, 'leg' + l);
    seg('low' + L.name, L.low, L.ball, 'leg' + l);
    seg('paw' + L.name, L.ball, L.toe, 'leg' + l);
  });
  // Rungon keskilinja x(z) jalkojen sivun valintaan.
  const midX = (z) => {
    const k = Math.max(0, Math.min(1, (z - J.root.z) / (J.chest.z - J.root.z)));
    return J.root.x + (J.chest.x - J.root.x) * k;
  };

  // 4) Jäykkä luu jokaiselle verteksille (sallitut janat alueen mukaan).
  const NB = bones.length;
  const region = new Int8Array(N0); // 0 runko, 1 häntä, 2.. jalat
  const W = new Float32Array(N0 * NB);
  for (let i = 0; i < N0; i++) {
    if (rep[i] !== i) continue;
    const x = X(i), y = Y(i), z = Z(i);
    const l = label[i];
    const tail = gTail[i] < TAIL_LEN;
    region[i] = l >= 0 ? 2 + l : tail ? 1 : 0;
    const side = x - midX(z) > 0 ? 1 : -1;
    let best = -1, bd = 1e9;
    for (const s of segs) {
      let ok;
      if (l >= 0) ok = s.group === 'leg' + l || (s.group === 'up' + LEGS[l].side + (LEGS[l].front ? 'F' : 'H'));
      else if (tail) ok = s.group === 'tail';
      else ok = s.group === 'body' || ((s.group === 'up' + side + 'F' || s.group === 'up' + side + 'H') && z > s.z0 && z < s.z1) ||
        // Polven ja kyynärpään seutu (jalkojen yläosa rungon sisällä).
        (s.group.startsWith('leg') && LEGS[+s.group.slice(3)].side === side && s.bone === B['mid' + LEGS[+s.group.slice(3)].name] && y > CUT - 0.02 && z > s.z0 && z < s.z1);
      if (!ok) continue;
      const dd = segDist(x, y, z, s.a, s.b) * (l < 0 && !tail ? s.k : 1);
      if (dd < bd) { bd = dd; best = s.bone; }
    }
    if (tail && gTail[i] > TAIL_LEN - 0.08) {
      // Hännän tyven pehmeä liitos lantioon.
      const k = (gTail[i] - (TAIL_LEN - 0.08)) / 0.08;
      W[i * NB + B.tail0] += 1 - k;
      W[i * NB + B.root] += k;
    } else {
      W[i * NB + best] = 1;
    }
  }
  // 5) Pehmennys pintaa pitkin (ei eri jalkojen eikä jalan ja hännän välillä).
  const compatible = (a, b) => a === b || a < 2 && b < 2 || (a < 2) !== (b < 2) && (a === 0 || b === 0);
  const tmp = new Float32Array(N0 * NB);
  for (let it = 0; it < 10; it++) {
    for (let i = 0; i < N0; i++) {
      if (rep[i] !== i) continue;
      const o = i * NB;
      let n = 1;
      for (let k = 0; k < NB; k++) tmp[o + k] = W[o + k];
      for (const j of adj[i]) {
        if (!compatible(region[i], region[j])) continue;
        const oj = j * NB;
        for (let k = 0; k < NB; k++) tmp[o + k] += W[oj + k];
        n++;
      }
      for (let k = 0; k < NB; k++) tmp[o + k] /= n;
    }
    W.set(tmp);
  }
  // 6) Etujalkojen kosketuskohta: kolmiot, joissa on kummankin jalan
  // verteksejä, saavat omat kopiot (ei venyvää kalvoa jalkojen väliin).
  const extra = [];
  for (let t = 0; t < idx.length; t += 3) {
    const r = [region[rep[idx[t]]], region[rep[idx[t + 1]]], region[rep[idx[t + 2]]]];
    const legsIn = r.filter((v) => v >= 2);
    if (legsIn.length < 2 || legsIn.every((v) => v === legsIn[0])) continue;
    const cnt = {};
    for (const v of legsIn) cnt[v] = (cnt[v] || 0) + 1;
    const major = +Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a])[0];
    const donor = [0, 1, 2].map((k) => idx[t + k]).find((v) => region[rep[v]] === major);
    for (let k = 0; k < 3; k++) {
      if (r[k] >= 2 && r[k] !== major) { extra.push([idx[t + k], donor]); idx[t + k] = N0 + extra.length - 1; }
    }
  }
  if (extra.length) {
    const g2 = new THREE.BufferGeometry();
    for (const name of Object.keys(geo.attributes)) {
      const a = geo.attributes[name], n = a.itemSize;
      const arr = new Float32Array((N0 + extra.length) * n);
      for (let i = 0; i < N0; i++) for (let k = 0; k < n; k++) arr[i * n + k] = a.getComponent(i, k);
      extra.forEach(([v], e) => { for (let k = 0; k < n; k++) arr[(N0 + e) * n + k] = a.getComponent(v, k); });
      g2.setAttribute(name, new THREE.BufferAttribute(arr, n));
    }
    geo = g2;
    P = geo.attributes.position;
  }
  geo.setIndex(idx);
  const NV = N0 + extra.length;
  const si = new Uint16Array(NV * 4), sw = new Float32Array(NV * 4);
  const pick = (v, out) => {
    const r = rep[v], o = r * NB;
    const list = [];
    for (let k = 0; k < NB; k++) if (W[o + k] > 0.01) list.push([k, W[o + k]]);
    list.sort((a, b) => b[1] - a[1]);
    list.length = Math.min(4, list.length);
    const s = list.reduce((a, e) => a + e[1], 0) || 1;
    for (let k = 0; k < 4; k++) { si[out * 4 + k] = list[k] ? list[k][0] : 0; sw[out * 4 + k] = list[k] ? list[k][1] / s : 0; }
    if (!list.length) { si[out * 4] = B.root; sw[out * 4] = 1; }
  };
  for (let i = 0; i < N0; i++) pick(i, i);
  extra.forEach(([, donor], e) => pick(donor, N0 + e));
  geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4));
  geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
  geo.computeBoundingSphere();
  geo.userData.region = Array.from({ length: NV }, (_, i) => region[rep[i < N0 ? i : extra[i - N0][1]]]);

  const material = src.material;
  material.side = THREE.FrontSide;
  const mesh = new THREE.SkinnedMesh(geo, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  const group = new THREE.Group();
  const holder = new THREE.Group();
  holder.name = 'holder';
  holder.add(root);
  holder.add(mesh);
  group.add(holder);
  group.updateMatrixWorld(true);
  mesh.bind(new THREE.Skeleton(bones));

  // IK:n vakiot: lepoasennon kulmat sivutasossa (0 = suoraan alas, + = eteen).
  const ang = (a, b) => Math.atan2(b.z - a.z, -(b.y - a.y));
  const ik = legs.map((L) => ({
    name: L.name, front: L.front, side: L.side,
    a: L.top.distanceTo(L.mid), b: L.mid.distanceTo(L.low), c: L.low.distanceTo(L.ball), e: L.ball.distanceTo(L.toe),
    r1: ang(L.top, L.mid), r2: ang(L.mid, L.low), r3: ang(L.low, L.ball), r4: ang(L.ball, L.toe),
    rs: L.front ? ang(L.scap, L.top) : 0,
    top: L.top.clone(), ball: L.ball.clone(), low: L.low.clone(), scap: L.scap ? L.scap.clone() : null,
  }));
  const tailRest = [];
  for (let i = 0; i < J.tail.length - 1; i++) tailRest.push(ang(J.tail[i], J.tail[i + 1]));
  const regionCounts = [0, 0, 0, 0, 0, 0];
  for (let i = 0; i < N0; i++) if (rep[i] === i) regionCounts[region[i]]++;
  return {
    group, material, ik, tailRest,
    info: { fix: fixInfo, verts: NV, extra: extra.length, regions: regionCounts, legComps: legComps.map((c) => [c.n, +c.x.toFixed(3), +c.z.toFixed(3)]), mids: legs.map((L) => [L.name, ...L.mid.toArray().map((v) => +v.toFixed(3))]) },
  };
}

// Uusi leopardi (oma luuranko ja materiaali).
export function makeLeopard() {
  if (!template) return null;
  const group = cloneSkinned(template.group);
  let mesh = null;
  group.traverse((o) => { if (o.isSkinnedMesh) mesh = o; });
  const material = template.material.clone();
  mesh.material = material;
  const bone = (n) => group.getObjectByName(n);
  const legs = template.ik.map((L) => ({
    ...L,
    scapB: L.front ? bone('scap' + L.name) : null,
    topB: bone('top' + L.name), midB: bone('mid' + L.name), lowB: bone('low' + L.name), pawB: bone('paw' + L.name),
  }));
  return {
    group, material, kind: 'leopard', skeleton: mesh.skeleton, mesh,
    holder: group.getObjectByName('holder'),
    bones: {
      root: bone('root'), spine1: bone('spine1'), spine2: bone('spine2'), chest: bone('chest'), neck: bone('neck'), head: bone('head'),
      tail: [0, 1, 2, 3, 4, 5].map((i) => bone('tail' + i)),
    },
    legs, tailRest: template.tailRest,
    // Rungon etu- ja takapää (osumat koko pituudelta, mobs.bodyPoint).
    zF: 0.45, zH: -0.5,
  };
}

// --- Animaatio --------------------------------------------------------------
// Askellus: käynnissä sivuaskellus (vasen taka, vasen etu, oikea taka, oikea
// etu), ravissa ristikkäiset parit ja laukassa kiertävä laukka, jossa selkä
// koukistuu ja ojentuu askeleen tahdissa. Tukivaiheessa tassu pysyy maassa
// paikallaan; jalkojen kulmat ratkaistaan IK:lla sivutasossa (olka/lonkka,
// kyynär/polvi, ranne/kinner ja varpaat). Hiiviskellessä runko on matalalla,
// pää alhaalla ja eteenpäin ja tassut nousevat hitaasti ja korkealle.
// Lisäksi loikka (kyyristyy, heiluttaa takapäätä, ponnistaa ja ojentaa
// etutassut), tassulla isku, ärjyminen (häntä piiskaa), osuma ja kuolema.

const smooth = (t) => { t = Math.min(1, Math.max(0, t)); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
const wrap = (a) => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; };
const _w = new THREE.Vector3(), _t = new THREE.Vector3();

// Askellajin vaiheet (vasen taka, vasen etu, oikea taka, oikea etu).
const GAITS = {
  walk: { LH: 0, LF: 0.25, RH: 0.5, RF: 0.75, duty: 0.64 },
  trot: { LH: 0, LF: 0.52, RH: 0.5, RF: 0.02, duty: 0.46 },
  gallop: { LH: 0, LF: 0.62, RH: 0.1, RF: 0.5, duty: 0.3 },
};

// Jalan kulmat sivutasossa: kohde T (päkiä) vanhemman luun koordinaateissa,
// phi = kämmenen/jalkapöydän kulma, toe = varpaiden kulma (0 = alas, + = eteen).
function solveLeg(L, T, phi, toe) {
  const S = L.topB.position;
  const wz = T.z - L.c * Math.sin(phi), wy = T.y + L.c * Math.cos(phi);
  const dz = wz - S.z, dy = wy - S.y;
  const a = L.a, b = L.b;
  const d = Math.max(Math.abs(a - b) + 1e-3, Math.min(a + b - 1e-3, Math.hypot(dz, dy)));
  const td = Math.atan2(dz, -dy);
  const A = Math.acos(Math.max(-1, Math.min(1, (a * a + d * d - b * b) / (2 * a * d))));
  const t1 = L.front ? td - A : td + A; // kyynärpää taakse, polvi eteen
  const mz = S.z + Math.sin(t1) * a, my = S.y - Math.cos(t1) * a;
  const t2 = Math.atan2(wz - mz, -(wy - my));
  const d1 = wrap(t1 - L.r1), d2 = wrap(t2 - L.r2), d3 = wrap(phi - L.r3), d4 = wrap(toe - L.r4);
  L.topB.rotation.x = -d1;
  L.midB.rotation.x = -(d2 - d1);
  L.lowB.rotation.x = -(d3 - d2);
  L.pawB.rotation.x = -(d4 - d3);
}

function newState() {
  return {
    cyc: Math.random(), v: 0, w: 0, gt: 0, gg: 0, crouch: 0, alert: 0, lookY: 0, lookX: 0, bodyY: 0, pitch: 0,
    snarl: 0, hurt: 0, ph: Math.random() * 20, roll: 0, bend: 0, flex: 0, air: 0, blink: 0,
    lookT: 0, lookR: 0, tailW: 0,
  };
}

// o: speed (m/s), turn (rad/s), t (s), crouch 0..1 (hiiviskely), alert 0..1,
// look / lookUp (rad, kohteen suunta rungon suhteen), pounce 0..1 (loikan
// vaihe, -1 = ei), air (m, loikan korkeus), swipe 0..1 (iskun vaihe, -1 = ei),
// side (iskevä etutassu ±1), snarl 0..1, hurt 0..1, dead (s, -1 = elossa),
// deathSide ±1, dhF / dhH (maaston korkeus hartioiden / lantion kohdalla, m).
export function animateLeopard(e, o, dt) {
  const S = e.anim || (e.anim = newState());
  const B = e.bones;
  const k = (hz) => 1 - Math.exp(-dt * hz);
  const t = o.t + S.ph;
  const dead = o.dead >= 0;
  const pounce = o.pounce ?? -1, swipe = o.swipe ?? -1;

  // Askellaji nopeuden mukaan (pehmeästi). Nopeus suodatetaan, ettei tahti
  // nyi kiihdytyksissä. Paikallaan kääntyessä askelletaan hitaasti (ei ravia).
  // Sessio 53: tahti hitaammaksi (käynti n. 1 askelsykli/s), askel pidemmäksi.
  const v0 = dead ? 0 : Math.max(o.speed, Math.min(0.6, Math.abs(o.turn || 0) * 0.3));
  S.v += (v0 - S.v) * k(5);
  const v = S.v;
  S.w += (smooth((v - 0.05) / 0.35) - S.w) * k(4);
  S.gt += (smooth((v - 1.9) / 1.2) - S.gt) * k(2.5); // käynti -> ravi
  S.gg += (smooth((v - 4.3) / 1.6) - S.gg) * k(2.5); // ravi -> laukka
  const G = (n) => lerp(lerp(GAITS.walk[n], GAITS.trot[n], S.gt), GAITS.gallop[n], S.gg);
  S.crouch += ((o.crouch || 0) - S.crouch) * k(3);
  const freq = lerp(0.42 + 0.62 * Math.min(v, 1.6), 1.15 + 0.1 * v, S.gt) * (1 - 0.15 * S.crouch);
  const stride = v / Math.max(0.3, freq);
  const duty = Math.min(G('duty') + 0.1 * S.crouch, stride > 1e-3 ? Math.max(0.2, 0.7 / stride) : 1);
  const sweep = stride * duty * S.w;
  S.cyc = (S.cyc + freq * dt * S.w) % 1;
  S.alert += ((o.alert || 0) - S.alert) * k(3);
  S.snarl += ((o.snarl || 0) - S.snarl) * k(5);
  S.hurt += ((o.hurt || 0) - S.hurt) * k(12);

  // Loikka: kyyristys, ponnistus, lento, alastulo.
  let pg = 0, pl = 0, pf = 0, pa = 0;
  if (pounce >= 0) {
    pg = smooth(pounce / 0.3) * (1 - smooth((pounce - 0.4) / 0.08)); // kyyristys
    pl = pounce > 0.38 && pounce < 0.52 ? Math.sin(Math.PI * (pounce - 0.38) / 0.14) : 0; // ponnistus
    pf = smooth((pounce - 0.44) / 0.1) * (1 - smooth((pounce - 0.86) / 0.08)); // lento
    pa = smooth((pounce - 0.86) / 0.06) * (1 - smooth((pounce - 0.96) / 0.04)); // alastulo
  }
  const sw = swipe >= 0 ? Math.sin(Math.PI * Math.min(1, swipe)) : 0; // iskun nousu

  // Rungon korkeus ja kallistus.
  const bob = S.w * (1 - S.gg) * Math.cos(S.cyc * Math.PI * 4) * (0.008 + 0.02 * S.gt);
  const gal = S.gg * S.w;
  const flight = gal * Math.max(0, Math.sin((S.cyc - 0.15) * Math.PI * 2)) * 0.07;
  const wantY = 0.035 * (1 - S.crouch) - 0.11 * S.crouch - 0.04 * S.snarl - 0.14 * pg + 0.06 * pl - 0.05 * pa + bob + flight
    + 0.012 * Math.sin(t * 1.3) * (1 - S.w); // hengitys
  S.bodyY += (wantY - S.bodyY) * k(10);
  const slope = Math.atan2((o.dhH || 0) - (o.dhF || 0), 0.75);
  const flex = gal * Math.sin((S.cyc - 0.2) * Math.PI * 2); // + = koukistus
  const wantPitch = slope - 0.05 * S.crouch + 0.1 * pg - 0.22 * pl + 0.08 * pf - 0.18 * sw + 0.05 * flex;
  S.pitch += (wantPitch - S.pitch) * k(8);
  // Kallistus kaarteessa vain vauhdissa (keskihakuvoima ~ kulmanopeus * nopeus);
  // kävellessä runko pysyy pystyssä, selkä taipuu hieman kaarteen mukaan.
  S.roll += (Math.max(-0.18, Math.min(0.18, -(o.turn || 0) * v * 0.022)) - S.roll) * k(3);
  S.bend += (Math.max(-0.35, Math.min(0.35, (o.turn || 0) * 0.11)) - S.bend) * k(3);
  S.air += ((o.air || 0) - S.air) * k(20);
  const wiggle = pg * Math.sin(t * 15) * 0.05 * smooth((pounce - 0.12) / 0.15);
  e.holder.position.set(0, S.air, 0);
  B.root.position.set(B.root.userData.rest.x + wiggle * 0.4, B.root.userData.rest.y + S.bodyY, B.root.userData.rest.z);
  B.root.rotation.set(S.pitch - 0.25 * flex * 0.4, wiggle, S.roll + wiggle * 0.6);
  // Selkä: koukistus laukassa, käännöksissä kaari, hiiviskellessä hartiat alas.
  B.spine1.rotation.set(0.12 * flex + 0.03 * S.crouch, S.bend * 0.3, 0);
  B.spine2.rotation.set(0.1 * flex + 0.04 * S.crouch - 0.08 * pf, S.bend * 0.35, 0);
  B.chest.rotation.set(0.06 * flex + 0.04 * S.crouch - 0.12 * pf + 0.08 * pa - 0.1 * sw, S.bend * 0.35, 0);

  // Pää: katsoo kohdetta (valppaana) tai ympärilleen; hiiviskellessä matalalla.
  S.lookT -= dt;
  if (S.lookT <= 0) { S.lookT = 1.5 + Math.random() * 3; S.lookR = (Math.random() - 0.5) * 1.2; }
  const lookY = (o.look !== undefined && S.alert > 0.3 ? o.look : S.lookR * (1 - S.w) * 0.6) - S.bend * 0.5;
  S.lookY += (Math.max(-1.1, Math.min(1.1, lookY)) - S.lookY) * k(4);
  const lookX = (o.lookUp || 0) * S.alert + 0.32 * S.crouch + 0.25 * S.snarl - 0.15 * pf + 0.25 * pg + 0.3 * S.hurt + 0.15 * sw;
  S.lookX += (lookX - S.lookX) * k(5);
  const nod = S.w * (1 - S.gg) * Math.sin(S.cyc * Math.PI * 4 + 0.6) * 0.02;
  B.neck.rotation.set(S.lookX * 0.5 - 0.08 * S.crouch + nod, S.lookY * 0.55, 0);
  B.head.rotation.set(S.lookX * 0.5 + 0.05 * S.crouch - nod * 0.5 + (swipe >= 0 ? 0.15 * Math.sin(Math.PI * smooth((swipe - 0.4) / 0.4)) : 0), S.lookY * 0.45, S.snarl * Math.sin(t * 3) * 0.05);

  // Matriisit ajan tasalle ennen jalkojen IK:ta.
  e.group.updateMatrixWorld(true);

  // Jalat.
  for (const L of e.legs) {
    const p = (S.cyc + G(L.name)) % 1;
    const st = p < duty;
    const s = st ? p / duty : (p - duty) / (1 - duty);
    const g = L.front ? (o.dhF || 0) : (o.dhH || 0);
    let z = (L.front ? L.top.z + 0.07 : L.top.z + 0.02), y = L.ball.y + g;
    let phi, toe;
    if (st || S.w < 0.01) {
      z += sweep * (0.5 - s);
      // Tukivaihe: etukämmen painuu loivemmaksi (ranne joustaa), takajalan
      // kinner nousee askeleen lopussa (varpailla kulkija: kantapää ei laske).
      phi = L.front ? lerp(0.12, lerp(0.12, 0.72, s), S.w) : lerp(0.45, lerp(0.5, 0.15, smooth(s)), S.w);
      toe = Math.PI / 2;
    } else {
      z += sweep * (smooth(s) - 0.5);
      const lift = (L.front ? 0.075 : 0.06) * Math.min(1, 0.5 + stride * 0.5) * (1 + 0.6 * S.crouch);
      y += lift * Math.pow(Math.sin(Math.PI * s), 0.8);
      // Heilahdus: tassu taittuu kevyesti taakse ja ojentuu ennen laskua.
      phi = L.front ? (s < 0.45 ? lerp(0.72, -0.7, smooth(s / 0.4)) : lerp(-0.7, 0.12, smooth((s - 0.45) / 0.5))) : (s < 0.45 ? lerp(0.15, -0.3, smooth(s / 0.4)) : lerp(-0.3, 0.5, smooth((s - 0.45) / 0.5)));
      toe = phi + 0.45;
    }
    // Paikallaan: jalat lepoasentoon (ei askelta), paino vaihtuu hitaasti.
    if (S.w < 0.99) {
      const idle = { z: (L.front ? L.top.z + 0.06 : L.top.z + 0.01), y: L.ball.y + g };
      z = lerp(idle.z, z, S.w);
      y = lerp(idle.y, y, S.w);
    }
    // Hiiviskely ja kyyristys: tassut hieman sivummalle ja taakse/eteen.
    z += (L.front ? -0.02 : 0.06) * S.crouch + (L.front ? -0.02 : 0.12) * pg;
    // Loikka: ponnistus (takajalat ojentuvat), lento (etutassut eteen, takajalat taakse).
    if (pounce >= 0) {
      if (L.front) {
        z = lerp(z, L.top.z + 0.32, pf);
        y = lerp(y, L.ball.y + 0.18, pf) + 0.05 * pl;
        phi = lerp(phi, 0.6, pf);
        toe = lerp(toe, 1.2, pf);
      } else {
        z = lerp(z, L.top.z - 0.32, Math.max(pf, pl * 0.8));
        y = lerp(y, L.ball.y + 0.12, pf);
        phi = lerp(phi, 1.25, Math.max(pf, pl));
        toe = lerp(toe, 2.0, pf);
      }
      // Lennossa jalat eivät ole maassa (korkeus rungon suhteen).
      y -= S.air * (1 - pa);
    }
    // Tassulla isku: iskevä etutassu nousee eteen ja lyö alas.
    if (L.front && swipe >= 0 && L.side === (o.side || 1)) {
      const up = smooth(swipe / 0.45) * (1 - smooth((swipe - 0.55) / 0.2));
      const strike = smooth((swipe - 0.45) / 0.15) * (1 - smooth((swipe - 0.8) / 0.2));
      z = lerp(z, L.top.z + 0.3, up) + 0.12 * strike;
      y = lerp(y, 0.42, up) - 0.3 * strike;
      phi = lerp(phi, 1.4, up) - 1.0 * strike;
      toe = lerp(toe, 2.2, up);
    }
    // Kohde vanhemman luun koordinaatteihin (sivutaso).
    _t.set(L.front ? L.top.x : L.top.x, y, z);
    e.holder.localToWorld(_t);
    const parent = L.topB.parent;
    if (L.front) {
      // Lapa kiertyy askeleen mukana (kissan lavat liikkuvat selässä).
      const fwd = st ? 0.5 - s : smooth(s) - 0.5;
      L.scapB.rotation.x = -0.35 * fwd * S.w * (1 - S.gg * 0.5) + 0.1 * S.crouch - 0.25 * pf;
      L.scapB.updateMatrixWorld(true);
    }
    parent.worldToLocal(_w.copy(_t));
    solveLeg(L, _w, phi, toe);
  }

  // Häntä: kulmat lantion suhteen (0 = alas, - = taakse).
  const relax = [-0.85, -0.45, -0.3, -0.55, -1.05, -1.55];
  const walk = [-1.05, -0.75, -0.6, -0.75, -1.1, -1.45];
  const stalk = [-1.25, -1.45, -1.5, -1.5, -1.4, -1.2];
  const run = [-1.45, -1.6, -1.68, -1.72, -1.78, -1.85];
  const up = [-2.0, -2.25, -2.3, -2.2, -2.0, -1.8];
  const tw = S.w * (1 - S.gg);
  S.tailW += ((S.snarl > 0.3 ? 1 : 0) - S.tailW) * k(3);
  let prev = 0;
  for (let i = 0; i < 6; i++) {
    let a = lerp(relax[i], walk[i], tw);
    a = lerp(a, run[i], gal);
    a = lerp(a, stalk[i], Math.max(S.crouch, S.snarl * 0.7));
    a = lerp(a, up[i], Math.max(pf, pl) * 0.8);
    // Kärki nykii (hiiviskely, valppaus), häntä heiluu kävellessä.
    a += Math.sin(t * 2.2 - i * 0.7) * 0.06 * (1 + i * 0.3) * (1 - S.crouch * 0.5);
    if (i >= 4) a += (Math.max(0, Math.sin(t * 6.5)) ** 4) * 0.5 * Math.max(S.crouch, S.alert) * (i - 3);
    const d = wrap(a - e.tailRest[i]);
    B.tail[i].rotation.x = -(d - prev);
    prev = d;
    // Sivuheilunta: rauhallinen huisku; ärjyessä piiskaa.
    const lash = S.tailW * Math.sin(t * 7 - i * 0.6) * 0.32;
    B.tail[i].rotation.y = Math.sin(t * 0.9 - i * 0.55) * 0.035 * (1 + 0.5 * tw) + lash + (pg ? Math.sin(t * 9 - i) * 0.08 * pg : 0);
  }

  // Osuma: nytkähdys. Kuolema: kaatuu kyljelleen, jalat veltoiksi.
  if (S.hurt > 0.01) {
    B.root.position.z -= S.hurt * 0.04;
    B.chest.rotation.x += S.hurt * 0.1;
  }
  if (dead) {
    const kd = smooth(o.dead / 0.7);
    e.holder.rotation.z = (o.deathSide || 1) * kd * 1.45;
    e.holder.position.y = S.air + kd * 0.06;
    B.root.position.y = B.root.userData.rest.y - kd * 0.3;
    for (const L of e.legs) {
      L.topB.rotation.x *= 1 - kd * 0.6;
      L.midB.rotation.x *= 1 - kd * 0.6;
      L.lowB.rotation.x = lerp(L.lowB.rotation.x, 0.3, kd);
    }
    B.neck.rotation.x = lerp(B.neck.rotation.x, 0.25, kd);
    B.head.rotation.x = lerp(B.head.rotation.x, 0.15, kd);
    for (let i = 0; i < 6; i++) B.tail[i].rotation.y = lerp(B.tail[i].rotation.y, 0, kd);
  } else {
    e.holder.rotation.z = 0;
  }
}
