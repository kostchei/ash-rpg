import request from "supertest";
import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { io, type Socket } from "socket.io-client";
import { createAshServer } from "../src/server/app.js";
import { seedMarchingParty } from "./helpers/party.js";
import type { DungeonGraphState } from "../src/shared/types.js";

describe("Expedition mutation integrity over real sockets", () => {
  let server: Awaited<ReturnType<typeof createAshServer>>;
  let host: Socket;
  let player: Socket;
  let playerToken: string;
  let characterId: number;
  const state = () => server.db.getState(1, "host", null, "");
  const envelope = () => ({ actionId: randomUUID(), expectedRevision: state().campaign.revision });
  const send = (socket: Socket, event: string, payload: unknown): Promise<any> =>
    socket.timeout(2000).emitWithAck(event, payload);

  beforeEach(async () => {
    server = await createAshServer({ dbPath: ":memory:", frontend: false, port: 0 });
    await server.listen();
    const created = await request(server.app).post("/api/campaigns").send({
      name: "Integrity", regionName: "Gloaming", pin: "1234",
      generationConfig: { selection: { mode: "single", zoneId: "the_gloaming" }, seed: "integrity" },
    });
    const joined = await request(server.app).post("/api/campaigns/join").send({ code: created.body.code });
    playerToken = joined.body.token;
    const address = server.httpServer.address() as { port: number };
    const connect = async (token: string) => {
      const socket = io(`http://localhost:${address.port}`, { auth: {
        code: created.body.code, token, role: token === playerToken ? "player" : "host",
      } });
      await new Promise<void>((resolve, reject) => {
        socket.once("connect", resolve);
        socket.once("connect_error", reject);
      });
      return socket;
    };
    host = await connect(created.body.token);
    player = await connect(playerToken);
    characterId = server.db.addCharacter(1, playerToken, {
      name: "Torchbearer", ancestry: "Human", className: "Fighter",
      abilities: { str: 12, dex: 12, con: 12, int: 12, wis: 12, cha: 12 },
      hp: 3, maxHp: 10, gold: 5,
    });
    // A party may not leave the haven alone.
    seedMarchingParty(server.db, 1);
  });

  afterEach(async () => {
    host?.disconnect();
    player?.disconnect();
    await server.close();
  });

  // Explicit site fixture isolates resource rules from procedural generation.
  const enterFixture = () => {
    const graph: DungeonGraphState = {
      siteId: "integrity-site", campaignId: 1, currentRoomId: 1, entryRoomId: 1,
      explorationTurns: 0, lightTurnsRemaining: 0,
      nodes: [1, 2].map((id) => ({ id, title: `Room ${id}`, x: id, y: 0,
        geometry: "square", contents: "Secret contents", interaction: "",
        explored: id === 1, treasure: { coins: 20, items: [], claimed: false },
        trap: { name: "Hidden pit", trigger: "step", effect: "fall", dc: 12 },
      })), edges: [{ fromRoomId: 1, toRoomId: 2, doorType: "secret", state: "closed" }],
    };
    server.db.setActiveSite(1, graph.siteId);
    server.db.setCampaignPhase(1, "dungeon");
    server.db.saveDungeonGraph(1, graph);
  };

  it("requires the mutation envelope and caller authority", async () => {
    expect((await send(host, "session:award_xp", { amount: 10 })).ok).toBe(false);
    expect((await send(player, "session:award_xp", { amount: 10, ...envelope() })).ok).toBe(false);
    expect(state().characters[0].xp ?? 0).toBe(0);
  });

  it("replays XP once, rejects competing stale mutations, and scopes receipts by action", async () => {
    server.db.setCallerToken(1, playerToken);
    const original = { amount: 10, ...envelope() };
    const competing = { amount: 20, ...envelope() };
    const results = await Promise.all([
      send(host, "session:award_xp", original),
      send(player, "session:award_xp", competing),
    ]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    const winner = results[0].ok ? host : player;
    const payload = results[0].ok ? original : competing;
    const before = state();
    expect((await send(winner, "session:award_xp", payload)).ok).toBe(true);
    expect(state().characters[0].xp).toBe(before.characters[0].xp);
    expect(state().campaign.revision).toBe(before.campaign.revision);
    expect((await send(winner, "session:award_xp", { ...payload, amount: 999 })).ok).toBe(false);
    expect(state().characters[0].xp).toBe(before.characters[0].xp);
    // Reusing an ID for another event must not replay the XP receipt.
    expect((await send(winner, "dungeon:light_torch", payload)).ok).toBe(false);
  });

  it("replays travel without advancing time or moving twice", async () => {
    const payload = { toHexId: "01", mode: "foot", ...envelope() };
    expect((await send(host, "travel:move", payload)).ok).toBe(true);
    const before = state().campaign;
    expect((await send(host, "travel:move", payload)).ok).toBe(true);
    expect(state().campaign).toEqual(before);
  });

  it("requires the current room and claims a reward once", async () => {
    enterFixture();
    expect((await send(host, "dungeon:claim_treasure", { roomId: 2, ...envelope() })).ok).toBe(false);
    expect(server.db.getRewards(1)).toHaveLength(0);
    expect((await send(host, "dungeon:claim_treasure", { roomId: 1, ...envelope() })).ok).toBe(false);
    const access = { roomId: 1, outcome: "avoided", notes: "Distracted the guardian and used the key to open the trapped chest safely.",
      treasureAccessible: true, ...envelope() };
    expect((await send(host, "dungeon:record_outcome", access)).ok).toBe(true);
    expect((await send(host, "dungeon:record_outcome", access)).ok).toBe(true);
    const payload = { roomId: 1, ...envelope() };
    expect((await send(host, "dungeon:claim_treasure", payload)).ok).toBe(true);
    expect((await send(host, "dungeon:claim_treasure", payload)).ok).toBe(true);
    expect((await send(host, "dungeon:claim_treasure", { roomId: 1, ...envelope() })).ok).toBe(false);
    expect(server.db.getRewards(1)).toHaveLength(1);
  });

  it("consumes all three torches individually, preserves retry counts, and hides graph secrets", async () => {
    enterFixture();
    server.db.setCallerToken(1, playerToken);
    const payload = envelope();
    const first = await send(player, "dungeon:light_torch", payload);
    expect(first.ok).toBe(true);
    expect(first.graph.nodes[0].trap).toBeUndefined();
    expect(first.graph.nodes[1].treasure).toBeUndefined();
    expect(first.graph.edges).toEqual([]);
    expect((await send(player, "dungeon:light_torch", payload)).ok).toBe(true);
    expect(state().characters[0].inventory?.find((i) => i.itemId === "torches")?.remainingTorches).toBe(2);
    expect((await send(player, "dungeon:light_torch", envelope())).ok).toBe(true);
    expect((await send(player, "dungeon:light_torch", envelope())).ok).toBe(true);
    expect(state().characters[0].inventory?.some((i) => i.itemId === "torches")).toBe(false);
    const before = state().campaign.revision;
    expect((await send(player, "dungeon:light_torch", envelope())).ok).toBe(false);
    expect(state().campaign.revision).toBe(before);
  });

  it("rolls back inventory if saving light fails", async () => {
    enterFixture();
    server.db.db.exec(`CREATE TRIGGER reject_light BEFORE UPDATE ON dungeon_graphs
      BEGIN SELECT RAISE(ABORT, 'fixture failure'); END`);
    const before = state().characters[0].inventory;
    expect((await send(host, "dungeon:light_torch", envelope())).ok).toBe(false);
    expect(state().characters[0].inventory).toEqual(before);
    expect(server.db.getDungeonGraph(1)?.lightTurnsRemaining).toBe(0);
  });

  it("starts the room's actual encounter and does not grant loot merely for victory", async () => {
    enterFixture();
    const graph = server.db.getDungeonGraph(1)!;
    graph.nodes[0].encounter = { monsterKey: "goblin", name: "Coffer Guards", count: 2 };
    server.db.saveDungeonGraph(1, graph);
    expect((await send(host, "combat:start", { roomId: 2 })).ok).toBe(false);
    const started = await send(host, "combat:start", { roomId: 1 });
    expect(started.ok).toBe(true);
    expect(started.combat.combatants.filter((c: any) => c.kind === "monster")).toHaveLength(2);
    const combat = server.db.getCombatState(1)!;
    for (const combatant of combat.combatants) if (combatant.kind === "monster") combatant.currentHp = 0;
    server.db.saveCombatState(1, combat);
    expect((await send(host, "combat:end", {})).reward).toBeNull();
    expect((await send(host, "combat:end", {})).ok).toBe(false);
    expect(server.db.getRewards(1)).toHaveLength(0);
    expect((await send(host, "dungeon:claim_treasure", { roomId: 1, ...envelope() })).ok).toBe(false);
    expect((await send(host, "dungeon:record_outcome", { roomId: 1, outcome: "searched",
      notes: "Searched the fallen guards, found the key and unlocked their coffer.", treasureAccessible: true, ...envelope() })).ok).toBe(true);
    expect((await send(host, "dungeon:claim_treasure", { roomId: 1, ...envelope() })).ok).toBe(true);
  });

  it("preserves penance requirements and refuses recovery during an encounter", async () => {
    const character = state().characters[0];
    server.db.updateCharacter(1, { ...character, spells: [
      { spellId: "cure_wounds", available: false, penanceRequired: true },
      { spellId: "light", available: false, penanceRequired: false },
    ] });
    const encounterId = server.db.addEncounterWithMonsters(1, "Pending trouble", []);
    expect((await send(host, "session:return_sanctuary", envelope())).ok).toBe(false);
    server.db.db.prepare("UPDATE encounters SET status = 'resolved' WHERE id = ?").run(encounterId);
    expect((await send(host, "session:return_sanctuary", envelope())).ok).toBe(true);
    expect(state().characters[0].spells).toEqual([
      { spellId: "cure_wounds", available: false, penanceRequired: true },
      { spellId: "light", available: true, penanceRequired: false },
    ]);
  });

  it("rejects wilderness, underground and in-site recovery even with sanctuary phase", async () => {
    for (const location of [{ q: 2, r: 0, layerId: "surface" }, { q: 0, r: 0, layerId: "deep" }]) {
      server.db.setPartyLocation(1, location);
      server.db.setCampaignPhase(1, "sanctuary");
      expect((await send(host, "session:return_sanctuary", envelope())).ok).toBe(false);
      expect((await send(host, "party:rest", {})).ok).toBe(false);
      expect((await send(host, "zone:exit", {})).ok).toBe(false);
    }
    server.db.setPartyLocation(1, { q: 0, r: 0, layerId: "surface" });
    enterFixture();
    expect((await send(host, "session:return_sanctuary", envelope())).ok).toBe(false);
    expect(state().characters[0].hp).toBe(3);
    server.db.setActiveSite(1, null);
    const payload = envelope();
    expect((await send(host, "session:return_sanctuary", payload)).ok).toBe(true);
    server.db.updateCharacterHp(1, characterId, 2);
    expect((await send(host, "session:return_sanctuary", payload)).ok).toBe(true);
    expect(state().characters[0].hp).toBe(2); // replay cannot heal again
  });
});
