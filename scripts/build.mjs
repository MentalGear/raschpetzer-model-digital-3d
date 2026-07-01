// Build a clean, self-contained static site into dist/ for deployment (e.g. GitHub Pages).
// Pipeline: validate (SSOT gate) → bake (regenerate assets/data.bundle.js + docs) → assemble dist/.
// Dependency-free (Node fs only). Usage: node scripts/build.mjs   (or: npm run build)
import { execSync } from 'node:child_process';
import {
  rmSync, mkdirSync, cpSync, copyFileSync, existsSync, statSync,
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

// 4. Report.
console.log('› copied into dist/:');
for (const c of copied) {
  const target = abs('dist/' + c.replace(/\/\s.*$/, ''));
  let size = '';
  try { if (statSync(target).isFile()) size = ` (${statSync(target).size} bytes)`; } catch {}
  console.log('    ' + c + size);
}
console.log('✓ build complete → ' + DIST);
