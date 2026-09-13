import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { CLASSES, type ClassInfo } from "../../src/shared/content.js";

/**
 * data/classes/classes.json used to be a second, hand-maintained copy of the
 * class list, and it drifted: it carried classes the game had never heard of
 * while the game carried classes it had never heard of. It is now a dump of
 * `CLASSES`, which is the one list character creation actually reads.
 */
export type ClassDefinition = ClassInfo;

export const EXTRACTED_CLASSES: readonly ClassDefinition[] = CLASSES;

export function runClassExtraction() {
  const outDir = resolve("data/classes");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(resolve(outDir, "classes.json"), JSON.stringify(EXTRACTED_CLASSES, null, 2), "utf-8");
  console.log(`Saved ${EXTRACTED_CLASSES.length} class definitions to data/classes/classes.json`);
}

if (process.argv[1]?.endsWith("extract-classes.ts")) {
  runClassExtraction();
}
