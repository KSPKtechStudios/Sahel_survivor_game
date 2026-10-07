// Puiset käyttöliittymäkuvat (sessio 14): piirretään kerran kankaalle ja
// käytetään taustakuvina. Lämmin keskiruskea puu, syykuvio ja oksankohdat,
// kaiverretut kuviot, messinkiniitit, köysisidokset, kolhut ja halkeamat.
// Kaikki on proseduraalista, joten erillisiä kuvatiedostoja ei tarvita.

// Hillitty, hieman harmaantunut keskiruskea (sessio 14b: ei sarjakuvamainen).
const LIGHT = [132, 96, 64];
const MID = [98, 68, 44];
const DARK = [54, 36, 23];

function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Arvokohina (siemenellinen).
function makeNoise(seed) {
  const rand = mulberry32(seed);
  const P = new Float32Array(256 * 256);
  for (let i = 0; i < P.length; i++) P[i] = rand();
  const v = (x, y) => P[((y & 255) << 8) | (x & 255)];
  const sm = (t) => t * t * (3 - 2 * t);
  const n = (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y);
    const fx = sm(x - xi), fy = sm(y - yi);
    const a = v(xi, yi), b = v(xi + 1, yi), c = v(xi, yi + 1), d = v(xi + 1, yi + 1);
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  };
  return (x, y, oct = 3) => {
    let s = 0, amp = 0.5, f = 1;
    for (let o = 0; o < oct; o++) { s += amp * n(x * f, y * f); amp *= 0.5; f *= 2.03; }
    return s / (1 - Math.pow(0.5, oct));
  };
}

const mix = (a, b, t) => a + (b - a) * t;
const clamp01 = (t) => Math.max(0, Math.min(1, t));

// Pitkittäinen syykuvio (lauta pystyssä) ImageDataan. knots = [{x, y, r}]
function paintPlank(img, W, H, S, seed, knots) {
  const noise = makeNoise(seed);
  const d = img.data;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const X = x / S, Y = y / S;
      let u = X * 0.55 + 5.5 * noise(X * 0.05, Y * 0.012) + 1.2 * noise(X * 0.3, Y * 0.04);
      let knotDark = 0;
      for (const k of knots) {
        const dx = (X - k.x) / k.r, dy = (Y - k.y) / (k.r * 1.8);
        const r2 = dx * dx + dy * dy;
        const w = Math.exp(-r2 * 0.7);
        u += w * 4.5 * Math.sqrt(r2 + 0.02) * Math.sign(dx || 1);
        knotDark = Math.max(knotDark, Math.exp(-r2 * 3.2));
      }
      const ring = u * 0.9 - Math.floor(u * 0.9);
      const grain = Math.pow(1 - Math.abs(ring * 2 - 1), 6);           // tummat vuosirenkaat
      const fiber = noise(X * 1.6, Y * 0.06, 2);                       // hienot syyt
      const blot = noise(X * 0.08 + 9, Y * 0.05, 2);
      let t = 0.35 + 0.45 * grain + 0.25 * (fiber - 0.5) + 0.3 * (blot - 0.5) + 0.6 * knotDark;
      t = clamp01(t);
      const c = t < 0.5
        ? [mix(LIGHT[0], MID[0], t * 2), mix(LIGHT[1], MID[1], t * 2), mix(LIGHT[2], MID[2], t * 2)]
        : [mix(MID[0], DARK[0], t * 2 - 1), mix(MID[1], DARK[1], t * 2 - 1), mix(MID[2], DARK[2], t * 2 - 1)];
      const i = (y * W + x) * 4;
      d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255;
    }
  }
}

