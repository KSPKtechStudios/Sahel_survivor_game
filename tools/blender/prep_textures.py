# Sessio 54: esineiden materiaalikirjaston tekstuurit (ambientCG, CC0).
# Ajo: python3 -I tools/blender/prep_textures.py <ambientCG-kansio> assets/textures/items
#      python3 -I tools/blender/prep_textures.py --bark <ambientCG-kansio> assets/models/trees (puiden kaarnat)
#      python3 -I tools/blender/prep_textures.py --procedural assets/textures/items (rengas- ja suomupanssari)
# Lähdekansiossa on kunkin materiaalin 1K-JPG-paketti purettuna (<Id>/<Id>_1K-JPG_Color.jpg ...).
# Tulos: <avain>_c.webp (väri), _n.webp (normaali, OpenGL), _r.webp (karheus),
# 512 x 512. gray = väri harmaaksi (sävy annetaan pelissä materiaalipaikan
# nimessä, esim. 'cloth:9a8060').
import os
import sys
from PIL import Image, ImageOps, ImageEnhance

LIB = {
    'wood': ('Wood049', {}),
    'hardwood': ('Wood027', {}),
    'heartwood': ('Wood026', {}),
    'bark': ('Bark012', {}),
    'stone': ('Rock041', {}),
    'flint': ('Rock035', {'sat': 0.35}),
    'clay': ('Rock029', {}),
    'iron': ('Metal046B', {}),
    'steel': ('Metal055A', {}),
    'copper': ('Metal047B', {}),
    'gold': ('Metal048A', {}),
    'brass': ('Metal007', {}),
    'leather': ('Leather030', {}),
    'rope': ('Rope001', {}),
    'cloth': ('Fabric045', {'gray': True}),
    'bone': ('Rock054', {'gray': True}),
    'fur': ('Fabric084', {'gray': True}),
}
SIZE = 512

# Sessio 56: puiden kaarnat (assets/models/trees/bark_<avain>_{c,n}.webp).
BARK = {
    'acacia': 'Bark014', 'shea': 'Bark001', 'baobab': 'Bark005', 'rain': 'Bark009',
    'kapok': 'Bark010', 'emergent': 'Bark004', 'sapling': 'Bark002',
}
# Värin säätö: keskiarvo kohti annettua väriä, värikylläisyys (baobabin kaarna
# on vaalean harmaanruskea, ambientCG:n Bark005 tumman oliivinen).
BARK_ADJ = {'baobab': ((152, 140, 126), 0.55)}


def bark(src, dst):
    os.makedirs(dst, exist_ok=True)
    for key, aid in BARK.items():
        base = os.path.join(src, aid, f'{aid}_1K-JPG_')
        col = Image.open(base + 'Color.jpg').convert('RGB').resize((SIZE, SIZE), Image.LANCZOS)
        if key in BARK_ADJ:
            from PIL import ImageStat
            target, sat = BARK_ADJ[key]
            col = ImageEnhance.Color(col).enhance(sat)
            mean = ImageStat.Stat(col).mean
            ch = [c.point(lambda v, k=target[i] / max(1, mean[i]): min(255, int(v * k))) for i, c in enumerate(col.split())]
            col = Image.merge('RGB', ch)
        col.save(os.path.join(dst, f'bark_{key}_c.webp'), quality=84, method=6)
        Image.open(base + 'NormalGL.jpg').convert('RGB').resize((SIZE, SIZE), Image.LANCZOS).save(os.path.join(dst, f'bark_{key}_n.webp'), quality=88, method=6)
        print('bark', key, aid)


def main(src, dst):
    os.makedirs(dst, exist_ok=True)
    for key, (aid, opt) in LIB.items():
        base = os.path.join(src, aid, f'{aid}_1K-JPG_')
        col = Image.open(base + 'Color.jpg').convert('RGB').resize((SIZE, SIZE), Image.LANCZOS)
        if opt.get('gray'):
            g = ImageOps.grayscale(col)
            g = ImageOps.autocontrast(g, cutoff=1)
            # Harmaa noin 0,75 keskiarvolla, jotta sävy pelissä on helppo antaa.
            g = g.point(lambda v: int(150 + (v - 128) * 0.7))
            col = Image.merge('RGB', (g, g, g))
        if 'sat' in opt:
            col = ImageEnhance.Color(col).enhance(opt['sat'])
        col.save(os.path.join(dst, f'{key}_c.webp'), quality=86, method=6)
        nrm = Image.open(base + 'NormalGL.jpg').convert('RGB').resize((SIZE, SIZE), Image.LANCZOS)
        nrm.save(os.path.join(dst, f'{key}_n.webp'), quality=90, method=6)
        rough = Image.open(base + 'Roughness.jpg').convert('L').resize((SIZE, SIZE), Image.LANCZOS)
        rough.save(os.path.join(dst, f'{key}_r.webp'), quality=88, method=6)
        print(key, aid)


