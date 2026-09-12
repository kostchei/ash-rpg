import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { AshDatabase } from "../src/server/database.js";
import { resolve } from "node:path";
import { rmSync } from "node:fs";

describe("M0: Multiplayer Mutations & Authority", () => {
  let db: AshDatabase;
  const dbPath = resolve("data/test/m0_test.sqlite");

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

  it("assigns starting equipment and spells upon character creation", () => {
    const { campaignId, hostToken } = db.createCampaign("Test Camp", "Borderlands", "1234", {
      selection: { mode: "single", zoneId: "the_gloaming" },
      legacy: true,
    });

    const fighterId = db.addCharacter(campaignId, null, {
      name: "Valerius",
      ancestry: "human",
      className: "Fighter",
      level: 1,
      hp: 10,
      maxHp: 10,
      ac: 10,
      gold: 15,
      gearSlots: 10,
      abilities: { str: 14, dex: 12, con: 14, int: 10, wis: 10, cha: 10 },
      anchors: { homeland: "Old Valia", landmark: "Iron Keep", nemesis: "The Beast" },
    });

    const wizardId = db.addCharacter(campaignId, null, {
      name: "Elyse",
      ancestry: "elf",
      className: "Wizard",
      level: 1,
      hp: 4,
      maxHp: 4,
      ac: 10,
      gold: 25,
      gearSlots: 10,
      abilities: { str: 8, dex: 14, con: 10, int: 16, wis: 12, cha: 10 },
      anchors: { homeland: "Silver Wood", landmark: "Spire", nemesis: "Archmage" },
    });

    const state = db.getState(campaignId, "host", null, "http://localhost:3000", hostToken);
    const fighter = state.characters.find((c) => c.id === fighterId)!;
    const wizard = state.characters.find((c) => c.id === wizardId)!;

    expect(fighter.classId).toBe("fighter");
    expect(fighter.inventory && fighter.inventory.length).toBeGreaterThan(0);
    // Fighter starts with leather armor (base 11 + 1 dex = 12 AC) and greatsword
    expect(fighter.ac).toBe(12);
    expect(fighter.inventory?.some((i) => i.itemId === "greatsword" && i.equipped)).toBe(true);
    expect(fighter.inventory?.some((i) => i.itemId === "leather_armor" && i.equipped)).toBe(true);
    expect(fighter.inventory?.some((i) => i.itemId === "backpack")).toBe(true);
    expect(fighter.inventory?.some((i) => i.itemId === "torches" && i.remainingTorches === 2)).toBe(true);
    expect(fighter.inventory?.some((i) => i.itemId === "rations" && i.quantity === 3)).toBe(true);
    // Gear slots for Fighter with 14 STR (+2) and 14 CON (+2 hauler): 10 + 2 + 2 = 14
    expect(fighter.gearSlots).toBe(14);

    expect(wizard.classId).toBe("wizard");
    expect(wizard.inventory?.some((i) => i.itemId === "staff" && i.equipped)).toBe(true);
    expect(wizard.inventory?.some((i) => i.itemId === "leather_armor" && i.equipped)).toBe(true);
    expect(wizard.inventory?.some((i) => i.itemId === "backpack")).toBe(true);
    expect(wizard.inventory?.some((i) => i.itemId === "torches" && i.remainingTorches === 2)).toBe(true);
    expect(wizard.inventory?.some((i) => i.itemId === "rations" && i.quantity === 3)).toBe(true);
    expect(wizard.spells && wizard.spells.length).toBe(3);
    expect(wizard.spells?.every((s) => s.available)).toBe(true);

    // Verify duelist, priest/cleric, thief, and bard starting loadouts
    const duelistId = db.addCharacter(campaignId, null, {
      name: "Darian", ancestry: "human", className: "Duelist", level: 1, hp: 8, maxHp: 8, ac: 10,
      abilities: { str: 10, dex: 14, con: 10, int: 10, wis: 10, cha: 10 },
      anchors: { homeland: "Haven", landmark: "Wall", nemesis: "Rival" },
    });
    const priestId = db.addCharacter(campaignId, null, {
      name: "Vera", ancestry: "human", className: "Priest", level: 1, hp: 6, maxHp: 6, ac: 10,
      abilities: { str: 12, dex: 10, con: 12, int: 10, wis: 14, cha: 10 },
      anchors: { homeland: "Haven", landmark: "Shrine", nemesis: "Cult" },
    });
    const thiefId = db.addCharacter(campaignId, null, {
      name: "Milo", ancestry: "halfling", className: "Thief", level: 1, hp: 5, maxHp: 5, ac: 10,
      abilities: { str: 8, dex: 16, con: 10, int: 12, wis: 10, cha: 12 },
      anchors: { homeland: "Borough", landmark: "Tunnel", nemesis: "Guild" },
    });
    const bardId = db.addCharacter(campaignId, null, {
      name: "Lyanna", ancestry: "human", className: "Bard", level: 1, hp: 6, maxHp: 6, ac: 10,
      abilities: { str: 10, dex: 12, con: 10, int: 12, wis: 10, cha: 16 },
      anchors: { homeland: "Tavern", landmark: "Stage", nemesis: "Critic" },
    });

    const refreshed = db.getState(campaignId, "host", null, "http://localhost:3000", hostToken);
    const duelist = refreshed.characters.find((c) => c.id === duelistId)!;
    const priest = refreshed.characters.find((c) => c.id === priestId)!;
    const thief = refreshed.characters.find((c) => c.id === thiefId)!;
    const bard = refreshed.characters.find((c) => c.id === bardId)!;

    expect(duelist.inventory?.some((i) => i.itemId === "greatsword" && i.equipped)).toBe(true);
    expect(priest.inventory?.some((i) => i.itemId === "warhammer" && i.equipped)).toBe(true);
    expect(thief.inventory?.some((i) => i.itemId === "shortsword" && i.equipped)).toBe(true);
    expect(bard.inventory?.some((i) => i.itemId === "shortsword" && i.equipped)).toBe(true);

    for (const char of [duelist, priest, thief, bard]) {
      expect(char.inventory?.some((i) => i.itemId === "leather_armor" && i.equipped)).toBe(true);
      expect(char.inventory?.some((i) => i.itemId === "backpack")).toBe(true);
      expect(char.inventory?.some((i) => i.itemId === "torches" && i.remainingTorches === 2)).toBe(true);
      expect(char.inventory?.some((i) => i.itemId === "rations" && i.quantity === 3)).toBe(true);
    }
  });

  it("manages caller designation and correctly reports isCaller in state projection", () => {
    const { campaignId, hostToken } = db.createCampaign("Test Camp", "Borderlands", "1234", {
      selection: { mode: "single", zoneId: "the_gloaming" },
      legacy: true,
    });

    const hostState = db.getState(campaignId, "host", null, "http://localhost:3000", hostToken);
    expect(hostState.me.isCaller).toBe(true);
    expect(hostState.campaign.callerToken).toBeNull();

    // Player joins
    const joinRes = db.joinCampaign(hostState.campaign.code);
    expect(joinRes).not.toBeNull();
    const playerToken = joinRes!.token;

    const playerCharId = db.addCharacter(campaignId, playerToken, {
      name: "Brann",
      ancestry: "human",
      className: "Thief",
      level: 1,
      hp: 6,
      maxHp: 6,
      ac: 12,
      gold: 20,
      gearSlots: 10,
      abilities: { str: 10, dex: 16, con: 12, int: 12, wis: 10, cha: 12 },
      anchors: { homeland: "Docks", landmark: "Tavern", nemesis: "Guard Captain" },
    });

    // Before designation, player is not caller
    const playerStateBefore = db.getState(campaignId, "player", playerCharId, "http://localhost:3000", playerToken);
    expect(playerStateBefore.me.isCaller).toBe(false);
    expect(playerStateBefore.campaign.callerToken).toBeNull(); // Secret scrubbing

    // Host designates player as caller
    db.setCallerToken(campaignId, playerToken);

    const playerStateAfter = db.getState(campaignId, "player", playerCharId, "http://localhost:3000", playerToken);
    expect(playerStateAfter.me.isCaller).toBe(true);
    expect(playerStateAfter.campaign.callerCharacterName).toBe("Brann");

    // Revoke caller
    db.setCallerToken(campaignId, null);
    const playerStateRevoked = db.getState(campaignId, "player", playerCharId, "http://localhost:3000", playerToken);
    expect(playerStateRevoked.me.isCaller).toBe(false);
  });

  it("enforces revision monotonicity and detects stale revision conflicts in executeMutation", () => {
    const { campaignId, hostToken } = db.createCampaign("Test Camp", "Borderlands", "1234", {
      selection: { mode: "single", zoneId: "the_gloaming" },
      legacy: true,
    });

    let state = db.getState(campaignId, "host", null, "http://localhost:3000", hostToken);
    const rev1 = state.campaign.revision ?? 1;

    // Mutation with matching expected revision succeeds
    const mut1 = db.executeMutation(campaignId, hostToken, "action-001", rev1, () => {
      return { step: 1 };
    });
    expect(mut1.revision).toBe(rev1 + 1);

    // Mutation with stale expected revision throws
    expect(() => {
      db.executeMutation(campaignId, hostToken, "action-002", rev1, () => {
        return { step: 2 };
      });
    }).toThrow(/revision conflict/i);

    // Mutation with current revision succeeds
    const mut2 = db.executeMutation(campaignId, hostToken, "action-002", mut1.revision, () => {
      return { step: 2 };
    });
    expect(mut2.revision).toBe(mut1.revision + 1);
  });

  it("replays idempotent action receipts without re-executing", () => {
    const { campaignId, hostToken } = db.createCampaign("Test Camp", "Borderlands", "1234", {
      selection: { mode: "single", zoneId: "the_gloaming" },
      legacy: true,
    });

    let executionCount = 0;
    const mutate = () => {
      executionCount++;
      return { count: executionCount };
    };

    // First call
    const res1 = db.executeMutation(campaignId, hostToken, "act-replay-test", undefined, mutate);
    expect(res1.result.count).toBe(1);
    expect(executionCount).toBe(1);

    // Replay call with same actionId
    const res2 = db.executeMutation(campaignId, hostToken, "act-replay-test", undefined, mutate);
    expect(res2.result.count).toBe(1);
    expect(executionCount).toBe(1); // Not executed again!
  });

  it("preserves action receipts across database restart", () => {
    const { campaignId, hostToken } = db.createCampaign("Restart", "Borderlands", "1234", {
      selection: { mode: "single", zoneId: "the_gloaming" }, legacy: true,
    });
    const first = db.executeMutation(campaignId, hostToken, "persisted-action", undefined, () => ({ rolled: 17 }));
    db.close();
    db = new AshDatabase(dbPath);
    const replay = db.executeMutation(campaignId, hostToken, "persisted-action", 0, () => {
      throw new Error("A replay must not execute after restart");
    });
    expect(replay).toEqual(first);
  });
});
