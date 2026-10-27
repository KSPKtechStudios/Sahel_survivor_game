# Sessio 54: materiaalit (risu, kuitu, puut, harkot, piikivi, luu, simpukka,
# sulka, ruoko, bambu, palmunlehti, kumi, köysi, savi, jänne, taljat, sarvi,
# nahka, karitevoi). Mitat vastaavat vanhoja malleja (pelin X, Y ylös, Z) eli
# Blenderissä (X, -Z, Y).
import math
import bpy
import bmesh
from itemlib import V, Vector, Matrix, smooth, lerp, ring, loft, transform, displace, box_uv, from_object, Part, rng
from registry import item
from shapes import haft, cord, ellipse_pts, scallops, tube_path
from paint import hexc, mixc, mulc, nz, spots, smoothstep


def endcap(mat, pts, flip=False):
    """Kansi renkaan päälle (oma materiaali, esim. vuosirenkaat)."""
    p = Part(mat)
    c = sum(pts, Vector()) / len(pts)
    cv = p.bm.verts.new(c)
    vs = [p.bm.verts.new(q) for q in pts]
    n = len(vs)
    for k in range(n):
        a, b = vs[k], vs[(k + 1) % n]
        tri = [cv, b, a] if flip else [cv, a, b]
        p.face(tri, [(v.co.x * 4, v.co.y * 4) for v in tri])
    return p


def ribbon(mat, path, width, thick=0.0008, twist=0.0, n_side=1, up=None):
    """Kapea nauha polkua pitkin (heinänkorsi, lehdyk): poikkileikkaus ohut suorakaide."""
    rings = []
    m = len(path)
    for i, c in enumerate(path):
        t = i / (m - 1)
        d = (path[min(m - 1, i + 1)] - path[max(0, i - 1)]).normalized()
        ref = up or (Vector((0, 1, 0)) if abs(d.y) < 0.9 else Vector((1, 0, 0)))
        u = (ref - d * ref.dot(d)).normalized()
        a = twist * t
        u = (u * math.cos(a) + d.cross(u) * math.sin(a)).normalized()
        v = d.cross(u)
        w = width(t) if callable(width) else width
        rings.append([c + v * w, c + u * thick, c - v * w, c - u * thick])
    return loft(mat, rings)


# --- Puut ja risu ----------------------------------------------------------------------

def bent_path(z0, z1, seg, bends, seed):
    R = rng(seed)
    pts = []
    for i in range(seg + 1):
        t = i / seg
        x = sum(a * math.sin(math.pi * (t * f + ph)) for a, f, ph in bends)
        y = 0.004 * math.sin(t * 7 + seed)
        pts.append(V(x, y, lerp(z0, z1, t)))
    return pts


def branch(mat, cap_mat, path, r0, r1, n=10, cap0=True, cap1=True):
    rings = []
    m = len(path)
    for i, c in enumerate(path):
        t = i / (m - 1)
        d = (path[min(m - 1, i + 1)] - path[max(0, i - 1)]).normalized()
        ref = Vector((1, 0, 0)) if abs(d.x) < 0.9 else Vector((0, 1, 0))
        u = (ref - d * ref.dot(d)).normalized()
        v = d.cross(u)
        r = lerp(r0, r1, t) * (1 + 0.08 * math.sin(t * 23))
        rings.append(ring(c, u, v, r, r * 0.92, n))
    parts = [loft(mat, rings, cap0=False, cap1=False)]
    if cap0:
        parts.append(endcap(cap_mat, rings[0], flip=True))
    if cap1:
        parts.append(endcap(cap_mat, rings[-1]))
    return parts


def endgrain_paint(light, dark, core=None):
    L, D = hexc(light), hexc(dark)
    C = hexc(core) if core else None

    def f(co, n, mat):
        if mat != 'endgrain':
            return None
        r = math.hypot(co.x, co.y)
        ringv = 0.5 + 0.5 * math.sin(r * 420 + nz(co, 40) * 3)
        col = mixc(L, D, ringv * 0.55 + nz(co, 90) * 0.3)
        if C:
            col = mixc(col, C, 1 - smoothstep(0.02, 0.05, r))
        if r > 0.075:
            col = mulc(col, 0.7)
        return col
    return f


