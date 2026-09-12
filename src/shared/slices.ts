import type {
  CampaignPressure,
  CampaignState,
  CampaignSummary,
  Character,
  Combatant,
  CombatState,
  DungeonGraphState,
  DungeonRoom,
  Encounter,
  PublicHex,
  RewardRecord,
  RollRecord,
  TablePlayerSummary,
  WikiNote,
} from "./types.js";
import { getStaticZoneManifest, listStaticZones } from "./zone-manifests.js";

export type SliceName =
  | "campaign"
  | "characters"
  | "hexes"
  | "rooms"
  | "encounters"
  | "combat"
  | "rewards"
  | "rolls"
  | "notes"
  | "tablePlayers"
  | "zones";

export const ALL_SLICE_NAMES: readonly SliceName[] = [
  "campaign",
  "characters",
  "hexes",
  "rooms",
  "encounters",
  "combat",
  "rewards",
  "rolls",
  "notes",
  "tablePlayers",
  "zones",
] as const;

/**
 * Append-only slices. They are sent once in the initial snapshot and then grow
 * through `roll:appended` / `note:appended`, so they are never re-broadcast —
 * re-sending a capped window would truncate history the client has paged in.
 */
export const APPEND_ONLY_SLICE_NAMES: readonly SliceName[] = ["rolls", "notes"] as const;

export interface RoomsSliceData {
  rooms: DungeonRoom[];
  activeDungeon: DungeonGraphState | null;
}

export interface EncountersSliceData {
  encounters: Encounter[];
  pressures: CampaignPressure[];
}

/**
 * Per-entity delta for a keyed list slice. Sending the whole `characters` array
 * for a one-point HP change costs ~15 kB at a full table, so the two large keyed
 * slices travel as upserts plus removals instead.
 */
export interface EntityDelta<T, K> {
  upsert: T[];
  remove: K[];
}

export interface EntityDeltas {
  characters?: EntityDelta<Character, number>;
  hexes?: EntityDelta<PublicHex, string>;
  combatants?: EntityDelta<Combatant, string>;
}

/**
 * How combat travels on the wire. The initial snapshot carries `combatants`
 * inline; diffs strip them into an entity delta, because re-sending 13
 * combatants for a one-point HP change costs ~2 kB.
 *
 * The array order is the initiative order and `activeIndex` indexes into it,
 * so it cannot be recovered by sorting. `combatantIds` carries it whenever the
 * roster or the order changes; on a diff that only touches combatant fields the
 * header is unchanged and absent, and the client keeps the order it has.
 */
export interface CombatWire extends Omit<CombatState, "combatants"> {
  combatants?: Combatant[];
  combatantIds?: string[];
}

export interface SlicesUpdate {
  campaignRevision: number;
  entityDeltas?: EntityDeltas;
  slices: {
    campaign?: CampaignSummary;
    characters?: Character[];
    hexes?: PublicHex[];
    rooms?: RoomsSliceData;
    encounters?: EncountersSliceData;
    combat?: CombatWire | null;
    rewards?: RewardRecord[];
    rolls?: RollRecord[];
    notes?: WikiNote[];
    tablePlayers?: TablePlayerSummary[];
    zones?: { activeZoneId: string };
    me?: CampaignState["me"];
  };
  sliceRevisions?: Partial<Record<SliceName, number>>;
}

/**
 * Applies a keyed delta, preserving the server's ordering so a patched list is
 * indistinguishable from a freshly projected one.
 */
export function applyEntityDelta<T, K>(
  current: T[],
  delta: EntityDelta<T, K>,
  keyOf: (item: T) => K,
  compare: (a: T, b: T) => number,
): T[] {
  const removed = new Set<K>(delta.remove);
  const byKey = new Map<K, T>();
  for (const item of current) {
    const key = keyOf(item);
    if (!removed.has(key)) byKey.set(key, item);
  }
  for (const item of delta.upsert) {
    byKey.set(keyOf(item), item);
  }
  return [...byKey.values()].sort(compare);
}

/**
 * Applies a combatant delta under the initiative order. Order is meaningful —
 * `activeIndex` indexes into the array — so it is taken from `combatantIds`
 * when the header supplied a new one, and otherwise preserved from the current
 * array. A delta that introduces an id with no position is a server bug.
 */
