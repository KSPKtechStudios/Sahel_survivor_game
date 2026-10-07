// Sahel: käynnistys, tilat (päävalikko / lataus / peli / tauko / reppu) ja pääsilmukka.
import * as THREE from 'three';
import { CONFIG } from './config.js';
import { createGroundDetailTexture } from './render/textures.js';
import { createSharedMaterials, wetUniforms, addWet } from './render/materials.js';
import { Sky } from './render/sky.js';
import { Environment, WEATHER_KEYS } from './render/environment.js';
import { Dust, Bursts } from './render/particles.js';
import { Ambient } from './render/ambient.js';
import { Debris } from './render/debris.js';
import { createWaterMaterial, updateWaterMaterial } from './render/water.js';
import { Ripples } from './render/ripples.js';
import { Splashes } from './render/splash.js';
import { FireFx } from './render/fire.js';
import { Blood } from './render/blood.js';
import { Rain } from './render/rain.js';
import { PostFX } from './render/post.js';
import { Music, BIOME_MUSIC } from './audio/music.js';
import { Sfx } from './audio/sfx.js';
import { createModelLibrary } from './models/models.js';
import { World } from './world/world.js';
import { Tumbleweeds } from './world/tumbleweeds.js';
import { findSpawn, setWorldSeed, seedFromString, sampleTerrain, heightAt, displayBiome, waterAt } from './world/terrain.js';
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
import { Survival } from './game/survival.js';
import { Archery } from './game/archery.js';
import { BuildSystem } from './game/building.js';
import { Boats } from './game/boats.js';
import { PIECES } from './game/pieces.js';
import { events } from './game/events.js';
import { loadWorldData, saveWorldData, loadSettings } from './game/save.js';
import { renderItemIcons } from './ui/icons.js';
import { Hud, RESPAWN_WAIT } from './ui/hud.js';
import { Nameplates } from './ui/nameplates.js';
import { Minimap } from './ui/minimap.js';
import { ExploredMap } from './ui/explored.js';
import { BigMap } from './ui/bigMap.js';
import { GuideUI } from './ui/guideUI.js';
import { InventoryUI } from './ui/inventoryUI.js';
import { BuildMenu } from './ui/buildMenu.js';
import { RunePanel } from './ui/runePanel.js';
import { BoatHud } from './ui/boatHud.js';
import { Menu } from './ui/menu.js';
import { DevTools } from './ui/devtools.js';

const $ = (id) => document.getElementById(id);
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));
const MENU_SEED = seedFromString('sahel-valikko');
// Maisemallinen paikka valikon taustalle (savannia, akasioita ja kallioita
// auringonlaskussa). Sessio 9: siirretty uuden biomijaon mukaan.
const MENU_SPOT = { x: -2296, z: 582, yaw: 1.6, time: 17.1 };

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
const activeMaterial = addWet(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }), 1, 0.3);
const models = createModelLibrary();
const sky = new Sky(scene);
materials.water = createWaterMaterial(sky);
const env = new Environment(scene, renderer, sky);
const world = new World(scene, materials, models);
const tumbleweeds = new Tumbleweeds(scene, models.tumbleweed, materials.solid);
const dust = new Dust(scene);
const ambient = new Ambient(scene, world);
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
const blood = new Blood(scene);
const rain = new Rain(scene, renderer);
env.onStrike = (angle, dist, near) => {
  rain.strike(camera, angle, dist, near);
  // Lähisalama: jyrähdys heti (sfx alustetaan alempana) ja isku maahan:
  // hiekkaa ja multaa pöllähtää ja pieni tulipallo leimahtaa (sessio 12c).
  if (near) {
    const x = camera.position.x + Math.cos(angle) * dist, z = camera.position.z + Math.sin(angle) * dist;
    sfx.thunderClap(x, z, dist, { x: camera.position.x, z: camera.position.z, yaw: player.yaw });
    const wq = waterAt(x, z, {});
    if (wq.wl <= wq.h + 0.05) {
      const p = new THREE.Vector3(x, wq.h + 0.3, z);
      // Sora ja multa lentävät, pölypilvi leviää hitaasti.
      bursts.spawn(p, 0xd9c49a, 40, 9, { size: 0.4, life: 1.3, gravity: 9, lit: true });
      bursts.spawn(p, 0x8a6a48, 30, 7, { size: 0.35, life: 1.2, gravity: 9, lit: true });
      bursts.spawn(p, 0xc8b493, 16, 2.6, { size: 3.6, life: 2.6, gravity: -0.4, opacity: 0.55, lit: true });
      rain.impact(p);
    }
  }
};
const music = new Music();
// Selain sallii äänen vasta käyttäjän ensimmäisen klikkauksen tai näppäimen jälkeen.
const sfx = new Sfx();
// Pelin fontti ladataan heti (kartat piirtävät tekstiä kankaalle).
if (document.fonts) document.fonts.load("700 16px 'Philosopher'").catch(() => {});
const lightningEl = document.getElementById('lightning');
for (const ev of ['pointerdown', 'keydown']) window.addEventListener(ev, () => { music.unlock(); sfx.unlock(); }, { capture: true });

