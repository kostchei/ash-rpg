import type { DungeonGraphState } from "../../shared/types.js";
import { SITE_OBJECTIVE_TYPES, type RescuedNpc, type SiteObjectiveType } from "../../shared/site-objectives.js";
import { rollDungeonNpc } from "../rules.js";
import { createRandomSource } from "./prng.js";

const RESCUE_KINDS: SiteObjectiveType[] = ["rescue_captive", "rescue_companion"];

const RESCUED_NAMES = ["Mera Voss", "Orrin Pell", "Tessa Rook", "Dain Holt", "Sella Moss", "Hesk Vale",
  "Ilda Warren", "Cobb Ferrow", "Neris Dain", "Wyl Ashken", "Pell Marrow", "Odette Crane"];
const RESCUED_ANCESTRIES = ["Human", "Human", "Dwarf", "High Elf", "Halfling", "Wood Elf"];

/** Rescue objectives hold a real classed NPC, stripped of everything they carried. */
function rollRescuedNpc(rng: ReturnType<typeof createRandomSource>): RescuedNpc {
  const npc = rollDungeonNpc(rng);
  return {
    name: RESCUED_NAMES[rng(RESCUED_NAMES.length)],
    ancestry: RESCUED_ANCESTRIES[rng(RESCUED_ANCESTRIES.length)],
    className: npc.className,
    generationMethod: npc.method,
    abilities: npc.scores,
    gear: [],
  };
}

/** Local evidence subjects by act, plus resources and people appropriate to the process.
 * These attach useful investigative work, not automatic ending predicates.
 */
export const OBJECTIVE_PATH_PROFILES: Record<string, {
  subjects: [string, string, string]; resource: string; witness: string;
}> = {
  domains_of_dread: { subjects: ["exceptions to the boundary rules", "the obligations sustaining the domain", "the conditions of release"], resource: "boundary charm", witness: "escaped resident" },
  the_mind_below: { subjects: ["the route used to transport captives", "the supply of psychic control installations", "the maintenance of the held-mind network"], resource: "psychic shielding crystal", witness: "escaped captive" },
  titans: { subjects: ["damage to the prison seals", "the supply of binding components", "the sequence for restoring the restraints"], resource: "binding fragment", witness: "prison warden" },
  tharizdun: { subjects: ["places missing from newer maps", "surviving references to erased distinctions", "the boundaries needed to contain unmaking"], resource: "preserved reference stone", witness: "surviving chronicler" },
  bane: { subjects: ["the issuers of seizure writs", "the authority supporting local enforcement", "the succession of the enabling office"], resource: "seal of office", witness: "dispossessed clerk" },
  cthulhu: { subjects: ["dreamers' movements before the tide", "the connections between arrival piers", "the projection chamber's binding cadence"], resource: "ward-salt plate", witness: "tidal surveyor" },
  nyarlathotep: { subjects: ["the beneficiary of the custody warrants", "the issuers who can revoke the mandates", "the designation used by the mask's maker"], resource: "maker's seal", witness: "warrant clerk" },
  shub_niggurath: { subjects: ["food consumed by the new nurseries", "the links carrying forced propagation", "the regulator's bounded feeding cycle"], resource: "regulator sample", witness: "independent herbalist" },
  hastur: { subjects: ["the privileges attached to accepted roles", "the conditions of witnessed withdrawal", "the originating performance's cancellation terms"], resource: "original stage token", witness: "former performer" },
  yog_sothoth: { subjects: ["the destinations of displaced doors", "the keyed edges of the junction network", "the capacity and return edge of containment"], resource: "attunable threshold key", witness: "stranded courier" },
  tsathoggua: { subjects: ["deliveries missing from the depot accounts", "the reserves stored behind the refuge conduits", "the signatories of the sustaining tribute agreements"], resource: "tribute-release seal", witness: "rescued drover" },
  ithaqua: { subjects: ["the last measured thaw at the pass", "the fuel and shelters on the anchor route", "the winter spring's exposed replenishment interval"], resource: "fire-shrine ember", witness: "winter guide" },
  tcho_tcho: { subjects: ["the obligations attached to clinic care", "the supplies needed by independent providers", "the termination terms at collection"], resource: "medical consignment", witness: "chapter physician" },
  azathoth: { subjects: ["the activations captured by the furnace boundary", "the collector connections and grounding points", "the repair sequence of the counter-pattern"], resource: "grounding element", witness: "municipal engineer" },
  angels: { subjects: ["the injury named in the charge", "the evidence and restitution required at hearing", "the conditions of a binding release"], resource: "authenticated testimony", witness: "protected witness" },
  maruts: { subjects: ["the original act named in the enforcement order", "the means to correct the recorded violation", "the authority that can cancel further enforcement"], resource: "original legal instrument", witness: "record keeper" },
  witch_king: { subjects: ["the destination of collected battlefield dead", "the depots supplying conversion", "the indispensable apparatus sustaining the front"], resource: "preservation reagent", witness: "burial keeper" },
  apocalypse_cult: { subjects: ["the buyers of consecrated components", "the dependencies of the manifestation recipe", "the dismantling sequence at the invocation site"], resource: "unconsecrated ritual component", witness: "former ritual assistant" },
  vanishing_middle: { subjects: ["the competing claims to the crossing", "the institutions still operating independently", "the deeds supporting an unclaimed settlement"], resource: "unclaimed civic charter", witness: "neutral mediator" },
  githyanki: { subjects: ["the shortfall between arrivals and grain stores", "the capacity of the proposed settlement", "the supplies needed through the final arrival wave"], resource: "provision contract", witness: "refugee quartermaster" },
  slumbering_catastrophe: { subjects: ["the disturbances that wake the sleeper", "the trials of earlier countermeasures", "the conditions needed for the prepared confrontation"], resource: "countermeasure sample", witness: "survivor of an earlier hunt" },
  stolen_dawn: { subjects: ["the timing of renewed winter", "the wilderness route to the renewal focus", "the buried Dawn Engine's missing connections"], resource: "Dawn Engine component", witness: "observatory keeper" },
};
const regional = { subjects: ["local supply routes", "the ownership of abandoned stores", "safe passage through the district"] as [string, string, string], resource: "trade relic", witness: "local traveller" };
const aliases: Record<string, string> = { the_stolen_dawn: "stolen_dawn", the_vanishing_middle: "vanishing_middle" };

