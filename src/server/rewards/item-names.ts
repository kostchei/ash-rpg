import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { type RandomSource, systemRandom } from "../rules.js";

let cachedPools: Readonly<Record<string, readonly string[]>> | undefined;

export function loadDiabloNamePools(): Readonly<Record<string, readonly string[]>> {
  if (cachedPools) return cachedPools;
  const path = resolve("data/treasure/diablo-name-pools.json");
  const data = JSON.parse(readFileSync(path, "utf8")) as { pools?: Record<string, unknown> };
  if (!data.pools || !Object.keys(data.pools).length) throw new Error(`Missing Diablo name pools in ${path}`);
  for (const [category, names] of Object.entries(data.pools)) {
    if (!Array.isArray(names) || !names.length || names.some(name => typeof name !== "string" || !name.trim())) {
      throw new Error(`Invalid Diablo name pool: ${category}`);
    }
  }
  cachedPools = Object.freeze(Object.fromEntries(Object.entries(data.pools).map(([category, names]) =>
    [category, Object.freeze(names as string[])])));
  return cachedPools;
}

const DISPLAY_NAMES: Readonly<Record<string, string>> = {
  shortsword: "short sword", longsword: "long sword",
  leather: "leather armor", chain: "chainmail", plate: "plate mail",
};
const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

/** Keep the rules category visible; matching Diablo names from different games get one vote. */
export function nameEquipment(category: string, rng: RandomSource = systemRandom): string {
  const key = category.toLowerCase();
  const label = DISPLAY_NAMES[key] ?? key;
  const pool = loadDiabloNamePools()[key];
  if (!pool) throw new Error(`No Diablo names for equipment category: ${category}`);
  const distinctive = pool.filter(name => normalize(name) !== normalize(label));
  const choices = distinctive.length ? distinctive : pool;
  const index = Math.floor(rng(choices.length));
  if (index < 0 || index >= choices.length || !Number.isFinite(index)) throw new Error("Invalid naming random result");
  return `${choices[index]} (${label})`;
}

// Longest/more specific forms first; one expression prevents "sword" or "shield"
// from matching again inside a compound category. Plurals preserve bundled finds.
const EQUIPMENT = /\b(round shields?|bastard swords?|short\s?swords?|long\s?swords?|great\s?swords?|great\s?axes?|hand\s?axes?|short\s?bows?|long\s?bows?|crossbows?|war\s?hammers?|morning\s?stars?|holy symbols?|arcane focus(?:es)?|leather armou?r|chain\s?mail|plate (?:mail|armou?r)|spellbooks?|daggers?|falchions?|javelins?|lances?|maces?|pikes?|scimitars?|spears?|staves?|staffs?|clubs?|wands?|quivers?|helms?|shields?)\b/gi;

function categoryFor(match: string): string {
  const compact = match.toLowerCase().replace(/\s/g, "");
  if (/^leatherarmou?r$/.test(compact)) return "leather";
  if (compact === "chainmail") return "chain";
  if (/^plate(mail|armou?r)$/.test(compact)) return "plate";
  if (compact === "stave" || compact === "staves") return "stave";
  if (compact === "holysymbol" || compact === "holysymbols") return "holy symbol";
  if (compact.startsWith("arcanefocus")) return "arcane focus";
  if (compact.startsWith("bastardsword")) return "bastard sword";
  if (compact.startsWith("roundshield")) return "round shield";
  if (compact === "greataxe" || compact === "greataxes") return "greataxe";
  if (compact === "handaxe" || compact === "handaxes") return "handaxe";
  return compact.replace(/s$/, "");
}

const MAGIC_WEAPONS = [
  "bastard sword", "club", "crossbow", "dagger", "falchion", "greataxe", "greatsword",
  "handaxe", "javelin", "lance", "longbow", "longsword", "mace", "morningstar", "pike",
  "scimitar", "shortbow", "shortsword", "spear", "staff", "stave", "warhammer",
] as const;

/** Adds a cosmetic heading, leaving the printed description, quantity and effects intact. */
export function nameTreasureItem(description: string, rng: RandomSource = systemRandom): string {
  // These are already named relics, not generic base equipment.
  if (/\b(?:Staff of Ord|Armor of Saint Terragnis|Obsidian Witchknife)\b/i.test(description)) return description;
  // A persisted/generated name is never rerolled if passed through this helper again.
  const labels = Object.keys(loadDiabloNamePools()).map(key => DISPLAY_NAMES[key] ?? key);
  const heading = description.split(" — ")[0];
  if (labels.some(label => heading.includes(`(${label})`))) return description;

  const categories = new Set<string>();
  for (const match of description.matchAll(EQUIPMENT)) {
    // "Mace inlaid with gold holy symbols" decorates the mace, not a second item.
    if (/holy symbols$/i.test(match[0])) continue;
    categories.add(categoryFor(match[0]));
  }
  if (!categories.size && /\bmagic weapon\b/i.test(description)) {
    categories.add(MAGIC_WEAPONS[Math.floor(rng(MAGIC_WEAPONS.length))]);
  }
  if (!categories.size && /^\+\d+ (?:mithral )?(?:magic )?armou?r\b/i.test(description)) {
    const armor = /\bmithral\b/i.test(description) ? ["chain", "plate"] : ["leather", "chain", "plate"];
    categories.add(armor[Math.floor(rng(armor.length))]);
  }
  if (!categories.size) return description;
  const names = [...categories].map(category => nameEquipment(category, rng));
  // Bare category inputs need no duplicate description.
  if (categories.size === 1 && [...description.matchAll(EQUIPMENT)].some(match => match[0].length === description.length)) {
    return names[0];
  }
  return `${names.join("; ")} — ${description}`;
}
