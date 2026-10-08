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

## Sessio 11 (käyttäjän kertoma, 2026-10-07)
Paljon bugikorjauksia ja parannuksia, "tee huolella".
1. **Tulikärpäsiä on vähän liikaa.** Ne saavat olla keskittyneinä tietyille alueille, esim. **jokien varsille ja joidenkin akasioiden alle**. Niitä ei tarvitse olla joka biomissa: **merellä, vuorilla ja rannalla ei ollenkaan**.
2. **Aallot ovat myrskyssä ja muutenkin aivan liian isot.** Myrskyssä saa ja pitääkin olla rajua, mutta nyt on överi (kuva).
3. **Veneisiin tulee vettä sisälle** (vedenpinta näkyy rungon sisällä), mikä ei kuulu asiaan. Korjattava (2 kuvaa).
4. **Sade ja sadepisarat realistisemmiksi**, "super realistic": vettä on paikoitellen sellaisena **sumuna**.
5. **Lammikoita ei joka paikkaan.** Sademetsässä ok, savannilla heti sateen jälkeen, mutta savannilla niiden pitää **pikkuhiljaa kuivua / kadota sateen jälkeen** (savanni on kuiva biomi).
6. **Kaikki säät eivät voi toteutua kaikissa biomeissa:** hiekkamyrskyä ei voi kohdata merellä, rannalla eikä viidakossa; sadetta ei voi kohdata aavikolla eikä mesabiomissa (ylipäätään kuivalla). **Savanneilla sade on harvinaista.** Aavikolla pilvinen sää ei ole kovin yleistä (kuuma ja kuiva).
7. **Rakennelmat ovat liian harvinaisia.** Niitä saa olla sopivasti, ja **rantojen hylyt ovat aivan liian harvinaisia**: niitä pitää näkyä satunnaisesti.
8. **Linnunrata on ideana hyvä, mutta toteutus "nääh":** liian silmille hyppäävä eikä realistinen. Korjattava.
9. **Kirkkaalla yötaivaalla satunnaisesti tähdenlentoja.**
10. **Purjeessa on taas bugi**, se on jälleen hullusti (kuva).
11. **Esineiden kimallus on liian voimakas:** pitää olla hento, pieni kiilto (nyt hyppää silmille).
12. **Haamu kulkee liian korkealla:** sen pitää kulkea **latvustojen alla**. Ylemmäs se menee vain, kun sillä on **tosi vähän terveyttä ja se pakenee**.
13. **Jousi oikeaan käteen**, ja **nuolten pitää erottua kunnolla**, kun niitä ampuu.
14. **Nyrkillä ja kirveellä hakatessa on liikaa jäähdytystä.** Taistelu uudelleen: ei liian OP (ei jatkuvaa kombottamista), mutta ei kankeaakaan.
15. **Seilatessa kartan tuulen suunta oli väärinpäin.**

## Sessio 12 (käyttäjän kertoma, 2026-10-07)
- **Bugi:** sään vaihtosykli O-näppäimellä jää jumiin viimeiseen säähän (todennäköisesti biomikohtaisten säiden takia).
- **Vuoristo on kuivaa:** siellä on pöytävuoria ja kaktuksia, joten siellä ei saa sataa eikä olla märkää. Vuoristossa saa olla vieriviä tumbleweedejä.
- **Äänitehosteet** (käyttäjä toimittaa tiedostot, enintään 5 kerrallaan). Ääniä saa leikata, häivyttää ja päällekkäistää; **ei liian kovalle**. Esim. ukkosmyrskyssä voi kuulua useampi ääni yhtä aikaa.
  1. **Taustatuuli:** kuuluu ukkosen aikaan kaikissa biomeissa, joissa ukkonen on mahdollinen, sekä **aina vuoristossa ja merellä**.
  2. **Viidakko:** soi sademetsässä aina, kun sinne astuu; pieni häivytys (ei ala "seinästä", lyhyempi kuin musiikissa).
  3. **Puun kaatuminen:** ääni alkaa suunnilleen kun puu alkaa kaatua, ja räsähdys kuuluu kun runko osuu maahan.
  4. **Sade:** kuuluu aina, kun sataa tai ukkostaa, jokaisessa biomissa, jossa se on mahdollista.
  5. **Kaukainen ukkonen:** ukkosmyrskyn taustaääni silmukkana (ei tarvitse olla tahdissa salamoiden kanssa).
- **Askeleet:** Claude saa generoida kävelyyn pienen töpsyttelyäänen, joka vaihtelee alustan materiaalin mukaan.

## Sessio 12b (käyttäjän kertoma, 2026-10-07)
- **Sumu on liian "kova"**, näyttää suorastaan esteeltä; sen pitää olla paljon pehmeämpää.
- **Puun kaatumisääni:** räsähdys tulee oikeaan aikaan, mutta sen jälkeen ääni jää liian pitkäksi aikaa rätisemään ja paukkumaan, vaikka puu on jo maassa: leikataan.
- **Sademetsän eläin- ja lintuääni** on vähän turhan lujalla ja kuuluu terävästi: maltillisemmaksi.
- **Lähisalama:** ukkossäällä silloin tällöin salama iskee lähelle; näytössä suuri välähdys, salama näkyy, ja samalla kuuluu jompikumpi ukkosääni (tiedostot "thunderclap" ja "ukko", satunnaisesti).
- **Haamun äänet** (vahinkoäänet tulevat myöhemmin): "haamuspawn" kuuluu, kun haamu ilmestyy pelaajan lähelle, ja voi kuulua satunnaisesti myöhemminkin esim. kun se hyökkää pelaajaa kohti; ei liian kovalla. "haamu2" on haamun satunnainen ääni. "haamuhyökkäys" kuuluu, kun haamu hyökkää pelaajan kimppuun.

## Sessio 12c (käyttäjän kertoma, 2026-10-07)
- **Haamun äänet** ovat hieman turhan hiljaisia; käyttäjä kuuli vain hyökkäysäänen, ei kahta muuta.
- **Ukkonen päivällä:** ei niin valoisaa, vaan maailma hämärämmäksi.
- **Haamujen syntymistodennäköisyys** selvästi suuremmaksi ukkossäällä.
- **Salaman isku maahan:** kun pelaaja näkee salaman osuvan maahan, maasta pöllähtää vähän hiekkaa ja multaa, ja aivan pieni tulipallo voi näkyä.
- **Uudet äänet:** "desertwind" kuuluu aavikolla aina mutta TODELLA hiljaa, ja vain hiekkamyrskyssä se kuuluu kovaa. "härskituuli" kuuluu merellä myrskyssä ja välillä hiekkamyrskyssäkin täydentämässä toista ääntä. "click" kuuluu, kun pelaaja heittää esineen pois. "puu" kuuluu, kun pelaaja lyö puuta: paljon hiljempaa ja eri sävelkorkeuksilla vaihtelun vuoksi. "hamu" on haamulle vielä yksi äänirepliikki.

## Sessio 12d (käyttäjän kertoma, 2026-10-07)
- **Puun kaatumisääni:** siinä on ärsyttävä kohta, jossa ääni "tökkää"; parannettava.
- **Sade ja vesi super realistisiksi.** Laivalla kulkiessa vedestä pitää tulla **komeita tyrskyjä**, kun vesi osuu laivaan.
- **Vesipisara linssillä:** satunnaisesti, kun sateella ja ukkosella vettä roiskuu ja katsoo valoa (aurinkoa tms.) kohti, linssillä on ikään kuin vesitippa.
- **Laivat kulkevat liian nopeasti:** nerfataan.
- **Kaadettua palmua ei voi hakata palasiksi:** korjattava.
- **Linnunradassa näkyy pikseleitä** tai muuta ei-toivottua efektiä: korjattava.
- **Äänet:** "bird" soi välillä viidakossa ja savannilla (savannilla harvemmin). "whoosh1" ja "whoosh2" soivat satunnaisesti, kun työkalulla tai aseella huitoo ilmaan (sävelkorkeutta saa vaihdella); ne kuuluvat myös olentoa lyödessä, mutta jonkin verran hiljempaa.

## Sessio 12e (käyttäjän kertoma, 2026-10-07)
- **Linssiheijastukset** aurinkoa tai valoa katsottaessa; asetuksista päälle. **Linssiheijastukset ja DOF oletuksena päällä.**
- **Vesipisarat pois näytöltä** (käyttäjä ei pitänyt niistä). Ainoa tilanne, jossa ne voivat tulla, on purjehdus myräkässä, ja silloinkin todella hillittyinä.
- **Haamujen syntymistä hieman harvemmaksi.**
- **Puiden hakkaamisen ja kaatumisen äänet, olentojen äänet ja huitominen eivät erotu**, kun taustalla soi musiikki ja kuuluu sade ja tuuli.
- **Esineen pudotuksen napsahdus** pienemmälle.
- **[Shift] + [Q] heittää kaikki esineet** yhdellä kertaa.
- **Soihdulla näkee huonosti**; valon pitää olla realistisempi. **Soihdulla lyöty olento syttyy palamaan.**
- **Huitomisen äänenvoimakkuutta** hitusen alemmas.
- **Iskuäänet ("lyänti1", "llyänti2")** kuuluvat, kun lyö mitä tahansa elävää olentoa (olennon omien vahinkoäänien lisäksi). Saa muokata ja vaihdella korkeutta; ei liian kovalle, koska äänet ovat rajuja ja teräviä.

