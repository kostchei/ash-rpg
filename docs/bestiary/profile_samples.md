# Monster profile samples

Authoring draft, 2026-09-30. These examples apply the [profile specification](../plans/monster_profile_design.md) to six actual imported monsters. Source numbers below were checked against `data/bestiary/stats/shadowdark-core.json`. Imported stats remain unchanged. All added powers, counters, lore, and component prices are proposed ASH content, not implemented or playtested rules.

Source traits are summarized here; the original JSON remains the authority for their full wording. The tables link source advantages and added powers to actual vulnerabilities. Avoiding range, blocking a route, and separating allies remain useful tactics but do not count as vulnerabilities. Behavioural vulnerabilities are particular supernatural obligations or susceptibilities, not general social rules.

**Design correction:** the ability-counter tables below are exploratory examples, not a required structure. The requirement is one vulnerability plus one additional vulnerability per special ability; those vulnerabilities need not counter those abilities. These early samples have not yet been revised for that count. Future authoring draws from the [expanded vulnerability pool](vulnerability_pool.md) and mixes physical, symbolic, and psychological susceptibilities.

## Mummy — the procession must continue

**ID:** `mummy`. **Source chassis:** LV 10, AC 13, HP 47; three rot touches +8, 1d10 plus necrosis. **Role:** controller. Advances toward whoever carries grave goods; otherwise the nearest living enemy, choosing randomly on a tie.

**Creature vulnerability — Desiccated (retained):** fire damages it even when nonmagical, and deals double damage. Blackened wrappings and burned patches in the burial chamber disclose this weakness.

| Advantage | Counter |
|---|---|
| Immunity to ordinary damage | Retained exception: ordinary fire bypasses the immunity and deals double damage |
| Immunity to morale | Proposed burial obligation: return a stolen grave good to its marked resting place using an action. Until the end of its next turn it loses morale immunity and must spend its attack action inspecting the object rather than attacking. Existing morale triggers apply; returning an object does not create a check. A particular object works only once per encounter |
| Necrosis | Proposed mortuary seal: spend an action coating one touched creature with consecrated embalming resin. It has advantage on saves against Necrosis until the end of its next turn; this does not cure an existing affliction |
| Added Procession of Dust | Igniting the mummy suppresses the aura until the start of its next turn |

**Procession of Dust — added aura.** At the start of the mummy's turn, living enemies within close make DC 12 CON checks. On failure, they cannot move toward the mummy until the start of its next turn; they can move away or act normally. No damage and no extra attack. Before it activates, the mummy exhales a cloud of dry funeral incense. Fire damage since its previous turn suppresses this activation. It uses the aura whenever at least one enemy is close.

**Common:** A royal corpse still walks the route carved into its tomb walls. Dust rises from its mouth before it touches the living.

**Uncommon:** Tomb keepers carry fire openly. Funeral attendants once painted their wrists with resin before handling the body.

**Rare:** Fire bypasses its ordinary-weapon protection and deals double damage; it also clears the dust aura. Consecrated embalming resin protects briefly against the death-touch save. A returned grave good interrupts the procession for one attack action.

**Obscure:** The mummy believes the funeral is unfinished. The tomb inventory records which objects and names must be present to complete it. Restoring the full inventory and speaking the final name ends its guardianship; the procession inscription supplies those steps.

**Component — Funeral resin:** scrape one sealed dose from the inner sarcophagus; no corpse cutting required. One action applies it to one creature for the Necrosis protection above, consuming the dose. A mortuary priest offers 30 gp for an intact dose. Counter access also exists through the priest; fighting the mummy is not the only way to obtain it.

**Hooks:** (1) A carpenter used a stolen funerary board to repair the granary; something traces the old procession route through the village each night. The board's carved inventory reveals the obligation. (2) A priest has resin but needs the tomb's final inscription to finish the burial; the family would rather preserve its lucrative ancestral guardian.

**Legend:** The ruler ordered the funeral delayed until an absent child returned. Descendants hid that condition to keep the guardian active. The missing name offers a way to resolve the haunting rather than destroy it.

## Vampire — a predator that needs permission to feed

**ID:** `vampire`. **Source chassis:** LV 11, AC 15, HP 52; three bites +7, 1d8 plus blood drain, or charm; near movement with climbing. **Role:** lurker/controller. Prefers isolated targets and retreats toward its coffin when escape is possible.

**Creature vulnerability — Sunlight (retained):** direct sunlight deals **3d8 damage per round**. Resolve this once at the beginning of its turn in the sample. The user's alternative of **10 HP per round plus suppressed healing** is a possible explicit replacement; it is not silently applied here. The source has healing from Blood Drain, not a separate regeneration trait.

