# Content & Systems Expansion Plan

Status: **planning only — nothing in this document has been implemented yet.**

This plan covers four workstreams raised together: populating the Monsternomicon
from Shadowdark (plus the Cursed Scroll zines), building the settlement/NPC/
emergent-campaign generators, standing up a Thematic Zone framework, and
reworking class talents/leveling for ASH's 1-36 level range. It assumes the
prior implementation audit in this repo (README "Five Pillars" vs. `src/`)
as its starting gap list.

Source material referenced throughout lives outside this repo, at
`D:\Code\Core_Dark\tmp\extracted_text\*.json` (Shadowdark core, Hexcrawl
Guidebook, SoloDark, and Cursed Scroll zines 1-6). Each file shares one JSON
shape: `{ pdf_name, total_pages, toc: [[depth, title, page_num], ...], pages:
[{ page_num, section, text }, ...] }`. `text` is plain extracted PDF text,
one string per page, with tables flattened to `label`/`value` line pairs
(e.g. a d100 table becomes alternating `"01"`, `"The ground shakes..."`
lines) and monster stat blocks as a fixed one-line format. Both shapes are
regular enough to parse with a small extraction script per content type —
this plan explicitly avoids ingesting book text into the assistant's context
window; all extraction is done by scripts run against the JSON.

**Licensing note:** Shadowdark and the Cursed Scroll zines are copyrighted
third-party works. This plan proposes storing only *mechanically transformed*
data (stat numbers, table structure, roll ranges) in this repo's tracked
files, not verbatim flavor prose, and keeping the raw extracted-text JSON and
one-off ingestion scripts either untracked or in a clearly-marked
`scripts/ingest/` folder with a `.gitignore`'d raw-source cache. Flavor text
for anything committed to the repo should be paraphrased/reskinned rather
than copy-pasted. This is worth the user's explicit sign-off before the
Cursed Scroll pass in particular, since those zines are less obviously
OGL-adjacent than Shadowdark core.

---

## 1. Monsternomicon population (bestiary ingestion pipeline)

**Current state:** `MONSTERS` in [src/shared/content.ts:230-285](../../src/shared/content.ts) has 3
hand-written entries. `loreTier()` in `src/server/rules.ts` implements the
4-tier Monsternomicon *mechanic* but has almost nothing to unlock.

**Source:** Shadowdark core, "Monsters" section, pages 191-269 (`Shadowdark_RPG_-_V4-8.json`).
Verified stat-block format (from Owlbear/Panther/Peasant/Pegasus, p. 246):

```
NAME
<one or two line flavor text>
AC #, HP #, ATK <n> <attack name> +<bonus> (<damage dice>), MV <speed>
(<modes>), S +#, D +#, C +#, I +#, W +#, Ch +#, AL <L/N/C>, LV <#>
<Optional Ability Name.> <effect text>
```

Family groupings (Angels, Demons, Devils, Dragons, Giants, Golems, Hags,
Elementals, Goblins, Drow, Outsiders, Dinosaurs, Viperians) are marked in the
TOC by depth-4 entries nested under a depth-3 parent — use that to tag a
`family` field.

The **Monster Generator** (p. 194) is a d20 table of `{Combat (PL offset),
Quality, Strength, Weakness}` columns keyed off party level (PL) — this is
Shadowdark's built-in reskin/variant system and maps directly to the "50% of
the time, generate a variant of a fantasy trope" request.

**Plan:**

1. Build a small shared extraction toolkit (`scripts/ingest/lib/pages.ts`):
   load a source JSON, slice `pages` by a TOC-derived page range, and expose
   two parsers:
   - `parseStatBlocks(text)` — splits on ALL-CAPS name lines, regex-parses the
     `AC/HP/ATK/MV/S/D/C/I/W/Ch/AL/LV` line, captures trailing "Ability Name."
     paragraphs as traits.
   - `parseRollTable(text)` — pairs up `range` / `value` lines for d6/d8/d12/
     d20/d100 tables (this same parser is reused by workstream 2).
2. `scripts/ingest/extract-monsters.ts`: run `parseStatBlocks` over Shadowdark
   pages 198-269, normalize into a `Monster` schema (see below), write to
   `data/bestiary/shadowdark-core.json`.
3. `scripts/ingest/extract-monster-generator.ts`: port the p.194 table
   verbatim into `data/oracles/monster-generator.json`.
4. Repeat step 2 against each `Cursed_Scroll_*.json` for that zine's own
   monster/NPC appendix (page ranges differ per book — one script per book
   or one script with a page-range config table). This is the "100%
   completeness via script, not context" ask — each zine gets its own
   extraction pass once the parser is validated on Shadowdark core.
5. Data model (`Monster`): `id, name, source, family?, level, ac, hp,
   attacks[{name, bonus, dice}], move, abilities{str,dex,con,int,wis,cha},
   alignment, traits[], loreTiers{common, field, obscure, arcane},
   harvest[{reagent, dc, effect}]`. The `loreTiers` and `harvest` fields don't
   exist in Shadowdark's format — they're ASH-specific and need to be
   authored (at least a generic fallback fill) per monster, since the source
   only gives one flavor line, not four lore tiers.
