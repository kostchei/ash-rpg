# Skeldir / Hrafnfjord: twenty generated adventure elements

For a party of level 10+. Seed: `skeldir-hrafnfjord-2026-10-03`.

This packet uses the actual ASH generators: five act-3 regional site bundles in `midnight_sun`, five classed NPC rolls, five unguarded Core treasure rolls, stock monsters with seeded campaign vulnerability profiles, reaction rolls, and the installed tarot oracle. The contextual tarot deck has named cards such as GEM and BRIDGE; the vulnerability pool separately includes standard tarot themes. They are different tables.

The names, card orientations and facets, objectives, guardian picks, stat blocks, reactions, and treasure outcomes below come from the saved run. Descriptions, relationships, room uses, negotiated solutions, and completed symbolic weaknesses are **authoring from those inputs**, not fields returned by the generator. No results were discarded. Specifying a vampire, Seawolf, demon lord, and giant constrains the encounter choices rather than pretending they were random wandering-table draws.

Skeldir is the user's local name; it was not found in the repository. Hrafnfjord is the implemented zone. For this packet, Skeldir is the coastal community from which these expeditions depart. Summer has perpetual daylight; winter has polar night. Choose the campaign's current season: this changes the vampire's freedom to move outdoors without changing its rules.

Raw records: [draws.json](draws.json). Unedited site briefs: [site-inputs.md](site-inputs.md). Reproduce from the repository root with `npx tsx scripts/generate-hrafnfjord-dossier.ts`.

## Five sites

### 1. Ruins of the Abandoned Hoard

**Draw:** UNDEAD reversed, creature/trap: an undead creature craving an end to its existence. Size d6 **2**; caves, **15 areas in three sections of five**, unsafe. Zone hazard: blizzard whiteout, **DC 12 WIS** to navigate.

**Approach:** A broken sea-giant wall opens into caves above the high scree route. An old coin-counting gong sounds from inside even when the wind drops. Copper rivets, split stones, and white threads identify the three routes.

**Section 1, copper:** Scree entrance, counting chamber, collapsed nursery, ring wall, hoard stair. The generated objective is to defeat a **Viperian Ophid** at the unworked ring wall; its separately generated holder is a **Brown Bear, LV 7**. Preserve both: the ophid commands the threshold and the bear blocks the stair. Prompt: **Conceal the Failure**. Ledger scratches reveal that the wall's keepers failed to protect the first refugees.

**Section 2, split stone:** Meltwater inlet, rope crossing, seal room, submerged chamber, locked door. Defeat a **Giant Manta Ray** at the sealed door of the family holding, held by a **Naga, LV 9**. Prompt: **Uphold the Fear**. The naga insists that fear of the drowned chamber preserves the family's property; draining it or negotiating passage can resolve access without fighting in water.

**Section 3, white thread:** Root tunnel, empty pantry, claw-marked room, abandoned store approach, coffin ledge. Defeat a **Brown Bear** at the overgrown approach; the generated holder is a **Bulette, LV 8** burrowing beneath it. Prompt: **Contain the Path**. Opening the store gives the bulette a route into the settlement unless that tunnel is sealed.

**High-level encounter:** Nevilo Torbin, the vampire in encounter 1, comes here to ask for permanent death while refusing to surrender the hoard. His coffin occupies the final ledge. This layers the requested LV 11 threat onto the original lower-level site guardians; it does not replace their draws.

**Clues and choices:** A small wooden stake has been laid beside an unsigned funeral account. The gong stops when a debt is forgiven. Visitors may bargain, expose the account's injustice, or fight for the passage. The site objective draws require defeating the threshold creatures, not necessarily killing every occupant. Place treasure 2 here; its ownership is contested independently of defeating Nevilo.

### 2. Farmstead of the Barren Beast

**Draw:** COMET reversed, place: a ruin where a terrible past event may have left a haunting. Size d6 **4**; deep tunnels, **13 areas: eight plus five**, unsafe. Whiteout navigation: **DC 12 WIS**.

**Approach:** An empty longhouse stands over an unusually warm cellar. Its roof ridge is split by an old impact scar. The underground byres are intact; every tether is fastened to the wrong side of its post.

