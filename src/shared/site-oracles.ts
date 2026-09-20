/**
 * Generic site-generation oracles: the vocabulary every adventure path draws on
 * before its own flavour is mixed in. The structure follows the familiar solo
 * three-column site name (form / qualifier / subject) and the two-column
 * verb + noun prompt, but the words are ASH's own.
 *
 * Nothing here is an objective. These tables supply the *inputs* a site brief
 * needs — a place name, an intent phrase, and the form of the thing at stake —
 * so that exact per-path wording can be written afterwards.
 */

/** Column 1: what kind of place this is. */
export const SITE_FORMS = [
  "Citadel", "Wreck", "Ruins", "Chapel", "Archive", "Grave", "Fortress", "Workshop",
  "Abbey", "Prison", "Tomb", "Forge", "Ravine", "Cloister", "Spire", "Hideout",
  "Tunnels", "Halls", "Tower", "Steading", "Undercity", "Aerie", "Vaults", "Observatory",
  "Sepulcher", "Barrow", "Palace", "Keep", "Caverns", "Garden", "Maze", "Pyramid",
  "Sanctum", "Mines", "Lair", "Pits", "Grotto", "Depths", "Stronghold", "Warrens",
] as const;

/** Column 2: the qualifier that tells the table what went wrong here. */
export const SITE_QUALIFIERS = [
  "Haunted", "Forgotten", "Disgraced", "Barren", "Bound", "Cursed", "Drowned", "Hollow",
  "Sealed", "Blighted", "Sundered", "Abandoned", "Quiet", "Buried", "Unfinished", "Breached",
  "Contested", "Shuttered", "Rewritten", "Waking", "Starved", "Weeping",
] as const;

/** Column 3: whose place it was, or what it was for. */
export const SITE_SUBJECTS = [
  "Idol", "Betrayer", "King", "Cult", "Knight", "Hero", "Spirit", "Sisters",
  "Sword", "Beast", "Ancients", "Lost", "Outcasts", "Sailor", "Undead", "Mage",
  "Hoard", "Usurper", "Saint", "Mechanism", "Brothers", "Lord", "Descendant", "Abomination",
  "Hermit", "Warlord", "Hunter", "Guild", "Philosopher", "Queen", "Secret", "Emperor",
  "Crown", "Ancestor", "Runes", "Assassin", "Relic", "Blessing", "Ritual", "Overlord",
] as const;

/**
 * The prompt oracle, as SoloDark prints it: a d100 verb and a d100 noun, read
 * together as an intent - "Uncover the Route", "Sever the Obligation". Rolled
 * independently, so the pairing is a suggestion to interpret rather than a
 * fixed result. The objective kind supplies the mechanics; this supplies the
 * reason the table cares.
 *
 * Source: SoloDark V1, Prompts, pg. 11.
 */
export const PROMPT_VERBS = [
  "Stop", "Tell", "Trust", "Prevent", "Deliver", "Dismantle", "Create", "Resist",
  "Imbue", "Befriend", "Sneak", "Disagree", "Illuminate", "Assemble", "Free", "Combine",
  "Disrupt", "Demand", "Obstruct", "Push", "Arrive", "Slow", "Overcome", "Block",
  "Consume", "Pursue", "Reward", "Expand", "Waste", "Capture", "Weaken", "Reveal",
  "Investigate", "Forbid", "Start", "Surprise", "Endure", "Pull", "Unleash", "Avoid",
  "Advance", "Agree", "Deliver", "Link", "Hinder", "Withhold", "Lose", "Evolve",
  "Fortify", "Punish", "Ignite", "Awaken", "Defy", "Conceal", "Invite", "Break",
  "Allow", "Open", "Repel", "Activate", "Gather", "Give", "Reverse", "Warn",
  "Confront", "Betray", "Secure", "Darken", "Flee", "Win", "Scatter", "Contain",
  "Assist", "Take", "Question", "Drop", "Accept", "Sacrifice", "Drain", "Hint",
  "Fumble", "Fall", "Ascend", "Protect", "Escape", "Defeat", "Mend", "Acquire",
  "Guide", "Mislead", "Banish", "Uphold", "Build", "Change", "Revoke", "Seek",
  "Destroy", "Uncover", "Rest", "Release",
] as const;

