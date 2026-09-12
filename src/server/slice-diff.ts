import {
  ALL_SLICE_NAMES,
  APPEND_ONLY_SLICE_NAMES,
  type EntityDelta,
  type EntityDeltas,
  type SliceName,
  type SlicesUpdate,
} from "../shared/slices.js";
import type { Role } from "../shared/types.js";

/** Keyed list slices that travel as per-entity deltas rather than whole arrays. */
export const ENTITY_SLICE_NAMES = ["characters", "hexes"] as const satisfies readonly SliceName[];
type EntitySliceName = (typeof ENTITY_SLICE_NAMES)[number];

/** Slices a broadcast diffs whole; append-only ones travel as append events. */
export const BROADCAST_SLICE_NAMES = ALL_SLICE_NAMES.filter(
  (name) =>
    !APPEND_ONLY_SLICE_NAMES.includes(name) &&
    !(ENTITY_SLICE_NAMES as readonly SliceName[]).includes(name),
);

interface RoleCache {
  slices: Map<SliceName, string>;
  entities: Map<EntitySliceName, Map<string, string>>;
}

export interface SliceDiff {
  slices: SlicesUpdate["slices"];
  entityDeltas: EntityDeltas;
  changed: Set<SliceName>;
}

function sliceContent(update: SlicesUpdate, name: SliceName) {
  const value = update.slices[name];
  if (value === undefined) {
    throw new Error(`Projection slice "${name}" was not built`);
  }
  return value;
}

/** The campaign revision changes on every mutation, so it is not part of the diff. */
function encodeSlice(update: SlicesUpdate, name: SliceName): string {
  if (name !== "campaign") return JSON.stringify(sliceContent(update, name));
  const { revision: _revision, ...rest } = sliceContent(update, "campaign") as Record<string, unknown>;
  return JSON.stringify(rest);
}

function entityList(update: SlicesUpdate, name: EntitySliceName): Array<{ id: string | number }> {
  return sliceContent(update, name) as Array<{ id: string | number }>;
}

/**
 * Tracks, per role, what was last delivered for one campaign, and reduces a fresh
 * projection to only what changed. The wire content is therefore derived from the
 * data itself rather than from a hand-maintained event-to-slice table, which
 * cannot silently omit a write a handler made.
 */
export class SliceDiffer {
  private readonly byRole = new Map<Role, RoleCache>();

  private cacheFor(role: Role): RoleCache {
    let cache = this.byRole.get(role);
    if (!cache) {
      cache = { slices: new Map(), entities: new Map() };
      this.byRole.set(role, cache);
    }
    return cache;
  }

  /** Records a full projection as delivered, so the next diff compares against it. */
  prime(role: Role, update: SlicesUpdate) {
    const cache = this.cacheFor(role);
    for (const name of BROADCAST_SLICE_NAMES) {
      cache.slices.set(name, encodeSlice(update, name));
    }
    for (const name of ENTITY_SLICE_NAMES) {
      const encoded = new Map<string, string>();
      for (const entity of entityList(update, name)) {
        encoded.set(String(entity.id), JSON.stringify(entity));
      }
      cache.entities.set(name, encoded);
    }
  }

  diff(role: Role, projection: SlicesUpdate): SliceDiff {
    const cache = this.cacheFor(role);
    const slices: SlicesUpdate["slices"] = {};
    const entityDeltas: EntityDeltas = {};
    const changed = new Set<SliceName>();

    for (const name of BROADCAST_SLICE_NAMES) {
      const encoded = encodeSlice(projection, name);
      if (cache.slices.get(name) === encoded) continue;
      cache.slices.set(name, encoded);
      changed.add(name);
      Object.assign(slices, { [name]: projection.slices[name] });
    }

    for (const name of ENTITY_SLICE_NAMES) {
      const delta = this.diffEntities(cache, name, projection);
      if (!delta) continue;
      changed.add(name);
      Object.assign(entityDeltas, { [name]: delta });
    }

    return { slices, entityDeltas, changed };
  }

  private diffEntities(
    cache: RoleCache,
    name: EntitySliceName,
    projection: SlicesUpdate,
  ): EntityDelta<unknown, string | number> | undefined {
    const previous = cache.entities.get(name) ?? new Map<string, string>();
    const current = new Map<string, string>();
    const upsert: unknown[] = [];
    for (const entity of entityList(projection, name)) {
      const key = String(entity.id);
      const encoded = JSON.stringify(entity);
      current.set(key, encoded);
      if (previous.get(key) !== encoded) upsert.push(entity);
    }
    const remove = [...previous.keys()].filter((key) => !current.has(key));
    cache.entities.set(name, current);
    if (upsert.length === 0 && remove.length === 0) return undefined;
    return { upsert, remove };
  }
}
