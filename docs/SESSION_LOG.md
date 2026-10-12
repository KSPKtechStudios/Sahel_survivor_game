# Sessioloki

Uusin merkintä ylimpänä.

## 2026-10-12 (sessio 40)
**Tehtiin**
- `render/grassField.js`: alpha-to-coverage ja terävöity alfa.
- Anisotropia 16: `alphaMips.js`, `surfaces.js`, `textures.js`, `kitMaterials.js` ja `scannedMaterials.js`.
- `render/post.js`:
  - taivaan tummennus `skyDim`;
  - syväterävyys lievemmäksi;
  - okkluusio 0,62;
  - `handAE` 0,3.
- `player/viewmodel.js`: täytevalot miedommiksi.
- `game/save.js`: terävöinti oletuksena pois (asetusversio 5).
- Huom.: työympäristön uudelleenkäynnistys oli palauttanut `origin`-remoten vanhaan repoon (`KSPKtech/sahel`). Se asetettiin takaisin osoitteeseen `KSPKtechStudios/Sahel_survivor_game`.
- Testattiin: savanni klo 11 (ruohon reunat, vertailu session 37 kuvaan), sademetsä taivaalle päivällä ja yöllä, ESLint.

**Seuraavaksi**
- Käyttäjän palaute reunojen laadusta.

