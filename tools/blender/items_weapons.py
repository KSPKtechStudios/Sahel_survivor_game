# Sessio 54: aseet (tikarit, miekat, viidakkoveitsi, nuijat, moukari, keihäät, kilvet).
# Kahva origossa, terä +Z (pelissä +Y). Kilvet XZ-tasossa, etupuoli +Y
# (pelissä -Z, kuten vanhassa mallissa: kupu edessä, kahva takana).
import math
import bpy
from itemlib import V, Vector, Matrix, smooth, lerp, ring, loft, transform, displace, box_uv, from_object, Part, rng
from registry import item
from shapes import haft, wrap, blade, scallops, lashing, cord, ellipse_pts, lathe_z, tube_path, shaped_disc, mirror_x


def bar(mat, x0, x1, zc, ry, rz, seg=10, n=12, power=3.0, taper=0.0, bend=0.0):
    """Poikkitanko X-suunnassa (väistin, koru): pyöristetty suorakaide."""
    rings = []
    for i in range(seg + 1):
        s = i / seg
        x = lerp(x0, x1, s)
        k = 1 - taper * abs(2 * s - 1)
        z = zc + bend * (2 * s - 1) ** 2
        rings.append(ring(V(x, 0, z), V(0, 1, 0), V(0, 0, 1), ry * k, rz * k, n, power=power))
    return loft(mat, rings)


def ball(mat, c, r, sub=3, sx=1.0, sy=1.0, sz=1.0, noise_amp=0.0, seed=0):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=sub, radius=1)
    p = from_object(mat, bpy.context.active_object)
    transform(p, Matrix.Diagonal((r * sx, r * sy, r * sz, 1)))
    if noise_amp:
        displace(p, noise_amp, 9.0 / r * 0.1, seed=seed)
    transform(p, Matrix.Translation(c))
    box_uv(p)
    for f in p.bm.faces:
        f.smooth = True
    return p


def grip(z0, z1, r, mat='leather', core='hardwood', turns=8):
    return [haft(core, z0, z1, r * 0.96, r * 0.82, bow=0, knob=0, taper=0, n=12, seg=8),
            wrap(mat, z0 + 0.004, z1 - 0.004, r, r * 0.86, turns=turns, step=0.0012, bow=0)]


# --- Tikarit ja miekat -----------------------------------------------------------

@item
def flint_dagger():
    w = lambda t: 0.022 * (math.sin(math.pi * (0.12 + 0.88 * t)) ** 0.7) * (1 - 0.15 * t) + 0.001
    th = lambda t: 0.0062 * (1 - 0.7 * t) + 0.0008
    bl = blade('flint', 0.055, 0.308, w, th, n=16, seg=26)[0]
    scallops(bl, 0.0016, 0.007, seed=21)
    parts = [bl]
    parts += grip(-0.08, 0.058, 0.0135, mat='leather', core='wood')
    parts.append(ball('wood', V(0, 0, -0.082), 0.016, sz=0.7))
    parts += [cord('rope', ellipse_pts(V(0, 0, 0.056 + 0.004 * i), V(1, 0, 0), V(0, 1, 0), 0.0165, 0.012, 16), 0.0022) for i in range(3)]
    return parts


def ruby_inlay(bz0, L, curve, bth, t0, t1, w, rise=1.03, seg=24):
    """Ohut rubiininauha terän keskellä molemmin puolin (hehkuu). Terä alkaa
    korkeudelta bz0, pituus L, kaarevuus curve ja puolipaksuus bth(t)."""
    z0, z1 = bz0 + t0 * L, bz0 + t1 * L
    tb = lambda u: t0 + u * (t1 - t0)
    return blade('ruby', z0, z1, lambda u: w * (1 - 0.45 * u) + 0.0005, lambda u: bth(tb(u)) * rise, n=10, seg=seg,
                 shift=lambda u: curve * tb(u) ** 2)


