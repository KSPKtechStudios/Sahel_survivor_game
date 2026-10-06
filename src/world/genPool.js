// Generointisäikeiden pooli. Jos selain ei tue moduulityöntekijöitä, laskenta
// tehdään pääsäikeessä pienissä paloissa (varajärjestelmä).
import { setWorldSeed, getWorldSeed } from './terrain.js';
import { generateChunk, generateMapTile } from './chunkGen.js';

const WORKERS = 2;

export class GenPool {
  constructor(variantCounts) {
    this.variantCounts = variantCounts;
    this.epoch = 0;
    this.seed = getWorldSeed();
    this.onChunk = null; // (data) => void
    this.onTile = null;  // (key, data) => void
    this.syncQueue = [];
    this.inFlight = 0;
    this.workers = [];
    this.next = 0;
    try {
      for (let i = 0; i < WORKERS; i++) {
        const w = new Worker(new URL('./genWorker.js', import.meta.url), { type: 'module' });
        w.onmessage = (e) => this._receive(e.data);
        w.onerror = (err) => this._fail(err);
        w.postMessage({ op: 'init', variantCounts });
        w.postMessage({ op: 'seed', seed: this.seed, epoch: this.epoch });
        this.workers.push(w);
      }
    } catch (err) {
      this._fail(err);
    }
  }

  get usingWorkers() {
    return this.workers.length > 0;
  }

  _fail(err) {
    if (!this.workers.length) return;
    console.warn('Generointisäie ei toimi, lasketaan pääsäikeessä:', err && err.message);
    for (const w of this.workers) w.terminate();
    this.workers = [];
    // Pyynnöt, joita säikeet eivät ehtineet tehdä, siirtyvät varajärjestelmälle.
    if (this.pendingRequests) this.syncQueue.push(...this.pendingRequests.values());
    this.pendingRequests = null;
    this.inFlight = 0;
  }

  setSeed(seed) {
    this.epoch++;
    this.seed = seed >>> 0;
    this.syncQueue = [];
    this.inFlight = 0;
    if (this.pendingRequests) this.pendingRequests.clear();
    for (const w of this.workers) w.postMessage({ op: 'seed', seed: this.seed, epoch: this.epoch });
  }

  _post(msg) {
    msg.epoch = this.epoch;
    if (!this.workers.length) {
      this.syncQueue.push(msg);
      return;
    }
    if (!this.pendingRequests) this.pendingRequests = new Map();
    this.pendingRequests.set(`${msg.op}:${msg.key ?? `${msg.cx},${msg.cz}`}`, msg);
    this.inFlight++;
    this.workers[this.next++ % this.workers.length].postMessage(msg);
  }

  requestChunk(cx, cz) {
    this._post({ op: 'chunk', cx, cz });
  }

  requestTile(key, x0, z0, size, mpp) {
    this._post({ op: 'tile', key, x0, z0, size, mpp });
  }

  _receive(m) {
    if (m.epoch !== this.epoch) return;
    this.inFlight = Math.max(0, this.inFlight - 1);
    if (this.pendingRequests) this.pendingRequests.delete(`${m.op}:${m.key ?? `${m.cx},${m.cz}`}`);
    if (m.op === 'chunk' && this.onChunk) this.onChunk(m);
    else if (m.op === 'tile' && this.onTile) this.onTile(m.key, m.data);
  }

  // Varajärjestelmä: laske jonosta niin paljon kuin aikaa riittää.
  pump(budgetMs = 6) {
    if (this.workers.length || !this.syncQueue.length) return;
    if (getWorldSeed() !== this.seed) setWorldSeed(this.seed);
    const t0 = performance.now();
    while (this.syncQueue.length && performance.now() - t0 < budgetMs) {
      const m = this.syncQueue.shift();
      if (m.epoch !== this.epoch) continue;
      if (m.op === 'chunk') this.onChunk?.({ op: 'chunk', epoch: m.epoch, ...generateChunk(m.cx, m.cz, this.variantCounts) });
      else this.onTile?.(m.key, generateMapTile(m.x0, m.z0, m.size, m.mpp));
    }
  }

  get busy() {
    return this.inFlight > 0 || this.syncQueue.length > 0;
  }
}
