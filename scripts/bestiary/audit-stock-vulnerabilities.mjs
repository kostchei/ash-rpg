import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inventory } from './audit-special-abilities.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const files = ['data/bestiary/stats/shadowdark-core.json', 'data/bestiary/stats/cursed-scrolls.json'];
const monsters = files.flatMap((file) => JSON.parse(readFileSync(resolve(root, file), 'utf8')).map((monster) => ({ ...monster, file })));
const additions = JSON.parse(readFileSync(resolve(root, 'data/bestiary/ability-additions.json'), 'utf8')).entries;

export { stockVulnerabilities, regenerationCounters } from '../../src/server/generators/monster-inventory.mjs';
import { stockVulnerabilities, regenerationCounters } from '../../src/server/generators/monster-inventory.mjs';

export function campaignVulnerabilityGaps(rows) {
  return rows.flatMap((row) => {
    const versions = row.conditionalCounts ?? [{
      condition: null,
      specialAbilityCount: row.plannedAbilityCount,
    }];
    return versions.map((version) => {
      const required = 1 + version.specialAbilityCount;
      return {
        monsterId: row.monsterId,
        name: row.name,
        version: version.condition,
        source: row.source,
        specialAbilityCount: version.specialAbilityCount,
        draftAbilityCount: row.proposedAbilityCount,
        stockVulnerabilityCount: row.stockVulnerabilityCount,
        requiredVulnerabilityCount: required,
        randomVulnerabilitiesToAdd: Math.max(0, required - row.stockVulnerabilityCount),
        sourceNotes: row.sourceNotes,
      };
    });
  }).sort((a, b) => a.name.localeCompare(b.name) || (a.version ?? '').localeCompare(b.version ?? ''));
}

function writeCampaignVulnerabilityGaps(rows) {
  const versions = campaignVulnerabilityGaps(rows);
  const report = {
    schemaVersion: 1,
    status: 'campaign_authoring_counts_with_draft_abilities',
    formula: 'max(0, 1 + specialAbilityCount - stockVulnerabilityCount)',
    monsterCount: rows.length,
    versionCount: versions.length,
    rows: versions,
  };
  writeFileSync(resolve(root, 'data/bestiary/campaign-vulnerability-gaps.json'), JSON.stringify(report, null, 2) + '\n');
  const doc = [
    '# Random vulnerabilities to add per campaign monster version', '',
    '**Random vulnerabilities to add = max(0, 1 + special abilities − stock vulnerabilities).** The extra one is the baseline vulnerability every monster should have.', '',
    `This lists **${rows.length} monsters** as **${versions.length} version rows**, with separate rows for the eight Wendel forms and the two Stone Warrior companion conditions. Choose the row for the version used in the campaign.`, '',
    'Ability counts include the proposed tactical ability for each of the 26 monsters that originally had none. These additions remain drafts; † marks affected rows. AC ≥20 and HP ≥100 each count as an ability.', '',
    'Stock vulnerabilities include the explicit susceptibilities recorded in the [stock audit](stock_vulnerability_audit.md). Regeneration suppression does not count: fire and acid stop a troll’s regeneration but do not reduce its random vulnerability allowance. Ordinary tactics such as separating a pack or getting out of the way do not count.', '',
    'The vulnerabilities need not counter particular abilities. This is the number to draw and record for that campaign version; no random vulnerabilities have been assigned here.', '',
    '| Monster / version | Special abilities | Stock vulnerabilities | Random vulnerabilities to add |',
    '|---|---:|---:|---:|',
    ...versions.map((row) => `| ${row.name}${row.version ? ` — ${row.version}` : ''}${row.draftAbilityCount ? ' †' : ''} | ${row.specialAbilityCount} | ${row.stockVulnerabilityCount} | **${row.randomVulnerabilitiesToAdd}** |`), '',
    '## Source notes', '',
    ...rows.filter((row) => row.sourceNotes?.length).map((row) => `- **${row.name}:** ${row.sourceNotes.join(' ')}`), '',
    'Machine-readable list: [campaign-vulnerability-gaps.json](../../data/bestiary/campaign-vulnerability-gaps.json). Rebuild with `node scripts/bestiary/audit-stock-vulnerabilities.mjs`.', '',
  ];
  writeFileSync(resolve(root, 'docs/bestiary/campaign_vulnerability_gaps.md'), doc.join('\n'));
}

