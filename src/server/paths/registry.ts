import type { CampaignActPlan } from "../../shared/path-contracts.js";
import type { ZoneCandidate } from "./zone-plan.js";
import {
  type CampaignPlan,
  createMindBelowCampaignPlan,
} from "./adapters/mind-below-adapter.js";
import {
  DOMAINS_OF_DREAD_CANDIDATE_ZONES,
  createDomainsOfDreadPlan,
} from "./adapters/domains-of-dread-adapter.js";
import {
  VANISHING_MIDDLE_CANDIDATE_ZONES,
  createVanishingMiddlePlan,
} from "./adapters/vanishing-middle-adapter.js";
import { MIND_BELOW_CANDIDATE_ZONES } from "./zone-plan.js";

export interface PathAdapterDefinition {
  pathId: string;
  name: string;
  description: string;
  candidateZones: Record<1 | 2 | 3, ZoneCandidate[]>;
  createPlan: (zonePlan: CampaignActPlan, seed?: string) => CampaignPlan;
}

const ADAPTER_REGISTRY: Map<string, PathAdapterDefinition> = new Map();

ADAPTER_REGISTRY.set("the_mind_below", {
  pathId: "the_mind_below",
  name: "The Night Below",
  description:
    "An Aboleth Savant extends psychic tendrils from subterranean depths, seizing surface minds and preparing an abyssal awakening.",
  candidateZones: MIND_BELOW_CANDIDATE_ZONES,
  createPlan: createMindBelowCampaignPlan,
});

ADAPTER_REGISTRY.set("domains_of_dread", {
  pathId: "domains_of_dread",
  name: "Domains of Dread",
  description:
    "A captive domain surrounded by deadly boundary mists where characters must test domain laws, discover the killing condition, and confront the Darklord.",
  candidateZones: DOMAINS_OF_DREAD_CANDIDATE_ZONES,
  createPlan: createDomainsOfDreadPlan,
});

ADAPTER_REGISTRY.set("vanishing_middle", {
  pathId: "vanishing_middle",
  name: "The Eternal Cycle",
  description:
    "Cosmic balances tilt as ancient oaths are broken; characters must mediate mortal disputes, attune balance anchors, and resolve the Grand Weighing.",
  candidateZones: VANISHING_MIDDLE_CANDIDATE_ZONES,
  createPlan: createVanishingMiddlePlan,
});

export function getPathAdapter(pathId: string): PathAdapterDefinition {
  const adapter = ADAPTER_REGISTRY.get(pathId);
  if (!adapter) {
    // Default fallback to the canonical Night Below adapter
    return ADAPTER_REGISTRY.get("the_mind_below")!;
  }
  return adapter;
}

export function listPathAdapters(): PathAdapterDefinition[] {
  return Array.from(ADAPTER_REGISTRY.values());
}
