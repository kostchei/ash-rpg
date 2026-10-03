import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { AshDatabase } from "../../src/server/database.js";
import { createRandomSource } from "../../src/server/generators/prng.js";
import { type RandomSource } from "../../src/server/rules.js";
import { generateUnguardedTreasure } from "../../src/server/rewards/core-treasure.js";
import { resolveGroupTreasure } from "../../src/server/rewards/treasure.js";

// Demonstration runner only: call the existing app functions, preserving their
// returned fields. No authored names, lore, powers, or loot are added here.
const seed = process.argv[2] ?? "ash-runtime-samples-2026-09-30";
const zoneId = process.argv[3] ?? "the_gloaming";
function tracedRandom(stream: string) {
  const rng = createRandomSource(`${seed}::${stream}`);
  const draws: Array<{ maxExclusive: number; result: number }> = [];
  const random: RandomSource = (maxExclusive) => {
    const result = rng(maxExclusive);
    draws.push({ maxExclusive, result });
    return result;
  };
  return { random, draws };
}

const db = new AshDatabase(":memory:");
try {
  const campaign = db.createCampaign("Runtime samples", "Western Reaches", "1234");
  // An isolated demonstration campaign uses a fixed code as its profile seed.
  db.db.prepare("UPDATE campaigns SET code = ? WHERE id = ?").run(seed, campaign.campaignId);
  const table = db.getMonstersForZone(zoneId);
  assert(table.length, `Empty wandering table: ${zoneId}`);
  const monsters = Array.from({ length: 4 }, (_, index) => {
    const encounterRng = tracedRandom(`zone-encounter:${index}`);
    const tableIndex = encounterRng.random(table.length);
    const base = table[tableIndex];
    const key = base.monsterKey;
    const monster = db.getCampaignMonster(campaign.campaignId, base);
    db.addEncounterWithMonsters(campaign.campaignId, monster.name, [monster]);
    const treasureRng = tracedRandom(`carried-treasure:${key}`);
    const treasure = resolveGroupTreasure(`sample:${key}`, monster.level, undefined, treasureRng.random);
    return { input: { zoneId, tableIndex, monsterKey: key }, monster, treasure,
      draws: { encounter: encounterRng.draws, treasure: treasureRng.draws } };
  });
  const treasure = [1, 5, 8, 11].map((level) => {
    const rng = tracedRandom(`unguarded-treasure:${level}`);
    return { discoveringLevel: level, result: generateUnguardedTreasure(level, rng.random), draws: rng.draws };
  });
  const report = {
    seed,
    mode: "existing_runtime_functions",
    functions: ["AshDatabase.getMonstersForZone", "AshDatabase.getCampaignMonster", "AshDatabase.addEncounterWithMonsters", "resolveGroupTreasure", "generateUnguardedTreasure"],
    limitations: [
      "Monster draws use the configured zone wandering table and stock bestiary stats. No oracle variants are applied.",
      "Campaign profiles draw from the expanded pool using one plus the final ability count, minus stock and authored vulnerabilities. Non-damage themes without stored effects are marked as needing authoring.",
      "Lore and harvest are shown only if returned by the existing database; this runner writes none.",
    ],
    monsters, treasure,
  };
  const output = resolve("outputs/bestiary/runtime-samples");
  mkdirSync(output, { recursive: true });
  writeFileSync(resolve(output, "samples.json"), JSON.stringify(report, null, 2) + "\n");
  const lines = ["# Actual runtime generator samples", "", `Seed: \`${seed}\`. Zone: ${zoneId}.`, "",
    ...report.limitations.map((note) => `- ${note}`), "",
    "## Monsters", "", "| Name | LV | AC | HP | Source | Campaign weaknesses (themes marked *) | Carried treasure |",
    "|---|---:|---:|---:|---|---|---|"];
  for (const { monster: m, treasure: t } of monsters) {
    const loot = t.present ? [...t.items, ...Object.entries(t.coins).filter(([, amount]) => amount > 0).map(([unit, amount]) => `${amount} ${unit}`)].join("; ") : "None";
    const weaknesses = [
      `Stock: ${m.campaignProfile?.stockVulnerabilityCount}`,
      ...(m.campaignProfile?.randomVulnerabilities ?? []).map((entry) => `${entry.label}${entry.needsAuthoring ? '*' : ' (×2 damage)'}`),
    ].join('; ');
    lines.push(`| ${m.name} | ${m.level} | ${m.ac} | ${m.maxHp} | ${m.source} | ${weaknesses} | ${loot} |`);
  }
  lines.push("", "## Unguarded treasure", "", "| Discovering level | Returned item / coins | Quality | XP | Table basis |",
    "|---:|---|---|---:|---|");
  for (const { discoveringLevel, result: t } of treasure) {
    const loot = [...t.items, ...Object.entries(t.coins).filter(([, amount]) => amount > 0).map(([unit, amount]) => `${amount} ${unit}`)].join("; ");
    lines.push(`| ${discoveringLevel} | ${loot} | ${t.quality} | ${t.xpValue} | ${t.tableBasis} |`);
  }
  lines.push("", "## Exact returned records and random draws", "", "```json", JSON.stringify(report, null, 2), "```", "");
  const markdown = lines.join("\n");
  writeFileSync(resolve(output, "samples.md"), markdown);
  console.log(markdown.split("## Exact returned records")[0]);
} finally {
  db.close();
}
