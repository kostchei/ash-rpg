import type { ItemDefinition, SpellDefinition } from "./types.js";

export const ABILITY_KEYS = ["str", "dex", "con", "int", "wis", "cha"] as const;

/**
 * Largest party that may leave the haven tavern, retainers included. Companions
 * rescued mid-expedition join beyond this — they have to, to get back out alive.
 */
export const MAX_DEPARTING_PARTY = 6;

/** Smallest party that may leave the haven, retainers included. */
export const MIN_DEPARTING_PARTY = 2;

export const ANCESTRIES = [
  "Human",
  "Dwarf",
  "Elf",
  "High Elf",
  "Halfling",
  "Goblin",
  "Orc",
  "Tiefling",
  "Wood Elf",
  "Forest Gnome",
  "Lizardman",
  "Half-Ogre",
  "Deep Gnome",
  "Drow",
  "Kuo-Toa",
  "Derro",
  "Quaggoth",
  "Myconid",
  "Deva",
] as const;

export interface ClassFeature {
  name: string;
  description: string;
}

export interface TalentEntry {
  roll: string;
  min: number;
  max: number;
  effect: string;
}

/** One way to burn a class resource, offered as a button on the ledger. */
export interface ClassResourceSpender {
  id: string;
  name: string;
  cost: number;
  description: string;
}

/**
 * A class "engine" — a track that fills through play and is spent on the class's
 * signature moves. Warrior Priest Righteousness and Chaos Knight possession both
 * ride on this; the ledger renders a track for any class that declares one.
 */
export interface ClassResourceDefinition {
  id: string;
  name: string;
  /** Table-facing description of what fills the track. */
  generation: string;
  /** Cap before talents raise it. */
  baseMax: number;
  /** What a freshly made character starts on. */
  startsAt: number;
  /** What the track returns to when it resets. */
  resetsTo: number;
  resetOn: "combat_end" | "rest";
  /** Talent text that raises the cap by one each time it is taken. */
  capTalent?: string;
  spenders: readonly ClassResourceSpender[];
}

export interface ClassInfo {
  id: string;
  name: string;
  hitDie: number;
  weapons?: readonly string[];
  armor?: readonly string[];
  spellcasting?: {
    ability: "int" | "wis" | "cha";
    type: "arcane" | "divine" | "primal" | "occult";
  };
  level1Features?: readonly ClassFeature[];
  talentTable?: readonly TalentEntry[];
  resource?: ClassResourceDefinition;
}

