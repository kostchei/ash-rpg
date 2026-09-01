import { describe, expect, it } from "vitest";
import {
  calculateCharacterHp,
  calculateLevelAdvancement,
  levelUpCharacter,
  rollClassTalent,
} from "../src/server/rules.js";
import type { Character } from "../src/shared/types.js";

describe("Class Talents & 1–36 Leveling Progression", () => {
  it("calculates XP progression for levels 1 to 36 (N * 10 XP)", () => {
    expect(calculateLevelAdvancement(1, 5).nextLevelXp).toBe(10);
    expect(calculateLevelAdvancement(1, 10).canLevelUp).toBe(true);
    expect(calculateLevelAdvancement(10, 100).nextLevelXp).toBe(100);
    expect(calculateLevelAdvancement(35, 350).nextLevelXp).toBe(350);
    expect(calculateLevelAdvancement(36, 1000).maxLevel).toBe(true);
  });

  it("rolls 2d6 class talent table", () => {
    const fixedRng = (max: number) => 0; // Rolls two 1s -> total 2
    const talent = rollClassTalent("Fighter", fixedRng);
    expect(talent.roll).toBe(2);
    expect(talent.effect).toContain("Weapon Mastery");
  });

  it("calculates HP: Hit Die + CON for levels 1-10, flat +1 HP/lvl + Grit past 10", () => {
    const fixedDie = () => 4; // roll 5 on d8
    const conMod = 2;
    const highestStatMod = 3;

    // Level 1: 5 + 2 = 7
    const hpLvl1 = calculateCharacterHp("Fighter", 1, conMod, highestStatMod, undefined, fixedDie);
    expect(hpLvl1).toBe(7);

    // Level 10: 10 * (5 + 2) = 70
    const hpLvl10 = calculateCharacterHp("Fighter", 10, conMod, highestStatMod, undefined, fixedDie);
    expect(hpLvl10).toBe(70);

    // Level 11: 70 + 1 (flat level) + 3 (grit highest stat mod) = 74
    const hpLvl11 = calculateCharacterHp("Fighter", 11, conMod, highestStatMod, hpLvl10, fixedDie);
    expect(hpLvl11).toBe(74);

    // Level 12: 74 + 1 = 75
    const hpLvl12 = calculateCharacterHp("Fighter", 12, conMod, highestStatMod, hpLvl11, fixedDie);
    expect(hpLvl12).toBe(75);

    // Level 36 full calculation: 70 (10 HD) + 26 (levels 11..36 flat) + 3 (grit) = 99
    const hpLvl36 = calculateCharacterHp("Fighter", 36, conMod, highestStatMod, undefined, fixedDie);
    expect(hpLvl36).toBe(99);
  });

  it("levels up a character and grants talent on odd levels", () => {
    const char: Character = {
      id: 1,
      name: "Valerius",
      ancestry: "Human",
      className: "Fighter",
      level: 2,
      hp: 14,
      maxHp: 14,
      ac: 14,
      gold: 50,
      gearSlots: 12,
      abilities: { str: 16, dex: 12, con: 14, int: 10, wis: 10, cha: 8 },
      anchors: { homeland: "Oakhaven", landmark: "Watchpost", nemesis: "Gorefang" },
      talents: ["[Lvl 1] Weapon Mastery with Greataxes"],
    };

    // Level up to Level 3 (Odd level -> should gain a talent)
    const result = levelUpCharacter(char);
    expect(result.character.level).toBe(3);
    expect(result.character.maxHp).toBeGreaterThan(14);
    expect(result.newTalent).toBeDefined();
    expect(result.character.talents?.length).toBe(2);
    expect(result.log).toContain("Level Up!");
  });
});
