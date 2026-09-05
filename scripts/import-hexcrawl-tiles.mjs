import { copyFile, mkdir, readFile, access } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = process.argv[2];
if (!source) throw new Error('Usage: node scripts/import-hexcrawl-tiles.mjs "path/to/extracted/hex_maps"');
const catalog = JSON.parse(await readFile(resolve(root, "src/client/hexcrawl-tiles.json"), "utf8"));
const groups = { ...catalog.terrain, "points of interest": catalog.pointsOfInterest, paths: Object.values(catalog.paths), rivers: Object.values(catalog.rivers) };
const files = Object.entries(groups).flatMap(([folder, names]) => names.map((name) => `${folder}/${name}.png`));
// Validate the complete pack before writing. Originals are copied byte-for-byte.
await Promise.all(files.map((file) => access(resolve(source, file))));
for (const file of files) {
  const destination = resolve(root, "public/hexcrawl-tiles", file);
  await mkdir(dirname(destination), { recursive: true });
  await copyFile(resolve(source, file), destination);
}
console.log(`Imported ${files.length} Hexcrawl Hex Tiles for local use.`);
