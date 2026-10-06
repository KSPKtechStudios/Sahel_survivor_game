# Changelog

Mitä peliin on lisätty tai muutettu. Uusin ylimpänä.

## 2026-10-06 (sessio 8): jäähdytys ja kombot kevyille aseille, tönäisy, veri, grafiikan esiasetukset, sademetsän musiikki
- Iskuille jäähdytys: iskun jälkeen pitää odottaa ennen seuraavaa (nyrkit 0,4 s, nuija 0,75 s, viidakkoveitsen sarjan jälkeen 1,3 s, työkalut 0,2–0,35 s). Tähtäin himmenee jäähdytyksen ajaksi.
- Iskusarja vain nopeilla ja kevyillä aseilla (viidakkoveitsi); nyrkit ja puunuija lyövät yhden iskun (nuija raskaasti: 16 vahinkoa, iso tönäisy).
- Enemmän tönäisyä: olennot lennähtävät osumasta (n. 1–2 m) ja hypähtävät, ja ne horjuvat hetken eivätkä heti juokse takaisin.
- Veri: osumasta lentää veripisaroita, jotka jättävät maahan läikkiä; kuollessa iso roiske, pölypöllähdys ja ruumiin alle leviävä verilammikko. Savipeikoista lentää punaruskeaa savivelliä. Läikät haalistuvat n. 40 s:ssa.
- Grafiikan esiasetukset: Matala, Keskitaso, Korkea, Ultra (näköetäisyys, varjot, tarkkuus, valonsäteet). Yksittäisen asetuksen muutos tekee laaduksi "Oma".
- Sademetsässä soi musiikki (väliaikaisesti Deep Exploration hiljaisella pelitasolla, kunnes sademetsälle tulee oma kappale).
- Musiikin vaihto nopeutui: viive 5 s (alussa 3 s), häivytys 3,5 s, tauko 1 s, voimistuminen 6 s, vähintään 20 s ennen vaihtoa.
- Korjattu: varjojen vaihto "Tarkka"-tasolle (ja nyt Ultra) rikkoi varjokartan (WebGL-virheet).

## 2026-10-06 (sessio 7): musiikki, kehittäjätyökalut, kombojen rajoitus, kilven varustaminen, palavat savipeikot
- Musiikki: päävalikossa soi Deep Exploration normaalilla voimakkuudella; pelissä Sahelin savanneilla Savannah Dawn, aavikolla Caravan of the Desert ja merellä Grand Ocean Adventure hiljaa taustalla (12 dB valikkoa hiljempaa, tilaa tuleville äänitehosteille). Kappaleet soivat silmukkana ja on tasattu samaan äänekkyyteen. Biomin musiikki alkaa viiveellä (8 s, pelin alussa 4 s), vaihtuu pitkillä häivytyksillä (8 s hiljenee, 10 s voimistuu) ja soi vähintään 45 s ennen vaihtoa, joten biomien rajalla musiikki ei vaihtele. Musiikittomalle alueelle (sademetsä, vuoristo, ranta) musiikki hiljenee 15 s jälkeen.
- Asetuksiin ääniosio: äänenvoimakkuus, musiikki ja äänitehosteet (tuleville äänille).
- Pelin käynnistyessä "Klikkaa jatkaaksesi": selaimet sallivat äänen vasta käyttäjän klikkauksen jälkeen. Musiikki pysähtyy, kun välilehti on piilossa.
- Hiekkadyynit yhdistetty aavikkoon: sama nimi (Aavikko), väri kartalla ja musiikki. Maaston muodot ennallaan.
- Iskusarjojen rajoitus: sarja jatkuu vain, kun kestävyyttä on yli puolet, ja sarjan iskut ovat kalliimpia (nuija 10 + 15 + 24, viidakkoveitsi 8 + 14 + 24, nyrkit 4 + 12). Täydellä kestävyydellä ehtii yhden sarjan, sitten vain yksittäisiä iskuja, kunnes kestävyys palautuu. Kestävyyspalkissa merkki puolivälissä.
- Kilpi pitää varustaa itse: valitse kilpi ja paina hiiren oikeaa, tai hiiren oikea repussa (myös riisuminen). Varustetussa kilvessä on merkki pikapalkissa ja repussa, ja tieto tallentuu.
- Savipeikot aamulla: joutuvat paniikkiin, syttyvät itsestään palamaan, juoksevat liekeissä sinne tänne (huitovat käsillä) ja palavat muutamassa sekunnissa mustiksi hiiliksi ja tuhkaksi. Liekit, kipinät ja savu hiukkasina; palava savipeikko valaisee ympäristöä. Palaneista ei jää saalista.
- Kehittäjätyökalut [F3]: tiedot (sijainti, biomi, aika, FPS, olennot, musiikin tila), lentäminen, nopeus 0,5–10×, kuolemattomuus, paranna / kuole, siirtyminen (biomit, vesistöt, aloituspaikka, lähin rakennelma tai avaamaton arkku, koordinaatit, karttamerkit), olentojen kutsuminen ja poisto, esineiden antaminen, sää ja aika (myös ajan pysäytys), koko kartan paljastus. Testaustyökalut poistettu taukovalikosta.

