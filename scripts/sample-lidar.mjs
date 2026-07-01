// Append-only LiDAR sampler for the Raschpëtzer qanat corridor.
// SOURCE: ACT LiDAR 2019 0.5 m DTM (data.public.lu), sampled pointwise via
//   GET https://map.geoportail.lu/raster?lon=<E>&lat=<N>  → JSON {"dhm": <masl|null>}
// where lon/lat are EPSG:2169 (LUREF) metres. WGS84→EPSG:2169 via python3+pyproj.
//
// The cache IS data/lidar/samples.ndjson (append-only, one compact JSON per line):
//   {"lon":..,"lat":..,"masl":..,"run":"<runId>"}
// Cache key = `${lon.toFixed(6)},${lat.toFixed(6)}` (~0.5 m). Already-present keys
// are NEVER re-fetched. A sourceVersion guard refuses to mix DTM releases.
//
// Usage:
//   node scripts/sample-lidar.mjs --seed
//   node scripts/sample-lidar.mjs --bbox W,S,E,N --cols N --rows M [--source-version TAG]
//   node scripts/sample-lidar.mjs --points "lat,lon;lat,lon;..." [--source-version TAG]
import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import * as https from 'node:https';
import * as tls from 'node:tls';

const ROOT = new URL('../', import.meta.url);
const LIDAR_DIR = new URL('data/lidar/', ROOT);
const SAMPLES = new URL('samples.ndjson', LIDAR_DIR);
const MANIFEST = new URL('manifest.json', LIDAR_DIR);
const GEODATA = new URL('assets/geodata-walferdange.js', ROOT);
const SHAFTS = new URL('data/shafts.json', ROOT);
const CA_BUNDLE = '/root/.ccr/ca-bundle.crt';

const SOURCE = 'act-lidar-2019';
const ENDPOINT = 'https://map.geoportail.lu/raster';
const CRS = 'EPSG:2169';
const SOURCE_VERSION = '20200121-082330';
const UA = 'raschpetzer-qanat-viz/1.0 (LiDAR sampler; data.public.lu ACT LiDAR 2019)';
const DELAY_MS = 150;
const MAX_RETRIES = 3;

// ---------- args ----------
function parseArgs(argv) {
  const a = {};
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t === '--seed') a.seed = true;
    else if (t === '--bbox') a.bbox = argv[++i];
    else if (t === '--cols') a.cols = Number(argv[++i]);
    else if (t === '--rows') a.rows = Number(argv[++i]);
    else if (t === '--points') a.points = argv[++i];
    else if (t === '--source-version') a.sourceVersion = argv[++i];
    else if (t === '--run') a.run = argv[++i];
  }
  return a;
}

const key = (lon, lat) => `${lon.toFixed(6)},${lat.toFixed(6)}`;

// ---------- manifest ----------
function loadManifest() {
  if (existsSync(MANIFEST))
    return JSON.parse(readFileSync(MANIFEST, 'utf8'));
  return {
    source: SOURCE, endpoint: ENDPOINT, crs: CRS,
    sourceVersion: SOURCE_VERSION, totalPoints: 0, runs: []
  };
}
function saveManifest(m) {
  writeFileSync(MANIFEST, JSON.stringify(m, null, 2) + '\n');
}

// ---------- cache ----------
function loadKeys() {
  const set = new Set();
  if (!existsSync(SAMPLES)) return set;
  const txt = readFileSync(SAMPLES, 'utf8');
  for (const line of txt.split('\n')) {
    const s = line.trim();
    if (!s) continue;
    try {
      const o = JSON.parse(s);
      set.add(key(o.lon, o.lat));
    } catch { /* skip malformed */ }
  }
  return set;
}
function appendSamples(rows) {
  if (!rows.length) return;
  const body = rows.map(r =>
    JSON.stringify({ lon: r.lon, lat: r.lat, masl: r.masl, run: r.run })).join('\n') + '\n';
  appendFileSync(SAMPLES, body);
}

// ---------- grid / points ----------
function bboxGrid(bbox, cols, rows) {
  const [w, s, e, n] = bbox.split(',').map(Number);
  if ([w, s, e, n].some(Number.isNaN)) throw new Error('--bbox needs W,S,E,N numbers');
  if (!(cols >= 1 && rows >= 1)) throw new Error('--cols/--rows must be >= 1');
  const pts = [];
  for (let j = 0; j < rows; j++) {
    const lat = rows === 1 ? n : n - (j / (rows - 1)) * (n - s); // north→south
    for (let i = 0; i < cols; i++) {
      const lon = cols === 1 ? w : w + (i / (cols - 1)) * (e - w); // west→east
      pts.push({ lon, lat });
    }
  }
  return { pts, bbox: [w, s, e, n] };
}
function pointsList(str) {
  const pts = [];
  for (const pair of str.split(';')) {
    const t = pair.trim();
    if (!t) continue;
    const [lat, lon] = t.split(',').map(Number);
    if (Number.isNaN(lat) || Number.isNaN(lon)) throw new Error(`bad point "${t}"`);
    pts.push({ lon, lat });
  }
  return { pts, bbox: null };
}

