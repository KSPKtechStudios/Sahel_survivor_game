# Pelin suunnittelu

Työnimi: **Sahel** (ei vielä lopullinen)

Tähän kirjataan käyttäjän kertomat asiat. Prototyypissä tarvittiin lisäksi
paikkamerkkisisältöä (biomit, esineet, reseptit, tehtävät); ne on listattu
erikseen kohdassa **Paikkamerkit**, eikä niitä pidetä päätettyinä.

## Konsepti (käyttäjän kertoma, 2026-10-06)
- Valheim- tai Minecraft-tyyppinen **selviytymispeli**, jossa on **reppu (inventory)** ja **valmistusjärjestelmä (crafting)**.
- Peli pohjautuu **Burkina Fason Sahel-alueeseen**.
- **3D avoin maailma**, **ensimmäisen persoonan kuvakulma**.
- **Pelaajan käsi näkyy**, ja kädessä näkyy työkalu / esine.
- **Vuorokausisykli** (yö/päivä).
- **Sääilmiöt:** selkeä, hiekkamyrsky, hiekkausva (maailma muuttuu kellertäväksi) ja pilvinen.
- **Oikeassa alakulmassa pieni opas**, joka aluksi sanoo esim. "kerää risuja, hakkaa kuivuneita pensaita, tumbleweedejä ja kerää kiviä", ja ohjeet etenevät pelin edetessä.
- **Oikeassa yläkulmassa minikartta**, jossa lukee biomi, jossa pelaaja on. Ei muuta tekstiä.
- **Grafiikan** ei tarvitse vielä olla huikeaa, mutta myöhemmin sitä jalostetaan suhteellisen hyväksi. Tekniikka valitaan niin, että se on mahdollista.
- Netistä saa hakea inspiraatiota, tekstuureja ja 3D-malleja.
- **Musiikki ja ambient-äänet**: käyttäjä toimittaa ne myöhemmin. Ääniin ei tehdä vielä mitään.

## Hajoaminen, kaatuminen ja saaliit (käyttäjän kertoma, 2026-10-06)
- Kun esineitä (esim. puita tai kiviä) hakkaa, ne **hajoavat vähitellen / "säröilevät"** ja hajotessaan **murskautuvat pieniksi paloiksi**. Ne eivät vain katoa.
- **Saaliit putoavat aina maahan fyysisinä esineinä.** Ne kerätään **[E]**-näppäimellä, tai ne poimitaan **automaattisesti, kun niiden päältä kävelee**.
- **Puilla on kaatumisfysiikka.** Puu kaatuu **aina satunnaiseen suuntaan**.
- **Kaatunut puu pitää vielä erikseen tuhota hakkaamalla.**
- Kun puuta hakkaa, siihen tulee **fyysisiä jälkiä / lovia**.

## Päävalikko (käyttäjän kertoma, 2026-10-06)
- Valikko näyttää käyttäjän mallikuvan kaltaiselta: Sahelin auringonlaskumaisema, "Sahel" pergamenttikääröllä koristekehyksessä ja puukehyksiset napit.
- Napit **"Pelaa"** ja **"Asetukset"** erikseen.
- Nappia painettaessa **mukava, pehmeä animaatio**.

## Maailma (käyttäjän kertoma, 2026-10-06)
- Maailma on **VALTAVA**.
- Maailma generoidaan **joka kerta omalla siemenellä (custom seed)**, joten maasto ja biomien sijainnit ovat aina erilaiset.
- Generointi noudattaa **ympyrämallista, vyöhykkeellistä kaavaa** (käyttäjän luonnos):
  - keskellä **spawn**
  - **tier 1**: Sahel ja sen muunnelmat
  - **tier 2**: aavikkoa ja sademetsää
  - **ulkoreuna**: vuoristobiomi (harvinainen)
  - Ulkoreuna on epäsäännöllinen (rosoinen ääriviiva).
- **Sessio 9: käyttäjä luopui kehämäisestä järjestyksestä.** Biomit voivat nyt olla missä tahansa (ks. sessio 9 alla).

## Kartta (käyttäjän kertoma, 2026-10-06, sessio 4)
- Maailmaa luodessa **karttaa ei saa näkyä**, koska se spoilaa kokonaisuuden.
- Peliin tultaessa kartassa näkyy **pelkkä tyhjä karttapohja**, ja kartta **"renderöityy" eli piirtyy sitä mukaa kuin pelaaja tutkii alueita**.
- **M-napista avautuu suuri, interaktiivinen kartta.** Siihen voi laittaa **paria erilaista waypointtia**, joilla on **omat symbolit** (esim. pelkkä raksi, pallukka, talon kuva).

## Rakennelmat ja arkut (käyttäjän kertoma, 2026-10-06, sessio 4)
- Joka maailman generoinnissa syntyy **satunnaisesti pieniä rakennelmia**:
  - **Saheliin** Stonehengen tyylisiä kivikasoja / kivikehiä
  - **aavikolle** hylättyjä leirejä
  - **kaikkiin biomeihin harvoin** talon tai pienen kylän raunioita
- **45 %:n todennäköisyydellä** rakennelmassa on **arkku**, jossa on vähän tavallista saalista.
- **10 %:n todennäköisyydellä** arkussa on **arvoesine tai -esineitä**.

## Biomit ja sulavuus (käyttäjän kertoma, 2026-10-06, sessio 4)
- Biomeja hiotaan paljon: **sademetsän pitää olla tiheä ja vaikeakulkuinen** (ei harva ja savannimainen), myös vuoristoa ja muita biomeja parannetaan.
- Valikon animaatioiden sekä käden juoksu- ja työkaluanimaatioiden pitää olla **pehmeämpiä** (eivät saa nykiä).

## Vesistöt, meri ja veden fysiikka (käyttäjän kertoma, 2026-10-06, sessio 5)
- Biomeissa saa olla **enemmän sisältöä**, ja **maastonmuotoja** saa olla enemmän.
- **Sademetsään** (kosteampi biomi) **lampia, järviä, jokia ja puroja**.
- **Saheliin** voi **joskus todella harvoin** tulla **pieniä jokia**, mutta ei liikaa, koska alue on kuiva.
- **Vuoristoon** saa tulla **vuoristojärviä** ja **puroja**.
- **Uusi biomi: meri / valtameri** (nimi vapaa).
- Veden fysiikka "niin kuin vesi oikeasti toimii": **vedessä on aaltoja**, ja **meressä ne kasvavat sään mukaan**. Kun pelaaja **hyppää** tai **menee veteen** tai **heittää sinne esineen**, tulee **molskahdus** ja siitä lähtee **aaltoja**.

