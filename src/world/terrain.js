// Maailman generointi: korkeus, biomit ja vesi pisteessä (x, z).
//
// Maailma on valtava saari (säde WORLD.radius), jota ympäröi meri, ja se
// generoidaan siemenestä. Biomit (Sahelin savanni muunnelmineen, aavikko,
// sademetsä, vuoristo ja sisämeret) ovat satunnaisia, noin 1,5 km:n alueita,
// jotka voivat olla missä tahansa (sessio 9: vyöhykkeet poistettiin). Kosteus
// vaihtelee loivasti, joten aavikon ja sademetsän välissä on yleensä savannia.
// Alueiden rajat ovat kohinalla vääristettyjä ja pehmeitä. Aloituspaikka on
// aina savannia.
//
// Vesi: merenpinta (WATER_LEVEL) on kaikkialla; sen alla oleva maa on vettä
// (meri, kausilammet, keitaat). Lisäksi joet ja purot (sademetsä, harvoin
// Sahel, vuoriston tasaisemmat kohdat) sekä järvet ja lammet (sademetsä,
// vuoristo) ovat omalla korkeudellaan. Näyte kertoo veden pinnan (wl):
// piste on veden alla, jos h < wl.
//
// Kaikki funktiot ovat puhtaita (x, z) -> arvo, joten samaa logiikkaa käyttävät
// maaston verkko, vesi, esineiden sijoittelu, pelaajan törmäys ja kartat.
// Koordinaatit: +x = itä, -z = pohjoinen.

import { CONFIG } from '../config.js';
import { createNoise2D, fbm, smoothstep, mulberry32 } from '../noise.js';

export const WORLD = {
  radius: 10000,  // metriä keskeltä reunaan
  coastR: 0.9,    // osuus säteestä: tästä alkaa saarta ympäröivä meri
  spawnR: 700,    // m: aloitusalue on aina tasaista savannia
};
const BIOME_CELL = 1500;  // m: biomialueen keskikoko (vierekkäiset samat yhdistyvät)
const BIOME_BAND = 260;   // m: rajan pehmeä siirtymä (etäisyysero)

export const WATER_LEVEL = CONFIG.waterLevel;

// Biomien nimet näkyvät minikartassa. Värit (sRGB) ovat karttoja varten.
export const BIOMES = {
  savanna: { name: 'Sahelin savanni', map: '#b89a60' },
  // Dyynit on yhdistetty aavikkoon (sama nimi, väri ja musiikki); maaston
  // muoto lasketaan edelleen omana painonaan.
  dunes: { name: 'Aavikko', map: '#e6bd84' },
  laterite: { name: 'Laterittitasanko', map: '#94502f' },
  mare: { name: 'Kausilampi', map: '#7a7448' },
  woodland: { name: 'Akasiametsikkö', map: '#9a8a52' },
  desert: { name: 'Aavikko', map: '#e6bd84' },
  oasis: { name: 'Keidas', map: '#6f8f48' },
  rainforest: { name: 'Sademetsä', map: '#4a6a2c' },
  mountains: { name: 'Vuoristo', map: '#7a6a60' },
  beach: { name: 'Hiekkaranta', map: '#e2cf9c' },
  ocean: { name: 'Meri', map: '#3f6f8e' },
};
export const BIOME_KEYS = Object.keys(BIOMES);
const BIOME_MAP_RGB = Object.fromEntries(
  BIOME_KEYS.map((k) => {
    const hex = parseInt(BIOMES[k].map.slice(1), 16);
    return [k, [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255]];
  }),
);

// Mistä veden pinta tulee: merenpinta (meri, lammet), järvi, joki vai puro.
export const WATER = { SEA: 1, LAKE: 2, RIVER: 3, STREAM: 4 };

// --- Siemen ------------------------------------------------------------------

let SEED = 0;
let N = null;
const cellCache = new Map();
const structCache = new Map();
const lakeCache = new Map();
const featCache = new Map();
const fallCache = new Map();
const karstCache = new Map();

