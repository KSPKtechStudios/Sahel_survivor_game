# Päätökset

Muoto: päivä, päätös, syy.

## 2026-10-06 (sessio 5)
- **Meri on maailman ulkoreunalla sademetsän puolella, vuoret aavikon puolella.** Syy: käyttäjä pyysi meribiomia; sademetsän takana oleva meri muistuttaa Guineanlahtea (aavikko ja vuoret pohjoisessa). Meri vie noin 43 % reunasta, ja siinä on rantahiekkaa sekä harvoin saaria.
- **Joka pisteellä on veden pinta (wl).** Merenpinta on kaikkialla; lisäksi joet, purot ja järvet ovat omalla korkeudellaan. Piste on veden alla, jos maa on pintaa alempana. Syy: vuoristojärvet ja joet tarvitsevat muita pintoja kuin merenpinnan, ja sama tieto palvelee maastoa, vettä, esineitä, pelaajaa ja karttaa.
- **Joet ja purot kulkevat kohinakentän nollakohtaa pitkin (mutkat domain warpilla).** Etäisyys uomasta arvioidaan kentän arvosta ja gradientista. Veden pinta seuraa maaston loivaa muotoa, ja maastoon kaivetaan uoma, penger ja laakso. Syy: deterministinen ja chunkeittain laskettava ilman koko maailman simulointia. Joki voi paikoin virrata loivasti ylämäkeen, koska virtausta ei simuloida; virtaus näytetään aina pintaa alas.
- **Järven pinta asetetaan reunan matalimman kohdan alle**, ja rannalle tehdään matala penger. Järvet eivät osu jokiin. Syy: vesi ei saa näkyä valumassa reunan yli.
- **Vesipinta on chunkeittain oma verkkonsa samalla ruudukolla kuin maasto**, ja pisteissä on syvyys, avoimuus, virtaus ja värit. Syy: rantaviiva syntyy maaston ja veden leikkauksesta siististi, ja vesi voi olla eri korkeuksilla.
- **"Nestefysiikkamoottori" toteutettiin pelien tapaan:** aallot ovat Gerstner-aaltoja (korkeus tuulen mukaan), pelaajan ympärillä lasketaan aaltoyhtälöä näytönohjaimella (väreily ja renkaat), roiskeet ovat hiukkasia ja esineillä on noste. Syy: oikea 3D-nestesimulaatio (SPH/FLIP) koko avoimeen maailmaan ei ole selaimessa mahdollinen; tämä näyttää ja tuntuu oikealta ja on kevyt.
- **Kelluvat esineet: puu, risut ja kuitu.** Kivet, työkalut ja metallit uppoavat. Syy: luonteva fysiikka; listaa on helppo muuttaa (items.js: floats).
- **Esineen heitto [Q].** Syy: käyttäjä halusi heittää esineitä veteen; repusta ei ennen voinut pudottaa mitään.
- **Aurinko on three.js:n SunLight (kaksi varjokaskadia).** Syy: tarkat varjot lähellä ja varjot myös kauas ilman omaa toteutusta; varjojen reunat pehmenevät etäisyyden mukaan. Kaskadit tuplaavat varjopiirron, joten heikolle koneelle on "Varjot: Pois".
- **Jälkikäsittely omana kevyenä putkenaan (render/post.js):** maailma piirretään HDR-kuvaan syvyyksineen, sitten valonsäteet (säteittäinen sumennus kohti aurinkoa), ilmakehän hehku sumussa, DOF ja liike-epäterävyys, lopuksi sävytys. Käsi piirretään päälle ilman tehosteita. Syy: ei tarvita koko EffectComposeria, ja kaikki tehosteet saa pois (silloin piirretään suoraan kuten ennen).
- **Oletusasetukset:** valonsäteet päällä, liike-epäterävyys ja DOF pois. Syy: säteet tekevät eniten tunnelmaa; DOF ja liike-epäterävyys ovat makuasioita.
- **Uudet kasvit ja muodostumat ovat Burkina Fason luontoon sopivia paikkamerkkejä** (karitepuu ja doumpalmu ovat Sahelin tunnusomaisia puita, graniittikalliot kuten Sindoun ja Nahourin kalliot). Syy: käyttäjä pyysi lisää sisältöä biomeihin.
- **Vanhojen maailmojen maasto muuttuu** (sama siemen, uusi generointi). Syy: maaston ja esineiden generointi muuttui; tallennus toimii, mutta maailma näyttää erilaiselta.