## 2026-10-06 (sessio 6): korjauksia, taistelu, pahkasika ja savipeikot, uinti ja hukkuminen
- **Versio Alpha v0.1** = sessioiden 1–6 työ (commit 03a2b3b, käyttäjän nimeämä).
- Syväterävyys (DOF) paljon hienovaraisempi: vain kaukainen tausta ja aivan lähellä olevat asiat pehmenevät hieman, ei enää koko kuvaa.
- Kasvit ja puiden latvat huojuvat hieman myös tyynellä säällä.
- Joet ja purot korjattu: ei enää maasta koholla olevia penkereitä eikä vettä reunojen yli. Veden pinta asettuu syvälle laaksoon, rannat loivenevat pehmeästi, kuivat reunapisteet painetaan maan alle, jyrkissä kohdissa vaahtoavia koskia.
- Meren aallot korjattu: aallot kulkevat nyt tasaisesti kohti rantaa eivätkä enää "hypi" (aaltojen suunta riippui hitaasti kääntyvästä tuulesta, mikä kaukana keskeltä liikutti aaltoja valtavan nopeasti). Lyhyet aallot näkyvät vain pinnan valaistuksessa, jottei 2 m verkko väreile.
- Terveys- ja kestävyyspalkit pikapalkin yläpuolella. Osuessa ruudun reuna punertuu ja kamera nytkähtää, matala terveys sykkii. Terveys palautuu hitaasti, kun viimeisestä osumasta on kulunut hetki.
- Taistelu: iskusarjat (kombot) puunuijalla (sivuisku, takaisin, murskaava isku ylhäältä), viidakkoveitsellä (nopeat vinoiskut ja pisto) ja nyrkeillä (suora ja koukku). Klikkaa tahdissa tai pidä hiiren nappi pohjassa. Kirves, hakku ja risu lyövät yhdellä iskulla kuten ennen. Jos isku ei osu olentoon, se hakkaa puita, kiviä ja pensaita kuten ennen.
- Torjunta [Hiiri 2]: kilpi torjuu 90 %, ase 60 %, työkalu 50 % ja paljaat kädet 30 % vahingosta. Torjunta kuluttaa kestävyyttä ja hidastaa liikettä; jos kestävyys loppuu, torjunta murtuu. Parry: kun torjunnan aloittaa juuri ennen iskua, vahinkoa ei tule ja hyökkääjä horjuu (ottaa silloin 1,5-kertaisen vahingon).
- Tönäisyt: pelaaja ja olennot lennähtävät hieman osumasta, nuijan murskaisku heittää ilmaan. Osuman hetkellä isku pysähtyy hetkeksi (tuntuma).
- Uudet esineet: Puunuija (2 puuta, 2 kuitua), Puukilpi (4 puuta, 4 risua, 4 kuitua; pikapalkissa kilpi on vasemmassa kädessä) ja Viidakkoveitsi (arkuista, raivaa pensaita kaksinkertaisesti). Eläinten saaliit: raaka liha, nahka ja savi.
- Villieläin: pahkasika Sahelin savanneilla, akasiametsiköissä ja laterittitasangoilla (1–3 yhdessä). Pakenee lähestyvää pelaajaa (kyykyssä pääsee lähemmäs), lyötynä hyökkää takaisin syöksyllä (laskee päänsä ja kuopii maata ennen syöksyä), pakenee haavoittuneena. Häntä nousee pystyyn juostessa.
- Vihollinen: savipeikko nousee öisin maasta missä tahansa biomissa (aika ajoin, enintään 3 kerrallaan), hiipii pelaajaa kohti ja lyö (nostaa kädet ennen iskua). Heikko: kaatuu muutamalla iskulla ja murenee paloiksi. Aamulla savipeikot murenevat itsestään, eikä niitä synny nuotion lähelle.
- Uinti kuluttaa kestävyyttä (liikkuessa enemmän). Kun kestävyys loppuu syvässä vedessä, alkaa hukkuminen: ruudun reuna sinertyy, pää painuu pintaan ja terveys laskee.
- Kuolema: "Kuolit"-ruutu syineen; [Välilyönti] herättää maailman aloituspaikasta, reppu säilyy.
- Kyykky [Ctrl] tai [C] (päälle/pois): matalampi ja hitaampi, eläimet huomaavat myöhemmin. Juoksu tai hyppy nostaa ylös.
- Karttamerkeille nimet: uusi merkki kysyy heti nimen, merkin klikkaus avaa nimeämisen ja poiston, oikea klikkaus poistaa. Nimet näkyvät isossa kartassa ja minikartalla, ja ne tallentuvat.
- Pelin aikana selain kysyy ennen sivulta poistumista (vahingossa painettu Ctrl+W ei sulje peliä varoittamatta), ja selaimen Ctrl-pikanäppäimet on estetty pelatessa.
- Testaustyökaluihin rivi "Kutsu": pahkasika, savipeikko, aseet (nuija, viidakkoveitsi, kilpi) ja paranna.

