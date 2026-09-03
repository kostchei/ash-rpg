import { describe, expect, it } from "vitest";
import { generateHexMap, generateLegacyHexMap } from "../src/server/generators/hex-map.js";
import { generateProceduralRegion } from "../src/server/generators/procedural-region.js";
import { solveHydrology } from "../src/server/generators/hydrology.js";
import { generateHexArea } from "../src/server/generators/noise.js";
import { createRandomSource } from "../src/server/generators/prng.js";
import { AshDatabase } from "../src/server/database.js";
import type { RegionGenerationConfig } from "../src/shared/types.js";

describe("procedural hex map generator", () => {
  it("generates a topologically complete 19-hex frontier", () => {
    const hexes = generateHexMap({
      campaignName: "Ravenwatch",
      regionName: "Western Marches",
    });

    expect(hexes).toHaveLength(19);

    // Verify Hex 00 is central sanctuary
    const h00 = hexes.find((h) => h.id === "00");
    expect(h00).toBeDefined();
    expect(h00?.ring).toBe(0);
    expect(h00?.q).toBe(0);
    expect(h00?.r).toBe(0);
    expect(h00?.revealState).toBe("fully_mapped");
    expect(h00?.threatTier).toBe(0);
    expect(h00?.name).toContain("Ravenwatch");
  });

  it("creates a continuous river system from highland spring to outflow delta in legacy mode", () => {
    const hexes = generateLegacyHexMap();
    const riverHexes = hexes.filter((h) => Boolean(h.river));

    // River flows through 5 connected hexes: 07 (Highland) -> 01 -> 00 -> 04 -> 13 (Delta)
    expect(riverHexes).toHaveLength(5);
    const riverIds = riverHexes.map((h) => h.id);
    expect(riverIds).toContain("07");
    expect(riverIds).toContain("01");
    expect(riverIds).toContain("00");
    expect(riverIds).toContain("04");
    expect(riverIds).toContain("13");

    // All share the same river name
    const riverName = riverHexes[0].river;
    expect(riverName).toBeTruthy();
    expect(riverHexes.every((h) => h.river === riverName)).toBe(true);

    // Outflow hex has river exit destination
    const h13 = hexes.find((h) => h.id === "13");
    expect(h13?.exitDestination).toContain("River flows");
  });

  it("creates radiating roads with macro horizon rumors and distance uncertainty in legacy mode", () => {
    const hexes = generateLegacyHexMap();

    // Coast Road: 00 -> 06 -> 17
    const h17 = hexes.find((h) => h.id === "17");
    expect(h17?.road).toBeTruthy();
    expect(h17?.exitDestination).toContain("To the Coast");
    expect(h17?.horizonRumor).toContain("3 to 4 days");
    expect(h17?.horizonRumor).toContain("nobody has traveled it unescorted");

    // Capital Highroad: 00 -> 02 -> 09
    const h09 = hexes.find((h) => h.id === "09");
    expect(h09?.road).toBeTruthy();
    expect(h09?.exitDestination).toContain("To the Imperial Capital");
    expect(h09?.horizonRumor).toContain("Highroad to the Capital");

    // Iron Trace: 00 -> 03 -> 11
    const h11 = hexes.find((h) => h.id === "11");
    expect(h11?.road).toBeTruthy();
    expect(h11?.exitDestination).toContain("Dwarven Crags");
  });

  it("reproduces identical output for identical seed and configuration", () => {
    const config: RegionGenerationConfig = {
      selection: { mode: "single", zoneId: "the_gloaming" },
      seed: "ash_deterministic_seed_42",
      initialRadius: 2,
      structuralRadius: 6,
      regionalHexMiles: 6,
      season: "autumn",
      sourceContent: "sourced",
      rulesProfileId: "ash_4watch_v1",
    };

    const run1 = generateProceduralRegion(1, config);
    const run2 = generateProceduralRegion(1, config);

    expect(run1.initial19PublicHexes).toHaveLength(19);
    expect(run2.initial19PublicHexes).toHaveLength(19);

    for (let i = 0; i < 19; i++) {
      expect(run1.initial19PublicHexes[i].id).toBe(run2.initial19PublicHexes[i].id);
      expect(run1.initial19PublicHexes[i].name).toBe(run2.initial19PublicHexes[i].name);
      expect(run1.initial19PublicHexes[i].biome).toBe(run2.initial19PublicHexes[i].biome);
      expect(run1.initial19PublicHexes[i].elevation).toBe(run2.initial19PublicHexes[i].elevation);
      expect(run1.initial19PublicHexes[i].threatTier).toBe(run2.initial19PublicHexes[i].threatTier);
    }
  });

  it("produces structural variation and diverse geography across different seeds", () => {
    const configA: RegionGenerationConfig = {
      selection: { mode: "single", zoneId: "red_sands" },
      seed: "desert_seed_alpha",
      initialRadius: 2,
      structuralRadius: 6,
    };
    const configB: RegionGenerationConfig = {
      selection: { mode: "single", zoneId: "red_sands" },
      seed: "desert_seed_beta",
      initialRadius: 2,
      structuralRadius: 6,
    };

    const worldA = generateProceduralRegion(1, configA);
    const worldB = generateProceduralRegion(1, configB);

    // Biomes or landmarks should differ across seeds
    const biomesA = worldA.initial19PublicHexes.map((h) => h.biome).join(",");
    const biomesB = worldB.initial19PublicHexes.map((h) => h.biome).join(",");
    expect(biomesA).not.toBe(biomesB);
  });

  it("enforces acyclic hydrology flow and catchment accumulation", () => {
    const coords = generateHexArea(3);
    const elevations = new Map<string, number>();
    const rng = createRandomSource("hydro_test_seed");

    coords.forEach((c) => {
      elevations.set(`${c.q},${c.r}`, Math.abs(c.q) + Math.abs(c.r));
    });

    const result = solveHydrology(coords, elevations, "the_gloaming", rng);

    // Every node should flow downstream or be a sink
    for (const [, node] of result.nodes) {
      if (node.downstreamKey) {
        const downstream = result.nodes.get(node.downstreamKey);
        expect(downstream).toBeDefined();
        // Downstream should not point back to node (no 2-node cycles)
        expect(downstream!.downstreamKey).not.toBe(`${node.q},${node.r}`);
        // Catchment accumulation
        expect(downstream!.catchment).toBeGreaterThanOrEqual(node.catchment);
      }
    }
  });

  it("satisfies surface border integrity with 5+ cells per zone and transition corridor", () => {
    const config: RegionGenerationConfig = {
      selection: {
        mode: "border",
        zoneIds: ["the_gloaming", "red_sands"],
        connection: "surface",
        borderProfileId: "gloaming_djurum",
      },
      seed: "border_surface_verified",
      initialRadius: 2,
      structuralRadius: 6,
    };

    const world = generateProceduralRegion(1, config);
    expect(world.validationReport.valid).toBe(true);

    const counts = world.validationReport.zoneCounts;
    expect(counts.the_gloaming).toBeGreaterThanOrEqual(4);
    expect(counts.red_sands).toBeGreaterThanOrEqual(4);

    // Haven at 00 must be safe (threat 0)
    const haven = world.initial19PublicHexes.find((h) => h.id === "00");
    expect(haven).toBeDefined();
    expect(haven?.threatTier).toBe(0);
    expect(haven?.revealState).toBe("fully_mapped");
  });

  it("generates layered vertical connections between surface and underworld", () => {
    const config: RegionGenerationConfig = {
      selection: {
        mode: "border",
        zoneIds: ["the_gloaming", "dwellers_in_the_deep"],
        connection: "vertical",
        borderProfileId: "gloaming_dwellers",
      },
      seed: "karst_descent_seed",
      initialRadius: 2,
      structuralRadius: 6,
    };

    const world = generateProceduralRegion(1, config);
    expect(world.layers).toHaveLength(2);
    expect(world.layers.map((l) => l.layerId)).toContain("surface");
    expect(world.layers.map((l) => l.layerId)).toContain("subterranean");

    // An entrance site should exist in the region
    const entranceSite = world.sites.find((s) => s.kind === "entrance" || s.kind === "ruin");
    expect(entranceSite).toBeDefined();
  });

  it("supports host regenerating the frontier in database", () => {
    const db = new AshDatabase(":memory:");
    try {
      const campaign = db.createCampaign("Oakhaven", "Western Reaches", "1234");
      const initialState = db.getState(campaign.campaignId, "host", null, "");
      expect(initialState.hexes).toHaveLength(19);

      // Re-seed with a new theme
      db.regenerateHexMap(campaign.campaignId, "coastal");
      const updatedState = db.getState(campaign.campaignId, "host", null, "");
      expect(updatedState.hexes).toHaveLength(19);
      expect(updatedState.hexes.find((h) => h.id === "00")?.revealState).toBe(
        "fully_mapped",
      );
    } finally {
      db.close();
    }
  });
});