@item(paint=endgrain_paint(0xd9b98a, 0xa07a50))
def stick():
    path = bent_path(-0.12, 0.5, 16, [(0.012, 1.0, 0.1), (0.006, 2.3, 0.4)], 3)
    parts = branch('bark', 'endgrain', path, 0.017, 0.011)
    # Sivuoksan tynkä.
    side = [V(0.008, 0, 0.3), V(0.04, 0.002, 0.36), V(0.07, 0.004, 0.40), V(0.09, 0.005, 0.425)]
    parts += branch('bark', 'endgrain', side, 0.008, 0.005, n=8, cap0=False)
    return parts


def log_item(bark, light, dark, core=None, seed=1, r=0.085):
    path = [V(0, 0, z) for z in (-0.09, 0.0, 0.1, 0.2, 0.33)]
    rings = []
    R = rng(seed)
    for i, c in enumerate(path):
        pts = []
        for k in range(20):
            a = 2 * math.pi * k / 20
            rr = r * (1 + 0.06 * math.sin(a * 3 + seed) + 0.03 * math.sin(a * 7 + i))
            pts.append(c + V(math.cos(a) * rr, math.sin(a) * rr, 0))
        rings.append(pts)
    side = loft(bark, rings, cap0=False, cap1=False)
    displace(side, 0.004, 25, seed=seed)
    return [side, endcap('endgrain', rings[0], flip=True), endcap('endgrain', rings[-1])]


@item(paint=endgrain_paint(0xdcc097, 0xa5825a))
def wood():
    return log_item('bark', 0xdcc097, 0xa5825a, seed=2)


@item(paint=endgrain_paint(0x8a5a3a, 0x4e2e1c))
def hardwood():
    return log_item('bark:7a6a5a', 0x8a5a3a, 0x4e2e1c, seed=3, r=0.082)


@item(paint=endgrain_paint(0xc58a5a, 0x8a4a2a, core=0x9a2a18))
def heartwood():
    return log_item('bark:8a7a6a', 0xc58a5a, 0x8a4a2a, seed=4, r=0.082)


# --- Harkot, renkaat, kivet ---------------------------------------------------------------

def ingot(mat, seed):
    # Valettu harkko: alapinta leveämpi, pyöristetyt reunat (Blender: X pituus, Y leveys, Z korkeus).
    rings = []
    seg = 14
    for i in range(seg + 1):
        s = i / seg
        x = lerp(-0.106, 0.112, s)
        e = 1 - 0.5 * abs(2 * s - 1) ** 10
        pts = []
        for k in range(16):
            a = 2 * math.pi * k / 16
            c, sn = math.cos(a), math.sin(a)
            y = math.copysign(abs(c) ** 0.5, c) * 0.055 * e
            z = (math.copysign(abs(sn) ** 0.5, sn) * 0.5 + 0.5) * 0.093 * e
            # Yläpinta kapeampi (valumuotin kalteva reuna).
            y *= 1 - 0.18 * (z / 0.093)
            pts.append(V(x * (1 - 0.1 * z / 0.093), -y + 0.012, z))
        rings.append(pts)
    p = loft(mat, rings)
    displace(p, 0.0015, 45, seed=seed)
    return [p]


@item
def copper_ingot():
    return ingot('copper', 1)


@item
def iron_ingot():
    return ingot('iron', 2)


@item(ao_strength=0.8, ao_dist=0.03)
def iron_rings():
    # Pala rengaspunosta (4-in-1) ja muutama irtorengas.
    parts = []
    mat = 'steel:b4b4bc'
    for row in range(5):
        for col in range(4):
            cx = (col - 1.5) * 0.023 + (0.0115 if row % 2 else 0.0)
            cy = (row - 2) * 0.0155
            tilt = 0.55 if row % 2 else -0.55
            u = V(1, 0, 0)
            v = V(0, math.cos(tilt), math.sin(tilt))
            parts.append(cord(mat, ellipse_pts(V(cx, cy, 0.01), u, v, 0.0125, 0.0125, 16), 0.0021, n=6))
    R = rng(5)
    for i in range(3):
        c = V(0.06 + R.uniform(0, 0.03), -0.03 + i * 0.025, 0.003)
        a = R.uniform(0, 3)
        parts.append(cord(mat, ellipse_pts(c, V(math.cos(a), math.sin(a), 0), V(-math.sin(a), math.cos(a), 0.15).normalized(), 0.0125, 0.0125, 16), 0.0021, n=6))
    return parts


