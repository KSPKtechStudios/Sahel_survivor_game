// Vuorokausi ja sää: aurinko/kuu, valot, sumu, taivaan värit ja tuuli.
//
// Sessio 9: vuorokausi kuluu todellisessa ajassa (10 min päivä + 10 min yö
// myös hitaalla koneella). Sää on alueellinen: jokaisella ilmastovyöhykkeellä
// (aavikko, Sahel, sademetsä, vuoristo, meri) on oma säänsä, ja pelaajan
// kohdalla näkyy vyöhykkeiden painotettu sekoitus. Sademetsässä ei siis ole
// hiekkamyrskyjä vaan sadetta ja ukkosta.
import * as THREE from 'three';
import { SunLight } from 'three/addons/lights/SunLight.js';
import { CONFIG } from '../config.js';
import { windUniforms } from './materials.js';
import { smoothstep, lerp } from '../noise.js';

// Värien avainkohdat tunnin mukaan (sRGB-heksat).
const KEYS = [
  { h: 0.0, zen: 0x04060d, hor: 0x0b1222, sun: 0x000000, sunI: 0, hemiS: 0x26345a, hemiG: 0x16130f, hemiI: 0.5, fog: 0x0a0f1a },
  { h: 4.8, zen: 0x070b18, hor: 0x161d30, sun: 0x000000, sunI: 0, hemiS: 0x2c3a5e, hemiG: 0x18140f, hemiI: 0.52, fog: 0x121827 },
  { h: 5.7, zen: 0x22345a, hor: 0x8a6a6a, sun: 0xff8a50, sunI: 0.3, hemiS: 0x7a84ac, hemiG: 0x4a382e, hemiI: 0.9, fog: 0x6a5a62 },
  { h: 6.4, zen: 0x3d6094, hor: 0xeea36a, sun: 0xffa060, sunI: 1.4, hemiS: 0x95a0bc, hemiG: 0x6a4a34, hemiI: 0.75, fog: 0xd2a27e },
  { h: 8.0, zen: 0x3a72c0, hor: 0xe6cfae, sun: 0xffdcb0, sunI: 2.6, hemiS: 0xaabbd4, hemiG: 0x8a6646, hemiI: 0.95, fog: 0xdccab0 },
  { h: 12.0, zen: 0x2f6cc8, hor: 0xd2dade, sun: 0xfff3e2, sunI: 3.3, hemiS: 0xb8cbe2, hemiG: 0x957250, hemiI: 1.05, fog: 0xd8d6cc },
  { h: 16.2, zen: 0x386fbc, hor: 0xe2cfb0, sun: 0xffe2bc, sunI: 2.7, hemiS: 0xacbcd6, hemiG: 0x8e6a4a, hemiI: 0.95, fog: 0xdcc8ae },
  { h: 17.6, zen: 0x3a5a8e, hor: 0xf2a060, sun: 0xffa055, sunI: 1.5, hemiS: 0x98a0bc, hemiG: 0x6e4a34, hemiI: 0.75, fog: 0xd49870 },
  { h: 18.3, zen: 0x24345e, hor: 0xd06a48, sun: 0xff6a3a, sunI: 0.35, hemiS: 0x8a84b0, hemiG: 0x5a4030, hemiI: 1.05, fog: 0x8a5a50 },
  { h: 19.2, zen: 0x0c1430, hor: 0x3a2a3e, sun: 0x000000, sunI: 0, hemiS: 0x4a5480, hemiG: 0x28201a, hemiI: 0.8, fog: 0x1e1c2a },
  { h: 20.5, zen: 0x05080f, hor: 0x0e1424, sun: 0x000000, sunI: 0, hemiS: 0x28365a, hemiG: 0x16130f, hemiI: 0.5, fog: 0x0b101c },
  { h: 24.0, zen: 0x04060d, hor: 0x0b1222, sun: 0x000000, sunI: 0, hemiS: 0x26345a, hemiG: 0x16130f, hemiI: 0.5, fog: 0x0a0f1a },
].map((k) => ({
  ...k,
  zen: new THREE.Color(k.zen),
  hor: new THREE.Color(k.hor),
  sun: new THREE.Color(k.sun),
  hemiS: new THREE.Color(k.hemiS),
  hemiG: new THREE.Color(k.hemiG),
  fog: new THREE.Color(k.fog),
}));

