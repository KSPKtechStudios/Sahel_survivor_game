// Maailman esinetyypit: missä niitä kasvaa, miltä ne näyttävät ja mitä niistä
// saa. Tiheys = keskimääräinen määrä per 64x64 m chunk kussakin biomissa.
// Biomien lisäksi tiheyden voi antaa muodostumille: rock = graniittikallio,
// mesa = pöytävuori.
// Tätä tiedostoa käyttää myös generointisäie (worker), joten ei importteja.
//
// kind:  tree = kaatuu ja pilkotaan, rock = säröilee ja murskautuu,
//        bush = rytisee ja hajoaa, pickup = poimitaan [E], static = ei hakattava
// drawDist: kuinka monen chunkin päähän esine piirretään.
// Sessio 22: harvest.minTier = kirveen / hakun vähimmäistaso (1 kivi, 2 piikivi,
// 3 kupari, 4 rauta), peel = baobabin kuorinta ennen kaatamista, noChain = ei
// kaadu toisen puun ketjureaktiossa, stumpR = kannon törmäyssäde.
// surface (sessio 23) = pintatekstuuri: 'rock' | 'wood' | 'earth' (materials.js).
// HUOM: tiheydet, saaliit ja kestävyydet ovat prototyypin paikkamerkkejä.

export const OBJECT_TYPES = {
  acacia: {
    name: 'Akasia', model: 'acacia', kind: 'tree', material: 'vegetation', castShadow: true,
    density: { savanna: 2.2, woodland: 11, mare: 4, laterite: 0.6, dunes: 0.25, desert: 0.04, mountains: 0.5, oasis: 1 },
    scale: [0.85, 1.25], maxSlope: 0.45, collider: 0.3, hit: { y: 1.2, r: 0.6 }, drawDist: 99,
    harvest: { tool: 'axe', hp: 5, needMsg: 'Tarvitset kirveen' },
    log: { name: 'Kaatunut akasia', hp: 4, drops: [['wood', 3], ['stick', 2], ['gum', 1]] },
  },
  jungle: {
    name: 'Kapokkipuu', model: 'jungle', kind: 'tree', material: 'vegetation', castShadow: true,
    density: { rainforest: 5, mare: 0.15 },
    scale: [1.0, 1.55], maxSlope: 0.55, collider: 0.6, hit: { y: 1.5, r: 0.85 }, drawDist: 99,
    harvest: { tool: 'axe', hp: 10, minTier: 3, needMsg: 'Tarvitset kirveen' }, noChain: true,
    log: { name: 'Kaatunut kapokkipuu', hp: 7, drops: [['heartwood', 3], ['wood', 3], ['stick', 2]] },
  },
  canopy: {
    name: 'Sademetsäpuu', model: 'canopy', kind: 'tree', material: 'vegetation', castShadow: true,
    density: { rainforest: 32, oasis: 0.5 },
    scale: [0.85, 1.3], maxSlope: 0.6, collider: 0.38, hit: { y: 1.3, r: 0.6 }, drawDist: 99,
    harvest: { tool: 'axe', hp: 6, minTier: 2, needMsg: 'Tarvitset kirveen' },
    log: { name: 'Kaatunut sademetsäpuu', hp: 4, drops: [['hardwood', 3], ['wood', 1], ['stick', 2]] },
  },
  palm: {
    name: 'Palmu', model: 'palm', kind: 'tree', material: 'vegetation', castShadow: true,
    density: { rainforest: 4, mare: 0.8, savanna: 0.05, oasis: 14 },
    scale: [0.85, 1.2], maxSlope: 0.5, collider: 0.24, hit: { y: 1.2, r: 0.45 }, drawDist: 99,
    harvest: { tool: 'axe', hp: 4, needMsg: 'Tarvitset kirveen' },
    log: { name: 'Kaatunut palmu', hp: 3, drops: [['wood', 2], ['palm_leaf', 3]] },
  },
  shea: {
    name: 'Karitepuu', model: 'shea', kind: 'tree', material: 'vegetation', castShadow: true,
    density: { savanna: 1.0, woodland: 2.6, mare: 0.6, laterite: 0.3 },
    scale: [0.85, 1.2], maxSlope: 0.45, collider: 0.34, hit: { y: 1.2, r: 0.65 }, drawDist: 99,
    harvest: { tool: 'axe', hp: 6, needMsg: 'Tarvitset kirveen' },
    log: { name: 'Kaatunut karitepuu', hp: 4, drops: [['wood', 4], ['stick', 2], ['shea_nuts', 3]] },
  },
  doum: {
    name: 'Doumpalmu', model: 'doum', kind: 'tree', material: 'vegetation', castShadow: true,
    density: { mare: 2.4, oasis: 3, savanna: 0.25, woodland: 0.4, dunes: 0.12 },
    scale: [0.85, 1.2], maxSlope: 0.45, collider: 0.26, hit: { y: 1.2, r: 0.5 }, drawDist: 99,
    harvest: { tool: 'axe', hp: 5, needMsg: 'Tarvitset kirveen' },
    log: { name: 'Kaatunut doumpalmu', hp: 3, drops: [['wood', 2], ['palm_leaf', 3]] },
  },
  coconut: {
    name: 'Kookospalmu', model: 'coconut', kind: 'tree', material: 'vegetation', castShadow: true,
    density: { beach: 7 },
    scale: [0.85, 1.15], maxSlope: 0.5, collider: 0.24, hit: { y: 1.2, r: 0.45 }, drawDist: 99,
    harvest: { tool: 'axe', hp: 4, needMsg: 'Tarvitset kirveen' },
    log: { name: 'Kaatunut kookospalmu', hp: 3, drops: [['wood', 2], ['palm_leaf', 2], ['coconut', 2]] },
  },
  // Sessio 22: baobab kuoritaan ensin (ulkopuusta tavallista puuta), ja vasta
  // sitten rungon ytimen voi kaataa rautakirveellä (ydinpuuta).
  baobab: {
    name: 'Baobab', model: 'baobab', kind: 'tree', material: 'vegetation', castShadow: true,
    density: { savanna: 0.14, woodland: 0.25, mare: 0.4, laterite: 0.05 },
    scale: [0.85, 1.15], maxSlope: 0.35, collider: 1.75, hit: { y: 2.0, r: 2.0 }, drawDist: 99,
    harvest: { tool: 'axe', hp: 16, minTier: 4, peel: { hp: 12, item: 'wood' }, needMsg: 'Tarvitset kirveen' },
    noChain: true, stumpR: 1.3,
    log: { name: 'Kaadettu baobab', hp: 12, drops: [['heartwood', 6], ['wood', 3], ['baobab_fruit', 2]] },
  },
  deadTree: {
    name: 'Kuollut puu', model: 'deadTree', kind: 'bush', material: 'solid', surface: 'wood', castShadow: true,
    density: { desert: 0.5, dunes: 0.35, savanna: 0.15, mountains: 0.35, laterite: 0.2 },
    scale: [0.8, 1.3], maxSlope: 0.5, collider: 0.22, hit: { y: 1.0, r: 0.6 }, drawDist: 99,
    harvest: { tool: 'axe', hp: 3, drops: [['wood', 2], ['stick', 2]], needMsg: 'Tarvitset kirveen' },
  },
  bush: {
    name: 'Kuivunut pensas', model: 'bush', kind: 'bush', material: 'bush', castShadow: false,
    density: { savanna: 6, woodland: 7, mare: 4, laterite: 3, dunes: 1.6, desert: 0.7, mountains: 2.5 },
    scale: [0.8, 1.3], maxSlope: 0.6, collider: 0, hit: { y: 0.5, r: 0.75 }, drawDist: 3,
    harvest: { tool: null, hp: 3, drops: [['stick', 2], ['fiber', 1], ['wood', 1]] },
  },
  thicket: {
    name: 'Tiheikkö', model: 'thicket', kind: 'bush', material: 'bush', castShadow: false,
    density: { rainforest: 20, oasis: 2 },
    scale: [0.9, 1.5], maxSlope: 0.7, collider: 0.6, hit: { y: 0.7, r: 0.95 }, drawDist: 3,
    harvest: { tool: null, hp: 3, drops: [['fiber', 2], ['stick', 1]] },
  },
  bamboo: {
    name: 'Bambu', model: 'bamboo', kind: 'bush', material: 'tall', castShadow: true,
    density: { rainforest: 5, mare: 0.4 },
    scale: [0.9, 1.3], maxSlope: 0.6, collider: 0.55, hit: { y: 1.0, r: 0.8 }, drawDist: 3,
    harvest: { tool: null, hp: 4, drops: [['bamboo', 3], ['stick', 1]] },
  },
  log: {
    name: 'Lahopuu', model: 'log', kind: 'bush', material: 'solid', surface: 'wood', castShadow: false,
    density: { savanna: 0.45, woodland: 1.2, mare: 0.3, laterite: 0.15 },
    scale: [0.9, 1.2], maxSlope: 0.4, collider: 0, hit: { y: 0.3, r: 1.0 }, drawDist: 4,
    harvest: { tool: 'axe', hp: 3, drops: [['wood', 2], ['stick', 1]], needMsg: 'Tarvitset kirveen' },
  },
  mossyLog: {
    name: 'Sammaloitunut runko', model: 'mossyLog', kind: 'bush', material: 'solid', surface: 'wood', castShadow: false,
    density: { rainforest: 2.4 },
    scale: [0.9, 1.3], maxSlope: 0.5, collider: 0, hit: { y: 0.3, r: 1.0 }, drawDist: 3,
    harvest: { tool: 'axe', hp: 3, drops: [['wood', 2], ['fiber', 1]], needMsg: 'Tarvitset kirveen' },
  },
  banana: {
    name: 'Villibanaani', model: 'banana', kind: 'bush', material: 'bush', castShadow: false,
    density: { rainforest: 6, oasis: 1.5, mare: 0.3, beach: 0.5 },
    scale: [0.85, 1.3], maxSlope: 0.6, collider: 0.25, hit: { y: 1.0, r: 0.9 }, drawDist: 3,
    harvest: { tool: null, hp: 3, drops: [['banana', 2], ['fiber', 2]] },
  },
  desertShrub: {
    name: 'Aavikkopensas', model: 'desertShrub', kind: 'bush', material: 'bush', castShadow: false,
    density: { desert: 1.6, dunes: 1.0, laterite: 0.4, mountains: 0.6, mesa: 1.5 },
    scale: [0.8, 1.3], maxSlope: 0.6, collider: 0, hit: { y: 0.5, r: 0.7 }, drawDist: 3,
    harvest: { tool: null, hp: 2, drops: [['fiber', 2], ['stick', 1]] },
  },
  fern: {
    name: 'Saniainen', model: 'fern', kind: 'bush', material: 'bush', castShadow: false,
    density: { rainforest: 40, mare: 0.8, oasis: 3 },
    scale: [0.8, 1.6], maxSlope: 0.8, collider: 0, hit: { y: 0.4, r: 0.7 }, drawDist: 2,
    harvest: { tool: null, hp: 2, drops: [['fiber', 2], ['stick', 1]] },
  },
  euphorbia: {
    name: 'Kandelaaberipuu', model: 'euphorbia', kind: 'static', material: 'solid', castShadow: true,
    density: { mountains: 2.2, laterite: 0.4, desert: 0.1 },
    scale: [0.8, 1.3], maxSlope: 0.7, collider: 0.35, hit: { y: 1.2, r: 0.5 } /* sessio 20: nimilappu */, drawDist: 4,
  },
  stick: {
    name: 'Risu', model: 'stick', kind: 'pickup', material: 'solid', surface: 'wood', castShadow: false,
    density: { savanna: 7, woodland: 14, mare: 4, laterite: 2, dunes: 1, desert: 0.3, rainforest: 10, mountains: 1.5, oasis: 3 },
    scale: [0.9, 1.1], maxSlope: 0.6, collider: 0, hit: { y: 0.05, r: 0.42 }, drawDist: 2,
    pickup: { item: 'stick', count: 1 },
  },
  stone: {
    name: 'Kivi', model: 'stone', kind: 'pickup', material: 'solid', surface: 'rock', castShadow: false,
    density: { savanna: 5, woodland: 3, mare: 2, laterite: 16, dunes: 0.6, desert: 2.5, rainforest: 3, mountains: 14, oasis: 1 },
    scale: [0.85, 1.25], maxSlope: 0.8, collider: 0, hit: { y: 0.08, r: 0.32 }, drawDist: 2,
    pickup: { item: 'stone', count: 1 },
  },
  driftwood: {
    name: 'Ajopuu', model: 'driftwood', kind: 'pickup', material: 'solid', surface: 'wood', castShadow: false,
    density: { beach: 5 },
    scale: [0.9, 1.2], maxSlope: 0.6, collider: 0, hit: { y: 0.08, r: 0.55 }, drawDist: 2,
    pickup: { item: 'wood', count: 1 },
  },
  boulder: {
    name: 'Lohkare', model: 'boulder', kind: 'rock', material: 'solid', surface: 'rock', castShadow: true,
    density: { savanna: 0.9, woodland: 0.6, mare: 0.4, laterite: 5, dunes: 0.3, desert: 0.9, rainforest: 0.8, mountains: 10, beach: 0.6, rock: 22, mesa: 5 },
    scale: [0.7, 1.6], maxSlope: 1, collider: 1.05, hit: { y: 0.5, r: 1.25 }, drawDist: 99,
    harvest: { tool: 'pickaxe', hp: 4, drops: [['stone', 4]], needMsg: 'Liian kovaa!' },
  },
  outcrop: {
    name: 'Kalliomuodostelma', model: 'outcrop', kind: 'static', material: 'solid', surface: 'rock', castShadow: true,
    density: { desert: 0.8, mountains: 1.2, laterite: 0.35 },
    scale: [0.8, 1.6], maxSlope: 1, collider: 1.7, hit: { y: 1.1, r: 1.8 } /* sessio 20: nimilappu */, drawDist: 99,
  },
  spire: {
    name: 'Kalliotorni', model: 'spire', kind: 'static', material: 'solid', surface: 'rock', castShadow: true,
    density: { mountains: 1.5 },
    scale: [0.8, 1.5], maxSlope: 1, collider: 1.5, hit: { y: 1.8, r: 1.5 } /* sessio 20: nimilappu */, drawDist: 99,
  },
  termite: {
    name: 'Termiittikeko', model: 'termite', kind: 'static', material: 'solid', surface: 'earth', castShadow: true,
    density: { savanna: 1.2, woodland: 1.6, mare: 0.3, laterite: 0.8, rainforest: 0.15 },
    scale: [0.8, 1.3], maxSlope: 0.4, collider: 0.75, hit: { y: 0.9, r: 0.85 } /* sessio 20: nimilappu */, drawDist: 99,
  },
  // --- Koristeet (vain lähimmissä chunkeissa, ei vuorovaikutusta)
  // Sessio 24: ruohotupsut (grass, grassGreen, tallGrass) korvattiin tiheällä
  // ruohokentällä (world/groundCover.js + render/grassField.js). Tyypit
  // jäävät listaan (retired), jotta muiden esineiden siemenet eivät muutu.
  grass: {
    name: 'Ruoho', model: 'grass', kind: 'decor', material: 'grass', castShadow: false, decorative: true, retired: true,
    density: { savanna: 170, woodland: 120, mare: 230, laterite: 45, dunes: 16, desert: 5, mountains: 25 },
    scale: [0.7, 1.4], maxSlope: 0.6, collider: 0, hit: null,
  },
  grassGreen: {
    name: 'Ruoho', model: 'grassGreen', kind: 'decor', material: 'grass', castShadow: false, decorative: true, retired: true,
    density: { rainforest: 150, mare: 25, oasis: 130, beach: 25 },
    scale: [0.8, 1.5], maxSlope: 0.7, collider: 0, hit: null,
  },
  undergrowth: {
    name: 'Aluskasvillisuus', model: 'undergrowth', kind: 'decor', material: 'bush', castShadow: false, decorative: true,
    density: { rainforest: 85, oasis: 15 },
    scale: [0.8, 1.6], maxSlope: 0.8, collider: 0, hit: null,
  },
  tallGrass: {
    name: 'Heinikko', model: 'tallGrass', kind: 'decor', material: 'grass', castShadow: false, decorative: true, retired: true,
    density: { savanna: 35, woodland: 45, mare: 40, laterite: 10 },
    scale: [0.8, 1.3], maxSlope: 0.6, collider: 0, hit: null,
  },
  // Sessio 22: terälehdet poistettiin, joten kukat ovat pelkkää koristetta
  // (kind pysyy ennallaan, jotta sijainnit eivät muutu).
  flowers: {
    name: 'Villikukkia', model: 'flowers', kind: 'pickup', material: 'grass', castShadow: false,
    density: { rainforest: 6, oasis: 8, mare: 5, savanna: 1.5, woodland: 1.2, mountains: 1.5 },
    scale: [0.8, 1.3], maxSlope: 0.6, collider: 0, hit: null, drawDist: 2,
  },
  lilies: {
    name: 'Lumpeet', model: 'lilies', kind: 'decor', material: 'solid', castShadow: false, decorative: true,
    density: { rainforest: 110, oasis: 90, mare: 60, mountains: 25 },
    scale: [0.8, 1.4], maxSlope: 1, collider: 0, hit: null,
    onWater: true, // kelluu järvien ja lampien pinnalla
  },
  seaweed: {
    name: 'Merilevä', model: 'seaweed', kind: 'decor', material: 'solid', castShadow: false, decorative: true,
    density: { beach: 60 },
    scale: [0.8, 1.3], maxSlope: 0.9, collider: 0, hit: null,
    nearWater: true,
  },
  bones: {
    name: 'Luuranko', model: 'bones', kind: 'pickup', material: 'solid', castShadow: false,
    density: { desert: 0.6, dunes: 0.4, savanna: 0.15, laterite: 0.15 },
    scale: [0.9, 1.2], maxSlope: 0.4, collider: 0, hit: { y: 0.15, r: 0.9 }, drawDist: 2,
    pickup: { drops: [['bone', 2, 4]] },
  },
  scree: {
    name: 'Kivikko', model: 'scree', kind: 'decor', material: 'solid', surface: 'rock', castShadow: false, decorative: true,
    density: { mountains: 30, rock: 25, mesa: 20, beach: 4 },
    scale: [0.8, 1.6], maxSlope: 1, collider: 0, hit: null,
  },
  reeds: {
    name: 'Ruoko', model: 'reeds', kind: 'decor', material: 'grass', castShadow: false, decorative: true,
    density: { mare: 230, oasis: 240, rainforest: 100, savanna: 60, woodland: 60, mountains: 40, beach: 20 },
    scale: [0.8, 1.5], maxSlope: 0.9, collider: 0, hit: null,
    nearWater: true, // vain vesirajassa (myös jokien ja järvien rannoilla); sessio 25: tiheämmin
  },
  // --- Sessio 9: poimittavat [E]. Uudet tyypit lisätään loppuun, jotta
  // vanhojen esineiden sijainnit (siemenet) eivät muutu.
  flintStone: {
    name: 'Piikivi', model: 'flint', kind: 'pickup', material: 'solid', castShadow: false,
    density: { laterite: 3, mountains: 2.5, desert: 1.2, savanna: 0.6, woodland: 0.6, mare: 0.3, beach: 0.4, rock: 3, mesa: 2 },
    scale: [0.9, 1.15], maxSlope: 0.8, collider: 0, hit: { y: 0.06, r: 0.3 }, drawDist: 2,
    pickup: { drops: [['flint', 1, 2]] },
  },
  // Sessio 22: simpukankuoret ovat koristetta (esine poistettiin).
  seashellPick: {
    name: 'Simpukankuoria', model: 'shell', kind: 'pickup', material: 'solid', castShadow: false,
    density: { beach: 4 },
    scale: [0.9, 1.2], maxSlope: 0.8, collider: 0, hit: null, drawDist: 2,
  },
  featherPick: {
    name: 'Sulka', model: 'feather', kind: 'pickup', material: 'solid', castShadow: false,
    density: { savanna: 0.6, woodland: 1.0, mare: 0.8, rainforest: 0.6, oasis: 0.6 },
    scale: [0.9, 1.1], maxSlope: 0.7, collider: 0, hit: { y: 0.04, r: 0.3 }, drawDist: 2,
    pickup: { drops: [['feather', 1, 2]] },
  },
  coconutPick: {
    name: 'Kookospähkinä', model: 'coconutGround', kind: 'pickup', material: 'solid', castShadow: false,
    density: { beach: 2.5 },
    scale: [0.95, 1.1], maxSlope: 0.7, collider: 0, hit: { y: 0.1, r: 0.32 }, drawDist: 2,
    pickup: { drops: [['coconut', 1, 2]] },
  },
  baobabFruitPick: {
    name: 'Apinanleipä', model: 'baobabFruit', kind: 'pickup', material: 'solid', castShadow: false,
    density: { savanna: 0.25, woodland: 0.35, mare: 0.4 },
    scale: [0.95, 1.1], maxSlope: 0.6, collider: 0, hit: { y: 0.08, r: 0.32 }, drawDist: 2,
    pickup: { drops: [['baobab_fruit', 1, 2]] },
  },
  sheaNutsPick: {
    name: 'Karitepähkinöitä', model: 'sheaNuts', kind: 'pickup', material: 'solid', castShadow: false,
    density: { woodland: 1.2, savanna: 0.5, mare: 0.3 },
    scale: [0.95, 1.1], maxSlope: 0.6, collider: 0, hit: { y: 0.04, r: 0.28 }, drawDist: 2,
    pickup: { drops: [['shea_nuts', 2, 4]] },
  },
  jujubeBush: {
    name: 'Jujubapensas', model: 'jujubeBush', kind: 'pickup', material: 'bush', castShadow: false,
    density: { savanna: 0.8, woodland: 1.0, laterite: 0.5, mare: 0.6 },
    scale: [0.85, 1.2], maxSlope: 0.6, collider: 0, hit: { y: 0.5, r: 0.6 }, drawDist: 3,
    pickup: { drops: [['jujube', 3, 5], ['stick', 0, 1]] },
  },
  moringaPlant: {
    name: 'Moringa', model: 'moringa', kind: 'pickup', material: 'bush', castShadow: false,
    density: { woodland: 0.6, mare: 0.8, savanna: 0.3, oasis: 1.5 },
    scale: [0.85, 1.2], maxSlope: 0.6, collider: 0, hit: { y: 0.6, r: 0.5 }, drawDist: 3,
    pickup: { drops: [['moringa', 2, 3]] },
  },
  hibiscusPlant: {
    name: 'Hibiskus', model: 'hibiscus', kind: 'pickup', material: 'bush', castShadow: false,
    density: { mare: 1.2, oasis: 2, rainforest: 1, savanna: 0.3, woodland: 0.4 },
    scale: [0.85, 1.2], maxSlope: 0.6, collider: 0, hit: { y: 0.4, r: 0.5 }, drawDist: 3,
    pickup: { drops: [['hibiscus', 2, 4]] },
  },
  reedClump: {
    name: 'Ruokotupas', model: 'reedClump', kind: 'pickup', material: 'grass', castShadow: false,
    density: { mare: 4, oasis: 4, rainforest: 2, savanna: 1, woodland: 1, mountains: 1 },
    scale: [0.85, 1.2], maxSlope: 0.8, collider: 0, hit: { y: 0.6, r: 0.45 }, drawDist: 3,
    nearWater: true,
    pickup: { drops: [['reed', 3, 5]] },
  },
  fonioTuft: {
    name: 'Villifonio', model: 'fonio', kind: 'pickup', material: 'grass', castShadow: false,
    density: { savanna: 1.5, woodland: 1, laterite: 0.6, mare: 0.6 },
    scale: [0.85, 1.2], maxSlope: 0.6, collider: 0, hit: { y: 0.3, r: 0.4 }, drawDist: 2,
    pickup: { drops: [['fonio', 2, 4]] },
  },
  clayLump: {
    name: 'Savikokkare', model: 'clayLump', kind: 'pickup', material: 'solid', surface: 'earth', castShadow: false,
    density: { mare: 1.5, rainforest: 0.8, savanna: 0.5, woodland: 0.5, oasis: 1 },
    scale: [0.85, 1.2], maxSlope: 0.7, collider: 0, hit: { y: 0.08, r: 0.45 }, drawDist: 2,
    nearWater: true,
    pickup: { drops: [['clay', 2, 3]] },
  },
  mushBrown: {
    name: 'Ruskeita sieniä', model: 'mushBrown', kind: 'pickup', material: 'solid', castShadow: false,
    density: { rainforest: 4, mare: 0.8, woodland: 0.5, oasis: 1 },
    scale: [0.85, 1.2], maxSlope: 0.7, collider: 0, hit: { y: 0.08, r: 0.32 }, drawDist: 2,
    pickup: { drops: [['mushroom_brown', 1, 3]] },
  },
  mushPale: {
    name: 'Kalpeita sieniä', model: 'mushPale', kind: 'pickup', material: 'solid', castShadow: false,
    density: { rainforest: 3, oasis: 0.8, mountains: 0.3 },
    scale: [0.85, 1.2], maxSlope: 0.7, collider: 0, hit: { y: 0.08, r: 0.32 }, drawDist: 2,
    pickup: { drops: [['mushroom_pale', 1, 3]] },
  },
  mushRed: {
    name: 'Punahattuja', model: 'mushRed', kind: 'pickup', material: 'solid', castShadow: false,
    density: { rainforest: 2, mountains: 0.5, woodland: 0.2 },
    scale: [0.85, 1.2], maxSlope: 0.7, collider: 0, hit: { y: 0.08, r: 0.32 }, drawDist: 2,
    pickup: { drops: [['mushroom_red', 1, 2]] },
  },
  mushTermite: {
    name: 'Termiittisieniä', model: 'mushTermite', kind: 'pickup', material: 'solid', castShadow: false,
    density: { savanna: 0.5, woodland: 0.8, mare: 0.3 },
    scale: [0.85, 1.2], maxSlope: 0.7, collider: 0, hit: { y: 0.1, r: 0.32 }, drawDist: 2,
    pickup: { drops: [['mushroom_termite', 1, 3]] },
  },
  // Sessio 10: vesilammikot (koriste, vain tasaisella maalla). Sessio 11:
  // sademetsässä aina, savannilla ja metsiköissä vain sateen jälkeen
  // (kuivuvat vähitellen pois, ks. puddleWeight ja materials.js).
  puddle: {
    name: 'Lammikko', model: 'puddle', kind: 'decor', material: 'puddle', castShadow: false, decorative: true,
    density: { rainforest: 9, savanna: 2, woodland: 2, mare: 3 },
    scale: [0.7, 1.8], maxSlope: 0.12, slopeCheck: true, lift: 0.03, collider: 0, hit: null, puddleWeight: true,
  },
  // --- Sessio 24: kerroksellinen maanpeite (Quaternius-kitin mallit, CC0).
  // Lisätty loppuun, jotta vanhojen esineiden siemenet eivät muutu.
  groundFern: {
    name: 'Saniainen', model: 'groundFern', kind: 'decor', material: 'bush', castShadow: false, decorative: true,
    density: { rainforest: 110, oasis: 20, mare: 10, woodland: 3 },
    scale: [0.45, 1.0], maxSlope: 0.3, slopeCheck: true, collider: 0, hit: null, decorDist: 44,
  },
  forestPlant: {
    name: 'Aluskasvi', model: 'forestPlant', kind: 'decor', material: 'bush', castShadow: false, decorative: true,
    density: { rainforest: 160, oasis: 50, mare: 30, woodland: 8, savanna: 3 },
    scale: [0.6, 1.25], maxSlope: 0.3, slopeCheck: true, collider: 0, hit: null, decorDist: 44,
  },
  kitMushrooms: {
    name: 'Sieniä', model: 'kitMushrooms', kind: 'decor', material: 'solid', castShadow: false, decorative: true,
    density: { rainforest: 60, oasis: 6, mare: 4, woodland: 3 },
    scale: [0.6, 1.3], maxSlope: 0.25, slopeCheck: true, collider: 0, hit: null, decorDist: 44,
  },
  wildFlowers: {
    name: 'Villikukkia', model: 'wildFlowers', kind: 'decor', material: 'bush', castShadow: false, decorative: true,
    density: { mare: 30, oasis: 40, savanna: 8, woodland: 12, mountains: 10, rainforest: 6 },
    scale: [0.6, 1.1], maxSlope: 0.2, slopeCheck: true, collider: 0, hit: null, decorDist: 44,
  },
  // Pudonneet oksat ja risut maassa.
  twigs: {
    name: 'Risuja', model: 'twigs', kind: 'decor', material: 'solid', surface: 'wood', castShadow: false, decorative: true,
    density: { rainforest: 45, woodland: 30, savanna: 12, mare: 8, oasis: 12, mountains: 5, laterite: 4 },
    scale: [0.7, 1.3], maxSlope: 0.3, slopeCheck: true, collider: 0, hit: null, decorDist: 44,
  },
  // Sammaleiset muinaiset kivet: isoimmissa törmäys.
  mossStone: {
    name: 'Sammaloitunut kivi', model: 'mossStone', kind: 'static', material: 'solid', castShadow: true,
    density: { rainforest: 7, mountains: 5, oasis: 2, woodland: 1.2, mare: 1, savanna: 0.5 },
    scale: [0.25, 0.85], maxSlope: 0.7, collider: 0.5, hit: { y: 0.4, r: 0.8 }, drawDist: 4,
  },
  // Sessio 24: ympäristön tarinankerronta (vihjeitä menneestä).
  ancientPillar: {
    name: 'Muinainen pylväs', model: 'ancientPillar', kind: 'static', material: 'solid', surface: 'ancient', castShadow: true,
    density: { rainforest: 0.3, mountains: 0.22, woodland: 0.16, savanna: 0.12, oasis: 0.18, laterite: 0.12, desert: 0.1, mare: 0.08 },
    scale: [0.85, 1.25], maxSlope: 0.35, collider: 0.55, hit: { y: 1.0, r: 0.7 }, drawDist: 99,
  },
  rustyShield: {
    name: 'Ruostunut kilpi', model: 'rustyShield', kind: 'static', material: 'solid', surface: 'earth', castShadow: false,
    density: { savanna: 0.18, woodland: 0.18, laterite: 0.25, desert: 0.14, mountains: 0.14, rainforest: 0.12, mare: 0.1 },
    scale: [0.9, 1.1], maxSlope: 0.4, collider: 0, hit: { y: 0.1, r: 0.55 }, drawDist: 2,
  },
  // --- Sessio 25: rannat ja merenpohja (koristeita).
  kelp: {
    name: 'Levä', model: 'kelp', kind: 'decor', material: 'grass', castShadow: false, decorative: true,
    density: { ocean: 160, beach: 90, mare: 50, oasis: 50, rainforest: 50, savanna: 25, woodland: 25, mountains: 20, laterite: 15 },
    scale: [0.7, 1.4], maxSlope: 1, collider: 0, hit: null, seabed: [0.6, 9], decorDist: 44,
  },
  seabedRocks: {
    name: 'Pohjakiviä', model: 'seabedRocks', kind: 'decor', material: 'solid', surface: 'rock', castShadow: false, decorative: true,
    density: { ocean: 60, beach: 45, mare: 20, oasis: 20, rainforest: 20, savanna: 15, woodland: 15, mountains: 30, laterite: 15 },
    scale: [0.8, 1.6], maxSlope: 1, collider: 0, hit: null, seabed: [0.3, 12], decorDist: 44,
  },
  shoreRocks: {
    name: 'Rantakivikko', model: 'shoreRocks', kind: 'decor', material: 'solid', surface: 'rock', castShadow: false, decorative: true,
    density: { beach: 30, ocean: 20, mountains: 30, savanna: 10, woodland: 10, rainforest: 12, laterite: 14, oasis: 8, mare: 6 },
    scale: [0.8, 1.5], maxSlope: 1, collider: 0, hit: null, nearWater: true,
  },
  beachStones: {
    name: 'Rantakiviä', model: 'beachStones', kind: 'decor', material: 'solid', castShadow: false, decorative: true,
    density: { beach: 110, ocean: 50, oasis: 15, mare: 12, savanna: 8, woodland: 8, mountains: 10 },
    scale: [0.8, 1.3], maxSlope: 1, collider: 0, hit: null, nearWater: true, decorDist: 44,
  },
  ancientRoots: {
    name: 'Ikivanhat juuret', model: 'ancientRoots', kind: 'static', material: 'solid', surface: 'wood', castShadow: true,
    density: { rainforest: 3.5, oasis: 0.6, mare: 0.4, woodland: 0.3 },
    scale: [0.8, 1.4], maxSlope: 0.5, collider: 0, hit: { y: 0.3, r: 1.3 }, drawDist: 3,
  },
};

export const OBJECT_TYPE_KEYS = Object.keys(OBJECT_TYPES);
export const DECOR_TYPES = OBJECT_TYPE_KEYS.filter((k) => OBJECT_TYPES[k].decorative && !OBJECT_TYPES[k].retired);