// Poikkileikkaus (vuosirenkaat) kiekoille.
function paintEndGrain(img, W, H, S, seed) {
  const noise = makeNoise(seed);
  const d = img.data;
  const cx = W / 2 + (noise(1, 1) - 0.5) * W * 0.12, cy = H / 2 + (noise(2, 3) - 0.5) * H * 0.12;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const dx = (x - cx) / S, dy = (y - cy) / S;
      const r = Math.hypot(dx, dy);
      const a = Math.atan2(dy, dx);
      const rr = r + 0.9 * noise(Math.cos(a) * 2 + 5, Math.sin(a) * 2 + 5) + 0.25 * noise(x / S * 0.5, y / S * 0.5);
      const ring = rr * 0.75 - Math.floor(rr * 0.75);
      const g = Math.pow(1 - Math.abs(ring * 2 - 1), 5);
      const fib = noise(a * 8 + 20, r * 0.6, 2);
      const t = clamp01(0.32 + 0.4 * g + 0.2 * (fib - 0.5) + 0.25 * clamp01(1 - r / 2.2) * 0.3);
      const c = t < 0.5
        ? [mix(LIGHT[0], MID[0], t * 2), mix(LIGHT[1], MID[1], t * 2), mix(LIGHT[2], MID[2], t * 2)]
        : [mix(MID[0], DARK[0], t * 2 - 1), mix(MID[1], DARK[1], t * 2 - 1), mix(MID[2], DARK[2], t * 2 - 1)];
      const i = (y * W + x) * 4;
      d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255;
    }
  }
}

// Messinkiniitti (kupera, kulunut).
export function drawRivet(ctx, x, y, r, dim = 1) {
  ctx.save();
  ctx.globalAlpha = dim;
  ctx.fillStyle = 'rgba(20,10,4,0.55)';
  ctx.beginPath(); ctx.arc(x + r * 0.15, y + r * 0.25, r * 1.1, 0, Math.PI * 2); ctx.fill();
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
  g.addColorStop(0, '#e9d7a4');
  g.addColorStop(0.35, '#b38f4c');
  g.addColorStop(0.75, '#76562a');
  g.addColorStop(1, '#3e2a12');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(40,24,8,0.6)';
  ctx.lineWidth = Math.max(0.6, r * 0.15);
  ctx.stroke();
  // vihertävä patina reunalla
  ctx.strokeStyle = 'rgba(90,120,80,0.25)';
  ctx.beginPath(); ctx.arc(x, y, r * 0.82, 0.3, 2.2); ctx.stroke();
  ctx.restore();
}

// Köysisidos poikittain (kierretty köysi, useita kierroksia).
function drawRope(ctx, x, y, w, h, S, rand) {
  ctx.save();
  const turns = Math.max(2, Math.round(h / (3.2 * S)));
  const th = h / turns;
  for (let i = 0; i < turns; i++) {
    const ty = y + i * th;
    // varjo alle
    ctx.fillStyle = 'rgba(25,14,5,0.55)';
    ctx.fillRect(x - S * 0.6, ty + th * 0.55, w + S * 1.2, th * 0.5);
    const g = ctx.createLinearGradient(0, ty, 0, ty + th);
    g.addColorStop(0, '#e2c995');
    g.addColorStop(0.45, '#bf9b62');
    g.addColorStop(1, '#6e5330');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x - S * 0.8, ty + th * 0.15);
    ctx.quadraticCurveTo(x + w / 2, ty - th * 0.15, x + w + S * 0.8, ty + th * 0.15);
    ctx.lineTo(x + w + S * 0.8, ty + th * 0.9);
    ctx.quadraticCurveTo(x + w / 2, ty + th * 1.15, x - S * 0.8, ty + th * 0.9);
    ctx.closePath();
    ctx.fill();
    // säikeiden kierre
    ctx.strokeStyle = 'rgba(80,56,28,0.7)';
    ctx.lineWidth = 0.7 * S;
    for (let k = -1; k < w / (2.4 * S) + 1; k++) {
      const sx = x + k * 2.4 * S + rand() * 0.4 * S;
      ctx.beginPath();
      ctx.moveTo(sx, ty + th * 0.85);
      ctx.lineTo(sx + 1.6 * S, ty + th * 0.15);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(255,240,205,0.25)';
    ctx.lineWidth = 0.5 * S;
    ctx.beginPath();
    ctx.moveTo(x, ty + th * 0.3);
    ctx.quadraticCurveTo(x + w / 2, ty + th * 0.1, x + w, ty + th * 0.3);
    ctx.stroke();
  }
  // irtonaisia kuituja
  ctx.strokeStyle = 'rgba(210,180,120,0.55)';
  ctx.lineWidth = 0.4 * S;
  for (let i = 0; i < 3; i++) {
    const fx = x + rand() * w, fy = y + rand() * h;
    ctx.beginPath(); ctx.moveTo(fx, fy); ctx.quadraticCurveTo(fx + 2 * S, fy + rand() * 2 * S, fx + (rand() * 4 - 1) * S, fy + 3 * S); ctx.stroke();
  }
  ctx.restore();
}

