import { weaponReference } from "../shared/table-companion.js";
import { randomInt } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { ABILITY_KEYS, ARCANE_MISHAPS, CLASSES, ITEMS, SPELLS } from "../shared/content.js";
import type { AbilityKey, AbilityScores, Character, EncounterMonster, InventoryItem, SpellDefinition } from "../shared/types.js";
import { HEX_DIRECTIONS } from "./frontier.js";

export type RandomSource = (maxExclusive: number) => number;
export const systemRandom: RandomSource = (max) => randomInt(max);

export function rollDie(
  sides: number,
  rng: RandomSource = systemRandom,
): number {
  if (!Number.isInteger(sides) || sides < 2 || sides > 1000)
    throw new Error("Invalid die");
  return rng(sides) + 1;
}

export function rollDice(expression: string, rng: RandomSource = systemRandom) {
  const match = expression
    .trim()
    .toLowerCase()
    .match(/^(\d{1,2})d(\d{1,4})([+-]\d{1,3})?$/);
  if (!match) throw new Error("Use dice such as 1d20, 2d6+3, or 3d8-1");
  const count = Number(match[1]);
  const sides = Number(match[2]);
  const modifier = Number(match[3] ?? 0);
  if (count < 1 || count > 50 || sides < 2 || sides > 1000)
    throw new Error("Dice are outside the allowed range");
  const rolls = Array.from({ length: count }, () => rollDie(sides, rng));
  return {
    expression: `${count}d${sides}${modifier > 0 ? `+${modifier}` : modifier < 0 ? modifier : ""}`,
    rolls,
    modifier,
    total: rolls.reduce((a, b) => a + b, 0) + modifier,
  };
}

export const abilityModifier = (score: number) =>
  score <= 3
    ? -4
    : score <= 5
      ? -3
      : score <= 8
        ? -2
        : score <= 11
          ? 0
          : score <= 13
            ? 1
            : score <= 15
              ? 2
              : score <= 17
                ? 3
                : 4;

export function rollAbilities(rng: RandomSource = systemRandom) {
  return Array.from({ length: 6 }, () => rollDice("3d6", rng).total);
}

const emptyDice = (): Record<AbilityKey, number[]> => ({
  str: [],
  dex: [],
  con: [],
  int: [],
  wis: [],
  cha: [],
});

/** A set containing an 18 is always kept, however badly it fails the other requirements. */
const KEEP_ALWAYS_SCORE = 18;
/** Silent rerolls are cheap; a ceiling stops a mis-specified requirement from hanging the server. */
const MAX_GENERATION_ATTEMPTS = 20000;

const sortedDescending = (scores: AbilityScores) =>
  ABILITY_KEYS.map((key) => scores[key]).sort((a, b) => b - a);

export const IRON_MAN_REQUIREMENTS = {
  /** Highest score must reach this. */
  primeScore: 16,
  /** Second highest score must reach this. */
  secondScore: 12,
  /** Scores strictly below this count as dumps. */
  dumpThreshold: 6,
  /** At most this many dumps allowed. */
  maxDumps: 1,
  minTotal: 64,
} as const;

export const UNEARTHED_ARCANA_REQUIREMENTS = {
  dumpThreshold: 6,
  maxDumps: 1,
  minTotal: 72,
} as const;

const countDumps = (values: number[], threshold: number) =>
  values.filter((value) => value < threshold).length;

export function meetsIronManRequirements(scores: AbilityScores): boolean {
  const values = sortedDescending(scores);
  if (values[0] >= KEEP_ALWAYS_SCORE) return true;
  const req = IRON_MAN_REQUIREMENTS;
  if (values[0] < req.primeScore) return false;
  if (values[1] < req.secondScore) return false;
  if (countDumps(values, req.dumpThreshold) > req.maxDumps) return false;
  return values.reduce((sum, value) => sum + value, 0) >= req.minTotal;
}

export function meetsUnearthedArcanaRequirements(scores: AbilityScores): boolean {
  const values = sortedDescending(scores);
  if (values[0] >= KEEP_ALWAYS_SCORE) return true;
  const req = UNEARTHED_ARCANA_REQUIREMENTS;
  if (countDumps(values, req.dumpThreshold) > req.maxDumps) return false;
  return values.reduce((sum, value) => sum + value, 0) >= req.minTotal;
}

/**
 * Per-class ability priority. The first ability listed gets the largest dice pool,
 * the last gets the smallest.
 */
export const UA_CLASS_STAT_ORDER: Record<string, AbilityKey[]> = {
  Fighter: ["str", "con", "dex", "int", "wis", "cha"],
  Thief: ["dex", "cha", "int", "con", "str", "wis"],
  Priest: ["wis", "cha", "con", "str", "int", "dex"],
  Wizard: ["int", "wis", "dex", "con", "cha", "str"],
  Delver: ["con", "dex", "str", "wis", "int", "cha"],
  "Ras-Godai": ["dex", "int", "str", "con", "wis", "cha"],
  Druid: ["wis", "cha", "con", "int", "dex", "str"],
  Alchemist: ["int", "dex", "con", "wis", "cha", "str"],
  Sage: ["int", "wis", "cha", "con", "dex", "str"],
  Monk: ["dex", "wis", "str", "con", "int", "cha"],
  Bard: ["cha", "dex", "int", "str", "con", "wis"],
  Duelist: ["dex", "cha", "con", "str", "int", "wis"],
  Ranger: ["str", "wis", "con", "dex", "int", "cha"],
};