@item
def ruby_dagger():
    # Kaareva kaksiteräinen tikari (jambiya): tumma teräs, rubiininauha,
    # messinkinen kahva ja rubiini ponnessa.
    L = 0.25
    w = lambda t: 0.021 * (1 - 0.25 * t) * (1 - smooth((t - 0.6) / 0.4) ** 1.4) + 0.001
    th = lambda t: 0.0055 * (1 - 0.6 * t) + 0.0008
    parts = blade('steel', 0.045, 0.045 + L, w, th, n=16, seg=26, curve=0.05, fuller=-0.25)
    parts += ruby_inlay(0.045, L, 0.05, th, 0.06, 0.74, 0.0058, rise=1.2)
    parts.append(bar('brass', -0.03, 0.03, 0.04, 0.008, 0.007, power=2.4, taper=0.25, bend=-0.006))
    parts += grip(-0.07, 0.034, 0.0128, mat='leather:4a2a20', core='heartwood', turns=7)
    for z in (-0.068, 0.032):
        parts.append(cord('brass', ellipse_pts(V(0, 0, z), V(1, 0, 0), V(0, 1, 0), 0.0142, 0.0124, 16), 0.0022))
    parts.append(lathe_z('brass', [(0.008, -0.07), (0.016, -0.078), (0.017, -0.088), (0.01, -0.095)], n=16, sy=0.85))
    parts.append(ball('ruby', V(0, 0, -0.098), 0.0105, sub=1, sz=1.2))
    return parts


def sword(mat, guard_mat, z_blade, hw, length, th, guard_w, grip_r=0.0135, fuller=0.45, pommel_mat=None, tip=0.12, leaf=0.0):
    def w(t):
        base = hw * (1 + leaf * math.sin(math.pi * min(1, t / 0.85)) - 0.12 * t)
        return base * (1 - smooth((t - (1 - tip)) / tip) ** 1.3) + 0.0008

    def thick(t):
        return th * (1 - 0.55 * t) + 0.0007

    parts = blade(mat, z_blade, z_blade + length, w, thick, n=18, seg=34, fuller=fuller)
    parts.append(bar(guard_mat, -guard_w, guard_w, z_blade - 0.008, 0.011, 0.008, power=2.6, taper=0.2, bend=0.004))
    parts += grip(-0.118, z_blade - 0.016, grip_r)
    parts.append(ball(pommel_mat or guard_mat, V(0, 0, -0.128), 0.02, sy=0.75, sz=0.85))
    return parts


@item
def copper_sword():
    # Pronssikauden lehtimiekka: keskiharjanne, valettu kuparikahva renkain ja
    # "antenni"-ponsi, jonka kierukat kiertyvät ulospäin.
    def w(t):
        return 0.024 * (1 + 0.32 * math.sin(math.pi * min(1, t / 0.78)) ** 1.5 - 0.1 * t) * (1 - smooth((t - 0.8) / 0.2) ** 1.25) + 0.0008
    th = lambda t: 0.0068 * (1 - 0.55 * t) + 0.0008
    parts = blade('copper', 0.0, 0.5, w, th, n=18, seg=34, fuller=-0.35)
    # Olkapää: kaareva kuparivalos terän tyvessä.
    parts.append(bar('copper', -0.034, 0.034, 0.002, 0.01, 0.012, power=2.2, taper=0.45, bend=-0.01))
    prof = [(0.0125, -0.008), (0.012, -0.02), (0.0145, -0.03), (0.012, -0.04), (0.0115, -0.055), (0.0145, -0.065), (0.0115, -0.075),
            (0.0115, -0.09), (0.0145, -0.1), (0.012, -0.11), (0.0105, -0.118)]
    parts.append(lathe_z('copper', prof, n=14, sy=0.8))
    for sx in (-1, 1):
        C = V(sx * 0.027, 0, -0.131)
        pts = [V(0, 0, -0.114), V(sx * 0.006, 0, -0.125)]
        for i in range(21):
            t = i / 20
            th = t * 2.25 * math.pi
            rr = 0.0135 * (1 - 0.7 * t)
            pts.append(C + V(sx * rr * math.cos(math.pi - th), 0, rr * math.sin(math.pi - th)))
        parts.append(tube_path('copper', pts, lambda t: 0.0055 * (1 - 0.5 * t), n=8))
    return parts


