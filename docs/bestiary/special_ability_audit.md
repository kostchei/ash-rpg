# Monster special-ability audit

Audited **301 imported records**: **26** have no existing special abilities under the policy below. **26** proposed additions are stored separately from the imported stats.

## Counting policy

- One named active power, including bundled riders, is one ability. Independent passive defences are separate abilities.
- Flight, climbing, burrowing, swimming, and teleportation count; speed alone, mounting, reach, and ordinary multiattack do not.
- Base AC >=20 and HP >=100 each add one ability. A power granting high AC is counted once as that power, not again as a conditional number.
- Vulnerabilities, background, loot without monster use, and imported continuation fragments are not additional abilities.
- An attack rider explained by a named trait and movement repeated in a trait are counted once. Independent trait protections remain separate.
- Existing counts exclude all draft additions. Planned counts include one proposed ability for every zero-ability record.
- Wendel lists shared and per-form counts; its eight possible forms are not combined. Stone Warrior lists counts with and without its conditional companion.
- One plus final special-ability count. Vulnerabilities need not counter those abilities.
- This report and additions do not change imported stats or runtime combat behaviour.

**Review notes:** brown-bear data contains polar-bear bleed (and the polar bear is missing); its count below is corrected from the source without changing the imported file. The assassin's poison attack lacks a resolution rule. Wendel has alternative forms. Stone Warrior's basilisk companion is conditional. These issues remain visible in the JSON report.

Counts are an authoring inventory, not a claim that every existing ability is tactically interesting. A flat named damage bonus counts as an existing ability, but does not by itself satisfy the separate goal of tactical identity.

Data: [full audit](../../data/bestiary/special-ability-audit.json), [draft additions](../../data/bestiary/ability-additions.json). Rebuild: `node scripts/bestiary/audit-special-abilities.mjs`.

## All monsters

