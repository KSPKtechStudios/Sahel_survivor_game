# Sessioloki

Uusin merkintä ylimpänä.

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