@item
def iron_sword():
    # Takouba (tuaregien miekka): pitkä suora kaksiteräinen terä kolmella uralla,
    # lyhyt ristikko, nahkakahva messinkirenkain ja litteä pyöreä ponsi.
    hw = 0.021

    def w(t):
        return hw * (1 - 0.1 * t) * (1 - smooth((t - 0.9) / 0.1) ** 1.3) + 0.0008
    th = lambda t: 0.005 * (1 - 0.5 * t) + 0.0007
    parts = blade('steel', 0.012, 0.73, w, th, n=26, seg=40, grooves=[(-0.42, 0.1, 0.5), (0.0, 0.1, 0.55), (0.42, 0.1, 0.5)])
    parts.append(bar('iron', -0.055, 0.055, 0.004, 0.009, 0.0075, power=3.0, taper=-0.25))
    for sx in (-1, 1):
        parts.append(ball('iron', V(sx * 0.058, 0, 0.004), 0.009, sub=2, sx=0.7, sz=1.3))
    parts += grip(-0.112, -0.004, 0.0132, mat='leather:3a2418', core='hardwood', turns=9)
    for z in (-0.04, -0.075):
        parts.append(cord('brass', ellipse_pts(V(0, 0, z), V(1, 0, 0), V(0, 1, 0), 0.0145, 0.0128, 16), 0.0021))
    parts.append(ball('iron', V(0, 0, -0.124), 0.025, sub=3, sx=1.0, sy=0.42, sz=0.62))
    parts.append(ball('brass', V(0, 0, -0.144), 0.006, sub=1, sz=1.2))
    return parts


@item
def ruby_sword():
    # Kaareva sapeli: tumma teräs ja hehkuva rubiininauha, messinkinen
    # alaspäin kaartuva ristikko, rubiinit ristikossa ja ponnessa.
    L = 0.67
    cv = 0.07

    def w(t):
        return 0.025 * (1 + 0.12 * smooth((t - 0.55) / 0.3)) * (1 - smooth((t - 0.86) / 0.14) ** 1.2) + 0.0008
    th = lambda t: 0.0052 * (1 - 0.5 * t) + 0.0007
    parts = blade('steel:a8a8b0', 0.012, 0.012 + L, w, th, n=18, seg=40, curve=cv)
    parts += ruby_inlay(0.012, L, cv, th, 0.03, 0.82, 0.0068, rise=1.04)
    parts.append(bar('brass', -0.062, 0.062, 0.004, 0.009, 0.007, power=2.6, taper=0.3, bend=-0.02))
    for sx in (-1, 1):
        parts.append(ball('brass', V(sx * 0.064, 0, -0.016), 0.008, sub=2))
    parts.append(ball('ruby', V(0, 0, 0.004), 0.011, sub=1, sx=0.9, sy=1.25, sz=1.0))
    parts += grip(-0.112, -0.004, 0.0132, mat='leather:4a2a20', core='heartwood', turns=9)
    parts.append(lathe_z('brass', [(0.011, -0.112), (0.017, -0.12), (0.016, -0.132), (0.008, -0.138)], n=16, sy=0.8))
    parts.append(ball('ruby', V(0, 0, -0.142), 0.0105, sub=1, sz=1.2))
    return parts


@item
def machete():
    # Leveä, kärjestä levenevä rautaterä, puukahva kahdella niitillä.
    def w(t):
        return 0.017 + 0.012 * smooth(t / 0.85) - 0.03 * smooth((t - 0.86) / 0.14) ** 1.5

    th = lambda t: 0.0035 * (1 - 0.5 * t) + 0.0007
    parts = blade('steel', 0.01, 0.523, w, th, n=16, seg=30, curve=0.012)
    # Siirto: selkä suorana -X-puolella (terä +X:ään).
    for v in parts[0].bm.verts:
        t = (v.co.z - 0.01) / 0.513
        v.co.x += 0.012 + 0.012 * smooth(t / 0.85) - 0.017
    parts += [haft('wood', -0.115, 0.012, 0.0135, 0.0105, bow=0, knob=0.12, taper=-0.05, n=12, seg=10)]
    for z in (-0.07, -0.02):
        parts.append(bar('iron', -0.0005, 0.0005, z, 0.0125, 0.0035, seg=1, power=2))
    return parts


# --- Nuijat ja moukari -------------------------------------------------------------

