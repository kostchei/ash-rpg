import { describe, expect, it } from "vitest";
import {
  CLASSES,
  SPELLS,
  SPELL_GRANTING_PATRONS,
  STARTING_EQUIPMENT,
  WARLOCK_PATRONS,
  resolveWarlockPatron,
} from "../src/shared/content.js";
import {
  adjustResource,
  classResource,
  initialResources,
  requireClassResource,
  resetResources,
  resourceMax,
  spendResource,
} from "../src/shared/class-resources.js";
import {
  UA_CLASS_STAT_ORDER,
  getEligibleClasses,
  resolveCastingTradition,
  resolveSpellCast,
} from "../src/server/rules.js";

/** Ability scores that make every class in the roster eligible. */
const heroic = { str: 16, dex: 16, con: 16, int: 16, wis: 16, cha: 16 };

describe("class roster wiring", () => {
  it("carries the classes that were previously documented but unreachable", () => {
    const names = CLASSES.map((c) => c.name);
    expect(names).toEqual(
      expect.arrayContaining(["Barbarian", "Chaos Knight", "Warlock", "Witch", "Warrior Priest"]),
    );
    // The old names are gone, not merely aliased.
    expect(names).not.toContain("Sea Wolf");
    expect(names).not.toContain("Knight of St. Ydris");
  });

  it("gives every class a Unearthed Arcana stat order", () => {
    for (const classInfo of CLASSES) {
      expect(UA_CLASS_STAT_ORDER[classInfo.name], classInfo.name).toBeDefined();
      expect(new Set(UA_CLASS_STAT_ORDER[classInfo.name]).size, classInfo.name).toBe(6);
    }
  });

  it("makes every class eligible for a character who rolled well", () => {
    const eligible = getEligibleClasses(heroic);
    for (const classInfo of CLASSES) {
      expect(eligible, classInfo.name).toContain(classInfo.name);
    }
  });

  it("gives every class its own starting equipment pack", () => {
    for (const classInfo of CLASSES) {
      expect(STARTING_EQUIPMENT[classInfo.id], classInfo.id).toBeDefined();
    }
  });

  it("keeps class ids free of the characters the id derivation would strip", () => {
    for (const classInfo of CLASSES) {
      expect(classInfo.id, classInfo.name).toMatch(/^[a-z0-9_]+$/);
    }
  });
});

describe("warlock patrons", () => {
  it("offers only patrons whose boons teach spells", () => {
    expect(SPELL_GRANTING_PATRONS.length).toBeGreaterThan(0);
    for (const patron of SPELL_GRANTING_PATRONS) {
      expect(patron.boons.some((boon) => boon.grantsSpellId), patron.name).toBe(true);
    }
  });

  it("withholds a patron who grants no spells", () => {
    const memnon = WARLOCK_PATRONS.find((patron) => patron.id === "memnon");
    expect(memnon).toBeDefined();
    expect(SPELL_GRANTING_PATRONS).not.toContain(memnon);
    expect(() => resolveWarlockPatron("memnon")).toThrow(/grant no spells/);
  });

  it("only grants spells that exist", () => {
    for (const patron of WARLOCK_PATRONS) {
      for (const boon of patron.boons) {
        if (!boon.grantsSpellId) continue;
        expect(SPELLS.some((spell) => spell.id === boon.grantsSpellId), boon.grantsSpellId).toBe(true);
      }
    }
  });

  it("resolves a bondable patron", () => {
    expect(resolveWarlockPatron("shune_the_vile").name).toBe("Shune the Vile");
  });
});

