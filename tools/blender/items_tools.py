# Sessio 54: työkalut (kirveet, hakut, vasara). Mitat vastaavat vanhoja
# malleja, jotta otteet kädessä (viewmodel.js holdFor) pysyvät kohdallaan.
import math
from itemlib import V, Vector, Matrix, smooth, lerp, ring, loft, transform, displace, box_uv, rng
from registry import item
from shapes import haft, wrap, head_loft, lashing, pick_head, scallops


def metal_head(metal, edge, x0, x1, ztop, zbot, beard, flare, th, bulge, split=0.84, power=2.6):
    se = -x0 / (x1 - x0)  # silmän kohta (varsi x = 0)
    hh0 = (ztop - zbot) / 2
    zc = (ztop + zbot) / 2

    def top(s):
        neck = -0.006 * smooth((s - se) / 0.15) * (1 - smooth((s - 0.55) / 0.2))
        return zc + hh0 * (0.85 + 0.15 * smooth(s / se)) + neck + flare * smooth((s - 0.45) / 0.55)

    def bot(s):
        neck = 0.008 * smooth((s - se) / 0.15) * (1 - smooth((s - 0.5) / 0.2))
        return zc - hh0 * (0.85 + 0.15 * smooth(s / se)) + neck - beard * smooth((s - 0.42) / 0.58) ** 1.3

    def thick(s):
        if s < se:
            return th * (0.82 + 0.18 * smooth(s / se))
        return th * (1 - smooth((s - se) / (1 - se))) ** 0.85 + 0.0011

    return head_loft(metal, x0, x1, top, bot, thick, bulge=bulge, split=split if edge else None, split_mat=edge, power=power)


def metal_axe(metal, edge, wood, z1=0.565, **k):
    parts = [haft(wood, -0.15, z1, 0.0165, 0.0125)]
    parts.append(wrap('leather', -0.11, 0.075, 0.0168, 0.0128, zb0=-0.15, zb1=z1))
    parts += metal_head(metal, edge, **k)
    return parts


@item
def iron_axe():
    return metal_axe('iron', 'steel', 'hardwood', x0=-0.065, x1=0.222, ztop=0.52, zbot=0.44, beard=0.075, flare=0.022, th=0.026, bulge=0.012)


@item
def copper_axe():
    # Leveä, kaareva kupariterä (vanhan mallin mitat: x -0,03 ... 0,202).
    return metal_axe('copper', None, 'hardwood', x0=-0.03, x1=0.202, ztop=0.535, zbot=0.465, beard=0.045, flare=0.045, th=0.022, bulge=0.022, power=2.4)


@item
def ruby_axe():
    # Rautaterä, jonka kärki on hiottua rubiinia (hehkuu).
    return metal_axe('iron', 'ruby', 'heartwood', z1=0.63, x0=-0.023, x1=0.233, ztop=0.6, zbot=0.52, beard=0.06, flare=0.03, th=0.021, bulge=0.014, split=0.78)


def stone_blade(mat, x0, x1, zc, h0, h1, t0, t1, seg=22, n=16, seed=1, knap=0.0):
    """Hiottu kiviterä (kelttiterä) X-suunnassa: kapea niska, leveä kaareva terä."""
    rings = []
    for i in range(seg + 1):
        s = i / seg
        x = lerp(x0, x1, s)
        hh = lerp(h0, h1, smooth(s) ** 0.8)
        th = lerp(t0, t1, s ** 1.4) * (1 - 0.92 * smooth((s - 0.75) / 0.25))
        pts = ring(V(x, 0, zc), V(0, 1, 0), V(0, 0, 1), max(th, 0.0012), hh, n, power=2.1)
        b = 0.018 * smooth((s - 0.7) / 0.3)
        for p in pts:
            w = (p.z - zc) / hh
            p.x += b * (1 - w * w)
        rings.append(pts)
    p = loft(mat, rings)
    if knap:
        scallops(p, knap, 0.012, seed=seed)
    displace(p, 0.0012, 60, seed=seed)
    return p


