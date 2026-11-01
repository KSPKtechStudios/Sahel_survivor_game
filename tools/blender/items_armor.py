# Sessio 54: panssarit (kypärät, ylävartalo, jalat). Malleja käyttävät vain
# kuvakkeet ja pudotukset. Etupuoli -Y (pelissä +Z, kuvakekameraa kohti).
# Kypärän pohja on noin pään keskikohdalla (z = 0), kuten vanhoissa malleissa.
import math
from mathutils import noise
from itemlib import V, Vector, Matrix, lerp, ring, loft, transform
from registry import item
from shapes import cord, ellipse_pts, tube_path
from paint import hexc, mixc, mulc, smoothstep
from items_weapons import ball


def front(a):
    """Etupuolisuus 0..1 (renkaan piste cos a * rx, sin a * ry; etu = -Y)."""
    return max(0.0, -math.sin(a))


FRONT = -math.pi / 2


# --- Apuosat ---------------------------------------------------------------------------------

class Shell:
    """Kypärän kuori pyörähdysprofiilista [(rs, z), ...] reunasta laelle.
    lift(a) nostaa alareunaa (kasvoaukko) tai laskee sitä (korvaläpät);
    vaikutus hiipuu korkeuteen lift_top. back siirtää lakea taaksepäin."""

    def __init__(self, prof, rx, ry, thick=0.005, n=48, lift=None, lift_top=0.0, back=0.0):
        self.prof, self.rx, self.ry, self.thick, self.n = prof, rx, ry, thick, n
        self.lift, self.lift_top, self.back = lift, lift_top, back
        self.top = prof[-1][1]

    def rs_at(self, z):
        p = self.prof
        if z <= p[0][1]:
            return p[0][0]
        for (r0, z0), (r1, z1) in zip(p, p[1:]):
            if z <= z1:
                return lerp(r0, r1, (z - z0) / (z1 - z0))
        return p[-1][0]

    def P(self, a, z):
        rs = self.rs_at(z)
        yb = self.back * max(0.0, z / self.top) ** 2
        return V(math.cos(a) * self.rx * rs, math.sin(a) * self.ry * rs + yb, z)

    def N(self, a, z, e=0.002):
        da = self.P(a + e, z) - self.P(a - e, z)
        dz = self.P(a, z + e) - self.P(a, z - e)
        return da.cross(dz).normalized()

    def _ring(self, rs, z, inner):
        pts = []
        zmin = self.prof[0][1]
        for k in range(self.n):
            a = 2 * math.pi * k / self.n
            zz, r = z, rs
            if self.lift and z < self.lift_top:
                w = (self.lift_top - z) / (self.lift_top - zmin)
                L = self.lift(a)
                zz = z + L * w
                if r > 1.0:
                    r = lerp(r, 1.0, min(1.0, max(0.0, L * 12)))
            ex, ey = self.rx * r, self.ry * r
            if inner:
                ex, ey = max(ex * 0.3, ex - self.thick), max(ey * 0.3, ey - self.thick)
                if zz > 0:
                    zz *= 1 - self.thick / self.top
            yb = self.back * max(0.0, zz / self.top) ** 2
            pts.append(V(math.cos(a) * ex, math.sin(a) * ey + yb, zz))
        return pts

    def build(self, mat):
        outer = [self._ring(rs, z, False) for rs, z in self.prof]
        inner = [self._ring(rs, z, True) for rs, z in self.prof]
        rings = outer + inner[::-1] + [[p.copy() for p in outer[0]]]
        return loft(mat, rings, cap0=False, cap1=False)


def band_loop(mat, rx, ry, z, h, t, n=64, peak=None, power=4.0):
    """Suljettu nauha ellipsin ympäri (reunus, vyö); poikkileikkaus h x t.
    peak(a) kasvattaa nauhaa ylöspäin (otsaripan kärki)."""
    rings = []
    for k in range(n + 1):
        a = 2 * math.pi * (k % n) / n
        rd = V(math.cos(a) / rx, math.sin(a) / ry, 0).normalized()
        c = V(math.cos(a) * rx, math.sin(a) * ry, z) + rd * (t / 2)
        hh = h + (peak(a) if peak else 0.0)
        rings.append(ring(c + V(0, 0, (hh - h) / 2), V(0, 0, 1), rd, hh / 2, t / 2, 8, power=power))
    rings[-1] = [p.copy() for p in rings[0]]
    return loft(mat, rings, cap0=False, cap1=False)


