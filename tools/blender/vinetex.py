"""Sessio 58: liaanien varsitekstuuri (käyttäjä: köynnösten tekstuuri on puuta,
tilalle jotain kasvimaista).

Atlas 512 x 512, pystysuunnassa saumaton (v kulkee köyttä pitkin):
  vasen puolisko  (u 0..0.5): vihreä ruohovartinen varsi, pitkittäiset kuidut,
                              solmukohdat (lehtien kiinnityskohdat) ja huokoset;
  oikea puolisko  (u 0.5..1): vanha puutunut liaani, vihertävänharmaa,
                              syvät pitkittäiset uurteet ja sammallaikut.
Kohina tehdään FFT:llä, joten se on jaksollinen molempiin suuntiin.

Käyttö: python3 tools/blender/vinetex.py assets/models/trees
  -> vine_stem_c.webp (väri) ja vine_stem_n.webp (normaali)
"""
import sys
import numpy as np
from PIL import Image

S = 512
H = S // 2
rng = np.random.default_rng(58)


def field(w, h, su, sv, seed):
    """Jaksollinen kohina: valkoinen kohina suodatettuna anisotrooppisella
    Gaussilla taajuustasossa (su, sv = piirteen koko pikseleinä)."""
    r = np.random.default_rng(seed).standard_normal((h, w))
    fy = np.fft.fftfreq(h)[:, None]
    fx = np.fft.fftfreq(w)[None, :]
    g = np.exp(-0.5 * ((fx * su * 2 * np.pi) ** 2 + (fy * sv * 2 * np.pi) ** 2))
    out = np.real(np.fft.ifft2(np.fft.fft2(r) * g))
    return (out - out.mean()) / (out.std() + 1e-9)


def smooth(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


def mix(a, b, t):
    return a + (np.asarray(b, float) - a) * t[..., None]


def green_half():
    v = np.arange(S)[:, None] / S
    base = field(H, S, 40, 90, 1)
    fib = field(H, S, 1.6, 40, 2)            # kuidut pitkittäin
    fib2 = field(H, S, 4, 18, 3)
    col = mix(np.zeros((S, H, 3)) + [86, 101, 44], [126, 133, 62], smooth(-1.2, 1.4, base))
    col = mix(col, [104, 96, 52], smooth(0.6, 2.0, field(H, S, 30, 60, 4)) * 0.7)  # ruskehtavat laikut
    col *= (1 + 0.1 * fib + 0.05 * fib2)[..., None]
    hgt = 0.5 * fib + 0.3 * fib2
    # Solmukohdat: kolme renkaanmuotoista pullistumaa tekstuurin pituudella
    # (n. 0,5 m välein), hieman vinot ja epäsäännölliset.
    wob = field(H, S, 18, 18, 5)
    for c in (0.12, 0.45, 0.79):
        d = np.abs(((v - c + 0.5) % 1.0) - 0.5) * S - wob * 1.5
        ring = np.exp(-(d / 2.2) ** 2)
        scar = np.exp(-((d - 4) / 2.0) ** 2)
        hgt = hgt + ring * 1.8
        col = col * (1 - 0.28 * ring[..., None] - 0.12 * scar[..., None])
        col = mix(col, [150, 140, 80], ring * 0.25)
    # Huokoset (pienet vaaleat pilkut).
    dots = field(H, S, 0.8, 1.6, 6)
    lent = smooth(2.6, 3.4, dots)
    col = mix(col, [168, 160, 112], lent * 0.8)
    hgt = hgt + lent * 0.6
    return col, hgt


def woody_half():
    base = field(H, S, 26, 70, 11)
    fis = field(H, S, 3.2, 55, 12)           # pitkittäiset uurteet
    fis2 = field(H, S, 1.5, 22, 13)
    groove = smooth(0.4, 1.6, fis)
    col = mix(np.zeros((S, H, 3)) + [88, 84, 64], [118, 112, 88], smooth(-1.4, 1.4, base))
    col *= (1 - 0.5 * groove + 0.07 * fis2)[..., None]
    moss = smooth(0.5, 1.5, field(H, S, 22, 30, 14) + 0.3 * field(H, S, 3, 3, 15))
    col = mix(col, [78, 98, 40], moss * 0.85)
    hgt = -1.6 * groove + 0.35 * fis2 + 0.4 * moss
    return col, hgt


def normal_map(hgt, k):
    dx = (np.roll(hgt, -1, 1) - np.roll(hgt, 1, 1)) * 0.5
    dy = (np.roll(hgt, -1, 0) - np.roll(hgt, 1, 0)) * 0.5
    n = np.dstack([-dx * k, dy * k, np.ones_like(hgt)])
    n /= np.linalg.norm(n, axis=2, keepdims=True)
    return ((n * 0.5 + 0.5) * 255).clip(0, 255).astype(np.uint8)


def main():
    out = sys.argv[1] if len(sys.argv) > 1 else '.'
    gc, gh = green_half()
    wc, wh = woody_half()
    col = np.concatenate([gc, wc], axis=1).clip(0, 255).astype(np.uint8)
    hgt = np.concatenate([gh * 0.9, wh], axis=1)
    Image.fromarray(col).save(f'{out}/vine_stem_c.webp', quality=88)
    Image.fromarray(normal_map(hgt, 0.9)).save(f'{out}/vine_stem_n.webp', quality=92)
    print('ok', out)


if __name__ == '__main__':
    main()
