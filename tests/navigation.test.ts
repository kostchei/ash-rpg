import request from "supertest";
import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { io, type Socket } from "socket.io-client";
import { createAshServer } from "../src/server/app.js";
import {
  isObscuringWeather,
  resolveWildernessNavigation,
} from "../src/server/rules.js";
import { HEX_DIRECTIONS } from "../src/server/frontier.js";

describe("Wilderness navigation rules (unit tests)", () => {
  it("identifies obscuring weather conditions", () => {
    expect(isObscuringWeather("Cataclysmic Storm / Gale")).toBe(true);
    expect(isObscuringWeather("Heavy Rain / Dense Fog")).toBe(true);
    expect(isObscuringWeather("Dense Mist")).toBe(true);
    expect(isObscuringWeather("Blizzard")).toBe(true);
    expect(isObscuringWeather("Overcast / Mild Breeze")).toBe(false);
    expect(isObscuringWeather("Clear Skies & Bright Sun")).toBe(false);
    expect(isObscuringWeather(undefined)).toBe(false);
  });

  it("bypasses check when travel is on a road or trail", () => {
    const result = resolveWildernessNavigation({
      watchCost: 1,
      hasRoad: true,
      weather: "Cataclysmic Storm / Gale",
      isNightTravel: true,
      partyIntMod: -2,
      currentQ: 0,
      currentR: 0,
      intendedQ: 0,
      intendedR: -1,
    });
    expect(result.checkRequired).toBe(false);
    expect(result.passed).toBe(true);
    expect(result.actualQ).toBe(0);
    expect(result.actualR).toBe(-1);
    expect(result.drifted).toBe(false);
  });

  it("calculates DCs correctly across terrain classes and condition modifiers", () => {
    // 1. Easy terrain (cost 1)
    const easyClearDay = resolveWildernessNavigation({
      watchCost: 1, currentQ: 0, currentR: 0, intendedQ: 1, intendedR: 0,
    });
    expect(easyClearDay.checkRequired).toBe(false);

    const easyNight = resolveWildernessNavigation({
      watchCost: 1, isNightTravel: true, currentQ: 0, currentR: 0, intendedQ: 1, intendedR: 0,
      forcedRoll: 9,
    });
    expect(easyNight.checkRequired).toBe(true);
    expect(easyNight.dc).toBe(9);
    expect(easyNight.passed).toBe(true);

    const easyNightFog = resolveWildernessNavigation({
      watchCost: 1, isNightTravel: true, weather: "Heavy Rain / Dense Fog",
      currentQ: 0, currentR: 0, intendedQ: 1, intendedR: 0, forcedRoll: 15,
    });
    expect(easyNightFog.dc).toBe(15);

    // 2. Moderate terrain (cost 2)
    const modClear = resolveWildernessNavigation({
      watchCost: 2, currentQ: 0, currentR: 0, intendedQ: 1, intendedR: 0, forcedRoll: 9,
    });
    expect(modClear.dc).toBe(9);

    const modFog = resolveWildernessNavigation({
      watchCost: 2, weather: "Heavy Rain / Dense Fog",
      currentQ: 0, currentR: 0, intendedQ: 1, intendedR: 0, forcedRoll: 15,
    });
    expect(modFog.dc).toBe(15);

    const modNightFog = resolveWildernessNavigation({
      watchCost: 2, isNightTravel: true, weather: "Heavy Rain / Dense Fog",
      currentQ: 0, currentR: 0, intendedQ: 1, intendedR: 0, forcedRoll: 18,
    });
    expect(modNightFog.dc).toBe(18);

    // 3. Hard terrain (cost 3)
    const hardClear = resolveWildernessNavigation({
      watchCost: 3, currentQ: 0, currentR: 0, intendedQ: 1, intendedR: 0, forcedRoll: 15,
    });
    expect(hardClear.dc).toBe(15);

    const hardNight = resolveWildernessNavigation({
      watchCost: 3, isNightTravel: true,
      currentQ: 0, currentR: 0, intendedQ: 1, intendedR: 0, forcedRoll: 18,
    });
    expect(hardNight.dc).toBe(18);
  });

  it("applies party best INT modifier and determines success or failure", () => {
    // Moderate DC 9: Roll 7 + INT Mod +2 = 9 -> Success
    const success = resolveWildernessNavigation({
      watchCost: 2,
      partyIntMod: 2,
      currentQ: 0,
      currentR: 0,
      intendedQ: 0,
      intendedR: 1,
      forcedRoll: 7,
    });
    expect(success.passed).toBe(true);
    expect(success.total).toBe(9);
    expect(success.actualQ).toBe(0);
    expect(success.actualR).toBe(1);
    expect(success.drifted).toBe(false);

    // Moderate DC 9: Roll 9 + INT Mod -1 = 8 -> Failure
    const failed = resolveWildernessNavigation({
      watchCost: 2,
      partyIntMod: -1,
      currentQ: 0,
      currentR: 0,
      intendedQ: 0,
      intendedR: 1,
      forcedRoll: 9,
      forcedDriftIndex: 0, // HEX_DIRECTIONS[0] is (0, -1) north
    });
    expect(failed.passed).toBe(false);
    expect(failed.total).toBe(8);
    expect(failed.actualQ).toBe(0);
    expect(failed.actualR).toBe(-1);
    expect(failed.drifted).toBe(true);
    expect(failed.driftDirection).toBe("north");
  });

  it("drifts to intended hex if uniform 1-in-6 roll lands on intended direction", () => {
    // Intended is (0, -1) which is index 0 (north)
    const failedLucky = resolveWildernessNavigation({
      watchCost: 2,
      partyIntMod: 0,
      currentQ: 0,
      currentR: 0,
      intendedQ: 0,
      intendedR: -1,
      forcedRoll: 1,
      forcedDriftIndex: 0, // north
    });
    expect(failedLucky.passed).toBe(false);
    expect(failedLucky.actualQ).toBe(0);
    expect(failedLucky.actualR).toBe(-1);
    expect(failedLucky.drifted).toBe(false); // arrived at intended hex by chance
  });
});