// Merkkijono tai luku -> 32-bittinen siemen.
export function seedFromString(text) {
  const s = String(text ?? '').trim();
  if (/^-?\d+$/.test(s)) return (parseInt(s, 10) >>> 0);
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function randomSeed() {
  return Math.floor(Math.random() * 2147483647);
}

export function setWorldSeed(seed) {
  SEED = seed >>> 0;
  const n = (k) => createNoise2D((SEED + k * 7919) >>> 0);
  N = {
    base: n(1), detail: n(2), duneField: n(3), dune: n(4), ripple: n(5), lat: n(6), rock: n(7),
    mare: n(8), wood: n(9), color: n(10), warp: n(11), zoneWarp: n(12), edge: n(13), dr: n(14),
    bigDune: n(15), hills: n(16), mount: n(17), mount2: n(18), oasis: n(19), gully: n(20), strata: n(21),
    river: n(22), rwarp: n(23), stream: n(24), swarp: n(25), lakeShape: n(26), coast: n(27),
    island: n(28), wet: n(29), hills2: n(30), feat: n(31), width: n(32),
    esc: n(33), escMask: n(34), escH: n(35),
  };
  cellCache.clear();
  structCache.clear();
  lakeCache.clear();
  featCache.clear();
  fallCache.clear();
  karstCache.clear();
}

export function getWorldSeed() {
  return SEED;
}

setWorldSeed(CONFIG.seed);

// --- Biomialueet -------------------------------------------------------------

// Biomialue: värinäinen ruudukko (jokaisessa ruudussa yksi keskipiste ja tyyppi).
// Tyypit: sahel (savanni muunnelmineen), desert, rain (sademetsä), mount, sea.
function biomeCell(ix, iz) {
  const key = ix * 131071 + iz;
  let c = cellCache.get(key);
  if (c) return c;
  const rand = mulberry32((Math.imul(ix, 2246822519) ^ Math.imul(iz, 3266489917) ^ Math.imul(SEED + 19, 668265263)) >>> 0);
  const x = (ix + 0.15 + rand() * 0.7) * BIOME_CELL;
  const z = (iz + 0.15 + rand() * 0.7) * BIOME_CELL;
  let type;
  if (Math.hypot(x, z) < WORLD.spawnR + BIOME_CELL * 0.75) {
    type = 'sahel'; // aloitusalue
  } else {
    const r = rand();
    // Kosteus vaihtelee loivasti: kuiva -> aavikko, märkä -> sademetsä.
    const hum = fbm(N.dr, x / 5200, z / 5200, 3) * 1.2 + (rand() - 0.5) * 0.5;
    if (r < 0.13) type = 'mount';
    else if (r < 0.21) type = 'sea';
    else if (hum < -0.18) type = 'desert';
    else if (hum > 0.2) type = 'rain';
    else type = 'sahel';
  }
  c = { x, z, type };
  cellCache.set(key, c);
  return c;
}

// Biomien painot pisteessä (pehmeä Voronoi vääristetyillä rajoilla), meren
// etumerkillinen etäisyys rannasta ja vuoriston "syvyys" (nousee sisäosiin).
// Lähimmät 5×5 solua muistetaan (peräkkäiset näytteet osuvat yleensä samaan soluun).
const T_SAHEL = 0, T_DESERT = 1, T_RAIN = 2, T_MOUNT = 3, T_SEA = 4;
const TYPE_CODE = { sahel: T_SAHEL, desert: T_DESERT, rain: T_RAIN, mount: T_MOUNT, sea: T_SEA };
const _wx = new Float64Array(25), _wz = new Float64Array(25), _wt = new Int8Array(25), _cd = new Float64Array(25);
let _winX = NaN, _winZ = NaN, _winSeed = NaN;
function zones(x, z, out) {
  const R = WORLD.radius;
  const wx = x + fbm(N.zoneWarp, x / 1100, z / 1100, 3) * 330;
  const wz = z + fbm(N.zoneWarp, x / 1100 + 31.7, z / 1100 - 12.3, 3) * 330;
  const cx = Math.floor(wx / BIOME_CELL), cz = Math.floor(wz / BIOME_CELL);
  if (cx !== _winX || cz !== _winZ || SEED !== _winSeed) {
    let n = 0;
    for (let j = cz - 2; j <= cz + 2; j++) {
      for (let i = cx - 2; i <= cx + 2; i++) {
        const c = biomeCell(i, j);
        _wx[n] = c.x; _wz[n] = c.z; _wt[n++] = TYPE_CODE[c.type];
      }
    }
    _winX = cx; _winZ = cz; _winSeed = SEED;
  }
  let d1 = Infinity;
  for (let k = 0; k < 25; k++) {
    const dx = wx - _wx[k], dz = wz - _wz[k];
    const d = Math.sqrt(dx * dx + dz * dz);
    _cd[k] = d;
    if (d < d1) d1 = d;
  }
  let sahel = 0, desert = 0, rain = 0, mount = 0;
  let dSea = Infinity, dLand = Infinity, dMount = Infinity, dNoMount = Infinity, dDes = Infinity, dNoDes = Infinity;
  for (let k = 0; k < 25; k++) {
    const d = _cd[k];
    const t = _wt[k];
    if (t === T_MOUNT) { if (d < dMount) dMount = d; } else if (d < dNoMount) dNoMount = d;
    if (t === T_DESERT) { if (d < dDes) dDes = d; } else if (d < dNoDes) dNoDes = d;
    if (t === T_SEA) { if (d < dSea) dSea = d; continue; }
    if (d < dLand) dLand = d;
    let w = 1 - (d - d1) / BIOME_BAND;
    if (w <= 0) continue;
    w *= w;
    if (t === T_SAHEL) sahel += w; else if (t === T_DESERT) desert += w; else if (t === T_RAIN) rain += w; else mount += w;
  }
  const land = sahel + desert + rain + mount;
  if (land > 0) { sahel /= land; desert /= land; rain /= land; mount /= land; } else sahel = 1;
  // Meren etäisyys rannasta metreinä (+ = merelle päin): sisämeret ja saarta
  // ympäröivä meri. Reunan kohina lasketaan vain reunan lähellä.
  const d0 = Math.sqrt(x * x + z * z) / R;
  const nw = smoothstep(0.76, 0.8, d0);
  const dEdge = nw > 0 ? d0 + nw * (fbm(N.edge, x / 700, z / 700, 4) * 0.012 + fbm(N.coast, x / 3000, z / 3000, 2) * 0.025) : d0;
  const seaIn = dSea < Infinity ? (dLand - dSea) / 2 : -Infinity;
  out.seaDist = Math.max(seaIn, (dEdge - WORLD.coastR) * R);
  out.dEdge = dEdge;
  out.d = d0;
  out.zSahel = sahel; out.zDesert = desert; out.zRain = rain; out.zMount = mount;
  // Vuoristo nousee kohti sisäosiaan, aavikon isot dyynit samoin.
  out.mountCore = dMount < Infinity ? smoothstep(0, 1300, dNoMount - dMount) : 0;
  out.desCore = dDes < Infinity ? smoothstep(0, 900, dNoDes - dDes) : 0;
  return out;
}

// Sessio 24: pehmeä itseisarvo ja minimi. Tavallinen |n| ja min() tekivät
// maastoon teräviä V-uurteita ja harjanteita ("kulmikas" maasto).
function sabs(v, k = 0.12) {
  return Math.sqrt(v * v + k * k) - k;
}
function smin(a, b, k) {
  const hh = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - hh * hh * k * 0.25;
}

function ridged(nx, nz, octaves) {
  let s = 0, a = 1, f = 1, w = 0;
  for (let o = 0; o < octaves; o++) {
    const r = 1 - sabs(N.mount(nx * f, nz * f), 0.14);
    s += r * r * a; w += a; a *= 0.5; f *= 2.1;
  }
  return s / w;
}

// Rannikon korkeusprofiili. c = dEdge - coastR (0.01 = noin 100 m merelle päin).
function coastHeight(x, z, c) {
  const dune = N.dune(x / 45, z / 45) * 0.5 + 0.5;
  let h = 1.1 + dune * 0.8 * (1 - smoothstep(-0.004, 0.004, c));
  h -= 2.6 * smoothstep(-0.002, 0.009, c);     // ranta laskee veteen
  // Merenpohja (sessio 10: syvenee nopeammin, n. 2 m jo 50 m rannasta,
  // jotta laivoilla pääsee lähelle rantaa).
  h -= 16 * smoothstep(0.005, 0.03, c);
  h += N.ripple(x / 14, z / 30) * 0.15;
  // Harvinaiset saaret avomerellä
  const isl = smoothstep(0.62, 0.84, fbm(N.island, x / 800, z / 800, 3)) * smoothstep(0.02, 0.05, c);
  if (isl > 0) h += isl * 24 + sabs(N.detail(x / 26, z / 26)) * isl * 2;
  return h;
}

// --- Sessio 58: karstivuoristo sademetsän sisällä ----------------------------------
// Korvaa session 57 jyrkänteet (käyttäjä: kahden tason portaat näyttivät
// kamalilta, eikä niiden päälle päässyt). Sademetsä on enimmäkseen ennallaan
// tasaista viidakkoa; laikuittain (karstMaskAt, noin kolmannes sademetsästä)
// tasaisesta laaksonpohjasta nousee 20–60 m korkeita jyrkkäseinäisiä
// kalkkikivimassiiveja kuten Thaimaan Krabissa ja Phang Ngassa. Kentän F
// tasa-arvokäyrä karstLevel() on massiivin reuna:
// - seinämä on lähes pystysuora (KARST_E), laki kumpuileva ja huippuinen;
// - paikoin (rampAt) reunalla on loiva rinne tai satula laaksosta laelle,
//   jota pitkin pääsee ylös (jyrkkä seinä pysäyttää pelaajan, player.js);
// - sharp = todellinen korotus, soft = 0: jokiverkko ei näe massiiveja, ja joen
//   laaksossa massiivi madaltuu (applyRivers), joten joet kulkevat laaksoissa
//   ja rotkoissa eivätkä hajoa (sama tapa kuin jyrkänteissä);
// - face = jyrkän seinämän osuus (kalkkikiven väri, ei puita).
const _esc = { sharp: 0, soft: 0, face: 0 };
const KARST_T = 0.13;   // massiivin reuna kentässä F, kun maski = 1
const KARST_E = 0.014;  // jyrkän seinämän leveys F-yksiköissä (n. 3 m)
const KARST_W = 0.2;    // loivan rinteen leveys F-yksiköissä (n. 40–60 m)
function karstMaskAt(x, z) {
  return smoothstep(0.02, 0.2, fbm(N.escMask, x / 1700, z / 1700, 2));
}
// Reunan taso nousee maskin reunoilla: massiivit pienenevät ja loppuvat.
function karstLevel(m) {
  return KARST_T + (1 - m) * 0.45;
}
function karstField(x, z) {
  const wx = x + N.warp(x / 260 + 5.1, z / 260 - 3.3) * 50;
  const wz = z + N.warp(x / 260 - 7.7, z / 260 + 2.9) * 50;
  return fbm(N.esc, wx / 300, wz / 300, 3) + 0.045 * N.detail(x / 38 + 3.3, z / 38 - 1.7);
}
function rampAt(x, z) {
  // Noin kolmannes reunasta saa rinteen, noin kahdeksasosa täyden loivan rinteen.
  return smoothstep(0.58, 0.7, N.escH(x / 230 + 9.1, z / 230 - 4.3) * 0.5 + 0.5);
}
function escarpment(x, z, m) {
  const o = _esc;
  o.sharp = 0; o.soft = 0; o.face = 0;
  if (m <= 0) return o;
  const F = karstField(x, z);
  const t = karstLevel(m);
  if (F < t - KARST_W) return o;
  const H = (20 + 40 * (N.escH(x / 700, z / 700) * 0.5 + 0.5)) * (0.55 + 0.45 * m);
  const sc = smoothstep(t, t + KARST_E, F);
  const u = Math.min(1, Math.max(0, (F - (t - KARST_W)) / (KARST_W + KARST_E)));
  const sr = rampAt(x, z) * u * (0.9 + 0.1 * u);
  const sh = Math.max(sc, sr);
  // Laki: kumpuja ja teräviä huippuja kauempana reunasta.
  const inner = smoothstep(t + KARST_E, t + 0.32, F);
  let top = 1;
  if (inner > 0) {
    const r = 1 - sabs(N.mount2(x / 48, z / 48), 0.16);
    top += inner * (0.1 + 0.42 * r * r + 0.08 * N.detail(x / 14, z / 14));
  }
  o.sharp = H * sh * top;
  // Seinämä: kallion osuus myös hieman reunan ylä- ja alapuolella, jotta koko
  // seinä saa kiven värin (verkon väli 1,33 m).
  if (sc > sr) {
    o.face = m * smoothstep(t - 0.008, t + 0.004, F) * (1 - smoothstep(t + KARST_E - 0.002, t + KARST_E + 0.01, F));
    // Rosoinen, kerroksellinen kallioseinä.
    o.sharp += o.face * (N.detail(x / 3.2, z / 3.2) * 0.9 + N.detail(x / 9, z / 9) * 0.8);
  }
  return o;
}

// Maa ilman erikoismuodostumia ja vesistöjä.
function sampleLand(x, z, out) {
  zones(x, z, out);
  const c = out.seaDist / WORLD.radius; // rannikon profiili (0.01 = 100 m merelle päin)

  // --- Biomipainot: maan biomit kertaa (1 - rannikko)
  const coastW = smoothstep(-90, 20, out.seaDist);
  const landW = 1 - coastW;
  const t1 = out.zSahel * landW;
  const mountW = out.zMount * landW;
  const t2 = (out.zDesert + out.zRain) * landW;
  const spawnW = 1 - smoothstep(WORLD.spawnR - 200, WORLD.spawnR + 200, Math.hypot(x, z));

  // --- Tier 1: Sahel ja sen muunnelmat
  let savanna = 0, dunes = 0, laterite = 0, mare = 0, woodland = 0, plateau = 0, basin = 0;
  let hSahel = 0, hills2 = 0;
  if (t1 > 0.0005) {
    const wx = x + N.warp(x / 300, z / 300) * 60;
    const wz = z + N.warp(x / 300 + 17.3, z / 300 - 9.1) * 60;
    // Dyynit kuuluvat nyt aavikkoon (savannissa ei dyynikenttiä).
    const duneField = -1;
    const latField = fbm(N.lat, wx / 560, wz / 560, 3);
    const mareField = fbm(N.mare, wx / 340, wz / 340, 3);
    const woodField = fbm(N.wood, wx / 420, wz / 420, 3);

    let rem = 1;
    const dn = smoothstep(0.3, 0.48, duneField) * (1 - spawnW) * rem; rem -= dn;
    const lt = smoothstep(0.26, 0.4, latField) * (1 - spawnW * 0.4) * rem; rem -= lt;
    const mr = smoothstep(0.36, 0.5, mareField) * rem; rem -= mr;
    const wd = smoothstep(0.14, 0.32, woodField) * rem; rem -= wd;
    dunes = dn * t1; laterite = lt * t1; mare = mr * t1; woodland = wd * t1; savanna = Math.max(0, rem) * t1;

    let h = 1.7 + fbm(N.base, x / 230, z / 230, 4) * 1.8 + N.detail(x / 22, z / 22) * 0.18;
    // Laajat, loivat kumpareet (vain ylöspäin, ettei tasanko jää veden alle)
    hills2 = fbm(N.hills2, x / 1100, z / 1100, 2) * 0.5 + 0.5;
    h += hills2 * 6 * (1 - spawnW * 0.5);
    const u = (x + z) * 0.7071;
    const v = (x - z) * 0.7071;
    if (dn > 0.001) {
      const ridge = 1 - sabs(N.dune(u / 85 + N.warp(x / 140, z / 140) * 0.4, v / 190), 0.12);
      const duneH = ridge * ridge * 9 + (1 - sabs(N.dune(u / 32, v / 60), 0.15)) * 1.6;
      h += dn * (duneH + N.ripple(u / 2.2, v / 9) * 0.05);
    }
    // Sessio 24: loivemmat tasankojen reunat (ennen jyrkkä porras).
    plateau = smoothstep(0.26, 0.42, latField) * (1 - spawnW * 0.4);
    if (plateau > 0.001) h += plateau * (1 - dn) * (4.5 + (N.rock(x / 300, z / 300) * 0.5 + 0.5) * 3 + N.rock(x / 40, z / 40) * 0.6);
    if (lt > 0.001) h += lt * sabs(N.rock(x / 16, z / 16), 0.2) * 0.3;
    // Kausilampien painanteet ulottuvat aina veden alle maaston korkeudesta riippumatta.
    basin = smoothstep(0.4, 0.62, mareField) * (1 - dn) * (1 - plateau) * t1;
    if (basin > 0.001) h += (-2.0 + N.detail(x / 30, z / 30) * 0.3 - h) * basin;
    hSahel = h;
  }

  // --- Aavikko ja sademetsä
  let desert = 0, rainforest = 0, oasis = 0, hDesert = 0, hRain = 0;
  let escSharp = 0, escSoft = 0, cliff = 0, karstM = 0;
  if (t2 > 0.0005) {
    desert = out.zDesert * landW;
    rainforest = out.zRain * landW;
    if (desert > 0.0005) {
      // Valtavat dyynit (erg); reunoilla matalammat, sisäosissa korkeat.
      const u = (x + z) * 0.7071;
      const v = (x - z) * 0.7071;
      const r1 = 1 - sabs(N.bigDune(u / 230 + N.warp(x / 500, z / 500) * 0.5, v / 520), 0.1);
      const r2 = 1 - sabs(N.bigDune(u / 70 + 13, v / 140 - 7), 0.14);
      const big = 0.25 + 0.75 * out.desCore;
      hDesert = 3 + r1 * r1 * 22 * big + r2 * r2 * 3.5 + fbm(N.base, x / 600, z / 600, 2) * 3 + N.ripple(u / 2.5, v / 10) * 0.06;
      // Keidas: harvinainen painanne, jossa on vettä ja vehreyttä.
      const of = fbm(N.oasis, x / 650, z / 650, 3);
      const ow = smoothstep(0.42, 0.56, of);
      if (ow > 0.001) {
        const bowl = smoothstep(0.46, 0.66, of);
        hDesert = hDesert * (1 - ow) + (2.2 - bowl * 4.4) * ow;
        oasis = desert * smoothstep(0.42, 0.5, of);
        desert -= oasis;
      }
    }
    if (rainforest > 0.0005) {
      // Kumpuileva, rosoinen maasto. (Kuivat uomat tulevat nyt valumaverkosta.)
      // Sessio 58: karstialueella laaksonpohja on tasaisempi.
      karstM = karstMaskAt(x, z);
      hRain = 5.5 + fbm(N.hills, x / 320, z / 320, 4) * 11 * (1 - 0.5 * karstM) + sabs(N.detail(x / 30, z / 30), 0.18) * 1.2;
      const e = escarpment(x, z, karstM);
      hRain += e.sharp;
      escSharp = rainforest * e.sharp;
      escSoft = rainforest * e.soft;
      cliff = rainforest * e.face;
    }
  }

  // --- Vuoristo (nousee kohti alueen sisäosia)
  let mountains = 0, hMount = 0, rise = 0;
  if (mountW > 0.0005) {
    mountains = mountW;
    rise = out.mountCore;
    hMount = 6 + ridged(x / 650, z / 650, 5) * 110 * rise + sabs(N.mount2(x / 60, z / 60), 0.18) * 3;
  }

  // --- Meri ja hiekkaranta
  let beach = 0, ocean = 0, hCoast = 0;
  if (coastW > 0.0005) {
    hCoast = coastHeight(x, z, c);
    // Rantaviivan lähellä ja saarilla hiekkarantaa, kauempana merta.
    const share = Math.max(1 - smoothstep(0.008, 0.016, c), smoothstep(-2.0, 0.2, hCoast));
    beach = coastW * share;
    ocean = coastW - beach;
  }

  out.h = t1 * hSahel + (desert + oasis) * hDesert + rainforest * hRain + mountains * hMount + coastW * hCoast;
  out.savanna = savanna;
  out.dunes = dunes;
  out.laterite = laterite;
  out.mare = mare;
  out.woodland = woodland;
  out.desert = desert;
  out.oasis = oasis;
  out.rainforest = rainforest;
  out.mountains = mountains;
  out.beach = beach;
  out.ocean = ocean;
  out.plateau = plateau;
  out.basin = basin;
  out.spawn = spawnW;
  out.t1 = t1;
  out.rainLand = out.zRain; // sademetsän osuus ilman rannikkoa (joet jatkuvat mereen)
  out.coastW = coastW;
  out.c = c;
  out.rise = rise;
  out.hills2 = hills2;
  out.hCoast = hCoast;
  out.hDesert = hDesert;
  out.rock = 0;
  out.mesa = 0;
  out.cliff = cliff;
  out.escSharp = escSharp;
  out.escSoft = escSoft;
  out.karstM = karstM;
  out.wl = WATER_LEVEL;
  out.wtype = WATER.SEA;
  out.lakeR = 0;
  out.chan = 0;
  out.fall = 0;
  out.flowX = 0;
  out.flowZ = 0;
  return out;
}

// --- Erikoismuodostumat: graniittikalliot (Sahel, sademetsä) ja pöytävuoret (aavikko)

const FEAT_CELL = 560;
const _fs = {};

function featureInCell(ix, iz) {
  const key = ix * 131071 + iz;
  if (featCache.has(key)) return featCache.get(key);
  let f = null;
  const rand = mulberry32((Math.imul(ix, 2654435761) ^ Math.imul(iz, 40503) ^ Math.imul(SEED + 11, 2246822519)) >>> 0);
  const x = (ix + 0.2 + rand() * 0.6) * FEAT_CELL;
  const z = (iz + 0.2 + rand() * 0.6) * FEAT_CELL;
  sampleLand(x, z, _fs);
  const sahelRock = _fs.t1 > 0.8 ? (_fs.savanna + _fs.woodland + _fs.laterite) / _fs.t1 : 0;
  if (sahelRock > 0.6 && _fs.dunes < 0.15 && Math.hypot(x, z) > 300 && rand() < 0.3) {
    const R = 26 + rand() * 50;
    f = { type: 'dome', x, z, R, H: R * (0.35 + rand() * 0.3), seed: (rand() * 997) | 0 };
  } else if (_fs.rainforest > 0.9 && rand() < 0.12) {
    const R = 30 + rand() * 40;
    f = { type: 'dome', x, z, R, H: R * (0.4 + rand() * 0.25), seed: (rand() * 997) | 0 };
  } else if (_fs.desert > 0.9 && rand() < 0.35) {
    const R = 45 + rand() * 80;
    f = { type: 'mesa', x, z, R, H: 16 + rand() * 30, baseH: _fs.h, seed: (rand() * 997) | 0 };
  }
  // Kalliot ja pöytävuoret eivät katkaise jokia.
  if (f && nearChannel(x, z, f.R * 1.35 + 12)) f = null;
  featCache.set(key, f);
  return f;
}

function applyFeatures(x, z, out) {
  if (out.t1 + out.desert + out.rainforest < 0.01) return;
  const ix = Math.floor(x / FEAT_CELL), iz = Math.floor(z / FEAT_CELL);
  for (let j = iz - 1; j <= iz + 1; j++) {
    for (let i = ix - 1; i <= ix + 1; i++) {
      const F = featureInCell(i, j);
      if (!F) continue;
      const d = Math.hypot(x - F.x, z - F.z);
      if (d > F.R * 1.3) continue;
      const Rw = F.R * (1 + 0.16 * N.feat(x / (F.R * 0.6) + F.seed, z / (F.R * 0.6)));
      const u = d / Rw;
      if (F.type === 'dome') {
        if (u < 1) {
          const add = F.H * Math.pow(1 - u * u, 1.35) + N.detail(x / 7, z / 7) * 0.25 * (1 - u);
          out.h += add;
          out.rock = Math.max(out.rock, smoothstep(0.02, 0.2, add / F.H));
        }
      } else {
        const prof = 1 - smoothstep(0.78, 1.0, u);
        if (prof > 0) {
          const top = F.baseH + F.H + N.detail(x / 12, z / 12) * 0.4;
          out.h = Math.max(out.h, out.h + (top - out.h) * prof);
          out.mesa = Math.max(out.mesa, prof);
        }
      }
    }
  }
}

// Maa erikoismuodostumineen, ilman vesistöjen kaivamista.
function sampleBase(x, z, out) {
  sampleLand(x, z, out);
  applyFeatures(x, z, out);
  return out;
}

// Sessio 58: kaukaisten vuorten siluetit (render/farTerrain.js): maa ja
// muodostumat ilman vesistöjä (kevyempi kuin sampleTerrain).
export function sampleRelief(x, z, out = {}) {
  return sampleBase(x, z, out);
}

// --- Joet ja purot: valumaverkko ---------------------------------------------------
// Saari jaetaan RIV_CELL-ruudukkoon, jonka jokaisessa ruudussa on yksi solmu
// (väristetty keskipiste). Naapureita ovat neljä suoraa suuntaa ja jokaisen
// ruudun yksi (arvottu) lävistäjä, joten reunat eivät koskaan risteä.
// Tulvatäyttö merestä (priority flood) antaa jokaiselle maasolmulle alajuoksun
// naapurin: vesi virtaa aina kohti merta, ja verkko on puu. Sivujoet yhtyvät
// pääuomaan, mutta joet eivät risteä eivätkä muodosta silmukoita.
//
// Vesimäärä kertyy alajuoksulle alueen sademäärän mukaan (sademetsä ja vuoristo
// märkiä, savanni kuiva, aavikolla vesi haihtuu), ja uoman leveys kasvaa
// vesimäärän neliöjuurena. Veden pinta laskee alajuoksulle päin; harjanteen
// kohdalla joki kaivaa rotkon. Uoma kulkee pehmeänä käyränä solmujen ohi
// (kulmat pyöristetään), ja mutkat tulevat lisäksi koordinaatiston
// vääristyksestä. Verkko lasketaan, kun jokia tarvitaan ensimmäisen kerran.

const RIV_CELL = 250;                                    // solmuväli (m)
const RIV_G = Math.ceil((WORLD.radius * 2) / RIV_CELL); // ruudukon koko
const RIV_HALF = RIV_G / 2;
const RIV_SEG = 6;                                       // käyrän murtoviivan palat
const RIV_MIN_W = 0.45;                                  // tätä kapeampia uomia ei piirretä
const RIV_WARP = 50;                                     // vääristyksen suurin siirtymä (m)
let RIV = null;

// Vääristetty koordinaatisto: q = p + w(p). Voimakkuus on mitoitettu niin,
// että Jacobin determinantti pysyy positiivisena (vähintään n. 0,17): vääristys
// ei taita tasoa, joten joet eivät voi risteytyä.
function rivWarp(x, z, out) {
  out.x = x + N.rwarp(x / 560, z / 560) * 40 + N.rwarp(x / 150 + 40, z / 150 - 25) * 6;
  out.z = z + N.rwarp(x / 560 + 31, z / 560 - 17) * 40 + N.rwarp(x / 150 - 60, z / 150 + 12) * 6;
  return out;
}

// Uoman puolileveys (m) vesimäärästä (yksikkö: yhden sademetsäruudun valuma).
function rivWidth(F) {
  return F > 0 ? Math.min(13, 1.05 * Math.sqrt(F)) : 0;
}

function rivValley(w) {
  return w * 2.5 + 9 * Math.min(1, w / 2);
}

const _rw = { x: 0, z: 0 };
function riverNet() {
  if (RIV && RIV.seed === SEED) return RIV;
  const G = RIV_G, n = G * G;
  const nx = new Float64Array(n), nz = new Float64Array(n);
  const E = new Float32Array(n), run = new Float32Array(n), loss = new Float32Array(n);
  const sea = new Uint8Array(n), diag = new Uint8Array(n);
  const s = {};
  for (let j = 0; j < G; j++) {
    for (let i = 0; i < G; i++) {
      const k = j * G + i;
      const r = mulberry32((Math.imul(i + 1, 374761393) ^ Math.imul(j + 1, 668265263) ^ Math.imul(SEED + 41, 2246822519)) >>> 0);
      const qx = (i - RIV_HALF + 0.5 + (r() - 0.5) * 0.44) * RIV_CELL;
      const qz = (j - RIV_HALF + 0.5 + (r() - 0.5) * 0.44) * RIV_CELL;
      nx[k] = qx;
      nz[k] = qz;
      diag[k] = r() < 0.5 ? 1 : 0;
      // Todellinen paikka: käänteinen vääristys (riittävän tarkka arvio).
      rivWarp(qx, qz, _rw);
      const px = 2 * qx - _rw.x, pz = 2 * qz - _rw.z;
      sampleLand(px, pz, s); // ilman erikoismuodostumia (ne väistävät jokia)
      if (i === 0 || j === 0 || i === G - 1 || j === G - 1 || s.coastW > 0.5) {
        sea[k] = 1;
        E[k] = WATER_LEVEL;
        continue;
      }
      E[k] = smoothRef(px, pz, s) + r() * 0.3;
      const wet = smoothstep(0.4, 0.52, fbm(N.wet, px / 3200, pz / 3200, 2));
      run[k] = s.rainforest + s.mountains * 0.6 + s.oasis * 0.3 + s.beach * 0.15
        + s.t1 * (0.04 + 0.3 * wet) * (1 - s.spawn * 0.7);
      loss[k] = s.desert * 0.08 + s.t1 * 0.015;
    }
  }

  // Tulvatäyttö: matalin solmu ensin. Jokainen löydetty naapuri valuu solmuun,
  // josta se löydettiin.
  const down = new Int32Array(n).fill(-1);
  const key = new Float32Array(n);
  const seen = new Uint8Array(n);
  const order = new Int32Array(n);
  const heap = new Int32Array(n);
  let hn = 0, no = 0;
  const push = (k) => {
    let c = hn++;
    while (c > 0) {
      const p = (c - 1) >> 1;
      if (key[heap[p]] <= key[k]) break;
      heap[c] = heap[p];
      c = p;
    }
    heap[c] = k;
  };
  const pop = () => {
    const top = heap[0];
    const last = heap[--hn];
    let c = 0;
    for (;;) {
      let l = 2 * c + 1;
      if (l >= hn) break;
      if (l + 1 < hn && key[heap[l + 1]] < key[heap[l]]) l++;
      if (key[heap[l]] >= key[last]) break;
      heap[c] = heap[l];
      c = l;
    }
    heap[c] = last;
    return top;
  };
  for (let k = 0; k < n; k++) {
    if (!sea[k]) continue;
    seen[k] = 1;
    key[k] = E[k];
    push(k);
  }
  const visit = (k, i, j) => {
    if (i < 0 || j < 0 || i >= G || j >= G) return;
    const m = j * G + i;
    if (seen[m]) return;
    seen[m] = 1;
    down[m] = k;
    key[m] = Math.max(E[m], key[k] + 0.001);
    push(m);
  };
  while (hn > 0) {
    const k = pop();
    order[no++] = k;
    const i = k % G, j = (k - i) / G;
    visit(k, i + 1, j);
    visit(k, i - 1, j);
    visit(k, i, j + 1);
    visit(k, i, j - 1);
    // Lävistäjät: ruudun (i, j) lävistäjä on joko (i,j)-(i+1,j+1) tai (i+1,j)-(i,j+1).
    if (i < G - 1 && j < G - 1 && diag[k] === 0) visit(k, i + 1, j + 1);
    if (i > 0 && j < G - 1 && diag[k - 1] === 1) visit(k, i - 1, j + 1);
    if (i < G - 1 && j > 0 && diag[k - G] === 1) visit(k, i + 1, j - 1);
    if (i > 0 && j > 0 && diag[k - G - 1] === 0) visit(k, i - 1, j - 1);
  }

  // Vesimäärä ja veden pinta yläjuoksulta alajuoksulle.
  const Fin = new Float32Array(n), Fout = new Float32Array(n), wlN = new Float32Array(n);
  const mainUp = new Int32Array(n).fill(-1);
  for (let k = 0; k < n; k++) {
    if (sea[k]) { wlN[k] = WATER_LEVEL; continue; }
    const low = 1 - smoothstep(WATER_LEVEL + 1, WATER_LEVEL + 4, E[k]);
    wlN[k] = Math.max(WATER_LEVEL, E[k] - 2.0 * (1 - low) - 0.8 * low);
  }
  for (let t = no - 1; t >= 0; t--) {
    const k = order[t], d = down[k];
    if (d < 0) continue;
    Fout[k] = (run[k] + Fin[k]) * (1 - loss[k]);
    Fin[d] += Fout[k];
    if (wlN[k] < wlN[d]) wlN[d] = wlN[k]; // pinta ei nouse alajuoksulle päin
    if (mainUp[d] < 0 || Fout[k] > Fout[mainUp[d]]) mainUp[d] = k;
  }

  // Uoman palat: lähteestä keskikohtaan, pääuoman mutka solmun kohdalla
  // (sisääntulevan reunan keskeltä lähtevän reunan keskelle) ja suu mereen.
  // Sivujoet liittyvät pääuomaan kukin omassa kohdassaan loivassa kulmassa,
  // joten liitokset ovat kahden uoman yhtymiä (ei usean joen solmukohtia).
  const P = [];
  // parent = pääuoman pala, johon sivujoki liittyy; jw = pääuoman leveys liitoskohdassa.
  const addPiece = (ax, az, bx, bz, cx, cz, w0, w1, wl0, wl1, parent = -1, jw = 0) => {
    P.push([ax, az, bx, bz, cx, cz, w0, w1, wl0, wl1, parent, jw]);
  };
  const ups = new Map();
  for (let k = 0; k < n; k++) {
    const d = down[k];
    if (d < 0 || rivWidth(Fout[k]) < RIV_MIN_W) continue;
    if (!ups.has(d)) ups.set(d, []);
    ups.get(d).push(k);
  }
  for (let k = 0; k < n; k++) {
    const d = down[k];
    if (d < 0) continue;
    const wk = rivWidth(Fout[k]);
    if (wk < RIV_MIN_W) continue;
    const mx = (nx[k] + nx[d]) / 2, mz = (nz[k] + nz[d]) / 2;
    const wlM = (wlN[k] + wlN[d]) / 2;
    const list = ups.get(k);
    if (!list) {
      addPiece(nx[k], nz[k], (nx[k] + mx) / 2, (nz[k] + mz) / 2, mx, mz, 0, wk, wlN[k], wlM);
    } else {
      const u1 = mainUp[k];
      const kx = nx[k], kz = nz[k];
      const ax = (nx[u1] + kx) / 2, az = (nz[u1] + kz) / 2;
      const wlA = (wlN[u1] + wlN[k]) / 2;
      const mainIdx = P.length;
      const wA = rivWidth(Fout[u1]);
      addPiece(ax, az, kx, kz, mx, mz, wA, wk, wlA, wlM);
      // Sivujoet liittyvät eri kohtiin: yläjuoksun suunnasta tuleva liittyy
      // aikaisemmin, jotta sivujoet eivät risteä keskenään eivätkä
      // vastakkaisilta puolilta tulevat osu samaan kohtaan (näyttäisi risteykseltä).
      const minors = [];
      const upA = Math.atan2(az - kz, ax - kx);
      for (const u of list) {
        if (u === u1) continue;
        const sx = (nx[u] + kx) / 2, sz = (nz[u] + kz) / 2;
        let ang = Math.abs(Math.atan2(sz - kz, sx - kx) - upA);
        if (ang > Math.PI) ang = Math.PI * 2 - ang;
        minors.push({ u, sx, sz, ang });
      }
      minors.sort((p, q) => p.ang - q.ang);
      {
        const g = minors;
        for (let gi = 0; gi < g.length; gi++) {
          const { u, sx, sz } = g[gi];
          const tau = 0.14 + (0.76 * (gi + 0.5)) / g.length;
          const it = 1 - tau;
          const jx = it * it * ax + 2 * tau * it * kx + tau * tau * mx;
          const jz = it * it * az + 2 * tau * it * kz + tau * tau * mz;
          let tx = it * (kx - ax) + tau * (mx - kx), tz = it * (kz - az) + tau * (mz - kz);
          const tl = Math.hypot(tx, tz) || 1;
          tx /= tl; tz /= tl;
          let px = -tz, pz = tx;
          if ((sx - jx) * px + (sz - jz) * pz < 0) { px = -px; pz = -pz; }
          const L = Math.hypot(sx - jx, sz - jz);
          const cx = jx - tx * L * 0.45 + px * L * 0.3, cz = jz - tz * L * 0.45 + pz * L * 0.3;
          const wu = rivWidth(Fout[u]);
          addPiece(sx, sz, cx, cz, jx, jz, wu, wu, (wlN[u] + wlN[k]) / 2, wlA + (wlM - wlA) * tau, mainIdx, wA + (wk - wA) * tau);
        }
      }
    }
    if (sea[d]) addPiece(mx, mz, (mx + nx[d]) / 2, (mz + nz[d]) / 2, nx[d], nz[d], wk, wk, wlM, wlN[d]);
  }

  // Murtoviivat, rajat ja hakemisto (ruudukon soluihin vääristetyssä
  // koordinaatistossa; lisäksi karkea maski todellisessa koordinaatistossa).
  const np = P.length;
  const pts = new Float32Array(np * (RIV_SEG + 1) * 2);
  const pw = new Float32Array(np * 5); // w0, w1, wl0, wl1, jyrkkyys
  const pj = new Float32Array(np * 2); // sivujoelle: pääuoman pala ja sen leveys liitoksessa (muuten -1)
  const box = new Float32Array(np * 4);
  const counts = new Int32Array(n + 1);
  const mask = new Uint8Array(n);
  const cellsOf = (pi, fn) => {
    const i0 = Math.max(0, Math.floor(box[pi * 4] / RIV_CELL + RIV_HALF));
    const j0 = Math.max(0, Math.floor(box[pi * 4 + 1] / RIV_CELL + RIV_HALF));
    const i1 = Math.min(G - 1, Math.floor(box[pi * 4 + 2] / RIV_CELL + RIV_HALF));
    const j1 = Math.min(G - 1, Math.floor(box[pi * 4 + 3] / RIV_CELL + RIV_HALF));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) fn(j * G + i);
  };
  for (let pi = 0; pi < np; pi++) {
    const [ax, az, bx, bz, cx, cz, w0, w1, wl0, wl1, parent, jw] = P[pi];
    pj[pi * 2] = parent;
    pj[pi * 2 + 1] = jw;
    let minx = Infinity, minz = Infinity, maxx = -Infinity, maxz = -Infinity, len = 0;
    for (let q = 0; q <= RIV_SEG; q++) {
      const t = q / RIV_SEG, it = 1 - t;
      const x = it * it * ax + 2 * t * it * bx + t * t * cx;
      const z = it * it * az + 2 * t * it * bz + t * t * cz;
      const o = (pi * (RIV_SEG + 1) + q) * 2;
      pts[o] = x;
      pts[o + 1] = z;
      if (q > 0) len += Math.hypot(x - pts[o - 2], z - pts[o - 1]);
      minx = Math.min(minx, x); maxx = Math.max(maxx, x);
      minz = Math.min(minz, z); maxz = Math.max(maxz, z);
    }
    const V = rivValley(Math.max(w0, w1)) + 2;
    box[pi * 4] = minx - V; box[pi * 4 + 1] = minz - V; box[pi * 4 + 2] = maxx + V; box[pi * 4 + 3] = maxz + V;
    pw[pi * 5] = w0; pw[pi * 5 + 1] = w1; pw[pi * 5 + 2] = wl0; pw[pi * 5 + 3] = wl1;
    pw[pi * 5 + 4] = smoothstep(0.08, 0.2, (wl0 - wl1) / Math.max(1, len));
    cellsOf(pi, (c) => { counts[c + 1]++; });
    // Maski: vääristyksen suurin siirtymä huomioiden.
    const i0 = Math.max(0, Math.floor((minx - V - RIV_WARP) / RIV_CELL + RIV_HALF));
    const j0 = Math.max(0, Math.floor((minz - V - RIV_WARP) / RIV_CELL + RIV_HALF));
    const i1 = Math.min(G - 1, Math.floor((maxx + V + RIV_WARP) / RIV_CELL + RIV_HALF));
    const j1 = Math.min(G - 1, Math.floor((maxz + V + RIV_WARP) / RIV_CELL + RIV_HALF));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) mask[j * G + i] = 1;
  }
  for (let c = 0; c < n; c++) counts[c + 1] += counts[c];
  const list = new Int32Array(counts[n]);
  const fill = counts.slice(0, n);
  for (let pi = 0; pi < np; pi++) cellsOf(pi, (c) => { list[fill[c]++] = pi; });

  RIV = { seed: SEED, start: counts, list, pts, pw, pj, box, mask, pieces: np };
  return RIV;
}