@item
def flint():
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=4, radius=1)
    p = from_object('flint', bpy.context.active_object)
    transform(p, Matrix.Diagonal((0.095, 0.062, 0.05, 1)))
    displace(p, 0.008, 9, seed=7)
    scallops(p, 0.006, 0.022, seed=8)
    transform(p, Matrix.Translation(V(0, 0, 0.043)))
    box_uv(p)
    for f in p.bm.faces:
        f.smooth = True
    return [p]


@item
def bone():
    # Pitkä luu: varsi ja nivelpäät (kaksi nuppia kummassakin päässä).
    rings = []
    seg = 24
    for i in range(seg + 1):
        t = i / seg
        z = lerp(-0.12, 0.24, t)
        a = abs(2 * t - 1)
        r = 0.011 + 0.012 * smoothstep(0.7, 1.0, a) ** 1.5
        rings.append(ring(V(0.003 * math.sin(t * 3), 0, z), V(1, 0, 0), V(0, 1, 0), r * 1.15, r * 0.9, 14))
    parts = [loft('bone', rings)]
    from items_weapons import ball
    for z, s in ((-0.12, -1), (0.24, 1)):
        parts.append(ball('bone', V(-0.012, 0, z + s * 0.004), 0.016, sub=3, sz=0.9))
        parts.append(ball('bone', V(0.013, 0, z + s * 0.002), 0.014, sub=3, sz=0.9))
    for p in parts:
        displace(p, 0.0008, 70, seed=3)
    return parts


SHELL_END = {}


def shell_paint(co, n, mat):
    if mat != 'shell':
        return None
    c, r = SHELL_END.get('c'), SHELL_END.get('r', 0)
    if c is not None and (Vector(co) - c).length < r * 0.95:
        return mixc(hexc(0xf0b49a), hexc(0xd87a6a), nz(co, 60))  # suun sisäpinta
    a = math.atan2(co.z - 0.035, co.y)
    band = 0.5 + 0.5 * math.sin(co.x * 150 + a * 3 + nz(co, 40) * 2)
    base = mixc(hexc(0xf4e8d0), hexc(0xb8683a), smoothstep(0.55, 0.95, band) * 0.85)
    return mulc(base, 0.82 + 0.26 * nz(co, 110))


