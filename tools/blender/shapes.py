# Sessio 54: yhteiset muodot (varret, kääreet, sidokset, kirveen- ja hakunterät, terät).
import math
from mathutils import noise
from itemlib import V, Vector, ring, loft, lerp, smooth, Part, tube


def haft(mat, z0, z1, rx, ry, n=14, seg=26, bow=-0.012, knob=0.22, taper=0.12, x0=0.0, top_swell=0.0):
    """Varsi Z-akselia pitkin: soikea, alapää hieman taakse (-X) ja paksumpi nuppi."""
    rings = []
    for i in range(seg + 1):
        t = i / seg
        z = lerp(z0, z1, t)
        x = x0 + bow * (1 - t) ** 2
        k = 1 + knob * (1 - smooth(t / 0.07)) + top_swell * smooth((t - 0.8) / 0.15)
        rings.append(ring(V(x, 0, z), V(1, 0, 0), V(0, 1, 0), rx * k * (1 - taper * t), ry * k * (1 - taper * 0.7 * t), n, power=2.2))
    return loft(mat, rings)


def wrap(mat, z0, z1, rx, ry, turns=7, step=0.0013, n=14, seg=36, bow=-0.012, zb0=None, zb1=None, x0=0.0):
    """Kierretty nauha (nahka tai nyöri) varren ympärillä: limittäiset kierrokset.
    bow/zb0/zb1: sama kaarevuus kuin varressa (x = bow * (1 - t)^2, t varren matkalla)."""
    rings = []
    zb0 = z0 if zb0 is None else zb0
    zb1 = z1 if zb1 is None else zb1
    for i in range(seg + 1):
        t = i / seg
        z = lerp(z0, z1, t)
        tb = (z - zb0) / (zb1 - zb0)
        x = x0 + bow * (1 - tb) ** 2
        pts = []
        for k in range(n):
            a = 2 * math.pi * k / n
            f = (t * turns + a / (2 * math.pi)) % 1.0
            e = min(1.0, t / 0.04, (1 - t) / 0.04)
            r = 1 + (step * (0.35 + 0.65 * f) * e) / rx
            pts.append(V(x + math.cos(a) * rx * r, math.sin(a) * ry * r, z))
        rings.append(pts)
    return loft(mat, rings)


def cord(mat, pts, r, n=5, closed=True):
    """Ohut nyöri pisteiden kautta (suljettu silmukka tai avoin)."""
    if closed:
        pts = list(pts) + [pts[0], pts[1]]
    rings = []
    m = len(pts)
    for i in range(m - (1 if closed else 0)):
        c = pts[i]
        d = (pts[min(m - 1, i + 1)] - pts[max(0, i - 1)]).normalized()
        ref = Vector((0, 0, 1)) if abs(d.z) < 0.9 else Vector((1, 0, 0))
        u = (ref - d * ref.dot(d)).normalized()
        v = d.cross(u)
        rings.append(ring(c, u, v, r, r, n))
    if closed:
        rings = rings[:-1]
        rings[-1] = [p.copy() for p in rings[0]]
    return loft(mat, rings, cap0=not closed, cap1=not closed)


def ellipse_pts(c, u, v, ru, rv, n=24, wob=0.0, seed=0):
    out = []
    for k in range(n):
        a = 2 * math.pi * k / n
        w = 1 + wob * math.sin(a * 3 + seed)
        out.append(c + u * math.cos(a) * ru * w + v * math.sin(a) * rv * w)
    return out


def lashing(mat, zc, hx, hy, h, r=0.0028, loops=3, haft_rx=0.017, haft_ry=0.013, x0=0.0):
    """Ristisidos varren ja terän liitokseen: kierroksia varren ympäri terän ylä-
    ja alapuolella sekä vinot lenkit terän yli."""
    parts = []
    for side in (-1, 1):
        for i in range(loops):
            z = zc + side * (h / 2 + r * (1.2 + 2.1 * i))
            pts = ellipse_pts(V(x0, 0, z), V(1, 0, 0), V(0, 1, 0), haft_rx + r * 0.9, haft_ry + r * 0.9, 12)
            parts.append(cord(mat, pts, r))
    for s in (-1, 1):
        for i in range(2):
            ang = s * (0.75 + 0.12 * i)
            u = V(math.cos(ang), 0, math.sin(ang))
            pts = ellipse_pts(V(x0, 0, zc), u, V(0, 1, 0), hx + r * 2, hy + r * 1.5 + i * r * 0.6, 16)
            parts.append(cord(mat, pts, r))
    return parts


