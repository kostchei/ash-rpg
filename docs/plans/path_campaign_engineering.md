# Engineering plan: playable three-act adventure paths

Status: implementation backlog, 2026-09-06. No runtime completion is claimed. Implements [XP mathematics, sites, and act zones](path_sites_xp_and_zones.md), including the owner's clarification that **general monsters have a 50% chance of real treasure per encounter group**. Level 9 at the final boss is acceptable; rewards through campaign success can bring characters to level 10. Each act has a different persistent zone, optionally randomly selected.

Authoring update, 2026-09-07: [The Stolen Dawn](../adventure_paths/04_the_stolen_dawn.md) adds the Sustained Catastrophe engine. Its three acts are town/nearby, wilderness, and underground, using only two Cursed Scroll profiles (3 → 3 → 5); territory instance IDs are not source-profile IDs. Future implementation must preserve a continuous surface region across the first two acts. All paths now require at least two independently sufficient success conditions. Audit existing adapters; do not claim compliance from alternative preparations for one mandatory ending. The new dossier is not yet runtime eligible.

The approved [outer-power player mechanics](../oracles/09_outer_power_player_mechanics.md) now define the authored procedures for all nine 6A–6I engines: character benefits and prices, expedition resources, social authority, monster objectives, and two independent remedies each. Implement those distinct records in future adapters. Nyarlathotep no longer uses a predetermined script; Tsathoggua has actual discoverable reserves and finite responses rather than a sealed multiplier; Ithaqua allows prepared winter expeditions; Azathoth captures defined device emissions as well as spell effects. Paper procedures are complete design inputs, not runtime support or playtest certification.

## 1. Required behavior and design decisions

- One general monster encounter group makes one 50% treasure-presence roll, independent of creature count, species count, deaths, combat rounds, or players. Apply this to ordinary site inhabitants as well as wandering groups. This broader scope is an ASH requirement; the cited Shadowdark guidance specifically identifies wandering monsters.
- Roll once when the group is first persisted, using a server seed derived from its stable group ID. Save negative results too. A defeated, avoided, negotiated-with, split, reinforced, or revisited group retains its original roll. Reinforcements belonging to that group add no roll; a genuinely independent group needs a new persistent identity and fictional origin.
- A successful presence roll selects a substantive treasure package from a versioned eligible pool. Define `real treasure` for this implementation as a Normal-or-better find (at least 1 XP), with a recorded quality rationale. Incidental equipment, junk, and Poor finds may exist after failure but contribute zero treasure XP. If Core table sampling includes Poor entries, build and disclose a conditional real-treasure pool instead of applying a second hidden failure chance. Review the resulting coin/magic distribution against the economy before release.
- An authored cache, reward, quest item, or boss hoard has its own explicit presence policy. General groups default to 50%; a boss does not acquire a guaranteed hoard simply by being called a boss. A declared hoard can be guaranteed and guarded by a group without making the hoard subject to that group's carried-treasure roll. Store one source for shared treasure so room and encounter claims cannot duplicate it.
- Presence, discovery, access, securing, allocation, and XP award are separate states. Combat victory does not generate new treasure or automatically secure it. Stealth, bargaining, and other valid access can earn the same treasure XP.
- XP is earned from actual secured finds/boons and completed story sources, with full value for each eligible participant. No XP is awarded for an expected drop, a kill, or a negative roll. Story defaults remain proposed +1 per distinct site objective and +3 per completed act, configurable and labeled ASH policy.

## 2. Probability must be part of the budget

For encounter group g, let B_g be its presence result (Bernoulli p_g = 0.5 for general groups), T_g its XP conditional on real treasure, and A_g the indicator that the party actually gains access and earns it. Its contribution is X_g = B_g × T_g × A_g. Use E[X_g] = p_g × E[T_g × A_g | B_g = 1]. Only when access is independent of treasure quality may this simplify to p_g × mean(T_g) × access probability.

For n independent groups, all with a fixed 3 XP package and all accessed, E[X] = 1.5n and Var(X) = 2.25n. Twenty groups supply 30 expected XP, not the 60 XP available if every roll succeeds. Standard deviation is about 6.71 XP, and an all-empty result is possible. Ten creatures in one encounter still yield one roll and 1.5 expected XP in this example. Ten individual rolls would instead yield 15 expected XP and a 99.90% chance of at least one drop: the wrong model.

