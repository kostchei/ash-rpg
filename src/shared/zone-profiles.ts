import type { CursedZoneId, ConnectionMode, Season } from "./types.js";

export interface TerrainGroupWeight {
  group: string;
  weight: number;
  biomes: string[];
}

export interface ZoneGenerationProfile {
  id: CursedZoneId;
  name: string;
  theme: string;
  sourceVolume: string;
  sourcePageRef: string;
  provenance: "sourced" | "adapted";
  terrainPriors: TerrainGroupWeight[];
  typicalElevationRange: [number, number]; // min, max (0=water/trench, 1=low, 2=mid, 3=high)
  settlementHubRange: [number, number];
  settlementTypes: Array<{
    name: string;
    description: string;
    waterSource: string;
    foodProvenance: string;
    reason: string;
  }>;
  historicalLayers: Array<{
    phase: "earlier_occupation" | "expansion" | "disruption" | "present_response";
    title: string;
    summary: string;
    consequences: string[];
  }>;
  factions: Array<{
    id: string;
    name: string;
    disposition: string;
    asset: string;
    agenda: string;
  }>;
  havenDefaults: {
    name: string;
    biome: string;
    landmark: string;
    description: string;
  };
  waterDrainageType: "river_network" | "scarce_oasis" | "archipelago_sea" | "basin_trunk" | "karst_siphon" | "estuary_canals";
  hazardTable: string[];
  weatherTable: Record<Season, string[]>;
  wanderingMonsterKeys: string[];
}

export interface BorderPairingDefinition {
  id: string;
  zoneIds: [CursedZoneId, CursedZoneId];
  recommendedConnection: ConnectionMode;
  supportedConnections: ConnectionMode[];
  title: string;
  transitionMechanism: string;
  sharedConflictOrResource: string;
  isLocal19Supported: boolean;
  notes: string;
}

