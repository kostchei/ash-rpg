const { spawn, execSync } = require('node:child_process');
const path = require('node:path');

process.chdir(__dirname);
process.env.NODE_ENV = 'production';

function freePortIfOccupied(port) {
  try {
    const stdout = execSync(`netstat -ano | findstr :${port}`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    });
    const lines = stdout.trim().split('\n');
    for (const line of lines) {
      if (line.includes('LISTENING')) {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && pid !== '0' && pid !== String(process.pid)) {
          console.log(`Port ${port} is currently in use by PID ${pid}. Stopping previous instance...`);
          try {
            execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
          } catch {}
        }
      }
    }
  } catch {}
}

(async () => {
  const { createAshServer } = await import('./dist/server/server/app.js');
  const server = await createAshServer();
  try {
    await new Promise((resolve, reject) => {
      server.httpServer.once('error', reject);
      server.listen().then(resolve, reject);
    });
  } catch (error) {
    if (error.code === 'EADDRINUSE') {
      console.log(`Port ${server.port} was held by another process. Reclaiming port...`);
      freePortIfOccupied(server.port);
      await new Promise(r => setTimeout(r, 600));
      await new Promise((resolve, reject) => {
        server.httpServer.once('error', reject);
        server.listen().then(resolve, reject);
      });
    } else {
      throw error;
    }
  }
  const url = `http://localhost:${server.port}`;
  console.log(`\nASH is running: ${url}`);
  console.log(`Phones on the same Wi-Fi: ${server.baseUrl}`);
  console.log(`Saves: ${path.resolve('data/local/ash.sqlite')}`);
  console.log('\nKeep this window open while playing. Press Ctrl+C to stop.\n');
  if (!process.env.ASH_NO_BROWSER) {
    spawn('explorer.exe', [url], { stdio: 'ignore' }).on('error', () => {
      console.log(`Open ${url} in your browser.`);
    });
  }
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.once(signal, async () => {
      await server.close();
      process.exit(0);
    });
  }
})().catch(error => {
  console.error('\nASH could not start:', error.message);
  if (error.code === 'EADDRINUSE') console.error('Port 3000 is already in use. Close the other ASH window and try again.');
  process.exit(1);
});
