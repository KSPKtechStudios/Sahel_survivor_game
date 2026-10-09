// Sessio 31: norsu (käyttäjän antama malli low_poly_realistic_elephant,
// assets/models/elephant/elephant.glb). Malli on staattinen (ei luurankoa eikä
// animaatioita), joten luuranko ja painot rakennetaan latauksessa:
//  - malli käännetään suoraan (kasvot +Z) ja keskitetään,
//  - jalkapohjat löydetään maahan koskevista verteksiryhmistä, ja jokainen
//    jalka erotellaan pintaa pitkin etenevällä täytöllä jalkapohjasta lantion
//    korkeudelle (samoin kärsä sen kärjestä); jalat saavat lonkka- ja
//    polviluun,
//  - pää, korvat, häntä ja syöksyhampaat tunnistetaan sijainnin ja
//    erillisten osien perusteella.
// Kävely, kärsä, korvat ja häntä animoidaan koodissa (game/mobs.js).
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';

const URL = 'assets/models/elephant/elephant.glb';
// Mallin korkeus on n. 0,8 yksikköä; norsu n. 2,9 m korkea.
export const ELEPHANT_SCALE = 3.6;
const HIP_Y = 0.42;      // jalkojen yläraja (vatsan alapinta)
const KNEE_Y = 0.2;
const LEG_R = 0.075;     // jalan säde (mallin yksiköissä)

let template = null;
let loading = null;

function smoothstep(a, b, x) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

export function elephantReady() {
  return !!template;
}

// Lataa ja rakentaa luurangon kerran (palauttaa lupauksen).
export function loadElephant() {
  if (!loading) {
    loading = new GLTFLoader().loadAsync(URL).then((gltf) => {
      let src = null;
      gltf.scene.traverse((o) => { if (o.isMesh && !src) src = o; });
      if (!src) throw new Error('norsu: ei verkkoa');
      gltf.scene.updateMatrixWorld(true);
      template = buildRig(src);
      return template;
    }).catch((e) => {
      console.warn('Norsua ei voitu ladata', e);
      return null;
    });
  }
  return loading;
}

