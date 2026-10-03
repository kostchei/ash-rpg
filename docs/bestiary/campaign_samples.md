# Campaign samples: monsters and treasure

**Hand-authored examples, not generator output.** Actual reproducible runtime samples are in [the generated report](../../outputs/bestiary/runtime-samples/samples.md), created by `npx tsx scripts/bestiary/generate-runtime-samples.ts`.

Original ASH authoring drafts using the imported Shadowdark stat blocks. These are four particular campaign versions, with themed selections from the vulnerability pool, rather than universal weaknesses for their species. New powers, weaknesses, lore, prices, and treasure effects are proposals for table use; they have not been playtested or installed in runtime combat.

Each version has **one vulnerability plus one per special ability**. Stock weaknesses reduce the number of new weaknesses required. Regeneration counters remain separate. A new tactical power added here increases the count beyond the catalogue's baseline allowance.

| Campaign monster | Stock abilities | Added abilities | Stock vulnerabilities | New vulnerabilities | Total vulnerabilities |
|---|---:|---:|---:|---:|---:|
| Sir Harl, the Last Gatekeeper — Guard | 0 | 1 | 0 | 2 | 2 |
| Mother Brine — Troll | 1 | 1 | 0 | 3 | 3 |
| The Unburied Treasurer — Mummy | 3 | 1 | 1 | 4 | 5 |
| The Thimble Prince — Fairy | 2 | 1 | 0 | 4 | 4 |

**Shared wording:** close/near/far use the game's distances. Bloodied means at or below half maximum HP. A shift uses reachable terrain and grants no attack. Forced movement stops at an obstruction or lethal drop. A vulnerability action replaces the character's attack action unless stated otherwise. Repeated exposures to the same weakness do not stack.

## Sir Harl, the Last Gatekeeper

A dead king's last living guard. Every morning he polishes the gate of a palace that burned down thirty years ago. His oath binds him more tightly than any chain.

**Guard chassis:** LV 1; AC 15; HP 4; morale 7; move near. STR +1, DEX +0, CON +0, INT +0, WIS +1, CHA +0. One spear +1 (1d6; close/near) or longsword +1 (1d8). Alignment L.

**Special ability — Interpose (once per fight).** When his designated ward, within close, is hit by a melee attack, Harl shifts to an unoccupied reachable position close to the ward and takes the damage and riders instead. He cannot pass through an enemy or intercept an area attack. He forfeits his next attack action. Before combat, he names his ward and holds his sword across their approach. He uses Interpose on the first qualifying hit.

**Vulnerabilities — two new:**

- **Courage (Pendragon).** A bloodied opponent within close can spend an action issuing a single-combat challenge. Harl's oath compels him to accept: until the challenger attacks someone else or leaves near range, Harl can attack only that challenger and cannot use Interpose. The challenge fails if the opponent is not bloodied. Clue: the gate inscription reads, “Let no wounded challenger stand unanswered.”
- **Justice (tarot).** Within near, spend an action displaying the original royal dismissal writ and reading its sentence aloud. Harl's oath releases him: he cannot take hostile actions for the rest of the encounter. He may leave, speak, or defend himself; damage dealt to him ends the effect. A copy does not work. Clue: he repeatedly asks whether anyone has brought his discharge. The original is held by the village clerk, who will lend it to someone protecting the village.

**Common:** The gatekeeper asks every traveller whom they serve. He draws steel only when someone tries to pass without answering.

**Uncommon:** He once took a spear meant for the king's cook. Even now, he announces the person under his protection before trouble begins.

**Rare:** His oath forces him to accept a wounded opponent's challenge. The authentic dismissal writ suspends his hostility while nobody harms him.

**Obscure:** The king signed his discharge before the fire. A minister concealed it because Harl had witnessed the minister stealing the treasury keys. The clerk's archive contains both documents.

**Legend:** When the king asked him to defend an empty palace, Harl answered, “Then I shall guard its absence.” The oath heard him literally.

**Hooks:** The village needs passage through the old gate to reach its only clean well; the clerk wants the missing treasury ledger in exchange for lending the writ. Harl has named a frightened child as his ward after seeing the royal birthmark on her wrist; her family wants the party to explain why assassins have arrived.

**Treasure:** Harl carries 12 gp in obsolete silver coin and the Gatekeeper's Badge below. He gives up the badge voluntarily if discharged and offered a safe place to live.