export const CLASSES: readonly ClassInfo[] = [
  {
    id: "fighter",
    name: "Fighter",
    hitDie: 8,
    weapons: ["All weapons"],
    armor: ["All armor", "Shields"],
    level1Features: [
      { name: "Hauler", description: "Add CON mod to total gear slots." },
      { name: "Weapon Mastery", description: "+1 attack and damage with mastered weapon group, +1/3 level to damage." },
      { name: "Grit", description: "Extra attacks progression (2 at lvl 6, 3 at lvl 13, 4 at lvl 20)." },
    ],
    talentTable: [
      { roll: "2", min: 2, max: 2, effect: "Gain Weapon Mastery with an additional weapon type." },
      { roll: "3-6", min: 3, max: 6, effect: "+1 to melee and ranged attack rolls." },
      { roll: "7-9", min: 7, max: 9, effect: "+2 to Strength, Dexterity, or Constitution stat." },
      { roll: "10-11", min: 10, max: 11, effect: "+1 to melee and ranged damage rolls." },
      { roll: "12", min: 12, max: 12, effect: "Choose any talent or gain +2 points to distribute among stats." },
    ],
  },
  {
    id: "thief",
    name: "Thief",
    hitDie: 6,
    weapons: ["Club", "Crossbow", "Dagger", "Shortbow", "Shortsword"],
    armor: ["Leather armor", "Mithral chainmail"],
    level1Features: [
      { name: "Backstab", description: "Deal extra damage dice (+1d6 per 2 levels) against unaware/flanked targets." },
      { name: "Thievery", description: "Advantage on checks for stealth, picking locks, and disarming traps." },
      { name: "Passive Trap Sense", description: "Automatically test DEX to notice hidden traps." },
    ],
    talentTable: [
      { roll: "2", min: 2, max: 2, effect: "Roll Backstab damage with Advantage." },
      { roll: "3-5", min: 3, max: 5, effect: "+1 to attack rolls with ranged or finesse weapons." },
      { roll: "6-8", min: 6, max: 8, effect: "+2 to Dexterity or Charisma stat." },
      { roll: "9-11", min: 9, max: 11, effect: "+1 bonus on all Passive Trap Sense and Thievery checks." },
      { roll: "12", min: 12, max: 12, effect: "Choose any talent or gain +2 points to distribute among stats." },
    ],
  },
  {
    id: "priest",
    name: "Priest",
    hitDie: 6,
    weapons: ["Club", "Crossbow", "Dagger", "Mace", "Staff", "Warhammer"],
    armor: ["All armor", "Shields"],
    spellcasting: {
      ability: "wis",
      type: "divine",
    },
    level1Features: [
      { name: "Divine Spellcasting", description: "Cast divine miracles using Wisdom vs DC 10 + Tier." },
      { name: "Turn Undead", description: "Rebuke undead with holy authority." },
    ],
    talentTable: [
      { roll: "2", min: 2, max: 2, effect: "Choose one priest spell you know; cast it with Advantage." },
      { roll: "3-6", min: 3, max: 6, effect: "+1 to divine spellcasting checks." },
      { roll: "7-9", min: 7, max: 9, effect: "+2 to Strength, Constitution, or Wisdom stat." },
      { roll: "10-11", min: 10, max: 11, effect: "+1 to melee attack and damage rolls with bludgeoning weapons." },
      { roll: "12", min: 12, max: 12, effect: "Choose any talent or gain +2 points to distribute among stats." },
    ],
  },
  {
    id: "wizard",
    name: "Wizard",
    hitDie: 4,
    weapons: ["Dagger", "Staff"],
    armor: ["None"],
    spellcasting: {
      ability: "int",
      type: "arcane",
    },
    level1Features: [
      { name: "Arcane Spellcasting", description: "Cast arcane formulas using Intelligence vs DC 10 + Tier." },
      { name: "Spellbook", description: "Begins with 3 Tier 1 spells inscribed." },
    ],
    talentTable: [
      { roll: "2", min: 2, max: 2, effect: "Learn one additional wizard spell of any tier you can cast." },
      { roll: "3-6", min: 3, max: 6, effect: "+1 to arcane spellcasting checks." },
      { roll: "7-9", min: 7, max: 9, effect: "+2 to Intelligence or Wisdom stat." },
      { roll: "10-11", min: 10, max: 11, effect: "Modify one known spell to cast at Far range or learn 1 spell." },
      { roll: "12", min: 12, max: 12, effect: "Choose any talent or gain +2 points to distribute among stats." },
    ],
  },
  {
    id: "delver",
    name: "Delver",
    hitDie: 6,
    weapons: ["Club", "Crossbow", "Dagger", "Shortbow", "Shortsword", "Spear", "Staff", "Whip"],
    armor: ["Leather armor", "Chainmail", "Shields"],
    level1Features: [
      { name: "Scavenger", description: "5-6 on d6 regains last consumed resource." },
      { name: "Trailblazer", description: "Advantage on climbing, swimming, foraging, avoiding hazards." },
    ],
    talentTable: [
      { roll: "2", min: 2, max: 2, effect: "Scavenger triggers on a roll of 4-6 on 1d6." },
      { roll: "3-6", min: 3, max: 6, effect: "+1 to attack rolls with light weapons." },
      { roll: "7-9", min: 7, max: 9, effect: "+2 to Strength, Dexterity, or Constitution stat." },
      { roll: "10-11", min: 10, max: 11, effect: "+2 bonus gear slots." },
      { roll: "12", min: 12, max: 12, effect: "Choose any talent or gain +2 points to distribute among stats." },
    ],
  },
  {
    id: "ras_godai",
    name: "Ras-Godai",
    hitDie: 6,
    weapons: ["Blowgun", "Dagger", "Garrote", "Shortbow", "Shortsword", "Shuriken"],
    armor: ["Leather armor"],
    level1Features: [
      { name: "Shadow Step", description: "Teleport near through dark shadows." },
      { name: "Assassinate", description: "Double damage dice from stealth." },
    ],
    talentTable: [
      { roll: "2", min: 2, max: 2, effect: "+2 to stealth and poison DC saves." },
      { roll: "3-6", min: 3, max: 6, effect: "+1 to attack rolls with light blades." },
      { roll: "7-9", min: 7, max: 9, effect: "+2 to Dexterity, Wisdom, or Charisma stat." },
      { roll: "10-11", min: 10, max: 11, effect: "Extra 1d6 necrotic damage on sneak attacks." },
      { roll: "12", min: 12, max: 12, effect: "Choose any talent or gain +2 points to distribute among stats." },
    ],
  },
  {
    id: "druid",
    name: "Druid",
    hitDie: 6,
    weapons: ["Club", "Dagger", "Scimitar", "Sickle", "Sling", "Spear", "Staff"],
    armor: ["Leather armor", "Wooden shields"],
    spellcasting: {
      ability: "wis",
      type: "primal",
    },
    level1Features: [
      { name: "Wild Shape", description: "Transform into beast form 1/day per level." },
      { name: "Primal Spellcasting", description: "Cast nature spells with Wisdom." },
    ],
    talentTable: [
      { roll: "2", min: 2, max: 2, effect: "Wild Shape lasts double duration and grants +2 AC." },
      { roll: "3-6", min: 3, max: 6, effect: "+1 to primal spellcasting checks." },
      { roll: "7-9", min: 7, max: 9, effect: "+2 to Constitution or Wisdom stat." },
      { roll: "10-11", min: 10, max: 11, effect: "+1 to attack and damage rolls with spears." },
      { roll: "12", min: 12, max: 12, effect: "Choose any talent or gain +2 points to distribute among stats." },
    ],
  },
  {
    id: "alchemist",
    name: "Alchemist",
    hitDie: 6,
    weapons: ["Club", "Crossbow", "Dagger", "Sling", "Staff"],
    armor: ["Leather armor"],
    level1Features: [
      { name: "Reagent Extraction", description: "Harvest essence from monsters." },
      { name: "Concoct Brews", description: "Craft bombs and potions during rest." },
    ],
    talentTable: [
      { roll: "2", min: 2, max: 2, effect: "Alchemical bombs deal +1d6 splash damage." },
      { roll: "3-6", min: 3, max: 6, effect: "+1 to ranged attacks with thrown flasks." },
      { roll: "7-9", min: 7, max: 9, effect: "+2 to Intelligence or Constitution stat." },
      { roll: "10-11", min: 10, max: 11, effect: "Brew 1 extra free potion per rest cycle." },
      { roll: "12", min: 12, max: 12, effect: "Choose any talent or gain +2 points to distribute among stats." },
    ],
  },
  {
    id: "sage",
    name: "Sage",
    hitDie: 4,
    weapons: ["Dagger", "Staff"],
    armor: ["None"],
    spellcasting: {
      ability: "int",
      type: "arcane",
    },
    level1Features: [
      { name: "Encyclopedic Lore", description: "Advantage on monster/history lore checks." },
      { name: "Scroll Savant", description: "Cast scrolls of any tradition without failure." },
    ],
    talentTable: [
      { roll: "2", min: 2, max: 2, effect: "Scrolls you cast have DC reduced by 2." },
      { roll: "3-6", min: 3, max: 6, effect: "+1 to all INT and WIS checks and saves." },
      { roll: "7-9", min: 7, max: 9, effect: "+2 to Intelligence or Wisdom stat." },
      { roll: "10-11", min: 10, max: 11, effect: "+1 lore tier mastery." },
      { roll: "12", min: 12, max: 12, effect: "Choose any talent or gain +2 points to distribute among stats." },
    ],
  },
  {
    id: "monk",
    name: "Monk",
    hitDie: 6,
    weapons: ["Club", "Dagger", "Staff"],
    armor: ["None"],
    level1Features: [
      { name: "Martial Arts", description: "1d6 unarmed strikes using DEX." },
      { name: "Ki Defense", description: "AC is 10 + DEX + WIS unarmored." },
    ],
    talentTable: [
      { roll: "2", min: 2, max: 2, effect: "Unarmed strikes increase damage die step." },
      { roll: "3-6", min: 3, max: 6, effect: "+1 to unarmed attack rolls." },
      { roll: "7-9", min: 7, max: 9, effect: "+2 to Dexterity, Constitution, or Wisdom stat." },
      { roll: "10-11", min: 10, max: 11, effect: "+10 ft movement speed." },
      { roll: "12", min: 12, max: 12, effect: "Choose any talent or gain +2 points to distribute among stats." },
    ],
  },
  {
    id: "bard",
    name: "Bard",
    hitDie: 6,
    weapons: ["Club", "Crossbow", "Dagger", "Shortbow", "Shortsword", "Spear", "Staff"],
    armor: ["Leather armor", "Chainmail", "Shields"],
    spellcasting: {
      ability: "cha",
      type: "arcane",
    },
    level1Features: [
      { name: "Bardic Inspiration", description: "Grant ally +1d6 to next check or attack." },
    ],
    talentTable: [
      { roll: "2", min: 2, max: 2, effect: "Inspiration die increases to 1d8." },
      { roll: "3-6", min: 3, max: 6, effect: "+1 to spellcasting and performance checks." },
      { roll: "7-9", min: 7, max: 9, effect: "+2 to Dexterity or Charisma stat." },
      { roll: "10-11", min: 10, max: 11, effect: "+1 attack and damage with finesse weapons." },
      { roll: "12", min: 12, max: 12, effect: "Choose any talent or gain +2 points to distribute among stats." },
    ],
  },
  {
    id: "duelist",
    name: "Duelist",
    hitDie: 8,
    weapons: ["Crossbow", "Dagger", "Rapier", "Shortsword"],
    armor: ["Leather armor"],
    level1Features: [
      { name: "Parry & Riposte", description: "+2 AC reaction vs melee attacks." },
    ],
    talentTable: [
      { roll: "2", min: 2, max: 2, effect: "Parry bonus increases to +3 AC." },
      { roll: "3-6", min: 3, max: 6, effect: "+1 to attack rolls with rapiers." },
      { roll: "7-9", min: 7, max: 9, effect: "+2 to Dexterity or Charisma stat." },
      { roll: "10-11", min: 10, max: 11, effect: "+1 damage and crit on 19-20." },
      { roll: "12", min: 12, max: 12, effect: "Choose any talent or gain +2 points to distribute among stats." },
    ],
  },
  {
    id: "ranger",
    name: "Ranger",
    hitDie: 8,
    weapons: ["Dagger", "Longbow", "Longsword", "Shortbow", "Shortsword", "Spear", "Staff"],
    armor: ["Leather armor", "Chainmail", "Shields"],
    level1Features: [
      { name: "Favored Terrain", description: "Cannot become lost in chosen biome." },
      { name: "Hunter's Mark", description: "+1d4 damage against quarry." },
    ],
    talentTable: [
      { roll: "2", min: 2, max: 2, effect: "Hunter's Mark damage increases to 1d6." },
      { roll: "3-6", min: 3, max: 6, effect: "+1 to ranged attack rolls." },
      { roll: "7-9", min: 7, max: 9, effect: "+2 to Dexterity, Constitution, or Wisdom stat." },
      { roll: "10-11", min: 10, max: 11, effect: "+1 to tracking checks." },
      { roll: "12", min: 12, max: 12, effect: "Choose any talent or gain +2 points to distribute among stats." },
    ],
  },
  {
    id: "barbarian",
    name: "Barbarian",
    hitDie: 8,
    weapons: ["All melee weapons", "Javelin", "Shortbow"],
    armor: ["All armor", "Shields"],
    level1Features: [
      { name: "Shield Wall", description: "While wielding a shield, spend your action to lock a defensive stance: your AC becomes 20 until your next turn." },
      { name: "The Old Gods", description: "Each dawn choose one blessing until the next dawn — Odin (+1 to spellcasting and lore checks), Thor (+1d4 lightning damage the first time you kill an enemy each combat), Freya (1/day gain a Luck Token if you lack one; spending one adds +1d6 to the roll), or Loki (advantage on checks to lie, sneak, and hide)." },
    ],
    talentTable: [
      { roll: "2", min: 2, max: 2, effect: "1/day, Go Berserk: become immune to damage for 3 rounds." },
      { roll: "3-6", min: 3, max: 6, effect: "Your weapon attacks deal +1 damage." },
      { roll: "7-9", min: 7, max: 9, effect: "+2 to Strength or Constitution stat, or +1 to attack rolls." },
      { roll: "10-11", min: 10, max: 11, effect: "Duality: choose two different Old Gods blessings each dawn instead of one." },
      { roll: "12", min: 12, max: 12, effect: "Choose any talent or gain +2 points to distribute among stats." },
    ],
  },
  {
    id: "chaos_knight",
    name: "Chaos Knight",
    hitDie: 6,
    weapons: ["All melee weapons", "Crossbow"],
    armor: ["All armor", "Shields"],
    spellcasting: { ability: "cha", type: "occult" },
    level1Features: [
      { name: "Demonic Possession", description: "Enter a frenzied trance for 3 rounds, gaining +1 to attack and damage rolls plus half your level (round down)." },
      { name: "Witch Spellcasting", description: "Cast from the witch spell list using Charisma (DC 10 + spell tier). A natural 1 calls for a diabolical mishap." },
    ],
    resource: {
      id: "possession",
      name: "Possession",
      generation: "Refills to full when you complete a rest.",
      baseMax: 3,
      startsAt: 3,
      resetsTo: 3,
      resetOn: "rest",
      spenders: [
        { id: "demonic_possession", name: "Demonic Possession", cost: 1, description: "Frenzied trance for 3 rounds: +1 to attack and damage, plus half your level." },
      ],
    },
    talentTable: [
      { roll: "2", min: 2, max: 2, effect: "1/day, wreath your weapon in hellfire (+2d6 fire damage on hit for 3 rounds)." },
      { roll: "3-6", min: 3, max: 6, effect: "+1 to weapon attacks and damage." },
      { roll: "7-9", min: 7, max: 9, effect: "+2 to Strength, Constitution, or Charisma stat." },
      { roll: "10-11", min: 10, max: 11, effect: "Learn an additional witch spell of any tier you can cast." },
      { roll: "12", min: 12, max: 12, effect: "Choose any talent or gain +2 points to distribute among stats." },
    ],
  },
  {
    id: "warlock",
    name: "Warlock",
    hitDie: 6,
    weapons: ["Club", "Crossbow", "Dagger", "Mace", "Longsword"],
    armor: ["Leather armor", "Chainmail", "Shields"],
    spellcasting: { ability: "cha", type: "occult" },
    level1Features: [
      { name: "Patron Bond", description: "Swear yourself to an otherworldly patron. Only patrons whose boons carry spells will take a novice conduit." },
      { name: "Patron Boons", description: "Gain one random boon from your patron at 1st level and another at every even level. When you level, you may roll on your patron's boon table instead of the Warlock talent table." },
    ],
    talentTable: [
      { roll: "2", min: 2, max: 2, effect: "Roll a patron boon from any patron — an unexplained eldritch gift." },
      { roll: "3-6", min: 3, max: 6, effect: "+1 to any two different stats." },
      { roll: "7-9", min: 7, max: 9, effect: "+1 to melee or ranged attacks." },
      { roll: "10-11", min: 10, max: 11, effect: "Roll two patron boons and choose one to keep." },
      { roll: "12", min: 12, max: 12, effect: "Choose any talent or gain +2 points to distribute among stats." },
    ],
  },
  {
    id: "witch",
    name: "Witch",
    hitDie: 4,
    weapons: ["Dagger", "Staff"],
    armor: ["Leather armor"],
    spellcasting: { ability: "cha", type: "occult" },
    level1Features: [
      { name: "Familiar", description: "A small loyal animal that speaks Common and can serve as the origin point for your spells. If it dies, restore it by permanently sacrificing 1d4 hit points." },
      { name: "Witch Spellcasting", description: "Cast from the witch spell list using Charisma (DC 10 + spell tier). A natural 1 calls for a diabolical mishap." },
    ],
    talentTable: [
      { roll: "2", min: 2, max: 2, effect: "1/day, teleport to your familiar's exact location as a move action." },
      { roll: "3-7", min: 3, max: 7, effect: "+2 to Charisma stat, or +1 to witch spellcasting checks." },
      { roll: "8-9", min: 8, max: 9, effect: "Gain advantage on casting one chosen witch spell." },
      { roll: "10-11", min: 10, max: 11, effect: "Learn an additional witch spell of any tier you can cast." },
      { roll: "12", min: 12, max: 12, effect: "Choose any talent or gain +2 points to distribute among stats." },
    ],
  },
  {
    id: "warrior_priest",
    name: "Warrior Priest",
    hitDie: 6,
    weapons: ["Club", "Mace", "Morningstar", "Warhammer", "Staff"],
    armor: ["Leather armor", "Chainmail", "Plate mail", "Shields"],
    level1Features: [
      { name: "Divine Prayers", description: "Spend an action to chant one prayer, projecting a near aura you hold with Focus (on taking damage, pass a CON check against DC 10 or half the damage, whichever is higher). Only one prayer at a time. Devotion: a near ally who deals melee damage heals 1 HP. Righteousness: near allies gain +1 to melee damage rolls. Absolution: near allies gain +1 AC and advantage on death timer rolls." },
      { name: "Righteous Fury", description: "You have no passive mana. You gain 1 Righteousness the first time you deal melee damage on each of your turns — if you are not swinging, your allies are dying." },
      { name: "Miracles", description: "Spend Righteousness as a free action on your turn. Miracles need no spellcasting check and cannot be lost for the day." },
    ],
    resource: {
      id: "righteousness",
      name: "Righteousness",
      generation: "Gain 1 the first time you deal melee damage to a hostile creature on each of your turns.",
      baseMax: 3,
      startsAt: 0,
      resetsTo: 0,
      resetOn: "combat_end",
      capTalent: "Righteous Vessel",
      spenders: [
        { id: "light_of_sigmar", name: "Light of Sigmar", cost: 1, description: "One near ally heals 1d4 HP." },
        { id: "divine_mend", name: "Divine Mend", cost: 2, description: "One near ally heals 1d4 HP, then 1 HP at the start of each of their next three turns." },
        { id: "martyrs_blessing", name: "Martyr's Blessing", cost: 3, description: "Ward a near ally: the next damage they take is reduced to 0." },
      ],
    },
    talentTable: [
      { roll: "2", min: 2, max: 2, effect: "Righteous Vessel: your maximum Righteousness increases by 1." },
      { roll: "3-6", min: 3, max: 6, effect: "Vanguard: +1 to melee attack rolls." },
      { roll: "7-9", min: 7, max: 9, effect: "Blessed Vigor: +2 to Strength, Constitution, or Wisdom stat." },
      { roll: "10-11", min: 10, max: 11, effect: "Unbreakable: permanent advantage on Constitution checks to maintain Focus on a prayer." },
      { roll: "12", min: 12, max: 12, effect: "Divine Champion: choose any option on this table or gain +2 points to distribute among stats." },
    ],
  },
] as const;

