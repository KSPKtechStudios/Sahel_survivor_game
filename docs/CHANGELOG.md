# Changelog

Mitä peliin on lisätty tai muutettu. Uusin ylimpänä.

## 2026-10-12 (sessio 47): sademetsän tunnelma ja syvyys takaisin

Kaikki muutokset koskevat vain sademetsää päivällä. Savanni, muut biomit ja yöt ovat ennallaan. Liike-epäterävyyttä, TAA:ta tai terävöintiä ei kytketty takaisin.
- **Auringonvalo latvuston läpi:** suora aurinko on voimakkaampi ja lämpimämpi, joten valoläikät maassa ja lehdillä sekä valokeilat erottuvat selvästi varjosta.
- **Syvemmät varjot:** hajavaloa on vähemmän, joten varjot eivät ole enää tasaisen haaleita.
- **Värit:** hieman enemmän kontrastia ja kylläisyyttä (täyteläisemmät vihreät).
- **Usva ja syvyys:** usva alkaa lähempää ja sävyttyy latvuston vihertävään valoon, joten keskietäisyyden ja kaukaiset puut häipyvät pehmeästi taustaan. Maata myötäilevää usvaa ja valokeilojen ilmaa on hieman enemmän.

## 2026-10-12 (sessio 46): lehvästöjen pikselimössö ja välkyntä, syväterävyys hieman takaisin

- **Puiden latvukset siistimmiksi kaukana:**
  - yli 4 metrin päässä lehdet piirretään hieman pehmeämmästä tekstuuritasosta, joten latvusten sisällä ei enää ole rakeista tummien ja vaaleiden pikselien sotkua eikä pikselin kokoisia reikiä;
  - lehtien reunat pehmenevät reunanpehmennykseen tasaisemmin.

  Testinäkymässä latvukset muuttuivat kameraa käännettäessä noin 10–30 % vähemmän (eniten kaukaisissa puissa). Lähellä lehdet näyttävät samalta kuin ennen. Koskee puita, pensaita, kaadettavia puita, puun paloja sekä aluskasvien lehtiä ja kukkia.
- **Syväterävyys hieman voimakkaammaksi:** tausta alkaa sumentua aiemmin ja vähän enemmän kuin sessiossa 44, mutta lievemmin kuin sessioissa 39–40.

## 2026-10-12 (sessio 45): okkluusio ei välky kasvillisuudessa, terävöinti poistettu

- **Ambienttiokkluusio (SSAO) ei enää välky ruohossa ja lehdissä:**
  - ohuet korret ja lehdet jätetään okkluusiosta pois (tunnistetaan syvyyden äkillisestä vaihtelusta naapuripikseleihin);
  - okkluusio lasketaan vain isommista muodoista (säde 1,2 m, näytteet vasta 35 %:n etäisyydeltä), joten pienet liikkuvat yksityiskohdat eivät varjosta;
  - kevyempi (voimakkuus 0,5), lyhyempi kantama (70 m) ja leveämpi pehmennys.

  Okkluusio on yhä oletuksena pois; sen saa päälle asetuksista.
- **Terävöinti poistettu kokonaan:** asetusrivi, asetus ja koko tehoste. Vanha tallennettu arvo poistetaan asetuksista.

## 2026-10-12 (sessio 44): ruudunpäivitys takaisin ja kaukainen pikselimössö pois

- **Session 43 muutos peruttu:** kaukomallit ja tarkan mallin raja ovat taas ennallaan (ruudunpäivitys putosi viidakossa).
- **Kaukainen pikselimössö korjattu:** syy oli syväterävyys. Se lasketaan puolikkaalla tarkkuudella, ja sessioiden 39–40 voimakkaampi syväterävyys korvasi kaukaisen maiseman lähes kokonaan tällä pienemmällä kuvalla. Syväterävyys on nyt palautettu session 25 arvoihin, ja puolikkaan tarkkuuden sumennus sekoittuu kuvaan vain selvästi sumeissa kohdissa.
- Renderöintitarkkuus ja reunanpehmennys tarkistettiin: pikselitiheys on ennallaan (`min(devicePixelRatio, 1,5)` × Tarkkuus-asetus), ja maailma piirretään 4× MSAA:lla. Niitä ei ole muutettu.

## 2026-10-12 (sessio 43): kaukaiset puut siistimmiksi

- **Kaukomallit paremmiksi:**
  - kaukaisten puiden lehvästöissä on noin 2,8 kertaa enemmän ja pienempiä lehtikortteja (ennen harvat ja isot, joten latvukset olivat kulmikkaita möhkäleitä);
  - palmujen lehdissä on 16 lehdykkää (oli 9), ja ne ovat kapeampia.
- **Tarkka malli ulottuu kauemmas:** noin 150 metriin (oli noin 100), joten vaihto ei näy niin lähellä, ja lähimmillä puilla on varjo pidemmälle.

## 2026-10-12 (sessio 42): takapakki – ei suttua, ei välkyntää, luonnollinen käsi

- **Käsi yöllä:** reunavalo on nyt hyvin hienovarainen. Käsi näkyy luonnollisen tummana eikä enää hehku.
- **Ei suttua liikkeessä:** liike-epäterävyys palautettiin session 25 voimakkuuteen, ja se on nyt oletuksena pois (myös vanhoista asetuksista kerran). Pelissä ei ole TAA:ta eikä muuta ajallista kertymää.
- **Vähemmän kohinaa kasvillisuudessa:** ambienttiokkluusio on oletuksena pois kaikilla laatutasoilla (sen kohina eli tuulessa liikkuvassa ruohossa). Asetuksista sen saa takaisin. Terävöinti on pois, ja ruohon alpha-to-coverage, mipmapit ja anisotropia (sessio 40) ovat ennallaan.

## 2026-10-12 (sessio 41): käden valaistus yöllä reunavalolla

- **Tasaiset täytevalot pois.** Käden ja esineiden materiaaleissa on nyt reunavalo (Fresnel): pimeässä vain ääriviivat erottuvat viileässä kuunvalossa, ja pinnan keskiosa jää varjoon. Päivällä reunavalo on lähes huomaamaton.
- **Himmeä taivasheijastus:** kädessä olevat esineet heijastavat taivasta (ympäristökartta, jonka voimakkuus seuraa taivaan kirkkautta). Terät ja kiviosat poimivat heijastuksen yöllä, ja puiset kahvat ovat hieman sileämpiä (kädessä kuluneita).
- **Maassa olevat esineet eivät muutu:** kädellä on omat kopiot materiaaleista.

## 2026-10-12 (sessio 40): kasvillisuuden reunat, taivas, syväterävyys ja käsi yöllä

- **Ruoho ei enää välky:** ruohokenttä käyttää nyt alpha-to-coveragea. Korsien reunat pehmenevät reunanpehmennyksellä, eivätkä ne enää tee portaita tai moiré-kuvioita kauempana (ennen kova leikkausraja). Lehdillä ja muilla kasveilla tämä oli jo käytössä, samoin peittävyyden säilyttävät mipmapit (`LinearMipmapLinearFilter`).
- **Anisotrooppinen suodatus suurimmaksi** (16 tai näytönohjaimen maksimi) maaston, lehtien, ruohon, metsänpohjan ja kasvimallien tekstuureille: viistossa näkyvät pinnat pysyvät terävinä eivätkä välky.
- **Terävöinti oletuksena pois.** Se korosti lehtien reunoja. Asetuksista sen saa takaisin.
- **Taivas päivällä noin 22 % tummempi,** ei puhkea valkoiseksi.
- **Syväterävyys lievempi:** tausta sumenee vasta kauempana ja vähemmän.
- **Ambienttiokkluusio hieman kevyempi.**
- **Käsi ja työkalut yöllä hieman tummempia.**

## 2026-10-12 (sessio 39): intro, hillitympi päivänvalo, liike-epäterävyys ja syväterävyys, käsi yöllä

- **Intro:** käyttäjän video soi pelin alussa ennen valikkoa ja latausta, ja peli latautuu taustalla. Ohitus: Esc, välilyönti tai hiiren oikea.
  - Jos selain estää äänellisen automaattitoiston, video alkaa äänettömänä ja näyttää vihjeen "Klikkaa: ääni päälle".
  - Jos video ei käynnisty 9 sekunnissa tai selain ei osaa toistaa sitä, intro ohitetaan.
  - Tiedosto on nimetty uudelleen: `assets/videos/intro.mp4`. Lisäksi sen hakemisto (moov) on siirretty alkuun häviöttömästi, joten toisto alkaa ennen kuin koko tiedosto on ladattu.
- **Päivä ei enää huku valoon:**
  - auringon suuntaan hohtava sironta noin puoleen (sademetsässä vielä vähemmän);
  - valokeilat ja valonsäteet miedommiksi;
  - silmän mukautuminen painottaa kirkasta taivasta enemmän, joten aurinkoon katsottaessa valotus laskee eikä taivas puhkea;
  - päivän valotus hieman matalampi.
- **Siistimmät reunat:** bloomin yläraja on matalampi (ei suuria hehkuläiskiä lehtien väleissä), ja terävöinti on puolet kevyempi.
- **Liike-epäterävyys:** noin 1,5 kertaa voimakkaampi (kevyt ja vahva).
- **Syväterävyys tarkennuksen mukaan:** lähelle katsottaessa tausta sumenee selvästi; kauas katsottaessa vain aivan kameran edessä oleva sumenee. Sumennus on isompi.
- **Käsi ja työkalut yöllä:** täytevalot noin kolmasosaan, ja kädelle tulee vain osa silmän mukautumisesta. Pimeys ja heijastukset näkyvät, mutta esineet eivät katoa mustaan.

## 2026-10-12 (sessio 38): terävämpi kuva, näkyvät työkalut pimeässä ja sademetsän valo

- **Ei enää sumeaa kuvaa:**
  - bloom hehkuu vain todella kirkkaista kohdista (kynnys 1,25 → 2,0), on heikompi ja pysyy tiiviimpänä (ennen kirkas taivas ja usva hehkuivat koko kuvan yli);
  - uusi kontrastiin mukautuva terävöinti (AMD CAS -tyyli) terävöittää reunat mutta ei kohinaa (asetus Terävöinti, oletuksena päällä).
- **Työkalut ja käsi pimeässä:** kädessä olevat esineet eivät enää muutu mustiksi.
  - kameraan kiinnitetyt täyte- ja reunavalo sekä hajavalon alaraja valaisevat vain kättä ja esineitä (eivät maailmaa, eivät varjoja), ja ne voimistuvat pimeässä;
  - silmän mukautuminen koskee nyt myös kättä: yöllä käsi kirkastuu samalla tavalla kuin maailma.
- **Sademetsä yöllä:** selvästi enemmän hajavaloa (latvuston alla ei ole kuunvaloa) ja enemmän silmän mukautumista. Lähiympäristö erottuu ilman soihtuakin.
- **Tummat sävyt säilyvät:** värimäärittelyn kontrastikäyrä ei enää tummenna valmiiksi tummia sävyjä (yöt ja varjot pysyvät näkyvinä).
- **Sademetsä päivällä:** usva on latvuston alla tummempaa ja korkeussumu ohuempaa, valokeilat ovat miedompia ja valotus hieman matalampi (ennen ylivalottunut).

## 2026-10-12 (sessio 37): grafiikka- ja valaistuspäivitys

- **Ambienttiokkluusio (SSAO):** kontaktivarjot ruohotuppaiden, puiden, kivien ja esineiden juurelle ja koloihin, joten mikään ei enää näytä leijuvalta. Okkluusio häipyy kaukana eikä tummenna usvaa tai taivasta. Asetus: Pois, Kevyt (8 näytettä) tai Laadukas (16 näytettä).
- **Bloom (hehku):** vain voimakkaat kohokohdat hehkuvat, kuten aurinko, soihtujen ja nuotioiden liekit ja kirkkaat heijastukset. Koko kuva ei vaalene. Myös kädessä olevan soihdun liekki hehkuu, koska käsi piirretään nyt samaan HDR-kuvaan kuin maailma.
- **Värimäärittely:** ACES-sävytyksen päälle hieman lisää kontrastia ja värikylläisyyttä. Valot ovat lämpimiä ja varjot syviä, ja niissä on hento ruskeanvihreä sävy (savannin maanläheiset värit). Lisäksi kevyt värisytys estää liukuvärien raidoittumisen.
- **Vinjetti:** hyvin kevyt reunojen tummennus.
- **Valaistus:**
  - päivän hajavalo (ambient) noin 60 %:iin entisestä, joten varjot ovat selvästi tummempia ja dramaattisempia (pilvisellä säällä hajavalo säilyy);
  - aurinko on hieman voimakkaampi;
  - silmän mukautuminen valottaa päivällä vähemmän (ei ylivalottunutta vaikutelmaa);
  - keskipäivän taivas on syvemmän sininen ja kaukausva vähemmän harmaa.
