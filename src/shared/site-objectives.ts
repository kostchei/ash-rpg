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
}