export const ITEMS: readonly ItemDefinition[] = [
  // Weapons
  { id: "dagger", name: "Dagger", kind: "weapon" as const, costGp: 2, slots: 1, damage: "1d4", properties: ["finesse", "thrown"], description: "Light concealable blade." },
  { id: "shortsword", name: "Shortsword", kind: "weapon" as const, costGp: 6, slots: 1, damage: "1d6", properties: ["finesse", "light"], description: "Quick, balanced blade." },
  { id: "longsword", name: "Longsword", kind: "weapon" as const, costGp: 10, slots: 1, damage: "1d8", properties: ["versatile"], description: "Classic one-handed blade (1d10 two-handed)." },
  { id: "greatsword", name: "Greatsword", kind: "weapon" as const, costGp: 15, slots: 2, damage: "1d12", properties: ["heavy", "two-handed"], description: "Massive two-handed greatsword." },
  { id: "greataxe", name: "Greataxe", kind: "weapon" as const, costGp: 15, slots: 1, damage: "1d10", properties: ["versatile"], description: "Broad war axe, wielded one- or two-handed (1d12 two-handed)." },
  { id: "bastard_sword", name: "Bastard Sword", kind: "weapon" as const, costGp: 15, slots: 1, damage: "1d10", properties: ["versatile"], description: "Hand-and-a-half blade, wielded one- or two-handed (1d12 two-handed)." },
  { id: "mace", name: "Mace", kind: "weapon" as const, costGp: 8, slots: 1, damage: "1d6", properties: ["bludgeoning"], description: "Heavy fluted mace (+1 vs skeletons/armor)." },
  { id: "warhammer", name: "Warhammer", kind: "weapon" as const, costGp: 12, slots: 1, damage: "1d8", properties: ["bludgeoning", "versatile"], description: "Forged crushing hammer (1d10 two-handed)." },
  { id: "spear", name: "Spear", kind: "weapon" as const, costGp: 3, slots: 1, damage: "1d6", properties: ["reach", "thrown"], description: "Long ash spear with iron tip." },
  { id: "polearm", name: "Polearm", kind: "weapon" as const, costGp: 12, slots: 2, damage: "1d10", properties: ["heavy", "reach", "two-handed"], description: "Halberd or billhook with extended reach." },
  { id: "shortbow", name: "Shortbow", kind: "weapon" as const, costGp: 12, slots: 1, damage: "1d6", properties: ["ranged", "two-handed"], description: "Light recurve hunting bow (Far range)." },
  { id: "longbow", name: "Longbow", kind: "weapon" as const, costGp: 25, slots: 2, damage: "1d8", properties: ["ranged", "heavy", "two-handed"], description: "Tall yew war bow (Far range)." },
  { id: "light_crossbow", name: "Light Crossbow", kind: "weapon" as const, costGp: 16, slots: 1, damage: "1d6", properties: ["ranged", "loading"], description: "Spanned crossbow (Far range, loading)." },
  { id: "heavy_crossbow", name: "Heavy Crossbow", kind: "weapon" as const, costGp: 30, slots: 2, damage: "1d10", properties: ["ranged", "heavy", "loading"], description: "Steel windlass crossbow (Far range, heavy, loading)." },
  { id: "staff", name: "Staff", kind: "weapon" as const, costGp: 1, slots: 1, damage: "1d4", properties: ["versatile"], description: "Hardened walking quarterstaff." },
  { id: "club", name: "Club", kind: "weapon" as const, costGp: 1, slots: 1, damage: "1d4", properties: ["bludgeoning"], description: "Simple stout cudgel." },

  // Armor & Shields
  { id: "leather_armor", name: "Leather Armor", kind: "armor" as const, costGp: 10, slots: 1, baseAc: 11, properties: ["stealth_allowed"], description: "AC 11 + DEX mod. Stealth allowed." },
  { id: "chainmail", name: "Chainmail", kind: "armor" as const, costGp: 40, slots: 2, baseAc: 13, maxDexMod: 2, properties: ["disadvantage_stealth"], description: "AC 13 + DEX mod (max +2). Disadvantage on Stealth." },
  { id: "plate_armor", name: "Plate Armor", kind: "armor" as const, costGp: 100, slots: 3, baseAc: 15, maxDexMod: 1, properties: ["disadvantage_stealth", "disadvantage_swim"], description: "AC 15 + DEX mod (max +1). Disadvantage on Stealth and Swimming." },
  { id: "shield", name: "Shield", kind: "shield" as const, costGp: 10, slots: 1, acBonus: 2, properties: ["shield"], description: "+2 AC. Requires one free hand." },
  { id: "round_shield", name: "Round Shield", kind: "shield" as const, costGp: 10, slots: 1, acBonus: 2, properties: ["shield"], description: "Wood-and-hide raider's shield. +2 AC. Requires one free hand." },

  // Gear & Supplies
  { id: "backpack", name: "Backpack", kind: "gear" as const, costGp: 2, slots: 0, description: "Holds gear. Does not take up a gear slot." },
  { id: "torches", name: "Torches", kind: "gear" as const, costGp: 1, slots: 1, description: "Sheds light in Near radius for 6 Crawling Turns." },
  { id: "lantern_oil", name: "Lantern & Oil Flask", kind: "gear" as const, costGp: 10, slots: 1, description: "Sheds light in Far radius; burns 3 hours." },
  { id: "oil_flask", name: "Oil Flask", kind: "consumable" as const, costGp: 1, slots: 1, description: "Fuel for lantern or throwable fire hazard." },
  { id: "rations", name: "Rations", kind: "consumable" as const, costGp: 1, slots: 1, description: "Preserved hardtack and dried meat (prevents starvation)." },
  { id: "rope_hook", name: "Hemp Rope (50 ft) & Hook", kind: "gear" as const, costGp: 2, slots: 1, description: "Advantage on climbing checks." },
  { id: "thieves_tools", name: "Thieves' Tools", kind: "gear" as const, costGp: 25, slots: 1, description: "Required to pick locks and disarm mechanical traps." },
  { id: "iron_spikes", name: "Iron Spikes & Hammer (10)", kind: "gear" as const, costGp: 2, slots: 1, description: "Wedge dungeon doors shut or secure pitons." },
  { id: "healing_salve", name: "Healing Salve (3 uses)", kind: "consumable" as const, costGp: 10, slots: 1, description: "Restores 1d4 HP during rest." },
  { id: "holy_water", name: "Holy Water (Flask)", kind: "consumable" as const, costGp: 25, slots: 1, description: "2d6 radiant damage to undead/fiends." },
  { id: "spellbook", name: "Spellbook", kind: "gear" as const, costGp: 25, slots: 1, description: "Inscribed with wizard formulas; required for arcane casting." },
  { id: "holy_symbol", name: "Holy Symbol", kind: "gear" as const, costGp: 5, slots: 0, description: "Divine focus required for miracles and turning undead." },
  { id: "arrows", name: "Arrows (Quiver of 20)", kind: "gear" as const, costGp: 1, slots: 1, description: "Ammunition for bows." },
  { id: "bolts", name: "Crossbow Bolts (Case of 20)", kind: "gear" as const, costGp: 1, slots: 1, description: "Ammunition for crossbows." },
] as const;