def scallops(p, amp, cell, seed=0, mask=None, axis=None):
    """Piikiven lohkaisuarvet: koverat simpukkamaiset kuopat (Voronoi)."""
    off = Vector((seed * 3.7, seed * 1.3, seed * 2.9))
    p.bm.normal_update()
    for v in p.bm.verts:
        w = mask(v.co) if mask else 1.0
        if w <= 0:
            continue
        d, _ = noise.voronoi(v.co / cell + off, distance_metric='DISTANCE')
        f1 = d[0]
        v.co -= v.normal * amp * w * (0.55 - min(1.0, f1) ** 1.6)


def head_loft(mat, x0, x1, top, bot, thick, seg=26, n=18, bulge=0.0, split=None, split_mat=None, power=2.6):
    """Kirveen tai hakun terä: loft X-suunnassa. top(s), bot(s) = ylä- ja
    alareunan z, thick(s) = puolipaksuus (Y). bulge = terän kaarevuus (m).
    split = s, josta alkaen materiaali on split_mat (esim. kirkas terä)."""
    rings = []
    for i in range(seg + 1):
        s = i / seg
        x = lerp(x0, x1, s)
        zt, zb = top(s), bot(s)
        zc, hh = (zt + zb) / 2, (zt - zb) / 2
        pts = ring(V(x, 0, zc), V(0, 1, 0), V(0, 0, 1), thick(s), hh, n, power=power)
        if bulge:
            b = bulge * smooth((s - 0.6) / 0.4)
            for p in pts:
                w = (p.z - zc) / max(1e-6, hh)
                p.x += b * (1 - w * w)
        rings.append(pts)
    if split is None:
        return [loft(mat, rings)]
    k = max(1, min(seg - 1, round(split * seg)))
    return [loft(mat, rings[:k + 1], cap1=False), loft(split_mat, rings[k:], cap0=False)]


def pick_head(mat, zc, half, r0, tipA=0.003, tipB=0.003, arch=0.03, seg=30, n=10, tip_mat=None, chisel=False, collar=0.25, aspect=1.35):
    """Hakun kärki: kaareva tanko X-suunnassa varren läpi (keskellä paksumpi kaulus).
    tipA = -X-pään säde, tipB = +X-pään säde; chisel = +X-pää litteä taltta."""
    rings = []
    for i in range(seg + 1):
        t = i / seg
        x = lerp(-half, half, t)
        z = zc + arch * (1 - (2 * t - 1) ** 2) - arch
        a = abs(2 * t - 1)
        tip = tipB if t > 0.5 else tipA
        r = lerp(r0, tip, smooth(a) ** 1.3) + r0 * collar * (1 - smooth(a / 0.18))
        ry = r * 0.8
        rz = r * aspect
        if chisel and t > 0.5:
            ry = lerp(r, r * 1.6, smooth((a - 0.3) / 0.7))
            rz = lerp(r, 0.0015, smooth((a - 0.3) / 0.7))
        d = V(1, 0, -arch * 4 * (2 * t - 1) / half / 2).normalized()
        u = V(0, 1, 0)
        v = d.cross(u)  # u x v = d (pituussuunta +X)
        rings.append(ring(V(x, 0, z), u, v, ry, rz, n, power=2.4))
    if tip_mat:
        k1, k2 = round(seg * 0.18), round(seg * 0.82)
        return [loft(tip_mat, rings[:k1 + 1], cap1=False), loft(mat, rings[k1:k2 + 1], cap0=False, cap1=False), loft(tip_mat, rings[k2:], cap0=False)]
    return [loft(mat, rings)]


def blade(mat, z0, z1, width, thick, n=14, seg=30, tip=0.08, guard_w=None, edge_mat=None, fuller=0.0, curve=0.0, power=2.0, edge_split=0.62):
    """Miekan / veitsen terä Z-suunnassa: linssimäinen poikkileikkaus,
    leveys width(t), paksuus thick(t). curve = terän kaarevuus X-suunnassa."""
    rings = []
    for i in range(seg + 1):
        t = i / seg
        z = lerp(z0, z1, t)
        w = width(t)
        th = thick(t)
        x = curve * t * t
        pts = []
        for k in range(n):
            a = 2 * math.pi * k / n
            c, s = math.cos(a), math.sin(a)
            # Linssi: paksuus pienenee reunoja kohti; keskellä veriura.
            px = c * w
            py = math.copysign(abs(s) ** (2 / power), s) * th * (1 - 0.85 * abs(c) ** 2.2)
            if fuller and abs(c) < 0.35 and 0.05 < t < 0.75:
                py *= 1 - fuller * (1 - abs(c) / 0.35)
            pts.append(V(x + px, py, z))
        rings.append(pts)
    return [loft(mat, rings, cap1=True)]


def tube_path(mat, path, rfn, n=8, cap0=True, cap1=True):
    """Putki polkua pitkin, säde rfn(t)."""
    return tube(mat, path, rfn, n, cap0=cap0, cap1=cap1)
