# Sessio 54: esinemallien Blender-kirjasto (ajetaan: blender -b --python tools/blender/build_items.py).
#
# Periaate:
# - Jokainen esine on yksi Blender-objekti (nimi = esineen tunnus). Origo on
#   otteen kohdalla ja esine osoittaa Blenderin +Z-suuntaan (pelissä +Y).
#   Pelin X = Blenderin X, pelin Z = Blenderin -Y (glTF-vienti, +Y ylös).
# - Materiaalipaikkojen nimet viittaavat pelin materiaalikirjastoon
#   (src/models/itemAssets.js): esim. 'wood', 'iron', 'leather'. Kirjaston
#   tekstuurit toistuvat, joten UV:t ovat metreissä jaettuna tekstuurin
#   koolla (TEX_WORLD). 'bake:<tunnus>' = esineen oma leivottu tekstuuri.
# - Varjostus (AO) leivotaan verteksiväreihin (COLOR_0), jotka pelissä
#   kertovat tekstuurin värin.
import bpy
import bmesh
import math
import os
import random
from mathutils import Vector, Matrix, noise

# Tekstuurin koko maailmassa (m) ja syiden suunta: 'u' = pituussuunta U:hun
# (puun syyt vaakasuunnassa kuvassa), 'v' = pituussuunta V:hen.
TEX_WORLD = {
    'wood': (0.5, 'u'), 'hardwood': (0.5, 'u'), 'heartwood': (0.5, 'u'), 'bark': (0.35, 'v'),
    'stone': (0.4, 'u'), 'flint': (0.3, 'u'), 'clay': (0.4, 'u'),
    'iron': (0.35, 'u'), 'steel': (0.25, 'u'), 'copper': (0.35, 'u'), 'gold': (0.3, 'u'), 'brass': (0.3, 'u'),
    'leather': (0.25, 'u'), 'rope': (0.08, 'u'), 'cloth': (0.3, 'u'), 'bone': (0.3, 'u'), 'fur': (0.3, 'u'),
    'ruby': (0.1, 'u'), 'gum': (0.1, 'u'),
}


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'CPU'
    sc.cycles.samples = 48
    if not sc.world:
        sc.world = bpy.data.worlds.new('World')
    sc.world.light_settings.distance = 0.06


def material(name):
    m = bpy.data.materials.get(name)
    if m is None:
        m = bpy.data.materials.new(name)
        m.use_nodes = True
    return m


# --- Rakennusosat --------------------------------------------------------------
# Osa = (bmesh, materiaalinimi). Osat yhdistetään lopuksi yhdeksi objektiksi.

class Part:
    def __init__(self, mat):
        self.bm = bmesh.new()
        self.mat = mat
        self.uv = self.bm.loops.layers.uv.new('UVMap')

    def face(self, verts, uvs=None):
        f = self.bm.faces.new(verts)
        if uvs:
            for lp, uv in zip(f.loops, uvs):
                lp[self.uv].uv = uv
        return f


def _scale(mat):
    s, grain = TEX_WORLD.get(mat.split(':')[0], (0.3, 'u'))
    return s, grain


