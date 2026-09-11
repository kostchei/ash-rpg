# Connected Path Encounters

Status: initial table-assisted runtime implementation, 2026-09-07. All nine outer-power methods have a selectable encounter pack in the **Encounters** screen. These are connected encounter modules, not full level 1–10 campaign adapters or automatically populated regional maps.

## What Is Implemented

The [catalogue](../../src/server/paths/encounters/catalog.ts) supplies nine packs with seven sites each: a haven, two independent evidence sites, two preparation sites, and two remedy sites. There are **63 site situations**, each with an NPC, quest, and concrete interactions; six sites per pack contain a monster group, using three authored monster roles per path. The resulting 54 groups include counts, AC, HP, attacks, morale, objectives, tactics, and ways to end interference without killing them. These are initial ASH encounter statistics requiring playtesting, not copied board-game statistics or a complete bestiary.

Each pack has six sourced clue records. Four establish two independently discoverable remedies; the other two reveal the routes unlocked by tested preparation. Either initial evidence site can establish either remedy. Essential evidence does not depend on accepting supernatural help, winning combat, or passing one persuasion/search roll.

| Pack | Initial evidence sites | Recurring interaction | Independent operations |
| --- | --- | --- | --- |
| The Tide That Dreams | Unmoored fishing boat; surveyor's tide stair | Dream contact, ward salts, cleansing | Exclude the arrival piers; bind the submerged source |
| Three Signatures | Charity office; reformer's tollhouse | Endorsement and witnessed revocation | Revoke three mandates; bind the accepted mask |
| The Generous Harvest | Blessed farm; breeder's counting house | Rooted Flesh, mineral rations, graft removal | Sever propagation; regulate a bounded ecology |
| The Unfinished Festival | Singer's lodging; keeper's memorial | The Returning Hero's privilege and promise | Dissolve a role; complete the counter-performance |
| The Door That Moved | Open pantry; courier's route house | Carried keys and return connections | Seal the junction; complete into containment |
| The Hospitable Silence | Drover's camp; salt depot | Priced hospice rest and release | Exhaust emergence infrastructure; sever tribute |
| The Last Open Road | Snowed watchhouse; refuge stores | Winter provisions and a hunter's mark | End anchor transmission; drain and sever the spring |
| The Price of Care | Chapter clinic; independent physician's house | Care obligations and collection rights | Establish independent provision; secure chapter defection |
| The Furnace That Sings | Bell-keeper's furnace; weightless quarry | Useful heat and grounded emissions | Disconnect collectors; establish the counter-pattern |

## Table Flow

1. The host selects one pack in **Encounters → Adventure encounters**. This saves its definition as well as its initial state; a later catalogue edit cannot rewrite an ongoing situation. Selecting another pack cannot replace saved play.
2. At the haven, meet a contact, consider disclosed help, follow either of two initial leads, or repair the ordinary public bridge. Bridge work pays its materials once. Preparing further materials takes recorded time and grants no gold or XP.
3. Place a discovered site in appropriate existing geography and use the ordinary map/travel procedure. After arrival, the host or designated caller records how the party reached it. This is table attestation, not automatic travel or a new teleport control.
4. At the site, observe the monster's mechanism, meet the nearby witness, recover the independent record, negotiate, evade, use an environmental countermeasure, or fight. Combat and checks use existing table rules. Record the actual result and any terms or casualties in the notes.
5. Evidence reveals preparation sites. Completing and testing the physical work consumes the pack's named material and reveals its remedy destination. A failed work attempt consumes its declared time/material but leaves recovery and resupply available.
6. At a remedy site, resolve the defenders' interference, then carry out the actual stated operation. The host/caller attests its full completion; learning the method or possessing a tool alone cannot satisfy the recorded prerequisites. Either operation independently marks the incursion won.
7. Revisit changed sites, preserve the Toll, complete optional rescues, and continue with the aftermath. Listening to a witness reveals evidence but does not falsely mark that witness's rescue quest complete.

## Shared State and Authority

The [engine](../../src/server/paths/encounters/engine.ts) maintains separate known and visited sites, clue provenance, facts, completed actions, resolved groups, materials, accepted/released benefit history, work minutes, victories, Toll, and a journal. These records support the different authored mechanics; they are not a generic Doom track.

The [service](../../src/server/paths/encounters/service.ts) stores definitions and state in SQLite's `path_encounter_packs`. Socket mutations use the existing campaign revision and transactional receipt mechanism. Retries do not repeat resource changes; stale requests and unauthorised players cannot commit changes. Read-only requests neither advance revision nor broadcast recursively.

All viewers receive only the public projection: known destinations, current occupants, revealed evidence, public procedures and failure stakes, and recorded outcomes. Future occupants, undiscovered clues, internal effect definitions, and success predicates stay server-side. Only the host receives the initial pack catalogue; ordinary players and the caller see the saved fiction after selection. The caller or host can commit table outcomes; selecting the initial pack remains host-only.

The existing **Sanctuary tavern** remains a separate gathering and lead-card UI. This release does not silently replace its generated leads or the selected campaign's path with the encounter pack. The pack's haven/contact begins on the Encounters screen.

## Automation Boundary

The panel is a table assistant. It does not simulate the full rite, verify spoken negotiation, roll combat, or physically move characters across the map. Printed procedures and the required result notes are the table's adjudication interface. An authorised caller can record a table ruling, just as with other manually resolved play.

Pack materials are expedition-module assets, not additional character gold or automatically carried inventory. The UI explicitly tells the table to account for gear slots, HP benefits, provisions, elapsed time, and long operation intervals using normal controls. Site work minutes are recorded for accounting; they do not silently advance the main campaign clock. Normal treasure and XP remain in the existing reward flow; these packs do not pay automatic monster-kill XP or duplicate rewards for a second ending.

Future integration should bind each site to persistent regional coordinates, feed its sources into the existing tavern leads, send groups directly into combat, and apply inventory/time/character effects through the existing authoritative services. Full campaign adapters must additionally supply their level 1–10 content and XP audits. Those capabilities are not implied by the encounter packs being selectable.

## Verification

[Content and persistence tests](../../tests/path-encounters.test.ts) exercise all nine packs, both remedy branches through either evidence source without a bargain, remote-action rejection, hidden-information filtering, recovery after failure, rescue completion, alternative group resolution, material idempotence, and database reload.

[Socket tests](../../tests/path-encounter-sockets.test.ts) exercise host/caller authority, private catalogue access, read-only refresh, transactional retries, stale revisions, and invalid remote completions. These checks establish the implemented recording behaviour; they are not a claim of combat balance or physical-table playtest completion.