def strip(mat, pts, nrms, w, h, n=8):
    """Litteä lista pintaa pitkin (harjanne, nenäsuoja, kehikko)."""
    rings = []
    m = len(pts)
    for i in range(m):
        d = (pts[min(m - 1, i + 1)] - pts[max(0, i - 1)]).normalized()
        u = nrms[i] - d * nrms[i].dot(d)
        u.normalize()
        v = d.cross(u)
        ww = w(i / (m - 1)) if callable(w) else w
        rings.append(ring(pts[i] + u * (h / 2), u, v, h / 2, ww / 2, n, power=4))
    return loft(mat, rings)


def oriented(p, c, side, up, nrm):
    """Siirtää origossa tehdyn osan pisteeseen c (X = side, Y = up, Z = nrm)."""
    R = Matrix((side, up, nrm)).transposed().to_4x4()
    transform(p, Matrix.Translation(c) @ R)
    return p


def frame_rings(path, rfn, n, mod=None):
    rings = []
    m = len(path)
    for i, c in enumerate(path):
        t = i / (m - 1)
        d = (path[min(m - 1, i + 1)] - path[max(0, i - 1)]).normalized()
        ref = Vector((1, 0, 0)) if abs(d.x) < 0.9 else Vector((0, 1, 0))
        u = (ref - d * ref.dot(d)).normalized()
        v = d.cross(u)
        pts = []
        for k in range(n):
            a = 2 * math.pi * k / n
            r = rfn(t) * (mod(t, a) if mod else 1.0)
            pts.append(c + u * (math.cos(a) * r) + v * (math.sin(a) * r))
        rings.append(pts)
    return rings


def hollow_tube(mat, path, rfn, n=20, inset=0.004, depth=0.02, mod=None, open0=False):
    """Putki, jonka loppupää (ja halutessa alkupää) on ontto (hiha, lahje)."""
    rings = frame_rings(path, rfn, n, mod)
    d = (path[-1] - path[-2]).normalized()
    k = (rfn(1.0) - inset) / rfn(1.0)
    rings.append([path[-1] - d * depth + (p - path[-1]) * k for p in rings[-1]])
    if open0:
        d0 = (path[1] - path[0]).normalized()
        k0 = (rfn(0.0) - inset) / rfn(0.0)
        rings.insert(0, [path[0] + d0 * depth + (p - path[0]) * k0 for p in rings[0]])
    return loft(mat, rings)


def body(mat, prof, n=48, hem=None, power=2.4):
    """Vartalo ylhäältä alas [(z, rx, ry), ...]: ensimmäinen ja viimeinen
    rengas ovat kaula- ja helma-aukon sisäpintoja. hem(k) laskee helmaa."""
    rings = []
    m = len(prof)
    for i, (z, rx, ry) in enumerate(prof):
        # u x v = -Z: renkaat myötäpäivään ylhäältä katsottuna, koska loft kulkee alas.
        pts = ring(V(0, 0, z), V(1, 0, 0), V(0, -1, 0), rx, ry, n, power=power)
        if hem and i >= m - 2:
            for k in range(n):
                pts[k].z += hem(k)
        rings.append(pts)
    return loft(mat, rings)


def prof_at(prof, z):
    """(rx, ry) korkeudella z profiilista, joka kulkee ylhäältä alas."""
    body_part = prof[2:-1]
    for (z0, rx0, ry0), (z1, rx1, ry1) in zip(body_part, body_part[1:]):
        if z1 <= z <= z0:
            t = (z0 - z) / (z0 - z1)
            return lerp(rx0, rx1, t), lerp(ry0, ry1, t)
    return body_part[-1][1], body_part[-1][2]


def front_y(prof, x, z, power=2.4):
    rx, ry = prof_at(prof, z)
    q = max(0.0, 1 - abs(x / rx) ** power)
    return -ry * q ** (1 / power)


# --- Maalaus ---------------------------------------------------------------------------------

