import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { io as Client, type Socket } from "socket.io-client";
import { createAshServer } from "../src/server/app.js";
import type { RegionGenerationConfig } from "../src/shared/types.js";

describe("Simulated Full Play Session: LAN Discovery to Dungeon & Combat Loop", () => {
  let server: Awaited<ReturnType<typeof createAshServer>>;
  let hostSocket: Socket;
  let playerSocket: Socket;
  let campaignCode: string;
  let hostToken: string;
  let playerToken: string;
  let campaignId = 1;
  let valeriusId: number;
  let morwenId: number;
  let targetSiteId: string;

  let actionSeq = 0;
  const nextEnvelope = () => ({
    actionId: `sim-${++actionSeq}`,
    expectedRevision: server.db.getState(campaignId, "host", null, "").campaign.revision,
  });

  const send = (socket: Socket, event: string, payload: unknown = {}): Promise<any> =>
    socket.timeout(3000).emitWithAck(event, payload);

  beforeAll(async () => {
    server = await createAshServer({
      dbPath: ":memory:",
      frontend: false,
      port: 0,
    });
    await server.listen();
    const addr = server.httpServer.address() as any;

    const config: RegionGenerationConfig = {
      selection: { mode: "single", zoneId: "the_gloaming" },
      seed: "simulated_session_seed_alpha",
    };

    const createRes = await request(server.app)
      .post("/api/campaigns")
      .send({
        name: "Gloaming Expedition",
        regionName: "The Gloaming",
        pin: "4321",
        generationConfig: config,
      });

    expect(createRes.status).toBe(201);
    campaignCode = createRes.body.code;
    hostToken = createRes.body.token;

    const joinRes = await request(server.app)
      .post("/api/campaigns/join")
      .send({ code: campaignCode });
    expect(joinRes.status).toBe(200);
    playerToken = joinRes.body.token;

    hostSocket = Client(`http://localhost:${addr.port}`, {
      auth: { code: campaignCode, token: hostToken, role: "host" },
    });
    await new Promise<void>((resolve) => hostSocket.on("connect", () => resolve()));

    playerSocket = Client(`http://localhost:${addr.port}`, {
      auth: { code: campaignCode, token: playerToken, role: "player" },
    });
    await new Promise<void>((resolve) => playerSocket.on("connect", () => resolve()));
  });

  afterAll(async () => {
    hostSocket?.disconnect();
    playerSocket?.disconnect();
    await server.close();
  });

  it("Step 1: Network & LAN Discovery with Custom IP QR Generation", async () => {
    // 1a. Query network interfaces endpoint
    const ifaceRes = await request(server.app).get("/api/network/interfaces");
    expect(ifaceRes.status).toBe(200);
    expect(ifaceRes.body).toHaveProperty("interfaces");
    expect(Array.isArray(ifaceRes.body.interfaces)).toBe(true);
    expect(ifaceRes.body).toHaveProperty("port");

    // 1b. Test custom LAN IP query override on QR code endpoint
    const qrRes = await request(server.app).get(
      `/api/campaigns/${campaignCode}/qr?ip=192.168.1.150`,
    );
    expect(qrRes.status).toBe(200);
    expect(qrRes.headers["content-type"]).toContain("image/png");
  });

  it("Step 2: Player Creates Active & Reserve Characters with Roster Switching", async () => {
    // 2a. Player creates Fighter "Valerius" (Active)
    const char1Res = await send(playerSocket, "character:create", {
      name: "Valerius",
      ancestry: "Human",
      className: "Fighter",
      abilities: { str: 16, dex: 13, con: 14, int: 10, wis: 10, cha: 9 },
      anchors: { homeland: "Riverlands", landmark: "Old Keep", nemesis: "Bandit Chief" },
      originZoneId: "the_gloaming",
      generationMethod: "standard",
    });
    expect(char1Res.ok).toBe(true);
    valeriusId = char1Res.characterId;

    // 2b. Player creates Wizard "Morwen" (Reserve)
    const char2Res = await send(playerSocket, "character:create", {
      name: "Morwen",
      ancestry: "Elf",
      className: "Wizard",
      abilities: { str: 8, dex: 14, con: 11, int: 17, wis: 12, cha: 12 },
      anchors: { homeland: "High Spire", landmark: "Ancient Library", nemesis: "Rival Mage" },
      originZoneId: "the_gloaming",
      generationMethod: "standard",
    });
    expect(char2Res.ok).toBe(true);
    morwenId = char2Res.characterId;

    let state = server.db.getState(campaignId, "host", null, "");
    expect(state.characters).toHaveLength(2);
    expect(state.characters.find((c) => c.id === valeriusId)?.rosterStatus).toBe("active");
    expect(state.characters.find((c) => c.id === morwenId)?.rosterStatus).toBe("reserve");

    // 2c. Player swaps active adventurer to Morwen, then back to Valerius
    const swapToMorwen = await send(playerSocket, "roster:select_active", {
      characterId: morwenId,
    });
    expect(swapToMorwen.ok).toBe(true);
    state = server.db.getState(campaignId, "host", null, "");
    expect(state.characters.find((c) => c.id === morwenId)?.rosterStatus).toBe("active");
    expect(state.characters.find((c) => c.id === valeriusId)?.rosterStatus).toBe("reserve");

    const swapBack = await send(playerSocket, "roster:select_active", {
      characterId: valeriusId,
    });
    expect(swapBack.ok).toBe(true);
    state = server.db.getState(campaignId, "host", null, "");
    expect(state.characters.find((c) => c.id === valeriusId)?.rosterStatus).toBe("active");
  });

  it("Step 3: Caller Authority Handshake and Instant Host Override", async () => {
    // 3a. Player claims Caller role
    const claimRes = await send(playerSocket, "campaign:set_caller", {
      callerToken: playerToken,
    });
    expect(claimRes.ok).toBe(true);
    expect(claimRes.callerName).toBe("Valerius");

    let state = server.db.getState(campaignId, "host", null, "");
    expect(state.campaign.callerToken).toBe(playerToken);

    // 3b. Host instantly overrides Caller authority back to Host
    const overrideRes = await send(hostSocket, "campaign:set_caller", {
      callerToken: null,
    });
    expect(overrideRes.ok).toBe(true);
    expect(overrideRes.callerName).toBe("Table Host");

    state = server.db.getState(campaignId, "host", null, "");
    expect(state.campaign.callerToken).toBeNull();

    // 3c. Player claims caller again for leading the expedition
    await send(playerSocket, "campaign:set_caller", {
      callerToken: playerToken,
    });
    state = server.db.getState(campaignId, "host", null, "");
    expect(state.campaign.callerToken).toBe(playerToken);
  });

  it("Step 4: Haven Rumors, Wilderness Expedition & Navigation Check", async () => {
    const initialState = server.db.getState(campaignId, "host", null, "");
    const tavern = initialState.campaign.tavernEstablishment;
    expect(tavern).toBeDefined();

    const lead = tavern?.leads[0];
    expect(lead).toBeDefined();
    targetSiteId = lead!.targetSiteId;

    // 4a. Caller chooses tavern rumor / objective
    const selectLeadRes = await send(playerSocket, "expedition:select_objective", {
      leadId: lead!.id,
      title: lead!.title,
      targetHexId: lead!.targetHexId,
      targetSiteId: lead!.targetSiteId,
      directionHint: lead!.directionHint,
      notes: lead!.claim,
    });
    expect(selectLeadRes.ok).toBe(true);

    // 4b. Perform navigation INT check with physical dice roll
    const navRollRes = await send(playerSocket, "roll:contextual", {
      characterId: valeriusId,
      checkType: "ability",
      ability: "int",
      dc: 12,
      diceMode: "physical",
      physicalRolls: [15],
    });
    expect(navRollRes.ok).toBe(true);

    // 4c. Travel to adjacent hex "01" using successful navigation roll
    const travelRes = await send(playerSocket, "travel:move", {
      toHexId: "01",
      mode: "foot",
      navigationRoll: 15,
      ...nextEnvelope(),
    });
    expect(travelRes.ok).toBe(true);

    const state = server.db.getState(campaignId, "host", null, "");
    expect(state.campaign.watch).toBeGreaterThan(1);
  });

  it("Step 5: Dungeon Entrance, Torches & Chamber Exploration", async () => {
    // 5a. Enter dungeon site
    const enterRes = await send(playerSocket, "site:enter", {
      siteId: targetSiteId,
      ...nextEnvelope(),
    });
    expect(enterRes.ok).toBe(true);

    let state = server.db.getState(campaignId, "host", null, "");
    expect(state.campaign.activeSiteId).toBe(targetSiteId);

    // 5b. Light torch to explore in darkness
    const torchRes = await send(playerSocket, "dungeon:light_torch", {
      ...nextEnvelope(),
    });
    expect(torchRes.ok).toBe(true);

    // 5c. Move into adjacent room if connected edge exists
    let dGraph = server.db.getDungeonGraph(campaignId);
    if (dGraph && dGraph.edges.length > 0) {
      const adjacentEdge = dGraph.edges.find(
        (e) => e.fromRoomId === dGraph!.currentRoomId || e.toRoomId === dGraph!.currentRoomId,
      );
      if (adjacentEdge) {
        const targetRoomId =
          adjacentEdge.fromRoomId === dGraph.currentRoomId
            ? adjacentEdge.toRoomId
            : adjacentEdge.fromRoomId;
        const moveRes = await send(playerSocket, "dungeon:move_room", {
          toRoomId: targetRoomId,
          ...nextEnvelope(),
        });
        expect(moveRes.ok).toBe(true);

        // Update dGraph reference
        dGraph = server.db.getDungeonGraph(campaignId)!;

        // Backtrack to entry room for safe surface exit
        await send(playerSocket, "dungeon:move_room", {
          toRoomId: dGraph.entryRoomId,
          ...nextEnvelope(),
        });
      }
    }

    // 5d. Record table ruling in the chamber
    const currentRoomId = server.db.getDungeonGraph(campaignId)?.currentRoomId ?? 1;
    const outcomeRes = await send(playerSocket, "dungeon:record_outcome", {
      roomId: currentRoomId,
      outcome: "searched",
      notes: "Valerius spotted strange runic warding upon the archway.",
      ...nextEnvelope(),
    });
    expect(outcomeRes.ok).toBe(true);
  });

  it("Step 6: Tactical Combat with Quick Damage Chips, Physical Death Save & Morale Check", async () => {
    // 6a. Host initiates combat with an Ash Ghoul
    const combatRes = await send(hostSocket, "combat:start", {
      name: "Chamber of Ash Skirmish",
      monsters: [
        {
          name: "Ash Ghoul",
          hp: 14,
          ac: 12,
          morale: 8,
        },
      ],
    });
    expect(combatRes.ok).toBe(true);
    expect(combatRes.combat).toBeDefined();

    const heroCombatant = combatRes.combat.combatants.find((c: any) => c.kind === "pc");
    const monsterCombatant = combatRes.combat.combatants.find((c: any) => c.kind === "monster");
    expect(heroCombatant).toBeDefined();
    expect(monsterCombatant).toBeDefined();

    // 6b. Hero strikes monster using Physical Dice Roll: natural 18 hits!
    const heroAtk = await send(playerSocket, "roll:contextual", {
      characterId: valeriusId,
      checkType: "melee_attack",
      diceMode: "physical",
      physicalRolls: [18],
    });
    expect(heroAtk.ok).toBe(true);

    // Hero rolls physical weapon damage: 8 damage!
    const heroDmgRoll = await send(playerSocket, "roll:contextual", {
      characterId: valeriusId,
      checkType: "damage",
      damageDice: "1d8",
      diceMode: "physical",
      physicalRolls: [8],
    });
    expect(heroDmgRoll.ok).toBe(true);

    // 6c. Host applies quick damage (-8) to the monster
    const dmgRes = await send(hostSocket, "combat:update_hp", {
      combatantId: monsterCombatant.id,
      delta: -8,
      ...nextEnvelope(),
    });
    expect(dmgRes.ok).toBe(true);

    const combatAfterDmg = server.db.getCombatState(campaignId)!;
    const updatedMonster = combatAfterDmg.combatants.find((c) => c.id === monsterCombatant.id);
    expect(updatedMonster!.currentHp).toBe(6);

    // 6d. Monster retaliates, dealing fatal damage dropping hero to 0 HP
    const monsterStrike = await send(hostSocket, "combat:update_hp", {
      combatantId: heroCombatant.id,
      delta: -15,
      ...nextEnvelope(),
    });
    expect(monsterStrike.ok).toBe(true);

    const combatAfterStrike = server.db.getCombatState(campaignId)!;
    const dyingHero = combatAfterStrike.combatants.find((c) => c.id === heroCombatant.id);
    expect(dyingHero!.currentHp).toBe(0);

    // 6e. Hero rolls Physical Dice Death Save (DC 10 CON save) -> Roll 16: STABILIZED!
    const deathSaveRes = await send(playerSocket, "roll:contextual", {
      characterId: valeriusId,
      checkType: "save",
      ability: "con",
      dc: 10,
      diceMode: "physical",
      physicalRolls: [16],
    });
    expect(deathSaveRes.ok).toBe(true);

    // Quick heal chip (+1) to revive stabilized hero
    await send(hostSocket, "combat:update_hp", {
      combatantId: heroCombatant.id,
      delta: 1,
      ...nextEnvelope(),
    });

    // 6f. Monster reaches 50% HP threshold: Host triggers Morale Check using physical 2d6 (Roll: 10 > Morale 8 -> Broken!)
    const moraleRes = await send(hostSocket, "combat:morale_check", {
      moraleScore: 8,
      diceMode: "physical",
      physicalRoll: 10,
    });
    expect(moraleRes.ok).toBe(true);
    expect(moraleRes.passed).toBe(false);
    expect(moraleRes.rollResult.total).toBe(10);

    // 6g. Defeat routed monster and end combat
    await send(hostSocket, "combat:update_hp", {
      combatantId: monsterCombatant.id,
      delta: -6,
      ...nextEnvelope(),
    });
    const endCombatRes = await send(hostSocket, "combat:end", {});
    expect(endCombatRes.ok).toBe(true);
  });

  it("Step 7: Exit Site, Table Deed, Return to Haven Sanctuary & Hero Swap", async () => {
    // 7a. Ensure party is at entry room and exit dungeon back to overworld
    const currentGraph = server.db.getDungeonGraph(campaignId);
    if (currentGraph && currentGraph.currentRoomId !== currentGraph.entryRoomId) {
      currentGraph.currentRoomId = currentGraph.entryRoomId;
      server.db.saveDungeonGraph(campaignId, currentGraph);
    }
    const exitRes = await send(playerSocket, "site:exit", {});
    expect(exitRes.ok).toBe(true);

    // 7b. Travel back to haven hex "00"
    const returnTravel = await send(playerSocket, "travel:move", {
      toHexId: "00",
      mode: "foot",
      bypassNavigation: true,
      ...nextEnvelope(),
    });
    expect(returnTravel.ok).toBe(true);

    // 7c. In haven, conclude expedition with sanctuary recovery
    const sanctuaryRes = await send(playerSocket, "session:return_sanctuary", {
      ...nextEnvelope(),
    });
    expect(sanctuaryRes.ok).toBe(true);
    expect(sanctuaryRes.returned).toBe(true);

    let state = server.db.getState(campaignId, "host", null, "");
    expect(state.campaign.phase).toBe("sanctuary");

    // 7d. Award party XP for surviving the delve
    const xpRes = await send(hostSocket, "session:award_xp", {
      amount: 10,
      ...nextEnvelope(),
    });
    expect(xpRes.ok).toBe(true);

    // 7e. In sanctuary, swap to healthy reserve hero Morwen while Valerius recovers
    const swapToReserveRes = await send(playerSocket, "roster:select_active", {
      characterId: morwenId,
    });
    expect(swapToReserveRes.ok).toBe(true);

    state = server.db.getState(campaignId, "host", null, "");
    expect(state.characters.find((c) => c.id === morwenId)?.rosterStatus).toBe("active");
    expect(state.characters.find((c) => c.id === valeriusId)?.rosterStatus).toBe("reserve");
    expect(state.characters.find((c) => c.id === valeriusId)?.level).toBe(2);
    expect(state.characters.find((c) => c.id === valeriusId)?.xp).toBe(0);
  });
});
