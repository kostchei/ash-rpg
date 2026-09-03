import type { RandomSource } from "../rules.js";

/**
 * 32-bit FNV-1a hash function for strings.
 */
export function hashString(str: string): number {
  let hash = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash >>> 0;
}

/**
 * Mulberry32 32-bit deterministic PRNG.
 */
export function createMulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let z = state;
    z = Math.imul(z ^ (z >>> 15), z | 1);
    z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
    return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Create a RandomSource conforming to ASH's (maxExclusive: number) => number interface.
 */
export function createRandomSource(seed: string | number): RandomSource {
  const numericSeed = typeof seed === "number" ? seed >>> 0 : hashString(seed);
  const nextFloat = createMulberry32(numericSeed);
  return (maxExclusive: number) => {
    if (maxExclusive <= 0) return 0;
    return Math.floor(nextFloat() * maxExclusive);
  };
}

/**
 * Derives a child seed stream deterministically from a parent seed and sub-key.
 */
export function deriveStream(parentSeed: string, subKey: string): RandomSource {
  const combined = `${parentSeed}::${subKey}`;
  return createRandomSource(combined);
}

/**
 * Randomly shuffles an array deterministically.
 * To ensure determinism across JS engines, the input is sorted first by key extractor or default string coercion.
 */
export function deterministicShuffle<T>(
  array: readonly T[],
  rng: RandomSource,
  sortKey?: (item: T) => string | number,
): T[] {
  const copy = [...array];
  if (sortKey) {
    copy.sort((a, b) => {
      const ka = sortKey(a);
      const kb = sortKey(b);
      return ka < kb ? -1 : ka > kb ? 1 : 0;
    });
  }
  for (let i = copy.length - 1; i > 0; i--) {
    const j = rng(i + 1);
    const temp = copy[i];
    copy[i] = copy[j];
    copy[j] = temp;
  }
  return copy;
}

/**
 * Pick one item from a list using a deterministic RNG.
 */
export function deterministicPickOne<T>(list: readonly T[], rng: RandomSource): T {
  if (list.length === 0) throw new Error("Cannot pick from empty list");
  return list[rng(list.length)];
}

/**
 * Weighted selection using a deterministic RNG.
 */
export function deterministicWeightedPick<T>(
  items: Array<{ item: T; weight: number }>,
  rng: RandomSource,
): T {
  const totalWeight = items.reduce((sum, i) => sum + i.weight, 0);
  if (totalWeight <= 0) return items[0].item;
  let roll = rng(totalWeight);
  for (const { item, weight } of items) {
    if (roll < weight) return item;
    roll -= weight;
  }
  return items[items.length - 1].item;
}
