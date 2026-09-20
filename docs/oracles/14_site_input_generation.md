# Site input generation

Generates the **inputs** a site is written from, and stops there. Turning a bundle into the site's actual wording is a separate step — a writer, or a model, weaving the objective into the path and the zone.

A bundle is five things and nothing else:

1. **Site name** — `{form} of the {qualifier} {subject}`: *Mines of the Drowned Gate*. Each column is drawn half from the generic oracle and half from the path's own words.
2. **Context** — one card from the 65-card deck, upright or reversed at random, read against **one** randomly chosen facet: person, creature or trap, place, treasure, or situation.
3. **Objectives** — one per section, each with a kind, a verb-and-noun, and one target name. The verb and noun say *why* it matters, not what it is: rescuing the person to *Conceal the Secret*. One name always, carrying whatever that name needs to be actionable — see the table below.
4. **Zone** — name, theme, and a rolled hazard from the zone manifest.
5. **Site** — size (small / medium / large), danger (unsafe / risky / deadly), kind (caves / deep tunnels / ruins / tomb).

The site's d6 sets its sections, and each section carries one objective: **large** is one 12-area level with a single objective, **medium** is 8 + 5 with two, **small** is 5 + 5 + 5 with three. A coin flip then decides whether those objectives are *similar* — the same job at distinct places, go rescue all three farmers — or *different*: break the ward, kill the boss, rescue the farmer. Either way the places and the targets differ.

Implemented in [`src/shared/site-oracles.ts`](../../src/shared/site-oracles.ts), [`src/shared/path-flavor.ts`](../../src/shared/path-flavor.ts), [`src/shared/tarot-deck.ts`](../../src/shared/tarot-deck.ts), and [`src/server/generators/site-inputs.ts`](../../src/server/generators/site-inputs.ts). Nothing here is wired into live site population yet; the runtime still names targets `copper-marked ward`.

## A generated brief

```
# Ravine of the Sealed Sailor

**Context.** UNDEAD (upright), as creature or trap: An Undead creature
sustained by a thirst for revenge or an unfinished task.

**Objective.** rescue_captive - Ilan, Halfling Duelist, held at the unquiet shuttered cell
**Why (verb + noun).** Rest the Balance
**Held by.** Wight (level 3 Undead, signature)

**Zone.** Wychfen - Gothic Mistwood, Witchcraft & Barrow Mounds; Creeping Blood-Thorns
**Site.** medium (8 areas), unsafe, ruins
**Path.** Domains of Dread, act 1
```

## Where the pieces come from

**Prompt** — SoloDark's two d100 columns, verb and noun, rolled independently of the path and of each other. The pairing is meant to be a little off: it is a suggestion to interpret against the objective. Source: SoloDark V1, Prompts, pg. 11.

**Cards** — the Pleb Generator's `cards.json`, re-ingested by [`scripts/ingest/extract-tarot.ts`](../../scripts/ingest/extract-tarot.ts) from [`data/oracles/tarot-cards.json`](../../data/oracles/tarot-cards.json). Rerun it if the deck changes.

**Targets** — every one of the fifteen kinds generates real content, not just a phrase:

| Kinds | What is generated | Example |
| --- | --- | --- |
| `rescue_captive`, `rescue_companion`, `assassinate_leader` | A person with a class, via `rollDungeonNpc` — Iron Man on 1–5, Unearthed Arcana on a 6, no gear | *Tirolas, High Elf Fighter, held at the obedient collapsed cut* |
| `recover_relic`, `treasure_cache` | A real `rollCoreTreasure` at Fabulous or better | *The mighty Staff of Ord (1,200 gp), in the obedient standard of the held minds* |
| `defeat_guardian`, `monster_eggs` | A creature from the path's pool; eggs are restricted to families that lay | *an intact Rime Walker clutch in the mind-marked brood shelf* |
| `harvest_components`, `exotic_materials` | Three of a measure, of a named substance | *three phials of grave-wax, from the hollowed salt bed* |
| `secure_chokepoint`, `clear_border`, `secure_descent` | What is actually blocking the route | *the silt-choked flooded descent, blocked by foul air that kills a flame in a minute* |
| `lift_curse`, `break_ward` | What the curse does, or what holds the ward closed | *the hollowed watch glyph, watching for a sigil worn on the wrist* |
| `learn_secret` | The path's own evidence concern for that act | *the brine-slick correspondence recording the route used to transport captives* |

The structured content stays on the bundle (`person`, `item`, `brood`, `material`, `obstruction`, `effect`, `subject`) even though the brief prints one line.

**Path flavour** — `PATH_FLAVOR_PROFILES` covers the 22 path engines plus `regional`, keyed to the same ids as `OBJECTIVE_PATH_PROFILES`: site-name columns, epithets, subjects, titles, a weighted monster-family pool, and signature monsters. Monsters are banded by act — act 1 levels 0–3, act 2 levels 2–6, act 3 levels 5–10. An unknown path id throws; `regional` is selected deliberately, never as a default.

## Running it

```bash
SITE_PATH_ID=cthulhu SITE_COUNT=3 SITE_ZONE_ID=dwellers_in_the_deep npx tsx scripts/generate-site-inputs.ts
```

`SITE_PATH_ID=all` walks every profile. With no `SITE_COUNT` it generates a 7 / 11 / 7 path — the shape the [progression audit](../../scripts/audit-path-campaigns.ts) is tuned around. `SITE_SEED` fixes the run; `SITE_JSON=out.json` also writes the bundles as JSON.

## What is still missing

- The generated names are not yet used by `attachSiteObjectives`; wiring them in replaces the `copper-marked` placeholders.
- Monster picks are family weights plus a handful of signatures, so an off-flavour but family-legal creature can appear.
- A site's size here is a descriptor, not the layout's own d6 section roll. Reconciling the two is part of wiring this into site population.
