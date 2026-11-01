# Sessio 54: rakentaa esinemallit ja vie ne yhdeksi GLB:ksi.
# Ajo: blender -b --factory-startup --python tools/blender/build_items.py -- <ulos.glb> [tunnus,tunnus,...]
# Esinefunktiot ovat items_*.py-tiedostoissa (rekisteröity @item-koristeella).
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import itemlib  # noqa: E402
from registry import ITEMS  # noqa: E402
import items_tools  # noqa: E402,F401
import items_misc  # noqa: E402,F401
import items_weapons  # noqa: E402,F401
import items_mats  # noqa: E402,F401
import items_food  # noqa: E402,F401
import items_bows  # noqa: E402,F401
import items_armor  # noqa: E402,F401


def main():
    args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    out = args[0]
    only = set(args[1].split(',')) if len(args) > 1 and args[1] else None
    itemlib.reset()
    names = []
    for name, fn in ITEMS.items():
        if only and name not in only:
            continue
        parts = fn()
        opts = getattr(fn, 'opts', {})
        itemlib.build(name, parts, **opts)
        names.append(name)
        print('ITEM', name, flush=True)
    itemlib.export_glb(out, names)
    print('EXPORTED', len(names), out, flush=True)


main()