export const ZONE_PROFILES: Record<CursedZoneId, ZoneGenerationProfile> = {
  the_gloaming: {
    id: "the_gloaming",
    name: "The Gloaming",
    theme: "Gothic Mistwood, Witchcraft & Barrow Mounds (Cursed Scroll 1)",
    sourceVolume: "Cursed Scroll 1: Diablerie",
    sourcePageRef: "JSON pp. 39-44",
    provenance: "sourced",
    terrainPriors: [
      { group: "Woodland", weight: 45, biomes: ["Ancient Elderwood", "Twisted Woodlands", "Bramble Hills", "Wooded Verge"] },
      { group: "Wetland", weight: 25, biomes: ["Peat Bogs", "Mist Fen", "Stagnant Swamp", "Deep Quagmire"] },
      { group: "Rough Pasture", weight: 15, biomes: ["Heathland", "Overgrown Commons", "Fallow Meadows"] },
      { group: "Worked Clearings", weight: 10, biomes: ["Woodcutter Clearings", "Charcoal Verge", "Farmed Hollow"] },
      { group: "Rocky Ridge", weight: 5, biomes: ["Rocky Ridge", "Standing Stone Crest", "Granite Tor"] },
    ],
    typicalElevationRange: [0, 2],
    settlementHubRange: [2, 4],
    settlementTypes: [
      {
        name: "Woodcutter Steading",
        description: "A ring of peat-thatched timber cabins surrounded by heavy sharpened palisades.",
        waterSource: "Clear forest brook and timber-shored spring",
        foodProvenance: "Small turnip plots, trapped hare, and smoked boar",
        reason: "Timber harvesting and charcoal burning for nearby settlements",
      },
      {
        name: "Fen Stilt Village",
        description: "Wattle-and-daub huts elevated on cedar poles above black marsh water.",
        waterSource: "Boiled rainwater cisterns and slow moss-filtered bayous",
        foodProvenance: "Catfish traps, wild watercress, and duck eggs",
        reason: "Access to rich peat beds, medicinal leeches, and rare bog moss",
      },
      {
        name: "Priory Waystation",
        description: "A fortified stone chapel and guest hospice surrounded by sacred iron lanterns.",
        waterSource: "Blessed deep limestone well",
        foodProvenance: "Walled herb garden, beehives, and tithe grain",
        reason: "Spiritual sanctuary and pilgrim hospice along the old road",
      },
    ],
    historicalLayers: [
      {
        phase: "earlier_occupation",
        title: "Barrow Kings' Sacred Henges",
        summary: "Ancient chieftains raised megalithic alignments and buried their dead in deep stone mounds.",
        consequences: ["Barrow mounds dot the ridges", "Megalith circles remain magical conduits"],
      },
      {
        phase: "expansion",
        title: "Holy Lantern Pilgrimages",
        summary: "The Knights of St. Ydris blazed stone causeways and erected warding lantern posts through the mire.",
        consequences: ["Old cobbled causeway cuts through the forest", "Lantern shrines serve as safe wayposts"],
      },
      {
        phase: "disruption",
        title: "The Bitter Spore Rot",
        summary: "A fungal blight seeped from Bittermold Keep, drowning several hamlets and corrupting livestock.",
        consequences: ["A ruined settlement now stands half-swallowed by mold", "Old toll bridge collapsed"],
      },
      {
        phase: "present_response",
        title: "Encroaching Covens and Wary Woodcutters",
        summary: "The Coven of Bittermold seeks ancient stones while local herders fortify their clearings.",
        consequences: ["Woodcutters hire mercenaries for timber caravans", "Knights patrol the remaining pilgrim trails"],
      },
    ],
    factions: [
      {
        id: "knights_ydris",
        name: "Knights of St. Ydris",
        disposition: "Friendly",
        asset: "Fortified lantern priory and stone wayposts",
        agenda: "Protect pilgrims, maintain the sacred lantern trails, and cleanse barrow horrors.",
      },
      {
        id: "coven_bittermold",
        name: "Coven of Bittermold",
        disposition: "Hostile",
        asset: "Spore-saturated keep and mutant familiars",
        agenda: "Brew potent curse draughts and awaken slumbering primeval powers beneath the mounds.",
      },
      {
        id: "fen_clans",
        name: "Gloaming Fen-Herders",
        disposition: "Neutral",
        asset: "Stilt skiffs and hidden marsh caches",
        agenda: "Preserve independent marsh rights and trade medicinal herbs to anyone with silver.",
      },
    ],
    havenDefaults: {
      name: "Oakhaven Refuge",
      biome: "Woodland Refuge",
      landmark: "Stone Priory Guest House, Sacred Lantern Gate, Timber Docks",
      description: "A fortified woodland settlement nestled in a dry clearing, offering hearth-warmth, provisions, and safe travel advice.",
    },
    waterDrainageType: "river_network",
    hazardTable: [
      "Bitter Spore Fog (DC 12 CON or coughing fits / reveal stealth)",
      "Quicksand Barrow (DC 13 DEX or sink 1 step per round)",
      "Corrupted Standing Stones (DC 12 WIS or eerie nightmares)",
      "Creeping Blood-Thorns (DC 11 STR or 1d6 piercing)",
    ],
    weatherTable: {
      spring: ["Perpetual drizzling mist", "Pale cool morning sun", "Sudden torrential downpour", "Damp gray overcast"],
      summer: ["Stifling humid forest vapor", "Dense insect-swarming warmth", "Thunderstorm rolling over barrows", "Chilly night dew"],
      autumn: ["Dense pea-soup fog reducing sight to close", "Chilling gale stripping dead boughs", "Pale sickle moon lighting the mist", "Sleet and cold drizzle"],
      winter: ["Freezing rain coating trees in ice", "Frost-rimed barrows and brittle reed beds", "Bitter north wind howling through pines", "Gloomy twilight with swirling sleet"],
    },
    wanderingMonsterKeys: [
      "bittermold",
      "bogthorn",
      "dralech",
      "hexling",
      "howler",
      "ichor_ooze",
      "marrow_fiend",
      "skrell",
    ],
  },

  red_sands: {
    id: "red_sands",
    name: "The Red Sands (Djurum)",
    theme: "Sun-Baked Desert, Fighting Pits & Burning Tombs (Cursed Scroll 2)",
    sourceVolume: "Cursed Scroll 2: Red Sands",
    sourcePageRef: "JSON pp. 31-36",
    provenance: "sourced",
    terrainPriors: [
      { group: "Rocky Desert", weight: 30, biomes: ["Bleached Stone Flats", "Basalt Scree", "Gravel Pavement", "Sun-Cracked Basin"] },
      { group: "Dunes", weight: 25, biomes: ["Crimson Dune Sea", "Shifting Crests", "Wind-Carved Ridges"] },
      { group: "Canyon & Escarpment", weight: 20, biomes: ["Red Sandstone Gorge", "Shadowed Escarpment", "Canyon Pass"] },
      { group: "Dry Steppe & Wadi", weight: 15, biomes: ["Dry Wadi Wash", "Thorn Scrub Steppe", "Acacia Gully"] },
      { group: "Salt Flat", weight: 5, biomes: ["Blinding Salt Flats", "Alkali Sink", "Crystalline Crust"] },
      { group: "Watered Pocket", weight: 5, biomes: ["Palm Oasis", "Natural Spring Alcove", "Qanat Reservoir"] },
    ],
    typicalElevationRange: [1, 3],
    settlementHubRange: [1, 3],
    settlementTypes: [
      {
        name: "Oasis Caravanserai",
        description: "Thick adobe walls surrounding deep date-palm groves and a guarded crystalline spring.",
        waterSource: "Perennial artesian spring fed by deep sandstone aquifers",
        foodProvenance: "Date palms, goat milk, roasted barley, and imported figs",
        reason: "Vital caravan water stop and camel market along the southern trace",
      },
      {
        name: "Canyon Hermitage & Wells",
        description: "Adobe dwellings carved into sheer sandstone cliffs with gravity-fed rock-cut cisterns.",
        waterSource: "Subsurface seep collected in shaded sandstone pools",
        foodProvenance: "Terraced squash, drought beans, and dried mutton",
        reason: "Shelter from blistering noon heat and defensible vantage over canyon routes",
      },
      {
        name: "Nomad Camp",
        description: "Woven goat-hair pavilions clustered around a seasonal wadi water hole.",
        waterSource: "Seasonal gravel-well dug into the dry wadi floor",
        foodProvenance: "Camel milk, dried cheese, and caravan trade goods",
        reason: "Seasonal pasture for grazing herds following desert rains",
      },
    ],
    historicalLayers: [
      {
        phase: "earlier_occupation",
        title: "Ancient Qanat Engineers",
        summary: "An older empire channeled mountain groundwater dozens of leagues through underground aqueducts.",
        consequences: ["Ancient stone inspection shafts punctuate the desert", "Subterranean conduit branches survive"],
      },
      {
        phase: "expansion",
        title: "The Great Incense & Spice Boom",
        summary: "Rich trade leagues built fortified way-castles and fighting pit arenas to secure trade routes.",
        consequences: ["Desert waystations and gladiatorial arenas stand along the dunes", "Bronze mile-markers exist"],
      },
      {
        phase: "disruption",
        title: "The Aqueduct Fracture",
        summary: "A seismic tremor cracked the primary subterranean qanat, desiccating three settlements and drying up downstream wells.",
        consequences: ["One ghost town stands choked in dunes", "Surviving oasis water rights became violently contested"],
      },
      {
        phase: "present_response",
        title: "War of the Water Stewards",
        summary: "Nomad tribes and city guild masters clash over the remaining active springs.",
        consequences: ["Caravans travel with armed mercenary escorts", "Water thieves face execution at the oasis"],
      },
    ],
    factions: [
      {
        id: "thraxis_gladiators",
        name: "Thraxis Arena Masters",
        disposition: "Neutral",
        asset: "Sandstone amphitheater and pit-fighter barracks",
        agenda: "Host grand combat tournaments, recruit skilled mercenaries, and enforce martial honor.",
      },
      {
        id: "burning_brothers",
        name: "Burning Brothers",
        disposition: "Hostile",
        asset: "Volcanic iron citadel and fire-temples",
        agenda: "Cleanse the desert with flame and claim ancient solar relics for their salamander god.",
      },
      {
        id: "water_custodians",
        name: "Djurum Water Keepers",
        disposition: "Friendly",
        asset: "Subterranean qanat sluice-gates and cisterns",
        agenda: "Repair cracked conduits, ration spring water, and punish those who pollute the wells.",
      },
    ],
    havenDefaults: {
      name: "Qasr Al-Rimal",
      biome: "Palm Oasis",
      landmark: "Artesian Spring Basin, High Adobe Watchtower, Caravan Exchange",
      description: "A defended desert oasis walled against sandstorms, offering cool date shade, clean water, and camel provisions.",
    },
    waterDrainageType: "scarce_oasis",
    hazardTable: [
      "Blinding sandstorm (DC 12 CON or blinded and disoriented)",
      "Extreme heat exhaustion (DC 13 CON or consume double water)",
      "Shifting sink-dune (DC 12 DEX or tumble into pit)",
      "Sunstroke mirage (DC 11 WIS or waste half day chasing false oasis)",
    ],
    weatherTable: {
      spring: ["Warm desert breeze with clear skies", "Swirling dust devil on the flats", "Pleasant starry night", "Sudden flash-flood in wadis"],
      summer: ["Blistering heat wave radiating off stones", "Scorching sirocco gusts whipping crimson sand", "Total absence of clouds under white-hot sun", "Warm stifling night"],
      autumn: ["Brisk dry breeze kicking up sand grains", "Cool sunny afternoons", "Bitter cold starry night", "Sudden blinding red sandstorm"],
      winter: ["Freezing desert nights with rime on sandstone", "Crisp sunny midday", "Piercing cold wind howling through canyons", "Rare icy deluge filling dry gullies"],
    },
    wanderingMonsterKeys: [
      "camel_silver",
      "canyon_ape",
      "dunefiend",
      "dust_devil",
      "mirage",
      "ras_godai",
      "scrag",
      "siruul",
    ],
  },

  midnight_sun: {
    id: "midnight_sun",
    name: "The Isles of Andrik",
    theme: "Glacial Fjords, Northern Gods & Sea Wolf Raiders (Cursed Scroll 3)",
    sourceVolume: "Cursed Scroll 3: Midnight Sun",
    sourcePageRef: "JSON pp. 37-41",
    provenance: "sourced",
    terrainPriors: [
      { group: "Open Water & Fjords", weight: 30, biomes: ["Deep Glacial Fjord", "Outer Island Sound", "Glassy Coastal Reaches"] },
      { group: "Coast & Shoreline", weight: 20, biomes: ["Pebble Beach Harbor", "Basalt Sea Cliffs", "Tidal Inlet"] },
      { group: "Wooded Slope", weight: 15, biomes: ["Pine-Clad Slopes", "Birch Fjord Verge", "Windblown Timber Ridge"] },
      { group: "Pastoral Valley", weight: 15, biomes: ["Barley Steading Valley", "Moss Meadow", "Coastal Sheep Furlong"] },
      { group: "Mountain Crags", weight: 15, biomes: ["Snow-Dusted Crags", "Granite Needle Peaks", "High Scree Pass"] },
      { group: "Cold High Ground", weight: 5, biomes: ["Glacial Tongue", "Blue Ice Ridge", "Perpetual Frost Summit"] },
    ],
    typicalElevationRange: [0, 3],
    settlementHubRange: [2, 4],
    settlementTypes: [
      {
        name: "Fjord Farmsteading",
        description: "Turf-roofed longhouses with drystone cattle byres in a sheltered coastal valley.",
        waterSource: "Rushing glacial melt stream and freshwater fjord springs",
        foodProvenance: "Hardy barley, dairy cattle, salted cod, and foraged lingonberries",
        reason: "Fertile volcanic soil in the valley bottom and sheltered bay for small fishing boats",
      },
      {
        name: "Longship Haven",
        description: "Timber boathouses, slipways, and an earthen-rampart fort protecting sea wolf longboats.",
        waterSource: "Cascading waterfall routed through hollowed cedar flumes",
        foodProvenance: "Whale meat, dried seal, imported malt, and harbor catch",
        reason: "Deep, wind-sheltered harbor with easy access to open sea raiding and trade lanes",
      },
      {
        name: "Sacred Thing-Mound",
        description: "A consecrated stone assembly circle and sanctuary hall where regional oaths are sworn.",
        waterSource: "Holy hillside spring boiling from volcanic earth",
        foodProvenance: "Sacrificial mutton, mead gifts, and assembly tithes",
        reason: "Religious heart of the archipelago; judicial assemblies and seasonal god-feasts",
      },
    ],
    historicalLayers: [
      {
        phase: "earlier_occupation",
        title: "Sea-Giant Cairns and Runestones",
        summary: "Primordial giant kin built cyclopean stone sea-walls and inscribed elder runes upon the cliffs.",
        consequences: ["Massive stone blocks serve as harbor foundations", "Carved cliffs glow under the auroras"],
      },
      {
        phase: "expansion",
        title: "Jarl Alliances and Longship Fleets",
        summary: "Rival northern jarls established fishing villages, built timber longships, and cleared lower valleys.",
        consequences: ["Network of coastal beacons and longhouses", "Oaths bound under iron rings"],
      },
      {
        phase: "disruption",
        title: "The Winter of the Weeping Draugr",
        summary: "A sunken burial ship broke open during a storm, releasing undead sea-corpses along several island bays.",
        consequences: ["One fishing village stands abandoned and salt-encrusted", "Coastal beacons re-ignited"],
      },
      {
        phase: "present_response",
        title: "Blood Feud and Runic Omen",
        summary: "Two rival clan heads contest harbor dues while the seers warn of an eternal auroral winter.",
        consequences: ["Armed skiffs patrol the fjord mouths", "Blacksmiths rush to forge cold-iron weapons"],
      },
    ],
    factions: [
      {
        id: "sea_wolf_clans",
        name: "Sea Wolf Clans",
        disposition: "Wary",
        asset: "Dragon-prowed longships and coastal halls",
        agenda: "Defend harbor waters, maintain sworn oaths of fealty, and raid rival islands for plunder.",
      },
      {
        id: "seers_northern_gods",
        name: "Seers of the Northern Gods",
        disposition: "Neutral",
        asset: "Runestone holy groves and whalebone oracles",
        agenda: "Appease the sky gods, interpret auroral portents, and enforce sacred hospitality laws.",
      },
      {
        id: "fjord_homesteaders",
        name: "Andrik Freeholders",
        disposition: "Friendly",
        asset: "Valley farms, fishing fleets, and smokehouses",
        agenda: "Safeguard livestock and grain stores against raiders, trolls, and the freezing sea spray.",
      },
    ],
    havenDefaults: {
      name: "Sunderfjord Harbor",
      biome: "Sheltered Bay Harbor",
      landmark: "Great Longhouse, Slipway Docks, Runestone Beacon",
      description: "A sheltered island harbor surrounded by turf longhouses, offering boat repairs, salt rations, and hearty mead by the hearth.",
    },
    waterDrainageType: "archipelago_sea",
    hazardTable: [
      "Freezing sea spray (DC 12 CON or frostbite fatigue)",
      "Crevasse ice shelf collapse (DC 13 DEX or fall 20ft)",
      "Sudden blizzard whiteout (DC 12 WIS to maintain navigation)",
      "Slippery glacier incline (DC 11 DEX or slide into freezing water)",
    ],
    weatherTable: {
      spring: ["Cool glassy waters under pale midnight twilight", "Brisk northern headwind", "Thawing slush and coastal mist", "Bright sunny cold spells"],
      summer: ["Perpetual daylight with the sun skimming the horizon", "Calm fjord waters reflecting snow-peaks", "Gentle rain and fragrant pine air", "Sudden sea fog bank"],
      autumn: ["Brilliant solar aurora dancing across ice-peaks", "Howling gale and freezing rain glazing longships", "Rough choppy swells in outer sounds", "First heavy snowfall"],
      winter: ["Total polar night broken only by auroral green skies", "Howling sub-zero blizzard across the ice-shelf", "Drifting icebergs choking outer passages", "Bitter calm biting frost"],
    },
    wanderingMonsterKeys: [
      "drake_lesser",
      "drake_greater",
      "draugr",
      "dverg",
      "nord",
      "sea_nymph",
      "sea_serpent",
      "werebear",
    ],
  },

  river_of_night: {
    id: "river_of_night",
    name: "The Black River",
    theme: "Primeval Jungle, Ziggurats & Basilisk Cults (Cursed Scroll 4)",
    sourceVolume: "Cursed Scroll 4: River of Night",
    sourcePageRef: "JSON pp. 24-37",
    provenance: "sourced",
    terrainPriors: [
      { group: "Primeval Forest", weight: 45, biomes: ["Canopy Rainforest", "Upland Ironwood Jungle", "Bamboo Thicket", "Liana Tangled Verge"] },
      { group: "River Corridor", weight: 20, biomes: ["Black River Trunk", "Silt Riverbank", "Navigable Tributary", "Sandbar Crossing"] },
      { group: "Wetland", weight: 15, biomes: ["Flooded Swamp Basin", "Oxbow Lagoon", "Alluvial Mudflats"] },
      { group: "Cultivated Bank", weight: 10, biomes: ["Itzalca Maize Terraces", "Riverside Fish-Trap Reaches", "Cacao Groves"] },
      { group: "Volcanic & Mountain", weight: 10, biomes: ["Basalt Volcanic Outcrop", "Obsidian Ridge", "Sulfur Vent Slope"] },
    ],
    typicalElevationRange: [0, 2],
    settlementHubRange: [2, 4],
    settlementTypes: [
      {
        name: "Itzalca River Village",
        description: "Thatched pole-houses perched atop ancient stone river-terraces above seasonal floods.",
        waterSource: "Rushing tributary spring filtered through volcanic basalt",
        foodProvenance: "River catfish, maize terraces, wild cassava, and sweet papayas",
        reason: "Control of prime canoe landings, fishing shallows, and obsidian blade trade",
      },
      {
        name: "Relic Expedition Base",
        description: "A fortified palisaded camp on a raised bluff overlooking the main river confluence.",
        waterSource: "Gravity-fed river water cleared with charcoal filters",
        foodProvenance: "Smoked monkey meat, traded maize, and dried rations",
        reason: "Staging ground for exploring overgrown stepped ziggurats deeper inland",
      },
      {
        name: "Basalt Terrace Landing",
        description: "A stone quay with carved serpent bollards where river craft portage around boiling rapids.",
        waterSource: "Fast-moving clean mountain runoff",
        foodProvenance: "Traded dried fish, plantains, and bush meat",
        reason: "Mandatory portage station around roaring falls and treacherous river rapids",
      },
    ],
    historicalLayers: [
      {
        phase: "earlier_occupation",
        title: "Primeval Itzalca Dynasty",
        summary: "Centuries ago, a grand stone civilization built stepped pyramids, canal networks, and obsidian temples.",
        consequences: ["Carved stone ruins peek through the jungle canopy", "Ancient paved avenues connect river landings"],
      },
      {
        phase: "expansion",
        title: "Rise of the Basilisk Priesthood",
        summary: "A serpent-worshipping priesthood seized the river temples, demanding tribute and breeding venomous beasts.",
        consequences: ["Stepped ziggurats are adorned with basilisk statuary", "Villages pay heavy tribute in gold and grain"],
      },
      {
        phase: "disruption",
        title: "Volcanic Rupture & Silt Floods",
        summary: "A volcanic eruption upstream poisoned a river branch with ash and swallowed several temple complexes in mudslides.",
        consequences: ["A river stretch smells of sulfur and turns murky red", "Sunken stone temples lie half-submerged"],
      },
      {
        phase: "present_response",
        title: "Expedition Incursions and Tribal Resistance",
        summary: "Foreign adventurers enter the basin seeking lost gold while resident tribes defend their ancestral territories.",
        consequences: ["River rangers charge guidance fees", "Cultists lay poison ambushes at ruined temple gates"],
      },
    ],
    factions: [
      {
        id: "itzalca_tribes",
        name: "Itzalca Free Communities",
        disposition: "Friendly",
        asset: "Dugout war canoes, elevated villages, and jungle trail knowledge",
        agenda: "Preserve tribal autonomy, fish the waterways, and drive off dangerous cultists.",
      },
      {
        id: "basilisk_cult",
        name: "Priests of the Emerald Basilisk",
        disposition: "Hostile",
        asset: "Stepped pyramid temples and petrifying serpent pits",
        agenda: "Subjugate river communities, harvest venom, and awaken primeval serpent deities.",
      },
      {
        id: "river_rangers",
        name: "Black River Guides",
        disposition: "Neutral",
        asset: "Confluence trading post and portage gear",
        agenda: "Charter canoe expeditions, trade exotic pelts, and scout unmapped inland tributaries.",
      },
    ],
    havenDefaults: {
      name: "Tepoz Landing",
      biome: "Elevated River Bluff",
      landmark: "Palisade Watchtower, Stone Canoe Slips, Trade Post",
      description: "A secure riverside settlement raised on ancient basalt terraces, safe from floodwaters and primeval predators.",
    },
    waterDrainageType: "basin_trunk",
    hazardTable: [
      "Swarm of army ants (DC 12 DEX or 2d6 piercing damage)",
      "Toxic river leeches (DC 11 CON or drained 1d4 HP)",
      "Falling canopy branch / deadfall (DC 12 DEX or 1d8 bludgeoning)",
      "Poisonous vine scratch (DC 13 CON or paralyzed 1 round)",
    ],
    weatherTable: {
      spring: ["Warm morning canopy mist", "Torrents of afternoon monsoon rain", "Steamy humid evening", "Distant rumbling thunderstorms"],
      summer: ["Oppressive tropical humidity and steamy heat", "Torrents of warm deluge flooding low channels", "Sudden solar eclipse dimming jungle to dusk", "Heavy canopy mist dampening sound"],
      autumn: ["Warm steady river breezes", "Brief torrential downpours followed by bright sun", "Choking evening river fog", "Clear humid nights with brilliant stars"],
      winter: ["Dry season sun baking the river silt", "Lower water exposing treacherous rapids", "Cool pleasant night breezes", "Occasional sudden squall"],
    },
    wanderingMonsterKeys: [
      "anaconda_giant",
      "ant_giant",
      "basilisk_cultists",
      "basilisk_hatchling",
      "blue_dart_frog",
      "catfish_giant",
      "condor_dire",
      "jaguar_king",
    ],
  },

  dwellers_in_the_deep: {
    id: "dwellers_in_the_deep",
    name: "Morzomotha & Karst Deeps",
    theme: "Subterranean Karst, Sunless Libraries & Delver Pits (Cursed Scroll 5)",
    sourceVolume: "Cursed Scroll 5: Dwellers in the Deep",
    sourcePageRef: "JSON pp. 26-31",
    provenance: "sourced",
    terrainPriors: [
      { group: "Dry Traversable Cave", weight: 25, biomes: ["Stalactite Gallery", "Echoing Limestone Vault", "Gravel Bed Cavern"] },
      { group: "Wet Cave & Siphon", weight: 20, biomes: ["Dripping Flowstone Cavern", "Flooded Cave Siphon", "Mineral Pool Terrace"] },
      { group: "Narrow Passage", weight: 20, biomes: ["Claustrophobic Crawlway", "Twisting Fissure", "Labyrinthine Crevasse"] },
      { group: "Vertical & Chasm", weight: 15, biomes: ["Great Karst Sinkhole", "Bottomless Chasm", "Sheer Shaft Descent"] },
      { group: "Underground Water", weight: 15, biomes: ["Subterranean River", "Sunless Lake", "Black Waterfall Abyss"] },
      { group: "Inhabited Deep", weight: 5, biomes: ["Delver Enclave", "Bioluminescent Fungus Grove", "Carved Dwarf Hold"] },
    ],
    typicalElevationRange: [0, 2], // Interpreted as depth tiers: 0=Surface threshold, 1=Upper Caverns, 2=Deep Sunless Vaults
    settlementHubRange: [1, 3],
    settlementTypes: [
      {
        name: "Delver Expedition Camp",
        description: "A ring of sturdy canvas shelters and iron barricades anchored in a dry limestone chamber.",
        waterSource: "Pure mineral seepage collected in clean stone basins",
        foodProvenance: "Imported smoked meats, iron rations, and cultivated glow-lichen paste",
        reason: "Base camp for charting uncharted descent shafts and mining silver veins",
      },
      {
        name: "Fungus Grower Grotto",
        description: "Stone terraced beds nourished by bat guano and subterranean river silt.",
        waterSource: "Underground river overflow channel",
        foodProvenance: "Edible cap mushrooms, blind cave crayfish, and fermented fungus beer",
        reason: "Critical food production sustaining deep spelunkers and subterranean enclaves",
      },
      {
        name: "Chasm Tollpost",
        description: "A fortified stone redoubt guarding a rope-and-chain suspension bridge spanning a bottomless chasm.",
        waterSource: "Dripping limestone flowstone flume",
        foodProvenance: "Toll fees paid in dried surface food and lamp oil",
        reason: "Control of the sole safe crossing between the upper sinkhole and the Library of Leng",
      },
    ],
    historicalLayers: [
      {
        phase: "earlier_occupation",
        title: "The Primordial Karst Architects",
        summary: "Eons ago, blind subterranean artisans carved cyclopean arches and deep drainage siphons into the living rock.",
        consequences: ["Carved basalt ramps connect cavern levels", "Ancient water gates regulate subterranean floods"],
      },
      {
        phase: "expansion",
        title: "The Silver Delver Boom",
        summary: "Surface mining syndicates sank deep shafts and anchored heavy bronze chains into the chasm walls.",
        consequences: ["Anchored chain ladders remain usable", "Abandoned ore carts litter the crawlways"],
      },
      {
        phase: "disruption",
        title: "The Great Cavern Collapse",
        summary: "A subterranean earthquake crushed the main descent gallery, drowning lower tunnels in black mineral water.",
        consequences: ["A flooded siphon now requires swimming or diving", "Ruined delver outposts lie crushed beneath boulders"],
      },
      {
        phase: "present_response",
        title: "Incursion of the Leng Scholars",
        summary: "Alien librarians arrived in the deep vaults, collecting eldritch scrolls and barring access to lower archives.",
        consequences: ["Librarians place psychic ward glyphs on chamber walls", "Delvers hire adventurers for armed escort"],
      },
    ],
    factions: [
      {
        id: "deep_delver_guild",
        name: "Deep Delver Guild",
        disposition: "Friendly",
        asset: "Chasm cableways, descent winches, and safe cache chambers",
        agenda: "Map subterranean corridors, secure profitable silver lodes, and maintain rescue routes to the surface.",
      },
      {
        id: "librarians_leng",
        name: "Librarians of Leng",
        disposition: "Hostile",
        asset: "Sunless archives, eldritch scrolls, and brain-stealing wardens",
        agenda: "Guard occult manuscripts from surface barbarians and preserve cosmic secrets in darkness.",
      },
      {
        id: "troglodyte_clans",
        name: "Karst Troglodyte Packs",
        disposition: "Neutral",
        asset: "Scent-marked warrens and blind fish fisheries",
        agenda: "Defend their mushroom beds, acquire iron scrap, and ambush careless travelers lacking light.",
      },
    ],
    havenDefaults: {
      name: "Upper Sink Refuge",
      biome: "Fortified Cavern Vault",
      landmark: "Surface Hoist Winch, Iron Gatehouse, Guano Lanterns",
      description: "A defended underground staging post situated just below the great sinkhole, with reliable supply hoists to the surface world.",
    },
    waterDrainageType: "karst_siphon",
    hazardTable: [
      "Falling stalactites from subterranean tremors (DC 13 DEX or 2d8 damage)",
      "Bioluminescent spore puff (DC 12 CON or hallucinatory visions)",
      "Chasm rope bridge snapping (DC 14 DEX to catch ledge)",
      "Flooded cave siphon rush (DC 12 STR or swept 1 chamber down)",
    ],
    weatherTable: {
      spring: ["Stagnant cool air dripping with limestone mineral water", "Cold draft blowing through vertical shafts", "Total pitch darkness broken by pale lichen", "Dripping water echoing like footsteps"],
      summer: ["Warm sulfur draft blowing up from deep planar fissures", "Dense humid cave mist hanging over underground pools", "Echoing air currents howling through vast vaults", "Total silence broken only by clicking chitin"],
      autumn: ["Chilly damp cave winds", "Heavy mineral seepage forming fresh rim pools", "Rattling tremors shaking loose gravel", "Stagnant sulfur pockets requiring torches held high"],
      winter: ["Icy air descending from surface sinkholes", "Frozen flowstone cascades in upper passages", "Still, muffled darkness in the deeper vaults", "Warm hydrothermal springs steaming in the dark"],
    },
    wanderingMonsterKeys: [
      "bezelak",
      "dremir",
      "librarian_of_leng",
      "nuln",
      "morzo_moth",
      "wendel",
      "cave_creeper",
      "troglodyte",
    ],
  },

  city_of_masks: {
    id: "city_of_masks",
    name: "The City of Masks (Meridia)",
    theme: "Canal Metropolis, Masked Aristocracy & Duelist Guilds (Cursed Scroll 6)",
    sourceVolume: "Cursed Scroll 6: City of Masks",
    sourcePageRef: "JSON pp. 40-45, 50-65",
    provenance: "sourced",
    terrainPriors: [
      { group: "Cultivated Hinterland", weight: 30, biomes: ["Grape & Olive Terraces", "Market Garden Allotments", "Ducal Wheat Farms"] },
      { group: "Estuary & Canal Waters", weight: 25, biomes: ["Trematora Estuary", "Grand Shipping Canal", "Outer Harbor Roads"] },
      { group: "Urban District", weight: 15, biomes: ["Cobblestone Piazza", "Grand Canal Embankment", "Rooftop Slates"] },
      { group: "Meadow & Verge", weight: 15, biomes: ["Forested River Approach", "Pasture Meadows", "High Coastal Bluff"] },
      { group: "Wetland Margin", weight: 15, biomes: ["Salt Marshes", "Estuary Reedbeds", "Tidal Mudflats"] },
    ],
    typicalElevationRange: [0, 2],
    settlementHubRange: [1, 3], // 1 core city + 1-3 satellite villages/ports
    settlementTypes: [
      {
        name: "Meridia Canal Core",
        description: "A labyrinthine metropolis of marble palazzos, arched bridges, and bustling water bazaars.",
        waterSource: "Trematora River aqueducts and deep artesian city cisterns",
        foodProvenance: "River barge grain imports, coastal fishing fleets, and hinterland market gardens",
        reason: "Imperial trading port, seat of the Duke, and cultural heart of mask-wearing society",
      },
      {
        name: "River Barge Landing",
        description: "A rustic riverside hamlet where heavy cargo barges transfer grain and wine onto canal gondolas.",
        waterSource: "Freshwater river channel",
        foodProvenance: "River fish, bread from local watermills, and tavern stew",
        reason: "Upstream freight transfer and customs inspection before entering the city proper",
      },
      {
        name: "Hinterland Vineyard Steading",
        description: "Walled stone villas surrounded by sunlit hillside vineyards and olive groves.",
        waterSource: "Hillside spring fountains and terraced stone irrigation channels",
        foodProvenance: "Grapes, olives, goat cheese, and estate wheat",
        reason: "Wine production and agricultural provisioning for the grand balls of Meridia",
      },
    ],
    historicalLayers: [
      {
        phase: "earlier_occupation",
        title: "The Fishermen's Sanctuary",
        summary: "Early settlers built wooden stilt docks at the river mouth and worshipped ancient sea saints.",
        consequences: ["Sunken wooden pilings remain visible under marble bridges", "Old chapel serves as a quiet refuge"],
      },
      {
        phase: "expansion",
        title: "The Grand Canal Dredging",
        summary: "The first Duke engineered stone embankments, dredged eight major canals, and divided the city into eight districts.",
        consequences: ["Paved quays line every major canal", "Ornate marble bridges connect district centers"],
      },
      {
        phase: "disruption",
        title: "The Mask Plague and Conspiracy",
        summary: "A virulent contagion led the nobility to mandate decorative persona masks, which soon hid rampant political murder.",
        consequences: ["All citizens wear masks by law", "Secret passages and sewer escape hatches flourish"],
      },
      {
        phase: "present_response",
        title: "Duelists in the Shadows",
        summary: "The Shroud, the Bardic College, and the Duke's Guard clash in clandestine street warfare.",
        consequences: ["Midnight bridge duels are common", "City Watch requires passes for traveling after bell-toll"],
      },
    ],
    factions: [
      {
        id: "bardic_college",
        name: "The Bardic College",
        disposition: "Friendly",
        asset: "Acoustic marble academies and printing ateliers",
        agenda: "Preserve artistic truth, educate skilled orators and duelists, and uncover ducal conspiracies.",
      },
      {
        id: "the_shroud",
        name: "The Shroud",
        disposition: "Hostile",
        asset: "Masked safehouses, poison dens, and pawn fronts",
        agenda: "Enrich members through blackmail, eliminate political rivals, and undermine ducal authority.",
      },
      {
        id: "city_guard",
        name: "Meridia City Watch",
        disposition: "Neutral",
        asset: "Water-gate garrisons and armored patrol galleys",
        agenda: "Enforce the curfew, collect harbor tariffs, and quell riots in the lower canal tenements.",
      },
      {
        id: "house_seren",
        name: "House of Seren",
        disposition: "Neutral",
        asset: "Merchant banking houses and spice fleets",
        agenda: "Monopolize overseas trade routes and fund sympathetic candidates for ducal offices.",
      },
    ],
    havenDefaults: {
      name: "The Gilded Swan Inn",
      biome: "Canal Quarter Refuge",
      landmark: "Private Gondola Mooring, Courtyard Fountain, Guarded Hearth",
      description: "A fortified merchant hostelry in a quiet canal cul-de-sac, offering dependable beds, trustworthy information, and secure boat moorings.",
    },
    waterDrainageType: "estuary_canals",
    hazardTable: [
      "Rooftop tile slip while escaping guards (DC 12 DEX or fall to alley)",
      "Canal water splash / pollution (DC 11 CON or sewer fever)",
      "Masked assassin poisoned dart (DC 13 CON or sleep 1d4 rounds)",
      "Pickpocket crowd collision (DC 12 DEX or lose 1d10 gp)",
    ],
    weatherTable: {
      spring: ["Gentle rain pattering on grand piazza cobbles", "Brisk sea breeze scented with roasted chestnuts", "Sunlit morning mist rising from canals", "Clear balmy evening"],
      summer: ["Stifling humid heat trapped between marble walls", "Dense evening sea fog rolling between marble bridges", "Carnival fireworks lighting nighttime waterways", "Sudden summer squall"],
      autumn: ["Brisk canal breeze scented with perfume and chimney smoke", "Chilly maritime drizzle", "Thick fog muffling oar-strokes", "Gloomy overcast with rolling harbor swells"],
      winter: ["Cold freezing drizzle coating marble steps in slick ice", "Bitter sea winds howling down canal corridors", "Pale winter sun reflecting on gray waters", "Quiet snowfall dusting palace cupolas"],
    },
    wanderingMonsterKeys: [
      "duelist",
      "roustabout",
      "bard",
      "necromancer",
      "assassin",
      "thief",
      "guard",
      "wererat",
    ],
  },

  oakhaven_borderlands: {
    id: "oakhaven_borderlands",
    name: "Oakhaven Borderlands",
    theme: "Classic Frontier Sanctuary & Hex Wilderness (Legacy Baseline)",
    sourceVolume: "Shadowdark RPG Core / ASH Baseline",
    sourcePageRef: "ASH dc229a4 baseline",
    provenance: "adapted",
    terrainPriors: [
      { group: "Forest", weight: 35, biomes: ["Ancient Elderwood", "Rocky Foothills", "Enchanted Woods", "Wooded Verge"] },
      { group: "Marsh", weight: 20, biomes: ["Stagnant Swamp", "Peat Bogs", "Reed Riverbanks", "Deep Quagmire"] },
      { group: "Highland", weight: 20, biomes: ["Mountain Ridge", "Granite Peaks", "Highland Pass"] },
      { group: "Valley", weight: 15, biomes: ["Fortified Basin", "Rolling Grasslands", "Fallow Meadows"] },
      { group: "Karst", weight: 10, biomes: ["Subterranean Karst", "Coastal Scrub"] },
    ],
    typicalElevationRange: [0, 3],
    settlementHubRange: [1, 2],
    settlementTypes: [
      {
        name: "Frontier Basin Town",
        description: "Walled market settlement with stone watchtowers and river landing.",
        waterSource: "River Mor freshwater flow",
        foodProvenance: "Barley wealds and cattle enclosures",
        reason: "Crossroads between the coast, dwarven crags, and imperial highroad",
      },
    ],
    historicalLayers: [
      {
        phase: "earlier_occupation",
        title: "Ancient Imperial Outposts",
        summary: "The old Empire constructed paved highroads, stone wayposts, and border watchtowers.",
        consequences: ["Old milestones line the road", "Ruined sentry redoubts survive"],
      },
      {
        phase: "expansion",
        title: "Frontier Settlement Boom",
        summary: "Settlers and miners established Oakhaven and prospector quarries in the hills.",
        consequences: ["Active iron quarries and timber mills operate", "Trade routes connect the valleys"],
      },
      {
        phase: "disruption",
        title: "The Karst Collapse",
        summary: "A massive karst sink opened in the north, severing the deep dwarf tunnels and opening underworld incursions.",
        consequences: ["Great Karst Sinkhole breaches the surface", "Goblins and wights contest the outer perimeter"],
      },
      {
        phase: "present_response",
        title: "Frontier Defense",
        summary: "The Oakhaven Guard fortifies the basin while hiring crawlers to scout the wild hexes.",
        consequences: ["Tavern keepers trade rumors for silver", "Scouts offer rewards for mapping the wild frontier"],
      },
    ],
    factions: [
      {
        id: "oakhaven_guard",
        name: "Oakhaven Guard",
        disposition: "Allied",
        asset: "High watchtower, stone garrison, and gatehouse",
        agenda: "Protect the sanctuary basin and maintain peace within the walls.",
      },
      {
        id: "glimmercap_tinkers",
        name: "Glimmercap Tinkers",
        disposition: "Friendly",
        asset: "Caravan wagons and alchemical stalls",
        agenda: "Trade potions, salvage clockwork curios, and explore strange ruins.",
      },
      {
        id: "iron_gorge_clan",
        name: "Iron Gorge Clan",
        disposition: "Wary",
        asset: "Highland smelters and quarry pits",
        agenda: "Secure iron shipments and defend mountain passes against goblin raiders.",
      },
    ],
    havenDefaults: {
      name: "Oakhaven Sanctuary",
      biome: "Fortified Basin",
      landmark: "High Watchtower, Temple of St. Jude, Taproom, River Docks",
      description: "A fortified frontier basin nestled between mountain spires and ancient elderwoods, offering warm beds, fresh supplies, and safe harbor.",
    },
    waterDrainageType: "river_network",
    hazardTable: [
      "Rockslide in the foothills (DC 12 DEX or 2d6 bludgeoning)",
      "Stagnant sinkhole gases (DC 11 CON or 1 fatigue)",
      "Thorny briar thicket (DC 10 STR or lose 1 torch/ration)",
      "Sudden subterranean fissure (DC 13 DEX or slip near edge)",
    ],
    weatherTable: {
      spring: ["Clear blue skies with crisp mountain wind", "Overcast with mild breeze", "Heavy rain and rolling thunderstorms", "Thick mountain mist clinging to valleys"],
      summer: ["Bright sunshine and dry valley heat", "Pleasant evening breezes", "Sudden summer thunderclap", "Hazy warm stillness"],
      autumn: ["Chilly morning frost and amber leaves", "Dense valley fog", "Crisp autumn winds howling from the north", "Steady gray drizzle"],
      winter: ["Cold biting wind with driving snow", "Frozen mud and rime-crusted branches", "Sub-zero blizzard howling through the gap", "Still crisp winter sunshine"],
    },
    wanderingMonsterKeys: [
      "wolf",
      "bandit",
      "giant_spider",
      "owlbear",
      "goblin",
      "orc",
      "barrow_wight",
      "skeleton",
    ],
  },
};

