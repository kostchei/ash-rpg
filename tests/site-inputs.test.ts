import { describe, expect, it } from "vitest";
import { BESTIARY_ENTRIES } from "../src/shared/bestiary-data.js";
import { QUEST_RISK_LEVELS } from "../src/shared/danger.js";
import { PATH_FLAVOR_PROFILES, pathFlavor } from "../src/shared/path-flavor.js";
import { SITE_OBJECTIVE_TYPES } from "../src/shared/site-objectives.js";
import { PROMPT_NOUNS, PROMPT_VERBS, TARGET_FORMS } from "../src/shared/site-oracles.js";
import { TAROT_DECK, TAROT_FACETS } from "../src/shared/tarot-deck.js";
import {
  ACT_LEVEL_BANDS, SITE_KINDS, SITE_SIZES, eligibleMonsters, generateSiteInputs,
  renderSiteInputBrief, siteSizeForRoll,
} from "../src/server/generators/site-inputs.js";
import { OBJECTIVE_PATH_PROFILES } from "../src/server/generators/site-objectives.js";

const ACTS = [1, 2, 3] as const;
const PATH_IDS = Object.keys(PATH_FLAVOR_PROFILES);
const PERSON_KINDS = ["rescue_captive", "rescue_companion", "assassinate_leader"];
const ITEM_KINDS = ["recover_relic", "treasure_cache"];
const CREATURE_KINDS = ["defeat_guardian", "monster_eggs"];
const MATERIAL_KINDS = ["harvest_components", "exotic_materials"];
const PASSAGE_KINDS = ["secure_chokepoint", "clear_border", "secure_descent"];
const EFFECT_KINDS = ["lift_curse", "break_ward"];

/** Enough seeds to see every objective kind come up across the paths. */
function everyBundle(seeds = 6) {
  const bundles = [];
  for (const pathId of PATH_IDS) {
    for (const act of ACTS) {
      for (let index = 0; index < seeds; index++) {
        bundles.push(generateSiteInputs({ pathId, act, siteId: `s${index}`, seed: `seed_${index}` }));
      }
    }
  }
  return bundles;
}

function everyObjective(seeds = 6) {
  return everyBundle(seeds).flatMap((bundle) => bundle.objectives);
}

describe("Path flavour profiles", () => {
  it("names monsters the bestiary actually has", () => {
    const known = new Set(BESTIARY_ENTRIES.map((entry) => entry.id));
    for (const [pathId, profile] of Object.entries(PATH_FLAVOR_PROFILES)) {
      for (const id of profile.signatureMonsters) {
        expect(known.has(id), `${pathId} signature "${id}" is not in the bestiary`).toBe(true);
      }
    }
  });

  it("covers every path that has an evidence profile", () => {
    for (const pathId of Object.keys(OBJECTIVE_PATH_PROFILES)) {
      expect(() => pathFlavor(pathId), `no flavour for ${pathId}`).not.toThrow();
    }
  });

  it("can field monsters in every act band", () => {
    for (const pathId of PATH_IDS) {
      for (const act of ACTS) {
        expect(eligibleMonsters(pathFlavor(pathId), act).length, `${pathId} act ${act}`).toBeGreaterThan(0);
      }
    }
  });

  it("refuses an unknown path rather than defaulting", () => {
    expect(() => pathFlavor("not_a_path")).toThrow(/No path flavour profile/);
  });
});

describe("Site oracles", () => {
  it("supplies a target form for all fifteen objective kinds", () => {
    for (const kind of SITE_OBJECTIVE_TYPES) {
      expect(TARGET_FORMS[kind]?.length, `no target forms for ${kind}`).toBeGreaterThan(0);
    }
  });

  it("carries the full SoloDark d100 prompt columns", () => {
    expect(PROMPT_VERBS).toHaveLength(100);
    expect(PROMPT_NOUNS).toHaveLength(100);
    expect(PROMPT_VERBS[0]).toBe("Stop");
    expect(PROMPT_NOUNS[0]).toBe("Fault");
    expect(PROMPT_VERBS[99]).toBe("Release");
    expect(PROMPT_NOUNS[99]).toBe("Power");
  });
});