export const STARTING_EQUIPMENT: Record<string, Array<{ itemId: string; equipped?: boolean; quantity?: number; remainingTorches?: number }>> = {
  fighter: [
    { itemId: "greatsword", equipped: true },
    { itemId: "leather_armor", equipped: true },
    { itemId: "backpack", equipped: false },
    { itemId: "torches", quantity: 1, remainingTorches: 2 },
    { itemId: "rations", quantity: 3 },
  ],
  duelist: [
    { itemId: "bastard_sword", equipped: true },
    { itemId: "leather_armor", equipped: true },
    { itemId: "backpack", equipped: false },
    { itemId: "torches", quantity: 1, remainingTorches: 2 },
    { itemId: "rations", quantity: 3 },
  ],
  wizard: [
    { itemId: "staff", equipped: true },
    { itemId: "backpack", equipped: false },
    { itemId: "torches", quantity: 1, remainingTorches: 2 },
    { itemId: "rations", quantity: 3 },
  ],
  cleric: [
    { itemId: "warhammer", equipped: true },
    { itemId: "leather_armor", equipped: true },
    { itemId: "backpack", equipped: false },
    { itemId: "torches", quantity: 1, remainingTorches: 2 },
    { itemId: "rations", quantity: 3 },
  ],
  priest: [
    { itemId: "warhammer", equipped: true },
    { itemId: "leather_armor", equipped: true },
    { itemId: "backpack", equipped: false },
    { itemId: "torches", quantity: 1, remainingTorches: 2 },
    { itemId: "rations", quantity: 3 },
  ],
  thief: [
    { itemId: "shortsword", equipped: true },
    { itemId: "leather_armor", equipped: true },
    { itemId: "backpack", equipped: false },
    { itemId: "torches", quantity: 1, remainingTorches: 2 },
    { itemId: "rations", quantity: 3 },
  ],
  bard: [
    { itemId: "shortsword", equipped: true },
    { itemId: "leather_armor", equipped: true },
    { itemId: "backpack", equipped: false },
    { itemId: "torches", quantity: 1, remainingTorches: 2 },
    { itemId: "rations", quantity: 3 },
  ],
  ranger: [
    { itemId: "shortsword", equipped: true },
    { itemId: "leather_armor", equipped: true },
    { itemId: "backpack", equipped: false },
    { itemId: "torches", quantity: 1, remainingTorches: 2 },
    { itemId: "rations", quantity: 3 },
  ],
  delver: [
    { itemId: "shortsword", equipped: true },
    { itemId: "leather_armor", equipped: true },
    { itemId: "backpack", equipped: false },
    { itemId: "torches", quantity: 1, remainingTorches: 2 },
    { itemId: "rations", quantity: 3 },
  ],
  druid: [
    { itemId: "staff", equipped: true },
    { itemId: "leather_armor", equipped: true },
    { itemId: "backpack", equipped: false },
    { itemId: "torches", quantity: 1, remainingTorches: 2 },
    { itemId: "rations", quantity: 3 },
  ],
  sage: [
    { itemId: "staff", equipped: true },
    { itemId: "backpack", equipped: false },
    { itemId: "torches", quantity: 1, remainingTorches: 2 },
    { itemId: "rations", quantity: 3 },
  ],
  monk: [
    { itemId: "staff", equipped: true },
    { itemId: "backpack", equipped: false },
    { itemId: "torches", quantity: 1, remainingTorches: 2 },
    { itemId: "rations", quantity: 3 },
  ],
  alchemist: [
    { itemId: "dagger", equipped: true },
    { itemId: "leather_armor", equipped: true },
    { itemId: "backpack", equipped: false },
    { itemId: "torches", quantity: 1, remainingTorches: 2 },
    { itemId: "rations", quantity: 3 },
  ],
  barbarian: [
    { itemId: "greataxe", equipped: true },
    { itemId: "round_shield", equipped: true },
    { itemId: "leather_armor", equipped: true },
    { itemId: "backpack", equipped: false },
    { itemId: "torches", quantity: 1, remainingTorches: 2 },
    { itemId: "rations", quantity: 3 },
  ],
  chaos_knight: [
    { itemId: "longsword", equipped: true },
    { itemId: "chainmail", equipped: true },
    { itemId: "backpack", equipped: false },
    { itemId: "torches", quantity: 1, remainingTorches: 2 },
    { itemId: "rations", quantity: 3 },
  ],
  warlock: [
    { itemId: "dagger", equipped: true },
    { itemId: "leather_armor", equipped: true },
    { itemId: "backpack", equipped: false },
    { itemId: "torches", quantity: 1, remainingTorches: 2 },
    { itemId: "rations", quantity: 3 },
  ],
  witch: [
    { itemId: "staff", equipped: true },
    { itemId: "leather_armor", equipped: true },
    { itemId: "backpack", equipped: false },
    { itemId: "torches", quantity: 1, remainingTorches: 2 },
    { itemId: "rations", quantity: 3 },
  ],
  warrior_priest: [
    { itemId: "warhammer", equipped: true },
    { itemId: "chainmail", equipped: true },
    { itemId: "shield", equipped: true },
    { itemId: "backpack", equipped: false },
    { itemId: "torches", quantity: 1, remainingTorches: 2 },
    { itemId: "rations", quantity: 3 },
  ],
  ras_godai: [
    { itemId: "shortsword", equipped: true },
    { itemId: "leather_armor", equipped: true },
    { itemId: "backpack", equipped: false },
    { itemId: "torches", quantity: 1, remainingTorches: 2 },
    { itemId: "rations", quantity: 3 },
  ],
};

