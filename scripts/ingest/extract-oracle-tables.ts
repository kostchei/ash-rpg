import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

export function generateSettlementTables() {
  return {
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
    tavernPrefixes: [
      "The Drunken",
      "The Rusty",
      "The Blind",
      "The Golden",
      "The Silver",
      "The Black",
      "The Wandering",
      "The Weeping",
      "The Ashen",
      "The Jovial",
    ],
    tavernSuffixes: [
      "Boar",
      "Anchor",
      "Maiden",
      "Griffin",
      "Tankard",
      "Anvil",
      "Wyvern",
      "Willow",
      "Crown",
      "Kobold",
    ],
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
      {
        roll: 1,
        rumor: "A goblin warband dug into an ancient barrow 2 hexes north and found an unhallowed iron gate.",
        authenticity: "True: Barrow crypt discovered.",
      },
      {
        roll: 2,
        rumor: "The water in Whispering Delta is tasting of black bile; fishermen saw tentacles beneath the fog.",
        authenticity: "True: Abyssal presence in delta.",
      },
      {
        roll: 3,
        rumor: "An eccentric gnome tinkerer in Glimmercap is offering 50 gp for 2 intact giant spider venom sacs.",
        authenticity: "Opportunity: Alchemical bounty.",
      },
      {
        roll: 4,
        rumor: "The local bailiff is accepting bribes from the Whispering Shadow syndicate to look away from caravans.",
        authenticity: "Faction hook: Guard corruption.",
      },
      {
        roll: 5,
        rumor: "Smugglers found a secret chasm entrance leading 3 miles down into sunless subterranean rivers.",
        authenticity: "True: Karst cavern entrance.",
      },
      {
        roll: 6,
        rumor: "A fallen star struck the Obsidian Crags; glowing glass crystals were brought back by a shepherd.",
        authenticity: "True: Planar anomaly.",
      },
      {
        roll: 7,
        rumor: "A phantom stag was spotted in the Elderwood with silver antlers that cure all mortal diseases.",
        authenticity: "Myth / Half-True: Primal guardian.",
      },
      {
        roll: 8,
        rumor: "The graveyard priest has not opened the chapel doors in 3 days; chanting heard beneath the floorboards.",
        authenticity: "Immediate Danger: Necrotic ritual.",
      },
    ],
  };
}

export function generateNpcTables() {
  return {
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
      oakhaven_borderlands: {
        Fighter: ["Fighter", "Ranger"],
        Thief: ["Thief", "Delver"],
        Priest: ["Priest", "Druid"],
        Wizard: ["Wizard", "Sage", "Alchemist"],
      },
    },
  };
}

export function generateCampaignTables() {
  return {
    shapes: [
      { shape: "countdown", description: "Fixed time or steps remaining before an inevitable occurrence." },
      { shape: "pursuit", description: "Distance between hunters and prey with gains and losses." },
      { shape: "race", description: "Multiple factions competing to achieve a milestone first." },
      { shape: "heat", description: "Escalating attention from law enforcement or syndicate syndicates." },
      { shape: "spread", description: "Geographic or contagion infection moving outward." },
      { shape: "mystery", description: "Clues accumulated toward uncovering a mastermind or hidden truth." },
      { shape: "opportunity", description: "A fleeting window of fortune closing as actions are taken." },
      { shape: "ladder", description: "Political hierarchy, reputation tiers, or faction standing." },
    ],
    complications: [
      "A supply line is severed by roving marauders.",
      "An unexpected weather anomaly delays travel by 1 day.",
      "A rival adventuring company arrives seeking the same bounty.",
      "A trusted merchant reveals they have been blackmailed by local syndicates.",
      "A planar tremor destabilizes arcane wards across the region.",
      "A dormant disease spreads from harvested monster carcases.",
      "A local faction leader is replaced by a shadowy impostor.",
      "A hidden dungeon collapse exposes an unmapped deeper level.",
    ],
  };
}

export function runOracleExtraction() {
  const outDir = resolve("data/oracles");
  mkdirSync(outDir, { recursive: true });

  const settlement = generateSettlementTables();
  const npc = generateNpcTables();
  const campaign = generateCampaignTables();

  writeFileSync(resolve(outDir, "settlement.json"), JSON.stringify(settlement, null, 2), "utf-8");
  writeFileSync(resolve(outDir, "npc.json"), JSON.stringify(npc, null, 2), "utf-8");
  writeFileSync(resolve(outDir, "campaign.json"), JSON.stringify(campaign, null, 2), "utf-8");

  console.log("Saved oracle tables to data/oracles/{settlement,npc,campaign}.json");
}

if (process.argv[1]?.endsWith("extract-oracle-tables.ts")) {
  runOracleExtraction();
}
