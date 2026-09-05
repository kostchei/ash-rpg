# ASH Table Companion

The Table Companion is the local-first campaign application for running ASH without a dedicated Dungeon Master. One computer hosts the campaign, a shared display shows the party state, and players join from phones over the same network.

The next release targets a complete in-person expedition with four core classes, individual phone activity choices, connected dungeon exploration, initiative, and treasure allocation. See the [product scope](../README.md#the-next-playable-release-a-companion-for-the-physical-table) and [engineering plan](plans/table_companion_mvp.md). The implemented foundations below do not imply that this complete release flow has passed a multiplayer playtest.

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

## Run at the table

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
