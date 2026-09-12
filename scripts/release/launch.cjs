const { spawn } = require('node:child_process');
const path = require('node:path');

process.chdir(__dirname);
process.env.NODE_ENV = 'production';

(async () => {
  const { createAshServer } = await import('./dist/server/server/app.js');
  const server = await createAshServer();
  await new Promise((resolve, reject) => {
    server.httpServer.once('error', reject);
    server.listen().then(resolve, reject);
  });
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