@item
def stone_mace():
    parts = [haft('wood', -0.16, 0.53, 0.0175, 0.0145, top_swell=0.2, bow=-0.01)]
    parts.append(ball('stone', V(0, 0, 0.515), 0.078, sub=4, sx=1.05, sy=1.0, sz=0.95, noise_amp=0.008, seed=31))
    parts += lashing('rope', 0.46, 0.03, 0.03, 0.03, r=0.0028, loops=3, haft_rx=0.019, haft_ry=0.016)
    return parts


@item
def copper_sledge():
    # Pitkä jalopuuvarsi, iso kuparinuppi (kaksikätinen).
    parts = [haft('hardwood', -0.3, 0.8, 0.019, 0.016, bow=-0.01, knob=0.15)]
    parts.append(wrap('leather', -0.27, 0.0, 0.0193, 0.0163, zb0=-0.3, zb1=0.8, turns=10))
    rings = []
    seg = 20
    for i in range(seg + 1):
        s = i / seg
        x = lerp(-0.145, 0.145, s)
        a = abs(2 * s - 1)
        r = 0.068 * (1 - 0.12 * smooth((a - 0.86) / 0.14)) * (1 - 0.06 * smooth(a / 0.2) * (1 - smooth((a - 0.25) / 0.2)))
        rings.append(ring(V(x, 0, 0.76), V(0, 1, 0), V(0, 0, 1), r * 0.92, r, 20, power=2.0))
    parts.append(loft('copper', rings))
    for x in (-0.06, 0.06):
        parts.append(bar('copper', x - 0.006, x + 0.006, 0.76, 0.072, 0.075, seg=2, power=2.0))
    return parts


@item
def iron_mace():
    # Laipallinen rautanuppi ydinpuuvarressa.
    parts = [haft('heartwood', -0.15, 0.52, 0.0165, 0.014, knob=0.25)]
    parts.append(wrap('leather', -0.12, 0.07, 0.0168, 0.0143, zb0=-0.15, zb1=0.52))
    zc = 0.49
    rings = []
    for i in range(13):
        s = i / 12
        z = lerp(zc - 0.09, zc + 0.09, s)
        r = 0.035 * math.sin(math.pi * lerp(0.15, 0.85, s)) + 0.014
        rings.append(ring(V(0, 0, z), V(1, 0, 0), V(0, 1, 0), r, r, 16))
    parts.append(loft('iron', rings))
    for k in range(7):
        a = 2 * math.pi * k / 7
        d = V(math.cos(a), math.sin(a), 0)
        pts = []
        prof = [(0, -0.075), (0.052, -0.045), (0.058, 0.02), (0.044, 0.07), (0, 0.085)]
        f = Part('iron')
        th = 0.0045
        side = V(-d.y, d.x, 0)
        vs = []
        for sgn in (-1, 1):
            vs.append([f.bm.verts.new(V(0, 0, zc) + d * (r0 + 0.02) + V(0, 0, zz) + side * th * sgn) for r0, zz in prof])
        n = len(prof)
        for j in range(n - 1):
            f.face([vs[0][j], vs[0][j + 1], vs[1][j + 1], vs[1][j]])
        f.face(list(reversed(vs[0])))
        f.face(vs[1])
        for j in range(n - 1):
            pass
        f.bm.normal_update()
        import bmesh
        bmesh.ops.recalc_face_normals(f.bm, faces=f.bm.faces)
        box_uv(f)
        parts.append(f)
    parts.append(ball('steel', V(0, 0, zc + 0.095), 0.016, sub=2, sz=1.4))
    return parts


# --- Keihäät -----------------------------------------------------------------------------

def shaft(mat, z0, z1, r):
    return haft(mat, z0, z1, r, r * 0.92, bow=0, knob=0.05, taper=0.1, n=12, seg=30)


@item
def wooden_spear():
    # Tulessa karkaistu seiväs: kärki hiiltynyt ja teroitettu.
    rings = []
    seg = 40
    for i in range(seg + 1):
        t = i / seg
        z = lerp(-0.45, 1.14, t)
        r = 0.0155 * (1 - 0.15 * t) * (1 - smooth((t - 0.9) / 0.1) ** 0.8) + 0.0006
        rings.append(ring(V(0, 0, z), V(1, 0, 0), V(0, 1, 0), r, r * 0.93, 12))
    k = round(seg * 0.86)
    return [loft('wood', rings[:k + 1], cap1=False), loft('wood:4a3426', rings[k:], cap0=False)]


