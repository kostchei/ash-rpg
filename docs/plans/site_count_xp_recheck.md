# Site count to reach level 9 before the final boss

**Subsequent implementation:** [ASH site structure](ash_site_structure.md) now uses the owner's exact d6 outcomes: 12, 8+5, or 5+5+5 rooms, with optional continuation and retreat between sections. This supersedes both the provisional fixed-15-room package and the imported CoreDark chain distribution below. The earlier fixed-size XP simulation is not a recalculation for this final distribution.

Recalculation, 2026-09-07, using the owner's latest treasure rule: **site monster rooms, boss rooms, cache rooms, and distinct treasure objectives contain treasure; random encounters have a 50% treasure chance.** This supersedes earlier planning assumptions applying 50% presence to ordinary site inhabitants. Runtime still needs that policy distinction; this document and simulation do not change production treasure generation.

## Target and accounting

Level 1 to level 9 requires at least `10 + 20 + ... + 80 = 360 XP` per character. Strict XP reset on advancement can increase the amount earned. Only the first two act-completion awards count before the final boss: **6 XP**, not 9. Each completed earlier site grants 1 XP. Final-boss treasure, final-site completion, and Act III completion are excluded.

For N completed pre-boss sites, minimum treasure/boon XP needed is `354 - N`, before reset losses. For 25 sites that is **329 XP**, not the 416 XP needed in the earlier level-10 example. Count actual distinct finds: a treasure objective referring to the boss's existing hoard does not create a second drop.

The runtime d10 room table has two ordinary-monster results, one boss result, and one cache result. Under the clarified presence rule this produces **0.4 × room count** expected site treasure sources. It does not guarantee a boss in every site. Separately placed bosses/caches add sources only if they are not already included in the room count.

For the worked model, half of sites have an additional distinct treasure objective and each site expedition has one random encounter, giving another 0.5 + 0.5 = 1 expected drop. Therefore expected sources per site are `0.4R + 1`. These frequencies are explicit modelling assumptions, not existing generation guarantees.

Current authored treasure-package probabilities yield mean XP per real find of **1.50 / 2.35 / 3.45** for tiers 1–3 / 4–6 / 7+. These are repository design tables, not a claim about an external rulebook's probability distribution. The model uses party level as the table-level proxy; actual monster-level tables or deliberately authored hoards can differ.

## Simulation

[Audit script](../../scripts/audit-site-count.py): 10,000 deterministic-seed campaigns per scenario, source-by-source XP reset, one site-completion award per site, and exactly one award for each of the first two acts. Act boundaries are assumed to occur when their level budget is met; actual story timing is not simulated. All simulated sites achieve their story objective. No carousing, clever-play XP, unrelated boons, or final-boss rewards.

| Rooms per site | Expected loot sources before recovery | Mean completed sites with all loot recovered | Mean completed sites with 80% loot recovered | Sites sufficient in 90% of the 80%-recovery simulations |
| --- | ---: | ---: | ---: | ---: |
| 5 | 3 | 43.6 | 52.6 | 58 |
| 10 | 5 | 27.8 | 34.0 | 38 |
| 15 | 7 | 20.5 | 25.1 | 28 |
| 20 | 9 | 16.3 | 20.0 | 22 |

Recovery is an independent chance per source, representing skipped, inaccessible, or unclaimed treasure. Real missed areas are often correlated, so these percentiles are conditional estimates, not guarantees. Empty/false destinations and failed site objectives do not count as these completed, stocked sites. Random encounter frequency and additional expeditions could raise or lower earnings substantially.

## Earlier provisional budget — superseded pending chain-based recalculation

### Correction: recovered Shadowdark source and prior CoreDark implementation

The previous attempt to define site packages and suggest 5/10/15 rooms was incorrect. The actual prior work is in `D:/Code/Core_Dark`, not just the ASH repository. Do not treat the simulation's 15-room site or its per-package completion assumption as the established campaign unit.

The locally supplied Shadowdark Core v4.8, printed page 130 (extracted PDF page 134), uses a d6 site-size roll: 1–2 Small with 5d10; 3–5 Medium with 8d10; 6 Large with 12d10. Each die supplies a room and its feature result, so these are **5, 8, and 12 rooms**, not sums of the dice. One large, medium plus small, and three small therefore imply 12, 13, and 15 rooms respectively under that source procedure.

Prior CoreDark development has a further implemented adaptation:

- `src/rules/tables.ts:47`: the same d6 category probabilities.
- `src/rules/constants.ts:167`: Small `3+1d3` (4–6 rooms), Medium `6+1d3` (7–9), Large `9+1d5` (10–14).
- `src/rules/tables.ts:69`: weighted intended three-/four-site chain templates; random generation rerolls each constituent's category independently. Declared sizes are retained only for forced shapes.
- `src/generation/clusterGeneration.ts:102`: stop before accepting the next constituent if it would exceed the adventure budget. Do not reroll the whole chain.
- Current code caps an adventure at **29 rooms**, with at most four constituent sites. ADR 0008 originally said 30; the current constant is 29. ADR 0020 supersedes the earlier minimum-length and forced-chain rules.
- Every accepted constituent site has an objective; the terminal one has the final objective. A chain can crop below its intended site count.

Thus a physical site and a linked adventure are separate established units. The user's +1 per completed site must not be silently converted into +1 per entire linked adventure. Recalculate from the recovered size/chain distribution, actual separate objective treasure sources, and constituent completion awards before publishing a revised adventure count. The table below remains a sensitivity experiment for fixed room counts, not a validated estimate using this existing generator.

For a campaign around **15 meaningful rooms/areas per site**, plan approximately **25–26 completed sites before the final boss**, plus the final site. The 80%-recovery model averages **6.7 / 10.8 / 7.6** sites across the three preparation bands. A practical rounded outline is **7 / 11 / 8 pre-boss sites, then the finale**, or **27 sites played**. Keep more accessible optional sites available; reaching 28 completed pre-boss sites covered 90% of these simulations.

Do not confuse played sites with offered sites. A pool of roughly 30–35 compatible sites including side content can support choices, but mutually exclusive branches and accessibility must still be audited. Count whichever stocked path or side sites the party actually resolves. Early victory remains valid at a lower level.

At 15 rooms and 80% recovery, seven expected drops become 5.6 recovered drops, yielding approximately **9.4 / 14.16 / 20.32 XP per completed site**, including its 1 story XP, before advancement resets. This explains why a campaign in the mid-twenties can work when all sources are counted, while the current five-room default cannot provide the same progression at the same reward density.

The production app currently generates five-room site graphs and applies the general-monster 50% presence policy to ordinary inhabitants. Consequently, this recommendation requires both sufficient site size/source density and the clarified treasure policy. It must not be advertised as the current app's measured progression.
