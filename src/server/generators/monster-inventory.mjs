import assert from 'node:assert/strict';

const slug = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

const ignored = new Map([
  ['Weakness', 'Existing vulnerability, not an advantage.'],
  ['Desiccated', 'Fire vulnerability, not an advantage.'],
  ['Sunblind', 'Light vulnerability, not an advantage.'],
  ['Sunlight Sensitivity', 'Sunlight vulnerability, not an advantage.'],
  ['Bound', 'Servitude-breaking contingency, not an advantage.'],
  ['Corruption', 'Backstory without a stated advantageous mechanic.'],
  ['Overwhelm', 'Sensory restriction, not an advantage.'],
  ['Bezoar', 'Treasure in the body; no monster-use ability specified.'],
  ['Half-Amphibious', 'Water dependency is a restriction; Swimming is counted from movement.'],
]);
const continuations = /^(?:Focus|Self|Close)[.:]|^Lasts until dismissed\.|^Follows sorcerer's commands\.|^Tentacle auto-hits each round\./;

// Independently useful passive defences are separate abilities. A named active
// power (e.g. Rage or Mind Blast) remains one ability with its bundled effects.
const defenceTraits = /^(?:Impervious|Golem|Legendary(?: Undead)?|Greater Undead|Supreme Undead|Deep Dweller|Divine Courage|Undead|Fearless|Thick Fur|Fireblood|Frostblood|Stormblood|Iron Hide|Stone Hide|Rubbery|Reflective Carapace)$/;

