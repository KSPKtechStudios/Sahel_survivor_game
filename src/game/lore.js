// Riimukivien tekstit ja riimujen piirto.
//
// Kivissä on outoja riimuja ("harakanvarpaita"). Kun pelaaja kääntää ne [E],
// näkyy suomenkielinen teksti. Tekstit kertovat maailmasta abstraktisti:
// osa on vihjeitä pelin toiminnasta, osa arvoituksia ja salaisuuksia.
//
// HUOM: tekstit ovat luonnoksia, joita käyttäjä voi muokata (ks. docs/DESIGN.md).

export const LORE = [
  'Kun aurinko nousee, savi muistaa olleensa maata. Siksi se pakenee valoa ja palaa.',
  'Joki ei koskaan erehdy. Se etsii merta niin kuin janoinen etsii kaivoa.',
  'Meren takaa tuli laivoja. Yksikään ei palannut. Ranta pitää sen, minkä saa.',
  'Kolme kiveä kehässä on ovi. Neljäs kivi on avain. Viidettä ei ole kukaan nähnyt.',
  'Älä laske tähtiä. Ne laskevat sinua.',
  'Kulta ei ole aarre. Aarre on vesi, joka ei kuivu.',
  'Ennen saarta oli vain vesi ja yö. Sitten joku laski kalebassin veden päälle ja kutsui sitä maaksi.',
  'Baobab ei kuole. Se vain lakkaa puhumasta.',
  'Kaurikotilo kulkee kädestä käteen kuin uni. Kenenkään se ei ole.',
  'Hiekka liikkuu öisin. Aamulla polut ovat uusia, ja vanhat kylät ovat kadonneet.',
  'Tuli on ystävä yhden yön. Toisena yönä se tahtoo talosi.',
  'Kun ukkonen jyrisee sademetsässä, laske hengenvetosi. Taivas laskee kanssasi.',
  'Rakentajat tekivät savesta palvelijoita. Palvelijat eivät unohtaneet.',
  'Tähtien joki virtaa taivaalla samaan suuntaan kuin joet maassa: kohti suurta vettä.',
  'Termiitit rakensivat ensimmäiset tornit. Ihmiset vain matkivat.',
  'Kuka kantaa kiveä, sitä kivi kantaa.',
  'Maailman reunalla virta kääntää uimarin takaisin. Kukaan ei ole päässyt yli. Kukaan ei ole yrittänyt veneellä.',
  'Gaselli näkee kauemmas kuin sinä. Hiivi, tai jää nälkäiseksi.',
  'Tällä saarella oli seitsemän kylää. Kuusi on raunioina. Seitsemättä ei ole löydetty.',
  'Pimeimpänä yönä kuu ei nouse. Silloin savi kuulee kaiken.',
  'Sieni kasvaa siellä, missä joku on levännyt liian kauan. Syö varoen.',
  'Rauta syntyy punaisesta maasta ja tulesta. Sepät tiesivät sen ennen kuin lähtivät.',
  'Älä luota kiveen, joka puhuu sinun kieltäsi. Se on vain käännös.',
  'Ensimmäinen kaivo kaivettiin tähän. Vesi muisti kaivajan nimen, kivi ei.',
  'Kun hiekkamyrsky nousee, aavikko hengittää. Odota, kunnes se on hengittänyt ulos.',
  'Saari on kilpikonnan selkä. Kun kilpikonna sukeltaa, kaikki muuttuu.',
  'Riimut on kirjoitettu niille, jotka eivät osaa lukea. Muut eivät niitä tarvitse.',
  'Puut kaatuvat itään. Talot kaatuvat länteen. Ihmiset kaatuvat sinne, minne katsovat.',
  'Ensin lähtivät linnut. Sitten vesi. Sitten me.',
  'Nuotion ympärillä savi ei uskalla nousta. Muista tämä, kun yö tulee.',
  'Jokainen arkku on lupaus. Jokainen tyhjä arkku on pidetty lupaus.',
  'Kuu on aurinko, joka on menettänyt toivonsa.',
  'Meren pohjassa on toinen saari. Siellä sataa ylöspäin.',
  'Ne, jotka pystyttivät kivikehät, laskivat päiviä. Ne, jotka kaatoivat ne, laskivat rahaa.',
  'Kun olet löytänyt kaikki kivet, lue ne takaperin.',
  'Gaselli, helmikana ja apina kokoontuvat kerran vuodessa. Ihmistä ei kutsuta.',
  'Sademetsän sydämessä kasvaa puu, jota mikään kirves ei kaada.',
  'Kirjoitin tämän, koska unohdan. Sinä luet tämän, koska et muista.',
];

