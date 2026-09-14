import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { TRAIT_HEADER, type MonsterSchema } from "../scripts/ingest/extract-monsters.js";
import { AshDatabase } from "../src/server/database.js";
import { generateMonsterVariant } from "../src/server/rules.js";

describe("Monsternomicon & Variant System", () => {
  const db = new AshDatabase(":memory:");
  const ingested: MonsterSchema[] = ["data/bestiary/stats/shadowdark-core.json", "data/bestiary/stats/cursed-scrolls.json"].flatMap(
    (file) => JSON.parse(readFileSync(file, "utf-8")) as MonsterSchema[],
  );

  it("loads 290+ monsters from bestiary files into database and memory", () => {
    const list = db.listMonsters();
    expect(list.length).toBeGreaterThanOrEqual(296);
    const owlbear = db.getMonster("owlbear");
    expect(owlbear).toBeDefined();
    expect(owlbear?.name.toLowerCase()).toContain("owlbear");

    // Core monsters that wear armor in parentheses
    const bandit = db.getMonster("bandit");
    expect(bandit).toBeDefined();
    expect(bandit?.name).toBe("Bandit");
    expect(bandit?.ac).toBe(13);

    const orc = db.getMonster("orc");
    expect(orc).toBeDefined();
    expect(orc?.name).toBe("Orc");
    expect(orc?.ac).toBe(15);

    const skeleton = db.getMonster("skeleton");
    expect(skeleton).toBeDefined();
    expect(skeleton?.name).toBe("Skeleton");
    expect(skeleton?.ac).toBe(13);

    // Cursed Scroll monsters
    const draugr = db.getMonster("draugr");
    expect(draugr).toBeDefined();
    expect(draugr?.name).toBe("Draugr");

    const howler = db.getMonster("howler");
    expect(howler).toBeDefined();
    expect(howler?.name).toBe("Howler");

    const stoneWarrior = db.getMonster("stone_warrior");
    expect(stoneWarrior).toBeDefined();
    expect(stoneWarrior?.name).toBe("Stone Warrior");

    // Aliases & Custom Templates
    const cultists = db.getMonster("basilisk_cultists");
    expect(cultists).toBeDefined();
    expect(cultists?.name).toBe("Basilisk Cultist");

    const troglodyte = db.getMonster("troglodyte");
    expect(troglodyte).toBeDefined();
    expect(troglodyte?.name).toBe("Troglodyte");

    const giantSpider = db.getMonster("giant_spider");
    expect(giantSpider).toBeDefined();
    expect(giantSpider?.name).toBe("Spider Giant");

    const skeletons = db.getMonster("skeletons");
    expect(skeletons).toBeDefined();
    expect(skeletons?.name).toBe("Skeleton");
  });

  it("queries the SQLite monsters table directly and supports search", () => {
    const dbMonsters = db.listMonstersFromDb();
    expect(dbMonsters.length).toBeGreaterThanOrEqual(296);

    const dbBandit = db.getMonsterFromDb("bandit");
    expect(dbBandit).toBeDefined();
    expect(dbBandit?.name).toBe("Bandit");
    expect(dbBandit?.ac).toBe(13);

    const dragons = db.searchMonsters("dragon");
    expect(dragons.length).toBeGreaterThan(0);
    expect(dragons.some((d) => d.name.toLowerCase().includes("dragon"))).toBe(true);
  });

  it("enforces trait hygiene: every ingested trait is a real 'Name. rule' entry with no bleed", () => {
    const statRegex = /AC\s+\d+.*HP\s+\d+.*LV\s+\d+/;
    const allCapsRun = /\b[A-Z]{3,}\s+[A-Z]{3,}\b/;
    const backMatter = /arcanelibrary|discord|newsletter|drivethrurpg/i;

    for (const monster of ingested) {
      for (const trait of monster.traits) {
        expect(trait, `${monster.id} trait is not a trait entry: ${trait}`).toMatch(TRAIT_HEADER);
        expect(trait, `${monster.id} has stat bleed in trait: ${trait}`).not.toMatch(statRegex);
        expect(trait, `${monster.id} has all-caps bleed in trait: ${trait}`).not.toMatch(allCapsRun);
        expect(trait, `${monster.id} has zine back matter in trait: ${trait}`).not.toMatch(backMatter);
      }
    }
  });

  it("parses wrapped, detached-heading, and family-intro trait blocks correctly", () => {
    const byId = (id: string) => {
      const monster = ingested.find((m) => m.id === id);
      if (!monster) throw new Error(`Missing ingested monster ${id}`);
      return monster;
    };

    // Wrapped mid-sentence lines stay in one trait
    expect(byId("zombie").traits).toEqual([
      "Undead. Immune to morale checks.",
      "Relentless. If zombie reduced to 0 HP by a non-magical source, DC 15 CON to go to 1 HP instead.",
    ]);
    // Next monster (Weeping Father) has a detached heading; skrell must keep its own trait
    expect(byId("skrell").traits).toEqual(["Clever. Advantage on checks to do the same action on a consecutive turn."]);
    // Next monster's description must not be appended
    expect(byId("strangler").traits).toHaveLength(2);
    // Family intro prose after the last trait must be dropped
    expect(byId("demon_vrock").traits.join(" ")).not.toContain("Devils are");
    expect(byId("void_being").traits.join(" ")).not.toContain("These creatures");
  });

  it("throws for an unknown zone instead of returning no monsters", () => {
    expect(() => db.getMonstersForZone("no_such_zone_xyz")).toThrow(/Unknown zone "no_such_zone_xyz"/);
  });

  it("ensures 100% of monsters have a canonical family assigned", () => {
    const list = db.listMonsters();
    expect(list.length).toBeGreaterThanOrEqual(296);
    for (const monster of list) {
      expect(monster.family, `Monster ${monster.monsterKey} should have a family`).toBeTruthy();
      expect(typeof monster.family).toBe("string");
      expect(monster.family!.length).toBeGreaterThan(0);
    }
  });

  it("throws an error when attempting to create an encounter with an unknown monster key", () => {
    expect(() => {
      db.addEncounter(1, "non_existent_beast_xyz", 1);
    }).toThrow(/Unknown monster key "non_existent_beast_xyz"/);
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