6. Storage: given ~270+ entries across all sources, move off the `MONSTERS`
   TS const and into a SQLite table (`monsters`) loaded at server start from
   the `data/bestiary/*.json` files, following the same pattern
   `src/server/database.ts` already uses for campaign state.
7. Variant generation: `generateMonsterVariant(baseMonster, partyLevel)` in
   `src/server/rules.ts` — roll d20 against the ported Monster Generator
   table, apply the Quality/Strength/Weakness result as a reskin layer over a
   randomly chosen base template. Wire a coin-flip into whichever encounter
   roller currently picks a monster (dungeon/wilderness encounter handlers in
   `src/server/app.ts`) so ~50% of encounters use a stock Monsternomicon
   entry and ~50% use a generated variant.

---

## 2. Settlement, NPC, and emergent-campaign generators

**Current state:** `docs/oracles/02_settlement_generator.md`,
`05_emergent_campaign_engine.md`, `06_npc_generator.md` are lore-only
markdown with no matching code.

**Source mapping (Shadowdark core):**

| ASH doc | Shadowdark source pages |
| --- | --- |
| `02_settlement_generator.md` | Settlement Maps (138), Taverns (140), Shops (142), district Random Encounter Tables — Artisan/Castle/High/Low/Market/Slums/Temple/University District (146-188) |
| `06_npc_generator.md` | NPCs (128: ancestry/alignment/age/wealth d-tables), NPC Names (132), Rival Crawlers (130) |
| `05_emergent_campaign_engine.md` | Random Encounters (116), Something Happens! (122), Rumors (124), Adventures (126) |

Verified format (from p.128/p.122 dumps): every table is a repeating
`range` / `description` pair under a `dN` header and a table-name footer —
the same shape `parseRollTable` (workstream 1) already handles.

**Plan:**

1. `scripts/ingest/extract-oracle-tables.ts`: page-range config per table
   (settlement, npc, campaign-engine groups), run `parseRollTable`, write to
   `data/oracles/{settlement,npc,campaign}.json`.
2. **Reconciliation pass (manual, not scripted):** ASH's existing docs
   already describe their own version of these tables with ASH-specific
   flavor (cultural anchors, the 19-hex frontier, campaign pressures). Ported
   Shadowdark tables should be used for the *roll structure and coverage*
   (how many entries, what ranges, what categories exist) but re-worded to
   match what `docs/oracles/02,05,06` already promise where they conflict.
   This step can't be scripted — flag it as an explicit review task after
   ingestion, not part of the ingestion script itself.
3. Runtime: new `src/server/generators/{settlement,npc,campaign}.ts`,
   mirroring the existing oracle/wilderness pattern in
   `src/server/app.ts`. New Socket.IO events: `settlement:generate`,
   `npc:generate`, `campaign:complication`, each server-authoritative and
   logged to the live feed like existing rolls.

---

## 3. Thematic Zone framework

**Current state:** no `zones/` directory, no zone-transition logic, and no
explicit state machine — the Sanctuary → Hexcrawl → DungeonIncursion loop
from the README exists only as separately-callable generators.

This workstream has no book to script from — the six Cursed Scroll zines
(*Diablerie*, *Red Sands*, *Midnight Sun*, *River of Night*, *Dwellers in the
Deep*, *City of Masks*) are exactly the "self-contained thematic zone"
concept the README's Pillar 5 describes, so they become the first concrete
Zones once workstream 1's monster/NPC extraction pipeline runs against them.

**Proposed data model — `Zone`:**

```
{
  id, name, theme, biomePalette[],
  hazardTable: RollTableRef,
  weatherTable: RollTableRef,
  wanderingMonsterTable: RollTableRef,   // built from that zine's own bestiary subset
  factions: [{ name, disposition, notes }],
  uniqueFloraFauna: [...],
  hexOverrides: HexDefinition[],          // replaces the single global HEX_DEFINITIONS
  entryConditions, exitConditions
}
```

