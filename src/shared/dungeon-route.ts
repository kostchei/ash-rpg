import type { DungeonGraphState } from "./types.js";

/** One ordinary step back along known open passages; the normal move handles time and danger. */
export function nextRetreatRoom(graph: DungeonGraphState): number | undefined {
  const queue = [{ id: graph.currentRoomId, first: undefined as number | undefined }];
  const seen = new Set([graph.currentRoomId]);
  for (let i = 0; i < queue.length; i++) {
    const here = queue[i];
    if (here.id === graph.entryRoomId) return here.first;
    for (const edge of graph.edges) {
      if (edge.state !== "open") continue;
      const next = edge.fromRoomId === here.id ? edge.toRoomId : edge.toRoomId === here.id ? edge.fromRoomId : undefined;
      if (next === undefined || seen.has(next) || !graph.nodes.find(n => n.id === next)?.explored) continue;
      seen.add(next); queue.push({ id: next, first: here.first ?? next });
    }
  }
}
