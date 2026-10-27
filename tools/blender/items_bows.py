# Sessio 54: jouset ja nuolet. Jousen runko seuraa pelin käyrää (items2.js
# bowPoints): pelin XY-tasossa x = kaari eteen, y = pituus; Blenderissä X ja Z.
# Kädessä käytetään pelkkää runkoa ('bowbody_<tunnus>', jänne piirretään
# erikseen), esineessä runko ja jänne. Nuolet: yksittäinen 'arrow1_<tunnus>'
# (jänteellä ja lennossa, kärki +Y) ja kolmen nipun esine.
import math
from itemlib import V, Vector, Matrix, smooth, lerp, ring, loft, transform, displace, box_uv, Part, rng
from registry import item, ITEMS
from shapes import tube_path, cord, ellipse_pts, scallops, wrap
from paint import hexc, mixc, mulc, nz
from items_weapons import ball, bar

STYLES = {
    'bow': dict(recurve=False, long=1.0, thick=1.0, wood='wood', grip='rope', tips=None, gem=False),
    'sinew_bow': dict(recurve=True, long=1.0, thick=1.0, wood='hardwood:b89070', grip='leather', tips='bone', gem=False, back='rope:d8c49a'),
    'hardwood_bow': dict(recurve=False, long=1.14, thick=1.0, wood='hardwood', grip='leather', tips=None, gem=False),
    'heartwood_bow': dict(recurve=True, long=1.08, thick=1.2, wood='heartwood', grip='leather', tips='iron', gem=False, back='rope:d8c49a'),
    'ruby_bow': dict(recurve=True, long=1.0, thick=1.0, wood='hardwood:7a6a6a', grip='leather', tips='iron', gem=True),
}


def bow_curve(recurve, long, t):
    """Pelin bowPoints-käyrä (t -1..1) -> Blender (X, Z)."""
    x = 0.12 * (1 - t * t)
    if recurve:
        x += abs(t) ** 6 * 0.08
    return x, t * 0.62 * long


def bow_body(st):
    parts = []
    seg = 40
    rings = []
    th = st['thick']
    for i in range(seg + 1):
        t = i / seg * 2 - 1
        x, z = bow_curve(st['recurve'], st['long'], t)
        x2, z2 = bow_curve(st['recurve'], st['long'], min(1, t + 0.01))
        x1, z1 = bow_curve(st['recurve'], st['long'], max(-1, t - 0.01))
        d = V(x2 - x1, 0, z2 - z1).normalized()
        a = abs(t)
        grip = 1 - smooth((a - 0.08) / 0.12)
        # Kaari: litteä lapa (leveys Y) ja paksumpi kahva.
        w = (0.017 - 0.009 * a ** 1.3) * th + grip * 0.003
        thick = (0.009 - 0.0045 * a) * th + grip * 0.008
        u = V(0, 1, 0)
        v = d.cross(u)
        rings.append(ring(V(x, 0, z), u, v, w, thick, 12, power=2.6))
    body = loft(st['wood'], rings)
    parts.append(body)
    if st.get('back'):
        # Selkäpuolen jännekerros (jousen ulkokaari = -X... vatsa = +X; selkä kohti pelaajaa).
        brings = []
        for i in range(seg + 1):
            t = i / seg * 2 - 1
            if abs(t) > 0.9:
                continue
            x, z = bow_curve(st['recurve'], st['long'], t)
            x2, z2 = bow_curve(st['recurve'], st['long'], min(1, t + 0.01))
            x1, z1 = bow_curve(st['recurve'], st['long'], max(-1, t - 0.01))
            d = V(x2 - x1, 0, z2 - z1).normalized()
            v = d.cross(V(0, 1, 0))
            a = abs(t)
            w = (0.017 - 0.009 * a ** 1.3) * th * 0.92
            thick = (0.009 - 0.0045 * a) * th
            brings.append(ring(V(x, 0, z) - v * thick * 0.8, V(0, 1, 0), v, w, 0.0016, 10, power=3))
        parts.append(loft(st['back'], brings))
    # Kahvan kääre.
    gx, _ = bow_curve(st['recurve'], st['long'], 0)
    rings = []
    for i in range(13):
        s = i / 12
        z = lerp(-0.055, 0.055, s) * st['long']
        pts = []
        for k in range(14):
            ang = 2 * math.pi * k / 14
            f = (s * 9 + ang / (2 * math.pi)) % 1
            r = 1 + 0.08 * f
            pts.append(V(gx + math.cos(ang) * 0.0175 * th * r, math.sin(ang) * 0.021 * th * r, z))
        rings.append(pts)
    parts.append(loft(st['grip'], rings))
    if st['tips']:
        for t in (-1, 1):
            x, z = bow_curve(st['recurve'], st['long'], t)
            parts.append(ball(st['tips'], V(x, 0, z + t * 0.004), 0.009, sub=2, sz=1.7))
    if st['gem']:
        g = Part('ruby')
        from items_misc import crystal
        crystal(g, V(gx - 0.014, 0, -0.016), V(-1, 0, 0.0), 0.014, 0.014, 0.012, 9)
        for f in g.bm.faces:
            f.smooth = False
        box_uv(g)
        parts.append(g)
    return parts