| Monster | ID | Existing abilities | Ability inventory | Planned count | Vulnerabilities required |
|---|---|---:|---|---:|---:|
| Aboleth | aboleth | 4 | Curse; Enslave; Telepathic; Swimming | 4 | 5 |
| Acolyte | acolyte | 1 | Healing Touch | 1 | 2 |
| Angel Seraph | angel_seraph | 2 | Bless; Flight | 2 | 3 |
| Angel Domini | angel_domini | 2 | Horn; Flight | 2 | 3 |
| Angel Principi | angel_principi | 3 | Moonlight Aura; Truesight; Flight | 3 | 4 |
| Archangel | archangel | 3 | Command; Crown of Fire; Flight | 3 | 4 |
| Ape Snow | ape_snow | 2 | Cold immunity; Climbing | 2 | 3 |
| Ape | ape | 1 | Climbing | 1 | 2 |
| Ankheg | ankheg | 2 | Burrowing; Acid spray | 2 | 3 |
| Animated Armor | animated_armor | 1 | Statue | 1 | 2 |
| Apprentice | apprentice | 2 | Beguile; Magic Bolt | 2 | 3 |
| Archmage | archmage | 6 | Death Bolt; Enervate; Fireblast; Float; Mithralskin; Void Step | 6 | 7 |
| Assassin | assassin | 3 | Execute; Climbing; Poisoned dagger † | 3 | 4 |
| Azer | azer | 1 | Fire immunity | 1 | 2 |
| Badger | badger | 2 | Rage; Burrowing | 2 | 3 |
| Bandit | bandit | 1 | Ambush | 1 | 2 |
| Basilisk | basilisk | 1 | Petrify | 1 | 2 |
| Bat Giant | bat_giant | 1 | Flight | 1 | 2 |
| Bat Swarm | bat_swarm | 1 | Flight | 1 | 2 |
| Bear Brown | bear_brown | 2 | Crush; Climbing † | 2 | 3 |
| Beastman | beastman | 1 | Brutal | 1 | 2 |
| Berserker | berserker | 1 | Rage | 1 | 2 |
| Boar | boar | 1 | Gore | 1 | 2 |
| Black Pudding | black_pudding | 3 | Immunity to damage other than fire; Corrosive; Climbing | 3 | 4 |
| Brain Eater | brain_eater | 4 | Hear Thoughts; Latch; Mind Blast; Mind Control | 4 | 5 |
| Bugbear | bugbear | 1 | Stealthy | 1 | 2 |
| Bulette | bulette | 2 | Leap; Burrowing | 2 | 3 |
| Camel | camel | 0 | None | 1 | 2 |
| Cave Brute | cave_brute | 2 | Bewilder; Burrowing | 2 | 3 |
| Cave Creeper | cave_creeper | 2 | Toxin; Climbing | 2 | 3 |
| Centaur | centaur | 0 | None | 1 | 2 |
| Centipede Giant | centipede_giant | 2 | Poison; Climbing | 2 | 3 |
| Centipede Swarm | centipede_swarm | 2 | Poison; Climbing | 2 | 3 |
| Chimera | chimera | 2 | Fire Breath; Flight | 2 | 3 |
| Chuul | chuul | 2 | Grab; Swimming | 2 | 3 |
| Cloaker | cloaker | 3 | Phantoms; Screech; Flight | 3 | 4 |
| Cockatrice | cockatrice | 2 | Petrify; Flight | 2 | 3 |
| Couatl | couatl | 4 | Change Shape; Poison; Restore; Flight | 4 | 5 |
| Crab Giant | crab_giant | 2 | Crush; Swimming | 2 | 3 |
| Crocodile | crocodile | 1 | Swimming | 1 | 2 |
| Cultist | cultist | 2 | Morale immunity; Deathtouch | 2 | 3 |
| Cyclops | cyclops | 0 | None | 1 | 2 |
| Darkmantle | darkmantle | 2 | Darkness; Flight | 2 | 3 |
| Deep One | deep_one | 1 | Swimming | 1 | 2 |
| Demon Balor | demon_balor | 6 | Ordinary-damage immunity; Fire immunity; Grab; Fling grabbed target; Hellfire; Flight | 6 | 7 |
| Demon Glabrezu | demon_glabrezu | 1 | Crush | 1 | 2 |
| Demon Dretch | demon_dretch | 1 | Gas | 1 | 2 |
| Demon Marilith | demon_marilith | 2 | Parry; Climbing | 2 | 3 |
| Demon Vrock | demon_vrock | 3 | Carrion Mist; Screech; Flight | 3 | 4 |
| Archdevil | archdevil | 5 | Ordinary-damage immunity; Fire immunity; Crown of Darkness; Soulbind; Teleport movement | 5 | 6 |
| Devil Barbed | devil_barbed | 2 | Barb; Fire blast | 2 | 3 |
| Devil Cubi | devil_cubi | 4 | Change Shape; Charm; Drain; Flight | 4 | 5 |
| Devil Erinyes | devil_erinyes | 2 | Poison; Flight | 2 | 3 |
| Devil Horned | devil_horned | 3 | Nonmagical-weapon resistance; Flight; Fire blast | 3 | 4 |
| Devil Imp | devil_imp | 4 | Fire immunity; Contract; Poison; Flight | 4 | 5 |
| Pterodactyl | pterodactyl | 2 | Grab; Flight | 2 | 3 |
| Tyrannosaurus | tyrannosaurus | 0 | None | 1 | 2 |
| Triceratops | triceratops | 1 | Charge | 1 | 2 |
| Brachiosaurus | brachiosaurus | 0 | None | 1 | 2 |
| Plesiosaurus | plesiosaurus | 1 | Swimming | 1 | 2 |
| Velociraptor | velociraptor | 1 | Clever | 1 | 2 |
| Djinni | djinni | 4 | Ordinary-damage immunity; Whirlwind; Wish; Flight | 4 | 5 |
| Doppelganger | doppelganger | 2 | Change Shape; Telepathy | 2 | 3 |
| Dragon Desert | dragon_desert | 4 | Lightning immunity; Lightning Breath; Mirage; Flight | 4 | 5 |
| Dragon Fire | dragon_fire | 3 | Fire immunity; Fire Breath; Flight | 3 | 4 |
| Dragon Forest | dragon_forest | 3 | Animate Plants; Poison Breath; Flight | 3 | 4 |
| Dragon Frost | dragon_frost | 3 | Cold immunity; Ice Breath; Flight | 3 | 4 |
| Dragon Sea | dragon_sea | 4 | Steam Breath; Water Spout; Flight; Swimming | 4 | 5 |
| Dragon Swamp | dragon_swamp | 3 | Smog Breath; Burrowing; Swimming | 3 | 4 |
| Drow | drow | 1 | Poison | 1 | 2 |
| Drow Priestess | drow_priestess | 4 | Poison; Snuff; Summon Spiders; Web | 4 | 5 |
| Drow Drider | drow_drider | 2 | Poison; Climbing | 2 | 3 |
| Druid | druid | 5 | Barkskin; Conjure Flames; Imbue; Summon Bear; Thunderclap | 5 | 6 |
| Dryad | dryad | 2 | Charm; Meld | 2 | 3 |
| Duergar | duergar | 2 | Enlarge; Invisibility | 2 | 3 |
| Dung Beetle Giant | dung_beetle_giant | 1 | Knock | 1 | 2 |
| Efreeti | efreeti | 6 | Ordinary-damage immunity; Fire immunity; Wall of Flame; Wish; Flight; Fire bolt | 6 | 7 |
| Elemental Air | elemental_air | 3 | Ordinary-damage immunity; Whirlwind; Flight | 3 | 4 |
| Elemental Earth | elemental_earth | 3 | Ordinary-damage immunity; Avalanche; Burrowing | 3 | 4 |
| Elemental Fire | elemental_fire | 4 | Ordinary-damage immunity; Fire immunity; Inferno; Flight | 4 | 5 |
| Elemental Water | elemental_water | 3 | Ordinary-damage immunity; Whirlpool; Swimming | 3 | 4 |
| Elephant | elephant | 1 | Charge | 1 | 2 |
| Elf | elf | 1 | Feyblood | 1 | 2 |
| Ettercap | ettercap | 2 | Poison Web; Climbing | 2 | 3 |
| Fairy | fairy | 2 | Poison; Flight | 2 | 3 |
| Frog Giant | frog_giant | 2 | Tongue; Swimming | 2 | 3 |
| Gargoyle | gargoyle | 2 | Ordinary-damage immunity; Flight | 2 | 3 |
| Gelatinous Cube | gelatinous_cube | 3 | Engulf; Piercing resistance; Toxin | 3 | 4 |
| Ghast | ghast | 3 | Morale immunity; Carrion Stench; Paralyze | 3 | 4 |
| Ghoul | ghoul | 2 | Morale immunity; Paralyze | 2 | 3 |
| Ghost | ghost | 6 | Morale immunity; Ordinary-damage immunity (silver or magic bypasses); Incorporeal; Life Drain; Possess; Flight | 6 | 7 |
| Giant Cloud | giant_cloud | 1 | Alert | 1 | 2 |
| Giant Fire | giant_fire | 1 | Fire immunity | 1 | 2 |
| Giant Frost | giant_frost | 1 | Cold immunity | 1 | 2 |
| Giant Stone | giant_stone | 2 | Piercing resistance; Slashing resistance | 2 | 3 |
| Giant Goat | giant_goat | 1 | Climbing | 1 | 2 |
| Giant Storm | giant_storm | 3 | Lightning immunity; Lightning Bolt; Swimming | 3 | 4 |
| Giant Hill | giant_hill | 0 | None | 1 | 2 |
| Gibbering Mouther | gibbering_mouther | 4 | Gibbering; Latch; Climbing; Swimming | 4 | 5 |
| Gladiator | gladiator | 0 | None | 1 | 2 |
| Gnoll | gnoll | 1 | Rage | 1 | 2 |
| Gnome Deep | gnome_deep | 1 | Stone Meld | 1 | 2 |
| Goblin | goblin | 1 | Keen Senses | 1 | 2 |
| Goblin Boss | goblin_boss | 1 | Keen Senses | 1 | 2 |
| Goblin Shaman | goblin_shaman | 4 | Keen Senses; Bug Brain; Skitter; Stink Bomb | 4 | 5 |
| Golem Clay | golem_clay | 6 | Fire immunity; Cold immunity; Lightning immunity; Ordinary-damage immunity; Healing from acid; Curse | 6 | 7 |
| Golem Flesh | golem_flesh | 5 | Fire immunity; Cold immunity; Ordinary-damage immunity; Healing from electricity; Berserk | 5 | 6 |
| Golem Iron | golem_iron | 4 | Cold immunity; Ordinary-damage immunity; Healing from fire; Poison Breath | 4 | 5 |
| Golem Stone | golem_stone | 5 | Fire immunity; Cold immunity; Lightning immunity; Ordinary-damage immunity; Slow | 5 | 6 |
| Gorgon | gorgon | 3 | Charge; Petrifying Breath; Petrification immunity | 3 | 4 |
| Gorilla | gorilla | 1 | Climbing | 1 | 2 |
| Gray Ooze | gray_ooze | 5 | Fire immunity; Cold immunity; Acid immunity; Corrosive; Climbing | 5 | 6 |
| Grick | grick | 3 | Camouflage; Grab; Climbing | 3 | 4 |
| Griffon | griffon | 1 | Flight | 1 | 2 |
| Grimlow | grimlow | 1 | Grab | 1 | 2 |
| Guard | guard | 0 | None | 1 | 2 |
| Hag Weald | hag_weald | 2 | Drink Pain; Shapechange | 2 | 3 |
| Hag Night | hag_night | 2 | Blind; Shapechange | 2 | 3 |
| Hag Sea | hag_sea | 3 | Shapechange; Terrify; Swimming | 3 | 4 |
| Harpy | harpy | 2 | Song; Flight | 2 | 3 |
| Hell Hound | hell_hound | 2 | Fire immunity; Fire Breath | 2 | 3 |
| Hippogriff | hippogriff | 1 | Flight | 1 | 2 |
| Hippopotamus | hippopotamus | 2 | Stumpy; Swimming | 2 | 3 |
| Hobgoblin | hobgoblin | 1 | Phalanx | 1 | 2 |
| Horse | horse | 0 | None | 1 | 2 |
| Invisible Stalker | invisible_stalker | 3 | Invisible; Tracking; Flight | 3 | 4 |
| Jellyfish | jellyfish | 2 | Toxin; Swimming | 2 | 3 |
| Knight | knight | 1 | Oath | 1 | 2 |
| Kobold | kobold | 1 | Dodge | 1 | 2 |
| Kobold Sorcerer | kobold_sorcerer | 3 | Dodge; Scorpion Sting; Spider Swarm | 3 | 4 |
| Kraken | kraken | 5 | Lightning immunity; Crush; Lightning Bolt; Storm; Swimming | 5 | 6 |
| Leech Giant | leech_giant | 2 | Attach; Swimming | 2 | 3 |
| Leprechaun | leprechaun | 5 | Alert; Slippery; Fool's Gold; Illusion; Invisibility | 5 | 6 |
| Lich | lich | 9 | Morale immunity; Ordinary-damage immunity; Phylactery; Paralysis; Flight; Null; Shadow Leap; Sigil of Doom; Wither | 9 | 10 |
| Lion | lion | 0 | None | 1 | 2 |
| Lizardfolk | lizardfolk | 1 | Swimming | 1 | 2 |
| Mage | mage | 5 | Arcane Armor; Blast; Cancel; Levitate; Snare | 5 | 6 |
| Mammoth | mammoth | 2 | Cold immunity; Charge | 2 | 3 |
| Manta Ray Giant | manta_ray_giant | 2 | Poison; Swimming | 2 | 3 |
| Manticore | manticore | 2 | Spikes; Flight | 2 | 3 |
| Mastiff | mastiff | 0 | None | 1 | 2 |
| Medusa | medusa | 3 | Godborn; Petrify; Poison | 3 | 4 |
| Merfolk | merfolk | 1 | Swimming | 1 | 2 |
| Mimic | mimic | 1 | Stick | 1 | 2 |
| Minotaur | minotaur | 1 | Charge | 1 | 2 |
| Moose | moose | 0 | None | 1 | 2 |
| Mordanticus the Flayed | mordanticus_the_flayed | 12 | Morale immunity; Ordinary-damage immunity; Spell resistance; Crown of Gehemna; Necrosis; Phylactery; Absorb; Banish; Bind; Blast; Phase; True Name | 12 | 13 |
| Mummy | mummy | 3 | Morale immunity; Ordinary-damage immunity; Necrosis | 3 | 4 |
| Mushroomfolk | mushroomfolk | 1 | Telepathic | 1 | 2 |
| Naga | naga | 5 | Poison; Agony; Hypnotize; Whispers; Climbing | 5 | 6 |
| Naga Bone | naga_bone | 4 | Morale immunity; Ordinary-damage immunity (silver or magic bypasses); Burrowing; Climbing | 4 | 5 |
| Nightmare | nightmare | 2 | Fire immunity; Flight | 2 | 3 |
| Obe-Ixx of Azarumme | obe_ixx_of_azarumme | 11 | Morale immunity; Ordinary-damage immunity; Spell resistance; Blood Drain; Charm; Dire Shapechange; Moonbite: enchanted returning weapon; Moonbite: healing interference; Survival until staked at 0 HP; Climbing; Flight | 11 | 12 |
| Ochre Jelly | ochre_jelly | 2 | Split; Climbing | 2 | 3 |
| Octopus Giant | octopus_giant | 3 | Grab; Ink; Swimming | 3 | 4 |
| Ogre | ogre | 0 | None | 1 | 2 |
| Oni | oni | 4 | Shapeshift; Fade; Hellfrost; Mist | 4 | 5 |
| Orc | orc | 1 | Rage | 1 | 2 |
| Orc Chieftain | orc_chieftain | 1 | Rage | 1 | 2 |
| Otyugh | otyugh | 1 | Disease | 1 | 2 |
| Primordial Slime | primordial_slime | 3 | Immunity to damage other than fire; Dissolve; Climbing | 3 | 4 |
| Void Spawn | void_spawn | 3 | Cold immunity; Toxin; Flight | 3 | 4 |
| Void Spider | void_spider | 4 | Cold immunity; Phase; Poison; Climbing | 4 | 5 |
| Rime Walker | rime_walker | 3 | Cold immunity; Ice Aura; Flight | 3 | 4 |
| Owlbear | owlbear | 2 | Crush; Climbing | 2 | 3 |
| Panther | panther | 1 | Climbing | 1 | 2 |
| Peasant | peasant | 0 | None | 1 | 2 |
| Pegasus | pegasus | 1 | Flight | 1 | 2 |
| Phoenix | phoenix | 6 | Ordinary-damage immunity; Fire immunity; Explosion; Heat Aura; Rebirth; Flight | 6 | 7 |
| Piranha Swarm | piranha_swarm | 2 | Savage; Swimming | 2 | 3 |
| Pirate | pirate | 0 | None | 1 | 2 |
| Priest | priest | 4 | Anoint; Healing Touch; Holy Flame; Rebuke | 4 | 5 |
| Purple Worm | purple_worm | 3 | Poison; Swallow; Burrowing | 3 | 4 |
| Rakshasa | rakshasa | 4 | Ordinary-damage immunity; Low-tier spell immunity; Thought reading; Illusory humanoid appearance | 4 | 5 |
| Rat | rat | 1 | Disease | 1 | 2 |
| Rat Giant | rat_giant | 1 | Disease | 1 | 2 |
| Rat Dire | rat_dire | 1 | Disease | 1 | 2 |
| Rat Swarm | rat_swarm | 1 | Disease | 1 | 2 |
| Rathgamnon | rathgamnon | 10 | Ordinary-damage immunity; Spell resistance; Roar; Abjure; Abolish; Anchor; Gate; Portent; Time Stop; Flight | 10 | 11 |
| Reaver | reaver | 1 | Bloodlust | 1 | 2 |
| Remorhaz | remorhaz | 5 | Fire immunity; Cold immunity; Melt; Swallow; Burrowing | 5 | 6 |
| Rhinoceros | rhinoceros | 1 | Charge | 1 | 2 |
| Roc | roc | 2 | Grab; Flight | 2 | 3 |
| Roper | roper | 5 | Ordinary-damage immunity; Grab; Pull; Tendrils; Climbing | 5 | 6 |
| Rot Flower | rot_flower | 1 | Toxin | 1 | 2 |
| Rust Monster | rust_monster | 2 | Corrosive; Climbing | 2 | 3 |
| Sahuagin | sahuagin | 1 | Swimming | 1 | 2 |
| Salamander | salamander | 2 | Fire immunity; Heat Aura | 2 | 3 |
| Scarab Swarm | scarab_swarm | 1 | Flight | 1 | 2 |
| Scarecrow | scarecrow | 1 | Scream | 1 | 2 |
| Scorpion | scorpion | 2 | Poison; Climbing | 2 | 3 |
| Scorpion Giant | scorpion_giant | 3 | Grab; Poison; Climbing | 3 | 4 |
| Shadow | shadow | 2 | Drain; Flight | 2 | 3 |
| Shambling Mound | shambling_mound | 3 | Fire immunity; Healed by electricity; Engulf | 3 | 4 |
| Shark | shark | 1 | Swimming | 1 | 2 |
| Shark Megalodon | shark_megalodon | 2 | Morale immunity; Swimming | 2 | 3 |
| Siren | siren | 3 | Song; Swimming; Flight | 3 | 4 |
| Skeleton | skeleton | 1 | Morale immunity | 1 | 2 |
| Smilodon | smilodon | 0 | None | 1 | 2 |
| Snake Giant | snake_giant | 2 | Constrict; Climbing | 2 | 3 |
| Snake Cobra | snake_cobra | 1 | Poison | 1 | 2 |
| Snake Swarm | snake_swarm | 1 | Poison | 1 | 2 |
| Soldier | soldier | 0 | None | 1 | 2 |
| Sphinx | sphinx | 7 | Roar; Gate; Omens; Riddle; Time Bend; Unmake; Flight | 7 | 8 |
| Spider | spider | 2 | Poison; Climbing | 2 | 3 |
| Spider Giant | spider_giant | 2 | Poison; Climbing | 2 | 3 |
| Spider Swarm | spider_swarm | 2 | Poison; Climbing | 2 | 3 |
| Stingbat | stingbat | 2 | Blood Drain; Flight | 2 | 3 |
| Strangler | strangler | 3 | Stealthy; Strangle; Climbing | 3 | 4 |
| The Ten-Eyed Oracle | the_ten_eyed_oracle | 13 | Ordinary-damage immunity; Spell resistance; Charm; Hold; Sleep; Polymorph; Cancel; Confusion; Telekinesis; Disintegrate; Petrify; Death; Flight | 13 | 14 |
| The Tarrasque | the_tarrasque | 16 | Ordinary-damage immunity; Spell resistance; Fire immunity; Cold immunity; Amphibious breathing; Permanent Death; Rampage; Energy-ray immunity; Energy reflection; Regeneration; Sever; Swallow; Burrowing; Swimming; Exceptional armour (AC 22); Exceptional endurance (140 HP) | 16 | 17 |
| The Wandering Merchant | the_wandering_merchant | 9 | Ordinary-damage immunity; Spell resistance; Amulet of Rahm-Hotep; Extradimensional storage; Recall bag; Dice of Truth; Lop; Reckoning; Strange Lands | 9 | 10 |
| Thief | thief | 2 | Stealthy; Backstab | 2 | 3 |
| Thug | thug | 0 | None | 1 | 2 |
| Treant | treant | 1 | Animate Tree | 1 | 2 |
| Troll | troll | 1 | Regenerate | 1 | 2 |
| Troll Frost | troll_frost | 3 | Fire immunity; Cold immunity; Regenerate | 3 | 4 |
| Unicorn | unicorn | 1 | Healing Horn | 1 | 2 |
| Vampire | vampire | 7 | Morale immunity; Ordinary-damage immunity; Blood Drain; Charm; Shapechange; Survival until staked at 0 HP; Climbing | 7 | 8 |
| Vampire Spawn | vampire_spawn | 5 | Morale immunity; Ordinary-damage immunity (silver or magic bypasses); Blood Drain; Survival until staked at 0 HP; Climbing | 5 | 6 |
| Violet Fungus | violet_fungus | 0 | None | 1 | 2 |
| Viperian | viperian | 0 | None | 1 | 2 |
| Viperian Ophid | viperian_ophid | 2 | Ordinary-damage immunity; Climbing | 2 | 3 |
| Viperian Wizard | viperian_wizard | 4 | Hiss; Summon Cobra; Venom; Whispers | 4 | 5 |
| Vulture | vulture | 2 | Carrion Tracker; Flight | 2 | 3 |
| Wasp Giant | wasp_giant | 2 | Venom; Flight | 2 | 3 |
| Werewolf | werewolf | 2 | Ordinary-damage immunity (silver or magic bypasses); Lycanthropy | 2 | 3 |
| Wererat | wererat | 3 | Ordinary-damage immunity (silver or magic bypasses); Lycanthropy; Climbing | 3 | 4 |
| Wight | wight | 3 | Morale immunity; Ordinary-damage immunity (silver or magic bypasses); Life Drain | 3 | 4 |
| Will-o'-the-Wisp | will_o_the_wisp | 2 | Life Drain; Flight | 2 | 3 |
| Wolf | wolf | 1 | Pack Hunter | 1 | 2 |
| Wolf Dire | wolf_dire | 1 | Pack Hunter | 1 | 2 |
| Wolf Winter | wolf_winter | 2 | Cold immunity; Frost Breath | 2 | 3 |
| Worg | worg | 0 | None | 1 | 2 |
| Wraith | wraith | 5 | Morale immunity; Ordinary-damage immunity (silver or magic bypasses); Incorporeal; Life Drain; Flight | 5 | 6 |
| Wyvern | wyvern | 2 | Poison; Flight | 2 | 3 |
| Zombie | zombie | 2 | Morale immunity; Relentless | 2 | 3 |
| Bittermold | bittermold | 1 | Piercing resistance | 1 | 2 |
| Bogthorn | bogthorn | 2 | Poison; Climbing | 2 | 3 |
| Dralech | dralech | 1 | Shatter | 1 | 2 |
| Gordock Breeg | gordock_breeg | 1 | Algae-Eater | 1 | 2 |
| Hexling | hexling | 1 | Energy Drain | 1 | 2 |
| Howler | howler | 1 | Mob | 1 | 2 |
| Ichor Ooze | ichor_ooze | 3 | Piercing resistance; Corrosive; Climbing | 3 | 4 |
| Marrow Fiend | marrow_fiend | 2 | Devour; Climbing | 2 | 3 |
| Mugdulblub | mugdulblub | 5 | Piercing resistance; Mutagenic aura; Dissolve; Climbing; Swimming † | 5 | 6 |
| Mutant Catfish | mutant_catfish | 2 | Poison; Swimming | 2 | 3 |
| Tar Bat | tar_bat | 3 | Ignition damage bonus; Fire immunity; Flight | 3 | 4 |
| Plogrina B | plogrina_b | 2 | Piercing resistance; Slime Form | 2 | 3 |
| Skrell | skrell | 1 | Clever | 1 | 2 |
| Weeping Father | weeping_father | 4 | Morale immunity; Terrify; Waking Nightmare; Teleport movement | 4 | 5 |
| Dust Devil | dust_devil | 2 | Ordinary-damage immunity; Fling | 2 | 3 |
| Dunefiend | dunefiend | 1 | Howl | 1 | 2 |
| Canyon Ape | canyon_ape | 3 | Ambush; Stalk; Climbing | 3 | 4 |
| Donkey | donkey | 0 | None | 1 | 2 |
| Camel Silver | camel_silver | 0 | None | 1 | 2 |
| Horse War | horse_war | 0 | None | 1 | 2 |
| Ras-Godai | ras_godai | 2 | Assassinate; Teleport movement | 2 | 3 |
| Rookie | rookie | 0 | None | 1 | 2 |
| Mirage | mirage | 2 | Delude; Leech | 2 | 3 |
| Hero | hero | 0 | None | 1 | 2 |
| Scrag War | scrag_war | 1 | Climbing | 1 | 2 |
| Siruul | siruul | 2 | Desert Born; Mount † | 2 | 3 |
| Scrag | scrag | 1 | Climbing | 1 | 2 |
| The Scourge | the_scourge | 4 | Lightning immunity; Lightning Breath; Mirage; Flight | 4 | 5 |
| Drake Greater | drake_greater | 3 | Fire immunity; Fire Gout; Flight | 3 | 4 |
| Drake Lesser | drake_lesser | 3 | Fire immunity; Fire Spit; Flight | 3 | 4 |
| Draugr | draugr | 4 | Morale immunity; Ordinary-damage immunity (silver or magic bypasses); Death Chill; Stone Swim | 4 | 5 |
| Dverg | dverg | 1 | Shapeshift | 1 | 2 |
| Nord | nord | 1 | Shield Wall | 1 | 2 |
| Troll Deep | troll_deep | 1 | Regenerate | 1 | 2 |
| Sea Serpent | sea_serpent | 1 | Swimming | 1 | 2 |
| Sea Nymph | sea_nymph | 2 | Sing; Swimming | 2 | 3 |
| Orca | orca | 2 | Pod Hunter; Swimming | 2 | 3 |
| Oracle | oracle | 4 | Berserk; Fate; Mjolnir; Strike Blind | 4 | 5 |
| Werebear | werebear | 3 | Ordinary-damage immunity (silver or magic bypasses); Crush; Lycanthropy | 3 | 4 |
| Valkyrie | valkyrie | 4 | Ordinary-damage immunity; Morale immunity; Spell resistance; Flight | 4 | 5 |
| Anaconda Giant | anaconda_giant | 3 | Swallow; Climbing; Swimming | 3 | 4 |
| Ant Giant | ant_giant | 3 | Grab; Mighty; Climbing | 3 | 4 |
| Stone Warrior | stone_warrior | 1–2 by form/condition | Camouflage; see conditional counts below † | 1–2 by form/condition | 2–3 |
| Stone Shaman | stone_shaman | 2 | Daze; Death Touch | 2 | 3 |
| Blue Dart Frog | blue_dart_frog | 2 | Toxin; Climbing | 2 | 3 |
| Basilisk Hatchling | basilisk_hatchling | 1 | Petrify | 1 | 2 |
| Catfish Giant | catfish_giant | 2 | Swallow; Swimming | 2 | 3 |
| Cobra Statue | cobra_statue | 3 | Ordinary-damage immunity; Hypnotize; Poison | 3 | 4 |
| Jaguar King | jaguar_king | 2 | Pounce; Climbing | 2 | 3 |
| Death Slug | death_slug | 2 | Burrow; Climbing | 2 | 3 |
| Condor Dire | condor_dire | 2 | Grab; Flight | 2 | 3 |
| Javelina | javelina | 1 | Rage | 1 | 2 |
| Javelina Diseased | javelina_diseased | 2 | Morale immunity; Rage | 2 | 3 |
| Kawitzek | kawitzek | 1 | Whirlpool | 1 | 2 |
| Skandrill | skandrill | 2 | Fire immunity; Greedy | 2 | 3 |
| Skandrill Rex | skandrill_rex | 3 | Fire immunity; Greedy; Scream | 3 | 4 |
| Void Bat | void_bat | 4 | Cold immunity; Absorb Ambient Light; Healing from ambient-light absorption; Flight | 4 | 5 |
| Void Being | void_being | 4 | Morale immunity; Ordinary-damage immunity (silver or magic bypasses); Brain Meld; Climbing | 4 | 5 |
| Librarian of Leng | librarian_of_leng | 7 | Ordinary-damage immunity (silver or magic bypasses); Absorb; Eye of the Master: Confuse; Eye of the Master: Disintegrate; Eye of the Master: Telekinesis; Invoke Fear; Mind Pierce | 7 | 8 |
| Bezelak | bezelak | 2 | Fire Belch; Climbing | 2 | 3 |
| Dremir | dremir | 2 | Impale; Slow | 2 | 3 |
| Nuln | nuln | 2 | Rage; Contagious Madness | 2 | 3 |
| Morzo Moth | morzo_moth | 3 | Grab; Wing Dust; Flight | 3 | 4 |
| Wendel | wendel | 1–3 by form/condition | Climbing; see conditional counts below † | 1–3 by form/condition | 2–4 |

