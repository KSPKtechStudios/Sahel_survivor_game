// Tutkittu kartta: alussa tyhjä karttapohja, johon maasto "piirtyy" sitä
// mukaa kuin pelaaja kulkee. Maasto lasketaan ruuduittain generointisäikeessä;
// paljastettu alue on pehmeäreunainen maski. Tallennukseen menee vain karkea
// bittikartta (16 m solut), josta maski rakennetaan uudelleen latauksessa.

export const TILE_M = 512;     // ruudun koko metreinä
export const TILE_PX = 128;    // 4 m / pikseli
const CELL_M = 16;             // tallennettavan bittikartan solu
const CELLS = TILE_M / CELL_M; // 32 x 32 solua / ruutu
const REVEAL_M = 100;          // kuinka kauas ympäriltä kartta paljastuu

export const WAYPOINT_TYPES = [
  { type: 'cross', name: 'Raksi', color: '#b3261e' },
  { type: 'dot', name: 'Pallukka', color: '#1f5fa8' },
  { type: 'house', name: 'Talo', color: '#6b3f1d' },
  { type: 'flag', name: 'Lippu', color: '#2f7a2f' },
  { type: 'star', name: 'Tähti', color: '#c98a12' },
];

// Merkin piirto (keskipiste x, y; koko s pikseliä).
export function drawWaypoint(ctx, type, x, y, s = 14) {
  const def = WAYPOINT_TYPES.find((w) => w.type === type) || WAYPOINT_TYPES[0];
  ctx.save();
  ctx.translate(x, y);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.fillStyle = def.color;
  ctx.strokeStyle = def.color;
  const outline = () => { ctx.strokeStyle = 'rgba(255,248,230,0.95)'; };
  const h = s / 2;
  if (type === 'cross') {
    for (const [w, c] of [[s * 0.36, 'rgba(255,248,230,0.95)'], [s * 0.2, def.color]]) {
      ctx.lineWidth = w; ctx.strokeStyle = c;
      ctx.beginPath(); ctx.moveTo(-h, -h); ctx.lineTo(h, h); ctx.moveTo(h, -h); ctx.lineTo(-h, h); ctx.stroke();
    }
  } else if (type === 'dot') {
    ctx.beginPath(); ctx.arc(0, 0, h * 0.75, 0, Math.PI * 2);
    outline(); ctx.lineWidth = s * 0.18; ctx.stroke(); ctx.fill();
  } else if (type === 'house') {
    ctx.beginPath();
    ctx.moveTo(-h * 0.8, h * 0.85); ctx.lineTo(-h * 0.8, -h * 0.05); ctx.lineTo(0, -h * 0.85);
    ctx.lineTo(h * 0.8, -h * 0.05); ctx.lineTo(h * 0.8, h * 0.85); ctx.closePath();
    outline(); ctx.lineWidth = s * 0.16; ctx.stroke(); ctx.fill();
    ctx.fillStyle = 'rgba(255,240,210,0.9)';
    ctx.fillRect(-h * 0.22, h * 0.25, h * 0.44, h * 0.6);
  } else if (type === 'flag') {
    outline(); ctx.lineWidth = s * 0.26;
    ctx.beginPath(); ctx.moveTo(-h * 0.6, h); ctx.lineTo(-h * 0.6, -h); ctx.stroke();
    ctx.strokeStyle = def.color; ctx.lineWidth = s * 0.12;
    ctx.beginPath(); ctx.moveTo(-h * 0.6, h); ctx.lineTo(-h * 0.6, -h); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-h * 0.6, -h); ctx.lineTo(h * 0.9, -h * 0.55); ctx.lineTo(-h * 0.6, -h * 0.05); ctx.closePath();
    ctx.strokeStyle = 'rgba(255,248,230,0.95)'; ctx.lineWidth = s * 0.1; ctx.stroke(); ctx.fill();
  } else if (type === 'star') {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? h * 0.42 : h;
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    outline(); ctx.lineWidth = s * 0.16; ctx.stroke(); ctx.fill();
  }
  ctx.restore();
}

// Paperin kuvio kartan pohjaksi.
export function createPaperPattern(ctx) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#e4d2a6';
  g.fillRect(0, 0, 256, 256);
  const img = g.getImageData(0, 0, 256, 256);
  let s = 12345;
  const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (rnd() - 0.5) * 16;
    img.data[i] += n; img.data[i + 1] += n * 0.9; img.data[i + 2] += n * 0.7;
  }
  g.putImageData(img, 0, 0);
  // Muutama vaalea kuitujuova
  g.globalAlpha = 0.06;
  g.strokeStyle = '#7a5a30';
  for (let i = 0; i < 40; i++) {
    g.beginPath();
    const y = rnd() * 256;
    g.moveTo(0, y);
    g.bezierCurveTo(80, y + (rnd() - 0.5) * 20, 170, y + (rnd() - 0.5) * 20, 256, y + (rnd() - 0.5) * 10);
    g.stroke();
  }
  return ctx.createPattern(c, 'repeat');
}

