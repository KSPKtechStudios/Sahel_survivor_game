// Minikartta (oikea yläkulma): alussa tyhjä karttapohja, johon tutkittu
// maasto piirtyy (explored.js). Kartta kääntyy pelaajan mukana, joten
// katsesuunta on aina ylöspäin. Alla biomin nimi.
import { sampleTerrain, placeName } from '../world/terrain.js';
import { drawWaypointName, drawWaypoint, drawBoat, createPaperPattern } from './explored.js';

const RANGE = 110; // metriä keskeltä reunaan
const GRID = 128;  // ruudukon väli metreinä

export class Minimap {
  constructor(explored) {
    this.explored = explored;
    this.canvas = document.getElementById('minimap-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.label = document.getElementById('biome-name');
    this.css = this.canvas.width;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = this.canvas.height = Math.round(this.css * dpr);
    this.dpr = dpr;
    this.paper = createPaperPattern(this.ctx);
    this.biomeTimer = 0;
    this.lastBiome = null;
    this._s = {};
    this._buildRing();
  }

  // Kompassirengas (sessio 19): asteikko 10° välein ja ilmansuunnat P, I, E, L.
  // Rengas kääntyy kartan mukana; kirjaimet pysyvät pystyssä.
  _buildRing() {
    const svg = document.getElementById('minimap-ring');
    if (!svg) return;
    const C = 102;
    let h = `<circle class="band" cx="${C}" cy="${C}" r="94"/><circle class="edge" cx="${C}" cy="${C}" r="88.5"/><circle class="edge out" cx="${C}" cy="${C}" r="100.5"/><g class="rot">`;
    for (let a = 0; a < 360; a += 10) {
      if (a % 90 === 0) continue;
      const big = a % 30 === 0;
      const r0 = big ? 90.5 : 93.5, r1 = big ? 98 : 96;
      const s = Math.sin((a * Math.PI) / 180), c = -Math.cos((a * Math.PI) / 180);
      h += `<line class="tick${big ? ' big' : ''}" x1="${(C + s * r0).toFixed(2)}" y1="${(C + c * r0).toFixed(2)}" x2="${(C + s * r1).toFixed(2)}" y2="${(C + c * r1).toFixed(2)}"/>`;
    }
    const L = [['P', 0, 'n'], ['I', 90, ''], ['E', 180, ''], ['L', 270, '']];
    for (const [t, a, cls] of L) {
      const s = Math.sin((a * Math.PI) / 180), c = -Math.cos((a * Math.PI) / 180);
      h += `<text class="${cls}" data-a="${a}" x="${(C + s * 94).toFixed(2)}" y="${(C + c * 94).toFixed(2)}">${t}</text>`;
    }
    svg.innerHTML = h + '</g>';
    this.ringRot = svg.querySelector('.rot');
    this.ringTexts = [...svg.querySelectorAll('text')];
  }

  update(dt, player, boats = null) {
    const px = player.position.x;
    const pz = player.position.z;
    const yaw = player.yaw;
    const ctx = this.ctx;
    const W = this.css;
    const R = W / 2;
    const k = (R - 3) / RANGE; // pikseliä / metri

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, W, W);
    ctx.save();
    ctx.beginPath();
    ctx.arc(R, R, R - 2, 0, Math.PI * 2);
    ctx.clip();

    // Maailman koordinaatit: keskellä pelaaja, katsesuunta ylös.
    ctx.save();
    ctx.translate(R, R);
    ctx.rotate(yaw);
    ctx.scale(k, k);
    ctx.translate(-px, -pz);
    const ext = RANGE * 1.45;
    ctx.fillStyle = this.paper;
    ctx.fillRect(px - ext, pz - ext, ext * 2, ext * 2);
    // Haalea ruudukko tyhjälle pohjalle
    ctx.strokeStyle = 'rgba(110, 80, 40, 0.16)';
    ctx.lineWidth = 1 / k;
    ctx.beginPath();
    for (let g = Math.floor((px - ext) / GRID) * GRID; g <= px + ext; g += GRID) {
      ctx.moveTo(g, pz - ext); ctx.lineTo(g, pz + ext);
    }
    for (let g = Math.floor((pz - ext) / GRID) * GRID; g <= pz + ext; g += GRID) {
      ctx.moveTo(px - ext, g); ctx.lineTo(px + ext, g);
    }
    ctx.stroke();
    ctx.imageSmoothingEnabled = true;
    this.explored.drawTiles(ctx, px - ext, pz - ext, px + ext, pz + ext);
    ctx.restore();

    // Merkit pystyssä; kaukaiset merkit reunalle
    const c = Math.cos(yaw), s = Math.sin(yaw);
    for (const w of this.explored.waypoints) {
      const dx = (w.x - px) * k, dz = (w.z - pz) * k;
      let sx = dx * c - dz * s, sy = dx * s + dz * c;
      const d = Math.hypot(sx, sy);
      const max = R - 12;
      let size = 13;
      if (d > max) { sx *= max / d; sy *= max / d; size = 10; }
      ctx.globalAlpha = d > max ? 0.8 : 1;
      drawWaypoint(ctx, w.type, R + sx, R + sy, size);
      if (d <= max && w.name) drawWaypointName(ctx, w.name, R + sx, R + sy + 8, 11);
    }
    // Veneet (ei sitä, jossa ollaan)
    if (boats) {
      for (const b of boats.list) {
        if (b === boats.riding || b.sinking >= 0) continue;
        const dx = (b.x - px) * k, dz = (b.z - pz) * k;
        let sx = dx * c - dz * s, sy = dx * s + dz * c;
        const d = Math.hypot(sx, sy);
        const max = R - 12;
        if (d > max) { sx *= max / d; sy *= max / d; }
        ctx.globalAlpha = d > max ? 0.75 : 1;
        const hx = Math.sin(b.yaw - yaw), hy = Math.cos(b.yaw - yaw);
        drawBoat(ctx, R + sx, R + sy, hx, hy, b.type === 'ship' ? 16 : b.type === 'sailboat' ? 12 : 10, b.type !== 'rowboat');
      }
    }
    ctx.globalAlpha = 1;

    // Reunan varjo
    const g = ctx.createRadialGradient(R, R, W * 0.32, R, R, R);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(60,35,10,0.42)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, W);
    ctx.restore();

