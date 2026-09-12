import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { io as Client, type Socket } from "socket.io-client";
import { createAshServer } from "../src/server/app.js";
import { createActionId } from "../src/client/mutations.js";
import { buildStateFromSlices, patchStateWithSlices } from "../src/shared/slices.js";
import type { CampaignState } from "../src/shared/types.js";

describe("Phase 1: Wire Payload Budget & Role-Based Projection Gate", () => {
  let server: Awaited<ReturnType<typeof createAshServer>>;
  let hostSocket: Socket;
  const playerSockets: Socket[] = [];
  let campaignId: number;
  let campaignCode: string;
  let hostToken: string;
  let playerTokens: string[] = [];

  beforeEach(async () => {
    server = await createAshServer({ dbPath: ":memory:", frontend: false, port: 0 });
    await server.listen();
    const addr = server.httpServer.address() as { port: number };

    // 1. Create a campaign
    const created = server.db.createCampaign("Gothic Mist", "The Mistwood", "1234", {
      selection: { mode: "single", zoneId: "the_gloaming" },
      legacy: true,
    });
    campaignId = created.campaignId;
    campaignCode = created.code;
    hostToken = created.hostToken;

    // 2. Populate realistic mid-session data:
    // 12 characters, 19 revealed hexes, 15 rooms, 60 rolls, 100 notes, 1 encounter
    for (let i = 1; i <= 12; i++) {
      server.db.addCharacter(campaignId, null, {
        name: `Hero ${i}`,
        ancestry: "human",
        className: i % 2 === 0 ? "Fighter" : "Wizard",
        level: 2,
        hp: 12,
        maxHp: 12,
        ac: 14,
        gold: 35,
        gearSlots: 10,
        xp: 150,
        abilities: { str: 14, dex: 12, con: 13, int: 10, wis: 10, cha: 10 },
        anchors: { homeland: "Valia", landmark: "Keep", nemesis: "Beast" },
      });
    }

    for (let i = 1; i <= 19; i++) {
      const hexId = String(i).padStart(2, "0");
      try {
        server.db.revealHex(campaignId, hexId, "scouted");
      } catch {}
    }

    for (let i = 1; i <= 60; i++) {
      server.db.addRoll(campaignId, {
        actor: "Hero 1",
        kind: "check",
        label: `Perception check #${i}`,
        dice: "1d20+2",
        total: 14,
        detail: "[12] + 2 = 14",
      });
    }

    for (let i = 1; i <= 100; i++) {
      server.db.addNote(campaignId, "Lore", `Chronicle entry #${i}`, `Detail notes for event ${i}`);
    }

    server.db.addEncounter(campaignId, "owlbear", 1);

    // 3. Connect 1 host socket + 6 player sockets (table of 7 sockets)
    hostSocket = Client(`http://localhost:${addr.port}`, {
      auth: { code: campaignCode, token: hostToken, role: "host" },
    });
    await new Promise<void>((res) => hostSocket.on("connect", () => res()));

    await new Promise<any>((resolve) => {
      hostSocket.emit(
        "combat:start",
        {
          name: "Encounter 1",
          monsters: [{ name: "Owlbear", hp: 20, ac: 13, morale: 8 }],
        },
        resolve,
      );
    });

    playerTokens = [];
    for (let p = 0; p < 6; p++) {
      const joined = server.db.joinCampaign(campaignCode);
      const token = joined?.token ?? `token-${p}`;
      playerTokens.push(token);
      const sock = Client(`http://localhost:${addr.port}`, {
        auth: { code: campaignCode, token, role: "player" },
      });
      await new Promise<void>((res) => sock.on("connect", () => res()));
      playerSockets.push(sock);
    }
  });

  afterEach(async () => {
    hostSocket?.disconnect();
    for (const sock of playerSockets) {
      sock.disconnect();
    }
    await server?.close();
  });

  it("enforces routine-mutation broadcast payload budget <= 4 kB p95 and role-based projection", async () => {
    const receivedPayloadBytes: number[] = [];
    let clientState: CampaignState | null = null;
    let initialBytes = 0;

    const addr = server.httpServer.address() as { port: number };
    const joined = server.db.joinCampaign(campaignCode);
    const testPlayerSocket = Client(`http://localhost:${addr.port}`, {
      auth: { code: campaignCode, token: joined!.token, role: "player" },
    });
    playerSockets.push(testPlayerSocket);

    testPlayerSocket.on("state", (incoming: any) => {
      const bytes = Buffer.byteLength(JSON.stringify(incoming), "utf8");
      if (!clientState) {
        initialBytes = bytes;
        clientState = buildStateFromSlices(incoming);
      } else {
        receivedPayloadBytes.push(bytes);
        clientState = patchStateWithSlices(clientState, incoming);
      }
    });

    await new Promise<void>((res) => testPlayerSocket.on("connect", () => res()));
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Initial snapshot should be compact (< 40 kB raw mid-session with living world, without full rolls/notes and static zones)
    expect(initialBytes).toBeGreaterThan(0);
    expect(initialBytes).toBeLessThan(40000);

    const initialProjections = server.metrics.projectionsComputed;
    const initialBroadcasts = server.metrics.broadcastCount;

    // Run 15 routine mutations (HP updates, torch burning, note/roll additions, etc.)
    const state = () => server.db.getState(campaignId, "host", null, "");

    for (let step = 0; step < 15; step++) {
      const envelope = {
        actionId: createActionId(),
        expectedRevision: state().campaign.revision,
      };

      const ack = await new Promise<any>((resolve) => {
        hostSocket.emit(
          "combat:update_hp",
          {
            combatantId: state().activeCombat!.combatants[0].id,
            delta: step % 2 === 0 ? -1 : 1,
            ...envelope,
          },
          (res: any) => resolve(res),
        );
      });
      expect(ack.ok).toBe(true);
      await new Promise((resolve) => setTimeout(resolve, 30));
    }

    // Assert that we captured all 15 routine broadcast payloads
    expect(receivedPayloadBytes.length).toBe(15);

    // Sort payloads to calculate p95 and p99
    receivedPayloadBytes.sort((a, b) => a - b);
    const p95Index = Math.floor(receivedPayloadBytes.length * 0.95);
    const p95 = receivedPayloadBytes[p95Index];
    const maxPayload = receivedPayloadBytes[receivedPayloadBytes.length - 1];

    // Gate requirements from §3 and §5 of Product Quality Engineering Plan:
    // - Routine-mutation broadcast payload: <= 4 kB p95, <= 16 kB p99
    console.log(
      `routine broadcast payload: p95=${p95} B, max=${maxPayload} B, initial snapshot=${initialBytes} B`,
    );
    expect(p95).toBeLessThanOrEqual(4096);
    expect(maxPayload).toBeLessThanOrEqual(16384);

    // Gate requirement: "One projection per role per broadcast"
    // For 7 sockets connected (1 host, 6 players), there are 2 roles.
    // Each broadcast computes at most 2 projections (1 host, 1 player), NOT 7 projections!
    const newBroadcasts = server.metrics.broadcastCount - initialBroadcasts;
    const newProjections = server.metrics.projectionsComputed - initialProjections;
    expect(newBroadcasts).toBe(15);
    expect(newProjections).toBeLessThanOrEqual(newBroadcasts * 2);

    // Verify client-reconstructed state matches server projection
    expect(clientState).not.toBeNull();
    expect(clientState!.campaign.revision).toBe(state().campaign.revision);
    const serverCombatant = state().activeCombat!.combatants[0];
    const clientCombatant = clientState!.activeCombat?.combatants[0];
    expect(clientCombatant?.currentHp).toBe(serverCombatant.currentHp);
    if (serverCombatant.kind === "pc") {
      const clientChar = clientState!.characters.find((c) => c.id === serverCombatant.refId);
      expect(clientChar?.hp).toBe(serverCombatant.currentHp);
    }
  });
});
