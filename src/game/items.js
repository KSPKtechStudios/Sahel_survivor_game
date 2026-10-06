// Esineet. tool = työkalun tyyppi (vaikuttaa siihen, mitä voi hakata),
// place = asetettava rakennelma, weapon = taisteluominaisuudet (ks. combat.js),
// shield = kilpi (pikapalkissa = vasemmassa kädessä), build = vasara
// (rakennusvalikko), light = valaisee kädessä, bow = jousi, ammo = nuoli.
// food = syötävä: hunger = ravinto, heal = terveys heti, regen = terveys
// vähitellen, poison = myrkytyksen todennäköisyys, cure = parantaa myrkytystä
// (osuus), stamina = kestävyys heti, effect = tilavaikutus (survival.js).
// cat = luokka (valmistusikkunan välilehdet), tags = ryhmät resepteille
// (esim. '#pelt' = mikä tahansa talja).
//
// HUOM: esineet, reseptit ja arvot ovat prototyypin paikkamerkkejä (ks. docs/DESIGN.md).

export const ITEMS = {
  // --- Materiaalit
  stick: { name: 'Risu', stack: 50, floats: true, cat: 'material', desc: 'Kuiva oksa. Perusmateriaali.' },
  stone: { name: 'Kivi', stack: 50, cat: 'material', desc: 'Käteen sopiva kivi.' },
  fiber: { name: 'Kuitu', stack: 50, floats: true, cat: 'material', desc: 'Kuivaa kortetta ja kuitua sitomiseen.' },
  wood: { name: 'Puu', stack: 30, floats: true, cat: 'material', desc: 'Halkaistua puuta.' },
  flint: { name: 'Piikivi', stack: 50, cat: 'material', desc: 'Lasimaisesti lohkeava kivi. Siitä saa teräviä teriä ja nuolenkärkiä. Löytyy kivikkoisilta paikoilta.' },
  bone: { name: 'Luu', stack: 30, cat: 'material', desc: 'Kuivunut luu. Kova ja kevyt: nuolenkärkiin ja jouseen.' },
  feather: { name: 'Sulka', stack: 50, floats: true, cat: 'material', desc: 'Linnun sulka nuolen ohjaimiksi.' },
  reed: { name: 'Ruoko', stack: 50, floats: true, cat: 'material', desc: 'Vesirajan ruokoa. Olkikattoihin.' },
  bamboo: { name: 'Bambunvarsi', stack: 30, floats: true, cat: 'material', desc: 'Kevyt ja luja varsi.' },
  palm_leaf: { name: 'Palmunlehti', stack: 30, floats: true, cat: 'material', desc: 'Iso palmunlehti katteeksi ja punontaan.' },
  gum: { name: 'Akasiankumi', stack: 30, cat: 'material', desc: 'Akasian rungosta valunutta kumia (arabikumi). Sitkeää liimaa ja hyvää soihtuun.' },
  rope: { name: 'Köysi', stack: 30, cat: 'material', desc: 'Kuidusta punottu köysi.' },
  clay: { name: 'Savi', stack: 50, cat: 'material', desc: 'Punaista lateriittisavea. Saviseiniin.' },
  seashell: { name: 'Simpukankuori', stack: 30, cat: 'material', desc: 'Rannalta löytynyt kuori.' },
  sinew: { name: 'Jänne', stack: 30, cat: 'material', desc: 'Kuivattu eläimen jänne. Vahva jousenjänne.' },
  hide: { name: 'Pahkasian talja', stack: 20, cat: 'material', tags: ['pelt'], desc: 'Karkea, harjaksinen talja.' },
  gazelle_pelt: { name: 'Gasellintalja', stack: 20, cat: 'material', tags: ['pelt'], desc: 'Pehmeä, vaalea talja.' },
  monkey_pelt: { name: 'Apinantalja', stack: 20, cat: 'material', tags: ['pelt'], desc: 'Harmaa, pitkäkarvainen talja.' },
  fox_pelt: { name: 'Aavikkoketun talja', stack: 20, cat: 'material', tags: ['pelt'], desc: 'Hiekanvärinen, pehmeä talja.' },
  leather: { name: 'Nahka', stack: 30, cat: 'material', desc: 'Parkittua nahkaa taljoista.' },
  shea_butter: { name: 'Karitevoi', stack: 20, cat: 'material', desc: 'Karitepähkinöistä keitetty voi. Voiteisiin.' },
  petals: { name: 'Terälehdet', stack: 50, floats: true, cat: 'material', desc: 'Villikukkien terälehtiä rohtoihin.' },

  // --- Ruoka (huono ruoka täyttää vähän; sienistä voi saada myrkytyksen)
  mushroom_brown: { name: 'Ruskea sieni', stack: 20, cat: 'food', tags: ['cookshroom'], food: { hunger: 5, poison: 0.15 }, desc: 'Tavallinen sieni. Laiha ateria, ja joskus myrkyllinen.' },
  mushroom_pale: { name: 'Kalpea sieni', stack: 20, cat: 'food', tags: ['cookshroom'], food: { hunger: 4, poison: 0.4 }, desc: 'Vaalea, hento sieni. Usein myrkyllinen.' },
  mushroom_red: { name: 'Punahattu', stack: 20, cat: 'food', food: { hunger: 3, poison: 0.85, poisonPower: 1.6 }, desc: 'Kirkkaanpunainen sieni. Kaunis mutta lähes aina myrkyllinen.' },
  mushroom_termite: { name: 'Termiittisieni', stack: 20, cat: 'food', tags: ['cookshroom'], food: { hunger: 8, poison: 0.05 }, desc: 'Termiittikekojen lähellä kasvava herkkusieni.' },
  roasted_mushroom: { name: 'Paahdettu sieni', stack: 20, cat: 'food', food: { hunger: 11, heal: 2, poison: 0.06 }, desc: 'Nuotiolla paahdettu. Turvallisempi, mutta ei kovin täyttävä.' },
  raw_meat: { name: 'Raaka liha', stack: 20, cat: 'food', food: { hunger: 8, poison: 0.3 }, desc: 'Raakana syötynä vatsa voi kääntyä. Paista nuotiolla.' },
  cooked_meat: { name: 'Paistettu liha', stack: 20, cat: 'food', food: { hunger: 35, heal: 15 }, desc: 'Täyttävä ateria.' },
  jujube: { name: 'Jujubanmarjat', stack: 30, cat: 'food', food: { hunger: 6 }, desc: 'Makeita, omenamaisia marjoja okaisesta pensaasta.' },
  banana: { name: 'Banaani', stack: 20, cat: 'food', food: { hunger: 14, heal: 2 }, desc: 'Villibanaani.' },
  coconut: { name: 'Kookospähkinä', stack: 20, cat: 'food', food: { hunger: 15, stamina: 30 }, desc: 'Kookosmaitoa ja hedelmälihaa. Virkistää.' },
  baobab_fruit: { name: 'Apinanleipä', stack: 20, cat: 'food', food: { hunger: 14, heal: 3 }, desc: 'Baobabin hedelmä. Hapan, jauhoinen ja ravitseva.' },
  shea_nuts: { name: 'Karitepähkinät', stack: 30, cat: 'food', food: { hunger: 3 }, desc: 'Karvaita raakoina. Paahda tai keitä voiksi.' },
  roasted_nuts: { name: 'Paahdetut pähkinät', stack: 30, cat: 'food', food: { hunger: 12 }, desc: 'Paahdettuja karitepähkinöitä.' },
  moringa: { name: 'Moringanlehdet', stack: 30, cat: 'food', food: { hunger: 4, heal: 4, cure: 0.5 }, desc: 'Ravinteikkaat lehdet. Lievittävät myrkytystä.' },
  hibiscus: { name: 'Bissap-kukat', stack: 30, cat: 'food', food: { hunger: 2 }, desc: 'Hibiskuksen punaiset verhiöt. Bissap-juoman aines.' },
  fonio: { name: 'Fonio', stack: 50, cat: 'food', food: { hunger: 2 }, desc: 'Villiä fonio-viljaa. Keitä puuroksi.' },
  fonio_porridge: { name: 'Fonio-puuro', stack: 10, cat: 'food', food: { hunger: 28, heal: 6 }, desc: 'Lämmin viljapuuro.' },
  meat_stew: { name: 'Lihapata', stack: 10, cat: 'food', food: { hunger: 60, heal: 30 }, desc: 'Lihaa, sieniä ja moringaa. Paras ateria.' },
  bissap: { name: 'Bissap-juoma', stack: 10, cat: 'food', food: { hunger: 6, effect: 'energized' }, desc: 'Hapan hibiskusjuoma. Virkistää: kestävyys palautuu nopeammin.' },

  // --- Lääkkeet
  herbal_remedy: { name: 'Yrttirohto', stack: 10, cat: 'medicine', food: { hunger: 0, heal: 10, cure: 1 }, desc: 'Parantaa myrkytyksen heti.' },
  shea_salve: { name: 'Karitevoide', stack: 10, cat: 'medicine', food: { hunger: 0, regen: 35 }, desc: 'Haavavoide: palauttaa terveyttä hetken aikaa.' },

  // --- Työkalut
  stone_knife: { name: 'Kivipuukko', stack: 1, tool: 'blade', weapon: 'knife', cat: 'tool', desc: 'Nopea, kevyt terä. Raivaa pensaita ja kelpaa aseeksi.' },
  stone_axe: { name: 'Kivikirves', stack: 1, tool: 'axe', damage: 1, weapon: 'axe', cat: 'tool', desc: 'Puiden kaatamiseen. Kelpaa myös aseeksi.' },
  stone_pick: { name: 'Kivihakku', stack: 1, tool: 'pickaxe', damage: 1, weapon: 'pick', cat: 'tool', desc: 'Lohkareiden louhimiseen.' },
  flint_axe: { name: 'Piikivikirves', stack: 1, tool: 'axe', damage: 2, weapon: 'axe', cat: 'tool', desc: 'Terävä piikiviterä kaataa puut kaksi kertaa nopeammin.' },
  flint_pick: { name: 'Piikivihakku', stack: 1, tool: 'pickaxe', damage: 2, weapon: 'pick', cat: 'tool', desc: 'Louhii lohkareet kaksi kertaa nopeammin.' },
  hammer: { name: 'Vasara', stack: 1, build: true, cat: 'tool', desc: 'Rakennustyökalu. [Hiiri 2] rakennusvalikko, [Hiiri 1] rakenna, [R] käännä, [X] pura. Rakennelmat (myös nuotio) vaativat lähelle työstöpenkin.' },
  torch: { name: 'Soihtu', stack: 5, light: true, cat: 'tool', desc: 'Valaisee pimeässä, kun se on kädessä.' },

  // --- Aseet ja nuolet
  wooden_club: { name: 'Puunuija', stack: 1, weapon: 'club', cat: 'weapon', desc: 'Raskas nuija: hidas mutta voimakas isku, joka tönäisee kauas.' },
  spear: { name: 'Keihäs', stack: 1, weapon: 'spear', cat: 'weapon', desc: 'Pitkä ulottuvuus ja piikivikärki.' },
  machete: { name: 'Viidakkoveitsi', stack: 1, tool: 'blade', weapon: 'machete', cat: 'weapon', desc: 'Nopea terä. Kolmen iskun sarja päättyy pistoon. Raivaa myös pensaita.' },
  shield: { name: 'Puukilpi', stack: 1, shield: true, cat: 'weapon', desc: 'Varusta kilpi vasempaan käteen (valitse se ja paina hiiren oikeaa, tai hiiren oikea repussa). Varustettuna [Hiiri 2] torjuu lähes kaiken.' },
  bow: { name: 'Jousi', stack: 1, bow: { power: 1, draw: 0.95 }, cat: 'weapon', desc: 'Pidä [Hiiri 1] pohjassa jännittääksesi ja päästä ampuaksesi. Tarvitsee nuolia repussa.' },
  sinew_bow: { name: 'Jännejousi', stack: 1, bow: { power: 1.35, draw: 0.85 }, cat: 'weapon', desc: 'Jänteellä jännitetty jousi. Ampuu kovempaa ja kauemmas.' },
  arrow_wood: { name: 'Puunuoli', stack: 50, floats: true, ammo: { dmg: 9, speed: 0.85 }, tags: ['arrow'], cat: 'weapon', desc: 'Teroitettu varsi ilman sulkia. Heikko ja epätarkka.' },
  arrow_bone: { name: 'Luunuoli', stack: 50, floats: true, ammo: { dmg: 14, speed: 1 }, tags: ['arrow'], cat: 'weapon', desc: 'Luukärki ja sulat.' },
  arrow_flint: { name: 'Piikivinuoli', stack: 50, floats: true, ammo: { dmg: 17, speed: 1 }, tags: ['arrow'], cat: 'weapon', desc: 'Terävä piikivikärki ja sulat.' },

  // --- Asetettavat (vanha nuotioesine: nykyään nuotio rakennetaan vasaralla)
  campfire: { name: 'Nuotio', stack: 5, place: 'campfire', cat: 'build', desc: 'Aseta hiiren oikealla. Vaatii lähelle työstöpenkin.' },

  // --- Arvoesineet (arkuista). Käyttötarkoitus on vielä avoin (esim. kauppa).
  gold_nugget: { name: 'Kultahippu', stack: 20, valuable: true, cat: 'valuable', desc: 'Arvokas kultahippu. Sahelin kulta on ollut haluttua vuosisatoja.' },
  cowrie: { name: 'Kaurikotilo', stack: 50, valuable: true, cat: 'valuable', desc: 'Kaurikotiloita käytettiin Länsi-Afrikassa rahana.' },
  bronze_bracelet: { name: 'Pronssirannerengas', stack: 5, valuable: true, cat: 'valuable', desc: 'Vanha, koristeellinen pronssikoru.' },
};

