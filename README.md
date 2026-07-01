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

## Scripts

| Command | Does |
|---|---|
| `bun run dev` | Bake, then serve with Vite at :5173 |
| `bun run bake` | Validate → generate `assets/data.bundle.js` + `docs/RASCHPETZER_DATA.md` |
| `bun run validate` | Validate the SSOT (CI gate) |
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

Facts are extracted from **Faber, S., Waringo, G. & Werner, H. (2018),
*The Raschpëtzer — A Roman Underground Water Supply System*** (SIT Walferdange,
ISBN 978‑2‑9199454‑2‑9); terrain from **ACT LiDAR 2019 (0.5 m)** via the
Luxembourg geoportal (EU‑DEM 25 m via OpenTopoData retained only as coarse
context). Full
citations in `data/sources.json`. The dataset is offered under **CC‑BY‑4.0**;
third-party figures/imagery remain under their respective rights.
