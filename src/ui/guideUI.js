// Oppaan paneeli oikeassa alakulmassa.
import { GUIDE_STEPS } from '../game/guide.js';
import { events } from '../game/events.js';

export class GuideUI {
  constructor(guide) {
    this.guide = guide;
    this.el = document.getElementById('guide');
    this.title = this.el.querySelector('.g-title');
    this.text = this.el.querySelector('.g-text');
    this.list = this.el.querySelector('.g-goals');
    this.hint = this.el.querySelector('.g-hint');
    this.stepNo = this.el.querySelector('.g-step');
    events.on('guide', (d) => {
      this.render();
      if (d && d.advanced) this.flash();
    });
    this.render();
  }

  flash() {
    this.el.classList.remove('advance');
    void this.el.offsetWidth;
    this.el.classList.add('advance');
  }

  render() {
    const g = this.guide;
    const step = g.current;
    const last = GUIDE_STEPS.length - 1;
    this.stepNo.textContent = g.step < last ? `Tehtävä ${g.step + 1}/${last}` : 'Valmis';
    this.title.textContent = step.title;
    this.text.textContent = step.text;
    this.list.innerHTML = '';
    for (const goal of step.goals) {
      const p = g.progress(goal);
      const done = p >= goal.need;
      const li = document.createElement('li');
      li.className = done ? 'done' : '';
      li.innerHTML = `<span class="box">${done ? '✓' : ''}</span><span class="lbl"></span><span class="cnt">${p}/${goal.need}</span>`;
      li.querySelector('.lbl').textContent = goal.label;
      this.list.appendChild(li);
    }
    this.hint.textContent = step.hint || '';
    this.hint.style.display = step.hint ? '' : 'none';
    this.el.classList.toggle('complete', g.isStepDone(step));
  }
}