| Advantage | Counter |
|---|---|
| Immunity to ordinary damage | Retained direct sunlight damage bypasses this protection; proposed holy water also bypasses it, dealing 1d6 on a successful thrown attack and consuming one flask |
| Immunity to morale | Proposed burial name: spend an action within near speaking the full name inscribed inside its coffin. It loses morale immunity until the end of its next turn; existing morale triggers apply, with no automatic extra check. Each speaker can invoke the name only once per encounter |
| Blood Drain and its healing | Proposed garlic dressing: an action protects one willing creature until the start of the applier's next turn. Bites still deal weapon damage but cause no Blood Drain on that creature; no healing or CON loss from the blocked rider |
| Charm | Proposed reflected mortality: spend an action within near presenting its own face in a silvered mirror. If it can see the reflection, it cannot use Charm until the end of its next turn; it recoils from the sight of its unchanging death-face. Averting one's own eyes is ordinary counterplay, not this vulnerability |
| Shapechange, including bat flight | Proposed salt wound: an action applies a handful of salt at close range; against an unwilling vampire, DC 12 DEX avoids contact. On failure it reverts to humanoid form and cannot shapechange until the end of its next turn; the ability counter works through ordinary-damage immunity |
| Climbing | Proposed entrance rite: an unbroken line of blessed chalk across a climbable surface cannot be crossed while climbing; laying a close-length line takes an action. Rain or an action wiping it breaks it |
| Survival at 0 HP | Retained wooden stake through the heart at 0 HP is required for permanent death |
| Added Host's Courtesy | Publicly withdraw the invitation before its turn; the power then has no qualifying target |

**Host's Courtesy — added move power, once per fight.** If someone audibly invited the vampire into the current building and has not withdrawn the invitation, the vampire may replace its normal movement with a shift through shadow to an unoccupied space close to that inviter, within near of its starting point. It requires a visible destination in the same building and does not pass sealed walls. It gains no attack beyond its normal action. Candles lean toward the inviter before it uses the power. It uses this to reach an isolated inviter; if several qualify, choose the nearest, then randomly.

**Common:** The dead noble is always invited, never arrives at noon, and leaves guests pale and weak.

**Uncommon:** It studies faces before issuing commands but recoils from its own face in polished silver. One surviving servant wore garlic beneath a scarf; another scratched chalk across a wall instead of a doorstep.

**Rare:** Presenting its own face in a silvered mirror suppresses Charm until the end of its next turn. Garlic dressing blocks the drain briefly. Salt forces it out of its borrowed forms; blessed chalk interrupts its climbing. Sunlight harms it, coffin denial weakens it, and a wooden stake at 0 HP finishes it. Looking away also avoids Charm, but is ordinary tactical advice rather than an added vulnerability.

**Obscure:** Invitations are remembered as personal debts. Naming the inviter and explicitly withdrawing consent ends Host's Courtesy immediately, even if another person owns the building. Its full burial name, inscribed inside the coffin, briefly makes it remember mortality and permits ordinary morale checks. Denying coffin access also causes the retained unhealable 2d6 HP loss per day until it rests in a coffin again.

**Component — Coffin dust:** recover one vial from the occupied coffin's lining. It is consumed during one day's research into this vampire's resting places, granting advantage on that INT research check. It does not locate coffins automatically. A local exorcist offers 40 gp for a labelled vial.

**Hooks:** (1) Wedding invitations were sent to a patron who has been dead for fifty years; the candles lean toward the bride's father. The party can investigate or publicly offend the household's benefactor. (2) A displaced servant knows where the coffin is, but destroying it will also destroy documents proving the servant's family owns the estate.

**Legend:** The noble first fed on a guest who asked for protection. It still frames predation as hospitality. Its remembered invitations provide both access and a discoverable way to deny that access.

## Troll — separate the meal from the pack

**ID:** `troll`. **Source chassis:** LV 5, AC 12, HP 24; two claws +4, 1d6, and one bite +4, 1d10. **Role:** bruiser. Closes on the nearest enemy; chooses randomly on ties.

**Stock regeneration counters — Cauterization (retained):** fire or acid cauterizes wounds and prevents its 2d6 healing. These do not cause extra damage and do not count toward the stock vulnerability total. For the sample, damage of either type suppresses healing at the beginning of its next turn. This timing makes the source's cauterization wording explicit. The troll's creature vulnerability still needs authoring; its proposed salt susceptibility below is draft content.

