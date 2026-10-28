# Sessio 56: puut Blenderillä. Jokaisesta lajista useita muunnelmia, kukin
# kahtena tarkkuutena (lähi / kauko). Runko ja oksat ovat oikeita putkia
# kaarnatekstuurilla, latvus lehtikortteja lehtiatlaksesta (leafgen.py).
# Tulos: GLB, jossa solmut '<malli>_<muunnelma>_<near|far>'; solmun extras
# 'tree' = kaatotiedot pelin koordinaatistossa (treeCut.js), 'vines' =
# liaanien kiinnityspisteet. Verteksiväri: R = varjostus (AO), G = runko
# (kaadon leikkaus ja lovet), B = lehti.
# Ajo: blender -b --factory-startup --python tools/blender/build_trees.py -- out.glb cells.json [mallit]
import bpy
import bmesh
import json
import math
import os
import random
import sys
from mathutils import Vector, Matrix, noise
from mathutils.kdtree import KDTree

V = Vector
UP = V((0, 0, 1))
BARK_U, BARK_V = 1.1, 1.6  # kaarnatekstuurin koko metreinä (ympäri, pituus)


def lerp(a, b, t):
    return a + (b - a) * t


def smooth(t):
    t = max(0.0, min(1.0, t))
    return t * t * (3 - 2 * t)


def rot_towards(d, axis_perp, ang):
    return (Matrix.Rotation(ang, 3, axis_perp) @ d).normalized()


def perp_of(d):
    ref = V((1, 0, 0)) if abs(d.x) < 0.9 else V((0, 1, 0))
    return d.cross(ref).normalized()


class Branch:
    def __init__(self, pts, radii, level, trunk=False):
        self.pts, self.radii, self.level, self.trunk = pts, radii, level, trunk
        self.terminal = True
        self.ts = None  # renkaiden parametrit, jos renkaat eivät ole tasavälein

    def at(self, t):
        """Piste, suunta ja säde kohdassa t (0..1) polkua pitkin."""
        n = len(self.pts) - 1
        if self.ts:
            t = max(0.0, min(1.0, t))
            i = max(0, min(n - 1, sum(1 for x in self.ts[1:-1] if x <= t)))
            k = (t - self.ts[i]) / max(1e-9, self.ts[i + 1] - self.ts[i])
        else:
            f = max(0.0, min(n - 1e-6, t * n))
            i = int(f)
            k = f - i
        p = self.pts[i].lerp(self.pts[i + 1], k)
        d = (self.pts[i + 1] - self.pts[i]).normalized()
        r = lerp(self.radii[i], self.radii[i + 1], k)
        return p, d, r

    def length(self):
        return sum((self.pts[i + 1] - self.pts[i]).length for i in range(len(self.pts) - 1))


class Tree:
    def __init__(self, seed):
        self.rng = random.Random(seed)
        self.branches = []
        self.leaves = []  # (paikka, kortin ylös-suunta, normaali, leveys, solu)
        self.vines = []
        self.climbers = []     # sessio 58: rungon ympäri kiertävät liaanit (pisteet, säde)
        self.vine_leaves = []  # niiden lehdet (vain lähimallissa)
        self.meta = {}

    def u(self, a, b):
        return self.rng.uniform(a, b)

    def grow(self, start, d, length, r0, r1, level, segs, wobble, steer=None, trunk=False):
        pts = [start.copy()]
        radii = [r0]
        p = start.copy()
        dirv = d.normalized()
        for i in range(segs):
            t = (i + 1) / segs
            w = V((self.u(-1, 1), self.u(-1, 1), self.u(-1, 1))) * wobble
            if steer:
                dirv = (dirv + w + steer(p, dirv, t)).normalized()
            else:
                dirv = (dirv + w).normalized()
            p = p + dirv * (length / segs)
            pts.append(p.copy())
            radii.append(lerp(r0, r1, t))
        b = Branch(pts, radii, level, trunk)
        self.branches.append(b)
        return b

    def children(self, parent, n, at, angle, length, rratio, level, segs, wobble, steer=None, tip_r=0.45, azi0=None, along=True):
        """Haarat emon varrelta. length = (min, max) metreinä; angle = (min, max)
        kulma emon suunnasta. Atsimuutit kultaisella kulmalla."""
        out = []
        az = azi0 if azi0 is not None else self.u(0, 2 * math.pi)
        for i in range(n):
            t = lerp(at[0], at[1], (i + 0.5) / n if along else 1.0) + self.u(-0.04, 0.04)
            t = max(0.0, min(1.0, t))
            p, d, r = parent.at(t)
            az += 2.39996 + self.u(-0.35, 0.35)
            side = perp_of(d)
            side = (Matrix.Rotation(az, 3, d) @ side).normalized()
            ang = self.u(*angle)
            cd = (d * math.cos(ang) + side * math.sin(ang)).normalized()
            L = self.u(*length)
            cr = max(0.006, r * rratio)
            b = self.grow(p - cd * r * 0.5, cd, L + r * 0.5, cr, cr * tip_r, level, segs, wobble, steer)
            parent.terminal = False
            out.append(b)
        return out

    def leaf(self, p, up, normal, w, cell):
        self.leaves.append((p.copy(), up.normalized(), normal.normalized(), w, cell))

    def foliage(self, b, n, t0, t1, size, cells, mode, C=None):
        """n lehtikorttia oksan b varrelle (t0..t1). mode: 'flat' = lähes
        vaakasuorat kerrokset (akasia), 'out' = latvuksesta ulospäin (pyöreä
        latvus), 'up' = ylöspäin kallistuvat (litteä sademetsän latvus)."""
        for k in range(n):
            p, d, r = b.at(lerp(t0, t1, (k + self.u(0.0, 1.0)) / n))
            self.leaf_card(p, d, size, cells, mode, C)

    def leaf_card(self, p, d, size, cells, mode, C=None):
        """Yksi lehtikortti kohtaan p (oksan suunta d), suunta kuten foliage."""
        m = mode
        if mode == 'mix':
            # Sessio 57: osa korteista vaakaan, jotta latvusto peittää alhaalta katsottuna.
            m = 'up' if self.rng.random() < 0.6 else 'out'
        hz = V((d.x, d.y, 0))
        hz = hz.normalized() if hz.length > 1e-3 else V((1, 0, 0))
        if m == 'flat':
            tilt = self.u(0.0, 0.8)
            az = self.u(0, 2 * math.pi)
            nrm = (UP * math.cos(tilt) + V((math.cos(az), math.sin(az), 0)) * math.sin(tilt)).normalized()
            up = (hz + V((self.u(-0.4, 0.4), self.u(-0.4, 0.4), 0))).normalized()
            p = p + V((0, 0, self.u(-0.1, 0.18)))
        elif m == 'up':
            nrm = (UP * 1.3 + (p - C).normalized() * 0.5 + V((self.u(-0.4, 0.4), self.u(-0.4, 0.4), 0))).normalized()
            up = (d + hz).normalized()
        else:
            out = (p - C).normalized() if C is not None else hz
            nrm = (out + UP * 0.45 + V((self.u(-0.5, 0.5), self.u(-0.5, 0.5), self.u(-0.3, 0.3)))).normalized()
            up = d
        self.leaf(p, up, nrm, self.u(*size), self.rng.choice(cells))


