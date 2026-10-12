// Apufunktiot proseduraalisille malleille (vertex-väritetyt BufferGeometryt).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mulberry32 } from '../noise.js';

const _color = new THREE.Color();
const _up = new THREE.Vector3(0, 1, 0);
const _dir = new THREE.Vector3();
const _q = new THREE.Quaternion();

export const V = (x, y, z) => new THREE.Vector3(x, y, z);

// Erillinen satunnaislukuvirta jokaiselle osalle: näin mallin muoto pysyy
// samana, vaikka yksityiskohtaisuus (kolmioiden määrä) vaihtelee.
export function partRand(seed, k) {
  return mulberry32((Math.imul(seed + 1, 2654435761) + k * 7919) >>> 0);
}

export function prep(geo) {
  const keepUv = !!(geo.userData && geo.userData.keepUv);
  if (geo.index) geo = geo.toNonIndexed();
  for (const name of Object.keys(geo.attributes)) {
    if (name !== 'position' && name !== 'normal' && name !== 'color' && !(keepUv && name === 'uv')) geo.deleteAttribute(name);
  }
  return geo;
}

// Sessio 23: lehtiatlaksen (assets/textures/leaves.png) läpinäkymätön valkoinen
// nurkka: rungot ja muut osat ilman omaa tekstuuria osoittavat tähän.
export const WHITE_UV = [0.996, 0.993];

// Lisää puuttuvat UV-koordinaatit (valkoinen nurkka), jotta geometria toimii
// lehtiatlasta käyttävän materiaalin kanssa.
export function ensureUv(geo) {
  if (!geo || geo.attributes.uv) return geo;
  const n = geo.attributes.position.count;
  const uv = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) { uv[i * 2] = WHITE_UV[0]; uv[i * 2 + 1] = WHITE_UV[1]; }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return geo;
}

// Sessio 23: lehtikortit latvukseen. Ellipsoidin (center, scale, kierto rotY)
// pinnalle asetetaan läpikuultavia kortteja, jotka näyttävät lehtiatlaksen
// oksarypästä (kind 'acacia' = vasen puolisko, 'broad' = oikea). Normaalit
// osoittavat ulos latvuksen keskeltä (pehmeä, pallomainen valaistus).
// under = kuinka paljon kortteja alapinnalle (0,5 = vähän, 1 = tasaisesti).
export function leafCards(center, scale, rotY, hex, rand, kind = 'broad', density = 1, size = 1, under = 0.5) {
  const area = 4 * Math.PI * Math.pow((scale.x * scale.y + scale.x * scale.z + scale.y * scale.z) / 3, 1);
  const n = Math.max(4, Math.round(area * 2.2 * density));
  const u0 = kind === 'acacia' ? 0 : 0.5;
  const P = [], N = [], C = [], U = [];
  const col = new THREE.Color(hex);
  const cr = Math.cos(rotY), sr = Math.sin(rotY);
  const d = new THREE.Vector3(), t1 = new THREE.Vector3(), t2 = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < n; i++) {
    // Suunta: painottuu ylös ja sivuille (alapinta harvempi).
    const yy = rand() * (1 + under) - under;
    const th = rand() * Math.PI * 2;
    const rr = Math.sqrt(Math.max(0, 1 - yy * yy));
    d.set(Math.cos(th) * rr, yy, Math.sin(th) * rr).normalize();
    const lx = d.x * scale.x, lz = d.z * scale.z;
    const px = center.x + lx * cr - lz * sr, py = center.y + d.y * scale.y * 1.05, pz = center.z + lx * sr + lz * cr;
    const nx = d.x * cr - d.z * sr, nz = d.x * sr + d.z * cr;
    const nrm = new THREE.Vector3(nx, d.y * 1.4 + 0.4, nz).normalize();
    // Kortin taso: kohti ulkoa, satunnainen kierto ja kallistus.
    t1.copy(Math.abs(nrm.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : up).cross(nrm).normalize();
    t2.copy(nrm).cross(t1).normalize();
    const a = rand() * Math.PI * 2, tilt = (rand() - 0.5) * 1.2;
    const ax = t1.clone().multiplyScalar(Math.cos(a)).addScaledVector(t2, Math.sin(a));
    const ay = nrm.clone().cross(ax).normalize().applyAxisAngle(ax, tilt);
    const h = (0.55 + rand() * 0.35) * size * (kind === 'acacia' ? 1.25 : 1);
    const corners = [[-1, -1], [1, -1], [1, 1], [-1, -1], [1, 1], [-1, 1]];
    const j = 0.82 + rand() * 0.3;
    for (const [cx, cy] of corners) {
      P.push(px + (ax.x * cx + ay.x * cy) * h, py + (ax.y * cx + ay.y * cy) * h, pz + (ax.z * cx + ay.z * cy) * h);
      N.push(nrm.x, nrm.y, nrm.z);
      C.push(col.r * j, col.g * j, col.b * j);
      U.push(u0 + (cx * 0.5 + 0.5) * 0.5, cy * 0.5 + 0.5);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2));
  g.userData.keepUv = true;
  return g;
}

