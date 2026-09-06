import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { io as Client, type Socket } from "socket.io-client";
import { createAshServer } from "../src/server/app.js";
import {
  getEligibleClasses,
  rollIronManAbilities,
  rollUnearthedArcanaAbilities,
  UA_CLASS_DICE_ALLOCATION,
} from "../src/server/rules.js";
import type { AbilityScores } from "../src/shared/types.js";

describe("Stage A Completion: Rules, Integrity, Deduplication & Projections", () => {
  describe("Unearthed Arcana Method I & Iron Man Generation Rules", () => {
    it("defines UA dice allocations for all 13 supported classes", () => {
      const classes = [
        "Fighter", "Thief", "Priest", "Wizard", "Delver", "Ras-Godai",
        "Druid", "Alchemist", "Sage", "Monk", "Bard", "Duelist", "Ranger",
      ];
      for (const cls of classes) {
        expect(UA_CLASS_DICE_ALLOCATION[cls]).toBeDefined();
        const alloc = UA_CLASS_DICE_ALLOCATION[cls];
        expect(alloc.str).toBeGreaterThanOrEqual(3);
        expect(alloc.dex).toBeGreaterThanOrEqual(3);
        expect(alloc.con).toBeGreaterThanOrEqual(3);
        expect(alloc.int).toBeGreaterThanOrEqual(3);
        expect(alloc.wis).toBeGreaterThanOrEqual(3);
        expect(alloc.cha).toBeGreaterThanOrEqual(3);
      }
    });

    it("rolls UA abilities keeping 3 highest dice and preserving individual dice", () => {
      // Mock RNG that returns predictable sequence (0..5 -> roll 1..6)
      let rollSeq = 0;
      const deterministicRng = (max: number) => {
        rollSeq = (rollSeq + 1) % max;
        return rollSeq;
      };

      const result = rollUnearthedArcanaAbilities("Fighter", deterministicRng);
      expect(result.dice.str.length).toBe(9); // Fighter has 9d6 str
      expect(result.dice.con.length).toBe(8); // Fighter has 8d6 con
      expect(result.dice.dex.length).toBe(7); // Fighter has 7d6 dex
      expect(result.dice.int.length).toBe(5); // Fighter has 5d6 int
      expect(result.dice.wis.length).toBe(4); // Fighter has 4d6 wis
      expect(result.dice.cha.length).toBe(3); // Fighter has 3d6 cha

      // Verify score equals sum of top 3 dice
      for (const key of ["str", "con", "dex", "int", "wis", "cha"] as const) {
        const top3Sum = [...result.dice[key]]
          .sort((a, b) => b - a)
          .slice(0, 3)
          .reduce((sum, v) => sum + v, 0);
        expect(result.scores[key]).toBe(top3Sum);
        expect(result.scores[key]).toBeGreaterThanOrEqual(3);
        expect(result.scores[key]).toBeLessThanOrEqual(18);
      }
    });

    it("rolls Iron Man abilities strictly in 3d6 order and computes eligible classes", () => {
      const fixedRng = () => 3; // die roll is 4, 3d6 = 12 for all stats
      const result = rollIronManAbilities(fixedRng);

      expect(result.scores).toEqual({
        str: 12,
        dex: 12,
        con: 12,
        int: 12,
        wis: 12,
        cha: 12,
      });
      // With all 12s, all classes should be eligible
      expect(result.eligibleClasses.length).toBe(13);
      expect(result.eligibleClasses).toContain("Fighter");
      expect(result.eligibleClasses).toContain("Wizard");
    });

    it("filters eligible classes accurately based on prime requisites", () => {
      // Strong fighter stats
      const warrior: AbilityScores = { str: 14, dex: 8, con: 12, int: 7, wis: 7, cha: 8 };
      const warriorEligible = getEligibleClasses(warrior);
      expect(warriorEligible).toContain("Fighter");
      expect(warriorEligible).toContain("Delver");
      expect(warriorEligible).not.toContain("Wizard");
      expect(warriorEligible).not.toContain("Thief");

      // Cunning thief stats
      const rogue: AbilityScores = { str: 8, dex: 15, con: 8, int: 8, wis: 8, cha: 8 };
      const rogueEligible = getEligibleClasses(rogue);
      expect(rogueEligible).toContain("Thief");
      expect(rogueEligible).toContain("Ras-Godai");
      expect(rogueEligible).toContain("Duelist");
      expect(rogueEligible).not.toContain("Fighter");
      expect(rogueEligible).not.toContain("Priest");

      // Extremely poor stats fallback (all < 9) selects highest stat
      const poorStats: AbilityScores = { str: 6, dex: 8, con: 5, int: 5, wis: 4, cha: 4 };
      const poorEligible = getEligibleClasses(poorStats);
      // Highest is dex (8) -> fallback yields dex classes
      expect(poorEligible).toContain("Thief");
      expect(poorEligible).not.toContain("Priest");
    });
  });

  describe("Source-Linked XP Deduplication & Consequential Mutation Integrity", () => {
    let server: Awaited<ReturnType<typeof createAshServer>>;
    let host: Socket;
    let campaignCode: string;
    let charId: number;
    let sequence = 0;

    const envelope = () => ({
      actionId: `stage-a-${++sequence}`,
      expectedRevision: server.db.getState(1, "host", null, "").campaign.revision,
    });

    const send = <T = any>(socket: Socket, event: string, payload: unknown) =>
      new Promise<T>((resolve) => socket.emit(event, payload, resolve));

    beforeAll(async () => {
      server = await createAshServer({
        dbPath: ":memory:",
        frontend: false,
        port: 0,
      });
      await server.listen();
      const addr = server.httpServer.address() as any;

      const created = server.db.createCampaign("Stage A Campaign", "The Gloaming", "1234", {
        selection: { mode: "single", zoneId: "the_gloaming" },
        legacy: true,
      });
      campaignCode = created.code;

      charId = server.db.addCharacter(created.campaignId, null, {
        name: "Alden",
        ancestry: "Human",
        className: "Fighter",
        level: 1,
        hp: 10,
        maxHp: 10,
        ac: 14,
        gold: 20,
        gearSlots: 10,
        abilities: { str: 14, dex: 10, con: 12, int: 10, wis: 10, cha: 10 },
        anchors: { homeland: "Borderlands", landmark: "Keep", nemesis: "Rival" },
      });

      host = Client(`http://localhost:${addr.port}`, {
        auth: { code: campaignCode, token: created.hostToken, role: "host" },
      });
      await new Promise<void>((resolve) => host.on("connect", () => resolve()));
    });

    afterAll(async () => {
      host.disconnect();
      await server.close();
    });

    it("awards XP with sourceId and prevents duplicate awards for the same sourceId", async () => {
      const sourceId = "quest:rescue_surveyor_1";

      // First award succeeds
      const firstRes = await send(host, "session:award_xp", {
        amount: 5,
        reason: "Rescued surveyor",
        sourceId,
        ...envelope(),
      });
      expect(firstRes.ok).toBe(true);
      expect(firstRes.awarded).toBe(true);
      expect(firstRes.alreadyAwarded).toBe(false);

      const charAfterFirst = server.db.getState(1, "host", null, "").characters.find((c) => c.id === charId)!;
      expect(charAfterFirst.xp).toBe(5);

      // Duplicate award with same sourceId (even with fresh actionId) is deduplicated
      const secondRes = await send(host, "session:award_xp", {
        amount: 5,
        reason: "Rescued surveyor duplicate",
        sourceId,
        ...envelope(),
      });
      expect(secondRes.ok).toBe(true);
      expect(secondRes.awarded).toBe(false);
      expect(secondRes.alreadyAwarded).toBe(true);

      const charAfterSecond = server.db.getState(1, "host", null, "").characters.find((c) => c.id === charId)!;
      expect(charAfterSecond.xp).toBe(5); // No double dipping!
    });

    it("enforces mutation idempotency on newly migrated consequential actions", async () => {
      // 1. Test combat:update_hp idempotency
      const startCombatRes = await send(host, "combat:start", {
        name: "Training Dummy",
        monsters: [{ name: "Target Dummy", hp: 10, ac: 10, morale: 12 }],
      });
      expect(startCombatRes.ok).toBe(true);

      const pc = startCombatRes.combat.combatants.find((c: any) => c.kind === "pc");
      const hpPayload = {
        combatantId: pc.id,
        delta: -3,
        ...envelope(),
      };

      const revBefore = server.db.getState(1, "host", null, "").campaign.revision;
      const hpRes1 = await send(host, "combat:update_hp", hpPayload);
      expect(hpRes1.ok).toBe(true);
      expect(hpRes1.revision).toBe(revBefore + 1);

      // Replaying the same request with the same actionId returns stored outcome without advancing revision
      const hpRes2 = await send(host, "combat:update_hp", hpPayload);
      expect(hpRes2.ok).toBe(true);
      expect(hpRes2.revision).toBe(revBefore + 1);

      // Character HP is only reduced once (10 - 3 = 7)
      const combatAfter = server.db.getCombatState(1)!;
      expect(combatAfter.combatants.find((c) => c.id === pc.id)?.currentHp).toBe(7);

      // Reusing the same actionId with a different delta is rejected
      const conflictRes = await send(host, "combat:update_hp", {
        combatantId: pc.id,
        delta: -5,
        actionId: hpPayload.actionId,
        expectedRevision: hpRes1.revision,
      });
      expect(conflictRes.ok).toBe(false);
      expect(conflictRes.error).toMatch(/already used for a different request/i);
    });

    it("rejects stale revisions on consequential actions", async () => {
      const stalePayload = {
        ...envelope(),
        expectedRevision: 0, // Stale! Current revision is much higher
      };
      const res = await send(host, "party:rest", stalePayload);
      expect(res.ok).toBe(false);
      expect(res.error).toMatch(/revision conflict/i);
    });
  });
});