// Kulumat: naarmut, kolhut ja halkeama.
function wear(ctx, W, H, S, rand, crack = true) {
  ctx.save();
  for (let i = 0; i < 9; i++) {
    const x = rand() * W, y = rand() * H, l = (2 + rand() * 6) * S, a = (rand() - 0.5) * 1.2 + (rand() < 0.5 ? 0 : Math.PI / 2);
    ctx.strokeStyle = rand() < 0.5 ? 'rgba(255,230,190,0.18)' : 'rgba(30,15,5,0.35)';
    ctx.lineWidth = 0.45 * S;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); ctx.stroke();
  }
  for (let i = 0; i < 4; i++) {
    const x = rand() * W, y = rand() * H, r = (0.6 + rand() * 1.1) * S;
    ctx.fillStyle = 'rgba(30,14,4,0.35)';
    ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.7, rand() * 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,230,180,0.15)';
    ctx.beginPath(); ctx.ellipse(x + 0.4 * S, y + 0.4 * S, r * 0.6, r * 0.4, 0, 0, Math.PI * 2); ctx.fill();
  }
  if (crack) {
    // Halkeama reunasta sisään syyn suuntaisesti.
    let x = rand() < 0.5 ? 1.5 * S : W - 1.5 * S, y = H * (0.25 + rand() * 0.5);
    const dir = x < W / 2 ? 1 : -1;
    ctx.strokeStyle = 'rgba(20,8,2,0.8)';
    ctx.lineWidth = 0.8 * S;
    ctx.beginPath(); ctx.moveTo(x, y);
    for (let i = 0; i < 6; i++) {
      x += dir * (0.5 + rand()) * S * 0.6;
      y += (2 + rand() * 3) * S;
      ctx.lineTo(x, y);
      ctx.lineWidth = Math.max(0.3 * S, ctx.lineWidth * 0.8);
    }
    ctx.stroke();
  }
  ctx.restore();
}

// Veistetyn laudan ääriviiva: puolileveys korkeuden funktiona (CSS px).
// Päissä muotoillut nupit, keskellä kevyesti aaltoileva reuna ja alhaalla
// leveämpi osa ikonin syvennykselle. k = mittakaava (1 = 24 px leveä lauta).
function plankHalfWidth(y, H, half, k = 1) {
  const cap = (t) => Math.sqrt(Math.max(0, 1 - t * t));
  const c = 6 * k, n = 9 * k, o = 12 * k;
  if (y < c) return half * 0.62 * cap((c - y) / c);                        // yläpään nuppi
  if (y < n) return half * 0.5;                                          // kaula
  if (y < o) return half * (0.5 + 0.5 * ((y - n) / (o - n)));             // olka
  const bodyEnd = H - 46 * k;
  if (y < bodyEnd) return half * (0.9 + 0.035 * Math.sin(y * 0.55 / k));   // runko, hento aalto
  if (y < bodyEnd + 4 * k) return half * (0.9 + 0.1 * ((y - bodyEnd) / (4 * k)));
  if (y < H - 10 * k) return half;
  if (y < H - 7 * k) return half * 0.55;                                 // alakaula
  return half * 0.7 * cap((y - (H - 7 * k)) / (7 * k));                  // alanuppi
}

