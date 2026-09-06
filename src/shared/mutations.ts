/** Actions migrated to transactional receipts. Keep client and server in sync. */
export const RECEIPTED_ACTIONS = new Set([
  "travel:move",
  "dungeon:claim_treasure",
  "dungeon:record_outcome",
  "dungeon:light_torch",
  "session:award_xp",
  "session:return_sanctuary",
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
