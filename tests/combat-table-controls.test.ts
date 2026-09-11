import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { io as Client, type Socket } from "socket.io-client";
import { createAshServer } from "../src/server/app.js";

describe("Combat Table Controls & Class Quick Rolls", () => {
  let server: Awaited<ReturnType<typeof createAshServer>>;
  let hostSocket: Socket;
  let callerSocket: Socket;
  let guestSocket: Socket;
  let campaignCode: string;
  let hostToken: string;
  let callerToken: string;
  let guestToken: string;
  let pcCharId: number;

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
        name: "Table Controls Campaign",
        regionName: "The Gloaming",
        pin: "1234",
      });
    expect(createdRes.status).toBe(201);
    campaignCode = createdRes.body.code;
    hostToken = createdRes.body.token;

    // 2. Join as caller player
    const joinCaller = await request(server.app)
      .post("/api/campaigns/join")
      .send({ code: campaignCode });
    callerToken = joinCaller.body.token;

    // 3. Join as non-caller guest player
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
          name: "Corvus",
          ancestry: "Human",
          className: "Thief",
          abilities: { str: 10, dex: 16, con: 12, int: 10, wis: 14, cha: 8 },
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

    // Set caller player as designated caller
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
    await server.close();
  });

  it("initiates combat encounter and manages dynamic initiative reordering", async () => {
    // Start encounter with 2 monsters
    const startRes = await new Promise<any>((resolve) => {
      hostSocket.emit(
        "combat:start",
        {
          name: "Crypt Ambush",
          monsters: [
            { name: "Ghoul", hp: 12, ac: 12, morale: 7 },
            { name: "Cultist", hp: 6, ac: 11, morale: 6 },
          ],
        },
        (ack: any) => resolve(ack),
      );
    });
    expect(startRes.ok).toBe(true);
    const combat = startRes.combat;
    expect(combat.combatants.length).toBe(3); // 1 PC + 2 monsters

    const [first, second, third] = combat.combatants;

    // Host updates the third combatant's initiative to 25 (e.g. from physical roll)
    const setInitRes = await new Promise<any>((resolve) => {
      hostSocket.emit(
        "combat:set_initiative",
        { combatantId: third.id, initiative: 25 },
        (ack: any) => resolve(ack),
      );
    });
    expect(setInitRes.ok).toBe(true);
    expect(setInitRes.combat.combatants[0].id).toBe(third.id);
    expect(setInitRes.combat.combatants[0].initiative).toBe(25);

    // Designated caller can also set initiative
    const callerSetRes = await new Promise<any>((resolve) => {
      callerSocket.emit(
        "combat:set_initiative",
        { combatantId: second.id, initiative: 30 },
        (ack: any) => resolve(ack),
      );
    });
    expect(callerSetRes.ok).toBe(true);
    expect(callerSetRes.combat.combatants[0].id).toBe(second.id);
    expect(callerSetRes.combat.combatants[0].initiative).toBe(30);

    // Non-caller player cannot set initiative
    const guestSetRes = await new Promise<any>((resolve) => {
      guestSocket.emit(
        "combat:set_initiative",
        { combatantId: first.id, initiative: 99 },
        (ack: any) => resolve(ack),
      );
    });
    expect(guestSetRes.ok).toBe(false);
  });

  it("manages combat conditions and synchronizes them to PC character record", async () => {
    const combat = server.db.getCombatState(1)!;
    const pcCombatant = combat.combatants.find((c: any) => c.kind === "pc")!;
    const monsterCombatant = combat.combatants.find((c: any) => c.kind === "monster")!;

    // Toggle condition 'blinded' onto PC
    const togglePcRes = await new Promise<any>((resolve) => {
      hostSocket.emit(
        "combat:toggle_condition",
        { combatantId: pcCombatant.id, condition: "blinded" },
        (ack: any) => resolve(ack),
      );
    });
    expect(togglePcRes.ok).toBe(true);

    const updatedCombat = server.db.getCombatState(1)!;
    const updatedPc = updatedCombat.combatants.find((c: any) => c.id === pcCombatant.id)!;
    expect(updatedPc.conditions).toContain("blinded");

    // Verify PC character in database also reflects condition
    const pcDbChar = server.db.getState(1, "host", null, "").characters.find((c) => c.id === pcCharId)!;
    expect(pcDbChar.conditions).toContain("blinded");

    // Toggle condition 'poisoned' onto Monster
    const toggleMonRes = await new Promise<any>((resolve) => {
      callerSocket.emit(
        "combat:toggle_condition",
        { combatantId: monsterCombatant.id, condition: "poisoned" },
        (ack: any) => resolve(ack),
      );
    });
    expect(toggleMonRes.ok).toBe(true);
    const monCombatant = server.db.getCombatState(1)!.combatants.find((c: any) => c.id === monsterCombatant.id)!;
    expect(monCombatant.conditions).toContain("poisoned");

    // Toggle 'blinded' off from PC
    const removePcRes = await new Promise<any>((resolve) => {
      hostSocket.emit(
        "combat:toggle_condition",
        { combatantId: pcCombatant.id, condition: "blinded" },
        (ack: any) => resolve(ack),
      );
    });
    expect(removePcRes.ok).toBe(true);
    const clearedPc = server.db.getCombatState(1)!.combatants.find((c: any) => c.id === pcCombatant.id)!;
    expect(clearedPc.conditions).not.toContain("blinded");
    const clearedDbChar = server.db.getState(1, "host", null, "").characters.find((c) => c.id === pcCharId)!;
    expect(clearedDbChar.conditions).not.toContain("blinded");

    // Non-caller cannot toggle condition
    const guestToggleRes = await new Promise<any>((resolve) => {
      guestSocket.emit(
        "combat:toggle_condition",
        { combatantId: pcCombatant.id, condition: "paralyzed" },
        (ack: any) => resolve(ack),
      );
    });
    expect(guestToggleRes.ok).toBe(false);
  });

  it("handles contextual rolls for Thief backstab, Priest turn undead, and physical dice totals", async () => {
    // 1. Backstab roll
    const backstabRes = await new Promise<any>((resolve) => {
      callerSocket.emit(
        "roll:contextual",
        {
          characterId: pcCharId,
          checkType: "backstab",
          advantageMode: "advantage",
          diceMode: "digital",
        },
        (ack: any) => resolve(ack),
      );
    });
    expect(backstabRes.ok).toBe(true);
    expect(backstabRes.label).toContain("Backstab Attack");
    expect(backstabRes.detail).toContain("Bonus damage on hit");

    // 2. Physical Backstab roll
    const physBackstab = await new Promise<any>((resolve) => {
      callerSocket.emit(
        "roll:contextual",
        {
          characterId: pcCharId,
          checkType: "backstab",
          diceMode: "physical",
          physicalRolls: [18],
        },
        (ack: any) => resolve(ack),
      );
    });
    expect(physBackstab.ok).toBe(true);
    // DEX is 16 (+3 modifier) + 2 for backstab = +5 -> 18 + 5 = 23
    expect(physBackstab.total).toBe(23);
    expect(physBackstab.detail).toContain("(Physical) 18 + 5 = 23");

    // 3. Turn Undead roll
    const turnRes = await new Promise<any>((resolve) => {
      callerSocket.emit(
        "roll:contextual",
        {
          characterId: pcCharId,
          checkType: "turn_undead",
          diceMode: "physical",
          physicalRolls: [15],
        },
        (ack: any) => resolve(ack),
      );
    });
    expect(turnRes.ok).toBe(true);
    // WIS is 14 (+2 modifier) -> 15 + 2 = 17
    expect(turnRes.total).toBe(17);
    expect(turnRes.label).toContain("Turn Undead");
    expect(turnRes.detail).toContain("Undead of HD <=");

    // 4. Damage roll (Physical total)
    const dmgRes = await new Promise<any>((resolve) => {
      callerSocket.emit(
        "roll:contextual",
        {
          characterId: pcCharId,
          checkType: "damage",
          damageDice: "2d6",
          diceMode: "physical",
          physicalRolls: [5, 4],
        },
        (ack: any) => resolve(ack),
      );
    });
    expect(dmgRes.ok).toBe(true);
    expect(dmgRes.total).toBe(9);
    expect(dmgRes.detail).toContain("Physical roll: [5, 4] = 9");

    // End combat
    const endRes = await new Promise<any>((resolve) => {
      hostSocket.emit(
        "combat:end",
        { victor: "party" },
        (ack: any) => resolve(ack),
      );
    });
    expect(endRes.ok).toBe(true);
  });
});