export const WEATHER = {
  clear: { name: 'Selkeä', cloud: 0.12, vis: 330, sunMul: 1.0, wind: 0.22, dust: 0.05, haze: 0.0, tint: 0xffffff, tintAmt: 0, grey: 0, rain: 0, thunder: 0 },
  cloudy: { name: 'Pilvinen', cloud: 0.82, vis: 300, sunMul: 0.32, wind: 0.42, dust: 0.06, haze: 0.12, tint: 0xa6aab0, tintAmt: 0.35, grey: 0.6, rain: 0, thunder: 0 },
  haze: { name: 'Hiekkausva', cloud: 0.25, vis: 150, sunMul: 0.55, wind: 0.4, dust: 0.35, haze: 0.6, tint: 0xe2b85e, tintAmt: 0.75, grey: 0, rain: 0, thunder: 0 },
  sandstorm: { name: 'Hiekkamyrsky', cloud: 0.65, vis: 34, sunMul: 0.18, wind: 1.0, dust: 1.0, haze: 1.0, tint: 0xb87a3e, tintAmt: 0.92, grey: 0, rain: 0, thunder: 0 },
  rain: { name: 'Sade', cloud: 0.95, vis: 150, sunMul: 0.24, wind: 0.5, dust: 0, haze: 0.22, tint: 0x8a9298, tintAmt: 0.4, grey: 0.75, rain: 0.65, thunder: 0 },
  thunder: { name: 'Ukkosmyrsky', cloud: 1.0, vis: 100, sunMul: 0.1, wind: 0.85, dust: 0, haze: 0.3, tint: 0x6a727c, tintAmt: 0.55, grey: 0.85, rain: 1.0, thunder: 1 },
  mist: { name: 'Sumu', cloud: 0.6, vis: 65, sunMul: 0.45, wind: 0.08, dust: 0, haze: 0.85, tint: 0xc8ccd0, tintAmt: 0.55, grey: 0.45, rain: 0, thunder: 0 },
};
export const WEATHER_KEYS = Object.keys(WEATHER);
// Päävalikon taustan tunnelmallinen auringonlasku (ei satunnaisessa säässä).
WEATHER.menu = { name: 'Selkeä', cloud: 0.5, vis: 330, sunMul: 1.0, wind: 0.25, dust: 0.08, haze: 0.04, tint: 0xffffff, tintAmt: 0, grey: 0, rain: 0, thunder: 0 };
const HUMID_TINT = new THREE.Color(0xa9b5a2);
const CANOPY_GREEN = new THREE.Color(0x6f9a5a);

const NUMERIC = ['cloud', 'vis', 'sunMul', 'wind', 'dust', 'haze', 'tintAmt', 'grey', 'rain', 'thunder'];

// Ilmastovyöhykkeet ja niiden säät (painot). Hiekkamyrskyt ovat aavikon,
// laterittitasangon ja (harvoin) savannin, sateet ja ukkonen sademetsän,
// sumu vuorten ja meren. Sessio 11: kuivilla alueilla (aavikko,
// laterittitasanko eli "mesabiomi") ei sada, rannalla ja merellä ei ole
// hiekkamyrskyjä, savannilla sade on harvinaista ja aavikolla pilvisyys.
export const CLIMATES = {
  desert: { name: 'Aavikko', table: { clear: 4.5, haze: 3, sandstorm: 1.6, cloudy: 0.25 } },
  dry: { name: 'Laterittitasanko', table: { clear: 4, haze: 2.5, sandstorm: 0.7, cloudy: 0.6 } },
  sahel: { name: 'Savanni', table: { clear: 4, cloudy: 2.6, haze: 1.8, sandstorm: 0.3, rain: 0.45, thunder: 0.12 } },
  wet: { name: 'Sademetsä', table: { clear: 2, cloudy: 3, rain: 3, thunder: 1.5, mist: 1.5 } },
  // Vuoristo on kuiva (pöytävuoret, kandelaaberipuut): ei sadetta eikä sumua.
  mountain: { name: 'Vuoristo', table: { clear: 4, cloudy: 1.5, haze: 1.5, sandstorm: 0.3 } },
  sea: { name: 'Meri', table: { clear: 3, cloudy: 2, rain: 1.5, thunder: 0.6, mist: 0.5 } },
};
const CLIMATE_KEYS = Object.keys(CLIMATES);

// Linnunradan asento: taivas kiertyy taivaannavan ympäri (n. 12° pohjoista leveyttä).
const LAT = 0.21;
const POLE = new THREE.Vector3(0, Math.sin(LAT), -Math.cos(LAT));
const GAL_C0 = new THREE.Vector3(0.2, 0.55, 0.81).normalize();
const GAL_N0 = new THREE.Vector3().crossVectors(GAL_C0, new THREE.Vector3(1, 0.05, 0)).normalize();

