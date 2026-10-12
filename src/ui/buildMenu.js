// Rakennusvalikko (vasara kädessä [Hiiri 2]): osat kuvakkeineen ja
// hintoineen. Klikkaus valitsee osan ja sulkee valikon.
import { ITEMS, TAG_NAMES, tagged } from '../game/items.js';
import { PIECES, PIECE_ORDER, BENCH_RANGE } from '../game/pieces.js';

export class BuildMenu {
  constructor({ inventory, itemIcons, pieceIcons, onSelect, hasBench }) {
    Object.assign(this, { inventory, itemIcons, pieceIcons, onSelect, hasBench });
    this.root = document.getElementById('buildmenu');
    this.grid = document.getElementById('build-grid');
    this.info = document.getElementById('build-info');
    this.open = false;
    this.selected = null;
  }

  show(selected) {
    this.open = true;
    this.selected = selected;
    this.root.classList.remove('hidden');
    this.render();
  }

  hide() {
    this.open = false;
    this.root.classList.add('hidden');
  }

  _describe(type) {
    const def = PIECES[type];
    this.info.innerHTML = '<b></b><span></span>';
    this.info.querySelector('b').textContent = def.name;
    const bench = def.noBench ? '' : ` Vaatii työstöpenkin ${BENCH_RANGE} m:n säteelle.`;
    this.info.querySelector('span').textContent = def.desc + bench;
  }

  render() {
    const inv = this.inventory;
    const bench = this.hasBench();
    this.grid.innerHTML = '';
    for (const type of PIECE_ORDER) {
      const def = PIECES[type];
      let can = def.noBench || bench;
      const reqs = Object.entries(def.cost).map(([id, n]) => {
        const have = inv.count(id);
        if (have < n) can = false;
        const icon = id[0] === '#' ? tagged(id.slice(1))[0] : id;
        const title = id[0] === '#' ? TAG_NAMES[id.slice(1)] : ITEMS[id].name;
        return `<span class="req ${have >= n ? 'ok' : 'miss'}" title="${title}"><img src="${this.itemIcons[icon] || ''}" alt="">${Math.min(have, 999)}/${n}</span>`;
      }).join('');
      const card = document.createElement('div');
      card.className = 'bpiece' + (can ? ' can' : '') + (type === this.selected ? ' sel' : '');
      card.innerHTML = `<img class="ricon" src="${this.pieceIcons[type] || ''}" alt=""><div class="rname"></div><div class="reqs">${reqs}</div>`
        + (def.noBench || bench ? '' : '<div class="rstation miss">Ei työstöpenkkiä</div>');
      card.querySelector('.rname').textContent = def.name;
      card.addEventListener('mouseenter', () => this._describe(type));
      card.addEventListener('click', () => this.onSelect(type));
      this.grid.appendChild(card);
    }
    this.info.innerHTML = '<span class="muted">Valitse rakennettava. [Hiiri 1] rakentaa, [R] kääntää, [X] purkaa (materiaalit palautuvat).</span>';
  }
}
