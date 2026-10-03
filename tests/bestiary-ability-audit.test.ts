import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { inventory } from "../scripts/bestiary/audit-special-abilities.mjs";

const stats = ["data/bestiary/stats/shadowdark-core.json", "data/bestiary/stats/cursed-scrolls.json"]
  .flatMap((file) => JSON.parse(readFileSync(file, "utf8")));
const proposals = JSON.parse(readFileSync("data/bestiary/ability-additions.json", "utf8")).entries;
const creature = (overrides = {}) => ({ id: "test_creature", move: "near", ac: 12, hp: 10, traits: [], attacks: ["2 claw +2 (1d6)"], ...overrides });

describe("monster ability audit", () => {
  it("excludes ordinary attacks, speed, and disadvantages", () => {
    const result = inventory(creature({ move: "double near", traits: ["Sunblind. Blinded in bright light.", "Desiccated. Takes x2 damage from fire."] }));
    expect(result.abilities).toHaveLength(0);
    expect(result.excluded).toHaveLength(2);
  });

  it("counts a fragmented spell once and records its complete evidence", () => {
    const result = inventory(creature({ traits: ["Enervate (INT Spell). DC 14.", "Focus. One target is stupefied for the duration."] }));
    expect(result.abilities).toHaveLength(1);
    expect(result.abilities[0].name).toBe("Enervate");
    expect(result.abilities[0].references[0].field).toBe("traits[0], traits[1]");
    expect(result.abilities[0].references[0].evidence).toContain("stupefied");
  });

  it("counts independently useful immunities and elemental healing separately", () => {
    const result = inventory(creature({ traits: ["Golem. Immune to damage from fire, cold, or non-magical sources. Healed by electricity."] }));
    expect(result.abilities.map((entry: { name: string }) => entry.name)).toEqual([
      "Fire immunity", "Cold immunity", "Ordinary-damage immunity", "Healing from electricity",
    ]);
  });

  it("does not duplicate movement already described in a trait", () => {
    const result = inventory(creature({ move: "near (climb)", traits: ["Sticky. Can climb and cling to sheer surfaces effortlessly."] }));
    expect(result.abilities).toHaveLength(1);
    expect(result.abilities[0].references).toHaveLength(2);
  });

  it("counts the AC 20 and HP 100 thresholds inclusively", () => {
    expect(inventory(creature({ ac: 19, hp: 99 })).abilities).toHaveLength(0);
    expect(inventory(creature({ ac: 20, hp: 99 })).abilities).toHaveLength(1);
    expect(inventory(creature({ ac: 19, hp: 100 })).abilities).toHaveLength(1);
    expect(inventory(creature({ ac: 20, hp: 100 })).abilities).toHaveLength(2);
  });

  it("keeps a named active power's bundled effects as one ability", () => {
    const result = inventory(creature({ traits: ["Rage. 1/day, immune to morale checks, +1d4 damage (3 rounds)."] }));
    expect(result.abilities.map((entry: { name: string }) => entry.name)).toEqual(["Rage"]);
  });

  it("does not combine all Wendel forms into one creature", () => {
    const result = inventory(stats.find((monster: { id: string }) => monster.id === "wendel"));
    expect(result.abilities).toHaveLength(1);
    expect(result.variants).toHaveLength(8);
    expect(result.variants.map((variant: { existingAbilityCount: number }) => variant.existingAbilityCount)).toEqual([1, 2, 2, 2, 2, 2, 3, 2]);
  });

  it("counts the Stone Warrior companion only when it is present", () => {
    const result = inventory(stats.find((monster: { id: string }) => monster.id === "stone_warrior"));
    expect(result.abilities).toHaveLength(1);
    expect(result.variants.map((variant: { existingAbilityCount: number }) => variant.existingAbilityCount)).toEqual([1, 2]);
  });

  it("excludes polar-bear immunity accidentally imported into the brown bear", () => {
    const result = inventory(stats.find((monster: { id: string }) => monster.id === "bear_brown"));
    expect(result.abilities.map((entry: { name: string }) => entry.name)).toEqual(["Crush", "Climbing"]);
    expect(result.notes.join(" ")).toContain("Polar bear is missing");
  });

  it("provides exactly one draft power for every zero-ability monster and none for others", () => {
    const zeroIds = stats.filter((monster: unknown) => inventory(monster).abilities.length === 0).map((monster: { id: string }) => monster.id).sort();
    expect(stats).toHaveLength(301);
    expect(zeroIds).toHaveLength(26);
    expect(proposals.map((entry: { monsterId: string }) => entry.monsterId).sort()).toEqual(zeroIds);
    expect(new Set(proposals.map((entry: { id: string }) => entry.id)).size).toBe(26);
    for (const proposal of proposals) {
      for (const key of ["name", "use", "trigger", "range", "effect", "frequency", "telegraph", "behaviour", "inspiration"]) {
        expect(proposal[key], `${proposal.monsterId}.${key}`).toBeTruthy();
      }
    }
  });
});