@item(paint=shell_paint, ao_strength=0.75, ao_dist=0.04)
def seashell():
    # Kierteinen meritorvisimpukka kyljellään: kasvavat kierrokset, nystyrät
    # olkapäillä ja levenevä suu (sisältä vaaleanpunainen).
    TH = 4.4 * 2 * math.pi
    k = math.log(1 / 0.05) / TH
    N = 170
    path, rad = [], []
    for i in range(N + 1):
        th = TH * i / N
        g = math.exp(k * (th - TH))
        R = 0.022 * g
        path.append(V(0.035 - 0.085 * (1 - g), R * math.cos(th), 0.035 + R * math.sin(th)))
        t = i / N
        rad.append(0.028 * g * (1 + 0.45 * smoothstep(0.9, 1.0, t)))
    p = tube_path('shell', path, lambda t: rad[min(N, int(round(t * N)))], n=18)
    SHELL_END['c'] = path[-1]
    SHELL_END['r'] = rad[-1]
    parts = [p]
    for i in range(N // 2, N - 6, 7):
        th = TH * i / N
        g = math.exp(k * (th - TH))
        out = V(-0.55, math.cos(th), math.sin(th)).normalized()
        base = path[i] + out * rad[i] * 0.7
        parts.append(tube_path('shell', [base, base + out * rad[i] * 0.55], lambda t: 0.0075 * g * (1 - t) ** 0.8 + 0.0006, n=8))
    return parts


def feather_paint(co, n, mat):
    if mat != 'feather':
        return None
    t = (co.z + 0.04) / 0.33
    bar = 0.5 + 0.5 * math.sin(t * 60 + abs(co.x) * 60)
    base = mixc(hexc(0x8a8a86), hexc(0x4a4a48), bar * 0.6)
    if t > 0.85:
        base = mixc(base, hexc(0x2a2624), (t - 0.85) / 0.15)
    if abs(co.x) < 0.0025:
        base = hexc(0xd8d0c0)
    return base


@item(paint=feather_paint, ao_strength=0.4)
def feather():
    # Varsi (ruoti) ja kaksi lipeää; lipeät hieman kaarevia ja epäsymmetrisiä.
    parts = []
    shaft = [V(0.004 * math.sin(t * 2), 0, lerp(-0.04, 0.29, t)) for t in [i / 14 for i in range(15)]]
    parts.append(ribbon('feather', shaft, lambda t: 0.0016 * (1 - t) + 0.0004, thick=0.0012))
    for side, wmax in ((1, 0.026), (-1, 0.018)):
        p = Part('feather')
        rows = []
        for i in range(16):
            t = i / 15
            z = lerp(0.02, 0.29, t)
            w = wmax * math.sin(math.pi * min(1, 0.15 + t * 0.9)) ** 0.7
            row = []
            for j in range(5):
                s = j / 4
                x = side * s * w
                zz = z - s * s * 0.02
                y = -0.004 * s * s + 0.0015 * math.sin(i * 1.7 + j)
                row.append(p.bm.verts.new(V(x + 0.004 * math.sin(t * 2), y, zz)))
            rows.append(row)
        for i in range(15):
            for j in range(4):
                q = [rows[i][j], rows[i][j + 1], rows[i + 1][j + 1], rows[i + 1][j]]
                p.face(q if side > 0 else q[::-1])
        for f in p.bm.faces:
            f.smooth = True
        box_uv(p, 0.1)
        parts.append(p)
    return parts


def stalk_paint(green, tan, node_dark=0.6, period=0.11):
    G, T = hexc(green), hexc(tan)

    def f(co, n, mat):
        if mat not in ('plant', 'straw'):
            return None
        base = mixc(G, T, nz(co, 8, 3) * 0.8)
        ph = ((co.z + 0.2) / period) % 1.0
        if ph < 0.06:
            base = mulc(base, node_dark + 0.4 * ph / 0.06)
        return mulc(base, 0.9 + 0.2 * nz(co, 200, 5))
    return f


@item(paint=stalk_paint(0x9aa860, 0xc8b47a, period=0.13))
def reed():
    parts = []
    for i, (x, y, tilt, top) in enumerate([(0, 0, 0.02, 0.572), (0.022, 0.012, -0.03, 0.5), (-0.018, -0.01, 0.05, 0.46)]):
        path = [V(x + tilt * t, y, lerp(-0.12, top, t)) for t in [k / 12 for k in range(13)]]
        r = 0.0055
        parts.append(tube_path('straw', path, lambda t: r * (1 - 0.3 * t), n=8))
        leaf = [V(x + tilt * 0.3 + 0.002 + 0.04 * u * u, y, lerp(0.1 + i * 0.05, 0.35 + i * 0.04, u)) for u in [k / 10 for k in range(11)]]
        parts.append(ribbon('straw', leaf, lambda t: 0.006 * math.sin(math.pi * min(1, 0.1 + t)), thick=0.0006))
    return parts


@item(paint=stalk_paint(0x8aa04a, 0xc8c070, node_dark=0.55, period=0.2))
def bamboo():
    path = [V(0, 0, lerp(-0.1, 0.507, t)) for t in [k / 18 for k in range(19)]]
    rings = []
    for c in path:
        rr = 0.027 * (1 + 0.08 * math.exp(-(((c.z + 0.1) % 0.2) - 0.0) ** 2 / 0.0002))
        rings.append(ring(c, V(1, 0, 0), V(0, 1, 0), rr, rr, 16))
    side = loft('plant', rings, cap0=False, cap1=False)
    inner = [ring(c, V(1, 0, 0), V(0, 1, 0), 0.021, 0.021, 16) for c in (path[0], path[-1])]
    parts = [side, endcap('endgrain', rings[0], flip=True), endcap('endgrain', rings[-1])]
    return parts


@item(paint=stalk_paint(0x4f7a2a, 0x8a9a3a, node_dark=1.0, period=10))
def palm_leaf():
    parts = []
    rach = [V(0.01 * math.sin(t * 2), -0.03 * t * t, lerp(-0.1, 0.5, t)) for t in [k / 16 for k in range(17)]]
    parts.append(tube_path('plant', rach, lambda t: 0.006 * (1 - 0.7 * t) + 0.0012, n=6))
    for i in range(14):
        t = 0.12 + 0.85 * i / 13
        base = rach[0].lerp(rach[-1], t)
        for side in (-1, 1):
            L = 0.11 * math.sin(math.pi * min(1, 0.25 + t * 0.8)) + 0.02
            pts = [base + V(side * L * u, -0.02 * u * u - 0.01 * u, 0.07 * u + 0.01 * u * u) for u in [k / 8 for k in range(9)]]
            parts.append(ribbon('plant', pts, lambda s: 0.009 * math.sin(math.pi * min(1, 0.12 + s)) + 0.0006, thick=0.0007, up=V(0, 0, 1)))
    return parts


def gum_paint(co, n, mat):
    if mat != 'gum':
        return None
    return mixc(hexc(0xe8b850), hexc(0xb86a1c), nz(co, 9, 4) * 1.2 - 0.1)


def teardrop(mat, c, R, h, axis, seed):
    """Pisaran muotoinen kyynel: pyöreä tyvi, suippo kärki."""
    from items_food import lathe
    prof = [(0.0006, 0.0), (0.62 * R, 0.12 * h), (0.95 * R, 0.35 * h), (0.86 * R, 0.6 * h), (0.5 * R, 0.84 * h), (0.16 * R, 0.97 * h), (0.0006, h)]
    p = lathe(mat, prof, n=14, wob=0.06, seed=seed)
    axis = axis.normalized()
    q = V(0, 0, 1).rotation_difference(axis).to_matrix().to_4x4()
    transform(p, Matrix.Translation(c) @ q)
    return p


@item(paint=gum_paint, ao_strength=0.55, ao_dist=0.03)
def gum():
    # Arabikumin kyyneliä: kellertäviä, kiiltäviä pisaroita kasana.
    R = rng(33)
    parts = []
    spots = [(0, 0, 0.012), (0.03, 0.012, 0.01), (-0.028, 0.016, 0.01), (0.012, -0.03, 0.01), (-0.016, -0.026, 0.01),
             (0.042, -0.02, 0.008), (-0.045, -0.008, 0.008), (0.006, 0.02, 0.03), (-0.008, -0.006, 0.032)]
    for i, (x, y, z) in enumerate(spots):
        r = R.uniform(0.011, 0.016)
        ax = V(R.uniform(-1, 1), R.uniform(-1, 1), R.uniform(-0.3, 0.6))
        parts.append(teardrop('gum', V(x, y, z), r, r * 2.4, ax, i))
    return parts


@item(ao_strength=0.9, ao_dist=0.03)
def rope():
    # Kiepillä oleva köysi: kaksi kerrosta, joiden välillä köysi nousee
    # tasaisesti puolen kierroksen matkalla; pää roikkuu ulos.
    pts = []
    turns = 4.2
    N = 240
    for i in range(N):
        t = i / (N - 1)
        a = t * turns * 2 * math.pi
        lift = smoothstep(0.5, 0.62, t)
        rr = 0.068 - 0.013 * lift
        pts.append(V(math.cos(a) * rr, math.sin(a) * rr, 0.012 + lift * 0.021 + 0.002 * math.sin(a * 3)))
    pts += [pts[-1] + V(0.03, -0.012, 0.004), pts[-1] + V(0.058, -0.03, 0.0), pts[-1] + V(0.08, -0.045, -0.006)]
    return [tube_path('rope', pts, lambda t: 0.011, n=10)]


@item(ao_strength=0.7)
def clay():
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=4, radius=1)
    p = from_object('clay', bpy.context.active_object)
    transform(p, Matrix.Diagonal((0.078, 0.07, 0.055, 1)))
    displace(p, 0.012, 14, seed=12)
    for v in p.bm.verts:
        if v.co.z < -0.025:
            v.co.z = -0.025 - (v.co.z + 0.025) * 0.15
    transform(p, Matrix.Translation(V(0, 0, 0.03)))
    box_uv(p)
    for f in p.bm.faces:
        f.smooth = True
    return [p]


