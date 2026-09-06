import { describe, expect, it } from "vitest";
import { populateSiteRooms, requireTreasureAccess, roomFeature } from "../src/server/room-features.js";
import type { DungeonGraphState, DungeonRoomNode } from "../src/shared/types.js";

describe("Table room features and objective placement", () => {
  it("uses the requested d10 table exactly", () => {
    expect(Array.from({ length: 10 }, (_, index) => roomFeature(index + 1))).toEqual([
      "empty", "empty", "trap", "minor_hazard", "solo_monster", "npc",
      "monster_mob", "major_hazard", "treasure", "boss_monster",
    ]);
    expect(() => roomFeature(11)).toThrow();
  });

  it("places the objective independently even when every room is empty", () => {
    const graph: DungeonGraphState = { siteId: "site", campaignId: 1, currentRoomId: 1,
      entryRoomId: 1, explorationTurns: 0, lightTurnsRemaining: 0, edges: [],
      nodes: [1, 2, 3].map((id) => ({ id, title: "", geometry: "", contents: "",
        interaction: "", x: id, y: 0, explored: id === 1 })),
    };
    populateSiteRooms(graph, { roll: (sides) => sides === 10 ? 1 : 3,
      monster: () => { throw new Error("An empty room must not spawn a monster"); },
      treasure: () => { throw new Error("An empty room must not spawn treasure"); },
      objective: { title: "Recover the surveyor's record", deedId: "recover_record" } });
    expect(graph.nodes.filter((node) => node.objective)).toHaveLength(1);
    expect(graph.nodes[2].objective?.deedId).toBe("recover_record");
    expect(graph.nodes.every((node) => node.feature === "empty" && !node.treasure)).toBe(true);
  });

  it("requires recorded access even after defeating guards and supports noncombat access", () => {
    const room: DungeonRoomNode = { id: 1, title: "Vault", x: 0, y: 0, geometry: "", contents: "",
      interaction: "", explored: true, encounter: { monsterKey: "goblin", name: "Guards", count: 2, defeated: true },
      treasure: { coins: 20, items: [] } };
    expect(() => requireTreasureAccess(room)).toThrow(/Record how/);
    room.encounter!.defeated = false;
    room.treasure!.access = { method: "negotiated", notes: "The guards accepted our writ and unlocked the coffer." };
    expect(() => requireTreasureAccess(room)).not.toThrow();
    room.treasure!.claimed = true;
    expect(() => requireTreasureAccess(room)).toThrow(/already claimed/);
  });
});
