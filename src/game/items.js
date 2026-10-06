// Esineet. tool = työkalun tyyppi (vaikuttaa siihen, mitä voi hakata),
// place = asetettava rakennelma.
//
// HUOM: esineet ja reseptit ovat prototyypin paikkamerkkejä (ks. docs/DESIGN.md).

export const ITEMS = {
  stick: { name: 'Risu', stack: 50, floats: true, desc: 'Kuiva oksa. Perusmateriaali.' },
  stone: { name: 'Kivi', stack: 50, desc: 'Käteen sopiva kivi.' },
  fiber: { name: 'Kuitu', stack: 50, floats: true, desc: 'Kuivaa kortetta ja kuitua sitomiseen.' },
  wood: { name: 'Puu', stack: 30, floats: true, desc: 'Akasiapuuta.' },
  stone_axe: { name: 'Kivikirves', stack: 1, tool: 'axe', damage: 1, desc: 'Puiden kaatamiseen.' },
  stone_pick: { name: 'Kivihakku', stack: 1, tool: 'pickaxe', damage: 1, desc: 'Lohkareiden louhimiseen.' },
  campfire: { name: 'Nuotio', stack: 5, place: 'campfire', desc: 'Valoa ja lämpöä yöhön. Aseta hiiren oikealla.' },
  // Arvoesineet (arkuista). Käyttötarkoitus on vielä avoin (esim. kauppa).
  gold_nugget: { name: 'Kultahippu', stack: 20, valuable: true, desc: 'Arvokas kultahippu. Sahelin kulta on ollut haluttua vuosisatoja.' },
  cowrie: { name: 'Kaurikotilo', stack: 50, valuable: true, desc: 'Kaurikotiloita käytettiin Länsi-Afrikassa rahana.' },
  bronze_bracelet: { name: 'Pronssirannerengas', stack: 5, valuable: true, desc: 'Vanha, koristeellinen pronssikoru.' },
};

export const RECIPES = [
  { id: 'stone_axe', out: 'stone_axe', count: 1, need: { stick: 3, stone: 2, fiber: 2 } },
  { id: 'stone_pick', out: 'stone_pick', count: 1, need: { stick: 3, stone: 3, fiber: 2 } },
  { id: 'campfire', out: 'campfire', count: 1, need: { wood: 3, stone: 5, stick: 3 } },
];
