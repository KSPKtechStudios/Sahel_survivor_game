// Puun rungon käsittely: lovet hakatessa ja halkaisu kannoksi + kaatuvaksi
// osaksi. Kaikki laskenta tehdään mallin omassa koordinaatistossa
// (geometry.userData.tree kertoo rungon akselin).
import * as THREE from 'three';

const INNER = new THREE.Color(0xd2ad78); // tuore puu loven kohdalla
const RING = new THREE.Color(0xb88f5c);

export function trunkAxis(meta) {
  const base = new THREE.Vector3().fromArray(meta.base);
  const top = new THREE.Vector3().fromArray(meta.top);
  const axis = top.clone().sub(base);
  const len = axis.length();
  axis.divideScalar(len);
  const cutS = ((meta.cutY - base.y) / (top.y - base.y)) * len;
  return { base, top, axis, len, cutS };
}

// Muokattava kopio puun geometriasta: alkuperäiset sijainnit ja värit talteen.
export function makeChoppable(geometry) {
  const geo = geometry.clone();
  geo.userData = { ...geometry.userData };
  geo.userData.origPos = new Float32Array(geo.attributes.position.array);
  geo.userData.origCol = new Float32Array(geo.attributes.color.array);
  geo.userData.notches = [];
  return geo;
}

const _v = new THREE.Vector3();
const _r = new THREE.Vector3();
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _c = new THREE.Vector3();
const _n = new THREE.Vector3();

// Lisää tai syvennä lovea. hitLocal = osumakohta, fromLocal = suunta kohti
// lyöjää (mallin koordinaatistossa). s = kohta rungon akselilla (null = osuman kohta).
export function addNotch(geo, hitLocal, fromLocal, s = null, amount = 1) {
  const meta = geo.userData.tree;
  const ax = trunkAxis(meta);
  const sHit = s ?? THREE.MathUtils.clamp(_v.copy(hitLocal).sub(ax.base).dot(ax.axis), 0.15, ax.len - 0.1);
  // Suunta akselia vastaan kohtisuoraan
  const dir = _r.copy(fromLocal).addScaledVector(ax.axis, -fromLocal.dot(ax.axis));
  if (dir.lengthSq() < 1e-6) dir.set(1, 0, 0);
  dir.normalize();
  const notches = geo.userData.notches;
  let n = notches.find((x) => Math.abs(x.s - sHit) < 0.35 && x.dir.dot(dir) > 0.55);
  if (!n) {
    n = { s: sHit, dir: dir.clone(), depth: 0 };
    notches.push(n);
  } else {
    n.dir.lerp(dir, 0.3).normalize();
  }
  const rAt = meta.r0 + (meta.r1 - meta.r0) * (sHit / ax.len);
  n.depth = Math.min(rAt * 0.92, n.depth + rAt * 0.24 * amount);
  applyNotches(geo);
}

export function applyNotches(geo) {
  const meta = geo.userData.tree;
  const range = geo.userData.ranges && geo.userData.ranges.trunk;
  if (!range) return;
  const ax = trunkAxis(meta);
  const pos = geo.attributes.position;
  const col = geo.attributes.color;
  const op = geo.userData.origPos;
  const oc = geo.userData.origCol;
  const notches = geo.userData.notches;
  for (let i = range[0]; i < range[1]; i++) {
    _v.set(op[i * 3], op[i * 3 + 1], op[i * 3 + 2]);
    const s = _v.clone().sub(ax.base).dot(ax.axis);
    const center = _a.copy(ax.base).addScaledVector(ax.axis, s);
    const rv = _b.copy(_v).sub(center);
    const r = rv.length();
    if (r < 1e-5) continue;
    rv.divideScalar(r);
    let depth = 0;
    for (const n of notches) {
      const half = 0.12 + n.depth * 0.9;
      const prof = Math.max(0, 1 - Math.abs(s - n.s) / half);
      const facing = THREE.MathUtils.smoothstep(rv.dot(n.dir), -0.15, 0.75);
      depth += n.depth * prof * facing;
    }
    const nr = Math.max(r * 0.08, r - depth);
    pos.setXYZ(i, center.x + rv.x * nr, center.y + rv.y * nr, center.z + rv.z * nr);
    const t = Math.min(1, depth / Math.max(0.02, r * 0.35));
    col.setXYZ(
      i,
      oc[i * 3] + (INNER.r - oc[i * 3]) * t,
      oc[i * 3 + 1] + (INNER.g - oc[i * 3 + 1]) * t,
      oc[i * 3 + 2] + (INNER.b - oc[i * 3 + 2]) * t,
    );
  }
  // Rungon kolmioille tasaiset normaalit uudelleen
  const nrm = geo.attributes.normal;
  for (let i = range[0]; i < range[1]; i += 3) {
    _a.fromBufferAttribute(pos, i);
    _b.fromBufferAttribute(pos, i + 1);
    _c.fromBufferAttribute(pos, i + 2);
    _n.subVectors(_c, _b).cross(_v.subVectors(_a, _b)).normalize();
    for (let k = 0; k < 3; k++) nrm.setXYZ(i + k, _n.x, _n.y, _n.z);
  }
  pos.needsUpdate = true;
  col.needsUpdate = true;
  nrm.needsUpdate = true;
}

