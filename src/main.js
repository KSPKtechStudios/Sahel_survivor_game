// Sahel: käynnistys, tilat (päävalikko / lataus / peli / tauko / reppu) ja pääsilmukka.
import * as THREE from 'three';
import { CONFIG } from './config.js';
import { createGroundDetailTexture } from './render/textures.js';
import { createSharedMaterials } from './render/materials.js';
import { Sky } from './render/sky.js';
import { Environment, WEATHER_KEYS } from './render/environment.js';
import { Dust, Bursts } from './render/particles.js';
import { Debris } from './render/debris.js';
import { createWaterMaterial, updateWaterMaterial } from './render/water.js';
import { Ripples } from './render/ripples.js';
import { Splashes } from './render/splash.js';
import { FireFx } from './render/fire.js';
import { PostFX } from './render/post.js';
import { Music, BIOME_MUSIC } from './audio/music.js';
import { createModelLibrary } from './models/models.js';
import { World } from './world/world.js';
import { Tumbleweeds } from './world/tumbleweeds.js';
import { findSpawn, setWorldSeed, seedFromString, sampleTerrain, heightAt, displayBiome } from './world/terrain.js';
import { Player } from './player/player.js';
import { Input } from './player/input.js';
import { ViewModel } from './player/viewmodel.js';
import { Inventory } from './game/inventory.js';
import { Guide } from './game/guide.js';
import { Structures } from './game/structures.js';
import { Drops } from './game/drops.js';
import { FallenTrees } from './game/fallen.js';
import { Breakables } from './game/breakables.js';
import { Ruins } from './game/ruins.js';
import { Interaction } from './game/interaction.js';
import { Mobs } from './game/mobs.js';
import { Combat } from './game/combat.js';
import { events } from './game/events.js';
import { loadWorldData, saveWorldData, loadSettings } from './game/save.js';
import { renderItemIcons } from './ui/icons.js';
import { Hud, RESPAWN_WAIT } from './ui/hud.js';
import { Minimap } from './ui/minimap.js';
import { ExploredMap } from './ui/explored.js';
import { BigMap } from './ui/bigMap.js';
import { GuideUI } from './ui/guideUI.js';
import { InventoryUI } from './ui/inventoryUI.js';
import { Menu } from './ui/menu.js';
import { DevTools } from './ui/devtools.js';

const $ = (id) => document.getElementById(id);
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));
const MENU_SEED = seedFromString('sahel-valikko');
// Maisemallinen paikka valikon taustalle (dyynit, akasiat ja lateriitti näkyvissä).
const MENU_SPOT = { x: -2650, z: -495, yaw: 2.3, time: 17.1 };

// --- Renderöijä ja kamera ----------------------------------------------------
const canvas = $('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.autoClear = false;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.1, 1500);

// --- Järjestelmät -------------------------------------------------------------
const materials = createSharedMaterials(createGroundDetailTexture());
const activeMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 });
const models = createModelLibrary();
const sky = new Sky(scene);
materials.water = createWaterMaterial(sky);
const env = new Environment(scene, renderer, sky);
const world = new World(scene, materials, models);
const tumbleweeds = new Tumbleweeds(scene, models.tumbleweed, materials.solid);
const dust = new Dust(scene);
const bursts = new Bursts(scene);
const debris = new Debris(scene);
const drops = new Drops(scene, models.items);
const fallen = new FallenTrees({ scene, world, models, material: activeMaterial, debris, drops, bursts });
const breakables = new Breakables({ world, models, debris, drops, fallen, material: activeMaterial });
const structures = new Structures(scene, models, world);
const ruins = new Ruins({ scene, world, drops, bursts });
const ripples = new Ripples(renderer);
const post = new PostFX(renderer);
const splashes = new Splashes(scene);
const fire = new FireFx(scene);
const music = new Music();
// Selain sallii äänen vasta käyttäjän ensimmäisen klikkauksen tai näppäimen jälkeen.
for (const ev of ['pointerdown', 'keydown']) window.addEventListener(ev, () => music.unlock(), { capture: true });

const inventory = new Inventory();
const guide = new Guide();
const player = new Player(camera);
const input = new Input(canvas);
const viewmodel = new ViewModel(models.items);
const mobs = new Mobs({ scene, world, drops, debris, bursts, player, env, structures, fire });
const interaction = new Interaction({ camera, player, world, tumbleweeds, inventory, viewmodel, structures, debris, drops, fallen, breakables, ruins, mobs });
const combat = new Combat({ camera, player, inventory, viewmodel, interaction, mobs, debris, bursts });
mobs.combat = combat;

