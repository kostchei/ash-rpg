import {
  type ActZoneAssignment,
  type CampaignActPlan,
  CampaignActPlanSchema,
} from "../../shared/path-contracts.js";
import { type RandomSource, systemRandom } from "../rules.js";
import { createRandomSource } from "../generators/prng.js";
import {
  MIND_BELOW_STARTING_ZONES,
  MIND_BELOW_CAVE_ZONES,
  MIND_BELOW_END_ZONES,
  type MindBelowStartingZoneId,
  type MindBelowCaveZoneId,
  type MindBelowEndZoneId,
} from "../generators/mind-below.js";

export interface ZonePlanOptions {
  explicitZones?: [string?, string?, string?];
  mode?: "explicit" | "random" | "mixed";
  seed?: string;
  preferredStartZoneId?: string;
}

export interface ZoneCandidate {
  zoneId: string;
  name: string;
  levelRange: [number, number];
  description: string;
}

/**
 * Default candidate pools by act for the canonical Mind Below path
 */
export const MIND_BELOW_CANDIDATE_ZONES: Record<1 | 2 | 3, ZoneCandidate[]> = {
  1: Object.values(MIND_BELOW_STARTING_ZONES).map((z) => ({
    zoneId: z.id,
    name: z.name,
    levelRange: [z.levelRange[0], z.levelRange[1]],
    description: z.description,
  })),
  2: Object.values(MIND_BELOW_CAVE_ZONES).map((z) => ({
    zoneId: z.id,
    name: z.name,
    levelRange: [z.levelRange[0], z.levelRange[1]],
    description: z.description,
  })),
  3: Object.values(MIND_BELOW_END_ZONES).map((z) => ({
    zoneId: z.id,
    name: z.name,
    levelRange: [z.levelRange[0], z.levelRange[1]],
    description: z.description,
  })),
};

/**
 * Assigns three persistent zones for Acts 1, 2, and 3.
 * Invariant: act1.zoneId, act2.zoneId, and act3.zoneId are pairwise distinct.
 * A new name for the same zone does not qualify.
 */
export function assignActZones(
  pathId: string = "the_mind_below",
  options: ZonePlanOptions = {},
  candidatePoolsByAct: Record<1 | 2 | 3, ZoneCandidate[]> = MIND_BELOW_CANDIDATE_ZONES,
  rng?: RandomSource,
): CampaignActPlan {
  const seed = options.seed ?? `path_zones_${pathId}_${Date.now()}`;
  const effectiveRng = rng ?? createRandomSource(seed);
  const explicit = options.explicitZones ?? [];
  const chosenZoneIds = new Set<string>();

  const acts: [ActZoneAssignment, ActZoneAssignment, ActZoneAssignment] = [] as any;

  for (let actNum = 1; actNum <= 3; actNum++) {
    const act = actNum as 1 | 2 | 3;
    const explicitZoneId = explicit[actNum - 1];
    const pool = candidatePoolsByAct[act] ?? [];

    let chosenCandidate: ZoneCandidate | undefined;

    if (explicitZoneId) {
      if (chosenZoneIds.has(explicitZoneId)) {
        throw new Error(
          `Cannot assign zone "${explicitZoneId}" to Act ${actNum}: each act must occupy a pairwise distinct persistent zone`,
        );
      }
      chosenCandidate = pool.find((c) => c.zoneId === explicitZoneId) ?? {
        zoneId: explicitZoneId,
        name: explicitZoneId.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
        levelRange: actNum === 1 ? [1, 3] : actNum === 2 ? [4, 7] : [8, 10],
        description: `Persistent distinct territory for Act ${actNum}`,
      };
    } else {
      // Filter out zones already chosen by earlier acts to maintain pairwise distinct invariant
      const available = pool.filter((c) => !chosenZoneIds.has(c.zoneId));
      if (available.length === 0) {
        throw new Error(
          `Insufficient unused candidate zones for Act ${actNum}. All 3 acts must occupy pairwise distinct zones.`,
        );
      }

      // If act 1 has a preferred starting zone that's available, use it
      if (actNum === 1 && options.preferredStartZoneId) {
        const preferred = available.find((c) => c.zoneId === options.preferredStartZoneId);
        if (preferred) {
          chosenCandidate = preferred;
        }
      }

      if (!chosenCandidate) {
        const idx = effectiveRng(available.length);
        chosenCandidate = available[idx];
      }
    }

    chosenZoneIds.add(chosenCandidate.zoneId);

    const transitionRoute =
      actNum > 1
        ? {
            sourceZoneId: acts[actNum - 2].zoneId,
            targetZoneId: chosenCandidate.zoneId,
            mechanism:
              actNum === 2
                ? "Subterranean Karst conduits and ancient pumping aqueducts"
                : "Deep abyss trench descent and pressure diving vessels",
            fictionalReason:
              actNum === 2
                ? "Following kidnapped captives into the living sandstone caverns"
                : "Entering the sunken seat of the Aboleth Savant in the dark trench",
            requiredPreparation: actNum === 3 ? "water_breathing_and_pressure" : undefined,
          }
        : undefined;

    acts.push({
      act,
      zoneId: chosenCandidate.zoneId,
      name: chosenCandidate.name,
      levelRange: chosenCandidate.levelRange,
      description: chosenCandidate.description,
      transitionRoute,
    });
  }

  // Validate via Zod refine to guarantee pairwise distinctness
  return CampaignActPlanSchema.parse({ acts });
}

/**
 * Public projection of the act plan.
 * Conceals Act 2 and Act 3 identities when secret or unrevealed.
 */
export function projectPublicActPlan(
  plan: CampaignActPlan,
  currentAct: number = 1,
  isSecret: boolean = false,
): {
  currentAct: number;
  activeZoneName: string;
  acts: Array<{
    act: 1 | 2 | 3;
    name: string;
    levelRange: [number, number];
    revealed: boolean;
    description: string;
  }>;
} {
  const activeActObj = plan.acts[currentAct - 1] ?? plan.acts[0];
  return {
    currentAct,
    activeZoneName: activeActObj.name,
    acts: plan.acts.map((a) => {
      const isRevealed = !isSecret && a.act <= currentAct;
      return {
        act: a.act,
        name: isRevealed ? a.name : `Uncharted Territory (Act ${a.act})`,
        levelRange: a.levelRange,
        revealed: isRevealed,
        description: isRevealed
          ? a.description
          : "Details veiled until current act objectives and transit routes are discovered.",
      };
    }),
  };
}