# --- Lajit ---------------------------------------------------------------------------------------

def trunk_line(tree, base, top, r0, r1, cutZ, flare=1.4, rings=14, lobes=None, flute=0.0, profile=None, curl=None):
    """Suora runko tyvestä latvaan; yksi rengas tarkasti kaatokorkeudella.
    profile(t) = säteen kerroin (esim. baobabin pullo). lobes = (määrä,
    ulottuma m, korkeus m, kulmaleveys rad): tyven pyöreät juurilohkot, jotka
    levenevät maata kohti ja jatkuvat maan alle (sademetsässä korkeat ja
    kapeat = pönkkäjuuret). Tyvessä renkaat ovat tiheämmässä."""
    tree.lobes = []
    if lobes:
        n, out, hgt, wid = lobes
        a0 = tree.u(0, 2 * math.pi)
        for k in range(n):
            a = (a0 + 2 * math.pi * (k + tree.u(-0.28, 0.28)) / n) % (2 * math.pi)
            tree.lobes.append((a, tree.u(*out), min(tree.u(*hgt), cutZ - 0.05), tree.u(*wid), 0.0))
        if curl:
            # Sessio 58: mutkittelevat juuret (oma satunnaisjono, muut lajit ennallaan).
            cr = random.Random(int(a0 * 1e6))
            tree.lobes = [(a, o, h, w, cr.uniform(-curl, curl)) for a, o, h, w, _ in tree.lobes]
    root_top = max([h for _, _, h, _, _ in tree.lobes], default=0.0)
    L = (top - base).length
    d = (top - base).normalized()
    span = top.z - base.z
    tz = lambda z: (z - base.z) / span
    marks = {0.0: 2, tz(cutZ): 3}
    if root_top > 0:
        marks[tz(base.z * 0.5)] = 1
        nb = 8
        for k in range(nb + 1):
            marks[tz(root_top * (k / nb) ** 1.5)] = 2 if k == nb else 1
    # Sessio 57: tiheämmät renkaat kaatokohdan ympärillä (lovi saa muodon).
    for off in (-0.45, -0.3, -0.17, -0.08, 0.08, 0.17, 0.3, 0.45):
        z = cutZ + off * min(1.0, r0 / 0.3) ** 0.5
        if base.z < z < top.z - 0.2 and z > root_top + 0.03:
            marks.setdefault(tz(z), 1)
    step = 1 / rings
    for i in range(1, rings + 1):
        t = i / rings
        if t > tz(root_top) + step * 0.5 if root_top > 0 else True:
            marks.setdefault(t, 0)
    ts = []
    for t in sorted(marks):
        if ts and t - ts[-1] < 0.004:
            if marks[t] > marks[ts[-1]]:
                ts[-1] = t
            continue
        ts.append(t)
    pts, radii = [], []
    for t in ts:
        pts.append(base + d * (L * t))
        k = profile(t) if profile else 1.0
        radii.append(lerp(r0, r1, t) * k)
    b = Branch(pts, radii, 0, trunk=True)
    b.ts = ts
    b.flare, b.flute, b.root_top = flare, flute, root_top
    b.seed = tree.rng.random() * 100
    tree.branches.insert(0, b)
    return b


def acacia(seed):
    """Sateenvarjoakasia: lyhyt kalteva runko, joka haarautuu matalalta 3-4
    vahvaksi haaraksi; haarat leviävät ja latvus on litteä, kerroksellinen."""
    T = Tree(seed)
    H = T.u(6.0, 7.4)
    th = T.u(1.3, 2.2)
    lean = V((T.u(-0.5, 0.5), T.u(-0.5, 0.5), 0))
    base = V((0, 0, -0.5))
    top = V((lean.x, lean.y, th))
    cutZ = 0.75
    tr = trunk_line(T, base, top, 0.25, 0.19, cutZ, flare=1.25, lobes=(T.rng.randint(4, 5), (0.2, 0.36), (0.45, 0.7), (0.32, 0.46)))

    def steer(p, d, t):
        # Lähellä latvuksen korkeutta haarat kääntyvät vaakasuoriksi.
        f = smooth((p.z - (H - 2.2)) / 1.6)
        horiz = V((d.x, d.y, 0)).normalized() if V((d.x, d.y, 0)).length > 1e-3 else V((1, 0, 0))
        return UP * 0.08 * (1 - f) + (horiz - d) * 0.35 * f + V((0, 0, -0.18)) * smooth((p.z - H) / 0.4)

    limbs = T.children(tr, T.rng.choice((3, 4, 4)), (1.0, 1.0), (0.55, 0.85), (3.3, 4.3), 0.72, 1, 7, 0.1, steer, tip_r=0.5, along=False)
    for lb in limbs:
        l2 = T.children(lb, T.rng.randint(3, 4), (0.4, 1.0), (0.5, 0.95), (1.8, 2.7), 0.6, 2, 5, 0.12, steer, tip_r=0.45)
        for b2 in l2:
            l3 = T.children(b2, T.rng.randint(3, 4), (0.3, 1.0), (0.5, 1.0), (0.6, 1.0), 0.55, 3, 3, 0.15, steer, tip_r=0.4)
            for b3 in l3:
                T.foliage(b3, 5, 0.3, 1.0, (1.3, 1.9), ('acacia_a', 'acacia_b'), 'flat')
            T.foliage(b2, 3, 0.6, 1.0, (1.1, 1.6), ('acacia_a', 'acacia_b'), 'flat')
            # Latvuksen reunalle pystympiä kortteja, ettei latvus näytä sivulta ohuelta.
            p, d, r = b2.at(1.0)
            out = V((p.x - top.x, p.y - top.y, 0)).normalized()
            T.leaf(p + V((0, 0, -0.15)), (UP + out * 0.3).normalized(), (out + UP * 0.6).normalized(), T.u(1.2, 1.6), T.rng.choice(('acacia_a', 'acacia_b')))
    T.meta = dict(kind='acacia', r0=0.25, r1=0.19, cutZ=cutZ, base=base, top=top, logR=0.3, fallPad=0.4)
    return T


