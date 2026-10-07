// Iso kartta [M]: tutkittu alue paperikartalla. Vedä = liikuta, rulla =
// zoomaa, klikkaus tyhjään = uusi merkki valitulla symbolilla ja sille nimi,
// klikkaus merkin päälle = nimeä uudelleen tai poista, oikea klikkaus = poista.
import { drawWaypoint, drawWaypointName, drawBoat, createPaperPattern, WAYPOINT_TYPES, WAYPOINT_NAME_MAX } from './explored.js';

const MIN_MPP = 0.5;  // metriä / pikseli (lähin)
const MAX_MPP = 24;   // kaukaisin
const PICK_PX = 13;

export class BigMap {
  constructor(explored, player) {
    this.explored = explored;
    this.player = player;
    this.root = document.getElementById('bigmap');
    this.canvas = document.getElementById('bigmap-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.paper = createPaperPattern(this.ctx);
    this.coords = document.getElementById('bm-coords');
    this.visible = false;
    this.cx = 0; this.cz = 0;   // näkymän keskipiste (m)
    this.mpp = 2;               // metriä / pikseli
    this.selected = 'cross';
    this.hover = null;          // { x, z, sx, sy }
    this.drag = null;
    this.drawnVersion = -1;
    this.needs = true;
    this.editing = -1;          // nimettävän merkin indeksi
    this._buildToolbar();
    this._buildEditor();
    this._bind();
  }

  // Pieni ikkuna merkin nimeämiseen (avautuu merkin viereen).
  _buildEditor() {
    const ed = document.getElementById('bm-edit');
    this.editor = ed;
    this.nameInput = document.getElementById('bm-name');
    this.nameInput.maxLength = WAYPOINT_NAME_MAX;
    this.nameInput.addEventListener('keydown', (e) => {
      // Kirjoittaminen ei saa ohjata peliä (M sulkisi kartan jne.).
      e.stopPropagation();
      if (e.key === 'Enter') { e.preventDefault(); this.closeEditor(true); }
      else if (e.key === 'Escape') { e.preventDefault(); this.closeEditor(false); }
    });
    this.nameInput.addEventListener('keyup', (e) => e.stopPropagation());
    document.getElementById('bm-ok').addEventListener('click', () => this.closeEditor(true));
    document.getElementById('bm-del').addEventListener('click', () => {
      const i = this.editing;
      this.closeEditor(false);
      if (i >= 0) this.explored.removeWaypoint(i);
      this.needs = true;
    });
    for (const el of [ed]) el.addEventListener('pointerdown', (e) => e.stopPropagation());
  }

  openEditor(i) {
    const wp = this.explored.waypoints[i];
    if (!wp) return;
    this.editing = i;
    this.nameInput.value = wp.name || '';
    this.editor.classList.remove('hidden');
    this._placeEditor();
    // Kohdistus vasta, kun klikkaus on käsitelty.
    setTimeout(() => { this.nameInput.focus(); this.nameInput.select(); }, 0);
    this.needs = true;
  }

  closeEditor(save) {
    if (this.editing < 0) return;
    if (save) this.explored.renameWaypoint(this.editing, this.nameInput.value);
    this.editing = -1;
    this.editor.classList.add('hidden');
    this.nameInput.blur();
    this.needs = true;
  }

  get typing() {
    return this.editing >= 0;
  }

  _placeEditor() {
    const wp = this.explored.waypoints[this.editing];
    if (!wp) return;
    const x = (wp.x - this.cx) / this.mpp + this.w / 2;
    const y = (wp.z - this.cz) / this.mpp + this.h / 2;
    const ew = this.editor.offsetWidth || 260, eh = this.editor.offsetHeight || 40;
    const left = Math.min(this.w - ew - 8, Math.max(8, x - ew / 2));
    const top = y + 18 + eh > this.h - 8 ? y - 18 - eh : y + 18;
    this.editor.style.left = `${left}px`;
    this.editor.style.top = `${top}px`;
  }

  _buildToolbar() {
    const bar = document.getElementById('bm-symbols');
    this.symbolBtns = [];
    for (const w of WAYPOINT_TYPES) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'bm-sym';
      b.title = w.name;
      const c = document.createElement('canvas');
      c.width = c.height = 52;
      const g = c.getContext('2d');
      g.scale(2, 2);
      drawWaypoint(g, w.type, 13, 13, 16);
      b.appendChild(c);
      const span = document.createElement('span');
      span.textContent = w.name;
      b.appendChild(span);
      b.addEventListener('click', () => this.select(w.type));
      bar.appendChild(b);
      this.symbolBtns.push([w.type, b]);
    }
    this.select(this.selected);
    document.getElementById('bm-center').addEventListener('click', () => this.center());
  }

