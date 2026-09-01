import { describe, expect, it } from "vitest";
import { AshDatabase } from "../src/server/database.js";

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
