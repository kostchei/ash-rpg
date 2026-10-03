import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { campaignVulnerabilityGaps, regenerationCounters, stockVulnerabilities } from "../scripts/bestiary/audit-stock-vulnerabilities.mjs";

const monsters = ["data/bestiary/stats/shadowdark-core.json", "data/bestiary/stats/cursed-scrolls.json"]
  .flatMap((file) => JSON.parse(readFileSync(file, "utf8")));
const get = (id: string) => {
  const monster = monsters.find((entry: { id: string }) => entry.id === id);
  if (!monster) throw new Error(`Missing monster ${id}`);
  return monster;
};

describe("campaign vulnerability gaps", () => {
  it("covers every monster and gives mutually exclusive versions separate rows", () => {
    const audit = JSON.parse(readFileSync("data/bestiary/stock-vulnerability-audit.json", "utf8"));
    const rows = campaignVulnerabilityGaps(audit.rows);
    expect(rows).toHaveLength(309);
    expect(new Set(rows.map((row: { monsterId: string }) => row.monsterId)).size).toBe(301);
    expect(rows.filter((row: { monsterId: string }) => row.monsterId === "wendel")).toHaveLength(8);
    expect(rows.filter((row: { monsterId: string }) => row.monsterId === "stone_warrior")).toHaveLength(2);
    for (const row of rows) {
      expect(row.randomVulnerabilitiesToAdd).toBe(Math.max(0, 1 + row.specialAbilityCount - row.stockVulnerabilityCount));
    }
    expect(rows.find((row: { monsterId: string }) => row.monsterId === "troll").randomVulnerabilitiesToAdd).toBe(2);
    expect(rows.find((row: { monsterId: string }) => row.monsterId === "guard").draftAbilityCount).toBe(1);
  });

  it("never produces a negative random vulnerability allowance", () => {
    const [row] = campaignVulnerabilityGaps([{ monsterId: "example", name: "Example", plannedAbilityCount: 1, proposedAbilityCount: 0, stockVulnerabilityCount: 4 }]);
    expect(row.randomVulnerabilitiesToAdd).toBe(0);
  });
});

describe("stock vulnerabilities", () => {
  it("keeps troll fire and acid regeneration counters outside the vulnerability count", () => {
    expect(stockVulnerabilities(get("troll"))).toHaveLength(0);
    expect(regenerationCounters(get("troll")).map((entry: { id: string }) => entry.id)).toEqual(["fire", "acid"]);
    expect(stockVulnerabilities(get("troll_frost"))).toHaveLength(0);
    expect(regenerationCounters(get("troll_frost")).map((entry: { id: string }) => entry.id)).toEqual(["acid"]);
    expect(stockVulnerabilities(get("troll_deep"))).toHaveLength(0);
    expect(regenerationCounters(get("troll_deep")).map((entry: { id: string }) => entry.id)).toEqual(["cold_iron"]);
  });

  it("counts mummy fire as an actual stock vulnerability with double damage", () => {
    const result = stockVulnerabilities(get("mummy"));
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("fire");
    expect(result[0].effect).toContain("double damage");
    expect(regenerationCounters(get("mummy"))).toHaveLength(0);
  });

  it("does not confuse elemental immunity or healing with vulnerability", () => {
    for (const id of ["golem_clay", "golem_flesh", "golem_iron", "gray_ooze", "shambling_mound"]) {
      expect(stockVulnerabilities(get(id)), id).toHaveLength(0);
    }
  });

  it("counts the three vampire conditions separately without counting source sentences", () => {
    expect(stockVulnerabilities(get("vampire")).map((entry: { id: string }) => entry.id)).toEqual(["resting_vessel", "sunlight", "stake"]);
    expect(stockVulnerabilities(get("vampire_spawn")).map((entry: { id: string }) => entry.id)).toEqual(["silver", "resting_vessel", "sunlight", "stake"]);
  });

  it("counts repeated sunlight effects once and records the evidence", () => {
    const result = stockVulnerabilities(get("void_bat"));
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("sunlight");
    expect(result[0].effect).toContain("Disadvantage");
    expect(result[0].effect).toContain("1d4");
    expect(result[0].references[0].field).toBe("traits[2]");
  });

  it("distinguishes particular material exceptions from general magical damage", () => {
    expect(stockVulnerabilities(get("gargoyle"))).toHaveLength(0);
    const silver = stockVulnerabilities(get("werewolf"));
    expect(silver).toHaveLength(1);
    expect(silver[0].kind).toBe("specific_defence_exception");
    expect(silver[0].effect).toContain("No damage multiplier");
  });

  it("ignores ordinary escape checks and ending a threat by killing it", () => {
    for (const id of ["chuul", "scorpion_giant", "death_slug"]) {
      expect(stockVulnerabilities(get(id)), id).toHaveLength(0);
    }
  });

  it("covers all imported records using source-only susceptibilities", () => {
    expect(monsters).toHaveLength(301);
    const counts = monsters.map((monster: unknown) => stockVulnerabilities(monster).length);
    expect(counts.filter((count: number) => count === 0)).toHaveLength(266);
    expect(counts.reduce((total: number, count: number) => total + count, 0)).toBe(45);
  });
});