def shea(seed):
    """Karitepuu: suora tumma runko, tiheä pyöreä latvus."""
    T = Tree(seed)
    th = T.u(2.0, 2.7)
    lean = V((T.u(-0.25, 0.25), T.u(-0.25, 0.25), 0))
    base = V((0, 0, -0.5))
    top = V((lean.x, lean.y, th))
    cutZ = 0.8
    tr = trunk_line(T, base, top, 0.3, 0.24, cutZ, flare=1.2, lobes=(T.rng.randint(5, 6), (0.22, 0.4), (0.5, 0.75), (0.3, 0.42)))
    C = top + V((0, 0, 2.6))

    def steer(p, d, t):
        out = (p - C)
        out.z *= 0.6
        return UP * 0.1 + out.normalized() * 0.05

    lead = T.grow(top - V((0, 0, 0.2)), V((T.u(-0.1, 0.1), T.u(-0.1, 0.1), 1)), T.u(2.4, 3.2), 0.2, 0.08, 1, 5, 0.08, steer)
    limbs = T.children(tr, T.rng.randint(4, 5), (0.82, 1.0), (0.55, 0.95), (2.0, 2.8), 0.68, 1, 6, 0.1, steer, tip_r=0.45)
    for lb in limbs + [lead]:
        for b2 in T.children(lb, T.rng.randint(3, 5), (0.3, 1.0), (0.5, 0.95), (1.0, 1.6), 0.6, 2, 4, 0.13, steer, tip_r=0.45):
            for b3 in T.children(b2, T.rng.randint(2, 3), (0.35, 1.0), (0.5, 1.0), (0.5, 0.8), 0.55, 3, 3, 0.15, steer, tip_r=0.4):
                T.foliage(b3, 5, 0.3, 1.0, (0.9, 1.3), ('shea',), 'out', C)
            T.foliage(b2, 2, 0.5, 1.0, (0.9, 1.2), ('shea',), 'out', C)
    T.meta = dict(kind='shea', r0=0.3, r1=0.24, cutZ=cutZ, base=base, top=top, logR=0.34, fallPad=0.3)
    return T


def baobab(seed):
    """Baobab: valtava pullomainen runko pystyuurteineen, paksut kiemurtelevat
    oksat kuin juuret ja harvat lehtitupsut."""
    T = Tree(seed)
    Ht = T.u(6.0, 7.2)
    base = V((0, 0, -0.6))
    top = V((T.u(-0.2, 0.2), T.u(-0.2, 0.2), Ht))
    cutZ = 0.9

    def prof(t):
        return 1.0 + 0.12 * math.sin(math.pi * min(1, t / 0.5)) - 0.5 * smooth((t - 0.55) / 0.45)

    tr = trunk_line(T, base, top, 1.55, 1.1, cutZ, flare=1.1, lobes=(T.rng.randint(7, 9), (0.35, 0.65), (0.6, 0.85), (0.18, 0.28)), flute=0.07, rings=18, profile=prof)

    def steer(p, d, t):
        return UP * 0.12

    limbs = T.children(tr, T.rng.randint(5, 7), (0.9, 1.0), (0.9, 1.3), (2.4, 3.6), 0.42, 1, 6, 0.22, steer, tip_r=0.4)
    for lb in limbs:
        for b2 in T.children(lb, T.rng.randint(2, 3), (0.5, 1.0), (0.4, 0.9), (1.2, 2.0), 0.5, 2, 4, 0.22, steer, tip_r=0.4):
            for b3 in T.children(b2, T.rng.randint(2, 3), (0.5, 1.0), (0.4, 0.9), (0.6, 1.0), 0.5, 3, 3, 0.2, steer, tip_r=0.4):
                T.foliage(b3, 4, 0.4, 1.0, (1.0, 1.4), ('baobab',), 'out', top + V((0, 0, 2.5)))
            T.foliage(b2, 2, 0.6, 1.0, (1.0, 1.3), ('baobab',), 'out', top + V((0, 0, 2.5)))
    T.meta = dict(kind='baobab', r0=1.8, r1=0.6, cutZ=cutZ, base=base, top=top, logR=1.25, fallPad=2.2)
    return T


def trunk_surface(T, b, fr, g, a):
    """Rungon pinnan piste korkeudella g kulmassa a (sama kaava kuin build_trunk:
    tyven levennys ja juurilohkot) sekä ulospäin osoittava suunta."""
    pts = b.pts
    i = 0
    while i < len(pts) - 2 and pts[i + 1].z < g:
        i += 1
    k = max(0.0, min(1.0, (g - pts[i].z) / max(1e-6, pts[i + 1].z - pts[i].z)))
    p = pts[i].lerp(pts[i + 1], k)
    r = lerp(b.radii[i], b.radii[i + 1], k)
    d, u, w = fr[i]
    fl = getattr(b, 'flare', 1.0)
    rr = r * (1 + (fl - 1) * (1 - smooth((g + 0.3) / 1.3)) ** 2)
    lobes = getattr(T, 'lobes', [])
    if lobes and g <= getattr(b, 'root_top', 0.0):
        rr += lobe_shape(lobes, a, g)[0]
    out = u * math.cos(a) + w * math.sin(a)
    return V((p.x, p.y, g)) + out * rr, out