def _cell(co, scale, seed):
    d, pts = noise.voronoi(Vector(co) * scale + Vector((seed * 1.3, seed * 2.1, seed * 0.7)), distance_metric='DISTANCE')
    p = pts[0]
    h = (math.sin(p.x * 12.9898 + p.y * 78.233 + p.z * 37.719) * 43758.5453) % 1
    return d[1] - d[0], h


def rag_paint(co, n, mat):
    """Riepu: eri sävyisiä paikkoja ja tummat saumat paikkojen välissä."""
    if not mat.startswith('cloth'):
        return None
    edge, h = _cell(co, 14, 3)
    col = mulc(mixc(hexc(0xffffff), hexc(0xd2b894), h), 0.8 + 0.3 * h)
    if edge < 0.06:
        col = mulc(col, 0.55 + 0.45 * edge / 0.06)
    return col


def horn_paint(co, n, mat):
    if mat == 'bone:d6c4a0':
        return mixc(hexc(0xffffff), hexc(0x4a3828), smoothstep(0.1, 0.23, co.z))
    return None


SLIT = (-0.0415, -0.0285)


IRON = 'steel:808080'


def iron_helm_paint(co, n, mat):
    if mat == IRON and co.y < -0.08 and SLIT[0] - 0.0005 < co.z < SLIT[1] + 0.0005:
        return hexc(0x141414)
    return None


# --- Kypärät ---------------------------------------------------------------------------------

@item(paint=rag_paint, ao_strength=0.8, ao_dist=0.08)
def rag_hood():
    sh = Shell([(1.32, -0.14), (1.18, -0.11), (1.06, -0.075), (1.0, -0.035), (1.0, 0.0), (0.97, 0.035),
                (0.9, 0.07), (0.76, 0.1), (0.56, 0.127), (0.32, 0.145), (0.08, 0.155)],
               0.128, 0.14, thick=0.007, lift=lambda a: 0.115 * front(a) ** 1.6, lift_top=0.02, back=0.035)
    parts = [sh.build('cloth:8a6a4a')]
    # Hupun suippo pää taakse.
    parts.append(tube_path('cloth:8a6a4a', [V(0, 0.09, 0.11), V(0, 0.15, 0.095), V(0, 0.2, 0.05), V(0, 0.225, 0.0)],
                           lambda t: 0.042 * (1 - t) ** 0.9 + 0.004, n=14))
    # Kaulanauha.
    for sx in (-1, 1):
        c = V(sx * 0.07, -0.13, -0.05)
        parts.append(tube_path('rope:b09a70', [c, c + V(sx * 0.004, -0.008, -0.04), c + V(sx * 0.01, -0.006, -0.075)], lambda t: 0.0028, n=6))
    return parts


@item(ao_strength=0.75, ao_dist=0.06)
def leather_cap():
    sh = Shell([(1.0, -0.035), (1.0, -0.01), (0.98, 0.02), (0.92, 0.05), (0.8, 0.08), (0.6, 0.105), (0.35, 0.12), (0.05, 0.128)],
               0.122, 0.135, thick=0.005, lift=lambda a: -0.045 * abs(math.cos(a)) ** 8, lift_top=0.0)
    parts = [sh.build('leather')]
    # Paneelien saumat.
    for i in range(6):
        a = FRONT + 2 * math.pi * i / 6
        zs = [lerp(-0.012, 0.122, j / 14) for j in range(15)]
        parts.append(cord('leather:5a3a24', [sh.P(a, z) + sh.N(a, z) * 0.0012 for z in zs], 0.0022, n=5, closed=False))
    parts.append(band_loop('leather:5a3a24', 0.122, 0.135, -0.034, 0.016, 0.004))
    parts.append(ball('leather:5a3a24', V(0, 0, 0.127), 0.011, sub=2, sz=0.6))
    # Korvaläppien nauhat.
    for sx in (-1, 1):
        c = V(sx * 0.124, 0, -0.075)
        parts.append(tube_path('leather:5a3a24', [c, c + V(-sx * 0.004, -0.01, -0.035), c + V(-sx * 0.008, -0.02, -0.07)], lambda t: 0.0028, n=6))
    return parts


