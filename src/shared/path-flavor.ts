/**
 * Per-path flavour for site generation. These are the inputs a site brief needs
 * before anyone writes its exact wording: what the places here are called, what
 * lives in them, and what vocabulary the objectives draw on.
 *
 * Keyed to the same path ids as OBJECTIVE_PATH_PROFILES in the site-objective
 * generator. `regional` covers ordinary work with no path behind it; it is a
 * profile you select deliberately, never a silent fallback for an unknown id.
 */

/** Families as the bestiary records them. */
export type MonsterFamily =
  | "Aberration" | "Beast" | "Celestial" | "Construct" | "Dragon" | "Elemental"
  | "Fey" | "Fiend" | "Giant" | "Humanoid" | "Monstrosity" | "Ooze" | "Plant" | "Undead";

export interface PathFlavorProfile {
  /** Human-readable label for briefs and dumps. */
  label: string;
  /** Extra site-name columns mixed with the generic oracle, weighted toward the path. */
  siteForms: string[];
  siteQualifiers: string[];
  siteSubjects: string[];
  /** Adjectives attached to a generated target: "the {epithet} {form}". */
  epithets: string[];
  /** What the path's things belong to: "the Reliquary of {subject}". */
  subjects: string[];
  /** Ranks a commander or guardian holds here. */
  titles: string[];
  /** Weighted family pool the site's monsters are drawn from. */
  familyWeights: Array<{ family: MonsterFamily; weight: number }>;
  /** Always eligible regardless of family weighting, level permitting. */
  signatureMonsters: string[];
}

