import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { io as Client, type Socket } from "socket.io-client";
import { createAshServer } from "../src/server/app.js";

describe("Table Companion Features (Reduced Scope Steps 1-4)", () => {
  let server: Awaited<ReturnType<typeof createAshServer>>;
  let hostSocket: Socket;
  let callerSocket: Socket;
  let guestSocket: Socket;
  let campaignCode: string;
  let campaignId: number;
  let hostToken: string;
  let callerToken: string;
  let guestToken: string;
  let pcCharId: number;

  const playerState = () => server.db.getState(campaignId, "player", guestToken, "");
  const hostState = () => server.db.getState(campaignId, "host", null, "");

  beforeAll(async () => {
    server = await createAshServer({
      dbPath: ":memory:",
      frontend: false,
      port: 0,
    });
    await server.listen();
    const addr = server.httpServer.address() as any;

    // 1. Create campaign
    const createdRes = await request(server.app)
      .post("/api/campaigns")
      .send({
        name: "Companion Verification Campaign",
        regionName: "The Karst Valleys",
        pin: "1234",
      });
    expect(createdRes.status).toBe(201);
    campaignCode = createdRes.body.code;
    hostToken = createdRes.body.token;
    campaignId = createdRes.body.campaignId ?? 1;

    // 2. Join as caller player
    const joinCaller = await request(server.app)
      .post("/api/campaigns/join")
      .send({ code: campaignCode });
    callerToken = joinCaller.body.token;

    // 3. Join as guest player
    const joinGuest = await request(server.app)
      .post("/api/campaigns/join")
      .send({ code: campaignCode });
    guestToken = joinGuest.body.token;

    // 4. Connect sockets
    hostSocket = Client(`http://localhost:${addr.port}`, {
      auth: { code: campaignCode, token: hostToken, role: "host" },
    });
    await new Promise<void>((res) => hostSocket.on("connect", () => res()));

    callerSocket = Client(`http://localhost:${addr.port}`, {
      auth: { code: campaignCode, token: callerToken, role: "player" },
    });
    await new Promise<void>((res) => callerSocket.on("connect", () => res()));

    guestSocket = Client(`http://localhost:${addr.port}`, {
      auth: { code: campaignCode, token: guestToken, role: "player" },
    });
    await new Promise<void>((res) => guestSocket.on("connect", () => res()));

    // Create a PC for caller
    const charRes = await new Promise<any>((resolve) => {
      callerSocket.emit(
        "character:create",
        {
          name: "Bramble",
          ancestry: "Halfling",
          className: "Thief",
          abilities: { str: 10, dex: 16, con: 12, int: 12, wis: 10, cha: 12 },
          generationMethod: "iron_man",
          anchors: {
            homeland: "Shadow District",
            landmark: "Old Belfry",
            nemesis: "Guildmaster Vane",
          },
        },
        (ack: any) => resolve(ack),
      );
    });
    expect(charRes.ok).toBe(true);
    pcCharId = charRes.characterId;

    // Set caller player
    await new Promise<any>((resolve) => {
      hostSocket.emit(
        "campaign:set_caller",
        { callerToken },
        (ack: any) => resolve(ack),
      );
    });
  });

  afterAll(async () => {
    hostSocket?.disconnect();
    callerSocket?.disconnect();
    guestSocket?.disconnect();
    await server?.close();
  });

  it("seeds living world directory: facilities, NPCs, and 3 tavern leads (2 path + 1 unrelated)", () => {
    const state = playerState();

    // 1. Facilities
    expect(state.facilities).toBeDefined();
    expect(state.facilities!.length).toBeGreaterThanOrEqual(3);
    const tavern = state.facilities!.find((f) => f.kind === "tavern");
    expect(tavern).toBeDefined();
    expect(tavern!.services.length).toBeGreaterThan(0);

    // 2. NPCs
    expect(state.worldNpcs).toBeDefined();
    expect(state.worldNpcs!.length).toBeGreaterThanOrEqual(3);
    const innkeeper = state.worldNpcs!.find((n) => n.role.toLowerCase().includes("innkeeper") || n.name.includes("Gundren"));
    expect(innkeeper).toBeDefined();

    // 3. Tavern Leads
    expect(state.tavernLeads).toBeDefined();
    expect(state.tavernLeads!.length).toBe(3);
    const pathPrimary = server.db.getTavernLeads(campaignId).find((l) => l.leadType === "path_primary");
    const pathSecondary = server.db.getTavernLeads(campaignId).find((l) => l.leadType === "path_secondary");
    const unrelated = server.db.getTavernLeads(campaignId).find((l) => l.leadType === "unrelated");
    expect(pathPrimary).toBeDefined();
    expect(pathSecondary).toBeDefined();
    expect(unrelated).toBeDefined();
    expect(typeof unrelated!.isEmptySite).toBe("boolean");
  });

  it("updates NPC disposition via npc:update_disposition", async () => {
    const state = playerState();
    const targetNpc = state.worldNpcs![0];

    // Caller updates disposition to hostile
    const updateAck = await new Promise<any>((resolve) => {
      callerSocket.emit(
        "npc:update_disposition",
        { npcId: targetNpc.id, disposition: "hostile" },
        (ack: any) => resolve(ack),
      );
    });
    expect(updateAck.ok).toBe(true);

    const updatedState = playerState();
    const updatedNpc = updatedState.worldNpcs!.find((n) => n.id === targetNpc.id);
    expect(updatedNpc?.disposition).toBe("hostile");
  });

  it("manages clockwise table-seating order in combat", async () => {
    // Start combat
    const startAck = await new Promise<any>((resolve) => {
      hostSocket.emit(
        "combat:start",
        {
          name: "Goblin Ambush",
          monsters: [
            { name: "Goblin Scout", hp: 5, ac: 12, morale: 7 },
          ],
        },
        (ack: any) => resolve(ack),
      );
    });
    expect(startAck.ok).toBe(true);
    const combatants = startAck.combat.combatants;
    const pc = combatants.find((c: any) => c.kind === "pc");
    const monster = combatants.find((c: any) => c.kind === "monster");
    expect(pc).toBeDefined();
    expect(monster).toBeDefined();

    // Host updates table seating order
    const seatAck = await new Promise<any>((resolve) => {
      hostSocket.emit(
        "combat:set_seating",
        { seatingOrder: [monster.id, pc.id] },
        (ack: any) => resolve(ack),
      );
    });
    expect(seatAck.ok).toBe(true);
    expect(seatAck.combat.seatingOrder).toEqual(["monsters", pc.id]);
    expect(seatAck.combat.combatants.map((c: any) => c.id)).toEqual(combatants.map((c: any) => c.id));

    // Verify player projection receives updated seating order
    const pState = playerState();
    expect(pState.activeCombat?.seatingOrder).toEqual(["monsters", pc.id]);
  });

  it("masks monster AC until revealed via combat:reveal_ac", async () => {
    // Check player view of monster combatant
    const pStateBefore = playerState();
    const monsterBefore = pStateBefore.activeCombat?.combatants.find((c) => c.kind === "monster");
    expect(monsterBefore).toBeDefined();
    expect(monsterBefore!.acRevealed).toBe(false);
    expect(monsterBefore!.ac).toBe(0); // Masked to 0 for non-host
    expect(monsterBefore!.acHint).toBeDefined();

    // Caller reveals AC
    const revealAck = await new Promise<any>((resolve) => {
      callerSocket.emit(
        "combat:reveal_ac",
        { combatantId: monsterBefore!.id },
        (ack: any) => resolve(ack),
      );
    });
    expect(revealAck.ok).toBe(true);
    expect(revealAck.ac).toBe(12);

    // Check player view now sees actual AC
    const pStateAfter = playerState();
    const monsterAfter = pStateAfter.activeCombat?.combatants.find((c) => c.id === monsterBefore!.id);
    expect(monsterAfter!.acRevealed).toBe(true);
    expect(monsterAfter!.ac).toBe(12);

    // Clean up combat
    await new Promise<any>((resolve) => {
      hostSocket.emit("combat:end", { victor: "party" }, (ack: any) => resolve(ack));
    });
  });

  it("masks unspotted traps with sensory tells and reveals trap mechanism upon dungeon:spot_trap", async () => {
    const db = server.db;
    let graph = db.getDungeonGraph(campaignId);
    if (!graph) {
      // Enter dungeon phase with an initial site graph
      db.setCampaignPhase(campaignId, "dungeon");
      graph = {
        siteId: "test-site",
        campaignId,
        currentRoomId: 1,
        entryRoomId: 1,
        explorationTurns: 0,
        lightTurnsRemaining: 3,
        nodes: [
          {
            id: 1,
            title: "Trapped Entry Hall",
            x: 0,
            y: 0,
            geometry: "rectangle",
            contents: "Dusty flagstones",
            interaction: "Search walls",
            explored: true,
            trap: {
              name: "Scything Pendulum",
              trigger: "Tripwire across doorway",
              effect: "2d6 slashing damage",
              dc: 12,
              sensoryTell: "Faint scratch marks in the stone floor and a slight draft",
              spotted: false,
              disarmed: false,
            },
          },
        ],
        edges: [],
      };
      db.saveDungeonGraph(campaignId, graph);
    } else {
      graph.nodes[0].trap = {
        name: "Scything Pendulum",
        trigger: "Tripwire across doorway",
        effect: "2d6 slashing damage",
        dc: 12,
        sensoryTell: "Faint scratch marks in the stone floor and a slight draft",
        spotted: false,
        disarmed: false,
      };
      db.saveDungeonGraph(campaignId, graph);
    }
    db.setActiveSite(campaignId, graph.siteId);

    const testRoom = graph.nodes[0];

    // Player perspective before spotting: trap mechanism is undefined, sensoryTell is present
    const pStateBefore = playerState();
    const roomBefore = pStateBefore.activeDungeon?.nodes.find((n) => n.id === testRoom.id);
    expect(roomBefore).toBeDefined();
    expect(roomBefore!.trap).toBeUndefined(); // Masked!
    expect(roomBefore!.sensoryTell).toContain("scratch marks");

    // Spot trap via socket action
    const spotAck = await new Promise<any>((resolve) => {
      callerSocket.emit(
        "dungeon:spot_trap",
        { roomId: testRoom.id },
        (ack: any) => resolve(ack),
      );
    });
    expect(spotAck.ok).toBe(true);
    expect(spotAck.room.trap).toBeDefined();
    expect(spotAck.room.trap.name).toBe("Scything Pendulum");

    // Player perspective after spotting: trap mechanism is revealed
    const pStateAfter = playerState();
    const roomAfter = pStateAfter.activeDungeon?.nodes.find((n) => n.id === testRoom.id);
    expect(roomAfter!.trap).toBeDefined();
    expect(roomAfter!.trap?.spotted).toBe(true);
    expect(roomAfter!.trap?.name).toBe("Scything Pendulum");
  });
});