function buildRig(src) {
  const geo = src.geometry.clone();
  geo.applyMatrix4(src.matrixWorld);
  const P = geo.attributes.position;
  const N = P.count;
  const idx = geo.index ? geo.index.array : null;

  // 1) Suoristus: rungon pääakseli (yläosan verteksit) +Z-suuntaan.
  let mx = 0, mz = 0, n = 0;
  for (let i = 0; i < N; i++) if (P.getY(i) > 0.35) { mx += P.getX(i); mz += P.getZ(i); n++; }
  mx /= n; mz /= n;
  let sxx = 0, szz = 0, sxz = 0;
  for (let i = 0; i < N; i++) {
    if (P.getY(i) <= 0.35) continue;
    const dx = P.getX(i) - mx, dz = P.getZ(i) - mz;
    sxx += dx * dx; szz += dz * dz; sxz += dx * dz;
  }
  // Pääakselin kulma XZ-tasossa.
  const ang = 0.5 * Math.atan2(2 * sxz, szz - sxx); // akseli (sin, cos) z:n suhteen
  const rot = new THREE.Matrix4().makeRotationY(-ang);
  geo.translate(-mx, 0, -mz);
  geo.applyMatrix4(rot);
  // Pää +Z-suuntaan: korvat (leveimmät kohdat ylhäällä) ovat edessä.
  let topFront = 0, topBack = 0;
  for (let i = 0; i < N; i++) {
    if (P.getY(i) < 0.5) continue;
    if (Math.abs(P.getX(i)) > 0.2) { if (P.getZ(i) > 0) topFront++; else topBack++; } // korvat
  }
  if (topBack > topFront) geo.rotateY(Math.PI);

  // Hitsaus: sama paikka = sama verteksi (UV-saumat).
  const key = (i) => `${Math.round(P.getX(i) * 1e4)},${Math.round(P.getY(i) * 1e4)},${Math.round(P.getZ(i) * 1e4)}`;
  const canon = new Map();
  const rep = new Int32Array(N);
  for (let i = 0; i < N; i++) {
    const k = key(i);
    if (!canon.has(k)) canon.set(k, i);
    rep[i] = canon.get(k);
  }
  // Naapurit (hitsatut) ja erilliset osat (syöksyhampaat).
  const adj = new Map();
  const par = new Int32Array(N).map((_, i) => i);
  const find = (a) => { while (par[a] !== a) { par[a] = par[par[a]]; a = par[a]; } return a; };
  const link = (a, b) => {
    if (a === b) return;
    if (!adj.has(a)) adj.set(a, new Set());
    if (!adj.has(b)) adj.set(b, new Set());
    adj.get(a).add(b);
    adj.get(b).add(a);
    a = find(a); b = find(b);
    if (a !== b) par[a] = b;
  };
  const triCount = idx ? idx.length / 3 : N / 3;
  for (let t = 0; t < triCount; t++) {
    const a = rep[idx ? idx[t * 3] : t * 3], b = rep[idx ? idx[t * 3 + 1] : t * 3 + 1], c = rep[idx ? idx[t * 3 + 2] : t * 3 + 2];
    link(a, b); link(b, c); link(c, a);
  }
  const compSize = new Map();
  for (let i = 0; i < N; i++) { const r = find(rep[i]); compSize.set(r, (compSize.get(r) || 0) + 1); }
  let mainComp = -1, best = 0;
  for (const [c, s] of compSize) if (s > best) { best = s; mainComp = c; }

  // 2) Jalkapohjat: k-means (4 ryhmää; kärsä ei kosketa maata).
  const low = [];
  for (let i = 0; i < N; i++) if (rep[i] === i && P.getY(i) < 0.035 && find(i) === mainComp) low.push(i);
  // Alustus kaukaisimman pisteen menetelmällä (ryhmät eivät jää tyhjiksi).
  let C = [];
  {
    let first = low[0];
    for (const i of low) if (P.getZ(i) > P.getZ(first)) first = i;
    C.push([P.getX(first), P.getZ(first)]);
    while (C.length < 4) {
      let far = low[0], fd = -1;
      for (const i of low) {
        let d = 1e9;
        for (const c of C) d = Math.min(d, (P.getX(i) - c[0]) ** 2 + (P.getZ(i) - c[1]) ** 2);
        if (d > fd) { fd = d; far = i; }
      }
      C.push([P.getX(far), P.getZ(far)]);
    }
  }
  let lab = new Int32Array(low.length);
  for (let it = 0; it < 25; it++) {
    const s = C.map(() => [0, 0, 0]);
    low.forEach((i, j) => {
      let b = 0, bd = 1e9;
      for (let k = 0; k < C.length; k++) {
        const d = (P.getX(i) - C[k][0]) ** 2 + (P.getZ(i) - C[k][1]) ** 2;
        if (d < bd) { bd = d; b = k; }
      }
      lab[j] = b;
      s[b][0] += P.getX(i); s[b][1] += P.getZ(i); s[b][2]++;
    });
    C = s.map((v, k) => (v[2] ? [v[0] / v[2], v[1] / v[2]] : C[k]));
  }
  const counts = C.map((_, k) => lab.reduce((s, l) => s + (l === k ? 1 : 0), 0));
  let hx = 0, hc = 0;
  for (let i = 0; i < N; i++) if (P.getY(i) > 0.55 && Math.abs(P.getX(i)) < 0.25) { hx += P.getX(i); hc++; }
  hx /= Math.max(1, hc);
  const feetK = [0, 1, 2, 3];
  // Jalat: etu/taka (z) ja vasen/oikea (x; norsun vasen = +X).
  const feet = feetK.map((k) => ({ k, x: C[k][0], z: C[k][1] }));
  feet.sort((a, b) => b.z - a.z);
  const front = feet.slice(0, 2).sort((a, b) => b.x - a.x);
  const hind = feet.slice(2).sort((a, b) => b.x - a.x);
  const legs = [
    { name: 'LF', foot: front[0] }, { name: 'RF', foot: front[1] },
    { name: 'LH', foot: hind[0] }, { name: 'RH', foot: hind[1] },
  ];

  // Syöksyhampaat: vaalea ja harmaa kohta tekstuurissa (toinen hammas on
  // samaa kappaletta kuin keho).
  const ivory = new Uint8Array(N);
  const img = src.material.map && src.material.map.image;
  const uvA = geo.attributes.uv;
  if (img && uvA) {
    const cv = document.createElement('canvas');
    cv.width = 256; cv.height = 256;
    const g2 = cv.getContext('2d', { willReadFrequently: true });
    g2.drawImage(img, 0, 0, 256, 256);
    const px = g2.getImageData(0, 0, 256, 256).data;
    const flip = src.material.map.flipY;
    for (let i = 0; i < N; i++) {
      const u = uvA.getX(i) - Math.floor(uvA.getX(i)), v = uvA.getY(i) - Math.floor(uvA.getY(i));
      const xx = Math.min(255, Math.floor(u * 256)), yy = Math.min(255, Math.floor((flip ? 1 - v : v) * 256));
      const o = (yy * 256 + xx) * 4;
      const r = px[o], gg = px[o + 1], b = px[o + 2];
      const mxc = Math.max(r, gg, b), mnc = Math.min(r, gg, b);
      if (mxc > 150 && (mxc - mnc) < 0.35 * mxc) ivory[i] = 1;
    }
  }
  // Hammas laajennetaan muutama verteksirengas (tyvi on tummempi).
  {
    let front = [];
    for (let i = 0; i < N; i++) if (ivory[i] && P.getY(i) > 0.22 && P.getZ(i) > 0.1) { ivory[rep[i]] = 2; front.push(rep[i]); }
    for (let ring = 0; ring < 3; ring++) {
      const next = [];
      for (const i of front) {
        const nb = adj.get(i);
        if (!nb) continue;
        for (const j of nb) if (ivory[j] !== 2 && P.getY(j) > 0.26 && P.getZ(j) > 0.12) { ivory[j] = 2; next.push(j); }
      }
      front = next;
    }
    for (let i = 0; i < N; i++) if (ivory[rep[i]] === 2) ivory[i] = 2;
  }
  // Kärsä: kapea alue kasvojen edessä (etujalkojen ja rinnan edessä).
  const nearTrunk = (i) => {
    const y = P.getY(i);
    return y < 0.54 && P.getZ(i) > 0.12 && Math.abs(P.getX(i) - hx) < (y < 0.25 ? 0.14 : 0.11) && ivory[i] !== 2;
  };

  // 3) Täyttö pintaa pitkin lähteistä (jalat + kärsän kärki) lantion alla.
  const label = new Int8Array(N).fill(-1);
  const queue = [];
  // Lähteinä vain jalkapohjan keskiosa (ryhmien rajalla k-means voi sekoittaa).
  low.forEach((i, j) => {
    const c = C[lab[j]];
    if ((P.getX(i) - c[0]) ** 2 + (P.getZ(i) - c[1]) ** 2 > 0.06 * 0.06) return;
    label[i] = legs.findIndex((l) => l.foot.k === lab[j]);
    queue.push(i);
  });
  for (let q = 0; q < queue.length; q++) {
    const i = queue[q];
    const nb = adj.get(i);
    if (!nb) continue;
    for (const j of nb) {
      if (label[j] !== -1) continue;
      if (P.getY(j) > HIP_Y || nearTrunk(j)) continue;
      label[j] = label[i];
      queue.push(j);
    }
  }

  for (let i = 0; i < N; i++) if (rep[i] === i && label[i] === -1 && find(i) === mainComp && nearTrunk(i)) label[i] = 4;
  // Kärsän kiertynyt kärki voi kääntyä taaksepäin: laajennus pintaa pitkin alaosassa.
  {
    const q2 = [];
    for (let i = 0; i < N; i++) if (rep[i] === i && label[i] === 4 && P.getY(i) < 0.3) q2.push(i);
    for (let qi = 0; qi < q2.length; qi++) {
      const nb = adj.get(q2[qi]);
      if (!nb) continue;
      for (const j of nb) if (label[j] === -1 && P.getY(j) < 0.3) { label[j] = 4; q2.push(j); }
    }
  }
  const labelCounts = [0, 0, 0, 0, 0, 0];
  for (let i = 0; i < N; i++) if (rep[i] === i) labelCounts[label[i] + 1]++;
  // 4) Nivelten paikat.
  const centroid = (fn) => {
    const c = new THREE.Vector3();
    let k = 0;
    for (let i = 0; i < N; i++) if (rep[i] === i && fn(i)) { c.x += P.getX(i); c.y += P.getY(i); c.z += P.getZ(i); k++; }
    return k ? c.divideScalar(k) : null;
  };
  for (let l = 0; l < 4; l++) {
    const L = legs[l];
    L.hip = centroid((i) => label[i] === l && P.getY(i) > HIP_Y - 0.07 && P.getY(i) < HIP_Y - 0.02) || new THREE.Vector3(L.foot.x, HIP_Y, L.foot.z);
    L.hip.y = HIP_Y + 0.02;
    L.knee = centroid((i) => label[i] === l && Math.abs(P.getY(i) - KNEE_Y) < 0.02) || new THREE.Vector3(L.foot.x, KNEE_Y, L.foot.z);
    L.footP = new THREE.Vector3(L.foot.x, 0.02, L.foot.z);
  }
  const tusk = (i) => find(rep[i]) !== mainComp || ivory[i] === 2;
  const trunkMid = centroid((i) => label[i] === 4 && P.getY(i) > 0.3 && P.getY(i) < 0.34) || new THREE.Vector3(0, 0.32, 0.36);
  const trunkLow = centroid((i) => label[i] === 4 && P.getY(i) > 0.14 && P.getY(i) < 0.18) || new THREE.Vector3(0, 0.16, 0.35);
  const trunkTop = centroid((i) => P.getZ(i) > 0.3 && Math.abs(P.getX(i)) < 0.09 && P.getY(i) > 0.48 && P.getY(i) < 0.52 && !tusk(i)) || new THREE.Vector3(0, 0.5, 0.36);
  let maxZ = -1, minZ = 1, maxY = 0;
  for (let i = 0; i < N; i++) { maxZ = Math.max(maxZ, P.getZ(i)); minZ = Math.min(minZ, P.getZ(i)); maxY = Math.max(maxY, P.getY(i)); }
  const neck = new THREE.Vector3(0, 0.6, 0.18);
  const earX = 0.17;
  const tailTop = centroid((i) => P.getZ(i) < minZ + 0.06 && P.getY(i) > 0.45 && P.getY(i) < 0.6 && label[i] === -1) || new THREE.Vector3(0, 0.56, minZ + 0.03);

  // 5) Luut (lepokierrot nollia; paikat suoraan mallin koordinaateissa).
  const bones = [];
  const add = (name, pos, parent) => {
    const b = new THREE.Bone();
    b.name = name;
    b.userData.world = pos.clone();
    b.position.copy(pos);
    if (parent) { b.position.sub(parent.userData.world); parent.add(b); }
    bones.push(b);
    return b;
  };
  const root = add('root', new THREE.Vector3(0, 0.45, 0), null);
  const head = add('head', neck, root);
  const t1 = add('trunk1', trunkTop, head);
  const t2 = add('trunk2', trunkMid, t1);
  add('trunk3', trunkLow, t2);
  add('earL', new THREE.Vector3(earX, 0.62, 0.28), head);
  add('earR', new THREE.Vector3(-earX, 0.62, 0.28), head);
  add('tail', tailTop, root);
  for (const L of legs) add('knee' + L.name, L.knee, add('hip' + L.name, L.hip, root));
  const B = Object.fromEntries(bones.map((b, i) => [b.name, i]));

  // 6) Painot.
  const si = new Uint16Array(N * 4);
  const sw = new Float32Array(N * 4);
  const w = new Map();
  for (let i = 0; i < N; i++) {
    const r = rep[i];
    const x = P.getX(i), y = P.getY(i), z = P.getZ(i);
    w.clear();
    const put = (b, v) => { if (v > 1e-4) w.set(b, (w.get(b) || 0) + v); };
    const l = label[r];
    if (tusk(i)) {
      put(B.head, 1);
    } else if (l >= 0 && l < 4) {
      // Jalan pylväs: paino vain jalan akselin lähellä (vatsan sivut jäävät
      // rungolle), ja ylhäällä paino liukuu rungolle.
      const Lg = legs[l];
      const a = y < Lg.knee.y ? Lg.footP : Lg.knee, b = y < Lg.knee.y ? Lg.knee : Lg.hip;
      const tt = Math.min(1, Math.max(0, (y - a.y) / Math.max(1e-3, b.y - a.y)));
      const ax = a.x + (b.x - a.x) * tt, az = a.z + (b.z - a.z) * tt;
      const d = Math.hypot(x - ax, z - az);
      const radial = y < 0.26 ? 1 : smoothstep(LEG_R + 0.04, LEG_R, d);
      const hipW = smoothstep(HIP_Y - 0.02, HIP_Y - 0.12, y) * radial;
      const lower = smoothstep(KNEE_Y + 0.04, KNEE_Y - 0.04, y);
      put(B['hip' + Lg.name], hipW * (1 - lower));
      put(B['knee' + Lg.name], hipW * lower);
      put(B.root, 1 - hipW);
    } else if (l === 4) {
      // Kärsä: kolme osaa korkeuden mukaan, yläpää liittyy päähän.
      const a3 = smoothstep(0.22, 0.14, y);
      const a2 = smoothstep(0.38, 0.28, y) * (1 - a3);
      const top = 1 - a2 - a3;
      const hk = smoothstep(0.46, 0.56, y);
      put(B.trunk3, a3);
      put(B.trunk2, a2);
      put(B.trunk1, top * (1 - hk));
      put(B.head, top * hk);
    } else {
      // Pää ja korvat edessä, häntä takana, muuten runko.
      const hw = smoothstep(0.08, 0.22, z) * smoothstep(0.36, 0.46, y);
      const ear = smoothstep(earX - 0.01, earX + 0.06, Math.abs(x)) * smoothstep(0.46, 0.52, y) * smoothstep(0.12, 0.2, z);
      const tw = smoothstep(minZ + 0.07, minZ + 0.03, z) * smoothstep(0.08, 0.14, y) * (y < tailTop.y + 0.03 ? 1 : 0);
      put(x > 0 ? B.earL : B.earR, ear);
      put(B.head, hw * (1 - ear));
      put(B.tail, tw * (1 - hw));
      put(B.root, Math.max(0, 1 - hw * (1 - ear) - ear - tw * (1 - hw)));
    }
    const list = [...w.entries()].sort((p, q) => q[1] - p[1]).slice(0, 4);
    const s = list.reduce((a, e) => a + e[1], 0) || 1;
    list.forEach(([b, v], k) => { si[i * 4 + k] = b; sw[i * 4 + k] = v / s; });
    if (!list.length) { si[i * 4] = B.root; sw[i * 4] = 1; }
  }
  geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4));
  geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
  geo.computeBoundingSphere();

  geo.userData.debugLabel = Array.from({ length: N }, (_, i) => label[rep[i]]);
  const material = src.material;
  material.side = THREE.FrontSide;
  const mesh = new THREE.SkinnedMesh(geo, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  const group = new THREE.Group();
  const holder = new THREE.Group();
  holder.scale.setScalar(ELEPHANT_SCALE);
  // Origo jalkojen puoliväliin (törmäykset ja kääntyminen rungon keskeltä).
  const zc = legs.reduce((a, L) => a + L.hip.z, 0) / 4;
  holder.position.z = -zc * ELEPHANT_SCALE;
  holder.add(root);
  holder.add(mesh);
  group.add(holder);
  group.updateMatrixWorld(true);
  mesh.bind(new THREE.Skeleton(bones));
  // Jalkojen IK:n vakiot (luun 'root' lepopaikan suhteen, YZ-taso). Jalka
  // käsitellään suorana pylväänä lonkasta jalkapohjaan (pituus d0, lepokulma
  // th0); polvi jakaa sen samassa suhteessa kuin mallissa.
  const R0 = root.userData.world;
  const ik = legs.map((L) => {
    const a = L.knee.distanceTo(L.hip), b = L.footP.distanceTo(L.knee);
    const hy = L.hip.y - R0.y, hz = L.hip.z - R0.z, fy = L.footP.y - R0.y, fz = L.footP.z - R0.z;
    const d0 = Math.hypot(fz - hz, fy - hy);
    return {
      name: L.name, front: L.name.endsWith('F'),
      hy, hz, fy, d0, th0: Math.atan2(fz - hz, hy - fy), ra: a / (a + b),
    };
  });
  // Etu- ja takajalkojen z maailman yksiköissä (maaston kallistus).
  const legZ = (a, b) => ((legs[a].hip.z + legs[b].hip.z) / 2 - zc) * ELEPHANT_SCALE;
  return { group, material, legs: ik, rootY: R0.y, zF: legZ(0, 1), zH: legZ(2, 3), info: { feet: legs.map((L) => [L.name, L.foot.x.toFixed(3), L.foot.z.toFixed(3)]), ang, clusters: C.map((c, k) => [c[0].toFixed(3), c[1].toFixed(3), counts[k]]), hx, ivory: ivory.reduce((a, b) => a + b, 0), labelCounts, knees: legs.map((L) => L.knee.toArray().map((v) => +v.toFixed(3))), hips: legs.map((L) => L.hip.toArray().map((v) => +v.toFixed(3))) } };
}

