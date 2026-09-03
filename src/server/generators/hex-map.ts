import { rollDie, type RandomSource } from "../rules.js";
import type { CursedZoneId, PublicHex, RegionGenerationConfig, RevealState } from "../../shared/types.js";
import { generateProceduralRegion } from "./procedural-region.js";

export interface GeneratedHexDefinition {
  id: string;
  ring: number;
  q: number;
  r: number;
  name: string;
  biome: string;
  threatTier: number;
  landmark: string;
  revealState: RevealState;
  road?: string;
  river?: string;
  horizonRumor?: string;
  exitDestination?: string;
  elevation: number;
  canonicalKey?: string;
  primaryZone?: string;
  secondaryZone?: string;
  connections?: any[];
  sites?: any[];
}

export interface HexMapOptions {
  campaignName?: string;
  regionName?: string;
  sanctuaryName?: string;
  theme?: "temperate" | "coastal" | "highland" | "wildwood" | "marshland";
  config?: RegionGenerationConfig;
  legacy?: boolean;
}

// 19-hex layout coordinates in axial (q, r)
export const HEX_GRID: Array<{ id: string; ring: number; q: number; r: number }> = [
  // Ring 0
  { id: "00", ring: 0, q: 0, r: 0 },
  // Ring 1
  { id: "01", ring: 1, q: 0, r: -1 }, // N
  { id: "02", ring: 1, q: 1, r: -1 }, // NE
  { id: "03", ring: 1, q: 1, r: 0 },  // SE
  { id: "04", ring: 1, q: 0, r: 1 },  // S
  { id: "05", ring: 1, q: -1, r: 1 }, // SW
  { id: "06", ring: 1, q: -1, r: 0 }, // NW
  // Ring 2
  { id: "07", ring: 2, q: 0, r: -2 }, // Far N
  { id: "08", ring: 2, q: 1, r: -2 }, // NNE
  { id: "09", ring: 2, q: 2, r: -2 }, // Far NE
  { id: "10", ring: 2, q: 2, r: -1 }, // ENE
  { id: "11", ring: 2, q: 2, r: 0 },  // Far E
  { id: "12", ring: 2, q: 1, r: 1 },  // ESE
  { id: "13", ring: 2, q: 0, r: 2 },  // Far S
  { id: "14", ring: 2, q: -1, r: 2 }, // SSW
  { id: "15", ring: 2, q: -2, r: 2 }, // Far SW
  { id: "16", ring: 2, q: -2, r: 1 }, // WSW
  { id: "17", ring: 2, q: -2, r: 0 }, // Far W
  { id: "18", ring: 2, q: -1, r: -1 },// NNW
];

const THEME_TO_ZONE: Record<string, CursedZoneId> = {
  temperate: "oakhaven_borderlands",
  coastal: "midnight_sun",
  highland: "dwellers_in_the_deep",
  wildwood: "the_gloaming",
  marshland: "river_of_night",
};

/**
 * Main procedural hex map generator.
 * By default, uses the new seeded, zone-aware procedural generation pipeline.
 * If options.legacy === true, runs the original fixed river/road baseline.
 */
export function generateHexMap(
  options: HexMapOptions = {},
  rng?: RandomSource,
): GeneratedHexDefinition[] {
  if (options.legacy || (!options.config && !options.theme)) {
    return generateLegacyHexMap(options, rng);
  }

  // Determine zone from config, theme, or default
  const zoneId: CursedZoneId =
    options.config?.selection.mode === "single"
      ? options.config.selection.zoneId
      : options.config?.selection.mode === "border"
        ? options.config.selection.zoneIds[0]
        : (options.theme && THEME_TO_ZONE[options.theme]) || "oakhaven_borderlands";

  const config: RegionGenerationConfig = options.config ?? {
    selection: { mode: "single", zoneId },
    initialRadius: 2,
    structuralRadius: 6,
    regionalHexMiles: 6,
    season: "autumn",
    sourceContent: "adapted",
    rulesProfileId: "ash_4watch_v1",
  };

  const world = generateProceduralRegion(0, config);

  // Apply sanctuary / campaign name override if provided
  if (options.sanctuaryName || options.campaignName) {
    const sName = options.sanctuaryName || `${options.campaignName} Sanctuary`;
    const h00 = world.initial19PublicHexes.find((h) => h.id === "00");
    if (h00) {
      h00.name = sName;
    }
  }

  return world.initial19PublicHexes as GeneratedHexDefinition[];
}