If a generated monster-room category occurs with probability r, it contributes r × 0.5 × conditional treasure XP before discovery/access losses. Do not apply r again to a room already generated as a monster room. Likewise, once a saved treasure roll is known, audit its actual result rather than multiplying it by 0.5 again.

Before generation, calculate distributions across presence, quality, room features, routes, access, and award ordering. After generation, distinguish saved actual opportunities from unresolved future randomness. Campaign earned XP = secured fixed treasure/boons + secured group drops + completed story awards + actual optional carousing. Apply progression/reset losses event by event. Gold, item slots, consumable use, and carousing affordability need a parallel economy simulation; XP totals alone cannot establish loot balance.

The previous 25-site illustration needs 416 treasure/boon XP plus 34 story XP before reset losses. For illustration, if 120 of the 416 was mistakenly budgeted as guaranteed group loot, applying 50% presence reduces expected treasure/boon XP to 296 + 60 = 356, and total expected XP to 390. The shortfall is 60 XP even before misses or reset losses. General rule: expected shortfall from treating nominal group treasure G as guaranteed is (1 − p)G. Do not respond by silently doubling loot values or retrying empty rolls.

Use authored attainable rewards and optional preparation sites to support progression despite variance. Do not promise that every choice or seed guarantees a level. Proposed release criterion: in a published standard-exploration, no-carousing, no-casualty policy, at least 95% of simulation runs reach level 9 by finale entry and level 10 through success. Treat 95% as a tunable engineering target, not a Shadowdark rule or owner-selected guarantee. Also report 5th/50th/95th percentiles, under-level runs, and low-drop/missed-cache stress cases. Failure directs changes to authored opportunity coverage and site count; preserve p = 0.5. Do not select favorable loot seeds or condition campaign acceptance on high drop rolls.

## 3. Current code and integration targets

Recheck these functions before implementing; line numbers move. Current repository uses React/Vite, Socket.IO, SQLite, Zod, and Vitest.

| Existing area | Observed gap | Planned change |
| --- | --- | --- |
| `src/server/rules.ts`: `generateTreasureReward` | Coins and a narrow consumable roll; no quality or presence policy | Replace callers with typed treasure service; retain compatibility only for legacy records |
| `app.ts`: `combat:end` | Non-room victory automatically generates a tier-1 reward | Resolve combat and reference the group's already-persisted source; use access/secure workflow |
| `app.ts`: `dungeon:record_outcome` | `treasureFound` can create fresh treasure | Reveal an existing source/result; a separate privileged correction records intentional additions |
| `app.ts`: site/room generation, `dungeon:claim_treasure`, `treasure:generate` | Several independent generation paths and mutable loot copies | All use canonical source IDs and the same presence/classification service |
| `app.ts`: `treasure:allocate` | Reward items use array indices; coin splitting floors values | Stable item IDs and integer copper accounting with retained remainder; allocation does not re-award XP |
| `app.ts`: `session:award_xp`, `character:level_up`, tavern carousing | Optional source IDs, missing XP eligibility/reset, fixed +10 carousing | Server award service, ordered progression, pending choices, explicit rules profile and actual carousing procedure |
| `src/shared/types.ts`: `Encounter`, `DungeonRoomNode`, `RewardRecord`, `AdventurePathRecord` | No group presence receipt or general three-act contract | Add typed references and versioned records; preserve legacy projections |
| `src/server/database.ts` | Useful rewards, XP awards, graph, and action receipts already exist | Add constrained persistence and migration; reuse transaction boundaries |
| `src/server/generators/prng.ts` | Provides `deriveStream` | Separate stable streams for zone selection, group presence, package contents, and layout |
| `generators/mind-below.ts`, `procedural-region.ts`, `hex-map.ts` | Existing path and world foundations | Implement adapters, distinct zone instances, travel links, and constrained site placement |
| `src/client/App.tsx`, `src/shared/mutations.ts` | Large UI and limited receipted-action registry | Add data-driven objectives/rewards and receipt coverage while extracting relevant panels |

## 4. Modules and contracts to introduce

Names below are proposed files, not existing APIs. Keep deterministic functions independent from Socket.IO and database access.