## 2026-10-06 (sessio 4)
- **Kartta paljastuu ruuduittain (512 m, 4 m/pikseli), ja maasto lasketaan generointisäikeessä.** Syy: pääsäikeessä tehty minikarttalaskenta nyki kävellessä. Ruutuja pyydetään vain piirtoa varten, korkeintaan kaksi kerrallaan, jotteivät chunkit jää jonoon.
- **Tallennukseen menee vain karkea bittikartta (16 m solut) tutkitusta alueesta**, ja pehmeä maski rakennetaan siitä latauksessa. Syy: tallennus pysyy pienenä (n. 170 merkkiä / ruutu). Ladattu alue on hieman reunoiltaan pienempi kuin pelatessa piirretty.
- **Minikartta kääntyy pelaajan mukana, iso kartta on pohjoinen ylöspäin.** Syy: minikartassa katsesuunta on luontevasti ylös (kuten ennen), isossa kartassa merkkien asettelu on helpompaa kiinteällä suunnalla.
- **Merkkisymbolit: raksi, pallukka, talo, lippu, tähti.** Syy: käyttäjä mainitsi raksin, pallukan ja talon esimerkkeinä; lippu ja tähti lisättiin, koska "paria erilaista" -merkkiä varten pieni valikoima on kätevä. Helppo muuttaa (`src/ui/explored.js`).
- **Isossa kartassa maailma jatkaa kulkuaan** (kuten repussakin). Syy: selviytymispeleissä tapana; tauko on erikseen [Esc].
- **Chunkien generointi siirrettiin Web Workeriin** (2 säiettä, varajärjestelmänä pääsäie). Syy: chunkin laskenta kesti 15–20 ms ja aiheutti nykimistä kävellessä. Säikeissä ei voi käyttää import mapia, joten generointikoodi ei tuo three.js:ää.
- **Instanssipoolit tiivistetään** (poistettu instanssi korvataan viimeisellä). Syy: pooleihin jäi nollamatriiseja, jotka piirrettiin silti, ja kolmiomäärä kasvoi kävellessä yli miljoonaan.
- **Rakennelmien paikat tulevat siemenestä 320 m soluista** (24 % soluista, biomin mukaan painotettu tyyppi), ja maasto tasoitetaan rakennelman kohdalta. Arkun sisältö lasketaan rakennelman siemenestä, joten se on joka kerta sama; avatut arkut tallennetaan. Syy: deterministinen kuten muukin maailma, ei tarvitse tallentaa rakennelmia.
- **Rauniot ovat kaikissa biomeissa harvinaisia (n. 7–8 % soluista)**; Sahelissa yleisimpiä ovat kivikehät ja aavikolla leirit. Syy: käyttäjä pyysi kivikehiä Saheliin, leirejä aavikolle ja harvinaisia raunioita kaikkialle.
- **Arvoesineet (kultahippu, kaurikotilo, pronssirannerengas) ovat toistaiseksi vain kerättäviä.** Syy: käyttötarkoitusta ei ole päätetty (avoin kysymys). Kaurikotilo ja pronssi valittiin, koska ne sopivat Länsi-Afrikan historiaan (kotilorahat, pronssityöt).
- **Sademetsä on tiheä, ja raskaus hoidetaan lyhyellä piirtoetäisyydellä sumun sisällä.** Syy: käyttäjä halusi tiheän, vaikeakulkuisen sademetsän; sumu (n. 95 m) peittää piirtoetäisyyden rajan. Kulku on 30 % hitaampaa.
- **Käden animaatiot lasketaan pehmennetyistä tiloista** (juoksu, ilmassa olo ja hiiren liike liukuvat; iskut avainkehyksistä). Syy: käyttäjä koki juoksu- ja työkaluanimaatiot nykiviksi; mittauksessa juoksuun siirtyminen hyppäsi 0,35 rad yhdessä ruudussa, nyt alle 0,03.
- **Valikon animaatiot vain transformilla ja läpinäkyvyydellä.** Syy: sumennus, clip-path ja left/right-animaatiot lasketaan pääsäikeessä, joka piirtää samalla 3D-taustaa, joten ne nykivät. Transform/opacity-animaatiot pyörivät näytönohjaimella.