## Mother Brine

A troll under the salt-road bridge, wearing a child's tablecloth as a bonnet. She calls every traveller “my dinner guest,” then waits to see whether they have brought dinner.

**Troll chassis:** LV 5; AC 12; HP 24; morale 9; move near. STR +3, DEX +2, CON +2, INT −1, WIS +0, CHA −1. Two claws +4 (1d6 each) and one bite +4 (1d10). Alignment C.

**Stock ability — Regenerate.** Regains 2d6 HP on her turn unless her wounds are cauterized with fire or acid. For this sample, fire or acid damage prevents the healing on her next turn. Neither deals additional damage solely because it prevents regeneration. These are ability counters, not vulnerabilities.

**Added ability — Fling (at will; replaces all attacks).** One human-sized or smaller creature within close makes DC 12 STR. On failure, Mother Brine throws it up to near onto visible supporting ground and deals 1d6 damage; on success, nothing happens. Obstructions stop the throw without extra collision damage. She raises an empty hand and looks at the landing spot before acting. She uses Fling when it will separate a target from its companions; otherwise she makes her normal attacks.

**Vulnerabilities — three new:**

- **Salt (Shadowdark).** A weapon rubbed with a handful of salt before combat bypasses her rubbery hide: attacks with it use AC 9 instead of AC 12. The coating is consumed on its first hit or washed off by water. This does not stop regeneration. Clue: her skin has pale, pitted scars wherever the bridge's salt sacks leaked.
- **Pride (Pendragon).** Within near, spend an action saying, “A proper host tastes her own cooking first.” Once per encounter, she must spend her next attack action tasting something from her cookpot instead of attacking. She can still move and regenerate. This is a compulsion of her stolen hostess charm, not a general persuasion rule. Clue: the phrase is stitched around her bonnet.
- **Cold (damage type).** Takes double cold damage. Double the rolled damage once before applying it. Clue: frost-blackened fingers hang over a steaming kettle; the salt-road workers know she refuses to cross the bridge after a hard freeze.

**Common:** She collects a meal as a bridge toll. Empty-handed travellers may become the meal.

**Uncommon:** She washes salt from her clothes obsessively and steals fuel to keep the river beneath the bridge from freezing.

**Rare:** Salted weapons strike her at AC 9. Cold deals double damage. Challenging her hospitality with the stitched phrase costs her an attack action once per encounter. Fire and acid prevent healing but cause no extra damage.

**Obscure:** Her bonnet contains a charm stolen from a household spirit. It made her a hostess without teaching her what humans eat. Returning the charm to the abandoned cottage ends the tasting compulsion and may persuade her to give up collecting guests.

**Legend:** A widow once crossed the bridge by bringing two dinners and insisting that Mother Brine sit down first. The troll still sets two places every evening.

**Hooks:** Salt merchants want the bridge cleared, but their own leaking cargo has made the troll increasingly angry. A missing baker is alive beneath the bridge, trying to teach her that guests should be invited; he wants his charm back before leaving.

**Treasure:** Under the bridge are 63 gp, three unopened sacks of salt worth 5 gp each to the road merchant, and a pewter dinner service worth 20 gp to the baker. A defeated troll supplies one Living Stitch below.

## The Unburied Treasurer

A mummy with ledgers nailed to its breastplate. It walks the burial chamber counting offerings and dragging every thief back to the spot where their name should be entered.

**Mummy chassis:** LV 10; AC 13; HP 47; move near; immune to morale checks. STR +3, DEX +0, CON +2, INT +3, WIS +2, CHA +3. Three rot touches +8 (1d10 plus Necrosis). Alignment C.

**Stock abilities — three:** immunity to morale; immunity to damage from nonmagical sources, except fire; **Necrosis:** a creature hit by a rot touch makes DC 15 CON or drops to 0 HP. Healing spells cast on a target at 0 HP because of Necrosis require DC 15 spellcasting checks.

**Added ability — Bring to Account (once per fight).** At the start of its turn, choose one enemy within near carrying an object stolen from this tomb. The enemy makes DC 15 STR. On failure, spectral ledger ribbons pull it up to close toward the mummy; on success, it stays put. This deals no damage and grants no additional attack. The ribbons stop at an obstruction or lethal drop. A stolen object's inked inventory number glows immediately before the power. The mummy chooses the carrier of the most valuable stolen object, breaking ties randomly.

