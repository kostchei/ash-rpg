import { describe, expect, it } from "vitest";
import {
  applyXpEvent,
  calculateAdvancementRequirement,
  calculateLifetimeXpForLevel,
  calculateSplitCurrency,
} from "../src/server/rewards/progression.js";
import { RewardService } from "../src/server/rewards/service.js";
import { AshDatabase } from "../src/server/database.js";
import type { Character } from "../src/shared/types.js";

describe("XP Progression, Reset Losses & Reward Service", () => {
  const makeChar = (level = 1, xp = 0): Character => ({
    id: 101,
    name: "Theron",
    ancestry: "Human",
    className: "Fighter",
    level,
    hp: 10,
    maxHp: 10,
    ac: 14,
    gold: 50,
    gearSlots: 10,
    abilities: { str: 14, dex: 10, con: 12, int: 10, wis: 10, cha: 10 },
    anchors: { homeland: "North", landmark: "Tower", nemesis: "Rival" },
    xp,
  });

  it("calculates exact advancement requirements: level L requires L * 10 XP", () => {
    expect(calculateAdvancementRequirement(1)).toBe(10);
    expect(calculateAdvancementRequirement(2)).toBe(20);
    expect(calculateAdvancementRequirement(3)).toBe(30);
    expect(calculateAdvancementRequirement(9)).toBe(90);
    expect(calculateLifetimeXpForLevel(10)).toBe(450); // 5 * 10 * 9 = 450
  });

  it("resets XP to zero on level up and accurately records reset loss", () => {
    // Level 1 character with 9 XP
    const char = makeChar(1, 9);

    // Award +3 XP (Total 12 XP. Required for Level 2 is 10 XP. Excess is 2 XP.)
    const result1 = applyXpEvent(char, 3);
    expect(result1.gainedLevels).toBe(1);
    expect(result1.character.level).toBe(2);
    expect(result1.character.xp).toBe(0); // Strict reset to zero!
    expect(result1.resetLoss).toBe(2);    // 2 XP lost to threshold reset

    // Subsequent +1 XP source leaves Level 2 character with 1 XP
    const result2 = applyXpEvent(result1.character, 1);
    expect(result2.gainedLevels).toBe(0);
    expect(result2.character.level).toBe(2);
    expect(result2.character.xp).toBe(1);
    expect(result2.resetLoss).toBe(0);
  });

  it("enforces level 10 ceiling under standard campaign profile", () => {
    const char = makeChar(9, 85);

    // +20 XP pushes over the 90 XP threshold to Level 10
    const res1 = applyXpEvent(char, 20);
    expect(res1.character.level).toBe(10);
    expect(res1.character.xp).toBe(0);

    // Any further XP awards at Level 10 do not advance to Level 11
    const res2 = applyXpEvent(res1.character, 50);
    expect(res2.character.level).toBe(10);
    expect(res2.gainedLevels).toBe(0);
  });

  it("awards full XP value to every active participant (not divided by party size)", () => {
    const db = new AshDatabase(":memory:");
    const service = new RewardService(db);
    const campaign = db.createCampaign("Party Campaign", "The Gloaming", "1234");

    const c1 = db.addCharacter(campaign.campaignId, null, makeChar(1, 0));
    const c2 = db.addCharacter(campaign.campaignId, null, { ...makeChar(1, 0), id: 102, name: "Vesper" });

    // Create a 3 XP reward source (Fabulous find)
    db.saveRewardSource({
      id: "src_fabulous_find",
      campaignId: campaign.campaignId,
      sourceType: "authored_cache",
      sourceId: "src_fabulous_find",
      quality: "fabulous",
      xpValue: 3,
      coins: { cp: 0, sp: 0, gp: 50 },
      items: [],
      status: "unclaimed",
      accessState: "accessible",
      createdAt: new Date().toISOString(),
    });

    const secureRes = service.secureRewardSource(campaign.campaignId, "src_fabulous_find");
    expect(secureRes.secured).toBe(true);

    const state = db.getState(campaign.campaignId, "host", null, "");
    const char1 = state.characters.find((c) => c.id === c1)!;
    const char2 = state.characters.find((c) => c.id === c2)!;

    // Both characters get the full 3 XP! Not 1.5 XP.
    expect(char1.xp).toBe(3);
    expect(char2.xp).toBe(3);

    // Securing the same source again does not re-award XP
    const repeatSecure = service.secureRewardSource(campaign.campaignId, "src_fabulous_find");
    expect(repeatSecure.secured).toBe(false);
    expect(repeatSecure.progressionResults.length).toBe(0);

    db.close();
  });

  it("splits currency with exact integer copper accounting and preserves remainder", () => {
    // 5 gp, 3 sp, 7 cp = 500 + 30 + 7 = 537 copper
    // Split among 4 characters: 537 / 4 = 134 copper each (1 gp, 3 sp, 4 cp), remainder = 1 copper
    const currency = { gp: 5, sp: 3, cp: 7 };
    const split = calculateSplitCurrency(currency, 4);

    expect(split.copperPerChar).toBe(134);
    expect(split.remainderCopper).toBe(1);

    expect(split.perCharacter).toEqual({ gp: 1, sp: 3, cp: 4 });
    expect(split.remainder).toEqual({ gp: 0, sp: 0, cp: 1 });
  });

  it("awards story XP atomically and deduplicates repeat resolution attempts", () => {
    const db = new AshDatabase(":memory:");
    const service = new RewardService(db);
    const campaign = db.createCampaign("Story Campaign", "The Gloaming", "1234");
    const charId = db.addCharacter(campaign.campaignId, null, makeChar(1, 0));

    // First resolution awards +1 story XP
    const res1 = service.resolveStoryAward(campaign.campaignId, "deed_rescue_surveyor", "site_objective");
    expect(res1.alreadyResolved).toBe(false);
    expect(res1.storyXpAwarded).toBe(1);

    const charAfterFirst = db.getState(campaign.campaignId, "host", null, "").characters.find((c) => c.id === charId)!;
    expect(charAfterFirst.xp).toBe(1);

    // Duplicate resolution for the same deed is blocked
    const res2 = service.resolveStoryAward(campaign.campaignId, "deed_rescue_surveyor", "site_objective");
    expect(res2.alreadyResolved).toBe(true);
    expect(res2.storyXpAwarded).toBe(0);

    const charAfterSecond = db.getState(campaign.campaignId, "host", null, "").characters.find((c) => c.id === charId)!;
    expect(charAfterSecond.xp).toBe(1); // Unchanged

    db.close();
  });
});
