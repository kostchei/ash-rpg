import { CLASSES, type ClassResourceDefinition, type ClassResourceSpender } from "./content.js";

/**
 * Class resource tracks — the "engines" a few classes run on.
 *
 * These are deliberately transient: a track either empties or refills between
 * fights, or settles back to a balanced midpoint, and the table drives it by
 * hand from the ledger. Nothing here tries to infer what happened in a round;
 * the rules only enforce the bounds and the cost of a spender.
 */

/** The resource track a class runs on, or undefined for classes without one. */
export function classResource(className: string): ClassResourceDefinition | undefined {
  const classDef = CLASSES.find((c) => c.name.toLowerCase() === className.toLowerCase());
  return classDef?.resource;
}

/** As {@link classResource}, but for callers that require the class to have one. */
export function requireClassResource(className: string): ClassResourceDefinition {
  const resource = classResource(className);
  if (!resource) throw new Error(`"${className}" has no resource track`);
  return resource;
}

/**
 * The cap after talents. Each time the class's cap talent has been taken it
 * raises the ceiling by one.
 */
export function resourceMax(className: string, talents: readonly string[] = []): number {
  const resource = requireClassResource(className);
  if (!resource.capTalent) return resource.baseMax;
  const capTalent = resource.capTalent;
  const taken = talents.filter((talent) => talent.includes(capTalent)).length;
  return resource.baseMax + taken;
}

/** The track a freshly made character of this class starts with. */
export function initialResources(className: string): Record<string, number> | undefined {
  const resource = classResource(className);
  if (!resource) return undefined;
  return { [resource.id]: resource.startsAt };
}

export function currentResource(character: {
  className: string;
  resources?: Record<string, number>;
}): number {
  const resource = requireClassResource(character.className);
  return character.resources?.[resource.id] ?? resource.startsAt;
}

/** Move the track by `delta`, clamped to [0, max]. Returns the new value. */
export function adjustResource(
  character: { className: string; talents?: string[]; resources?: Record<string, number> },
  delta: number,
): number {
  const resource = requireClassResource(character.className);
  const max = resourceMax(character.className, character.talents ?? []);
  const next = (character.resources?.[resource.id] ?? resource.startsAt) + delta;
  return Math.max(0, Math.min(max, next));
}

/**
 * Pay for one of the class's spenders. Throws rather than silently clamping —
 * a Warrior Priest who cannot afford Martyr's Blessing has not cast it.
 */
export function spendResource(
  character: { className: string; talents?: string[]; resources?: Record<string, number> },
  spenderId: string,
): { spender: ClassResourceSpender; remaining: number } {
  const resource = requireClassResource(character.className);
  const spender = resource.spenders.find((item) => item.id === spenderId);
  if (!spender) {
    throw new Error(`"${spenderId}" is not a ${resource.name} spender for ${character.className}`);
  }
  const current = character.resources?.[resource.id] ?? resource.startsAt;
  if (current < spender.cost) {
    throw new Error(`${spender.name} costs ${spender.cost} ${resource.name}; only ${current} is held`);
  }
  return { spender, remaining: current - spender.cost };
}

/** Apply the track's reset, if this trigger is the one it resets on. */
export function resetResources(
  character: { className: string; resources?: Record<string, number> },
  trigger: "combat_end" | "rest",
): Record<string, number> | undefined {
  const resource = classResource(character.className);
  if (!resource || resource.resetOn !== trigger) return character.resources;
  return { ...(character.resources ?? {}), [resource.id]: resource.resetsTo };
}
