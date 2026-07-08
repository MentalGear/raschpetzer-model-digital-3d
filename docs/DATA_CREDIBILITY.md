# Data credibility & the georeferenced-reconstruction decision

*Decision record — 2026-07-02. Companion to `data/paradata.json` (`pd-source-precedence`,
`pd-osm-georef`) and the validation gate in `scripts/validate.mjs`.*

## The question

The rendered qanat gallery came out as an implausible S-curve. The gallery is documented
as **near-level** (constant **0.1 % fall**, ≈ 0.057°, from P9 to P‑5, plus two ~1 m steps),
so the shape had to be wrong. Diagnosis showed the tunnel was drawn as
`floor = DEM_surface − documented_depth`, and the DEM surface — sampled at *schematic* shaft
positions — put the west shafts in the Alzette valley (~234 m) while their documented floors
sit at ~354 m. That made a near-level gallery physically impossible and produced the wave.

This raised two questions we had to settle empirically before rebuilding:
1. Are the OpenStreetMap shaft geolocations correct?
2. Is there a higher-credibility elevation source than EU‑DEM 25 m — and is the *brochure* itself wrong?

## The LiDAR experiment

We sampled four elevation models at the **true OSM coordinates** and compared each shaft's
surface to the brochure-implied surface (`surveyed/near-level floor + documented depth`).

| shaft | ACT LiDAR 0.5 m | EU‑DEM 25 m | SRTM/ASTER/Mapzen | brochure (floor+depth) | LiDAR − brochure |
|---|---|---|---|---|---|
| P‑4 | 366.9 | 388.1 | — | 367.4 | **−0.5 m** |
| P1 | 386.1 | 394.9 | — | 385.0 | **+1.1 m** |
| P3 | 392.5 | 400.5 | — | 390.0 | **+2.5 m** |
| P5 | 392.1 | 403.6 | 398–400 | 391.0 | **+1.1 m** |

## Findings

1. **The brochure is correct — no error.** LiDAR matches the brochure-implied surface to
   **0.5–2.5 m** everywhere; back-computing `LiDAR − depth` gives ~355–357 m at every shaft,
   independently confirming the near-level gallery. P5's real surface is ~392 m, so
   `floor 356 + depth 36 = 392` holds. The ~400 m seen in coarse DEMs is plateau-edge averaging.
2. **EU‑DEM 25 m is the outlier**: systematically **+10 to +21 m** too high over the corridor,
   and it flattens the Haedchen depression. All global 25–30 m DEMs agree with each other and
   are equally unusable here (it's a resolution limit, not a bug).
3. **OSM coordinates are trustworthy enough to georeference.** If they were wrong, LiDAR at
   them would not reproduce the brochure. The `−6…9` → `P‑label` mapping is still inferred
   (per-node confidence medium/low), and the P2–P3 spacing reads ~20 m vs a documented 28 m,
   so labels — not positions — carry the residual uncertainty.
4. **LiDAR resolves the Haedchen drop** the brochure describes (east shafts P6→P9 fall
   382→377 m), which every coarse DEM missed.

## Credibility ranking (used to gate the model)

| rank | source | authoritative for | role in the model |
|---|---|---|---|
| 1 | **Brochure 2018 (SIT brochure)** | depths, surveyed floors, 0.1 % grade + steps, geology, hydrology | drives the qanat geometry |
| 1 | **ACT LiDAR 2019 (0.5 m)** | true ground surface (a.s.l.) | drives the terrain surface & shaft tops |
| 2 | **OpenStreetMap nodes** | horizontal shaft position (lat/lon) | drives georeferenced placement |
| 3 | EU‑DEM 25 m | broad regional context only | (demoted; not used for the corridor) |
| — | schematic `modelPos` | nothing physical | fallback layout only (procedural mode) |

## Decision

Rebuild the GeoData model **georeferenced**:
- Place shafts by their **OSM lat/lon** (validated), not schematic `modelPos`.
- Take the **terrain surface from LiDAR** (re-baked grid), not EU‑DEM.
- Set the **gallery floor = surface − documented depth**, which is now near-level by
  construction (because LiDAR surface ≈ floor + depth). This resolves the S-curve at the root.
- Keep everything **honestly tagged**: positions are `reconstructed` (CRS EPSG:4326), the
  `−6…9`→`P` mapping stays medium/low confidence, `geo` stays null where the mapping is unknown
  (P‑7A, and the aux P‑5A), and those are placed by documented offset instead.

## Derived invariants (the gate) — and why this is the right approach

We turn the trusted facts into **machine-checked invariants** in `scripts/validate.mjs`, run in
CI/`bake`. This is the right approach because it (a) encodes *why* we trust each number next to
the number, (b) prevents regressions of the exact bugs we hit (valley-floating gallery, wavy
tunnel), and (c) fails loudly if a re-sample or edit drifts from the corroborated facts. Each
invariant is tagged with the credibility source; tolerances reflect data uncertainty; we split
**hard errors** (physical/documentary impossibilities) from **soft warnings** (cross-source
agreement).

| id | invariant | source | severity | tolerance |
|---|---|---|---|---|
| near-level-gallery | gallery grade ≤ 0.5 % (qanat angle) | brochure p.26 | error | 0.5 % |
| floor-band | every surveyed floor ∈ [350, 362] m | surveyed floors | error | band |
| implied-floor | `surface − depth` ∈ [350, 362] m (no surveyed floor) | LiDAR + depths | error | band |
| lidar≈floor+depth | `|LiDAR − (floor+depth)|` small | LiDAR vs brochure | warn > 2.5 m, error > 5 m | 2.5 / 5 m |
| positive-depth | every documented depth > 0 | physical | error | — |
| aux-higher | dry-aux floor not far below main channel | brochure (aux system) | warn | 2 m |
| extent | georeferenced W–E extent ∈ [200, 600] m | OSM (~306 m) | warn | band |

**Caveats.** An invariant is only as strong as the fact behind it; each is tagged accordingly.
Tolerances are deliberately loose (LiDAR/OSM are ~metre-scale, not survey-grade). Drop-shaft
P‑7A is a documented exception to *aux-higher* (it drains downward), which is why that check is
a warning with a 2 m tolerance rather than a hard error.