def sinew_paint(co, n, mat):
    if mat != 'gum':
        return None
    return mulc(mixc(hexc(0xf0dcb0), hexc(0xc8a06a), nz(co, 60)), 0.9 + 0.15 * nz(co, 200))


@item(paint=sinew_paint, ao_strength=0.7, ao_dist=0.03)
def sinew():
    # Kuivattu jännevyyhti: kierretyt säikeet soikeana lenkkinä, sidottu yläpäästä.
    parts = []
    N = 64
    for j in range(7):
        ph = 2 * math.pi * j / 7
        pts = []
        for i in range(N):
            t = i / N
            a = 2 * math.pi * t
            c = V(math.sin(a) * 0.026, 0, 0.08 - math.cos(a) * 0.15)
            pinch = 1 - 0.65 * smoothstep(0.6, 0.95, -math.cos(a))
            off = 0.006 * pinch
            tw = a * 9 + ph
            pts.append(c + V(math.cos(tw) * off, math.sin(tw) * off, 0))
        parts.append(cord('gum', pts, 0.0019, n=5))
    for z in (0.198, 0.206, 0.214):
        parts.append(cord('rope:b09a70', ellipse_pts(V(0, 0, z), V(1, 0, 0), V(0, 1, 0), 0.0105, 0.0105, 12), 0.0022))
    return parts


