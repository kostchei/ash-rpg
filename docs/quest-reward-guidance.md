# Quest rewards: research and proposed policy

Research date: 2026-09-12. Reward scaling below is a proposal, not an implemented payout rule.

## Rules evidence

Kelsey Dionne's *Shadowdark Game Master Quickstart*, p. 13, suggests approximately 10 GP times average party level per encounter for the group, with shorthand values of 20/50/80 GP for levels 1–3/4–6/7–9. XP depends on treasure quality (0/1/3/10), not a GP conversion. Danger categories change encounter frequency. Page 41 selects monster treasure by monster level and unguarded treasure by discovering character level.

Sources: [publisher's Quickstart distribution](https://www.thearcanelibrary.com/products/shadowdark-rpg-quickstart-set-pdf), [readable mirror of the authored GM Quickstart, pp. 13–14 and 41](https://studylib.net/doc/28430488/quickstart-gm-screen). The mirror is a 2023 text; this research did not verify the full current paid core treasure tables. These guidelines are not a prescribed quest-bounty schedule.

## Assessment of current offers

The surveyor's 40 GP and clerk's 30 GP are fixed text in procedural-region.ts. They are plausible modest payments to a low-level party, especially in addition to recovered treasure. They are not scaled to character level, quest length or danger. A long expedition needs several encounters' worth of total value, including site treasure and the patron payment. A share of an unknown coffer cannot be evaluated as a fixed reward, and can legitimately yield nothing.

The separate monster treasure implementation is also custom: it collapses all levels above 6 into one tier. It does not reproduce the core book's four treasure tables. That system should be reviewed separately before claiming core-table fidelity.

## Proposed reward budget

Use an adventure's intended level band, fixed when the offer is created. Do not reprice an accepted quest every time a character levels up. Average party level can initialize newly generated jobs; actual monster level remains the basis for guarded treasure.

| Intended level | Group value per meaningful encounter |
| --- | ---: |
| 0–3 | 20 GP |
| 4–6 | 50 GP |
| 7–9 | 80 GP |
| 10+ | 10 × intended level GP |

The level-0 use of 20 GP is a house-rule extension of the 1–3 shortcut. The 10+ formula extrapolates the general guideline; it is not a transcription of the 10+ treasure table.

For a short job involving two meaningful encounters, a proposed total budget is baseline × 2 × danger factor: 1 for ordinary risk, 1.5 for elevated risk, 2 for severe risk. These factors are house rules. At levels 0–3 this gives 40/60/80 GP; at 4–6, 100/150/200; at 7–9, 160/240/320; at level 10, 200/300/400. Amounts are for the whole party, not each character.

Split this budget between the patron's promised fee and expected recoverable valuables. Avoid awarding the whole budget twice. For example, an elevated-risk two-encounter low-level rescue might offer 40 GP plus roughly 20 GP of recoverable valuables. A poorer patron can substitute supplies, shelter, information or a favor. Do not convert these budgets automatically to XP.

Danger needs separate concepts: reported hazards, area threat tier, monster level, and the rules' encounter-frequency category. The app's numerical threat tier does not establish an automatic mapping to Unsafe/Risky/Deadly. Only apply a multiplier after defining an explicit quest risk rating; do not infer it from hidden destination outcomes. Higher danger should improve expected opportunity, not guarantee loot or reveal false rumors.

## UI correction

Render each lead once and retain its title, source, description, direction, reported danger, preparation, promised reward and selection control. Use both legacy danger fields. When a numerical danger report is absent, use a known surveyed area's tier as an explicitly labeled estimate; otherwise state that the level is unknown. Keep unrevealed site details private.
