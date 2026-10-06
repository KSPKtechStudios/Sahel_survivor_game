// Proseduraaliset tekstuurit canvasilla. Väliaikaisia: myöhemmin nämä voi
// korvata oikeilla (esim. CC0) tekstuureilla vaihtamatta muuta koodia.
import * as THREE from 'three';
import { mulberry32 } from '../noise.js';

// Saumaton harmaasävyinen "hiekanjyvä"-tekstuuri, joka kerrotaan maaston
// vertex-värien kanssa. Keskiarvo noin 0.9.
export function createGroundDetailTexture(size = 256) {
  const rand = mulberry32(7);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(size, size);

  // Pohjakohina, joka sumennetaan saumattomasti (wrap-around).
  const base = new Float32Array(size * size);
  for (let i = 0; i < base.length; i++) base[i] = rand();
  const blur = (src, r) => {
    const dst = new Float32Array(src.length);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        let s = 0, n = 0;
        for (let dy = -r; dy <= r; dy++) {
          for (let dx = -r; dx <= r; dx++) {
            s += src[((y + dy + size) % size) * size + ((x + dx + size) % size)];
            n++;
          }
        }
        dst[y * size + x] = s / n;
      }
    }
    return dst;
  };
  const coarse = blur(base, 3);
  const mid = blur(base, 1);

  for (let i = 0; i < size * size; i++) {
    const c = (coarse[i] - 0.5) * 2.2;     // isot läikät
    const m = (mid[i] - 0.5) * 0.9;        // keskikokoinen rakeisuus
    const f = (base[i] - 0.5) * 0.18;      // hieno jyvä
    let v = 0.9 + c * 0.12 + m * 0.12 + f;
    // Satunnaisia pikkukiviä
    if (base[i] > 0.996) v -= 0.25;
    v = Math.max(0, Math.min(1, v));
    const g = Math.round(v * 255);
    img.data[i * 4] = g;
    img.data[i * 4 + 1] = g;
    img.data[i * 4 + 2] = g;
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

// Pehmeä pyöreä läiskä partikkeleille.
export function createSoftDotTexture(size = 64) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.4, 'rgba(255,255,255,0.5)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Liekkitekstuuri nuotiolle.
export function createFlameTexture(size = 64) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size * 2;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size * 1.45, 2, size / 2, size * 1.2, size * 0.95);
  g.addColorStop(0, 'rgba(255,250,210,1)');
  g.addColorStop(0.25, 'rgba(255,200,80,0.95)');
  g.addColorStop(0.6, 'rgba(240,100,20,0.6)');
  g.addColorStop(1, 'rgba(200,40,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(size / 2, 0);
  ctx.bezierCurveTo(size * 0.95, size * 0.8, size, size * 1.6, size / 2, size * 2);
  ctx.bezierCurveTo(0, size * 1.6, size * 0.05, size * 0.8, size / 2, 0);
  ctx.fill();
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
