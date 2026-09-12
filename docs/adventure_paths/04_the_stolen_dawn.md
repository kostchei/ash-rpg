# Adventure Path 4: The Stolen Dawn

Status: authored campaign design, 2026-09-07. Not a registered runtime adapter. Engine 13: Sustained Catastrophe. Inspired by the victory structure of *Rime of the Frostmaiden*; the names, procedures, dependencies, and outcomes below are ASH adaptation rules.

An unnatural winter has already taken hold. Every night a sovereign renews the working that keeps dawn below the horizon. The party can end it by defeating the sovereign, permanently breaking the means of renewal, **or** establishing an independent source of returning daylight. Any one completed condition wins the path.

The campaign covers levels 1–10 through three acts: **town and nearby sites → wilderness → underground**. It uses exactly **two Cursed Scroll zone profiles**, with the same surface profile for the first two acts. No seasonal thaw, banked Cold Reserve, or mandatory sequence of three boss fights is involved.

## The Core Procedure: More Than One Way to Win

Generate all three success routes at campaign creation. They are alternatives, not three components of one ending. Each has its own clues, access, execution, costs, and resulting world state. A route may share travel or useful allies with another, but must not require another route's victory first.

Record success as:

`sovereign_defeated OR renewal_permanently_disabled OR dawn_engine_established`

The names above are design notation, not implemented runtime fields. Acquiring a weapon, reaching a destination, learning a weakness, or possessing an activation key enables an attempt; none alone satisfies the corresponding condition.

Do not silently funnel all three routes into killing the sovereign. A living sovereign can oppose the other routes with its actual capabilities, but those routes remain winnable through defence, deception, diversion, or outmanoeuvring it. Never grant it a new replacement mount, teleport, immunity, or second renewal method after the party commits to a proven solution.

## Geography: Three Acts, Two Cursed Scroll Zones

Use the project's existing [zone profiles](https://github.com/kostchei/ash-rpg/blob/main/src/shared/zone-profiles.ts). Their source themes supply regional material; the supernatural winter and buried dawn machinery are authored overlays, not claims about the published scrolls.

| Act | Levels | Primary territory | Cursed Scroll profile | Expedition scale |
| --- | --- | --- | --- | --- |
| I — Keep the Hearths | 1–3 | Hearthhaven and its nearby fishing villages, farms, shrines, and old workings | The Isles of Andrik — Cursed Scroll 3: Midnight Sun | Town decisions and short expeditions with viable return journeys |
| II — Cross the White Country | 4–7 | The outer fjords, upland passes, sovereign's roost, and glacier approaches | The same Isles of Andrik profile | Wilderness journeys, shelters, transport, and remote objectives |
| III — Bring Back the Morning | 8–10 | The buried city of Veyr, reached through karst beneath the glacier | Morzomotha & Karst Deeps — Cursed Scroll 5: Dwellers in the Deep | Connected underground exploration and the chosen final operation |

The two surface territories are adjoining parts of one persistent surface region. Give them genuinely different mapped sites and travel distances while preserving towns, weather, factions, and consequences across both acts. The current three-instance planning convention may identify a town territory, an outer wilderness territory, and a deep territory separately; their Cursed Scroll profile assignment is **3 → 3 → 5**. Three territory IDs must not be mistaken for three different Cursed Scroll zones, and must not generate the surface twice.

Create physical transitions: a stocked pass from the town territory into the outer fjords; a glacier stair and an independent mine descent into Veyr. Establish return routes and their hazards. Surface travel requires cold protection and provisions; underground travel additionally requires light and navigation. Provide class-independent equipment or negotiated access for every required environment.

These acts budget content and expand the expedition geography. A fulfilled success condition ends the winter immediately, including in Act I or II. Act III remains authored and available; it is not a compulsory prerequisite to every victory.

## Choose the Sovereign

Commit one dossier before generating clues. Its limitations remain true even when inconvenient to the antagonist.

