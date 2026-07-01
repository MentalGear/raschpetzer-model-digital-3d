# LiDAR sampling cache (`data/lidar/`)

An **append-only** cache of surface-elevation samples for the Raschpëtzer qanat
corridor (Walferdange/Helmsange, LU), used to bake the terrain mesh in
`assets/geodata-walferdange.js`.

## Files

- **`samples.ndjson`** — the cache itself. One compact JSON object per line:
  ```json
  {"lon":6.148145,"lat":49.666523,"masl":365.2,"run":"seed-shafts"}
  ```
  `lon`/`lat` are WGS84 degrees; `masl` is metres above sea level (or `null` when
  the DTM has no value there); `run` records which sampling run first wrote the point.
- **`manifest.json`** — provenance + a log of every run:
  ```json
  {
    "source": "act-lidar-2019",
    "endpoint": "https://map.geoportail.lu/raster",
    "crs": "EPSG:2169",
    "sourceVersion": "20200121-082330",
    "totalPoints": 895,
    "runs": [ { "run": "...", "date": "...", "bbox": [w,s,e,n]|null,
               "cols": N, "rows": M, "nRequested": N, "nNew": N, "nSkipped": N } ]
  }
  ```

## The append/dedup cache

The cache key is `` `${lon.toFixed(6)},${lat.toFixed(6)}` `` (~0.5 m resolution — the
native DTM cell size). On each run the sampler:

1. loads every existing key from `samples.ndjson` into a `Set`,
2. computes the requested points (from a `--bbox` grid or an explicit `--points` list),
3. fetches **only** the keys not already present, and
4. **appends** the new points (never rewrites or re-fetches existing ones).

Because points are only appended, the file is an immutable audit trail: re-running an
overlapping grid is cheap and safe — already-sampled points are skipped, and the run's
`nSkipped` reflects that.

## `sourceVersion` guard

Every point in the cache comes from the same DTM release
(`sourceVersion = "20200121-082330"`, the ACT LiDAR 2019 0.5 m DTM). The sampler
accepts `--source-version <tag>`; if it differs from `manifest.sourceVersion` the run
**refuses** (exits non-zero) so samples from a different DTM release are never mixed
into the same cache. Start a fresh cache directory if you need a different release.

## Python 3 + pyproj requirement

The **sampler** (`scripts/sample-lidar.mjs`) needs `python3` with `pyproj` installed,
because the geoportail raster endpoint expects EPSG:2169 (LUREF) metre coordinates and
we transform WGS84→EPSG:2169 with pyproj
(`Transformer.from_crs("EPSG:4326","EPSG:2169",always_xy=True)`). All requested points
are transformed in a **single** batched `python3` invocation.

This dependency is only needed to **run the sampler**. Neither the app nor
`scripts/bake-lidar.mjs` (which reads the already-cached WGS84 samples) needs Python.

## Source

- ACT LiDAR 2019 0.5 m DTM, data.public.lu.
- Sampled pointwise via `GET https://map.geoportail.lu/raster?lon=<E>&lat=<N>`
  returning JSON `{"dhm": <masl|null>}`, where `lon`/`lat` are EPSG:2169 metres.

## Example commands

```bash
# One-off: seed the cache from the current baked grid + the georeferenced shafts
# (no network; reconstructs "the last data" we already had).
node scripts/sample-lidar.mjs --seed

# Sample a regular grid over a bbox (W,S,E,N) at cols×rows resolution.
# Only genuinely-new points are fetched; overlapping points are skipped.
node scripts/sample-lidar.mjs --bbox 6.147,49.6655,6.153,49.6672 --cols 3 --rows 2

# Sample an explicit list of "lat,lon" points.
node scripts/sample-lidar.mjs --points "49.6665,6.1481;49.6660,6.1493"

# Enforce the release guard explicitly (refuses on mismatch).
node scripts/sample-lidar.mjs --bbox 6.147,49.6655,6.153,49.6672 --cols 3 --rows 2 \
  --source-version 20200121-082330

# Bake the mesh from the cache (uses the manifest's last grid run, or pass --bbox).
node scripts/bake-lidar.mjs
node scripts/bake-lidar.mjs --bbox 6.138,49.6618,6.162,49.6708 --cols 60 --rows 33
```