// ---------- WGS84 -> EPSG:2169 via one batched python3+pyproj call ----------
function transformBatch(pts) {
  // stdin: one "lon lat" (WGS84 x=lon, y=lat) per line; stdout: "X Y" EPSG:2169.
  const py = `
import sys
from pyproj import Transformer
t = Transformer.from_crs("EPSG:4326", "EPSG:2169", always_xy=True)
out = []
for line in sys.stdin:
    line = line.strip()
    if not line:
        continue
    lon, lat = line.split()
    x, y = t.transform(float(lon), float(lat))
    out.append(f"{x:.4f} {y:.4f}")
sys.stdout.write("\\n".join(out))
`;
  const input = pts.map(p => `${p.lon} ${p.lat}`).join('\n');
  const res = spawnSync('python3', ['-c', py], { input, encoding: 'utf8' });
  if (res.status !== 0)
    throw new Error('pyproj transform failed: ' + (res.stderr || res.error?.message || 'unknown'));
  const lines = res.stdout.trim().split('\n');
  if (lines.length !== pts.length)
    throw new Error(`transform count mismatch: got ${lines.length}, expected ${pts.length}`);
  return lines.map(l => {
    const [x, y] = l.trim().split(/\s+/).map(Number);
    return { x, y };
  });
}

// ---------- HTTPS agent (CA bundle if present) ----------
function makeAgent() {
  const opts = { keepAlive: true };
  if (existsSync(CA_BUNDLE)) {
    opts.ca = readFileSync(CA_BUNDLE);
    // include system roots too
    try { opts.ca = [...tls.rootCertificates, readFileSync(CA_BUNDLE, 'utf8')]; } catch { /* noop */ }
  }
  return new https.Agent(opts);
}
const AGENT = makeAgent();

