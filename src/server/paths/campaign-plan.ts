import type { CampaignActPlan } from "../../shared/path-contracts.js";
import { assignActZones, type ZonePlanOptions } from "./zone-plan.js";
import { getPathAdapter } from "./registry.js";
import type { CampaignPlan } from "./adapters/mind-below-adapter.js";

export function buildCampaignPlan(
  pathId: string = "the_mind_below",
  options: ZonePlanOptions = {},
): CampaignPlan {
  const adapter = getPathAdapter(pathId);
  const zonePlan: CampaignActPlan = assignActZones(
    pathId,
    options,
    adapter.candidateZones,
  );

  return adapter.createPlan(zonePlan, options.seed);
}