def climbing_vine(T, tr, seed, kind):
    """Sessio 58: liaani kiertää rungon ympäri (vanhoissa puissa oli tällainen,
    ja käyttäjä kaipasi sitä). Nousee ensin suoraan juurilohkojen välistä ja
    kiertyy sitten rungon ympäri kohti latvusta. Oma satunnaislukujono, jotta
    puiden muoto ei muutu."""
    vr = random.Random(seed * 7919 + 17)
    if vr.random() > 0.75:
        return
    fr = frames(tr.pts)
    z_top = tr.pts[-1].z
    root_top = max([h for _, _, h, _, _ in T.lobes], default=0.3)
    # Aloituskulma: kahden juurilohkon välin keskeltä.
    a0 = vr.uniform(0, 2 * math.pi)
    if T.lobes:
        angs = sorted(a for a, _, _, _, _ in T.lobes)
        gaps = [((angs[(i + 1) % len(angs)] - angs[i]) % (2 * math.pi), angs[i]) for i in range(len(angs))]
        g, a_start = max(gaps)
        a0 = a_start + g / 2
    rv = {'canopy': 0.04, 'jungle': 0.05, 'emergent': 0.065}[kind] * vr.uniform(0.85, 1.2)
    z0 = root_top + 0.3
    z1 = z0 + (z_top - z0) * vr.uniform(0.7, 0.95)
    turns = vr.uniform(1.6, 3.0) * (1 if vr.random() < 0.5 else -1)
    pts = []
    n0 = max(3, int((z0 + 0.15) / 0.3))
    for i in range(n0 + 1):
        g = -0.15 + (z0 + 0.15) * i / n0
        q, out = trunk_surface(T, tr, fr, g, a0)
        pts.append(q + out * rv * 0.8)
    n1 = int(abs(turns) * 22)
    for i in range(1, n1 + 1):
        t = i / n1
        g = z0 + (z1 - z0) * t
        a = a0 + turns * 2 * math.pi * t
        q, out = trunk_surface(T, tr, fr, g, a)
        pts.append(q + out * rv * 0.8)
    T.climbers.append((pts, rv))
    # Lehtiä varressa (ylempänä tiheämmin), kärjet ulos ja hieman alas.
    acc, nxt = 0.0, 1.2
    for i in range(1, len(pts)):
        acc += (pts[i] - pts[i - 1]).length
        if acc < nxt:
            continue
        nxt = acc + vr.uniform(0.28, 0.55)
        p = pts[i]
        c = tr.at(max(0.0, min(1.0, (p.z - tr.pts[0].z) / (z_top - tr.pts[0].z))))[0]
        out = V((p.x - c.x, p.y - c.y, 0))
        out = out.normalized() if out.length > 1e-4 else V((1, 0, 0))
        tan = (pts[i] - pts[i - 1]).normalized()
        up = (out * 0.8 + tan * vr.uniform(-0.5, 0.5) + UP * vr.uniform(-0.6, 0.3)).normalized()
        nrm = (out + UP * vr.uniform(0.1, 0.5)).normalized()
        T.vine_leaves.append((p + out * rv, up, nrm, vr.uniform(0.3, 0.48), vr.choice(['broad_b', 'sapling'])))


def build_climber(M, T, pts, rv):
    """Liaanin varsi putkena (materiaali 2 = treeVine)."""
    fr = frames(pts)
    sides = 5
    acc = 0.0
    rings = []
    for i, (p, (d, u, w)) in enumerate(zip(pts, fr)):
        if i:
            acc += (p - pts[i - 1]).length
        f = i / (len(pts) - 1)
        r = rv * (1 - 0.45 * f) * (1 + 0.15 * math.sin(acc * 5.3))
        ring = []
        for k in range(sides + 1):
            a = 2 * math.pi * k / sides
            pos = p + u * (math.cos(a) * r) + w * (math.sin(a) * r)
            ring.append((M.v(pos, (0.88, 0.0, 0.0)), (k / sides * 0.3, acc / 1.2)))
        rings.append(ring)
    for i in range(len(rings) - 1):
        for k in range(sides):
            A, B = rings[i], rings[i + 1]
            M.face([A[k][0], A[k + 1][0], B[k + 1][0], B[k][0]], [A[k][1], A[k + 1][1], B[k + 1][1], B[k][1]], 2)


def colonize(T, roots, att, seg, kill, infl, tropism, max_iter=220):
    """Sessio 58: oksisto "space colonization" -menetelmällä. Latvuksen
    muotoon sijoitetut houkutinpisteet vetävät lähintä oksan kärkeä puoleensa;
    oksa kasvaa askeleen kerrallaan, kunnes houkuttimet on käytetty.
    Haarautuminen syntyy itsestään sinne, minne houkuttimia riittää, joten
    latvus täyttyy tasaisesti eikä oksia lähde yhdestä kohdasta.
    roots = [(paikka, suunta)], kiinteät solmut rungolla."""
    nodes = [{'p': p.copy(), 'par': -1, 'ch': [], 'fixed': True, 'd': d.normalized()} for p, d in roots]
    att = list(att)
    for _ in range(max_iter):
        if not att:
            break
        kd = KDTree(len(nodes))
        for i, n in enumerate(nodes):
            kd.insert(n['p'], i)
        kd.balance()
        pull, rest = {}, []
        for a in att:
            co, i, dist = kd.find(a)
            if dist < kill:
                continue
            rest.append(a)
            if dist < infl:
                pull.setdefault(i, []).append(a)
        att = rest
        if not pull:
            break
        for i, al in pull.items():
            n = nodes[i]
            d = V()
            for a in al:
                d += (a - n['p']).normalized()
            if d.length < 1e-3:
                d = n['d'].copy()
            d = (d.normalized() + tropism(n['p'], d)).normalized()
            # Kiinteä solmu (runko) ei kasva alaspäin.
            if n['fixed'] and d.z < -0.2:
                continue
            q = n['p'] + d * seg
            if any((nodes[c]['p'] - q).length < seg * 0.35 for c in n['ch']):
                continue
            nodes.append({'p': q, 'par': i, 'ch': [], 'fixed': False, 'd': d})
            n['ch'].append(len(nodes) - 1)
    return nodes


def colonized_branches(T, nodes, r_top, r_min, lvl_r, smooth_n=2):
    """Solmuista oksaputket: paksuus putkimallilla (lasten säteiden summa),
    ketjut seuraavat suurinta alipuuta, muut lapset alkavat uuden ketjun.
    Palauttaa kärkisolmut ja (solmu, säde) -parit lehtiä varten."""
    N = len(nodes)
    size = [1] * N
    rad = [1.0] * N
    for i in range(N - 1, -1, -1):
        n = nodes[i]
        if n['ch']:
            rad[i] = sum(rad[c] ** 2.3 for c in n['ch']) ** (1 / 2.3)
        if n['par'] >= 0:
            size[n['par']] += size[i]
    top = max(rad[i] for i in range(N) if nodes[i]['fixed'])
    k = r_top / top
    rad = [max(r_min, r * k) for r in rad]
    stack = []
    for i, n in enumerate(nodes):
        if n['fixed']:
            for c in n['ch']:
                stack.append((i, c))
    while stack:
        a, c = stack.pop()
        pts = [nodes[a]['p'].copy()]
        rs = [rad[c]]
        cur = c
        while True:
            pts.append(nodes[cur]['p'].copy())
            rs.append(rad[cur])
            ch = nodes[cur]['ch']
            if not ch:
                break
            main = max(ch, key=lambda x: size[x])
            for o in ch:
                if o != main:
                    stack.append((cur, o))
            cur = main
        # Pehmennys: kulmikas askelpolku kaartuvaksi (päät paikallaan).
        for _ in range(smooth_n):
            pts = [pts[0]] + [pts[j] * 0.5 + (pts[j - 1] + pts[j + 1]) * 0.25 for j in range(1, len(pts) - 1)] + [pts[-1]]
        lvl = 1 if rs[0] >= lvl_r[0] else (2 if rs[0] >= lvl_r[1] else 3)
        b = Branch(pts, rs, lvl)
        b.terminal = True
        T.branches.append(b)
    return rad


