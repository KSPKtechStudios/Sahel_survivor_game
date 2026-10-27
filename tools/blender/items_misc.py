# Sessio 54: materiaalit ja arvoesineet (kivet, kiteet ym.).
import math
import bpy
from itemlib import V, Vector, Part, from_object, displace, box_uv, transform, Matrix, rng
from registry import item


@item(ao_strength=0.7, ao_dist=0.08)
def stone():
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=4, radius=1)
    ob = bpy.context.active_object
    p = from_object('stone', ob)
    transform(p, Matrix.Diagonal((0.15, 0.13, 0.085, 1)))
    displace(p, 0.018, 7.0, seed=3)
    displace(p, 0.004, 28.0, seed=9)
    transform(p, Matrix.Translation(V(0, 0, 0.02)))
    box_uv(p)
    for f in p.bm.faces:
        f.smooth = True
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
