// Sessio 58: orgaaniset muodot etäisyyskentästä (käyttäjä: muinaisen juurakon
// ja sammaloituneen rungon mallien pitää olla paljon parempia).
//
// Muoto kootaan ruudukkoon (etäisyys pinnasta, negatiivinen = sisällä):
// juuret ja oksantyngät ovat kartiomaisia kapseleita, jotka liitetään
// pehmeästi toisiinsa (smooth min), jolloin liitoskohdat kaartuvat
// luontevasti kuten oikeassa puussa. Pinta poimitaan "surface nets"
// -menetelmällä (yksi kärkipiste solua kohden), normaalit kentän
// gradientista ja varjostus (AO) kentästä: koloissa ja juurten välissä
// on tummempaa. Ruudukon alareuna on maan alla, eikä sinne tehdä pohjaa.
import * as THREE from 'three';

// --- 3D-arvokohina --------------------------------------------------------------

function hash3(x, y, z, s) {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(z, 2147483647) ^ Math.imul(s, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1103515245);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export function noise3(x, y, z, s = 0) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  let fx = x - xi, fy = y - yi, fz = z - zi;
  fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy); fz = fz * fz * (3 - 2 * fz);
  const l = (a, b, t) => a + (b - a) * t;
  const c = (i, j, k) => hash3(xi + i, yi + j, zi + k, s);
  return l(
    l(l(c(0, 0, 0), c(1, 0, 0), fx), l(c(0, 1, 0), c(1, 1, 0), fx), fy),
    l(l(c(0, 0, 1), c(1, 0, 1), fx), l(c(0, 1, 1), c(1, 1, 1), fx), fy),
    fz,
  ) * 2 - 1;
}

export function fbm3(x, y, z, s = 0, oct = 3) {
  let a = 0, amp = 0.5, f = 1;
  for (let o = 0; o < oct; o++) { a += noise3(x * f, y * f, z * f, s + o * 31) * amp; amp *= 0.5; f *= 2.03; }
  return a;
}

// Pehmeä minimi ja maksimi (polynomi): k = liitoksen säde metreinä.
export function smin(a, b, k) {
  if (k <= 0) return Math.min(a, b);
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
}
export function smax(a, b, k) { return -smin(-a, -b, k); }

// --- Kenttä -----------------------------------------------------------------------

export class SdfField {
  // min/max: rajat (THREE.Vector3 tai [x, y, z]), cell = solun koko metreinä.
  constructor(min, max, cell) {
    const mn = Array.isArray(min) ? min : [min.x, min.y, min.z];
    const mx = Array.isArray(max) ? max : [max.x, max.y, max.z];
    this.cell = cell;
    this.ox = mn[0]; this.oy = mn[1]; this.oz = mn[2];
    this.nx = Math.ceil((mx[0] - mn[0]) / cell) + 1;
    this.ny = Math.ceil((mx[1] - mn[1]) / cell) + 1;
    this.nz = Math.ceil((mx[2] - mn[2]) / cell) + 1;
    this.d = new Float32Array(this.nx * this.ny * this.nz).fill(1e3);
  }

  idx(i, j, k) { return (k * this.ny + j) * this.nx + i; }

  // Käy läpi rajatun laatikon pisteet: fn(x, y, z, i) palauttaa uuden arvon.
  _box(x0, y0, z0, x1, y1, z1, fn) {
    const c = this.cell;
    const i0 = Math.max(0, Math.floor((x0 - this.ox) / c)), i1 = Math.min(this.nx - 1, Math.ceil((x1 - this.ox) / c));
    const j0 = Math.max(0, Math.floor((y0 - this.oy) / c)), j1 = Math.min(this.ny - 1, Math.ceil((y1 - this.oy) / c));
    const k0 = Math.max(0, Math.floor((z0 - this.oz) / c)), k1 = Math.min(this.nz - 1, Math.ceil((z1 - this.oz) / c));
    const d = this.d;
    for (let k = k0; k <= k1; k++) {
      const z = this.oz + k * c;
      for (let j = j0; j <= j1; j++) {
        const y = this.oy + j * c;
        let i = this.idx(i0, j, k);
        for (let ii = i0; ii <= i1; ii++, i++) d[i] = fn(this.ox + ii * c, y, z, d[i]);
      }
    }
  }

