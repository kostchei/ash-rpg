import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { io, type Socket } from "socket.io-client";
import { randomUUID } from "node:crypto";
import { createAshServer } from "../src/server/app.js";
import { generateSiteLayout } from "../src/server/generators/site-layout.js";
import { nextRetreatRoom } from "../src/shared/dungeon-route.js";
import { attachSiteObjectives } from "../src/server/generators/site-objectives.js";

describe("Linked site expedition", () => {
  let server: Awaited<ReturnType<typeof createAshServer>>;
  let host: Socket; let id: number; let siteId: string;
  const state = () => server.db.getState(id, "host", null, "");
  const envelope = () => ({ actionId: randomUUID(), expectedRevision: state().campaign.revision });
  const send = (event: string, payload: object = {}): Promise<any> => host.timeout(3000).emitWithAck(event, payload);
  beforeEach(async () => {
    server = await createAshServer({ dbPath: ":memory:", frontend: false, port: 0 });
    await server.listen();
    const camp = server.db.createCampaign("Site sections", "Gloaming", "1234", {
      selection: { mode: "single", zoneId: "the_gloaming" }, seed: "sections" });
    id = camp.campaignId;
    siteId = state().campaign.tavernEstablishment!.leads[0].targetSiteId;
    const site = server.db.db.prepare("SELECT canonical_key FROM sites WHERE id = ?").get(siteId) as { canonical_key: string };
    const [regionId, layerId, q, r] = site.canonical_key.split(":");
    server.db.db.prepare("UPDATE campaigns SET party_location_json = ? WHERE id = ?")
      .run(JSON.stringify({ regionId, layerId, q: Number(q), r: Number(r) }), id);
    const address = server.httpServer.address() as { port: number };
    server.db.addCharacter(id, null, { name: "Bree", ancestry: "Human", className: "Thief", level: 1,
      hp: 6, maxHp: 6, ac: 12, gold: 0, gearSlots: 10, xp: 0,
      abilities: { str: 10, dex: 14, con: 10, int: 10, wis: 10, cha: 10 },
      anchors: { homeland: "Valley", landmark: "River", nemesis: "Bandit" } });
    host = io(`http://localhost:${address.port}`, { auth: { code: camp.code, role: "host", token: camp.hostToken } });
    await new Promise<void>((resolve, reject) => { host.once("connect", resolve); host.once("connect_error", reject); });
  });
  afterEach(async () => { host?.disconnect(); await server.close(); });
  it("awards each section once, preserves evidence, and hides undiscovered objectives", async () => {
    server.db.addCharacter(id, null, { name: "Ada", ancestry: "Human", className: "Fighter", level: 1,
      hp: 8, maxHp: 8, ac: 12, gold: 0, gearSlots: 10, xp: 0,
      abilities: { str: 12, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
      anchors: { homeland: "Valley", landmark: "River", nemesis: "Bandit" } });
    const graph = generateSiteLayout(id, siteId, "Three sites", 1);
    attachSiteObjectives(graph, { pathId: "ithaqua", act: 2, seed: "award-check", discoveringLevel: 1 });
    server.db.saveDungeonGraph(id, graph);
    expect((await send("site:enter", { siteId, ...envelope() })).ok).toBe(true);
    const knowledge = server.db.getAdventurePath(id)!.progress.knowledge;
    const hidden = server.db.getState(id, "player", null, "").activeDungeon!;
    expect(hidden.siteStructure!.objectiveMode).toBeUndefined();
    expect(hidden.nodes.filter(n => !n.explored).every(n => !n.objective && !n.clues)).toBe(true);
    const objectiveRooms = graph.nodes.filter(n => n.objective);
    for (const objectiveRoom of objectiveRooms) {
      // Isolate outcome processing from movement; movement is tested separately below.
      const saved = server.db.getDungeonGraph(id)!;
      saved.currentRoomId = objectiveRoom.id;
      saved.nodes.find(n => n.id === objectiveRoom.id)!.explored = true;
      server.db.saveDungeonGraph(id, saved);
      const payload = { roomId: objectiveRoom.id, outcome: "overcame", notes: "The table verified the printed completion conditions.",
        objectiveCompleted: true, ...envelope() };
      expect((await send("dungeon:record_outcome", payload)).ok).toBe(true);
      expect((await send("dungeon:record_outcome", payload)).ok).toBe(true);
      expect((await send("site:resolve_deed", { siteId, deed: objectiveRoom.objective!.deedId })).ok).toBe(true);
      const visible = server.db.getState(id, "player", null, "").activeDungeon!;
      expect(visible.nodes.find(n => n.id === objectiveRoom.id)!.objective!.generated!.nextAction).toBeTruthy();
    }
    expect(state().characters[0].xp).toBe(3);
    expect(server.db.getAdventurePath(id)!.progress.knowledge).toBe(knowledge);
    expect(server.db.getDungeonGraph(id)!.nodes.filter(n => n.objective?.completed)).toHaveLength(3);
  });
  it("persists the roll on entry and rejects re-entry teleporting", async () => {
    const request = { siteId, ...envelope() };
    expect((await send("site:enter", request)).ok).toBe(true);
    const graph = server.db.getDungeonGraph(id)!;
    expect([12, 13, 15]).toContain(graph.nodes.length);
    expect(graph.siteStructure?.roll).toBeGreaterThanOrEqual(1);
    expect((await send("site:enter", request)).ok).toBe(true);
    expect(server.db.getDungeonGraph(id)).toEqual(graph);
    expect((await send("site:enter", { siteId, ...envelope() })).ok).toBe(false);
    expect((await send("site:exit")).ok).toBe(true);
    expect((await send("site:enter", { siteId, ...envelope() })).ok).toBe(true);
    expect(server.db.getDungeonGraph(id)).toEqual(graph);
  });
  it("can stop before a descent, backtrack, camp and return without resetting the site", async () => {
    const graph = generateSiteLayout(id, siteId, "Linked caves", 1);
    graph.lightTurnsRemaining = 6;
    graph.nodes[2].treasure = { coins: 12, items: [], claimed: true };
    server.db.saveDungeonGraph(id, graph);
    expect((await send("site:enter", { siteId, ...envelope() })).ok).toBe(true);
    for (const toRoomId of [3, 4, 5]) {
      expect((await send("dungeon:move_room", { toRoomId, ...envelope() })).ok).toBe(true);
    }
    expect(server.db.getDungeonGraph(id)!.currentRoomId).toBe(5);
    expect(server.db.getDungeonGraph(id)!.nodes.find(n => n.id === 6)!.explored).toBe(false);
    expect((await send("site:exit")).ok).toBe(false);
    expect((await send("dungeon:move_room", { toRoomId: 11, ...envelope() })).ok).toBe(false);
    // Explicit choice to cross and return; no automatic section progression.
    for (const toRoomId of [6, 5]) expect((await send("dungeon:move_room", { toRoomId, ...envelope() })).ok).toBe(true);
    while (server.db.getDungeonGraph(id)!.currentRoomId !== 1) {
      const toRoomId = nextRetreatRoom(server.db.getDungeonGraph(id)!);
      expect((await send("dungeon:move_room", { toRoomId, ...envelope() })).ok).toBe(true);
    }
    const before = server.db.getDungeonGraph(id)!;
    expect(before.explorationTurns).toBe(8);
    expect(before.lightTurnsRemaining).toBe(0);
    expect((await send("site:exit")).ok).toBe(true);
    const day = state().campaign.day, watch = state().campaign.watch;
    expect((await send("expedition:camp", envelope())).ok).toBe(true);
    expect(state().campaign.day !== day || state().campaign.watch !== watch).toBe(true);
    expect((await send("site:enter", { siteId, ...envelope() })).ok).toBe(true);
    expect(server.db.getDungeonGraph(id)).toEqual(before);
    const visible = server.db.getState(id, "player", null, "").activeDungeon!;
    expect(visible.siteStructure!.roll).toBeUndefined();
    expect(visible.siteStructure!.sections.map(s => s.id)).toEqual([1, 2]);
    expect(visible.edges.some(e => e.fromRoomId === 10 && e.toRoomId === 11)).toBe(false);
  });
});
