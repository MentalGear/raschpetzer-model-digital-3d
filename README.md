# Raschpëtzer Qanat — Interactive 3D Visualization

An interactive 3D visualization of the **Raschpëtzer**, a Roman underground water
supply system (qanat) near Walferdange/Helmsange, Luxembourg. It renders the
topography, the shafts P‑7A→P9, the water gallery, the hydrogeology (strata +
groundwater/qanat flows), and lets you explore it with real elevation data.

Every fact shown (shaft depths, gallery gradient, geology, hydrology) is driven
by a **cited Single Source of Truth** (`data/`) and traceable to a primary
source; documented facts are visually distinguished from inferred/schematic ones.

## Features

- **Real terrain (GeoData)**: **ACT LiDAR 2019 (0.5 m)** elevation, with shafts
  placed by their **georeferenced** OSM coordinates (elevation cross-checked
  against LiDAR to 0.5–2.5 m; plan/label confidence varies per shaft) and the
  gallery held **near-level** per the brochure. A **Surrounding area** control
  reveals more of the DEM around the qanat. See `docs/DATA_CREDIBILITY.md`.
- **Honesty encoding**: georeferenced positions are `reconstructed` (per-shaft
  confidence), documented-depth shafts are drawn solid and inferred ones faded,
  and the source is flagged on-canvas.
- **Contour-map rendering** with bold index contours + elevation labels.
- **Faithful qanat**: documented shaft depths (P5 ≈ 36 m), near‑level gallery at
  the real ~0.1 % gradient with the P6/P4 steps, separate auxiliary channel.
- **Geology cross-section**: weathered rock / Luxembourg sandstone / marl /
  keuper, with groundwater flowing **East** and the qanat gallery **West**.
- **Click a shaft → info panel** with values, units, provenance (citation chips)
  and knowledge‑status badges; **Guided tour** flies P‑7A→P9.
- **Points of interest**: floating photo/icon circles with a connector arrow down to
  the ground — car parks and bus stop on the CR 125, the visitor's gallery, the lit
  shafts P5 and P-4, the diverted-water outflow and the Dauvebur spring — clickable for details;
  defined in `data/poi.json` (toggle *Points of interest*, with a *POI size* slider and a
  *Constant screen size* switch: fixed on-screen size at any zoom, or scale with the model;
  overlapping markers are hidden by priority until you zoom in).
- **Title screen / kiosk mode** (default on; Settings → *Title screen & tour*): opens on a
  DVD-menu-style title card over a looping ~90 s camera tour — from the **"You are here"**
  kiosk marker in Walferdange town centre (in front of Maison Dufaing), an overview from above,
  the qanat, then each point of interest, with captions — over the 2019 aerial, revealing the
  qanat underground for the
  qanat and the lit shafts (Settings: *Reveal the qanat by* — cutting a trench into the
  terrain, default, or a split screen). Any touch exits; it returns after
  2 minutes idle. Shared links with a view/selection (`?cam=` / `?sel=`) skip it.
- **Town context**: a coarse (~50 m) ACT LiDAR 2019 grid + geoportail.lu topographic map/aerial
  over Walferdange and the valley (`scripts/bake-context.mjs`), shown around the modelled window,
  with **3D buildings**: the ACT national 3D buildings 2023 (LOD 2.2 roofs, oblique-photo
  façade textures; data.public.lu, CC0; `scripts/bake-buildings3d.py`) for Walferdange, and
  OpenStreetMap footprints extruded to (mostly estimated) heights where ACT has none
  (`scripts/bake-buildings.mjs`). Buildings between the camera and what it looks at dissolve
  (dithered), so they never hide the kiosk marker or the view.
  Note: the ACT2023v2 CityGML declares EPSG:2169 but lists **northing first** — the bake
  swaps the axes (`--swap-xy`; checked against the correctly ordered 2020 edition).
