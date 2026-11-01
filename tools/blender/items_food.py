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
    # Vartaassa kolme paahdettua sientä pystyssä kuin kebab; teroitettu varras.
    parts = [tube_path('bark', [V(0, 0, z) for z in (-0.12, 0.0, 0.1, 0.17, 0.2)], lambda t: 0.0045 * (1 - smooth((t - 0.8) / 0.2)) + 0.0006, n=8)]
    for i, (z, r, tilt) in enumerate(((-0.005, 0.03, 0.12), (0.052, 0.034, -0.1), (0.112, 0.028, 0.18))):
        m = mushroom(V(0, 0, 0), r, r * 0.62, r * 0.32, r * 0.55, seed=i + 1, gills=True)
        rot = Matrix.Translation(V(0, 0, z)) @ Matrix.Rotation(tilt, 4, 'X') @ Matrix.Rotation(i * 1.7, 4, 'Z')
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
    # Syvänpunainen liha, ohuet marmoroinnin juovat ja rasvareunus toisella sivulla.
    w = V(co.x * 1.0 + 0.012 * nz(co, 20, 5), co.y, co.z)
    streak = abs(math.sin(w.x * 70 + nz(co, 14, 6) * 6 + w.y * 25))
    marb = (1 - smoothstep(0.0, 0.12, streak)) * smoothstep(0.45, 0.7, nz(co, 18, 7))
    cap = smoothstep(0.063, 0.071, -co.y + 0.005 * nz(co, 30))
    base = mixc(hexc(0x7a1a18), hexc(0x480a0a), nz(co, 22))
    base = mulc(base, 0.88 + 0.22 * nz(co, 90, 3))
    return mixc(base, hexc(0xe8d6b8), max(marb * 0.75, cap * 0.85))


def cooked_paint(co, n, mat):
    if mat != 'flesh':
        return None
    base = mixc(hexc(0x8a4a22), hexc(0x4a2410), nz(co, 22))
    grill = 1 if (co.x * 60 + co.y * 30) % 3 < 0.35 and n.z > 0.5 else 0
    base = mixc(base, hexc(0x1a0c06), grill * 0.85 + 0.3 * smoothstep(0.6, 0.8, nz(co, 50, 3)))
    return base


@item(paint=raw_paint, ao_strength=0.65)
def raw_meat():
    p = meat_shape(3)
    transform(p, Matrix.Diagonal((1.05, 1.05, 0.8, 1)))
    return [p] + meat_bone()


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
        e = V(math.cos(a) * 0.02, math.sin(a) * 0.02, 0.193)
        eyes = max(eyes, 1 - (co - e).length / 0.011)
    return mixc(mulc(hexc(0x6a4024), 0.85 + 0.3 * nz(co, 40)), hexc(0x1e120a), max(0, eyes))


@item(paint=fruit_paint({'fur': husk}), ao_strength=0.7)
def coconut():
    # Kuorittu kookospähkinä: pyöreä, kärjestä hieman suippo, pituussuuntaiset
    # kuituharjanteet ja kolme "silmää" päässä.
    prof = []
    for i in range(17):
        t = i / 16
        a = math.pi * t
        r = 0.088 * math.sin(a) ** 0.85 * (1 - 0.1 * t) + 0.0008
        z = 0.095 - 0.095 * math.cos(a) * (1 + 0.06 * t)
        prof.append((r, z))
    p = lathe('fur', prof, n=40)
    for v in p.bm.verts:
        ang = math.atan2(v.co.y, v.co.x)
        rr = math.hypot(v.co.x, v.co.y)
        if rr > 0.01:
            k = 1 + 0.035 * abs(math.sin(ang * 1.5)) ** 4 + 0.012 * math.sin(ang * 23 + v.co.z * 40)
            v.co.x *= k
            v.co.y *= k
    displace(p, 0.0025, 30, seed=2)
    for f in p.bm.faces:
        f.smooth = True
    return [p]