| Proposed module | Responsibilities and primary contract |
| --- | --- |
| `src/shared/path-contracts.ts` | Zod-backed definitions for acts, conditions, site templates, adapter capabilities, reward policies, public DTOs |
| `src/server/rewards/treasure.ts` | `resolveGroupTreasure(group, policy, rng)` returns persisted none/real result, roll, table basis, package and quality |
| `src/server/rewards/service.ts` | `secureSource`, `resolveStoryAward`, source uniqueness, participant capture, access checks, allocation references |
| `src/server/rewards/progression.ts` | Pure `applyXpEvent` and threshold/reset/cap logic; pending advancement and deterministic award queue |
| `src/server/paths/registry.ts` | Versioned adapter registry and full-campaign eligibility per variant |
| `src/server/paths/zone-plan.ts` | `assignActZones` and route feasibility; pairwise distinct IDs, fixed/random/mixed choices |
| `src/server/paths/campaign-plan.ts` | `buildCampaignPlan`: objectives, conditions, site roles, rewards, optional opportunities |
| `src/server/paths/site-plan.ts` | `materializeSite`: compatible saved layout, inhabitants/groups, objective and clue placement |
| `src/server/paths/outcomes.ts` | `resolveOutcome`: atomic deed, path-state, story XP, leads, and transition effects |
| `src/server/paths/adapters/*.ts` | Engine-specific state and authored conditions; use data templates where possible |
| `src/server/paths/audit.ts` | Deterministic graph checks and playable-route reward audit |
| `scripts/audit-path-campaigns.ts` | Seeded simulation runner using production generation and progression functions; machine-readable and Markdown reports |
| `data/paths/*`, `data/treasure/*` | Versioned authored templates, source references, real-treasure pools, quality rationale, rarity and economy constraints |

An adapter provides `createPlan`, `eligibleZoneTags`, `siteTemplates`, `evaluateOutcome`, `evaluateTransition`, `evaluateEnding`, and path-specific background triggers. Results use stable entity references and serializable effects. No arbitrary executable expressions in content JSON. Validate the entire content package at startup/build time, and fail incomplete variants out of full-campaign random selection with a diagnostic.

## 5. Persistence and migration

Add versioned migrations rather than recreating campaign state. Candidate relational tables:

- `campaign_acts`: campaign/path instance, act number, zone instance, prerequisites, transition reference, status, content version. Unique `(path_instance_id, act_number)` and `(path_instance_id, zone_id)`.
- `path_situations` and `path_outcomes`: stable site/entity links, conditions/effects, resolution history. Outcome uniqueness prevents repeat story awards even with different request IDs.
- `encounter_groups`: campaign/group ID, original encounter/site provenance, members, reward policy and optional guarding-source link. Distinguish persistent narrative group from transient combat session ID.
- `treasure_rolls`: unique `(campaign_id, group_id, policy_slot)`, policy/table version, keyed seed, exact roll, presence outcome, source ID or null. Negative rows are durable facts, not missing data.
- `reward_sources`: source kind, origin, eligibility/access state, quality/XP, canonical contents, exclusion group, optional group reference. Multiple source links point to one shared hoard.
- `xp_award_recipients`: source/event and character uniqueness, earned sequence, amount, before/after XP and level, reset loss, applied/pending status. Extend existing `xp_awards` compatibly instead of duplicating awards between stores.

Store a versioned plan snapshot and content digest on the path instance. Existing `rewards` can remain the allocation representation linked to a canonical source. Use foreign keys and campaign-scoped lookups; do not trust supplied foreign IDs.

Backfill known claimed rewards as legacy sources with original contents and award history preserved. Do not retroactively roll 50% against existing loot, remove treasure, or infer new XP from old claims. Historical awards with unknown recipients/provenance stay marked legacy. Existing resolved groups without treasure evidence are `legacy_unknown`, not fresh chances. Apply the new policy to newly generated groups; migrating older unexplored content must avoid rerolling committed state. Unknown prior act zones do not justify moving explored sites. Provide dry-run migration reports and transactional migration tests on fixture database copies.

## 6. Runtime mutation flow

