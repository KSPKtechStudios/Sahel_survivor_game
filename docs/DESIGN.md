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

## Teknologia
- Selaimessa toimiva peli: three.js (WebGL), ei käännösvaihetta. Ks. `DECISIONS.md`.
- Kohdealusta toistaiseksi tietokoneen selain (hiiri + näppäimistö).

## Toteutettu prototyypissä
- Proseduraalinen, rajaton avoin maailma chunkeina (64 m), 5 biomia.
- Ensimmäisen persoonan liikkuminen: kävely, juoksu, hyppy, uinti/kahlaus, törmäykset puihin ja kiviin.
- Näkyvä käsi + kädessä oleva esine, heilahdus-, lyönti-, poiminta- ja vaihtoanimaatiot.
- Vuorokausi (20 min), aurinko, kuu, tähdet, auringonnousu ja -lasku.
- Neljä säätä pehmeillä siirtymillä; tuuli liikuttaa ruohoa, puita, pölyä ja tumbleweedejä.
- Reppu (8 pikapaikkaa + 24 reppupaikkaa) ja valmistus.
- Opas oikeassa alakulmassa, minikartta + biomin nimi oikeassa yläkulmassa.
- Nuotio, jonka voi asettaa maahan (valaisee yön).
- Tallennus selaimeen (localStorage).

## Paikkamerkit (Clauden valitsemia, voi muuttaa vapaasti)
- **Biomit:** Sahelin savanni, Hiekkadyynit (pohjoisessa), Laterittitasanko (punainen), Kausilampi (vesi), Akasiametsikkö.
- **Maailman esineet:** akasia, baobab, kuivunut pensas, tumbleweed, risu, kivi, lohkare, termiittikeko, ruoho.
- **Esineet:** risu, kivi, kuitu, puu, kivikirves, kivihakku, nuotio.
- **Reseptit:** kivikirves (3 risua, 2 kiveä, 2 kuitua), kivihakku (3 risua, 3 kiveä, 2 kuitua), nuotio (3 puuta, 5 kiveä, 3 risua).
- **Oppaan vaiheet 2–5:** kivikirves → kaada akasia → kivihakku + louhi lohkare → nuotio.
- **Kestävyys (stamina):** kuluu juostessa, hypätessä ja lyödessä.
- **Hahmo:** tummaihoinen käsi ja indigonsininen hiha (koska peli sijoittuu Burkina Fasoon).
- **Ohjaimet:** WASD, Shift, välilyönti, hiiri 1/2, E, 1–8, Tab/I, Esc.

## Avoimet kysymykset
- Selviytymismittarit: terveys, nälkä, jano, kuumuus? Mistä ruoka ja vesi?
- Eläimet ja viholliset (esim. Sahelin eläimistö)?
- Rakentaminen: Valheimin tapainen vapaa rakentaminen vai jotain muuta?
- Kuka pelaajahahmo on, ja onko pelissä tarinaa?
- Uusiutuvatko resurssit (risut, kivet, puut)?
- Työkalujen kuluminen?
- Rajaton proseduraalinen maailma vai kiinteä, käsin suunniteltu kartta?
- Moninpeli?
- Vuorokauden pituus (nyt 20 min)?
- Lopullinen julkaisualusta (selain, Steam/työpöytä)?
- Pelin kieli (nyt suomi)?
- Mistä nimi "Sahel" tulee ja mihin suuntaan se voisi muuttua?
