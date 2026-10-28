# Päätökset

Muoto: päivä, päätös, syy.

## 2026-10-28 (sessio 57)
- **Latvusto suljetaan tiheämmillä lehvillä ja isommilla korteilla, ei lisäämällä puita tai kortteja.** Syy: lehtiatlaksen leveälehtiset lehvät peittivät vain noin viidenneksen kortistaan; kortin peitto nousee ilman lisäkolmioita. Puiden tiheyttä sademetsässä ei muutettu.
- **Lähipuiden varjo piirretään kaukomallilla** (`world.js` varjopoolit, kerros 1 näkyy vain auringon varjokameroille). Syy: lähipuut piirrettiin kuvaan ja varjokarttaan tarkkana; varjossa ero ei näy, ja kolmioita säästyy puolet. Kaukomallissa on neljännes korteista 1,95-kertaisina, joten varjon peitto on sama.
- **Kaukomalli:** vain runko ja pääoksat, joka toinen rengas, ei juurilohkoja. Syy: kaukaisia puita on näköetäisyydellä 4 noin 5–7 kertaa enemmän kuin lähellä olevia, joten kaukomallin keveys ratkaisee eniten.
- **Kaatopinnan syykuvio tehdään varjostimessa** (`kitMaterials.js` `endGrain`), ei tekstuurina. Kannen UV kertoo paikan kannen tasossa (100 + säteen yksiköt), väri kertoo puulajin. Syy: ei uusia tekstuureja, ja kuvio sopii kaikkiin rungon kokoihin.
- **Kannen kiertosuunta tarkistetaan kolmio kerrallaan** (`treeCut.js`). Syy: kannen pinta osoitti alaspäin, mikä ei näkynyt vanhoilla kaksipuolisilla materiaaleilla mutta katosi yksipuolisella kaarnalla.
- **Liaanien lehdet ovat puiden lehtiatlaksesta** ja atlaksen solutiedot (`leaf_cells.json`) siirrettiin `assets/models/trees/`-kansioon, josta peli lukee ne. Syy: liaanit näyttävät samalta kuin puiden lehdet, eikä tarvita omaa tekstuuria.
- **Latvusten väliset aukot suljetaan leventämällä latvuksia samalla korttimäärällä** (`build_trees.py`: oksien pituus ja kulma). Syy, mitattu Blenderissä:
  - sademetsäpuun latvuksen jalanjälki oli vain noin 57 m², mutta sen sisällä lehtikortteja oli noin 25 kerrosta päällekkäin;
  - latvukset olivat siis umpinaisia, mutta niiden väliin jäi aukkoja (ylös katsoessa noin 35–38 % taivasta);
  - nyt jalanjälki on noin 110 m² (kapokki 112 → 150, jättiläispuu 206 → 244), kerroksia on edelleen yli kymmenen, eikä kolmioita tule lisää.
  - mitattu pelissä (siemen 4242, 8 kohtaa, kuva suoraan ylös): taivasta 38 % → 14 % (session 55 versio 23 %; scratchpad `s57/cover.mjs`).
  - kolmioita ruudussa sademetsässä (näköetäisyys 4, sama paikka): 6,5 M → 6,4 M, eli leventäminen ei maksa mitään.
- **Jyrkänteet ovat kohinakentän tasa-arvokäyrillä kaksi porrasta** (`terrain.js` `escarpment`), ja niistä on kaksi versiota:
  - terävä (`escSharp`): todellinen maasto;
  - loiva ramppi (`escSoft`): jokiverkon vertailukorkeus (`smoothRef`); joen laaksossa maasto liukuu terävästä loivaan (`applyRivers`).

  Syy: jokiverkko näkee vain loivan rampin, joten joet kulkevat jyrkänteen läpi rotkona eivätkä hajoa.
- **Loivan rampin leveys on ±0,16 kentän yksikköä** (ensin ±0,07). Syy: jyrkkä ramppi teki pienten purojen pintaan jopa 1,9 m:n hyppyjä (13 kohtaa, siemen 777). Leveämmällä rampilla hyppyjä on 4, kuten ennen jyrkänteitä (3), eikä yksikään ole jyrkänteellä (scratchpad `s57/rivcheck.mjs`).
- **Vesiputoukset ovat jokiverkosta erillisiä lähdepuroja** (`terrain.js` `fallInCell`, `applyFalls`; `render/waterfalls.js`). Syy: käyttäjä pyysi varomaan, ettei jokigenerointi hajoa. Putous ei muuta jokiverkkoa eikä jokien pintoja; paikka valitaan vähintään 70 m:n päästä uomista ja järvistä.
  - Paikka haetaan Newtonin askelin jyrkänteen tasa-arvokäyrälle. Seinämän pitää olla jyrkkä (puolileveys enintään 3,2 m), vähintään 5 m korkea ja suora 7 m kumpaankin suuntaan.
  - Purojen solmut ovat 2 m:n välein, ja pinta laskee aina alavirtaan. Laskupuro katkaistaan jyrkkään pudotukseen tai jyrkänteeseen, ja se kapenee ja imeytyy maahan.
  - Yläpuron vesi loppuu 1,5 m ennen reunaa, ja altaan takareuna on vähintään 1,3 m reunasta. Väliin jää siis kuivia ruudukon pisteitä, eikä vesiseinää synny (tarkistettu: 0 seinäparia, scratchpad `s57/fallwall.mjs`).
  - Putoava vesi on oma verkkonsa: kaari reunan yli ja seinämää pitkin, jos kallio on loivempi kuin putoamiskaari. Juovien UV on lentoaika, joten juovat venyvät vauhdin kasvaessa.
- **Putouksen ääni on proseduraalista kohinaa** (`sfx.js` `waterfall`), ei äänitiedosto. Syy: ei uutta tiedostoa eikä lisenssiä, ja kohina sopii vesiputoukseen hyvin; lähellä ääni on kirkkaampi (alipäästön raja nousee).

## 2026-10-27 (sessio 56)
- **Puut tehdään Blenderillä skripteistä** (`tools/blender/build_trees.py`), ei valmiita malleja ladaten. Syy: sama toistettava tapa kuin esineissä, ja puut sopivat pelin kaatoon, kantoihin, loviin ja liaaneihin (runko ensin, tarkka rengas kaatokorkeudella, kaatotiedot solmun extras-kentässä).
- **Puut muunnetaan pelissä kitin muotoon** (`treeAssets.js`): kolmiot ilman indeksiä, ryhmä per materiaali (kaarna, lehdet), runkokolmiot ensin. Syy: kaato (`splitTree`), lovet ja hakattavat palat toimivat ilman erillistä polkua. `splitTree` säilyttää nyt materiaaliryhmät.
- **Kaarnan verteksiväri on valkoinen, ja tuore puu sekoitetaan varjostimessa** (`freshWood`). Syy: tekstuuroidussa kaarnassa lovien ja kuorinnan värit eivät muuten näkyisi.
- **Lehdet ovat atlaksesta otettuja kortteja; atlas renderöidään Blenderissä mallinnetuista lehvistä.** Syy: yksi tekstuuri kaikille lajeille ja yksi materiaali, ja lehvät näyttävät oikeilta lehdiltä.
- **Tyven juurilohkot ovat osa runkoa** (säde kulman ja korkeuden funktiona), eivät erillisiä levyjä. Syy:
  - käyttäjä piti kolmion muotoisia pönkkäjuuria ja kantoja kulmikkaina;
  - lohko on pyöreä ja liittyy runkoon saumatta, ja kanto saa saman muodon kaadossa;
  - tyvessä on tiheämmät renkaat ja kulmat, jotka ommellaan yläosan harvempaan putkeen, joten kolmioita ei tule turhaan koko rungon matkalle;
  - juuret jatkuvat maan alle viistosti, jotta ne eivät jää ilmaan rinteessä.
- **Kaarnan U kulkee juurilohkon kyljillä ylös ja alas (peilautuu harjalla)** ja V mitataan tyvessä pintaa pitkin. Syy: muuten kuvio venyisi lohkoilla tai vinoutuisi renkaiden välillä. Ympäri on kokonainen määrä tekstuurikierroksia, ettei saumaa näy.
- **Tiheyttä lisättiin kertomalla kaikki biomit vähintään samalla kertoimella kuin suurin tiheys** (akasia: metsäsavanni 11 → 16 ja muut ≥ ×1,45; karite ×1,5, avoin savanni ×1,8).
  - Ehdokkaiden satunnaisluvut ja hyväksymisraja (tiheys / suurin tiheys) pysyvät vanhoilla ehdokkailla samoina tai suurenevat.
  - Siksi vanhojen maailmojen puut (ja tallennetut kannot) pysyvät paikoillaan, ja uudet puut tulevat lisäksi.
  - Sademetsän tiheyksiä ei muutettu: se on jo tiheä, ja sen puut ovat raskaimpia.
- **Baobabin kaarnatekstuuria vaalennettiin valmisteluvaiheessa** (`prep_textures.py`, `BARK_ADJ`). Syy: ambientCG:n Bark005 on tumman oliivinen, mutta baobabin kaarna on vaalean harmaanruskea.
- **Esineissä parannettiin heikoimmat mallit** (17 kpl), ei kaikkia uudelleen. Syy: sessioissa 54–55 tehdyt työkalut, aseet ja panssarit näyttävät jo hyviltä; heikoimmat olivat yksinkertaisia möhkäleitä (kivi, piikivi, savi), ohuita tikkuja (ruoko, fonio) tai pallokasoja (pähkinät, hibiskus).
  - Piikiven kuori on oma osansa (`split_part`), jossa on vaalea luutekstuuri. Syy: tekstuurin väriä voi vain tummentaa, joten vaalea kuori ei onnistu tumman piikiven tekstuurilla.
  - Nuotion tuhka ja hiilet ovat omia verteksivärimateriaaleja (`ash`, `coal`).

## 2026-10-27 (sessio 55)
- **Kullakin tasolla on oma muotonsa, ei vain eri materiaali.**
  - Kupari: pronssikauden muodot (puolikuukirves, lehtimiekka antenniponnella, kohokuvioitu kupera kilpi).
  - Rauta: käytännölliset taotut muodot ja Sahelin perinne (partakirves, takouba-miekka, kolmiokilpi vantein).
  - Rubiini: koristeelliset muodot ja hehkuva rubiini (kaksiteräinen kirves, kaareva sapeli, sotahakku).
  - Taljakilpi on soikea lehmäntaljakilpi (Itä- ja Etelä-Afrikan malli).
  - Syy: käyttäjä halusi tasojen erottuvan toisistaan.
- **Otekohta ja koko pidetään ennallaan**, kun mallin muoto muuttuu. Syy: käden otteet (`holdFor`) ja jousen jänne (`bowPoints`) toimivat ilman muutoksia.
- **Putket ja nyörit käyttävät rinnakkaissiirrettyjä kehyksiä** (`itemlib.transport_frames`). Syy: aiemmin poikkileikkauksen suunta hyppäsi tietyissä kulmissa, mistä tuli katkoja ja nipistyksiä (köysikerä, rannerengas).
- **Kuvakkeet piirretään vasta, kun käyttäjän mallien (nuija, soihtu, puukko) tekstuurit ovat latautuneet** (`userTexturesReady`). Syy: muuten kuvake jäi ilman tekstuuria.

## 2026-10-27 (sessio 54)
- **Esinemallit tehdään Blenderillä Python-skripteistä** (`tools/blender/`), ei käsin eikä valmiita malleja lataamalla.
  - Syy: yli 100 esinettä yhtenäisellä tyylillä, ja skriptiä muuttamalla ja ajamalla uudelleen työ on toistettavaa.
  - Mitat on sovitettu vanhoihin malleihin, joten käden otteet (`holdFor`) ja kuvakkeiden kulmat toimivat sellaisenaan.
  - Blender (4.0.2) ajetaan pilviympäristössä Ubuntun paketista; käyttäjän Steam-Blenderiä ei tarvita.
- **Tekstuurit ovat yhteinen materiaalikirjasto, ei esinekohtaisia leivottuja tekstuureja.**
  - 17 toistuvaa CC0-materiaalia (512 px WebP: väri, normaali, karheus) ja kaksi itse tehtyä (rengas- ja suomupanssari), yhteensä 3,1 Mt.
  - UV:t ovat metreinä, joten tekstuurin tarkkuus on sama kaikissa esineissä. Sävy annetaan materiaalipaikan nimessä (esim. `cloth:8a6a4a`).
  - Syy: pieni latauskoko, ja uusia esineitä voi tehdä ilman uusia tekstuureja.
- **AO leivotaan verteksiväreihin, ja orgaaniset kuviot maalataan verteksiväreillä** (banaanin pilkut, sienten lakit, liha, sulat). Syy: ei tarvita esinekohtaisia tekstuureja.
- **Kaikki esineet ovat yhdessä GLB:ssä (EXT_meshopt_compression), ja UV:t on pyöristetty 1/1024 ruudun tarkkuuteen.**
  - Syy: yksi lataus, ja koko putosi 9,7 Mt → 2,9 Mt.
  - Purkaja (meshoptimizer, MIT) on `vendor/meshopt/`-kansiossa.
- **Vanhat proseduraaliset mallit jäävät varalle.** Syy: jos GLB ei lataudu, peli toimii silti.
- **Panssarien etupuoli osoittaa kuvakekameraa kohti** (pelin +Z). Syy: vanhoissa malleissa etupuoli oli −Z:n suuntaan, joten kuvakkeessa näkyi lähinnä takapuoli.
- **Jousen runko ja yksittäinen nuoli ovat GLB:ssä omina solmuinaan** (`bowbody_<tunnus>`, `arrow1_<tunnus>`), ja jänne piirretään pelissä kuten ennen. Syy: jänne liikkuu vedettäessä.
- **Ladatun ambientCG-paketin `.blend`-tiedostoja ei avata**; vain JPG-kuvia käytetään. Syy: `.blend` voi sisältää ajettavaa Python-koodia.

## 2026-10-14 (sessio 53)
- **Isoille eläimille pehmeä kääntyminen** (`turnAcc` mobin määrittelyssä, `_steer`): kulmanopeus kiihtyy ja jarruttaa ennen kohdesuuntaa. Syy: leopardin "vaappuminen" johtui pääosin nopeista napsahtavista käännöksistä (5 rad/s) ja niiden kallistuksista, joita tiheän sademetsän esteiden kierto laukaisi jatkuvasti. Koskee nyt leopardia ja gorillaa; muut eläimet ennallaan.
- **Leopardin askeltahti asetettu hieman todellista hitaammaksi** (kävely ~1 Hz). Syy: käyttäjän mielestä animaatiot olivat liian nopeita; pelissä rauhallinen tahti näyttää isolta kissalta.
- **Gorillan animaatioita ohjataan itse** (`animateGorilla`): kaikkien klippien painot ja ajat asetetaan joka ruudussa. Syy: mallin klipit ovat hyvin lyhyitä (nousu 0,57 s, lyönti 0,2 s), ja ne piti venyttää pelin tilojen kestoille.
- **Gorillan kävely tehdään laukasta raajojen vaiheita siirtämällä** (apinoiden ristikkäinen nelitahti), ja oikealle jalalle peilataan vasemman jalan liike. Syy: mallissa ei ole kävelyanimaatiota; laukan johtava oikea jalka potkaisee liian korkealle.
- **Rinnan lyönti käsien IK:lla** (kädet rintaan, kyynärpäät sivuille). Syy: lähdeanimaatiossa ei ole lyöntiä, ja Biped-luiden akselit ovat hankalia suoraan kierrettäviksi.

## 2026-10-13 (sessio 52)
- **Gorillan ryntäys 4,6 m/s:** kävelyä (4,2) nopeampi, jotta kävellen ei pääse karkuun, mutta juoksua (7,2) hitaampi. Väistön juoksu on erikseen 4,2 m/s, ettei se hidastunut samalla.
- **Rainforest-lintu on harmaapapukaija** (Keski-Afrikan sademetsän tunnetuin lintu, punainen pyrstö erottuu hämärässä). Käyttäjä sanoi vain "lintuja", joten laji on vahvistettava (DESIGN).
- **Linnut istuvat esineiden päällä:**
  - Paikat ovat lahopuu, sammalkivi ja lohkare; korkeus luetaan mallin rajauslaatikosta, ja paikan korkeus on 0,3–2,6 m.
  - Syy: tiheä aluskasvillisuus peittäisi maassa olevat linnut, eikä puiden oksista ole paikkatietoa.
  - Paikkoja on harvassa (noin 7 / 30 m), joten haku tehdään 14 m:n säteellä ja parvi jaetaan eri paikoille.
- **Lyönti ei osu lintuihin** (`noMelee`): käyttäjän mukaan niitä ei voi tappaa käsin. Lisäksi lentoon lähtö lähestyttäessä.
- **Leopardin luuranko rakennetaan latauksessa** (kuten norsulla):
  - nivelet mitattu mallista;
  - kyynär- ja polvinivel lasketaan luiden pituuksista (vasen ja oikea yhtä pitkät);
  - painot: lähin sallittu luu ja pehmennys pintaa pitkin, ei eri jalkojen välillä.
  - Animaatiot ovat proseduraalisia (IK sivutasossa), koska mallissa ei ole valmiita.
- **Oikean etujalan alaosa korvataan vasemman peilikuvalla.**
  - Syy: lähdemallin oikea tassu on käpristynyt ja sulautunut vasemman ranteen taakse.
  - Kokeiltiin myös erottelua pintaetäisyydellä, lähimmällä luulla, koveruudella ja leikkaamalla ranteesta. Kaikissa tassut repesivät tai jäivät vajaiksi.
  - Leikkaus tehdään vaakatasossa kyynärpään alta; kopio kohdistetaan leikkausrenkaiden keskipisteisiin.
- **Leopardin käytös reiluksi** (ei käyttäjän sanoma, vrt. gorillan "ei liian vaikea"):
  - jähmettyy, kun pelaaja katsoo sitä (näkölinja tarkistetaan), ja luovuttaa 5 s katsottuna;
  - pelkää soihtua;
  - murisee ennen loikkaa;
  - raatelu kestää 2,5–4 s: passiivinen pelaaja menettää noin 38 terveyttä.
- **Leopardin murina syntetisoidaan** (kohina + 25 Hz:n amplitudimodulaatio + matala sahalaita), koska äänitiedostoa ei ole.

## 2026-10-13 (sessio 51)
- **Gorillan malli:**
  - Valmiit animaatiot (idle, run, stomp, attack) soitetaan `THREE.AnimationMixer`illa; jokaisella gorillalla on oma luurankokopio (`SkeletonUtils.clone`).
  - Juoksussa ei ole juuren liikettä, joten pelin liike ohjaa paikkaa. Kävely on laukka hidastettuna (oma kävelyanimaatio puuttuu), ja lyönti venytetään valmistelun ja iskun ajalle (0,2 s → 0,74 s).
  - Suunta (+Z) lasketaan pään ja lantion luista latauksessa, ja koko on 1,5 m.
  - Tiedosto kevennetty 1,29 → 0,49 Mt (resample, JPEG-tekstuuri).
- **Säikähdysmittari** (`m.startle`) eikä välitön reaktio, jotta yksittäinen vahinko (esim. ohimenevä hyppy 3 m:n päässä) ei suututa:
  - hyppy alle 2,2 m:n päässä +1,1 (suuttuu heti), 2,2–3,5 m:n päässä +0,55;
  - laskeutuminen viereen +0,6;
  - isku lähellä +0,45;
  - ryntäys päin yli 5,5 m/s alle 4,5 m:n päässä kertyy ajan mukana (kävely 4,2 m/s ei säikytä, juoksu 7,2 m/s säikyttää);
  - mittari laskee 0,2 / s, ja puolivälissä (yli 0,45) gorilla varoittaa rintaan lyönnillä.

  Syy: käyttäjän mukaan viidakosta ei saa tulla liian vaikea.
- **Karjaisu vain uuden suuttumisen alussa**, ei jokaisella iskulla: käyttäjän mukaan karjaisu kuuluu, kun gorilla huomaa pelaajan ja hyökkää.
- **Väistötila on `avoid` eikä `retreat`**, koska `retreat` on muilla olennoilla vihamielinen tila (nimilapun punainen silmä).