| Element | The Pale Regent | The Mourning Queen |
| --- | --- | --- |
| Nature and motive | An exiled winter divinity preserving a realm where no rival can find it | A frost giant oracle preserving her dead household in a world without spring |
| Nightly renewal | Flies the dawn circuit on the unique aurora roc, carrying its living sky-mark | Rings the horizon bell from a mountaintop observatory through its original star lens |
| Why it cannot simply renew elsewhere | The sky-mark belongs to this roc alone; the ritual cannot be cast from the ground or another mount | The bell and star lens are a matched, irreplaceable instrument aligned to this horizon |
| Personal vulnerability | Casting expends its mantle until the following dusk; its physical forms can be destroyed during that interval | Renewal exposes the frost-heart housed in her breast until the bell's echoes fade at dawn |
| Route A finishing condition | Destroy all three committed physical forms before the mantle returns; the dossier grants no resurrection within this campaign | Shatter the exposed frost-heart and defeat the embodied queen; ordinary wounds alone regenerate |
| Route B finishing condition | Slay the roc or permanently release its sky-mark through the discoverable unbinding rite | Destroy the star lens or complete an irreversible deconsecration of the bell |
| Retaliation resources | Named frost wardens, a finite roost garrison, storm-bound scouts | Oathbound hunters, observatory sentries, ancestral messengers |
| After a nonlethal victory | Survives as a diminished exile able to bargain or seek revenge through ordinary operations | Survives to face the thawing of her household and can become an enemy, mourner, or negotiated neighbour |

The unique dependency is a published fact within the campaign once proven, not a surprise technicality. Temporary restraint, one missed casting, or stealing an instrument without securing its fate buys time but does not meet the permanent-disable condition.

## Keep These Records

There is no universal Doom score. Keep a **renewal record, a settlement supply ledger, and three solution records**.

- **Renewal:** caster, unique dependency, route or casting site, dusk and dawn schedule, last successful casting, interruptions, and whether renewal is permanently possible. One missed renewal permits one day of daylight; a later valid casting restores the curse. Permanent cessation permits normal seasons to resume after the next dawn.
- **Settlements:** named population groups, food-days, fuel-days, shelter, accessible supply routes, agreed ration use, and actual deliveries. Deduct supplies on elapsed campaign days, never once per session. Fix each settlement's consumption and shortage consequences before a journey is chosen.
- **Solutions:** evidence sources, facts proven, access methods, remaining preparations, responsible allies, execution condition, and completion history for A, B, and C. Unknown facts stay hidden; established facts do not change to preserve a planned finale.
- **The Toll:** named deaths, abandoned homes, ruined fishing grounds, sacrificed valuables, and obligations accepted. It never decreases after success.

**Tell:** an aurora returning at the same hour, a ferry frozen in place, smoke disappearing from a neighbour's chimney, or a dawn experiment melting one patch of snow.

**Reading:** “Hearthhaven has six food-days left; the eastern ferry is frozen in. The mine road is open, so the next delivery can still reach it.”

## Three Independently Sufficient Success Conditions

| Route | Discover and prepare | Execute to win | Result and cost |
| --- | --- | --- | --- |
| **A — Defeat the sovereign** | Establish the renewal vulnerability, acquire effective weapons and protection, reach the caster during its vulnerable interval | Fulfil the selected dossier's finishing condition so it can no longer renew the curse | Dawn returns; the sovereign is gone. Its ungoverned followers, possessions, and former dependants remain |
| **B — Break renewal** | Prove the unique mount or instrument is indispensable and cannot be replaced; find an approach or the nonlethal rite | Permanently disable that dependency, not merely interrupt one night | Dawn returns with the sovereign alive. Killing the roc sacrifices a unique creature; release or deconsecration requires its own dangerous operation |
| **C — Establish the Dawn Engine** | Reach Veyr; recover operating knowledge; restore its collector and regulator; settle access with its current custodians | Start the engine and sustain it through one complete dusk-to-dawn renewal attempt, with its self-sustaining regulator intact | Its regional field permanently excludes this renewal magic while functioning. Dawn returns with a machine and a stewardship obligation |

Route C's collector and regulator are repair tasks within that route, not required items for A or B. The engine covers the entire authored surface region. Once established it needs no daily fuel or recurring activation; it can fail only through a concrete future destructive act, which begins a new situation and does not retroactively erase victory.

The sovereign receives warning only through established scouts or perceptible activation effects. Before activation, publish the warning delay, available forces, routes, and arrival times through discoverable evidence. If it can arrive, play its intervention; if it is diverted or cannot reach the engine, let the activation succeed without a mandatory boss encounter. Resolve the commissioning interval through consequential exploration and encounters rather than rolling for every minute.