def crown_points(T, n, C, R, z_min, shell=0.45, clump=0.55, flat_top=0.0, lumps=4):
    """Houkuttimet latvuksen muotoon: useamman alalatvuksen yhdistelmä
    (kumpupilvimäinen, ei säännöllinen pallo), painottuu kuoreen (sisällä
    vähemmän lehtiä), ja kohinalla ryhmiksi (latvuksessa on pienempiä
    lehvästöpaakkuja ja aukkoja kuten oikeassa puussa)."""
    out = []
    seed = T.u(0, 100)
    subs = []
    for k in range(lumps):
        a = 2 * math.pi * (k + T.u(-0.3, 0.3)) / lumps
        rr = T.u(0.35, 0.55)
        c = V((math.cos(a) * rr, math.sin(a) * rr, T.u(-0.15, 0.35)))
        subs.append((c, V((T.u(0.5, 0.65), T.u(0.5, 0.65), T.u(0.55, 0.75)))))
    subs.append((V((0, 0, T.u(0.1, 0.3))), V((0.55, 0.55, 0.7))))
    tries = 0
    while len(out) < n and tries < n * 80:
        tries += 1
        q = V((T.u(-1, 1), T.u(-1, 1), T.u(-1, 1)))
        if q.length > 1:
            continue
        # Etäisyys lähimmän alalatvuksen keskeltä (1 = sen pinta).
        e = min(V(((q.x - c.x) / r.x, (q.y - c.y) / r.y, (q.z - c.z) / r.z)).length for c, r in subs)
        if e > 1:
            continue
        p = V((C.x + q.x * R.x, C.y + q.y * R.y, C.z + q.z * R.z))
        if p.z < z_min:
            continue
        if flat_top and q.z > flat_top:
            continue
        if e < shell and T.rng.random() < 0.8:
            continue
        nz = noise.noise(V((p.x * 0.28 + seed, p.y * 0.28, p.z * 0.35)))
        if nz < -clump * 0.5 and T.rng.random() < 0.85:
            continue
        out.append(p)
    return out


def rainforest(seed, kind):
    T = Tree(seed)
    # Sessio 58: pönkkäjuuret leveitä ja pyöreitä, mutkittelevia (käyttäjä:
    # tyvet eivät näyttäneet oikeilta; ohuet evät olivat kuin levyjä).
    if kind == 'canopy':
        Ht, r0, r1 = T.u(6.4, 8.0), 0.32, 0.2
        cells, cut = ('broad_a', 'broad_b'), 0.8
        lobes, bz, curl = (T.rng.randint(4, 5), (0.35, 0.55), (0.45, 0.65), (0.24, 0.3)), -0.6, 0.35
        crown = dict(n=650, R=(6.2, 6.2, 4.8), dz=3.2, seg=0.6, kill=1.05, infl=4.2, up=0.1, rmin=0.016, sz=(2.0, 2.8), flat=0.0)
    elif kind == 'jungle':
        Ht, r0, r1 = T.u(8.8, 10.2), 0.55, 0.36
        cells, cut = ('kapok',), 1.9
        lobes, bz, curl = (T.rng.randint(5, 6), (0.75, 1.15), (1.0, 1.45), (0.19, 0.24)), -0.8, 0.45
        crown = dict(n=780, R=(7.0, 7.0, 4.2), dz=2.4, seg=0.65, kill=1.15, infl=4.5, up=0.04, rmin=0.02, sz=(2.2, 3.0), flat=0.85)
    else:  # emergent
        Ht, r0, r1 = T.u(15.0, 18.5), 0.85, 0.48
        cells, cut = ('broad_a', 'broad_b'), 2.6
        lobes, bz, curl = (T.rng.randint(6, 7), (1.0, 1.5), (1.4, 2.0), (0.17, 0.21)), -1.0, 0.5
        crown = dict(n=950, R=(9.0, 9.0, 5.4), dz=3.0, seg=0.8, kill=1.45, infl=5.5, up=0.06, rmin=0.026, sz=(2.8, 3.7), flat=0.8)
    base = V((0, 0, bz))
    top = V((T.u(-0.15, 0.15), T.u(-0.15, 0.15), Ht))
    tr = trunk_line(T, base, top, r0, r1, cut, flare=1.15, lobes=lobes, rings=20, curl=curl)
    climbing_vine(T, tr, seed, kind)
    # Latvus: kupoli rungon yläpuolella, hieman sivuun siirtynyt (epäsymmetria).
    C = top + V((T.u(-0.8, 0.8), T.u(-0.8, 0.8), crown['dz']))
    R = V(crown['R']) * T.u(0.9, 1.1)
    att = crown_points(T, crown['n'], C, R, top.z + 0.3, flat_top=crown['flat'], lumps={'canopy': 4, 'jungle': 5, 'emergent': 6}[kind])

    def trop(p, d):
        hz = V((p.x - top.x, p.y - top.y, 0))
        out = hz.normalized() * 0.08 if hz.length > 1e-3 else V()
        return UP * crown['up'] + out

    # Kiinteät solmut: rungon latva ja pari kohtaa sen alla (alimmat suuret
    # haarat lähtevät rungon yläosan kyljestä, eivät kaikki samasta kohdasta).
    roots = [(top.copy(), UP)]
    for f in (0.8, 0.9):
        roots.append((base.lerp(top, f), UP))
    nodes = colonize(T, roots, att, crown['seg'], crown['kill'], crown['infl'], trop)
    rad = colonized_branches(T, nodes, r1 * 0.95, crown['rmin'], (r1 * 0.3, 0.045))
    # Lehdet: kärkien ja niiden lähisolmujen ympärille, latvuksen kuoreen.
    mode = 'up' if kind == 'jungle' else 'mix'
    C2 = C - V((0, 0, R.z * 0.4))
    for i, n in enumerate(nodes):
        if n['fixed']:
            continue
        if not n['ch']:
            for _ in range(5):
                p = n['p'] + V((T.u(-0.6, 0.6), T.u(-0.6, 0.6), T.u(-0.25, 0.4)))
                T.leaf_card(p, n['d'], crown['sz'], cells, mode, C2)
        elif rad[i] < crown['rmin'] * 2.6:
            for _ in range(2):
                p = n['p'] + V((T.u(-0.4, 0.4), T.u(-0.4, 0.4), T.u(-0.15, 0.3)))
                T.leaf_card(p, n['d'], crown['sz'], cells, mode, C2)
        if crown['rmin'] * 2.5 < rad[i] < 0.14 and T.rng.random() < 0.035:
            T.vines.append(n['p'].copy())
    if kind == 'emergent':
        # Keskikerros (sessio 48, käyttäjän referenssikuva): lyhyitä sivuoksia
        # ja lehtiryppäitä rungon varrella 6-14 m:ssä.
        for i in range(T.rng.randint(4, 6)):
            z = T.u(6.0, min(14.0, Ht - 2.0))
            p, d, r = tr.at((z - base.z) / (top.z - base.z))
            a = T.u(0, 2 * math.pi)
            out = V((math.cos(a), math.sin(a), 0))

            def steer(p, d, t):
                return UP * (0.03 + 0.1 * t)
            sb = T.grow(p + out * r * 0.8, (out + UP * T.u(0.3, 0.7)).normalized(), T.u(1.0, 2.2), 0.09, 0.03, 2, 4, 0.12, steer)
            T.foliage(sb, 10, 0.25, 1.0, (1.4, 2.0), cells, 'out', p)
    T.meta = dict(kind=kind, r0=r0, r1=r1, cutZ=cut, base=base, top=top, logR=r0 * 0.9, fallPad=1.4)
    return T


