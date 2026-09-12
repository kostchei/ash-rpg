import { cpSync, mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { execFileSync } from 'node:child_process';

if (process.platform !== 'win32' || process.arch !== 'x64') throw new Error('Build this release using Windows x64 Node.js.');
const root = resolve(import.meta.dirname, '..');
process.chdir(root);
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const name = `ASH-${pkg.version}-windows-x64`;
const out = resolve('releases', name);
if (existsSync(out)) throw new Error(`Release folder already exists: ${out}. Move it aside before rebuilding.`);
execFileSync('cmd.exe', ['/d', '/c', 'npm run build'], { stdio: 'inherit' });
mkdirSync(join(out, 'runtime'), { recursive: true });
cpSync(process.execPath, join(out, 'runtime/node.exe'));
for (const folder of ['dist/client', 'dist/server', 'zones', 'data/bestiary', 'data/classes', 'data/oracles', 'data/treasure']) {
  cpSync(folder, join(out, folder), { recursive: true });
}
for (const file of ['launch.cjs', 'Start ASH.cmd', 'READ ME.txt']) cpSync(join('scripts/release', file), join(out, file));
cpSync('package.json', join(out, 'package.json'));
cpSync('package-lock.json', join(out, 'package-lock.json'));
execFileSync('cmd.exe', ['/d', '/c', 'npm ci --omit=dev --no-audit --no-fund'], { cwd: out, stdio: 'inherit' });
const license = await fetch(`https://raw.githubusercontent.com/nodejs/node/${process.version}/LICENSE`);
if (!license.ok) throw new Error('Could not retrieve the bundled Node runtime license.');
writeFileSync(join(out, 'runtime/LICENSE.txt'), await license.text());
writeFileSync(join(out, 'release.json'), JSON.stringify({ version: pkg.version, runtime: process.version, platform: process.platform, arch: process.arch, builtAt: new Date().toISOString() }, null, 2));
const quote = s => "'" + s.replaceAll("'", "''") + "'";
execFileSync('powershell.exe', ['-NoProfile', '-Command', `Compress-Archive -LiteralPath ${quote(out)} -DestinationPath ${quote(out + '.zip')}`], { stdio: 'inherit' });
console.log(`Release ready: ${out}.zip`);
