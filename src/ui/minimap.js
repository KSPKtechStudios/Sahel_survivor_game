// Minikartta (oikea yläkulma): maasto pelaajan ympäriltä ja biomin nimi.
// Kartta kääntyy pelaajan mukana, joten katsesuunta on aina ylöspäin.
import { mapColorRGB, biomeOf, sampleTerrain, BIOMES } from '../world/terrain.js';

const RES = 72;         // näytteitä per sivu
const RANGE = 110;      // metriä keskeltä reunaan

export class Minimap {
  constructor() {
    this.canvas = document.getElementById('minimap-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.label = document.getElementById('biome-name');
    this.buf = document.createElement('canvas');
    this.buf.width = this.buf.height = RES;
    this.bctx = this.buf.getContext('2d');
    this.img = this.bctx.createImageData(RES, RES);
    this.timer = 0;
    this.lastBiome = null;
    this._s = {};
    this._col = [0, 0, 0];
  }

  update(dt, player) {
    this.timer -= dt;
    if (this.timer > 0) return;
    this.timer = 0.2;

    const px = player.position.x;
    const pz = player.position.z;
    const yaw = player.yaw;
    // Kartan "ylös" = pelaajan katsesuunta
    const fx = -Math.sin(yaw), fz = -Math.cos(yaw);
    const rx = Math.cos(yaw), rz = -Math.sin(yaw);
    const data = this.img.data;
    const col = this._col;
    const step = (RANGE * 2) / RES;
    const heights = new Float32Array(RES * RES);
    for (let j = 0; j < RES; j++) {
      for (let i = 0; i < RES; i++) {
        const u = (i - RES / 2 + 0.5) * step;
        const v = (RES / 2 - j - 0.5) * step;
        const x = px + rx * u + fx * v;
        const z = pz + rz * u + fz * v;
        const s = mapColorRGB(x, z, col);
        heights[j * RES + i] = s.h;
        const o = (j * RES + i) * 4;
        data[o] = col[0];
        data[o + 1] = col[1];
        data[o + 2] = col[2];
        data[o + 3] = 255;
      }
    }
    // Rinnevarjostus (valo vasemmalta ylhäältä)
    for (let j = 1; j < RES; j++) {
      for (let i = 1; i < RES; i++) {
        const d = heights[j * RES + i] - heights[(j - 1) * RES + (i - 1)];
        const k = Math.max(0.7, Math.min(1.3, 1 - d * 0.25));
        const o = (j * RES + i) * 4;
        data[o] = Math.min(255, data[o] * k);
        data[o + 1] = Math.min(255, data[o + 1] * k);
        data[o + 2] = Math.min(255, data[o + 2] * k);
      }
    }
    this.bctx.putImageData(this.img, 0, 0);

    const ctx = this.ctx;
    const W = this.canvas.width;
    ctx.clearRect(0, 0, W, W);
    ctx.save();
    ctx.beginPath();
    ctx.arc(W / 2, W / 2, W / 2 - 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(this.buf, 0, 0, W, W);
    // Reunan varjo
    const g = ctx.createRadialGradient(W / 2, W / 2, W * 0.3, W / 2, W / 2, W / 2);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(20,10,0,0.45)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, W);
    ctx.restore();

    // Pelaajan nuoli
    ctx.save();
    ctx.translate(W / 2, W / 2);
    ctx.beginPath();
    ctx.moveTo(0, -9);
    ctx.lineTo(6.5, 7);
    ctx.lineTo(0, 3.5);
    ctx.lineTo(-6.5, 7);
    ctx.closePath();
    ctx.fillStyle = '#fff6e4';
    ctx.strokeStyle = 'rgba(40,20,5,0.9)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fill();
    ctx.restore();

    const biome = biomeOf(sampleTerrain(px, pz, this._s));
    if (biome !== this.lastBiome) {
      this.lastBiome = biome;
      this.label.textContent = BIOMES[biome].name;
      this.label.classList.remove('pulse');
      void this.label.offsetWidth;
      this.label.classList.add('pulse');
    }
  }
}