/** Dice pool per ability, in class priority order, before the high-score cut-off bites. */
export const UA_DICE_SEQUENCE = [8, 7, 6, 5, 4, 3] as const;
/** A score at or above this counts towards the cut-off. */
export const UA_HIGH_SCORE = 16;
/** Once this many abilities are high, the remaining pools drop to 4d6 (last stays 3d6). */
export const UA_HIGH_SCORE_LIMIT = 2;

export function unearthedArcanaStatOrder(className: string): AbilityKey[] {
  const order = UA_CLASS_STAT_ORDER[className];
  if (!order) throw new Error(`No Unearthed Arcana stat order defined for class "${className}"`);
  return order;
}

function rollUnearthedArcanaAttempt(
  order: AbilityKey[],
  rng: RandomSource,
): { scores: AbilityScores; dice: Record<AbilityKey, number[]> } {
  const scores: Partial<AbilityScores> = {};
  const dice = emptyDice();
  let highScores = 0;

  order.forEach((key, index) => {
    const isLast = index === order.length - 1;
    const count =
      highScores >= UA_HIGH_SCORE_LIMIT ? (isLast ? 3 : 4) : UA_DICE_SEQUENCE[index];
    const rolls = Array.from({ length: count }, () => rollDie(6, rng));
    dice[key] = rolls;
    const score = [...rolls]
      .sort((a, b) => b - a)
      .slice(0, 3)
      .reduce((sum, value) => sum + value, 0);
    scores[key] = score;
    if (score >= UA_HIGH_SCORE) highScores += 1;
  });

  return { scores: scores as AbilityScores, dice };
}

/**
 * Unearthed Arcana method: descending dice pools in class priority order, rerolled
 * silently until the set meets its requirements.
 */
export function rollUnearthedArcanaAbilities(
  className: string,
  rng: RandomSource = systemRandom,
): { scores: AbilityScores; dice: Record<AbilityKey, number[]>; statOrder: AbilityKey[] } {
  const order = unearthedArcanaStatOrder(className);

  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt += 1) {
    const result = rollUnearthedArcanaAttempt(order, rng);
    if (meetsUnearthedArcanaRequirements(result.scores)) {
      return { ...result, statOrder: order };
    }
  }

  throw new Error(
    `Unearthed Arcana generation for ${className} failed to meet its requirements in ${MAX_GENERATION_ATTEMPTS} attempts`,
  );
}

export function getEligibleClasses(scores: AbilityScores): string[] {
  const eligible: string[] = [];

  if (scores.str >= 9) eligible.push("Fighter");
  if (scores.dex >= 9) eligible.push("Thief");
  if (scores.wis >= 9) eligible.push("Priest");
  if (scores.int >= 9) eligible.push("Wizard");
  if (scores.con >= 9 || scores.str >= 9) eligible.push("Delver");
  if (scores.dex >= 9) eligible.push("Ras-Godai");
  if (scores.wis >= 9) eligible.push("Druid");
  if (scores.int >= 9) eligible.push("Alchemist");
  if (scores.int >= 9) eligible.push("Sage");
  if (scores.dex >= 9 && scores.wis >= 9) eligible.push("Monk");
  if (scores.cha >= 9) eligible.push("Bard");
  if (scores.dex >= 9) eligible.push("Duelist");
  if (scores.str >= 9 && scores.wis >= 9) eligible.push("Ranger");

  if (eligible.length === 0) {
    const highestVal = Math.max(...Object.values(scores));
    const highestKeys = ABILITY_KEYS.filter((k) => scores[k] === highestVal);
    if (highestKeys.includes("str")) eligible.push("Fighter", "Delver");
    if (highestKeys.includes("dex")) eligible.push("Thief", "Ras-Godai", "Duelist");
    if (highestKeys.includes("wis")) eligible.push("Priest", "Druid");
    if (highestKeys.includes("int")) eligible.push("Wizard", "Alchemist", "Sage");
    if (highestKeys.includes("con")) eligible.push("Delver");
    if (highestKeys.includes("cha")) eligible.push("Bard");
  }

  return Array.from(new Set(eligible));
}

/** 3d6 straight down the line, with no requirements applied. */
function rollStraight3d6(rng: RandomSource): {
  scores: AbilityScores;
  dice: Record<AbilityKey, number[]>;
} {
  const scores: Partial<AbilityScores> = {};
  const dice = emptyDice();

  for (const key of ABILITY_KEYS) {
    const rolls = [rollDie(6, rng), rollDie(6, rng), rollDie(6, rng)];
    dice[key] = rolls;
    scores[key] = rolls.reduce((sum, value) => sum + value, 0);
  }

  return { scores: scores as AbilityScores, dice };
}

/**
 * Iron Man method: 3d6 in order, rerolled silently until the set meets its requirements.
 */
