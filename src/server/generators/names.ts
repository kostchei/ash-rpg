import type { CursedZoneId } from "../../shared/types.js";
import { rollDie, type RandomSource } from "../rules.js";

/**
 * Authentic name generation tables extracted from:
 * 1. Shadowdark RPG Core Rules (pg. 128-143):
 *    - Settlement Name Table (pg. 137): Villages, Towns, Cities
 *    - Tavern Generator Table (pg. 140): Part 1, Part 2, Known For
 *    - Points of Interest & Developments (pg. 137)
 *    - NPC Names by Syllable (pg. 129)
 * 2. Cursed Scroll Zines 1-6 (The 6 Canonical Zones):
 *    - CS1: The Gloaming (Marin's Hold, Wardenwood, Greywall Priory, The Crayfish Tavern)
 *    - CS2: Red Sands / The Djurum (Alkesh, Shar Oasis, Magani, The Golden Scorpion)
 *    - CS3: Midnight Sun / Isles of Andrik (Valthis, Dvergheim, Skargat, The Whalebone Hall)
 *    - CS4: River of Night / The Black River (Tecuhan, Utzimatu, Kurimbu, The Riverman's Perch)
 *    - CS5: Dwellers in the Deep / Morzomotha (Maugrinhold, Grizzengast, The Deep Siphon Tap)
 *    - CS6: City of Masks / Meridia (The Rooks, High Harbor, Canal Basin, The Mask & Dagger)
 */

// --- SHADOWDARK CORE TABLES (pg. 137) ---
export const CORE_VILLAGE_NAMES = [
  "Bruga's Hold",
  "Lastwatch",
  "Darkwater",
  "Ostlin",
  "Treefall",
  "Vorn",
  "Hillshire",
  "Nighthaven",
] as const;

export const CORE_TOWN_NAMES = [
  "Fairhollow",
  "Ivan's Keep",
  "Galina",
  "Brightlantern",
  "Corvin's Crest",
  "Ironbridge",
  "Skalvin",
  "Toresk",
] as const;

export const CORE_CITY_NAMES = [
  "Doraine",
  "Meridia",
  "King's Gate",
  "Myrkhos",
  "Rularn",
  "Ordos",
  "Thane",
  "Rahgbat",
] as const;

// --- TAVERN GENERATOR (pg. 140) ---
export const TAVERN_NAME_PARTS_1 = [
  "The Crimson",
  "The Dancing",
  "The Dog &",
  "The Rusty",
  "The Demon's",
  "The Singing",
  "The Boar &",
  "The Silver",
  "The Filthy",
  "The Captain's",
  "The Jolly",
  "The Wise",
  "Cloak &",
  "The Royal",
  "The Gilded",
  "The Blade &",
  "The Drunken",
  "Cup &",
  "The Jeweled",
  "The Frog &",
] as const;

export const TAVERN_NAME_PARTS_2 = [
  "Rat",
  "Wench",
  "Lantern",
  "Eel",
  "Goblet",
  "Trident",
  "Candle",
  "Dagger",
  "Wheel",
  "Pig",
  "Snake",
  "Camel",
  "Dragon",
  "Axe",
  "Bell",
  "Tankard",
  "Shield",
  "Blade",
  "Anvil",
  "Bard",
] as const;

export const TAVERN_KNOWN_FOR = [
  "High-stakes gambling in a back room",
  "Illicit poisons sold under the counter",
  "Secret gathering place for renegade wizards",
  "Dark cult rituals rumored in the cellar",
  "Exotic roasted meats and imported wines",
  "Lively fiddle music and dancing contests",
  "Violent tavern brawls every midnight",
  "Ancient sealed tunnels concealed beneath the floorboards",
  "Desperate sellswords and thugs for hire",
  "Thieves' Guild informants watching every patron",
  "Deep hostility toward magic and spellcasters",
  "Town watch and patrol guards resting their boots",
  "Underground illegal pit fighting",
  "Famous wandering bards trading songs for ale",
  "Treasonous conspirators plotting against the rulers",
  "Strict peace enforced with all weapons tied at the door",
  "Suspicious glares and hostility toward outsiders",
  "Bizarre taxidermy and strange monster trophies",
  "Smugglers and river pirates trading stolen cargoes",
  "Raucous drinking contests with cask wagers",
] as const;

