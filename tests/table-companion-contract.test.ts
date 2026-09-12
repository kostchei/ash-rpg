import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { io, type Socket } from "socket.io-client";
import { createAshServer } from "../src/server/app.js";
import { activeSeat, weaponReference } from "../src/shared/table-companion.js";
import { generateProceduralRegion } from "../src/server/generators/procedural-region.js";
import { populateSiteRooms } from "../src/server/room-features.js";
import { ITEMS } from "../src/shared/content.js";
import type { DungeonGraphState } from "../src/shared/types.js";

describe("Physical table companion contract", () => {
  let server: Awaited<ReturnType<typeof createAshServer>>;
  let host: Socket, guest: Socket;
  let campaignId: number;
  let actionId = 0;
  const send = (event: string, payload = {}, socket = host): Promise<any> => new Promise(resolve => socket.emit(event, payload, resolve));
  const state = (role: "host" | "player" = "host") => server.db.getState(campaignId, role, null, "");
  const mutate = (event: string, payload: object) => send(event, { ...payload, actionId: `contract-${++actionId}`, expectedRevision: state().campaign.revision });
  beforeAll(async () => {
    server = await createAshServer({ dbPath: ":memory:", frontend: false, port: 0 }); await server.listen();
    const created = await request(server.app).post("/api/campaigns").send({ name: "Physical Table", regionName: "Vale", pin: "1234" });
    campaignId = created.body.campaignId ?? 1;
    const joined = await request(server.app).post("/api/campaigns/join").send({ code: created.body.code });
    const url = `http://localhost:${(server.httpServer.address() as { port: number }).port}`;
    host = io(url, { auth: { code: created.body.code, token: created.body.token, role: "host" } });
    guest = io(url, { auth: { code: created.body.code, token: joined.body.token, role: "player" } });
    await Promise.all([host, guest].map(socket => new Promise<void>(resolve => socket.on("connect", resolve))));
    for (const name of ["Alice", "Bob"]) {
      const result = await send("character:create", { name, ancestry: "Human", className: "Fighter", abilities: { str: 16, dex: 10, con: 12, int: 10, wis: 10, cha: 10 }, generationMethod: "iron_man", anchors: { homeland: "Vale", landmark: "Tower", nemesis: "Bandits" } });
      expect(result.ok).toBe(true);
    }
  });
  afterAll(async () => { host?.disconnect(); guest?.disconnect(); await server?.close(); });

  it("allows additional Iron Man heroes, limits UA per owner, and authorizes deletion", async () => {
    const input = { name: "Roster test", ancestry: "Human", className: "Fighter",
      abilities: { str: 16, dex: 12, con: 12, int: 12, wis: 12, cha: 12 },
      anchors: { homeland: "", landmark: "", nemesis: "" } };
    for (const socket of [host, guest]) {
      const ua = await send("character:create", { ...input, generationMethod: "unearthed_arcana" }, socket);
      expect(ua.ok).toBe(true);
      expect((await send("character:create", { ...input, generationMethod: "unearthed_arcana" }, socket)).ok).toBe(false);
      const reserve = await send("character:create", { ...input, generationMethod: "iron_man" }, socket);
      expect(reserve.ok).toBe(true);
      if (socket === guest) expect(state().characters.find(c => c.id === reserve.characterId)?.rosterStatus).toBe("reserve");
      if (socket === host) expect((await send("character:delete", { characterId: reserve.characterId }, guest)).ok).toBe(false);
      expect((await send("character:delete", { characterId: reserve.characterId }, socket)).ok).toBe(true);
      expect((await send("character:delete", { characterId: ua.characterId }, socket)).ok).toBe(true);
      expect(state().characters.some(c => c.id === ua.characterId || c.id === reserve.characterId)).toBe(false);
      const replacement = await send("character:create", { ...input, generationMethod: "unearthed_arcana" }, socket);
      expect(replacement.ok).toBe(true);
      expect((await send("character:delete", { characterId: replacement.characterId }, socket)).ok).toBe(true);
    }
  });

  it("keeps one monster seat, advances a complete clockwise round from a non-first winner, and preserves seating across combats", async () => {
    const start = await send("combat:start", { monsters: [{ name: "Guard", hp: 20, ac: 15 }, { name: "Scout", hp: 10, ac: 12 }] });
    expect(start.ok).toBe(true);
    const pcs = start.combat.combatants.filter((c: any) => c.kind === "pc");
    expect(start.combat.combatants.every((c: any) => c.initiative === 0)).toBe(true);
    const order = [pcs[0].id, "monsters", pcs[1].id];
    expect((await send("combat:set_seating", { seatingOrder: order })).ok).toBe(true);
    expect((await send("combat:set_seating", { seatingOrder: [pcs[0].id, pcs[0].id] })).ok).toBe(false);
    expect((await send("combat:set_winner", { seatId: pcs[1].id }, guest)).ok).toBe(false);
    expect((await send("combat:next_turn")).ok).toBe(false);
    await send("combat:set_winner", { seatId: pcs[1].id });
    let next = await send("combat:next_turn"); expect(activeSeat(next.combat)).toBe(pcs[0].id); expect(next.combat.round).toBe(1);
    next = await send("combat:next_turn"); expect(activeSeat(next.combat)).toBe("monsters"); expect(next.combat.round).toBe(1);
    next = await send("combat:next_turn"); expect(activeSeat(next.combat)).toBe(pcs[1].id); expect(next.combat.round).toBe(2);
    const updated = await send("combat:set_initiative", { combatantId: pcs[0].id, initiative: 99 });
    expect(updated.combat.seatingOrder).toEqual(order); expect(activeSeat(updated.combat)).toBe(pcs[1].id);
    await send("combat:end", { victor: "fled" });
    const restarted = await send("combat:start", { monsters: [{ name: "New guard", hp: 20, ac: 15 }, { name: "New scout", hp: 10, ac: 12 }] });
    expect(restarted.combat.seatingOrder).toEqual(order);
  });

  it("masks hosts, players, mutation acks, encounter cards, and logs until strictly below half HP", async () => {
    const monster = server.db.getCombatState(campaignId)!.combatants.find(c => c.kind === "monster")!;
    for (const role of ["host", "player"] as const) {
      const visible = state(role).activeCombat!.combatants.find(c => c.id === monster.id)!;
      expect(visible.ac).toBe(0); expect(visible.maxHp).toBe(0); expect(visible.currentHp).toBe(0);
    }
    let response = await mutate("combat:update_hp", { combatantId: monster.id, delta: -10 });
    let visible = response.combat.combatants.find((c: any) => c.id === monster.id);
    expect(visible.hpStatus).toBe("injured"); expect(visible.currentHp).toBe(0); expect(visible.maxHp).toBe(0);
    expect(state().encounters[0].monsters[0].maxHp).toBe(0);
    const log = state().rolls.find(r => r.label === `${monster.name} HP Update`)!;
    expect(log.detail).not.toContain("/20"); expect(log.detail).not.toContain("->"); expect(log.total).toBe(-10);
    response = await mutate("combat:update_hp", { combatantId: monster.id, delta: -1 });
    visible = response.combat.combatants.find((c: any) => c.id === monster.id);
    expect(visible.hpStatus).toBe("bloodied"); expect(visible.currentHp).toBe(9); expect(visible.maxHp).toBe(20);
    expect(response.combat.combatants.find((c: any) => c.kind === "monster" && c.id !== monster.id).maxHp).toBe(0);
    const revealed = await send("combat:reveal_ac", { combatantId: monster.id });
    expect(revealed.ac).toBe(15); expect(state("player").encounters[0].monsters[0].ac).toBe(15);
    await send("combat:end", { victor: "fled" });
  });

  it("binds all three leads to real distinct sites and withholds outcomes for both roles", () => {
    const leads = server.db.getTavernLeads(campaignId);
    expect(leads.filter(l => l.isPathLead)).toHaveLength(2);
    expect(new Set(leads.map(l => l.targetSiteId)).size).toBe(3);
    for (const lead of leads) {
      expect(server.db.db.prepare("SELECT 1 FROM sites WHERE id = ?").get(lead.targetSiteId)).toBeTruthy();
      expect(lead.promisedReward).toBeTruthy(); expect(lead.sourceNpc).toBeTruthy();
      expect(state().hexes.some(h => h.id === lead.targetHexId)).toBe(true);
    }
    for (const role of ["host", "player"] as const) for (const lead of state(role).tavernLeads!) {
      expect(lead.isEmptySite).toBeUndefined(); expect(lead.destinationOutcome).toBeUndefined(); expect(lead.isPathLead).toBeUndefined();
    }
  });

  it("enters an empty unrelated ruin with shelter and no encounter, trap, treasure, or path objective", async () => {
    const row = server.db.db.prepare("SELECT tavern_establishment_json FROM campaigns WHERE id = ?").get(campaignId) as any;
    const tavern = JSON.parse(row.tavern_establishment_json);
    const lead = tavern.leads.find((l: any) => !l.isPathLead);
    lead.destinationOutcome = "empty"; lead.arrivalDiscovery = "Old inscriptions, clean water, and dry shelter. No occupants or valuables remain.";
    server.db.db.prepare("UPDATE campaigns SET tavern_establishment_json = ? WHERE id = ?").run(JSON.stringify(tavern), campaignId);
    const hex = state().hexes.find(h => h.id === lead.targetHexId)!;
    server.db.setPartyLocation(campaignId, { q: hex.q, r: hex.r, layerId: "surface" });
    const entered = await mutate("site:enter", { siteId: lead.targetSiteId }); expect(entered.ok, entered.error).toBe(true);
    const graph = server.db.getDungeonGraph(campaignId)!;
    expect(graph.nodes.every(n => !n.encounter && !n.trap && !n.treasure && !n.objective)).toBe(true);
    expect(graph.nodes[0].contents).toContain("shelter");
  });

  it("exposes only tells for generated traps, rejects searching unknown rooms, and reveals mechanisms after investigation", async () => {
    const graph = server.db.getDungeonGraph(campaignId)!;
    graph.nodes = [{ id: 1, title: "Entry", x: 0, y: 0, geometry: "rectangle", explored: true, contents: "", interaction: "" }, { id: 2, title: "Hidden", x: 1, y: 0, geometry: "rectangle", explored: false, contents: "", interaction: "" }];
    graph.currentRoomId = 1;
    populateSiteRooms(graph, { roll: sides => sides === 10 ? 3 : 1, monster: () => ({ key: "goblin", name: "Goblin" }), treasure: () => ({ coins: 0, items: [] }), objective: { title: "Explore" } });
    server.db.saveDungeonGraph(campaignId, graph);
    for (const role of ["host", "player"] as const) {
      const room = state(role).activeDungeon!.nodes[0]; expect(room.trap).toBeUndefined(); expect(room.feature).toBeUndefined(); expect(room.featureRoll).toBeUndefined(); expect(room.contents).not.toContain("engineered danger"); expect(room.sensoryTell).toBeTruthy();
    }
    expect((await send("dungeon:spot_trap", { roomId: 2 })).ok).toBe(false);
    const result = await send("dungeon:spot_trap", { roomId: 1 });
    expect(result.ok).toBe(true); expect(result.room.trap.spotted).toBe(true); expect(result.room.trap.trigger).toBeTruthy();
    expect(result.graph.nodes[1].trap).toBeUndefined();
  });

  it("records NPCs at the current room, starts uncertain, and persists notes", async () => {
    const result = await send("npc:record", { name: "Iris", role: "Witness", ancestry: "Human" });
    expect(result.ok).toBe(true); expect(result.npc.disposition).toBe("uncertain"); expect(result.npc.locationType).toBe("site_room");
    await send("npc:update_disposition", { npcId: result.npc.id, disposition: "friendly", notes: "Owes a favor; offers training." });
    expect(state().worldNpcs!.find(n => n.id === result.npc.id)?.notes).toContain("training");
    expect((await send("npc:record", { name: "Intruder", role: "Spy", ancestry: "Human" }, guest)).ok).toBe(false);
  });
});

it("generates both outcomes from a deterministic fair coin without invented-site outcomes", () => {
  const outcomes = Array.from({ length: 30 }, (_, i) => generateProceduralRegion(1, { seed: `coin-${i}`, selection: { mode: "single", zoneId: "the_gloaming" } }).tavernEstablishment!.leads[2].destinationOutcome);
  expect(new Set(outcomes)).toEqual(new Set(["active", "empty"]));
});

it("uses DEX for ranged attacks and includes mastered-weapon damage", () => {
  const bow = ITEMS.find(item => item.properties?.includes("ranged"))!;
  const fighter = { className: "Fighter", level: 6, abilities: { str: 18, dex: 10 }, classChoices: { masteredWeapon: bow.id } };
  expect(weaponReference(fighter, { ...bow, itemId: bow.id, instanceId: "bow" })).toMatchObject({ attackBonus: 1, damageBonus: 3 });
});
