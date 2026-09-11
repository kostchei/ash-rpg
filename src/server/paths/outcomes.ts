import type { AshDatabase } from "../database.js";
import { RewardService } from "../rewards/service.js";
import type { ProgressionEventResult } from "../rewards/progression.js";

export function resolveOutcome(
  db: AshDatabase,
  campaignId: number,
  deedId: string,
  options: {
    outcomeType?: "site_objective" | "act_transition" | "campaign_ending";
    approach?: string;
    notes?: string;
    activeCharacterIds?: number[];
  } = {},
): {
  alreadyResolved: boolean;
  storyXpAwarded: number;
  progressionResults: ProgressionEventResult[];
} {
  const rewardService = new RewardService(db);
  const outcomeType = options.outcomeType ?? "site_objective";
  const approach = options.approach ?? "table_ruling";

  const result = rewardService.resolveStoryAward(
    campaignId,
    deedId,
    outcomeType,
    approach,
    options.notes,
    options.activeCharacterIds,
  );

  if (!result.alreadyResolved) {
    // Also resolve on AdventurePathRecord if present
    db.resolveAdventurePathDeed(
      campaignId,
      deedId,
      outcomeType === "act_transition" ? 2 : 1,
      options.notes,
    );

    // If act transition, advance act number in campaigns table
    if (outcomeType === "act_transition") {
      const camp = db.db.prepare("SELECT act FROM campaigns WHERE id = ?").get(campaignId) as
        | { act: number }
        | undefined;
      const currentAct = camp?.act ?? 1;
      const nextAct = Math.min(3, currentAct + 1);
      db.db.prepare("UPDATE campaigns SET act = ? WHERE id = ?").run(nextAct, campaignId);
    }
  }

  return result;
}