@item
def spear():
    parts = [shaft('wood', -0.45, 1.0, 0.0155)]
    w = lambda t: 0.028 * math.sin(math.pi * min(1, 0.1 + t * 0.95)) ** 0.8 + 0.001
    th = lambda t: 0.0065 * (1 - 0.6 * t) + 0.0008
    bl = blade('flint', 0.97, 1.199, w, th, n=16, seg=22)[0]
    scallops(bl, 0.0016, 0.008, seed=41)
    parts.append(bl)
    parts += [cord('rope', ellipse_pts(V(0, 0, 0.94 + 0.0045 * i), V(1, 0, 0), V(0, 1, 0), 0.0165, 0.0155, 14), 0.0024) for i in range(7)]
    return parts


@item
def iron_spear():
    # Leveä lehtikärki keskiharjanteella, pitkä holkki messinkirenkain,
    # punainen kuitutupsu, nahkakääre ja rautainen tyvipiikki.
    parts = [shaft('hardwood', -0.43, 1.0, 0.0155)]
    prof = [(0.0172, 0.96), (0.0185, 0.966), (0.0168, 0.972), (0.0158, 1.0), (0.0172, 1.006), (0.0152, 1.012), (0.0128, 1.05), (0.011, 1.065)]
    parts.append(lathe_z('iron', prof, n=14))
    for z in (0.975, 1.03):
        parts.append(cord('brass', ellipse_pts(V(0, 0, z), V(1, 0, 0), V(0, 1, 0), 0.0165 if z < 1 else 0.0145, 0.0165 if z < 1 else 0.0145, 14), 0.0022))
    w = lambda t: 0.034 * math.sin(math.pi * min(1, 0.12 + t * 0.92)) ** 1.1 * (1 - 0.15 * t) + 0.0012
    th = lambda t: 0.0058 * (1 - 0.6 * t) + 0.0008
    parts += blade('steel', 1.055, 1.29, w, th, n=18, seg=26, fuller=-0.4)
    # Tupsu.
    from items_mats import ribbon
    R = rng(91)
    for i in range(14):
        a = 2 * math.pi * i / 14 + R.uniform(-0.1, 0.1)
        d = V(math.cos(a), math.sin(a), 0)
        L = R.uniform(0.07, 0.1)
        pts = [d * 0.016 + V(0, 0, 0.958), d * 0.026 + V(0, 0, 0.958 - L * 0.4), d * 0.034 + V(0, 0, 0.958 - L)]
        parts.append(ribbon('cloth:b02818', pts, lambda t: 0.0055 * (1 - 0.5 * t), thick=0.0008, twist=R.uniform(-1, 1)))
    parts.append(cord('cloth:b02818', ellipse_pts(V(0, 0, 0.955), V(1, 0, 0), V(0, 1, 0), 0.0172, 0.0172, 14), 0.0035))
    parts.append(wrap('leather:4a3020', -0.08, 0.16, 0.0158, 0.0146, turns=8, bow=0))
    parts.append(lathe_z('iron', [(0.0165, -0.4), (0.017, -0.43), (0.012, -0.46), (0.004, -0.5), (0.0008, -0.51)], n=12, cap0=False))
    return parts


# --- Kilvet ------------------------------------------------------------------------------

