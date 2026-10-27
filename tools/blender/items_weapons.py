# Sessio 54: aseet (tikarit, miekat, viidakkoveitsi, nuijat, moukari, keihäät, kilvet).
# Kahva origossa, terä +Z (pelissä +Y). Kilvet XZ-tasossa, etupuoli +Y
# (pelissä -Z, kuten vanhassa mallissa: kupu edessä, kahva takana).
import math
import bpy
from itemlib import V, Vector, Matrix, smooth, lerp, ring, loft, transform, displace, box_uv, from_object, Part, rng
from registry import item
from shapes import haft, wrap, blade, scallops, lashing, cord, ellipse_pts


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


@item
def ruby_dagger():
    w = lambda t: 0.02 * (1 - t ** 1.6) + 0.001
    th = lambda t: 0.006 * (1 - 0.6 * t) + 0.0008
    parts = blade('ruby', 0.05, 0.3, w, th, n=8, seg=6, power=1.0)
    parts += grip(-0.075, 0.042, 0.0125, mat='leather', core='heartwood')
    parts.append(bar('iron', -0.026, 0.026, 0.047, 0.009, 0.006, power=2.4, taper=0.3))
    parts.append(ball('ruby', V(0, 0, -0.082), 0.014, sub=1))
    for f in parts[0].bm.faces:
        f.smooth = False
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
    # Lyhyt, leveä lehtiterä (pronssikauden malli).
    return sword('copper', 'copper', 0.012, 0.03, 0.51, 0.006, 0.04, fuller=0.0, leaf=0.25, tip=0.18)


@item
def iron_sword():
    return sword('steel', 'iron', 0.012, 0.024, 0.69, 0.0052, 0.075, fuller=0.5)


@item
def ruby_sword():
    # Kapea, punaisena hehkuva terä (rubiini), rautaväistin.
    return sword('ruby', 'iron', 0.012, 0.018, 0.67, 0.005, 0.06, fuller=0.0, tip=0.15)


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
    parts = [shaft('hardwood', -0.45, 1.02, 0.0155)]
    # Kartiomainen holkki ja pitkä lehtimäinen kärki.
    rings = []
    for i in range(9):
        t = i / 8
        z = lerp(0.98, 1.06, t)
        r = lerp(0.0175, 0.011, t)
        rings.append(ring(V(0, 0, z), V(1, 0, 0), V(0, 1, 0), r, r, 14))
    parts.append(loft('iron', rings))
    w = lambda t: 0.024 * math.sin(math.pi * min(1, 0.18 + t * 0.9)) ** 0.9 + 0.0012
    th = lambda t: 0.0055 * (1 - 0.6 * t) + 0.0008
    parts += blade('steel', 1.055, 1.244, w, th, n=16, seg=22)
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


def shield_back(wood, handle_mat='leather'):
    parts = []
    for z in (-0.15, 0.15):
        parts.append(bar(wood, -0.24, 0.24, 0, 0.009, 0.018, power=4.0))
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


@item
def hide_shield():
    R = 0.298
    parts = [disc('fur:9a7650', R, -0.006, 0.014, dome=0.02)]
    parts.append(rim('leather', R - 0.004, 0.004, 0.012))
    parts.append(boss('leather', 0.055, 0.03, 0.03))
    for k in range(16):
        a = 2 * math.pi * k / 16
        parts.append(ball('rope', V(math.cos(a) * (R - 0.02), 0.022, math.sin(a) * (R - 0.02)), 0.006, sub=1, sy=0.5))
    parts += shield_back('wood')
    return parts


@item
def copper_shield():
    R = 0.302
    parts = planks('hardwood', R, -0.012, 0.012)
    parts.append(rim('copper', R - 0.004, 0.0, 0.014))
    parts.append(boss('copper', 0.07, 0.012, 0.055))
    for k in range(12):
        a = 2 * math.pi * k / 12
        parts.append(ball('copper', V(math.cos(a) * (R - 0.03), 0.013, math.sin(a) * (R - 0.03)), 0.007, sub=1, sy=0.6))
    parts += shield_back('hardwood')
    return parts


@item
def iron_shield():
    R = 0.322
    parts = planks('heartwood', R, -0.012, 0.012)
    parts.append(rim('iron', R - 0.004, 0.0, 0.016))
    parts.append(boss('iron', 0.075, 0.012, 0.058))
    # Kaksi rautavannetta ristiin.
    for ang in (0.0, math.pi / 2):
        b = bar('iron', -R + 0.01, R - 0.01, 0, 0.004, 0.022, power=4.0, seg=24)
        for v in b.bm.verts:
            x, y, z = v.co
            v.co = V(x * math.cos(ang), y + 0.016, x * math.sin(ang) + z * math.cos(ang))
        parts.append(b)
    for k in range(16):
        a = 2 * math.pi * k / 16
        parts.append(ball('iron', V(math.cos(a) * (R - 0.028), 0.014, math.sin(a) * (R - 0.028)), 0.0075, sub=1, sy=0.6))
    parts += shield_back('heartwood')
    return parts
