// Tallennus selaimen localStorageen: useita maailmoja (oma siemen ja
// edistyminen kullakin) sekä asetukset. Toimii myös ilman localStoragea
// (esim. yksityinen ikkuna), jolloin peli vain ei muista mitään.

const INDEX_KEY = 'sahel.worlds.v2';
const WORLD_KEY = (id) => `sahel.world.v2.${id}`;
const SETTINGS_KEY = 'sahel.settings.v1';

function read(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function remove(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ei tallennusta */
  }
}

// --- Maailmat --------------------------------------------------------------------

export function listWorlds() {
  const list = read(INDEX_KEY);
  if (!Array.isArray(list)) return [];
  return list
    .filter((w) => w && w.id && Number.isFinite(w.seed))
    .sort((a, b) => (b.lastPlayed || 0) - (a.lastPlayed || 0));
}

export function createWorld(name, seed) {
  const list = listWorlds();
  const meta = {
    id: `w${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`,
    name: (name || '').trim().slice(0, 32) || `Maailma ${list.length + 1}`,
    seed: seed >>> 0,
    created: Date.now(),
    lastPlayed: Date.now(),
  };
  list.push(meta);
  write(INDEX_KEY, list);
  return meta;
}

export function deleteWorld(id) {
  write(INDEX_KEY, listWorlds().filter((w) => w.id !== id));
  remove(WORLD_KEY(id));
}

export function loadWorldData(id) {
  return read(WORLD_KEY(id));
}

export function saveWorldData(id, data) {
  const ok = write(WORLD_KEY(id), { version: 2, savedAt: Date.now(), ...data });
  const list = listWorlds();
  const meta = list.find((w) => w.id === id);
  if (meta) {
    meta.lastPlayed = Date.now();
    write(INDEX_KEY, list);
  }
  return ok;
}

// --- Asetukset ---------------------------------------------------------------------

// Grafiikan esiasetukset. Kun yksittäistä asetusta muutetaan, laaduksi tulee "oma".
// Sessio 12e: syväterävyys ja linssiheijastukset oletuksena päällä
// (matalalla pois, koska jälkikäsittely on silloin pois).
// Sessio 37: ambienttiokkluusio (ao: off | low | high), bloom, värimäärittely
// (grade) ja vinjetti. Matalalla laadulla raskaat (AO, bloom) pois, kevyt
// värimäärittely ja vinjetti päällä.
export const QUALITY_PRESETS = {
  low: { viewDistance: 3, farView: 800, shadows: 'off', renderScale: 0.7, godRays: false, motionBlur: 'off', dof: false, lensFlare: false, foliage: 'low', ao: 'off', bloom: false, grade: true, vignette: true },
  medium: { viewDistance: 4, farView: 1200, shadows: 'normal', renderScale: 0.85, godRays: true, motionBlur: 'off', dof: true, lensFlare: true, foliage: 'normal', ao: 'off', bloom: true, grade: true, vignette: true },
  high: { viewDistance: 5, farView: 1400, shadows: 'normal', renderScale: 1, godRays: true, motionBlur: 'off', dof: true, lensFlare: true, foliage: 'high', ao: 'off', bloom: true, grade: true, vignette: true },
  ultra: { viewDistance: 7, farView: 2000, shadows: 'high', renderScale: 1, godRays: true, motionBlur: 'off', dof: true, lensFlare: true, foliage: 'high', ao: 'off', bloom: true, grade: true, vignette: true },
};
// Asetusten versio: vanhoihin tallennettuihin asetuksiin kytketään uudet
// oletukset kerran (v2: DOF ja linssiheijastukset päälle; v3: AO, bloom,
// värimäärittely ja vinjetti laatutason mukaan; v4: terävöinti päälle;
// v5: terävöinti pois, käyttäjä voi kytkeä sen itse; v6: liike-epäterävyys
// ja ambienttiokkluusio pois, sessio 42 takapakki).
const SETTINGS_VERSION = 6;

export const DEFAULT_SETTINGS = {
  quality: 'high',    // low | medium | high | ultra | custom
  sensitivity: 1,     // kerroin
  invertY: false,
  fov: 72,
  viewDistance: 5,    // chunkia
  farView: 1400,      // m: kaukaisten vuorten siluetit (sessio 58; 0 = pois)
  shadows: 'normal',  // off | normal | high
  renderScale: 1,     // 0.5 .. 1
  showFps: false,
  godRays: true,      // valonsäteet ja ilmakehän hehku
  motionBlur: 'off',  // off | low | high
  dof: true,          // syväterävyys (sessio 12e: oletuksena päällä)
  lensFlare: true,    // linssiheijastukset aurinkoon katsottaessa (sessio 12e)
  foliage: 'high',    // ruohon ja aluskasvien tiheys: low | normal | high (sessio 24)
  ao: 'off',          // ambienttiokkluusio: off | low | high (sessio 37; sessio 42: oletuksena pois, kohina kasvillisuudessa)
  bloom: true,        // kirkkaiden kohtien hehku (sessio 37)
  grade: true,        // värimäärittely: kontrasti, kylläisyys, lämmin sävy (sessio 37)
  vignette: true,     // kevyt reunojen tummennus (sessio 37)
  masterVolume: 1,    // äänenvoimakkuus 0..1
  musicVolume: 0.8,   // musiikki 0..1 (pelissä musiikki soi lisäksi hiljaa taustalla)
  sfxVolume: 1,       // äänitehosteet 0..1 (tuleville äänille)
};

export function loadSettings() {
  const stored = read(SETTINGS_KEY) || {};
  const s = { ...DEFAULT_SETTINGS, ...stored };
  if ((stored.v || 1) < 2) {
    if (s.quality !== 'low') { s.dof = true; s.lensFlare = true; }
  }
  if ((stored.v || 1) < 3) {
    const p = QUALITY_PRESETS[s.quality] || QUALITY_PRESETS.medium;
    for (const k of ['ao', 'bloom', 'grade', 'vignette']) s[k] = p[k];
  }
  if ((stored.v || 1) < 6) { s.motionBlur = 'off'; s.ao = 'off'; }
  delete s.sharpen; // sessio 45: terävöinti poistettu
  s.v = SETTINGS_VERSION;
  return s;
}

export function saveSettings(s) {
  write(SETTINGS_KEY, s);
}
