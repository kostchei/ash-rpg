import { describe, expect, it } from "vitest";
import { generateCampaignComplication, generateCampaignPressurePreset } from "../src/server/generators/campaign.js";
import { generateNpc } from "../src/server/generators/npc.js";
import { generateSettlement } from "../src/server/generators/settlement.js";
import type { Character } from "../src/shared/types.js";

describe("Settlement, NPC, & Campaign Generators", () => {
  it("generates a complete settlement with scale, tavern, and rumors", () => {
    const s = generateSettlement();
    expect(s.scale.name).toBeDefined();
    expect(s.tavern.name).toBeDefined();
    expect(s.tavern.vibe).toBeDefined();
    expect(s.rumor.rumor).toBeDefined();
  });

  it("generates an NPC with party-skewed demographics and regional subclass", () => {
    const party: Character[] = [
      {
        id: 1,
        name: "A",
        ancestry: "Dwarf",
        className: "Fighter",
        level: 1,
        hp: 10,
        maxHp: 10,
        ac: 12,
        gold: 10,
        gearSlots: 10,
        abilities: { str: 14, dex: 10, con: 14, int: 10, wis: 10, cha: 10 },
        anchors: { homeland: "", landmark: "", nemesis: "" },
      },
    ];

    const npc = generateNpc(party, "red_sands");
    expect(npc.ancestry).toBeDefined();
    expect(npc.className).toBeDefined();
    expect(npc.demeanor).toBeDefined();
    expect(npc.motive).toBeDefined();
    expect(npc.retainerStats.level).toBeGreaterThanOrEqual(1);
    expect(npc.retainerStats.hp).toBeGreaterThanOrEqual(1);
  });

  it("generates campaign complications and pressure presets", () => {
    const comp = generateCampaignComplication([]);
    expect(comp.complication).toBeDefined();

    const pressure = generateCampaignPressurePreset("pursuit");
    expect(pressure.name).toContain("Ash Rider");
    expect(pressure.threshold).toBe(5);
  });
});
