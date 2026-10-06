// Tallennus selaimen localStorageen. Toimii myös ilman sitä (esim.
// yksityisessä ikkunassa), jolloin peli vain ei muista edistystä.
import { CONFIG } from '../config.js';

export function loadGame() {
  try {
    const raw = localStorage.getItem(CONFIG.saveKey);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveGame(data) {
  try {
    localStorage.setItem(CONFIG.saveKey, JSON.stringify({ version: 1, savedAt: Date.now(), ...data }));
    return true;
  } catch {
    return false;
  }
}

export function clearSave() {
  try {
    localStorage.removeItem(CONFIG.saveKey);
  } catch {
    /* ei tallennusta */
  }
}
