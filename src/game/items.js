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
// Sessio 22: tasot (tier) 0 puu, 1 kivi, 2 piikivi, 3 kupari, 4 rauta,
// 5 rubiini. power = työkalun teho (hakkuu ja louhinta), wmul = aseena
// vahinkokerroin, mystic = rubiinin yliluonnollinen voima (combat.js).
// armor = { slot: 'head' | 'body' | 'legs', value }, shield = torjunnan arvot.
//
// HUOM: esineet, reseptit ja arvot ovat prototyypin paikkamerkkejä (ks. docs/DESIGN.md).

export const TIERS = ['Puu', 'Kivi', 'Piikivi', 'Kupari', 'Rauta', 'Rubiini'];

// Sessio 20: pinot: materiaalit ym. 50, ruoat ja juomat 20.
export const ITEMS = {
  // --- Materiaalit
  stick: { name: 'Risu', stack: 50, floats: true, cat: 'material', desc: 'Kuiva oksa. Perusmateriaali.' },
  stone: { name: 'Kivi', stack: 50, cat: 'material', desc: 'Käteen sopiva kivi.' },
  fiber: { name: 'Kuitu', stack: 50, floats: true, cat: 'material', desc: 'Kuivaa kortetta ja kuitua sitomiseen.' },
  wood: { name: 'Puu', stack: 50, floats: true, cat: 'material', desc: 'Tavallista puuta pensaista, akasioista ja muista puista. Perusmateriaali.' },
  hardwood: { name: 'Jalopuu', stack: 50, floats: true, cat: 'material', desc: 'Tiivistä, tummaa sademetsäpuuta. Kovempi ja sitkeämpi kuin tavallinen puu. Vaatii vähintään piikivikirveen.' },
  heartwood: { name: 'Ydinpuu', stack: 50, cat: 'material', desc: 'Baobabin ja kapokkipuun ytimestä: raskasta ja lähes kiven kovaa. Vaatii hyvän kirveen.' },
  copper_ingot: { name: 'Kupariharkko', stack: 50, cat: 'material', desc: 'Punertava, pehmeähkö metalli. Ensimmäiset metallityökalut.' },
  iron_ingot: { name: 'Rautaharkko', stack: 50, cat: 'material', desc: 'Kova ja painava metalli.' },
  ruby: { name: 'Rubiini', stack: 50, valuable: true, cat: 'material', desc: 'Syvänpunainen kivi, joka hehkuu heikosti pimeässä. Sen sanotaan sisältävän jotain elävää.' },
  iron_rings: { name: 'Rautarenkaat', stack: 50, cat: 'material', desc: 'Pieniä toisiinsa punottavia renkaita rengaspanssariin.' },
  flint: { name: 'Piikivi', stack: 50, cat: 'material', desc: 'Lasimaisesti lohkeava kivi. Siitä saa teräviä teriä ja nuolenkärkiä. Löytyy kivikkoisilta paikoilta.' },
  bone: { name: 'Luu', stack: 50, cat: 'material', desc: 'Kuivunut luu. Kova ja kevyt: nuolenkärkiin ja jouseen.' },
  feather: { name: 'Sulka', stack: 50, floats: true, cat: 'material', desc: 'Linnun sulka nuolen ohjaimiksi.' },
  reed: { name: 'Ruoko', stack: 50, floats: true, cat: 'material', desc: 'Vesirajan ruokoa. Olkikattoihin.' },
  bamboo: { name: 'Bambunvarsi', stack: 50, floats: true, cat: 'material', desc: 'Kevyt ja luja varsi.' },
  palm_leaf: { name: 'Palmunlehti', stack: 50, floats: true, cat: 'material', desc: 'Iso palmunlehti katteeksi ja punontaan.' },
  gum: { name: 'Akasiankumi', stack: 50, cat: 'material', desc: 'Akasian rungosta valunutta kumia (arabikumi). Sitkeää liimaa ja hyvää soihtuun.' },
  rope: { name: 'Köysi', stack: 50, cat: 'material', desc: 'Kuidusta punottu köysi.' },
  clay: { name: 'Savi', stack: 50, cat: 'material', desc: 'Punaista lateriittisavea. Saviseiniin.' },
  sinew: { name: 'Jänne', stack: 50, cat: 'material', desc: 'Kuivattu eläimen jänne. Vahva jousenjänne.' },
  hide: { name: 'Pahkasian talja', stack: 50, cat: 'material', tags: ['pelt'], desc: 'Karkea, harjaksinen talja.' },
  gazelle_pelt: { name: 'Gasellintalja', stack: 50, cat: 'material', tags: ['pelt'], desc: 'Pehmeä, vaalea talja.' },
  monkey_pelt: { name: 'Apinantalja', stack: 50, cat: 'material', tags: ['pelt'], desc: 'Harmaa, pitkäkarvainen talja.' },
  fox_pelt: { name: 'Aavikkoketun talja', stack: 50, cat: 'material', tags: ['pelt'], desc: 'Hiekanvärinen, pehmeä talja.' },
  leather: { name: 'Nahka', stack: 50, cat: 'material', desc: 'Parkittua nahkaa taljoista.' },
  shea_butter: { name: 'Karitevoi', stack: 50, cat: 'material', desc: 'Karitepähkinöistä keitetty voi. Voiteisiin.' },

  // --- Ruoka (huono ruoka täyttää vähän; sienistä voi saada myrkytyksen)
  mushroom_brown: { name: 'Ruskea sieni', stack: 20, cat: 'food', tags: ['cookshroom'], food: { hunger: 5, poison: 0.15 }, desc: 'Tavallinen sieni. Laiha ateria, ja joskus myrkyllinen.' },
  mushroom_pale: { name: 'Kalpea sieni', stack: 20, cat: 'food', tags: ['cookshroom'], food: { hunger: 4, poison: 0.4 }, desc: 'Vaalea, hento sieni. Usein myrkyllinen.' },
  mushroom_red: { name: 'Punahattu', stack: 20, cat: 'food', food: { hunger: 3, poison: 0.85, poisonPower: 1.6 }, desc: 'Kirkkaanpunainen sieni. Kaunis mutta lähes aina myrkyllinen.' },
  mushroom_termite: { name: 'Termiittisieni', stack: 20, cat: 'food', tags: ['cookshroom'], food: { hunger: 8, poison: 0.05 }, desc: 'Termiittikekojen lähellä kasvava herkkusieni.' },
  roasted_mushroom: { name: 'Paahdettu sieni', stack: 20, cat: 'food', food: { hunger: 11, heal: 2, poison: 0.06 }, desc: 'Nuotiolla paahdettu. Turvallisempi, mutta ei kovin täyttävä.' },
  raw_meat: { name: 'Raaka liha', stack: 20, cat: 'food', food: { hunger: 8, poison: 0.3 }, desc: 'Raakana syötynä vatsa voi kääntyä. Paista nuotiolla.' },
  cooked_meat: { name: 'Paistettu liha', stack: 20, cat: 'food', food: { hunger: 35, heal: 15 }, desc: 'Täyttävä ateria.' },
  jujube: { name: 'Jujubanmarjat', stack: 20, cat: 'food', food: { hunger: 6 }, desc: 'Makeita, omenamaisia marjoja okaisesta pensaasta.' },
  banana: { name: 'Banaani', stack: 20, cat: 'food', food: { hunger: 14, heal: 2 }, desc: 'Villibanaani.' },
  coconut: { name: 'Kookospähkinä', stack: 20, cat: 'food', food: { hunger: 15, stamina: 30 }, desc: 'Kookosmaitoa ja hedelmälihaa. Virkistää.' },
  baobab_fruit: { name: 'Apinanleipä', stack: 20, cat: 'food', food: { hunger: 14, heal: 3 }, desc: 'Baobabin hedelmä. Hapan, jauhoinen ja ravitseva.' },
  shea_nuts: { name: 'Karitepähkinät', stack: 20, cat: 'food', food: { hunger: 3 }, desc: 'Karvaita raakoina. Paahda tai keitä voiksi.' },
  roasted_nuts: { name: 'Paahdetut pähkinät', stack: 20, cat: 'food', food: { hunger: 12 }, desc: 'Paahdettuja karitepähkinöitä.' },
  moringa: { name: 'Moringanlehdet', stack: 20, cat: 'food', food: { hunger: 4, heal: 4, cure: 0.5 }, desc: 'Ravinteikkaat lehdet. Lievittävät myrkytystä.' },
  hibiscus: { name: 'Bissap-kukat', stack: 20, cat: 'food', food: { hunger: 2 }, desc: 'Hibiskuksen punaiset verhiöt. Bissap-juoman aines.' },
  fonio: { name: 'Fonio', stack: 20, cat: 'food', food: { hunger: 2 }, desc: 'Villiä fonio-viljaa. Keitä puuroksi.' },
  fonio_porridge: { name: 'Fonio-puuro', stack: 20, cat: 'food', food: { hunger: 28, heal: 6 }, desc: 'Lämmin viljapuuro.' },
  meat_stew: { name: 'Lihapata', stack: 20, cat: 'food', food: { hunger: 60, heal: 30 }, desc: 'Lihaa, sieniä ja moringaa. Paras ateria.' },
  bissap: { name: 'Bissap-juoma', stack: 20, cat: 'food', food: { hunger: 6, effect: 'energized' }, desc: 'Hapan hibiskusjuoma. Virkistää: kestävyys palautuu nopeammin.' },

  // --- Lääkkeet
  herbal_remedy: { name: 'Yrttirohto', stack: 20, cat: 'medicine', food: { hunger: 0, heal: 10, cure: 1 }, desc: 'Parantaa myrkytyksen heti.' },
  shea_salve: { name: 'Karitevoide', stack: 20, cat: 'medicine', food: { hunger: 0, regen: 35 }, desc: 'Haavavoide: palauttaa terveyttä hetken aikaa.' },

  // --- Työkalut (sessio 22: tasot). Kirves kaataa puita, hakku louhii kiviä.
  stone_axe: { name: 'Kivikirves', stack: 1, tool: 'axe', tier: 1, power: 1, weapon: 'axe', wmul: 1, cat: 'tool', desc: 'Puiden kaatamiseen. Kelpaa myös aseeksi.' },
  flint_axe: { name: 'Piikivikirves', stack: 1, tool: 'axe', tier: 2, power: 1.5, weapon: 'axe', wmul: 1.15, cat: 'tool', desc: 'Terävä piikiviterä. Kaataa myös sademetsän jalopuut.' },
  copper_axe: { name: 'Kuparikirves', stack: 1, tool: 'axe', tier: 3, power: 2, weapon: 'axe', wmul: 1.35, cat: 'tool', desc: 'Ensimmäinen metallikirves. Pystyy kapokkipuun ytimeen.' },
  iron_axe: { name: 'Rautakirves', stack: 1, tool: 'axe', tier: 4, power: 2.8, weapon: 'axe', wmul: 1.6, cat: 'tool', desc: 'Raskas rautakirves. Kaataa jopa baobabin ytimen.' },
  ruby_axe: { name: 'Rubiinikirves', stack: 1, tool: 'axe', tier: 5, power: 4, weapon: 'axe', wmul: 2, mystic: true, cat: 'tool', desc: 'Terä hehkuu sisältäpäin. Puu tuntuu antavan periksi ennen kuin terä osuu.' },
  stone_pick: { name: 'Kivihakku', stack: 1, tool: 'pickaxe', tier: 1, power: 1, weapon: 'pick', wmul: 1, cat: 'tool', desc: 'Lohkareiden louhimiseen.' },
  flint_pick: { name: 'Piikivihakku', stack: 1, tool: 'pickaxe', tier: 2, power: 1.5, weapon: 'pick', wmul: 1.15, cat: 'tool', desc: 'Louhii nopeammin kuin kivihakku.' },
  copper_pick: { name: 'Kuparihakku', stack: 1, tool: 'pickaxe', tier: 3, power: 2, weapon: 'pick', wmul: 1.35, cat: 'tool', desc: 'Metallinen hakku.' },
  iron_pick: { name: 'Rautahakku', stack: 1, tool: 'pickaxe', tier: 4, power: 2.8, weapon: 'pick', wmul: 1.6, cat: 'tool', desc: 'Kova rautahakku.' },
  ruby_pick: { name: 'Rubiinihakku', stack: 1, tool: 'pickaxe', tier: 5, power: 4, weapon: 'pick', wmul: 2, mystic: true, cat: 'tool', desc: 'Kivi halkeaa kuin se pelkäisi hakkua.' },
  hammer: { name: 'Vasara', stack: 1, build: true, cat: 'tool', desc: 'Rakennustyökalu. [Hiiri 2] rakennusvalikko, [Hiiri 1] rakenna, [R] käännä, [X] pura. Rakennelmat (myös nuotio) vaativat lähelle työstöpenkin.' },
  torch: { name: 'Soihtu', stack: 5, light: true, offhand: true, cat: 'tool', desc: 'Valaisee pimeässä, kun se on kädessä.' },

  // --- Terät: nopeita. Kaikilla tasoilla ei ole kaikkia aseita (sessio 22).
  stone_knife: { name: 'Kivipuukko', stack: 1, tool: 'blade', tier: 1, weapon: 'knife', wmul: 1, cat: 'weapon', desc: 'Nopea, kevyt terä. Raivaa pensaita ja kelpaa aseeksi.' },
  flint_dagger: { name: 'Piikivitikari', stack: 1, tool: 'blade', tier: 2, weapon: 'dagger', wmul: 1, cat: 'weapon', desc: 'Kaksi nopeaa viiltoa peräkkäin.' },
  copper_sword: { name: 'Kuparimiekka', stack: 1, tool: 'blade', tier: 3, weapon: 'sword', wmul: 1, cat: 'weapon', desc: 'Lyhyt, leveä miekka. Kolmen iskun sarja päättyy pistoon.' },
  machete: { name: 'Viidakkoveitsi', stack: 1, tool: 'blade', tier: 4, weapon: 'machete', wmul: 1, cat: 'weapon', desc: 'Nopea rautaterä. Kolmen iskun sarja päättyy pistoon. Raivaa myös pensaita.' },
  iron_sword: { name: 'Rautamiekka', stack: 1, tool: 'blade', tier: 4, weapon: 'sword', wmul: 1.3, cat: 'weapon', desc: 'Pitkä ja tasapainoinen miekka.' },
  ruby_sword: { name: 'Rubiiniterä', stack: 1, tool: 'blade', tier: 5, weapon: 'sword', wmul: 1.7, mystic: true, cat: 'weapon', desc: 'Kapea, punaisena hehkuva terä. Jokainen osuma palauttaa hiukan voimia.' },
  ruby_dagger: { name: 'Verikide', stack: 1, tool: 'blade', tier: 5, weapon: 'dagger', wmul: 1.9, mystic: true, cat: 'weapon', desc: 'Yhdestä rubiinista hiottu tikari. Se tuntuu lämpimältä kädessä.' },

  // --- Murskaavat: hitaita ja raskaita; hyppyisku (sessio 21).
  wooden_club: { name: 'Puunuija', stack: 1, tier: 0, weapon: 'club', wmul: 1, cat: 'weapon', desc: 'Raskas nuija: hidas mutta voimakas isku, joka tönäisee kauas.' },
  stone_mace: { name: 'Kivinuija', stack: 1, tier: 1, weapon: 'club', wmul: 1.2, cat: 'weapon', desc: 'Varren päähän sidottu kivi. Painavampi kuin puunuija.' },
  copper_sledge: { name: 'Kuparimoukari', stack: 1, tier: 3, weapon: 'sledge', wmul: 1, cat: 'weapon', desc: 'Valtava kaksikätinen moukari. Hyvin hidas, mutta isku kaataa melkein mitä vain.' },
  iron_mace: { name: 'Piikkinuija', stack: 1, tier: 4, weapon: 'club', wmul: 1.6, cat: 'weapon', desc: 'Rautanuppi täynnä piikkejä.' },

  // --- Keihäät: pitkä ulottuvuus.
  wooden_spear: { name: 'Seiväs', stack: 1, tier: 0, weapon: 'spear', wmul: 0.65, cat: 'weapon', desc: 'Tulessa karkaistu, teroitettu seiväs.' },
  spear: { name: 'Piikivikeihäs', stack: 1, tier: 2, weapon: 'spear', wmul: 1, cat: 'weapon', desc: 'Pitkä ulottuvuus ja piikivikärki.' },
  iron_spear: { name: 'Rautakeihäs', stack: 1, tier: 4, weapon: 'spear', wmul: 1.55, cat: 'weapon', desc: 'Pitkä rautakärki jalopuuvarressa.' },

  // --- Kilvet: reduce = torjuttu osuus, cost = kestävyys torjuttua vahinkoa kohti, parry = ikkuna (s).
  shield: { name: 'Puukilpi', stack: 1, tier: 0, shield: { reduce: 0.85, cost: 0.6, parry: 0.28 }, offhand: true, cat: 'weapon', desc: 'Varusta kilpi vasempaan käteen (valitse se ja paina hiiren oikeaa, tai hiiren oikea repussa). Varustettuna [Hiiri 2] torjuu lähes kaiken.' },
  hide_shield: { name: 'Nahkakilpi', stack: 1, tier: 1, shield: { reduce: 0.8, cost: 0.45, parry: 0.34 }, offhand: true, cat: 'weapon', desc: 'Kevyt nahalla päällystetty kilpi. Torjuu vähemmän, mutta täydellinen torjunta onnistuu helpommin.' },
  copper_shield: { name: 'Kuparikilpi', stack: 1, tier: 3, shield: { reduce: 0.92, cost: 0.5, parry: 0.28 }, offhand: true, cat: 'weapon', desc: 'Kuparilla helattu kilpi.' },
  iron_shield: { name: 'Rautakilpi', stack: 1, tier: 4, shield: { reduce: 0.97, cost: 0.42, parry: 0.26 }, offhand: true, cat: 'weapon', desc: 'Raskas rautakilpi. Lähes mikään ei mene läpi.' },

  // --- Jouset ja nuolet
  bow: { name: 'Lyhytjousi', stack: 1, tier: 0, bow: { power: 1, draw: 1.45 }, cat: 'weapon', desc: 'Pidä [Hiiri 1] pohjassa jännittääksesi ja päästä ampuaksesi. Tarvitsee nuolia repussa.' },
  sinew_bow: { name: 'Jännejousi', stack: 1, tier: 1, bow: { power: 1.3, draw: 1.3 }, cat: 'weapon', desc: 'Jänteellä vahvistettu jousi. Ampuu kovempaa ja kauemmas.' },
  hardwood_bow: { name: 'Jalopuujousi', stack: 1, tier: 2, bow: { power: 1.55, draw: 1.35 }, cat: 'weapon', desc: 'Jalopuusta veistetty pitkä jousi.' },
  heartwood_bow: { name: 'Ydinpuujousi', stack: 1, tier: 4, bow: { power: 1.9, draw: 1.5 }, cat: 'weapon', desc: 'Ydinpuun ja jänteen yhdistelmäjousi. Raskas jännittää, mutta nuoli lentää kuin salama.' },
  ruby_bow: { name: 'Rubiinijousi', stack: 1, tier: 5, mystic: true, bow: { power: 2.2, draw: 1.2 }, cat: 'weapon', desc: 'Jousen kahvassa sykkii rubiini. Jänne tuntuu kevyeltä, vaikka isku on kova.' },
  arrow_wood: { name: 'Puunuoli', stack: 50, floats: true, ammo: { dmg: 9, speed: 0.85 }, tags: ['arrow'], cat: 'weapon', desc: 'Teroitettu varsi ilman sulkia. Heikko ja epätarkka.' },
  arrow_bone: { name: 'Luunuoli', stack: 50, floats: true, ammo: { dmg: 14, speed: 1 }, tags: ['arrow'], cat: 'weapon', desc: 'Luukärki ja sulat.' },
  arrow_flint: { name: 'Piikivinuoli', stack: 50, floats: true, ammo: { dmg: 17, speed: 1 }, tags: ['arrow'], cat: 'weapon', desc: 'Terävä piikivikärki ja sulat.' },
  arrow_copper: { name: 'Kuparinuoli', stack: 50, floats: true, ammo: { dmg: 21, speed: 1.05 }, tags: ['arrow'], cat: 'weapon', desc: 'Kuparikärki läpäisee nahan helposti.' },
  arrow_iron: { name: 'Rautanuoli', stack: 50, floats: true, ammo: { dmg: 26, speed: 1.1 }, tags: ['arrow'], cat: 'weapon', desc: 'Raskas rautakärki.' },

  // --- Panssarit (sessio 22): pää, keho ja jalat. Kaikilla tasoilla ei ole kaikkia osia.
  rag_hood: { name: 'Riepuhuppu', stack: 1, tier: 0, armor: { slot: 'head', value: 1 }, cat: 'armor', desc: 'Taljanpaloista ommeltu huppu.' },
  rag_tunic: { name: 'Riepuviitta', stack: 1, tier: 0, armor: { slot: 'body', value: 2 }, cat: 'armor', desc: 'Karkeista taljoista sidottu viitta.' },
  rag_wraps: { name: 'Riepukääreet', stack: 1, tier: 0, armor: { slot: 'legs', value: 1 }, cat: 'armor', desc: 'Säärien ympärille kiedotut taljakaistaleet.' },
  leather_cap: { name: 'Nahkalakki', stack: 1, tier: 1, armor: { slot: 'head', value: 2 }, cat: 'armor', desc: 'Parkitusta nahasta tehty lakki.' },
  leather_vest: { name: 'Nahkaliivi', stack: 1, tier: 1, armor: { slot: 'body', value: 4 }, cat: 'armor', desc: 'Paksu, niitattu nahkaliivi.' },
  leather_pants: { name: 'Nahkahousut', stack: 1, tier: 1, armor: { slot: 'legs', value: 2 }, cat: 'armor', desc: 'Kestävät nahkahousut.' },
  bone_helm: { name: 'Luukypärä', stack: 1, tier: 2, armor: { slot: 'head', value: 3 }, cat: 'armor', desc: 'Luusta ja nahasta koottu kypärä. Pelottavan näköinen.' },
  copper_helm: { name: 'Kuparikypärä', stack: 1, tier: 3, armor: { slot: 'head', value: 4 }, cat: 'armor', desc: 'Taottu kuparikypärä.' },
  copper_scale: { name: 'Kuparisuomupaita', stack: 1, tier: 3, armor: { slot: 'body', value: 7 }, cat: 'armor', desc: 'Nahkapaita, jonka päällä on limittäin kuparisuomuja.' },
  chain_coif: { name: 'Rengashuppu', stack: 1, tier: 4, armor: { slot: 'head', value: 5 }, cat: 'armor', desc: 'Rautarenkaista punottu huppu.' },
  chainmail: { name: 'Rengaspaita', stack: 1, tier: 4, armor: { slot: 'body', value: 9 }, cat: 'armor', desc: 'Tuhansista rautarenkaista punottu paita.' },
  chain_legs: { name: 'Rengashousut', stack: 1, tier: 4, armor: { slot: 'legs', value: 5 }, cat: 'armor', desc: 'Rengaspanssaria jaloille.' },
  iron_helm: { name: 'Rautakypärä', stack: 1, tier: 4, armor: { slot: 'head', value: 6 }, cat: 'armor', desc: 'Umpinainen rautakypärä.' },
  iron_plate: { name: 'Rautahaarniska', stack: 1, tier: 4, armor: { slot: 'body', value: 12 }, cat: 'armor', desc: 'Raskas levyhaarniska.' },
  ruby_circlet: { name: 'Rubiiniotsaripa', stack: 1, tier: 5, mystic: true, armor: { slot: 'head', value: 5 }, cat: 'armor', desc: 'Kapea rautaripa ja rubiini otsalla. Haavat sulkeutuvat sitä kantaessa hitaasti itsestään.' },

  // --- Asetettavat (vanha nuotioesine: nykyään nuotio rakennetaan vasaralla)
  campfire: { name: 'Nuotio', stack: 5, place: 'campfire', cat: 'build', desc: 'Aseta hiiren oikealla. Vaatii lähelle työstöpenkin.' },

  // --- Arvoesineet (arkuista). Käyttötarkoitus on vielä avoin (esim. kauppa).
  gold_nugget: { name: 'Kultahippu', stack: 50, valuable: true, cat: 'valuable', desc: 'Arvokas kultahippu. Sahelin kulta on ollut haluttua vuosisatoja.' },
  cowrie: { name: 'Kaurikotilo', stack: 50, valuable: true, cat: 'valuable', desc: 'Kaurikotiloita käytettiin Länsi-Afrikassa rahana.' },
  // Sessio 20: kello löytyy vain arkuista; repussa se näyttää kellonajan.
  clock: { name: 'Kello', stack: 1, cat: 'valuable', desc: 'Vanha messinkinen taskukello. Kun se on repussa, kellotaulu näkyy kartan reunassa.' },
  bronze_bracelet: { name: 'Pronssirannerengas', stack: 50, valuable: true, cat: 'valuable', desc: 'Vanha, koristeellinen pronssikoru.' },
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
  ['armor', 'Panssarit'],
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
  { id: 'wooden_spear', out: 'wooden_spear', count: 1, need: { wood: 2, fiber: 1 } },
  { id: 'stone_mace', out: 'stone_mace', count: 1, need: { wood: 2, stone: 3, fiber: 3 } },
  { id: 'arrow_wood', out: 'arrow_wood', count: 5, need: { stick: 3, fiber: 1 } },
  { id: 'rag_hood', out: 'rag_hood', count: 1, need: { '#pelt': 1, fiber: 2 } },
  { id: 'rag_tunic', out: 'rag_tunic', count: 1, need: { '#pelt': 2, fiber: 3 } },
  { id: 'rag_wraps', out: 'rag_wraps', count: 1, need: { '#pelt': 1, fiber: 2 } },
  // Työstöpenkki: kivi ja piikivi, nahka, luu, puulajit
  { id: 'flint_axe', out: 'flint_axe', count: 1, need: { wood: 2, flint: 4, rope: 1 }, station: 'workbench' },
  { id: 'flint_pick', out: 'flint_pick', count: 1, need: { wood: 2, flint: 5, rope: 1 }, station: 'workbench' },
  { id: 'flint_dagger', out: 'flint_dagger', count: 1, need: { flint: 3, wood: 1, leather: 1 }, station: 'workbench' },
  { id: 'spear', out: 'spear', count: 1, need: { wood: 2, flint: 2, rope: 1 }, station: 'workbench' },
  { id: 'shield', out: 'shield', count: 1, need: { wood: 4, stick: 4, fiber: 4 }, station: 'workbench' },
  { id: 'hide_shield', out: 'hide_shield', count: 1, need: { wood: 3, leather: 3, rope: 1 }, station: 'workbench' },
  { id: 'bow', out: 'bow', count: 1, need: { wood: 3, rope: 2, gum: 1 }, station: 'workbench' },
  { id: 'sinew_bow', out: 'sinew_bow', count: 1, need: { wood: 3, sinew: 3, gum: 2, bone: 2 }, station: 'workbench' },
  { id: 'hardwood_bow', out: 'hardwood_bow', count: 1, need: { hardwood: 4, sinew: 3, gum: 2 }, station: 'workbench' },
  { id: 'heartwood_bow', out: 'heartwood_bow', count: 1, need: { heartwood: 3, hardwood: 2, sinew: 4, iron_ingot: 1 }, station: 'workbench' },
  { id: 'arrow_flint', out: 'arrow_flint', count: 8, need: { stick: 4, flint: 2, feather: 4 }, station: 'workbench' },
  { id: 'arrow_bone', out: 'arrow_bone', count: 8, need: { stick: 4, bone: 2, feather: 4 }, station: 'workbench' },
  { id: 'leather', out: 'leather', count: 2, need: { '#pelt': 1 }, station: 'workbench' },
  { id: 'leather_cap', out: 'leather_cap', count: 1, need: { leather: 3, sinew: 1 }, station: 'workbench' },
  { id: 'leather_vest', out: 'leather_vest', count: 1, need: { leather: 6, sinew: 2, rope: 1 }, station: 'workbench' },
  { id: 'leather_pants', out: 'leather_pants', count: 1, need: { leather: 4, sinew: 2 }, station: 'workbench' },
  { id: 'bone_helm', out: 'bone_helm', count: 1, need: { bone: 6, leather: 2, sinew: 1 }, station: 'workbench' },
  // Työstöpenkki: metallit ja rubiini (sessio 22: hankintatapa avoin, nyt vain kehittäjätyökaluista)
  { id: 'copper_axe', out: 'copper_axe', count: 1, need: { copper_ingot: 3, hardwood: 2, leather: 1 }, station: 'workbench' },
  { id: 'copper_pick', out: 'copper_pick', count: 1, need: { copper_ingot: 4, hardwood: 2, leather: 1 }, station: 'workbench' },
  { id: 'copper_sword', out: 'copper_sword', count: 1, need: { copper_ingot: 4, hardwood: 1, leather: 1 }, station: 'workbench' },
  { id: 'copper_sledge', out: 'copper_sledge', count: 1, need: { copper_ingot: 8, hardwood: 3, rope: 2 }, station: 'workbench' },
  { id: 'copper_shield', out: 'copper_shield', count: 1, need: { copper_ingot: 3, hardwood: 4, leather: 2 }, station: 'workbench' },
  { id: 'copper_helm', out: 'copper_helm', count: 1, need: { copper_ingot: 4, leather: 1 }, station: 'workbench' },
  { id: 'copper_scale', out: 'copper_scale', count: 1, need: { copper_ingot: 7, leather: 4, sinew: 2 }, station: 'workbench' },
  { id: 'arrow_copper', out: 'arrow_copper', count: 8, need: { stick: 4, copper_ingot: 1, feather: 4 }, station: 'workbench' },
  { id: 'iron_axe', out: 'iron_axe', count: 1, need: { iron_ingot: 3, hardwood: 2, leather: 1 }, station: 'workbench' },
  { id: 'iron_pick', out: 'iron_pick', count: 1, need: { iron_ingot: 4, hardwood: 2, leather: 1 }, station: 'workbench' },
  { id: 'machete', out: 'machete', count: 1, need: { iron_ingot: 2, wood: 1, leather: 1 }, station: 'workbench' },
  { id: 'iron_sword', out: 'iron_sword', count: 1, need: { iron_ingot: 5, hardwood: 1, leather: 1 }, station: 'workbench' },
  { id: 'iron_mace', out: 'iron_mace', count: 1, need: { iron_ingot: 5, heartwood: 2 }, station: 'workbench' },
  { id: 'iron_spear', out: 'iron_spear', count: 1, need: { iron_ingot: 2, hardwood: 3, rope: 1 }, station: 'workbench' },
  { id: 'iron_shield', out: 'iron_shield', count: 1, need: { iron_ingot: 5, heartwood: 2, leather: 2 }, station: 'workbench' },
  { id: 'iron_rings', out: 'iron_rings', count: 4, need: { iron_ingot: 1 }, station: 'workbench' },
  { id: 'chain_coif', out: 'chain_coif', count: 1, need: { iron_rings: 8, leather: 1 }, station: 'workbench' },
  { id: 'chainmail', out: 'chainmail', count: 1, need: { iron_rings: 16, leather: 2 }, station: 'workbench' },
  { id: 'chain_legs', out: 'chain_legs', count: 1, need: { iron_rings: 10, leather: 2 }, station: 'workbench' },
  { id: 'iron_helm', out: 'iron_helm', count: 1, need: { iron_ingot: 5, leather: 1 }, station: 'workbench' },
  { id: 'iron_plate', out: 'iron_plate', count: 1, need: { iron_ingot: 10, leather: 3, iron_rings: 4 }, station: 'workbench' },
  { id: 'arrow_iron', out: 'arrow_iron', count: 8, need: { stick: 4, iron_ingot: 1, feather: 4 }, station: 'workbench' },
  { id: 'ruby_axe', out: 'ruby_axe', count: 1, need: { ruby: 2, iron_ingot: 2, heartwood: 2 }, station: 'workbench' },
  { id: 'ruby_pick', out: 'ruby_pick', count: 1, need: { ruby: 2, iron_ingot: 3, heartwood: 2 }, station: 'workbench' },
  { id: 'ruby_sword', out: 'ruby_sword', count: 1, need: { ruby: 3, iron_ingot: 2, heartwood: 1, leather: 1 }, station: 'workbench' },
  { id: 'ruby_dagger', out: 'ruby_dagger', count: 1, need: { ruby: 2, heartwood: 1 }, station: 'workbench' },
  { id: 'ruby_bow', out: 'ruby_bow', count: 1, need: { ruby: 2, heartwood: 3, sinew: 4 }, station: 'workbench' },
  { id: 'ruby_circlet', out: 'ruby_circlet', count: 1, need: { ruby: 1, iron_ingot: 1 }, station: 'workbench' },
  // Nuotio (ruoanlaitto ja rohdot)
  { id: 'cooked_meat', out: 'cooked_meat', count: 1, need: { raw_meat: 1 }, station: 'campfire' },
  { id: 'roasted_mushroom', out: 'roasted_mushroom', count: 1, need: { '#cookshroom': 1 }, station: 'campfire' },
  { id: 'roasted_nuts', out: 'roasted_nuts', count: 1, need: { shea_nuts: 3 }, station: 'campfire' },
  { id: 'fonio_porridge', out: 'fonio_porridge', count: 1, need: { fonio: 5 }, station: 'campfire' },
  { id: 'meat_stew', out: 'meat_stew', count: 1, need: { raw_meat: 2, '#cookshroom': 2, moringa: 1 }, station: 'campfire' },
  { id: 'bissap', out: 'bissap', count: 1, need: { hibiscus: 3, coconut: 1 }, station: 'campfire' },
  { id: 'shea_butter', out: 'shea_butter', count: 1, need: { shea_nuts: 4 }, station: 'campfire' },
  { id: 'herbal_remedy', out: 'herbal_remedy', count: 1, need: { moringa: 2, hibiscus: 2, gum: 1 }, station: 'campfire' },
  { id: 'shea_salve', out: 'shea_salve', count: 1, need: { shea_butter: 1, moringa: 1, hibiscus: 1 }, station: 'campfire' },
];