export function applyCombatantDelta(
  current: Combatant[],
  delta: EntityDelta<Combatant, string>,
  order: string[] | undefined,
): Combatant[] {
  const removed = new Set(delta.remove);
  const byId = new Map<string, Combatant>();
  for (const combatant of current) {
    if (!removed.has(combatant.id)) byId.set(combatant.id, combatant);
  }
  for (const combatant of delta.upsert) {
    byId.set(combatant.id, combatant);
  }

  if (order === undefined) {
    const ordered = current
      .map((combatant) => byId.get(combatant.id))
      .filter((combatant): combatant is Combatant => combatant !== undefined);
    if (ordered.length !== byId.size) {
      throw new Error("Combatant delta introduced combatants without an initiative order");
    }
    return ordered;
  }

  if (order.length !== byId.size) {
    throw new Error(
      `Initiative order lists ${order.length} combatants but the delta resolved to ${byId.size}`,
    );
  }
  return order.map((id) => {
    const combatant = byId.get(id);
    if (!combatant) throw new Error(`Initiative order references unknown combatant "${id}"`);
    return combatant;
  });
}

/**
 * Narrows a fully-projected combat slice to a CombatState. Every projection
 * carries its roster inline; one that does not is a server bug.
 */
export function requireCombatState(wire: CombatWire | null): CombatState | null {
  if (!wire) return null;
  const { combatants, combatantIds: _order, ...rest } = wire;
  if (!combatants) throw new Error("Combat projection is missing its combatants");
  return { ...rest, combatants };
}

/** Reorders a roster into an explicit initiative order, which must cover it exactly. */
function orderRoster(roster: Combatant[], order: string[]): Combatant[] {
  if (order.length !== roster.length) {
    throw new Error(
      `Initiative order lists ${order.length} combatants but the roster holds ${roster.length}`,
    );
  }
  const byId = new Map(roster.map((combatant) => [combatant.id, combatant]));
  return order.map((id) => {
    const combatant = byId.get(id);
    if (!combatant) throw new Error(`Initiative order references unknown combatant "${id}"`);
    return combatant;
  });
}

/**
 * Rebuilds combat from whichever halves this update carried: a header (whole, so
 * it always restates `combatantIds`), a roster delta, or both. The initial
 * snapshot carries its combatants inline; diffs do not.
 */
function resolveCombat(
  prev: CombatState | null | undefined,
  wire: CombatWire | null | undefined,
  delta: EntityDelta<Combatant, string> | undefined,
): CombatState | null {
  if (wire === null) return null;
  if (wire === undefined && !prev) {
    throw new Error("Received a combatants delta with no active combat to apply it to");
  }

  const header = wire ?? prev!;
  const order = wire?.combatantIds;
  const base = wire?.combatants ?? prev?.combatants ?? [];
  const combatants = delta
    ? applyCombatantDelta(base, delta, order)
    : order
      ? orderRoster(base, order)
      : base;

  const { combatants: _inline, combatantIds: _order, ...rest } = header as CombatWire;
  return { ...rest, combatants };
}

export const compareCharacters = (a: Character, b: Character) => a.id - b.id;
export const compareHexes = (a: PublicHex, b: PublicHex) => Number(a.id) - Number(b.id);

function requireSlice<T>(value: T | undefined, name: SliceName | "me"): T {
  if (value === undefined) {
    throw new Error(`Initial snapshot is missing the "${name}" slice`);
  }
  return value;
}

/**
 * Merges a sliced update into an existing CampaignState, keeping untouched slice
 * subtrees referentially identical (`===`) so React and external stores can skip
 * renders of everything the mutation did not touch.
 */