const _c = new THREE.Color();
const _c2 = new THREE.Color();
const _grey = new THREE.Color(0x9a9ca0);
const _moonCol = new THREE.Color(0x8ea6d8);
// Sessio 21: kuun vaihe arvotaan joka yölle erikseen (ei säännöllistä kiertoa).
// Yö vaihtuu keskipäivällä, jolloin kuu on horisontin alla.
function moonHash(n) {
  let h = (n * 0x9e3779b1) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export class Environment {
  constructor(scene, renderer, sky) {
    this.scene = scene;
    this.renderer = renderer;
    this.sky = sky;
    this.time = CONFIG.startHour; // tunteina 0..24
    this.day = 1;
    this.moonSeed = 0; // main.js: maailman siemen
    this.timeScale = 24 / CONFIG.dayLengthSec;

    // Aurinko: kaksi varjokaskadia (tarkat varjot lähellä, karkeammat kauempana),
    // jotka sovitetaan kameran näkymään. Varjon reunat pehmenevät etäisyyden mukaan.
    this.sun = new SunLight(0xffffff, 3);
    this.sun.castShadow = true;
    const sh = this.sun.shadow;
    sh.mapSize.set(1536, 1536);
    sh.camera.near = 0.5;
    sh.camera.far = 170;   // varjojen kantama (m)
    sh.bias = -0.0003;
    sh.normalBias = 0.05;
    sh.radius = 2;
    scene.add(this.sun);

    this.hemi = new THREE.HemisphereLight(0xffffff, 0x886644, 1);
    scene.add(this.hemi);

    scene.fog = new THREE.Fog(0xcccccc, 50, 330);

    // Sää: jokaisella ilmastovyöhykkeellä oma tila (vaihtuu pehmeästi),
    // gw = pelaajan kohdan sekoitus, w = paikallinen tehollinen sää.
    this.zones = {};
    for (const k of CLIMATE_KEYS) {
      this.zones[k] = { target: 'clear', timer: 120 + Math.random() * 300, s: { ...WEATHER.clear, tint: new THREE.Color(WEATHER.clear.tint) } };
    }
    this.climate = { desert: 0, dry: 0, sahel: 1, wet: 0, mountain: 0, sea: 0 };
    this.climateTarget = { ...this.climate };
    this.targetKey = 'clear'; // hallitsevan vyöhykkeen sää (nimi ja tallennus)
    this.weatherKey = 'clear';
    this.gw = { ...WEATHER.clear, tint: new THREE.Color(WEATHER.clear.tint) };
    this.w = { ...WEATHER.clear, tint: new THREE.Color(WEATHER.clear.tint) };
    this.humid = 0;
    this.humidTarget = 0;
    this.wet = 0;      // pintojen märkyys 0..1 (materials.js: wetUniforms)
    this.puddleWet = 0; // sadeveden lammikot 0..1 (kuivuvat hitaasti)
    this.heat = 0;     // kuumuusväreily 0..1 (post.js): aavikko, selkeä keskipäivä
    this.frozen = false; // päävalikossa aika ja sää eivät etene
    this.maxVis = 330;   // näköetäisyysasetuksen mukaan
    // Salamat
    this.flash = 0;
    this.flashT = 0;
    this.strikeTimer = 8;
    this.onStrike = null; // (suunta) main.js: salaman kuva
    this.windDir = new THREE.Vector2(-0.7071, 0.7071);
    this.windAngle = Math.atan2(0.7071, -0.7071);
    // Tuulen suunta kääntyy hitaasti (purjeet): tavoitesuunta vaihtuu muutaman
    // minuutin välein. Aallokon suunta (swellDir) pysyy vakiona.
    this.windBase = this.windAngle;
    this.windTarget = this.windAngle;
    this.windTimer = 300;

    // Lasketut arvot muille järjestelmille
    this.sunDir = new THREE.Vector3();
    this.moonDir = new THREE.Vector3();
    this.daylight = 1; // 0 = yö, 1 = päivä
    this.lightColor = new THREE.Color();
    this.lightDir = new THREE.Vector3(0, 1, 0); // suunta kohti valonlähdettä
    this.lightIntensity = 1;
    this.waveAmp = 0.13; // meren aaltojen korkeus (m), kasvaa tuulen mukana
    // Aaltojen pääsuunta on vakio (tuulen keskisuunta); ks. world/waves.js.
    this.swellDir = new THREE.Vector2(Math.cos(this.windAngle), Math.sin(this.windAngle));
  }

  setTime(hour) {
    this.time = ((hour % 24) + 24) % 24;
  }

  // Pakota sää (kehittäjätyökalut, valikko, tallennus): zone = vain yksi
  // vyöhyke, muuten kaikki.
  setWeather(key, instant = false, zone = null) {
    if (!WEATHER[key]) return;
    // Ilman vyöhykettä vain niille vyöhykkeille, joilla sää on mahdollinen
    // (esim. hiekkamyrsky ei tule merelle eikä sade aavikolle).
    const zones = zone ? [zone] : CLIMATE_KEYS.filter((k) => key === 'clear' || key === 'menu' || CLIMATES[k].table[key] !== undefined);
    for (const k of zones) {
      const z = this.zones[k];
      z.target = key;
      z.timer = this._durationFor(key);
      if (instant) Object.assign(z.s, WEATHER[key], { tint: new THREE.Color(WEATHER[key].tint) });
    }
    if (!zone) this.targetKey = key;
    if (instant && !zone) {
      this.weatherKey = key;
      Object.assign(this.gw, WEATHER[key], { tint: new THREE.Color(WEATHER[key].tint) });
    }
  }

  _durationFor(key) {
    if (key === 'sandstorm' || key === 'thunder') return 90 + Math.random() * 120;
    if (key === 'haze' || key === 'mist') return 150 + Math.random() * 200;
    return 200 + Math.random() * 280;
  }

  _pickNextWeather(zone) {
    const z = this.zones[zone];
    const table = { ...CLIMATES[zone].table };
    // Ei samaa uudelleen heti; hiekkamyrsky yleensä usvan kautta, ukkonen sateen kautta.
    if (table[z.target]) table[z.target] *= 0.3;
    if (z.target === 'haze' && table.sandstorm) table.sandstorm *= 2.5;
    if (z.target === 'rain' && table.thunder) table.thunder *= 2;
    if (z.target === 'clear') { delete table.sandstorm; delete table.thunder; }
    let total = 0;
    for (const k in table) total += table[k];
    let r = Math.random() * total;
    for (const k in table) {
      r -= table[k];
      if (r <= 0) return k;
    }
    return 'clear';
  }

  // Kuun vaiheet: phase 0 = uusikuu, 0,25 = kasvava puolikuu, 0,5 = täysikuu,
  // 0,75 = vähenevä puolikuu. Sessio 21: joka yö oma, satunnainen vaihe
  // (maailman siemenestä, joten sama yö näyttää aina samalta).
  get moonPhase() {
    const night = Math.floor(this.day - 1 + (this.time + 12) / 24);
    return moonHash((night + 1) * 7919 + (this.moonSeed | 0));
  }

  // Valaistu osuus 0..1.
  get moonIllum() {
    return (1 - Math.cos(this.moonPhase * Math.PI * 2)) / 2;
  }

  get moonName() {
    const p = this.moonPhase;
    if (p < 0.04 || p > 0.96) return 'Uusikuu';
    if (p < 0.21) return 'Kasvava kuunsirppi';
    if (p < 0.29) return 'Kasvava puolikuu';
    if (p < 0.44) return 'Kasvava kuu';
    if (p < 0.56) return 'Täysikuu';
    if (p < 0.71) return 'Vähenevä kuu';
    if (p < 0.79) return 'Vähenevä puolikuu';
    return 'Vähenevä kuunsirppi';
  }

  get weatherName() {
    return WEATHER[this.targetKey].name;
  }

  // Onko sää mahdollinen pelaajan kohdan hallitsevassa ilmastossa
  // (kehittäjätyökalujen viesti).
  weatherPossibleHere(key) {
    let best = 'sahel';
    for (const k of CLIMATE_KEYS) if (this.climate[k] > this.climate[best]) best = k;
    return key === 'clear' || CLIMATES[best].table[key] !== undefined;
  }

  // Paikallinen kosteus 0..1 (sademetsän latvusto: näkyvyys ja valo).
  setLocalHumidity(h) {
    this.humidTarget = h;
  }

  // Siirtymän jälkeen vyöhykkeet vaihtuvat heti (ei liukua).
  snapClimate() {
    this.climateSnap = true;
  }

  // Pelaajan kohdan ilmastovyöhykkeet maastonäytteestä (terrain.js).
  setClimate(s) {
    const c = this.climateTarget;
    c.desert = (s.desert || 0) + (s.dunes || 0) + (s.oasis || 0) * 0.5;
    c.dry = s.laterite || 0;
    c.wet = (s.rainforest || 0) + (s.oasis || 0) * 0.5;
    c.mountain = s.mountains || 0;
    // Ranta kuuluu kokonaan meren säähän (ei hiekkamyrskyjä rannalla).
    c.sea = (s.ocean || 0) + (s.beach || 0);
    c.sahel = Math.max(0, (s.t1 || 0) - (s.dunes || 0) - (s.laterite || 0));
    let sum = 0;
    for (const k of CLIMATE_KEYS) sum += c[k];
    if (sum < 1e-3) { c.sahel = 1; sum = 1; }
    for (const k of CLIMATE_KEYS) c[k] /= sum;
  }

  // clockDt = todellinen aika (vuorokausi ja sään vaihtuminen eivät hidastu,
  // vaikka ruudunpäivitys olisi hidas).
  update(dt, playerPos, elapsed, clockDt = dt) {
    if (!this.frozen) {
      this.time += clockDt * this.timeScale;
      if (this.time >= 24) { this.time -= 24; this.day++; }
      for (const k of CLIMATE_KEYS) {
        const z = this.zones[k];
        z.timer -= clockDt;
        if (z.timer <= 0) this.setWeather(this._pickNextWeather(k), false, k);
      }
    }

    // --- Vyöhykkeiden sään pehmeä siirtymä ja sekoitus pelaajan kohdalla
    const k = 1 - Math.exp(-clockDt / 9); // n. 25-30 s täyteen siirtymään
    const ck = this.climateSnap ? 1 : 1 - Math.exp(-clockDt / 2.5);
    this.climateSnap = false;
    const g = this.gw;
    for (const n of NUMERIC) g[n] = 0;
    g.tint.setRGB(0, 0, 0);
    let best = 'sahel';
    for (const key of CLIMATE_KEYS) {
      this.climate[key] += (this.climateTarget[key] - this.climate[key]) * ck;
      const z = this.zones[key];
      const target = WEATHER[z.target];
      for (const n of NUMERIC) z.s[n] = lerp(z.s[n], target[n], k);
      z.s.tint.lerp(_c.set(target.tint), k);
      const wgt = this.climate[key];
      for (const n of NUMERIC) g[n] += z.s[n] * wgt;
      g.tint.r += z.s.tint.r * wgt; g.tint.g += z.s.tint.g * wgt; g.tint.b += z.s.tint.b * wgt;
      if (wgt > this.climate[best]) best = key;
    }
    let wsum = 0;
    for (const key of CLIMATE_KEYS) wsum += this.climate[key];
    if (wsum > 1e-4 && Math.abs(wsum - 1) > 1e-4) {
      for (const n of NUMERIC) g[n] /= wsum;
      g.tint.multiplyScalar(1 / wsum);
    }
    this.targetKey = this.zones[best].target;
    this.weatherKey = this.targetKey;

    // --- Salamat ukkosella: välähdyksiä ja kaukaisia iskuja
    // Kuivalla (aavikko, laterittitasanko, vuoristo) ei salamoi.
    const thunderHere = g.thunder * (1 - Math.min(1, this.climate.desert + this.climate.dry + this.climate.mountain));
    if (thunderHere > 0.4 && !this.frozen) {
      this.strikeTimer -= clockDt * thunderHere;
      if (this.strikeTimer <= 0) {
        this.strikeTimer = 5 + Math.random() * 14;
        this.flashT = 0.55;
        const a = Math.random() * Math.PI * 2;
        // Silloin tällöin salama iskee lähelle (sessio 12): suuri välähdys,
        // salama näkyy selvästi ja jyrähdys kuuluu heti.
        const near = Math.random() < 0.28;
        this.flashK = near ? 2.4 : 1;
        if (this.onStrike) this.onStrike(a, near ? 45 + Math.random() * 110 : 250 + Math.random() * 350, near);
      }
    }
    if (this.flashT > 0) {
      this.flashT = Math.max(0, this.flashT - clockDt);
      // Muutama nopea välähdys
      const t = 0.55 - this.flashT;
      this.flash = (Math.max(0, Math.sin(t * 34) * Math.exp(-t * 5)) + (t < 0.06 ? 1 : 0)) * (this.flashK || 1);
    } else {
      this.flash = 0;
    }

    // --- Paikallinen tehollinen sää
    this.humid += (this.humidTarget - this.humid) * Math.min(1, dt * 0.5);
    const H = this.humid;
    const we = this.w;
    for (const n of NUMERIC) we[n] = g[n];
    we.tint.copy(g.tint);
    // Vyöhykkeiden rajoilla sekoitus voisi tuoda naapurin sadetta aavikolle
    // tai hiekkaa rannalle: rajataan paikallisten osuuksien mukaan.
    const zw = this.climate;
    const dryW = Math.min(1, zw.desert + zw.dry + zw.mountain);
    if (dryW > 0.001) { we.rain *= 1 - dryW; we.thunder *= 1 - dryW; }
    const dampW = Math.min(1, zw.sea + zw.wet);
    if (dampW > 0.001) we.dust *= 1 - dampW;
    if (H > 0.001) {
      we.dust = g.dust * (1 - H);
      we.haze = lerp(g.haze, Math.min(g.haze, 0.3), H);
      we.vis = lerp(g.vis, Math.max(g.vis, 170), H);
      we.wind = g.wind * (1 - 0.6 * H);
      we.tintAmt = lerp(g.tintAmt, Math.min(g.tintAmt, 0.3), H);
      we.tint.lerp(HUMID_TINT, H);
      // Sademetsän yllä on aina pilviä, ja siellä tihuttaa (main.js: sade).
      we.cloud = Math.max(g.cloud, 0.62 * H);
    }
    // Märkyys: sademetsässä ja sateessa pinnat kastuvat nopeasti ja kuivuvat hitaasti.
    const wetT = Math.max(H * 0.85, we.rain * 0.9);
    this.wet += (wetT - this.wet) * (1 - Math.exp(-clockDt / (wetT > this.wet ? 6 : 45)));
    // Lammikot (savanni ym.): täyttyvät sateessa n. minuutissa ja kuivuvat
    // sateen jälkeen n. 4 minuutissa (sademetsän lammikot ovat pysyviä).
    if (we.rain > 0.08) this.puddleWet = Math.min(1, this.puddleWet + clockDt * we.rain / 40);
    else this.puddleWet = Math.max(0, this.puddleWet - clockDt / 240);

    // Meren aallot kasvavat tuulen mukana. Sessio 11: noin kolmasosaan
    // (selkeällä n. 0,13, sateella 0,29, ukkosella 0,57; harjasta pohjaan
    // n. 2,5 × tämä), myrskyssä edelleen rajua mutta ei metrien seiniä.
    this.waveAmp = 0.07 + Math.pow(g.wind, 1.6) * 0.65;

    // Tuulen suunta kääntyy hitaasti uuteen suuntaan (enintään n. 0,7° / s)
    // ja huojuu vähän sen ympärillä.
    if (!this.frozen) {
      this.windTimer -= clockDt;
      if (this.windTimer <= 0) {
        this.windTimer = 240 + Math.random() * 360;
        this.windTarget = this.windBase + (Math.random() * 2 - 1) * 1.8;
      }
      const dA = this.windTarget - this.windBase;
      this.windBase += Math.sign(dA) * Math.min(Math.abs(dA), clockDt * 0.012);
    }
    const ang = this.windBase + Math.sin(elapsed * 0.03) * 0.25;
    this.windDir.set(Math.cos(ang), Math.sin(ang));
    windUniforms.uTime.value = elapsed;
    windUniforms.uWindDir.value.copy(this.windDir);
    // Pieni huojunta myös tyynellä säällä (ja sademetsän suojassa).
    windUniforms.uWindStrength.value = Math.max(0.16, this.w.wind) * (0.85 + Math.sin(elapsed * 0.4) * 0.15);

    // --- Aurinko ja kuu
    const a = ((this.time - 6) / 12) * Math.PI;
    this.sunDir.set(Math.cos(a), Math.sin(a), 0.28).normalize();
    this.moonDir.set(-Math.cos(a), -Math.sin(a), -0.15).normalize();

    // --- Avainkohtien interpolointi
    let i = 0;
    while (i < KEYS.length - 2 && KEYS[i + 1].h <= this.time) i++;
    const A = KEYS[i];
    const B = KEYS[i + 1];
    const f = (this.time - A.h) / (B.h - A.h);
    const lerpC = (key, out) => out.copy(A[key]).lerp(B[key], f);
    const sunI = lerp(A.sunI, B.sunI, f);
    this.daylight = smoothstep(-0.12, 0.25, this.sunDir.y);

    // Kuumuusväreily: aavikolla kirkkaana päivänä keskipäivän tienoilla
    // (n. klo 9-15). Pilvet, sade, hiekkapöly ja latvuston kosteus vievät sen.
    const ww = this.w;
    const clearSky = smoothstep(0.5, 0.15, ww.cloud) * (1 - ww.rain) * (1 - smoothstep(0.15, 0.4, ww.dust));
    const heatT = this.climate.desert * clearSky * smoothstep(0.35, 0.75, this.sunDir.y) * (1 - this.humid);
    this.heat += (heatT - this.heat) * (1 - Math.exp(-clockDt / 4));

    const w = this.w;
    const greyAmt = w.grey;
    const tintAmt = w.tintAmt;
    // Sävy skaalautuu päivänvalon mukaan, ettei yö muutu keltaiseksi.
    const dayLum = 0.12 + 0.88 * this.daylight;
    // Sessio 25: yöllä sääsävy ei saa kirkastaa (ennen harmaa sekoittui
    // yön tummiin väreihin ja vaalensi niitä): sävy säilyttää värin
    // kirkkauden, ja pilvet, sade ja sumu pimentävät yötä.
    const nightK = 1 - this.daylight;
    const nightDark = 1 - nightK * Math.min(0.6, w.cloud * 0.35 + w.rain * 0.2 + w.haze * 0.15 + w.thunder * 0.1);
    this.nightDark = nightDark;
    const tinted = (col) => {
      const L = Math.max(0.0001, col.r * 0.299 + col.g * 0.587 + col.b * 0.114);
      if (greyAmt > 0.001) {
        _c2.copy(_grey).multiplyScalar(dayLum);
        if (nightK > 0) _c2.multiplyScalar(lerp(1, L / 0.6, nightK));
        col.lerp(_c2, greyAmt);
      }
      if (tintAmt > 0.001) {
        _c2.copy(w.tint).multiplyScalar(dayLum);
        if (nightK > 0) _c2.multiplyScalar(lerp(1, L / Math.max(0.05, w.tint.r * 0.299 + w.tint.g * 0.587 + w.tint.b * 0.114), nightK));
        col.lerp(_c2, tintAmt);
      }
      return col.multiplyScalar(nightDark);
    };

    const u = this.sky.uniforms;
    tinted(lerpC('zen', u.uZenith.value));
    // Pilvisellä ja pölyisellä säällä zeniitti vaalenee kohti horisonttia.
    tinted(lerpC('hor', u.uHorizon.value));
    u.uZenith.value.lerp(u.uHorizon.value, Math.min(1, w.haze * 0.8 + greyAmt * 0.3));
    u.uGround.value.copy(u.uHorizon.value).multiplyScalar(0.6);
    lerpC('sun', u.uSunColor.value);
    u.uSunDir.value.copy(this.sunDir);
    u.uMoonDir.value.copy(this.moonDir);
    u.uSunVisible.value = smoothstep(-0.05, 0.02, this.sunDir.y) * (1 - w.haze * 0.75) * (0.3 + w.sunMul * 0.7);
    u.uMoonVisible.value = smoothstep(-0.02, 0.1, this.moonDir.y) * (1 - w.haze * 0.9);
    u.uMoonPhase.value = this.moonPhase;
    u.uStars.value = (1 - smoothstep(-0.2, 0.02, this.sunDir.y)) * (1 - w.haze) * (1 - w.cloud * 0.7);
    if (!this.frozen) this.sky.updateMeteors(clockDt, u.uStars.value * (1 - w.cloud));
    // Linnunrata kiertyy taivaan mukana yön aikana.
    const rot = (this.time / 24) * Math.PI * 2;
    u.uGalaxyN.value.copy(GAL_N0).applyAxisAngle(POLE, rot);
    u.uGalaxyC.value.copy(GAL_C0).applyAxisAngle(POLE, rot);
    u.uFlash.value = this.flash;
    u.uCloudCover.value = w.cloud;
    u.uHaze.value = w.haze;
    u.uTime.value = elapsed;
    // Pilvien siirtymä kertyy ajan mukana (ei hyppää tuulen kääntyessä).
    const co = u.uCloudOffset.value;
    co.x = (co.x + this.windDir.x * (0.004 + w.wind * 0.02) * dt) % 500;
    co.y = (co.y + this.windDir.y * (0.004 + w.wind * 0.02) * dt) % 500;
    // Pilvien värit
    const cl = u.uCloudLit.value;
    lerpC('hor', cl).lerp(_c2.setRGB(1, 1, 1).multiplyScalar(dayLum), 0.55);
    cl.lerp(_c2.copy(u.uSunColor.value).multiplyScalar(0.9), 0.25 * (1 - this.daylight * 0.6));
    u.uCloudShade.value.copy(cl).multiplyScalar(0.55 + 0.1 * (1 - greyAmt));

    // Sumu
    const fogC = tinted(lerpC('fog', this.scene.fog.color));
    u.uFogColor.value.copy(fogC);
    // Selkeällä/pilvisellä säällä näkyvyys = näköetäisyys, usvassa ja myrskyssä sään oma.
    let vis = Math.min(w.vis >= 290 ? this.maxVis : w.vis, this.maxVis);
    // Sademetsässä näkyvyys on lyhyt (tiheä kasvillisuus ja kosteus).
    // Sessio 26: selkeällä säällä sademetsässä vähemmän usvaa (ennen 95 m).
    if (this.humid > 0.001) vis = lerp(vis, Math.min(vis, 200), this.humid * 0.8);
    this.scene.fog.far = vis;
    this.scene.fog.near = vis < 100 ? 0 : vis * 0.12;

    // Valot: päivällä aurinko, yöllä kuu.
    const sunUp = this.sunDir.y > 0;
    const dir = sunUp ? this.sunDir : this.moonDir;
    let intensity;
    if (sunUp) {
      intensity = sunI * smoothstep(0.0, 0.12, this.sunDir.y) * w.sunMul;
      this.sun.color.copy(u.uSunColor.value);
      if (tintAmt > 0.001) this.sun.color.lerp(w.tint, tintAmt * 0.5);
    } else {
      intensity = 0.55 * smoothstep(0.0, 0.15, this.moonDir.y) * (1 - w.cloud * 0.6) * (1 - w.haze * 0.6) * (0.2 + 0.8 * this.moonIllum);
      this.sun.color.copy(_moonCol);
    }
    // Latvusto varjostaa sademetsässä.
    intensity *= 1 - 0.45 * this.humid;
    this.sun.intensity = intensity;
    this.lightColor.copy(this.sun.color);
    this.lightIntensity = intensity;
    this.lightDir.copy(dir);

    // Hemisfäärivalo (taivaan ja maan heijastama valo)
    tinted(lerpC('hemiS', this.hemi.color));
    tinted(lerpC('hemiG', this.hemi.groundColor));
    const hemiI = lerp(A.hemiI, B.hemiI, f);
    // Pilvisellä säällä hajavaloa on suhteessa enemmän.
    // Pilvisyyden lisähajavalo vain päivällä (sessio 25: yö ei kirkastu).
    this.hemi.intensity = hemiI * (1 + (greyAmt * 0.25 + w.haze * 0.15) * this.daylight) * (1 - 0.2 * this.humid) * nightDark + this.flash * 1.6;
    if (this.humid > 0.001) this.hemi.color.lerp(_c2.copy(CANOPY_GREEN).multiplyScalar(dayLum), 0.35 * this.humid);

    // Valon suunta (SunLight valaisee sijainnistaan origoa kohti).
    this.sun.position.copy(dir);
    this.sun.updateMatrixWorld();
    // Varjot pysyvät päällä (päälle/pois vaihto kääntäisi kaikki shaderit uudelleen).
    this.sun.shadow.intensity = smoothstep(0.03, 0.3, intensity);

    // Valotus: yöllä hieman enemmän, jotta peli on pelattava.
    // Ukkosmyrsky päivällä hämärtää maailman (sessio 12c).
    // Sessio 25: silmän mukautuminen (post.js) hoitaa yön valotuksen; tässä
    // perusvalotus. Ilman jälkikäsittelyä yö pidetään entisellään.
    const ae = this.autoExposure ? 1 : 1.35;
    this.renderer.toneMappingExposure = lerp(ae, 0.95, this.daylight) * (1 - 0.42 * this.w.thunder * this.daylight);
  }

  serialize() {
    const zones = {};
    for (const k of CLIMATE_KEYS) zones[k] = this.zones[k].target;
    return { time: this.time, day: this.day, weather: this.targetKey, zones, wind: Math.round(this.windBase * 1000) / 1000 };
  }

  load(data) {
    if (!data) return;
    if (typeof data.time === 'number') this.time = data.time;
    if (typeof data.day === 'number') this.day = data.day;
    if (Number.isFinite(data.wind)) this.windBase = this.windTarget = data.wind;
    if (data.zones) {
      for (const k of CLIMATE_KEYS) if (WEATHER[data.zones[k]]) this.setWeather(data.zones[k], true, k);
    } else if (data.weather && WEATHER[data.weather]) {
      // Vanha tallennus: sama sää kaikkialla, sademetsässä hiekkasää vaihtuu sateeksi.
      this.setWeather(data.weather, true);
      if (data.weather === 'sandstorm' || data.weather === 'haze') this.setWeather('rain', true, 'wet');
    }
  }
}
