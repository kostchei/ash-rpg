export interface CodexEntry {
  id: string;
  category: "conditions" | "procedures" | "gear" | "spells" | "talents" | "discoveries";
  title: string;
  subtitle?: string;
  tags: string[];
  summary: string;
  details: string;
  dc?: number;
  table?: { roll: string; outcome: string }[];
}

export const CODEX_ENTRIES: CodexEntry[] = [
  // --- CONDITIONS ---
  {
    id: "cond-blinded",
    category: "conditions",
    title: "Blinded",
    tags: ["condition", "sight", "darkness"],
    summary: "Cannot see. Disadvantage on attacks and checks relying on sight; attacks against have advantage.",
    details: "A blinded creature cannot see and automatically fails any ability check that requires sight. Attack rolls against the creature have advantage, and the creature's attack rolls have disadvantage. Spells or abilities requiring line of sight cannot be targeted.",
  },
  {
    id: "cond-deafened",
    category: "conditions",
    title: "Deafened",
    tags: ["condition", "hearing", "sound"],
    summary: "Cannot hear. Automatically fails checks relying on hearing.",
    details: "A deafened creature can't hear and automatically fails any ability check that requires hearing. Spells with verbal components can still be cast unless the referee rules otherwise.",
  },
  {
    id: "cond-paralyzed",
    category: "conditions",
    title: "Paralyzed",
    tags: ["condition", "incapacitated", "critical"],
    summary: "Incapacitated and frozen. Auto-fails STR/DEX saves; attacks against have advantage and auto-crit in close range.",
    details: "A paralyzed creature is incapacitated and can't move or speak. The creature automatically fails Strength and Dexterity saving throws. Attack rolls against the creature have advantage. Any attack that hits the creature is a critical hit if the attacker is within Close range (5 feet).",
  },
  {
    id: "cond-poisoned",
    category: "conditions",
    title: "Poisoned",
    tags: ["condition", "venom", "disadvantage"],
    summary: "Suffering from venom. Disadvantage on attack rolls and ability checks.",
    details: "A poisoned creature has disadvantage on attack rolls and ability checks. Poison can be cured by antitoxin, herbal poultice, or restorative divine spells.",
  },
  {
    id: "cond-exhausted",
    category: "conditions",
    title: "Exhausted",
    tags: ["condition", "fatigue", "march"],
    summary: "Severe physical fatigue. Disadvantage on checks and saves; movement halved.",
    details: "Each level of exhaustion impairs the adventurer. Level 1: Disadvantage on ability checks. Level 2: Speed halved. Level 3: Disadvantage on attack rolls and saving throws. Level 4: HP maximum halved. Level 5: Speed reduced to 0. Level 6: Death. A full sanctuary rest or successful camp rest removes 1 level.",
  },
  {
    id: "cond-dying",
    category: "conditions",
    title: "Dying (0 HP)",
    tags: ["condition", "death saves", "bloodied"],
    summary: "At 0 HP: physical DC 10 CON save each turn. Success stabilizes; failure adds a strike.",
    details: "At 0 HP an adventurer is unconscious and bleeding out. Make a DC 10 CON check at the start of each turn. Success stabilizes them; failure adds one death strike. Natural 20 restores 1 HP immediately; natural 1 adds two strikes. Three strikes cause death. Stable characters regain 1 HP after one hour of rest.",
  },
  {
    id: "cond-lightless",
    category: "conditions",
    title: "Lightless (In the Dark)",
    tags: ["condition", "torches", "shadowdark"],
    summary: "Pitch blackness. Disadvantage on all checks; dark-dwelling monsters have advantage.",
    details: "In Shadowdark RPG, light is life. A torch burns for exactly 1 hour of real time (or 6 exploration crawl turns). In total darkness, characters have disadvantage on all checks and attacks, cannot run, and creatures that do not require light gain advantage against them.",
  },

  // --- OSR PROCEDURES ---
  {
    id: "proc-reaction",
    category: "procedures",
    title: "2d6 Reaction Table",
    subtitle: "When meeting unknown creatures or NPCs",
    tags: ["procedure", "reaction", "osr", "parley"],
    summary: "Roll 2d6 + CHA mod to determine initial reaction of monsters or strangers.",
    details: "When encounters begin without surprise or an automatic ambush, roll 2d6 modified by the party spokesperson's CHA modifier:",
    table: [
      { roll: "2–3", outcome: "Hostile: Attacks immediately, demands surrender, or maneuvers to strike." },
      { roll: "4–6", outcome: "Suspicious / Threatening: demands tribute or withdrawal." },
      { roll: "7–9", outcome: "Cautious / Neutral: Suspicious, guarded, sizing up the party. Open to parley or bribes." },
      { roll: "10–11", outcome: "Friendly: Welcoming, helpful, willing to share warnings, trade, or negotiate." },
      { roll: "12+", outcome: "Devoted: Enthusiastic assistance, immediate trust, offers sworn aid." },
    ],
  },
  {
    id: "proc-morale",
    category: "procedures",
    title: "Morale Check",
    subtitle: "Determining if adversaries break and flee",
    tags: ["procedure", "morale", "flee", "retreat"],
    summary: "Roll 2d6 against Monster Morale DC when leader dies or 50% casualties reached.",
    details: "Monsters do not fight to the death blindly. A Morale check is triggered when:\n1. The encounter group's leader is killed or incapacitated.\n2. The group suffers 50% casualties (half the monsters defeated).\n\nRoll 2d6: If the roll is greater than the monster's Morale score, the remaining monsters break morale. They surrender, parley for their lives, or flee in panic.",
  },
  {
    id: "proc-navigation",
    category: "procedures",
    title: "Wilderness Navigation & Drift",
    subtitle: "6-mile hex crawl movement and lost direction",
    tags: ["procedure", "wilderness", "hex", "navigation", "drift"],
    summary: "Party INT check against DC 9 / 15 / 18. Failure drifts uniformly into 1 of all 6 hex directions.",
    details: "Hexes are 6 miles across. The travel day consists of 3 travel watches:\n• Road / Trail: Easy terrain, no check required (Watch cost 1).\n• Moderate Terrain (Forest, Hills): DC 9 party INT check (best INT in active roster).\n• Hard Terrain (Swamp, Jungle, Mountains, Desert): DC 15 party INT check.\n• Night Travel or Obscuring Weather: Raises terrain DC by 1 step (up to DC 18).\n\nOn failure, the party drifts into one of all six hex directions chosen uniformly at random (including the intended direction). The party does not know the check failed until observing landmarks.",
  },
  {
    id: "proc-falling",
    category: "procedures",
    title: "Falling Damage",
    subtitle: "Gravity and vertical hazards",
    tags: ["procedure", "hazard", "falling", "damage"],
    summary: "1d6 bludgeoning damage per 10 feet fallen (max 20d6). Lands prone.",
    details: "A creature takes 1d6 damage for every 10 feet it falls, to a maximum of 20d6. The creature lands prone unless it avoids taking damage from the fall (e.g. via Feather Fall or Thief Cat Fall). Falling into deep water reduces effective distance by 20 feet.",
  },
  {
    id: "proc-drowning",
    category: "procedures",
    title: "Suffocation & Drowning",
    subtitle: "Underground floods, poisonous gas, deep water",
    tags: ["procedure", "hazard", "drowning", "air"],
    summary: "Hold breath for 1 + CON mod minutes (min 1). Afterward, DC 12 CON check each round or drop to 0 HP.",
    details: "A creature can hold its breath for a number of minutes equal to 1 + its Constitution modifier (minimum 1 minute). When out of breath, it can survive for a number of rounds equal to its Constitution modifier (minimum 1 round). At the start of its next turn, it drops to 0 HP and begins dying.",
  },

  // --- GEAR ---
  {
    id: "gear-torch",
    category: "gear",
    title: "Torch (Bundle of 3)",
    subtitle: "1 Gear Slot · 5 SP",
    tags: ["gear", "light", "torch"],
    summary: "Sheds bright light in Near distance (30 ft). Burns for exactly 1 hour of real time.",
    details: "A torch illuminates Near range (30 ft) and provides dim light for another Near range. It burns for 1 hour of real physical table time. In turn-based crawling, it lasts 6 exploration turns. Extinguished by water or gale-force winds.",
  },
  {
    id: "gear-rations",
    category: "gear",
    title: "Rations (3 Days)",
    subtitle: "1 Gear Slot · 15 SP",
    tags: ["gear", "rations", "food"],
    summary: "Dried meats, hardtack, dried fruit. 1 ration consumed per adventurer at the end of each day.",
    details: "Active adventurers consume 1 ration each day when night watch falls. Going without food triggers DC 12 Constitution checks against starvation and fatigue each day.",
  },
  {
    id: "gear-weapons",
    category: "gear",
    title: "Core Weapons Reference",
    subtitle: "Damage dice and slot requirements",
    tags: ["gear", "weapons", "damage"],
    summary: "Dagger 1d4 (Finesse/Thrown), Shortsword 1d6, Longsword 1d8 (Versatile 1d10), Greatsword 1d12 (2 slots, 2H), Bow 1d6/1d8.",
    details: "• Dagger: 1d4 damage, Close/Near thrown, Finesse, 1 slot.\n• Shortsword: 1d6 damage, Close, Finesse, 1 slot.\n• Longsword: 1d8 damage (1d10 two-handed), Close, Versatile, 1 slot.\n• Greatsword / Greataxe: 1d12 damage, Close, Two-handed, 2 slots.\n• Shortbow: 1d6 damage, Far, Two-handed, 1 slot.\n• Longbow: 1d8 damage, Far, Two-handed, 1 slot.",
  },
  {
    id: "gear-armor",
    category: "gear",
    title: "Core Armor Reference",
    subtitle: "AC values and stealth penalties",
    tags: ["gear", "armor", "defense"],
    summary: "Leather (AC 11+DEX, 1 slot), Chainmail (AC 13+DEX max 1, Disadv Stealth, 2 slots), Plate (AC 15, Disadv Stealth, 3 slots), Shield (+2 AC, 1 slot).",
    details: "• Leather Armor: AC 11 + DEX modifier. 1 slot.\n• Chainmail: AC 13 + DEX modifier (max +1). Disadvantage on Stealth. 2 slots.\n• Plate Mail: AC 15. No DEX bonus. Disadvantage on Stealth. 3 slots.\n• Shield: +2 to AC when wielded in off-hand. 1 slot.",
  },

  // --- SPELLS ---
  {
    id: "spell-cure-wounds",
    category: "spells",
    title: "Cure Wounds",
    subtitle: "Tier 1 Divine · Touch · Instant",
    tags: ["spell", "divine", "healing"],
    summary: "Heals 1d8 + WIS mod HP to a touched wounded creature. DC 11 WIS check.",
    details: "You touch a living creature and channel soothing celestial warmth. The target regains 1d8 + WIS modifier hit points (up to maximum HP). On critical failure (natural 1), penance is required before the deity grants divine spells again.",
  },
  {
    id: "spell-magic-missile",
    category: "spells",
    title: "Magic Missile",
    subtitle: "Tier 1 Arcane · Far (120 ft) · Instant",
    tags: ["spell", "arcane", "damage"],
    summary: "Fires glowing kinetic dart dealing 1d4+1 force damage automatically. DC 11 INT check.",
    details: "You release a gleaming dart of pure magical force from your fingertips. The missile automatically strikes one visible target within Far distance, dealing 1d4 + 1 force damage. No attack roll or saving throw is required on hit.",
  },
  {
    id: "spell-shield-of-faith",
    category: "spells",
    title: "Shield of Faith",
    subtitle: "Tier 1 Divine · Close · 5 Rounds",
    tags: ["spell", "divine", "defense"],
    summary: "Grants +2 bonus to AC to a chosen target for 5 rounds. DC 11 WIS check.",
    details: "A shimmering field of sacred light envelops a creature of your choice within Close range, granting it a +2 bonus to Armor Class for 5 rounds.",
  },
  {
    id: "spell-sleep",
    category: "spells",
    title: "Sleep",
    subtitle: "Tier 1 Arcane · Near · 1 Hour",
    tags: ["spell", "arcane", "control"],
    summary: "Puts up to 2d8 HP worth of low-level creatures into enchanted slumber. DC 11 INT check.",
    details: "A wave of shimmering golden motes drifts over creatures within Near distance. Roll 2d8: creatures in the area with total current HP equal to or less than the roll fall into a magical slumber for 1 hour. Undead and constructs are immune.",
  },
];
