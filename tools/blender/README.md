# Esinemallit Blenderillä (sessio 54)

Pelin esineiden 3D-mallit tehdään tämän kansion Python-skripteillä. Tulos on
`assets/models/items/items.glb`. Puunuija, soihtu ja kivipuukko ovat erillisiä
malleja (`src/models/data/userItems.js`), eikä niitä tehdä täällä.

## Tiedostot

- `build_items.py`: ajaa kaikki esineet ja vie ne GLB:ksi.
- `registry.py`: `@item`-merkintä, jolla esine rekisteröidään. Avainsanat
  (`paint`, `ao_strength`, `ao_dist`) välitetään `itemlib.build()`:lle.
- `itemlib.py`: perusosat.
  - `Part`, `loft`, `tube`, `ring`, `box_uv`;
  - AO:n leivonta verteksiväreihin ja verteksivärien maalaus;
  - glTF-vienti;
  - `TEX_WORLD`: kunkin materiaalin tekstuurin koko metreinä.
- `shapes.py`: varret, kääreet, terät, hakun päät, nyörit.
- `paint.py`: värit ja kohina maalausfunktioille.
- `items_tools.py`, `items_weapons.py`, `items_mats.py`, `items_food.py`,
  `items_misc.py`, `items_bows.py`, `items_armor.py`: esineet ryhmittäin.
- `prep_textures.py`: materiaalikirjaston tekstuurit `assets/textures/items/`.
- `optimize_glb.mjs`: pakkaus (dedup, prune, meshopt, UV-pyöristys).

## Koordinaatit ja materiaalit

- Origo on kädensijan kohdalla, ja esine osoittaa Blenderin +Z:n suuntaan
  (pelissä +Y). Pelin X = Blenderin X, ja pelin Z = Blenderin −Y.
- Mitat vastaavat vanhoja proseduraalisia malleja (käden otteet ja kuvakkeet).
- Panssarien ja kellon etupuoli on −Y (pelissä +Z, kuvakekameraa kohti).
- Materiaalipaikan nimi viittaa pelin materiaalikirjastoon
  (`src/models/itemAssets.js` `LIB`):
  - tekstuuroitu, esim. `wood`, `iron`;
  - sävytetty, esim. `cloth:8a6a4a`;
  - verteksiväreillä maalattu, esim. `skin`, `flesh`, `plant`, `feather`;
  - `ruby` (hehkuva kivi).
- GLB:n solmun nimi on esineen tunnus. Lisäksi on solmut `bowbody_<jousi>`
  (runko ilman jännettä) ja `arrow1_<nuoli>` (yksi nuoli).

## Ajo

Riippuvuudet: Blender 4.x (`apt install blender python3-numpy`) ja Node.js:n
paketit `@gltf-transform/core`, `@gltf-transform/extensions`,
`@gltf-transform/functions` ja `meshoptimizer`.

```
blender -b --factory-startup --python tools/blender/build_items.py -- /tmp/raw.glb
node tools/blender/optimize_glb.mjs /tmp/raw.glb assets/models/items/items.glb
```

Vain osa esineistä (testausta varten; huom. GLB sisältää silloin vain ne):

```
blender -b --factory-startup --python tools/blender/build_items.py -- /tmp/raw.glb iron_axe,bow
```

Tekstuurit (ambientCG:n 1K-JPG-paketit purettuna kansioon, ks. `assets/CREDITS.txt`):

```
python3 -I tools/blender/prep_textures.py <ambientCG-kansio> assets/textures/items
python3 -I tools/blender/prep_textures.py --procedural assets/textures/items
```

Pakettien `.blend`-tiedostoja ei avata; vain JPG-kuvia käytetään.

# Puut Blenderillä (sessio 56)

Savannin ja sademetsän puut tehdään skripteillä. Tulos on
`assets/models/trees/` (`trees.glb`, lehtiatlas `leaves.webp`,
kaarnatekstuurit `bark_<laji>_{c,n}.webp`). Peli lataa ne
`src/models/treeAssets.js`:ssä; jos lataus epäonnistuu, käytetään vanhoja
koodilla tehtyjä puita (`src/models/trees.js`).

## Tiedostot

- `leafgen.py`: lehvät (akasia, karite, baobab, leveälehtiset, kapokki,
  taimi) bmeshinä verteksiväreillä; Cycles renderöi kunkin solun
  läpinäkyvälle taustalle (`cell_<nimi>.png`).
- `pack_leaves.py`: solut atlakseksi (`leaves.webp`, 4 × 2 solua) ja
  kunkin solun UV-alue ja kuvasuhde tiedostoon `leaf_cells.json`.
- `build_trees.py`: lajit (`SPECIES`: akasia, karite, baobab, sademetsäpuu,
  kapokki, jättiläispuu, taimi), kustakin 2-4 muunnelmaa, lähi- ja
  kaukomalli.
  - Oksat kasvavat rekursiivisesti ohjausfunktion mukaan (`Tree.grow`,
    `Tree.children`), lehtikortit oksien varsille (`Tree.foliage`).
  - Runko (`trunk_line`, `build_trunk`): tyvessä pyöreät juurilohkot, jotka
    levenevät maata kohti ja jatkuvat maan alle; sademetsässä korkeat,
    kapeat pönkkäjuuret. Tyvessä renkaat ja kulmat ovat tiheämmässä ja
    ommellaan yläosan harvempaan putkeen. Kaatokorkeudella on tarkka rengas
    (kanto ja kaatuva latva, `src/game/treeCut.js`).
  - Verteksiväri: R = AO, G = runko, B = lehti.
  - Solmun extras: `tree` (kaatotiedot), `vines` (liaanien kiinnityskohdat).
- `prep_textures.py --bark`: kaarnatekstuurit (ambientCG, ks. `assets/CREDITS.txt`).

## Ajo

```
blender -b --factory-startup --python tools/blender/leafgen.py -- /tmp/leaves
python3 -I tools/blender/pack_leaves.py /tmp/leaves assets/models/trees/leaves.webp assets/models/trees/leaf_cells.json
python3 -I tools/blender/prep_textures.py --bark <ambientCG-kansio> assets/models/trees
blender -b --factory-startup --python tools/blender/build_trees.py -- /tmp/trees_raw.glb assets/models/trees/leaf_cells.json
node tools/blender/optimize_glb.mjs /tmp/trees_raw.glb assets/models/trees/trees.glb
```

Vain osa lajeista: lisää viimeiseksi argumentiksi esim. `acacia,shea`
(GLB sisältää silloin vain ne).
