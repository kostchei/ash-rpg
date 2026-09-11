# ASH site structure — implemented 2026-09-07

The user's ASH rule supersedes the imported CoreDark chain weights, variable room counts, and 29-room cap.

| Persisted d6 | Sections | Total rooms |
| --- | --- | ---: |
| 1–2 | Small + small + small: 5 + 5 + 5 | 15 |
| 3–5 | Medium + small: 8 + 5 | 13 |
| 6 | One large section: 12 | 12 |

`generateSiteLayout` creates the structure once when a new site is entered. Room features are populated independently. The [per-site objective selector](../oracles/13_per_site_objective_selector.md) places one objective in every constituent section, with a saved 50/50 similar/different choice; the existing primary rescue remains terminal. The result and section metadata are saved in SQLite. Existing saved layouts are preserved. False/empty regional leads retain their empty destination instead of receiving a stocked layout.

This implementation uses levels linked by stairs for dungeons and paths between nearby places within the same hex for settlement/resource/shrine/district sites. It does not yet spread constituent places into adjacent hexes. Both arrangements retain a single parent site ID. Each constituent objective has a separate stable completion identity and +1 story XP award; crossing a section link itself earns nothing.

Links are open, bidirectional graph edges. At a link, players explicitly choose to continue down/up a level or along the path. Reaching it does not advance them automatically and does not require clearing every room. A backtrack button takes one step along a known open route to the entrance through the normal movement action: turns, light consumption, and existing tension checks apply. Players can instead choose passages manually. A blocked return route must be reopened or replaced by another explored route.

For newly structured sites, exiting to the surface requires reaching the entrance. Exit is caller/host controlled and disallowed during an active encounter. Players can then use the map's Make Camp / Rest action or travel home. Camping outside does not complete the site or reset its contents. The party returns through the entrance and can retrace its route to the next section. No automatic healing or free retreat is attached to a transition.

Player projections omit the d6 result and undiscovered section metadata and transition links. Host views retain generation information. Old site graphs without section metadata remain readable without regeneration.

Validation covers all six d6 faces, correct room totals, terminal objective placement, reversible routes, blocked retreat paths, database round trips, receipt replay, explicit section crossing, rejected remote/implicit exits, retreat movement costs, camping, and re-entry with discoveries and claimed treasure preserved.
