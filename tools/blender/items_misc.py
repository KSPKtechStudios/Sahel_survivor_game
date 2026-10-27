# Sessio 54: materiaalit ja arvoesineet (kivet, kiteet ym.).
import math
import bpy
from itemlib import V, Vector, Part, from_object, displace, box_uv, transform, Matrix, rng
from registry import item


def stone_paint(co, n, mat):
    """Kirjava kivi (kertoo tekstuurin): rakeita, kvartsijuova ja jäkälää yläpinnalla."""
    if not mat.startswith('stone'):
        return None
    from paint import hexc, mixc, mulc, nz, spots, smoothstep
    k = 0.84 + 0.22 * nz(co, 16, 4)
    g = nz(co, 240, 6, octaves=1)
    k *= 0.78 if g < 0.32 else (1.1 if g > 0.7 else 1.0)
    col = mulc((1.0, 0.97, 0.92), k)
    vein = abs(math.sin((co.x * 0.8 + co.z * 0.6 - co.y * 0.3) * 110 + nz(co, 18, 2) * 3))
    if vein < 0.1:
        col = mixc(col, (1.0, 1.0, 0.97), 1 - vein / 0.1)
    lichen = spots(co, 34, 5, 0.4) * smoothstep(0.25, 0.75, n.z)
    if lichen > 0:
        col = mixc(col, hexc(0xc4bc78), min(1.0, lichen * 1.8))
    return col


def fieldstone(mat, size, seed, cuts=5, sub=4):
    """Pyöristynyt lohkare, jossa muutama tasainen lohkeamispinta."""
    from shapes import facet_cuts
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=sub, radius=1)
    p = from_object(mat, bpy.context.active_object)
    transform(p, Matrix.Diagonal((size[0], size[1], size[2], 1)))
    displace(p, max(size) * 0.11, 0.9 / max(size), seed=seed)
    facet_cuts(p, cuts, (max(size) * 0.08, max(size) * 0.22), seed=seed + 5)
    displace(p, max(size) * 0.02, 4.0 / max(size), seed=seed + 9)
    box_uv(p)
    for f in p.bm.faces:
        f.smooth = True
    return p


@item(paint=stone_paint, ao_strength=0.7, ao_dist=0.08)
def stone():
    # Sessio 56: kenttäkivi lohkeamispinnoin, kvartsijuova ja jäkälää.
    p = fieldstone('stone', (0.15, 0.125, 0.088), 3)
    transform(p, Matrix.Translation(V(0, 0, 0.02)))
    return [p]


def crystal(p, base, axis, r, h, tip, seed):
    """Kuusikulmainen kide: särmiö ja kärki (tasainen varjostus)."""
    R = rng(seed)
    axis = axis.normalized()
    ref = Vector((1, 0, 0)) if abs(axis.x) < 0.9 else Vector((0, 1, 0))
    u = (ref - axis * ref.dot(axis)).normalized()
    v = axis.cross(u)
    bm = p.bm
    rings = []
    for z, sc in ((0, 0.9), (h * 0.15, 1.0), (h, 0.92)):
        pts = []
        for k in range(6):
            a = k * math.pi / 3 + R.uniform(-0.08, 0.08)
            rr = r * sc * R.uniform(0.9, 1.08)
            pts.append(bm.verts.new(base + axis * z + u * math.cos(a) * rr + v * math.sin(a) * rr))
        rings.append(pts)
    top = bm.verts.new(base + axis * (h + tip) + u * R.uniform(-0.2, 0.2) * r)
    bot = bm.verts.new(base - axis * r * 0.3)
    for i in range(2):
        for k in range(6):
            k1 = (k + 1) % 6
            p.face([rings[i][k], rings[i][k1], rings[i + 1][k1], rings[i + 1][k]])
    for k in range(6):
        k1 = (k + 1) % 6
        p.face([rings[2][k], rings[2][k1], top])
        p.face([rings[0][k1], rings[0][k], bot])


@item(ao_strength=0.5)
def ruby():
    p = Part('ruby')
    crystal(p, V(0, 0, 0.0), V(0.05, 0.02, 1), 0.026, 0.07, 0.035, 1)
    crystal(p, V(0.025, 0.012, 0.0), V(0.5, 0.2, 1), 0.014, 0.035, 0.018, 2)
    crystal(p, V(-0.022, -0.01, 0.0), V(-0.55, -0.1, 1), 0.012, 0.03, 0.015, 3)
    box_uv(p)
    for f in p.bm.faces:
        f.smooth = False
    return [p]


