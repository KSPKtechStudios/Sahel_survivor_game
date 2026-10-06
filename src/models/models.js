// Mallikirjasto: kokoaa proseduraaliset mallit yhteen.
//
// Väliaikaisia malleja: jokainen malli on BufferGeometry (position, normal,
// color). Kun grafiikkaa jalostetaan, nämä voi korvata glTF-malleilla samoilla
// nimillä (ks. docs/DECISIONS.md).
import { makeAcacia, makeBaobab, makeJungleTree, makePalm } from './trees.js';
import { makeBush, makeFern, makeTumbleweed, makeGrassTuft } from './plants.js';
import { makeGroundStick, makeStone, makeBoulder, makeTermiteMound } from './rocks.js';
import { makeCampfireBase, createItemModels } from './items.js';

const VARIANTS = {
  acacia: [makeAcacia, 4, 1],
  jungle: [makeJungleTree, 3, 11],
  palm: [makePalm, 3, 21],
  baobab: [makeBaobab, 2, 2],
  bush: [makeBush, 4, 3],
  fern: [makeFern, 3, 31],
  stick: [makeGroundStick, 3, 4],
  stone: [makeStone, 3, 5],
  boulder: [makeBoulder, 3, 6],
  termite: [makeTermiteMound, 2, 7],
  grass: [(s) => makeGrassTuft(s, 'dry'), 3, 8],
  grassGreen: [(s) => makeGrassTuft(s, 'green'), 3, 41],
};
// Mallit, joilla on kevyt kaukoversio (ilman varjoa).
const HAS_FAR = new Set(['acacia', 'jungle', 'palm', 'baobab', 'boulder', 'termite']);
// Mallit, joista tehdään tiheärunkoinen versio hakkaamista varten.
const HAS_HI = new Set(['acacia', 'jungle', 'palm']);

function seedsFor(model) {
  const [, n, base] = VARIANTS[model];
  return Array.from({ length: n }, (_, i) => base + i * 101);
}

export function createModelLibrary() {
  const near = {};
  const far = {};
  for (const [model, [fn]] of Object.entries(VARIANTS)) {
    const seeds = seedsFor(model);
    near[model] = seeds.map((s) => fn(s, 1));
    far[model] = HAS_FAR.has(model) ? seeds.map((s) => fn(s, 0)) : null;
  }
  const hiCache = {};
  return {
    world: near,
    far,
    // Hakattava versio luodaan vasta tarvittaessa.
    hi(model, variant) {
      if (!HAS_HI.has(model)) return near[model][variant];
      const key = `${model}:${variant}`;
      if (!hiCache[key]) hiCache[key] = VARIANTS[model][0](seedsFor(model)[variant], 2);
      return hiCache[key];
    },
    tumbleweed: makeTumbleweed(42),
    campfire: makeCampfireBase(3),
    items: createItemModels(),
  };
}