export function rollIronManAbilities(
  rng: RandomSource = systemRandom,
): { scores: AbilityScores; dice: Record<AbilityKey, number[]>; eligibleClasses: string[] } {
  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt += 1) {
    const result = rollStraight3d6(rng);
    if (meetsIronManRequirements(result.scores)) {
      return { ...result, eligibleClasses: getEligibleClasses(result.scores) };
    }
  }

  throw new Error(
    `Iron Man generation failed to meet its requirements in ${MAX_GENERATION_ATTEMPTS} attempts`,
  );
}

export type NpcAbilityMethod = "iron_man" | "unearthed_arcana" | "standard";

/** Classes with a defined Unearthed Arcana ability order, i.e. everything rollable. */
export const UA_CLASSES = Object.keys(UA_CLASS_STAT_ORDER);

/**
 * Retainers are classless hirelings: straight 3d6 per ability, no requirements.
 */
export function rollRetainerAbilities(
  rng: RandomSource = systemRandom,
): { scores: AbilityScores; dice: Record<AbilityKey, number[]>; method: NpcAbilityMethod } {
  return { ...rollStraight3d6(rng), method: "standard" };
}

/**
 * NPCs rescued from or met inside a dungeon have a class. Roll 1d6: on 1-5 they are an
 * Iron Man character whose class is assigned from the scores afterwards; on a 6 they are
 * an Unearthed Arcana character whose class is rolled first, then rolled down its order.
 */
export function rollDungeonNpc(rng: RandomSource = systemRandom): {
  className: string;
  method: "iron_man" | "unearthed_arcana";
  scores: AbilityScores;
  dice: Record<AbilityKey, number[]>;
} {
  if (rollDie(6, rng) === 6) {
    const className = UA_CLASSES[rng(UA_CLASSES.length)];
    const { scores, dice } = rollUnearthedArcanaAbilities(className, rng);
    return { className, method: "unearthed_arcana", scores, dice };
  }
  const { scores, dice, eligibleClasses } = rollIronManAbilities(rng);
  const className = eligibleClasses[rng(eligibleClasses.length)];
  return { className, method: "iron_man", scores, dice };
}

const ORACLE_TARGETS = {
  certain: 4,
  likely: 7,
  even: 11,
  unlikely: 15,
  impossible: 19,
} as const;
export type Likelihood = keyof typeof ORACLE_TARGETS;

export function binaryOracle(
  likelihood: Likelihood,
  rng: RandomSource = systemRandom,
) {
  const roll = rollDie(20, rng);
  const target = ORACLE_TARGETS[likelihood];
  let answer: string;
  if (roll === 20) answer = "YES, AND…";
  else if (roll === 1) answer = "NO, AND…";
  else if (roll >= target) answer = roll % 2 ? "YES, BUT…" : "YES";
  else answer = roll % 2 === 0 ? "NO, BUT…" : "NO";
  return { roll, target, answer };
}

export function reactionRoll(
  chaModifier = 0,
  rng: RandomSource = systemRandom,
) {
  const dice = [rollDie(6, rng), rollDie(6, rng)];
  const total = dice[0] + dice[1] + chaModifier;
  const reaction =
    total <= 3
      ? "Hostile / aggressive"
      : total <= 6
        ? "Suspicious / threatening"
        : total <= 9
          ? "Cautious / neutral"
          : total <= 11
            ? "Curious / friendly"
            : "Allied / receptive";
  return { dice, total, reaction };
}

export function moraleRoll(score: number, rng: RandomSource = systemRandom) {
  const dice = [rollDie(6, rng), rollDie(6, rng)];
  const total = dice[0] + dice[1];
  return {
    dice,
    total,
    outcome:
      total > score
        ? "Morale fails — rout, surrender, or scatter"
        : "Morale holds",
  };
}

const GEOMETRY = [
  ["Small square guard post (20′ × 20′)", 1],
  ["Narrow vaulted corridor (10′ × 40′)", 2],
  ["Rectangular burial vault (30′ × 50′)", 2],
  ["Natural limestone cavern with stagnant pool (40′ × 40′)", 3],
  ["Grand pillared hall / temple antechamber (50′ × 70′)", 3],
  ["Vast multi-tier chasm with ledges (60′+)", 4],
] as const;
const CONTENTS = [
  ["Empty & eerie", "Ancient dust and wind through cracks; free search turn."],
  [
    "Dungeon dressing / lore inscription",
    "A relief, fresco, or statue reveals a clue.",
  ],
  [
    "Mechanical or magical trap",
    "Resolve the generated trap before proceeding.",
  ],
  ["Lair / resident monster", "Roll 2d6 reaction before choosing violence."],
  [
    "Guarded treasure cache",
    "A locked chest, alcove urn, or false-brick cache.",
  ],
  [
    "Special feature / puzzle / relic",
    "A fountain, rune puzzle, or teleportation arch.",
  ],
] as const;
const TRAPS = [
  ["Spiked pit", "False stone flagstone", "1d6 falling + 1d6 piercing", 12],
  [
    "Poison dart volley",
    "Opening a chest without its key",
    "1d4 piercing; DC 12 CON or paralyzed 1d4 rounds",
    14,
  ],
  [
    "Scything ceiling blade",
    "Tripwire across the passage",
    "2d8 slashing; DC 13 DEX for half",
    13,
  ],
  [
    "Crushing stone block",
    "Pulling a false lever",
    "3d10 bludgeoning and seals the doorway",
    15,
  ],
  [
    "Toxic spore cloud",
    "Disturbing a dried fungal colony",
    "DC 11 CON or fatigue + blinded 3 rounds",
    10,
  ],
  [
    "Flooding sluice gate",
    "Opening an iron vault door",
    "Chamber fills in 3 rounds",
    14,
  ],
  [
    "Electrified rune floor",
    "Crossing without the pass-phrase",
    "2d6 lightning and extinguishes flames",
    15,
  ],
  [
    "Teleportation slide",
    "Sliding ramp trapdoor",
    "Move one dungeon level down into a monster pit",
    13,
  ],
] as const;

