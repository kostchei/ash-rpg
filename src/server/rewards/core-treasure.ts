import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { type TreasureQuality, TREASURE_XP_BY_QUALITY } from "../../shared/path-contracts.js";
import { baselineEncounterValueGp } from "../../shared/quest-rewards.js";
import { type RandomSource, rollDie, systemRandom } from "../rules.js";

/**
 * The four core d100 treasure tables, extracted from the rulebook by
 * scripts/ingest/extract-treasure-tables.ts. A monster rolls on the table
 * matching its own level; unguarded treasure uses the discovering character's
 * level (core rules, Treasure Overview).
 */

export interface CoreTreasureEntry {
  min: number;
  max: number;
  description: string;
  valueGp: number;
  coins?: { gp: number; sp: number; cp: number };
}

export interface CoreTreasureTable {
  band: string;
  minLevel: number;
  maxLevel: number | null;
  entries: CoreTreasureEntry[];
}

const TABLE_PATH = "data/treasure/core-tables.json";

let cachedTables: CoreTreasureTable[] | null = null;

export function loadCoreTreasureTables(): CoreTreasureTable[] {
  if (cachedTables) return cachedTables;
  const path = resolve(TABLE_PATH);
  let raw: string;
  try {
    raw = readFileSync(path, "utf-8");
  } catch (error) {
    throw new Error(
      `Core treasure tables are missing at ${path}. Run: npx tsx scripts/ingest/extract-treasure-tables.ts (${(error as Error).message})`,
    );
  }
  const parsed = JSON.parse(raw) as { tables?: CoreTreasureTable[] };
  if (!parsed.tables || parsed.tables.length !== 4) {
    throw new Error(`Expected four core treasure tables in ${path}, found ${parsed.tables?.length ?? 0}`);
  }
  cachedTables = parsed.tables;
  return cachedTables;
}

/** The table a given level rolls on: 0-3, 4-6, 7-9 or 10+. */
export function coreTreasureTableForLevel(level: number): CoreTreasureTable {
  if (!Number.isFinite(level) || level < 0) {
    throw new Error(`Treasure level must be a non-negative number, received ${level}`);
  }
  const table = loadCoreTreasureTables().find(
    (candidate) => level >= candidate.minLevel && (candidate.maxLevel === null || level <= candidate.maxLevel),
  );
  if (!table) throw new Error(`No core treasure table covers level ${level}`);
  return table;
}

/**
 * Maps a find's gp value onto the book's four XP categories.
 *
 * The core tables do not label their entries, so this is the app's own mapping.
 * It is anchored on the expected value of one treasure find at that level
 * (20/50/80 GP, or 10 GP x level above 9), which puts the tables' junk rows at
 * Poor and their capstone rows — the Staff of Ord and its peers — at Legendary.
 */
export function treasureQualityForValue(valueGp: number, expectedFindGp: number): TreasureQuality {
  if (expectedFindGp <= 0) throw new Error(`Expected find value must be positive, received ${expectedFindGp}`);
  if (valueGp < expectedFindGp * 0.5) return "poor";
  if (valueGp < expectedFindGp * 2) return "normal";
  if (valueGp < expectedFindGp * 10) return "fabulous";
  return "legendary";
}

export interface CoreTreasureRoll {
  roll: number;
  entry: CoreTreasureEntry;
  quality: TreasureQuality;
  xpValue: number;
  coins: { gp: number; sp: number; cp: number };
  items: string[];
  tableBasis: string;
}

const QUALITY_ORDER: TreasureQuality[] = ["poor", "normal", "fabulous", "legendary"];

/**
 * Rolls a find on the level's core table.
 *
 * `minimumQuality` restricts the roll to the rows at or above that category,
 * keeping each row's printed d100 width as its weight. The app uses it so that
 * a successful carried-treasure presence roll never resolves to a Poor find.
 */
export function rollCoreTreasure(
  level: number,
  rng: RandomSource = systemRandom,
  minimumQuality: TreasureQuality = "poor",
): CoreTreasureRoll {
  const table = coreTreasureTableForLevel(level);
  const expectedFindGp = baselineEncounterValueGp(Math.round(level));
  const floor = QUALITY_ORDER.indexOf(minimumQuality);
  if (floor < 0) throw new Error(`Unknown treasure quality ${minimumQuality}`);

  const eligible = table.entries.filter(
    (entry) => QUALITY_ORDER.indexOf(treasureQualityForValue(entry.valueGp, expectedFindGp)) >= floor,
  );
  if (eligible.length === 0) {
    throw new Error(`Treasure table ${table.band} has no entry of quality ${minimumQuality} or better`);
  }

  const weight = eligible.reduce((sum, entry) => sum + (entry.max - entry.min + 1), 0);
  let pick = rollDie(weight, rng);
  let entry = eligible[eligible.length - 1];
  for (const candidate of eligible) {
    const width = candidate.max - candidate.min + 1;
    if (pick <= width) {
      entry = candidate;
      break;
    }
    pick -= width;
  }

  const quality = treasureQualityForValue(entry.valueGp, expectedFindGp);
  return {
    roll: entry.min,
    entry,
    quality,
    xpValue: TREASURE_XP_BY_QUALITY[quality],
    coins: entry.coins ?? { gp: 0, sp: 0, cp: 0 },
    items: entry.coins ? [] : [entry.description],
    tableBasis: `core_treasure_${table.band}_${entry.min}-${entry.max}`,
  };
}

/**
 * Unguarded treasure — a chest, a cache, a searched room — rolled on the table
 * matching the discovering character's level. Unlike a guarded find this has no
 * quality floor: the book's junk rows are part of the draw.
 */
export function generateUnguardedTreasure(
  discoveringLevel: number,
  rng: RandomSource = systemRandom,
): CoreTreasureRoll {
  return rollCoreTreasure(discoveringLevel, rng);
}
