import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const files = ['data/bestiary/stats/shadowdark-core.json', 'data/bestiary/stats/cursed-scrolls.json'];
const monsters = files.flatMap((file) => JSON.parse(readFileSync(resolve(root, file), 'utf8')).map((monster) => ({ ...monster, file })));
const additions = JSON.parse(readFileSync(resolve(root, 'data/bestiary/ability-additions.json'), 'utf8'));
export { inventory } from '../../src/server/generators/monster-inventory.mjs';
import { inventory } from '../../src/server/generators/monster-inventory.mjs';

export function buildAbilityAudit() {
assert.equal(new Set(monsters.map((monster) => monster.id)).size, monsters.length, 'Duplicate imported monster IDs');
const rows = monsters.map((monster) => {
  const { abilities, excluded, notes, variants } = inventory(monster);
  const addition = additions.entries.find((entry) => entry.monsterId === monster.id);
  assert.ok(!addition || abilities.length === 0, `Addition assigned to already-special monster ${monster.id}`);
  const count = abilities.length;
  const plannedCount = count + (addition ? 1 : 0);
  return {
    monsterId: monster.id, name: monster.name, source: monster.source, family: monster.family,
    statsFile: monster.file, existingAbilityCount: count,
    abilities, excluded, notes,
    ...(variants ? { variants, existingAbilityCountRange: [Math.min(...variants.map((variant) => variant.existingAbilityCount)), Math.max(...variants.map((variant) => variant.existingAbilityCount))] } : {}),
    needsNewAbility: count === 0, ...(addition ? { proposedAbilityId: addition.id } : {}),
    plannedAbilityCount: plannedCount, requiredVulnerabilityCount: plannedCount + 1,
    ...(variants ? { requiredVulnerabilityCountRange: [Math.min(...variants.map((variant) => variant.existingAbilityCount)) + 1, Math.max(...variants.map((variant) => variant.existingAbilityCount)) + 1] } : {}),
  };
});
const zero = rows.filter((row) => row.needsNewAbility);
const gaps = zero.filter((row) => !row.proposedAbilityId);
assert.equal(new Set(additions.entries.map((entry) => entry.monsterId)).size, additions.entries.length, 'Duplicate addition assignments');
for (const addition of additions.entries) {
  assert.ok(rows.some((row) => row.monsterId === addition.monsterId), `Unknown addition target: ${addition.monsterId}`);
  for (const field of ['id', 'name', 'use', 'trigger', 'range', 'effect', 'frequency', 'telegraph', 'behaviour', 'inspiration']) assert.ok(addition[field], `${addition.monsterId}: missing ${field}`);
}

const report = {
  schemaVersion: 1, status: 'source_audit_with_draft_additions',
  countingPolicy: {
    activePowers: 'One named active power, including bundled riders, is one ability. Independent passive defences are separate abilities.',
    movement: 'Flight, climbing, burrowing, swimming, and teleportation count; speed alone, mounting, reach, and ordinary multiattack do not.',
    numbers: 'Base AC >=20 and HP >=100 each add one ability. A power granting high AC is counted once as that power, not again as a conditional number.',
    exclusions: 'Vulnerabilities, background, loot without monster use, and imported continuation fragments are not additional abilities.',
    deduplication: 'An attack rider explained by a named trait and movement repeated in a trait are counted once. Independent trait protections remain separate.',
    countMeaning: 'Existing counts exclude all draft additions. Planned counts include one proposed ability for every zero-ability record.',
    variants: 'Wendel lists shared and per-form counts; its eight possible forms are not combined. Stone Warrior lists counts with and without its conditional companion.',
    vulnerabilityRule: 'One plus final special-ability count. Vulnerabilities need not counter those abilities.',
    runtime: 'This report and additions do not change imported stats or runtime combat behaviour.',
  },
  summary: { monsters: rows.length, zeroAbilityMonsters: zero.length, proposedAdditions: additions.entries.length, missingAdditions: gaps.length, sourceCorrectionsNeeded: ['bear_brown', 'assassin'], conditionalForms: ['wendel', 'stone_warrior'] },
  rows,
};
writeFileSync(resolve(root, 'data/bestiary/special-ability-audit.json'), JSON.stringify(report, null, 2) + '\n');

const doc = [
  '# Monster special-ability audit', '',
  `Audited **${rows.length} imported records**: **${zero.length}** have no existing special abilities under the policy below. **${additions.entries.length}** proposed additions are stored separately from the imported stats.`, '',
  '## Counting policy', '',
  ...Object.values(report.countingPolicy).map((rule) => `- ${rule}`), '',
  '**Review notes:** brown-bear data contains polar-bear bleed (and the polar bear is missing); its count below is corrected from the source without changing the imported file. The assassin\'s poison attack lacks a resolution rule. Wendel has alternative forms. Stone Warrior\'s basilisk companion is conditional. These issues remain visible in the JSON report.', '',
  'Counts are an authoring inventory, not a claim that every existing ability is tactically interesting. A flat named damage bonus counts as an existing ability, but does not by itself satisfy the separate goal of tactical identity.', '',
  'Data: [full audit](../../data/bestiary/special-ability-audit.json), [draft additions](../../data/bestiary/ability-additions.json). Rebuild: `node scripts/bestiary/audit-special-abilities.mjs`.', '',
  '## All monsters', '', '| Monster | ID | Existing abilities | Ability inventory | Planned count | Vulnerabilities required |', '|---|---|---:|---|---:|---:|',
];
for (const row of rows) {
  const label = row.existingAbilityCountRange ? `${row.existingAbilityCountRange.join('–')} by form/condition` : row.existingAbilityCount;
  const planned = row.existingAbilityCountRange ? label : row.plannedAbilityCount;
  const required = row.requiredVulnerabilityCountRange ? row.requiredVulnerabilityCountRange.join('–') : row.requiredVulnerabilityCount;
  const names = row.abilities.map((ability) => ability.name).join('; ') || 'None';
  doc.push(`| ${row.name} | ${row.monsterId} | ${label} | ${names}${row.variants ? '; see conditional counts below' : ''}${row.notes.length ? ' †' : ''} | ${planned} | ${required} |`);
}
doc.push('', '## Conditional forms and companions', '');
for (const row of rows.filter((entry) => entry.variants)) {
  doc.push(`### ${row.name}`, '', '| Form or condition | Additional abilities | Total abilities | Vulnerabilities required |', '|---|---|---:|---:|');
  for (const variant of row.variants) doc.push(`| ${variant.name} | ${variant.extraAbilities.join('; ') || 'None beyond shared abilities'} | ${variant.existingAbilityCount} | ${variant.existingAbilityCount + 1} |`);
  doc.push('');
}
doc.push('', '## Draft abilities for monsters with none', '',
  'These are original ASH adaptations of 4e tactical design: positioning, attack replacement, limited reactions, and coordinated actions. They are not transcriptions of official 4e stat blocks. Mobile-strike and allied-follow-up patterns draw on the gnoll examples supplied in the design discussion; other cards use those tactical principles. Use close/near/far, explicit turn timing, and the source attack/damage values. No new opportunity-attack system is assumed.', '',
  '**Shared conventions:** bloodied means at or below half maximum HP. A close shift is up to 5 feet on traversable ground. Forced movement stops at obstacles and lethal drops unless a particular card explicitly gives another rule. A creature has at most one triggered effect per round, and triggered effects cannot cause another triggered effect. These are draft table procedures, not implemented UI controls.', '');
for (const row of zero) {
  const addition = additions.entries.find((entry) => entry.monsterId === row.monsterId);
  doc.push(`### ${row.name}`, '');
  if (!addition) {
    doc.push('Addition still required.', '');
    continue;
  }
  doc.push(`**${addition.name}** — ${addition.use}; ${addition.frequency}.`, '',
    `**Trigger:** ${addition.trigger} **Range:** ${addition.range}`, '',
    addition.effect, '', `**Telegraph:** ${addition.telegraph}`, '',
    `**Behaviour:** ${addition.behaviour}`, '', `**Inspiration:** ${addition.inspiration}`, '',
    `Existing abilities: 0 → planned abilities: 1 → required vulnerabilities: 2.`, '');
}
doc.push('## Source and review notes', '');
for (const row of rows.filter((entry) => entry.notes.length)) doc.push(`- **${row.name}:** ${row.notes.join(' ')}`);
doc.push('');
writeFileSync(resolve(root, 'docs/bestiary/special_ability_audit.md'), doc.join('\n'));
console.log(JSON.stringify(report.summary));
console.log('Zero-ability IDs: ' + zero.map((row) => row.monsterId).join(', '));
if (gaps.length) console.log('Draft cards still needed: ' + gaps.map((row) => row.monsterId).join(', '));
return report;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) buildAbilityAudit();
