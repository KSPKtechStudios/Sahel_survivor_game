# Sessio 56: lehtiatlaksen kokoaminen leafgen.py:n ruuduista.
# Ajo: python3 -I tools/blender/pack_leaves.py <ruutukansio> assets/models/trees/leaves.webp tools/blender/leaf_cells.json
# Jokaisesta ruudusta mitataan lehvän alue (alfa > 0); puiden kortit käyttävät
# vain sitä (ei tyhjää tilaa). UV:t Blenderin tavalla (v = 0 alhaalla).
import json
import sys
from PIL import Image

CELL = 512
COLS, ROWS = 4, 2
CELLS = ['acacia_a', 'acacia_b', 'shea', 'baobab', 'broad_a', 'broad_b', 'kapok', 'sapling']


def main(src, out_img, out_json):
    atlas = Image.new('RGBA', (CELL * COLS, CELL * ROWS), (0, 0, 0, 0))
    info = {}
    for i, name in enumerate(CELLS):
        im = Image.open(f'{src}/cell_{name}.png').convert('RGBA')
        c, r = i % COLS, i // COLS
        atlas.paste(im, (c * CELL, r * CELL))
        a = im.split()[3].point(lambda v: 255 if v > 24 else 0)
        x0, y0, x1, y1 = a.getbbox()
        pad = 4
        x0, y0, x1, y1 = max(0, x0 - pad), max(0, y0 - pad), min(CELL, x1 + pad), min(CELL, y1 + pad)
        u0 = (c * CELL + x0) / (CELL * COLS)
        u1 = (c * CELL + x1) / (CELL * COLS)
        # Kuvan rivi r ylhäältä; v alhaalta ylös.
        v0 = 1 - (r * CELL + y1) / (CELL * ROWS)
        v1 = 1 - (r * CELL + y0) / (CELL * ROWS)
        info[name] = {'uv': [round(u0, 5), round(v0, 5), round(u1, 5), round(v1, 5)], 'aspect': round((y1 - y0) / (x1 - x0), 4)}
        print(name, info[name])
    atlas.save(out_img, quality=90, method=6, alpha_quality=100)
    json.dump(info, open(out_json, 'w'), indent=1)


if __name__ == '__main__':
    main(*sys.argv[1:4])
