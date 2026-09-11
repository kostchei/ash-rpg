import type { DungeonGraphState, DungeonRoomNode } from "../shared/types.js";

const FEATURES: NonNullable<DungeonRoomNode["feature"]>[] = [
  "empty", "empty", "trap", "minor_hazard", "solo_monster", "npc",
  "monster_mob", "major_hazard", "treasure", "boss_monster",
];

export function roomFeature(face: number): NonNullable<DungeonRoomNode["feature"]> {
  if (!Number.isInteger(face) || face < 1 || face > 10) throw new Error("Room feature requires a d10 result");
  return FEATURES[face - 1];
}

/** Roll once on creation; room contents and the path objective are independent. */
export function populateSiteRooms(graph: DungeonGraphState, options: {
  roll: (sides: number) => number;
  monster: (feature: NonNullable<DungeonRoomNode["feature"]>) => { key: string; name: string };
  treasure: () => { coins: number; items: string[] };
  groupTreasure?: (feature: NonNullable<DungeonRoomNode["feature"]>, roomId: number) => { coins: number; items: string[] } | null;
  objective: { title: string; deedId?: string };
}): void {
  for (const room of graph.nodes) {
    delete room.encounter;
    delete room.trap;
    delete room.treasure;
    room.featureRoll = options.roll(10);
    room.feature = roomFeature(room.featureRoll);
    room.title = room.id === graph.entryRoomId ? "Site entrance" : `Area ${room.id}`;
    room.contents = {
      empty: "No immediate encounter. Describe the traces of this site's history at the table.",
      trap: "An engineered danger protects this area. Investigate how it is triggered before proceeding.",
      minor_hazard: "A local obstacle threatens a delay or a limited resource loss. Establish its nature at the table.",
      solo_monster: "A lone creature occupies this area. Determine its activity and reaction.",
      npc: "Someone is here with their own purpose. Determine their identity, motive, and reaction.",
      monster_mob: "A group of creatures occupies this area. Determine its activity and reaction.",
      major_hazard: "A serious environmental danger obstructs this area. Establish its warning signs and stakes before resolving it.",
      treasure: "A cache is present. Investigate its container, protections, and ownership before claiming it.",
      boss_monster: "A powerful local adversary occupies this area. Establish its capabilities and intentions before engaging.",
    }[room.feature];
    room.interaction = "Describe your approach and record the outcome at the table.";
    if (room.feature === "trap") {
      room.trap = { name: "Site trap", trigger: "Table determines the trigger from the site's fiction",
        effect: "Establish consequences before resolving the approach", dc: 12, spotted: false, disarmed: false };
    }
    if (["solo_monster", "monster_mob", "boss_monster"].includes(room.feature)) {
      const monster = options.monster(room.feature);
      room.encounter = { monsterKey: monster.key, name: monster.name,
        count: room.feature === "monster_mob" ? options.roll(4) + 1 : 1, defeated: false };
      if (options.groupTreasure) {
        const carried = options.groupTreasure(room.feature, room.id);
        if (carried) {
          room.treasure = { ...carried, claimed: false };
        }
      }
    }
    if (room.feature === "treasure") room.treasure = { ...options.treasure(), claimed: false };
  }
  // The objective is not a room-feature roll or a reward for killing the boss.
  const terminal = graph.siteStructure?.sections.at(-1);
  const candidates = terminal ? graph.nodes.filter(node => terminal.roomIds.includes(node.id)) : graph.nodes;
  const room = candidates[options.roll(candidates.length) - 1];
  room.objective = { ...options.objective, completed: false };
}

export function requireTreasureAccess(room: DungeonRoomNode): void {
  if (!room.treasure) throw new Error("No treasure has been discovered here");
  if (room.treasure.claimed) throw new Error("Treasure already claimed");
  if (!room.treasure.access) {
    throw new Error("Record how the treasure was discovered and its guards, hazards or locks dealt with before claiming it");
  }
}