## 2026-10-06 (sessio 5): vesistöt ja meri, veden fysiikka, uusi grafiikka, lisää sisältöä
- Bambujen tärinä korjattu: korkeat kasvit saivat matalille pensaille tarkoitetun tuulen, joka heilutti 9 m vartta liikaa ja pisteittäin eri tahtiin.
- Uusi biomi: meri ja hiekkarannat. Sademetsän puolella maailman reunaa on avomeri (sen takana virta vie takaisin), rannoilla hiekkaa ja harvoin saaria.
- Joet ja purot: sademetsässä runsaasti, Sahelissa harvoin pieniä jokia (muutama km koko alueella), vuoristossa puroja loivissa kohdissa. Kapeneva joki loppuu kuivaan uomaan.
- Järvet ja lammet: sademetsässä ja vuoristossa (vuoristojärvet), oma pinnankorkeus. Lumpeita järvillä ja lammilla.
- Uusia maastonmuotoja: graniittikalliot (inselbergit) Saheliin ja sademetsään, pöytävuoret aavikolle, loivat kumpareet Saheliin, korkeampi sademetsän maasto, jokilaaksot.
- Vesi uusittu: aallot (meressä sään mukaan, myrskyssä metrien aallokko), taivaan heijastus, auringon kimallus, rantavaahto, läpinäkyvä matala vesi, virtaus joissa.
- Veden fysiikka: väreily ja renkaat (aaltoyhtälö näytönohjaimella), roiskeet kun pelaaja hyppää veteen, kahlaa tai ui, ja kun esine putoaa tai heitetään veteen. Puu, risut ja kuitu kelluvat ja ajelehtivat virran mukana, kivet ja metallit uppoavat. Uiva pelaaja nousee ja laskee aaltojen mukana.
- Uusi näppäin [Q]: heitä valittu esine.
- Varjot: kaksi varjokaskadia (tarkat varjot lähellä, varjot kauas), pehmeät reunat.
- Valonsäteet (god rays) puiden ja lehvästön läpi, ilmakehän hehku auringon suunnassa, taivaan sironta (hehku auringon ympärillä, lämmin horisonttivyö matalalla auringolla).
- Asetuksiin: Valonsäteet, Liike-epäterävyys (Pois/Kevyt/Vahva), Syväterävyys (DOF).
- Lisää sisältöä: karitepuu, doumpalmu, kookospalmu, lahopuut, sammaloituneet rungot, villibanaani, aavikkopensas, ajopuu, korkea heinä, kukat, sienet, merilevä, luut, kivikko; graniittikallioille lohkareita. Ruo'ot myös jokien ja järvien rannoilla.
- Testaustyökaluihin siirtymät: Ranta, Järvi, Joki, Puro. Minikartta näyttää vesistön nimen, kun pelaaja on vedessä.

