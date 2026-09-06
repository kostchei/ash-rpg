import type { Socket } from "socket.io-client";

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
    socket.timeout(8000).volatile.emit(event, request,
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