- **Kultainen tunti:** aamuun (klo 7.2) ja iltaan (klo 16.9) uudet valon avainkohdat. Matala aurinko värjää maiseman oranssiksi, ja auringonlasku on punaisempi.
- **Asetukset:** uudet säädöt Ambienttiokkluusio (Pois / Kevyt / Laadukas), Hehku (bloom), Värimäärittely ja Vinjetti. Laatutasot asettavat ne: Matalalla okkluusio ja bloom ovat pois, värimäärittely ja vinjetti päällä; Keskitasolla okkluusio kevyt; Korkealla ja Ultralla laadukas. Vanhat tallennetut asetukset saavat uudet arvot oman laatutasonsa mukaan.

## 2026-10-12 (sessio 36): isompi liekki tuulessa, leijuvat kipinät ja peukalo etusormen päälle

- **Soihdun liekki on noin 30 % isompi** (korkeampi ja leveämpi).
- **Liekki reagoi tuuleen selvästi:** tuuli kallistaa liekkiä ja puuskittaa (voimistuu ja heikkenee hetkittäin). Tuulessa liekki lepattaa kovemmin ja nopeammin: aallot kulkevat ylös tuulen suuntaan, ja kärki repsahtelee sivuille kuin lippu. Kova tuuli irrottaa myös enemmän kipinöitä.
- **Kipinät ja savu jäävät ilmaan,** kun soihdun ottaa pois kädestä (tai se sammuu). Ne leijuvat tuulen mukana ja hiipuvat rauhassa loppuun. Uusia ei synny.
- **Peukalo etusormen päälle:** nyrkissä ja kahvaotteessa peukalo lepää nyt etusormen keskijäsenen päällä eikä taitu sivulle alas. Kahvalla peukalo kiertää kahvan ympäri eikä mene sen läpi.

## 2026-10-12 (sessio 35): uusi soihdun liekki, peukalo ja valkoiset pisteet

- **Soihdun liekki kirjoitettu uusiksi** käyttäjän kuvauksen mukaan:
  - liekki on tilavuudellinen: neljä sisäkkäistä, pisaranmuotoista kuorta, joita 3D-simplex-kohina vääristää vertex-shaderissa, joten liekki lepattaa ja venyy ylöspäin;
  - kuoret häipyvät reunoiltaan, joten liekki näyttää täyteläiseltä joka suunnasta;
  - liekin akseli on aina ylös, ja kärki taipuu kaarelle tuulen ja soihdun liikkeen mukaan (jousi: laahaa ja heilahtaa takaisin);
  - hehkuvia kipinöitä ja tummia, laajenevia savukiehkuroita, jotka kulkevat tuulen mukana ja häipyvät;
  - väri kulkee valkokeltaisesta ytimestä oranssin kautta tummanpunaiseen reunaan, ja tyvessä on hento sininen.
- **Valkoiset pisteet ruudulla korjattu:** ne olivat soihdun kipinöitä, jotka jäivät jumiin näkyviin, kun soihtu laitettiin pois. Nyt kipinät ja savu piilotetaan ja tyhjennetään liekin mukana.
- **Nyrkin peukalo** taittuu vähemmän: se kulkee etu- ja keskisormen poikki eikä roiku alas.

## 2026-10-12 (sessio 34): tiukempi ote, uusi soihdun liekki ja rauhallisemmat iskut

- **Ote:** sormet puristuvat kahvaan tiukemmin, kärjet kiertyvät pidemmälle ja peukalo kiertyy kahvan yli nyrkin tapaan. Kahvan paksuus luetaan nyt luotettavasti myös malleista, joissa otekohdalla on vähän pisteitä (soihtu).
- **Soihdun liekki uusiksi:** liekki piirretään shaderilla. Siinä on nouseva, pyörteinen kohina, repeilevät liekkikielet, kuuma valkokeltainen ydin, oranssi ja punainen reuna ja sininen tyvi. Liekki ympäröi kangaspään. Fysiikka: liekki pyrkii aina ylöspäin, ja ilmavirta (soihdun liike, pelaajan liike ja kääntyminen sekä tuuli) kallistaa sitä. Liekki laahaa perässä ja taipuu kaarelle. Kipinöitä irtoaa ja ne leijuvat tuulen mukana. Sateessa liekki pienenee kuten ennenkin. Toimii kädessä ja toisessa kädessä.
- **Iskut ilman käden pyörimistä:** nuijan ja terien iskuissa ranne joutui ääriasentoihin, ja käsi kiertyi varren ympäri jopa ±0,7 rad ja takaisin. Kierto on nyt rajattu (±0,3 rad) ja hidastettu, ja lyöntien kärkiasentoja on loivennettu niin, että isku tulee käsivarresta.

## 2026-10-09 (sessio 33): uudet nuija ja soihtu, ihotekstuuri, kivipuukko ja norsu juomaan

- **Puunuija ja soihtu käyttäjän malleista:** nuija on nyt nuppipäinen, tekstuuroitu puunuija ja soihtu kangaspäinen, köydellä sidottu soihtu (väri-, normaali- ja karheustekstuurit). Ne näkyvät kädessä, toisessa kädessä (soihtu) ja maassa, ja kuvakkeet piirretään samoista malleista.
- **Iho:** käden pinnassa on nyt oikean ihon pintakuvio (ShareTextures, Human Skin 2): huokoset ja pienet rypyt, varjokohdat ja karheuden vaihtelu. Käden värit pysyvät ennallaan, mutta pinta ei näytä enää muoviselta.
- **Kivipuukko uusiksi:** lehden muotoinen, lohkottu piikiviterä, jossa on lohkaisuarvet molemmin puolin. Terä on kiiltävä (lakkapinta ja heijastukset), joten se välkkyy valossa. Kahva on pähkinäpuuta, ja sen yläpäässä on kierretty nyörisidos (ambientCG Wood051, Rope001 ja Rock030).
- **Norsu käy juomassa:** jano kasvaa vähitellen, ja kun se täyttyy, norsu etsii lähimmän veden (enintään 50 m), kävelee rantaan, kääntyy veteen päin ja juo: kärsä laskeutuu veteen, kiertyy suulle ja laskee taas.

## 2026-10-09 (sessio 32): pystyiskut nuijalla, nyrkki, lastut ja norsun jalat

- **Nuija iskee ylhäältä alas:** nuijan sarja on nyt kaksi pystyiskua (ennen sivuiskut oikealta ja vasemmalta). Vuorottelevat muunnelmat ovat suoraan ylhäältä, vinosti oikean olan yli ja kevyesti vasemman olan yli. Sama koskee moukaria (sivupyyhkäisy pois).
- **Kirves:** vaakahakkuu poistettiin vaihtoehdoista; jäljellä ovat hakkuut ylhäältä ja vinosti.
- **Nyrkki:** peukalo lepää nyt etu- ja keskisormen päällä (ennen se taittui pitkälle alas sormien yli).
- **Nyrkkiiskut** lähtevät ja osuvat hieman ylempää (tappelun tuntu).
- **Lastut ja kaarnahiutaleet:** kun puuta, kaadettua runkoa, pensasta tai baobabin kuorta hakkaa, osumasta pöllähtää pieniä vaaleita lastuja ja tummia kaarnahiutaleita. Ne leijailevat hetken ja häviävät maahan. Termiittikeosta murenee punaruskeita muruja ja pensaista lehti- ja oksanpaloja. Kivestä niitä ei tule.
- **Norsun jalat:** mallin lepoasennossa osassa jalkoja sääri oli vinossa eteen, joten polvi näytti taipuvan taaksepäin. Polvi suoristetaan nyt lepoasennossa, ja jaloissa on nilkka, joka pitää jalkapohjan vaakatasossa maata vasten (nostossa varpaat painuvat hieman).
- **Norsun pää ja kärsä liikkuvat enemmän:** pää nyökkää askelten tahdissa ja kääntyilee katsellen ympärilleen, kärsä heiluu laajemmin ja nousee välillä haistelemaan.

## 2026-10-08 (sessio 31): norsu savannille, jousen vasen käsi, puukon ote ja haamun viitta

- **Norsu:** savannilla kävelee nyt norsuja (käyttäjän malli), yksin tai pareittain. Mallissa ei ollut luurankoa eikä animaatioita, joten peli rakentaa sille luut ja painot latauksessa: jalat (lonkka ja polvi), pää, kolmiosainen kärsä, korvat ja häntä.
- **Norsun kävely:** sivuttaiskäynti kuten oikealla norsulla (vasen taka, vasen etu, oikea taka, oikea etu). Tukijalka pysyy maassa paikallaan, eikä jalka liu'u, ja nouseva jalka koukistuu. Runko keinuu ja kallistuu askelten ja rinteen mukaan. Kärsä heilahtaa askelten tahdissa ja laiduntaessa poimii ruohoa. Korvat leyhyvät, ja häntä huiskii.
- **Norsun käytös:** laiduntaa ja vaeltaa rauhallisesti, ja pari pysyttelee yhdessä. Liian lähelle tulevaa pelaajaa se katsoo korvat levällään ja lähtee sitten verkkaisesti pois. Lyötynä se lähtee ripeämmin, mutta ei kuole eikä pudota mitään (avoin kysymys). Norsu on kiinteä este, joka tönäisee pelaajan sivuun, ja osumat, nuolet ja nimilappu toimivat koko rungon pituudelta. Testausta varten [F3] → Olennot → Norsu.
- **Jousi:** jänteen käsi heiluu nyt juostessa samassa tahdissa kuin muu käsi (ennen se jäi paikalleen).
- **Puukko:** kämmen pysyy kahvassa myös laajoissa sivuttaisiskuissa (esine seuraa nyt ranteen todellista paikkaa).
- **Haamun viitta jäykemmäksi:** kangas pyrkii takaisin viitan muotoon (hartioilla jäykkä, helmassa vapaampi), poikkeama muodosta on rajattu, ja taivutusjäykkyys estää kangasta laskostumasta kasaan. Osa haamun liikkeestä kantaa kankaan mukana, joten nopeassa sivuttaislennossa helma ei enää painu kasaan, vaan viitta pysyy kokonaisena.
- **Haamun hihat:** hihoissa on oma kangasfysiikkansa. Ne ovat leveät, riekaleiset ja kirjaillut kellohihat, jotka lepattavat ja laahaavat liikkeen perässä. Kun käsi nousee, hiha valuu kohti olkaa.

## 2026-10-08 (sessio 30): ote kahvasta, sormet kahvan ympäri, jousi, juoksu ja hakatut puut

- **Ote kahvasta ("socket"):** jokaisen esineen kahvan keskipiste ja paksuus luetaan esineen mallista, ja käsi asettuu sen kohdalle. Kahva lepää kämmentä vasten.
- **Sormet kiertyvät kahvan ympäri:** jokainen nivel koukistuu tyvestä kärkeen, kunnes sormi koskettaa kahvan pintaa, joten sormet eivät mene kahvan läpi eivätkä solmuun. Peukalo kiertää vastakkaiselta puolelta. Veitsen ohut kahva saa tiukan otteen ja paksu keppi väljemmän. Toimii myös vasemmassa kädessä (soihtu, kilpi, jousi, hyppyiskun kahden käden ote).
- **Ei reikiä sormissa:** käden pinta piirretään molemmin puolin, ja nivelten koukistus on rajattu luontevaksi.
- **Jousi:** käsi pitää kahvaa nuolen alapuolelta, ja nuoli lepää käden päällä.
- **Juoksu:** myös vasen käsi (kilpi, soihtu) ja jousi heiluvat kävellessä ja juostessa, vuorotahdissa oikean käden kanssa. Oikean käden juoksutärinää pienennetty ja otteen kierto tasoitettu.
- **Iho** vähemmän punertava.
- **Hakatut puut:** kun kaadettu runko hakataan palasiksi, palat saavat saman kaarnapinnan kuin puu. Pinnat ovat sileät (ennen jokainen kolmio näkyi), ja rungon palat ovat umpinaisia ja sisältä tuoretta puuta. Sademetsäpuun hakattavan rungon porras korjattu.

## 2026-10-08 (sessio 29): uudet kädet, pehmeät animaatiot, juuret ja tähdenlennot