// --- CANONICAL HAVENS & ICONIC TAVERNS FOR THE 6 ZONES ---
export const ZONE_HAVEN_DEFINITIONS: Record<
  CursedZoneId,
  {
    name: string;
    biome: string;
    landmark: string;
    description: string;
    tavernName: string;
    tavernKnownFor: string;
    authorityFigure: string;
  }
> = {
  the_gloaming: {
    name: "Marin's Hold",
    biome: "River Confluence Motte",
    landmark: "Motte-and-bailey Keep, Timber Palisade, The Crayfish Tavern, River Docks",
    description:
      "A fortified fisherfolk settlement of 300 souls where the river meets the mist bog, governed by Reeve Tarley Winters atop a palisaded hill.",
    tavernName: "The Crayfish Tavern",
    tavernKnownFor: "Smoky peat fires, gossip on the latest witchcraft accusations, and spiced flailfish stew.",
    authorityFigure: "Reeve Tarley Winters",
  },
  red_sands: {
    name: "Alkesh",
    biome: "Sunstone Oasis",
    landmark: "Artesian Cistern Basin, Adobe High Watchtower, Camel Exchange, The Golden Scorpion",
    description:
      "A bustling mudbrick desert hub walled against dust devils, where salt traders, caravan masters, and desert pilgrims water their beasts.",
    tavernName: "The Golden Scorpion",
    tavernKnownFor: "Cool mint water, smuggled salt cakes, and hushed negotiations over buried tomb maps.",
    authorityFigure: "Pasha's Qadi Al-Mansur",
  },
  midnight_sun: {
    name: "Valthis",
    biome: "Sheltered Bay Harbor",
    landmark: "Great Turf Longhouse, Slipway Docks, Runestone Beacon, The Whalebone Hall",
    description:
      "A hardy coastal haven ringed by smoking cod racks and carved dragon prows, sheltered from arctic squalls beneath towering basalt cliffs.",
    tavernName: "The Whalebone Hall",
    tavernKnownFor: "Roaring peat hearths, skaldic recitations of ancient sea-wolf kings, and potent fermented mead.",
    authorityFigure: "Jarl Sigbrand Iron-Hand",
  },
  river_of_night: {
    name: "Tecuhan",
    biome: "Elevated River Bluff",
    landmark: "Palisaded Canoe Slips, Thatched Council Terrace, Serpentine Totem, The Riverman's Perch",
    description:
      "An elevated river village built atop ancient stone terraces safe from jungle floodwaters, trading obsidian and bird plumes with river skiffs.",
    tavernName: "The Riverman's Perch",
    tavernKnownFor: "Potent jungle snake-wine, smoked river eel, and wary whispers of viperian raiding parties.",
    authorityFigure: "Chief Matlal of the Itzalca",
  },
  dwellers_in_the_deep: {
    name: "Maugrinhold",
    biome: "Granite Underworld Bastion",
    landmark: "Surface Hoist Winch, Phosphor Lantern Arch, Iron Tramway, The Deep Siphon Tap",
    description:
      "A deep dwarven outpost carved directly into cavern rock below the surface sinkhole, guarding the upper iron hoists against abyss terrors.",
    tavernName: "The Deep Siphon Tap",
    tavernKnownFor: "Black mushroom stout, sizzling cave-grub skewers, and stonecarver clan disputes.",
    authorityFigure: "Thane Durgan Stone-Marrow",
  },
  city_of_masks: {
    name: "Meridia (The Rooks)",
    biome: "Canal District Hub",
    landmark: "Gondola Mooring Wharves, Masked Plaza, Clockwork Canal Siphon, The Mask & Dagger",
    description:
      "The bustling artisan and market district of the City of Masks, crowded with masked merchants, canal barges, and shadowy gondoliers.",
    tavernName: "The Mask & Dagger",
    tavernKnownFor: "High-stakes masked card games, imported spiced brandy, and cloaked guild couriers.",
    authorityFigure: "Magistrate Lorenza of the Canal Guard",
  },
};

// --- ZONE-SPECIFIC REGIONAL SETTLEMENT & LANDMARK WORDBANKS ---
export const ZONE_SETTLEMENT_WORDBANKS: Record<
  CursedZoneId,
  {
    settlementPrefixes: string[];
    settlementSuffixes: string[];
    landmarks: string[];
    shrineDeities: string[];
    ruinDescriptors: string[];
  }