def disc(mat, R, y0, y1, n=40, z=0.0, dome=0.0):
    """Kiekko XZ-tasossa: etupinta y1 (hieman kupera), takapinta y0."""
    p = Part(mat)
    s = 0.6
    bm = p.bm
    rings_f, rings_b = [], []
    radii = [R * k / 6 for k in range(1, 7)]
    cf = bm.verts.new(V(0, y1 + dome, z))
    cb = bm.verts.new(V(0, y0, z))
    for r in radii:
        f = []
        b = []
        for k in range(n):
            a = 2 * math.pi * k / n
            x, zz = math.cos(a) * r, math.sin(a) * r + z
            f.append(bm.verts.new(V(x, y1 + dome * (1 - (r / R) ** 2), zz)))
            b.append(bm.verts.new(V(x, y0, zz)))
        rings_f.append(f)
        rings_b.append(b)
    uv = lambda v: (v.co.x / s, v.co.z / s)
    for k in range(n):
        k1 = (k + 1) % n
        p.face([cf, rings_f[0][k1], rings_f[0][k]], [uv(cf), uv(rings_f[0][k1]), uv(rings_f[0][k])])
        p.face([cb, rings_b[0][k], rings_b[0][k1]], [uv(cb), uv(rings_b[0][k]), uv(rings_b[0][k1])])
        for i in range(len(radii) - 1):
            a0, a1, b0, b1 = rings_f[i][k], rings_f[i][k1], rings_f[i + 1][k], rings_f[i + 1][k1]
            p.face([a0, a1, b1, b0][::-1], [uv(v) for v in [a0, a1, b1, b0][::-1]])
            a0, a1, b0, b1 = rings_b[i][k], rings_b[i][k1], rings_b[i + 1][k], rings_b[i + 1][k1]
            p.face([a0, a1, b1, b0], [uv(v) for v in [a0, a1, b1, b0]])
        # Reuna
        e0, e1, e2, e3 = rings_f[-1][k], rings_f[-1][k1], rings_b[-1][k1], rings_b[-1][k]
        p.face([e0, e1, e2, e3], [(k / n * 6, 0), ((k + 1) / n * 6, 0), ((k + 1) / n * 6, 0.05), (k / n * 6, 0.05)])
    for f in bm.faces:
        f.smooth = True
    import bmesh
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return p


def rim(mat, R, y, r, n=48):
    return cord(mat, ellipse_pts(V(0, y, 0), V(1, 0, 0), V(0, 0, 1), R, R, n), r, n=8)


def boss(mat, r, y, h):
    rings = []
    for i in range(9):
        t = i / 8
        a = t * math.pi / 2
        rr = r * math.cos(a) + 0.0005
        rings.append(ring(V(0, y + h * math.sin(a), 0), V(1, 0, 0), V(0, 0, -1), rr, rr, 20))
    return loft(mat, rings, cap0=False)


def shield_back(wood, handle_mat='leather', w=0.24, zs=None):
    parts = []
    for z, ww in (zs or ((-0.15, w), (0.15, w))):
        parts.append(bar(wood, -ww, ww, 0, 0.009, 0.018, power=4.0))
        transform(parts[-1], Matrix.Translation(V(0, -0.03, z)))
    parts.append(bar(handle_mat, -0.07, 0.07, 0, 0.011, 0.011, power=2.2, bend=0.0))
    transform(parts[-1], Matrix.Translation(V(0, -0.048, 0)))
    return parts


def planks(mat, R, y0, y1, count=5, gap=0.004):
    out = []
    w = 2 * R / count
    for i in range(count):
        x0 = -R + i * w + gap / 2
        x1 = x0 + w - gap
        p = disc(mat, R, y0, y1, n=40)
        import bmesh
        geom = p.bm.verts[:] + p.bm.edges[:] + p.bm.faces[:]
        res = bmesh.ops.bisect_plane(p.bm, geom=geom, plane_co=V(x0, 0, 0), plane_no=V(-1, 0, 0), clear_outer=True)
        geom = p.bm.verts[:] + p.bm.edges[:] + p.bm.faces[:]
        bmesh.ops.bisect_plane(p.bm, geom=geom, plane_co=V(x1, 0, 0), plane_no=V(1, 0, 0), clear_outer=True)
        bmesh.ops.holes_fill(p.bm, edges=[e for e in p.bm.edges if e.is_boundary], sides=0)
        # Lankut ristiin syihin nähden: syyt pystysuunnassa (UV kierrettynä).
        for f in p.bm.faces:
            for lp in f.loops:
                co = lp.vert.co
                lp[p.uv].uv = (co.z / 0.5 + i * 0.37, co.x / 0.5 + co.y * 2)
            f.smooth = False
        out.append(p)
    return out


@item
def shield():
    R = 0.3
    parts = planks('wood', R, -0.012, 0.012)
    parts.append(rim('rope', R - 0.003, 0.0, 0.013))
    parts.append(boss('wood', 0.06, 0.012, 0.045))
    parts += shield_back('wood', 'rope')
    return parts


