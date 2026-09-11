import {
  type CampaignActPlan,
  type SitePlan,
} from "../../../shared/path-contracts.js";
import type { ZoneCandidate } from "../zone-plan.js";
import type { CampaignPlan } from "./mind-below-adapter.js";

export const VANISHING_MIDDLE_CANDIDATE_ZONES: Record<1 | 2 | 3, ZoneCandidate[]> = {
  1: [
    { zoneId: "verdant_borderland", name: "The Border Pastures", levelRange: [1, 3], description: "Lands contested by rival mortal clans where ancient oaths were first spoken." },
    { zoneId: "river_crossings", name: "The Seven Crossings", levelRange: [1, 3], description: "Toll bridges and fishing settlements caught between warring feudal houses." },
    { zoneId: "grey_marches", name: "The Grey Boundary Marches", levelRange: [1, 3], description: "A scarred buffer zone where ancient boundary stones are secretly moved." },
  ],
  2: [
    { zoneId: "oath_plateau", name: "The High Oath-Plateau", levelRange: [4, 7], description: "Windswept monolith rings where immortal witnesses judge mortal treaties." },
    { zoneId: "ashen_basin", name: "The Ashen Basin of Balances", levelRange: [4, 7], description: "A dry salt basin containing the physical scales of reciprocal justice." },
    { zoneId: "iron_spires_hollow", name: "The Iron Spire Hollows", levelRange: [4, 7], description: "Subterranean iron galleries where binding pacts are inscribed in stone." },
  ],
  3: [
    { zoneId: "court_of_the_weighing", name: "The Hall of the Grand Weighing", levelRange: [8, 10], description: "The transcendent amphitheater where cosmic scales balance mortal history." },
    { zoneId: "apex_of_the_cycle", name: "The Pinnacle of Cycles", levelRange: [8, 10], description: "The convergence of centuries where the fate of the middle realm is judged." },
    { zoneId: "vault_of_the_reciprocity", name: "The Sanctuary of Restitution", levelRange: [8, 10], description: "The final chamber where debts are paid or history is extinguished." },
  ],
};

export function buildVanishingMiddleSites(zonePlan: CampaignActPlan): SitePlan[] {
  const [act1Zone, act2Zone, act3Zone] = zonePlan.acts;
  return [
    // Act I
    {
      id: "site_cycle_act1_dispute",
      act: 1,
      zoneId: act1Zone.zoneId,
      role: "discovery",
      name: "The Contested Meadow Boundary",
      purpose: "Resolve mortal quarrels without breaking ancestral covenants.",
      siteFamily: "overland",
      objective: {
        deedId: "preserve_mortal_oath",
        title: "Preserve the Mortal Oath",
        description: "Mediate the feud between the clan elders and uncover the forged deed.",
        approaches: ["negotiation", "investigation"],
        storyXp: 1,
      },
      clues: ["The cosmic balance tilts whenever an oath sworn in blood is dishonored."],
      monsterGroupsCount: 2,
      hasAuthoredCache: true,
      cacheQuality: "normal",
    },
    // Act II
    {
      id: "site_cycle_act2_anchors",
      act: 2,
      zoneId: act2Zone.zoneId,
      role: "preparation",
      name: "The Monolith of Reciprocity",
      purpose: "Secure spiritual anchors and third-party witness testimony.",
      siteFamily: "ruin",
      objective: {
        deedId: "secure_spiritual_anchors",
        title: "Attune the Balance Anchors",
        description: "Cleanse the stone pillars of blood corruption and invoke the impartial arbiters.",
        approaches: ["ritual", "puzzle", "combat"],
        storyXp: 1,
      },
      clues: ["Three anchors are needed to stabilize the scales during the Weighing."],
      monsterGroupsCount: 3,
      hasAuthoredCache: true,
      cacheQuality: "fabulous",
    },
    // Act III
    {
      id: "site_cycle_act3_weighing",
      act: 3,
      zoneId: act3Zone.zoneId,
      role: "finale",
      name: "The Great Weighing Amphitheater",
      purpose: "Defend preparations and resolve the Weighing of the Ages.",
      siteFamily: "dungeon",
      objective: {
        deedId: "resolve_the_weighing",
        title: "Resolve the Weighing",
        description: "Present the accumulated evidence, defeat the agent of chaos, and balance the scales.",
        approaches: ["combat", "presentation_of_deeds", "cosmic_arbitration"],
        storyXp: 1,
      },
      clues: ["The cycle is preserved, and the mortal world endures for another age."],
      monsterGroupsCount: 4,
      hasAuthoredCache: true,
      cacheQuality: "legendary",
      bossHoard: {
        quality: "legendary",
        xpValue: 10,
        coins: { gp: 500, sp: 50, cp: 0 },
        items: ["scales_of_the_immortal_arbiter", "mantle_of_restored_oaths"],
      },
    },
  ];
}

export function createVanishingMiddlePlan(zonePlan: CampaignActPlan, seed: string = "cycle_default"): CampaignPlan {
  const sites = buildVanishingMiddleSites(zonePlan);
  return {
    pathId: "vanishing_middle",
    name: "The Vanishing Middle",
    seed,
    acts: zonePlan,
    sites,
    budgetSummary: {
      totalSites: sites.length,
      storyXpAvailable: sites.length + 9,
      expectedTreasureXp: 416,
      targetFinaleEntryLevel: 9,
      targetCompletionLevel: 10,
    },
  };
}
