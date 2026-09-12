import type { AshDatabase } from "../../src/server/database.js";
import { MIN_DEPARTING_PARTY } from "../../src/shared/content.js";

/**
 * A party may not leave the haven with fewer than MIN_DEPARTING_PARTY members, so tests
 * that travel need a legal marching party. Adds unowned members (retainers, which count
 * towards the party) until the campaign has enough active characters to set off.
 */
export function seedMarchingParty(db: AshDatabase, campaignId: number, names = ["Marcher", "Companion"]) {
  const active = db.db
    .prepare("SELECT COUNT(*) as c FROM characters WHERE campaign_id = ? AND roster_status != 'reserve'")
    .get(campaignId) as { c: number };
  const ids: number[] = [];
  for (let i = active.c; i < MIN_DEPARTING_PARTY; i++) {
    ids.push(
      db.addCharacter(campaignId, null, {
        name: names[i] ?? `Marcher ${i + 1}`,
        ancestry: "Human",
        className: "Fighter",
        level: 1,
        hp: 8,
        maxHp: 8,
        ac: 12,
        gold: 0,
        gearSlots: 10,
        xp: 0,
        abilities: { str: 12, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
        anchors: { homeland: "Valley", landmark: "River", nemesis: "Bandit" },
      } as Parameters<AshDatabase["addCharacter"]>[2],
      // No gear: these exist to make the party legal, not to change resource maths.
      { startingGear: false }),
    );
  }
  return ids;
}
