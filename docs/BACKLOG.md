# Backlog — Raschpëtzer Qanat visualization

Planned / deferred ideas for `index.html`.

## Next — integrated map & data layers (geoportail.lu)

All layers below are Luxembourg open data (geoportail.lu WMTS / WMS / WFS), so each
plugs into the existing bake pipeline: raster drapes via `scripts/bake-ortho.mjs`,
vector features via `scripts/bake-vectors.mjs`.
**Done so far:** base layers — Contour lines · Topographic map (`topomap`) · Satellite
(ACT 2019) · Winter leaf-off (2019) · Historical (1967) · LiDAR relief (hillshaded DTM
2019). Overlays — Aquifer extent (`GE.Aquifer`) · Official contours (`EL.ContourLine`) ·
Spot elevations (`EL.SpotElevation`) · Break lines (`EL.BreakLine`). Vectors — surveyed
springs + boreholes (WFS) · surveyed P-4 overflow resurgence. UI — compass widget,
animated timeline, clickable spots + GPS.

### Tier 1 — highest value (serve the science / retire "illustrative" caveats)
- ~~**LiDAR hillshade / local-relief model**~~ — DONE ("LiDAR relief (2019)" base layer,
  `scripts/bake-hillshade.mjs`). Follow-up: a true LRM / slope render would sharpen the
  shaft-funnel depressions (P-2 / P-3 / P-6A) further than the default hillshade.
- **Surveyed geological faults** (`ge:GE.GeologicFault`) — would replace the ILLUSTRATIVE
  horst faults, BUT the WFS has zero faults within ~3 km of the qanat (nearest ~3.9 km,
  checked 2026-07-02): the Pëtschend horst faults are below the national map's scale, so
  the illustrative faults stay. A regional-geology **map** drape (WMS) is still possible.
- ~~**Aquifer extent**~~ — DONE (`GE.Aquifer` overlay, `scripts/bake-overlays.mjs`).
- **Watercourses + catchments** (`hy` WFS) — the Alzette + tributaries and the catchment
  polygons. NOTE: watercourses come as polygons (area), so drape as filled/outlined
  ribbons on the terrain, not polylines.
- ~~**Forest paths toggle**~~ — DONE via **OpenStreetMap** (`scripts/bake-paths.mjs`,
  highway=path/track/footway/bridleway) — geoportail has no clean path vector (only the
  `topo_tour_20k` tourist raster). Swap to `topo_tour_20k` if a geoportail-only source is
  preferred.

### Tier 2 — context & storytelling
- ~~**Historical ortho**~~ — DONE (1967 base layer). Follow-up: a multi-epoch ortho
  slider (1967 → 2025) tied to the timeline would show land-use change over the plateau.
- ~~**Topographic base map**~~ — DONE (`topomap` base layer).
- **Borehole logs** — upgrade the current surface markers to real cores if depth/log
  data becomes available (the WFS `GE.Borehole` carries no depth attribute today).

### Tier 3 — niche
- Infrared ortho (`ortho_irc`) for vegetation/moisture · land cover (forest vs open —
  explains where the LiDAR DTM sees ground) · flood hazard / Alzette floodplain (the
  valley / villa-recipient end) · geophysics grids
  (`ge:GE.RectifiedGridCoverage_GEOPHY…` — gravity / magnetics).

## Data-honesty decisions (removed from the visualization)

- **Surveyed springs (WFS) removed.** The geoportail.lu WFS spring points near the qanat
  could not be corroborated to survey accuracy against the primary source, so showing them
  as fact was misleading. The "Springs (surveyed)" toggle and the schematic "Haedchen
  source" marker were removed. If re-added, label the positions as *approximate* — the WFS
  spring coordinates may be inaccurate.
- **Boreholes (WFS) removed.** The `GE.Borehole` WFS features carry no depth / log data and
  rendered as bare surface markers that conveyed nothing; the "Boreholes (surveyed)" toggle
  was removed.