def loft(mat, rings, cap0=True, cap1=True, smooth=True, uv_len=None):
    """Kappale renkaista (jokainen rengas = lista Vector-pisteitä, sama määrä,
    suljettu). UV: pituus ja ympärysmitta metreinä / tekstuurin koko;
    puun syyt pituussuunnassa."""
    p = Part(mat)
    s, grain = _scale(mat)
    n = len(rings[0])
    vs = []
    # Pituus renkaiden keskipisteiden mukaan.
    cen = [sum(r, Vector()) / n for r in rings]
    acc = [0.0]
    for i in range(1, len(rings)):
        acc.append(acc[-1] + (cen[i] - cen[i - 1]).length)
    for r in rings:
        vs.append([p.bm.verts.new(v) for v in r])
    for i in range(len(rings) - 1):
        # Ympärysmitta (keskiarvo kahden renkaan välillä) U:ksi.
        per0 = [0.0]
        for k in range(1, n + 1):
            a, b = rings[i][(k - 1) % n], rings[i][k % n]
            per0.append(per0[-1] + (b - a).length)
        for k in range(n):
            k1 = (k + 1) % n
            quad = [vs[i][k], vs[i][k1], vs[i + 1][k1], vs[i + 1][k]]
            a0, a1 = per0[k], per0[k + 1]
            l0, l1 = acc[i], acc[i + 1]
            if uv_len is not None:
                l0, l1 = uv_len[i], uv_len[i + 1]
            if grain == 'u':
                uvs = [(l0 / s, a0 / s), (l0 / s, a1 / s), (l1 / s, a1 / s), (l1 / s, a0 / s)]
            else:
                uvs = [(a0 / s, l0 / s), (a1 / s, l0 / s), (a1 / s, l1 / s), (a0 / s, l1 / s)]
            f = p.face(quad, uvs)
            f.smooth = smooth
    for cap, ring, flip in ((cap0, vs[0], True), (cap1, vs[-1], False)):
        if not cap:
            continue
        pts = [v.co for v in ring]
        c = sum(pts, Vector()) / n
        cv = p.bm.verts.new(c)
        # Kansi: viuhka keskipisteestä (UV tasoprojektio).
        nrm = (pts[1] - pts[0]).cross(pts[2] - pts[0]).normalized() if n > 2 else Vector((0, 0, 1))
        t1 = (pts[0] - c).normalized()
        t2 = nrm.cross(t1)
        for k in range(n):
            a, b = ring[k], ring[(k + 1) % n]
            tri = [cv, b, a] if flip else [cv, a, b]
            uvs = [((v.co - c).dot(t1) / s, (v.co - c).dot(t2) / s) for v in tri]
            f = p.face(tri, uvs)
            f.smooth = smooth
    p.bm.normal_update()
    return p


def ring(center, axis_u, axis_v, ru, rv, n=12, phase=0.0, power=2.0):
    """Ellipsi (tai pyöristetty suorakaide, power > 2) tasossa (axis_u, axis_v)."""
    out = []
    for k in range(n):
        a = phase + 2 * math.pi * k / n
        c, s = math.cos(a), math.sin(a)
        e = 2.0 / power
        x = math.copysign(abs(c) ** e, c) * ru
        y = math.copysign(abs(s) ** e, s) * rv
        out.append(center + axis_u * x + axis_v * y)
    return out


def tube(mat, path, radius, n=12, cap0=True, cap1=True, ry=None, twist=0.0, power=2.0):
    """Putki polkua pitkin. radius(t) ja ry(t) funktioita (t 0..1) tai lukuja."""
    rings = []
    m = len(path)
    rf = radius if callable(radius) else (lambda t, r=radius: r)
    yf = ry if callable(ry) else (rf if ry is None else (lambda t, r=ry: r))
    for i, c in enumerate(path):
        t = i / (m - 1)
        d = (path[min(m - 1, i + 1)] - path[max(0, i - 1)]).normalized()
        ref = Vector((1, 0, 0)) if abs(d.x) < 0.9 else Vector((0, 1, 0))
        u = (ref - d * ref.dot(d)).normalized()
        v = d.cross(u)
        rings.append(ring(c, u, v, rf(t), yf(t), n, phase=twist * t, power=power))
    return loft(mat, rings, cap0, cap1)


def box_uv(p, scale=None):
    """Laatikkoprojektio osalle (UV metreinä / tekstuurin koko)."""
    s, _ = _scale(p.mat)
    if scale:
        s = scale
    for f in p.bm.faces:
        n = f.normal
        ax = max(range(3), key=lambda i: abs(n[i]))
        for lp in f.loops:
            co = lp.vert.co
            if ax == 0:
                uv = (co.y, co.z)
            elif ax == 1:
                uv = (co.x, co.z)
            else:
                uv = (co.x, co.y)
            lp[p.uv].uv = (uv[0] / s, uv[1] / s)


def from_object(mat, ob):
    """Blender-objektista (esim. primitiivi + muokkaimet) osa."""
    dg = bpy.context.evaluated_depsgraph_get()
    me = ob.evaluated_get(dg).to_mesh()
    p = Part(mat)
    p.bm.free()
    p.bm = bmesh.new()
    p.bm.from_mesh(me)
    uvl = p.bm.loops.layers.uv
    p.uv = uvl.active or uvl.new('UVMap')
    ob.evaluated_get(dg).to_mesh_clear()
    bpy.data.objects.remove(ob)
    return p


def displace(p, amp, freq, seed=0, mask=None):
    off = Vector((seed * 13.1, seed * 7.7, seed * 3.3))
    p.bm.normal_update()
    for v in p.bm.verts:
        w = mask(v.co) if mask else 1.0
        d = noise.fractal(v.co * freq + off, 0.6, 2.0, 3) * amp * w
        v.co += v.normal * d


