# Sahel

> Pelin työnimi. Nimi ei ole vielä lopullinen ja voi muuttua.

Valheim- ja Minecraft-tyyppinen selviytymispeli, joka sijoittuu Burkina Fason Sahel-alueelle. 3D avoin maailma (20 km, generoidaan joka kerta omalla siemenellä), ensimmäisen persoonan kuvakulma, reppu ja valmistus, vuorokausisykli ja sää (selkeä, pilvinen, hiekkausva, hiekkamyrsky). Puut kaatuvat ja kivet murskautuvat, ja saaliit putoavat maahan. Kartta piirtyy sitä mukaa kuin maailmaa tutkii, ja maailmasta löytyy kivikehiä, hylättyjä leirejä ja raunioita arkkuineen. Sademetsän takana on meri, ja maailmassa on jokia, puroja ja järviä, joissa vesi aaltoilee ja roiskuu. Taistelussa on iskusarjat, torjunta ja parry; savanneilla elää pahkasikoja, ja öisin maasta nousee savipeikkoja.

## Pelaa

Peli toimii selaimessa ilman asennusta (tietokone, hiiri + näppäimistö). Avaa `index.html` minkä tahansa staattisen palvelimen kautta, esim.

```
npx http-server -c-1 .
```

ja mene osoitteeseen `http://localhost:8080/`. (Suoraan tiedostona `file://` avaaminen ei toimi, koska selain estää ES-moduulit.)

Haarojen testauslinkit: `https://raw.githack.com/KSPKtech/sahel/<haara>/index.html`

### Ohjaimet

| Näppäin | Toiminto |
|---|---|
| W A S D | liiku |
| Shift | juokse |
| Välilyönti | hyppää (kuolleena: herää henkiin) |
| Ctrl tai C | kyykky päälle/pois |
| Hiiri 1 | lyö / hakkaa (klikkaa tahdissa tai pidä pohjassa: iskusarjat nuijalla, viidakkoveitsellä ja nyrkeillä) |
| Hiiri 2 | torju (heti iskun alla: parry); asetettava esine kädessä: aseta (esim. nuotio) |
| E | poimi |
| Q | heitä valittu esine |
| 1–8 / rulla | valitse esine |
| Tab tai I | reppu ja valmistus |
| M | iso kartta (klikkaa: merkki ja nimi, klikkaa merkkiä: nimeä / poista, vedä: liikuta, rulla: zoomaa) |
| Esc | tauko (asetukset, päävalikko, testaustyökalut: sää, aika, siirry biomiin, kutsu olento, aseet) |
| O / L | testaus: seuraava sää / +1 tunti |

## Rakenne

| Polku | Sisältö |
|---|---|
| `index.html`, `styles.css`, `menu.css` | Sivu, HUD:n ja valikoiden tyylit |
| `src/main.js` | Käynnistys, tilat (valikko/lataus/peli/tauko/reppu/kartta), pääsilmukka |
| `src/config.js` | Säädettävät arvot (näkyvyys, vuorokauden pituus, nopeudet…) |
| `src/world/` | Maailman generointi (vyöhykkeet, biomit, meri, joet ja järvet, siemen, rakennelmien paikat), chunkit ja LOD, generointisäikeet (`genWorker.js`), aaltojen kaavat (`waves.js`), esinetyypit, tumbleweedit |
| `src/render/` | Taivas, vuorokausi ja sää, materiaalit, vesi (`water.js`), väreily (`ripples.js`), roiskeet (`splash.js`), jälkikäsittely (`post.js`: valonsäteet, DOF, liike-epäterävyys), hiukkaset, sirpaleet, tekstuurit |
| `src/models/` | Proseduraaliset 3D-mallit: puut, kasvit (`flora.js`), kivet, esineet ja aseet, rakennelmat ja arkku, olennot (`creatures.js`) (korvattavissa glTF-malleilla) |
| `src/player/` | Ohjaus, liikkuminen, uinti, terveys, kyykky, käsi ja esine kädessä (iskuanimaatiot, torjunta, kilpi) |
| `src/game/` | Esineet, reppu, valmistus, opas, hakkaaminen, kaatuminen, saaliit, nuotio, rauniot ja arkut (`ruins.js`), taistelu (`combat.js`), eläimet ja viholliset (`mobs.js`), tallennus |
| `src/ui/` | Valikot, HUD, tutkittu kartta (`explored.js`), minikartta, iso kartta (`bigMap.js`), opas, reppuikkuna, kuvakkeet |
| `assets/fonts/` | Valikon fontit (OFL/Apache) |
| `vendor/three/` | three.js r186 (MIT), mukana BufferGeometryUtils ja SunLight (varjokaskadit) |

## Dokumentaatio

| Tiedosto | Sisältö |
|---|---|
| [docs/DESIGN.md](docs/DESIGN.md) | Pelin konsepti ja suunnitteluideat |
| [docs/DECISIONS.md](docs/DECISIONS.md) | Tehdyt päätökset perusteluineen |
| [docs/CHANGELOG.md](docs/CHANGELOG.md) | Mitä peliin on lisätty / muutettu |
| [docs/SESSION_LOG.md](docs/SESSION_LOG.md) | Työsessioiden loki (mitä tehtiin, mitä jäi kesken) |
| [docs/TODO.md](docs/TODO.md) | Tehtävälista ja avoimet kysymykset |

## Tila

Pelattava prototyyppi: päävalikko, maailmojen luonti siemenellä, vyöhykkeellinen maailma merineen ja vesistöineen, veden fysiikka, tutkittava kartta, rakennelmat ja arkut, keräys, hakkaaminen ja valmistus, taistelu, pahkasiat ja savipeikot. Grafiikka on vielä yksinkertaista low-poly-paikkamerkkiä, ja sitä on tarkoitus jalostaa myöhemmin.
