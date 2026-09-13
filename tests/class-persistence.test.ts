import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { resolve } from "node:path";
import { rmSync } from "node:fs";
import { AshDatabase } from "../src/server/database.js";

describe("new classes persist through the database", () => {
  let db: AshDatabase;
  const dbPath = resolve("data/test/class_persistence.sqlite");

  const makeCampaign = () =>
    db.createCampaign("Class Test", "Borderlands", "1234", {
      selection: { mode: "single", zoneId: "the_gloaming" },
      legacy: true,
    });

  const baseCharacter = {
    level: 1,
    hp: 6,
    maxHp: 6,
    ac: 10,
    gold: 15,
    gearSlots: 10,
    abilities: { str: 12, dex: 12, con: 12, int: 10, wis: 12, cha: 16 },
    anchors: { homeland: "Fjordholt", landmark: "Standing Stones", nemesis: "The Choir" },
  };

  beforeEach(() => {
    try {
      rmSync(dbPath, { force: true });
    } catch {}
    db = new AshDatabase(dbPath);
  });

  afterEach(() => {
    db.close();
    try {
      rmSync(dbPath, { force: true });
    } catch {}
  });

  it("seeds a resource track and the right class id at creation", () => {
    const { campaignId, hostToken } = makeCampaign();

    const priestId = db.addCharacter(campaignId, null, {
      ...baseCharacter,
      name: "Sigmund",
      ancestry: "human",
      className: "Warrior Priest",
    });
    const knightId = db.addCharacter(campaignId, null, {
      ...baseCharacter,
      name: "Ydrissa",
      ancestry: "human",
      className: "Chaos Knight",
    });

    const state = db.getState(campaignId, "host", null, "http://localhost:3000", hostToken);
    const priest = state.characters.find((c) => c.id === priestId)!;
    const knight = state.characters.find((c) => c.id === knightId)!;

    expect(priest.classId).toBe("warrior_priest");
    expect(priest.resources).toEqual({ righteousness: 0 });
    // A warhammer and mail, not the generic pack.
    expect(priest.inventory?.map((item) => item.itemId)).toContain("warhammer");

    expect(knight.classId).toBe("chaos_knight");
    expect(knight.resources).toEqual({ possession: 3 });
  });

  it("gives occult casters starting spells from the witch list", () => {
    const { campaignId, hostToken } = makeCampaign();
    const witchId = db.addCharacter(campaignId, null, {
      ...baseCharacter,
      name: "Mother Ash",
      ancestry: "human",
      className: "Witch",
    });

    const state = db.getState(campaignId, "host", null, "http://localhost:3000", hostToken);
    const witch = state.characters.find((c) => c.id === witchId)!;
    expect(witch.spells?.length).toBe(3);
    expect(witch.spells?.every((spell) => spell.tier === 1)).toBe(true);
    expect(witch.spells?.map((s) => s.spellId)).toContain("hex");
  });

  it("round-trips a changed resource track", () => {
    const { campaignId, hostToken } = makeCampaign();
    const priestId = db.addCharacter(campaignId, null, {
      ...baseCharacter,
      name: "Sigmund",
      ancestry: "human",
      className: "Warrior Priest",
    });

    let state = db.getState(campaignId, "host", null, "http://localhost:3000", hostToken);
    const priest = state.characters.find((c) => c.id === priestId)!;
    db.updateCharacter(campaignId, { ...priest, resources: { righteousness: 2 } });

    state = db.getState(campaignId, "host", null, "http://localhost:3000", hostToken);
    expect(state.characters.find((c) => c.id === priestId)!.resources).toEqual({ righteousness: 2 });
  });

  it("routes Ras-Godai to its own starting pack now that ids are canonical", () => {
    const { campaignId, hostToken } = makeCampaign();
    const id = db.addCharacter(campaignId, null, {
      ...baseCharacter,
      name: "Shen",
      ancestry: "human",
      className: "Ras-Godai",
    });
    const state = db.getState(campaignId, "host", null, "http://localhost:3000", hostToken);
    const character = state.characters.find((c) => c.id === id)!;
    expect(character.classId).toBe("ras_godai");
    expect(character.inventory?.map((item) => item.itemId)).toContain("shortsword");
  });
});
