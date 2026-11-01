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
    from itemlib import transport_frames
    pts = list(pts)
    rings = [ring(c, u, v, r, r, n) for c, (d, u, v) in zip(pts, transport_frames(pts, closed=closed))]
    if closed:
        rings.append([p.copy() for p in rings[0]])
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


def pick_head(mat, zc, half, r0, tipA=0.003, tipB=0.003, arch=0.03, seg=30, n=10, tip_mat=None, chisel=False, collar=0.25, aspect=1.35, chisel_w=1.6):
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
            ry = lerp(r, r * chisel_w, smooth((a - 0.3) / 0.7))
            rz = lerp(r, 0.0015, smooth((a - 0.3) / 0.7))
        d = V(1, 0, -arch * 4 * (2 * t - 1) / half / 2).normalized()
        u = V(0, 1, 0)
        v = d.cross(u)  # u x v = d (pituussuunta +X)
        rings.append(ring(V(x, 0, z), u, v, ry, rz, n, power=2.4))
    if tip_mat:
        k1, k2 = round(seg * 0.18), round(seg * 0.82)
        return [loft(tip_mat, rings[:k1 + 1], cap1=False), loft(mat, rings[k1:k2 + 1], cap0=False, cap1=False), loft(tip_mat, rings[k2:], cap0=False)]
    return [loft(mat, rings)]


def blade(mat, z0, z1, width, thick, n=14, seg=30, tip=0.08, guard_w=None, edge_mat=None, fuller=0.0, curve=0.0, power=2.0, edge_split=0.62, grooves=None, shift=None):
    """Miekan / veitsen terä Z-suunnassa: linssimäinen poikkileikkaus,
    leveys width(t), paksuus thick(t). curve = terän kaarevuus X-suunnassa.
    fuller < 0 = keskiharjanne. grooves = [(keskikohta -1..1, puoliväli, syvyys)]
    useita kapeita uria (takouba). shift(t) = terän keskilinjan siirto X:ssä."""
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
            if grooves and 0.03 < t < 0.8:
                for gc, gw, gd in grooves:
                    if abs(c - gc) < gw:
                        py *= 1 - gd * (1 - abs(c - gc) / gw) * smooth((0.8 - t) / 0.1)
            pts.append(V(x + px + (shift(t) if shift else 0.0), py, z))
        rings.append(pts)
    return [loft(mat, rings, cap1=True)]


def tube_path(mat, path, rfn, n=8, cap0=True, cap1=True):
    """Putki polkua pitkin, säde rfn(t)."""
    return tube(mat, path, rfn, n, cap0=cap0, cap1=cap1)


def mirror_x(p):
    """Peilaa osan X-akselin yli (normaalit pysyvät ulospäin)."""
    import bmesh
    for v in p.bm.verts:
        v.co.x = -v.co.x
    bmesh.ops.reverse_faces(p.bm, faces=p.bm.faces[:])
    for f in p.bm.faces:
        for lp in f.loops:
            uv = lp[p.uv].uv
            lp[p.uv].uv = (-uv[0], uv[1])
    return p


def lathe_z(mat, prof, c=V(0, 0, 0), n=16, cap0=True, cap1=True, sy=1.0):
    """Pyörähdyskappale Z-akselin ympäri profiilista [(r, z), ...]
    (alhaalta ylös tai ylhäältä alas; normaalit ulospäin kummin tahansa)."""
    if prof[0][1] > prof[-1][1]:
        prof = prof[::-1]
        cap0, cap1 = cap1, cap0
    rings = []
    for r, z in prof:
        rings.append(ring(c + V(0, 0, z), V(1, 0, 0), V(0, 1, 0), r, r * sy, n))
    return loft(mat, rings, cap0=cap0, cap1=cap1)


