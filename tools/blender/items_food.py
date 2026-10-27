# Sessio 54: ruoat ja rohdot. Väri ja kuviot verteksiväreissä (paint),
# astiat ja luut materiaalikirjastosta.
import math
import bmesh
from itemlib import V, Vector, Matrix, smooth, lerp, ring, loft, transform, displace, box_uv, Part, rng
from registry import item
from shapes import tube_path, cord, ellipse_pts
from paint import hexc, mixc, mulc, nz, spots, smoothstep
from items_mats import bowl, fill, ribbon, endcap
from items_weapons import ball


def lathe(mat, prof, n=20, c=V(0, 0, 0), wob=0.0, seed=0, cap0=True, cap1=True):
    """Pyörähdyskappale profiilista [(r, z), ...] (alhaalta ylös)."""
    rings = []
    for i, (r, z) in enumerate(prof):
        pts = []
        for k in range(n):
            a = 2 * math.pi * k / n
            w = 1 + wob * math.sin(a * 3 + seed + i * 0.7) * min(1, r / 0.01)
            pts.append(c + V(math.cos(a) * r * w, math.sin(a) * r * w, z))
        rings.append(pts)
    return loft(mat, rings, cap0=cap0, cap1=cap1)


# --- Sienet -------------------------------------------------------------------------------

def mushroom(c, cap_r, cap_h, stem_r, stem_h, tilt=0.0, seed=0, umbo=0.0, gills=True):
    parts = []
    prof = [(stem_r * 1.15, 0), (stem_r, stem_h * 0.2), (stem_r * 0.9, stem_h * 0.7), (stem_r * 0.85, stem_h)]
    parts.append(lathe('cap', prof, n=14, c=c, cap1=False))
    # Lakki: alapinta (heltat) ja kupera yläpinta.
    cp = []
    for i in range(10):
        t = i / 9
        a = t * math.pi / 2
        r = cap_r * math.cos(a) + 0.001
        z = stem_h + cap_h * math.sin(a) + umbo * smoothstep(0.7, 1.0, t) * cap_h
        cp.append((r, z))
    under = [(stem_r * 0.85, stem_h - 0.002), (cap_r * 0.6, stem_h - cap_h * 0.05), (cap_r, stem_h + cap_h * 0.05)]
    p = lathe('cap', under + cp, n=28, c=c, wob=0.04, seed=seed, cap0=False)
    if gills:
        for v in p.bm.verts:
            d = v.co - c
            if v.co.z < stem_h + cap_h * 0.06:
                a = math.atan2(d.y, d.x)
                v.co.z += 0.0015 * abs(math.sin(a * 22))
    parts.append(p)
    if tilt:
        rot = Matrix.Translation(c) @ Matrix.Rotation(tilt, 4, 'X') @ Matrix.Translation(-c)
        for q in parts:
            transform(q, rot)
    return parts


def mush_paint(cap, edge, stem, gill, spot=None, umbo_col=None, char=0.0):
    C, E, S, G = hexc(cap), hexc(edge), hexc(stem), hexc(gill)
    W = hexc(spot) if spot else None
    U = hexc(umbo_col) if umbo_col else None

    def f(co, n, mat):
        if mat != 'cap':
            return None
        if n.z < -0.3 and co.z > 0.02:
            col = G
        elif n.z > 0.15:
            r = math.hypot(co.x, co.y)
            col = mixc(C, E, smoothstep(0.02, 0.05, r))
            if U:
                col = mixc(col, U, 1 - smoothstep(0.004, 0.015, r))
            if W and spots(co, 60, 3, 0.22) > 0:
                col = W
            col = mulc(col, 0.88 + 0.2 * nz(co, 70))
        else:
            col = mulc(S, 0.9 + 0.15 * nz(co, 90))
        if char:
            col = mixc(col, hexc(0x2a160a), char * nz(co, 40, 4))
        return col
    return f


@item(paint=mush_paint(0x6e4224, 0xa47a50, 0xe2d6bc, 0xc8b08a), ao_strength=0.7)
def mushroom_brown():
    return mushroom(V(0, 0, 0), 0.05, 0.035, 0.011, 0.06, seed=1) + mushroom(V(0.03, 0.022, 0), 0.026, 0.02, 0.007, 0.035, tilt=0.3, seed=2)


@item(paint=mush_paint(0xeae0c8, 0xd8ccb0, 0xf2ece0, 0xd8d0bc), ao_strength=0.7)
def mushroom_pale():
    return mushroom(V(0, 0, 0), 0.045, 0.03, 0.009, 0.065, seed=3) + mushroom(V(-0.03, 0.018, 0), 0.028, 0.018, 0.006, 0.04, tilt=-0.35, seed=4)


