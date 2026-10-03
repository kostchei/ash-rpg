import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { AshDatabase } from '../src/server/database.js';
import { generateSiteInputs, drawTarot, renderSiteInputBrief } from '../src/server/generators/site-inputs.js';
import { generateNpc } from '../src/server/generators/npc.js';
import { createRandomSource } from '../src/server/generators/prng.js';
import { randomAnchorName, randomCharacterName } from '../src/shared/character-names.js';
import { ZONE_PROFILES } from '../src/shared/zone-profiles.js';
import { generateUnguardedTreasure } from '../src/server/rewards/core-treasure.js';
import { resolveGroupTreasure } from '../src/server/rewards/treasure.js';
import { reactionRoll, rollDie, type RandomSource } from '../src/server/rules.js';
import { renderProceduralDossier } from './render-procedural-dossier.js';

const seed = process.argv[2] ?? 'skeldir-hrafnfjord-2026-10-03';
const output = 'outputs/hrafnfjord-10plus';
const trace: Record<string, Array<{ sides: number; result: number }>> = {};
function stream(key: string): RandomSource {
  const random = createRandomSource(`${seed}::${key}`);
  const draws = trace[key] = [];
  return sides => { const result = random(sides); draws.push({ sides, result }); return result; };
}
const pick = <T,>(pool: readonly T[], key: string): T => pool[stream(key)(pool.length)];
const names = (key: string, ancestry = '') => {
  const rng = stream(key);
  return ancestry ? randomCharacterName(ancestry, () => rng(0x1000000) / 0x1000000)
    : randomAnchorName(() => rng(0x1000000) / 0x1000000);
};
const zone = ZONE_PROFILES.midnight_sun;
const db = new AshDatabase(':memory:');
try {
  const campaign = db.createCampaign('Skeldir authoring samples', 'Hrafnfjord', '1234');
  db.db.prepare('UPDATE campaigns SET code = ? WHERE id = ?').run(seed, campaign.campaignId);
  const sites = Array.from({ length: 5 }, (_, i) => generateSiteInputs({
    pathId: 'regional', act: 3, zoneId: 'midnight_sun', seed, siteId: `skeldir-site-${i + 1}`,
  }));
  const keys = [
    'vampire', 'nord', 'demon_balor',
    pick(['giant_cloud', 'giant_storm'], 'giant-species'),
    pick(['sea_serpent', 'valkyrie', 'dragon_frost', 'remorhaz'], 'fifth-species'),
  ];
  const encounters = keys.map((key, i) => {
    const base = db.getMonster(key);
    assert(base, `Missing stock monster ${key}`);
    const monster = db.getCampaignMonster(campaign.campaignId, base);
    const count = key === 'nord' ? rollDie(6, stream('seawolf-count')) + 6 : 1;
    const companion = key === 'nord' ? db.getCampaignMonster(campaign.campaignId, db.getMonster('sea_serpent')!) : undefined;
    const rng = stream(`encounter-${i + 1}`);
    const level = companion?.level ?? monster.level;
    return {
      key, name: names(`encounter-name-${i + 1}`), count, monster, companion,
      tarot: drawTarot(stream(`encounter-card-${i + 1}`)), reaction: reactionRoll(0, rng),
      terrain: pick(zone.terrainPriors.flatMap(x => x.biomes), `encounter-terrain-${i + 1}`),
      carriedTreasure: resolveGroupTreasure(`skeldir-encounter-${i + 1}`, level, undefined, rng),
    };
  });
  const npcs = Array.from({ length: 5 }, (_, i) => {
    const npc = generateNpc([], 'midnight_sun', stream(`npc-${i + 1}`), { classed: true });
    return { name: names(`npc-name-${i + 1}`, npc.ancestry), ...npc,
      tarot: drawTarot(stream(`npc-card-${i + 1}`)),
      faction: pick(zone.factions, `npc-faction-${i + 1}`),
      reaction: reactionRoll(0, stream(`npc-reaction-${i + 1}`)),
    };
  });
  const treasures = Array.from({ length: 5 }, (_, i) => ({
    level: 10 + i, result: generateUnguardedTreasure(10 + i, stream(`treasure-${i + 1}`)),
    tarot: drawTarot(stream(`treasure-card-${i + 1}`)),
  }));
  // Complete the wand's explicit placeholders using verified Core pp. 288–289,
  // 294–295. These follow-up rolls are separate from the runtime treasure roll.
  const wandRng = stream('wand-completion');
  const wandCompletion = {
    source: 'Shadowdark Core pp. 288–289, 294–295 (local extracted rulebook)',
    featureRoll: rollDie(8, wandRng), spellRoll: rollDie(12, wandRng),
    virtueRoll: rollDie(20, wandRng), flawRoll: rollDie(20, wandRng),
    traitRow: rollDie(4, wandRng), traitColumn: rollDie(4, wandRng),
    flawSubroll: rollDie(4, wandRng),
  };
  const armorRng = stream('site-armor-completion');
  const armorCompletion = { source: 'Shadowdark Core pp. 284–285, 294',
    typeDice: [rollDie(6, armorRng), rollDie(6, armorRng)],
    featureRoll: rollDie(20, armorRng), benefitRoll: rollDie(12, armorRng), virtueRoll: rollDie(20, armorRng) };
  const supportingKeys = [...new Set(sites.flatMap(site => site.objectives.flatMap(objective =>
    [objective.guardian.id, objective.target.brood?.id].filter((key): key is string => Boolean(key)))))];
  const supportingMonsters = supportingKeys.map(key => db.getMonster(key));
  assert(supportingMonsters.every(Boolean), 'A generated site occupant lacks a stock stat block');
  assert.equal(sites.length, 5);
  assert.equal(encounters.length, 5);
  assert.equal(npcs.length, 5);
  assert.equal(treasures.length, 5);
  assert(encounters.every(e => (e.companion?.level ?? e.monster.level ?? 0) >= 10));
  const report = { seed, zoneId: 'midnight_sun', localLabel: 'Skeldir (user-supplied name)',
    constraints: ['Requested vampire, seawolf, demon lord and giant are deliberate selections, not claimed as wandering-table draws.',
      'Seawolf uses stock Nord crew plus a stock level-12 Sea Serpent; no level inflation.',
      'Demon lord uses the stock level-16 Balor chassis; its title is authoring, not a separate bestiary entry.',
      'Sites are actual act-3 regional input bundles; their default guardians remain level 5–10.',
      'NPCs retain actual generated levels 1–3; 10+ refers to adventurers, not every resident.',
      'Tarot meanings and symbolic vulnerability themes require interpretation; raw output preserves them.',
      'All five unguarded treasure rolls are retained, including poor results.'],
    sites, encounters, npcs, treasures, wandCompletion, armorCompletion, supportingMonsters, trace };
  mkdirSync(output, { recursive: true });
  writeFileSync(`${output}/draws.json`, JSON.stringify(report, null, 2) + '\n');
  writeFileSync(`${output}/site-inputs.md`, sites.map(renderSiteInputBrief).join('\n\n---\n\n'));
  writeFileSync(`${output}/procedural.md`, renderProceduralDossier(report));
  console.log(JSON.stringify({ seed, sites, encounters, npcs, treasures }, null, 2));
} finally { db.close(); }
