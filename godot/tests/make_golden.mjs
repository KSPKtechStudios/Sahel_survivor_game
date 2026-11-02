// Vertailuarvot alkuperäisestä JS-pelistä (src/noise.js) Godot-version testeille.
// Ajo repon juuresta:  node godot/tests/make_golden.mjs
// Kirjoittaa tiedostot godot/tests/golden/noise.json ja player.json. Godot-testi
// (tests/run_tests.gd) laskee samat arvot GDScriptillä ja vertaa.
import { writeFileSync } from 'node:fs';
import { register } from 'node:module';
import { mulberry32, hashSeed, createNoise2D, fbm } from '../../src/noise.js';
import { CONFIG } from '../../src/config.js';

const out = { mulberry: [], hash: [], noise: [], fbm: [] };

for (const seed of [0, 1, 42, CONFIG.seed, 2147483647, 4294967295]) {
  const r = mulberry32(seed);
  out.mulberry.push({ seed, values: Array.from({ length: 12 }, () => r()) });
}

const tuples = [[0], [1], [-1], [CONFIG.seed, 3, -2, 1], [CONFIG.seed, -40, 17, 9001], [123456789, -987654, 31, 1700], [4294967295, 2147483647, -2147483648]];
for (const nums of tuples) out.hash.push({ nums, value: hashSeed(...nums) });

// Pisteitä myös negatiivisilla ja suurilla koordinaateilla (maailman säde 10 km).
const pts = [];
const pr = mulberry32(777);
for (let i = 0; i < 200; i++) pts.push([(pr() - 0.5) * 40, (pr() - 0.5) * 40]);
for (let i = 0; i < 60; i++) pts.push([(pr() - 0.5) * 20000 / 37, (pr() - 0.5) * 20000 / 37]);
pts.push([0, 0], [0.5, 0.5], [-0.5, 1e-9], [1, 1], [-1234.567, 891.011]);

for (const seed of [CONFIG.seed, 7, 3000000000]) {
  const n = createNoise2D(seed);
  out.noise.push({ seed, samples: pts.map(([x, y]) => [x, y, n(x, y)]) });
}
const nf = createNoise2D(CONFIG.seed);
for (const [oct, lac, gain] of [[4, 2, 0.5], [6, 2.03, 0.47], [1, 2, 0.5]]) {
  out.fbm.push({ seed: CONFIG.seed, octaves: oct, lacunarity: lac, gain, samples: pts.slice(0, 80).map(([x, y]) => [x, y, fbm(nf, x, y, oct, lac, gain)]) });
}

const path = new URL('./golden/noise.json', import.meta.url);
writeFileSync(path, JSON.stringify(out));
console.log('kirjoitettu', path.pathname, '—', out.noise[0].samples.length, 'kohinapistettä / siemen');

// ---------------------------------------------------------------------------
// Pelaajan vertailuajo: alkuperäinen src/player/player.js samalla koemaastolla
// (tests/js/test_terrain.mjs) ja samalla näppäinsarjalla, 60 ruutua/s.
// Godot-testi toistaa saman syötteen ja vertaa tilaa joka ruudulla.
register('./js/hooks.mjs', import.meta.url);
const { Player } = await import('../../src/player/player.js');
const terrain = await import('./js/test_terrain.mjs');

const DT = 1 / 60;
const FRAMES = 780;
// Syöte ruuduittain: [eteen, taakse, vasen, oikea, juoksu, hyppy, kyykky, hiiri dx, hiiri dy]
function frameInput(f) {
  const r = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  const between = (a, b) => f >= a && f < b;
  if (between(30, 360) || between(390, 570) || between(600, 720)) r[0] = 1;   // eteen
  if (between(390, 480)) r[2] = 1;                                           // vasemmalle
  if (between(180, 360) || between(600, 720)) r[4] = 1;                     // juoksu
  if (f === 240 || f === 570) r[5] = 1;                                      // hyppy (570: kyykystä ylös)
  if (f === 480) r[6] = 1;                                                   // kyykky
  if (between(360, 390)) { r[7] = 20; r[8] = 3; }                            // käännös oikealle, katse alas
  if (between(575, 600)) { r[7] = -24; r[8] = -3.6; }                        // takaisin
  return r;
}

const camera = { position: { x: 0, y: 0, z: 0, set(x, y, z) { this.x = x; this.y = y; this.z = z; } }, rotation: { set(x, y, z) { this.x = x; this.y = y; this.z = z; } } };
const world = { collidersNear: (x, z, r, out) => { out.length = 0; return out; }, platforms: [] };
const player = new Player(camera);
let steps = 0;
player.onFootstep = () => steps++;
player.teleport(0, 0);

const codes = ['KeyW', 'KeyS', 'KeyA', 'KeyD', 'ShiftLeft'];
const input = {
  keys: new Set(), pressed: new Set(), mouseDX: 0, mouseDY: 0, locked: true, enabled: true, sensitivity: 0.0022, invertY: false,
  down(code) { return this.enabled && this.keys.has(code); },
};
const inputs = [], states = [];
for (let f = 0; f < FRAMES; f++) {
  const r = frameInput(f);
  inputs.push(r);
  input.keys.clear(); input.pressed.clear();
  codes.forEach((c, i) => { if (r[i]) input.keys.add(c); });
  if (r[5]) input.pressed.add('Space');
  if (r[6]) input.pressed.add('KeyC');
  input.mouseDX = r[7]; input.mouseDY = r[8];
  player.update(DT, input, world);
  const p = player.position, c = camera.position;
  states.push([p.x, p.y, p.z, player.yaw, player.pitch, player.stamina, player.velocity.y, player.onGround ? 1 : 0, player.crouching ? 1 : 0, c.y - p.y, c.x - p.x, steps]);
}
const hpts = pts.slice(0, 50).map(([x, y]) => [x * 3, y * 3, terrain.heightAt(x * 3, y * 3)]);
const ppath = new URL('./golden/player.json', import.meta.url);
writeFileSync(ppath, JSON.stringify({ dt: DT, inputs, states, terrain: hpts }));
const last = states[FRAMES - 1];
console.log('kirjoitettu', ppath.pathname, `— ${FRAMES} ruutua, loppu x ${last[0].toFixed(2)} z ${last[2].toFixed(2)}, askeleita ${last[11]}`);