// Lähin kohta palan pi murtoviivalla pisteestä (qx, qz) vääristetyssä
// koordinaatistossa. Palauttaa etäisyyden; parametri (0..1) ja suunta jäävät
// muuttujiin _pt, _pdx, _pdz.
let _pt = 0, _pdx = 0, _pdz = 0;
function pieceDist(R, pi, qx, qz) {
  const pts = R.pts;
  let best = Infinity;
  const o0 = pi * (RIV_SEG + 1) * 2;
  for (let q = 0; q < RIV_SEG; q++) {
    const o = o0 + q * 2;
    const ax = pts[o], az = pts[o + 1];
    const ex = pts[o + 2] - ax, ez = pts[o + 3] - az;
    const L2 = ex * ex + ez * ez;
    let t = L2 > 0 ? ((qx - ax) * ex + (qz - az) * ez) / L2 : 0;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const dx = qx - ax - ex * t, dz = qz - az - ez * t;
    const d2 = dx * dx + dz * dz;
    if (d2 < best) {
      best = d2;
      _pt = (q + t) / RIV_SEG;
      _pdx = ex;
      _pdz = ez;
    }
  }
  return Math.sqrt(best);
}

// Loiva vertailukorkeus (maaston suuret muodot): solmujen korkeus ja veden
// pinnan yläraja notkoissa.
function smoothRef(x, z, s) {
  let h = 0;
  if (s.t1 > 0.001) {
    let hs = 1.7 + fbm(N.base, x / 230, z / 230, 2) * 1.8 + s.hills2 * 6 * (1 - s.spawn * 0.5);
    hs += (-2.0 - hs) * s.basin;
    h += s.t1 * hs;
  }
  if (s.rainforest > 0.001) h += s.rainforest * (5.5 + fbm(N.hills, x / 320, z / 320, 2) * 11 * (1 - 0.5 * (s.karstM || 0))) + (s.escSoft || 0);
  if (s.desert + s.oasis > 0.001) h += (s.desert + s.oasis) * s.hDesert;
  if (s.mountains > 0.001) h += s.mountains * (6 + ridged(x / 650, z / 650, 2) * 110 * s.rise);
  if (s.coastW > 0.001) h += s.coastW * s.hCoast;
  return h;
}

