import type { AshDatabase } from "../database.js";
import {
  type RewardSource,
  type SitePlan,
} from "../../shared/path-contracts.js";
import type { DungeonGraphState, DungeonRoomNode } from "../../shared/types.js";
import { type RandomSource, rollDie, systemRandom } from "../rules.js";
import { roomFeature } from "../room-features.js";
import { RewardService } from "../rewards/service.js";
import { generateUnguardedTreasure } from "../rewards/core-treasure.js";

/**
 * Materializes a SitePlan into a DungeonGraphState, ensuring all monster rooms
 * register persistent encounter groups and roll their 50% carried treasure once.
 */
export function materializeSitePlan(
  campaignId: number,
  sitePlan: SitePlan,
  graph: DungeonGraphState,
  db: AshDatabase,
  /** Level of the characters searching the site; sets which unguarded treasure table is used. */
  discoveringLevel: number,
  rng: RandomSource = systemRandom,
): {
  graph: DungeonGraphState;
  rewardSources: RewardSource[];
} {
  const rewardService = new RewardService(db);
  const createdRewardSources: RewardSource[] = [];

  // The adventure's own caches are placed content, not a room-feature result.
  // They claim their areas first; random finds fill in around them.
  const authoredCaches =
    sitePlan.authoredCaches && sitePlan.authoredCaches.length > 0
      ? sitePlan.authoredCaches
      : sitePlan.hasAuthoredCache && sitePlan.cacheQuality
      ? [{ quality: sitePlan.cacheQuality }]
      : [];
  const cacheRoomIds = new Set(
    graph.nodes
      .filter((node) => node.id !== graph.entryRoomId)
      .slice(0, authoredCaches.length)
      .map((node) => node.id),
  );
  if (cacheRoomIds.size < authoredCaches.length) {
    throw new Error(
      `Site ${sitePlan.id} has ${authoredCaches.length} authored caches but only ${cacheRoomIds.size} areas to place them in`,
    );
  }

  for (const room of graph.nodes) {
    delete room.encounter;
    delete room.trap;
    delete room.treasure;
    room.featureRoll = rollDie(10, rng);
    room.feature = roomFeature(room.featureRoll);
    room.title = room.id === graph.entryRoomId ? "Site entrance" : `Area ${room.id}`;
    room.contents = {
      empty: "No immediate encounter. Traces of this site's history are evident.",
      trap: "An engineered danger protects this area. Investigate how it is triggered.",
      minor_hazard: "A local obstacle threatens delay or limited resource loss.",
      solo_monster: "A lone creature occupies this area.",
      npc: "Someone is here with their own purpose.",
      monster_mob: "A group of creatures occupies this area.",
      major_hazard: "A serious environmental danger obstructs this area.",
      treasure: "A cache is present. Investigate its protections before claiming it.",
      boss_monster: "A powerful adversary occupies this area.",
    }[room.feature];
    room.interaction = "Describe your approach and record the outcome at the table.";

    if (room.feature === "trap") {
      room.trap = {
        name: "Site Trap",
        trigger: "Investigated trigger mechanism",
        effect: "Exploration damage or entrapment",
        dc: 12,
        spotted: false,
        disarmed: false,
      };
    }

    if (["solo_monster", "monster_mob", "boss_monster"].includes(room.feature)) {
      const isBoss = room.feature === "boss_monster";
      const isMob = room.feature === "monster_mob";
      const count = isMob ? rollDie(4, rng) + 1 : 1;
      const monsterKey = isBoss ? "aboleth_servitor_marshal" : isMob ? "troglodyte" : "cave_crawler";
      const monsterName = isBoss ? "Servitor Marshal" : isMob ? "Troglodytes" : "Cave Crawler";

      const groupId = `grp_${campaignId}_${sitePlan.id}_rm${room.id}`;
      const groupReg = rewardService.registerEncounterGroup(
        campaignId,
        {
          id: groupId,
          siteId: sitePlan.id,
          roomId: room.id,
          name: monsterName,
          members: [{ key: monsterKey, name: monsterName, count, level: isBoss ? 4 : 2 }],
          policyType: isBoss && sitePlan.bossHoard ? "boss_hoard" : "general_monster",
        },
        `seed_${groupId}`,
      );

      room.encounter = {
        monsterKey,
        name: monsterName,
        count,
        defeated: false,
        encounterId: parseInt(groupId.replace(/\D/g, "").slice(0, 8) || "1", 10),
      };

      // If group presence roll succeeded, assign room treasure referencing the canonical source
      if (groupReg.present && groupReg.sourceId) {
        const src = db.getRewardSource(campaignId, groupReg.sourceId);
        if (src) {
          createdRewardSources.push(src);
          room.treasure = {
            coins: src.coins.gp + src.coins.sp / 10 + src.coins.cp / 100,
            items: [...src.items],
            claimed: false,
          };
        }
      }
    }

    // A treasure area that no guard is sitting on holds an unguarded find,
    // rolled on the table for the level of whoever is doing the discovering.
    if (room.feature === "treasure" && !room.treasure && !cacheRoomIds.has(room.id)) {
      const find = generateUnguardedTreasure(discoveringLevel, rng);
      const findSourceId = `src_find_${campaignId}_${sitePlan.id}_rm${room.id}`;
      let src = db.getRewardSource(campaignId, findSourceId);
      if (!src) {
        src = {
          id: findSourceId,
          campaignId,
          sourceType: "unguarded_treasure",
          sourceId: findSourceId,
          quality: find.quality,
          xpValue: find.xpValue,
          coins: find.coins,
          items: find.items,
          status: "unclaimed",
          accessState: "unrevealed",
          createdAt: new Date().toISOString(),
        };
        db.saveRewardSource(src);
      }
      createdRewardSources.push(src);
      room.treasure = {
        coins: src.coins.gp + src.coins.sp / 10 + src.coins.cp / 100,
        items: [...src.items],
        claimed: false,
      };
    }
  }

  // Fill the areas reserved above with the adventure's own caches.
  const cacheRooms = graph.nodes.filter((node) => cacheRoomIds.has(node.id));
  for (const [index, authored] of authoredCaches.entries()) {
    const room = cacheRooms[index];
    const quality = authored.quality;
    const xpVal = authored.xpValue ?? (quality === "legendary" ? 10 : quality === "fabulous" ? 3 : 1);
    const cacheSourceId = `src_cache_${campaignId}_${sitePlan.id}_rm${room.id}`;
    let src = db.getRewardSource(campaignId, cacheSourceId);
    if (!src) {
      src = {
        id: cacheSourceId,
        campaignId,
        sourceType: "authored_cache",
        sourceId: cacheSourceId,
        quality,
        xpValue: xpVal,
        coins: authored.coins ?? { gp: quality === "legendary" ? 150 : quality === "fabulous" ? 50 : 25, sp: 10, cp: 0 },
        items: authored.items ?? ["healing_salve"],
        status: "unclaimed",
        accessState: "unrevealed",
        createdAt: new Date().toISOString(),
      };
      db.saveRewardSource(src);
    }
    createdRewardSources.push(src);
    room.treasure = {
      coins: src.coins.gp + src.coins.sp / 10 + src.coins.cp / 100,
      items: [...src.items],
      claimed: false,
    };
  }

  // Place objective independently in a random room (not contingent on boss or treasure)
  const targetRoomIndex = rollDie(graph.nodes.length, rng) - 1;
  const objectiveRoom = graph.nodes[targetRoomIndex] ?? graph.nodes[0];
  objectiveRoom.objective = {
    title: sitePlan.objective.title,
    deedId: sitePlan.objective.deedId,
    completed: false,
  };

  db.saveDungeonGraph(campaignId, graph);
  return { graph, rewardSources: createdRewardSources };
}
