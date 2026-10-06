# TODO

## Heti (odottaa käyttäjää)
- [ ] Käyttäjä testaa jäähdytyksen, tönäisyt, veren ja kuolemaefektin, grafiikan esiasetukset ja sademetsän musiikin
- [ ] Vastaus: oma kappale sademetsään? Miekka tai muita kevyitä aseita?
- [ ] Käyttäjä luo GitHubiin julkaisun **Alpha v0.1** (tagi `alpha-v0.1`, commit 03a2b3b); tagin pushaus oli estetty tästä ympäristöstä
- [ ] Käyttäjä testaa musiikin (voimakkuudet, viiveet, häivytykset), ääniasetukset, kehittäjätyökalut [F3], kombojen rajoituksen, kilven varustamisen ja palavat savipeikot
- [ ] Vastaus: mihin Hiekan jäljet -kappale; musiikki sademetsään, vuoristoon, rannalle, yöhön tai taisteluun?
- [ ] Käyttäjä testaa taistelun (iskusarjat nuijalla ja viidakkoveitsellä, torjunta, parry, tönäisyt), pahkasian, savipeikot yöllä, uinnin ja hukkumisen, kyykyn, karttamerkkien nimet sekä korjatut joet, aallot ja DOF:n
- [ ] Vastaus: mihin liha, nahka ja savi; mistä viidakkoveitsi; mitä kuollessa tapahtuu (reppu, herätyspaikka)?
- [ ] Käyttäjä kertoo, pyöriikö peli sujuvasti (varjokaskadit ja jälkikäsittely lisäävät näytönohjaimen työtä)
- [ ] Vastaus: mitä meren takana on, voiko sukeltaa, kalat, juomavesi?
- [ ] Käyttäjä testaa kartan (minikartta + [M]), rakennelmat ja arkut, uudet biomit sekä animaatioiden sulavuuden ja antaa palautetta
- [ ] Vastaus: mihin arvoesineitä käytetään?
- [ ] Vastaus: onko kartta aina käytössä vai pitääkö se ensin valmistaa / löytää?
- [ ] Vastaus: mitä maailman reunan takana on (nyt läpäisemättömät vuoret)?
- [ ] Vastaus: valikon tausta maalauksena (mallikuva ilman logoa/nappeja) vai elävä 3D-maailma (nyt)?
- [ ] Vastaukset muihin avoimiin kysymyksiin (`DESIGN.md`): selviytymismittarit, eläimet/viholliset, rakentaminen, hahmo
- [ ] Ambient-äänet ja äänitehosteet (käyttäjä toimittaa; musiikki tehty sessiossa 7)

## Seuraavaksi (ehdotuksia)
- [ ] Äänet osumiin, torjuntaan ja olentoihin (kun käyttäjä toimittaa äänet)
- [ ] Lisää eläimiä (esim. antilooppi) ja vihollisia; viholliset raunioihin?
- [ ] Ruoka: lihan paistaminen nuotiolla (jos käyttäjä haluaa)
- [ ] Työkalujen ja aseiden kuluminen (avoin kysymys)
- [ ] Oppaaseen lisää vaiheita, kun pelin suunta tarkentuu (esim. aavikon ja sademetsän resurssit, arkkujen etsiminen)
- [ ] Kartalle rakennelmien merkintä automaattisesti, kun ne on nähty (jos halutaan)
- [ ] Kompassi tai merkkien suunta näytön yläreunaan (jos halutaan)
- [ ] Tier 2- ja vuoristobiomeille omia resursseja, jotta niihin kannattaa matkata (rakennelmat ja arkut ovat ensimmäinen syy)
- [ ] Kaukaiset vuoret näkyviin (kevyt kaukomaasto näköetäisyyden ulkopuolelle)
- [ ] Resurssien uusiutuminen (risut, kivet, pensaat)
- [ ] Esineen pudottaminen repusta maahan ja pinojen jakaminen
- [ ] Kannon poistaminen / juurakon kaivaminen
- [ ] Rinteen jyrkkyysraja kävelyyn (nyt mihin tahansa pääsee, myös pöytävuorille ja kallioille)
- [ ] Veden alla näkymä (jos sukellus lisätään): sumu ja väri veden alla
- [ ] Varjojen kevennys: kevyemmät varjomallit puille tai varjojen harvempi päivitys kaukana
- [ ] Vanhojen tallennusten esineiden tunnisteet säilyvät, kun esinetyyppejä lisätään (nyt uudet tyypit muuttavat järjestystä)