Provide at least two independent evidence sources for each indispensable conclusion. The default routes are:

| Conclusion | First source | Independent source |
| --- | --- | --- |
| Renewal weakens the sovereign | An injured former warden's account, testable by observing its return | A preserved duel record in a wilderness sanctuary |
| Mount or instrument is unique | A sky-watch keeper's measurements and the visible renewal circuit | The maker's inscription and a failed replacement recorded at the casting site |
| A permanent unbinding method exists | A shrine rubbing describing the rite and its requirements | An independent custodian who can demonstrate its principle on a lesser bond |
| A dawn engine can override the curse | A repairable town observatory model producing daylight under the aurora | Veyr's operating archive, accessible through either descent |
| Commissioning takes a full night | The model's timing plate | The regulator's underground maintenance instructions |

Losing one NPC or failing one search cannot erase a route. Clues convey useful next steps, not only atmosphere. Reveal credible evidence of at least two victories in Act I and leads toward all three before asking the party to commit to a final expedition.

## Antagonist Operations and Failure

Renewal maintains an existing catastrophe. The sovereign's other achievements grant concrete advantages rather than filling a winter meter.

| Requirement | Actual deed and capability |
| --- | --- |
| Silence the sky-watch | Wardens reach and occupy its tower; observation from that tower becomes unavailable until access is restored |
| Close a supply pass | Hunters seize its shelter and blockade the mapped road; the named delivery must reroute or be liberated |
| Secure the renewal site | Workers complete a physical defence at the roost or observatory; record its entrances and vulnerabilities |
| Bind a town speaker | A named speaker voluntarily accepts a protection bargain; the sovereign gains only the access and information promised |
| Seize a dawn component | A real expedition reaches and carries away an unclaimed part; track the carrier, destination, and recovery leads |

Set actors, resources, travel, work duration, and tells before advancing an operation. A component already secured by the party cannot vanish because they chose another expedition. Completed deeds stay in history even when their granted capability is later removed.

**Antagonist victory:** every generated surface community has either been abandoned, destroyed, or accepted binding submission, and no independent refuge with provisions and an accessible route remains in the region. The sovereign must still be able to renew the curse, and no party success condition may already be fulfilled. Name the communities at creation; do not add a surprise settlement to delay this outcome.

**If ignored:** scheduled renewals continue, supplies are consumed, and eligible operations finish at their real times. There is no extra punishment for passing a lead. Shortages generate known rationing, evacuation, or submission choices. **If failed:** play continues among evacuees or subjects, with the same three remedies available wherever their physical prerequisites survive. Do not reset the map or resurrect supplies.

## Act I — Keep the Hearths

The party begins in Hearthhaven among fishing crews, fuel cutters, and refugees. Generate six to eight nearby sites, three set-piece situations, and two or three standing problems. Ordinary regional adventures remain useful without belonging to the sovereign's plan.

**Opening leads:** escort fuel cutters back from the silent eastern shelter; or recover the sky-watch keeper's missing observation plates from an icebound chapel. A third, ordinary lead concerns a disputed fishing inheritance and access to a working smokehouse.

| Site or situation | Persistent consequence |
| --- | --- |
| Eastern shelter | Rescue its crew and reopen a named delivery route |
| Icebound chapel | Recover renewal observations; learn when the sovereign is exposed |
| Old observatory | Repair a miniature daylight device; establish a credible lead to Veyr |
| Ferry stores | Recover food with a real transport requirement |
| Abandoned shrine | Find one source of the permanent unbinding rite |
| Smokehouse dispute | Negotiate local provision without requiring allegiance to either antagonist faction |

The three set-pieces are the next scheduled aurora, a declared supply delivery, and a speaker's public protection bargain. Standing problems include ration allocation and testing whether local sacrifices actually influence the spell. Sacrifices provide no renewal benefit unless the selected dossier explicitly supplies one; fear alone is not proof of a magical dependency.

Transition when the party has a viable wilderness route, cold protection, and actionable leads to at least two success routes. Levels budget the material; they do not unlock the road. An unexpectedly successful early operation may end the winter here.

## Act II — Cross the White Country

Generate ten to twelve wilderness sites, five set-pieces, and four or five standing problems. Expeditions compete for travel time and supplies while the winter remains continuous.

