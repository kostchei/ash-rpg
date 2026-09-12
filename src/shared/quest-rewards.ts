import { QUEST_RISK_LEVELS, type QuestRiskLevel } from "./danger.js";

/**
 * Quest reward budgets.
 *
 * Baselines follow the Shadowdark GM Quickstart guideline of roughly 10 GP times
 * average party level per encounter for the whole group, using the published
 * 20/50/80 GP shorthand for levels 1-3/4-6/7-9. The level-0 extension, the 10+
 * formula and the risk multipliers below are house rules; they are not a
 * transcription of the core treasure tables.
 *
 * See docs/quest-reward-guidance.md.
 */

/** House-rule multipliers on the baseline budget, keyed by the quest's stated risk. */
export const QUEST_RISK_MULTIPLIER: Record<QuestRiskLevel, number> = {
  unsafe: 1,
  risky: 1.5,
  deadly: 2,
};

/** Share of the budget a paying patron fronts; the rest is recoverable on site. */
export const DEFAULT_PATRON_SHARE = 2 / 3;

export interface QuestRewardInput {
  /** Level band the offer is written for. Fixed when the offer is created; never repriced on level-up. */
  intendedLevel: number;
  /** Meaningful encounters the job is expected to involve. */
  encounters: number;
  /** Explicit quest risk rating. Never inferred from an area's threat tier. */
  risk: QuestRiskLevel;
  /** 0 for a job paid only out of what the party recovers; 1 for a purely promised fee. */
  patronShare?: number;
}

export interface QuestRewardBudget {
  intendedLevel: number;
  encounters: number;
  risk: QuestRiskLevel;
  baselinePerEncounterGp: number;
  riskMultiplier: number;
  /** Total value for the whole party, not per character. */
  totalGp: number;
  /** The portion the patron promises up front. */
  patronFeeGp: number;
  /** The portion expected to come out of the site as recoverable valuables. */
  recoverableValueGp: number;
}

/** Group value per meaningful encounter for an intended level. */
export function baselineEncounterValueGp(intendedLevel: number): number {
  if (!Number.isInteger(intendedLevel) || intendedLevel < 0) {
    throw new Error(`Intended level must be a non-negative integer, received ${intendedLevel}`);
  }
  if (intendedLevel <= 3) return 20;
  if (intendedLevel <= 6) return 50;
  if (intendedLevel <= 9) return 80;
  return 10 * intendedLevel;
}

const roundToFive = (value: number) => Math.round(value / 5) * 5;

export function questRewardBudget(input: QuestRewardInput): QuestRewardBudget {
  const { intendedLevel, encounters, risk } = input;
  if (!Number.isInteger(encounters) || encounters < 1) {
    throw new Error(`A quest needs at least one meaningful encounter, received ${encounters}`);
  }
  if (!(QUEST_RISK_LEVELS as readonly string[]).includes(risk)) {
    throw new Error(`Unknown quest risk level ${risk}: expected ${QUEST_RISK_LEVELS.join(", ")}`);
  }
  const patronShare = input.patronShare ?? DEFAULT_PATRON_SHARE;
  if (patronShare < 0 || patronShare > 1) {
    throw new Error(`Patron share must be between 0 and 1, received ${patronShare}`);
  }

  const baselinePerEncounterGp = baselineEncounterValueGp(intendedLevel);
  const riskMultiplier = QUEST_RISK_MULTIPLIER[risk];
  const totalGp = Math.round(baselinePerEncounterGp * encounters * riskMultiplier);
  const patronFeeGp = Math.min(totalGp, roundToFive(totalGp * patronShare));

  return {
    intendedLevel,
    encounters,
    risk,
    baselinePerEncounterGp,
    riskMultiplier,
    totalGp,
    patronFeeGp,
    recoverableValueGp: totalGp - patronFeeGp,
  };
}
