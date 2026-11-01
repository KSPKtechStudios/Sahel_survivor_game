# Sessio 54: verteksivärien maalausapuja (sRGB 0..1).
from mathutils import noise, Vector


def hexc(h):
    return (((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255)


def mixc(a, b, t):
    t = min(1.0, max(0.0, t))
    return tuple(a[i] + (b[i] - a[i]) * t for i in range(3))


def mulc(a, k):
    return tuple(min(1.0, max(0.0, c * k)) for c in a)


def nz(co, scale, seed=0, octaves=3):
    """Kohina 0..1."""
    v = noise.fractal(Vector(co) * scale + Vector((seed * 1.7, seed * 3.1, seed * 0.7)), 0.6, 2.0, octaves)
    return min(1.0, max(0.0, 0.5 + 0.5 * v))


def spots(co, scale, seed=0, size=0.25):
    """Pyöreitä täpliä (Voronoi): 1 täplän keskellä, 0 muualla."""
    d, _ = noise.voronoi(Vector(co) * scale + Vector((seed * 2.3, seed * 0.9, seed * 1.9)), distance_metric='DISTANCE')
    return max(0.0, 1 - d[0] / size)


def smoothstep(a, b, x):
    t = min(1.0, max(0.0, (x - a) / (b - a)))
    return t * t * (3 - 2 * t)
