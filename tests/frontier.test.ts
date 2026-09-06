import request from "supertest";
import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { io, type Socket } from "socket.io-client";
import { createAshServer } from "../src/server/app.js";
import {
  axialDistance,
  hasStructuralHex,
  materializeHex,
  materializeNeighborhood,
  neighborsOf,
} from "../src/server/frontier.js";

describe("Frontier expansion beyond the initial map", () => {
  let server: Awaited<ReturnType<typeof createAshServer>>;
  let host: Socket;
  const state = () => server.db.getState(1, "host", null, "");
  const envelope = () => ({ actionId: randomUUID(), expectedRevision: state().campaign.revision });
  const send = (socket: Socket, event: string, payload: unknown): Promise<any> =>
    socket.timeout(2000).emitWithAck(event, payload);
  const publicHexes = () =>
    server.db.db.prepare("SELECT id, q, r, ring FROM hexes WHERE campaign_id = 1").all() as Array<{
      id: string; q: number; r: number; ring: number;
    }>;
  /** Travel triggers wilderness encounters on a 1-in-6; clear them so the march can continue. */
  const clearEncounters = () => {
    for (const encounter of state().encounters) {
      if (encounter.status === "active") server.db.resolveEncounter(1, encounter.id);
    }
  };

  beforeEach(async () => {
    server = await createAshServer({ dbPath: ":memory:", frontend: false, port: 0 });
    await server.listen();
    const created = await request(server.app).post("/api/campaigns").send({
      name: "Frontier", regionName: "Gloaming", pin: "1234",
      generationConfig: { selection: { mode: "single", zoneId: "the_gloaming" }, seed: "frontier" },
    });
    const address = server.httpServer.address() as { port: number };
    host = io(`http://localhost:${address.port}`, {
      auth: { code: created.body.code, token: created.body.token, role: "host" },
    });
    await new Promise<void>((resolve, reject) => {
      host.once("connect", resolve);
      host.once("connect_error", reject);
    });
  });

  afterEach(async () => {
    host?.disconnect();
    await server.close();
  });

  it("starts with only the initial nineteen hexes public", () => {
    expect(publicHexes()).toHaveLength(19);
    expect(Math.max(...publicHexes().map((h) => h.ring))).toBe(2);
  });

  it("promotes saved structural ground rather than inventing it", () => {
    const created = materializeNeighborhood(server.db, 1, 0, -2);
    expect(created).toHaveLength(3); // (0,-3), (1,-3) and (-1,-2) lie outside the initial map

    for (const hex of created) {
      expect(axialDistance(0, 0, hex.q, hex.r)).toBe(3);
      const structural = server.db.db
        .prepare("SELECT terrain, elevation, name FROM region_hexes WHERE q = ? AND r = ?")
        .get(hex.q, hex.r) as { terrain: string; elevation: number; name: string };
      const materialized = server.db.db
        .prepare("SELECT biome, elevation, name, ring, reveal_state FROM hexes WHERE campaign_id = 1 AND id = ?")
        .get(hex.id) as { biome: string; elevation: number; name: string; ring: number; reveal_state: string };
      expect(materialized.biome).toBe(structural.terrain);
      expect(materialized.elevation).toBe(structural.elevation);
      expect(materialized.name).toBe(structural.name);
      expect(materialized.ring).toBe(3);
      expect(materialized.reveal_state).toBe("unexplored");
    }
    expect(publicHexes()).toHaveLength(22);
  });

  it("assigns stable ids and never re-charts the same ground", () => {
    const first = materializeNeighborhood(server.db, 1, 0, -2);
    expect(first.map((h) => h.id)).toEqual(["19", "20", "21"]);
    const again = materializeNeighborhood(server.db, 1, 0, -2);
    expect(again).toHaveLength(0);
    expect(publicHexes()).toHaveLength(22);

    const repeat = materializeHex(server.db, 1, first[0].q, first[0].r);
    expect(repeat).toEqual({ id: first[0].id, q: first[0].q, r: first[0].r, created: false });
  });

  it("refuses to fabricate ground beyond the generated structural field", () => {
    // Ten hexes of saved ground in every direction, so any lead within that reach is travellable.
    for (const direction of neighborsOf(0, 0)) {
      for (let step = 1; step <= 10; step++) {
        expect(hasStructuralHex(server.db, 1, direction.q * step, direction.r * step)).toBe(true);
      }
    }
    // The saved field still ends somewhere, and that edge refuses to invent ground.
    expect(hasStructuralHex(server.db, 1, 0, -20)).toBe(false);
    expect(() => materializeHex(server.db, 1, 0, -20)).toThrow(/beyond this region's generated structural field/);
    // A neighbourhood straddling the real edge charts what exists and leaves the rest uncharted.
    const edge = server.db.db
      .prepare("SELECT q, r FROM region_hexes ORDER BY (abs(q) + abs(q + r) + abs(r)) DESC LIMIT 1")
      .get() as { q: number; r: number };
    const outside = neighborsOf(edge.q, edge.r).filter((n) => !hasStructuralHex(server.db, 1, n.q, n.r));
    expect(outside.length).toBeGreaterThan(0);
    materializeNeighborhood(server.db, 1, edge.q, edge.r);
    expect(publicHexes().some((h) => h.q === edge.q && h.r === edge.r)).toBe(true);
    for (const gap of outside) {
      expect(publicHexes().some((h) => h.q === gap.q && h.r === gap.r)).toBe(false);
    }
  });

  it("charts the ring ahead of the party as it marches outward", async () => {
    expect((await send(host, "travel:move", { toHexId: "01", mode: "foot", ...envelope() })).ok).toBe(true);
    clearEncounters();
    expect(publicHexes()).toHaveLength(19); // every neighbour of ring 1 was already charted

    const outward = await send(host, "travel:move", { toHexId: "07", mode: "foot", ...envelope() });
    expect(outward.ok).toBe(true);
    expect(outward.chartedHexIds).toHaveLength(3);
    clearEncounters();

    // The party can now step onto ground the initial map never contained.
    const charted = publicHexes();
    expect(charted).toHaveLength(22);
    for (const neighbor of neighborsOf(0, -2)) {
      expect(charted.some((h) => h.q === neighbor.q && h.r === neighbor.r)).toBe(true);
    }
    const ringThree = charted.find((h) => h.ring === 3)!;
    expect((await send(host, "travel:move", { toHexId: ringThree.id, mode: "foot", ...envelope() })).ok).toBe(true);
    expect(JSON.parse(
      (server.db.db.prepare("SELECT party_location_json FROM campaigns WHERE id = 1").get() as any).party_location_json,
    )).toMatchObject({ q: ringThree.q, r: ringThree.r });
  });

  it("keeps landmarks once charted but reports site occupancy as it stands today", async () => {
    const hexWithSite = server.db.db
      .prepare(
        `SELECT h.id, h.canonical_key, h.landmark, h.biome, s.id AS site_id, s.name AS site_name
         FROM hexes h JOIN sites s ON s.canonical_key = h.canonical_key
         WHERE h.campaign_id = 1 AND s.visibility = 'visible' AND h.id != '00'`,
      )
      .get() as any;
    expect(hexWithSite).toBeDefined();
    server.db.revealHex(1, hexWithSite.id, "explored");

    const charted = () => state().hexes.find((h) => h.id === hexWithSite.id)!;
    expect(charted().landmark).toBe(hexWithSite.landmark);
    expect(charted().sites?.some((site) => site.name === hexWithSite.site_name)).toBe(true);

    // The world moves on: the site is renamed, changes hands, and a second one appears.
    server.db.db
      .prepare("UPDATE sites SET name = ?, current_state = ? WHERE id = ?")
      .run("Burned Watchpost", "razed", hexWithSite.site_id);
    server.db.db
      .prepare(
        `INSERT INTO sites (id, region_id, canonical_key, kind, name, current_state, visibility)
         SELECT 'squatters-camp', region_id, canonical_key, 'ruin', 'Squatters'' Camp', 'occupied', 'visible'
         FROM sites WHERE id = ?`,
      )
      .run(hexWithSite.site_id);

    // Terrain and landmark are permanent once observed; occupancy is not.
    expect(charted().landmark).toBe(hexWithSite.landmark);
    expect(charted().biome).toBe(hexWithSite.biome);
    const names = charted().sites!.map((site) => site.name);
    expect(names).toContain("Burned Watchpost");
    expect(names).toContain("Squatters' Camp");
    expect(names).not.toContain(hexWithSite.site_name);
  });

  it("does not chart new ground when a travel action is replayed", async () => {
    const payload = { toHexId: "01", mode: "foot", ...envelope() };
    expect((await send(host, "travel:move", payload)).ok).toBe(true);
    const after = publicHexes().length;
    expect((await send(host, "travel:move", payload)).ok).toBe(true);
    expect(publicHexes()).toHaveLength(after);
  });
});