# --- Kuitu, nuotio ja arvoesineet ------------------------------------------------------------

from itemlib import lerp, ring, loft  # noqa: E402
from paint import hexc, mixc, mulc, nz, spots, smoothstep  # noqa: E402


def straw_paint(co, n, mat):
    if mat != 'straw':
        return None
    return mulc(mixc(hexc(0xdcc68e), hexc(0xae9458), nz(co, 30, 2)), 0.9 + 0.2 * nz(co, 250, 3))


@item(paint=straw_paint, ao_strength=0.75)
def fiber():
    # Nippu kuivaa kuitua, keskeltä sidottu kierretyllä kuidulla.
    from items_mats import ribbon
    from shapes import cord, ellipse_pts
    R = rng(61)
    parts = []
    for i in range(34):
        a = R.uniform(0, 6.28)
        r0 = R.uniform(0.0, 0.012)
        spread = R.uniform(0.03, 0.09)
        pts = []
        for k in range(9):
            t = k / 8
            z = lerp(-0.05, 0.41, t)
            m = abs(t - 0.42) / 0.58
            rr = r0 + spread * m ** 1.6
            pts.append(V(math.cos(a) * rr + 0.004 * math.sin(t * 9 + i), math.sin(a) * rr, z))
        parts.append(ribbon('straw', pts, lambda t: 0.0022, thick=0.0005, twist=R.uniform(-2, 2)))
    for z in (0.15, 0.162, 0.174):
        parts.append(cord('straw', ellipse_pts(V(0, 0, z), V(1, 0, 0), V(0, 1, 0), 0.016, 0.016, 14), 0.0024))
    return parts


def fire_paint(co, n, mat):
    # Puiden sisäpäät hiiltyneet, tuhka harmaa, hiilet mustia ja hehkuvia.
    r = math.hypot(co.x, co.y)
    if mat == 'ash':
        ember = smoothstep(0.62, 0.8, nz(co, 70, 3)) * (1 - smoothstep(0.03, 0.11, r))
        base = mixc(hexc(0x8a8680), hexc(0x2a2624), nz(co, 40) * 0.6 + 0.5 * (1 - smoothstep(0.02, 0.12, r)))
        return mixc(base, hexc(0xc8501a), ember * 0.7)
    if mat == 'coal':
        return mixc(hexc(0x1a1614), hexc(0xb8481a), smoothstep(0.66, 0.85, nz(co, 120, 7)) * 0.6)
    if mat in ('bark', 'endgrain'):
        char = 1 - smoothstep(0.03, 0.12, r)
        return mixc(hexc(0xffffff) if mat == 'bark' else hexc(0xc8a878), hexc(0x16120e), char * (0.8 + 0.2 * nz(co, 80)))
    return stone_paint(co, n, mat)


@item(paint=fire_paint)
def campfire():
    # Sessio 56: isommat lohkokivet kehänä, puut kotana, hiillos ja tuhka.
    from items_mats import branch
    parts = []
    R = rng(71)
    for k in range(10):
        a = 2 * math.pi * k / 10 + R.uniform(-0.12, 0.12)
        s = R.uniform(0.045, 0.062)
        p = fieldstone('stone', (s * 1.3, s, s * 0.85), 40 + k, cuts=3, sub=3)
        transform(p, Matrix.Translation(V(math.cos(a) * 0.24, math.sin(a) * 0.24, s * 0.45)) @ Matrix.Rotation(a + R.uniform(-0.3, 0.3), 4, 'Z'))
        parts.append(p)
    # Kota: halot nojaavat toisiinsa keskellä.
    for k in range(6):
        a = 2 * math.pi * k / 6 + 0.3 + R.uniform(-0.15, 0.15)
        d = V(math.cos(a), math.sin(a), 0)
        foot = d * R.uniform(0.15, 0.18) + V(0, 0, 0.012)
        tip = d * -0.02 + V(0, 0, R.uniform(0.2, 0.24))
        path = [foot.lerp(tip, t) + V(0, 0, 0.006 * math.sin(t * 3.1)) for t in (0, 0.33, 0.66, 1.0)]
        parts += branch('bark', 'endgrain', path, R.uniform(0.016, 0.02), 0.012, n=9)
    # Risuja ja hiiliä keskellä.
    for k in range(5):
        a = R.uniform(0, 6.28)
        c = V(math.cos(a) * R.uniform(0.0, 0.06), math.sin(a) * R.uniform(0.0, 0.06), 0.012)
        q = ball('coal', c, R.uniform(0.011, 0.017), sub=2, sx=1.4, sz=0.8, noise_amp=0.002, seed=k)
        parts.append(q)
    for k in range(4):
        a = R.uniform(0, 6.28)
        d = V(math.cos(a), math.sin(a), 0)
        path = [d * -0.08 + V(0, 0, 0.008), d * 0.0 + V(0, 0, 0.03), d * 0.07 + V(0, 0, 0.05)]
        parts += branch('bark', 'endgrain', path, 0.006, 0.004, n=6)
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=3, radius=1)
    p = from_object('ash', bpy.context.active_object)
    transform(p, Matrix.Diagonal((0.16, 0.16, 0.022, 1)))
    displace(p, 0.006, 25, seed=3)
    box_uv(p)
    parts.append(p)
    return parts


