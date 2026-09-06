# Table assistant: campaign requirements and delivery plan

Status: **product requirements agreed from the owner's direction; implementation proposals and unresolved rules are labeled below.** Recorded 2026-09-06 against commit `9c1b2e0` (`gemini 3.8`). This document supersedes conflicting product scope in the earlier [MVP plan](table_companion_mvp.md). That plan remains a useful engineering checklist for the opening expedition, not the full completion target.

## 1. Product and table experience

ASH assists **one to six people playing solo or cooperatively at a real physical table**. It supplies hidden preparation, procedural adjudication, maps, character sheets, and a persistent campaign record. People describe actions, converse as characters, interpret results, and resolve unusual situations together. Physical dice and app dice are both supported. It does not require a human GM or autonomous tactical combat.

The computer host is an administrative role, not an omniscient player. Its normal shared display uses the same spoiler-safe information as the phones. Solo play must remain surprising even when the sole player owns the server. Deliberate inspection of secrets is a separate explicit control; server administration cannot technically prevent its owner inspecting local files.

The full target is a **three-act adventure path with enough playable material for Shadowdark levels 1–10**, ending in defeat of the final antagonist or another valid accomplishment of the campaign goal. An opening expedition is an incremental delivery gate, not product completion.

## 2. Campaign setup and characters

1. Create a joint campaign and invite players. Support one to six player identities, independent of how many devices they use.
2. Each player generates **two owned characters**. Class, origin zone, and ancestry are player choices, subject to the generation sequence and any explicitly documented eligibility rules.
3. Offer the class-first **Unearthed Arcana method**: choose the class, then roll abilities using that class's prescribed dice procedure.
4. Offer the **Iron Man method**: roll abilities first, preserve those results, then choose an eligible class based on them. Do not quietly rearrange or reroll the abilities.
5. The requested pair can contain one character from each method. Proposed default: one of each; whether this is mandatory or players may use Iron Man twice remains a small setup-policy decision. Preserve method, individual dice, accepted scores, choices, and ownership.
6. Choose an adventure path explicitly, or choose **secret system selection**. The latter rolls once from the supported eligible paths and persists its hidden selection. Public names, IDs, generation seeds, logs, and socket acknowledgements must not reveal it.
7. Display roster readiness and let the group choose Start after its participating players are ready. Starting commits the initial world once; reconnecting or pressing Start again cannot regenerate it.

Separate a character's origin zone from the party's starting zone and each act's destination. Mixed origins should influence the town's enclaves, contacts, and opportunities without silently overriding anyone's choices. Proposed starting-region rule: the table selects one compatible region, with a suggestion derived from its origins and the selected path's geographical needs.

**Resolve before implementing generation:** identify the exact Unearthed Arcana class-specific dice tables and how they map onto ASH/Shadowdark classes, including expanded classes. This is a requested variant, not a claim about standard Shadowdark generation. Also decide whether both characters adventure simultaneously or one is a reserve. Model both ownership and an active roster now; do not equate six players with six characters or silently balance for twelve active PCs. The earlier four-core-class slice does not remove the broader choice requirement.

## 3. Starting town and tavern

Generate and persist a small town dossier: name, character, livelihood, local feature or trouble, essential services, and cultural details informed by the party's classes, ancestries, and origins. Generate a tavern, its keeper, and a few identifiable patrons with motives and things they actually know. Proposed initial cast: keeper plus three to five patrons. A returning party meets the same people with updated circumstances.

Present **three starting quest/rumor leads** through those people. Proposed default matching the requested mix:

- Two distinct opportunities related to the selected adventure path, potentially connected but not duplicates of one destination.
- One unrelated lead: a 50% chance of an ordinary adventure site and a 50% chance of an empty site.

Treat that probability as conditional on the third lead, not a 50% chance that the entire opening is empty. Roll and save the result once. An empty site is genuinely unoccupied or depleted in the relevant sense; it can still have terrain, history, shelter, and evidence explaining an outdated rumor. Do not put a compulsory encounter or hidden campaign reward in every empty location. This interpretation is a proposed default because the requested mix was tentative.

Each lead has a source, claim, direction or known destination, apparent purpose, known warning, and any promised reward. Keep actual truth and occupants private. Players choose which lead to pursue or travel elsewhere. Talking at the table need not become a forced menu conversation.

