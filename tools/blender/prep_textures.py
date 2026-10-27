# Sessio 54: esineiden materiaalikirjaston tekstuurit (ambientCG, CC0).
# Ajo: python3 -I tools/blender/prep_textures.py <ambientCG-kansio> assets/textures/items
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


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
