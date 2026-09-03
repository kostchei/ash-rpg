import { createMulberry32, hashString } from "./prng.js";

export interface HexCoord {
  q: number;
  r: number;
}

/**
 * 6 axial neighbor offsets:
 * [E, NE, NW, W, SW, SE]
 */
export const AXIAL_DIRECTIONS: readonly [number, number][] = [
  [1, 0],   // E / SE
  [1, -1],  // NE
  [0, -1],  // N / NW
  [-1, 0],  // W / NW
  [-1, 1],  // SW
  [0, 1],   // S / SE
];

export function axialDistance(a: HexCoord, b: HexCoord): number {
  return (Math.abs(a.q - b.q) + Math.abs(a.q + a.r - b.q - b.r) + Math.abs(a.r - b.r)) / 2;
}

export function getAxialNeighbors(coord: HexCoord): HexCoord[] {
  return AXIAL_DIRECTIONS.map(([dq, dr]) => ({
    q: coord.q + dq,
    r: coord.r + dr,
  }));
}

export function coordKey(q: number, r: number): string {
  return `${q},${r}`;
}

/**
 * Generates all hex coordinates within a given radius around (centerQ, centerR).
 * radius=0 -> 1 hex
 * radius=1 -> 7 hexes
 * radius=2 -> 19 hexes
 * radius=6 -> 127 hexes
 */
export function generateHexArea(radius: number, centerQ = 0, centerR = 0): HexCoord[] {
  const results: HexCoord[] = [];
  for (let q = -radius; q <= radius; q++) {
    const r1 = Math.max(-radius, -q - radius);
    const r2 = Math.min(radius, -q + radius);
    for (let r = r1; r <= r2; r++) {
      results.push({ q: centerQ + q, r: centerR + r });
    }
  }
  return results;
}

/**
 * Seeded 2D Simplex/Perlin-style Gradient Noise Generator.
 */
export class SimplexNoise2D {
  private readonly perm: Uint8Array;

  constructor(seed: string | number) {
    const numericSeed = typeof seed === "number" ? seed >>> 0 : hashString(seed);
    const rng = createMulberry32(numericSeed);
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const temp = p[i];
      p[i] = p[j];
      p[j] = temp;
    }
    this.perm = new Uint8Array(512);
    for (let i = 0; i < 512; i++) {
      this.perm[i] = p[i & 255];
    }
  }

  private grad2(hash: number, x: number, y: number): number {
    const h = hash & 7;
    const u = h < 4 ? x : y;
    const v = h < 4 ? y : x;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  /**
   * Sample 2D Simplex Noise in range [-1, 1].
   */
  sample(xin: number, yin: number): number {
    const F2 = 0.5 * (Math.sqrt(3.0) - 1.0);
    const s = (xin + yin) * F2;
    const i = Math.floor(xin + s);
    const j = Math.floor(yin + s);

    const G2 = (3.0 - Math.sqrt(3.0)) / 6.0;
    const t = (i + j) * G2;
    const X0 = i - t;
    const Y0 = j - t;
    const x0 = xin - X0;
    const y0 = yin - Y0;

    let i1: number, j1: number;
    if (x0 > y0) {
      i1 = 1;
      j1 = 0;
    } else {
      i1 = 0;
      j1 = 1;
    }

    const x1 = x0 - i1 + G2;
    const y1 = y0 - j1 + G2;
    const x2 = x0 - 1.0 + 2.0 * G2;
    const y2 = y0 - 1.0 + 2.0 * G2;

    const ii = i & 255;
    const jj = j & 255;

    let n0 = 0, n1 = 0, n2 = 0;

    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 > 0) {
      t0 *= t0;
      n0 = t0 * t0 * this.grad2(this.perm[ii + this.perm[jj]], x0, y0);
    }

    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 > 0) {
      t1 *= t1;
      n1 = t1 * t1 * this.grad2(this.perm[ii + i1 + this.perm[jj + j1]], x1, y1);
    }

    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 > 0) {
      t2 *= t2;
      n2 = t2 * t2 * this.grad2(this.perm[ii + 1 + this.perm[jj + 1]], x2, y2);
    }

    // Scale to [-1, 1]
    return 70.0 * (n0 + n1 + n2);
  }

  /**
   * Fractal Brownian Motion (multi-octave noise) in range [0, 1].
   */
  fbm(x: number, y: number, octaves = 3, persistence = 0.5, lacunarity = 2.0): number {
    let total = 0;
    let frequency = 1;
    let amplitude = 1;
    let maxValue = 0;
    for (let i = 0; i < octaves; i++) {
      total += this.sample(x * frequency, y * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= lacunarity;
    }
    // Normalize from [-maxValue, maxValue] to [0, 1]
    return (total / maxValue + 1) / 2;
  }
}
