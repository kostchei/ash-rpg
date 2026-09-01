import { describe, expect, it } from "vitest";
import {
  calculateMindBelowEncounterBudget,
  createMindBelowPath,
  evaluateAquaticAccess,
  generateMindBelowEncounter,
  generateMindBelowPath,
  getMindBelowBossStructure,
  updateMindBelowProgress,
} from "../src/server/generators/mind-below.js";

describe("The Mind Below adventure-path scaffold", () => {
  it("combines any starting, cave, and end zone", () => {
    const path = createMindBelowPath({
      startingZone: "red_spires",
      caveZone: "dust_sepulchres",
      endZone: "black_abyss",
    });

    expect(path.pathId).toBe("the_mind_below");
    expect(path.startingZone.levelRange).toEqual([1, 3]);
    expect(path.caveZone.levelRange).toEqual([4, 7]);
    expect(path.endZone.levelRange).toEqual([8, 10]);
    expect(path.installations).toEqual([
      "chorus",
      "memory_well",
      "pressure_heart",
    ]);
  });

  it("can select a path and encounter deterministically", () => {
    const pickLast = (maxExclusive: number) => maxExclusive - 1;
    const path = generateMindBelowPath(pickLast);
    const encounter = generateMindBelowEncounter(
      {
        zoneId: path.caveZone.id,
        characterLevels: [4, 4],
        intensity: "standard",
      },
      pickLast,
    );

    expect(path.startingZone.id).toBe("red_spires");
    expect(path.caveZone.id).toBe("dust_sepulchres");
    expect(path.endZone.id).toBe("mireforge");
    expect(encounter.zoneId).toBe("dust_sepulchres");
    expect(encounter.premise).toContain("funerary barge");
    expect(encounter.budget.monsterLevelBudget).toBe(8);
  });

  it("scales a hazardous objective by party power without adding active bodies", () => {
    const solo = calculateMindBelowEncounterBudget({
      characterLevels: [5],
      intensity: "standard",
      hazard: "minor",
      objectiveBurden: true,
    });
    const largeParty = calculateMindBelowEncounterBudget({
      characterLevels: [5, 5, 5, 5, 5, 5],
      intensity: "standard",
      hazard: "major",
    });

    expect(solo).toMatchObject({
      partyPower: 5,
      encounterCeiling: 5,
      hazardCost: 3,
      monsterLevelBudget: 1,
      maxActiveHostiles: 2,
    });
    expect(largeParty).toMatchObject({
      partyPower: 30,
      encounterCeiling: 30,
      hazardCost: 5,
      monsterLevelBudget: 25,
      maxActiveHostiles: 7,
    });
  });

  it("requires every character to meet the selected end-zone access gate", () => {
    const incomplete = evaluateAquaticAccess({
      endZone: "black_abyss",
      partyMethods: ["water_breathing_spell"],
      characters: [
        { characterId: "arta", personalMethods: ["maker_diving_armour"] },
        { characterId: "bran", personalMethods: [] },
      ],
    });

    expect(incomplete.canEnter).toBe(false);
    expect(incomplete.missingByCharacter).toEqual([
      { characterId: "arta", missing: ["navigation"] },
      { characterId: "bran", missing: ["pressure", "navigation"] },
    ]);

    const aboardNautilus = evaluateAquaticAccess({
      endZone: "mireforge",
      partyMethods: ["nautilus_vessel"],
      characters: [
        { characterId: "arta", personalMethods: [] },
        { characterId: "bran", personalMethods: [] },
      ],
    });
    expect(aboardNautilus).toEqual({ canEnter: true, missingByCharacter: [] });
  });

  it("updates hidden progress explicitly and clamps it to its track", () => {
    expect(
      updateMindBelowProgress(
        { reach: 5, awakening: 1, knowledge: 0, access: 0 },
        { reach: 2, knowledge: 1 },
      ),
    ).toEqual({ reach: 6, awakening: 1, knowledge: 1, access: 0 });
  });

  it("reduces solo boss tempo and adds breadth for a large party", () => {
    expect(getMindBelowBossStructure(1)).toMatchObject({
      activeLieutenants: 0,
      reducedTempo: true,
    });
    expect(getMindBelowBossStructure(6)).toMatchObject({
      activeLieutenants: 3,
      reinforcementWaves: 1,
      lairEffect: "active",
    });
  });
});