  // Kartiomainen kapseli a -> b (säteet r0, r1), liitetään pehmeästi (k).
  // mode: 'add' (yhdiste) tai 'sub' (kaiverrus). o (valinnainen):
  //   flute = uurteiden syvyys (osuus säteestä), n = uurteiden määrä,
  //   twist = kierre (rad / m), s0 = matka ketjun alusta (uurteet jatkuvat
  //   saumattomasti), phase, flat = poikkileikkauksen korkeus / leveys.
  cone(a, b, r0, r1, k = 0.1, mode = 'add', o = null) {
    const m = Math.max(r0, r1) * (1 + (o && o.flute ? o.flute : 0)) / Math.min(1, (o && o.flat) || 1) + k + this.cell * 2;
    const bax = b[0] - a[0], bay = b[1] - a[1], baz = b[2] - a[2];
    const bb = bax * bax + bay * bay + baz * baz || 1e-9;
    const len = Math.sqrt(bb);
    let dist;
    if (!o) {
      dist = (x, y, z) => {
        const px = x - a[0], py = y - a[1], pz = z - a[2];
        const t = Math.max(0, Math.min(1, (px * bax + py * bay + pz * baz) / bb));
        return Math.hypot(px - bax * t, py - bay * t, pz - baz * t) - (r0 + (r1 - r0) * t);
      };
    } else {
      // Poikkileikkauksen kehys: "ylös" kohtisuoraan akselia vastaan.
      const ax = bax / len, ay = bay / len, az = baz / len;
      let ux = 0, uy = 1, uz = 0;
      if (Math.abs(ay) > 0.9) { ux = 1; uy = 0; }
      const dd = ux * ax + uy * ay + uz * az;
      ux -= ax * dd; uy -= ay * dd; uz -= az * dd;
      const ul = Math.hypot(ux, uy, uz); ux /= ul; uy /= ul; uz /= ul;
      const wx = ay * uz - az * uy, wy = az * ux - ax * uz, wz = ax * uy - ay * ux;
      const flute = o.flute || 0, n = o.n || 5, tw = o.twist || 0, s0 = o.s0 || 0, ph = o.phase || 0, fl = o.flat || 1;
      const lip = Math.min(1, fl);
      dist = (x, y, z) => {
        const px = x - a[0], py = y - a[1], pz = z - a[2];
        const t = Math.max(0, Math.min(1, (px * bax + py * bay + pz * baz) / bb));
        const cx = px - bax * t, cy = py - bay * t, cz = pz - baz * t;
        const pu = (cx * ux + cy * uy + cz * uz) / fl, pw = cx * wx + cy * wy + cz * wz;
        const r = r0 + (r1 - r0) * t;
        const rr = flute ? r * (1 + flute * Math.sin(n * Math.atan2(pw, pu) + tw * (s0 + t * len) + ph)) : r;
        return (Math.hypot(pu, pw) - rr) * lip;
      };
    }
    this._box(
      Math.min(a[0], b[0]) - m, Math.min(a[1], b[1]) - m, Math.min(a[2], b[2]) - m,
      Math.max(a[0], b[0]) + m, Math.max(a[1], b[1]) + m, Math.max(a[2], b[2]) + m,
      mode === 'sub' ? (x, y, z, v) => smax(v, -dist(x, y, z), k) : (x, y, z, v) => smin(v, dist(x, y, z), k),
    );
  }