@item(paint=mush_paint(0xc0201a, 0xd8401a, 0xf2ece0, 0xf0e8d8, spot=0xf6f0e4), ao_strength=0.7)
def mushroom_red():
    return mushroom(V(0, 0, 0), 0.052, 0.04, 0.011, 0.065, seed=5)


@item(paint=mush_paint(0x8a7a66, 0xc8b8a0, 0xf0e8dc, 0xe0d4c0, umbo_col=0x3a2a1c), ao_strength=0.7)
def mushroom_termite():
    return mushroom(V(0, 0, 0), 0.05, 0.02, 0.009, 0.17, umbo=0.9, seed=6) + mushroom(V(0.028, -0.02, 0), 0.03, 0.012, 0.006, 0.11, tilt=0.25, umbo=0.9, seed=7)


@item(paint=mush_paint(0x5a3418, 0x7a4a24, 0xa8865a, 0x8a6a44, char=0.5), ao_strength=0.7)
def roasted_mushroom():
    # Paahdetut sienet vartaassa (varras = risu).
    parts = [tube_path('bark', [V(0, 0, z) for z in (-0.12, 0.0, 0.08, 0.16)], lambda t: 0.005 * (1 - 0.6 * t) + 0.001, n=8)]
    for z, r, s in ((0.02, 0.034, 1), (0.085, 0.03, 2)):
        m = mushroom(V(0, 0, 0), r, r * 0.7, r * 0.25, r * 0.5, seed=s, gills=False)
        rot = Matrix.Translation(V(0, 0, z)) @ Matrix.Rotation(math.pi / 2, 4, 'Y') @ Matrix.Translation(V(0, 0, -r * 0.6))
        for q in m:
            transform(q, rot)
        parts += m
    return parts


# --- Liha ----------------------------------------------------------------------------------

def meat_shape(seed):
    # Lihapala: pyöristetty, epäsäännöllinen möhkäle (Blender X pituus, Y leveys, Z korkeus).
    import bpy
    from itemlib import from_object
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=4, radius=1)
    p = from_object('flesh', bpy.context.active_object)
    transform(p, Matrix.Diagonal((0.1, 0.068, 0.048, 1)))
    displace(p, 0.01, 12, seed=seed)
    for v in p.bm.verts:
        if v.co.z < -0.03:
            v.co.z = -0.03 + (v.co.z + 0.03) * 0.2
    transform(p, Matrix.Translation(V(-0.012, 0, 0.05)))
    box_uv(p, 0.1)
    for f in p.bm.faces:
        f.smooth = True
    return p


def meat_bone():
    rings = []
    for i in range(9):
        t = i / 8
        x = lerp(0.04, 0.115, t)
        r = 0.011 + 0.008 * smoothstep(0.75, 1.0, t)
        rings.append(ring(V(x, 0, 0.045 + 0.01 * t), V(0, 1, 0), V(0, 0, 1), r, r, 12))
    parts = [loft('bone', rings)]
    parts.append(ball('bone', V(0.118, 0.008, 0.056), 0.012, sub=2))
    parts.append(ball('bone', V(0.118, -0.009, 0.054), 0.011, sub=2))
    return parts


def raw_paint(co, n, mat):
    if mat != 'flesh':
        return None
    fat = smoothstep(0.66, 0.72, nz(V(co.x * 0.6, co.y, co.z * 2.5), 35, 2))
    cap = smoothstep(0.045, 0.06, -co.y + 0.008 * nz(co, 30))
    base = mixc(hexc(0xa82a24), hexc(0x6a1410), nz(co, 25))
    return mixc(base, hexc(0xf0e2d0), max(fat * 0.75, cap * 0.85))


def cooked_paint(co, n, mat):
    if mat != 'flesh':
        return None
    base = mixc(hexc(0x8a4a22), hexc(0x4a2410), nz(co, 22))
    grill = 1 if (co.x * 60 + co.y * 30) % 3 < 0.35 and n.z > 0.5 else 0
    base = mixc(base, hexc(0x1a0c06), grill * 0.85 + 0.3 * smoothstep(0.6, 0.8, nz(co, 50, 3)))
    return base


@item(paint=raw_paint)
def raw_meat():
    return [meat_shape(3)] + meat_bone()


@item(paint=cooked_paint)
def cooked_meat():
    p = meat_shape(4)
    transform(p, Matrix.Diagonal((0.96, 0.96, 0.88, 1)))
    return [p] + meat_bone()


