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
  if (geo.index) geo = geo.toNonIndexed();
  for (const name of Object.keys(geo.attributes)) {
    if (name !== 'position' && name !== 'normal' && name !== 'color') geo.deleteAttribute(name);
  }
  return geo;
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
  out.computeBoundingBox();
  out.computeBoundingSphere();
  return out;
}

export function tag(geo, name) {
  geo.userData.tag = name;
  return geo;
}
