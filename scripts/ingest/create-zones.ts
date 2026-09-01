import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

export interface ZoneManifest {
  id: string;
  name: string;
  theme: string;
  biomePalette: string[];
  hazardTable: string[];
  weatherTable: string[];
  wanderingMonsterTable: string[];
  factions: Array<{ name: string; disposition: string; notes: string }>;
  uniqueFloraFauna: string[];
  entryConditions: string;
  exitConditions: string;
}

export const ZONES: Array<{ manifest: ZoneManifest; lore: string }> = [
  {
    manifest: {
      id: "oakhaven_borderlands",
      name: "Oakhaven Borderlands",
      theme: "Classic Frontier Sanctuary & Hex Wilderness",
      biomePalette: ["forest", "marsh", "mountain", "foothills", "karst"],
      hazardTable: [
        "Rockslide in the foothills (DC 12 DEX or 2d6 bludgeoning)",
        "Stagnant sinkhole gases (DC 11 CON or 1 fatigue)",
        "Thorny briar thicket (DC 10 STR or lose 1 torch/ration)",
        "Sudden subterranean fissure (DC 13 DEX or slip near edge)",
      ],
      weatherTable: [
        "Clear blue skies with crisp mountain wind",
        "Overcast with mild breeze",
        "Heavy rain and rolling thunderstorms",
        "Thick mountain mist clinging to valleys",
      ],
      wanderingMonsterTable: [
        "wolf",
        "bandit",
        "giant_spider",
        "owlbear",
        "goblin",
        "orc",
        "barrow_wight",
        "skeleton",
      ],
      factions: [
        { name: "Oakhaven Guard", disposition: "Allied", notes: "Protectors of the sanctuary basin." },
        { name: "Glimmercap Tinkers", disposition: "Friendly", notes: "Forest gnomes trading alchemy and gear." },
        { name: "Iron Gorge Clan", disposition: "Wary", notes: "Orcish iron smelters and miners." },
      ],
      uniqueFloraFauna: ["Glimmercap mushrooms", "Ironwood pine", "Highland stag"],
      entryConditions: "Open frontier accessible from Oakhaven sanctuary basin.",
      exitConditions: "Safe haven gates of Oakhaven always open to friendly crawlers.",
    },
    lore: `# Oakhaven Borderlands

The core 19-hex frontier basin nestled between rugged mountain spires, primeval elderwoods, and subterranean karst descents. Oakhaven stands as the central sanctuary of warmth and law.`,
  },
  {
    manifest: {
      id: "the_gloaming",
      name: "The Gloaming",
      theme: "Gothic Mistwood, Witchcraft & Barrow Mounds (Cursed Scroll 1)",
      biomePalette: ["forest", "marsh", "moor"],
      hazardTable: [
        "Bitter Spore Fog (DC 12 CON or coughing fits / reveal stealth)",
        "Quicksand Barrow (DC 13 DEX or sink 1 step per round)",
        "Corrupted Standing Stones (DC 12 WIS or eerie nightmares)",
        "Creeping Blood-Thorns (DC 11 STR or 1d6 piercing)",
      ],
      weatherTable: [
        "Chilling mist & perpetual gray drizzle",
        "Dense pea-soup fog reducing line of sight to close",
        "Sudden gale with freezing rain",
        "Pale sickly moonlight filtering through knotted boughs",
      ],
      wanderingMonsterTable: [
        "bittermold",
        "bogthorn",
        "dralech",
        "hexling",
        "howler",
        "ichor_ooze",
        "marrow_fiend",
        "skrell",
      ],
      factions: [
        { name: "Knights of St. Ydris", disposition: "Friendly", notes: "Holy champions defending pilgrim shrines." },
        { name: "Coven of Bittermold", disposition: "Hostile", notes: "Witches brewing pestilence and curses." },
      ],
      uniqueFloraFauna: ["Bittermold caps", "Grave-moss", "Witchwood briars"],
      entryConditions: "Travel north across the fog-shrouded marsh.",
      exitConditions: "Follow the sacred lantern posts back to civilization.",
    },
    lore: `# The Gloaming

A haunted expanse of mist-drenched barrows, crooked timber huts, and forgotten henge stones where ancient coves practice blood magic.`,
  },
  {
    manifest: {
      id: "red_sands",
      name: "The Red Sands (Djurum)",
      theme: "Sun-Baked Desert, Fighting Pits & Burning Tombs (Cursed Scroll 2)",
      biomePalette: ["desert", "canyon", "badlands"],
      hazardTable: [
        "Blinding sandstorm (DC 12 CON or blinded and disoriented)",
        "Extreme heat exhaustion (DC 13 CON or consume double water)",
        "Shifting sink-dune (DC 12 DEX or tumble into pit)",
        "Sunstroke mirage (DC 11 WIS or waste half day chasing false oasis)",
      ],
      weatherTable: [
        "Blistering sun and baking dry heat",
        "Scorching sirocco gusts whipping crimson sand",
        "Bitter freezing desert night with glittering stars",
        "Violent dust devil swirling across the flats",
      ],
      wanderingMonsterTable: [
        "camel_silver",
        "canyon_ape",
        "dunefiend",
        "dust_devil",
        "mirage",
        "ras_godai",
        "scrag",
        "siruul",
      ],
      factions: [
        { name: "Thraxis Gladiators", disposition: "Neutral", notes: "Arena masters honoring single combat." },
        { name: "Burning Brothers", disposition: "Hostile", notes: "Salamander cultists occupying the iron fortress." },
      ],
      uniqueFloraFauna: ["Cactus water-gourds", "Crimson scorpions", "Dune camels"],
      entryConditions: "Pass through the sun-bleached sandstone gorge.",
      exitConditions: "Reach the fortified caravan caravanserai.",
    },
    lore: `# The Red Sands (Djurum)

A vast desert of blood-red sand dunes, gladiatorial arena strongholds, and volcanic iron fortresses.`,
  },
  {
    manifest: {
      id: "midnight_sun",
      name: "The Isles of Andrik",
      theme: "Glacial Fjords, Northern Gods & Sea Wolf Raiders (Cursed Scroll 3)",
      biomePalette: ["tundra", "fjord", "glacial_sea"],
      hazardTable: [
        "Freezing sea spray (DC 12 CON or frostbite fatigue)",
        "Crevasse ice shelf collapse (DC 13 DEX or fall 20ft)",
        "Sudden blizzard whiteout (DC 12 WIS to maintain navigation)",
        "Slippery glacier incline (DC 11 DEX or slide into freezing water)",
      ],
      weatherTable: [
        "Brilliant solar aurora dancing across ice-peaks",
        "Howling sub-zero blizzard",
        "Calm glassy sea with drifting icebergs",
        "Freezing rain glazing longships in ice",
      ],
      wanderingMonsterTable: [
        "drake_lesser",
        "drake_greater",
        "draugr",
        "dverg",
        "nord",
        "sea_nymph",
        "sea_serpent",
        "werebear",
      ],
      factions: [
        { name: "Sea Wolf Clans", disposition: "Wary", notes: "Longship raiders honoring strength and oaths." },
        { name: "Seers of the Northern Gods", disposition: "Neutral", notes: "Prophets casting runic whalebones." },
      ],
      uniqueFloraFauna: ["Frost-lichen", "Dire walrus", "Arctic orca"],
      entryConditions: "Sail aboard a reinforced longship into northern waters.",
      exitConditions: "Row south toward temperate harbors before the freeze sets in.",
    },
    lore: `# The Isles of Andrik (Midnight Sun)

Frozen archipelago where dragon-headed longships ply icy waters beneath eternal auroras and draugr slumber in sea caves.`,
  },
  {
    manifest: {
      id: "river_of_night",
      name: "The Black River",
      theme: "Primeval Jungle, Ziggurats & Basilisk Cults (Cursed Scroll 4)",
      biomePalette: ["jungle", "mangrove", "swamp"],
      hazardTable: [
        "Swarm of army ants (DC 12 DEX or 2d6 piercing damage)",
        "Toxic river leeches (DC 11 CON or drained 1d4 HP)",
        "Falling canopy branch / deadfall (DC 12 DEX or 1d8 bludgeoning)",
        "Poisonous vine scratch (DC 13 CON or paralyzed 1 round)",
      ],
      weatherTable: [
        "Oppressive tropical humidity and steamy heat",
        "Torrents of warm monsoon deluge",
        "Sudden solar eclipse dimming jungle into twilight",
        "Heavy canopy mist dampening all sound",
      ],
      wanderingMonsterTable: [
        "anaconda_giant",
        "ant_giant",
        "basilisk_cultists",
        "basilisk_hatchling",
        "blue_dart_frog",
        "catfish_giant",
        "condor_dire",
        "jaguar_king",
      ],
      factions: [
        { name: "Jungle Rangers", disposition: "Friendly", notes: "Survivalists charting primeval ruins." },
        { name: "Basilisk Cult", disposition: "Hostile", notes: "Zealots worshipping venomous primordial deities." },
      ],
      uniqueFloraFauna: ["Blue dart frogs", "Ironbark mangroves", "Carnivorous orchids"],
      entryConditions: "Paddle upstream along the dark jungle tributaries.",
      exitConditions: "Float downstream to coastal river trading posts.",
    },
    lore: `# The Black River (River of Night)

Steaming jungle canopy covering lost stepped ziggurats, serpentine horrors, and basilisk-worshipping cults.`,
  },
  {
    manifest: {
      id: "dwellers_in_the_deep",
      name: "Morzomotha & Karst Deeps",
      theme: "Subterranean Karst, Sunless Libraries & Delver Pits (Cursed Scroll 5)",
      biomePalette: ["karst", "cavern", "sunless_abyss"],
      hazardTable: [
        "Falling stalactites from subterranean tremors (DC 13 DEX or 2d8 damage)",
        "Bioluminescent spore puff (DC 12 CON or hallucinatory visions)",
        "Chasm rope bridge snapping (DC 14 DEX to catch ledge)",
        "Flooded cave siphon rush (DC 12 STR or swept 1 chamber down)",
      ],
      weatherTable: [
        "Stagnant cool air dripping with limestone mineral water",
        "Warm sulfur draft blowing up from deep planar fissures",
        "Total lightless silence broken only by clicking chitin",
        "Echoing wind howling through vast subterranean vaults",
      ],
      wanderingMonsterTable: [
        "bezelak",
        "dremir",
        "librarian_of_leng",
        "nuln",
        "morzo_moth",
        "wendel",
        "cave_creeper",
        "troglodyte",
      ],
      factions: [
        { name: "Deep Delver Guild", disposition: "Friendly", notes: "Spelunkers mapping lost tunnels." },
        { name: "Librarians of Leng", disposition: "Hostile", notes: "Alien scholars guarding eldritch scrolls." },
      ],
      uniqueFloraFauna: ["Morzo moths", "Bioluminescent glow-lichen", "Blind cave fish"],
      entryConditions: "Rappel down the Great Sinkhole in Hex 06.",
      exitConditions: "Climb the anchored chains back to the surface.",
    },
    lore: `# Morzomotha & Karst Deeps

An immense subterranean underworld of flooded limestone caverns, vertical sinkholes, and the eldritch Library of Leng.`,
  },
  {
    manifest: {
      id: "city_of_masks",
      name: "The City of Masks",
      theme: "Canal Metropolis, Masked Aristocracy & Duelist Guilds (Cursed Scroll 6)",
      biomePalette: ["urban", "canals", "catacombs"],
      hazardTable: [
        "Rooftop tile slip while escaping guards (DC 12 DEX or fall to alley)",
        "Canal water splash / pollution (DC 11 CON or sewer fever)",
        "Masked assassin poisoned dart (DC 13 CON or sleep 1d4 rounds)",
        "Pickpocket crowd collision (DC 12 DEX or lose 1d10 gp)",
      ],
      weatherTable: [
        "Brisk canal breeze scented with perfume and roasted chestnut smoke",
        "Dense evening sea fog rolling between marble bridges",
        "Carnival fireworks lighting up nighttime waterways",
        "Gentle rain pattering on grand piazza cobbles",
      ],
      wanderingMonsterTable: [
        "duelist",
        "roustabout",
        "bard",
        "necromancer",
        "assassin",
        "thief",
        "guard",
        "wererat",
      ],
      factions: [
        { name: "College of Bards", disposition: "Friendly", notes: "Performers, skalds, and lorekeepers." },
        { name: "Masked Syndicate", disposition: "Wary", notes: "Shadowy aristocrats manipulating city politics." },
      ],
      uniqueFloraFauna: ["Canal swans", "Piazza pigeons", "Gilded masks"],
      entryConditions: "Pass through the Grand Water Gate by gondola.",
      exitConditions: "Take the western highway coaches or charter a canal vessel.",
    },
    lore: `# The City of Masks

A labyrinthine canal metropolis where every citizen wears a persona mask, duelists clash on moonlit bridges, and secret factions trade in secrets and magic.`,
  },
];

export function runZoneGeneration() {
  const zonesDir = resolve("zones");
  mkdirSync(zonesDir, { recursive: true });

  for (const { manifest, lore } of ZONES) {
    const dir = resolve(zonesDir, manifest.id);
    mkdirSync(dir, { recursive: true });
    writeFileSync(resolve(dir, "manifest.json"), JSON.stringify(manifest, null, 2), "utf-8");
    writeFileSync(resolve(dir, "lore.md"), lore, "utf-8");
    console.log(`Generated zone: ${manifest.name} -> zones/${manifest.id}`);
  }
}

if (process.argv[1]?.endsWith("create-zones.ts")) {
  runZoneGeneration();
}
