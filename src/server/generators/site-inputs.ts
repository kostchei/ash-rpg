import { BESTIARY_ENTRIES, type BestiaryReferenceEntry } from "../../shared/bestiary-data.js";
import { randomCharacterName } from "../../shared/character-names.js";
import type { QuestRiskLevel } from "../../shared/danger.js";
import { canonicalPathId, pathFlavor, type PathFlavorProfile } from "../../shared/path-flavor.js";
import {
  CURSE_EFFECTS, MATERIAL_MEASURES, MATERIAL_SUBSTANCES, OBSTRUCTIONS,
  PROMPT_NOUNS, PROMPT_VERBS, SITE_FORMS, SITE_QUALIFIERS, SITE_SUBJECTS,
  TARGET_FORMS, WARD_TRIGGERS,
} from "../../shared/site-oracles.js";
import { SITE_OBJECTIVE_TYPES, type SiteObjectiveType } from "../../shared/site-objectives.js";
import { TAROT_DECK, TAROT_FACETS, type TarotFacet, type TarotOrientation } from "../../shared/tarot-deck.js";
import { STATIC_ZONE_MANIFESTS } from "../../shared/zone-manifests.js";
import { rollDie, rollDungeonNpc, type RandomSource } from "../rules.js";
import { rollCoreTreasure } from "../rewards/core-treasure.js";
import { deterministicPickOne, deterministicWeightedPick, deriveStream } from "./prng.js";
import { siteSectionSizes } from "./site-layout.js";
import { OBJECTIVE_PATH_PROFILES } from "./site-objectives.js";

/**
 * Site input generation. One bundle is five things and nothing else:
 *
 *   1. the site's name
 *   2. one card, upright or reversed, read against one randomly chosen facet
 *   3. one objective - a verb and noun, and one generated target name
 *   4. the zone
 *   5. the site's size, danger, and kind
 *
 * It stops before finished prose. The bundle is what a writer - or a model -
 * turns into the site's actual text, weaving the objective into the path.
 */

const NPC_ANCESTRIES = ["Human", "Human", "Dwarf", "High Elf", "Halfling", "Wood Elf"];

/** Level band the site's occupants are drawn from, by act. */
export const ACT_LEVEL_BANDS: Record<1 | 2 | 3, { min: number; max: number }> = {
  1: { min: 0, max: 3 },
  2: { min: 2, max: 6 },
  3: { min: 5, max: 10 },
};

export const SITE_SIZES = ["small", "medium", "large"] as const;
export type SiteSize = typeof SITE_SIZES[number];

/**
 * The site's d6 decides its sections, and each section carries one objective.
 * A large site is one big level with a single objective; a small one is three
 * short levels with three.
 */
export function siteSizeForRoll(face: number): SiteSize {
  if (!Number.isInteger(face) || face < 1 || face > 6) throw new Error("Site size requires a d6 result");
  return face === 6 ? "large" : face >= 3 ? "medium" : "small";
}

/** How the table tells one section's target from another. */
export const SECTION_MARKS = ["copper-marked", "split-stone", "white-thread"] as const;

/** The kinds of place a site can be, as the objective selector's site families name them. */
export const SITE_KINDS = ["caves", "deep tunnels", "ruins", "tomb"] as const;
export type SiteKind = typeof SITE_KINDS[number];

/** Danger rises across the acts; a site is never offered as Safe. */
const DANGER_WEIGHTS: Record<1 | 2 | 3, Array<{ item: QuestRiskLevel; weight: number }>> = {
  1: [{ item: "unsafe", weight: 5 }, { item: "risky", weight: 3 }, { item: "deadly", weight: 1 }],
  2: [{ item: "unsafe", weight: 2 }, { item: "risky", weight: 5 }, { item: "deadly", weight: 2 }],
  3: [{ item: "unsafe", weight: 1 }, { item: "risky", weight: 3 }, { item: "deadly", weight: 5 }],
};

export interface GeneratedSiteName {
  form: string;
  qualifier: string;
  subject: string;
  full: string;
}

export interface GeneratedPrompt {
  verb: string;
  noun: string;
  /** "Conceal the Secret" - why this objective matters, not what it is. */
  phrase: string;
}