## Sessio 13 (käyttäjän kertoma, 2026-10-07)
- **Kaikki pelin teksti samalla fontilla** kuin valikon "Sahel"-logo.
- **Nimilaput kohteessa:** mobeilla, puilla ja pensailla on nimi tällä fontilla. Nimi seuraa itse kohdetta, ei ole pelaajan tähtäimen alla.
- **Kestävyyspalkki vain eläimillä ja vihollisilla**; puilla (ja muilla) ei palkkia.
- **Huomattu-merkki:** kun vihollinen tai eläin huomaa pelaajan, kestävyyspalkin alle tulee silmä- tai huutomerkkisymboli.
- **Kaatuvat puut:** pelaaja tai mobi voi kuolla jäädessään kaatuvan puun alle. Toisen puun päälle kaatuva puu voi kaataa sen ja edelleen muita (ketjureaktio).
- **Terveys-, kestävyys- ja ruokapalkit vasempaan alalaitaan**, mieluiten pystyyn, järkevästi ja intuitiivisesti; simppelit ikonit, joista näkee mikä on mikä.
- **Soihtu sammuu**, jos sitä pitää kädessä vedessä. **Sateessa soihtu palaa huonosti**: ei sammu, mutta palaa "yskien" ja heikosti.
- **Kuulla on vaiheet** (täysikuu, puolikuu, uusikuu jne.). **Täysikuun aikaan kaikkia vihollisia syntyy hieman enemmän.**
- **Lammikot eivät saa leijua** (käyttäjän kuva leijuvasta lammikosta).

## Sessio 29 (käyttäjän kertoma, 2026-10-08)
- **Pelaajan käsi vaihdetaan** käyttäjän antamaan malliin (FPS_Female_Arms.fbx ja kolme tekstuuria: väri, karheus, normaali), ja **animaatiot tehdään siihen sopiviksi**. Nykyinen käsi on huononäköinen.
- **Iho ei saa kiiltää eikä näyttää muoviselta**, vaan kädeltä.
- **Ote pitää näyttää oikealta:** käsi ei saa taipua luonnottomasti. Käyttäjän referenssit: käsi pitelee keppiä, lieriötä ja kirvestä (ranne suora, kyynärvarsi ja nyrkki samassa linjassa, sormet kahvan ympäri, peukalo sormien päällä).
- **Veistä pidetään kahvasta**, ei terästä.
- **Todella pehmeät ja sulavat animaatiot:** isku- ja puolustusanimaatiot ym. ovat ok, mutta liian nopeita ja "teräviä". Animaatiot pitää uudistaa kunnolla.
- **Juuret** (ikivanhat juuret): niiden väleistä näkyy ärsyttävästi läpi (käyttäjän kuva).
- **Tähdenlentoja hieman useammin**, ja ne **häipyvät pehmeästi** (fade out) eivätkä katoa yhtäkkiä.

## Sessio 28 (käyttäjän kertoma, 2026-10-08)
- Session 27 muutokset hyviä ("hienoa työtä", "muuten ei valittamista").
- **Lahopuun tekstuurit** eivät ole hyvät; **bambun** tekstuurit eivät myöskään (käyttäjän kuvat).
- Kun puuta **hakkaa palasiksi**, sen **tekstuurit huononevat** paljon (kuva kaatuneesta puusta): korjattava.
- **Puun runko töksähtää latvassa** epärealistisesti (kuva: runko päättyy tasaiseen päähän latvuksen alla).
- **Haamun vartalo ei näy ollenkaan** (bugi).
- **Selkeällä säällä sumua vähemmän:** aivan vähän, ettei kauas näe täysin selkeästi, mutta kuitenkin näkee.

## Sessio 27 (käyttäjän kertoma, 2026-10-08)
- Tehdään **session 26 lisätoiveet** (fysiikka liaaneille ja lehdille, kaislat vesistöjen varsille, baobab, juuret ja kannot, lahopuun kaatuminen, haamun viitta) rauhassa.
- **Palmuihin kookospähkinöitä latvaan.** Niitä saa **kaatamalla palmun tai ravistelemalla** sitä, ja ne **kasvavat takaisin** (voi farmata).
- **Puiden ja palmujen ulkonäkö on yhä kaamea:** palmu on ok, mutta **banaanipuu kyseenalainen**. Parempi itse tehty tai valmis malli netistä.
- **Leijailevia pikseleitä näkyy yhä** (käyttäjän kuva).
- **Köynnökset eivät voi näyttää tuolta** (kuvassa paksut, kaaren muotoiset liaanit).
- **Viidakkoon vesilammikoita** kuten ennen, ja ne **syntyvät aina matalimpiin kohtiin**.
- Viidakon taustaäänet katosivat, mutta tulivat sitten **viiveellä** takaisin.
- **Aavikon tuuli** kuuluu, mutta saisi olla **vähän hiljempi**.
- **Selkeä yö** ehkä piirun verran **liian valoisa**.
- **Jalanjäljet edelleen liian pieniä.**
- **Silmän tottumista valoon ei oikein huomaa.**

## Sessio 26 (käyttäjän kertoma, 2026-10-08)
- **Puiden "kiinteä" ydin pois kokonaan:** latvus pelkistä lehvistä. Alta katsottuna ytimet näkyivät yhä rumina kiinteinä malleina (käyttäjän kuva).
- **Sademetsässä liikaa usvaa** selkeälläkin säällä.
- **Lehdet kiiltävät** (käyttäjän kuva yöstä).
- **Valonsäteet eivät paista latvuston läpi.**
- **Pikseleitä leijuu yhä** puiden ja kasvien lehvien lähellä.
- **Musiikki bugaa:** soi vain sademetsässä; esim. aavikolla äänet ja musiikki eivät enää kuulu.
- **Simpukat** hienon näköisiksi ja **poimittaviksi**.
- **Jalanjäljet liian pieniä**; niistä **kolmiulotteisia painaumia**.
- **Palmut ja banaanipuut** ovat karmean näköisiä: paremmat tai kokonaan uudet mallit.
- **Lyönteihin entistä enemmän animaatioita ja variaatioita.**
- Muistutus: **netin 3D-malleja ja tekstuureja saa käyttää vapaasti.**
- **Lisätoiveet (käyttäjä lähetti kesken session; tehdään myöhemmin, ensin vanhat loppuun):**
  - Kunnon **fysiikkamoottori**: puiden lehdet ja etenkin **köynnökset ja liaanit** heiluvat ja liikkuvat oikein, kun puu kaadetaan; köynnökset heiluvat **tuulessa**, ja kun pelaajan pää osuu niihin, ne heilahtavat.
  - Palmumalliehdotus: CGTraderin ilmainen "Coconut Palm Tree" (linkki käyttäjältä).
  - **Kaisloja jokaisen vesistön varrelle** (ei hiekkarannoille).
  - **Baobab** on kaamean näköinen: malli netistä tai reilusti parempi itse tehty.
  - **Puiden juuret ja kannot** ovat kanttisia: aidon näköisiksi.
  - **Lahopuu** hajoaa hakattaessa palasiksi; sen pitäisi **kaatua** kuten muutkin.
  - **Haamu:** malli on miellyttävä eikä sen tarvitse olla aito, mutta **viitta oikeasti viittamaiseksi** ja **tekstuurit paremmiksi**. Vapaaehtoinen: viitassa **fysiikka**, jolloin se heiluu ja lepattaa haamun liikkeiden mukaan.

## Sessio 25 (käyttäjän kertoma, 2026-10-08)
- **Meren pohjaan** levää, kiviä ja muuta materiaalia (mallit saa tehdä itse, ne eivät näy kovin tarkasti). **Rantakivikoita ja kaislikoita**, hiekkarannoille **kiviä ja ajautuneita simpukoita**.
- **Jalanjäljet:** pelaajan jaloista jää aavikolla ja rannalla **painaumat hiekkaan**; **veteen astuessa pientä roisketta**.
- **Puita kaadettaessa vanhat tekstuurit paljastuvat** alta, etenkin kun puu tuhoutuu (korjattava).
- **Dynaaminen valaistus:**
  - **Hajavalo:** maaston ja varjojen hajavaloa (ambient / sky light) hieman ylös, jotta varjot eivät ole pikimustia, kun taivas hehkuu ilta-auringossa. Maaston muodot ja siluetit erottuvat iltataivasta vasten ilman omaa valoa.
  - **Silmän mukautuminen (auto-exposure):** kirkkaasta pimeään siirryttäessä valotus mukautuu noin **2–4 sekunnissa**.
  - **Soihdun sokaisu:** kun soihtu on päällä tai ollaan lähellä kirkasta valoa, valotus mukautuu lähivaloon, jolloin kaukaiset pimeät alueet tummuvat. Kun soihtu sammutetaan, silmä sopeutuu muutamassa sekunnissa takaisin ja siluetit alkavat erottua.
- **Sumu, sade ja ukkonen tekevät yöstä nyt valoisamman kuin selkeä sää**; niiden pitäisi pimentää yötä entisestään.
- **DOF sumentaa usein liikaa.** **Motion blur** saisi olla runsaampaa.
- **Lehdistä on jäänyt pieniä pikseleitä leijumaan ilmaan** (käyttäjän kuva).
- **Viidakon latvustosta puuttuu valon läpäisy:** varjon puolelta latvus on litteä musta massa. Lehtiin **subsurface scattering**: auringonvalo kuultaa lehtien läpi ja antaa vihreää sävyä alapuolellekin.
- **Lyöntianimaatiot** sulavammiksi, tyylikkäämmiksi ja monipuolisemmiksi: **useita variaatioita**.
- **Kello täytyy varustaa käteen**, jotta se näyttää ajan.
- **Kuun tekstuuriksi valokuva** (käyttäjän liittämä täysikuu), optimoituna.

