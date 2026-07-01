// Validate the SSOT (data/*.json). Exits non-zero on any error.
// Checks (priority order): referential integrity, status enum,
// "documented ⇒ has source", range sanity, CRS validity.
import { readFileSync, readdirSync } from 'node:fs';

const DIR = new URL('../data/', import.meta.url);
const load = f => JSON.parse(readFileSync(new URL(f, DIR), 'utf8'));

const files = readdirSync(DIR).filter(f => f.endsWith('.json'));
const data = {};
for (const f of files) data[f.replace('.json', '')] = load(f);

const STATUS = new Set(['documented', 'inferred', 'reconstructed', 'modeled', 'estimated', 'schematic', 'hypothetical']);
const sourceIds = new Set(Object.keys(data.sources || {}).filter(k => k !== '_doc'));
const paradataIds = new Set(Object.keys(data.paradata || {}).filter(k => k !== '_doc'));
const shaftIds = new Set((data.shafts?.shafts || []).map(s => s.id));
const crsIds = new Set(Object.keys(data.site?.crsRegistry || {}));

const errs = [];
const warns = [];

// Walk every object; wherever we see source/paradataRef/status/*Range*, check it.
function walk(node, path) {
  if (Array.isArray(node)) { node.forEach((v, i) => walk(v, `${path}[${i}]`)); return; }
  if (!node || typeof node !== 'object') return;

  if ('source' in node && typeof node.source === 'string' && !sourceIds.has(node.source))
    errs.push(`${path}.source → unknown source id "${node.source}"`);

  if ('status' in node && typeof node.status === 'string' && !STATUS.has(node.status))
    errs.push(`${path}.status → invalid status "${node.status}" (allowed: ${[...STATUS].join(', ')})`);

  if ('paradataRef' in node)
    for (const r of node.paradataRef || [])
      if (!paradataIds.has(r)) errs.push(`${path}.paradataRef → unknown paradata id "${r}"`);

  if ('crs' in node && node.crs && !crsIds.has(node.crs))
    errs.push(`${path}.crs → unknown CRS "${node.crs}" (declare it in site.crsRegistry)`);

  // "no schematic guess promoted to real coords"
  if (node.geo && node.position && node.position.status === 'schematic')
    errs.push(`${path} → has geo coords but position.status is "schematic"`);

  // range sanity: any *Range* array [min,max]
  for (const [k, v] of Object.entries(node)) {
    if (/Range[A-Za-z]*$/.test(k) && Array.isArray(v) && v.length === 2)
      if (!(typeof v[0] === 'number' && typeof v[1] === 'number' && v[0] <= v[1]))
        errs.push(`${path}.${k} → bad range ${JSON.stringify(v)} (need [min<=max])`);
    walk(v, `${path}.${k}`);
  }
}
for (const [name, node] of Object.entries(data)) walk(node, name);

// documented ⇒ has a resolvable source (record-level or field-level)
for (const s of data.shafts?.shafts || []) {
  const st = s.status || 'documented';
  if (STATUS.has(st) && st !== 'inferred' && st !== 'hypothetical' && !s.source)
    warns.push(`shaft ${s.id}: status "${st}" but no record source`);
}

// cross-refs: gallery steps / sections / aux reference real shafts
const g = data.gallery?.gallery;
if (g) {
  for (const step of g.steps || [])
    if (step.underShaft && !shaftIds.has(step.underShaft))
      errs.push(`gallery.step ${step.id} → unknown shaft "${step.underShaft}"`);
  for (const sec of g.sections || [])
    for (const k of ['from', 'to'])
      if (sec[k] && !shaftIds.has(sec[k]))
        errs.push(`gallery.section ${sec.from}-${sec.to} → unknown shaft "${sec[k]}"`);
  for (const sh of g.auxiliaryChannel?.shafts || [])
    if (!shaftIds.has(sh)) errs.push(`gallery.auxiliaryChannel → unknown shaft "${sh}"`);
}

