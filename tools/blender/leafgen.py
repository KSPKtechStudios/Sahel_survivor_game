# Sessio 56: puiden lehtiatlas. Jokainen ruutu on ylhäältä kuvattu lehvä
# (oksa + lehdet), joka mallinnetaan ja renderöidään Cyclesillä läpinäkyvälle
# taustalle. Värit ovat albedoa (emissio-shader, Standard-näkymä), varjostus
# tulee pelissä valaistuksesta. Lehvän tyvi on ruudun alareunassa.
# Ajo: blender -b --factory-startup --python tools/blender/leafgen.py -- <kansio>
import bpy
import bmesh
import math
import os
import random
import sys
from mathutils import Vector, Matrix, noise

V = Vector
CELL = 512
COLS, ROWS = 4, 2
# Ruudut (sarake, rivi ylhäältä): nimi -> rakennusfunktio.
CELLS = ['acacia_a', 'acacia_b', 'shea', 'baobab', 'broad_a', 'broad_b', 'kapok', 'sapling']


def srgb2lin(c):
    return tuple(((x + 0.055) / 1.055) ** 2.4 if x > 0.04045 else x / 12.92 for x in c)


def hexc(h):
    return ((h >> 16 & 255) / 255, (h >> 8 & 255) / 255, (h & 255) / 255)


def mix(a, b, t):
    t = max(0.0, min(1.0, t))
    return tuple(a[i] + (b[i] - a[i]) * t for i in range(3))


def mul(a, k):
    return tuple(max(0.0, min(1.0, x * k)) for x in a)


class Sprig:
    """Kerää kolmioita väreineen; z = korkeus kameraa kohti (syvyysvarjostus)."""

    def __init__(self):
        self.bm = bmesh.new()
        self.col = []  # väri per verteksi (sRGB)

    def vert(self, p, c):
        v = self.bm.verts.new(p)
        self.col.append(c)
        return v

    def quad(self, a, b, c, d):
        self.bm.faces.new([a, b, c, d])

    def tri(self, a, b, c):
        self.bm.faces.new([a, b, c])

    def tube(self, pts, r0, r1, col, n=5):
        """Ohut oksa pisteiden kautta (kartio)."""
        rings = []
        m = len(pts)
        for i, p in enumerate(pts):
            d = (pts[min(m - 1, i + 1)] - pts[max(0, i - 1)]).normalized()
            u = d.cross(V((0, 0, 1)))
            if u.length < 1e-4:
                u = V((1, 0, 0))
            u.normalize()
            w = d.cross(u)
            r = r0 + (r1 - r0) * i / (m - 1)
            ring = []
            for k in range(n):
                a = 2 * math.pi * k / n
                shade = 0.75 + 0.25 * math.cos(a)
                ring.append(self.vert(p + u * math.cos(a) * r + w * math.sin(a) * r, mul(col, shade)))
            rings.append(ring)
        for i in range(m - 1):
            for k in range(n):
                k1 = (k + 1) % n
                self.quad(rings[i][k], rings[i][k1], rings[i + 1][k1], rings[i + 1][k])

    def leaf(self, base, direction, length, width, shape, col, rng, fold=0.25, droop=0.0, segs=8, tip_col=None, rib=0.12, edge=0.8, up=None):
        """Lehti: keskisuoni ja reunat; shape(t) = suhteellinen puolileveys.
        fold = keskisuonen taite (V-muoto), droop = kärjen painuminen."""
        d = direction.normalized()
        side = V((-d.y, d.x, 0)).normalized() if up is None else d.cross(up).normalized()
        upv = d.cross(side).normalized() * -1 if up is None else up
        if upv.z < 0:
            upv = -upv
        jit = 0.88 + 0.24 * rng.random()
        c0 = mul(col, jit)
        c1 = mul(tip_col or col, jit * 1.05)
        rows = []
        for i in range(segs + 1):
            t = i / segs
            hw = width * shape(t)
            p = base + d * (length * t) - upv * (droop * length * t * t)
            cc = mix(c0, c1, t)
            mid = self.vert(p + upv * (fold * hw), mul(cc, 1.0 + rib))
            left = self.vert(p + side * hw, mul(cc, edge))
            right = self.vert(p - side * hw, mul(cc, edge * 0.95))
            rows.append((left, mid, right))
        for i in range(segs):
            l0, m0, r0 = rows[i]
            l1, m1, r1 = rows[i + 1]
            self.quad(l0, m0, m1, l1)
            self.quad(m0, r0, r1, m1)

    def finish(self, name):
        me = bpy.data.meshes.new(name)
        self.bm.verts.ensure_lookup_table()
        self.bm.to_mesh(me)
        attr = me.color_attributes.new('Col', 'FLOAT_COLOR', 'POINT')
        for i, c in enumerate(self.col):
            attr.data[i].color = (*srgb2lin(c), 1.0)
        ob = bpy.data.objects.new(name, me)
        bpy.context.scene.collection.objects.link(ob)
        return ob