  select(type) {
    this.selected = type;
    for (const [t, b] of this.symbolBtns) b.classList.toggle('on', t === type);
  }

  center() {
    this.cx = this.player.position.x;
    this.cz = this.player.position.z;
    this.needs = true;
  }

  _bind() {
    const cv = this.canvas;
    cv.addEventListener('contextmenu', (e) => e.preventDefault());
    cv.addEventListener('pointerdown', (e) => {
      cv.setPointerCapture(e.pointerId);
      this.drag = { id: e.pointerId, x: e.clientX, y: e.clientY, cx: this.cx, cz: this.cz, moved: 0, button: e.button };
    });
    cv.addEventListener('pointermove', (e) => {
      const [sx, sy] = this._local(e);
      if (this.drag && this.drag.id === e.pointerId) {
        const k = this.w / cv.getBoundingClientRect().width;
        const dx = (e.clientX - this.drag.x) * k, dy = (e.clientY - this.drag.y) * k;
        this.drag.moved = Math.max(this.drag.moved, Math.hypot(dx, dy));
        if (this.drag.moved > 4) {
          this.cx = this.drag.cx - dx * this.mpp;
          this.cz = this.drag.cz - dy * this.mpp;
          cv.classList.add('dragging');
        }
      }
      this.hover = { ...this._toWorld(sx, sy), sx, sy };
      this.needs = true;
    });
    cv.addEventListener('pointerleave', () => { this.hover = null; this.needs = true; });
    const end = (e) => {
      if (!this.drag || this.drag.id !== e.pointerId) return;
      const d = this.drag;
      this.drag = null;
      cv.classList.remove('dragging');
      if (d.moved > 4) return;
      const [sx, sy] = this._local(e);
      this._click(sx, sy, d.button);
    };
    cv.addEventListener('pointerup', end);
    cv.addEventListener('pointercancel', () => { this.drag = null; cv.classList.remove('dragging'); });
    cv.addEventListener('wheel', (e) => {
      e.preventDefault();
      const [sx, sy] = this._local(e);
      const before = this._toWorld(sx, sy);
      const f = Math.exp(Math.sign(e.deltaY) * Math.min(Math.abs(e.deltaY), 120) * 0.0035);
      this.mpp = Math.min(MAX_MPP, Math.max(MIN_MPP, this.mpp * f));
      // Zoomaus kursorin kohdalle
      const after = this._toWorld(sx, sy);
      this.cx += before.x - after.x;
      this.cz += before.z - after.z;
      this.needs = true;
    }, { passive: false });
    window.addEventListener('resize', () => { if (this.visible) this._resize(); });
  }

  // Hiiren paikka kartan pikseleinä (toimii myös avausanimaation aikana).
  _local(e) {
    const r = this.canvas.getBoundingClientRect();
    return [(e.clientX - r.left) * (this.w / r.width), (e.clientY - r.top) * (this.h / r.height)];
  }

  _click(sx, sy, button) {
    const p = this._toWorld(sx, sy);
    const i = this.explored.waypointNear(p.x, p.z, PICK_PX * this.mpp);
    if (this.editing >= 0) {
      // Klikkaus muualle sulkee nimeämisen (nimi tallennetaan).
      this.closeEditor(true);
      if (i < 0) return;
    }
    if (i >= 0) {
      if (button === 2) this.explored.removeWaypoint(i);
      else this.openEditor(i);
    } else if (button === 0) {
      this.openEditor(this.explored.addWaypoint(p.x, p.z, this.selected));
    }
    this.needs = true;
  }

  _toWorld(sx, sy) {
    return { x: this.cx + (sx - this.w / 2) * this.mpp, z: this.cz + (sy - this.h / 2) * this.mpp };
  }

  _resize() {
    // clientWidth ei sisällä avausanimaation skaalausta.
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = Math.max(1, this.canvas.clientWidth);
    this.h = Math.max(1, this.canvas.clientHeight);
    this.canvas.width = Math.round(this.w * this.dpr);
    this.canvas.height = Math.round(this.h * this.dpr);
    this.needs = true;
  }

  show() {
    this.visible = true;
    this.root.classList.remove('hidden');
    // Uusi avaus keskittää pelaajaan
    this.center();
    this._resize();
    this.draw();
  }

  hide() {
    if (!this.visible) return;
    this.closeEditor(true);
    this.visible = false;
    this.root.classList.add('hidden');
    this.drag = null;
    this.hover = null;
  }

  update() {
    if (!this.visible) return;
    if (this.needs || this.drawnVersion !== this.explored.version) this.draw();
  }