@item(paint=horn_paint, ao_strength=0.8, ao_dist=0.07)
def bone_helm():
    sh = Shell([(1.0, -0.04), (1.0, -0.01), (0.98, 0.02), (0.92, 0.05), (0.8, 0.08), (0.6, 0.105), (0.35, 0.122), (0.05, 0.13)],
               0.124, 0.137, thick=0.005)
    parts = [sh.build('leather:7a5a40')]
    # Luulevyt kahdessa rivissä.
    for row, (z, cnt, size) in enumerate(((0.02, 9, 0.036), (0.075, 7, 0.03))):
        for i in range(cnt):
            a = FRONT + 2 * math.pi * (i + 0.5 * row) / cnt
            c = sh.P(a, z)
            nrm = sh.N(a, z)
            up = (sh.P(a, z + 0.01) - sh.P(a, z - 0.01)).normalized()
            side = up.cross(nrm).normalized()
            pl = ball('bone:e8dcc0', V(0, 0, 0), size, sub=2, sx=0.72, sy=1.0, sz=0.2)
            parts.append(oriented(pl, c + nrm * 0.003, side, nrm.cross(side), nrm))
    # Selkänikamaharja keskellä.
    for i in range(7):
        t = i / 6
        a = FRONT if t < 0.5 else -FRONT
        z = lerp(0.07, 0.13, 1 - abs(t - 0.5) * 2)
        parts.append(ball('bone:e0d2b4', sh.P(a, z) + V(0, 0, 0.008), 0.014, sub=2, sx=0.75, sz=0.75))
    # Hampaat otsan reunassa.
    for i in range(9):
        a = FRONT + lerp(-0.7, 0.7, i / 8)
        c = sh.P(a, -0.03) + sh.N(a, -0.03) * 0.003
        out = sh.N(a, -0.03) * 0.006
        L = 0.03 - 0.012 * abs(i - 4) / 4
        parts.append(tube_path('bone:f0e6d0', [c, c + out + V(0, 0, -L * 0.6), c + out * 0.6 + V(0, 0, -L)],
                               lambda t: 0.0065 * (1 - t) ** 0.8 + 0.0005, n=7))
    parts.append(band_loop('leather:5a3a24', 0.124, 0.137, -0.04, 0.016, 0.004))
    # Sarvet.
    for sx in (-1, 1):
        path = [V(sx * 0.1, 0.01, 0.05), V(sx * 0.16, 0.0, 0.08), V(sx * 0.2, -0.01, 0.13), V(sx * 0.21, -0.03, 0.19), V(sx * 0.19, -0.05, 0.235)]
        parts.append(tube_path('bone:d6c4a0', path, lambda t: (0.024 * (1 - t) ** 0.85 + 0.0015) * (1 + 0.07 * math.sin(t * 46)), n=12))
    return parts


@item(ao_strength=0.7, ao_dist=0.06)
def copper_helm():
    sh = Shell([(1.0, -0.03), (1.0, 0.0), (0.97, 0.03), (0.9, 0.06), (0.78, 0.09), (0.62, 0.118), (0.44, 0.142), (0.25, 0.162), (0.05, 0.18)],
               0.125, 0.138, thick=0.004)
    trim = 'copper:c8a090'
    parts = [sh.build('copper'), band_loop(trim, 0.125, 0.138, -0.026, 0.022, 0.004)]
    for i in range(4):
        a = FRONT + i * math.pi / 2
        zs = [lerp(-0.014, 0.172, j / 16) for j in range(17)]
        parts.append(strip(trim, [sh.P(a, z) for z in zs], [sh.N(a, z) for z in zs], lambda t: 0.02 * (1 - 0.6 * t), 0.003))
    # Nenäsuoja.
    zs = [0.03, 0.0, -0.03, -0.06, -0.095]
    pts = [sh.P(FRONT, z) if z > -0.03 else V(0, -0.138 - 0.004, z) for z in zs]
    parts.append(strip(trim, pts, [V(0, -1, 0)] * 5, lambda t: 0.022 + 0.01 * t * t, 0.004))
    for i in range(14):
        a = 2 * math.pi * i / 14
        parts.append(ball(trim, V(math.cos(a) * 0.1295, math.sin(a) * 0.1425, -0.015), 0.0038, sub=1))
    parts.append(ball(trim, V(0, 0, 0.18), 0.009, sub=2))
    return parts