| Advantage | Counter |
|---|---|
| Regeneration | Fire or acid cauterization, as above |
| Added Fling | Proposed salt-stiffened tendons: spend an action applying a handful of salt to an open wound at close range; DC 12 DEX lets the troll avoid contact. On failure its arm tendons stiffen and it cannot use Fling until it spends an action washing the salt away with water. This does not suppress regeneration |

**Fling — added attack replacement.** Instead of its entire normal attack routine, seize one close creature of human size or smaller. DC 12 STR avoids the grab; failure pushes it up to near onto visible supporting ground and deals 1d6 damage. Success causes neither movement nor damage. A wall stops displacement; the 1d6 still applies on a failed save, with no collision bonus. It cannot throw someone through an obstruction or off a lethal drop. It raises an empty claw and looks toward the landing place before acting. Use when a target can be separated from all its allies; otherwise use normal attacks.

**Common:** A troll's wounds close before the blood reaches the ground. Its hunting ground contains bodies scattered far apart.

**Uncommon:** Charred flesh does not knit. Salted wounds heal into rigid knots; hunters have seen trolls washing their forearms before they could throw again.

**Rare:** Fire or acid blocks the next regeneration. Salt applied to an open wound stiffens its arm tendons and disables Fling until washed away. Its throw trades away all three attacks. A solid backstop also prevents displacement, but that is ordinary counterplay rather than a vulnerability.

**Obscure:** The local troll tends a patch of sweet marrow-roots. Offering a basket outside its den feeds it without strengthening its taste for travellers; after accepting the basket it spends one crawling turn eating rather than pursuing. This proposed behavioural bargain applies to this local population, not every troll.

**Component — Living tendon:** one strip from a defeated troll, DC 12 DEX to extract; failure destroys it. Within one day, consume it to bind a broken rope or leather strap during a crawling turn; it repairs that mundane item once. An apothecary pays 15 gp for a fresh strip. It cannot grant regeneration to a wearer.

**Hooks:** (1) A ferryman sells expensive fire oil while concealing that he has harvested the troll's food patch. Replanting it could end the attacks and his monopoly. (2) A survivor is stranded on a ledge across a ravine; the troll's discarded rope has begun repairing itself. The rope reveals both the component use and how the victim arrived there.

**Legend:** Villagers remember a troll that accepted roots instead of a child as a bridge toll. Its hunger can be redirected, although burning out its garden makes the bargain impossible until the crop returns.

## Gnoll — the pack closes when blood spills

**ID:** `gnoll`. **Source chassis:** LV 2, AC 12, HP 10; spear +1, 1d6, or longbow +1, 1d8. **Role:** skirmisher. Tries to put two pack members close to the same enemy.

**Creature vulnerability — Scent overload (added):** gnolls' blood-sensitive noses are overwhelmed by pungent hunters' pepper. Spend an action scattering one pouch into a close patch. Gnolls in that patch make DC 12 CON; on failure they retch and lose all benefits of Rage, cannot activate Rage, and cannot initiate or answer Blood Call until the end of their next turn. Rage's three-round duration continues running. A fresh application can renew the effect, but the penalties do not stack.

| Advantage | Counter |
|---|---|
| Rage: temporary morale immunity | Scent overload suppresses the immunity on a failed save; existing morale triggers apply, with no automatic extra check |
| Rage: +1d4 damage | Scent overload suppresses the damage bonus on a failed save |
| Added Blood Call | Scent overload prevents an affected gnoll from either starting or answering the blood response, even with packmates beside it |

**Blood Call — added trigger, once per pack per round.** When a gnoll's normal melee attack changes an enemy from above half HP to bloodied, the scent of fresh blood and its hunting cry let one other conscious gnoll close to that enemy immediately make one spear attack. Neither gnoll can be under Scent overload. This uses the responding gnoll's next attack action: mark that action as spent, and it cannot attack again on its next turn. It may still move. The follow-up cannot trigger Blood Call. If several gnolls qualify, select the one with lowest current HP, then randomly. Their laughter falls silent before they converge. The pack uses the trigger whenever eligible.

**Common:** Gnolls laugh to establish where their companions are. When blood first spills, the laughter stops.

**Uncommon:** Packs converge on the scent of the same wounded enemy. Frontier hunters carry pungent pepper; even enraged gnolls recoil from it, retching and losing their hunting rhythm.