## Conditional forms and companions

### Stone Warrior

| Form or condition | Additional abilities | Total abilities | Vulnerabilities required |
|---|---|---:|---:|
| No hatchling (5:6) | None beyond shared abilities | 1 | 2 |
| Loyal hatchling present (1:6) | Basilisk companion | 2 | 3 |

### Wendel

| Form or condition | Additional abilities | Total abilities | Vulnerabilities required |
|---|---|---:|---:|
| Pearly | None beyond shared abilities | 1 | 2 |
| Ocher | Contact toxin | 2 | 3 |
| Silky | Cushioning hair (AC 12 override) | 2 | 3 |
| Puce | Acid spit | 2 | 3 |
| Red | Morale immunity | 2 | 3 |
| Woolly | Cold immunity | 2 | 3 |
| Sea | Swimming; Amphibious breathing | 3 | 4 |
| Spiny | Spiked slam (damage override) | 2 | 3 |


## Draft abilities for monsters with none

These are original ASH adaptations of 4e tactical design: positioning, attack replacement, limited reactions, and coordinated actions. They are not transcriptions of official 4e stat blocks. Mobile-strike and allied-follow-up patterns draw on the gnoll examples supplied in the design discussion; other cards use those tactical principles. Use close/near/far, explicit turn timing, and the source attack/damage values. No new opportunity-attack system is assumed.