> = {
  the_gloaming: {
    settlementPrefixes: ["Warden", "Grey", "Finimere", "Bitter", "Black", "Myre", "Ydris", "Marsh", "Barrow", "Stilt"],
    settlementSuffixes: ["wood", "wall", "hold", "steading", "crossing", "haven", "village", "hollow", "fen", "redoubt"],
    landmarks: [
      "Sunken Siphon Arch & Ruined Crypt",
      "Gallows Tree Crossroads & Warding Cairn",
      "Marrow-Wood Henge & Standing Menhirs",
      "Rotting Boardwalk & Peat Bog Wharf",
      "Shattered Ivory Tower of Haldrin",
      "Whispering Willow Copse",
      "Black Peat Quagmire & Dead Willows",
      "Stone Marker Obelisk of St. Ydris",
    ],
    shrineDeities: ["Knights of St. Ydris", "Madeera the Covenant", "Saint Terragnis", "Cyrinia Mother of the Circle"],
    ruinDescriptors: ["Bittermold Keep", "Myre Castle", "Old Gloaming Vaults", "Fallen Barrow Mounds"],
  },
  red_sands: {
    settlementPrefixes: ["Shar", "Magani", "Siruul", "Hamad", "Salt", "Qasr", "Djurum", "Sun", "Canyon", "Kestrel"],
    settlementSuffixes: ["Oasis", "Post", "Camp", "Springs", "Gate", "Crossing", "Well", "Tower", "Bazaar", "Hold"],
    landmarks: [
      "Colossal Bleached Dragon Ribs in Sand",
      "Canyon Maze & Painted Petroglyphs",
      "Tower of the Sunstone Hermit",
      "Petrified Acacia Grove & Dry Wash",
      "Ancient Sandstone Cistern & Wind Catchers",
      "Ring of Vitrified Glass Men",
      "Howling Caves of the Djurum",
      "Salt Flats & Miraged Lake Bed",
    ],
    shrineDeities: ["The Sun God Horus", "The Sand-Father", "Ord of the Iron Anvil", "Pasha Jefar's Shrine"],
    ruinDescriptors: ["Buried Sandstone Pyramid", "The Iron Fortress", "Saltstone Citadel", "Sunken Tomb of Kings"],
  },
  midnight_sun: {
    settlementPrefixes: ["Dverg", "Skarg", "Rolug", "Gand", "Fjord", "Sunder", "Hildis", "Frost", "Bear", "Raven"],
    settlementSuffixes: ["heim", "at", "landing", "runne", "watch", "vik", "sound", "haven", "stead", "torp"],
    landmarks: [
      "Runestone Circle on Basalt Headland",
      "Sea Dragon Whirlpool Lookout",
      "Whalebone Arch & Smoked Fish Racks",
      "Glacial Ice Cave & Frozen Falls",
      "Carved Totem Pole of the Bear-Folk",
      "Smoking Geyser Field & Sulfur Pools",
      "Drakenfjell Sentry Bluff",
      "Doorway to Alfheim Monolith",
    ],
    shrineDeities: ["Odin the Wanderer", "The Norn of the Waves", "Gorr the Wolf-Father", "Freya of the Golden Boar"],
    ruinDescriptors: ["Drakenfjell Longhouse", "Sunken Dverg Stronghold", "Tomb of King Skorgald", "Old Skald Sanctuary"],
  },
  river_of_night: {
    settlementPrefixes: ["Utzi", "Kurim", "Tiw", "Istr", "Bibol", "Tepoz", "Mivvin", "Zuch", "Oat", "Serpent"],
    settlementSuffixes: ["matu", "bu", "ara", "il", "ga", "landing", "rest", "otl", "portage", "terrace"],
    landmarks: [
      "Overgrown Basalt Stepped Terrace",
      "Obsidian Serpent Head Monolith",
      "Flooded Limestone Cenote & Canopy Roots",
      "Stilt Fishing Platforms & Net Racks",
      "Giant Hollow Log River Siphon",
      "Tangled Mangrove Choke & Driftwood Dam",
      "Carved Idol of the Sunken Jaguar",
      "Star Map Eclipse Dial of Tsibalba",
    ],
    shrineDeities: ["Quetzalcoatl the Feathered", "Oatali of the River", "The Basilisk God", "The Morning Star"],
    ruinDescriptors: ["Black Ziggurat of Tsibalba", "Viperian Citadel", "Flooded Sun Temple", "Old Istril Siphon Vault"],
  },
  dwellers_in_the_deep: {
    settlementPrefixes: ["Maugr", "Grizzen", "Wend", "Siphon", "Chasm", "Ralk", "Abyss", "Deep", "Leng", "Moth"],
    settlementSuffixes: ["hold", "ghast", "els", "gate", "chimney", "delve", "cavern", "siphon", "vault", "depths"],
    landmarks: [
      "Yawning Karst Pit & Ancient Chain Hoist",
      "Phosphorescent Fungus Cavern & Stalagmites",
      "Subterranean Chasm & Basalt High-Bridge",
      "Bubbling Black Mud Springs & Steam Vents",
      "Echoing Siphon Waterfall into the Abyss",
      "Ancient Duergar Tramway Rails",
      "Library of Leng Windowless Spire",
      "Offering Statues of the Blind Oracle",
    ],
    shrineDeities: ["The Blind Oracle", "The Stone-Mother", "Librarians of Leng", "Ord the Hammer"],
    ruinDescriptors: ["Sunken Leng Vaults", "Old Duergar Smelter Ruins", "The Wailing Catacombs", "Mouth of Yao"],
  },
  city_of_masks: {
    settlementPrefixes: ["Rooks", "Canal", "Harbor", "Gutter", "Seren", "Swan", "Palace", "Bridge", "Trem", "Ducal"],
    settlementSuffixes: ["quarter", "district", "wharf", "wash", "plaza", "basin", "crossing", "embankment", "court", "quay"],
    landmarks: [
      "High Arched Marble Canal Bridge",
      "The Rooks Masked Night Bazaar",
      "Trematora River Estuary Siphon Gates",
      "Abandoned Clockwork Clocktower",
      "Sunken Canal Crypt & Vaulted Gate",
      "Gondola Basin & Mooring Poles",
      "Ducal Watch Barracks & Pillory Square",
      "Palace of Whispers Colonnade",
    ],
    shrineDeities: ["The Veiled Goddess", "Madeera of the Scales", "The Crow-Mother", "Saint of the Silent Mask"],
    ruinDescriptors: ["Old Ducal Water Palace", "Sunken Canal Catacombs", "Forgotten Guild Siphon", "Ruined Harbor Bastion"],
  },
};

