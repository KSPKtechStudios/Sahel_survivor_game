# Sessio 54: työkalut (kirveet, hakut, vasara). Mitat vastaavat vanhoja
# malleja, jotta otteet kädessä (viewmodel.js holdFor) pysyvät kohdallaan.
import math
from itemlib import V, Vector, Matrix, smooth, lerp, ring, loft, transform, displace, box_uv, rng
from registry import item
from shapes import haft, wrap, head_loft, lashing, pick_head, scallops, mirror_x, lathe_z, cord, ellipse_pts, tube_path


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


def langets(mat, z0, z1, rx, ry, w=0.009, t=0.0018, rivets='iron'):
    """Varren sivuilla kulkevat metalliliuskat (suojaavat vartta terän alla)."""
    from items_weapons import ball
    parts = []
    for sy in (-1, 1):
        rings = []
        for i in range(9):
            z = lerp(z0, z1, i / 8)
            taper = 1 - 0.45 * (i / 8) ** 2
            rings.append(ring(V(0, sy * (ry + t), z), V(1, 0, 0), V(0, 1, 0), w * taper, t, 8, power=4))
        parts.append(loft(mat, rings))
        for zz in (lerp(z0, z1, 0.3), lerp(z0, z1, 0.75)):
            parts.append(ball(rivets, V(0, sy * (ry + 2 * t), zz), 0.0032, sub=1, sy=0.6))
    return parts


@item
def iron_axe():
    # Partakirves: pitkä alaspäin kaartuva parta, vasarapää takana, liuskat varressa.
    parts = metal_axe('iron', 'steel', 'hardwood', x0=-0.04, x1=0.222, ztop=0.52, zbot=0.44, beard=0.085, flare=0.018, th=0.026, bulge=0.012)
    rings = []
    for i in range(7):
        s = i / 6
        x = lerp(-0.084, -0.036, s)
        hh = 0.03 + 0.006 * smooth(s)
        rings.append(ring(V(x, 0, 0.48), V(0, 1, 0), V(0, 0, 1), 0.0205 * (0.92 + 0.08 * s), hh, 14, power=4.0))
    parts.append(loft('iron', rings))
    parts += langets('iron', 0.37, 0.445, 0.0165, 0.0125)
    parts.append(head_loft('steel', -0.004, 0.004, lambda s: 0.572, lambda s: 0.556, lambda s: 0.009, seg=2, n=8)[0])
    return parts


@item
def copper_axe():
    # Pronssikauden puolikuukirves: holkki varren ympärillä, kapea kaula ja
    # leveä, kaareva terä, jonka sarvet kääntyvät taaksepäin.
    parts = [haft('hardwood', -0.15, 0.56, 0.0165, 0.0125)]
    parts.append(wrap('leather', -0.11, 0.075, 0.0168, 0.0128, zb0=-0.15, zb1=0.56))
    zc = 0.49
    # Holkki: kaksi kohoreunaa.
    prof = [(0.0185, 0.425), (0.0215, 0.43), (0.0195, 0.44), (0.0195, 0.465), (0.0225, 0.47), (0.0225, 0.476), (0.0195, 0.48),
            (0.0195, 0.505), (0.0225, 0.51), (0.0225, 0.516), (0.0195, 0.52), (0.0195, 0.545), (0.0175, 0.552)]
    parts.append(lathe_z('copper', prof, n=18, sy=0.82))

    def top(s):
        return zc + 0.016 + 0.07 * smooth((s - 0.3) / 0.7) ** 1.6

    def bot(s):
        return zc - 0.016 - 0.07 * smooth((s - 0.3) / 0.7) ** 1.6

    def thick(s):
        return 0.0085 * (1 - smooth((s - 0.35) / 0.65)) ** 0.9 + 0.0012
    parts += head_loft('copper', 0.012, 0.195, top, bot, thick, seg=28, n=18, bulge=0.042, power=2.3)
    return parts


@item
def ruby_axe():
    # Kaksiteräinen taistelukirves: rautaterät rubiinireunoin, piikki päällä,
    # rubiini keskellä molemmin puolin, liuskat ja messinkirenkaat varressa.
    from items_weapons import ball
    parts = [haft('heartwood', -0.15, 0.6, 0.0175, 0.0135)]
    parts.append(wrap('leather:5a2a20', -0.11, 0.06, 0.0178, 0.0138, zb0=-0.15, zb1=0.6))
    for z in (-0.115, 0.065):
        parts.append(cord('brass', ellipse_pts(V(0, 0, z), V(1, 0, 0), V(0, 1, 0), 0.0185, 0.0145, 16), 0.0026))
    zc = 0.53

    def top(s):
        return zc + 0.028 + 0.06 * smooth((s - 0.25) / 0.75) ** 1.4

    def bot(s):
        return zc - 0.028 - 0.06 * smooth((s - 0.25) / 0.75) ** 1.4

    def thick(s):
        return 0.012 * (1 - smooth((s - 0.2) / 0.8)) ** 0.8 + 0.0011
    for side in (1, -1):
        h = head_loft('iron', 0.0, 0.2, top, bot, thick, seg=28, n=18, bulge=0.03, split=0.8, split_mat='ruby', power=2.4)
        if side < 0:
            h = [mirror_x(q) for q in h]
        parts += h
    parts.append(tube_path('steel', [V(0, 0, 0.555), V(0, 0, 0.6), V(0, 0, 0.66)], lambda t: 0.012 * (1 - t) ** 0.9 + 0.001, n=10))
    for sy in (-1, 1):
        parts.append(ball('ruby', V(0, sy * 0.0125, zc), 0.0115, sub=1, sx=1.0, sy=0.45, sz=1.3))
    parts += langets('iron', 0.39, 0.5, 0.0175, 0.0135)
    return parts


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