- **Uudet kädet:** pelaajan käsi on nyt käyttäjän antama malli (FPS Female Arms) omilla tekstuureillaan. Molemmat kädet näkyvät: oikea pitää työkalua tai asetta, vasen kilpeä, soihtua tai jousta, ja hyppyiskussa molemmat tarttuvat varteen. Muuten vasen käsi lepää näkymän alapuolella.
- **Luonteva ote:** kyynärpää ja olkapää lasketaan käänteiskinematiikalla (IK), ja ranne pysyy anatomisissa rajoissa (koukistus, sivutaivutus, kierto). Käsi saa kiertyä kahvan ympäri luontevimpaan asentoon, ja isku tehdään olkapäällä ja kyynärpäällä, ei ranteella. Varsi kulkee kämmenen poikki vinosti kuten oikeassa nyrkkiotteessa.
- **Sormet:** otteet mallin omista asennoista (nyrkki, kivääriote). Varsi: sormet kahvan ympäri. Pienet esineet ja ruoka kämmenellä. Tyhjä käsi on rento, ja lyödessä se puristuu nyrkkiin. Jousen jänne vedetään koukussa olevilla sormilla, ja poimiessa käsi avautuu. Sormet liukuvat asennosta toiseen.
- **Iho mattapintaiseksi:** karheutta lisätty, heijastusta heikennetty, ihonalainen sironta (valon ja varjon raja punertaa pehmeästi) ja hento nukkahohde. Ei muovista kiiltoa.
- **Kahvat kämmenen keskelle:** veitset, tikarit, viidakkoveitsi ja miekat pidetään kahvasta (ennen käsi osui terän juureen); nuija pidetään lähempää varren päätä.
- **Todella pehmeät animaatiot:** iskut kestävät noin 35 % pidempään, mutta taistelun tahti on ennallaan, koska palautus käyttää osan jäähdytysajasta. Lyöntihetki tulee noin 12 % myöhemmin. Käden liike kulkee jousen läpi: liike käynnistyy ja pysähtyy pehmeästi, ja ranne laahaa hieman käsivarren perässä. Isku jatkuu osuman läpi (jatkoliike) ja palautuu rauhallisesti. Myös torjunta nousee ja laskee pehmeämmin, osuman pysäys on lempeämpi, ja esineen vaihto, poiminta ja syöminen ovat hitaampia ja pehmeämpiä.
- **Ikivanhat juuret** ovat nyt yksi yhtenäinen, kapeneva putki (ennen erillisistä lieriöistä, joiden saumoista näki läpi).
- **Tähdenlennot** tulevat hieman useammin (5–22 s välein, ennen 8–38 s). Kärki hiipuu loppumatkalla, ja vana jää hehkumaan ja häipyy pehmeästi.

## 2026-10-08 (sessio 28): haamun vartalo, lahopuu, bambu ja hakatut puut

- **Korjattu: haamun vartalo (viitta) ei näkynyt.** Jokainen haamu saa nyt oman kangasviittansa.
- **Lahopuun kuori uusittu:** haalistunut harmaa kuori (Poly Haven bark_willow_02, CC0) normaalikarttoineen. Korjattu: kuoren kuva venyi pitkiksi oransseiksi raidoiksi (tekstuuria ei toistettu rungon pituudella).
- **Uusi bambu:** pyöreät, kaartuvat varret, tummat nivelrenkaat ja vahamainen vyö niiden yläpuolella, vihreitä ja kellertäviä varsia, kuivia tuppia tyvellä, sivuoksat ja kapeista lehdistä tehdyt roikkuvat lehtiviuhkat. Kaukana kevyempi versio.
- **Hakattu ja kaatunut puu pysyy siistinä:** lovet ja pilkotut kohdat varjostetaan pehmeästi (ennen jokainen isku teki rungosta särmikkään).
- **Rungot jatkuvat latvukseen kapenevana** (ennen runko päättyi tylppänä latvuksen alle); oksat pyöreämpiä.
- **Selkeällä säällä vähemmän sumua:** sumu alkaa vasta noin kolmanneksen päästä näköetäisyydestä; kaukana on yhä hentoa utua.

## 2026-10-08 (sessio 27): liaanien fysiikka, kookokset, haamun viitta ja uudet puut

- **Liaanien fysiikka:** liaanit ovat nyt köysiä, jotka roikkuvat painovoiman mukaan, heiluvat tuulessa ja heilahtavat sivuun, kun pelaaja kävelee niihin (pää ja vartalo työntävät). Kun puu kaadetaan, liaanit seuraavat kaatuvaa latvaa ja maahan kiinnittyneet repeävät irti. Kun kaatunut runko pilkotaan, liaanit putoavat. Liaanit ovat ohuempia ja niissä on lehtiä (ennen paksut, kaarevat sauvat).
- **Kaatuvan puun lehdet** laahaavat kaatumisen perässä ja heilahtavat eteen, kun runko iskeytyy maahan.
- **Kookospähkinät palmujen latvassa:** [E] ravistaa palmua (1–2 putoaa), lyönti runkoon pudottaa joskus yhden, ja kaadetusta palmusta putoavat kaikki. Pähkinät kasvavat takaisin (yksi 6 pelitunnin välein), joten niitä voi "farmata". Tila tallentuu.
- **Haamun viitta** on oikea kangas: se laskeutuu hartioilta, laahaa liikkeen perässä, lepattaa ja hulmuaa. Uusi tekstuuri: tumma kulunut kudos, riekaleinen helma ja himmeästi hohtavat violetit kirjailut.
- **Uusi baobab:** leveä pullorunko pystyuurteineen ja kuhmuineen, paksut mutkittelevat oksat kolmessa haarautumistasossa, harvat lehtitupsut ja pitkävartiset hedelmät.
- **Sademetsän puut:** latvus koostuu monesta lehtiryppäästä haarautuvien oksien kärjissä (luonnollisempi, rosoinen siluetti, aukkoja valolle). **Pönkkäjuuret** ovat sileitä ja kaarevia; **kannot ja hakatut rungot** pysyvät pyöreinä.
- **Banaanit:** pystymmät, kapeammat lehdet, vaalea alapinta (ei enää mustia alapintoja), vähemmän repeämiä, ohuet kuivat lehdet ja levenevä tyvi.
- **Lahopuu kaatuu** kuten muut puut (ennen hajosi palasiksi) ja jää maahan pilkottavaksi.
- **Lammikot sademetsään** maaston kuoppiin: vesi täyttää notkon reunan matalimpaan kohtaan asti.
- **Kaislat jokaisen vesistön varrella** (joet, purot, järvet, lammet, keitaat), ei hiekkarannoilla.
- **Leijuvat pisteet:** lehtiatlaksen ohuet tummat varret poistettiin, kaukaisten lehtien tiheyttä ei enää vahvisteta liikaa (tummat neliöt), ja lehtien reunat pehmenevät (alpha to coverage).
- **Silmän tottuminen** näkyy selvemmin: ylös kirkkaaseen katsottaessa metsä tummuu ja alas katsottaessa silmä tottuu hitaasti takaisin.
- **Selkeä yö** hieman tummempi; **aavikon tuuli** hiljempi; **viidakon taustaääni** ei enää katoa (toistoa yritetään uudelleen); **jalanjäljet** taas isommat (~1,45×).

## 2026-10-08 (sessio 26): lehtilatvukset, valokeilat, palmut, simpukat ja jalanjäljet

- **Puiden latvukset pelkistä lehdistä:** kiinteä ydin poistettiin kokonaan kaikista lehtipuista ja tiheiköistä; alta katsottuna näkyy nyt lehtiä, ei harmaita möhkäleitä. Lehtikortteja on tiheämmin, myös latvuksen alapinnalla.
- **Valokeilat latvuston läpi:** auringonvalo paistaa näkyvinä keiloina latvuston aukoista (sademetsässä, aamu-usvassa ja utuisella säällä). Keilat lasketaan auringon varjokartasta, joten ne tulevat oikeista kohdista. Tasaisesti valaistu ilma ei utuunnu.
- **Vähemmän usvaa sademetsässä selkeällä säällä.**
- **Lehdet eivät enää kiillä** (märkyyden kiilto lehdiltä pois; rungot, kivet ja maa kiiltävät yhä sateella).
- **Korjattu: lehtien lähellä leijuvat pikselit.** Syy oli lehtitekstuurien mustat reunat ja kaukana harvenevat lehdet. Nyt läpinäkyvät reunat saavat lehden värin, ja kaukaiset lehvästöt säilyttävät tiheytensä (myös ruoho ja kukat).
- **Uudet palmut:** oikeat sulkalehdet (kymmeniä riippuvia lehdyköitä), rengaskuvioinen runko, tyvipaksunnos ja juuret, lehtitupet latvassa, muutama kuivunut lehti, kookospalmuissa kookostertut. **Doumpalmussa** viuhkalehdet taitetuista liuskoista.
- **Uudet banaanit:** isot melamaiset lehdet, jotka tuuli on repinyt suikaleiksi, kuivuneet lehdet varren ympärillä, sivuversot sekä joskus banaaniterttu ja punavioletti kukka.
- **Simpukat poimittavia ja hienompia:** kampasimpukka (harjanteet, saranan korvat, kasvurenkaat), sydänsimpukka, täplikäs kauri ja kierteinen tornikotilo. Rannoilla niitä on enemmän. Uusi esine: **Simpukankuori**.
- **Jalanjäljet isompia ja kolmiulotteisia:** kantapää, päkiä ja varpaat painuvat hiekkaan ja ympärille nousee valli; auringon suunta valaisee painauman seinämät.
- **Lyönteihin lisää animaatioita:** raskas hakkuu (ennakoiva notkahdus ja syvä jälkiheilahdus), vaakahakkuu, harhautus ja suora, ylhäältä kaartava isku, jyrkkä vinoviilto, matala nouseva rystyviilto, syöksypisto ranteen kierrolla ja nuijan sivupyyhkäisy. Jokaisella iskutyypillä on nyt 3–5 muunnelmaa.
- **Musiikki ja äänet:** musiikki vaihtuu biomin mukaan nopeammin (kappale soi vähintään 10 s, ennen 20 s). Jos toisto jää tauolle, sitä yritetään uudelleen; jos musiikkitiedosto puuttuu, soi valikon kappale ja [F3] kertoo puuttuvan tiedoston. Aavikon tuuli kuuluu nyt selvästi, ja savannilla on hiljainen tuuli (ennen lähes äänetöntä).
- **Liaanit** ilman pieniä lehtitupsuja (ne näkyivät kaukaa leijuvina pisteinä).

## 2026-10-08 (sessio 25): valaistus, silmän mukautuminen, rannat ja iskut

- **Silmän mukautuminen:** valotus mukautuu kuvan kirkkauteen: pimeään noin 3 sekunnissa, kirkkaaseen nopeammin. Soihdun valaisema lähiympäristö "sokaisee": kaukaiset pimeät alueet tummuvat, ja kun soihdun laskee, silmä tottuu pimeään ja siluetit alkavat erottua.
- **Hämärä ja yö:** varjoissa ja hämärässä enemmän hajavaloa, joten maaston muodot ja siluetit erottuvat iltataivasta vasten.
- **Korjattu:** sumu, sade ja ukkonen kirkastivat yötä. Nyt ne pimentävät sitä.
- **Lehdet kuultavat valoa:** vastavaloon lehdet hehkuvat, ja latvusten varjopuoli on vihertävä eikä musta.
- **Syväterävyys hillitympi** (tausta sumenee vasta kaukana ja vähän), **liike-epäterävyys runsaampi**.
- **Korjattu:** sateessa ylös katsottaessa ilmassa leijui tummia "pikseleitä" (päästä nähtyjä sadepisaroita).
- **Korjattu:** puuta kaadettaessa ja sen hajotessa lehdet muuttuivat umpinaisiksi neliöiksi, ja latvuksen kulmikas ydin paljastui. Myös tiheiköiden ydin on nyt piilossa lehtien alla.
- **Rannat ja merenpohja:** levää ja pohjakiviä järvien ja meren pohjassa, rantakivikoita vesirajassa, tiheämmät kaislikot, hiekkarannoilla pieniä kiviä ja ajautuneita simpukoita.
- **Jalanjäljet** jäävät hiekkaan (aavikko, dyynit, rannat) ja haalistuvat hiljalleen. **Matalassa vedessä** jokainen askel roiskaisee.
- **Iskut sulavammat ja monipuolisemmat:** liike kulkee pehmeästi asentojen läpi, ja jokaisella iskutyypillä on useita muunnelmia (vino hakkuu, alakoukku, vaakaviilto, nouseva viilto, kiertävä pisto, olan yli murskaus), jotka vuorottelevat.
- **Kello näyttää ajan vain, kun se on kädessä** (valittuna pikapalkista).
- **Kuu** on nyt oikean kuun valokuva (käyttäjän kuvasta, 128 px).

