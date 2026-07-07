import { chromium } from 'playwright-core';
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';

const ROOT = new URL('../dist/', import.meta.url).pathname;
const MIME = { '.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json',
  '.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml' };
const server = createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/index.html';
  const f = normalize(join(ROOT, p));
  if (!f.startsWith(ROOT) || !existsSync(f) || statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': MIME[extname(f)] || 'application/octet-stream' });
  res.end(readFileSync(f));
});
const PORT = 8137;
await new Promise(r => server.listen(PORT, r));

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
page.on('console', m => { if (m.type() === 'error') console.log('PAGE ERR:', m.text()); });
await page.goto('http://localhost:8137/index.html', { waitUntil: 'networkidle' });
await page.waitForTimeout(4500);
await page.screenshot({ path: new URL('../interface.png', import.meta.url).pathname });
console.log('› wrote interface.png');

// Zoom to a shaft cluster to show cap rendering (P4 has a surface case → solid; neighbours mesh)
await page.mouse.move(720, 450);
for (let i = 0; i < 6; i++) { await page.mouse.wheel(0, -320); await page.waitForTimeout(120); }
await page.waitForTimeout(1200);
await page.screenshot({ path: new URL('../interface-shafts.png', import.meta.url).pathname });
console.log('› wrote interface-shafts.png');

// Touch layout: emulate a coarse-pointer (mobile) device to exercise @media (pointer: coarse).
const tctx = await browser.newContext({
  viewport: { width: 412, height: 900 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
});
const tp = await tctx.newPage();
await tp.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'networkidle' });
await tp.waitForTimeout(3500);
await tp.click('#drawer-toggle').catch(() => {});
await tp.waitForTimeout(500);
await tp.click('.tab[data-tab="qanat"]').catch(() => {});
await tp.waitForTimeout(400);
await tp.screenshot({ path: new URL('../interface-touch.png', import.meta.url).pathname });
console.log('› wrote interface-touch.png');

// Close the drawer and reveal the mobile timeline "Key" legend toggle.
await tp.click('#drawer-close').catch(() => {});
await tp.waitForTimeout(400);
await tp.click('#tl-legend-toggle').catch(() => {});
await tp.waitForTimeout(400);
await tp.screenshot({ path: new URL('../interface-touch-timeline.png', import.meta.url).pathname });
console.log('› wrote interface-touch-timeline.png');

await browser.close();
server.close();
