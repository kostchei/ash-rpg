import { describe, expect, it } from "vitest";
import { generateHexMap } from "../src/server/generators/hex-map.js";
import { AshDatabase } from "../src/server/database.js";

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

  it("creates a continuous river system from highland spring to outflow delta", () => {
    const hexes = generateHexMap();
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

  it("creates radiating roads with macro horizon rumors and distance uncertainty", () => {
    const hexes = generateHexMap();

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
