// Sessio 26: alfatestattujen tekstuurien (lehdet, ruoho, kukat) mipmapit.
// Käyttäjä: "pikseleitä leijuu puiden ja kasvien lehvien lähellä". Syy oli
// kaksiosainen:
// 1) Läpinäkyvien pikselien väri oli musta, joten kaukaa (pienemmät
//    mipmap-tasot) lehtien reunat tummuivat. Korjaus: läpinäkyvät pikselit
//    saavat lähimpien lehtien värin ("push-pull"-täyttö).
// 2) Tavallinen mipmappaus harventaa alfaa, ja alfatesti jättää kaukaisesta
//    lehvästöstä jäljelle vain irtonaisia pisteitä. Korjaus: jokaisen tason
//    alfa skaalataan niin, että peittävyys (alfa >= raja) pysyy samana kuin
//    täydessä koossa.
import * as THREE from 'three';

function pixels(img) {
  const c = document.createElement('canvas');
  c.width = img.width;
  c.height = img.height;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0);
  return g.getImageData(0, 0, c.width, c.height);
}

// Läpinäkyvien pikselien väri karkeammilta tasoilta (lähimmät näkyvät pikselit).
function fillTransparent(data, w, h) {
  const levels = [];
  let lw = w, lh = h;
  let C = new Float32Array(w * h * 3), Wt = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const a = data[i * 4 + 3] / 255;
    Wt[i] = a;
    C[i * 3] = data[i * 4] * a;
    C[i * 3 + 1] = data[i * 4 + 1] * a;
    C[i * 3 + 2] = data[i * 4 + 2] * a;
  }
  levels.push({ w: lw, h: lh, C, W: Wt });
  while (lw > 1 || lh > 1) {
    const nw = Math.max(1, lw >> 1), nh = Math.max(1, lh >> 1);
    const nC = new Float32Array(nw * nh * 3), nW = new Float32Array(nw * nh);
    for (let y = 0; y < lh; y++) {
      const py = Math.min(nh - 1, y >> 1);
      for (let x = 0; x < lw; x++) {
        const p = py * nw + Math.min(nw - 1, x >> 1), s = y * lw + x;
        nW[p] += Wt[s];
        nC[p * 3] += C[s * 3];
        nC[p * 3 + 1] += C[s * 3 + 1];
        nC[p * 3 + 2] += C[s * 3 + 2];
      }
    }
    lw = nw; lh = nh; C = nC; Wt = nW;
    levels.push({ w: lw, h: lh, C, W: Wt });
  }
  // Karkeimmalta tasolta tarkimpaan: tyhjä pikseli perii "vanhempansa" värin.
  let fill = null, fw = 1;
  for (let k = levels.length - 1; k >= 0; k--) {
    const L = levels[k];
    const f = new Float32Array(L.w * L.h * 3);
    for (let y = 0; y < L.h; y++) {
      for (let x = 0; x < L.w; x++) {
        const p = y * L.w + x;
        if (L.W[p] > 1e-4) {
          f[p * 3] = L.C[p * 3] / L.W[p];
          f[p * 3 + 1] = L.C[p * 3 + 1] / L.W[p];
          f[p * 3 + 2] = L.C[p * 3 + 2] / L.W[p];
        } else if (fill) {
          const q = Math.min(fill.length / 3 / fw - 1, y >> 1) * fw + Math.min(fw - 1, x >> 1);
          f[p * 3] = fill[q * 3];
          f[p * 3 + 1] = fill[q * 3 + 1];
          f[p * 3 + 2] = fill[q * 3 + 2];
        }
      }
    }
    fill = f;
    fw = L.w;
  }
  for (let i = 0; i < w * h; i++) {
    if (data[i * 4 + 3] === 0) {
      data[i * 4] = fill[i * 3];
      data[i * 4 + 1] = fill[i * 3 + 1];
      data[i * 4 + 2] = fill[i * 3 + 2];
    }
  }
}

function coverage(alpha, n, t) {
  let c = 0;
  for (let i = 0; i < n; i++) if (alpha[i] >= t) c++;
  return c / n;
}