**Directory layout** (fulfilling the README's promised structure):
`zones/<zone-id>/manifest.json` (the `Zone` object above, referencing table
IDs in `data/oracles/`) + `zones/<zone-id>/lore.md` (paraphrased zine
content), mirroring how `docs/campaign_record/` is organized today.

**State machine:** add an explicit `CampaignPhase` enum (`sanctuary |
hexcrawl | dungeon`) plus `zone_id` to the campaign row in
`src/server/database.ts`. Add `zone:enter`, `zone:exit`, `phase:transition`
socket events. Gate generator availability by current phase (e.g. the room
generator only fires in `dungeon` phase) and have zone-scoped generators
(wandering monsters, hazards) pull from the active zone's manifest instead of
the single always-on global table used today. `HEX_DEFINITIONS`
([content.ts:37-228](../../src/shared/content.ts)) becomes the default/example
zone rather than the only one.

**Sequencing dependency:** this workstream should come *after* workstream 2's
generator plumbing exists, since a zone manifest mostly just parameterizes
which generator tables are active — building zones first would mean
re-plumbing once the generators land.

---

## 4. Class talents and the 1-36 level curve

**Current state:** `CLASSES` in
[src/shared/content.ts:24-35](../../src/shared/content.ts) is just
`{name, hitDie}` — no talents, no level-1 features, no progression, despite
`docs/rules/05_classes_core.md` and `06_classes_*.md` describing rich
per-class mechanics.

**Source (Shadowdark core, per-class pages 22-30):** each class page has
three parts, verified against the Fighter (p. 22):

1. Three fixed level-1 features (Fighter: *Hauler*, *Weapon Mastery*, *Grit*).
2. A 2d6 talent table (~11 entries, 2 through 12) rolled on class-talent
   levels. Duplicate talents stack (explicitly stated in the rules text).
3. The universal **Level Advancement** table (p. 43, applies to every class):
   level *N* requires *N* × 10 XP to reach *N+1*; a talent roll happens on
   odd levels (1, 3, 5, 7, 9); HP die is rolled and added every level; the
   printed table stops at level 10.

**Extraction:** `scripts/ingest/extract-classes.ts` — same `parseStatBlocks`/
prose-section split, applied to the four class pages (Fighter/Priest/
Thief/Wizard) plus any additional classes in later Shadowdark
supplements/Cursed Scroll content if present, into
`data/classes/<class>.json` (`{ level1Features[], talentTable: {2..12} }`).
Note ASH already has 10 classes in `content.ts` (Fighter, Thief, Priest,
Wizard, Delver, Ras-Godai, Druid, Alchemist, Sage, Monk) vs. Shadowdark's
core 4 — the other 6 have no Shadowdark source and will need either an
original talent table authored by hand, or a source pulled from the Cursed
Scroll zines / Player's Guide to the Western Reaches if they define
equivalent classes there (worth a quick check before assuming original
authoring is required).

**Rescaling to ASH's higher level range** — the user's stated target is
levels 1-36 (or an AD&D-style 1-26+), against Shadowdark's native 1-10, with
an explicit instruction to keep a "tight lid" on HP by having levels past 10
just add to HP rather than granting fresh mechanical complexity:

- **Levels 1-10:** use the sourced content as-is — the odd-level talent-roll
  cadence and per-level hit-die roll both come straight from the book.
- **Levels 11+:** don't author new per-level class features. Keep drawing
  talent rolls from the *same* 2d6 table already sourced (stacking duplicates
  is explicitly allowed by the source rule), on a cadence to be decided —
  either continuing every-odd-level, or thinning to every 3rd/4th level so
  high-level advancement feels rarer/weightier without requiring new content.
  This reuses 100% of the sourced table for the entire 1-36 range.
- **HP past level 10:** stop rolling the hit die; add a flat, fixed amount
  per level instead so HP grows linearly rather than compounding across 26
  more levels. A reasonable default is `ceil(hitDie / 2) + CON modifier` per
  level past 10, but the exact number is a game-balance call — flagged below
  as something to confirm before scripting, since it's the one place this
  workstream makes a new design decision rather than transcribing the source.
- Extends `CLASSES` into `{ name, hitDie, level1Features, talentTable,
  talentCadence, hpPastLevel10 }`, consumed by character generation
  (currently in `src/server/rules.ts`) at level-up time.

---

## 5. Suggested sequencing

1. Shared extraction toolkit (`parseStatBlocks`, `parseRollTable`) — used by
   every other step.
2. Monsternomicon pipeline against Shadowdark core (self-contained, highest
   immediate value, validates the toolkit).
3. Class talents + leveling curve rework (blocks any real combat mechanics
   work, independent of the generators).
4. Settlement/NPC/campaign-engine generators (reuses the toolkit from step 1).
5. Zone framework, seeded by the 6 Cursed Scroll zines (depends on 2 and 4
   for monster tables and generator plumbing to reference).
6. Cursed Scroll monster/NPC ingestion pass for 100% bestiary coverage, once
   the pipeline is proven on Shadowdark core.

## Open questions before scripting begins

- **HP-past-10 formula:** confirm `ceil(hitDie / 2) + CON mod` per level, or
  specify a different flat amount.
- **Final level cap:** 1-36 vs. "AD&D 1-26+" — need one canonical number
  before the leveling table and XP curve can be generated.
- **Cursed Scroll flavor text:** paraphrase/reskin for a distinct ASH voice
  (slower, more IP-safe) vs. import close to verbatim for speed — affects how
  much manual review step 2 of workstream 2 (and the zone lore docs) needs.
- **Non-Shadowdark ASH classes** (Delver, Ras-Godai, Druid, Alchemist, Sage,
  Monk): check the Player's Guide to the Western Reaches / Cursed Scroll
  extracted JSON for equivalents before assuming these need original talent
  tables authored from scratch.