// Realistiset ikonit (maalattu pigmentti kaiverretussa syvennyksessä).
function drawBloodDrop(ctx, cx, cy, r) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cx, cy - r * 1.35);
  ctx.bezierCurveTo(cx + r * 0.25, cy - r * 0.8, cx + r, cy - r * 0.1, cx + r, cy + r * 0.35);
  ctx.arc(cx, cy + r * 0.35, r, 0, Math.PI);
  ctx.bezierCurveTo(cx - r, cy - r * 0.1, cx - r * 0.25, cy - r * 0.8, cx, cy - r * 1.35);
  ctx.closePath();
  const g = ctx.createRadialGradient(cx - r * 0.35, cy, r * 0.1, cx, cy + r * 0.2, r * 1.5);
  g.addColorStop(0, '#a3352a'); g.addColorStop(0.55, '#6f1812'); g.addColorStop(1, '#3a0905');
  ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = r * 0.4; ctx.shadowOffsetY = r * 0.12;
  ctx.fillStyle = g; ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = 'rgba(30,4,2,0.8)'; ctx.lineWidth = r * 0.08; ctx.stroke();
  // kostea heijastus
  ctx.fillStyle = 'rgba(255,215,200,0.55)';
  ctx.beginPath(); ctx.ellipse(cx - r * 0.38, cy + r * 0.15, r * 0.14, r * 0.32, 0.35, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,230,220,0.35)';
  ctx.beginPath(); ctx.arc(cx - r * 0.18, cy - r * 0.45, r * 0.07, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawFootprint(ctx, cx, cy, r) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(0.18);
  const pig = (x, y, rx, ry, a = 0) => {
    const g = ctx.createRadialGradient(x - rx * 0.3, y - ry * 0.3, 0, x, y, Math.max(rx, ry));
    g.addColorStop(0, '#c99a4a'); g.addColorStop(0.7, '#8f6626'); g.addColorStop(1, '#5a3c14');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, a, 0, Math.PI * 2); ctx.fill();
  };
  ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = r * 0.3; ctx.shadowOffsetY = r * 0.1;
  // kantapää ja päkiä yhtenäisenä jalkapohjana
  ctx.beginPath();
  ctx.moveTo(-r * 0.32, r * 1.05);
  ctx.bezierCurveTo(-r * 0.62, r * 0.6, -r * 0.62, -r * 0.2, -r * 0.5, -r * 0.55);
  ctx.bezierCurveTo(-r * 0.3, -r * 0.95, r * 0.55, -r * 0.85, r * 0.55, -r * 0.45);
  ctx.bezierCurveTo(r * 0.55, -r * 0.05, r * 0.15, r * 0.2, r * 0.25, r * 0.65);
  ctx.bezierCurveTo(r * 0.3, r * 1.15, -r * 0.1, r * 1.35, -r * 0.32, r * 1.05);
  const g = ctx.createRadialGradient(-r * 0.2, -r * 0.2, r * 0.1, 0, r * 0.2, r * 1.4);
  g.addColorStop(0, '#c99a4a'); g.addColorStop(0.6, '#8f6626'); g.addColorStop(1, '#5a3c14');
  ctx.fillStyle = g; ctx.fill();
  // varpaat
  pig(-r * 0.42, -r * 1.12, r * 0.19, r * 0.23, -0.2);
  pig(-r * 0.08, -r * 1.25, r * 0.15, r * 0.18);
  pig(r * 0.22, -r * 1.18, r * 0.13, r * 0.16);
  pig(r * 0.45, -r * 1.02, r * 0.11, r * 0.13);
  pig(r * 0.6, -r * 0.8, r * 0.09, r * 0.11);
  ctx.shadowColor = 'transparent';
  // pigmentin epätasaisuus
  ctx.globalCompositeOperation = 'source-atop';
  ctx.fillStyle = 'rgba(60,35,10,0.25)';
  for (let i = 0; i < 14; i++) { ctx.beginPath(); ctx.arc((Math.sin(i * 7.1) * 0.5) * r, (Math.cos(i * 3.3) * 0.9) * r, r * 0.08, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}

// Palkin kehys: veistetty lauta, valaistu korkeuskartasta (sessio 14c: ennen
// puu näytti piirretyltä). Reunat pyöristyvät, kaiverrukset ja syvennykset
// painuvat puuhun ja saavat valon ja varjon (valo vasemmalta ylhäältä),
// öljytty pinta kiiltää hieman. geo = { W, H, well: {x, y, w, h}, rope:
// [[y, h]], rivets: [[x, y]], icon: 'blood'|'foot', iconY, k }
export function barFrame(geo, seed = 1) {
  const S = 3;
  const k = geo.k || 1;
  const W = Math.round(geo.W * S), H = Math.round(geo.H * S);
  const half = geo.W / 2;
  const rand = mulberry32(seed * 7919);
  const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };

  // 1) Puun väri (albedo)
  const albedo = new ImageData(W, H);
  paintPlank(albedo, W, H, S, seed * 101, [{ x: geo.W * (0.35 + rand() * 0.3), y: geo.H * (0.2 + rand() * 0.35), r: 1.4 + rand() * 0.9 }]);

  // 2) Kaiverrukset maskiksi (valkoinen = syvä), pehmennetään sumennuksella.
  const mc = mk(), m = mc.getContext('2d');
  m.strokeStyle = '#fff'; m.fillStyle = '#fff'; m.lineCap = 'round'; m.lineJoin = 'round';
  const wl = geo.well;
  const top = wl.y * S, bot = (wl.y + wl.h) * S;
  const lx0 = 3 * k * S, lx1 = (wl.x - 2) * S;
  const rx0 = (wl.x + wl.w + 2) * S, rx1 = W - 3 * k * S;
  const step = 7 * k * S;
  m.lineWidth = 0.9 * k * S;
  for (let y = top + 3 * S, i = 0; y + step <= bot - 2 * S; y += step, i++) {
    m.beginPath(); m.moveTo(lx0, y); m.lineTo(lx1, y + step / 2); m.lineTo(lx0, y + step); m.stroke();
    m.beginPath(); m.moveTo(rx1, y); m.lineTo(rx0, y + step / 2); m.lineTo(rx1, y + step); m.stroke();
    // sisempi pienempi kolmio
    m.lineWidth = 0.6 * k * S;
    m.beginPath(); m.moveTo(lx0 + 0.25 * (lx1 - lx0), y + step * 0.32); m.lineTo(lx0 + 0.7 * (lx1 - lx0), y + step / 2); m.lineTo(lx0 + 0.25 * (lx1 - lx0), y + step * 0.68); m.stroke();
    m.beginPath(); m.moveTo(rx1 - 0.25 * (rx1 - rx0), y + step * 0.32); m.lineTo(rx1 - 0.7 * (rx1 - rx0), y + step / 2); m.lineTo(rx1 - 0.25 * (rx1 - rx0), y + step * 0.68); m.stroke();
    m.lineWidth = 0.9 * k * S;
    if (i % 2 === 0) {
      m.beginPath(); m.arc(lx0 + 0.2 * S, y + step / 2, 0.55 * k * S, 0, Math.PI * 2); m.fill();
      m.beginPath(); m.arc(rx1 - 0.2 * S, y + step / 2, 0.55 * k * S, 0, Math.PI * 2); m.fill();
    }
  }
  m.lineWidth = 0.8 * k * S;
  for (const yy of [wl.y - 3.6 * k, wl.y - 5.4 * k, wl.y + wl.h + 3.6 * k, wl.y + wl.h + 5.4 * k]) {
    m.beginPath(); m.moveTo(2.5 * k * S, yy * S); m.lineTo(W - 2.5 * k * S, yy * S); m.stroke();
  }
  // Naarmut ja kolhut heikompina
  m.globalAlpha = 0.35;
  m.lineWidth = 0.4 * S;
  for (let i = 0; i < 10; i++) {
    const x = rand() * W, y = rand() * H, l = (2 + rand() * 7) * S, a = Math.PI / 2 + (rand() - 0.5) * 0.9;
    m.beginPath(); m.moveTo(x, y); m.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); m.stroke();
  }
  for (let i = 0; i < 5; i++) { m.beginPath(); m.ellipse(rand() * W, rand() * H, (0.6 + rand()) * S, (0.4 + rand() * 0.6) * S, rand() * 3, 0, Math.PI * 2); m.fill(); }
  // Halkeama syyn suuntaan
  m.globalAlpha = 0.9;
  {
    let x = rand() < 0.5 ? 2 * S : W - 2 * S, y = H * (0.3 + rand() * 0.4);
    const dir = x < W / 2 ? 1 : -1;
    m.lineWidth = 0.9 * S;
    m.beginPath(); m.moveTo(x, y);
    for (let i = 0; i < 7; i++) { x += dir * (0.3 + rand() * 0.7) * S; y += (2 + rand() * 3) * S; m.lineTo(x, y); }
    m.stroke();
  }
  m.globalAlpha = 1;
  const mc2 = mk(), m2 = mc2.getContext('2d');
  m2.filter = `blur(${0.45 * S}px)`;
  m2.drawImage(mc, 0, 0);
  const carveA = m2.getImageData(0, 0, W, H).data;
  const sharpA = m.getImageData(0, 0, W, H).data;

  // 3) Syvät syvennykset (ura ja ikonin kuoppa)
  const dc = mk(), dctx = dc.getContext('2d');
  dctx.filter = `blur(${0.9 * S}px)`;
  dctx.fillStyle = '#fff';
  dctx.beginPath(); dctx.roundRect((wl.x - 1) * S, (wl.y - 1) * S, (wl.w + 2) * S, (wl.h + 2) * S, 2.5 * S); dctx.fill();
  if (geo.icon) { dctx.beginPath(); dctx.arc(W / 2, geo.iconY * S, 8.6 * k * S, 0, Math.PI * 2); dctx.fill(); }
  const deepA = dctx.getImageData(0, 0, W, H).data;

  // 4) Korkeuskartta: pyöristetyt reunat + syykuvion kohokuvio - kaiverrukset
  const hgt = new Float32Array(W * H);
  const inside = new Float32Array(W * H);
  const hwRow = new Float32Array(H);
  const prand = mulberry32(seed * 31);
  for (let y = 0; y < H; y++) hwRow[y] = plankHalfWidth(y / S, geo.H, half - 0.6, k) + (prand() - 0.5) * 0.2;
  const ad = albedo.data;
  for (let y = 0; y < H; y++) {
    // pystysuuntainen etäisyys päistä (nupit pyöristyvät myös pystyyn)
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      const d = hwRow[y] - Math.abs((x + 0.5) / S - half);
      inside[i] = Math.max(0, Math.min(1, d * S + 0.5));
      if (d <= 0) continue;
      const bev = d >= 2.4 * k ? 1 : Math.sin((d / (2.4 * k)) * Math.PI / 2);
      const lum = (ad[i * 4] + ad[i * 4 + 1] + ad[i * 4 + 2]) / 765;
      hgt[i] = bev * 2.2 * k + (0.5 - lum) * -0.35 - (carveA[i * 4 + 3] / 255) * 1.1 * k - (deepA[i * 4 + 3] / 255) * 2.4 * k;
    }
  }

  // 5) Valaistus
  const out = new ImageData(W, H);
  const od = out.data;
  const L = [-0.5, -0.62, 0.6]; const ll = Math.hypot(...L); L[0] /= ll; L[1] /= ll; L[2] /= ll;
  const Hv = [L[0], L[1], L[2] + 1]; const hl = Math.hypot(...Hv); Hv[0] /= hl; Hv[1] /= hl; Hv[2] /= hl;
  const g = 1.6 / S;
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      const i = y * W + x;
      if (inside[i] <= 0) continue;
      let nx = (hgt[i - 1] - hgt[i + 1]) * g * S * 0.5, ny = (hgt[i - W] - hgt[i + W]) * g * S * 0.5;
      const nl = Math.hypot(nx, ny, 1);
      nx /= nl; ny /= nl; const nz = 1 / nl;
      const dif = Math.max(0, nx * L[0] + ny * L[1] + nz * L[2]);
      const spec = Math.pow(Math.max(0, nx * Hv[0] + ny * Hv[1] + nz * Hv[2]), 30) * 0.22;
      const cav = (sharpA[i * 4 + 3] / 255) * 0.35 + (deepA[i * 4 + 3] / 255) * 0.25;
      const sh = (0.38 + 0.82 * dif) * (1 - cav);
      od[i * 4] = Math.min(255, ad[i * 4] * sh + spec * 255);
      od[i * 4 + 1] = Math.min(255, ad[i * 4 + 1] * sh + spec * 235);
      od[i * 4 + 2] = Math.min(255, ad[i * 4 + 2] * sh + spec * 200);
      od[i * 4 + 3] = inside[i] * 255;
    }
  }
  const cv = mk(), ctx = cv.getContext('2d');
  ctx.putImageData(out, 0, 0);

  // 6) Ikoni kuoppaan, köydet ja niitit päälle
  if (geo.icon) {
    if (geo.icon === 'blood') drawBloodDrop(ctx, W / 2, geo.iconY * S + 0.6 * k * S, 4.2 * k * S);
    else drawFootprint(ctx, W / 2, geo.iconY * S + 0.4 * k * S, 4 * k * S);
  }
  for (const [ry, rh] of geo.rope || []) {
    const hw = plankHalfWidth(ry + rh / 2, geo.H, half, k);
    drawRope(ctx, (half - hw) * S, ry * S, hw * 2 * S, rh * S, S * 0.7 * k, rand);
  }
  for (const [nx, ny] of geo.rivets || []) drawRivet(ctx, nx * S, ny * S, 1.35 * k * S, 0.75);
  if (geo.horizontal) {
    // Vaakapalkki: käännetään 90°.
    const hc = document.createElement('canvas');
    hc.width = H; hc.height = W;
    const hctx = hc.getContext('2d');
    // (x, y) -> (H - y, x): alapää (ikoni) vasemmalle, täyttö vasemmalta oikealle.
    hctx.setTransform(0, 1, -1, 0, H, 0);
    hctx.drawImage(cv, 0, 0);
    return hc.toDataURL('image/png');
  }
  return cv.toDataURL('image/png');
}