def baobab_skin(co, n):
    # Sessio 56: samettinen, kellanvihreä-ruskea karvapinta, tummia laikkuja.
    base = mixc(hexc(0xa8a070), hexc(0x7a7a4a), nz(co, 22))
    base = mixc(base, hexc(0x8a6a3a), smoothstep(0.6, 0.8, nz(co, 12, 4)) * 0.5)
    return mulc(base, 0.82 + 0.3 * nz(co, 260, 2, octaves=1))


@item(paint=fruit_paint({'skin': baobab_skin}), ao_strength=0.6)
def baobab_fruit():
    # Sessio 56: pitkulainen, epäsymmetrinen ja kyhmyinen kota pitkän,
    # kaartuvan perän päässä (baobabin hedelmät riippuvat pitkissä varsissa).
    prof = [(0.002, 0.0), (0.026, 0.008), (0.044, 0.04), (0.052, 0.09), (0.053, 0.14), (0.048, 0.185), (0.036, 0.22), (0.018, 0.242), (0.007, 0.25)]
    p = lathe('skin', prof, n=28, wob=0.06, seed=3)
    for v in p.bm.verts:
        bend = 0.012 * math.sin(v.co.z / 0.25 * math.pi)
        v.co.x += bend + 0.004 * math.sin(v.co.z * 70 + 1)
    transform(p, Matrix.Diagonal((1.0, 0.9, 1.0, 1)))
    displace(p, 0.003, 22, seed=5)
    for f in p.bm.faces:
        f.smooth = True
    stalk = tube_path('bark', [V(0, 0, 0.245), V(0.004, 0, 0.27), V(0.014, 0.002, 0.3), V(0.03, 0.004, 0.322), V(0.05, 0.004, 0.33)], lambda t: 0.0045 * (1 - 0.3 * t), n=7)
    calyx = lathe('bark', [(0.012, 0.236), (0.01, 0.248), (0.005, 0.252)], n=10)
    return [p, stalk, calyx]


NUTS = []


def nut_paint(dark):
    # Sessio 56: karitepähkinä: kiiltävän ruskea kuori, toisella kyljellä
    # iso vaalea napa-arpi. Paahdetuissa kuori tummempi ja paikoin haljennut.
    def f(co, n, mat):
        if mat == 'paste':
            return mixc(hexc(0xd8c49a), hexc(0xb89a6a), nz(co, 80))
        if mat != 'skin':
            return None
        c, ax, sd = min(NUTS, key=lambda q: (Vector(co) - q[0]).length)
        loc = (Vector(co) - c).normalized()
        scar = smoothstep(0.55, 0.75, loc.dot(sd) + 0.08 * nz(co, 120))
        base = hexc(0x2e1a0e if dark else 0x7a4a26)
        col = mulc(mixc(base, hexc(0x4a2a14 if dark else 0x9a6232), nz(co, 50) * 0.6), 0.85 + 0.3 * nz(co, 180, 3))
        return mixc(col, hexc(0x6a5038 if dark else 0xd0b488), scar * 0.9)
    return f


def nuts(seed, cracked=0):
    R = rng(seed)
    parts = []
    NUTS.clear()
    spots_ = [V(-0.03, -0.012, 0.0), V(0.012, -0.02, 0.0), V(0.035, 0.012, 0.0), V(-0.008, 0.022, 0.0), V(-0.04, 0.025, 0.0), V(0.0, 0.0, 0.026), V(0.03, -0.035, 0.0)]
    for i, c0 in enumerate(spots_):
        a = R.uniform(0, 6.28)
        sx, sy, sz = 0.026, 0.019, 0.018
        c = c0 + V(0, 0, sz * 0.95)
        b = ball('skin', V(0, 0, 0), 1.0, sub=3, sx=sx, sy=sy, sz=sz)
        # Toinen pää hieman suippo, napa-arven kylki litteämpi.
        for v in b.bm.verts:
            if v.co.x > 0:
                v.co.y *= 1 - 0.18 * v.co.x / sx
                v.co.z *= 1 - 0.18 * v.co.x / sx
            if v.co.y < -sy * 0.55:
                v.co.y = -sy * 0.55 + (v.co.y + sy * 0.55) * 0.4
        rot = Matrix.Rotation(a, 4, 'Z') @ Matrix.Rotation(R.uniform(-0.3, 0.3), 4, 'X')
        transform(b, Matrix.Translation(c) @ rot)
        parts.append(b)
        sd = (rot.to_3x3() @ V(0, -1, 0)).normalized()
        NUTS.append((c, None, sd))
        if i < cracked:
            # Haljennut kuori: sisältä vaalea siemen.
            k = ball('paste', c + (rot.to_3x3() @ V(0, sy * 0.6, sz * 0.5)), 0.011, sub=2, sx=1.5, sy=0.7, sz=0.6)
            parts.append(k)
    return parts