# --- Hedelmät ja pähkinät ----------------------------------------------------------------------

def fruit_paint(spec):
    def f(co, n, mat):
        if mat not in spec:
            return None
        return spec[mat](co, n)
    return f


def jujube_skin(co, n):
    return mixc(hexc(0x8a2a14), hexc(0xb8642a), nz(co, 60) * 0.7 + 0.15 * smoothstep(0.0, 1.0, n.z))


def leaf_col(co, n):
    return mulc(mixc(hexc(0x4a7a2a), hexc(0x6a9a3a), nz(co, 30)), 0.9 + 0.2 * nz(co, 120))


@item(paint=fruit_paint({'skin': jujube_skin, 'plant': leaf_col}), ao_strength=0.7)
def jujube():
    R = rng(21)
    parts = [tube_path('bark', [V(-0.04, 0.0, 0.11), V(0.0, 0.0, 0.1), V(0.04, 0.0, 0.075), V(0.06, 0, 0.05)], lambda t: 0.0025, n=6)]
    for i in range(7):
        c = V(R.uniform(-0.035, 0.05), R.uniform(-0.03, 0.03), R.uniform(0.015, 0.06))
        parts.append(ball('skin', c, 0.016, sub=3, sz=1.25))
    for a in (0.6, -0.8):
        pts = [V(-0.01 + 0.06 * u * math.cos(a), 0.06 * u * math.sin(a), 0.1 + 0.01 * u) for u in [k / 6 for k in range(7)]]
        parts.append(ribbon('plant', pts, lambda s: 0.012 * math.sin(math.pi * min(1, 0.1 + s)) + 0.0005, thick=0.0006, up=V(0, 0, 1)))
    return parts


def banana_skin(co, n):
    t = (co.z + 0.032) / 0.253
    col = mixc(hexc(0xe8c838), hexc(0x8aa040), smoothstep(0.85, 1.0, t) + 0.6 * (1 - smoothstep(0.0, 0.08, t)))
    if t > 0.95 or t < 0.04:
        col = mixc(col, hexc(0x3a2a18), 0.7)
    sp = spots(co, 90, 7, 0.12)
    return mixc(col, hexc(0x4a3018), sp * 0.8)


@item(paint=fruit_paint({'skin': banana_skin}), ao_strength=0.6)
def banana():
    # Kaareva banaani, viisikulmainen poikkileikkaus.
    rings = []
    seg = 22
    for i in range(seg + 1):
        t = i / seg
        a = lerp(-0.5, 0.6, t)
        cx = 0.03 + 0.12 * (math.cos(a) - math.cos(0.0)) * -1 + 0.0
        x = 0.06 * math.sin(math.pi * t) * 0.8
        z = lerp(-0.032, 0.221, t)
        r = 0.019 * math.sin(math.pi * min(1, 0.06 + t * 0.92)) ** 0.55 + 0.003
        if t > 0.92:
            r = 0.0045
        pts = []
        for k in range(20):
            ang = 2 * math.pi * k / 20
            rr = r * (1 - 0.08 * abs(math.cos(ang * 2.5)))
            pts.append(V(x + math.cos(ang) * rr, math.sin(ang) * rr, z))
        rings.append(pts)
    return [loft('skin', rings)]


def husk(co, n):
    eyes = 0
    for a in (0, 2.1, 4.2):
        e = V(math.cos(a) * 0.022, math.sin(a) * 0.022, 0.175)
        eyes = max(eyes, 1 - (co - e).length / 0.012)
    return mixc(mulc(hexc(0x6a4024), 0.85 + 0.3 * nz(co, 40)), hexc(0x1e120a), max(0, eyes))


@item(paint=fruit_paint({'fur': husk}), ao_strength=0.7)
def coconut():
    prof = [(0.001, -0.008), (0.05, -0.0), (0.08, 0.04), (0.09, 0.09), (0.08, 0.14), (0.05, 0.175), (0.02, 0.188), (0.001, 0.19)]
    p = lathe('fur', prof, n=28)
    displace(p, 0.004, 20, seed=2)
    return [p]


def baobab_skin(co, n):
    return mulc(mixc(hexc(0x8a9468), hexc(0x6a7a50), nz(co, 25)), 0.85 + 0.25 * nz(co, 150, 2))