export function generateDungeonRoom(rng: RandomSource = systemRandom) {
  const geometryRoll = rollDie(6, rng);
  const contentRoll = rollDie(6, rng);
  const [geometry, exits] = GEOMETRY[geometryRoll - 1];
  const [contents, interaction] = CONTENTS[contentRoll - 1];
  const trapRoll = contentRoll === 3 ? rollDie(8, rng) : null;
  const trap = trapRoll
    ? (() => {
        const [name, trigger, effect, dc] = TRAPS[trapRoll - 1];
        return { name, trigger, effect, dc };
      })()
    : undefined;
  return {
    geometryRoll,
    contentRoll,
    geometry,
    contents,
    interaction,
    exits,
    trapRoll,
    trap,
  };
}

export function wildernessWatch(
  biome: "forest" | "marsh" | "mountain",
  rng: RandomSource = systemRandom,
) {
  const weatherTotal = rollDie(6, rng) + rollDie(6, rng);
  const weather =
    weatherTotal === 2
      ? "Cataclysmic storm / gale"
      : weatherTotal <= 4
        ? "Heavy rain / dense fog"
        : weatherTotal <= 8
          ? "Overcast / mild breeze"
          : weatherTotal <= 10
            ? "Clear skies & bright sun"
            : weatherTotal === 11
              ? "Unnatural heat / aridity"
              : "Planar aurora / omen sky";
  const encounterCheck = rollDie(6, rng);
  const encounterRoll = encounterCheck === 1 ? rollDie(8, rng) : null;
  const tables = {
    forest: [
      "Dire wolves",
      "Goblin snipers",
      "Forest giant spider",
      "Wood elf rangers",
      "Wild boar",
      "Traveling tinker cart",
      "Wandering owlbear",
      "Ancient treant guardian",
    ],
    marsh: [
      "Giant leech swarm",
      "Lizardman foragers",
      "Will-o’-the-wisp",
      "Kuo-Toa outcast",
      "Crocodile behemoth",
      "Sunken skeleton wardens",
      "Bog hag",
      "Juvenile hydra",
    ],
    mountain: [
      "Mountain lion",
      "Orc raiding scouts",
      "Harpy flock",
      "Half-Ogre mercenaries",
      "Rockslide hazard",
      "Manticore",
      "Dwarven prospectors",
      "Young stone giant",
    ],
  };
  return {
    weatherTotal,
    weather,
    encounterCheck,
    encounter: encounterRoll
      ? tables[biome][encounterRoll - 1]
      : "No encounter",
    encounterRoll,
  };
}

/**
 * Calculates watch cost to traverse a 6-mile hex based on terrain, road presence, and water crossings.
 * Road / Paved Way / Calm Canal / Trail: 1 watch.
 * Standard Off-Road (Grasslands, Open Woods, Rolling Hills): 2 watches.
 * Difficult Terrain (Dense Swamps, Rocky Mountains, Sand Dunes, Cavern Siphons, Primeval Jungle): 3 watches.
 * Unbridged River / Chasm Crossing: +1 watch.
 */
export function calculateTravelWatches(
  terrain: string,
  hasRoad = false,
  crossingMethod?: "ford" | "stone_bridge" | "wooden_bridge" | "ferry" | "portage" | "none",
): number {
  if (hasRoad) return 1;

  const t = terrain.toLowerCase();
  let baseCost = 2; // Default standard off-road

  if (
    t.includes("swamp") ||
    t.includes("mire") ||
    t.includes("bog") ||
    t.includes("mountain") ||
    t.includes("peak") ||
    t.includes("dune") ||
    t.includes("desert") ||
    t.includes("karst") ||
    t.includes("cavern") ||
    t.includes("jungle") ||
    t.includes("quagmire") ||
    t.includes("crag")
  ) {
    baseCost = 3;
  }

  if (crossingMethod === "none" || crossingMethod === "ford") {
    baseCost += 1;
  }

  return baseCost;
}

/**
 * Returns true if weather reduces visibility enough to disorient navigation
 * (dense fog, heavy rain, gale, storm, mist, blizzard).
 */
export function isObscuringWeather(weather?: string): boolean {
  if (!weather) return false;
  const w = weather.toLowerCase();
  return (
    w.includes("fog") ||
    w.includes("rain") ||
    w.includes("storm") ||
    w.includes("gale") ||
    w.includes("blizzard") ||
    w.includes("mist")
  );
}