export function inventory(monster) {
  const abilities = [];
  const excluded = [];
  const notes = [];
  const seen = new Map();
  const add = (name, kind, field, evidence, key = slug(name)) => {
    if (seen.has(key)) {
      seen.get(key).references.push({ field, evidence });
      return;
    }
    const ability = { id: key, name, kind, references: [{ field, evidence }] };
    abilities.push(ability);
    seen.set(key, ability);
  };

  let traits = monster.traits.map((text, index) => ({ text, index }));
  let move = monster.move;
  // Audited against Core PDF page 202 (printed p.198), without editing stats.
  if (monster.id === 'bear_brown') {
    notes.push('Source error: movement contains the next polar-bear stat block; level is also borrowed. Audit uses brown-bear Climbing + Crush only. Polar bear is missing as a separate imported record. Source: Core PDF p.202 / printed p.198.');
    move = 'near (climb)';
    traits = traits.filter((trait) => !trait.text.startsWith('Thick Fur.'));
    excluded.push({ field: 'traits[1]', evidence: monster.traits[1], reason: 'Polar-bear Cold immunity was imported into the brown bear; excluded after checking the source.' });
  }

  // Spell paragraphs imported as several entries are one named spell.
  const groups = [];
  for (const trait of traits) {
    if (continuations.test(trait.text)) {
      assert.ok(groups.length, `${monster.id}: orphan continuation ${trait.text}`);
      groups.at(-1).parts.push(trait);
    } else {
      groups.push({ parts: [trait] });
    }
  }

  for (const group of groups) {
    const text = group.parts.map((part) => part.text).join(' ');
    const field = group.parts.map((part) => `traits[${part.index}]`).join(', ');
    const header = text.match(/^(.+?)[.:](?:\s|$)/)?.[1];
    assert.ok(header, `${monster.id}: trait has no recognizable heading: ${text}`);
    const name = header.replace(/ \([A-Z]{3} [Ss]pell\)$/, '');

    if (monster.id === 'wendel' && name !== 'Sticky') continue;
    if (ignored.has(name)) {
      excluded.push({ field, evidence: text, reason: ignored.get(name) });
      continue;
    }

    if (defenceTraits.test(name)) {
      let count = 0;
      const def = (label, key = slug(label)) => { add(label, 'defence', field, text, key); count++; };
      if (/immune to morale/i.test(text)) def('Morale immunity');
      if (/(?:only|can only) (?:be )?(?:damaged|harmed|injured) by|only harmed by/i.test(text)) {
        def(/only (?:damaged|harmed) by fire/i.test(text) ? 'Immunity to damage other than fire' : /silver/i.test(text) ? 'Ordinary-damage immunity (silver or magic bypasses)' : 'Ordinary-damage immunity');
      }
      if (/half damage from non-magical/i.test(text)) def('Nonmagical-weapon resistance');
      if (/half damage from stabbing/i.test(text)) def('Piercing resistance');
      if (/half damage from stabbing and cutting/i.test(text)) def('Slashing resistance');
      if (/immune/i.test(text)) {
        for (const [pattern, label] of [[/\bfire\b/i, 'Fire immunity'], [/\bcold\b/i, 'Cold immunity'], [/\belectricity\b/i, 'Lightning immunity'], [/\bacid\b/i, 'Acid immunity']]) {
          // Healing clauses are handled separately and do not imply immunity.
          const immunityText = text.split(/Healed by/i)[0];
          if (pattern.test(immunityText)) def(label);
        }
      }
      if (/non-magical sources/i.test(text) && /immune/i.test(text)) def('Ordinary-damage immunity');
      if (/hostile spells.*(?:DC|tier)/i.test(text) || /immune to hostile spells/i.test(text)) def(/tier/i.test(text) ? 'Low-tier spell immunity' : 'Spell resistance');
      if (/Amphibious/i.test(text)) def('Amphibious breathing');
      const healing = text.match(/Healed by (acid|electricity|fire)/i);
      if (healing) def(`Healing from ${healing[1].toLowerCase()}`);
      if (name === 'Reflective Carapace') {
        def('Energy-ray immunity');
        def('Energy reflection');
      }
      assert.ok(count, `${monster.id}: unclassified defence: ${text}`);
      continue;
    }

    if (name === 'Mesmerism') {
      add('Thought reading', 'sense', field, text);
      add('Illusory humanoid appearance', 'transformation', field, text);
    } else if (name === 'Vampire' || name === 'Ur-Vampire') {
      add('Survival until staked at 0 HP', 'survival', field, text);
      excluded.push({ field, evidence: text, reason: 'Coffin dependency and sunlight harm are vulnerabilities; only the exceptional survival clause counts.' });
    } else if (name === 'Bottomless Bag') {
      add('Extradimensional storage', 'equipment', field, text);
      add('Recall bag', 'equipment', field, text);
    } else if (name === 'Moonbite Properties') {
      add('Moonbite: enchanted returning weapon', 'equipment', field, text);
      add('Moonbite: healing interference', 'curse', field, text);
    } else if (name === 'Pyro') {
      add('Ignition damage bonus', 'offence', field, text);
      add('Fire immunity', 'defence', field, text);
    } else if (name === 'Absorb Ambient Light') {
      add('Absorb Ambient Light', 'aura', field, text);
      add('Healing from ambient-light absorption', 'healing', field, text);
    } else if (monster.id === 'mugdulblub' && name === 'Mutagenic') {
      add('Mutagenic aura', 'aura', field, text);
      add('Dissolve', 'curse', field, text);
      notes.push('Dissolve was merged into the Mutagenic trait during import; counted as a separate named power.');
    } else if (name === 'Eye of the Master') {
      add('Eye of the Master: Confuse', 'spell', field, text);
      add('Eye of the Master: Disintegrate', 'spell', field, text);
      add('Eye of the Master: Telekinesis', 'spell', field, text);
    } else if (monster.id === 'the_ten_eyed_oracle' && name === 'Eyestalk Ray') {
      excluded.push({ field, evidence: text, reason: 'Delivery/action rules for the ten separately counted rays, not an eleventh power.' });
    } else {
      const specialName = name === 'Sticky' ? 'Climbing' : name;
      add(specialName, /Spell\)/i.test(header) ? 'spell' : name === 'Sticky' ? 'movement' : 'trait', field, text);
      if (monster.id === 'gorgon' && name === 'Petrifying Breath') add('Petrification immunity', 'defence', field, text);
      if (monster.id === 'demon_balor' && name === 'Grab') add('Fling grabbed target', 'control', field, text);
    }
  }

  // Movement listed twice (e.g. Sticky + climb) is one ability.
  const movement = { fly: 'Flight', climb: 'Climbing', burrow: 'Burrowing', swim: 'Swimming', teleport: 'Teleport movement' };
  const modes = move.match(/\(([^)]+)\)/)?.[1].split(',').map((mode) => mode.trim()) ?? [];
  for (const mode of modes) {
    if (mode === 'mount') {
      notes.push('Mounted movement is equipment/position, not an intrinsic special ability; any named companion trait is counted separately.');
      continue;
    }
    assert.ok(movement[mode], `${monster.id}: unknown movement mode ${mode}`);
    add(movement[mode], 'movement', 'move', monster.move);
  }

  if (monster.ac >= 20) add(`Exceptional armour (AC ${monster.ac})`, 'numeric_defence', 'ac', String(monster.ac), 'exceptional_ac');
  if (monster.hp >= 100) add(`Exceptional endurance (${monster.hp} HP)`, 'numeric_defence', 'hp', String(monster.hp), 'exceptional_hp');

  // Special attack entries without a corresponding trait. Ordinary weapons,
  // natural attacks, long reach, and multiple attacks are not separate powers.
  const attackOnly = {
    ankheg: [['Acid spray', 1]],
    assassin: [['Poisoned dagger', 0]],
    devil_barbed: [['Fire blast', 1]],
    devil_horned: [['Fire blast', 1]],
    efreeti: [['Fire bolt', 1]],
  };
  for (const [name, index] of attackOnly[monster.id] ?? []) add(name, 'attack', `attacks[${index}]`, monster.attacks[index]);
  if (monster.id === 'assassin') notes.push('Poisoned dagger is named in the attack but has no poison rule in the imported traits. Counted as a poison attack; exact poison resolution needs source clarification.');

  // Wendel gets one of eight forms, not all eight simultaneously. Shared Sticky
  // and movement are already deduplicated. Source: Cursed Scroll 5 printed p.35.
  let variants;
  if (monster.id === 'wendel') {
    variants = [
      ['Pearly', []],
      ['Ocher', ['Contact toxin']],
      ['Silky', ['Cushioning hair (AC 12 override)']],
      ['Puce', ['Acid spit']],
      ['Red', ['Morale immunity']],
      ['Woolly', ['Cold immunity']],
      ['Sea', ['Swimming', 'Amphibious breathing']],
      ['Spiny', ['Spiked slam (damage override)']],
    ].map(([name, extraAbilities]) => ({ name, extraAbilities, existingAbilityCount: abilities.length + extraAbilities.length }));
    notes.push('Mutually exclusive Wendel forms checked against Cursed Scroll 5 p.35. Pearly trainability is ordinary domestication, not a special advantage. Counts and vulnerability requirements depend on the selected form.');
  }
  if (monster.id === 'stone_warrior') {
    const companion = abilities.find((ability) => ability.name === 'Basilisk Hatchling');
    assert.ok(companion);
    abilities.splice(abilities.indexOf(companion), 1);
    variants = [
      { name: 'No hatchling (5:6)', extraAbilities: [], existingAbilityCount: abilities.length },
      { name: 'Loyal hatchling present (1:6)', extraAbilities: ['Basilisk companion'], existingAbilityCount: abilities.length + 1 },
    ];
    excluded.push({ field: companion.references[0].field, evidence: companion.references[0].evidence, reason: 'Companion is conditional, counted only in the hatchling-present branch.' });
    notes.push('Basilisk companion has a 1:6 chance of being present. Camouflage always counts; the companion adds one only when present. The hatchling itself has its own Petrify ability in its own record, not added to the warrior count.');
  }

  return { abilities, excluded, notes, variants };
}