@item(paint=fruit_paint({'skin': baobab_skin}), ao_strength=0.6)
def baobab_fruit():
    prof = [(0.002, 0.0), (0.03, 0.01), (0.048, 0.05), (0.054, 0.11), (0.05, 0.17), (0.04, 0.21), (0.02, 0.235), (0.006, 0.24)]
    p = lathe('skin', prof, n=24, wob=0.05, seed=3)
    transform(p, Matrix.Diagonal((1.0, 0.92, 1.0, 1)))
    stalk = tube_path('bark', [V(0, 0, 0.236), V(0.003, 0, 0.255), V(0.01, 0, 0.271)], lambda t: 0.004, n=6)
    return [p, stalk]


def nut_paint(dark):
    def f(co, n, mat):
        if mat != 'skin':
            return None
        base = hexc(0x3a2210 if dark else 0x8a5a30)
        scar = spots(co, 40, 9, 0.3)
        col = mulc(base, 0.85 + 0.3 * nz(co, 60))
        return mixc(col, hexc(0xc8a878 if not dark else 0x6a4a2a), scar * 0.8)
    return f


def nuts(seed):
    R = rng(seed)
    parts = []
    for i in range(5):
        c = V(R.uniform(-0.04, 0.025), R.uniform(-0.03, 0.03), 0.02 + R.uniform(0, 0.02))
        b = ball('skin', V(0, 0, 0), 0.02, sub=3, sx=1.3, sy=1.0, sz=0.95)
        transform(b, Matrix.Translation(c) @ Matrix.Rotation(R.uniform(0, 6), 4, 'Z'))
        parts.append(b)
    return parts


@item(paint=nut_paint(False), ao_strength=0.7)
def shea_nuts():
    return nuts(84)


@item(paint=nut_paint(True), ao_strength=0.7)
def roasted_nuts():
    return nuts(105)


@item(paint=fruit_paint({'plant': leaf_col}), ao_strength=0.5)
def moringa():
    # Varsi ja parilliset pienet lehdykät.
    parts = [tube_path('plant', [V(0.005 * math.sin(t * 3), 0, lerp(-0.06, 0.22, t)) for t in [k / 10 for k in range(11)]], lambda t: 0.002, n=5)]
    for i in range(9):
        z = lerp(-0.02, 0.2, i / 8)
        for side in (-1, 1):
            c = V(side * 0.016, 0, z + 0.008)
            leaf = ball('plant', c, 0.011, sub=2, sx=1.1, sy=0.12, sz=0.7)
            parts.append(leaf)
    return parts


def calyx(co, n):
    return mulc(mixc(hexc(0x8a0a1a), hexc(0xc0202a), nz(co, 40)), 0.85 + 0.25 * nz(co, 120))


@item(paint=fruit_paint({'skin': calyx}), ao_strength=0.6)
def hibiscus():
    R = rng(31)
    parts = []
    for i, c in enumerate((V(0, 0, 0.0), V(0.03, 0.02, 0.0), V(-0.025, 0.025, 0.0))):
        for k in range(5):
            a = 2 * math.pi * k / 5 + i
            q = ball('skin', V(0, 0, 0), 0.012, sub=2, sx=0.7, sy=0.35, sz=1.8)
            transform(q, Matrix.Translation(c + V(math.cos(a) * 0.008, math.sin(a) * 0.008, 0.025)) @ Matrix.Rotation(a, 4, 'Z') @ Matrix.Rotation(0.35, 4, 'Y'))
            parts.append(q)
        parts.append(ball('skin', c + V(0, 0, 0.012), 0.012, sub=2, sz=0.9))
    return parts


def grain(co, n):
    return mulc(mixc(hexc(0xc8a858), hexc(0x9a7a3a), nz(co, 80)), 0.9 + 0.2 * nz(co, 300))


@item(paint=fruit_paint({'straw': grain}), ao_strength=0.6)
def fonio():
    R = rng(41)
    parts = []
    for i in range(16):
        a = R.uniform(0, 6.28)
        top = V(math.cos(a) * R.uniform(0.01, 0.05), math.sin(a) * R.uniform(0.01, 0.05), 0.38 + R.uniform(0, 0.05))
        path = [V(0, 0, -0.08).lerp(top, t) + V(0, 0, 0) for t in [k / 6 for k in range(7)]]
        parts.append(tube_path('straw', path, lambda t: 0.0016, n=4))
        for j in range(3):
            d = V(math.cos(a + j * 2.1), math.sin(a + j * 2.1), 0) * 0.025
            pan = [top + (d * u) + V(0, 0, -0.03 * u * u) for u in [k / 4 for k in range(5)]]
            parts.append(tube_path('straw', pan, lambda t: 0.0022 * (1 - 0.5 * t), n=4))
    for z in (0.05, 0.07):
        parts.append(cord('rope', ellipse_pts(V(0, 0, z), V(1, 0, 0), V(0, 1, 0), 0.016, 0.016, 12), 0.0022))
    return parts


