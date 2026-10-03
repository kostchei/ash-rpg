import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { createAshServer } from '../src/server/app.js';
import { generateDossier } from '../src/server/generators/dossier.js';
import { ZONE_PROFILES } from '../src/shared/zone-profiles.js';
import type { DossierInput } from '../src/shared/dossier.js';
import { renderDossierHtml, escapeDossierHtml as e, DOSSIER_CSS } from '../src/shared/dossier-format.js';
import { renderDossierPdf } from '../src/server/dossier-pdf.js';

const server = await createAshServer({ dbPath: ':memory:', frontend: false, port: 0 });
const directory = 'outputs/region-comparison';
mkdirSync(directory, { recursive: true });
// baseline.json is the historical snapshot from commit 04974b7; never overwrite it.
const summaries: unknown[] = [];
const pools: Record<string, { low: string[]; high: string[] }> = {
  the_gloaming: { low: ['bittermold', 'bogthorn', 'hexling', 'howler', 'ichor_ooze'], high: ['vampire', 'dragon_forest', 'dragon_swamp', 'chimera', 'lich', 'mummy'] },
  red_sands: { low: ['camel_silver', 'ras_godai', 'siruul', 'scrag', 'scorpion_giant'], high: ['djinni', 'dragon_desert', 'mummy', 'golem_iron', 'roc'] },
  midnight_sun: { low: ['nord', 'dverg', 'sea_nymph', 'wolf', 'boar'], high: ['sea_serpent', 'dragon_frost', 'remorhaz', 'giant_storm', 'valkyrie'] },
  river_of_night: { low: ['ant_giant', 'basilisk_hatchling', 'condor_dire', 'javelina', 'stone_warrior'], high: ['catfish_giant', 'jaguar_king', 'brachiosaurus', 'chimera', 'dragon_swamp'] },
  dwellers_in_the_deep: { low: ['dremir', 'nuln', 'wendel', 'darkmantle', 'bat_giant'], high: ['bezelak', 'purple_worm', 'golem_iron', 'lich', 'archmage'] },
  city_of_masks: { low: ['guard', 'bandit', 'cultist', 'animated_armor', 'wererat'], high: ['archmage', 'golem_iron', 'vampire', 'lich', 'angel_principi'] },
};
mkdirSync('tmp/pdfs/regions', { recursive: true });
for (const [regionIndex, zone] of Object.values(ZONE_PROFILES).entries()) {
  for (const level of [1, 10]) {
    const input: DossierInput = { title: `${zone.name} / Level ${level}`, zoneId: zone.id,
      seed: `region-review-2026-10-03-${zone.id}-lv${level}`, minimumLevel: level,
      counts: { sites: 5, encounters: 5, npcs: 5, treasures: 5 },
      required: level === 1 ? [] : ([['vampire'], ['giant'], ['seawolf'], ['demon_lord'], ['giant', 'vampire'], []] as DossierInput['required'][])[regionIndex], allowProxies: true,
      maximumLevel: level === 1 ? 3 : 16, monsterKeys: pools[zone.id][level === 1 ? 'low' : 'high'] };
    const report = generateDossier(input, server.db);
    const raw = report.raw as any;
    summaries.push({ region: zone.name, id: zone.id, level, seed: input.seed, required: input.required, maximumLevel: input.maximumLevel, monsterPool: input.monsterKeys,
      monsters: raw.encounters.map((e: any) => ({ key: e.choice.key, name: e.companion ? `${e.count} ${e.monster.name} (LV ${e.monster.level}) + ${e.companion.name}` : e.monster.name, level: e.companion?.level ?? e.monster.level })),
      coverage: report.coverage, guardianLevels: raw.sites.flatMap((s: any) => s.objectives.map((o: any) => o.guardian.level)),
      repeatedMonsters: raw.encounters.length - new Set(raw.encounters.map((e: any) => e.choice.key)).size,
      unresolved: report.cards.flatMap(c => c.fields).filter(f => f.provenance === 'unresolved').length,
      descriptions: report.cards.filter(c => c.category === 'site').map(c => c.fields.find(f => f.label === 'Description')?.value),
      opening: report.story[0].value, treasureGp: raw.treasures.reduce((total: number, t: any) => total + t.result.entry.valueGp, 0) });
      writeFileSync(`${directory}/${zone.id}-lv${level}.html`, renderDossierHtml(report));
      writeFileSync(`${directory}/${zone.id}-lv${level}.json`, JSON.stringify(report, null, 2));
      writeFileSync(`tmp/pdfs/regions/${zone.id}-lv${level}.pdf`, await renderDossierPdf(report));
  }
}
writeFileSync(`${directory}/results.json`, JSON.stringify(summaries, null, 2));
{
  const before = JSON.parse(readFileSync(`${directory}/baseline.json`, 'utf8'));
  const rows = (summaries as any[]).map(result => {
    const old = before.find((b: any) => b.id === result.id && b.level === result.level);
    return `<tr><td>${e(result.region)} / LV ${result.level}<br><a href="${result.id}-lv${result.level}.html">Read fieldbook</a></td><td>${e(result.monsters.map((m: any) => `${m.name} (${m.level})`).join('; '))}</td><td>${old.error ? 'Failed: empty regional pool' : `${old.repeatedMonsters} repeats; LV ${Math.min(...old.monsters.map((m: any) => m.level))}-${Math.max(...old.monsters.map((m: any) => m.level))}`}</td><td>${result.repeatedMonsters} repeats; ${result.unresolved} unresolved fields<br>Treasure: ${result.treasureGp.toFixed(2)} gp</td></tr>`;
  }).join('');
  writeFileSync(`${directory}/index.html`, `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ASH regional comparison</title><style>${DOSSIER_CSS}table{width:100%;border-collapse:collapse;font-size:12px}td,th{text-align:left;vertical-align:top;padding:12px;border:1px solid #ccd5c8}a{color:#25583c}section{overflow:auto}</style><main class="packet"><div class="kicker">ASH / Twelve fieldbooks</div><h1>Six regions, two levels</h1><p>Five sites, five encounters, five NPCs and five treasures in each packet. Every packet uses a distinct recorded seed. The comparison uses the same seeds before and after fixes. The improved inputs add an upper level limit and explicit stock pools; this is a twelve-sample review, not a statistical balance study.</p><p>Level 1 packets use LV 1–3; level 10 packets use LV 10–16, with the actual levels listed below. Required types override the custom pool but respect the range. All monster choices are disclosed; stock-pool membership does not establish regional canon. Site guardians keep their act bands and NPCs remain LV 1–3.</p><p>Fixed: unchecked high levels in novice packets, empty high-level regional pools through explicit stock selection, avoidable repeats, identical profiles for repeated species, a Nord description that invented a serpent companion, generic site descriptions without regional detail. Templates are authored source tables selected procedurally, version 2.</p><p>Still unresolved: full room keys and clue chains, magic-item attributes, symbolic weakness effects, and source stat errors. The reports keep these visible. Seeded results are reproducible with the committed code and audit files.</p><section><table><thead><tr><th>Packet</th><th>Selected encounters / creature LV</th><th>Before</th><th>After</th></tr></thead><tbody>${rows}</tbody></table></section><h2>Reading the comparison</h2><p>Wychfen’s plant and bog creatures give way to undead and dragons. The Silt Sea uses desert creatures, then constructs and elementals. Hrafnfjord moves from Nord, Dverg and coastal encounters to a declared Seawolf substitute, frost creatures and giants. Xaltemoc uses small jungle creatures, then its stock rulers and giant fauna alongside an explicit Balor substitute. Morzamotha pairs cave creatures with powerful underground and undead stock choices. Meridia moves from street encounters to powerful humanoids, constructs and undead. These themes reflect the declared input pools; no source table is silently enlarged.</p><p>The high-level treasure totals are usually larger but still vary by draw. The story scaffold remains deliberately compact; regional detail and NPC motives vary, while missing mechanics remain the referee’s work.</p></main></html>`);
}
console.log(JSON.stringify((summaries as any[]).map(r => ({ region: r.region, level: r.level, monsters: r.monsters?.map((m: any) => `${m.key}:${m.level}`), repeats: r.repeatedMonsters, unresolved: r.unresolved, error: r.error })), null, 2));
await server.close();