## 2026-10-06 (sessio 3)
- **Maailma on vyöhykkeellinen ympyrä (säde 10 km), ja joka maailmalla on oma siemen.** Syy: käyttäjän luonnos (spawn -> tier 1 Sahel -> tier 2 aavikko/sademetsä -> vuoristoreuna) ja toive valtavasta maailmasta. Vyöhykkeiden rajat vääristetään kohinalla, jotta ne ovat epäsäännöllisiä ja joka siemenellä erilaisia.
- **Aavikko ja sademetsä painottuvat maailman vastakkaisille puolille** (suunta arvotaan siemenestä). Syy: pelkkä kohina sekoitti ne pieniksi läikiksi; näin syntyy yhtenäisiä alueita, vähän kuin Sahara pohjoisessa ja Guinean metsät etelässä.
- **Maailman reunan takana on läpäisemätön vuoriseinämä**, ja pelaaja työnnetään takaisin. Syy: luonnoksessa ulkoreuna on vuoristoa; reunan takaa ei ole päätetty (avoin kysymys).
- **Chunkien maasto tallennetaan paikallisissa koordinaateissa.** Syy: 10 km päässä keskeltä float32-tarkkuus riittää näin paremmin.
- **Etäisyystasot (LOD):** lähellä tarkka malli ja varjo, kauempana kevyt malli ilman varjoa, pienet esineet (risut, kivet, pensaat) piilotetaan kaukana. Syy: tiheä sademetsä olisi muuten liian raskas; kolmioita on nyt n. 550 tuhatta.
- **Hakattava esine irrotetaan instanssipoolista omaksi Meshikseen.** Syy: vain siihen voi tehdä lovia (verteksien muokkaus) ja säröjä (oma materiaali). Lovi tehdään tiheärunkoiseen versioon puusta, joka luodaan vain tarvittaessa.
- **Puun lovi tulee aina kiinteään kaatokohtaan** sille puolelle, josta lyödään. Syy: puu halkaistaan kaatuessa kannoksi ja kaatuvaksi osaksi juuri siitä kohdasta (rungossa on siinä verteksirengas).
- **Kaatuminen on yksinkertaista fysiikkaa** (sauva kaatuu tukipisteen ympäri, kiihtyvyys ~ sin(kulma), pomppu maahan osuessa). Syy: näyttää luonnolliselta ilman fysiikkakirjastoa.
- **Kaatumissuunta on satunnainen, mutta ei suoraan pelaajaa kohti.** Syy: käyttäjä halusi satunnaisen suunnan; pieni poikkeus estää puuta kaatumasta pelaajan päälle. Helppo poistaa, jos halutaan täysi satunnaisuus.
- **Kiven säröt piirretään shaderilla** (3D Voronoi -reunat, jotka leviävät vaurion kasvaessa) ja osumakohtaan painuu kuoppa. Syy: näyttää säröilyltä ilman tekstuureja.
- **Murskautuminen:** geometria jaetaan paloihin ryhmittelemällä kolmiot; kivillä palat suljetaan sisäpinnoilla, ohuilla esineillä (oksat, lehdet) ei. Syy: ohuista osista syntyi muuten isoja levyjä.
- **Saaliit ovat fyysisiä esineitä maassa**, ja ne poimitaan [E]:llä tai automaattisesti 1,5 m säteellä. Ne tallennetaan maailman mukana (enintään 250). Syy: käyttäjän toive.
- **Päävalikko on HTML/CSS:ää ilman kuvatiedostoja**, ja taustalla on elävä pelimaailma auringonlaskussa. Syy: tyyli saadaan mallikuvan kaltaiseksi, ja tausta näyttää pelin oikeaa grafiikkaa. Mallikuvaa ei käytetty suoraan, koska logo ja napit ovat siinä osa kuvaa.
- **Fontit kopioitu repoon** (`assets/fonts/`, OFL/Apache-lisenssit mukana). Syy: toimivat ilman ulkoisia palveluja.
- **Useita maailmoja tallennetaan erikseen** (`sahel.worlds.v2` + maailmakohtainen data), asetukset omanaan. Vanha v1-tallennus jätetään huomiotta. Syy: siemen per maailma.
- **Pelin aloitus vaatii klikkauksen latauksen jälkeen.** Syy: selain sallii hiiren lukituksen vain käyttäjän eleestä.
- **Sademetsässä hiekkamyrsky ja hiekkausva näkyvät sumuna.** Syy: hiekkailmiöt eivät sovi sademetsään; sää on silti koko maailmalle yhteinen.
- **Vesitaso jaettu pienempiin kolmioihin.** Syy: ohjelmistorenderöijä piirsi ison kameran alta kulkevan kolmion väärin (vesi näkyi maan päällä); korjaus on halpa.

