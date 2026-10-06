# Sessioloki

Uusin merkintä ylimpänä.

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