**Shared conventions:** bloodied means at or below half maximum HP. A close shift is up to 5 feet on traversable ground. Forced movement stops at obstacles and lethal drops unless a particular card explicitly gives another rule. A creature has at most one triggered effect per round, and triggered effects cannot cause another triggered effect. These are draft table procedures, not implemented UI controls.

### Camel

**Blinding Spit** — replaces the attack action; once per fight.

**Trigger:** An enemy approaches its head **Range:** near

Make the existing spit attack (+0, 1d4 damage). On a hit, the target has disadvantage on attacks and sight-based checks until the end of the camel's next turn. This replaces the whole attack routine; no hoof attack is also made.

**Telegraph:** It pulls back its lips and works its jaw while staring at the target.

**Behaviour:** Use against the nearest approaching enemy within near; choose randomly on ties.

**Inspiration:** 4e-style ranged control: attach a brief tactical rider to an existing attack. Original ASH adaptation.

Existing abilities: 0 → planned abilities: 1 → required vulnerabilities: 2.

### Centaur

**Running Spear** — combines normal movement and the normal spear attack action; at will.

**Trigger:** A straight traversable route passes close to an enemy **Range:** normal movement; attacks remain close

Split its normal movement before and after its usual spear attacks. It can attack at any point along that movement, then finish the remaining distance. It gains no additional movement, attacks, or damage, and cannot also use its longbow.