function toB64(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

function fromB64(str) {
  const s = atob(str);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

export class ExploredMap {
  constructor(gen) {
    this.gen = gen;
    this.tiles = new Map();
    this.waypoints = [];
    this.lastReveal = null;
    this.version = 0; // kasvaa, kun jotain muuttuu
    this.composeTimer = 0;
    this.want = new Set(); // ruudut, joiden maastoa tarvitaan piirtoon
    this.inFlight = 0;
    this.focus = { x: 0, z: 0 };
    gen.onTile = (key, data) => this._onTile(key, data);
  }

  clear() {
    this.tiles.clear();
    this.want.clear();
    this.inFlight = 0;
    this.waypoints = [];
    this.lastReveal = null;
    this.version++;
  }

  _tile(tx, tz, create = true) {
    const key = `${tx},${tz}`;
    let t = this.tiles.get(key);
    if (!t && create) {
      const mask = document.createElement('canvas');
      mask.width = mask.height = TILE_PX;
      t = {
        key, tx, tz, mask, mctx: mask.getContext('2d'),
        terrain: null, comp: null, cctx: null,
        bits: new Uint8Array((CELLS * CELLS) / 8), dirty: true, requested: false,
      };
      this.tiles.set(key, t);
    }
    return t;
  }

  _onTile(key, data) {
    this.inFlight = Math.max(0, this.inFlight - 1);
    const t = this.tiles.get(key);
    if (!t) return;
    const c = document.createElement('canvas');
    c.width = c.height = TILE_PX;
    c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(data.buffer || data), TILE_PX, TILE_PX), 0, 0);
    t.terrain = c;
    t.comp = document.createElement('canvas');
    t.comp.width = t.comp.height = TILE_PX;
    t.cctx = t.comp.getContext('2d');
    t.dirty = true;
  }

  // Maalaa pehmeä ympyrä maskiin (maailman koordinaatit, säde metreinä).
  _paint(x, z, r) {
    const t0x = Math.floor((x - r) / TILE_M), t1x = Math.floor((x + r) / TILE_M);
    const t0z = Math.floor((z - r) / TILE_M), t1z = Math.floor((z + r) / TILE_M);
    const cr = r * 0.8;
    for (let tz = t0z; tz <= t1z; tz++) {
      for (let tx = t0x; tx <= t1x; tx++) {
        const t = this._tile(tx, tz);
        const k = TILE_PX / TILE_M;
        const px = (x - tx * TILE_M) * k;
        const pz = (z - tz * TILE_M) * k;
        const pr = r * k;
        const g = t.mctx.createRadialGradient(px, pz, pr * 0.55, px, pz, pr);
        g.addColorStop(0, 'rgba(0,0,0,1)');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        t.mctx.fillStyle = g;
        t.mctx.beginPath();
        t.mctx.arc(px, pz, pr, 0, Math.PI * 2);
        t.mctx.fill();
        t.dirty = true;
        // Tallennettava bittikartta
        const c0x = Math.max(0, Math.floor((x - cr - tx * TILE_M) / CELL_M));
        const c1x = Math.min(CELLS - 1, Math.floor((x + cr - tx * TILE_M) / CELL_M));
        const c0z = Math.max(0, Math.floor((z - cr - tz * TILE_M) / CELL_M));
        const c1z = Math.min(CELLS - 1, Math.floor((z + cr - tz * TILE_M) / CELL_M));
        for (let cz = c0z; cz <= c1z; cz++) {
          for (let cx = c0x; cx <= c1x; cx++) {
            const wx = tx * TILE_M + (cx + 0.5) * CELL_M;
            const wz = tz * TILE_M + (cz + 0.5) * CELL_M;
            if ((wx - x) ** 2 + (wz - z) ** 2 <= cr * cr) {
              const b = cz * CELLS + cx;
              t.bits[b >> 3] |= 1 << (b & 7);
            }
          }
        }
      }
    }
    this.version++;
  }

  // Kutsutaan joka ruudulla pelaajan sijainnilla.
  update(dt, x, z) {
    this.focus.x = x;
    this.focus.z = z;
    const last = this.lastReveal;
    const moved = last ? Math.hypot(x - last.x, z - last.z) : Infinity;
    if (moved > 4) {
      // Nopea liike tai hidas ruudunpäivitys: paljasta koko matka.
      if (moved < 300) {
        const n = Math.floor(moved / 25);
        for (let i = 1; i <= n; i++) {
          const t = i / (n + 1);
          this._paint(last.x + (x - last.x) * t, last.z + (z - last.z) * t, REVEAL_M);
        }
      }
      this.lastReveal = { x, z };
      this._paint(x, z, REVEAL_M);
    }
    // Maastoruutujen pyynnöt: korkeintaan kaksi kerrallaan, lähin ensin,
    // jotta chunkkien generointi ei jää jonoon.
    while (this.inFlight < 2 && this.want.size) {
      let best = null, bd = Infinity;
      for (const t of this.want) {
        const d = Math.hypot((t.tx + 0.5) * TILE_M - x, (t.tz + 0.5) * TILE_M - z);
        if (d < bd) { bd = d; best = t; }
      }
      this.want.delete(best);
      if (best.requested || this.tiles.get(best.key) !== best) continue;
      best.requested = true;
      this.inFlight++;
      this.gen.requestTile(best.key, best.tx * TILE_M, best.tz * TILE_M, TILE_PX, TILE_M / TILE_PX);
    }
    this.composeTimer -= dt;
    if (this.composeTimer <= 0) {
      this.composeTimer = 0.12;
      for (const t of this.tiles.values()) if (t.dirty && t.terrain) this._compose(t);
    }
  }

  _compose(t) {
    const c = t.cctx;
    c.globalCompositeOperation = 'source-over';
    c.clearRect(0, 0, TILE_PX, TILE_PX);
    c.drawImage(t.terrain, 0, 0);
    c.globalCompositeOperation = 'destination-in';
    c.drawImage(t.mask, 0, 0);
    c.globalCompositeOperation = 'source-over';
    t.dirty = false;
    this.version++;
  }

  // Piirrä paljastetut ruudut alueelta. Kutsujan muunnos: 1 yksikkö = 1 m.
  drawTiles(ctx, minX, minZ, maxX, maxZ) {
    const t0x = Math.floor(minX / TILE_M), t1x = Math.floor(maxX / TILE_M);
    const t0z = Math.floor(minZ / TILE_M), t1z = Math.floor(maxZ / TILE_M);
    const many = (t1x - t0x + 1) * (t1z - t0z + 1) > this.tiles.size;
    const draw = (t) => {
      if (t.tx < t0x || t.tx > t1x || t.tz < t0z || t.tz > t1z) return;
      if (!t.terrain) {
        if (!t.requested) this.want.add(t);
        return;
      }
      // Pieni limitys peittää ruutujen väliset saumat.
      ctx.drawImage(t.comp, t.tx * TILE_M - 0.3, t.tz * TILE_M - 0.3, TILE_M + 0.6, TILE_M + 0.6);
    };
    if (many) {
      for (const t of this.tiles.values()) draw(t);
    } else {
      for (let tz = t0z; tz <= t1z; tz++) {
        for (let tx = t0x; tx <= t1x; tx++) {
          const t = this.tiles.get(`${tx},${tz}`);
          if (t) draw(t);
        }
      }
    }
  }

  isRevealed(x, z) {
    const tx = Math.floor(x / TILE_M), tz = Math.floor(z / TILE_M);
    const t = this.tiles.get(`${tx},${tz}`);
    if (!t) return false;
    const cx = Math.floor((x - tx * TILE_M) / CELL_M), cz = Math.floor((z - tz * TILE_M) / CELL_M);
    const b = cz * CELLS + cx;
    return !!(t.bits[b >> 3] & (1 << (b & 7)));
  }

  addWaypoint(x, z, type) {
    this.waypoints.push({ x: Math.round(x), z: Math.round(z), type });
    this.version++;
  }

  waypointNear(x, z, radius) {
    let best = -1, bd = radius;
    this.waypoints.forEach((w, i) => {
      const d = Math.hypot(w.x - x, w.z - z);
      if (d < bd) { bd = d; best = i; }
    });
    return best;
  }

  removeWaypoint(i) {
    if (i < 0 || i >= this.waypoints.length) return;
    this.waypoints.splice(i, 1);
    this.version++;
  }

  serialize() {
    const tiles = {};
    for (const t of this.tiles.values()) {
      if (t.bits.some((b) => b)) tiles[t.key] = toB64(t.bits);
    }
    return { tiles, waypoints: this.waypoints.map((w) => ({ ...w })) };
  }

  load(data) {
    this.clear();
    if (!data) return;
    if (Array.isArray(data.waypoints)) {
      this.waypoints = data.waypoints
        .filter((w) => w && Number.isFinite(w.x) && Number.isFinite(w.z) && WAYPOINT_TYPES.some((d) => d.type === w.type))
        .map((w) => ({ x: w.x, z: w.z, type: w.type }));
    }
    // Maski rakennetaan soluista: solut piirretään pieneen kuvaan, joka
    // venytetään ruudun kokoon (venytys pehmentää reunat).
    const small = document.createElement('canvas');
    small.width = small.height = CELLS;
    const sctx = small.getContext('2d');
    const img = sctx.createImageData(CELLS, CELLS);
    for (const [key, b64] of Object.entries(data.tiles || {})) {
      const [tx, tz] = key.split(',').map(Number);
      if (!Number.isFinite(tx) || !Number.isFinite(tz)) continue;
      let bits;
      try { bits = fromB64(b64); } catch { continue; }
      if (bits.length !== (CELLS * CELLS) / 8) continue;
      const t = this._tile(tx, tz);
      t.bits.set(bits);
      for (let c = 0; c < CELLS * CELLS; c++) img.data[c * 4 + 3] = bits[c >> 3] & (1 << (c & 7)) ? 255 : 0;
      sctx.putImageData(img, 0, 0);
      t.mctx.imageSmoothingEnabled = true;
      t.mctx.drawImage(small, 0, 0, TILE_PX, TILE_PX);
      t.dirty = true;
    }
    this.version++;
  }
}
