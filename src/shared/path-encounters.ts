/** Authored encounter packs. Mechanics use named facts/assets, never a shared Doom score. */
export const OUTER_PATH_IDS = ["cthulhu", "nyarlathotep", "shub_niggurath", "hastur", "yog_sothoth", "tsathoggua", "ithaqua", "tcho_tcho", "azathoth"] as const;
export type OuterPathId = typeof OUTER_PATH_IDS[number];
export interface EncounterNpc {
  id: string; name: string; role: string; wants: string; offers: string; refuses: string;
}
export interface PathMonster {
  id: string; name: string; count: number; ac: number; hpEach: number; attack: string;
  morale: number; objective: string; tell: string; tactic: string; defeat: string;
}
export interface PathClue {
  id: string; fact: string; text: string; source: string; leads: string[];
}
export interface EncounterEffects {
  facts?: string[]; assets?: Record<string, number>; clues?: string[];
  resolveGroup?: string; toll?: string; victory?: "A" | "B";
}
export interface PathInteraction {
  id: string; label: string; procedure: string; requires?: string[];
  costs?: Record<string, number>; check?: string; minutes: number;
  success: string; failure: string; effects: EncounterEffects;
  failureEffects?: EncounterEffects; once: boolean;
}
export interface EncounterSite {
  id: string; act: 1 | 2 | 3; name: string; terrain: string; arrival: string;
  directions: string; warning: string; exits: string[]; npcs: EncounterNpc[];
  monsters: PathMonster[]; interactions: PathInteraction[];
  quest: { title: string; request: string; reward: string; completeWhen: string };
}
export interface EncounterPack {
  version: 1; pathId: OuterPathId; title: string; sites: EncounterSite[];
  clues: PathClue[]; initialAssets: Record<string, number>; openingSites: string[];
}
export interface EncounterPackState {
  version: 1; pathId: OuterPathId; currentSite: string; knownSites: string[];
  visitedSites: string[]; facts: string[]; clues: string[]; completed: string[];
  resolvedGroups: string[]; assets: Record<string, number>; toll: string[];
  minutes: number; victories: ("A" | "B")[];
  journal: { sequence: number; text: string; siteId: string }[];
}
export interface PublicEncounterPack {
  title: string; currentSite: EncounterSite; knownSites: { id: string; name: string; directions: string }[];
  clues: PathClue[]; assets: Record<string, number>; toll: string[]; minutes: number;
  won: boolean; journal: EncounterPackState["journal"];
  actions: { id: string; label: string; procedure: string; check?: string; minutes: number;
    costs: Record<string, number>; success: string; failure: string; available: boolean; reason?: string }[];
  quests: { title: string; request: string; reward: string; completed: boolean }[];
}
