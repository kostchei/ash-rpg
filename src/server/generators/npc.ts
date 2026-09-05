import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { rollDie, type RandomSource } from "../rules.js";
import type { Character, NpcResult } from "../../shared/types.js";

interface NpcOracleData {
  wildcardAncestries: Array<{
    min: number;
    max: number;
    ancestry: string;
    category: string;
  }>;
  demeanors: Array<{
    roll: number;
    demeanor: string;
    quirk: string;
  }>;
  motives: Array<{
    roll: number;
    motive: string;
    interaction: string;
  }>;
  zoneSubclasses: Record<string, Record<string, string[]>>;
}

let cachedNpcData: NpcOracleData | null = null;

function loadNpcData(): NpcOracleData {
  if (cachedNpcData) return cachedNpcData;
  const path = resolve("data/oracles/npc.json");
  if (existsSync(path)) {
    cachedNpcData = JSON.parse(readFileSync(path, "utf-8"));
  } else {
    cachedNpcData = {
      wildcardAncestries: [
        { min: 1, max: 3, ancestry: "Human", category: "Common" },
        { min: 4, max: 5, ancestry: "Dwarf", category: "Common" },
        { min: 6, max: 7, ancestry: "High Elf", category: "Common" },
        { min: 8, max: 9, ancestry: "Halfling", category: "Common" },
        { min: 10, max: 10, ancestry: "Wood Elf", category: "Wild & Primal" },
        { min: 11, max: 11, ancestry: "Forest Gnome", category: "Wild & Primal" },
        { min: 12, max: 12, ancestry: "Lizardman", category: "Wild & Primal" },
        { min: 13, max: 13, ancestry: "Orc", category: "Wild & Primal" },
        { min: 14, max: 14, ancestry: "Half-Ogre", category: "Wild & Primal" },
        { min: 15, max: 15, ancestry: "Deep Gnome", category: "Underdark" },
        { min: 16, max: 16, ancestry: "Drow", category: "Underdark" },
        { min: 17, max: 17, ancestry: "Kuo-Toa", category: "Underdark" },
        { min: 18, max: 18, ancestry: "Derro", category: "Underdark" },
        { min: 19, max: 19, ancestry: "Quaggoth", category: "Underdark" },
        { min: 20, max: 20, ancestry: "Myconid", category: "Underdark" },
      ],
      demeanors: [
        { roll: 1, demeanor: "Paranoid & Watchful", quirk: "Constantly glances behind doors; fingers weapon hilt." },
        { roll: 2, demeanor: "Boastful & Loud", quirk: "Boasts of monster kills; wears a predator fang necklace." },
        { roll: 3, demeanor: "Melancholic & Soft-spoken", quirk: "Sighs deeply between words; gazes into candlelight." },
        { roll: 4, demeanor: "Mercenary & Transactional", quirk: "Counts coins while talking; assesses your gear value." },
        { roll: 5, demeanor: "Zealous & Devout", quirk: "Quotes holy proverbs; marks prayer symbols on armor." },
        { roll: 6, demeanor: "Jovial & Inquisitive", quirk: "Laughs heartily; buys the table a round of bitter ale." },
        { roll: 7, demeanor: "Stoic & Laconic", quirk: "Speaks only in 2–3 word sentences; unfazed by threats." },
        { roll: 8, demeanor: "Shifty & Whispering", quirk: "Speaks in hurried hushed tones; avoids direct eye contact." },
        { roll: 9, demeanor: "Scholarly & Analytical", quirk: "Inspects weird artifacts, monster scales, and runic carvings." },
        { roll: 10, demeanor: "Proud & Chivalrous", quirk: "Offers formal salutes; will not tolerate dishonor." },
        { roll: 11, demeanor: "Superstitious", quirk: "Spits over left shoulder; carries dried charms and garlic." },
        { roll: 12, demeanor: "Weary & Battle-Hardened", quirk: "Covered in burn scars; resting before their next contract." },
      ],
      motives: [
        { roll: 1, motive: "Seeking Hire", interaction: "Looking to join an expedition as a retainer (Daily Wage)." },
        { roll: 2, motive: "Hunting a Nemesis", interaction: "Tracking an outlaw, monster, or rival who fled into the wilds." },
        { roll: 3, motive: "Escaping a Debt", interaction: "In hiding from a syndicate collector or bounty hunter." },
        { roll: 4, motive: "Caravan Escort", interaction: "Guiding an exotic trade cart to the next frontier enclave." },
        { roll: 5, motive: "Lost Heirloom", interaction: "Searching a nearby dungeon hex for a family relic." },
        { roll: 6, motive: "Spiritual Pilgrimage", interaction: "Traveling to a holy shrine or megalith to lift a curse." },
        { roll: 7, motive: "Selling Rare Salvage", interaction: "Carrying monster reagents or ancient scrolls to market." },
        { roll: 8, motive: "Undercover Informant", interaction: "Secretly spying for a regional faction or baron." },
        { roll: 9, motive: "Wounded Survivor", interaction: "Sole survivor of a wiped-out adventuring party." },
        { roll: 10, motive: "Challenging Champions", interaction: "Seeking honorable single combat to prove their prowess." },
        { roll: 11, motive: "Seeking Strange Reagents", interaction: "Needs 2 fresh monster venom glands or rare herbs." },
        { roll: 12, motive: "Carrying Dire Warning", interaction: "An invading warband or cataclysm is 2 days away." },
      ],
      zoneSubclasses: {
        the_gloaming: {
          Fighter: ["Fighter"],
          Wizard: ["Warlock", "Witch"],
          Priest: ["Knight of St. Ydris", "Priest"],
          Thief: ["Thief"],
        },
        red_sands: {
          Fighter: ["Pit Fighter", "Desert Rider"],
          Thief: ["Ras-Godai", "Monk"],
          Wizard: ["Wizard", "Alchemist"],
          Priest: ["Priest"],
        },
        midnight_sun: {
          Fighter: ["Sea Wolf"],
          Priest: ["Seer"],
          Wizard: ["Wizard"],
          Thief: ["Thief"],
        },
        river_of_night: {
          Fighter: ["Basilisk Warrior", "Ranger"],
          Priest: ["Green Knight", "Druid"],
          Wizard: ["Wizard"],
          Thief: ["Thief"],
        },
        dwellers_in_the_deep: {
          Thief: ["Delver"],
          Fighter: ["Fighter"],
          Priest: ["Priest"],
          Wizard: ["Sage", "Wizard"],
        },
        city_of_masks: {
          Fighter: ["Duelist", "Fighter"],
          Priest: ["Bard", "Priest"],
          Wizard: ["Sage", "Wizard"],
          Thief: ["Thief"],
        },
      },
    };
  }
  return cachedNpcData!;
}

