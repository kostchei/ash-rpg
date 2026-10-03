# Procedural output contract

Use this format when the request is to roll the system and report its output without prose completion.

## What labels mean

| Label | Permitted content |
|---|---|
| INPUT | User requirements and configuration, including seed, counts, zone, level interpretation and required types |
| SELECTED | Explicit assembly policy, eligibility pool, proxy, fixed count or other unrolled choice |
| GENERATED | Actual procedure output: sampled names, dice, tarot card/orientation/facet, objectives, NPC records, reaction, treasure |
| SOURCE | Exact stored rules/table text and bestiary stats, with source file or table reference |
| UNRESOLVED | Missing mechanics, invalid or contradictory results, unmet requirements and incomplete fields |

“Generated” does not mean previously unauthored: oracle meanings, name pools and bespoke powers were authored before being stored. It means this run selected or computed the value without a new prose interpretation. New assembly code can also encode author choices; expose those as SELECTED rather than attributing them to an existing runtime rule.

## Per-record shape

```
ID / category
Input constraints
Selected procedure / eligible pool
Generated name and fields
Source stats / rules
Tarot: card / orientation / facet / verbatim stored meaning
Generated reaction / reward, where applicable
Unresolved fields / validation problems
Seed / stream / source-table reference
```

Only print available fields. Do not turn a tarot prompt into an asserted history, character motive, location, relationship, clue, tactic, or new power. Do not turn an unresolved weakness into a mechanical effect. Do not invent a surname or title to improve a generated name. Do not imply that adjacency in the report establishes a relationship.

Named placeholders in a treasure row require a recorded follow-up procedure and source table. An unsupported required creature type remains an unmet requirement unless a specific proxy has been accepted. Invalid results remain visible; correcting the generator or applying a declared eligibility rule can generate a new result, but a prose repair is not a procedural result.

## Requirements and coverage

Print a coverage table before the records. Exact requested categories, actual matching source entries, proxies, and omissions must be distinguished. “For level 10+ PCs” is not equivalent to “all creatures are level 10+” or “balanced encounter.” Report which condition the code checks. This runner checks that each encounter contains at least one stock LV 10+ creature; it does not evaluate party size, combat balance or encounter XP budget.

No hidden rerolls. If an eligibility filter or rejection sampler is introduced, record the filter, attempt bound, rejected results, and accepted result. Seed the independent fields so adding a detail does not silently change unrelated draws. Raw records plus source code allow replay; runner-owned dice are additionally logged. Internal site and monster-profile draws currently rely on deterministic seed derivation rather than a complete per-draw transcript.

## Current implementation

`scripts/generate-hrafnfjord-dossier.ts` invokes the installed generators and writes `outputs/hrafnfjord-10plus/draws.json`, `site-inputs.md`, and `procedural.md`. The output directory is fixed; use a different destination or preserve the prior files before generating another seed if both runs are needed.

`scripts/render-procedural-dossier.ts` renders saved records without new interpretation. It can be run separately with input and output paths:

```
npx tsx scripts/render-procedural-dossier.ts outputs/hrafnfjord-10plus/draws.json outputs/hrafnfjord-10plus/procedural.md
```

The older `dossier.md` is an interpreted authoring example and is not overwritten by this pipeline. It contains authored room keys, narratives, connections and symbolic weakness mechanics. Treat it as a different artifact.

## Web generator and readable exports

Open `/generator` in the ASH app. Choose a region, seed, minimum encounter level, record counts and required creature types. The Hrafnfjord preset requests five of each record type and all four creatures. Generation uses the installed oracles, tarot, names, bestiary and treasure procedures; it does not call a language model or modify campaign saves.

The main output is a readable adventure brief: a story opening and expedition request, sites, combat blocks, NPC descriptions and listed treasure. HTML downloads are self-contained and print styled. PDF downloads include pagination and a source appendix. JSON is an optional audit export, not the adventure format. PDF downloads use the exact displayed snapshot, retained in memory for one hour; regenerate if that snapshot expires.

