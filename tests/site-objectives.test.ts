import { describe, expect, it } from "vitest";
import { attachSiteObjectives, OBJECTIVE_PATH_PROFILES } from "../src/server/generators/site-objectives.js";
import { generateSiteLayout } from "../src/server/generators/site-layout.js";
import { SITE_OBJECTIVE_TYPES } from "../src/shared/site-objectives.js";
import { getEligibleClasses, UA_CLASS_STAT_ORDER } from "../src/server/rules.js";

describe("Per-section objective selector", () => {
  it("covers the merged vocabulary and all 22 paths across three acts and six size rolls", () => {
    expect(SITE_OBJECTIVE_TYPES).toHaveLength(15);
    expect(Object.keys(OBJECTIVE_PATH_PROFILES)).toHaveLength(22);
    for (const pathId of Object.keys(OBJECTIVE_PATH_PROFILES)) for (const act of [1, 2, 3]) for (const face of [1, 2, 3, 4, 5, 6]) {
      const graph = generateSiteLayout(1, "site", "Test", face);
      attachSiteObjectives(graph, { pathId, act, seed: `${pathId}:${act}:${face}` });
      const objectives = graph.nodes.flatMap(n => n.objective ? [n.objective] : []);
      expect(objectives).toHaveLength(graph.siteStructure!.sections.length);
      for (const section of graph.siteStructure!.sections) {
        expect(graph.nodes.filter(n => section.roomIds.includes(n.id) && n.objective)).toHaveLength(1);
        expect(graph.nodes.filter(n => section.roomIds.includes(n.id) && n.clues?.length)).toHaveLength(2);
      }
      for (const objective of objectives) {
        expect(objective.generated!.clue).toContain(OBJECTIVE_PATH_PROFILES[pathId].subjects[act - 1]);
        expect(objective.generated!.completion.length).toBeGreaterThan(20);
      }
      const kinds = new Set(objectives.map(o => o.generated!.kind));
      expect(kinds.size).toBe(graph.siteStructure!.objectiveMode === "similar" ? 1 : objectives.length);
      expect(new Set(objectives.map(o => o.deedId)).size).toBe(objectives.length);
    }
  });
  it("uses both modes across seeds, varies targets, and reproduces the exact saved inputs", () => {
    let similar = 0;
    const kinds = new Set<string>();
    for (let seed = 0; seed < 400; seed++) {
      const a = generateSiteLayout(1, "site", "Test", 1), b = structuredClone(a);
      const options = { pathId: "ithaqua", act: 2, seed: String(seed) };
      attachSiteObjectives(a, options); attachSiteObjectives(b, options);
      expect(a).toEqual(b);
      if (a.siteStructure!.objectiveMode === "similar") similar++;
      const objectives = a.nodes.flatMap(n => n.objective ? [n.objective] : []);
      expect(new Set(objectives.map(o => o.generated!.target)).size).toBe(3);
      objectives.forEach(o => kinds.add(o.generated!.kind));
    }
    expect(similar).toBeGreaterThan(150); expect(similar).toBeLessThan(250);
    expect(kinds.size).toBe(15);
  });
  it("staffs rescue objectives with a classed, gearless NPC and leaves other kinds alone", () => {
    let rescues = 0;
    const methods = new Set<string>();
    for (let seed = 0; seed < 200; seed++) {
      const graph = generateSiteLayout(1, "site", "Test", 1);
      attachSiteObjectives(graph, { pathId: "ithaqua", act: 1, seed: `rescue:${seed}` });
      for (const objective of graph.nodes.flatMap((n) => (n.objective ? [n.objective] : []))) {
        const generated = objective.generated!;
        const isRescue = generated.kind === "rescue_captive" || generated.kind === "rescue_companion";
        if (!isRescue) {
          expect(generated.rescuedNpc).toBeUndefined();
          continue;
        }
        rescues++;
        const npc = generated.rescuedNpc!;
        methods.add(npc.generationMethod);
        expect(UA_CLASS_STAT_ORDER[npc.className]).toBeDefined();
        if (npc.generationMethod === "iron_man") {
          expect(getEligibleClasses(npc.abilities)).toContain(npc.className);
        }
        expect(npc.gear).toEqual([]);
        expect(generated.completion).toContain("no gear");
      }
    }
    expect(rescues).toBeGreaterThan(0);
    expect(methods.size).toBe(2);
  });

  it("preserves the opening rescue deed only in the terminal section", () => {
    const graph = generateSiteLayout(1, "waterworks", "Test", 1);
    attachSiteObjectives(graph, { pathId: "the_mind_below", act: 1, seed: "rescue",
      primary: { title: "Rescue the Surveyor", deedId: "rescue_surveyor" } });
    const rooms = graph.nodes.filter(n => n.objective?.deedId === "rescue_surveyor");
    expect(rooms).toHaveLength(1);
    expect(rooms[0].objective!.generated!.target).toBe("Surveyor Jonathan Vane");
    expect(graph.siteStructure!.sections[2].roomIds).toContain(rooms[0].id);
  });
  it("treasure objectives place physical items, without replacing existing room treasure", () => {
    const seen = new Set<string>();
    for (let seed = 0; seed < 100; seed++) {
      const graph = generateSiteLayout(1, "site", "Test", 1);
      graph.nodes.forEach(n => { n.treasure = { coins: 12, items: ["existing item"] }; });
      attachSiteObjectives(graph, { act: 1, seed: String(seed) });
      for (const room of graph.nodes) if (room.objective?.generated?.treasureItem) {
        seen.add(room.objective.generated.kind);
        expect(room.treasure!.items).toContain(room.objective.generated.treasureItem);
        expect(room.treasure!.items).toContain("existing item");
        expect(room.treasure!.coins).toBe(12);
      }
    }
    expect(seen.size).toBe(5);
  });
});