## 2026-10-08 (sessio 24): stilisoitu realismi – pehmeä maasto, tiheä kasvillisuus ja tunnelma

- **Pehmeämpi maasto:** mäet, harjanteet, dyynit, vuoret ja jokiuomat eivät enää taitu teräviksi särmiksi, vaan kaartuvat pehmeästi. Maaston verkko on tiheämpi (1,33 m, ennen 2 m).
- **Tiheä ruoho:** savannilla laajat kultaiset heinäniityt ja korkean heinän (Andropogon) laikut, kausilammilla ja keitailla rehevä vihreä heinikko ja sarat vesirajassa, vuorilla lyhyt nurmi. Ruoho huojuu tuulen puuskissa aaltoina, taipuu pelaajan tieltä ja hehkuu vastavalossa. Kaukana ruoho painuu pehmeästi maahan.
- **Kerroksellinen metsänpohja:** sademetsän pohjalla tiheästi saniaisia, lehväkasveja, apilamattoja ja lehtiyrttejä, sekä 3D-saniaisia, sieniä, kukkia ja sammaleisia kiviä (Quaternius, CC0). Maastossa laikuittain sammalmattoa.
- **Liaanit ja köynnökset:** sademetsän puista roikkuu lehteviä liaaneja, ja osaa rungoista kiertää köynnös.
- **Ympäristön tarinankerronta:** murenevia muinaisia kivipylväitä (kaatuneita rumpuja vieressä, sammalta yläpinnoilla), maahan jääneitä ruostuneita kilpiä (joskus katkenneen miekan kanssa) ja maasta kaarina nousevia ikivanhoja juuria.
- **Vanhat rauniot:** kivet sammaloituneita, puu harmaantunutta.
- **Kuolleet puut** vaihdettiin valmiisiin, harmaantuneisiin malleihin.
- **Tunnelma:** maata myötäilevä korkeussumu laaksoissa, sademetsässä, sateella ja aamuisin; leijuvat itiöt sademetsän valossa; hieno usvapisara sateella; sadepisarat roiskuvat maahan kruunuina.
- **Uusi asetus: Kasvillisuus** (harva / normaali / tiheä) grafiikka-asetuksissa.

## 2026-10-08 (sessio 23): realistisempi ulkoasu, osa 1

- **Maasto** saa oikeat valokuvatekstuurit ja pinnanmuodot (normaalikartat): hiekka, kuiva savannimaa, sademetsän karike ja kallio sekoittuvat biomien mukaan. Biomien värisävyt säilyivät.
- **Puiden latvukset** ovat nyt lehtiä (akasioissa pariliuskaiset lehdet, muissa leveät lehdet) eivätkä kulmikkaita möhkäleitä. Myös pensaat ja sademetsän tiheiköt.
- **Rungoissa ja oksissa kaarna**, kivissä ja kallioissa kivipinta, termiittikeoissa maa, hylyissä, veneissä ja rakennelmissa lautapinta.
- **Lohkareet** ovat oikeista kivistä skannattuja malleja (Poly Haven).
- **Korjattu:** baobabin kuorinta ei näkynyt rungossa.
- Kaikki ulkopuoliset tekstuurit ja mallit ovat CC0-lisensoituja (assets/CREDITS.txt).

## 2026-10-08 (sessio 22): tasot, puulajit, panssarit ja baobabin kaato

- **Työkalujen ja aseiden tasot:** puu, kivi, piikivi, kupari, rauta ja rubiini. Kirveet ja hakut kaikilla metallitasoilla, ja paremmat työkalut hakkaavat nopeammin. Uusia aseita: piikivitikari, kupari- ja rautamiekka, rubiiniterä, Verikide, kivinuija, kuparimoukari, piikkinuija, seiväs ja rautakeihäs. Kaikilla tasoilla ei ole kaikkea.
- **Rubiini on mystinen:** rubiiniesineet hehkuvat punaisena, rubiiniaseen osuma palauttaa hiukan terveyttä, ja rubiiniotsaripa parantaa haavoja hitaasti.
- **Uudet jouset:** jalopuujousi, ydinpuujousi ja rubiinijousi. Uudet nuolet: kupari ja rauta.
- **Kilvet:** nahka-, kupari- ja rautakilpi (eri torjunta-arvot). Varustettu kilpi näkyy kädessä omana mallinaan.
- **Panssarit:** riepu-, nahka-, luu-, kupari-, rengas- ja rautapanssareita sekä rubiiniotsaripa (pää, keho, jalat). Panssari vähentää olentojen iskujen vahinkoa.
- **Puulajit:** peruspuuta pensaista, tumbleweedeistä ja akasioista, jalopuuta sademetsäpuista (vaatii piikivikirveen) ja ydinpuuta kapokkipuista (kuparikirves) ja baobabeista.
- **Baobabin voi kaataa:** ensin kuoritaan ulkopuu (runko kapenee ja vaalenee, irtoaa puuta), sitten ytimen voi kaataa rautakirveellä. Kaatunut baobab antaa ydinpuuta.
- **Poistettu:** simpukankuori ja terälehdet (kukat ja simpukat jäivät maailmaan koristeiksi).
- Kupari, rauta ja rubiini saa toistaiseksi vain kehittäjätyökaluista ([F3] → Esineet → Metallit / Taso…).

## 2026-10-08 (sessio 21): hyppyisku, taintuminen, satunnainen kuu ja keularoiskeet

- **Hyppyisku:** hyppää ja iske kirveellä tai nuijalla ilmasta: pelaaja tarttuu aseeseen kahdella kädellä ja iskee ylhäältä. Osuma on kriittinen (noin kaksinkertainen vahinko), siitä lähtee kipinöitä ja pölyä, kuuluu matala jysähdys ja tähtäimestä laajenee rengas.
- **Parry ilman tekstiä:** torjuttu vihollinen lentää taaksepäin ja taintuu: se retkahtaa, huojuu ja sen pään ympärillä kiertää pieniä tähtiä. Iskun kohdassa välähtää pieni kipinäpurske.
- **Kohteen nimi tulee esiin pehmeästi:** pieni, nopea nousu ja terävöityminen.
- **Haamun äänet hiljemmiksi.**
- **Korjattu:** kuun reunassa näkyi outo harmaa kehä.
- **Kuu on joka yö erilainen** (satunnainen vaihe). Täysikuulla vihollisia on yhä enemmän, mutta siitä ei enää ilmoiteta tekstillä.
- **Savipeikon nousu maasta:** maa pöllähtää, kokkareita lentää ja maa hehkuu hetken oranssina kipinöiden noustessa.
- **Maahan pudotetut esineet katoavat 10 minuutissa.**
- **Kello** on nyt kartan vieressä (ei päällä), ja sen alla näkyy kellonaika numeroina.
- **Keularoiskeet linssillä:** myrskyssä purjehtiessa, kun katsoo eteenpäin ja keula iskeytyy aaltoon, vettä lentää ruutuun: kuva vääristyy hetken, ja pisarat valuvat alas ja haihtuvat.

## 2026-10-08 (sessio 20): yön hiljaisuus, Kello, toinen käsi, reppu kuten Minecraftissa

- **Korjattu:** nopea siirtyminen biomista toiseen kehittäjätyökaluilla jätti maailman tyhjäksi ja valkoiseksi (kaksi latausta veti maailmaa eri suuntiin); nyt uusi siirto peruu edellisen.
- **Kuumuusväreily** selvästi pienempi ja vain aivan horisontissa. **Linnunrata** himmeämpi.
- **Termiittikeolla** (ja kandelaaberipuulla ja kalliomuodostelmilla) on nimi.
- **Yöllä musiikki hiljenee:** vain luonnon äänet. Musiikki palaa aamulla.
- **Uusi esine: Kello.** Löytyy arkuista (n. joka 8. arkku). Kun kello on repussa, kartan reunassa näkyy kellotaulu.
- **Toinen käsi:** kilpi tai soihtu toiseen käteen hiiren oikealla repussa tai [F]:llä, kun se on kädessä. Soihtu palaa vasemmassa kädessä, ja oikealla voi pitää kirvestä tai asetta.
- **Reppu:** klikkaus ottaa pinon ja seuraava klikkaus laskee sen (raahaus toimii yhä); kursorissa oleva esine sykkii hennosti. **Ctrl + hiiren oikea** avaa pinon jakoikkunan. Varustetut esineet vihreällä taustalla.
- **Pinot:** materiaalit 50, ruoat 20.
- **Valmistus kestää hetken** (n. 2 s): nappi täyttyy ja siinä lukee "Valmistetaan…".

## 2026-10-08 (sessio 19): eläväisemmät viholliset, uusi reppu ja valmistus

- **Pahkasiat ja savipeikot liikkuvat ovelammin:** ne kiertävät pelaajaa ennen hyökkäystä ja perääntyvät iskun jälkeen ennen kuin tulevat uudelleen. Savipeikot vuorottelevat (enintään kaksi hyökkää kerralla, muut kiertävät).
- **Savipeikko on vahvempi** (enemmän terveyttä ja vahinkoa, hieman nopeampi).
- **Linnun ääni alkaa pehmeästi.**
- **Kirves on taas raskas:** yksi hidas isku, ei sarjaa.
- **Kaatuva puu murskaa alleen pensaita ja pieniä kasveja** osuman voiman mukaan.
- **Uusi reppu:** esineitä raahataan hiirellä, Shift+klikkaus siirtää pikapalkin ja repun välillä, hiiren oikealla raahaaminen jakaa pinon, hiiren oikea syö tai varustaa, repusta ulos raahattu pino putoaa maahan. Työkaluvihje näyttää tiedot. Varustetut esineet merkitään repussa.
- **Valmistus omassa ikkunassaan** repun toisella puolella: vain tässä paikassa tehtävät reseptit, valitse resepti ja paina Valmista (×1 / ×5 / kaikki).
- **Pikapalkissa 6 paikkaa**, reppu 30 paikkaa (vanhat tallennukset siirtyvät automaattisesti).
- **Panssarin näyttö** terveyden vieressä (kilpi ja numero; näkyy, kun panssareita lisätään).
- **Minikartan uusi kehys:** kompassirengas asteikkoineen ja ilmansuuntineen.
- **Terveyspaneeli ja pikapalkki hieman isompia**, pikapalkki samaa lasityyliä.
- **Opas piilossa**, avataan [T]:llä.

## 2026-10-07 (sessio 18): tasapainotus, soihtu sateessa, vähemmän tekstiä

- **Soihtu ei näytä sammuvan sateessa:** liekki heikkenee ja yskii, mutta palaa. Se sammuu vain uidessa.
- **Kestävyys kuluu hieman hitaammin** (juoksu, uinti, iskut, hypyt, jousi).
- **Paraneminen on nopeaa vain 30 s syömisen jälkeen**, muuten neljäsosanopeudella.
- **Taistelu:** kirveellä ja nuijalla lyhyt kahden iskun sarja; viidakkoveitsen sarja selvästi rauhallisempi.
- **Puut:** ei enää tekstiä "Tarvitset kirveen". Puuta voi lyödä millä vain, mutta ilman kirvestä vahinko on mitätön. **Kivet:** "Liian kovaa!" ilman hakkua.
- **Ei enää tekstejä** torjunnasta, väsymyksestä eikä haamuista. Kun kestävyys loppuu, kestävyyspalkki hehkuu hennosti punaisena.
- **Aavikon kuumuusväreily** on hillitympi.
- **Jousi jännittyy hitaammin.**
- **Olentojen nimilaput** tulevat vasta, kun tähtäin osuu olentoon (ei esteen läpi).

## 2026-10-07 (sessio 17): moderni ilme, nimilaput vain katsottaessa, jousen tähtäin

- **Puu poistettu käyttöliittymästä:** paneelit ovat puhtaasti modernia savulasia.
- **Olentojen nimilaput ja palkit näkyvät vain läheltä ja katsottaessa** (ei enää kaukaa). Lyödyn olennon lappu pysyy hetken näkyvissä taistelussa. Laput tulevat ja häipyvät pehmeästi.
- **Jousen tähtäin:** plus-tähtäin, joka kiristyy jännitettäessä, ja sen alla pieni valkoinen jännityspalkki.
- **Nuolten määrä** näkyy pikapalkin vieressä, kun jousi on kädessä.
- Korjaus: harvinainen musiikin äänenvoimakkuusvirhe ei voi enää pysäyttää peliä.

