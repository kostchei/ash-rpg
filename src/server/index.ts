import { createAshServer } from "./app.js";

const server = await createAshServer();
await server.listen();

console.log(`\n  ASH Table Companion is ready`);
console.log(`  Host: http://localhost:${server.port}/`);
console.log(`  Table: ${server.baseUrl}/\n`);

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, async () => {
    await server.close();
    process.exit(0);
  });
}