# --- Lehtimuodot ---------------------------------------------------------------------------------

def ellipse(t):
    return math.sin(math.pi * t) ** 0.75


def oblong(t):
    return min(1.0, math.sin(math.pi * t) ** 0.4 * 1.05) * (1 - 0.35 * t ** 6)


def drip(t):
    # Leveä keskeltä, pitkä kapea kärki (sademetsän tippukärki).
    return math.sin(math.pi * min(1.0, t / 0.82)) ** 0.7 * (1 - 0.9 * max(0.0, (t - 0.72) / 0.28)) + 0.02 * (t < 0.98)


def lance(t):
    return math.sin(math.pi * t) ** 0.9 * (1 - 0.3 * t)


def wavy(shape, amp, freq, seed):
    return lambda t: shape(t) * (1 + amp * math.sin(t * freq + seed))


# --- Lehvät --------------------------------------------------------------------------------------

def acacia_sprig(seed, flowers=False):
    """Akasian lehvä: viuhkana polveilevia oksia, valkoiset piikkiparit ja
    nippuina kaksinkertaisesti parilehdykkäiset lehdet (pienet lehdyköt)."""
    rng = random.Random(seed)
    s = Sprig()
    twig_col = hexc(0x4e3c2e)
    thorn = hexc(0xe2dccb)
    leaf = hexc(0x55652e)
    leaf2 = hexc(0x7d8a44)

    def bipinnate(p, d, L):
        # Sessio 57: enemmän ja isompia lehdyköitä (kortti peittää noin puolet).
        pairs = rng.randint(4, 7)
        rach = [p + d * (L * i / 6) for i in range(7)]
        s.tube(rach, 0.0012, 0.0006, hexc(0x5e5e34), n=3)
        side = V((-d.y, d.x, 0))
        for i in range(pairs):
            t = 0.25 + 0.75 * i / max(1, pairs - 1)
            q = p + d * (L * t)
            for sg in (-1, 1):
                pd = (side * sg * 0.85 + d * 0.5).normalized()
                pl = L * rng.uniform(0.35, 0.5)
                for j in range(9):
                    tt = (j + 0.5) / 9
                    lp = q + pd * (pl * tt) + V((0, 0, 0.002 * rng.random()))
                    ps = V((-pd.y, pd.x, 0))
                    for sg2 in (-1, 1):
                        c = mix(leaf, leaf2, rng.random() * 0.7 + 0.15 * tt)
                        s.leaf(lp, (ps * sg2 + pd * 0.6).normalized(), 0.0105, 0.0036, ellipse, c, rng, fold=0, segs=2, edge=0.9, rib=0.05)

    def twig(p, d, L, depth):
        pts = [p]
        steps = max(3, int(L / 0.07))
        for i in range(steps):
            ang = (0.3 if i % 2 else -0.3) + rng.uniform(-0.12, 0.12)
            d = (Matrix.Rotation(ang * 0.5, 3, 'Z') @ d).normalized()
            p = p + d * (L / steps)
            pts.append(p.copy())
            side = 1 if i % 2 else -1
            perp = V((-d.y, d.x, 0)) * side
            for sg in (-1, 1):
                tip = p + (perp * sg * 0.9 + d * 0.3).normalized() * rng.uniform(0.015, 0.028)
                s.tube([p, tip], 0.0016, 0.0003, thorn, n=3)
            for k in range(rng.randint(3, 5)):
                ang2 = rng.uniform(-1.6, 1.6)
                ld = (Matrix.Rotation(ang2, 3, 'Z') @ (perp * 0.6 + d * 0.4)).normalized()
                bipinnate(p + V((0, 0, 0.004 + 0.01 * depth)), ld, rng.uniform(0.05, 0.085))
            if flowers and rng.random() < 0.25:
                c = p + perp * 0.025 + V((0, 0, 0.02))
                for k in range(16):
                    a2 = rng.uniform(0, 2 * math.pi)
                    e = rng.uniform(0, 1)
                    q = c + V((math.cos(a2) * 0.01 * e, math.sin(a2) * 0.01 * e, 0.004))
                    s.leaf(q, V((math.cos(a2), math.sin(a2), 0)), 0.006, 0.0018, ellipse, hexc(0xf0ecd8), rng, fold=0)
            if depth < 1 and rng.random() < 0.45:
                twig(p, (Matrix.Rotation(0.8 * side + rng.uniform(-0.2, 0.2), 3, 'Z') @ d).normalized(), L * rng.uniform(0.35, 0.5), depth + 1)
        s.tube(pts, 0.007 * (1.0 if depth == 0 else 0.6), 0.0025, twig_col)

    base = V((0, -0.5, 0))
    for k in range(5):
        a = math.pi / 2 + (k - 2) * 0.36 + rng.uniform(-0.08, 0.08)
        twig(base + V((rng.uniform(-0.02, 0.02), 0, 0)), V((math.cos(a), math.sin(a), 0)), rng.uniform(0.5, 0.62), 0)
    return s


