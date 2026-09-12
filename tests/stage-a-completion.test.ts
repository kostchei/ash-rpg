import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { io as Client, type Socket } from "socket.io-client";
import { createAshServer } from "../src/server/app.js";
import {
  getEligibleClasses,
  meetsIronManRequirements,
  meetsUnearthedArcanaRequirements,
  rollDungeonNpc,
  rollIronManAbilities,
  rollRetainerAbilities,
  rollUnearthedArcanaAbilities,
  UA_CLASS_STAT_ORDER,
} from "../src/server/rules.js";
import type { AbilityScores } from "../src/shared/types.js";

describe("Stage A Completion: Rules, Integrity, Deduplication & Projections", () => {
  describe("Unearthed Arcana Method I & Iron Man Generation Rules", () => {
    const ABILITIES = ["str", "dex", "con", "int", "wis", "cha"] as const;
    const SUPPORTED_CLASSES = [
      "Fighter", "Thief", "Priest", "Wizard", "Delver", "Ras-Godai",
      "Druid", "Alchemist", "Sage", "Monk", "Bard", "Duelist", "Ranger",
    ];

    it("defines a UA stat order covering all six abilities for all 13 classes", () => {
      for (const cls of SUPPORTED_CLASSES) {
        const order = UA_CLASS_STAT_ORDER[cls];
        expect(order).toBeDefined();
        expect([...order].sort()).toEqual([...ABILITIES].sort());
      }
    });

    it("rejects an unknown class rather than falling back to flat dice", () => {
      expect(() => rollUnearthedArcanaAbilities("Bellfounder")).toThrow(
        /No Unearthed Arcana stat order/,
      );
    });

    it("rolls UA dice pools of 8/7/6/5/4/3 in class order, dropping to 4d6 after two high scores", () => {
      for (let i = 0; i < 50; i++) {
        const result = rollUnearthedArcanaAbilities("Fighter");
        expect(result.statOrder).toEqual(UA_CLASS_STAT_ORDER.Fighter);

        let highScores = 0;
        result.statOrder.forEach((key, index) => {
          const isLast = index === result.statOrder.length - 1;
          const expected =
            highScores >= 2 ? (isLast ? 3 : 4) : [8, 7, 6, 5, 4, 3][index];
          expect(result.dice[key].length).toBe(expected);

          const top3Sum = [...result.dice[key]]
            .sort((a, b) => b - a)
            .slice(0, 3)
            .reduce((sum, v) => sum + v, 0);
          expect(result.scores[key]).toBe(top3Sum);
          if (result.scores[key] >= 16) highScores += 1;
        });
      }
    });

    it("silently rerolls UA sets until they meet the requirements", () => {
      for (let i = 0; i < 50; i++) {
        const { scores } = rollUnearthedArcanaAbilities("Wizard");
        const values = ABILITIES.map((k) => scores[k]);
        if (values.some((v) => v === 18)) continue;
        expect(values.filter((v) => v < 6).length).toBeLessThanOrEqual(1);
        expect(values.reduce((a, b) => a + b, 0)).toBeGreaterThanOrEqual(72);
      }
    });

    it("rolls Iron Man abilities as 3d6 in order, rerolled until they meet the requirements", () => {
      for (let i = 0; i < 50; i++) {
        const result = rollIronManAbilities();
        for (const key of ABILITIES) {
          expect(result.dice[key].length).toBe(3);
          expect(result.scores[key]).toBe(
            result.dice[key].reduce((sum, v) => sum + v, 0),
          );
        }
        expect(result.eligibleClasses.length).toBeGreaterThan(0);

        const values = ABILITIES.map((k) => result.scores[k]).sort((a, b) => b - a);
        if (values[0] === 18) continue;
        expect(values[0]).toBeGreaterThanOrEqual(16);
        expect(values[1]).toBeGreaterThanOrEqual(12);
        expect(values.filter((v) => v < 6).length).toBeLessThanOrEqual(1);
        expect(values.reduce((a, b) => a + b, 0)).toBeGreaterThanOrEqual(64);
      }
    });

    it("keeps any set containing an 18, however badly it fails the other requirements", () => {
      const luckyDump: AbilityScores = { str: 18, dex: 3, con: 4, int: 5, wis: 5, cha: 3 };
      expect(meetsIronManRequirements(luckyDump)).toBe(true);
      expect(meetsUnearthedArcanaRequirements(luckyDump)).toBe(true);
    });

    it("checks Iron Man and UA requirements independently", () => {
      // 16/12 present, one dump, total 66 -> Iron Man passes, UA fails on total.
      const ironOnly: AbilityScores = { str: 16, dex: 12, con: 12, int: 11, wis: 10, cha: 5 };
      expect(meetsIronManRequirements(ironOnly)).toBe(true);
      expect(meetsUnearthedArcanaRequirements(ironOnly)).toBe(false);

      // Total 78, but no 16 -> UA passes, Iron Man fails on prime score.
      const uaOnly: AbilityScores = { str: 15, dex: 13, con: 13, int: 13, wis: 12, cha: 12 };
      expect(meetsUnearthedArcanaRequirements(uaOnly)).toBe(true);
      expect(meetsIronManRequirements(uaOnly)).toBe(false);

      // Two scores under 6 fails both.
      const twoDumps: AbilityScores = { str: 17, dex: 16, con: 16, int: 16, wis: 5, cha: 4 };
      expect(meetsIronManRequirements(twoDumps)).toBe(false);
      expect(meetsUnearthedArcanaRequirements(twoDumps)).toBe(false);
    });

    it("rolls classless retainers on straight 3d6", () => {
      const retainer = rollRetainerAbilities();
      expect(retainer.method).toBe("standard");
      for (const key of ABILITIES) {
        expect(retainer.dice[key].length).toBe(3);
        expect(retainer.scores[key]).toBe(
          retainer.dice[key].reduce((sum, v) => sum + v, 0),
        );
      }
    });

    it("rolls classed dungeon NPCs: 1-5 Iron Man with an assigned class, 6 UA with a rolled class", () => {
      const methods = new Set<string>();
      for (let i = 0; i < 120; i++) {
        const npc = rollDungeonNpc();
        methods.add(npc.method);
        expect(UA_CLASS_STAT_ORDER[npc.className]).toBeDefined();
        if (npc.method === "iron_man") {
          // Class is assigned from the scores after rolling them.
          expect(getEligibleClasses(npc.scores)).toContain(npc.className);
          for (const key of ABILITIES) expect(npc.dice[key].length).toBe(3);
        } else {
          // Class is rolled first, then the pools follow its ability order.
          expect(npc.dice[UA_CLASS_STAT_ORDER[npc.className][0]].length).toBe(8);
          expect(meetsUnearthedArcanaRequirements(npc.scores)).toBe(true);
        }
      }
      // 1-in-6 for UA: 120 draws makes both methods overwhelmingly likely to appear.
      expect(methods.size).toBe(2);
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
