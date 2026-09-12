import { beforeEach, describe, expect, it } from "vitest";
import { AshDatabase } from "../src/server/database.js";
import { buildStateFromSlices, patchStateWithSlices } from "../src/shared/slices.js";
import { SliceDiffer } from "../src/server/slice-diff.js";
import type { CampaignState, Combatant } from "../src/shared/types.js";

/**
 * Combat travels as a whole-diffed header plus a keyed roster delta, so the
 * initiative order (which `activeIndex` indexes into) is carried by the header
 * rather than implied by the roster. These cover the transitions the projection
 * fuzzer never reaches: reordering initiative, and adding or removing a
 * combatant mid-fight.
 */
describe("combat roster delta", () => {
  let db: AshDatabase;
  let campaignId: number;
  let differ: SliceDiffer;
  let clientState: CampaignState;
  let charIds: number[];

  const combatant = (id: string, initiative: number, hp = 10): Combatant => ({
    id,
    name: `Combatant ${id}`,
    kind: "pc",
    refId: charIds[0],
    initiative,
    ac: 14,
    currentHp: hp,
    maxHp: 10,
    conditions: [],
  });

  const saveRoster = (combatants: Combatant[], encounterId: number, patch = {}) =>
    db.saveCombatState(campaignId, {
      encounterId,
      campaignId,
      round: 1,
      activeIndex: 0,
      combatants,
      status: "active",
      ...patch,
    });

  /** Diffs a fresh projection and applies it the way a real broadcast would. */
  function step() {
    const projection = db.getSlicedState(campaignId, "player", null, "");
    const { slices, entityDeltas } = differ.diff("player", projection);
    const update = {
      campaignRevision: projection.campaignRevision,
      slices: { ...slices },
      entityDeltas,
    };
    clientState = patchStateWithSlices(clientState, update);
    expect(clientState.activeCombat).toEqual(
      db.getState(campaignId, "player", null, "").activeCombat,
    );
    return update;
  }

  beforeEach(() => {
    db = new AshDatabase(":memory:");
    campaignId = db.createCampaign("Roster", "The Mistwood", "1234", {
      selection: { mode: "single", zoneId: "the_gloaming" },
    }).campaignId;
    charIds = [];
    for (let c = 1; c <= 3; c++) {
      charIds.push(
        db.addCharacter(campaignId, null, {
          name: `PC ${c}`,
          ancestry: "human",
          className: "Fighter",
          level: 1,
          hp: 10,
          maxHp: 10,
          ac: 14,
          gold: 10,
          gearSlots: 10,
          xp: 0,
          abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
          anchors: { homeland: "Valia", landmark: "Keep", nemesis: "Rival" },
        }).id,
      );
    }
    const initial = db.getSlicedState(campaignId, "player", null, "", undefined, {
      isInitial: true,
    });
    differ = new SliceDiffer();
    differ.prime("player", initial);
    clientState = buildStateFromSlices(initial);
  });

  it("carries a fight from start to finish through header and roster deltas", () => {
    const encounterId = db.addEncounter(campaignId, "wolf", 1);

    // Start: no prior combat, so the header and the whole roster travel together.
    saveRoster([combatant("a", 20), combatant("b", 15), combatant("c", 10)], encounterId);
    const start = step();
    expect(start.entityDeltas?.combatants?.upsert).toHaveLength(3);
    expect(start.slices.combat?.combatantIds).toEqual(["a", "b", "c"]);
    expect(clientState.activeCombat?.combatants.map((c) => c.id)).toEqual(["a", "b", "c"]);

    // A one-point HP change must send that combatant and nothing else — no
    // header, and none of the untouched roster.
    const roster = db.getCombatState(campaignId)!.combatants;
    roster[1].currentHp = 7;
    saveRoster(roster, encounterId);
    const hpTick = step();
    expect(hpTick.slices.combat).toBeUndefined();
    expect(hpTick.entityDeltas?.combatants?.upsert).toHaveLength(1);
    expect(hpTick.entityDeltas?.combatants?.remove).toEqual([]);
    expect(clientState.activeCombat?.combatants[1].currentHp).toBe(7);

    // Reordering initiative changes no combatant, so only the header moves —
    // and the client must still end up in the server's order.
    saveRoster([roster[2], roster[0], roster[1]], encounterId);
    const reorder = step();
    expect(reorder.entityDeltas?.combatants).toBeUndefined();
    expect(reorder.slices.combat?.combatantIds).toEqual(["c", "a", "b"]);
    expect(clientState.activeCombat?.combatants.map((c) => c.id)).toEqual(["c", "a", "b"]);

    // A reinforcement arrives: the header places it, the delta carries it.
    saveRoster([roster[2], combatant("d", 12), roster[0], roster[1]], encounterId);
    const joined = step();
    expect(joined.entityDeltas?.combatants?.upsert.map((c) => c.id)).toEqual(["d"]);
    expect(clientState.activeCombat?.combatants.map((c) => c.id)).toEqual(["c", "d", "a", "b"]);

    // One drops out.
    saveRoster([roster[2], roster[0]], encounterId);
    const dropped = step();
    expect(dropped.entityDeltas?.combatants?.remove.sort()).toEqual(["b", "d"]);
    expect(clientState.activeCombat?.combatants.map((c) => c.id)).toEqual(["c", "a"]);

    // The fight resolves: the header goes null and the roster is torn down.
    saveRoster([roster[2], roster[0]], encounterId, { status: "resolved" });
    const ended = step();
    expect(ended.slices.combat).toBeNull();
    expect(clientState.activeCombat).toBeNull();
  });

  it("keeps an HP tick far below the cost of the whole roster", () => {
    const encounterId = db.addEncounter(campaignId, "wolf", 1);
    const roster = Array.from({ length: 13 }, (_, i) => combatant(`c${i}`, 20 - i));
    saveRoster(roster, encounterId);
    step();

    roster[4].currentHp = 3;
    saveRoster(roster, encounterId);
    const bytes = Buffer.byteLength(JSON.stringify(step()), "utf8");

    // The full roster is ~2 kB; one combatant is ~160 B.
    expect(bytes).toBeLessThan(500);
  });
});
