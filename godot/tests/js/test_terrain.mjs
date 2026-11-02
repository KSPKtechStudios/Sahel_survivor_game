// Koemaasto JS:nä: TÄSMÄLLEEN sama kuin godot/scripts/test_terrain.gd.
// Käytetään vain vertailuajossa (make_golden.mjs); oikea maasto on src/world/terrain.js.
import { createNoise2D, fbm, smoothstep } from '../../../src/noise.js';
import { CONFIG } from '../../../src/config.js';

const MESA_X = 0, MESA_Z = -40, MESA_R = 12, MESA_H = 5;
const n1 = createNoise2D(CONFIG.seed);
const n2 = createNoise2D(CONFIG.seed + 1);

export function heightAt(x, z) {
  let h = fbm(n1, x / 220, z / 220, 4) * 6;
  h += fbm(n2, x / 45, z / 45, 2) * 0.5;
  const d = Math.sqrt((x - MESA_X) * (x - MESA_X) + (z - MESA_Z) * (z - MESA_Z));
  h += smoothstep(MESA_R + 0.6, MESA_R - 0.6, d) * MESA_H;
  return h;
}

export function waterAt(x, z, out = {}) {
  out.h = heightAt(x, z);
  out.wl = -Infinity;
  out.type = 0;
  out.ocean = 0;
  out.lakeR = 0;
  out.flowX = 0;
  out.flowZ = 0;
  return out;
}

export function edgeFactor() {
  return 0;
}
