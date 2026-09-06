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
  let sequence = 0;
  const mutation = () => ({ actionId: `expedition-${++sequence}`,
    expectedRevision: server.db.getState(1, "host", null, "").campaign.revision });

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
        { toHexId: "15", mode: "foot", ...mutation() },
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
        { toHexId: "01", mode: "foot", ...mutation() },
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
    server.db.db.prepare("UPDATE encounters SET status = 'resolved' WHERE campaign_id = 1").run();
    const nightMove = await new Promise<any>((resolve) => {
      hostSocket.emit(
        "travel:move",
        { toHexId: "00", mode: "foot", ...mutation() },
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
    server.db.db.prepare("UPDATE encounters SET status = 'resolved' WHERE campaign_id = 1").run();
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
    // Isolate deed processing by placing this fixture in the generated objective room.
    const objectiveGraph = server.db.getDungeonGraph(1)!;
    objectiveGraph.currentRoomId = objectiveGraph.nodes.find((node) => node.objective?.deedId === "rescue_surveyor")!.id;
    server.db.saveDungeonGraph(1, objectiveGraph);
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
    // Earlier random travel may leave an encounter pending; resolve it before resting.
    server.db.db.prepare("UPDATE encounters SET status = 'resolved' WHERE campaign_id = 1").run();
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

  it("13. Full 4-Player Table Companion MVP End-to-End Loop", async () => {
    // 1. Create 4 core characters: Fighter, Thief, Priest, Wizard
    const fighterId = server.db.addCharacter(1, null, {
      name: "Valerius",
      ancestry: "Human",
      className: "Fighter",
      abilities: { str: 16, dex: 12, con: 14, int: 9, wis: 10, cha: 11 },
      hp: 12,
      maxHp: 12,
      gold: 50,
      inventory: [],
      notes: "Frontline vanguard",
    });
    const thiefId = server.db.addCharacter(1, null, {
      name: "Lyra",
      ancestry: "Human",
      className: "Thief",
      abilities: { str: 10, dex: 16, con: 12, int: 14, wis: 10, cha: 13 },
      hp: 8,
      maxHp: 8,
      gold: 50,
      inventory: [],
      notes: "Scout and lockpicker",
    });
    const priestId = server.db.addCharacter(1, null, {
      name: "Brother Alden",
      ancestry: "Human",
      className: "Priest",
      abilities: { str: 12, dex: 10, con: 13, int: 10, wis: 16, cha: 14 },
      hp: 9,
      maxHp: 9,
      gold: 50,
      inventory: [],
      notes: "Devout healer",
    });
    const wizardId = server.db.addCharacter(1, null, {
      name: "Morwen",
      ancestry: "Human",
      className: "Wizard",
      abilities: { str: 9, dex: 13, con: 11, int: 17, wis: 14, cha: 10 },
      hp: 6,
      maxHp: 6,
      gold: 50,
      inventory: [],
      notes: "Arcane scholar",
    });

    const initChars = server.db.getState(1, "host", null, "").characters;
    const fighter = initChars.find((c) => c.id === fighterId)!;
    const thief = initChars.find((c) => c.id === thiefId)!;
    const priest = initChars.find((c) => c.id === priestId)!;
    const wizard = initChars.find((c) => c.id === wizardId)!;

    expect(fighter.inventory && fighter.inventory.length).toBeGreaterThan(0);
    expect(fighter.ac).toBeGreaterThanOrEqual(14); // Chainmail + Shield
    expect(wizard.spells && wizard.spells.length).toBeGreaterThan(0);
    expect(priest.spells && priest.spells.length).toBeGreaterThan(0);

    // 2. Host designates Lyra (Thief) as party Caller
    const setCallerRes = await new Promise<any>((resolve) => {
      hostSocket.emit("campaign:set_caller", { callerToken: playerToken }, (ack: any) => resolve(ack));
    });
    expect(setCallerRes.ok).toBe(true);

    const callerState = server.db.getState(1, "player", null, "", playerToken);
    expect(callerState.me.isCaller).toBe(true);

    // 3. Tavern Gathering Session
    const openTavernRes = await new Promise<any>((resolve) => {
      playerSocket.emit("tavern:open", {}, (ack: any) => resolve(ack));
    });
    expect(openTavernRes.ok).toBe(true);

    await new Promise<any>((resolve) => {
      hostSocket.emit(
        "tavern:submit_choice",
        { characterId: fighter.id, activity: "carouse", costGp: 10 },
        (ack: any) => resolve(ack),
      );
    });
    await new Promise<any>((resolve) => {
      playerSocket.emit(
        "tavern:submit_choice",
        { characterId: thief.id, activity: "supplies", costGp: 5, items: ["torch", "rope_50ft"] },
        (ack: any) => resolve(ack),
      );
    });

    const resolveTavernRes = await new Promise<any>((resolve) => {
      playerSocket.emit("tavern:resolve", {}, (ack: any) => resolve(ack));
    });
    expect(resolveTavernRes.ok).toBe(true);

    const postTavernState = server.db.getState(1, "host", null, "");
    const carousedFighter = postTavernState.characters.find((c) => c.id === fighter.id)!;
    expect(carousedFighter.gold).toBe(40);
    expect(carousedFighter.xp).toBe(10);

    // 4. Camp Session
    const openCampRes = await new Promise<any>((resolve) => {
      playerSocket.emit("camp:open", {}, (ack: any) => resolve(ack));
    });
    expect(openCampRes.ok).toBe(true);

    await new Promise<any>((resolve) => {
      hostSocket.emit("camp:submit_duty", { characterId: fighter.id, duty: "watch" }, (ack: any) => resolve(ack));
    });
    await new Promise<any>((resolve) => {
      playerSocket.emit("camp:submit_duty", { characterId: thief.id, duty: "forage" }, (ack: any) => resolve(ack));
    });

    const resolveCampRes = await new Promise<any>((resolve) => {
      playerSocket.emit("camp:resolve", {}, (ack: any) => resolve(ack));
    });
    expect(resolveCampRes.ok).toBe(true);

    // 5. Enter Site & Explore Dungeon Graph
    // Move party to waterworks site coordinates
    const site = server.db.db.prepare("SELECT * FROM sites WHERE id = ?").get(waterworksSiteId) as any;
    const siteParts = site.canonical_key.split(":");
    server.db.setPartyLocation(1, { q: Number(siteParts[2]), r: Number(siteParts[3]), layerId: "surface" });

    const enterDungeonRes = await new Promise<any>((resolve) => {
      playerSocket.emit("site:enter", { siteId: waterworksSiteId }, (ack: any) => resolve(ack));
    });
    expect(enterDungeonRes.ok).toBe(true);

    const hostDungeonState = server.db.getState(1, "host", null, "");
    expect(hostDungeonState.activeDungeon).toBeDefined();
    expect(hostDungeonState.activeDungeon!.nodes.length).toBe(5);
    expect(hostDungeonState.activeDungeon!.edges.some((e) => e.doorType === "secret")).toBe(true);

    const playerDungeonState = server.db.getState(1, "player", null, playerToken);
    expect(playerDungeonState.activeDungeon!.edges.some((e) => e.doorType === "secret")).toBe(false);

    // Caller moves from room 1 to room 3 (open passage)
    const moveRes = await new Promise<any>((resolve) => {
      playerSocket.emit("dungeon:move_room", { toRoomId: 3 }, (ack: any) => resolve(ack));
    });
    expect(moveRes.ok).toBe(true);
    expect(moveRes.graph.currentRoomId).toBe(3);
    expect(moveRes.graph.explorationTurns).toBe(1);
    expect(moveRes.graph.lightTurnsRemaining).toBe(0); // no free light on site entry

    // Thief disarms trap in room 3
    // Fix the trap fixture explicitly; new sites use rolled room features.
    const trapGraph = server.db.getDungeonGraph(1)!;
    trapGraph.nodes.find((node) => node.id === 3)!.trap = {
      name: "Fixture needle", trigger: "latch", effect: "needle", dc: 12, spotted: true,
    };
    server.db.saveDungeonGraph(1, trapGraph);
    const disarmRes = await new Promise<any>((resolve) => {
      playerSocket.emit(
        "dungeon:disarm_trap",
        { roomId: 3, characterId: thief.id, diceMode: "digital" },
        (ack: any) => resolve(ack),
      );
    });
    expect(disarmRes.ok).toBe(true);

    // Caller lights torch
    const torchRes = await new Promise<any>((resolve) => {
      playerSocket.emit("dungeon:light_torch", mutation(), (ack: any) => resolve(ack));
    });
    expect(torchRes.ok).toBe(true);
    expect(torchRes.graph.lightTurnsRemaining).toBe(6);

    // 6. Combat Runner
    const startCombatRes = await new Promise<any>((resolve) => {
      playerSocket.emit(
        "combat:start",
        {
          name: "Sarcophagus Guardians",
          monsters: [{ name: "Skeletal Guardian", hp: 8, ac: 13, morale: 7 }],
        },
        (ack: any) => resolve(ack),
      );
    });
    expect(startCombatRes.ok).toBe(true);
    expect(startCombatRes.combat.combatants.length).toBeGreaterThan(0);
    expect(startCombatRes.combat.status).toBe("active");

    const nextTurnRes = await new Promise<any>((resolve) => {
      playerSocket.emit("combat:next_turn", {}, (ack: any) => resolve(ack));
    });
    expect(nextTurnRes.ok).toBe(true);

    const moraleRes = await new Promise<any>((resolve) => {
      playerSocket.emit("combat:morale_check", { moraleScore: 7 }, (ack: any) => resolve(ack));
    });
    expect(moraleRes.ok).toBe(true);

    const pcCombatant = startCombatRes.combat.combatants.find((c: any) => c.kind === "pc");
    const dmgRes = await new Promise<any>((resolve) => {
      hostSocket.emit(
        "combat:update_hp",
        { combatantId: pcCombatant.id, delta: -pcCombatant.currentHp },
        (ack: any) => resolve(ack),
      );
    });
    expect(dmgRes.ok).toBe(true);

    const deathSaveRes = await new Promise<any>((resolve) => {
      hostSocket.emit(
        "combat:death_save",
        { combatantId: pcCombatant.id, diceMode: "physical", physicalRoll: 18 },
        (ack: any) => resolve(ack),
      );
    });
    expect(deathSaveRes.ok).toBe(true);
    expect(deathSaveRes.target.stabilized).toBe(true);

    const monsterCombatant = startCombatRes.combat.combatants.find((c: any) => c.kind === "monster");
    await new Promise<any>((resolve) => {
      hostSocket.emit(
        "combat:update_hp",
        { combatantId: monsterCombatant.id, delta: -monsterCombatant.currentHp },
        (ack: any) => resolve(ack),
      );
    });

    const endCombatRes = await new Promise<any>((resolve) => {
      playerSocket.emit("combat:end", {}, (ack: any) => resolve(ack));
    });
    expect(endCombatRes.ok).toBe(true);
    expect(endCombatRes.combat.status).toBe("resolved");
    expect(endCombatRes.reward).toBeDefined();

    // 7. Treasure Allocation & Return Sanctuary
    const rewardId = endCombatRes.reward.id;

    const splitCoinsRes = await new Promise<any>((resolve) => {
      playerSocket.emit(
        "treasure:allocate",
        { rewardId, allocationType: "split_coins" },
        (ack: any) => resolve(ack),
      );
    });
    expect(splitCoinsRes.ok).toBe(true);

    const awardXpRes = await new Promise<any>((resolve) => {
      playerSocket.emit(
        "session:award_xp",
        { amount: 50, reason: "Defeating Sarcophagus Guardians", ...mutation() },
        (ack: any) => resolve(ack),
      );
    });
    expect(awardXpRes.ok).toBe(true);

    // This integration fixture sets up the return location; it is not a travel rehearsal.
    server.db.setActiveSite(1, null);
    server.db.setPartyLocation(1, { q: 0, r: 0, layerId: "surface" });
    for (const encounter of server.db.getState(1, "host", null, "").encounters) {
      server.db.db.prepare("UPDATE encounters SET status = 'resolved' WHERE id = ?").run(encounter.id);
    }
    const returnSanctuaryRes = await new Promise<any>((resolve) => {
      playerSocket.emit("session:return_sanctuary", mutation(), (ack: any) => resolve(ack));
    });
    expect(returnSanctuaryRes.ok).toBe(true);

    const sanctuaryState = server.db.getState(1, "host", null, "");
    expect(sanctuaryState.campaign.phase).toBe("sanctuary");
    const recoveredFighter = sanctuaryState.characters.find((c) => c.id === fighter.id)!;
    expect(recoveredFighter.hp).toBe(recoveredFighter.maxHp);
    expect(recoveredFighter.conditions).toEqual([]);
  });
});
