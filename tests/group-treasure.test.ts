import { describe, expect, it } from "vitest";
import {
  rollGroupPresence,
  resolveGroupTreasure,
  selectRealTreasurePackage,
  createAuthoredHoard,
} from "../src/server/rewards/treasure.js";
import { RewardService } from "../src/server/rewards/service.js";
import { AshDatabase } from "../src/server/database.js";
import type { RandomSource } from "../src/server/rules.js";

describe("50% Real-Treasure Roll per Encounter Group & Negative Roll Persistence", () => {
  it("injects each die face into the d6 presence policy: exactly 1-3 succeed and 4-6 fail", () => {
    const results: Record<number, boolean> = {};
    for (let face = 1; face <= 6; face++) {
      const mockRng: RandomSource = () => face - 1; // rollDie returns roll = (face-1)+1 = face
      const { roll, present } = rollGroupPresence(mockRng);
      expect(roll).toBe(face);
      results[face] = present;
    }

    expect(results[1]).toBe(true);
    expect(results[2]).toBe(true);
    expect(results[3]).toBe(true);
    expect(results[4]).toBe(false);
    expect(results[5]).toBe(false);
    expect(results[6]).toBe(false);

    const successCount = Object.values(results).filter(Boolean).length;
    expect(successCount).toBe(3); // exactly 50%
  });

  it("never yields a Poor find (0 XP) on a successful real-treasure presence roll", () => {
    // Test across tiers 1, 2, and 3
    for (const level of [1, 5, 9]) {
      for (let roll = 1; roll <= 100; roll += 5) {
        const mockRng: RandomSource = () => (roll - 1);
        const pkg = selectRealTreasurePackage(level, mockRng);
        expect(["normal", "fabulous", "legendary"]).toContain(pkg.quality);
        expect(pkg.xpValue).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it("makes exactly one roll per group regardless of member count (1, 4, or 12 members)", () => {
    const db = new AshDatabase(":memory:");
    const service = new RewardService(db);
    const campaign = db.createCampaign("Test Campaign", "The Gloaming", "1234");

    // Group with 1 member
    const solo = service.registerEncounterGroup(campaign.campaignId, {
      id: "group_solo",
      name: "Lone Sentry",
      members: [{ key: "goblin", name: "Goblin Sentry", count: 1 }],
    }, "fixed_seed_success");

    // Group with 4 members
    const patrol = service.registerEncounterGroup(campaign.campaignId, {
      id: "group_patrol",
      name: "Goblin Patrol",
      members: [{ key: "goblin", name: "Goblin", count: 4 }],
    }, "fixed_seed_success");

    // Group with 12 members
    const horde = service.registerEncounterGroup(campaign.campaignId, {
      id: "group_horde",
      name: "Goblin Warband",
      members: [{ key: "goblin", name: "Goblin", count: 12 }],
    }, "fixed_seed_success");

    // Each group has exactly one roll recorded in database
    const rollSolo = db.getTreasureRoll(campaign.campaignId, "group_solo");
    const rollPatrol = db.getTreasureRoll(campaign.campaignId, "group_patrol");
    const rollHorde = db.getTreasureRoll(campaign.campaignId, "group_horde");

    expect(rollSolo).toBeDefined();
    expect(rollPatrol).toBeDefined();
    expect(rollHorde).toBeDefined();

    // The roll is identical given the same seed regardless of whether 1, 4, or 12 creatures were present
    expect(rollSolo?.present).toBe(rollPatrol?.present);
    expect(rollSolo?.present).toBe(rollHorde?.present);

    db.close();
  });

  it("persists negative results as durable facts; repeat calls or revisits never reroll", () => {
    const db = new AshDatabase(":memory:");
    const service = new RewardService(db);
    const campaign = db.createCampaign("Test Campaign", "The Gloaming", "1234");

    // Force a negative roll (face 5)
    const fixedNegativeRng: RandomSource = () => 4; // face 5 -> present: false
    const initial = service.registerEncounterGroup(campaign.campaignId, {
      id: "group_empty_dungeon",
      name: "Empty Room Lurkers",
      members: [{ key: "skeleton", name: "Skeleton", count: 3 }],
    }, "negative_seed");

    const rollBefore = db.getTreasureRoll(campaign.campaignId, "group_empty_dungeon");
    expect(rollBefore?.present).toBe(false);
    expect(rollBefore?.sourceId).toBeNull();
    expect(rollBefore?.quality).toBe("poor");

    // Re-registering or revisiting the group returns the exact same negative roll, never rerolling
    const revisit = service.registerEncounterGroup(campaign.campaignId, {
      id: "group_empty_dungeon",
      name: "Empty Room Lurkers",
      members: [{ key: "skeleton", name: "Skeleton", count: 3 }],
    }, "different_seed_that_would_succeed");

    expect(revisit.present).toBe(false);
    expect(revisit.sourceId).toBeNull();

    const rollAfter = db.getTreasureRoll(campaign.campaignId, "group_empty_dungeon");
    expect(rollAfter?.present).toBe(false);
    expect(rollAfter?.roll).toBe(rollBefore?.roll);

    db.close();
  });

  it("separates authored boss hoards and caches from carried-treasure 50% rolls", () => {
    const db = new AshDatabase(":memory:");
    const service = new RewardService(db);
    const campaign = db.createCampaign("Test Campaign", "The Gloaming", "1234");

    // Boss hoard with explicit policy
    const boss = service.registerEncounterGroup(campaign.campaignId, {
      id: "boss_dragon",
      name: "Cavern Dragon",
      members: [{ key: "dragon", name: "Dragon", count: 1, level: 8 }],
      policyType: "boss_hoard",
    });

    expect(boss.present).toBe(true);
    expect(boss.sourceId).toBeTruthy();

    const source = db.getRewardSource(campaign.campaignId, boss.sourceId!);
    expect(source).toBeDefined();
    expect(source?.xpValue).toBeGreaterThanOrEqual(3);

    db.close();
  });
});
