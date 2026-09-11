import type { DungeonGraphState } from "../../shared/types.js";

/** ASH site roll: the entire result is one saved adventure site in one hex.
 * Stairs join dungeon levels; outdoor places use short paths within that hex.
 * Transitions are ordinary reversible moves, never automatic progression.
 */
export function generateSiteLayout(campaignId: number, siteId: string, name: string,
  face: number, connection: "stairs" | "nearby_path" = "stairs"): DungeonGraphState {
  if (!Number.isInteger(face) || face < 1 || face > 6) throw new Error("Site size requires a d6 result");
  const sizes = face === 6 ? [12] : face >= 3 ? [8, 5] : [5, 5, 5];
  const graph: DungeonGraphState = { campaignId, siteId, entryRoomId: 1, currentRoomId: 1,
    explorationTurns: 0, lightTurnsRemaining: 0, nodes: [], edges: [],
    siteStructure: { roll: face, sections: [] } };
  let nextId = 1;
  sizes.forEach((count, index) => {
    const start = nextId;
    const roomIds = Array.from({ length: count }, () => nextId++);
    graph.siteStructure!.sections.push({ id: index + 1,
      size: count === 12 ? "large" : count === 8 ? "medium" : "small",
      roomIds, entryRoomId: start, endRoomId: nextId - 1 });
    for (const [offset, id] of roomIds.entries()) {
      graph.nodes.push({ id, title: `Area ${id}`, x: 100 + (offset % 4) * 160,
        y: 100 + index * 600 + Math.floor(offset / 4) * 140,
        geometry: `${name} · ${connection === "stairs" ? "Level" : "Place"} ${index + 1}`,
        contents: "", interaction: "", explored: id === 1 });
      if (offset > 0) graph.edges.push({ fromRoomId: id - 1, toRoomId: id, doorType: "open", state: "open" });
    }
    // A loop within each section offers a choice of approach and a return route.
    graph.edges.push({ fromRoomId: start, toRoomId: start + 2, doorType: "open", state: "open" });
    if (index > 0) graph.edges.push({ fromRoomId: start - 1, toRoomId: start,
      doorType: "open", state: "open", transition: connection });
  });
  return graph;
}
