import { cpSync, rmSync, mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { execFileSync, execSync } from 'node:child_process';

if (process.platform !== 'win32' || process.arch !== 'x64') {
  throw new Error('Run this update using Windows x64 Node.js.');
}

const root = resolve(import.meta.dirname, '..');
process.chdir(root);
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const name = `ASH-${pkg.version}-windows-x64`;
const out = resolve('releases', name);

if (!existsSync(out)) {
  console.log(`Release folder ${out} does not exist. Creating full release...`);
  execFileSync('node', ['scripts/build-windows-release.mjs'], { stdio: 'inherit' });
  process.exit(0);
}

console.log('1. Building latest client and server...');
execFileSync('cmd.exe', ['/d', '/c', 'npm run build'], { stdio: 'inherit' });

console.log('2. Syncing updated code and assets into release folder...');
for (const folder of ['dist/client', 'dist/server']) {
  const dest = join(out, folder);
  rmSync(dest, { recursive: true, force: true });
  cpSync(folder, dest, { recursive: true });
}

for (const folder of ['zones', 'data/bestiary', 'data/classes', 'data/oracles', 'data/treasure']) {
  cpSync(folder, join(out, folder), { recursive: true });
}

for (const file of ['launch.cjs', 'Start ASH.cmd', 'READ ME.txt']) {
  cpSync(join('scripts/release', file), join(out, file));
}

// Preserve existing saves, or copy root saves if release database is empty
const rootDb = resolve('data/local/ash.sqlite');
const releaseDb = join(out, 'data/local/ash.sqlite');
if (existsSync(rootDb) && !existsSync(releaseDb)) {
  console.log('3. Copying active campaign saves to release...');
  mkdirSync(join(out, 'data/local'), { recursive: true });
  cpSync('data/local', join(out, 'data/local'), { recursive: true });
} else {
  console.log('3. Preserving existing release campaign saves in data/local/ ...');
}

// Get current git commit hash
let gitCommit = 'unknown';
try {
  gitCommit = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
} catch {}

const releaseMeta = {
  version: pkg.version,
  commit: gitCommit,
  runtime: process.version,
  platform: process.platform,
  arch: process.arch,
  updatedAt: new Date().toISOString()
};

writeFileSync(join(out, 'release.json'), JSON.stringify(releaseMeta, null, 2));

console.log('4. Updating release ZIP archive...');
const quote = s => "'" + s.replaceAll("'", "''") + "'";
execFileSync('powershell.exe', ['-NoProfile', '-Command', `Compress-Archive -Force -LiteralPath ${quote(out)} -DestinationPath ${quote(out + '.zip')}`], { stdio: 'inherit' });

console.log(`\nRelease updated successfully to commit ${gitCommit}!`);
console.log(`Location: ${out}`);
console.log(`ZIP: ${out}.zip\n`);
