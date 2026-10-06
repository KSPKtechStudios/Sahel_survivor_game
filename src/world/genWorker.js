// Generointisäie: laskee chunkit ja kartan ruudut pääsäikeen ulkopuolella,
// jotta peli pyörii sulavasti kävellessä.
import { setWorldSeed } from './terrain.js';
import { generateChunk, generateMapTile } from './chunkGen.js';

let variantCounts = {};
let epoch = 0;

self.onmessage = (e) => {
  const m = e.data;
  if (m.op === 'init') {
    variantCounts = m.variantCounts;
  } else if (m.op === 'seed') {
    epoch = m.epoch;
    setWorldSeed(m.seed);
  } else if (m.op === 'chunk') {
    if (m.epoch !== epoch) return;
    const r = generateChunk(m.cx, m.cz, variantCounts);
    const transfer = [r.positions.buffer, r.normals.buffer, r.colors.buffer, r.uvs.buffer, r.objects.buffer, r.decor.buffer];
    if (r.water) transfer.push(r.water.positions.buffer, r.water.data.buffer, r.water.deep.buffer, r.water.shallow.buffer, r.water.index.buffer);
    self.postMessage({ op: 'chunk', epoch, ...r }, transfer);
  } else if (m.op === 'tile') {
    if (m.epoch !== epoch) return;
    const data = generateMapTile(m.x0, m.z0, m.size, m.mpp);
    self.postMessage({ op: 'tile', epoch, key: m.key, data }, [data.buffer]);
  }
};
