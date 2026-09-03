import { describe, expect, it } from "vitest";
import { AshDatabase } from "../src/server/database.js";
import { BORDER_PAIRINGS, ZONE_PROFILES } from "../src/shared/zone-profiles.js";

describe("Thematic Zone Framework & CampaignPhase State Machine", () => {
  const db = new AshDatabase(":memory:");

  it("loads 7 complete thematic zones", () => {
    const zones = db.listZones();
    expect(zones.length).toBe(7);
    const ids = zones.map((z) => z.id);
    expect(ids).toContain("oakhaven_borderlands");
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
    expect(state1.campaign.activeZoneId).toBe("oakhaven_borderlands");

    db.setCampaignPhase(created.campaignId, "hexcrawl");
    db.setActiveZone(created.campaignId, "the_gloaming");

    const state2 = db.getState(created.campaignId, "host", null, "");
    expect(state2.campaign.phase).toBe("hexcrawl");
    expect(state2.campaign.activeZoneId).toBe("the_gloaming");
    expect(state2.activeZone?.name).toBe("The Gloaming");
  });
});
