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
});