const inventory = new Inventory();
const guide = new Guide();
const player = new Player(camera);
const input = new Input(canvas);
const viewmodel = new ViewModel(models.items);
const mobs = new Mobs({ scene, world, drops, debris, bursts, player, env, structures, fire, blood });
// Kaatuvat puut: osumat pelaajaan ja olentoihin, ketjukaato (sessio 13).
fallen.player = player;
fallen.mobs = mobs;
fallen.knockTree = (obj, dir, depth) => breakables.fellTree(obj, dir, depth);
const boats = new Boats({ scene, camera, player, env, drops, waves: player.waves });
boats.fx = {
  ripple: (x, z, r, s) => ripples.disturb(x, z, r, s),
  splash: (x, y, z, power, opts) => splashes.spawn(x, y, z, power, opts),
};
const interaction = new Interaction({ camera, player, world, tumbleweeds, inventory, viewmodel, structures, debris, drops, fallen, breakables, ruins, mobs, boats });
interaction.boardBoat = (b) => boats.board(b);
const combat = new Combat({ camera, player, inventory, viewmodel, interaction, mobs, debris, bursts });
mobs.combat = combat;
const survival = new Survival(player);
const archery = new Archery({ scene, camera, player, inventory, viewmodel, mobs, world, drops, debris });
const build = new BuildSystem({ camera, player, inventory, structures, world, viewmodel, drops, boats });

const icons = renderItemIcons(models.items);
const pieceIcons = renderItemIcons(models.build);
const hud = new Hud(inventory, icons, survival);
const nameplates = new Nameplates(document.getElementById('hud'));
const boatHud = new BoatHud();
const explored = new ExploredMap(world.gen);
const minimap = new Minimap(explored);
const bigMap = new BigMap(explored, player);
bigMap.boats = boats;
new GuideUI(guide);
const invUI = new InventoryUI(inventory, icons, {
  stations: () => structures.stationsNear(player.position.x, player.position.z),
  use: (i) => useSlot(i),
});
const buildMenu = new BuildMenu({
  inventory, itemIcons: icons, pieceIcons,
  hasBench: () => !!structures.nearest('workbench', player.position.x, player.position.z, 20),
  onSelect: (type) => {
    build.select(type);
    events.emit('message', { text: `${PIECES[type].name}: [Hiiri 1] rakenna, [R] käännä` });
    closeBuildMenu();
  },
});
document.getElementById('buildmenu').addEventListener('contextmenu', (e) => {
  e.preventDefault();
  if (state === 'build') closeBuildMenu();
});

// Syö / käytä repun paikan esine (ruoka ja rohdot).
function useSlot(i) {
  const s = inventory.slots[i];
  if (!s || player.dead) return;
  if (survival.eat(s.id)) {
    inventory.removeFromSlot(i, 1);
    viewmodel.eat();
    events.emit('notify', { item: s.id, count: -1 });
  }
}
interaction.useItem = useSlot;

// Riimukivet: [E] kääntää tekstin suomeksi.
const runePanel = new RunePanel();
interaction.readRune = (a) => {
  runePanel.toggle(ruins.translate(a), a.st.id, a.rune.world);
  viewmodel.pickup();
};

