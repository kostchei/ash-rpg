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
  calculateDerivedAc,
  calculateGearSlots,
  calculateAttackBonus,
  calculateBackstabBonus,
  resolveSpellCast,
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

  it("calculates derived AC from armor and shield", () => {
    const unarmored = calculateDerivedAc([], 2);
    expect(unarmored.ac).toBe(12);

    const leatherAndShield = calculateDerivedAc([
      { instanceId: "1", itemId: "leather_armor", name: "Leather", kind: "armor", slots: 1, baseAc: 11, equipped: true },
      { instanceId: "2", itemId: "shield", name: "Shield", kind: "shield", slots: 1, acBonus: 2, equipped: true },
    ], 2);
    expect(leatherAndShield.ac).toBe(15);

    const chainmail = calculateDerivedAc([
      { instanceId: "3", itemId: "chainmail", name: "Chainmail", kind: "armor", slots: 2, baseAc: 13, maxDexMod: 2, properties: ["disadvantage_stealth"], equipped: true },
    ], 3);
    expect(chainmail.ac).toBe(15);
    expect(chainmail.hasStealthDisadvantage).toBe(true);
  });

  it("calculates gear slots and weapon mastery bonuses", () => {
    expect(calculateGearSlots({ className: "Fighter", abilities: { str: 14, con: 14 } })).toBe(14);
    expect(calculateGearSlots({ className: "Thief", abilities: { str: 10, con: 12 } })).toBe(10);

    expect(calculateBackstabBonus(1).expression).toBe("+1d6");
    expect(calculateBackstabBonus(3).expression).toBe("+2d6");

    const weapon = { instanceId: "w1", itemId: "longsword", name: "Longsword", kind: "weapon" as const, slots: 1, damage: "1d8", properties: ["versatile"] };
    const attack = calculateAttackBonus({ level: 3, className: "Fighter", abilities: { str: 14, dex: 10 }, classChoices: { masteredWeapon: "longsword" } }, weapon);
    expect(attack.attackBonus).toBe(3);
    expect(attack.damageBonus).toBe(2);
  });

  it("resolves spellcasting checks with mishap on Wizard nat 1 and penance on Priest nat 1", () => {
    const wizard = { className: "Wizard", abilities: { int: 16, wis: 10 } };
    const spell = { tier: 1, sphere: "arcane" };

    const successCast = resolveSpellCast(wizard, spell, 8);
    expect(successCast.success).toBe(true);

    const failCast = resolveSpellCast(wizard, spell, 7);
    expect(failCast.success).toBe(false);

    const mishapCast = resolveSpellCast(wizard, spell, 1, sequence(2));
    expect(mishapCast.success).toBe(false);
    expect(mishapCast.isNat1).toBe(true);
    expect(mishapCast.mishap).toBeDefined();

    const priest = { className: "Priest", abilities: { int: 10, wis: 16 } };
    const divineSpell = { tier: 1, sphere: "divine" };
    const penanceCast = resolveSpellCast(priest, divineSpell, 1);
    expect(penanceCast.success).toBe(false);
    expect(penanceCast.isNat1).toBe(true);
    expect(penanceCast.penanceRequired).toBe(true);
  });
});
