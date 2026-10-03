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

## Remaining work for equally detailed procedural adventures

The installed site generator provides section counts, names, objectives, targets and guardian picks; it does not produce complete room keys, clue placement or connected adventure text. The NPC generator provides scores, class, local colour, demeanor, motive and retainer stats; it does not fill all named subjects or equipment. Symbolic vulnerabilities usually lack effects. The treasure runtime leaves some magic-item attributes as placeholders. There is no exact Seawolf or generic demon-lord stat entry in this runner's source selection.

To generate those details without new model prose, implement curated, versioned tables or compositional rules for each field, and render the selected records with fixed templates. Include trigger/consequence/duration/discovery in a weakness record; spell/feature/personality in a magic-item record; precondition/action/fallback in a behaviour record; and explicit IDs for relationship and clue targets. Human review of those source tables is the approval of their creative content; generation then selects it reproducibly.

Until such tables exist, missing fields must remain UNRESOLVED. A procedural packet can preserve the same twenty-record structure today; it cannot honestly claim the same degree of finished adventure detail.
