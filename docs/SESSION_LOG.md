# Sessioloki

Uusin merkintä ylimpänä.

## 2026-10-06 (sessio 2)
**Tehtiin**
- Käyttäjä kertoi konseptin: Valheim/Minecraft-tyyppinen selviytymispeli Burkina Fason Sahelissa, 3D avoin maailma, ensimmäinen persoona, näkyvä käsi, vuorokausi, neljä säätä, opas oikealla alhaalla, minikartta biomin nimellä oikealla ylhäällä. Musiikki/äänet tulevat myöhemmin. Kirjattu `DESIGN.md`:hen.
- Tehtiin ensimmäinen pelattava prototyyppi selaimeen (three.js, ei käännösvaihetta). Sisältö ks. `CHANGELOG.md`.
- Testattiin headless-Chromiumilla: kuvakaappaukset kaikista säistä, vuorokaudenajoista ja biomeista; toiminnallinen testi (poiminta, hakkuu, valmistus, kaato, louhinta, nuotion asettaminen, tallennus). Ei konsolivirheitä.
- Optimoitiin kolmiomäärä ~1,2 M → ~650 k / ruutu.
- Repo on nyt julkinen, joten raw.githack-linkki toimii.

**Huomiot**
- Headless-testissä (SwiftShader) näkyy vasemmassa alakulmassa suorakulmainen tekstuuriartefakti; se johtuu ohjelmistorenderöijästä, ei pelistä (katoaa kun maastotekstuuri poistetaan).
- CC0-tekstuuri-/mallipalvelut (Poly Haven, ambientCG) ovat estettyjä Clauden ympäristöstä, joten tekstuurit ja mallit ovat proseduraalisia.
- Todellista ruudunpäivitystä ei voitu mitata (ei GPU:ta); käyttäjän kannattaa kertoa, pyöriikö peli sujuvasti.

**Kesken / seuraavaksi**
- Käyttäjän palaute prototyypistä.
- Avoimet kysymykset `DESIGN.md`:ssä (selviytymismittarit, eläimet, rakentaminen, hahmo).
- Oppaan jatkovaiheet, kun pelin suunta tarkentuu.

## 2026-10-06 (sessio 1)
**Tehtiin**
- GitHub-repon luonti `gh`:lla epäonnistui (403, istunto sidottu valmiiksi määritettyihin repoihin). Käyttäjä pyysi tekemään sen hänen puolestaan, joten repo `KSPKtech/sahel` luotiin selaimella käyttäjän omalla GitHub-kirjautumisella. Näkyvyys: yksityinen.
- Repo liitettiin istuntoon ja ensimmäinen commit pushattiin `main`-haaraan.
- Pystytettiin paikallinen projektin runko ja muistiinpanot (`README.md`, `CLAUDE.md`, `docs/`).
- Tehtiin ensimmäinen paikallinen commit.
- Kirjoitettiin `CLAUDE.md` uusiksi Claude Codea varten: muistiinpanojen luku/kirjoitus, haara + PR, raw.githack-linkki joka työn lopuksi.

**Kesken / seuraavaksi**
- Päätettävä repon näkyvyys: raw.githack toimii vain julkisille repoille.
- Selvitettävä pelin konsepti, genre, moottori ja alusta (ks. `DESIGN.md`).
