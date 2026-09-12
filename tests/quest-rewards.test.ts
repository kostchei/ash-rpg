import { describe, expect, it } from "vitest";
import {
  QUEST_RISK_MULTIPLIER,
  baselineEncounterValueGp,
  questRewardBudget,
} from "../src/shared/quest-rewards.js";
import { dangerLevelForThreatTier, threatTierForDangerLevel } from "../src/shared/danger.js";
import { coreTreasureTableForLevel, rollCoreTreasure, treasureQualityForValue } from "../src/server/rewards/core-treasure.js";

describe("quest reward budgets", () => {
  it("uses the published per-encounter shorthand for each level band", () => {
    expect(baselineEncounterValueGp(0)).toBe(20);
    expect(baselineEncounterValueGp(3)).toBe(20);
    expect(baselineEncounterValueGp(4)).toBe(50);
    expect(baselineEncounterValueGp(6)).toBe(50);
    expect(baselineEncounterValueGp(7)).toBe(80);
    expect(baselineEncounterValueGp(9)).toBe(80);
    expect(baselineEncounterValueGp(10)).toBe(100);
    expect(baselineEncounterValueGp(14)).toBe(140);
  });

  it("scales a two-encounter job by the Unsafe/Risky/Deadly multiplier", () => {
    expect(QUEST_RISK_MULTIPLIER).toEqual({ unsafe: 1, risky: 1.5, deadly: 2 });
    const totals = (["unsafe", "risky", "deadly"] as const).map(
      (risk) => questRewardBudget({ intendedLevel: 1, encounters: 2, risk }).totalGp,
    );
    expect(totals).toEqual([40, 60, 80]);
    expect((["unsafe", "risky", "deadly"] as const).map(
      (risk) => questRewardBudget({ intendedLevel: 5, encounters: 2, risk }).totalGp,
    )).toEqual([100, 150, 200]);
    expect((["unsafe", "risky", "deadly"] as const).map(
      (risk) => questRewardBudget({ intendedLevel: 10, encounters: 2, risk }).totalGp,
    )).toEqual([200, 300, 400]);
  });

  it("splits the budget between the patron's fee and recoverable valuables", () => {
    const rescue = questRewardBudget({ intendedLevel: 1, encounters: 2, risk: "risky" });
    expect(rescue.patronFeeGp).toBe(40);
    expect(rescue.recoverableValueGp).toBe(20);
    expect(rescue.patronFeeGp + rescue.recoverableValueGp).toBe(rescue.totalGp);

    const unpaid = questRewardBudget({ intendedLevel: 1, encounters: 2, risk: "risky", patronShare: 0 });
    expect(unpaid.patronFeeGp).toBe(0);
    expect(unpaid.recoverableValueGp).toBe(60);
  });

  it("rejects nonsense inputs instead of quietly substituting a default", () => {
    expect(() => questRewardBudget({ intendedLevel: 1, encounters: 0, risk: "risky" })).toThrow();
    expect(() => questRewardBudget({ intendedLevel: -1, encounters: 2, risk: "risky" })).toThrow();
    expect(() => questRewardBudget({ intendedLevel: 1, encounters: 2, risk: "safe" as never })).toThrow();
    expect(() => questRewardBudget({ intendedLevel: 1, encounters: 2, risk: "risky", patronShare: 2 })).toThrow();
  });
});

describe("danger vocabulary", () => {
  it("names every stored threat tier and round-trips", () => {
    expect([0, 1, 2, 3].map(dangerLevelForThreatTier)).toEqual(["safe", "unsafe", "risky", "deadly"]);
    expect(threatTierForDangerLevel("deadly")).toBe(3);
    expect(() => dangerLevelForThreatTier(4)).toThrow();
  });
});

describe("core treasure tables", () => {
  it("routes each level to the printed table and no longer collapses everything above level 6", () => {
    expect([0, 3].map((l) => coreTreasureTableForLevel(l).band)).toEqual(["0-3", "0-3"]);
    expect([4, 6].map((l) => coreTreasureTableForLevel(l).band)).toEqual(["4-6", "4-6"]);
    expect([7, 9].map((l) => coreTreasureTableForLevel(l).band)).toEqual(["7-9", "7-9"]);
    expect([10, 15].map((l) => coreTreasureTableForLevel(l).band)).toEqual(["10+", "10+"]);
    expect(() => coreTreasureTableForLevel(-1)).toThrow();
  });

  it("carries all four d100 tables intact", () => {
    for (const table of [0, 4, 7, 10].map(coreTreasureTableForLevel)) {
      expect(table.entries).toHaveLength(50);
      const covered = table.entries.reduce((sum, e) => sum + (e.max - e.min + 1), 0);
      expect(covered).toBe(100);
      expect(table.entries.every((e) => e.description.length > 0 && e.valueGp > 0)).toBe(true);
    }
  });

  it("grades a find against the expected value of one find at that level", () => {
    // Level 0-3 expects 20 gp per find: junk is Poor, the capstone magic weapon Legendary.
    expect(treasureQualityForValue(1, 20)).toBe("poor");
    expect(treasureQualityForValue(20, 20)).toBe("normal");
    expect(treasureQualityForValue(60, 20)).toBe("fabulous");
    expect(treasureQualityForValue(200, 20)).toBe("legendary");
    // The Staff of Ord (1,200 gp) is Legendary on the 10+ table, as the book's example says.
    expect(treasureQualityForValue(1200, 120)).toBe("legendary");
    expect(() => treasureQualityForValue(10, 0)).toThrow();
  });

  it("never draws a Poor row when a minimum quality is demanded", () => {
    for (const level of [1, 5, 8, 12]) {
      for (let seed = 0; seed < 40; seed++) {
        const find = rollCoreTreasure(level, () => seed / 40, "normal");
        expect(find.quality).not.toBe("poor");
        expect(find.xpValue).toBeGreaterThanOrEqual(1);
        // A find is either loose coin or an object, never an invented mixture of both.
        expect(find.items.length > 0 || find.coins.gp + find.coins.sp + find.coins.cp > 0).toBe(true);
      }
    }
  });
});
