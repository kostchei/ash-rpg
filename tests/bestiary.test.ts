import { describe, expect, it } from "vitest";
import { AshDatabase } from "../src/server/database.js";
import { generateMonsterVariant } from "../src/server/rules.js";

describe("Monsternomicon & Variant System", () => {
  const db = new AshDatabase(":memory:");

  it("loads 200+ monsters from bestiary files", () => {
    const list = db.listMonsters();
    expect(list.length).toBeGreaterThan(200);
    const owlbear = db.getMonster("owlbear");
    expect(owlbear).toBeDefined();
    expect(owlbear?.name.toLowerCase()).toContain("owlbear");
  });

  it("generates monster variants using Shadowdark p.194 oracle table", () => {
    const base = db.getMonster("owlbear") ?? {
      id: 1,
      monsterKey: "owlbear",
      name: "Owlbear",
      currentHp: 30,
      maxHp: 30,
      loreTier: 0,
      ac: 13,
      morale: 9,
      level: 6,
    };

    // Predetermined RNG: roll 14 -> Angelic (+1 PL, 1d12 damage, Garlic weakness)
    const mockRng = () => 13; // roll 14
    const variant = generateMonsterVariant(base, 4, mockRng);

    expect(variant.isVariant).toBe(true);
    expect(variant.name).toContain("Angelic");
    expect(variant.variantQuality).toBe("Angelic");
    expect(variant.variantStrength).toBe("1d12 damage");
    expect(variant.variantWeakness).toBe("Garlic");
    expect(variant.level).toBe(5); // 4 + 1
    expect(variant.ac).toBe(14); // 10 + 4
  });
});