## Sessio 24 (käyttäjän kertoma, 2026-10-08)
- **Tavoite:** maailman visuaalinen uudistus nykyisestä tekoäly-3D-pohjasta syvään, elävään **"stilisoituun realismiin"** (tyyli: **Valheim / Stylized Realism**). Käytetään saatavilla olevia 3D-malleja ja korkean resoluution tekstuurikirjastoja.
- **Huonot 3D-mallit korvataan valmiilla, hyvillä** (esim. Sketchfab tai jokin muu mallipankki). **Jo tarpeeksi hyvät mallit voi vain teksturoida uudelleen.**
- **Materiaalit ja kerrostaminen:** sileät, yhtenäiset pinnat ja perusvärit korvataan monimutkaisilla, korkean resoluution, säänkestävillä tekstuureilla (esim. märkä turve, ikivanha kivi, rosoinen kaarna).
- **Kasvillisuuden kerrostaminen:** kasvillisuutta paljon tiheämmin. Maanpinta "kerrostettuna": alimpana **sammalta**, sen päällä **useita ruoholajeja** (esim. sarat, lyhyt nurmi), **erilaisia sieniä, pudonneita oksia ja muinaisia kiviä**. Ruohoa ei ole vain muutama korsi, vaan **tiheitä mättäitä ja laajoja alueita**. Kunnon foliage: ruohoa, ryteikköä, puskia ja pensaita.
- **Sää ja kosteus:** sadebiomeissa kaiken on näytettävä **säässä kuluneelta ja märältä**: pinnat (maa, puu, kivi) liukkaita ja kiiltäviä sateesta. Rakenteet ja esineet näyttävät **vanhoilta ja kuluneilta** (esim. sammaleiset kivet, harmaantunut puu).
- **Valaistus ja volumetriikka:** volumetristä sumua, syvyysusvaa, hiukkastehosteita (sumusade, itiöt). **Moody ja diffuusi valaistus** on tärkeä (sadekuvissa). Yksinkertaiset sadesuihkut korvataan **hienolla sumusateella ja roisketehosteilla pinnoilla**.
- **Ympäristön tarinankerronta:** pieniä yksityiskohtia, jotka vihjaavat historiaan, esim. **murenevat muinaiset kivipylväät, vanhat ruostuneet kilvet maassa, maasta nousevat ikivanhat juuret**.
- **Ehkä tärkeimpänä: maailman generointia täytyy muuttaa.** Maailma generoituu nyt todella **kulmikkaasti**; sen täytyy olla **todella pehmeä**: mäet, harjanteet ja maastonmuutokset **pehmoisia ja sileitä**.
- **Sademetsän puihin köynnöksiä** (haetaan netistä 3D-malli tai tehdään itse laadukas).

## Sessio 23 (käyttäjän kertoma, 2026-10-08)
- Aletaan **parannella pelin ulkonäköä realistisempaan suuntaan**.
- Haetaan netistä **ilmaisia CC0-3D-malleja ja -tekstuureita** ja korvataan esim. puita ja muita asioita ja esineitä hyvillä tekstuureilla.
- Jos sopivaa ei löydy tai oma malli on jo hyvä (esim. **laivanhylyt olivat siistejä**), oma malli **teksturoidaan hyvän / realistisen näköiseksi**.
- Ilmoitetaan ja kysytään, jos tulee ongelmia.

## Sessio 22 (käyttäjän kertoma, 2026-10-08)
- Pian siirrytään **tarinan** pariin. Sitä ennen peliin **valtava määrä erilaisia työkaluja, esineitä ja raaka-aineita**. Vanhoja saa poistaa (osa ei ollut tarpeellisia): poistetaan **simpukankuori ja terälehdet**.
- **Työkaluja ja aseita on eri tasoisia:** alkuun ainakin **puu, kivi, kupari, rauta ja rubiini**. **Piikivi jää kiven ja kuparin väliin.** Rubiinit ovat vähän **mystisiä, "yliluonnollisen" tyyppisiä** työkaluja.
- **Materiaalien hankintaa ei ole vielä päätetty** (kupari, rauta, rubiini): toistaiseksi ne saa vain kehittäjätyökaluilla.
- Tasoille kaikkia tyyppejä (kirves, hakku, terä, nuija / moukari, keihäs), **mutta poikkeuksia ja variaatioita** mielenkiinnon vuoksi, esim. kuparista voi tehdä moukarin mutta rubiinista ei. Peli ei saa olla pelaajalle liian ennustettava.
- **Jousia eri tasoisia.** Valmistustapaa ei ole päätetty.
- **Puulajeja useita, eri lajeista eri puuta:** pensaista, tumbleweedeistä ja akasioista **peruspuuta**, viidakosta **jalopuuta**, baobabeista ja kapokkipuista **ydinpuuta** (vahvaa), joka vaatii paremman kirveen.
- **Baobab on vaikea kaataa:** ensin "kuoritaan" ulkopuu, josta saa peruspuuta. Vasta baobabin rungon / ytimen kaatamalla saadaan ydinpuuta.
- **Panssarit:** ensimmäiset ja halvimmat ovat nahkariepumaisia kamppeita, sitten jalommat nahkapanssarit, sitten rengaspanssari (chainmail) jne.
- Claude saa tässä vaiheessa päättää vapaammin. Ruokaan ei vielä mennä.

## Sessio 21 (käyttäjän kertoma, 2026-10-08)
- **Kohteen nimi** (esim. puu tai kasvi) tulee esiin liian yhtäkkiä, kun siihen katsoo: pieni, napakka häivytys tai animaatio nimen paljastuessa.
- **Hyppyisku:** jos pelaaja hyppää ja iskee hypystä suoraan mobia, isku on **kriittinen** ja tekee enemmän vahinkoa. Ei toimi kaikilla aseilla, mutta esimerkiksi **nuijalla tai kirveellä** kyllä. Silloin pelaaja ottaa aseesta **kahdella kädellä** kiinni ja iskee mobia **ylhäältäpäin**.
- **Haamun äänet kuuluvat nyt liian kovalla** (aiemmin toivottiin kovempia).
- **Parry kilvellä:** ei tekstejä ("lyö nyt") mobin terveyspalkin alle. Sen sijaan mobi **horjahtaa, työntyy taaksepäin tai "taintuu" hetkeksi**, ja siinä voi olla aivan pieni iskun efekti, jotta ymmärtää, että nyt oikeasti kävi.
- **Bugi:** kuussa on outo reunus (kuva).
- **Kuun tekstit pois näytöltä** ("täysikuu, mobeja spawnaa enemmän").
- **Kuun kierto satunnaiseksi:** joka yö voi olla eri kuu, ja joskus mobeja tulee enemmän.
- **Savipeikkojen nousu maasta** on siisti, mutta siihen pieni, siisti efekti, ettei se ole niin tylsä.
- **Pudotetut esineet katoavat 10 minuutissa.**
- **Kello kartan vieressä:** ei saa leikata karttaa eikä mennä sen päälle. Lisäksi **kellonaika digitaalisesti** alapuolelle tai jonnekin.
- **Myrskyssä seilatessa ruudun vesipisarat / roiskeet** lentävät ruutuun niistä **tyrskyistä, jotka lyövät laivan keulaan**: kun katsoo myrskyssä eteenpäin, linssiin lentää vettä.

## Sessio 20 (käyttäjän kertoma, 2026-10-08)
- **Aavikon kuumuusaaltoilu on yhä liian iso.**
- **Bugi:** kun devtoolsilla teleporttaa nopeasti eri biomeihin, koko maailma menee valkoiseksi ja bugaa.
- **Termiittikekoon** nimi näkyviin ("Termiittikeko").
- **Yöllä biomien taustamusiikki loppuu:** täydellinen hiljaisuus, "vain luonto ja minä", vähän pelottavaa, jotta pelaaja ymmärtää yön saapuessa, ettei kaikki ole enää "sunshine & rainbows".
- **Kellonaika näkyviin kartan lähelle, mutta vain jos on Kello.** Kello löytyy arkuista: ei super harvinainen, mutta ei aivan yleinenkään (sitä pitää vähän etsiä). Näyttö: **kellotaulu kartan reunassa**.
- **Varustetun esineen tausta muuttuu vihreäksi.**
- **Repun käyttö kuten Minecraftissa:** kerran painamalla ottaa, kerran painamalla laskee.
- **Toinen käsi:** kilpi ja soihtu saa toiseen käteen repusta varustamalla tai painamalla **F**, kun se on kädessä.
- **Repussa paljon napakoita animaatioita;** liikuteltava esine himmenee ja kirkastuu vuorotellen.
- **Pinon jako:** vain **Ctrl + hiiren oikea**, joka avaa pienen ikkunan, jossa pinon voi jakaa haluamallaan tavalla (hiiren oikea on edelleen syö / varusta).
- **Pinot:** materiaalit 50, ruoat 20.
- **Linnunrata on yhä liian kirkas / voimakas.**
- **Valmistuksessa pieni latausaika** (esim. 2 s), jonka ajan nappi on lukossa ja siinä lukee "Valmistetaan".
- Reppu ei ole vielä "valmis", mutta hyvällä mallilla; lisätään myöhemmin.

