// Opas (oikea alakulma): tehtäväketju, joka etenee pelaajan tekemisten mukaan.
// Tilastot lasketaan pelin alusta, joten etukäteen tehty työ kelpaa.
import { events } from './events.js';

export const GUIDE_STEPS = [
  {
    title: 'Ensimmäiset tarvikkeet',
    text: 'Kerää risuja, hakkaa kuivuneita pensaita ja tumbleweedejä ja kerää kiviä.',
    goals: [
      { key: 'pickup:stick', label: 'Kerää risuja maasta', need: 5 },
      { key: 'harvest:bush', label: 'Hakkaa kuivuneita pensaita', need: 3 },
      { key: 'harvest:tumbleweed', label: 'Hakkaa tumbleweedejä', need: 2 },
      { key: 'pickup:stone', label: 'Kerää kiviä', need: 5 },
    ],
    hint: '[E] poimi · [Hiiri 1] hakkaa',
  },
  {
    title: 'Ensimmäinen työkalu',
    text: 'Avaa reppu ja valmista kivikirves risuista, kivistä ja kuidusta.',
    goals: [{ key: 'craft:stone_axe', label: 'Valmista kivikirves', need: 1 }],
    hint: '[Tab] reppu ja valmistus',
  },
  {
    title: 'Puuta',
    text: 'Ota kirves käteen ja kaada akasia. Akasiat ovat matalia, sateenvarjon muotoisia puita.',
    goals: [{ key: 'harvest:acacia', label: 'Kaada akasia', need: 1 }],
    hint: '[1–8] tai rulla: valitse kirves',
  },
  {
    title: 'Kivihakku',
    text: 'Valmista kivihakku ja louhi sillä lohkare. Lohkareita on eniten punaisella laterittitasangolla.',
    goals: [
      { key: 'craft:stone_pick', label: 'Valmista kivihakku', need: 1 },
      { key: 'harvest:boulder', label: 'Louhi lohkare', need: 1 },
    ],
    hint: '[Tab] reppu ja valmistus',
  },
  {
    title: 'Nuotio yötä varten',
    text: 'Yöt ovat pimeitä. Valmista nuotio ja aseta se maahan.',
    goals: [
      { key: 'craft:campfire', label: 'Valmista nuotio', need: 1 },
      { key: 'place:campfire', label: 'Aseta nuotio maahan', need: 1 },
    ],
    hint: 'Valitse nuotio ja paina [Hiiri 2]',
  },
  {
    title: 'Hyvä alku!',
    text: 'Selvisit ensimmäisistä askelista. Lisää tehtäviä on tulossa.',
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
    events.on('craft', track('craft', 'item'));
    events.on('place', track('place', 'item'));
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
