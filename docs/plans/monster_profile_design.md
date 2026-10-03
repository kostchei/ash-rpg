# Monster profiles: vulnerabilities, lore, and tactical abilities

Drafted 2026-09-30 from the requested bestiary expansion. This is an authoring specification and a sample set, not an implemented combat system. The source catalogue currently contains 301 imported records: 237 Shadowdark Core and 64 Cursed Scrolls.

**Runtime update:** encounter creation now uses `src/server/generators/campaign-monsters.ts`. The source inventory is shared with the audits. Campaign profiles persist their distinct pool draws, stock weaknesses, conditional form, and the drafted power assigned to each formerly zero-ability monster. Oracle variants add their strength to the count and retain their weakness as one of the new draws. Combat and discovered Codex entries display vulnerabilities at lore tier 3. Damage draws use their stored double-damage effect; other draws retain the stored prompt and are explicitly marked as needing an authored effect. Lore and harvest use existing authored data. This does not automate power resolution or create new lore. Reproduce actual samples with `npx tsx scripts/bestiary/generate-runtime-samples.ts`.

The three additions sit in authored profiles above the imported stat blocks. See [the sample profiles](../bestiary/profile_samples.md). The older [knowledge and authoring plan](monster_knowledge_and_authoring.md) remains a separate implementation proposal; its historical audit and 296-monster counts are not current.

## 1. Vulnerabilities mix physical and psychological susceptibilities

Every monster needs **one vulnerability, plus one additional vulnerability per special ability**. Special abilities increase the required number; vulnerabilities do **not** have to counter those particular abilities or map to them one by one. A flying creature might be vulnerable to generosity, poison, or music without any of those grounding it.

Draw candidates from the [expanded vulnerability pool](../bestiary/vulnerability_pool.md): Shadowdark weaknesses, all 13 5e damage types, the standard 78-card tarot deck, and both sides of Pendragon's 13 personality-trait pairs. The pool supplies themes; each monster profile supplies its particular trigger and effect.

**A vulnerability is a particular susceptibility of the creature: exposure to a substance, condition, act, or obligation imposes a penalty, causes exceptional harm, or disables an advantage.** Leaving an attack's range, breaking line of sight, separating its allies, taking cover, and dodging are ordinary counterplay. They do not satisfy either vulnerability requirement. Keep them in tactical advice, outside the vulnerability inventory.

A vulnerability has a concrete trigger, an observable effect, a duration, and an accessible way to discover it. "Vulnerable to pride" is incomplete. "When an opponent spends an action challenging it to demonstrate its invulnerability, it exposes its belly until the beginning of its next turn; attacks against the belly use AC 12" is playable.

Counters can:

- Multiply damage: a mummy takes twice the final fire damage, including ordinary fire.
- Suppress a power: salt prevents a supernatural escape for a specified duration.
- Bypass a defence: opening a plate exposes an AC 12 joint without reducing the creature's AC elsewhere.
- Cause a specific impairment: salt stiffens a troll's exposed tendons and disables its throwing power.
- Overload a particular sense: pungent pepper overwhelms gnolls' blood-scent, suppressing their rage and coordinated blood response.
- Exploit an obligation or desire: an accepted gift prevents a fey from harming its giver until the debt is repaid.
- Induce a specific fear: bees cause an elephant to panic, disabling Charge and Trample.

An alternate encounter objective does not satisfy the vulnerability requirement by itself. A floodgate that sweeps a monster away is an environmental solution; it is only a vulnerability if the monster has a specific susceptibility to the water or its effects. AC 20+ and HP 100+ each count as a special ability for determining the number of vulnerabilities; their additional vulnerabilities need not reduce AC or HP directly.

### What counts as a special ability?

Inventory the advantages already present in the source record before adding anything:

- Named traits and special riders on attacks: regeneration, charm, poison, paralysis, curses, swallowing, severing, breath weapons, and similar effects.
- Exceptional movement: flight, climbing, burrowing, swimming where it supplies a combat advantage, teleportation, and phasing.
- Defences: damage immunities, immunity to ordinary weapons, magic resistance, immunity to morale checks, and unusual survival conditions.
- Exceptional numbers: **AC 20 or higher** and **HP 100 or higher**, even if neither has a named source trait.
- Each newly authored tactical power.

