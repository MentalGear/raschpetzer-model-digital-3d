// Bake a regular WGS84 terrain grid from data/lidar/samples.ndjson into
// assets/geodata-walferdange.js (EXACT existing format + header).
// Denser sampling → sharper mesh. Grid comes from --bbox/--cols/--rows, else the
// manifest's last grid run.
//
// Interpolation: bilinear from the 4 surrounding samples when the samples form a
// (near-)regular lattice around the target; otherwise nearest-neighbour fallback.
// We build a fast lookup by exact key first (seeded grid nodes hit exactly), then
// fall back to distance-weighted / nearest over all samples.
//
// SAFETY: read the current geodata file first; only overwrite if the new grid's
// min/max fall within 200–410 m, else abort. Keeps a .bak backup.
//
// Usage:
//   node scripts/bake-lidar.mjs
//   node scripts/bake-lidar.mjs --bbox W,S,E,N --cols N --rows M
import { readFileSync, writeFileSync, existsSync, copyFileSync } from 'node:fs';

const ROOT = new URL('../', import.meta.url);
const SAMPLES = new URL('data/lidar/samples.ndjson', ROOT);
const MANIFEST = new URL('data/lidar/manifest.json', ROOT);
const GEODATA = new URL('assets/geodata-walferdange.js', ROOT);

const SANE_MIN = 200, SANE_MAX = 410;

function parseArgs(argv) {
  const a = {};
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t === '--bbox') a.bbox = argv[++i];
    else if (t === '--cols') a.cols = Number(argv[++i]);
    else if (t === '--rows') a.rows = Number(argv[++i]);
  }
  return a;
}

function loadSamples() {
  if (!existsSync(SAMPLES)) throw new Error('no samples.ndjson — run the sampler/seed first');
  const txt = readFileSync(SAMPLES, 'utf8');
  const pts = [];
  const byKey = new Map();
  for (const line of txt.split('\n')) {
    const s = line.trim();
    if (!s) continue;
    let o; try { o = JSON.parse(s); } catch { continue; }
    if (typeof o.masl !== 'number') continue; // skip null DTM
    const rec = { lon: o.lon, lat: o.lat, masl: o.masl };
    pts.push(rec);
    byKey.set(`${o.lon.toFixed(6)},${o.lat.toFixed(6)}`, rec); // last write wins
  }
  return { pts, byKey };
}

function resolveGrid(args) {
  if (args.bbox) {
    const [w, s, e, n] = args.bbox.split(',').map(Number);
    if ([w, s, e, n].some(Number.isNaN)) throw new Error('--bbox needs W,S,E,N');
    if (!(args.cols >= 2 && args.rows >= 2)) throw new Error('--cols/--rows must be >= 2');
    return { west: w, south: s, east: e, north: n, cols: args.cols, rows: args.rows };
  }
  // From the manifest: pick the densest full-extent grid run (most nodes). Small
  // overlapping sample runs must not shrink the baked mesh — denser sampling of the
  // full corridor produces a sharper mesh, so we bake the largest grid we have.
  if (!existsSync(MANIFEST)) throw new Error('no --bbox and no manifest.json');
  const m = JSON.parse(readFileSync(MANIFEST, 'utf8'));
  const gridRuns = (m.runs || []).filter(r => r.bbox && r.cols >= 2 && r.rows >= 2);
  if (!gridRuns.length) throw new Error('manifest has no grid run; pass --bbox --cols --rows');
  const r = gridRuns.reduce((best, cur) =>
    (cur.cols * cur.rows) > (best.cols * best.rows) ? cur : best);
  const [w, s, e, n] = r.bbox;
  console.log(`grid from manifest run "${r.run}": ${r.cols}×${r.rows}`);
  return { west: w, south: s, east: e, north: n, cols: r.cols, rows: r.rows };
}