## 2026-10-13 (sessio 50)
- **Taustaäänten audio-elementeille `crossOrigin = 'anonymous'`.**
  - Syy: raw.githack ohjaa mp3:t (301) raw.githubusercontent.comiin, eli eri alkuperään. Web Audio (`createMediaElementSource`) saa ilman CORS-pyyntöä vain hiljaisuutta.
  - raw.githubusercontent palauttaa `access-control-allow-origin: *` ja tukee osittaisia latauksia, joten korjaus riittää.
  - Paikallisissa testeissä (sama alkuperä) vika ei näkynyt, joten testaan äänet jatkossa myös githack-osoitteesta.
  - Musiikki soittaa elementin omalla äänenvoimakkuudella eikä Web Audion kautta, siksi se kuului.
- **Viidakon taso 0,4 → 0,55** (noin −26 LUFS, hieman sademetsän musiikin −28 LUFS:n yläpuolella).
- **Kuoriainen NPC:ksi lipulla `npc`** (ei uutta järjestelmää):
  - `inArc` (lähitaistelu) ja nuolet ohittavat sen;
  - `damage()` ja `setOnFire()` palaavat heti (säikähtää lentoon), joten myöskään kaatuva puu ei tapa sitä;
  - nimilapulla ja kohteen tiedoissa ei terveyspalkkia;
  - sarvi-esine jää koodiin vanhoja tallennuksia varten, mutta sitä ei enää saa.
- **Hyttysen ääni:** normalisoitu (+26 dB, rajoitin), mono 64 kbps (91 kt). Ininä on yksi pätkä, jonka rata kulkee pään suhteen, joten panorointi, voimakkuus ja kirkkaus ajastetaan käyrinä alussa eikä joka ruudulla.
- **Mäkärät:** pisteen vähimmäiskoko 1,8 px. Ennen 5 m:n päässä piste oli noin 1,3 px ja käytännössä näkymätön. Siipien välähdys tehdään varjostimessa (ei lisäkustannusta).

## 2026-10-13 (sessio 49, jatko)
- **Banaanitertun kevennys osittain:** terttu on 160 erillistä banaania (52 kolmiota kukin) ja varsi. Koko verkon kevennys hajotti ne, joten nyt:
  - kärkipisteet yhdistetään ja verkko jaetaan osiin;
  - lähiversioon jää joka neljäs banaani 1,2-kertaisena ja kevennettynä (noin 900 kolmiota), kaukoversioon joka kymmenes;
  - varsi säilyy.

  Banaanipuun lähiversio on noin 1 800 kolmiota (ennen 1 074, mutta terttu oli rikki).
- **Tekijät päävalikkoon** eikä vain tiedostoon: CC BY 4.0 vaatii nimeämisen siellä, missä sisältöä käytetään.

## 2026-10-12 (sessio 49)
- **Kuoriainen rungoilla:** rungon paikka ja säde lasketaan puun mallin rungon tiedoista (`userData.tree`: base, top, r0, r1) sekä objektin kierrosta ja koosta. Erillistä törmäyshakua ei tarvita, joten se on kevyt. Rungolla kuoriaisen suunta lasketaan kantavektoreista (selkä ulospäin, pää kulkusuuntaan). Kuolleena se putoaa painovoimalla.
- **Käyttäjän mallit kit-muotoon** samalla muuntimella kuin Poly Havenin kasvit:
  - solmujen muunnokset leivottu ja koko skaalattu metreihin;
  - banaanin hedelmäterttu kevennetty 8 400 → 160 kolmioon (kärkipisteet ensin yhdistetty, koska verkossa oli irrallisia saumoja);
  - bambunlehtien UV:t siirretty välille 0–1, koska alfatekstuurit eivät toistu, ja ilman siirtoa lehdet eivät näkyneet.

  Kaukoversioissa bambun ja pensaan lehtikorteista jätetään osa ja ne suurennetaan.
- **Bambuista ei peilattuja kopioita:** pyöritys riittää vaihteluun, ja tiedosto pysyy pienenä (userKit.js 480 kt).
- **Vanhat proseduraaliset banaani ja bambu poistettu** (`palms.js` `makeBanana`, `plants.js` `makeBamboo`). Syy: käyttäjä toimitti paremmat mallit; muunnelmien määrän muutos ei siirrä objekteja (muunnelma valitaan viimeisenä).
- **Latvusto leveämmäksi samalla korttimäärällä** (`trees.js` `widen`):
  - leveys kerrottu (latvuspuu 1,3, viidakkopuu 1,25, jättiläispuu 1,15);
  - tiheys jaettu pinta-alan kasvulla ja kortit suurennettu;
  - kolmiomäärä mitattiin samaksi kuin ennen (5 317 / 1 734 / 3 823).

  Syy: käyttäjä halusi lisää lehtikattoa ilman ruudunpäivityksen laskua; kortteja lisäämällä kolmiot olisivat kasvaneet.
- **Suorituskyky** (sademetsä, näköetäisyys 4, kasvillisuus korkea; sessio 48 → 49):
  - piirtokutsut 318 → 340 (uudet materiaalit);
  - kolmiot 4,60 M → 4,58 M (uusi bambu on kevyempi kuin vanha proseduraalinen);
  - ylöspäin katsottaessa 314 → 338 kutsua ja 4,59 M → 4,57 M kolmiota.
- **Kenttäkerros:** vain koristetyyppien tiheyksiä nostettiin (`groundFern`, `undergrowth`, `tropicalPlant`), koska niiden paikkoja ei tallenneta. Bambupensas on uusi tyyppi listan lopussa.
- **Kärpäset:**
  - rata kulkee kameran suhteessa, jotta stereoäänen panorointi (tiedostossa vasemmalta oikealle) ja näkyvä lento täsmäävät pelaajan kääntyessäkin;
  - toinen suunta saadaan vaihtamalla kanavat ristiin;
  - tiedostosta leikattiin kolme ohilentoa (4,2 s, 59 kt alkuperäisen 12,5 s:n ja 400 kt:n sijaan);
  - liike-epäterävyyden tilalla kärpäsen runkoa venytetään vauhdin mukaan.

## 2026-10-12 (sessio 48)
- **Ambienssi:** viidakkoäänen taso 0,22 → 0,4 ja alipäästö 4,2 → 8 kHz. Syy, mitattu EBU R128:lla:
  - tiedosto on −20,9 LUFS, ja sen yläpää (yli 4,2 kHz, hyönteiset ja linnut) −27,5 LUFS;
  - pelissä ääni oli noin −34 LUFS, kun sademetsän musiikki soi −28 LUFS:ssä;
  - koodissa ääni soi oikein (testattu selaimessa).
- **Uudet tyypit objektilistan loppuun** (`emergent`, `tropicalPlant`, `sapling`). Syy: tyyppien järjestys vaikuttaa siemeniin, joten olemassa olevien maailmojen puut eivät siirry. Vanhojen tyyppien tiheyksiä ei muutettu samasta syystä.
- **Latvuskatto jättiläispuilla (6 / chunk)** eikä tiheämmillä nykyisillä puilla. Syy:
  - muutama iso latvus 16–24 m:ssä peittää enemmän kuin monta pientä;
  - kustannus pysyy kohtuullisena: kaukomallit kevyinä ja isommat lehtikortit korkealla;
  - varjokartta tekee metsänpohjasta hämärän.
- **Poly Havenin kasvit:** calathea ja saniainen, kevennettynä noin 800–1 100 kolmioon (lähteessä 800–5 900). Anthurium ja pachira jätettiin pois:
  - anthurium on punakukkainen huonekasvi;
  - kummankin lehdissä on saumoja joka puolella, joten ne eivät keventyneet (pachira 4 300–7 700 kolmiota);
  - kun saumoja ei lukittu, UV:t osuivat väärille alueille (ruskeat läikät).

  Keskikerroksen täyttää kevyt proseduraalinen taimi (noin 100 lehtikorttia).
- **Herkuleskuoriainen:**
  - koko noin 20 cm sarvineen (todellinen koiras enintään noin 17 cm, hieman suurennettu, jotta erottuu);
  - ei hyökkää, koska todellinenkin on ihmiselle vaaraton; uhittelee sarvillaan ja lentää lyötynä pois;
  - pudottaa uuden esineen, herkuleskuoriaisen sarven, jonka käyttö on avoin.

  Syy: käyttäjä ei määritellyt käytöstä, joten valittiin luonnonmukainen ja kirjattiin kysymykset DESIGN.md:hen.
- **Hyönteiset kahtena piirtokutsuna:** mäkärät Points-pisteinä (9 parvea × 34), perhoset InstancedMeshinä (siivet lepattavat shaderissa). Syy: halpa, ei vaikuta ruudunpäivitykseen.
- **Suorituskyky (sademetsä, näköetäisyys 4, kasvillisuus korkea, varjot mukaan lukien):**
  - piirtokutsut 293 → 318 (+8 %), kolmiot 3,84 M → 4,6 M (+20 %);
  - ensimmäinen versio oli +30 %, joten jättiläispuun lehtikortit harvennettiin ja suurennettiin: lähimalli 7 800 → 5 300 kolmiota, kaukomalli 1 200 → 650;
  - trooppisia kasveja 140 → 100 / chunk, taimet näkyvät 1 chunkin päähän;
  - kasvu tulee lähinnä jättiläispuiden latvuksista ja niiden varjoista.

  Session 43 muutos (joka pudotti ruudunpäivitystä) kasvatti kaikkien puiden kaukomalleja noin 2,8-kertaisiksi, mikä on paljon suurempi muutos. Säätövara: `emergent.density.rainforest` (6).

## 2026-10-12 (sessio 47)
- **Sademetsän päivän tunnelma.** Arvot ovat säädettävinä `Environment`-olion ominaisuuksina, ja kaikki on kerrottu kosteudella (`humid`) ja päivänvalolla (`daylight`), joten muut biomit ja yöt eivät muutu. Syy: käyttäjän ohje (latea ja haalea, ei syvyyttä) ja varoitus, ettei ulkonäköä saa pilata.

  | Arvo | Ennen | Nyt |
  |---|---|---|
  | Auringon himmennys latvuston alla (`humidSunDim`; yöllä ennallaan 0,45) | 0,45 | 0,25 |
  | Lämmin sävy (`humidSunWarm`, väri 1 / 0,8 / 0,55) | – | 0,2 |
  | Hajavalon vähennys (`humidDayAmb`) | 0,2 | 0,4 |
  | Usvan tummennus (`humidFogDark`) | 0,45 | 0,35 |
  | Sävytys latvuston vihreään (`humidFogTint`) | – | 0,25 |
  | Usvan alun siirto lähemmäs (`humidFogNear`) | – | 0,5 |
  | Korkeussumu (`humidHaze`) | 0,006 | 0,008 |
  | Valokeilat (`humidShafts`) | 0,6 | 0,75 |
  | Värimäärittely (`post.gradeHumid`) | – | kontrasti +0,08, kylläisyys +0,12 |

  Sumu (`scene.fog`) oli koko ajan päällä, mutta sessiossa 38 tummennettu usva häivytti taustan harmaaseen.
- **Varjokartta hoitaa latvuston varjon**, joten auringon yleistä himmennystä voi pienentää. Ennen kaksinkertainen himmennys teki valoläikistä tuhruisia.

## 2026-10-12 (sessio 46)
- **Lehvästön pikselimössön syy selvitettiin vertailemalla:**
  - sessio 36 (ennen grafiikkapäivitystä) ja nykyinen versio renderöitiin samasta kohdasta;
  - latvusten rakenne ja välkyntä olivat molemmissa samat, ja muutos alle pikselin kameran käännöksessä oli samaa luokkaa;
  - vika ei siis tullut grafiikkapäivityksestä. Päivityksen tummemmat varjot ja suurempi kontrasti tekivät siitä vain näkyvämmän.

  Syy on alfaleikattujen lehtikorttien (satoja muutaman pikselin kortteja latvusta kohden) kovat reunat ja tekstuurin pienet yksityiskohdat.
- **Korjaus `softFoliage` (materials.js):** mipmap-bias 0 → 1 välillä 4–20 m (`vViewPosition.z` on positiivinen etäisyys), ja alfareuna peittävyydeksi keskitetysti 1,5 pikselin matkalla. Testatut vaihtoehdot ja vaikutus välkyntään (muutos kameran käännöksessä):
  - pelkkä reunan pehmennys: −10 %;
  - kaukana tiheämmät lehdet: −10 %;
  - varjojen pehmennys kaukana (40–60 %): ±0;
  - varjot kokonaan pois: latvukset siistimpiä, mutta syvyys katoaa;
  - jälkikäsittely tai syväterävyys pois: ei vaikutusta;
  - mipmap-bias (1 kaikkialla) ja reunan pehmennys yhdessä: −15–34 %. Tämä valittiin.
  - Lopullinen toteutus (bias vasta 8–30 m): −11–16 %. Siksi alue siirrettiin 4–20 m:iin, jotta myös lähempänä olevat latvukset hyötyvät. Lähellä (alle 4 m) lehdet ovat ennallaan.

  TAA ei tule kysymykseen (käyttäjä ei halua suttua, sessio 42).
- **Syväterävyys:** kaukana alkaen max(tarkennus × 2,5 + 12, 24) m, enintään 0,5, säde 3,5. Puolikkaan tarkkuuden kuva sekoittuu yhä vasta voimakkuudesta 0,2. Syy: käyttäjä pyysi hieman lisää.

## 2026-10-12 (sessio 45)
- **Okkluusiosta pois ohut geometria:** syvyyden toinen derivaatta suhteessa etäisyyteen (`thin`) häivyttää okkluusion välillä 0,015–0,06. Lisäksi näytteet alkavat 35 %:sta säteestä, säde 0,85 → 1,2, voimakkuus 0,62 → 0,5, kantama 90 → 70 m ja sumennusaskel 2 tekseliä. Syy: käyttäjän mukaan SSAO välkytti tiheää ruohoa ja lehtiä. Korret ja lehdet ovat pikselin levyisiä ja liikkuvat tuulessa, joten niiden okkluusio vaihtui ruudusta toiseen. Isot muodot (rungot, kivet, maaston kuopat) pitävät okkluusion.
- **Terävöinti (CAS, sessio 38) poistettu kokonaan** (shader, uniformit, asetus, valikko). Syy: käyttäjä pyysi; tehoste korosti reunojen ja kasvillisuuden kohinaa.

## 2026-10-12 (sessio 44)
- **Session 43 kaukomallit peruttu** (`trees.js`, `flora.js`, `palms.js`, `world.js` palautettu). Syy: ruudunpäivitys putosi viidakossa, jossa puita on paljon.
- **Syväterävyys session 25 arvoihin** (kaukana alkaen max(tarkennus × 3 + 15, 32) m, enintään 0,4, säde 3), ja puolikkaan tarkkuuden kuva sekoittuu vasta voimakkuudesta 0,2 alkaen (oli 0,12). Syy: kaukainen maisema näkyi puolikkaan tarkkuuden kuvana pienellä sumennuksella, eli pikselöityneenä. Pikselitiheyteen ja MSAA:han ei koskettu, koska ne eivät olleet syy.

## 2026-10-12 (sessio 43)
- **Kaukomallien laatu ylös:** lehtikorttien tiheys 0,3 → 0,85 ja koko 2,0 → 1,35 (`blob` sekä `trees.js`:ssä että `flora.js`:ssä), palmujen lehdykät 9 → 16 ja leveys × 2,2 → × 1,5, tarkan mallin raja `LOD_NEAR` 1,6 → 2,4 chunkia. Syy: käyttäjän mukaan kaukaiset puut näyttivät PS1-grafiikalta. Instanssipoolit kasvavat itse, ja kaukomallit eivät heitä varjoja, joten kustannus on kohtuullinen (enemmän kolmioita kaukana).

## 2026-10-12 (sessio 42)
- **Takapakki:** liike-epäterävyys 0,9 / 1,7 ja suurin siirtymä 0,08 (session 25 arvot), oletuksena pois. Okkluusio on oletuksena pois kaikilla laatutasoilla, ja asetusversio 6 kytkee liike-epäterävyyden, okkluusion ja terävöinnin kerran pois myös vanhoista asetuksista. Syy: käyttäjän mukaan peli näytti liikkeessä sotkuiselta ja kasvillisuus kohisi.
- **Ei SMAA:ta eikä TAA:ta.** Maailma ja käsi piirretään jo 4× MSAA:lla, ja kasvillisuus käyttää alpha-to-coveragea, mikä on SMAA:ta terävämpi ilman ajallista suttua. Kuvassa näkyvä suttu tuli liike-epäterävyydestä, ei reunanpehmennyksestä.
- **Käden reunavalo:** 0,01 + 0,05 × pimeys (oli 0,03 + 0,26 × pimeys), potenssi 4 ja vain pinnan värin mukaan (ennen vähintään 35 %, jolloin vaalea iho hehkui).

## 2026-10-12 (sessio 41)
- **Käden valaistus:**
  - täyte-, reuna- ja AmbientLight-valot (sessiot 38–40) poistettiin;
  - Fresnel-reunavalo shaderiin (`addRim`, väri ja voimakkuus `vmRim` pimeyden mukaan, 0,03 + 0,26 × pimeys);
  - viewmodel-näkymään taivas–maa-liukuma ympäristökartaksi (`environmentIntensity` = taivaan kirkkaus × 0,8, enintään 0,5).

  Syy: käyttäjän ohje, ja tasainen valo teki kädestä yöllä joko liian kirkkaan tai mustan.
- **Kädessä olevien esineiden materiaalit kopioidaan** (`vmMaterial`), ja `onBeforeCompile` ja välimuistiavain siirretään käsin, koska `Material.copy` ei kopioi niitä. Syy: samoja materiaaleja käytetään maassa olevissa esineissä. Puun karheus enintään 0,62 (metallittomat), jotta heijastus näkyy. Käden oma materiaali muokataan suoraan (vain kädellä).

## 2026-10-12 (sessio 40)
- **Pushaus remoteen `studios`** (`KSPKtechStudios/Sahel_survivor_game`). Syy: työympäristö kirjoittaa `origin`-remoten toistuvasti vanhaan, jäädytettyyn repoon.
- **Ruoho: alpha-to-coverage ja terävöity alfa** (`(a − 0,5) / fwidth(a) + 0,5`), ei kovaa `discard`ia. Syy: ruohokenttä oli ainoa kasvillisuus ilman alpha-to-coveragea, ja kova raja välkkyi ja teki moiré-kuvioita. Maailma piirretään 4× MSAA -kuvaan, joten peittävyys pehmentää reunat. Muut leikatut materiaalit (lehdet, kitin kasvit) käyttävät jo alpha-to-coveragea (three terävöi alfan itse), ja niillä on peittävyyden säilyttävät mipmapit. SMAA:ta ei lisätty, koska MSAA ja alpha-to-coverage hoitavat kasvillisuuden reunat, eikä ylimääräistä vaihetta tarvita.
- **Anisotropia 16** (three rajaa näytönohjaimen maksimiin): maaston pinnat, lehdet, ruoho ja metsänpohja, maan yksityiskohtatekstuuri ja kitin sekä skannattujen mallien tekstuurit.
- **Terävöinti oletuksena pois** (asetusversio 5 kytkee sen kerran pois myös vanhoista asetuksista). Syy: käyttäjä koki reunat rumiksi kahdesti terävöinnin jälkeen.
- **Taivas × (1 − 0,22 × päivänvalo) koosteessa.** Syy: silmän mukautumisen painotus ei yksin estänyt sademetsän pilvisen taivaan puhkeamista valkoiseksi; suora taivaan tummennus pitää maiseman valotuksen ennallaan.
- **Syväterävyys:**
  - kaukainen sumennus alkaa nyt tarkennus × 2,2 + 12 m (oli × 1,8 + 8 m);
  - suurin sumennus 0,55 (oli 0,85), säde 4 (oli 5);
  - lähisumennus 0,45 (oli 0,6).
- **Käsi yöllä:** mukautumisen eksponentti 0,3 (oli 0,4), täytevalot noin 70 % entisestä.
- **Okkluusion voimakkuus 0,62** (oli 0,75), koska puolikkaan tarkkuuden okkluusio voi lisätä kohinaa tiheään ruohoon.