Core sites include the sovereign's renewal site, a refuge with vulnerability evidence, the maker's tomb, a hunter camp, a weather station, the glacier stair, the independent mine descent, and a shelter requiring repair. Additional sites provide provisions, protection, allies, treasure, or ordinary regional work.

The five set-pieces are a scheduled renewal flight or bell-ringing, a mapped caravan interception, a refuge evacuation, a rival salvage expedition's departure, and a declared attempt to fortify the casting site. Each has its own actor and date. Standing problems include protecting return supplies, arranging transport, timing the vulnerability, choosing whether to spare the unique creature or instrument, and securing descent access.

An independent ironbound raider faction is constructing a siege beast to seize the remaining stores. Give its construction and attack actual materials, travel, and targets. Defeating it preserves towns and provisions but does not end winter. It need not serve the sovereign. Salvagers seeking Veyr likewise have their own interests and can become competitors or allies.

Routes A and B are fully executable in this act if the party obtains their prerequisites and accepts the danger. Transition underground when the party chooses that expedition and can actually enter it, whether to pursue C, obtain optional advantages for A or B, or explore after an early victory. Never require failure at the renewal site to open Act III.

## Act III — Bring Back the Morning

Generate six to eight underground sites, four set-pieces, and three or four standing problems. Veyr's custodians survived by severing themselves from the surface; returning dawn may bring claimants to their home.

Core sites are the descent refuge, operating archive, collector gallery, regulator workshop, custodian court, and Dawn Engine chamber. Optional sites include a buried armoury useful against the sovereign and an old surface lift providing another return route.

The four set-pieces are a custodian hearing, a rival salvage claim, a scheduled maintenance shutdown, and the party-triggered commissioning night. Standing problems are repair sequencing, negotiating ownership, protecting a crew through the final interval, and deciding who will steward the operating engine.

Underground exploration can also provide allies or equipment for a return to the surface to complete A or B. The final operation occurs wherever the chosen condition requires; the third act's primary underground geography does not relocate the sovereign or its renewal site.

## Endings, Early Victory, and Rewards

At the first fulfilled success condition, mark the path won, record the method, and describe the next dawn. Completing a second route later can improve security or change the inheritance; it does not award the same campaign success twice.

- **Sovereign defeated:** communities rebuild amid claims on its abandoned seat and the fate of surviving servants.
- **Renewal disabled:** the living sovereign must negotiate, retreat, or undertake new, telegraphed actions in a world its old working cannot freeze.
- **Dawn Engine established:** surface recovery depends politically on stewardship of a powerful underground installation; its custodians retain agency and negotiated rights.
- **Victory with a heavy Toll:** daylight returns to ruined homes. Survival, recovery, and justice become the remaining work.
- **Early victory:** preserve it. Remaining act content concerns reconstruction, salvage, endangered underground inhabitants, or securing the dawn's inheritance. Do not restore the same curse merely to force the remaining levels.

The three acts supply content toward levels 1–10, not a requirement to remain under the curse until level 10. Audit each normal victory branch independently under the [XP and site plan](../plans/path_sites_xp_and_zones.md). An early high-risk success is valid at the party's actual level. Post-victory rewards must not be counted as preparation available for the already-won confrontation. Only secured rewards and actually completed objectives pay XP; alternate endings do not stack duplicate success awards.

## Generation and Review Contract

Before advertising runtime support, verify:

- Exactly two distinct Cursed Scroll profiles are selected: surface, surface, underground. The surface is continuous and persistent across Acts I and II.
- All three success predicates have executable procedures and can individually complete the path while the other two remain false.
- Every essential fact has independent clues; no indispensable route requires a particular character class or one surviving NPC.
- A and B can win before the underground act. C can win with the sovereign alive and renewal equipment intact.
- Sovereign retaliation obeys known resources, location, warning, and travel; no forced confrontation makes C secretly depend on A.
- Temporary renewal interruption differs from permanent success, and the interface explains that distinction through observable evidence.
- Town supplies, encounters, sites, operation history, completion, and the Toll survive revisits and reloads without duplicate rewards.
- Failure and early victory preserve prior facts and lead to playable consequences.

These are authored acceptance requirements. Runtime registration, site generation, public projections, outcome evaluation, and branch audits remain implementation work.
