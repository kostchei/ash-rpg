import type { EncounterPack, EncounterPackState, EncounterEffects, PublicEncounterPack } from "../../../shared/path-encounters.js";

export function startEncounterPack(pack: EncounterPack): EncounterPackState {
  return { version: 1, pathId: pack.pathId, currentSite: "haven", knownSites: [...pack.openingSites],
    visitedSites: ["haven"], facts: [], clues: [], completed: [], resolvedGroups: [],
    assets: { ...pack.initialAssets }, toll: [], minutes: 0, victories: [], journal: [] };
}
const add = (items: string[], value: string) => { if (!items.includes(value)) items.push(value); };
function apply(pack: EncounterPack, state: EncounterPackState, effects: EncounterEffects) {
  for (const fact of effects.facts ?? []) add(state.facts, fact);
  for (const [key, value] of Object.entries(effects.assets ?? {})) {
    const next = (state.assets[key] ?? 0) + value;
    if (!Number.isSafeInteger(next) || next < 0) throw new Error(`Insufficient ${key}`);
    state.assets[key] = next;
  }
  for (const id of effects.clues ?? []) {
    const clue = pack.clues.find(c => c.id === id);
    if (!clue) throw new Error("Invalid authored clue");
    add(state.clues, id); add(state.facts, clue.fact);
    for (const site of clue.leads) add(state.knownSites, site);
  }
  if (effects.resolveGroup) add(state.resolvedGroups, effects.resolveGroup);
  if (effects.toll) add(state.toll, effects.toll);
  if (effects.victory && !state.victories.includes(effects.victory)) state.victories.push(effects.victory);
}
export function interactionBlock(pack: EncounterPack, state: EncounterPackState, id: string): string | undefined {
  const site = pack.sites.find(s => s.id === state.currentSite);
  const action = site?.interactions.find(a => a.id === id);
  if (!action) return "This interaction is not at the current site";
  if (action.once && state.completed.includes(id)) return "Already completed";
  if (action.effects.resolveGroup && state.resolvedGroups.includes(action.effects.resolveGroup)) return "This group's interference is already resolved";
  if ((action.requires ?? []).some(f => !state.facts.includes(f))) return "Investigate the linked leads and secure the required preparations";
  for (const [asset, cost] of Object.entries(action.costs ?? {})) {
    if ((state.assets[asset] ?? 0) < cost) return `Requires ${cost} ${asset}`;
  }
}
/** Table adjudicates checks/combat using printed procedures. The client cannot submit arbitrary effects. */
export function resolveInteraction(pack: EncounterPack, original: EncounterPackState, id: string,
  outcome: "success" | "failure", notes: string): EncounterPackState {
  if (original.pathId !== pack.pathId) throw new Error("Wrong encounter pack");
  const block = interactionBlock(pack, original, id);
  if (block) throw new Error(block);
  const site = pack.sites.find(s => s.id === original.currentSite)!;
  const action = site.interactions.find(a => a.id === id)!;
  if (outcome === "failure" && !action.check) throw new Error("This action does not require a check");
  if (action.check && notes.trim().length < 3) throw new Error("Record the roll or table ruling before resolving this interaction");
  const state = structuredClone(original);
  for (const [asset, cost] of Object.entries(action.costs ?? {})) state.assets[asset] -= cost;
  state.minutes += action.minutes;
  apply(pack, state, outcome === "success" ? action.effects : (action.failureEffects ?? {}));
  if (outcome === "success") add(state.completed, id);
  state.journal.push({ sequence: state.journal.length + 1, siteId: site.id,
    text: `${action.label}: ${outcome === "success" ? action.success : action.failure}${notes.trim() ? ` (${notes.trim()})` : ""}` });
  return state;
}
/** Arrival is an explicit table record after normal hex/site travel, never a teleport or free travel action. */
export function recordEncounterArrival(pack: EncounterPack, original: EncounterPackState, siteId: string, notes: string) {
  if (!notes.trim()) throw new Error("Record how the party reached this site using the travel system");
  if (!original.knownSites.includes(siteId)) throw new Error("Discover a lead to this site first");
  const destination = pack.sites.find(s => s.id === siteId);
  if (!destination) throw new Error("Unknown site");
  const state = structuredClone(original);
  state.currentSite = siteId; add(state.visitedSites, siteId);
  state.journal.push({ sequence: state.journal.length + 1, siteId, text: `Arrived at ${destination.name}: ${notes.trim()}` });
  return state;
}
export function projectEncounterPack(pack: EncounterPack, state: EncounterPackState): PublicEncounterPack {
  const site = pack.sites.find(s => s.id === state.currentSite)!;
  // No unrevealed clues, future monsters, victory predicates, requirements, or effects reach clients.
  return { title: pack.title,
    currentSite: { ...site, exits: site.exits.filter(id => state.knownSites.includes(id)), interactions: [],
      monsters: site.monsters.filter(m => !state.resolvedGroups.includes(m.id)), quest: { ...site.quest, completeWhen: "" } },
    knownSites: pack.sites.filter(s => state.knownSites.includes(s.id)).map(s => ({ id: s.id, name: s.name, directions: s.directions })),
    clues: pack.clues.filter(c => state.clues.includes(c.id)), assets: { ...state.assets }, toll: [...state.toll],
    minutes: state.minutes, won: state.victories.length > 0, journal: [...state.journal],
    actions: site.interactions.map(a => { const reason = interactionBlock(pack, state, a.id); return {
      id: a.id, label: a.label, procedure: a.procedure, check: a.check, minutes: a.minutes,
      costs: { ...a.costs }, success: a.success, failure: a.failure, available: !reason, reason }; }),
    quests: pack.sites.filter(s => state.visitedSites.includes(s.id)).map(s => ({
      title: s.quest.title, request: s.quest.request, reward: s.quest.reward,
      completed: state.facts.includes(s.quest.completeWhen) })) };
}

export function auditEncounterPack(pack: EncounterPack): string[] {
  const errors: string[] = [];
  const sites = new Set(pack.sites.map(s => s.id));
  const clues = new Set(pack.clues.map(c => c.id));
  const interactions = pack.sites.flatMap(s => s.interactions);
  if (sites.size !== pack.sites.length || new Set(interactions.map(a => a.id)).size !== interactions.length) errors.push("Duplicate IDs");
  for (const s of pack.sites) {
    if (!s.npcs.length || !s.interactions.length || !s.quest) errors.push(`${s.id}: incomplete situation`);
    for (const exit of s.exits) if (!sites.has(exit)) errors.push(`${s.id}: missing exit ${exit}`);
    for (const a of s.interactions) {
      for (const id of [...(a.effects.clues ?? []), ...(a.failureEffects?.clues ?? [])]) if (!clues.has(id)) errors.push(`${a.id}: missing clue`);
      for (const cost of Object.values(a.costs ?? {})) if (!Number.isSafeInteger(cost) || cost < 0) errors.push(`${a.id}: invalid cost`);
    }
  }
  for (const c of pack.clues) for (const lead of c.leads) if (!sites.has(lead)) errors.push(`${c.id}: missing lead`);
  for (const route of ["A", "B"] as const) if (!interactions.some(a => a.effects.victory === route)) errors.push(`Missing victory ${route}`);
  for (const fact of ["remedy_a_known", "remedy_b_known"]) if (new Set(pack.clues.filter(c => c.fact === fact).map(c => c.source)).size < 2) errors.push(`Missing independent evidence: ${fact}`);
  return errors;
}
