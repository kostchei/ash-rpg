import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { io, type Socket } from "socket.io-client";
import { randomUUID } from "node:crypto";
import { createAshServer } from "../src/server/app.js";
import { generateSiteLayout } from "../src/server/generators/site-layout.js";
import { attachSiteObjectives } from "../src/server/generators/site-objectives.js";
import { MAX_DEPARTING_PARTY } from "../src/shared/content.js";

describe("Party adjustment stage and rescued companions", () => {
  let server: Awaited<ReturnType<typeof createAshServer>>;
  let host: Socket;
  let id: number;
  let siteId: string;
  const state = () => server.db.getState(id, "host", null, "");
  const envelope = () => ({ actionId: randomUUID(), expectedRevision: state().campaign.revision });
  const send = (event: string, payload: object = {}): Promise<any> =>
    host.timeout(3000).emitWithAck(event, payload);

  const addCharacter = (name: string, className = "Fighter") =>
    server.db.addCharacter(id, null, {
      name, ancestry: "Human", className, level: 1, hp: 8, maxHp: 8, ac: 12,
      gold: 0, gearSlots: 10, xp: 0,
      abilities: { str: 12, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
      anchors: { homeland: "Valley", landmark: "River", nemesis: "Bandit" },
    });

  beforeEach(async () => {
    server = await createAshServer({ dbPath: ":memory:", frontend: false, port: 0 });
    await server.listen();
    const camp = server.db.createCampaign("Muster", "Gloaming", "1234", {
      selection: { mode: "single", zoneId: "the_gloaming" }, seed: "muster",
    });
    id = camp.campaignId;
    siteId = state().campaign.tavernEstablishment!.leads[0].targetSiteId;
    const site = server.db.db.prepare("SELECT canonical_key FROM sites WHERE id = ?")
      .get(siteId) as { canonical_key: string };
    const [regionId, layerId, q, r] = site.canonical_key.split(":");
    server.db.db.prepare("UPDATE campaigns SET party_location_json = ? WHERE id = ?")
      .run(JSON.stringify({ regionId, layerId, q: Number(q), r: Number(r) }), id);
    const address = server.httpServer.address() as { port: number };
    host = io(`http://localhost:${address.port}`, {
      auth: { code: camp.code, role: "host", token: camp.hostToken },
    });
    await new Promise<void>((resolve, reject) => {
      host.once("connect", resolve);
      host.once("connect_error", reject);
    });
  });
  afterEach(async () => { host?.disconnect(); await server.close(); });

  it("sets who marches, counts retainers, and refuses more than the cap", async () => {
    const ids = ["Ada", "Bram", "Cass", "Dov", "Esk", "Fen", "Gil"].map((n) => addCharacter(n));
    expect(ids).toHaveLength(MAX_DEPARTING_PARTY + 1);

    const tooMany = await send("party:muster", { characterIds: ids });
    expect(tooMany.ok).toBe(false);
    expect(tooMany.error).toContain("at most 6");

    const marching = ids.slice(0, MAX_DEPARTING_PARTY);
    const ok = await send("party:muster", { characterIds: marching });
    expect(ok.ok).toBe(true);
    const roster = state().characters;
    expect(roster.filter((c) => c.rosterStatus !== "reserve").map((c) => c.id)).toEqual(marching);
    expect(roster.find((c) => c.id === ids[6])!.rosterStatus).toBe("reserve");

    const tooFew = await send("party:muster", { characterIds: [ids[6]] });
    expect(tooFew.ok).toBe(false);
    expect(tooFew.error).toContain("at least 2");

    // Adjusting again is just another muster, not an additive one.
    expect((await send("party:muster", { characterIds: [ids[6], ids[0]] })).ok).toBe(true);
    expect(state().characters.filter((c) => c.rosterStatus !== "reserve").map((c) => c.id))
      .toEqual([ids[0], ids[6]]);
  });

  it("blocks leaving the haven alone", async () => {
    addCharacter("Ada");
    const home = state().campaign.homeLocation ?? { q: 0, r: 0, layerId: "surface" };
    server.db.db.prepare("UPDATE campaigns SET party_location_json = ? WHERE id = ?")
      .run(JSON.stringify(home), id);
    const neighbour = server.db.db
      .prepare("SELECT id FROM hexes WHERE campaign_id = ? AND q = ? AND r = ?")
      .get(id, home.q + 1, home.r) as { id: string } | undefined;
    if (!neighbour) throw new Error("Expected a neighbouring hex to the haven");
    const blocked = await send("travel:move", { toHexId: neighbour.id, ...envelope() });
    expect(blocked.ok).toBe(false);
    expect(blocked.error).toContain("at least 2");
  });

  it("blocks leaving the haven with an oversized party", async () => {
    for (const name of ["Ada", "Bram", "Cass", "Dov", "Esk", "Fen", "Gil"]) addCharacter(name);
    const home = state().campaign.homeLocation ?? { q: 0, r: 0, layerId: "surface" };
    server.db.db.prepare("UPDATE campaigns SET party_location_json = ? WHERE id = ?")
      .run(JSON.stringify(home), id);
    const neighbour = server.db.db
      .prepare("SELECT id FROM hexes WHERE campaign_id = ? AND q = ? AND r = ?")
      .get(id, home.q + 1, home.r) as { id: string } | undefined;
    if (!neighbour) throw new Error("Expected a neighbouring hex to the haven");
    const blocked = await send("travel:move", { toHexId: neighbour.id, ...envelope() });
    expect(blocked.ok).toBe(false);
    expect(blocked.error).toContain("at most 6");
  });

  it("takes a rescued companion into the roster with no gear, beyond the departure cap", async () => {
    for (const name of ["Ada", "Bram", "Cass", "Dov", "Esk", "Fen"]) addCharacter(name);
    // This seed places a captive in the first section; objectives are deterministic.
    const graph = generateSiteLayout(id, siteId, "Rescue site", 1);
    attachSiteObjectives(graph, { discoveringLevel: 1, pathId: "ithaqua", act: 1, seed: "muster-rescue:0" });
    const room = graph.nodes.find((n) => n.objective?.generated?.rescuedNpc);
    if (!room) throw new Error("Expected a rescue objective for seed muster-rescue:0");
    const rescued = room.objective!.generated!.rescuedNpc!;
    server.db.saveDungeonGraph(id, graph);
    expect((await send("site:enter", { siteId, ...envelope() })).ok).toBe(true);
    // Isolate the rescue from movement; movement is covered by the expedition tests.
    const entered = server.db.getDungeonGraph(id)!;
    entered.currentRoomId = room.id;
    entered.nodes.find((n) => n.id === room.id)!.explored = true;
    server.db.saveDungeonGraph(id, entered);

    const early = await send("dungeon:recruit_rescued", { roomId: room.id, ...envelope() });
    expect(early.ok).toBe(false);
    expect(early.error).toContain("Free them before");

    expect((await send("dungeon:record_outcome", {
      roomId: room.id, outcome: "negotiated", objectiveCompleted: true,
      notes: "Cut the captive loose and cleared a route back to the entrance.", ...envelope(),
    })).ok).toBe(true);

    const recruited = await send("dungeon:recruit_rescued", { roomId: room.id, ...envelope() });
    expect(recruited.ok).toBe(true);
    const joined = state().characters.find((c) => c.id === recruited.characterId)!;
    expect(joined.name).toBe(rescued.name);
    expect(joined.className).toBe(rescued.className);
    expect(joined.abilities).toEqual(rescued.abilities);
    expect(joined.generationMethod).toBe(rescued.generationMethod);
    expect(joined.inventory ?? []).toEqual([]);
    expect(joined.gold).toBe(0);
    // Seven in the company now: the cap binds at the tavern, not underground.
    expect(state().characters.length).toBe(7);

    const twice = await send("dungeon:recruit_rescued", { roomId: room.id, ...envelope() });
    expect(twice.ok).toBe(false);
    expect(twice.error).toContain("already joined");
  });
});