def hide_paint(co, n, mat):
    """Lehmäntaljan mustat ja ruskeat laikut valkoisella pohjalla."""
    if not mat.startswith('fur'):
        return None
    from mathutils import noise as _n
    v = _n.noise(Vector((co.x * 5.0 + 3.1, co.z * 4.0 - 1.7, 0.4))) + 0.35 * _n.noise(Vector((co.x * 19, co.z * 17, 2.2)))
    u = _n.noise(Vector((co.x * 5.0 - 7.3, co.z * 4.0 + 2.9, 1.3)))
    if v > 0.02:
        return (0.11, 0.09, 0.08)
    if u > 0.22:
        return (0.42, 0.25, 0.14)
    return (0.95, 0.92, 0.86)


@item(paint=hide_paint, ao_strength=0.7, ao_dist=0.06)
def hide_shield():
    # Korkea soikea taljakilpi: lehmäntalja laikkuineen, pystysuora keppi
    # keskellä ja kaksi riviä nahkanauhoja, joilla talja on punottu keppiin.
    RX, RZ = 0.215, 0.34

    def rfn(a):
        return 1 / math.sqrt((math.cos(a) / RX) ** 2 + (math.sin(a) / RZ) ** 2)
    parts = [shaped_disc('fur', rfn, -0.004, 0.004, n=48, rows=7, bend=0.04, rmax=RX)]
    stick = haft('wood', -0.42, 0.44, 0.0105, 0.0105, bow=0, knob=0.05, taper=0.15, n=10, seg=20)
    transform(stick, Matrix.Translation(V(0, -0.016, 0)))
    parts.append(stick)
    parts.append(ball('fur:2a2018', V(0, -0.016, 0.45), 0.022, sub=2, sx=0.8, sy=0.8, sz=1.3, noise_amp=0.004, seed=3))
    # Kaksi pystyriviä nauhoja, jotka kulkevat taljan rakojen läpi vuorotellen.
    for i in range(13):
        z = lerp(-0.26, 0.26, i / 12)
        for col, sx in enumerate((-1, 1)):
            zz = z + (0.0215 if col else 0.0)
            if abs(zz) > 0.27:
                continue
            b = bar('fur:e8dcc4', sx * 0.022 - 0.015, sx * 0.022 + 0.015, zz, 0.0022, 0.0085, seg=4, n=8, power=3.0)
            transform(b, Matrix.Translation(V(0, 0.0062, 0)))
            parts.append(b)
    # Kahva: kepin keskikohta nahalla kiedottuna.
    parts.append(wrap('leather', -0.07, 0.07, 0.0108, 0.0108, turns=6, bow=0))
    transform(parts[-1], Matrix.Translation(V(0, -0.016, 0)))
    return parts


@item(ao_strength=0.65, ao_dist=0.05)
def copper_shield():
    # Kupera kuparikilpi (pronssikauden mallin mukaan): samankeskiset kohoreunat,
    # pistekuvioiden rivit, kupu keskellä ja rullattu reuna.
    R, dome = 0.29, 0.035
    parts = [shaped_disc('copper', lambda a: R, -0.004, 0.003, n=56, rows=8, dome=dome, rmax=R)]

    def yf(r):
        return 0.003 + dome * (1 - (r / R) ** 2)
    for r in (0.075, 0.115, 0.17, 0.215, 0.255):
        parts.append(cord('copper', ellipse_pts(V(0, yf(r), 0), V(1, 0, 0), V(0, 0, 1), r, r, 48), 0.0034, n=6))
    for r in (0.095, 0.235):
        cnt = int(2 * math.pi * r / 0.026)
        for k in range(cnt):
            a = 2 * math.pi * k / cnt
            parts.append(ball('copper', V(math.cos(a) * r, yf(r), math.sin(a) * r), 0.0042, sub=1, sy=0.55))
    parts.append(cord('copper', ellipse_pts(V(0, 0.0, 0), V(1, 0, 0), V(0, 0, 1), R, R, 64), 0.0075, n=8))
    parts.append(boss('copper', 0.05, yf(0.05) - 0.002, 0.04))
    parts += shield_back('hardwood', w=0.22)
    return parts