// Kynnys t, jolla osuus (alfa >= t) on lähinnä tavoitetta (histogrammista).
function thresholdFor(alpha, n, target) {
  const hist = new Uint32Array(256);
  for (let i = 0; i < n; i++) hist[Math.min(255, Math.round(alpha[i] * 255))]++;
  let acc = 0;
  const want = target * n;
  for (let v = 255; v >= 1; v--) {
    acc += hist[v];
    if (acc >= want) return v / 255;
  }
  return 1 / 255;
}

export function buildCoverageMips(img, cutoff = 0.5) {
  const base = pixels(img);
  const w = base.width, h = base.height;
  fillTransparent(base.data, w, h);
  const mips = [base];
  let alpha = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) alpha[i] = base.data[i * 4 + 3] / 255;
  const target = coverage(alpha, w * h, cutoff);
  let rgb = new Float32Array(w * h * 3);
  for (let i = 0; i < w * h; i++) {
    rgb[i * 3] = base.data[i * 4];
    rgb[i * 3 + 1] = base.data[i * 4 + 1];
    rgb[i * 3 + 2] = base.data[i * 4 + 2];
  }
  let lw = w, lh = h;
  while (lw > 1 || lh > 1) {
    const nw = Math.max(1, lw >> 1), nh = Math.max(1, lh >> 1);
    const nA = new Float32Array(nw * nh), nRGB = new Float32Array(nw * nh * 3);
    for (let y = 0; y < nh; y++) {
      for (let x = 0; x < nw; x++) {
        let sa = 0, cnt = 0, wr = 0, wg = 0, wb = 0, pr = 0, pg = 0, pb = 0;
        for (let dy = 0; dy < 2; dy++) {
          for (let dx = 0; dx < 2; dx++) {
            const sx = Math.min(lw - 1, x * 2 + dx), sy = Math.min(lh - 1, y * 2 + dy);
            const s = sy * lw + sx, a = alpha[s];
            sa += a; cnt++;
            wr += rgb[s * 3] * a; wg += rgb[s * 3 + 1] * a; wb += rgb[s * 3 + 2] * a;
            pr += rgb[s * 3]; pg += rgb[s * 3 + 1]; pb += rgb[s * 3 + 2];
          }
        }
        const p = y * nw + x;
        nA[p] = sa / cnt;
        if (sa > 1e-4) { nRGB[p * 3] = wr / sa; nRGB[p * 3 + 1] = wg / sa; nRGB[p * 3 + 2] = wb / sa; } else { nRGB[p * 3] = pr / cnt; nRGB[p * 3 + 1] = pg / cnt; nRGB[p * 3 + 2] = pb / cnt; }
      }
    }
    lw = nw; lh = nh; alpha = nA; rgb = nRGB;
    const n = lw * lh;
    const t = thresholdFor(alpha, n, target);
    const scale = Math.max(1, cutoff / Math.max(t, 1e-3));
    const out = new ImageData(lw, lh);
    for (let i = 0; i < n; i++) {
      out.data[i * 4] = rgb[i * 3];
      out.data[i * 4 + 1] = rgb[i * 3 + 1];
      out.data[i * 4 + 2] = rgb[i * 3 + 2];
      out.data[i * 4 + 3] = Math.min(255, alpha[i] * scale * 255);
    }
    mips.push(out);
  }
  return mips;
}

// Asettaa ladatun kuvan tekstuuriin peittävyyden säilyttävillä mipmapeilla.
export function applyCoverageMips(texture, img, cutoff = 0.5) {
  try {
    const mips = buildCoverageMips(img, cutoff);
    texture.image = mips[0];
    texture.mipmaps = mips;
    texture.generateMipmaps = false;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
  } catch {
    texture.image = img; // varalla tavallinen kuva
  }
  texture.needsUpdate = true;
}

// Lataa alfatestattavan tekstuurin (palauttaa heti, kuva täyttyy latauksen jälkeen).
export function loadAlphaTexture(url, { cutoff = 0.5, srgb = true, anisotropy = 4, manager } = {}) {
  const t = new THREE.Texture();
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = anisotropy;
  new THREE.ImageLoader(manager).load(url, (img) => applyCoverageMips(t, img, cutoff));
  return t;
}
