// Opas (oikea alakulma): tehtäväketju, joka etenee pelaajan tekemisten mukaan.
// Tilastot lasketaan pelin alusta, joten etukäteen tehty työ kelpaa.
import { events } from './events.js';

export const GUIDE_STEPS = [
  {
    title: 'Ensimmäiset tarvikkeet',
    text: 'Kerää risuja ja kiviä maasta ja hakkaa kuivuneita pensaita. Sienet, kukat ja marjat voi poimia [E].',
    goals: [
      { key: 'pickup:stick', label: 'Kerää risuja maasta', need: 5 },
      { key: 'pickup:stone', label: 'Kerää kiviä', need: 5 },
      { key: 'harvest:bush', label: 'Hakkaa kuivuneita pensaita', need: 3 },
    ],
    hint: '[E] poimi · [Hiiri 1] hakkaa · kävele pudonneiden esineiden yli',
  },
  {
    title: 'Ensimmäiset työkalut',
    text: 'Avaa reppu ja valmista kivikirves ja vasara. Vasaralla rakennetaan.',
    goals: [
      { key: 'craft:stone_axe', label: 'Valmista kivikirves', need: 1 },
      { key: 'craft:hammer', label: 'Valmista vasara', need: 1 },
    ],
    hint: '[Tab] reppu ja valmistus',
  },
  {
    title: 'Puuta',
    text: 'Ota kirves käteen ja kaada akasia (matala, sateenvarjon muotoinen puu). Pilko kaatunut runko ja kerää puut.',
    goals: [
      { key: 'harvest:acacia', label: 'Kaada akasia', need: 1 },
      { key: 'harvest:log', label: 'Pilko kaatunut runko', need: 1 },
    ],
    hint: '[1–8] tai rulla: valitse kirves',
  },
  {
    title: 'Työstöpenkki',
    text: 'Ota vasara käteen, avaa rakennusvalikko ja rakenna työstöpenkki. Nuotio ja muut rakennelmat vaativat työstöpenkin lähelle.',
    goals: [{ key: 'place:workbench', label: 'Rakenna työstöpenkki', need: 1 }],
    hint: 'Vasara kädessä: [Hiiri 2] valikko, [Hiiri 1] rakenna',
  },
  {
    title: 'Nuotio yötä varten',
    text: 'Yöt ovat pimeitä. Rakenna nuotio työstöpenkin lähelle.',
    goals: [{ key: 'place:campfire', label: 'Rakenna nuotio', need: 1 }],
    hint: 'Vasara: [Hiiri 2] valikko → Nuotio',
  },
  {
    title: 'Ateria',
    text: 'Raaka ruoka ja sienet ovat huonoa ruokaa, ja niistä voi saada myrkytyksen. Valmista ateria nuotiolla ja syö se.',
    goals: [
      { key: 'cook:any', label: 'Valmista ruokaa nuotiolla', need: 1 },
      { key: 'ate:any', label: 'Syö', need: 1 },
    ],
    hint: 'Nuotion lähellä [Tab] → Ruoka · ruoka kädessä [Hiiri 2] syö',
  },
  {
    title: 'Metsästys',
    text: 'Arat eläimet pakenevat, vaikka hiipisit. Valmista työstöpenkillä jousi ja nuolia ja ammu.',
    goals: [
      { key: 'craft:bow', label: 'Valmista jousi', need: 1 },
      { key: 'shoot:any', label: 'Ammu nuoli', need: 1 },
    ],
    hint: 'Pidä [Hiiri 1] pohjassa ja päästä · [Ctrl] hiivi',
  },
  {
    title: 'Hyvä alku!',
    text: 'Selvisit ensimmäisistä askelista. Rakenna suoja, tutki maailmaa ja etsi riimukiviä.',
    goals: [],
    hint: '',
  },
];

export class Guide {
  constructor() {
    this.step = 0;
    this.stats = {};
    this.pendingAdvance = 0;
    const track = (prefix, field) => (data) => this.record(`${prefix}:${data[field]}`);
    events.on('pickup', track('pickup', 'type'));
    events.on('harvest', track('harvest', 'type'));
    events.on('craft', (d) => {
      this.record(`craft:${d.item}`);
      if (d.station === 'campfire') this.record('cook:any');
    });
    events.on('place', track('place', 'item'));
    events.on('ate', () => this.record('ate:any'));
    events.on('arrowShot', () => this.record('shoot:any'));
  }

  get current() {
    return GUIDE_STEPS[this.step];
  }

  progress(goal) {
    return Math.min(goal.need, this.stats[goal.key] || 0);
  }

  isStepDone(step = this.current) {
    return step.goals.length > 0 && step.goals.every((g) => this.progress(g) >= g.need);
  }

  record(key) {
    this.stats[key] = (this.stats[key] || 0) + 1;
    events.emit('guide', { changed: key });
  }

  update(dt) {
    if (this.step >= GUIDE_STEPS.length - 1) return;
    if (this.isStepDone()) {
      this.pendingAdvance += dt;
      if (this.pendingAdvance > 1.6) {
        this.pendingAdvance = 0;
        this.step++;
        events.emit('guide', { advanced: true });
      }
    } else {
      this.pendingAdvance = 0;
    }
  }

  serialize() {
    return { step: this.step, stats: this.stats };
  }

  load(data) {
    if (!data) return;
    this.step = Math.min(Math.max(0, data.step | 0), GUIDE_STEPS.length - 1);
    this.stats = data.stats || {};
    events.emit('guide', {});
  }
}