## 2026-10-12 (sessio 39)
- **Intro on index.html:n oma kerros, jonka käynnistää tavallinen (ei moduuli) skripti heti sivun alussa.** Peli latautuu taustalla, mutta `main.js` ei piirrä mitään, kun `window.sahelIntroActive` on tosi. Syy: video alkaa heti, eikä raskas piirto nyi sitä. Ääni yritetään ensin; jos selain estää, video alkaa äänettömänä ja vasen klikkaus avaa äänen. Virhe, tai jos toisto ei ala 9 sekunnissa, ohittaa intron. Syy: Playwrightin Chromium (ja jotkin Linux-selaimet) ei osaa H.264:ää, ja hidas yhteys ei saa jumittaa peliä.
- **Video nimettiin `intro.mp4`:ksi ja ajettiin `-movflags +faststart -c copy`** (kuva ja ääni ennallaan). Syy: välilyönnit ja sulkeet ovat hankalia osoitteissa, ja moov-laatikko oli tiedoston lopussa, jolloin selain olisi ladannut 20 Mt ennen toistoa.
- **Valoisuus:**
  - ilmakehän sironta 0,9 → 0,5 × (1 − 0,4 × kosteus);
  - valokeilat 0,011 → 0,0075 ja niiden ilma 0,8 → 0,6 × kosteus;
  - valonsäteet 1,35 → 0,95;
  - silmän mukautumisen taivaspaino 0,4 → 0,75 ja päivätavoite 0,25 → 0,22;
  - bloomin yläraja 40 → 12.

  Syy: käyttäjän kuvissa aurinkoa kohti koko kuva hukkui kultaiseen hehkuun, ja taivaan aukot lehtien välissä puhkesivat valkoisiksi läiskiksi.
- **Terävöinti 0,5 → 0,25.** Syy: käyttäjä koki reunat rumiksi; terävöinti korosti lehtien reunoja.
- **Kädelle osittainen silmän mukautuminen alfakanavan avulla:** kooste kirjoittaa HDR-kuvaan alfan 0, käsi ja esineet 1, ja lopullinen vaihe käyttää kädelle mukautumista potenssiin 0,4 (esim. 3,4 → 1,6). Lisäksi täytevalot ovat noin kolmasosa entisestä. Syy: täysi mukautuminen ja vahvat täytevalot tekivät kädestä yöllä liian kirkkaan, ja ilman niitä käsi oli musta.
- **Syväterävyys:** kaukainen sumennus alkaa tarkennusetäisyys × 1,8 + 8 m ja on täysi × 3 + 60 m kohdalla (max 0,85, säde 5). Lähisumennus on alle ~1–2,5 m, kun katse on kaukana. Syy: käyttäjä halusi toimivamman ja huomattavamman (sessiossa 25 se oli hillitty liian voimakkaana).
- **Liike-epäterävyys:** kerroin 0,9 → 1,4 (kevyt) ja 1,7 → 2,6 (vahva), suurin siirtymä 0,08 → 0,12.

## 2026-10-12 (sessio 38)
- **Sumeuden syy oli bloom, korjaus kynnyksellä ja terävöinnillä.** Kynnys 2,0 ja polvi 0,7 (oli 1,25 ja 0,6), voimakkuus 0,2 (oli 0,32), ja ylösnäytteistyksen paino 0,65 (oli 0,85) tiivistää hehkun. Lisäksi CAS-terävöinti tehdään lopullisessa vaiheessa sävytetyille arvoille (5 näytettä). Syy: matalalla kynnyksellä kirkas taivas ja usva hehkuivat ja levittivät hohdetta koko kuvaan.
- **Silmän mukautuminen siirrettiin viimeistelyvaiheeseen** (kun bloom, värimäärittely, vinjetti tai terävöinti on päällä). Syy: käsi piirretään koosteen jälkeen, joten se ei saanut mukautumista ja jäi yöllä mustaksi muun maailman kirkastuessa. Bloomin kynnys laskee mukautumisen kertoimen GPU:lla samasta kirkkaustekstuurista (ei lukua prosessorille, joka pysäyttäisi piirron).
- **Käden valot ovat viewmodel-näkymässä:** täytevalo kamerasta, viileä reunavalo takaa ja AmbientLight-alaraja. Voimakkuus kasvaa pimeyden mukaan, joka arvioidaan maailman valojen kirkkaudesta. Materiaaleihin ei lisätty emissiivistä hehkua. Syy: samoja materiaaleja käytetään maassa olevissa esineissä, jolloin ne hehkuisivat maailmassa, eikä kloonaus säilyttäisi materiaalien shader-muokkauksia. Hajavalon alaraja ajaa saman asian. Käsi on jo valmiiksi omassa näkymässään ilman sumua ja okkluusiota, joten erillistä syvyysvaihetta ei tarvittu.
- **Sademetsän yö:** hajavalo × (1 + 3,0 × kosteus) yöllä, ja silmän mukautumisen yläraja 1,9 → 3,4. Päivällä usva latvuston alla × (1 − 0,45 × kosteus), korkeussumu 0,008 → 0,006, valokeilat 1,1 → 0,8 ja valotuksen tavoite 0,05 matalampi. Syy: latvusto varjostaa kuunvalon, ja aiemmin kosteus vähensi yön hajavaloa entisestään.
- **Kontrastikäyrä ei koske tummimpia sävyjä** (paino smoothstep 0,03 → 0,32). Syy: käyrä tummensi lähes mustia sävyjä 20–40 %.

## 2026-10-12 (sessio 37)
- **Ei EffectComposeria: tehosteet omaan jälkikäsittelyketjuun** (`render/post.js`). Syy: pelissä oli jo oma HDR-ketju (syvyys, valonsäteet, DOF, liike-epäterävyys, silmän mukautuminen, korkeussumu), ja EffectComposer olisi tuonut päällekkäisiä renderöintikohteita ja sävytyksen kahteen kertaan.
- **SSAO syvyyspuskurista puolikkaalla tarkkuudella** (Scalable Ambient Obscurance -tyyli, normaali naapurisyvyyksistä, 8 tai 16 näytettä spiraalina, reunat säilyttävä erotettava sumennus, syvyyden mukaan painotettu skaalaus täyteen kokoon). Syy: erillistä normaalipuskuria ei ole, ja toinen geometriakierros olisi kallis. Okkluusio kerrotaan värin päälle ennen sumua, ja kirkkaissa kohdissa se on heikompi (oikeasti se koskee vain hajavaloa). Häivytys 50–90 m:ssä, koska syvyystarkkuus loppuu.
- **Käsi piirretään HDR-kuvaan (viimeistelyvaihe), ja sävytys, värimäärittely, vinjetti ja bloom tehdään yhdessä lopullisessa vaiheessa.** Syy: kädessä olevan soihdun liekin pitää hehkua, ja käden värien pitää vastata maailman värejä. Käsi ei edelleenkään sumene (DOF ja liike-epäterävyys tehdään ennen kättä). Jos bloom, värimäärittely ja vinjetti ovat kaikki pois, käytetään vanhaa kevyttä polkua.
- **Bloom: pehmeä kynnys valotuksen jälkeen (1,25), Karis-keskiarvo, 5 tasoa (13 näytteen alasnäytteistys ja telttasuodin ylös).** Syy: vain voimakkaat kohokohdat hehkuvat. Kirkas taivas ei vaalenna kuvaa, eivätkä yksittäiset kiiltävät pikselit välky.
- **Päivän hajavalo × 0,6 (`env.ambientDay`), aurinko +10 %, silmän mukautumisen päivätavoite 0,25 (oli 0,3).** Syy: vertailukuvissa varjot olivat lähes yhtä kirkkaita kuin aurinkoiset kohdat, ja kuva oli ylivalottunut. Pilvisellä säällä hajavalo säilyy, koska silloin valo tulee koko taivaalta.
- **Varjot:** aurinko käytti jo kaskadivarjoja (SunLight, 2 kaskadia: tarkka lähellä, pehmeämpi kaukana), joten niitä ei vaihdettu. Varjoasetukset (Pois / Normaali / Tarkka) pysyvät ennallaan.
- **Matala laatu:** okkluusio ja bloom pois, värimäärittely ja vinjetti päällä. Syy: värimäärittely on yksi kevyt koko ruudun vaihe ja korjaa suurimman osan "halvasta" vaikutelmasta.

## 2026-10-12 (sessio 36)
- **Tuulen vaikutus liekkiin omalla kertoimellaan, puuskat sinikäyrien summana.** Syy: ennen tuuli meni samaan ilmavirtakertoimeen kuin liike (0,16), ja tavallisella tuulella kärki taipui vain noin 0,1 liekin korkeutta. Tuulen voimakkuus (0–1,5) välitetään myös shaderiin (`uWind`), jolloin lepatus voimistuu ja saa tuulen suunnan. Lepatuksen nopeutus kertyy vaiheeksi CPU:lla (`uFlow`), ettei kohina hyppää, kun tuulen voima vaihtelee.
- **Liekin piilotus ei enää tyhjennä hiukkasia.** Liekkiä päivitetään piilotettunakin (ilman kärkeä), joten hiukkaset liikkuvat ja häipyvät elinikänsä loppuun. Pisteet ovat näkyvissä vain, kun niitä on. Syy: käyttäjä huomasi kipinöiden ja savun katoavan heti. Session 35 jäätyneet pisteet eivät palaa, koska päivitys jatkuu.
- **Peukalo ratkaistaan etusormen mukaan** (`_thumbOnIndex`) eikä skaalata mallin nyrkistä. Etusormen keskijäsenen paikka lasketaan kyseisestä asennosta (nyrkki tai kahvan ote). Peukalon kaksi niveltä koukistuvat mallin nyrkin akseleiden ympäri juuri niin paljon, että pää ulottuu, ja tyvinivel kääntää pään paikalleen. Kahvalla lisäksi koordinaattihaku pitää nivelet kahvan pinnan ulkopuolella (`_thumbAroundHandle`). Syy: slerp-skaalaus ei kolmella yrityksellä saanut peukaloa etusormen päälle (se jäi sivulle ja taittui alas). Suora ratkaisu vei kahvalla peukalon kärkinivelen kahvan läpi (4–10 mm akselista); nyt se on 20–25 mm akselista.

## 2026-10-12 (sessio 35)
- **Liekki: sisäkkäiset kohinakuoret, ei sädemarssausta.** Syy: käyttäjän kuvaus pyysi kohinalla vääristettyä monikerroksista meshiä. Kuoret ovat kevyitä (4 × 24 × 30 verteksiä), ja katselukulmaan perustuva häivytys antaa tilavuuden tunnun joka suunnasta, toisin kuin ristikkäiset tasot. Taipuma on 2D-jousi (ilmavirta = tuuli − kärjen nopeus), ja ryhmän kierto on kameran käänteinen, joten liekin akseli on maailman ylös.
- **Kipinät ja savu: omat ShaderMaterial-pisteet** (pehmeä pyöreä muoto, väri ja koko per piste). PointsMaterial piirsi neliöitä, ja niiden koko ja läpinäkyvyys eivät vaihdelleet. Pisteiden pikselikoko lasketaan piirtohetkellä kuten PointsMaterialissa.
- **Peukalo nyrkissä:** kertoimet 0,9 / 0,5 / 0,3 (neljästä kuvatusta vaihtoehdosta paras: poikki sormien, ei alas eikä eteen).

## 2026-10-12 (repon siirto)
- **Repo siirtyi osoitteeseen `KSPKtechStudios/Sahel_survivor_game`** (julkinen). Syy: vanha GitHub-tili (`KSPKtech`) jäädytettiin, eikä käyttäjä saanut sitä takaisin. Testauslinkit (CLAUDE.md, README) osoittavat nyt uuteen repoon. Koko historia (myös 32 aiemmin pushaamatonta committia) siirretään git bundle -tiedostona, koska samannimistä repoa ei voinut liittää samaan Claude-sessioon.

## 2026-10-12 (sessio 34)
- **Otteen puristus:** sormen nivelen keskilinja saa olla puoli sormen sädettä kahvan pinnan sisällä (`GRIP_SQUEEZE` 0,5), nivelten maksimit 1,7 / 1,7 / 1,5, ja peukalon tyvi on täysin nyrkkiasennossa. Syy: kolmesta kuvatusta vaihtoehdosta tämä näytti tiukimmalta luonnottomuuksitta.
- **Kahvan mittaus kolmioiden reunoista**, jos otekohdalla on alle 6 verteksiä. Syy: soihdun varressa on vain päätyrenkaat, joten mittaus antoi oletusarvon.
- **Liekki on oma shaderi kahdella ristikkäisellä tasoparilla**, jotka suunnataan maailman suunnassa ja käännetään kameraa kohti (ei partikkelijärjestelmä). Syy: kevyt (4 tasoa ja enintään 40 kipinää) ja tarkka hallinta. Suunta on jousi kohti vektoria noste + ilmavirta, ja kärjen hitaampi suunta tuottaa taipuman (`uBend`).
- **Otteen kierto rajattu (ROLL_MAX 0,3 ja kalliimpi, hitaampi jousi) ja iskujen kärkiasentoja loivennettu** (kallistus yli 0,9 rad × 0,78, kääntö × 0,8) nuijalla ja terillä. Syy: mittaus näytti, että ranne oli iskussa kaikissa rajoissa yhtä aikaa ja kierto heilui ±0,6 rad.

## 2026-10-09 (sessio 33)
- **Käyttäjän nuija ja soihtu muunnetaan valmiiksi pelin dataksi** (`src/models/data/userItems.js`: geometria kvantisoituna base64-muodossa; tekstuurit WebP-kuvina `assets/models/items/`). Syy: esinemallit tarvitaan heti käynnistyksessä (kuvakkeet, maassa olevat esineet), joten GLB:n asynkronista latausta ei voi odottaa. Verteksivärit näytteistetään tekstuurista, ja kuvakkeet ja varalla olevat piirrot käyttävät niitä. Kädessä ja maassa esineellä on omat tekstuurimateriaalinsa (`geo.userData.material`).
- **glTF-tekstuureille `flipY = false`.** Syy: GLB:n UV-suunta; ilman sitä tekstuurit menivät väärin päin (testikuvassa näkyi).
- **Ihotekstuuri: ShareTextures Human Skin 2.** Poly Havenissa ja ambientCG:ssä ei ole ihmisen ihoa. ShareTexturesin lisenssi on CC0-pohjainen: käyttö peleissä ja muokkaus ovat sallittuja, mutta tiedostoja ei saa jakaa sellaisenaan muualla. Ihoa käytetään toistuvana pintakuviona (normaali, AO ja karheus, 1024 px, toisto 4 käden UV-alueella), ei värinä, joten käden oma ihonväri säilyy ja sävyä voi yhä vaihtaa.
- **Kivipuukon terä on piikiveä eikä terästä.** Syy: esine on "Kivipuukko". Kiilto syntyy lakkakerroksesta (clearcoat), matalasta karheudesta ja pienestä, piirretystä ympäristökartasta, joka on vain terän materiaalissa, joten muu kuva ei muutu.
- **Norsun jano:** jano kasvaa 1/150 s:ssa. Vettä etsitään 16 suunnasta 50 m:iin asti, tavoite on rannassa ja katse veteen. Jos vettä ei löydy, haku yritetään myöhemmin uudelleen.

## 2026-10-09 (sessio 32)
- **Nuija käyttää moukarin murskausiskuja (`smash`)** eikä omia uusia animaatioita. Syy: ylhäältä alas iskevät avainasennot olivat jo olemassa ja testattuja. Sivupyyhkäisy (`smash3`) ja kirveen vaakahakkuu (`swingE`) jäivät koodiin, mutta ne eivät ole enää vuorossa.
- **Nyrkin peukalo: mallin nyrkkiasennon peukalon kärkinivelet puolitetaan** (tyvi ennallaan; kerroin 1 / 0,6 / 0,5). Syy: kolmesta kuvatusta vaihtoehdosta tämä asetti peukalon etu- ja keskisormen päälle; suurempi ojennus sojotti peukaloa eteenpäin.
- **Lastut ovat yksi instanssiverkko (enintään 700 hiutaletta).** Syy: satoja pieniä hiutaleita ilman piirtokutsujen kasvua; vanhimmat korvautuvat, jos raja täyttyy. Kiviin osuessa lastuja ei tehdä (käyttäjän toive).
- **Norsun polven lepokorjaus mitataan mallin pinnasta** (reiden ja säären keskilinjat korkeuksilla 0,33 → 0,22 ja 0,19 → 0,09), 85 % mutkasta suoristetaan. Jalkoihin lisättiin nilkka, ja IK:n kohde on nilkka. Syy: suoristus kallistaisi muuten jalkapohjaa, ja nilkka pitää sen vaakatasossa.

## 2026-10-08 (sessio 31)
- **Norsun luuranko rakennetaan latauksessa, ei käsin.** Syy: mallissa (yksi staattinen verkko) ei ole luita, eikä ympäristössä ole Blenderiä. Jalat erotellaan ryhmittelemällä maahan koskevat verteksit (k-means, 4 ryhmää, kauimmaisen pisteen alustus) ja täyttämällä pintaa pitkin lantiokorkeudelle. Kärsä tunnistetaan sijainnista (laatikko pään edessä) ja syöksyhampaat tekstuurin norsunluunvärisistä kohdista. Painot riippuvat etäisyydestä jalan akseliin, jotta vatsan iho ei seuraa jalkaa.
- **Norsun jalat ovat "suoria pylväitä" ja runko keinuu.** Syy: tavallinen kahden luun IK taivutti polvia rajusti, koska malli on askeleen keskeltä (jalkojen lepokulmat eroavat) ja lähes suorat jalat ovat herkkiä pituuseroille. Nyt jalka pidetään tukivaiheessa lähes lepopituudessaan, ja runko nousee ja laskee (etu- ja takapää erikseen) niin, että tukijalat ylettävät maahan. Polvi koukistuu vain jalan noustessa.
- **Norsun origo siirretään jalkojen puoliväliin, ja törmäys on jana takaa eteen.** Syy: mallin keskipiste oli pään puolella. Jana on `world.extraColliders`-listassa, joten pelaajan nykyinen törmäyskoodi tönäisee pelaajaa ilman muutoksia. Osumille (lyönnit, nuolet, nimilappu) on `bodyPoint`, joka antaa rungon keskilinjan lähimmän pisteen.
- **Norsu ei kuole eikä pudota saalista.** Syy: käyttäjä pyysi rauhallista NPC:tä eikä puhunut metsästämisestä; asia on avoin kysymys (DESIGN).
- **Haamun viitta: muotojousi, rajattu poikkeama, taivutusrajoitteet ja liikkeen kanto (60 %).** Syy: pelkät pituusrajoitteet antoivat kankaan laahata ja laskostua vapaasti, joten nopeassa sivuttaisliikkeessä helma painui kasaan. Hihat ovat erillisiä kangasputkia (10 × 6) käsivarren ympärillä. Ylös nostetussa kädessä hihan pystyrajoitteet sallivat kasautumisen, jotta kangas valuu olkaa kohti.

## 2026-10-08 (sessio 30)
- **Ote "socket"-periaatteella (käyttäjän ehdotus):** kahvan kohta mitataan esineen mallista (keskipiste ja säde 3 cm:n viipaleesta otteen kohdalla). Käsi asettuu siihen, ja käsivarsi seuraa IK:lla. Erillisiä socket-pisteitä ei kirjoitettu käsin jokaiselle esineelle. Syy: kymmenille esineille, myös tuleville, sama mittaus toimii automaattisesti.
- **Sormet ratkaistaan geometrisesti** eikä valmiista asennoista: jokainen nivel koukistuu, kunnes seuraava nivel, jänteen keskikohta tai sormenpää koskettaa kahvaa (sormen säde 8,5 mm, peukalon 10,5 mm). Tulos lasketaan kerran kahvan paksuutta kohti ja tallennetaan välimuistiin. Syy: kivääriasennosta kopioidut sormet menivät solmuun ja kahvan läpi.
- **Käden materiaali kaksipuolinen.** Syy: jyrkästi taipuvissa nivelissä ihon kolmiot kääntyvät nurin, jolloin näkyi reikiä.
- **Jousen kahvassa käsi 4,8 cm nuolen alapuolella.** Syy: nuoli lepää käden päällä kuten oikeassa jousiammunnassa.
- **Murskattujen palojen alkuperäiset normaalit säilytetään, ja rungon palat suljetaan.** Syy: uudelleen lasketut normaalit tekivät paloista särmikkäitä, ja avoimet kuoret näyttivät ontoilta.