## Grafiikka (käyttäjän kertoma, 2026-10-06, sessio 5)
- **Kunnon realistiset varjot**, **ilmakehä (atmosfääri)**, **god rays** ja valonsäteet.
- Asetuksiin mahdollisuus **liike-epäterävyydelle (motion blur)** ja **syväterävyydelle (DOF)**.

## Palaute ja korjaukset (käyttäjän kertoma, 2026-10-06, sessio 6)
- **DOF oli aivan liian voimakas** (sumensi kaiken).
- **Kasvien ja puiden latvojen pientä heilumista tuulessa saa olla vähän myös tyynellä säällä.**
- Joet ja purot olivat välillä bugisia: **puro kulki reunan yli ja oli maasta koholla**.
- **Meren aallot käyttäytyivät todella erikoisesti.**

## Taistelu, olennot ja uinti (käyttäjän kertoma, 2026-10-06, sessio 6)
- Kunnon **taistelujärjestelmä**.
- Pelaajalle **kestävyys (stamina) ja terveyspalkki (health bar)**.
- Pelaaja voi **lyödä** ja tehdä **hyviä komboja tietyillä aseilla**, esim. **puunuijalla** tai **viidakkoveitsellä**.
- **Hiiren oikealla torjutaan (block).** Torjunta toimii **kilvellä, aseella, joillakin työkaluilla ja ihan vain käsillä**.
- **Parry-mekanismi.**
- Pelaaja ja olennot ottavat **pientä tönäisyä (knockback)**.
- **Villieläin** jollekin sille sopivalle biomille.
- **Vihamielinen mutta helppo ja heikko olento**, jota esiintyy **aika ajoin joka biomissa yöllä**.
- **Karttamerkille voi antaa nimen.**
- Pelaaja voi mennä **veteen uimaan**, mutta **jos kestävyys ehtyy, alkaa hukkuminen**.
- **Ctrl-näppäimestä kyykky.**

## Musiikki, kehittäjätyökalut ja hiominen (käyttäjän kertoma, 2026-10-06, sessio 7)
- **Komboa pitää rajoittaa:** jatkuva kombottaminen on epäreilua. Käyttäjän ehdotukset: kombo vaatii yli 50 % kestävyydestä, tai kombo kuluttaa kestävyyden nopeasti nollaan (esim. yksi kombo tyhjentää). Toteutettava mieleinen.
- **Kilpi ei saa olla automaattisesti käytössä**, vaan pelaaja varustaa sen itse.
- **Savipeikot aamulla:** kun tulee päivä, ne **joutuvat paniikkiin ja syttyvät spontaanisti tuleen** eivätkä vain kuole heti.
- **F3 avaa kehittäjätyökalut**, joista teleportataan ja kutsutaan asioita. Testityökalut eivät enää ole valikossa vaan kehittäjätyökaluissa. Niissä myös **lentäminen, nopeus, koko kartan paljastus** tms.
- **Musiikki soi silmukkana biomi- tai tapahtumakohtaisesti** (käyttäjän toimittamat kappaleet):
  - savannilla **Savannah Dawn**
  - valtamerellä **Grand Ocean Adventure**
  - aavikolla / dyyneillä **Caravan of the Desert** (aavikko ja dyynit voi yhdistää yhdeksi aavikkobiomiksi)
  - päävalikossa **Deep Exploration**
- **Musiikin on oltava sopivan hiljaista** pelissä: taustaääntä, ei liian kovaa, ja tilaa tuleville äänitehosteille. **Päävalikko on ainoa paikka, jossa musiikki soi normaalilla voimakkuudella.**
- **Asetuksiin ääniasetukset.**
- **Biomin musiikki alkaa vähän viiveellä** biomiin astumisen jälkeen, ja siinä on **pitkät häivytykset sisään ja ulos**, ettei musiikki vaihdu hervotonta tahtia biomien välissä.
- Versio nimetään GitHubissa **Alpha v0.1**:ksi.

## Palaute (käyttäjän kertoma, 2026-10-06, sessio 8)
- **Viidakossa (sademetsässä) ei soinut mitään.**
- **Häivytys on liian pitkä:** edellinen kappale soi liian kauan uudessa biomissa.
- **Grafiikka-asetuksiin esiasetuksia:** matala, keskitaso, korkea, ultra.
- **Lyömiseen ja komboon jäähdytys** (oli edelleen liian vahva).
- **Kombon voi tehdä vain nopeilla ja kevyillä aseilla** (esim. veitsi, miekka), ei esim. nyrkillä.
- **Lisää tönäisyä:** olennot pysyvät liian paikallaan, kun niitä lyö.
- **Kuollessa efekti ja veren tyylistä nestettä**, kuten peleissä yleensä.