def _save_maps(dst, key, h, col_on, col_off, rough_on, rough_off, strength=6.0):
    """Korkeuskartasta (0..1) väri-, normaali- ja karheuskartat."""
    import numpy as np
    gy, gx = np.gradient(h)
    nx, ny, nz = -gx * strength, gy * strength, np.ones_like(h)
    ln = np.sqrt(nx * nx + ny * ny + nz * nz)
    nrm = np.stack([(nx / ln + 1) * 127.5, (ny / ln + 1) * 127.5, (nz / ln + 1) * 127.5], -1).clip(0, 255).astype('uint8')
    m = (h > 0.02).astype('float32')[..., None]
    shade = (0.55 + 0.45 * h)[..., None]
    col = (np.array(col_on) * shade * m + np.array(col_off) * (1 - m)).clip(0, 255).astype('uint8')
    rough = (rough_on * m[..., 0] + rough_off * (1 - m[..., 0])) * 255
    Image.fromarray(col).save(os.path.join(dst, f'{key}_c.webp'), quality=88, method=6)
    Image.fromarray(nrm).save(os.path.join(dst, f'{key}_n.webp'), quality=92, method=6)
    Image.fromarray(rough.clip(0, 255).astype('uint8')).save(os.path.join(dst, f'{key}_r.webp'), quality=88, method=6)
    print(key, 'procedural')


def gen_chain(dst, n=8):
    """Rengaspanssari: rivien renkaat kallistuvat vuorotellen eri suuntiin
    (4-in-1-punos), joka toinen rivi päällä (toistuva)."""
    import numpy as np
    S = SIZE
    yy, xx = np.mgrid[0:S, 0:S].astype('float32') / S
    h = np.zeros((S, S), 'float32')
    cell = 1.0 / n
    R, w = cell * 0.5, cell * 0.12
    rows = 12  # parillinen määrä rivejä, rivikorkeus jakaa ruudun tasan (toistuu saumatta)
    for j in range(rows):
        th = 0.55 if j % 2 == 0 else -0.55
        c, s_ = np.cos(th), np.sin(th)
        for i in range(n):
            cx = (i + 0.5 * (j % 2)) * cell
            cy = j / rows
            for ox in (-1, 0, 1):
                for oy in (-1, 0, 1):
                    dx = xx - (cx + ox)
                    dy = yy - (cy + oy)
                    u = dx * c + dy * s_
                    v = (-dx * s_ + dy * c) / 0.62
                    d = np.abs(np.sqrt(u * u + v * v) - R)
                    val = np.sqrt(np.clip(1 - (d / w) ** 2, 0, 1))
                    h = np.maximum(h, val * (0.72 + 0.28 * ((j % 2) == 0)))
    _save_maps(dst, 'chain', h, (128, 130, 134), (30, 28, 26), 0.55, 1.0, strength=8.0)


def gen_scales(dst, n=8):
    """Suomupanssari: limittäiset pyöreäpäiset suomut riveittäin (toistuva)."""
    import numpy as np
    S = SIZE
    yy, xx = np.mgrid[0:S, 0:S].astype('float32') / S
    h = np.zeros((S, S), 'float32')
    rows = 10
    cw, ch = 1.0 / n, 1.0 / rows
    for j in range(rows - 1, -1, -1):
        for i in range(n):
            cx = (i + 0.5 * (j % 2)) * cw
            cy = j * ch
            for ox in (-1, 0, 1):
                for oy in (-1, 0, 1):
                    dx = (xx - (cx + ox)) / (cw * 0.5)
                    dy = (yy - (cy + oy)) / (ch * 0.9)
                    inside = (np.abs(dx) < 1) & (dy > -1.2) & (dy < 0.4) & ((dy < 0) | (dx * dx + (dy / 0.4) ** 2 < 1))
                    prof = np.clip(0.4 + 0.6 * (-dy / 1.2), 0.15, 1) * (1 - 0.35 * dx * dx)
                    h = np.where(inside, prof, h)
    _save_maps(dst, 'scales', h, (200, 128, 78), (40, 24, 14), 0.5, 0.9, strength=5.0)


if __name__ == '__main__':
    if sys.argv[1] == '--bark':
        bark(sys.argv[2], sys.argv[3])
    elif sys.argv[1] == '--procedural':
        gen_chain(sys.argv[2])
        gen_scales(sys.argv[2])
    else:
        main(sys.argv[1], sys.argv[2])
