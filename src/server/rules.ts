import { randomInt } from "node:crypto";

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
