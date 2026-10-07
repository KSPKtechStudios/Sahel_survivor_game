# Sahel

> Pelin työnimi. Nimi ei ole vielä lopullinen ja voi muuttua.

Valheim- ja Minecraft-tyyppinen selviytymispeli, joka sijoittuu Burkina Fason Sahel-alueelle. 3D avoin saarimaailma (20 km, generoidaan joka kerta omalla siemenellä), ensimmäisen persoonan kuvakulma, reppu ja valmistus, ravinto ja myrkytys, vuorokausisykli (10 min päivä + 10 min yö, selkeinä öinä linnunrata) ja biomikohtaiset säät (hiekkamyrskyt, sade, ukkonen, sumu). Peli alkaa keräämällä risuja ja kiviä; vasaralla rakennetaan työstöpenkki, nuotio ja talot, ja jousella metsästetään arkoja eläimiä (gasellit, helmikanat, apinat, aavikkoketut, linnut). Puut kaatuvat ja kivet murskautuvat, ja saaliit putoavat maahan. Kartta piirtyy sitä mukaa kuin maailmaa tutkii, ja maailmasta löytyy kivikehiä, hylättyjä leirejä, raunioita ja laivanhylkyjä arkkuineen sekä riimukiviä, joiden tekstit voi kääntää. Joet, purot, järvet ja meri aaltoilevat ja roiskuvat, ja vesillä liikutaan soutuveneellä, purjeveneellä tai valtavalla purjelaivalla tuulen mukaan. Taistelussa on torjunta ja parry; savanneilla elää pahkasikoja, ja öisin maasta nousee savipeikkoja. Musiikki vaihtuu biomin mukaan.

**Versio:** Alpha v0.1 (ensimmäinen julkinen alfaversio).

**Pelaa selaimessa:** https://kspktech.github.io/sahel/ (GitHub Pages) tai https://raw.githack.com/KSPKtech/sahel/main/index.html

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
| Ctrl tai C | kyykky päälle/pois (hiivi eläinten luo) |
| Hiiri 1 | lyö / hakkaa (iskun jälkeen jäähdytys; viidakkoveitsellä iskusarja); jousi: pidä pohjassa ja päästä; vasara: rakenna / korjaa vene |
| Hiiri 2 | torju (heti iskun alla: parry); ruoka kädessä: syö; vasara: rakennusvalikko; kilpi kädessä: varusta |
| R / X | vasara: käännä rakennelmaa / pura (materiaalit palautuvat) |
| E | poimi, avaa arkku, käännä riimukivi, nouse veneeseen / maihin, nuku makuualustalla (yöllä) |
| Veneessä | soutuvene: W/S soutu, A/D käänny, Shift nopeammin; purjeveneet: W/S purjeet (taakse, seis, hiljaa, puolet, täydet), A/D peräsin |
| Q | heitä valittu esine |
| 1–8 / rulla | valitse esine |
| Tab tai I | reppu ja valmistus |
| M | iso kartta (klikkaa: merkki ja nimi, klikkaa merkkiä: nimeä / poista, vedä: liikuta, rulla: zoomaa) |
| F3 | kehittäjätyökalut (siirtyminen, olennot, esineet, lentäminen, nopeus, kuolemattomuus, sää, aika, koko kartta) |
| Esc | tauko (asetukset ja ääniasetukset, päävalikko) |
| O / L | testaus: seuraava sää / +1 tunti |

## Rakenne

| Polku | Sisältö |
|---|---|
| `index.html`, `styles.css`, `menu.css` | Sivu, HUD:n ja valikoiden tyylit |
| `src/main.js` | Käynnistys, tilat (valikko/lataus/peli/tauko/reppu/kartta), pääsilmukka |
| `src/config.js` | Säädettävät arvot (näkyvyys, vuorokauden pituus, nopeudet…) |
| `src/world/` | Maailman generointi (vyöhykkeet, biomit, meri, joet ja järvet, siemen, rakennelmien paikat), chunkit ja LOD, generointisäikeet (`genWorker.js`), aaltojen kaavat (`waves.js`), esinetyypit, tumbleweedit |
| `src/render/` | Taivas ja linnunrata (`sky.js`), vuorokausi, säät ja tuuli (`environment.js`), sade ja salamat (`rain.js`), materiaalit, vesi (`water.js`), väreily (`ripples.js`), roiskeet (`splash.js`), tuli ja savu (`fire.js`), veri (`blood.js`), jälkikäsittely (`post.js`: valonsäteet, DOF, liike-epäterävyys), hiukkaset, sirpaleet, tekstuurit |
| `src/models/` | Proseduraaliset 3D-mallit: puut, kasvit (`flora.js`), poimittavat (`pickups.js`), kivet, esineet ja aseet (`items.js`, `items2.js`), rakennelmat, arkku, laivanhylky ja riimukivet (`structures.js`), rakennusosat (`building.js`), veneet ja purjeet (`boats.js`), olennot (`creatures.js`) (korvattavissa glTF-malleilla) |
| `src/player/` | Ohjaus, liikkuminen, uinti, veneessä istuminen, terveys, kyykky, käsi ja esine kädessä (iskuanimaatiot, torjunta, kilpi, jousi, soihtu) |
| `src/game/` | Esineet ja reseptit (`items.js`), reppu, valmistus, ravinto ja tilavaikutukset (`survival.js`), opas, hakkaaminen, kaatuminen, saaliit, rauniot, arkut ja riimukivet (`ruins.js`, `lore.js`), taistelu (`combat.js`), jousi (`archery.js`), rakentaminen (`building.js`, `pieces.js`, `structures.js`), veneet (`boats.js`), eläimet ja viholliset (`mobs.js`), tallennus |
| `src/ui/` | Valikot, HUD, tutkittu kartta (`explored.js`), minikartta, iso kartta (`bigMap.js`), opas, reppuikkuna, rakennusvalikko (`buildMenu.js`), riimujen käännös (`runePanel.js`), veneen tiedot (`boatHud.js`), kuvakkeet, kehittäjätyökalut (`devtools.js`) |
| `src/audio/` | Musiikki (`music.js`): kappaleet biomeittain, viiveet ja häivytykset |
| `assets/music/` | Musiikkikappaleet (käyttäjän toimittamat) |
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

Pelattava prototyyppi: päävalikko, maailmojen luonti siemenellä, saarimaailma biomeineen, vesistöineen ja merineen, veden fysiikka, tutkittava kartta, rakennelmat, arkut ja riimukivet, keräys, ruoka ja myrkytys, hakkaaminen ja valmistus, rakentaminen vasaralla, taistelu ja jousi, arat eläimet, pahkasiat ja savipeikot, veneet ja purjehdus. Grafiikka on vielä yksinkertaista low-poly-paikkamerkkiä, ja sitä on tarkoitus jalostaa myöhemmin.