- **High-quality textures (big screen)** (Settings, off by default): swaps in 4096² building
  atlases (768 px façades near the kiosk / car parks / visitor's gallery) and an 8192 px
  context aerial (~0.4 m/px). Loaded on demand; needs ~1 GB of video memory.
- **Site level of detail**: from far away (the town, the overview) the whole qanat is ONE
  "Raschpëtzer" marker with the qanat shown in x-ray beneath it; the detailed POIs fade in
  as you get closer (tap the marker to fly in). While a POI is active, the others shrink and fade.
- **Title tour extras**: town landmarks (town hall, sports hall) flown past before the
  overview, a station photo per stop (data/poi.json `tourPhoto`; stand-ins until real photos
  arrive), the wide qanat shot **slices the whole landscape** along the qanat line (close-ups
  still dig a trench; Settings → *Reveal the qanat by*), the town context **fades softly**
  into the background at its border, and an optional plain **blur behind the title and
  captions** (Settings, off by default).
- **Arrow keys** ← / →: previous / next station — tour shot on the title screen (the tour
  keeps running), or point of interest while exploring (selects it and flies there).
- **Active POI**: the selected POI (or the tour's current stop) grows ~2.4× and swaps its icon
  for its photo where one exists (P5, P-4 interior, parking sign, spring outflow).
- **Annotations** (drop notes, localStorage, import/export), **measurement tool**,
  **animated water flow**, W↔E flip, reference-image overlay.
- **Context-aware controls**: only the sliders/toggles that affect the current
  view are shown.

## Quick start

Requires [Bun](https://bun.sh) (or Node ≥ 18).

```bash
bun install
bun run dev        # bakes the data, starts Vite at http://localhost:5173
```

`predev` runs `bun run bake` automatically. Any static file server also works
(the app is zero-build):

```bash
bun run bake                 # regenerate assets/data.bundle.js + docs
python3 -m http.server 8000  # then open http://localhost:8000/
```

## Project structure

```
index.html                 # the app (Three.js, single file)
vendor/                    # three.min.js, OrbitControls.js (pinned)
assets/                    # geodata-walferdange.js, images, data.bundle.js (generated)
data/                      # ── Single Source of Truth (edit here) ──
  sources.json             #   bibliography / citation registry
  site.json                #   headline facts, dataset (FAIR) metadata, CRS registry, regions
  shafts.json              #   per-shaft records (position, depth, floor, notes, provenance)
  gallery.json             #   gradient, steps, channel, sections, auxiliary channel
  geology.json             #   strata, dip, structure, groundwater
  hydrology.json           #   flows, springs, chemistry
  paradata.json            #   reasoning behind modeled/inferred choices
  poi.json                 #   visitor points of interest (parking, P5, spring) — orientation aids
  model-config.json        #   visualization-only config (camera, colours, scene scale) — NOT facts
scripts/
  validate.mjs             # SSOT validation (CI gate)
  bake.mjs                 # validate → assets/data.bundle.js + docs/RASCHPETZER_DATA.md
docs/
  RASCHPETZER_DATA.md      # human-readable knowledge base (GENERATED — do not edit)
  BACKLOG.md
```

## Data & provenance (SSOT)

The dataset is the source of truth; the app and the docs are generated from it.

- **Edit** `data/*.json`, then run `bun run bake`. This validates the data, writes
  the runtime bundle (`assets/data.bundle.js` → `window.SSOT`), and regenerates
  `docs/RASCHPETZER_DATA.md`. **Never edit the generated files.**
- **Validate** at any time / in CI: `bun run validate` (checks referential
  integrity, status enums, that documented facts carry a source, ranges, CRS).
- **Provenance model**: values are plain scalars with a sparse `_prov` sibling map
  (per-field `source`/`locator`/`status` overriding record defaults). Two axes:
  `knowledgeStatus` (documented → inferred → reconstructed → hypothetical /
  schematic) and `confidence`. Entities carry lightweight **CIDOC-CRM** class
  tags; modeled/inferred choices are explained in `paradata.json` (London Charter
  / Seville Principles). Positions use a declared `model-schematic` CRS with real
  `geo` coordinates reserved for future survey data.

### Facts vs. visualization config

`data/` (everything except `model-config.json`) holds **citable facts** and drives
the geometry. `model-config.json` holds **visualization-only** settings (camera,
colours, scene-scale slider defaults). The parametric sliders are a *display
lens*: real-metre read-outs (info panel, measurements) are invariant to them.

### Terrain data (LiDAR sampling)

Real terrain comes from the **ACT LiDAR 2019 (0.5 m) DTM** (data.public.lu),
queried point-by-point from `map.geoportail.lu/raster` and baked into a
regular grid: `scripts/sample-lidar.mjs` fetches into a `data/lidar/samples.ndjson`
cache (append-only, never re-fetches a cached point), then `scripts/bake-lidar.mjs`
interpolates that cache onto a chosen grid and writes `assets/geodata-*.js`.

The query endpoint returns one elevation per request, so resolution is a
direct points-vs-fetch-time tradeoff (~150 ms/request, sequential):

| square side | spacing | grid | points | ≈ fetch time |
|---|---|---|---|---|
| 320 m | 3.6 m (current hi-res inset) | 90×90 | 8,100 | ~20 min |
| 320 m | 2 m | 161×161 | ~25,900 | ~1 hr |
| 320 m | 1 m | 321×321 | ~103,000 | ~4.3 hr |
| 320 m | 0.5 m (native) | 641×641 | ~411,000 | ~17 hr |

0.5 m is the DTM's native resolution — nothing finer exists in the source data,
so that row is the practical ceiling regardless of fetch time.

Two grids are baked this way at different extents/densities:
- `assets/geodata-walferdange.js` — the main terrain, 240×132 over the full
  ~1724×1002 m corridor.
- `assets/geodata-inset-raschpetzer.js` — an optional denser patch over just
  the immediate qanat-shaft area (see the "Hi‑res LiDAR inset" toggle).

`bake-lidar.mjs` despikes the baked grid (clamps single-cell outliers >3 m
from their local 3×3-cell median to that median), denoising interpolation/
sensor noise without touching the raw sample cache — currently applied only
to the hi-res inset grid, not the main terrain grid; see
`docs/DATA_CREDIBILITY.md` for why. On the render side, the inset mesh's
tessellation is capped independently of the fetched grid's own density
(dev-only "Native inset render res" toggle lifts the cap) — matching render
resolution 1:1 to a much denser future fetch would slow down every UI
rebuild, since the whole scene rebuilds on most setting changes.

## Scripts

| Command | Does |
|---|---|
| `bun run dev` | Bake, then serve with Vite at :5173 |
| `bun run bake` | Validate → generate `assets/data.bundle.js` + `docs/RASCHPETZER_DATA.md` |
| `bun run validate` | Validate the SSOT (CI gate) |
| `node scripts/bake-buildings.mjs` | Re-fetch OSM building footprints for the 3D-buildings layer |
| `node scripts/bake-context.mjs [--hq]` | Re-fetch the town-context map/aerial drapes (`--hq`: the 8192 px aerial; terrain grid: see the script header) |
| `python3 scripts/bake-buildings3d.py <gml> <zip> --swap-xy` | Bake the ACT 2023 LOD2 textured buildings (geometry + std/HQ texture atlases) from the commune download |
| `bun run build` | Validate + bake (static site; deploy by serving the repo root) |

## Deploy (static / GitHub Pages)

`npm run build` validates the SSOT, bakes the data, and assembles a clean,
self-contained static site into `dist/` (index.html + `vendor/`, `assets/`,
`docs/`). Because every asset reference is relative, the output works from any
base path, so any static host will serve it — just point it at `dist/`.

A GitHub Actions workflow (`.github/workflows/deploy.yml`) auto-deploys to
**GitHub Pages** on every push to `main` (or via manual *Run workflow*). Enable
it once under **Settings → Pages → Source: GitHub Actions**; the site then lives
at `https://<user>.github.io/<repo>/`.

## Source & license

Facts are extracted from the **Brochure 2018** — Faber, S., Waringo, G. &
Werner, H. (2018), *The Raschpëtzer — A Roman Underground Water Supply System*
(SIT Walferdange, ISBN 978‑2‑9199454‑2‑9), referred to as **Brochure 2018**
throughout; terrain from **ACT LiDAR 2019 (0.5 m)** via the
Luxembourg geoportal (EU‑DEM 25 m via OpenTopoData retained only as coarse
context). Full
citations in `data/sources.json`. The dataset is offered under **CC‑BY‑4.0**;
third-party figures/imagery remain under their respective rights.