**Telegraph:** It lowers its spear and angles toward a route past the target.

**Behaviour:** Use when it can finish the move beyond close of its target without approaching another enemy; choose the nearest reachable isolated target, then randomly.

**Inspiration:** The 4e Mobile Melee Attack example supplied in the discussion: attack partway through movement.

Existing abilities: 0 → planned abilities: 1 → required vulnerabilities: 2.

### Cyclops

**Shattering Boulder** — replaces the attack action; once per fight.

**Trigger:** At least two enemies are close to a visible impact point **Range:** far; close radius at impact

Hurl a rock at the announced ground point. Every creature close to the point makes DC 12 DEX: failure takes 1d12 damage and falls prone; success takes no damage and stays standing. This replaces all greatclub and normal rock attacks. Requires a loose rock it can lift. Standing from prone uses movement; melee attacks against a prone creature have advantage.

**Telegraph:** At the end of its preceding turn it raises a cracked boulder and announces the intended impact point.

**Behaviour:** Use on the visible impact point covering the most enemies and no allies; choose randomly between equally useful points.

**Inspiration:** 4e-style brute area attack with forced positioning and a warning. Original ASH adaptation.

Existing abilities: 0 → planned abilities: 1 → required vulnerabilities: 2.

### Tyrannosaurus

**Pinning Bite** — replaces the attack action; at will; only one held target.