def picks(head_mat, tip_mat, wood, half, r0, z1=0.53, zc=0.47, chisel=True, lash=None, arch=0.03, tipA=0.0025, tipB=0.0025, collar=0.3, chisel_w=1.6):
    parts = [haft(wood, -0.15, z1, 0.0165, 0.0125, top_swell=0.15 if lash else 0.0)]
    if not lash:
        parts.append(wrap('leather', -0.11, 0.075, 0.0168, 0.0128, zb0=-0.15, zb1=z1))
    parts += pick_head(head_mat, zc, half, r0, tipA=tipA, tipB=tipB, arch=arch, tip_mat=tip_mat, chisel=chisel, collar=collar, chisel_w=chisel_w)
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
    # Kuokkahakku: toisella puolella lyhyt alaspäin kaartuva piikki, toisella
    # viuhkamainen pystyterä; valettu holkki varren ympärillä.
    parts = [haft('hardwood', -0.15, 0.53, 0.0165, 0.0125)]
    parts.append(wrap('leather', -0.11, 0.075, 0.0168, 0.0128, zb0=-0.15, zb1=0.53))
    zc = 0.47
    prof = [(0.0185, 0.43), (0.0225, 0.436), (0.0205, 0.445), (0.0205, 0.495), (0.0225, 0.504), (0.0185, 0.51)]
    parts.append(lathe_z('copper', prof, n=18, sy=0.82))
    rings = []
    seg = 20
    for i in range(seg + 1):
        t = i / seg
        x = lerp(0.0, -0.19, t)
        z = zc - 0.05 * t * t
        r = lerp(0.019, 0.0035, smooth(t) ** 0.9)
        d = V(-0.19, 0, -0.1 * t).normalized()
        u = V(0, 1, 0)
        rings.append(ring(V(x, 0, z), u, d.cross(u), r * 0.8, r * 1.35, 10, power=2.4))
    parts.append(loft('copper', rings))

    def top(s_):
        return zc + 0.014 + 0.05 * smooth((s_ - 0.35) / 0.65) ** 1.5

    def bot(s_):
        return zc - 0.014 - 0.05 * smooth((s_ - 0.35) / 0.65) ** 1.5

    def thick(s_):
        return 0.008 * (1 - smooth((s_ - 0.35) / 0.65)) ** 0.9 + 0.0012
    parts += head_loft('copper', 0.012, 0.16, top, bot, thick, seg=24, n=16, bulge=0.025, power=2.3)
    return parts


@item
def iron_pick():
    # Kaksipiikkinen hakku: pitkät kaarevat piikit teräskärjin, liuskat ja kiila.
    parts = picks('iron', 'steel', 'hardwood', 0.26, 0.02, chisel=False, arch=0.045, tipA=0.0022, tipB=0.0022, collar=0.35)
    parts += langets('iron', 0.38, 0.452, 0.0165, 0.0125)
    parts.append(head_loft('steel', -0.004, 0.004, lambda s: 0.538, lambda s: 0.52, lambda s: 0.009, seg=2, n=8)[0])
    return parts


@item
def ruby_pick():
    # Sotahakku: pitkä alaspäin kaartuva piikki rubiinikiteen kärjellä,
    # vastapuolella vasarapää; liuskat ja messinkirenkaat varressa.
    from items_misc import crystal
    from items_weapons import ball
    from itemlib import Part
    parts = [haft('heartwood', -0.15, 0.53, 0.0175, 0.0135)]
    parts.append(wrap('leather:5a2a20', -0.11, 0.06, 0.0178, 0.0138, zb0=-0.15, zb1=0.53))
    for z in (-0.115, 0.065):
        parts.append(cord('brass', ellipse_pts(V(0, 0, z), V(1, 0, 0), V(0, 1, 0), 0.0185, 0.0145, 16), 0.0026))
    zc = 0.47
    rings = []
    seg = 24
    for i in range(seg + 1):
        t = i / seg
        x = lerp(0.0, -0.22, t)
        z = zc - 0.06 * t * t
        r = lerp(0.021, 0.006, smooth(t) ** 0.9) + 0.006 * (1 - smooth(t / 0.15))
        d = V(-1, 0, -0.12 * t / 0.22 * 1.0).normalized()
        u = V(0, 1, 0)
        rings.append(ring(V(x, 0, z), u, u.cross(d) * -1, r * 0.8, r * 1.3, 10, power=2.4))
    parts.append(loft('iron', rings))
    g = Part('ruby')
    tip = V(-0.22, 0, zc - 0.06)
    crystal(g, tip + V(0.006, 0, 0.002), V(-1, 0, -0.55), 0.0075, 0.03, 0.02, 5)
    for f in g.bm.faces:
        f.smooth = False
    from itemlib import box_uv as _buv
    _buv(g)
    parts.append(g)
    # Vasarapää.
    rings = []
    for i in range(9):
        s = i / 8
        x = lerp(0.0, 0.085, s)
        k = 1 + 0.12 * smooth((s - 0.75) / 0.25)
        rings.append(ring(V(x, 0, zc), V(0, 1, 0), V(0, 0, 1), 0.019 * k, 0.022 * k, 14, power=4.0))
    parts.append(loft('iron', rings))
    parts.append(ball('ruby', V(0, -0.0225, zc), 0.0095, sub=1, sx=1.0, sy=0.45, sz=1.2))
    parts.append(ball('ruby', V(0, 0.0225, zc), 0.0095, sub=1, sx=1.0, sy=0.45, sz=1.2))
    parts += langets('iron', 0.39, 0.45, 0.0175, 0.0135)
    return parts


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
