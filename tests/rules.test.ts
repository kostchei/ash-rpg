import { describe, expect, it } from "vitest";
import {
  abilityModifier,
  binaryOracle,
  generateDungeonRoom,
  loreTier,
  moraleRoll,
  reactionRoll,
  rollAbilities,
  rollDice,
  wildernessWatch,
  calculateTravelWatches,
  evaluateWatchFatigue,
} from "../src/server/rules.js";

function sequence(...values: number[]) {
  let index = 0;
  return (max: number) => values[index++] % max;
}

describe("ASH rules engine", () => {
  it("parses and resolves dice expressions", () => {
    expect(rollDice("2d6+3", sequence(1, 4))).toEqual({
      expression: "2d6+3",
      rolls: [2, 5],
      modifier: 3,
      total: 10,
    });
  });

  it("rejects unbounded dice input", () => {
    expect(() => rollDice("100d6")).toThrow(/Use dice/);
    expect(() => rollDice("1d1")).toThrow(/outside/);
  });

  it("uses the documented ability modifier bands", () => {
    expect([3, 4, 6, 9, 12, 14, 16, 18].map(abilityModifier)).toEqual([
      -4, -3, -2, 0, 1, 2, 3, 4,
    ]);
  });

  it("rolls six 3d6 abilities in order", () => {
    expect(rollAbilities(sequence(...Array(18).fill(2)))).toEqual([
      9, 9, 9, 9, 9, 9,
    ]);
  });

  it("honors exceptional and qualified oracle outcomes", () => {
    expect(binaryOracle("even", sequence(19)).answer).toBe("YES, AND…");
    expect(binaryOracle("even", sequence(0)).answer).toBe("NO, AND…");
    expect(binaryOracle("likely", sequence(8)).answer).toBe("YES, BUT…");
    expect(binaryOracle("likely", sequence(5)).answer).toBe("NO, BUT…");
  });

  it("maps reaction and morale from 2d6", () => {
    expect(reactionRoll(0, sequence(0, 0)).reaction).toBe(
      "Hostile / aggressive",
    );
    expect(reactionRoll(2, sequence(5, 5)).reaction).toBe("Allied / receptive");
    expect(moraleRoll(7, sequence(3, 4)).outcome).toMatch(/fails/);
  });

  it("generates room contents and trap without referee judgment", () => {
    const room = generateDungeonRoom(sequence(0, 2, 6));
    expect(room.geometry).toContain("guard post");
    expect(room.contents).toContain("trap");
    expect(room.trap?.name).toBe("Electrified rune floor");
  });

  it("resolves a complete wilderness watch", () => {
    const watch = wildernessWatch("forest", sequence(2, 3, 0, 6));
    expect(watch.weather).toBe("Overcast / mild breeze");
    expect(watch.encounter).toBe("Wandering owlbear");
  });

  it("maps Monsternomicon lore tiers to DCs", () => {
    expect([8, 9, 12, 15, 18].map(loreTier)).toEqual([0, 1, 2, 3, 4]);
  });

  it("calculates movement watch costs per 6-mile hex and terrain difficulties", () => {
    // Roads are 1 watch
    expect(calculateTravelWatches("Dense Swamps", true)).toBe(1);
    expect(calculateTravelWatches("Mountain Pass", true)).toBe(1);

    // Standard off-road is 2 watches
    expect(calculateTravelWatches("Rolling Grasslands", false)).toBe(2);
    expect(calculateTravelWatches("Open Woods", false)).toBe(2);

    // Difficult terrain is 3 watches
    expect(calculateTravelWatches("Peat Bogs", false)).toBe(3);
    expect(calculateTravelWatches("Granite Mountain Peaks", false)).toBe(3);
    expect(calculateTravelWatches("Deep Sand Dunes", false)).toBe(3);

    // Unbridged crossings add +1 watch
    expect(calculateTravelWatches("Rolling Grasslands", false, "ford")).toBe(3);
    expect(calculateTravelWatches("Rolling Grasslands", false, "stone_bridge")).toBe(2);
  });

  it("enforces forced march CON checks on Watch 4 and assigns fatigue on failure", () => {
    // Watches 1-3 do not trigger forced march
    expect(evaluateWatchFatigue(1).forcedMarch).toBe(false);
    expect(evaluateWatchFatigue(2).forcedMarch).toBe(false);
    expect(evaluateWatchFatigue(3).forcedMarch).toBe(false);

    // Watch 4 triggers forced march with DC 12
    const failRoll = (max: number) => 5; // roll 6 (fails DC 12)
    const failedCheck = evaluateWatchFatigue(4, 0, 0, failRoll);
    expect(failedCheck.forcedMarch).toBe(true);
    expect(failedCheck.checkDc).toBe(12);
    expect(failedCheck.passed).toBe(false);
    expect(failedCheck.fatigueGained).toBe(true);

    const passRoll = (max: number) => 15; // roll 16 (passes DC 12)
    const passedCheck = evaluateWatchFatigue(4, 0, 0, passRoll);
    expect(passedCheck.passed).toBe(true);
    expect(passedCheck.fatigueGained).toBe(false);
  });
});