## Sessio 19 (käyttäjän kertoma, 2026-10-08)
- Taistelusta tykätään, mutta **savipeikkojen ja pahkasikojen tappaminen on liian helppoa, koska ne ovat liian staattisia**: hyökkäävät vain suoraan päin (tai pahkasiat juoksevat pois). Niiden pitäisi esim. **kiertää ympyrää** tai **iskun jälkeen perääntyä ja iskeä takaisin**. **Savipeikko on ehkä turhankin heikko.**
- **Linnun äänitehoste** (useassa biomissa) alkaa liian yhtäkkiä: pehmennettävä.
- **Kirveen hakkaus on liian nopeaa:** pidetään hitaana, koska kirves on raskas eikä puuta voi kombottaa.
- **Kaatuvat puut tuhoavat** toisten puiden lisäksi **myös muita kasveja alta**, riippuen siitä, kuinka pahan osuman puu tekee.
- **Terveyspalkki ym. ovat hyviä**, mutta hienosäätöä ulkonäköön; (kuvassa:) terveyspaneeli ja pikapalkki **hieman suuremmiksi?**, minikarttaan **hienompi kehys**, opaspaneeli **pois**.
- **Panssarin näyttö terveyden viereen** (panssareita ei vielä ole, tulevat myöhemmin): kilpi-ikoni ja numero.
- **Pikapalkki ja reppu täysin uusiksi** (ei tarpeeksi intuitiivinen):
  - esineitä **vedetään ja pudotetaan**; Shift+klikkaus ja pinon jako
  - **varusteet ovat repussa ja varustetaan sieltä** (ei erillisiä paikkoja)
  - **valmistus aukeaa repusta, mutta omana ikkunanaan toisella reunalla**; näkyy **vain siinä paikassa tehtävät** reseptit (ilman työstöpenkkiä niitä on niukasti); **valitaan resepti ja painetaan Valmista** (×1 / ×5 / kaikki)
  - pikapalkissa **6 paikkaa**
- **Vinkit (opas) pois näkyvistä**, saa esiin **T-näppäimellä**.

## Sessio 18 (käyttäjän kertoma, 2026-10-07)
- **Soihtu ei sammu sateessa**, vaan palaa heikommin ja yskivästi; se sammuu vain, kun sen kanssa menee uimaan.
- **Energia (kestävyys) kuluu hitusen liian nopeasti.**
- **Paraneminen on liian nopeaa:** nopeaa vain juuri syömisen jälkeen (käyttäjä valitsi: 30 s nopeaa, sitten hidas), muuten nerfattava.
- **Taistelu:** kirveellä ja nuijalla ei saa nopeita iskuja (valinta: lyhyt 2 iskun sarja), viidakkoveitsen kombot ovat överinopeita (valinta: iskujen väli selvästi pidemmäksi, n. 0,45 s).
- **Puihin ei tekstiä "vaatii kirveen":** puun voi lyödä millä vain (käsin, vaikka marjoilla), mutta ilman kirvestä vahinko on niin mitätön, ettei se kaadu koskaan. **Kiveen tulee teksti, esim. "Liian kovaa!"**
- **Ei tekstejä** torjunnasta ("PARRY"), väsymyksestä eikä aaveista; kun kestävyys loppuu, **kestävyyspalkki hehkuu hieman punaisena**.
- **Aavikon kuumuusväreily vähemmäksi** (siisti mutta liian runsas).
- **Jousi latautuu liian nopeasti.**
- **Eläinten ja asioiden tekstit vasta, kun pelaaja oikeasti katsoo suoraan kohteeseen tähtäimellä.**
- Toimintatapa: Claude saa kysyä välikysymyksiä, jos tulee epäselvyyksiä, jotta asiat saadaan kerralla valmiiksi.

## Sessio 17 (käyttäjän kertoma, 2026-10-07)
- **Puu pois kokonaan käyttöliittymästä**; modernimpi ilme sopii paremmin.
- **Eläinten ja mobien nimet ja kestävyyspalkit näkyvät turhan kaukaa** ja paljastavat liikaa: ne näkyvät vasta läheltä, kun olentoon katsotaan.
- **Jousella ampuessa tähtäin muuttuu "+"-muotoiseksi** kuin aseessa, ja sen alla on **pieni valkoinen palkki**, joka näyttää, kuinka pinkeäksi jousi on jännitetty.
- **Ampuessa pikapalkin viereen** näkyy pienenä, **montako nuolta on jäljellä**.

## Sessio 16 (käyttäjän kertoma, 2026-10-07)
- Savulasi on parempaan päin, mutta **Eagle Lake -fontti tekee halvan mobiilipelifiiliksen**. Tilalle **moderni, mutta selviytymispeliin sopiva** fontti, ei futuristinen, ja **omaperäinen** (ensimmäiset ehdokkaat olivat liian tavallisia). Käyttäjä valitsi **Philosopherin**.
- **Puun kulmiin nauloja tai narua.**
- **Animaatiot todella pehmeiksi ja hyviksi, mutta nopeiksi ja napakoiksi**, ei kankeita eikä liian hitaita. Tähän kiinnitettävä erityistä huomiota.
- **Kun ruoan vaikutus on lopussa**, ympyrä alkaa hennosti himmenemällä välkkyä, ja ympärille tulee aivan pieni oranssi hehku. Ei liian huomiota herättävä, ettei pelaaja säikähdä.

## Sessio 15 (käyttäjän kertoma, 2026-10-07)
- Veistetty puutyyli (sessio 14) **ei sittenkään miellytä**. Uusi suunta: **rustiikkisen puun ja modernin käyttöliittymän yhdistelmä**.
- Kolmesta vaihtoehdosta (A puulaatta, B savulasi, C minimalistinen) käyttäjä valitsi **B: savulasi** (läpikuultava moderni paneeli, puu vain pienenä kylttinä ikonille).

## Sessio 14 (käyttäjän kertoma, 2026-10-07)
- **Käyttöliittymä uusiksi, hienommaksi ja elegantimmaksi.** Eagle Lake -fontti on ok. Edellinen palkkilaatikko oli liian iso. Puinen pohja, yksityiskohtainen. Claude kysyy jatkokysymyksiä koko ajan.
- Vastaukset kysymyksiin: koskee elämäpalkkeja ja syötyjä ruokia; lämmin keskiruskea puu (syykuvio, oksankohdat); jokaisella palkilla oma kehys; messinkiniitit, köysisidokset, kaiverretut kuviot sekä kulumat ja halkeamat (köydet ja niitit pienempinä).
- Ensimmäinen versio oli käyttäjästä **"mobiilipelimäinen" ja "cartoon"-tyylinen**: sydän- ja salamaikonit eivät ole se juttu. Tilalle **jalostunut, hieno tyyli**, elementit **väljemmin** (selvä väli).
- Tunnelma lähinnä **Valheimia**; puu **veistettyä käsityötä**; muoto **veistetty lauta**; palkkien värit **hillityt, maanläheiset**; ikonit **realistiset**; hieman isompi koko.
- Toinen versio: puu näytti vielä **piirretyltä**, ja palkit olivat **liian kapeita tikkuja**. **Kestävyys kuten Valheimissa**: näkyy vain kun sitä kuluu (ruudun alaosan keskellä).
- **Numerot vain kun arvo muuttuu.**
- **Syödyt ruoat:** eri ruokalajeja saa syödä rajattomasti (myös samaa), mutta vain niin kauan, kunnes maksimiterveys on 100. Ruoka nostaa maksimiterveyttä ja **myös energiaa (kestävyyttä) samalla mallilla**. Perustaso ilman ruokaa 25. Vaikutus kestää ruoan mukaan 5–20 min. **Nälkäpalkki poistuu.** Syödyt ruoat näkyvät **puisina kiekkoina palkkien vieressä pystyssä**, kaari kertoo jäljellä olevan ajan, enintään 4 näkyvissä. Lukittu osa (maksimin yläpuoli) raidallisena sopii.

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
- Sessio 14: ruokajärjestelmä (syödyt ruoat nostavat maksimiterveyttä ja -kestävyyttä, nälkäpalkki poistui), veistetty puinen terveyslauta valaistuin kaiverruksin, kestävyys vaakapalkkina keskellä vain käytettäessä, ruokakiekot ajan kaarella.
- Sessio 13: Eagle Lake -fontti kaikkialla, nimilaput kohteissa, kestävyyspalkki vain olennoilla, huomattu-merkki, pystypalkit vasemmassa alakulmassa, kaatuvat puut murskaavat ja kaatavat toisia puita, soihtu sammuu vedessä ja yskii sateessa, kuun vaiheet (täysikuulla enemmän vihollisia), lammikot eivät leiju.
- Sessio 11: tulikärpäsparvet, pienemmät aallot, ei vettä veneiden sisällä, realistinen sade ja sadeverhot, kuivuvat lammikot, säät biomeittain (kuiva laterittitasanko), rakennelmia n. 3 700 ja hylkyjä n. 120, hienovarainen linnunrata ja tähdenlennot, purjeen saumat ja vastavalo, hento kimallus, Haamu latvusten alla ja pako, jousi oikeassa kädessä ja nuolten jälki, sujuvampi iskujen tahti, tuulen nuolen suunta.