1. Group creation allocates a stable identity; presence and conditional package are generated and persisted in the same transaction as that group. Lazy packages may wait until their table basis is known, but presence remains fixed.
2. Discovery reads the saved result. Empty results produce ordinary fictional information; future rolls, exact odds, and unseen packages stay out of shared projections. Public messages must not imply loot after every victory.
3. Caller records an actual access method through existing exploration actions. Server validates location, source existence, relevant resolved state, and authority. A table ruling may establish access; it may not silently replace an empty roll.
4. Securing a source creates the allocation record and XP events atomically, capturing actual active participants at that time. Treasure contents and allocations retain integer currency and item identities. Prevent a room claim and encounter claim from awarding the same hoard twice.
5. Apply ordered XP events. If a level-up needs player choices, reserve that advancement and queue later events until it completes; never let UI delay turn into extra reset loss or a free second level-up. HP/talent rolls and choice submission replay their saved results. Allow other table activity to continue.
6. Site outcomes execute adapter effects and +1 story awards once when qualifying conditions resolve. An act transition similarly records +3 once and reveals earned travel information. The same transaction records receipt, source state, events, and path effects before broadcasting.

Expose operations through existing socket conventions with `actionId` and expected revision. Add `combat:end`, source discovery/secure, privileged treasure corrections, and level-up/choice resolution to the mutation receipt contract where missing. `treasure:generate` becomes a deliberate privileged source-creation/correction workflow with a required reason; it must not serve as a reroll button. Ordinary callers cannot choose XP amounts, quality, group count, or drop rates in payloads. Manual GM XP remains an explicit audited correction capability.

## 7. Delivery packages

Implement in this order, each package including persisted state, server behavior, player-facing interaction, and acceptance evidence. Do not claim completion based only on pure generator functions.

| Package | Dependencies | Work and acceptance |
| --- | --- | --- |
| P0: Rules/content contract | None | Verify Core treasure/carousing sources; pin rules versions; encode 50% group policy and real-treasure semantics; classify legacy behavior. Content validation rejects missing levels, invalid weights, and unclassified awards. Source availability can block specific table implementation, not independent infrastructure work. |
| P1: Persistence and reward/progression service | P0 contract | Migrations, stable sources/groups, negative receipts, participant awards, threshold/reset/cap, pending choices. Demonstrate a secured find grants full XP once to participants, with valid leveling and recoverable choices after reload. |
| P2: Connect every loot entry point | P1 | Replace automatic combat loot and discovery-time invention; integrate ordinary dungeon and wilderness groups, explicit caches/hoards, access, allocation, and UI. One empty group remains empty under all actions and reconnects. A group of 1 and a group of 12 use the same single-roll policy. |
| P3: Three-zone campaign skeleton | P0 | Seeded distinct zone assignment, valid routes and environmental constraints, concealed future acts, adapter registry, versioned persistence. Test explicit/random/mixed modes and insufficient-candidate fallback without reusing a zone. |
| P4: Semantic sites and story outcomes | P1–P3 | Path objective/dependency graph, feasible layout/geomorphs, separately placed objectives, independent clue routes, persistent populations/reward sources, generic outcome UI, site/act awards. A negotiated site resolution updates world and XP exactly once. |
| P5: Complete Mind Below | P4 | Author all three acts and environments; prisoner routes, controlled minds, descent/aquatic access, finale alternatives. Link starting leads to actual sites and earned inter-zone travel. Rehearse an uninterrupted three-act persisted campaign. |
| P6: Probability and economy audit | P2–P5 | Shared production-code simulation, branch/exclusion handling, random features/drops/quality/access, XP resets, gold/slots and no-carousing baseline. Publish percentile/failure report; tune authored coverage against 50% drops and verify level-9 finale entry and level-10 completion opportunities. Build basic audit harness alongside P1; full certification waits for P5. |
| P7: Prove adapter reuse | P5–P6 | Complete Domains of Dread and Vanishing Middle; three zones inside the domain, domain boundary preservation, conditional victory and noncombat rewards. No path-name UI special cases. |
| P8: All engine/variant coverage | P7 | Implement every remaining row in the design specification with individual authored data, transitions, outcomes, and audit reports. Registry advertises only variants passing the same contract, persistence, and sufficiency gates. |

