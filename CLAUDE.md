# Ohjeet Claudelle (Sahel-peli)

Tämä tiedosto on pysyvä työohjeeni tälle projektille. Pelin nimi "Sahel" on työnimi ja voi muuttua. Käyttäjä puhuu suomea; dokumentaatio ja vastaukset ovat suomeksi, ellei toisin sovita.

## 1. Session alussa: lue muistiinpanot

Muistiinpanot ovat kansiossa `docs/`. Lue ne ennen kuin teet mitään:

1. `docs/SESSION_LOG.md` (uusin merkintä ylimpänä): mitä viimeksi tehtiin ja mikä jäi kesken
2. `docs/TODO.md`: tehtävälista
3. `docs/DECISIONS.md`: tehdyt päätökset, joita ei kyseenalaisteta ilman syytä
4. `docs/DESIGN.md`: pelin konsepti, jos työ koskee sisältöä tai mekaniikkoja

Kerro käyttäjälle yhdellä lauseella, mistä jatketaan.

## 2. Työn aikana: kirjoita muistiinpanoja itsellesi

Kirjoita muistiinpanot samalla kun työskentelet, älä vasta lopuksi.

- Jokaisesta merkittävästä muutoksesta rivi `docs/CHANGELOG.md`:hen (uusin ylimpänä).
- Jokaisesta valinnasta ja sen syystä rivi `docs/DECISIONS.md`:hen.
- `docs/TODO.md` pidetään ajan tasalla: valmiit merkitään, uudet lisätään.
- Pelin sisältö ja mekaniikat kirjataan `docs/DESIGN.md`:hen vain siltä osin kuin käyttäjä on ne sanonut. Älä keksi sisältöä käyttäjän puolesta; merkitse avoimet asiat kysymyksiksi.

## 3. Session lopuksi

1. Lisää `docs/SESSION_LOG.md`:n alkuun merkintä: päivä, mitä tehtiin, mitä jäi kesken, seuraava askel.
2. Commitoi muistiinpanot samaan PR:ään koodin kanssa.
3. Anna käyttäjälle testauslinkki (ks. alla). Tämä tehdään **joka kerta**, kun jotain on muuttunut.

## 4. Git ja PR

- Älä työskentele suoraan `main`-haarassa pelimuutoksissa. Tee jokaiselle työlle oma haara (esim. `feat/...`, `fix/...`), pushaa se ja avaa PR `main`-haaraan (`gh pr create`).
- Pidä PR:t pieninä ja yhden asian kokoisina.
- PR:n kuvaukseen: mitä muuttui, miten sitä testataan ja testauslinkki.

## 5. Testauslinkki (raw.githack)

Lopuksi annetaan aina linkki, jolla käyttäjä voi kokeilla pelin PR:n haarassa ilman asennusta. Muoto:

```
https://raw.githack.com/KSPKtech/sahel/<haaran-nimi>/<polku-peli-tiedostoon>.html
```

Esimerkki: `https://raw.githack.com/KSPKtech/sahel/feat/liikkuminen/index.html`

Säännöt:
- Käytä haaran nimeä sellaisenaan (kauttaviivat sallittuja). Linkin pitää osoittaa pelin aloitustiedostoon (esim. `index.html`), ei hakemistoon.
- Tarkista ennen linkin antamista, että haara on pushattu ja tiedosto löytyy sieltä (`git ls-remote origin <haara>`).
- Anna myös PR:n linkki. Kerro linkin vieressä yhdellä rivillä, mitä siinä kannattaa testata.
- Selain voi välimuistittaa vanhaa versiota muutaman minuutin. Jos tarvitaan täsmälleen tietty versio, anna lisäksi kiinteä linkki muodossa `https://rawcdn.githack.com/KSPKtech/sahel/<commit-sha>/<tiedosto>.html`.
- **Rajoite:** raw.githack toimii vain julkisille repoille. Jos linkki ei aukea (404), tarkista ensin onko repo yksityinen, ja kerro asiasta käyttäjälle sen sijaan että kokeilet kiertoteitä.
- Jos peli ei (vielä) ole selaimessa pelattava (ei HTML-tiedostoa), sano se suoraan ja kerro miten testataan; älä keksi linkkiä.