export const SPELLS: readonly SpellDefinition[] = [
  // Tier 1
  {
    id: "magic_missile",
    name: "Magic Missile",
    tier: 1,
    sphere: "arcane" as const,
    range: "far" as const,
    duration: "instant",
    description: "Automatically hits target for 1d4 + INT mod force damage.",
  },
  {
    id: "shield_of_faith",
    name: "Shield of Faith",
    tier: 1,
    sphere: "divine" as const,
    range: "close" as const,
    duration: "5 rounds",
    description: "Grants +2 bonus to target's Armor Class.",
  },
  {
    id: "cure_wounds",
    name: "Cure Wounds",
    tier: 1,
    sphere: "divine" as const,
    range: "close" as const,
    duration: "instant",
    description: "Touched living creature regains 1d8 + WIS mod Hit Points.",
  },
  {
    id: "light",
    name: "Light",
    tier: 1,
    sphere: "arcane" as const,
    range: "near" as const,
    duration: "1 hour",
    description: "Shines bright light in Near radius.",
  },
  {
    id: "sleep",
    name: "Sleep",
    tier: 1,
    sphere: "arcane" as const,
    range: "near" as const,
    duration: "10 rounds",
    description: "Up to 2d6 HD of creatures in Near radius fall into deep slumber.",
  },
  {
    id: "entangle",
    name: "Entangle",
    tier: 1,
    sphere: "primal" as const,
    range: "near" as const,
    duration: "5 rounds",
    description: "Vines burst from ground; targets must pass STR check or be immobilized.",
  },
  // Tier 2
  {
    id: "scorching_ray",
    name: "Scorching Ray",
    tier: 2,
    sphere: "arcane" as const,
    range: "far" as const,
    duration: "instant",
    description: "Fires 2 fiery rays dealing 2d6 fire damage each on ranged spell hits.",
  },
  {
    id: "hold_person",
    name: "Hold Person",
    tier: 2,
    sphere: "divine" as const,
    range: "near" as const,
    duration: "5 rounds",
    description: "Humanoid target must pass WIS save or be paralyzed.",
  },
  {
    id: "lesser_restoration",
    name: "Lesser Restoration",
    tier: 2,
    sphere: "divine" as const,
    range: "close" as const,
    duration: "instant",
    description: "Cures target of one poison, paralysis, or blinding condition.",
  },
  {
    id: "invisibility",
    name: "Invisibility",
    tier: 2,
    sphere: "arcane" as const,
    range: "close" as const,
    duration: "10 mins",
    description: "Target is completely invisible until attacking or casting a spell.",
  },
  {
    id: "barkskin",
    name: "Barkskin",
    tier: 2,
    sphere: "primal" as const,
    range: "self" as const,
    duration: "10 mins",
    description: "Caster's natural AC becomes 16 regardless of armor worn.",
  },
  // Occult — the witch list, shared by Witch, Warlock and Chaos Knight.
  {
    id: "hex",
    name: "Hex",
    tier: 1,
    sphere: "occult" as const,
    range: "near" as const,
    duration: "focus",
    description: "Name one ability. The target rolls checks and saves with that ability at disadvantage while you hold focus.",
  },
  {
    id: "chill_of_the_grave",
    name: "Chill of the Grave",
    tier: 1,
    sphere: "occult" as const,
    range: "close" as const,
    duration: "instant",
    description: "Grave cold sinks into the target for 1d8 necrotic damage. Their next attack roll is made at disadvantage.",
  },
  {
    id: "shadow_veil",
    name: "Shadow Veil",
    tier: 1,
    sphere: "occult" as const,
    range: "self" as const,
    duration: "focus",
    description: "Shadow gathers around you. Advantage on checks to hide, and attacks against you in dim light or darkness are made at disadvantage.",
  },
  {
    id: "whispers_of_the_void",
    name: "Whispers of the Void",
    tier: 1,
    sphere: "occult" as const,
    range: "near" as const,
    duration: "instant",
    description: "Something older than language speaks into one creature's mind. It answers a single question truthfully, or flees for 1d4 rounds if it cannot bear the voice.",
  },
  {
    id: "blood_pact",
    name: "Blood Pact",
    tier: 2,
    sphere: "occult" as const,
    range: "touch" as const,
    duration: "1 day",
    description: "Bind your life to a willing creature. Damage they take may instead be taken by you, one instance at a time, until the pact is broken.",
  },
  {
    id: "curse_of_ruin",
    name: "Curse of Ruin",
    tier: 2,
    sphere: "occult" as const,
    range: "far" as const,
    duration: "focus",
    description: "The target rots from within for 1d6 necrotic damage at the start of each of its turns, and critically fails on a natural 1 or 2 while you hold focus.",
  },
] as const;