**Stock vulnerability — Fire:** ordinary fire can damage it and all fire damage is doubled.

**Vulnerabilities — four new:**

- **Music (Shadowdark).** Spend an action playing or singing its funeral refrain within near. It has disadvantage on attack rolls until the start of the performer's next turn. Continuing requires another action. The refrain is three simple notes carved beside its death mask; no performance check is required.
- **Generosity (Pendragon).** Place at least 10 gp of your own money in the poor-box and spend an action dedicating it to someone in need. For the rest of the encounter, the mummy cannot attack you or target you with Bring to Account. Attacking the mummy ends your protection; stealing back the money ends all protection obtained from that poor-box. Clue: intact carvings show the treasurer kneeling before beggars.
- **Its True Name (Shadowdark).** Within near, spend an action speaking its full burial name. It loses its immunity to ordinary damage until the start of the speaker's next turn. It retains morale immunity and still takes double fire damage. Clue: an erased nameplate leaves readable impressions on its reverse; a mortuary copy is kept at the village shrine.
- **The Hanged Man (tarot).** Spend an action turning its hanging account tablet upside down within near. It must spend its next attack action trying to read the inverted accounts; it can still move and use Bring to Account. Each encounter, this works once. Clue: every wall figure has been repainted upright except the treasurer's upside-down execution portrait.

**Common:** The mummy attacks tomb robbers and anyone accompanying them. Gold rattles inside its bandages.

**Uncommon:** The funeral refrain makes its hands tremble. It pauses before the poor-box as though trying to remember a duty.

**Rare:** Fire deals double damage. Music spoils its attacks; a genuine charitable offering protects its donor; the burial name briefly permits ordinary weapons to harm it. Its own account tablet, inverted, consumes an attack action.

**Obscure:** It was executed for supposedly stealing relief funds. The inverted tablet records where those funds actually went: into the royal war chest. Publicly correcting the ledger and paying the outstanding relief debt completes its burial and ends the haunting.

**Legend:** The executioner hung the treasurer upside down so that “he might see the accounts from the king's perspective.” The tomb painters preserved the insult, and the dead preserved the mistake.

**Hooks:** A famine priest needs the tomb's money to buy grain and offers to guide the party through its funeral music. The royal descendants will pay more for the ledger to disappear than the village can pay for the treasure; the poor-box names the families still owed relief.

**Treasure:** The burial coffer contains 240 gp and two lapis account seals worth 40 gp each to the shrine archivist. The sarcophagus holds three doses of Funeral Resin below. Poor-box donations belong to the relief fund and are not included in the coffer's value.

## The Thimble Prince

A fairy wearing a silver thimble as a crown. He levies a toll on every cup of milk left overnight and insists that the entire orchard is his ancestral kingdom.

**Fairy chassis:** LV 1; AC 13; HP 4; morale 8; move near (fly). STR −2, DEX +3, CON +0, INT +1, WIS +0, CHA +1. One needle +3 (1 damage plus Poison). Alignment N.

**Stock abilities — two:** flight; **Poison:** a creature hit by the needle makes DC 12 CON or falls into deep sleep for 1d4 hours.

**Added ability — Royal Exchange (once per fight; replaces movement).** Swap positions with one willing fairy within near. Both destinations must be unoccupied apart from the participants and reachable by their flight; the swap cannot pass through sealed barriers. Each retains its normal attack action. Their crowns ring like struck cups before the swap. The prince uses this when bloodied, exchanging with the fairy farthest from his nearest enemy; break ties randomly. He needs an ally to use it, but it remains one ability in this version's inventory.

**Vulnerabilities — four new:**

