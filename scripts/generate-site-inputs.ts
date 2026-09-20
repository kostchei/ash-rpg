import { writeFileSync } from "node:fs";
import { PATH_FLAVOR_PROFILES } from "../src/shared/path-flavor.js";
import { generateSiteInputs, renderSiteInputBrief, type SiteInputBundle } from "../src/server/generators/site-inputs.js";

/**
 * Dumps generated site inputs for authoring. These are the inputs a site brief
 * is written from, not finished site text.
 *
 * SITE_PATH_ID=cthulhu SITE_COUNT=8 SITE_SEED=alpha npx tsx scripts/generate-site-inputs.ts
 * SITE_ZONE_ID=dwellers_in_the_deep folds that zone's manifest into each brief.
 * SITE_PATH_ID=all npx tsx scripts/generate-site-inputs.ts
 * Add SITE_JSON=path/to/out.json to write the bundles as JSON as well.
 */

const pathArg = process.env.SITE_PATH_ID ?? "the_mind_below";
const seed = process.env.SITE_SEED ?? "site_inputs_seed";
const jsonOut = process.env.SITE_JSON;
const zoneId = process.env.SITE_ZONE_ID;
const pathIds = pathArg === "all" ? Object.keys(PATH_FLAVOR_PROFILES) : [pathArg];

// A 7 / 11 / 7 path is the shape the progression audit is tuned around.
const SITES_PER_ACT: Record<1 | 2 | 3, number> = { 1: 7, 2: 11, 3: 7 };
const override = process.env.SITE_COUNT ? parseInt(process.env.SITE_COUNT, 10) : undefined;
if (override !== undefined && (!Number.isInteger(override) || override < 1)) {
  throw new Error(`SITE_COUNT must be a positive integer, got "${process.env.SITE_COUNT}"`);
}

const bundles: SiteInputBundle[] = [];
for (const pathId of pathIds) {
  for (const act of [1, 2, 3] as const) {
    const count = override ?? SITES_PER_ACT[act];
    for (let index = 1; index <= count; index++) {
      bundles.push(generateSiteInputs({
        pathId, act, siteId: `${pathId}_act${act}_site${index}`, seed, zoneId,
      }));
    }
  }
}

for (const bundle of bundles) {
  console.log(renderSiteInputBrief(bundle));
  console.log("\n---\n");
}

console.log(`Generated ${bundles.length} site input bundles across ${pathIds.length} path(s), seed "${seed}".`);

if (jsonOut) {
  writeFileSync(jsonOut, JSON.stringify(bundles, null, 2), "utf8");
  console.log(`Wrote ${jsonOut}`);
}
