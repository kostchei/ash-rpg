import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { io as Client, type Socket } from "socket.io-client";
import { createAshServer } from "../src/server/app.js";
import { AshDatabase } from "../src/server/database.js";
import type { RegionGenerationConfig } from "../src/shared/types.js";

describe("Complete Expedition Loop & Adventure Path Integration", () => {
  let server: Awaited<ReturnType<typeof createAshServer>>;
  let hostSocket: Socket;
  let playerSocket: Socket;
  let campaignCode: string;
  let hostToken: string;
  let playerToken: string;
  let waterworksSiteId: string;
  let waterworksHexId: string;

  beforeAll(async () => {
    server = await createAshServer({
      dbPath: ":memory:",
      frontend: false,
      port: 0,
    });
    await server.listen();
    const addr = server.httpServer.address() as any;

    // 1. Create a campaign with procedural generation
    const config: RegionGenerationConfig = {
      selection: { mode: "single", zoneId: "the_gloaming" },
      seed: "expedition_full_loop_seed",
    };
    const createdRes = await request(server.app)
      .post("/api/campaigns")
      .send({
        name: "Expedition Company",
        regionName: "The Gloaming",
        pin: "5678",
        generationConfig: config,
      });

    expect(createdRes.status).toBe(201);
    campaignCode = createdRes.body.code;
    hostToken = createdRes.body.token;

    // Join as player
    const joinRes = await request(server.app)
      .post("/api/campaigns/join")
      .send({ code: campaignCode });
    expect(joinRes.status).toBe(200);
    playerToken = joinRes.body.token;

    // Connect host socket
    hostSocket = Client(`http://localhost:${addr.port}`, {
      auth: { code: campaignCode, token: hostToken, role: "host" },
    });
    await new Promise<void>((res) => hostSocket.on("connect", () => res()));

    // Connect player socket
    playerSocket = Client(`http://localhost:${addr.port}`, {
      auth: { code: campaignCode, token: playerToken, role: "player" },
    });
    await new Promise<void>((res) => playerSocket.on("connect", () => res()));
  });

  afterAll(async () => {
    hostSocket.disconnect();
    playerSocket.disconnect();
    await server.close();
  });

  it("1. Generates haven tavern establishment with 3 grounded leads including Mind Below opening lead", async () => {
    const state = server.db.getState(1, "host", null, "");
    expect(state.campaign.tavernEstablishment).toBeDefined();
    const tavern = state.campaign.tavernEstablishment!;
    expect(tavern.name).toBeTruthy();
    expect(tavern.leads.length).toBeGreaterThanOrEqual(3);

    const pathLead = tavern.leads.find((l) => l.isPathLead);
    expect(pathLead).toBeDefined();
    expect(pathLead!.targetSiteId).toMatch(/^site_waterworks_/);
    expect(pathLead!.directionHint).toBeTruthy();
    expect(pathLead!.dangerHint).toBeTruthy();
    expect(pathLead!.preparationHint).toBeTruthy();

    waterworksSiteId = pathLead!.targetSiteId;
    waterworksHexId = pathLead!.targetHexId;
  });

  it("2. Party selects expedition objective from tavern lead", async () => {
    const tavern = server.db.getState(1, "host", null, "").campaign.tavernEstablishment!;
    const pathLead = tavern.leads.find((l) => l.isPathLead)!;

    const res = await new Promise<any>((resolve) => {
      hostSocket.emit(
        "expedition:select_objective",
        {
          leadId: pathLead.id,
          title: pathLead.title,
          targetHexId: pathLead.targetHexId,
          targetSiteId: pathLead.targetSiteId,
          directionHint: pathLead.directionHint,
          notes: pathLead.claim,
        },
        (ack: any) => resolve(ack),
      );
    });
    expect(res.ok).toBe(true);

    const updatedState = server.db.getState(1, "host", null, "");
    expect(updatedState.campaign.activeObjective).toBeDefined();
    expect(updatedState.campaign.activeObjective?.title).toBe(pathLead.title);
    expect(updatedState.campaign.activeObjective?.targetSiteId).toBe(waterworksSiteId);
  });

  it("3. Travel movement enforces geometry, preventing direct jumps to non-adjacent unconnected hexes", async () => {
    // Attempt to jump from 00 to outer ring hex 15 directly
    const invalidJump = await new Promise<any>((resolve) => {
      hostSocket.emit(
        "travel:move",
        { toHexId: "15", mode: "foot" },
        (ack: any) => resolve(ack),
      );
    });
    expect(invalidJump.ok).toBe(false);
    expect(invalidJump.error).toMatch(/non-adjacent/i);

    // Party location remains at (0, 0)
    const state = server.db.getState(1, "host", null, "");
    expect(state.campaign.partyLocation).toEqual({ q: 0, r: 0, layerId: "surface" });
  });

  it("4. Valid adjacent travel advances 4-watch clock and evaluates fatigue during forced march", async () => {
    // Create a character to track fatigue
    server.db.addCharacter(1, hostToken, {
      name: "Valerius",
      ancestry: "human",
      className: "fighter",
      level: 1,
      hp: 10,
      maxHp: 10,
      ac: 14,
      gold: 15,
      gearSlots: 10,
      abilities: { str: 14, dex: 10, con: 12, int: 10, wis: 10, cha: 10 },
      anchors: ["Protect the frontier"],
    });

    const initialWatch = server.db.getState(1, "host", null, "").campaign.watch;
    expect(initialWatch).toBe(1);

    // Travel to adjacent hex "01"
    const step1 = await new Promise<any>((resolve) => {
      hostSocket.emit(
        "travel:move",
        { toHexId: "01", mode: "foot" },
        (ack: any) => resolve(ack),
      );
    });
    expect(step1.ok).toBe(true);
    expect(step1.watches).toBeGreaterThanOrEqual(1);

    const stateAfter1 = server.db.getState(1, "host", null, "");
    expect(stateAfter1.campaign.partyLocation?.q).toBeDefined();
    expect(stateAfter1.campaign.watch).toBeGreaterThan(1);

    // Advance clock to night watch (watch 4)
    server.db.db.prepare("UPDATE campaigns SET watch = 4 WHERE id = 1").run();

    // Night travel triggers forced march CON check
    const nightMove = await new Promise<any>((resolve) => {
      hostSocket.emit(
        "travel:move",
        { toHexId: "00", mode: "foot" },
        (ack: any) => resolve(ack),
      );
    });
    expect(nightMove.ok).toBe(true);
    expect(nightMove.fatigueResults).toBeDefined();
    expect(nightMove.clock.day).toBe(2); // Wrapped to next day
    expect(nightMove.clock.watch).toBeGreaterThanOrEqual(1);
  });

  it("5. Wilderness evasion: tactical retreat resolves active encounter", async () => {
    // Manually trigger an active encounter
    server.db.addEncounterWithMonsters(1, "Ambush by Dire Wolves", [
      {
        id: 0,
        monsterKey: "wolf",
        name: "Dire Wolf",
        currentHp: 12,
        maxHp: 12,
        loreTier: 1,
      },
    ]);

    let state = server.db.getState(1, "host", null, "");
    expect(state.encounters.some((e) => e.status === "active")).toBe(true);

    const fleeRes = await new Promise<any>((resolve) => {
      hostSocket.emit("encounter:flee", {}, (ack: any) => resolve(ack));
    });
    expect(fleeRes.ok).toBe(true);

    state = server.db.getState(1, "host", null, "");
    expect(state.encounters.find((e) => e.name === "Ambush by Dire Wolves")?.status).toBe("resolved");
  });

  it("6. Local exploration: remote site discovery is rejected; in-hex searching reveals hidden site", async () => {
    // Site waterworks is located at target hex, not at haven (0,0)
    const remoteAttempt = await new Promise<any>((resolve) => {
      hostSocket.emit("site:discover", { siteId: waterworksSiteId }, (ack: any) => resolve(ack));
    });
    expect(remoteAttempt.ok).toBe(false);
    expect(remoteAttempt.error).toMatch(/without being present/i);

    // Move party to the target hex of waterworks
    const hexRow = server.db.db.prepare("SELECT q, r FROM hexes WHERE campaign_id = 1 AND id = ?").get(waterworksHexId) as any;
    server.db.setPartyLocation(1, { q: hexRow.q, r: hexRow.r, layerId: "surface" });

    // Now search the hex
    const searchRes = await new Promise<any>((resolve) => {
      hostSocket.emit("hex:search", {}, (ack: any) => resolve(ack));
    });
    expect(searchRes.ok).toBe(true);
    expect(searchRes.newlyDiscovered).toContain("Disused River Waterworks & Pumping Cistern");

    // Site is now marked discovered
    expect(server.db.isSiteDiscovered(1, waterworksSiteId)).toBe(true);
  });

  it("7. Adventure site delve: site entry binds rooms, deed resolution is idempotent and updates world state", async () => {
    // 7.1 Enter site
    const enterRes = await new Promise<any>((resolve) => {
      hostSocket.emit("site:enter", { siteId: waterworksSiteId }, (ack: any) => resolve(ack));
    });
    expect(enterRes.ok).toBe(true);

    let state = server.db.getState(1, "host", null, "");
    expect(state.campaign.phase).toBe("dungeon");
    expect(state.campaign.activeSiteId).toBe(waterworksSiteId);
    expect(state.rooms.length).toBeGreaterThanOrEqual(1);
    expect(state.rooms[0].siteId).toBe(waterworksSiteId);

    // 7.2 Generate another room inside this site
    const genRoomRes = await new Promise<any>((resolve) => {
      hostSocket.emit("dungeon:generate", {}, (ack: any) => resolve(ack));
    });
    expect(genRoomRes.ok).toBe(true);

    state = server.db.getState(1, "host", null, "");
    expect(state.rooms.length).toBe(2);
    expect(state.rooms.every((r) => r.siteId === waterworksSiteId)).toBe(true);

    // 7.3 Resolve deed: rescue_surveyor (first time)
    const deedRes1 = await new Promise<any>((resolve) => {
      hostSocket.emit(
        "site:resolve_deed",
        {
          siteId: waterworksSiteId,
          deed: "rescue_surveyor",
          details: "Surveyor Jonathan Vane rescued and living sludge siphons sabotaged.",
        },
        (ack: any) => resolve(ack),
      );
    });
    expect(deedRes1.ok).toBe(true);
    expect(deedRes1.alreadyResolved).toBe(false);

    const apAfter1 = server.db.getAdventurePath(1);
    expect(apAfter1?.resolvedDeeds).toContain("rescue_surveyor");
    expect(apAfter1?.progress.knowledge).toBe(1);
    expect(apAfter1?.toll.length).toBe(1);

    // 7.4 Idempotency test: duplicate deed resolution does NOT increment progress or duplicate toll
    const deedRes2 = await new Promise<any>((resolve) => {
      hostSocket.emit(
        "site:resolve_deed",
        {
          siteId: waterworksSiteId,
          deed: "rescue_surveyor",
          details: "Duplicate attempt",
        },
        (ack: any) => resolve(ack),
      );
    });
    expect(deedRes2.ok).toBe(true);
    expect(deedRes2.alreadyResolved).toBe(true);

    const apAfter2 = server.db.getAdventurePath(1);
    expect(apAfter2?.progress.knowledge).toBe(1); // unchanged
    expect(apAfter2?.toll.length).toBe(1); // unchanged

    // 7.5 Exit site back to overworld
    const exitRes = await new Promise<any>((resolve) => {
      hostSocket.emit("site:exit", {}, (ack: any) => resolve(ack));
    });
    expect(exitRes.ok).toBe(true);

    state = server.db.getState(1, "host", null, "");
    expect(state.campaign.phase).toBe("hexcrawl");
    expect(state.campaign.activeSiteId).toBeNull();
  });

  it("8. Re-entering site preserves existing site rooms without duplication", async () => {
    const enterRes = await new Promise<any>((resolve) => {
      hostSocket.emit("site:enter", { siteId: waterworksSiteId }, (ack: any) => resolve(ack));
    });
    expect(enterRes.ok).toBe(true);

    const state = server.db.getState(1, "host", null, "");
    expect(state.rooms.length).toBe(2); // exactly the 2 previously mapped chambers

    // Exit site again
    await new Promise<any>((resolve) => {
      hostSocket.emit("site:exit", {}, (ack: any) => resolve(ack));
    });
  });

  it("9. Return journey to sanctuary: recovery is gated by haven, clearing fatigue and resupplying", async () => {
    // Add fatigue to character
    const char = server.db.getState(1, "host", null, "").characters[0];
    server.db.updateCharacterFatigue(char.id, 2);
    server.db.updateCharacterHp(1, char.id, 4); // damaged

    // Attempting sanctuary rest while in the wild is rejected
    const wildRest = await new Promise<any>((resolve) => {
      hostSocket.emit("party:rest", {}, (ack: any) => resolve(ack));
    });
    expect(wildRest.ok).toBe(false);
    expect(wildRest.error).toMatch(/sanctuary/i);

    // Return party to haven (0, 0)
    server.db.setPartyLocation(1, { q: 0, r: 0, layerId: "surface" });
    server.db.setCampaignPhase(1, "sanctuary");

    // Now resting in sanctuary succeeds
    const havenRest = await new Promise<any>((resolve) => {
      hostSocket.emit("party:rest", {}, (ack: any) => resolve(ack));
    });
    expect(havenRest.ok).toBe(true);

    const healedState = server.db.getState(1, "host", null, "");
    const healedChar = healedState.characters[0];
    expect(healedChar.hp).toBe(healedChar.maxHp);
    expect(healedChar.fatigue).toBe(0); // fatigue cleared
    expect(healedState.campaign.rations).toBeGreaterThanOrEqual(12); // resupplied

    // Check that rescued surveyor's follow-up lead is now available in tavern
    const followUpLead = healedState.campaign.tavernEstablishment?.leads.find((l) => l.isFollowUp);
    expect(followUpLead).toBeDefined();
    expect(followUpLead?.title).toContain("Rescued Surveyor's Account");
  });

  it("10. Role-based state projection filters internal tracks for players while revealing tells", async () => {
    // Player projection
    const playerState = server.db.getState(1, "player", null, "");
    expect(playerState.campaign.adventurePath).toBeDefined();
    const playerAP = playerState.campaign.adventurePath!;
    expect(playerAP.pathId).toBe("the_mind_below");
    expect(playerAP.narrativeTells.length).toBeGreaterThan(0);
    expect(playerAP.activeSituation).toBeDefined();
    expect((playerAP as any).hostDetails).toBeUndefined(); // internal progress tracks concealed

    // Host projection
    const hostState = server.db.getState(1, "host", null, "");
    const hostAP = hostState.campaign.adventurePath!;
    expect(hostAP.hostDetails).toBeDefined();
    expect(hostAP.hostDetails?.progress.knowledge).toBe(1);
    expect(hostAP.hostDetails?.resolvedDeeds).toContain("rescue_surveyor");
  });

  it("11. Forced March: resolves night march with CON saves against fatigue when allowance is exhausted", async () => {
    // Set party to watch 3 with 3 watches traveled today (daily allowance reached)
    server.db.db
      .prepare(
        "UPDATE campaigns SET watch = 3, watches_traveled_today = 3 WHERE id = 1",
      )
      .run();

    const marchRes = await new Promise<any>((resolve) => {
      hostSocket.emit("expedition:force_march", {}, (ack: any) => resolve(ack));
    });
    expect(marchRes.ok).toBe(true);
    expect(marchRes.forcedMarch).toBe(true);
    expect(marchRes.clock.watch).toBe(4); // pushed into watch 4
    expect(marchRes.fatigueResults.length).toBeGreaterThan(0);
  });

  it("12. Make Camp: resolves evening camp, task checks, fatigue clearance, and dawn advancement", async () => {
    // Character starts fatigued
    const char = server.db.getState(1, "host", null, "").characters[0];
    server.db.updateCharacterFatigue(char.id, 1);

    const campRes = await new Promise<any>((resolve) => {
      hostSocket.emit(
        "expedition:camp_night",
        {
          tasks: [
            { characterId: char.id, task: "cook" },
          ],
        },
        (ack: any) => resolve(ack),
      );
    });
    expect(campRes.ok).toBe(true);
    expect(campRes.rested).toBe(true);
    expect(campRes.clock.watch).toBe(1); // Dawn watch
    expect(campRes.taskResults.length).toBe(1);
    expect(campRes.taskResults[0].task).toBe("cook");

    // Fatigue cleared by 1 level
    const charAfter = server.db.getState(1, "host", null, "").characters[0];
    expect(charAfter.fatigue).toBe(0);
  });
});