// Puukiekko (vuosirenkaat) messinkireunalla; d = halkaisija CSS-pikseleinä.
export function woodDisc(d, seed = 1, rivets = 0) {
  const S = 2;
  const W = Math.round(d * S);
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = W;
  const ctx = cv.getContext('2d');
  const rand = mulberry32(seed * 977);
  const R = W / 2;
  const img = ctx.createImageData(W, W);
  paintEndGrain(img, W, W, S, seed * 13);
  const tmp = document.createElement('canvas');
  tmp.width = W; tmp.height = W;
  tmp.getContext('2d').putImageData(img, 0, 0);
  const rim = 1.3 * S;
  ctx.save();
  ctx.beginPath(); ctx.arc(R, R, R - rim, 0, Math.PI * 2); ctx.clip();
  ctx.drawImage(tmp, 0, 0);
  // Säteittäiset kuivumishalkeamat
  ctx.strokeStyle = 'rgba(25,10,3,0.7)';
  for (let i = 0; i < 2; i++) {
    const a = rand() * Math.PI * 2;
    ctx.lineWidth = 0.8 * S;
    ctx.beginPath();
    ctx.moveTo(R + Math.cos(a) * R, R + Math.sin(a) * R);
    ctx.lineTo(R + Math.cos(a + 0.05) * R * (0.45 + rand() * 0.2), R + Math.sin(a + 0.05) * R * (0.45 + rand() * 0.2));
    ctx.stroke();
  }
  // Keskelle kevyt syvennys kuvakkeelle
  const g = ctx.createRadialGradient(R, R, R * 0.2, R, R, R);
  g.addColorStop(0, 'rgba(20,10,4,0.35)');
  g.addColorStop(0.7, 'rgba(20,10,4,0.05)');
  g.addColorStop(1, 'rgba(20,10,4,0.45)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, W);
  wear(ctx, W, W, S, rand, false);
  ctx.restore();
  // Messinkireuna
  const bg = ctx.createLinearGradient(0, 0, W, W);
  bg.addColorStop(0, '#cdb682'); bg.addColorStop(0.4, '#94723a'); bg.addColorStop(0.7, '#5e4220'); bg.addColorStop(1, '#ad9058');
  ctx.strokeStyle = bg;
  ctx.lineWidth = rim;
  ctx.beginPath(); ctx.arc(R, R, R - rim / 2, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = 'rgba(30,15,5,0.8)';
  ctx.lineWidth = 0.6 * S;
  ctx.beginPath(); ctx.arc(R, R, R - rim, 0, Math.PI * 2); ctx.stroke();
  for (let i = 0; i < rivets; i++) {
    const a = -Math.PI / 2 + (i / rivets) * Math.PI * 2 + Math.PI / rivets;
    drawRivet(ctx, R + Math.cos(a) * (R - rim * 0.5), R + Math.sin(a) * (R - rim * 0.5), 0.9 * S, 0.8);
  }
  return cv.toDataURL('image/png');
}