// Riimut: jokainen merkki on joukko viivoja 0..1-ruudussa (pystyvarsi ja
// haaroja kuin vanhoissa riimuissa).
const GLYPHS = [
  [[0.5, 0, 0.5, 1], [0.5, 0.15, 0.85, 0.35], [0.5, 0.4, 0.85, 0.6]],
  [[0.3, 0, 0.3, 1], [0.3, 0.1, 0.75, 0.3], [0.75, 0.3, 0.75, 1]],
  [[0.5, 0, 0.5, 1], [0.5, 0.25, 0.85, 0.45], [0.85, 0.45, 0.5, 0.65]],
  [[0.5, 0, 0.5, 1], [0.15, 0.15, 0.5, 0.4], [0.15, 0.4, 0.5, 0.65]],
  [[0.3, 0, 0.3, 1], [0.3, 0.1, 0.75, 0.3], [0.75, 0.3, 0.3, 0.5], [0.3, 0.5, 0.8, 1]],
  [[0.3, 0.1, 0.75, 0.5], [0.75, 0.5, 0.3, 0.9]],
  [[0.2, 0.1, 0.8, 0.9], [0.8, 0.1, 0.2, 0.9]],
  [[0.3, 0, 0.3, 1], [0.75, 0, 0.75, 1], [0.3, 0.3, 0.75, 0.6]],
  [[0.5, 0, 0.5, 1], [0.2, 0.3, 0.8, 0.6]],
  [[0.5, 0, 0.5, 1], [0.2, 0.25, 0.5, 0.45], [0.8, 0.25, 0.5, 0.45]],
  [[0.5, 0, 0.5, 1], [0.2, 0.55, 0.5, 0.35], [0.8, 0.55, 0.5, 0.35]],
  [[0.3, 0, 0.3, 1], [0.3, 0.1, 0.75, 0.35], [0.3, 0.6, 0.75, 0.35]],
  [[0.5, 0.05, 0.85, 0.5], [0.85, 0.5, 0.5, 0.95], [0.5, 0.95, 0.15, 0.5], [0.15, 0.5, 0.5, 0.05]],
  [[0.3, 0, 0.3, 1], [0.75, 0, 0.75, 1], [0.3, 0.2, 0.75, 0.5], [0.75, 0.2, 0.3, 0.5]],
  [[0.2, 0, 0.2, 1], [0.8, 0, 0.8, 1], [0.2, 0, 0.5, 0.3], [0.8, 0, 0.5, 0.3]],
  [[0.5, 0, 0.5, 1], [0.5, 0.3, 0.15, 0.6], [0.5, 0.3, 0.85, 0.6]],
  [[0.3, 0, 0.3, 1], [0.3, 0.6, 0.75, 0.8], [0.75, 0.8, 0.3, 1]],
  [[0.5, 0, 0.5, 1], [0.15, 0.05, 0.5, 0.35], [0.85, 0.05, 0.5, 0.35], [0.15, 0.95, 0.5, 0.65], [0.85, 0.95, 0.5, 0.65]],
  [[0.2, 0.2, 0.5, 0.0], [0.5, 0.0, 0.8, 0.2], [0.5, 0.0, 0.5, 1]],
  [[0.3, 0, 0.3, 1], [0.3, 0.45, 0.8, 0.2], [0.3, 0.45, 0.8, 0.7]],
];

function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

// Piirtää tekstiä vastaavat riimut kankaalle (kaiverrus: tumma ura, vaalea
// reuna). Sama teksti tuottaa aina samat riimut.
export function drawRunes(ctx, text, x0, y0, w, h, { color = 'rgba(30,22,16,0.92)', light = 'rgba(255,240,215,0.35)', lineW = null } = {}) {
  const words = text.split(/\s+/);
  let n = 0;
  const glyphs = [];
  for (const word of words) {
    const k = Math.max(1, Math.round(word.length / 2.5));
    const hw = hashStr(word.toLowerCase());
    for (let i = 0; i < k; i++) glyphs.push(GLYPHS[(hw >>> (i * 3)) % GLYPHS.length]);
    glyphs.push(null); // sanaväli
    n += k + 1;
  }
  // Riveihin: merkin koko sovitetaan alueeseen.
  const cols = Math.max(4, Math.ceil(Math.sqrt(n * (w / h) * 0.55)));
  const rows = Math.ceil(n / cols);
  const cw = w / cols, ch = Math.min(h / rows, cw * 1.8);
  const gw = cw * 0.62, gh = ch * 0.72;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const lw = lineW || Math.max(1.5, cw * 0.09);
  glyphs.forEach((g, i) => {
    if (!g) return;
    const cx = x0 + (i % cols) * cw + (cw - gw) / 2;
    const cy = y0 + Math.floor(i / cols) * ch + (ch - gh) / 2;
    for (const [pass, stroke, off] of [[0, light, lw * 0.35], [1, color, 0]]) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = pass ? lw : lw * 0.9;
      ctx.beginPath();
      for (const [ax, ay, bx, by] of g) {
        ctx.moveTo(cx + ax * gw + off, cy + ay * gh + off);
        ctx.lineTo(cx + bx * gw + off, cy + by * gh + off);
      }
      ctx.stroke();
    }
  });
}

// Kiven teksti siemenestä (sama kivi = sama teksti).
export function loreFor(seed) {
  return (seed >>> 0) % LORE.length;
}
