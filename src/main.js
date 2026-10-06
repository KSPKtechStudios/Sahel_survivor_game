// Sahel: pelin käynnistys ja pääsilmukka.
import * as THREE from 'three';
import { CONFIG } from './config.js';
import { createGroundDetailTexture } from './render/textures.js';
import { createSharedMaterials } from './render/materials.js';
import { Sky } from './render/sky.js';
import { Environment, WEATHER, WEATHER_KEYS } from './render/environment.js';
import { Dust, Bursts } from './render/particles.js';
import { createModelLibrary } from './models/models.js';
import { World } from './world/world.js';
import { Tumbleweeds } from './world/tumbleweeds.js';
import { findSpawn } from './world/terrain.js';
import { Player } from './player/player.js';
import { Input } from './player/input.js';
import { ViewModel } from './player/viewmodel.js';
import { Inventory } from './game/inventory.js';
import { Guide } from './game/guide.js';
import { Structures } from './game/structures.js';
import { Interaction } from './game/interaction.js';
import { events } from './game/events.js';
import { loadGame, saveGame, clearSave } from './game/save.js';
import { renderItemIcons } from './ui/icons.js';
import { Hud } from './ui/hud.js';
import { Minimap } from './ui/minimap.js';
import { GuideUI } from './ui/guideUI.js';
import { InventoryUI } from './ui/inventoryUI.js';

const $ = (id) => document.getElementById(id);
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));

// --- Renderöijä ja kamera ----------------------------------------------------
const canvas = $('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.autoClear = false;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.1, 1200);

// --- Maailma ja järjestelmät --------------------------------------------------
const materials = createSharedMaterials(createGroundDetailTexture());
const models = createModelLibrary();
const sky = new Sky(scene);
const env = new Environment(scene, renderer, sky);
const world = new World(scene, materials, models);
const tumbleweeds = new Tumbleweeds(scene, models.tumbleweed, materials.solid);
const dust = new Dust(scene);
const bursts = new Bursts(scene);
const structures = new Structures(scene, models, world);

const inventory = new Inventory();
const guide = new Guide();
const player = new Player(camera);
const input = new Input(canvas);
const viewmodel = new ViewModel(models.items);
const interaction = new Interaction({ camera, player, world, tumbleweeds, inventory, viewmodel, structures, bursts });

const icons = renderItemIcons(models.items);
const hud = new Hud(inventory, icons);
const minimap = new Minimap();
new GuideUI(guide);
const invUI = new InventoryUI(inventory, icons);

// --- Tallennus ---------------------------------------------------------------
let resetting = false;
const save = loadGame();
if (save) {
  world.load(save.removed);
  inventory.load(save.inventory);
  guide.load(save.guide);
  env.load(save.env);
  structures.load(save.structures);
}
if (!save || !player.load(save.player)) {
  const sp = findSpawn();
  player.teleport(sp.x, sp.z);
  player.yaw = Math.PI * 0.75;
}

function persist() {
  if (resetting) return;
  saveGame({
    player: player.serialize(),
    inventory: inventory.serialize(),
    guide: guide.serialize(),
    env: env.serialize(),
    removed: world.serialize(),
    structures: structures.serialize(),
  });
}
window.addEventListener('beforeunload', persist);
document.addEventListener('visibilitychange', () => { if (document.hidden) persist(); });

// --- Tilat: start / playing / paused / inventory -------------------------------
let state = 'start';
let wantInventory = false;
const menu = $('menu');
const playBtn = $('btn-play');

function setState(s) {
  state = s;
  menu.classList.toggle('hidden', s === 'playing' || s === 'inventory');
  if (s !== 'inventory') invUI.hide();
  if (s === 'paused') {
    menu.querySelector('h1').textContent = 'SAHEL';
    playBtn.textContent = 'Jatka';
    persist();
  }
  refreshMenu();
}

playBtn.addEventListener('click', () => input.lock());
canvas.addEventListener('click', () => { if (state === 'playing' && !input.locked) input.lock(); });

document.addEventListener('pointerlockchange', () => {
  if (input.locked) {
    setState('playing');
  } else if (wantInventory) {
    wantInventory = false;
    setState('inventory');
    invUI.show();
  } else if (state === 'playing') {
    setState('paused');
  }
});
document.addEventListener('pointerlockerror', () => {
  if (state !== 'start') setState('paused');
});

function openInventory() {
  wantInventory = true;
  input.unlock();
}
function closeInventory() {
  invUI.hide();
  input.lock();
  // Jos selain ei anna lukita hiirtä heti, näytetään taukovalikko.
  setTimeout(() => { if (state === 'inventory' && !input.locked) setState('paused'); }, 600);
}

window.addEventListener('keydown', (e) => {
  if (state === 'playing' && (e.code === 'Tab' || e.code === 'KeyI')) {
    e.preventDefault();
    openInventory();
  } else if (state === 'inventory' && (e.code === 'Tab' || e.code === 'KeyI' || e.code === 'Escape')) {
    e.preventDefault();
    closeInventory();
  }
});

// Testaustyökalut valikossa
const weatherBtns = $('weather-btns');
for (const k of WEATHER_KEYS) {
  const b = document.createElement('button');
  b.textContent = WEATHER[k].name;
  b.dataset.key = k;
  b.addEventListener('click', () => { env.setWeather(k, true); refreshMenu(); });
  weatherBtns.appendChild(b);
}
const timeBtns = $('time-btns');
for (const [label, h] of [['Aamu', 7], ['Päivä', 12.5], ['Ilta', 17.8], ['Yö', 23], ['+1 h', null]]) {
  const b = document.createElement('button');
  b.textContent = label;
  b.addEventListener('click', () => { env.setTime(h === null ? env.time + 1 : h); refreshMenu(); });
  timeBtns.appendChild(b);
}
$('btn-reset').addEventListener('click', () => {
  if (!confirm('Aloitetaanko uusi peli? Nykyinen edistyminen poistetaan.')) return;
  resetting = true;
  clearSave();
  location.reload();
});

function fmtTime(h) {
  const hh = Math.floor(h);
  const mm = Math.floor((h - hh) * 60);
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}
const touchOnly = window.matchMedia('(pointer: coarse)').matches && !window.matchMedia('(pointer: fine)').matches;
function refreshMenu() {
  $('menu-status').textContent = touchOnly
    ? 'Peli vaatii toistaiseksi hiiren ja näppäimistön (tietokone).'
    : `Päivä ${env.day}, klo ${fmtTime(env.time)} · ${env.weatherName}`;
  for (const b of weatherBtns.children) b.classList.toggle('on', b.dataset.key === env.targetKey);
}

// --- Koko ----------------------------------------------------------------------
function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  viewmodel.resize(w / h);
}
window.addEventListener('resize', resize);
resize();

