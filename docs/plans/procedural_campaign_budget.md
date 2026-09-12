# Procedural campaigns: scope, sites, advancement, and replayability

Design specification, 2026-09-07. Replaces fixed starting quests as the intended generation approach; does not claim the current runtime implements this pipeline.

**Later XP clarification:** [Site count to reach level 9 before the final boss](site_count_xp_recheck.md) supersedes this document's 50% ordinary-site-monster assumption. Site monster rooms carry treasure; random encounters retain 50%. Its simulation counts all distinct room/objective drops and uses 360 minimum XP before the finale, rather than the 450-XP campaign-completion target below.

## What exists, and what is being specified

- **22 designed engine variants:** the 13 numbered engines, with engine 6 expanded into nine outer-power methods instead of one, plus Maruts as the distinct 7M variant. These are not 22 equally complete playable implementations.
- **4 campaign dossiers:** Domains of Dread, The Night Below, The Eternal Cycle, and The Stolen Dawn. These instantiate engines; do not count them as four extra engines.
- **3 registered campaign-plan adapters:** Domains of Dread, The Night Below, and The Eternal Cycle. World creation still uses the fixed Night Below opening rather than selecting among all these adapters.
- **9 outer-power encounter packs:** seven fixed locations each, **63 locations including nine havens**, hence 54 non-haven locations. These table-assisted packs are not nine full procedural campaigns.
- **New objective catalogue:** 22 engines × 3 acts × 4 parameterised objectives = **264 templates in 66 pools**. Read the [act lists](../oracles/12_procedural_objective_pools.md) or consume the [JSON catalogue](../data/procedural_objective_pools.json). This is starter authoring data, not an integrated generator.

## How many sites?

Use the existing **22–28 path-site envelope**, default **7 / 11 / 7 = 25**, as the initial capacity for a campaign graph. Havens, individual rooms, and clues are not additional adventure sites. A site can support several expeditions or objectives, but changing its quest title does not create another site or refresh its loot.

This is an initial planning envelope, not 25 mandatory stops, 25 guaranteed completions, or an XP sufficiency claim. Parallel solutions mean some sites will be skipped. Prepare site roles and dependencies first, then instantiate detailed sites when their leads become available. Retain the persistent commitments for any site already mentioned or visited.

| Act | Initial path-site capacity | Primary content | Proposed level budget |
| --- | ---: | --- | --- |
| I | 6–8; default 7 | Evidence, local rescues, verification, first countermeasures | Levels 1–3; support entry to 4 |
| II | 10–12; default 11 | Access, faction choices, logistical operations, remedy trials | Levels 4–6; support entry to 7 |
| III | 6–8; default 7 | Advanced preparations, sufficient remedies, their consequences | Levels 7–10; level 9 finale entry is acceptable |

Regional side sites are additional and demand-driven. There is no fixed lifetime total: an unrelated lead can bind to an existing ruin, an occupied settlement, or a new destination. Count only distinct physical sites. Never count a false claim as a full stocked dungeon, and never depend on an unrelated side quest to provide a mandatory path clue.

The live offer budget remains `max(2, d6) + 1`: two path opportunities guaranteed, extra rolled slots independently 50% side quests, plus one guaranteed unrelated lead. That is 3–7 current offers, **not** the campaign's total site count. Reuse valid offers and meaningful sites; do not spawn seven new dungeons whenever the tavern opens.

## XP: budget the route actually played

Use the repository's standard progression profile: advancing from level L costs 10L XP, XP resets on advancement, maximum level 10. Treasure/boon qualities are 0/1/3/10 XP; ordinary kills give no XP. Physical loot is shared separately; each eligible participant receives the source's full XP. ASH story defaults are +1 for a distinct resolved site and +3 for an act, once per stable source. Multiple sub-objectives at one site do not each create a fresh site-completion award.

| Act | Minimum advancement cost | Initial compatible opportunity target, before access and reset losses |
| --- | ---: | ---: |
| I | 60 XP | 75–90 XP |
| II | 150 XP | 188–225 XP |
| III | 240 XP | 300–360 XP |
| Total | **450 XP per PC** | **563–675 XP per PC** |

These figures reuse the existing [XP planning specification](path_sites_xp_and_zones.md). If an engine uses levels 4–7 / 8–10, redistribute its minimum to 60 / 220 / 170 instead. Story events govern act changes; levels are content-budget envelopes, not forced locks.

The uncomfortable arithmetic matters: completing 25 sites plus three acts supplies only **34 story XP**. At exact thresholds the other **416 XP** must come from meaningful treasure and boons, before reset losses. If those same 25 sites carried the lower headroom target, **529 XP** would need to come from treasure/boons. That is a substantial reward density, particularly in late sites. Four routine rooms and a purse cannot honestly support it.

Therefore do not certify a 25-site campaign from a nominal `expectedTreasureXp` field. Some current adapters hard-code that summary. Allocate actual unique sources, then simulate plausible routes that skip the alternative remedy, miss caches, avoid combats, and decline carousing. Apply the 50% group-treasure chance, access likelihood, mutually exclusive rewards, participation, and reset losses. Track finale-entry XP separately from victory rewards. A shorter successful campaign is still a valid victory; it need not reach level 10.