export const ARCANE_MISHAPS = [
  "Arcane Backlash: Caster takes 1d6 damage per Spell Tier directly to Hit Points.",
  "Planar Bleed: A hostile minor shadow imp or planar voidling spawns adjacent to the caster.",
  "Spell Inversion: The spell affects the nearest ally or the caster instead of the intended target.",
  "Sensory Shock: Caster is blinded and deafened for 1d4 rounds.",
  "Eldritch Stigma: Caster’s skin turns translucent or glowing runes burn into flesh for 24 hours.",
  "Dead Magic Pocket: No spells can be cast in the current chamber/zone for 10 minutes.",
  "Memory Scourge: Caster forgets all spells of that tier until they complete a full rest in sanctuary.",
  "Cataclysmic Rift: Shockwave deals 2d8 force damage within Near radius and blows out all torches.",
] as const;

/** Rolled when an occult caster fumbles — the witch list exacts its own price. */
export const DIABOLICAL_MISHAPS = [
  "Debt Called In: Caster takes 1d6 damage per Spell Tier and the patron notes the shortfall.",
  "Unwelcome Guest: A minor fiend or fey spite manifests adjacent to the caster and is not friendly.",
  "Hex Rebound: The spell resolves against the caster instead of the intended target.",
  "Second Voice: For 1d4 rounds the caster can only speak in their patron's words, and cannot cast.",
  "The Mark Deepens: A visible sigil burns into the caster's flesh; disadvantage on social checks for 24 hours.",
  "Bound Tongue: Caster cannot cast that spell again until they complete a rest in consecrated or warded ground.",
  "Familiar's Price: The caster's familiar, if any, takes 2d6 damage. Without one, the caster does.",
  "Torn Veil: Every torch and lantern within Near gutters out and cannot be relit for 10 minutes.",
] as const;

