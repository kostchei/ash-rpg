import type { AshDatabase } from "../../database.js";
import type { EncounterPack, EncounterPackState, OuterPathId } from "../../../shared/path-encounters.js";
import { buildEncounterPack } from "./catalog.js";
import { projectEncounterPack, recordEncounterArrival, resolveInteraction, startEncounterPack } from "./engine.js";

/** Definitions are saved with state so future catalogue edits cannot change an ongoing situation. */
export class PathEncounterService {
  constructor(private readonly db: AshDatabase) {
    db.db.exec(`CREATE TABLE IF NOT EXISTS path_encounter_packs (
      campaign_id INTEGER PRIMARY KEY REFERENCES campaigns(id) ON DELETE CASCADE,
      definition_json TEXT NOT NULL, state_json TEXT NOT NULL
    )`);
  }
  load(campaignId: number): { pack: EncounterPack; state: EncounterPackState } | null {
    const row = this.db.db.prepare("SELECT definition_json, state_json FROM path_encounter_packs WHERE campaign_id = ?").get(campaignId) as { definition_json: string; state_json: string } | undefined;
    return row ? { pack: JSON.parse(row.definition_json), state: JSON.parse(row.state_json) } : null;
  }
  view(campaignId: number) {
    const saved = this.load(campaignId);
    return saved ? projectEncounterPack(saved.pack, saved.state) : null;
  }
  start(campaignId: number, pathId: OuterPathId) {
    const existing = this.load(campaignId);
    if (existing) {
      if (existing.pack.pathId !== pathId) throw new Error("This campaign already has an encounter pack; its saved situations cannot be replaced");
      return this.view(campaignId);
    }
    const pack = buildEncounterPack(pathId);
    this.db.db.prepare("INSERT INTO path_encounter_packs (campaign_id, definition_json, state_json) VALUES (?, ?, ?)")
      .run(campaignId, JSON.stringify(pack), JSON.stringify(startEncounterPack(pack)));
    return this.view(campaignId);
  }
  update(campaignId: number, command: { kind: "arrive"; siteId: string; notes: string } | { kind: "interact"; interactionId: string; outcome: "success" | "failure"; notes: string }) {
    const saved = this.load(campaignId);
    if (!saved) throw new Error("Choose an encounter pack first");
    const next = command.kind === "arrive"
      ? recordEncounterArrival(saved.pack, saved.state, command.siteId, command.notes)
      : resolveInteraction(saved.pack, saved.state, command.interactionId, command.outcome, command.notes);
    this.db.db.prepare("UPDATE path_encounter_packs SET state_json = ? WHERE campaign_id = ?").run(JSON.stringify(next), campaignId);
    return this.view(campaignId);
  }
}