def sapling(seed):
    T = Tree(seed)
    h = T.u(2.4, 3.2)
    base = V((0, 0, -0.15))
    tr = trunk_line(T, base, V((T.u(-0.2, 0.2), T.u(-0.2, 0.2), h)), 0.05, 0.025, 0.3, flare=1.2, lobes=(3, (0.03, 0.05), (0.12, 0.22), (0.45, 0.6)), rings=6)

    def steer(p, d, t):
        return UP * 0.15

    for b in T.children(tr, T.rng.randint(4, 6), (0.4, 1.0), (0.6, 1.1), (0.6, 1.1), 0.6, 1, 3, 0.15, steer, tip_r=0.4):
        T.foliage(b, 8, 0.15, 1.0, (0.45, 0.7), ('sapling',), 'out', tr.pts[-1] - V((0, 0, 0.6)))
    T.foliage(tr, 6, 0.55, 1.0, (0.5, 0.75), ('sapling',), 'out', tr.pts[-1] - V((0, 0, 0.6)))
    T.meta = dict(kind='sapling', r0=0.05, r1=0.025, cutZ=0.3, base=base, top=tr.pts[-1], logR=0.05, fallPad=0.3)
    return T


SPECIES = {
    'acacia': (acacia, 4, 'acacia'),
    'shea': (shea, 3, 'shea'),
    'baobab': (baobab, 2, 'baobab'),
    'canopy': (lambda s: rainforest(s, 'canopy'), 4, 'rain'),
    'jungle': (lambda s: rainforest(s, 'jungle'), 3, 'kapok'),
    'emergent': (lambda s: rainforest(s, 'emergent'), 3, 'emergent'),
    'sapling': (sapling, 4, 'sapling'),
}


# --- Verkko ---------------------------------------------------------------------------------------

class Mesh:
    def __init__(self):
        self.bm = bmesh.new()
        self.uv = self.bm.loops.layers.uv.new('UVMap')
        self.col = []

    def v(self, p, c):
        vert = self.bm.verts.new(p)
        self.col.append(c)
        return vert

    def face(self, vs, uvs, mat):
        f = self.bm.faces.new(vs)
        f.material_index = mat
        for lp, uv in zip(f.loops, uvs):
            lp[self.uv].uv = uv
        f.smooth = True
        return f


def frames(pts):
    m = len(pts)
    ds = [(pts[min(m - 1, i + 1)] - pts[max(0, i - 1)]).normalized() for i in range(m)]
    u = perp_of(ds[0])
    out = []
    for i in range(m):
        if i:
            q = ds[i - 1].rotation_difference(ds[i])
            u = (q @ u)
            u = (u - ds[i] * u.dot(ds[i])).normalized()
        out.append((ds[i], u, ds[i].cross(u)))
    return out


def ao_at(T, p):
    c, R = T.crown
    q = p - c
    e = math.sqrt((q.x / R.x) ** 2 + (q.y / R.y) ** 2 + (q.z / R.z) ** 2)
    return e


def build_branch(M, T, b, sides, far):
    """Putki kaarnatekstuurilla (oksat). Runko: build_trunk."""
    if b.trunk:
        return build_trunk(M, T, b, sides, far)
    if (far or b.level >= 2) and len(b.pts) > 3:
        # Joka toinen rengas (ohuet oksat ja kaukomalli).
        idx = list(range(0, len(b.pts), 2))
        if idx[-1] != len(b.pts) - 1:
            idx.append(len(b.pts) - 1)
        b = Branch([b.pts[i] for i in idx], [b.radii[i] for i in idx], b.level, b.trunk)
    fr = frames(b.pts)
    rings = []
    acc = 0.0
    # Kokonainen määrä tekstuurikierroksia ympäri, ettei saumaa näy.
    circ = max(1, round(2 * math.pi * b.radii[0] * 0.8 / BARK_U)) * BARK_U
    for i, (p, (d, u, w)) in enumerate(zip(b.pts, fr)):
        if i:
            acc += (p - b.pts[i - 1]).length
        r = b.radii[i]
        ring = []
        for k in range(sides + 1):
            a = 2 * math.pi * k / sides
            pos = p + u * (math.cos(a) * r) + w * (math.sin(a) * r)
            e = ao_at(T, pos)
            ao = 0.55 + 0.45 * smooth(e / 1.1) if e < 1.3 else 1.0
            ring.append((pos, (k / sides * circ / BARK_U, acc / BARK_V), ao))
        rings.append(ring)
    # Kärki suppenee pisteeseen (ei avointa päätä).
    vs = [[M.v(pos, (ao, 0.0, 0.0)) for pos, uv, ao in ring] for ring in rings]
    for i in range(len(rings) - 1):
        for k in range(sides):
            q = [vs[i][k], vs[i][k + 1], vs[i + 1][k + 1], vs[i + 1][k]]
            uvs = [rings[i][k][1], rings[i][k + 1][1], rings[i + 1][k + 1][1], rings[i + 1][k][1]]
            M.face(q, uvs, 0)
    p, (d, u, w) = b.pts[-1], fr[-1]
    tip = M.v(p + d * b.radii[-1] * 1.5, (rings[-1][0][2], 0.0, 0.0))
    for k in range(sides):
        M.face([vs[-1][k], vs[-1][k + 1], tip], [rings[-1][k][1], rings[-1][k + 1][1], (rings[-1][k][1][0], rings[-1][k][1][1] + 0.05)], 0)


