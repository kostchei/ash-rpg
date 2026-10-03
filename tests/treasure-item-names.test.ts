import { describe, expect, it } from "vitest";
import { loadDiabloNamePools, nameEquipment, nameTreasureItem } from "../src/server/rewards/item-names.js";
import { coreTreasureTableForLevel, rollCoreTreasure } from "../src/server/rewards/core-treasure.js";
import { createRandomSource } from "../src/server/generators/prng.js";
import { resolveGroupTreasure } from "../src/server/rewards/treasure.js";
import { AshDatabase } from "../src/server/database.js";
import { RewardService } from "../src/server/rewards/service.js";

describe("Diablo treasure names", () => {
  it("keeps the canonical category visible, including the requested Gladius example", () => {
    expect(nameEquipment("Shortsword", () => 2)).toBe("Gladius (short sword)");
    expect(nameTreasureItem("short sword", () => 2)).toBe("Gladius (short sword)");
    expect(nameTreasureItem("shortsword", () => 2)).toBe("Gladius (short sword)");
  });

  it("deduplicates cross-game names and keeps armour components out of full suits", () => {
    const pools = loadDiabloNamePools();
    for (const pool of Object.values(pools)) {
      expect(new Set(pool.map(n => n.toLowerCase())).size).toBe(pool.length);
    }
    expect(pools.leather).toContain("Leather Doublet");
    expect(pools.plate).toContain("Gothic Plate");
    expect(pools.helm).toContain("Great Helm");
    expect([...pools.leather, ...pools.chain, ...pools.plate].some(n => /helm|crown|faulds|bracers/i.test(n))).toBe(false);
    expect(() => nameEquipment("not a category")).toThrow(/No Diablo names/);
  });

  it("preserves quantities, descriptive details, spell tiers and magic effects verbatim", () => {
    for (const description of [
      "Pair of elf-forged shortswords (14 gp)",
      "Three silver-tipped javelins (4 gp each)",
      "Magic wand, 3rd-tier spell (curse) (250 gp)",
      "+2 mithral magic armor (benefit, virtue) (320 gp)",
      "+3 magic weapon (2 benefits) (900 gp)",
    ]) {
      const named = nameTreasureItem(description, () => 0);
      expect(named).not.toBe(description);
      expect(named.endsWith(` — ${description}`)).toBe(true);
      expect(nameTreasureItem(named, () => { throw new Error("Must not reroll"); })).toBe(named);
    }
  });

  it("names bundled armour and shield separately and does not mistake an inlay for equipment", () => {
    const combined = nameTreasureItem("Suit of crimson chainmail with matching shield (70 gp)", () => 0);
    expect(combined).toContain("(chainmail); ");
    expect(combined).toContain("(shield) — ");
    const mace = nameTreasureItem("Mace inlaid with gold holy symbols (50 gp)", () => 0);
    expect(mace).toContain("(mace) — ");
    expect(mace).not.toContain("(holy symbol)");
  });

  it("supports the approved implements without adding spell powers", () => {
    for (const category of ["wand", "holy symbol", "spellbook", "arcane focus", "quiver"]) {
      expect(nameTreasureItem(category, () => 0)).toMatch(new RegExp(`\\(${category}\\)$`));
    }
  });

  it("leaves named relics, unrelated valuables and excluded slots untouched", () => {
    for (const description of [
      "The mighty Staff of Ord (1,200 gp)", "The hallowed Armor of Saint Terragnis (1,200 gp)",
      "The fearsome Obsidian Witchknife (1,200 gp)", "Cracked emerald (60 gp)",
      "Pair of muddy boots (5 sp)", "Leather gloves", "Silk cloak", "Heavy belt",
    ]) {
      expect(nameTreasureItem(description, () => { throw new Error("Should not draw a name"); })).toBe(description);
    }
  });

  it("decorates generated finds across every table while retaining the original roll, value and coins", () => {
    let namedCount = 0;
    for (const level of [1, 5, 8, 12]) {
      const table = coreTreasureTableForLevel(level);
      for (const entry of table.entries) {
        const snapshot = JSON.stringify(entry);
        let first = true;
        const find = rollCoreTreasure(level, max => {
          if (first) { first = false; return entry.min - 1; }
          return max - 1;
        });
        expect(find.entry).toBe(entry);
        expect(JSON.stringify(entry)).toBe(snapshot);
        expect(find.roll).toBe(entry.min);
        expect(find.coins).toEqual(entry.coins ?? { gp: 0, sp: 0, cp: 0 });
        if (entry.coins) expect(find.items).toEqual([]);
        else {
          expect(find.items[0].split(" — ").at(-1)).toBe(entry.description);
          if (find.items[0] !== entry.description) namedCount++;
        }
      }
    }
    expect(namedCount).toBeGreaterThan(30);
  });

  it("uses the supplied seed and persists names through encounter revisits and reward claims", () => {
    const description = "Pair of elf-forged shortswords (14 gp)";
    expect(nameTreasureItem(description, createRandomSource("same"))).toBe(nameTreasureItem(description, createRandomSource("same")));
    const seed = Array.from({ length: 100 }, (_, i) => `naming-${i}`).find(s =>
      resolveGroupTreasure("named", 5, s).items.some(item => item.includes(" — ")))!;
    expect(seed).toBeDefined();
    const db = new AshDatabase(":memory:");
    try {
      const { campaignId } = db.createCampaign("Names", "The Gloaming", "1234");
      const service = new RewardService(db);
      const group = { id: "named", name: "Guard", members: [{ key: "guard", name: "Guard", level: 5 }] };
      const result = service.registerEncounterGroup(campaignId, group, seed);
      const saved = db.getTreasureRoll(campaignId, group.id)!;
      expect(saved.items.some(item => item.includes(" — "))).toBe(true);
      service.registerEncounterGroup(campaignId, group, "different");
      expect(db.getTreasureRoll(campaignId, group.id)!.items).toEqual(saved.items);
      const claim = service.secureRewardSource(campaignId, result.sourceId!);
      expect(claim.rewardRecord!.items).toEqual(saved.items);
      expect(db.getRewards(campaignId)[0].items).toEqual(saved.items);
    } finally { db.close(); }
  });
});
