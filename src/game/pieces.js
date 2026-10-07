// Vasaralla rakennettavat osat. Kaikki paitsi työstöpenkki vaativat
// työstöpenkin lähelle (BENCH_RANGE). Veneet (boat) asetetaan vain veteen,
// ja ne liikkuvat (game/boats.js). grid: 'floor' = ruutu (2 x 2 m),
// 'wall' = ruudun reuna, 'roof' = ruutu (kalteva), 'corner' = ruudun kulma,
// null = vapaa sijoitus maastoon. Törmäykset ja lattiapinnat ovat osan omissa
// koordinaateissa (origo pohjan keskellä, seinä x-akselin suuntainen).
//
// HUOM: hinnat ja osat ovat prototyypin paikkamerkkejä (ks. docs/DESIGN.md).

export const GRID = 2;
export const BENCH_RANGE = 20;

export const PIECES = {
  workbench: {
    name: 'Työstöpenkki', cost: { wood: 6, stone: 4, fiber: 4 }, grid: null, station: 'workbench', noBench: true,
    desc: 'Valmistuspaikka työkaluille ja aseille. Muut rakennelmat vaativat työstöpenkin lähelle.',
    colliders: [{ seg: true, ax: -0.7, az: 0, bx: 0.7, bz: 0, r: 0.36, top: 0.95 }], box: [-0.85, 0, -0.4, 0.85, 1.05, 0.4],
  },
  campfire: {
    name: 'Nuotio', cost: { stone: 5, wood: 3, stick: 3 }, grid: null, station: 'campfire', fire: 'campfire',
    desc: 'Valoa ja lämpöä. Ruoanlaitto ja rohdot valmistetaan nuotiolla.',
    colliders: [{ x: 0, z: 0, r: 0.55 }], box: [-0.6, 0, -0.6, 0.6, 0.6, 0.6],
  },
  floor: {
    name: 'Puulattia', cost: { wood: 4 }, grid: 'floor',
    desc: 'Lattia 2 × 2 m. Seinät asettuvat lattian reunoille.',
    colliders: [], platform: [-1, -1, 1, 1, 0.125], box: [-1, -0.1, -1, 1, 0.13, 1],
  },
  wall: {
    name: 'Puuseinä', cost: { wood: 4, stick: 2 }, grid: 'wall', height: 2,
    desc: 'Lankkuseinä 2 × 2 m. Seinän voi pinota toisen päälle.',
    colliders: [{ seg: true, ax: -1, az: 0, bx: 1, bz: 0, r: 0.1, top: 2 }], box: [-1.05, 0, -0.1, 1.05, 2.05, 0.1],
  },
  mud_wall: {
    name: 'Saviseinä', cost: { clay: 6, stick: 4 }, grid: 'wall', height: 2,
    desc: 'Sahelin tapaan muurattu saviseinä 2 × 2 m.',
    colliders: [{ seg: true, ax: -1, az: 0, bx: 1, bz: 0, r: 0.15, top: 2 }], box: [-1.05, 0, -0.15, 1.05, 2.05, 0.15],
  },
  door_wall: {
    name: 'Oviaukko', cost: { wood: 4 }, grid: 'wall', height: 2,
    desc: 'Seinä, jossa on kulkuaukko.',
    colliders: [
      { seg: true, ax: -1, az: 0, bx: -0.52, bz: 0, r: 0.1, top: 2 },
      { seg: true, ax: 0.52, az: 0, bx: 1, bz: 0, r: 0.1, top: 2 },
    ],
    box: [-1.05, 0, -0.1, 1.05, 2.05, 0.1],
  },
  roof: {
    name: 'Olkikatto', cost: { stick: 4, reed: 6 }, grid: 'roof',
    desc: 'Kalteva ruoko-olkikatto ruudun päälle. [R] kääntää kallistuksen suunnan.',
    colliders: [], box: [-1.15, 0, -1.2, 1.15, 1.35, 1.2],
  },
  fence: {
    name: 'Aita', cost: { stick: 6, fiber: 2 }, grid: 'wall', height: 1.1,
    desc: 'Matala punottu aita ruudun reunalle.',
    colliders: [{ seg: true, ax: -1, az: 0, bx: 1, bz: 0, r: 0.07, top: 1.05 }], box: [-1.05, 0, -0.08, 1.05, 1.15, 0.08],
  },
  pole: {
    name: 'Pylväs', cost: { wood: 2 }, grid: 'corner',
    desc: 'Pystypuu ruudun kulmaan.',
    colliders: [{ x: 0, z: 0, r: 0.14 }], box: [-0.12, 0, -0.12, 0.12, 2.1, 0.12],
  },
  torch_stand: {
    name: 'Soihtuteline', cost: { stick: 3, fiber: 2, gum: 1 }, grid: null, fire: 'torch',
    desc: 'Palava soihtu valaisee pihan.',
    colliders: [{ x: 0, z: 0, r: 0.15 }], box: [-0.3, 0, -0.3, 0.3, 1.75, 0.3],
  },
  bed: {
    name: 'Makuualusta', cost: { fiber: 8, '#pelt': 1 }, grid: null, bed: true,
    desc: 'Herätyspaikka. Yöllä [E] nukkuu aamuun.',
    colliders: [], box: [-1, 0, -0.45, 1, 0.2, 0.45],
  },
  rowboat: {
    name: 'Soutuvene', cost: { wood: 10, rope: 2, gum: 2 }, grid: null, boat: 'rowboat',
    desc: 'Pieni soutuvene. Hidas ja heikko, mutta halpa. Asetetaan vain veteen. Soutaminen kuluttaa kestävyyttä.',
    colliders: [], box: [-0.7, -0.3, -1.9, 0.7, 0.6, 1.9],
  },
  sailboat: {
    name: 'Purjevene', cost: { wood: 24, rope: 8, gum: 6, leather: 4 }, grid: null, boat: 'sailboat',
    desc: 'Latinalaispurjeinen vene. Kulkee tuulen voimalla, sivutuulessa nopeimmin; suoraan vastatuuleen ei pääse. Asetetaan vain veteen.',
    colliders: [], box: [-1.1, -0.55, -3.3, 1.1, 1, 3.3],
  },
  ship: {
    name: 'Purjelaiva', cost: { wood: 160, rope: 40, gum: 24, leather: 24, stone: 30 }, grid: null, boat: 'ship',
    desc: 'Valtava kolmimastoinen karakki. Kestävä ja nopea myötätuulessa, mutta vaatii valtavasti tarvikkeita. Rakennetaan vähintään 0,7 m syvään rantaveteen ja ajetaan sieltä hitaasti syvemmälle; vapaa purjehdus vaatii 1,25 m vettä.',
    colliders: [], box: [-3.7, -2.4, -12, 3.7, 7.8, 12],
  },
};

export const PIECE_ORDER = ['workbench', 'campfire', 'floor', 'wall', 'mud_wall', 'door_wall', 'roof', 'fence', 'pole', 'torch_stand', 'bed', 'rowboat', 'sailboat', 'ship'];