def transform(p, mat4):
    bmesh.ops.transform(p.bm, matrix=mat4, verts=p.bm.verts)


def bevel_part(p, width, segments=2, angle=0.6):
    edges = [e for e in p.bm.edges if e.calc_face_angle(0) > angle]
    if edges:
        bmesh.ops.bevel(p.bm, geom=edges, offset=width, segments=segments, profile=0.5, affect='EDGES', clamp_overlap=True)


def build(name, parts, ao=True, ao_strength=0.85, ao_dist=0.05, paint=None):
    """Osat yhdeksi objektiksi materiaalipaikkoineen, AO verteksiväreihin.
    paint(co, normal, mat) -> sRGB-väri (0..1) tai None: väri kerrotaan AO:lla
    (eloperäiset esineet, joiden kuviot ovat verteksiväreissä)."""
    me = bpy.data.meshes.new(name)
    ob = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(ob)
    mats = []
    for p in parts:
        if p.mat not in mats:
            mats.append(p.mat)
    for m in mats:
        me.materials.append(material(m))
    bm = bmesh.new()
    uvl = bm.loops.layers.uv.new('UVMap')
    for p in parts:
        tmp = bpy.data.meshes.new('tmp')
        p.bm.to_mesh(tmp)
        n0 = len(bm.faces)
        bm.from_mesh(tmp)
        bpy.data.meshes.remove(tmp)
        mi = mats.index(p.mat)
        bm.faces.ensure_lookup_table()
        for i in range(n0, len(bm.faces)):
            bm.faces[i].material_index = mi
        p.bm.free()
    # Osien saumat yhteen (sama sijainti), jotta varjostus jatkuu saumassa.
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    bm.to_mesh(me)
    bm.free()
    me.uv_layers.active = me.uv_layers[0]
    if ao:
        bake_ao(ob, ao_strength, ao_dist)
    if paint:
        paint_colors(ob, paint, mats)
    return ob


def _lin(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def paint_colors(ob, fn, mats):
    me = ob.data
    ca = me.color_attributes.get('Col') or me.color_attributes.new('Col', 'BYTE_COLOR', 'POINT')
    # Verteksin materiaali: ensimmäinen sitä käyttävä tahko.
    vmat = [None] * len(me.vertices)
    for poly in me.polygons:
        for vi in poly.vertices:
            if vmat[vi] is None:
                vmat[vi] = mats[poly.material_index]
    for v in me.vertices:
        c = fn(v.co, v.normal, vmat[v.index] or mats[0])
        if c is None:
            continue
        d = ca.data[v.index]
        k = d.color[0]
        d.color = (_lin(c[0]) * k, _lin(c[1]) * k, _lin(c[2]) * k, 1)


def bake_ao(ob, strength=0.85, dist=0.05, samples=64):
    sc = bpy.context.scene
    sc.world.light_settings.distance = dist
    sc.cycles.samples = samples
    me = ob.data
    # Verteksikohtainen (POINT): kulmakohtainen väri pilkkoisi verteksit viennissä.
    ca = me.color_attributes.new('Col', 'BYTE_COLOR', 'POINT')
    me.color_attributes.active_color = ca
    for o in bpy.context.scene.objects:
        o.hide_render = o is not ob
        o.select_set(o is ob)
    bpy.context.view_layer.objects.active = ob
    sc.render.bake.target = 'VERTEX_COLORS'
    bpy.ops.object.bake(type='AO', target='VERTEX_COLORS')
    # Voimakkuus ja hieman pehmeämpi käyrä.
    for d in ca.data:
        a = d.color[0]
        k = 1 - strength * (1 - a ** 0.8)
        d.color = (k, k, k, 1)
    ob.hide_render = True


def export_glb(path, names):
    for o in bpy.context.scene.objects:
        o.select_set(o.name in names)
    bpy.ops.export_scene.gltf(
        filepath=path, export_format='GLB', use_selection=True, export_yup=True,
        export_apply=True, export_texcoords=True, export_normals=True, export_colors=True,
        export_materials='EXPORT', export_image_format='NONE', export_tangents=False,
        export_animations=False, export_skins=False, export_morph=False, export_lights=False, export_cameras=False,
    )


# --- Apufunktiot ---------------------------------------------------------------

def V(x, y, z):
    return Vector((x, y, z))


def lerp(a, b, t):
    return a + (b - a) * t


def smooth(t):
    t = min(1.0, max(0.0, t))
    return t * t * (3 - 2 * t)


def rng(seed):
    return random.Random(seed)