export interface NavigationCheckParams {
  watchCost: number;
  hasRoad?: boolean;
  weather?: string;
  isNightTravel?: boolean;
  partyIntMod?: number;
  currentQ: number;
  currentR: number;
  intendedQ: number;
  intendedR: number;
  rng?: RandomSource;
  forcedRoll?: number;
  forcedDriftIndex?: number;
}

export interface NavigationResult {
  checkRequired: boolean;
  terrainClass: "easy" | "moderate" | "hard";
  dc: number;
  roll: number;
  total: number;
  passed: boolean;
  actualQ: number;
  actualR: number;
  drifted: boolean;
  driftDirection?: string;
  driftIndex?: number;
}

/**
 * Wilderness navigation check per settled table requirements:
 * - Following a road or trail avoids the check.
 * - Watch cost 1 (easy terrain): no check in clear daylight, DC 9 in night or obscuring weather.
 * - Watch cost 2 (moderate terrain): DC 9 in clear daylight, DC 15 in night or obscuring weather.
 * - Watch cost 3 (hard terrain): DC 15 in clear daylight, DC 18 in night or obscuring weather.
 * - If both night and obscuring weather apply, raises terrain 2 steps (up to max DC 18).
 * - Check uses party's best INT modifier against the ASH ladder (DC 9/12/15/18).
 * - On failure: drifts into one of all 6 hex directions uniformly, including the intended direction.
 */
export function resolveWildernessNavigation(
  params: NavigationCheckParams,
): NavigationResult {
  const {
    watchCost,
    hasRoad = false,
    weather,
    isNightTravel = false,
    partyIntMod = 0,
    currentQ,
    currentR,
    intendedQ,
    intendedR,
    rng = systemRandom,
    forcedRoll,
    forcedDriftIndex,
  } = params;

  if (hasRoad) {
    return {
      checkRequired: false,
      terrainClass: "easy",
      dc: 0,
      roll: 0,
      total: 0,
      passed: true,
      actualQ: intendedQ,
      actualR: intendedR,
      drifted: false,
    };
  }

  const terrainClass: "easy" | "moderate" | "hard" =
    watchCost <= 1 ? "easy" : watchCost === 2 ? "moderate" : "hard";

  const obscuring = isObscuringWeather(weather);
  let stepRaises = 0;
  if (isNightTravel) stepRaises++;
  if (obscuring) stepRaises++;

  let dc = 0;
  let checkRequired = true;

  if (terrainClass === "easy") {
    if (stepRaises === 0) {
      checkRequired = false;
      dc = 0;
    } else if (stepRaises === 1) {
      dc = 9;
    } else {
      dc = 15;
    }
  } else if (terrainClass === "moderate") {
    if (stepRaises === 0) {
      dc = 9;
    } else if (stepRaises === 1) {
      dc = 15;
    } else {
      dc = 18;
    }
  } else {
    // hard
    if (stepRaises === 0) {
      dc = 15;
    } else {
      dc = 18;
    }
  }

  if (!checkRequired) {
    return {
      checkRequired: false,
      terrainClass,
      dc: 0,
      roll: 0,
      total: 0,
      passed: true,
      actualQ: intendedQ,
      actualR: intendedR,
      drifted: false,
    };
  }

  const roll = forcedRoll !== undefined ? forcedRoll : rollDie(20, rng);
  const total = roll + partyIntMod;
  const passed = total >= dc;

  if (passed) {
    return {
      checkRequired: true,
      terrainClass,
      dc,
      roll,
      total,
      passed: true,
      actualQ: intendedQ,
      actualR: intendedR,
      drifted: false,
    };
  }

  // Check failed: uniformly choose 1 of all 6 hex directions
  const driftIndex =
    forcedDriftIndex !== undefined
      ? (forcedDriftIndex % 6 + 6) % 6
      : rng(6);
  const dir = HEX_DIRECTIONS[driftIndex];
  const actualQ = currentQ + dir.dq;
  const actualR = currentR + dir.dr;
  const drifted = actualQ !== intendedQ || actualR !== intendedR;

  return {
    checkRequired: true,
    terrainClass,
    dc,
    roll,
    total,
    passed: false,
    actualQ,
    actualR,
    drifted,
    driftDirection: dir.name,
    driftIndex,
  };
}

/**
 * 4-watch day fatigue evaluation for Watch 4 (Night) forced march.
 */
export function evaluateWatchFatigue(
  watchNumber: 1 | 2 | 3 | 4,
  consecutiveForcedWatches = 0,
  conModifier = 0,
  rng: RandomSource = systemRandom,
): {
  forcedMarch: boolean;
  checkDc: number;
  roll: number;
  passed: boolean;
  fatigueGained: boolean;
} {
  if (watchNumber !== 4) {
    return {
      forcedMarch: false,
      checkDc: 0,
      roll: 0,
      passed: true,
      fatigueGained: false,
    };
  }

  const checkDc = 12 + consecutiveForcedWatches;
  const roll = rollDie(20, rng) + conModifier;
  const passed = roll >= checkDc;

  return {
    forcedMarch: true,
    checkDc,
    roll,
    passed,
    fatigueGained: !passed,
  };
}