// Siirtää verteksejä niin, että samassa pisteessä olevat verteksit siirtyvät
// samalla tavalla (pinta ei repeä).
export function displace(geo, fn) {
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
export function paint(geo, hex, { jitter = 0.08, rand = Math.random, shade = null } = {}) {
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

// Sylinteri pisteestä a pisteeseen b. Päädyt jätetään oletuksena pois.
export function limb(a, b, r0, r1, seg = 5, capped = false, heightSeg = 1) {
  _dir.subVectors(b, a);
  const len = _dir.length();
  const geo = new THREE.CylinderGeometry(r1, r0, len, seg, heightSeg, !capped);
  geo.translate(0, len / 2, 0);
  _q.setFromUnitVectors(_up, _dir.normalize());
  geo.applyQuaternion(_q);
  geo.translate(a.x, a.y, a.z);
  return geo;
}

export function flatNormals(geo) {
  geo = prep(geo);
  geo.computeVertexNormals();
  return geo;
}

// Kaksipuolinen nauha (lehti, palmunlehti) pisteiden polkua pitkin.
// widths[i] = leveys pisteessä i, side = leveyssuunta.
export function strip(points, widths, side, hex, rand, shadeFn = null) {
  const pos = [];
  const add = (a, b, c) => pos.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i], p1 = points[i + 1];
    const a0 = p0.clone().addScaledVector(side, widths[i] / 2);
    const b0 = p0.clone().addScaledVector(side, -widths[i] / 2);
    const a1 = p1.clone().addScaledVector(side, widths[i + 1] / 2);
    const b1 = p1.clone().addScaledVector(side, -widths[i + 1] / 2);
    // Etupuoli + takapuoli
    add(a0, b0, a1); add(b0, b1, a1);
    add(a0, a1, b0); add(b0, a1, b1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return paint(g, hex, { rand, jitter: 0.1, shade: shadeFn });
}

// Yhdistää osat. Osa, jolla on userData.tag, saa verteksialueen talteen
// (esim. puun runko loveamista varten).
export function merge(geos) {
  const prepared = geos.map((g) => {
    const tag = g.userData && g.userData.tag;
    const out = g.attributes.color ? prep(g) : paint(g, 0xff00ff);
    out.userData.tag = tag;
    return out;
  });
  // Sessio 23: jos jollain osalla on UV (lehtikortit), kaikille lisätään.
  if (prepared.some((g) => g.attributes.uv)) prepared.forEach(ensureUv);
  const ranges = {};
  let offset = 0;
  for (const g of prepared) {
    const n = g.attributes.position.count;
    const tag = g.userData.tag;
    if (tag) {
      if (!ranges[tag]) ranges[tag] = [offset, offset + n];
      else ranges[tag][1] = offset + n;
    }
    offset += n;
  }
  const out = mergeGeometries(prepared, false);
  out.userData.ranges = ranges;
  if (out.attributes.uv) out.userData.keepUv = true; // lehtikorttien UV säilyy
  out.computeBoundingBox();
  out.computeBoundingSphere();
  return out;
}

export function tag(geo, name) {
  geo.userData.tag = name;
  return geo;
}