def shaped_disc(mat, rfn, y0, y1, n=48, rows=7, zc=0.0, bend=0.0, dome=0.0, rmax=0.3, uv_scale=0.6):
    """Litteä levy XZ-tasossa, ääriviiva r = rfn(a) keskipisteestä (0, zc).
    Etupinta y1 (+Y), takapinta y0. bend kaartaa levyä pystyakselin ympäri
    (reunat taaksepäin), dome pullistaa keskeltä."""
    import bmesh
    p = Part(mat)
    bm = p.bm
    s = uv_scale

    def yoff(x, z, k):
        return -bend * (x / rmax) ** 2 + dome * (1 - k * k)

    cf = bm.verts.new(V(0, y1 + dome, zc))
    cb = bm.verts.new(V(0, y0 + dome * 0.6, zc))
    rf, rb = [], []
    for j in range(1, rows + 1):
        k = j / rows
        f, b = [], []
        for i in range(n):
            a = 2 * math.pi * i / n
            r = rfn(a) * k
            x, z = math.cos(a) * r, zc + math.sin(a) * r
            yo = yoff(x, z, k)
            f.append(bm.verts.new(V(x, y1 + yo, z)))
            b.append(bm.verts.new(V(x, y0 + yo * 0.6 - bend * 0.4 * (x / rmax) ** 2, z)))
        rf.append(f)
        rb.append(b)
    uv = lambda v: (v.co.x / s, v.co.z / s)
    for i in range(n):
        i1 = (i + 1) % n
        p.face([cf, rf[0][i], rf[0][i1]], [uv(cf), uv(rf[0][i]), uv(rf[0][i1])])
        p.face([cb, rb[0][i1], rb[0][i]], [uv(cb), uv(rb[0][i1]), uv(rb[0][i])])
        for j in range(rows - 1):
            q = [rf[j][i], rf[j + 1][i], rf[j + 1][i1], rf[j][i1]]
            p.face(q, [uv(v) for v in q])
            q = [rb[j][i1], rb[j + 1][i1], rb[j + 1][i], rb[j][i]]
            p.face(q, [uv(v) for v in q])
        q = [rf[-1][i], rb[-1][i], rb[-1][i1], rf[-1][i1]]
        p.face(q, [(i / n * 6, 0), (i / n * 6, 0.05), ((i + 1) / n * 6, 0.05), ((i + 1) / n * 6, 0)])
    for f in bm.faces:
        f.smooth = True
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    p.outline = [rf[-1][i].co.copy() for i in range(n)]
    return p


# --- Sessio 56: kivien lohkeamispinnat ------------------------------------------------------

def facet_cuts(p, cuts, depth, seed=0, dirs=None, soft=0.92):
    """Lohkeamispinnat: kärjet siirretään tasojen taakse (tasaiset viisteet).
    depth = (min, max) syvyys reunasta; dirs(R) -> tason normaali.
    Palauttaa [(normaali, leikatut kärjet)]."""
    import random
    R = random.Random(seed)
    out = []
    for k in range(cuts):
        n = dirs(R) if dirs else V(R.uniform(-1, 1), R.uniform(-1, 1), R.uniform(-1, 1)).normalized()
        m = max(v.co.dot(n) for v in p.bm.verts)
        d = m - R.uniform(*depth)
        cut = []
        for v in p.bm.verts:
            s = v.co.dot(n) - d
            if s > 0:
                v.co -= n * s * soft
                cut.append(v)
        out.append((n, cut))
    return out


def split_part(p, sel, mat2):
    """Jakaa osan: tahkot, joille sel(f) on tosi, siirtyvät uuteen osaan (mat2).
    Saumakärjet yhdistyvät taas koottaessa, joten varjostus jatkuu."""
    import bmesh
    from itemlib import Part
    flags = [sel(f) for f in p.bm.faces]
    q = Part(mat2)
    q.bm.free()
    q.bm = p.bm.copy()
    q.uv = q.bm.loops.layers.uv.active
    p.bm.faces.ensure_lookup_table()
    q.bm.faces.ensure_lookup_table()
    bmesh.ops.delete(p.bm, geom=[f for f, s in zip(p.bm.faces, flags) if s], context='FACES')
    bmesh.ops.delete(q.bm, geom=[f for f, s in zip(q.bm.faces, flags) if not s], context='FACES')
    return q