// Makuualusta: yöllä nukutaan aamuun, aina asetetaan herätyspaikaksi.
let sleepT = 0;
interaction.usePiece = (st) => {
  structures.bed = st;
  const night = env.time >= 20 || env.time < 5.5;
  if (!night) {
    events.emit('message', { text: 'Herätyspaikka asetettu. Nukkua voi vain yöllä.' });
    return;
  }
  const foes = mobs.list.some((m) => (m.type === 'clay' || m.type === 'haamu') && m.state !== 'dead' && m.pos.distanceTo(player.position) < (m.type === 'haamu' ? 40 : 25));
  if (foes) {
    events.emit('message', { text: 'Et voi nukkua: vihollisia on lähellä' });
    return;
  }
  sleepT = 1.6;
  combat.reset();
};

function openBuildMenu() {
  if (state !== 'playing') return;
  wantBuild = true;
  input.unlock();
}
function closeBuildMenu() {
  buildMenu.hide();
  input.lock();
  setTimeout(() => { if (state === 'build' && !input.locked) setState('paused'); }, 600);
}
build.openMenu = openBuildMenu;

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
  // Ultra: tarkkuus myös tarkoilla näytöillä (enintään 2× pikselitiheys).
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, s.quality === 'ultra' ? 2 : 1.5) * s.renderScale);
  renderer.setSize(window.innerWidth, window.innerHeight);
  if (s.shadows !== shadowMode) {
    const prevEnabled = renderer.shadowMap.enabled;
    shadowMode = s.shadows;
    renderer.shadowMap.enabled = s.shadows !== 'off';
    // Korkea: tarkempi varjokartta ja varjot kauemmas.
    const size = s.shadows === 'high' ? 2048 : 1536;
    env.sun.shadow.camera.far = s.shadows === 'high' ? 260 : 170;
    env.sun.shadow.radius = s.shadows === 'high' ? 2.5 : 2;
    // Koon muutos: three.js muuttaa varjokartan koon itse (setSize). Kartan
    // käsin poistaminen jätti materiaaleille vanhan syvyystekstuurin.
    if (env.sun.shadow.mapSize.x !== size) env.sun.shadow.mapSize.set(size, size);
    if (prevEnabled !== renderer.shadowMap.enabled) {
      scene.traverse((o) => { if (o.material) o.material.needsUpdate = true; });
    }
  }
  $('fps').classList.toggle('hidden', !s.showFps);
  post.godRays = s.godRays !== false;
  post.motionBlur = s.motionBlur === 'high' ? 2 : s.motionBlur === 'low' ? 1 : 0;
  post.dof = !!s.dof;
  post.lensFlare = s.lensFlare !== false;
  music.setVolumes(s.masterVolume ?? 1, s.musicVolume ?? 0.8);
  sfx.setVolumes(s.masterVolume ?? 1, s.sfxVolume ?? 1);
}
applySettings(settings);

// --- Tila ---------------------------------------------------------------------------
let state = 'boot'; // boot | menu | loading | ready | playing | paused | inventory | map | dev
let currentWorld = null;
let wantInventory = false;
let wantMap = false;
let wantBuild = false;
let wantDev = false;
const menuCam = { x: 0, z: 0, t: 0 };

