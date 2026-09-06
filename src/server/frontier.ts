import type { AshDatabase } from "./database.js";
import type { PublicConnectionSummary } from "../shared/types.js";

/** Hex-grid distance in axial coordinates. One step = one 6-mile hex. */
export function axialDistance(aq: number, ar: number, bq: number, br: number): number {
  return (Math.abs(aq - bq) + Math.abs(aq + ar - bq - br) + Math.abs(ar - br)) / 2;
}

/** The six hex directions in fixed order. Index 0-5 maps onto a d6 navigation drift. */
export const HEX_DIRECTIONS: ReadonlyArray<{ dq: number; dr: number; name: string }> = [
  { dq: 0, dr: -1, name: "north" },
  { dq: 1, dr: -1, name: "northeast" },
  { dq: 1, dr: 0, name: "southeast" },
  { dq: 0, dr: 1, name: "south" },
  { dq: -1, dr: 1, name: "southwest" },
  { dq: -1, dr: 0, name: "northwest" },
];

export function neighborsOf(q: number, r: number): Array<{ q: number; r: number }> {
  return HEX_DIRECTIONS.map((d) => ({ q: q + d.dq, r: r + d.dr }));
}

interface ActiveRegion {
  regionId: string;
  layerId: string;
}

function activeRegion(db: AshDatabase, campaignId: number): ActiveRegion {
  const camp = db.db
    .prepare("SELECT active_region_id, party_location_json FROM campaigns WHERE id = ?")
    .get(campaignId) as { active_region_id?: string; party_location_json?: string } | undefined;
  if (!camp?.active_region_id) {
    throw new Error("Campaign has no active region; the frontier cannot be extended");
  }
  const loc = camp.party_location_json ? JSON.parse(camp.party_location_json) : {};
  return { regionId: String(camp.active_region_id), layerId: String(loc.layerId || "surface") };
}

/** True when the region's saved structural field already covers this coordinate. */
export function hasStructuralHex(db: AshDatabase, campaignId: number, q: number, r: number): boolean {
  const { regionId, layerId } = activeRegion(db, campaignId);
  const row = db.db
    .prepare("SELECT 1 FROM region_hexes WHERE region_id = ? AND layer_id = ? AND q = ? AND r = ?")
    .get(regionId, layerId, q, r);
  return !!row;
}

/** The next unused public hex id, continuing the numbering of the initial map. */
function nextHexId(db: AshDatabase, campaignId: number): string {
  const row = db.db
    .prepare("SELECT MAX(CAST(id AS INTEGER)) AS max_id FROM hexes WHERE campaign_id = ?")
    .get(campaignId) as { max_id: number | null } | undefined;
  const next = (row?.max_id ?? -1) + 1;
  return String(next).padStart(2, "0");
}

export interface MaterializedHex {
  id: string;
  q: number;
  r: number;
  created: boolean;
}

/**
 * Promote one saved structural hex into the campaign's public map.
 *
 * The region generator already solves elevation, hydrology, biome, and zone attribution across the
 * whole structural field and persists it to region_hexes. Materializing reuses that saved truth, so
 * a hex charted on the party's tenth expedition holds the same ground it always held.
 *
 * Idempotent: an already public hex is returned untouched, never regenerated.
 */
