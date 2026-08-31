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
    expect(state.hexes.find((hex) => hex.id === "01")).toEqual({
      id: "01",
      ring: 1,
      q: 0,
      r: -1,
      revealState: "unexplored",
    });
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

  it("locks the first threat vector to three shards", () => {
    db = new AshDatabase(":memory:");
    const campaign = db.createCampaign("Oakhaven", "Western Reaches", "1234");
    for (let i = 0; i < 3; i++) db.addThreatShard(campaign.campaignId, "lich");
    db.addThreatShard(campaign.campaignId, "demon");
    const threats = db.getState(campaign.campaignId, "host", null, "").threats;
    expect(threats.find((item) => item.key === "lich")).toMatchObject({
      shards: 3,
      confirmed: true,
    });
    expect(threats.find((item) => item.key === "demon")?.shards).toBe(0);
  });
});