## 2026-10-07 (sessio 16): uusi fontti, naulat ja pehmeät animaatiot

- **Uusi fontti Philosopher** koko pelissä (valikon Sahel-logo pysyy ennallaan).
- **Naulat puukylttien kulmissa.**
- **Pehmeät mutta napakat animaatiot:** palkit liukuvat uuteen arvoon (vahinko lähes heti, parannus pehmeästi), osumasta pieni tärähdys ja välähdys, terveysnumero hypähtää isommasta muutoksesta, kestävyys liukuu esiin ja häipyy, ruoat ponnahtavat esiin ja kutistuvat pois muiden liukuessa paikoilleen, pikapalkin valinta ja viestit liukuvat.
- **Loppuva ruoka** (viimeinen minuutti) välkkyy hennosti himmeten, ja sen ympärillä on pieni oranssi hehku.

## 2026-10-07 (sessio 15): savulasi ja puukyltit

- **Uusi ilme terveydelle, ruoille ja kestävyydelle:** moderni läpikuultava savulasipaneeli, jonka vasemmassa reunassa on rustiikkinen puukyltti ikonille. Palkit ovat ohuita ja siistejä, värit hillityt.
- Syödyt ruoat lasiympyröinä terveyspaneelin yläpuolella; ohut kaari kertoo jäljellä olevan ajan (oranssi, kun vaikutus hiipuu).
- Terveyden numero näkyy himmeänä ja kirkastuu hetkeksi, kun terveys muuttuu.
- Kestävyys samassa tyylissä keskellä alhaalla, vain kun sitä kuluu.

## 2026-10-07 (sessio 14): uusi ruokajärjestelmä ja veistetyt puupalkit

- **Syödyt ruoat nostavat maksimiterveyttä ja -kestävyyttä:** ilman ruokaa maksimit ovat 25, ruoat nostavat ne enintään 100:aan. Jokainen ruoka vaikuttaa 5–20 min ja hiipuu lopussa. Ruokia saa syödä rajattomasti, kunnes maksimiterveys on 100. Liha ja padat painottavat terveyttä, hedelmät ja juomat kestävyyttä.
- **Nälkäpalkki poistui**, eikä nälkään enää kuole. Uusi peli alkaa lähtöeväillä.
- **Terveys veistetyllä puulaudalla** vasemmassa alakulmassa: muotoillut päät, kaiverretut kuviot, köysisidokset, messinkiniitit ja kulumat, valo ja varjot kuin oikeassa puussa. Veripisara-ikoni. Maksimin yläpuolinen osa näkyy lukittuna. Numero näkyy hetken, kun terveys muuttuu.
- **Kestävyys Valheimin tapaan** vaakapalkkina ruudun alaosan keskellä; näkyy vain kun sitä kuluu.
- **Syödyt ruoat puisina kiekkoina** terveyslaudan vieressä; kaari näyttää jäljellä olevan ajan.
- Värit hillityt (viininpunainen ja okra).

## 2026-10-07 (sessio 13): fontti, nimilaput, pystypalkit, kaatuvat puut, soihtu, kuun vaiheet, lammikot

- **Kaikki teksti Eagle Lake -fontilla** (sama kuin valikon logossa): valikot, HUD, viestit, kartat ja minikartta.
- **Nimilaput seuraavat kohdetta:** lähellä olevilla eläimillä ja vihollisilla on nimi ja kestävyyspalkki niiden yläpuolella. Puiden, pensaiden, kivien ja esineiden nimi näkyy kohteen kohdalla, kun niihin katsoo, eikä niillä ole kestävyyspalkkia.
- **Huomattu-merkki:** silmä palkin alla, kun olento on huomannut pelaajan (punainen ja sykkivä, kun se hyökkää).
- **Terveys-, kestävyys- ja ruokapalkit** ovat nyt pystyssä vasemmassa alakulmassa, ja niissä on ikonit (sydän, salama, ruokakulho).
- **Kaatuva puu voi satuttaa ja tappaa** pelaajan tai olennon, ja se voi kaataa toisia puita (ketjureaktio).
- **Soihtu sammuu vedessä** (sytytetään uudelleen nuotiolla) ja **palaa sateessa heikosti ja yskien**.
- **Kuun vaiheet:** uusikuu, kuunsirppi, puolikuu ja täysikuu vaihtuvat 8 vuorokauden kierrossa, ja kuunvalo vaihtelee niiden mukana. Illalla kerrotaan kuun vaihe. **Täysikuulla vihollisia syntyy enemmän.**
- **Lammikot eivät enää leiju:** ne asetetaan piirretyn maaston pintaan ja vain tasaiselle maalle.

## 2026-10-07 (sessio 12e): linssiheijastukset, äänimiksaus, iskuäänet, soihtu, Shift+Q

- **Linssiheijastukset:** aurinkoa kohti katsottaessa auringon ympärillä hehkuu ja säteilee, ja kuvan poikki näkyy värillisiä heijastuksia. Heijastukset häviävät, kun aurinko on puiden tai maaston takana tai pilvien peitossa. Asetuksissa uusi valinta **Linssiheijastukset**.
- **Syväterävyys ja linssiheijastukset ovat oletuksena päällä** (keskitasolta ylöspäin; myös vanhoissa asetuksissa kerran).
- **Vesipisarat linssillä** tulevat nyt vain purjehdittaessa ukkosmyrskyssä, ja hyvin hillitysti.
- **Haamuja tulee hieman harvemmin** (myös ukkosmyrskyssä).
- **Äänet erottuvat paremmin:** puun hakkaaminen ja kaatuminen, iskut ja Haamun äänet painavat hetkeksi musiikkia, sadetta ja tuulta hiljemmaksi (väistö).
- **Uusi iskuääni**, kun lyö elävää olentoa (kaksi ääntä, vaihteleva korkeus, hillitty voimakkuus).
- Esineen heiton napsahdus ja huitaisu ovat hieman hiljaisempia.
- **[Shift] + [Q] heittää koko pinon** kerralla ([Q] yksi kerrallaan kuten ennen).
- **Soihtu valaisee paremmin:** valo on liekin kohdalla kädessä (ei vartalon keskellä), kirkkaampi, kantaa pidemmälle ja lepattaa elävästi.
- **Soihdulla lyöty olento syttyy palamaan:** palaa noin 5 sekuntia ja ottaa vahinkoa (savipeikko palaa loppuun), arat eläimet pakenevat.

## 2026-10-07 (sessio 12d): tyrskyt, linssipisarat, hitaammat veneet, palmut, linnunrata, lintujen ja huitaisujen äänet

- **Puun kaatumisääni ei enää tökkää.** Syy: pitkässä kaatumisessa alun narina soitettiin erillisenä kopiona, joka katkesi kesken. Nyt ääni on yksi yhtenäinen tiedosto, jossa narina on venytetty (sävelkorkeus ennallaan), basso vahvistettu ja jälkiräsähdys leikattu.
- **Tyrskyt:** kun vene iskeytyy aaltoon tai halkoo vettä vauhdilla, keulan molemmin puolin roiskuu vettä ulos ja ylös, ja tuuli kantaa pisaroita. Laivalla tyrskyt ovat isompia, ja myrskyssä niitä tulee eniten.
- **Sade vedessä:** sadepisarat roiskuvat nyt myös vedenpinnalta (ennen vain maasta).
- **Vesipisarat linssillä:** sateella ja ukkosella, kun katsoo aurinkoa kohti, linssille ilmestyy satunnaisesti vesipisaroita, jotka taittavat kuvaa, valuvat hieman ja haihtuvat.
- **Veneet ovat hitaampia** (noin kolmanneksen).
- **Kaadetun palmun voi hakata palasiksi.** Syy: kaarevan palmun rungosta oli tallennettu vain alin pätkä, joten kaatuneeseen runkoon osui vain kannon kohdalta. Koskee myös kookospalmua.
- **Linnunradassa ei enää näy pikseleitä.** Syy: pikseliä pienempi rae välkkyi, ja vyön kohina laskettiin kulmasta, joka hyppäsi 180°:ssa, jolloin vyöhön tuli saumaviiva. Nyt rakeisuus tulee pehmeistä himmeistä tähdistä.
- **Äänet:** lintuja viidakossa ja harvemmin savannilla (päivällä), työkalujen ja aseiden huitaisut (satunnainen ääni ja korkeus, olentoa lyödessä hiljempaa).

## 2026-10-07 (sessio 12c): ukkonen hämärtää, haamuja myrskyssä, salaman isku maahan, uusia ääniä

- **Haamun äänet kuuluvat:** ilmestymis- ja ääntelyäänet jäivät lähes kuulumattomiin, koska haamu ilmestyy 32–52 m:n päähän ja äänen vaimennus alkoi jo 8 m:stä. Nyt vaimennus alkaa 22 m:stä ja äänet ovat kovempia. Uusi ääntely vuorottelee vanhan kanssa.
- **Ukkosmyrsky päivällä hämärtää maailman** (noin 40 % tummempi).
- **Ukkosmyrskyssä haamuja tulee selvästi useammin** (ja niitä voi olla kaksi).
- **Salaman isku maahan:** lähelle iskevän salaman kohdalla hiekkaa ja multaa pöllähtää ja pieni tulipallo leimahtaa.
- **Uudet äänet:** aavikon tuuli (aina hyvin hiljaa, hiekkamyrskyssä kovaa), raju myrskytuuli (merellä ukkosella ja puuskittain hiekkamyrskyssä), napsahdus esinettä heitettäessä ja hiljainen, vaihtelevan korkuinen kopsahdus puuta lyödessä.

## 2026-10-07 (sessio 12b): pehmeämpi sumu, lähisalamat, Haamun äänet, äänien hienosäätö

- **Sumu ei enää näytä seinältä.** Syy: sateen usva ja sadeverho olivat lieriön pinnalla 26 m:n päässä, joten sitä lähemmät puut näkyivät kirkkaina ja kauemmat usvaisina, ja raja näkyi kuin este (myös sademetsän tihkussa). Nyt verhot ovat siellä, missä tavallinen sumu jo peittää maiseman, ja usva tulee vain kunnon sateessa.
- **Lähisalamat:** ukkosella noin joka neljäs salama iskee lähelle (45–155 m): koko näyttö välähtää, salama näkyy kirkkaana hehkuvana juovana, ja samalla kuuluu jyrähdys (satunnaisesti toinen kahdesta äänestä) salaman suunnasta. Kaukaisetkin salamat näkyvät nyt paremmin (ennen 1 px:n viiva).
- **Haamun äänet:** ilmestyessä, joskus ennen syöksyä, hyökätessä ja satunnaisesti leijuessa. Äänet tulevat haamun suunnasta.
- **Puun kaatumisääni** loppuu pian räsähdyksen jälkeen (ei jää rätisemään).
- **Sademetsän äänimaisema** on hiljaisempi ja pehmeämpi (terävimmät korkeat äänet vaimennettu).

## 2026-10-07 (sessio 12): äänitehosteet, askeleet, kuiva vuoristo, sääkierron korjaus

**Äänet (uusi)**
- **Taustaäänet:** tuuli (ukkosella, hiekkamyrskyssä sekä aina vuoristossa ja merellä), viidakon äänimaisema sademetsässä (pieni häivytys), sade (aina kun sataa, sademetsän tihkussa hiljaa) ja kaukainen ukkonen ukkosmyrskyssä. Äänet soivat päällekkäin ja vaihtuvat pehmeästi; silmukoissa ei kuulu saumaa.
- **Puun kaatuminen:** narina alkaa kun puu lähtee kaatumaan, ja räsähdys osuu hetkeen, jolloin runko iskeytyy maahan. Ääni tulee puun suunnalta ja vaimenee etäisyyden mukaan.
- **Askeleet:** syntetisoitu töpsytys, joka riippuu alustasta (hiekka, ruoho, sademetsän karike, sora, kallio, puulattia, matala vesi). Juostessa voimakkaampi, hiipiessä hiljainen; alastulo hypystä kuuluu.
- Äänitehosteiden voimakkuus on asetuksissa (Äänitehosteet).

**Korjaukset**
- **Sään vaihto O-näppäimellä ei enää jää jumiin.** Syy: kierto kävi läpi kaikki säät, mutta biomissa mahdoton sää (esim. sumu savannilla) ei tarttunut, joten seuraava painallus yritti samaa säätä uudelleen. Nyt kierto käy läpi vain kyseisessä biomissa mahdolliset säät.
- **Vuoristo on kuiva:** ei sadetta, ukkosta eikä sumua (selkeä, pilvinen, hiekkausva, harvoin hiekkamyrsky), joten se ei myöskään kastu. Vuoristossa vierii tumbleweedejä.

