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

## Paikkamerkit (Clauden valitsemia, voi muuttaa vapaasti)
- **Maailman koko:** säde 10 km. Spawn-alue n. 2,4 km, tier 1 n. 6 km asti, tier 2 n. 9,3 km asti, sen jälkeen vuoristoreuna. Vuorten takana on läpäisemätön vuoriseinämä, meren puolella virta vie takaisin. Rannikko alkaa n. 8,85 km päästä keskeltä.
- **Tier 1 -biomit:** Sahelin savanni, Hiekkadyynit, Laterittitasanko (punainen), Kausilampi (vesi), Akasiametsikkö. Spawn-alueella ei ole dyynejä.
- **Tier 2:** Aavikko (valtavat dyynit, keitaat) ja Sademetsä (tiheä: sademetsäpuut, kapokkipuut, tiheiköt, bambu, saniaiset). Aavikko painottuu toiselle puolelle maailmaa ja sademetsä vastakkaiselle (suunta vaihtelee siemenen mukaan).
- **Ulkoreuna:** Vuoristo aavikon puolella (punertavaa kalliota, lohkareita, vuoristojärviä ja puroja), meri ja hiekkarannat sademetsän puolella.
- **Maailman esineet:** akasia, kapokkipuu, sademetsäpuu, palmu, baobab (ei kaadettava), kuollut puu, kuivunut pensas, tiheikkö, bambu, saniainen, kandelaaberipuu, tumbleweed, risu, kivi, lohkare, kalliomuodostelma, kalliotorni, termiittikeko, ruoho, aluskasvillisuus, ruoko.
- **Hakkaaminen:** akasia 5 iskua + runko 4, kapokkipuu 8 + 6, sademetsäpuu 6 + 4, palmu 4 + 3, kuollut puu 3 (kirves), lohkare 4 (hakku), pensas/tiheikkö 3, bambu 4, saniainen 2 (kirves 2x). Lovi tulee aina samaan kaatokohtaan sille puolelle, josta lyödään.
- **Kaatumissuunta:** satunnainen, mutta jos se osoittaisi suoraan pelaajaa kohti, suunta käännetään (ettei puu kaadu päälle).
- **Esineet:** risu, kivi, kuitu, puu, kivikirves, kivihakku, nuotio.
- **Reseptit:** kivikirves (3 risua, 2 kiveä, 2 kuitua), kivihakku (3 risua, 3 kiveä, 2 kuitua), nuotio (3 puuta, 5 kiveä, 3 risua).
- **Oppaan vaiheet 2–5:** kivikirves → kaada akasia ja pilko runko → kivihakku + louhi lohkare → nuotio.
- **Kestävyys (stamina):** kuluu juostessa, hypätessä ja lyödessä.
- **Hahmo:** tummaihoinen käsi ja indigonsininen hiha (koska peli sijoittuu Burkina Fasoon).
- **Valikon fontit:** Eagle Lake (otsikko), Permanent Marker (napit), Alegreya (teksti).
- **Ohjaimet:** WASD, Shift, välilyönti, hiiri 1/2, E, Q (heitä esine), 1–8, Tab/I, M, Esc.
- **Meri:** ulkoreunalla sademetsän puolella (noin 43 % reunasta), rannat hiekkaa, harvoin saaria. Avomeren takana virta vie takaisin ("Virta on liian voimakas"). Aavikon puolella reuna on edelleen vuoria.
- **Joet ja purot:** sademetsässä joet n. 14–20 m ja purot n. 5–7 m leveitä, Sahelissa harvoin 7–9 m jokia (n. 4–7 km koko Sahelin alueella), vuoristossa puroja vain loivissa kohdissa. Joki kapenee ja loppuu kuivaan uomaan.
- **Järvet:** sademetsässä lampia ja järviä (säde 18–130 m), vuoristossa vuoristojärviä (25–80 m). Lumpeita järvillä ja lammilla.
- **Aallot:** meren aaltojen korkeus 0,3 m (selkeä) – n. 1,8 m (hiekkamyrsky). Järvillä pieniä väreitä, joissa virtaus.
- **Kelluvat esineet:** puu, risut, kuitu. Muut uppoavat.
- **Uudet maastonmuodot:** graniittikalliot (Sahel, sademetsä; 10–40 m korkeita, lohkareita ympärillä), pöytävuoret aavikolla (16–46 m), Sahelin loivat kumpareet.
- **Uudet kasvit ja esineet:** karitepuu (Sahel, 6 iskua + runko 4), doumpalmu (kausilammet, keitaat; 5 + 3), kookospalmu (ranta; 4 + 3), lahopuu ja sammaloitunut runko (kirves, puuta), villibanaani (kuitua), aavikkopensas, ajopuu (poimitaan: puuta), korkea heinä, kukat, sienet, lumpeet, merilevä, luut, kivikko.
- **Grafiikka-asetukset:** Valonsäteet (oletus päällä), Liike-epäterävyys Pois/Kevyt/Vahva (oletus pois), Syväterävyys (oletus pois). Varjot: Normaali (170 m) / Tarkka (260 m).
- **Kartta:** paljastuu n. 100 m säteeltä. Merkkisymbolit: raksi, pallukka, talo (käyttäjän esimerkit) sekä lippu ja tähti. Minikartta kääntyy katsesuunnan mukaan, iso kartta on pohjoinen ylöspäin. Kartta on aina käytössä (ei erillistä esinettä).
- **Rakennelmat:** kivikehä (Sahel: savanni, laterittitasanko, akasiametsikkö, dyynit), hylätty leiri (aavikko, dyynit, keidas), talon rauniot ja kylän rauniot (kaikki biomit, harvinaisia). Vuoristossa rauniot ovat kiveä, sademetsässä köynnösten peittämiä. Noin 500 rakennelmaa / maailma.
- **Arkun tavallinen saalis:** 2–3 seuraavista: risuja 3–8, kiviä 2–6, kuitua 2–6, puuta 1–4.
- **Arvoesineet:** kultahippu (1–3), kaurikotilo (3–8), pronssirannerengas (1); arkussa 1–2 näistä. Ei vielä käyttöä.
- **Sademetsän kasvit:** sademetsäpuu (6 iskua + runko 4), kapokkipuu, tiheikkö, bambu (risuja), saniainen, aluskasvillisuus, ruoko. Kulku 30 % hitaampaa.
- **Aavikko:** keitaat (vesi, palmut, ruo'ot), kuolleet puut (kirves, puuta + risuja).
- **Vuoristo:** kalliomuodostelmat, kalliotornit, lohkareet, kandelaaberipuut (euphorbia), kerrostuneet kallion värit.

## Avoimet kysymykset
- Mitä meren takana on (nyt virta vie takaisin)? Pitäisikö merellä voida liikkua veneellä?
- Voiko veden alle sukeltaa? Kuluuko uidessa kestävyyttä tai happea?
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
- Selviytymismittarit: terveys, nälkä, jano, kuumuus? Mistä ruoka ja vesi?
- Eläimet ja viholliset (esim. Sahelin eläimistö)?
- Rakentaminen: Valheimin tapainen vapaa rakentaminen vai jotain muuta?
- Kuka pelaajahahmo on, ja onko pelissä tarinaa?
- Uusiutuvatko resurssit (risut, kivet, puut)?
- Työkalujen kuluminen?
- Moninpeli?
- Vuorokauden pituus (nyt 20 min)?
- Lopullinen julkaisualusta (selain, Steam/työpöytä)?
- Pelin kieli (nyt suomi)?
- Mistä nimi "Sahel" tulee ja mihin suuntaan se voisi muuttua?