const icons = renderItemIcons(models.items);
const hud = new Hud(inventory, icons);
const explored = new ExploredMap(world.gen);
const minimap = new Minimap(explored);
const bigMap = new BigMap(explored, player);
new GuideUI(guide);
const invUI = new InventoryUI(inventory, icons);

// --- Vesi: roiskeet ja väreily ----------------------------------------------------
// Pelaaja, pudotetut esineet ja heitot kutsuvat tätä osuessaan veteen.
function waterFx(kind, x, y, z, power) {
  if (kind === 'splash') {
    splashes.spawn(x, y, z, power);
    ripples.disturb(x, z, 0.5 + power * 0.45, 0.35 + power * 0.3);
  } else if (kind === 'wake') {
    ripples.disturb(x, z, 0.45, 0.05 + power * 0.09);
  } else if (kind === 'step') {
    splashes.spawn(x, y, z, 0.15 * power, { spread: 0.5 });
    ripples.disturb(x, z, 0.35, 0.08);
  } else if (kind === 'drop') {
    splashes.spawn(x, y, z, power * 0.45, { spread: 0.45 });
    ripples.disturb(x, z, 0.22 + power * 0.25, 0.12 + power * 0.28);
  }
}
player.onWater = waterFx;
drops.onWater = waterFx;

const settings = loadSettings();
const menu = new Menu({
  settings,
  onPlay: (meta) => startWorld(meta),
  onResume: () => input.lock(),
  onQuit: () => quitToMenu(),
  onSettings: (s) => applySettings(s),
});

// --- Asetukset ------------------------------------------------------------------
let shadowMode = null;
function applySettings(s) {
  input.sensitivity = 0.0022 * s.sensitivity;
  input.invertY = !!s.invertY;
  camera.fov = s.fov;
  camera.updateProjectionMatrix();
  if (world.viewRadius !== s.viewDistance) world.setViewRadius(s.viewDistance);
  env.maxVis = s.viewDistance * 64 + 10;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5) * s.renderScale);
  renderer.setSize(window.innerWidth, window.innerHeight);
  if (s.shadows !== shadowMode) {
    const prevEnabled = renderer.shadowMap.enabled;
    shadowMode = s.shadows;
    renderer.shadowMap.enabled = s.shadows !== 'off';
    // Korkea: tarkempi varjokartta ja varjot kauemmas.
    const size = s.shadows === 'high' ? 2048 : 1536;
    env.sun.shadow.camera.far = s.shadows === 'high' ? 260 : 170;
    env.sun.shadow.radius = s.shadows === 'high' ? 2.5 : 2;
    if (env.sun.shadow.mapSize.x !== size) {
      env.sun.shadow.mapSize.set(size, size);
      if (env.sun.shadow.map) { env.sun.shadow.map.dispose(); env.sun.shadow.map = null; }
    }
    if (prevEnabled !== renderer.shadowMap.enabled) {
      scene.traverse((o) => { if (o.material) o.material.needsUpdate = true; });
    }
  }
  $('fps').classList.toggle('hidden', !s.showFps);
  post.godRays = s.godRays !== false;
  post.motionBlur = s.motionBlur === 'high' ? 2 : s.motionBlur === 'low' ? 1 : 0;
  post.dof = !!s.dof;
  music.setVolumes(s.masterVolume ?? 1, s.musicVolume ?? 0.8);
}
applySettings(settings);

// --- Tila ---------------------------------------------------------------------------
let state = 'boot'; // boot | menu | loading | ready | playing | paused | inventory | map | dev
let currentWorld = null;
let wantInventory = false;
let wantMap = false;
let wantDev = false;
const menuCam = { x: 0, z: 0, t: 0 };

function setState(s) {
  state = s;
  const inGame = s === 'playing' || s === 'paused' || s === 'inventory' || s === 'map' || s === 'dev';
  $('hud').classList.toggle('hidden', !inGame);
  if (s !== 'inventory') invUI.hide();
  if (s !== 'map') bigMap.hide();
  if (s !== 'dev') devtools.hide();
  if (s === 'playing') {
    menu.hidePause();
    menu.hideLoading();
    // Valikon nappi ei saa jäädä kohdistetuksi (välilyönti painaisi sitä).
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  }
  if (s === 'paused') menu.showPause(statusText());
}

function statusText() {
  return currentWorld ? `${currentWorld.name} · päivä ${env.day}, klo ${fmtTime(env.time)} · ${env.weatherName}` : '';
}

