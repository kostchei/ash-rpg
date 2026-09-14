import { EVENTS } from "./protocol.js";

/** Actions migrated to transactional receipts. Keep client and server in sync. */
export const RECEIPTED_ACTIONS = new Set<string>([
  EVENTS.PATH_ENCOUNTERS_START,
  EVENTS.PATH_ENCOUNTERS_ARRIVE,
  EVENTS.PATH_ENCOUNTERS_INTERACT,
  EVENTS.TRAVEL_MOVE,
  EVENTS.DUNGEON_CLAIM_TREASURE,
  EVENTS.DUNGEON_RECORD_OUTCOME,
  EVENTS.DUNGEON_RECRUIT_RESCUED,
  EVENTS.DUNGEON_LIGHT_TORCH,
  EVENTS.SESSION_AWARD_XP,
  EVENTS.SESSION_RETURN_SANCTUARY,
  EVENTS.PARTY_REST,
  EVENTS.EXPEDITION_CAMP,
  EVENTS.EXPEDITION_CAMP_NIGHT,
  EVENTS.SITE_ENTER,
  EVENTS.DUNGEON_MOVE_ROOM,
  EVENTS.TREASURE_ALLOCATE,
  EVENTS.COMBAT_UPDATE_HP,
  EVENTS.COMBAT_DEATH_SAVE,
]);

/** Stable request identity, independent of object-key ordering or transport metadata. */
export function mutationPayloadKey(payload: Record<string, unknown>): string {
  const normalize = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(normalize);
    if (value && typeof value === "object") {
      return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b))
        .map(([key, entry]) => [key, normalize(entry)]));
    }
    return value;
  };
  const { actionId: _id, expectedRevision: _revision, ...body } = payload;
  return JSON.stringify(normalize(body));
}
