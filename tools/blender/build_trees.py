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

def trunk_line(tree, base, top, r0, r1, cutZ, flare=1.4, rings=14, lobes=None, flute=0.0, profile=None):
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
            tree.lobes.append((a, tree.u(*out), min(tree.u(*hgt), cutZ - 0.05), tree.u(*wid)))
    root_top = max([h for _, _, h, _ in tree.lobes], default=0.0)
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


def rainforest(seed, kind):
    T = Tree(seed)
    if kind == 'canopy':
        Ht, r0, r1, H = T.u(6.4, 8.0), 0.32, 0.2, 0
        nl, lenl, cells, cut = (5, 7), (6.1, 7.9), ('broad_a', 'broad_b'), 0.8
        lobes, bz = (T.rng.randint(4, 5), (0.45, 0.75), (0.5, 0.72), (0.16, 0.22)), -0.6
    elif kind == 'jungle':
        Ht, r0, r1 = T.u(8.8, 10.2), 0.55, 0.36
        nl, lenl, cells, cut = (6, 8), (6.0, 7.9), ('kapok',), 1.9
        lobes, bz = (T.rng.randint(5, 6), (1.1, 1.7), (1.2, 1.75), (0.11, 0.15)), -0.8
    else:  # emergent
        Ht, r0, r1 = T.u(15.0, 18.5), 0.85, 0.48
        nl, lenl, cells, cut = (7, 9), (8.0, 10.5), ('broad_a', 'broad_b'), 2.6
        lobes, bz = (T.rng.randint(6, 7), (1.6, 2.4), (1.7, 2.4), (0.085, 0.11)), -1.0
    base = V((0, 0, bz))
    top = V((T.u(-0.15, 0.15), T.u(-0.15, 0.15), Ht))
    tr = trunk_line(T, base, top, r0, r1, cut, flare=1.15, lobes=lobes, rings=20)
    C = top + V((0, 0, 1.5))

    def steer(p, d, t):
        if kind == 'jungle':
            return UP * (0.05 + 0.15 * t) + V((0, 0, -0.06))
        if kind == 'emergent':
            # Leveä sateenvarjolatvus: oksat leviävät ja nousevat vasta kärjissä.
            return UP * (0.03 + 0.1 * t)
        return UP * 0.11

    ang = {'jungle': (1.15, 1.45), 'canopy': (0.95, 1.3), 'emergent': (0.95, 1.3)}[kind]
    at = (0.62, 1.0) if kind == 'jungle' else (0.78, 1.0)
    limbs = T.children(tr, T.rng.randint(*nl), at, ang, lenl, 0.5, 1, 7, 0.08, steer, tip_r=0.4)
    limbs.append(T.grow(top - V((0, 0, 0.3)), V((T.u(-0.15, 0.15), T.u(-0.15, 0.15), 1)), lenl[0] * 0.7, r1 * 0.7, r1 * 0.25, 1, 5, 0.08, steer))
    for lb in limbs:
        for b2 in T.children(lb, T.rng.randint(3, 4), (0.4, 1.0), (0.5, 0.9), (lenl[0] * 0.4, lenl[1] * 0.45), 0.55, 2, 4, 0.12, steer, tip_r=0.45):
            sz = {'canopy': (2.1, 2.9), 'jungle': (2.3, 3.1), 'emergent': (3.0, 3.9)}[kind]
            mode = 'up' if kind == 'jungle' else 'mix'
            for b3 in T.children(b2, T.rng.randint(2, 3), (0.4, 1.0), (0.5, 1.0), (0.6, 1.1), 0.5, 3, 3, 0.14, steer, tip_r=0.4):
                T.foliage(b3, 7, 0.2, 1.0, sz, cells, mode, C)
            T.foliage(b2, 3, 0.45, 1.0, sz, cells, mode, C)
            if T.rng.random() < 0.35:
                p, d, r = b2.at(T.u(0.3, 0.8))
                T.vines.append(p.copy())
    if kind == 'emergent':
        # Keskikerros (sessio 48, käyttäjän referenssikuva): lyhyitä sivuoksia
        # ja lehtiryppäitä rungon varrella 6-14 m:ssä.
        for i in range(T.rng.randint(4, 6)):
            z = T.u(6.0, min(14.0, Ht - 2.0))
            p, d, r = tr.at((z - base.z) / (top.z - base.z))
            a = T.u(0, 2 * math.pi)
            out = V((math.cos(a), math.sin(a), 0))
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
    for a, o, h, w in lobes:
        for f in offs:
            for sg in ((1,) if f == 0 else (-1, 1)):
                out.append((a + sg * f * w) % TAU)
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
    for la, o, h, w in lobes:
        x = g / h
        if x >= 1:
            continue
        f = (1 - x) ** 2.4 if x >= 0 else 1 - x * 1.2
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