- **Shaft surface state (mesh vs. solid cap).** Researched the present-day shaft heads: the
  **10 excavated shafts carry a physical surface cover** — modern **metal lids** (P5 windowed,
  P-4 windowed), plus **P4**'s documented **concrete slab cap** (Brochure 2018 p.18). Any such
  cover renders as a **SOLID** surface cap: P1, P4, P5, P6, P7, P8, P9, P-1, P-4, P-5. The
  shafts with **no** present-day cover render as a **mesh**: the unexcavated / backfilled ones
  (P0 surface-panel only, P2 & P3 still backfilled, P-5A & P-7A restored/sand-filled) and the
  postulated ghosts (P-2 / P-3 / P-6A). Recorded per shaft as `surfaceState` +
  `surfaceCase` in `data/shafts.json` (source `site-surface-state`).

## Open — UI / interaction

- ~~**Timeline slider — hidden for now**~~ — DONE: re-exposed with animated playback
  (Play/Pause sweeps the era-weighted axis; rebuilds only on state change), clickable
  event bands (snap-to-event), axis tick labels (131 AD / 350 / 1913 / present), a
  playhead, and a "Present" jump. Follow-up: a small per-era legend/caption could make
  the six event kinds legible without hovering.

- ~~**Measure tool — hidden for now**~~ — DONE: re-exposed and verified (markers +
  two-point readout work).

- **Rework the guided tour.** Hidden in the UI for now (`#btn-tour` display:none). Its
  waypoints were keyed off the removed schematic `modelPos`; rebuild it against the
  georeferenced shafts (fly to each `geo`-placed shaft, narrate depth/role from the SSOT)
  with a proper stop/scrub/keyboard flow before re-exposing the button.

- **Detailed qanat / gallery modelling (recommended approach).** Currently the conduit is a
  single tube through the shaft bases. Add an *optional* higher-fidelity layer, LOD-gated
  and cited, built from the SSOT — not free-modelled from the photos:
  1. **Cross-section-driven gallery.** Sweep the documented profile per section
     (`gallery.sections`: rectangular → trapezoidal → wide → triangular → backfilled) along
     the georeferenced centreline, with the channel (`channelHeightCm`/`channelWidthRangeCm`),
     cover slabs and ballast as sub-parts. Drive dimensions from bare SSOT scalars so it stays
     validate-gated.
  2. **Shaft mouths + true depths** as real cylinders at surveyed diameters, funnelling into
     the gallery, with the two documented steps (P4 1.0 m, P6 1.2 m) as real geometry.
  3. **Overflow / lateral (deviation) channel** at P‑4 (`gallery.overflowChannel`) as a short
     branch off the weir — separate toggle.
  4. Keep it a **toggle / zoom-LOD** so the honest schematic stays the default; label the
     detailed view "reconstructed profile (Brochure 2018), not surveyed geometry" as paradata.
  Rationale: faithful to the primary source and inspectable, avoids inventing geometry the
  brochure doesn't document.

## Open — expert-review backlog (2026-07-02)

Deferred items from the four independent expert reviews (archaeology / hydrogeology
/ geodesy / geophysics). Items #1 (honesty note → modal), #5 (multi-anchor floor)
and #7 (CRS registry + spacing invariant) are being actioned separately.

### Hydrogeology / subsurface
- **Water table = perched pre-construction surface + drawdown.** The current single
  flat groundwater line is the *drained* state; add the perched pre-construction
  water table (arcs mounding into the sandstone between shafts, fig 4‑2 / 5‑3) and
  show the vertical gap the qanat lowered as *drawdown*. *(geophysicist + hydrogeologist — highest-value geology fix)*
- **Render the Pëtschend horst + bounding N/S faults** (fig 4‑3): the fault structure
  is in `geology.json.structure` but not drawn, so the Dauvebur / Op‑der‑Rëll springs
  have no visible cause. Even an annotation/inset would help. *(hydrogeologist + geophysicist)*