## 2026-10-08 (sessio 29)
- **Käsimalli muunnettiin FBX:stä GLB:ksi** (`assets/models/arms/arms.glb`, 1,4 Mt; kolmiot ennallaan, kaksoisverteksit yhdistetty). Luiden lepokierrot nollattiin ja yksiköt muutettiin metreiksi, ja mallin valmiit asennot (nyrkki, kivääriote ym.) tallennettiin GLB:hen. Syy: pelissä on valmiina GLTF-lataaja, eikä FBX-lataajaa tarvita pelissä. Nollatut lepokierrot yksinkertaistavat IK:n.
- **Tekstuurit 1024 px WebP-kuvina** (yhteensä n. 160 kt). Karheuskartta skaalattiin välille 0,6–0,8 (alkuperäinen n. 0,4 näytti muovilta). Syy: pieni lataus ja vähän muistia, iho mattapintaiseksi käyttäjän toiveen mukaan.
- **Käyttäjän tekstuuri sellaisenaan (vaalea iho)**, vaikka aiempi paikkamerkki oli tumma iho. Syy: käyttäjä antoi mallin ja tekstuurit itse; sävyn voi muuttaa myöhemmin.
- **Kädet ohjataan käänteiskinematiikalla nykyisistä animaatioista:** animaatio antaa otteen (kahvan paikan ja suunnan). Ratkaisija sijoittaa kyynärpään, joustaa olkapäästä (enintään n. 22 cm, ei koskaan kameran eteen) ja siirtää kättä vähän (enintään n. 14 cm, ei kameraa kohti). Lisäksi se kiertää kättä kahvan ympäri (enintään n. 40°) ja rajaa ranteen. Jos animaatio vaatisi liikaa, esine kääntyy käden mukana. Syy: vanhat avainkehykset oli tehty irralliselle nyrkille (ranne taipuisi jopa 180°). Näin iskut pysyvät näkyvissä ja käsi luontevana.
- **Pehmeys jousella, ei pelkillä avainkehyksillä:** asento kulkee jousen läpi (sijainti 5,2 Hz, kierto 4,2 Hz, iskun ympärillä 1,55× kireämpi), ja avainkehyksiä katsotaan 45 ms eteenpäin, jotta osuma osuu kohdalleen. Syy: kaikki siirtymät (isku, ketjutus, torjunta, keskeytys) pehmenevät samalla tavalla.
- **Iskujen kesto +35 % ja osuma +12 % myöhemmin, kierto ennallaan** (`combat.js`: palautus vähennetään jäähdytyksestä, myös hakkuussa). Aika venytetään niin, että animaation lyöntikehys osuu uuteen osumahetkeen. Syy: käyttäjä halusi hitaammat ja pehmeämmät animaatiot, mutta taistelun tasapaino haluttiin pitää ennallaan.
- **Vanha proseduraalinen käsi jää varalle**, kunnes malli on ladattu (tai jos lataus epäonnistuu).

## 2026-10-08 (sessio 28)
- **Haamun viitta luodaan joka olennolle erikseen (mobs.js: instantiate).** Syy: mallipohjan kopio jakoi viitan geometrian, jota kukaan ei päivittänyt (vartalo näkymätön).
- **Kitin jpg-tekstuurit toistuvat (RepeatWrapping); lahopuun kuori 1 toisto / ~1 m.** Syy: lahopuun UV kiertää rungon pituudella 11–13 kertaa; ilman toistoa reunan pikselit venyivät raidoiksi.
- **Lahopuun kuoreksi Poly Havenin bark_willow_02 haalistettuna** (72 % harmaaksi, vaalennus). Syy: uurteinen, haalistunut kuori sopii kuolleeseen puuhun; Quaterniuksen sileä kuori ei toiminut.
- **Bambu omana mallinaan nivelineen (ei tekstuuria).** Poly Havenissa ei ole bambun varsitekstuuria; vertex-väreillä saa nivelet, vahavyön ja värivaihtelun. Kaukoversio (HAS_FAR) pitää kolmiomäärän kohtuullisena.
- **Rungon normaalit lovien jälkeen pehmeinä (samassa kohdassa olevien verteksien kolmioiden summa).** Syy: tasaiset kolmionormaalit näyttivät pilkotussa rungossa särmikkäiltä.
- **Selkeän sään sumun alku 12 % -> ~32 % näköetäisyydestä** (sademetsässä vähemmän muutosta). Syy: käyttäjä halusi hieman vähemmän sumua; kauko-utu säilyy ja peittää maailman reunan.

## 2026-10-08 (sessio 27)
- **Liaanit ovat oma järjestelmänsä (render/vines.js), ei osa puun geometriaa.** Puumalli kertoo vain kiinnityskohdat (`userData.vines`). Köydet luodaan 46 m:n säteellä, simuloidaan 26 m:n säteellä (Verlet, 11 pistettä, 6 rajoitekierrosta) ja piirretään yhtenä dynaamisena verkkona (enintään 260 köyttä). Syy: fysiikka (tuuli, pelaaja, kaatuminen) vaatii köydet erikseen; yksi verkko on kevyt piirtää.
- **Kaatuvan latvuksen lehtien liike jousena prosessorilla** (vain kaatuessa ja hetken sen jälkeen). Syy: yksi tai kaksi kaatuvaa puuta kerrallaan; varjostimen muutos olisi vaatinut materiaalikopion.
- **Kookokset erillisinä instansseina, tila pelin kellosta** (`day × 24 + time`). Syy: pähkinät voivat kadota ja kasvaa yksitellen ilman puumallien muutoksia; tila on pieni (vain otetut tallennetaan).
- **Kookoksia myös sademetsän ja keitaan palmuissa.** Syy: käyttäjä puhui palmuista yleisesti.
- **Poly Havenin puita ei käytetty:** island_tree_01 on 3,7 milj. kolmiota, jacaranda 312 000, ja lehdet ovat geometriaa (eivät keventyisi). Sademetsän puut paranneltiin itse (ryppäät oksien kärjissä).
- **Haamun viitta on kangassimulaatio (16 × 11 pistettä) maailman koordinaateissa.** Syy: viitta laahaa ja lepattaa luonnollisesti haamun liikkeiden mukaan; haamuja on vähän kerrallaan.
- **Lahopuu (kitin malli) saa puun tiedot mallin muodosta;** halkaisu säilyttää kitin varjostuksen (aAO) ja materiaalin. Syy: sama kaato- ja pilkontalogiikka kuin muilla puilla.
- **Lammikot paikallisiin kuoppiin:** verkon 5 × 5 -naapuruston minimi, vedenpinta kuopan reunan (säde 1,9–3,6 m) matalimmasta kohdasta. Syy: vesi ei koskaan leiju eikä reuna jää ilmaan.
- **Leijuvat pisteet:** atlaksen tummat varret poistettiin pysyvästi tekstuurista; peittävyyden vahvistus vain ≥ 64 px:n mipmap-tasoilla (enintään 1,6×); lehtimateriaaleissa alpha to coverage.
- **Silmän mukautuminen:** taivaan paino 0,15 → 0,4, voimakkuus 0,6 → 0,82, pimeään τ 1,1 → 1,7 s, yön yläraja 1,9 (päivällä 2,8). Syy: käyttäjä ei huomannut efektiä; selkeä yö hieman tummemmaksi.

## 2026-10-08 (sessio 26)
- **Latvukset pelkistä lehtikorteista (ei ydintä).** Syy: käyttäjän toive; ydin näkyi alta rumana. Peittävyys korvattiin tiheämmillä korteilla (lähellä tiheys 1,75, ennen 1,3; kaukana isommat kortit), joista osa latvuksen alapinnalla.
- **Valokeilat varjokartasta (volumetrinen säteenseuranta jälkikäsittelyssä), puolikkaalla resoluutiolla, 28 näytettä enintään 50 m matkalla.** Syy: ruudun tason "god rays" näkyy vain aurinkoa kohti katsottaessa; varjokartta antaa keilat oikeista latvuston aukoista. Täysin valaistua ilmaa vaimennetaan, jotta keilat korostuvat eikä synny tasaista utua. Kytkeytyy Valonsäteet-asetukseen ja vaatii varjot.
- **Alfatestattujen tekstuurien mipmapit lasketaan itse latauksessa** (läpinäkyvien reunojen väritäyttö ja peittävyyden säilytys). Syy: leijuvien pikselien todellinen syy; ratkaisu ei vaadi muutoksia varjostimiin ja koskee kaikkia lehtiä, ruohoa ja kukkia.
- **Palmut ja banaanit tehtiin itse geometriana (ei ladattuja malleja).** Syy: Poly Havenissa ei ole palmuja, Quaterniuksen paketit eivät lataudu suoraan, ja Kenneyn palmut ovat matalapolygonisia. Sulkalehti lehdyköineen (~3 400–3 800 kolmiota lähellä, ~450–600 kaukana) sopii nykyiseen vertex-väri- ja lehtimateriaaliin.
- **Simpukat poimittavina omana tyyppinään; rantakivistä simpukat poistettiin.** Syy: ettei koristesimpukoita sekoiteta poimittaviin. Uusi esine `seashell` on toistaiseksi materiaali (käyttö avoin).
- **Jalanjälki on korkeuskartasta laskettu normaalikartta, jonka valaistus kerrotaan maan väriin.** Syy: oikea 3D-kuoppa vaatisi maaston muokkaamista; tämä säilyttää hiekan värin ja tekstuurin ja näyttää painaumalta myös sivusta.
- **Suorituskyky mitattiin samassa paikassa sademetsässä session 25 versioon verraten** (ohjelmistorenderöinti, 640 × 360): ensimmäinen versio oli ~19 % hitaampi. Syyt: simpukkakasa 6 800 kolmiota, banaani 3 700, palmut 4 400–5 200, tiheikön ja latvusten kortit. Kevennettiin (simpukat maassa harvemmalla verkolla, lehdykät 21–22 per puoli, banaanin lehdissä 7 pätkää, latvusten tiheys 1,75, tiheikön 2,4). Valokeilojen passi ei näkynyt mittauksessa.
- **Musiikin logiikka todettiin toimivaksi testissä (aavikon kappale alkaa ~3 s:ssa).** Varmuudeksi uudelleenyritys, varakappale puuttuvalle tiedostolle ja lyhyempi pitoaika. Aavikon hiljaisuus johtui osin tarkoituksella hiljaisesta tuulesta, jota voimistettiin.

## 2026-10-08 (sessio 25)
- **Silmän mukautuminen mitataan kuvasta näytönohjaimella** (16 × 9 näytettä, ajallinen sopeutuminen 1 × 1 -tekstuurissa, ei lukua takaisin prosessorille). Syy: toimii kaikissa paikoissa (latvuston alla, soihdun valossa, nuotiolla) ilman erikoistapauksia eikä pysäytä ruudunpäivitystä. Keskiarvo painottuu kirkkaisiin kohtiin, jotta soihtu sokaisee; taivas painaa vähän, jotta maasto erottuu iltataivasta vasten.
- **Sopeutumisaika: pimeään τ ≈ 1,1 s (noin 3 s lähes valmis), kirkkaaseen τ ≈ 0,4 s.** Syy: käyttäjän toive 2–4 s; kirkkaaseen silmä tottuu nopeammin.
- **Silmän mukautuminen on aina päällä** (jälkikäsittely ajetaan aina). Syy: yön valotus perustuu siihen; ilman sitä yö olisi joko liian kirkas tai liian pimeä.
- **Huono sää yöllä: sääsävy säilyttää värin kirkkauden ja pilvisyys pimentää.** Syy: ennen harmaa sävy sekoitettiin yön tummiin väreihin, mikä kirkasti yötä.
- **Lehtien läpikuultavuus on yksinkertainen lisävalo (vastavalo + varjopuolen läpäisy), ei oikea pinnanalainen sironta.** Syy: halpa kaikille lehtikorteille; antaa vihreän sävyn latvusten alapuolelle.
- **Puun sirpaleet säilyttävät UV:n ja käyttävät lehtimateriaalia; hakattava puu käyttää samaa latvusta kuin metsässä seisova.** Syy: ennen sirpaleet piirrettiin pelkillä vertex-väreillä (lehtikortit umpinaisina) ja hakattavan puun tarkempi latvus paljasti ytimen.
- **Jalanjäljet kertovalla sekoituksella.** Syy: tummentaa maata sen omassa valaistuksessa (toimii myös yöllä ja varjossa) eikä tarvitse maan väriä.
- **Iskujen muunnelmat valitaan viewmodelissa** (vuorotellen, välillä yksi yli). Syy: taistelun ajoitukset ja vahingot pysyvät ennallaan; osumahetki on kaikissa muunnelmissa sama.
- **Kuun kuva 128 px ilman mipmappeja.** Syy: kiekko on ruudulla vain ~30–50 px; pieni kuva on kevyt.

## 2026-10-08 (sessio 24)
- **Maaston pehmennys: terävät taitteet (abs) korvattiin pehmeillä (sabs = √(v² + k²) − k), jokiuomien leikkaus pehmeällä minimillä (smin), ja verkkoa tihennettiin (48 segmenttiä / chunk, 1,33 m).** Syy: käyttäjän tärkein toive; harjanteiden ja dyynien V-taitteet ja uomien reunat näkyivät kulmikkaina. Generointi pysyi säikeessä (~20–30 ms / chunk).
- **Tiheä ruoho omana järjestelmänään (kortit + instanssit), ei valmiina 3D-ruohomalleina.** Syy: Quaterniuksen ruohomallit ovat 155–622 kolmiota tupsua kohti; kymmeniätuhansia tupsuja tarvitaan, joten tupsu on kolme ristikkäistä korttia (12 kolmiota). Tupsut lasketaan generointisäikeessä chunkin verkosta (korkeus tarkalleen piirretyltä pinnalta) ja piirretään osaruuduittain (32 m), vain ~46 m säteellä; kaukana tupsut painuvat maahan.
- **Ruohoatlas datakanavina (sävy, korkeus, tunniste) ja värit instanssilta.** Syy: sama atlas kelpaa kuivalle savannille, rehevälle keitaalle ja vuoristonurmelle; biomien värit ja kuolleiden korsien osuus säädetään koodissa (`world/groundCover.js`).
- **Metsänpohjan tiheys korteilla (saniaisryhmä, lehväkasvi, apilamatto, lehtiyrtti), jotka koottiin Quaterniuksen lehtiatlaksen kuvista.** Syy: tiheä aluskasvillisuus 3D-malleina olisi ollut ~1 milj. kolmiota; kortit ovat kevyitä, ja oikeat 3D-mallit (saniainen, lehväkasvit, sienet, kukat) näytetään harvempina "pääkasveina" lähellä.
- **Valmiit mallit: Quaternius Stylized Nature MegaKit (CC0).** Syy: tyyli (stilisoitu realismi) sopii pyyntöön, lisenssi on vapaa, ja mallit ovat kevyitä. Sketchfabin lataukset vaatisivat käyttäjän API-avaimen, joten niitä ei käytetty.
- **Kitin mallit upotetaan JS-moduuliksi kuten skannatut lohkareet; materiaalit ryhmittäin (`geometry.groups`).** Syy: mallikirjasto on synkroninen; yksi malli voi käyttää kahta tekstuuria (lehdet + kukat).
- **Kuolleet puut kevennettiin sijainnin mukaan hitsaten (6 000 → 1 600 kolmiota, kaukomalli 400).** Syy: tavallinen kevennys ei edennyt oksien UV-saumojen takia.
- **Koriste-esineet sijoitetaan chunkin verkon kärjistä (ei omaa maastonäytettä).** Syy: maanpeitteen tyypit moninkertaistivat koristeiden määrän; generointi nopeutui jopa entisestä.
- **Tiheät aluskasvit näytetään vain ~44 m säteellä ja lisätään/poistetaan pelaajan liikkuessa (`decorDist`).** Syy: piirtotyö pysyy kohtuullisena; reunalla kasvit painuvat maahan, joten ne eivät ilmesty äkkiä.
- **Vanhat ruohotupsut jäivät tyyppilistaan (`retired`).** Syy: tyyppien järjestys määrää esineiden siemenet; poistaminen olisi siirtänyt puita ja sotkenut tallennetut kaadot.
- **Korkeussumu jälkikäsittelyssä syvyyspuskurin avulla (analyyttinen eksponentiaalinen tiheys).** Syy: yksi paikka kaikille materiaaleille; usva myötäilee maata ja kerääntyy laaksoihin. Voimakkuus kosteuden, sateen ja aamun mukaan.
- **Sammal: maastossa laikuittain metsämaalla, rakenteissa yläpinnoilla (kosteus lisää).** Syy: "alimpana sammalta" ja "sammaleiset kivet"; aavikon raunioissa sammalta on vähän.
- **Rauniot sammaloituneesta kivestä (Rock064) ja harmaantuneesta puusta.** Syy: rakenteiden pitää näyttää vanhoilta ja kuluneilta.
- **Liaanit ja köynnökset tehtiin itse (puiden malleihin).** Syy: valmiit köynnösmallit eivät asetu proseduraalisiin puihin; omat liaanit seuraavat oksia ja kaatuvat puun mukana.

## 2026-10-08 (sessio 23)
- **Lähteet: ambientCG (tekstuurit) ja Poly Haven (mallit), molemmat CC0.** Syy: korkea laatu, ei mainintavelvoitetta; lähteet silti assets/CREDITS.txt:ssä.
- **Tekstuuri antaa yksityiskohdat, vertex-väri sävyn** (tekstuuri / sen keskiväri). Syy: biomien taiteellinen väritys säilyy, ja yksi tekstuuri kelpaa monelle biomille (esim. kuiva maa savannilla ja punaisella lateriitilla).
- **Kolmitasoprojektio mallin omissa koordinaateissa** (ei UV:ta). Syy: proseduraalisilla malleilla ei ole UV-koordinaatteja; mallin koordinaateissa tekstuuri ei liu'u kaatuvassa puussa.
- **Skannatut mallit kevennetään (gltf-transform + meshoptimizer) ja upotetaan JS-moduuliksi.** Syy: Poly Havenin mallit ovat 60 000–4,7 milj. kolmiota; mallikirjasto rakennetaan synkronisesti, joten geometria upotetaan (tekstuurit ladataan erikseen).
- **Lehvästö = lehtikortit + pienempi ydin, yksi lehtiatlas.** Syy: koko puun korvaaminen valmiilla mallilla ei sovi (akasiaa ja baobabia ei ole CC0-malleina, ja hakkaus, kaato ja tuuli toimivat omilla malleilla). Rungot käyttävät atlaksen valkoista nurkkaa, joten yksi materiaali riittää; alphaTest pitää varjot oikean muotoisina.
- **Puiden lehtikortit ennen valmiita Poly Havenin puita.** Syy: Poly Havenin puut (1,7–4,7 milj. kolmiota) ovat liian raskaita sadoiksi instansseiksi.

## 2026-10-08 (sessio 22)
- **Metallit ja rubiini vain kehittäjätyökaluista** (käyttäjän valinta), reseptit valmiina työstöpenkillä. Syy: hankintatapaa (malmit, sulatus, paja) ei ole päätetty.
- **Baobab: kuorinta + ytimen kaato** (käyttäjän kuvaus). Toteutus: baobab on nyt puu (kind tree), jonka hakattava malli on rakennettu lieriöpaloista kaatokohdan renkaineen; kuorinta muuttaa rungon muotoa ja väriä samoista lähtötiedoista kuin lovet.
- **Taso ja teho erikseen:** `tier` ratkaisee, mitä voi hakata (minTier), `power` kuinka nopeasti, `wmul` aseen vahingon. Syy: sama kenttä ei sovi sekä vaatimukseksi että nopeudeksi.
- **Tasojen variaatiot** (ei kuparitikaria, moukari vain kuparista, ei rubiininuijaa jne.). Syy: käyttäjä toivoi epäennustettavuutta.
- **Panssarin vähennys a / (a + 30).** Syy: kasvaa tasaisesti mutta ei koskaan 100 %:iin.
- **Rubiinin voima: elinvoiman imu (12 %) ja otsarivan paraneminen.** Syy: "yliluonnollinen" tuntuu, mutta ei riko tasapainoa; helppo muuttaa (paikkamerkki).
- **Vanhat tunnisteet säilytettiin** (esim. `spear` = Piikivikeihäs, `machete` = rautataso), jotta tallennukset toimivat. Poistetut esineet putoavat tallennuksesta pois latauksessa.
- **Kukat ja simpukat jäivät koristeiksi** (tyyppi ennallaan). Syy: maailman sijainnit eivät muutu.

