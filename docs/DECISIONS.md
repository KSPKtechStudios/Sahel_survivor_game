# Päätökset

Muoto: päivä, päätös, syy.

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