// Kaivettu korkeus yhden uoman kohdalla. w = veden puolileveys, V = laakson
// puolileveys. Rotkon kohdalla ranta täytetään loivasti pinnan yläpuolelle.
function carveH(raw, dc, w, V, wl, depth) {
  let target;
  if (dc < w) {
    const u = dc / w;
    target = wl - depth * (1 - u * u);
  } else {
    target = wl + 0.15 + (dc - w) * 0.35;
  }
  // Sessio 24: pehmeä minimi (uoman reunat pyöristyvät, ei taitekohtaa).
  let h = smin(raw, target, 0.9);
  h = h + (raw - h) * smoothstep(V * 0.6, V, dc);
  if (dc >= w && h < wl + 0.15 && raw > WATER_LEVEL) {
    h += (wl + 0.15 - h) * (1 - smoothstep(w + 3, Math.max(V, w + 9), dc));
  }
  return h;
}

const _rq = { x: 0, z: 0 };
// Pisteen lähellä olevat uomat (enintään 8): pinnan korkeus lasketaan ensin
// kaikille, sitten pinnat sovitetaan yhteen ja lopuksi uomat kaivetaan.
const _cand = [];
for (let i = 0; i < 8; i++) _cand.push({ o: 0, dc: 0, w: 0, V: 0, wl: 0, lim: 0, dx: 0, dz: 0 });

function applyRivers(x, z, out) {
  if (out.ocean > 0.9) return;
  const R = riverNet();
  const ci0 = Math.floor(x / RIV_CELL + RIV_HALF), cj0 = Math.floor(z / RIV_CELL + RIV_HALF);
  if (ci0 < 0 || cj0 < 0 || ci0 >= RIV_G || cj0 >= RIV_G || !R.mask[cj0 * RIV_G + ci0]) return;
  rivWarp(x, z, _rq);
  const qx = _rq.x, qz = _rq.z;
  const ci = Math.floor(qx / RIV_CELL + RIV_HALF), cj = Math.floor(qz / RIV_CELL + RIV_HALF);
  if (ci < 0 || cj < 0 || ci >= RIV_G || cj >= RIV_G) return;
  const c = cj * RIV_G + ci;
  const a = R.start[c], b = R.start[c + 1];
  if (a === b) return;
  // Sessio 57/58: karstimassiivi madaltuu joen laaksossa (jokiverkon
  // vertailukorkeus ei näe massiiveja), joten joki kulkee laaksoa tai rotkoa
  // pitkin eikä törmää kallioseinään. Isompien jokien laakso on leveämpi.
  const escD = (out.escSharp || 0) - (out.escSoft || 0);
  if (escD > 0.02 || escD < -0.02) {
    let fade = 1;
    for (let e = a; e < b; e++) {
      const pi = R.list[e];
      const bx = pi * 4;
      if (qx < R.box[bx] || qz < R.box[bx + 1] || qx > R.box[bx + 2] || qz > R.box[bx + 3]) continue;
      const w = Math.max(R.pw[pi * 5], R.pw[pi * 5 + 1]);
      if (w < 0.3) continue;
      const V = rivValley(w);
      fade = Math.min(fade, smoothstep(V * 0.6, V + 5 + w * 2.5, pieceDist(R, pi, qx, qz)));
    }
    if (fade < 1) {
      out.h -= escD * (1 - fade);
      out.cliff *= fade;
    }
  }
  const raw = out.h;
  const notRock = 1 - Math.min(1, out.rock * 2 + out.mesa * 2);
  let vary = -1, ref = NaN, n = 0;
  for (let e = a; e < b && n < _cand.length; e++) {
    const pi = R.list[e];
    const bx = pi * 4;
    if (qx < R.box[bx] || qz < R.box[bx + 1] || qx > R.box[bx + 2] || qz > R.box[bx + 3]) continue;
    const dc = pieceDist(R, pi, qx, qz);
    const t = _pt;
    const pdx = _pdx, pdz = _pdz;
    const o = pi * 5;
    if (vary < 0) vary = 0.8 + 0.4 * (N.width(x / 420, z / 420) * 0.5 + 0.5);
    let w = (R.pw[o] + (R.pw[o + 1] - R.pw[o]) * t) * notRock * vary;
    // Vuoristossa jyrkillä osuuksilla uoma kuivuu.
    if (out.mountains > 0.05) w *= 1 - out.mountains * R.pw[o + 4];
    if (w < 0.3) continue;
    const V = rivValley(w);
    if (dc >= V) continue;
    if (ref !== ref) ref = smoothRef(x, z, out);
    // Pinta laskee alajuoksulle; notkoissa se seuraa maastoa (ei penkereitä).
    let wl = Math.max(WATER_LEVEL, Math.min(R.pw[o + 2] + (R.pw[o + 3] - R.pw[o + 2]) * t, ref - 1.0));
    // Pienet purot ja kuivat uomat kulkevat lähellä maan pintaa (matala oja).
    // Sivujoen loppuosalla nosto liukuu pääuoman nostoon, jotta pinnat
    // kohtaavat liitoksessa samalla korkeudella.
    let wr = w;
    const par = R.pj[pi * 2];
    if (par >= 0) {
      const bl = smoothstep(0.35, 1.0, t);
      if (bl > 0) {
        let wm = R.pj[pi * 2 + 1] * notRock * vary;
        if (out.mountains > 0.05) wm *= 1 - out.mountains * R.pw[par * 5 + 4];
        wr = w + (wm - w) * bl;
      }
    }
    if (wr < 2) {
      // Nosto enintään todellisen maanpinnan alle, eikä pieni puro kellu
      // maan yläpuolella (loiva vertailukorkeus voi olla notkon yläpuolella).
      const f = 1 - smoothstep(0.8, 2.0, wr);
      wl += Math.max(0, Math.min(ref - 0.5, raw - 0.2) - wl) * f;
      wl = Math.max(WATER_LEVEL, Math.min(wl, raw - 0.2 + (1 - f) * 8));
    }
    const k = _cand[n++];
    k.o = o; k.dc = dc; k.w = w; k.V = V; k.wl = wl; k.dx = pdx; k.dz = pdz;
  }
  if (!n) return;
  // Pintojen yhteensovitus: kapea uoma ei saa olla toisen (yhtä leveän tai
  // leveämmän) uoman pintaa paljon korkeammalla sen laakson kohdalla, muuten
  // liitoksiin ja vierekkäisiin uomiin syntyy pystysuora vesiseinä. Pinta
  // laskee loivasti (0,3 m / m) kohti matalampaa uomaa, laakson rinnettä loivemmin.
  for (let i = 0; i < n; i++) {
    const A = _cand[i];
    let lim = A.wl;
    for (let j = 0; j < n; j++) {
      const B = _cand[j];
      if (j === i || B.wl >= lim || A.w > B.w + 1) continue;
      lim = Math.min(lim, B.wl + Math.max(0, B.dc - B.w) * 0.3);
    }
    A.lim = lim;
  }
  let hMin = raw, hMax = raw, bestN = Infinity;
  for (let i = 0; i < n; i++) {
    const k = _cand[i];
    const w = k.w, wl = k.lim;
    // Kapenevan uoman pohja nousee pinnan yläpuolelle: vesi loppuu pehmeästi
    // ja uoma jatkuu kuivana.
    const ds = smoothstep(0.9, 2.0, w);
    const depth = (0.35 + w * 0.2) * ds - 0.2 * (1 - ds);
    const h = carveH(raw, k.dc, w, k.V, wl, depth);
    if (h < hMin) hMin = h;
    if (h > hMax) hMax = h;
    out.chan = Math.max(out.chan, 1 - smoothstep(w, k.V, k.dc));
    if (k.dc < w + 1.5 && raw > WATER_LEVEL && wl > out.wl - 0.01 && k.dc / w < bestN) {
      bestN = k.dc / w;
      out.wl = Math.max(out.wl, wl);
      out.wtype = w >= 4.5 ? WATER.RIVER : WATER.STREAM;
      // Virtaus alajuoksulle päin; nopeus pinnan kaltevuudesta.
      const len = Math.hypot(k.dx, k.dz) || 1;
      const slope = Math.max(0, R.pw[k.o + 2] - R.pw[k.o + 3]) / (len * RIV_SEG);
      const speed = Math.min(1.5, 0.3 + slope * 12) * (w >= 4.5 ? 1 : 1.2);
      out.flowX = (k.dx / len) * speed;
      out.flowZ = (k.dz / len) * speed;
    }
  }
  out.h = hMin < raw ? hMin : hMax;
}

