import { createAshServer } from "./app.js";

function parseHostIpArg(): string | undefined {
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if ((arg === "--ip" || arg === "--host-ip") && i + 1 < args.length) {
      return args[i + 1];
    }
    if (arg.startsWith("--ip=") || arg.startsWith("--host-ip=")) {
      return arg.split("=")[1];
    }
  }
  return undefined;
}

const hostIp = parseHostIpArg();
const server = await createAshServer({ hostIp });
await server.listen();

console.log(`\n  ⚔️  ASH Table Companion is ready`);
console.log(`  Host (this computer): http://localhost:${server.port}/`);
console.log(`  Table (phones on LAN): ${server.baseUrl}/${server.interfaceName ? ` (${server.interfaceName})` : ""}\n`);

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, async () => {
    await server.close();
    process.exit(0);
  });
}
