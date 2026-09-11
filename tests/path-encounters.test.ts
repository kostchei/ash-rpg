import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { rmSync } from "node:fs";
import { resolve } from "node:path";
import { OUTER_PATH_IDS } from "../src/shared/path-encounters.js";
import { buildEncounterPack } from "../src/server/paths/encounters/catalog.js";
import { auditEncounterPack, projectEncounterPack, recordEncounterArrival, resolveInteraction, startEncounterPack } from "../src/server/paths/encounters/engine.js";
import { PathEncounterService } from "../src/server/paths/encounters/service.js";
import { AshDatabase } from "../src/server/database.js";

describe("Connected outer-power encounters", () => {
  for (const path of OUTER_PATH_IDS) {
    it(`${path}: both endings work independently through either evidence source without accepting a bargain`, () => {
      const pack = buildEncounterPack(path);
      expect(auditEncounterPack(pack)).toEqual([]);
      for (const route of ["a", "b"] as const) for (const source of ["witness", "record"] as const) {
        let state = startEncounterPack(pack);
        state = recordEncounterArrival(pack, state, source, "Travelled via the established road");
        const action = (route === "a") === (source === "witness") ? "talk" : "search";
        state = resolveInteraction(pack, state, `${source}_${action}`, "success", "");
        state = recordEncounterArrival(pack, state, `prepare_${route}`, "Followed the discovered lead");
        state = resolveInteraction(pack, state, `prepare_${route}_parley`, "success", "Used the stated countermeasure to bypass the group");
        state = resolveInteraction(pack, state, `prepare_${route}_work`, "success", "Completed and tested the physical preparation");
        state = recordEncounterArrival(pack, state, `finale_${route}`, "Reached the discovered operation using normal travel");
        state = resolveInteraction(pack, state, `finale_${route}_parley`, "success", "Diverted the defenders from their objective");
        state = resolveInteraction(pack, state, `finale_${route}_complete`, "success", "Completed every stated remedy condition through its interval");
        expect(state.victories).toEqual([route.toUpperCase()]);
        expect(state.facts).not.toContain(`prepared_${route === "a" ? "b" : "a"}`);
        expect(state.facts).not.toContain("benefit_accepted");
        expect(projectEncounterPack(pack, state).won).toBe(true);
      }
    });
  }
  it("rejects remote actions and unknown destinations without revealing them", () => {
    const pack = buildEncounterPack("nyarlathotep");
    const state = startEncounterPack(pack);
    expect(() => resolveInteraction(pack, state, "finale_b_complete", "success", "guess")).toThrow("current site");
    expect(() => recordEncounterArrival(pack, state, "finale_b", "guess")).toThrow("Discover");
    const view = projectEncounterPack(pack, state);
    expect(view.clues).toEqual([]);
    expect(view.knownSites.map(s => s.id)).toEqual(["haven", "witness", "record"]);
    expect(JSON.stringify(view)).not.toContain("The Acceptance Chamber");
    expect(view.currentSite.interactions).toEqual([]);
    expect(JSON.stringify(view)).not.toContain('"effects"');
    expect(JSON.stringify(view)).not.toContain('"victory"');
  });
  it("a failed negotiation preserves evidence and the Toll, and listening alone does not finish a rescue", () => {
    const pack = buildEncounterPack("cthulhu");
    let state = recordEncounterArrival(pack, startEncounterPack(pack), "witness", "Boat journey completed");
    state = resolveInteraction(pack, state, "witness_parley", "failure", "Netters refused and carried out their threat");
    expect(state.resolvedGroups).toEqual([]);
    expect(state.toll).toHaveLength(1);
    state = resolveInteraction(pack, state, "witness_talk", "success", "");
    expect(state.knownSites).toContain("prepare_a");
    expect(projectEncounterPack(pack, state).quests.find(q => q.title.includes("Fishing"))?.completed).toBe(false);
    state = resolveInteraction(pack, state, "witness_parley", "success", "Freed the captives through a diversion");
    expect(() => resolveInteraction(pack, state, "witness_combat", "success", "Try to claim the same group again")).toThrow("already resolved");
    state = resolveInteraction(pack, state, "witness_aid", "success", "Returned the sleeping crew to their families");
    expect(projectEncounterPack(pack, state).quests.find(q => q.title.includes("Fishing"))?.completed).toBe(true);
    expect(state.toll).toHaveLength(1);
  });
  it("does not mutate input or charge materials when validation fails; successful work cannot pay twice", () => {
    const pack = buildEncounterPack("ithaqua");
    const initial = startEncounterPack(pack);
    expect(() => resolveInteraction(pack, initial, "ordinary_work", "failure", "")).toThrow("does not require");
    const next = resolveInteraction(pack, initial, "ordinary_work", "success", "");
    expect(initial.assets["expedition fuel"]).toBe(2);
    expect(next.assets["expedition fuel"]).toBe(4);
    expect(() => resolveInteraction(pack, next, "ordinary_work", "success", "")).toThrow("Already completed");
  });
  it("saves definition and consequences across a database restart and rejects replacement", () => {
    const file = resolve(`data/test/encounters-${randomUUID()}.sqlite`);
    let db = new AshDatabase(file);
    try {
      const campaign = db.createCampaign("Encounter test", "Coast", "1234", { selection: { mode: "single", zoneId: "the_gloaming" }, legacy: true });
      const service = new PathEncounterService(db);
      service.start(campaign.campaignId, "cthulhu");
      service.update(campaign.campaignId, { kind: "interact", interactionId: "ordinary_work", outcome: "success", notes: "Rebuilt bridge" });
      const before = service.load(campaign.campaignId);
      db.close();
      db = new AshDatabase(file);
      const reopened = new PathEncounterService(db);
      expect(reopened.load(campaign.campaignId)).toEqual(before);
      expect(() => reopened.start(campaign.campaignId, "hastur")).toThrow("cannot be replaced");
      expect(() => reopened.update(campaign.campaignId, { kind: "interact", interactionId: "ordinary_work", outcome: "success", notes: "Again" })).toThrow("Already completed");
    } finally {
      db.close();
      for (const suffix of ["", "-wal", "-shm"]) rmSync(file + suffix, { force: true });
    }
  });
});