def rosette(s, rng, c, n, L, W, col, col2, shape, droop=0.05, z=0.0):
    for k in range(n):
        a = 2 * math.pi * k / n + rng.uniform(-0.15, 0.15)
        d = V((math.cos(a), math.sin(a), 0))
        ll = L * rng.uniform(0.75, 1.1)
        stalk = c + d * 0.015
        s.tube([c, stalk + V((0, 0, z + 0.003))], 0.0025, 0.0015, hexc(0x6a5a32), n=3)
        s.leaf(stalk + V((0, 0, z + 0.004 * k / n)), d, ll, W * rng.uniform(0.85, 1.1), wavy(shape, 0.08, 23, k), mix(col, col2, rng.random()), rng,
               fold=0.18, droop=droop, segs=10, tip_col=mul(col2, 1.05), rib=0.18)


def fan_twigs(s, rng, n, spread, L, bark, r0=0.012):
    """Tyvestä viuhkana haarovat oksat; palauttaa kärkipisteet."""
    base = V((0, -0.5, 0))
    tips = []
    for k in range(n):
        a = math.pi / 2 + (k - (n - 1) / 2) * spread + rng.uniform(-0.08, 0.08)
        d = V((math.cos(a), math.sin(a), 0))
        ll = L * rng.uniform(0.7, 1.0)
        mid = base + d * ll * 0.5 + V((rng.uniform(-0.03, 0.03), 0, 0.01))
        tip = base + d * ll + V((0, 0, 0.02))
        s.tube([base, mid, tip], r0, r0 * 0.5, bark)
        tips.append((tip, d))
    return tips


def shea_sprig(seed):
    """Karitepuu: paksut oksat, joiden kärjissä tiheinä ruusukkeina
    pitkulaiset, aaltoreunaiset nahkeat lehdet."""
    rng = random.Random(seed)
    s = Sprig()
    tips = fan_twigs(s, rng, 6, 0.42, 0.78, hexc(0x4a3c30))
    for i, (t, d) in enumerate(tips):
        rosette(s, rng, t, 16, 0.17, 0.03, hexc(0x2a4418), hexc(0x47652a), oblong, droop=0.06, z=0.003 * i)
        mid = t - d * 0.25 + V((0, 0, 0.002))
        rosette(s, rng, mid, 10, 0.13, 0.026, hexc(0x2c4a1a), hexc(0x40602a), oblong, droop=0.05, z=0.0)
    return s


def palmate(s, rng, p, d, petiole, n, L, W, col, col2, shape):
    tip = p + d * petiole
    s.tube([p, tip + V((0, 0, 0.004))], 0.0025, 0.0015, hexc(0x7a8040), n=3)
    for k in range(n):
        a = (k - (n - 1) / 2) * (2.4 / max(1, n - 1))
        ld = (Matrix.Rotation(a, 3, 'Z') @ d).normalized()
        ll = L * (1 - 0.35 * abs(a) / 1.2)
        s.leaf(tip + V((0, 0, 0.006)), ld, ll, W, shape, mix(col, col2, rng.random()), rng, fold=0.2, droop=0.04, segs=8, tip_col=col2, rib=0.15)