## 2026-10-08 (sessio 21)
- **Hyppyisku on erillinen isku (`leap`), ei kerroin.** Syy: sille tarvitaan oma animaatio (kaksi kättä, ylhäältä) ja oma vahinko aseittain; vain aseilla, joilla on `leap` (kirves, nuija). Alkaa, kun isku aloitetaan ilmassa, joten pelkkä alastulo ei riitä.
- **Kriittisyys kerrotaan efekteillä, ei tekstillä** (rengas, kipinät, jysähdys, pysäys). Syy: käyttäjä on poistanut taistelutekstit (sessio 18) ja toivoi parryyn samaa.
- **Taintuminen = tähdet pään ympärillä + huojunta.** Syy: tunnistettava merkki ilman tekstiä; tähdet vain parryn jälkeen (`vulnerable`), tavallinen horjahdus ei.
- **Kuun vaihe hajautusfunktiosta (yö + maailman siemen), ei tallenneta.** Syy: satunnainen mutta pysyy samana koko yön ja latauksen jälkeen; ei uutta tallennuskenttää. Yö vaihtuu keskipäivällä, jolloin kuu on horisontin alla.
- **Kuun reunan korjaus: kiekko ja valaistus samasta säteestä, ja valon rajaa siirretään vaiheen mukaan.** Syy: kiekon pehmeä reuna ulottui valaistun pallon ulkopuolelle (harmaa kehä), ja täysikuun reuna oli tarkalleen valon rajalla.
- **Kello minikartan vasemmalle puolelle (ei kartan kehyksen sisään).** Syy: käyttäjä ei halunnut sen menevän kartan päälle.
- **Keularoiskeet tapahtumina (`bowSpray`) jälkikäsittelyssä, enintään 4 yhtä aikaa.** Syy: roiskeen pitää syntyä juuri keulan iskusta ja vain eteenpäin katsottaessa; varjostin piirtää pisarat ilman tekstuureja.
- **Esineiden katoamisaika tallennetaan.** Syy: muuten tallennus ja lataus nollaisi ajan, eikä mikään katoaisi.

## 2026-10-08 (sessio 20)
- **Valkoisen maailman syy: rinnakkaiset lataukset.** Jokainen siirto käynnisti oman latauksensa, ja ne siirsivät maailman keskipistettä vuorotellen eri paikkoihin (lohkoja ladattiin ja poistettiin ristiin, eikä mikään lataus valmistunut). Nyt vain uusin lataus on voimassa (`buildGen`), vanhemmat lopettavat.
- **Pinon jako Ctrl + hiiren oikealla ikkunassa, hiiren oikea = syö / varusta** (käyttäjän valinta).
- **Klikkaus ottaa ja laskee, raahaus toimii myös.** Syy: käyttäjä halusi Minecraftin tavan; raahaus säilyy, koska se ei haittaa.
- **Toiseen käteen varustettu pino ei ole pääkädessä** (pikapaikka näyttää tyhjää kättä). Syy: sama soihtu ei voi olla molemmissa käsissä; yksinkertainen sääntö.
- **Kello vain repussa (ei tarvitse olla kädessä).** Syy: käyttäjän valinta "kellotaulu kartan reunassa".
- **Soihtu ja nuotio pysyvät 5 kpl pinoina.** Syy: ne eivät ole materiaaleja.
- **Yöhiljaisuus päivänvalon rajoilla (hystereesi).** Syy: musiikki ei saa vaihdella hämärässä edestakaisin.

## 2026-10-08 (sessio 19)
- **Repun ja valmistuksen ratkaisut kysyttiin käyttäjältä** (raahaus, varusteet repussa, valmistus omana ikkunana, vain paikan reseptit, valitse + Valmista, 6 pikapaikkaa, panssari kilpi-ikonina, hienompi minikartan kehys).
- **Reppu 30 paikkaa (ennen 24).** Syy: pikapalkki pieneni 8 → 6, ja vanhojen tallennusten kaikki esineet mahtuvat; 6 sarakkeen ruudukko on yhtenäinen pikapalkin kanssa.
- **Hiiren oikea klikkaus = käytä / varusta, oikealla raahaus = jaa pino.** Syy: sekä jako että käyttö haluttiin samalle painikkeelle; liike erottaa ne.
- **Varustettu esine merkitään vihreällä pisteellä** (ei erillisiä varustepaikkoja). Syy: käyttäjä halusi varustaa repusta.
- **Repusta ulos raahaaminen pudottaa pinon.** Syy: tavallinen tapa peleissä; nopea tapa tyhjentää reppua.
- **Viholliset: kiertäminen ja perääntyminen uusina tiloina** (`circle`, `retreat`), savipeikoilla vuorottelu. Syy: käyttäjän esimerkit; vuorottelu estää peikkoja kasautumasta yhteen kohtaan.
- **Kasvien murskaus vain pensaille ja pienille kasveille**, ei kiville eikä irtotavaralle. Syy: käyttäjä puhui kasveista.

## 2026-10-07 (sessio 18)
- **Soihdun "sammuminen" sateessa oli näköharha:** mikään ei sammuttanut sitä, mutta notkahdus kutisti liekin n. 13 %:iin ja valon lähes pois. Sateen vaikutusta lievennettiin ja liekin vähimmäiskoko nostettiin.
- **Kestävyyden kulutus pieneni n. 12–15 %** (käyttäjä: "hitusen").
- **Paraneminen: 30 s nopeaa syömisen jälkeen, muuten 1/4** (käyttäjän valinta).
- **Kirves ja nuija saivat 2 iskun sarjan, viidakkoveitsi n. 0,45 s iskuväli** (käyttäjän valinnat). Sarja vaatii yhä yli puolet kestävyydestä.
- **Puu ilman kirvestä: 1 % vahingosta, ei tekstiä; kivi ilman hakkua: ei vahinkoa, kehote "Liian kovaa!"** (käyttäjän valinta).
- **Tekstit korvattiin palautteella:** kestävyyden loppuminen → punainen hehku; torjunta → välähdys (oli jo).
- **Jousen jännitys n. 50 % hitaammaksi.** Syy: käyttäjästä liian nopea; mitoitus Clauden.
- **Nimilappu vaatii tarkan osuman** (säde vs. kapseli) ja näköyhteyden. Syy: käyttäjä halusi lapun vasta kun "oikeen kunnolla katsoo".

## 2026-10-07 (sessio 17)
- **Puukuvat (`ui/woodArt.js`) poistettiin kokonaan.** Syy: käyttäjä halusi puun pois; käyttämätön koodi poistetaan.
- **Katsottu olento valitaan ruudun keskeltä näennäisen koon mukaan** (ei vain lähitaisteluetäisyyden säteellä). Syy: lappu näkyy myös parin kymmenen askeleen päässä katsottaessa, mutta ei sivusilmällä.
- **Lyödyn olennon lappu näkyy 5 s.** Syy: taistelussa (esim. jousella) on hyödyllistä nähdä vihollisen kestävyys, vaikka tähtäin heiluu.
- **Nuolilaskuri näyttää kaikki nuolet yhteensä.** Syy: käyttäjä kysyi, montako nuolta on jäljellä; jousi käyttää parhaan ensin.
- **Musiikin äänenvoimakkuus tarkistetaan äärelliseksi.** Syy: testissä ei-äärellinen arvo heitti virheen joka ruudussa ja pysäytti pelisilmukan (syy jäi epäselväksi; esiintyi kerran).

## 2026-10-07 (sessio 16)
- **Fontit vertailukuvina pelin käyttöliittymän päällä** (ensin 4 tavallista, sitten 6 omaperäisempää), käyttäjä valitsi Philosopherin. Fontit haetaan npm:n @fontsource-paketeista ja kopioidaan `assets/fonts`-kansioon (OFL-lisenssi mukana). Syy: peli toimii ilman verkkoyhteyttä.
- **Logo jää Eagle Lakeksi.** Syy: käyttäjä piti logon fontista alun perin; ongelma oli käyttöliittymän tekstit.
- **Animaatiot Web Animations API:lla ja CSS-siirtymillä, arvot eksponentiaalisella pehmennyksellä.** Syy: ei kirjastoja; pehmennys toimii ruudunpäivitysnopeudesta riippumatta.
- **Välke vasta viimeisellä minuutilla** (hiipuminen alkaa jo 35 %:ssa). Syy: pitkillä ruoilla 35 % on useita minuutteja, ja jatkuva välke häiritsisi.

## 2026-10-07 (sessio 15)
- **Vaihtoehdot näytettiin yhtenä vertailukuvana pelin taustan päällä** (A/B/C), ja käyttäjä valitsi yhdellä vastauksella. Syy: käyttäjä ei halunnut kierrättää edestakaisin.
- **Terveysnumero näkyy aina himmeänä** (kirkastuu muuttuessa), vaikka sessiossa 14 sovittiin "vain kun muuttuu". Syy: valitussa mallikuvassa numero oli paneelissa näkyvissä, ja tyhjä kohta paneelissa näyttäisi keskeneräiseltä. Helppo muuttaa.
- **Ruoat rivissä paneelin yläpuolella** (sessio 14: pystyssä palkkien vieressä). Syy: näin valitussa mallikuvassa; vaakapaneelin kanssa rivi on luontevampi.
- **Puukuvat (`woodPanel`) piirretään koodilla korkeuskartasta valaistuna.** Syy: ei kuvatiedostoja; sama tekniikka kuin sessiossa 14.

## 2026-10-07 (sessio 14)
- **Puukuvat piirretään koodilla kankaalle (`ui/woodArt.js`), valaistus korkeuskartasta.** Syy: ei kuvatiedostoja eikä ulkoisia työkaluja; korkeuskartta antaa kaiverruksille ja reunoille aidon valon ja varjon (käyttäjästä tasainen versio näytti piirretyltä).
- **Ruokapalkin 100 = kehyksen täysi korkeus; maksimin yläpuoli lukittuna.** Syy: käyttäjä hyväksyi; näkee heti, paljonko ruoka voi vielä nostaa.
- **Lähtöeväät uuteen peliin ja vanhoihin tallennuksiin.** Syy: muuten peli alkaisi 25 terveydellä ja kestävyydellä, ja esim. uinti (kestävyys) olisi heti vaarallista. Paikkamerkki; käyttäjältä kysyttävä.
- **Kuoltaessa ruoat säilyvät.** Syy: aiemminkin nälkä säilyi osittain kuolemassa; ankarampi malli (Valheim) on helppo vaihtaa.
- **Syöminen estetään vasta kun maksimiterveys on 100** (käyttäjän sanamuoto), vaikka kestävyys ei olisi täynnä.

## 2026-10-07 (sessio 13)
- **Fontti Eagle Lake yhdellä painolla (400), synteettinen lihavointi pois.** Syy: käyttäjä halusi kaiken tekstin logon fontilla; fontista on vain yksi paino, ja selaimen tekemä keinolihavointi näyttää sotkuiselta.
- **Olentojen nimilaput näkyvät aina lähellä (24 m), muiden kohteiden vain katsottaessa.** Syy: käyttäjä halusi nimen kohteeseen; jos jokaisella puulla ja pensaalla olisi aina lappu, ruutu täyttyisi teksteistä.
- **Nimilappu rajataan ruudun sisään.** Syy: rungon vieressä seistessä latvan kohta on ruudun yläpuolella, ja lappu katosi näkyvistä.
- **Huomattu-merkki päätellään olennon tilasta** (pakenee, jahtaa, hyökkää jne.). Syy: olennoilla ei ole erillistä "huomannut"-tietoa; tila kertoo sen luotettavasti.
- **Kaatuvan puun osumassa käytetään koko kaatuvaa pituutta latvuksineen, ja fysiikka lasketaan ala-askelin (1/60 s).** Syy: hakattava runko on lyhyempi kuin puu, eikä latva osunut mihinkään; matalalla ruudunpäivityksellä latva olisi voinut hypätä pelaajan yli.
- **Ketjukaato enintään 3 puuta peräkkäin.** Syy: tiheässä sademetsässä ketju voisi muuten kaataa koko metsän ja kuormittaa peliä.
- **Soihtu sytytetään uudelleen seisomalla nuotion vieressä.** Syy: käyttäjä ei kertonut miten; nuotio on luonteva ja jo pelissä oleva tulenlähde.
- **Kuun kierto 8 pelivuorokautta** (todellisuudessa 29,5). Syy: pelivuorokausi on 20 min, joten kaikki vaiheet näkee kohtuullisessa ajassa.
- **Lammikon korkeus lasketaan piirretyn maastoverkon kolmioista, ja epätasaiset kohdat hylätään.** Syy: analyyttinen korkeus on kuperalla maalla verkon yläpuolella, joten litteä lammikko leijui.

## 2026-10-07 (sessio 12e)
- **Linssiheijastus lasketaan jälkikäsittelyn lopussa (hehku, säteet, vaakajuova, 5 haamua auringon ja kuvan keskipisteen kautta) ja peitetään syvyyspuskurin testillä auringon kohdalta (5 näytettä).** Syy: käyttäjän toive; syvyystesti on kevyt tapa peittää heijastus puiden ja maaston takana. Voimakkuus × (1 − 0,92 × pilvet) × (1 − pöly) × kuvan reunalla häivytys. Jälkikäsittely kytkeytyy päälle, kun heijastus näkyy.
- **DOF ja linssiheijastukset oletuksena päällä keskitasolta ylöspäin; asetuksiin versionumero, jolla vanhoihin tallennettuihin asetuksiin kytketään uudet oletukset kerran.** Syy: käyttäjän toive "jo oletuksena päällä"; ilman versiota vanhat asetukset (dof: false) olisivat jääneet voimaan.
- **Linssipisarat vain kyydissä ukkosmyrskyssä, taso 0,35.** Syy: käyttäjä ei pitänyt pisaroista; ainoa sallittu tilanne on purjehdus myräkässä, "todella hillittyinä".
- **Haamu: tavallisesti 40–80 s / 33 %, ukkosella 22–40 s / 60 % (enintään 2).** Syy: käyttäjän mukaan hieman liian yleinen.
- **Väistö (ducking): taustaäänille oma väylä, jota tehosteet painavat (puu 0,5 kaatumisen ajan, isku 0,6, Haamu 0,6, puun lyönti 0,7), ja musiikki väistää samalla (vähintään 0,45).** Syy: tehosteet hukkuivat musiikin, sateen ja tuulen alle; väistö on pelien tavallinen ratkaisu, eikä yleistä tasoa tarvitse nostaa.
- **Iskuääni 0,11–0,13 (n. −26 dB huippu, huitaisua hiljempi), alipäästö 5,2 kHz, korkeus 0,9–1,12 × (raskas 0,78–1,0 ×).** Syy: käyttäjän mukaan äänet ovat rajuja ja teräviä.
- **[Shift]+[Q] heittää valitun pinon kokonaan (ei koko reppua).** Syy: tulkinta "kaikki esineet yhdellä kertaa" = koko pino kuten muissa peleissä; kysytään käyttäjältä.
- **Soihdun valo liekin kohdalla (oikea käsi), voimakkuus 1,7 × (ennen 0,75 ×), kantama 32 m ja loivempi vaimeneminen, oma monitaajuinen lepatus ja keltaisempi sävy.** Syy: käyttäjän mukaan soihdulla näki huonosti; valo vartalon keskellä varjosti kättä ja oli himmeä.
- **Soihdun isku sytyttää olennon: 5 s, 3,5 vahinkoa / s, liekit ja savu, arat pakenevat; savipeikko käyttää olemassa olevaa palamistaan; Haamu ei syty.** Syy: käyttäjän toive; Haamulla ei ole kiinteää ruumista, ja nuotion valo on jo sen vastakeino.

## 2026-10-07 (sessio 12d)
- **Puun kaatumisääni muokattiin tiedostona (ffmpeg: narina venytetty 2×, ristiinhäivytys, basso + kompressio, jälkiräsähdys pois; räsähdys 1,74 s:ssa) eikä koodissa päällekkäisillä kopioilla.** Syy: kopio katkesi tiedoston kohdassa ja kuului nykäyksenä; nyt kaatumisaika 1,5–2,2 s osuu tiedoston rajoihin ilman päällekkäisyyttä.
- **Tyrskyt lasketaan keulan ja aallon suhteellisesta nousunopeudesta (vesi nousee keulaa vasten nopeammin kuin runko ehtii nousta) ja vauhdista; roiskepooli kasvatettiin 900 → 2 400 pistettä.** Syy: tyrsky syntyy fyysisesti juuri keulan iskeytyessä aaltoon; pelkkä vauhti antoi tasaista roisketta, ja nopeuden nerfauksen jälkeen roiskeita ei olisi juuri tullut.
- **Linssipisarat tehdään jälkikäsittelyn lopussa (proseduraaliset pisarat ruudukossa, kevyt taittuminen, reunan välke), ja jälkikäsittely kytkeytyy päälle automaattisesti, kun pisaroita tarvitaan.** Syy: käyttäjän toive "satunnaisesti, kun katsoo valoa kohti"; vahva taittuminen käänsi tumman maan taivaan kohdalle ja näytti läiskiltä, joten taittuminen on hienovarainen ja pisaroita harvassa.
- **Veneiden nopeudet n. −35 %.** Syy: käyttäjän mukaan laivat olivat liian nopeita.
- **Kaarevien palmujen kaatuneelle rungolle oma akseli (`logTop`, tyvestä latvaan); kaatokohdan laskenta käyttää edelleen ensimmäistä pätkää.** Syy: kaatokohdan rengas ja lovet toimivat ennallaan, mutta osumat ja törmäys kattavat koko rungon.
- **Linnunradan rakeisuus pehmeistä himmeistä tähdistä (solu n. 2 px, satunnainen paikka solussa), kohina jatkuvista koordinaateista.** Syy: alipikselirae välkkyi ja atan-kulman hyppy teki saumaviivan.
- **Huitaisun ääni lähtee iskun alussa; olento iskun kaarella → 45 %.** Ei nyrkeillä (käyttäjä mainitsi työkalut ja aseet). Lintu vain päivällä (yöllä linnut ovat hiljaa).

## 2026-10-07 (sessio 12c)
- **Haamun äänten etäisyysvaimennus alkaa 22 m:stä (kantama 95 m), ei 8 m:stä.** Syy: haamu ilmestyy 32–52 m:n päähän, joten ilmestymisääni vaimeni n. 14 %:iin eikä käyttäjä kuullut sitä.
- **Ukkosen hämärä tehdään valotuksella (tone mapping exposure × (1 − 0,42 × paikallinen ukkonen × päivänvalo)).** Syy: koskee kaikkea (maasto, taivas, pilvet) tasaisesti, eikä vaadi materiaalimuutoksia; yöllä ei vaikutusta.
- **Haamu ukkosella: tarkistus 15–30 s, 85 %, enintään 2.** Syy: käyttäjän toive "selvästi korkeammaksi"; edelleen vain öisin sademetsässä.
- **Salaman iskukohdan hiukkaset ovat "salaman valaisemia" (ei sumua eikä sävykartoitusta), ja tulipallo on additiivinen pallo ilman valonlähdettä.** Syy: ukkosen hämärässä tavalliset hiukkaset hukkuivat maastoon; uusi valonlähde kääntäisi kaikki varjostimet uudelleen (nykäys).
- **Taustatuuli ei enää soi hiekkamyrskyssä (Clauden aiempi lisäys poistettu); tilalla käyttäjän osoittamat aavikon tuuli ja myrskytuuli.** Myrskytuuli tulee hiekkamyrskyssä puuskittain (kahden hitaan siniaallon tulo), jotta se "välillä täydentää".