export function loreTier(total: number) {
  return total >= 18
    ? 4
    : total >= 15
      ? 3
      : total >= 12
        ? 2
        : total >= 9
          ? 1
          : 0;
}

// -------------------------------------------------------------
// Monster Variant Generator (Shadowdark p. 194)
// -------------------------------------------------------------

interface MonsterGeneratorRow {
  roll: number;
  combatOffset: number;
  quality: string;
  strength: string;
  weakness: string;
}

let cachedMonsterGeneratorRows: MonsterGeneratorRow[] | null = null;

function loadMonsterGeneratorRows(): MonsterGeneratorRow[] {
  if (cachedMonsterGeneratorRows) return cachedMonsterGeneratorRows;
  const path = resolve("data/oracles/monster-generator.json");
  if (existsSync(path)) {
    const raw = JSON.parse(readFileSync(path, "utf-8"));
    cachedMonsterGeneratorRows = raw.rows;
  } else {
    cachedMonsterGeneratorRows = [
      { roll: 1, combatOffset: -3, quality: "Beastlike", strength: "+1 attack", weakness: "Cold" },
      { roll: 2, combatOffset: -3, quality: "Avian", strength: "Absorbs magic", weakness: "Greed" },
      { roll: 3, combatOffset: -2, quality: "Amphibious", strength: "Swarm", weakness: "Light" },
      { roll: 4, combatOffset: -2, quality: "Demonic", strength: "1d10 damage", weakness: "Salt" },
      { roll: 5, combatOffset: -1, quality: "Arachnid", strength: "Poison sting", weakness: "Vanity" },
      { roll: 6, combatOffset: -1, quality: "Ooze", strength: "Confusing gaze", weakness: "Mirrors" },
      { roll: 7, combatOffset: 0, quality: "Insectoid", strength: "Eats metal", weakness: "Electricity" },
      { roll: 8, combatOffset: 0, quality: "Draconic", strength: "Ranged attacks", weakness: "Fragile body" },
      { roll: 9, combatOffset: 0, quality: "Plantlike", strength: "Highly intelligent", weakness: "Sunlight" },
      { roll: 10, combatOffset: 0, quality: "Elephantine", strength: "Crushing grasp", weakness: "Silver" },
      { roll: 11, combatOffset: 0, quality: "Undead", strength: "Psychic blast", weakness: "Fire" },
      { roll: 12, combatOffset: 0, quality: "Crystalline", strength: "Stealthy", weakness: "Food" },
      { roll: 13, combatOffset: 0, quality: "Humanoid", strength: "Petrifying gaze", weakness: "Acid" },
      { roll: 14, combatOffset: 1, quality: "Angelic", strength: "1d12 damage", weakness: "Garlic" },
      { roll: 15, combatOffset: 1, quality: "Spectral", strength: "Impersonation", weakness: "Iron" },
      { roll: 16, combatOffset: 2, quality: "Stonecarved", strength: "Blinding aura", weakness: "Water" },
      { roll: 17, combatOffset: 2, quality: "Serpentine", strength: "Turns invisible", weakness: "Its True Name" },
      { roll: 18, combatOffset: 3, quality: "Elemental", strength: "2d6 damage", weakness: "Loud sounds" },
      { roll: 19, combatOffset: 3, quality: "Piscine", strength: "Swallows whole", weakness: "Holy water" },
      { roll: 20, combatOffset: 4, quality: "Reptilian", strength: "+2 attacks", weakness: "Music" },
    ];
  }
  return cachedMonsterGeneratorRows!;
}

export function generateMonsterVariant(
  baseMonster: EncounterMonster,
  partyLevel = 1,
  rng: RandomSource = systemRandom,
): EncounterMonster {
  const rows = loadMonsterGeneratorRows();
  const roll = rollDie(20, rng);
  const genRow = rows.find((r) => r.roll === roll) ?? rows[0];

  const scaledLevel = Math.max(1, partyLevel + genRow.combatOffset);
  const scaledAc = 10 + partyLevel;
  const scaledHp = Math.max(4, baseMonster.maxHp + genRow.combatOffset * 6);

  const variantName = `${genRow.quality} ${baseMonster.name}`;
  const addedTraits = [
    ...(baseMonster.traits ?? []),
    `Variant Quality: ${genRow.quality}`,
    `Strength: ${genRow.strength}`,
    `Weakness: ${genRow.weakness}`,
  ];

  return {
    ...baseMonster,
    name: variantName,
    level: scaledLevel,
    ac: scaledAc,
    maxHp: scaledHp,
    currentHp: scaledHp,
    traits: addedTraits,
    isVariant: true,
    variantQuality: genRow.quality,
    variantStrength: genRow.strength,
    variantWeakness: genRow.weakness,
  };
}

// -------------------------------------------------------------
// Class Talents & 1–36 Leveling Progression
// -------------------------------------------------------------

export function calculateLevelAdvancement(currentLevel: number, currentXp: number): {
  nextLevelXp: number;
  canLevelUp: boolean;
  maxLevel: boolean;
} {
  if (currentLevel >= 36) {
    return { nextLevelXp: 360, canLevelUp: false, maxLevel: true };
  }
  const nextLevelXp = currentLevel * 10;
  return {
    nextLevelXp,
    canLevelUp: currentXp >= nextLevelXp,
    maxLevel: false,
  };
}