**Trigger:** A creature no larger than a horse is close **Range:** close

Make one existing bite attack (+8, 2d12 damage). A hit also holds the target in its jaws; the target cannot move away until it spends an action and succeeds on DC 15 STR, or the tyrannosaurus releases it. The tyrannosaurus cannot use other bites while holding the target, but can move and carry it. No automatic damage occurs while held. This replaces the normal three bites; dropping to 0 HP releases the target.

**Telegraph:** It opens its jaws over the target rather than snapping and withdrawing.

**Behaviour:** Use against the nearest eligible isolated creature; while holding one, retreat from its companions if a safe route exists.

**Inspiration:** 4e-style grab control: trade multiattack damage for capture and movement. Original ASH adaptation.

Existing abilities: 0 → planned abilities: 1 → required vulnerabilities: 2.

### Brachiosaurus

**Ground Shudder** — replaces the attack action; once per fight.

**Trigger:** At least two enemies are close on the same solid ground **Range:** close

Make one existing stomp attack (+7, 2d10 damage) against a close target. Whether it hits or misses, all other creatures close to it on the same solid ground make DC 12 DEX or fall prone. No additional damage is dealt. Flying creatures are unaffected by the ground shock. This replaces the normal three stomps.

**Telegraph:** It raises a forefoot high and the ground trembles as its weight shifts.

**Behaviour:** Use when two or more enemies crowd its feet and no herd mate is in the area; attack the nearest enemy, then randomly.

**Inspiration:** 4e-style trample/brute control: an attack changes the surrounding formation. Original ASH adaptation.

Existing abilities: 0 → planned abilities: 1 → required vulnerabilities: 2.

### Giant Hill

**Bowling Boulder** — replaces the attack action; at will when a suitable boulder is available.

**Trigger:** A visible enemy is on an unobstructed ground route **Range:** the existing boulder attack's far range

Make one existing boulder attack (+6, 2d10 damage). On a hit, the target makes DC 12 STR or is pushed up to near directly away from the giant, stopping at an obstacle or lethal drop. This replaces all normal attacks, and causes no extra collision damage.

**Telegraph:** It rolls the boulder between its palms and looks down the intended route.

**Behaviour:** Use against the nearest enemy whose displacement would break a defensive line; otherwise use ordinary attacks.

**Inspiration:** 4e-style forced-movement attack. Original ASH adaptation using the source boulder.

Existing abilities: 0 → planned abilities: 1 → required vulnerabilities: 2.

### Gladiator

**Pressing Exchange** — modifies one hit in the normal longsword attack action; once on its turn.

**Trigger:** Its first longsword attack hits a close enemy **Range:** close

Instead of dealing damage with that first hit, force the target to make DC 12 STR. Failure pushes it a close distance; success prevents the push. The gladiator may follow with a close shift and use its remaining normal longsword attack if the target is still reachable. The shift comes from its normal movement allowance. No additional attack is granted.

**Telegraph:** It crowds the target with its shoulder and turns the first blade strike into a shove.

**Behaviour:** Use to move an enemy away from an ally or out of cover; if neither outcome is available, deal normal damage.

**Inspiration:** 4e-style mobile melee and forced movement; original ASH attack substitution.

Existing abilities: 0 → planned abilities: 1 → required vulnerabilities: 2.

### Guard

**Interpose** — triggered defence; spends its next attack action; once per fight.

**Trigger:** A close ally is hit by a melee attack while the guard is standing **Range:** close

The guard immediately shifts to an unoccupied reachable position close to that ally and takes the triggering attack's damage and riders instead. The shift cannot pass through an enemy. It forfeits its next attack action, but may still move on that turn. It must be conscious and able to move; it cannot intercept area damage.

**Telegraph:** It keeps its weapon across the approach to the person it protects.

**Behaviour:** Use for the protected person named before the encounter; if none is named, protect the close ally with the lowest current HP, choosing randomly on ties.

**Inspiration:** 4e-style soldier role: protecting an ally through a limited triggered action. Original ASH adaptation.

Existing abilities: 0 → planned abilities: 1 → required vulnerabilities: 2.

### Horse

**Wheeling Kick** — normal attack action with a movement rider; at will.

**Trigger:** An enemy is close and an escape route is open **Range:** close

Make its existing hooves attack (+3, 1d6 damage). On a hit, push the target a close distance directly away. The horse may then use any unspent normal movement to retreat. The push stops at an obstacle or lethal drop; there is no extra attack or extra movement.

**Telegraph:** It turns its hindquarters toward the threat and gathers its weight over its forelegs.

**Behaviour:** Kick the nearest close threat and retreat along the safest traversable route; choose randomly between equal routes.

**Inspiration:** 4e-style mobile strike: an existing attack creates room to move. Original ASH adaptation.

Existing abilities: 0 → planned abilities: 1 → required vulnerabilities: 2.

### Lion

**Pouncing Rend** — combines normal movement with one replacement attack; at will when starting outside close.

**Trigger:** It can reach a target from outside close during its normal move **Range:** normal movement ending close

Move toward the target and make one existing rend attack (+4, 1d8 damage). On a hit the target makes DC 12 STR or falls prone. This replaces both normal rend attacks, uses the normal movement allowance, and deals no extra damage.