// Onko pisteen lähellä uoma (järvet eivät osu uomiin).
function nearChannel(x, z, margin) {
  const R = riverNet();
  rivWarp(x, z, _rq);
  const qx = _rq.x, qz = _rq.z;
  const r = Math.ceil(margin / RIV_CELL);
  const ci = Math.floor(qx / RIV_CELL + RIV_HALF), cj = Math.floor(qz / RIV_CELL + RIV_HALF);
  for (let j = Math.max(0, cj - r); j <= Math.min(RIV_G - 1, cj + r); j++) {
    for (let i = Math.max(0, ci - r); i <= Math.min(RIV_G - 1, ci + r); i++) {
      const c = j * RIV_G + i;
      for (let e = R.start[c]; e < R.start[c + 1]; e++) {
        const pi = R.list[e];
        const w = Math.max(R.pw[pi * 5], R.pw[pi * 5 + 1]);
        // Myös pienet purot laaksoineen (järvi tai kallio niiden päällä jättäisi
        // puron veden ilmaan).
        if (w * 1.2 < 0.3) continue;
        if (pieceDist(R, pi, qx, qz) < margin + rivValley(w * 1.2)) return true;
      }
    }
  }
  return false;
}

// --- Järvet ja lammet (sademetsä, vuoristo) ---------------------------------------

const LAKE_CELL = 380;
const _lb = {};

function lakeInCell(ix, iz) {
  const key = ix * 131071 + iz;
  if (lakeCache.has(key)) return lakeCache.get(key);
  let lake = null;
  const rand = mulberry32((Math.imul(ix, 1103515245) ^ Math.imul(iz, 12345) ^ Math.imul(SEED + 3, 2654435761)) >>> 0);
  const cx = (ix + 0.5) * LAKE_CELL, cz = (iz + 0.5) * LAKE_CELL;
  sampleBase(cx, cz, _lb);
  const chance = _lb.rainforest * 0.75 + _lb.mountains * 0.6;
  if (rand() < chance) {
    let R;
    if (_lb.rainforest >= _lb.mountains) R = rand() < 0.15 ? 70 + rand() * 60 : 18 + rand() * 36;
    else R = 25 + rand() * 55;
    const inset = Math.min(0.45, (R * 1.7) / LAKE_CELL);
    // Valitse muutamasta paikasta matalin (järvet syntyvät notkoihin).
    let best = null;
    for (let k = 0; k < 6; k++) {
      const x = (ix + inset + rand() * (1 - 2 * inset)) * LAKE_CELL;
      const z = (iz + inset + rand() * (1 - 2 * inset)) * LAKE_CELL;
      sampleBase(x, z, _lb);
      if (_lb.rainforest + _lb.mountains < 0.9 || _lb.rock > 0.05 || _lb.cliff > 0.02) continue;
      if (best && _lb.h >= best.h) continue;
      if (nearChannel(x, z, R * 1.75)) continue;
      best = { x, z, h: _lb.h, mt: _lb.mountains };
    }
    if (best) {
      // Pinta reunan matalimman kohdan alapuolelle, jottei vesi valu yli.
      let minRim = Infinity, maxRim = -Infinity, escLo = Infinity, escHi = -Infinity;
      for (let a = 0; a < 16; a++) {
        const ang = (a / 16) * Math.PI * 2;
        const h = sampleBase(best.x + Math.cos(ang) * R * 1.3, best.z + Math.sin(ang) * R * 1.3, _lb).h;
        minRim = Math.min(minRim, h);
        maxRim = Math.max(maxRim, h);
        escLo = Math.min(escLo, _lb.escSharp);
        escHi = Math.max(escHi, _lb.escSharp);
      }
      // Sessio 57: ei järveä jyrkänteen kohdalle (vesi valuisi reunan yli).
      if (escHi - escLo > 0.5) minRim = -Infinity;
      const wl = minRim - 0.35;
      // Vuoristossa järvi saa olla jyrkkärantaisempi (kuten kirkkojärvet).
      const steep = best.mt > 0.5 ? 2 : 1;
      if (wl > WATER_LEVEL + 0.4 && best.h - wl < 7 * steep && maxRim - minRim < 30 * steep) {
        lake = { x: best.x, z: best.z, R, wl, depth: Math.min(8, Math.max(1.4, R * 0.075)) };
      }
    }
  }
  lakeCache.set(key, lake);
  return lake;
}

function applyLakes(x, z, out) {
  if (out.rainforest + out.mountains < 0.02) return;
  const ix = Math.floor(x / LAKE_CELL), iz = Math.floor(z / LAKE_CELL);
  for (let j = iz - 1; j <= iz + 1; j++) {
    for (let i = ix - 1; i <= ix + 1; i++) {
      const L = lakeInCell(i, j);
      if (!L) continue;
      const d = Math.hypot(x - L.x, z - L.z);
      if (d > L.R * 1.75) continue;
      // Rantaviiva on epäsäännöllinen.
      const Rw = L.R * (1 + 0.18 * N.lakeShape(x / 34, z / 34));
      const t = d / Rw;
      const target = t < 1 ? L.wl - L.depth * (1 - t * t) : L.wl + (t - 1) * L.R * 0.22;
      let h = Math.min(out.h, target);
      // Pehmeä penger rannan takana (ei pystysuoria seinämiä)
      if (t >= 1 && h < L.wl + 0.15) h += (L.wl + 0.15 - h) * (1 - smoothstep(1.15, 1.4, t));
      const hOld = out.h;
      out.h = h + (out.h - h) * smoothstep(1.3, 1.7, t);
      // Uoman vesi laskee järven painanteen mukana (ei jää ilmaan).
      const drop = hOld - out.h;
      if (drop > 0 && (out.wtype === WATER.RIVER || out.wtype === WATER.STREAM)) out.wl = Math.max(WATER_LEVEL, out.wl - drop);
      if (t < 1.25 && L.wl > out.wl) {
        out.wl = L.wl;
        out.wtype = WATER.LAKE;
        out.lakeR = L.R;
        out.flowX = 0;
        out.flowZ = 0;
      }
    }
  }
}

// --- Sessio 57: vesiputoukset ------------------------------------------------------
// Sademetsän jyrkänteen päällä alkaa lähdepuro, joka putoaa kallion yli
// altaaseen ja jatkuu altaasta lyhyenä laskupurona, joka imeytyy maahan.
// Täysin erillään jokiverkosta: paikat valitaan kaukaa uomista ja järvistä,
// joten jokiverkko, joet ja niiden pinnat eivät muutu lainkaan.

const FALL_CELL = 520;
const FALL_CHANCE = 0.75;
const _fb = {};

// Pisteen etäisyys murtoviivaan: palauttaa etäisyyden ja asettaa _fu (solmuindeksi
// + osuus) sekä _fdx/_fdz (palan suunta).
let _fu = 0, _fdx = 0, _fdz = 0;
function polyDist(px, pz, x, z) {
  let best = Infinity;
  for (let k = 0; k < px.length - 1; k++) {
    const ax = px[k], az = pz[k];
    const ex = px[k + 1] - ax, ez = pz[k + 1] - az;
    const l2 = ex * ex + ez * ez || 1;
    const t = Math.max(0, Math.min(1, ((x - ax) * ex + (z - az) * ez) / l2));
    const dx = x - ax - ex * t, dz = z - az - ez * t;
    const d2 = dx * dx + dz * dz;
    if (d2 < best) { best = d2; _fu = k + t; _fdx = ex; _fdz = ez; }
  }
  return Math.sqrt(best);
}

// Puron pinta solmuissa (tiheä, n. 2 m väli): laskee alajuoksulle eikä nouse
// maan pinnan yläpuolelle. Palauttaa kelvollisten solmujen pinnat; lyhyempi
// kuin reitti, jos uoma pitäisi kaivaa liian syväksi tai maasto putoaa jyrkästi.
function streamProfile(px, pz, wl0, maxCut, minSlope, maxStep) {
  const n = px.length;
  const wl = new Float32Array(n);
  let prev = wl0, k = 0;
  for (; k < n; k++) {
    const h = sampleBase(px[k], pz[k], _fb).h;
    const step = k ? Math.hypot(px[k] - px[k - 1], pz[k] - pz[k - 1]) : 0;
    const v = Math.min(prev - step * minSlope, h - 0.35);
    if (h - v > maxCut || prev - v > maxStep || _fb.cliff > 0.05) break;
    wl[k] = prev = v;
  }
  return k === n ? wl : wl.slice(0, k);
}

function lakeNear(x, z, margin) {
  const ix = Math.floor(x / LAKE_CELL), iz = Math.floor(z / LAKE_CELL);
  for (let j = iz - 1; j <= iz + 1; j++) {
    for (let i = ix - 1; i <= ix + 1; i++) {
      const L = lakeInCell(i, j);
      if (L && Math.hypot(x - L.x, z - L.z) < L.R * 1.75 + margin) return true;
    }
  }
  return false;
}

// Sopiiko piste putouksen ympäristöksi (sademetsää, ei kalliomuodostumia).
function fallGround(x, z) {
  sampleBase(x, z, _fb);
  return _fb.rainforest > 0.9 && _fb.rock < 0.02 && _fb.mesa < 0.02;
}

// Murtoviiva tasavälisiksi (n. 2 m) pisteiksi.
function densify(cx, cz, step) {
  const ox = [cx[0]], oz = [cz[0]];
  for (let k = 1; k < cx.length; k++) {
    const L = Math.hypot(cx[k] - cx[k - 1], cz[k] - cz[k - 1]);
    const m = Math.max(1, Math.round(L / step));
    for (let i = 1; i <= m; i++) {
      ox.push(cx[k - 1] + (cx[k] - cx[k - 1]) * i / m);
      oz.push(cz[k - 1] + (cz[k] - cz[k - 1]) * i / m);
    }
  }
  return [Float32Array.from(ox), Float32Array.from(oz)];
}

// Sessio 58: putous karstimassiivin seinämältä. Kenttä G = 0 on seinämän
// puolivälissä (F = reunan taso + KARST_E / 2).
function karstG(x, z) {
  return karstField(x, z) - karstLevel(karstMaskAt(x, z)) - KARST_E / 2;
}
function tryFall(x, z, c, rand) {
  if (karstMaskAt(x, z) < 0.6) return null;
  // Newtonin askelin seinämän tasa-arvokäyrälle.
  let gx = 0, gz = 0;
  const e = 1.5;
  for (let i = 0; i < 16; i++) {
    const f = karstG(x, z) + c;
    gx = (karstG(x + e, z) - karstG(x - e, z)) / (2 * e);
    gz = (karstG(x, z + e) - karstG(x, z - e)) / (2 * e);
    const g2 = gx * gx + gz * gz;
    if (g2 < 1e-12) return null;
    let s = (f - c) / g2;
    const sl = Math.abs(s) * Math.sqrt(g2);
    if (sl > 60) s *= 60 / sl;
    x -= gx * s;
    z -= gz * s;
    if (Math.abs(f - c) < 2e-5) break;
  }
  if (Math.abs(karstG(x, z)) > 3e-4) return null;
  const g = Math.hypot(gx, gz);
  // Seinämän vaakasuora puolileveys: vain jyrkät kallioreunat kelpaavat
  // (ei loivan rinteen kohdalla).
  const half = KARST_E / 2 / g + 1.2;
  if (half > 8 || rampAt(x, z) > 0.02) return null;
  const nx = gx / g, nz = gz / g;   // ylös rinnettä (kallion päälle)
  const dx = -nx, dz = -nz;         // putoamissuunta
  const tx = -nz, tz = nx;          // reunan suuntainen
  const lipX = x + nx * half, lipZ = z + nz * half;
  const footX = x - nx * (half + 0.6), footZ = z - nz * (half + 0.6);
  if (!fallGround(lipX + nx * 0.4, lipZ + nz * 0.4)) return null;
  const hTop = _fb.h;
  if (!fallGround(footX, footZ)) return null;
  const hFoot = _fb.h;
  if (hTop - hFoot < 5) return null;
  // Reuna on suora myös sivuilla (ei kärki eikä sisäkulma).
  for (const s of [-7, 7]) {
    const a = sampleBase(lipX + nx * 0.4 + tx * s, lipZ + nz * 0.4 + tz * s, _fb).h;
    const b = sampleBase(footX + tx * s, footZ + tz * s, _fb).h;
    if (a - b < 4 || Math.abs(a - hTop) > 3.5) return null;
  }
  // Kaukana joista ja järvistä (jokiverkko ei muutu).
  if (nearChannel(x, z, 50) || nearChannel(footX + dx * 40, footZ + dz * 40, 40)) return null;
  if (lakeNear(x, z, 70)) return null;

  // Allas kallion juurella. Takareuna on vähintään 1,3 m reunasta, jotta
  // ylä- ja alapinnan väliin jää kuivaa seinämää (ei vesiseinää).
  const R = 4.5 + rand() * 3;
  const pc = Math.max(1.3 + R, 2 * half + 1 + R * 0.4);
  const poolX = lipX + dx * pc, poolZ = lipZ + dz * pc;
  let minRim = Infinity, lo = Infinity, hi = -Infinity;
  for (let a = 0; a < 16; a++) {
    const ang = (a / 16) * Math.PI * 2;
    const rx = Math.cos(ang), rz = Math.sin(ang);
    if (rx * dx + rz * dz < -0.2) continue;  // kallion puoli ei rajoita
    for (const r of [0.5, 1.3, 1.9]) {
      if (!fallGround(poolX + rx * R * r, poolZ + rz * R * r) || _fb.cliff > 0.1) return null;
      lo = Math.min(lo, _fb.h);
      hi = Math.max(hi, _fb.h);
      if (r === 1.3) minRim = Math.min(minRim, _fb.h);
    }
  }
  if (hi - lo > 3.5) return null;
  const poolWl = Math.min(minRim - 0.3, hFoot - 0.15);
  const depth = 1.8 + rand() * 0.8;

  // Lähdepuro kallion päällä: lähteestä reunalle, loiva mutka.
  const Ls = 26 + rand() * 24; // massiivin laki kumpuilee kauempana reunasta
  const bend = (rand() - 0.5) * 16;
  const cx = [], cz = [];
  for (let k = 0; k <= 12; k++) {
    const t = k / 12;
    const sb = Math.sin(Math.PI * t);
    const off = bend * sb * sb;
    cx.push(lipX + nx * Ls * (1 - t) + tx * off);
    cz.push(lipZ + nz * Ls * (1 - t) + tz * off);
  }
  const [tpx, tpz] = densify(cx, cz, 2);
  const nt = tpx.length;
  const tw = new Float32Array(nt);
  const wTop = 1.35 + rand() * 0.5;
  for (let k = 0; k < nt; k++) {
    const t = k / (nt - 1);
    tw[k] = wTop * smoothstep(0, 0.35, t) + 0.25 * (1 - smoothstep(0, 0.35, t));
    if (!fallGround(tpx[k], tpz[k])) return null;
  }
  const h0 = sampleBase(tpx[0], tpz[0], _fb).h;
  // Viimeiset solmut ovat reunalla (seinämän kallio sallitaan).
  const twl = streamProfile(tpx.subarray(0, nt - 2), tpz.subarray(0, nt - 2), h0 - 0.3, 2.6, 0.012, 0.6);
  if (twl.length < nt - 2) return null;
  const twlAll = new Float32Array(nt);
  twlAll.set(twl);
  twlAll[nt - 2] = twl[nt - 3] - 0.03;
  twlAll[nt - 1] = twl[nt - 3] - 0.06;
  const lipWl = twlAll[nt - 1];
  if (poolWl < WATER_LEVEL + 0.4 || hFoot - poolWl > 3 || lipWl - poolWl < 4.5) return null;

  // Laskupuro: altaasta jyrkimmän laskun suuntaan; lopussa kapenee ja imeytyy
  // maahan. Ei koskaan uoman, järven tai jyrkänteen lähelle.
  const ox = [poolX + dx * R * 0.6], oz = [poolZ + dz * R * 0.6];
  let ux = dx, uz = dz;
  const Lo = 45 + rand() * 50;
  for (let len = 0; len < Lo; len += 6) {
    const lx = ox[ox.length - 1], lz = oz[oz.length - 1];
    let bh = Infinity, bx = 0, bz = 0;
    for (const a of [-0.9, -0.45, 0, 0.45, 0.9]) {
      const ca = Math.cos(a), sa = Math.sin(a);
      const qx = ux * ca - uz * sa, qz = ux * sa + uz * ca;
      const h = sampleBase(lx + qx * 6, lz + qz * 6, _fb).h + Math.abs(a) * 0.08;
      if (h < bh) { bh = h; bx = qx; bz = qz; }
    }
    const qx = lx + bx * 6, qz = lz + bz * 6;
    if (!fallGround(qx, qz) || _fb.cliff > 0.05 || nearChannel(qx, qz, 30) || lakeNear(qx, qz, 30)) break;
    ox.push(qx); oz.push(qz);
    ux = bx; uz = bz;
  }
  const streams = [{ px: tpx, pz: tpz, wl: twlAll, w: tw, top: true }];
  if (ox.length >= 4) {
    const [px, pz] = densify(ox, oz, 2);
    const wl = streamProfile(px, pz, poolWl - 0.05, 2.2, 0.012, 0.45);
    const n = wl.length;
    if (n >= 10) {
      const w = new Float32Array(n);
      const wOut = 0.95 + rand() * 0.3;
      for (let k = 0; k < n; k++) w[k] = wOut * (1 - smoothstep(0.55, 1, k / (n - 1)));
      streams.push({ px: px.slice(0, n), pz: pz.slice(0, n), wl, w, top: false });
    }
  }
  let x0 = poolX - R * 1.8, z0 = poolZ - R * 1.8, x1 = poolX + R * 1.8, z1 = poolZ + R * 1.8;
  for (const S of streams) {
    for (let k = 0; k < S.px.length; k++) {
      const m = rivValley(Math.max(S.w[k], 0.6)) + 2;
      x0 = Math.min(x0, S.px[k] - m); z0 = Math.min(z0, S.pz[k] - m);
      x1 = Math.max(x1, S.px[k] + m); z1 = Math.max(z1, S.pz[k] + m);
    }
  }
  return {
    x, z, dx, dz, tx, tz,
    lipX, lipZ, lipWl, width: wTop * 2,
    footX, footZ, hTop, hFoot,
    poolX, poolZ, poolR: R, poolWl, depth,
    streams, box: [x0, z0, x1, z1],
  };
}

