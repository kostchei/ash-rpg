# ASH Table Companion

The Table Companion is the local-first campaign application for running ASH without a dedicated Dungeon Master. One computer hosts the campaign, a shared display shows the party state, and players join from phones over the same network.

The next release targets a complete in-person expedition with four core classes, individual phone activity choices, connected dungeon exploration, initiative, and treasure allocation. See the [Minimal Table Companion Specification](plans/minimal_table_companion_specification.md) for the core physical-table philosophy, information fog of war, and Shadowdark initiative rules. The [engineering plan](plans/table_companion_mvp.md) details historical implementation gates. The [Product Quality Engineering Plan](plans/product_quality_engineering_plan.md) sets the latency, frame, payload, and Apple HIG interface budgets that the delivery must meet.

## Core Design Principles

1. **Dice Belong on the Table:** No automated "roll to hit" or damage roll buttons. The companion provides instant target numbers (+To-Hit, AC, DC, Saves) for physical dice rolling.
2. **Information Fog of War:** Monster AC is unknown (`?`) until tested; monster HP uses narrative states (`Unharmed` -> `Bloodied (<50%)`) rather than spoilers; traps only show sensory tells until investigated; NPC reactions require interaction.
3. **Shadowdark Initiative:** Clockwise table-seating rotation started by a single group DEX check; monsters take their turn on the GM's position.
4. **Physical Widgets & Leverage:** Campaign-progressing items exist in character inventories; sites offer environmental and tactical leverage to weaken threats.
5. **Session-to-Session Ledger:** Seamless tracking of current HP, gold, conditions, light duration, and carried relics.
6. **Searchable Codex:** Instant lookup for conditions, spells, gear, and core OSR procedures.
7. **Living World Directory (NPCs & Facilities):** Map-linked tracking of towns, taverns, shops (blacksmith, apothecary, provisioner), trainers (martial, arcane, divine), and adventure site denizens (rescued captives, sages, witnesses) so names, roles, and locations are never lost between sessions.

## What is implemented

- Campaign creation with a six-character table code and hashed host PIN.
- Persistent campaign state in a local SQLite file at `data/local/ash.sqlite`.
- Live Socket.IO synchronization across host and player devices.
- Server-authoritative manual dice, Binary Oracle, reaction, morale, ability, wilderness, dungeon, lore, and threat rolls.
- Character generation using 3d6-in-order abilities, class hit dice, calculated AC, gold, gear slots, and cultural anchors.
- The 19-hex frontier with shared party fog. Unrevealed names, biomes, threat tiers, and landmarks are omitted from client payloads.
- Procedural room generation with contents, exits, and traps.
- Encounter HP tracking with Monsternomicon information unlocked progressively by lore checks.
- Optional campaign pressures shaped as pursuits, rival races, faction heat, spreading crises, revelations, opportunities, escalation ladders, or countdowns.
- Campaign notes and an append-only live resolution feed.
- A LAN join URL and QR code for phone access.

## Product direction and verification

ASH is a solo/cooperative assistant for one to six people at a physical table. The full target includes two characters per player, chosen or secretly rolled adventure paths, a party-informed starting tavern, layered regional knowledge, clickable site maps, and three acts spanning levels 1–10. See the [current requirements, implementation assessment, and delivery plan](plans/table_assistant_campaign_requirements.md). The feature list above is an older foundation summary; it is not a full release certification.

## Run at the table

### Portable Windows release

Extract the complete `ASH-0.1.0-windows-x64.zip` release to a writable folder and
double-click **Start ASH.cmd**. The bundled runtime starts the server and opens
your browser; no Node.js installation or npm commands are needed. Keep the
window open during play. Players on the same Wi-Fi scan the lobby QR code.
Allow private-network access if Windows Firewall prompts.

Campaign saves stay in the extracted folder under `data/local`. Stop ASH before
backing up that folder. To upgrade, extract the new release separately and copy
the old `data/local` folder into it before starting.

Maintainers can build the ZIP on Windows x64 with `npm run release:windows`.
The packager includes a Node runtime, production dependencies, compiled client
and server, and game content; it excludes personal campaign saves. Outputs are
under `releases/`. Move an existing same-version release aside before rebuilding.

### Automated Windows releases

The **Windows release** GitHub Actions workflow installs locked dependencies,
runs the tests and client type check, builds the portable ZIP, and verifies an
extracted copy using its bundled runtime. It checks campaign creation, player
joining, save restoration, game content, client assets, and launcher startup.
Only a verified ZIP and its SHA-256 checksum are uploaded.

- For a downloadable test build, open **Actions → Windows release → Run workflow**.
  Download the `windows-release` artifact from the completed run (kept for 30 days).
- To publish a release, commit the version in `package.json` and `package-lock.json`,
  then push a matching tag such as `v0.1.0`. The workflow attaches the ZIP and
  checksum to the GitHub release. A mismatched tag fails before building.
- Tags containing a hyphen, such as `v0.2.0-beta.1`, create prereleases.
  Manual runs build artifacts only, even when run against a tag.

The workflow uses GitHub's built-in token; no additional secrets are required.
The workflow and packaging scripts must be committed and pushed before it can run.

### From source

Install Node.js 22 or later, then run:

```bash
npm install
npm run dev
```

Open `http://localhost:3000` on the host computer. Create a campaign, then have players scan the QR code shown in the Frontier view. The database is ignored by Git and can be backed up by copying `data/local/ash.sqlite` while the server is stopped.

For a production-style local run:

```bash
npm run build
npm start
```

## Architecture

The React/Vite client provides responsive host and phone surfaces. Express serves the API and production client, while Socket.IO is the sole live mutation channel. The server validates every action, performs every random roll, writes the resulting campaign state and audit record to SQLite, and then broadcasts a role-aware snapshot.

Device tokens reconnect phones to their character and remain in browser storage. They are not campaign data. Host authorization uses a random server token recovered with the campaign PIN; the PIN itself is stored only as a salted scrypt hash.

## Verification

`npm test` runs deterministic rules-engine tests plus database fog/lore/threat tests and HTTP campaign-flow tests. `npm run build` type-checks the server and builds the production client.
