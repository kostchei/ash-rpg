import { describe, expect, it, vi } from "vitest";
import type { Socket } from "socket.io-client";
import { createActionId, sendMutation } from "../src/client/mutations.js";

describe("phone mutation transport", () => {
  const fixture = () => {
    const emit = vi.fn();
    const socket = { connected: true, timeout: vi.fn(), volatile: { emit } };
    socket.timeout.mockReturnValue(socket);
    return { socket, emit, transport: socket as unknown as Socket };
  };

  it("does not queue actions while disconnected", async () => {
    const { socket, emit, transport } = fixture();
    socket.connected = false;
    await expect(sendMutation(transport, "travel:move", {})).rejects.toThrow(/Connection lost/);
    expect(emit).not.toHaveBeenCalled();
  });

  it("retries a missing acknowledgement with the identical envelope once", async () => {
    const { emit, transport } = fixture();
    const request = { actionId: "same-id", expectedRevision: 4, amount: 10 };
    emit.mockImplementationOnce((_event, _request, ack) => ack(new Error("timeout")))
      .mockImplementationOnce((_event, _request, ack) => ack(null, { ok: true, revision: 5 }));
    await expect(sendMutation(transport, "session:award_xp", request)).resolves.toMatchObject({ revision: 5 });
    expect(emit).toHaveBeenCalledTimes(2);
    expect(emit.mock.calls.every((call) => call[1] === request)).toBe(true);
  });

  it("does not retry a rules rejection and bounds timeout retries", async () => {
    const { emit, transport } = fixture();
    emit.mockImplementation((_event, _request, ack) => ack(null, { ok: false, error: "stale revision" }));
    await expect(sendMutation(transport, "travel:move", {})).rejects.toThrow("stale revision");
    expect(emit).toHaveBeenCalledTimes(1);
    emit.mockClear().mockImplementation((_event, _request, ack) => ack(new Error("timeout")));
    await expect(sendMutation(transport, "travel:move", {})).rejects.toThrow(/No confirmation/);
    expect(emit).toHaveBeenCalledTimes(2);
  });

  it("creates random IDs without requiring the HTTPS-only UUID API", () => {
    expect(createActionId()).toMatch(/^[a-f0-9]{32}$/);
    expect(createActionId()).not.toBe(createActionId());
  });
});