## 4. Regional map and knowledge

Use a clickable hex map with one shared party marker and persistent fog of war. Clicking a hex inspects known information; an explicit caller action commits travel. Path sites occupy suitable geography, while seeded ordinary content extends the map beyond prepared regions without replacing established places.

Store separate knowledge layers:

| Layer | Examples | Reveal procedure |
| --- | --- | --- |
| Regional knowledge | Major rivers, towns, routes, conspicuous landmarks roughly 30 miles around home | Local familiarity, maps, and contacts; approximate or incomplete where appropriate |
| Direct observation | Current terrain and genuinely visible nearby features | Position, elevation, terrain obstruction, weather, and a documented visibility rule |
| Reported information | Bandits reported yesterday near a ferry | Dated source and claim, not confirmed current truth |
| Current local discoveries | Today's ambush, concealed entrance, active occupants | Arrival, searches, encounters, or specific fresh reports |

Knowing a river four hexes away does not reveal today's bandits there. Previously observed dynamic information becomes dated rather than magically updating. Terrain knowledge does not reveal every site inside the hex.

**Rules verification required:** the owner's roughly 30-mile familiarity radius is a design target, not an established Shadowdark sight radius. Fix hex scale and check the applicable core/hexcrawl sources before encoding travel and observation. At a proposed six-mile scale, 30 miles is approximately five hex steps; a centered 19-hex map extends only two rings, so the present map size cannot contain that whole region. Support a larger persistent region or generated chunks, and express knowledge distances in miles rather than hard-coded ring counts.

## 5. Path-driven sites and clickable geomorph maps

### Expedition and room procedure — owner clarification

The opening adventure site may be **one to six hexes away**. Move the party across the intervening map, advance travel time and ration use, and resolve or evade encounters before continuing. Following a road avoids the wilderness navigation check. Off-road travel requires a **party Intelligence check**; failure chooses one of **all six hex directions uniformly**, including the intended direction. Do not choose only from the five wrong directions, reroll an inconvenient destination, or bias the roll toward already generated hexes. A direction beyond the current frontier must extend the saved world, not become an invisible wall or a free reroll.

#### Navigation procedure — settled 2026-09-06

Hexes are **6 miles across**, per the Hexcrawl Guidebook (pp. 9, 26, 58). Three travel watches per day; the existing `calculateTravelWatches` cost already sorts terrain into that book's easy/moderate/hard classes, so the navigation difficulty keys off the same cost rather than a second terrain table.

| Watch cost | Terrain class | Navigation check |
| --- | --- | --- |
| 1 (road or trail) | Easy: plains, roads, grassland | No check |
| 2 | Moderate: forest, hills | DC 9 |
| 3 | Hard: swamp, jungle, mountains, desert | DC 15 |

The check is a **party Intelligence check using the single best INT modifier in the active roster**, against the standard ASH ladder (DC 9/12/15/18). Night travel (watch 4) or obscuring weather raises the terrain one step, so an easy hex becomes DC 9 and a moderate hex becomes DC 15.

**Recorded ASH variance, not a source rule.** The Hexcrawl Guidebook resolves navigation with a d6 — lost on 1 in moderate terrain, on 1–2 in hard terrain and in fog or night travel — and where a system substitutes a check it names survival or **wisdom**. Shadowdark has no survival skill and publishes no navigation DC. The owner has specified an Intelligence check; that choice and these DCs are ASH decisions.

The DCs are calibrated against the source's own odds. The guidebook rolls once per watch while ASH resolves one hex per travel action, so a moderate hex is 1-(5/6)^2 = 30.6% lost and a hard hex is 1-(4/6)^3 = 70.4%. At a representative +2 INT, DC 9 fails 30% and DC 15 fails 60%. DC 12 for hard terrain would fail only 45% and sits well below the source; do not substitute it without re-deriving these figures.

Failure drifts the party into a neighbour chosen uniformly from all six directions, including the intended one, and the party is not told the check failed. Time, rations, and the encounter check are paid for the hex actually entered. The check result is part of the travel action's stored outcome; a retried action replays it and never re-rolls the direction.

On reaching the site, enter at its entrance. Subsequent room choices must be reachable through the saved connections. Each new room uses this feature table, rolled once and persisted:

| d10 | Feature |
| --- | --- |
| 1–2 | Empty |
| 3 | Trap |
| 4 | Minor hazard |
| 5 | Solo monster |
| 6 | NPC |
| 7 | Monster mob |
| 8 | Major hazard |
| 9 | Treasure |
| 10 | Boss monster |

**The site objective is placed separately somewhere in the site.** It is not conditional on rolling a boss or treasure, and a feature-empty room may contain the objective. Room creatures can carry treasure, but a fight is not an automatic loot dispenser. Resolve reactions, conversations, traps, hazards, and combat as appropriate at the table.

Treasure collection requires a real persistent source, discovery, actual access, and an unclaimed state, as well as being in the room. Access may follow defeating or distracting guards, bargaining, stealing, opening a container, or bypassing protections. Killing every creature is not a universal requirement. Record the actual table-adjudicated approach and consequences; entering a room or ending combat alone does not establish access. A resolved encounter, completed objective, discovered reward, accessible reward, and allocated reward are distinct facts.

### Site generation requirements

The generation order is **path situation → objective and involved entities → suitable site and geography → connected layout → relevant occupants, clues, traps, hazards, and rewards**. A generic room generator must not invent an unrelated objective after placement.

Proposed site-family distribution follows the requested 25% overland possibility: 75% caves, ruins, deep tunnels, or tombs; 25% overland sites. Overland examples include tower, fort, keep, mansion, copse, spring, dell, bayou, peak, manor, faire, tourney, and villa. These are starting weights, constrained by geography and authored needs; record explicit overrides instead of producing an impossible bayou in a dry peak. The overland site's interior can still include buildings or cellars. A faire or tourney needs a social area map, not obligatory dungeon rooms.

Provide a clickable map for every explorable site, preferably assembled from reusable **geomorphs by site type**. Proposed implementation:

- A semantic graph owns rooms or outdoor areas, exits, access requirements, objective locations, and discoveries.
- Geomorph definitions supply compatible connector ports, footprints, allowed rotation, floor/elevation, area tags, and display geometry.
- Assembly connects legal ports, rejects overlaps and inaccessible required objectives, and supports branches, loops, backtracking, and exits. Secret passages cannot be the sole mandatory route unless an alternative resolution is deliberately supplied.
- Render a readable SVG map with selectable discovered areas and a shared position. Tactical miniature positioning remains at the table.
- Persist the seed, chosen pieces, graph, discoveries, resolved hazards, occupants, and reward claims. Re-entry does not restock the location automatically.

Zone ecology and path factions jointly constrain monsters, trap mechanisms, and hazards. Telegraph major danger and provide approaches such as negotiation, stealth, rescue, sabotage, recovery, and retreat. The objective has stable entity references, completion conditions, alternative outcomes, and consequences; recording a table ruling with a reason must be possible without requiring a combat victory.

## 6. Three acts and levels 1–10

Every supported full path needs an authored campaign premise, goal, opposition, three connected acts, transitions, multiple clue routes, consequences, and valid endings. Prefer distinct zones between acts when the fiction supports them; a zone transition needs a route and reason. Act advancement follows changed circumstances and achieved requirements, with level bands used for preparation rather than automatic story gates.

| Act | Proposed level envelope | Content and transition |
| --- | --- | --- |
| I: Local discovery | 1–3, preparing entry to 4 | Town and three leads; several related situations; reveal the wider problem and a route or relationship enabling Act II |
| II: Wider struggle | 4–6, preparing entry to 7 | New region and factions; branching interventions, information and access objectives; consequences determine available final approaches |
| III: Resolution | 7–10 | Culminating region, preparations and countermeasures, final confrontation or alternative campaign-goal success, and an epilogue in the changed world |