@item(ao_strength=0.8, ao_dist=0.08)
def chain_coif():
    sh = Shell([(1.42, -0.16), (1.24, -0.125), (1.08, -0.085), (1.01, -0.045), (1.0, 0.0), (0.97, 0.035), (0.9, 0.07),
                (0.78, 0.1), (0.58, 0.125), (0.33, 0.14), (0.06, 0.148)],
               0.13, 0.142, thick=0.006, lift=lambda a: 0.13 * front(a) ** 1.8, lift_top=0.02)
    return [sh.build('chain')]


@item(paint=iron_helm_paint, ao_strength=0.75, ao_dist=0.07)
def iron_helm():
    prof = [(1.0, -0.13), (1.0, -0.1), (1.0, -0.06), (1.0, -0.043), (1.0, SLIT[0]), (1.0, SLIT[1]), (1.0, -0.027),
            (0.995, 0.0), (0.97, 0.04), (0.9, 0.075), (0.76, 0.1), (0.5, 0.118), (0.06, 0.125)]
    sh = Shell(prof, 0.13, 0.14, thick=0.005)
    p = sh.build(IRON)
    # Silmärako painetaan sisään.
    for v in p.bm.verts:
        if v.co.y < -0.08 and SLIT[0] - 1e-4 < v.co.z < SLIT[1] + 1e-4:
            r = math.hypot(v.co.x / 0.13, v.co.y / 0.14)
            if r > 0.98:
                v.co.x *= 0.95
                v.co.y *= 0.95
    parts = [p]
    zs = [lerp(0.122, -0.125, j / 20) for j in range(21)]
    parts.append(strip('steel', [sh.P(FRONT, z) for z in zs], [sh.N(FRONT, z) for z in zs], 0.016, 0.004))
    parts.append(band_loop('steel', 0.13, 0.14, -0.128, 0.014, 0.004))
    parts.append(band_loop('steel', 0.13, 0.14, -0.006, 0.014, 0.004))
    for i in range(16):
        a = 2 * math.pi * (i + 0.5) / 16
        parts.append(ball('steel', V(math.cos(a) * 0.1345, math.sin(a) * 0.1445, 0.0), 0.0036, sub=1))
    return parts


@item(ao_strength=0.5, ao_dist=0.04)
def ruby_circlet():
    parts = [band_loop('iron', 0.104, 0.118, 0.0, 0.014, 0.0035, n=96, peak=lambda a: 0.03 * front(a) ** 14)]
    c = V(0, -0.1215, 0.023)
    parts.append(cord('iron', ellipse_pts(c, V(1, 0, 0), V(0, 0, 1), 0.012, 0.0165, 20), 0.0022))
    parts.append(ball('ruby', c + V(0, -0.0025, 0), 0.0125, sub=1, sx=0.82, sy=0.55, sz=1.22))
    return parts


# --- Ylävartalo ------------------------------------------------------------------------------

T_PROF = [
    (0.300, 0.050, 0.040), (0.343, 0.058, 0.047), (0.350, 0.085, 0.062), (0.344, 0.125, 0.078),
    (0.328, 0.157, 0.091), (0.300, 0.171, 0.100), (0.250, 0.173, 0.104), (0.190, 0.165, 0.101),
    (0.120, 0.151, 0.095), (0.060, 0.143, 0.091), (0.000, 0.146, 0.093), (0.025, 0.139, 0.086),
]


def sleeves(mat, r0=0.052, r1=0.046, end=(0.25, 0.17), mod=None):
    out = []
    for sx in (-1, 1):
        path = [V(sx * 0.13, 0, 0.305), V(sx * lerp(0.13, end[0], 0.5), 0, lerp(0.305, end[1], 0.5) + 0.01), V(sx * end[0], 0, end[1])]
        out.append(hollow_tube(mat, path, lambda t: lerp(r0, r1, t), n=20, mod=mod))
    return out


def belt(mat, z, buckle=None, h=0.03):
    rx, ry = prof_at(T_PROF, z)
    parts = [band_loop(mat, rx, ry, z - h / 2, h, 0.005)]
    if buckle:
        parts.append(cord(buckle, ellipse_pts(V(0, -ry - 0.007, z), V(1, 0, 0), V(0, 0, 1), 0.017, 0.015, 14), 0.0026))
    return parts