def lobe_angles(lobes, sides, far):
    """Renkaan kulmat: tasavälein + tiheämmin juurilohkojen kohdalla, jotta
    kapeatkin lohkot ovat pyöreitä."""
    TAU = 2 * math.pi
    out = [TAU * k / sides for k in range(sides)]
    offs = (0.0, 1.0, 2.0) if far else (0.0, 0.4, 0.8, 1.25, 1.8, 2.6)
    for a, o, h, w, c in lobes:
        # Mutkittelevan juuren keskiviiva siirtyy alaspäin mentäessä: tiheät
        # kulmat koko matkalle.
        centers = [a] if not c else [a + c * s for s in (0.0, 0.35, 0.7, 1.0)]
        for ca in centers:
            for f in offs:
                for sg in ((1,) if f == 0 else (-1, 1)):
                    out.append((ca + sg * f * w * (1.4 if c else 1.0)) % TAU)
    out.sort()
    keep = [0.0]
    for a in out[1:]:
        if a - keep[-1] > 0.012 and TAU - a > 0.012:
            keep.append(a)
    return keep + [TAU]


def lobe_shape(lobes, a, g):
    """Juurilohkojen lisäsäde (m), tekstuurin lisä-U (m) ja harjanne (0..1)
    kulmassa a ja korkeudella g maanpinnasta. Lohko levenee koveralla
    kaarella maata kohti ja jatkuu maan alle viistosti. U: kyljet nousevat
    ja laskevat (peilaus harjalla), harjan levenemä lisätään erikseen."""
    tot = 0.0
    uex = 0.0
    crest = 0.0
    for la, o, h, w, c in lobes:
        x = g / h
        if x >= 1:
            continue
        f = (1 - x) ** 2.4 if x >= 0 else 1 - x * 1.2
        if c:
            # Sessio 58: pyöreä, mutkitteleva juuri: keskiviiva kiertyy ja
            # juuri levenee maata kohti (ei ohut evä).
            k = (1 - max(0.0, x)) ** 1.2
            la = la + c * k
            w = w * (0.75 + 0.6 * k)
        da = (a - la + math.pi) % (2 * math.pi) - math.pi
        e = math.exp(-(da / w) ** 2)
        tot += o * f * e
        uex += o * f * e * (1 + da)
        crest = max(crest, e * min(1.0, f))
    return tot, uex, crest


def build_trunk(M, T, b, sides, far):
    """Runko: pyöreä tyvi juurilohkoineen (tiheät renkaat ja kulmat) ja
    tavallinen putki sen yläpuolella; osat ommellaan yhteen kolmioilla.
    Kaarnan U kulkee lohkojen kyljillä ylös ja alas (peilautuu harjalla, ei
    venymistä), V mitataan tyvessä pintaa pitkin ylhäältä alas."""
    lobes = [] if far else getattr(T, 'lobes', [])
    fl = getattr(b, 'flare', 1.0)
    root_top = getattr(b, 'root_top', 0.0)
    TAU = 2 * math.pi
    if far:
        n = len(b.pts)
        idx = [i for i in range(n) if i in (0, n - 1) or i % 3 == 0]
        b2 = Branch([b.pts[i] for i in idx], [b.radii[i] for i in idx], 0, True)
        b2.flare, b2.flute, b2.seed = fl, getattr(b, 'flute', 0.0), b.seed
        b = b2
    fr = frames(b.pts)
    sparse = [TAU * k / sides for k in range(sides + 1)]
    dense = lobe_angles(lobes, sides, far) if lobes else sparse
    ib = max([i for i, p in enumerate(b.pts) if p.z <= root_top + 1e-4], default=-1) if lobes else -1
    rings = []
    acc = 0.0
    circ = max(1, round(TAU * sum(b.radii) / len(b.radii) / BARK_U)) * BARK_U
    for i, (p, (d, u, w)) in enumerate(zip(b.pts, fr)):
        if i:
            acc += (p - b.pts[i - 1]).length
        r = b.radii[i]
        g = p.z
        angs = dense if i <= ib else sparse
        ring = []
        for a in angs:
            rr = r * (1 + (fl - 1) * (1 - smooth((g + 0.3) / 1.3)) ** 2)
            if getattr(b, 'flute', 0):
                rr *= 1 + b.flute * math.cos(7 * a + b.seed) * smooth((g + 0.2) / 0.5) * (1 - smooth((g - 5.2) / 2))
            lr, uex, crest = lobe_shape(lobes, a, g) if lobes and i <= ib else (0.0, 0.0, 0.0)
            rr = rr * (1 + 0.03 * noise.noise(V((math.cos(a) * 2, math.sin(a) * 2, g * 1.5 + b.seed)))) + lr
            pos = p + u * (math.cos(a) * rr) + w * (math.sin(a) * rr)
            e = ao_at(T, pos)
            ao = 0.55 + 0.45 * smooth(e / 1.1) if e < 1.3 else 1.0
            if g < 0.8:
                ao *= 0.78 + 0.22 * smooth((g + 0.25) / 1.0)
            if lobes and root_top > 0:
                # Juurten välit tummempia.
                ao *= 1 - 0.22 * (1 - smooth(g / root_top)) * (1 - crest)
            ring.append([pos, (a / TAU * circ + uex) / BARK_U, acc / BARK_V, ao])
        rings.append(ring)
    # V tyvessä pintaa pitkin (ylhäältä alas), jotta lohkojen kaari ei venytä kuviota.
    for i in range(ib - 1, -1, -1):
        for k, vtx in enumerate(rings[i]):
            vtx[2] = rings[i + 1][k][2] - (rings[i + 1][k][0] - vtx[0]).length / BARK_V
    vs = [[M.v(v[0], (v[3], 1.0, 0.0)) for v in ring] for ring in rings]
    for i in range(len(rings) - 1):
        A, B = rings[i], rings[i + 1]
        if len(A) == len(B):
            for k in range(len(A) - 1):
                q = [vs[i][k], vs[i][k + 1], vs[i + 1][k + 1], vs[i + 1][k]]
                uvs = [(A[k][1], A[k][2]), (A[k + 1][1], A[k + 1][2]), (B[k + 1][1], B[k + 1][2]), (B[k][1], B[k][2])]
                M.face(q, uvs, 0)
            continue
        # Tiheä rengas -> harva rengas: vetoketjukolmiot kulman mukaan.
        aA = dense if i <= ib else sparse
        aB = dense if i + 1 <= ib else sparse
        x = y = 0
        while x < len(A) - 1 or y < len(B) - 1:
            if y == len(B) - 1 or (x < len(A) - 1 and aA[x + 1] <= aB[y + 1]):
                tri = [(i, x), (i, x + 1), (i + 1, y)]
                x += 1
            else:
                tri = [(i, x), (i + 1, y + 1), (i + 1, y)]
                y += 1
            M.face([vs[r][k] for r, k in tri], [(rings[r][k][1], rings[r][k][2]) for r, k in tri], 0)


