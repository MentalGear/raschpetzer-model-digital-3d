// Bake the wider "town context" area (Walferdange centre → Pëtschend plateau) used by the
// title-screen tour and the "You are here" kiosk marker:
//   • assets/topomap-context.jpg  — geoportail.lu "topomap" (mapproxy WMS, EPSG:3857)
//   • assets/ortho-context.jpg    — ACT 2019 aerial (INSPIRE WMS, EPSG:4326)
// The coarse context TERRAIN is baked separately from the LiDAR cache:
//   node scripts/sample-lidar.mjs --bbox <CONTEXT_BBOX> --cols 64 --rows 43 --run context-town-50m
//   node scripts/bake-lidar.mjs   --bbox <CONTEXT_BBOX> --cols 64 --rows 43 \
//        --out assets/geodata-context-walferdange.js --var BAKED_GEODATA_CONTEXT --no-despike --sane-max 440
// CONTEXT_BBOX must match index.html's CONTEXT_BBOX. Network required; outputs are committed.
//   • assets/ortho-context-hq.jpg — with --hq: the same ACT 2019 aerial at 8192 px (~0.4 m/px;
//     2019 like the qanat window's own aerial, so the two match at the seam), fetched as 2×2 WMS tiles of 4096 px and stitched with
//     python3 + Pillow. Loaded only when "High-quality textures (big screen)" is on.
// Usage: node scripts/bake-context.mjs [--hq]
import { writeFileSync, mkdtempSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const BBOX = { west: 6.118, east: 6.162, south: 49.652, north: 49.6708 };
const W = 2048;   // ~1.5 m/px over the ~3.2 km context window
const midLat = (BBOX.south + BBOX.north) / 2;
const lonM = (BBOX.east - BBOX.west) * 111320 * Math.cos(midLat * Math.PI / 180);
const latM = (BBOX.north - BBOX.south) * 111320;
const H = Math.round(W * latM / lonM);

async function grab(label, url, out, abs = false) {
  console.log('› fetching', label, '…');
  const res = await fetch(url);
  const ct = res.headers.get('content-type') || '';
  if (!res.ok || !ct.startsWith('image/')) {
    const body = await res.text().catch(() => '');
    console.error('✗', label, 'failed: http', res.status, ct, '\n', body.slice(0, 300));
    process.exit(1);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(abs ? out : new URL('../assets/' + out, import.meta.url), buf);
  console.log('›  wrote ' + (abs ? out : 'assets/' + out) + ' (' + buf.length + ' bytes)');
}

if (process.argv.includes('--hq')) {
  const HW = 8192, HH = Math.round(HW * latM / lonM / 2) * 2, dir = mkdtempSync(join(tmpdir(), 'ctx-hq-'));
  const lonMid = (BBOX.west + BBOX.east) / 2, latMid = (BBOX.south + BBOX.north) / 2;
  const tiles = [];
  for (const [row, s0, n0] of [[0, latMid, BBOX.north], [1, BBOX.south, latMid]])
    for (const [col, w0, e0] of [[0, BBOX.west, lonMid], [1, lonMid, BBOX.east]]) {
      const f = join(dir, `t${row}${col}.jpg`);
      await grab(`ortho 2019 HQ tile ${row}${col}`, 'https://wms.inspire.geoportail.lu/geoserver/oi/ows'
        + '?service=WMS&version=1.3.0&request=GetMap&layers=OI_OrthoimageCoverage_RGB_2019&styles='
        + `&crs=EPSG:4326&bbox=${s0},${w0},${n0},${e0}&width=${HW / 2}&height=${HH / 2}&format=image/jpeg`, f, true);
      tiles.push([f, col * HW / 2, row * HH / 2]);
    }
  const out = new URL('../assets/ortho-context-hq.jpg', import.meta.url).pathname;
  execFileSync('python3', ['-c', `import sys, json\nfrom PIL import Image\nt = json.loads(sys.argv[1]); im = Image.new('RGB', (${HW}, ${HH}))\nfor f, x, y in t: im.paste(Image.open(f), (x, y))\nim.save(sys.argv[2], quality=84, optimize=True, progressive=True)`,
    JSON.stringify(tiles), out]);
  console.log(`›  wrote assets/ortho-context-hq.jpg (${HW}×${HH})`);
  process.exit(0);
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