export interface TarotReading {
  cardId: string;
  title: string;
  orientation: TarotOrientation;
  description: string;
  /** The one facet this draw was read against. */
  facet: TarotFacet;
  meaning: string;
}

export interface GeneratedMonsterPick {
  id: string;
  name: string;
  family: string;
  level: number;
  /** True when drawn from the path's signature list rather than family weighting. */
  signature: boolean;
}

export interface GeneratedTarget {
  /** The one name the table hears. */
  name: string;
  /** The physical noun the name was built on, so sections do not repeat a place. */
  form: string;
  /** A person target carries a class; they come away with no gear. */
  person?: { name: string; ancestry: string; className: string; generationMethod: "iron_man" | "unearthed_arcana" };
  /** An item target is a real roll on the treasure table for this act's levels. */
  item?: { description: string; quality: string; valueGp: number };
  /** A harvest or extraction target: three usable samples of something named. */
  material?: { measure: string; substance: string };
  /** A curse or ward target: what it does, or what holds it closed. */
  effect?: string;
  /** A passage target: what is actually in the way. */
  obstruction?: string;
  /** A records target: the path concern those records are about. */
  subject?: string;
  /** An eggs target: whose clutch it is. */
  brood?: GeneratedMonsterPick;
}

export interface SiteInputBundle {
  pathId: string;
  pathLabel: string;
  act: 1 | 2 | 3;
  siteId: string;
  seed: string;
  /** 1. */
  name: GeneratedSiteName;
  /** 2. One card, one orientation, one facet. */
  card: TarotReading;
  /**
   * 3. One objective per section. A coin flip decides whether they are all the
   * same kind at distinct places - rescue all three farmers - or different
   * kinds: break the ward, kill the boss, rescue the farmer.
   */
  objectiveMode: "similar" | "different";
  objectives: SiteObjectiveInput[];
  /** 4. The zone this site sits in, when one is known. */
  zone?: { id: string; name: string; theme: string; biomes: string[]; hazard: string };
  /** 5. */
  site: {
    size: SiteSize;
    sizeRoll: number;
    sectionSizes: number[];
    areas: number;
    danger: QuestRiskLevel;
    kind: SiteKind;
  };
}

export interface SiteObjectiveInput {
  section: number;
  /** How this section's target is marked apart from the others. */
  mark: string;
  kind: SiteObjectiveType;
  prompt: GeneratedPrompt;
  target: GeneratedTarget;
  /** The creature holding it. */
  guardian: GeneratedMonsterPick;
}

export interface SiteInputOptions {
  pathId: string;
  act: 1 | 2 | 3;
  siteId: string;
  seed: string;
  /** Force the site's shape instead of rolling it; must be a d6 face. */
  sizeRoll?: number;
  /** Zone the site sits in; its manifest is folded into the brief when given. */
  zoneId?: string;
}

/** Objective kinds whose target is a person rather than a thing. */
const PERSON_KINDS: SiteObjectiveType[] = ["rescue_captive", "rescue_companion", "assassinate_leader"];

/** A guardian is a creature holding a threshold, not a classed NPC. */
const CREATURE_KINDS: SiteObjectiveType[] = ["defeat_guardian", "monster_eggs"];

/** Families that lay: a Priest does not have a clutch. */
const EGG_LAYING_FAMILIES = new Set(["Aberration", "Beast", "Dragon", "Monstrosity", "Ooze", "Plant"]);

/** Objective kinds whose target is a real item, rolled on the treasure table. */
const ITEM_KINDS: SiteObjectiveType[] = ["recover_relic", "treasure_cache"];

/** Objective kinds that come away with three usable samples of something. */
const MATERIAL_KINDS: SiteObjectiveType[] = ["harvest_components", "exotic_materials"];

/** Objective kinds whose target is a route, and so needs something blocking it. */
const PASSAGE_KINDS: SiteObjectiveType[] = ["secure_chokepoint", "clear_border", "secure_descent"];

/** One card, upright or reversed, read against one randomly chosen facet. */
export function drawTarot(rng: RandomSource): TarotReading {
  const card = deterministicPickOne(TAROT_DECK, rng);
  const orientation: TarotOrientation = rng(2) === 0 ? "upright" : "reversed";
  const facet = deterministicPickOne(TAROT_FACETS, rng);
  return {
    cardId: card.id, title: card.title, orientation, description: card.description,
    facet, meaning: card[orientation][facet],
  };
}