def build_leaves(M, T, cells, far, keep=1, grow=1.0):
    c, R = T.crown
    for i, (p, up, nrm, w, cell) in enumerate(T.leaves):
        if i % keep:
            continue
        info = cells[cell]
        w2 = w * grow
        h2 = w2 * info['aspect']
        # Kortin taso: ylös-suunta lehvän suuntaan, normaali annettu.
        u = (up - nrm * up.dot(nrm))
        if u.length < 1e-4:
            u = perp_of(nrm)
        u.normalize()
        r = nrm.cross(u).normalized()
        b0 = p - u * (h2 * 0.08)
        pts = [b0 - r * (w2 / 2), b0 + r * (w2 / 2), b0 + r * (w2 / 2) + u * h2, b0 - r * (w2 / 2) + u * h2]
        # Hieman kaareva kortti: kärki painuu.
        pts[2] = pts[2] - nrm * (h2 * 0.08)
        pts[3] = pts[3] - nrm * (h2 * 0.08)
        u0, v0, u1, v1 = info['uv']
        uvs = [(u0, v0), (u1, v0), (u1, v1), (u0, v1)]
        vs = []
        for q in pts:
            e = ao_at(T, q)
            ao = 0.42 + 0.58 * smooth(e / 1.05) ** 0.8
            vs.append(M.v(q, (ao, 0.0, 1.0)))
        M.face(vs, uvs, 1)


def make_object(name, M, bark_mat, leaf_mat, meta=None, vines=None):
    me = bpy.data.meshes.new(name)
    M.bm.to_mesh(me)
    attr = me.color_attributes.new('Col', 'FLOAT_COLOR', 'POINT')
    for i, c in enumerate(M.col):
        attr.data[i].color = (c[0], c[1], c[2], 1.0)
    me.materials.append(bark_mat)
    me.materials.append(leaf_mat)
    me.materials.append(bpy.data.materials.get('treeVine') or bpy.data.materials.new('treeVine'))
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    if meta:
        ob['tree'] = json.dumps(meta)
    if vines is not None:
        ob['vines'] = json.dumps(vines)
    return ob


def game(p):
    """Blender (X, Y, Z ylös) -> peli (X, Y ylös, Z = -Y)."""
    return [round(p.x, 4), round(p.z, 4), round(-p.y, 4)]


def build_tree(name, idx, fn, bark_key, cells, mats):
    seed = 1000 + idx * 7919 + sum(ord(ch) for ch in name) * 131
    T = fn(seed)
    # Latvuksen ellipsoidi lehtien sijainneista (AO).
    if T.leaves:
        ps = [l[0] for l in T.leaves]
        c = sum(ps, V()) / len(ps)
        R = V((max(0.8, max(abs(p.x - c.x) for p in ps)), max(0.8, max(abs(p.y - c.y) for p in ps)), max(0.6, max(abs(p.z - c.z) for p in ps))))
    else:
        c, R = V((0, 0, 3)), V((2, 2, 2))
    T.crown = (c, R)
    bark_mat = mats['bark_' + bark_key]
    leaf_mat = mats['leaf']
    tr = T.branches[0]
    meta = T.meta
    top_z = max(max(p.z for b in T.branches for p in b.pts), max((l[0].z for l in T.leaves), default=0) + 0.6)
    tree_meta = {
        'kind': meta['kind'], 'base': game(meta['base']), 'top': game(meta['top']), 'r0': meta['r0'], 'r1': meta['r1'],
        'cutY': meta['cutZ'], 'height': round(top_z, 3), 'fallLen': round(top_z - meta['cutZ'] + meta['fallPad'], 3), 'logR': meta['logR'],
    }
    objs = []
    for lod in ('near', 'far'):
        far = lod == 'far'
        M = Mesh()
        # Sessio 57: kevyemmät mallit (kaukaisia puita on moninkertaisesti
        # lähellä oleviin nähden): kaukana vain runko ja pääoksat ja harvemmat,
        # isommat kortit; lähellä pienimmät oksat kolmi- ja nelikulmaisina.
        for b in T.branches:
            if far and b.level >= 2:
                continue
            if b.trunk:
                sides = 6 if far else (14 if b.radii[0] > 0.5 else 12)
            else:
                sides = [12, 7, 4, 3][min(3, b.level)] if not far else [6, 4, 3, 3][min(3, b.level)]
            build_branch(M, T, b, sides, far)
        build_leaves(M, T, cells, far, keep=4 if far else 1, grow=1.95 if far else 1.0)
        if not far:
            for pts, rv in T.climbers:
                build_climber(M, T, pts, rv)
            if T.vine_leaves:
                saved = T.leaves
                T.leaves = T.vine_leaves
                build_leaves(M, T, cells, False)
                T.leaves = saved
        ob = make_object(f'{name}_{idx}_{lod}', M, bark_mat, leaf_mat, tree_meta if not far else None,
                         [game(p) for p in T.vines] if not far else None)
        objs.append(ob)
        print('TREE', ob.name, len(ob.data.vertices), 'leaves', len(T.leaves))
    return objs


def materials():
    mats = {}
    for key in ('acacia', 'shea', 'baobab', 'rain', 'kapok', 'emergent', 'sapling'):
        m = bpy.data.materials.new('treeBark_' + key)
        mats['bark_' + key] = m
    mats['leaf'] = bpy.data.materials.new('treeLeaf')
    return mats


def main():
    argv = sys.argv[sys.argv.index('--') + 1:]
    out, cells_path = argv[0], argv[1]
    names = argv[2].split(',') if len(argv) > 2 and argv[2] else list(SPECIES)
    cells = json.load(open(cells_path))
    bpy.ops.wm.read_factory_settings(use_empty=True)
    mats = materials()
    objs = []
    for name in names:
        fn, count, bark = SPECIES[name]
        for i in range(count):
            objs += build_tree(name, i, fn, bark, cells, mats)
    bpy.ops.object.select_all(action='DESELECT')
    for ob in objs:
        ob.select_set(True)
    bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', use_selection=True, export_yup=True, export_apply=True,
                              export_colors=True, export_extras=True, export_materials='EXPORT', export_image_format='NONE',
                              export_tangents=False, export_normals=True, export_texcoords=True)
    print('EXPORTED', len(objs), out)


if __name__ == '__main__':
    main()