## Paikkamerkit (Clauden valitsemia, voi muuttaa vapaasti)
- **Sessio 27:** kookos kasvaa takaisin 6 pelitunnin välein; ravistus pudottaa 1–2, lyönti 35 % todennäköisyydellä yhden; kookospalmussa 6–10, sademetsän/keitaan palmussa 4–7 pähkinää. Liaaneista 50 % kiinni maassa (lähes kireinä), muut riippuvat vapaasti 1,0–3,8 m maanpinnan yläpuolelle; paksuus 3–6 cm; 7 lehteä. Lammikoita enintään 6 / chunk, säde 1,9–3,6 m, syvyys 5–80 cm. Kaislojen tiheys 120–420 biomista riippuen. Jalanjälki 0,34 × 0,64 m. Aavikon tuuli 0,24–0,40.
- **Sessio 26:** valokeilat: ilman tiheys = sademetsän kosteus × 1,1 + aamu-usva × 0,6 + utu × 0,35 + sade × 0,3 (enintään 1,2), voimakkuus 0,011 × auringon valo, matka enintään 50 m. Simpukat: rannalla tiheys 14 (ennen 4), merellä 2; kampa-, sydän-, kauri- ja tornisimpukka, 1–3 kasassa, sydänsimpukoista 30 % ylösalaisin. Simpukankuori = materiaali, pino 50. Jalanjälki 0,24 × 0,44 m, kuoppa enintään ~2 cm, valli ~0,5 cm (varpaiden edessä korkeampi), häviää 50 s:ssa. Palmut: palmussa 14–16 lehteä (joka kuudes kuiva, 21 lehdykkää per puoli), kookospalmussa 13–15 lehteä (22 lehdykkää) ja 5–10 kookosta; banaanissa 1–3 vartta, 7–9 lehteä, terttu 55 %:lla. Musiikki: uuteen biomiin 4 s, kappale soi vähintään 10 s. Aavikon tuuli 0,38–0,63, savannin tuuli 0,22–0,47.
- **Sessio 23 (ulkoasu):** tekstuurit ambientCG:stä ja mallit Poly Havenista (CC0, ks. assets/CREDITS.txt). Maasto: neljä maalajia (hiekka Ground054, kuiva maa Ground072, metsänpohja Ground078, kallio Rock030) sekoitetaan biomien mukaan; jyrkät rinteet, graniitti ja pöytävuoret kalliota. Biomien värit säilyvät (tekstuuri antaa yksityiskohdat, vertex-väri sävyn). Laatat 3–6 m, toisto hajotetaan toisella mittakaavalla, yksityiskohdat hiipuvat 40–260 m:ssä. Mallit: kaarna (Bark014) rungoissa ja lahopuissa, kivi kalliomuodostelmissa ja kivissä, maa termiittikeoissa, laudat (Planks012) hylyissä, veneissä ja rakennelmissa (savi- ja kiviseinät omilla tekstuureillaan). Lohkareet: viisi skannattua Namaqualand-lohkaretta (2,5 m jalanjälki, lähellä ~1 800 ja kaukana 260–590 kolmiota). Lehvästöt: lehtikortit (LeafSet019 akasialle, LeafSet024/022 muille) latvusten pinnalla, ydin pienempänä ja tummempana; kaukomalleissa harvemmat ja isommat kortit. Pensaat ja tiheiköt samoin.
- **Sessio 22 (esineet):** tasot 0 puu, 1 kivi, 2 piikivi, 3 kupari, 4 rauta, 5 rubiini. **Kirveet ja hakut** kivestä rubiiniin (teho 1 / 1,5 / 2 / 2,8 / 4, aseena ×1 / 1,15 / 1,35 / 1,6 / 2). **Terät:** kivipuukko, piikivitikari, kuparimiekka, viidakkoveitsi (rauta), rautamiekka, rubiiniterä, Verikide (rubiinitikari); ei kuparitikaria, ei piikivimiekkaa. **Murskaavat:** puunuija, kivinuija, kuparimoukari (vain kuparista), piikkinuija (rauta); ei rubiininuijaa. **Keihäät:** seiväs (puu), piikivikeihäs, rautakeihäs; ei kupari- eikä rubiinikeihästä. **Kilvet:** puu, nahka (helpompi parry), kupari, rauta. **Jouset:** lyhytjousi, jännejousi, jalopuujousi, ydinpuujousi, rubiinijousi (voima 1 / 1,3 / 1,55 / 1,9 / 2,2). **Nuolet:** puu, luu, piikivi, kupari (21), rauta (26). **Panssarit** (pää / keho / jalat): riepu 1/2/1, nahka 2/4/2, luukypärä 3, kupari 4/7 (ei jalkoja), rengas 5/9/5, rauta 6/12 (ei jalkoja), rubiiniotsaripa 5. Panssari vähentää olentojen iskuja osuudella a / (a + 30) (täysi rautavarustus n. 40 %). **Rubiinin voima:** aseen osuma palauttaa 12 % vahingosta terveyttä (punaiset kipinät), otsaripa parantaa 0,35 / s; rubiiniosat hehkuvat ja sykkivät. **Puut:** peruspuu pensaista (1), tumbleweedeistä (1), akasioista ym.; sademetsäpuu antaa jalopuuta ja vaatii piikivikirveen; kapokkipuu antaa ydinpuuta ja vaatii kuparikirveen; baobab: kuorinta millä tahansa kirveellä (12 tehoyksikköä, joka isku 1 puu, rautakirveellä 2), sitten ytimen kaato rautakirveellä (16), kaadettu runko antaa 6 ydinpuuta, 3 puuta ja 2 apinanleipää. Baobab ja kapokki eivät kaadu ketjureaktiossa. Liian heikko työkalu: "Tarvitset paremman kirveen / hakun", ei vahinkoa. Metalliesineet valmistetaan toistaiseksi työstöpenkillä (pajaa ei vielä ole); rautarenkaat (1 harkko → 4) rengaspanssariin. Kukat ja simpukankuoret jäivät maailmaan koristeiksi.
- **Sessio 21:** nimen esiintulo: 0,19 s (nousu 6 px, koko 92 → 100 %, sumennus 2 px → 0, kirjainväli tiivistyy); sama kohde uudelleen alle 0,22 s:n katkon jälkeen ei toista animaatiota. Hyppyisku: alkaa, kun isku aloitetaan ilmassa (ei vedessä eikä kyydissä) ja sarja on alussa; kirves 26 vahinkoa (tavallinen 13), nuija 36 (19 / 23), horjutus 0,8–1 s, osuessa pelaaja painuu alas, 0,16 s pysäys, kipinät ja pölypöllähdys, matala jysähdys ja tähtäimestä laajeneva rengas. Haamun äänet n. −5 dB (0,2–0,25), väistö 0,75. Parry: tönäisy 7,5 (ennen 6), taintuminen 1,8 s: kolme pientä tähteä kiertää pään ympärillä, olento retkahtaa taaksepäin ja huojuu; kipinäpurske iskun kohdassa; ruudun välähdys 55 %. Kuu: vaihe arvotaan joka yölle maailman siemenestä (yö vaihtuu keskipäivällä), joten täysikuu (ja enemmän vihollisia) n. joka neljäs yö sattumalta. Savipeikon nousu: maa pöllähtää (kokkareita, pölyä, savua), maa hehkuu oranssina 2,2 s ja kipinöitä nousee. Esineet katoavat 10 min:ssa (kutistuvat 0,5 s), aika säilyy tallennuksessa. Kello: kellotaulu 52 px ja digitaaliaika minikartan vasemmalla puolella. Keularoiskeet: myrskyssä (ukkonen > 0,3 tai iso isku), katse keulan suuntaan, n. 0,45–1,15 s välein: vesikalvo vääristää kuvaa hetken, 24 pisaraa (isot valuvat ja jättävät jäljen) + hieno suihku; enintään 4 roisketta yhtä aikaa. Sateen pisarat linssillä 0,25 (ennen 0,35).
- **Sessio 20:** kuumuusväreily 30 % alkuperäisestä ja kapeampi vyö horisontissa. Linnunradan hehku n. puolet edellisestä, vyön himmeitä tähtiä vähemmän. Yöhiljaisuus: musiikki hiljenee, kun päivänvalo < 0,2 (n. 10 s viive + 3,5 s häivytys), palaa kun > 0,35. Kello: n. 13 % arkuista, 12 tunnin kellotaulu minikartan vasemmassa alakulmassa. Toinen käsi: kilpi tai soihtu (yksi kerrallaan); toiseen käteen varustettu pino ei ole pääkädessä. Valmistus 2 s (sarja + 0,3 s / kpl, enintään 5 s). Pinot: materiaalit, nuolet ja arvoesineet 50, ruoat ja lääkkeet 20; soihtu ja nuotio 5, työkalut ja aseet 1. Nimilaput myös kandelaaberipuulle ja kalliomuodostelmille. Jakoikkuna: liukusäädin, "Ota" vie valitun määrän kursoriin.
- **Sessio 19:** pahkasika: 60 % todennäköisyydellä kiertää ensin (säde 4,5 m, 1,1–2,5 s), iskun jälkeen perääntyy 0,8–1,6 s katse pelaajaan ja hyökkää uudelleen. Savipeikko: 42 terveyttä (ennen 28), 11 vahinkoa (8), juoksu 3,9 (3,5), kiertää välillä (säde 3,3 m), perääntyy iskun jälkeen (65 %), enintään 2 hyökkää kerralla (muut kiertävät). Linnun ääni alkaa 0,9 s häivytyksellä. Kirves: yksi isku 0,55 s + jäähdytys 0,38 s, 13 vahinkoa. Kasvien murskaus: pensaat ja pienet kasvit (kukat, marjapensaat, sienet, ruokotuppaat ym.) rungon ja latvuksen alla; todennäköisyys 25 % + 75 % × voima (nopeus ja puun pituus). Reppu: 30 paikkaa (5 × 6) + pikapalkki 6 (ennen 24 + 8); vanhojen tallennusten pikapaikat 7–8 siirtyvät reppuun. Panssari: esineille `armor: { slot, value }`, yksi kutakin paikkaa kohti, näyttö piilossa kun 0. Minikartta: kompassirengas (asteikko 10° välein, P I E L), kääntyy kartan mukana. Terveyspaneeli 282 × 52 px, pikapalkin paikat 66 px. Repun ollessa auki pikapalkki ja minikartta piilossa.
- **Sessio 18:** soihtu sateessa: liekki 65–100 % (rankkasade), notkahdukset 0,15–0,45 s × 0,62, liekki näkyy vähintään 45 % koossa, valo vähintään 35 %. Kestävyys: juoksu 12/s (ennen 14), uinti 3,9/s (4,5), paikallaan uinti 1,3/s (1,5), kertakulutus (iskut, hypyt) × 0,88, jousen jännitys hieman halvempi. Paraneminen: 30 s syömisen jälkeen 1,5/s, muuten 0,375/s. Kirves: 2 iskua (toinen 0,36 s ensimmäisen jälkeen, 12 + 11 vahinkoa, 7 + 11 kestävyyttä). Nuija: 2 iskua (toinen 0,53 s jälkeen, 19 + 23 vahinkoa). Viidakkoveitsi: iskut 0,45 s välein. Puu ilman kirvestä: 1 % kirveen iskusta (n. 500 lyöntiä). Kuumuusväreily 60 % entisestä. Jousi 1,45 s (ennen 0,95), jännejousi 1,3 s (0,85). Olennon nimilappu: säde osuu olennon kapseliin (todellinen säde ja korkeus), eikä esine (puu, kivi) ole edessä.
- **Sessio 17:** olennon nimilappu näkyy, kun olento on alle 14 m:n päässä ja tähtäimen kohdalla (näennäisen koon mukaan, vähintään 26 px); lappu viipyy 1,2 s; lyödyn olennon lappu näkyy 5 s (alle 32 m). Jousen tähtäin kiristyy jännitettäessä (115 % → 75 %), palkki hehkuu täysin jännitettynä. Nuolilaskuri näyttää kaikkien nuolityyppien yhteismäärän, punertava kun nuolet ovat loppu.
- **Sessio 16:** Philosopher kaikessa tekstissä paitsi valikon Sahel-logossa (Eagle Lake). Naulat puukylttien kulmissa (terveys 4, kestävyys 2). Animaatiot: vahinko näkyy palkissa lähes heti (~30 ms), parannus pehmeämmin (~110 ms) hennolla hehkulla; menetetty osa viipyy 0,45 s ja kutistuu; osumasta 0,26 s tärähdys (1–3 px) ja välähdys; numero hypähtää vähintään 2 yksikön muutoksesta; kestävyys liukuu esiin 0,2 s ja häipyy 0,42 s; ruoka ponnahtaa esiin joustaen 0,38 s, loppunut kutistuu pois 0,22 s, muut liukuvat paikoilleen 0,26 s; pikapalkin valinta 0,16 s; viestit liukuvat ylös. Loppuva ruoka: viimeinen minuutti, välke 1,9 s jaksolla (läpinäkyvyys 100 → 55 %) ja pieni oranssi hehku.
- **Sessio 15:** savulasipaneeli (tumma, 50 % läpikuultava, sumennus 6 px, ohut kermanvärinen reuna), puukyltti 46 × 46 px, viivaikonit (pisara = terveys, tuulen viivat = kestävyys). Terveys 250 × 46 px vasemmassa alakulmassa, ruoat lasiympyröinä (36 px) sen yläpuolella rivissä, kaari kertoo ajan. Terveysnumero on himmeä ja kirkastuu 1,6 s:ksi muuttuessaan. Kestävyys 176 × 22 px pikapalkin yläpuolella, näkyy vain käytettäessä. Sessio 14:n veistetty lauta ja `barFrame` jäivät koodiin käyttämättöminä.
- **Sessio 14:** ruokien arvot (maksimiterveys / -kestävyys / kesto): sienet 3–10 / 2–6 / 5–6 min, paahdettu sieni 14/8/8, raaka liha 10/5/5, paistettu liha 30/12/15, jujuba 5/10/5, banaani 10/18/8, kookos 8/25/10, apinanleipä 12/16/10, pähkinät 3/4/5, paahdetut 10/14/10, moringa 6/6/6, bissap-kukat 2/4/5, fonio 2/3/5, fonio-puuro 24/20/15, lihapata 45/30/20, bissap-juoma 4/12/8. Vaikutus alkaa hiipua, kun jäljellä on 35 % ajasta. **Uusi peli alkaa "Lähtöeväillä"** (+45 / +45, 12 min), ettei alku ole liian vaikea; vanhojen tallennusten kylläisyys muuttuu lähtöeväiksi. Kuoltaessa ruoat säilyvät (tilavaikutukset nollautuvat). Nälkään ei enää kuole. Syöminen estetään ("Olet kylläinen"), kun maksimiterveys on 100; lääkkeet käyvät aina. Iskusarjan raja on puolet nykyisestä maksimikestävyydestä. Ikonit: veripisara (terveys) ja jalanjälki (kestävyys). Terveyslauta 30 × 250 px, kestävyys 230 × 24 px hotbarin yläpuolella (häipyy 1,2 s täyttymisen jälkeen). Terveyden numero näkyy 1,6 s muutoksen jälkeen.
- **Sessio 13:** fontti Eagle Lake kaikkialla (myös kartat ja minikartta), yksi paino. Olentojen nimilaput näkyvät 24 m:n säteellä (enintään 12, haalistuvat reunalla); muut kohteet saavat nimilapun katsottaessa (kohteen yläpuolella, pysyy ruudulla). Huomattu-merkki: silmä; keltainen = huomannut (esim. pakenee), punainen ja sykkivä = hyökkää. Haamu ei murskaudu puun alle (aave). Kaatuvan puun vahinko (18 + 6 × pituus m) × (0,4 + 0,6 × nopeus), eli keskikokoinen puu n. 40–60, iso (yli 14 m) voi tappaa täysiterveenkin. Ketjukaato: todennäköisyys 35 % + pituus/18 (enintään 90 %), enintään 3 puuta peräkkäin, suunta seuraa kaatuvaa puuta. Palkit: 12 × 130 px, järjestys terveys (sydän), kestävyys (salama), ruoka (ruokakulho). Soihtu: sammuu, kun pelaaja on kokonaan veden alla tai kamera vedenpinnan alla; sytytetään uudelleen seisomalla nuotion vieressä (3,2 m). Sateessa liekki 45–80 %, satunnaisia "yskäisyjä" 0,25–0,7 s (liekki 35 %). Kuun kierto 8 pelivuorokautta; kuunvalo 20–100 % vaiheen mukaan. Täysikuulla savipeikkoja 45 % ja haamuja n. 35 % enemmän. Lammikko hylätään, jos maa sen alla ei ole tasainen (korkeusero yli 12 cm).
- **Sessio 12e:** linssiheijastus: hehku, säteet, vaakajuova ja 5 väriheijastusta, peittyy esteiden takana, heikkenee pilvissä ja pölyssä. Linssipisarat vain kyydissä ukkosella (taso 0,35). Haamu: 40–80 s / 33 % (ukkosella 22–40 s / 60 %, enintään 2). Väistö: puu kaatuessa taustaäänet 0,5 ja musiikki 0,5, isku 0,6, Haamu 0,6, puun lyönti 0,7. Iskuääni 0,11–0,13 (alipäästö 5,2 kHz). Napsahdus 0,45 (ennen 0,65). Huitaisu −2 dB. [Shift]+[Q] = koko pino. Soihtu: valo kädessä liekin kohdalla, 1,7 × nuotion perustaso (ennen 0,75 ×), kantama 32 m, loivempi vaimeneminen. Soihdun sytytys: 5 s, 3,5 vahinkoa / s.
- **Sessio 12d:** veneiden nopeudet: soutu 2,0 / 2,9 m/s (ennen 2,4 / 3,4), purjevene enintään 5,6 m/s × tuuli (ennen 8,5), "hiljaa" 1,0; purjelaiva 8,4 m/s × tuuli (ennen 13), "hiljaa" 0,9. Tyrskyt: keulan iskeytyminen aaltoon (veden nousunopeus keulaa vasten × aallokko) + vauhti yli 1,4 m/s; suihku keulan molemmin puolin ulos, ylös ja tuulen mukana, laivalla isompi. Linssipisarat: kun sade > 0,25 ja katse on aurinkoa kohti (kosini > 0,25), harvoja pisaroita, jotka elävät 10–20 s (valuvat hieman ja haihtuvat); vaatii jälkikäsittelyn (kytkeytyy automaattisesti). Lintu: sademetsässä 6–18 s välein, savannilla ja metsiköissä 18–48 s välein, vain päivällä eikä kovassa sateessa, 8–38 m:n päässä satunnaisessa suunnassa. Huitaisu: kaikilla työkaluilla ja aseilla (ei nyrkeillä), satunnainen tiedosto, sävelkorkeus 0,92–1,22 × (raskas ase 0,72–1,02 ×), olento iskun tiellä 45 %.
- **Sessio 12c:** Haamun äänet vaimenevat vasta 22 m:stä (kuuluvat n. 95 m:iin), tasot 0,38–0,45; satunnainen ääntely vuorottelee kahden tiedoston välillä. Ukkosella päivällä valotus × (1 − 0,42 × ukkonen), eli n. 40 % hämärämpi. Ukkosmyrskyssä haamun tarkistus 15–30 s välein, todennäköisyys 85 %, enintään 2 kerrallaan (muuten 35–75 s, 40 %, 1). Salaman isku maahan (vain lähisalamat, ei veteen): hiekkaa ja multaa lentää, pölypilvi nousee hitaasti (2,6 s), pieni tulipallo leimahtaa (0,6 s). Aavikon tuuli 0,3 × (aavikolla 0,1, hiekkamyrskyssä 1), myrskytuuli 0,3 (merellä ukkosella; hiekkamyrskyssä puuskittain). Esineen heitto: napsahdus 0,65. Isku puuhun: 0,07, sävelkorkeus 0,82–1,22 ×. Tuuli (taustatuuli) ei enää soi hiekkamyrskyssä, koska sen hoitavat aavikon tuuli ja myrskytuuli.
- **Lähisalamat ja Haamun äänet (sessio 12b):** 28 % salamoista iskee 45–155 m:n päähän (muut 250–600 m): välähdys 2,4-kertainen, koko näytön sinertävä välähdys, salama valkoisena nauhana hehkuineen (0,5 s), jyrähdys (satunnaisesti "thunderclap" tai "ukko", hiljaisuus alusta leikattu) salaman suunnasta enintään 0,25 s viiveellä, taso 0,65. Haamu: ilmestymisääni joka kerta kun se ilmestyy ja 40 % todennäköisyydellä ennen syöksyä (taso 0,22), hyökkäysääni syöksyn alkaessa (0,26), satunnainen ääntely 8–18 s välein leijuessa ja kierrellessä alle 45 m:n päässä (0,2). Äänet tulevat haamun suunnasta ja vaimenevat etäisyyden mukaan. Viidakko 0,22 ja alipäästö 4,2 kHz. Puun ääni häivytetään 0,25–0,9 s räsähdyksen jälkeen.
- **Sadeverhot (sessio 12b):** verhot sumun kantaman 70 %:n ja 95 %:n etäisyydellä (vähintään 35 m), usva vain kunnon sateessa (ei sademetsän tihkussa).
- **Äänitehosteet (sessio 12):** tiedostot tasattu −20 LUFS:iin (puu −16). Tasot: tuuli 0,3 (vuoristossa ja merellä 0,6–1 × tuulen mukaan, ukkosella ja hiekkamyrskyssä täysi), viidakko 0,36 (häivytys n. 2–3 s), sade 0,42 × sateen määrä^1,2 (sademetsän tihku hiljaa), kaukainen ukkonen 0,42. Silmukoiden sauma ristiinhäivytetään 3 s:ssa, ja ensimmäinen kierros alkaa satunnaisesta kohdasta. Puun ääni 0,3 (10–12 m:stä), vaimenee etäisyyden mukaan (kuuluu n. 140 m:iin), tulee oikealta suunnalta, ja räsähdys (tiedostossa 0,92 s) ajoitetaan rungon osumaan maahan (kaatuminen 1,5–2,2 s). **Tuuli myös hiekkamyrskyssä** (Clauden lisäys).
- **Askeleet (sessio 12, syntetisoitu):** hiekka (pehmeä rahina), ruoho (rapina), sademetsän karike (vaimea, tömähtävä), sora / lateriitti (rapse), kallio (napsahdus), puulattia (ontto kopse), matala vesi (loiske). Askel joka puolikkaalla heiluntajaksolla (kävellen n. 2,5 / s), juostessa voimakkaampi, hiipiessä hiljainen; alastulo hypystä kuuluu.
- **Vuoriston sää (sessio 12):** selkeä 4, pilvinen 1,5, hiekkausva 1,5, hiekkamyrsky 0,3 (ei sadetta, ukkosta eikä sumua).
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
- **Hahmo:** tummaihoinen käsi ja indigonsininen hiha (koska peli sijoittuu Burkina Fasoon). Sessio 29: käsi vaihdettiin käyttäjän antamaan malliin ja tekstuuriin (vaalea iho); ihonsävyä voi tummentaa, jos käyttäjä haluaa.
- **Valikon fontit:** Eagle Lake (otsikko), Permanent Marker (napit), Alegreya (teksti).
- **Ohjaimet:** WASD, Shift, välilyönti, Ctrl/C (kyykky päälle/pois), hiiri 1 (lyö, sarjat), hiiri 2 (torju / aseta / varusta kilpi), E, Q (heitä esine), 1–8, Tab/I, M, F3 (kehittäjätyökalut), Esc.
- **Iskut (sessio 11):** yhden iskun kierto (animaatio + jäähdytys) olentoon osuessa: nyrkit 0,64 s (6 vahinkoa, kestävyys 5), risu 0,72 s (6, 5), kivipuukko 0,54 s (7, 5), kirves 0,78 s (12, 7), hakku 0,83 s (11, 8), keihäs 0,95 s (15, 10, ulottuu 3,4 m), puunuija 1,45 s (21, 18, iso tönäisy). Kun isku ei osu olentoon (hakkuu, louhinta, ohi), jäähdytys on 55 % (nyrkit n. 0,5 s, kirves n. 0,65 s). Viidakkoveitsi: sarja 10 + 10 + 19 (kestävyys 9 + 14 + 22, jatkuu vain yli 50 %:n kestävyydellä), sarjan jälkeen 1,1 s jäähdytys.
- *(Vanha, sessio 9:)* **Iskut:** iskujen väli (animaatio + jäähdytys): nyrkit 1,1 s (6 vahinkoa), risu 1,15 s (6), kivipuukko 0,9 s (7), kirves 1,05 s (12), hakku 1,1 s (11), keihäs 1,3 s (15, ulottuu 3,4 m), puunuija 1,9 s (21, iso tönäisy). Viidakkoveitsi: sarja 10 + 10 + 19 (kestävyys 10 + 16 + 26, jatkuu vain yli 50 %:n kestävyydellä), sarjan jälkeen 1,6 s jäähdytys.
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
- **Aallot (sessio 11):** meren aaltojen amplitudi n. 0,13 m (selkeä), n. 0,28 m (sade), n. 0,57 m (ukkosmyrsky); vaahtopäät vasta kovalla tuulella. Järvillä pieniä väreitä, joissa virtaus. *(Sessiot 5–10: 0,3 m – n. 1,8 m.)*
- **Kelluvat esineet:** puu, risut, kuitu. Muut uppoavat.
- **Uudet maastonmuodot:** graniittikalliot (Sahel, sademetsä; 10–40 m korkeita, lohkareita ympärillä), pöytävuoret aavikolla (16–46 m), Sahelin loivat kumpareet.
- **Uudet kasvit ja esineet:** karitepuu (Sahel, 6 iskua + runko 4), doumpalmu (kausilammet, keitaat; 5 + 3), kookospalmu (ranta; 4 + 3), lahopuu ja sammaloitunut runko (kirves, puuta), villibanaani (kuitua), aavikkopensas, ajopuu (poimitaan: puuta), korkea heinä, kukat, sienet, lumpeet, merilevä, luut, kivikko.
- **Grafiikka-asetukset:** Valonsäteet (oletus päällä), Liike-epäterävyys Pois/Kevyt/Vahva (oletus pois), Syväterävyys (oletus pois). Varjot: Normaali (170 m) / Tarkka (260 m).
- **Kartta:** paljastuu n. 100 m säteeltä. Merkkisymbolit: raksi, pallukka, talo (käyttäjän esimerkit) sekä lippu ja tähti. Minikartta kääntyy katsesuunnan mukaan, iso kartta on pohjoinen ylöspäin. Kartta on aina käytössä (ei erillistä esinettä).
- **Rakennelmat:** kivikehä (Sahel: savanni, laterittitasanko, akasiametsikkö, dyynit), hylätty leiri (aavikko, dyynit, keidas, ranta), talon rauniot ja kylän rauniot (kaikki biomit), riimukivi ja riimutaulu (kaikki biomit), laivanhylky (vain hiekkaranta). Vuoristossa rauniot ovat kiveä, sademetsässä köynnösten peittämiä. Sessio 11: 180 m:n solua kohti 60 %:n todennäköisyydellä, n. 3 700–3 800 rakennelmaa / maailma (sessiossa 9 n. 1 800). Laivanhylky 35 %:ssa soluista, joissa on rantaviiva (n. 120 / maailma, ennen 6–13); hylky on rannalla n. 4 m vesirajasta. Arkku 45 %:ssa (ei riimukivissä).
- **Arkun tavallinen saalis:** 2–3 seuraavista: risuja, kiviä, kuitua, puuta, piikiveä, köyttä, piikivinuolia, kumia, soihtu, karitepähkinöitä, yrttirohto. Laivanhylyn arkussa merihenkinen saalis (köyttä, simpukankuoria, puuta, kookospähkinöitä, luunuolia, nahkaa). Arvoesineitä 10 %:ssa arkuista kuten ennen.
- **Arvoesineet:** kultahippu (1–3), kaurikotilo (3–8), pronssirannerengas (1); arkussa 1–2 näistä. Ei vielä käyttöä.
- **Sademetsän kasvit:** sademetsäpuu (6 iskua + runko 4), kapokkipuu, tiheikkö, bambu (risuja), saniainen, aluskasvillisuus, ruoko. Kulku 30 % hitaampaa.
- **Aavikko:** keitaat (vesi, palmut, ruo'ot), kuolleet puut (kirves, puuta + risuja).
- **Vuoristo:** kalliomuodostelmat, kalliotornit, lohkareet, kandelaaberipuut (euphorbia), kerrostuneet kallion värit.
- **Ravinto ja myrkytys (sessio 9):** ravinto 100, tyhjenee n. 34 min:ssa (juostessa 1,7×, uidessa 1,4×). Alle 20: palautuminen hitaampaa; tyhjänä −0,5 terveyttä / s. Myrkytyksen todennäköisyys: ruskea sieni 15 %, kalpea sieni 40 %, punahattu 85 % (vahvempi), termiittisieni 5 %, paahdettu sieni 6 %, raaka liha 30 %. Myrkytys −0,45 terveyttä / s (ei alle 4), kestävyys palautuu hitaammin.
- **Poimittavat (sessio 9):** piikivi, simpukankuoret, sulat, kookospähkinät, apinanleivät, karitepähkinät, jujubapensas, moringa, hibiskus (bissap), ruoko (veden lähellä), fonio, savi (veden lähellä), neljä sientä (ruskea, kalpea, punahattu, termiittisieni), kukat (terälehdet) ja luurangot (luita). Puista ja kasveista lisäksi kumia, palmunlehtiä, kookoksia, banaaneja, bambua ja karitepähkinöitä.
- **Jousi (sessio 9):** täysi jännitys n. 0,95 s (jännejousi 0,85 s), lähtönopeus 16–60 m/s jännityksen mukaan, jännittäminen kuluttaa kestävyyttä ja hidastaa liikettä. Nuolet järjestyksessä piikivi > luu > puu.
- **Arat eläimet (sessio 9, arvot päivitetty sessiossa 10):** gaselli (26 terveyttä, juoksee 7,6 m/s, huomaa 18 m:stä, laumassa 2–4; savanni ja metsiköt), helmikana (7, 5,2 m/s, lentää, 11 m, 3–6; savanni), apina (18, 6,2 m/s, 13 m, 2–4; sademetsä, keitaat), aavikkokettu (10, 6,8 m/s, 14 m, 1–2; aavikko, enemmän öisin), kutojalintu (3, lentää, 7 m, parvissa 4–7). Huomaamisetäisyys: paikallaan 0,75 ×, kyykyssä 0,3 ×, paikallaan kyykyssä 0,22 ×, juostessa 1,3 ×, uidessa 0,7 ×. Huomattuaan pelaajan eläin tarkkailee 1,2–2,4 s ja pakenee, jos pelaaja tulee yli 2,5 m lähemmäs tai alle 55 %:n näköetäisyydelle. Pako 2,5–4 s (haavoittuneena 3,5–5 s), väsymys paetessa enintään −45 %, haavoittunut hitaampi. Lauma varoitetaan 15 m:n säteeltä 0,2–0,8 s viiveellä. Saalis: lihaa, taljoja, luita, jänteitä ja sulkia.
- **Haamu (sessio 10):** 70 terveyttä, isku 17 vahinkoa (tönäisy 7), syöksy 10,5 m/s, varoitus 0,9 s (kädet ylös, hehku kirkastuu), huomaa pelaajan 30 m:stä (kyykyssä 18 m). Leijuu latvusten alla 2,6–4,2 m maasta ja vähintään 1,4 m pelaajan jalkojen yllä, väistää puunrungot ja kiertää pelaajaa 8,5 m:n säteellä 3–6 s ennen syöksyä (sessio 11; ennen 8–11 m). Alle 25 %:n terveydellä se pakenee latvusten yläpuolelle (13 m) ja haihtuu 9 s:n jälkeen tai 42 m:n päässä ilman saalista. Syntyy vain öisin (päivänvalo alle 12 %), kun pelaaja on sademetsässä, 32–52 m:n päähän, ei 18 m:n säteelle nuotiosta; tarkistus 35–75 s välein, 40 %, enintään 1 kerrallaan, edellisen jälkeen tauko 1,5–2,5 min. Nuotion valo: ei syöksy, jos pelaaja on 9 m:n säteellä nuotiosta (kiertää 16 m:n päässä). Aamulla haihtuu savuna. Saalis: kaurikotiloita 1–3, pronssirannerengas 0–1. Ensimmäisellä kerralla viesti "Latvuksissa leijuu jotain... Nuotion valo pitää haamut loitolla." Ulkonäkö: musta riekaleinen kaapu ja huppu, kasvojen kohdalla pimeää ja kaksi violettia silmää, tummansininen / violetti hehku (n. 2,3 m) ja himmeä jälkihehku.
- **Tumbleweedien elinympäristö (sessio 10):** aavikko, dyynit, laterittitasanko ja puoliksi pöytävuoret, ei keitaita ("mesabiomi" tulkittu laterittitasangoksi ja pöytävuoriksi).
- **Sademetsän tunnelma (sessio 10):** tihku = sade vähintään 0,24 × kosteus (tihkuna hitaammat, lyhyemmät ja himmeämmät pisarat), pilviä vähintään 62 %. Märkyys 0,85 sademetsässä (sateessa 0,9 × sateen määrä), kastuu n. 6 s:ssa ja kuivuu n. 45 s:ssa. Lammikot (sessio 11): 9 / chunk sademetsässä, 3 kausilammella, 2 savannilla ja metsiköissä, 0,7–1,8 m, vain tasaisella maalla. Sademetsässä ja keitailla aina; muualla vain sateella (täysikokoisiksi n. minuutissa) ja kuivuvat reunoilta n. 4 minuutissa sateen jälkeen.
- **Aavikon kuumuusväreily (sessio 10):** aavikon osuus × selkeä taivas (pilvet alle n. 0,3, ei sadetta, vähän pölyä) × aurinko korkealla (n. klo 9–15) × ei kosteutta; vaikuttaa yli 25–110 m:n päässä horisontin tuntumassa, kangastus yli 90–220 m:n päässä aivan horisontin alla.
- **Muiden biomien tunnusmerkit (sessio 10, Clauden ehdotus):** tulikärpäset (sessio 11: parvina jokien, purojen ja lampien rannoilla ja n. joka viidennen akasian alla, enintään 12 lähintä parvea / 320 kärpästä; ei merellä, rannalla, vuoristossa eikä aavikolla; illalla ja yöllä, ei sateella eikä kovalla tuulella), pölypyörteet (aavikko ja savanni kuumina päivinä; 14–26 m korkeita, kulkevat tuulen mukana 1,5–3,3 m/s, kestävät 25–45 s, enintään 2).
- **Pudotetut esineet (sessio 10, kimallus sessio 11):** hento tähtimäinen kimallus 0,3–0,6 m (esineen koon mukaan) ja satunnainen pieni välähdys, arvoesineillä hieman kirkkaampi kultainen. Heitetty esine: automaattinen poiminta vasta 10 s jälkeen ja kun pelaaja on käynyt yli 3 m:n päässä.
- **Säätaulukot ilmastoittain (sessio 11, painot):** aavikko: selkeä 4,5, hiekkausva 3, hiekkamyrsky 1,6, pilvinen 0,25. Laterittitasanko (kuiva): selkeä 4, hiekkausva 2,5, hiekkamyrsky 0,7, pilvinen 0,6. Savanni: selkeä 4, pilvinen 2,6, hiekkausva 1,8, hiekkamyrsky 0,3, sade 0,45, ukkonen 0,12. Ranta kuuluu meri-ilmastoon. Paikallisesti sade ja ukkonen poistetaan aavikolla ja laterittitasangolla ja pöly merellä, rannalla ja sademetsässä. Sademetsä: selkeä 2, pilvinen 3, sade 3, ukkonen 1,5, sumu 1,5. Vuoristo (sessio 12): selkeä 4, pilvinen 1,5, hiekkausva 1,5, hiekkamyrsky 0,3. Meri: selkeä 3, pilvinen 2, sade 1,5, ukkonen 0,6, sumu 0,5.
- **Sade (sessio 11):** 9 000 ohutta pisaraviirua 16 m:n säteellä (putoamisnopeus n. 9,5 m/s, vaihtelee), kaukana harmaat sadeverhot 26 m:n ja 70 m:n päässä, kovassa sateessa maanrajan usva, roiskeet maahan (enintään 220).
- **Linnunrata ja tähdenlennot (sessio 11):** himmeä, rakeinen vyö (hehku 0,03, tähtipöly 0,05), hennot pölykaistat, häviää horisontissa ja himmenee kuun valossa 30 %. Tähdenlento kirkkaana yönä 8–38 s välein, alkaa 30–70° korkeudelta, pituus 8–22°, kesto 0,45–1,05 s.
- **Jousi kädessä (sessio 11):** jousi oikeassa kädessä, vasen käsi jännittää. Nuolissa punavalkoiset sulat ja ammuttaessa 3,2 m:n vaalea lentojälki, joka häviää 0,9 s:ssa.
- **Purjekangas (sessio 11):** 8 kaistaa ja ohuet saumat, vastavalossa 45 % auringosta kuultaa läpi.
- **Riimukivet (sessio 9):** 38 suomenkielistä tekstiä (`src/game/lore.js`) ovat **Clauden luonnoksia**: abstrakteja lauseita savipeikoista, joista, tähdistä, raunioista, kylistä, meren takaa tulleista laivoista ja saaren salaisuuksista. Käyttäjä voi kirjoittaa tilalle omat tekstinsä tai tarinansa.
- **Veneet (sessio 9):**
  - *Soutuvene:* 3,8 m, kestävyys 60, soutu 2,0 m/s ([Shift] 2,9 m/s; ennen 2,4 / 3,4), soutu kuluttaa kestävyyttä 1,6 / s ([Shift] 6 / s), kääntyy paikallaan. Syväys 0,3 m.
  - *Purjevene:* 6,6 m, latinalaispurje, kestävyys 180, enintään 5,6 m/s × tuuli (sessio 12d; ennen 8,5), vastatuuli alle 43°, "hiljaa" 1,0 m/s. Syväys 0,55 m.
  - *Purjelaiva:* 24 m karakki (keulamasto ja isomasto raakapurjein, peräsmastossa latinalaispurje, keulapuun alla räikkäpurje, punaiset ristit), kestävyys 1 200, enintään 8,4 m/s × tuuli (sessio 12d; ennen 13), vastatuuli alle 60°, "hiljaa" 0,9 m/s. Syväys 1,25 m; rakentamiseen riittää 0,7 m.
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
- Tarkoittiko "mesabiomi" punaista laterittitasankoa (nyt tumbleweedit ovat aavikolla, dyyneillä, laterittitasangolla ja pöytävuorilla, ja sessiosta 11 lähtien laterittitasangolla ei sada)?
- Saako pakeneva Haamu pudottaa jotain, vai onko saalis vain kaatamalla (nyt vain kaatamalla)?
- Ovatko rakennelmat ja hylyt nyt sopivan yleisiä (n. 3 700 rakennelmaa ja n. 120 hylkyä maailmassa)?
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