**Section 1, copper:** Porch, cellar stair, infirmary, broken flume, smoke room, records niche, standard room, buried store. Recover the generated **flawless diamond, 360 gp**, set in the unworked standard of the abandoned store; a **Mage, LV 6**, holds it. Prompt: **Block the Dark**. The diamond has been used as a mundane light-catching signal, not granted an unrolled magical power.

**Section 2, split stone:** Sunken byre, pearl tally niche, animal gate, watch passage, disputed casket. Recover the generated **silk robe with four pearl buttons, 240 gp**, held by a **Brown Bear, LV 7**. Prompt: **Prevent the Victory**. The robe records a clan's claim to a victory feast; returning it gives that claim public weight, while selling it destroys evidence.

**High-level encounter:** Mat, encounter 3, offers to make the barren holding prosperous. His actual tarot draw makes him an expert who cannot help: his confident agricultural advice would scorch the byres. His friendly reaction is sincere interest, not benevolence.

**Clues and choices:** The household roster ends on the day of the impact. Melted iron lies in the hay, but the pearl buttons remain undamaged. Aresa wants the old infirmary's death-averting image preserved. Treasure 1 hangs beside the surgery slab. Recovering the diamond and robe completes the rolled objectives; accepting Mat's advice is optional.

### 3. Cloister of the Quiet King

**Draw:** TEMPLE upright, person: a devout ritualist invoking divine favour. Size d6 **3**; ruins, **13 areas: eight plus five**, risky. Ice-shelf collapse: **DC 13 DEX**, otherwise a **20-foot fall**.

**Approach:** A silent assembly circle occupies a snow shelf. Small footprints lead to a giant-sized school bell. Marilo, encounter 4, maintains the children's refuge above the cloister and comes down for the rites.

**Section 1, copper:** Bell landing, prayer porch, cradle hall, food store, teaching niche, frost pen, brood shelf, hidden sanctuary. The exact generated objective is an **intact Mammoth clutch**, held by a **Grimlow, LV 9**. Prompt: **Overcome the Strife**. This is an invalid biological result from the current egg filter. **Declared adaptation:** use three living mammoth calves and retain the protection/recovery objective; there are no mammoth eggs. The raw JSON keeps the defect visible.

**Section 2, split stone:** Old pavilion approach, petition stones, bear den, witness bench, overgrown field pavilion. The rolled objective is **assassinate Nattias, Human Sage, Reeve of the old claim**, held by a **Brown Bear, LV 7**. Prompt: **Tell the People**. Present the assassination as a proposed contract: Nattias has suppressed evidence about the children's refuge. Players can expose him or reject the contract. The actual rolled objective remains assassination; a public inquiry is an authored alternate outcome, not automatically the same award.

**Clues and choices:** The prayer roll lists calves beside children. The official copy has those entries scraped out. Marilo wants proof, not another feud, and will protect anyone sheltering a child. Malchor knows who holds the original record. Place treasure 4 in the assembly hall as the rebels' public evidence of older protection.

### 4. Caverns of the Quiet Old Claim

**Draw:** MINE reversed, situation: retrieving something buried. Size d6 **2**; ruins, **15 areas in three sections of five**, risky. Whiteout navigation: **DC 12 WIS**.

**Approach:** A ruined customs bridge straddles a tidal inlet. The old boundary passage follows submerged stonework through the cliff. Arek's Seawolves, encounter 2, coordinate their serpent and toll collectors here.

**Section 1, copper:** Marker shore, customs niche, blind bend, dead-air pocket, salvaged crossing. Clear the boundary route; **foul air kills a flame in one minute**. Holder: **Plesiosaurus, LV 6**. Prompt: **Question the Gear**. A flame is the warning, not a safe oxygen supply; use ventilation, an alternate route, or appropriate expedition equipment.

**Section 2, split stone:** Tide steps, sluice wheel, hag's ledge, drowned tally room, canal reach. Clear **standing water above chest height**; holder **Weald Hag, LV 6**. Prompt: **Assemble the Truth**. Three tally stones show how the old channel was operated. Opening the sluice changes the water level and may release the serpent outside.