@item(ao_strength=0.6)
def gold_nugget():
    # Litteähkö, kuoppainen hippu; kullan sävy annetaan materiaalipaikassa.
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=4, radius=1)
    p = from_object('gold:f2c45c', bpy.context.active_object)
    transform(p, Matrix.Diagonal((0.075, 0.055, 0.05, 1)))
    displace(p, 0.022, 11, seed=5)
    displace(p, 0.006, 40, seed=6)
    displace(p, 0.0015, 120, seed=7)
    transform(p, Matrix.Translation(V(-0.03, 0.028, 0.06)) @ Matrix.Rotation(0.5, 4, 'Y'))
    box_uv(p)
    for f in p.bm.faces:
        f.smooth = True
    return [p]


# Kaurikotilot (rahakotilo): pinon kunkin kotilon paikalliskoordinaatit maalausta varten.
COWRIES = []
_CL, _CSEG = 0.027, 32


def cowrie_shell():
    """Munamainen kuori X-suunnassa: kupera selkä, litteä pohja ja hammastettu rako."""
    rings = []
    for i in range(_CSEG + 1):
        s = i / _CSEG
        x = lerp(-_CL, _CL, s)
        prof = max(0.08, math.sin(math.pi * s) ** 0.6)
        ry, top, bot = 0.019 * prof, 0.016 * prof, 0.0065 * prof
        pts = []
        for k in range(40):
            a = 2 * math.pi * k / 40
            y = math.cos(a) * ry
            z = math.sin(a) * (top if math.sin(a) > 0 else bot)
            if math.sin(a) < 0:
                z += 0.0035 * prof * max(0.0, 1 - abs(y) / 0.0045)
            pts.append(V(x, y, z))
        rings.append(pts)
    return loft('shell', rings)


def cowrie_paint(co, n, mat):
    if mat != 'shell':
        return None
    lc, ln = Vector(co), Vector(n)
    for M, Mi in COWRIES:
        q = Mi @ Vector(co)
        if abs(q.x) < 0.03 and abs(q.y) < 0.022 and -0.01 < q.z < 0.02:
            lc, ln = q, (Mi.to_3x3() @ Vector(n)).normalized()
            break
    col = mixc(hexc(0xf4e8c6), hexc(0xe0c486), nz(lc, 70) * 0.8)
    if ln.z < -0.2 or lc.z < -0.002:
        col = mixc(col, hexc(0xf8f2e2), 0.75)
    if lc.z < 0.0005:
        d = abs(lc.y)
        h = 2 * _CL / _CSEG
        tooth = 0.5 + 0.5 * math.cos(math.pi * (lc.x + _CL) / h)
        if d < 0.0012:
            col = hexc(0x4a2c16)
        elif d < 0.0042:
            col = mixc(hexc(0x8a6038), hexc(0xfaf4e8), tooth)
    return col


