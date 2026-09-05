import { describe, expect, it } from "vitest";
import { AshDatabase } from "../src/server/database.js";
import { BORDER_PAIRINGS, ZONE_PROFILES } from "../src/shared/zone-profiles.js";

describe("Thematic Zone Framework & CampaignPhase State Machine", () => {
  const db = new AshDatabase(":memory:");

  it("loads 6 complete thematic zones", () => {
    const zones = db.listZones();
    expect(zones.length).toBe(6);
    const ids = zones.map((z) => z.id);
    expect(ids).toContain("the_gloaming");
    expect(ids).toContain("red_sands");
    expect(ids).toContain("midnight_sun");
    expect(ids).toContain("river_of_night");
    expect(ids).toContain("dwellers_in_the_deep");
    expect(ids).toContain("city_of_masks");
  });

  it("reconciles source profiles, factions, and biomes per Cursed Scroll volumes", () => {
    // Andrik is not exclusively glaciers, includes farming and woods
    const andrik = db.getZoneManifest("midnight_sun");
    expect(andrik).toBeDefined();
    const andrikBiomes = andrik!.biomePalette.join(" ");
    expect(andrikBiomes).toMatch(/Pine|Fjord|Birch|Steading|Pastoral|Valley/i);

    // Morzomotha's entry conditions reference a site connection, not a hardcoded "Hex 06"
    const morzo = db.getZoneManifest("dwellers_in_the_deep");
    expect(morzo).toBeDefined();
    expect(morzo!.entryConditions).not.toContain("Hex 06");

    // Meridia has reviewed factions
    const meridia = db.getZoneManifest("city_of_masks");
    expect(meridia).toBeDefined();
    const meridiaFactionNames = meridia!.factions.map((f) => f.name);
    expect(meridiaFactionNames).toContain("The Bardic College");
    expect(meridiaFactionNames).toContain("The Shroud");

    // Gloaming has Knights of St. Ydris and Coven of Bittermold
    const gloaming = db.getZoneManifest("the_gloaming");
    expect(gloaming).toBeDefined();
    const gloamingFactionNames = gloaming!.factions.map((f) => f.name);
    expect(gloamingFactionNames).toContain("Knights of St. Ydris");
    expect(gloamingFactionNames).toContain("Coven of Bittermold");
  });

  it("resolves 100% of wandering monsters per zone without falling back to full bestiary", () => {
    const totalMonsters = db.listMonsters().length;
    const allZoneIds = Object.keys(ZONE_PROFILES);

    for (const zoneId of allZoneIds) {
      const manifest = db.getZoneManifest(zoneId);
      expect(manifest, `Manifest for ${zoneId} should exist`).toBeDefined();
      expect(manifest!.wanderingMonsterTable.length).toBeGreaterThan(0);

      const zoneMonsters = db.getMonstersForZone(zoneId);
      expect(
        zoneMonsters.length,
        `Zone ${zoneId} should resolve its full wandering monster table`,
      ).toBe(manifest!.wanderingMonsterTable.length);

      // Must never silently fall back to the 200+ monster list
      expect(zoneMonsters.length).toBeLessThan(totalMonsters);

      // All resolved monsters must have valid keys, names, and hp
      for (const m of zoneMonsters) {
        expect(m.monsterKey).toBeTruthy();
        expect(m.name).toBeTruthy();
        expect(m.currentHp).toBeGreaterThan(0);
      }
    }
  });

  it("defines all 15 border pairing definitions with recommended connection modes", () => {
    expect(BORDER_PAIRINGS).toHaveLength(15);
    for (const bp of BORDER_PAIRINGS) {
      expect(bp.id).toBeTruthy();
      expect(bp.zoneIds).toHaveLength(2);
      expect(bp.recommendedConnection).toBeTruthy();
      expect(bp.supportedConnections.length).toBeGreaterThan(0);
      expect(bp.transitionMechanism).toBeTruthy();
      expect(bp.sharedConflictOrResource).toBeTruthy();
    }
  });

  it("transitions campaign phase and active zone", () => {
    const created = db.createCampaign("Test Campaign", "Borderlands", "1234");
    const state1 = db.getState(created.campaignId, "host", null, "");
    expect(state1.campaign.phase).toBe("sanctuary");
    expect(state1.campaign.activeZoneId).toBe("the_gloaming");

    db.setCampaignPhase(created.campaignId, "hexcrawl");
    db.setActiveZone(created.campaignId, "red_sands");

    const state2 = db.getState(created.campaignId, "host", null, "");
    expect(state2.campaign.phase).toBe("hexcrawl");
    expect(state2.campaign.activeZoneId).toBe("red_sands");
    expect(state2.activeZone?.name).toBe("The Red Sands (Djurum)");
  });

  it("generates authentic havens, taverns, and settlements across all 6 canonical zones", async () => {
    const { generateProceduralRegion } = await import("../src/server/generators/procedural-region.js");
    const { ZONE_HAVEN_DEFINITIONS } = await import("../src/server/generators/names.js");

    const canonicalZones = [
      "the_gloaming",
      "red_sands",
      "midnight_sun",
      "river_of_night",
      "dwellers_in_the_deep",
      "city_of_masks",
    ] as const;

    for (const zoneId of canonicalZones) {
      const world = generateProceduralRegion(100, {
        selection: { mode: "single", zoneId },
        initialRadius: 2,
        structuralRadius: 6,
        regionalHexMiles: 6,
        season: "autumn",
        sourceContent: "adapted",
        rulesProfileId: "ash_4watch_v1",
      });

      // Haven Hex 00 must match zone canonical haven
      const hex00 = world.initial19PublicHexes.find((h) => h.id === "00");
      expect(hex00).toBeDefined();
      expect(hex00!.name).toBe(ZONE_HAVEN_DEFINITIONS[zoneId].name);

      // Tavern establishment must match zone canonical tavern
      expect(world.tavernEstablishment).toBeDefined();
      expect(world.tavernEstablishment!.name).toBe(ZONE_HAVEN_DEFINITIONS[zoneId].tavernName);

      // Verify no legacy 'Oakhaven' occurs in any generated public hex or site
      for (const h of world.initial19PublicHexes) {
        expect(h.name.toLowerCase()).not.toContain("oakhaven");
        expect(h.landmark.toLowerCase()).not.toContain("oakhaven");
      }
      for (const s of world.sites) {
        expect(s.name.toLowerCase()).not.toContain("oakhaven");
      }

      // Settlements must have authentic names (not generic 'Woodcutter Steading of Hex 01')
      const settlements = world.sites.filter((s) => s.kind === "settlement");
      for (const s of settlements) {
        expect(s.name).not.toMatch(/of Hex \d\d/);
      }
    }
  });
});