**Section 3, white thread:** Flooded fork, fish racks, iron gate, far-side winch, overgrown ford. Open a **gate barred from the far side**; holder **Orca, LV 8**. Prompt: **Waste the Wilderness**. Swimming through the wild channel avoids the gate but crosses the orca's feeding ground.

**Clues and choices:** The customs ledger contains separate crew shares; Arek has withheld them. Paying the crew fairly can fracture his control. Clearing each section opens a distinct crossing. Treasure 5 is a kept promise deposited beyond the final gate; Pike wants access to the hag's botanical specimens, while Annie needs the tide records.

### 5. Prison of the Abandoned Secret

**Draw:** STAFF upright, treasure: a magic staff, jeweled cane, mobility aid, or similar object. Size d6 **2**; ruins, **15 areas in three sections of five**, deadly. Freezing sea spray: **DC 12 CON** or frostbite fatigue.

**Approach:** A prison ward built into the sea cliff has lost its stairs. Bronze walking rails remain where the steps used to be. The cane in the entry chamber is the card's visual motif, not a sixth unrolled magical treasure.

**Section 1, copper:** Broken landing, stair rail, prayer cell, armour rack, overgrown casket. Recover **+3 mithral magic armour, benefit and virtue, 900 gp**, held by a **Priest, LV 5**. Prompt: **Assist the Harm**. The priest argues that returning the armour will help an unjust jailer; its former owner disputes this.

**Completed armour rolls:** Core armour type 2d6 **3+4 = 7**, chainmail; feature d20 **14**, distant ocean sound; benefit d12 **8**, **+4 to death timers**; virtue d20 **4**, senses hidden creatures within near, but not their exact position. It is +3 mithral chainmail, not an unrolled plate suit. Alignment is an authoring choice: neutral. Its telepathic warnings sound like surf; conscious-item resistance uses the Core contested CHA check at **+2**.

**Section 2, split stone:** Records passage, nameless cells, memorial stair, ghost watch, unworked memorial. Lift a curse: **the memorial's name cannot be spoken aloud within sight of it**. Holder **Ghost, LV 6**. Prompt: **Capture the Trial**. Authored solution: take a written copy of the name beyond the sightline, speak it before a witness, then return the authenticated record. This supplies a discoverable completion condition absent from the raw prompt.

**Section 3, white thread:** Drain corridor, serpent nursery, dry vault, silt bank, exit grating. Recover an **intact Giant Snake clutch**, held by a **Mage, LV 6**. Prompt: **Uphold the Pain**. The mage breeds ward-serpents and wants the prison reopened; protecting the eggs while refusing that purpose is possible.

**High-level encounter:** Nibs, encounter 5, surfaces in the flooded approach beneath the high scree pass. The anti-undead artwork on the gate is the connection to its UNDEAD reversed treasure facet. It is scenery, not an additional rolled magic item. Treasure 3 waits in the dry vault beside plans for a failed construct.

## Five encounters for level 10+ adventurers

These are situations to negotiate, avoid, investigate, or fight. The system has not certified them as balanced combats. Each campaign weakness below is shared by that stock species/version within this seeded campaign. Monster ability values in `draws.json` are modifiers, whereas NPC ability values are scores.

### 1. Nevilo Torbin of the Silent Spires — vampire creditor

**Actual draws:** GEM upright, creature/trap, wealth-connected creature/hoard; **High Scree Pass**; reaction **3+1 = 4**, suspicious/threatening.

**Appearance and motive:** Blue plate hangs on a funeral mannequin. Nevilo wears a folded account book inside his coat and speaks as if every kindness earns interest. His wealth is the only reason he has continued his miserable existence. The nearby site's UNDEAD reversed draw provides the wish to die; his own GEM draw supplies the obstacle.

**Stats:** Vampire **LV 11, AC 15, HP 52, morale 12, chaotic**, near/climb. Three bites **+7, 1d8 plus blood drain**, or charm. Only magical sources damage him; immune to morale checks. Blood drain heals **2d6 HP** and permanently removes **1d4 CON**; death at CON 0 creates a vampire or spawn. Charm: visible humanoid within near, **DC 15 CHA**, controlled for **1d4 days**. Can exchange attacks for bat/wolf transformation or return. Daily coffin rest required; missing it loses **2d6 HP/day**, unhealable until coffin rest. Direct sunlight causes **3d8/round**. Permanent death requires a wooden heart-stake at **0 HP**.

