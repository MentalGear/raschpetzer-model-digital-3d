# Henri Werner SIT shaft-coordinate survey (Git LFS)

Original survey files for the Raschpëtzer qanat's main-line shafts (P-1
through P9), provided directly to this project by **Henri Werner** — a
co-author of `brochure2018` and one of the site's excavators — who sent the
files but is not necessarily the original surveying party. Coordinates are
in Luxembourg's national **LUREF/LTM (EPSG:2169)** reference system,
maintained by the **Administration du Cadastre et de la Topographie (ACT)**
— see https://act.public.lu/fr/gps-reseaux/reseaux-geodesiques.html.
Stored via **Git LFS** (see `/.gitattributes`). Backs the `werner-sit-survey`
citation in `data/sources.json` and the surveyed coordinates in
`data/shafts.json` (`geo.lat`/`geo.lon`/`geo.luref`/`geo.measuredAt`).

| File | Description |
|------|--------------|
| `coordonnées Raschpetzer.pdf` | Scanned survey table: shaft id, survey-point type ("Petz Mittelpunkt" / "Mittelpunkt Mulde" / "Markierung"), LUREF (EPSG:2169) X/Y, and ground-surface Z (m a.s.l.) for the shaft centrepoint. |
| `Situationsplan-RP-ACAD.dxf` | Site plan (AutoCAD DXF) — shaft positions and route layout in LUREF. |
| `raschpëtzer_complete.dwg` | Full CAD site plan (AutoCAD DWG). |
| `raschpëtzer_imprimerie.dwg` | Print-layout variant of the CAD site plan (AutoCAD DWG). |

## Rights

Unpublished working documents, sent directly to this project by Henri Werner
for research/education and to back the model's cited survey data.
**Not** open-licensed and **not** published with the site — the build
(`scripts/build.mjs`) copies only `index.html`, `vendor/`, `assets/` and
`docs/` into `dist/`, so this folder is excluded from the deployed page. Do
not redistribute beyond that scope without Henri Werner's permission.