function fallInCell(ix, iz) {
  const key = ix * 131071 + iz;
  if (fallCache.has(key)) return fallCache.get(key);
  let fall = null;
  const rand = mulberry32((Math.imul(ix, 2246822519) ^ Math.imul(iz, 1103515245) ^ Math.imul(SEED + 29, 374761393)) >>> 0);
  sampleBase((ix + 0.5) * FALL_CELL, (iz + 0.5) * FALL_CELL, _fb);
  if (_fb.rainforest > 0.3 && rand() < FALL_CHANCE) {
    for (let k = 0; k < 24 && !fall; k++) {
      const x = (ix + 0.15 + rand() * 0.7) * FALL_CELL;
      const z = (iz + 0.15 + rand() * 0.7) * FALL_CELL;
      const r2 = mulberry32((rand() * 4294967296) >>> 0);
      if (karstMaskAt(x, z) < 0.6) continue;
      fall = tryFall(x, z, 0, r2);
    }
  }
  fallCache.set(key, fall);
  return fall;
}

function applyFall(F, x, z, out) {
  const raw = out.h;
  let h = raw;
  // Altaan painanne (kallion puolella seinämä säilyy jyrkkänä).
  const pd = Math.hypot(x - F.poolX, z - F.poolZ);
  if (pd < F.poolR * 1.8) {
    const R = F.poolR;
    const back = (x - F.poolX) * F.dx + (z - F.poolZ) * F.dz < 0;
    const Rw = R * (1 + (back ? 0 : 0.12 * N.lakeShape(x / 9, z / 9)));
    const t = pd / Rw;
    const target = t < 1 ? F.poolWl - F.depth * (1 - t * t) : F.poolWl + (t - 1) * R * (back ? 10 : 0.45);
    let hp = Math.min(h, target);
    if (t >= 1 && !back && hp < F.poolWl + 0.15) hp += (F.poolWl + 0.15 - hp) * (1 - smoothstep(1.15, 1.4, t));
    h = hp + (h - hp) * smoothstep(1.35, 1.8, t);
    if (t < 1.25 && F.poolWl > out.wl) {
      out.wl = F.poolWl;
      out.wtype = WATER.LAKE;
      out.lakeR = R;
      out.flowX = 0;
      out.flowZ = 0;
    }
    out.fall = Math.max(out.fall || 0, 1 - smoothstep(R, R * 1.8, pd));
  }
  // Purot (lähdepuro ja laskupuro).
  for (const S of F.streams) {
    const dc = polyDist(S.px, S.pz, x, z);
    const k = Math.min(S.px.length - 2, Math.floor(_fu)), u = _fu - k;
    const w = S.w[k] + (S.w[k + 1] - S.w[k]) * u;
    const V = rivValley(Math.max(w, 0.6));
    if (dc >= V) continue;
    const wl = S.wl[k] + (S.wl[k + 1] - S.wl[k]) * u;
    const ds = smoothstep(0.3, 0.9, w);
    const depth = (0.3 + w * 0.12) * ds - 0.15 * (1 - ds);
    const hc = carveH(raw, dc, Math.max(w, 0.3), V, wl, depth);
    if (hc < h) h = hc;
    out.chan = Math.max(out.chan, 1 - smoothstep(w, V, dc));
    // Lähdepuron vesi loppuu reunalle (seinämän päällä ei roiku vettä).
    const edge = S.top ? (x - F.lipX) * F.dx + (z - F.lipZ) * F.dz : -1;
    if (dc < w + 1.5 && edge < -1.5 && ds > 0 && wl > out.wl - 0.01) {
      out.wl = Math.max(out.wl, wl);
      out.wtype = WATER.STREAM;
      const len = Math.hypot(_fdx, _fdz) || 1;
      const sp = S.top ? 0.6 + 1.0 * smoothstep(0.75, 1, _fu / (S.px.length - 1)) : 0.7;
      out.flowX = (_fdx / len) * sp;
      out.flowZ = (_fdz / len) * sp;
    }
    if (S.top) out.fall = Math.max(out.fall || 0, (1 - smoothstep(0, 18, Math.hypot(x - F.lipX, z - F.lipZ))));
  }
  out.h = h;
}

function applyFalls(x, z, out) {
  if (out.rainforest < 0.5) return;
  const ix = Math.floor(x / FALL_CELL), iz = Math.floor(z / FALL_CELL);
  for (let j = iz - 1; j <= iz + 1; j++) {
    for (let i = ix - 1; i <= ix + 1; i++) {
      const F = fallInCell(i, j);
      if (!F) continue;
      const b = F.box;
      if (x < b[0] || z < b[1] || x > b[2] || z > b[3]) continue;
      applyFall(F, x, z, out);
    }
  }
}

// Putoukset lähellä pistettä (piirto, äänet).
export function fallsNear(x, z, r) {
  const res = [];
  const n = Math.ceil(r / FALL_CELL);
  const ix = Math.floor(x / FALL_CELL), iz = Math.floor(z / FALL_CELL);
  for (let j = iz - n; j <= iz + n; j++) {
    for (let i = ix - n; i <= ix + n; i++) {
      const F = fallInCell(i, j);
      if (F && Math.hypot(F.x - x, F.z - z) < r) res.push(F);
    }
  }
  return res;
}

// --- Sessio 58: kalkkikivitornit (karstitornit) ---------------------------------------
// Harvinaisia 25–45 m:n kalkkikivitorneja sademetsän jyrkännealueilla (käyttäjän
// kuva). Paikka, koko ja malli tulevat siemenestä. chunkGen lisää tornin
// esineeksi ja pitää muut esineet sen ulkopuolella; world.js lisää törmäyksen.
// Mittojen pitää vastata mallia (models/karst.js käyttää samoja).
export const KARST_DIMS = [{ R: 7.5, H: 34 }, { R: 8.5, H: 40 }, { R: 6.8, H: 29 }];
const KARST_CELL = 640;
const _kb = {};

function karstInCell(ix, iz) {
  const key = ix * 131071 + iz;
  if (karstCache.has(key)) return karstCache.get(key);
  let k = null;
  const rand = mulberry32((Math.imul(ix, 3266489917) ^ Math.imul(iz, 668265263) ^ Math.imul(SEED + 37, 374761393)) >>> 0);
  if (rand() < 0.7) {
    for (let a = 0; a < 6 && !k; a++) {
      const x = (ix + 0.2 + rand() * 0.6) * KARST_CELL;
      const z = (iz + 0.2 + rand() * 0.6) * KARST_CELL;
      const variant = Math.floor(rand() * KARST_DIMS.length);
      const scale = 0.85 + rand() * 0.35;
      const rot = rand() * Math.PI * 2;
      if (karstMaskAt(x, z) < 0.45) continue;
      sampleTerrainRaw(x, z, _kb);
      // Sessio 58: torni seisoo laaksonpohjalla, ei massiivin päällä tai rinteellä.
      if (_kb.rainforest < 0.95 || _kb.h < _kb.wl + 0.5 || _kb.chan > 0.01 || _kb.cliff > 0.1 || _kb.escSharp > 0.3) continue;
      const R = KARST_DIMS[variant].R * scale;
      let lo = _kb.h, hi = _kb.h, ok = true;
      for (let i = 0; i < 12 && ok; i++) {
        const ang = (i / 12) * Math.PI * 2;
        for (const f of [0.7, 1.0, 1.6]) {
          sampleTerrainRaw(x + Math.cos(ang) * R * f, z + Math.sin(ang) * R * f, _kb);
          if (_kb.h < _kb.wl + 0.4 || _kb.chan > 0.01 || _kb.rainforest < 0.9 || _kb.cliff > 0.15 || _kb.escSharp > 0.5) { ok = false; break; }
          if (f <= 1) { lo = Math.min(lo, _kb.h); hi = Math.max(hi, _kb.h); }
        }
      }
      if (!ok || hi - lo > 3) continue;
      if (fallsNear(x, z, R + 60).length || lakeNear(x, z, R + 15)) continue;
      k = { x, z, y: lo - 0.3, R, H: KARST_DIMS[variant].H * scale, scale, rot, variant };
    }
  }
  karstCache.set(key, k);
  return k;
}

// Tornit, joiden keskipiste on enintään r + säde päässä.
export function karstNear(x, z, r) {
  const res = [];
  const n = Math.ceil((r + 12) / KARST_CELL);
  const ix = Math.floor(x / KARST_CELL), iz = Math.floor(z / KARST_CELL);
  for (let j = iz - n; j <= iz + n; j++) {
    for (let i = ix - n; i <= ix + n; i++) {
      const k = karstInCell(i, j);
      if (k && Math.hypot(k.x - x, k.z - z) < r + k.R) res.push(k);
    }
  }
  return res;
}

export function insideKarst(x, z, margin = 0) {
  const ix = Math.floor(x / KARST_CELL), iz = Math.floor(z / KARST_CELL);
  for (let j = iz - 1; j <= iz + 1; j++) {
    for (let i = ix - 1; i <= ix + 1; i++) {
      const k = karstInCell(i, j);
      if (k && Math.hypot(k.x - x, k.z - z) < k.R + margin) return true;
    }
  }
  return false;
}

// Kenttä, josta korkeus, biomipainot ja vesi lasketaan (ilman rakennelmien tasoitusta).
function sampleTerrainRaw(x, z, out) {
  sampleBase(x, z, out);
  applyRivers(x, z, out);
  applyLakes(x, z, out);
  applyFalls(x, z, out);
  return out;
}

// Rakennelmien alla maasto tasoitetaan.
export function sampleTerrain(x, z, out = {}) {
  sampleTerrainRaw(x, z, out);
  const st = structureInCell(Math.floor(x / STRUCT_CELL), Math.floor(z / STRUCT_CELL));
  if (st && st.flat !== false) {
    const d = Math.hypot(x - st.x, z - st.z);
    const r = st.radius;
    if (d < r * 1.5) {
      // Ei tasoitusta uomien kohdalla (muuten puro jäisi ilmaan tai hautautuisi).
      const w = (1 - smoothstep(r * 0.75, r * 1.5, d)) * (1 - Math.min(1, out.chan * 2));
      out.h += (st.baseH - out.h) * w;
    }
  }
  return out;
}