## 2026-10-07 (sessio 11): tulikärpäset, aallot, vesi veneissä, sade, lammikot, säät biomeittain, rakennelmat, linnunrata ja tähdenlennot, purje, kimallus, Haamu, jousi, iskujen tahti, tuulen nuoli

**Korjaukset**
- **Sateessa ei enää näy mustia pisteitä ja läiskiä** (pahenivat hiirtä liikutettaessa). Syy: sadepisaran varjostin laski potenssin luvusta, joka saattoi olla hieman negatiivinen, jolloin tuloksena oli virheellinen arvo (NaN). Se näkyi mustana pikselinä, ja liike-epäterävyys ja syväterävyys levittivät sen läiskiksi. Arvo rajataan nyt välille 0–1.
- **Veneiden sisällä ei enää näy vettä.** Syy: veneiden pohja on vesirajan alapuolella, ja läpinäkyvä vedenpinta piirrettiin rungon sisään. Nyt jokaisessa veneessä on laidan yläreunan tasolla näkymätön "vesisuoja", joka peittää vedenpinnan rungon sisältä (myös myrskyssä ja kallistuessa).
- **Purjeen bugi korjattu.** Syy: kolmiopurjeen kankaan kaistat väritettiin ruudukon sarakkeittain, ja sarakkeet suppenevat purjeen kulmaan, joten kaistat näyttivät viuhkalta; lisäksi purjeen varjopuoli oli lähes musta. Nyt kaistat ja ohuet saumat piirretään varjostimessa pikselitarkasti suorina viivoina (ei porrasmaisia laikkuja), ja vastavalossa aurinko kuultaa ohuen kankaan läpi (saumat erottuvat tummempina kuten oikeassa purjeessa). Koskee myös laivan purjeita.
- **Tuulen nuoli veneen paneelissa osoittaa oikeaan suuntaan.** Syy: nuolen kärki oli kuvassa alaspäin, joten nuoli näytti päinvastaista suuntaa. Nyt nuoli osoittaa, mihin tuuli puhaltaa (ylös = keulan suuntaan, eli ylös osoittava nuoli = myötätuuli).

**Sää ja vesi**
- **Aallot ovat paljon pienemmät:** selkeällä n. 0,13 m (ennen 0,3 m), sateella n. 0,28 m ja ukkosmyrskyssä n. 0,57 m (ennen n. 1,4 m). Myrsky on edelleen selvästi rajumpi, ja vaahtopäät tulevat vasta kovemmalla tuulella.
- **Säät vain siellä, missä ne ovat mahdollisia:** hiekkamyrskyä ja hiekkausvaa ei ole merellä, rannalla eikä sademetsässä; sadetta ja ukkosta ei ole aavikolla eikä punaisella laterittitasangolla (uusi oma kuiva ilmasto). Savannilla sade on harvinaista (sade 0,45, ukkonen 0,12; ennen 1 ja 0,3), ja aavikolla pilvinen sää on harvinaista (0,25, ennen 0,5). Biomien rajoilla mahdoton sää haihtuu pois (esim. hiekkamyrsky laantuu rannalle tultaessa). Kehittäjätyökalujen säänapit kertovat, jos sää ei ole mahdollinen biomissa.
- **Sade on realistisempi:** pisaroita on paljon enemmän (9 000) ja ne ovat ohuita, eripituisia ja -kirkkaisia viiruja lähellä pelaajaa; kauempana sade näkyy harmaina, liikkuvina sadeverhoina ja kovassa sateessa maan rajassa on usvaa. Maahan osuvat pisarat roiskuvat.
- **Lammikot:** sademetsässä (ja keitailla) ne ovat aina; savannilla, metsiköissä ja kausilammilla niitä ilmestyy vain sateella, ja sateen jälkeen ne kutistuvat reunoilta ja kuivuvat noin 4 minuutissa.

**Maailma**
- **Rakennelmia on noin kaksi kertaa enemmän** (n. 3 700–3 800 maailmassa, ennen n. 1 800), ja **laivanhylkyjä on n. 120 maailmassa** (ennen 6–13): hylky syntyy noin kolmannekseen rannikon rakennelmapaikoista, ja paikka haetaan rantaviivalta (hylky on rannalla vesirajassa). Huom: vanhoissa maailmoissa rakennelmien paikat muuttuvat (jo avatut arkut voivat olla uusissa paikoissa).
- **Tulikärpäsiä on vähemmän ja ne ovat parvina:** jokien, purojen ja lampien rannoilla sekä noin joka viidennen akasian alla, enintään 12 lähintä parvea. Merellä, rannalla, vuoristossa ja aavikolla ei ole tulikärpäsiä.

**Taivas**
- **Linnunrata on hienovarainen ja realistisempi:** himmeä, epätasainen valovyö, jossa erottuu tiheä tähtipöly ja hennot tummat pölykaistat. Se näkyy selvemmin vain pimeässä ja häviää horisontin lähellä ja kuun valossa.
- **Tähdenlentoja:** kirkkaana yönä taivaalla näkyy satunnaisesti (8–38 s välein) lyhyt tähdenlento.

**Esineet ja taistelu**
- **Esineiden kimallus on hento:** pieni, himmeä hehku (0,3–0,6 m, ennen 0,55–1,5 m) ja silloin tällöin pieni välähdys. Arvoesineillä hieman kirkkaampi kultainen.
- **Jousi on oikeassa kädessä** (vasen käsi jännittää), ja **nuolet erottuvat:** paksumpi varsi, isommat punavalkoiset sulat ja ammuttaessa hetken näkyvä vaalea lentojälki.
- **Iskujen tahti on sujuvampi:** yhden iskun kierto olentoon osuessa nyrkeillä n. 0,65 s (ennen 1,1 s), kirveellä n. 0,8 s (1,05 s), puunuijalla n. 1,45 s (1,9 s). Kun isku osuu puuhun, kiveen, pensaaseen tai ilmaan, jäähdytys on lyhyempi (nyrkki n. 0,5 s, kirves n. 0,65 s), joten hakkuu ei tunnu kankealta. Jatkuvaa huitomista rajoittaa kestävyys. Viidakkoveitsen sarja 10 + 10 + 19 (kestävyys 9 + 14 + 22), sarjan jälkeen 1,1 s jäähdytys.

**Haamu**
- Haamu leijuu nyt **latvusten alla** runkojen välissä (2,6–4,2 m maasta) ja kiertää puunrungot. Kun sen terveys laskee alle neljännekseen, se **pakenee latvusten yläpuolelle** (n. 13 m) ja katoaa, ellei sitä ehditä kaataa (paetessa siihen osuu nuolella).

## 2026-10-07 (sessio 10): vesiseinät, tumbleweedit, purjeet, eläimet, biomien tunnelma, meri, Haamu, pudotetut esineet

**Korjaukset**
- **Vedessä ei enää näy pystysuoria "seiniä".** Syy: kun sivujoki tai puro yhtyi pääuomaan (tai järveen), molempien uomien vedenpinnat laskettiin erikseen, ja vierekkäiset maastopisteet saivat eri uoman vedenpinnan. Korkeampi sivujoen pinta päättyi pystysuoraan pudotukseen matalamman pääuoman viereen (pahimmillaan 9 m). Samaa aiheuttivat jyrkillä rinteillä virtaavat kapeat purot, järven kaivama maasto jokien kohdalla ja rakennelmien tasoittama maa uomissa. Nyt yhtymäkohdassa korkeampi vedenpinta lasketaan matalamman tasolle ja sivujoen pinta liukuu loppuosallaan pääuoman tasoon, kapeat purot seuraavat maastoa, järven kaivama kohta laskee myös joen pintaa, eivätkä rakennelmat tasoita maata uomien päällä. Testissä 88/442 yhtymäkohdasta oli yli 1,2 m:n porras; korjauksen jälkeen 1 (koskipaikka).
- **Tumbleweedit (risukasat) vain aavikolla ja punaisella laterittitasangolla** (dyynit ja pöytävuoret mukaan lukien, ei keitailla). Aiemmin niitä syntyi kaikkialle savanneille, eikä vieriessä tarkistettu maastoa, joten ne vierivät jokiin ja mereen. Nyt veteen vierinyt uppoaa ja muualle (kasvillisuuteen) vierinyt juuttuu ja katoaa.
- **Purjeet käyttäytyvät luonnollisesti.** Syy: purjeveneen käärityn latinalaispurjeen pitkä vino raakapuu jäi yläasentoon, ja purje kääriytyi sen ympärille paksuksi valkoiseksi tangoksi ilmaan; käärityt purjeet myös kääntyivät tuulen mukana, ja lepatus oli liian voimakasta. Nyt raakapuu lasketaan purjeita käärittäessä alas veneen suuntaiseksi ja nostetaan ennen avaamista, käärityt purjeet pysyvät keskilinjassa ja lepatus on pientä väreilyä.

**Eläimet**
- Arat eläimet ovat vähemmän arkoja ja hitaampia: huomaamisetäisyydet noin 40 % lyhyempiä (gaselli 18 m, helmikana 11 m, apina 13 m, aavikkokettu 14 m, lintu 7 m) ja pakonopeudet pienempiä (gaselli 7,6 m/s, helmikana 5,2, apina 6,2, kettu 6,8; pelaaja juoksee 7,2). Huomattuaan pelaajan eläin pysähtyy ensin tarkkailemaan ja pakenee vasta, jos pelaaja tulee lähemmäs. Pako kestää vain muutaman sekunnin, eläin väsyy paetessaan (hidastuu jopa 45 %) ja haavoittunut juoksee hitaammin, joten juoksemallakin voi saada kiinni. Hiipiminen auttaa enemmän (kyykyssä 0,3 ×, paikallaan kyykyssä 0,22 ×).

**Biomien tunnelma**
- **Sademetsä:** siellä tihuttaa aina vähän (hento tihkusade, myös selkeällä säällä), ja taivaalla on aina pilviä. Kaikki on märkää ja kiiltävää: pinnat tummuvat, värit syvenevät, auringon heijastukset terävöityvät ja maassa on laikuittain taivasta heijastavia vesikalvoja. Maassa on vesilammikoita, joihin sade piirtää laajenevia renkaita. Pinnat kastuvat myös sateessa muualla ja kuivuvat hitaasti.
- **Aavikko:** kirkkaana, helteisenä päivänä (noin klo 9–15) horisontti väreilee kuumuudesta: kaukaiset ääriviivat aaltoilevat, ja horisontin alla näkyy kangastus (maa heijastaa taivasta kuin väreilevä vesi). Pilvet, hiekkapöly ja ilta vievät väreilyn. Vaatii jälkikäsittelyn (valonsäteet, DOF tai liike-epäterävyys päällä; oletuksena päällä keskitasolta ylöspäin).
- **Kuumat tasangot:** aavikolla ja savannilla (myös laterittitasangolla) kiertyy kuumina päivinä kaukana pölypyörteitä, jotka kulkevat tuulen mukana ja hajoavat veden yllä.
- **Savannin, metsien ja sademetsän illat ja yöt:** tyynellä säällä ilmassa vilkkuu tulikärpäsiä.

**Meri**
- Meri syvenee rannasta paljon nopeammin: noin 50 m rannasta vettä on 3–5 m (ennen 1–1,5 m) ja 80 m:ssä 5–8 m (ennen 1,5–2 m). Purjelaivalla pääsee nyt avovedelle lähes rannasta.

**Haamu (uusi vihollinen)**
- Harvinainen ja vaarallinen mustakaapuinen olento, jonka ympärillä hohtaa pieni tummansininen / violetti kehä ja hupun alla kaksi violettia silmää. Se ilmestyy vain öisin sademetsään ja leijuu latvusten tasolla (8–11 m). Huomattuaan pelaajan se kiertää tämän yläpuolella ja syöksyy iskuun (17 vahinkoa ja tönäisy). Ennen syöksyä se pysähtyy, nostaa kätensä ja sen hehku kirkastuu: silloin kannattaa väistää sivuun tai torjua. Ylhäällä siihen osuu vain nuolella, syöksyn aikana myös lähitaistelussa. 70 terveyttä; kuollessaan se hajoaa savuksi ja pudottaa kaurikotiloita ja joskus pronssirannerenkaan. Nuotion valo pitää haamut loitolla, ja aamulla ne haihtuvat. Enintään yksi kerrallaan, ja seuraava tulee vasta pitkän ajan päästä. Haamu lähellä estää nukkumisen.
- Lähitaistelu ei enää yllä kaukana ylä- tai alapuolella oleviin olentoihin.