When a normal intended route is short of advancement opportunities, add justified preparation expeditions or larger sites in uncommitted content. Do not increase every clue's XP, regenerate claimed caches, or silently boost story awards. If achieving the desired pace requires implausible treasure density, the profile needs an explicit economy/advancement redesign; objective generation alone cannot solve that mismatch.

## Loot: allocate things, not an XP number

Each real source specifies an owner, origin, coins/items/boon, XP quality, access conditions, bulk, and stable claim ID. Use the existing treasure tables and rules profile when producing concrete contents. A reward promise is not yet earned loot. A rescued informant's ordinary directions are not automatically a Fabulous secret.

| Source | Procedure |
| --- | --- |
| General monster group | One persisted 50% treasure-presence roll per group, including ordinary inhabitants. Never per creature or per visit. |
| Established cache or quest payment | Generate once from a justified owner/source; its existence is not rerolled with every room visit. Recovery or fulfilment is still necessary. |
| Boss hoard | Use the selected hoard policy once; its guards and access matter. Defeating the boss adds no separate kill XP. |
| Information, oath, or boon | Only assign reward quality when its concrete lasting value warrants it. Do not award the same secret again through a second clue source. |
| False or emptied regional destination | No promised cache, encounter reward, or automatic quest-success XP. Ordinary journey events remain possible. |

For an economy check using the project's 10 gp × party-level guideline, suppose a site has three general groups and each successful treasure roll averages 10L gp. Its expected carried coins are `3 × 0.5 × 10L = 15L gp` for the whole party, before successful access. At illustrative average levels 2, 5, and 8, that is 30 / 75 / 120 gp per site. Across 7 / 11 / 7 such sites it is **1,875 gp for the group**, before caches, payments, items, expenditures, and lost access. This is a conditional example, not a new guaranteed payout table, and gold does not convert directly into XP.

## Binding a template into an actual quest

An objective template is a semantic operation, not a sentence to fill with random names. Before publishing a lead, bind and save:

1. **Need:** which unresolved world fact or remedy prerequisite it can change, and whether it is currently eligible.
2. **Entities:** actual subject, affected community, target, source, and resource from the campaign. A slot such as `{anchor_network}` refers to an established network; it is not an arbitrary list of newly invented anchors.
3. **Place:** a geographically feasible site family and persistent map location. Its terrain, access, and inhabitants must support the objective.
4. **Opposition:** someone with a goal, capability, reason to be present, and at least one response to a nonviolent approach. Not every site needs monsters.
5. **Evidence:** two independently reachable sources for an essential inference; what each source actually establishes, and which next choices it reveals.
6. **Resolution:** observable success, alternate acceptable outcomes, failure consequences, and their exact state changes. Fetching information completes when the fact is obtained; a separate delivery requirement needs a fictional reason.
7. **Rewards:** unique obtainable sources with a checked economy/progression contribution. A site does not gain extra awards merely because two quest templates point there.
8. **Presentation:** a source who could know the request, visible stakes, directions, preparations, and discovery updates. Conceal path relevance and unearned solution knowledge.

Example: “Trace the destination of {missing_person}'s transport” can bind to a ferryman missing from an estuary village, charcoal workers taken from a forest camp, or a courier diverted into a desert aqueduct. Their sites have different access, occupants, schedules, and evidence. The common completion fact is a verified destination. Randomly renaming Jonathan Vane while retaining the same pumping station, manifest, and route is not sufficient variation.

## Replayability rules

- Select an antagonist variant and its real operation/dependency graph before choosing objectives. Two variants must change decisions, dependencies, prices, or remedies, not just enemy portraits.
- Draw from the act pool with eligibility filters and weights. Prefer unmet needs and underused objective families. Sample without replacement within an act until eligible choices are exhausted; repeat only for a different established target or changed state.
- Vary site family, geography, resource dependency, faction ownership, NPC motive, timing, evidence medium, and viable approach. Generate only compatible combinations, then check reachability and both remedies.
- Commit a campaign seed and separate stable streams for path structure, sites, NPCs, clues, opposition, treasure, and unrelated-lead truth. UI reads and unrelated random events cannot alter an existing quest.
- Save the selected template and bindings. Reopening the game yields the same objective. A new seed can produce a materially different campaign; a later consequence changes the saved world rather than rerolling it.
- Let outcomes remove, change, or create eligible objectives. A freed captive can testify; a dead one cannot. A severed supply line cannot remain the next active shipment unless a new route is actually established.
- Maintain ordinary regional life. Side quests draw from regional concerns and need no hidden cosmic explanation.
- Measure variety in completed play: repeated objective families, site structures, dependency graphs, source combinations, and endings. Do not advertise a huge Cartesian-product count as that many meaningful adventures.

## Delivery boundary

The objective catalogue and this budget are authored inputs. Runtime work still needs a validated binding schema, seeded selection, per-path state predicates, persistent opportunity storage, map/site construction, source-aware clues, reward allocation, and branch audits. The four templates per act are enough to define different kinds of work and begin implementation; expand pools based on repeated play traces rather than treating 264 entries as proof of replayability.

The Stolen Dawn retains the user's explicit geography: town and nearby territory, wilderness, underground across three acts, using only two Cursed Scroll profiles. Shared surface terrain does not require shared objectives or reset surface consequences.