**Content sufficiency must be measured, not inferred from three act headings.** Build an XP/reward ledger for each path and supported active-roster size. Verify the actual level thresholds, treasure XP, carousing, sharing, replacement-character treatment, and ASH variances against the chosen rules profile. The publisher describes Shadowdark advancement as rewarding treasure and carousing rather than monster kills ([official overview](https://www.thearcanelibrary.com/blogs/shadowdark-blog/all-about-shadowdark-rpg)); do not budget the path as a sequence of mandatory fights.

For each level transition, calculate required XP minus carried progress, then map it to attainable reward opportunities under those rules. Audit plausible branches, missed treasure, peaceful solutions, casualties, and optional excursions. Proposed planning headroom: supply about 25–50% more attainable opportunities than the minimum route requires, then calibrate through play. Do not count mutually exclusive rewards twice. Choose site counts from this audit rather than claim an arbitrary number of dungeons guarantees level 10.

Characters should have enough opportunities to reach level 10 by campaign success, with level-10 play available before the ending. Clever early success remains valid; the system must not forbid victory solely because the party is below the expected level. Shortfalls should yield appropriate additional opportunities, not respawned treasure or forced grinding. A complete three-act authored path and a reusable path contract precede declaring other path templates supported.

## 7. Reference systems inspected

Local sources inspected 2026-09-06; paths below are development references, not runtime dependencies. Adapt patterns and verified data deliberately rather than import these projects' autonomous-game behavior.

| Project and source | Observed pattern | Adaptation for ASH |
| --- | --- | --- |
| `D:/Code/shadowdork/src/game/level/generate.ts`, `dungeons.ts` | Graph-based entrance, climax, reward, and exit placement; themed site objectives | Assign spatial roles to geomorph graphs; let the path provide the actual purpose and entities |
| `D:/Code/DuskUltima/src/game/level/Adventure.ts`, `AdventureGenerator.ts` | Typed goal identity, target, completion mode, approaches, hidden/trapped objective state; multi-site adventures | Reuse the goal vocabulary and noncombat outcomes as a design reference; do not import automatic companion-rescue weighting or unrelated random goals into path sites |
| `D:/Code/Core_Dark/src/generation/siteGeneration.ts`, `clusterGeneration.ts` | Narrative beats independent of room count, seeded generation, an objective per site, intermediate/terminal objectives, explicit internal versus overland links and room-budget validation | Build path-linked situation clusters with real travel between separate places and persistent objective placement |

These sources establish reusable objective and topology patterns. They do not establish that ASH already has the requested type-specific geomorph library or a full three-act path generator.

## 8. Current implementation assessment

Baseline verification on `9c1b2e0`: **96 tests across 14 files pass; client TypeScript checking and production build pass; working tree was clean before this documentation work.** No browser/mobile table rehearsal was performed in that assessment.

The commit adds equipment/spells/contextual actions, caller support, persisted tavern/camp sessions, dungeon graphs, combat state, rewards and return controls. Existing campaign hosting, SQLite persistence, regional generation, and Mind Below integration are useful foundations. Their existence does not certify the new setup or campaign requirements.

| Area | Remaining work or observed risk |
| --- | --- |
| Setup | Two characters per player, both generation methods, readiness/start lifecycle, origin/start-zone distinction, and secret path choice need explicit integration and verification |
| Path content | Waterworks-specific UI remains in `src/client/App.tsx`; replace hard-coded path actions with situation data; full level 1–10 content coverage is unverified |
| Maps | Current dungeon graph is a foundation, not evidence of the requested site-family geomorphs or regional/current-information separation |
| Return | `session:return_sanctuary` grants recovery and switches phase without validating haven location or moving the map marker |
| Treasure/light | `dungeon:claim_treasure` does not require the current room; `dungeon:light_torch` resets light without consuming an item |
| Mutation integrity | Travel supports optional action receipts/revisions but the client supplies neither; `session:award_xp` has no equivalent replay protection |
| Verification | The test named “Full 4-Player” uses two sockets and direct database character/location setup; it does not prove real four-player onboarding, phone use, or a physical-table session |

## 9. Delivery sequence and gates

Keep React/Vite, Express, Socket.IO, and SQLite. Extract feature services from the large client/server files as their flows change. Each slice includes persistence, rules, server authority, public projection, UI, and meaningful verification.

| Stage | Concrete delivery | Acceptance gate |
| --- | --- | --- |
| A. Rules and integrity | Record generation tables and Shadowdark/ASH variances; establish active/reserve policy; mandatory mutation IDs and appropriate revisions; fix return, treasure and torch invariants; additive migrations | Repeated requests cannot spend/award twice; illegal location actions fail; older saves migrate; host shared view and acknowledgements conceal secrets |
| B. Table setup | Player identities with two-character ownership, both roll workflows, chosen/secret paths, readiness and single Start | Solo and six-player setup complete; reconnect preserves dice and ownership; repeat Start preserves the world; secret selection stays hidden |
| C. Path opening and region | Generic path/situation/objective contract; party-informed town and cast; three grounded leads; layered knowledge and expandable map | Two path opportunities and the rolled unrelated/empty branch persist; known rivers reveal no remote encounters; leads reach feasible sites |
| D. One complete site loop | Path-spawned objectives, first underground and overland geomorph families, relevant obstacles, table-adjudicated outcomes, treasure and return | Follow a lead, navigate a branch, backtrack, use a noncombat outcome, return by travel, reload and observe lasting consequences |
| E. Full Act I | Multiple connected situations and all first-act required class actions; extend geomorph family coverage and ordinary sites | Real table rehearsal from setup to an Act I transition; both empty and unrelated lead cases remain usable; no single missed clue stalls the path |
| F. Acts II and III | New zone transitions, consequence-driven opportunities, higher-level class/spell support through 10, final goal and alternate ending, XP budget audit | Multiple plausible routes have sufficient attainable advancement; all three acts persist across sessions; final success produces a coherent epilogue |
| G. Release rehearsal | Solo, four-player, and six-player configurations with the chosen active-character policy; LAN QR, physical dice, narrow screens, interruptions and restart | At least one real phone; independent player choices; caller handoff; campaign resumes correctly; verified scope replaces provisional documentation claims |

The first implementation package is Stage A followed by the setup-to-tavern slice in B/C. Build the reusable objective contract before expanding procedural room content. Do not attempt every geomorph family or all three acts before proving one complete physical-table expedition.

Testing must include public socket responses as well as snapshots, independent player ownership, stale/replayed actions, deterministic generation, geography/connectivity, source-specific rewards, migrations, and reachable campaign outcomes. Balance tests supplement table play; they cannot certify enjoyment or level pacing by themselves.

## 10. Decisions settled during Stage A

Settled in rules and specifications on 2026-09-06:

- **Unearthed Arcana roll tables:** Method I tables codified in `src/server/rules.ts` (`UA_CLASS_DICE_ALLOCATION`) for all 13 supported classes (core and expanded). Each class specifies dice counts ($3\text{d}6$ to $9\text{d}6$) keeping the 3 highest dice while preserving individual rolls.
- **Iron Man generation & eligibility:** 3d6 rolled strictly in order across all 6 stats (`rollIronManAbilities`). Class eligibility (`getEligibleClasses`) requires prime requisite score $\ge 9$, with an automatic fallback to the highest rolled attribute(s) ensuring no roll is stranded without eligible classes.
- **Active / reserve roster policy:** Maximum 2 characters owned per player token. Exactly 1 active (participating in crawl, checks, combat, drawing rations) and 1 in reserve (retained safely in haven/camp). Swapping occurs in sanctuary/haven. Reserve characters do not automatically draw crawl XP unless explicitly carousing or training.
- **Hex scale & wilderness navigation:** 6-mile hexes and the off-road navigation check (DC 9/15/18 with INT mod, uniform 6-direction drift) are settled and implemented.
- **Progression profile:** Authoritative Shadowdark levels 1–10 (10 XP per level) forms the campaign envelope; ASH extensions to level 36 remain supported as an explicit variance.

## 11. Implementation progress — 2026-09-06

**Stage A is complete.** The following changes are fully implemented and verified:

- All consequential actions are migrated to transactional mutation receipts: `travel:move`, `dungeon:claim_treasure`, `dungeon:record_outcome`, `dungeon:light_torch`, `session:award_xp`, `session:return_sanctuary`, `party:rest`, `expedition:camp`, `expedition:camp_night`, `site:enter`, `dungeon:move_room`, `treasure:allocate`, `combat:update_hp`, and `combat:death_save`. Retries replay cached outcomes, revision conflicts abort, and duplicate action IDs with differing payloads fail.
- Source-linked XP awards are deduplicated via SQLite `xp_awards` table: awards referencing a persistent `sourceId` cannot be awarded or logged more than once.
- Sanctuary recovery strictly requires physical presence at surface haven `(0, 0)` with no active site or pending encounters.
- Dungeon treasure claims require current room presence and table access; torch lighting consumes from inventory bundles.
- Information projections audit: player views and shared displays conceal undiscovered rooms, hidden traps, uncompleted objectives, and secret edges.
- Authoritative Unearthed Arcana and Iron Man rules and eligibility algorithms are codified and tested.

Verification: **137 tests in 20 files pass**, including dedicated coverage in `tests/stage-a-completion.test.ts` for generation tables, Iron Man eligibility, XP deduplication, and consequential mutation idempotency. Client TypeScript checking and production Vite build pass with 0 errors.

With Stage A complete, the codebase is ready for **Stage B: Campaign Setup & Two-Character Ownership**.

### Room-loop follow-up

New sites now populate the exact d10 room-feature table and independently place one objective. Existing saved graphs are preserved; re-entry returns to the entrance. The current five-area topology remains an interim map, with an ordinary route around its optional secret connection; type-specific geomorphs and richer zone/path-specific NPC and hazard content are still required. Boss selection currently uses the strongest available wandering-table entry, pending authored site-boss profiles.

The room UI starts combat using the actual room creature/count. Room combat outcomes link back to their source room and victory does not automatically create room loot. A caller can record a reasoned table outcome, treasure discovery/access, and objective completion. Claims require recorded access and stable site/room reward identity. The old deed endpoint now also requires reaching its placed objective. Graph acknowledgements apply the existing role projection so undiscovered objectives are not exposed to player callers. Journey continuation and site entry reject unresolved encounters. This does not yet replace the legacy standalone combat/treasure generation flow.

Travel's off-road INT/random-direction procedure is implemented and verified (see below). Existing day-boundary ration consumption remains in place. Do not describe geomorphs or rich room content as finished because the new navigation/room/reward checks pass.

### Frontier expansion — implemented 2026-09-06

The public map is no longer fixed at 19 hexes. The region generator already solved elevation, hydrology, biome, and zone attribution across a whole structural field and persisted it to `region_hexes`; only the 19 `HEX_GRID` coordinates were ever projected into the campaign-facing `hexes` table. `src/server/frontier.ts` promotes that saved structural ground into the public map on demand, so a hex charted on the tenth expedition holds the ground it always held. Nothing is regenerated and no new terrain is invented.

- `travel:move` charts the party's new hex and its six neighbours after each march, keeping the frontier one ring ahead of them. New hexes enter as `unexplored`, so the existing role projection still hides their name, biome, and sites from players until the party arrives.
- Promotion is idempotent and assigned ids continue the original numbering, so a replayed travel action charts nothing new and a hex keeps its id for the life of the campaign.
- Routes recorded by earlier hexes with an unresolved `"??"` far end are repaired when the far hex is charted, so roads and rivers draw across the new frontier.
- The client needed no change: it positions hexes from their axial coordinates and gates travel on coordinate adjacency, so charted ground becomes visible and travellable automatically.

**The default structural radius is raised from 6 to 12, giving a complete radius of 10 hexes from home** (469 saved hexes, ~77 ms to generate). The owner set the 10-hex target on 2026-09-06. The field is translated so the haven sits at (0,0), which costs about two rings on the far side, so the radius must exceed the required reach: at radius 6 the field was complete only to **four** hexes from home, short even of the one-to-six-hex lead range. No campaigns have been saved yet, so this changes generated output with no migration concern, and no existing test expectation depended on it. Note that the API's `structuralRadius` cap is 12, so the default now equals the maximum; raising the reach further means raising that cap too.

**The world still ends somewhere, and this slice does not remove that.** Travel beyond the saved structural field throws an explicit error naming the limit rather than fabricating geography. Genuinely unbounded outward travel needs a chunked region generator, which is a separate work package: terrain here depends on a hydrology solve and an RNG stream consumed across the whole coordinate set, so a single coordinate cannot be regenerated in isolation and a larger radius would produce a different world for the same seed. Until that exists, the frontier is finite by construction — adequate for the one-to-six-hex lead range, not for indefinite wandering.

### Map navigation — implemented 2026-09-06

Both maps share one drag-to-pan surface (`src/client/MapViewport.tsx`). Scrolling stays the browser's own, so scrollbars, the wheel, and arrow keys keep working and the region remains keyboard reachable; dragging moves the scroll offsets. A drag that travels more than a few pixels swallows the click it ends on, so panning across the map never selects the hex or room under the pointer.

- **Frontier map:** a zoom slider replaces the old two-button control, and the range widens from 100–200% to 100–500% because a growing charted area makes each hex smaller at a fixed width. Zoom is anchored on the viewport centre, so zooming in magnifies the ground being looked at instead of jumping to the map's corner.
- **Site map:** panning only, per the owner's direction that site maps are small enough not to need zoom. Its `viewBox` now follows the actual room bounds rather than a fixed 680x320 frame, so a site larger than that frame is panned to instead of cropped — necessary before geomorph assembly produces larger layouts.

Two layout defects surfaced and were fixed: `.panel` is a grid item whose default `min-width: auto` let one wide child stretch the panel past its track and scroll the whole page sideways, and the atlas heading was hard-coded to "The 19-hex frontier", which the frontier work had made untrue.

Verified in a browser against a running server: zoom slider to 400% with the centre held, drag-pan on both maps, and clicks still selecting a hex and a room after panning.

### Fog of war: what persists and what is current

**Owner requirement recorded 2026-09-06: when fog of war lifts, landmarks remain; sites, monsters, and NPCs may change.** Terrain, biome, elevation, landmark, roads, and rivers are permanent world truth, saved on the hex and shown from the moment the party charts it. Occupancy is not.

The hex row previously carried a frozen `sites_json` snapshot written when the hex was charted, so a renamed, razed, or newly founded site would never appear on a hex the party had already seen. That column is removed. Site occupancy is now read live from the `sites` table at projection time and filtered by the existing visibility and discovery rules, so a revisited hex reports today's occupants while keeping the ground the party mapped. Monsters and NPCs were never stored on the hex — encounters are rolled per travel — so nothing there was frozen.

This is the persistent half of section 4's knowledge layers. Dating reported information and separating direct observation from regional familiarity remain unimplemented.

Verification: **120 tests in 18 files pass**, five consecutive full runs clean, including seven new frontier tests covering promotion fidelity against `region_hexes`, id stability, replay safety, the ten-hex reach in every direction, edge refusal, an outward socket march onto ground the initial map never contained, and landmark permanence against changed site occupancy. Client type checking and the production build pass. No browser or physical-table rehearsal was performed for this slice.

A pre-existing flaky test was fixed in passing: the four-player end-to-end loop entered a site without clearing a wilderness encounter, which travel and camp raise on a 1-in-6, and an unresolved encounter correctly blocks site entry. It failed roughly one run in four. The block was right and the script was wrong, so the fix is in the test. Verified over ten consecutive runs.
 
### Wilderness navigation procedure — implemented 2026-09-06

The settled wilderness navigation procedure from Section 5 is now implemented:

- **Road / trail travel** avoids the navigation check entirely.
- **Off-road travel** runs `resolveWildernessNavigation` using the party's best INT modifier from the active roster.
- Difficulty ladder keys directly from travel watch cost:
  - Easy terrain (watch cost 1): no check in daylight/clear weather, raised to DC 9 in night travel (watch 4) or obscuring weather.
  - Moderate terrain (watch cost 2): DC 9 in daylight/clear weather, raised to DC 15 in night travel or obscuring weather.
  - Hard terrain (watch cost 3): DC 15 in daylight/clear weather, raised to DC 18 in night travel or obscuring weather.
  - Both night and obscuring weather raise terrain difficulty by 2 steps (up to max DC 18 on the standard ASH ladder).
- **Drift on failure**: uniformly chooses one of all six axial directions (`HEX_DIRECTIONS`), including the intended direction. The party is not told the check failed; public roll log reflects travel to whichever hex was entered.
- **True cost & frontier integration**: travel time (watches), clock progression, forced march fatigue, and wilderness encounter checks are calculated and paid for the hex actually entered. If drift crosses the current frontier onto structural ground, `materializeHex` promotes the entered hex and `materializeNeighborhood` charts around it.
- **Idempotency**: navigation outcome is preserved in the stored mutation receipt (`navigation: { checkRequired, dc, roll, total, passed, actualHexId, drifted, driftDirection, driftIndex }`), so retried actions never reroll direction.

Verification: **130 tests in 19 files pass**, including 10 dedicated navigation tests in `tests/navigation.test.ts` covering DC calibrations, obscuring weather conditions, INT modifiers, 6-direction uniform drift, socket mutation execution, replay idempotency, and frontier promotion upon drift. Client type checking and production build pass cleanly.

### Stage B: Campaign Setup & Two-Character Ownership — implemented 2026-09-06

The full requirements for **Package 3: Campaign Setup & Two-Character Ownership (Stage B)** per Section 2 are now implemented and verified:

1. **Two Owned Characters per Player & Active/Reserve Model:**
   - Relaxed the single-character constraint in `character:create`. Each player device/token can create and own up to 2 characters.
   - The first created character defaults to `active` (`roster_status = 'active'`) and binds to the device identity (`devices.character_id`).
   - The second character joins the `reserve` roster (`roster_status = 'reserve'`) without displacing the active character.
   - Attempting a 3rd character for the same player token is authoritatively rejected by both the socket action and database transaction (`"This player already owns the maximum of 2 characters"`).
   - Roster swapping (`roster:select_active` / `swapActiveCharacter`): players can swap their active adventurer between their two characters. Swapping is strictly gated to haven sanctuary (`phase === 'sanctuary'`) or during an active camp session (`activity_sessions.kind IN ('camp', 'camp_night')`). Swapping outside these contexts or attempting to swap another player's character is rejected.
   - Active character selection is synchronized to `devices.character_id` and reflected across public and player projections.

2. **Authoritative Generation Workflows:**
   - **Unearthed Arcana (Method I)**: Class is selected first. `character:roll-ua` invokes `rollUnearthedArcanaAbilities(className)`, rolling class-specific dice pools (e.g. 9d6 drop 6 for Fighter STR, 9d6 drop 6 for Wizard INT) and keeping the top 3 dice per stat.
   - **Iron Man (Strict 3d6 in order)**: Abilities rolled first in order (STR, DEX, CON, INT, WIS, CHA). `character:roll-ironman` invokes `rollIronManAbilities()` and computes `eligibleClasses` via `getEligibleClasses(scores)` (prime requisite $\ge 9$). Attempting to create an Iron Man character with an ineligible class is authoritatively rejected.
   - Character schema and database columns store `generation_method`, `generation_dice_json` (individual rolled dice breakdown), accepted ability scores, and `origin_zone_id`.

3. **Secret Adventure Path Selection:**
   - Campaign creation accepts `pathSelection: { mode: 'explicit' | 'secret', pathId?: string }`.
   - In `secret` mode, the campaign records `is_secret_path = 1`.
   - Projections (`getState`) conceal the true path identity, master, patron, and climactic destination:
     - `adventurePath.pathId = "secret"`
     - `adventurePath.name = "Uncharted Omens"`
     - `adventurePath.isSecret = true`
     - Narrative tells and situations are sanitized to avoid spoiling late-game secrets until revealed through in-world discoveries.

4. **Table Readiness & Single Start Lifecycle:**
   - Campaigns initialize with `started = 0` and display a dedicated **Lobby Screen** before commencement.
   - Lobby presents campaign info, QR code, player invitation link, table participant roster with active/reserve badges, and readiness indicators.
   - Players toggle expedition readiness (`table:ready` / `setDeviceReady`). State projection calculates `tableReadiness: { totalPlayers, readyPlayers, allReady }`.
   - Table host starts the campaign (`campaign:start` / `startCampaign`). Sets `started = 1` and transitions phase to `'sanctuary'`.
   - Starting is strictly idempotent and non-destructive: repeat Start triggers or reconnection never re-generates the world. Non-hosts cannot start the campaign.

5. **Separation of Active vs. Reserve Expedition Duties:**
   - Ration consumption during night watch advancement (`advanceWatch`) only feeds active adventurers; reserve characters do not consume expedition rations.
   - Forced march fatigue checks (`evaluatePartyForcedMarch`) only evaluate and fatigue active adventurers.
   - Combat runner initialization (`combat:start`) filters combatants to `roster_status !== 'reserve'`.
   - Wilderness navigation checks use the highest INT modifier from the active party only.

Verification: **156 tests across 21 test files pass** (`npm test`), including 19 comprehensive automated tests in `tests/stage-b-setup.test.ts`. Full production client and server builds (`npm run build`) pass cleanly.

