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


@item
def iron_rings():
    parts = []
    R = rng(5)
    for i in range(9):
        c = V(R.uniform(-0.04, 0.05), R.uniform(-0.05, 0.03), R.uniform(0.008, 0.04))
        u = V(R.uniform(-1, 1), R.uniform(-1, 1), R.uniform(-0.3, 0.3)).normalized()
        v = u.cross(V(R.uniform(-0.3, 0.3), R.uniform(-0.3, 0.3), 1)).normalized()
        parts.append(cord('iron', ellipse_pts(c, u, v, 0.016, 0.016, 18), 0.0028, n=8))
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


def shell_paint(co, n, mat):
    if mat != 'shell':
        return None
    r = math.hypot(co.x, co.y + 0.03)
    band = 0.5 + 0.5 * math.sin(r * 160)
    base = mixc(hexc(0xf2e6d2), hexc(0xd88a5a), band * 0.6 * nz(co, 30))
    return mulc(base, 0.85 + 0.25 * nz(co, 80))


@item(paint=shell_paint, ao_strength=0.6)
def seashell():
    # Kampasimpukka: viuhkamainen, säteittäiset harjanteet (Blender: Y = pelin -Z).
    p = Part('shell')
    nr, na = 10, 28
    hinge = p.bm.verts.new(V(0, -0.03, 0.018))
    vs = []
    for i in range(1, nr + 1):
        rr = i / nr
        row = []
        for k in range(na + 1):
            a = lerp(-1.25, 1.25, k / na)
            R = 0.042 * rr
            x = math.sin(a) * R
            y = math.cos(a) * R - 0.03
            rib = 0.0025 * abs(math.sin(k * math.pi / 2)) * rr
            z = 0.016 * (1 - rr ** 2) * math.cos(a * 0.6) + rib + 0.002
            row.append(p.bm.verts.new(V(x, y, z)))
        vs.append(row)
    for k in range(na):
        p.face([hinge, vs[0][k + 1], vs[0][k]])
    for i in range(nr - 1):
        for k in range(na):
            p.face([vs[i][k], vs[i][k + 1], vs[i + 1][k + 1], vs[i + 1][k]])
    bmesh.ops.contextual_create(p.bm, geom=[e for e in p.bm.edges if e.is_boundary])
    for f in p.bm.faces:
        f.smooth = True
    bmesh.ops.recalc_face_normals(p.bm, faces=p.bm.faces)
    box_uv(p, 0.1)
    return [p]


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


@item(ao_strength=0.4)
def gum():
    from items_weapons import ball
    parts = []
    for c, r in ((V(0, 0, 0.03), 0.032), (V(0.035, 0.02, 0.022), 0.022), (V(-0.032, -0.018, 0.018), 0.019), (V(0.01, -0.035, 0.015), 0.016)):
        parts.append(ball('gum:8a4a10', c, r, sub=3, sz=1.15, noise_amp=r * 0.12, seed=int(r * 1000)))
    return parts


@item(ao_strength=0.9, ao_dist=0.03)
def rope():
    # Kiepillä oleva köysi: litteä spiraali kahdessa kerroksessa.
    pts = []
    turns = 4.2
    N = 220
    for i in range(N):
        t = i / (N - 1)
        a = t * turns * 2 * math.pi
        layer = 0 if t < 0.55 else 1
        rr = 0.068 - 0.007 * (t * turns % 1) * 0 - 0.012 * layer
        pts.append(V(math.cos(a) * rr, math.sin(a) * rr, 0.012 + layer * 0.022 + 0.004 * math.sin(a * 3)))
    pts += [pts[-1] + V(0.03, -0.01, 0.006), pts[-1] + V(0.055, -0.03, 0.01)]
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


@item
def sinew():
    parts = []
    for k in range(5):
        a = 2 * math.pi * k / 5
        pts = []
        for i in range(30):
            t = i / 29
            z = lerp(-0.081, 0.241, t)
            r = 0.006 * (1 - 0.3 * abs(2 * t - 1))
            pts.append(V(math.cos(a + t * 9) * r, math.sin(a + t * 9) * r, z))
        parts.append(tube_path('rope:e0c89a', pts, lambda t: 0.0032 * (1 - 0.5 * abs(2 * t - 1) ** 3), n=6))
    return parts


# --- Taljat ------------------------------------------------------------------------------