    // Kompassirengas kääntyy kartan mukana (kirjaimet pysyvät pystyssä).
    if (this.ringRot) {
      const deg = (yaw * 180) / Math.PI;
      this.ringRot.setAttribute('transform', `rotate(${deg.toFixed(2)} 102 102)`);
      for (const t of this.ringTexts) t.setAttribute('transform', `rotate(${(-deg).toFixed(2)} ${t.getAttribute('x')} ${t.getAttribute('y')})`);
    }

    // Pelaajan nuoli
    ctx.save();
    ctx.translate(R, R);
    ctx.beginPath();
    ctx.moveTo(0, -9);
    ctx.lineTo(6.5, 7);
    ctx.lineTo(0, 3.5);
    ctx.lineTo(-6.5, 7);
    ctx.closePath();
    ctx.fillStyle = '#b3261e';
    ctx.strokeStyle = 'rgba(255, 246, 228, 0.95)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fill();
    ctx.restore();

    this.biomeTimer -= dt;
    if (this.biomeTimer <= 0) {
      this.biomeTimer = 0.4;
      const biome = placeName(sampleTerrain(px, pz, this._s));
      if (biome !== this.lastBiome) {
        this.lastBiome = biome;
        this.label.textContent = biome;
        this.label.classList.remove('pulse');
        void this.label.offsetWidth;
        this.label.classList.add('pulse');
      }
    }
  }
}