// Interpolate the surface at (lon,lat) from samples.
// 1) exact key hit; 2) bilinear if we can find 4 bracketing samples on a lattice;
// 3) inverse-distance / nearest fallback.
function makeInterpolator(pts, byKey) {
  // sorted unique lons / lats to detect a lattice
  const lons = [...new Set(pts.map(p => +p.lon.toFixed(6)))].sort((a, b) => a - b);
  const lats = [...new Set(pts.map(p => +p.lat.toFixed(6)))].sort((a, b) => a - b);

  function bracket(sorted, v) {
    // return [lo, hi] neighbours in sorted (may be equal at edges)
    let lo = sorted[0], hi = sorted[sorted.length - 1];
    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i] <= v) lo = sorted[i];
      if (sorted[i] >= v) { hi = sorted[i]; break; }
    }
    return [lo, hi];
  }

  return function at(lon, lat) {
    const k = `${lon.toFixed(6)},${lat.toFixed(6)}`;
    const exact = byKey.get(k);
    if (exact) return exact.masl;

    // bilinear on a lattice of exact samples
    const [x0, x1] = bracket(lons, lon);
    const [y0, y1] = bracket(lats, lat);
    const g = (lx, ly) => {
      const rec = byKey.get(`${lx.toFixed(6)},${ly.toFixed(6)}`);
      return rec ? rec.masl : null;
    };
    const q11 = g(x0, y0), q21 = g(x1, y0), q12 = g(x0, y1), q22 = g(x1, y1);
    if (q11 != null && q21 != null && q12 != null && q22 != null) {
      const tx = x1 === x0 ? 0 : (lon - x0) / (x1 - x0);
      const ty = y1 === y0 ? 0 : (lat - y0) / (y1 - y0);
      const a = q11 * (1 - tx) + q21 * tx;
      const b = q12 * (1 - tx) + q22 * tx;
      return a * (1 - ty) + b * ty;
    }

    // inverse-distance weighting over the nearest samples (fallback)
    // scale lon by cos(lat) so metric distances are roughly isotropic
    const cl = Math.cos(lat * Math.PI / 180);
    let bestD = Infinity, bestV = null;
    let wSum = 0, vSum = 0, kNear = 0;
    // gather nearest ~8 by simple scan
    const scored = pts.map(p => {
      const dx = (p.lon - lon) * cl, dy = (p.lat - lat);
      return { d: dx * dx + dy * dy, v: p.masl };
    }).sort((a, b) => a.d - b.d);
    for (const s of scored.slice(0, 8)) {
      if (s.d < bestD) { bestD = s.d; bestV = s.v; }
      if (s.d === 0) return s.v;
      const w = 1 / s.d;
      wSum += w; vSum += w * s.v; kNear++;
    }
    if (wSum > 0) return vSum / wSum;
    return bestV;
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const grid = resolveGrid(args);
  const { pts, byKey } = loadSamples();
  if (!pts.length) throw new Error('no usable samples (all null?)');

  const at = makeInterpolator(pts, byKey);
  const { west, south, east, north, cols, rows } = grid;

  const meters = [];
  for (let j = 0; j < rows; j++) {
    const lat = north - (j / (rows - 1)) * (north - south); // north→south
    for (let i = 0; i < cols; i++) {
      const lon = west + (i / (cols - 1)) * (east - west);   // west→east
      const v = at(lon, lat);
      meters.push(Math.round(v * 10) / 10);
    }
  }

  const minM = Math.round(Math.min(...meters) * 10) / 10;
  const maxM = Math.round(Math.max(...meters) * 10) / 10;

  if (!(minM >= SANE_MIN && maxM <= SANE_MAX && minM < maxM)) {
    console.error(`ABORT: new grid min/max ${minM}/${maxM} m outside sane range ${SANE_MIN}-${SANE_MAX} m. Not overwriting.`);
    process.exit(1);
  }

  const header =
    '// Baked terrain grid for the Raschpetzer qanat corridor (Walferdange/Helmsange, LU).\n' +
    '// SOURCE: ACT LiDAR 2019 0.5 m DTM (data.public.lu), sampled via map.geoportail.lu/raster\n' +
    '// at EPSG:2169, on a regular WGS84 grid. Rows north->south, cols west->east.\n' +
    '// Replaces EU-DEM 25 m (which was +10-21 m high over the corridor). See docs/DATA_CREDIBILITY.md.\n';

  const obj = {
    cols, rows,
    west: +west, east: +east, south: +south, north: +north,
    minM, maxM,
    meters
  };
  const out = header + 'window.BAKED_GEODATA = ' + JSON.stringify(obj) + ';\n';

  // backup then write
  if (existsSync(GEODATA)) copyFileSync(GEODATA, new URL('assets/geodata-walferdange.js.bak', ROOT));
  writeFileSync(GEODATA, out);

  console.log(`Baked assets/geodata-walferdange.js ✓  ${cols}×${rows}, ${meters.length} nodes, min ${minM} m / max ${maxM} m`);
  console.log(`(backup: assets/geodata-walferdange.js.bak)`);
}

try { main(); } catch (e) { console.error(e.message || e); process.exit(1); }