@item(paint=nut_paint(False), ao_strength=0.7)
def shea_nuts():
    return nuts(84)


@item(paint=nut_paint(True), ao_strength=0.7)
def roasted_nuts():
    return nuts(105, cracked=2)


@item(paint=fruit_paint({'plant': leaf_col}), ao_strength=0.5)
def moringa():
    # Sessio 56: moringan kaksoisparilehti: keskiruoti, sivuruodit ja niissä
    # pienet soikeat lehdykät pareittain, kärjessä pariton lehdykkä.
    R = rng(12)
    parts = []
    main = [V(0.006 * math.sin(t * 3), 0.004 * t, lerp(-0.08, 0.24, t)) for t in [k / 12 for k in range(13)]]
    parts.append(tube_path('plant', main, lambda t: 0.0024 * (1 - 0.5 * t), n=5))

    def leaflet(c, d, side, size):
        u = (d.cross(V(0, 1, 0))).normalized() * side
        q = ball('plant', V(0, 0, 0), size, sub=2, sx=0.62, sy=0.08, sz=1.0)
        # Lehdykkä osoittaa sivulle ja hieman eteen.
        ax = (u * 0.85 + d * 0.5).normalized()
        rot = ax.to_track_quat('Z', 'X').to_matrix().to_4x4()
        transform(q, Matrix.Translation(c + ax * size * 0.95) @ rot)
        return q
    for i in range(5):
        t = 0.25 + 0.65 * i / 4
        base = main[0].lerp(main[-1], t)
        for side in (-1, 1):
            d = V(side * 0.9, 0, 0.6).normalized()
            L = 0.07 * (1 - 0.35 * t)
            pin = [base + d * (L * u) + V(0, 0, -0.008 * u * u) for u in (0, 0.33, 0.66, 1.0)]
            parts.append(tube_path('plant', pin, lambda u: 0.0011, n=4))
            for j in range(3):
                c = pin[0].lerp(pin[-1], 0.3 + 0.3 * j)
                for sd in (-1, 1):
                    parts.append(leaflet(c, d, sd, 0.0085 + R.uniform(-0.001, 0.001)))
            parts.append(ball('plant', pin[-1] + d * 0.008, 0.009, sub=2, sx=0.6, sy=0.08, sz=1.0))
    parts.append(ball('plant', main[-1] + V(0, 0, 0.009), 0.01, sub=2, sx=0.62, sy=0.08, sz=1.0))
    return parts


def calyx(co, n):
    return mulc(mixc(hexc(0x8a0a1a), hexc(0xc8283a), nz(co, 40)), 0.85 + 0.25 * nz(co, 120))


def roselle_col(co, n, mat):
    if mat == 'skin':
        return calyx(co, n)
    if mat == 'plant':
        return mulc(mixc(hexc(0x4a6a2a), hexc(0x7a3a2a), nz(co, 20)), 0.9 + 0.2 * nz(co, 90))
    return None