/**
 * Original fixed-route 19-hex generator kept for regression and legacy campaign reproduction.
 */
export function generateLegacyHexMap(
  options: HexMapOptions = {},
  rng?: RandomSource,
): GeneratedHexDefinition[] {
  const sanctuaryTitle =
    options.sanctuaryName ||
    (options.campaignName
      ? `${options.campaignName} Sanctuary`
      : "Oakhaven Sanctuary");
  const riverName = "River Mor";
  const coastRoadName = "The Old Coast Road";
  const capitalRoadName = "The King's Highroad";
  const ironTraceName = "The Miner's Trace";

  const riverHexIds = new Set(["07", "01", "00", "04", "13"]);
  const coastRoadHexIds = new Set(["00", "06", "17"]);
  const capitalRoadHexIds = new Set(["00", "02", "09"]);
  const ironTraceHexIds = new Set(["00", "03", "11"]);

  const elevations: Record<string, number> = {
    "00": 1,
    "01": 2, "02": 2, "03": 1, "04": 0, "05": 1, "06": 2,
    "07": 3, "08": 3, "09": 2, "10": 2, "11": 1, "12": 1,
    "13": 0, "14": 0, "15": 0, "16": 2, "17": 1, "18": 3,
  };

  const results: GeneratedHexDefinition[] = [];

  for (const coord of HEX_GRID) {
    const id = coord.id;
    const ring = coord.ring;
    const elevation = elevations[id] ?? 1;

    let road: string | undefined;
    let river: string | undefined;
    let exitDestination: string | undefined;
    let horizonRumor: string | undefined;
    let revealState: RevealState = id === "00" ? "fully_mapped" : "unexplored";

    if (riverHexIds.has(id)) {
      river = riverName;
    }
    if (coastRoadHexIds.has(id)) {
      road = coastRoadName;
    } else if (capitalRoadHexIds.has(id)) {
      road = capitalRoadName;
    } else if (ironTraceHexIds.has(id)) {
      road = ironTraceName;
    }

    if (id === "00") {
      horizonRumor = `Starting haven and crossroads. Tavern keepers gossip of the ancient Coast Road to the west and the Capital Highroad northeast.`;
    } else if (id === "17") {
      exitDestination = "➔ To the Coast & Salt Port (3–4 days)";
      horizonRumor = `That road goes to the coast. How far? Sea-merchants say 3 to 4 days' march through wild briars, but nobody has traveled it unescorted since the coastal garrisons fell.`;
    } else if (id === "06") {
      horizonRumor = `${coastRoadName} heads west into overgrown scrub. The cobblestones are cracked; herders warn that wolf packs roam the trail before it nears the sea.`;
    } else if (id === "09") {
      exitDestination = "➔ To the Imperial Capital & Sun Spires (distant)";
      horizonRumor = `The Highroad to the Capital. Once a paved four-horse highway. Word from wandering tinkers is that goblin clans hold the mountain pass ahead, and no imperial couriers have arrived in moons.`;
    } else if (id === "02") {
      horizonRumor = `${capitalRoadName} passes through wooded foothills. Ancient mile-markers still stand, though the old courier waystation has been silent since last winter.`;
    } else if (id === "11") {
      exitDestination = "➔ To the Dwarven Crags & Deep Mines (East)";
      horizonRumor = `${ironTraceName} winds toward ancient dwarven holdings in the high crags. Hunters say hammer-echoes can still be heard on still nights, though rockfalls choke the pass.`;
    } else if (id === "03") {
      horizonRumor = `${ironTraceName} branches eastward toward the rocky borderlands. Old iron mileposts mark the path.`;
    } else if (id === "07") {
      exitDestination = "➔ To the High Glacier & Wyrm Peaks (North)";
      horizonRumor = `The glacial headwaters of ${riverName} crash down from the mountain heights. Hermits claim ancient drakes roost above the icy falls.`;
    } else if (id === "01") {
      horizonRumor = `${riverName} cuts through a rocky pine gorge here. An old stone toll-bridge spans the rapids, but fish-folk have been seen swimming against the falls.`;
    } else if (id === "04") {
      horizonRumor = `${riverName} slows into wide, reed-covered banks. Fishermen speak of submerged barrows hidden under the weeping willows.`;
    } else if (id === "13") {
      exitDestination = "🌊 River flows into the Vast Fen & Drowned Delta";
      horizonRumor = `${riverName} empties into mist-choked fens. Fisherfolk say an ancient sunken shrine lies downstream, but no skiff has returned from past the delta.`;
    }

    let name = "";
    let biome = "";
    let threatTier = ring === 0 ? 0 : ring === 1 ? 1 : 2;
    let landmark = "";

    if (id === "00") {
      name = sanctuaryTitle;
      biome = "Fortified Basin";
      threatTier = 0;
      landmark = "High Watchtower, Temple of St. Jude, Taproom, River Docks";
    } else if (id === "01") {
      name = "North Pine Pass";
      biome = "Rocky Foothills";
      threatTier = 1;
      landmark = "Cobblestone Watchpost & Old Toll Bridge over " + riverName;
    } else if (id === "02") {
      name = "Glimmercap Hollow";
      biome = "Enchanted Woods";
      threatTier = 1;
      landmark = "Forest Gnome Enclave & Alchemical Market along " + capitalRoadName;
    } else if (id === "03") {
      name = "Whispering Bluffs";
      biome = "Rolling Grasslands";
      threatTier = 1;
      landmark = "Standing Megaliths & Ancient Waypost along " + ironTraceName;
    } else if (id === "04") {
      name = "Reed Shallows";
      biome = "Reed Riverbanks";
      threatTier = 1;
      landmark = "Abandoned Fisher Skiffs & Sunken River Idol";
    } else if (id === "05") {
      name = "Briar Commons";
      biome = "Bramble Hills";
      threatTier = 1;
      landmark = "Goblin Outpost & Spiked Barricades in the Thicket";
    } else if (id === "06") {
      name = "West Cobble Verge";
      biome = "Wooded Verge";
      threatTier = 1;
      landmark = "Overgrown Tollhouse & Broken Milestone on " + coastRoadName;
    } else if (id === "07") {
      name = "Frost-Spire Falls";
      biome = "Mountain Ridge";
      threatTier = 3;
      landmark = "Glacial Caverns and Headwaters of " + riverName;
    } else if (id === "08") {
      name = "Eagle's Crest";
      biome = "Granite Peaks";
      threatTier = 2;
      landmark = "Abandoned Griffin Eyrie & Windswept Shrine";
    } else if (id === "09") {
      name = "High King's Gap";
      biome = "Highland Pass";
      threatTier = 2;
      landmark = "Ruined Imperial Gateway & Sentry Redoubt on " + capitalRoadName;
    } else if (id === "10") {
      name = "Blackbriar Thicket";
      biome = "Ancient Elderwood";
      threatTier = 2;
      landmark = "Hollow Barrow of the Spider Witch";
    } else if (id === "11") {
      name = "Crag-Hold Verge";
      biome = "Rocky Foothills";
      threatTier = 2;
      landmark = "Dwarven Prospector Camp & Iron Ore Quarry on " + ironTraceName;
    } else if (id === "12") {
      name = "Barley Weald";
      biome = "Fallow Meadows";
      threatTier = 1;
      landmark = "Burnt Steading & Drystone Cattle Enclosure";
    } else if (id === "13") {
      name = "The Sunken Delta";
      biome = "Stagnant Swamp";
      threatTier = 2;
      landmark = "Half-Submerged Willow Temple where " + riverName + " empties";
    } else if (id === "14") {
      name = "Mist Fen";
      biome = "Peat Bogs";
      threatTier = 2;
      landmark = "Clay Barrow Mound with Rusted Iron Door";
    } else if (id === "15") {
      name = "The Black Mires";
      biome = "Deep Quagmire";
      threatTier = 3;
      landmark = "Sunken Dragon Turtle Shell & Gas Vents";
    } else if (id === "16") {
      name = "Howling Copse";
      biome = "Twisted Woodlands";
      threatTier = 2;
      landmark = "Ancient Runestone Grove Circle";
    } else if (id === "17") {
      name = "Salt-Breeze Ridge";
      biome = "Coastal Scrub";
      threatTier = 2;
      landmark = "Ruined Coastal Beacon & Old Milestone on " + coastRoadName;
    } else if (id === "18") {
      name = "The Great Karst Sink";
      biome = "Subterranean Karst";
      threatTier = 3;
      landmark = "Yawning Chasm descending into the Underdark Deep";
    }

    results.push({
      id,
      ring,
      q: coord.q,
      r: coord.r,
      name,
      biome,
      threatTier,
      landmark,
      revealState,
      road,
      river,
      horizonRumor,
      exitDestination,
      elevation,
    });
  }

  return results;
}