export function patchStateWithSlices(
  prev: CampaignState,
  update: SlicesUpdate,
): CampaignState {
  let changed = false;
  const next: CampaignState = { ...prev };

  if (prev.campaign.revision !== update.campaignRevision) {
    next.campaign = { ...next.campaign, revision: update.campaignRevision };
    changed = true;
  }

  const { slices } = update;
  if (slices.campaign !== undefined) {
    next.campaign = slices.campaign;
    next.facilities = slices.campaign.facilities;
    next.worldNpcs = slices.campaign.worldNpcs;
    next.tavernLeads = slices.campaign.tavernEstablishment?.leads;
    changed = true;
  }
  if (slices.characters !== undefined) {
    next.characters = slices.characters;
    changed = true;
  }
  if (slices.hexes !== undefined) {
    next.hexes = slices.hexes;
    changed = true;
  }
  if (slices.rooms !== undefined) {
    next.rooms = slices.rooms.rooms;
    next.activeDungeon = slices.rooms.activeDungeon;
    changed = true;
  }
  if (slices.encounters !== undefined) {
    next.encounters = slices.encounters.encounters;
    next.pressures = slices.encounters.pressures;
    changed = true;
  }
  if (slices.rewards !== undefined) {
    next.rewards = slices.rewards;
    changed = true;
  }
  if (slices.rolls !== undefined) {
    next.rolls = slices.rolls;
    changed = true;
  }
  if (slices.notes !== undefined) {
    next.notes = slices.notes;
    changed = true;
  }
  if (slices.tablePlayers !== undefined) {
    next.tablePlayers = slices.tablePlayers;
    changed = true;
  }
  if (slices.zones !== undefined) {
    const zoneId = slices.zones.activeZoneId;
    next.activeZone = getStaticZoneManifest(zoneId);
    next.availableZones = listStaticZones();
    changed = true;
  }
  if (slices.me !== undefined) {
    next.me = slices.me;
    changed = true;
  }

  const { entityDeltas } = update;
  if (entityDeltas?.characters) {
    next.characters = applyEntityDelta(
      next.characters,
      entityDeltas.characters,
      (c) => c.id,
      compareCharacters,
    );
    changed = true;
  }
  if (entityDeltas?.hexes) {
    next.hexes = applyEntityDelta(next.hexes, entityDeltas.hexes, (h) => h.id, compareHexes);
    changed = true;
  }
  // Combat resolves after the entity deltas and in one step: the header carries
  // the initiative order and the delta carries the combatants it orders, so
  // neither half can be applied correctly on its own.
  if (slices.combat !== undefined || entityDeltas?.combatants) {
    next.activeCombat = resolveCombat(prev.activeCombat, slices.combat, entityDeltas?.combatants);
    changed = true;
  }

  if (next.campaign.activeSession !== prev.activeSession) {
    next.activeSession = next.campaign.activeSession;
    changed = true;
  }

  return changed ? next : prev;
}

/**
 * Construct a complete CampaignState from an initial snapshot, which always
 * carries every slice. A snapshot missing a slice is a server bug, not a
 * condition to paper over.
 */
export function buildStateFromSlices(update: SlicesUpdate): CampaignState {
  const { slices, campaignRevision } = update;
  const campaign = requireSlice(slices.campaign, "campaign");
  const rooms = requireSlice(slices.rooms, "rooms");
  const encounters = requireSlice(slices.encounters, "encounters");
  const activeZoneId = requireSlice(slices.zones, "zones").activeZoneId;

  return {
    campaign: { ...campaign, revision: campaignRevision },
    me: requireSlice(slices.me, "me"),
    characters: requireSlice(slices.characters, "characters"),
    hexes: requireSlice(slices.hexes, "hexes"),
    rooms: rooms.rooms,
    encounters: encounters.encounters,
    pressures: encounters.pressures,
    rolls: requireSlice(slices.rolls, "rolls"),
    notes: requireSlice(slices.notes, "notes"),
    activeZone: getStaticZoneManifest(activeZoneId),
    availableZones: listStaticZones(),
    activeSession: campaign.activeSession,
    activeDungeon: rooms.activeDungeon,
    activeCombat: requireCombatState(requireSlice(slices.combat, "combat")),
    rewards: requireSlice(slices.rewards, "rewards"),
    tablePlayers: requireSlice(slices.tablePlayers, "tablePlayers"),
    facilities: campaign.facilities,
    worldNpcs: campaign.worldNpcs,
    tavernLeads: campaign.tavernEstablishment?.leads,
  };
}