# --- Ateriat ja juomat -------------------------------------------------------------------------

def porridge_col(co, n, mat):
    if mat == 'paste':
        return mulc(mixc(hexc(0xe8d4a8), hexc(0xd0b07a), nz(co, 50)), 0.92 + 0.12 * nz(co, 200))
    return None


@item(paint=porridge_col)
def fonio_porridge():
    parts = bowl('wood', 0.108, 0.07, 0.007)
    parts.append(fill('paste', 0.098, 0.06, dome=0.014, swirl=0.003))
    return parts


def stew_col(co, n, mat):
    if mat == 'liquid':
        base = mixc(hexc(0x6a3418), hexc(0x8a4a20), nz(co, 30))
        return base
    if mat == 'flesh':
        return mixc(hexc(0x6a3418), hexc(0x4a2210), nz(co, 60))
    if mat == 'plant':
        return hexc(0x3a6a22)
    if mat == 'cap':
        return hexc(0xb8946a)
    return None


@item(paint=stew_col)
def meat_stew():
    R = rng(51)
    prof = [(0.06, 0.0), (0.09, 0.02), (0.104, 0.045), (0.098, 0.07), (0.1, 0.08), (0.094, 0.08), (0.09, 0.065), (0.086, 0.04), (0.06, 0.015), (0.001, 0.012)]
    parts = [lathe('clay', prof, n=28)]
    parts.append(fill('liquid', 0.09, 0.06, dome=0.002, swirl=0.002))
    for i in range(7):
        c = V(R.uniform(-0.05, 0.05), R.uniform(-0.05, 0.05), 0.062)
        parts.append(ball(R.choice(['flesh', 'flesh', 'cap']), c, R.uniform(0.01, 0.016), sub=2, sz=0.6, noise_amp=0.002, seed=i))
    for i in range(5):
        c = V(R.uniform(-0.06, 0.06), R.uniform(-0.06, 0.06), 0.063)
        parts.append(ball('plant', c, 0.007, sub=1, sz=0.2))
    return parts


def gourd_col(co, n, mat):
    if mat == 'skin':
        return mulc(mixc(hexc(0xc8a060), hexc(0x9a7038), nz(co, 30)), 0.85 + 0.25 * nz(co, 120, 3))
    if mat == 'liquid':
        return hexc(0x3a0610)
    return None


@item(paint=gourd_col)
def bissap():
    # Kalebassikuppi täynnä tummanpunaista hibiskusjuomaa.
    prof = [(0.001, 0.0), (0.03, 0.002), (0.05, 0.02), (0.058, 0.05), (0.055, 0.085), (0.052, 0.095), (0.048, 0.095), (0.05, 0.08), (0.052, 0.05), (0.044, 0.02), (0.001, 0.008)]
    parts = [lathe('skin', prof, n=26, cap0=True, cap1=True)]
    parts.append(fill('liquid', 0.051, 0.082, dome=0.0))
    return parts


@item(paint=gourd_col)
def herbal_remedy():
    # Pieni pullokurpitsa, puutulppa ja nyöri.
    prof = [(0.001, 0.0), (0.03, 0.004), (0.05, 0.03), (0.055, 0.06), (0.045, 0.09), (0.022, 0.115), (0.016, 0.135), (0.018, 0.15), (0.016, 0.155)]
    parts = [lathe('skin', prof, n=24, cap1=False)]
    parts.append(lathe('wood', [(0.0135, 0.14), (0.016, 0.16), (0.017, 0.175), (0.001, 0.18)], n=12))
    parts.append(cord('rope', ellipse_pts(V(0, 0, 0.128), V(1, 0, 0), V(0, 1, 0), 0.0175, 0.0175, 12), 0.0022))
    return parts


def salve_col(co, n, mat):
    if mat == 'paste':
        return mulc(hexc(0xf2e2b8), 0.95 + 0.08 * nz(co, 80))
    return None


@item(paint=salve_col)
def shea_salve():
    prof = [(0.001, 0.0), (0.04, 0.0), (0.05, 0.012), (0.052, 0.035), (0.048, 0.05), (0.05, 0.056), (0.045, 0.056), (0.043, 0.045), (0.042, 0.015), (0.001, 0.01)]
    parts = [lathe('clay', prof, n=26)]
    parts.append(fill('paste', 0.043, 0.048, dome=0.01, swirl=0.002))
    return parts
