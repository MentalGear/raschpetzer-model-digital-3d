#!/usr/bin/env python3
"""Bake the ACT national 3D buildings (LOD 2.2, CityGML, with oblique-photo textures) over the
town-context area for the 3D-buildings layer (OpenStreetMap footprints stay the fallback outside
its coverage).

SOURCE: Administration du cadastre et de la topographie (ACT), "Base de données nationale des
bâtiments 3D 2023" (ACT2023v2), commune Walferdange — data.public.lu, licence CC0:
  https://download.data.public.lu/resources/base-de-donnees-nationale-des-batiments-3d-2023/20260325-115800/act2023v2-bati3d-walferdange.zip
NOTE: the ACT2023v2 CityGML stores posList coordinates NORTHING-FIRST (y x z) although it declares
EPSG:2169 — every commune's envelope looks ~5 km "off" until the axes are swapped (checked
against the correctly-ordered 2020 edition: identical extent after the swap). Pass --swap-xy.

Usage:
  python3 scripts/bake-buildings3d.py <ACT2023v2_bati3d_Walferdange.gml> <act2023v2-bati3d-walferdange.zip> --swap-xy
Requires: numpy, pyproj, pillow.

Outputs
  assets/buildings3d-context.js   window.RASCH_BUILDINGS3D — geometry + per-ring colours +
                                  the STANDARD texture set (every building; 256 px near the
                                  camera's key spots, 64 px elsewhere; 2048² atlases)
  assets/buildings3d-hq.js        window.RASCH_BUILDINGS3D_HQ — UVs of the HIGH-QUALITY set
                                  (768 px near the key spots, 160 px elsewhere; 4096² atlases)
  assets/buildings3d/std-N.webp, hq-N.webp   texture atlases

Encoding (little-endian, base64): `v` int16 triples per vertex (lon, lat in 1e-6° relative to the
context centre; z in dm above 220 m); `r` uint16 per ring: bit15 hole (interior of the preceding
exterior ring), bit14 wall (else roof), bits0-13 vertex count; `b` uint16 rings per building;
`c` uint8 RGB per ring (mean colour of the ring's texture region); per texture set `t` uint8 per
ring (0 = untextured, k+1 = atlas k) and `uv` uint16 pairs (0..65535) for its textured rings'
vertices, in ring order.
"""
import sys, io, os, json, base64, math, zipfile, xml.etree.ElementTree as ET
import numpy as np
from pyproj import Transformer
from PIL import Image

CONTEXT = dict(west=6.118, east=6.162, south=49.652, north=49.6708)
LON0 = (CONTEXT['west'] + CONTEXT['east']) / 2
LAT0 = (CONTEXT['south'] + CONTEXT['north']) / 2
Z0 = 220.0
# Standard texture set: buildings within these radii of the camera's key spots.
FOCUS = [(49.65905, 6.13215, 380),   # "You are here" kiosk / town centre
         (49.66360, 6.15700, 260),   # plateau car parks + bus stop
         (49.66630, 6.14800, 250)]   # visitor's gallery / spring outflow
# Texture caps (longest side, px) near the camera spots / elsewhere. Every building is textured in
# both sets; the caps keep GPU memory sane (hq ≈ 7 × 4096² atlases, std ≈ 4 × 2048²).
SETS = {'std': dict(near=256, far=64, atlas=2048, quality=82), 'hq': dict(near=768, far=160, atlas=4096, quality=88)}

G = '{http://www.opengis.net/gml}'
B = '{http://www.opengis.net/citygml/building/2.0}'
A = '{http://www.opengis.net/citygml/appearance/2.0}'
GID = G + 'id'

gml_path, zip_path = sys.argv[1], sys.argv[2]
swap = '--swap-xy' in sys.argv
to_wgs = Transformer.from_crs('EPSG:2169', 'EPSG:4326', always_xy=True)

