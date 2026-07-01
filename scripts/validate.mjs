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

if (warns.length) console.warn('SSOT warnings:\n  ' + warns.join('\n  '));
if (errs.length) {
  console.error(`\nSSOT validation FAILED (${errs.length}):\n  ` + errs.join('\n  ') + '\n');
  process.exit(1);
}
console.log(`SSOT valid ✓  (${files.length} files, ${shaftIds.size} shafts, ${sourceIds.size} sources)`);
export { data };