export const PROMPT_NOUNS = [
  "Fault", "Life", "Battle", "Lie", "Vice", "Memory", "Burden", "Treachery",
  "Trial", "Risk", "Prosperity", "Time", "Conflict", "Light", "Unnatural", "Information",
  "Hope", "Journey", "Mundane", "Hazard", "Family", "Obstacle", "Doubt", "Freedom",
  "Weakness", "Unknown", "Glory", "Friend", "Discovery", "Lead", "Storm", "Enemy",
  "Integrity", "Science", "Asset", "Crime", "Wisdom", "Justice", "Strife", "Disgust",
  "Danger", "Balance", "Nature", "Chaos", "Ambush", "Wealth", "Thought", "Dark",
  "Connection", "Door", "Fear", "Sorcery", "Honor", "Spirit", "Trust", "Loss",
  "Failure", "Peril", "Plan", "Trick", "Mind", "Pain", "Victory", "Death",
  "Control", "Knowledge", "Secret", "Kindness", "Exploration", "Surprise", "Magic", "Animal",
  "Way", "Essence", "Dream", "Anger", "Vision", "Safety", "Result", "Place",
  "Path", "Nourishment", "Theft", "Decay", "Truth", "People", "Help", "Gear",
  "Idea", "Order", "Success", "Barrier", "Goal", "Luck", "Identity", "Harm",
  "Wilderness", "Motive", "Shelter", "Power",
] as const;

/**
 * The physical form a target takes, by objective kind. The path supplies the
 * epithet and the subject; this supplies the noun the party can actually pick
 * up, open, free, disable, or walk through.
 */
export const TARGET_FORMS = {
  recover_relic: ["reliquary", "sigil-plate", "casket", "standard", "signet", "codex"],
  lift_curse: ["memorial", "boundary stone", "bell", "shrine", "effigy", "family vault"],
  harvest_components: ["ritual stores", "rendering vats", "drying racks", "reagent cells", "sample cases"],
  treasure_cache: ["sealed coffer", "toll box", "strongroom", "pay chest", "buried jar", "wall niche"],
  exotic_materials: ["mineral seam", "crystal shelf", "salt bed", "resin flow", "spore shelf"],
  rescue_captive: ["holding pen", "shuttered cell", "sick room", "flooded hold", "work gang"],
  monster_eggs: ["brood shelf", "spawning pool", "egg nest", "hatchery", "silt bank"],
  assassinate_leader: ["command post", "war table", "signal platform", "field pavilion"],
  secure_chokepoint: ["passage", "lock gate", "bridge span", "stair head", "tunnel mouth"],
  defeat_guardian: ["threshold", "guard post", "ring wall", "sealed door", "approach"],
  clear_border: ["crossing", "toll road", "ford", "mountain pass", "canal reach"],
  rescue_companion: ["stranded camp", "collapsed cut", "signal fire", "wrecked boat"],
  break_ward: ["ward", "seal", "binding circle", "lock array", "watch glyph"],
  learn_secret: ["records", "ledger", "correspondence", "survey rolls", "muster book"],
  secure_descent: ["access shaft", "stair well", "winch platform", "rope pitch", "flooded descent"],
} as const;

/** Section marks: how the table tells linked objectives apart at the table. */
export const SECTION_MARKS = ["copper-marked", "split-stone", "white-thread"] as const;

/**
 * What a harvest or extraction objective actually comes away with, and how it is
 * measured. Three usable samples is the standing completion condition.
 */
export const MATERIAL_MEASURES = ["phials", "measures", "cores", "billets", "wrapped bundles", "sealed jars"] as const;

export const MATERIAL_SUBSTANCES = [
  "resin", "brine-tissue", "spore mass", "ash-glass", "lodestone", "bone-lime",
  "quicksalt", "rendered tallow", "cave pearl", "witch-iron", "pitch", "grave-wax",
] as const;

/** What a curse actually does, so cleansing it has a verifiable end. */
export const CURSE_EFFECTS = [
  "nobody who sleeps here wakes rested",
  "everything written near it is read wrong",
  "the same hour repeats for anyone who stays past dark",
  "wounds taken here do not close until it is lifted",
  "its name cannot be spoken aloud within sight of it",
  "whoever takes from it is followed home",
  "the dead buried under it do not stay put",
  "any promise sworn on it must be kept, or paid for",
] as const;

/** How a ward is held closed, so disabling it is a concrete operation. */
export const WARD_TRIGGERS = [
  "keyed to the blood of its maker",
  "answering only to a spoken roster of names",
  "fed by a lamp that must never go out",
  "tripped by any weight crossing the threshold",
  "sealed with wax that reforms when broken",
  "watching for a sigil worn on the wrist",
  "counting how many enter and refusing the same number out",
  "tied to a second ward elsewhere in the site",
] as const;

/** What is in the way of a passage, descent, or crossing. */
export const OBSTRUCTIONS = [
  "a collapsed winch and its cut cable",
  "standing water past chest height",
  "a rockfall nobody has cleared",
  "a toll nobody local will pay",
  "a rotted span with one rope left",
  "an occupying band that shoots on sight",
  "a gate barred from the far side",
  "foul air that kills a flame in a minute",
] as const;