export function generateSiteName(profile: PathFlavorProfile, rng: RandomSource): GeneratedSiteName {
  // Half of each column is the path's own words, half the generic oracle.
  const pick = (generic: readonly string[], pathWords: readonly string[]): string =>
    deterministicPickOne(rng(2) === 0 ? pathWords : generic, rng);
  const form = pick(SITE_FORMS, profile.siteForms);
  const qualifier = pick(SITE_QUALIFIERS, profile.siteQualifiers);
  const subject = pick(SITE_SUBJECTS, profile.siteSubjects);
  return { form, qualifier, subject, full: `${form} of the ${qualifier} ${subject}` };
}

/**
 * Straight off the SoloDark d100s, rolled independently of the path. The pairing
 * is meant to be a little off: it says why the objective matters - rescuing the
 * person to conceal a secret - not what the objective is.
 */
export function generatePrompt(rng: RandomSource): GeneratedPrompt {
  const verb = deterministicPickOne(PROMPT_VERBS, rng);
  const noun = deterministicPickOne(PROMPT_NOUNS, rng);
  return { verb, noun, phrase: `${verb} the ${noun}` };
}

/** Monsters this path can field at this act's level band. */
export function eligibleMonsters(profile: PathFlavorProfile, act: 1 | 2 | 3): BestiaryReferenceEntry[] {
  const band = ACT_LEVEL_BANDS[act];
  const families = new Set(profile.familyWeights.map((w) => w.family as string));
  const signatures = new Set(profile.signatureMonsters);
  const pool = BESTIARY_ENTRIES.filter(
    (entry) =>
      entry.level >= band.min && entry.level <= band.max &&
      (families.has(entry.family) || signatures.has(entry.id)),
  );
  if (pool.length === 0) {
    throw new Error(
      `No bestiary entries for "${profile.label}" in act ${act} (levels ${band.min}-${band.max}). Widen familyWeights or the act band.`,
    );
  }
  return pool;
}

/**
 * `exclude` is a preference, not a constraint: a small act band can run out of
 * distinct creatures, and repeating one beats failing to populate a section.
 */
function pickMonster(
  profile: PathFlavorProfile, act: 1 | 2 | 3, rng: RandomSource,
  restrictTo?: ReadonlySet<string>, exclude: ReadonlySet<string> = new Set(),
): GeneratedMonsterPick {
  const all = eligibleMonsters(profile, act);
  const restricted = restrictTo ? all.filter((entry) => restrictTo.has(entry.family)) : all;
  if (restricted.length === 0) {
    throw new Error(
      `"${profile.label}" act ${act} has no creature of families ${[...restrictTo!].join(", ")}.`,
    );
  }
  const pool = restricted;
  const signatures = new Set(profile.signatureMonsters);
  const signaturePool = pool.filter((entry) => signatures.has(entry.id));
  const chosen = signaturePool.length > 0 && rng(2) === 0 ? signaturePool : pool;
  // Widen from the signature list to the full pool before repeating a creature.
  const candidates = [chosen, pool]
    .map((tier) => tier.filter((entry) => !exclude.has(entry.id)))
    .find((tier) => tier.length > 0) ?? chosen;
  const family = deterministicWeightedPick(
    profile.familyWeights.map((w) => ({ item: w.family as string, weight: w.weight })), rng,
  );
  const byFamily = candidates.filter((entry) => entry.family === family);
  const entry = deterministicPickOne(byFamily.length > 0 ? byFamily : candidates, rng);
  return {
    id: entry.id, name: entry.name, family: entry.family, level: entry.level,
    signature: signatures.has(entry.id),
  };
}

/**
 * One name, with the content that name needs to be actionable: a person has a
 * class, an item is a real treasure roll, a harvest names its substance, a curse
 * and a ward state what they do, a route states what blocks it, records state
 * what they are about, and a clutch names whose it is.
 */
