import { randomInt } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { CLASSES } from "../shared/content.js";
import type { Character, EncounterMonster } from "../shared/types.js";

export type RandomSource = (maxExclusive: number) => number;
const systemRandom: RandomSource = (max) => randomInt(max);

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