**Rare:** Hunters' pepper overwhelms the blood-scent on a failed DC 12 CON check: it suppresses both Rage benefits and prevents initiating or answering Blood Call until the end of the affected gnoll's next turn. Blood Call needs another gnoll already close and only happens once per pack per round; the responder spends its next attack action early. Separating the pack also prevents the follow-up, but is ordinary counterplay, not a vulnerability.

**Obscure:** This pack's calls began as signals for sharing food rather than killing. A former pack member can identify the rallying whistle used to gather them; imitating it from cover draws their attention but does not magically compel movement.

**Component — Pack whistle:** one intact whistle from a defeated, captured, or bargaining pack member. A crawling turn studying it allows a character to learn this pack's rallying signal without a check, enabling recognition or imitation of the signal. A frontier scout offers 10 gp; it is reusable and does not compel movement or suppress Rage. The scout also sells hunters' pepper at 1 gp per single-use pouch, supplying the actual vulnerability before combat.

**Hooks:** (1) A militia drills shoulder to shoulder and is losing recruits to coordinated spear strikes. Survivors know precisely when the laughter stops. (2) An expelled pack member offers a whistle and a route past the hunters in exchange for rescuing a captive sibling.

**Legend:** The oldest hunter can still tell which laugh belonged to every fallen companion. It searches for a missing sibling whose scent was deliberately masked with hunters' pepper; evidence of the sibling's fate offers leverage for negotiation.

## Elephant — the smallest sting breaks the charge

**ID:** `elephant`. **Source chassis:** LV 7, AC 14, HP 34; two tusks +6, 1d8. **Role:** bruiser. Protects its herd and seeks open straight approaches.

**Creature vulnerability — Panic at bees (added):** these elephants panic when a live bee swarm is within close. At the beginning of its turn, the elephant makes DC 12 WIS; on failure it cannot use Charge or Trample until the beginning of its next turn, and must use its movement to retreat from the swarm by the safest available route. If no safe route exists, it stays in place; it may still use its normal tusk attacks. Releasing a transported hive takes an action and releases the swarm where the hive is placed; bees are a persistent hazard to everyone nearby, not a harmless consumable weapon. A recording or imitation of buzzing does not trigger this susceptibility.

| Advantage | Counter |
|---|---|
| Charge: double-near straight movement and triple-damage attack | Panic at bees disables Charge on a failed WIS check even when a clear approach exists |
| Added Trample | Panic at bees cancels the prepared Trample on a failed WIS check; the elephant retreats instead |

**Trample — added attack replacement, once per fight.** At the end of its turn, if at least two enemies occupy a clear straight route no longer than near, announce that route; stamping feet and a lowered head mark the warning. On its next turn, it uses its movement and entire attack action to rush along that route. Each creature in the route, including allies, makes DC 12 DEX: success moves it to the nearest safe space beside the route with no damage; failure deals 1d8 damage and knocks it prone. If a solid barrier now blocks the route, stop before it and affect only the traversed portion. The rush does not also make Charge or tusk attacks. If no enemy remains on the route, it abandons Trample and acts normally.

**Common:** The herd forms around its young. A lowered head and stamping feet mean it is choosing a route through whatever threatens them.

**Uncommon:** Ruined fences lie in straight tracks, while trees immediately beside them remain intact. Fields bordered by living beehives are untouched; even the lead animal backs away when a hive opens.

**Rare:** A live bee swarm within close forces a DC 12 WIS check at the beginning of its turn; failure disables Charge and Trample and makes it retreat safely. Trample is announced a turn ahead, affects allies as well as enemies, and replaces its attacks. Moving out of the marked route or placing a barrier remains useful counterplay, but neither counts as a vulnerability.

**Obscure:** The lead animal recognizes the old keeper's feeding song. Evidence in the keeper's journal and a surviving apprentice teaches it; the familiar song makes the herd willing to follow a safe route when no calf is presently threatened.

**Treasure — Herd bond:** guide a separated calf safely back without capturing or injuring it. The local sanctuary gives the party a 25 gp provision voucher and the keeper's feeding song. This replaces corpse harvesting: the useful treasure is a relationship, with a concrete buyer and reward.

**Hooks:** (1) A merchant wants the herd driven across a narrow bridge; villagers below fear a panicked charge will destroy their water gate. The keeper's journal offers a safer option. (2) Loggers intend to release a hive to drive off the herd, but a trapped calf cannot follow its mother. The party must free it or find another route before the hive is opened.

**Legend:** A keeper once returned every orphan to its herd and was carried home on the oldest elephant's back. Recognition of that care can settle an encounter that weapons would make worse.

## Fairy — debts have weight