@item(paint=cowrie_paint, ao_strength=0.6)
def cowrie():
    COWRIES.clear()
    parts = []
    # (paikka, kierto Z, kallistus X); yksi kotilo ylösalaisin, jotta rako näkyy.
    for c, a, tilt in ((V(-0.035, 0.0, 0.0065), 0.4, 0.0), (V(0.012, 0.02, 0.016), -0.5, math.pi), (V(-0.004, -0.034, 0.008), 1.9, 0.25)):
        b = cowrie_shell()
        M = Matrix.Translation(c) @ Matrix.Rotation(a, 4, 'Z') @ Matrix.Rotation(tilt, 4, 'X')
        transform(b, M)
        COWRIES.append((M, M.inverted()))
        parts.append(b)
    return parts


@item(ao_strength=0.7)
def bronze_bracelet():
    # Avoin pronssinen rannerengas: paksumpi keskeltä, nupit päissä, uurrettu pinta.
    from items_weapons import ball
    R, z0, gap, seg = 0.07, 0.06, 0.5, 72
    rings = []
    for i in range(seg + 1):
        t = i / seg
        a = lerp(gap / 2, 2 * math.pi - gap / 2, t)
        c = V(R * math.cos(a), R * math.sin(a), z0)
        d = V(-math.sin(a), math.cos(a), 0)
        r = (0.0055 + 0.0035 * math.sin(math.pi * t)) * (1 + 0.05 * math.sin(a * 80))
        # u = Z pitää renkaan vaiheen samana koko kaaren matkalla.
        rings.append(ring(c, V(0, 0, 1), d.cross(V(0, 0, 1)), r, r * 1.15, 12))
    parts = [loft('brass:a8906c', rings, cap0=True, cap1=True)]
    for a in (gap / 2, -gap / 2):
        parts.append(ball('brass:a8906c', V(R * math.cos(a), R * math.sin(a), z0), 0.0078, sub=2))
    for q in parts:
        transform(q, Matrix.Rotation(0.25, 4, 'X'))
    return parts


def clock_paint(co, n, mat):
    if mat == 'paste':
        return hexc(0xf2ecdc)
    return None


@item(paint=clock_paint, ao_strength=0.6)
def clock():
    # Messinkinen taskukello pystyssä (taulu kohti -Y = pelin +Z).
    from shapes import cord, ellipse_pts
    from items_weapons import bar
    parts = []
    R = 0.06
    rings = []
    for i, (r, y) in enumerate([(0.05, 0.016), (0.058, 0.012), (0.062, 0.0), (0.058, -0.008), (0.054, -0.011)]):
        rings.append(ring(V(0, y, 0.075), V(1, 0, 0), V(0, 0, 1), r, r, 40))
    parts.append(loft('brass', rings))
    face = Part('paste')
    cen = face.bm.verts.new(V(0, -0.0115, 0.075))
    vs = [face.bm.verts.new(V(math.cos(a) * 0.052, -0.0115, 0.075 + math.sin(a) * 0.052)) for a in [2 * math.pi * k / 40 for k in range(40)]]
    for k in range(40):
        face.face([cen, vs[k], vs[(k + 1) % 40]])
    box_uv(face, 0.1)
    parts.append(face)
    for k in range(12):
        a = 2 * math.pi * k / 12
        c = V(math.cos(a) * 0.044, -0.0125, 0.075 + math.sin(a) * 0.044)
        t = bar('iron', -0.004, 0.004, 0, 0.0008, 0.0012, seg=1, power=2)
        transform(t, Matrix.Translation(c) @ Matrix.Rotation(-a, 4, 'Y'))
        parts.append(t)
    for ang, L in ((1.2, 0.03), (2.6, 0.04)):
        h = bar('iron', 0, L, 0, 0.0008, 0.0016, seg=1, power=2)
        transform(h, Matrix.Translation(V(0, -0.013, 0.075)) @ Matrix.Rotation(-ang, 4, 'Y'))
        parts.append(h)
    parts.append(loft('brass', [ring(V(0, 0, z), V(1, 0, 0), V(0, 1, 0), r, r, 12) for z, r in ((0.135, 0.008), (0.145, 0.009), (0.152, 0.006))]))
    parts.append(cord('brass', ellipse_pts(V(0, 0, 0.162), V(1, 0, 0), V(0, 0, 1), 0.014, 0.012, 20), 0.0025))
    return parts


def ball(mat, c, r, sub=3, sx=1.0, sy=1.0, sz=1.0, noise_amp=0.0, seed=0):
    from items_weapons import ball as _ball
    return _ball(mat, c, r, sub=sub, sx=sx, sy=sy, sz=sz, noise_amp=noise_amp, seed=seed)
