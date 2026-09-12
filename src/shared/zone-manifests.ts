import type { ZoneManifest, ZoneSummary } from "./types.js";

export const STATIC_ZONE_MANIFESTS: Record<string, ZoneManifest> = {
  "city_of_masks": {
    "id": "city_of_masks",
    "name": "The City of Masks (Meridia)",
    "theme": "Canal Metropolis, Masked Aristocracy & Duelist Guilds (Cursed Scroll 6)",
    "biomePalette": [
      "Grape & Olive Terraces",
      "Market Garden Allotments",
      "Trematora Estuary",
      "Grand Shipping Canal",
      "Cobblestone Piazza",
      "Grand Canal Embankment",
      "Forested River Approach",
      "Pasture Meadows",
      "Salt Marshes",
      "Estuary Reedbeds"
    ],
    "hazardTable": [
      "Rooftop tile slip while escaping guards (DC 12 DEX or fall to alley)",
      "Canal water splash / pollution (DC 11 CON or sewer fever)",
      "Masked assassin poisoned dart (DC 13 CON or sleep 1d4 rounds)",
      "Pickpocket crowd collision (DC 12 DEX or lose 1d10 gp)"
    ],
    "weatherTable": [
      "Gentle rain pattering on grand piazza cobbles",
      "Dense evening sea fog rolling between marble bridges",
      "Brisk canal breeze scented with perfume and chimney smoke",
      "Bitter sea winds howling down canal corridors"
    ],
    "wanderingMonsterTable": [
      "duelist",
      "roustabout",
      "bard",
      "necromancer",
      "assassin",
      "thief",
      "guard",
      "wererat"
    ],
    "factions": [
      {
        "name": "The Bardic College",
        "disposition": "Friendly",
        "notes": "Preserve artistic truth, educate skilled orators and duelists, and uncover ducal conspiracies."
      },
      {
        "name": "The Shroud",
        "disposition": "Hostile",
        "notes": "Enrich members through blackmail, eliminate political rivals, and undermine ducal authority."
      },
      {
        "name": "Meridia City Watch",
        "disposition": "Neutral",
        "notes": "Enforce the curfew, collect harbor tariffs, and quell riots in the lower canal tenements."
      },
      {
        "name": "House of Seren",
        "disposition": "Neutral",
        "notes": "Monopolize overseas trade routes and fund sympathetic candidates for ducal offices."
      }
    ],
    "uniqueFloraFauna": [
      "Trematora River aqueducts and deep artesian city cisterns",
      "River barge grain imports, coastal fishing fleets, and hinterland market gardens",
      "Private Gondola Mooring"
    ],
    "entryConditions": "Expedition access point into The City of Masks (Meridia).",
    "exitConditions": "Waymarked return route to Meridia (The Rooks)."
  },
  "dwellers_in_the_deep": {
    "id": "dwellers_in_the_deep",
    "name": "Morzomotha & Karst Deeps",
    "theme": "Subterranean Karst, Sunless Libraries & Delver Pits (Cursed Scroll 5)",
    "biomePalette": [
      "Stalactite Gallery",
      "Echoing Limestone Vault",
      "Dripping Flowstone Cavern",
      "Flooded Cave Siphon",
      "Claustrophobic Crawlway",
      "Twisting Fissure",
      "Great Karst Sinkhole",
      "Bottomless Chasm",
      "Subterranean River",
      "Sunless Lake",
      "Delver Enclave",
      "Bioluminescent Fungus Grove"
    ],
    "hazardTable": [
      "Falling stalactites from subterranean tremors (DC 13 DEX or 2d8 damage)",
      "Bioluminescent spore puff (DC 12 CON or hallucinatory visions)",
      "Chasm rope bridge snapping (DC 14 DEX to catch ledge)",
      "Flooded cave siphon rush (DC 12 STR or swept 1 chamber down)"
    ],
    "weatherTable": [
      "Stagnant cool air dripping with limestone mineral water",
      "Dense humid cave mist hanging over underground pools",
      "Chilly damp cave winds",
      "Frozen flowstone cascades in upper passages"
    ],
    "wanderingMonsterTable": [
      "bezelak",
      "dremir",
      "librarian_of_leng",
      "nuln",
      "morzo_moth",
      "wendel",
      "cave_creeper",
      "troglodyte"
    ],
    "factions": [
      {
        "name": "Deep Delver Guild",
        "disposition": "Friendly",
        "notes": "Map subterranean corridors, secure profitable silver lodes, and maintain rescue routes to the surface."
      },
      {
        "name": "Librarians of Leng",
        "disposition": "Hostile",
        "notes": "Guard occult manuscripts from surface barbarians and preserve cosmic secrets in darkness."
      },
      {
        "name": "Karst Troglodyte Packs",
        "disposition": "Neutral",
        "notes": "Defend their mushroom beds, acquire iron scrap, and ambush careless travelers lacking light."
      }
    ],
    "uniqueFloraFauna": [
      "Pure mineral seepage collected in clean stone basins",
      "Imported smoked meats, iron rations, and cultivated glow-lichen paste",
      "Surface Hoist Winch"
    ],
    "entryConditions": "Expedition access point into Morzomotha & Karst Deeps.",
    "exitConditions": "Waymarked return route to Maugrinhold."
  },
  "midnight_sun": {
    "id": "midnight_sun",
    "name": "The Isles of Andrik",
    "theme": "Glacial Fjords, Northern Gods & Sea Wolf Raiders (Cursed Scroll 3)",
    "biomePalette": [
      "Deep Glacial Fjord",
      "Outer Island Sound",
      "Pebble Beach Harbor",
      "Basalt Sea Cliffs",
      "Pine-Clad Slopes",
      "Birch Fjord Verge",
      "Barley Steading Valley",
      "Moss Meadow",
      "Snow-Dusted Crags",
      "Granite Needle Peaks",
      "Glacial Tongue",
      "Blue Ice Ridge"
    ],
    "hazardTable": [
      "Freezing sea spray (DC 12 CON or frostbite fatigue)",
      "Crevasse ice shelf collapse (DC 13 DEX or fall 20ft)",
      "Sudden blizzard whiteout (DC 12 WIS to maintain navigation)",
      "Slippery glacier incline (DC 11 DEX or slide into freezing water)"
    ],
    "weatherTable": [
      "Cool glassy waters under pale midnight twilight",
      "Calm fjord waters reflecting snow-peaks",
      "Brilliant solar aurora dancing across ice-peaks",
      "Howling sub-zero blizzard across the ice-shelf"
    ],
    "wanderingMonsterTable": [
      "drake_lesser",
      "drake_greater",
      "draugr",
      "dverg",
      "nord",
      "sea_nymph",
      "sea_serpent",
      "werebear"
    ],
    "factions": [
      {
        "name": "Sea Wolf Clans",
        "disposition": "Wary",
        "notes": "Defend harbor waters, maintain sworn oaths of fealty, and raid rival islands for plunder."
      },
      {
        "name": "Seers of the Northern Gods",
        "disposition": "Neutral",
        "notes": "Appease the sky gods, interpret auroral portents, and enforce sacred hospitality laws."
      },
      {
        "name": "Andrik Freeholders",
        "disposition": "Friendly",
        "notes": "Safeguard livestock and grain stores against raiders, trolls, and the freezing sea spray."
      }
    ],
    "uniqueFloraFauna": [
      "Rushing glacial melt stream and freshwater fjord springs",
      "Hardy barley, dairy cattle, salted cod, and foraged lingonberries",
      "Great Longhouse"
    ],
    "entryConditions": "Expedition access point into The Isles of Andrik.",
    "exitConditions": "Waymarked return route to Valthis."
  },
  "red_sands": {
    "id": "red_sands",
    "name": "The Red Sands (Djurum)",
    "theme": "Sun-Baked Desert, Fighting Pits & Burning Tombs (Cursed Scroll 2)",
    "biomePalette": [
      "Bleached Stone Flats",
      "Basalt Scree",
      "Crimson Dune Sea",
      "Shifting Crests",
      "Red Sandstone Gorge",
      "Shadowed Escarpment",
      "Dry Wadi Wash",
      "Thorn Scrub Steppe",
      "Blinding Salt Flats",
      "Alkali Sink",
      "Palm Oasis",
      "Natural Spring Alcove"
    ],
    "hazardTable": [
      "Blinding sandstorm (DC 12 CON or blinded and disoriented)",
      "Extreme heat exhaustion (DC 13 CON or consume double water)",
      "Shifting sink-dune (DC 12 DEX or tumble into pit)",
      "Sunstroke mirage (DC 11 WIS or waste half day chasing false oasis)"
    ],
    "weatherTable": [
      "Warm desert breeze with clear skies",
      "Scorching sirocco gusts whipping crimson sand",
      "Brisk dry breeze kicking up sand grains",
      "Crisp sunny midday"
    ],
    "wanderingMonsterTable": [
      "camel_silver",
      "canyon_ape",
      "dunefiend",
      "dust_devil",
      "mirage",
      "ras_godai",
      "scrag",
      "siruul"
    ],
    "factions": [
      {
        "name": "Thraxis Arena Masters",
        "disposition": "Neutral",
        "notes": "Host grand combat tournaments, recruit skilled mercenaries, and enforce martial honor."
      },
      {
        "name": "Burning Brothers",
        "disposition": "Hostile",
        "notes": "Cleanse the desert with flame and claim ancient solar relics for their salamander god."
      },
      {
        "name": "Djurum Water Keepers",
        "disposition": "Friendly",
        "notes": "Repair cracked conduits, ration spring water, and punish those who pollute the wells."
      }
    ],
    "uniqueFloraFauna": [
      "Perennial artesian spring fed by deep sandstone aquifers",
      "Date palms, goat milk, roasted barley, and imported figs",
      "Artesian Spring Basin"
    ],
    "entryConditions": "Expedition access point into The Red Sands (Djurum).",
    "exitConditions": "Waymarked return route to Alkesh."
  },
  "river_of_night": {
    "id": "river_of_night",
    "name": "The Black River",
    "theme": "Primeval Jungle, Ziggurats & Basilisk Cults (Cursed Scroll 4)",
    "biomePalette": [
      "Canopy Rainforest",
      "Upland Ironwood Jungle",
      "Black River Trunk",
      "Silt Riverbank",
      "Flooded Swamp Basin",
      "Oxbow Lagoon",
      "Itzalca Maize Terraces",
      "Riverside Fish-Trap Reaches",
      "Basalt Volcanic Outcrop",
      "Obsidian Ridge"
    ],
    "hazardTable": [
      "Swarm of army ants (DC 12 DEX or 2d6 piercing damage)",
      "Toxic river leeches (DC 11 CON or drained 1d4 HP)",
      "Falling canopy branch / deadfall (DC 12 DEX or 1d8 bludgeoning)",
      "Poisonous vine scratch (DC 13 CON or paralyzed 1 round)"
    ],
    "weatherTable": [
      "Warm morning canopy mist",
      "Torrents of warm deluge flooding low channels",
      "Warm steady river breezes",
      "Lower water exposing treacherous rapids"
    ],
    "wanderingMonsterTable": [
      "anaconda_giant",
      "ant_giant",
      "basilisk_cultists",
      "basilisk_hatchling",
      "blue_dart_frog",
      "catfish_giant",
      "condor_dire",
      "jaguar_king"
    ],
    "factions": [
      {
        "name": "Itzalca Free Communities",
        "disposition": "Friendly",
        "notes": "Preserve tribal autonomy, fish the waterways, and drive off dangerous cultists."
      },
      {
        "name": "Priests of the Emerald Basilisk",
        "disposition": "Hostile",
        "notes": "Subjugate river communities, harvest venom, and awaken primeval serpent deities."
      },
      {
        "name": "Black River Guides",
        "disposition": "Neutral",
        "notes": "Charter canoe expeditions, trade exotic pelts, and scout unmapped inland tributaries."
      }
    ],
    "uniqueFloraFauna": [
      "Rushing tributary spring filtered through volcanic basalt",
      "River catfish, maize terraces, wild cassava, and sweet papayas",
      "Palisade Watchtower"
    ],
    "entryConditions": "Expedition access point into The Black River.",
    "exitConditions": "Waymarked return route to Tecuhan."
  },
  "the_gloaming": {
    "id": "the_gloaming",
    "name": "The Gloaming",
    "theme": "Gothic Mistwood, Witchcraft & Barrow Mounds (Cursed Scroll 1)",
    "biomePalette": [
      "Ancient Elderwood",
      "Twisted Woodlands",
      "Peat Bogs",
      "Mist Fen",
      "Heathland",
      "Overgrown Commons",
      "Woodcutter Clearings",
      "Charcoal Verge",
      "Rocky Ridge",
      "Standing Stone Crest"
    ],
    "hazardTable": [
      "Bitter Spore Fog (DC 12 CON or coughing fits / reveal stealth)",
      "Quicksand Barrow (DC 13 DEX or sink 1 step per round)",
      "Corrupted Standing Stones (DC 12 WIS or eerie nightmares)",
      "Creeping Blood-Thorns (DC 11 STR or 1d6 piercing)"
    ],
    "weatherTable": [
      "Perpetual drizzling mist",
      "Dense insect-swarming warmth",
      "Dense pea-soup fog reducing sight to close",
      "Frost-rimed barrows and brittle reed beds"
    ],
    "wanderingMonsterTable": [
      "bittermold",
      "bogthorn",
      "dralech",
      "hexling",
      "howler",
      "ichor_ooze",
      "marrow_fiend",
      "skrell"
    ],
    "factions": [
      {
        "name": "Knights of St. Ydris",
        "disposition": "Friendly",
        "notes": "Protect pilgrims, maintain the sacred lantern trails, and cleanse barrow horrors."
      },
      {
        "name": "Coven of Bittermold",
        "disposition": "Hostile",
        "notes": "Brew potent curse draughts and awaken slumbering primeval powers beneath the mounds."
      },
      {
        "name": "Gloaming Fen-Herders",
        "disposition": "Neutral",
        "notes": "Preserve independent marsh rights and trade medicinal herbs to anyone with silver."
      }
    ],
    "uniqueFloraFauna": [
      "Clear forest brook and timber-shored spring",
      "Small turnip plots, trapped hare, and smoked boar",
      "The Crayfish Tavern and Timber Palisade"
    ],
    "entryConditions": "Expedition access point into The Gloaming.",
    "exitConditions": "Waymarked return route to Marin's Hold."
  }
};

export function listStaticZones(): ZoneSummary[] {
  return Object.values(STATIC_ZONE_MANIFESTS).map((z) => ({
    id: z.id,
    name: z.name,
    theme: z.theme,
    biomePalette: z.biomePalette,
  }));
}

export function getStaticZoneManifest(zoneId: string): ZoneManifest | undefined {
  return STATIC_ZONE_MANIFESTS[zoneId];
}
