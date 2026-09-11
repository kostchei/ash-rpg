import {
  type Currency,
  type EncounterGroupPolicy,
  type TreasureQuality,
  TREASURE_XP_BY_QUALITY,
} from "../../shared/path-contracts.js";
import { type RandomSource, rollDie, systemRandom } from "../rules.js";
import { createRandomSource } from "../generators/prng.js";

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
 * Versioned conditional real-treasure pool.
 * A successful presence roll MUST yield a Normal-or-better find (at least 1 XP).
 * Poor finds (0 XP) are never returned on a successful presence roll.
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
  const tier = level <= 3 ? 1 : level <= 6 ? 2 : 3;
  const qualityRoll = rollDie(100, rng);

  let quality: TreasureQuality;
  if (tier === 1) {
    // Tier 1: 75% Normal (1 XP), 25% Fabulous (3 XP)
    quality = qualityRoll <= 75 ? "normal" : "fabulous";
  } else if (tier === 2) {
    // Tier 2: 50% Normal (1 XP), 45% Fabulous (3 XP), 5% Legendary (10 XP)
    if (qualityRoll <= 50) quality = "normal";
    else if (qualityRoll <= 95) quality = "fabulous";
    else quality = "legendary";
  } else {
    // Tier 3: 30% Normal (1 XP), 55% Fabulous (3 XP), 15% Legendary (10 XP)
    if (qualityRoll <= 30) quality = "normal";
    else if (qualityRoll <= 85) quality = "fabulous";
    else quality = "legendary";
  }

  const xpValue = TREASURE_XP_BY_QUALITY[quality];
  let gp = 0;
  let sp = 0;
  let cp = 0;
  const items: string[] = [];

  if (quality === "normal") {
    gp = rollDie(6, rng) * 5 * tier;
    sp = rollDie(10, rng) * 5;
    cp = rollDie(10, rng) * 10;
    if (rollDie(6, rng) >= 3) {
      items.push(tier >= 2 ? "healing_salve" : "holy_water");
    }
  } else if (quality === "fabulous") {
    gp = rollDie(6, rng) * 20 * tier + 25;
    sp = rollDie(10, rng) * 10;
    cp = rollDie(10, rng) * 20;
    items.push(tier >= 3 ? "potion_of_invisibility" : "healing_salve");
    if (rollDie(6, rng) >= 4) {
      items.push("silver_dagger");
    }
  } else if (quality === "legendary") {
    gp = rollDie(6, rng) * 50 * tier + 150;
    sp = rollDie(10, rng) * 25;
    cp = rollDie(10, rng) * 50;
    items.push("ancient_ward_stone");
    items.push("elixir_of_heroism");
  }

  return {
    quality,
    xpValue,
    coins: { gp, sp, cp },
    items,
    tableBasis: `guarded_tier_${tier}_${quality}`,
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
        tableBasis: `tier_${level <= 3 ? 1 : level <= 6 ? 2 : 3}_empty`,
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
