// Build a clean, self-contained static site into dist/ for deployment (e.g. GitHub Pages).
// Pipeline: validate (SSOT gate) → bake (regenerate assets/data.bundle.js + docs) → assemble dist/.
// Dependency-free (Node fs only). Usage: node scripts/build.mjs   (or: npm run build)
import { execSync } from 'node:child_process';
import {
  rmSync, mkdirSync, cpSync, copyFileSync, existsSync, statSync, readFileSync, writeFileSync,
} from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = new URL('../', import.meta.url);
const abs = rel => fileURLToPath(new URL(rel, ROOT));
const run = cmd => execSync(cmd, { stdio: 'inherit', cwd: abs('.') });

// 1. Validate the SSOT (fails the build on error), then bake the runtime bundle + docs.
//    bake.mjs runs validate.mjs itself; we also invoke it up-front so the gate is
//    explicit and the build stops immediately on invalid data.
console.log('› validate + bake');
run('node ' + abs('scripts/validate.mjs'));
run('node ' + abs('scripts/bake.mjs'));

// 2. Fresh dist/ each run.
const DIST = abs('dist');
rmSync(DIST, { recursive: true, force: true });
mkdirSync(DIST, { recursive: true });
console.log('› cleared dist/');

// 3. Assemble. All refs in index.html are relative, so a flat copy works at any base path.
const copied = [];
const copyFile = (rel) => {
  const from = abs(rel);
  if (!existsSync(from)) throw new Error('missing required file: ' + rel);
  copyFileSync(from, abs('dist/' + rel));
  copied.push(rel);
};
const copyDir = (rel) => {
  const from = abs(rel);
  if (!existsSync(from)) throw new Error('missing required dir: ' + rel);
  cpSync(from, abs('dist/' + rel), { recursive: true });
  copied.push(rel + '/  (recursive)');
};

copyFile('index.html');
copyDir('vendor');   // three.min.js, OrbitControls.js
copyDir('assets');   // data.bundle.js (generated), geodata-walferdange.js, reference-fig2.jpg
copyDir('docs');     // human-readable knowledge base (optional)

// 3b. Cache-busting: every <script src> in dist/index.html is a fixed filename that never
// changes between deploys (vendor/three.min.js, assets/data.bundle.js, ...), so a browser or
// the GitHub Pages CDN caching one under its old headers has no signal that a new deploy
// happened — it can keep serving stale JS/data indefinitely. GitHub Pages doesn't let us set
// our own Cache-Control headers, so the fix that actually works regardless of what headers it
// assigns is to make the URL itself change: append the commit SHA as a query string, which
// forces a cache miss (and a fresh fetch) on every deploy that ships a new commit.
const version = (() => {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA.slice(0, 12);
  try { return execSync('git rev-parse HEAD', { cwd: abs('.') }).toString().trim().slice(0, 12); }
  catch { return String(Date.now()); }   // last resort: outside git, still busts on every rebuild
})();
const indexPath = abs('dist/index.html');
const busted = readFileSync(indexPath, 'utf8').replace(
  /<script src="([^"]+)"><\/script>/g,
  (whole, src) => /^https?:\/\//.test(src) ? whole : `<script src="${src}?v=${version}"></script>`
);
writeFileSync(indexPath, busted);
console.log('› cache-busted <script src> refs with ?v=' + version);

// 4. Report.
console.log('› copied into dist/:');
for (const c of copied) {
  const target = abs('dist/' + c.replace(/\/\s.*$/, ''));
  let size = '';
  try { if (statSync(target).isFile()) size = ` (${statSync(target).size} bytes)`; } catch {}
  console.log('    ' + c + size);
}
console.log('✓ build complete → ' + DIST);