@item(paint=roselle_col, ao_strength=0.6)
def hibiscus():
    # Sessio 56: rosellin (bissap) mehevät punaiset verhiöt: viisi suippoa
    # verholehteä siemenkodan ympärillä, tyvellä ohuet ulkoverhiön piikit;
    # punertavalla varrella.
    R = rng(31)
    parts = []
    stem = [V(-0.05 + 0.1 * t, 0.004 * math.sin(t * 5), 0.012 + 0.012 * math.sin(t * 3.1)) for t in [k / 8 for k in range(9)]]
    parts.append(tube_path('plant', stem, lambda t: 0.0028, n=6))
    for i, t in enumerate((0.15, 0.5, 0.85)):
        c = stem[0].lerp(stem[-1], t)
        up = V(R.uniform(-0.4, 0.4), R.uniform(-0.3, 0.3), 1).normalized()
        rot = up.to_track_quat('Z', 'Y').to_matrix().to_4x4()
        loc = Matrix.Translation(c + V(0, 0, 0.004))
        parts.append(tube_path('plant', [c, c + up * 0.008], lambda u: 0.0026, n=6))
        # Siemenkota keskellä.
        q = ball('skin', V(0, 0, 0.022), 0.011, sub=2, sx=0.9, sy=0.9, sz=1.3)
        transform(q, loc @ rot)
        parts.append(q)
        for k in range(5):
            a = 2 * math.pi * k / 5 + i
            d = V(math.cos(a), math.sin(a), 0)
            # Verholehti: mehevä, suippo ja kaartuu kärjestä sisään.
            rings = []
            for j in range(7):
                u = j / 6
                w = 0.011 * math.sin(math.pi * min(1, 0.25 + u * 0.8)) + 0.0008
                th = 0.003 * (1 - 0.7 * u) + 0.0006
                cc = d * (0.009 + 0.01 * math.sin(u * 2.6) - 0.004 * u * u) + V(0, 0, 0.008 + 0.038 * u)
                side = V(-d.y, d.x, 0)
                pts = [cc + side * w * math.cos(b) + d * th * math.sin(b) for b in [2 * math.pi * m / 8 for m in range(8)]]
                rings.append(pts)
            sep = loft('skin', rings)
            for f in sep.bm.faces:
                f.smooth = True
            transform(sep, loc @ rot)
            parts.append(sep)
            # Ulkoverhiön piikit.
            b = a + 0.6
            e = V(math.cos(b), math.sin(b), 0)
            spike = [V(0, 0, 0.004) + e * 0.008, V(0, 0, 0.0) + e * 0.016, V(0, 0, -0.002) + e * 0.022]
            sp = tube_path('skin', spike, lambda u: 0.0012 * (1 - u) + 0.0003, n=4)
            transform(sp, loc @ rot)
            parts.append(sp)
    return parts


def grain(co, n):
    return mulc(mixc(hexc(0xc8a858), hexc(0x9a7a3a), nz(co, 80)), 0.9 + 0.2 * nz(co, 300))


@item(paint=fruit_paint({'straw': grain, 'plant': leaf_col}), ao_strength=0.6)
def fonio():
    # Sessio 56: lyhde fonioheinää: ohuet korret, kärjessä 2-4 sormimaista
    # tähkähaaraa täynnä pieniä jyviä, muutama lehti; sidottu kahdesti.
    R = rng(41)
    parts = []
    for i in range(22):
        a = R.uniform(0, 6.28)
        rr = R.uniform(0.0, 0.012)
        base = V(math.cos(a) * rr, math.sin(a) * rr, -0.09)
        spread = R.uniform(0.01, 0.055)
        top = V(math.cos(a) * spread, math.sin(a) * spread, 0.36 + R.uniform(0, 0.07))
        path = [base.lerp(top, t) + V(0, 0, 0) for t in [k / 7 for k in range(8)]]
        parts.append(tube_path('straw', path, lambda t: 0.0015, n=4))
        nr = R.randint(2, 4)
        for j in range(nr):
            b = a + j * 2 * math.pi / nr + R.uniform(-0.4, 0.4)
            d = (V(math.cos(b), math.sin(b), 0) * 0.55 + V(0, 0, 0.6)).normalized()
            L = R.uniform(0.035, 0.05)
            pan = [top + d * (L * u) + V(0, 0, -0.022 * u * u) for u in [k / 8 for k in range(9)]]
            # Jyvät: säde aaltoilee haaraa pitkin.
            parts.append(tube_path('straw', pan, lambda t: (0.0019 + 0.0009 * abs(math.sin(t * 40))) * (1 - 0.4 * t), n=5))
    for i in range(5):
        a = R.uniform(0, 6.28)
        d = V(math.cos(a), math.sin(a), 0)
        leaf = [V(0, 0, R.uniform(0.0, 0.12)) + d * (0.06 * u * u + 0.008) + V(0, 0, 0.17 * u) for u in [k / 8 for k in range(9)]]
        parts.append(ribbon('plant', leaf, lambda t: 0.0035 * math.sin(math.pi * min(1, 0.15 + t * 0.9)), thick=0.0005, twist=R.uniform(-1.5, 1.5)))
    for z in (0.04, 0.052, 0.15):
        parts.append(cord('rope', ellipse_pts(V(0, 0, z), V(1, 0, 0), V(0, 1, 0), 0.017, 0.017, 12), 0.0022))
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