**Telegraph:** It crouches low and fixes its gaze on a single target.

**Behaviour:** Pounce on the nearest reachable isolated creature; if already close, use its ordinary attacks instead.

**Inspiration:** 4e-style pounce: combine movement with a knockdown rather than bonus attacks. Original ASH adaptation.

Existing abilities: 0 → planned abilities: 1 → required vulnerabilities: 2.

### Mastiff

**Hampering Bite** — modifies the existing bite attack; once on its turn.

**Trigger:** Its bite hits a close enemy **Range:** close

After normal bite damage (+1, 1d6), the target makes DC 9 STR. Failure halves its movement until the end of its next turn as the mastiff worries its clothing or leg. This does not immobilize it, grant automatic hits, or deal ongoing damage. Success prevents the movement penalty.

**Telegraph:** It circles low and snaps at legs rather than the torso.

**Behaviour:** Use on the nearest enemy moving toward its handler; if no handler is present, the nearest enemy.

**Inspiration:** 4e-style skirmisher control: a basic attack imposes a short movement penalty. Original ASH adaptation.

Existing abilities: 0 → planned abilities: 1 → required vulnerabilities: 2.

### Moose

**Antler Sweep** — replaces the normal attack action; at will.

**Trigger:** Two enemies are close on its forward side **Range:** close

Make one existing antler attack (+3, 1d6 damage) against each of up to two close creatures on its forward side. On a hit, push that target a close distance sideways to a visible safe position. This uses the source's two-attack allowance; it grants no extra attacks or damage. If both targets cannot be placed safely, only displace those that can.

**Telegraph:** It lowers its antlers sideways and scrapes the ground.

**Behaviour:** Use to open a retreat route through two nearby enemies; otherwise use ordinary antler attacks.

**Inspiration:** 4e-style sweep attack that breaks a front line. Original ASH adaptation.

Existing abilities: 0 → planned abilities: 1 → required vulnerabilities: 2.

### Ogre

**Sweeping Club** — replaces the normal attack action; once per fight.

**Trigger:** At least two enemies are close **Range:** close

Make one existing greatclub attack (+6, 2d6 damage) against each of two different close targets. Each hit also pushes its target a close distance directly away. These are the normal two attacks, restricted to different targets; no third attack or bonus damage is gained. Forced movement stops at obstacles and lethal drops.

**Telegraph:** It draws the club wide for a waist-high sweep.

**Behaviour:** Use when two enemies block its approach; choose the two closest, then randomly on ties.

**Inspiration:** 4e-style brute sweep and push. Original ASH adaptation.

Existing abilities: 0 → planned abilities: 1 → required vulnerabilities: 2.

### Peasant

**Desperate Help** — replaces the attack action; once per fight.

**Trigger:** An ally is within near and threatened **Range:** near; the peasant must be visible and audible to the ally

Instead of attacking, distract an enemy with a shouted warning and feint. One allied creature within near gains advantage on its next attack against that enemy before the end of the peasant's next turn. The enemy must also be within near. Multiple Desperate Help uses cannot stack on the same attack.

**Telegraph:** It grips an improvised weapon and calls out a warning to a companion.

**Behaviour:** Aid the threatened ally with lowest current HP, choosing randomly on ties; target the nearest enemy threatening that ally.

**Inspiration:** 4e-style leader/minion cooperation, paid for with the user's own attack action. Original ASH adaptation.

Existing abilities: 0 → planned abilities: 1 → required vulnerabilities: 2.

### Pirate

**Rolling Cutlass** — combines normal movement and the normal cutlass attack; at will.

**Trigger:** A route across the deck or ground passes close to an enemy **Range:** normal movement; attack close

Move part of its normal allowance, make its existing cutlass attack (+1, 1d6), and finish the remaining movement. It may pass through an unoccupied close gap beside the target but cannot move through occupied spaces. It gains no extra movement or dagger attack.

**Telegraph:** It watches the footing and lowers its body for a rolling advance.

**Behaviour:** Use when the move can finish behind cover or close to an ally; attack the nearest reachable enemy on that route.

**Inspiration:** The supplied 4e Mobile Melee Attack pattern, adapted to a pirate's ordinary attack.

Existing abilities: 0 → planned abilities: 1 → required vulnerabilities: 2.

### Smilodon

**Bloodied Pin** — replaces the normal attack action; once per fight.

**Trigger:** A bloodied enemy is close **Range:** close

Make one existing bite attack (+3, 1d6). On a hit the target makes DC 12 STR or falls prone and cannot stand until the end of the smilodon's next turn. It can act or crawl at half speed. Moving beyond close of the smilodon ends the restriction early. This replaces both normal bites; no bonus damage or follow-up attack occurs.

**Telegraph:** It watches a wounded target's legs and gathers itself to pin them.

**Behaviour:** Use against the close bloodied enemy with lowest current HP, then randomly; otherwise use ordinary bites.

**Inspiration:** 4e-style bloodied trigger coupled to positional control. Original ASH adaptation.

Existing abilities: 0 → planned abilities: 1 → required vulnerabilities: 2.

### Soldier

**Covering Step** — triggered movement; spends its next movement; once per fight.

**Trigger:** A close ally is hit by a melee attack **Range:** close

After the attack resolves, the soldier may shift a close distance into an unoccupied reachable space between attacker and ally. The ally gains +2 AC against that attacker while remaining close to the soldier, until the end of the soldier's next turn. The soldier cannot move on its next turn; it still has its normal attack action. The bonus does not stack with another Covering Step.

**Telegraph:** It maintains a defensive angle beside its companions.

**Behaviour:** Protect the close ally with lowest current HP; choose randomly on ties. Use only if an interposing space is available.

**Inspiration:** 4e-style soldier positioning and limited defensive reaction. Original ASH adaptation.

Existing abilities: 0 → planned abilities: 1 → required vulnerabilities: 2.

### Thug

**Cornering Shove** — replaces damage from one successful shortsword hit; at will when a suitable ally and destination exist.

**Trigger:** A hit target can be moved close to one of the thug's allies **Range:** close

Instead of normal shortsword damage, the target makes DC 12 STR. Failure lets the thug push it a close distance to a visible safe space close to one of its allies; success prevents movement. No ally receives a free attack. The thug can use only its normal one attack.

**Telegraph:** It turns the blade flat and glances toward an accomplice.

**Behaviour:** Use when displacement would put a lone enemy between two thugs; otherwise deal normal damage.

**Inspiration:** 4e-style pack positioning; a setup action rather than an unbounded reaction chain. Original ASH adaptation.

Existing abilities: 0 → planned abilities: 1 → required vulnerabilities: 2.

### Violet Fungus

**Grasping Tendril** — modifies one existing tendril hit; at most one tethered target.

**Trigger:** A tendril attack hits a creature within near **Range:** near

After dealing its existing tendril damage (+0, 1d4), the target makes DC 9 STR or is tethered to the fungus. It cannot move farther from the fungus but can move toward it and act normally. An action and DC 9 STR tears the tendril free; cutting it with a successful damaging attack against AC 9 also releases the target. No automatic damage occurs, and subsequent hits do not create more tethers. A tether ends if the fungus dies.

