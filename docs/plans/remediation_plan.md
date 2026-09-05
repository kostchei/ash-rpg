# Procedural map remediation plan

Status: **planned; fixes have not been implemented by this document.**

Reviewed implementation: `48fb3ad` — `map betaa`.

**Re-verified 2026-09-03 against current `HEAD` (still `48fb3ad`; no fixing commits landed since this document was written).** Independent code inspection reconfirmed the core blockers without needing to re-run the generator:

- R1: `Welcome`'s create-campaign form ([App.tsx:181-204](../../src/client/App.tsx#L181-L204)) has no zone/border picker at all and posts only `name`/`regionName`/`pin`; `createCampaign()` ([database.ts:628-663](../../src/server/database.ts#L628-L663)) falls straight to `generateLegacyHexMap({ legacy: true })` whenever `generationConfig` is absent, so every campaign created through the UI today is still the fixed Oakhaven map. The six-setting/border selector, live preview, and `/api/regions/preview` endpoint exist only in the API layer — nothing in the client calls them.
- R4: `regionId` is built as `reg_${campaignId}_${baseSeed.slice(0, 8)}` ([procedural-region.ts:269](../../src/server/generators/procedural-region.ts#L269)); two distinct seeds sharing an 8-character prefix collide, and `saveGeneratedRegion` writes the region row with `INSERT OR REPLACE` ([database.ts:407-411](../../src/server/database.ts#L406-L411)), so a same-campaign regeneration silently destroys the previous region and every row that references it.
- R7: generated resource sites are tagged `visibility: "hidden"` ([procedural-region.ts:430](../../src/server/generators/procedural-region.ts#L420-L433)), but the only filter applied when building the public site summary is `isSecret: s.visibility === "secret"` — `"hidden"` never matches, so hidden resource caches are visible to players from the moment a hex is generated, regardless of reveal state.
- G3/G4: `zone:exit` unconditionally calls `db.setActiveZone(identity.campaignId, "oakhaven_borderlands")` ([app.ts:362-377](../../src/server/app.ts#L362-L377)) — a desert-oasis or underground-refuge campaign is teleported back to Oakhaven on "return to sanctuary." There is still no `travel:` socket handler; the only movement-adjacent handlers are `hex:reveal` (a host-triggered flag flip) and `wilderness:watch`, which still hard-codes a three-biome (`forest | marsh | mountain`) table in [rules.ts:213-273](../../src/server/rules.ts#L213-L273) and ignores the party's actual hex, connections, or the new `calculateTravelWatches`/`evaluateWatchFatigue` helpers sitting unused lower in the same file.

No corrections to the analysis below were needed; the milestones, acceptance criteria, and definition of done remain the right target.

Design authority: [Zone-based procedural hex maps](zone_based_procedural_hex_maps.md). This document translates the implementation review into corrective work, dependencies, and measurable acceptance criteria. The original plan remains the reference for the six setting profiles, historical research, all fifteen zone pairings, and intended play experience.

## 1. Outcome required

A host can create and preview a new campaign in one Cursed Scroll setting or a supported connection between two settings. Its seed produces a geographically coherent, playable world that remains stable after saving. Settlements, routes, history, encounters, and discovery must agree with that world. Existing campaigns must survive the changes.

The current implementation provides useful foundations: seeded random sources, noise, zone profiles, pairing definitions, database entities, dynamic map connections, and initial tests. It does not yet fulfill the complete design. Some failures are functional defects in offered features; others are larger features that remain incomplete.

Keep those categories visible. Temporarily disabling an unfinished option is a containment measure, not completion of the original requirement.

## 2. Review evidence

At the reviewed commit, the production build succeeded and all **53 tests in 10 test files passed**. Additional checks used generated worlds, an in-memory database, and the HTTP API. The passing suite does not cover the failures below.

| ID | Priority | Confirmed behavior | Evidence or reproduction |
| --- | --- | --- | --- |
| R1 | P1 | New campaigns from the client still receive the fixed legacy map; the new regeneration choices do not select their requested zones. | The creation request omits `generationConfig`. Regenerating an Oakhaven campaign with string `red_sands` leaves `activeZoneId` as `oakhaven_borderlands`. |
| R2 | P1 | Non-surface borders have no playable second zone. | Seed `review_0`, Gloaming–Morzomotha, vertical: 19 surface cells, zero underground cells, no shaft. Urban and distant examples also contain only the primary zone. Validation reports success. |
| R3 | P1 | Terrain is sampled independently after settlements and routes, creating physically incompatible results. | Andrik seed `review_0`: a road supporting `foot` and `cart` reaches a settlement in `Glassy Coastal Reaches`, an open-water terrain category. |
| R4 | P1 | Different seeds can overwrite a saved region and its dependent records. | Generate `samepref-A`, then regenerate with `samepref-B` in the same campaign. Only the second region remains, with revision 1, because IDs use the first eight seed characters and saving uses `INSERT OR REPLACE`. |
| R5 | P2 | Generation inputs and pairing compatibility are not validated; failed creation is not atomic. | Preview accepts `not_a_zone` and an unsupported Djurum–Andrik surface join with HTTP 200 and `valid: true`. Numeric seed `123` causes creation to return HTTP 500 after inserting a campaign row. |
| R6 | P2 | Catchment accumulation is incorrect on flat drainage paths. | A radius-three grid with every elevation set to 1 gives node `-2,-1` a catchment of 2 instead of 3. The default river threshold is 3, so this changes the water classification. |
| R7 | P2 | Hidden discoveries are exposed by scouting or full mapping. | Gloaming seed `review_0`: scouting Hex `04` reveals hidden `Mineral Seep & Herbal Glade 04`. `hidden` becomes `isSecret: false`; full mapping also bypasses secret filtering. |

Additional verified gaps against the original plan:

| ID | Gap | Current implementation |
| --- | --- | --- |
| G1 | Preserve a larger structural world and expand it consistently. | A larger coordinate area is calculated, but only the fixed 19-cell window is returned as region hexes and saved; external drainage context is discarded. |
| G2 | Causal history, appropriate populations, and spatial factions. | History selects an initial slice of motifs, every event has an empty affected-entity list, and faction locations remain at the haven. Supporting resources are prose strings rather than validated dependencies. |
| G3 | Travel uses actual map conditions and movement modes. | The live handler still takes forest/marsh/mountain from the client. New travel and fatigue helpers are not called by gameplay. Party location is initialized but not advanced by those helpers. |
| G4 | Zone entry and return represent actual movement. | Entry changes the active zone label; exit still returns to Oakhaven regardless of the campaign's home. |
| G5 | Persist and honor normalized generation configuration. | Region records preserve selection, seed, and version labels, but not the complete configuration. Several accepted options are not used, including season/source-content selection in generation behavior. |
| G6 | Tests prove coherence and usable features. | Tests largely assert counts, labels, a few visible fields, and layer existence. They do not prove valid water routes, usable second layers, safe revision replacement, or complete reproduction. |

## 3. Implementation order

Work through the following milestones. Tests for a defect should be introduced with its fix; do not defer all verification to the final milestone.

| Milestone | Work | Depends on | Completion gate |
| --- | --- | --- | --- |
| M1 — Safe generation contract | R5, R4, G5; validation failure handling; preview identity | None | Invalid input cannot create partial campaigns or erase existing regions; valid configuration and revisions are preserved. |
| M2 — Coherent base world | R6, R3, G1 structural persistence | M1 | Terrain, water, havens, settlements, and connections agree; the saved structural region exceeds the visible window. |
| M3 — Setting-specific maps and joins | R2; surface-border constraints; maritime, cave, and city strategies | M2 | Both selected settings are playable through a valid connection; single-zone special settings use the right topology. |
| M4 — Usable campaign workflow | R1; preview/commit UI; G4 | M1 and the relevant M2/M3 strategies | The host can select, preview, create, enter, and return without a silent legacy fallback or geography reroll. |
| M5 — Discovery and travel | R7, G3; role-aware map responses | M2–M4 | Hidden facts stay hidden; travel updates real position and time using local conditions. |
| M6 — Meaningful world content | G2; local encounter eligibility and persistent world changes | M2–M5 | History and factions affect named places and supplies; encounters reflect where the party is. |
| M7 — Expansion and acceptance | G1 expansion, G6 cross-system verification | M1–M6 | Expansion preserves established facts; all original-plan acceptance gates have evidence. |

Containment before completion: stop committing invalid candidates immediately; reject unsupported connection modes; do not advertise previews, districts, voyages, or underground layers as playable until they work. Preserve the required features in the remaining-work list.

## 4. Detailed corrective work

### R1 — Wire zone and border selection through the client

Primary files: [App.tsx](../../src/client/App.tsx), [app.ts](../../src/server/app.ts), [database.ts](../../src/server/database.ts), [hex-map.ts](../../src/server/generators/hex-map.ts).

- Add a shared client configuration for single-zone or border selection, with seed and season under optional settings.
- Present the six Cursed Scroll settings. Keep Oakhaven available only as an explicitly labeled example/legacy choice rather than the implicit world for all campaigns.
- For borders, derive allowed connection modes from the selected pairing. Do not offer the same zone twice.
- Send the normalized configuration in both creation and regeneration requests. Stop passing zone IDs through the legacy `theme` parameter.
- Keep a narrow, explicit translation for existing legacy theme callers if backward compatibility is required. Recognize known values; reject unknown strings rather than retaining the previous zone silently.
- Ensure newly created campaigns use procedural generation by default. Preserve old saved maps through migration, not by routing every new request without configuration to the old generator.
- Wire the preview endpoint into the UI and show the actual candidate map. Committing a preview must preserve its generated content; changing a setting invalidates that preview.
- Until the flow is complete, remove misleading success messages and unsupported options.

Acceptance:

- Create a campaign through the rendered form for each of the six settings; its saved configuration and actual terrain match the selection.
- Create one supported border campaign through the form; both selected zones exist in usable maps.
- Reproduce Oakhaven → Red Sands through the regeneration dropdown and assert the resulting region uses `red_sands`.
- Different default campaign creations receive different saved seeds and procedural worlds.
- A committed preview matches the approved content, allowing only persistence IDs, campaign-specific display overrides, and timestamps to differ.
- An existing legacy campaign loads without regeneration.

### R2 — Build actual map strategies and second-zone connections

Primary files: [procedural-region.ts](../../src/server/generators/procedural-region.ts), [zone-profiles.ts](../../src/shared/zone-profiles.ts), [types.ts](../../src/shared/types.ts), database and map client.

Replace the current single `surface` layer construction with explicit topology strategies:

| Strategy | Required generated content | Required connection behavior |
| --- | --- | --- |
| Ordinary surface | Connected terrain regions, meaningful boundaries, suitable crossings | Adjacent movement with real slope/water restrictions |
| Maritime | Islands or coastline, open water, sheltered landing sites, inland routes | Sea lanes require vessels; foot/cart routes remain on valid land or explicit infrastructure |
| Subterranean | Cave regions, open passage graph, shafts, chasms, water, depth | Neighboring coordinates do not imply open passages; vertical movement has requirements |
| Urban | Regional hinterland plus local district/location map | District and canal travel use local scale; a protected establishment is the haven |

Then implement join strategies:

- **Surface:** contiguous primary areas and a plausible transition mechanism. Apply shared climate/geology constraints and preserve feasible access from the haven toward both zones.
- **Vertical:** generate non-empty destination layers, an entrance site on each relevant side, and a cross-layer connection with depth and access requirements. Handle reversed input order without turning the underground setting into the surface.
- **Urban:** generate the urban inset and a real link to its regional parent location. Include the source's eight district roles with generated layout and local sites.
- **Distant:** generate or reserve a valid destination region with a journey connection carrying travel time, distance/scale, and requirements. It must not appear as a neighboring six-mile cell. Materialize the destination before permitting entry.
- Apply subterranean and urban strategies to **single-zone** Morzomotha and Meridia too. They should not require a border selection to receive their essential spatial behavior.

Acceptance:

- The `review_0` vertical reproduction contains actual underground hexes, sites, passages, and a usable cross-layer entrance.
- Every generated connection has existing endpoints, except explicitly modeled unresolved frontier gateways that cannot yet be traversed.
- Urban examples contain a navigable district graph; distant examples contain a destination and journey representation, not merely a secondary-zone label.
- Andrik has usable maritime routes and starting boat access when its early expeditions require a vessel.
- Reverse the order of each selected pair and verify that its physical meaning remains valid.
- An unfinished strategy returns a configuration error, never a successful single-zone substitute.

### R3 — Generate physically eligible terrain before inhabitants and roads

Primary files: [procedural-region.ts](../../src/server/generators/procedural-region.ts), [hydrology.ts](../../src/server/generators/hydrology.ts), [zone-profiles.ts](../../src/shared/zone-profiles.ts).

Reorder generation into explicit stages:

1. Select landform, climate, geology, map scale, and connection strategy.
2. Generate coherent elevation/moisture fields and land/water classification.
3. Resolve drainage and hydrological features.
4. Assign eligible terrain using those fields and neighboring terrain, with zone weights applied only among valid candidates.
5. Choose a physically valid haven; translate the structural region while preserving enough surrounding coverage.
6. Place settlements at eligible locations and establish support resources.
7. Construct mode-aware routes to meaningful destinations.
8. Place remaining sites, histories, threats, and clues against those constraints.

Specific corrections:

- Introduce stable terrain identifiers and properties. Do not infer all passability, water type, climate, or support capacity from display-name substring searches.
- Restrict coastal and tidal terrain to real coastline/estuary relationships. River-themed terrain must correspond to actual water features.
- Make haven eligibility a hard constraint. An invalid result cannot become safe simply by setting threat tier to zero.
- Validate each settlement's water and food support. Connect support descriptions to resource/site/route references; explicitly represent imports and supernatural exceptions.
- Select settlement types from the local zone and habitat. Pooling all types from both settings must not place a woodland community arbitrarily in a desert core.
- Use valid candidate scoring and seeded tie-breaking. Replace the current non-antisymmetric elevation sort and fixed slicing with deliberate placement.
- Build roads, passages, sea lanes, and crossings over an appropriate movement graph. Split ordinary two-hex hops into adjacent segments; reserve longer edges for explicitly modeled journeys or local-scale abstractions.
- Model route crossing requirements separately from travel along a river. Do not mark every river segment as both boat travel and a ford.
- Validate source, outlet, and boundary continuity. Do not solve every setting as the same watershed with different river names.

Acceptance:

- Andrik `review_0` no longer places ordinary foot/cart road segments in open-water cells.
- Every inhabited site and haven passes its terrain, support, and access constraints.
- No ordinary edge skips a required intermediate hex; special edges declare their distinct scale or mechanism.
- Desert water, Black River corridors, Andrik coasts, and Morzomotha depth have setting-specific tests.
- Multi-seed checks demonstrate connected biome regions and valid transitions, not just different biome strings.

### R4 — Preserve region identity, revisions, and references

Primary files: [database.ts](../../src/server/database.ts), [procedural-region.ts](../../src/server/generators/procedural-region.ts), [types.ts](../../src/shared/types.ts).

- Separate deterministic generation-local keys from persistence identity. A seed is generation input, not a unique database primary key.
- Allocate stable region-instance and revision IDs independent of seed prefixes. A full-seed hash alone is insufficient when the same seed can be intentionally reused.
- Stop using `INSERT OR REPLACE` for the root region record; replacement deletes dependent rows through foreign-key cascades.
- Keep prior revisions intact. Make exactly one revision active for each applicable region instance and update the campaign's active reference atomically.
- Preserve knowledge, notes, site references, and encounters against their originating revision. On deliberate replacement, report and explicitly reassign incompatible active references instead of silently attaching them to new places.
- Store the complete normalized configuration with generator, content, and rules versions. Preserve the old versioned content needed for reproduction, or state clearly when an old version can only be loaded from its saved world.
- Remap every preview-local ID and reference consistently during commit. A preview produced with campaign ID zero must not become a shared identity across campaigns.
- Preserve existing fixed-map campaigns as actual legacy instances without inventing a reproducing seed.

Acceptance:

- `samepref-A` and `samepref-B` retain separate intact saved revisions.
- Reusing the exact same seed intentionally does not erase previous records.
- Committing one preview into two campaigns produces isolated records and internally valid references.
- Failed revision creation leaves the previously active map, discoveries, and references unchanged.
- A restart retains the active revision and its world without calling generation again.
- Tests cover both migration from the pre-region schema and continued use of maps already saved by `48fb3ad`.

### R5 — Validate requests and reject invalid candidates

Primary files: [app.ts](../../src/server/app.ts), [database.ts](../../src/server/database.ts), [types.ts](../../src/shared/types.ts), generation modules.

- Define one runtime schema for selection, known zone IDs, distinct border IDs, compatible pairing/mode, seed type/length, scale, radius, season, source mode, and rules profile.
- Normalize defaults on the server. Share the validated shape with clients rather than using `z.any()` or a type cast as validation.
- Put explicit bounds on region size and enforce structural coverage sufficient for the visible radius and haven translation. Do not accept an arbitrary radius for synchronous server generation.
- Validate `borderProfileId` against the selected pair and permitted mode. Remove silent unknown-zone fallbacks from generation paths.
- Reject or remove unsupported configuration fields until they have defined behavior; do not save labels suggesting an ignored option was applied.
- When all deterministic attempts fail, return a structured generation failure. Remove the path that returns the last invalid candidate as a usable world.
- Make all save/commit entry points refuse invalid candidates. Prefer committing a server-owned preview/configuration to trusting world records supplied by a client.
- Generate before writing, or wrap campaign creation and every dependent write in one transaction that rolls back on failure.
- Keep authorization consistent: modifying an existing campaign is host-only. If pre-campaign previews are public, they must be bounded, stateless with respect to existing campaigns, and expose no existing campaign secrets.

Acceptance:

- Unknown zones, duplicate zones, unsupported modes, wrong pairing IDs, numeric seeds, and out-of-bounds sizes return structured 4xx errors without database writes.
- Djurum–Andrik cannot be accepted as an ordinary surface border.
- Forced validator failure returns a generation error after bounded retries and leaves active state untouched.
- Candidate validation covers physical and connection constraints, not merely haven presence and zone counts.
- Malformed creation produces zero orphan campaign rows.

### R6 — Correct hydrology accumulation and classification

Primary file: [hydrology.ts](../../src/server/generators/hydrology.ts).

- Assign an acyclic downstream graph using elevation and a stable flat-drainage rank.
- Accumulate catchment in topological order: process upstream contributions completely before propagating a node's accumulated value downstream.
- Classify all nodes as stream/river/sink in a separate pass before building edges. Edge construction must not depend on whether a downstream node happened to be classified earlier in iteration order.
- Preserve deliberate closed basins and distinguish them from unresolved accidental traps; connect lakes and outlets according to the chosen water strategy.
- Preserve the computed water features in the saved structural world.
- Use the hydrology result's names and identities consistently. Correct the `||`/ternary precedence in the current region river-name expression so a nonempty generated name does not automatically become `River Mor`.

Acceptance:

- The flat radius-three reproduction gives `-2,-1` catchment 3.
- Catchment at every node equals 1 plus the sum of direct upstream catchments for the current unit-contribution model.
- Follow every downstream chain to a declared outlet/sink without a cycle.
- Reordering equivalent coordinate input does not change graph classification or omit valid river edges.
- River edges, node classifications, displayed features, and persisted records agree.

### R7 — Separate site discovery from geographic knowledge

Primary files: [types.ts](../../src/shared/types.ts), [procedural-region.ts](../../src/server/generators/procedural-region.ts), [database.ts](../../src/server/database.ts), map client.

- Preserve distinct `visible`, `hidden`, and `secret` world properties. Do not collapse them into a boolean that treats hidden resources as public.
- Add persisted party discovery records keyed to sites/features. Mapping a hex and discovering a site are separate operations.
- Define host and player projections explicitly. Hosts can inspect the generated truth without revealing it to players.
- Unexplored player hexes must not automatically receive exact elevation, detailed routes, full exits, or hidden connection endpoints. Publish specific regional knowledge and starting rumors through explicit records.
- Rumors reveal their claims and uncertainty, not the complete true target. Store target IDs privately where necessary.
- Scouting reveals visible features subject to observation rules; searching or another discovery action can reveal eligible hidden sites.
- `fully_mapped` means reliable geography, not automatic disclosure of every secret in that geography.
- Filter the payload on the server; hiding elements in React is insufficient.
- Avoid exposing a reconstructible campaign seed through public canonical IDs, especially while previews can generate a world from a seed.

Acceptance:

- Scouting Hex `04` in the documented Gloaming reproduction does not reveal its hidden resource until a discovery is recorded.
- Full mapping leaves undiscovered secret sites hidden.
- Newly created player payloads contain no unapproved terrain/route/site data, including through nested connection metadata.
- Hosts see private world information without modifying party knowledge.
- Discovery survives restart and ordinary zone travel; updating faction control does not erase known geography.

## 5. Complete the larger design gaps

### G1 — Save structural geography and support expansion

- Persist the full generated structural region, water features, and reserved route/gateway continuations. Keep the 19-cell public window as a view, not the saved-world limit.
- Save normalized coordinates after haven translation; ensure the claimed structural radius matches actual coverage around the haven, or record its true footprint.
- Add APIs and UI to reveal or navigate other saved cells without regeneration.
- Generate local detail from saved independent streams and stable location keys. Do not reroll terrain when a site is first investigated.
- Define boundary contracts for new regions: terrain continuity, river direction and identity, route endpoint, depth, and expected destination.
- Validate a new region against those contracts before attaching it. Save its connection atomically.
- Use canonical coordinates rather than extending the initial two-digit display IDs into globally unique identifiers.

Acceptance: a default structural world contains more than 19 saved cells; traveling beyond the first view retains already known geography; cross-region rivers and routes meet; expansion does not change previous maps or depend unpredictably on exploration order.

### G2 — Turn history, support, and factions into relationships

- Choose compatible historical events with seeded variation rather than always taking the first motifs from the primary profile.
- Give events explicit affected entities and concrete effects: ruined infrastructure, reused masonry, old ownership claims, redirected trade, or changed habitation.
- Apply chronology constraints so current ruins, routes, and settlements reflect the selected sequence.
- Place faction assets and presence at appropriate settlements, sites, and crossings. Finish the currently unimplemented reassignment from the haven.
- Distinguish a settlement's owner from other factions with influence or activity there.
- Link settlement support to actual resources, production areas, imports, and accessible routes. Use declared magical support where the setting requires it.
- Generate rumors from actual sites/events. Do not mark a generic claim about guardians or buried treasure as true unless that supporting fact exists.
- Keep sources and ASH adaptations distinguishable at the relevant record level; a profile-wide `sourced` label must not imply every new motif or faction is canon.
- Connect runtime encounter eligibility to local habitat, movement, faction activity, and season. Resolved monster keys alone do not establish habitat suitability.
- Preserve unique named entities and record world changes against existing sites rather than regenerating the region.

Acceptance: each generated historical event affects at least two valid entities; factions have valid spatial assets; settlement support can be traced; initial true rumors correspond to actual content; different seeds vary relationships as well as text and terrain.

### G3 and G4 — Make travel and zone transitions spatial

- Add an authoritative party location containing region, layer, and position, plus an independently saved home location.
- Let players/hosts request destination and travel mode. Resolve terrain, passability, connection requirements, and cost on the server.
- Integrate the chosen travel rules into the live handler; remove the client-selected generic biome as the source of truth.
- Track progress through multi-watch crossings, calendar/watch state, environmental effects, encounters, rest, and applicable resources. Charge resources once at the correct time boundary.
- Reconcile the documented four-watch procedure with the actual rules. Terrain effort, river crossings, bridges, sea travel, cave travel, and forced marches must use one consistent representation.
- Apply separate local travel scale in cities while advancing the shared campaign clock correctly.
- Enter another zone by traversing a saved connection or moving into its territory; derive any legacy `activeZoneId` from the authoritative location.
- Return through a valid connection to the actual home. Never substitute Oakhaven for a desert oasis, harbor, underground refuge, or urban establishment.
- Keep an explicit host relocation action if desired; distinguish it from resolved physical travel and do not reroll the destination world.

Acceptance: a travel action changes real position/progress and time; blocked water/shaft crossings are rejected without the necessary means; local encounter context follows the party; leaving and returning restores the same saved region; a city journey does not consume a six-mile wilderness crossing by accident.

### G5 — Make configuration and reproduction truthful

- Store the normalized configuration, seed, accepted attempt, generation/content/rules versions, and committed world snapshot.
- Separate deterministic world content from timestamps and persistence IDs when comparing reproduction.
- Implement independent streams for geography, names, settlements, history, factions, sites, and rumors. Runtime rolls must not consume generation streams.
- Give each advertised option a defined effect. Season should affect the relevant environment/travel system; it need not redraw permanent mountains. Source mode should govern authored/named content selection or remain unavailable until implemented.
- Preserve rules profiles for existing campaigns. Updating default pacing must not silently change ongoing games.
- Do not promise old-seed reproduction with only current mutable content and a historical version string. Retain needed content versions or explicitly support saved-world loading instead.

Acceptance: same normalized configuration and supported versions reproduce the same canonical world; name-only changes do not move rivers; runtime events do not change future geography; restart loads the committed snapshot; ignored options cannot appear as successful configuration choices.

## 6. Verification and review gates

Extend the existing tests where appropriate; add focused files for configuration, hydrology, world invariants, revisions, and discovery if that improves clarity. Prefer tests asserting behavior and relationships over snapshots that simply preserve today's output.

| Test group | Minimum coverage |
| --- | --- |
| Client/API contract | All six choices, a supported border, regeneration, preview/commit identity, invalid configuration |
| Persistence | Prefix collisions, reused seeds, isolated campaigns, rollback, restart, legacy migration, active revision |
| Physical world | Settlement eligibility, land/sea routes, adjacent path segments, drainage correctness, cave passability, city scale |
| Border strategies | Non-empty usable second zones, valid cross-map endpoints, unsupported pairs, reversed order, contiguous surface areas |
| Knowledge | Player/host projections, hidden and secret sites, rumored destinations, full mapping, discovery persistence |
| Gameplay integration | Actual movement/progress, costs, transport requirements, local encounters, returning home |
| Causal content | Event effects, faction assets, supply dependencies, truthful rumors, unique entities |
| Reproduction/expansion | Canonical world equality, independent random streams, saved structural area, matching boundary contracts |

Retain the exact reproduction seeds from section 2 as regression cases, but also assert general invariants. A fix that special-cases those seeds is not acceptable.

For the broader acceptance run, follow the original plan's proposed coverage of at least 200 seeds per single-zone profile and 100 per supported pair/mode. Record generation failures/retries and structural fingerprints that exclude names. Normalize rotations/reflections when evaluating diversity. Determine practical thresholds from reviewed outputs; do not interpret a large number of unique random biome lists as proof of coherence.

Prepare a small visual atlas of representative surface, maritime, underground, urban, and distant-connection maps. Inspect geography and expedition choices: a route can look convincing while its stored endpoints or transport requirements are wrong. Include a reproduced seed and an expanded saved region.

Build and test commands remain `npm run build` and `npm test`. These are necessary checks, but release acceptance also requires the new targeted and integration tests above. Do not count a layer record, a profile list, or an unused helper as a completed playable feature.

## 7. Definition of done

- [ ] R1: campaign selection and regeneration use the requested setting/configuration.
- [ ] R2: every offered topology and join generates playable maps and valid connections.
- [ ] R3: terrain, water, settlements, havens, and route modes are physically consistent.
- [ ] R4: revisions and campaign references survive seed reuse, collisions, and failed writes.
- [ ] R5: all generation entry points validate input and reject invalid worlds atomically.
- [ ] R6: drainage accumulation, classification, naming, and persistence agree.
- [ ] R7: geographic knowledge and site discovery remain separate in server responses.
- [ ] G1: structural geography is saved and expansion respects established boundaries.
- [ ] G2: history, support, factions, and rumors form meaningful linked content.
- [ ] G3/G4: travel and return use actual locations, requirements, and a consistent clock.
- [ ] G5: configuration options and reproduction claims are implemented and persisted.
- [ ] G6: regression, integration, multi-seed, and visual review evidence is recorded.

Completion should be reported with the fixing commit(s), test evidence, representative seeds, and any remaining explicitly deferred items. Until these gates are satisfied, describe the system as a partial procedural implementation rather than the completed zone-based map engine.