def smooth_prof(prof, k=3):
    """Profiilin pehmennys (Catmull-Rom): k väliä pisteparien väliin."""
    out = []
    P = [prof[0]] + list(prof) + [prof[-1]]
    for i in range(1, len(P) - 2):
        p0, p1, p2, p3 = P[i - 1], P[i], P[i + 1], P[i + 2]
        for j in range(k):
            t = j / k
            out.append(tuple(0.5 * (2 * p1[c] + (-p0[c] + p2[c]) * t + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t * t + (-p0[c] + 3 * p1[c] - 3 * p2[c] + p3[c]) * t ** 3) for c in (0, 1)))
    out.append(prof[-1])
    return out


def gourd_col(co, n, mat):
    # Sessio 56: kalebassi, johon on poltettu koristekuvio (kolmio- ja
    # siksak-nauhat, Länsi-Afrikan perinne).
    if mat == 'skin':
        base = mulc(mixc(hexc(0xd0a868), hexc(0xa47a40), nz(co, 30)), 0.85 + 0.25 * nz(co, 120, 3))
        a = math.atan2(co.y, co.x)
        burn = 0.0
        for z0, z1 in GOURD_BANDS:
            if z0 < co.z < z1:
                h = (co.z - z0) / (z1 - z0)
                f = (a / (2 * math.pi) * 14) % 1.0
                tri = abs(f - 0.5) * 2
                burn = max(burn, 1.0 if tri > h else 0.0)
            if abs(co.z - z0) < 0.0012 or abs(co.z - z1) < 0.0012:
                burn = 1.0
        return mixc(base, hexc(0x3a2414), burn * 0.85)
    if mat == 'liquid':
        return hexc(0x3a0610)
    return None


GOURD_BANDS = []


@item(paint=gourd_col)
def bissap():
    # Kalebassikuppi täynnä tummanpunaista hibiskusjuomaa.
    GOURD_BANDS[:] = [(0.05, 0.068)]
    prof = smooth_prof([(0.001, 0.0), (0.03, 0.002), (0.05, 0.02), (0.058, 0.05), (0.055, 0.085), (0.052, 0.095), (0.048, 0.095), (0.05, 0.08), (0.052, 0.05), (0.044, 0.02), (0.001, 0.008)])
    parts = [lathe('skin', prof, n=40, cap0=True, cap1=True)]
    parts.append(fill('liquid', 0.051, 0.082, dome=0.0))
    return parts


@item(paint=gourd_col)
def herbal_remedy():
    # Pieni pullokurpitsa, puutulppa ja nyöri.
    GOURD_BANDS[:] = [(0.035, 0.055), (0.085, 0.097)]
    prof = smooth_prof([(0.001, 0.0), (0.03, 0.004), (0.05, 0.03), (0.055, 0.06), (0.045, 0.09), (0.022, 0.115), (0.016, 0.135), (0.018, 0.15), (0.016, 0.155)])
    parts = [lathe('skin', prof, n=36, cap1=False)]
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