export const PATH_FLAVOR_PROFILES: Record<string, PathFlavorProfile> = {
  domains_of_dread: {
    label: "Domains of Dread",
    siteForms: ["Manse", "Chapel", "Barrow", "Village"],
    siteQualifiers: ["Haunted", "Cursed", "Sealed", "Weeping"],
    siteSubjects: ["Darklord", "Bargain", "Mists", "Bride"],
    epithets: ["mist-bound", "consecrated", "grieving", "sworn", "unquiet", "pledged"],
    subjects: ["the old pact", "the boundary", "the ruler's Fall", "the first victim", "the domain's law", "the family line"],
    titles: ["Burgomaster", "Warden of the Gate", "Chaplain", "Master of Hounds"],
    familyWeights: [
      { family: "Undead", weight: 5 }, { family: "Humanoid", weight: 3 },
      { family: "Fiend", weight: 2 }, { family: "Beast", weight: 2 }, { family: "Fey", weight: 1 },
    ],
    signatureMonsters: ["vampire", "vampire_spawn", "wight", "werewolf", "ghost", "wraith", "zombie", "hag_night"],
  },
  the_mind_below: {
    label: "The Night Below",
    siteForms: ["Waterworks", "Cistern", "Undercity", "Depths"],
    siteQualifiers: ["Drowned", "Sealed", "Quiet", "Rewritten"],
    siteSubjects: ["Savant", "Held Minds", "Transfer", "Deep Choir"],
    epithets: ["brine-slick", "mind-marked", "silt-choked", "obedient", "returned", "hollowed"],
    subjects: ["the transport route", "the control network", "the held minds", "the savant's reach", "the descent", "the surrendered memory"],
    titles: ["Overseer", "Transfer Clerk", "Tidewarden", "Chorus-Keeper"],
    familyWeights: [
      { family: "Aberration", weight: 5 }, { family: "Monstrosity", weight: 3 },
      { family: "Humanoid", weight: 3 }, { family: "Beast", weight: 1 }, { family: "Ooze", weight: 1 },
    ],
    signatureMonsters: ["aboleth", "chuul", "deep_one", "brain_eater", "grimlow", "duergar", "drow"],
  },
  titans: {
    label: "Titans",
    siteForms: ["Prison", "Forge", "Ravine", "Stronghold"],
    siteQualifiers: ["Breached", "Bound", "Sundered", "Unfinished"],
    siteSubjects: ["Restraint", "Warden", "Seal", "Fallen Giant"],
    epithets: ["iron-banded", "load-bearing", "fault-cracked", "wardsmith's", "chained", "surveyed"],
    subjects: ["the prison seal", "the binding rite", "the warden's charge", "the release deed", "the fault line", "the restraint chain"],
    titles: ["Warden", "Seal-Keeper", "Chain Master", "Surveyor of Faults"],
    familyWeights: [
      { family: "Giant", weight: 5 }, { family: "Elemental", weight: 3 },
      { family: "Construct", weight: 3 }, { family: "Monstrosity", weight: 2 }, { family: "Humanoid", weight: 1 },
    ],
    signatureMonsters: ["giant_stone", "giant_storm", "giant_fire", "giant_hill", "golem_stone", "elemental_earth", "cyclops"],
  },
  tharizdun: {
    label: "Tharizdun / Unmaking",
    siteForms: ["Monolith", "Archive", "Maze", "Undercity"],
    siteQualifiers: ["Forgotten", "Rewritten", "Hollow", "Unfinished"],
    siteSubjects: ["Erasure", "Missing Place", "Chronicler", "Blank"],
    epithets: ["unrecorded", "scraped", "nameless", "last-copy", "surviving", "uncounted"],
    subjects: ["the erased distinction", "the missing district", "the surviving reference", "the containment boundary", "the older map", "the unmade name"],
    titles: ["Chronicler", "Keeper of Copies", "Boundary Surveyor", "Rememberer"],
    familyWeights: [
      { family: "Aberration", weight: 5 }, { family: "Fiend", weight: 2 },
      { family: "Ooze", weight: 2 }, { family: "Undead", weight: 2 }, { family: "Monstrosity", weight: 2 },
    ],
    signatureMonsters: ["void_spawn", "void_spider", "void_being", "cloaker", "gibbering_mouther", "black_pudding", "shadow"],
  },
  bane: {
    label: "Bane / Tyranny",
    siteForms: ["Garrison", "Courthouse", "Keep", "Toll House"],
    siteQualifiers: ["Contested", "Shuttered", "Sealed", "Starved"],
    siteSubjects: ["Writ", "Enforcer", "Office", "Seizure"],
    epithets: ["countersigned", "sealed", "requisitioned", "sworn", "posted", "back-dated"],
    subjects: ["the seizure writ", "the enabling office", "the garrison roll", "the local enforcement", "the succession", "the confiscated estate"],
    titles: ["Magistrate", "Captain of the Watch", "Writ-Server", "Provost"],
    familyWeights: [
      { family: "Humanoid", weight: 5 }, { family: "Fiend", weight: 2 },
      { family: "Undead", weight: 2 }, { family: "Beast", weight: 1 }, { family: "Construct", weight: 1 },
    ],
    signatureMonsters: ["knight", "soldier", "gladiator", "devil_barbed", "hobgoblin", "thug", "guard"],
  },
  cthulhu: {
    label: "Cthulhu Rises",
    siteForms: ["Pier", "Wreck", "Trench", "Chapel"],
    siteQualifiers: ["Drowned", "Waking", "Sealed", "Barren"],
    siteSubjects: ["Gate", "Dreamer", "Tide", "Star-Spawn"],
    epithets: ["salt-crusted", "tide-marked", "dreaming", "submerged", "barnacled", "star-cut"],
    subjects: ["the ocean gate", "the dreamers' movement", "the arrival pier", "the projection chamber", "the binding cadence", "the sunken network"],
    titles: ["Harbourmaster", "Tide-Priest", "Acolyte of the Deep", "Net Captain"],
    familyWeights: [
      { family: "Aberration", weight: 4 }, { family: "Monstrosity", weight: 3 },
      { family: "Humanoid", weight: 3 }, { family: "Beast", weight: 3 }, { family: "Ooze", weight: 1 },
    ],
    signatureMonsters: ["deep_one", "sahuagin", "kraken", "sea_serpent", "chuul", "merfolk", "octopus_giant", "aboleth"],
  },
  nyarlathotep: {
    label: "Nyarlathotep / The Mask",
    siteForms: ["Chancery", "Playhouse", "Undercity", "Warrens"],
    siteQualifiers: ["Rewritten", "Shuttered", "Quiet", "Contested"],
    siteSubjects: ["Mask", "Warrant", "Beneficiary", "Understudy"],
    epithets: ["countersigned", "borrowed", "unwitnessed", "masked", "third-hand", "revoked"],
    subjects: ["the custody warrant", "the beneficiary", "the maker's designation", "the issuing office", "the borrowed face", "the standing mandate"],
    titles: ["Warrant Clerk", "Custodian", "The Envoy", "Registrar"],
    familyWeights: [
      { family: "Humanoid", weight: 4 }, { family: "Fiend", weight: 3 },
      { family: "Aberration", weight: 3 }, { family: "Undead", weight: 2 }, { family: "Monstrosity", weight: 1 },
    ],
    signatureMonsters: ["doppelganger", "cultist", "rakshasa", "shadow", "mordanticus_the_flayed", "assassin", "medusa"],
  },
  shub_niggurath: {
    label: "Shub-Niggurath / Forced Increase",
    siteForms: ["Nursery", "Garden", "Warrens", "Grotto"],
    siteQualifiers: ["Blighted", "Starved", "Waking", "Buried"],
    siteSubjects: ["Brood", "Regulator", "Herd", "Seedbed"],
    epithets: ["overfed", "rank", "spore-dusted", "swollen", "rooted", "unregulated"],
    subjects: ["the new nursery", "the feeding cycle", "the propagation link", "the regulator", "the consumed stock", "the seed line"],
    titles: ["Herdmaster", "Regulator", "Grove-Keeper", "Forester"],
    familyWeights: [
      { family: "Plant", weight: 4 }, { family: "Beast", weight: 4 },
      { family: "Monstrosity", weight: 3 }, { family: "Aberration", weight: 2 }, { family: "Fey", weight: 1 },
    ],
    signatureMonsters: ["shambling_mound", "violet_fungus", "mushroomfolk", "ettercap", "rot_flower", "owlbear", "treant"],
  },
  hastur: {
    label: "Hastur / The Yellow Role",
    siteForms: ["Playhouse", "Cloister", "Palace", "Halls"],
    siteQualifiers: ["Shuttered", "Rewritten", "Weeping", "Quiet"],
    siteSubjects: ["Role", "Audience", "Understudy", "Cancellation"],
    epithets: ["cast", "witnessed", "yellow-marked", "uncancelled", "prompted", "encored"],
    subjects: ["the accepted role", "the withdrawal terms", "the first performance", "the cancellation clause", "the granted privilege", "the standing cast"],
    titles: ["Impresario", "Prompter", "Company Master", "Chief Usher"],
    familyWeights: [
      { family: "Fey", weight: 4 }, { family: "Humanoid", weight: 3 },
      { family: "Undead", weight: 3 }, { family: "Aberration", weight: 2 }, { family: "Monstrosity", weight: 1 },
    ],
    signatureMonsters: ["siren", "doppelganger", "ghost", "harpy", "shadow", "hag_weald", "fairy"],
  },
  yog_sothoth: {
    label: "Yog-Sothoth / The Junction",
    siteForms: ["Threshold", "Observatory", "Maze", "Vaults"],
    siteQualifiers: ["Breached", "Sealed", "Hollow", "Unfinished"],
    siteSubjects: ["Door", "Junction", "Courier", "Return Edge"],
    epithets: ["keyed", "displaced", "unreturned", "twinned", "grounded", "over-capacity"],
    subjects: ["the displaced door", "the junction network", "the return edge", "the containment capacity", "the stranded courier", "the keyed threshold"],
    titles: ["Doorwarden", "Courier-Master", "Keyer", "Junction Clerk"],
    familyWeights: [
      { family: "Aberration", weight: 4 }, { family: "Elemental", weight: 3 },
      { family: "Construct", weight: 3 }, { family: "Fiend", weight: 2 }, { family: "Monstrosity", weight: 1 },
    ],
    signatureMonsters: ["invisible_stalker", "void_being", "gargoyle", "will_o_the_wisp", "djinni", "void_spider"],
  },
  tsathoggua: {
    label: "Tsathoggua / The Sated Refuge",
    siteForms: ["Depot", "Grotto", "Depths", "Warrens"],
    siteQualifiers: ["Buried", "Quiet", "Starved", "Sealed"],
    siteSubjects: ["Tribute", "Conduit", "Reserve", "Drover"],
    epithets: ["unaccounted", "tallow-soft", "torpid", "stockpiled", "signed-for", "unlit"],
    subjects: ["the depot account", "the refuge conduit", "the tribute agreement", "the missing delivery", "the stored reserve", "the signatory list"],
    titles: ["Depot Master", "Drover", "Tally Clerk", "Conduit Keeper"],
    familyWeights: [
      { family: "Beast", weight: 4 }, { family: "Aberration", weight: 3 },
      { family: "Ooze", weight: 3 }, { family: "Monstrosity", weight: 2 }, { family: "Humanoid", weight: 1 },
    ],
    signatureMonsters: ["troll_deep", "black_pudding", "gray_ooze", "bat_giant", "darkmantle", "frog_giant", "ochre_jelly"],
  },
  ithaqua: {
    label: "Ithaqua / The Walking Winter",
    siteForms: ["Waystation", "Steading", "Aerie", "Ravine"],
    siteQualifiers: ["Starved", "Buried", "Abandoned", "Quiet"],
    siteSubjects: ["Thaw", "Anchor Route", "Winter Spring", "Guide"],
    epithets: ["rimed", "fuel-short", "snow-locked", "anchored", "measured", "wind-scoured"],
    subjects: ["the anchor route", "the last thaw", "the replenishment interval", "the fuel cache", "the winter spring", "the shelter line"],
    titles: ["Winter Guide", "Fire-Keeper", "Pass Warden", "Stationmaster"],
    familyWeights: [
      { family: "Elemental", weight: 4 }, { family: "Undead", weight: 3 },
      { family: "Beast", weight: 3 }, { family: "Giant", weight: 2 }, { family: "Monstrosity", weight: 1 },
    ],
    signatureMonsters: ["wolf_winter", "troll_frost", "giant_frost", "rime_walker", "draugr", "wendel", "elemental_air"],
  },
  tcho_tcho: {
    label: "Tcho-Tcho / The Obliging Clinic",
    siteForms: ["Clinic", "Almshouse", "Warrens", "Chapel"],
    siteQualifiers: ["Shuttered", "Quiet", "Starved", "Contested"],
    siteSubjects: ["Consignment", "Provider", "Collection", "Debt"],
    epithets: ["obliging", "itemised", "under-supplied", "collected-on", "chartered", "terminal"],
    subjects: ["the care obligation", "the medical consignment", "the independent provider", "the termination terms", "the collection round", "the chapter register"],
    titles: ["Chapter Physician", "Collector", "Almoner", "Supply Factor"],
    familyWeights: [
      { family: "Humanoid", weight: 5 }, { family: "Monstrosity", weight: 2 },
      { family: "Undead", weight: 2 }, { family: "Aberration", weight: 2 }, { family: "Beast", weight: 1 },
    ],
    signatureMonsters: ["cultist", "beastman", "ghoul", "ghast", "hag_weald", "grimlow", "thug"],
  },
  azathoth: {
    label: "Azathoth / The Furnace Pattern",
    siteForms: ["Furnace", "Workshop", "Observatory", "Pits"],
    siteQualifiers: ["Breached", "Waking", "Sundered", "Unfinished"],
    siteSubjects: ["Pattern", "Collector", "Grounding", "Activation"],
    epithets: ["ungrounded", "resonant", "over-driven", "counter-cut", "sympathetic", "blank-faced"],
    subjects: ["the furnace boundary", "the collector connection", "the grounding point", "the counter-pattern", "the repair sequence", "the captured activation"],
    titles: ["Municipal Engineer", "Furnace Master", "Grounding Warden", "Pattern Cutter"],
    familyWeights: [
      { family: "Elemental", weight: 5 }, { family: "Construct", weight: 3 },
      { family: "Aberration", weight: 2 }, { family: "Fiend", weight: 2 }, { family: "Monstrosity", weight: 1 },
    ],
    signatureMonsters: ["elemental_fire", "golem_iron", "salamander", "efreeti", "dust_devil", "animated_armor"],
  },
  angels: {
    label: "Angels / The Charge",
    siteForms: ["Court", "Chapel", "Abbey", "Halls"],
    siteQualifiers: ["Sealed", "Contested", "Quiet", "Weeping"],
    siteSubjects: ["Charge", "Testimony", "Restitution", "Release"],
    epithets: ["authenticated", "attested", "unheard", "sworn", "sealed", "unanswered"],
    subjects: ["the named injury", "the required restitution", "the binding release", "the hearing evidence", "the protected witness", "the standing charge"],
    titles: ["Advocate", "Recording Angel", "Hearing Warden", "Witness-Keeper"],
    familyWeights: [
      { family: "Celestial", weight: 5 }, { family: "Humanoid", weight: 3 },
      { family: "Construct", weight: 2 }, { family: "Fiend", weight: 2 }, { family: "Undead", weight: 1 },
    ],
    signatureMonsters: ["angel_domini", "angel_principi", "angel_seraph", "couatl", "archangel", "knight", "priest"],
  },
  maruts: {
    label: "Maruts / The Enforcement Order",
    siteForms: ["Registry", "Vaults", "Halls", "Monolith"],
    siteQualifiers: ["Sealed", "Rewritten", "Contested", "Buried"],
    siteSubjects: ["Order", "Instrument", "Violation", "Record"],
    epithets: ["original", "countersigned", "uncorrected", "filed", "enforceable", "superseded"],
    subjects: ["the enforcement order", "the recorded violation", "the original instrument", "the cancelling authority", "the correction", "the register entry"],
    titles: ["Record Keeper", "Enforcer", "Registrar", "Corrector"],
    familyWeights: [
      { family: "Construct", weight: 5 }, { family: "Celestial", weight: 3 },
      { family: "Elemental", weight: 2 }, { family: "Humanoid", weight: 2 }, { family: "Fiend", weight: 1 },
    ],
    signatureMonsters: ["golem_iron", "golem_stone", "golem_clay", "animated_armor", "stone_warrior", "invisible_stalker"],
  },
  witch_king: {
    label: "Witch-King / The Converted Front",
    siteForms: ["Charnel", "Depot", "Fortress", "Barrow"],
    siteQualifiers: ["Starved", "Contested", "Buried", "Sundered"],
    siteSubjects: ["Conversion", "Muster", "Burial Field", "Apparatus"],
    epithets: ["requisitioned", "preserved", "unburied", "conscripted", "reagent-soaked", "front-line"],
    subjects: ["the collected dead", "the conversion depot", "the sustaining apparatus", "the burial ground", "the supply line", "the muster roll"],
    titles: ["Burial Keeper", "Quartermaster of the Dead", "Field Necromancer", "Muster Sergeant"],
    familyWeights: [
      { family: "Undead", weight: 5 }, { family: "Humanoid", weight: 3 },
      { family: "Fiend", weight: 2 }, { family: "Construct", weight: 2 }, { family: "Monstrosity", weight: 1 },
    ],
    signatureMonsters: ["lich", "wight", "skeleton", "zombie", "wraith", "draugr", "mummy", "ghast"],
  },
  apocalypse_cult: {
    label: "Apocalypse Cult",
    siteForms: ["Sanctum", "Chapel", "Pits", "Hideout"],
    siteQualifiers: ["Waking", "Sealed", "Contested", "Abandoned"],
    siteSubjects: ["Invocation", "Component", "Assistant", "Recipe"],
    epithets: ["consecrated", "unconsecrated", "half-assembled", "purchased", "rehearsed", "substituted"],
    subjects: ["the manifestation recipe", "the consecrated component", "the invocation site", "the dismantling sequence", "the component buyer", "the ritual assistant"],
    titles: ["Hierophant", "Ritual Assistant", "Component Factor", "Chapter Warden"],
    familyWeights: [
      { family: "Humanoid", weight: 4 }, { family: "Fiend", weight: 4 },
      { family: "Undead", weight: 2 }, { family: "Aberration", weight: 2 }, { family: "Monstrosity", weight: 1 },
    ],
    signatureMonsters: ["cultist", "acolyte", "demon_dretch", "demon_vrock", "priest", "berserker", "devil_imp"],
  },
  vanishing_middle: {
    label: "The Eternal Cycle",
    siteForms: ["Crossing", "Toll House", "Steading", "Market"],
    siteQualifiers: ["Contested", "Abandoned", "Shuttered", "Starved"],
    siteSubjects: ["Charter", "Claim", "Mediator", "Commons"],
    epithets: ["unclaimed", "disputed", "chartered", "independent", "witnessed", "lapsed"],
    subjects: ["the crossing claim", "the civic charter", "the independent institution", "the settlement deed", "the neutral ground", "the common right"],
    titles: ["Mediator", "Toll-Keeper", "Charter Holder", "Reeve"],
    familyWeights: [
      { family: "Humanoid", weight: 5 }, { family: "Beast", weight: 3 },
      { family: "Monstrosity", weight: 2 }, { family: "Fey", weight: 1 }, { family: "Undead", weight: 1 },
    ],
    signatureMonsters: ["bandit", "thug", "gladiator", "wolf", "orc", "goblin", "hobgoblin"],
  },
  githyanki: {
    label: "Githyanki / The Arrival",
    siteForms: ["Landing", "Granary", "Steading", "Aerie"],
    siteQualifiers: ["Starved", "Contested", "Unfinished", "Breached"],
    siteSubjects: ["Arrival", "Quartermaster", "Allotment", "Wave"],
    epithets: ["short-weight", "allotted", "unhoused", "contracted", "surveyed", "incoming"],
    subjects: ["the grain shortfall", "the settlement capacity", "the final arrival wave", "the provision contract", "the allotted land", "the refugee roll"],
    titles: ["Quartermaster", "Landing Marshal", "Allotment Clerk", "Wave Captain"],
    familyWeights: [
      { family: "Humanoid", weight: 4 }, { family: "Aberration", weight: 3 },
      { family: "Dragon", weight: 2 }, { family: "Monstrosity", weight: 2 }, { family: "Construct", weight: 1 },
    ],
    signatureMonsters: ["knight", "mage", "gladiator", "wyvern", "hippogriff", "drow", "duergar"],
  },
  slumbering_catastrophe: {
    label: "The Slumbering Catastrophe",
    siteForms: ["Caldera", "Barrow", "Depths", "Ravine"],
    siteQualifiers: ["Waking", "Buried", "Quiet", "Sundered"],
    siteSubjects: ["Sleeper", "Countermeasure", "Tremor", "Hunt"],
    epithets: ["stirring", "untested", "earlier", "prepared", "seismic", "half-buried"],
    subjects: ["the sleeper's disturbance", "the earlier countermeasure", "the prepared confrontation", "the failed hunt", "the waking sign", "the survivor's account"],
    titles: ["Hunt-Master", "Seismographer", "Survivor", "Countermeasure Warden"],
    familyWeights: [
      { family: "Dragon", weight: 4 }, { family: "Monstrosity", weight: 4 },
      { family: "Giant", weight: 2 }, { family: "Beast", weight: 2 }, { family: "Elemental", weight: 1 },
    ],
    signatureMonsters: ["dragon_forest", "purple_worm", "the_tarrasque", "bulette", "remorhaz", "basilisk"],
  },
  stolen_dawn: {
    label: "The Stolen Dawn",
    siteForms: ["Observatory", "Forge", "Steading", "Garden"],
    siteQualifiers: ["Starved", "Buried", "Quiet", "Unfinished"],
    siteSubjects: ["Dawn Engine", "Renewal", "Keeper", "Returning Winter"],
    epithets: ["unlit", "frost-bitten", "disconnected", "observed", "renewal-cut", "dawn-marked"],
    subjects: ["the renewal focus", "the Dawn Engine", "the missing connection", "the timing of winter", "the wilderness route", "the observatory record"],
    titles: ["Observatory Keeper", "Engine Wright", "Renewal Warden", "Route Guide"],
    familyWeights: [
      { family: "Elemental", weight: 4 }, { family: "Fey", weight: 3 },
      { family: "Undead", weight: 2 }, { family: "Beast", weight: 2 }, { family: "Construct", weight: 2 },
    ],
    signatureMonsters: ["giant_frost", "wolf_winter", "shadow", "dryad", "treant", "rime_walker"],
  },
  regional: {
    label: "Regional work",
    siteForms: ["Farmstead", "Mill", "Ruins", "Caverns"],
    siteQualifiers: ["Abandoned", "Contested", "Quiet", "Buried"],
    siteSubjects: ["Trade Road", "Old Claim", "Beast", "Family"],
    epithets: ["abandoned", "disputed", "overgrown", "salvaged", "rain-spoiled", "unworked"],
    subjects: ["the trade route", "the abandoned store", "the district's safe passage", "the old claim", "the lost herd", "the family holding"],
    titles: ["Reeve", "Caravan Master", "Bandit Chief", "Steward"],
    familyWeights: [
      { family: "Beast", weight: 4 }, { family: "Humanoid", weight: 4 },
      { family: "Monstrosity", weight: 2 }, { family: "Undead", weight: 1 }, { family: "Fey", weight: 1 },
    ],
    signatureMonsters: ["wolf", "bandit", "goblin", "orc", "spider_giant", "bear_brown", "kobold"],
  },
};

export type PathFlavorId = keyof typeof PATH_FLAVOR_PROFILES;

/** Path ids recorded in saves that are spelled differently in the flavour table. */
const FLAVOR_ALIASES: Record<string, string> = {
  the_stolen_dawn: "stolen_dawn",
  the_vanishing_middle: "vanishing_middle",
};

/** Canonical id for a path, matching both this table and the objective profiles. */
export function canonicalPathId(pathId: string): string {
  return FLAVOR_ALIASES[pathId] ?? pathId;
}

/** Unknown ids are a content bug, not something to paper over with a default. */
export function pathFlavor(pathId: string): PathFlavorProfile {
  const resolved = canonicalPathId(pathId);
  const profile = PATH_FLAVOR_PROFILES[resolved];
  if (!profile) {
    throw new Error(
      `No path flavour profile for "${pathId}". Add one to PATH_FLAVOR_PROFILES, or pass "regional" for work with no path behind it.`,
    );
  }
  return profile;
}
