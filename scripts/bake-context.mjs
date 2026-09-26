// Bake the wider "town context" area (Walferdange centre → Pëtschend plateau) used by the
// title-screen tour and the "You are here" kiosk marker:
//   • assets/topomap-context.jpg  — geoportail.lu "topomap" (mapproxy WMS, EPSG:3857)
//   • assets/ortho-context.jpg    — ACT 2019 aerial (INSPIRE WMS, EPSG:4326)
// The coarse context TERRAIN is baked separately from the LiDAR cache:
//   node scripts/sample-lidar.mjs --bbox <CONTEXT_BBOX> --cols 64 --rows 43 --run context-town-50m
//   node scripts/bake-lidar.mjs   --bbox <CONTEXT_BBOX> --cols 64 --rows 43 \
//        --out assets/geodata-context-walferdange.js --var BAKED_GEODATA_CONTEXT --no-despike --sane-max 440
// CONTEXT_BBOX must match index.html's CONTEXT_BBOX. Network required; outputs are committed.
// Usage: node scripts/bake-context.mjs
import { writeFileSync } from 'node:fs';

const BBOX = { west: 6.118, east: 6.162, south: 49.652, north: 49.6708 };
const W = 2048;   // ~1.5 m/px over the ~3.2 km context window
const midLat = (BBOX.south + BBOX.north) / 2;
const lonM = (BBOX.east - BBOX.west) * 111320 * Math.cos(midLat * Math.PI / 180);
const latM = (BBOX.north - BBOX.south) * 111320;
const H = Math.round(W * latM / lonM);

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

const R = 6378137, rad = x => x * Math.PI / 180;
const mx = lon => R * rad(lon);
const my = lat => R * Math.log(Math.tan(Math.PI / 4 + rad(lat) / 2));
const bbox3857 = [mx(BBOX.west), my(BBOX.south), mx(BBOX.east), my(BBOX.north)].join(',');
await grab('topographic map (context)', 'https://wmts.geoportail.lu/mapproxy_4_v3/service'
  + '?service=WMS&version=1.1.1&request=GetMap&layers=topomap&styles='
  + '&srs=EPSG:3857&bbox=' + bbox3857 + '&width=' + W + '&height=' + H + '&format=image/jpeg',
  'topomap-context.jpg');

const bbox4326 = [BBOX.south, BBOX.west, BBOX.north, BBOX.east].join(',');
await grab('ortho 2019 (context)', 'https://wms.inspire.geoportail.lu/geoserver/oi/ows'
  + '?service=WMS&version=1.3.0&request=GetMap&layers=OI_OrthoimageCoverage_RGB_2019&styles='
  + '&crs=EPSG:4326&bbox=' + bbox4326 + '&width=' + W + '&height=' + H + '&format=image/jpeg',
  'ortho-context.jpg');
