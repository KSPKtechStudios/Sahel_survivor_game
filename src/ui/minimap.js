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

    // Pohjoinen (P) reunalla
    const nx = R + Math.sin(yaw) * (R - 11), ny = R - Math.cos(yaw) * (R - 11);
    ctx.font = "400 12px 'Eagle Lake', Georgia, serif";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(255, 244, 220, 0.85)';
    ctx.strokeText('P', nx, ny);
    ctx.fillStyle = '#7a2a16';
    ctx.fillText('P', nx, ny);

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