export function rollClassTalent(
  className: string,
  rng: RandomSource = systemRandom,
): { roll: number; dice: number[]; effect: string } {
  const d1 = rollDie(6, rng);
  const d2 = rollDie(6, rng);
  const total = d1 + d2;

  const classDef = CLASSES.find((c) => c.name.toLowerCase() === className.toLowerCase());
  const talentTable = classDef?.talentTable ?? [
    { roll: "2", min: 2, max: 2, effect: "Gain Advantage on signature class action." },
    { roll: "3-6", min: 3, max: 6, effect: "+1 to attack or spell checks." },
    { roll: "7-9", min: 7, max: 9, effect: "+2 to highest ability score." },
    { roll: "10-11", min: 10, max: 11, effect: "+1 to damage rolls or spell slots." },
    { roll: "12", min: 12, max: 12, effect: "Choose any talent or gain +2 points to distribute." },
  ];

  const matched =
    talentTable.find((t) => total >= t.min && total <= t.max) ??
    talentTable[0];

  return {
    roll: total,
    dice: [d1, d2],
    effect: matched.effect,
  };
}

export function calculateCharacterHp(
  className: string,
  level: number,
  conModifier: number,
  highestStatModifier: number,
  previousHp?: number,
  rng: RandomSource = systemRandom,
): number {
  const classDef = CLASSES.find((c) => c.name.toLowerCase() === className.toLowerCase());
  const hitDie = classDef?.hitDie ?? 6;

  if (level <= 1) {
    const roll = rollDie(hitDie, rng);
    return Math.max(1, roll + conModifier);
  }

  // If previous HP is provided, calculate incremental HP
  if (previousHp !== undefined && previousHp > 0) {
    if (level <= 10) {
      // Levels 2..10: Roll hit die + CON mod (min 1)
      const roll = rollDie(hitDie, rng);
      return previousHp + Math.max(1, roll + conModifier);
    } else {
      // Levels 11..36: Flat +1 HP per level from grit progression + highestStatMod once at lvl 11
      const gritBonus = level === 11 ? Math.max(0, highestStatModifier) : 0;
      return previousHp + 1 + gritBonus;
    }
  }

  // Full calculation from level 1 to target level
  let totalHp = 0;
  const hdLevels = Math.min(level, 10);
  for (let l = 1; l <= hdLevels; l++) {
    totalHp += Math.max(1, rollDie(hitDie, rng) + conModifier);
  }

  if (level > 10) {
    const extraLevels = level - 10;
    // Flat +1 HP per level past 10 + highest stat modifier from grit
    totalHp += extraLevels + Math.max(0, highestStatModifier);
  }

  return totalHp;
}

export function levelUpCharacter(
  character: Character,
  rng: RandomSource = systemRandom,
): {
  character: Character;
  gainedHp: number;
  newTalent?: { roll: number; effect: string };
  log: string;
} {
  const newLevel = Math.min(36, character.level + 1);
  const conMod = abilityModifier(character.abilities.con);

  const highestScore = Math.max(
    character.abilities.str,
    character.abilities.dex,
    character.abilities.con,
    character.abilities.int,
    character.abilities.wis,
    character.abilities.cha,
  );
  const highestStatMod = abilityModifier(highestScore);

  const newMaxHp = calculateCharacterHp(
    character.className,
    newLevel,
    conMod,
    highestStatMod,
    character.maxHp,
    rng,
  );
  const gainedHp = newMaxHp - character.maxHp;

  // Odd level check: 1, 3, 5, 7, 9, 11, 13, 15, ..., 35
  const isOddLevel = newLevel % 2 === 1;
  let newTalent: { roll: number; effect: string } | undefined = undefined;
  const updatedTalents = [...(character.talents ?? [])];

  if (isOddLevel) {
    const rolled = rollClassTalent(character.className, rng);
    newTalent = { roll: rolled.roll, effect: rolled.effect };
    updatedTalents.push(`[Lvl ${newLevel}] ${rolled.effect}`);
  }

  const updatedCharacter: Character = {
    ...character,
    level: newLevel,
    xp: 0,
    maxHp: newMaxHp,
    hp: character.hp + gainedHp,
    talents: updatedTalents,
  };

  const log = `Level Up! ${character.name} reached Level ${newLevel}. HP increased by +${gainedHp} (Total HP: ${newMaxHp}).${
    newTalent ? ` Rolled Talent [${newTalent.roll}]: ${newTalent.effect}` : ""
  }`;

  return {
    character: updatedCharacter,
    gainedHp,
    newTalent,
    log,
  };
}

// -------------------------------------------------------------
// Equipment, AC, Attack & Spell Rules
// -------------------------------------------------------------

