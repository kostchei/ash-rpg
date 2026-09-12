# Quest rewards: research and implemented policy

Research date: 2026-09-12. Implemented 2026-09-13 in `src/shared/quest-rewards.ts` and `src/shared/danger.ts`.

## Rules evidence

Verified against the Shadowdark RPG core rules (V4.8):

- **Awarding XP (p. 117).** Treasure has four categories — Poor (0 XP), Normal (1 XP), Fabulous (3 XP), Legendary (10 XP). Each PC gets the full XP value of each treasure, and XP resets to zero on level-up. Per treasure find, a group should gain about 10 GP x their average party level in value, or 20 GP at levels 0–3, 50 GP at 4–6, 80 GP at 7–9.
- **Random Encounters (p. 112).** The environment's danger level sets how often the GM checks: Unsafe every 3 crawling rounds, Risky every 2, Deadly every round. These three words are the rules' own danger vocabulary.
- **Treasure Overview (p. 269).** Wandering monsters have only a 50% chance of carrying treasure and are poor sources of XP. A monster rolls on the treasure table matching **its** level; unguarded treasure is rolled on the table matching the **discovering character's** level.
- **Treasure tables (pp. 270–277).** Four d100 tables: Treasure 0-3, 4-6, 7-9 and 10+.

These are guidelines for treasure finds, not a prescribed quest-bounty schedule; the budget below builds on them.

## Danger vocabulary

Areas and quests are described with the danger words **Unsafe, Risky, Deadly** from p. 112, never with bare tier numbers. *Safe* is this app's own label for a tier-0 area where no encounter check is made — the book names only the three that carry a check. `src/shared/danger.ts` is the single place that turns the stored numeric `threatTier` (0–3) into a word for display; the column itself stays numeric, so no data migration was needed.

A quest carries a separate, explicit `riskLevel` of Unsafe, Risky or Deadly, set when the offer is created. It is never inferred from an area's threat tier and never from a hidden destination outcome. Where a lead has no rating, the UI reports a surveyed area's danger as an explicitly labelled estimate ("Risky (area estimate)") and otherwise says "Danger level unknown". Unsurveyed hex tiers are never leaked.

## Reward budget

`questRewardBudget()` prices an offer once, from the adventure's intended level band. An accepted quest is not repriced when characters level up; average party level only initializes newly generated jobs. Actual monster level remains the basis for guarded treasure.

| Intended level | Group value per meaningful encounter |
| --- | ---: |
| 0–3 | 20 GP |
| 4–6 | 50 GP |
| 7–9 | 80 GP |
| 10+ | 10 × intended level GP |

The level-0 use of 20 GP is a house-rule extension of the 1–3 shortcut. The 10+ formula extrapolates the general guideline; it is not a transcription of the 10+ treasure table.

Total budget is baseline × encounters × risk multiplier, where the multipliers are **Unsafe 1, Risky 1.5, Deadly 2**. These factors are house rules. For a two-encounter job this gives 40/60/80 GP at levels 0–3; 100/150/200 at 4–6; 160/240/320 at 7–9; 200/300/400 at level 10. Amounts are for the whole party, not each character.

The budget is split between the patron's promised fee and expected recoverable valuables, so the same value is not awarded twice. The default patron share is two thirds, rounded to the nearest 5 GP; `patronShare: 0` prices a job paid entirely out of what the party recovers. A Risky two-encounter level-1 rescue therefore offers 40 GP plus roughly 20 GP of recoverable valuables. A poorer patron can substitute supplies, shelter, information or a favor. These budgets are not converted to XP.

Offers carry their pricing on the lead itself (`riskLevel`, `intendedLevel`, `expectedEncounters`, `rewardBudgetGp`, `patronFeeGp`, `recoverableValueGp`) so the promised reward text and the budget cannot drift apart. Higher danger improves expected opportunity; it never guarantees loot or reveals false rumors.

### Current offers

The opening tavern leads in `procedural-region.ts` are priced for level 1 and two meaningful encounters: the surveyor rescue is Risky (40 GP fee + ~20 GP recoverable), the clerk escort is Unsafe (25 GP fee + ~15 GP recoverable), and the prospector's relic claim is Risky with no fee at all — the whole ~60 GP has to come out of a coffer that may be empty. The post-rescue Karst siphons follow-up is Deadly, priced from the party's average level at the moment it is offered.

## Monster treasure

The invented treasure pools are gone. `scripts/ingest/extract-treasure-tables.ts` extracts all four printed d100 tables into `data/treasure/core-tables.json` (50 rows each, full 1–100 coverage, asserted at extraction time), and `src/server/rewards/core-treasure.ts` rolls on them:

- A monster's carried treasure uses the table for **its** level; `generateUnguardedTreasure()` uses the table for the **discovering character's** level, as p. 269 directs.
- Each row keeps its printed d100 width as its weight, so the distribution is the book's.
- A find is either loose coin or an object, never both — the old code handed out coins *and* items on every hit.

The one thing the book does not supply is a quality label per row, so `treasureQualityForValue()` is the app's own mapping: a find is Poor below half the expected find value for that level, Normal below 2x, Fabulous below 10x, and Legendary at or above 10x. Anchored on 20/50/80 GP (and 10 GP x level above 9) this puts each table's junk rows at Poor and its capstone rows at Legendary — the Staff of Ord, the book's own Legendary example, grades Legendary. The resulting spread is roughly 20% Poor / 55% Normal / 25% Fabulous / 1% Legendary per table.

The 50% carried-treasure presence roll and the app's rule that a successful presence roll never yields a Poor find are unchanged; the Poor rows are simply excluded from that particular draw, with every other row keeping its weight.

## Where treasure actually sits in a site

Three independent things put treasure in a site, and they do not compete for the same areas:

1. **Carried treasure.** A monster area registers its encounter group, which makes one 50% presence roll on the monster's own level table.
2. **Random unguarded finds.** Every area rolls a d10 feature and a 9 is a cache, so a site holds a random number of unguarded finds, each rolled on the discovering party's level table.
3. **The adventure's own caches.** A site plan's `authoredCaches` are placed content. They reserve their areas up front and are always in the site, whatever the feature rolls came up. Previously they were only created when an area happened to roll a treasure feature, so a site with three authored caches usually surfaced one of them and the other two silently vanished.

Objectives are a fourth, separate thing, and most of them are not treasure at all. Of the fifteen objective kinds, five are treasure-shaped — `recover_relic`, `harvest_components`, `treasure_cache`, `exotic_materials`, `monster_eggs` — and those place their named target plus, in an area that holds nothing else yet, a real find rolled on the party's table. The other ten pay out in a rescued person, a defeated commander, an opened route, a lifted curse or a secret learned, and place no treasure of their own. All objectives award story XP regardless.

## Progression

`runPathProgressionAudit` now walks each site the way `materializeSitePlan` does — the site's own d6 size roll, then a d10 feature per area — instead of assuming a fixed encounter count and awarding every authored cache unconditionally. With book-accurate treasure and correctly placed caches, The Night Below puts about 99% of parties at level 9 entering the finale and 98–99% at level 10 at completion, against the release criteria of 95%.

## UI

Each lead renders once and retains its title, source, description, direction, reported danger, preparation, promised reward and selection control. Both legacy danger fields are read. Unrevealed site details stay private.