# --- Taljat ------------------------------------------------------------------------------

def pelt(seed, size=(0.18, 0.2), legs=0.42, tail=None, fur=0.004):
    """Talja: eläimen ääriviiva (neljä jalkaliuskaa, kaula), turkkipinta
    kuprulla, nahkapuoli alla ja paksu reuna. tail = (pituus, säde) tai None."""
    R = rng(seed)
    p = Part('fur')
    nr, na = 9, 64
    sx, sy = size
    tops = []
    cen = p.bm.verts.new(V(0, 0, 0.03 + fur * 0.5))
    rows = []
    for i in range(1, nr + 1):
        rr = i / nr
        row = []
        for k in range(na):
            a = 2 * math.pi * k / na
            leg = legs * max(0.0, math.cos(2 * (a - math.pi / 4))) ** 10
            neck = 0.32 * max(0.0, math.cos(a - math.pi / 2)) ** 10
            e = 1 + leg + neck + 0.05 * math.sin(a * 7 + seed)
            x = math.cos(a) * sx * rr * e
            y = math.sin(a) * sy * rr * e
            z = 0.03 + 0.01 * math.sin(x * 25 + seed) * math.cos(y * 20) - 0.01 * rr ** 3
            z += fur * nz(V(x, y, 0), 70, seed) * (1 - 0.6 * rr ** 4)
            row.append(p.bm.verts.new(V(x, y, z)))
        rows.append(row)
    for k in range(na):
        k1 = (k + 1) % na
        p.face([cen, rows[0][k], rows[0][k1]])
        for i in range(nr - 1):
            p.face([rows[i][k], rows[i + 1][k], rows[i + 1][k1], rows[i][k1]])
    top_verts = p.bm.verts[:]
    ret = bmesh.ops.duplicate(p.bm, geom=p.bm.verts[:] + p.bm.edges[:] + p.bm.faces[:])
    vmap = ret['vert_map']
    for v in top_verts:
        d = vmap[v]
        rr = math.hypot(v.co.x / sx, v.co.y / sy)
        d.co.z = 0.022 + 0.01 * math.sin(v.co.x * 25 + seed) * math.cos(v.co.y * 20) - 0.01 * min(1.0, rr) ** 3
    nf = [g for g in ret['geom'] if isinstance(g, bmesh.types.BMFace)]
    bmesh.ops.reverse_faces(p.bm, faces=nf)
    for k in range(na):
        a, b = rows[-1][k], rows[-1][(k + 1) % na]
        p.bm.faces.new([a, vmap[a], vmap[b], b])
    bmesh.ops.recalc_face_normals(p.bm, faces=p.bm.faces[:])
    for f in p.bm.faces:
        f.smooth = True
    box_uv(p, 0.3)
    parts = [p]
    if tail:
        L, r = tail
        y0 = -sy * 0.95
        path = [V(0, y0 + 0.02, 0.03), V(0.01, y0 - L * 0.4, 0.032), V(0.03, y0 - L * 0.8, 0.03), V(0.035, y0 - L, 0.028)]
        tp = tube_path('fur', path, lambda t: r * (1 - 0.35 * t) * (1 if r > 0.012 else (1 - 0.6 * t)) + 0.002, n=10)
        box_uv(tp, 0.3)
        parts.append(tp)
    return parts