## Sessio 9 (käyttäjän kertoma, 2026-10-06)
1. **Jokien generointi** on erikoista: ne **ylittävät toisiaan hölmösti**. Korjattava.
2. **Hylättyjä paikkoja on aivan liian vähän.** Niiden pitää syntyä useammin, niin että matkaaja **satunnaisesti löytää niitä vaeltaessaan**.
3. **Unohda biomien spawnaushierarkia** (reunoilla harvinaisimmat). Biomit voivat syntyä miten vain. Biomit eivät saa olla **aivan liian massiivisia eivätkä liian pieniä**: **pitkän kävelymatkan jälkeen voi löytää uuden biomin**.
4. **Hylättyjä laivanhylkyjä rannoille** satunnaisesti, mutta **aika harvinaisia**.
5. **Combat ei vieläkään ole hyvä:** iskuja pystyy tekemään aivan liikaa. **Iskujen pitää olla aika harvassa.**
6. **Peli alkaa** sillä, että **maasta ja pusikoista kerätään kiviä ja oksia**. **Kaikkien sienien, kukkien yms. pitää olla poimittavia.** Osaa (esim. **sieniä**) voi **syödä**, mutta niistä voi **satunnaisesti saada Myrkytys-efektin**, eivätkä ne muutenkaan ole järin hyvää ruokaa. Tarvitaan **älytön määrä materiaaleja ja eläimiä**: piikiveä, taljaa, apinoita, lintuja, kaikkea. **Osan lähelle pääsee vain hiippailemalla, mutta silloinkin ne säikähtävät, kun tulee liian lähelle**, joten **jousipyssy** vaaditaan.
7. Peliin lisätään **aivan valtava määrä esineitä ja työkaluja** (Claude saa suunnitella ne itse). **Nuotion ja rakennelmien pystytys vaatii ensin lähelle työstöpenkin**, joka rakennetaan **vasaralla**, jolla rakennetaan asioita.
8. **Selkeänä yönä taivaalla näkyy mahtava linnunrata.**
9. **Yö-päiväsykli hieman lyhyemmäksi:** **10 min päivä ja 10 min yö**.
10. **Sääsykli tarkistettava:** kaikilla biomeilla **ei voi olla samoja säitä**; esim. viidakossa ei voi olla hiekkamyrskyä, vaan ennemmin **sade tai ukkonen**.
11. **Kaiverrettuja kiviä ja pieniä riimukirjoituksia** sinne tänne. Niissä on harakanvarpaita, mutta kun niitä katsoo kohdistimella, ruudulle tulee **"PAINA E KÄÄNTÄÄKSESI"**, ja teksti tulee **suomeksi** näytölle. Kivet kertovat **abstrakteja asioita pelimaailmasta**, joita pelaaja saa pähkäillä, ja niistä voi ehkä ymmärtää jopa **pelimaailman salaisuuksia**.
12. **Veneet / lautat**, jotka voi asettaa **vain veteen**: pienin on **pieni soutuvene** (heikko ja hidas), toisena **pieni purjevene** (nopeudeltaan välissä), viimeisenä **valtava purjelaiva, Santa Maria -tyylinen**: vaatii **älyttömät määrät resursseja**, mutta **kestää ja kulkee kovaa**. **Laivojen purjeet toimivat tuulen suunnan mukaisesti.**

## Sessio 10 (käyttäjän kertoma, 2026-10-07)
Nyt keskitytään jälleen biomeihin.
- **Bugi:** vedessä näkyy outoja pystysuoria "seiniä" (kuvakaappaukset sademetsästä ja savannilta). Mikä ne aiheuttaa? Korjattava.
- **Tumbleweedit (risukasat) pyörivät joka biomissa, jopa meressä.** Ne kuuluvat vain **aavikolle ja mesabiomille**.
- **Veneiden purjeet käyttäytyvät tosi erikoisesti.** Miksi? Korjattava.
- **Eläimet ovat "typerän" arkoja ja juoksevat liian lujaa pakoon**: pelaajalla ei ole mitään mahdollisuutta saada niitä kiinni. Parannettava.
- **Joka biomilla pitää olla tunnusomainen grafiikka.** Esimerkiksi:
  - **Aavikolla** kirkkaana, helteisenä päivänä horisontissa näkyy oikeita **kuumuuden väreilyä / ilman aaltoja**.
  - **Sademetsässä ei aina varsinaisesti sada, mutta vähän tihuttaa aina** ("nimensä mukaisesti sademetsä").
  - **Sademetsässä kaikki on aina tosi märkää ja kiiltävää**, ja siellä on **vesilammikoita**.
- **Meret syvenevät nopeammin**, jotta laivan käyttö on helpompaa.
- **Uusi vihamielinen ja suhteellisen vaarallinen mobi sademetsiin öisin: "Haamu" tai "Aave".** Mustakaapuinen olento, jonka ympärillä on pieni **tummansininen / violetti hehku**. Se **leijailee ilmassa, ei liian korkealla vaan puiden latvuksia pitkin**. **Ei liian yleinen.**
- **Pudotetulla esineellä pieni hehku / kiilto ympärillä**, jotta sen erottaa.
- **Heitetyillä esineillä poimimisviive:** kun pelaaja heittää esineen maahan ja kävelee heti sen yli, peli ei poimi sitä heti takaisin ("pelaaja heitti juuri tämän, ei varmaan halua sitä takaisin").

## Teknologia
- Selaimessa toimiva peli: three.js (WebGL), ei käännösvaihetta. Ks. `DECISIONS.md`.
- Kohdealusta toistaiseksi tietokoneen selain (hiiri + näppäimistö).

