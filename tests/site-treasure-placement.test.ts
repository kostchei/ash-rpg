import { describe, expect, it } from "vitest";
import { materializeSitePlan } from "../src/server/paths/site-plan.js";
import { generateSiteLayout, siteRoomCount } from "../src/server/generators/site-layout.js";
import { AshDatabase } from "../src/server/database.js";
import { SitePlanSchema } from "../src/shared/path-contracts.js";
import type { RandomSource } from "../src/server/rules.js";
import { coreTreasureTableForLevel } from "../src/server/rewards/core-treasure.js";

const plan = SitePlanSchema.parse({
  id: "site_test_vault",
  act: 1,
  zoneId: "the_gloaming",
  role: "lead",
  name: "Test Vault",
  purpose: "Exercise treasure placement.",
  siteFamily: "ruin",
  objective: {
    deedId: "test_deed",
    title: "Recover the ledger",
    description: "Find the ledger.",
    approaches: ["investigation"],
    storyXp: 1,
  },
  clues: ["A clue."],
  monsterGroupsCount: 2,
  authoredCaches: [
    { quality: "fabulous", name: "Smuggler's Strongbox" },
    { quality: "normal", name: "Toll Box" },
  ],
});

/** Forces every area to roll the same d10 face, so features are controllable. */
function fixedFeatureRng(face: number): RandomSource {
  return (sides: number) => (sides === 10 ? face - 1 : 0);
}

describe("site treasure placement", () => {
  it("places the adventure's own caches even when no area rolls a treasure feature", () => {
    const db = new AshDatabase(":memory:");
    const campaign = db.createCampaign("Placement", "The Gloaming", "1234");
    const graph = generateSiteLayout(campaign.campaignId, plan.id, plan.name, 6);

    // d10 face 1 is "empty": no treasure feature comes up anywhere in the site.
    const { rewardSources } = materializeSitePlan(campaign.campaignId, plan, graph, db, 1, fixedFeatureRng(1));

    const caches = rewardSources.filter((s) => s.sourceType === "authored_cache");
    expect(caches).toHaveLength(2);
    expect(caches.map((c) => c.quality).sort()).toEqual(["fabulous", "normal"]);
    expect(rewardSources.filter((s) => s.sourceType === "unguarded_treasure")).toHaveLength(0);
    db.close();
  });

  it("rolls an unguarded find in every treasure area, on top of the placed caches", () => {
    const db = new AshDatabase(":memory:");
    const campaign = db.createCampaign("Placement", "The Gloaming", "1234");
    const graph = generateSiteLayout(campaign.campaignId, plan.id, plan.name, 6);

    // d10 face 9 is "treasure": every area is an unguarded find.
    const { rewardSources } = materializeSitePlan(campaign.campaignId, plan, graph, db, 1, fixedFeatureRng(9));

    // Every area is a find except the two the adventure's caches reserved.
    const finds = rewardSources.filter((s) => s.sourceType === "unguarded_treasure");
    expect(finds).toHaveLength(siteRoomCount(6) - 2);
    expect(rewardSources.filter((s) => s.sourceType === "authored_cache")).toHaveLength(2);
    db.close();
  });

  it("uses the discovering character's level to pick the unguarded treasure table", () => {
    const db = new AshDatabase(":memory:");
    const campaign = db.createCampaign("Placement", "The Gloaming", "1234");

    const lowGraph = generateSiteLayout(campaign.campaignId, "site_low", "Low", 6);
    const low = materializeSitePlan(campaign.campaignId, { ...plan, id: "site_low" }, lowGraph, db, 1, fixedFeatureRng(9));
    const highGraph = generateSiteLayout(campaign.campaignId, "site_high", "High", 6);
    const high = materializeSitePlan(campaign.campaignId, { ...plan, id: "site_high" }, highGraph, db, 12, fixedFeatureRng(9));

    const findsOf = (sources: typeof low.rewardSources) =>
      sources.filter((s) => s.sourceType === "unguarded_treasure");

    const lowRows = new Set(coreTreasureTableForLevel(1).entries.map((e) => e.description));
    const highRows = new Set(coreTreasureTableForLevel(12).entries.map((e) => e.description));

    // Same forced roll, different table: each site's finds come from its own band.
    for (const find of findsOf(low.rewardSources)) {
      if (find.items.length > 0) expect(lowRows.has(find.items[0])).toBe(true);
    }
    for (const find of findsOf(high.rewardSources)) {
      if (find.items.length > 0) expect(highRows.has(find.items[0])).toBe(true);
    }
    const lowDescriptions = findsOf(low.rewardSources).flatMap((s) => s.items);
    const highDescriptions = findsOf(high.rewardSources).flatMap((s) => s.items);
    expect(lowDescriptions).not.toEqual(highDescriptions);
    db.close();
  });
});