// --- Credibility-derived invariants (see docs/DATA_CREDIBILITY.md) ---
// Trusted facts become machine-checked gates. Hard errors = physical/documentary
// impossibilities; warnings = cross-source agreement drift. Tolerances reflect that
// LiDAR/OSM are ~metre-scale, not survey-grade.
{
  const shafts = data.shafts?.shafts || [];
  const gg = data.gallery?.gallery;
  const FLOOR_BAND = [350, 362];   // near-level gallery corridor (surveyed ~354–358 m)

  // near-level-gallery: documented constant 0.1% grade (qanat angle ≈ 0.057°)
  if (gg && typeof gg.gradientPct === 'number' && gg.gradientPct > 0.5)
    errs.push(`constraint[near-level-gallery]: gallery.gradientPct ${gg.gradientPct}% > 0.5% (brochure: constant 0.1% P9→P-5)`);
  // grade≈0.1%: warn if the constant fall drifts from the documented value
  if (gg && typeof gg.gradientPct === 'number' && (gg.gradientPct < 0.05 || gg.gradientPct > 0.15))
    warns.push(`constraint[grade≈0.1%]: gallery.gradientPct ${gg.gradientPct}% not ≈0.1% (documented p.26)`);
  // stepped-falls: the two documented steps (1 m under P4, 1.2 m under P6) must be present
  {
    const EXP_STEPS = { P4: 1.0, P6: 1.2 };
    const have = Object.fromEntries((gg?.steps || []).map(s => [s.underShaft, s.dropM]));
    for (const [sh, exp] of Object.entries(EXP_STEPS)) {
      if (have[sh] == null) warns.push(`constraint[steps]: missing documented step under ${sh} (≈${exp} m, p.26-27)`);
      else if (Math.abs(have[sh] - exp) > 0.3) warns.push(`constraint[steps]: step under ${sh} = ${have[sh]} m, expected ≈${exp} m`);
    }
  }

  for (const s of shafts) {
    // positive-depth
    if (typeof s.depthM === 'number' && s.depthM <= 0)
      errs.push(`constraint[positive-depth]: ${s.id} depthM ${s.depthM} ≤ 0`);
    // floor-band: surveyed floors sit in the near-level corridor
    if (typeof s.floorElevM === 'number' && (s.floorElevM < FLOOR_BAND[0] || s.floorElevM > FLOOR_BAND[1]))
      errs.push(`constraint[floor-band]: ${s.id} floorElevM ${s.floorElevM} outside ${FLOOR_BAND[0]}–${FLOOR_BAND[1]} m`);
    // cross-source: LiDAR surface must reconcile with brochure floor+depth.
    // Auxiliary / drop-shafts are a documented exception (P-7A's depthM is the
    // rubble-fill extent, not surface-to-floor), so they only warn.
    if (typeof s.surfaceElevM === 'number' && typeof s.depthM === 'number') {
      if (typeof s.floorElevM === 'number') {
        const d = Math.abs(s.surfaceElevM - (s.floorElevM + s.depthM));
        const hard = s.role !== 'auxiliary';
        if (d > 5 && hard) errs.push(`constraint[lidar≈floor+depth]: ${s.id} |LiDAR ${s.surfaceElevM} − (floor ${s.floorElevM}+depth ${s.depthM})| = ${d.toFixed(1)} m > 5`);
        else if (d > 2.5) warns.push(`constraint[lidar≈floor+depth]: ${s.id} off by ${d.toFixed(1)} m${hard ? ' (>2.5)' : ' (aux/drop-shaft exception)'}`);
      } else {
        // no surveyed floor → the floor implied by LiDAR−depth must stay near-level
        const impl = s.surfaceElevM - s.depthM;
        if (impl < FLOOR_BAND[0] || impl > FLOOR_BAND[1])
          errs.push(`constraint[implied-floor]: ${s.id} LiDAR−depth = ${impl.toFixed(1)} m outside ${FLOOR_BAND[0]}–${FLOOR_BAND[1]} m`);
      }
    }
  }

  // aux-higher: dry auxiliary channel should not sit far below the main channel
  const mainFloors = shafts.filter(s => s.role !== 'auxiliary' && typeof s.floorElevM === 'number').map(s => s.floorElevM);
  const minMain = mainFloors.length ? Math.min(...mainFloors) : null;
  if (minMain != null)
    for (const s of shafts)
      if (s.role === 'auxiliary' && typeof s.floorElevM === 'number' && s.floorElevM < minMain - 2)
        warns.push(`constraint[aux-higher]: aux ${s.id} floor ${s.floorElevM} well below main-channel min ${minMain} m`);

  // extent: georeferenced W–E extent should match the ~306 m OSM chain
  const geos = shafts.filter(s => s.geo && typeof s.geo.lat === 'number');
  if (geos.length >= 2) {
    const R = 6371000, rad = x => x * Math.PI / 180;
    const hav = (a, b) => {
      const dla = rad(b.lat - a.lat), dlo = rad(b.lon - a.lon);
      const h = Math.sin(dla / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dlo / 2) ** 2;
      return 2 * R * Math.asin(Math.sqrt(h));
    };
    let mx = 0;
    for (let i = 0; i < geos.length; i++)
      for (let j = i + 1; j < geos.length; j++)
        mx = Math.max(mx, hav(geos[i].geo, geos[j].geo));
    if (mx < 200 || mx > 600)
      warns.push(`constraint[extent]: georeferenced extent ${mx.toFixed(0)} m outside 200–600 m`);
  }

  // spacing: documented inter-shaft distances vs the geo-derived (haversine) distance,
  // so a positional mismatch (e.g. the OSM P2 node reading short) is machine-tracked.
  {
    const R = 6371000, rad = x => x * Math.PI / 180;
    const hav = (a, b) => {
      const dla = rad(b.lat - a.lat), dlo = rad(b.lon - a.lon);
      const h = Math.sin(dla / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dlo / 2) ** 2;
      return 2 * R * Math.asin(Math.sqrt(h));
    };
    const byId = Object.fromEntries(shafts.map(s => [s.id, s]));
    for (const d of gg?.documentedDistances?.items || []) {
      const a = byId[d.from], b = byId[d.to];
      if (a?.geo?.lat != null && b?.geo?.lat != null && typeof d.distanceM === 'number') {
        const geoM = hav(a.geo, b.geo);
        if (Math.abs(geoM - d.distanceM) > 6)
          warns.push(`constraint[spacing]: ${d.from}–${d.to} geo ${geoM.toFixed(0)} m vs documented ${d.distanceM} m (Δ${(geoM - d.distanceM).toFixed(0)} m > 6)`);
      }
    }
  }
}

if (warns.length) console.warn('SSOT warnings:\n  ' + warns.join('\n  '));
if (errs.length) {
  console.error(`\nSSOT validation FAILED (${errs.length}):\n  ` + errs.join('\n  ') + '\n');
  process.exit(1);
}
console.log(`SSOT valid ✓  (${files.length} files, ${shaftIds.size} shafts, ${sourceIds.size} sources)`);
export { data };