**ID:** `fairy`. **Source chassis:** LV 1, AC 13, HP 4; needle +3, 1 damage plus sleep poison; near flight. **Role:** skirmisher. Uses cover to approach isolated targets and avoids attacking someone to whom it owes a gift.

**Creature vulnerability — Generosity (added):** a fairy can accept an offered gift freely; acceptance is not compelled. For this population it accepts a fresh flower or a piece of fruit if it is not already indebted to the giver. Offering takes an action at close range. Until it gives an equally useful gift back, it cannot target that giver with attacks, poison, or Misleading Glimmer. The debt does not protect the giver's companions. It repays by spending an action handing over a flower or fruit; it cannot give the offered item straight back as repayment.

| Advantage | Counter |
|---|---|
| Flight | Proposed clinging pollen: spend an action scattering a handful into a close patch. A fairy entering makes DC 12 DEX or lands immediately and cannot fly until it spends an action cleaning its wings. It takes no falling damage from this forced landing |
| Sleep poison | Proposed bitterleaf: chewing one leaf uses an action and grants advantage on the next save against this fairy poison before the end of the encounter; consumed on that save |
| Added Misleading Glimmer | An accepted gift prevents targeting its giver until the debt is repaid |

**Misleading Glimmer — added move power, once per fight.** Replace normal movement with a shift up to close. One enemy within near that can see the fairy makes DC 12 WIS. On failure, that enemy cannot approach the fairy until the start of the fairy's next turn; it can act, move away, or pursue another target. Success has no effect. This power deals no damage and leaves the normal attack action available. The fairy makes a duplicate sparkle to one side before it shifts. Use when an enemy is closing and a safe reachable destination exists; select the nearest eligible enemy, then randomly.

**Common:** Fairies borrow bright things, leave sleepers under hedges, and insist every present deserves a present in return.

**Uncommon:** Their wings stick in the thick pollen beneath the flowering hedge. Shepherds chew bitterleaf before tending the fairy meadow.

**Rare:** Pollen grounds them until they clean it off. Bitterleaf gives advantage against the sleep poison. An accepted fresh flower or fruit creates a personal debt that prevents hostile targeting until repayment.

**Obscure:** The meadow court has mistaken hospitality for a system of debts. A visitor who continually requests payment never creates the gift obligation; an unconditional useful gift does.

**Component — Meadow pollen:** one pouch gathered during a crawling turn from flowering hedges, without harming a fairy. Scatter it once for the grounding counter above; used pollen cannot be recovered. A hedge herbalist offers 5 gp per sealed pouch and also sells bitterleaf, so both counters are available before combat.

**Hooks:** (1) A farmer pays for protection while refusing to accept the fairy's annual flower. Both parties believe the other has broken the bargain. (2) A child asleep beneath the hedge is wearing a wreath; its pollen has grounded the culprit nearby. Rescuing the child could begin with a gift rather than a pursuit.

**Legend:** The first fairy was welcomed with food before anyone asked its name. The court turned gratitude into law. Generosity exploits that law while leaving room for a real relationship.

## Numeric-defence stress test: the tarrasque

The imported `the_tarrasque` has **AC 22 and HP 140**, so its profile must include separate advantages for carapace armour and extraordinary endurance even though the source does not name those numbers as powers.

Two candidate counters demonstrate the format; this is not a complete seventh profile:

- **Carapace armour:** after it commits to the source Rampage, an attacker directly behind it may spend an action levering a visible rear plate with a pole. DC 15 STR opens a joint until the start of the creature's next turn; attacks aimed at that joint use AC 14. The creature's magical-damage requirement remains unless a separate counter bypasses it.
- **Extraordinary endurance:** proposed alchemical susceptibility: a dose of grave-bitter delivered directly into its exposed gullet makes DC 18 CON or halves its current and maximum HP for the encounter. Its enormous metabolism amplifies this particular poison; no other poison gains the benefit automatically. Repeated doses do not stack. When the effect ends, restore maximum HP but not lost current HP. This does not suppress regeneration or bypass permanent-death rules, which need separate vulnerabilities. Delivering the dose is hazardous, and the sour-black residue in old feeding pits is a discoverable clue.

A complete profile must additionally address immunity to ordinary damage; difficulty casting hostile spells; fire immunity; cold immunity; amphibious movement; burrowing; permanent-death condition; Rampage; energy immunity; reflection; regeneration; Sever; and Swallow. A single generic "weak belly" entry would not satisfy the requested coverage. Its source swallowing rule already provides one counter: sufficient damage inside its gullet makes it regurgitate swallowed creatures.
