// Mallikirjasto: kokoaa proseduraaliset mallit yhteen.
//
// Väliaikaisia malleja: jokainen malli on BufferGeometry (position, normal,
// color). Kun grafiikkaa jalostetaan, nämä voi korvata glTF-malleilla samoilla
// nimillä (ks. docs/DECISIONS.md).
import { makeAcacia, makeBaobab, makeJungleTree, makeCanopyTree, makeEmergentTree, makeSapling } from './trees.js';
// Sessio 26: uudet palmut ja banaanit.
import { makePalm, makeCoconutPalm, makeDoumPalm } from './palms.js';
import { makeBush, makeTumbleweed, makeGrassTuft, makeThicket, makeEuphorbia, makeReeds } from './plants.js';
import { makeGroundStick, makeStone, makeTermiteMound, makeOutcrop, makeSpire } from './rocks.js';
import { scannedBoulder, SCANNED_BOULDER_COUNT } from './scanned/build.js';
import { kitModel } from './kit/build.js';
import { makeAncientPillar, makeRustyShield, makeAncientRoots, makeTwigs } from './ancient.js';
import { makeKelp, makeSeabedRocks, makeShoreRocks, makeBeachStones } from './shore.js';
import { ensureUv } from './util.js';
import { treeAsset, treeVariantCount } from './treeAssets.js';
import { makeCampfireBase, createItemModels } from './items.js';
import { createBuildModels } from './building.js';
import {
  makeSheaTree, makeLog, makeDesertShrub, makeDriftwood,
  makeTallGrass, makeFlowers, makeLilies, makeSeaweed, makeBones, makeScree, makePuddle,
} from './flora.js';
import {
  makeFlintGround, makeShellGround, makeFeatherGround, makeCoconutGround, makeBaobabFruitGround, makeSheaNutsGround,
  makeMushPatch, makeJujubeBush, makeMoringa, makeHibiscus, makeReedClump, makeFonio, makeClayLump,
} from './pickups.js';

// Sessio 24: Quaternius-kitin mallit (CC0). Muunnelma i = siemen (base + i * 101).
// indexed: pelkät koristeet (ei sirpaleita), kevyempi piirtää.
function kit(names, base, indexed = false) {
  return [(s, q) => kitModel(names[Math.round((s - base) / 101)], q, indexed), names.length, base];
}

// Sessio 27: kitin puumallille rungon akseli, säteet ja kaatokohta
// (FallenTrees ja treeCut tarvitsevat ne). Lasketaan verteksien sijainneista.
function withTreeMeta(geo) {
  if (geo.userData.tree) return geo;
  geo.computeBoundingBox();
  const p = geo.attributes.position;
  const h = geo.boundingBox.max.y;
  const ring = (y0, y1) => {
    let sx = 0, sz = 0, n = 0;
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i);
      if (y >= y0 && y <= y1) { sx += p.getX(i); sz += p.getZ(i); n++; }
    }
    const cx = n ? sx / n : 0, cz = n ? sz / n : 0;
    const d = [];
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i);
      if (y >= y0 && y <= y1) d.push(Math.hypot(p.getX(i) - cx, p.getZ(i) - cz));
    }
    d.sort((a, b) => a - b);
    return { cx, cz, r: d.length ? d[Math.floor(d.length * 0.7)] : 0.15 };
  };
  const b = ring(0.2, 0.9), t = ring(h * 0.42, h * 0.58);
  const r0 = Math.min(0.5, Math.max(0.08, b.r));
  geo.userData.tree = {
    kind: 'deadTree', base: [b.cx, 0, b.cz], top: [t.cx, h * 0.5, t.cz], r0, r1: Math.min(r0, Math.max(0.05, t.r)),
    cutY: 0.55, height: h, fallLen: Math.max(1, h - 0.55), logR: r0,
  };
  return geo;
}