## 2026-10-12 (sessio 39)
**Tehtiin**
- PR #1 oli yhdistetty mainiin, ja käyttäjä lisäsi videon mainiin. Työhaara siirrettiin mainin päälle (suora eteenpäin siirto).
- Intro: `index.html` (kerros ja skripti), `menu.css` (#intro), `main.js` (ei piirtoa intron aikana), `assets/videos/intro.mp4` (faststart, nimetty uudelleen).
- `render/post.js`:
  - valoisuus: sironta, valokeilat, säteet, silmän mukautumisen taivaspaino ja päivätavoite;
  - bloomin yläraja, terävöinti 0,25;
  - syväterävyys tarkennuksen mukaan;
  - liike-epäterävyys;
  - käden mukautuminen alfakanavalla (`uOutA`, `uHandAE`, `handAE`).
- `player/viewmodel.js`: täytevalot miedommiksi. `main.js`: valokeilojen ilma.
- Testattiin:
  - intro (Playwright; H.264 ei toimi testiselaimessa, joten testi syötti saman videon WebM-muodossa): toisto äänen kanssa ja Esc-ohitus, ja valikko latautui;
  - ilman videotukea intro ohittuu itsestään;
  - sademetsä aamulla, keskipäivällä ja yöllä;
  - ESLint.

**Seuraavaksi**
- Käyttäjän palaute.

## 2026-10-12 (sessio 38)
**Tehtiin**
- `render/post.js`:
  - bloomin arvot (`bloomCfg`: threshold, knee, intensity, spread);
  - CAS-terävöinti ja silmän mukautuminen `finalFS`:ssä (`_aeInFinal`);
  - bloomin esisuodatus laskee mukautumisen tekstuurista;
  - kontrastikäyrä säästää tummat sävyt;
  - `ae.humidNight`.
- `player/viewmodel.js`: `fill`, `rim` ja `amb` (pimeyden mukaan).
- `render/environment.js`: `humidNightAmb` 3,0 ja `humidFogDark` 0,45.
- `main.js`: valokeilat ja korkeussumu sademetsässä, asetus `sharpen`.
- Asetus Terävöinti: `save.js` (v4), `menu.js` ja `index.html`.
- Testattiin sademetsässä (paikka haetaan maastonäytteistä `rainforest` > 0,95, ja kosteus pakotetaan heti tavoitteeseen) päivällä ja yöllä kirves kädessä, ennen- ja jälkeen-kuvat (ennen-versio git worktreestä `shots/basewt`), sekä ESLint.

**Seuraavaksi**
- Käyttäjän palaute terävyydestä ja sademetsän valoisuudesta.

## 2026-10-12 (sessio 37)
**Tehtiin**
- `render/post.js`:
  - SSAO: `aoFS`, `aoBlurFS`, `aoAt` koosteessa;
  - bloom: `bloomPreFS`, `bloomDownFS`, `bloomUpFS`;
  - viimeistely: `finalFS` (ACES, värimäärittely, vinjetti, värisytys);
  - HDR-kuva `hdrRT`, johon käsi piirretään (`render(…, overlay)`);
  - silmän mukautumisen päivätavoite `ae.dayRef`.
- `main.js`: käsi välitetään `post.render`ille, asetukset `ao`, `bloom`, `grade` ja `vignette`.
- `render/environment.js`: avainkohdat (kultainen tunti klo 7.2 ja 16.9, aurinko voimakkaampi, keskipäivän taivas ja usva), päivän hajavalo `ambientDay` 0,6.
- Asetukset: `game/save.js` (oletukset, laatutasot, versio 3), `ui/menu.js` ja `index.html` (uudet rivit).
- Testattiin:
  - vertailukuvat pelistä ennen ja jälkeen (klo 7, 10/11, 13 ja 17.6) samasta paikasta; ennen-kuvat otettiin git worktreestä `shots/basewt`, joka poistettiin;
  - yö soihdun kanssa (bloom liekissä);
  - piirtoaika tehosteiden eri yhdistelmillä (ohjelmistorenderöinnillä vain suuntaa antava);
  - ESLint;
  - pelin käynnistys, maailman luonti ja pelaaminen ilman virheitä (kuvausajot).
- Skripti: `scratchpad/s37shots.mjs` (prefix, js ennen kuvia, kellonajat, suunnat, js lopuksi; `BASEURL` vaihtaa versiota).

**Seuraavaksi**
- Käyttäjän palaute kontrastista ja tehosteiden voimakkuudesta. Säätöarvot: `post.aoCfg`, `post.bloomCfg`, `post.gradeCfg`, `post.vigStrength`, `env.ambientDay`, `post.ae.dayRef`.

## 2026-10-12 (sessio 36)
**Tehtiin**
- `render/torchFlame.js`: tuulen kallistus ja puuskat, `uWind`- ja `uFlow`-uniformit (tuulilepatus, kiihtyvä kohina), liekki 0,52 leveä. Piilotus koskee vain liekkiä, ja `update(…, tip = null)` päivittää pelkät hiukkaset. Kova taipuma madaltaa liekkiä.
- `player/viewmodel.js`: liekin koko 0,42 (oli 0,32); liekkejä päivitetään piilotettunakin.
- `player/arms.js`: `_thumbOnIndex` (nyrkki ja ote), `_thumbAroundHandle` (kahvan läpäisyn esto); `THUMB_ON`. Vanha slerp-säätö ja kahvan peukalonkiertäjä poistettiin.
- Testisivu `shots/s29/vm.html`: uudet parametrit `wind`, `pre`, `hideN`, `th` ja `ht=1` (kamerat oikean käden ympärillä, `P<d>` = pelaajan näkölinja), sekä peukalon etäisyys kahvan akselista (`t17`, `t18`).
- Testattiin: liekki ilman tuulta ja tuulilla 0,35, 0,5 ja 0,9 (aikasarja), hiukkaset soihdun pois oton jälkeen (40 ja 240 ruutua), nyrkin peukalon neljä vaihtoehtoa kahdesta kulmasta, ote neljällä esineellä (kuva ja etäisyys akselista), pelin savutesti, ESLint.

**Seuraavaksi**
- Käyttäjän palaute.

## 2026-10-12 (sessio 35)
**Tehtiin**
- Uusi `render/torchFlame.js`: 4 kohinakuorta (simplex-kohina vertex- ja fragment-shaderissa), taipuma jousella, kipinä- ja savupisteet omalla shaderilla, piilotus tyhjentää partikkelit (valkoiset pisteet).
- `player/arms.js`: nyrkin peukalo 0,9 / 0,5 / 0,3.
- Testattiin: peukalon 8 vaihtoehtoa kahdesta kulmasta, liekki paikallaan ja liikkeessä päivä- ja yötaustaa vasten (`vm.html?camv=…&bg=…`), pelin savutesti (soihtu käteen ja pois: kipinät tyhjenevät), ESLint.

**Seuraavaksi**
- Käyttäjän palaute liekistä.

## 2026-10-12 (repon siirto)
**Tehtiin**
- Käyttäjä yhdisti uuden GitHub-tilin; uusi tyhjä repo `KSPKtechStudios/Sahel_survivor_game`. Tähän sessioon sitä ei voinut liittää (samanniminen `kspktech/sahel` jo liitetty), joten koko historia paketoitiin git bundle -tiedostoksi (`sahel-historia.bundle`), joka viedään uuteen sessioon ja pushataan sieltä.
- Testauslinkkien osoite päivitetty uuteen repoon (CLAUDE.md, README).

- Käyttäjä nimesi repon uudelleen (`KSPKtechStudios/Sahel_survivor_game`), jolloin sen sai liitettyä tähän sessioon: historia pushattiin suoraan (haarat `main` ja `claude/sahel-game-dev-yi990s`).

## 2026-10-12 (sessio 34)
**Tehtiin**
- Ote: `player/arms.js` (`GRIP_SQUEEZE`, `FLEX_MAX`, peukalo), `player/viewmodel.js` (`measureSocket` kolmioiden reunoista).
- Liekki: uusi `render/torchFlame.js` (shader, noste ja ilmavirta jousella, taipuma, kipinät); `viewmodel.js` `_updateTorchFlames` (vanhat spritet piiloon).
- Iskut: `arms.js` ROLL_MAX 0,3, ROLL_W 0,05, jousi 6/s; `viewmodel.js` nuijan ja terien iskujen loivennus.
- Testattiin: otteen kolme vaihtoehtoa kahdesta kulmasta, sormien etäisyys kahvan akselista (kaikki esineet), kierron ja ranteen kulmien läpikäynti iskuissa ennen ja jälkeen, liekki paikallaan ja liikkeessä (`vm.html?camv=…`), pelin savutesti, ESLint.

**Kesken / seuraavaksi**
- Käyttäjän palaute.
- Pushaa haara, kun GitHub-tili toimii.

## 2026-10-09 (sessio 33)
**Tehtiin**
- Käyttäjän nuija ja soihtu peliin: muunnin `shots/s33/convert.html` (suoristus, koko, otekohta, kvantisointi, WebP-tekstuurit), `src/models/userItems.js` ja `src/models/data/userItems.js`. Viewmodel ja drops käyttävät `geo.userData.material`-kenttää. Vanhat `itemClub` ja `itemTorch` poistettiin.
- Ihotekstuuri (ShareTextures Human Skin 2, normaali + AO + karheus) pintakuviona käden materiaaliin (`player/arms.js`).
- Kivipuukko: `userKnife` (lohkottu piikiviterä, puukahva, nyörisidos, ambientCG-tekstuurit, lakkapinta ja ympäristökartta).
- Norsu juomaan: `game/mobs.js` (`thirst`, `_elephantFindWater`, tilat toWater / drink), `models/elephant.js` (kärsän ja pään juomaliike).
- Testattiin: esineiden kuvat tekstuureilla ja ilman (`shots/s33/view.html`), kädessä (`shots/s29/vm.html`), ihon voimakkuus kahdella arvolla, juomisen kuvasarja, pelin savutesti, ESLint.

**Kesken / seuraavaksi**
- Käyttäjän palaute. Avoimet: norsun metsästys ja puolustus.
- Pushaa haara, kun GitHub-tili toimii.

## 2026-10-09 (sessio 32)
**Tehtiin**
- Iskut: nuija käyttää ylhäältä alas -iskuja (`game/combat.js`), muunnelmista pois kirveen vaakahakkuu ja nuijan/moukarin sivupyyhkäisy, uusi `smash4` (`player/viewmodel.js`). Nyrkkiiskut 4,5 cm ylempää.
- Nyrkin peukalo (`player/arms.js`: FIST-asennon peukalon kärkinivelet 0,6 / 0,5).
- Lastut ja kaarnahiutaleet: `render/debris.js` `splinters` (instanssiverkko), kutsut `game/breakables.js` (puut, pensaat, kuorinta), `game/fallen.js` (kaadettu runko), `game/interaction.js` (termiittikeko, liian heikko työkalu; ei kiviin).
- Norsu: polven lepokorjaus ja nilkkaluu (jalkapohja vaakatasossa), pään ja kärsän liikkeet isommiksi (`models/elephant.js`).
- Testattiin: nyrkin peukalon kolme vaihtoehtoa kolmesta kulmasta (`shots/s29/vm.html?block=fist&thumb=…`; parametri poistettiin koodista valinnan jälkeen), nuijan iskut kuvasarjoina, lastujen kuvasarja (`shots/s32/splinters.html`), norsun kävely ja seisonta (`shots/s31/elewalk.html`), pelin savutesti, ESLint.

**Kesken / seuraavaksi**
- Käyttäjän palaute. Avoimet: norsun metsästys ja puolustus, ihonsävy.
- Pushaa haara, kun GitHub-tili toimii.

## 2026-10-09 (sessio 31)
**Tehtiin**
- Norsu: `models/elephant.js` lataa käyttäjän mallin (`assets/models/elephant/elephant.glb`), rakentaa luurangon ja painot (jalat, kärsä, korvat, häntä, syöksyhampaat), ja `animateElephant` hoitaa kävelyn (sivuttaiskäynti, tukijalka paikallaan, rungon keinunta ja kallistus), kärsän, korvat ja hännän.
- `game/mobs.js`: norsu-olento (savanni, enintään 2, rauhallinen tekoäly graze / wander / alert / leave, ei kuole), törmäysjana `world.extraColliders`-listaan ja `bodyPoint` osumille (`combat.js`, `archery.js`, `ui/nameplates.js`). [F3]-paneeliin Norsu-nappi.
- Jousen jänteen käsi heiluu juostessa ja puukon ote pysyy sivuttaisiskuissa (`player/viewmodel.js`, `player/arms.js`; commitoitu jo aiemmin tässä sessiossa).
- Haamun viitta: muotojousi, rajattu poikkeama, taivutusrajoitteet ja liikkeen kanto; hihat omina kangasputkina (`models/ghostCloak.js`, `GhostSleeve`).
- Testattiin: rigin kuvat ääriasennossa, kävelyn kuvasarjat (`shots/s31/elewalk.html`), jalkojen akselit (`eleaxis.html`), viitan testi sivuttaislennossa, siksakissa, syöksyssä ja kädet ylhäällä (`ghost.html`), pelin savutesti (norsu syntyy, kävelee 1,05 m/s, päivitys 0,05 ms, lähtee lyötynä, poisto siivoaa törmäysjanan; haamu ja hihat ilman virheitä), ESLint.

**Kesken / seuraavaksi**
- Käyttäjän palaute norsusta ja viitasta. Avoin: metsästys ja puolustus, laumat ja poikaset, äänet.
- Ihonsävy (vaalea vs. tumma) on yhä avoin.
- Pushaa haara, kun GitHub-tili toimii.

## 2026-10-08 (sessio 30)
**Tehtiin**
- Ote kahvasta: `player/viewmodel.js` `measureSocket` (kahvan keskipiste ja säde esineen mallista: esineet, soihtu, jousen kahva), käsi kahvan kohdalle ja esine seuraa korjattua otetta.
- Sormet kahvan ympäri: `player/arms.js` `setGrip` ja `_wrapPose` (nivelet koukistuvat kosketukseen asti, peukalo vastakkain, välimuisti säteen mukaan); ranne säteen mukaan (`wrist0` + `wristR`). Materiaali kaksipuolinen, sirontaa vähemmän.
- Jousi: käsi nuolen alapuolelle (`BOW_HAND_Y`). Juoksuheilunta vasemmalle kädelle ja jouselle, oikean käden juoksutärinä pienemmäksi, otteen kierto pehmennetty (`arms.js`: `S.roll`).
- Hakatut puut: `render/debris.js` (palojen kaarnapinta ja märkyys, alkuperäiset normaalit, rungon palat suljetaan), `game/fallen.js` (rungon väli suljetaan), `models/trees.js` (rungon porras).
- Testattiin: otteen kalibrointi kolmesta kulmasta (keppi, viidakkoveitsi, puukko), jousi, juoksun kuvasarja, puiden vertailu (seisova ja hakattava), murskattu runko, ESLint.

**Kesken / seuraavaksi**
- Käyttäjän palaute otteista ja juoksusta. Sormien geometria on mallin oma, joten hyvin ohuilla kahvoilla nivelten iho voi yhä taittua.
- Pushaa haara, kun GitHub-tili toimii.

## 2026-10-08 (sessio 29)
**Tehtiin**
- Käyttäjän käsimalli peliin: FBX → GLB muunnos selaimessa (FBXLoader + GLTFExporter; luiden lepokierrot nollattu, metrit, valmiit asennot GLB:n userDataan), tekstuurit 1024 px WebP (`assets/models/arms/`).
- Uusi `player/arms.js`: kädet, IK (olkapään jousto, käden siirto, otteen kierto kahvan ympäri, ranteen rajat ja korjattu ote takaisin esineelle), sormien otteet (FIST, GRIP, CUP, RELAX, HOOK, OPEN), mattapintainen ihomateriaali (MeshPhysical + sirontajäljitelmä).
- `player/viewmodel.js`: oikea käsi animaation otteesta, vasen kilpi / soihtu / jousi / sama varsi / lepo; jousipehmennys (`_soften`), aikavenytys (`warpTime`), jatkoliike iskun jälkeen, pehmeämmät torjunta- ja vaihtoajat; terä-aseiden ja nuijan otekohdat; pistojen ja murskauksen lyöntiasento matalammaksi.
- `game/combat.js`: iskut 35 % pidempiä, osuma 12 % myöhemmin, kierto ennallaan (palautus vähennetään jäähdytyksestä); `game/building.js`: vasaran isku pidempi.
- Juuret yhtenäiseksi putkeksi (`models/ancient.js`), tähdenlennot useammin ja pehmeä häivytys (`render/sky.js`).
- Testattiin: testisivut `shots/s29/` (muunnos, otteen kalibrointi kolmesta kulmasta, iskujen kuvasarjat, ranteen kulmien läpikäynti kaikista animaatioista), ESLint, savutesti.

**Kesken / seuraavaksi**
- Käyttäjän palaute käsistä ja animaatioista; pistot ja nuijan murskaus mahdollisesti uusiksi käsivarren ehdoilla.
- Ihonsävy (vaalea vs. tumma), ks. TODO.
- Pushaa haara ja avaa PR, kun GitHub-tili toimii.

## 2026-10-08 (sessio 28)
**Tehtiin**
- Haamun viitta joka olennolle (`game/mobs.js`: `instantiate`).
- Lahopuun kuori (`assets/models/nature/deadbark*.jpg`, Poly Haven bark_willow_02; `render/kitMaterials.js`: toisto ja mittakaava; `assets/CREDITS.txt`).
- Bambu uusiksi (`models/plants.js`: `makeBamboo`, `bambooLeaves`; `models/models.js`: kaukoversio).
- Pehmeät normaalit loveissa (`game/treeCut.js`: `applyNotches`), rungon jatke latvukseen ja pyöreämmät oksat (`models/trees.js`, `models/flora.js`).
- Selkeän sään sumu (`render/environment.js`).
- Testattiin: testisivut (puut, bambu), pelikuva yöllä haamun kanssa, ESLint, savutesti.

**Kesken / seuraavaksi**
- Käyttäjän palaute.
- Pushaa haara ja avaa PR, kun GitHub-tili toimii.

## 2026-10-08 (sessio 27)
**Tehtiin**
- Pikakorjaukset: viidakon taustaäänen uudelleenyritys (`audio/sfx.js`: Bed), aavikon tuuli (`main.js`), silmän mukautuminen ja yön yläraja (`render/post.js`), jalanjäljet isommiksi (`render/footprints.js`).
- Leijuvat pisteet: lehtiatlaksen varret pois (`assets/textures/leaves.png`), peittävyyden vahvistuksen raja (`render/alphaMips.js`), alpha to coverage (`render/materials.js`, `render/kitMaterials.js`, `render/debris.js`, `main.js`).
- Liaanien fysiikka (`render/vines.js` uusi; `models/ancient.js`: `lianaSpec`; `models/trees.js`; `game/fallen.js`: `bindToLog`/`releaseLog`; `main.js`), kaatuvan latvuksen lehtien liike (`game/fallen.js`: `_initSway`, `_updateSway`).
- Kookokset (`game/coconuts.js` uusi; `models/palms.js`: `userData.fruit`; `game/interaction.js`: ravistus ja kehote; `game/fallen.js`; `main.js`: tallennus).
- Lahopuun kaato (`models/models.js`: `withTreeMeta`; `world/objectTypes.js`; `game/treeCut.js`: aAO ja kit; `game/breakables.js`, `game/fallen.js`, `world/world.js`: kitin materiaali).
- Lammikot kuoppiin ja kaislat vesistöjen varsille (`world/chunkGen.js`, `world/objectTypes.js`).
- Baobab, ryppäiset latvukset, sileät pönkkäjuuret (`models/trees.js`), pyöreät normaalit hakatuissa rungoissa (`game/treeCut.js`: `applyNotches`), banaanit (`models/palms.js`).
- Haamun viitta kankaana (`models/ghostCloak.js` uusi; `models/creatures.js`; `game/mobs.js`).
- Testattiin: erilliset testisivut (liaanit, puut, banaani, baobab, haamun viitta), pelikuva sademetsästä, ESLint puhdas, savutesti.

**Kesken / seuraavaksi**
- Käyttäjän palaute liaaneista, kookoksista, viitasta ja puista.
- Pushaa haara ja avaa PR, kun GitHub-tili toimii.

## 2026-10-08 (sessio 26)
**Tehtiin**
- Latvukset pelkistä lehtikorteista (`models/trees.js`, `models/flora.js`: `blob`; `models/util.js`: `leafCards(…, size, under)`; `models/plants.js`: tiheikkö).
- Lehtien kiilto pois (`render/materials.js`, `render/kitMaterials.js`, `main.js`: `addWet(…, 0.3, 0)`), sademetsän usva (`render/environment.js`, `main.js`: hfog), liaanien tupsut pois (`models/ancient.js`), sadepisarat (`render/rain.js`).
- Volumetriset valokeilat varjokartasta (`render/post.js`: `volFS`, `volRT`, `uVolCol`; `main.js`: `post.shafts`).
- Leijuvat pikselit: alfatekstuurien reunavärit ja peittävyyden säilyttävät mipmapit (`render/alphaMips.js` uusi; `render/surfaces.js`, `render/kitMaterials.js`, `render/grassField.js`).
- Uudet palmut, kookospalmut, doumpalmut ja banaanit (`models/palms.js` uusi; vanhat poistettu `models/trees.js`, `models/flora.js`; `models/models.js`).
- Simpukat (`models/shells.js` uusi; `models/items2.js`, `models/pickups.js`, `models/shore.js`, `world/objectTypes.js`: `seashellPick`, `game/items.js`: `seashell`).
- 3D-jalanjäljet (`render/footprints.js` uusiksi; `main.js`).
- Iskujen lisämuunnelmat (`player/viewmodel.js`: swingD, swingE, punchC, punchD, slashR3, slashL3, thrust3, smash3).
- Musiikki ja äänet (`audio/music.js`: uudelleenyritys, varakappale, lyhyempi pitoaika; `main.js`: aavikon ja savannin tuuli). Testattiin: nopealla silmukalla aavikon kappale alkaa ~3 s:ssa.
- Suorituskyky: vertailu session 25 versioon samassa paikassa; raskaat uudet mallit kevennettiin.
- Testattiin: kuvat (sademetsän valokeilat, latvukset, ranta), simpukka-, jalanjälki- ja palmukuvat erillisellä testisivulla, ESLint puhdas, savutesti.

**Kesken / seuraavaksi**
- Käyttäjän lisätoiveet (ks. DESIGN.md sessio 26 ja TODO): liaanien ja lehtien fysiikka, kaislat vesistöjen varsille, baobab, juuret ja kannot, lahopuun kaatuminen, haamun viitta ja sen fysiikka.
- Pushaa haara ja avaa PR, kun GitHub-tili toimii.

## 2026-10-08 (sessio 25)
**Tehtiin**
- Session 24 viimeistely: paketti ja kuvat toimitettiin (testiajoja lyhennettiin, ettei hidas ohjelmistorenderöinti jumita).
- Silmän mukautuminen (`render/post.js`: `lumFS`, `lumRT`, `uAE`), perusvalotus (`render/environment.js`), hämärän ja yön hajavalo (KEYS), huonon sään yö (`tinted`, `nightDark`).
- DOF ja liike-epäterävyys (`render/post.js`), lehtien läpikuultavuus (`render/materials.js`: `addTranslucency`, `sunUniforms`; `render/kitMaterials.js`; `main.js`).
- Sadepisarat päästä katsottuna (`render/rain.js`).
- Puun sirpaleet ja latvuksen ydin (`render/debris.js`: UV ja materiaali; `models/trees.js`, `models/flora.js`, `models/plants.js`).
- Rannat ja merenpohja (`models/shore.js` uusi; `world/objectTypes.js`: kelp, seabedRocks, shoreRocks, beachStones, kaislat tiheämmin; `world/chunkGen.js`: `seabed`).
- Jalanjäljet (`render/footprints.js` uusi; `main.js`), askelroiskeet (`main.js`, `player/player.js`).
- Iskujen muunnelmat ja Hermite-käyrä (`player/viewmodel.js`: `VARIANTS`, `keyframes`).
- Kello vain kädessä (`ui/hud.js`, `game/items.js`), kuun valokuva (`render/sky.js`, `assets/textures/moon.jpg`).
- Testattiin: valotuksen kalibrointi (päivä L ≈ 0,31 → kerroin 0,98; hämärä 1,09; yö), kuvat hämärästä, yöstä ja soihdusta; ESLint puhdas; savutesti.

**Kesken / seuraavaksi**
- Käyttäjän palaute valotuksesta (yön kirkkaus) ja uusista iskuista.
- Pushaa haara ja avaa PR, kun GitHub-tili toimii.

## 2026-10-08 (sessio 24)
**Tehtiin**
- Maaston pehmennys (`world/terrain.js`: `sabs`, `smin`, harjanteet, dyynit, vuoret, laterittitasanko, uomat; `config.js`: `chunkSegments` 48).
- Tiheä ruohokenttä: generointi säikeessä (`world/groundCover.js` uusi; `world/chunkGen.js`, `world/genWorker.js`), piirto (`render/grassField.js` uusi: tuuliaallot, pelaajan taivutus, häivytys, vastavalo; `world/world.js`, `main.js`). Atlakset `assets/textures/grass.png` (piirretty skriptillä) ja `forestfloor.png` (koottu kitin lehdistä). Vanhat ruohotupsut `retired` (`world/objectTypes.js`).
- Quaternius-kit (CC0): muunnos ja upotus (`models/kit/natureKit.js` + `build.js`, `render/kitMaterials.js` uusi, `assets/models/nature/`), saniainen, aluskasvit, kuolleet puut kitistä (`models/models.js`), uudet maanpeitteet (groundFern, forestPlant, kitMushrooms, wildFlowers, twigs) ja sammaleiset kivet (mossStone).
- Koristeiden sijoittelu chunkin verkosta ja tiheiden aluskasvien näyttö vain lähellä (`world/chunkGen.js`, `world/world.js`: `decorDist`, `_updateDecorNear`, `setDecorDensity`).
- Sammal: maastoon (`render/surfaces.js`: Moss002), rakenteisiin peitekerros (`cover`, `top`, `uMoss`) ja harmaantunut puu (`weather`); rauniot (`game/ruins.js`: Rock064).
- Tarinankerronta ja köynnökset (`models/ancient.js` uusi: pylväs, ruostunut kilpi, juuret, risut, liaanit, köynnös; `models/trees.js`; `render/materials.js`: `solid_ancient`).
- Tunnelma: korkeussumu (`render/post.js`: `uHFog`; `main.js`), itiöt ja usvapisarat (`render/ambient.js`: `Motes`), sateen kruunuroiskeet (`render/rain.js`).
- Asetus Kasvillisuus (`index.html`, `ui/menu.js`, `game/save.js`, `main.js`).
- Poistettu vahingossa commitoitu testikuva `undefined/shots/s9/smoke.png`.
- Testattiin headless-Chromiumilla: kuvat savannilta, kausilammelta, keitaalta, sademetsästä, vuoristosta, pylväistä, kilvistä ja juurista; vanhojen esineiden sijainnit ennallaan (1222/1225, 3 putosi rinnetarkistuksessa); generointi ~20–30 ms / chunk.

**Kesken / seuraavaksi**
- Käyttäjän palaute ulkoasusta ja suorituskyvystä (Kasvillisuus-asetus).
- Ruoho ei vielä väisty pelaajan rakentamien lattioiden alta.
- Sketchfab vaatii käyttäjän API-avaimen.
- Pushaa haara ja avaa PR, kun GitHub-tili toimii.

## 2026-10-08 (sessio 23)
**Tehtiin**
- Verkko oli aluksi estetty (403); käyttäjä avasi ympäristön verkkoasetukset. Poly Haven estää Pythonin oletus-User-Agentin, joten haut tehtiin curlilla.
- Tekstuurit (assets/textures/: hiekka, maa, metsänpohja, kallio, kaarna, laudat, lehtiatlas), lähteet assets/CREDITS.txt.
- Maasto (`world/terrain.js`: `groundWeights`; `world/chunkGen.js`, `world/genWorker.js`, `world/world.js`: `groundW`-attribuutti; `render/surfaces.js` uusi: `applyTerrainSurfaces`).
- Mallien pinnat (`render/surfaces.js`: `addSurfaceDetail`, värimaskit; `render/materials.js`: solid_rock / solid_wood / solid_earth; `world/objectTypes.js`: `surface`; `game/ruins.js`, `game/structures.js`, `models/boats.js`, `main.js`, `game/breakables.js`).
- Skannatut lohkareet (`models/scanned/boulders.js` + `build.js`, `render/scannedMaterials.js`, assets/models/rocks/; `models/models.js`, `world/world.js`, `game/breakables.js`).
- Lehvästöt (`models/util.js`: `leafCards`, `ensureUv`, UV:n säilytys; `models/trees.js`, `models/flora.js`, `models/plants.js`; `game/treeCut.js`: UV halkaisussa; materiaalit: lehtiatlas + alphaTest).
- Korjattu: baobab puuttui hakattavien mallien listalta (`models/models.js`: HAS_HI).
- three.js glTF-lataaja vendoroitu (ei vielä käytössä).
- Testattiin headless-Chromiumilla: kuvat biomeista, lohkareista, baobabista, kaarnasta ja lehvästöistä; kolmiomäärä sademetsässä 1,05 M → 1,63 M (kaukomallien kortteja harvennettu); baobabin kuorinta ja kaato, logiikkatesti, ESLint ja savutesti puhtaat.

**Kesken / seuraavaksi**
- Käyttäjän palaute ja osa 2 (palmut, ruoho, olennot, esineet, rakennelmat, lisää Poly Havenin malleja).
- Pushaa haara ja avaa PR, kun GitHub-tili toimii.

## 2026-10-08 (sessio 22)
**Tehtiin**
- Kysyttiin 4 kysymystä (metallien hankinta, baobab, asetyypit, poistot).
- Esineet ja reseptit (`game/items.js`: `TIERS`, uudet materiaalit, työkalut, aseet, kilvet, jouset, nuolet, panssarit, 67 reseptiä; simpukka ja terälehdet pois).
- Mallit (`models/items3.js` uusi: kirveet, hakut, miekat, tikarit, nuijat, moukari, keihäät, kilvet, panssarit, materiaalit; `models/items2.js`: jousityylit `BOW_STYLES`, kupari- ja rautanuolet; `render/itemGlow.js` uusi: rubiinin hehku; `ui/icons.js`, `game/drops.js`, `player/viewmodel.js`: otteet tyypin mukaan, hehku, kilven malli kädessä).
- Taistelu (`game/combat.js`: tikari, miekka, moukari + hyppyisku, `wmul`, kilpien arvot, panssarin vähennys, rubiinin elinvoima ja paraneminen).
- Puut ja tasot (`world/objectTypes.js`, `game/interaction.js`: `_tierOk`, kuorinta; `game/breakables.js`: `peel`, `_applyPeel`, ketjukaadon esto; `models/trees.js`: hakattava baobab; `world/world.js`: kannon koko).
- Työkaluvihje (`game/survival.js`), kehittäjätyökalut (`ui/devtools.js`: Metallit, Taso…), nuolijärjestys (`game/archery.js`).
- Testattiin headless-Chromiumilla: kaikille 107 esineelle malli ja kuvake, rubiiniosien hehku, panssari 20 → ×0,6, rautakilven arvot, tasovaatimukset (kivi ei sademetsäpuuhun, piikivi kyllä, kupari kapokkiin, rauta baobabiin), baobabin kuorinta (12 puuta) ja kaato, kaadetun rungon pilkonta (ydinpuu, puu, apinanleipä); kuvat kuvakkeista, esineistä kädessä (myös yöllä hehkuva rubiinikirves) ja baobabista. ESLint ja savutesti puhtaat.

**Kesken / seuraavaksi**
- Metallien hankinta ja jousien valmistus (käyttäjän päätös), tarina.
- Pushaa haara ja avaa PR, kun GitHub-tili toimii.

## 2026-10-08 (sessio 21)
**Tehtiin**
- Nimen esiintulo (`ui/hud.js`: `_revealTarget`; `game/interaction.js`: `prompt.key`).
- Hyppyisku (`game/combat.js`: `leap` kirveelle ja nuijalle, kriittinen osuma; `player/viewmodel.js`: `leap`-animaatio, toinen käsi varressa; `audio/sfx.js`: `crit`; `ui/hud.js` + `styles.css`: `#crit-ring`).
- Haamun äänet hiljemmiksi (`audio/sfx.js`). Parry: teksti pois (`game/interaction.js`), taintuminen ja tähdet (`game/mobs.js`: `_fxDaze`, retkahdus), kipinät (`game/combat.js`).
- Kuu: reunan korjaus (`render/sky.js`), satunnainen vaihe joka yö (`render/environment.js`: `moonHash`, `moonSeed`; `main.js`), kuuteksti pois (`main.js`), kuu kehittäjätyökaluihin (`ui/devtools.js`).
- Savipeikon nousu (`game/mobs.js`: `_emergeStart`, `_fxEmerge`). Esineiden katoaminen (`game/drops.js`). Kello kartan viereen + digitaaliaika (`index.html`, `styles.css`, `ui/hud.js`).
- Keularoiskeet linssille (`render/post.js`: `lensSplash`, `addSplash`; `game/boats.js`: `bowSpray`; `main.js`).
- Testattiin headless-Chromiumilla: 12 yön kuut (eri vaiheet, sama koko yön, vaihtuu keskipäivällä), esine katoaa ja aika tallentuu, ilmassa aloitettu isku = `leap` ja maassa tavallinen, kriittinen osuma 36 ja `crit`-tapahtuma, taintumisen tähdet tulevat ja poistuvat, nousun hehku poistuu; kuvat kuusta (täysi, puoli), kellosta, hyppyiskun vaiheista, taintumisesta, noususta ja linssiroiskeesta. ESLint ja savutesti puhtaat.

**Kesken / seuraavaksi**
- Käyttäjän palaute (hyppyiskun tuntuma, roiskeet oikeassa myrskyssä: testiselain ei pysty purjehtimaan reaaliajassa).
- Pushaa haara ja avaa PR, kun GitHub-tili toimii.

## 2026-10-08 (sessio 20)
**Tehtiin**
- Kysyttiin 4 kysymystä (käyttö repussa, pinot, kellon näyttö, linnunrata).
- Valkoinen maailma nopeissa siirroissa (`world/world.js`: `ensureLoaded` peruttavissa; `main.js`: `buildGen`, `teleportTo`).
- Kuumuusväreily (`render/post.js`), linnunrata (`render/sky.js`), nimet (`world/objectTypes.js`: osuma-alueet), yöhiljaisuus (`main.js`).
- Kello (`game/items.js`, `models/items.js`, `game/ruins.js`, `index.html`, `styles.css`, `ui/hud.js`).
- Toinen käsi (`game/inventory.js`: `offhand`, `selectedItem`; `player/viewmodel.js`: soihtu vasemmassa kädessä; `main.js`: [F], soihdun valo; `game/interaction.js`).
- Reppu: klikkaus ottaa/laskee, sykintä, Ctrl+oikea jakoikkuna, vihreä tausta, valmistuksen latausaika (`ui/inventoryUI.js`, `index.html`, `styles.css`); pinot (`game/items.js`).
- Testattiin headless-Chromiumilla: 15 nopeaa siirtoa ilman korjausta jumittui yli 10 min, korjauksen jälkeen valmis (muisti ennallaan, WebGL kunnossa); repussa klikkaus/lasku, jako 12 → 8 + 4, soihdun ja kilven vaihto toiseen käteen, valmistus "Valmistetaan…" ja tulos vasta latauksen jälkeen; kellotaulu ja vasemman käden soihtu kuvina. ESLint ja savutesti puhtaat.

**Kesken / seuraavaksi**
- Käyttäjän palaute; reppuun lisää myöhemmin (käyttäjä: "ei vielä valmis").
- Pushaa haara ja avaa PR, kun GitHub-tili toimii.

## 2026-10-08 (sessio 19)
**Tehtiin**
- Kysyttiin repusta, valmistuksesta, panssarista ja minikartasta 8 kysymystä kahdessa erässä.
- Viholliset (`game/mobs.js`: `_strafe`, `_circle`, `_attackers`, tilat `circle` ja `retreat`, vahvempi savipeikko; `ui/nameplates.js`), linnun ääni (`audio/sfx.js`), kirves (`game/combat.js`), kasvien murskaus (`game/fallen.js`, `main.js`).
- Reppu ja valmistus uusiksi (`ui/inventoryUI.js` uusi, `game/inventory.js`: `splitTo`, `quickMove`, `canEquip`, `armor`, tallennuksen siirto; `config.js`: 6 + 30; `index.html`, `styles.css`, `main.js`: pudotus).
- HUD: panssari, isompi terveys ja pikapalkki, minikartan kompassirengas (`ui/minimap.js`), opas [T] (`ui/guideUI.js`, `main.js`), ohjeet (`index.html`, `game/guide.js`).
- Testattiin headless-Chromiumilla: kasvien murskaus (7 kasvia 8 puusta), pahkasian kierto/perääntyminen; repussa oikeilla hiiritoiminnoilla raahaus, jako 12 → 6 + 6, Shift+klikkaus, varustus, pudotus maahan, valmistus (köysi), työkaluvihje; kuvat repusta ja HUD:sta. ESLint ja savutesti puhtaat.

**Kesken / seuraavaksi**
- Käyttäjän palaute uudesta repusta.
- Pushaa haara ja avaa PR, kun GitHub-tili toimii.

## 2026-10-07 (sessio 18)
**Tehtiin**
- Kysyttiin ensin 4 epäselvää kohtaa (kirves/nuija, viidakkoveitsi, paraneminen, kivet), sitten:
- Soihtu sateessa (`main.js`, `player/viewmodel.js`), kestävyys (`config.js`, `player/player.js`, `game/archery.js`), paraneminen (`game/survival.js`), taistelu (`game/combat.js`), puut ja kivet (`game/interaction.js`, `game/breakables.js`, `game/fallen.js`, `world/objectTypes.js`), tekstien poisto ja punainen hehku (`ui/hud.js`, `game/combat.js`, `game/mobs.js`, `styles.css`), kuumuusväreily (`render/post.js`), jousi (`game/items.js`), nimilappujen tarkkuus (`ui/nameplates.js`, `main.js`).
- Testattiin headless-Chromiumilla: puu 20 lyöntiä ilman kirvestä 5 → 4,8; kiven teksti; paraneminen 0,25 → 1 syödessä (30 s); punainen hehku tapahtumasta ja tyhjällä kestävyydellä; nimilappu tarkasti tähdättäessä; säteen hinta 0,016 ms. ESLint ja savutesti puhtaat.

**Huomiot**
- Testiselain oli tällä kertaa erityisen hidas (0,4–1,5 kuvaa/s, yksi kuva n. 7 s), joten ajastetut testit tehtiin osin kutsumalla päivityksiä suoraan.

**Kesken / seuraavaksi**
- Käyttäjän palaute tasapainosta.
- Pushaa haara ja avaa PR, kun GitHub-tili toimii.

## 2026-10-07 (sessio 17)
**Tehtiin**
- Puu pois käyttöliittymästä (`ui/woodArt.js` poistettu, `ui/hud.js`, `styles.css`).
- Nimilaput vain katsottaessa ja lähellä, viive ja pehmeä esiin/pois, lyödyn olennon lappu (`ui/nameplates.js`; `game/mobs.js`: `mobHit` sisältää olennon).
- Jousi: plus-tähtäin, jännityspalkki, nuolilaskuri (`index.html`, `styles.css`, `ui/hud.js`, `main.js`; `game/archery.js`: `AMMO_ORDER` viedään).
- Musiikin äänenvoimakkuuden varmistus (`audio/music.js`).
- Testattiin headless-Chromiumilla: nimilappu näkyy edessä 6 m:n päässä, ei sivulla eikä 22 m:n päässä; jousen tähtäin, palkki (65 %) ja laskuri (12) kuvana. ESLint ja savutesti puhtaat.

**Kesken / seuraavaksi**
- Käyttäjän palaute.
- Pushaa haara ja avaa PR, kun GitHub-tili toimii.

## 2026-10-07 (sessio 16)
**Tehtiin**
- Fontti: kaksi vertailukuvaa (Barlow, Signika, Cabin, Fira → liian tavallisia; Grenze, Alegreya Sans SC, Marcellus SC, Philosopher, Mohave, Special Elite), käyttäjä valitsi Philosopherin (`assets/fonts`, `menu.css`, `styles.css`, kartat, `main.js`). Logo jäi Eagle Lakeksi.
- Naulat puukylttien kulmiin (`ui/woodArt.js`, `ui/hud.js`).
- Animaatiot (`ui/hud.js`, `styles.css`): palkkien pehmennys, osuman tärähdys ja välähdys, parannuksen hehku, numeron hypähdys, kestävyyden liuku, ruokien sisään- ja ulostulo (FLIP), pikapalkki, viestit.
- Loppuvan ruoan välke ja hehku.
- Testattiin headless-Chromiumilla: kuvat (fontti, naulat, himmenevä ruoka), valikko, ESLint ja savutesti puhtaat. Huom: testiselain on liian hidas animaatioiden sulavuuden arviointiin, joten tuntuma pitää testata oikealla koneella.

**Kesken / seuraavaksi**
- Käyttäjän palaute animaatioiden tuntumasta.
- Pushaa haara ja avaa PR, kun GitHub-tili toimii.

## 2026-10-07 (sessio 15)
**Tehtiin**
- Käyttäjä halusi rustiikkisen puun ja modernin UI:n yhdistelmän. Tehtiin vertailukuva kolmesta vaihtoehdosta pelin taustan päällä (erillinen mallisivu), käyttäjä valitsi B:n (savulasi).
- `ui/woodArt.js`: `woodPanel` (valaistu rustiikkinen puulevy). HUD (`index.html`, `styles.css`, `ui/hud.js`) savulasityyliin.
- Testattiin headless-Chromiumilla: kuva pelistä (vastaa mallia), ruokajärjestelmä ennallaan, ESLint ja savutesti puhtaat.

**Kesken / seuraavaksi**
- Käyttäjän palaute; sama tyyli muuhun käyttöliittymään?
- Pushaa haara ja avaa PR, kun GitHub-tili toimii.

## 2026-10-07 (sessio 14)
**Tehtiin**
- Käyttöliittymä uusiksi kysymys kerrallaan (käyttäjän vastaukset `DESIGN.md`:ssä), kolme versiota: (1) kehykset köysin ja niitein → "mobiilipelimäinen"; (2) hillitty veistetty lauta → puu näytti piirretyltä ja tikut kapeilta; (3) valaistu korkeuskartta, leveämpi lauta, kestävyys keskelle.
- Ruokajärjestelmä (`game/survival.js` uusiksi; `player/player.js`: `maxHealth`, `maxStamina`; `game/combat.js`, `ui/devtools.js`, `ui/inventoryUI.js`: ruoan tiedot; `main.js`: kuolema).
- Puukuvat (`ui/woodArt.js` uusi), HUD (`index.html`, `styles.css`, `ui/hud.js`).
- Testattiin headless-Chromiumilla: lähtöeväät 70/70, kuusi ruokaa → 100/100, kylläisenä syöminen estyy, tallennus; kuvat versioista. ESLint ja savutesti puhtaat.

**Kesken / seuraavaksi**
- Käyttäjän palaute versiosta 3; mahdollisesti sama tyyli pikapalkkiin, minikarttaan ja muuhun.
- Pushaa haara ja avaa PR, kun GitHub-tili toimii.

## 2026-10-07 (sessio 13)
**Tehtiin**
- Käyttäjän toiveet (kirjattu `DESIGN.md`:hen).
- Eagle Lake -fontti kaikkialla (`styles.css`, `menu.css`, `ui/minimap.js`, `ui/bigMap.js`, `ui/explored.js`, `main.js`: fontin esilataus).
- Nimilaput (`ui/nameplates.js` uusi; `game/interaction.js`: kohteen ankkuripiste, ei kestävyyttä puilla ym.; `ui/hud.js`), huomattu-merkki (silmä).
- Pystypalkit ikoneineen vasempaan alakulmaan (`index.html`, `styles.css`, `ui/hud.js`).
- Kaatuva puu murskaa ja kaataa toisia puita (`game/fallen.js`: `_crush`, ala-askeleet, koko kaatuva pituus; `game/breakables.js`: `fellTree`; `main.js`: kytkennät).
- Soihtu sammuu vedessä ja yskii sateessa (`main.js`, `player/viewmodel.js`, `game/combat.js`: sytyttää vain palava soihtu).
- Kuun vaiheet (`render/environment.js`, `render/sky.js`), täysikuulla enemmän vihollisia (`game/mobs.js`), viesti illalla (`main.js`).
- Lammikot verkon pintaan (`world/chunkGen.js`: `meshHeight`, kaksi tarkistuskehää).
- Testattiin headless-Chromiumilla: olennon nimilappu ja silmä (näkyy jahdatessa, katoaa laiduntaessa), puun nimilappu kohteen kohdalla ilman palkkia ja ruudun sisällä, kaatuva puu (pelaaja 100 → 38–53, mobi 55 → 12 / kuoli, ketjukaato 5/6 kertaa 2–3 puuta), soihtu (sateessa liekki n. 0,5, poutaan palatessa 0,85 → 1, vedessä sammuu), kuu (sirppi ja täysikuu kuvina), lammikot (pahin 1,8 cm maanpinnan yläpuolella, ennen leijui). ESLint ja savutesti puhtaat.

**Huomiot**
- Testiselaimessa sademetsä piirtyy niin hitaasti (3 ruutua 8 s:ssa), että kaatumisfysiikkaa ajettiin testissä käsin 1/60 s:n askelin. Samalla huomattiin, että osumassa käytettiin vain hakattavan rungon pätkää (latva ei osunut), ja korjattiin.

**Kesken / seuraavaksi**
- Käyttäjän palaute (nimilappujen määrä, merkki, soihdun sytytys).
- Pushaa haara ja avaa PR, kun GitHub-tili toimii.

## 2026-10-07 (sessio 12e)
**Tehtiin**
- Käyttäjän toiveet ja 2 iskuääntä (kirjattu `DESIGN.md`:hen).
- Linssiheijastukset (`render/post.js`, `main.js`), asetus (`index.html`, `ui/menu.js`), DOF ja heijastukset oletuksena + asetusten versio (`game/save.js`).
- Linssipisarat vain myrskypurjehdukseen (`main.js`), haamuja harvemmin (`game/mobs.js`).
- Väistö (`audio/sfx.js`: taustaäänten väylä; `audio/music.js`: duck), iskuääni (`assets/sfx/punch1/2.mp3`, `game/combat.js`: `punch`), napsahdus ja huitaisu hiljemmaksi.
- [Shift]+[Q] koko pino (`main.js`), soihdun valo (`main.js`, `game/structures.js`), soihdun sytytys (`game/mobs.js`: `setOnFire`, `game/combat.js`).

- Testattiin headless-Chromiumilla: oletusasetukset (DOF ja heijastukset päällä), linssiheijastus kuvana ja voimakkuus 0,85 aurinkoon katsottaessa, iskuääni (−26 dB) ja väistö (taustaäänet 0,8 palautumassa), soihdun valo kuvina ennen/jälkeen (valo liekin kohdalla, maa valaistuu selvästi), sytytys (pahkasika 55 → 48 terveyttä 2 s:ssa), [Q] yksi ja [Shift]+[Q] koko pino (6 kpl). ESLint ja savutesti puhtaat.

**Huomiot**
- Komentorivin turvatarkistus oli välillä tavoittamattomissa ja istunnon työprosessi käynnistyi kerran uudelleen; muutokset tehtiin silloin Edit-työkalulla ja testattiin, kun komentorivi palasi.
- Testiselaimessa animaatiot etenevät hyvin hitaasti, joten [Shift]+[Q] näytti ensin toimimattomalta (painallus osui edellisen heiton keskelle); odottamalla animaation loppuun se toimi.

**Kesken / seuraavaksi**
- Käyttäjän palaute; [Shift]+[Q]-tulkinta (pino vai koko reppu).
- Pushaa haara ja avaa PR, kun GitHub-tili toimii.

## 2026-10-07 (sessio 12d)
**Tehtiin**
- Käyttäjän palaute ja 3 äänitiedostoa (kirjattu `DESIGN.md`:hen).
- Puun kaatumisääni rakennettiin uudelleen tiedostona (`assets/sfx/tree-fall.mp3`), koodista poistettiin päällekkäinen narinakopio (`audio/sfx.js`).
- Tyrskyt (`game/boats.js`, `render/splash.js`: suunnattu suihku, pooli 2 400), sadepisaroiden roiskeet vedenpinnalle (`render/rain.js`), linssipisarat (`render/post.js`, `main.js`).
- Veneiden nopeudet −35 % (`game/boats.js`).
- Kaarevien palmujen kaatunut runko (`models/trees.js`, `models/flora.js`: `logTop`; `game/treeCut.js`, `game/fallen.js`).
- Linnunradan pikselit ja saumaviiva (`render/sky.js`).
- Linnut ja huitaisut (`audio/sfx.js`, `game/combat.js`: `swing`-tapahtuma, `main.js`).
- Testattiin: palmu ja kookospalmu kaadettuna (osumat koko rungolla 3/3, runko hajoaa), linssipisarat kuvina (ensin liikaa ja liian tummia → harvennettiin), tyrskyt purjeveneen istuimelta myrskyssä (kuvat), linnunrata kuvana, veneiden nopeudet (purjevene sivutuulessa 5,5 → 3,6 m/s, laiva 6,3 → 4,1 m/s), puun räsähdys 2,1 s:n kaatumisessa oikeaan kohtaan, huitaisujen tasot (tasattiin huipputason mukaan), lintu. Savutesti ja ESLint puhtaat.

**Kesken / seuraavaksi**
- Käyttäjän palaute; lisää ääniä.
- Pushaa haara ja avaa PR, kun GitHub-tili toimii.

## 2026-10-07 (sessio 12c)
**Tehtiin**
- Käyttäjän palaute ja 5 äänitiedostoa (kirjattu `DESIGN.md`:hen).
- Haamun äänten vaimennus korjattu ja tasot nostettu, uusi ääntely (`audio/sfx.js`).
- Ukkosen hämärä (`render/environment.js`), haamujen syntyminen ukkosella (`game/mobs.js`).
- Salaman isku maahan: hiukkaset (`render/particles.js`: koko, kesto, painovoima, salaman valaisemat) ja tulipallo (`render/rain.js`), kytkentä `main.js`.
- Uudet äänet: aavikon tuuli, myrskytuuli (kerroksina), napsahdus heitossa (`main.js`), puun lyönti (`game/breakables.js`, `game/fallen.js`: `woodHit`).
- Testattiin: aavikko selkeä −39 dBFS / hiekkamyrsky −19 → hiljennettiin, meri ukkosella myrskytuuli mukana, haamun äänet 40 m:stä −26…−29 dBFS (ennen n. −40), napsahdus, puun lyönti (hiljennettiin), valotus selkeällä 0,95 / ukkosella 0,55 ja kuvat, salaman iskukohdan kuvat. Savutesti ja ESLint puhtaat.

**Kesken / seuraavaksi**
- Käyttäjän palaute; lisää ääniä.
- Pushaa haara ja avaa PR, kun GitHub-tili toimii.

## 2026-10-07 (sessio 12b)
**Tehtiin**
- Käyttäjän palaute ja 5 uutta äänitiedostoa (kirjattu `DESIGN.md`:hen).
- Sumu: kova raja johtui sadeverhoista 26 m:n päässä; verhot siirrettiin sumun kantamalle ja usva vain kunnon sateeseen (`render/rain.js`, `main.js`).
- Lähisalamat (`render/environment.js`, `render/rain.js`: nauhasalama hehkuineen, `index.html`/`styles.css`: näytön välähdys), jyrähdysäänet (`assets/sfx/thunder-clap1/2.mp3`, alun hiljaisuus leikattu).
- Haamun äänet (`game/mobs.js`: `haamuSound`-tapahtumat; `assets/sfx/ghost-*.mp3`).
- `audio/sfx.js`: yleiset kertaäänet suunnalla ja etäisyydellä, viidakon hiljennys ja alipäästö, puun äänen häivytys räsähdyksen jälkeen.
- Testattiin headless-Chromiumilla: viidakon taso (−41 dBFS, ennen n. −35), puun äänen loppu (hiljenee n. 0,6 s räsähdyksen jälkeen), jyrähdys myrskyn yli (+12…14 dB), Haamun äänet ja tapahtumat oikealla tekoälyllä (ilmestyminen, kirkaisu ennen syöksyä, hyökkäys, ääntely), sadeverhojen kuvat (ei rajaa), salamat kuvina 70 ja 140 m:n päästä. Savutesti ja ESLint puhtaat.

**Huomiot**
- Välähdyksen ajoitusta ei voi mitata testiselaimella (ruudut n. 0,25 s, välähdyskäyrä 0,55 s); pelissä se toimii ruudunpäivityksen tahdissa.

**Kesken / seuraavaksi**
- Käyttäjän palaute; Haamun vahinkoäänet ja muut äänet, kun käyttäjä toimittaa.
- Pushaa haara ja avaa PR, kun GitHub-tili toimii.

## 2026-10-07 (sessio 12)
**Tehtiin**
- Käyttäjän toiveet kirjattiin `DESIGN.md`:hen (sessio 12).
- Sääkierron [O] jumi korjattiin (`main.js`): kierto vain biomissa mahdollisten säiden läpi.
- Vuoristo kuivaksi (`render/environment.js`: säätaulukko, sateen ja salamoiden esto), tumbleweedit vuoristoon (`world/tumbleweeds.js`).
- Uusi `audio/sfx.js`: taustaäänikerrokset (striimaus, ristiinhäivytetyt silmukat), puun kaatumisääni (suunta, etäisyys, ajoitus kaatumisen keston mukaan), syntetisoidut askeleet. Äänet tasattiin ja muunnettiin (`assets/sfx/`, 7,7 Mt). Kytkennät: `main.js` (tasot sään ja biomin mukaan, askelmateriaali), `player/player.js` (askel- ja alastulotapahtumat, puulattia), `game/fallen.js` (kaatumisen kesto).
- Testattiin headless-Chromiumilla analysaattorilla: taustaäänten tasot biomeittain ja säittäin (savanni hiljaa, sademetsä viidakko, ukkosella sade + ukkonen + tuuli, vuoristo ja meri tuuli, hiekkamyrsky tuuli), silmukan vaihto (ristiinhäivytys, taso ei katkea), puun räsähdyksen ajoitus (huippu n. 1,9 s kohdalla, kun kaatuminen 1,9 s), kaikki 7 askelmateriaalia, kävely (15 askelta / 25 m), sääkierto vuoristossa (selkeä → pilvinen → usva → hiekkamyrsky → selkeä) ja sademetsässä (… → sade → ukkonen → sumu → selkeä). Savutesti ja ESLint puhtaat.

**Huomiot**
- Ääntä ei voi kuunnella testiympäristössä; tasot on mitattu, mutta käyttäjän korvat ratkaisevat.
- GitHub-tili on edelleen jäädytetty: commit vain paikallisesti, peli annettiin zip-pakettina.

**Kesken / seuraavaksi**
- Käyttäjän palaute äänistä ja voimakkuuksista; lisää äänitiedostoja käyttäjältä.
- Pushaa haara ja avaa PR, kun GitHub-tili toimii.

## 2026-10-07 (sessio 11)
**Tehtiin**
- Käyttäjän 15 korjaus- ja parannustoivetta (kirjattu `DESIGN.md`:hen). Kaikki toteutettiin:
  1. Tulikärpäset parvina jokien, purojen ja lampien rannoilla sekä osan akasioiden alla; ei merellä, rannalla, vuoristossa eikä aavikolla (`render/ambient.js`).
  2. Aallot pienemmiksi (`render/environment.js`, vaahtopäät `render/water.js`).
  3. Vesi ei näy veneiden sisällä: näkymätön syvyyssuoja laidan tasolla (`models/boats.js`).
  4. Uusi sade: tiheät ohuet viirut, kaukaiset sadeverhot, usva ja roiskeet (`render/rain.js`, `main.js`).
  5. Lammikot pysyviä vain sademetsässä ja keitailla; muualla sateella ilmestyvät ja kuivuvat (`world/objectTypes.js`, `world/chunkGen.js`, `render/materials.js`, `render/environment.js`, `main.js`).
  6. Säät biomeittain: uusi kuiva laterittitasankoilmasto, uudet säätaulukot, paikalliset rajoitukset, salamat vain sateen alueella, kehittäjätyökalujen ilmoitus (`render/environment.js`, `ui/devtools.js`).
  7. Rakennelmia n. 2 × ja laivanhylkyjä n. 120 / maailma, rantaviivan haku ruudukolla (`world/terrain.js`).
  8.–9. Hienovarainen linnunrata ja tähdenlennot (`render/sky.js`, `render/environment.js`).
  10. Purje: viuhkakaistojen syy (ruudukon sarakkeet suppenevat kolmion kulmaan) ja tumma varjopuoli korjattiin; lopuksi kaistat ja saumat siirrettiin varjostimeen, koska ruuduittain väritetyt kaistat näkyivät vielä porrasmaisina laikkuina (`models/boats.js`).
  11. Hento kimallus pudotetuille esineille (`game/drops.js`).
  12. Haamu latvusten alla, väistää runkoja, pakenee ylös alle 25 %:n terveydellä (`game/mobs.js`).
  13. Jousi oikeaan käteen (käsimallin peilaus), selvemmät nuolet ja lentojälki (`player/viewmodel.js`, `game/archery.js`, `models/items2.js`).
  14. Iskujen tahti: lyhyemmät jäähdytykset, hakkuussa vielä lyhyempi (`game/combat.js`).
  15. Tuulen nuolen suunta veneen paneelissa (`ui/boatHud.js`).
- Testattiin headless-Chromiumilla: veneiden istuinnäkymät (selkeä ja ukkonen: ei vettä rungon sisällä, purje ilman viuhkaa ja laikkuja), sade ja sadeverhot kuvina, säärajoitukset (meri: pöly 0, aavikko: sade 0, laterittitasanko: sade 0,01), lammikoiden kuivuminen (1 → 0 4 minuutissa), tulikärpäsmäärät (joki 229, metsikkö 43, ranta 0), linnunrata ja tähdenlento kuvina, Haamun korkeus (2,0–3,1 m kierrellessä, 6/6 osumaa paikallaan, 0/6 väistäessä, pako 13,7 m:iin ja katoaminen 8,7 s:ssa), jousi ja nuolen jälki kuvina, iskujen välit (nyrkit 0,53 s, puukko 0,45, kirves 0,67, keihäs 0,77, nuija 1,11, viidakkoveitsi 0,56 ilmaan / hakatessa), rakennelmatilastot kahdella siemenellä (n. 3 700–3 800, hylkyjä 120–122) ja hylyt kuvina rannalla. Vanhat savu-, toiminta-, taistelu-, jousi-, vene- (myös tallennus ja avomeri), eläin- ja riimukivitestit ajettiin uudelleen ilman konsolivirheitä. Avomeritestin laiva ajaa myötätuuliosuudella karille (kunto 1 200 → 1 002), mutta edellinen commit käyttäytyy testissä samoin (testireitti kulkee rannan vieressä), joten kyse ei ole regressiosta. ESLint puhdas.
- **GitHub-tili jäädytettiin väliaikaisesti kesken session.** Käyttäjän pyynnöstä työ jatkui paikallisesti: muutokset commitoitiin vain paikallisesti haaraan `claude/sahel-game-dev-yi990s` (ei pushattu, ei PR:ää eikä raw.githack-linkkiä). Käyttäjälle annettiin peli zip-pakettina paikallista testausta varten.

**Huomiot**
- Käyttäjä raportoi paketin testauksen jälkeen mustia pisteitä sademetsän sateessa (pahenivat hiirtä liikuttaessa). Syy: pisaravarjostimen pow(1 − vC.y) sai negatiivisen kannan → NaN, jonka liike-epäterävyys levitti. Korjattiin rajaamalla; testattiin sademetsän sateessa liike-epäterävyys ja DOF päällä kameraa kääntäen. Uusi paketti annettiin käyttäjälle.
- Rakennelmien solukoon muutos siirtää vanhojen maailmojen rakennelmien paikkoja.
- Kuu on pelissä aina täysi ja korkealla keskiyöllä, joten linnunradan himmennys kuun valossa on vain 30 % (muuten se ei näkyisi koskaan).
- Ensimmäinen sadeversio oli näkymätön (pisaranauhat olivat myötäpäivään, joten ne karsittiin takapintoina) ja liian harva; korjattiin kaksipuolisella materiaalilla ja tiheydellä.

**Kesken / seuraavaksi**
- Kun GitHub-tili toimii: pushaa haara, avaa PR `main`-haaraan ja anna raw.githack-linkki (myös claude.ai:n GitHub-yhteys pitää valtuuttaa uudelleen).
- Käyttäjän palaute session 11 korjauksista (paikallisesta paketista).
- Avoimet kysymykset: "mesabiomin" tulkinta, Haamu vai Aave ja pakenevan Haamun saalis, vuoriston ja meren tunnusmerkit, rakennelmien määrä.

## 2026-10-07 (sessio 10)
**Tehtiin**
- Käyttäjän 9 toivetta (kirjattu `DESIGN.md`:hen): vesiseinien korjaus, tumbleweedit vain aavikolle ja "mesabiomille", purjeiden outo käytös, liian arat ja nopeat eläimet, jokaiselle biomille tunnusomainen grafiikka (aavikon kuumuusväreily, sademetsän tihku, märkyys ja lammikot), nopeammin syvenevä meri, Haamu-vihollinen sademetsän öihin, pudotettujen esineiden hehku ja heitettyjen esineiden poimintaviive. Kaikki toteutettiin.
- Vesiseinät (`world/terrain.js`): syy selvitettiin mittaamalla jokien yhtymäkohdat (88/442:ssa yli 1,2 m:n porras, pahimmillaan 9 m). Korjaus: vedenpintojen sovittelu yhtymäkohdissa, sivujoen pinta liukuu pääuoman tasoon, kapeat purot seuraavat maastoa, järven kaivama kohta laskee joen pintaa, rakennelmat eivät tasoita uomia. Jäljelle jäi 1 (koskipaikka). Meren pohja syvenee nopeammin (`coastHeight`).
- `world/tumbleweeds.js`: elinympäristö (aavikko, dyynit, laterittitasanko, pöytävuoret), uppoaminen ja katoaminen.
- Purjeet (`models/boats.js`, `game/boats.js`): latinalaispurjeen raakapuun nosto ja lasku, käärityt purjeet keskilinjassa, pienempi lepatus.
- Arat eläimet (`game/mobs.js`): lyhyemmät huomaamisetäisyydet, hitaampi pako, tarkkailuvaihe, väsyminen, haavoittuneen hidastuminen.
- Sademetsä: märkyys jaettuihin materiaaleihin (`render/materials.js`: tummuminen, kiilto, laikuittaiset vesikalvot), lammikot (`models/flora.js`, `world/objectTypes.js`, `world/chunkGen.js`), tihku (`render/rain.js`, `main.js`), pilvet ja märkyyden kertymä (`render/environment.js`).
- Aavikon kuumuusväreily ja kangastus (`render/post.js`, `render/environment.js`).
- Uusi `render/ambient.js`: tulikärpäset ja pölypyörteet (Clauden ehdotukset muille biomeille).
- Haamu (`models/creatures.js`, `game/mobs.js`, `ui/hud.js`, `ui/devtools.js`, `main.js`): malli (kaapu, huppu, violetit silmät, hehku, jälkihehku), tekoäly (leijunta latvuksissa, kiertely, varoitus, syöksy, nousu, horjahdus, haihtuminen aamulla), nuotion valo vastakeinona, lähitaistelun korkeusehto.
- Pudotetut esineet (`game/drops.js`): hehku ja heitetyn esineen poimintaviive.
- Testattiin headless-Chromiumilla: vesiseinien mittaus ennen ja jälkeen, vesikuvat, eläinten pako (kävely, juoksu, hiipiminen, väsyminen, kiinni juokseminen), purjeet kuvina, sademetsän märkyys ja lammikot (kuvat ja varjostimen komponenttien vianetsintä), sade ja renkaat, aavikon väreily (kuvat, kehysten erotus), Haamu (kuvat, syöksyt seisten ja väistäen, ulottuvuus, nuolet ja saalis, aamu, syntymistiheys), tulikärpäset ja pölypyörre kuvina, meren syvyysprofiili ennen ja jälkeen, vanhat savu-, toiminta-, taistelu-, jousi- ja venetestit (veneet avomerellä). Ei konsolivirheitä.

**Huomiot**
- Lammikko näytti ensin vaalealta kiveltä: se heijasti kirkasta sumun väriä, vaikka metsässä heijastuu enimmäkseen tumma latvusto. Nyt lammikko on läpikuultava, heijastus noudattaa fresneliä ja reuna sulautuu maahan.
- Session 9 venetestin aloituspaikka osuu nyt pieneen lampeen (muuttuneet vesistöt), joten veneet testattiin merellä: soutu 2,4 / 3,2 m/s, purjevene sivutuulessa 5,5 m/s, laiva 6,3 m/s.
- Kuumuusväreily ei näy matalalla esiasetuksella (jälkikäsittely pois).
- Käyttäjä kirjoitti kesken työn "Try again"; työtä jatkettiin normaalisti.

**Kesken / seuraavaksi**
- Käyttäjän palaute kaikista kohdista, erityisesti Haamun vaarallisuudesta ja harvinaisuudesta, eläinten pyydystettävyydestä ja sademetsän märkyyden voimakkuudesta.
- Avoimet kysymykset: "mesabiomin" tulkinta, Haamu vai Aave, vuoriston ja meren tunnusmerkit.

## 2026-10-06–07 (sessio 9)
**Tehtiin**
- Käyttäjän 12 toivetta (kirjattu `DESIGN.md`:hen): joet eivät saa risteillä, enemmän hylättyjä paikkoja, biomit missä tahansa ja sopivan kokoisina, harvinaiset laivanhylyt rannoille, iskut harvemmaksi, keräilystä alkava peli (sienet ja kukat poimittaviksi, syötävät sienet ja myrkytys, paljon materiaaleja ja arkoja eläimiä, jousi), valtavasti esineitä ja työkaluja (nuotio ja rakennelmat vaativat työstöpenkin, joka rakennetaan vasaralla), linnunrata, 10 + 10 min vuorokausi, säät biomeittain, riimukivet käännöksineen ja veneet (soutuvene, purjevene, Santa Maria -tyylinen purjelaiva, purjeet tuulen mukaan). Kaikki 12 toteutettiin.
- Maailma (`terrain.js`, `chunkGen.js`): valumaverkon joet, biomisolut, saari meren ympäröimänä, rakennelmien taulukko (n. 1 800 / maailma), laivanhylyt ja riimukivet (`models/structures.js`, `game/ruins.js`, `game/lore.js`, `ui/runePanel.js`).
- Taistelu (`combat.js`): pidemmät jäähdytykset ja kalliimmat iskut, uudet aseet (keihäs, kivipuukko).
- Selviytyminen: `game/survival.js` (ravinto, syöminen, myrkytys, tilavaikutukset), `game/items.js` uusiksi (kymmeniä esineitä ja reseptejä, valmistus käsin / työstöpenkillä / nuotiolla), `models/items2.js` ja `models/pickups.js` (uudet mallit), `world/objectTypes.js` (poimittavat), `ui/inventoryUI.js` (välilehdet, tiedot), `ui/hud.js` (ravinto, tilavaikutukset, myrkytysreunus).
- Rakentaminen: `game/pieces.js`, `game/building.js`, `game/structures.js` uusiksi, `models/building.js`, `ui/buildMenu.js`; makuualusta herätyspaikkana ja nukkuminen, soihtu kädessä valaisee.
- Jousi (`game/archery.js`, `player/viewmodel.js`) ja arat eläimet (`game/mobs.js`, `models/creatures.js`).
- Taivas ja sää: linnunrata (`render/sky.js`), alueelliset säät ja salamat (`render/environment.js`), sade (`render/rain.js`), vuorokausi todellisessa ajassa.
- Veneet: `models/boats.js` (rungot asemista, kastellit, purjeet joiden muoto lasketaan joka ruudulla), `game/boats.js` (kelluminen, ohjaus, purjeiden veto tuulen kulman mukaan, karilleajo, korjaus, tallennus), `ui/boatHud.js`, vasaralla rakentaminen veteen, tuulen suunnan hidas kääntyminen, veneet kartoilla, F3-napit.
- Opas uusittiin keräilystä metsästykseen; valikon taustapaikka siirrettiin uuden biomijaon mukaan.
- Testattiin headless-Chromiumilla: jokikartat ja -verkon tarkistus (ei risteyksiä), biomikartat useilla siemenillä, rakennelmatilastot, iskujen tahti, keräily, syöminen ja myrkytys, rakentaminen (työstöpenkki, lattiat, seinät, katot, pinoaminen, purku), jousi (jännitys, laukaus, osuma, nuolen palautus), eläinten pako ja hiipiminen, linnunrata ja säät kuvina, riimukivien kehote ja käännös, veneet (soutu ja kestävyys, purjehdus eri tuulen kulmissa, vastatuuli, "hiljaa", karilleajo ja vauriot, rakentaminen veteen ja matalasta lähtö, kuvakkeet, tallennus ja lataus kyydissä, [E] kyytiin ja maihin oikeassa pelisilmukassa), vanhat savu- ja toimintatestit. Ei konsolivirheitä.

**Huomiot**
- Sisämaan merenlahdet ovat usein vain 1,5–2 m syviä, joten laivan syväys laskettiin 1,25 m:iin ja rakentaminen sallitaan matalaan rantaveteen, josta laiva ajetaan syvemmälle.
- Kaikki esineet, reseptit, hinnat, eläinten arvot ja riimukivien tekstit ovat Clauden paikkamerkkejä (käyttäjä antoi vapaat kädet); koottu `DESIGN.md`:hen.
- PR #1 oli jo yhdistetty, joten session 9 työ menee uuteen PR:ään.
- Sessio keskeytyi välillä (työprosessin uudelleenkäynnistys ja käyttörajan nollautuminen), ja työtä jatkettiin siitä mihin jäätiin.

**Kesken / seuraavaksi**
- Käyttäjän palaute kaikista 12 kohdasta, erityisesti iskujen tahdista, ruoasta ja myrkytyksestä, rakentamisesta ja veneistä.
- Avoimet kysymykset: riimukivien tekstit ja tarina, laivan kannella kävely ja lastiruuma, varastoarkut, metallit ja seppä, kalat.
- Tunnetut puutteet: sade sataa rakennetun katon läpi, opas peittää palkkeja kapealla näytöllä, makuualustan purku palauttaa aina pahkasian taljan.

## 2026-10-06 (julkaisu Alpha v0.1)
**Tehtiin**
- Käyttäjä pyysi pelin julkiseksi pelattavaksi versiona Alpha v0.1. Lisättiin versiomerkintä valikkoon, `.nojekyll`, pelilinkit README:hen, ja PR #1 yhdistettiin `main`-haaraan.

**Kesken / seuraavaksi**
- Käyttäjä kytkee GitHub Pagesin päälle (Settings → Pages → main / root) ja luo julkaisun Alpha v0.1 (tagi `alpha-v0.1`).
- Jatkokehitys uusissa haaroissa / PR:issä.

## 2026-10-06 (sessio 8)
**Tehtiin**
- Käyttäjän palaute: sademetsässä ei soinut musiikkia, häivytys liian pitkä, grafiikan esiasetukset (matala–ultra), lyömiseen ja komboon jäähdytys, kombo vain nopeille ja kevyille aseille, lisää tönäisyä, kuolemaefekti ja veri. Kirjattu `DESIGN.md`:hen.
- `combat.js`: uusi asetaulukko (sarja vain viidakkoveitsellä, jäähdytykset), tähtäin himmenee jäähdytyksen ajan (`hud.js`). `mobs.js`: osumahorjahdus, isompi tönäisy ja hypähdys, veriroiskeet ja kuolemalammikko. Uusi `src/render/blood.js` (pisarat ja läikät). `music.js`: sademetsä, lyhyemmät ajat. `save.js` + `menu.js` + `index.html`: grafiikan esiasetukset. `main.js`: Ultra 2× pikselitiheys, varjokartan koon muutos korjattu.
- Testattiin headless-Chromiumilla: esiasetukset ja "Oma", iskujen tahti (nyrkit 0,8 s, nuija 1,4 s, viidakkoveitsen sarja ja 1,3 s tauko), tönäisy (1,8 m, hypähdys 0,2 m), kuoleman roiske ja lammikko (kuvat), sademetsän musiikki, WebGL-varoitusten syy (Tarkka-varjot) ja korjaus, vanhat hakkuu- ja toimintatestit. Ei konsolivirheitä.

**Kesken / seuraavaksi**
- Käyttäjän palaute taistelun tahdista, tönäisystä, verestä ja esiasetuksista.
- Avoimet: oma kappale sademetsään, miekka tai muita kevyitä aseita, Alpha v0.1 -julkaisu GitHubissa (käyttäjä tekee).

## 2026-10-06 (sessio 7)
**Tehtiin**
- Käyttäjä pyysi: iskusarjojen rajoitus (yli 50 % kestävyydestä tai yksi sarja tyhjentää), kilpi varustetaan itse, savipeikot joutuvat aamulla paniikkiin ja syttyvät palamaan, F3-kehittäjätyökalut (siirtyminen, kutsuminen, lentäminen, nopeus, koko kartta) ja testityökalut pois valikosta, musiikki biomeittain ja päävalikkoon (luettelo, pelissä hiljaa, valikossa normaalisti, viive ja pitkät häivytykset), ääniasetukset, aavikko ja dyynit yhdeksi biomiksi. Kesken työn: versio nimetään GitHubissa Alpha v0.1:ksi. Kirjattu `DESIGN.md`:hen.
- Uudet tiedostot: `src/audio/music.js` (musiikki), `src/ui/devtools.js` (kehittäjätyökalut), `src/render/fire.js` (liekki-, kipinä- ja savuhiukkaset), `assets/music/` (viisi kappaletta, kansikuvat poistettu ilman uudelleenpakkausta). Muutettu: `combat.js` (sarjan raja ja hinnat), `inventory.js` + `inventoryUI.js` + `hud.js` + `interaction.js` + `viewmodel.js` (kilven varustus ja merkki), `mobs.js` (paniikki ja palaminen), `structures.js` (tulien valot jaetaan myös palaville olennoille), `explored.js` (koko kartan yleiskuva), `player.js` (lentäminen, kuolemattomuus, nopeus), `terrain.js` (`displayBiome`, dyynit = aavikko), `main.js` (F3-tila, musiikki, käynnistysklikkaus), `menu.js` + `save.js` + `index.html` + `styles.css` + `menu.css` (ääniasetukset, paneelit).
- Musiikin äänekkyys mitattiin (ffmpeg, EBU R128) ja kappaleet tasattiin samaan voimakkuuteen; kappaleiden alut ja loput häivyttyvät itsestään, joten tavallinen silmukka soi luontevasti.
- Testattiin headless-Chromiumilla: käynnistysruutu ja valikon musiikki, ääniasetukset (tallentuvat ja vaikuttavat heti), musiikin tilakone simuloituna (valikko → lataus → savanni → aavikko 45 s pidolla → 60 s rajalla edestakaisin ilman vaihtoa → sademetsä hiljenee → takaisin savanniin → valikkoon), musiikki oikeassa pelissä, F3-paneeli ja siirtyminen aavikolle, lentäminen, koko kartan paljastus (kuva), kilven varustus ja torjunta, kombo (yksi sarja, sitten yksittäiset iskut), savipeikon paniikki, palaminen ja tuhka (kuvat), vanhat taistelu-, hakkuu- ja toimintatestit. Ei konsolivirheitä.

**Huomiot**
- GitHub-tagin `alpha-v0.1` pushaus estettiin (403: tämä ympäristö saa pushata vain kehityshaaraan), eikä julkaisun luontiin ollut työkalua. Käyttäjälle annettiin ohjeet ja valmis julkaisuteksti.
- Selaimet päästävät äänen soimaan vasta klikkauksen jälkeen, siksi käynnistyksessä on "Klikkaa jatkaaksesi".
- Hiekan jäljet -kappale on repossa (`assets/music/hiekan-jaljet.mp3`), mutta ei käytössä, koska se ei ollut luettelossa.

**Kesken / seuraavaksi**
- Käyttäjän palaute musiikin voimakkuuksista ja ajoituksista, kehittäjätyökaluista, kombojen rajoituksesta ja palavista savipeikoista.
- Avoimet kysymykset: Hiekan jäljet -kappaleen paikka, musiikki muihin biomeihin ja tapahtumiin, äänitehosteet.

## 2026-10-06 (sessio 6)
**Tehtiin**
- Käyttäjän palaute sessiosta 5: DOF liian voimakas, kasvien pieni huojunta pitää säilyä myös tyynellä, purot ja joet olivat paikoin maasta koholla ja vesi valui reunojen yli, meren aallot käyttäytyivät oudosti. Kaikki korjattiin (ks. `CHANGELOG.md` ja `DECISIONS.md`).
- Käyttäjä pyysi seuraavaksi taistelun: kestävyys ja terveyspalkki, iskut ja kombot tietyillä aseilla (puunuija, viidakkoveitsi), torjunta hiiren oikealla (kilpi, ase, osa työkaluista, kädet), parry, pieni tönäisy pelaajalle ja olennoille, villieläin sopivaan biomiin, heikko vihollinen öisin kaikkiin biomeihin, karttamerkeille nimet, uinti kuluttaa kestävyyttä ja sen loputtua hukkuu, Ctrl = kyykky. Kirjattu `DESIGN.md`:hen.
- Uudet tiedostot: `src/game/combat.js` (iskusarjat, torjunta, parry, osumat), `src/game/mobs.js` (syntyminen, tekoäly, liike, osumat, kuolema), `src/models/creatures.js` (pahkasika ja savipeikko nivelineen). Muutettu: `player.js` (terveys, tönäisy, kyykky, uinnin kestävyys, hukkuminen, kuolema), `viewmodel.js` (uudet iskuanimaatiot asentoina, torjunta-asennot, vasemman käden kilpi, erillinen kyynärvarsi, osumapysäys), `hud.js` + `index.html` + `styles.css` (palkit, osuma- ja hukkumisreunus, parry-teksti, kuolemaruutu), `interaction.js` (iskut siirtyivät combat.js:ään, olennon nimi ja terveys tähtäimessä), `items.js` + `models/items.js` (puunuija, viidakkoveitsi, puukilpi, liha, nahka, savi), `ruins.js` (viidakkoveitsi arkkuihin), `bigMap.js` + `explored.js` + `minimap.js` (merkkien nimet), `main.js` (kytkennät, herääminen, testinapit, poistumisvahvistus).
- Testattiin headless-Chromiumilla: kaikkien aseiden iskuasennot kuvina (korjattiin käsivarsi, joka kääntyi isoissa iskuissa näkökenttään), olentojen mallit ja animaatiot (päivä, yö, maasta nousu, syöksyn varoitus, kuolema), logiikkatestit aika-askelilla (kyykky, pahkasika pakenee ja kyykyssä ei, nuijan kombo 11+11+24 vahinkoa ja kuolema, pahkasika hyökkää takaisin, torjunta 60 % / kilpi 90 %, parry horjuttaa, savipeikko syntyy yöllä ja hyökkää, viidakkoveitsi kaataa sen, aamulla murenee, hukkuminen, kuolema ja herääminen), karttamerkkien nimeäminen hiirellä ja näppäimistöllä, vanha toimintatesti (hakkuu, kaatuminen, saaliit, tallennus). Ei konsolivirheitä.

**Huomiot**
- Ctrl+W sulkee selaimen välilehden, eikä peli voi estää sitä. Siksi kyykky on kytkin (Ctrl tai C), ja peli kysyy pelin aikana ennen sivulta poistumista.
- Viidakkoveitsi löytyy vain arkuista; testaamista varten taukovalikon "Kutsu"-rivillä on "Aseet"-nappi sekä pahkasian ja savipeikon kutsu.
- Arvot (vahingot, nopeudet, ikkunat) ovat paikkamerkkejä ja helposti säädettävissä (`combat.js`, `mobs.js`, `config.js`).

**Kesken / seuraavaksi**
- Käyttäjän palaute taistelusta (tuntuma, vaikeus, animaatiot), olennoista ja uinnista.
- Avoimet kysymykset: lihan, nahan ja saven käyttö, viidakkoveitsen lähde, kuoleman seuraukset, savipeikko vai muu yön olento.

## 2026-10-06 (sessio 5)
**Tehtiin**
- Käyttäjä raportoi bambujen tärinän ja pyysi: lisää sisältöä ja maastonmuotoja biomeihin; sademetsään lampia, järviä, jokia ja puroja, Saheliin harvoin pieniä jokia, vuoristoon järviä ja puroja; uusi meribiomi; veden fysiikka (aallot sään mukaan, molskahdus ja aallot hypätessä, kävellessä ja esinettä heittäessä); realistiset varjot, ilmakehä, god rays; liike-epäterävyys ja DOF asetuksiin. Kirjattu `DESIGN.md`:hen.
- Bambun korjaus: korkeille kasveille oma tuulimateriaali (`tall`), pisteittäinen lepatus pois.
- Maasto (`terrain.js`) kirjoitettiin uusiksi: meri ja rannat, veden pinta (wl) jokaiselle pisteelle, joet ja purot (kohinan nollakohdat, uoma, penger, laakso, virtaus uoman suuntaan), järvet (reunan matalin kohta), graniittikalliot ja pöytävuoret, Sahelin kumpareet.
- Vesi: `render/water.js` (Gerstner-aallot, heijastus, vaahto, virtaus), `render/ripples.js` (aaltoyhtälö näytönohjaimella), `render/splash.js` (roiskeet), `world/waves.js` (yhteiset aaltokaavat), vesiverkko chunkeittain (`chunkGen.js`). Pelaaja ui aaltojen mukana, esineet kelluvat tai uppoavat, [Q] heittää esineen.
- Grafiikka: SunLight-varjokaskadit (three.js r186 addon kopioitu `vendor/three/addons/lights/`), `render/post.js` (valonsäteet, ilmakehän hehku, DOF, liike-epäterävyys), taivaan sironta. Asetuksiin kolme uutta valintaa.
- Sisältö: `models/flora.js` (14 uutta mallia), uusia esinetyyppejä ja sijoittelusääntöjä (kallioille lohkareita, lumpeet veden pinnalle).
- Testattiin headless-Chromiumilla: koko maailman kartat (vesistöjen määrät tilastona), kuvat rannasta, merestä (myös myrsky ja uinti), järvestä, joesta, purosta, väreilystä ja roiskeista, valonsäteistä (auringonlasku, sademetsä, usva), DOF:sta ja liike-epäterävyydestä sekä kaikista biomeista; fysiikkatesti aika-askelilla (puu kelluu, kivi uppoaa, risu ajelehtii joessa, hyppy veteen roiskuu); vanha toimintatesti. Ei konsolivirheitä.

**Huomiot**
- Kolmioita piirretään sademetsässä noin miljoona ruutua kohden (varjokaskadit mukaan lukien). Hitaalla koneella kannattaa laittaa varjot pois tai tehosteita pois.
- Vanhat tallennetut maailmat näyttävät erilaisilta, koska generointi muuttui.
- Joki voi paikoin kulkea loivasti ylämäkeen (veden pinta seuraa maaston loivaa muotoa), mutta virtaus näkyy aina alamäkeen.

**Kesken / seuraavaksi**
- Käyttäjän palaute vesistöistä, merestä, veden fysiikasta, grafiikasta ja suorituskyvystä.
- Avoimet kysymykset: meren takana, sukellus, kalat, juomavesi; aiemmat (arvoesineet, kartta esineenä, arkkujen uusiutuminen).

## 2026-10-06 (sessio 4)
**Tehtiin**
- Käyttäjä pyysi: (1) pehmeämmät valikko-, juoksu- ja työkaluanimaatiot, (2) karttaesikatselu pois maailman luonnista; pelissä tyhjä karttapohja, joka piirtyy tutkiessa, ja M:stä iso interaktiivinen kartta merkkeineen (raksi, pallukka, talo…), (3) biomien hiominen (sademetsä tiheäksi ja vaikeakulkuiseksi, vuoristo ja muut paremmiksi), (4) satunnaiset rakennelmat: kivikehät Saheliin, hylätyt leirit aavikolle, harvinaiset talon/kylän rauniot kaikkialle; 45 % arkku tavallisella saaliilla, 10 % arkuista arvoesineitä. Kirjattu `DESIGN.md`:hen.
- Toteutettiin kaikki (ks. `CHANGELOG.md`). Uudet tiedostot: `src/world/chunkGen.js`, `genWorker.js`, `genPool.js` (generointi taustasäikeissä), `src/models/structures.js`, `src/game/ruins.js` (rakennelmat ja arkut), `src/ui/explored.js` (tutkittu kartta ja merkit), `src/ui/bigMap.js` (iso kartta). `minimap.js`, `viewmodel.js`, `instancePool.js`, `world.js` ja `objectTypes.js` kirjoitettiin pitkälti uusiksi.
- Testattiin headless-Chromiumilla: kartan paljastuminen, merkkien lisäys/poisto, zoom ja vieritys, tallennus ja lataus; rakennelmat ja arkun avaus (saaliit putoavat maahan); biomikuvat; käden animaation jatkuvuus mitattiin ruutu kerrallaan (juoksuun siirtymän suurin hyppäys 0,35 rad → 0,03 rad); valikon käärön auki/kiinni-asennot; vanha toiminnallinen regressiotesti (hakkaaminen, kaatuminen, saaliit, tallennus). Ei konsolivirheitä.

**Huomiot**
- Headless-selaimessa CSS-animaatiot käynnistyvät hitaasti, joten testissä kartan koko pitää lukea vasta animaation jälkeen. Peli itse lukee koon ilman animaation skaalausta.
- Todellista ruudunpäivitystä ei voi mitata ilman GPU:ta; käyttäjän kannattaa kertoa, tuntuuko kävely ja valikko nyt sulavalta.

**Kesken / seuraavaksi**
- Käyttäjän palaute kartasta, rakennelmista, sademetsästä ja animaatioista.
- Avoimet kysymykset: arvoesineiden käyttö, onko kartta aina käytössä, uusiutuvatko arkut.

## 2026-10-06 (sessio 3)
**Tehtiin**
- Käyttäjä kehui prototyyppiä ja pyysi jatkokehitystä: hajoaminen ja putoavat saaliit, puiden kaatuminen ja lovet, mallikuvan mukainen päävalikko (Pelaa + Asetukset, pehmeät animaatiot) sekä valtava, joka kerta omalla siemenellä generoitava vyöhykkeellinen maailma (luonnos: spawn, tier 1 Sahel, tier 2 aavikko + sademetsä, vuoristoreuna). Kirjattu `DESIGN.md`:hen.
- Toteutettiin kaikki pyydetyt asiat (ks. `CHANGELOG.md`). Mallikoodi jaettiin useaan tiedostoon (`src/models/`), uusia järjestelmiä: `treeCut.js`, `fallen.js`, `breakables.js`, `drops.js`, `debris.js`, `menu.js`, `menu.css`.
- Testattiin headless-Chromiumilla: kuvat päävalikosta, maailmojen valinnasta, asetuksista, taukovalikosta, kaikista uusista biomeista ja hajoamisen vaiheista; toiminnallinen testi (pensas -> saaliit -> automaattinen poiminta, puun lovi -> kaatuminen -> pilkkominen, kiven säröt -> murskautuminen, tallennus). Ei konsolivirheitä.

**Huomiot**
- Headless-testissä (SwiftShader, n. 5 FPS) CSS-animaatiot näyttävät viivästyvän; oikeassa selaimessa ne toimivat normaalisti.
- Iso vesitaso piirtyi ohjelmistorenderöijällä maan päälle; korjattiin jakamalla taso pienempiin kolmioihin.
- Hiiren lukitusta ei voi testata headless-selaimessa; pelin aloitus vaatii "Klikkaa pelaamaan" -napin painalluksen.

**Kesken / seuraavaksi**
- Käyttäjän palaute uusista ominaisuuksista.
- Avoimet kysymykset (`DESIGN.md`), erityisesti maailman reunan takainen alue ja valikon taustakuva.
- Tier 2 -biomeille omia resursseja ja oppaan jatkovaiheita.

## 2026-10-06 (sessio 2)
**Tehtiin**
- Käyttäjä kertoi konseptin: Valheim/Minecraft-tyyppinen selviytymispeli Burkina Fason Sahelissa, 3D avoin maailma, ensimmäinen persoona, näkyvä käsi, vuorokausi, neljä säätä, opas oikealla alhaalla, minikartta biomin nimellä oikealla ylhäällä. Musiikki/äänet tulevat myöhemmin. Kirjattu `DESIGN.md`:hen.
- Tehtiin ensimmäinen pelattava prototyyppi selaimeen (three.js, ei käännösvaihetta). Sisältö ks. `CHANGELOG.md`.
- Testattiin headless-Chromiumilla: kuvakaappaukset kaikista säistä, vuorokaudenajoista ja biomeista; toiminnallinen testi (poiminta, hakkuu, valmistus, kaato, louhinta, nuotion asettaminen, tallennus). Ei konsolivirheitä.
- Optimoitiin kolmiomäärä ~1,2 M → ~650 k / ruutu.
- Repo on nyt julkinen, joten raw.githack-linkki toimii.

**Huomiot**
- Headless-testissä (SwiftShader) näkyy vasemmassa alakulmassa suorakulmainen tekstuuriartefakti; se johtuu ohjelmistorenderöijästä, ei pelistä (katoaa kun maastotekstuuri poistetaan).
- CC0-tekstuuri-/mallipalvelut (Poly Haven, ambientCG) ovat estettyjä Clauden ympäristöstä, joten tekstuurit ja mallit ovat proseduraalisia.
- Todellista ruudunpäivitystä ei voitu mitata (ei GPU:ta); käyttäjän kannattaa kertoa, pyöriikö peli sujuvasti.

**Kesken / seuraavaksi**
- Käyttäjän palaute prototyypistä.
- Avoimet kysymykset `DESIGN.md`:ssä (selviytymismittarit, eläimet, rakentaminen, hahmo).
- Oppaan jatkovaiheet, kun pelin suunta tarkentuu.

## 2026-10-06 (sessio 1)
**Tehtiin**
- GitHub-repon luonti `gh`:lla epäonnistui (403, istunto sidottu valmiiksi määritettyihin repoihin). Käyttäjä pyysi tekemään sen hänen puolestaan, joten repo `KSPKtech/sahel` luotiin selaimella käyttäjän omalla GitHub-kirjautumisella. Näkyvyys: yksityinen.
- Repo liitettiin istuntoon ja ensimmäinen commit pushattiin `main`-haaraan.
- Pystytettiin paikallinen projektin runko ja muistiinpanot (`README.md`, `CLAUDE.md`, `docs/`).
- Tehtiin ensimmäinen paikallinen commit.
- Kirjoitettiin `CLAUDE.md` uusiksi Claude Codea varten: muistiinpanojen luku/kirjoitus, haara + PR, raw.githack-linkki joka työn lopuksi.

**Kesken / seuraavaksi**
- Päätettävä repon näkyvyys: raw.githack toimii vain julkisille repoille.
- Selvitettävä pelin konsepti, genre, moottori ja alusta (ks. `DESIGN.md`).