// Uusi norsu (oma luuranko ja materiaali).
export function makeElephant() {
  if (!template) return null;
  const group = cloneSkinned(template.group);
  let mesh = null;
  group.traverse((o) => { if (o.isSkinnedMesh) mesh = o; });
  const material = template.material.clone();
  mesh.material = material;
  // Kiinteä rajauspallo (luut liikkuvat vain vähän): näkymän ulkopuolella
  // olevaa norsua ei piirretä.
  mesh.frustumCulled = true;
  mesh.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0.4, 0.05), 0.72);
  const bone = (n) => group.getObjectByName(n);
  return {
    group, material, kind: 'elephant', skeleton: mesh.skeleton,
    bones: {
      root: bone('root'), head: bone('head'), trunk: [bone('trunk1'), bone('trunk2'), bone('trunk3')],
      earL: bone('earL'), earR: bone('earR'), tail: bone('tail'),
      legs: template.legs.map((L) => ({ ...L, hip: bone('hip' + L.name), knee: bone('knee' + L.name) })),
    },
    rootY: template.rootY, zF: template.zF, zH: template.zH,
  };
}

export function elephantInfo() {
  return template && template.info;
}

// --- Animaatio --------------------------------------------------------------
// Käynti on sivuttaiskäyntiä kuten oikealla norsulla: vasen taka, vasen etu,
// oikea taka, oikea etu neljännesjakson välein. Tukivaiheessa jalka pysyy
// maassa paikallaan (jalkapohja liikkuu taaksepäin kulkunopeudella), ja
// lonkka- ja polvikulma ratkaistaan kahden luun IK:lla. Kärsä heilahtaa
// askelten tahdissa ja laiduntaessa poimii ruohoa, korvat leyhyvät ja häntä
// huiskii.
const GAIT = { LH: 0, LF: 0.25, RH: 0.5, RF: 0.75 };
const DUTY = 0.68; // osuus jaksosta, jonka jalka on maassa