## Toteutettu
- Päävalikko (pergamenttikäärö, puunapit, pehmeät siirtymät ja hiekkapöllähdys), taustalla elävä pelimaailma auringonlaskussa.
- Maailmojen valinta: useita tallennettuja maailmoja, uuden maailman luonti nimellä ja siemenellä (ei karttaesikatselua).
- Asetukset: hiiren herkkyys, pystyakselin kääntö, näkökenttä, näköetäisyys, varjot, renderöintitarkkuus, FPS-näyttö.
- Vyöhykkeellinen maailma (säde 10 km), 8 biomia, epäsäännölliset rajat, maailman reuna vuoristona.
- Ensimmäisen persoonan liikkuminen, näkyvä käsi ja esine kädessä animaatioineen.
- Vuorokausi (20 min) ja neljä säätä; sademetsässä hiekkailmiöt muuttuvat sumuksi.
- Hakkaaminen: lovet puissa, puu kaatuu ja pomppaa maahan, kaatunut runko pilkotaan; kiviin säröjä ja ne murskautuvat; pensaat rytisevät ja hajoavat. Palat lentävät fysiikalla.
- Saaliit putoavat maahan, [E] tai automaattinen poiminta.
- Reppu (8 + 24 paikkaa), valmistus, nuotio, opas, tallennus maailmakohtaisesti.
- Tutkittava kartta: minikartta piirtyy kuljetusta alueesta, iso kartta [M] merkkeineen.
- Rakennelmat (kivikehät, leirit, talon ja kylän rauniot) ja arkut saaliineen, arvoesineet.
- Tiheä sademetsä, keitaat, uusittu vuoristo.
- Meri ja hiekkarannat, joet ja purot, järvet ja lammet; graniittikalliot ja pöytävuoret.
- Vesi: aallot (meressä sään mukaan), väreily, roiskeet, kelluvat ja uppoavat esineet, uinti aaltojen mukana, esineen heitto [Q].
- Grafiikka: kaskadoidut varjot, valonsäteet, ilmakehän hehku ja sironta, DOF ja liike-epäterävyys (asetuksista).
- Terveys- ja kestävyyspalkit, osuma- ja hukkumistehosteet, kuolema ja herääminen.
- Taistelu: iskusarjat (puunuija, viidakkoveitsi, nyrkit), torjunta kilvellä / aseella / työkalulla / käsillä, parry, tönäisyt.
- Pahkasika (villieläin) ja savipeikko (yön vihollinen).
- Uinti kuluttaa kestävyyttä, hukkuminen. Kyykky.
- Karttamerkkien nimet.
- Musiikki (päävalikko ja kolme biomia), ääniasetukset.
- Kehittäjätyökalut [F3].
- Iskusarjojen rajoitus kestävyydellä, kilven varustaminen, savipeikot palavat aamulla.
- Jäähdytys iskuille, iskusarja vain viidakkoveitsellä, veri ja kuolemaefekti, grafiikan esiasetukset (sessio 8).
- Valumaverkon joet (eivät risteä), biomit missä tahansa (alueet n. 1–2 km), saari meren ympäröimänä (sessio 9).
- Noin 1 800 rakennelmaa maailmassa, laivanhylyt rannoilla, riimukivet ja -taulut käännöksineen (sessio 9).
- Keräily maasta ja pensaista, poimittavat sienet, kukat ja kasvit, ravinto ja syöminen, myrkytys ja tilavaikutukset (sessio 9).
- Kymmeniä esineitä, valmistus käsin / työstöpenkillä / nuotiolla, vasara ja rakentaminen (työstöpenkki, nuotio, lattiat, seinät, katot, aidat, soihtuteline, makuualusta), soihtu (sessio 9).
- Jousi ja nuolet, arat eläimet (gaselli, helmikana, apina, aavikkokettu, kutojalinnut) (sessio 9).
- Linnunrata, 10 + 10 min vuorokausi todellisessa ajassa, alueelliset säät (sade, ukkonen, sumu) (sessio 9).
- Veneet: soutuvene, purjevene ja purjelaiva; purjeet tuulen mukaan, tuulen suunta kääntyy (sessio 9).
- Vesiseinät korjattu, tumbleweedit vain aavikolla ja laterittitasangolla, purjeiden nosto ja lasku, rauhallisemmat arat eläimet (sessio 10).
- Biomien tunnelma: sademetsän tihku, märkyys ja lammikot, aavikon kuumuusväreily ja kangastus, pölypyörteet, tulikärpäset (sessio 10).
- Meri syvenee nopeammin, Haamu sademetsän öissä, pudotettujen esineiden hehku ja heitetyn esineen poimintaviive (sessio 10).

## Paikkamerkit (Clauden valitsemia, voi muuttaa vapaasti)
- **Maailman koko ja muoto (sessio 9):** säde 10 km. Maailma on saari: reunoilla (noin 8–9 km:stä alkaen) rannikko ja avomeri, jonka reunalla virta vie takaisin ("Virta on liian voimakas"). Aloituspaikan ympärillä (n. 2,4 km) on aina Sahelia.
- **Biomialueet (sessio 9):** pehmeät Voronoi-solut 1 500 m, rajavyö 260 m; jokaiselle solulle arvotaan tyyppi: Sahel (savanni, laterittitasanko, kausilampi, akasiametsikkö, dyynit), aavikko (dyynit, keitaat), sademetsä, vuoristo tai meri (merenlahdet). Vierekkäiset samat solut yhdistyvät, joten alueet ovat n. 1–2 km.
- *(Vanha, sessioihin 3–8: tier 1 Sahel keskellä, tier 2 aavikko ja sademetsä, ulkoreunalla vuoristo ja meri. Korvattu sessiossa 9.)*
- **Maailman esineet:** akasia, kapokkipuu, sademetsäpuu, palmu, baobab (ei kaadettava), kuollut puu, kuivunut pensas, tiheikkö, bambu, saniainen, kandelaaberipuu, tumbleweed, risu, kivi, lohkare, kalliomuodostelma, kalliotorni, termiittikeko, ruoho, aluskasvillisuus, ruoko.
- **Hakkaaminen:** akasia 5 iskua + runko 4, kapokkipuu 8 + 6, sademetsäpuu 6 + 4, palmu 4 + 3, kuollut puu 3 (kirves), lohkare 4 (hakku), pensas/tiheikkö 3, bambu 4, saniainen 2 (kirves 2x). Lovi tulee aina samaan kaatokohtaan sille puolelle, josta lyödään.
- **Kaatumissuunta:** satunnainen, mutta jos se osoittaisi suoraan pelaajaa kohti, suunta käännetään (ettei puu kaadu päälle).
- **Esineet (sessio 9, Clauden suunnittelemat):**
  - *Materiaalit:* risu, kivi, kuitu, puu, piikivi, luu, sulka, ruoko, bambunvarsi, palmunlehti, akasiankumi, köysi, savi, simpukankuori, jänne, nahka, karitevoi, terälehdet, taljat (pahkasika, gaselli, apina, aavikkokettu).
  - *Ruoat (ravinto):* ruskea sieni 5, kalpea sieni 4, punahattu 3, termiittisieni 8, paahdettu sieni 11, raaka liha 8, paistettu liha 35, jujubanmarjat 6, banaani 14, kookospähkinä 15 (+30 kestävyyttä), apinanleipä 14, karitepähkinät 3, paahdetut pähkinät 12, moringanlehdet 4 (lievittää myrkytystä), bissap-kukat 2, fonio 2, fonio-puuro 28, lihapata 60 (+30 terveyttä), bissap-juoma 6 (virkistää 150 s: kestävyys palautuu 1,5×).
  - *Rohdot:* yrttirohto (parantaa myrkytyksen, +10 terveyttä), karitevoide (+35 terveyttä 14 s aikana).
  - *Työkalut:* kivipuukko, kivikirves, kivihakku, piikivikirves ja -hakku (2× teho), vasara (rakentaa), soihtu (valaisee).
  - *Aseet:* puunuija, keihäs, viidakkoveitsi, puukilpi, jousi, jännejousi (1,35× voima), puunuolet (9 vahinkoa), luunuolet (14), piikivinuolet (17).
  - *Arvoesineet:* kultahippu, kaurikotilo, pronssirannerengas (ei vielä käyttöä).