// --- Rakennelmat (rauniot, kivikehät, leirit) --------------------------------------
// Maailma jaetaan soluihin; joka solussa voi olla yksi rakennelma. Kaikki on
// siemenestä laskettua, joten sijainnit ja arkkujen sisällöt pysyvät samoina.

// Sessio 9: rakennelmia selvästi enemmän (n. 4 kertaa aiempi), jotta niitä
// löytää satunnaisesti vaeltaessa. Sessio 11: vielä noin kaksinkertaisesti
// (solu 180 m, 60 %), ja laivanhylkyjä näkee rannoilla satunnaisesti.
export const STRUCT_CELL = 180;
const STRUCT_CHANCE = 0.6;
const SHIPWRECK_CHANCE = 0.35; // rantaviiva solussa -> laivanhylky
export const STRUCT_RADIUS = { stoneCircle: 8, camp: 10, ruinHouse: 7, ruinVillage: 21, shipwreck: 11, runestone: 3, runeTablet: 2 };
// Painot biomeittain; null = ei rakennelmaa. Talon ja kylän rauniot ovat
// kaikissa biomeissa harvinaisia (n. 7–8 % soluista), muut ovat biomin omia.
// Riimukivet ja -taulut (sessio 9) ovat kaikkialla siellä täällä.
const STRUCT_TABLE = {
  savanna: [['stoneCircle', 5], ['ruinHouse', 2], ['ruinVillage', 0.6], ['runestone', 1.2], ['runeTablet', 1.6]],
  woodland: [['stoneCircle', 4], ['ruinHouse', 2.2], ['ruinVillage', 0.7], ['runestone', 1.1], ['runeTablet', 1.5]],
  laterite: [['stoneCircle', 6], ['ruinHouse', 2], ['ruinVillage', 0.6], ['runestone', 1.4], ['runeTablet', 1.6]],
  dunes: [['camp', 3], ['stoneCircle', 2], ['ruinHouse', 1.2], ['runestone', 0.8], ['runeTablet', 1], [null, 1]],
  mare: [['ruinHouse', 1.5], ['ruinVillage', 0.6], ['runestone', 0.8], ['runeTablet', 1.2], [null, 5]],
  desert: [['camp', 6.5], ['ruinHouse', 1.5], ['ruinVillage', 0.6], ['runestone', 1.4], ['runeTablet', 1.8]],
  oasis: [['camp', 4], ['ruinVillage', 1.2], ['runestone', 0.6], ['runeTablet', 0.8], [null, 1]],
  rainforest: [['ruinHouse', 2.2], ['ruinVillage', 0.8], ['runestone', 1.4], ['runeTablet', 1.6], [null, 4]],
  mountains: [['ruinHouse', 2.2], ['ruinVillage', 0.8], ['runestone', 1.8], ['runeTablet', 1.6], [null, 4]],
  beach: [['camp', 2], ['ruinHouse', 1.5], ['runeTablet', 0.8], [null, 3]],
  ocean: [[null, 1]],
};

const _sraw = {};
export function structureInCell(ix, iz) {
  const key = ix * 131071 + iz;
  if (structCache.has(key)) return structCache.get(key);
  let result = null;
  const rand = mulberry32((Math.imul(ix, 73856093) ^ Math.imul(iz, 19349663) ^ Math.imul(SEED + 7, 83492791)) >>> 0);
  if (rand() < STRUCT_CHANCE) {
    // Kokeile muutamaa paikkaa ja valitse tasaisin (ei vettä lähellä).
    // Rannalta muistetaan märkä paikka laivanhylkyä varten.
    let best = null, shore = null;
    for (let k = 0; k < 3; k++) {
      const x = (ix + 0.15 + rand() * 0.7) * STRUCT_CELL;
      const z = (iz + 0.15 + rand() * 0.7) * STRUCT_CELL;
      sampleTerrainRaw(x, z, _sraw);
      if (_sraw.h < _sraw.wl + 0.8 || _sraw.dEdge > 0.97 || _sraw.rock > 0.05 || _sraw.mesa > 0.05 || _sraw.chan > 0.01 || _sraw.cliff > 0.05) continue;
      if (_sraw.rainforest > 0.5 && insideKarst(x, z, 14)) continue; // sessio 58
      const h0 = _sraw.h;
      const onBeach = _sraw.beach > 0.5;
      let rough = 0;
      let wet = false;
      for (let a = 0; a < 6; a++) {
        sampleTerrainRaw(x + Math.cos(a) * 12, z + Math.sin(a) * 12, _sraw);
        rough += Math.abs(_sraw.h - h0);
        if (_sraw.h < _sraw.wl + 0.5 || _sraw.chan > 0.01) wet = true;
      }
      if (wet) {
        if (onBeach && rough < 6 && !shore) shore = { x, z, h: h0 };
        continue;
      }
      sampleTerrainRaw(x, z, _sraw);
      if (!best || rough < best.rough) best = { x, z, rough, h: _sraw.h, biome: biomeOf(_sraw), spawn: _sraw.spawn };
    }
    // Rannikolla vesiraja etsitään ruudukosta: kapea hiekkaranta (10-30 m)
    // jää helposti satunnaisnäytteiden väliin. Vierekkäisten kuivan ja märän
    // pisteen väliltä haetaan rantaviiva ja hylky asetetaan sen kuivalle puolelle.
    if (!shore) {
      sampleTerrainRaw((ix + 0.5) * STRUCT_CELL, (iz + 0.5) * STRUCT_CELL, _sraw);
      if (_sraw.coastW > 0.2) {
        const G = 7, cs = STRUCT_CELL / G, x0 = ix * STRUCT_CELL + cs / 2, z0 = iz * STRUCT_CELL + cs / 2;
        const wet = new Int8Array(G * G);
        for (let j = 0; j < G; j++) {
          for (let i = 0; i < G; i++) {
            sampleTerrainRaw(x0 + i * cs, z0 + j * cs, _sraw);
            const sea = _sraw.ocean + _sraw.beach > 0.5;
            wet[j * G + i] = !sea ? 0 : _sraw.h < _sraw.wl - 0.2 ? 2 : _sraw.h > _sraw.wl + 0.2 ? 1 : 0;
          }
        }
        const o = Math.floor(rand() * G * G);
        for (let q = 0; q < G * G && !shore; q++) {
          const k = (q + o) % (G * G), i = k % G, j = (k / G) | 0;
          if (wet[k] !== 1) continue;
          for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const ni = i + di, nj = j + dj;
            if (ni < 0 || nj < 0 || ni >= G || nj >= G || wet[nj * G + ni] !== 2) continue;
            // Puolitushaku rantaviivaan, sitten 4 m kuivalle puolelle.
            let ax = x0 + i * cs, az = z0 + j * cs, bx = x0 + ni * cs, bz = z0 + nj * cs;
            for (let it = 0; it < 5; it++) {
              const mx = (ax + bx) / 2, mz = (az + bz) / 2;
              sampleTerrainRaw(mx, mz, _sraw);
              if (_sraw.h > _sraw.wl) { ax = mx; az = mz; } else { bx = mx; bz = mz; }
            }
            const dl = Math.hypot(ax - bx, az - bz) || 1;
            const sx = ax + ((ax - bx) / dl) * 4, sz = az + ((az - bz) / dl) * 4;
            sampleTerrainRaw(sx, sz, _sraw);
            if (_sraw.h > _sraw.wl + 0.1 && _sraw.h < _sraw.wl + 3 && _sraw.rock < 0.05) shore = { x: sx, z: sz, h: _sraw.h };
            break;
          }
        }
      }
    }
    let type = null;
    // Rannalla laivanhylky vesirajaan (myös, jos solussa on kuivakin paikka).
    if (shore && rand() < SHIPWRECK_CHANCE) {
      best = { ...shore, biome: 'beach' };
      type = 'shipwreck';
    } else if (best && Math.hypot(best.x, best.z) > 60) {
      const table = STRUCT_TABLE[best.biome] || STRUCT_TABLE.savanna;
      let total = 0;
      for (const [, w] of table) total += w;
      let r = rand() * total;
      type = table[0][0];
      for (const [t, w] of table) { r -= w; if (r <= 0) { type = t; break; } }
    }
    if (type) {
      const seed = (rand() * 4294967296) >>> 0;
      const chest = type !== 'runestone' && type !== 'runeTablet' && rand() < 0.45;
      const valuables = chest && rand() < 0.1;
      const style = best.biome === 'mountains' ? 'stone' : best.biome === 'rainforest' ? 'jungle' : 'mud';
      result = {
        id: `s${ix},${iz}`, ix, iz, type, x: best.x, z: best.z, rot: rand() * Math.PI * 2,
        radius: STRUCT_RADIUS[type], baseH: best.h, seed, chest, valuables, biome: best.biome, style,
        // Laivanhylky makaa rannalla sellaisenaan (maastoa ei tasoiteta veden viereen).
        flat: type !== 'shipwreck',
      };
    }
  }
  structCache.set(key, result);
  return result;
}

// Rakennelmat, jotka ovat säteen r sisällä pisteestä (x, z).
export function structuresNear(x, z, r) {
  const out = [];
  const i0 = Math.floor((x - r) / STRUCT_CELL), i1 = Math.floor((x + r) / STRUCT_CELL);
  const j0 = Math.floor((z - r) / STRUCT_CELL), j1 = Math.floor((z + r) / STRUCT_CELL);
  for (let j = j0; j <= j1; j++) {
    for (let i = i0; i <= i1; i++) {
      const st = structureInCell(i, j);
      if (st && Math.hypot(st.x - x, st.z - z) < r + st.radius) out.push(st);
    }
  }
  return out;
}

// Onko piste rakennelman alueella (esineitä ei sijoiteta sinne).
export function insideStructure(x, z, margin = 2) {
  const st = structureInCell(Math.floor(x / STRUCT_CELL), Math.floor(z / STRUCT_CELL));
  return !!st && Math.hypot(x - st.x, z - st.z) < st.radius + margin;
}

// --- Kyselyt -----------------------------------------------------------------------

const _tmp = {};
export function heightAt(x, z) {
  return sampleTerrain(x, z, _tmp).h;
}

// Maan korkeus ja veden pinta samalla kertaa (pelaaja, pudonneet esineet).
const _wq = {};
export function waterAt(x, z, out = {}) {
  sampleTerrain(x, z, _wq);
  out.h = _wq.h;
  out.wl = _wq.wl;
  out.type = _wq.wtype;
  out.ocean = _wq.ocean + _wq.beach;
  out.lakeR = _wq.lakeR;
  out.flowX = _wq.flowX;
  out.flowZ = _wq.flowZ;
  return out;
}

export function biomeOf(sample) {
  let best = 'savanna';
  let bestW = -1;
  for (const k of BIOME_KEYS) {
    if (sample[k] > bestW) { bestW = sample[k]; best = k; }
  }
  return best;
}

// Biomi pelaajalle näytettävänä (nimi, musiikki): dyynit kuuluvat aavikkoon.
export function displayBiome(sample) {
  const b = biomeOf(sample);
  return b === 'dunes' ? 'desert' : b;
}

export function biomeAt(x, z) {
  return biomeOf(sampleTerrain(x, z, _tmp));
}

// Paikan nimi minikarttaan: vedessä vesistön nimi, muuten biomi.
export function placeName(s) {
  if ((s.fall || 0) > 0.6) return 'Vesiputous';
  if (s.wl - s.h > 0.5) {
    if (s.wtype === WATER.LAKE) return s.lakeR < 35 ? 'Lampi' : 'Järvi';
    if (s.wtype === WATER.RIVER) return 'Joki';
    if (s.wtype === WATER.STREAM) return 'Puro';
    if (s.ocean + s.beach > 0.3) return 'Meri';
    if (s.oasis > 0.3) return BIOMES.oasis.name;
    if (s.mare > 0.3) return BIOMES.mare.name;
    return 'Lampi';
  }
  return BIOMES[biomeOf(s)].name;
}

// Kuinka lähellä maailman reunaa ollaan (1 = reuna).
export function edgeFactor(x, z) {
  return zones(x, z, _tmp).dEdge;
}

// --- Värit -------------------------------------------------------------------

function srgb(hex) {
  const f = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return [f(((hex >> 16) & 255) / 255), f(((hex >> 8) & 255) / 255), f((hex & 255) / 255)];
}

const C = {
  savA: srgb(0xc9ab72), savB: srgb(0xa98c55), savGrass: srgb(0xbfa865),
  duneA: srgb(0xe6bd80), duneB: srgb(0xd4a263),
  latA: srgb(0xa5532f), latB: srgb(0x7f3f24), latGravel: srgb(0x8e6346),
  mareA: srgb(0x7b6646), mareWet: srgb(0x564633), mareGreen: srgb(0x7f7d4a),
  woodA: srgb(0xae9160), woodB: srgb(0x8f7748),
  desA: srgb(0xecc48c), desB: srgb(0xdca46a), desRock: srgb(0xa47a58),
  rainA: srgb(0x55602e), rainB: srgb(0x404a22), rainLitter: srgb(0x6c5832), rainMoss: srgb(0x5d7330),
  mntA: srgb(0x8a7a6c), mntB: srgb(0x6e5e54), mntSand: srgb(0x9c6a4c), mntScree: srgb(0x958a7e),
  strata: [srgb(0xa86a48), srgb(0x8e5a40), srgb(0xc08a62), srgb(0x7a5a4a), srgb(0xb47a52), srgb(0x94786a)],
  oasA: srgb(0x6f7a3c), oasB: srgb(0x58652e), oasWet: srgb(0x4a4430), oasSand: srgb(0xd8b27a),
  cliff: srgb(0x8a4a2c), cliffRock: srgb(0x5e5049),
  sandA: srgb(0xe9d6a8), sandB: srgb(0xd8c08e), sandWet: srgb(0xa8916a), seaFloor: srgb(0xbca67a),
  granite: srgb(0x9a948b), graniteDark: srgb(0x6f6a63), lichen: srgb(0x8c8a6a),
  limePale: srgb(0xb3ab9a), limeOrange: srgb(0xb47c4c), limeDark: srgb(0x4e4c45), limeMoss: srgb(0x52653a), // sessio 58: kalkkikivi
  mud: srgb(0x4b3f2e), mudGreen: srgb(0x4a4a2c), pebble: srgb(0x7a746c),
};