def pelt_paint(back, belly, stripe=None, mane=None, tail_tip=None, sx=0.2):
    B, W = hexc(back), hexc(belly)
    S = hexc(stripe) if stripe else None
    M = hexc(mane) if mane else None
    T = hexc(tail_tip) if tail_tip else None

    def f(co, n, mat):
        if mat != 'fur':
            return None
        if n.z < -0.5:
            return mulc(hexc(0xd2bea0), 0.9 + 0.15 * nz(co, 30))  # nahkapuoli
        d = abs(co.x) / sx
        col = mixc(B, W, smoothstep(0.45, 0.8, d))
        if S:
            col = mixc(col, S, max(0, 1 - abs(d - 0.42) / 0.07))
        if M:
            col = mixc(col, M, 1 - smoothstep(0.08, 0.2, d))
        if T and co.y < -0.3:
            col = mixc(col, T, smoothstep(-0.3, -0.34, co.y))
        return mulc(col, 0.82 + 0.3 * nz(co, 45, 2))
    return f


@item(paint=pelt_paint(0x7a6656, 0x9a8676, mane=0x2e2620), ao_strength=0.8, ao_dist=0.04)
def hide():
    # Pahkasian talja: karkea, harjaksinen, tumma harjaraita selässä.
    return pelt(11, fur=0.007, tail=(0.12, 0.0045))


@item(paint=pelt_paint(0xc8955a, 0xf2ead8, stripe=0x3a2a1c), ao_strength=0.8, ao_dist=0.04)
def gazelle_pelt():
    return pelt(12, size=(0.17, 0.21), legs=0.55, tail=(0.07, 0.008))


@item(paint=pelt_paint(0x8a8478, 0xc8c2b4, mane=0x5a564e), ao_strength=0.8, ao_dist=0.04)
def monkey_pelt():
    return pelt(13, size=(0.15, 0.18), legs=0.6, tail=(0.24, 0.006))


@item(paint=pelt_paint(0xc8743a, 0xf4ecd8, tail_tip=0xf8f4ec), ao_strength=0.8, ao_dist=0.04)
def fox_pelt():
    return pelt(14, size=(0.15, 0.18), legs=0.45, tail=(0.17, 0.024))


def horn_paint(co, n, mat):
    if mat != 'chitin':
        return None
    under = smoothstep(0.0, 0.6, -n.x)
    return mixc(hexc(0x1a1612), hexc(0x8a6a3a), under * 0.8 * nz(co, 300, 1))


@item(paint=horn_paint, ao_strength=0.5)
def beetle_horn():
    path = [V(0.012 * math.sin(t * 1.6) - 0.004, 0, lerp(0, 0.114, t)) for t in [k / 16 for k in range(17)]]
    p = tube_path('chitin', path, lambda t: 0.009 * (1 - t) ** 0.8 + 0.0008, n=10)
    return [p]