  // Ketju kartioita pisteiden läpi (pts = [[x, y, z], ...], rs = säteet).
  // k = liitos muuhun muotoon ketjun alussa, kJoin = myöhemmät liitokset.
  // o = cone-asetukset (uurteet), jotka jatkuvat ketjun läpi.
  chain(pts, rs, k = 0.1, kJoin = 0.03, o = null) {
    let s0 = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const oo = o ? { ...o, s0, flat: o.flatAt ? o.flatAt(i / (pts.length - 1)) : o.flat } : null;
      this.cone(pts[i], pts[i + 1], rs[i], rs[i + 1], i === 0 ? k : kJoin, 'add', oo);
      s0 += Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1], pts[i + 1][2] - pts[i][2]);
    }
  }

  // Muokkaus rajatussa laatikossa: fn(x, y, z, v) -> uusi arvo.
  region(min, max, fn) { this._box(min[0], min[1], min[2], max[0], max[1], max[2], fn); }

  // Ellipsoidi (likimääräinen etäisyys), kierto y-akselin ympäri ja kallistus.
  ellipsoid(c, rx, ry, rz, k = 0.05, rotY = 0, tilt = 0, mode = 'add') {
    const m = Math.max(rx, ry, rz) + k + this.cell * 2;
    const cy = Math.cos(rotY), sy = Math.sin(rotY), ct = Math.cos(tilt), st = Math.sin(tilt);
    const dist = (x, y, z) => {
      let px = x - c[0], py = y - c[1], pz = z - c[2];
      const qx = px * cy - pz * sy, qz = px * sy + pz * cy;
      px = qx; pz = qz;
      const ry2 = py * ct - px * st, rx2 = py * st + px * ct;
      const ex = rx2 / rx, ey = ry2 / ry, ez = pz / rz;
      const k0 = Math.hypot(ex, ey, ez);
      const k1 = Math.hypot(ex / rx, ey / ry, ez / rz) || 1e-9;
      return k0 * (k0 - 1) / k1;
    };
    this._box(c[0] - m, c[1] - m, c[2] - m, c[0] + m, c[1] + m, c[2] + m,
      mode === 'sub' ? (x, y, z, v) => smax(v, -dist(x, y, z), k) : (x, y, z, v) => smin(v, dist(x, y, z), k));
  }

  // Vapaa muokkaus koko kentälle: fn(x, y, z, v) -> uusi arvo.
  map(fn, near = Infinity) {
    const c = this.cell, d = this.d;
    for (let k = 0; k < this.nz; k++) {
      const z = this.oz + k * c;
      for (let j = 0; j < this.ny; j++) {
        const y = this.oy + j * c;
        let i = this.idx(0, j, k);
        for (let ii = 0; ii < this.nx; ii++, i++) {
          if (Math.abs(d[i]) > near) continue;
          d[i] = fn(this.ox + ii * c, y, z, d[i]);
        }
      }
    }
  }

  // Kolmilineaarinen näyte (rajojen ulkopuolella: kaukana).
  sample(x, y, z) {
    const c = this.cell;
    const fx = (x - this.ox) / c, fy = (y - this.oy) / c, fz = (z - this.oz) / c;
    if (fx < 0 || fy < 0 || fz < 0 || fx >= this.nx - 1 || fy >= this.ny - 1 || fz >= this.nz - 1) return 1;
    const i = Math.floor(fx), j = Math.floor(fy), k = Math.floor(fz);
    const tx = fx - i, ty = fy - j, tz = fz - k;
    const d = this.d, sx = 1, sy = this.nx, sz = this.nx * this.ny;
    const b = this.idx(i, j, k);
    const l = (a, bb, t) => a + (bb - a) * t;
    return l(
      l(l(d[b], d[b + sx], tx), l(d[b + sy], d[b + sy + sx], tx), ty),
      l(l(d[b + sz], d[b + sz + sx], tx), l(d[b + sz + sy], d[b + sz + sy + sx], tx), ty),
      tz,
    );
  }

  // Pinnan poiminta. color(x, y, z, nx, ny, nz, ao, out) kirjoittaa värin
  // taulukkoon out [r, g, b]. Palauttaa indeksoidun BufferGeometryn.
  mesh(color) {
    const { nx, ny, nz, cell: c, d } = this;
    const vidx = new Int32Array(nx * ny * nz).fill(-1);
    const P = [];
    // Kärkipisteet: solun reunojen nollakohtien keskiarvo.
    const corner = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]];
    const edges = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
    const cv = new Float32Array(8);
    for (let k = 0; k < nz - 1; k++) {
      for (let j = 0; j < ny - 1; j++) {
        for (let i = 0; i < nx - 1; i++) {
          let neg = 0;
          for (let q = 0; q < 8; q++) {
            const v = d[this.idx(i + corner[q][0], j + corner[q][1], k + corner[q][2])];
            cv[q] = v;
            if (v < 0) neg++;
          }
          if (neg === 0 || neg === 8) continue;
          let sx = 0, sy = 0, sz = 0, n = 0;
          for (const [a, b] of edges) {
            const va = cv[a], vb = cv[b];
            if ((va < 0) === (vb < 0)) continue;
            const t = va / (va - vb);
            sx += corner[a][0] + (corner[b][0] - corner[a][0]) * t;
            sy += corner[a][1] + (corner[b][1] - corner[a][1]) * t;
            sz += corner[a][2] + (corner[b][2] - corner[a][2]) * t;
            n++;
          }
          vidx[this.idx(i, j, k)] = P.length / 3;
          P.push(this.ox + (i + sx / n) * c, this.oy + (j + sy / n) * c, this.oz + (k + sz / n) * c);
        }
      }
    }
    // Tahkot: jokaista merkkiä vaihtavaa ruudukon särmää ympäröi neljä solua.
    const I = [];
    const quad = (a, b, cc, dd, flip) => {
      if (a < 0 || b < 0 || cc < 0 || dd < 0) return;
      // Lyhyempi lävistäjä jakaa nelikulmion.
      const dist2 = (u, v) => (P[u * 3] - P[v * 3]) ** 2 + (P[u * 3 + 1] - P[v * 3 + 1]) ** 2 + (P[u * 3 + 2] - P[v * 3 + 2]) ** 2;
      const t = dist2(a, cc) <= dist2(b, dd) ? [a, b, cc, a, cc, dd] : [a, b, dd, b, cc, dd];
      if (flip) { [t[1], t[2]] = [t[2], t[1]]; [t[4], t[5]] = [t[5], t[4]]; }
      I.push(...t);
    };
    const V = (i, j, k) => vidx[this.idx(i, j, k)];
    for (let k = 0; k < nz; k++) {
      for (let j = 0; j < ny; j++) {
        for (let i = 0; i < nx; i++) {
          const v0 = d[this.idx(i, j, k)] < 0;
          if (i < nx - 1 && j > 0 && k > 0 && v0 !== (d[this.idx(i + 1, j, k)] < 0)) {
            quad(V(i, j - 1, k - 1), V(i, j, k - 1), V(i, j, k), V(i, j - 1, k), !v0);
          }
          if (j < ny - 1 && i > 0 && k > 0 && v0 !== (d[this.idx(i, j + 1, k)] < 0)) {
            quad(V(i - 1, j, k - 1), V(i - 1, j, k), V(i, j, k), V(i, j, k - 1), !v0);
          }
          if (k < nz - 1 && i > 0 && j > 0 && v0 !== (d[this.idx(i, j, k + 1)] < 0)) {
            quad(V(i - 1, j - 1, k), V(i, j - 1, k), V(i, j, k), V(i - 1, j, k), !v0);
          }
        }
      }
    }
    // Pienet irralliset palat pois (kohinan tai leikkausten jättämät sirut).
    {
      const nv0 = P.length / 3;
      const par = new Int32Array(nv0);
      for (let i = 0; i < nv0; i++) par[i] = i;
      const find = (a) => { while (par[a] !== a) { par[a] = par[par[a]]; a = par[a]; } return a; };
      for (let t = 0; t < I.length; t += 3) {
        const a = find(I[t]), b = find(I[t + 1]), cc = find(I[t + 2]);
        par[b] = a; par[find(cc)] = a;
      }
      const cnt = new Map();
      for (let t = 0; t < I.length; t += 3) { const r = find(I[t]); cnt.set(r, (cnt.get(r) || 0) + 1); }
      const minTris = Math.max(40, (I.length / 3) * 0.01);
      const keep = [];
      for (let t = 0; t < I.length; t += 3) if (cnt.get(find(I[t])) >= minTris) keep.push(I[t], I[t + 1], I[t + 2]);
      // Käyttämättömät kärjet pois.
      const remap = new Int32Array(nv0).fill(-1);
      const P2 = [];
      for (let t = 0; t < keep.length; t++) {
        const o = keep[t];
        if (remap[o] < 0) { remap[o] = P2.length / 3; P2.push(P[o * 3], P[o * 3 + 1], P[o * 3 + 2]); }
        keep[t] = remap[o];
      }
      P.length = P2.length;
      for (let t = 0; t < P2.length; t++) P[t] = P2[t];
      I.length = keep.length;
      for (let t = 0; t < keep.length; t++) I[t] = keep[t];
    }
    // Normaalit gradientista, AO kentästä, värit.
    const nV = P.length / 3;
    const N = new Float32Array(nV * 3), C = new Float32Array(nV * 3);
    const e = c * 0.75, out = [0, 0, 0];
    for (let v = 0; v < nV; v++) {
      const x = P[v * 3], y = P[v * 3 + 1], z = P[v * 3 + 2];
      let gx = this.sample(x + e, y, z) - this.sample(x - e, y, z);
      let gy = this.sample(x, y + e, z) - this.sample(x, y - e, z);
      let gz = this.sample(x, y, z + e) - this.sample(x, y, z - e);
      const gl = Math.hypot(gx, gy, gz) || 1;
      gx /= gl; gy /= gl; gz /= gl;
      N[v * 3] = gx; N[v * 3 + 1] = gy; N[v * 3 + 2] = gz;
      // Peittävyys: jos kenttä normaalin suunnassa on lähempänä kuin
      // matka, vieressä on muuta pintaa (kolo, juurten väli).
      let ao = 0;
      for (const s of [0.1, 0.25, 0.5]) ao += Math.max(0, Math.min(1, this.sample(x + gx * s, y + gy * s, z + gz * s) / s));
      ao /= 3;
      color(x, y, z, gx, gy, gz, ao, out);
      C[v * 3] = out[0]; C[v * 3 + 1] = out[1]; C[v * 3 + 2] = out[2];
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(N, 3));
    g.setAttribute('color', new THREE.BufferAttribute(C, 3));
    g.setIndex(nV > 65535 ? new THREE.Uint32BufferAttribute(I, 1) : new THREE.Uint16BufferAttribute(I, 1));
    g.computeBoundingBox();
    g.computeBoundingSphere();
    return g;
  }
}