export function attachSiteObjectives(graph: DungeonGraphState, options: {
  pathId?: string; act: number; seed: string;
  primary?: { title: string; deedId?: string };
}): void {
  const sections = graph.siteStructure?.sections;
  if (!sections?.length) return;
  const rng = createRandomSource(`${options.seed}:objectives:v1`);
  const profile = OBJECTIVE_PATH_PROFILES[aliases[options.pathId ?? ""] ?? options.pathId ?? ""] ?? regional;
  const act = Math.max(1, Math.min(3, options.act));
  const subject = profile.subjects[act - 1];
  const mode = rng(2) === 0 ? "similar" : "different";
  graph.siteStructure!.objectiveMode = mode;
  const preferred: SiteObjectiveType[] = act === 1
    ? ["learn_secret", "rescue_captive", "treasure_cache", "secure_chokepoint"]
    : act === 2 ? ["harvest_components", "break_ward", "secure_descent", "exotic_materials"]
      : ["recover_relic", "lift_curse", "defeat_guardian", "clear_border"];
  const primaryKind: SiteObjectiveType = options.primary?.deedId === "rescue_surveyor"
    ? "rescue_captive" : rng(2) === 0 ? preferred[rng(preferred.length)] : SITE_OBJECTIVE_TYPES[rng(SITE_OBJECTIVE_TYPES.length)];
  const used = new Set<SiteObjectiveType>([primaryKind]);
  graph.nodes.forEach(n => { delete n.objective; });
  sections.forEach((section, index) => {
    const terminal = index === sections.length - 1;
    const available = SITE_OBJECTIVE_TYPES.filter(type => !used.has(type));
    const kind = mode === "similar" || terminal ? primaryKind : available[rng(available.length)];
    used.add(kind);
    const mark = ["copper-marked", "split-stone", "white-thread"][index];
    const targets: Record<SiteObjectiveType, string> = {
      recover_relic: `${mark} ${profile.resource}`, lift_curse: `${mark} afflicted memorial`,
      harvest_components: `three samples from the ${mark} ritual stores`, treasure_cache: `${mark} sealed coffer`,
      exotic_materials: `three specimens from the ${mark} mineral seam`, rescue_captive: `${profile.witness} held at the ${mark} shelter`,
      monster_eggs: `an intact clutch in the ${mark} nest`, assassinate_leader: `the hostile commander of the ${mark} detachment`,
      secure_chokepoint: `${mark} passage`, defeat_guardian: `the guardian stationed at the ${mark} threshold`,
      clear_border: `${mark} crossing`, rescue_companion: `the stranded expedition member at the ${mark} camp`,
      break_ward: `the ward on the ${mark} archive`, learn_secret: `the ${mark} records concerning ${subject}`,
      secure_descent: `${mark} access shaft`,
    };
    const verbs: Record<SiteObjectiveType, string> = { recover_relic: "Recover", lift_curse: "Cleanse", harvest_components: "Collect",
      treasure_cache: "Recover", exotic_materials: "Collect", rescue_captive: "Rescue", monster_eggs: "Recover",
      assassinate_leader: "Defeat", secure_chokepoint: "Secure", defeat_guardian: "Overcome", clear_border: "Open",
      rescue_companion: "Rescue", break_ward: "Disable", learn_secret: "Investigate", secure_descent: "Secure" };
    const completions: Record<SiteObjectiveType, string> = {
      recover_relic: "Recover the identified relic intact and record who carries it.",
      lift_curse: "Identify the affliction's binding, perform its countermeasure, and verify the effect has ceased.",
      harvest_components: "Recover three usable samples; record their condition and carrier.",
      treasure_cache: "Open or remove the coffer and establish access to its contents.",
      exotic_materials: "Extract three usable specimens and arrange their transport.",
      rescue_captive: "Free the captive and establish a viable escape or safe shelter; killing the guards is insufficient. They come away with no gear — equip them from party stores.",
      monster_eggs: "Recover the intact clutch without requiring the guardian's death.",
      assassinate_leader: "Defeat the identified hostile commander; bypassing the target does not fulfil this objective.",
      secure_chokepoint: "Demonstrate usable passage and remove or negotiate the specific obstruction.",
      defeat_guardian: "Defeat, persuade, or bypass the guardian so it no longer prevents this expedition's access.",
      clear_border: "Establish passage for the intended travellers, including a return route.",
      rescue_companion: "Bring the stranded traveller to safety. Recruitment requires their consent and does not automatically add a character. They come away with no gear — equip them from party stores.",
      break_ward: "Identify the ward's trigger and interrupt its mechanism; demonstrate access without triggering it.",
      learn_secret: "Examine the records and record the actionable finding; no successful check is needed to read accessible essential evidence.",
      secure_descent: "Test the route, anchors, and return climb with the party's actual equipment.",
    };
    // The captive is a real classed NPC, so the objective names them rather than a role.
    const rescuedNpc = RESCUE_KINDS.includes(kind) ? rollRescuedNpc(rng) : undefined;
    const target = terminal && options.primary?.deedId === "rescue_surveyor"
      ? "Surveyor Jonathan Vane"
      : rescuedNpc
        ? `${rescuedNpc.name}, ${rescuedNpc.ancestry} ${rescuedNpc.className} (${profile.witness}), at the ${mark} shelter`
        : targets[kind];
    const roomId = section.roomIds[rng(section.roomIds.length)];
    const room = graph.nodes.find(n => n.id === roomId)!;
    const id = `${graph.siteId}:section:${section.id}:objective`;
    const contact = ["Mera Voss", "Orrin Pell", "Tessa Rook", "Dain Holt", "Sella Moss", "Hesk Vale"][rng(6)];
    const evidence = `The ${mark} account names ${contact}, a ${profile.witness}, as a source on ${subject}. Its route sketch follows the marked passage ${terminal ? "back toward this site's entrance" : "to the next section's entrance"}.`;
    const nextAction = terminal ? `Ask after ${contact} through local contacts to verify ${subject} before committing to a remedy.`
      : `Inspect the entrance to the next section for the handler's matching mark; choose whether to continue or retreat first.`;
    const treasure = ["recover_relic", "harvest_components", "treasure_cache", "exotic_materials", "monster_eggs"].includes(kind);
    room.objective = { title: terminal && options.primary ? options.primary.title : `${verbs[kind]} ${target}`,
      deedId: terminal && options.primary?.deedId ? options.primary.deedId : id, completed: false,
      generated: { id, sectionId: section.id, kind, target,
        procedure: `At this location: ${target}. Establish the obstruction and its warning signs before resolving an approach.`,
        completion: terminal && options.primary?.deedId === "rescue_surveyor"
          ? "Free Surveyor Jonathan Vane and establish his safe escape from the waterworks." : completions[kind],
        approaches: kind === "assassinate_leader" ? ["combat", "stealth"] : ["investigation", "stealth", "negotiation", "combat"],
        clue: evidence, nextAction, treasureItem: treasure ? target : undefined,
        rescuedNpc } };
    // Two actual evidence locations, not two checks on a single indispensable object.
    const corroborationRoom = graph.nodes.find(n => n.id === section.roomIds.find(id => id !== room.id))!;
    room.clues = [{ id: `${id}:account`, text: evidence, objectiveId: id }];
    corroborationRoom.clues = [{ id: `${id}:receipt`, objectiveId: id,
      text: `A separate ${mark} receipt bears ${contact}'s name, mentions ${subject}, and repeats the route directions. ${nextAction}` }];
    // A physical target exists independently of the room-feature roll; one treasure find per room.
    if (treasure) {
      room.treasure ??= { coins: 0, items: [], claimed: false };
      if (!room.treasure.items.includes(target)) room.treasure.items.push(target);
    }
  });
}
