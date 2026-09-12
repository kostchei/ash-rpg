import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { io as Client, type Socket } from "socket.io-client";
import { createAshServer } from "../src/server/app.js";
import { createActionId, fetchOlderNotes, fetchOlderRolls } from "../src/client/mutations.js";
import { buildStateFromSlices, patchStateWithSlices } from "../src/shared/slices.js";
import type { CampaignState, RollRecord, WikiNote } from "../src/shared/types.js";

/**
 * `rolls` and `notes` were 49 % of the old snapshot. They now leave the broadcast
 * entirely: the initial snapshot carries a live tail, growth arrives as append
 * events, and history is read back with a cursor.
 */
describe("Phase 1: chronicle paging and append events", () => {
  let server: Awaited<ReturnType<typeof createAshServer>>;
  let host: Socket;
  let campaignId: number;

  beforeEach(async () => {
    server = await createAshServer({ dbPath: ":memory:", frontend: false, port: 0 });
    await server.listen();
    const { port } = server.httpServer.address() as { port: number };
    const created = server.db.createCampaign("Paging", "The Mistwood", "1234", {
      selection: { mode: "single", zoneId: "the_gloaming" },
      legacy: true,
    });
    campaignId = created.campaignId;

    for (let i = 1; i <= 60; i++) {
      server.db.addRoll(campaignId, {
        actor: "Hero", kind: "check", label: `Check ${i}`, dice: "1d20", total: i, detail: `d${i}`,
      });
      server.db.addNote(campaignId, "Lore", `Entry ${i}`, `Body ${i}`);
    }

    host = Client(`http://localhost:${port}`, {
      auth: { code: created.code, token: created.hostToken, role: "host" },
    });
    await new Promise<void>((res) => host.on("connect", () => res()));
  });

  afterEach(async () => {
    host?.disconnect();
    await server?.close();
  });

  it("pages back through the full history without duplicates or gaps", async () => {
    const firstPage = await fetchOlderRolls(host, undefined, 25);
    expect(firstPage).toHaveLength(25);
    expect(firstPage[0].total).toBe(60);

    const secondPage = await fetchOlderRolls(host, firstPage[firstPage.length - 1].id, 25);
    expect(secondPage).toHaveLength(25);
    expect(secondPage[0].total).toBe(35);

    const ids = [...firstPage, ...secondPage].map((r) => r.id);
    expect(new Set(ids).size).toBe(50);
    expect([...ids].sort((a, b) => b - a)).toEqual(ids);

    const notes = await fetchOlderNotes(host, undefined, 25);
    expect(notes).toHaveLength(25);
    expect(notes[0].title).toBe("Entry 60");
  });

  it("keeps the join link on the campaign slice in broadcasts, not just the first snapshot", async () => {
    const code = server.db.getState(campaignId, "host", null, "").campaign.code;
    const { port } = server.httpServer.address() as { port: number };

    const campaignSlices: Array<{ joinUrl: string }> = [];
    let initialJoinUrl = "";
    let seenFirst = false;
    host.on("state", (incoming) => {
      if (!seenFirst) {
        seenFirst = true;
        initialJoinUrl = incoming.slices.campaign.joinUrl;
        return;
      }
      if (incoming.slices.campaign) campaignSlices.push(incoming.slices.campaign);
    });
    host.disconnect();
    host.connect();
    await new Promise<void>((res) => host.on("connect", () => res()));
    await new Promise((res) => setTimeout(res, 50));

    // A second device changes tableReadiness, so the next broadcast carries the campaign slice.
    const joined = server.db.joinCampaign(code);
    const player: Socket = Client(`http://localhost:${port}`, {
      auth: { code, token: joined!.token, role: "player" },
    });
    await new Promise<void>((res) => player.on("connect", () => res()));
    await new Promise((resolve) => {
      host.emit("combat:start", { name: "Skirmish", monsters: [{ name: "Owlbear", hp: 20, ac: 13, morale: 8 }] }, resolve);
    });
    await new Promise((res) => setTimeout(res, 50));
    player.disconnect();

    expect(initialJoinUrl).toContain(`/play?code=${code}`);
    expect(campaignSlices.length).toBeGreaterThan(0);
    for (const campaign of campaignSlices) {
      expect(campaign.joinUrl).toContain(`/play?code=${code}`);
    }
  });

  it("delivers new rolls as append events and never re-broadcasts the slices", async () => {
    let state: CampaignState | null = null;
    const appendedRolls: RollRecord[] = [];
    const appendedNotes: WikiNote[] = [];
    let broadcastCarriedAppendOnlySlices = false;

    const { port } = server.httpServer.address() as { port: number };
    const created = server.db.joinCampaign(server.db.getState(campaignId, "host", null, "").campaign.code);
    const player: Socket = Client(`http://localhost:${port}`, {
      auth: { code: server.db.getState(campaignId, "host", null, "").campaign.code, token: created!.token, role: "player" },
    });

    player.on("state", (incoming) => {
      if (state === null) {
        state = buildStateFromSlices(incoming);
        return;
      }
      if (incoming.slices.rolls !== undefined || incoming.slices.notes !== undefined) {
        broadcastCarriedAppendOnlySlices = true;
      }
      state = patchStateWithSlices(state, incoming);
    });
    player.on("roll:appended", (roll: RollRecord) => appendedRolls.push(roll));
    player.on("note:appended", (note: WikiNote) => appendedNotes.push(note));

    await new Promise<void>((res) => player.on("connect", () => res()));
    await new Promise((res) => setTimeout(res, 50));

    const initialRolls = state!.rolls.length;
    expect(initialRolls).toBeGreaterThan(0);

    const hostState = () => server.db.getState(campaignId, "host", null, "");
    await new Promise((resolve) => {
      host.emit("combat:start", { name: "Skirmish", monsters: [{ name: "Owlbear", hp: 20, ac: 13, morale: 8 }] }, resolve);
    });
    const ack = await new Promise<{ ok: boolean }>((resolve) => {
      host.emit("combat:update_hp", {
        combatantId: hostState().activeCombat!.combatants[0].id,
        delta: -1,
        actionId: createActionId(),
        expectedRevision: hostState().campaign.revision,
      }, resolve);
    });
    expect(ack.ok).toBe(true);
    await new Promise((res) => setTimeout(res, 50));

    expect(appendedRolls.length).toBeGreaterThan(0);
    expect(broadcastCarriedAppendOnlySlices).toBe(false);

    // An appended roll is shaped exactly like one read back through a page.
    const paged = await fetchOlderRolls(player, undefined, 5);
    const sameRoll = paged.find((r) => r.id === appendedRolls[0].id);
    expect(sameRoll).toEqual(appendedRolls[0]);

    player.disconnect();
    expect(appendedNotes).toEqual([]);
  });
});
