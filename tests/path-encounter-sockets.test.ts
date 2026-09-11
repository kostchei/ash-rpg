import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { io, type Socket } from "socket.io-client";
import { randomUUID } from "node:crypto";
import { createAshServer } from "../src/server/app.js";

describe("Encounter panel authority and receipts", () => {
  let server: Awaited<ReturnType<typeof createAshServer>>;
  let host: Socket; let player: Socket; let campaignId: number; let playerToken: string;
  const revision = () => server.db.getState(campaignId, "host", null, "").campaign.revision;
  const envelope = () => ({ actionId: randomUUID(), expectedRevision: revision() });
  const send = (socket: Socket, event: string, payload: object = {}): Promise<any> => socket.timeout(3000).emitWithAck(event, payload);
  beforeEach(async () => {
    server = await createAshServer({ dbPath: ":memory:", frontend: false, port: 0 });
    await server.listen();
    const camp = server.db.createCampaign("Encounter sockets", "Coast", "1234", { selection: { mode: "single", zoneId: "the_gloaming" }, legacy: true });
    campaignId = camp.campaignId;
    playerToken = server.db.joinCampaign(camp.code)!.token;
    const address = server.httpServer.address() as { port: number };
    const connect = async (role: "host" | "player", token: string) => {
      const socket = io(`http://localhost:${address.port}`, { auth: { code: camp.code, role, token } });
      await new Promise<void>((resolve, reject) => { socket.once("connect", resolve); socket.once("connect_error", reject); });
      return socket;
    };
    host = await connect("host", camp.hostToken); player = await connect("player", playerToken);
  });
  afterEach(async () => { host?.disconnect(); player?.disconnect(); await server.close(); });
  it("read is private and read-only; only the host chooses a pack and caller/host commit", async () => {
    const before = revision();
    expect((await send(player, "path_encounters:read")).catalogue).toEqual([]);
    expect(revision()).toBe(before);
    expect((await send(player, "path_encounters:start", { ...envelope(), pathId: "cthulhu" })).ok).toBe(false);
    expect((await send(host, "path_encounters:start", { ...envelope(), pathId: "cthulhu" })).ok).toBe(true);
    expect((await send(player, "path_encounters:interact", { ...envelope(), interactionId: "ordinary_work", outcome: "success" })).ok).toBe(false);
    server.db.setCallerToken(campaignId, playerToken);
    expect((await send(player, "path_encounters:interact", { ...envelope(), interactionId: "ordinary_work", outcome: "success" })).ok).toBe(true);
  });
  it("retries cannot duplicate materials and stale or invalid actions cannot mutate state", async () => {
    await send(host, "path_encounters:start", { ...envelope(), pathId: "ithaqua" });
    const payload = { ...envelope(), interactionId: "prepare_stores", outcome: "success" };
    const first = await send(host, "path_encounters:interact", payload);
    const repeated = await send(host, "path_encounters:interact", payload);
    expect(first.ok).toBe(true); expect(repeated.pack.assets).toEqual(first.pack.assets);
    const current = revision();
    expect((await send(host, "path_encounters:interact", { ...payload, actionId: randomUUID() })).ok).toBe(false);
    expect((await send(host, "path_encounters:interact", { ...envelope(), interactionId: "finale_b_complete", outcome: "success", notes: "Remote claim" })).ok).toBe(false);
    expect(revision()).toBe(current);
    expect((await send(host, "path_encounters:read")).pack.assets["expedition fuel"]).toBe(3);
  });
});
