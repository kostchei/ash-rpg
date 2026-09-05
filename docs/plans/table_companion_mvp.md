# Table Companion: minimum playable release engineering plan

Status: **planned; this document does not implement or certify the release.**

Prepared 2026-09-06 from inspection of the current working tree, including uncommitted changes. The product scope is summarized in the [README](../../README.md#the-next-playable-release-a-companion-for-the-physical-table).

## 1. Outcome and scope

Support four people playing together at a physical table, using phones for character sheets and selected actions. One computer runs the existing local server and can show a shared display. The application records and resolves procedures; players describe actions, discuss decisions, interpret fiction, and adjudicate exceptional outcomes together.

The release must complete this loop:

**Join → create four core characters → choose tavern activities → select a lead → travel → camp → discover a site → explore connected dungeon rooms → resolve combat → allocate treasure → return and recover → resume next session.**

Validate Fighter, Thief, Priest, and Wizard at levels 1–3. Deliver a complete opening expedition using The Mind Below and a playable ordinary regional site; retain pathless exploration. A supported first template is sufficient for adventure-path generation, provided its generated people, clues, locations, and consequences are connected and saved. Completing an entire multi-act campaign is outside this release.

Use one shared party position in the wilderness and one inside the active dungeon. Combat uses physical positioning and Close/Near/Far descriptions. Defer individual tactical tokens, line of sight, automated enemy turns, split-party simulation, additional class/path implementations, cloud accounts, offline mutation merging, and exhaustive spell-effect automation.

These scope boundaries sequence delivery; they do not remove existing rules or invalidate other design documents.

## 2. Baseline and design authority

| Area | Current evidence | Work remaining |
| --- | --- | --- |
| Table infrastructure | `src/server/app.ts`, `database.ts`, and `src/client/App.tsx` implement joining, ownership, snapshots, persistence, and socket actions. | Consistent shared-action authority, persisted choices, retries, concurrent changes, and corrections. |
| Characters | `src/shared/content.ts`, `data/classes/classes.json`, and `rules.ts` contain class definitions, creation, talents, and leveling. | Reconcile duplicate definitions; represent executable choices, equipment, spells, and modifiers. |
| Expedition | `travel:move`, tavern leads, objectives, camp handlers, and site entry exist. | Complete player-choice workflows, enforce phase/location rules, and verify one coherent clock and supply procedure. |
| Paths | `generators/mind-below.ts` and path state support an initial integrated situation. | Replace site-name/deed-specific UI behavior with reusable situation actions and persisted consequences. |
| Dungeon | `DungeonRoom` has generated descriptions and an exit count; the client renders a room list. | Connected exits, current room, discovery projection, repeat visits, and turns. |
| Combat | Encounter generation, monster HP, lore, reaction, and morale exist. | Initiative, turn state, conditions, death saves, and character attack/casting assistance. |
| Rewards | Character gold, XP, and campaign notes exist. | Inventory, generated reward records, single claims, allocation, and expedition closure. |

Use the [core classes](../rules/05_classes_core.md), [equipment](../rules/07_equipment_and_services.md), [exploration](../rules/08_exploration_and_crawling.md), [combat](../rules/09_combat_and_hazards.md), and [magic](../rules/10_spells_and_magic.md) as the rules references. Reconcile discrepancies explicitly before encoding them. Record adopted interpretations beside their implementation tests; do not silently invent a new rules system.

Follow the [shared adventure-path and exploration process](adventure_path_exploration_process.md), including separate world truth, party knowledge, and path-specific progression. The older [remediation plan](remediation_plan.md) and [gameplay review](hex_crawl_gameplay_review.md) provide background issues to recheck against current code, not a current list of unimplemented features.

## 3. Interaction and authority model

| Actor | Authority |
| --- | --- |
| Player | Edit their own permitted character state, make character rolls, submit or change their own activity choice, inspect discovered maps and shared results. |
| Caller | A host-designated device, including a player's phone, that commits party movement, resolves shared activities, advances combat, and records table-adjudicated site outcomes. One active caller at a time. |
| Host | Assign/revoke caller authority, recover character ownership, manage the campaign, and correct recorded mistakes. Can perform caller actions. |

Caller is a capability in addition to the existing host/player identity, not a mandatory GM. Shared play views must omit secrets even when displayed on the host computer; deliberate host inspection can remain a separate control.

Players talk before the caller commits a shared decision. No voting system is needed. A phone can inspect a destination without moving the party. Tavern/camp choices remain visible and editable until committed; the caller can explicitly resolve with missing players resting rather than requiring every device to stay connected.

Use a shared mutation contract for consequential actions: `actionId`, an appropriate expected revision, and a validated payload. Authenticate ownership/capabilities on the server. Persist each mutation, its audit entry, and its action receipt in one transaction, then broadcast. Retrying an action returns its stored result without spending resources or rerolling. Concurrent shared moves reject stale origins. HP damage/healing uses deltas to avoid overwriting another device's change. Activity selections use per-selection revisions so independent players do not block one another.

Allow host corrections of HP, resources, selections, and ordering with a reason in the log. Do not promise universal rewind of discoveries or random generation. Reconnect restores committed state; a disconnected client shows its status and cannot silently queue consequential actions for later replay.

## 4. Architecture and proposed records

Keep React/Vite, Express, Socket.IO, and SQLite. Extend the current application incrementally; do not begin with a framework rewrite. Extract feature modules from `App.tsx` and socket registration from `app.ts` as those features are changed. Keep deterministic rules/generation separate from authorization, persistence, and presentation.

The following names describe proposed records, not existing APIs:

| Record | Minimum fields and invariants |
| --- | --- |
| Campaign control / action receipt | Caller device, state revision; action ID scoped to campaign and actor, stored result, timestamp. Never expose device credentials in public snapshots. |
| Character extensions | Stable class ID, class choices, applied talent choices, conditions/death strikes, known spells and their availability. Derive bonuses from structured data, not talent prose. |
| Item definition / inventory entry | Definition ID, owner character or party, quantity, slots, equipment state, relevant attack/armor properties. A treasure item has one allocation owner. |
| Activity session / selection | Tavern or camp, location, status, participant choices, revision, costs, results, resolution ID. A character has one selection per session. |
| Situation / deed | Path instance if any, site/NPC/clue references, eligible outcomes, status, resolved deeds and consequences. Path-specific state remains an extension. |
| Dungeon / room / connection | Site ID, room ID, geometry/layout position, contents, connection endpoints and state, entry/current room, discovered facts, exploration turn. Exit count alone is insufficient. |
| Combat state / combatant | Encounter ID, round, active entry, initiative/order, character or monster reference, conditions and durations. Reference existing HP instead of duplicating it. |
| Treasure / allocation | Source room/encounter/deed, generated contents, claim state, allocations, resolution ID. Reopening the source returns the same reward. |
| Expedition record | Objective, departure/return, notable events, discovered references, rewards and XP already awarded. |

Use versioned additive SQLite migrations with backfills and transaction boundaries. Test migration on a copy of an older database. Preserve existing characters, worlds, and notes. Legacy room lists must remain inspectable; do not fabricate supposedly explored connections. An explicit host conversion can create a simple layout, or new dungeon exploration can start separately while preserving the old journal.

Public projections must hide unrevealed traps, doors, inhabitants, treasure, rumor accuracy, and path internals. Sharing a hex or room ID is not permission to inspect its hidden contents. Generate once and persist, whether eagerly or when an unexplored exit is first opened.

## 5. Implementation milestones

### M0 — Establish rules and a safe mutation foundation

Dependencies: none. This work supports every later milestone.

1. Run the existing test suite, client type check, and production build; record current failures separately from new regressions.
2. Reconcile core class/talent definitions and select one runtime content source with stable IDs. Audit HP, AC, carrying slots, casting, rest, XP, and initiative conventions. Preserve rules outside the initial supported level range.
3. Add caller assignment, ownership checks, action receipts, revisions, and transactional changes for shared travel, camp, HP, and rewards as those actions migrate to the contract.
4. Add recovery and correction controls. Make hidden-information projections reusable by subsequent features.

Acceptance: two devices cannot advance the same departure twice; replaying an accepted action preserves its result; a player cannot change another character or commit shared actions without caller authority; reconnect preserves ownership and state. An existing campaign survives migration.

### M1 — Four playable mobile characters

Dependencies: M0. Deliver a usable party before more procedural content.

1. Introduce a focused My Character surface: vitals, abilities, actions, spells, inventory, and readable feature descriptions. Keep the full party roster accessible.
2. Implement minimal item data, starting equipment, equip/unequip, slots, and derived AC/attack/damage values. Buying and treasure later use the same inventory service.
3. Add contextual ability/skill checks, saves, attacks, damage, advantage/disadvantage, and a custom labeled check. Physical dice entry records the face(s), modifiers, and source; both entry modes use the same outcome calculation.
4. Implement Fighter mastery and Hauler; Thief thievery, backstab, and trap-sense hook; Priest known spells, WIS casting, turn undead, loss/penance; Wizard spellbook, INT casting, loss and mishaps. Wire trap sense to actual room entry in M4.
5. Implement legal talent choices and their effects once, plus a sufficient tier 1–2 spell catalog for levels 1–3. Show effect text; apply supported numeric changes explicitly and allow table rulings for other effects.
6. Restore eligible spells on the appropriate rest; penance remains distinct. Support level advancement through the validated range without free repeat talent awards.

Acceptance: one of each class can be created and used from a phone; mastery and thievery change applicable rolls; casting failure changes availability; recovery follows the adopted rule; equipping armor changes AC; a physical and digital roll with identical faces produce identical outcomes.

### M2 — Tavern, travel, and camp as a shared expedition

Dependencies: M1 for inventory, character actions, and recovery.

1. Persist tavern activity sessions with recover, gather rumors, carouse, and buy supplies. Show validated costs, timing, and expected procedure before commitment. Start with a small fixed stock list, not a settlement economy simulator.
2. Keep grounded tavern leads, objective selection, and free exploration. Hearing a lead reveals its claim, not hidden truth or an exact location unless the source knows it.
3. Complete the mobile map selection/commit flow using current position, adjacency or valid connections, transport, travel cost, clock, weather, supplies, and discovery. Consolidate overlapping watch/movement actions so one journey does not advance time twice.
4. Replace client-local camp assignment with shared persisted choices. Provide watch, cook, forage, and rest; other existing duties can remain only where their behavior is defined. Allow each player to choose watch rather than forcing the highest-WIS characters into it.
5. Resolve camp once with interruptions and the correct recovery effects. Validate sanctuary versus wilderness recovery from actual location, and prevent incompatible actions during a pending encounter or activity resolution.

Acceptance: four devices submit independent choices, reconnect, and see them restored; costs cannot make balances negative; one caller resolves once; a player can serve as caller and travel from their phone; arrival, camp, dawn, and return agree on time, supplies, and location.

### M3 — Connected situations and persistent adventure sites

Dependencies: M2 for leads, objectives, travel, and discovery.

1. Extract a common situation interface for generating, placing, revealing, and resolving path content. Keep each path's own progression and triggers.
2. Adapt the Mind Below opening to that interface; remove UI checks for a specific site-name substring and hard-coded rescue outcomes. Present eligible, player-readable actions with stable outcome IDs.
3. Generate and save a premise, opposing interests, a small set of linked opportunities/sites, clues, and alternative outcomes. Place them on feasible geography. Ordinary sites use the same exploration records without requiring a path.
4. Persist site description, inhabitants, hazards, access, rewards, and changed state. Entering a settlement or shrine need not automatically mean entering a dungeon.
5. Resolve deeds once, update relevant people/sites/path state, and create eligible follow-up leads. Neglect advances only through the path's specified trigger, not a universal watch counter.

Acceptance: a rumor leads to a real reachable site; its clues and occupants agree with the situation; a deed changes the saved world once; returning reveals appropriate follow-up information; an ordinary site and a pathless campaign remain playable.

### M4 — Connected dungeon exploration

Dependencies: M3 site identity and M1 hazard checks.

1. Persist a room graph with a simple SVG or HTML layout, entry point, current party room, and explicit door/corridor connections. A small readable room map is sufficient.
2. Support choosing a connected exit, opening it, entering, backtracking, and leaving through a valid exit. Generate unexplored content once and store it under its site.
3. Track exploration turns and the rules' light/resource procedures. Searching and room movement share one advancement service; hazard or encounter results pause subsequent progression until addressed.
4. Resolve eligible Thief trap-sense checks before revealing/triggering a hidden hazard. Persist discovered traps and resolved room contents. Revisit does not respawn monsters, rewards, or hazards automatically.

Acceptance: the party enters, explores a branch, backtracks, exits, reloads, and returns to the same graph and room state. It cannot move through an unconnected room or see hidden traps in network payloads. Separate sites never share room state.

### M5 — Combat assistance

Dependencies: M1 character actions, M0 shared authority; integrate with M4 room encounters.

1. Reuse monster generation/catalog selection and bind encounters to their source site/room or travel event. Keep reaction and peaceful outcomes available before starting combat.
2. Add initiative rolls or physical results, manual order adjustment, round/current-turn state, next turn, late entrants, and end combat. Adopt and document the initiative rule during M0; do not infer one from UI order.
3. Reference live PC and monster HP. Add damage/healing amounts, conditions, timed effects, death strikes, stabilization, and death-save prompts.
4. Prompt for morale at relevant events and let the table record retreat/surrender. Display monster attack and behavior references for human resolution. Ending combat releases exploration without automatically declaring every foe slain.

Acceptance: a mixed PC/monster encounter retains initiative and HP through reconnect; two damage inputs accumulate correctly; timed conditions and death saves advance at the right turn; a negotiated or fled encounter can end; the caller can run initiative from a phone.

### M6 — Treasure, return, and session completion

Dependencies: M1 inventory, M3 outcomes, M4 rooms, M5 encounters.

1. Add a small tier-aware treasure generator for coins, valuables, consumables, and occasional magic items using curated data and recorded rules.
2. Link rewards to persistent sources. Separate generation, discovery, claim, and allocation. Support party storage, individual assignment, splitting coins, and later transfer with slot feedback.
3. Award XP through an explicit table action linked to a reward/deed or expedition record; apply each award once. Returning home does not automatically duplicate encounter awards.
4. Add expedition closure with objective outcome, discoveries, loot, and editable summary. Keep the same world available for the next departure.

Acceptance: re-entering a cleared room cannot generate fresh loot; concurrent claims cannot duplicate an item; allocated gold/items survive restart; return recovery and advancement work; the next expedition begins with the changed world and correct resources.

## 6. Verification and release gate

Run `npm test`, `npx tsc --noEmit -p tsconfig.json`, and `npm run build`. The explicit client type check matters because the current client build invokes Vite; do not treat a bundled client as proof of TypeScript correctness.

Extend the existing rules, database, API, and `tests/expedition-loop.test.ts` suites where relevant. Test outcomes and invariants, especially ownership, retries, concurrent mutations, hidden payloads, migrations, and resource accounting. Add deterministic generator checks for persistent room connections and single reward claims. Do not substitute snapshots of UI markup for gameplay tests.

Before release, run one host plus four separate player sessions, with at least one real phone. Check narrow screens around 360–430 CSS pixels wide, touch map selection, readable action buttons, scroll behavior, and clear pending/error feedback. Reload a phone during activity selection and combat; restart the server between sessions. Verify the LAN join URL and QR flow from the phone.

The release gate is an actual table rehearsal:

1. Create the four classes and inspect their defining actions.
2. Submit different tavern activities from each phone; resolve and choose a generated lead.
3. Move the party from the caller's phone, discover a site, and resolve a camp with individual choices.
4. Enter the dungeon, traverse connected rooms, find a hazard, and backtrack.
5. Generate an encounter, use both digital and physical rolls, run initiative, change HP, and resolve a condition or death save.
6. End the encounter, claim and allocate treasure, and record a site outcome.
7. Travel home, recover, award XP, close the expedition, and restart the application.
8. Rejoin and verify characters, inventory, map discovery, dungeon state, outcomes, and follow-up leads.

Record failures against the responsible milestone. Passing unit tests alone does not certify this flow. At release, update the README and Table Companion guide to distinguish verified support from remaining work.

## 7. Delivery sequence and first work package

Implement M0 → M1 → M2 → M3 → M4 → M5 → M6, with a reviewable feature slice at each step. Introduce schema, server rules/actions, public projection, UI, and focused checks together rather than accumulating disconnected backend features. Preserve existing working-tree changes and inspect their current state before editing.

The first implementation package is M0: capture the baseline, reconcile the four core class definitions and rule decisions, and add the shared-action contract to party movement with a migration and a two-client replay/concurrency test. This provides a concrete foundation for all subsequent phone-driven play without a broad rewrite.