- **Reseptit (sessio 9):**
  - *Käsin:* köysi (3 kuitua), kivipuukko (kivi, risu, kuitu), kivikirves (3 risua, 2 kiveä, 2 kuitua), kivihakku (3 risua, 3 kiveä, 2 kuitua), vasara (2 risua, 2 kiveä, 2 kuitua), soihtu (risu, 2 kuitua, kumi), puunuija (2 puuta, 2 kuitua), 5 puunuolta (3 risua, kuitu).
  - *Työstöpenkki:* piikivikirves (2 puuta, 4 piikiveä, köysi), piikivihakku (2 puuta, 5 piikiveä, köysi), keihäs (2 puuta, 2 piikiveä, köysi), jousi (3 puuta, 2 köyttä, kumi), jännejousi (3 puuta, 3 jännettä, 2 kumia, 2 luuta), 8 piikivinuolta (4 risua, 2 piikiveä, 4 sulkaa), 8 luunuolta (4 risua, 2 luuta, 4 sulkaa), puukilpi (4 puuta, 4 risua, 4 kuitua), 2 nahkaa (talja).
  - *Nuotio:* paistettu liha, paahdettu sieni, paahdetut pähkinät (3 karitepähkinää), fonio-puuro (5 fonioita), lihapata (2 lihaa, 2 sientä, moringa), bissap-juoma (3 hibiskusta, kookos), karitevoi (4 pähkinää), yrttirohto (2 moringaa, 2 terälehteä, kumi), karitevoide (karitevoi, moringa, terälehti).
- **Rakennusosat ja hinnat (sessio 9):** työstöpenkki (6 puuta, 4 kiveä, 4 kuitua), nuotio (5 kiveä, 3 puuta, 3 risua), puulattia (4 puuta), puuseinä (4 puuta, 2 risua), saviseinä (6 savea, 4 risua), oviaukko (4 puuta), olkikatto (4 risua, 6 ruokoa), aita (6 risua, 2 kuitua), pylväs (2 puuta), soihtuteline (3 risua, 2 kuitua, kumi), makuualusta (8 kuitua, talja), soutuvene (10 puuta, 2 köyttä, 2 kumia), purjevene (24 puuta, 8 köyttä, 6 kumia, 4 nahkaa), purjelaiva (160 puuta, 40 köyttä, 24 kumia, 24 nahkaa, 30 kiveä). Työstöpenkki vaaditaan 20 m:n säteelle.
- **Oppaan vaiheet (sessio 9):** kerää tarvikkeita (risuja, kiviä, kuitua) → valmista työkalut ja vasara → hanki puuta → rakenna työstöpenkki → rakenna nuotio → valmista ja syö ateria → valmista jousi ja ammu → "Hyvä alku".
- **Kestävyys (stamina):** kuluu juostessa, hypätessä ja lyödessä.
- **Hahmo:** tummaihoinen käsi ja indigonsininen hiha (koska peli sijoittuu Burkina Fasoon).
- **Valikon fontit:** Eagle Lake (otsikko), Permanent Marker (napit), Alegreya (teksti).
- **Ohjaimet:** WASD, Shift, välilyönti, Ctrl/C (kyykky päälle/pois), hiiri 1 (lyö, sarjat), hiiri 2 (torju / aseta / varusta kilpi), E, Q (heitä esine), 1–8, Tab/I, M, F3 (kehittäjätyökalut), Esc.
- **Iskut (sessio 9):** iskujen väli (animaatio + jäähdytys): nyrkit 1,1 s (6 vahinkoa), risu 1,15 s (6), kivipuukko 0,9 s (7), kirves 1,05 s (12), hakku 1,1 s (11), keihäs 1,3 s (15, ulottuu 3,4 m), puunuija 1,9 s (21, iso tönäisy). Viidakkoveitsi: sarja 10 + 10 + 19 (kestävyys 10 + 16 + 26, jatkuu vain yli 50 %:n kestävyydellä), sarjan jälkeen 1,6 s jäähdytys.
- **Grafiikan esiasetukset:** Matala (näkö 3, varjot pois, tarkkuus 70 %, ei valonsäteitä), Keskitaso (4, normaali, 85 %), Korkea (5, normaali, 100 %), Ultra (7, tarkka, 100 %, 2× pikselitiheys).
- **Veri:** pisarat ja läikät (haalistuvat n. 40 s); savipeikoilla punaruskea savivelli.
- **Kilpi:** varustetaan hiiren oikealla (kilpi valittuna) tai hiiren oikealla repussa.
- **Savipeikko aamulla:** paniikki 0,5–1,4 s, palaa 3,5–6 s, palaneista ei saalista.
- **Musiikin voimakkuudet:** kappaleet tasattu −16 LUFS:iin; valikko täysi, peli −12 dB. Oletukset: äänenvoimakkuus 100 %, musiikki 80 %, äänitehosteet 100 %.
- **Musiikin ajoitus:** viive 5 s (pelin alussa 3 s), häivytys 3,5 s, tauko 1 s, voimistuminen 6 s, vähintään 20 s ennen vaihtoa, musiikittomalle alueelle 10 s.
- **Musiikki biomeittain:** savanni = Sahelin savanni, laterittitasanko, kausilampi, akasiametsikkö; aavikko = aavikko, dyynit, keitaat; meri = meri; sademetsä = väliaikaisesti Deep Exploration. Vuoristo ja ranta ilman musiikkia.
- **Terveys:** 100, palautuu 1,5 / s, kun osumasta on 6 s. Kuollessa herätään maailman aloituspaikasta, reppu säilyy.
- **Kestävyys:** 100; juoksu 14 / s, hyppy 10, iskut 4–13, uinti 4,5 / s (paikallaan 1,5 / s). Hukkuminen 9 terveyttä / s, kun kestävyys on loppu syvässä vedessä.
- **Kyykky:** silmät 1,08 m (seisten 1,65 m), nopeus puolet, eläimet huomaavat 45 % lähempää.
- **Aseet ja iskusarjat:** nyrkit (suora 4 + koukku 6), risu 5, kivikirves 10, kivihakku 9, puunuija (sivuisku 11, takaisin 11, murskaisku 24 + horjutus), viidakkoveitsi (vinoisku 9, takaisin 9, pisto 17). Kirves, hakku ja risu: yksi isku.
- **Torjunta:** kilpi 90 % (kestävyys 0,55 / torjuttu vahinko, parry 0,28 s), ase 60 % (1,0, 0,22 s), työkalu 50 % (1,1, 0,2 s), kädet 30 % (1,25, 0,18 s). Torjunta hidastaa liikkeen puoleen. Parryn jälkeen hyökkääjä horjuu 1,8 s ja ottaa 1,5-kertaisen vahingon.
- **Uudet esineet ja reseptit:** puunuija (2 puuta, 2 kuitua), puukilpi (4 puuta, 4 risua, 4 kuitua; pikapalkissa = vasemmassa kädessä), viidakkoveitsi (vain arkuista: leirit 40 %, muut 20 %). Saaliit: raaka liha, nahka (pahkasika), savi (savipeikko); ei vielä käyttöä.
- **Pahkasika:** Sahelin savanni, akasiametsikkö, laterittitasanko (myös kausilampi), 1–3 yhdessä, enintään 3–4 lähellä. 55 terveyttä, juoksee 6,6 m/s (pelaaja juoksee 7,2 m/s). Huomaa pelaajan 10 m päästä (kyykyssä 4,5 m) ja pakenee. Lyötynä hyökkää 16 s ajan: syöksy 13 vahinkoa ja tönäisy; alle 35 % terveydellä pakenee. Saalis: liha 1–2, nahka 1.
- **Savipeikko:** yöllä kaikissa biomeissa, 28 terveyttä, kävelee 3,5 m/s (hitaampi kuin pelaaja), isku 8 vahinkoa. Nousee maasta, hiipii pelaajaa kohti ja juoksee näköetäisyydellä (24 m). Ei synny nuotion lähelle (14 m), murenee aamulla. Saalis: savi 1–2.

