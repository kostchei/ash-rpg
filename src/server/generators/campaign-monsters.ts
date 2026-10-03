import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { EncounterMonster } from "../../shared/types.js";
import { createRandomSource } from "./prng.js";
import { inventory, stockVulnerabilities, regenerationCounters } from "./monster-inventory.mjs";

interface PoolEntry {
  id: string; label: string; category: string; aliases: string[]; prompt: string; defaultEffect?: string;
}
interface AddedPower {
  monsterId: string; name: string; use: string; trigger: string; range: string;
  effect: string; frequency: string; telegraph: string; behaviour: string;
}
const readData = (file: string) => JSON.parse(readFileSync(resolve("data/bestiary", file), "utf8"));
const pool: PoolEntry[] = readData("vulnerability-pool.json").entries;
const additions: AddedPower[] = readData("ability-additions.json").entries;
const normalize = (text: string) => text.toLowerCase().replace(/[^a-z0-9]/g, "");
const isOracleTrait = (text: string) => /^(?:Variant Quality|Strength|Weakness):/.test(text);

/** A stat/form/override change makes a different version; HP damage and lore discovery do not. */
export function campaignMonsterVersionKey(monster: EncounterMonster): string {
  return createHash("sha256").update(JSON.stringify({
    monsterKey: monster.monsterKey, name: monster.name, ac: monster.ac, maxHp: monster.maxHp,
    move: monster.move, attacks: monster.attacks, traits: monster.traits,
    vulnerabilities: monster.vulnerabilities, variantQuality: monster.variantQuality,
    variantStrength: monster.variantStrength, variantWeakness: monster.variantWeakness,
  })).digest("hex");
}

/** Draw once per campaign version. Select stored themes, never invent prose or effects. */
export function generateCampaignMonster(base: EncounterMonster, campaignSeed: string): EncounterMonster {
  const versionKey = campaignMonsterVersionKey(base);
  const rng = createRandomSource(`${campaignSeed}::monster-profile:${versionKey}`);
  const traits = (base.traits ?? []).filter((text) => !isOracleTrait(text));
  const input = {
    id: base.monsterKey, traits, move: base.move ?? "near", ac: base.ac ?? 10,
    hp: base.maxHp, attacks: base.attacks ?? [],
  };
  const special = inventory(input);
  const stock = stockVulnerabilities(input);
  const counters = regenerationCounters(input);
  let count = special.abilities.length;
  let form: string | undefined;
  let selectedTraits = [...traits];
  let move = base.move;
  let ac = base.ac;
  let attacks = [...(base.attacks ?? [])];
  if (special.variants) {
    const index = base.monsterKey === "stone_warrior" ? (rng(6) === 0 ? 1 : 0) : rng(special.variants.length);
    const selected = special.variants[index];
    count = selected.existingAbilityCount;
    form = selected.name;
    if (base.monsterKey === "stone_warrior") {
      selectedTraits = traits.filter((text) => !text.startsWith("Basilisk Hatchling."));
      if (index === 1) selectedTraits.push("Basilisk Hatchling. Has a loyal basilisk hatchling.");
    } else if (base.monsterKey === "wendel") {
      // Keep only the selected source form, including its wrapped continuation.
      selectedTraits = traits.filter((text) => text.startsWith("Sticky."));
      const start = traits.findIndex((text) => text.startsWith(`${form}.`) || (form === "Pearly" && text.startsWith("Type.")));
      const formHeading = /^(?:Ocher|Silky|Puce|Red|Woolly|Sea|Spiny)[.]/;
      for (let i = start; i >= 0 && i < traits.length; i++) {
        if (i > start && formHeading.test(traits[i])) break;
        selectedTraits.push(traits[i].replace(/^Type\..*?Pearly\./, "Pearly."));
      }
      if (form === "Silky" && !base.isVariant) ac = 12;
      if (form === "Sea") move = "near (climb, swim)";
      if (form === "Puce") attacks.push("1 acid spit +4 (near; 1d6)");
      if (form === "Spiny") attacks = attacks.map((attack) => attack.replace("1d6", "1d10"));
    }
  }
  // The oracle strength is one additional named power; its quality is descriptive.
  if (base.isVariant && base.variantStrength) count++;
  const power = additions.find((entry) => entry.monsterId === base.monsterKey);
  if (power && !selectedTraits.some((text) => text.startsWith(`${power.name}.`))) {
    count++;
    selectedTraits.push(`${power.name}. ${power.use}; ${power.frequency}. Trigger: ${power.trigger}. Range: ${power.range}. ${power.effect} Telegraph: ${power.telegraph} Behaviour: ${power.behaviour}`);
  }
  const authored = [...new Set((base.vulnerabilities ?? []).map((text) => text.trim()).filter(Boolean))]
    .filter((text) => !stock.some((entry) => normalize(text.split(":")[0]) === normalize(entry.name)));
  const required = 1 + count;
  const needed = Math.max(0, required - stock.length - authored.length);
  const excluded = new Set(stock.map((entry) => normalize(entry.name)));
  for (const entry of stock) {
    excluded.add(normalize(entry.id));
    if (entry.id === "bright_light") excluded.add("light");
  }
  for (const text of authored) excluded.add(normalize(text.split(":")[0]));
  const eligible = pool.filter((entry) => ![entry.label, ...entry.aliases].some((label) => excluded.has(normalize(label))));
  const chosen: PoolEntry[] = [];
  // Preserve the oracle weakness as one of the new theme draws, not a stock weakness.
  const oracle = eligible.find((entry) => [entry.label, ...entry.aliases].some((label) => normalize(label) === normalize(base.variantWeakness ?? "")));
  if (needed && oracle) {
    chosen.push(oracle);
    eligible.splice(eligible.indexOf(oracle), 1);
  }
  if (needed > eligible.length + chosen.length) throw new Error(`Vulnerability pool exhausted for ${base.monsterKey}`);
  while (chosen.length < needed) chosen.push(eligible.splice(rng(eligible.length), 1)[0]);
  const randomVulnerabilities = chosen.map((entry) => ({
    id: entry.id, label: entry.label, category: entry.category, prompt: entry.prompt,
    ...(entry.defaultEffect ? { effect: entry.defaultEffect } : {}), needsAuthoring: !entry.defaultEffect,
  }));
  return {
    ...base, move, ac, attacks,
    traits: [...selectedTraits, ...(base.traits ?? []).filter((text) => isOracleTrait(text) && !text.startsWith("Weakness:"))],
    vulnerabilities: [
      ...stock.map((entry) => `${entry.name}: ${entry.effect}`), ...authored,
      ...randomVulnerabilities.map((entry) => `${entry.label}: ${entry.effect ?? `${entry.prompt} [Theme; effect needs authoring.]`}`),
    ],
    campaignProfile: {
      versionKey, ...(form ? { form } : {}), specialAbilityCount: count,
      requiredVulnerabilityCount: required, stockVulnerabilityCount: stock.length,
      authoredVulnerabilityCount: authored.length, randomVulnerabilities,
      regenerationCounters: counters.map(({ name, effect }) => ({ name, effect })), sourceNotes: special.notes,
    },
  };
}