P8 batches: assembly/preparation (Titans, Yog-Sothoth, Apocalypse Cult, Slumbering Catastrophe); authority/services (Bane, Angels, Maruts, Compact, displacement); spreading networks (Tharizdun, Shub-Niggurath, Hastur, Witch King); hidden/calendar processes (Cthulhu, Nyarlathotep, Tsathoggua, Ithaqua, Azathoth). Preserve distinct triggers in every batch. Test authored antagonist variants individually; a single successful variant does not certify all patrons and methods.

## 8. Verification plan

Extend existing `tests/leveling.test.ts`, `rules.test.ts`, `database.test.ts`, `multiplayer-mutations.test.ts`, `room-features.test.ts`, `expedition-integrity.test.ts`, `mind-below.test.ts`, and `zones.test.ts` where appropriate. Add focused files for group treasure, path adapters, and campaign audits.

Required behavioral cases:

- Inject each die face into a d6 presence policy (1–3 real, 4–6 none): exactly three success faces. Test conditional treasure separately; successful presence cannot yield Poor XP under the adopted real-treasure definition.
- One group with 1, 4, and 12 members has one roll and one source. Splitting its combat or rejoining fleeing members preserves the roll. Independent groups in one room each have their own roll; a shared hoard remains one source.
- Failed presence survives search, victory, negotiation, repeat requests with new action IDs, restart, and character roster changes. Replaying successful presence preserves package and quality.
- Room source plus combat source cannot double-claim; concurrent secure requests yield one award. Roll back a simulated failure between securing and awarding without leaving half-applied state.
- A fixed cache is available under its own policy after a group's negative carried-treasure roll; a failed group offers no generated valuables. Acquiring a quest clue does not require treasure success.
- Loot XP recipients match participation, regardless of who gets the physical item. Reserve swap before allocation cannot change recipients. Currency splitting preserves copper and leftovers; fractional gold and gear-slot limits are not discarded.
- At level 1 with 9 XP, a 3 XP source advances to level 2 and zero XP with 2 lost; a subsequent 1 XP source leaves level 2 with 1 XP. Pending choices and reload produce that same result. Reject premature/repeated level-ups and standard-profile advancement past 10.
- Site and act completion through alternative valid outcomes award once. Finale entry can be level 9; post-victory XP cannot improve entry stats retroactively.
- Every adapter has three distinct zones, feasible prerequisites/routes, reachable objectives and independent clue routes, playable branches, stable seed replay, and spoiler-safe public projection.

Fast CI uses a committed representative seed corpus for every supported variant and roster 1–6; exact deterministic tests establish 50% behavior rather than flaky sample-frequency assertions. A broader release audit starts with at least 1,000 seeds per variant and documented exploration policy, then reports sample size, uncertainty, and any confidence interval crossing the proposed success target. Share group/treasure streams across roster comparisons where appropriate; party size affects resources/difficulty, not XP splitting. Include a fixture of all negative group rolls to expose dependence on random treasure, without claiming that this extreme must guarantee advancement.

Audit policies must specify site/branch choice, fraction and method of searching, access success assumptions, retreat, and ending timing. They are progression/opportunity models, not proofs of combat survivability. Use table rehearsals for hazard fairness, pacing, threat, map readability, and player comprehension. Never treat mutually exclusive outcomes as simultaneously collectible or obtain infinite XP by spawning arbitrary encounters in a simulation.

Run targeted tests for each package, then the full `npm test`, client TypeScript checking with the repository's client tsconfig, and `npm run build` before merging a functional slice. For this documentation-only change, check Markdown links, arithmetic, navigation, and `git diff --check`; running the game suite would not validate an unimplemented plan.

## 9. Completion evidence and operational limits

Deliver migrated fixture results, supported variant registry, generated sample campaign records, per-variant audit reports, multiplayer replay tests, and representative table walkthrough notes. The release gate is a user entering sites and earning correctly classified treasure/story XP through a saved three-zone campaign, including empty encounters and alternate resolutions. Preserve existing campaign data and label unsupported content honestly.

Do not change the 50% group rate to satisfy the XP report. If a route falls short, add justified future preparation opportunities or improve authored reward coverage, report the deficit, and recalibrate site pacing. Avoid retroactive loot, forced combat grinding, and unbounded magical wealth. Story amounts, reserve catch-up, replacement entry level, and the statistical target are explicit profile settings/proposals; the general-group probability and distinct act zones are settled requirements.