describe("Wilderness navigation over Socket.IO mutations", () => {
  let server: Awaited<ReturnType<typeof createAshServer>>;
  let host: Socket;
  let player: Socket;
  let playerToken: string;
  const state = () => server.db.getState(1, "host", null, "");
  const envelope = () => ({ actionId: randomUUID(), expectedRevision: state().campaign.revision });
  const send = (socket: Socket, event: string, payload: unknown): Promise<any> =>
    socket.timeout(2000).emitWithAck(event, payload);

  beforeEach(async () => {
    server = await createAshServer({ dbPath: ":memory:", frontend: false, port: 0 });
    await server.listen();
    const created = await request(server.app).post("/api/campaigns").send({
      name: "Navigation Campaign",
      regionName: "Gloaming",
      pin: "1234",
      generationConfig: { selection: { mode: "single", zoneId: "the_gloaming" }, seed: "nav-seed" },
    });
    const joined = await request(server.app).post("/api/campaigns/join").send({ code: created.body.code });
    playerToken = joined.body.token;

    const address = server.httpServer.address() as { port: number };
    const connect = async (token: string) => {
      const socket = io(`http://localhost:${address.port}`, {
        auth: {
          code: created.body.code,
          token,
          role: token === playerToken ? "player" : "host",
        },
      });
      await new Promise<void>((resolve, reject) => {
        socket.once("connect", resolve);
        socket.once("connect_error", reject);
      });
      return socket;
    };
    host = await connect(created.body.token);
    player = await connect(playerToken);

    // Create a Wizard with INT 16 (+3 mod)
    server.db.addCharacter(1, playerToken, {
      name: "Archmage",
      ancestry: "Human",
      className: "Wizard",
      abilities: { str: 10, dex: 10, con: 10, int: 16, wis: 10, cha: 10 },
      hp: 6,
      maxHp: 6,
      gold: 10,
    });
  });

  afterEach(async () => {
    host?.disconnect();
    player?.disconnect();
    await server.close();
  });

  const getOffRoadTarget = () => {
    const camp = server.db.db.prepare("SELECT active_region_id FROM campaigns WHERE id = 1").get() as any;
    const regionId = camp.active_region_id;
    const hexes = server.db.db
      .prepare("SELECT * FROM hexes WHERE campaign_id = 1 AND ring = 1")
      .all() as any[];
    for (const h of hexes) {
      const fromKey = `${regionId}:surface:0:0`;
      const toKey = `${regionId}:surface:${h.q}:${h.r}`;
      const conn = server.db.db
        .prepare(
          "SELECT * FROM connections WHERE region_id = ? AND ((from_key = ? AND to_key = ?) OR (to_key = ? AND from_key = ?))",
        )
        .get(regionId, fromKey, toKey, fromKey, toKey) as any;
      if (!conn || (conn.kind !== "road" && conn.kind !== "trail")) {
        return h;
      }
    }
    throw new Error("No off-road target found in ring 1");
  };

  const getRoadTarget = () => {
    const camp = server.db.db.prepare("SELECT active_region_id FROM campaigns WHERE id = 1").get() as any;
    const regionId = camp.active_region_id;
    const hexes = server.db.db
      .prepare("SELECT * FROM hexes WHERE campaign_id = 1 AND ring = 1")
      .all() as any[];
    for (const h of hexes) {
      const fromKey = `${regionId}:surface:0:0`;
      const toKey = `${regionId}:surface:${h.q}:${h.r}`;
      const conn = server.db.db
        .prepare(
          "SELECT * FROM connections WHERE region_id = ? AND ((from_key = ? AND to_key = ?) OR (to_key = ? AND from_key = ?))",
        )
        .get(regionId, fromKey, toKey, fromKey, toKey) as any;
      if (conn && (conn.kind === "road" || conn.kind === "trail")) {
        return h;
      }
    }
    return null;
  };

  it("bypasses navigation check over sockets when traveling on a road", async () => {
    const roadHex = getRoadTarget();
    if (!roadHex) return; // Skip if seed has no road out of haven

    const res = await send(host, "travel:move", {
      toHexId: roadHex.id,
      mode: "foot",
      ...envelope(),
    });

    expect(res.ok).toBe(true);
    expect(res.navigation.checkRequired).toBe(false);
    expect(res.navigation.passed).toBe(true);
    expect(res.newPartyLocation).toEqual({ q: Number(roadHex.q), r: Number(roadHex.r) });
  });

  it("uses the party's best INT modifier to pass off-road navigation", async () => {
    const target = getOffRoadTarget();

    // Off-road moderate DC 9. Wizard has +3 INT. Roll 6 + 3 = 9 -> Success
    const res = await send(host, "travel:move", {
      toHexId: target.id,
      mode: "foot",
      navigationRoll: 6,
      ...envelope(),
    });

    expect(res.ok).toBe(true);
    expect(res.navigation.checkRequired).toBe(true);
    expect(res.navigation.passed).toBe(true);
    expect(res.navigation.total).toBe(9);
    expect(res.newPartyLocation).toEqual({ q: Number(target.q), r: Number(target.r) });
    expect(state().campaign.partyLocation).toMatchObject({ q: Number(target.q), r: Number(target.r) });
  });

  it("drifts into adjacent hex on failed check and pays cost of entered hex", async () => {
    const target = getOffRoadTarget();

    // Force failure: roll 1 + 3 INT = 4 < DC 9.
    // Pick drift index distinct from target direction
    const targetDirIdx = HEX_DIRECTIONS.findIndex((d) => d.dq === Number(target.q) && d.dr === Number(target.r));
    const driftIdx = (targetDirIdx + 2) % 6;
    const expectedDir = HEX_DIRECTIONS[driftIdx];

    const res = await send(host, "travel:move", {
      toHexId: target.id,
      mode: "foot",
      navigationRoll: 1,
      driftIndex: driftIdx,
      ...envelope(),
    });

    expect(res.ok).toBe(true);
    expect(res.navigation.checkRequired).toBe(true);
    expect(res.navigation.passed).toBe(false);
    expect(res.navigation.drifted).toBe(true);
    expect(res.newPartyLocation).toEqual({ q: expectedDir.dq, r: expectedDir.dr });
    expect(state().campaign.partyLocation).toMatchObject({ q: expectedDir.dq, r: expectedDir.dr });

    // Public log does not leak failure
    const latestRoll = state().rolls[0];
    expect(latestRoll.label).toMatch(/Traveled to Hex/);
    expect(latestRoll.detail).not.toMatch(/failed|drift/i);
  });

  it("replays the exact drifted outcome without rerolling", async () => {
    const target = getOffRoadTarget();
    const targetDirIdx = HEX_DIRECTIONS.findIndex((d) => d.dq === Number(target.q) && d.dr === Number(target.r));
    const driftIdx = (targetDirIdx + 3) % 6;
    const expectedDir = HEX_DIRECTIONS[driftIdx];

    const actionEnv = envelope();
    const firstMove = await send(host, "travel:move", {
      toHexId: target.id,
      mode: "foot",
      navigationRoll: 1,
      driftIndex: driftIdx,
      ...actionEnv,
    });

    expect(firstMove.ok).toBe(true);
    expect(firstMove.newPartyLocation).toEqual({ q: expectedDir.dq, r: expectedDir.dr });

    // Replay with identical actionId and payload
    const replay = await send(host, "travel:move", {
      toHexId: target.id,
      mode: "foot",
      navigationRoll: 1,
      driftIndex: driftIdx,
      ...actionEnv,
    });

    expect(replay.ok).toBe(true);
    expect(replay.newPartyLocation).toEqual({ q: expectedDir.dq, r: expectedDir.dr });
    expect(replay.navigation.actualHexId).toBe(firstMove.navigation.actualHexId);
  });

  it("materializes uncharted hex when drift crosses the frontier", async () => {
    // Position party at edge (0, -2) on ring 2
    server.db.db
      .prepare("UPDATE campaigns SET party_location_json = ? WHERE id = 1")
      .run(JSON.stringify({ q: 0, r: -2, layerId: "surface" }));

    // Intended move to adjacent hex (0, -1) which is hex "01"
    // Drift index 0: north (dq: 0, dr: -1) -> destination is (0, -3) on ring 3 (uncharted)
    const res = await send(host, "travel:move", {
      toHexId: "01",
      mode: "foot",
      navigationRoll: 1,
      driftIndex: 0, // north -> (0, -3)
      ...envelope(),
    });

    expect(res.ok).toBe(true);
    expect(res.navigation.passed).toBe(false);
    expect(res.navigation.drifted).toBe(true);
    expect(res.newPartyLocation).toEqual({ q: 0, r: -3 });
    expect(state().campaign.partyLocation).toMatchObject({ q: 0, r: -3 });

    // Verify hex (0, -3) was promoted into the public hexes table
    const hexRow = server.db.db
      .prepare("SELECT * FROM hexes WHERE campaign_id = 1 AND q = 0 AND r = -3")
      .get() as any;
    expect(hexRow).toBeDefined();
    expect(hexRow.id).toBe(res.navigation.actualHexId);
    expect(hexRow.reveal_state).toBe("scouted");
  });
});