## 2026-10-07 (sessio 12b)
- **Sadeverhojen säde = sumun kantama × 0,7 ja × 0,95 (väh. 35 m), ei kiinteä 26 / 70 m; usva vain, kun sade > 0,3.** Syy: läpinäkyvä pinta kiinteällä etäisyydellä näkyi teräväreunaisena "seinänä" puiden välissä; kun verho on alueella, jossa sumu jo peittää kohteet n. 75 %:sti, rajaa ei erota. Yleistä sumukäyrää ei muutettu (näköetäisyyden reunan kohteiden pitää häipyä täysin).
- **Lähisalama: 28 % iskuista 45–155 m:n päähän, välähdys 2,4 × ja HTML-kerros koko näytön välähdykselle, salama kameraan käännettynä nauhana (ydin + hehku, reunat häipyvät varjostimessa).** Syy: käyttäjän toive; WebGL piirtää viivat vain 1 px:n levyisinä, joten nauha tarvitaan näkyvyyteen. Jyrähdys lähes heti (viive ≤ 0,25 s), koska käyttäjä halusi äänen "justiin silloin"; tiedostojen alun hiljaisuus leikattiin.
- **Haamun äänet tapahtumina (`haamuSound`) olentologiikasta, ilmestymisääni myös 40 %:lla ennen syöksyä, ääntely 8–18 s välein.** Syy: käyttäjän kuvaus; tasot 0,2–0,26 (−30…−28 LUFS), "ei liian suurelle".
- **Viidakko: taso 0,36 → 0,22 ja alipäästösuodin 4,2 kHz.** Syy: käyttäjän mukaan linnut kuuluivat terävästi; suodin pehmentää korkeat äänet.
- **Puun kaatumisääni häivytetään 0,25–0,9 s räsähdyksen jälkeen.** Syy: tiedoston loppuosa (jälkiräsähdys n. 2 s myöhemmin) kuulosti siltä, että maassa makaava puu rätisee.

## 2026-10-07 (sessio 12)
- **Äänitehosteet Web Audio -verkossa (oma moduuli `audio/sfx.js`); pitkät taustaäänet soitetaan audio-elementeistä (MediaElementSource), lyhyet äänet puskureina.** Syy: purettuina taustaäänet (5 min viidakko, 2,5 min ukkonen, sade, tuuli) veisivät n. 200 Mt muistia; striimattuina ne vievät vähän. Silmukan sauma peitetään kahdella vuorottelevalla elementillä ja 3 s:n ristiinhäivytyksellä, koska mp3:n silmukointi naksahtaa.
- **Tiedostot tasataan −20 LUFS:iin (ffmpeg loudnorm) ja tasot asetetaan koodissa (0,3–0,42 = n. −30 LUFS), eli musiikin (−28 LUFS) tuntumaan tai hiljemmaksi.** Syy: käyttäjän ohje "ei turhan kovalle"; tasattuina tiedostot ovat keskenään vertailukelpoisia.
- **Puun kaatumisääni ajoitetaan simuloimalla kaatumisen kesto (sama fysiikka kuin animaatiossa): jos kaatuminen kestää pidempään kuin tiedoston räsähdys (0,92 s), ääni viivästetään ja alun narina soitetaan heti erikseen.** Syy: käyttäjän toive "ääni alkaa kun puu alkaa kaatua, räsähdys kun runko osuu maahan"; puut kaatuvat 1,5–2,2 s:ssa.
- **Askeleet syntetisoidaan (suodatettu kohina + matala tömähdys) materiaaleittain, ei äänitiedostoina.** Syy: käyttäjä pyysi Claudea generoimaan ne; synteesi vaihtelee joka askeleella luonnostaan, eikä tiedostoja tarvita. Materiaali päätellään biomin osuuksista, kallioisuudesta, rakennetuista lattioista ja kahlaamisesta.
- **Tuuli kuuluu myös hiekkamyrskyssä** (Clauden lisäys käyttäjän säännön lisäksi). Syy: hiekkamyrsky ilman tuulen ääntä tuntuisi oudolta; helppo poistaa, jos käyttäjä ei halua.
- **Vuoristo on kuiva ilmasto (ei sadetta, ukkosta eikä sumua), ja vuoriston osuus lasketaan paikalliseen sateenestoon ja salamoiden estoon kuten aavikko.** Tumbleweedien elinympäristöön lisättiin vuoristo. Syy: käyttäjän mukaan vuoristo on kuivaa (pöytävuoret, kaktukset).
- **O-näppäin kiertää vain biomissa mahdollisia säitä.** Syy: mahdoton sää ei tartu hallitsevaan ilmastovyöhykkeeseen, jolloin kierto jäi jumiin.

## 2026-10-07 (sessio 11)
- **Varjostimissa pow()-funktion kanta rajataan aina välille 0–1 (clamp/max).** Syy: GPU:n interpolointi voi ylittää välin hieman, ja pow(negatiivinen) = NaN, joka jälkikäsittely levittää mustiksi läiskiksi (sadepisaroiden bugi sessiossa 11).
- **Vesi veneen sisällä estetään näkymättömällä "vesisuojalla" (vain syvyys, ei väriä) laidan yläreunan tasolla, ei nostamalla pohjaa.** Suoja piirretään veneen sisustan jälkeen ja ennen läpinäkyvää vettä, joten vedenpinta jää sen taakse. Syy: pohja on tarkoituksella vesirajan alapuolella (syväys), ja suoja toimii kaikissa kallistuksissa ja aalloissa ilman vesi-shaderin muutoksia. Suoja ei osallistu säteenheittoon eikä esikatselumalliin.
- **Aaltojen amplitudi = 0,07 + tuuli^1,6 × 0,65 (ennen 0,15 + tuuli^1,5 × 1,6).** Selkeä n. 0,13 m, sade n. 0,28 m, ukkosmyrsky n. 0,57 m. Vaahtopäät alkavat vasta n. 0,2 m:n amplitudista. Syy: käyttäjän mukaan aallot olivat "överit"; myrskyn pitää silti näyttää rajulta, joten kasvu painottuu kovaan tuuleen.
- **Säiden mahdollisuus biomeittain tehdään kahdella tasolla: (1) ilmaston säätaulukko ja (2) paikallinen rajoitus.** Uusi kuiva ilmasto "Laterittitasanko" (selkeä 4, hiekkausva 2,5, hiekkamyrsky 0,7, pilvinen 0,6, ei sadetta); aavikko: selkeä 4,5, hiekkausva 3, hiekkamyrsky 1,6, pilvinen 0,25; savanni: selkeä 4, pilvinen 2,6, hiekkausva 1,8, hiekkamyrsky 0,3, sade 0,45, ukkonen 0,12. Ranta lasketaan meri-ilmastoon. Paikallisesti sade ja ukkonen kerrotaan (1 − aavikon ja kuivan osuus) ja pöly (1 − meren ja sademetsän osuus), ja salamat vain, missä sade on mahdollinen. Syy: käyttäjän säännöt ("hiekkamyrskyä ei merellä, rannalla eikä viidakossa, sadetta ei aavikolla eikä mesabiomissa, savannilla harvinaista, aavikolla pilvinen harvinaista"); paikallinen rajoitus estää myös biomien rajoilla sekoittuvan mahdottoman sään. "Mesabiomi" = edelleen tulkinta laterittitasanko (+ aavikon pöytävuoret aavikko-ilmastossa).
- **Sade = lähellä tiheät, ohuet näytön suuntaiset viiruraidat (9 000 pisaraa 16 m:n säteellä, leveys 1,25–3 px, nopeus vaihtelee) + kaukana kaksi sylinterimäistä "sadeverhoa" (26 m ja 70 m), joissa on liikkuvaa laikukasta sadetta ja kovassa sateessa maanrajan usvaa + roiskeet maahan (ei veteen, vesi piirtää omat renkaansa).** Syy: käyttäjä toivoi "super realistista" sadetta, jossa vesi näkyy paikoitellen sumuna. Yksittäiset viirut kaukana olisivat vain pikselikohinaa; oikeassa sateessa kaukainen sade näkyy harmaana verhona. Kaikki lasketaan näytönohjaimella.
- **Lammikoilla on pysyvyys 0,05–1 (sademetsän ja keitaan osuuden mukaan); muualla lammikon koko seuraa "lammikkokosteutta", joka kasvaa sateella (täysi n. minuutissa) ja kuivuu 4 minuutissa.** Lammikko kutistuu reunoilta (säde ∝ √kosteus). Tiheys: sademetsä 9, kausilampi 3, savanni ja metsiköt 2 / chunk. Syy: käyttäjän toive "savannilla heti sateen jälkeen, sitten pikkuhiljaa kuivuu"; kutistuminen näyttää haihtumiselta eikä lammikoita tarvitse luoda tai poistaa.
- **Tulikärpäset ovat parvina: rantaruudut (7 m:n ruudukko, kuiva ruutu sisäveden vieressä, n. 45 % niistä) ja n. joka viides akasia; enintään 12 lähintä parvea ja 320 kärpästä.** Ei merellä, rannalla, vuoristossa eikä aavikolla. Parvet haetaan maailmaan sidotusta ruudukosta (samat paikat joka kerta) rivi kerrallaan, kun pelaaja on liikkunut 18 m yöllä. Syy: käyttäjän toive "keskittyneinä jokien varsille ja joidenkin akaasiapuiden alle".
- **Rakennelmat: solu 180 m (ennen 230 m), todennäköisyys 60 % (ennen 50 %), sademetsässä ja vuoristossa tyhjän paino 4 (ennen 7; edelleen harvempi kuin Sahelissa), rannalla 3 (ennen 4). Laivanhylky valitaan 35 %:n todennäköisyydellä, jos solussa on rantaviiva; rantaviiva haetaan 7 × 7 -ruudukolla ja puolitushaulla, ja hylky asetetaan 4 m vesirajasta kuivalle maalle.** Tulos: n. 3 700–3 800 rakennelmaa ja n. 120 hylkyä maailmassa. Syy: käyttäjän mukaan rakennelmat ja erityisesti hylyt olivat liian harvinaisia ("niitä sais näkyy satunnaisesti"); satunnaiset näytepisteet osuivat kapeaan (10–30 m) rantakaistaleeseen harvoin. Seuraus: vanhojen maailmojen rakennelmien paikat muuttuvat.
- **Linnunrata: kapea (gaussinen) vyö, jonka reuna on epätasainen, himmeä hehku (0,03) ja tiheä tähtipöly (0,05), hennot pölykaistat, ilmakehän vaimennus horisontissa ja kuun valon himmennys 30 %.** Syy: käyttäjän mukaan entinen oli "liian silmille hyppäävä eikä realistinen"; oikeasti linnunrata on himmeä, rakeinen vyö, joka näkyy vain pimeässä.
- **Tähdenlento: taivas-shaderissa yksi kerrallaan, 8–38 s välein, kun yö on kirkas (tähtien näkyvyys × (1 − pilvet)); alkaa 30–70° korkeudelta, pituus 8–22°, kesto 0,45–1,05 s.** Syy: käyttäjän toive "satunnaisesti tähdenlentoja"; ei vaadi uusia piirtokutsuja.
- **Esineiden hohde: pieni tähtimäinen kimallus (0,3–0,6 m, peittävyys 0,14–0,2, arvoesineillä 0,24–0,36) ja satunnainen lyhyt välähdys.** Syy: käyttäjän mukaan kimallus "hyppäsi silmille"; hento kiilto riittää erottamaan esineen.
- **Haamu leijuu 2,6–4,2 m maasta (vähintään 1,4 m pelaajan jalkojen yllä), kiertää 8,5 m:n säteellä ja väistää puunrungot alle 7 m:n korkeudella. Alle 25 %:n terveydellä se pakenee 13 m:n korkeuteen ja haihtuu 9 s:n jälkeen tai 42 m:n päässä (ei saalista).** Syy: käyttäjän toive "latvustojen alla, ylemmäs vain kun tosi matala HP ja pakenee". Saalis vain kaatamalla, jotta pakeneminen on oikea menetys; paetessa siihen osuu nuolella.
- **Jousi oikeaan käteen peilaamalla koko käsimalli jousitilassa (scale.x = −1), ei mallintamalla jousta uudelleen.** Nuolille paksumpi varsi, isommat punavalkoiset sulat ja 3,2 m:n lentojälki, joka häviää 0,9 s:ssa. Syy: käyttäjän toive; peilaus säilyttää jännitysanimaation sellaisenaan. Nuoli lähtee nyt hieman oikealta.
- **Iskujen tahti: lyhyemmät animaatiot ja jäähdytykset (yhden iskun kierto olentoon osuessa: nyrkit 0,64 s, risu 0,72, kivipuukko 0,54, kirves 0,78, hakku 0,83, keihäs 0,95, puunuija 1,45 s) ja pienempi kestävyyden kulutus. Kun isku ei osu olentoon (hakkuu, louhinta, ohi), jäähdytys on 55 %.** Viidakkoveitsen sarja säilyy (jatkuu vain yli 50 %:n kestävyydellä), sarjan jälkeen 1,1 s jäähdytys. Syy: käyttäjän mukaan hakkaaminen oli kankeaa, mutta taistelu ei saa olla "OP"; olentoja vastaan tahti on edelleen harkittu, ja jatkuvaa huitomista rajoittaa kestävyys (5–18 / isku).
- **Purjeen kaistat ja saumat varjostimessa (kärkipisteittäinen saumaparametri, 8 kaistaa, sauma n. 0,6 % purjeen leveydestä, tummempi vastavalossa); kolmiopurjeessa parametri on 1 − luffin alakulman painokerroin, joten saumat ovat suoria ja takaliepeen suuntaisia.** Purjekangas kuultaa vastavalossa (45 % auringosta läpi). Syy: ruuduittain väritetyt kaistat näkyivät viuhkana ja porrasmaisina laikkuina, ja varjopuoli oli lähes musta.
- **Tuulen nuoli osoittaa suuntaan, johon tuuli puhaltaa (ylös = keula).** Syy: nuolen kärki oli kuvassa alaspäin, joten kierto näytti päinvastaista suuntaa.

## 2026-10-07 (sessio 10)
- **Vesiseinät korjattiin vedenpinnan sovittelulla, ei vesiverkon tasoittamisella jälkikäteen.** Jokaisessa maastopisteessä lasketaan kaikkien lähellä olevien uomien ehdokkaat; kun piste on kahden uoman vaikutusalueella, korkeampi vedenpinta rajataan matalamman tasolle (+ loiva nousu matalamman uoman rannasta poispäin). Sivujoen loppuosalla pinnan nosto liukuu pääuoman nostoon (pinnat kohtaavat liitoksessa samalla korkeudella), alle 2 m leveät purot seuraavat maastoa (pinta 0,2 m maan alla), järven kaivama kohta laskee joen pintaa saman verran, ja rakennelmat eivät tasoita maata uomien päällä. Syy: seinät syntyivät vierekkäisten pisteiden eri vedenpinnoista; sovittelu poistaa ne paikallisesti ilman, että koko verkkoa tarvitsee laskea uudelleen, eikä maaston generointi hidastunut.
- **"Mesabiomi" tulkittiin punaiseksi laterittitasangoksi ja aavikon pöytävuoriksi.** Tumbleweedien elinympäristö = aavikko + dyynit + laterittitasanko + pöytävuoret × 0,5 − keidas × 2; syntyminen vaatii vähintään 0,5 ja vierivät tarkistetaan 0,4 s välein (vesi → uppoaa, alle 0,15 → juuttuu ja katoaa). Syy: pelissä ei ole erillistä mesabiomia; nämä ovat lähimmät karut, punaiset alueet. Kysytään käyttäjältä.
- **Latinalaispurje lasketaan alas käärittäessä (raakapuu kääntyy etupään ympäri veneen suuntaiseksi), purjeet nostetaan ennen avaamista ja käärityt purjeet pysyvät keskilinjassa.** Lepatus pienennettiin kolmasosaan. Syy: yläasentoon jäänyt käärötty purje näytti paksulta valkoiselta tangolta, ja tuulen mukana kääntyvät käärityt purjeet ja voimakas lepatus näyttivät oudoilta. Laivan raakapurjeet pysyvät raakapuissaan (käärittyinä ohuina rullina).
- **Arat eläimet: huomaamisetäisyys noin 40 % lyhyempi, pakonopeus pelaajan juoksunopeuden tuntumassa (5,2–7,6 m/s), ensin tarkkailu ja vasta sitten pako, lyhyt pako (2,5–4 s), väsyminen paetessa (enintään −45 %) ja haavoittuneen hidastuminen.** Syy: käyttäjän mukaan eläimet olivat "typerän" arkoja ja juoksivat liian lujaa; pelaajalla pitää olla mahdollisuus saada ne kiinni (jousella helposti, juoksemallakin sinnikkäästi).
- **Märkyys tehdään jaetuilla materiaaleilla (yksi uniform `uWet` kaikille maaston ja kasvien materiaaleille), ei erillisillä sademetsämateriaaleilla.** Märkyys vaihtelee laikuittain maailman koordinaattien kohinalla: kaikki tummuu ja kiiltää, ja osa maasta on taivasta heijastavaa vesikalvoa (heijastusväri on taivaan ja tumman latvuston sekoitus, ettei maa näytä lumiselta). Kun `uWet` on 0, varjostin ohittaa märkyyden laskennan. Syy: sama toteutus toimii sademetsässä ja sateessa muualla, eikä se lisää piirtokutsuja.
- **Lammikot ovat koristetyyppi `puddle` (läpikuultava, reunat sulautuvat maahan, Schlickin fresnel), tiheys sademetsässä 9 / chunk ja kausilammella 0,8.** Syy: kevyt (instanssit), ja koristeena se piirretään vain lähellä. Sadepisaroiden renkaat lasketaan varjostimessa.
- **Sademetsän tihku = sade, jonka määrä on vähintään 0,24 × kosteus, ja pisarat ovat tihkuna hitaampia, lyhyempiä ja himmeämpiä.** Pilviä sademetsässä vähintään 62 %. Syy: käyttäjän toive "ei aina varsinaisesti sada, mutta pikkusen tihuttaa aina"; oikea sade (säätaulukosta) tulee edelleen päälle.
- **Kuumuusväreily ja kangastus tehdään jälkikäsittelyn loppuvaiheessa (uv-siirtymä horisontin tuntumassa kaukaisissa pikseleissä + taivaan heijastus horisontin alla), ja ne näkyvät vain, kun jälkikäsittely on muutenkin päällä.** Kuumuus = aavikon osuus × selkeä taivas × keskipäivä (aurinko korkealla) × ei kosteutta. Syy: väreily on luonnostaan kuvan vääristymä; erillinen piirtovaihe olisi raskas. Matalalla esiasetuksella jälkikäsittely on pois (heikot koneet), joten väreilykään ei pakota sitä päälle.
- **Haamu: 70 terveyttä, syöksy 10,5 m/s, isku 17 vahinkoa, varoitus 0,9 s, syöksy hakeutuu pelaajaan vain 6 m:iin asti, ulottuvuus 1,1 m.** Leijuu 8–11 m maasta (sademetsän latvukset ovat n. 8–20 m). Syntyy vain öisin, kun pelaaja on sademetsässä: tarkistus 35–75 s välein, todennäköisyys 40 %, enintään 1, ja edellisen jälkeen vähintään 1,5–2,5 min tauko. Syy: käyttäjän toive "suht vaarallinen" mutta "ei liian yleinen". Testissä paikallaan seisova sai 5 osumaa 5 syöksystä, sivuun ajoissa väistävä ei yhtään, joten varoitus antaa reilun mahdollisuuden.
- **Nuotion valo pitää haamut loitolla (ei synny 18 m:n säteelle eikä syöksy, jos pelaaja on 9 m:n säteellä nuotiosta), ja haamu haihtuu aamulla. Saalis: kaurikotiloita 1–3 ja pronssirannerengas 0–1.** Syy: Clauden ehdotus, jotta vaaralliseen yöhön on vastakeino ja saalis sopii tarinaan (vanhat arvoesineet). Merkitty paikkamerkiksi.
- **Lähitaistelun osuma vaatii, että olento on enintään (ulottuvuus + puolet sen korkeudesta + 0,8 m) silmien ylä- tai alapuolella.** Syy: ilman korkeusehtoa olisi voinut lyödä suoraan yläpuolella 8 m:n korkeudessa leijuvaa haamua.
- **Pudotetun esineen hehku on additiivinen sprite (lämmin valkoinen, arvoesineillä kultainen), ja heitetty esine odottaa automaattista poimintaa 10 s ja kunnes pelaaja on käynyt yli 3 m:n päässä.** [E] poimii aina. Syy: käyttäjän toive; pelkkä aikaraja ei riitä, jos pelaaja seisoo esineen päällä.
- **Meren pohja syvenee 16 m rannikkokohinan välillä 0,005–0,03 (ennen 15 m välillä 0,006–0,07).** Syy: käyttäjän toive helpommasta laivankäytöstä; 50 m rannasta vettä on nyt 3–5 m. Hiekkarannan loiva alku säilyy.
- **Muiden biomien tunnusmerkit ovat Clauden ehdotuksia: tulikärpäset (savanni, metsiköt ja sademetsä illalla ja yöllä tyynellä säällä) ja pölypyörteet (aavikko ja savanni kuumina päivinä, enintään 2 kerrallaan 45–90 m:n päässä).** Syy: käyttäjä toivoi jokaiselle biomille tunnusomaista grafiikkaa ja antoi esimerkit aavikosta ja sademetsästä; muille tehtiin kevyet, näytönohjaimella lasketut tehosteet. Vuoristolle ja merelle ei vielä tehty omaa; kysytään käyttäjältä.

