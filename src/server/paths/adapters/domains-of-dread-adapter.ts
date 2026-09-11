import {
  type CampaignActPlan,
  type SitePlan,
} from "../../../shared/path-contracts.js";
import type { ZoneCandidate } from "../zone-plan.js";
import type { CampaignPlan } from "./mind-below-adapter.js";

export const DOMAINS_OF_DREAD_CANDIDATE_ZONES: Record<1 | 2 | 3, ZoneCandidate[]> = {
  1: [
    { zoneId: "mist_shrouded_mists", name: "The Border Mists", levelRange: [1, 3], description: "Choking mists that turn travelers back upon their own footsteps." },
    { zoneId: "sorrow_village", name: "The Village of Barren Sorrow", levelRange: [1, 3], description: "A quiet hamlet where residents look upon outsiders with mournful pity." },
    { zoneId: "gallows_crossroads", name: "The Gallows Crossroads", levelRange: [1, 3], description: "Windswept gibbets where hanged men speak when the moon wanes." },
  ],
  2: [
    { zoneId: "bloodstone_crags", name: "The Bloodstone Crags", levelRange: [4, 7], description: "Jagged needle-peaks where gargoyles guard forgotten bargains." },
    { zoneId: "drowned_abbey", name: "The Drowned Abbey of Saint Markovia", levelRange: [4, 7], description: "A ruined priory submerged beneath a weeping black tarn." },
    { zoneId: "crimson_vineyard", name: "The Crimson Wine-Hills", levelRange: [4, 7], description: "Thorny terraces nourished by dark secret libations." },
  ],
  3: [
    { zoneId: "castle_shadow_keep", name: "Castle of the Darklord", levelRange: [8, 10], description: "The towering gothic citadel from which the domain lord reigns supreme." },
    { zoneId: "crypt_of_the_ancient", name: "The Primeval Crypt", levelRange: [8, 10], description: "The catacombs where the binding domain oath was originally sealed." },
    { zoneId: "amber_sanctum", name: "The Amber Vault of Vestiges", levelRange: [8, 10], description: "Monolithic blocks imprisoning ancient entities of terrible power." },
  ],
};

export function buildDomainsOfDreadSites(zonePlan: CampaignActPlan): SitePlan[] {
  const [act1Zone, act2Zone, act3Zone] = zonePlan.acts;
  return [
    // Act I
    {
      id: "site_dread_act1_crossroads",
      act: 1,
      zoneId: act1Zone.zoneId,
      role: "discovery",
      name: "The Weeping Crossway",
      purpose: "Test domain laws and decipher boundary warnings.",
      siteFamily: "overland",
      objective: {
        deedId: "test_domain_laws",
        title: "Decipher the Domain Laws",
        description: "Examine the boundary stones and record the unbreakable rules of this prison realm.",
        approaches: ["lore", "investigation"],
        storyXp: 1,
      },
      clues: ["The mists do not let the guilty or the pure-hearted depart freely."],
      monsterGroupsCount: 2,
      hasAuthoredCache: true,
      cacheQuality: "normal",
    },
    {
      id: "site_dread_act1_manor",
      act: 1,
      zoneId: act1Zone.zoneId,
      role: "lead",
      name: "Haunted Burgomaster's Manor",
      purpose: "Recover sworn testimony of the Darklord's mortal sin.",
      siteFamily: "ruin",
      objective: {
        deedId: "recover_burgomaster_testimony",
        title: "Secure the Burgomaster's Journal",
        description: "Survive the siege of wolves and ghosts to retrieve the sealed journal.",
        approaches: ["combat", "stealth", "diplomacy"],
        storyXp: 1,
      },
      clues: ["The Darklord cannot be permanently slain while his heart's true vessel remains intact."],
      monsterGroupsCount: 3,
      hasAuthoredCache: true,
      cacheQuality: "fabulous",
    },
    // Act II
    {
      id: "site_dread_act2_relic_vault",
      act: 2,
      zoneId: act2Zone.zoneId,
      role: "preparation",
      name: "The Relic Vault of Markovia",
      purpose: "Obtain killing-condition components (the Sunlit Thyrsus).",
      siteFamily: "tomb",
      objective: {
        deedId: "obtain_killing_component",
        title: "Recover the Sunlit Relic",
        description: "Descend into the submerged catacombs to claim the relic that pierces shadow.",
        approaches: ["puzzle", "combat", "ritual"],
        storyXp: 1,
      },
      clues: ["The Darklord's physical form is vulnerable only when bathed in true sunlight."],
      monsterGroupsCount: 3,
      hasAuthoredCache: true,
      cacheQuality: "fabulous",
    },
    // Act III
    {
      id: "site_dread_act3_citadel",
      act: 3,
      zoneId: act3Zone.zoneId,
      role: "finale",
      name: "The Spire of Castle Dread",
      purpose: "Confront the Darklord under the required astrological circumstance or break the domain boundary.",
      siteFamily: "dungeon",
      objective: {
        deedId: "confront_darklord",
        title: "Confront the Darklord",
        description: "Strike down the tyrant or fulfill the ancient pact to shatter the mist border forever.",
        approaches: ["combat", "ritual_restitution", "severing_the_pact"],
        storyXp: 1,
      },
      clues: ["With the Darklord's defeat, the mists part and the captive souls awaken."],
      monsterGroupsCount: 4,
      hasAuthoredCache: true,
      cacheQuality: "legendary",
      bossHoard: {
        quality: "legendary",
        xpValue: 10,
        coins: { gp: 450, sp: 80, cp: 0 },
        items: ["crown_of_sorrows", "blade_of_dawnbringing"],
      },
    },
  ];
}

export function createDomainsOfDreadPlan(zonePlan: CampaignActPlan, seed: string = "dread_default"): CampaignPlan {
  const sites = buildDomainsOfDreadSites(zonePlan);
  return {
    pathId: "domains_of_dread",
    name: "Domains of Dread",
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
