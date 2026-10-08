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
export const QUALITY_PRESETS = {
  low: { viewDistance: 3, shadows: 'off', renderScale: 0.7, godRays: false, motionBlur: 'off', dof: false, lensFlare: false, foliage: 'low' },
  medium: { viewDistance: 4, shadows: 'normal', renderScale: 0.85, godRays: true, motionBlur: 'off', dof: true, lensFlare: true, foliage: 'normal' },
  high: { viewDistance: 5, shadows: 'normal', renderScale: 1, godRays: true, motionBlur: 'off', dof: true, lensFlare: true, foliage: 'high' },
  ultra: { viewDistance: 7, shadows: 'high', renderScale: 1, godRays: true, motionBlur: 'off', dof: true, lensFlare: true, foliage: 'high' },
};
// Asetusten versio: vanhoihin tallennettuihin asetuksiin kytketään uudet
// oletukset kerran (DOF ja linssiheijastukset päälle).
const SETTINGS_VERSION = 2;

export const DEFAULT_SETTINGS = {
  quality: 'high',    // low | medium | high | ultra | custom
  sensitivity: 1,     // kerroin
  invertY: false,
  fov: 72,
  viewDistance: 5,    // chunkia
  shadows: 'normal',  // off | normal | high
  renderScale: 1,     // 0.5 .. 1
  showFps: false,
  godRays: true,      // valonsäteet ja ilmakehän hehku
  motionBlur: 'off',  // off | low | high
  dof: true,          // syväterävyys (sessio 12e: oletuksena päällä)
  lensFlare: true,    // linssiheijastukset aurinkoon katsottaessa (sessio 12e)
  foliage: 'high',    // ruohon ja aluskasvien tiheys: low | normal | high (sessio 24)
  masterVolume: 1,    // äänenvoimakkuus 0..1
  musicVolume: 0.8,   // musiikki 0..1 (pelissä musiikki soi lisäksi hiljaa taustalla)
  sfxVolume: 1,       // äänitehosteet 0..1 (tuleville äänille)
};

export function loadSettings() {
  const stored = read(SETTINGS_KEY) || {};
  const s = { ...DEFAULT_SETTINGS, ...stored };
  if ((stored.v || 1) < SETTINGS_VERSION) {
    if (s.quality !== 'low') { s.dof = true; s.lensFlare = true; }
  }
  s.v = SETTINGS_VERSION;
  return s;
}

export function saveSettings(s) {
  write(SETTINGS_KEY, s);
}