function setState(s) {
  state = s;
  const inGame = s === 'playing' || s === 'paused' || s === 'inventory' || s === 'map' || s === 'dev' || s === 'build';
  $('hud').classList.toggle('hidden', !inGame);
  if (s !== 'inventory') invUI.hide();
  if (s !== 'build') buildMenu.hide();
  if (s === 'menu' || s === 'loading') runePanel.hide();
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
  ambient.clear();
  explored.clear();
  splashes.clear();
  fire.clear();
  blood.clear();
  mobs.clear();
  boats.clear();
  combat.reset();
  archery.clear();
  build.select(null);
  survival.reset();
  structures.held = null;
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
  survival.load(data ? data.survival : null);
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
  env.snapClimate();
  structures.load(data ? data.structures : []);
  boats.load(data ? data.boats : null);
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
    survival: survival.serialize(),
    env: env.serialize(),
    world: world.serialize(),
    structures: structures.serialize(),
    boats: boats.serialize(),
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
    if (state === 'ready' || state === 'paused' || state === 'inventory' || state === 'map' || state === 'dev' || state === 'build') setState('playing');
  } else if (wantBuild) {
    wantBuild = false;
    setState('build');
    buildMenu.show(build.selected);
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
  if (state === 'inventory' || state === 'map' || state === 'dev' || state === 'build') setState('paused');
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
  } else if (state === 'build' && (e.code === 'Escape' || e.code === 'Tab')) {
    e.preventDefault();
    closeBuildMenu();
  } else if (state === 'inventory' && (e.code === 'Tab' || e.code === 'KeyI' || e.code === 'Escape')) {
    e.preventDefault();
    invUI.hide();
    input.lock();
    setTimeout(() => { if (state === 'inventory' && !input.locked) setState('paused'); }, 600);
  } else if (state === 'playing' && e.code === 'KeyQ') {
    throwSelected(e.shiftKey);
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

// Heitä valittu esine [Q] (yksi kerrallaan) katseen suuntaan; [Shift]+[Q]
// heittää koko pinon kerralla (sessio 12e).
const _throwDir = new THREE.Vector3();
function throwSelected(all = false) {
  const sel = inventory.selectedItem;
  if (!sel || viewmodel.busy) return;
  const id = sel.id;
  const slot = inventory.selected;
  viewmodel.swing('punch', () => {
    const now = inventory.slots[slot];
    if (!now || now.id !== id) return;
    const n = all ? now.count : 1;
    camera.getWorldDirection(_throwDir);
    const pos = camera.position.clone().addScaledVector(_throwDir, 0.5);
    pos.y -= 0.2;
    drops.throwItem(id, n, pos, _throwDir, elapsed);
    sfx.click();
    inventory.removeFromSlot(slot, n);
  });
}

// Herää henkiin maailman aloituspaikasta (reppu säilyy).
let respawning = false;
async function respawnPlayer() {
  if (respawning) return;
  respawning = true;
  // Herätyspaikka: makuualusta, jos sellainen on rakennettu.
  const bed = structures.bed;
  const sp = bed ? { x: bed.x + 1.2 * Math.cos(bed.rot), z: bed.z - 1.2 * Math.sin(bed.rot) } : findSpawn();
  combat.reset();
  archery.reset();
  survival.clearEffects();
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
  boats.detach();
  persist();
});