export function generateNpc(
  activeParty: Character[] = [],
  zoneId = "the_gloaming",
  rng?: RandomSource,
): NpcResult {
  const data = loadNpcData();

  // 1. Ancestry
  const ancestryWildcardCheck = rollDie(100, rng);
  const isWildcardAncestry = ancestryWildcardCheck <= 10;
  let ancestry = "Human";

  if (isWildcardAncestry) {
    const roll = rollDie(20, rng);
    const match = data.wildcardAncestries.find((a) => roll >= a.min && roll <= a.max);
    ancestry = match ? match.ancestry : "Human";
  } else {
    // Weighted party skew
    const weights: Record<string, number> = {
      Human: 2,
      Dwarf: 1,
      "High Elf": 1,
      Halfling: 1,
    };
    for (const char of activeParty) {
      weights[char.ancestry] = (weights[char.ancestry] ?? 0) + 1;
    }
    const pool: string[] = [];
    for (const [anc, weight] of Object.entries(weights)) {
      for (let i = 0; i < weight; i++) pool.push(anc);
    }
    const idx = rollDie(pool.length, rng) - 1;
    ancestry = pool[idx] ?? "Human";
  }

  // 2. Class Archetype
  const classWildcardCheck = rollDie(100, rng);
  const isWildcardClass = classWildcardCheck <= 10;
  let baseArchetype = "Fighter";

  const coreClasses = ["Fighter", "Thief", "Priest", "Wizard"];
  const classWeights: Record<string, number> = {
    Fighter: 1,
    Thief: 1,
    Priest: 1,
    Wizard: 1,
  };
  for (const char of activeParty) {
    if (classWeights[char.className] !== undefined) {
      classWeights[char.className] += 1;
    }
  }
  const classPool: string[] = [];
  for (const [cls, weight] of Object.entries(classWeights)) {
    for (let i = 0; i < weight; i++) classPool.push(cls);
  }
  const cIdx = rollDie(classPool.length, rng) - 1;
  baseArchetype = classPool[cIdx] ?? "Fighter";

  // 3. Zone Subclass
  const zoneMap = data.zoneSubclasses[zoneId] ?? data.zoneSubclasses["the_gloaming"] ?? {};
  const subclassOptions = zoneMap[baseArchetype] ?? [baseArchetype];
  const subIdx = subclassOptions.length > 1 ? rollDie(subclassOptions.length, rng) - 1 : 0;
  const resolvedClass = isWildcardClass ? "Specialist Adventurer" : (subclassOptions[subIdx] ?? baseArchetype);

  // 4. Demeanor & Quirk (1d12)
  const dRoll = rollDie(data.demeanors.length, rng);
  const demeanor = data.demeanors[dRoll - 1] ?? data.demeanors[0];

  // 5. Motive (1d12)
  const mRoll = rollDie(data.motives.length, rng);
  const motive = data.motives[mRoll - 1] ?? data.motives[0];

  // 6. Retainer Stats
  const level = rollDie(3, rng);
  const hitDie = baseArchetype === "Fighter" ? 8 : baseArchetype === "Wizard" ? 4 : 6;
  const hp = rollDie(hitDie, rng) + Math.max(0, level - 1) * 3;
  const morale = 7 + level;
  const dailyWage =
    baseArchetype === "Wizard" || baseArchetype === "Priest"
      ? "10–20 gp/day + 1 salvage share"
      : "2–5 gp/day";

  return {
    ancestry,
    isWildcardAncestry,
    className: resolvedClass,
    isWildcardClass,
    zoneSubclass: resolvedClass !== baseArchetype ? resolvedClass : undefined,
    demeanor: demeanor.demeanor,
    quirk: demeanor.quirk,
    motive: motive.motive,
    interaction: motive.interaction,
    retainerStats: {
      level,
      hp,
      morale,
      dailyWage,
    },
  };
}
