// Sessio 26: simpukankuoret (käyttäjä: hienon näköisiksi ja poimittaviksi).
// Parametriset pinnat sileillä normaaleilla ja kuvioidulla värityksellä:
// - kampasimpukka: viuhka, säteittäiset harjanteet, saranan "korvat",
//   kasvurenkaat ja värisäteet; sisäpinta helmiäisen vaalea
// - sydänsimpukka: pyöreämpi, korkeampi kupu, tiheät matalat harjanteet
// - kauri (kotilo): kiiltävä munanmuoto täplineen ja pohjan rako
// - tornikotilo: kartiomainen kierre, ruskeat kierrenauhat
// Mallit ovat käden mittakaavassa (n. 6–9 cm); maassa skaalataan.
import * as THREE from 'three';
import { mulberry32 } from '../noise.js';
import { merge } from './util.js';

const _c = new THREE.Color();
const _c2 = new THREE.Color();

// Ruudukko (nu x nv) -> indeksoitu geometria. f(u, v) palauttaa [x, y, z, r, g, b].
function grid(nu, nv, f, flip = false) {
  const pos = [], col = [], idx = [];
  for (let j = 0; j <= nv; j++) {
    for (let i = 0; i <= nu; i++) {
      const p = f(i / nu, j / nv);
      pos.push(p[0], p[1], p[2]);
      col.push(p[3], p[4], p[5]);
    }
  }
  const row = nu + 1;
  for (let j = 0; j < nv; j++) {
    for (let i = 0; i < nu; i++) {
      const a = j * row + i, b = a + 1, c = a + row, d = c + 1;
      if (flip) idx.push(a, b, c, b, d, c);
      else idx.push(a, c, b, b, c, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

const PALETTES = [
  // [pohja, kuvio, sisäpinta]
  [0xf0c8a8, 0xc8603a, 0xf8ece4], // persikka, punaruskeat säteet
  [0xf4e6d0, 0xb88a5a, 0xfaf4ec], // kerma, ruskeat renkaat
  [0xe8a890, 0xa83e2e, 0xf6e2dc], // koralli
  [0xf2dc9a, 0xc0802e, 0xfaf0d8], // keltainen
  [0xd8c8d8, 0x7a5a8a, 0xf2ecf4], // lila
  [0xece4dc, 0x8a6a5a, 0xf8f4f0], // vaalea harmaa
];

// Kampa- tai sydänsimpukan kuori. opts: tMax (viuhkan puolikulma), round
// (ääriviivan pyöreys), ribs (harjanteiden määrä), ribH, dome (kuvun korkeus).
function bivalve(rand, size, opts, detail = 1) {
  const { tMax, round, ribs, ribH, dome, ears } = opts;
  const pal = PALETTES[Math.floor(rand() * PALETTES.length)];
  const base = new THREE.Color(pal[0]), pat = new THREE.Color(pal[1]), inner = new THREE.Color(pal[2]);
  const bandF = 18 + rand() * 16, bandPh = rand() * 6, rayK = rand() < 0.6 ? 0.55 : 0.15, bandK = 0.25 + rand() * 0.35;
  const rayPh = rand() * 6;
  const D = size;
  const nu = Math.round(40 * detail), nv = Math.max(5, Math.round(14 * detail));
  const shape = (u, v, under) => {
    const t = (u * 2 - 1) * tMax;
    const rib = Math.pow(Math.abs(Math.cos(t * ribs * 0.5 * Math.PI / tMax)), 0.8);
    const R = D * Math.pow(Math.cos(t * (Math.PI / 2) / (tMax * 1.08)), round) * (1 + 0.035 * rib);
    const r = v * R;
    const x = Math.sin(t) * r, z = Math.cos(t) * r - D * 0.42;
    const side = 0.35 + 0.65 * Math.cos((t / tMax) * Math.PI / 2);
    let y = dome * D * 2.1 * Math.pow(v, 0.55) * Math.pow(Math.max(0, 1 - Math.pow(v, 1.7)), 0.6) * side;
    y += ribH * D * rib * Math.min(1, v * 3) * (1 - v * 0.3);
    if (under) y -= 0.0018 + 0.05 * D * v * (1 - v) * side;
    // Väri: kasvurenkaat, värisäteet ja tummempi kärki (umbo).
    if (under) {
      _c.copy(inner).lerp(pat, 0.12 * Math.pow(v, 3));
    } else {
      const band = 0.5 + 0.5 * Math.sin(v * bandF + bandPh + Math.sin(t * 5) * 0.4);
      const ray = Math.max(0, Math.sin(t * 3.3 + rayPh)) * rayK;
      _c.copy(base).lerp(pat, Math.min(1, band * bandK + ray * 0.6 + (1 - Math.min(1, v * 4)) * 0.35));
      _c.multiplyScalar(0.9 + 0.1 * rib);
    }
    return [x, Math.max(0, y), z, _c.r, _c.g, _c.b];
  };
  const parts = [grid(nu, nv, (u, v) => shape(u, v, false)), grid(nu, nv, (u, v) => shape(u, v, true), true)];
  if (ears) {
    // Saranan korvat: pienet kolmiomaiset levyt kärjen molemmin puolin.
    for (const s of [-1, 1]) {
      const ear = grid(4, 3, (u, v) => {
        const w = D * 0.26 * u, l = D * 0.2 * (1 - u * 0.55);
        const x = s * w, z = -D * 0.42 + v * l;
        const y = D * 0.03 * (1 - u) + 0.004 * Math.abs(Math.sin(v * 9));
        _c.copy(base).lerp(pat, 0.35);
        return [x, y, z, _c.r, _c.g, _c.b];
      }, s < 0);
      const back = grid(4, 3, (u, v) => {
        const w = D * 0.26 * u, l = D * 0.2 * (1 - u * 0.55);
        return [s * w, D * 0.03 * (1 - u) - 0.0015, -D * 0.42 + v * l, inner.r, inner.g, inner.b];
      }, s > 0);
      parts.push(ear, back);
    }
  }
  return merge(parts);
}

// Kauri: kiiltävä, munanmuotoinen kotilo täplineen; pohjassa tumma rako.
function cowrie(rand, size, detail = 1) {
  // [selkä, täplät, kylki ja pohja]: tiikerikauri, rahakauri, ruskea ja vaalea.
  const pal = [[0xd8c0a0, 0x3a2418, 0xf2ead8], [0xe8d8a0, 0xc8a860, 0xf6f0e0], [0xa8784a, 0x4a2a18, 0xe8dcc8], [0xe8d0b8, 0x8a5a3a, 0xf8f0e8]][Math.floor(rand() * 4)];
  const a = new THREE.Color(pal[0]), sc = new THREE.Color(pal[1]), b = new THREE.Color(pal[2]);
  const spots = [];
  for (let i = 0; i < 34; i++) spots.push([rand() * Math.PI, rand() * 0.86 + 0.07, 0.07 + rand() * 0.1]);
  const L = size * 0.95, W = size * 0.62, H = size * 0.45;
  return grid(Math.round(28 * detail), Math.max(6, Math.round(16 * detail)), (u, v) => {
    const ph = u * Math.PI * 2, th = v * Math.PI;
    let x = Math.sin(th) * Math.cos(ph) * W * 0.5;
    let y = Math.sin(th) * Math.sin(ph) * H * 0.5;
    const z = -Math.cos(th) * L * 0.5;
    if (y < 0) y *= 0.35; // litteä pohja
    y += H * 0.18;
    // Täplät yläpuolella, vaalea kylki, rako pohjassa.
    let s = 0;
    for (const sp of spots) {
      const dph = Math.atan2(Math.sin(ph - sp[0]), Math.cos(ph - sp[0])), dv = v - sp[1];
      s = Math.max(s, 1 - Math.min(1, Math.hypot(dph * 0.32, dv * 1.6) / sp[2]));
    }
    const top = Math.min(1, Math.max(0, Math.sin(ph) * 1.6));
    _c.copy(b).lerp(a, top);
    // Selän keskellä vaalea pitkittäisjuova, täplät selkeinä.
    _c.lerp(b, Math.exp(-((ph - Math.PI / 2) ** 2) / 0.004) * 0.5);
    _c.lerp(_c2.copy(sc), Math.min(1, Math.pow(s, 0.6) * 1.5) * top);
    const slit = Math.sin(ph) < -0.85 ? Math.min(1, (-Math.sin(ph) - 0.85) * 12) * Math.sin(th) : 0;
    if (slit > 0) { _c.multiplyScalar(1 - 0.6 * slit); x *= 1 - 0.08 * slit; }
    return [x, Math.max(0, y), z, _c.r, _c.g, _c.b];
  });
}

// Tornikotilo: kartiomainen kierreputki, joka makaa kyljellään.
function turret(rand, size, detail = 1) {
  const base = new THREE.Color([0xf0e2c8, 0xe8d0b0, 0xd8c8b8][Math.floor(rand() * 3)]);
  const band = new THREE.Color([0x8a5a3a, 0xa0603a, 0x6a4a3a][Math.floor(rand() * 3)]);
  const turns = 5.5 + rand() * 2, len = size * 1.25, r0 = size * 0.26;
  const bandF = 2 + Math.floor(rand() * 3);
  const g = grid(Math.round(turns * 14 * detail), Math.max(5, Math.round(9 * detail)), (u, v) => {
    // u pitkin kierrettä (kärjestä suulle), v putken ympäri.
    const s = Math.pow(u, 0.9);
    const ang = u * turns * Math.PI * 2;
    const rc = r0 * (0.06 + 0.94 * s) * 0.55;
    const rt = r0 * (0.06 + 0.94 * s) * 0.5;
    const ax = s * len; // akseli kärjestä suulle
    const ca = Math.cos(ang), sa = Math.sin(ang);
    const tv = v * Math.PI * 2;
    const ct = Math.cos(tv), st = Math.sin(tv);
    // Putken poikkileikkaus säteen (ca, sa) ja akselin suunnassa.
    const rr = rc + rt * ct;
    const x = ca * rr, y = sa * rr, z = ax - rt * st * 0.9;
    const stripe = 0.5 + 0.5 * Math.sin(ct * 2.2 + bandF * tv * 0.5);
    _c.copy(base).lerp(band, Math.pow(stripe, 3) * 0.75 * (0.3 + 0.7 * s));
    // Kierteiden saumakohta tummempi (syvennys).
    _c.multiplyScalar(0.82 + 0.18 * Math.max(0, ct));
    return [x, y, z, _c.r, _c.g, _c.b];
  });
  // Akseli vaakaan maahan (kylki maata vasten).
  g.rotateY(Math.PI / 2);
  g.rotateX(-0.18);
  g.translate(-len * 0.5, r0 * 0.55, 0);
  return g;
}

// kind: 'scallop' | 'cockle' | 'cowrie' | 'turret'. flip = ylösalaisin (sisäpinta näkyy).
// detail: verkon tiheys (1 = käsi ja kuvake; maassa harvempi).
export function makeShell(kind, seed, flip = false, detail = 1) {
  const rand = mulberry32(seed);
  let g;
  if (kind === 'scallop') g = bivalve(rand, 0.06 + rand() * 0.015, { tMax: 0.95, round: 0.45, ribs: 9 + Math.floor(rand() * 4), ribH: 0.075, dome: 0.17, ears: true }, detail);
  else if (kind === 'cockle') g = bivalve(rand, 0.05 + rand() * 0.012, { tMax: 1.25, round: 0.32, ribs: 15 + Math.floor(rand() * 6), ribH: 0.035, dome: 0.3, ears: false }, detail);
  else if (kind === 'cowrie') g = cowrie(rand, 0.055 + rand() * 0.012, detail);
  else g = turret(rand, 0.06 + rand() * 0.015, detail);
  if (flip && kind === 'cockle') {
    g.rotateZ(Math.PI);
    g.computeBoundingBox();
    g.translate(0, -g.boundingBox.min.y, 0);
  }
  return g;
}

export const SHELL_KINDS = ['scallop', 'cockle', 'cowrie', 'turret'];
