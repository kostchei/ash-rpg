import { z } from 'zod';
import { DOSSIER_REQUIREMENTS, type DossierCard, type DossierField, type DossierInput, type DossierReport, type Provenance } from '../../shared/dossier.js';
import { ZONE_PROFILES } from '../../shared/zone-profiles.js';
import { SITE_NAME_SOURCE, SITE_NAME_STYLES } from '../../shared/site-name-qualifiers.js';
import { randomAnchorName, randomCharacterName } from '../../shared/character-names.js';
import type { AshDatabase } from '../database.js';
import { createRandomSource } from './prng.js';
import { generateSiteInputs, drawTarot, type TarotReading } from './site-inputs.js';
import { generateNpc } from './npc.js';
import { generateCampaignMonster } from './campaign-monsters.js';
import { reactionRoll, rollDie, type RandomSource } from '../rules.js';
import { generateUnguardedTreasure } from '../rewards/core-treasure.js';
import { resolveGroupTreasure } from '../rewards/treasure.js';
import type { EncounterMonster } from '../../shared/types.js';
import { ZONE_SCENES, SITE_SCENES, REGIONAL_SITE_DETAILS, FAMILY_ACTIVITY, NPC_APPEARANCE, ENCOUNTER_ACTIVITY, JOB_STAKES, MOTIVE_SENTENCES, OBJECTIVE_VERBS, STORY_TABLE_VERSION } from './dossier-story.js';

const count = z.number().int().min(0).max(10);
export const dossierInputSchema = z.object({
  title: z.string().trim().min(1).max(100), seed: z.string().trim().min(1).max(100),
  zoneId: z.enum(['the_gloaming', 'red_sands', 'midnight_sun', 'river_of_night', 'dwellers_in_the_deep', 'city_of_masks']),
  minimumLevel: z.number().int().min(1).max(20),
  maximumLevel: z.number().int().min(1).max(30).optional(),
  namingStyle: z.enum(SITE_NAME_STYLES).optional(),
  monsterKeys: z.array(z.string().min(1).max(80)).max(30).refine(x => new Set(x).size === x.length, 'Monster choices must be unique').optional(),
  counts: z.object({ sites: count, encounters: count, npcs: count, treasures: count }),
  required: z.array(z.enum(DOSSIER_REQUIREMENTS)).max(4).refine(x => new Set(x).size === x.length, 'Required types must be unique'),
  allowProxies: z.boolean(),
}).refine(x => Object.values(x.counts).some(Boolean), 'Choose at least one record')
  .refine(x => x.maximumLevel === undefined || x.maximumLevel >= x.minimumLevel, 'Maximum level must be at least the minimum')
  .refine(x => x.counts.encounters >= x.required.length, 'Encounter count must cover all required types');

