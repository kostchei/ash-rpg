import assert from 'node:assert/strict';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';

const release = resolve(process.argv[2]);
process.chdir(release);
process.env.NODE_ENV = 'production';
const { createAshServer } = await import(pathToFileURL(join(release, 'dist/server/server/app.js')));
const dbPath = join(mkdtempSync(join(tmpdir(), 'ash-release-save-')), 'test.sqlite');
let server;
async function start() {
  server = await createAshServer({ port: 0, dbPath, devFrontend: false });
  await server.listen();
  return `http://127.0.0.1:${server.httpServer.address().port}`;
}
const post = async (base, path, body) => {
  const response = await fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  assert.ok(response.ok, await response.clone().text());
  return response.json();
};
try {
  let base = await start();
  assert.equal((await (await fetch(base + '/api/health')).json()).ok, true);
  const html = await (await fetch(base)).text();
  const asset = html.match(/src="([^"]+\.js)"/)[1];
  assert.match((await fetch(base + asset)).headers.get('content-type'), /javascript/);
  const content = await (await fetch(base + '/api/content')).json();
  assert.ok(content.monsters.length > 200);
  assert.equal(content.zones.length, 6);
  const campaign = await post(base, '/api/campaigns', { name: 'Release smoke test', regionName: 'Test frontier', pin: '2468' });
  const player = await post(base, '/api/campaigns/join', { code: campaign.code });
  assert.equal(player.role, 'player');
  await server.close();
  base = await start();
  const host = await post(base, '/api/campaigns/host', { code: campaign.code, pin: '2468' });
  assert.equal(host.token, campaign.token);
  console.log('PASS: extracted release serves UI/assets, loads content, creates and joins a campaign, and restores it after restart.');
} finally {
  if (server) await server.close();
}

// Exercise the actual launcher, with an OS-assigned port and no browser popup.
const child = spawn(process.execPath, [join(release, 'launch.cjs')], {
  cwd: release,
  env: { ...process.env, PORT: '0', ASH_NO_BROWSER: '1' },
  windowsHide: true,
  stdio: ['ignore', 'pipe', 'pipe'],
});
try {
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Launcher timeout')), 15000);
    let output = '';
    child.stdout.on('data', chunk => {
      output += chunk;
      if (output.includes('ASH is running:')) { clearTimeout(timer); resolve(); }
    });
    child.once('error', error => { clearTimeout(timer); reject(error); });
    child.once('exit', code => { clearTimeout(timer); reject(new Error(`Launcher exited early: ${code}`)); });
  });
  console.log('PASS: packaged launcher starts with the bundled runtime.');
} finally {
  child.kill();
}