def baobab_sprig(seed):
    rng = random.Random(seed)
    s = Sprig()
    tips = fan_twigs(s, rng, 4, 0.55, 0.6, hexc(0x8a7a6a), r0=0.014)
    for t, d in tips:
        for k in range(7):
            a = math.atan2(d.y, d.x) + (k - 3) * 0.5 + rng.uniform(-0.1, 0.1)
            dd = V((math.cos(a), math.sin(a), 0))
            palmate(s, rng, t, dd, rng.uniform(0.05, 0.1), rng.choice((5, 5, 7)), 0.12, 0.03, hexc(0x456428), hexc(0x66843a), ellipse)
    return s


def broad_sprig(seed, light=False):
    """Sademetsän lehvä: viuhkana viisi oksaa, joissa isoja soikeita lehtiä
    tippukärjin kummallakin puolella. Sessio 57: tiheämpi (lehdet peittävät
    noin puolet kortista), jotta latvusto sulkeutuu ilman lisäkortteja."""
    rng = random.Random(seed)
    s = Sprig()
    bark = hexc(0x5a4a38)
    col = hexc(0x23451a if not light else 0x3a6824)
    col2 = hexc(0x376024 if not light else 0x5a8a32)
    for b_ in range(5):
        pts = []
        p = V((0, -0.5, 0))
        d = V(((b_ - 2) * 0.42, 1, 0)).normalized()
        for i in range(9):
            pts.append(p.copy())
            d = (Matrix.Rotation(rng.uniform(-0.12, 0.12) - (b_ - 2) * 0.03, 3, 'Z') @ d).normalized()
            p = p + d * 0.092
        s.tube(pts, 0.008, 0.003, bark)
        for i, q in enumerate(pts[1:]):
            for side in (-1, 1):
                if i < 2 and rng.random() < 0.5:
                    continue
                dd = (Matrix.Rotation(side * rng.uniform(0.55, 1.05), 3, 'Z') @ d).normalized()
                L = rng.uniform(0.17, 0.25) * (1 - 0.25 * i / 8)
                s.tube([q, q + dd * 0.018 + V((0, 0, 0.005))], 0.0022, 0.0016, hexc(0x5a6a2a), n=3)
                c = mix(col, col2, rng.random() * 0.6)
                s.leaf(q + dd * 0.018 + V((0, 0, 0.006 + 0.002 * i + 0.008 * b_ + 0.003 * side)), dd, L, L * 0.3, drip, c, rng, fold=0.12, droop=0.05, segs=12, tip_col=col2, rib=0.2)
        for k in range(3):
            dd = (Matrix.Rotation(rng.uniform(-0.6, 0.6), 3, 'Z') @ d).normalized()
            s.leaf(pts[-1] + V((0, 0, 0.05)), dd, 0.14, 0.04, drip, col2, rng, fold=0.2, segs=10, rib=0.15)
    return s


def kapok_sprig(seed):
    # Sessio 57: viisi oksaa ja leveämmät sormilehdykät (tiheämpi kortti).
    rng = random.Random(seed)
    s = Sprig()
    tips = fan_twigs(s, rng, 5, 0.6, 0.55, hexc(0x6a6a5a), r0=0.01)
    for t, d in tips:
        for k in range(8):
            a = math.atan2(d.y, d.x) + (k - 3.5) * 0.45 + rng.uniform(-0.1, 0.1)
            dd = V((math.cos(a), math.sin(a), 0))
            palmate(s, rng, t, dd, rng.uniform(0.06, 0.14), rng.choice((5, 7, 7)), 0.13, 0.03, hexc(0x325a1c), hexc(0x4e782a), lance)
        # Lehtiä myös oksan puolivälissä, ettei viuhkan keskelle jää aukkoa.
        m = V((0, -0.5, 0)).lerp(t, 0.5)
        for k in range(4):
            a = math.atan2(d.y, d.x) + (k - 1.5) * 0.9 + rng.uniform(-0.15, 0.15)
            dd = V((math.cos(a), math.sin(a), 0))
            palmate(s, rng, m + V((0, 0, -0.01)), dd, rng.uniform(0.04, 0.08), 5, 0.11, 0.028, hexc(0x2e5418), hexc(0x46702a), lance)
    return s