**Telegraph:** One tendril curls into a loop before striking.

**Behaviour:** Tether the nearest approaching enemy; once holding a target, use ordinary attacks without creating another tether.

**Inspiration:** 4e-style controller: a simple attack creates a persistent positional problem. Original ASH adaptation.

Existing abilities: 0 → planned abilities: 1 → required vulnerabilities: 2.

### Viperian

**Scimitar Feint** — substitutes for the first attack of its normal two-scimitar routine; once on its turn.

**Trigger:** A close enemy is watching its blades **Range:** close

Make the first scimitar attack (+2) as a feint, dealing no damage even on a hit. If it hits, the target has disadvantage on its next attack against the viperian before the end of the viperian's next turn. The viperian may make its second ordinary scimitar attack (+2, 1d6) as normal. An enemy unable to see the feint is unaffected by its rider.

**Telegraph:** It reverses one blade and presents an apparently open guard.

**Behaviour:** Use against a close enemy preparing to attack it; otherwise use both scimitars for normal damage.

**Inspiration:** 4e-style melee control: sacrifice one attack's damage for a defensive tactical effect. Original ASH adaptation.

Existing abilities: 0 → planned abilities: 1 → required vulnerabilities: 2.

### Worg

**Driving Bite** — modifies its existing bite; once on its turn.

**Trigger:** Its bite hits and an allied worg or wolf is nearby **Range:** close

After normal bite damage (+3, 1d6), the target makes DC 12 STR. Failure lets the worg pull it a close distance toward a visible allied wolf or worg within near. The destination must be safe supporting ground, and the pull cannot pass an obstruction. No extra attack or ongoing damage is granted.

**Telegraph:** It circles opposite a companion and snaps sideways at the target.

**Behaviour:** Use when a safe pull would put the target close to an ally; choose the nearest suitable ally, then randomly.

**Inspiration:** 4e-style coordinated pack movement; prepares an ally's normal turn without granting a free strike. Original ASH adaptation.

Existing abilities: 0 → planned abilities: 1 → required vulnerabilities: 2.

### Donkey

**Braced Kick** — replaces movement and modifies the normal attack; at will.

**Trigger:** A close enemy is pressing it **Range:** close

Remain in place for this turn and make its existing hoof attack (+3, 1d4). On a hit the target makes DC 9 STR or is pushed a close distance directly away. The push ends at an obstruction or lethal drop. The donkey gains no extra attack, movement, or damage.

**Telegraph:** It plants its forefeet and pins back its ears.

**Behaviour:** Use on the nearest close threat when guarding a burden or handler; otherwise retreat if possible.

**Inspiration:** 4e-style stance tradeoff: surrender mobility to gain positional control. Original ASH adaptation.

Existing abilities: 0 → planned abilities: 1 → required vulnerabilities: 2.

### Camel Silver

**Blinding Spit** — replaces the attack action; once per fight.

**Trigger:** An enemy approaches its head **Range:** near

Make the existing spit attack (+0, 1d4 damage). On a hit, the target has disadvantage on attacks and sight-based checks until the end of the camel's next turn. This replaces the whole attack routine; no hoof attack is also made.

**Telegraph:** It pulls back its lips and works its jaw while staring at the target.

**Behaviour:** Use against the nearest approaching enemy within near; choose randomly on ties.

**Inspiration:** The same original 4e-style ranged-control adaptation as the core camel, keeping the related creatures consistent.

Existing abilities: 0 → planned abilities: 1 → required vulnerabilities: 2.

### Horse War

**Rider's Opening** — replaces the horse's attack action; once per fight.

**Trigger:** A conscious rider is mounted and a target is close **Range:** close

The horse feints a kick instead of attacking. Its rider gains advantage on their next melee attack against the chosen target before the end of the horse's next turn. This does not grant an immediate attack or additional rider action. The benefit ends if the rider dismounts and does not stack with another advantage-granting support effect.

**Telegraph:** It squares its shoulders beside its rider's weapon arm.

**Behaviour:** Use against the nearest close target the rider can reach; if unmounted, use ordinary hooves attacks.

**Inspiration:** 4e-style allied coordination with an explicit action cost. Original ASH adaptation.

Existing abilities: 0 → planned abilities: 1 → required vulnerabilities: 2.

### Rookie

**Follow the Veteran** — modifies the normal attack action; once per fight.

**Trigger:** An allied creature within near hit the intended target since the rookie's previous turn **Range:** the selected normal weapon's range

The rookie gains advantage on its next normal weapon attack against that target on this turn. It receives no extra attack or damage. Only a hit from an ally's ordinary attack action can qualify; triggered attacks and other Follow the Veteran attacks cannot qualify.

**Telegraph:** It watches a more experienced ally's attack and repeats the opening.

**Behaviour:** Choose the nearest eligible target it can reach with its shortsword or javelin; otherwise attack normally.

**Inspiration:** The supplied 4e Bloodthirst example's allied follow-up idea, adapted to improve a normal turn rather than grant a reaction attack.

Existing abilities: 0 → planned abilities: 1 → required vulnerabilities: 2.

### Hero

**Rallying Stand** — replaces the attack action; once per fight.

**Trigger:** The hero is bloodied and at least one ally is within near **Range:** near; allies must see or hear the hero

Instead of its normal attacks, the hero rallies conscious allies within near. Each gains advantage on its next morale check before the end of the encounter: roll 2d6 twice and use the lower total. Each bonus is consumed by that check and cannot stack with another Rallying Stand. This heals no HP and grants no attacks.

**Telegraph:** Wounded, it plants its weapon and calls its companions by name.

**Behaviour:** Use on its first turn while bloodied if any conscious ally is within near; otherwise attack normally.

**Inspiration:** 4e-style bloodied leader power: a visible change of state creates a limited rally. Original ASH adaptation.

Existing abilities: 0 → planned abilities: 1 → required vulnerabilities: 2.

## Source and review notes

- **Assassin:** Poisoned dagger is named in the attack but has no poison rule in the imported traits. Counted as a poison attack; exact poison resolution needs source clarification.
- **Bear Brown:** Source error: movement contains the next polar-bear stat block; level is also borrowed. Audit uses brown-bear Climbing + Crush only. Polar bear is missing as a separate imported record. Source: Core PDF p.202 / printed p.198.
- **Mugdulblub:** Dissolve was merged into the Mutagenic trait during import; counted as a separate named power.
- **Siruul:** Mounted movement is equipment/position, not an intrinsic special ability; any named companion trait is counted separately.
- **Stone Warrior:** Basilisk companion has a 1:6 chance of being present. Camouflage always counts; the companion adds one only when present. The hatchling itself has its own Petrify ability in its own record, not added to the warrior count.
- **Wendel:** Mutually exclusive Wendel forms checked against Cursed Scroll 5 p.35. Pearly trainability is ordinary domestication, not a special advantage. Counts and vulnerability requirements depend on the selected form.