export function stockVulnerabilities(monster) {
  const vulnerabilities = [];
  const seen = new Map();
  const add = (id, name, kind, effect, field, evidence) => {
    if (seen.has(id)) {
      seen.get(id).references.push({ field, evidence });
      return;
    }
    const entry = { id, name, kind, effect, references: [{ field, evidence }] };
    seen.set(id, entry);
    vulnerabilities.push(entry);
  };
  monster.traits.forEach((text, index) => {
    const field = `traits[${index}]`;
    const capture = (id, name, kind, effect) => add(id, name, kind, effect, field, text);
    if (/^Sunblind[.:]/.test(text)) capture('bright_light', 'Bright light', 'environment', 'Blinded in bright light.');
    if (/^Sunlight Sensitivity[.:]/.test(text)) capture('sunlight', 'Sunlight', 'environment', 'Disadvantage on attacks in sunlight and 1d4 damage per round of exposure.');
    if (/^Desiccated[.:]/.test(text)) capture('fire', 'Fire', 'damage', 'Fire can damage it, including ordinary fire, and deals double damage.');
    if (/^Impervious[.:].*(?:Only damaged by fire|Only harmed by fire)/i.test(text)) capture('fire', 'Fire', 'specific_defence_exception', 'Fire is the explicitly named substance that can damage it. No damage multiplier is stated.');
    if (/(?:only damaged|only harmed|only injured|can only be damaged) by silver or magic/i.test(text)) capture('silver', 'Silver', 'specific_defence_exception', 'Silver can damage it despite its protection against ordinary damage. No damage multiplier is stated.');
    if (/^(?:Vampire|Ur-Vampire)[.:]/.test(text)) {
      capture('resting_vessel', /^Ur-Vampire/.test(text) ? 'Sarcophagus dependence' : 'Coffin dependence', 'dependency', /^Ur-Vampire/.test(text)
        ? 'Must rest in its sarcophagus once per moon cycle or lose 2d8 HP per day; that loss cannot heal until sarcophagus rest.'
        : 'Must rest in a coffin daily or lose 2d6 HP per day; that loss cannot heal until coffin rest.');
      capture('sunlight', 'Direct sunlight', 'environment', 'Takes 3d8 damage each round in direct sunlight.');
      capture('stake', /^Ur-Vampire/.test(text) ? 'Tal-Yool wooden stake at 0 HP' : 'Wooden stake at 0 HP', 'permanent_death_condition', /^Ur-Vampire/.test(text)
        ? 'A stake carved from a Tal-Yool jungle tree, through the heart at 0 HP, permits permanent death.'
        : 'A wooden stake through the heart at 0 HP permits permanent death.');
    }
    if (/^Phylactery[.:]/.test(text)) capture('phylactery', 'Destroy the phylactery', 'external_anchor', 'Its spirit vessel must be destroyed to permit its death.');
    if (/^Bound[.:]/.test(text)) capture('servitude_contingency', 'Secret mundane contingency', 'binding_condition', 'A particular secret mundane condition ends its magical servitude; the touch of a feather is an example, not a universal trigger.');
    if (/^Half-Amphibious[.:]/.test(text)) capture('water_dependency', 'Water deprivation', 'dependency', 'Without submersion in water at least every four hours, it suffocates.');
    if (/^Overwhelm[.:]/.test(text)) capture('sensory_overload', 'Uncovered eyes or ears', 'sensory', 'It has disadvantage on checks if its eyes or ears are uncovered.');
    if (/^Weakness[.:]/.test(text)) capture('holy_crossbow_bolt', 'Crossbow bolt enchanted with Holy Weapon', 'fatal_susceptibility', 'A crossbow bolt under the Holy Weapon spell kills it.');
    if (/^Petrify[.:].*including medusa/i.test(text)) capture('own_gaze', 'Its own petrifying gaze', 'self_susceptibility', 'Its own petrification rule explicitly includes the medusa as a possible victim; DC 15 CON or petrified.');
    if (/^Permanent Death[.:].*wish/i.test(text)) capture('wish_at_zero', 'Wish at 0 HP', 'permanent_death_condition', 'A Wish spell cast on it at 0 HP permits permanent death.');
    if (/^Swallow[.:].*regurgitates/i.test(text)) {
      const damage = text.match(/at least (\d+) damage/)[1];
      capture('gullet_injury', 'Gullet injury', 'anatomical', `At least ${damage} damage inside its gullet in one round makes it regurgitate all swallowed creatures.`);
    }
    if (/^Tendrils[.:].*severs/i.test(text)) capture('severable_tendrils', 'Severable tendrils', 'anatomical', 'Each tendril is AC 18; dealing at least 4 damage to one severs it. Counted once, not once per tendril.');
  });
  return vulnerabilities;
}

export function regenerationCounters(monster) {
  const counters = [];
  monster.traits.forEach((text, index) => {
    if (!/^Regenerate[.:]/.test(text)) return;
    const add = (id, name, effect) => counters.push({ id, name, effect, references: [{ field: `traits[${index}]`, evidence: text }] });
    if (/cauterized with fire/i.test(text)) add('fire', 'Fire', 'Cauterizing its wounds with fire prevents regeneration; no extra damage is stated.');
    if (/cauterized with (?:fire or )?acid/i.test(text)) add('acid', 'Acid', 'Cauterizing its wounds with acid prevents regeneration; no extra damage is stated.');
    if (/cold iron weapon/i.test(text)) add('cold_iron', 'Cold iron', 'An injury from a cold iron weapon in the prior round prevents regeneration; no extra damage is stated.');
  });
  return counters;
}

