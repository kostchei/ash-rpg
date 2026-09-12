/**
 * Shared danger vocabulary.
 *
 * Areas and quests are described with the Shadowdark danger words — Safe, Unsafe,
 * Risky, Deadly — instead of bare numbers. The stored `threatTier` column stays
 * numeric; this module is the single place that turns it into a word.
 */

export const DANGER_LEVELS = ["safe", "unsafe", "risky", "deadly"] as const;
export type DangerLevel = (typeof DANGER_LEVELS)[number];

/** A quest is never offered as Safe: an offer that carries no risk carries no budget. */
export const QUEST_RISK_LEVELS = ["unsafe", "risky", "deadly"] as const;
export type QuestRiskLevel = (typeof QUEST_RISK_LEVELS)[number];

export const DANGER_LEVEL_LABEL: Record<DangerLevel, string> = {
  safe: "Safe",
  unsafe: "Unsafe",
  risky: "Risky",
  deadly: "Deadly",
};

/** Short map-glyph forms, used where a full word does not fit. */
export const DANGER_LEVEL_ABBREVIATION: Record<DangerLevel, string> = {
  safe: "Sf",
  unsafe: "Un",
  risky: "Rk",
  deadly: "Dd",
};

const TIER_TO_DANGER: DangerLevel[] = ["safe", "unsafe", "risky", "deadly"];

/**
 * Labels a surveyed area's stored threat tier. This is an area descriptor only:
 * it is NOT a quest risk rating and must not be used to price a reward budget.
 */
export function dangerLevelForThreatTier(threatTier: number): DangerLevel {
  const level = TIER_TO_DANGER[threatTier];
  if (!level) throw new Error(`Unknown threat tier ${threatTier}: expected 0-3`);
  return level;
}

export function threatTierForDangerLevel(level: DangerLevel): number {
  const tier = TIER_TO_DANGER.indexOf(level);
  if (tier < 0) throw new Error(`Unknown danger level ${level}`);
  return tier;
}

export function isQuestRiskLevel(value: string): value is QuestRiskLevel {
  return (QUEST_RISK_LEVELS as readonly string[]).includes(value);
}
