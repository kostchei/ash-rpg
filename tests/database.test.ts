import { afterEach, describe, expect, it } from "vitest";
import { AshDatabase } from "../src/server/database.js";

describe("campaign persistence and fog", () => {
  let db: AshDatabase | undefined;
  afterEach(() => db?.close());

  it("creates an isolated campaign with host and player access", () => {
    db = new AshDatabase(":memory:");
    const campaign = db.createCampaign("Oakhaven", "Western Reaches", "1234");
    expect(db.authenticatePin(campaign.code, "1234")?.token).toBe(
      campaign.hostToken,
    );
    expect(db.authenticatePin(campaign.code, "0000")).toBeNull();
    const player = db.joinCampaign(campaign.code)!;
    expect(
      db.authenticate(campaign.code, "player", player.token)?.characterId,
    ).toBeNull();
  });

  it("omits unrevealed hex contents from serialized state", () => {
    db = new AshDatabase(":memory:");
    const campaign = db.createCampaign("Oakhaven", "Western Reaches", "1234");
    let state = db.getState(
      campaign.campaignId,
      "host",
      null,
      "http://table/play",
    );
    const hex01 = state.hexes.find((hex) => hex.id === "01");
    expect(hex01).toMatchObject({
      id: "01",
      ring: 1,
      q: 0,
      r: -1,
      revealState: "unexplored",
    });
    expect(hex01?.landmark).toBeUndefined();
    expect(hex01?.threatTier).toBeUndefined();
    expect(hex01?.name).toBeUndefined();
    expect(hex01?.river).toBeDefined();
    expect(hex01?.horizonRumor).toBeTruthy();
    db.revealHex(campaign.campaignId, "01", "scouted");
    state = db.getState(campaign.campaignId, "host", null, "http://table/play");
    expect(state.hexes.find((hex) => hex.id === "01")?.landmark).toContain(
      "Watchpost",
    );
  });

  it("gates monster mechanics behind accumulated lore", () => {
    db = new AshDatabase(":memory:");
    const campaign = db.createCampaign("Oakhaven", "Western Reaches", "1234");
    db.addEncounter(campaign.campaignId, "owlbear", 1);
    let monster = db.getState(campaign.campaignId, "player", null, "")
      .encounters[0].monsters[0];
    expect(monster.ac).toBeUndefined();
    expect(monster.attacks).toBeUndefined();
    db.revealMonsterLore(campaign.campaignId, monster.id, 2);
    monster = db.getState(campaign.campaignId, "player", null, "").encounters[0]
      .monsters[0];
    expect(monster.ac).toBe(13);
    expect(monster.attacks?.length).toBeGreaterThan(0);
    expect(monster.traits).toBeUndefined();
  });

  it("starts without pressure and tracks a chosen escalation shape", () => {
    db = new AshDatabase(":memory:");
    const campaign = db.createCampaign("Oakhaven", "Western Reaches", "1234");
    expect(
      db.getState(campaign.campaignId, "host", null, "").pressures,
    ).toEqual([]);
    db.addPressure(campaign.campaignId, {
      name: "The Ash Riders close in",
      shape: "pursuit",
      threshold: 4,
      consequence: "They reach the sanctuary before dawn",
    });
    db.advancePressure(campaign.campaignId, 1, 1);
    expect(
      db.getState(campaign.campaignId, "host", null, "").pressures[0],
    ).toMatchObject({
      name: "The Ash Riders close in",
      shape: "pursuit",
      current: 1,
      threshold: 4,
      status: "active",
    });
  });

  it("persists procedural region, layers, sites, connections, and historical records", () => {
    db = new AshDatabase(":memory:");
    const campaign = db.createCampaign("Gothic Mist", "The Mistwood", "9876", {
      selection: {
        mode: "border",
        zoneIds: ["the_gloaming", "red_sands"],
        connection: "surface",
      },
      seed: "persisted_test_seed",
      season: "autumn",
    });

    const state = db.getState(campaign.campaignId, "host", null, "");
    expect(state.campaign.activeRegionId).toBeTruthy();
    expect(state.campaign.activeZoneId).toBe("the_gloaming");
    expect(state.hexes).toHaveLength(19);

    // Verify regions table
    const regionRow = db.db.prepare("SELECT * FROM regions WHERE campaign_id = ?").get(campaign.campaignId) as any;
    expect(regionRow).toBeDefined();
    expect(regionRow.seed).toBe("persisted_test_seed");
    expect(regionRow.active).toBe(1);

    // Verify sites table
    const sites = db.db.prepare("SELECT * FROM sites WHERE region_id = ?").all(regionRow.id) as any[];
    expect(sites.length).toBeGreaterThan(0);
    const havenSite = sites.find((s) => s.kind === "haven");
    expect(havenSite).toBeDefined();

    // Verify connections table
    const connections = db.db.prepare("SELECT * FROM connections WHERE region_id = ?").all(regionRow.id) as any[];
    expect(connections.length).toBeGreaterThan(0);

    // Verify historical events table
    const events = db.db.prepare("SELECT * FROM historical_events WHERE region_id = ?").all(regionRow.id) as any[];
    expect(events.length).toBeGreaterThanOrEqual(2);

    // Verify rumors table
    const rumors = db.db.prepare("SELECT * FROM rumors WHERE region_id = ?").all(regionRow.id) as any[];
    expect(rumors.length).toBeGreaterThanOrEqual(3);
  });

  it("enforces strict knowledge filtering across reveal states", () => {
    db = new AshDatabase(":memory:");
    const campaign = db.createCampaign("Fog Test", "The Frontier", "1111", {
      selection: { mode: "single", zoneId: "the_gloaming" },
      seed: "knowledge_filtering_seed",
    });

    // 1. Unexplored state: no landmark, no threat tier, no biome, no name
    let state = db.getState(campaign.campaignId, "player", null, "");
    const hex02 = state.hexes.find((h) => h.id === "02");
    expect(hex02).toBeDefined();
    expect(hex02?.revealState).toBe("unexplored");
    expect(hex02?.name).toBeUndefined();
    expect(hex02?.biome).toBeUndefined();
    expect(hex02?.landmark).toBeUndefined();
    expect(hex02?.threatTier).toBeUndefined();

    // 2. Rumored state: shows horizon rumor, hides exact landmark & threat
    db.revealHex(campaign.campaignId, "02", "rumored");
    state = db.getState(campaign.campaignId, "player", null, "");
    const hex02Rumored = state.hexes.find((h) => h.id === "02");
    expect(hex02Rumored?.revealState).toBe("rumored");
    expect(hex02Rumored?.landmark).toBeUndefined();
    expect(hex02Rumored?.threatTier).toBeUndefined();

    // 3. Scouted state: reveals biome, elevation, visible landmark, and threat
    db.revealHex(campaign.campaignId, "02", "scouted");
    state = db.getState(campaign.campaignId, "player", null, "");
    const hex02Scouted = state.hexes.find((h) => h.id === "02");
    expect(hex02Scouted?.revealState).toBe("scouted");
    expect(hex02Scouted?.name).toBeTruthy();
    expect(hex02Scouted?.biome).toBeTruthy();
    expect(hex02Scouted?.threatTier).toBeDefined();
    expect(hex02Scouted?.landmark).toBeTruthy();
  });
});
