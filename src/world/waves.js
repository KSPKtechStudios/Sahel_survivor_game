// Aaltojen yhteiset kaavat (ei three.js:ää, joten käy myös generointisäikeelle).
// Shader (render/water.js) käyttää samoja aaltoja, joten uiva pelaaja ja
// kelluvat esineet nousevat ja laskevat samassa tahdissa kuin pinta.

// [suunta tuulesta (rad), aallonpituus (m), suhteellinen korkeus, jyrkkyys, vaihe]
export const WAVES = [
  [0.0, 42, 1.0, 0.5, 0.0],
  [0.45, 27, 0.62, 0.55, 1.7],
  [-0.6, 17, 0.4, 0.55, 3.1],
  [1.1, 10.5, 0.22, 0.5, 4.6],
  [-1.4, 6.2, 0.12, 0.45, 2.2],
];

function smooth(d, a, b) {
  const t = Math.min(1, Math.max(0, (d - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

// Kuinka avointa vesi on (0 = tyyni puro, 1 = avomeri). type: terrain.js WATER.
export function openFactor(type, depth, sea, lakeR) {
  if (type === 1) return sea > 0.3 ? smooth(depth, 0.2, 5) : 0.12 * smooth(depth, 0.2, 2);
  if (type === 2) return Math.min(0.35, lakeR / 300) * smooth(depth, 0.2, 2);
  return 0.03;
}

// Aaltojen pystysuuntainen poikkeama pisteessä (sama kaava kuin shaderissa).
export function waveHeight(x, z, t, amp, windX, windZ) {
  if (amp <= 0.0001) return 0;
  let y = 0;
  for (const [a, L, f, , p] of WAVES) {
    const c = Math.cos(a), s = Math.sin(a);
    const dx = windX * c - windZ * s;
    const dz = windX * s + windZ * c;
    const k = (2 * Math.PI) / L;
    const w = Math.sqrt(9.81 * k);
    y += amp * f * Math.sin(k * (dx * x + dz * z) - w * t + p);
  }
  return y;
}