@item
def stone_axe():
    # Hiottu kiviterä varren paksunnetun yläpään läpi, kuitusidos.
    parts = [haft('wood', -0.15, 0.533, 0.017, 0.0135, top_swell=0.45, bow=-0.01)]
    parts.append(stone_blade('stone', -0.061, 0.231, 0.455, 0.022, 0.05, 0.03, 0.022, seed=4))
    parts += lashing('rope', 0.455, 0.035, 0.03, 0.05, r=0.0026, loops=3, haft_rx=0.019, haft_ry=0.0155)
    return parts


@item
def flint_axe():
    # Lohkottu piikiviterä halkaistussa varressa, köysisidos.
    parts = [haft('wood', -0.15, 0.522, 0.0165, 0.013, top_swell=0.25, bow=-0.01)]
    parts.append(stone_blade('flint', -0.052, 0.239, 0.455, 0.02, 0.048, 0.022, 0.016, seed=7, knap=0.004))
    parts += lashing('rope', 0.455, 0.03, 0.022, 0.045, r=0.0025, loops=3, haft_rx=0.0185, haft_ry=0.015)
    return parts


def picks(head_mat, tip_mat, wood, half, r0, z1=0.53, zc=0.47, chisel=True, lash=None, arch=0.03, tipA=0.0025, tipB=0.0025, collar=0.3):
    parts = [haft(wood, -0.15, z1, 0.0165, 0.0125, top_swell=0.15 if lash else 0.0)]
    if not lash:
        parts.append(wrap('leather', -0.11, 0.075, 0.0168, 0.0128, zb0=-0.15, zb1=z1))
    parts += pick_head(head_mat, zc, half, r0, tipA=tipA, tipB=tipB, arch=arch, tip_mat=tip_mat, chisel=chisel, collar=collar)
    if lash:
        parts += lashing(lash, zc - 0.012, 0.03, r0 + 0.004, 0.035, r=0.0025, loops=2, haft_rx=0.018, haft_ry=0.014)
    return parts


@item
def stone_pick():
    parts = picks('stone', None, 'wood', 0.19, 0.026, z1=0.5, zc=0.455, chisel=False, lash='rope', arch=0.04, tipA=0.005, tipB=0.005, collar=0.1)
    return parts


@item
def flint_pick():
    p = picks('flint', None, 'wood', 0.248, 0.022, z1=0.51, zc=0.465, chisel=False, lash='rope', arch=0.05, tipA=0.003, tipB=0.003, collar=0.1)
    scallops(p[1], 0.0025, 0.01, seed=11)
    return p


@item
def copper_pick():
    return picks('copper', None, 'hardwood', 0.222, 0.021, chisel=True)


@item
def iron_pick():
    return picks('iron', 'steel', 'hardwood', 0.222, 0.021, chisel=True)


@item
def ruby_pick():
    return picks('iron', 'ruby', 'heartwood', 0.222, 0.021, chisel=False, tipA=0.003, tipB=0.003)


@item
def hammer():
    # Kivinen nuija-vasara: pyöreäkulmainen kivi kiinni varressa köysisidoksella.
    parts = [haft('wood', -0.14, 0.43, 0.0155, 0.0125, top_swell=0.3, bow=-0.008)]
    rings = []
    seg = 16
    for i in range(seg + 1):
        s = i / seg
        x = lerp(-0.068, 0.068, s)
        e = 1 - 0.35 * (2 * s - 1) ** 8
        rings.append(ring(V(x, 0, 0.405), V(0, 1, 0), V(0, 0, 1), 0.033 * e, 0.036 * e, 16, power=3.0))
    st = loft('stone', rings)
    displace(st, 0.003, 30, seed=5)
    parts.append(st)
    parts += lashing('rope', 0.405, 0.024, 0.036, 0.072, r=0.0026, loops=2, haft_rx=0.0175, haft_ry=0.0145)
    return parts