/**
 * All 15 pairwise setting combinations as detailed in Section 7.2 of the design document.
 */
export const BORDER_PAIRINGS: BorderPairingDefinition[] = [
  {
    id: "gloaming_djurum",
    zoneIds: ["the_gloaming", "red_sands"],
    recommendedConnection: "surface",
    supportedConnections: ["surface", "distant"],
    title: "The Gloaming & The Red Sands",
    transitionMechanism: "Mountain watershed pass with dense woodland and mist on one flank, opening into dry sandstone foothills on the other.",
    sharedConflictOrResource: "Control of the high mountain pass refuge, water cisterns, and timber-for-salt exchange.",
    isLocal19Supported: true,
    notes: "Requires transitional foothills corridor; never immediate wet swamp touching open dune sea without a mountain barrier.",
  },
  {
    id: "gloaming_andrik",
    zoneIds: ["the_gloaming", "midnight_sun"],
    recommendedConnection: "surface",
    supportedConnections: ["surface", "distant"],
    title: "The Gloaming & The Isles of Andrik",
    transitionMechanism: "Cool wooded coast and sheltered island approaches where pine mistwoods meet tidal fjords.",
    sharedConflictOrResource: "Coastal fishing harbors, timber for longship construction, and raider vs pilgrim boundary disputes.",
    isLocal19Supported: true,
    notes: "Uses a temperate maritime margin of Andrik meeting the northern edge of the Gloaming.",
  },
  {
    id: "gloaming_river_of_night",
    zoneIds: ["the_gloaming", "river_of_night"],
    recommendedConnection: "distant",
    supportedConnections: ["distant", "surface"],
    title: "The Gloaming & The Black River",
    transitionMechanism: "Broad climatic river voyage or supernatural mist boundary separating gothic woodlands from primeval jungle.",
    sharedConflictOrResource: "Frontier river trading post, guide treaties, and dispute over ancient barrow relics versus serpent ziggurats.",
    isLocal19Supported: false,
    notes: "Usually a larger linked expedition; local 19-hex display only with justified magical anomaly or broad river journey.",
  },
  {
    id: "gloaming_dwellers",
    zoneIds: ["the_gloaming", "dwellers_in_the_deep"],
    recommendedConnection: "vertical",
    supportedConnections: ["vertical"],
    title: "The Gloaming & Morzomotha",
    transitionMechanism: "Ancient limestone sinkhole, deep burial barrow descent, or ruined priory crypt leading into subterranean karst vaults.",
    sharedConflictOrResource: "Surface timber and grain sent downward in exchange for pure mineral silver and cavern salt.",
    isLocal19Supported: true,
    notes: "Connects on linked map layers through an explicit descent entrance at a surface site.",
  },
  {
    id: "gloaming_city_of_masks",
    zoneIds: ["the_gloaming", "city_of_masks"],
    recommendedConnection: "urban",
    supportedConnections: ["urban", "surface"],
    title: "The Gloaming & The City of Masks",
    transitionMechanism: "Forested river corridor leading into Meridia's cultivated hinterland, estates, and outer canal watergates.",
    sharedConflictOrResource: "Timber rights, charcoal pricing, river toll bridges, and coven covens infiltrating noble salons.",
    isLocal19Supported: true,
    notes: "Regional map connects directly to the urban inset cell for the metropolis.",
  },
  {
    id: "djurum_andrik",
    zoneIds: ["red_sands", "midnight_sun"],
    recommendedConnection: "distant",
    supportedConnections: ["distant"],
    title: "The Red Sands & The Isles of Andrik",
    transitionMechanism: "Extended sea and caravan journey; caravan-to-port transfer docks joined by a multi-day voyage.",
    sharedConflictOrResource: "Long-distance trade in northern whalebone and amber exchanged for southern spices and gold.",
    isLocal19Supported: false,
    notes: "No direct climatic border; modeled as distinct linked regions joined by voyage logistics.",
  },
  {
    id: "djurum_river_of_night",
    zoneIds: ["red_sands", "river_of_night"],
    recommendedConnection: "surface",
    supportedConnections: ["surface", "distant"],
    title: "The Red Sands & The Black River",
    transitionMechanism: "Rain-shadow mountain escarpment with dry desert foothills on one side dropping into a lush tropical river basin.",
    sharedConflictOrResource: "Passage rights through escarpment gorges, irrigation diversions, and differing crop economies.",
    isLocal19Supported: true,
    notes: "Requires a geological divide such as a steep ridge or escarpment preventing direct climate mixing.",
  },
  {
    id: "djurum_dwellers",
    zoneIds: ["red_sands", "dwellers_in_the_deep"],
    recommendedConnection: "vertical",
    supportedConnections: ["vertical"],
    title: "The Red Sands & Morzomotha",
    transitionMechanism: "Deep rock-cut well shafts, abandoned qanat access, or canyon fissure descents to subterranean aquifers.",
    sharedConflictOrResource: "Protection of deep groundwater sources, mineral ore trade, and delver expeditions seeking lost oasis tombs.",
    isLocal19Supported: true,
    notes: "Vertical connection via wellheads, mines, or cavern shafts descending into the deep.",
  },
  {
    id: "djurum_city_of_masks",
    zoneIds: ["red_sands", "city_of_masks"],
    recommendedConnection: "surface",
    supportedConnections: ["surface", "distant"],
    title: "The Red Sands & The City of Masks",
    transitionMechanism: "Dry coastal steppe and scrub hinterland meeting the Trematora river delta and external caravan gate.",
    sharedConflictOrResource: "Caravan quarter market privileges, water rights, and customs duties on overland incense caravans.",
    isLocal19Supported: true,
    notes: "The city's river draws from a wetter catchment beyond the immediate desert verge.",
  },
  {
    id: "andrik_river_of_night",
    zoneIds: ["midnight_sun", "river_of_night"],
    recommendedConnection: "distant",
    supportedConnections: ["distant"],
    title: "The Isles of Andrik & The Black River",
    transitionMechanism: "Extended maritime voyage connecting northern longship harbors to tropical river mouth trading outposts.",
    sharedConflictOrResource: "Supply-chain expedition logistics, amber-for-obsidian exchange, and sea serpent navigational perils.",
    isLocal19Supported: false,
    notes: "Climatic extremes require distinct linked regions connected by a sea journey.",
  },
  {
    id: "andrik_dwellers",
    zoneIds: ["midnight_sun", "dwellers_in_the_deep"],
    recommendedConnection: "vertical",
    supportedConnections: ["vertical"],
    title: "The Isles of Andrik & Morzomotha",
    transitionMechanism: "Tidal sea-cave descents, deep mountain iron mines, or glacier crevasses dropping into sunless vaults.",
    sharedConflictOrResource: "Harbor provisions and boat timbers exchanged for master-forged dverg runic weapons.",
    isLocal19Supported: true,
    notes: "Vertical layer transition through coastal or mountain descent sites.",
  },
  {
    id: "andrik_city_of_masks",
    zoneIds: ["midnight_sun", "city_of_masks"],
    recommendedConnection: "distant",
    supportedConnections: ["distant"],
    title: "The Isles of Andrik & The City of Masks",
    transitionMechanism: "Established maritime trading route linking northern longship merchants to Meridia's High Harbor docks.",
    sharedConflictOrResource: "Northern merchant guild quarter, timber and dried fish imports, and naval security agreements.",
    isLocal19Supported: false,
    notes: "Meridia may contain a northern quarter, while the true northern island archipelago remains a separate region.",
  },
  {
    id: "river_of_night_dwellers",
    zoneIds: ["river_of_night", "dwellers_in_the_deep"],
    recommendedConnection: "vertical",
    supportedConnections: ["vertical"],
    title: "The Black River & Morzomotha",
    transitionMechanism: "Subterranean river swallow-hole, volcanic cave entrance, or sinkhole descent beneath an overgrown ziggurat.",
    sharedConflictOrResource: "Control of subterranean river navigation, obsidian blades traded for subterranean cave minerals.",
    isLocal19Supported: true,
    notes: "Physical layer connection where watercourses continue underground into karst conduits.",
  },
  {
    id: "river_of_night_city_of_masks",
    zoneIds: ["river_of_night", "city_of_masks"],
    recommendedConnection: "surface",
    supportedConnections: ["surface", "distant"],
    title: "The Black River & The City of Masks",
    transitionMechanism: "Navigable warm river corridor flowing downstream into a coastal estuary and harbor metropolis.",
    sharedConflictOrResource: "Upstream agricultural produce and timber floated down to city markets; customs tolls at the river mouth.",
    isLocal19Supported: true,
    notes: "Presents a continuous river highway from inland jungle headwaters to the canal estuary.",
  },
  {
    id: "dwellers_city_of_masks",
    zoneIds: ["dwellers_in_the_deep", "city_of_masks"],
    recommendedConnection: "vertical",
    supportedConnections: ["vertical"],
    title: "Morzomotha & The City of Masks",
    transitionMechanism: "City cisterns, sunken catacombs, forgotten smuggler tunnels, or deep sewer sluices opening into the karst underworld.",
    sharedConflictOrResource: "Sanitation maintenance, smuggling contraband beneath customs gates, and subterranean creature incursions.",
    isLocal19Supported: true,
    notes: "Vertical descent through urban undercroft tunnels into the deeper limestone cavern system.",
  },
];

export function getZoneProfile(zoneId: CursedZoneId): ZoneGenerationProfile {
  return ZONE_PROFILES[zoneId] ?? ZONE_PROFILES.the_gloaming;
}

export function getBorderPairing(
  zoneA: CursedZoneId,
  zoneB: CursedZoneId,
): BorderPairingDefinition | undefined {
  return BORDER_PAIRINGS.find(
    (b) =>
      (b.zoneIds[0] === zoneA && b.zoneIds[1] === zoneB) ||
      (b.zoneIds[0] === zoneB && b.zoneIds[1] === zoneA),
  );
}
