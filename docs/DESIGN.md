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

## Teknologia
- Selaimessa toimiva peli: three.js (WebGL), ei käännösvaihetta. Ks. `DECISIONS.md`.
- Kohdealusta toistaiseksi tietokoneen selain (hiiri + näppäimistö).

## Toteutettu
- Päävalikko (pergamenttikäärö, puunapit, pehmeät siirtymät ja hiekkapöllähdys), taustalla elävä pelimaailma auringonlaskussa.
- Maailmojen valinta: useita tallennettuja maailmoja, uuden maailman luonti nimellä ja siemenellä, koko maailman karttaesikatselu.
- Asetukset: hiiren herkkyys, pystyakselin kääntö, näkökenttä, näköetäisyys, varjot, renderöintitarkkuus, FPS-näyttö.
- Vyöhykkeellinen maailma (säde 10 km), 8 biomia, epäsäännölliset rajat, maailman reuna vuoristona.
- Ensimmäisen persoonan liikkuminen, näkyvä käsi ja esine kädessä animaatioineen.
- Vuorokausi (20 min) ja neljä säätä; sademetsässä hiekkailmiöt muuttuvat sumuksi.
- Hakkaaminen: lovet puissa, puu kaatuu ja pomppaa maahan, kaatunut runko pilkotaan; kiviin säröjä ja ne murskautuvat; pensaat rytisevät ja hajoavat. Palat lentävät fysiikalla.
- Saaliit putoavat maahan, [E] tai automaattinen poiminta.
- Reppu (8 + 24 paikkaa), valmistus, nuotio, opas, minikartta, tallennus maailmakohtaisesti.

## Paikkamerkit (Clauden valitsemia, voi muuttaa vapaasti)
- **Maailman koko:** säde 10 km. Spawn-alue n. 2,4 km, tier 1 n. 6 km asti, tier 2 n. 9,3 km asti, sen jälkeen vuoristoreuna. Reunan takana on läpäisemätön vuoriseinämä.
- **Tier 1 -biomit:** Sahelin savanni, Hiekkadyynit, Laterittitasanko (punainen), Kausilampi (vesi), Akasiametsikkö. Spawn-alueella ei ole dyynejä.
- **Tier 2:** Aavikko (valtavat dyynit) ja Sademetsä (kapokkipuut, palmut, saniaiset). Aavikko painottuu toiselle puolelle maailmaa ja sademetsä vastakkaiselle (suunta vaihtelee siemenen mukaan).
- **Ulkoreuna:** Vuoristo (punertavaa kalliota, lohkareita).
- **Maailman esineet:** akasia, kapokkipuu, palmu, baobab (ei kaadettava), kuivunut pensas, saniainen, tumbleweed, risu, kivi, lohkare, termiittikeko, ruoho.
- **Hakkaaminen:** akasia 5 iskua + runko 4, kapokkipuu 8 + 6, palmu 4 + 3, lohkare 4 (hakku), pensas 3 (kirves 2x). Lovi tulee aina samaan kaatokohtaan sille puolelle, josta lyödään.
- **Kaatumissuunta:** satunnainen, mutta jos se osoittaisi suoraan pelaajaa kohti, suunta käännetään (ettei puu kaadu päälle).
- **Esineet:** risu, kivi, kuitu, puu, kivikirves, kivihakku, nuotio.
- **Reseptit:** kivikirves (3 risua, 2 kiveä, 2 kuitua), kivihakku (3 risua, 3 kiveä, 2 kuitua), nuotio (3 puuta, 5 kiveä, 3 risua).
- **Oppaan vaiheet 2–5:** kivikirves → kaada akasia ja pilko runko → kivihakku + louhi lohkare → nuotio.
- **Kestävyys (stamina):** kuluu juostessa, hypätessä ja lyödessä.
- **Hahmo:** tummaihoinen käsi ja indigonsininen hiha (koska peli sijoittuu Burkina Fasoon).
- **Valikon fontit:** Eagle Lake (otsikko), Permanent Marker (napit), Alegreya (teksti).
- **Ohjaimet:** WASD, Shift, välilyönti, hiiri 1/2, E, 1–8, Tab/I, Esc.

## Avoimet kysymykset
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