## 2026-10-06–07 (sessio 9)
- **Joet ja purot lasketaan valumaverkkona** (värisytetty ruudukko 250 m, "priority flood" alamäkeen kohti merta tai järveä, virtaaman kertymä, vedenpinta laskee aina alavirtaan), ei kohinan nollakohdista. Syy: kohinasta syntyvät uomat risteilivät ja kiertyivät itsensä päälle. Verkossa jokainen piste valuu yhteen suuntaan, joten uomat voivat vain yhtyä. Sivujoet liittyvät pääuomaan porrastetusti (eivät samaan pisteeseen, mikä näytti risteykseltä), ja mutkittelu tehdään vääristymällä, joka ei taita tasoa (Jacobin determinantti > 0,17). Graniittikalliot eivät synny uomien päälle, ja sademetsän painannetermi poistettiin.
- **Biomit valitaan pehmeillä Voronoi-soluilla (solu 1 500 m, rajavyö 260 m, rajan vääristymä 330 m), solun tyyppi arvotaan siemenestä.** Syy: käyttäjä luopui kehämäisestä hierarkiasta; alueet eivät saa olla valtavia eivätkä liian pieniä. Vierekkäiset samat solut yhdistyvät, joten alueet ovat n. 1–2 km. Aloituspaikan ympärillä on aina Sahelia. Maailman reunalla meri ympäröi saaren. Solulaskenta välimuistitetaan 5 × 5 -ikkunaan (muuten maaston generointi hidastui 2,5-kertaiseksi).
- **Rakennelmia on 230 m:n solua kohti 50 %:n todennäköisyydellä (n. 1 800 maailmassa), laivanhylyt vain hiekkarannoilla (painona rannan taulukossa).** Syy: käyttäjän mukaan hylättyjä paikkoja oli aivan liian vähän, mutta laivanhylkyjen pitää olla harvinaisia. Riimukivet ja -taulut kuuluvat samaan tauluun (kaikki biomit).
- **Iskujen tahti: jokaisella aseella pitkä jäähdytys (iskujen väli nyrkeillä n. 1,1 s, nuijalla 1,9 s) ja suurempi kestävyyden kulutus.** Syy: käyttäjän mukaan iskuja pystyi edelleen tekemään aivan liikaa.
- **Ravinto 100, tyhjenee n. 34 minuutissa; tyhjällä vatsalla 0,5 terveyttä / s; myrkytys 0,45 / s × voimakkuus, mutta ei koskaan alle 4 terveyden.** Syy: käyttäjä halusi sienistä satunnaisen myrkytyksen, mutta myrkytyksen ei pidä tappaa yksinään (kuoleman syy olisi epäselvä). Syöminen on hiiren oikealla (ruoka kädessä tai repussa), kuten muu "käytä"-toiminto.
- **Rakentaminen on Valheimin tapainen: vasara + rakennusvalikko, ruudukko 2 m, osat liittyvät toisiinsa, purku palauttaa kaiken.** Työstöpenkki vaaditaan 20 m:n säteelle kaikkeen paitsi itseensä; nuotio rakennetaan vasaralla (ei enää valmisteta repussa). Syy: käyttäjän ohje "nuotio ja rakennelmat vaativat lähelle työstöpenkin, joka rakennetaan vasaralla". Työstöpenkin valmistuspaikka toimii 7 m:n säteellä, nuotion 4,5 m.
- **Esineet, reseptit, ruoat ja rakennusosien hinnat ovat Clauden suunnittelemia paikkamerkkejä**, ja nimet on valittu Sahelin luonnosta ja ruokakulttuurista (fonio, bissap, karitevoi, moringa, jujuba, apinanleipä). Syy: käyttäjä antoi vapaat kädet ("saat itse tehdä niitä"). Kaikki on koottu `DESIGN.md`:n paikkamerkkeihin.
- **Jousi: [Hiiri 1] pohjassa jännittää, päästäminen ampuu; nuoli on fyysinen ammus (painovoima, osuma olentoon, runkoon tai maahan).** Nuolista palautuu osa (olennosta 35 %, rungosta 75 %, maasta 85 %). Syy: arkojen eläinten metsästys vaatii etäaseen, ja palautuvat nuolet tekevät metsästyksestä reilun.
- **Arat eläimet huomaavat pelaajan näköetäisyydeltä, jota kyykky lyhentää (× 0,38) ja juoksu pidentää (× 1,25); säikähtänyt varoittaa laumaa.** Syy: käyttäjän toive "osan lähelle pääsee vain hiippailemalla, mutta silloinkin ne säikähtävät liian lähellä". Villieläimiä on yhteensä enintään 22 lähellä pelaajaa.
- **Vuorokausi kulkee todellisessa ajassa: 20 min = 10 min päivä + 10 min yö.** Syy: käyttäjän toive; aiemmin aika laski pelin simulaatioajasta, joka hidastui matalalla ruudunpäivityksellä, joten vuorokausi venyi.
- **Sää on vyöhykekohtainen: jokaisella ilmastolla (aavikko, savanni, sademetsä, vuoristo, meri) on oma säätaulukko ja tilansa, ja pelaajan kohdalla säät sekoitetaan biomien osuuksien mukaan.** Syy: käyttäjän mukaan kaikilla biomeilla ei voi olla samoja säitä (sademetsässä ei hiekkamyrskyä). Siirtymä on pehmeä, ja sää vaihtuu todellisessa ajassa.
- **Sade piirretään näytönohjaimella (3 200 pisaraviivaa kameran ympärillä), salama on lyhyt viiva ja taivaan välähdys.** Syy: kevyt toteutus ilman hiukkasten päivitystä prosessorilla.
- **Linnunrata lasketaan taivas-shaderissa (vyö, pölykaistat, kirkkaat kohdat, tiheämmät tähdet vyössä) ja kiertyy taivaannavan ympäri (n. 12° pohjoista leveyttä).** Syy: ei tekstuureja, toimii kaikilla laatuasetuksilla.
- **Riimut piirretään kankaalle tekstistä (sama teksti = samat riimut) ja kiinnitetään kiven pintaan; suomennos näkyy paneelissa, joka sulkeutuu [E]:llä, poistuttaessa (6 m) tai 30 s jälkeen.** Kivi valitsee tekstin siemenestä. Syy: käyttäjän toive "harakanvarpaita", "PAINA E KÄÄNTÄÄKSESI" ja suomenkielinen teksti. Tekstit (38) ovat Clauden luonnoksia, joita käyttäjä voi muokata.
- **Veneet ovat vasaralla rakennettavia osia (työstöpenkki pelaajan lähellä), ja ne asetetaan vain veteen.** Syy: käyttäjän mukaan rakennelmat vaativat työstöpenkin ja veneet asetetaan vain veteen; vasara on jo "rakentamisen työkalu". Haamu alkaa katsotusta kohdasta ja jatkuu katseen suuntaan (vene osoittaa poispäin rannasta). Rakentamiseen riittää matalampi vesi kuin vapaaseen kulkuun: matalasta rantavedestä vene ajetaan hitaasti syvemmälle (se saa liikkua, kunhan ei mene matalammalle kuin missä on jo käynyt).
- **Purjehdus: nopeus = suurin nopeus × purjeen veto kulman mukaan × tuulen voimakkuus × purjeiden määrä.** Vastatuulessa (laiva alle 60°, purjevene alle 43° tuulen suunnasta) purjeet eivät vedä. Raakapurjeet vetävät parhaiten myötätuulessa, latinalaispurje sivutuulessa. Purjeveneissä [W]/[S] vaihtaa asetusta (taakse, seis, hiljaa, puolet, täydet) kuten Valheimissa; "hiljaa" ja "taakse" eivät riipu tuulesta, jotta vastatuuleen ei jää jumiin. Syy: käyttäjän toive "purjeet toimivat tuulen suunnan mukaisesti".
- **Tuulen suunta kääntyy hitaasti (uusi tavoite 4–10 min välein, enintään n. 0,7° / s); aallokon suunta pysyy vakiona.** Syy: aiemmin tuuli puhalsi aina lähes samasta suunnasta, jolloin purjehdus olisi ollut yksitoikkoista. Aaltojen suuntaa ei voi kääntää (ks. sessio 6).
- **Pelaaja on veneessä "kyydissä" (paikka ohjauspaikalla, katse vapaa), ei kävele kannella.** Syy: liikkuvan kannen päällä käveleminen vaatisi oman fysiikan; tämä on ensimmäinen versio.
- **Laivan syväys 1,25 m (köli 1,6 m), purjevene 0,55 m, soutuvene 0,3 m.** Syy: sisämaan merenlahdet ovat usein vain 1,5–2 m syviä; 2,4 m:n syväyksellä laiva olisi jäänyt kiinni lähes kaikkialla rannikolla.
- **Veneen vauriot tulevat karilleajosta (yli 1,6 m/s); vasara korjaa 25 % kerrallaan (soutuvene 1 puu, purjevene 2 puuta, laiva 6 puuta + 1 kumi), ja purku palauttaa tarvikkeet kunnon mukaan (50–100 %).** Syy: kestävyyserot (60 / 180 / 1 200) näkyvät käytännössä, ja heikko soutuvene rikkoutuu helpoimmin, kuten käyttäjä toivoi.

## 2026-10-06 (julkaisu)
- **Alpha v0.1 on sessioiden 1–8 versio, joka yhdistettiin `main`-haaraan** (aiempi merkintä "Alpha v0.1 = 03a2b3b" korvattiin, koska käyttäjä pyysi julkaisemaan nykyisen pelin Alpha v0.1:nä). Syy: käyttäjä halusi pelin julkisesti pelattavaksi.
- **Julkinen pelilinkki: GitHub Pages `main`-haarasta (juurikansio) ja varalla raw.githack `main`.** `.nojekyll` estää Jekyll-käsittelyn. Pages pitää kytkeä päälle repon asetuksista (Claude-ympäristöstä ei voi), samoin tagi ja julkaisu.

## 2026-10-06 (sessio 8)
- **Iskusarja vain viidakkoveitsellä; muilla aseilla yksi isku. Jokaisella iskulla on jäähdytys, joka alkaa, kun isku päättyy ilman sarjan jatkoa.** Syy: käyttäjän mukaan lyöminen oli edelleen liian vahvaa, ja kombot kuuluvat vain nopeille ja kevyille aseille (veitsi, miekka). Sarjan 50 %:n kestävyysraja säilyi. Työkaluilla jäähdytys on lyhyt, jotta puiden hakkuu ei hidastu liikaa.
- **Osumasta olento horjuu 0,3 s (ei ohjaa itseään), tönäisy vaimenee hitaammin ja hypähdys skaalataan massan neliöjuurella.** Syy: käyttäjän mukaan olennot pysyivät liian paikallaan osuessa.
- **Veri on hiukkasina ja maahan jäävinä läikkinä (48 läikän kierrätetty joukko).** Syy: käyttäjä pyysi kuollessa efektin ja veren kaltaista nestettä; kiinteä määrä läikkiä pitää kuormituksen tasaisena.
- **Grafiikan esiasetukset asettavat näköetäisyyden, varjot, tarkkuuden ja valonsäteet; liike-epäterävyys ja DOF pois.** Ultra sallii myös 2× pikselitiheyden tarkoilla näytöillä. Oletus on Korkea (sama kuin aiemmat oletukset). Syy: käyttäjän toive.
- **Sademetsään väliaikaisesti päävalikon kappale (pelin hiljaisella tasolla).** Syy: käyttäjä odotti sademetsään musiikkia; Deep Exploration sopii tutkimiseen paremmin kuin hiekka-aiheinen Hiekan jäljet. Vaihdetaan, kun sademetsälle tulee oma kappale.
- **Musiikin ajat lyhennettiin (viive 5 s, häivytys 3,5 s, vähintään 20 s).** Syy: käyttäjän mukaan edellinen kappale soi liian kauan uudessa biomissa.
- **Varjokartan kokoa ei enää poisteta käsin; three.js muuttaa sen koon itse.** Syy: käsin poistettu kartta jätti materiaaleille vanhan syvyystekstuurin (WebGL-virheitä Tarkka-varjoilla).

## 2026-10-06 (sessio 7)
- **Alpha v0.1 on commit 03a2b3b** (session 6 versio, jota käyttäjä testasi). Tagia ei voitu pushata tästä Claude-ympäristöstä (vain kehityshaaraan saa pushata), joten käyttäjä luo GitHub-julkaisun itse valmiilla tekstillä.
- **Iskusarjojen rajoitus: sarja jatkuu vain, kun kestävyyttä on yli 50 %, ja sarjan iskut ovat kalliimpia.** Syy: käyttäjä ehdotti joko 50 %:n rajaa tai yhden sarjan kokoista kulutusta; yhdistelmällä täydellä kestävyydellä ehtii juuri yhden sarjan, mutta kestävyyttä jää vielä torjuntaan tai pakoon (pelkkä nollaan kuluttaminen jättäisi pelaajan puolustuskyvyttömäksi). Yksittäisiä iskuja voi lyödä edelleen.
- **Kilpi varustetaan hiiren oikealla, kun kilpi on valittuna, tai hiiren oikealla repussa.** Varustus on pinon lippu (`eq`), joka kulkee pinon mukana ja tallentuu. Syy: käyttäjä ei halunnut kilpeä automaattisesti käteen; hiiren oikea on jo "käytä esinettä" (esim. nuotion asetus).
- **Savipeikko aamulla: paniikki (0,5–1,4 s) → syttyy → palaa 3,5–6 s → hiiltyneet palat ja tuhka, ei saalista.** Syy: käyttäjän toive. Palavat savipeikot käyttävät nuotioiden kolmea valoa (lähimmät tulet saavat valon), joten valojen määrä ei muutu eikä shadereita käännetä uudelleen.
- **Kehittäjätyökalut ovat oma paneelinsa [F3]; maailma jatkaa kulkuaan sen takana.** Pikanäppäimet [O] ja [L] säilytettiin. Lentäminen: välilyönti ylös, Ctrl/C alas, Shift nopeammin, ei törmäyksiä. Syy: käyttäjä halusi testityökalut pois valikosta.
- **Koko kartan paljastus: koko maailmasta lasketaan yksi karkea yleiskuva (512 px, n. 40 m/px) generointisäikeessä, ja tarkat ruudut haetaan, kun karttaa lähennetään.** Tallennukseen menee vain lippu. Syy: 1 500 tarkan ruudun laskeminen kerralla kestäisi minuutteja.
- **Dyynit yhdistettiin aavikkoon vain nimen, kartan värin ja musiikin osalta; maaston generointi on ennallaan.** Syy: käyttäjän ehdotus; näin vanhat maailmat eivät muutu.
- **Musiikki soitetaan HTML-audioelementeillä (striimaus), ei purettuna muistiin.** Syy: 3–4 min kappale vie purettuna n. 60 Mt muistia; striimattuna vain vähän.
- **Kappaleet tasataan samaan äänekkyyteen (mitattu EBU R128: −14,1…−15,2 LUFS, tasataan −16 LUFS:iin), valikko soi täydellä ja peli 12 dB hiljempaa.** Syy: käyttäjä halusi pelin musiikin hiljaiseksi taustaksi ja tilaa äänitehosteille, mutta valikon normaalilla voimakkuudella. Oletukset: äänenvoimakkuus 100 %, musiikki 80 %.
- **Biomin musiikki: 8 s viive (pelin alussa 4 s), 8 s häivytys, 2,5 s tauko, 10 s voimistuminen, kappale soi vähintään 45 s; musiikittomalle alueelle hiljenee 15 s jälkeen.** Syy: käyttäjän toive viiveestä ja pitkistä häivytyksistä, ettei musiikki vaihdu rajoilla.
- **Musiikki biomeittain käyttäjän luettelon mukaan:** savanni = Sahelin savanni, laterittitasanko, kausilampi ja akasiametsikkö; aavikko = aavikko, dyynit ja keitaat; meri = vain meri (ei ranta). Sademetsässä, vuoristossa ja rannalla ei soi musiikkia. **Hiekan jäljet -kappale on repossa, mutta sille ei ole vielä paikkaa** (ei ollut luettelossa; kysytään).
- **Ensimmäisellä käynnistyksellä "Klikkaa jatkaaksesi".** Syy: selaimet estävät äänen ennen käyttäjän elettä; muuten valikon musiikki alkaisi vasta ensimmäisestä napin painalluksesta.
- **Musiikin häivytykset lasketaan todellisessa ajassa** (eivät hidastu matalalla ruudunpäivityksellä), ja musiikki pysähtyy, kun välilehti on piilossa.

## 2026-10-06 (sessio 6)
- **Jokien pinta asetetaan maaston loivan muodon alle (2 m), ja penkereet täytetään pehmeästi.** Syy: kova penger (vesi + 0,12 m) teki maasta koholla olevia seiniä; reunojen kuivat vesipisteet painetaan maan alle, jottei vesi näy reunan yli.
- **Aaltojen suunnat ovat kiinteät (pääaalto aina kohti maailman keskustaa, eli rantaa), ja tekstuurien liike kertyy ajan mukana.** Syy: aaltojen vaihe riippui tuulen suunnasta kerrottuna sijainnilla; 9 km päässä keskeltä pienikin tuulen kääntyminen liikutti aaltoja holtittomasti.
- **DOF vain kaukaiselle taustalle ja aivan lähelle, enimmäissumennus 4 px.** Syy: käyttäjän palaute (liian voimakas).
- **Tuulen vähimmäisvoimakkuus 0,16.** Syy: käyttäjä halusi pienen huojunnan myös tyynellä.
- **Taistelu on Valheimin tapainen: iskusarjat, torjunta ja parry.** Arvot (vahingot, nopeudet, kestävyys) ovat paikkamerkkejä `src/game/combat.js`:ssä. Syy: käyttäjä on viitannut Valheimiin, ja mekaniikka on tuttu ja selkeä.
- **Iskusarjat vain puunuijalla, viidakkoveitsellä ja nyrkeillä; työkalut lyövät yhdellä iskulla.** Syy: käyttäjä pyysi kombot "tietyille aseille"; puiden ja kivien hakkuu pysyy ennallaan.
- **Isku osuu olentoihin kaarena (ei vain tähtäimen säteenä), maailman hakkuu tehdään edelleen tähtäimellä.** Syy: liikkuvaan olentoon osuminen pelkällä säteellä on turhauttavaa.
- **Kilpi on vasemmassa kädessä, kun se on pikapalkissa** (ei erillistä varustepaikkaa). Syy: yksinkertaisin ratkaisu, reppua ei tarvinnut muuttaa. Kilven voi poistaa käytöstä siirtämällä sen reppuun.
- **Torjunta toimii vain edestä (noin 70° sivuille). Parry-ikkunat: kilpi 0,28 s, ase 0,22 s, työkalu 0,2 s, kädet 0,18 s.** Syy: selkään tulevaa iskua ei voi torjua; ikkunat testattiin niin, että iskun varoitusliikkeeseen ehtii reagoida.
- **Viidakkoveitsi löytyy arkuista (leireissä 40 %, muissa rakennelmissa 20 %), eikä sitä voi valmistaa.** Syy: metallia ei vielä ole pelissä (avoin kysymys). Veitsi arvotaan omalla satunnaisvirralla, joten arkkujen muu sisältö pysyy samana.
- **Villieläimeksi valittiin pahkasika.** Syy: tavallinen Burkina Fason savannien eläin, joka on neutraali mutta puolustautuu; sopii hyvin taistelun harjoitteluun.
- **Yön vihollinen on keksitty "savipeikko" (lateriittisavesta), ei kansanperinteen olento (esim. mossien kinkirsi).** Syy: oikeista uskomuksista ei haluttu tehdä vihollisia; savi sopii Sahelin savirakentamiseen. Nimi ja ulkonäkö ovat paikkamerkkejä.
- **Savipeikkoja syntyy yöllä 18–46 s välein 18–32 m päähän, enintään 3; ei 14 m sisällä nuotiosta; aamulla ne murenevat.** Syy: käyttäjä pyysi "aika ajoin" esiintyvää helppoa ja heikkoa vihollista; nuotio antaa turvapaikan.
- **Olentoja ei tallenneta**, ne syntyvät uudelleen pelaajan ympärille. Syy: yksinkertaisuus; niitä on vain lähellä pelaajaa.
- **Kuollessa herätään maailman aloituspaikasta ja reppu säilyy.** Syy: sänkyä tai hautakiveä ei vielä ole (avoin kysymys).
- **Terveys palautuu itsestään (1,5 / s, kun osumasta on 6 s).** Syy: ruokaa ei vielä ole.
- **Uinti kuluttaa kestävyyttä 4,5 / s liikkuessa ja 1,5 / s paikallaan; hukkuminen vie 9 terveyttä sekunnissa.** Täydellä kestävyydellä ehtii uida noin 45–50 m. Syy: käyttäjä halusi hukkumisen kestävyyden loputtua; lyhyet joet ylittää helposti, isot järvet vaativat suunnittelua.
- **Kyykky on päälle/pois-kytkin [Ctrl] tai [C], ei pohjassa pidettävä.** Syy: selain sulkee välilehden Ctrl+W:llä, eikä sitä voi estää; pohjassa pidetty Ctrl + W (eteen) olisi vaarallinen. Lisäksi peli kysyy pelin aikana ennen sivulta poistumista.
- **Käden kyynärvarsi suunnataan joka ruudulla ranteesta kyynärpäähän.** Syy: isoissa iskuissa koko käsivarsi kääntyi muuten näkökenttään.
- **Olentojen mallit rakennetaan kerran latausruudun aikana (3 muunnelmaa / laji) ja jaetaan.** Syy: uuden olennon luonti nyki 5–14 ms; nyt alle 1 ms.
- **Karttamerkin nimi kysytään heti merkkiä asetettaessa** (tyhjä nimi sallittu), klikkaus merkkiin avaa nimeämisen/poiston ja oikea klikkaus poistaa. Syy: ennen klikkaus merkkiin poisti sen; nyt klikkaus tarvitaan nimeämiseen.