  draw() {
    this.needs = false;
    this.drawnVersion = this.explored.version;
    const ctx = this.ctx;
    const { w, h, mpp } = this;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.fillStyle = this.paper;
    ctx.fillRect(0, 0, w, h);

    const minX = this.cx - (w / 2) * mpp, maxX = this.cx + (w / 2) * mpp;
    const minZ = this.cz - (h / 2) * mpp, maxZ = this.cz + (h / 2) * mpp;
    const sx = (x) => (x - this.cx) / mpp + w / 2;
    const sy = (z) => (z - this.cz) / mpp + h / 2;

    // Ruudukko: väli niin, että viivat ovat vähintään ~70 px päässä toisistaan
    const steps = [32, 64, 128, 256, 512, 1024, 2048, 4096];
    const grid = steps.find((s) => s / mpp >= 70) || 8192;
    ctx.strokeStyle = 'rgba(110, 80, 40, 0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let g = Math.floor(minX / grid) * grid; g <= maxX; g += grid) {
      const x = Math.round(sx(g)) + 0.5;
      ctx.moveTo(x, 0); ctx.lineTo(x, h);
    }
    for (let g = Math.floor(minZ / grid) * grid; g <= maxZ; g += grid) {
      const y = Math.round(sy(g)) + 0.5;
      ctx.moveTo(0, y); ctx.lineTo(w, y);
    }
    ctx.stroke();

    // Tutkittu maasto
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.scale(1 / mpp, 1 / mpp);
    ctx.translate(-this.cx, -this.cz);
    ctx.imageSmoothingEnabled = true;
    this.explored.drawTiles(ctx, minX, minZ, maxX, maxZ);
    ctx.restore();

    // Merkit
    let hoverIdx = -1;
    if (this.hover && !this.drag) hoverIdx = this.explored.waypointNear(this.hover.x, this.hover.z, PICK_PX * mpp);
    this.explored.waypoints.forEach((wp, i) => {
      const x = sx(wp.x), y = sy(wp.z);
      if (x < -20 || y < -20 || x > w + 20 || y > h + 20) return;
      if (i === hoverIdx) {
        ctx.beginPath();
        ctx.arc(x, y, 14, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 245, 220, 0.55)';
        ctx.fill();
      }
      drawWaypoint(ctx, wp.type, x, y, 18);
      drawWaypointName(ctx, wp.name, x, y + 12, 14);
    });
    if (this.editing >= 0) this._placeEditor();

    // Veneet
    if (this.boats) {
      for (const b of this.boats.list) {
        if (b === this.boats.riding || b.sinking >= 0) continue;
        const x = sx(b.x), y = sy(b.z);
        if (x < -20 || y < -20 || x > w + 20 || y > h + 20) continue;
        drawBoat(ctx, x, y, Math.sin(b.yaw), Math.cos(b.yaw), b.type === 'ship' ? 20 : b.type === 'sailboat' ? 15 : 12, b.type !== 'rowboat');
      }
    }

    // Pelaaja
    const p = this.player.position;
    ctx.save();
    ctx.translate(sx(p.x), sy(p.z));
    ctx.rotate(-this.player.yaw);
    ctx.beginPath();
    ctx.moveTo(0, -11);
    ctx.lineTo(8, 9);
    ctx.lineTo(0, 4.5);
    ctx.lineTo(-8, 9);
    ctx.closePath();
    ctx.fillStyle = '#b3261e';
    ctx.strokeStyle = 'rgba(255, 246, 228, 0.95)';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.fill();
    ctx.restore();

    // Esikatselu siitä, mihin uusi merkki tulee
    if (this.hover && !this.drag && hoverIdx < 0 && this.editing < 0) {
      ctx.globalAlpha = 0.45;
      drawWaypoint(ctx, this.selected, this.hover.sx, this.hover.sy, 18);
      ctx.globalAlpha = 1;
    }

    // Mittakaava vasempaan alakulmaan
    const nice = [5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000];
    const len = nice.find((n) => n / mpp >= 90) || 10000;
    const bx = 22, by = h - 24, bw = len / mpp;
    ctx.strokeStyle = '#4a2f15';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(bx, by - 6); ctx.lineTo(bx, by); ctx.lineTo(bx + bw, by); ctx.lineTo(bx + bw, by - 6);
    ctx.stroke();
    ctx.font = "700 14px 'Philosopher', sans-serif";
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = '#4a2f15';
    ctx.fillText(len >= 1000 ? `${len / 1000} km` : `${len} m`, bx + 4, by - 6);

    // Reunan varjostus
    const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(70,40,10,0.35)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // Etäisyys kursorin kohtaan
    if (this.coords) {
      if (this.hover) {
        const d = Math.hypot(this.hover.x - p.x, this.hover.z - p.z);
        this.coords.textContent = `Etäisyys: ${d >= 1000 ? `${(d / 1000).toFixed(1)} km` : `${Math.round(d)} m`}`;
      } else {
        this.coords.textContent = '';
      }
    }
  }
}
