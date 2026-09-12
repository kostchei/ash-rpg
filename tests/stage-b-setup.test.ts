import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { io as Client, type Socket } from "socket.io-client";
import { createAshServer } from "../src/server/app.js";

describe("Stage B: Campaign Setup & Two-Character Ownership", () => {
  let server: Awaited<ReturnType<typeof createAshServer>>;
  let host: Socket;
  let player1: Socket;
  let player2: Socket;
  let campaignCode: string;
  let hostToken: string;
  let player1Token: string;
  let player2Token: string;
  let player1Char1Id: number;
  let player1Char2Id: number;
  let player2Char1Id: number;

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

    const created = server.db.createCampaign(
      "The Uncharted Expedition",
      "The Gloaming",
      "1234",
      {
        selection: { mode: "single", zoneId: "the_gloaming" },
        legacy: true,
      },
      { mode: "secret" },
    );
    campaignCode = created.code;
    hostToken = created.hostToken;

    const joined1 = server.db.joinCampaign(campaignCode);
    player1Token = joined1.token;
    const joined2 = server.db.joinCampaign(campaignCode);
    player2Token = joined2.token;

    host = Client(`http://localhost:${addr.port}`, {
      auth: { code: campaignCode, token: hostToken, role: "host" },
    });
    player1 = Client(`http://localhost:${addr.port}`, {
      auth: { code: campaignCode, token: player1Token, role: "player" },
    });
    player2 = Client(`http://localhost:${addr.port}`, {
      auth: { code: campaignCode, token: player2Token, role: "player" },
    });

    await Promise.all([
      new Promise<void>((resolve) => host.on("connect", () => resolve())),
      new Promise<void>((resolve) => player1.on("connect", () => resolve())),
      new Promise<void>((resolve) => player2.on("connect", () => resolve())),
    ]);
  });

  afterAll(async () => {
    host.disconnect();
    player1.disconnect();
    player2.disconnect();
    await server.close();
  });

  describe("Secret Adventure Path Projections", () => {
    it("conceals true adventure path identity and spoiler narrative tells", async () => {
      const state = server.db.getState(1, "player", null, "", player1Token);
      expect(state.campaign.isSecretPath).toBe(true);
      expect(state.campaign.adventurePath).toBeDefined();
      expect(state.campaign.adventurePath?.pathId).toBe("secret");
      expect(state.campaign.adventurePath?.name).toBe("Uncharted Omens");
      expect(state.campaign.adventurePath?.isSecret).toBe(true);
      expect(state.campaign.adventurePath?.narrativeTells).toEqual([
        "Strange omens stir the wilderness, their source yet hidden.",
      ]);
    });
  });

  describe("Table Readiness & Single Start Lifecycle", () => {
    it("reports lobby readiness state before campaign start", async () => {
      const state = server.db.getState(1, "host", null, "");
      expect(state.campaign.started).toBe(false);
      expect(state.tablePlayers?.length).toBe(2);
      expect(state.campaign.tableReadiness?.readyPlayers).toBe(0);
      expect(state.campaign.tableReadiness?.allReady).toBe(false);
    });

    it("allows players to toggle readiness", async () => {
      const r1 = await send(player1, "table:ready", { ready: true });
      expect(r1.ok).toBe(true);
      expect(r1.ready).toBe(true);

      const state1 = server.db.getState(1, "host", null, "");
      expect(state1.campaign.tableReadiness?.readyPlayers).toBe(1);
      expect(state1.campaign.tableReadiness?.allReady).toBe(false);

      const r2 = await send(player2, "table:ready", { ready: true });
      expect(r2.ok).toBe(true);

      const state2 = server.db.getState(1, "host", null, "");
      expect(state2.campaign.tableReadiness?.readyPlayers).toBe(2);
      expect(state2.campaign.tableReadiness?.allReady).toBe(true);
    });

    it("prevents non-hosts from starting the campaign", async () => {
      const failStart = await send(player1, "campaign:start", {});
      expect(failStart.ok).toBe(false);
      expect(failStart.error).toContain("Only the table host can start");
    });

    it("commits start once idempotently without re-triggering generation", async () => {
      const startRes = await send(host, "campaign:start", {});
      expect(startRes.ok).toBe(true);
      expect(startRes.started).toBe(true);
      expect(startRes.alreadyStarted).toBe(false);

      const stateAfterStart = server.db.getState(1, "host", null, "");
      expect(stateAfterStart.campaign.started).toBe(true);
      expect(stateAfterStart.campaign.phase).toBe("sanctuary");

      // Repeat start must be idempotent and non-destructive
      const repeatStart = await send(host, "campaign:start", {});
      expect(repeatStart.ok).toBe(true);
      expect(repeatStart.started).toBe(true);
      expect(repeatStart.alreadyStarted).toBe(true);
    });
  });

  describe("Authoritative Ability Roll Endpoints", () => {
    it("rolls Unearthed Arcana abilities with class-specific dice tables", async () => {
      const res = await send(player1, "character:roll-ua", { className: "Fighter" });
      expect(res.ok).toBe(true);
      expect(res.statOrder).toEqual(["str", "con", "dex", "int", "wis", "cha"]);
      // Descending pools in class order, unless two high scores cut them to 4d6.
      expect(res.dice.str.length).toBe(8);
      expect([7, 4].includes(res.dice.con.length)).toBe(true);
      expect([6, 4].includes(res.dice.dex.length)).toBe(true);
      expect(res.dice.cha.length).toBe(3);
      expect(res.scores.str).toBeGreaterThanOrEqual(3);
      expect(res.scores.str).toBeLessThanOrEqual(18);
    });

    it("rolls Iron Man abilities in strict 3d6 order and computes eligible classes", async () => {
      const res = await send(player1, "character:roll-ironman", {});
      expect(res.ok).toBe(true);
      for (const stat of ["str", "dex", "con", "int", "wis", "cha"]) {
        expect(res.dice[stat].length).toBe(3);
      }
      expect(res.eligibleClasses).toBeInstanceOf(Array);
      expect(res.eligibleClasses.length).toBeGreaterThan(0);
    });

    it("rejects Iron Man character creation if chosen class is ineligible", async () => {
      // Create scores where STR is 7 and INT is 16 (Wizard eligible, Fighter ineligible)
      const res = await send(player1, "character:create", {
        name: "Failing Warrior",
        ancestry: "Human",
        className: "Fighter",
        abilities: { str: 7, dex: 11, con: 11, int: 16, wis: 11, cha: 12 },
        anchors: { homeland: "North", landmark: "Tower", nemesis: "Ghost" },
        originZoneId: "the_gloaming",
        generationMethod: "iron_man",
      });
      expect(res.ok).toBe(false);
      expect(res.error).toContain("not eligible for these Iron Man ability scores");
    });
  });

  describe("Two Owned Characters per Player & Active/Reserve Model", () => {
    it("assigns first created character as active and records generation metadata", async () => {
      const res = await send(player1, "character:create", {
        name: "Vaelin",
        ancestry: "Human",
        className: "Fighter",
        abilities: { str: 16, dex: 14, con: 15, int: 10, wis: 11, cha: 9 },
        anchors: { homeland: "Borderlands", landmark: "Tower", nemesis: "Beast" },
        originZoneId: "the_gloaming",
        generationMethod: "unearthed_arcana",
        generationDice: { str: [6, 5, 5, 4, 3, 2, 2, 1, 1] },
      });
      expect(res.ok).toBe(true);
      player1Char1Id = res.characterId;
      const c1 = server.db
        .getState(1, "player", null, "", player1Token)
        .characters.find((c) => c.id === player1Char1Id)!;
      expect(c1.rosterStatus).toBe("active");
      expect(c1.generationMethod).toBe("unearthed_arcana");
      expect(c1.originZoneId).toBe("the_gloaming");

      // Verify active character ID bound to device
      const state = server.db.getState(1, "player", null, "", player1Token);
      expect(state.me.characterId).toBe(player1Char1Id);
    });

    it("assigns second created character as reserve without displacing active character", async () => {
      const res = await send(player1, "character:create", {
        name: "Kaelen",
        ancestry: "Elf",
        className: "Wizard",
        abilities: { str: 9, dex: 12, con: 10, int: 17, wis: 14, cha: 11 },
        anchors: { homeland: "Sylvan Woods", landmark: "Ancient Oak", nemesis: "Warlock" },
        originZoneId: "the_gloaming",
        generationMethod: "iron_man",
        generationDice: { int: [6, 6, 5] },
      });
      expect(res.ok).toBe(true);
      player1Char2Id = res.characterId;
      const c2 = server.db
        .getState(1, "player", null, "", player1Token)
        .characters.find((c) => c.id === player1Char2Id)!;
      expect(c2.rosterStatus).toBe("reserve");
      expect(c2.generationMethod).toBe("iron_man");

      // Active character must still be Vaelin
      const state = server.db.getState(1, "player", null, "", player1Token);
      expect(state.me.characterId).toBe(player1Char1Id);
    });

    it("allows further Iron Man characters beyond the first two", async () => {
      const res = await send(player1, "character:create", {
        name: "Third Wheel",
        ancestry: "Dwarf",
        className: "Priest",
        abilities: { str: 12, dex: 10, con: 14, int: 10, wis: 16, cha: 12 },
        anchors: { homeland: "Deep Delve", landmark: "Forge", nemesis: "Shadow" },
        originZoneId: "the_gloaming",
        generationMethod: "iron_man",
      });
      expect(res.ok).toBe(true);
      const owned = server.db
        .getState(1, "player", null, "", player1Token)
        .characters.filter((c) => c.id === res.characterId);
      expect(owned[0].rosterStatus).toBe("reserve");
      // Active character is untouched by the extra recruit.
      const state = server.db.getState(1, "player", null, "", player1Token);
      expect(state.me.characterId).toBe(player1Char1Id);
    });

    it("rejects a second Unearthed Arcana character for the same player", async () => {
      const res = await send(player1, "character:create", {
        name: "Second Chosen",
        ancestry: "Elf",
        className: "Bard",
        abilities: { str: 10, dex: 14, con: 12, int: 13, wis: 12, cha: 17 },
        anchors: { homeland: "Silverstrand", landmark: "Amphitheatre", nemesis: "Critic" },
        originZoneId: "the_gloaming",
        generationMethod: "unearthed_arcana",
      });
      expect(res.ok).toBe(false);
      expect(res.error).toContain(
        "already owns their one Unearthed Arcana character",
      );
    });

    it("rejects a player character created without a generation method", async () => {
      const res = await send(player2, "character:create", {
        name: "Methodless",
        ancestry: "Human",
        className: "Fighter",
        abilities: { str: 16, dex: 12, con: 13, int: 10, wis: 10, cha: 10 },
        anchors: { homeland: "Nowhere", landmark: "Nothing", nemesis: "No one" },
        originZoneId: "the_gloaming",
      });
      expect(res.ok).toBe(false);
      expect(res.error).toContain(
        "Players must roll with the Iron Man or Unearthed Arcana method",
      );
    });

    it("rejects ability scores that do not meet the chosen method's requirements", async () => {
      const res = await send(player2, "character:create", {
        name: "Milquetoast",
        ancestry: "Human",
        className: "Fighter",
        abilities: { str: 11, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
        anchors: { homeland: "Nowhere", landmark: "Nothing", nemesis: "No one" },
        originZoneId: "the_gloaming",
        generationMethod: "iron_man",
      });
      expect(res.ok).toBe(false);
      expect(res.error).toContain("do not meet the Iron Man requirements");
    });

    it("allows second player to create their own characters", async () => {
      const res = await send(player2, "character:create", {
        name: "Lyra",
        ancestry: "Halfling",
        className: "Thief",
        abilities: { str: 10, dex: 17, con: 12, int: 13, wis: 9, cha: 14 },
        anchors: { homeland: "Riverbend", landmark: "Old Mill", nemesis: "Guildmaster" },
        originZoneId: "the_gloaming",
        generationMethod: "iron_man",
      });
      expect(res.ok).toBe(true);
      player2Char1Id = res.characterId;
      const c = server.db
        .getState(1, "player", null, "", player2Token)
        .characters.find((c) => c.id === player2Char1Id)!;
      expect(c.rosterStatus).toBe("active");
    });
  });

  describe("Active / Reserve Roster Swapping & Haven/Camp Gating", () => {
    it("swaps active and reserve characters in sanctuary haven", async () => {
      const swapRes = await send(player1, "roster:select_active", {
        characterId: player1Char2Id,
      });
      expect(swapRes.ok).toBe(true);
      expect(swapRes.characterId).toBe(player1Char2Id);
      expect(swapRes.rosterStatus).toBe("active");

      // Verify DB and device state
      const state = server.db.getState(1, "player", null, "", player1Token);
      expect(state.me.characterId).toBe(player1Char2Id);

      const c1 = state.characters.find((c) => c.id === player1Char1Id)!;
      const c2 = state.characters.find((c) => c.id === player1Char2Id)!;
      expect(c1.rosterStatus).toBe("reserve");
      expect(c2.rosterStatus).toBe("active");
    });

    it("prevents swapping characters owned by another player", async () => {
      const failSwap = await send(player1, "roster:select_active", {
        characterId: player2Char1Id,
      });
      expect(failSwap.ok).toBe(false);
      expect(failSwap.error).toContain("You do not own this character");
    });

    it("forbids roster swap while in wilderness exploration without camp", async () => {
      // Change phase to exploration directly in db
      server.db.db.prepare("UPDATE campaigns SET current_phase = 'wilderness' WHERE id = 1").run();

      const failWildSwap = await send(player1, "roster:select_active", {
        characterId: player1Char1Id,
      });
      expect(failWildSwap.ok).toBe(false);
      expect(failWildSwap.error).toContain("only permitted in a haven sanctuary or during camp");
    });

    it("permits roster swap while an active camp session is open", async () => {
      // Start a camp session
      server.db.db
        .prepare(
          "INSERT INTO activity_sessions (campaign_id, kind, status) VALUES (1, 'camp', 'open')",
        )
        .run();

      const campSwap = await send(player1, "roster:select_active", {
        characterId: player1Char1Id,
      });
      expect(campSwap.ok).toBe(true);
      expect(campSwap.characterId).toBe(player1Char1Id);

      // Clean up camp session and return phase to sanctuary
      server.db.db
        .prepare("DELETE FROM activity_sessions WHERE campaign_id = 1")
        .run();
      server.db.db
        .prepare("UPDATE campaigns SET current_phase = 'sanctuary' WHERE id = 1")
        .run();
    });
  });

  describe("Exclusion of Reserve Characters from Active Duties", () => {
    it("excludes reserve characters from combat initialization", async () => {
      const combatRes = await send(host, "combat:start", {
        name: "Gloaming Ambush",
        monsters: [{ name: "Goblin Raider", hp: 6, ac: 11, morale: 7 }],
      });
      expect(combatRes.ok).toBe(true);

      const pcCombatants = combatRes.combat.combatants.filter((c: any) => c.kind === "pc");
      // Exactly 2 active PCs (player1Char1Id and player2Char1Id), player1Char2Id is reserve
      expect(pcCombatants.length).toBe(2);
      expect(pcCombatants.some((c: any) => c.refId === player1Char1Id)).toBe(true);
      expect(pcCombatants.some((c: any) => c.refId === player2Char1Id)).toBe(true);
      expect(pcCombatants.some((c: any) => c.refId === player1Char2Id)).toBe(false);

      // Clean up combat
      await send(host, "combat:end", {});
    });

    it("only consumes rations for active characters during watch advancement", () => {
      server.db.db.prepare("UPDATE campaigns SET rations = 10 WHERE id = 1").run();
      // Watch 4 advances past night to watch 1 of next day, consuming rations for active party
      server.db.db.prepare("UPDATE campaigns SET watch = 4 WHERE id = 1").run();
      server.db.advanceWatch(1);

      const camp = server.db.db.prepare("SELECT rations FROM campaigns WHERE id = 1").get() as { rations: number };
      // 10 rations minus 2 active characters = 8 rations (reserve character was not fed from expedition pool)
      expect(camp.rations).toBe(8);
    });

    it("only evaluates forced march fatigue for active characters", () => {
      // Put both characters of player 1 with 0 fatigue
      server.db.db.prepare("UPDATE characters SET fatigue = 0 WHERE campaign_id = 1").run();

      const evaluations = server.db.evaluatePartyForcedMarch(1);
      const evaluatedCharIds = evaluations.map((e) => e.characterId);

      expect(evaluatedCharIds).toContain(player1Char1Id);
      expect(evaluatedCharIds).toContain(player2Char1Id);
      expect(evaluatedCharIds).not.toContain(player1Char2Id); // Reserve excluded
    });
  });
});