## 2026-10-06 (sessio 2)
- **Peli tehdään selaimeen three.js:llä ilman käännösvaihetta.** Syy: käyttäjä testaa raw.githack-linkillä ilman asennuksia; ES-moduulit + import map toimivat suoraan staattisena sivuna. three.js tukee PBR-materiaaleja, varjoja ja glTF-malleja, joten grafiikkaa voi myöhemmin parantaa samalla pohjalla.
- **three.js (r186) on kopioitu repoon (`vendor/three/`, minifioitu) eikä ladata CDN:stä.** Syy: versio pysyy lukittuna, peli toimii vaikka CDN olisi estetty, ja paikallinen testaus onnistuu. Lisenssi (MIT) mukana.
- **Maailma on proseduraalinen ja deterministinen (siemen), chunkit 64 m, näkymä 5 chunkia.** Syy: avoin maailma ilman valtavia karttatiedostoja. Kerätyt/kaadetut esineet tallennetaan pelkkinä tunnisteina.
- **Biomit perustuvat Sahelin maantieteeseen** (dyynit pohjoisessa, laterittitasangot, kausilammet eli "maret", akasiat ja baobabit) ja tuuli puhaltaa koillisesta (harmattan). Syy: käyttäjä halusi pelin pohjautuvan Burkina Fason Saheliin. Biomien nimet ja määrä ovat silti paikkamerkkejä.
- **Mallit ovat toistaiseksi proseduraalisia low-poly-malleja vertex-väreillä (`src/models/models.js`).** Syy: grafiikan ei tarvitse vielä olla hienoa, eikä ulkoisia malleja ole saatavilla (ks. alla). Jokaisella mallilla on nimi, joten ne voi myöhemmin vaihtaa glTF-malleihin muuttamatta pelilogiikkaa. Esineiden kuvakkeet piirretään samoista 3D-malleista, joten ne päivittyvät mallien mukana.
- **Tekstuurit tehdään toistaiseksi proseduraalisesti canvasilla.** Syy: Claude-ympäristön verkkorajoitus estää CC0-palvelut (Poly Haven, ambientCG). Oikeat CC0-tekstuurit voi lisätä myöhemmin (`src/render/textures.js`).
- **Käsi piirretään omana näkymänään maailman päälle.** Syy: käsi ja työkalu eivät leikkaudu puiden tai maaston sisään, ja niiden FOV:n voi säätää erikseen. Käsi saa valaistuksen maailman valoista (yö, nuotio).
- **Samat mallit piirretään instansseina yhdessä poolissa per malli.** Syy: vähän piirtokutsuja (~80 / ruutu). Pensaat eivät heitä varjoa, ja oksista on jätetty päädyt pois: kolmiomäärä putosi ~1,2 miljoonasta ~650 tuhanteen.
- **Neljä säätä vaihtuvat satunnaisesti pehmeällä siirtymällä; hiekkamyrsky tulee yleensä usvan kautta.** Syy: käyttäjän pyytämät sääilmiöt; pehmeä siirtymä näyttää luonnolliselta.
- **Opas laskee tilastot pelin alusta.** Syy: jos pelaaja tekee asian etuajassa (esim. valmistaa kirveen), vaihe kuittautuu heti eikä työtä tarvitse toistaa.
- **Tallennus localStorageen, automaattisesti 20 s välein ja sivulta poistuttaessa.** Syy: selainpeli, ei palvelinta. Valikossa on "Aloita uusi peli".
- **Ohjaus hiiren lukituksella (pointer lock), vain tietokoneella.** Syy: ensimmäisen persoonan peli; mobiiliohjaus on oma työnsä.
- **Testaustyökalut ovat taukovalikossa (sää, kellonaika) ja pikanäppäimissä [O] ja [L].** Syy: käyttäjän on helppo kokeilla eri säitä ja yötä odottamatta.
- **Musiikkia ja ääniä ei tehty.** Syy: käyttäjä toimittaa ne myöhemmin.
- **Työ tehtiin haarassa `claude/sahel-game-dev-yi990s`** (ei `feat/...`). Syy: Claude-ympäristö määrää kehityshaaran nimen.
- **Repo on nyt julkinen**, joten raw.githack-testauslinkit toimivat. (Sessiossa 1 avoin kysymys ratkesi.)

## 2026-10-06 (sessio 1)
- **Peli saa oman repositoryn ja muistiinpanokansion (`docs/`).** Syy: käyttäjä halusi, että Claude pitää kirjaa tehdystä työstä ja muistaa sen myöhemmin.
- **Nimi "Sahel" on työnimi.** Syy: nimi ei ole vielä 100 % päätetty. Nimeä ei kovakoodata laajasti, jotta uudelleennimeäminen on helppoa.
- **Dokumentaatio suomeksi.** Syy: käyttäjä kirjoittaa suomea.
- **Repo luotiin yksityisenä.** Syy: julkisuudesta ei ole sovittu; sen voi avata myöhemmin GitHubin asetuksista.
- **Claude Coden työnkulku kirjattu `CLAUDE.md`:hen.** Luetaan muistiinpanot alussa, kirjoitetaan niitä työn aikana, työ tehdään haarassa + PR:nä, ja lopuksi annetaan aina raw.githack-testauslinkki. Syy: käyttäjä halusi, että Code muistaa edistymisen ja testaus onnistuu suoraan selaimessa. Huomio: raw.githack vaatii julkisen repon, ja repo on tällä hetkellä yksityinen (avoin asia).