**Esineet**
- Maahan pudonneilla esineillä on pieni sykkivä hehku, jotta ne erottaa (arvoesineillä kultainen).
- Heitettyä esinettä ([Q]) ei poimita automaattisesti takaisin: poiminta odottaa 10 s ja sitä, että pelaaja käy välillä yli 3 m:n päässä. [E] poimii aina.

**Kehittäjätyökalut**
- [F3] → Olennot: Haamu-nappi.

## 2026-10-06–07 (sessio 9): joet, biomit, rakennelmat, keräily ja ruoka, työkalut ja rakentaminen, jousi, eläimet, taivas ja sää, riimukivet, veneet

**Maailma**
- Joet eivät enää risteä toistensa yli: joet ja purot muodostavat valumaverkon (vesi valuu alamäkeen kohti merta tai järveä), sivujoet yhtyvät pääuomaan porrastetusti, eivätkä uomat käänny itsensä päälle. Graniittikalliot ja muut muodostelmat eivät enää katkaise jokia, ja sademetsän kuivat painanteet (jotka näyttivät risteäviltä uomilta) poistettiin.
- Biomit voivat olla missä tahansa: kehämäinen järjestys (Sahel keskellä, reunoilla harvinaisimmat) poistettiin. Biomialueet ovat noin 1–2 km kokoisia (vierekkäiset samat yhdistyvät isommiksi), joten pitkän kävelyn jälkeen löytää uuden biomin. Maailma on saari, jota ympäröi meri, ja sisämaassakin voi olla merenlahtia.
- Hylättyjä paikkoja on paljon enemmän: noin 1 800 rakennelmaa maailmassa (aiemmin n. 500), eli kulkija löytää niitä satunnaisesti vaeltaessaan.
- Laivanhylyt: rannoille harvinaisia hylättyjä laivoja (n. 6–13 maailmassa), osassa arkku merihenkisellä saaliilla.
- Riimukivet ja riimutaulut: kaiverrettuja kiviä ja pieniä riimukirjoituksia kaikkialla. Kun niitä katsoo, ruudulle tulee "PAINA E KÄÄNTÄÄKSESI", ja [E] näyttää riimujen alla suomennoksen, joka "kääntyy" kirjain kerrallaan. 38 abstraktia tekstiä maailmasta, vihjeitä ja arvoituksia; luetut kivet tallentuvat.

**Taistelu**
- Iskut ovat paljon harvemmassa: jokaisen iskun jälkeen on pidempi jäähdytys (nyrkit noin 1,1 s iskujen välillä, kivipuukko 0,9 s, kirves ja hakku 1,1 s, keihäs 1,3 s, puunuija 1,9 s, viidakkoveitsen sarjan jälkeen 2,1 s), ja iskut kuluttavat enemmän kestävyyttä.

**Keräily, ruoka ja myrkytys**
- Peli alkaa keräämällä kiviä ja risuja maasta ja pensaista. Kaikki sienet ja kukat ovat poimittavia, samoin piikivi, simpukankuoret, sulat, kookospähkinät, apinanleivät, karitepähkinät, jujubapensaat, moringa, hibiskus (bissap), ruoko, fonio, savi ja luut.
- Ravinto (nälkäpalkki): vähenee hitaasti (täydestä tyhjään n. 34 min, juostessa ja uidessa nopeammin). Nälkäisenä terveys ja kestävyys palautuvat hitaammin, tyhjällä vatsalla terveys hupenee.
- Syöminen: ruoka kädessä [Hiiri 2] tai repussa hiiren oikealla. Sienet ovat huonoa ruokaa, ja niistä voi saada satunnaisesti **Myrkytys**-efektin (ruskea sieni 15 %, kalpea 40 %, punahattu 85 %, termiittisieni 5 %); myös raa'asta lihasta (30 %). Myrkytys vie terveyttä (ei tapa yksinään) ja hidastaa palautumista. Yrttirohto parantaa, moringa lievittää.
- Nuotiolla laitetaan ruokaa ja rohtoja: paistettu liha, paahdettu sieni, paahdetut pähkinät, fonio-puuro, lihapata, bissap-juoma (virkistää), karitevoi, yrttirohto ja karitevoide (haavavoide).

**Esineet, työkalut ja rakentaminen**
- Kymmeniä uusia esineitä: materiaalit (piikivi, luu, sulka, ruoko, bambunvarsi, palmunlehti, akasiankumi, köysi, simpukankuori, jänne, nahka, karitevoi, terälehdet sekä pahkasian, gasellin, apinan ja aavikkoketun taljat), 19 ruokaa, 2 rohtoa, työkalut (kivipuukko, piikivikirves ja -hakku, vasara, soihtu) ja aseet (keihäs, jousi, jännejousi, puu-, luu- ja piikivinuolet).
- Valmistus kolmessa paikassa: käsin, työstöpenkillä ja nuotiolla (välilehdet repussa, valmistettavat ensin).
- Vasara rakentaa [Hiiri 2 = rakennusvalikko]: ensin työstöpenkki, ja kaikki muut rakennelmat (myös nuotio) vaativat työstöpenkin 20 m:n säteelle. Osat: työstöpenkki, nuotio, puulattia, puuseinä, saviseinä, oviaukko, olkikatto, aita, pylväs, soihtuteline, makuualusta (herätyspaikka, yöllä nukkuu aamuun) ja veneet. Lattiat, seinät ja katot asettuvat 2 m:n ruudukkoon ja toistensa päälle; [R] kääntää, [X] purkaa (materiaalit palautuvat). Nuotiota ei enää valmisteta repussa.
- Soihtu kädessä valaisee ympäristöä.

**Jousi ja eläimet**
- Jousi: pidä [Hiiri 1] pohjassa jännittääksesi (näkymä tarkentuu) ja päästä ampuaksesi. Nuolet lentävät kaarena, osuvat eläimiin ja jäävät maahan tai runkoihin, josta ne voi usein poimia takaisin.
- Uudet arat eläimet: gaselli (savanni, akasiametsikkö), helmikana (lentää pakoon), apinat (sademetsä), aavikkokettu ja kutojalinnut (parvina, lentävät pois). Eläimet huomaavat pelaajan kaukaa ja pakenevat; hiipimällä (kyykky) pääsee lähemmäs, mutta ne säikähtävät silti, jos menee liian lähelle, joten jousi on tarpeen. Lauma pakenee yhdessä. Saaliina lihaa, taljoja, luita, jänteitä ja sulkia.

**Taivas ja sää**
- Selkeinä öinä taivaalla näkyy linnunrata: kirkas vyö pölykaistoineen ja tiheät tähdet. Taivas kiertyy hitaasti taivaannavan ympäri.
- Vuorokausi: 10 min päivä + 10 min yö, ja aika kulkee todellisessa ajassa (ei hidastu, vaikka ruudunpäivitys hidastuisi).
- Säät biomin mukaan: jokaisella ilmastolla on oma säätaulukko, ja sää vaihtuu pehmeästi alueelta toiselle. Sademetsässä ei ole hiekkamyrskyjä vaan sadetta, ukkosta ja sumua; aavikolla hiekkausvaa ja -myrskyjä; savannilla joskus sadetta; vuoristossa sumua; merellä sadetta ja ukkosta.
- Uudet säät: sade (sadepisarat, väreet vedessä), ukkosmyrsky (salamat taivaalla, välähdykset valaisevat pilvet) ja sumu.

**Veneet**
- Kolme venettä, jotka rakennetaan vasaralla vain veteen (työstöpenkki rannalla): **soutuvene** (halpa, hidas ja heikko; soutaminen kuluttaa kestävyyttä), **purjevene** (latinalaispurje, keskinopea) ja valtava kolmimastoinen **purjelaiva** Santa Marian tapaan (punaiset ristit purjeissa, kastellit, viirit ja ruori; vaatii valtavasti tarvikkeita, kestää paljon ja kulkee kovaa).
- Purjeet toimivat tuulen suunnan mukaan: purjeet kääntyvät ja pullistuvat tuulen alapuolelle, sivu- ja myötätuulessa kulku on nopeinta, ja suoraan vastatuuleen ei pääse (purjeet lepattavat). Raakapurjeinen laiva kulkee parhaiten myötätuulessa, latinalaispurjeinen vene sivutuulessa. Tuulen suunta kääntyy hitaasti muutaman minuutin välein, ja voimakkaampi tuuli kuljettaa nopeammin.
- [E] kyytiin ja maihin. Purjeveneissä [W]/[S] vaihtaa asetusta (taakse, seis, hiljaa, puolet purjeista, täydet purjeet) ja [A]/[D] ohjaa. Vasemmassa yläkulmassa veneen tiedot: kunto, tuulen suunta, asetus ja nopeus.
- Vene keinuu aaltojen mukana ja kallistuu tuulessa, jättää vanan ja roiskii keulasta. Matalikkoon ajo pysäyttää ja kovassa vauhdissa vaurioittaa; vasara korjaa ([Hiiri 1]) ja purkaa ([X]). Uponneesta veneestä jää kelluvia tarvikkeita. Veneet näkyvät kartoilla ja tallentuvat.

**Muuta**
- Opas uusittiin: tarvikkeet, työkalut ja vasara, puuta, työstöpenkki, nuotio, ateria ja metsästys jousella.
- Kehittäjätyökaluihin [F3] napit uusille eläimille, aseille, materiaaleille, rakentamiselle, ruoalle ja veneille.
- Valikon taustapaikka siirrettiin uuden biomijaon mukaan savannille.

## 2026-10-06: Alpha v0.1 julkaistu
- Ensimmäinen julkinen alfaversio: sessioiden 1–8 työ yhdistettiin `main`-haaraan, ja peli on pelattavissa julkisesti. Valikon alareunassa lukee "Alpha v0.1".

## 2026-10-06 (sessio 8): jäähdytys ja kombot kevyille aseille, tönäisy, veri, grafiikan esiasetukset, sademetsän musiikki
- Iskuille jäähdytys: iskun jälkeen pitää odottaa ennen seuraavaa (nyrkit 0,4 s, nuija 0,75 s, viidakkoveitsen sarjan jälkeen 1,3 s, työkalut 0,2–0,35 s). Tähtäin himmenee jäähdytyksen ajaksi.
- Iskusarja vain nopeilla ja kevyillä aseilla (viidakkoveitsi); nyrkit ja puunuija lyövät yhden iskun (nuija raskaasti: 16 vahinkoa, iso tönäisy).
- Enemmän tönäisyä: olennot lennähtävät osumasta (n. 1–2 m) ja hypähtävät, ja ne horjuvat hetken eivätkä heti juokse takaisin.
- Veri: osumasta lentää veripisaroita, jotka jättävät maahan läikkiä; kuollessa iso roiske, pölypöllähdys ja ruumiin alle leviävä verilammikko. Savipeikoista lentää punaruskeaa savivelliä. Läikät haalistuvat n. 40 s:ssa.
- Grafiikan esiasetukset: Matala, Keskitaso, Korkea, Ultra (näköetäisyys, varjot, tarkkuus, valonsäteet). Yksittäisen asetuksen muutos tekee laaduksi "Oma".
- Sademetsässä soi musiikki (väliaikaisesti Deep Exploration hiljaisella pelitasolla, kunnes sademetsälle tulee oma kappale).
- Musiikin vaihto nopeutui: viive 5 s (alussa 3 s), häivytys 3,5 s, tauko 1 s, voimistuminen 6 s, vähintään 20 s ennen vaihtoa.
- Korjattu: varjojen vaihto "Tarkka"-tasolle (ja nyt Ultra) rikkoi varjokartan (WebGL-virheet).