export function materializeHex(
  db: AshDatabase,
  campaignId: number,
  q: number,
  r: number,
): MaterializedHex {
  const existing = db.db
    .prepare("SELECT id FROM hexes WHERE campaign_id = ? AND q = ? AND r = ?")
    .get(campaignId, q, r) as { id: string } | undefined;
  if (existing) return { id: String(existing.id), q, r, created: false };

  const { regionId, layerId } = activeRegion(db, campaignId);
  const canonicalKey = `${regionId}:${layerId}:${q}:${r}`;
  const structural = db.db
    .prepare("SELECT * FROM region_hexes WHERE canonical_key = ?")
    .get(canonicalKey) as Record<string, unknown> | undefined;
  if (!structural) {
    throw new Error(
      `Hex (${q}, ${r}) lies beyond this region's generated structural field. ` +
        "Extending the world further requires generating a new region chunk.",
    );
  }

  const connRows = db.db
    .prepare("SELECT * FROM connections WHERE region_id = ? AND (from_key = ? OR to_key = ?)")
    .all(regionId, canonicalKey, canonicalKey) as Array<Record<string, any>>;

  const hexIdForKey = (key: string): string => {
    const parts = key.split(":");
    const row = db.db
      .prepare("SELECT id FROM hexes WHERE campaign_id = ? AND q = ? AND r = ?")
      .get(campaignId, Number(parts[2]), Number(parts[3])) as { id: string } | undefined;
    return row ? String(row.id) : "??";
  };

  const id = nextHexId(db, campaignId);
  const connections: PublicConnectionSummary[] = connRows.map((c) => ({
    id: String(c.id),
    fromId: c.from_key === canonicalKey ? id : hexIdForKey(String(c.from_key)),
    toId: c.to_key === canonicalKey ? id : hexIdForKey(String(c.to_key)),
    kind: c.kind,
    name: String(c.name),
    costWatches: Number(c.cost_watches),
    crossingMethod: c.crossing_method ?? undefined,
  }));

  // Site occupancy is deliberately not copied onto the hex row. Terrain and landmarks are the
  // permanent record; who holds a place is read live, so a charted hex reflects today's occupants.
  const road = connRows.find((c) => c.kind === "road" || c.kind === "trail");
  const river = connRows.find((c) => c.kind === "river");

  db.db
    .prepare(
      `INSERT INTO hexes
       (campaign_id, id, ring, q, r, name, biome, threat_tier, landmark, reveal_state,
        road, river, horizon_rumor, exit_destination, elevation, canonical_key,
        primary_zone, secondary_zone, connections_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      campaignId,
      id,
      axialDistance(0, 0, q, r),
      q,
      r,
      String(structural.name),
      String(structural.terrain),
      Number(structural.threat_tier),
      structural.landmark ? String(structural.landmark) : `Natural ${structural.terrain} landmark`,
      "unexplored",
      road ? String(road.name) : null,
      river ? String(river.name) : null,
      null,
      null,
      Number(structural.elevation),
      canonicalKey,
      String(structural.primary_zone),
      structural.secondary_zone ? String(structural.secondary_zone) : null,
      JSON.stringify(connections),
    );

  linkNeighborRoutes(db, campaignId, canonicalKey, id, connRows);

  return { id, q, r, created: true };
}

/**
 * Already-public hexes recorded their routes when this hex had no public id, leaving the far end
 * as "??" so the map could not draw the road. Now that the hex is charted, repair those entries.
 */
function linkNeighborRoutes(
  db: AshDatabase,
  campaignId: number,
  canonicalKey: string,
  newId: string,
  connRows: Array<Record<string, any>>,
): void {
  const update = db.db.prepare(
    "UPDATE hexes SET connections_json = ? WHERE campaign_id = ? AND id = ?",
  );
  for (const conn of connRows) {
    const otherKey = String(conn.from_key) === canonicalKey ? String(conn.to_key) : String(conn.from_key);
    const parts = otherKey.split(":");
    const neighbor = db.db
      .prepare("SELECT id, connections_json FROM hexes WHERE campaign_id = ? AND q = ? AND r = ?")
      .get(campaignId, Number(parts[2]), Number(parts[3])) as
      | { id: string; connections_json?: string }
      | undefined;
    if (!neighbor?.connections_json) continue;

    const summaries: PublicConnectionSummary[] = JSON.parse(neighbor.connections_json);
    let patched = false;
    for (const summary of summaries) {
      if (summary.id !== String(conn.id)) continue;
      if (summary.fromId === "??") {
        summary.fromId = newId;
        patched = true;
      }
      if (summary.toId === "??") {
        summary.toId = newId;
        patched = true;
      }
    }
    if (patched) update.run(JSON.stringify(summaries), campaignId, neighbor.id);
  }
}

/**
 * Chart the ground the party can actually step onto next: the hex they occupy and its six
 * neighbours. Coordinates outside the saved structural field are left unmaterialized — that
 * boundary is the region's real edge, and travelling into it fails loudly rather than inventing
 * geography.
 */
export function materializeNeighborhood(
  db: AshDatabase,
  campaignId: number,
  q: number,
  r: number,
): MaterializedHex[] {
  const created: MaterializedHex[] = [];
  for (const coord of [{ q, r }, ...neighborsOf(q, r)]) {
    if (!hasStructuralHex(db, campaignId, coord.q, coord.r)) continue;
    const result = materializeHex(db, campaignId, coord.q, coord.r);
    if (result.created) created.push(result);
  }
  return created;
}
