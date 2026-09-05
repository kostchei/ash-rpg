# Hex-crawl gameplay review: tavern to adventure site

Reviewed 2026-09-03 against the **working tree**, including uncommitted remediation changes. Git HEAD is `48fb3ad`; HEAD alone does not describe the implementation reviewed here.

References: [remediation plan](remediation_plan.md), [zone-based procedural hex maps](zone_based_procedural_hex_maps.md), [wilderness procedure](../oracles/03_wilderness_and_hex_engine.md), [exploration rules](../rules/08_exploration_and_crawling.md), [Adventure Path Engines](../oracles/07_adventure_path_engines.md), and the authored paths [Domains of Dread](../adventure_paths/01_domains_of_dread.md), [The Mind Below](../adventure_paths/02_the_mind_below.md), and [The Vanishing Middle](../adventure_paths/03_the_vanishing_middle.md).

**Conclusion:** the map-generation foundations have progressed, but the playable expedition loop is incomplete. The client does not request party movement. The new server movement action changes coordinates without enforcing the journey. Tavern leads, travel procedures, discovery, adventure-site play, and the existing adventure-path system need to share persistent world state. Where a path is active, it supplies recurring motives, clues, opposition, and consequences; the hex crawl supplies the party's choices about reaching and affecting those opportunities.

This is an assessment and implementation sequence, not a record of completed gameplay fixes.

The agreed general process is now specified in [Shared adventure-path and exploration process](adventure_path_exploration_process.md): adventure paths create connected content, taverns and exploration reveal it, and resolved deeds change the path and saved world. Use that process as the integration target for the remaining work below.

## 1. What has changed since the remediation document

The remediation document's opening re-verification is stale for the working tree. The current client has setting/border selection and a preview request. The server has `travel:move` and `site:discover`. There are revised region saves, hydrology changes, structural-region persistence, some additional layers, and site-discovery filtering.

These are foundations, not evidence that R1–R7 or G1–G6 are complete. In particular:

- Preview and campaign creation remain separate generation requests. With a blank seed, creation does not reuse the preview's minted seed. The preview is not a committed candidate. See [App.tsx](../../src/client/App.tsx#L235).
- `travel:move` exists, so the old claim that there is no movement handler is no longer correct. Its implementation still fails the spatial-travel acceptance criteria below.
- `zone:exit` no longer always selects Oakhaven, but it reads a `homeZoneId` that campaign state does not provide, then falls back to the current zone. It can return the coordinates home while keeping the wrong zone.
- Additional saved structural cells/layers do not make them accessible through the current 19-hex client projection.

## 2. Remaining work, in expedition order

### A. Make tavern leads point to real, persistent opportunities

**Current:** Sanctuary's settlement/tavern result lives in component state. `settlement:generate` runs the standalone settlement oracle, with no haven, region, or target-site context. Generated regions separately save four rumor records with target IDs, but campaign state does not publish that list. The haven exposes only one rumor string. Map-linked rumor templates also assert guardians or treasure without creating those facts. See [SanctuaryView](../../src/client/App.tsx#L906), [settlement handler](../../src/server/app.ts#L461), [region rumors](../../src/server/generators/procedural-region.ts#L876), and [campaign state](../../src/server/database.ts#L1272).

**Required:** persist the home establishment and present at least three distinct leads grounded in actual sites. Each lead needs its claim, source, known direction/route, uncertainty, and private target reference. Give the party useful differences in distance, preparation, danger, and opportunity. Selecting a lead should establish an expedition objective and show known approaches; it should not reveal the target's secrets or prevent choosing another direction.

**Gate:** a player can choose a tavern lead, identify where to begin traveling, and eventually find the corresponding site. Reloading preserves the establishment, known leads, and chosen objective.

### B. Connect the map controls to a safe movement action