## 2026-10-06 (sessio 4): tutkittava kartta, rakennelmat ja arkut, biomit, sulavuus
- Minikartta on aluksi tyhjä karttapohja (paperi + haalea ruudukko), ja maasto piirtyy siihen sitä mukaa kuin pelaaja kulkee (n. 100 m ympäriltä). Pohjoinen merkitty P:llä.
- Iso interaktiivinen kartta [M]: vedä = liikuta, rulla = zoomaa, klikkaus = merkki valitulla symbolilla (raksi, pallukka, talo, lippu, tähti), klikkaus merkkiin = poista. Mittakaava ja etäisyys kursorin kohtaan. Merkit näkyvät myös minikartalla (kaukaiset reunalla).
- Tutkittu alue ja merkit tallentuvat maailman mukana.
- Uuden maailman luonnista poistettu koko maailman karttaesikatselu (spoilasi maailman).
- Satunnaiset rakennelmat joka maailmaan: kivikehät (Sahel), hylätyt leirit (aavikko, dyynit, keidas), talon ja kylän rauniot (harvinaisina kaikissa biomeissa). N. 500 / maailma.
- 45 %:ssa rakennelmista on arkku [E]: kansi aukeaa ja tavalliset saaliit (risuja, kiviä, kuitua, puuta) lennähtävät maahan. 10 %:ssa arkuista on arvoesineitä: kultahippu, kaurikotilo, pronssirannerengas (hohtavat maassa).
- Sademetsä uusittu: tiheä ja hidas kulkea (uusi sademetsäpuu, tiheiköt, bambu, saniaiset, aluskasvillisuus, ruo'ot), kostea sumu ja vihertävä varjoisa valo, kuopat ja purouomat. Liikkuminen sademetsässä 30 % hitaampaa.
- Vuoristo uusittu: kalliomuodostelmat, kalliotornit, kerrostuneet kallion värit, lohkareita, kandelaaberipuita.
- Aavikolle keitaat (vesi, palmut, ruo'ot, vihreä ruoho) ja kuolleita puita; Sahelin kausilammille ruo'ot.
- Sulavuus: maaston ja esineiden generointi siirretty taustasäikeisiin (Web Worker), instanssipoolit tiivistyvät (kolmiomäärä ei enää kasva), vanha raskas minikarttalaskenta poistettu.
- Käden ja työkalujen animaatiot pehmennetty: juoksuun siirtyminen liukuu, kävelyheilunta ilman nykäyksiä, esineen vaihto pehmeästi, iskut avainkehyksistä, hiiren viive jousella.
- Valikon animaatiot kevennetty: käärö aukeaa ja paneelit vaihtuvat pelkillä transform/opacity-animaatioilla (ei sumennusta eikä asettelua joka ruudulla), nappien hehku kevyemmin; valikon taustan varjot päivittyvät harvemmin ja taukovalikon taustaa piirretään harvoin.

## 2026-10-06 (sessio 3): hajoaminen, kaatuminen, uusi valikko ja vyöhykemaailma
- Puihin tulee lovia hakatessa; puu kaatuu satunnaiseen suuntaan, pomppaa maahan ja tilalle jää kanto. Kaatunut runko pilkotaan erikseen.
- Kiviin (lohkareet) tulee säröjä ja kuoppia; ne murskautuvat paloiksi. Pensaat ja tumbleweedit rytisevät ja hajoavat.
- Lastut ja sirpaleet lentävät fysiikalla; kameran tärinä puun kaatuessa.
- Saaliit putoavat maahan fyysisinä esineinä: [E] poimii, kävellessä ne imaistaan automaattisesti.
- Uusi päävalikko mallikuvan tyyliin: pergamenttikäärö "Sahel", puukehyksiset liitutaulunapit, pehmeät siirtymät ja hiekkapöllähdys, taustalla elävä maailma auringonlaskussa.
- Maailmojen valinta: useita maailmoja, nimi ja siemen, karttaesikatselu. Asetukset-paneeli.
- Uusi taukovalikko (Jatka, Asetukset, Päävalikkoon) ja testaustyökalut (sää, aika, siirry biomiin).
- Vyöhykkeellinen 20 km leveä maailma omalla siemenellä: spawn, Sahel (tier 1), aavikko ja sademetsä (tier 2), vuoristoreuna.
- Uudet biomit ja mallit: aavikko, sademetsä (kapokkipuu, palmu, saniainen, vihreä ruoho), vuoristo.
- Etäisyystasot (LOD) ja kevyet kaukomallit; opas päivitetty (kaada ja pilko).

## 2026-10-06 (sessio 2): ensimmäinen pelattava prototyyppi
- Selainpeli (`index.html`), three.js r186 kopioituna repoon `vendor/three/`.
- Proseduraalinen avoin maailma chunkeina, 5 biomia: Sahelin savanni, Hiekkadyynit, Laterittitasanko, Kausilampi (vesi), Akasiametsikkö.
- Low-poly-mallit: akasia, baobab (riippuvine hedelmineen), kuivunut pensas, tumbleweed, risu, kivi, lohkare, termiittikeko, ruohotupsut.
- Ensimmäisen persoonan ohjaus: kävely, juoksu (kestävyys), hyppy, kahlaus/uinti, törmäykset.
- Näkyvä käsi + esine kädessä; animaatiot: heilautus, lyönti, poiminta, esineen vaihto, kävelyheilunta.
- Vuorokausisykli (20 min): aurinko, kuu, tähdet, auringonnousu/-lasku, varjot.
- Sää: selkeä, pilvinen, hiekkausva, hiekkamyrsky; pehmeät siirtymät, pöly- ja hiekkahiukkaset, tuuli (ruoho, puut, tumbleweedit).
- Reppu (8 + 24 paikkaa) ja valmistus: kivikirves, kivihakku, nuotio.
- Keräys ja hakkuu: poimi risut/kivet [E], hakkaa pensaat ja tumbleweedit, kaada akasia kirveellä, louhi lohkare hakulla.
- Nuotion asettaminen maahan esikatselulla; nuotio valaisee yötä.
- Opas (oikea alakulma) 5 vaiheella, minikartta + biomin nimi (oikea yläkulma).
- Tauko-/aloitusvalikko ohjeineen ja testaustyökaluineen (sää, kellonaika, uusi peli).
- Automaattinen tallennus selaimeen.

## 2026-10-06 (sessio 1)
- Projektin runko luotu: `README.md`, `CLAUDE.md`, `docs/`-kansio muistiinpanoineen.
- GitHub-repo `KSPKtech/sahel` luotu (yksityinen), runko pushattu.
- `CLAUDE.md` kirjoitettu uusiksi Claude Codea varten (muistiinpanot, haara/PR-työnkulku, raw.githack-testauslinkki).
- Peliä ei ole vielä aloitettu koodin tasolla.