- **Meri:** ulkoreunalla sademetsän puolella (noin 43 % reunasta), rannat hiekkaa, harvoin saaria. Avomeren takana virta vie takaisin ("Virta on liian voimakas"). Aavikon puolella reuna on edelleen vuoria.
- **Joet ja purot:** sademetsässä joet n. 14–20 m ja purot n. 5–7 m leveitä, Sahelissa harvoin 7–9 m jokia (n. 4–7 km koko Sahelin alueella), vuoristossa puroja vain loivissa kohdissa. Joki kapenee ja loppuu kuivaan uomaan.
- **Järvet:** sademetsässä lampia ja järviä (säde 18–130 m), vuoristossa vuoristojärviä (25–80 m). Lumpeita järvillä ja lammilla.
- **Aallot:** meren aaltojen korkeus 0,3 m (selkeä) – n. 1,8 m (hiekkamyrsky). Järvillä pieniä väreitä, joissa virtaus.
- **Kelluvat esineet:** puu, risut, kuitu. Muut uppoavat.
- **Uudet maastonmuodot:** graniittikalliot (Sahel, sademetsä; 10–40 m korkeita, lohkareita ympärillä), pöytävuoret aavikolla (16–46 m), Sahelin loivat kumpareet.
- **Uudet kasvit ja esineet:** karitepuu (Sahel, 6 iskua + runko 4), doumpalmu (kausilammet, keitaat; 5 + 3), kookospalmu (ranta; 4 + 3), lahopuu ja sammaloitunut runko (kirves, puuta), villibanaani (kuitua), aavikkopensas, ajopuu (poimitaan: puuta), korkea heinä, kukat, sienet, lumpeet, merilevä, luut, kivikko.
- **Grafiikka-asetukset:** Valonsäteet (oletus päällä), Liike-epäterävyys Pois/Kevyt/Vahva (oletus pois), Syväterävyys (oletus pois). Varjot: Normaali (170 m) / Tarkka (260 m).
- **Kartta:** paljastuu n. 100 m säteeltä. Merkkisymbolit: raksi, pallukka, talo (käyttäjän esimerkit) sekä lippu ja tähti. Minikartta kääntyy katsesuunnan mukaan, iso kartta on pohjoinen ylöspäin. Kartta on aina käytössä (ei erillistä esinettä).
- **Rakennelmat:** kivikehä (Sahel: savanni, laterittitasanko, akasiametsikkö, dyynit), hylätty leiri (aavikko, dyynit, keidas, ranta), talon rauniot ja kylän rauniot (kaikki biomit), riimukivi ja riimutaulu (kaikki biomit), laivanhylky (vain hiekkaranta). Vuoristossa rauniot ovat kiveä, sademetsässä köynnösten peittämiä. Sessio 9: 230 m:n solua kohti 50 %:n todennäköisyydellä, n. 1 800 rakennelmaa / maailma (riimukiviä ja -tauluja n. 580, laivanhylkyjä 6–13). Arkku 45 %:ssa (ei riimukivissä).
- **Arkun tavallinen saalis:** 2–3 seuraavista: risuja, kiviä, kuitua, puuta, piikiveä, köyttä, piikivinuolia, kumia, soihtu, karitepähkinöitä, yrttirohto. Laivanhylyn arkussa merihenkinen saalis (köyttä, simpukankuoria, puuta, kookospähkinöitä, luunuolia, nahkaa). Arvoesineitä 10 %:ssa arkuista kuten ennen.
- **Arvoesineet:** kultahippu (1–3), kaurikotilo (3–8), pronssirannerengas (1); arkussa 1–2 näistä. Ei vielä käyttöä.
- **Sademetsän kasvit:** sademetsäpuu (6 iskua + runko 4), kapokkipuu, tiheikkö, bambu (risuja), saniainen, aluskasvillisuus, ruoko. Kulku 30 % hitaampaa.
- **Aavikko:** keitaat (vesi, palmut, ruo'ot), kuolleet puut (kirves, puuta + risuja).
- **Vuoristo:** kalliomuodostelmat, kalliotornit, lohkareet, kandelaaberipuut (euphorbia), kerrostuneet kallion värit.
- **Ravinto ja myrkytys (sessio 9):** ravinto 100, tyhjenee n. 34 min:ssa (juostessa 1,7×, uidessa 1,4×). Alle 20: palautuminen hitaampaa; tyhjänä −0,5 terveyttä / s. Myrkytyksen todennäköisyys: ruskea sieni 15 %, kalpea sieni 40 %, punahattu 85 % (vahvempi), termiittisieni 5 %, paahdettu sieni 6 %, raaka liha 30 %. Myrkytys −0,45 terveyttä / s (ei alle 4), kestävyys palautuu hitaammin.
- **Poimittavat (sessio 9):** piikivi, simpukankuoret, sulat, kookospähkinät, apinanleivät, karitepähkinät, jujubapensas, moringa, hibiskus (bissap), ruoko (veden lähellä), fonio, savi (veden lähellä), neljä sientä (ruskea, kalpea, punahattu, termiittisieni), kukat (terälehdet) ja luurangot (luita). Puista ja kasveista lisäksi kumia, palmunlehtiä, kookoksia, banaaneja, bambua ja karitepähkinöitä.
- **Jousi (sessio 9):** täysi jännitys n. 0,95 s (jännejousi 0,85 s), lähtönopeus 16–60 m/s jännityksen mukaan, jännittäminen kuluttaa kestävyyttä ja hidastaa liikettä. Nuolet järjestyksessä piikivi > luu > puu.
- **Arat eläimet (sessio 9, arvot päivitetty sessiossa 10):** gaselli (26 terveyttä, juoksee 7,6 m/s, huomaa 18 m:stä, laumassa 2–4; savanni ja metsiköt), helmikana (7, 5,2 m/s, lentää, 11 m, 3–6; savanni), apina (18, 6,2 m/s, 13 m, 2–4; sademetsä, keitaat), aavikkokettu (10, 6,8 m/s, 14 m, 1–2; aavikko, enemmän öisin), kutojalintu (3, lentää, 7 m, parvissa 4–7). Huomaamisetäisyys: paikallaan 0,75 ×, kyykyssä 0,3 ×, paikallaan kyykyssä 0,22 ×, juostessa 1,3 ×, uidessa 0,7 ×. Huomattuaan pelaajan eläin tarkkailee 1,2–2,4 s ja pakenee, jos pelaaja tulee yli 2,5 m lähemmäs tai alle 55 %:n näköetäisyydelle. Pako 2,5–4 s (haavoittuneena 3,5–5 s), väsymys paetessa enintään −45 %, haavoittunut hitaampi. Lauma varoitetaan 15 m:n säteeltä 0,2–0,8 s viiveellä. Saalis: lihaa, taljoja, luita, jänteitä ja sulkia.
- **Haamu (sessio 10):** 70 terveyttä, isku 17 vahinkoa (tönäisy 7), syöksy 10,5 m/s, varoitus 0,9 s (kädet ylös, hehku kirkastuu), huomaa pelaajan 30 m:stä (kyykyssä 18 m). Leijuu 8–11 m maasta ja vähintään 5,5 m pelaajan yläpuolella, kiertää pelaajaa 10 m:n säteellä 3–6 s ennen syöksyä. Syntyy vain öisin (päivänvalo alle 12 %), kun pelaaja on sademetsässä, 32–52 m:n päähän, ei 18 m:n säteelle nuotiosta; tarkistus 35–75 s välein, 40 %, enintään 1 kerrallaan, edellisen jälkeen tauko 1,5–2,5 min. Nuotion valo: ei syöksy, jos pelaaja on 9 m:n säteellä nuotiosta (kiertää 16 m:n päässä). Aamulla haihtuu savuna. Saalis: kaurikotiloita 1–3, pronssirannerengas 0–1. Ensimmäisellä kerralla viesti "Latvuksissa leijuu jotain... Nuotion valo pitää haamut loitolla." Ulkonäkö: musta riekaleinen kaapu ja huppu, kasvojen kohdalla pimeää ja kaksi violettia silmää, tummansininen / violetti hehku (n. 2,3 m) ja himmeä jälkihehku.
- **Tumbleweedien elinympäristö (sessio 10):** aavikko, dyynit, laterittitasanko ja puoliksi pöytävuoret, ei keitaita ("mesabiomi" tulkittu laterittitasangoksi ja pöytävuoriksi).
- **Sademetsän tunnelma (sessio 10):** tihku = sade vähintään 0,24 × kosteus (tihkuna hitaammat, lyhyemmät ja himmeämmät pisarat), pilviä vähintään 62 %. Märkyys 0,85 sademetsässä (sateessa 0,9 × sateen määrä), kastuu n. 6 s:ssa ja kuivuu n. 45 s:ssa. Lammikot: 9 / chunk sademetsässä, 0,8 / chunk kausilammella, 0,7–1,8 m, vain tasaisella maalla.
- **Aavikon kuumuusväreily (sessio 10):** aavikon osuus × selkeä taivas (pilvet alle n. 0,3, ei sadetta, vähän pölyä) × aurinko korkealla (n. klo 9–15) × ei kosteutta; vaikuttaa yli 25–110 m:n päässä horisontin tuntumassa, kangastus yli 90–220 m:n päässä aivan horisontin alla.
- **Muiden biomien tunnusmerkit (sessio 10, Clauden ehdotus):** tulikärpäset (savanni, metsiköt, sademetsä; illalla ja yöllä, ei sateella eikä kovalla tuulella), pölypyörteet (aavikko ja savanni kuumina päivinä; 14–26 m korkeita, kulkevat tuulen mukana 1,5–3,3 m/s, kestävät 25–45 s, enintään 2).
- **Pudotetut esineet (sessio 10):** hehku 0,55–1,5 m (esineen koon mukaan), arvoesineillä kultainen. Heitetty esine: automaattinen poiminta vasta 10 s jälkeen ja kun pelaaja on käynyt yli 3 m:n päässä.
- **Säätaulukot ilmastoittain (sessio 9, painot):** aavikko: selkeä 4, hiekkausva 3, hiekkamyrsky 1,6, pilvinen 0,5. Savanni: selkeä 4, pilvinen 3, hiekkausva 2, hiekkamyrsky 0,4, sade 1, ukkonen 0,3. Sademetsä: selkeä 2, pilvinen 3, sade 3, ukkonen 1,5, sumu 1,5. Vuoristo: selkeä 3, pilvinen 3, sumu 2, sade 1, ukkonen 0,4. Meri: selkeä 3, pilvinen 2, sade 1,5, ukkonen 0,6, sumu 0,5.
- **Riimukivet (sessio 9):** 38 suomenkielistä tekstiä (`src/game/lore.js`) ovat **Clauden luonnoksia**: abstrakteja lauseita savipeikoista, joista, tähdistä, raunioista, kylistä, meren takaa tulleista laivoista ja saaren salaisuuksista. Käyttäjä voi kirjoittaa tilalle omat tekstinsä tai tarinansa.
- **Veneet (sessio 9):**
  - *Soutuvene:* 3,8 m, kestävyys 60, soutu 2,4 m/s ([Shift] 3,4 m/s), soutu kuluttaa kestävyyttä 1,6 / s ([Shift] 6 / s), kääntyy paikallaan. Syväys 0,3 m.
  - *Purjevene:* 6,6 m, latinalaispurje, kestävyys 180, enintään 8,5 m/s × tuuli, vastatuuli alle 43°, "hiljaa" 1,3 m/s. Syväys 0,55 m.
  - *Purjelaiva:* 24 m karakki (keulamasto ja isomasto raakapurjein, peräsmastossa latinalaispurje, keulapuun alla räikkäpurje, punaiset ristit), kestävyys 1 200, enintään 13 m/s × tuuli, vastatuuli alle 60°, "hiljaa" 1,1 m/s. Syväys 1,25 m; rakentamiseen riittää 0,7 m.
  - Tuulikerroin 0,6–1,15 (selkeällä n. 0,72, ukkosella n. 1,07). Karilleajo yli 1,6 m/s vaurioittaa. Joissa virta kuljettaa venettä.
  - Tuulen suunta: uusi tavoitesuunta 4–10 min välein, enintään ±100°, kääntyy n. 0,7° / s.

## Avoimet kysymykset
- Mihin **Hiekan jäljet** -kappale laitetaan? (Se oli liitteissä, mutta ei luettelossa.)
- Oma kappale sademetsään (nyt väliaikaisesti Deep Exploration)? Soiko vuoristossa, rannalla, yöllä tai taistelussa jokin musiikki (käyttäjä toimittaa)?
- Lisätäänkö miekka tai muita kevyitä aseita, joilla on iskusarja?
- Mitä meren takana on (nyt virta vie takaisin myös veneellä)? Pitäisikö siellä olla toinen saari tai jotain salaista?
- Voiko veden alle sukeltaa? (Uinti kuluttaa nyt kestävyyttä, ja sen loputtua alkaa hukkuminen.)
- Pitäisikö vesistöissä olla kaloja tai muuta elämää (kalastus)?
- Pitäisikö vettä voida juoda tai kerätä (jano)?
- Mihin arvoesineitä (kultahippu, kaurikotilo, pronssirannerengas) käytetään: kaupankäynti, valmistus, pisteet?
- Pitäisikö kartan olla esine, joka pitää ensin valmistaa / löytää, vai aina käytössä (nyt aina)?
- Pitäisikö rakennelmissa olla muuta (esim. vihollisia, tarinaa, erikoissaaliita)?
- Uusiutuvatko arkut, vai avataanko kukin vain kerran (nyt kerran)?
- Mitä maailman reunan takana on: läpäisemättömät vuoret (nyt), meri vai jotain muuta?
- Haluatko valikon taustaksi mallikuvan kaltaisen maalauksen (esim. kuva ilman logoa ja nappeja) vai elävän 3D-maailman (nyt)?
- Pitäisikö kantojen olla poistettavissa / antaa puuta?
- Pitäisikö kaatuvan puun vahingoittaa pelaajaa (kun terveys lisätään)?
- Kuinka kauan pudonneet esineet säilyvät maassa (nyt pysyvästi, enintään 250)?
- Selviytymismittarit: terveys, kestävyys ja ravinto (sessio 9) on tehty; tarvitaanko myös jano tai kuumuus?
- Mistä viidakkoveitsi saadaan: arkuista (nyt) vai valmistetaanko se (metalli, seppä)?
- Mitä kuollessa tapahtuu: säilyykö reppu (nyt säilyy), jääkö hautakivi, herätäänkö sängystä?
- Sopiiko savipeikko yön viholliseksi (nimi, ulkonäkö), vai jokin muu olento?
- Haamu vai Aave (nyt Haamu)? Onko se sopivan vaarallinen ja harvinainen, sopiiko nuotion valo vastakeinoksi ja mitä siitä pitäisi saada saaliiksi?
- Tarkoittiko "mesabiomi" punaista laterittitasankoa (nyt tumbleweedit ovat aavikolla, dyyneillä, laterittitasangolla ja pöytävuorilla)?
- Mitä tunnusomaista grafiikkaa vuoristoon ja merelle (nyt tulikärpäset savannilla ja metsissä, pölypyörteet kuumilla tasangoilla)?
- Lisää eläimiä ja vihollisia (esim. hyeena, krokotiili vesistöissä, kalat)? Viholliset rakennelmiin tai luoliin? (Sessio 9: gaselli, helmikana, apina, aavikkokettu, kutojalinnut.)
- Kyykky: kytkin (nyt) vai pohjassa pidettävä? (Ctrl+W sulkee selaimen välilehden, siksi nyt kytkin.)
- Rakentaminen (sessio 9: vasara ja työstöpenkki, Valheimin tapaan): mitä osia vielä tarvitaan (portaat, ovet, kivimuurit, varastoarkut, savimajat)?
- Varastoarkut: voiko tavaraa säilöä (nyt ei)? Purjelaivan tarvikkeet (yli 270 esinettä) mahtuvat juuri ja juuri reppuun.
- Veneet: pitäisikö laivan kannella voida kävellä (nyt pelaaja on ohjauspaikalla)? Lastiruuma? "Lautta" omana veneenään (pyynnössä mainittiin veneet / lautat)?
- Riimukivet: kirjoittaako käyttäjä tekstit itse, tai onko pelillä tarina, johon niiden pitäisi liittyä? Pitäisikö kivistä koota pulmia (esim. kaikki kivet luettuina avaavat jotain)?
- Metallit ja sepät (rauta, pronssi): seuraava työkalutaso piikiven jälkeen?
- Kuka pelaajahahmo on, ja onko pelissä tarinaa?
- Uusiutuvatko resurssit (risut, kivet, puut)?
- Työkalujen kuluminen?
- Moninpeli?
- Lopullinen julkaisualusta (selain, Steam/työpöytä)?
- Pelin kieli (nyt suomi)?
- Mistä nimi "Sahel" tulee ja mihin suuntaan se voisi muuttua?
