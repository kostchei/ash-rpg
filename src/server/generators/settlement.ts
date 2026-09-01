import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { rollDie, type RandomSource } from "../rules.js";
import type { SettlementResult } from "../../shared/types.js";

interface SettlementOracleData {
  scales: Array<{
    roll: number;
    max?: number;
    name: string;
    population: string;
    defense: string;
    services: string;
  }>;
  tavernPrefixes: string[];
  tavernSuffixes: string[];
  tavernVibes: string[];
  rumors: Array<{
    roll: number;
    rumor: string;
    authenticity: string;
  }>;
}

let cachedData: SettlementOracleData | null = null;

function loadSettlementData(): SettlementOracleData {
  if (cachedData) return cachedData;
  const path = resolve("data/oracles/settlement.json");
  if (existsSync(path)) {
    cachedData = JSON.parse(readFileSync(path, "utf-8"));
  } else {
    cachedData = {
      scales: [
        {
          roll: 1,
          name: "Isolated Outpost",
          population: "20–50",
          defense: "Wooden palisade; Veteran Sergeant",
          services: "Basic rations, torches, smithy repairs",
        },
        {
          roll: 2,
          max: 3,
          name: "Frontier Village",
          population: "100–300",
          defense: "Militia watch; Village Elder / Bailiff",
          services: "General goods, herbalist, local tavern",
        },
        {
          roll: 4,
          max: 5,
          name: "Fortified Town",
          population: "500–2,000",
          defense: "Stone walls; Town Magistrate & Guard",
          services: "Masterwork smith, temples, alchemy lab",
        },
        {
          roll: 6,
          name: "Baronial City",
          population: "3,000–10,000",
          defense: "Heavy garrison, High Chancellor",
          services: "Arcane academy, grand markets, banks",
        },
      ],
      tavernPrefixes: ["The Drunken", "The Rusty", "The Blind", "The Golden", "The Silver", "The Black", "The Wandering", "The Weeping", "The Ashen", "The Jovial"],
      tavernSuffixes: ["Boar", "Anchor", "Maiden", "Griffin", "Tankard", "Anvil", "Wyvern", "Willow", "Crown", "Kobold"],
      tavernVibes: [
        "Rowdy miners, brawls on 1–2 on 1d6, cheap ale",
        "Salt-crusted fishermen, smell of brine, low whispers",
        "Candlelit hearth, somber lute player, veiled patrons",
        "Wealthy merchants, velvet curtains, armed bodyguards",
        "Adventurers gathered, bounty board posted by hearth",
        "Dwarven smiths drinking heavy stout, iron clanging",
        "Exotic monster trophies on walls, spice-infused stew",
        "Melancholic locals, herbal tea, strange ghost stories",
        "Shady underworld informants, secret gambling cellar",
        "Raucous laughter, dice games, surprisingly good roasted mutton",
      ],
      rumors: [
        { roll: 1, rumor: "A goblin warband dug into an ancient barrow 2 hexes north and found an unhallowed iron gate.", authenticity: "True: Barrow Crypt." },
        { roll: 2, rumor: "The water in Whispering Delta is tasting of black bile; fishermen saw tentacles beneath the fog.", authenticity: "True: Abyssal presence." },
        { roll: 3, rumor: "An eccentric gnome tinkerer in Glimmercap is offering 50 gp for 2 intact giant spider venom sacs.", authenticity: "Opportunity: Alchemical bounty." },
        { roll: 4, rumor: "The local bailiff is accepting bribes from the Whispering Shadow syndicate to look away from caravans.", authenticity: "Faction hook: Guard corruption." },
        { roll: 5, rumor: "Smugglers found a secret chasm entrance leading 3 miles down into sunless subterranean rivers.", authenticity: "True: Underdark karst entrance." },
        { roll: 6, rumor: "A fallen star struck the Obsidian Crags; glowing glass crystals were brought back by a shepherd.", authenticity: "True: Planar anomaly." },
        { roll: 7, rumor: "A phantom stag was spotted in the Elderwood with silver antlers that cure all mortal diseases.", authenticity: "Myth / Half-True: Primal guardian." },
        { roll: 8, rumor: "The graveyard priest has not opened the chapel doors in 3 days; chanting heard beneath the floorboards.", authenticity: "Immediate Danger: Necrotic cult." },
      ],
    };
  }
  return cachedData!;
}

export function generateSettlement(rng?: RandomSource): SettlementResult {
  const data = loadSettlementData();

  // 1d6 for scale
  const scaleRoll = rollDie(6, rng);
  const matchedScale = data.scales.find((s) => (s.max ? scaleRoll >= s.roll && scaleRoll <= s.max : scaleRoll === s.roll)) ?? data.scales[0];

  // Tavern name: prefix (1d10) + suffix (1d10), vibe (1d10)
  const prefixRoll = rollDie(data.tavernPrefixes.length, rng);
  const suffixRoll = rollDie(data.tavernSuffixes.length, rng);
  const vibeRoll = rollDie(data.tavernVibes.length, rng);

  const tavernName = `${data.tavernPrefixes[prefixRoll - 1]} ${data.tavernSuffixes[suffixRoll - 1]}`;
  const tavernVibe = data.tavernVibes[vibeRoll - 1];

  // Rumor (1d8)
  const rumorRoll = rollDie(data.rumors.length, rng);
  const matchedRumor = data.rumors[rumorRoll - 1] ?? data.rumors[0];

  return {
    scale: {
      name: matchedScale.name,
      population: matchedScale.population,
      defense: matchedScale.defense,
      services: matchedScale.services,
    },
    tavern: {
      name: tavernName,
      vibe: tavernVibe,
    },
    rumor: {
      rumor: matchedRumor.rumor,
      authenticity: matchedRumor.authenticity,
    },
  };
}