def bow_string(st):
    x0, z0 = bow_curve(st['recurve'], st['long'], -1)
    x1, z1 = bow_curve(st['recurve'], st['long'], 1)
    return tube_path('rope:f0e8d8', [V(x0, 0, z0 + 0.004), V(x1, 0, z1 - 0.004)], lambda t: 0.0022, n=5)


def _reg(name, fn, **opts):
    fn.__name__ = name
    fn.opts = opts
    ITEMS[name] = fn


for _id, _st in STYLES.items():
    _reg(_id, (lambda st=_st: bow_body(st) + [bow_string(st)]))
    _reg('bowbody_' + _id, (lambda st=_st: bow_body(st)))


# --- Nuolet ----------------------------------------------------------------------------------

def feather_paint(co, n, mat):
    if mat != 'feather':
        return None
    return mixc(hexc(0xf2ede2), hexc(0xb8b0a0), nz(co, 120) * 0.5)


HEADS = {
    'arrow_wood': None,
    'arrow_bone': 'bone',
    'arrow_flint': 'flint',
    'arrow_copper': 'copper',
    'arrow_iron': 'steel',
}


def arrow(kind):
    parts = [tube_path('wood:d8c098', [V(0, 0, -0.1), V(0, 0, 0.62)], lambda t: 0.0055, n=8)]
    mat = HEADS[kind]
    if mat is None:
        # Teroitettu, tulessa karkaistu kärki.
        parts.append(tube_path('wood:4a3426', [V(0, 0, 0.6), V(0, 0, 0.63), V(0, 0, 0.665)], lambda t: 0.0056 * (1 - t) ** 0.9 + 0.0003, n=8))
    else:
        from shapes import blade
        w = (lambda t: 0.012 * math.sin(math.pi * min(1, 0.15 + t * 0.95)) ** 0.8 + 0.0008) if mat in ('flint', 'bone') else (lambda t: 0.0105 * (1 - t ** 1.4) + 0.0006)
        b = blade(mat, 0.6, 0.67, w, lambda t: 0.0028 * (1 - 0.6 * t) + 0.0005, n=10, seg=10)[0]
        if mat == 'flint':
            scallops(b, 0.0007, 0.004, seed=3)
        parts.append(b)
        parts.append(cord('rope', ellipse_pts(V(0, 0, 0.598), V(1, 0, 0), V(0, 1, 0), 0.0062, 0.0062, 10), 0.0013, n=4))
    if kind != 'arrow_wood':
        # Kolme sulkaa (yksi punainen erottuu lennossa).
        for i in range(3):
            a = 2 * math.pi * i / 3
            d = V(math.cos(a), math.sin(a), 0)
            f = Part('feather' if i else 'feather:e0402a')
            rows = []
            for k in range(7):
                t = k / 6
                z = lerp(-0.09, 0.02, t)
                hgt = 0.016 * math.sin(math.pi * min(1, 0.1 + t * 0.95)) * (1 - 0.4 * t)
                rows.append([f.bm.verts.new(d * 0.0055 + V(0, 0, z)), f.bm.verts.new(d * (0.0055 + hgt) + V(0, 0, z + 0.006))])
            for k in range(6):
                f.face([rows[k][0], rows[k + 1][0], rows[k + 1][1], rows[k][1]])
            box_uv(f, 0.05)
            parts.append(f)
        parts.append(cord('rope', ellipse_pts(V(0, 0, 0.024), V(1, 0, 0), V(0, 1, 0), 0.0062, 0.0062, 10), 0.0012, n=4))
    return parts


for _k in HEADS:
    _reg('arrow1_' + _k, (lambda k=_k: arrow(k)), paint=feather_paint, ao_strength=0.5)

    def _bundle(k=_k):
        out = []
        for i in range(3):
            ps = arrow(k)
            m = Matrix.Translation(V((i - 1) * 0.02, 0, 0)) @ Matrix.Rotation((i - 1) * 0.12, 4, 'Y')
            for p in ps:
                transform(p, m)
            out += ps
        return out
    _reg(_k, _bundle, paint=feather_paint, ao_strength=0.6)
