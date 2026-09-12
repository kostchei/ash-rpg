import type { Socket } from "socket.io-client";
import type { RollRecord, WikiNote } from "../shared/types";

export function createActionId(): string {
  // randomUUID requires HTTPS; phones connect to the table over ordinary LAN HTTP.
  return Array.from(crypto.getRandomValues(new Uint8Array(16)),
    (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** A single bounded retry uses the original envelope, never an offline queue. */
export function sendMutation<T>(socket: Socket, event: string, request: unknown,
  retry = true): Promise<T & { revision?: number }> {
  return new Promise((resolve, reject) => {
    if (!socket.connected) {
      reject(new Error("Connection lost; check the latest state after reconnecting."));
      return;
    }
    // Reliable emit, not volatile: a mutation must survive a momentary buffer,
    // and the 8 s timeout plus the single retry below is what bounds it.
    socket.timeout(8000).emit(event, request,
      (error: Error | null, response: { ok: boolean; error?: string; revision?: number } & T) => {
        if (error) {
          if (retry && socket.connected) {
            void sendMutation<T>(socket, event, request, false).then(resolve, reject);
          } else {
            reject(new Error("No confirmation received; check the latest state before trying again."));
          }
          return;
        }
        if (!response.ok) return reject(new Error(response.error ?? "Action failed"));
        resolve(response);
      });
  });
}

/**
 * Cursor page of an append-only surface. `rolls` and `notes` are no longer carried
 * by every broadcast, so the Chronicle reads older entries on demand.
 */
function fetchPage<T>(socket: Socket, event: string, key: "rolls" | "notes",
  beforeId: number | undefined, limit: number): Promise<T[]> {
  return new Promise((resolve, reject) => {
    if (!socket.connected) {
      reject(new Error("Connection lost; check the latest state after reconnecting."));
      return;
    }
    socket.timeout(8000).emit(event, { beforeId, limit },
      (error: Error | null, response: { ok: boolean; error?: string } & Record<string, T[]>) => {
        if (error) return reject(new Error("No response; check the connection and try again."));
        if (!response.ok) return reject(new Error(response.error ?? "Failed to load older entries"));
        resolve(response[key]);
      });
  });
}

export function fetchOlderRolls(socket: Socket, beforeId?: number, limit = 50): Promise<RollRecord[]> {
  return fetchPage<RollRecord>(socket, "rolls:page", "rolls", beforeId, limit);
}

export function fetchOlderNotes(socket: Socket, beforeId?: number, limit = 50): Promise<WikiNote[]> {
  return fetchPage<WikiNote>(socket, "notes:page", "notes", beforeId, limit);
}