# ---- 1. one streaming pass: buildings (rings) + appearance (ring id -> texture, uv) ----
buildings = []        # [(ring list)], ring = dict(id, flags, xyz ndarray)
ring_tex = {}         # ring id -> (imageURI, uv ndarray)
cur_img = None
for ev, el in ET.iterparse(gml_path, events=('start', 'end')):
    if ev == 'start':
        continue
    tag = el.tag
    if tag == A + 'imageURI':
        cur_img = el.text.strip().replace('\\', '/')
    elif tag == A + 'textureCoordinates':
        rid = el.get('ring', '').lstrip('#')
        uv = np.array(el.text.split(), float).reshape(-1, 2)
        ring_tex[rid] = (cur_img, uv)
    elif tag == A + 'ParameterizedTexture':
        el.clear()
    elif tag == B + 'Building':
        rings = []
        for stag, wall in (('RoofSurface', 0), ('WallSurface', 1)):
            for surf in el.iter(B + stag):
                for poly in surf.iter(G + 'Polygon'):
                    for part, hole in (('exterior', 0), ('interior', 1)):
                        for rel in poly.findall(G + part):
                            lr = rel.find(G + 'LinearRing')
                            pl = rel.find('.//' + G + 'posList')
                            if pl is None or lr is None:
                                continue
                            a = np.array(pl.text.split(), float).reshape(-1, 3)
                            if swap:
                                a = a[:, [1, 0, 2]]
                            closed = len(a) > 1 and np.allclose(a[0], a[-1])
                            if closed:
                                a = a[:-1]
                            if len(a) >= 3:
                                rings.append(dict(id=lr.get(GID), flags=(hole << 15) | (wall << 14), xyz=a, closed=closed))
        if rings:
            buildings.append(rings)
        el.clear()
print(f'parsed {len(buildings)} buildings, {len(ring_tex)} textured rings')

# ---- 2. keep buildings in the context area; decide the standard (near-camera) subset ----
kept = []
k = 111320.0
for rings in buildings:
    allv = np.vstack([r['xyz'] for r in rings])
    lon, lat = to_wgs.transform(allv[:, 0].mean(), allv[:, 1].mean())
    if not (CONTEXT['west'] <= lon <= CONTEXT['east'] and CONTEXT['south'] <= lat <= CONTEXT['north']):
        continue
    near = any(math.hypot((lat - fl) * k, (lon - fo) * k * math.cos(math.radians(fl))) <= rad for fl, fo, rad in FOCUS)
    kept.append((rings, near))
print(f'kept {len(kept)} buildings in the context area ({sum(n for _, n in kept)} near the camera spots)')

# ---- 3. textures: load, mean colour per ring, pack atlases per set ----
z = zipfile.ZipFile(zip_path)
znames = {n.replace('\\', '/'): n for n in z.namelist()}
_img_cache = {}
def load_img(uri):
    if uri not in _img_cache:
        n = znames.get(uri) or znames.get(uri.split('/')[-1])
        _img_cache[uri] = Image.open(io.BytesIO(z.read(n))).convert('RGB') if n else None
    return _img_cache[uri]

def ring_uv(r):
    t = ring_tex.get(r['id'])
    if not t:
        return None, None
    uri, uv = t
    n = len(r['xyz'])
    if len(uv) == n + 1:
        uv = uv[:-1]
    if len(uv) != n:
        return None, None
    return uri, np.clip(uv, 0, 1)

ring_colors = []
default_roof, default_wall = (111, 103, 99), (226, 219, 207)
for rings, _ in kept:
    for r in rings:
        uri, uv = ring_uv(r)
        col = default_wall if r['flags'] & (1 << 14) else default_roof
        if uri:
            im = load_img(uri)
            if im is not None:
                W, H = im.size
                u0, u1 = uv[:, 0].min(), uv[:, 0].max(); v0, v1 = uv[:, 1].min(), uv[:, 1].max()
                box = (int(u0 * (W - 1)), int((1 - v1) * (H - 1)), int(u1 * (W - 1)) + 1, int((1 - v0) * (H - 1)) + 1)
                if box[2] > box[0] and box[3] > box[1]:
                    col = tuple(int(c) for c in np.asarray(im.crop(box).resize((1, 1), Image.BILINEAR)).reshape(3))
        ring_colors.append(col)