describe("Tarot deck", () => {
  it("reads every facet of every card", () => {
    expect(TAROT_DECK.length).toBeGreaterThan(0);
    for (const card of TAROT_DECK) {
      for (const facet of TAROT_FACETS) {
        expect(card.upright[facet]?.length, `${card.title} upright ${facet}`).toBeGreaterThan(0);
        expect(card.reversed[facet]?.length, `${card.title} reversed ${facet}`).toBeGreaterThan(0);
      }
    }
  });

  it("has no PDF line-break hyphens left in it", () => {
    for (const card of TAROT_DECK) {
      const text = [card.description, ...TAROT_FACETS.flatMap((f) => [card.upright[f], card.reversed[f]])].join(" ");
      expect(text, `${card.title} still hyphenated`).not.toMatch(/[a-z]- [a-z]/);
    }
  });

  it("has unique card ids", () => {
    expect(new Set(TAROT_DECK.map((card) => card.id)).size).toBe(TAROT_DECK.length);
  });
});

describe("Site input generation", () => {
  const base = { pathId: "the_mind_below", act: 2, siteId: "site_x", seed: "seed_a" } as const;

  it("is deterministic for a seed and varies with it", () => {
    expect(generateSiteInputs(base)).toEqual(generateSiteInputs(base));
    expect(generateSiteInputs({ ...base, seed: "seed_b" })).not.toEqual(generateSiteInputs(base));
  });

  it("draws exactly one card, one orientation, one facet", () => {
    for (const bundle of everyBundle(2)) {
      expect(TAROT_FACETS).toContain(bundle.card.facet);
      expect(["upright", "reversed"]).toContain(bundle.card.orientation);
      expect(bundle.card.meaning.length).toBeGreaterThan(0);
      const card = TAROT_DECK.find((entry) => entry.id === bundle.card.cardId);
      expect(card, bundle.card.cardId).toBeDefined();
      expect(bundle.card.meaning).toBe(card![bundle.card.orientation][bundle.card.facet]);
    }
  });

  it("gives every objective kind the content that name needs", () => {
    for (const { kind, target } of everyObjective()) {
      expect(target.name.length, kind).toBeGreaterThan(0);
      expect(Boolean(target.person), `${kind} person`).toBe(PERSON_KINDS.includes(kind));
      expect(Boolean(target.item), `${kind} item`).toBe(ITEM_KINDS.includes(kind));
      expect(Boolean(target.brood), `${kind} brood`).toBe(CREATURE_KINDS.includes(kind));
      expect(Boolean(target.material), `${kind} material`).toBe(MATERIAL_KINDS.includes(kind));
      expect(Boolean(target.obstruction), `${kind} obstruction`).toBe(PASSAGE_KINDS.includes(kind));
      expect(Boolean(target.effect), `${kind} effect`).toBe(EFFECT_KINDS.includes(kind));
      expect(Boolean(target.subject), `${kind} subject`).toBe(kind === "learn_secret");

      if (target.person) expect(target.name).toContain(target.person.className);
      if (target.item) {
        expect(target.name).toContain(target.item.description);
        // A relic or named cache is worth the trip.
        expect(["fabulous", "legendary"]).toContain(target.item.quality);
      }
      if (target.brood) expect(target.name).toContain(target.brood.name);
      if (target.material) expect(target.name).toContain(target.material.substance);
      if (target.obstruction) expect(target.name).toContain(target.obstruction);
      if (target.effect) expect(target.name).toContain(target.effect);
      if (target.subject) expect(target.name).toContain(target.subject);
    }
  });

  it("reaches all fifteen objective kinds", () => {
    const kinds = new Set<string>();
    for (let index = 0; index < 4000 && kinds.size < SITE_OBJECTIVE_TYPES.length; index++) {
      const act = ((index % 3) + 1) as 1 | 2 | 3;
      for (const objective of generateSiteInputs({ pathId: "the_mind_below", act, siteId: `k${index}`, seed: `k${index}` }).objectives) {
        kinds.add(objective.kind);
      }
    }
    for (const kind of SITE_OBJECTIVE_TYPES) expect(kinds.has(kind), `${kind} never generated`).toBe(true);
  });

  it("only lays eggs for creatures that lay", () => {
    for (const objective of everyObjective(8)) {
      if (objective.kind !== "monster_eggs") continue;
      expect(["Aberration", "Beast", "Dragon", "Monstrosity", "Ooze", "Plant"], objective.target.brood!.name)
        .toContain(objective.target.brood!.family);
    }
  });

  it("carries one objective per section, sized by the d6", () => {
    for (let face = 1; face <= 6; face++) {
      const bundle = generateSiteInputs({ ...base, sizeRoll: face });
      expect(bundle.objectives).toHaveLength(bundle.site.sectionSizes.length);
      expect(bundle.site.size).toBe(siteSizeForRoll(face));
      expect(bundle.site.areas).toBe(bundle.site.sectionSizes.reduce((sum, size) => sum + size, 0));
      const marks = bundle.objectives.map((objective) => objective.mark);
      expect(new Set(marks).size).toBe(marks.length);
    }
    // A large site is one big level with a single objective.
    expect(generateSiteInputs({ ...base, sizeRoll: 6 }).objectives).toHaveLength(1);
    expect(generateSiteInputs({ ...base, sizeRoll: 4 }).objectives).toHaveLength(2);
    expect(generateSiteInputs({ ...base, sizeRoll: 1 }).objectives).toHaveLength(3);
  });

  it("makes similar sections one job at distinct places, and different ones distinct jobs", () => {
    let similar = 0;
    let different = 0;
    for (const bundle of everyBundle(8)) {
      if (bundle.objectives.length < 2) continue;
      const kinds = bundle.objectives.map((objective) => objective.kind);
      const forms = bundle.objectives.map((objective) => objective.target.form);
      const names = bundle.objectives.map((objective) => objective.target.name);
      if (bundle.objectiveMode === "similar") {
        similar++;
        expect(new Set(kinds).size, kinds.join(", ")).toBe(1);
      } else {
        different++;
        expect(new Set(kinds).size, kinds.join(", ")).toBe(kinds.length);
      }
      // Either way, "go to those places" needs the places to differ.
      expect(new Set(forms).size, forms.join(", ")).toBe(forms.length);
      expect(new Set(names).size).toBe(names.length);
    }
    expect(similar).toBeGreaterThan(0);
    expect(different).toBeGreaterThan(0);
  });

  it("keeps every guardian inside the act's level band", () => {
    for (const pathId of PATH_IDS) {
      for (const act of ACTS) {
        const band = ACT_LEVEL_BANDS[act];
        for (const { guardian } of generateSiteInputs({ pathId, act, siteId: "s", seed: "band" }).objectives) {
          expect(guardian.level, `${pathId} act ${act}: ${guardian.name}`).toBeGreaterThanOrEqual(band.min);
          expect(guardian.level, `${pathId} act ${act}: ${guardian.name}`).toBeLessThanOrEqual(band.max);
        }
      }
    }
  });

  it("describes the site's size, danger, and kind", () => {
    for (const bundle of everyBundle(2)) {
      expect(SITE_SIZES).toContain(bundle.site.size);
      expect(QUEST_RISK_LEVELS).toContain(bundle.site.danger);
      expect(SITE_KINDS).toContain(bundle.site.kind);
      expect(bundle.site.areas).toBeGreaterThan(0);
    }
  });

  it("never offers a site as safe", () => {
    for (const bundle of everyBundle(3)) {
      expect(bundle.site.danger).not.toBe("safe");
    }
  });

  it("folds a known zone in and refuses an unknown one", () => {
    const bundle = generateSiteInputs({ ...base, zoneId: "dwellers_in_the_deep" });
    expect(bundle.zone?.name).toBe("Morzamotha");
    expect(bundle.zone?.hazard.length).toBeGreaterThan(0);
    expect(generateSiteInputs(base).zone).toBeUndefined();
    expect(() => generateSiteInputs({ ...base, zoneId: "nowhere" })).toThrow(/No zone manifest/);
  });

  it("accepts save-side path aliases", () => {
    const bundle = generateSiteInputs({ pathId: "the_stolen_dawn", act: 1, siteId: "s", seed: "alias" });
    expect(bundle.pathLabel).toBe("The Stolen Dawn");
  });

  it("renders a brief holding all five inputs and nothing more", () => {
    const bundle = generateSiteInputs({ ...base, zoneId: "dwellers_in_the_deep" });
    const brief = renderSiteInputBrief(bundle);
    expect(brief).toContain(bundle.name.full);
    expect(brief).toContain(bundle.card.title);
    for (const objective of bundle.objectives) {
      expect(brief).toContain(objective.target.name);
      expect(brief).toContain(objective.prompt.phrase);
    }
    expect(brief).toContain(bundle.zone!.name);
    expect(brief).toContain(bundle.site.kind);
    // Frame lines, plus two per objective.
    const body = brief.split("\n").filter((line) => line.trim().length > 0);
    expect(body.length).toBeLessThanOrEqual(6 + bundle.objectives.length * 2);
  });
});