**Tactics:** Charm the party's negotiator, split the group across the scree steps, retreat into the cave before sunlight reaches him. He will discuss death only after the hoard's ownership is settled.

**Five rolled weakness themes, completed for this packet:** Each requires an action or a genuine exchange, can trigger once per encounter, and is advertised in his ledger.

- **Nine of Pentacles:** A debtor publicly rejects his patronage and produces evidence of independent livelihood; he cannot charm that debtor for the remainder of this encounter. Clue: the one uncancelled account marked “self-supporting.”
- **King of Cups:** A character calmly offers care after one of his threats; his next charm attempt has disadvantage. Clue: marginal notes saying “pity unsettles me.”
- **Two of Pentacles:** Present two documented debts simultaneously and demand their resolution; he spends his next action choosing which to settle. Clue: two conflicting signed due dates.
- **Five of Cups:** Present his dead household's funeral record; he cannot attack until the end of his next turn, unless attacked first. Clue: their names scratched on the coffin lid.
- **Trust:** He accepts an explicit safe-conduct promise or its token; he cannot initiate harm against its named bearer until they leave the agreed route or breach it. Clue: past tokens preserved beside fulfilled contracts.

**Rolled carried treasure:** **Great Hauberk**, blue plate with crashing-wave motif, **130 gp**, normal/**1 XP**, table **28–29**. No loose coins. It has no rolled magical bonus.

### 2. Arek — Seawolf tollmaster and nine raiders

**Actual draws:** Count **d6 3 + 6 = 9** total Nords; BRIDGE upright, creature/trap, a coordinator of different creatures; **Tidal Inlet**; reaction **4+1 = 5**, suspicious/threatening.

**Appearance and motive:** Arek is one of the nine, wearing a toll ledger on a chain under his shield. He coordinates shore lookouts and a sea serpent through feeding signals. The serpent is a separate danger, not a mount that grants extra attacks. He wants the abandoned customs route recognised as his clan's property.

**Crew stats:** Nine **Nords, each LV 2, AC 15, HP 10, morale 8, neutral**, near; greataxe **+2, 1d8**, or shield wall, making **AC 20 for one round**. Seawolf is their cultural role; no false level-10 class block is assigned.

**Serpent stats:** **LV 12, AC 14, HP 58, morale 12, neutral**, double near/swim; three bites **+8, 2d12**. Its inclusion is the explicitly authored high-level component. This is not a generated taming power.

**Tactics and escape:** Crew hold the bridge while Arek releases bait downstream. The serpent attacks in the inlet. An exposed cut rope, sluice wheel, and dry cliff path let the party disrupt coordination or bypass the toll.

**Completed crew themes:** **Six of Pentacles:** openly pay all nine their documented equal shares; Arek loses the crew's support for this encounter, though individuals may still defend themselves. Ledger clue: unequal shares. **Greed:** display the jade statue and offer it for opening the bridge; if accepted, Arek spends his next action securing it, leaving the coordination signal unattended. Clue: he repeatedly asks about exotic cargo. Each trigger is usable once per encounter.

**Serpent weaknesses:** Rolled **bludgeoning damage is doubled**. **Three of Swords**, completed: show the serpent a harpoon bearing the crew's mark and matching its old wound; it stops obeying Arek's bait signal for the encounter. The damaged scale beside the bridge advertises the link. This grants no magical control to the players.

**Rolled group treasure:** Jade sculpture of a meditating elephant-man, **140 gp**, normal/**1 XP**, table **30–31**. The single treasure roll uses the serpent's LV 12 as an explicit encounter authoring choice; it is not nine separate Nord loot rolls.

### 3. Mat — demon lord of disastrous counsel

**Actual draws:** EXPERT reversed, person, an alleged expert who is not helpful; **Moss Meadow**; reaction **6+4 = 10**, curious/friendly. His three-letter name is a legitimate result of the anchor-name generator.

**Appearance and motive:** Mat poses as a helpful adviser in the warm grass above the ruined farm. Burning wing tips scorch a careful circle around him. He is delighted to hear problems and recommends solutions that will ruin the petitioner's home. “Demon lord” is his authored local office; his actual chassis is **Balor**, not a secretly generated named lord block.

**Stats:** **LV 16, AC 19, HP 77, morale 12, chaotic**, double near/fly. Three greatsword attacks **+10, 2d12 plus hellfire**, **and** one near fire-whip attack **+10, 2d6 plus grab**. Fire immune; only magical sources damage him. Grab: **DC 18 STR** or bound, **2d6 damage/round**, with DC 18 STR on the victim's turn to escape; Mat can replace a whip attack with flinging a held victim double near. Hellfire: **DC 18 DEX** or **2d8/round** until extinguished.

**Tactics:** First offer advice. If opposed, grab the rescuer rather than the armoured challenger, then fly above the meadow. Leaving while he explains a theory is safer than trusting the friendly reaction to mean harmlessness.

**Seven rolled themes, with concrete completions:** Individual symbolic triggers work once per encounter; duration is stated below.

- **Music:** Play the broken household's funeral tune for one action; Mat loses his next whip attack. Clue: he involuntarily coils the whip when the tune is hummed.
- **Ten of Cups:** Reconcile two members of that household in his presence; Mat cannot harm those two for the rest of the encounter unless they attack him. Clue: his advice deliberately keeps them apart.
- **Poison:** The runtime supplies **double poison damage**. His restriction to magical damage still applies; this does not enable mundane poison to bypass it.
- **Eight of Wands:** Deliver a genuine urgent summons from a pact-signatory; he must land and spend his next action reading it. Clue: the seal copied in his correspondence.
- **Ace of Wands:** Publicly begin rebuilding the household he declared irreparable; his next hellfire damage roll has disadvantage. Clue: his boasts depend on the family's permanent failure.
- **Mercy:** Spare a defeated enemy in his view while explicitly asking him to show the same mercy; he cannot make a greatsword attack until the end of his next turn. Clue: the old petition for clemency in the farm's record niche.
- **Wheel of Fortune:** He knowingly accepts a wager on a visible fair die; on losing, he must forgo his next action. On winning, the opponent owes the agreed stake. Clue: his circle is scratched with betting totals.

**Rolled treasure:** **Portable Hole, 720 gp**, fabulous/**3 XP**, table **82–83**. Verified Core function: unfolds on a flat surface into a **six-foot-wide, six-foot-deep hole**, **20 gear slots**; folding closes it. Putting it inside a Bag of Holding or another Portable Hole destroys both items and their contents. It is stored folded; no additional trapped victims were generated.

### 4. Marilo — storm giant schoolkeeper

**Actual draws:** FOOL upright, place, a children's place; **Snow-Dusted Crags**; reaction **4+5 = 9**, cautious/neutral.

**Appearance and motive:** Marilo wears a ring of tiny bells around one finger. He teaches cliff-dwellers' children by arranging giant runestones like letter blocks. He wants the quiet cloister's assembly to recognise the refuge and stop striking children from its roster.

**Stats:** Storm Giant **LV 12, AC 15, HP 58, morale 12, lawful**, double near/swim. Three greatsword attacks **+10, 2d12**, or lightning bolt. Electricity immune. Bolt **3/day**, a **five-foot-wide line extending far**, **DC 15 DEX** or **5d10 damage**; checks have disadvantage in water.

**Tactics and parley:** He puts himself between the party and the children, shouts a warning, and avoids throwing lightning through the refuge. Bring Nattias's unaltered roster to negotiate. His reaction begins neutral, not as an automatic attack.

**Four completed themes:** **Fragile body:** his old left knee is exposed by a split brace; a successful targeted attack against it uses normal AC/damage and prevents swimming or double-near movement until the end of his next turn. **Four of Wands:** accepting a completed welcome feast binds him to peaceful hospitality until the guests depart or attack. **Cowardice:** show the slavers' branded school bell; his next attack has disadvantage as he checks the nursery. **Nine of Pentacles:** prove a named family can independently shelter its child; he relinquishes custody of that child. Clues respectively: the brace, feast rules on a lintel, an identical brand scratched off his bells, and a family petition. Combat triggers are once per encounter.

**Rolled carried treasure:** None. Presence **d6 5**, no real treasure/**0 XP**. The children's supplies are not secretly promoted to a treasure hoard.

### 5. Nibs — sea serpent beneath the dead-slayer gate

**Actual draws:** UNDEAD reversed, treasure, art depicting an undead's destruction or an anti-undead item; **High Scree Pass**; reaction **4+2 = 6**, suspicious/threatening.

**Appearance and motive:** Nibs is the local nickname for a sea serpent whose head emerges beneath the cliff gate. The high pass sits above its flooded channel; it is not swimming through dry scree. A carved scene of an undead being destroyed survives on the gate, explaining the treasure facet without awarding an extra magic weapon.

**Stats:** Sea Serpent **LV 12, AC 14, HP 58, morale 12, neutral**, double near/swim; three bites **+8, 2d12**. No source special powers are added.

**Tactics and choices:** Attack anyone entering the channel, withdraw under the gate after taking bludgeoning wounds, pursue boats rather than climbers. The passing channel can be crossed from the dry ledge after opening the prison's exit grating.

**Weaknesses:** The same species/version draws as Arek's serpent: **double bludgeoning damage**, plus **Three of Swords**. Authored trigger: present the marked harpoon associated with its scar; it spends its next action recoiling from the bearer. Once per encounter. Unlike Arek's serpent, this one has no established bait-handler to abandon. Clue: a matching harpoon head lies in the prison's drain corridor.

**Rolled carried treasure:** None. Presence **d6 6**, **0 XP**. The artwork is a location clue, not a rerolled hoard.

## Five NPCs

Each is an actual classed-NPC result, not a level-10 adventurer. Scores below are in STR/DEX/CON/INT/WIS/CHA order. All used the generator's Iron Man method. Its independent regional colour draw sometimes produces “Seer” for a non-Seer class; retain that as local affiliation or appearance, not an extra spellcasting class. The generator returns no equipment or class-feature loadout, so none is invented as a claimed roll. Rolled hire rate for all five is **2–5 gp/day**; settle the rate in play.

### 1. Aresa — pilgrim who counts the cost of survival

**Rolled:** Human **Monk**, Seer colour; **LV 2, HP 9, morale 9**. Scores **14/9/11/9/10/16**. Mercenary/transactional; counts coins and evaluates gear. Spiritual pilgrimage to lift a curse. Andrik Freeholders. Reaction **4+3 = 7**, cautious/neutral.

**Tarot:** SKULL reversed, treasure: artwork or magic associated with deliverance from death.

**Interpretation:** Aresa carries a charcoal rubbing of the farmstead infirmary's survival image. She itemises rescue costs because her community cannot afford another failed expedition. She needs the name at the prison memorial restored before her pilgrimage can end. She offers the rubbing and exact directions to the surgery room; she demands that its image remain intact. Reveal: the rubbing shows Mat standing outside the farm before the disaster. Her equipment detail is authored, not another treasure roll.

### 2. Malchor — honourable thief with a fatal debt

**Rolled:** Human **Thief**, Seer colour; **LV 3, HP 9, morale 10**. Scores **16/11/13/8/13/11**. Proud/chivalrous; formal salutes, refuses dishonour. Escaping a debt. Seers of the Northern Gods. Reaction **4+1 = 5**, suspicious/threatening.

**Tarot:** SKULL upright, person: someone facing imminent death or wielding necromancy.

**Interpretation:** Malchor stole the original children's roster to prevent its destruction. Nevilo bought his debt and is collecting it before the next council meeting. He salutes even while refusing to hand over the document. Show a credible plan to settle or cancel the account and he gives the roster freely; threats make him seek sanctuary with Marilo. He offers testimony and a route into Nattias's pavilion, not an unrolled assassination service.

### 3. Giralt — tired bearer of the two-day warning

**Rolled:** Human **Ras-Godai**, Seer colour; **LV 2, HP 4, morale 9**. Scores **17/15/10/8/14/10**. Scholarly/analytical; studies artifacts, scales, runes. Carrying a warning: invasion or catastrophe in **two days**. Andrik Freeholders. Reaction **6+4 = 10**, curious/friendly.

**Tarot:** CAMPFIRE upright, situation: rest during a journey.

**Interpretation:** Giralt meets the party at a small rest fire above the customs inlet. His warning is based on Arek's ships provisioning for a raid, and he insists on a short rest before returning with witnesses. He has sketched the serpent's signal routine and the two paths around the bridge. He wants the party to inspect the ledger before blaming every Seawolf clan. If dismissed, he carries the warning onward rather than dying to prove it.

### 4. Pike — suspicious compiler of venom remedies

**Rolled:** Halfling **Barbarian**, **LV 3, HP 11, morale 10**. Scores **6/11/16/16/7/13**. Superstitious; spits over the left shoulder and carries charms and garlic. Needs **two fresh venom glands or rare herbs**. Andrik Freeholders. Reaction **1+5 = 6**, suspicious/threatening.

**Tarot:** BOOK upright, person: writer, poet, or compulsive note-taker.

**Interpretation:** Pike keeps a waterproof notebook of every treatment that has failed. The poor STR result stays poor; class is not rewritten to make the character conventional. Pike wants reagent access at the old boundary caverns and warns that the hag's samples may be adulterated. Offer verified specimens and Pike shares the notebook's funeral-tune notation, a clue to Mat's Music vulnerability. The notebook conveys information; it does not automatically grant a crafting benefit.

### 5. Annie — whispering alchemist with an unstable witness

**Rolled:** Halfling **Alchemist**, Seer colour; **LV 3, HP 7, morale 10**. Scores **6/9/13/10/12/18**. Shifty/whispering; hurried speech and averted eyes. Dire warning, **two days**. Andrik Freeholders. Reaction **6+3 = 9**, cautious/neutral.

**Tarot:** MAZE reversed, creature/trap: a creature with unpredictable behaviour.

**Interpretation:** Annie warns that the ward-construct mentioned in the prison's dry-vault plans will break its restraints during the next tide cycle. It is the construct behind treasure 3's own context draw; no extra stat block is assumed. She brings conflicting sketches of its behaviour because it repeatedly changes routines. She wants tide records from the old customs route and permission to observe from safety. Her 18 CHA helps explain persuasive whispers; no unrolled alchemical weapon is promised.

## Five treasures from the 10+ table

These are **five distinct unguarded finds**, separate from the encounters' carried treasure and site-objective relics. Values and quality classifications are the runtime's results at the stated discovering level. XP is the find's quality value, not an automatic award on seeing the object; discovery/access/security/participation still matter. The runtime's `roll` records the selected entry's lower bound, not necessarily the exact initial d100 face: references below correctly identify ranges.

### 1. Sovereign Mail and Spiked Shield — the surgeon's crimson harness

**Runtime:** Discovering LV **10**, table **14–15**; **crimson chainmail with matching shield, total 70 gp**, normal/**1 XP**. Generated names are **Sovereign Mail** and **Spiked Shield**. Both belong to this single treasure result, not two separately priced 70-gp items.

**Tarot:** LANCE upright, place: somewhere surgery occurs.

**Interpretation:** Found beside the farmstead's stone surgery slab. The crimson dye hides old blood marks; matching enamel shows an incision being closed. Aresa wants them donated to the restored infirmary, while the clan quartermaster wants them sold. They use normal mundane chainmail/shield rules; no enchantment was rolled.

### 2. Gold sarcophagus — the disputed resting place

**Runtime:** Discovering LV **11**, table **58–59**; **gold sarcophagus with inscriptions in a lost language, 250 gp**, fabulous/**3 XP**.

**Tarot:** BALANCE upright, treasure: something valued by two competing factions, or with equal paired powers.

**Interpretation:** The Seawolf Clans claim an ancestor's burial; the Seers claim a sacred funerary text. Both claims refer to the same object and have equal narrative standing. It is cached beyond the hoard cave's threshold. Decide custody, carry the coffin out, or broker a joint shrine. The language's translation is an adventure lead, not a rolled power; the sarcophagus is not declared Nevilo's personal coffin by fiat.

### 3. Rough-Hewn Wand — tiny skulls that silence magic

**Runtime:** Discovering LV **12**, table **78–79**; **magic wand, fifth-tier spell, virtue and flaw, 360 gp**, fabulous/**3 XP**. The actual generated base name is Rough-Hewn Wand.

**Tarot:** CONSTRUCT reversed, situation: an artisan trying to destroy an unrestrained construct. Annie's dry-vault plans give this context a local hook.

**Verified follow-up table rolls:** Feature d8 **8**, made of tiny skulls. Fifth-tier spell d12 **1**, **Antimagic Shell**. Virtue d20 **19**, genuine but obscure prophecies. Flaw d20 **9**, subroll d4 **4**, refuses to harm chaotic creatures. Personality d4/d4 **2/4**, theatrical. This is the Core item-personality table, not guessed bonuses. Neutral alignment is an explicit authoring choice.

**Operation:** Wizards with the spell on their list attempt **DC 15** casting even if they do not know it. Antimagic Shell creates a mobile near-sized cube centred on the caster, maintained with focus: spells cannot be cast inside, spells and magic items have no effect there, and outside magic cannot enter. Dispel Magic cannot end it. Failed wand casting disables the wand until rest; a critical failure permanently breaks it and calls for the caster's applicable mishap roll. The conscious wand may contest use with **CHA +2**, particularly use intended to harm a chaotic creature.

**Voice and complication:** The skulls declaim forecasts as miniature theatre scenes. It predicts a walking prison gate, but cannot explain whether that means the failed construct or the prisoners themselves. Its refusal matters when targeting Mat; disabling a machine need not be equivalent to harming a chaotic creature. This is interpretive adjudication, not a granted exception to the flaw.

### 4. St. Terragnis window — the rebels' borrowed dawn

**Runtime:** Discovering LV **13**, table **18–19**; **stained-glass pane depicting St. Terragnis against a dragon, 110 gp**, normal/**1 XP**.

**Tarot:** THRONE reversed, situation: rebellion against a ruler or authority.

**Interpretation:** The refuge's supporters display it at the cloister assembly as evidence that protection outranks the reeve's decree. Summer light makes the dragon appear to recoil across the hall; this is an optical scene, not a magic attack or sunlight-conjuring item. Keep the depicted saint from the actual treasure row rather than replacing it with an invented northern god. The pane can be sold, displayed, or broken, with obvious consequences for that evidence.

### 5. Scale Mail — elvish chainmail held by a promise

**Runtime:** Discovering LV **14**, table **54–55**; **mithral elvish chainmail, 240 gp**, normal/**1 XP**. The name pool returned **Scale Mail (chainmail)**; use the row's actual chainmail type, despite the confusing generated label.

**Tarot:** RING upright, person: someone scrupulously faithful to a promise.

**Interpretation:** A gate-keeper deposited it beyond the final boundary ford, promising that it would be returned to the first survivor who brought back the children's names. Malchor can prove that promise through the roster. The wearer inherits a social obligation only if they agree; there is no invented compulsion, magical AC bonus, or extra enchantment.

## Running the links

Giralt's rest-fire warning brings the party to Arek's inlet. The withheld crew shares lead to Nevilo's debt records. Malchor's original roster connects those debts to the refuge and Marilo. The farmstead explains Mat's interest in a ruined household. Annie's construct warning points to the prison and the Antimagic Shell wand. The two generated two-day warnings run concurrently; they are not automatically an additional four-day countdown.

Award nothing merely for reading this packet. The five treasure-find XP values total **9**, and present carried treasure values total **5**; these are source values for later earned awards, not a promise of party advancement. Site-objective rewards are separate and must not duplicate the same objects. Lower-level guardians remain as generated, and “unsafe/risky/deadly” are the site's rolled labels, not a recalculation of the added vampire or Balor encounter.

The run surfaced three current generator limitations: biologically invalid mammoth eggs; nonmatching class/region-colour combinations; and incomplete magic-item/weakness placeholders. The explicit adaptations and verified follow-up rolls above make this packet usable without claiming those additions already exist in the runtime.