def leather_sheet(mat, L, W, t, z, seed, fold=True):
    """Taiteltu nahka: ohut levy, pyöreä taitereuna toisella sivulla ja
    epätasainen, aaltoileva reuna toisella."""
    R = rng(seed)
    rings = []
    seg = 16
    for i in range(seg + 1):
        s_ = i / seg
        x = lerp(-L / 2, L / 2, s_)
        wav = 0.006 * math.sin(s_ * 9 + seed) + 0.003 * math.sin(s_ * 23 + seed * 2)
        pts = []
        for k in range(16):
            a = 2 * math.pi * k / 16
            c, sn = math.cos(a), math.sin(a)
            yy = math.copysign(abs(c) ** 0.35, c) * (W / 2 + (wav if c < 0 else 0))
            zz = sn * t / 2 * (1.0 if c > 0 else 0.7)
            pts.append(V(x, yy, z + zz + 0.002 * math.sin(x * 40 + seed) * (1 if c < 0 else 0.3)))
        rings.append(pts)
    p = loft(mat, rings)
    return p


@item(ao_strength=0.85, ao_dist=0.04)
def leather():
    # Pino taiteltuja parkittuja nahkoja, sidottu nahkanauhalla.
    parts = []
    for i, (mat, dz, ang, off) in enumerate((('leather', 0.006, 0.0, 0.0), ('leather:d8b48c', 0.018, 0.08, 0.008), ('leather:c09a76', 0.03, -0.06, -0.006))):
        sh = leather_sheet(mat, 0.21, 0.13, 0.011, dz, i + 3)
        transform(sh, Matrix.Translation(V(off, off * 0.5, 0)) @ Matrix.Rotation(ang, 4, 'Z'))
        parts.append(sh)
    for x in (-0.055, 0.055):
        pts = ellipse_pts(V(x, 0.0, 0.019), V(0, 1, 0), V(0, 0, 1), 0.074, 0.024, 20)
        pts = [V(p.x, p.y, max(p.z, 0.0005)) for p in pts]
        parts.append(cord('leather:6a4a30', pts, 0.0022, n=6))
    return parts


def butter_paint(co, n, mat):
    if mat == 'paste':
        return mulc(hexc(0xf0dca0), 0.92 + 0.12 * nz(co, 60))
    return None


@item(paint=butter_paint)
def shea_butter():
    # Puukulho täynnä karitevoita.
    parts = bowl('wood', 0.083, 0.06, 0.006)
    parts.append(fill('paste', 0.074, 0.052, dome=0.016, swirl=0.004))
    return parts


def bowl(mat, R, H, wall, n=28):
    """Kulho: ulkopinta, reuna ja sisäpinta (pohja z = 0)."""
    rings = []
    seg = 10
    for i in range(seg + 1):
        t = i / seg
        a = t * math.pi / 2
        r = R * math.sin(a) * 0.98 + 0.002
        z = H * (1 - math.cos(a))
        rings.append(ring(V(0, 0, z), V(1, 0, 0), V(0, 1, 0), r, r, n))
    rim_out = rings[-1]
    inner = []
    for i in range(seg, -1, -1):
        t = i / seg
        a = t * math.pi / 2
        r = (R - wall) * math.sin(a) * 0.98 + 0.001
        z = wall + (H - wall) * (1 - math.cos(a))
        inner.append(ring(V(0, 0, z), V(1, 0, 0), V(0, 1, 0), r, r, n))
    allr = rings + inner
    return [loft(mat, allr, cap0=True, cap1=True)]


def fill(mat, R, z, dome=0.01, swirl=0.0, n=28):
    p = Part(mat)
    cen = p.bm.verts.new(V(0, 0, z + dome))
    rows = []
    for i in range(1, 6):
        rr = i / 5
        rows.append([p.bm.verts.new(V(math.cos(2 * math.pi * k / n) * R * rr, math.sin(2 * math.pi * k / n) * R * rr,
                                       z + dome * (1 - rr * rr) + swirl * math.sin(k * 0.9 + i * 2))) for k in range(n)])
    for k in range(n):
        k1 = (k + 1) % n
        p.face([cen, rows[0][k], rows[0][k1]])
        for i in range(4):
            p.face([rows[i][k], rows[i + 1][k], rows[i + 1][k1], rows[i][k1]])
    for f in p.bm.faces:
        f.smooth = True
    box_uv(p, 0.1)
    return p