function fetchDhm(x, y) {
  const url = `${ENDPOINT}?lon=${encodeURIComponent(x)}&lat=${encodeURIComponent(y)}`;
  return new Promise((resolve, reject) => {
    const req = https.get(url, { agent: AGENT, headers: { 'User-Agent': UA, 'Accept': 'application/json' } }, res => {
      let buf = '';
      res.on('data', d => (buf += d));
      res.on('end', () => {
        if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}: ${buf.slice(0, 200)}`));
        try {
          const j = JSON.parse(buf);
          resolve(typeof j.dhm === 'number' ? j.dhm : null);
        } catch (e) { reject(new Error('bad JSON: ' + buf.slice(0, 200))); }
      });
    });
    req.on('error', reject);
    req.setTimeout(15000, () => req.destroy(new Error('timeout')));
  });
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function fetchDhmRetry(x, y) {
  let lastErr;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try { return await fetchDhm(x, y); }
    catch (e) { lastErr = e; await sleep(DELAY_MS * attempt * 2); }
  }
  throw lastErr;
}

// ---------- seeding ----------
function seed(manifest, existing) {
  // (a) reconstruct current baked grid
  const src = readFileSync(GEODATA, 'utf8');
  const m = src.match(/window\.BAKED_GEODATA\s*=\s*(\{[\s\S]*\})\s*;?\s*$/m);
  if (!m) throw new Error('could not parse BAKED_GEODATA');
  const g = JSON.parse(m[1]);
  const { cols, rows, west, east, south, north, meters } = g;

  const gridRows = [];
  let gNew = 0, gSkip = 0;
  for (let j = 0; j < rows; j++) {
    const lat = north - (j / (rows - 1)) * (north - south);
    for (let i = 0; i < cols; i++) {
      const lon = west + (i / (cols - 1)) * (east - west);
      const masl = meters[j * cols + i];
      const k = key(lon, lat);
      if (existing.has(k)) { gSkip++; continue; }
      existing.add(k);
      gridRows.push({ lon: +lon.toFixed(6), lat: +lat.toFixed(6), masl, run: 'seed-grid' });
      gNew++;
    }
  }
  appendSamples(gridRows);
  manifest.runs.push({
    run: 'seed-grid', date: new Date().toISOString(),
    bbox: [west, south, east, north], cols, rows,
    nRequested: cols * rows, nNew: gNew, nSkipped: gSkip
  });

  // (b) per-shaft exact samples
  const shafts = JSON.parse(readFileSync(SHAFTS, 'utf8')).shafts
    .filter(s => s.geo && typeof s.geo.lat === 'number' && typeof s.geo.lon === 'number'
      && typeof s.surfaceElevM === 'number');
  const shRows = [];
  let sNew = 0, sSkip = 0;
  for (const s of shafts) {
    const lon = s.geo.lon, lat = s.geo.lat;
    const k = key(lon, lat);
    if (existing.has(k)) { sSkip++; continue; }
    existing.add(k);
    shRows.push({ lon: +lon.toFixed(6), lat: +lat.toFixed(6), masl: s.surfaceElevM, run: 'seed-shafts' });
    sNew++;
  }
  appendSamples(shRows);
  manifest.runs.push({
    run: 'seed-shafts', date: new Date().toISOString(),
    bbox: null, cols: null, rows: null,
    nRequested: shafts.length, nNew: sNew, nSkipped: sSkip
  });

  manifest.totalPoints = existing.size;
  saveManifest(manifest);
  console.log(`seed-grid:   ${gNew} new, ${gSkip} skipped (${cols}×${rows})`);
  console.log(`seed-shafts: ${sNew} new, ${sSkip} skipped (${shafts.length} shafts)`);
  console.log(`total points: ${manifest.totalPoints}`);
}

// ---------- main sampling run ----------
async function run() {
  if (!existsSync(LIDAR_DIR)) mkdirSync(LIDAR_DIR, { recursive: true });
  const args = parseArgs(process.argv.slice(2));
  const manifest = loadManifest();
  const existing = loadKeys();

  // sourceVersion guard
  if (args.sourceVersion && args.sourceVersion !== manifest.sourceVersion) {
    console.error(`REFUSED: --source-version "${args.sourceVersion}" != manifest.sourceVersion "${manifest.sourceVersion}". ` +
      `Data from a different DTM release must not be mixed.`);
    process.exit(2);
  }

  if (args.seed) { seed(manifest, existing); return; }

  // build requested points
  let requested, bbox = null, cols = null, rows = null;
  if (args.bbox) {
    if (!(args.cols >= 1 && args.rows >= 1)) { console.error('--bbox requires --cols and --rows'); process.exit(1); }
    const g = bboxGrid(args.bbox, args.cols, args.rows);
    requested = g.pts; bbox = g.bbox; cols = args.cols; rows = args.rows;
  } else if (args.points) {
    requested = pointsList(args.points).pts;
  } else {
    console.error('Provide --bbox W,S,E,N --cols N --rows M, or --points "lat,lon;...", or --seed');
    process.exit(1);
  }

  // dedup: only fetch keys not already present (and unique within request)
  const seen = new Set();
  const toFetch = [];
  let nSkipped = 0;
  for (const p of requested) {
    const k = key(p.lon, p.lat);
    if (existing.has(k) || seen.has(k)) { nSkipped++; continue; }
    seen.add(k);
    toFetch.push(p);
  }

  const runId = args.run || `sample-${new Date().toISOString().replace(/[:.]/g, '').slice(0, 15)}`;
  console.log(`requested ${requested.length} points → ${toFetch.length} new to fetch, ${nSkipped} already cached/duplicate`);

  let nNew = 0;
  const newRows = [];
  if (toFetch.length) {
    const proj = transformBatch(toFetch); // batched pyproj
    for (let idx = 0; idx < toFetch.length; idx++) {
      const p = toFetch[idx];
      const { x, y } = proj[idx];
      let masl;
      try { masl = await fetchDhmRetry(x, y); }
      catch (e) { console.error(`  fetch failed for ${key(p.lon, p.lat)} (${x},${y}): ${e.message}`); await sleep(DELAY_MS); continue; }
      const k = key(p.lon, p.lat);
      existing.add(k);
      newRows.push({ lon: +p.lon.toFixed(6), lat: +p.lat.toFixed(6), masl, run: runId });
      nNew++;
      if (idx < toFetch.length - 1) await sleep(DELAY_MS);
    }
    appendSamples(newRows);
  }

  manifest.runs.push({
    run: runId, date: new Date().toISOString(),
    bbox, cols, rows,
    nRequested: requested.length, nNew, nSkipped
  });
  manifest.totalPoints = existing.size;
  saveManifest(manifest);

  console.log(`\nRun ${runId}: nNew=${nNew}, nSkipped=${nSkipped}, new total=${manifest.totalPoints}`);
}

run().catch(e => { console.error(e); process.exit(1); });