export function calculateDerivedAc(inventory: InventoryItem[] = [], dexMod = 0): {
  ac: number;
  hasStealthDisadvantage: boolean;
} {
  const equippedArmor = inventory.find(
    (i) => i.equipped && (i.kind === "armor" || i.baseAc !== undefined),
  );
  const equippedShield = inventory.find(
    (i) => i.equipped && (i.kind === "shield" || (i.acBonus !== undefined && i.acBonus > 0)),
  );

  let baseAc = 10 + dexMod;
  let hasStealthDisadvantage = false;

  if (equippedArmor) {
    const armorDef = ITEMS.find((it) => it.id === equippedArmor.itemId);
    const base = equippedArmor.baseAc ?? armorDef?.baseAc ?? 11;
    const maxDex = equippedArmor.maxDexMod ?? armorDef?.maxDexMod;
    const effectiveDex = maxDex !== undefined ? Math.min(dexMod, maxDex) : dexMod;
    baseAc = base + effectiveDex;

    const props = equippedArmor.properties ?? armorDef?.properties ?? [];
    if (props.includes("disadvantage_stealth")) {
      hasStealthDisadvantage = true;
    }
  }

  if (equippedShield) {
    const shieldDef = ITEMS.find((it) => it.id === equippedShield.itemId);
    const bonus = equippedShield.acBonus ?? shieldDef?.acBonus ?? 2;
    baseAc += bonus;
  }

  return { ac: baseAc, hasStealthDisadvantage };
}

export function calculateGearSlots(character: {
  className: string;
  abilities: { str: number; con: number };
}): number {
  const base = 10 + abilityModifier(character.abilities.str);
  const isFighter = character.className.toLowerCase() === "fighter";
  const haulerBonus = isFighter ? Math.max(0, abilityModifier(character.abilities.con)) : 0;
  return Math.max(1, base + haulerBonus);
}

export function calculateCarriedSlots(inventory: InventoryItem[] = []): number {
  return inventory.reduce((sum, item) => sum + (item.slots ?? 1) * (item.quantity ?? 1), 0);
}

export function calculateAttackBonus(
  character: {
    level: number;
    className: string;
    abilities: { str: number; dex: number };
    classChoices?: Record<string, any>;
  },
  weapon: InventoryItem,
  isMastered = false,
): { attackBonus: number; damageBonus: number; damageDie: string } {
  return weaponReference(character, weapon, isMastered);
}

export function calculateBackstabBonus(level: number): { diceCount: number; expression: string } {
  const diceCount = Math.max(1, Math.ceil(level / 2));
  return { diceCount, expression: `+${diceCount}d6` };
}

export function resolveSpellCast(
  character: {
    className: string;
    abilities: { int: number; wis: number };
  },
  spell: { tier: number; sphere?: string },
  roll: number,
  rng: RandomSource = systemRandom,
): {
  success: boolean;
  roll: number;
  total: number;
  dc: number;
  isNat1: boolean;
  isNat20: boolean;
  mishap?: string;
  penanceRequired?: boolean;
} {
  const isArcane =
    spell.sphere === "arcane" ||
    character.className.toLowerCase() === "wizard" ||
    character.className.toLowerCase() === "sage";
  const abilityMod = isArcane
    ? abilityModifier(character.abilities.int)
    : abilityModifier(character.abilities.wis);

  const dc = 10 + spell.tier;
  const total = roll + abilityMod;
  const isNat1 = roll === 1;
  const isNat20 = roll === 20;
  const success = isNat20 || (!isNat1 && total >= dc);

  let mishap: string | undefined = undefined;
  let penanceRequired = false;

  if (isNat1) {
    if (isArcane) {
      const mishapRoll = rollDie(8, rng);
      mishap = ARCANE_MISHAPS[mishapRoll - 1];
    } else {
      penanceRequired = true;
    }
  }

  return {
    success,
    roll,
    total,
    dc,
    isNat1,
    isNat20,
    mishap,
    penanceRequired,
  };
}

export function resolveInitiativeRoll(
  dexMod: number,
  rng: RandomSource = systemRandom,
): { roll: number; total: number } {
  const roll = rollDie(20, rng);
  return { roll, total: roll + dexMod };
}

export function generateTreasureReward(
  tier = 1,
  rng: RandomSource = systemRandom,
): {
  coins: { gp: number; sp: number };
  items: string[];
} {
  const gp = rollDie(6, rng) * 10 + rollDie(6, rng) * 5 * tier;
  const sp = rollDie(6, rng) * 5;
  const items: string[] = [];
  if (rollDie(6, rng) >= 4) {
    items.push(tier >= 2 ? "healing_salve" : "holy_water");
  }
  return {
    coins: { gp, sp },
    items,
  };
}

export function computeHpStatus(
  currentHp: number,
  maxHp: number,
): "unharmed" | "injured" | "bloodied" | "near_death" | "defeated" {
  if (currentHp <= 0) return "defeated";
  if (maxHp <= 0) return "unharmed";
  const ratio = currentHp / maxHp;
  if (ratio < 0.2) return "near_death";
  if (ratio < 0.5) return "bloodied";
  if (currentHp < maxHp) return "injured";
  return "unharmed";
}

export function getMonsterAcHint(ac: number): string {
  if (ac >= 17) return "Plate armor or heavy scales";
  if (ac >= 15) return "Mail hauberk or dense hide";
  if (ac >= 13) return "Tough hide or supple leather";
  if (ac >= 11) return "Light furs or worn padding";
  return "Unarmored and exposed";
}