function fmtTime(h) {
  const hh = Math.floor(h);
  const mm = Math.floor((h - hh) * 60);
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

function clearWorldState(seed) {
  setWorldSeed(seed);
  world.reset(seed);
  structures.clear();
  ruins.clear();
  drops.clear();
  fallen.clear();
  debris.clear();
  tumbleweeds.clear();
  explored.clear();
  splashes.clear();
  fire.clear();
  mobs.clear();
  combat.reset();
}

function buildAround(x, z, onProgress) {
  return world.ensureLoaded(x, z, onProgress, nextFrame);
}

// Päävalikko: tausta on oikea pelimaailma auringonlaskussa.
async function enterMenu(first = false) {
  state = 'loading';
  $('hud').classList.add('hidden');
  clearWorldState(MENU_SEED);
  mobs.enabled = false;
  env.frozen = true;
  env.setTime(MENU_SPOT.time);
  env.setWeather('menu', true);
  env.setLocalHumidity(0);
  const sp = MENU_SPOT;
  menuCam.x = sp.x;
  menuCam.z = sp.z;
  menuCam.t = 0;
  player.teleport(sp.x, sp.z);
  if (first) menu.showLoading('Ladataan…');
  await buildAround(sp.x, sp.z, (p) => menu.setLoading(p));
  state = 'menu';
  if (first && !music.unlocked) {
    // Ensimmäisellä kerralla klikkaus: selain päästää musiikin soimaan vasta sen jälkeen.
    menu.loadingReady('Tervetuloa Saheliin', () => {
      music.unlock();
      menu.hideLoading();
      menu.showMain();
    }, 'Klikkaa jatkaaksesi');
  } else {
    menu.hideLoading();
    menu.showMain();
  }
}

async function startWorld(meta) {
  if (state === 'loading') return;
  state = 'loading';
  menu.hideMain();
  const data = loadWorldData(meta.id);
  menu.showLoading(data ? `Ladataan maailmaa ”${meta.name}”…` : `Luodaan maailmaa ”${meta.name}”…`);
  await nextFrame();
  currentWorld = meta;
  clearWorldState(meta.seed);
  mobs.enabled = true;
  env.frozen = false;
  player.dead = false;
  player.health = CONFIG.healthMax;
  player.crouching = false;
  inventory.load(data ? data.inventory : { slots: [] });
  guide.load(data ? data.guide : { step: 0, stats: {} });
  world.load(data ? data.world : null);
  if (data && data.env) env.load(data.env);
  else { env.setTime(CONFIG.startHour); env.setWeather('clear', true); env.day = 1; }
  if (!data || !player.load(data.player)) {
    const sp = findSpawn();
    player.teleport(sp.x, sp.z);
    player.yaw = Math.PI * 0.75;
    player.pitch = 0;
  }
  player.stamina = CONFIG.staminaMax;
  await buildAround(player.position.x, player.position.z, (p) => menu.setLoading(p));
  structures.load(data ? data.structures : []);
  drops.load(data ? data.drops : []);
  fallen.load(data ? data.fallen : []);
  ruins.load(data ? data.ruins : []);
  explored.load(data ? data.map : null);
  mobs.prepare();
  player.update(0, input, world);
  state = 'ready';
  menu.loadingReady('Maailma on valmis', () => input.lock());
}

function persist() {
  if (!currentWorld || state === 'loading' || state === 'menu') return;
  saveWorldData(currentWorld.id, {
    seed: currentWorld.seed,
    player: player.serialize(),
    inventory: inventory.serialize(),
    guide: guide.serialize(),
    env: env.serialize(),
    world: world.serialize(),
    structures: structures.serialize(),
    drops: drops.serialize(),
    fallen: fallen.serialize(),
    ruins: ruins.serialize(),
    map: explored.serialize(),
  });
}

async function quitToMenu() {
  persist();
  currentWorld = null;
  menu.hidePause();
  invUI.hide();
  bigMap.hide();
  menu.showLoading('Palataan päävalikkoon…');
  await nextFrame();
  await enterMenu();
}

// Pelin aikana selain kysyy ennen sivulta poistumista (esim. vahingossa
// painettu Ctrl+W kyykyn kanssa sulkisi välilehden).
window.addEventListener('beforeunload', (e) => {
  persist();
  if (currentWorld && state !== 'menu' && state !== 'loading') {
    e.preventDefault();
    e.returnValue = '';
  }
});
document.addEventListener('visibilitychange', () => { if (document.hidden) persist(); });

// --- Hiiren lukitus ja näppäimet ---------------------------------------------------
document.addEventListener('pointerlockchange', () => {
  if (input.locked) {
    if (state === 'ready' || state === 'paused' || state === 'inventory' || state === 'map' || state === 'dev') setState('playing');
  } else if (wantDev) {
    wantDev = false;
    setState('dev');
    devtools.show();
  } else if (wantInventory) {
    wantInventory = false;
    setState('inventory');
    invUI.show();
  } else if (wantMap) {
    wantMap = false;
    setState('map');
    bigMap.show();
  } else if (state === 'playing') {
    persist();
    setState('paused');
  }
});
document.addEventListener('pointerlockerror', () => {
  if (state === 'inventory' || state === 'map' || state === 'dev') setState('paused');
});
canvas.addEventListener('click', () => { if (state === 'playing' && !input.locked) input.lock(); });

window.addEventListener('keydown', (e) => {
  // F3 avaa selaimessa haun; pelissä se avaa kehittäjätyökalut.
  if (e.code === 'F3') e.preventDefault();
  if (state === 'playing' && e.code === 'F3') {
    if (input.locked) {
      wantDev = true;
      input.unlock();
    } else {
      setState('dev');
      devtools.show();
    }
  } else if (state === 'dev' && (e.code === 'F3' || e.code === 'Escape')) {
    e.preventDefault();
    devtools.hide();
    input.lock();
    setTimeout(() => { if (state === 'dev' && !input.locked) setState('paused'); }, 600);
  } else if (state === 'playing' && (e.code === 'Tab' || e.code === 'KeyI')) {
    e.preventDefault();
    wantInventory = true;
    input.unlock();
  } else if (state === 'inventory' && (e.code === 'Tab' || e.code === 'KeyI' || e.code === 'Escape')) {
    e.preventDefault();
    invUI.hide();
    input.lock();
    setTimeout(() => { if (state === 'inventory' && !input.locked) setState('paused'); }, 600);
  } else if (state === 'playing' && e.code === 'KeyQ') {
    throwSelected();
  } else if (state === 'playing' && e.code === 'KeyM') {
    e.preventDefault();
    wantMap = true;
    input.unlock();
  } else if (state === 'map' && bigMap.typing && e.code === 'Escape') {
    e.preventDefault();
    bigMap.closeEditor(false);
  } else if (state === 'map' && (e.code === 'KeyM' || e.code === 'Escape')) {
    e.preventDefault();
    bigMap.hide();
    input.lock();
    setTimeout(() => { if (state === 'map' && !input.locked) setState('paused'); }, 600);
  } else if (e.code === 'Escape') {
    if (state === 'paused') menu.back(menu.pause);
    else if (state === 'menu') menu.back(menu.main);
  }
});

// Heitä valittu esine [Q] (yksi kerrallaan) katseen suuntaan.
const _throwDir = new THREE.Vector3();
function throwSelected() {
  const sel = inventory.selectedItem;
  if (!sel || viewmodel.busy) return;
  const id = sel.id;
  const slot = inventory.selected;
  viewmodel.swing('punch', () => {
    const now = inventory.slots[slot];
    if (!now || now.id !== id) return;
    camera.getWorldDirection(_throwDir);
    const pos = camera.position.clone().addScaledVector(_throwDir, 0.5);
    pos.y -= 0.2;
    drops.throwItem(id, 1, pos, _throwDir, elapsed);
    inventory.removeFromSlot(slot, 1);
  });
}

// Herää henkiin maailman aloituspaikasta (reppu säilyy).
let respawning = false;
async function respawnPlayer() {
  if (respawning) return;
  respawning = true;
  const sp = findSpawn();
  combat.reset();
  player.respawn(sp.x, sp.z);
  player.yaw = Math.PI * 0.75;
  player.pitch = 0;
  state = 'loading';
  menu.showLoading('Herätään henkiin…');
  await buildAround(sp.x, sp.z, (p) => menu.setLoading(p));
  player.update(0, input, world);
  menu.hideLoading();
  respawning = false;
  setState(input.locked ? 'playing' : 'paused');
}
events.on('playerDied', () => {
  combat.reset();
  persist();
});

// --- Kehittäjätyökalut [F3] -----------------------------------------------------------------
// Siirtyminen: maailma rakennetaan uuden paikan ympärille ennen kuin jatketaan.
async function teleportTo(x, z, look = null) {
  player.teleport(x, z);
  player.velocity.set(0, 0, 0);
  if (look) player.yaw = Math.atan2(-(look.x - x), -(look.z - z));
  await buildAround(x, z);
  player.update(0, input, world);
}
const devtools = new DevTools({
  player, env, world, mobs, inventory, explored, ruins, drops, fps: null, teleport: teleportTo, fmtTime, music,
});

// --- Koko ------------------------------------------------------------------------------
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

// --- Tuntuma: kameran tärinä puun kaatuessa ja osumista -----------------------------------------
let shake = 0;
events.on('impact', ({ x, z, strength }) => {
  const d = Math.hypot(x - player.position.x, z - player.position.z);
  shake = Math.max(shake, strength * Math.max(0, 1 - d / 35));
});
events.on('hitFeedback', ({ strength }) => { shake = Math.max(shake, strength * 0.12); });

// --- Pääsilmukka --------------------------------------------------------------------------
let last = performance.now();
let elapsed = 0;
let saveTimer = CONFIG.autosaveSec;
let edgeMsgTimer = 0;
let drawTimer = 0;
let menuShadowTimer = 0;
const fps = { frames: 0, t: 0, value: 0 };
const _s = {};

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

function updateMenuCamera(dt) {
  menuCam.t += dt;
  const t = menuCam.t;
  const x = menuCam.x + Math.sin(t * 0.03) * 5;
  const z = menuCam.z + Math.cos(t * 0.021) * 3;
  const y = Math.max(heightAt(x, z), CONFIG.waterLevel) + 3 + Math.sin(t * 0.2) * 0.12;
  camera.position.set(x, y, z);
  // Katse kohti laskevaa aurinkoa, hidas panorointi.
  camera.rotation.set(0.05 + Math.sin(t * 0.07) * 0.02, MENU_SPOT.yaw + Math.sin(t * 0.045) * 0.18, 0, 'YXZ');
  player.position.set(x, y - 3, z);
}

function frame(now) {
  requestAnimationFrame(frame);
  const rawDt = (now - last) / 1000;
  const dt = Math.min(0.05, rawDt);
  last = now;
  const inGame = state === 'playing' || state === 'inventory' || state === 'paused' || state === 'ready' || state === 'map' || state === 'dev';
  const running = state === 'playing' || state === 'inventory' || state === 'map' || state === 'dev';
  const simDt = running || state === 'menu' ? dt : 0;
  elapsed += simDt;
  input.enabled = state === 'playing';

  if (state === 'playing') handleHotbar();

  if (state === 'menu') updateMenuCamera(dt);
  else if (inGame) player.update(running ? dt : 0, input, world);

  if (state !== 'boot') world.update(player.position.x, player.position.z, simDt);
  sampleTerrain(player.position.x, player.position.z, _s);
  // Musiikki: päävalikko, pelissä biomin mukaan (viiveet ja häivytykset music.js:ssä).
  const musicMode = state === 'menu' ? 'menu' : currentWorld && state !== 'boot' && (state !== 'loading' || respawning) ? 'game' : 'none';
  music.setMode(musicMode);
  // Häivytykset todellisessa ajassa (eivät hidastu, vaikka ruudunpäivitys olisi hidas).
  music.update(Math.min(0.25, rawDt), musicMode === 'game' ? BIOME_MUSIC[displayBiome(_s)] || null : null);
  env.setLocalHumidity(_s.rainforest);
  // Sademetsä: hidas eteneminen ja lyhyt piirtoetäisyys (näkyvyys on muutenkin lyhyt).
  player.speedMul = 1 - 0.3 * _s.rainforest;
  if (env.humid > 0.6) world.setDetailRange(2.2);
  else if (env.humid < 0.4) world.setDetailRange(Infinity);
  env.update(simDt, player.position, elapsed);
  // Vesi: aallot, väreily ja roiskeet
  const waves = player.waves;
  waves.amp = env.waveAmp;
  waves.windX = env.swellDir.x;
  waves.windZ = env.swellDir.y;
  waves.t = elapsed;
  drops.waves = waves;
  updateWaterMaterial(materials.water, env, elapsed, simDt);
  if (state !== 'boot') ripples.update(simDt, player.position.x, player.position.z);
  materials.water.uniforms.uRipple.value = ripples.texture;
  materials.water.uniforms.uRippleRect.value = ripples.rect;
  splashes.update(simDt, env.lightColor, materials.water.uniforms.uAmbient.value);
  fire.update(simDt, materials.water.uniforms.uAmbient.value);
  tumbleweeds.update(simDt, player.position, env.w.wind, env.windDir);
  if (state === 'playing' && !player.dead) interaction.update(simDt, input);
  else { structures.showGhost(null); interaction.prompt = null; }
  combat.update(simDt, input, elapsed, state === 'playing');
  mobs.update(running ? dt : 0, elapsed);
  // Kuollut pelaaja herää välilyönnillä tai klikkauksella.
  if (state === 'playing' && player.dead && player.deathT > RESPAWN_WAIT && (input.pressed.has('Space') || input.clicked.has(0))) {
    respawnPlayer();
  }

  structures.update(simDt, elapsed, player.position);
  ruins.update(running || state === 'menu' ? dt : 0, player.position);
  drops.update(running ? dt : 0, elapsed, player, inventory);
  fallen.update(running || state === 'menu' ? dt : 0);
  debris.update(running ? dt : 0);
  bursts.update(simDt);
  dust.update(elapsed, camera.position, env);
  sky.update(camera.position);

  if (inGame) {
    // Kameran tärinä
    if (shake > 0.001) {
      camera.position.x += (Math.random() - 0.5) * shake * 0.12;
      camera.position.y += (Math.random() - 0.5) * shake * 0.12;
      shake *= Math.exp(-dt * 6);
    }
    const fireNear = Math.max(0, 1 - structures.nearestFire / 7) * (1.2 - env.daylight);
    viewmodel.setItem(inventory.selectedItem ? inventory.selectedItem.id : null);
    viewmodel.update(simDt, player, input, env, camera, fireNear * 1.5);
    guide.update(simDt);
    hud.update(dt, { prompt: interaction.prompt, player, env, visible: state === 'playing' });
    explored.update(dt, player.position.x, player.position.z);
    minimap.update(dt, player);
    bigMap.update();
    devtools.update(dt);
    if (player.atEdge && state === 'playing') {
      edgeMsgTimer -= dt;
      if (edgeMsgTimer <= 0) {
        events.emit('message', { text: player.inWater ? 'Virta on liian voimakas' : 'Maailman reuna' });
        edgeMsgTimer = 3;
      }
    }
  } else {
    hud.update(dt, { prompt: null, player, env, visible: false });
  }

  // Valikossa aurinko on paikallaan: varjokartta päivitetään harvoin, jotta
  // valikon animaatioille jää aikaa. Taukovalikossa maailma on pysähdyksissä,
  // joten sitä piirretään vain muutaman kerran sekunnissa.
  renderer.shadowMap.autoUpdate = state !== 'menu';
  if (state === 'menu') {
    menuShadowTimer -= dt;
    if (menuShadowTimer <= 0) { menuShadowTimer = 0.5; renderer.shadowMap.needsUpdate = true; }
  }
  drawTimer -= dt;
  if (state !== 'paused' || drawTimer <= 0) {
    drawTimer = 0.25;
    // Maailma tehosteineen, sitten käsi päälle (ei tehosteita).
    post.render(scene, camera, env, state === 'paused' ? 0 : dt);
    if (inGame) {
      renderer.setRenderTarget(null);
      renderer.clearDepth();
      renderer.render(viewmodel.scene, viewmodel.camera);
    }
  }
  input.endFrame();

  if (running) {
    saveTimer -= dt;
    if (saveTimer <= 0) { saveTimer = CONFIG.autosaveSec; persist(); }
  }
  fps.frames++;
  fps.t += (now - (frame.prev || now)) / 1000;
  frame.prev = now;
  devtools.ctx.fps = fps;
  if (fps.t >= 1) {
    fps.value = fps.frames / fps.t;
    fps.frames = 0;
    fps.t = 0;
    if (settings.showFps) $('fps').textContent = `${Math.round(fps.value)} FPS`;
  }
}

// --- Käynnistys ---------------------------------------------------------------------------
requestAnimationFrame(frame);
enterMenu(true);

// Testausta ja vianetsintää varten (selaimen konsolissa: sahel.env.setWeather('sandstorm', true)).
window.sahel = {
  THREE, renderer, scene, camera, env, world, player, input, inventory, invUI, guide, structures, tumbleweeds,
  viewmodel, interaction, drops, fallen, debris, breakables, ruins, explored, bigMap, menu, fps, events, persist, models,
  ripples, splashes, waterFx, materials, post, mobs, combat, hud, fire, devtools, music,
  startWorld, enterMenu, quitToMenu, respawnPlayer, setState: (s) => setState(s), get state() { return state; },
};