- **Fix the Keuper stacking / li1–ko labelling** in `addGeology()` so the fig‑4‑3
  order (li1 marl → thin ko mudstone → thick km3) is honest, not conflated. *(hydrogeologist)*
- **Show the ~2 % SE dip on the internal contacts** (or state on-screen that they are
  drawn parallel and the true dip is suppressed). *(hydrogeologist)*
- **Distinguish the perched saturated-zone lens** within the sandstone from bulk dry
  sandstone (fig 4‑3 cyan wedge). *(hydrogeologist)*
- **Thicken the weathered cover eastward** (cited 2→10 m into Haedchen) instead of a
  flat 2 m. *(geophysicist)*

### Archaeology
- **Render the auxiliary channel (P‑5A/P‑7A) as detached** — higher, dry, "no
  relationship discovered" (fig 5‑14) — not continuous with the main tube; surface the
  caveat on-model. *(archaeologist — highest-value archaeology fix)*
- **P1 stacked sounding gallery** (~20 m, channel-less) + the two construction theories. *(archaeologist)*
- **Construction-history caveat / alignment markers**: the drawn conduit is idealized;
  note the documented deviations (up to 3 m P4–P5) and the P7–P8 counter-excavation
  meeting point. *(archaeologist)*
- **Ghost-mark the postulated shafts P‑2/P‑3/P‑6A** as faint surface pins ("inferred
  from spacing") so the hypothesized downhill line is visible, not absent. *(archaeologist)*

### Geodesy / geophysics / data
- **Densify the corridor mesh** — *done for now*: the grid was doubled to 80×44
  (3520 nodes, `sample-2026-07-01` run, 4411 total points on file). Further densification
  toward native 0.5 m along the qanat axis + resolving the shaft-mouth funnels remains
  open. *(surveyor + geophysicist)*
- **LiDAR hillshade / local-relief layer** off the native 0.5 m DTM to hunt the funnel
  depressions of the unlocated shafts (cheapest non-invasive test of the spacing inference). *(geophysicist)*
- **Document geophysical-validation avenues** (microgravity for the void gallery; ERT for
  the sandstone/marl interface + backfilled shafts) as a "how to test this model" note. *(geophysicist)*
- **Note the flat-water-table simplification** in `pd-strata-render` until the perched
  table is modelled. *(geophysicist)*
- **Reconcile the LiDAR vertical datum** (NG95/EVRF) with the brochure's "m a.s.l." in one
  line of provenance. *(surveyor)*

## Kiosk — lenses & storytelling (2026-09-26)

For the physical display in front of Maison Dufaing (title-screen tour, `attract` in index.html).

- **Lens buttons A–E (physical + on-screen).** Coloured buttons on the outside of the
  showcase vitrine, mirrored as a matching row of coloured buttons along the bottom of the
  screen. Each one starts a *lens*: one Raschpëtzer, seen through a different expertise,
  e.g. A Geology & water · B Roman builders (how it was built and used) · C Rediscovery
  (1986 → today) · D Kids · E The site today (visit, opening hours, walk).
  - Hardware: arcade buttons on the vitrine wired to a USB keyboard encoder inside it (they
    arrive as keys A–E, no drivers). One colour and one letter per lens, identical on the
    vitrine and on screen.
  - **Kids lens** (its own button, placed low enough for children to reach): follow a water
    drop through the qanat — soaking through the sandstone, dripping into the gallery,
    flowing downhill to the spring — told by a friendly guide character in short sentences.
    Big, playful visuals (the x-ray cut, a "how deep is P5? — as tall as 12 houses" scale
    comparison), a couple of "press the button when you see the shaft!" moments, and a
    closing prompt to go and find the real P5 cover with its light button. Shorter (~60 s)
    than the adult lenses, with simple vocabulary checked in all four languages.
  - Audience level is a property of each lens (not a global switch), so a kid can press
    one button and get something made for them.
  - A lens = the tour-shot format (camera pose, reveal, POI, caption) plus a per-lens
    layer preset (geology, x-ray, timeline year, …) defined as data (`data/lenses.json`), so
    domain experts can write lenses without touching code. ~60–120 s each, then back to the
    title loop; ← / → step through its stations; the idle timeout returns to the loop.
  - Keep the on-screen row visible during the attract loop ("press a colour"), label it in
    FR/DE/LB/EN (multilingual captions per lens).
  - **Chapters inside a lens.** Each lens is split into named chapters (e.g. Rediscovery:
    1986 the first shaft · 1990s the gallery · 2000 the visitor's gallery · Today). Along the
    top of the screen, a segmented status bar: one segment per chapter, filling as it plays,
    with the current chapter's title — so viewers always know where they are and how
    long is left.
  - **Buttons are soft keys.** The same five physical buttons change meaning with context,
    and the on-screen row directly above them always shows what each does right now (like
    an ATM). On the menu: A–E = choose a lens. Inside a lens, a fixed mapping for every
    lens, e.g. **A ◀ previous chapter · B ⏸ pause / resume · C ▶ next chapter ·
    D ⌂ back to the menu · E language** (or E = "tell me more" on chapters that have a
    deeper layer). Keep "back to menu" on the same button in every lens, and hold any
    button for 2 s as a universal "back to the menu".
  - Lenses without content yet show a "coming soon" card, never a dead button.
  - Keep it to five buttons at most; consider folding "Visit today" into a closing panel
    shown at the end of every lens ("go and see it": the P5 cover and its light button,
    the car park, the opening hours) and freeing that button.
  - Decide early whether the kiosk has sound: a kids lens wants voice/sound effects, but a
    kiosk on a public square may need to work silently with captions only.
  - Have the kids' texts reviewed by a teacher (e.g. the Walferdange school) in all four
    languages; simple language is harder than it looks.
- **Title-screen wording: understandable, about water, a little mysterious.** The name
  RASCHPËTZER stays as the title (it's what the signs up the hill say); the line under it
  is the hook. Now (2026-09-28): subtitle *"Ancient Roman waterway"*, and under it a
  gold line of short facts taking turns every 9 s — "Still carrying water after nearly
  1,900 years" · "Shafts dug by hand up to 36 m into the hill" · "Rediscovered in 1986 —
  open to visitors" (each backed by the SSOT). Wanted but NOT yet used: *"best preserved
  (Roman qanat) north of the Alps"* — add it once a citable source is in
  `data/sources.json` (brochure page / publication); "almost 2,000 years" was softened to
  "nearly 1,900" (built c. AD 130–140). Earlier: *"The Romans' hidden water"*.
  Alternatives to try on passers-by:
  *"Where Roman water still flows"* (true: diverted qanat water still runs out at the
  spring) · *"A Roman secret under the forest"* · *"1,800 years of hidden water"* ·
  *"The Romans' hidden treasure: water"*. A rotating teaser question can replace the
  kicker line ("Who dug 36 m into the hill — and why?"), and each lens can have its own
  hook. Translate with the same tone, not literally: FR *« L'eau cachée des Romains »* ·
  DE *„Das verborgene Wasser der Römer“* · LB *„D'verstoppt Waasser vun de Réimer“*
  (LB to be checked by a native speaker).
- **Use the terrain's edge (the clip-off margin) instead of the trench, sometimes.** Today the
  context terrain just stops in a hard line against the dark background. Two cheap ways to
  make that edge mean something:
  - *Diorama block:* give the whole context block geological side walls (the same strata
    maths as `strataColumn` / the trench walls, sampled every ~20 m along the four edges:
    ~4 × 150 columns, one mesh, built once). The landscape then reads as a cut-out museum
    model, and the edge teaches the layer cake (sandstone over marl) everywhere.
  - *Slice reveal:* for some shots, move the block's front edge itself to the qanat line with
    ONE clipping plane across the whole landscape (the south half disappears) and show the
    strata wall along that line, with the gallery and shafts exposed in it. Cheaper than the
    4-plane trench and more dramatic in wide shots; the trench stays for close-ups, where
    removing half the world would feel like too much. Could alternate per loop with the
    trench / split reveal (`attractReveal: 'slice'`).
  - Alternative for the far edges: fade the terrain into the background (edge vignette or
    distance fog tinted to the background colour) so the border never shows as a line.
- **Title tour — done 2026-09-26 (for reference) and open follow-ups.**
  - Done: slice reveal (Settings → "Reveal the qanat by": *Slice (wide) + trench
    (close-ups)* is the default; *Trench*, *Slice*, *Split screen* selectable) · soft fade of
    the town context into the background at its border (Settings, on) · blur behind the
    title & captions (plain backdrop blur, Settings, **off** by default) · far view: small
    model labels hide and the gallery shows as a bold glowing x-ray line · see-through
    buildings with ONE rule, per building: a building turns into a white OUTLINE of its roof
    and wall edges (over a faint fill) when, on screen, it covers a visible marker's orb or
    the foot of its stalk and stands in front of it, or when it is within ~25 m of the
    camera; hysteresis + a ~0.35 s crossfade per building stop the popping (the earlier
    circular fade looked wrong) · ghost town (2026-09-29, Settings, on): every town
    building is a faint outline except the landmarks — buildings within `buildingRadius` of
    the town hall, sports complex, castle and station (data/poi.json) stay solid and
    textured; the church and other significant buildings can be added the same way (a
    landmark entry with its position and radius) · 2026-09-29: church added (OSM 'Trinité'),
    the castle landmark now covers the whole IFEN campus (buildings B01–B12, `buildingBox`),
    ghosts are GREY (white outlines stay for buildings in front of a marker) · the town-flight keys moved ~120 m
    further back from the site and 20 m higher; path timing "same time per stretch" so the
    long climb doesn't rush the town part · marker orbs never float lower than 24 m above their ground,
    so they stay above the roofs up close · the tour opens with ONE continuous flight that
    always looks at the Raschpëtzer up the hill: from "You are here" it drifts back over the
    town hall and sideways over the sports complex Prince Henri — low enough that each one's
    orb and roof pass through the lower part of the frame, no stops and no extra captions —
    and takes off toward the plateau · the overview moved to the end of the loop · the POI
    fly-bys run P5 → visitor's gallery → spring → P-4 → Dauvebur → car park (the car park
    last, as "how to get there", 2026-09-28) · a station photo
    card (lower right) per tour stop.
  - **Photos wanted** (stand-ins marked `tourPhotoPlaceholder: true` in data/poi.json):
    the kiosk square / Maison Dufaing, town hall, sports hall, Dauvebur spring; optionally
    castle and station if they become tour stops, and a better view of the visitor's
    gallery entrance. Landscape 16:10, ≥ 1600 px wide, with author + licence.
  - Check the kiosk marker's exact spot on site: it stands in the open ~4 m from the
    nearest building (ACT 2023), but from the tour's camera a house in front hides its
    foot — the see-through handles that, a site check would confirm the position.
  - Town flight: check on the real screen that the pace (~33 s) feels right and that the
    kiosk marker reads in the first seconds; the path heights/distances are in
    `buildAttractShots` (`behind(point, metres back, metres up)`).
  - Placeholder photo cards are large; hide them instead (show no photo) if they look
    unfinished on the kiosk before the real photos arrive.
  - Tour length is ~2 min; consider trimming the POI fly-bys to the four with photos, or a
    shorter loop for the attract mode and the full version as a lens.
  - Station photos could get a slow Ken Burns zoom, and a second photo per stop could
    alternate on long stops.
  - Diorama side walls for the whole context block (see the terrain-edge entry) remain an
    option on top of the soft edge.
- **Stepping through the POIs while exploring — DONE 2026-09-28.** Select any point of
  interest (tap its orb): the inspector now has "◀ Previous · n / N · Next ▶" buttons;
  ← / → do the same on a keyboard. Order = "You are here", then the tour order (P5 →
  visitor's gallery → spring → P-4 → Dauvebur → car park), then the town landmarks and
  the rest. Idea: a "Stations" entry in Views that starts at the first one.
- **"You are here" moved (2026-09-28)** ~18 m north-west to the old BIL bank
  (22 Route de Diekirch, OSM node) at the project's request; set the exact spot once the
  display is installed.
- **Everything local? (assessed 2026-09-28)**
  - *Runtime — yes, already.* three.js is vendored (`vendor/`); terrain grids, aerials,
    maps, overlays, 3D buildings + texture atlases, POI photos and the SSOT are all baked
    into `assets/` (~48 MB) and `data/`. Nothing is fetched from the internet while it
    runs; the only outside links are the OpenStreetMap / Wikimedia links in the inspector
    text, and an OpenTopoData elevation fallback that only runs if the baked terrain file
    were missing. So the kiosk works offline.
  - Gaps to close: (1) the title font is a font *name* (Trajan / Cinzel / Optima) that
    falls back to the system serif — bundle a font file (e.g. Cinzel, OFL) in `assets/`
    so the kiosk looks the same everywhere; (2) add a service worker (the PWA
    `manifest.json` is already there) that pre-caches all assets, so a kiosk that reboots
    during a network outage still starts; (3) an automated "offline" test (headless
    browser with the network blocked) to keep it that way.
  - *Raw source data — no, and it shouldn't go into git as is.* The ACT 3D-building
    download is ~440 MB (2023 CityGML + textures; the 2020 one ~300 MB) — above GitHub's
    100 MB per-file limit and far above a healthy repo size. LiDAR samples
    (`data/lidar/samples.ndjson`, 3.6 MB) are already in the repo; the WMS rasters are
    baked outputs. Options, best first: (a) `sources/manifest.json` with each raw file's
    official URL (data.public.lu, CC0), size and SHA-256 plus `scripts/fetch-sources.mjs`
    to download and verify — reproducible without storing it; (b) attach the raw zips to a
    GitHub Release (2 GB per file) as a frozen copy in case the portal changes; (c) Git LFS
    (free quota ~1 GB storage / 1 GB bandwidth per month — tight for 440 MB).
  - *Repo growth:* `.git` is ~74 MB; each re-bake of the building atlases / HQ aerial adds
    ~20–35 MB of history. If re-bakes become frequent, move `assets/buildings3d/*.webp`
    and `assets/ortho-context-hq.jpg` to Git LFS or to release assets.
- **Camera path editor — first version DONE 2026-09-28** (Tools → 🎥 Camera path): opens
  the title screen paused with the visitor controls; "+ Keyframe" / "+ Via point" capture
  the current camera; keys can be reordered, re-set, toggled key↔via, deleted and flown to;
  "Always look at the Raschpëtzer" or per-key look targets; smooth / straight route;
  duration; a scrubber and "Play tour"; route preview in the scene; safe-area overlay; draft
  saved in the browser, JSON export/import for `data/tour.json` (the kiosk reads
  `paths.town` from there; the built-in flight is the fallback). Playback runs at constant
  speed along the path, eased, never below 20 m above the ground.
  Still open from the plan below: per-segment tension, captions per keyframe, holds
  (pauses) at keyframes, more paths than the town flight (all tour shots, lens chapters),
  draggable handles.
  - Title screen, also 2026-09-28: touching / dragging no longer exits — the visitor takes
    the camera, the tour pauses and "▶ Resume tour" / "✕ Explore the model" appear (it
    resumes by itself after 45 s without input; Esc exits). A "▶ Title screen" button now
    sits on the 3D view (bottom left) as well as in Tools.
- **Camera path editor (suggested 2026-09-27).** Tuning tour shots in code is slow; the
  people who know the town should place them. In steps:
  1. *Capture keyframes:* in developer mode, fly the camera by hand and press "Add
     keyframe" — it stores camera position + look-at (or "look at the site", locked).
     Playback reuses the tour's spline code.
  2. *Keyframe list + timeline:* reorder / delete / retime keys, a caption per key, a
     scrubber with "play from here", and a **safe-area overlay** (title corner, caption and
     photo boxes, button row) so shots are composed around the text.
  3. *The path in between, also by hand:* insert "via" keys to bend the route (fly there,
     press "Add via point"), a per-segment curve tension / straight-line toggle, and a
     live preview of the route as a line in the scene; draggable handles in the 3D view
     (three.js TransformControls) only if that isn't enough.
  - Principle (agreed 2026-09-27): camera positions AND the moves between them are set by
    the user with the normal camera controls, not hard-coded in `buildAttractShots`; the
    code keeps only the guards below and sensible defaults for new paths.
  - Store paths as data (`data/tour.json`, validated like the rest of the SSOT) in
    lat / lon / metres-above-ground, not scene units, so they survive changes of the
    window, vertical exaggeration or flip. Export/import JSON; the kiosk just loads it.
  - Built-in guards: constant speed along the path (arc length, not per segment), eased
    starts/stops, minimum height above terrain and roofs, no roll.
  - The same editor would author the lens chapters (each chapter = a camera path + caption
    + layer preset), so it doubles as the content tool for the A–E lenses.
  - Off-the-shelf alternative: Theatre.js (timeline/keyframe studio for three.js) in
    developer mode only — faster to get a polished timeline, but a sizeable dependency.
- **Burn-in safeguard for an always-on screen.** The title card, the button row and the
  chapter bar are static and would stay on screen all day.
  - Alternate the title's corner (upper right ↔ upper left) per loop or per shot. The shot
    framing already keeps the POI clear of the title (target shifted to the camera's right in
    `buildAttractShots`), so that offset has to mirror with the corner.
  - A slow pixel drift (a few px over minutes) for the button row and the chapter bar; fade
    static UI out after a few seconds without input and back in on a press.
  - A nightly schedule (screen off or a dim black mode outside opening hours) — also saves
    power. LCD panels suffer image retention rather than true burn-in, but the same
    measures apply; OLED needs them more.
- **Kiosk polish (from the 2026-09-26 review).**
  - Try the "High-quality textures (big screen)" mode on the real kiosk PC and screen
    early; if it stutters, the standard textures already look good at 1080p.
  - Opening-hours badge on the visitor's gallery marker: "Today: open 14:30–17:30" /
    "closed today" (Sundays April–October, per Leaflet 2017).
  - The far-view site marker's caption could give distance and walk time ("1.4 km · ~15 min
    from the car park"), and the overview could briefly draw the line from "You are here"
    to the site.
- **"Back in time": the qanat under construction.** A lens (or a special shot in
  lens B) that switches to the construction period (c. AD 140): open shafts with
  windlasses and spoil heaps, a partly driven gallery, workers' paths, no modern buildings
  or roads, period vegetation. The **split view** is the transition: a vertical wipe with
  "today" on the left and "c. AD 140" on the right, then the wipe slides across until the
  past fills the screen. It reuses the existing `attractReveal: 'split'` scissor renderer
  with a "past" pass instead of the blueprint pass.
  - Needs: low-poly construction props (windlass, bucket, spoil cones, timber frames),
    reconstruction sources (Brochure 2018; qanat construction literature) and an
    "illustrative reconstruction" label in the same spirit as the data-honesty rules above.
    The 3D-buildings and aerial layers simply switch off in the past pass.
- **Splat → look through the shaft-cover window.** A Gaussian-splat capture of one of the
  steel shaft covers with a glass window (P5 or P-4). The camera orbits the splat, then
  pushes into the window. **Transition at the glass:** as the camera nears the window, fade
  the splat out and fade in a real photo taken looking down through that window (the lit
  shaft, as a visitor sees it). Optionally continue into the 3D shaft + gallery in x-ray.
  - Keep the motion going through the fade: the camera's push-in continues as a slow zoom
    into the photo (Ken Burns), so the move never stops dead at the cut.
  - Frame the photo to match: shoot it from the same spot the camera ends at, with the
    window frame as a mask/vignette on the photo, so the edge lines up across the fade.
  - Photo capture: shaft light on, phone lens pressed against the glass (kills reflections),
    ideally in shade or at dusk; a short video clip down the shaft works the same way.
  - P-4 already has a real interior photo (`assets/poi/p-4-interior.webp`, GilPe, CC BY-SA
    4.0) that can prototype the transition before the P5 photo exists.
  - Capture: ~150–300 photos or a slow 4K video circling the cover, in overcast light (reflections
    on the glass are the risk: capture with the shaft light on; mask or retouch the glass).
    Train with Polycam / Luma / nerfstudio → `.splat` / `.ksplat`, trimmed to ~3–10 MB.
  - Render with a three.js splat viewer (e.g. GaussianSplats3D) in its own scene/pass,
    shown full-screen for this sequence only (not inside the small POI circle), and
    lazy-loaded so it doesn't cost anything outside that sequence.
  - Fallback / first step: a still of the cover and a still down the shaft with a
    zoom-and-crossfade gives ~80 % of the effect without a capture session.
- **Stylised landmark buildings (idea, 2026-09-29).** Replace the photo-textured ACT
  meshes of the landmarks (town hall, sports complex, IFEN / castle, station, church) with
  hand-made stylised models — clean shapes, a shared palette, recognisable signature
  details (the church tower, the castle front, the sports hall roof) — so they read as
  icons against the grey ghost town, like a museum model.
  - How: model in Blender from the ACT LOD2 geometry (already correct in size and
    position) + photos; export glTF (`.glb`, Draco-compressed, ~100–500 KB each) into
    `assets/landmarks/`; the app swaps the ACT mesh of a building for the model when a
    landmark entry names one (`model: "assets/landmarks/church.glb"`), positioned by its
    lat / lon / heading. Needs three.js GLTFLoader (+ DRACOLoader) vendored.
  - Cheaper intermediate: the ACT geometry with flat colours per surface (walls / roofs)
    and soft ambient occlusion instead of the photo textures — "stylised" without new
    modelling.

## Done
- **Georeferenced LiDAR model**: ACT LiDAR 2019 (0.5 m) terrain; shafts placed by OSM
  coords (elevation-validated); near-level gallery reconstructed from the brochure
- **Credibility gate**: `DATA_CREDIBILITY.md` + machine-checked invariants in `validate.mjs`
  (near-level gallery, floor band, LiDAR≈floor+depth, positive depth, extent, grade/steps)
- **OSM→P-label reconciliation**: fig 3‑1 digitisation + similarity fit; per-shaft confidence
- **Geology digitised** from fig 4‑3 (ko ≈ 5 m, Liassic ≈ 50 m, km3 ≥ 44 m)
- **Append-only LiDAR sampling workflow** (`data/lidar/`, `sample-lidar.mjs`, `bake-lidar.mjs`)
- **Static build + GitHub Pages** (`scripts/build.mjs`, `.github/workflows/deploy.yml`)
- **Gallery longitudinal-profile** toggle (true-elevation chart)
- **Guided tour**, SSOT + build/validate pipeline, contour geometry, geology cross-section,
  annotations, animated flow, measurement tool, 3D scale bar / compass / exaggeration readout
- Single true-scale vertical-exaggeration control; procedural + heightmap terrain removed