**Current:** clicking a hex changes `selectedId`. The map does not read `partyLocation`, display a party marker, or emit `travel:move`. Its travel button still emits `wilderness:watch` with a manually selected forest/marsh/mountain biome. Revealing a hex is independent of moving. See [MapView](../../src/client/App.tsx#L1266), [hex selection](../../src/client/App.tsx#L1446), and [watch control](../../src/client/App.tsx#L1720).

**Required:** show the current party location separately from the inspected hex; offer valid next steps and known routes; let the party select destination/direction, travel mode, and the relevant action. Show known cost, requirements, progress, and arrival. Connect departure and arrival to the campaign phase. Establish who can commit a shared party action, with protection against stale or duplicate submissions from multiple devices.

**Gate:** selecting a hex only inspects it; taking a travel action visibly moves the shared party or advances an incomplete crossing. All connected clients agree after reload.

### C. Enforce geography using saved world truth

**Current:** [travel:move](../../src/server/app.ts#L912) accepts any destination among the projected hexes, without checking adjacency or requiring a valid connection. `fromHexId` can affect origin selection. The requested mode is logged but does not enforce the saved edge's allowed modes, requirements, or direction. Every arrival writes `layerId: "surface"`.

The handler uses the role-filtered `getState()` projection as its rules input. An unexplored target has no biome even for the host, so movement can use the fallback `Wilderness` terrain. Connection visibility can also differ by role. A player's knowledge must not determine physical cost or passability.

**Required:** resolve the origin from authoritative saved party state and load the real destination and connections. Use stable region/layer/location references. Permit ordinary adjacent overland travel where terrain allows it; require explicit passages, crossings, or journeys where the medium demands them. Enforce boats, carts, climbs, direction, blocked routes, and local scale. Do not require roads for every wilderness move. Apply position, time, resources, discoveries, and log updates atomically.

**Gate:** reject a nonadjacent ordinary move, an unsupported mode, a shaft without the necessary means, and a stale origin without changing campaign state. Host and player requests receive the same physical resolution. Valid journeys still work into fog without exposing hidden truth.

### D. Resolve travel one watch at a time

**Current:** the movement handler calculates or reads a watch cost, immediately writes the destination, and logs the number. There is no persistent travel progress or campaign watch clock. It trusts a client-provided `watchesTraveledToday`, defaulting to zero, and evaluates fatigue once with default character inputs. It does not apply fatigue to characters or consume supplies. `wilderness:watch` separately rolls weather and encounter text without advancing time or movement. See [movement resolution](../../src/server/app.ts#L945), [wilderness handler](../../src/server/app.ts#L893), and [travel helpers](../../src/server/rules.ts#L282).

**Required:** save the calendar/watch, action in progress, remaining travel effort, daily weather, and applicable party/character resources. Resolve navigation, delays, hazards, discoveries, and encounters at the proper intervals. A multi-watch crossing must allow interruption and continuation. Apply forced-march checks to the traveling characters using persisted history and their actual abilities. Charge daily rations/water at the defined boundary, once, including rest and waiting; apply environmental modifiers only when relevant.

The documentation already describes four six-hour watches. The exploration rules still describe an eight-hour long rest, and the wilderness diagram suggests weather per watch while its weather section says dawn. Reconcile rest duration, weather timing, and fatigue/exhaustion effects in a versioned rules profile before wiring deductions. Do not silently change legacy campaigns' pacing. Keep light tracking conditional on the documented darkness rules.

**Gate:** a three-watch journey consumes three resolved watches, can pause for an encounter or camp, survives restart, and advances resources/time exactly once. Navigation failure changes progress or position according to the chosen rules. Rest has a cost and effect appropriate to the current location.

### E. Make discovery and encounters interactive, local procedures

**Current:** hidden-site filtering has improved, but [site:discover](../../src/server/app.ts#L981) accepts a supplied site ID without checking the party's position, the site's campaign/active-region ownership, search eligibility, or action cost. There is no corresponding search control. Revealed connection summaries are returned without filtering hidden destination knowledge. Travel does not invoke local hazards or encounters; the separate wilderness roller uses three generic tables.

**Required:** add deliberate actions such as travel, search, forage, camp, wait, and retreat. Distinguish noticing a visible landmark from discovering a hidden site. Derive events from local terrain, zone, season, and faction activity. Present warning signs and choices to avoid, investigate, negotiate, or fight. Connect a triggered encounter to persistent encounter state and pause travel until its outcome permits continuation.

Keep danger attached to the place. The current encounter generator can scale a variant using average party level; it should not redefine an established site's threat when the party arrives. See [encounter:start](../../src/server/app.ts#L1019). Authored adventure paths also specify encounter budgets and party-size limits, including hazard costs and reinforcement waves. Preserve those explicit path rules when creating eligible encounters; distinguish them from silently rescaling an already established creature or site.

**Gate:** a remote hidden site cannot be discovered from home; scouting does not reveal every secret; a local threat can be detected and avoided; an encounter interrupts the journey and its resolution persists.

### F. Enter and revisit the actual adventure site

**Current:** the map's sites are a list of names/kinds. There is no site-entry action. `dungeon:generate` creates a generic next room without a site reference. Rooms are stored as a campaign-wide sequence, and the phase control can change to dungeon without arriving at an entrance. See [site list](../../src/client/App.tsx#L1596), [dungeon handler](../../src/server/app.ts#L997), and [room persistence](../../src/server/database.ts#L149).

**Required:** persist the active site, entrance/exit location, and its adventure state. Bind rooms, occupants, hazards, treasure, discoveries, and resolved changes to that site. Validate arrival and access before entering. Allow the same site to be left and revisited without regenerating its rooms or restoring taken treasure. Support ruins, shrines, settlements, and other encounters without requiring every destination to become a dungeon.

**Gate:** following a particular rumor reaches that particular adventure; leaving returns to its overworld entrance; revisiting restores the same changed site.

### G. Make return, rest, and the next expedition part of the same world

**Current:** `zone:enter` changes a label without traveling; `zone:exit` teleports to home coordinates and can retain the wrong zone. `party:rest` restores all HP without checking physical sanctuary or elapsed time. Movement does not update the phase or derive the zone from location. See [zone transitions](../../src/server/app.ts#L410) and [rest](../../src/server/app.ts#L577).

**Required:** use the same route/watch procedure for the return journey. Derive active zone and normal phase transitions from actual location and site context. Save the full home reference independently. Gate safe recovery/resupply by location and resolved time. Keep any host relocation tool explicitly administrative. Update journal knowledge, expended sites, and relevant faction/route changes on the existing world between expeditions.

**Gate:** the party can retreat before reaching its goal, pay the return cost, arrive at its actual haven, recover, and depart again into the same persistent world.

### H. Integrate the existing adventure-path system throughout the expedition

**Correction to the initial review:** adventure paths are an existing part of ASH's design, with some implemented helpers. They must be included in the core integration work, not replaced with a new generic quest system or deferred until after all exploration work.

**Existing design:** the [engine framework](../oracles/07_adventure_path_engines.md) defines distinct world processes, antagonist Requirements, asymmetric win conditions, recurring counterplay, permanent consequences, and path-specific forms of record keeping. The authored paths supply environments, clues, NPC roles, access opportunities, and outcomes. [Domains of Dread](../adventure_paths/01_domains_of_dread.md#implementation-in-the-table-companion) explicitly proposes optional hidden path insertions into settlement, wilderness, dungeon, encounter, rumor, and NPC generation. Ordinary campaign pressures are a separate supporting mechanism.

**Existing code:** [mind-below.ts](../../src/server/generators/mind-below.ts) supplies path creation across surface/cave/end environments, encounter premises and budgets, progress updates, per-character aquatic-access checks, and boss structure. [Its tests](../../tests/mind-below.test.ts) exercise these helpers. Inspection found no runtime imports from the app, database, client, or region generator. The current `campaign:complication` action uses the generic campaign oracle, not this path system. The other authored paths' state specifications are not implemented in the inspected runtime.

**Required integration:**

- Save the selected path instance and its hidden state separately from the public campaign snapshot, including its bindings to real NPCs, factions, sites, and connections. A path environment such as `red_spires` is not the same ID or concept as the map profile `red_sands`; define compatible placement/adaptation explicitly.
- Incorporate path geography and access needs during region/site generation. Reserve real descents, installations, clue sources, and later destinations with plausible connections. Preserve established geography when adding path content to an existing campaign.
- Let the tavern, local encounters, and site interactions draw eligible path content through one shared insertion interface. Persist what was placed and revealed; do not reroll identities, clues, or goals on every visit. For The Mind Below, retain its requirement that at least half of generated people and places remain ordinary regional content.
- Apply resolved deeds and expedition outcomes to the selected engine's own rules and saved world relationships. Do not advance every path once per travel watch, session, or arrival. Calendar-based behavior and neglect also need their authored triggers. Keep distinct path records and the permanent Toll rather than collapsing every engine into a six-step pressure clock. Reconcile the older Mind Below progress helpers with the broader engine specification before choosing the runtime schema.
- Enforce path access through the same movement/site-entry service. Reuse The Mind Below's aquatic-capability checks against persisted party equipment, blessings, and temporary effects. Surface clues must provide multiple discoverable preparation routes; an inaccessible underwater destination cannot become reachable merely by switching zones.
- Publish observable consequences and discovered clues, while keeping hidden path IDs, antagonist truth, internal budgets, and unrevealed state private. Preserve player choice to follow another lead, investigate out of order where access permits, retreat, or ignore the path. Apply the selected engine's consequences for those choices.

**Gate:** an ordinary-looking tavern lead can point to a real path-related site; traveling and investigating there reveals the appropriate evidence; resolving its situation changes the path and named world entities exactly once; returning produces eligible follow-up opportunities. An unrelated expedition remains possible. For a Mind Below descent, test both rejection without required aquatic capabilities and successful entry after acquiring a valid means, without leaking the hidden path to players.

## 3. Broader map work that still affects travel

Do not mark layered travel complete because layer rows exist. Public connection projection reduces endpoints to initial-window hex IDs using coordinates without preserving the layer; out-of-window endpoints become `??`. `getState()` reads the 19 public hex rows, and movement only searches those rows. The distant-journey connection points at a region that has not been materialized. See [endpoint projection](../../src/server/generators/procedural-region.ts#L951), [distant connection](../../src/server/generators/procedural-region.ts#L849), and [map state](../../src/server/database.ts#L1159).

Before offering these journeys, expose reachable saved layers/regions with unambiguous locations, build real destination maps, enforce passage and transport requirements, and distinguish district scale from regional scale. The initial playable expedition can be implemented in one valid surface region while these remain explicit outstanding original-plan requirements.

## 4. Verification performed

- `npm test`: **69 tests passed in 11 files**.
- `npm run build`: client and server build passed.
- Additional runtime probes used a temporary **in-memory** server/database; no saved user campaign was modified.

Using Red Sands seed `travel_audit_20260903`:

| Probe | Observed result |
| --- | --- |
| Request cart travel from `00` at `(0,0)` directly to `07` at `(0,-2)` | Accepted; party jumped two hexes, logged two watches, and remained in sanctuary phase. |
| Inspect target terrain before that move | Saved terrain was `Wind-Carved Ridges`; the handler's projected target had no biome. |
| Enter Morzomotha by zone action, then return to sanctuary | Coordinates returned to `(0,0)` but `activeZoneId` remained `dwellers_in_the_deep` in the Red Sands region. |
| Discover a hidden resource at `(-1,0)` while party was at sanctuary | Accepted and persisted without travel or searching. |
| Compare generated rumors with delivered state | Four rumor records saved; no rumor list in campaign state. |
| Inspect room schema | No region, site, or entrance reference; rooms belong only to the campaign. |

The current movement test checks a successful response, a positive cost, and a returned location object; its return-home check only asserts success. It does not prove path validity, clock changes, correct return zone, supply effects, or persistent site play. See [remediation test](../../tests/remediation.test.ts#L424).

## 5. Completion sequence and end-to-end gate

1. Define authoritative location, full home reference, expedition, site, clock, and optional adventure-path instance state; reconcile travel rules and path-specific progression. Include path geography/access constraints and bindings in the generation contract.
2. Implement validated movement and one-watch resolution, then connect party position and travel controls in the client.
3. Connect the saved haven's leads to persistent sites and expedition objectives, using the shared path-insertion interface where a path is active.
4. Add local navigation, discovery, encounter interruptions, camp/rest, and resource consequences; feed resolved deeds and appropriate expedition events into the selected path engine.
5. Complete site entry, persistent adventure state, exit, return, and resupply.
6. Verify the complete surface expedition, then apply the same location/time model to the required cave, city, maritime, and distant journeys.

**End-to-end acceptance:** create a campaign, gather three meaningful leads in its tavern, choose one, prepare, depart through valid hexes, resolve a multi-watch crossing and an interruption, discover and enter the intended site, change its state, leave, return through the wilderness, recover at the original haven, reload on host and player devices, and revisit the same site. Position, time, supplies, knowledge, encounters, and site changes must all agree. Include a retreat before arrival and an invalid-travel attempt; neither should bypass consequences or corrupt state.

Run this gate with an active adventure path as well: verify a placed clue, a path-relevant deed, a persistent consequence, and a subsequent lead or changed opportunity. Replaying an action or reloading must not award progress twice. Test an ordinary expedition without path insertion and an optional diversion so the integration preserves open exploration.