export function generateDossier(input: DossierInput, db: AshDatabase): DossierReport {
  const zone = ZONE_PROFILES[input.zoneId];
  const trace: Record<string, { bound: number; index: number }[]> = {};
  const stream = (key: string): RandomSource => {
    const rng = createRandomSource(`${input.seed}::${key}`);
    const draws: { bound: number; index: number }[] = trace[key] = [];
    return bound => { const index = rng(bound); draws.push({ bound, index }); return index; };
  };
  const pick = <T,>(list: T[], key: string): T => {
    if (!list.length) throw new Error(`No eligible results for ${key}. Select an existing-stock monster pool, adjust the level range, or choose a different zone.`);
    return list[stream(key)(list.length)];
  };
  const name = (key: string, ancestry?: string) => {
    const rng = stream(key); const random = () => rng(16777216) / 16777216;
    return ancestry ? randomCharacterName(ancestry, random) : randomAnchorName(random);
  };
  const cards: DossierCard[] = [];
  const coverage: DossierReport['coverage'] = [];
  const field = (label: string, value: string, provenance: Provenance, source: string): DossierField => ({ label, value, provenance, source });
  const tarot = (card: TarotReading): DossierField[] => [
    field('Tarot', `${card.title} / ${card.orientation} / ${card.facet.replaceAll('_', ' ')} — ${card.meaning}`, 'generated', `Seeded draw; verbatim stored meaning from data/oracles/tarot-cards.json: card ${card.cardId}, ${card.orientation}, ${card.facet}`),
  ];
  const missing = (value: string) => field('Unresolved', value, 'unresolved', 'No returned field or implemented completion procedure');
  const storySource = `dossier-story.ts v${STORY_TABLE_VERSION}; stored templates + explicit record links`;
  const act = input.minimumLevel >= 7 ? 3 : input.minimumLevel >= 4 ? 2 : 1;
  const holderSources: unknown[] = [];
  const sites = Array.from({ length: input.counts.sites }, (_, i) => {
    const site = generateSiteInputs({ pathId: 'regional', act, zoneId: input.zoneId, seed: input.seed, siteId: `dossier-site-${i + 1}`, namingStyle: input.namingStyle });
    const description = `${pick(SITE_SCENES[site.site.kind], `site-description-${i}`)} ${pick(REGIONAL_SITE_DETAILS[input.zoneId], `site-region-detail-${i}`)}`;
    const fields = [field('Name', site.name.full, 'generated', SITE_NAME_SOURCE), field('Description', description, 'generated', storySource), field('Shape', `${site.site.kind}; ${site.site.size}; ${site.site.areas} areas; sections ${site.site.sectionSizes.join(' + ')}; ${site.site.danger}`, 'generated', 'generateSiteInputs / site-layout'),
      ...tarot(site.card), field('Hazard', site.zone!.hazard, 'generated', `Zone ${input.zoneId} hazard table`)];
    for (const objective of site.objectives) {
      fields.push(field(`Section ${objective.section} / ${objective.mark}`, `${OBJECTIVE_VERBS[objective.kind] ?? objective.kind.replaceAll('_', ' ')} ${objective.target.name}\nPrompt: ${objective.prompt.phrase}\nHolder: ${objective.guardian.name}, LV ${objective.guardian.level}`, 'generated', 'generateSiteInputs: objective, target, prompt and guardian streams'));
      const holder = db.getMonster(objective.guardian.id);
      if (holder) {
        holderSources.push(holder);
        const corruptMove = /\b(?:AC|HP|ATK|LV)\s+\d/.test(holder.move ?? '');
        fields.push(field(`Section ${objective.section} holder combat block`, `${holder.name} / LV ${holder.level} / AC ${holder.ac} / HP ${holder.maxHp} / morale ${holder.morale}\nMove: ${corruptMove ? '[unresolved: malformed source movement field]' : holder.move}\nAttacks: ${(holder.attacks ?? []).join('; ')}\n${(holder.traits ?? []).join('\n')}`, 'source', `${holder.source}: ${holder.monsterKey}`));
        if (corruptMove) fields.push(missing(`${holder.name}: movement source contains another stat block. Original source record is retained in the audit export; verify the bestiary before play.`));
      }
      if (objective.kind === 'monster_eggs' && objective.target.brood?.id === 'mammoth') fields.push(missing('Invalid egg-table result: mammoth clutch. Retained without prose repair.'));
      if (objective.target.item && /benefit|virtue|flaw/.test(objective.target.item.description)) fields.push(missing('Site relic contains unfilled magic-item attributes.'));
    }
    fields.push(field('Level policy', `Act ${act} guardian band; site guardian levels do not follow the encounter minimum.`, 'selected', 'ACT_LEVEL_BANDS'), missing('Detailed room keys, maps, clue placement and completed symbolic mechanics.'));
    cards.push({ id: `S${i + 1}`, category: 'site', title: site.name.full, fields }); return site;
  });
  const qualifies = (level: number | undefined) => level !== undefined && level >= input.minimumLevel && level <= (input.maximumLevel ?? Infinity);
  const customPool = input.monsterKeys?.length ? input.monsterKeys.map(key => {
    const entry = db.getMonster(key);
    if (!entry) throw new Error(`Unknown stock monster: ${key}`);
    if (!qualifies(entry.level)) throw new Error(`${entry.name} does not meet the selected encounter level range.`);
    return entry;
  }) : undefined;
  const eligible = (customPool ?? db.getMonstersForZone(input.zoneId)).filter(m => qualifies(m.level));
  const keys: { key: string; policy: string; companion?: string }[] = [];
  for (const required of input.required) {
    let key: string | undefined; let proxy = false;
    if (required === 'vampire' && qualifies(db.getMonster('vampire')?.level)) key = 'vampire';
    if (required === 'giant') {
      const giants = db.listMonsters().filter(m => m.family === 'Giant' && qualifies(m.level));
      if (giants.length) key = pick(giants, 'required-giant').monsterKey;
    }
    if (required === 'demon_lord' && input.allowProxies && qualifies(db.getMonster('demon_balor')?.level)) { key = 'demon_balor'; proxy = true; }
    if (required === 'seawolf' && input.allowProxies && qualifies(db.getMonster('sea_serpent')?.level)) { key = 'nord'; proxy = true; }
    const detail = key ? `${proxy ? 'Explicit substitute' : 'Stock match'}: ${key}${required === 'seawolf' ? ' crew plus sea_serpent; crew are LV 2' : ''}.` : 'No exact supported entry meeting this minimum and substitution policy. No invented replacement.';
    coverage.push({ requirement: required, status: key ? proxy ? 'proxy' : 'met' : 'unresolved', detail });
    if (key) keys.push({ key, policy: `${required}: ${detail}`, ...(required === 'seawolf' ? { companion: 'sea_serpent' } : {}) });
  }
  while (keys.length < input.counts.encounters) {
    const used = new Set(keys.flatMap(choice => [choice.key, choice.companion].filter(Boolean)));
    const unused = eligible.filter(entry => !used.has(entry.monsterKey));
    const pool = unused.length ? unused : eligible;
    keys.push({ key: pick(pool, `zone-species-${keys.length + 1}`).monsterKey,
      policy: `Uniform draw from ${customPool ? 'user-selected stock pool (regional membership not assumed)' : `${input.zoneId} wandering entries`}; LV ${input.minimumLevel}-${input.maximumLevel ?? 'unbounded'}. Without replacement until exhausted${unused.length ? '' : '; pool exhausted, repeat permitted'}.` });
  }
  const monsterFields = (monster: EncounterMonster, prefix = ''): DossierField[] => {
    const fields = [field(`${prefix}Stats`, `LV ${monster.level}; AC ${monster.ac}; HP ${monster.maxHp}; morale ${monster.morale}; move ${monster.move}; alignment ${monster.alignment}`, 'source', `${monster.source}: ${monster.monsterKey}`),
      field(`${prefix}Ability modifiers`, Object.entries(monster.abilities ?? {}).map(([k, v]) => `${k.toUpperCase()} ${v}`).join(' / '), 'source', 'Stock bestiary; modifiers, not scores'),
      field(`${prefix}Attacks`, (monster.attacks ?? []).join('\n') || 'None returned', 'source', `${monster.source}: ${monster.monsterKey}`)];
    const traits = monster.traits ?? [];
    const weaknesses = monster.vulnerabilities ?? [];
    const numbered = (entries: string[]) => entries.map((entry, index) => `${index + 1}. ${entry}`).join('\n');
    if (traits.length) fields.push(field(`${prefix}Abilities`, numbered(traits), 'source', 'Stock traits / stored ability-additions.json'));
    if (weaknesses.length) fields.push(field(`${prefix}Weaknesses`, numbered(weaknesses), weaknesses.some(weakness => weakness.includes('[Theme;')) ? 'unresolved' : 'source', 'Campaign profile / vulnerability-pool.json; entries marked [Theme;] need authored mechanics'));
    return fields;
  };
  const encounters = keys.map((choice, i) => {
    const base = db.getMonster(choice.key)!; const monster = generateCampaignMonster(base, `${input.seed}::encounter-${i}`);
    const companion = choice.companion ? generateCampaignMonster(db.getMonster(choice.companion)!, `${input.seed}::encounter-${i}::companion`) : undefined;
    const count = choice.key === 'nord' && choice.companion ? rollDie(6, stream(`crew-${i}`)) + 6 : 1;
    const reading = drawTarot(stream(`encounter-card-${i}`)); const reaction = reactionRoll(0, stream(`encounter-reaction-${i}`));
    const allTerrain = zone.terrainPriors.flatMap(t => t.biomes);
    const terrainPool = /swim/.test(monster.move ?? '') || companion
      ? allTerrain.filter(t => /water|fjord|sound|river|lake|inlet|coast|shore|harbor|estuary|canal|lagoon|mudflat|siphon/i.test(t)) : allTerrain;
    const terrain = pick(terrainPool.length ? terrainPool : allTerrain, `encounter-terrain-${i}`);
    const treasure = resolveGroupTreasure(`dossier-${i}`, companion?.level ?? monster.level, undefined, stream(`encounter-loot-${i}`));
    const title = name(`encounter-name-${i}`);
    const fields = [field('Selection', choice.policy, 'selected', 'Required-type policy / zone wandering table'), field('Composition', `${count} ${base.name}${companion ? ` + 1 ${companion.name}` : ''}`, choice.companion ? 'selected' as const : 'generated' as const, 'Singleton policy; Nord crew d6+6'),
      field('Terrain', terrain, 'generated', 'Uniform zone label draw; swimming creatures prefer aquatic/coastal labels when available'), ...tarot(reading), field('Reaction', `${reaction.dice.join(' + ')} = ${reaction.total}: ${reaction.reaction}`, 'generated', 'reactionRoll (2d6, CHA modifier 0)'), ...monsterFields(monster),
      ...(companion ? monsterFields(companion, 'Companion ') : []),
      field('Carried treasure', `${treasure.present ? [...treasure.items, ...Object.entries(treasure.coins).filter(([, v]) => v > 0).map(([k, v]) => `${v} ${k}`)].join('; ') : 'None'}\nQuality ${treasure.quality}; XP value ${treasure.xpValue}; ${treasure.tableBasis}`, 'generated', 'resolveGroupTreasure; companion level when present, otherwise primary creature level'),
      missing('Bespoke motive, clues, symbolic weakness effects and any magical companion bond.')];
    const specialActivity = choice.key === 'nord' && !companion ? undefined : ENCOUNTER_ACTIVITY[choice.key as keyof typeof ENCOUNTER_ACTIVITY];
    const activityPool = specialActivity ?? FAMILY_ACTIVITY[/swim/.test(monster.move ?? '') ? 'aquatic' : base.family ?? ''] ?? ENCOUNTER_ACTIVITY.default;
    fields.unshift(field('Situation', pick(activityPool, `encounter-activity-${i}`), 'generated', storySource));
    cards.push({ id: `E${i + 1}`, category: 'encounter', title, fields }); return { choice, title, count, monster, companion, reading, reaction, terrain, treasure };
  });
  const npcs = Array.from({ length: input.counts.npcs }, (_, i) => {
    const npc = generateNpc([], input.zoneId, stream(`npc-${i}`), { classed: true }); const title = name(`npc-name-${i}`, npc.ancestry);
    const reading = drawTarot(stream(`npc-card-${i}`)); const faction = pick(zone.factions, `npc-faction-${i}`); const reaction = reactionRoll(0, stream(`npc-reaction-${i}`));
    cards.push({ id: `N${i + 1}`, category: 'npc', title, fields: [
      field('Description', `${title} is a ${npc.ancestry} ${npc.className}. ${pick(NPC_APPEARANCE, `npc-description-${i}`)} ${npc.quirk}`, 'generated', storySource),
      field('Identity', `${npc.ancestry} ${npc.className}${npc.zoneSubclass ? `; local colour ${npc.zoneSubclass}` : ''}`, 'generated', 'generateNpc; independent class/local-colour rolls'),
      field('Retainer', `LV ${npc.retainerStats.level}; HP ${npc.retainerStats.hp}; morale ${npc.retainerStats.morale}; ${npc.retainerStats.dailyWage}`, 'generated', 'generateNpc; NPC levels remain 1–3'),
      field('Ability scores', Object.entries(npc.abilities).map(([k, v]) => `${k.toUpperCase()} ${v}`).join(' / '), 'generated', `generateNpc: ${npc.abilityMethod}`),
      field('Demeanor', `${npc.demeanor}\n${npc.quirk}`, 'generated', 'NPC demeanor/quirk table'), field('Motive', `${npc.motive}\n${npc.interaction}`, 'generated', 'NPC motive table'),
      field('Faction', faction.name, 'generated', 'Uniform draw from zone factions'), field('Reaction', `${reaction.dice.join(' + ')} = ${reaction.total}: ${reaction.reaction}`, 'generated', 'reactionRoll'), ...tarot(reading), missing('Mechanical gear loadout, named subjects of motives and bespoke offers.') ] });
    return { title, npc, reading, faction, reaction };
  });
  const treasures = Array.from({ length: input.counts.treasures }, (_, i) => {
    const result = generateUnguardedTreasure(input.minimumLevel, stream(`treasure-${i}`)); const reading = drawTarot(stream(`treasure-card-${i}`));
    cards.push({ id: `T${i + 1}`, category: 'treasure', title: result.items.join('; ') || 'Coin find', fields: [
      field('Find', [...result.items, ...Object.entries(result.coins).filter(([, v]) => v > 0).map(([k, v]) => `${v} ${k}`)].join('; '), 'generated', 'generateUnguardedTreasure; Core treasure + item-name pool'),
      field('Value', `${result.entry.valueGp} gp; ${result.quality}; XP value ${result.xpValue}`, 'generated', 'Runtime quality mapping; not an earned XP award'),
      field('Table', `${result.tableBasis}; discovering LV ${input.minimumLevel}`, 'source', 'Selected row range; roll field is row lower bound, not original d100 face'), ...tarot(reading), missing('Owner, history and any spell/benefit/virtue/flaw placeholders in the item row.') ] }); return { result, reading };
  });
  // Allocation is a published assembly rule, not an inferred oracle meaning.
  const links = cards.filter(c => c.category !== 'site').map((card, index) => ({ record: card.id,
    site: sites.length ? `S${index % sites.length + 1}` : null }));
  for (const siteCard of cards.filter(c => c.category === 'site')) {
    const linked = links.filter(link => link.site === siteCard.id).map(link => cards.find(c => c.id === link.record)!);
    if (linked.length) siteCard.fields.splice(1, 0, field('At this site', linked.map(c => `${c.id}: ${c.title}`).join('\n'), 'selected', 'Round-robin allocation of non-site records; no implied friendship or control'));
  }
  for (const link of links) {
    const card = cards.find(c => c.id === link.record)!;
    if (link.site) card.fields.push(field('Location', `${link.site}: ${cards.find(c => c.id === link.site)!.title}`, 'selected', 'Round-robin allocation; encounter terrain is a separate approach label'));
  }
  const firstSite = sites[0]; const firstNpc = npcs[0];
  const story: DossierField[] = [field('Opening', pick(ZONE_SCENES[input.zoneId], 'story-opening'), 'generated', storySource)];
  if (firstNpc) story.push(field('The request', `${firstNpc.title} brings the work to the party through ${firstNpc.faction.name}. ${(MOTIVE_SENTENCES[firstNpc.npc.motive] ?? '{name} asks for help with the listed work.').replace('{name}', firstNpc.title)}`, 'generated', storySource));
  if (firstSite) {
    story.push(field('First expedition', `Begin at ${firstSite.name.full}. ${firstSite.objectives.map(o => `${OBJECTIVE_VERBS[o.kind] ?? 'Resolve'} ${o.target.name}.`).join(' ')} Each section has its own holder and marked threshold. The other listed sites are additional jobs in the same region.`, 'generated', storySource));
    story.push(field('Stakes', pick(JOB_STAKES, 'story-stakes'), 'generated', storySource));
  }
  story.push(field('At the table', 'The associated encounters use the listed reaction rolls. Treasure is allocated to the listed sites, but its discovery and access still need to be resolved in play. Tarot meanings are prompts; they do not add an unlisted power or compel an outcome.', 'selected', 'Published dossier assembly and play policy'));
  return { version: 1, input, zoneName: zone.name, coverage, cards, story, raw: { sites, holderSources, encounters, npcs, treasures, links, trace, storyTableVersion: STORY_TABLE_VERSION } };
}
