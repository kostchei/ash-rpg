import { coordKey, getAxialNeighbors, type HexCoord } from "./noise.js";
import type { RandomSource } from "../rules.js";

export interface HydrologyNode {
  q: number;
  r: number;
  elevation: number;
  effectiveElevation: number;
  downstreamKey?: string;
  catchment: number;
  isRiver: boolean;
  isStream: boolean;
  isSink: boolean;
  riverName?: string;
}

export interface HydrologyResult {
  nodes: Map<string, HydrologyNode>;
  riverEdges: Array<{ fromKey: string; toKey: string; name: string }>;
  lakeKeys: Set<string>;
}

const RIVER_NAMES_BY_ZONE: Record<string, string[]> = {
  the_gloaming: ["The Blackwater", "Whispering Brook", "River Ydris", "Mournflow", "Silt Run"],
  red_sands: ["Wadi Al-Ahmar", "Drywash Gorge", "The Qanat Flume", "Scorpion Run", "Saltwash"],
  midnight_sun: ["Glacial Fjord Sound", "Frost-Torrent Run", "Ice-Vael River", "Deep Fjord Wash", "Skald Creek"],
  river_of_night: ["The Black River", "Itzalca Serpent Flow", "Obsidian Rapids", "Sunken Tributary", "Canopy Run"],
  dwellers_in_the_deep: ["The Sunless Torrent", "Styx Chasm Flume", "Black Siphon Flow", "Echoing Cataract"],
  city_of_masks: ["River Trematora", "Grand Shipping Canal", "Rooks Waterway", "Canal Seren", "The Ducal Flow"],
};

