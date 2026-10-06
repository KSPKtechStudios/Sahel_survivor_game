# Changelog

Mitä peliin on lisätty tai muutettu. Uusin ylimpänä.

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