- **Iron (Shadowdark).** An iron weapon deals double damage to him, including its ordinary weapon damage. A magical iron weapon also qualifies; double only once. Clue: iron nails scorch the leaves around his throne, and he hires children to remove them.
- **Generosity (Pendragon).** Spend an action offering him a fresh berry without asking anything in return. His binding royal custom compels him to accept the first such gift each encounter. He cannot harm its giver until he returns a gift of at least equal value; returning a gift costs his attack action. He can still attack others. Clue: his herald complains that commoners keep “buying royal mercy with strawberries.”
- **Vanity (Shadowdark).** Spend an action placing a mirror within close of him, reflecting his face. While he can see that reflection, his attacks have disadvantage. Covering or turning the mirror takes his attack action; simply moving beyond close also ends the penalty. The special susceptibility is his compulsive fixation on his reflection. Clue: every polished surface in his court is covered with cloth.
- **The Emperor (tarot).** Within near, spend an action presenting the orchard's authentic boundary deed and reading the owner's name. Until the end of his next turn, his crown's authority fails: his AC is 10 and he cannot use Royal Exchange. Repeating the declaration can renew the effect. Clue: the crown bears the same property mark as the deed; the farmer keeps it in a kitchen chest.

**Common:** Tiny courtiers collect milk and sleeping travellers lose their buttons. The prince calls these seizures lawful taxation.

**Uncommon:** Iron burns fairy flesh. Courtiers hide mirrors and fear unsolicited gifts more than drawn knives.

**Rare:** Iron deals double damage; a freely offered berry protects its giver until repaid; his own reflection distracts him; the true orchard deed briefly lowers his AC and blocks Royal Exchange.

**Obscure:** The thimble was once the farmer's grandmother's. Her promise that the fairy could “rule while I sew” ended when she died, but he forged a perpetual claim. The original deed exposes the crown's stolen authority.

**Legend:** He won his kingdom by making a tired seamstress laugh. He has spent sixty years trying to make the joke legally binding.

**Hooks:** A wedding cannot begin because the prince has stolen every fastening from the guests' clothing. The farmer wants the fairy court evicted, but the court has been keeping a far worse orchard blight asleep; the party must arrange a successor before ending the prince's rule.

**Treasure:** His throne is a walnut shell containing 8 gp in stolen coins, a garnet worth 25 gp to the jeweller, and the Thimble of Borrowed Splendour below. Returning the farmers' stolen buttons earns hospitality rather than a cash reward.

## Sample treasure cards

These four items provide different rewards: an unusual tool, a harvested consumable, a defensive reagent, and a small magic item. Prices are named buyers' offers for these samples, not fixed market prices.

### Gatekeeper's Badge

A brass portcullis with one bent tooth. **Mundane tool and credential; 15 gp offered by the palace historian.**

The bent tooth fits the old palace service locks. While carrying the badge, you can open those locks without a check by spending an action. It grants no authority outside the abandoned palace. The historian pays only if the badge is accompanied by Harl's account of its origin. It occupies negligible space.

**Complication:** Using the service door rings the surviving servants' bell. Someone below the palace still answers it.

### Living Stitch

A green tendon wound around a bone bobbin. **Monster component; one use; 15 gp offered by the bridge apothecary while fresh.**

After the troll is defeated, spend one crawling turn extracting a tendon and make DC 12 DEX; failure ruins the only usable strip. Within 24 hours, spend one crawling turn sewing it through a broken mundane rope, strap, or leather fastening. It joins the broken ends and is consumed. It cannot rebuild missing material, mend metal, or heal a creature. A repair of an item small enough to carry occupies negligible additional space.

**Clue:** The troll's bonnet has stitches that crawl toward tears in its cloth. Salt or cauterization ruins an extracted strip.

### Funeral Resin

Amber paste in a thumb-sized sealed clay pot. **Defensive consumable; three doses recovered; 30 gp per intact dose offered by the mortuary priest.**

Spend an action smearing one dose on yourself or a willing creature within close. For one hour, the recipient has advantage on CON checks against the mummy's Necrosis. The dose is consumed. It does not cure Necrosis or restore HP. Additional doses do not stack. Sealed doses do not expire; all three pots together occupy one gear slot.

**Clue:** Tomb attendants painted the same paste on their wrists; the relief beside the sarcophagus shows the preparation.

### Thimble of Borrowed Splendour

A silver thimble warm as a sunlit peach. **Magic item; 60 gp offered by the travelling illusionist.**

Once per day, spend an action placing it on a finger and naming one visible garment you wear. For one hour, that garment appears clean, finely made, and richly embroidered. Its shape, physical condition, protection, and value do not change. Touch reveals the true fabric. Removing the thimble ends the illusion. It occupies negligible space and grants no automatic success on social checks.

**Complication:** During the illusion, fairy courtiers recognize the wearer as a visiting dignitary and begin requesting judgments on their disputes.
