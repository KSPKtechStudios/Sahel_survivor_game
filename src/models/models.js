// Mallikirjasto: kokoaa proseduraaliset mallit yhteen.
//
// Väliaikaisia malleja: jokainen malli on BufferGeometry (position, normal,
// color). Kun grafiikkaa jalostetaan, nämä voi korvata glTF-malleilla samoilla
// nimillä (ks. docs/DECISIONS.md).
import { makeAcacia, makeBaobab, makeJungleTree, makePalm, makeCanopyTree, makeDeadTree } from './trees.js';
import { makeBush, makeFern, makeTumbleweed, makeGrassTuft, makeBamboo, makeThicket, makeEuphorbia, makeReeds, makeUndergrowth } from './plants.js';
import { makeGroundStick, makeStone, makeTermiteMound, makeOutcrop, makeSpire } from './rocks.js';
import { scannedBoulder, SCANNED_BOULDER_COUNT } from './scanned/build.js';
import { ensureUv } from './util.js';
import { makeCampfireBase, createItemModels } from './items.js';
import { createBuildModels } from './building.js';
import {
  makeSheaTree, makeDoumPalm, makeLog, makeBanana, makeDesertShrub, makeCoconutPalm, makeDriftwood,
  makeTallGrass, makeFlowers, makeLilies, makeSeaweed, makeBones, makeScree, makePuddle,
} from './flora.js';
import {
  makeFlintGround, makeShellGround, makeFeatherGround, makeCoconutGround, makeBaobabFruitGround, makeSheaNutsGround,
  makeMushPatch, makeJujubeBush, makeMoringa, makeHibiscus, makeReedClump, makeFonio, makeClayLump,
} from './pickups.js';

const VARIANTS = {
  acacia: [makeAcacia, 4, 1],
  jungle: [makeJungleTree, 3, 11],
  palm: [makePalm, 3, 21],
  baobab: [makeBaobab, 2, 2],
  bush: [makeBush, 4, 3],
  fern: [makeFern, 3, 31],
  stick: [makeGroundStick, 3, 4],
  stone: [makeStone, 3, 5],
  // Sessio 23: skannatut Namaqualand-lohkareet (Poly Haven, CC0).
  boulder: [(s, q) => scannedBoulder(Math.round((s - 6) / 101), q), SCANNED_BOULDER_COUNT, 6],
  termite: [makeTermiteMound, 2, 7],
  grass: [(s) => makeGrassTuft(s, 'dry'), 3, 8],
  grassGreen: [(s) => makeGrassTuft(s, 'green'), 3, 41],
  canopy: [makeCanopyTree, 4, 51],
  deadTree: [makeDeadTree, 3, 61],
  bamboo: [makeBamboo, 2, 71],
  thicket: [makeThicket, 3, 81],
  euphorbia: [makeEuphorbia, 2, 91],
  outcrop: [makeOutcrop, 3, 111],
  spire: [makeSpire, 3, 121],
  reeds: [makeReeds, 2, 131],
  undergrowth: [makeUndergrowth, 3, 141],
  shea: [makeSheaTree, 3, 151],
  doum: [makeDoumPalm, 3, 161],
  coconut: [makeCoconutPalm, 3, 171],
  log: [(s) => makeLog(s, false), 2, 181],
  mossyLog: [(s) => makeLog(s, true), 2, 191],
  banana: [makeBanana, 3, 201],
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
  shell: [makeShellGround, 2, 411],
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
};
// Mallit, joilla on kevyt kaukoversio (ilman varjoa).
const HAS_FAR = new Set(['acacia', 'jungle', 'palm', 'baobab', 'boulder', 'termite', 'canopy', 'deadTree', 'outcrop', 'spire', 'shea', 'doum', 'coconut']);
// Mallit, joista tehdään tiheärunkoinen versio hakkaamista varten.
const HAS_HI = new Set(['acacia', 'jungle', 'palm', 'canopy', 'shea', 'doum', 'coconut', 'baobab']);

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
  const hiCache = {};
  return {
    world: near,
    far,
    // Hakattava versio luodaan vasta tarvittaessa.
    hi(model, variant) {
      if (!HAS_HI.has(model)) return near[model][variant];
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
