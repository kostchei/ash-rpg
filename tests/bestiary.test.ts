import { describe, expect, it } from "vitest";
import { AshDatabase } from "../src/server/database.js";
import { generateMonsterVariant } from "../src/server/rules.js";

describe("Monsternomicon & Variant System", () => {
  const db = new AshDatabase(":memory:");

  it("loads 290+ monsters from bestiary files into database and memory", () => {
    const list = db.listMonsters();
    expect(list.length).toBeGreaterThanOrEqual(296);
    const owlbear = db.getMonster("owlbear");
    expect(owlbear).toBeDefined();
    expect(owlbear?.name.toLowerCase()).toContain("owlbear");

    // Core monsters that wear armor in parentheses (previously dropped by buggy regex)
    const bandit = db.getMonster("bandit");
    expect(bandit).toBeDefined();
    expect(bandit?.name).toBe("BANDIT");
    expect(bandit?.ac).toBe(13);

    const orc = db.getMonster("orc");
    expect(orc).toBeDefined();
    expect(orc?.name).toBe("ORC");
    expect(orc?.ac).toBe(15);

    const skeleton = db.getMonster("skeleton");
    expect(skeleton).toBeDefined();
    expect(skeleton?.name).toBe("SKELETON");
    expect(skeleton?.ac).toBe(13);

    // Cursed Scroll monsters
    const draugr = db.getMonster("draugr");
    expect(draugr).toBeDefined();
    expect(draugr?.name).toBe("DRAUGR");

    const howler = db.getMonster("howler");
    expect(howler).toBeDefined();
    expect(howler?.name).toBe("HOWLER");

    const stoneWarrior = db.getMonster("stone_warrior");
    expect(stoneWarrior).toBeDefined();
    expect(stoneWarrior?.name).toBe("STONE WARRIOR");

    // Aliases & Custom Templates
    const cultists = db.getMonster("basilisk_cultists");
    expect(cultists).toBeDefined();
    expect(cultists?.name).toBe("Basilisk Cultist");

    const troglodyte = db.getMonster("troglodyte");
    expect(troglodyte).toBeDefined();
    expect(troglodyte?.name).toBe("Troglodyte");

    const giantSpider = db.getMonster("giant_spider");
    expect(giantSpider).toBeDefined();
    expect(giantSpider?.name).toBe("SPIDER GIANT");

    const skeletons = db.getMonster("skeletons");
    expect(skeletons).toBeDefined();
    expect(skeletons?.name).toBe("SKELETON");
  });

  it("queries the SQLite monsters table directly and supports search", () => {
    const dbMonsters = db.listMonstersFromDb();
    expect(dbMonsters.length).toBeGreaterThanOrEqual(296);

    const dbBandit = db.getMonsterFromDb("bandit");
    expect(dbBandit).toBeDefined();
    expect(dbBandit?.name).toBe("BANDIT");
    expect(dbBandit?.ac).toBe(13);

    const dragons = db.searchMonsters("dragon");
    expect(dragons.length).toBeGreaterThan(0);
    expect(dragons.some((d) => d.name.toLowerCase().includes("dragon"))).toBe(true);
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