Count a named active power once, including its bundled effects. Split independently useful passive defences: a trait granting immunity to ordinary weapons and to fire contains two abilities. Deduplicate a power described both in attacks and traits, and movement described both in a trait and the movement field. Do not count each ordinary attack, multiattack, ordinary reach, or point of AC as a special ability. Below the numeric thresholds, a named defence may still be inventoried when it defines that monster's identity.

The [301-record ability audit](../bestiary/special_ability_audit.md) lists the inventory and counts. It finds 26 records with zero existing abilities and stores one draft 4e-inspired addition for each in `data/bestiary/ability-additions.json`. This completes the count and initial drafting step; it does not apply those abilities to runtime combat. The next profile-authoring pass uses the planned counts when assigning vulnerabilities. Conditional forms and source-data defects are recorded explicitly.

The [stock vulnerability audit](../bestiary/stock_vulnerability_audit.md) records existing susceptibilities separately from authored additions. Troll fire/acid and deep-troll cold iron are **regeneration counters**, not stock vulnerabilities: their source rules suppress healing without imposing extra damage. They are recorded in a separate column and do not reduce the number of vulnerabilities to author.

### Physical and behavioural vulnerabilities

Both must have rules. No counter relies on a referee deciding whether a speech was eloquent enough.

| Vulnerability | Observable player action | Example consequence |
|---|---|---|
| Pride | Spend an action publicly challenging the creature to display an otherwise hidden defence | It displays that defence until its next turn, opening a named weak point |
| Courage | Remain close and spend an action declaring a single combat challenge while bloodied | An honour-bound knight focuses its next attack action on the challenger and cannot call for allied attacks that turn |
| Generosity | Offer a useful possession without requesting payment, and let the fey take it | Once accepted, the gift bars hostile powers against the giver until an equally valuable gift repays the debt |
| Salt | Spend an action applying a handful to a wound or laying an unbroken line | Suppresses a named power or blocks crossing that line until it is physically broken |

These are authoring patterns, not universal rules applying to every proud creature, knight, or fey. Profiles define qualifying gifts, physical quantities, affected abilities, and limits. Challenges cannot silently become mind control; an authored oath or compulsion is what makes the effect reliable.

## 2. Lore makes the monster part of the world

Use original prose with four editorial headings: **Common, Uncommon, Rare, Obscure**. These headings organize content; this draft does not replace the app's lore DCs or adopt the older plan's five-rung rules.

| Heading | Purpose |
|---|---|
| Common | Recognition, appearance, habitat, ordinary encounters, and a visible sign of the main danger |
| Uncommon | Behaviour and ecology; a clue pointing toward a practical counter |
| Rare | Exact exploitation instructions, ability counters, and useful material or live-specimen value |
| Obscure | Origin, relationships, motivation, a secret obligation, or a larger consequence |

Each complete profile also contains:

- **Two hooks:** specific situations with people who want something, evidence the party can find, and a choice or complication. Connect each to an ability or vulnerability.
- **One treasure/component entry:** what to recover, from a dead or living creature as appropriate, how to obtain it, and its concrete use or buyer. Specify quantity, extraction DC if relevant, expiry, consumption, and a proposed price. A price without a buyer is only a valuation, not guaranteed income.
- **One legend:** an account of the creature's origin or motivation that offers practical leverage. Rare and Obscure lore can refer to it without repeating it verbatim.

Information is not exclusively gated behind a lore roll. Every essential counter has at least one encounter clue and one route through research, testimony, tracks, or recovered objects. In a solo/co-op game, the encounter instructions and visible telegraphs must be available to whoever runs the creature; learning its secrets is a separate matter.

Avoid generic "essence" treasure and generic "ancient evil" history. Do not copy the supplied books' setting names, prose, or mechanics wholesale. No XP crafting costs: translate a component's benefit into ASH checks, consumables, rituals, or trade.

## 3. Tactical powers change decisions

Each monster gets at least one power that changes position, target choice, timing, terrain, cooperation, or the party's objective. A flat damage bonus alone does not satisfy this requirement.

Use 4e's tactical clarity with ASH's close/near/far distances and move + action turns. Every power specifies:

