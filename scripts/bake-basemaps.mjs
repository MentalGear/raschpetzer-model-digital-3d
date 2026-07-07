// Bake extra base-map drape textures for the qanat window into assets/.
//   • Topographic map  — geoportail.lu cartographic "topomap" (mapproxy WMS, EPSG:3857).
//   • Winter ortho     — ACT 2019 leaf-off aerial (INSPIRE WMS, EPSG:4326).
// Both are single georeferenced images draped via per-vertex lon/lat UVs. The topomap is
// fetched in web-mercator; over this ~1.7 km window the mercator↔lat error is ~0.01 %,
// far below a pixel, so lon/lat UV mapping is fine.
//
// Committed to the repo (the static build never refetches). Network required.
// Usage: node scripts/bake-basemaps.mjs
import { writeFileSync } from 'node:fs';

const GEO_BBOX = { west: 6.138, east: 6.162, south: 49.6618, north: 49.6708 };
// topomap (vector-rendered) and the 2019 winter ortho (0.20 m native) are baked at hi-res;
// the 1967 historical ortho is scanned film near its useful limit, so it stays at 2048.
const HIRES = 4096;   // ~0.42 m/px over the ~1.7 km window
const LORES = 2048;
const midLat = (GEO_BBOX.south + GEO_BBOX.north) / 2;
const mPerDegLon = 111320 * Math.cos(midLat * Math.PI / 180);
const lonM = (GEO_BBOX.east - GEO_BBOX.west) * mPerDegLon;
const latM = (GEO_BBOX.north - GEO_BBOX.south) * 111320;
const heightFor = w => Math.round(w * latM / lonM);

async function grab(label, url, out) {
  console.log('› fetching', label, '…');
  const res = await fetch(url);
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

// --- Topographic map (mapproxy WMS, web-mercator) ---
const R = 6378137, rad = x => x * Math.PI / 180;
const mx = lon => R * rad(lon);
const my = lat => R * Math.log(Math.tan(Math.PI / 4 + rad(lat) / 2));
const bbox3857 = [mx(GEO_BBOX.west), my(GEO_BBOX.south), mx(GEO_BBOX.east), my(GEO_BBOX.north)].join(',');
const topoUrl = 'https://wmts.geoportail.lu/mapproxy_4_v3/service'
  + '?service=WMS&version=1.1.1&request=GetMap&layers=topomap&styles='
  + '&srs=EPSG:3857&bbox=' + bbox3857 + '&width=' + HIRES + '&height=' + heightFor(HIRES)
  + '&format=image/jpeg';
await grab('topographic map (topomap)', topoUrl, 'topomap-walferdange.jpg');

// --- Ortho epochs (INSPIRE WMS, EPSG:4326 lat,lon axis order) ---
const bbox4326 = [GEO_BBOX.south, GEO_BBOX.west, GEO_BBOX.north, GEO_BBOX.east].join(',');
function orthoUrl(layer, w) {
  return 'https://wms.inspire.geoportail.lu/geoserver/oi/ows'
    + '?service=WMS&version=1.3.0&request=GetMap&layers=' + layer + '&styles='
    + '&crs=EPSG:4326&bbox=' + bbox4326 + '&width=' + w + '&height=' + heightFor(w) + '&format=image/jpeg';
}
await grab('winter ortho (ACT 2019 leaf-off)', orthoUrl('OI_OrthoimageCoverage_RGB_2019_winter', HIRES), 'ortho-winter-walferdange.jpg');
await grab('historical ortho (1967)', orthoUrl('OI_OrthoimageCoverage_RGB_1967', LORES), 'ortho-1967-walferdange.jpg');

console.log('✓ base-maps baked (topo+winter ' + HIRES + '×' + heightFor(HIRES) + ', 1967 ' + LORES + '×' + heightFor(LORES) + ')');