@item(ao_strength=0.7, ao_dist=0.06)
def iron_shield():
    # Kolmiokilpi (heater): ydinpuulankut, rautareuna, rautavanteet ristiin,
    # kupu ja niitit.
    W, top, side_bot, tipz = 0.25, 0.3, -0.02, -0.38

    def zb(px):
        """Alareunan korkeus kohdassa x (kaari sivulta kärkeen)."""
        u = min(1.0, abs(px) / W)
        return side_bot + (tipz - side_bot) * (1 - u) ** 1.6

    def rfn(a):
        x, z = math.cos(a), math.sin(a)
        best = 9.0
        if z > 0:
            best = min(best, (top + 0.015 * (1 - x * x)) / z)
        rs = W / abs(x) if abs(x) > 1e-6 else 9.0
        if z >= 0 or rs * z >= side_bot:
            return min(best, rs)
        lo, hi = 0.0, rs
        for _ in range(40):
            m = (lo + hi) / 2
            if m * z - zb(m * x) > 0:
                lo = m
            else:
                hi = m
        return min(best, lo)
    parts = planks_shape('heartwood', rfn, -0.012, 0.012, W)
    sd = shaped_disc('iron', rfn, -0.013, 0.013, n=120, rows=1, rmax=W)
    rimpts = resample_loop([V(p.x * 0.985, 0.0, p.z * 0.985) for p in sd.outline], 96)
    parts.append(cord('iron', rimpts, 0.0145, n=8))
    for ang in (0.0, math.pi / 2):
        if ang == 0.0:
            b = bar('iron', -W + 0.012, W - 0.012, 0.13, 0.004, 0.02, power=4.0, seg=20)
        else:
            b = bar('iron', -0.22, 0.3, 0, 0.004, 0.02, power=4.0, seg=24)
            for v in b.bm.verts:
                x, y, z = v.co
                v.co = V(z, y, x)
            import bmesh
            bmesh.ops.reverse_faces(b.bm, faces=b.bm.faces[:])
        transform(b, Matrix.Translation(V(0, 0.016, 0)))
        parts.append(b)
    parts.append(boss('iron', 0.065, 0.012, 0.05))
    transform(parts[-1], Matrix.Translation(V(0, 0, 0.0)))
    for p in resample_loop(sd.outline, 26):
        parts.append(ball('steel', V(p.x * 0.91, 0.016, p.z * 0.91), 0.0065, sub=1, sy=0.6))
    parts += shield_back('heartwood', zs=((0.15, 0.2), (-0.08, 0.15)))
    return parts


def resample_loop(pts, n):
    """Suljetun pistejonon tasavälinen uudelleennäytteistys (kaarenpituuden mukaan)."""
    m = len(pts)
    seg = [(pts[(i + 1) % m] - pts[i]).length for i in range(m)]
    total = sum(seg)
    out, i, acc = [], 0, 0.0
    for k in range(n):
        target = total * k / n
        while acc + seg[i] < target:
            acc += seg[i]
            i += 1
        f = (target - acc) / max(1e-9, seg[i])
        out.append(pts[i].lerp(pts[(i + 1) % m], f))
    return out


def planks_shape(mat, rfn, y0, y1, W, count=5, gap=0.004):
    """Lankut annetun ääriviivan sisällä (pystysyyt)."""
    import bmesh
    out = []
    w = 2 * W / count
    for i in range(count):
        x0 = -W + i * w + gap / 2
        x1 = x0 + w - gap
        p = shaped_disc(mat, rfn, y0, y1, n=120, rows=5, rmax=W)
        geom = p.bm.verts[:] + p.bm.edges[:] + p.bm.faces[:]
        bmesh.ops.bisect_plane(p.bm, geom=geom, plane_co=V(x0, 0, 0), plane_no=V(-1, 0, 0), clear_outer=True)
        geom = p.bm.verts[:] + p.bm.edges[:] + p.bm.faces[:]
        bmesh.ops.bisect_plane(p.bm, geom=geom, plane_co=V(x1, 0, 0), plane_no=V(1, 0, 0), clear_outer=True)
        bmesh.ops.holes_fill(p.bm, edges=[e for e in p.bm.edges if e.is_boundary], sides=0)
        for f in p.bm.faces:
            for lp in f.loops:
                co = lp.vert.co
                lp[p.uv].uv = (co.z / 0.5 + i * 0.37, co.x / 0.5 + co.y * 2)
            f.smooth = False
        out.append(p)
    return out