def pack(set_name, include):
    cfg = SETS[set_name]
    S = cfg['atlas']
    placements = {}               # uri -> (atlas, x, y, w, h)
    atlases, x, y, shelf = [Image.new('RGB', (S, S), (120, 120, 120))], 0, 0, 0
    uris, capof = [], {}
    for rings, near in kept:
        if not include(near):
            continue
        for r in rings:
            uri, _ = ring_uv(r)
            if uri:
                if uri not in capof:
                    uris.append(uri)
                capof[uri] = max(capof.get(uri, 0), cfg['near'] if near else cfg['far'])
    # tallest first packs shelves tighter
    sized = []
    for uri in uris:
        im = load_img(uri)
        if im is None:
            continue
        w, h = im.size
        s = min(1.0, capof[uri] / max(w, h))
        sized.append((uri, max(4, round(w * s)), max(4, round(h * s))))
    sized.sort(key=lambda t: -t[2])
    PAD = 2
    for uri, w, h in sized:
        if x + w + PAD > S:
            x, y, shelf = 0, y + shelf + PAD, 0
        if y + h + PAD > S:
            atlases.append(Image.new('RGB', (S, S), (120, 120, 120))); x, y, shelf = 0, 0, 0
        im = load_img(uri).resize((w, h), Image.LANCZOS)
        # 2 px edge padding (repeat the border) against mip/filter bleeding
        big = im.resize((w + 2 * PAD, h + 2 * PAD), Image.NEAREST)
        big.paste(im, (PAD, PAD))
        atlases[-1].paste(big, (x, y))
        placements[uri] = (len(atlases) - 1, x + PAD, y + PAD, w, h)
        x += w + 2 * PAD; shelf = max(shelf, h + 2 * PAD)
    os.makedirs('assets/buildings3d', exist_ok=True)
    for i, a in enumerate(atlases):
        a.save(f'assets/buildings3d/{set_name}-{i}.webp', 'WEBP', quality=cfg['quality'], method=5)
    t, uvs = [], []
    for rings, near in kept:
        for r in rings:
            uri, uv = ring_uv(r)
            if include(near) and uri in placements:
                ai, px, py, w, h = placements[uri]
                t.append(ai + 1)
                U = (px + uv[:, 0] * (w - 1) + 0.5) / S
                V = 1 - (py + (1 - uv[:, 1]) * (h - 1) + 0.5) / S
                uvs.append(np.round(np.stack([U, V], 1) * 65535).astype('<u2'))
            else:
                t.append(0)
    uvb = np.vstack(uvs).tobytes() if uvs else b''
    print(f'  {set_name}: {len(placements)} textures -> {len(atlases)} atlas(es) of {S}²')
    return dict(atlases=[f'assets/buildings3d/{set_name}-{i}.webp' for i in range(len(atlases))],
                t=base64.b64encode(np.array(t, 'u1').tobytes()).decode(), uv=base64.b64encode(uvb).decode())

std = pack('std', lambda near: True)
hq = pack('hq', lambda near: True)

# ---- 4. geometry ----
verts, rhead, counts = [], [], []
for rings, _ in kept:
    counts.append(len(rings))
    for r in rings:
        a = r['xyz']
        lo, la = to_wgs.transform(a[:, 0], a[:, 1])
        q = np.stack([np.round((np.asarray(lo) - LON0) * 1e6), np.round((np.asarray(la) - LAT0) * 1e6),
                      np.round((a[:, 2] - Z0) * 10)], 1)
        assert np.abs(q).max() < 32767 and len(a) < (1 << 14)
        verts.append(q.astype('<i2'))
        rhead.append(r['flags'] | len(a))
b64 = lambda arr: base64.b64encode(arr.tobytes()).decode()
doc = {
    '_doc': 'GENERATED by scripts/bake-buildings3d.py — ACT national 3D buildings 2023 (ACT2023v2, LOD 2.2, '
            'CityGML + oblique-photo textures), commune Walferdange, © ACT / data.public.lu, CC0. See the script.',
    'lon0': LON0, 'lat0': LAT0, 'z0': Z0, 'count': len(kept), 'rings': len(rhead),
    'v': b64(np.vstack(verts).astype('<i2')), 'r': b64(np.array(rhead, '<u2')), 'b': b64(np.array(counts, '<u2')),
    'c': b64(np.array(ring_colors, 'u1')), 'std': std,
}
with open('assets/buildings3d-context.js', 'w') as f:
    f.write('// GENERATED by scripts/bake-buildings3d.py — DO NOT EDIT.\nwindow.RASCH_BUILDINGS3D = ' + json.dumps(doc) + ';\n')
with open('assets/buildings3d-hq.js', 'w') as f:
    f.write('// GENERATED by scripts/bake-buildings3d.py — DO NOT EDIT. High-quality texture set (loaded on demand).\n'
            'window.RASCH_BUILDINGS3D_HQ = ' + json.dumps(hq) + ';\n')
print('wrote assets/buildings3d-context.js, assets/buildings3d-hq.js')
