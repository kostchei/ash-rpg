# Zone-based procedural hex maps

Status: research and implementation plan; no generator changes implemented by this document.

Prepared: 3 September 2026. Repository baseline: `dc229a4` (`map alpha`).

## 1. Intended result

Each new campaign generates a new, geographically coherent starting region grounded in either **one of the six Cursed Scroll settings** or **the meeting of two selected settings**. The selected settings determine the landscape, settlement economy, history, factions, creatures, travel methods, discoveries, and supernatural pressures. A seed determines their particular arrangement and relationships.

Hex `00` remains the central, fully mapped starting haven. Its form changes with its setting: a woodland refuge, defended oasis, northern harbor, river landing, subterranean refuge, or protected establishment in a canal city. The current north-to-south river and three fixed roads become examples of possible results, not requirements of every map.

The initial view retains 19 hexes for compatibility with the current app. It is a starting window into a larger region, not the complete extent of a Cursed Scroll setting. The published settings provide identities and content constraints; their published hex coordinates are not copied into the procedural layout.

Required behavior:

1. Choose a single setting, or two settings and a suitable kind of connection.
2. Generate a fresh seed automatically; allow an optional seed for reproducible campaigns.
3. Generate terrain, waterways, travel connections, settlements, historical remains, factions, and encounter habitats together.
4. Give the party several understandable expedition choices from its haven.
5. Save the result. Reloading, revealing a hex, changing the active zone, or advancing time must not reroll geography.
6. Extend the region consistently when exploration reaches its edge.

This plan uses “historically” in two senses: the history and societies described by the Cursed Scroll books, and real historical settlement patterns used as design analogies. The latter explain where people might live and how places depend on one another; they are not claims about the fictional world's canon.

## 2. Evidence and source boundaries

### 2.1 Local books actually consulted

The supplied path `D:\Code\Core\_Dark\tmp\extracted\_text\Hexcrawl\_Guidebook\_Desktop.json` does not exist on this machine. The matching file and all six Cursed Scroll books were found in:

`D:\Code\Core_Dark\tmp\extracted_text\`

The references below use the JSON `page_num` field. In the Hexcrawl Guidebook, the printed page number is generally one less than the JSON page number; use the JSON locator to avoid ambiguity.

| ID | Local source | Sections consulted for this plan |
| --- | --- | --- |
| G | [Hexcrawl_Guidebook_Desktop.json](D:/Code/Core_Dark/tmp/extracted_text/Hexcrawl_Guidebook_Desktop.json) | JSON pp. 9–10, 12, 14, 16–20, 26–30, 34, 41–43, 56: scale, danger, starting region, home base, rumors, travel, discovery, factions, example |
| CS1 | [Cursed_Scroll_1_-_Diablerie_V4-3.json](D:/Code/Core_Dark/tmp/extracted_text/Cursed_Scroll_1_-_Diablerie_V4-3.json) | JSON pp. 39–41, 43–44; hex-key contents: forest communities, marsh dwellings, old monuments, religious conflict, ruins |
| CS2 | [Cursed_Scroll_2_-_Red_Sands_V2-2.json](D:/Code/Core_Dark/tmp/extracted_text/Cursed_Scroll_2_-_Red_Sands_V2-2.json) | JSON pp. 31–33, 35–36; hex-key contents: desert travel, oases, camps, Alkesh, canyonlands |
| CS3 | [Cursed_Scroll_3_-_Midnight_Sun_V3-5.json](D:/Code/Core_Dark/tmp/extracted_text/Cursed_Scroll_3_-_Midnight_Sun_V3-5.json) | JSON pp. 37–39, 41; contents: seasons, sea travel, farming villages, sacred gathering places, underground holdings |
| CS4 | [Cursed_Scroll_4_-_River_of_Night_V1-4.json](D:/Code/Core_Dark/tmp/extracted_text/Cursed_Scroll_4_-_River_of_Night_V1-4.json) | JSON pp. 24, 26–27, 30, 32, 37: civilizations, river transport, locations, settled communities, volcanic and supernatural landscape |
| CS5 | [Cursed_Scroll_5_-_Dwellers_in_the_Deep_V1-3.json](D:/Code/Core_Dark/tmp/extracted_text/Cursed_Scroll_5_-_Dwellers_in_the_Deep_V1-3.json) | JSON pp. 26–27, 29–31: cave geography, climate, settlements, rivers, sea, surface access, ancient remains |
| CS6 | [Cursed_Scroll_6_-_City_of_Masks_V1-1.json](D:/Code/Core_Dark/tmp/extracted_text/Cursed_Scroll_6_-_City_of_Masks_V1-1.json) | JSON pp. 40–45; district contents pp. 50–65: Meridia's estuary, travel network, eight districts, factions, law |

Book prose and complete tables are not reproduced here. The plan records setting facts, paraphrased relationships, and new ASH design rules. Extracted text reveals content and table structure, but is insufficient to reconstruct illustrated map geometry; no precise published adjacency is inferred from a table of contents or a hex number.

Evidence labels used below:

- **Source basis:** directly supported by the local books or a linked external source.
- **ASH proposal:** a new rule, numeric tuning value, algorithm, or illustrative outcome proposed here.
- **Unverified:** a repository label or assumption that needs source reconciliation before becoming authoritative content.

The publisher also corroborates the broad identities of [Diablerie and The Gloaming](https://www.thearcanelibrary.com/products/cursed-scroll-zine-vol-1-diablerie), [Red Sands and The Djurum](https://www.thearcanelibrary.com/products/cursed-scroll-zine-vol-2-red-sands-pdf-shadowdark-rpg), and [Midnight Sun and the Isles of Andrik](https://www.thearcanelibrary.com/products/cursed-scroll-zine-vol-3-midnight-sun-pdf-shadowdark-rpg). The local copies are the primary evidence for CS4–CS6 in this plan; public product discovery did not provide equivalent useful detail for those volumes.

### 2.2 Historical and geographical research

These are limited analogies, not a claim that any setting represents an entire historical society.

| Evidence | What it supports | ASH design inference |
| --- | --- | --- |
| Wharram Percy includes houses, agricultural holdings, manors, church, tracks, and successive occupation and abandonment. [English Heritage](https://www.english-heritage.org.uk/visit/places/wharram-percy-deserted-medieval-village/history/) | A rural settlement sits within a worked landscape and changes over time. | Generate fields, paths, water access, rights, and older remains around a woodland settlement; do not scatter villages as unrelated icons. |
| Persian qanats carry groundwater by gravity to agricultural and permanent settlements, with reservoirs, mills, and communal management. [UNESCO](https://whc.unesco.org/en/list/1506/) | Water infrastructure can organize arid settlement and social obligations. | Djurum settlements need water provenance and access rights; a damaged conduit can affect several linked places. |
| The National Museum of Denmark describes most Viking inhabitants as living on farms, with only a small proportion in towns. [National Museum of Denmark](https://en.natmus.dk/historical-knowledge/denmark/prehistoric-period-until-1050-ad/the-viking-age/the-people/viking-homes/) | Northern societies should not be represented exclusively by raiders and forts. | Populate Andrik with farms, households, provisioning, and seasonal livelihoods as well as longboats. |
| Angkor includes settlements, monuments, routes, reservoirs, canals, and other hydraulic works. [UNESCO](https://whc.unesco.org/en/list/668/) | A tropical landscape can contain extensive inhabited and engineered terrain. | Black River ruins should relate to older settlements and waterworks, while living communities continue to shape the landscape. |
| Venice's lagoon includes fishing and artisan settlements linked into a canal-based urban system. [UNESCO](https://whc.unesco.org/en/list/394/) | A maritime city depends on its surrounding waters and specialized settlement network. | Meridia needs docks, markets, transport labor, food supply, and accessible water routes beyond decorative canals. |
| Karst terrain links soluble rock, caves, springs, sinkholes, and groundwater conduits. [USGS](https://www.usgs.gov/mission-areas/water-resources/science/karst-aquifers?page=0) | Surface and subsurface features have physical relationships. | Connect Morzomotha entrances and underground drainage to compatible surface geology; a cave exit is not simply a random border label. |
| Cave ecology is constrained by scarce food; surface organic inputs help support cave food webs. [National Park Service](https://home.nps.gov/ozar/learn/education/cave-biology.htm) | Darkness alone does not support a rich food economy. | Deep settlements require imported food, an organic input, or an explicitly magical energy source. Fungi cannot be treated as creating food energy from nothing. |

No population ranges, encounter percentages, or biome weights proposed below are historical measurements.

## 3. Repository audit and implications

The earlier expansion document contains stale descriptions of missing systems. Zone manifests and campaign phase transitions now exist. The missing part is integration into spatial generation and play.

| Current component | Observed behavior | Change required |
| --- | --- | --- |
| `src/server/generators/hex-map.ts` | Fixed 19-cell coordinates, fixed river and road membership, fixed elevations and keyed content; names vary. `theme` and `regionName` do not drive geography. | Keep coordinate helpers if useful; replace fixed assignments with a seeded, zone-aware pipeline. |
| `zones/*/manifest.json` | Six Cursed Scroll-inspired manifests plus Oakhaven; palettes and string lists rather than generative constraints. | Add validated geography, settlement, history, habitat, travel, and border profiles. |
| `scripts/ingest/create-zones.ts` | Contains another copy of the manifest content and can write it out. | Update or retire this writer when revising manifests, so it cannot restore outdated data. |
| `src/shared/types.ts` | `PublicHex` has no zone membership, stable site references, layered connections, or discovery records. `road` and `river` are singular strings. | Separate saved world data from player knowledge; introduce explicit edges and site entities. |
| `AshDatabase.createCampaign()` | Hardcodes `oakhaven_borderlands`; generates without a selected zone or saved seed. | Accept validated region configuration and persist generation metadata and world in one transaction. |
| `setActiveZone()` and `zone:enter` | Change the campaign's active zone label; do not select or generate a corresponding map. | Resolve the region and the party's actual location; zone changes must not repaint existing terrain. |
| `zone:exit` | Always returns to Oakhaven and sanctuary phase. | Return through a real saved connection to the appropriate haven or previous region. |
| `regenerateHexMap()` and `hex:regenerate` | Delete and replace the current hex rows; accept a theme that the generator ignores. | Generate a reviewable candidate and save a new revision when deliberately replacing a region. |
| `wilderness:watch` | Accepts only forest, marsh, or mountain; runs generic tables. | Derive habitat and travel procedure from the current hex/edge and its zone profile. |
| `getMonstersForZone()` | Silently ignores unmatched keys and falls back to the whole bestiary if nothing matches. | Validate references; never silently make all monsters native to a zone. |
| `rowToHex()` | Includes road, river, horizon rumor, exit, and elevation in the base object even when unexplored. | Apply explicit knowledge rules to each field and to connections. |
| `tests/hex-map.test.ts` | Requires the fixed river IDs and fixed exit locations. Regeneration test checks only count and haven reveal state. | Test coherence, seeded reproduction, zone identity, and structural diversity. |
| `src/client/App.tsx` | Offers generic themes and fixed biome travel choices; advertises procedural generation prematurely. | Add setting/border selection, actual previews, per-location travel, and appropriate map views. |

There is also a source-fidelity issue. Examples needing correction or provenance labels:

- The Andrik manifest emphasizes glaciers and perpetual auroras, but CS3 also describes farming villages, pine woods, river lands, and distinct seasonal lighting. “Always frozen” is not an adequate profile.
- Morzomotha's entry text says “Great Sinkhole in Hex 06,” while the fixed map's great karst sink is `18`. Both references should become a generated connection to a site ID.
- CS6 names the city **Meridia** and supplies eight districts and several specific factions. The current generic “Masked Syndicate” is not a replacement for the source's separate faction relationships.
- Labels such as “Coven of Bittermold,” “Jungle Rangers,” and “Deep Delver Guild” should be marked as ASH adaptations unless reconciled with the source. Do not promote manifest inventions into published canon.
- A static audit of `data/bestiary/monsters.json` found unmatched manifest IDs in every zone, including all eight entries in `city_of_masks`, `howler` in the Gloaming, and `basilisk_cultists` in Black River. This is a reference audit, not a full assessment of stat-block correctness or runtime fallback coverage. Resolve aliases and validate the final loaded catalog before relying on these pools.

Relevant files: [generator](../../src/server/generators/hex-map.ts), [database](../../src/server/database.ts), [event handlers](../../src/server/app.ts), [shared types](../../src/shared/types.ts), [zone writer](../../scripts/ingest/create-zones.ts), [existing map tests](../../tests/hex-map.test.ts), [zone tests](../../tests/zones.test.ts).

## 4. What the Hexcrawl Guidebook changes

The guide supplies principles and a particular travel procedure. Its Thornwall example is not a template whose numbered locations should become permanent ASH map assignments.

| Guide principle and locator | Application to this engine |
| --- | --- |
| Six-mile regional hexes; resolve travel by watches, not just arrivals. G pp. 9, 16, 26–30. | Save scale and travel progress separately. A forest crossing can consume more time and checks than a road crossing. |
| Danger belongs to places and should be signaled. G p. 10. | Establish threat territories at generation; do not scale a dragon to the party when discovered. Generate tracks, victims, warnings, and detours. |
| Start small and concentrate detail near likely travel. G pp. 14, 17–18. | Fully generate regional geography, while allocating more developed sites near accessible routes; quieter terrain remains useful. |
| A dependable home base launches expeditions. G p. 19. | Hex `00` contains a refuge with rest, resupply, local knowledge, and a way out. In Meridia this refuge can be one establishment inside a dangerous city. |
| Rumors refer to actual places and should offer different directions. G p. 20. | Store target references and generate wording from real routes; provide at least three distinct initial leads. |
| Visible and hidden discoveries have different functions. G p. 34. | Store visibility and search requirements independently of whether a site exists. |
| Factions act between expeditions and change encounter conditions. G pp. 41–43. | Update control, patrols, supplies, and rumors on the existing map. Do not reroll the map to simulate change. |

### 4.1 Resolve scale and rules conflicts explicitly

**ASH proposal:** keep the first screen at radius two, or 19 regional hexes, with a six-mile scale. Build support for larger regions and linked detailed maps. A radius-two map cannot reproduce the guide's suggested danger bands of 1–2, 3–5, and 6+ hexes from home. Do not relabel the outer ring as six hexes away.

Instead:

- Keep ordinary routes immediately outside the haven relatively manageable.
- Put optional exceptional threats behind clear warnings, difficult access, or optional site entrances.
- Base remoteness on actual route cost and access to refuge, alongside persistent threat territories.
- Let the larger region supply genuinely distant danger as the party expands its range.
- If a host chooses a compact, more dangerous frontier, label that as an ASH campaign option.

The guide uses four daily watches, with three for travel and one for rest. The existing ASH wilderness document describes three watches total. CS2 and CS3 also use encounter intervals different from CS4, whose travel is expressed in hexes per day; CS6 uses a much smaller city travel unit. These are incompatible if applied simultaneously.

**Recommended default for the implementation:** introduce an explicitly versioned ASH travel profile using the guide's four-watch framework for regional exploration, with terrain effort of 1/2/3 watches for easy/moderate/hard passage. Preserve source-specific environmental pressures, transport requirements, and seasonal effects, but adapt numerical pacing into that single clock. Update the existing ASH wilderness document in the same implementation phase. Existing campaigns retain their legacy rules profile until deliberately changed. City journeys use a separate local clock; time spent there advances the common calendar without counting a city trip as six miles.

Do not silently import every book's encounter checks or resource deductions on top of the ASH clock. Named book scenarios that need their original travel mechanics should use a clearly selected rules profile instead.

## 5. Shared population logic

### 5.1 Generate reasons for places before their names

Use this dependency order:

`geography → water and resources → settlement sites → transport → occupation history → current control → threats and discoveries → rumors`

This is an iterative sequence: an older route can determine the next settlement, and a historical collapse can reroute later trade. The important constraint is that each result has an explanation in the saved world.

Every permanent settlement needs:

- A usable water supply, with source and reliability.
- Food production, gathering/fishing grounds, imports, or an explicit magical support system.
- A reason to occupy that location: crossing, harbor, ore, market, shrine, defensible refuge, fertile land, or comparable advantage.
- A reachable transport connection appropriate to its economy.
- A resident community with work, leadership, and relationships, rather than only adventurer services.
- A vulnerability connected to those dependencies.

Every ruin needs an original purpose, a relative age, a reason for disuse, and its present condition or occupants. Every fort needs something it controls or protects. Every road needs endpoints and a reason for construction. An abandoned road may retain its former endpoints even if the destination is now a ruin.

### 5.2 History as a small causal model

Generate two to four local historical layers, selected from the zone's permitted themes. These are **ASH inventions unless individually marked as sourced facts**:

1. Earlier occupation: sacred site, older settlement, extraction site, engineered watercourse, burial landscape, or nonhuman construction.
2. Expansion: route building, cultivation, political unification, temple influence, trade boom, or mining.
3. Disruption: flood, exhausted resource, war, succession dispute, abandoned infrastructure, supernatural incursion, or altered trade.
4. Present response: resettlement, scavenging, restoration, contested ownership, refuge, or a new faction.

Each selected event must affect at least two world records. Example: a failed sluice creates a drowned road and a surviving ferry monopoly; an abandoned shrine supplies masonry for a nearby fort and a grievance for its former custodians. Avoid generating a long chronology that has no consequences on the map.

Keep geological age, ancient occupation, and recent political events distinct. A week-old feud cannot explain a fossil seabed. Ruins may also be abandoned for mundane reasons; a monster does not need to have destroyed every empty village.

### 5.3 Settlement size and density

Proposed population bands for new ASH settlements: a camp or hamlet has tens of inhabitants, a village has low hundreds, and a substantial local town has hundreds to low thousands. These are game tuning categories, not historical census claims. A named source city retains its sourced scale when explicitly included: for example, Alkesh is described at 70,000 in CS2 p. 35 and Meridia at 90,000 in CS6 p. 40. Such cities require hinterland and trade beyond a single 19-hex window.

Place people according to capacity and opportunity; never roll a city independently in each hex. A regional hex can contain fields, hamlets, and a primary site together. A map marker represents its most useful adventure information, not the only inhabitant or structure within six miles.

Party ancestry preferences may influence the NPCs the party meets, preserving the existing NPC generator's intent. They should not silently rewrite the established population of an entire region. Zone society, faction membership, profession, and personal disposition remain separate fields.

## 6. Profiles for the six settings

All budgets in this section are initial ASH tuning proposals for the **18 non-haven regional cells**. They are ranges for occupied settlement hubs, not population counts or hard quotas for every seed. Selected source cities and urban detail maps are exceptions handled explicitly.

### 6.1 Diablerie — The Gloaming (`the_gloaming`)

**Source basis:** forest and swamp, woodland workers and settlements, marsh inhabitants, old standing stones, religious orders, abandoned strongholds, and predatory supernatural influence. The hex key connects communities to nearby dangers and older institutions. CS1 pp. 40–44.

**ASH geography proposal:** a woodland-and-wetland mosaic with drained ridges, pockets of farmland, shallow valleys, and boggy depressions. Forest should form connected tracts; swamps occupy plausible low ground. Rivers or brooks may enter from outside the window. A local glacial source is unnecessary.

**Populate with:** two to four settlement hubs beyond the haven; woodcutters, charcoal workers, fishers, trappers, small farms, and religious households. Place water access and workable clearings first. A marsh village should have raised or otherwise flood-adapted structures and a means of reaching dry land. Tollhouses and patrol posts belong at maintained crossings or contested roads.

**Historical layers:** older sacred landscape → later clearings and fortified/religious holdings → fragmentation and abandoned sites → present encroachment. Treat this sequence as a generated local interpretation; source-specific institutional history can be retained in named scenario content.

**Faction pattern:** settled interests, an organized religious presence, and one concealed or predatory interest. Give them overlapping practical concerns such as a bridge, shared well, lost burial ground, or timber rights. Do not equate every rural healer with a villain.

**Creatures and discoveries:** separate woodland predators, marsh creatures, humanoid travelers, occult manifestations, and unique named entities. Put lairs in suitable habitat and make their evidence visible along travel routes. Include useful plants, safe lookout points, resources, and old paths alongside curses.

**Haven and routes:** a defended clearing, priory guest refuge, or bridge hamlet with dependable protection. Generate one to three meaningful road/trail connections; boats or causeways may be better than additional roads.

**Must vary:** the wetland's location and extent, forest openings, river bends, haven approaches, route crossings, ruined holdings, and source of local pressure.

**Reject:** every hex being a cursed ruin; three capital/coast/mine roads regardless of geography; all villages occupying floodwater without adaptation.

### 6.2 Red Sands — The Djurum (`red_sands`)

**Source basis:** oases, natural springs, mobile communities, caravan activity, a large city supplied by springs and aqueducts, canyonlands, and severe weather. CS2 pp. 32–36. This setting is not exclusively dunes, and its society is not exclusively raiders.

**ASH geography proposal:** rocky desert, dunes, salt flats, wadis, escarpments, and scarce watered pockets. Dry channels follow drainage even when they contain no permanent water. Mountains may be outside the map. Persistent surface rivers are optional and need a credible upstream source.

**Populate with:** one to three permanent hubs beyond the haven, plus zero to two seasonal/mobile camps. Assign each an oasis, well, spring, engineered supply, or explicit supernatural supply. Mobile camps also need a seasonal water and grazing itinerary. Large settlements require maintained infrastructure or substantial imports.

**Historical layers:** older wells and sacred/burial sites → caravan or irrigated settlement growth → disruption of water or political control → current competing claims. A dry ruin might have an exhausted supply; an active oasis might occupy a much older transport stop.

**Faction pattern:** water custodians, caravan or market interests, mobile communities, and a competing power. Retain distinct motives; mobility, profession, and ancestry are not automatic hostility tags.

**Creatures and discoveries:** canyon and escarpment lairs, dune-adapted threats, oasis wildlife, caravan encounters, and rare sorcerous locations. Water and shade are valuable discoveries. A dangerous creature at an oasis changes the usable supply network, not just the encounter list.

**Haven and routes:** a defended oasis or caravan refuge. Build routes between usable water stops and market exits. Measure feasibility using travel time, carried supplies, and the selected weather profile; do not apply a universal real-world distance between caravan stops.

**Must vary:** water locations and reliability, canyon routes, dune barriers, caravan branches, ruins' former water systems, and the contested resource.

**Reject:** a randomly placed thriving village with no supply; a compulsory glacier-to-delta river; unavoidable starting journeys beyond the party's initial supply capacity.

### 6.3 Midnight Sun — The Isles of Andrik (`midnight_sun`)

**Source basis:** mountainous islands, seasonal lighting, wind-dependent sea travel, farming and fishing villages, warrior politics, sacred gatherings, woods, and deep mountain holdings. CS3 pp. 38–41. The source explicitly includes farming settlements, so the current exclusively glacial emphasis needs broadening.

**ASH geography proposal:** an archipelago or indented island coast with high ground inland, sheltered bays, freshwater streams, wooded slopes, cultivable valleys, and exposed cold heights. A seed chooses season separately from permanent geography.

**Populate with:** two to four inhabited hubs beyond the haven, with lesser farmsteads represented in suitable land. Harbors need shelter and usable landing sites; food supply can combine agriculture, livestock, fishing, and trade. An exposed cliff is not automatically a workable harbor.

**Historical layers:** older sacred and burial sites → settlement and maritime connections → changing alliances and inheritance claims → present disputes. Preserve the importance of oath, assembly, and ritual sites without reproducing one fixed political plot on every seed.

**Faction pattern:** two local communities or leaders with conflicting claims, plus a religious or mediating interest. Their supplies and social connections can cross political boundaries.

**Creatures and discoveries:** distinguish terrestrial, coastal, open-water, and highland pools. A sea serpent belongs on navigable water, while inland signs can be rumors or washed-up evidence. Include boat repair, sheltered anchorages, salvage, pasture, and navigational landmarks.

**Haven and routes:** a sheltered harbor with access to suitable transport. Sea lanes are primary regional connections; tracks link nearby inland sites. Supply boat access at the start if all viable expeditions require a vessel.

**Must vary:** island shapes and count within the window, harbor locations, sea passages, cultivable valleys, inland barriers, and community relationships.

**Reject:** land roads across open sea; all hexes covered in glaciers; permanently identical daylight; one safe harbor with no accessible onward transport.

### 6.4 River of Night — The Black River (`river_of_night`)

**Source basis:** living Itzalca communities descended from an earlier civilization, basilisk cult influence, older and alien structures, farms and fisheries, tributary travel, mountains, volcanic terrain, and dangerous river locations. CS4 pp. 24, 26–27, 30, 32, 37.

**ASH geography proposal:** generate the river basin first: a trunk entering and leaving the region, suitable tributaries, floodplain and raised banks, upland forest, and optional volcanic terrain. Wetland and mangrove classifications require suitable conditions; mangroves are a coastal/tidal variant, not a synonym for all inland jungle.

**Populate with:** two to four living hubs beyond the haven, placed around river access, food production, fishing, and safer ground. Communities have history, knowledge, craft, and agency. Expedition camps are a separate class with their own supply links and relationship to residents.

**Historical layers:** distinguish earlier local civilizations, later cult influence, and separately tagged alien structures. Generate local connections among former fields, routes, reservoirs, monuments, and present habitation. Do not assert a newly invented universal chronology for every source civilization.

**Faction pattern:** at least two interests from resident communities, cult institutions, independent travelers, expedition organizers, or exceptional powers. A village may contest an expedition's access or interpretation of a site without being hostile to all outsiders.

**Creatures and discoveries:** river wildlife, canopy and ground fauna, territorial groups, remnants of older powers, and rare alien zones. Keep the extreme supernatural pool localized and signaled. A volcano and a polluted reach can alter access, river hazards, and downstream encounters together.

**Haven and routes:** a protected landing on safe ground. Canoe routes, upstream/downstream costs, portages, and maintained footpaths replace generic radiating highways. A raft is not interchangeable with a vessel that can travel upstream.

**Must vary:** river direction and bends, tributary junctions, barriers and portages, location of living communities, historical engineering, and expedition pressures.

**Reject:** an empty jungle populated only by temples and enemies; independent river fragments; every river flowing toward an invented sea inside the starting window.

### 6.5 Dwellers in the Deep — Morzomotha (`dwellers_in_the_deep`)

**Source basis:** a lightless cave-and-tunnel region with different passage sizes, underground rivers and sea, distinctive communities, old structures, dangerous vertical access, and a source-specific psychological pressure. Its climate is described as cool and humid without normal surface weather or seasons. CS5 pp. 26–31.

**ASH geography proposal:** build a passage graph with chambers, bottlenecks, shafts, chasms, water routes, and optional layers. Hex coordinates locate regions of the underworld; touching hexes are not automatically traversable through solid rock. Store depth separately from surface elevation.

**Populate with:** one to three inhabited hubs beyond the haven. Each needs a declared food/energy basis, water, trade or production, and access through usable passages. Large or fantastical societies may depend on an explicit supernatural source; record its limits and consequences. A fungus garden needs substrate or another energy input.

**Historical layers:** natural caves and older deposits → ancient habitation or intervention → mines, passages, and later settlements → collapse, isolation, or new access. A lost god or alien installation is a rare historical anchor, not random decoration in every cavern.

**Faction pattern:** local inhabitants, an organized collector/trader/power, and a competing or excluded group. Their control is concentrated on passages, docks, bridges, and food sources. Not all interesting residents are wandering combatants.

**Creatures and discoveries:** vertical, dry-cave, wet-cave, aquatic, settlement, and singular supernatural habitats. Sound, light, air movement, water, and vibration provide clues in place of distant surface views.

**Haven and routes:** a protected enclave, defensible expedition camp with supplies, or negotiated refuge. It needs a stated basis for safety. Do not use a source location with a time-limited hospitality rule as an indefinitely safe haven without adapting and labeling that change.

**Must vary:** traversable adjacency, passage loops, choke points, depth changes, watercourse connections, entrances, support economy, and local ancient remains.

**Reject:** treating every adjacent hex as an open route; rain and blizzards underground; sources and sinks that ignore depth; limitless edible mushrooms with no support explanation.

### 6.6 City of Masks — Meridia (`city_of_masks`)

**Source basis:** Meridia is a seaside estuary city where the Trematora River meets the sea. It has canals, bridges, streets, eight differentiated districts, and multiple competing organizations. CS6 pp. 40–44. District transport and politics are central to this setting.

**ASH geography proposal:** use two linked scales. At regional scale, generate the estuary, approach roads, food-producing hinterland, satellite settlements, harbor, and the cell containing the city. At local scale, generate a connected district/location graph. The eight source district roles are castle, university, temple, high, market, artisan, low, and slum. They are not nineteen independent wilderness biomes.

**Populate with:** the city as a single major urban system plus one to three regional satellite hubs where appropriate. Local districts contain households, labor, commerce, institutions, and sites. Use relative elevation, flooding, accessibility, historical growth, and political investment to influence placement. Wealth and danger should not be a simple distance-from-center formula.

**Historical layers:** earlier settlement or sacred nucleus → river and maritime commerce → district growth and infrastructure → present strain and competing authority. The source's political and institutional facts can anchor a campaign; the exact rearranged urban growth sequence is an ASH adaptation.

**Faction pattern:** preserve separate roles for the Duke, House of Seren, Shroud, Bardic College, and useful minor organizations when using named source content. Give them assets and presence in multiple districts. Criminal, political, and religious control may overlap.

**Creatures and discoveries:** people, faction activity, opportunities, investigations, crimes, and civic hazards dominate most public districts. Supernatural threats need suitable concealed sites, sewers, isolated spaces, or a visible crisis. Populate guild contacts, useful services, secrets, shortcuts, and disputed property.

**Haven and routes:** the protected inn, courtyard, guild house, or other refuge is the sanctuary; the whole metropolis is not automatically safe. Regional Hex `00` can be known, while hidden rooms and secret sites remain undiscovered through separate site-level knowledge. Land and canal routes must both work; canals connect navigable districts through actual docks and waterways.

**Must vary:** district placement and subdivision, bridges and docks, route alternatives, faction assets, hinterland connections, and local opportunities. The eight district identities may remain recognizable while their geography and associated generated locations change.

**Reject:** nineteen six-mile city districts; one threat tier per wealth category; arbitrary independent canals; replacing all source factions with one generic syndicate.

## 7. Zone borders and joins

### 7.1 Four kinds of connection

The books establish individual settings. The evidence examined here does **not** establish that every pair shares a canonical physical border. The following connections are ASH campaign constructions.

1. **Surface transition:** two compatible landscapes share a gradual boundary, watershed, coast, foothill belt, or managed frontier.
2. **Vertical connection:** a cave mouth, mine, sinkhole, sea cave, or other access joins surface and underground regions. It changes map layer rather than latitude.
3. **Urban interface:** a city meets its hinterland, forest approach, estuary, or trade frontier. City density fades through suburbs, fields, docks, and villages.
4. **Distant connection:** a voyage, extended pass/overland route, or explicitly selected supernatural gateway joins settings that should not be squeezed into adjacent six-mile cells. A transport link is displayed as a journey to another region, with its distance/time; a portal is visibly exceptional.

The default border picker should offer compatible local joins. All fifteen pairings can be supported through appropriate connection modes, but the interface must distinguish a nearby physical border from a distant linked region. Selecting two climates does not authorize silently adding magic or compressing hundreds of miles into a single hex.

### 7.2 Pairing matrix

| Pair | Recommended ASH connection | Population and conflict at the join | Local 19-hex boundary? |
| --- | --- | --- | --- |
| Gloaming + Djurum | Mountain watershed with woodland on one side and dry foothills on the other; otherwise a longer caravan connection | Pass refuge, water stop, timber exchange, contested crossing | Conditional: show transitional foothills; never immediate wet swamp to dune sea without a mechanism |
| Gloaming + Andrik | Cool wooded coast and nearby island approaches | Fishing harbor, timber/boat trade, inland refuge, coastal political tension | Yes, using a temperate maritime margin of Andrik |
| Gloaming + Black River | Broad climatic transition or a deliberately supernatural forest boundary | Frontier landing, guides, changed cultivation, disputed old sites | Usually a larger linked region; local only with a justified shared climate or explicit anomaly |
| Gloaming + Morzomotha | Sinkhole, limestone cave, old mine, or descent beneath a ruin | Surface supply settlement, underground refuge, timber and food exchange | Yes, on linked layers |
| Gloaming + Meridia | Forested river approach to the urban hinterland | Woodcutters, estates, toll bridge, food and timber markets | Yes, with an urban inset |
| Djurum + Andrik | Extended sea/land journey; supernatural gateway only by selection | Caravan-to-port transfer, long-distance goods, journey logistics | No ordinary local climatic border |
| Djurum + Black River | Rain-shadow escarpment with dry foothills and a wetter basin; otherwise a longer connection | Pass market, irrigation dispute, river access, different crops and transport | Conditional; not saturated jungle directly beside an unqualified salt desert |
| Djurum + Morzomotha | Mine, cave, or water-system access leading to deeper passages | Well custodians, delvers, mineral trade, threatened aquifer | Yes, on linked layers; the descent may itself be a journey |
| Djurum + Meridia | Dry coastal hinterland meeting an externally supplied river estuary, or a caravan route to it | Caravan quarter, warehouses, water rights, customs | Conditional; the city's river needs a wetter catchment beyond the desert |
| Andrik + Black River | Long sea passage; supernatural passage only by selection | Two destination ports and an expedition supply chain | No ordinary local climatic border |
| Andrik + Morzomotha | Mountain workings, a fjord cave, or a sea-cave descent | Harbor supplies, deep craft trade, dangerous tidal or vertical access | Yes, on linked layers |
| Andrik + Meridia | Maritime trade route | Northern merchants, foreign dock community, timber/fish imports | Usually distant: a merchant quarter is not the northern island biome |
| Black River + Morzomotha | Sinkhole, volcanic passage, or underground continuation of a watercourse | River landing, subterranean residents, supplies and contested access | Yes, with appropriate geology and layer transitions |
| Black River + Meridia | Warm river corridor into a coastal estuary | Agricultural villages, docks, warehouses, boats, upstream interests | Conditional ASH adaptation; do not claim the Black River and Trematora are canonically the same river |
| Morzomotha + Meridia | Cistern, old excavation, catacomb, or sewer connection leading to a deeper system | Sanitation workers, smugglers, delvers, water and passage rights | Yes, on linked layers; not every sewer must reach Morzomotha |

### 7.3 Generating a real border

For a surface pair:

1. Select the connection mechanism before drawing the boundary.
2. Choose an orientation and generate a contiguous dividing feature or transition corridor.
3. Seed one connected core for each selected zone and grow them with terrain-aware costs. Use a shared climate/geology model; the zone labels cannot override physical contradictions.
4. Put the sanctuary at a feasible crossing or near the transition, within one traversable step of a route toward each zone.
5. Generate a narrow mixed area where appropriate, with one coherent settlement economy and a shared resource or access question.
6. Preserve a route into each zone and at least one meaningful choice about how to cross or bypass the dividing feature.

**Initial tuning proposal:** across the 18 non-haven cells, aim for at least five cells primarily associated with each zone and two to six transition cells, with the remaining cells assigned according to terrain feasibility. These are coherent regions, not per-cell coin flips. Small adjustments are preferable to violating geography. This count does not apply to vertical, urban-detail, or distant-connection modes.

For vertical pairs, allocate zone identity by layer and connect them with explicit entrance records. For city pairs, allocate regional and district maps separately. For distant pairs, create a starting region and a connected destination region or reserved destination, not a falsely adjacent blended patch.

### 7.4 Border influence is not a mixed biome

A hex should distinguish:

- Primary setting and any secondary cultural or supernatural influence.
- Physical terrain and climate.
- Current political control, which may be contested.
- Transport connections and travelers using them.
- Resident habitat and encounter eligibility.

A northern trader in Meridia does not make that district tundra. An underground creature at a surface entrance needs an accessible route and a reason to emerge. A political border can cross one continuous forest without changing the trees.

For encounters, select the scene category first: resident, traveler, faction activity, sign, environmental event, or exceptional intrusion. Apply habitat/access filters before zone weights. At a border market, secondary-zone travelers may be common while secondary-zone wildlife remains absent.

## 8. Procedural generation design

### 8.1 Reproducibility contract

The seed is chosen randomly at campaign creation, then saved. The complete result is also saved. Reproduction requires:

`worldSeed + normalized configuration + generatorVersion + contentVersion + rulesVersion`

Use a specified, tested pseudorandom algorithm. Existing `RandomSource(maxExclusive)` is zero-based and can remain the sampling interface. Do not use `Math.random()`, timestamps, or filesystem iteration order inside the deterministic generation pipeline.

Derive separate streams for geography, settlements, history, factions, sites, names, and starting rumors. Sort candidate lists by stable keys before sampling. This keeps a new naming option from changing the river. Generate runtime events from separate saved streams or event counters so an encounter roll cannot alter future terrain.

Different seeds need meaningful statistical diversity, not a guarantee that every possible pair of seeds produces a unique finite map. A new seed can coincidentally resemble another; the engine must not merely choose one of a few rotated authored maps.

### 8.2 Spatial foundation

Axial coordinates provide consistent neighbor and distance calculations. Red Blob Games documents the coordinate and pathfinding foundations for [hexagonal grids](https://www.redblobgames.com/grids/hexagons/). Its [terrain generation discussion](https://www.redblobgames.com/maps/terrain-from-noise/) shows how coherent elevation and moisture fields can inform biome assignment, while [Mapgen2](https://www.redblobgames.com/maps/mapgen2/) demonstrates procedural island geography. These are implementation references, not complete solutions for ASH's settlement history, underground travel, or gameplay constraints.

**ASH proposal:** use the existing axial grid as a view into a generated region. Store canonical location keys using `regionId`, `layerId`, `q`, and `r`. Keep `00`–`18` as familiar display labels for the initial window; do not make two-digit labels the persistent identity of every future hex.

Generate a larger structural area than the visible window. A practical first implementation can use a radius-six regional skeleton: 127 cells per surface layer, with the initial 19 shown at higher detail. This radius is a tuning choice. It supplies catchment context, distant sites, and real travel distance without requiring full narrative detail everywhere.

Choose and reserve a viable haven within this area, then translate coordinates so it is `00`. In border mode, choose among feasible boundary crossings. If no site satisfies the constraints, retry deterministically with a recorded attempt number; do not force a port onto a cliff or irrigate a desert by renaming a hex.

### 8.3 Terrain and water

For surface settings:

1. Select profile-compatible landforms: basin, ridge system, escarpment, archipelago, estuary, or river corridor.
2. Generate coherent elevation, moisture, temperature regime, geology, and coast fields over the structural area.
3. Choose drainage exits and identify genuine closed basins.
4. Resolve unwanted drainage traps through limited carving or filling; retain intended lakes and terminal basins.
5. Generate flow connections with descending effective drainage height. On apparent flats, use a stable drainage rank to prevent cycles.
6. Accumulate contributing catchment to decide which channels are significant rivers, small streams, seasonal washes, or invisible drainage.
7. Assign terrain from the zone palette subject to those fields. Use region growth/smoothing to avoid isolated incompatible tiles.
8. Validate habitat transitions and haven candidates.

Ordinary rivers merge downstream. Branching is reserved for explicitly modeled deltas, distributaries, canals, or another documented mechanism. A river can enter and leave the visible window; its source and mouth do not both need to fit beside the sanctuary. Keep freshwater channels separate from tidal canals, seawater, dry wadis, and navigability.

For underground settings, first construct the traversable passage graph and depth profile, then water paths and cave habitats. Validate open passages separately from neighboring coordinates. For cities, generate site/district connectivity around the river, shore, higher ground, and existing infrastructure rather than applying a wilderness biome roll to each district.

### 8.4 Starting terrain weights

These are **proposed relative priors**, totaling 100 in each row; they are neither source table probabilities nor exact per-map percentages. Apply physical eligibility first, then neighbor compatibility. Exclude the special haven override from these proportions. Small maps may depart from the priors substantially.

| Profile | Initial terrain groups and weights |
| --- | --- |
| Gloaming | Woodland 45; wetland 25; heath/rough pasture 15; worked clearings 10; rocky ridge 5 |
| Djurum | Rocky desert 30; dunes 25; canyon/escarpment 20; dry steppe/wadi 15; salt flat 5; watered pocket 5 |
| Andrik | Open water 30; coast/fjord 20; wooded slope 15; cultivable/pastoral valley 15; mountain 15; persistent ice/high cold ground 5 |
| Black River | Upland/lowland forest 45; river corridor 20; wetland 15; cultivated/settled bank 10; mountain/volcanic ground 10 |
| Morzomotha | Dry traversable cave 25; wet cave 20; narrow passage 20; vertical/chasm region 15; underground water 15; worked/inhabited region 5 |
| Meridia regional area | Estuary/coastal water 25; cultivated hinterland 30; meadow/woodland 15; wetland 15; urban/suburban land 15 |

The Meridia district generator uses functional district roles instead of this terrain table. A Morzomotha terrain category describes a cave region; it does not promise every direction is open. Theme variants can change priors only within their setting's plausible envelope.

### 8.5 Settlement and route generation

Score eligible settlement candidates using water reliability, food/support capacity, transport access, defensibility, resource value, and existing occupation. Subtract flood exposure, untenable access, and immediate lair pressure. Use seeded weighted selection among good candidates; never accept a physically invalid candidate because its random roll was high.

Place the haven and principal economic anchors, then generate supporting settlements and connect them. Route costs include terrain effort, slope, water crossing, construction needs, and mode. Connect essential hubs first and add selected alternate routes so the network offers detours and loops. Avoid requiring a particular algorithmic road pattern to be visible in every result.

River crossings require a ford, bridge, ferry, or other explicit method. Sea routes require landing sites. Caravan routes require supply feasibility. Cave connections require an open passage. Urban waterways require connected canals and docks. Roads may converge on the same hex; model all connections rather than overwriting them in a singular `road` field.

Record infrastructure ownership and age. A faction controlling a bridge can tax transport; a broken bridge can redirect trade to a ferry; a forgotten tunnel can become a discovery that changes travel choices.

### 8.6 Sites, discoveries, and encounters

**Starting key budget proposal:** for the 18 non-haven cells, choose three to five major destinations, eight to eleven minor-feature cells, and leave the remainder as terrain-led cells with possible encounters. The categories are exclusive for this allocation; a major cell can still contain minor details. Existing inhabited hubs can count as major or minor destinations, so settlement placement does not inflate the budget.

Provide at least one useful resource/wonder discovery and one destination reachable through a manageable first expedition. Terrain-led cells still have stable geography and population context; “unkeyed” does not mean empty or physically undecided.

Generate site packages with dependencies rather than unrelated table results. For example:

`older conduit → failed section → water shortage → repair expedition → faction controlling access`

Each package selects valid locations, stores links, and generates a short present situation. Reusable named scenarios retain essential relationships and unique characters when included. Canonical names and exact scenario content are an optional source-content mode; generic procedural sites remain clearly ASH-authored adaptations.

Encounter eligibility should use terrain, water/depth, movement mode, settlement proximity, faction presence, season/time, and discovery state. Named unique entities receive stable world identities and are not duplicated by independent rolls. Wandering results can be signs, negotiations, labor, trade, movement, or environmental events; discovery must not always mean combat.

A variant monster remains compatible with its habitat and role. Encounter quantity and disposition can vary without rewriting the established location or automatically rescaling its threat to player level.

### 8.7 Validation and retries

Run validators after each major stage. Use bounded deterministic retries, initially at most 32 complete layout attempts, with smaller local repairs where safe. The exact budget should be tuned from measured rejection rates.

If a selected profile pair cannot produce a valid map under the requested scale and mode, return a useful configuration error and compatible alternatives. Do not silently switch zones, drop one side of a border, or fall back to the Oakhaven map. Never replace the active campaign until the candidate is valid and saved successfully.

Record the generation attempt and validation summary for debugging. They are host/developer information, not player-facing world lore.

## 9. Data and API plan

### 9.1 Keep five concepts separate

| Concept | Purpose |
| --- | --- |
| Zone definition | Reusable source-informed setting profile, such as Djurum |
| Region instance | A specific generated area in one campaign, with one or two zones and a saved seed |
| Hex/layer | Physical location and terrain, with stable coordinates and zone influence |
| Site/connection | A settlement, ruin, entrance, district location, road, channel, ferry, or other specific entity |
| Knowledge | What the host and party know about those entities |

`activeZoneId` cannot express a border map or an underground entrance by itself. Retain it temporarily as a derived compatibility field. The authoritative campaign state should include `activeRegionId`, `partyLocation`, and `homeLocation`.

### 9.2 Proposed configuration

```ts
type CursedZoneId =
  | "the_gloaming" | "red_sands" | "midnight_sun"
  | "river_of_night" | "dwellers_in_the_deep" | "city_of_masks";

type RegionSelection =
  | { mode: "single"; zoneId: CursedZoneId }
  | {
      mode: "border";
      zoneIds: [CursedZoneId, CursedZoneId];
      connection: "surface" | "vertical" | "urban" | "distant";
      borderProfileId: string;
    };

interface RegionGenerationConfig {
  selection: RegionSelection;
  seed?: string;                 // blank means mint once, then persist
  initialRadius: number;          // default 2
  structuralRadius: number;       // proposed default 6
  regionalHexMiles: number;       // default 6; not a district-map scale
  season: "spring" | "summer" | "autumn" | "winter";
  sourceContent: "adapted" | "named";
  rulesProfileId: string;
}
```

Reject duplicate zone IDs, unknown profiles, incompatible connection modes, invalid numeric bounds, and unsupported seed formats. All resulting configuration is normalized and stored, including defaults.

### 9.3 Profile and saved-world additions

Extend or reference separate files from each manifest for:

- Geography and climate constraints; terrain categories and prior weights.
- Water generation and drainage rules.
- Allowed travel modes and environmental pressures.
- Settlement patterns, food/support requirements, and size eligibility.
- Historical motifs and relational site packages.
- Verified faction definitions and habitat-tagged encounter references.
- Compatible border profiles.
- Provenance: source volume, local filename/version, JSON page, and `sourced` versus `adapted` status.

Prefer authored, reviewed profile files as the source of truth. Ingestion scripts can emit candidates and diagnostics, but should not overwrite reviewed content on a routine rerun.

Suggested database entities:

| Entity | Essential fields |
| --- | --- |
| `regions` | ID, campaign ID, selection/config JSON, seed, generator/content/rules versions, attempt, revision, active status |
| `region_layers` | Region ID, layer ID, kind, scale, depth context |
| `region_hexes` | Stable key, coordinates, terrain, elevation/depth, moisture, primary zone, influences, persistent threat context |
| `sites` | ID, location, kind, current state, owner, support dependencies, history, source references, visibility rules |
| `connections` | ID, endpoint locations/sites, kind, direction, modes, cost, requirements, physical feature ID, owner, state |
| `historical_events` | ID, relative sequence, affected entities, cause/consequence references |
| `faction_presence` | Faction instance, location/asset, strength or control state, agenda |
| `knowledge` | Party/entity/field or discovery ID, knowledge level, source, date |
| `region_changes` | Campaign-time event, affected IDs, previous/new state or reproducible change record |

A bridge and the river below it may be separate connections sharing a location. A river edge has direction; a road can allow both directions. Vertical edges have requirements and depth change. A distant voyage must not be represented as an ordinary neighboring-hex edge. Knowledge-filtered responses must not leak hidden endpoints through connection metadata.

### 9.4 Integration points

1. Extend campaign creation to accept the selection and generation options. Create campaign, region, sites, connections, and starting knowledge atomically.
2. Replace the generic theme dropdown with six settings and a border option. Show compatible connection choices and explain distant connections in ordinary language.
3. Add host-only region preview generation. Show terrain, settlement support, routes, and a short validation summary. Reroll creates a new candidate seed.
4. Commit the chosen preview as a saved region revision; use the existing host authorization pattern.
5. Resolve entering/exiting zones through real saved locations and connections. Preserve a host relocation tool as an explicit move rather than treating it as physical travel.
6. Update travel to receive intended destination/mode, with the server resolving actual terrain, progress, supply use, time, and events. Do not trust a client-supplied biome label.
7. Feed local zone context and support constraints into settlement and NPC generation. The existing `generateSettlement(rng)` has no spatial or zone context and needs an extended interface.
8. Supply distinct host and party map responses. Rumors are records about a target, not unrestricted publication of its full contents.
9. Render wilderness, maritime, cave, and city detail appropriately, with one shared navigation model for moving between their maps.

### 9.5 Preservation and expansion

Existing campaigns keep their current hex rows and discoveries. Mark them as legacy fixed-map regions; do not invent a seed that supposedly reproduces them. Import their actual state into the new representation during migration.

Preserve named sites, notes, active encounters, and links when revising a region. Intentional replacement should archive the prior revision and either retain compatible references or report which references need reassignment. The existing delete-and-insert regeneration path is not suitable once sites have persistent references.

For expansion, the initial implementation should reveal/generate detail within the already saved structural region. Reserve gateways and major feature continuations at its edge. When adding another region, honor those saved boundary contracts: incoming water, route endpoint, terrain band, layer depth, and expected destination. Generate and validate the new region before linking it.

A coordinate seed alone is not sufficient to ensure continuous drainage if each chunk independently solves its own watershed. Save the coarse drainage plan or negotiate deterministic shared boundary conditions. A bounded region with explicit expansion contracts is preferable for the first implementation to an unproven claim of seamless infinite generation.

## 10. Fog, information, and the living world

Keep world truth and player knowledge distinct. Proposed meanings:

| Knowledge level | Default information |
| --- | --- |
| Unexplored | Known grid extent and any deliberately published regional outline; no automatic detailed elevation, routes, exits, or sites |
| Rumored | The rumor's claim, approximate direction/route, source, and uncertainty; not the target's complete true record |
| Scouted | Observed terrain, visible landmarks, traversed connections, and noticed danger signs |
| Explored | Investigated sites and surveyed local routes, with discoveries recorded individually |
| Fully mapped | Reliable local geography and mapped locations; undiscovered secrets remain separate |

At campaign creation, `00` is fully mapped and its sanctuary is dependable. Supply three initial rumors targeting different actual opportunities; publishing those rumors need not reveal all intervening hexes. Local residents may know an outward road without knowing its distant destination accurately.

Visibility must respect terrain and medium. A surface lookout may reveal a distant summit, while forest, fog, cave walls, and urban buildings block other details. The guide's suggested long views are opportunities, not an unconditional radius of omniscience.

Between expeditions, a small number of explicit faction or environmental events change the saved world. Examples include bridge occupation, an exhausted food cache, a repaired well, a shifted patrol, or a market opening. These events update dependent routes, encounter pools, and rumor freshness. Known terrain remains known even when its political situation changes.

Keep the starting refuge useful. In a city campaign, political adventure can happen outside the refuge without eliminating the home-base function. Changes that make the haven unsafe should be deliberate campaign events with notice, not an incidental world-generation or downtime roll.

## 11. Illustrative outputs

These are invented acceptance examples, not generated artifacts or claims about published adjacency. Names below are placeholders for generated names.

### Example A: Two different Djurum campaigns

**Seed A:** the haven occupies an oasis at a canyon mouth. A road follows firm ground to a second water stop; a shorter route crosses dunes with a supply risk. A former aqueduct supports a ruin and a repair opportunity. A mobile community disputes access to a seasonal pasture.

**Seed B:** the haven surrounds wells near a dry basin. The principal trade route follows the escarpment, with a salt-flat detour and a distant city exit. A lost channel points to an abandoned settlement. The central pressure concerns caravan protection rather than an aqueduct.

Both feel like Djurum. Their landform, supply network, route choices, communities, and historical connections differ. Neither requires the fixed northern glacier and southern delta.

### Example B: Gloaming–Morzomotha border

The sanctuary is a defended supply refuge above a limestone descent. Surface cells contain woodland, working clearings, wet ground, and an old crossing. Below, several passage branches lead to an inhabited enclave, underground river, and older workings. Timber and food move down; crafted goods move up. A changed watercourse threatens both communities.

The two zones meet at an explicit entrance. They do not alternate randomly across one flat terrain layer. The starting party can take a surface expedition or prepare for a descent.

### Example C: Black River–Meridia interface

For this ASH adaptation, a navigable warm river corridor reaches an estuary with an urban center. The regional map includes cultivated banks, flood-prone ground, a portage upstream, and the harbor. The city opens into its own district map. Traders, rowers, farmers, city authorities, and an upstream community contest access to a maintained channel.

The document does not assert that the source Black River is canonically the Trematora. The generated campaign records that connection as its own setting choice.

### Example D: Andrik linked to Djurum

A northern harbor and a desert caravan region are joined by a substantial voyage with its own travel time and supply requirements. Each destination has its own coherent local map. The campaign can begin at one transfer port; it cannot display an arctic farm and a hot dune settlement as ordinary adjacent six-mile hexes simply because both zones were selected.

## 12. Implementation sequence and acceptance gates

### Phase 1 — Reconcile source profiles and content IDs

Deliver six reviewed generation profiles, provenance records, habitat tags, faction identities, and all fifteen pairing definitions. Correct misleading current manifest descriptions. Resolve encounter IDs or add explicit, reviewed aliases/templates. Keep Oakhaven as a labeled legacy/example profile rather than the mandatory origin of every new campaign.

Gate: every profile validates; all runtime content references resolve; every adaptation is distinguishable from sourced facts; each pair has supported connection modes.

### Phase 2 — Seeded geography and persistence

Implement deterministic seed streams, structural region generation, surface/cave/city topology strategies, water continuity, and valid haven selection. Add saved region metadata and non-destructive legacy migration.

Gate: same seed/config/version reproduces the same world; different seeds show structural variation; all selected settings generate valid geography; existing campaigns load without changing their map.

### Phase 3 — Population, history, roads, and discoveries

Implement settlement support checks, historical layers, route construction, relational sites, faction assets, and initial rumors. Build zone-conditioned encounter eligibility.

Gate: settlements and routes have valid dependencies; generated history changes actual sites; each starting region offers several leads and a feasible expedition; zone identity extends beyond terrain names.

### Phase 4 — Borders and layered travel

Implement contiguous surface borders, vertical entrances, urban insets, and distant connections. Add mixed cultural influence without incompatible habitat mixing. Store party and home locations explicitly.

Gate: both selected zones remain meaningful; every crossing has requirements and geography; source-incompatible climates use a legitimate larger connection or a clearly chosen exception.

### Phase 5 — Campaign flow, fog, and travel rules

Wire selection and preview into creation; replace label-only zone travel; implement knowledge filtering; connect travel to current location. Reconcile the ASH watch documentation and rule profile as described in section 4.1.

Gate: host and player views expose the right information; travel uses local conditions and correct scale; returning home returns to the saved haven; reloading never regenerates terrain.

### Phase 6 — Expansion and world changes

Add detail generation beyond the initial window, boundary-aware new regions, faction changes, and revision-aware regeneration.

Gate: already revealed facts remain stable, continuations join correctly, faction changes affect saved places, and replacement does not orphan campaign references.

## 13. Verification plan

Use targeted unit tests for deterministic primitives, property tests over many seeds, integration tests for saved campaigns, and visual inspection of representative maps. Snapshot tests alone cannot prove procedural diversity or geographical sense.

| Area | Required checks |
| --- | --- |
| Seed behavior | Exact reproduction for fixed versions; independently changing name data leaves terrain unchanged; runtime rolls do not alter generated geography. |
| Basic topology | Unique stable location keys; reciprocal ordinary adjacency; valid axial distances; no dangling connection endpoints. |
| Hydrology | No cycles in ordinary drainage; downstream progression; valid lake/sea/closed-basin sinks; tributaries connect; border water contracts match. |
| Land and sea routes | Every road has meaningful endpoints; all crossings have a method; sea routes connect real landing sites; mode requirements are enforced. |
| Caves | Coordinate adjacency alone does not permit travel; shafts and depth changes are explicit; every advertised reachable site has an actual passage. |
| Cities | District and regional scales remain distinct; district roles and canal connections are coherent; a safe establishment does not make all districts safe. |
| Population | Every permanent settlement has water and support; large centers have adequate imports/hinterland; temporary camps have a duration or itinerary. |
| History | Event links resolve; local chronology is ordered; reused ruins and roads retain their earlier purpose; generated history has consequences. |
| Encounters | Catalog references resolve; habitat filters work; no global-bestiary fallback; named unique entities are not duplicated. |
| Borders | Surface cores are contiguous; meaningful representation of both zones; sanctuary can reach each side; incompatible pairs require the intended connection mode. |
| Player agency | At least three initial leads with different targets and useful route choices; one feasible early expedition; exceptional threats have discoverable warnings. |
| Knowledge | Hidden terrain, routes, destinations, and site data do not leak through map payloads; host can inspect world truth; secret sites survive a hex becoming fully mapped. |
| Persistence | Restart, reveal, zone enter/exit, and preview do not mutate the committed map; revisions preserve or explicitly reassign references. |
| Expansion | Existing geographic facts remain unchanged; roads/rivers and layered gateways join reserved endpoints; expansion order does not change saved territory. |

**Diversity measurement:** initially run at least 200 seeds per single-zone profile and 100 per supported pair/mode. Record structural fingerprints from terrain, passable edges, hydrology, settlement positions, and site roles, excluding names and rumors. Also compare fingerprints after normalizing rotations/reflections so rotated templates cannot masquerade as broad variety. Track validity/retry rate, biome coverage, route loops, settlement support, and border representation. Establish final statistical thresholds from a reviewed baseline; fail obvious degeneracy such as every seed having the same river membership or all outputs reducing to six rotations.

For visual review, prepare a small atlas with at least three seeds per setting and representative surface, vertical, urban, and distant pairings. Include the same seed twice to demonstrate reproduction. Review the play choices as well as appearance: a plausible-looking map can still strand the party or give it only one useful route.

## 14. Decisions adopted by this plan and remaining tuning

Adopted recommendations:

- Six selectable Cursed Scroll profiles; one profile or a supported two-profile connection per generated region configuration.
- A dependable central haven, adapted to the selected setting.
- Random seeds with saved world state and versioned reproduction.
- A 19-hex starting view backed by a larger structural region.
- Distinct surface, maritime, underground, and urban spatial behavior.
- Shared geography and relational population rather than independent per-hex content rolls.
- Explicit source/adaptation provenance and no assumed canonical adjacency among all six settings.
- Existing campaigns preserved as legacy regions.

Tune during implementation and playtesting: structural radius, terrain priors, number of settlement hubs, detail budgets, encounter category weights, route costs, retry limits, and border width. The concrete values above are starting settings, not research findings or already implemented behavior.

The core acceptance question is: **if two campaigns choose the same Cursed Scroll setting, do they produce recognizably related worlds with different terrain, settlements, routes, histories, and expedition choices—and do those differences remain stable once play begins?**