function mix3(out, a, b, t) {
  out[0] = a[0] + (b[0] - a[0]) * t;
  out[1] = a[1] + (b[1] - a[1]) * t;
  out[2] = a[2] + (b[2] - a[2]) * t;
  return out;
}

const _c1 = [0, 0, 0];
// Maan väri (lineaarinen RGB) vertex-väreihin. slope: 0 = tasainen, 1 = pysty.
export function groundColor(x, z, s, slope, out) {
  const n1 = N.color(x / 18, z / 18) * 0.5 + 0.5;
  const n2 = N.color(x / 5 + 40, z / 5 - 40) * 0.5 + 0.5;
  out[0] = out[1] = out[2] = 0;
  const add = (col, w) => { out[0] += col[0] * w; out[1] += col[1] * w; out[2] += col[2] * w; };

  if (s.savanna > 0) {
    mix3(_c1, C.savA, C.savB, n1);
    mix3(_c1, _c1, C.savGrass, smoothstep(0.55, 0.8, n2) * 0.6);
    add(_c1, s.savanna);
  }
  if (s.dunes > 0) add(mix3(_c1, C.duneA, C.duneB, n1 * 0.8), s.dunes);
  if (s.laterite > 0) {
    mix3(_c1, C.latA, C.latB, n1);
    mix3(_c1, _c1, C.latGravel, smoothstep(0.5, 0.75, n2) * 0.7);
    add(_c1, s.laterite);
  }
  if (s.mare > 0) {
    const wet = 1 - smoothstep(WATER_LEVEL, WATER_LEVEL + 1.2, s.h);
    mix3(_c1, C.mareA, C.mareGreen, smoothstep(0.35, 0.7, n1) * (1 - wet));
    mix3(_c1, _c1, C.mareWet, wet);
    add(_c1, s.mare);
  }
  if (s.woodland > 0) add(mix3(_c1, C.woodA, C.woodB, n1), s.woodland);
  if (s.desert > 0) {
    mix3(_c1, C.desA, C.desB, n1 * 0.85);
    mix3(_c1, _c1, C.desRock, smoothstep(0.78, 0.95, n2) * 0.6);
    add(_c1, s.desert);
  }
  if (s.oasis > 0) {
    const wet = 1 - smoothstep(WATER_LEVEL, WATER_LEVEL + 1.0, s.h);
    const dry = smoothstep(1.4, 2.6, s.h);
    mix3(_c1, C.oasA, C.oasB, n1);
    mix3(_c1, _c1, C.oasWet, wet);
    mix3(_c1, _c1, C.oasSand, dry * 0.8);
    add(_c1, s.oasis);
  }
  if (s.rainforest > 0) {
    mix3(_c1, C.rainA, C.rainB, n1);
    mix3(_c1, _c1, C.rainLitter, smoothstep(0.5, 0.8, n2) * 0.7);
    mix3(_c1, _c1, C.rainMoss, smoothstep(0.6, 0.9, 1 - n1) * 0.5);
    add(_c1, s.rainforest);
  }
  if (s.mountains > 0) {
    // Kerrostunut hiekkakivi: värivyöhykkeet korkeuden mukaan.
    const band = s.h / 4.5 + N.strata(x / 140, z / 140) * 1.6;
    const bi = Math.floor(band);
    const bf = band - bi;
    const ca = C.strata[((bi % 6) + 6) % 6];
    const cb = C.strata[(((bi + 1) % 6) + 6) % 6];
    mix3(_c1, ca, cb, smoothstep(0.75, 1, bf));
    mix3(_c1, _c1, C.mntB, n1 * 0.35);
    mix3(_c1, _c1, C.mntScree, smoothstep(0.7, 0.95, 1 - n2) * 0.45 * (1 - slope));
    add(_c1, s.mountains);
  }
  if (s.beach + s.ocean > 0) {
    mix3(_c1, C.sandA, C.sandB, n1 * 0.7);
    mix3(_c1, _c1, C.seaFloor, smoothstep(-1.5, -4, s.h));
    add(_c1, s.beach + s.ocean);
  }

  // Jyrkät rinteet: Sahelissa punaista lateriittia, vuoristossa kalliota.
  const cliffT = smoothstep(0.35, 0.7, slope);
  if (cliffT > 0) {
    mix3(_c1, C.cliff, C.cliffRock, Math.min(1, s.mountains + s.rainforest * 0.5 + s.beach + s.ocean));
    mix3(out, out, _c1, cliffT * 0.85);
  }
  // Sessio 57: sademetsän jyrkänteet. Sessio 58: vaaleaa kalkkikiveä, jossa
  // oransseja ja tummia valumajuovia (käyttäjän kuvat karstiseinämistä).
  // Kohina riippuu vain x:stä ja z:sta, joten jyrkällä seinällä juovat ovat pystysuoria.
  // Karstialueella kaikki jyrkät rinteet (myös rotkojen seinät) ovat kalkkikiveä
  // (ennen jyrkkä rinne oli sademetsässä tummanruskeaa).
  const limeW = Math.min(1, Math.max(s.cliff * 2, cliffT * s.rainforest * Math.min(1, (s.karstM || 0) * 2.5)));
  if (limeW > 0) {
    const sOr = smoothstep(0.1, 0.6, N.detail(x / 2.4 + 17, z / 2.4 - 9) * 0.6 + N.color(x / 9, z / 9) * 0.4);
    const sDk = smoothstep(0.35, 0.85, N.detail(x / 0.9 - 5, z / 0.9 + 3));
    mix3(_c1, C.limePale, C.limeOrange, sOr * 0.75);
    mix3(_c1, _c1, C.limeDark, sDk * 0.7);
    // Loivemmissa kohdissa (hyllyt, reunat) sammalta.
    mix3(_c1, _c1, C.limeMoss, (1 - smoothstep(0.45, 0.75, slope)) * 0.7);
    mix3(out, out, _c1, limeW);
  }
  // Graniittikalliot: harmaata kiveä ja jäkälää.
  if (s.rock > 0) {
    mix3(_c1, C.granite, C.graniteDark, n1 * 0.6 + slope * 0.4);
    mix3(_c1, _c1, C.lichen, smoothstep(0.65, 0.9, n2) * 0.5 * (1 - slope));
    mix3(out, out, _c1, s.rock);
  }
  // Pöytävuoret: kerrostunutta hiekkakiveä jyrkissä kohdissa.
  if (s.mesa > 0) {
    const band = s.h / 3.2 + N.strata(x / 90, z / 90) * 0.8;
    const bi = Math.floor(band);
    mix3(_c1, C.strata[((bi % 6) + 6) % 6], C.desRock, 0.25 + (1 - slope) * 0.4);
    mix3(out, out, _c1, s.mesa * Math.min(1, 0.35 + slope * 1.5));
  }
  // Vesirajassa märkää, veden alla pohjan väriä.
  const under = s.wl - s.h;
  if (under > -0.8) {
    const sandy = Math.min(1, s.beach + s.ocean + s.desert + s.oasis * 0.5 + s.dunes);
    const rocky = s.mountains;
    mix3(_c1, C.mud, C.mudGreen, s.rainforest * 0.6);
    mix3(_c1, _c1, C.pebble, rocky);
    mix3(_c1, _c1, C.sandWet, sandy);
    const wet = smoothstep(-0.8, 0.05, under);
    mix3(out, out, _c1, wet * 0.55);
    const k = 1 - smoothstep(0.2, 4, under) * 0.35;
    out[0] *= k; out[1] *= k; out[2] *= k;
  }
  const b = 0.94 + n2 * 0.12;
  out[0] *= b; out[1] *= b; out[2] *= b;
  return out;
}

// Sessio 23: maalajien painot maaston tekstuureille (materials.js):
// out = [hiekka, kuiva maa, metsänpohja, kallio], summa 1. slope: 0..1.
export function groundWeights(x, z, s, slope, out) {
  const dryOasis = s.oasis > 0 ? smoothstep(1.4, 2.6, s.h) : 0;
  let sand = s.dunes + s.desert + s.beach + s.ocean + s.oasis * dryOasis * 0.8;
  let soil = s.savanna + s.laterite + s.woodland + s.mare * 0.75 + s.mountains * 0.35;
  let forest = s.rainforest + s.oasis * (1 - dryOasis * 0.8) + s.mare * 0.25;
  let rock = s.mountains * 0.65;
  const sum = sand + soil + forest + rock || 1;
  sand /= sum; soil /= sum; forest /= sum; rock /= sum;
  // Peittävät kerrokset kuten väreissä: jyrkät rinteet, graniitti, pöytävuoret.
  const over = (t) => { sand *= 1 - t; soil *= 1 - t; forest *= 1 - t; rock = rock * (1 - t) + t; };
  over(smoothstep(0.35, 0.7, slope) * 0.85);
  if (s.rock > 0) over(s.rock * (0.55 + 0.45 * slope));
  if (s.cliff > 0) over(Math.min(1, s.cliff * 2));
  if (s.mesa > 0) over(s.mesa * Math.min(1, 0.35 + slope * 1.5));
  out[0] = sand; out[1] = soil; out[2] = forest; out[3] = rock;
  return out;
}

// Kartan väri (sRGB 0..255).
const _mapCache = {};
export function mapColorRGB(x, z, out) {
  const s = sampleTerrain(x, z, _mapCache);
  const depth = s.wl - s.h;
  if (depth > 0) {
    const k = Math.min(1, depth / 8);
    if (s.ocean + s.beach > 0.3) {
      out[0] = 92 - 44 * k; out[1] = 142 - 46 * k; out[2] = 156 - 24 * k;
    } else {
      out[0] = 74 - 20 * k; out[1] = 116 - 24 * k; out[2] = 124 - 14 * k;
    }
    return s;
  }
  let r = 0, g = 0, b = 0;
  for (const k of BIOME_KEYS) {
    const w = s[k];
    if (w <= 0) continue;
    const c = BIOME_MAP_RGB[k];
    r += c[0] * w; g += c[1] * w; b += c[2] * w;
  }
  // Korkeat vuoret ja kalliot vaaleammiksi
  if (s.mountains > 0) {
    const k = Math.min(1, Math.max(0, (s.h - 30) / 80));
    r += (200 - r) * k * 0.6; g += (190 - g) * k * 0.6; b += (180 - b) * k * 0.6;
  }
  if (s.rock > 0) { r += (150 - r) * s.rock; g += (146 - g) * s.rock; b += (138 - b) * s.rock; }
  if (s.cliff > 0) { const k = Math.min(1, s.cliff * 2); r += (176 - r) * k; g += (168 - g) * k; b += (150 - b) * k; }
  // Sessio 58: kalkkikivitornit kartalla vaaleana kivenä.
  if (s.rainforest > 0.5 && insideKarst(x, z, 0)) { r = 196; g = 190; b = 176; }
  if (s.mesa > 0) { r += (170 - r) * s.mesa * 0.6; g += (112 - g) * s.mesa * 0.6; b += (78 - b) * s.mesa * 0.6; }
  out[0] = r; out[1] = g; out[2] = b;
  return s;
}

// --- Paikkojen haku -------------------------------------------------------------

// Pelaajan aloituspaikka: kuivaa savannia mahdollisimman läheltä keskustaa.
export function findSpawn() {
  const s = {};
  for (let r = 0; r < 2000; r += 16) {
    const steps = Math.max(1, Math.floor((2 * Math.PI * r) / 16));
    for (let i = 0; i < steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      sampleTerrain(x, z, s);
      if (biomeOf(s) === 'savanna' && s.h > s.wl + 1 && s.plateau < 0.05 && s.rock < 0.02 && s.chan < 0.01 && !insideStructure(x, z, 6)) return { x, z };
    }
  }
  return { x: 0, z: 0 };
}

// Lähin paikka, jossa annettu biomi hallitsee (testaustyökaluja varten).
export function findBiome(key, fromX = 0, fromZ = 0) {
  const s = {};
  let best = null;
  let bestD = Infinity;
  const R = WORLD.radius;
  for (let r = 50; r < R * 1.0; r += r < 1000 ? 40 : 120) {
    const steps = Math.max(12, Math.floor((2 * Math.PI * r) / (r < 1000 ? 60 : 300)));
    for (let i = 0; i < steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      const x = fromX + Math.cos(a) * r;
      const z = fromZ + Math.sin(a) * r;
      if (Math.hypot(x, z) > R) continue;
      sampleTerrain(x, z, s);
      if (s[key] > 0.85 && s.h > s.wl + 0.5 && s.dEdge < 0.985 && s.rock < 0.05) {
        if (r < bestD) { bestD = r; best = { x, z }; }
      }
    }
    if (best) return best;
  }
  return best;
}

// Lähin vesistön ranta (testaustyökaluja varten): järvi, joki tai meri.
export function findWater(type, fromX = 0, fromZ = 0) {
  const s = {};
  const R = WORLD.radius;
  for (let r = 40; r < R; r += r < 1000 ? 24 : 80) {
    const steps = Math.max(12, Math.floor((2 * Math.PI * r) / (r < 1000 ? 30 : 120)));
    for (let i = 0; i < steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      const x = fromX + Math.cos(a) * r;
      const z = fromZ + Math.sin(a) * r;
      if (Math.hypot(x, z) > R * 0.98) continue;
      sampleTerrain(x, z, s);
      const wet = s.wl - s.h;
      const match = type === 'sea' ? s.ocean > 0.5 : s.wtype === type;
      if (match && wet > 0.8) {
        // Etsi kuiva ranta läheltä
        for (let k = 0; k < 24; k++) {
          const b = (k / 24) * Math.PI * 2;
          for (let dd = 4; dd < 120; dd += 4) {
            const px = x + Math.cos(b) * dd, pz = z + Math.sin(b) * dd;
            sampleTerrain(px, pz, s);
            if (s.h > s.wl + 0.3) return { x: px, z: pz, wx: x, wz: z };
          }
        }
      }
    }
  }
  return null;
}

// Kehittäjille: valumaverkon sisäinen rakenne (kartat ja testit).
export function riverNetDebug() {
  return riverNet();
}