def sapling_sprig(seed):
    rng = random.Random(seed)
    s = Sprig()
    s.tube([V((0, -0.5, 0)), V((0, 0.0, 0.02))], 0.008, 0.005, hexc(0x5a5030))
    for k in range(7):
        a = math.pi / 2 + (k - 3) * 0.55 + rng.uniform(-0.15, 0.15)
        d = V((math.cos(a), math.sin(a), 0))
        s.leaf(V((0, -0.02 + 0.01 * k, 0.02 + 0.003 * k)), d, rng.uniform(0.3, 0.4), 0.1, ellipse, hexc(0x2e5a1e), rng, fold=0.15, droop=0.08, segs=12,
               tip_col=hexc(0x4a7a2a), rib=0.25)
    return s


BUILD = {
    'acacia_a': lambda: acacia_sprig(11),
    'acacia_b': lambda: acacia_sprig(23, flowers=True),
    'shea': lambda: shea_sprig(5),
    'baobab': lambda: baobab_sprig(7),
    'broad_a': lambda: broad_sprig(3),
    'broad_b': lambda: broad_sprig(9, light=True),
    'kapok': lambda: kapok_sprig(4),
    'sapling': lambda: sapling_sprig(8),
}


def setup_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'CPU'
    sc.cycles.samples = 24
    sc.cycles.use_denoising = False
    sc.render.film_transparent = True
    sc.render.resolution_x = CELL
    sc.render.resolution_y = CELL
    sc.render.filter_size = 0.9
    sc.view_settings.view_transform = 'Standard'
    sc.view_settings.look = 'None'
    sc.render.image_settings.file_format = 'PNG'
    sc.render.image_settings.color_mode = 'RGBA'
    world = bpy.data.worlds.new('w')
    world.color = (0, 0, 0)
    sc.world = world
    cam = bpy.data.cameras.new('cam')
    cam.type = 'ORTHO'
    cam.ortho_scale = 1.0
    ob = bpy.data.objects.new('cam', cam)
    ob.location = (0, 0, 5)
    sc.collection.objects.link(ob)
    sc.camera = ob
    mat = bpy.data.materials.new('albedo')
    mat.use_nodes = True
    nt = mat.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    em = nt.nodes.new('ShaderNodeEmission')
    at = nt.nodes.new('ShaderNodeVertexColor')
    at.layer_name = 'Col'
    nt.links.new(at.outputs['Color'], em.inputs['Color'])
    nt.links.new(em.outputs['Emission'], out.inputs['Surface'])
    return mat


def fit_cell(ob, margin=0.47):
    """Skaalaa lehvän ruudun sisään (tyvi alareunan keskellä pysyy paikallaan)."""
    me = ob.data
    xs = [v.co.x for v in me.vertices]
    ys = [v.co.y for v in me.vertices]
    k = 1.0
    k = min(k, margin / max(1e-6, max(abs(x) for x in xs)))
    k = min(k, (margin + 0.5) / max(1e-6, max(ys) + 0.5))
    if k < 1.0:
        for v in me.vertices:
            v.co.x *= k
            v.co.y = -0.5 + (v.co.y + 0.5) * k
            v.co.z *= k
    return k


def depth_shade(ob, s):
    """Alempana olevat (peittyvät) osat tummemmiksi: syvyysvarjostus."""
    me = ob.data
    zs = [v.co.z for v in me.vertices]
    z0, z1 = min(zs), max(zs)
    attr = me.color_attributes['Col']
    for i, v in enumerate(me.vertices):
        k = 0.72 + 0.28 * ((v.co.z - z0) / max(1e-6, z1 - z0)) ** 0.7
        c = attr.data[i].color
        attr.data[i].color = (c[0] * k, c[1] * k, c[2] * k, 1.0)


def main(outdir):
    os.makedirs(outdir, exist_ok=True)
    for name in CELLS:
        mat = setup_scene()
        s = BUILD[name]()
        ob = s.finish(name)
        ob.data.materials.append(mat)
        k = fit_cell(ob)
        depth_shade(ob, s)
        bpy.context.scene.render.filepath = os.path.join(outdir, f'cell_{name}.png')
        bpy.ops.render.render(write_still=True)
        print('CELL', name, len(ob.data.polygons), 'fit', round(k, 3))


if __name__ == '__main__':
    argv = sys.argv[sys.argv.index('--') + 1:]
    main(argv[0])
