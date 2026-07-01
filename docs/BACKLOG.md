# Backlog — Raschpëtzer Qanat visualization

Planned / deferred ideas for `index.html`.

## Open — UI / interaction

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
     detailed view "reconstructed profile (Waringo 2018), not surveyed geometry" as paradata.
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
- **Densify the corridor mesh** toward native 0.5 m along the qanat axis (sampler ready;
  a run is in progress) and resolve the shaft-mouth funnels; match the on-screen "0.5 m"
  claim to the actual mesh. *(surveyor + geophysicist)*
- **LiDAR hillshade / local-relief layer** off the native 0.5 m DTM to hunt the funnel
  depressions of the unlocated shafts (cheapest non-invasive test of the spacing inference). *(geophysicist)*
- **Document geophysical-validation avenues** (microgravity for the void gallery; ERT for
  the sandstone/marl interface + backfilled shafts) as a "how to test this model" note. *(geophysicist)*
- **Note the flat-water-table simplification** in `pd-strata-render` until the perched
  table is modelled. *(geophysicist)*
- **Reconcile the LiDAR vertical datum** (NG95/EVRF) with the brochure's "m a.s.l." in one
  line of provenance. *(surveyor)*

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