const VARIANTS = {
  acacia: [makeAcacia, 4, 1],
  jungle: [makeJungleTree, 3, 11],
  palm: [makePalm, 3, 21],
  baobab: [makeBaobab, 2, 2],
  bush: [makeBush, 4, 3],
  // Sessio 24: saniainen Quaterniuksen kitistä (ennen proseduraalinen makeFern).
  fern: kit(['Fern_1', 'Plant_1_Big'], 31),
  stick: [makeGroundStick, 3, 4],
  stone: [makeStone, 3, 5],
  // Sessio 23: skannatut Namaqualand-lohkareet (Poly Haven, CC0).
  boulder: [(s, q) => scannedBoulder(Math.round((s - 6) / 101), q), SCANNED_BOULDER_COUNT, 6],
  termite: [makeTermiteMound, 2, 7],
  grass: [(s) => makeGrassTuft(s, 'dry'), 3, 8],
  grassGreen: [(s) => makeGrassTuft(s, 'green'), 3, 41],
  canopy: [makeCanopyTree, 4, 51],
  // Sessio 24: harmaantuneet kuolleet puut kitistä (ennen makeDeadTree).
  // Sessio 27: lahopuu kaatuu kuten muut puut (rungon tiedot mallin muodosta).
  deadTree: [(s, q) => withTreeMeta(kitModel(['DeadTree_1', 'DeadTree_2', 'DeadTree_3'][Math.round((s - 61) / 101)], q)), 3, 61],
  // Sessio 49: käyttäjän tuoma bambu (Sketchfab, CC-BY-4.0; ennen makeBamboo).
  bamboo: kit(['Bamboo_A'], 71),
  thicket: [makeThicket, 3, 81],
  euphorbia: [makeEuphorbia, 2, 91],
  outcrop: [makeOutcrop, 3, 111],
  spire: [makeSpire, 3, 121],
  reeds: [makeReeds, 2, 131],
  // Sessio 24: sademetsän aluskasvit kitistä (ennen makeUndergrowth).
  undergrowth: kit(['Plant_1_Big', 'Plant_1', 'Fern_1'], 141, true),
  shea: [makeSheaTree, 3, 151],
  doum: [makeDoumPalm, 3, 161],
  coconut: [makeCoconutPalm, 3, 171],
  log: [(s) => makeLog(s, false), 2, 181],
  mossyLog: [(s) => makeLog(s, true), 2, 191],
  // Sessio 49: käyttäjän tuoma banaanipuu, 0–2 sivuversoa (ennen makeBanana).
  banana: kit(['Banana_A', 'Banana_B', 'Banana_C'], 201),
  desertShrub: [makeDesertShrub, 3, 211],
  driftwood: [makeDriftwood, 3, 221],
  tallGrass: [makeTallGrass, 3, 231],
  flowers: [makeFlowers, 4, 241],
  lilies: [makeLilies, 3, 261],
  seaweed: [makeSeaweed, 2, 271],
  bones: [makeBones, 2, 281],
  scree: [makeScree, 3, 291],
  // Sessio 9: poimittavat
  flint: [makeFlintGround, 3, 401],
  shell: [makeShellGround, 6, 411], // sessio 26: enemmän muunnelmia
  feather: [makeFeatherGround, 2, 421],
  coconutGround: [makeCoconutGround, 2, 431],
  baobabFruit: [makeBaobabFruitGround, 2, 441],
  sheaNuts: [makeSheaNutsGround, 1, 451],
  jujubeBush: [makeJujubeBush, 3, 461],
  moringa: [makeMoringa, 2, 471],
  hibiscus: [makeHibiscus, 3, 481],
  reedClump: [makeReedClump, 2, 491],
  fonio: [makeFonio, 2, 501],
  clayLump: [makeClayLump, 2, 511],
  mushBrown: [(s) => makeMushPatch('brown', s), 2, 521],
  mushPale: [(s) => makeMushPatch('pale', s), 2, 531],
  mushRed: [(s) => makeMushPatch('red', s), 2, 541],
  mushTermite: [(s) => makeMushPatch('termite', s), 2, 551],
  // Sessio 10: sademetsän vesilammikot
  puddle: [makePuddle, 4, 601],
  // Sessio 24: kerroksellinen maanpeite (Quaternius, CC0)
  groundFern: kit(['Fern_1'], 701, true),
  forestPlant: kit(['Clover_1', 'Plant_1', 'Plant_1_Big', 'Clover_2'], 711, true),
  kitMushrooms: kit(['Mushroom_Common', 'Mushroom_Common', 'Mushroom_Laetiporus'], 721, true),
  mossStone: kit(['Rock_Medium_1', 'Rock_Medium_2', 'Rock_Medium_3'], 731),
  wildFlowers: kit(['Flower_3_Group', 'Flower_4_Group'], 741, true),
  // Sessio 24: ympäristön tarinankerronta
  ancientPillar: [makeAncientPillar, 4, 761],
  rustyShield: [makeRustyShield, 3, 771],
  ancientRoots: [makeAncientRoots, 3, 781],
  twigs: [makeTwigs, 3, 791],
  // Sessio 25: rannat ja merenpohja
  kelp: [makeKelp, 3, 801],
  seabedRocks: [makeSeabedRocks, 3, 811],
  shoreRocks: [makeShoreRocks, 3, 821],
  beachStones: [makeBeachStones, 4, 831],
  // Sessio 48: sademetsän jättiläispuu (ylin latvuskerros), trooppiset
  // aluskasvit (Poly Haven, CC0) ja taimet (keskikerros).
  emergent: [makeEmergentTree, 3, 1001],
  tropicalPlant: kit(['Calathea_A', 'Calathea_B', 'Calathea_C', 'Fern2_A', 'Fern2_B', 'Fern2_C', 'Fern2_D'], 1101, true),
  sapling: [makeSapling, 4, 1201],
  // Sessio 49: käyttäjän tuoma bambupensas (kenttäkerros).
  bambooBush: kit(['BambooBush_A'], 1301),
};
// Mallit, joilla on kevyt kaukoversio (ilman varjoa).
const HAS_FAR = new Set(['emergent', 'bambooBush', 'bamboo', 'banana', 'acacia', 'jungle', 'palm', 'baobab', 'boulder', 'termite', 'canopy', 'deadTree', 'outcrop', 'spire', 'shea', 'doum', 'coconut', 'ancientPillar']);
// Mallit, joista tehdään tiheärunkoinen versio hakkaamista varten.
const HAS_HI = new Set(['emergent', 'acacia', 'jungle', 'palm', 'canopy', 'shea', 'doum', 'coconut', 'baobab']);

