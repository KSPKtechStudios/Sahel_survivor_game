// Maailman esinetyypit: missä niitä kasvaa, miltä ne näyttävät ja mitä niistä
// saa. Tiheys = keskimääräinen määrä per 64x64 m chunk kussakin biomissa.
// Biomien lisäksi tiheyden voi antaa muodostumille: rock = graniittikallio,
// mesa = pöytävuori.
// Tätä tiedostoa käyttää myös generointisäie (worker), joten ei importteja.
//
// kind:  tree = kaatuu ja pilkotaan, rock = säröilee ja murskautuu,
//        bush = rytisee ja hajoaa, pickup = poimitaan [E], static = ei hakattava
// drawDist: kuinka monen chunkin päähän esine piirretään.
// HUOM: tiheydet, saaliit ja kestävyydet ovat prototyypin paikkamerkkejä.

export const OBJECT_TYPES = {
  acacia: {
    name: 'Akasia', model: 'acacia', kind: 'tree', material: 'vegetation', castShadow: true,
    density: { savanna: 2.2, woodland: 11, mare: 4, laterite: 0.6, dunes: 0.25, desert: 0.04, mountains: 0.5, oasis: 1 },
    scale: [0.85, 1.25], maxSlope: 0.45, collider: 0.3, hit: { y: 1.2, r: 0.6 }, drawDist: 99,
    harvest: { tool: 'axe', hp: 5, needMsg: 'Tarvitset kirveen' },
    log: { name: 'Kaatunut akasia', hp: 4, drops: [['wood', 3], ['stick', 2]] },
  },
  jungle: {
    name: 'Kapokkipuu', model: 'jungle', kind: 'tree', material: 'vegetation', castShadow: true,
    density: { rainforest: 5, mare: 0.15 },
    scale: [1.0, 1.55], maxSlope: 0.55, collider: 0.6, hit: { y: 1.5, r: 0.85 }, drawDist: 99,
    harvest: { tool: 'axe', hp: 8, needMsg: 'Tarvitset kirveen' },
    log: { name: 'Kaatunut kapokkipuu', hp: 6, drops: [['wood', 5], ['stick', 3]] },
  },
  canopy: {
    name: 'Sademetsäpuu', model: 'canopy', kind: 'tree', material: 'vegetation', castShadow: true,
    density: { rainforest: 32, oasis: 0.5 },
    scale: [0.85, 1.3], maxSlope: 0.6, collider: 0.38, hit: { y: 1.3, r: 0.6 }, drawDist: 99,
    harvest: { tool: 'axe', hp: 6, needMsg: 'Tarvitset kirveen' },
    log: { name: 'Kaatunut sademetsäpuu', hp: 4, drops: [['wood', 4], ['stick', 2]] },
  },
  palm: {
    name: 'Palmu', model: 'palm', kind: 'tree', material: 'vegetation', castShadow: true,
    density: { rainforest: 4, mare: 0.8, savanna: 0.05, oasis: 14 },
    scale: [0.85, 1.2], maxSlope: 0.5, collider: 0.24, hit: { y: 1.2, r: 0.45 }, drawDist: 99,
    harvest: { tool: 'axe', hp: 4, needMsg: 'Tarvitset kirveen' },
    log: { name: 'Kaatunut palmu', hp: 3, drops: [['wood', 2], ['fiber', 3]] },
  },
  shea: {
    name: 'Karitepuu', model: 'shea', kind: 'tree', material: 'vegetation', castShadow: true,
    density: { savanna: 1.0, woodland: 2.6, mare: 0.6, laterite: 0.3 },
    scale: [0.85, 1.2], maxSlope: 0.45, collider: 0.34, hit: { y: 1.2, r: 0.65 }, drawDist: 99,
    harvest: { tool: 'axe', hp: 6, needMsg: 'Tarvitset kirveen' },
    log: { name: 'Kaatunut karitepuu', hp: 4, drops: [['wood', 4], ['stick', 2]] },
  },
  doum: {
    name: 'Doumpalmu', model: 'doum', kind: 'tree', material: 'vegetation', castShadow: true,
    density: { mare: 2.4, oasis: 3, savanna: 0.25, woodland: 0.4, dunes: 0.12 },
    scale: [0.85, 1.2], maxSlope: 0.45, collider: 0.26, hit: { y: 1.2, r: 0.5 }, drawDist: 99,
    harvest: { tool: 'axe', hp: 5, needMsg: 'Tarvitset kirveen' },
    log: { name: 'Kaatunut doumpalmu', hp: 3, drops: [['wood', 2], ['fiber', 3]] },
  },
  coconut: {
    name: 'Kookospalmu', model: 'coconut', kind: 'tree', material: 'vegetation', castShadow: true,
    density: { beach: 7 },
    scale: [0.85, 1.15], maxSlope: 0.5, collider: 0.24, hit: { y: 1.2, r: 0.45 }, drawDist: 99,
    harvest: { tool: 'axe', hp: 4, needMsg: 'Tarvitset kirveen' },
    log: { name: 'Kaatunut kookospalmu', hp: 3, drops: [['wood', 2], ['fiber', 3]] },
  },
  baobab: {
    name: 'Baobab', model: 'baobab', kind: 'static', material: 'vegetation', castShadow: true,
    density: { savanna: 0.14, woodland: 0.25, mare: 0.4, laterite: 0.05 },
    scale: [0.85, 1.15], maxSlope: 0.35, collider: 1.75, hit: { y: 2.0, r: 2.0 }, drawDist: 99,
    harvest: { tool: 'never', needMsg: 'Liian suuri kaadettavaksi' },
  },
  deadTree: {
    name: 'Kuollut puu', model: 'deadTree', kind: 'bush', material: 'solid', castShadow: true,
    density: { desert: 0.5, dunes: 0.35, savanna: 0.15, mountains: 0.35, laterite: 0.2 },
    scale: [0.8, 1.3], maxSlope: 0.5, collider: 0.22, hit: { y: 1.0, r: 0.6 }, drawDist: 99,
    harvest: { tool: 'axe', hp: 3, drops: [['wood', 2], ['stick', 2]], needMsg: 'Tarvitset kirveen' },
  },
  bush: {
    name: 'Kuivunut pensas', model: 'bush', kind: 'bush', material: 'bush', castShadow: false,
    density: { savanna: 6, woodland: 7, mare: 4, laterite: 3, dunes: 1.6, desert: 0.7, mountains: 2.5 },
    scale: [0.8, 1.3], maxSlope: 0.6, collider: 0, hit: { y: 0.5, r: 0.75 }, drawDist: 3,
    harvest: { tool: null, hp: 3, drops: [['stick', 2], ['fiber', 1]] },
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
    harvest: { tool: null, hp: 4, drops: [['stick', 4]] },
  },
  log: {
    name: 'Lahopuu', model: 'log', kind: 'bush', material: 'solid', castShadow: false,
    density: { savanna: 0.45, woodland: 1.2, mare: 0.3, laterite: 0.15 },
    scale: [0.9, 1.2], maxSlope: 0.4, collider: 0, hit: { y: 0.3, r: 1.0 }, drawDist: 4,
    harvest: { tool: 'axe', hp: 3, drops: [['wood', 2], ['stick', 1]], needMsg: 'Tarvitset kirveen' },
  },
  mossyLog: {
    name: 'Sammaloitunut runko', model: 'mossyLog', kind: 'bush', material: 'solid', castShadow: false,
    density: { rainforest: 2.4 },
    scale: [0.9, 1.3], maxSlope: 0.5, collider: 0, hit: { y: 0.3, r: 1.0 }, drawDist: 3,
    harvest: { tool: 'axe', hp: 3, drops: [['wood', 2], ['fiber', 1]], needMsg: 'Tarvitset kirveen' },
  },
  banana: {
    name: 'Villibanaani', model: 'banana', kind: 'bush', material: 'bush', castShadow: false,
    density: { rainforest: 6, oasis: 1.5, mare: 0.3, beach: 0.5 },
    scale: [0.85, 1.3], maxSlope: 0.6, collider: 0.25, hit: { y: 1.0, r: 0.9 }, drawDist: 3,
    harvest: { tool: null, hp: 3, drops: [['fiber', 3]] },
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
    scale: [0.8, 1.3], maxSlope: 0.7, collider: 0.35, hit: null, drawDist: 4,
  },
  stick: {
    name: 'Risu', model: 'stick', kind: 'pickup', material: 'solid', castShadow: false,
    density: { savanna: 7, woodland: 14, mare: 4, laterite: 2, dunes: 1, desert: 0.3, rainforest: 10, mountains: 1.5, oasis: 3 },
    scale: [0.9, 1.1], maxSlope: 0.6, collider: 0, hit: { y: 0.05, r: 0.42 }, drawDist: 2,
    pickup: { item: 'stick', count: 1 },
  },
  stone: {
    name: 'Kivi', model: 'stone', kind: 'pickup', material: 'solid', castShadow: false,
    density: { savanna: 5, woodland: 3, mare: 2, laterite: 16, dunes: 0.6, desert: 2.5, rainforest: 3, mountains: 14, oasis: 1 },
    scale: [0.85, 1.25], maxSlope: 0.8, collider: 0, hit: { y: 0.08, r: 0.32 }, drawDist: 2,
    pickup: { item: 'stone', count: 1 },
  },
  driftwood: {
    name: 'Ajopuu', model: 'driftwood', kind: 'pickup', material: 'solid', castShadow: false,
    density: { beach: 5 },
    scale: [0.9, 1.2], maxSlope: 0.6, collider: 0, hit: { y: 0.08, r: 0.55 }, drawDist: 2,
    pickup: { item: 'wood', count: 1 },
  },
  boulder: {
    name: 'Lohkare', model: 'boulder', kind: 'rock', material: 'solid', castShadow: true,
    density: { savanna: 0.9, woodland: 0.6, mare: 0.4, laterite: 5, dunes: 0.3, desert: 0.9, rainforest: 0.8, mountains: 10, beach: 0.6, rock: 22, mesa: 5 },
    scale: [0.7, 1.6], maxSlope: 1, collider: 1.05, hit: { y: 0.5, r: 1.25 }, drawDist: 99,
    harvest: { tool: 'pickaxe', hp: 4, drops: [['stone', 4]], needMsg: 'Tarvitset hakun' },
  },
  outcrop: {
    name: 'Kalliomuodostelma', model: 'outcrop', kind: 'static', material: 'solid', castShadow: true,
    density: { desert: 0.8, mountains: 1.2, laterite: 0.35 },
    scale: [0.8, 1.6], maxSlope: 1, collider: 1.7, hit: null, drawDist: 99,
  },
  spire: {
    name: 'Kalliotorni', model: 'spire', kind: 'static', material: 'solid', castShadow: true,
    density: { mountains: 1.5 },
    scale: [0.8, 1.5], maxSlope: 1, collider: 1.5, hit: null, drawDist: 99,
  },
  termite: {
    name: 'Termiittikeko', model: 'termite', kind: 'static', material: 'solid', castShadow: true,
    density: { savanna: 1.2, woodland: 1.6, mare: 0.3, laterite: 0.8, rainforest: 0.15 },
    scale: [0.8, 1.3], maxSlope: 0.4, collider: 0.75, hit: null, drawDist: 99,
  },
  // --- Koristeet (vain lähimmissä chunkeissa, ei vuorovaikutusta)
  grass: {
    name: 'Ruoho', model: 'grass', kind: 'decor', material: 'grass', castShadow: false, decorative: true,
    density: { savanna: 170, woodland: 120, mare: 230, laterite: 45, dunes: 16, desert: 5, mountains: 25 },
    scale: [0.7, 1.4], maxSlope: 0.6, collider: 0, hit: null,
  },
  grassGreen: {
    name: 'Ruoho', model: 'grassGreen', kind: 'decor', material: 'grass', castShadow: false, decorative: true,
    density: { rainforest: 150, mare: 25, oasis: 130, beach: 25 },
    scale: [0.8, 1.5], maxSlope: 0.7, collider: 0, hit: null,
  },
  undergrowth: {
    name: 'Aluskasvillisuus', model: 'undergrowth', kind: 'decor', material: 'bush', castShadow: false, decorative: true,
    density: { rainforest: 85, oasis: 15 },
    scale: [0.8, 1.6], maxSlope: 0.8, collider: 0, hit: null,
  },
  tallGrass: {
    name: 'Heinikko', model: 'tallGrass', kind: 'decor', material: 'grass', castShadow: false, decorative: true,
    density: { savanna: 35, woodland: 45, mare: 40, laterite: 10 },
    scale: [0.8, 1.3], maxSlope: 0.6, collider: 0, hit: null,
  },
  flowers: {
    name: 'Kukat', model: 'flowers', kind: 'decor', material: 'grass', castShadow: false, decorative: true,
    density: { rainforest: 18, oasis: 25, mare: 14, savanna: 3, mountains: 4 },
    scale: [0.8, 1.3], maxSlope: 0.6, collider: 0, hit: null,
  },
  mushrooms: {
    name: 'Sienet', model: 'mushrooms', kind: 'decor', material: 'solid', castShadow: false, decorative: true,
    density: { rainforest: 16 },
    scale: [0.8, 1.6], maxSlope: 0.7, collider: 0, hit: null,
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
    name: 'Luut', model: 'bones', kind: 'decor', material: 'solid', castShadow: false, decorative: true,
    density: { desert: 0.8, dunes: 0.5 },
    scale: [0.9, 1.2], maxSlope: 0.4, collider: 0, hit: null,
  },
  scree: {
    name: 'Kivikko', model: 'scree', kind: 'decor', material: 'solid', castShadow: false, decorative: true,
    density: { mountains: 30, rock: 25, mesa: 20, beach: 4 },
    scale: [0.8, 1.6], maxSlope: 1, collider: 0, hit: null,
  },
  reeds: {
    name: 'Ruoko', model: 'reeds', kind: 'decor', material: 'grass', castShadow: false, decorative: true,
    density: { mare: 140, oasis: 150, rainforest: 60, savanna: 30, woodland: 30, mountains: 25 },
    scale: [0.8, 1.3], maxSlope: 0.9, collider: 0, hit: null,
    nearWater: true, // vain vesirajassa (myös jokien ja järvien rannoilla)
  },
};

export const OBJECT_TYPE_KEYS = Object.keys(OBJECT_TYPES);
export const DECOR_TYPES = OBJECT_TYPE_KEYS.filter((k) => OBJECT_TYPES[k].decorative);
