import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { io, type Socket } from "socket.io-client";
import { createAshServer } from "../src/server/app.js";
import { EVENTS } from "../src/shared/protocol.js";

describe("SSE fallback transport and host presence", () => {
  let server: Awaited<ReturnType<typeof createAshServer>>;
  let address: { port: number };
  let code: string;
  let hostToken: string;
  let playerToken: string;

  beforeEach(async () => {
    server = await createAshServer({ dbPath: ":memory:", frontend: false, port: 0 });
    await server.listen();
    const camp = server.db.createCampaign("SSE sockets", "Coast", "1234", {
      selection: { mode: "single", zoneId: "the_gloaming" },
      legacy: true,
    });
    code = camp.code;
    hostToken = camp.hostToken;
    playerToken = server.db.joinCampaign(camp.code)!.token;
    address = server.httpServer.address() as { port: number };
  });

  afterEach(async () => {
    await server.close();
  });

  it("streams an initial state event over SSE and updates on mutation", async () => {
    const response = await fetch(
      `http://localhost:${address.port}/api/campaigns/${code}/stream?role=player&token=${playerToken}`,
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/event-stream");
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();

    const readEvent = async () => {
      let buffer = "";
      while (!buffer.includes("\n\n")) {
        const { value, done } = await reader.read();
        if (done) throw new Error("stream closed before an event arrived");
        buffer += decoder.decode(value, { stream: true });
      }
      return buffer;
    };

    const first = await readEvent();
    expect(first).toContain(`event: ${EVENTS.STATE}`);

    server.db.addRoll(
      server.db.getCampaign(code)!.id as number,
      { actor: "Table", kind: "campaign", label: "Test", dice: "—", total: 0, detail: "poke" },
    );

    const second = await readEvent();
    expect(second).toContain(`event: ${EVENTS.ROLL_APPENDED}`);

    await reader.cancel();
  });

  it("rejects a stream request with invalid credentials", async () => {
    const response = await fetch(
      `http://localhost:${address.port}/api/campaigns/${code}/stream?role=player&token=not-a-real-token`,
    );
    expect(response.status).toBe(403);
  });

  it("notifies players when the host disconnects and again when they reconnect", async () => {
    const connect = async (role: "host" | "player", token: string) => {
      const socket = io(`http://localhost:${address.port}`, { auth: { code, role, token } });
      await new Promise<void>((resolve, reject) => {
        socket.once("connect", resolve);
        socket.once("connect_error", reject);
      });
      return socket;
    };

    const host = await connect("host", hostToken);
    const player = await connect("player", playerToken);

    const nextPresence = () =>
      new Promise<{ hostConnected: boolean }>((resolve) => player.once(EVENTS.TABLE_PRESENCE, resolve));

    const disconnected = nextPresence();
    host.disconnect();
    await expect(disconnected).resolves.toEqual({ hostConnected: false });

    const reconnected = nextPresence();
    const hostAgain = await connect("host", hostToken);
    await expect(reconnected).resolves.toEqual({ hostConnected: true });

    hostAgain.disconnect();
    player.disconnect();
  });
});