@item(paint=rag_paint, ao_strength=0.8, ao_dist=0.08)
def rag_tunic():
    jag = [0.012 + 0.03 * abs(math.sin(k * 2.1) * math.sin(k * 0.7 + 1.0)) + (0.012 if k % 3 == 0 else 0.0) for k in range(48)]
    parts = [body('cloth:8a6a4a', T_PROF, hem=lambda k: -jag[k])]
    parts += sleeves('cloth:8a6a4a', 0.054, 0.05)
    # Köysivyö ja solmu.
    rx, ry = prof_at(T_PROF, 0.06)
    parts.append(cord('rope', ellipse_pts(V(0, 0, 0.06), V(1, 0, 0), V(0, 1, 0), rx + 0.004, ry + 0.004, 40), 0.0055, n=8))
    k = V(0.03, -ry - 0.008, 0.06)
    parts.append(ball('rope', k, 0.011, sub=2, sy=0.8))
    for dx in (-0.006, 0.01):
        parts.append(tube_path('rope', [k, k + V(dx, -0.004, -0.04), k + V(dx * 1.6, -0.006, -0.085)], lambda t: 0.0045, n=6))
    return parts


@item(ao_strength=0.75, ao_dist=0.07)
def leather_vest():
    parts = [body('leather', T_PROF)]
    # Etuaukon reunat ja nyörit.
    zs = [lerp(0.33, 0.06, j / 18) for j in range(19)]
    for sx in (-1, 1):
        x = sx * 0.018
        parts.append(strip('leather:7a5434', [V(x, front_y(T_PROF, x, z), z) for z in zs], [V(0, -1, 0)] * 19, 0.014, 0.003))
    lace = []
    for j in range(13):
        z = lerp(0.32, 0.075, j / 12)
        x = 0.012 if j % 2 else -0.012
        lace.append(V(x, front_y(T_PROF, x, z) - 0.0045, z))
    parts.append(cord('rope:5a4030', lace, 0.0017, n=5, closed=False))
    # Niitit.
    for z in (0.14, 0.19, 0.24, 0.29):
        for x in (-0.1, -0.06, 0.06, 0.1):
            parts.append(ball('brass', V(x, front_y(T_PROF, x, z) - 0.001, z), 0.0052, sub=1, sy=0.6))
    parts += belt('leather:4a3020', 0.035, buckle='iron')
    return parts


@item(ao_strength=0.75, ao_dist=0.07)
def copper_scale():
    parts = [body('scales', T_PROF)]
    parts += sleeves('leather', 0.054, 0.048)
    parts.append(band_loop('leather:6a4a30', 0.066, 0.052, 0.338, 0.014, 0.006))
    parts += belt('leather:4a3020', 0.035, buckle='copper')
    return parts


@item(ao_strength=0.8, ao_dist=0.07)
def chainmail():
    parts = [body('chain', T_PROF)]
    parts += sleeves('chain', 0.054, 0.046, end=(0.275, 0.125))
    parts += belt('leather:4a3020', 0.04, buckle='iron')
    return parts


@item(ao_strength=0.75, ao_dist=0.07)
def iron_plate():
    parts = [body(IRON, T_PROF, power=2.2)]
    parts += sleeves('chain', 0.05, 0.046)
    zs = [lerp(0.335, 0.03, j / 20) for j in range(21)]
    pts = [V(0, front_y(T_PROF, 0, z, 2.2), z) for z in zs]
    parts.append(strip('steel', pts, [V(0, -1, 0)] * 21, 0.014, 0.004))
    # Olkasuojat kolmesta päällekkäisestä kuorilevystä.
    for sx in (-1, 1):
        for i, (x, z, k) in enumerate(((0.15, 0.3, 1.0), (0.19, 0.272, 0.86), (0.225, 0.24, 0.72))):
            prof = [(1.0, 0.0), (0.97, 0.012 * k), (0.88, 0.026 * k), (0.7, 0.04 * k), (0.42, 0.05 * k), (0.06, 0.054 * k)]
            p = Shell(prof, 0.088 * k, 0.082 * k, thick=0.004, n=32).build(IRON)
            transform(p, Matrix.Translation(V(sx * x, 0, z)) @ Matrix.Rotation(sx * (0.45 + 0.25 * i), 4, 'Y'))
            parts.append(p)
    # Helmalevyt ja kaulus.
    for z, grow in ((0.012, 0.004), (-0.02, 0.011)):
        rx, ry = prof_at(T_PROF, 0.0)
        parts.append(band_loop(IRON, rx + grow, ry + grow, z, 0.03, 0.006))
        for i in range(10):
            a = 2 * math.pi * (i + 0.5) / 10
            parts.append(ball('steel', V(math.cos(a) * (rx + grow + 0.0065), math.sin(a) * (ry + grow + 0.0065), z + 0.015), 0.0035, sub=1))
    parts.append(band_loop('steel', 0.06, 0.049, 0.338, 0.012, 0.005))
    return parts


