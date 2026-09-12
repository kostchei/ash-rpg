# Adventure paths: XP mathematics, distinct act zones, and site generation

Status: planning specification, 2026-09-06. This document records the requested campaign mathematics and implementation plan; it does not certify runtime support. Each of the three acts must have a different zone. Zone selection may be random. Story completion awards are an explicit ASH addition to Shadowdark's treasure and boon XP guidance; their amounts below are proposed defaults.

The [functional-code engineering plan](path_campaign_engineering.md) defines modules, migrations, socket integration, delivery packages, and probability-aware acceptance tests. Owner clarification: general monsters receive one **50% real-treasure chance per encounter group**, including ordinary site inhabitants. Persist failed rolls; never roll per creature. This ASH scope extends the wandering-monster guidance below. Random drop probability and actual access must reduce projected XP; nominal treasure is not guaranteed earned XP.

## 1. Rules baseline and corrections

Shadowdark Core, pp. 39, 117, and 269, provides the advancement, XP-award, and treasure procedures. The freely available [publisher's Quickstart](https://www.thearcanelibrary.com/products/shadowdark-rpg-quickstart-set-pdf) includes the basic advancement and treasure guidance; the [official overview](https://www.thearcanelibrary.com/blogs/shadowdark-blog/all-about-shadowdark-rpg) confirms treasure and carousing as advancement sources. Verify the licensed Core tables before implementing higher-level treasure and carousing. Current ASH code and secondary online summaries are not rules authority.

- Advancing from level L requires L × 10 XP. On advancement XP resets to zero. Do not silently carry excess into the next level.
- Treasure quality awards are Poor 0, Normal 1, Fabulous 3, Legendary 10 XP. Value and significance require judgment; gold is not converted directly into XP. A hoard or bag is a defined find, not one award per coin.
- Each participating PC receives the full treasure XP; do not divide XP by party size. Physical gold and items are allocated separately.
- Boons, oaths, secrets, blessings, and meaningful trophies can have XP value. The guidance also allows 1 XP for ingenious actions. Ordinary kills have no automatic XP award.
- The gold guideline is about 10 gp × average party level per encounter for the group, with broad alternatives of 20 gp at levels 1–3, 50 gp at 4–6, and 80 gp at 7–9. Use it as an economy check across adventures, not a promise of treasure after every encounter.
- Guarded treasure tables follow the guarding monster's level; unguarded treasure follows the discovering character's level. Wandering monsters have only a 50% chance of carrying treasure. Persist generated contents and the basis for the chosen table.
- Treasure usually occupies one gear slot; coins occupy one slot per 100. Exceptional bulk needs explicit slots and transport. Magic-item sale value and availability are distinct from XP quality.
- Carousing consumes wealth and can generate XP and consequences. It is optional; a no-carousing campaign must remain viable. Do not model it as the current runtime's automatic +10 XP.

450 XP is the minimum advancement cost to reach level 10 from level 1 at zero XP, not a guarantee that an arbitrary batch of 450 awards produces level 10. Reset losses and award timing matter. Standard Shadowdark ends at level 10; ASH's level-36 extension is a separate rules profile. Excess content is for choice and missed opportunities, not an assumption of level 11.

## 2. Exact advancement mathematics

| Transition | XP required at current level | Minimum lifetime XP to reach destination |
| --- | ---: | ---: |
| 1 → 2 | 10 | 10 |
| 2 → 3 | 20 | 30 |
| 3 → 4 | 30 | 60 |
| 4 → 5 | 40 | 100 |
| 5 → 6 | 50 | 150 |
| 6 → 7 | 60 | 210 |
| 7 → 8 | 70 | 280 |
| 8 → 9 | 80 | 360 |
| 9 → 10 | 90 | 450 |

Minimum lifetime cost to enter level N = 5N(N − 1). Starting at level L with x current XP, the minimum remaining cost to enter level N is 5[N(N − 1) − L(L − 1)] − x, provided x is below the current threshold. Process any already-earned advancement first.

Proposed award timing: process earned sources individually in their recorded order, prompt/apply advancement when eligible, and reset XP before later awards. At level 1 with 9 XP, a 3 XP award reaches 12, advances to level 2, and resets to zero: 2 XP are lost. Simulations must use this procedure rather than only sum rewards. A table choosing session-end batching needs its own simulation profile.

| Act | Preparation envelope | XP to next planned boundary | Cumulative minimum |
| --- | --- | ---: | ---: |
| I | Play levels 1–3; prepare entry to 4 | 10 + 20 + 30 = 60 | 60 |
| II | Play levels 4–6; prepare entry to 7 | 40 + 50 + 60 = 150 | 210 |
| III | Play levels 7–10 | 70 + 80 + 90 = 240 | 450 |

These are budgeting envelopes, not story locks. Existing engines using a 4–7 / 8–10 split can instead budget 60 / 220 / 170, still totaling 450. Their authored transition conditions govern play. **Entering the final boss encounter at level 9 is explicitly acceptable.** Budget opportunities to reach level 10 through campaign success, including the finale's earned treasure, boons, site completion, and act completion. Level-10 play before the finale is optional. Early success remains valid.

Entering level 9 requires at least 360 lifetime XP. A level-9 character with x current XP needs 90 − x more to reach level 10. Thus arriving at level 9 with 70 XP leaves 20 XP to earn: an illustrative finale can supply 16 treasure/boon XP (one Legendary and two Fabulous finds), +1 site completion, and +3 act completion. Arriving at level 9 with zero XP leaves 90 XP; the generator must not assume a small boss reward covers that gap or inflate the hoard automatically. Report the remaining cost and provide appropriate preparation opportunities. Defeating the boss itself earns no automatic kill XP.

## 3. Story awards and an illustrative allocation

Proposed ASH defaults: +1 XP per participating PC for resolving a distinct site objective, and +3 XP for completing an act. Both apply when separate conditions are fulfilled. A site's resolution can be rescue, negotiation, investigation, sabotage, or another authored outcome. Clearing all rooms or killing all inhabitants is unnecessary. A failed objective does not automatically receive its success award; valid alternative resolutions must be specified.

Each objective and act award has a stable source ID, qualifying conditions, recipients, and an award record. Multiple approaches to the same objective share one completion award. Revisit, reconnect, item transfer, or reopening an act never re-awards it. Treasure/boon XP and story XP are separately labeled: returning a relic may intentionally earn both, but the relic's boon and treasure value cannot be counted twice as two finds. Clever-play rulings need table confirmation and a reason, not automatic inference from a successful check.

The existing engine guide proposes 6–8 / 10–12 / 6–8 sites: 22–28 total. These are initial content estimates, subject to reward and pacing audits. The earlier conversation's 10–12 total-site example was illustrative, not an adequate campaign specification.

An example with 7 / 11 / 7 completed sites, one +3 act award each, and no carousing:

| Act | Sites | Site + act story XP | Remaining treasure/boon XP at exact thresholds | Total |
| --- | ---: | ---: | ---: | ---: |
| I | 7 | 7 + 3 = 10 | 50 | 60 |
| II | 11 | 11 + 3 = 14 | 136 | 150 |
| III | 7 | 7 + 3 = 10 | 230 | 240 |
| Campaign | 25 | 34 | 416 | 450 |

Story awards provide 34/450 = 7.56% here. Across 22–28 completed sites they provide 31–37 XP, or 6.89–8.22%. These figures assume completion of all listed sites, so branch simulation must reduce them when sites are skipped. The final act's +3 occurs after victory and can count toward reaching level 10 at campaign completion; it cannot count toward the party's entry level or combat capabilities.

Illustrative arithmetic only: 416 treasure/boon XP could comprise 116 Normal, 80 Fabulous, and 6 Legendary awards (116 + 240 + 60). This is not an instruction to scatter 80 magic swords or 6 legendary artifacts. It exposes the substantial content needed: higher-act sites may be large, revisited across expeditions, and include multiple meaningful finds and nonmaterial boons. If those awards cannot be justified without repetitive treasure or inflation, increase sites/expeditions or revisit the proposed story policy explicitly.

Initial headroom target is 25–50% above each minimum: 75–90 / 188–225 / 300–360 XP of compatible attainable opportunities, totaling 563–675 after rounding act targets. Headroom is a starting hypothesis, not proof. Never sum mutually exclusive faction payouts. Distinguish placed XP, reachable XP, expected earned XP, awarded XP, reset losses, and effective advancement. Analyze all of these per character; reserves and replacements cannot inherit participation automatically.

## 4. Three distinct zones, optionally random

Required invariant: act1.zoneId, act2.zoneId, and act3.zoneId are pairwise distinct persistent zone instances. A new name for the same zone does not qualify. Different biomes are a desirable default, but two distinct zones may share a biome; the user's requirement is different zones. Each needs its own geography, local identity, sites, hazards, and contacts.

1. Choose the path, antagonist variant, and each act's environmental requirements.
2. Use the party-informed starting region for Act I when compatible; preserve established geography.
3. Select Act II and III from eligible unused zones with a saved seeded roll. Filter for path requirements, feasible travel, terrain, and prerequisites before weighting for variety. Support explicit selection and a mixed mode that fills unchosen acts randomly.
4. If no valid assignment remains, backtrack uncommitted selections or generate a compatible new zone. Never silently reuse a zone. An established campaign needing new geography gets an explicit migration/extension plan.
5. Save the selected zone IDs, seed, eligibility/selection reasons, and transition routes. Use stable generation keys so unrelated later rolls cannot alter assignments.
6. Provide the fictional reason and physical means to reach the next zone: testimony, trade route, pass, descent, vessel, or earned portal. Required water breathing, transport, or access must have attainable preparations and alternative sources.

Acts have different primary zones; backtracking and cross-zone consequences remain legal. A domain-bound path uses three regions within the same enclosed domain, preserving its boundary loops. A regional catastrophe may have preparation and evidence zones before the final zone; do not relocate an already-established sleeper just to satisfy act geography. Secret path selection must also conceal future zone assignments and final destinations until discovered.

**Cursed Scroll profiles are distinct from territory instances.** The Stolen Dawn explicitly uses only two Cursed Scroll zones across three acts: town and nearby territory → outer wilderness → underground, with profile assignment **Isles of Andrik → Isles of Andrik → Morzomotha & Karst Deeps** (Scrolls 3 → 3 → 5). Its two surface territories share one continuous region and persisted consequences. Do not require three different source profiles, rename a single territory to fake distinct geography, or regenerate the surface between acts.

## 5. How every path produces sites

Build a shared generation pipeline driven by authored path adapters:

**Path variant and state → three-zone assignment → act objectives and dependencies → situations and site roles → reward allocation → connected site layouts → inhabitants, clues, hazards, and loot → validation → saved campaign.**

Each adapter must provide three act specifications, eligible environments, its own progress/neglect rules, named entities and resources, player and antagonist victory conditions, site templates, clue alternatives, outcome effects, transitions, and endings. Preserve each engine's distinct records; shared site generation must not replace these with a universal clock.

Each path must provide at least two independently sufficient player success conditions with actual executable outcomes, not merely different preparations for one mandatory boss kill. Audit each normal branch for access, clues, rewards, and completion; test that either can win with the other false. Earned early victory must remain valid. Existing dossiers and adapters require an audit against this new authoring requirement.

The nine outer-power paths use the [player mechanics companion](../oracles/09_outer_power_player_mechanics.md). Site generation must supply their actual choices and both remedies: dream wards/source binding, mandate revocation/mask binding, gift provision/bounded ecology, role dissolution/counter-performance, carried keys/containment, independent rest/tribute severance, winter access/discharge sinks, reliable services/chapter defection, and grounding/counter-pattern work. These are required playable opportunities, not decorative encounters or nine renamed corruption tracks.

Site templates describe purpose and constraints before names and rooms: what the party can achieve, who benefits or resists, viable approaches, prerequisite facts, changes on resolution, and reward sources. Populate existing cave/ruin/tomb/overland families with compatible geomorphs. The objective is independently placed and never contingent on a random boss/treasure roll. Preserve the existing room-feature procedure around authored required contents and record authored overrides.

Reserve the objective graph, entities, zones, routes, and reward sources for the whole campaign at creation. Materialize detailed layouts and descriptions when needed, once. Reconcile future ungenerated opportunities with consequences, preserving established truths and recorded rolls. Required clues need multiple independent routes and access objectives need no circular prerequisites. Optional unrelated regional sites can supply additional opportunities but must not mask a path that cannot fund its own intended progression.

### Adapter coverage checklist

Each row requires all three acts, distinct zones, branch/reward validation, and saved outcomes before its variant is advertised as supported. Examples are site roles to implement, not completed modules.

| Engine | Act I site roles | Act II site roles | Act III site roles |
| --- | --- | --- | --- |
| Captive Domain / Domains of Dread | Test domain laws; recover testimony | Obtain killing-condition components; investigate bargains | Establish required circumstance; confront or escape |
| Aboleth Savant / Night Below | Rescue and verify witnesses; expose transport | Trace control relays; obtain safe descent and aquatic access | Isolate network; prepare and enter Savant's seat |
| Titans | Investigate prison disturbances | Contest restoration components and custodians | Assemble chosen resolution at final prison region |
| Tharizdun | Prove a missing distinction | Recover anchors and repair methods | Restore critical distinctions or contain dissolution |
| Bane | Investigate decrees and grain enforcement | Build lawful alternatives and secure providers | Contest authority and sustain the resulting settlement |
| Cthulhu | Trace dream contact; secure wards | Use reprieves; recover exclusion and binding methods | Close arrival routes or bind the submerged source |
| Nyarlathotep | Verify offers, issuers, and masks | Trace mandates; protect witnesses; recover binding knowledge | Revoke authority or bind the local incarnation |
| Shub-Niggurath | Discover useful gifts and their appetites | Provision or end dependence; trace reproduction | Sever forced propagation or establish bounded ecology |
| Hastur | Discover roles and privileges | Restore recognition; trace venue and audience claims | Dissolve an indispensable role or complete counter-performance |
| Yog-Sothoth | Prove thresholds and return conditions | Carry keys; reroute transport; verify containment | Cut and seal a junction or complete into containment |
| Tsathoggua | Investigate absences and priced rest | Discover actual reserves; establish independent shelter | Exhaust emergence infrastructure or sever tribute |
| Ithaqua | Provision shelters and first-season routes | Spend thaw time or prepare winter access | End transmission or drain reserve and sever replenishment |
| Tcho-Tcho Compact | Audit services, priests, and collection rights | Deliver alternatives or prepare collective defection | Terminate collection through independent provision or chapter severance |
| Azathoth | Correlate useful devices and spells with capture | Ground emissions; maintain essential utilities | Disconnect and discharge collectors or establish separation |
| Angels | Establish victims, charges, and witnesses | Perform repairs and secure testimony | Present valid restitution or pursue authored alternatives |
| Maruts | Identify the original violation | Obtain means and standing to correct it | Execute the correction under the warrant's conditions |
| Witch King | Trace casualties and conversion sites | Protect people; disrupt conversion infrastructure | Break surviving invasion logistics and resolve the front |
| Apocalypse Cult | Identify patron and actual component list | Contest components, substitutions, and ritual sites | Prevent, redirect, or defeat the resulting manifestation |
| The Eternal Cycle | Resolve mortal quarrels; preserve an oath | Secure anchors, witnesses, and third-party reciprocity | Defend preparations and resolve the Weighing |
| Githyanki / portal displacement | Secure reception and evidence | Build food capacity; investigate raids and portal control | Establish a materially sustainable settlement or ending |
| Slumbering Catastrophe | Discover sleeper and previous hunt | Obtain/test weapons, crews, protection, and routes | Stage the killing expedition or intercept mapped rampage |
| Sustained Catastrophe / Stolen Dawn | Preserve town supplies; prove renewal and alternative remedies | Reach caster or renewal dependency; secure descent | Restore Dawn Engine or obtain optional aid for another victory; preserve early success |

Bind each row to its detailed [population procedure](../oracles/08_adventure_path_population.md) and dossier. Antagonist variants require their own dependencies and lawful outcomes; renaming an enemy does not complete an adapter. The expanded path documents and outer-power player mechanics supply integration cases.

## 6. Proposed persistent contracts

| Record | Required information |
| --- | --- |
| Path definition/adapter | Version, engine/variant, three act specifications, environment constraints, conditions, templates, state reducer, endings |
| Campaign act | Path instance, act number, distinct zone ID, level envelope, prerequisite/outcome references, transition route, status |
| Situation/site plan | Stable ID, act/zone, purpose, involved entities, approaches, site family, graph constraints, clue links, reward references, consequences |
| Reward source | Stable source ID, source type, quality/XP, coin value, items/slots, table basis, availability/access conditions, exclusion group, claim state |
| Award event | Source ID, actual recipients, reason, earned ordering, amount, applied state, per-character progression/reset effects |
| Sufficiency report | Seed/version, selected zones, tested branches/rosters, reachable and earned rewards, reset losses, finale-entry level/current XP, post-finale progression, deficits and reasons |

Generate treasure classification independently of item allocation. Freeze actual participants at the earning event; allocating a sword to one PC does not deny the others XP. Proposed participation default is active adventurers present when earned; reserves receive none automatically. Replacement entry level and any reserve catch-up remain explicit ASH policy choices. Report their effect instead of promising every replacement reaches level 10.

## 7. Implementation sequence and acceptance gates

1. **Establish the rules profile and reward service.** Verify Core treasure/carousing tables and ruling boundaries; enforce server-side XP eligibility, reset, level-10 cap for this profile, ordered source awards, recipient validation, and replay protection. Support the proposed site/act awards as configurable ASH rules. Keep any extended-level profile explicit.
2. **Assign three zones and routes.** Extend the existing saved region/zone generators; implement filtered seeded selection, distinctness, route/access checks, persistence, and concealed future destinations. Preserve domain boundary behavior.
3. **Implement the shared adapter and site contracts.** Build semantic objectives, dependencies, multiple clues, persistent reward sources, geomorph placement, and outcome reduction through existing exploration controls.
4. **Complete Night Below across all acts.** Use its authored starting environments, cave routes, and final aquatic regions as three distinct zone pools. Connect prisoner transport to control infrastructure, access preparations, and final approaches. Produce one complete audited campaign before broadening support.
5. **Prove reuse with Domains of Dread and Eternal Cycle.** Validate enclosed regional travel, conditional victory, noncombat objectives, anchors, and the Weighing. Remove Waterworks-specific UI assumptions through data-driven outcomes.
6. **Implement the remaining adapter rows in batches.** Dependency/assembly engines first, then authority/services, spreading networks, and calendar/hidden-process engines. Give every antagonist variant its own coverage report. Exclude incomplete variants from random full-campaign selection.
7. **Audit progression and rehearse play.** Run deterministic campaigns across seeds, eligible zone assignments, and active rosters 1–6. Simulate ordinary exploration, missed caches, mutually exclusive branches, peaceful resolution, retreat, no carousing, optional carousing, reserve swaps, and casualties/replacements under explicit policies. Include award ordering and threshold waste. Then rehearse representative early, middle, and late sites at the physical table.

Acceptance requires pairwise distinct zone IDs after reload; feasible transitions; path-linked reachable objectives; independently discoverable clue routes; legal treasure/slots/access; single awards despite retries and revisits; no secret leakage; no duplicate alternative payouts; and plausible standard routes supporting level 9 at finale entry and enough earned opportunities through campaign success to reach level 10. Earlier or later entry remains a player choice. Record entry XP separately from rewards earned after victory, and assess the final encounter against actual entry capabilities. Record deficits and generate justified new opportunities in unused future content. Never replenish claimed treasure or silently change known rewards to repair an XP shortfall.

This validates opportunities, not guaranteed success. Players may avoid treasure, lose characters, or win early. Threats retain their established identity and capabilities; roster-aware encounter construction and telegraphed escape/negotiation options require separate testing from XP sufficiency.

## 8. Current implementation evidence

Inspection on 2026-09-06: `src/server/rules.ts` calculates L × 10 eligibility, but `levelUpCharacter` does not reset XP and uses a level-36 ceiling; `character:level_up` in `src/server/app.ts` checks the ceiling without enforcing XP eligibility. `generateTreasureReward` returns a small dice-generated coin/consumable reward without quality XP or Core treasure-table provenance. Tavern carousing grants a fixed +10 XP. `session:award_xp` and `xp_awards` provide useful source-deduplication foundations, but source IDs are optional and arbitrary amount awards do not establish campaign sufficiency. These are implementation tasks, not completed changes in this documentation work.