function generateTarget(
  kind: SiteObjectiveType, profile: PathFlavorProfile, pathId: string, act: 1 | 2 | 3, rng: RandomSource,
  usedForms: ReadonlySet<string> = new Set(),
): GeneratedTarget {
  // "Go to those three places" only works if the three places differ.
  const forms = TARGET_FORMS[kind].filter((entry) => !usedForms.has(entry));
  const form = deterministicPickOne(forms.length > 0 ? forms : TARGET_FORMS[kind], rng);
  const epithet = deterministicPickOne(profile.epithets, rng);
  const belongsTo = deterministicPickOne(profile.subjects, rng);
  const place = `the ${epithet} ${form}`;

  if (PERSON_KINDS.includes(kind)) {
    const ancestry = NPC_ANCESTRIES[rng(NPC_ANCESTRIES.length)];
    const npc = rollDungeonNpc(rng);
    const name = randomCharacterName(ancestry, () => rng(1_000_000) / 1_000_000);
    const role = kind === "assassinate_leader"
      ? `${deterministicPickOne(profile.titles, rng)} of ${belongsTo}, at ${place}`
      : `held at ${place}`;
    return {
      form, name: `${name}, ${ancestry} ${npc.className}, ${role}`,
      person: { name, ancestry, className: npc.className, generationMethod: npc.method },
    };
  }

  if (ITEM_KINDS.includes(kind)) {
    // Worth the trip: a relic or a named cache rolls at Fabulous or better.
    const roll = rollCoreTreasure(ACT_LEVEL_BANDS[act].max, rng, "fabulous");
    return {
      form, name: `${roll.entry.description}, in ${place} of ${belongsTo}`,
      item: { description: roll.entry.description, quality: roll.quality, valueGp: roll.entry.valueGp },
    };
  }

  if (MATERIAL_KINDS.includes(kind)) {
    const measure = deterministicPickOne(MATERIAL_MEASURES, rng);
    const substance = deterministicPickOne(MATERIAL_SUBSTANCES, rng);
    return {
      form, name: `three ${measure} of ${substance}, from ${place}`,
      material: { measure, substance },
    };
  }

  if (CREATURE_KINDS.includes(kind)) {
    const laying = kind === "monster_eggs";
    const brood = pickMonster(profile, act, rng, laying ? EGG_LAYING_FAMILIES : undefined);
    return {
      name: laying
        ? `an intact ${brood.name} clutch in ${place}`
        : `the ${brood.name} holding ${place} of ${belongsTo}`,
      form, brood,
    };
  }

  if (kind === "lift_curse") {
    const effect = deterministicPickOne(CURSE_EFFECTS, rng);
    return { form, name: `${place}, on which ${effect}`, effect };
  }

  if (kind === "break_ward") {
    const effect = deterministicPickOne(WARD_TRIGGERS, rng);
    return { form, name: `${place} on ${belongsTo}, ${effect}`, effect };
  }

  if (PASSAGE_KINDS.includes(kind)) {
    const obstruction = deterministicPickOne(OBSTRUCTIONS, rng);
    return { form, name: `${place}, blocked by ${obstruction}`, obstruction };
  }

  // learn_secret: the records are about the path's concern for this act.
  const evidence = OBJECTIVE_PATH_PROFILES[pathId];
  const subject = evidence ? evidence.subjects[act - 1] : belongsTo;
  return { form, name: `${place} recording ${subject}`, subject };
}