describe("class resource tracks", () => {
  const priest = { className: "Warrior Priest", talents: [] as string[], resources: { righteousness: 0 } };

  it("starts a Warrior Priest empty and a Chaos Knight full", () => {
    expect(initialResources("Warrior Priest")).toEqual({ righteousness: 0 });
    expect(initialResources("Chaos Knight")).toEqual({ possession: 3 });
    expect(initialResources("Fighter")).toBeUndefined();
    expect(classResource("Fighter")).toBeUndefined();
  });

  it("clamps the track to its cap", () => {
    expect(adjustResource(priest, 1)).toBe(1);
    expect(adjustResource({ ...priest, resources: { righteousness: 3 } }, 1)).toBe(3);
    expect(adjustResource({ ...priest, resources: { righteousness: 0 } }, -1)).toBe(0);
  });

  it("raises the cap once per Righteous Vessel talent", () => {
    expect(resourceMax("Warrior Priest")).toBe(3);
    expect(
      resourceMax("Warrior Priest", [
        "Righteous Vessel: your maximum Righteousness increases by 1.",
        "Righteous Vessel: your maximum Righteousness increases by 1.",
      ]),
    ).toBe(5);
    // A class with no cap talent ignores talent text entirely.
    expect(resourceMax("Chaos Knight", ["Righteous Vessel: ..."])).toBe(3);
  });

  it("refuses a miracle the priest cannot pay for", () => {
    expect(() => spendResource({ ...priest, resources: { righteousness: 2 } }, "martyrs_blessing")).toThrow(
      /costs 3 Righteousness; only 2 is held/,
    );
    expect(spendResource({ ...priest, resources: { righteousness: 3 } }, "martyrs_blessing")).toMatchObject({
      remaining: 0,
    });
    expect(() => spendResource({ ...priest, resources: { righteousness: 3 } }, "not_a_miracle")).toThrow(
      /is not a Righteousness spender/,
    );
  });

  it("empties Righteousness after combat and refills Possession on a rest", () => {
    expect(resetResources({ className: "Warrior Priest", resources: { righteousness: 3 } }, "combat_end")).toEqual({
      righteousness: 0,
    });
    // The wrong trigger leaves the track alone.
    expect(resetResources({ className: "Warrior Priest", resources: { righteousness: 3 } }, "rest")).toEqual({
      righteousness: 3,
    });
    expect(resetResources({ className: "Chaos Knight", resources: { possession: 0 } }, "rest")).toEqual({
      possession: 3,
    });
    expect(resetResources({ className: "Chaos Knight", resources: { possession: 0 } }, "combat_end")).toEqual({
      possession: 0,
    });
  });

  it("throws for a class that has no track", () => {
    expect(() => requireClassResource("Fighter")).toThrow(/has no resource track/);
  });
});

describe("occult spellcasting", () => {
  it("routes the occult classes through Charisma", () => {
    for (const className of ["Warlock", "Witch", "Chaos Knight"]) {
      expect(resolveCastingTradition(className), className).toBe("occult");
    }
    expect(resolveCastingTradition("Wizard")).toBe("arcane");
    expect(resolveCastingTradition("Priest")).toBe("divine");
    // A class with no tradition of its own reads the spell's sphere.
    expect(resolveCastingTradition("Fighter", "arcane")).toBe("arcane");
    expect(() => resolveCastingTradition("Fighter")).toThrow(/Cannot resolve a casting tradition/);
  });

  it("adds the Charisma modifier for a warlock, not Intelligence", () => {
    const result = resolveSpellCast(
      { className: "Warlock", abilities: { int: 6, wis: 6, cha: 18 } },
      { tier: 1, sphere: "occult" },
      10,
    );
    expect(result.tradition).toBe("occult");
    expect(result.total).toBe(14); // 10 + CHA 18 (+4)
    expect(result.success).toBe(true);
  });

  it("rolls a diabolical mishap on a fumbled occult cast, not penance", () => {
    const result = resolveSpellCast(
      { className: "Witch", abilities: { int: 10, wis: 10, cha: 10 } },
      { tier: 1, sphere: "occult" },
      1,
      () => 0,
    );
    expect(result.isNat1).toBe(true);
    expect(result.penanceRequired).toBe(false);
    expect(result.mishap).toMatch(/Debt Called In/);
  });
});