// Sessio 56: Blenderillä tehdyt puut (treeAssets.js) korvaavat nämä
// proseduraaliset puut, jos ne latautuivat. Kaukomalli on mukana, ja
// hakattava malli on sama kuin lähimalli (rungossa on tiheät renkaat).
const ASSET_TREES = ['acacia', 'shea', 'baobab', 'canopy', 'jungle', 'emergent', 'sapling'];

function seedsFor(model) {
  const [, n, base] = VARIANTS[model];
  return Array.from({ length: n }, (_, i) => base + i * 101);
}

export function createModelLibrary() {
  const near = {};
  const far = {};
  for (const [model, [fn]] of Object.entries(VARIANTS)) {
    const seeds = seedsFor(model);
    // Sessio 23: kaikille UV (lehtiatlasta käyttävä kasvillisuusmateriaali).
    near[model] = seeds.map((s) => ensureUv(fn(s, 1)));
    far[model] = HAS_FAR.has(model) ? seeds.map((s) => ensureUv(fn(s, 0))) : null;
  }
  const assetTrees = new Set();
  for (const model of ASSET_TREES) {
    const n = treeVariantCount(model);
    if (!n || !VARIANTS[model]) continue;
    near[model] = Array.from({ length: n }, (_, v) => treeAsset(model, v, 'near'));
    far[model] = Array.from({ length: n }, (_, v) => treeAsset(model, v, 'far') || near[model][v]);
    assetTrees.add(model);
  }
  const hiCache = {};
  return {
    world: near,
    far,
    // Hakattava versio luodaan vasta tarvittaessa.
    hi(model, variant) {
      if (assetTrees.has(model) || !HAS_HI.has(model)) return near[model][variant];
      const key = `${model}:${variant}`;
      if (!hiCache[key]) hiCache[key] = ensureUv(VARIANTS[model][0](seedsFor(model)[variant], 2));
      return hiCache[key];
    },
    tumbleweed: makeTumbleweed(42),
    campfire: makeCampfireBase(3),
    items: createItemModels(),
    build: createBuildModels(),
  };
}