// Tunnisteet: '#pelt' = mikä tahansa talja jne.
export const TAG_NAMES = { pelt: 'Talja (mikä tahansa)', cookshroom: 'Syötävä sieni', arrow: 'Nuoli' };
export function tagged(tag) {
  return Object.keys(ITEMS).filter((id) => ITEMS[id].tags && ITEMS[id].tags.includes(tag));
}

// Valmistuspaikat: station = null (käsin), 'workbench' tai 'campfire'.
export const STATIONS = {
  workbench: { name: 'Työstöpenkki', range: 7 },
  campfire: { name: 'Nuotio', range: 4.5 },
};

export const CATEGORIES = [
  ['all', 'Kaikki'],
  ['tool', 'Työkalut'],
  ['weapon', 'Aseet'],
  ['food', 'Ruoka'],
  ['medicine', 'Rohdot'],
  ['material', 'Materiaalit'],
];

export const RECIPES = [
  // Käsin
  { id: 'rope', out: 'rope', count: 1, need: { fiber: 3 } },
  { id: 'stone_knife', out: 'stone_knife', count: 1, need: { stone: 1, stick: 1, fiber: 1 } },
  { id: 'stone_axe', out: 'stone_axe', count: 1, need: { stick: 3, stone: 2, fiber: 2 } },
  { id: 'stone_pick', out: 'stone_pick', count: 1, need: { stick: 3, stone: 3, fiber: 2 } },
  { id: 'hammer', out: 'hammer', count: 1, need: { stick: 2, stone: 2, fiber: 2 } },
  { id: 'torch', out: 'torch', count: 1, need: { stick: 1, fiber: 2, gum: 1 } },
  { id: 'wooden_club', out: 'wooden_club', count: 1, need: { wood: 2, fiber: 2 } },
  { id: 'arrow_wood', out: 'arrow_wood', count: 5, need: { stick: 3, fiber: 1 } },
  // Työstöpenkki
  { id: 'flint_axe', out: 'flint_axe', count: 1, need: { wood: 2, flint: 4, rope: 1 }, station: 'workbench' },
  { id: 'flint_pick', out: 'flint_pick', count: 1, need: { wood: 2, flint: 5, rope: 1 }, station: 'workbench' },
  { id: 'spear', out: 'spear', count: 1, need: { wood: 2, flint: 2, rope: 1 }, station: 'workbench' },
  { id: 'bow', out: 'bow', count: 1, need: { wood: 3, rope: 2, gum: 1 }, station: 'workbench' },
  { id: 'sinew_bow', out: 'sinew_bow', count: 1, need: { wood: 3, sinew: 3, gum: 2, bone: 2 }, station: 'workbench' },
  { id: 'arrow_flint', out: 'arrow_flint', count: 8, need: { stick: 4, flint: 2, feather: 4 }, station: 'workbench' },
  { id: 'arrow_bone', out: 'arrow_bone', count: 8, need: { stick: 4, bone: 2, feather: 4 }, station: 'workbench' },
  { id: 'shield', out: 'shield', count: 1, need: { wood: 4, stick: 4, fiber: 4 }, station: 'workbench' },
  { id: 'leather', out: 'leather', count: 2, need: { '#pelt': 1 }, station: 'workbench' },
  // Nuotio (ruoanlaitto ja rohdot)
  { id: 'cooked_meat', out: 'cooked_meat', count: 1, need: { raw_meat: 1 }, station: 'campfire' },
  { id: 'roasted_mushroom', out: 'roasted_mushroom', count: 1, need: { '#cookshroom': 1 }, station: 'campfire' },
  { id: 'roasted_nuts', out: 'roasted_nuts', count: 1, need: { shea_nuts: 3 }, station: 'campfire' },
  { id: 'fonio_porridge', out: 'fonio_porridge', count: 1, need: { fonio: 5 }, station: 'campfire' },
  { id: 'meat_stew', out: 'meat_stew', count: 1, need: { raw_meat: 2, '#cookshroom': 2, moringa: 1 }, station: 'campfire' },
  { id: 'bissap', out: 'bissap', count: 1, need: { hibiscus: 3, coconut: 1 }, station: 'campfire' },
  { id: 'shea_butter', out: 'shea_butter', count: 1, need: { shea_nuts: 4 }, station: 'campfire' },
  { id: 'herbal_remedy', out: 'herbal_remedy', count: 1, need: { moringa: 2, petals: 2, gum: 1 }, station: 'campfire' },
  { id: 'shea_salve', out: 'shea_salve', count: 1, need: { shea_butter: 1, moringa: 1, petals: 1 }, station: 'campfire' },
];
