# Sahel – Godot-siirtokoe

Sahel-pelin siirto selaimen three.js:stä **Godot 4.7** -pelimoottoriin, pienin askelin.
Alkuperäinen JS-peli (repon juuri, `src/`) on siirron "speksi": Godot-versio
tehdään toimimaan **täsmälleen samoin**, ja se tarkistetaan testeillä, jotka
vertaavat Godotin tuloksia alkuperäisen JS-koodin tuloksiin.

## Vaihe 1 (tämä): kohina ja pelaajan liikkuminen

- `scripts/noise.gd` – siemennetty satunnaisuus ja simplex-kohina (`src/noise.js`), bitilleen sama.
- `scripts/player.gd` – kävely, juoksu, hyppy, kyykky, jyrkät seinät, kestävyys, terveys ja pään heilunta (`src/player/player.js`).
- `scripts/config.gd` – perusarvot (`src/config.js`).
- `scripts/test_terrain.gd` – **väliaikainen** koemaasto: kumpuja ja yksi jyrkkä tasanne. Oikea maasto (`src/world/terrain.js`) siirretään seuraavaksi.
- `scenes/main.tscn` + `scripts/main.gd` – maasto chunkeista (64 m), aurinko, taivas, sumu ja tietoruutu.

Ei vielä mukana: oikea maasto, vesi ja uinti, puut, kivet ja törmäykset, kädet ja työkalut, reppu, äänet, valikot.

## Kokeile omalla koneella

1. Lataa Godot 4.7 (tavallinen, ei .NET): https://godotengine.org/download (ei asennusta, pura ja käynnistä).
2. Hae tämä haara koneellesi (GitHub Desktop tai `git clone` + `git checkout <haara>`).
3. Godotissa: **Import** → valitse `godot/project.godot` → **Import & Edit**.
4. Paina **F5** (tai ▶ oikeassa yläkulmassa).

Ohjaus: klikkaa ruutua (hiiri lukitaan), **WASD** / nuolet, **Shift** juoksu,
**Välilyönti** hyppy, **Ctrl** tai **C** kyykky, **Esc** vapauttaa hiiren.
Vasemmassa yläkulmassa: FPS, paikka, nopeus, kestävyys, terveys ja askeleet.

Kokeile: kävele kohti pohjoisen tasannetta (suoraan edessä), juokse sen seinää
päin (ei pitäisi päästä ylös), hyppää ja kyykisty.

## Testit

Vertailuarvot alkuperäisestä JS-pelistä (repon juuresta, Node 18+):

```bash
node godot/tests/make_golden.mjs
```

Godot-testit (kansiosta `godot/`; ensimmäisellä kerralla `--import`):

```bash
godot --headless --import
godot --headless -s res://tests/run_tests.gd
```

Testit:
- **kohina:** mulberry32, hashSeed, simplex ja fBm samat kuin JS:ssä (bitilleen tai < 1e-12);
- **koemaasto:** sama korkeus kuin JS-kaksosella (`tests/js/test_terrain.mjs`);
- **pelaaja:** sama 780 ruudun näppäinsarja (kävely, juoksu, hyppy, käännös, kyykky, seinä) ajetaan alkuperäisellä `player.js`:llä (Node) ja Godot-versiolla; paikka, katse, kestävyys, kyykky, kamera ja askeleet verrataan joka ruudulla;
- **näppäimet:** syötetoiminnot ovat olemassa oikeilla näppäimillä;
- **nopeus:** kohinan hinta GDScriptillä (tieto).

Kuvakaappaukset ilman ihmistä (autopilotti kävelee, juoksee, hyppää ja kääntyy):

```bash
godot --path . -- --shots=/polku/kansioon
```

## Siirron periaatteet

- JS-peli on speksi. Käytöstä ei muuteta siirron yhteydessä, vaikka se näyttäisi oudolta; havainnot kirjataan (`docs/TODO.md`) ja korjataan erikseen.
- Jokainen vaihe on oma PR ja pelattavissa.
- Simulaatio lasketaan 64-bittisillä luvuilla kuten JS:ssä (Godotin `Vector3` on 32-bittinen).
- three.js ja Godot käyttävät samaa koordinaatistoa (Y ylös, eteen −Z, kierrot YXZ), joten paikat ja kulmat siirtyvät sellaisinaan.