export function generateSiteInputs(options: SiteInputOptions): SiteInputBundle {
  const { pathId, act, siteId, seed } = options;
  const profile = pathFlavor(pathId);
  const canonical = canonicalPathId(pathId);

  const name = generateSiteName(profile, deriveStream(seed, `${siteId}:name`));
  const card = drawTarot(deriveStream(seed, `${siteId}:card`));

  const siteRng = deriveStream(seed, `${siteId}:site`);
  const sizeRoll = options.sizeRoll ?? rollDie(6, siteRng);
  const sectionSizes = siteSectionSizes(sizeRoll);
  const site = {
    size: siteSizeForRoll(sizeRoll),
    sizeRoll,
    sectionSizes,
    areas: sectionSizes.reduce((total, size) => total + size, 0),
    danger: deterministicWeightedPick(DANGER_WEIGHTS[act], siteRng),
    kind: deterministicPickOne(SITE_KINDS, siteRng),
  };

  // Act weights which objectives come up, but every kind stays possible.
  const objectiveRng = deriveStream(seed, `${siteId}:objective`);
  const preferred: SiteObjectiveType[] = act === 1
    ? ["learn_secret", "rescue_captive", "treasure_cache", "secure_chokepoint"]
    : act === 2 ? ["harvest_components", "break_ward", "secure_descent", "exotic_materials"]
      : ["recover_relic", "lift_curse", "defeat_guardian", "clear_border"];
  const primaryKind = objectiveRng(2) === 0
    ? deterministicPickOne(preferred, objectiveRng)
    : deterministicPickOne(SITE_OBJECTIVE_TYPES, objectiveRng);

  // Half the time every section is the same job at a different place - rescue
  // all three farmers - and half the time they are distinct jobs.
  const objectiveMode = objectiveRng(2) === 0 ? "similar" : "different";
  const usedKinds = new Set<SiteObjectiveType>([primaryKind]);
  const usedGuardians = new Set<string>();
  const usedForms = new Set<string>();

  const objectives: SiteObjectiveInput[] = sectionSizes.map((_size, index) => {
    const kind = objectiveMode === "similar" || index === 0
      ? primaryKind
      : deterministicPickOne(SITE_OBJECTIVE_TYPES.filter((type) => !usedKinds.has(type)), objectiveRng);
    usedKinds.add(kind);
    const sectionRng = deriveStream(seed, `${siteId}:section:${index + 1}`);
    const guardian = pickMonster(profile, act, sectionRng, undefined, usedGuardians);
    usedGuardians.add(guardian.id);
    const target = generateTarget(kind, profile, canonical, act, sectionRng, usedForms);
    usedForms.add(target.form);
    return {
      section: index + 1,
      mark: SECTION_MARKS[index],
      kind,
      prompt: generatePrompt(sectionRng),
      target,
      guardian,
    };
  });

  const zoneManifest = options.zoneId ? STATIC_ZONE_MANIFESTS[options.zoneId] : undefined;
  if (options.zoneId && !zoneManifest) {
    throw new Error(`No zone manifest for "${options.zoneId}".`);
  }
  const zoneRng = deriveStream(seed, `${siteId}:zone`);
  const zone = zoneManifest
    ? {
      id: zoneManifest.id, name: zoneManifest.name, theme: zoneManifest.theme,
      biomes: zoneManifest.biomePalette.slice(0, 4),
      hazard: deterministicPickOne(zoneManifest.hazardTable, zoneRng),
    }
    : undefined;

  return {
    pathId, pathLabel: profile.label, act, siteId, seed,
    name, card, objectiveMode, objectives, zone, site,
  };
}

/** The brief a writer works from: the five inputs, and nothing else. */
export function renderSiteInputBrief(bundle: SiteInputBundle): string {
  const { name, card, objectives, zone, site } = bundle;
  const lines: string[] = [
    `# ${name.full}`,
    "",
    `**Context.** ${card.title} (${card.orientation}), as ${card.facet.replace(/_/g, " ")}: ${card.meaning}`,
    "",
    `**Objectives.** ${objectives.length} across ${site.sectionSizes.length} section(s), ${bundle.objectiveMode}`,
  ];
  for (const objective of objectives) {
    const guardian = objective.guardian;
    lines.push("");
    lines.push(`${objective.section}. (${objective.mark}) ${objective.kind} - ${objective.target.name}`);
    lines.push(`   Why: ${objective.prompt.phrase}. Held by ${guardian.name} (level ${guardian.level} ${guardian.family}${guardian.signature ? ", signature" : ""}).`);
  }
  lines.push("");
  lines.push(`**Zone.** ${zone ? `${zone.name} - ${zone.theme}; ${zone.hazard}` : "none"}`);
  lines.push(`**Site.** ${site.size} (d6=${site.sizeRoll}, ${site.sectionSizes.join(" + ")} = ${site.areas} areas), ${site.danger}, ${site.kind}`);
  lines.push(`**Path.** ${bundle.pathLabel}, act ${bundle.act}`);
  return lines.join("\n");
}
