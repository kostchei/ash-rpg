import { afterEach, describe, expect, it } from "vitest";
import { AshDatabase } from "../src/server/database.js";
import { generateCampaignMonster } from "../src/server/generators/campaign-monsters.js";
import { generateMonsterVariant } from "../src/server/rules.js";
import { readFileSync } from "node:fs";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("campaign monster profiles", () => {
  let db: AshDatabase | undefined;
  afterEach(() => db?.close());
  const open = () => (db = new AshDatabase(":memory:"));

  it("generates the audited counts for every imported monster, with unique draws", () => {
    const database = open();
    const audit = JSON.parse(readFileSync("data/bestiary/stock-vulnerability-audit.json", "utf8"));
    for (const row of audit.rows) {
      const monster = generateCampaignMonster(database.getMonster(row.monsterId)!, "coverage");
      const profile = monster.campaignProfile!;
      const expected = row.conditionalCounts?.find((version: { condition: string }) => version.condition === profile.form);
      expect(profile.specialAbilityCount, row.monsterId).toBe(expected?.specialAbilityCount ?? row.plannedAbilityCount);
      expect(profile.stockVulnerabilityCount, row.monsterId).toBe(row.stockVulnerabilityCount);
      expect(profile.randomVulnerabilities.length, row.monsterId).toBe(expected?.additionalVulnerabilitiesNeeded ?? row.additionalVulnerabilitiesNeeded);
      expect(new Set(profile.randomVulnerabilities.map(entry => entry.id)).size).toBe(profile.randomVulnerabilities.length);
    }
  });

  it("adds the guard power, keeps troll counters separate, and retains mummy fire", () => {
    const database = open();
    const guard = generateCampaignMonster(database.getMonster("guard")!, "sample");
    expect(guard.traits?.some(trait => trait.startsWith("Interpose."))).toBe(true);
    expect(guard.campaignProfile?.randomVulnerabilities).toHaveLength(2);
    const troll = generateCampaignMonster(database.getMonster("troll")!, "sample");
    expect(troll.campaignProfile?.stockVulnerabilityCount).toBe(0);
    expect(troll.campaignProfile?.randomVulnerabilities).toHaveLength(2);
    expect(troll.campaignProfile?.regenerationCounters.map(entry => entry.name)).toEqual(["Fire", "Acid"]);
    const mummy = generateCampaignMonster(database.getMonster("mummy")!, "sample");
    expect(mummy.campaignProfile?.randomVulnerabilities).toHaveLength(3);
    expect(mummy.vulnerabilities?.[0]).toContain("double damage");
    expect(mummy.campaignProfile?.randomVulnerabilities.some(entry => entry.label === "Fire")).toBe(false);
  });

  it("counts oracle strengths and changed AC/HP thresholds while retaining the oracle weakness", () => {
    const database = open();
    const variant = generateMonsterVariant(database.getMonster("guard")!, 10, () => 13);
    const monster = generateCampaignMonster(variant, "sample");
    // AC 20 + oracle strength + its assigned Interpose addition = 3.
    expect(monster.campaignProfile?.specialAbilityCount).toBe(3);
    expect(monster.campaignProfile?.randomVulnerabilities).toHaveLength(4);
    expect(monster.campaignProfile?.randomVulnerabilities[0].label).toBe("Garlic");
    const tough = generateCampaignMonster({ ...database.getMonster("troll")!, ac: 20, maxHp: 100 }, "sample");
    expect(tough.campaignProfile?.specialAbilityCount).toBe(3);
    expect(tough.campaignProfile?.randomVulnerabilities).toHaveLength(4);
  });

  it("uses stored effects and explicitly marks unfinished themes, without invented lore", () => {
    const database = open();
    const monster = generateCampaignMonster(database.getMonster("the_tarrasque")!, "effects");
    for (const entry of monster.campaignProfile!.randomVulnerabilities) {
      expect(entry.needsAuthoring).toBe(!entry.effect);
      if (entry.effect) expect(entry.effect).toContain("twice");
    }
    expect(monster.lore).toEqual(database.getMonster("the_tarrasque")!.lore);
  });

  it("persists the same version across encounters and gates secrets by lore tier", () => {
    const database = open();
    const campaign = database.createCampaign("Profiles", "Western Reaches", "1234");
    const base = database.getMonster("guard")!;
    const first = database.getCampaignMonster(campaign.campaignId, base);
    expect(database.getCampaignMonster(campaign.campaignId, first)).toEqual(first);
    const one = database.addEncounter(campaign.campaignId, "guard", 2);
    database.addEncounter(campaign.campaignId, "guard", 1);
    const records = database.db.prepare("SELECT campaign_profile_json FROM encounter_monsters").all() as Array<{ campaign_profile_json: string }>;
    expect(new Set(records.map(record => record.campaign_profile_json)).size).toBe(1);
    expect(database.db.prepare("SELECT COUNT(*) AS n FROM campaign_monster_profiles").get()).toEqual({ n: 1 });
    let state = database.getState(campaign.campaignId, "host", null, "");
    let encountered = state.encounters.find(encounter => encounter.id === one)!.monsters[0];
    expect(encountered.vulnerabilities).toBeUndefined();
    expect(encountered.campaignProfile).toBeUndefined();
    database.revealMonsterLore(campaign.campaignId, encountered.id, 3);
    state = database.getState(campaign.campaignId, "host", null, "");
    encountered = state.encounters.find(encounter => encounter.id === one)!.monsters[0];
    expect(encountered.vulnerabilities).toEqual(first.vulnerabilities);
    expect(encountered.traits).toEqual(first.traits);
  });

  it("keeps stored profiles after reopening the database and preserves authored overrides", () => {
    const folder = mkdtempSync(join(tmpdir(), "ash-campaign-monsters-"));
    try {
      db = new AshDatabase(join(folder, "test.sqlite"));
      const campaign = db.createCampaign("Persistence", "Western Reaches", "1234");
      db.upsertMonsterOverride("troll", { vulnerabilities: ["Psychic: Takes double psychic damage."] });
      const base = db.getMonster("troll")!;
      const first = db.getCampaignMonster(campaign.campaignId, base);
      expect(first.campaignProfile?.randomVulnerabilities).toHaveLength(1);
      expect(first.campaignProfile?.randomVulnerabilities[0].label).not.toBe("Psychic");
      db.close();
      db = new AshDatabase(join(folder, "test.sqlite"));
      expect(db.getCampaignMonster(campaign.campaignId, db.getMonster("troll")!)).toEqual(first);
    } finally {
      db?.close();
      db = undefined;
      rmSync(folder, { recursive: true, force: true });
    }
  });
});
