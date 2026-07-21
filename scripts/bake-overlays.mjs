// Bake transparent thematic OVERLAY textures for the qanat window into assets/.
// These drape ON TOP of the chosen base layer (semi-transparent PNGs):
//   • EL.ContourLine   — official surveyed contour lines
//   • EL.SpotElevation — spot heights
//   • EL.BreakLine     — terrain break lines
//   • GE.Aquifer       — aquifer extent (Luxembourg Sandstone) polygon
// All from the geoportail.lu INSPIRE WMS (EPSG:4326), open data.
//
// Committed to the repo (the static build never refetches). Network required.
// Usage: node scripts/bake-overlays.mjs
import { writeFileSync } from 'node:fs';

const GEO_BBOX = { west: 6.138, east: 6.162, south: 49.6618, north: 49.6708 };
const WIDTH = 2048;
// Contour lines get a sharper bake than the other overlays: at 2048px their strokes/labels
// visibly aliased once the "Surrounding area" default view was tightened (see recomputeGeoView),
// and — since this is WMS-rendered vector data, not a fixed-resolution raster — asking for more
// pixels genuinely yields crisper strokes rather than upscaled blur. Only this layer is bumped
// (not spot/break/aquifer) to avoid growing every overlay's asset size for a complaint about one.
const CONTOUR_WIDTH = 4096;
const midLat = (GEO_BBOX.south + GEO_BBOX.north) / 2;
const mPerDegLon = 111320 * Math.cos(midLat * Math.PI / 180);
const lonM = (GEO_BBOX.east - GEO_BBOX.west) * mPerDegLon;
const latM = (GEO_BBOX.north - GEO_BBOX.south) * 111320;
const HEIGHT = Math.round(WIDTH * latM / lonM);
const bbox4326 = [GEO_BBOX.south, GEO_BBOX.west, GEO_BBOX.north, GEO_BBOX.east].join(',');

function wmsUrl(ws, layer, width) {
  const height = Math.round(width * latM / lonM);
  return `https://wms.inspire.geoportail.lu/geoserver/${ws}/ows`
    + '?service=WMS&version=1.3.0&request=GetMap&styles='
    + '&layers=' + layer + '&crs=EPSG:4326&bbox=' + bbox4326
    + '&width=' + width + '&height=' + height + '&format=image/png&transparent=true';
}
async function grab(label, ws, layer, out, width = WIDTH) {
  console.log('› fetching', label, '…');
  const res = await fetch(wmsUrl(ws, layer, width));
  const ct = res.headers.get('content-type') || '';
  if (!res.ok || !ct.startsWith('image/')) {
    const body = await res.text().catch(() => '');
    console.error('✗', label, 'failed: http', res.status, ct, '\n', body.slice(0, 300));
    process.exit(1);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(new URL('../assets/' + out, import.meta.url), buf);
  console.log('›  wrote assets/' + out + ' (' + buf.length + ' bytes)');
}

await grab('official contour lines (EL.ContourLine)', 'el', 'EL.ContourLine', 'ov-contours-walferdange.png', CONTOUR_WIDTH);
await grab('spot elevations (EL.SpotElevation)',      'el', 'EL.SpotElevation', 'ov-spot-walferdange.png');
await grab('break lines (EL.BreakLine)',              'el', 'EL.BreakLine', 'ov-break-walferdange.png');
await grab('aquifer extent (GE.Aquifer)',            'ge', 'GE.Aquifer', 'ov-aquifer-walferdange.png');
console.log('✓ overlays baked (contours ' + CONTOUR_WIDTH + 'px wide, others ' + WIDTH + '×' + HEIGHT + ')');