## 2026-10-06 (sessio 5)
- **Meri on maailman ulkoreunalla sademetsän puolella, vuoret aavikon puolella.** Syy: käyttäjä pyysi meribiomia; sademetsän takana oleva meri muistuttaa Guineanlahtea (aavikko ja vuoret pohjoisessa). Meri vie noin 43 % reunasta, ja siinä on rantahiekkaa sekä harvoin saaria.
- **Joka pisteellä on veden pinta (wl).** Merenpinta on kaikkialla; lisäksi joet, purot ja järvet ovat omalla korkeudellaan. Piste on veden alla, jos maa on pintaa alempana. Syy: vuoristojärvet ja joet tarvitsevat muita pintoja kuin merenpinnan, ja sama tieto palvelee maastoa, vettä, esineitä, pelaajaa ja karttaa.
- **Joet ja purot kulkevat kohinakentän nollakohtaa pitkin (mutkat domain warpilla).** Etäisyys uomasta arvioidaan kentän arvosta ja gradientista. Veden pinta seuraa maaston loivaa muotoa, ja maastoon kaivetaan uoma, penger ja laakso. Syy: deterministinen ja chunkeittain laskettava ilman koko maailman simulointia. Joki voi paikoin virrata loivasti ylämäkeen, koska virtausta ei simuloida; virtaus näytetään aina pintaa alas.
- **Järven pinta asetetaan reunan matalimman kohdan alle**, ja rannalle tehdään matala penger. Järvet eivät osu jokiin. Syy: vesi ei saa näkyä valumassa reunan yli.
- **Vesipinta on chunkeittain oma verkkonsa samalla ruudukolla kuin maasto**, ja pisteissä on syvyys, avoimuus, virtaus ja värit. Syy: rantaviiva syntyy maaston ja veden leikkauksesta siististi, ja vesi voi olla eri korkeuksilla.
- **"Nestefysiikkamoottori" toteutettiin pelien tapaan:** aallot ovat Gerstner-aaltoja (korkeus tuulen mukaan), pelaajan ympärillä lasketaan aaltoyhtälöä näytönohjaimella (väreily ja renkaat), roiskeet ovat hiukkasia ja esineillä on noste. Syy: oikea 3D-nestesimulaatio (SPH/FLIP) koko avoimeen maailmaan ei ole selaimessa mahdollinen; tämä näyttää ja tuntuu oikealta ja on kevyt.
- **Kelluvat esineet: puu, risut ja kuitu.** Kivet, työkalut ja metallit uppoavat. Syy: luonteva fysiikka; listaa on helppo muuttaa (items.js: floats).
- **Esineen heitto [Q].** Syy: käyttäjä halusi heittää esineitä veteen; repusta ei ennen voinut pudottaa mitään.
- **Aurinko on three.js:n SunLight (kaksi varjokaskadia).** Syy: tarkat varjot lähellä ja varjot myös kauas ilman omaa toteutusta; varjojen reunat pehmenevät etäisyyden mukaan. Kaskadit tuplaavat varjopiirron, joten heikolle koneelle on "Varjot: Pois".
- **Jälkikäsittely omana kevyenä putkenaan (render/post.js):** maailma piirretään HDR-kuvaan syvyyksineen, sitten valonsäteet (säteittäinen sumennus kohti aurinkoa), ilmakehän hehku sumussa, DOF ja liike-epäterävyys, lopuksi sävytys. Käsi piirretään päälle ilman tehosteita. Syy: ei tarvita koko EffectComposeria, ja kaikki tehosteet saa pois (silloin piirretään suoraan kuten ennen).
- **Oletusasetukset:** valonsäteet päällä, liike-epäterävyys ja DOF pois. Syy: säteet tekevät eniten tunnelmaa; DOF ja liike-epäterävyys ovat makuasioita.
- **Uudet kasvit ja muodostumat ovat Burkina Fason luontoon sopivia paikkamerkkejä** (karitepuu ja doumpalmu ovat Sahelin tunnusomaisia puita, graniittikalliot kuten Sindoun ja Nahourin kalliot). Syy: käyttäjä pyysi lisää sisältöä biomeihin.
- **Vanhojen maailmojen maasto muuttuu** (sama siemen, uusi generointi). Syy: maaston ja esineiden generointi muuttui; tallennus toimii, mutta maailma näyttää erilaiselta.

## 2026-10-06 (sessio 4)
- **Kartta paljastuu ruuduittain (512 m, 4 m/pikseli), ja maasto lasketaan generointisäikeessä.** Syy: pääsäikeessä tehty minikarttalaskenta nyki kävellessä. Ruutuja pyydetään vain piirtoa varten, korkeintaan kaksi kerrallaan, jotteivät chunkit jää jonoon.
- **Tallennukseen menee vain karkea bittikartta (16 m solut) tutkitusta alueesta**, ja pehmeä maski rakennetaan siitä latauksessa. Syy: tallennus pysyy pienenä (n. 170 merkkiä / ruutu). Ladattu alue on hieman reunoiltaan pienempi kuin pelatessa piirretty.
- **Minikartta kääntyy pelaajan mukana, iso kartta on pohjoinen ylöspäin.** Syy: minikartassa katsesuunta on luontevasti ylös (kuten ennen), isossa kartassa merkkien asettelu on helpompaa kiinteällä suunnalla.
- **Merkkisymbolit: raksi, pallukka, talo, lippu, tähti.** Syy: käyttäjä mainitsi raksin, pallukan ja talon esimerkkeinä; lippu ja tähti lisättiin, koska "paria erilaista" -merkkiä varten pieni valikoima on kätevä. Helppo muuttaa (`src/ui/explored.js`).
- **Isossa kartassa maailma jatkaa kulkuaan** (kuten repussakin). Syy: selviytymispeleissä tapana; tauko on erikseen [Esc].
- **Chunkien generointi siirrettiin Web Workeriin** (2 säiettä, varajärjestelmänä pääsäie). Syy: chunkin laskenta kesti 15–20 ms ja aiheutti nykimistä kävellessä. Säikeissä ei voi käyttää import mapia, joten generointikoodi ei tuo three.js:ää.
- **Instanssipoolit tiivistetään** (poistettu instanssi korvataan viimeisellä). Syy: pooleihin jäi nollamatriiseja, jotka piirrettiin silti, ja kolmiomäärä kasvoi kävellessä yli miljoonaan.
- **Rakennelmien paikat tulevat siemenestä 320 m soluista** (24 % soluista, biomin mukaan painotettu tyyppi), ja maasto tasoitetaan rakennelman kohdalta. Arkun sisältö lasketaan rakennelman siemenestä, joten se on joka kerta sama; avatut arkut tallennetaan. Syy: deterministinen kuten muukin maailma, ei tarvitse tallentaa rakennelmia.
- **Rauniot ovat kaikissa biomeissa harvinaisia (n. 7–8 % soluista)**; Sahelissa yleisimpiä ovat kivikehät ja aavikolla leirit. Syy: käyttäjä pyysi kivikehiä Saheliin, leirejä aavikolle ja harvinaisia raunioita kaikkialle.
- **Arvoesineet (kultahippu, kaurikotilo, pronssirannerengas) ovat toistaiseksi vain kerättäviä.** Syy: käyttötarkoitusta ei ole päätetty (avoin kysymys). Kaurikotilo ja pronssi valittiin, koska ne sopivat Länsi-Afrikan historiaan (kotilorahat, pronssityöt).
- **Sademetsä on tiheä, ja raskaus hoidetaan lyhyellä piirtoetäisyydellä sumun sisällä.** Syy: käyttäjä halusi tiheän, vaikeakulkuisen sademetsän; sumu (n. 95 m) peittää piirtoetäisyyden rajan. Kulku on 30 % hitaampaa.
- **Käden animaatiot lasketaan pehmennetyistä tiloista** (juoksu, ilmassa olo ja hiiren liike liukuvat; iskut avainkehyksistä). Syy: käyttäjä koki juoksu- ja työkaluanimaatiot nykiviksi; mittauksessa juoksuun siirtyminen hyppäsi 0,35 rad yhdessä ruudussa, nyt alle 0,03.
- **Valikon animaatiot vain transformilla ja läpinäkyvyydellä.** Syy: sumennus, clip-path ja left/right-animaatiot lasketaan pääsäikeessä, joka piirtää samalla 3D-taustaa, joten ne nykivät. Transform/opacity-animaatiot pyörivät näytönohjaimella.

## 2026-10-06 (sessio 3)
- **Maailma on vyöhykkeellinen ympyrä (säde 10 km), ja joka maailmalla on oma siemen.** Syy: käyttäjän luonnos (spawn -> tier 1 Sahel -> tier 2 aavikko/sademetsä -> vuoristoreuna) ja toive valtavasta maailmasta. Vyöhykkeiden rajat vääristetään kohinalla, jotta ne ovat epäsäännöllisiä ja joka siemenellä erilaisia.
- **Aavikko ja sademetsä painottuvat maailman vastakkaisille puolille** (suunta arvotaan siemenestä). Syy: pelkkä kohina sekoitti ne pieniksi läikiksi; näin syntyy yhtenäisiä alueita, vähän kuin Sahara pohjoisessa ja Guinean metsät etelässä.
- **Maailman reunan takana on läpäisemätön vuoriseinämä**, ja pelaaja työnnetään takaisin. Syy: luonnoksessa ulkoreuna on vuoristoa; reunan takaa ei ole päätetty (avoin kysymys).
- **Chunkien maasto tallennetaan paikallisissa koordinaateissa.** Syy: 10 km päässä keskeltä float32-tarkkuus riittää näin paremmin.
- **Etäisyystasot (LOD):** lähellä tarkka malli ja varjo, kauempana kevyt malli ilman varjoa, pienet esineet (risut, kivet, pensaat) piilotetaan kaukana. Syy: tiheä sademetsä olisi muuten liian raskas; kolmioita on nyt n. 550 tuhatta.
- **Hakattava esine irrotetaan instanssipoolista omaksi Meshikseen.** Syy: vain siihen voi tehdä lovia (verteksien muokkaus) ja säröjä (oma materiaali). Lovi tehdään tiheärunkoiseen versioon puusta, joka luodaan vain tarvittaessa.
- **Puun lovi tulee aina kiinteään kaatokohtaan** sille puolelle, josta lyödään. Syy: puu halkaistaan kaatuessa kannoksi ja kaatuvaksi osaksi juuri siitä kohdasta (rungossa on siinä verteksirengas).
- **Kaatuminen on yksinkertaista fysiikkaa** (sauva kaatuu tukipisteen ympäri, kiihtyvyys ~ sin(kulma), pomppu maahan osuessa). Syy: näyttää luonnolliselta ilman fysiikkakirjastoa.
- **Kaatumissuunta on satunnainen, mutta ei suoraan pelaajaa kohti.** Syy: käyttäjä halusi satunnaisen suunnan; pieni poikkeus estää puuta kaatumasta pelaajan päälle. Helppo poistaa, jos halutaan täysi satunnaisuus.
- **Kiven säröt piirretään shaderilla** (3D Voronoi -reunat, jotka leviävät vaurion kasvaessa) ja osumakohtaan painuu kuoppa. Syy: näyttää säröilyltä ilman tekstuureja.
- **Murskautuminen:** geometria jaetaan paloihin ryhmittelemällä kolmiot; kivillä palat suljetaan sisäpinnoilla, ohuilla esineillä (oksat, lehdet) ei. Syy: ohuista osista syntyi muuten isoja levyjä.
- **Saaliit ovat fyysisiä esineitä maassa**, ja ne poimitaan [E]:llä tai automaattisesti 1,5 m säteellä. Ne tallennetaan maailman mukana (enintään 250). Syy: käyttäjän toive.
- **Päävalikko on HTML/CSS:ää ilman kuvatiedostoja**, ja taustalla on elävä pelimaailma auringonlaskussa. Syy: tyyli saadaan mallikuvan kaltaiseksi, ja tausta näyttää pelin oikeaa grafiikkaa. Mallikuvaa ei käytetty suoraan, koska logo ja napit ovat siinä osa kuvaa.
- **Fontit kopioitu repoon** (`assets/fonts/`, OFL/Apache-lisenssit mukana). Syy: toimivat ilman ulkoisia palveluja.
- **Useita maailmoja tallennetaan erikseen** (`sahel.worlds.v2` + maailmakohtainen data), asetukset omanaan. Vanha v1-tallennus jätetään huomiotta. Syy: siemen per maailma.
- **Pelin aloitus vaatii klikkauksen latauksen jälkeen.** Syy: selain sallii hiiren lukituksen vain käyttäjän eleestä.
- **Sademetsässä hiekkamyrsky ja hiekkausva näkyvät sumuna.** Syy: hiekkailmiöt eivät sovi sademetsään; sää on silti koko maailmalle yhteinen.
- **Vesitaso jaettu pienempiin kolmioihin.** Syy: ohjelmistorenderöijä piirsi ison kameran alta kulkevan kolmion väärin (vesi näkyi maan päällä); korjaus on halpa.

## 2026-10-06 (sessio 2)
- **Peli tehdään selaimeen three.js:llä ilman käännösvaihetta.** Syy: käyttäjä testaa raw.githack-linkillä ilman asennuksia; ES-moduulit + import map toimivat suoraan staattisena sivuna. three.js tukee PBR-materiaaleja, varjoja ja glTF-malleja, joten grafiikkaa voi myöhemmin parantaa samalla pohjalla.
- **three.js (r186) on kopioitu repoon (`vendor/three/`, minifioitu) eikä ladata CDN:stä.** Syy: versio pysyy lukittuna, peli toimii vaikka CDN olisi estetty, ja paikallinen testaus onnistuu. Lisenssi (MIT) mukana.
- **Maailma on proseduraalinen ja deterministinen (siemen), chunkit 64 m, näkymä 5 chunkia.** Syy: avoin maailma ilman valtavia karttatiedostoja. Kerätyt/kaadetut esineet tallennetaan pelkkinä tunnisteina.
- **Biomit perustuvat Sahelin maantieteeseen** (dyynit pohjoisessa, laterittitasangot, kausilammet eli "maret", akasiat ja baobabit) ja tuuli puhaltaa koillisesta (harmattan). Syy: käyttäjä halusi pelin pohjautuvan Burkina Fason Saheliin. Biomien nimet ja määrä ovat silti paikkamerkkejä.
- **Mallit ovat toistaiseksi proseduraalisia low-poly-malleja vertex-väreillä (`src/models/models.js`).** Syy: grafiikan ei tarvitse vielä olla hienoa, eikä ulkoisia malleja ole saatavilla (ks. alla). Jokaisella mallilla on nimi, joten ne voi myöhemmin vaihtaa glTF-malleihin muuttamatta pelilogiikkaa. Esineiden kuvakkeet piirretään samoista 3D-malleista, joten ne päivittyvät mallien mukana.
- **Tekstuurit tehdään toistaiseksi proseduraalisesti canvasilla.** Syy: Claude-ympäristön verkkorajoitus estää CC0-palvelut (Poly Haven, ambientCG). Oikeat CC0-tekstuurit voi lisätä myöhemmin (`src/render/textures.js`).
- **Käsi piirretään omana näkymänään maailman päälle.** Syy: käsi ja työkalu eivät leikkaudu puiden tai maaston sisään, ja niiden FOV:n voi säätää erikseen. Käsi saa valaistuksen maailman valoista (yö, nuotio).
- **Samat mallit piirretään instansseina yhdessä poolissa per malli.** Syy: vähän piirtokutsuja (~80 / ruutu). Pensaat eivät heitä varjoa, ja oksista on jätetty päädyt pois: kolmiomäärä putosi ~1,2 miljoonasta ~650 tuhanteen.
- **Neljä säätä vaihtuvat satunnaisesti pehmeällä siirtymällä; hiekkamyrsky tulee yleensä usvan kautta.** Syy: käyttäjän pyytämät sääilmiöt; pehmeä siirtymä näyttää luonnolliselta.
- **Opas laskee tilastot pelin alusta.** Syy: jos pelaaja tekee asian etuajassa (esim. valmistaa kirveen), vaihe kuittautuu heti eikä työtä tarvitse toistaa.
- **Tallennus localStorageen, automaattisesti 20 s välein ja sivulta poistuttaessa.** Syy: selainpeli, ei palvelinta. Valikossa on "Aloita uusi peli".
- **Ohjaus hiiren lukituksella (pointer lock), vain tietokoneella.** Syy: ensimmäisen persoonan peli; mobiiliohjaus on oma työnsä.
- **Testaustyökalut ovat taukovalikossa (sää, kellonaika) ja pikanäppäimissä [O] ja [L].** Syy: käyttäjän on helppo kokeilla eri säitä ja yötä odottamatta.
- **Musiikkia ja ääniä ei tehty.** Syy: käyttäjä toimittaa ne myöhemmin.
- **Työ tehtiin haarassa `claude/sahel-game-dev-yi990s`** (ei `feat/...`). Syy: Claude-ympäristö määrää kehityshaaran nimen.
- **Repo on nyt julkinen**, joten raw.githack-testauslinkit toimivat. (Sessiossa 1 avoin kysymys ratkesi.)

## 2026-10-06 (sessio 1)
- **Peli saa oman repositoryn ja muistiinpanokansion (`docs/`).** Syy: käyttäjä halusi, että Claude pitää kirjaa tehdystä työstä ja muistaa sen myöhemmin.
- **Nimi "Sahel" on työnimi.** Syy: nimi ei ole vielä 100 % päätetty. Nimeä ei kovakoodata laajasti, jotta uudelleennimeäminen on helppoa.
- **Dokumentaatio suomeksi.** Syy: käyttäjä kirjoittaa suomea.
- **Repo luotiin yksityisenä.** Syy: julkisuudesta ei ole sovittu; sen voi avata myöhemmin GitHubin asetuksista.
- **Claude Coden työnkulku kirjattu `CLAUDE.md`:hen.** Luetaan muistiinpanot alussa, kirjoitetaan niitä työn aikana, työ tehdään haarassa + PR:nä, ja lopuksi annetaan aina raw.githack-testauslinkki. Syy: käyttäjä halusi, että Code muistaa edistymisen ja testaus onnistuu suoraan selaimessa. Huomio: raw.githack vaatii julkisen repon, ja repo on tällä hetkellä yksityinen (avoin asia).