// Halkaise puu kaatokohdasta: { stump, top }. Molempiin lisätään vaalea
// leikkauspinta. top-geometria siirretään niin, että kaatokohta on origossa.
export function splitTree(geo) {
  const meta = geo.userData.tree;
  const ax = trunkAxis(meta);
  const range = (geo.userData.ranges && geo.userData.ranges.trunk) || [0, 0];
  const pos = geo.attributes.position;
  const nrm = geo.attributes.normal;
  const col = geo.attributes.color;
  const stump = { p: [], n: [], c: [] };
  const top = { p: [], n: [], c: [] };
  const eps = 1e-3;
  const below = (i) => {
    _v.fromBufferAttribute(pos, i);
    if (i >= range[0] && i < range[1]) return _v.sub(ax.base).dot(ax.axis) <= ax.cutS + eps;
    return _v.y < meta.cutY - 0.05;
  };
  let topTrunk = 0;
  for (let i = 0; i < pos.count; i += 3) {
    const tgt = below(i) && below(i + 1) && below(i + 2) ? stump : top;
    if (tgt === top && i >= range[0] && i < range[1]) topTrunk += 3;
    for (let k = 0; k < 3; k++) {
      tgt.p.push(pos.getX(i + k), pos.getY(i + k), pos.getZ(i + k));
      tgt.n.push(nrm.getX(i + k), nrm.getY(i + k), nrm.getZ(i + k));
      tgt.c.push(col.getX(i + k), col.getY(i + k), col.getZ(i + k));
    }
  }

  // Leikkauspinnan rengas: rungon verteksit kaatokohdassa.
  const ring = [];
  const seen = new Set();
  for (let i = range[0]; i < range[1]; i++) {
    _v.fromBufferAttribute(pos, i);
    const s = _v.clone().sub(ax.base).dot(ax.axis);
    if (Math.abs(s - ax.cutS) > 0.02) continue;
    const key = `${Math.round(_v.x * 1e3)},${Math.round(_v.y * 1e3)},${Math.round(_v.z * 1e3)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    ring.push(_v.clone());
  }
  const center = ax.base.clone().addScaledVector(ax.axis, ax.cutS);
  if (ring.length >= 3) {
    const ref = Math.abs(ax.axis.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
    const u = ref.clone().cross(ax.axis).normalize();
    const w = ax.axis.clone().cross(u);
    ring.sort((p, q) => {
      const pa = Math.atan2(p.clone().sub(center).dot(w), p.clone().sub(center).dot(u));
      const qa = Math.atan2(q.clone().sub(center).dot(w), q.clone().sub(center).dot(u));
      return pa - qa;
    });
    const cap = (tgt, up) => {
      for (let i = 0; i < ring.length; i++) {
        const a = ring[i];
        const b = ring[(i + 1) % ring.length];
        const tri = up ? [center, a, b] : [center, b, a];
        _n.subVectors(tri[2], tri[1]).cross(_v.subVectors(tri[0], tri[1])).normalize();
        tri.forEach((p, k) => {
          tgt.p.push(p.x, p.y, p.z);
          tgt.n.push(_n.x, _n.y, _n.z);
          const c = k === 0 ? RING : INNER;
          tgt.c.push(c.r, c.g, c.b);
        });
      }
    };
    // Tarkista kiertosuunta: kannon kannen normaalin pitää osoittaa akselin suuntaan.
    _n.subVectors(ring[1], ring[0]).cross(_v.subVectors(center, ring[0]));
    const upFirst = _n.dot(ax.axis) < 0;
    cap(stump, upFirst);
    cap(top, !upFirst);
  }

  const build = (d, offset) => {
    const g = new THREE.BufferGeometry();
    const p = new Float32Array(d.p);
    if (offset) {
      for (let i = 0; i < p.length; i += 3) { p[i] -= offset.x; p[i + 1] -= offset.y; p[i + 2] -= offset.z; }
    }
    g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(d.n, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(d.c, 3));
    g.computeBoundingSphere();
    return g;
  };
  const stumpGeo = build(stump, null);
  const topGeo = build(top, center);
  // Kaatunut osa: rungon akseli alkaa nyt origosta.
  const tmeta = { ...meta, base: [0, 0, 0], top: ax.top.clone().sub(center).toArray(), cutY: -1, r0: meta.r0 + (meta.r1 - meta.r0) * (ax.cutS / ax.len) };
  if (meta.logTop) tmeta.logTop = new THREE.Vector3().fromArray(meta.logTop).sub(center).toArray();
  topGeo.userData.tree = tmeta;
  // Runko on mallin ensimmäinen osa, joten sen kolmiot ovat kaatuneen osan alussa.
  topGeo.userData.ranges = { trunk: [0, topTrunk] };
  return { stump: stumpGeo, top: topGeo, cutLocal: center };
}