export function buildStockVulnerabilityAudit() {
  assert.equal(new Set(monsters.map((monster) => monster.id)).size, monsters.length);
  const rows = monsters.map((monster) => {
    const special = inventory(monster);
    const vulnerabilities = stockVulnerabilities(monster);
    const counters = regenerationCounters(monster);
    const proposed = additions.some((entry) => entry.monsterId === monster.id) ? 1 : 0;
    const plannedAbilityCount = special.abilities.length + proposed;
    const requiredVulnerabilityCount = 1 + plannedAbilityCount;
    const shortfall = Math.max(0, requiredVulnerabilityCount - vulnerabilities.length);
    const conditionalCounts = special.variants?.map((variant) => ({
      condition: variant.name,
      specialAbilityCount: variant.existingAbilityCount,
      requiredVulnerabilityCount: variant.existingAbilityCount + 1,
      stockVulnerabilityCount: vulnerabilities.length,
      additionalVulnerabilitiesNeeded: Math.max(0, variant.existingAbilityCount + 1 - vulnerabilities.length),
    }));
    return {
      monsterId: monster.id, name: monster.name, source: monster.source, statsFile: monster.file,
      stockVulnerabilityCount: vulnerabilities.length, vulnerabilities,
      regenerationCounterCount: counters.length, regenerationCounters: counters,
      existingAbilityCount: special.abilities.length, proposedAbilityCount: proposed,
      plannedAbilityCount, requiredVulnerabilityCount, additionalVulnerabilitiesNeeded: shortfall,
      ...(conditionalCounts ? { conditionalCounts } : {}),
      sourceNotes: special.notes,
    };
  });
  const histogram = {};
  for (const row of rows) histogram[row.stockVulnerabilityCount] = (histogram[row.stockVulnerabilityCount] ?? 0) + 1;
  const totalRange = rows.reduce(([min, max], row) => {
    const values = row.conditionalCounts?.map((condition) => condition.additionalVulnerabilitiesNeeded) ?? [row.additionalVulnerabilitiesNeeded];
    return [min + Math.min(...values), max + Math.max(...values)];
  }, [0, 0]);
  const report = {
    schemaVersion: 1, status: 'stock_source_inventory',
    countingPolicy: {
      scope: 'Only vulnerabilities explicitly in imported source stats; no pool draws, authored samples, or proposed tactical abilities create stock vulnerabilities.',
      units: 'One distinct exploitable susceptibility is one vulnerability. Sunlight with several effects counts once. Fire and acid count separately.',
      inclusions: 'Explicit harmful exposures, particular substances that bypass a defence (e.g. silver), dependencies, external anchors, exceptional kill conditions, and stated anatomical susceptibilities. Subtypes remain explicit; a defence exception is not extra damage.',
      regeneration: 'Regeneration suppression is recorded separately as an ability counter, not included in the stock vulnerability count. Fire/acid do not deal extra damage to a troll merely because they suppress regeneration.',
      magic: 'General magic bypassing nonmagical-damage immunity is not a specific vulnerability. Silver and explicitly named fire exceptions are recorded as defence exceptions without implying double damage.',
      exclusions: 'Ordinary saves, escape checks, generic damage, killing an attached creature, range management, recovery timing, and other ordinary counterplay are not vulnerabilities.',
      death: 'Exceptional permanent-death conditions count as stock weaknesses, with their full prerequisites retained; they do not imply additional damage.',
      conditional: 'Wendel forms and Stone Warrior companion conditions use separate required totals. Neither has a form-dependent stock vulnerability in the imported rules.',
      target: 'Required totals use one plus the planned ability count, including the 26 draft additions, without requiring ability-specific counters.',
    },
    summary: {
      importedMonsters: rows.length,
      monstersWithoutStockVulnerabilities: rows.filter((row) => row.stockVulnerabilityCount === 0).length,
      monstersWithStockVulnerabilities: rows.filter((row) => row.stockVulnerabilityCount > 0).length,
      stockVulnerabilityEntries: rows.reduce((total, row) => total + row.stockVulnerabilityCount, 0),
      regenerationCounterEntries: rows.reduce((total, row) => total + row.regenerationCounterCount, 0),
      histogram,
      additionalVulnerabilitiesNeededRange: totalRange,
    },
    rows,
  };
  writeFileSync(resolve(root, 'data/bestiary/stock-vulnerability-audit.json'), JSON.stringify(report, null, 2) + '\n');

  const doc = [
    '# Stock monster vulnerability audit', '',
    `Across **${rows.length} imported records**, **${report.summary.monstersWithStockVulnerabilities}** monsters have at least one stock vulnerability and **${report.summary.monstersWithoutStockVulnerabilities}** have none. There are **${report.summary.stockVulnerabilityEntries}** stock vulnerability entries across the catalogue.`, '',
    '## What counts', '', ...Object.values(report.countingPolicy).map((rule) => `- ${rule}`), '',
    'These are counts of written source susceptibilities. A zero means no explicit weakness was found in the imported stat block, not that the creature is invincible. The known brown-bear/polar-bear import error remains flagged; the report adds no missing creatures.', '',
    'Data: [stock audit](../../data/bestiary/stock-vulnerability-audit.json). Ability baseline: [special-ability audit](special_ability_audit.md). Rebuild with `node scripts/bestiary/audit-stock-vulnerabilities.mjs`.', '',
    '## Distribution', '', '| Stock vulnerabilities per monster | Monsters |', '|---:|---:|',
    ...Object.entries(histogram).map(([count, total]) => `| ${count} | ${total} |`), '',
    '## Every monster', '',
    '| Monster | ID | Stock vulnerabilities | Stock count | Regen counters (not counted) | Required total | Still needed |', '|---|---|---|---:|---|---:|---:|',
  ];
  for (const row of rows) {
    const required = row.conditionalCounts ? `${Math.min(...row.conditionalCounts.map((condition) => condition.requiredVulnerabilityCount))}–${Math.max(...row.conditionalCounts.map((condition) => condition.requiredVulnerabilityCount))}` : row.requiredVulnerabilityCount;
    const needed = row.conditionalCounts ? `${Math.min(...row.conditionalCounts.map((condition) => condition.additionalVulnerabilitiesNeeded))}–${Math.max(...row.conditionalCounts.map((condition) => condition.additionalVulnerabilitiesNeeded))}` : row.additionalVulnerabilitiesNeeded;
    doc.push(`| ${row.name} | ${row.monsterId} | ${row.vulnerabilities.map((entry) => entry.name).join('; ') || 'None stated'} | ${row.stockVulnerabilityCount} | ${row.regenerationCounters.map((entry) => entry.name).join('; ') || '—'} | ${required} | ${needed} |`);
  }
  doc.push('', '## Existing vulnerability details', '');
  for (const row of rows.filter((entry) => entry.stockVulnerabilityCount > 0)) {
    doc.push(`### ${row.name}`, '');
    for (const entry of row.vulnerabilities) doc.push(`- **${entry.name}:** ${entry.effect}`);
    doc.push('');
  }
  doc.push('## Regeneration counters — separate from vulnerabilities', '', '| Monster | Counter | Stock effect |', '|---|---|---|');
  for (const row of rows) for (const counter of row.regenerationCounters) doc.push(`| ${row.name} | ${counter.name} | ${counter.effect} |`);
  doc.push('', 'These entries do not reduce the number of vulnerabilities still to author.', '', '## Conditional requirements', '');
  for (const row of rows.filter((entry) => entry.conditionalCounts)) {
    doc.push(`### ${row.name}`, '', '| Form or condition | Stock | Required | Still needed |', '|---|---:|---:|---:|');
    for (const condition of row.conditionalCounts) doc.push(`| ${condition.condition} | ${condition.stockVulnerabilityCount} | ${condition.requiredVulnerabilityCount} | ${condition.additionalVulnerabilitiesNeeded} |`);
    doc.push('');
  }
  doc.push(`With the current ability inventory and 26 proposed additions, the catalogue still needs **${totalRange[0]}–${totalRange[1]}** authored vulnerabilities, depending on Wendel forms and the Stone Warrior companion condition. No vulnerabilities were assigned or added by this audit.`, '');
  writeFileSync(resolve(root, 'docs/bestiary/stock_vulnerability_audit.md'), doc.join('\n'));
  writeCampaignVulnerabilityGaps(rows);
  console.log(JSON.stringify(report.summary));
  console.log(rows.filter((row) => row.stockVulnerabilityCount > 0).map((row) => `${row.monsterId}: ${row.stockVulnerabilityCount} (${row.vulnerabilities.map((entry) => entry.name).join('; ')})`).join('\n'));
  return report;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) buildStockVulnerabilityAudit();