// --- Pääsilmukka -----------------------------------------------------------------
let last = performance.now();
let elapsed = 0;
let saveTimer = CONFIG.autosaveSec;
const fps = { frames: 0, t: 0, value: 0 };

function handleHotbar() {
  for (let i = 0; i < CONFIG.hotbarSize; i++) {
    if (input.pressed.has(`Digit${i + 1}`)) { inventory.selected = i; events.emit('inventory'); }
  }
  if (input.wheel) {
    const n = CONFIG.hotbarSize;
    inventory.selected = (inventory.selected + (input.wheel > 0 ? 1 : -1) + n) % n;
    events.emit('inventory');
  }
  if (input.pressed.has('KeyO')) {
    const i = WEATHER_KEYS.indexOf(env.targetKey);
    env.setWeather(WEATHER_KEYS[(i + 1) % WEATHER_KEYS.length], true);
    events.emit('message', { text: `Sää: ${env.weatherName}` });
  }
  if (input.pressed.has('KeyL')) {
    env.setTime(env.time + 1);
    events.emit('message', { text: `Kello ${fmtTime(env.time)}` });
  }
}

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const running = state === 'playing' || state === 'inventory';
  const simDt = running ? dt : 0;
  elapsed += simDt;
  input.enabled = state === 'playing';

  if (state === 'playing') handleHotbar();

  player.update(simDt, input, world);
  world.update(player.position.x, player.position.z, simDt);
  env.update(simDt, player.position, elapsed);
  tumbleweeds.update(simDt, player.position, env.w.wind, env.windDir);
  if (state === 'playing') interaction.update(simDt, input);
  else structures.showGhost(null);

  structures.update(simDt, elapsed, player.position);
  const fireNear = Math.max(0, 1 - structures.nearestFire / 7) * (1.2 - env.daylight);
  viewmodel.setItem(inventory.selectedItem ? inventory.selectedItem.id : null);
  viewmodel.update(simDt, player, input, env, camera, fireNear * 1.5);
  dust.update(elapsed, camera.position, env);
  bursts.update(simDt);
  sky.update(camera.position);
  guide.update(simDt);

  hud.update(dt, { prompt: interaction.prompt, player, env, visible: state === 'playing' });
  minimap.update(dt, player);

  renderer.clear();
  renderer.render(scene, camera);
  renderer.clearDepth();
  renderer.render(viewmodel.scene, viewmodel.camera);

  input.endFrame();

  if (running) {
    saveTimer -= dt;
    if (saveTimer <= 0) { saveTimer = CONFIG.autosaveSec; persist(); }
  }
  fps.frames++;
  fps.t += dt;
  if (fps.t >= 1) { fps.value = fps.frames / fps.t; fps.frames = 0; fps.t = 0; }
}

// --- Käynnistys: rakenna lähialue ennen pelin alkua -----------------------------------
async function boot() {
  const fill = $('load-fill');
  const px = player.position.x;
  const pz = player.position.z;
  world.update(px, pz, 0, 0);
  const total = world.queue.length || 1;
  while (world.queue.length) {
    world.update(px, pz, 0, 6);
    fill.style.width = `${Math.round((1 - world.queue.length / total) * 100)}%`;
    await nextFrame();
  }
  // Varmista pelaajan korkeus valmiissa maastossa.
  player.update(0, input, world);
  env.update(0, player.position, 0);
  $('loading').classList.add('hidden');
  playBtn.disabled = false;
  playBtn.textContent = save ? 'Jatka peliä' : 'Aloita';
  refreshMenu();
  last = performance.now();
  requestAnimationFrame(frame);
}
boot();

// Testausta ja vianetsintää varten (selaimen konsolissa: sahel.env.setWeather('sandstorm', true)).
window.sahel = { THREE, renderer, scene, camera, env, world, player, input, inventory, invUI, guide, structures, tumbleweeds, viewmodel, interaction, fps, events, persist, setState: (s) => setState(s) };