def pelt(paint_fn, seed, size=(0.18, 0.18)):
    """Litteä talja: epäsäännöllinen ääriviiva ja jalkaliuskat, hieman poimuilla."""
    R = rng(seed)
    p = Part('fur')
    nr, na = 8, 48
    sx, sy = size
    cen = p.bm.verts.new(V(0, 0, 0.03))
    rows = []
    for i in range(1, nr + 1):
        rr = i / nr
        row = []
        for k in range(na):
            a = 2 * math.pi * k / na
            leg = 0.28 * max(0, math.cos(2 * (a - 0.78))) ** 8
            neck = 0.18 * max(0, math.cos(a - math.pi / 2)) ** 12
            e = 1 + leg + neck + 0.06 * math.sin(a * 5 + seed)
            x = math.cos(a) * sx * rr * e
            y = math.sin(a) * sy * rr * e
            z = 0.03 + 0.012 * math.sin(x * 30 + seed) * math.cos(y * 25) - 0.012 * rr ** 3
            row.append(p.bm.verts.new(V(x, y, z)))
        rows.append(row)
    for k in range(na):
        k1 = (k + 1) % na
        p.face([cen, rows[0][k], rows[0][k1]])
        for i in range(nr - 1):
            p.face([rows[i][k], rows[i + 1][k], rows[i + 1][k1], rows[i][k1]])
    # Alapinta: kopio ohuena nahkakerroksena.
    ret = bmesh.ops.duplicate(p.bm, geom=p.bm.faces[:])
    nv = [g for g in ret['geom'] if isinstance(g, bmesh.types.BMVert)]
    for v in nv:
        v.co.z -= 0.006
    nf = [g for g in ret['geom'] if isinstance(g, bmesh.types.BMFace)]
    bmesh.ops.reverse_faces(p.bm, faces=nf)
    for f in p.bm.faces:
        f.smooth = True
    box_uv(p, 0.3)
    return [p]


def pelt_paint(back, belly, stripe=None, spots_col=None):
    B, W = hexc(back), hexc(belly)
    S = hexc(stripe) if stripe else None

    def f(co, n, mat):
        if mat != 'fur':
            return None
        if n.z < -0.5:
            return hexc(0xc8b49a)  # nahkapuoli
        d = abs(co.x) / 0.2
        col = mixc(B, W, smoothstep(0.45, 0.8, d))
        if S:
            col = mixc(col, S, max(0, 1 - abs(d - 0.42) / 0.06))
        col = mulc(col, 0.85 + 0.25 * nz(co, 25, 2))
        return col
    return f


@item(paint=pelt_paint(0x7a6656, 0x9a8676))
def hide():
    return pelt(None, 11)


@item(paint=pelt_paint(0xc8955a, 0xf2ead8, stripe=0x3a2a1c))
def gazelle_pelt():
    return pelt(None, 12)


@item(paint=pelt_paint(0x8a8478, 0xc8c2b4))
def monkey_pelt():
    return pelt(None, 13)


@item(paint=pelt_paint(0xe0b878, 0xf4ecd8))
def fox_pelt():
    return pelt(None, 14)


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


@item
def leather():
    # Rulla nahkaa nyörillä sidottuna (makaa X-akselin suuntaisesti).
    rings = []
    for i in range(13):
        s = i / 12
        x = lerp(-0.105, 0.105, s)
        pts = []
        for k in range(24):
            a = 2 * math.pi * k / 24
            rr = 0.03 + 0.004 * (a / (2 * math.pi))
            pts.append(V(x, math.cos(a) * rr, 0.034 + math.sin(a) * rr))
        rings.append(pts)
    parts = [loft('leather', rings)]
    flap = Part('leather')
    vs = []
    for i in range(13):
        s = i / 12
        x = lerp(-0.105, 0.105, s) * (1 - 0.1 * math.sin(s * 9))
        vs.append([flap.bm.verts.new(V(x, 0.03 + 0.07 * u, 0.006 + 0.004 * u)) for u in (0, 0.5, 1)])
    for i in range(12):
        for j in range(2):
            flap.face([vs[i][j], vs[i + 1][j], vs[i + 1][j + 1], vs[i][j + 1]])
    box_uv(flap)
    parts.append(flap)
    for x in (-0.05, 0.05):
        parts.append(cord('rope', ellipse_pts(V(x, 0, 0.034), V(0, 1, 0), V(0, 0, 1), 0.034, 0.034, 18), 0.0025))
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