# --- Jalat -----------------------------------------------------------------------------------

P_PROF = [
    (0.300, 0.104, 0.070), (0.335, 0.117, 0.082), (0.330, 0.124, 0.088), (0.290, 0.128, 0.090),
    (0.240, 0.126, 0.089), (0.200, 0.112, 0.078), (0.180, 0.090, 0.062),
]


def leg_path(sx, z0=0.24, z1=-0.045, seg=10):
    return [V(sx * lerp(0.062, 0.07, i / seg), -0.006 * math.sin(math.pi * i / seg), lerp(z0, z1, i / seg)) for i in range(seg + 1)]


def leg_r(t):
    return lerp(0.064, 0.045, t) * (1 + 0.05 * math.exp(-((t - 0.4) / 0.08) ** 2))


def pants(mat, belt_mat, buckle=None):
    parts = [loft(mat, [ring(V(0, 0, z), V(1, 0, 0), V(0, -1, 0), rx, ry, 40, power=2.3) for z, rx, ry in P_PROF])]
    for sx in (-1, 1):
        parts.append(hollow_tube(mat, leg_path(sx), leg_r, n=20))
    parts.append(band_loop(belt_mat, 0.118, 0.084, 0.309, 0.026, 0.005))
    if buckle:
        parts.append(cord(buckle, ellipse_pts(V(0, -0.084 - 0.007, 0.322), V(1, 0, 0), V(0, 0, 1), 0.016, 0.014, 14), 0.0025))
    return parts


@item(paint=rag_paint, ao_strength=0.8, ao_dist=0.06)
def rag_wraps():
    parts = []
    for sx in (-1, 1):
        path = leg_path(sx, 0.22, -0.05, 8)

        def r(t):
            return lerp(0.054, 0.046, t)
        parts.append(hollow_tube('cloth:7a5c40', path, r, n=20, mod=lambda t, a: 1 + 0.09 * ((t * 7 + a / (2 * math.pi)) % 1), open0=True))
        for z in (0.17, 0.02):
            c = V(sx * lerp(0.062, 0.07, (0.22 - z) / 0.27), 0, z)
            rr = lerp(0.054, 0.046, (0.22 - z) / 0.27) * 1.09 + 0.002
            parts.append(cord('rope:b09a70', ellipse_pts(c, V(1, 0, 0), V(0, 1, 0), rr, rr, 20), 0.0028))
        k = V(sx * 0.07 + sx * 0.05, -0.02, 0.17)
        parts.append(tube_path('rope:b09a70', [k, k + V(sx * 0.004, -0.006, -0.035), k + V(sx * 0.003, -0.01, -0.07)], lambda t: 0.0026, n=5))
    return parts


@item(ao_strength=0.75, ao_dist=0.06)
def leather_pants():
    parts = pants('leather', 'leather:4a3020', buckle='iron')
    for sx in (-1, 1):
        path = leg_path(sx)
        seam = [c + V(sx * (leg_r(i / 10) + 0.0008), 0, 0) for i, c in enumerate(path[:-1])]
        parts.append(cord('leather:4a3020', seam, 0.0018, n=5, closed=False))
        knee = path[4] + V(0, -leg_r(0.4) - 0.001, 0)
        parts.append(ball('leather:8a6a48', knee, 0.03, sub=2, sx=0.8, sy=0.22, sz=1.0))
    return parts


@item(ao_strength=0.8, ao_dist=0.06)
def chain_legs():
    parts = pants('chain', 'leather:4a3020', buckle='iron')
    for sx in (-1, 1):
        knee = leg_path(sx)[4] + V(0, -leg_r(0.4) + 0.006, 0)
        parts.append(ball(IRON, knee, 0.034, sub=3, sx=0.85, sy=0.45, sz=0.9))
    return parts
