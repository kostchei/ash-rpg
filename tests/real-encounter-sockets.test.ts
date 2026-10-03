import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { io, type Socket } from "socket.io-client";
import { randomUUID } from "node:crypto";
import { createAshServer } from "../src/server/app.js";
import { generateCampaignMonster } from "../src/server/generators/campaign-monsters.js";

describe("real encounters in the web UI", () => {
  let server: Awaited<ReturnType<typeof createAshServer>>;
  let host: Socket; let player: Socket; let campaignId: number; let playerToken: string;
  const send = (socket: Socket, event: string, payload: object = {}): Promise<any> => socket.timeout(3000).emitWithAck(event, payload);
  const state = () => server.db.getState(campaignId, "host", null, "");
  const envelope = () => ({ actionId: randomUUID(), expectedRevision: state().campaign.revision });
  beforeEach(async () => {
    server = await createAshServer({ dbPath: ":memory:", frontend: false, port: 0 });
    await server.listen();
    const campaign = server.db.createCampaign("Encounter UI", "Wychfen", "1234", { selection: { mode: "single", zoneId: "the_gloaming" }, legacy: true });
    campaignId = campaign.campaignId;
    playerToken = server.db.joinCampaign(campaign.code)!.token;
    const address = server.httpServer.address() as { port: number };
    const connect = async (role: string, token: string) => {
      const socket = io(`http://localhost:${address.port}`, { auth: { code: campaign.code, role, token } });
      await new Promise<void>((resolve, reject) => { socket.once("connect", resolve); socket.once("connect_error", reject); });
      return socket;
    };
    host = await connect("host", campaign.hostToken);
    player = await connect("player", playerToken);
  });
  afterEach(async () => { host?.disconnect(); player?.disconnect(); await server?.close(); });

  it("rolls the actual zone table, persists its campaign profile, and safely retries", async () => {
    const payload = envelope();
    const first = await send(host, "encounter:roll", payload);
    expect(first.ok).toBe(true);
    const repeated = await send(host, "encounter:roll", payload);
    expect(repeated.encounterId).toBe(first.encounterId);
    const encounters = state().encounters;
    expect(encounters).toHaveLength(1);
    const monster = encounters[0].monsters[0];
    const source = server.db.getMonster(monster.monsterKey)!;
    expect(monster.name).toBe(source.name);
    expect(monster.isVariant).toBe(false);
    expect(server.db.getMonstersForZone("the_gloaming").some(entry => entry.monsterKey === monster.monsterKey)).toBe(true);
    const before = state().campaign.revision;
    const result = await send(host, "encounter:inspect", { monsterId: monster.id });
    expect(result.ok).toBe(true);
    expect(result.monster.maxHp).toBe(source.maxHp);
    expect(result.monster.campaignProfile).toBeDefined();
    expect(result.treasure).toBeDefined();
    expect(result.treasure).toEqual(server.db.getTreasureRoll(campaignId, `enc_${first.encounterId}`));
    expect(result.treasure.tableBasis).toContain(source.level! >= 10 ? "10+" : source.level! >= 7 ? "7-9" : source.level! >= 4 ? "4-6" : "0-3");
    expect(state().campaign.revision).toBe(before);
    expect(state().encounters[0].monsters[0].loreTier).toBe(0);
    expect(state().encounters[0].monsters[0].vulnerabilities).toBeUndefined();
    expect((await send(player, "encounter:inspect", { monsterId: monster.id })).ok).toBe(false);
    expect((await send(host, "encounter:roll", envelope())).ok).toBe(false);
  });

  it("uses stock stats for an explicitly selected bestiary encounter by default", async () => {
    expect((await send(host, "encounter:start", { monsterKey: "guard", count: 2 })).ok).toBe(true);
    const monsters = state().encounters[0].monsters;
    expect(monsters.map(monster => monster.name)).toEqual(["Guard", "Guard"]);
    const result = await send(host, "encounter:inspect", { monsterId: monsters[0].id });
    expect(result.monster.campaignProfile.specialAbilityCount).toBe(1);
    expect(result.monster.campaignProfile.randomVulnerabilities).toHaveLength(2);
    expect(result.monster.traits.some((trait: string) => trait.startsWith("Interpose."))).toBe(true);
  });

  it("restricts rolling to the host or caller and restricts inspection to this campaign", async () => {
    expect((await send(player, "encounter:roll", envelope())).ok).toBe(false);
    server.db.setCallerToken(campaignId, playerToken);
    expect((await send(player, "encounter:roll", envelope())).ok).toBe(true);
    const other = server.db.createCampaign("Other", "Wychfen", "1234");
    server.db.addEncounter(other.campaignId, "troll", 1);
    const otherMonster = server.db.getState(other.campaignId, "host", null, "").encounters[0].monsters[0];
    expect((await send(host, "encounter:inspect", { monsterId: otherMonster.id })).ok).toBe(false);
  });

  it("can profile every configured wandering monster without inventing a stat block", () => {
    for (const zone of server.db.listZones()) {
      for (const monster of server.db.getMonstersForZone(zone.id)) {
        expect(() => generateCampaignMonster(monster, `zone:${zone.id}`), monster.name).not.toThrow();
      }
    }
  });
});