export const HEX_DEFINITIONS = [
  [
    "00",
    0,
    0,
    0,
    "Marin's Hold",
    "River Confluence Motte",
    0,
    "Motte-and-bailey Keep, Timber Palisade, The Crayfish Tavern",
  ],
  [
    "01",
    1,
    0,
    -1,
    "North Pine Pass",
    "Rocky Foothills",
    1,
    "Old Cobblestone Watchpost & Toll Bridge",
  ],
  [
    "02",
    1,
    1,
    -1,
    "Glimmercap Hollow",
    "Enchanted Woods",
    1,
    "Forest Gnome Enclave & Alchemical Market",
  ],
  [
    "03",
    1,
    1,
    0,
    "Whispering Delta",
    "Reed Riverbanks",
    1,
    "Abandoned Fisher Skiffs & Sunken Idol",
  ],
  [
    "04",
    1,
    0,
    1,
    "The Mist Fen",
    "Stagnant Swamp",
    1,
    "Willow Tree Barrow with iron-bound door",
  ],
  [
    "05",
    1,
    -1,
    1,
    "Briar Crags",
    "Bramble Hills",
    1,
    "Goblin Clan Outpost & Spiked Barricade",
  ],
  [
    "06",
    1,
    -1,
    0,
    "The Great Sinkhole",
    "Subterranean Descent",
    2,
    "Descent into the Underdark Karst System",
  ],
  [
    "07",
    2,
    0,
    -2,
    "Crag-Hold",
    "Mountain Ridge",
    2,
    "Half-Ogre & Giant Mercenary Trade Outpost",
  ],
  [
    "08",
    2,
    1,
    -2,
    "Sunken Karst Deeps",
    "Karst Limestone",
    2,
    "Flooded Caverns & Bioluminescent Cave",
  ],
  [
    "09",
    2,
    2,
    -2,
    "The Weeping Bog",
    "Toxic Mire",
    2,
    "Sunken Ziggurat of the Weeping Fish",
  ],
  [
    "10",
    2,
    2,
    -1,
    "The Ashen Waste",
    "Volcanic Ashfield",
    2,
    "Smoldering Fissure & Sulfur Pits",
  ],
  [
    "11",
    2,
    2,
    0,
    "The Drowned Shallows",
    "Coast / Delta",
    2,
    "Kuo-Toa Shoreline Shrine & Pearl Traders",
  ],
  [
    "12",
    2,
    1,
    1,
    "Elderwood Primeval",
    "Ancient Forest",
    2,
    "The Heart-Oak Monolith & Sacred Druid Circle",
  ],
  [
    "13",
    2,
    0,
    2,
    "Spire of Astralis",
    "High Peak",
    3,
    "Ancient High Elf Observatory & Star Arch",
  ],
  [
    "14",
    2,
    -1,
    2,
    "The Shadow Cavern",
    "Abyssal Chasm",
    3,
    "Drow Shadow Outpost & Web Bridges",
  ],
  [
    "15",
    2,
    -2,
    2,
    "The Dead Barrow Mound",
    "Desolate Moor",
    3,
    "Tomb of the First Warlord & Wight Crypt",
  ],
  [
    "16",
    2,
    -2,
    1,
    "Iron Gorge Foundry",
    "Canyon",
    2,
    "Orcish Iron Foundry & Smelter Works",
  ],
  [
    "17",
    2,
    -2,
    0,
    "Obsidian Crags",
    "Razor Rock",
    3,
    "Wyvern Roost & Dragon Glass Quarry",
  ],
  [
    "18",
    2,
    -1,
    -1,
    "The Bleeding Rift",
    "Planar Tear",
    3,
    "Eldritch Void Incursion & Floating Monoliths",
  ],
] as const;

