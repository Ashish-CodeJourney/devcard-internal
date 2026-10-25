/**
 * Re-creates workspace node_modules links that npm leaves out.
 *
 * Some npm versions/installs do not materialize per-workspace
 * node_modules entries for hoisted dependencies. Metro and the Android
 * Gradle build resolve packages from apps/mobile/node_modules, so missing
 * entries break the bundle even though the packages exist at the repo root.
 *
 * This script links every direct dependency of every workspace into that
 * workspace's node_modules (junction on Windows, symlink elsewhere),
 * skipping anything already present. It is idempotent and safe to re-run.
 *
 * Wired as the root `postinstall` script so it runs after every
 * `npm install` / `npm ci`.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const ROOT_NM = path.join(ROOT, 'node_modules');

function workspaces() {
  const out = execSync('npm ls --workspaces --parseable --loglevel=silent', {
    cwd: ROOT,
    encoding: 'utf8',
  });
  return out.split('\n').map(s => s.trim()).filter(Boolean);
}

function directDeps(pkgDir) {
  const pkg = JSON.parse(fs.readFileSync(path.join(pkgDir, 'package.json'), 'utf8'));
  return Object.keys({ ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) });
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function link(target, linkPath) {
  if (fs.existsSync(linkPath)) return false;
  ensureDir(path.dirname(linkPath));
  const type = process.platform === 'win32' ? 'junction' : 'dir';
  try {
    fs.symlinkSync(target, linkPath, type);
    return true;
  } catch (err) {
    console.warn(`skip ${linkPath}: ${err.message}`);
    return false;
  }
}

let linked = 0;
let skipped = 0;
for (const ws of workspaces()) {
  if (path.resolve(ws) === ROOT) continue;
  for (const dep of directDeps(ws)) {
    const target = path.join(ROOT_NM, dep);
    if (!fs.existsSync(target)) continue; // not hoisted / not installed; leave alone
    const dest = path.join(ws, 'node_modules', dep);
    if (link(target, dest)) linked++;
    else skipped++;
  }
}
console.log(`link-workspace-deps: linked=${linked} skipped=${skipped}`);