`src/server/generators/dossier-story.ts` holds versioned authored scene, appearance, activity and story templates. Seeded selection and fixed substitution render these as GENERATED with the table reference. The wording was authored when the tables were implemented; the run does not interpret tarot into fresh story prose. `src/server/generators/dossier.ts` declares eligibility and round-robin site allocation as SELECTED, with explicit record IDs. The source toggle reveals those origins in the web report, and exports preserve them.

The minimum level checks that each encounter contains a stock creature meeting that level. It does not assert party balance. The Seawolf is an explicit Nord crew / Sea Serpent proxy, and the demon lord uses Balor as an explicit proxy. Disabling proxies leaves these requirements UNRESOLVED. Site guardians retain their actual stock levels. Aquatic creatures prefer existing water-terrain rows where available. Missing magic-item attributes and symbolic weakness mechanics remain UNRESOLVED.

For a local isolated preview and checked-in examples:

```
npm run build
npx tsx scripts/preview-dossier.ts --serve
```

This serves `http://localhost:3107/generator` using an in-memory source database and writes `outputs/hrafnfjord-10plus/fieldbook.html`, `fieldbook.json`, and `output/pdf/hrafnfjord-fieldbook.pdf`. Omit `--serve` to create only the examples.

## Level ranges and monster selections

The optional `maximumLevel` bounds the primary qualifying creature (the serpent in the Seawolf proxy). Required creatures also respect this bound. Use LV 1–3 for a novice packet; an unbounded minimum of 1 permits every higher-level entry and is not a level-1 balance setting. Site guardians still use act bands.

The optional `monsterKeys` list selects an explicit existing-stock pool. Empty means the region's original wandering pool. This does not silently add to regional canon: every encounter exposes its selection policy. Required types are added separately and may be outside the custom pool. Sampling avoids repeated species, including already-selected companion species, until the pool is exhausted; repeat profiles have independent encounter seeds. Unknown or out-of-range keys fail validation rather than being dropped silently.

`scripts/compare-dossiers.ts` creates twelve reproducible examples, one LV 1–3 and one LV 10–16 packet per region, with distinct seeds and declared monster selections. `outputs/region-comparison/index.html` compares the pre-change baseline with improved results and links all twelve readable HTML fieldbooks. JSON files are audit records. The input pool/range changes are intentional and disclosed; this is a sample review, not a statistical encounter-balance assessment. Stored story tables are now version 2 and include regional site details and family-based activities.

Run `npx tsx scripts/compare-dossiers.ts`, then `python scripts/assemble-region-atlas.py` with `pypdf` and `reportlab` installed to create the bookmarked comparison atlas. The recorded baseline comes from commit `04974b7`; preserve it when regenerating current results. The isolated preview also serves the examples at `/comparison/` and the atlas at `/comparison/atlas.pdf`. Add `--skip-example` to its `--serve` command to keep the older Hrafnfjord example intact.

## Remaining work for more detailed procedural adventures

The installed site generator provides section counts, names, objectives, targets and guardian picks; it does not produce complete room keys, clue placement or connected adventure text. The NPC generator provides scores, class, local colour, demeanor, motive and retainer stats; it does not fill all named subjects or equipment. Symbolic vulnerabilities usually lack effects. The treasure runtime leaves some magic-item attributes as placeholders. There is no exact Seawolf or generic demon-lord stat entry in this runner's source selection.

To generate those details without new model prose, implement curated, versioned tables or compositional rules for each field, and render the selected records with fixed templates. Include trigger/consequence/duration/discovery in a weakness record; spell/feature/personality in a magic-item record; precondition/action/fallback in a behaviour record; and explicit IDs for relationship and clue targets. Human review of those source tables is the approval of their creative content; generation then selects it reproducibly.

The web renderer now supplies curated scene descriptions, an expedition request, activities, appearance and explicit site connections. Full room keys, clue chains and missing mechanics still require additional source tables; those gaps remain UNRESOLVED.
