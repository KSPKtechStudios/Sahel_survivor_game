# Sahel

> Pelin työnimi. Nimi ei ole vielä lopullinen ja voi muuttua.

Valheim- ja Minecraft-tyyppinen selviytymispeli, joka sijoittuu Burkina Fason Sahel-alueelle. 3D avoin maailma (20 km, generoidaan joka kerta omalla siemenellä), ensimmäisen persoonan kuvakulma, reppu ja valmistus, vuorokausisykli ja sää (selkeä, pilvinen, hiekkausva, hiekkamyrsky). Puut kaatuvat ja kivet murskautuvat, ja saaliit putoavat maahan.

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
| Välilyönti | hyppää |
| Hiiri 1 | lyö / hakkaa (pidä pohjassa) |
| E | poimi |
| Hiiri 2 | aseta (esim. nuotio) |
| 1–8 / rulla | valitse esine |
| Tab tai I | reppu ja valmistus |
| Esc | tauko (asetukset, päävalikko, testaustyökalut: sää, aika, siirry biomiin) |
| O / L | testaus: seuraava sää / +1 tunti |

## Rakenne

| Polku | Sisältö |
|---|---|
| `index.html`, `styles.css`, `menu.css` | Sivu, HUD:n ja valikoiden tyylit |
| `src/main.js` | Käynnistys, tilat (valikko/lataus/peli/tauko), pääsilmukka |
| `src/config.js` | Säädettävät arvot (näkyvyys, vuorokauden pituus, nopeudet…) |
| `src/world/` | Maailman generointi (vyöhykkeet, biomit, siemen), chunkit ja LOD, esinetyypit, tumbleweedit |
| `src/render/` | Taivas, vuorokausi ja sää, materiaalit, hiukkaset, sirpaleet, tekstuurit |
| `src/models/` | Proseduraaliset 3D-mallit: puut, kasvit, kivet, esineet (korvattavissa glTF-malleilla) |
| `src/player/` | Ohjaus, liikkuminen, käsi ja esine kädessä |
| `src/game/` | Esineet, reppu, valmistus, opas, hakkaaminen, kaatuminen, saaliit, rakennelmat, tallennus |
| `src/ui/` | Valikot, HUD, minikartta, opas, reppuikkuna, kuvakkeet |
| `assets/fonts/` | Valikon fontit (OFL/Apache) |
| `vendor/three/` | three.js r186 (MIT) |

## Dokumentaatio

| Tiedosto | Sisältö |
|---|---|
| [docs/DESIGN.md](docs/DESIGN.md) | Pelin konsepti ja suunnitteluideat |
| [docs/DECISIONS.md](docs/DECISIONS.md) | Tehdyt päätökset perusteluineen |
| [docs/CHANGELOG.md](docs/CHANGELOG.md) | Mitä peliin on lisätty / muutettu |
| [docs/SESSION_LOG.md](docs/SESSION_LOG.md) | Työsessioiden loki (mitä tehtiin, mitä jäi kesken) |
| [docs/TODO.md](docs/TODO.md) | Tehtävälista ja avoimet kysymykset |

## Tila

Pelattava prototyyppi: päävalikko, maailmojen luonti siemenellä, vyöhykkeellinen maailma, keräys, hakkaaminen ja valmistus. Grafiikka on vielä yksinkertaista low-poly-paikkamerkkiä, ja sitä on tarkoitus jalostaa myöhemmin.