1. **Use:** replaces the attack action, modifies one existing attack, uses movement, occurs at the start of the turn, or is a limited triggered effect.
2. **Trigger and telegraph:** when it becomes available and what the party can observe beforehand.
3. **Targets and range:** including whether allies are affected.
4. **Resolution:** attack or save, DC, effect on success/failure, and duration.
5. **Frequency:** at will, once per fight, recharge, or a stated trigger with a cap.
6. **Interactions:** any relevant vulnerability interaction, when one exists. A power need not have its own specific counter. List ordinary avoidance advice separately.
7. **Behaviour:** when the monster uses it and a tie-breaker for equivalent targets.

### Shared wording for the draft samples

- **Bloodied:** at or below half maximum HP.
- **Shift:** reposition up to close distance within reachable terrain. This grants no extra attack. These samples do not introduce opportunity attacks.
- **Push:** displace a target the stated distance away from the source, stopping at an obstruction. Unless the individual power says otherwise, forced movement stops at a lethal drop; creating instant unavoidable kills is not its purpose.
- **Prone:** proposed sample convention: melee attacks against the target have advantage; standing uses the target's movement for that turn. This convention needs integration before app use.
- **Aura:** an area with a stated start-of-turn or entry trigger, rather than damage every time a model moves an inch. Unless stated otherwise, each target is affected at most once per round; identical auras do not stack.
- **Triggered attack:** at most one triggered attack per creature per round. A triggered attack cannot itself trigger another attack. Each power may impose a stricter limit.
- **Duration:** use "until the start/end of [creature]'s next turn" rather than an ambiguous "one round."

Preserve the source attack budget by default. Trample replaces attacks; a mobile strike uses the existing movement and attack; a push can replace one damage-dealing hit. Added attacks require an explicit budget and limit. Telegraphed danger and a workable counter are particularly important for disabling powers.

## 4. Stored profile shape

The eventual database layer should preserve original stats and hold additions in `data/bestiary/profiles/<monster-id>.json`. Re-extracting the books must not overwrite authored content.

| Field | Required content |
|---|---|
| `monsterId` | Exact imported ID |
| `status` | Draft or reviewed; neither means playtested |
| `tactics` | Role, behaviour, preferred position, target priority, tie-breaker |
| `advantages[]` | Stable ID, name, source reference, and kind: trait, attack rider, movement, numerical defence, or new power |
| `vulnerabilities[]` | Stable ID, pool reference, category, trigger, effect, duration, and clues; optional ability links only when relevant |
| `creatureVulnerabilityIds[]` | At least one vulnerability affecting the creature as a whole |
| `powers[]` | The tactical card fields in §3 and associated advantage ID |
| `lore` | Common, Uncommon, Rare, Obscure |
| `hooks[]` | Exactly two original hooks with linked advantage/vulnerability IDs |
| `component` | Acquisition, yield, concrete use, consumption/expiry, and proposed value or buyer |
| `legend` | Origin or motivation plus leverage |
| `ruleChanges[]` | Each explicit source-rule replacement, with original reference and new rule |

Vulnerabilities use IDs, not just tags like `fire`: several fire-related weaknesses can have different effects. Retained Shadowdark abilities should reference their trait index or attack/movement/stat field. Splitting a trait allows multiple advantages to share the same source reference. Links from a vulnerability to a particular advantage are optional.

Validation must detect dangling optional links, insufficient vulnerabilities for the special-ability count, omitted AC/HP threshold advantages, and powers without clear timing or limits. Semantic review checks whether each vulnerability is a meaningful susceptibility rather than ordinary avoidance advice. It must not require a matching counter for every power.

### Acceptance before full authoring

- Review the sample style and density before expanding to all 301 imported records.
- Every source advantage has been inventoried; each monster has at least one vulnerability plus one per special ability. No one-to-one counter matching is required. Ordinary counterplay does not count toward coverage.
- At least one creature vulnerability and one tactical power per monster.
- All tactical prose works with close/near/far and explicit turn timing.
- Lore, hooks, components, and legends are specific to the creature and provide useful decisions.
- Source rules and added or replaced rules are distinguishable.
- Ability and component effects need table playtesting; this document does not claim encounter balance or runtime support.
