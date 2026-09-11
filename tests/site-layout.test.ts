import { describe, expect, it } from "vitest";
import { generateSiteLayout } from "../src/server/generators/site-layout.js";
import { populateSiteRooms } from "../src/server/room-features.js";
import { nextRetreatRoom } from "../src/shared/dungeon-route.js";

describe("ASH d6 site sections", () => {
  for (const [face, sizes] of [[1, [5, 5, 5]], [2, [5, 5, 5]], [3, [8, 5]],
    [4, [8, 5]], [5, [8, 5]], [6, [12]]] as const) {
    it(`roll ${face} creates ${sizes.join("+")} rooms with reversible links`, () => {
      const graph = generateSiteLayout(1, "site", "Test", face);
      expect(graph.siteStructure!.sections.map(s => s.roomIds.length)).toEqual(sizes);
      expect(graph.nodes).toHaveLength(sizes.reduce((sum, n) => sum + n, 0));
      expect(new Set(graph.nodes.map(n => n.id)).size).toBe(graph.nodes.length);
      expect(graph.edges.filter(e => e.transition)).toHaveLength(sizes.length - 1);
      populateSiteRooms(graph, { roll: () => 1, monster: () => ({ key: "goblin", name: "Goblin" }),
        treasure: () => ({ coins: 1, items: [] }), objective: { title: "Recover the evidence" } });
      const target = graph.nodes.find(n => n.objective)!;
      expect(graph.siteStructure!.sections.at(-1)!.roomIds).toContain(target.id);
      graph.nodes.forEach(n => { n.explored = true; });
      graph.currentRoomId = graph.nodes.at(-1)!.id;
      let steps = 0;
      while (graph.currentRoomId !== graph.entryRoomId && steps++ < graph.nodes.length) {
        const next = nextRetreatRoom(graph);
        expect(next).toBeDefined();
        graph.currentRoomId = next!;
      }
      expect(graph.currentRoomId).toBe(1);
    });
  }
  it("cannot retreat through unknown rooms or a sealed section link", () => {
    const graph = generateSiteLayout(1, "site", "Test", 1, "nearby_path");
    graph.currentRoomId = 6;
    expect(nextRetreatRoom(graph)).toBeUndefined();
    graph.nodes.forEach(n => { n.explored = true; });
    expect(nextRetreatRoom(graph)).toBe(5);
    graph.edges.find(e => e.transition)!.state = "barred";
    expect(nextRetreatRoom(graph)).toBeUndefined();
    expect(() => generateSiteLayout(1, "site", "Test", 7)).toThrow();
  });
});