## Myöhemmin (grafiikan jalostus)
- [ ] Oikeat CC0-tekstuurit maastoon (hiekka, lateriitti, kivi, sademetsän maa), normaalikartat
- [ ] glTF-mallit proseduraalisten tilalle (sama nimi `src/models/`-tiedostoissa)
- [ ] Parempi käsimalli (luut/animaatiot), vesi-shader, jälkikäsittely (bloom, värimäärittely)
- [ ] Päätä lopullinen nimi (Sahel vai jokin muu)

## Valmis
- [x] Jäähdytys, kombot vain kevyille aseille, lisää tönäisyä, veri ja kuolemaefekti, grafiikan esiasetukset, sademetsän musiikki, lyhyemmät häivytykset, varjokorjaus (2026-10-06, sessio 8)
- [x] Musiikki (päävalikko, savanni, aavikko, meri) viiveillä ja häivytyksillä, ääniasetukset (2026-10-06, sessio 7)
- [x] Kehittäjätyökalut [F3]: lentäminen, nopeus, kuolemattomuus, siirtyminen, olennot, esineet, sää, aika, koko kartta (2026-10-06, sessio 7)
- [x] Iskusarjojen rajoitus, kilven varustaminen, savipeikot palavat aamulla, dyynit yhdistetty aavikkoon (2026-10-06, sessio 7)
- [x] Korjaukset käyttäjän palautteesta: DOF hienovaraisemmaksi, huojunta myös tyynellä, jokien penkereet, meren aallot (2026-10-06, sessio 6)
- [x] Terveys ja kestävyys, kuolema ja herääminen, uinti ja hukkuminen, kyykky (2026-10-06, sessio 6)
- [x] Taistelu: iskusarjat, torjunta, parry, tönäisyt; puunuija, viidakkoveitsi, puukilpi (2026-10-06, sessio 6)
- [x] Pahkasika ja savipeikko (2026-10-06, sessio 6)
- [x] Karttamerkkien nimet (2026-10-06, sessio 6)
- [x] Käyttäjä testasi vesistöt, veden fysiikan ja grafiikan (palaute korjattu sessiossa 6)
- [x] Meri ja hiekkarannat, joet, purot, järvet ja lammet; graniittikalliot ja pöytävuoret (2026-10-06, sessio 5)
- [x] Veden fysiikka: aallot sään mukaan, väreily, roiskeet, kelluminen, uinti aaltojen mukana, esineen heitto [Q] (2026-10-06, sessio 5)
- [x] Grafiikka: kaskadoidut varjot, valonsäteet, ilmakehä, DOF ja liike-epäterävyys asetuksiin (2026-10-06, sessio 5)
- [x] Lisää sisältöä biomeihin ja bambujen tärinän korjaus (2026-10-06, sessio 5)
- [x] Tutkittava kartta: tyhjä minikartta piirtyy kulkiessa, iso kartta [M] merkkeineen, karttaesikatselu pois maailman luonnista (2026-10-06, sessio 4)
- [x] Satunnaiset rakennelmat (kivikehät, leirit, rauniot), arkut 45 %, arvoesineet 10 % (2026-10-06, sessio 4)
- [x] Biomit hiottu: tiheä sademetsä, keitaat, uusittu vuoristo (2026-10-06, sessio 4)
- [x] Sulavuus: generointi taustasäikeisiin, pehmeämmät käsi- ja valikkoanimaatiot (2026-10-06, sessio 4)
- [x] Hajoaminen (lovet, säröt, murskautuminen), puiden kaatuminen ja pilkkominen, fyysiset saaliit (2026-10-06, sessio 3)
- [x] Uusi päävalikko + maailmojen valinta + asetukset + taukovalikko (2026-10-06, sessio 3)
- [x] Vyöhykkeellinen valtava maailma omalla siemenellä, aavikko, sademetsä, vuoristo (2026-10-06, sessio 3)
- [x] LOD ja kaukomallit (2026-10-06, sessio 3)
- [x] Ensimmäinen pelattava prototyyppi (2026-10-06, sessio 2)
- [x] Teknologia valittu: selain + three.js (2026-10-06)
- [x] Pelin konsepti saatu käyttäjältä ja kirjattu `DESIGN.md`:hen (2026-10-06)
- [x] Repo julkinen, raw.githack-linkit toimivat (2026-10-06)
- [x] GitHub-repo KSPKtech/sahel luotu ja runko pushattu (2026-10-06)
- [x] Projektin runko ja muistiinpanokansio (2026-10-06)
