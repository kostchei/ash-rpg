import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// A projection of saved generator fields. No prose completion or inferred links.
// JSON blocks preserve incomplete/contradictory data rather than repairing it.
export function renderProceduralDossier(report: any): string {
  for (const key of ['sites', 'encounters', 'npcs', 'treasures']) {
    if (!Array.isArray(report[key])) throw new Error(`Missing collection: ${key}`);
  }
  const lines: string[] = [
    '# Procedural dossier — uncompleted generator records', '',
    `Seed: \`${report.seed}\`. Zone: \`${report.zoneId}\`. Local label: ${report.localLabel}.`, '',
    '**FIELD LABELS:** INPUT = requested/configured constraint; SELECTED = explicit scenario selection; GENERATED = seeded procedure result; SOURCE = stored table/stat text; UNRESOLVED = missing mechanics or invalid result.', '',
    'These labels identify provenance, not literary quality. Stored oracle prompts and name lists were previously authored; this renderer adds no scene, motive, tactic, clue, relationship, reward, or mechanic.', '',
    '## Contract', '',
    'INPUT: five sites, five encounters for level-10+ adventurers, five NPCs, five treasures; Hrafnfjord; vampire, Seawolf, demon lord, giant.', '',
    '| Requirement | Procedural status |',
    '|---|---|',
    `| Counts | ${report.sites.length} sites / ${report.encounters.length} encounters / ${report.npcs.length} NPCs / ${report.treasures.length} treasures |`,
    '| Vampire | Stock Vampire selected; supported |',
    '| Giant | Seeded selection from configured Cloud/Storm Giant pool; supported |',
    '| Seawolf | Nord proxy plus Sea Serpent selected by the scenario runner; exact Seawolf entry unresolved |',
    '| Demon lord | Balor proxy selected by the scenario runner; lord identity, rank and powers unresolved |',
    '| 10+ | Encounter contains at least one stock LV 10+ creature; no party-size/difficulty balancing procedure |',
    '| Finished site descriptions, clue placement, links and symbolic weakness mechanics | Unresolved; generator does not return these |', '',
    'SELECTED: act-3 regional site pool (guardian LV 5–10); singleton encounters except Nord count d6+6; empty party input for NPC weighting; classed NPCs; discovering treasure levels 10, 11, 12, 13, 14; uniformly picked terrain labels rather than the region terrain weights.', '',
    'No claim is made that these choices implement a general high-level scenario generator or that the two proxies exactly fulfil the requested creature types.', '',
  ];
  const block = (label: string, value: unknown) => {
    lines.push(label, '', '```json', JSON.stringify(value, null, 2), '```', '');
  };
  const card = (value: any) => block('GENERATED draw / SOURCE meaning — `drawTarot`, installed contextual tarot deck:', value);
  const monster = (value: any) => {
    block('SOURCE stock stats / GENERATED campaign profile — database bestiary + `getCampaignMonster`:', value);
    const pending = value.campaignProfile?.randomVulnerabilities?.filter((v: any) => v.needsAuthoring) ?? [];
    if (pending.length) block('UNRESOLVED symbolic weaknesses — no trigger, consequence, duration or clues returned:', pending);
  };
  lines.push('## Sites', '');
  for (const [i, site] of report.sites.entries()) {
    lines.push(`### S${i + 1}. ${site.name.full}`, '',
      'GENERATED — `generateSiteInputs`; raw bundle follows. Site sections have sizes, not room keys or maps.', '');
    block('Generated record:', site);
    for (const objective of site.objectives) {
      if (objective.kind === 'monster_eggs' && objective.target.brood?.id === 'mammoth') {
        lines.push('UNRESOLVED validation error: mammoth selected for an egg objective. No substitution or reroll performed.', '');
      }
      if (objective.target.item && /\b(benefit|virtue|flaw|spell)\b/i.test(objective.target.item.description)) {
        lines.push('UNRESOLVED item attributes: raw description contains placeholders. Any follow-up rolls are recorded separately below.', '');
      }
    }
  }
  lines.push('## Encounters', '');
  for (const [i, encounter] of report.encounters.entries()) {
    lines.push(`### E${i + 1}. ${encounter.name}`, '');
    block('SELECTED species / GENERATED name, count, terrain, reaction:', {
      speciesKey: encounter.key, generatedName: encounter.name, count: encounter.count,
      terrain: encounter.terrain, reaction: encounter.reaction,
    });
    card(encounter.tarot);
    monster(encounter.monster);
    if (encounter.companion) {
      lines.push('SELECTED companion: Sea Serpent; no generated relationship, command signals, handler, bond or taming mechanics.', '');
      monster(encounter.companion);
    }
    block('GENERATED carried treasure — `resolveGroupTreasure`; group basis uses companion level when present, otherwise primary creature level:', encounter.carriedTreasure);
    lines.push('UNRESOLVED: initial activity, motive, tactics, clues and relationship to other records. The tarot facet is a prompt, not a confirmed event.', '');
  }
  lines.push('## NPCs', '');
  for (const [i, npc] of report.npcs.entries()) {
    lines.push(`### N${i + 1}. ${npc.name}`, '');
    const { tarot, ...record } = npc;
    block('GENERATED — `generateNpc`, ancestry name table, faction selection, reaction roll:', record);
    card(tarot);
    lines.push('UNRESOLVED: equipment, location, named nemesis/debt/curse/warning subject, faction relationships and bespoke offer. `zoneSubclass` is independent local colour, not an additional mechanical class.', '');
  }
  lines.push('## Treasures', '');
  for (const [i, treasure] of report.treasures.entries()) {
    lines.push(`### T${i + 1}. ${treasure.result.items.join('; ') || 'Coins'}`, '');
    block('INPUT discovering level / GENERATED — `generateUnguardedTreasure`, Core treasure table and item-name pool:', {
      discoveringLevel: treasure.level, ...treasure.result,
    });
    card(treasure.tarot);
    lines.push('UNRESOLVED: owner, location, provenance and any unfilled magic-item placeholders. Quality/XP are returned values, not an already-earned award. `roll` is the selected row lower bound, not a logged original d100 face.', '');
  }
  lines.push('## Separate follow-up table rolls', '',
    'SELECTED procedure: additional Core table dice for the wand and site armour placeholders. These are not completion records returned by the runtime treasure function. Numerical results are retained without claiming a fully implemented magic-item generator.', '');
  block('GENERATED dice / SOURCE table citation:', { wand: report.wandCompletion, siteArmor: report.armorCompletion });
  lines.push('## Supporting site occupants', '');
  block('SOURCE stock bestiary records for generated site picks:', report.supportingMonsters);
  lines.push('## Replay and draw conventions', '',
    'Replay using `npx tsx scripts/generate-hrafnfjord-dossier.ts <seed>`. Site child streams are derived internally from the seed/site ID; campaign-profile streams derive from the seed and monster version hash. `trace` below logs runner-owned streams only. Values are zero-based PRNG indices; displayed dice add one. The field `sides` is the exclusive RNG bound, including the 16777216 bound used for name sampling.', '');
  block('GENERATED runner trace:', report.trace);
  return lines.join('\n');
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const input = process.argv[2] ?? 'outputs/hrafnfjord-10plus/draws.json';
  const output = process.argv[3] ?? 'outputs/hrafnfjord-10plus/procedural.md';
  writeFileSync(output, renderProceduralDossier(JSON.parse(readFileSync(input, 'utf8'))));
  console.log(`Wrote ${output}`);
}
