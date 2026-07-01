# Backlog — Raschpëtzer Qanat visualization

Planned / deferred ideas for `geological-block.html`.

- (nothing open)

## Done
- **Guided tour** — camera flies P-7A → P9, opening each shaft's SSOT info panel;
  bottom bar with prev / play-pause / next / stop, auto-advance
- **SSOT** — cited `data/*.json` drives the model; build/validate pipeline;
  generated `RASCHPETZER_DATA.md`; click-to-info panel with citations
- All render colours + scene-scale defaults sourced from `model-config.json`
- Terrain modes: procedural / heightmap / GeoData (real EU-DEM, default)
- Contour-line geometry with bold index contours + elevation labels
- Faithful vs schematic qanat layout; documented shaft depths (P5 ≈ 36 m)
- Geology cross-section (strata) + groundwater (E) / qanat (W) flows
- Real ~0.1 % stepped gallery gradient (steps at P6, P4); auxiliary dry channel
- Interactivity: shaft hover tooltips, click-to-focus, reset view, overlay toggle
- GeoData: W↔E flip, per-mode labels, 3D scale bar, north arrow, exaggeration readout
- Annotations: click-to-drop notes, feature anchoring, localStorage, export/import
- Animated water-flow toggle; measurement tool (distance + elevation)
