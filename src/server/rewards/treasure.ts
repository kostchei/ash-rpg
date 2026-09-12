import {
  type Currency,
  type EncounterGroupPolicy,
  type TreasureQuality,
  TREASURE_XP_BY_QUALITY,
} from "../../shared/path-contracts.js";
import { type RandomSource, rollDie, systemRandom } from "../rules.js";
import { createRandomSource } from "../generators/prng.js";
import { coreTreasureTableForLevel, rollCoreTreasure } from "./core-treasure.js";

export interface ResolvedGroupTreasure {
  roll: number;
  present: boolean;
  quality: TreasureQuality;
  xpValue: number;
  coins: Currency;
  items: string[];
  tableBasis: string;
}

export interface AuthoredHoardOptions {
  quality?: TreasureQuality;
  level?: number;
  coins?: Partial<Currency>;
  items?: string[];
}

/**
 * 50% presence roll using a 6-sided die:
 * Faces 1, 2, 3 = Real treasure present (50%)
 * Faces 4, 5, 6 = No real treasure (50%)
 */
export function rollGroupPresence(rng: RandomSource = systemRandom): {
  roll: number;
  present: boolean;
} {
  const roll = rollDie(6, rng);
  return {
    roll,
    present: roll <= 3,
  };
}

/**
 * Draws one find from the core treasure table matching the monster's level
 * (0-3, 4-6, 7-9 or 10+), as printed in the rulebook.
 *
 * The app's own policy sits on top of the table: a successful presence roll
 * MUST yield a Normal-or-better find, so the table's Poor rows are excluded
 * from that draw. Every other row keeps its printed d100 weight.
 */
export function selectRealTreasurePackage(
  level: number,
  rng: RandomSource = systemRandom,
): {
  quality: TreasureQuality;
  xpValue: number;
  coins: Currency;
  items: string[];
  tableBasis: string;
} {
  const find = rollCoreTreasure(level, rng, "normal");
  return {
    quality: find.quality,
    xpValue: find.xpValue,
    coins: find.coins,
    items: find.items,
    tableBasis: find.tableBasis,
  };
}

/**
 * Resolves carried treasure for an encounter group.
 * General groups make exactly one 50% presence roll.
 * Saved negative results produce 0 XP and empty loot.
 */
export function resolveGroupTreasure(
  groupId: string,
  level: number = 1,
  seed?: string,
  rng?: RandomSource,
  policy: EncounterGroupPolicy = "general_monster",
): ResolvedGroupTreasure {
  const effectiveSeed = seed ?? `enc_group_${groupId}`;
  const effectiveRng = rng ?? createRandomSource(effectiveSeed);

  // General monster groups always make one 50% presence roll
  if (policy === "general_monster") {
    const { roll, present } = rollGroupPresence(effectiveRng);
    if (!present) {
      return {
        roll,
        present: false,
        quality: "poor",
        xpValue: 0,
        coins: { cp: 0, sp: 0, gp: 0 },
        items: [],
        tableBasis: `core_treasure_${coreTreasureTableForLevel(level).band}_empty`,
      };
    }

    const pkg = selectRealTreasurePackage(level, effectiveRng);
    return {
      roll,
      present: true,
      quality: pkg.quality,
      xpValue: pkg.xpValue,
      coins: pkg.coins,
      items: pkg.items,
      tableBasis: pkg.tableBasis,
    };
  }

  // Boss hoard or authored cache has its own explicit presence policy (default guaranteed)
  const pkg = selectRealTreasurePackage(Math.max(level, 2), effectiveRng);
  return {
    roll: 1,
    present: true,
    quality: pkg.quality,
    xpValue: pkg.xpValue,
    coins: pkg.coins,
    items: pkg.items,
    tableBasis: `authored_${policy}`,
  };
}

/**
 * Generates an authored hoard or cache with explicit quality and contents.
 */
export function createAuthoredHoard(options: AuthoredHoardOptions = {}): {
  quality: TreasureQuality;
  xpValue: number;
  coins: Currency;
  items: string[];
} {
  const quality = options.quality ?? "fabulous";
  const xpValue = TREASURE_XP_BY_QUALITY[quality];
  const coins: Currency = {
    gp: options.coins?.gp ?? (quality === "legendary" ? 300 : quality === "fabulous" ? 80 : 25),
    sp: options.coins?.sp ?? (quality === "legendary" ? 50 : 20),
    cp: options.coins?.cp ?? 0,
  };
  const items = options.items ?? (quality === "legendary" ? ["savant_crystal_lens"] : ["healing_salve"]);

  return {
    quality,
    xpValue,
    coins,
    items,
  };
}
