# Esinefunktioiden rekisteri: @item tai @item(ao_strength=..., ao_dist=...).
ITEMS = {}


def item(fn=None, **opts):
    def reg(f):
        f.opts = opts
        ITEMS[f.__name__] = f
        return f
    return reg(fn) if fn else reg