/**
 * Generate an authentic settlement name for a specific zone.
 */
export function generateSettlementName(
  zoneId: CursedZoneId,
  isHaven = false,
  index = 0,
  rng?: RandomSource,
): string {
  if (isHaven) {
    return ZONE_HAVEN_DEFINITIONS[zoneId]?.name || "Marin's Hold";
  }

  const bank = ZONE_SETTLEMENT_WORDBANKS[zoneId] || ZONE_SETTLEMENT_WORDBANKS.the_gloaming;

  // Use a blend of zone prefixes/suffixes and Shadowdark core tables
  const useCoreName = rollDie(100, rng) <= 40;
  if (useCoreName) {
    const coreList = rollDie(2, rng) === 1 ? CORE_VILLAGE_NAMES : CORE_TOWN_NAMES;
    const name = coreList[(index + rollDie(coreList.length, rng) - 1) % coreList.length];
    return `${name} (${bank.settlementSuffixes[index % bank.settlementSuffixes.length]})`;
  }

  const p = bank.settlementPrefixes[(index * 3 + rollDie(bank.settlementPrefixes.length, rng) - 1) % bank.settlementPrefixes.length];
  const s = bank.settlementSuffixes[(index * 2 + rollDie(bank.settlementSuffixes.length, rng) - 1) % bank.settlementSuffixes.length];
  return `${p}${s}`;
}

/**
 * Generate an authentic tavern with name, known-for trait, and food/drink.
 */