export function solveHydrology(
  coords: HexCoord[],
  elevations: Map<string, number>,
  zoneId: string,
  rng: RandomSource,
  options: { minRiverCatchment?: number; minStreamCatchment?: number } = {},
): HydrologyResult {
  const minRiverCatchment = options.minRiverCatchment ?? 3;
  const minStreamCatchment = options.minStreamCatchment ?? 2;

  const nodeMap = new Map<string, HydrologyNode>();
  const coordLookup = new Set(coords.map((c) => coordKey(c.q, c.r)));

  // 1. Initialize nodes
  for (const c of coords) {
    const key = coordKey(c.q, c.r);
    const elev = elevations.get(key) ?? 1;
    nodeMap.set(key, {
      q: c.q,
      r: c.r,
      elevation: elev,
      effectiveElevation: elev,
      catchment: 1,
      isRiver: false,
      isStream: false,
      isSink: false,
    });
  }

  // 2. Identify boundary hexes (hexes with at least one neighbor outside coords)
  const boundaryKeys = new Set<string>();
  for (const c of coords) {
    const key = coordKey(c.q, c.r);
    const neighbors = getAxialNeighbors(c);
    if (neighbors.some((n) => !coordLookup.has(coordKey(n.q, n.r)))) {
      boundaryKeys.add(key);
    }
  }

  // 3. Resolve drainage directions (acyclic flow)
  // Sort nodes from highest elevation to lowest; tie-break by stable key
  const sorted = [...coords].sort((a, b) => {
    const ea = nodeMap.get(coordKey(a.q, a.r))!.elevation;
    const eb = nodeMap.get(coordKey(b.q, b.r))!.elevation;
    if (ea !== eb) return eb - ea; // Highest first
    return coordKey(a.q, a.r).localeCompare(coordKey(b.q, b.r));
  });

  // Calculate distance-to-boundary rank for flat tie-breaking to avoid cycles
  const distToBoundary = new Map<string, number>();
  const queue: Array<{ key: string; dist: number }> = [];
  for (const bk of boundaryKeys) {
    distToBoundary.set(bk, 0);
    queue.push({ key: bk, dist: 0 });
  }
  while (queue.length > 0) {
    const current = queue.shift()!;
    const node = nodeMap.get(current.key)!;
    for (const n of getAxialNeighbors({ q: node.q, r: node.r })) {
      const nk = coordKey(n.q, n.r);
      if (nodeMap.has(nk) && !distToBoundary.has(nk)) {
        distToBoundary.set(nk, current.dist + 1);
        queue.push({ key: nk, dist: current.dist + 1 });
      }
    }
  }

  // For each hex, pick downstream neighbor with deterministic tie-breaking
  for (const c of sorted) {
    const key = coordKey(c.q, c.r);
    const node = nodeMap.get(key)!;
    const neighbors = getAxialNeighbors(c).filter((n) => coordLookup.has(coordKey(n.q, n.r)));

    let bestNeighborKey: string | undefined;
    let bestDrop = 0;
    let bestNeighborDist = 999;

    for (const n of neighbors) {
      const nk = coordKey(n.q, n.r);
      const neighborNode = nodeMap.get(nk)!;
      const drop = node.elevation - neighborNode.elevation;
      const nDist = distToBoundary.get(nk) ?? 99;

      if (drop > bestDrop) {
        bestDrop = drop;
        bestNeighborKey = nk;
        bestNeighborDist = nDist;
      } else if (drop === bestDrop && drop > 0) {
        if (nDist < bestNeighborDist || (nDist === bestNeighborDist && nk.localeCompare(bestNeighborKey ?? "") < 0)) {
          bestNeighborKey = nk;
          bestNeighborDist = nDist;
        }
      } else if (drop === 0 && bestDrop === 0) {
        // Flat tie-breaker: flow toward boundary (strictly decreasing distance to boundary)
        const myDist = distToBoundary.get(key) ?? 99;
        if (nDist < myDist) {
          if (
            bestNeighborKey === undefined ||
            nDist < bestNeighborDist ||
            (nDist === bestNeighborDist && nk.localeCompare(bestNeighborKey) < 0)
          ) {
            bestNeighborKey = nk;
            bestNeighborDist = nDist;
          }
        }
      }
    }

    if (bestNeighborKey) {
      node.downstreamKey = bestNeighborKey;
    } else {
      // Local depression / sink
      node.isSink = true;
    }
  }

  // 4. Accumulate catchment in topological order (upstream contributions processed before downstream propagation)
  const inDegree = new Map<string, number>();
  for (const c of coords) {
    inDegree.set(coordKey(c.q, c.r), 0);
  }
  for (const [, node] of nodeMap) {
    if (node.downstreamKey) {
      inDegree.set(node.downstreamKey, (inDegree.get(node.downstreamKey) ?? 0) + 1);
    }
  }

  const topoQueue: string[] = [];
  for (const [k, deg] of inDegree) {
    if (deg === 0) topoQueue.push(k);
  }
  topoQueue.sort((a, b) => a.localeCompare(b));

  let processedCount = 0;
  while (topoQueue.length > 0) {
    const key = topoQueue.shift()!;
    processedCount++;
    const node = nodeMap.get(key)!;
    if (node.downstreamKey) {
      const target = nodeMap.get(node.downstreamKey);
      if (target) {
        target.catchment += node.catchment;
        const remaining = (inDegree.get(node.downstreamKey) ?? 1) - 1;
        inDegree.set(node.downstreamKey, remaining);
        if (remaining === 0) {
          topoQueue.push(node.downstreamKey);
        }
      }
    }
  }

  // Fallback in case of any unvisited cycle nodes
  if (processedCount < coords.length) {
    for (const c of sorted) {
      const key = coordKey(c.q, c.r);
      if ((inDegree.get(key) ?? 0) > 0) {
        const node = nodeMap.get(key)!;
        if (node.downstreamKey) {
          const target = nodeMap.get(node.downstreamKey);
          if (target) {
            target.catchment += node.catchment;
          }
        }
      }
    }
  }

  // 5. Assign rivers, streams, and names
  const availableNames = RIVER_NAMES_BY_ZONE[zoneId] ?? RIVER_NAMES_BY_ZONE.the_gloaming;
  const primaryRiverName = availableNames[rng(availableNames.length)];
  const secondaryRiverName = availableNames[(rng(availableNames.length) + 1) % availableNames.length];

  const riverEdges: Array<{ fromKey: string; toKey: string; name: string }> = [];
  const lakeKeys = new Set<string>();

  // Pass 1: Classify all nodes
  for (const [key, node] of nodeMap) {
    if (node.catchment >= minRiverCatchment) {
      node.isRiver = true;
      node.riverName = primaryRiverName;
    } else if (node.catchment >= minStreamCatchment) {
      node.isStream = true;
      node.riverName = secondaryRiverName;
    }

    if (node.isSink && node.catchment >= 2) {
      lakeKeys.add(key);
    }
  }

  // Pass 2: Build river edges between classified nodes
  for (const [key, node] of nodeMap) {
    if (node.isRiver && node.downstreamKey) {
      const target = nodeMap.get(node.downstreamKey);
      if (target && target.isRiver) {
        riverEdges.push({
          fromKey: key,
          toKey: node.downstreamKey,
          name: primaryRiverName,
        });
      }
    }
  }

  return {
    nodes: nodeMap,
    riverEdges,
    lakeKeys,
  };
}
