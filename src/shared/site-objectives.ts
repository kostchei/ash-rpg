/** Combined CoreDark / DuskUltima vocabulary; aliases share one objective type. */
export const SITE_OBJECTIVE_TYPES = ["recover_relic", "lift_curse", "harvest_components", "treasure_cache",
  "exotic_materials", "rescue_captive", "monster_eggs", "assassinate_leader", "secure_chokepoint",
  "defeat_guardian", "clear_border", "rescue_companion", "break_ward", "learn_secret", "secure_descent"] as const;
export type SiteObjectiveType = typeof SITE_OBJECTIVE_TYPES[number];
export interface GeneratedSiteObjective {
  id: string;
  sectionId: number;
  kind: SiteObjectiveType;
  target: string;
  procedure: string;
  completion: string;
  approaches: string[];
  /** Hidden until this objective is resolved; no automatic campaign victory. */
  clue?: string;
  nextAction?: string;
  treasureItem?: string;
  /** Present on rescue objectives: the classed NPC waiting to be freed. */
  rescuedNpc?: RescuedNpc;
}

/**
 * An NPC met or rescued inside a dungeon. They have a class — most are Iron Man
 * (1-5 on a d6), a 6 is an Unearthed Arcana character of a random class — and they
 * carry no gear: whatever they had was taken before the party found them.
 */
export interface RescuedNpc {
  name: string;
  ancestry: string;
  className: string;
  generationMethod: "iron_man" | "unearthed_arcana";
  abilities: { str: number; dex: number; con: number; int: number; wis: number; cha: number };
  /** Always empty; rescued NPCs must be equipped from the party's own stores. */
  gear: never[];
  /** Set once a player has taken them into their roster. */
  recruited?: boolean;
}