export function generateTavernForZone(
  zoneId: CursedZoneId,
  isHaven = false,
  rng?: RandomSource,
): {
  name: string;
  knownFor: string;
  drinkSpecialty: string;
  foodSpecialty: string;
} {
  const haven = ZONE_HAVEN_DEFINITIONS[zoneId] || ZONE_HAVEN_DEFINITIONS.the_gloaming;
  if (isHaven) {
    return {
      name: haven.tavernName,
      knownFor: haven.tavernKnownFor,
      drinkSpecialty: zoneId === "the_gloaming" ? "Spiced Moor Ale" : zoneId === "red_sands" ? "Cool Mint Tea & Palm Wine" : zoneId === "midnight_sun" ? "Honeyed Heather Mead" : zoneId === "river_of_night" ? "Jungle Snake-Wine" : zoneId === "dwellers_in_the_deep" ? "Blind Cave Fungus Stout" : "Imported Spiced Brandy",
      foodSpecialty: zoneId === "the_gloaming" ? "Hearty Flailfish Stew (2 cp)" : zoneId === "red_sands" ? "Roast Goat & Salted Dates (3 cp)" : zoneId === "midnight_sun" ? "Smoked Cod & Salt Venison (3 cp)" : zoneId === "river_of_night" ? "Grilled River Eel & Plantains (2 cp)" : zoneId === "dwellers_in_the_deep" ? "Braised Cave Grub & Peat Bread (2 cp)" : "Canal Oyster Platter (1 sp)",
    };
  }

  // Roll on official Shadowdark Tavern Generator table (pg. 140)
  const p1 = TAVERN_NAME_PARTS_1[rollDie(TAVERN_NAME_PARTS_1.length, rng) - 1];
  const p2 = TAVERN_NAME_PARTS_2[rollDie(TAVERN_NAME_PARTS_2.length, rng) - 1];
  const known = TAVERN_KNOWN_FOR[rollDie(TAVERN_KNOWN_FOR.length, rng) - 1];

  return {
    name: `${p1} ${p2}`,
    knownFor: known,
    drinkSpecialty: "Dark Cellar Ale & Bitter Grog",
    foodSpecialty: "Boiled Cabbage & Hearty Broth (2 cp)",
  };
}

/**
 * Generate an authentic landmark or site name for a specific zone and kind.
 */
export function generateLandmarkForZone(
  zoneId: CursedZoneId,
  kind: "ruin" | "shrine" | "settlement" | "fort" | "resource" | "entrance",
  cellId: string,
  rng?: RandomSource,
): { name: string; landmarkDesc: string } {
  const bank = ZONE_SETTLEMENT_WORDBANKS[zoneId] || ZONE_SETTLEMENT_WORDBANKS.the_gloaming;

  switch (kind) {
    case "ruin": {
      const r = bank.ruinDescriptors[rollDie(bank.ruinDescriptors.length, rng) - 1];
      const desc = bank.landmarks[rollDie(bank.landmarks.length, rng) - 1];
      return {
        name: `${r} of Hex ${cellId}`,
        landmarkDesc: `${r} (${desc})`,
      };
    }
    case "shrine": {
      const deity = bank.shrineDeities[rollDie(bank.shrineDeities.length, rng) - 1];
      return {
        name: `Ancient Shrine of ${deity}`,
        landmarkDesc: `Carved stone altar and consecrated reliquary dedicated to ${deity}.`,
      };
    }
    case "fort": {
      const coreTown = CORE_TOWN_NAMES[rollDie(CORE_TOWN_NAMES.length, rng) - 1];
      return {
        name: `${coreTown} Sentry Redoubt`,
        landmarkDesc: `Stone watchtower and fortified palisade garrisoned against wild incursions.`,
      };
    }
    case "resource": {
      const resourceNames = [
        "Mineral Seep & Witchweed Glade",
        "Ancient Bog-Iron Pit & Peat Bog",
        "Crystal Geode Fissure & Ore Seep",
        "Wild Apiary & Rare Herbal Hollow",
        "Forgotten Quarry Basin & Blue Clay",
      ];
      const res = resourceNames[rollDie(resourceNames.length, rng) - 1];
      return {
        name: `${res} (${cellId})`,
        landmarkDesc: `Rich natural harvest deposit: ${res}.`,
      };
    }
    case "entrance": {
      const entranceNames = [
        "Yawning Karst Descent Fissure",
        "Collapsed Basalt Hoist Shaft",
        "Subterranean Sinkhole & Chasm Edge",
        "Echoing Limestone Adit",
        "Sunken Vault Stairway",
      ];
      const ent = entranceNames[rollDie(entranceNames.length, rng) - 1];
      return {
        name: `${ent} (${cellId})`,
        landmarkDesc: `Vertical opening descending into the subterranean underworld: ${ent}.`,
      };
    }
    case "settlement":
    default: {
      const name = generateSettlementName(zoneId, false, parseInt(cellId, 10) || 1, rng);
      return {
        name,
        landmarkDesc: `Inhabited frontier community with defensive stockade and communal well.`,
      };
    }
  }
}