export const MONSTERS = {
  trapdoor_spider: {
    name: "Giant Trapdoor Spider",
    ac: 13,
    hp: 18,
    morale: 7,
    attacks: ["Bite +4 — 1d8+2 piercing; DC 12 CON or paralyzed 1d4 rounds"],
    traits: [
      "Ambush Hunter: advantage while concealed",
      "Web Tether: drag a paralyzed target as a free action",
    ],
    lore: [
      "Digs silk-lined vertical pits and strikes from below.",
      "Ground vibrations can trigger a false strike.",
      "Fire deals double damage.",
      "Its venom can produce knockout draughts or blade poison.",
    ],
  },
  barrow_wight: {
    name: "Barrow Wight",
    ac: 14,
    hp: 26,
    morale: 10,
    attacks: [
      "Bronze Longsword +4 — 1d8+2 slashing",
      "Life Drain +4 — 1d6 necrotic; DC 13 CON or maximum HP reduced",
    ],
    traits: [
      "Resists cold, lightning, and non-magical weapons",
      "Immune to poison and necrotic damage",
    ],
    lore: [
      "Cursed warriors entombed in ancient barrows.",
      "Silver or magical weapons pierce their dried flesh.",
      "Holy water deals 2d6 extra radiant damage.",
      "The dried heart can enchant life-stealing weapons.",
    ],
  },
  owlbear: {
    name: "Owlbear",
    ac: 13,
    hp: 42,
    morale: 9,
    attacks: [
      "Beak +6 — 1d10+4 piercing",
      "Claws +6 — 2d6+4 slashing; both hits trigger 1d8 crushing hug",
    ],
    traits: ["Keen scent and sight", "Territorial apex predator"],
    lore: [
      "A ferocious nocturnal hybrid predator.",
      "Fights to the death to protect its young.",
      "Booming noise or sudden flame forces disadvantaged morale.",
      "Its optical lenses can be worked into night-seeing goggles.",
    ],
  },
} as const;

/** One entry on a patron's 2d6 boon table. */
export interface PatronBoon {
  roll: string;
  min: number;
  max: number;
  effect: string;
  /**
   * The spell this boon teaches, if any. A patron with no spell-granting boon
   * on their table cannot be bonded at character creation — see
   * {@link SPELL_GRANTING_PATRONS}.
   */
  grantsSpellId?: string;
}

export interface WarlockPatron {
  id: string;
  name: string;
  title: string;
  description: string;
  boons: readonly PatronBoon[];
}

/**
 * Every patron whose boons are known to the lodges. Some of these will not take
 * a novice conduit; {@link SPELL_GRANTING_PATRONS} is the list a warlock may
 * actually swear to. The rest still exist here because the Warlock talent on a
 * roll of 2 draws a boon from *any* patron's table.
 */
export const WARLOCK_PATRONS: readonly WarlockPatron[] = [
  {
    id: "shune_the_vile",
    name: "Shune the Vile",
    title: "The Whispering Witch",
    description: "Goddess of secrets kept too long. She trades knowledge for the telling of it, and every answer costs a truth of your own.",
    boons: [
      { roll: "2", min: 2, max: 2, effect: "Shune answers one question a day truthfully, in a voice only you hear.", grantsSpellId: "whispers_of_the_void" },
      { roll: "3-6", min: 3, max: 6, effect: "+1 to occult spellcasting checks." },
      { roll: "7-9", min: 7, max: 9, effect: "You learn the Hex spell, cast with Charisma.", grantsSpellId: "hex" },
      { roll: "10-11", min: 10, max: 11, effect: "Advantage on checks to detect a lie, and you always know when one is told in your presence." },
      { roll: "12", min: 12, max: 12, effect: "Choose any boon on this table." },
    ],
  },
  {
    id: "ramlaat",
    name: "Ramlaat",
    title: "The Pillager",
    description: "The blood god of the raiding season. He gives freely to those who take freely, and keeps a tally of everything spilled in his name.",
    boons: [
      { roll: "2", min: 2, max: 2, effect: "Once per day, when you drop to 0 HP you instead drop to 1 HP and deal 1d6 damage to every near creature." },
      { roll: "3-6", min: 3, max: 6, effect: "+1 to melee damage rolls." },
      { roll: "7-9", min: 7, max: 9, effect: "You learn the Blood Pact spell, cast with Charisma.", grantsSpellId: "blood_pact" },
      { roll: "10-11", min: 10, max: 11, effect: "You heal 1 HP each time you reduce a hostile creature to 0 HP." },
      { roll: "12", min: 12, max: 12, effect: "Choose any boon on this table." },
    ],
  },
  {
    id: "the_lost",
    name: "The Lost",
    title: "The Court in Exile",
    description: "A fey court with no country left to rule. They are courteous, patient, and entirely without mercy about the terms of an agreement.",
    boons: [
      { roll: "2", min: 2, max: 2, effect: "Once per day, step through a shadow to any point you can see within far range." },
      { roll: "3-6", min: 3, max: 6, effect: "+1 to any two different stats." },
      { roll: "7-9", min: 7, max: 9, effect: "You learn the Shadow Veil spell, cast with Charisma.", grantsSpellId: "shadow_veil" },
      { roll: "10-11", min: 10, max: 11, effect: "You never become lost, and you always know the way back to a door you have walked through." },
      { roll: "12", min: 12, max: 12, effect: "Choose any boon on this table." },
    ],
  },
  {
    id: "the_drowned_choir",
    name: "The Drowned Choir",
    title: "Voices Under the Ice",
    description: "Something that sang before there were throats, still singing beneath the deep water. It does not bargain so much as accrete.",
    boons: [
      { roll: "2", min: 2, max: 2, effect: "You no longer need to breathe, and cold does not harm you." },
      { roll: "3-6", min: 3, max: 6, effect: "+1 to Constitution or Charisma." },
      { roll: "7-9", min: 7, max: 9, effect: "You learn the Chill of the Grave spell, cast with Charisma.", grantsSpellId: "chill_of_the_grave" },
      { roll: "10-11", min: 10, max: 11, effect: "You learn the Curse of Ruin spell, cast with Charisma.", grantsSpellId: "curse_of_ruin" },
      { roll: "12", min: 12, max: 12, effect: "Choose any boon on this table." },
    ],
  },
  {
    id: "memnon",
    name: "Memnon",
    title: "The Chaos Lord",
    description: "A war-lord of the outer tumult who deals only in violence and its rewards. He teaches nothing — he simply makes you harder to kill, which is why no novice may swear to him.",
    boons: [
      { roll: "2", min: 2, max: 2, effect: "Your critical hits deal an additional damage die." },
      { roll: "3-6", min: 3, max: 6, effect: "+1 to attack rolls." },
      { roll: "7-9", min: 7, max: 9, effect: "+2 to Strength or Constitution." },
      { roll: "10-11", min: 10, max: 11, effect: "Reduce all physical damage you take by 1." },
      { roll: "12", min: 12, max: 12, effect: "Choose any boon on this table." },
    ],
  },
];

/**
 * The patrons a warlock may bond at character creation: only those whose boon
 * table actually teaches spells. Derived, not hand-maintained, so a patron
 * cannot drift onto the list without a spell to give.
 */
export const SPELL_GRANTING_PATRONS: readonly WarlockPatron[] = WARLOCK_PATRONS.filter((patron) =>
  patron.boons.some((boon) => boon.grantsSpellId !== undefined),
);

export function resolveWarlockPatron(patronId: string): WarlockPatron {
  const patron = SPELL_GRANTING_PATRONS.find((item) => item.id === patronId);
  if (!patron) {
    throw new Error(`"${patronId}" is not a patron a warlock may bond — their boons grant no spells`);
  }
  return patron;
}