## 2026-10-06 (sessio 7): musiikki, kehittäjätyökalut, kombojen rajoitus, kilven varustaminen, palavat savipeikot
- Musiikki: päävalikossa soi Deep Exploration normaalilla voimakkuudella; pelissä Sahelin savanneilla Savannah Dawn, aavikolla Caravan of the Desert ja merellä Grand Ocean Adventure hiljaa taustalla (12 dB valikkoa hiljempaa, tilaa tuleville äänitehosteille). Kappaleet soivat silmukkana ja on tasattu samaan äänekkyyteen. Biomin musiikki alkaa viiveellä (8 s, pelin alussa 4 s), vaihtuu pitkillä häivytyksillä (8 s hiljenee, 10 s voimistuu) ja soi vähintään 45 s ennen vaihtoa, joten biomien rajalla musiikki ei vaihtele. Musiikittomalle alueelle (sademetsä, vuoristo, ranta) musiikki hiljenee 15 s jälkeen.
- Asetuksiin ääniosio: äänenvoimakkuus, musiikki ja äänitehosteet (tuleville äänille).
- Pelin käynnistyessä "Klikkaa jatkaaksesi": selaimet sallivat äänen vasta käyttäjän klikkauksen jälkeen. Musiikki pysähtyy, kun välilehti on piilossa.
- Hiekkadyynit yhdistetty aavikkoon: sama nimi (Aavikko), väri kartalla ja musiikki. Maaston muodot ennallaan.
- Iskusarjojen rajoitus: sarja jatkuu vain, kun kestävyyttä on yli puolet, ja sarjan iskut ovat kalliimpia (nuija 10 + 15 + 24, viidakkoveitsi 8 + 14 + 24, nyrkit 4 + 12). Täydellä kestävyydellä ehtii yhden sarjan, sitten vain yksittäisiä iskuja, kunnes kestävyys palautuu. Kestävyyspalkissa merkki puolivälissä.
- Kilpi pitää varustaa itse: valitse kilpi ja paina hiiren oikeaa, tai hiiren oikea repussa (myös riisuminen). Varustetussa kilvessä on merkki pikapalkissa ja repussa, ja tieto tallentuu.
- Savipeikot aamulla: joutuvat paniikkiin, syttyvät itsestään palamaan, juoksevat liekeissä sinne tänne (huitovat käsillä) ja palavat muutamassa sekunnissa mustiksi hiiliksi ja tuhkaksi. Liekit, kipinät ja savu hiukkasina; palava savipeikko valaisee ympäristöä. Palaneista ei jää saalista.
- Kehittäjätyökalut [F3]: tiedot (sijainti, biomi, aika, FPS, olennot, musiikin tila), lentäminen, nopeus 0,5–10×, kuolemattomuus, paranna / kuole, siirtyminen (biomit, vesistöt, aloituspaikka, lähin rakennelma tai avaamaton arkku, koordinaatit, karttamerkit), olentojen kutsuminen ja poisto, esineiden antaminen, sää ja aika (myös ajan pysäytys), koko kartan paljastus. Testaustyökalut poistettu taukovalikosta.

## 2026-10-06 (sessio 6): korjauksia, taistelu, pahkasika ja savipeikot, uinti ja hukkuminen
- **Versio Alpha v0.1** = sessioiden 1–6 työ (commit 03a2b3b, käyttäjän nimeämä).
- Syväterävyys (DOF) paljon hienovaraisempi: vain kaukainen tausta ja aivan lähellä olevat asiat pehmenevät hieman, ei enää koko kuvaa.
- Kasvit ja puiden latvat huojuvat hieman myös tyynellä säällä.
- Joet ja purot korjattu: ei enää maasta koholla olevia penkereitä eikä vettä reunojen yli. Veden pinta asettuu syvälle laaksoon, rannat loivenevat pehmeästi, kuivat reunapisteet painetaan maan alle, jyrkissä kohdissa vaahtoavia koskia.
- Meren aallot korjattu: aallot kulkevat nyt tasaisesti kohti rantaa eivätkä enää "hypi" (aaltojen suunta riippui hitaasti kääntyvästä tuulesta, mikä kaukana keskeltä liikutti aaltoja valtavan nopeasti). Lyhyet aallot näkyvät vain pinnan valaistuksessa, jottei 2 m verkko väreile.
- Terveys- ja kestävyyspalkit pikapalkin yläpuolella. Osuessa ruudun reuna punertuu ja kamera nytkähtää, matala terveys sykkii. Terveys palautuu hitaasti, kun viimeisestä osumasta on kulunut hetki.
- Taistelu: iskusarjat (kombot) puunuijalla (sivuisku, takaisin, murskaava isku ylhäältä), viidakkoveitsellä (nopeat vinoiskut ja pisto) ja nyrkeillä (suora ja koukku). Klikkaa tahdissa tai pidä hiiren nappi pohjassa. Kirves, hakku ja risu lyövät yhdellä iskulla kuten ennen. Jos isku ei osu olentoon, se hakkaa puita, kiviä ja pensaita kuten ennen.
- Torjunta [Hiiri 2]: kilpi torjuu 90 %, ase 60 %, työkalu 50 % ja paljaat kädet 30 % vahingosta. Torjunta kuluttaa kestävyyttä ja hidastaa liikettä; jos kestävyys loppuu, torjunta murtuu. Parry: kun torjunnan aloittaa juuri ennen iskua, vahinkoa ei tule ja hyökkääjä horjuu (ottaa silloin 1,5-kertaisen vahingon).
- Tönäisyt: pelaaja ja olennot lennähtävät hieman osumasta, nuijan murskaisku heittää ilmaan. Osuman hetkellä isku pysähtyy hetkeksi (tuntuma).
- Uudet esineet: Puunuija (2 puuta, 2 kuitua), Puukilpi (4 puuta, 4 risua, 4 kuitua; pikapalkissa kilpi on vasemmassa kädessä) ja Viidakkoveitsi (arkuista, raivaa pensaita kaksinkertaisesti). Eläinten saaliit: raaka liha, nahka ja savi.
- Villieläin: pahkasika Sahelin savanneilla, akasiametsiköissä ja laterittitasangoilla (1–3 yhdessä). Pakenee lähestyvää pelaajaa (kyykyssä pääsee lähemmäs), lyötynä hyökkää takaisin syöksyllä (laskee päänsä ja kuopii maata ennen syöksyä), pakenee haavoittuneena. Häntä nousee pystyyn juostessa.
- Vihollinen: savipeikko nousee öisin maasta missä tahansa biomissa (aika ajoin, enintään 3 kerrallaan), hiipii pelaajaa kohti ja lyö (nostaa kädet ennen iskua). Heikko: kaatuu muutamalla iskulla ja murenee paloiksi. Aamulla savipeikot murenevat itsestään, eikä niitä synny nuotion lähelle.
- Uinti kuluttaa kestävyyttä (liikkuessa enemmän). Kun kestävyys loppuu syvässä vedessä, alkaa hukkuminen: ruudun reuna sinertyy, pää painuu pintaan ja terveys laskee.
- Kuolema: "Kuolit"-ruutu syineen; [Välilyönti] herättää maailman aloituspaikasta, reppu säilyy.
- Kyykky [Ctrl] tai [C] (päälle/pois): matalampi ja hitaampi, eläimet huomaavat myöhemmin. Juoksu tai hyppy nostaa ylös.
- Karttamerkeille nimet: uusi merkki kysyy heti nimen, merkin klikkaus avaa nimeämisen ja poiston, oikea klikkaus poistaa. Nimet näkyvät isossa kartassa ja minikartalla, ja ne tallentuvat.
- Pelin aikana selain kysyy ennen sivulta poistumista (vahingossa painettu Ctrl+W ei sulje peliä varoittamatta), ja selaimen Ctrl-pikanäppäimet on estetty pelatessa.
- Testaustyökaluihin rivi "Kutsu": pahkasika, savipeikko, aseet (nuija, viidakkoveitsi, kilpi) ja paranna.

## 2026-10-06 (sessio 5): vesistöt ja meri, veden fysiikka, uusi grafiikka, lisää sisältöä
- Bambujen tärinä korjattu: korkeat kasvit saivat matalille pensaille tarkoitetun tuulen, joka heilutti 9 m vartta liikaa ja pisteittäin eri tahtiin.
- Uusi biomi: meri ja hiekkarannat. Sademetsän puolella maailman reunaa on avomeri (sen takana virta vie takaisin), rannoilla hiekkaa ja harvoin saaria.
- Joet ja purot: sademetsässä runsaasti, Sahelissa harvoin pieniä jokia (muutama km koko alueella), vuoristossa puroja loivissa kohdissa. Kapeneva joki loppuu kuivaan uomaan.
- Järvet ja lammet: sademetsässä ja vuoristossa (vuoristojärvet), oma pinnankorkeus. Lumpeita järvillä ja lammilla.
- Uusia maastonmuotoja: graniittikalliot (inselbergit) Saheliin ja sademetsään, pöytävuoret aavikolle, loivat kumpareet Saheliin, korkeampi sademetsän maasto, jokilaaksot.
- Vesi uusittu: aallot (meressä sään mukaan, myrskyssä metrien aallokko), taivaan heijastus, auringon kimallus, rantavaahto, läpinäkyvä matala vesi, virtaus joissa.
- Veden fysiikka: väreily ja renkaat (aaltoyhtälö näytönohjaimella), roiskeet kun pelaaja hyppää veteen, kahlaa tai ui, ja kun esine putoaa tai heitetään veteen. Puu, risut ja kuitu kelluvat ja ajelehtivat virran mukana, kivet ja metallit uppoavat. Uiva pelaaja nousee ja laskee aaltojen mukana.
- Uusi näppäin [Q]: heitä valittu esine.
- Varjot: kaksi varjokaskadia (tarkat varjot lähellä, varjot kauas), pehmeät reunat.
- Valonsäteet (god rays) puiden ja lehvästön läpi, ilmakehän hehku auringon suunnassa, taivaan sironta (hehku auringon ympärillä, lämmin horisonttivyö matalalla auringolla).
- Asetuksiin: Valonsäteet, Liike-epäterävyys (Pois/Kevyt/Vahva), Syväterävyys (DOF).
- Lisää sisältöä: karitepuu, doumpalmu, kookospalmu, lahopuut, sammaloituneet rungot, villibanaani, aavikkopensas, ajopuu, korkea heinä, kukat, sienet, merilevä, luut, kivikko; graniittikallioille lohkareita. Ruo'ot myös jokien ja järvien rannoilla.
- Testaustyökaluihin siirtymät: Ranta, Järvi, Joki, Puro. Minikartta näyttää vesistön nimen, kun pelaaja on vedessä.

## 2026-10-06 (sessio 4): tutkittava kartta, rakennelmat ja arkut, biomit, sulavuus
- Minikartta on aluksi tyhjä karttapohja (paperi + haalea ruudukko), ja maasto piirtyy siihen sitä mukaa kuin pelaaja kulkee (n. 100 m ympäriltä). Pohjoinen merkitty P:llä.
- Iso interaktiivinen kartta [M]: vedä = liikuta, rulla = zoomaa, klikkaus = merkki valitulla symbolilla (raksi, pallukka, talo, lippu, tähti), klikkaus merkkiin = poista. Mittakaava ja etäisyys kursorin kohtaan. Merkit näkyvät myös minikartalla (kaukaiset reunalla).
- Tutkittu alue ja merkit tallentuvat maailman mukana.
- Uuden maailman luonnista poistettu koko maailman karttaesikatselu (spoilasi maailman).
- Satunnaiset rakennelmat joka maailmaan: kivikehät (Sahel), hylätyt leirit (aavikko, dyynit, keidas), talon ja kylän rauniot (harvinaisina kaikissa biomeissa). N. 500 / maailma.
- 45 %:ssa rakennelmista on arkku [E]: kansi aukeaa ja tavalliset saaliit (risuja, kiviä, kuitua, puuta) lennähtävät maahan. 10 %:ssa arkuista on arvoesineitä: kultahippu, kaurikotilo, pronssirannerengas (hohtavat maassa).
- Sademetsä uusittu: tiheä ja hidas kulkea (uusi sademetsäpuu, tiheiköt, bambu, saniaiset, aluskasvillisuus, ruo'ot), kostea sumu ja vihertävä varjoisa valo, kuopat ja purouomat. Liikkuminen sademetsässä 30 % hitaampaa.
- Vuoristo uusittu: kalliomuodostelmat, kalliotornit, kerrostuneet kallion värit, lohkareita, kandelaaberipuita.
- Aavikolle keitaat (vesi, palmut, ruo'ot, vihreä ruoho) ja kuolleita puita; Sahelin kausilammille ruo'ot.
- Sulavuus: maaston ja esineiden generointi siirretty taustasäikeisiin (Web Worker), instanssipoolit tiivistyvät (kolmiomäärä ei enää kasva), vanha raskas minikarttalaskenta poistettu.
- Käden ja työkalujen animaatiot pehmennetty: juoksuun siirtyminen liukuu, kävelyheilunta ilman nykäyksiä, esineen vaihto pehmeästi, iskut avainkehyksistä, hiiren viive jousella.
- Valikon animaatiot kevennetty: käärö aukeaa ja paneelit vaihtuvat pelkillä transform/opacity-animaatioilla (ei sumennusta eikä asettelua joka ruudulla), nappien hehku kevyemmin; valikon taustan varjot päivittyvät harvemmin ja taukovalikon taustaa piirretään harvoin.

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