// --- Kehittäjätyökalut [F3] -----------------------------------------------------------------
// Siirtyminen: maailma rakennetaan uuden paikan ympärille ennen kuin jatketaan.
async function teleportTo(x, z, look = null) {
  boats.detach();
  player.teleport(x, z);
  env.snapClimate();
  player.velocity.set(0, 0, 0);
  if (look) player.yaw = Math.atan2(-(look.x - x), -(look.z - z));
  await buildAround(x, z);
  player.update(0, input, world);
}
const devtools = new DevTools({
  player, env, world, mobs, inventory, explored, ruins, drops, fps: null, teleport: teleportTo, fmtTime, music, boats,
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

// --- Äänitehosteet (sessio 12) ---------------------------------------------------------------
// Taustaäänet käyttäjän ohjeen mukaan: tuuli ukkosella (missä ukkonen on
// mahdollinen) sekä aina vuoristossa ja merellä; viidakon ääni sademetsässä;
// sade aina kun sataa (myös sademetsän tihku, hiljaa); kaukainen ukkonen
// ukkosmyrskyssä; aavikon tuuli (hiljaa, myrskyssä kovaa) ja raju myrskytuuli
// (sessio 12c). Kaikki voivat soida päällekkäin.
let birdT = 4;
const _camDir = new THREE.Vector3();
const _sunP = new THREE.Vector3();
const _sm = (a, b, x) => Math.max(0, Math.min(1, (x - a) / (b - a)));
function updateSfx(game, rainAmt, realDt) {
  if (game) {
    const dry = Math.min(1, env.climate.desert + env.climate.dry + env.climate.mountain);
    const thunder = env.w.thunder * (1 - dry);
    const sand = _sm(0.45, 0.9, env.w.dust);
    const open = Math.max(_sm(0.2, 0.7, _s.mountains || 0), _sm(0.2, 0.7, _s.ocean || 0));
    sfx.setLevels({
      wind: Math.max(thunder, open * (0.6 + 0.4 * Math.min(1, env.w.wind))),
      jungle: _sm(0.3, 0.7, _s.rainforest || 0),
      rain: _sm(0.05, 0.12, rainAmt) * Math.pow(Math.min(1, rainAmt), 1.2),
      thunder,
      // Aavikon tuuli: aina hyvin hiljaa, hiekkamyrskyssä kovaa.
      desertWind: Math.max(0.1 * _sm(0.3, 0.7, (_s.desert || 0) + (_s.dunes || 0)), sand),
      // Raju tuuli: merellä ukkosella ja hiekkamyrskyssä puuskittain.
      stormWind: Math.max(thunder * _sm(0.2, 0.7, _s.ocean || 0), sand * Math.max(0, Math.sin(elapsed * 0.21) * Math.sin(elapsed * 0.077 + 1)) * 1.6),
    });
    // Linnut (sessio 12d): välillä viidakossa, savannilla harvemmin; päivällä
    // eikä kovassa sateessa.
    birdT -= realDt;
    if (birdT <= 0) {
      const jungle = (_s.rainforest || 0) > 0.5;
      const sav = (_s.savanna || 0) + (_s.woodland || 0) > 0.5;
      birdT = jungle ? 6 + Math.random() * 12 : 18 + Math.random() * 30;
      if ((jungle || sav) && env.daylight > 0.3 && rainAmt < 0.5) sfx.bird({ x: player.position.x, z: player.position.z, yaw: player.yaw });
    }
  } else {
    sfx.setLevels({});
  }
  sfx.update(realDt);
}

// Askeleet: materiaali jalkojen alta.
function stepMaterial() {
  if (player.inWater === 1) return 'water';
  if (player.onPlatform) return 'wood';
  const s = _s;
  if ((s.rock || 0) > 0.4 || (s.mountains || 0) > 0.6) return 'rock';
  if ((s.beach || 0) + (s.desert || 0) + (s.dunes || 0) > 0.5) return 'sand';
  if ((s.rainforest || 0) > 0.5) return 'leaves';
  if ((s.laterite || 0) > 0.5) return 'gravel';
  return 'grass';
}
player.onFootstep = (k) => sfx.step(stepMaterial(), k);
events.on('swing', ({ heavy, quiet }) => sfx.whoosh(heavy, quiet));
events.on('punch', ({ heavy }) => sfx.punch(heavy));
// Tärkeät tehosteet painavat myös musiikkia hetkeksi hiljemmaksi (väistö).
sfx.onDuck = (to, hold) => music.duck(Math.max(0.45, to), hold);
events.on('woodHit', ({ x, z }) => sfx.chop(x, z, { x: player.position.x, z: player.position.z, yaw: player.yaw }));
events.on('haamuSound', ({ kind, x, z }) => {
  sfx.ghost(kind, x, z, { x: player.position.x, z: player.position.z, yaw: player.yaw });
});
events.on('treeFell', ({ x, z, fallTime, size }) => {
  if (x === undefined) return;
  sfx.treeFall(x, z, fallTime, size, { x: player.position.x, z: player.position.z, yaw: player.yaw });
});

// --- Pääsilmukka --------------------------------------------------------------------------
let last = performance.now();
let elapsed = 0;
let saveTimer = CONFIG.autosaveSec;
let edgeMsgTimer = 0;
let drawTimer = 0;
let menuShadowTimer = 0;
// Soihtu: kirkkaampi ja kantavampi kuin ennen, lämmin, elävästi lepattava
// liekki (structures.js: torch).
const torchFire = { x: 0, y: 0, z: 0, seed: 7, light: 1.7, fireY: 0, torch: true };
let torchFlameK = 1, torchCough = 0;
let wasNight = false;
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
    // Kierto vain tässä biomissa mahdollisten säiden läpi (mahdoton sää ei
    // tarttunut hallitsevaan vyöhykkeeseen, joten kierto jäi jumiin).
    const keys = WEATHER_KEYS.filter((k) => k !== 'menu' && env.weatherPossibleHere(k));
    const i = keys.indexOf(env.targetKey);
    env.setWeather(keys[(i + 1) % keys.length], true);
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
  const inGame = state === 'playing' || state === 'inventory' || state === 'paused' || state === 'ready' || state === 'map' || state === 'dev' || state === 'build';
  const running = state === 'playing' || state === 'inventory' || state === 'map' || state === 'dev' || state === 'build';
  const simDt = running || state === 'menu' ? dt : 0;
  elapsed += simDt;
  input.enabled = state === 'playing';

  if (state === 'playing') handleHotbar();

  if (state === 'menu') updateMenuCamera(dt);
  else if (inGame) {
    // Vene liikkuu ennen pelaajaa (kyydissä pelaajan paikka tulee veneeltä).
    boats.update(running ? dt : 0, input, elapsed);
    player.update(running ? dt : 0, input, world);
  }

  if (state !== 'boot') world.update(player.position.x, player.position.z, simDt);
  sampleTerrain(player.position.x, player.position.z, _s);
  // Musiikki: päävalikko, pelissä biomin mukaan (viiveet ja häivytykset music.js:ssä).
  const musicMode = state === 'menu' ? 'menu' : currentWorld && state !== 'boot' && (state !== 'loading' || respawning) ? 'game' : 'none';
  music.setMode(musicMode);
  // Häivytykset todellisessa ajassa (eivät hidastu, vaikka ruudunpäivitys olisi hidas).
  music.update(Math.min(0.25, rawDt), musicMode === 'game' ? BIOME_MUSIC[displayBiome(_s)] || null : null);
  env.setLocalHumidity(_s.rainforest);
  env.setClimate(_s);
  // Sademetsä: hidas eteneminen ja lyhyt piirtoetäisyys (näkyvyys on muutenkin lyhyt).
  player.speedMul = 1 - 0.3 * _s.rainforest;
  if (env.humid > 0.6) world.setDetailRange(2.2);
  else if (env.humid < 0.4) world.setDetailRange(Infinity);
  // Vuorokausi ja sään vaihtuminen todellisessa ajassa (10 min päivä + 10 min yö).
  env.update(simDt, player.position, elapsed, running || state === 'menu' ? Math.min(0.25, rawDt) : 0);
  // Sade ja sadepisaroiden väreet vedessä. Sademetsässä tihuttaa aina.
  const rainAmt = inGame && state !== 'menu' ? Math.max(env.w.rain, env.humid * 0.24) : 0;
  wetUniforms.uWet.value = inGame && state !== 'menu' ? env.wet : 0;
  wetUniforms.uWetSky.value.copy(scene.fog.color);
  wetUniforms.uRain.value = rainAmt;
  wetUniforms.uPuddle.value = inGame && state !== 'menu' ? env.puddleWet : 0;
  updateSfx(musicMode === 'game' && state !== 'loading', rainAmt, Math.min(0.25, rawDt));
  // Vesipisarat linssillä (sessio 12e): vain purjehdittaessa myrskyssä
  // (tyrskyt ja sade), ja hyvin hillitysti.
  const sailingStorm = inGame && state !== 'menu' && player.riding && env.w.thunder > 0.4;
  const lensT = sailingStorm ? 0.35 * _sm(0.4, 0.8, env.w.thunder) : 0;
  post.lens += (lensT - post.lens) * Math.min(1, Math.min(0.25, rawDt) * 1.5);
  // Linssiheijastus: auringon paikka kuvassa; heikkenee pilvisellä, auringon
  // laskiessa ja kuvan reunoilla.
  _sunP.copy(camera.position).addScaledVector(env.sunDir, 1000).project(camera);
  const sunFront = _sunP.z < 1 && Math.abs(_sunP.x) < 1.25 && Math.abs(_sunP.y) < 1.25;
  const edge = 1 - _sm(0.85, 1.25, Math.max(Math.abs(_sunP.x), Math.abs(_sunP.y)));
  post.flare = sunFront ? edge * (1 - 0.92 * env.w.cloud) * (1 - env.w.dust) * _sm(-0.03, 0.08, env.sunDir.y) : 0;
  post.sunUV.set(_sunP.x * 0.5 + 0.5, _sunP.y * 0.5 + 0.5);
  // Lähisalaman välähdys koko näytölle.
  lightningEl.style.opacity = env.flashK > 1 && env.flash > 0 ? Math.min(0.75, env.flash * 0.3).toFixed(3) : '0';
  rain.fogFar = scene.fog.far;
  rain.update(simDt, camera, rainAmt, env.windDir, 0.2 + 0.8 * env.daylight, Math.min(0.25, rawDt), scene.fog.color);
  if (rainAmt > 0.1 && simDt > 0) {
    for (let i = 0, n = Math.floor(rainAmt * 6 + Math.random()); i < n; i++) {
      const a = Math.random() * Math.PI * 2, r = Math.random() * 14;
      ripples.disturb(player.position.x + Math.cos(a) * r, player.position.z + Math.sin(a) * r, 0.18, 0.05 + rainAmt * 0.05);
    }
  }
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
  blood.update(simDt, 0.35 + 0.65 * env.daylight);
  tumbleweeds.update(simDt, player.position, env.w.wind, env.windDir);
  if (state === 'playing' && !player.dead) {
    const wasRiding = boats.riding;
    interaction.update(simDt, input);
    // Veneessä: [E] nousee maihin, kun katse ei osu mihinkään muuhun
    // (ei samalla painalluksella, jolla juuri noustiin kyytiin).
    if (boats.riding && !interaction.target) {
      interaction.prompt = boats.prompt;
      if (wasRiding && input.pressed.has('KeyE') && input.enabled) boats.disembark();
    }
    // Vasara: rakennushaamu ja kehote (vasaran kehote korvaa muut).
    if (build.update(simDt, input) && build.prompt) interaction.prompt = build.prompt;
  } else { structures.showGhost(null); interaction.prompt = null; }
  combat.update(simDt, input, elapsed, state === 'playing');
  archery.update(simDt, input, state === 'playing');
  if (running) survival.update(dt);
  // Jousen tähtäys: näkökenttä kapenee jännittäessä.
  const wantFov = settings.fov - 9 * archery.zoom;
  if (Math.abs(camera.fov - wantFov) > 0.01) {
    camera.fov += (wantFov - camera.fov) * Math.min(1, dt * 12);
    camera.updateProjectionMatrix();
  }
  // Kädessä oleva soihtu valaisee ympäristön (jaettu tulivalo).
  const torchSlot = inGame && !player.dead && inventory.selectedItem && inventory.selectedItem.id === 'torch' ? inventory.selectedItem : null;
  // Soihtu (sessio 13): sammuu veden alla, syttyy uudelleen nuotion vieressä;
  // sateessa palaa heikosti ja "yskien".
  if (torchSlot && simDt > 0) {
    const under = player.inWater === 2 || (player.surface > -Infinity && camera.position.y - 0.25 < player.surface);
    if (!torchSlot.unlit && under) {
      torchSlot.unlit = true;
      events.emit('message', { text: 'Soihtu sammui vedessä. Sytytä se nuotiolla.' });
      splashes.spawn(torchFire.x, player.surface > -Infinity ? player.surface : camera.position.y, torchFire.z, 0.2, { spread: 0.3 });
    } else if (torchSlot.unlit && !under && structures.nearestFire < 3.2) {
      torchSlot.unlit = false;
      events.emit('message', { text: 'Soihtu syttyi.' });
    }
  }
  const rainOnTorch = Math.max(0, env.w.rain - 0.15);
  if (torchSlot && !torchSlot.unlit && rainOnTorch > 0) {
    // Yskivä liekki: hidas heikkeneminen ja satunnaisia notkahduksia.
    torchCough = Math.max(0, torchCough - simDt);
    if (torchCough <= 0 && Math.random() < simDt * 1.6 * rainOnTorch) torchCough = 0.25 + Math.random() * 0.45;
    const base = 1 - Math.min(0.55, rainOnTorch * 0.8);
    const target = base * (0.8 + 0.2 * Math.sin(elapsed * 2.3) * Math.sin(elapsed * 5.1)) * (torchCough > 0 ? 0.35 : 1);
    torchFlameK += (target - torchFlameK) * Math.min(1, simDt * 10);
  } else {
    torchFlameK += ((torchSlot && !torchSlot.unlit ? 1 : 0) - torchFlameK) * Math.min(1, simDt * 6);
  }
  viewmodel.torchFlame = torchSlot && torchSlot.unlit ? 0 : torchFlameK;
  const torchHeld = !!torchSlot && !torchSlot.unlit;
  torchFire.light = 1.7 * Math.max(0.15, torchFlameK);
  if (torchHeld) {
    // Valo soihdun liekin kohdalla (oikea käsi, hieman edessä ja yläpuolella),
    // ei vartalon keskellä (sessio 12e: soihdulla näki huonosti).
    camera.getWorldDirection(_camDir);
    const rx = -_camDir.z, rz = _camDir.x, rl = Math.hypot(rx, rz) || 1;
    torchFire.x = camera.position.x + _camDir.x * 0.45 + (rx / rl) * 0.32;
    torchFire.y = camera.position.y + 0.12;
    torchFire.z = camera.position.z + _camDir.z * 0.45 + (rz / rl) * 0.32;
  }
  structures.held = torchHeld ? torchFire : null;
  // Illan tullen ilmoitetaan kuun vaihe (täysikuulla viholliset liikkuvat).
  const nightNow = env.daylight < 0.25;
  if (inGame && state !== 'menu' && nightNow && !wasNight && simDt > 0) {
    events.emit('message', { text: env.moonIllum > 0.85 ? `${env.moonName}: yössä liikkuu tavallista enemmän vihollisia` : env.moonName });
  }
  wasNight = nightNow;
  // Nukkuminen: ruutu pimenee, aika siirtyy aamuun.
  if (sleepT > 0) {
    const was = sleepT;
    sleepT = Math.max(0, sleepT - dt);
    $('flash').style.background = 'rgba(0, 0, 0, 1)';
    $('flash').style.opacity = (Math.min(1, Math.sin((1 - sleepT / 1.6) * Math.PI) * 1.6)).toFixed(3);
    if (was > 0.8 && sleepT <= 0.8) {
      env.setTime(6);
      if (env.time < 6.5) env.day += 1;
      events.emit('message', { text: 'Nukuit aamuun' });
      persist();
    }
    if (sleepT <= 0) { $('flash').style.background = ''; $('flash').style.opacity = '0'; }
  }
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
  ambient.update(simDt, elapsed, camera.position, env);
  sky.update(camera.position);

  if (inGame) {
    // Kameran tärinä
    if (shake > 0.001) {
      camera.position.x += (Math.random() - 0.5) * shake * 0.12;
      camera.position.y += (Math.random() - 0.5) * shake * 0.12;
      shake *= Math.exp(-dt * 6);
    }
    const torchLit = inventory.selectedItem && inventory.selectedItem.id === 'torch' && !inventory.selectedItem.unlit ? 0.9 * torchFlameK : 0;
    const fireNear = Math.max(torchLit, Math.max(0, 1 - structures.nearestFire / 7)) * (1.2 - env.daylight);
    viewmodel.setItem(inventory.selectedItem ? inventory.selectedItem.id : null);
    viewmodel.update(simDt, player, input, env, camera, fireNear * 1.5);
    guide.update(simDt);
    runePanel.update(dt, player.position);
    hud.update(dt, { prompt: interaction.prompt, player, env, visible: state === 'playing', cooldown: combat.cooldownFrac });
    nameplates.update(camera, mobs, interaction.prompt, state === 'playing');
    boatHud.update(boats, state === 'playing' && !player.dead);
    explored.update(dt, player.position.x, player.position.z);
    minimap.update(dt, player, boats);
    bigMap.update();
    devtools.update(dt);
    if (player.atEdge && state === 'playing') {
      edgeMsgTimer -= dt;
      if (edgeMsgTimer <= 0) {
        events.emit('message', { text: player.inWater || player.riding ? 'Virta on liian voimakas' : 'Maailman reuna' });
        edgeMsgTimer = 3;
      }
    }
  } else {
    hud.update(dt, { prompt: null, player, env, visible: false });
    nameplates.update(camera, mobs, null, false);
    boatHud.update(boats, false);
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
  ripples, splashes, waterFx, materials, post, mobs, combat, hud, fire, devtools, music, sfx, blood,
  startWorld, enterMenu, quitToMenu, respawnPlayer, setState: (s) => setState(s), get state() { return state; },
  menuSpot: MENU_SPOT, menuCam, survival, archery, build, buildMenu, useSlot, boats, ambient,
};