// Kahden luun IK suoraksi oletetulle jalalle. stance: tukijalka pidetään
// lähes suorana (ei kyykistele, vaikka kohde olisi hieman lähempänä).
function solveLeg(L, tz, ty, stance) {
  const a = L.d0 * L.ra, b = L.d0 - a;
  const rz = tz - L.hz, ry = ty - L.hy;
  let d = Math.hypot(rz, ry);
  d = stance ? Math.min(L.d0 * 0.9995, Math.max(L.d0 * 0.996, d)) : Math.min(L.d0 * 0.9995, Math.max(Math.abs(a - b) + 1e-3, d));
  const phi = Math.atan2(rz, -ry);
  const c = (a * a + d * d - b * b) / (2 * a * d);
  const tu = phi + Math.acos(Math.min(1, Math.max(-1, c))); // polvi eteen
  const kz = Math.sin(tu) * a, ky = -Math.cos(tu) * a;
  const tl = Math.atan2(Math.sin(phi) * d - kz, Math.cos(phi) * d + ky);
  const hip = L.th0 - tu;
  L.hip.rotation.x = hip;
  L.knee.rotation.x = L.th0 - tl - hip;
}

// o: speed (m/s), turn (rad/s), t (s), graze 0..1, alert 0..1, look (rad,
// pään kääntö), dhF, dhH (maaston korkeus etu- ja takajalkojen kohdalla
// keskikohtaan nähden, m).
export function animateElephant(e, o, dt) {
  const B = e.bones;
  const S = e.anim || (e.anim = { cyc: Math.random(), w: 0, rF: 0, rH: 0, graze: 0, alert: 0, look: 0, flap: 0, ph: Math.random() * 9 });
  const k = (hz) => 1 - Math.exp(-dt * hz);
  // Paikallaan kääntyminen saa myös jalat askeltamaan.
  const v = Math.max(o.speed, Math.abs(o.turn || 0) * 1.4);
  const D = 1.3 + 0.35 * Math.min(v, 3); // matka askeljaksoa kohden (m)
  S.cyc = (S.cyc + (v / D) * dt) % 1;
  S.w += (smoothstep(0.06, 0.4, v) - S.w) * k(3);
  const stride = (DUTY * D / ELEPHANT_SCALE) * S.w;
  const lift = 0.05 * S.w;
  // Jalkapohjien kohteet (juuriluun lepokoordinaateissa) ja rungon nousu:
  // suora tukijalka nostaa runkoa askeleen keskellä ja laskee ääripäissä.
  // Etu- ja takapää lasketaan erikseen (rinne kallistaa runkoa).
  const rise = [0, 0], wsum = [0, 0];
  const feet = [];
  for (const L of B.legs) {
    const p = (S.cyc + GAIT[L.name]) % 1;
    const g = Math.max(-0.12, Math.min(0.12, ((L.front ? o.dhF : o.dhH) || 0) / ELEPHANT_SCALE));
    let z, y = L.fy + g;
    const stance = p < DUTY;
    if (stance) {
      const s = p / DUTY;
      z = L.hz + stride * (0.5 - s);
      const h = Math.sqrt(Math.max(0, L.d0 * L.d0 - (z - L.hz) ** 2));
      const wt = 0.1 + Math.sin(Math.PI * s);
      const j = L.front ? 0 : 1;
      rise[j] += (y - L.hy + h) * wt;
      wsum[j] += wt;
    } else {
      const s = (p - DUTY) / (1 - DUTY);
      z = L.hz + stride * (s * s * (3 - 2 * s) - 0.5);
      y += lift * (L.front ? 1.15 : 1) * Math.sin(Math.PI * Math.min(1, s * 1.12));
    }
    feet.push(z, y, stance);
  }
  const rF = wsum[0] ? rise[0] / wsum[0] : 0, rH = wsum[1] ? rise[1] / wsum[1] : 0;
  S.rF += (rF - S.rF) * k(9);
  S.rH += (rH - S.rH) * k(9);
  // Lantion ja hartioiden z (juuriluun suhteen) -> kallistus ja korkeus.
  const zF = (B.legs[0].hz + B.legs[1].hz) / 2, zH = (B.legs[2].hz + B.legs[3].hz) / 2;
  const pitch = (S.rH - S.rF) / (zF - zH);
  const off = S.rF + zF * pitch;
  B.root.position.y = e.rootY + off;
  B.root.rotation.x = pitch;
  // Paino siirtyy puolelta toiselle askelten tahdissa.
  const sway = Math.sin((S.cyc + 0.1) * Math.PI * 2);
  B.root.rotation.z = sway * 0.012 * S.w;
  // Kohteet juuriluun omaan koordinaatistoon (kallistus ja nousu pois).
  const cp = Math.cos(pitch), sp = Math.sin(pitch);
  B.legs.forEach((L, i) => {
    const z = feet[i * 3], y = feet[i * 3 + 1] - off;
    solveLeg(L, -y * sp + z * cp, y * cp + z * sp, feet[i * 3 + 2]);
  });

  // Pää: laiduntaessa alempana, valppaana ylhäällä ja kohti pelaajaa.
  S.graze += ((o.graze || 0) - S.graze) * k(1.5);
  S.alert += ((o.alert || 0) - S.alert) * k(2.5);
  S.look += ((o.look || 0) * S.alert - S.look) * k(2);
  const t = o.t + S.ph;
  const step2 = Math.sin(S.cyc * Math.PI * 4);
  B.head.rotation.x = 0.1 * S.graze - 0.12 * S.alert + step2 * 0.025 * S.w + Math.sin(t * 0.5) * 0.015;
  B.head.rotation.y = Math.max(-0.45, Math.min(0.45, S.look)) + Math.sin(t * 0.23) * 0.04 * (1 - S.alert);
  B.head.rotation.z = -sway * 0.02 * S.w;

  // Kärsä: heiluri askelten tahdissa ja hitaasti sivulle; laiduntaessa se
  // poimii ruohoa (kierähtää kärjestä ja nousee suulle). Osat jättävät
  // toisistaan jälkeen, joten liike kulkee aaltona kärkeä kohti.
  const eat = S.graze * Math.max(0, Math.sin(t * 0.9)) ** 2;
  const T = B.trunk;
  for (let i = 0; i < 3; i++) {
    const lag = i * 0.55;
    const swing = Math.sin(S.cyc * Math.PI * 2 - lag) * 0.07 * S.w;
    const idle = Math.sin(t * 0.7 - lag) * 0.05 + Math.sin(t * 1.9 - lag) * 0.015;
    T[i].rotation.x = swing - eat * [0.25, 0.55, 1.0][i] + S.alert * [0.0, -0.15, -0.35][i] + idle * 0.5;
    T[i].rotation.z = Math.sin(t * 0.45 - lag) * (0.06 + i * 0.03) + Math.sin(S.cyc * Math.PI * 2 - lag) * 0.03 * S.w;
  }

  // Korvat: rauhallinen leyhytys (viilennys); valppaana levällään.
  const flap = Math.max(0, Math.sin(t * 1.15)) ** 3 * (0.25 + 0.75 * smoothstep(0.2, 0.8, Math.sin(t * 0.13)));
  const ear = 0.05 + flap * 0.32 + S.alert * 0.55;
  B.earL.rotation.y = ear;
  B.earR.rotation.y = -(0.05 + Math.max(0, Math.sin(t * 1.15 + 0.6)) ** 3 * 0.3 * (0.25 + 0.75 * smoothstep(0.2, 0.8, Math.sin(t * 0.13 + 1))) + S.alert * 0.55);
  B.earL.rotation.x = B.earR.rotation.x = flap * 0.05;

  // Häntä huiskii.
  B.tail.rotation.z = Math.sin(t * 1.6) * 0.28 + Math.sin(t * 0.37) * 0.12;
  B.tail.rotation.x = -0.05 - 0.08 * Math.max(0, Math.sin(t * 0.8));
}
