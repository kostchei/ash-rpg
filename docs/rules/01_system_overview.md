# System Overview & Core Resolution

> **"In the shadows of the unknown realm, steel meets sorcery, and every decision carries the weight of survival."**

Automata for Swords and Hexes (ASH) uses a unified, fast-flowing **d20 roll-under / target-based** system paired with a **2d6 reaction and talent engine**. The rules are designed to be fast at the table, highly lethal, and completely playable solo or as a co-op group without a Dungeon Master.

---

## 🎲 Core Dice Conventions

```mermaid
flowchart TD
    Check[Take an Action] --> D20{Is it an Ability Check or an Attack?}
    D20 -- Ability Check --> Stat[Roll d20 vs Ability Score or DC]
    D20 -- Attack Roll --> AC[Roll d20 + Modifiers vs Target AC]
    Stat -- Natural 20 --> CritSuccess[Critical Triumph!]
    Stat -- Natural 1 --> Mishap[Fumble / Complication!]
    AC -- Meet or Beat --> Damage[Roll Weapon Damage Dice]
```

### 1. The D20 Test
Whenever a character attempts an action with a significant chance of failure or consequence:

* **Difficulty Class (DC):** The referee or oracle establishes a Difficulty Class:
  * **DC 9 (Easy):** Routine under pressure.
  * **DC 12 (Moderate):** Standard adventuring obstacle.
  * **DC 15 (Hard):** Dangerous feat requiring expertise.
  * **DC 18 (Very Hard):** Masterwork or heroic undertaking.
* **Rolling the Test:** Roll **1d20 + Ability Modifier**. If the total equals or exceeds the DC, the action succeeds.

### 2. Advantage & Disadvantage
* **Advantage:** Roll **2d20** and take the **higher** result. Awarded for superior positioning, prep work, clever tactics, or ancestry traits.
* **Disadvantage:** Roll **2d20** and take the **lower** result. Imposed by severe hindrances, magical blindness, exhaustion, or fighting in total darkness.
* *Rule of Cancellation:* Instances of Advantage and Disadvantage cancel each other out one-for-one.

### 3. Critical Rolls
* **Natural 20 (Critical Triumph):** Maximum damage + bonus damage die in combat, or extraordinary unintended benefit out of combat.
* **Natural 1 (Fumble / Catastrophe):** Immediate weapon drop, gear breakage, spell mishap, or immediate dungeon tension trigger.

---

## 📊 The Six Core Abilities

Characters possess six classic ability scores ranging from **3 to 18**, with modifiers from **−4 to +4**. No ability score can be raised above 18 or reduced below 3:

| Ability | Abbr | Primary Use in ASH |
| :--- | :---: | :--- |
| **Strength** | **STR** | Melee attacks, brawn, breaking doors, athletic feats. |
| **Dexterity** | **DEX** | Ranged attacks, Armor Class modifier, stealth, reflex saves. |
| **Constitution** | **CON** | Hit Points per level, poison/disease saves, gear slot capacity. |
| **Intelligence** | **INT** | Arcane spellcasting, Monsternomicon lore checks, languages, ancient history. |
| **Wisdom** | **WIS** | Divine/Primal spellcasting, perception, tracking, willpower saves. |
| **Charisma** | **CHA** | Reaction rolls (2d6), retainer morale, NPC negotiations, dark glamour. |

### Ability Modifiers
Modifiers are calculated as **floor((ability score - 10) / 2)**: subtract 10, divide by 2, and round down.

| Ability Score | Modifier | Ability Score | Modifier |
| :---: | :---: | :---: | :---: |
| **3** | -4 | **12–13** | +1 |
| **4–5** | -3 | **14–15** | +2 |
| **6–7** | -2 | **16–17** | +3 |
| **8–9** | -1 | **18** | +4 |
| **10–11** | +0 | — | — |

---

## Saving Throws

A saving throw resists an immediate danger: for example, DEX against a fireball, CON against poison, or WIS against a charm. The effect names the ability. Roll **d20 + that ability modifier + the appropriate class save progression bonus**. Meet or beat **DC 15** unless the effect specifies another DC. An ability check to perform an action is not a saving throw and does not use these bonuses.

Each class assigns two abilities to each tier: **strong**, **medium**, and **weak**. Consult the [class save assignments](class_roster.md#class-saving-throws). Each tier gains the same +1 at levels 4, 7, 10, 13, 16, and 19. Add the appropriate tier bonus and the actual ability modifier to the d20 roll.

| Level | Weak | Medium | Strong |
| --- | ---: | ---: | ---: |
| 1–3 | +0 | +1 | +2 |
| 4–6 | +1 | +2 | +3 |
| 7–9 | +2 | +3 | +4 |
| 10–12 | +3 | +4 | +5 |
| 13–15 | +4 | +5 | +6 |
| 16–18 | +5 | +6 | +7 |
| 19–21 | +6 | +7 | +8 |

For example, a level 19 character with a weak CON save and CON 10 (+0) rolls d20 + 6 against DC 15 and succeeds on 9 or higher. A level 19 character with a strong CON save and CON 18 (+4) rolls d20 + 12 and succeeds on 3 or higher. Use the character's actual ability modifier, even when it is negative. Existing effects that grant advantage or disadvantage still apply, and a specified DC overrides the standard DC. A dying character makes a DC 20 CON save using the normal class save bonus; see [Death & Dying](09_combat_and_hazards.md#death-dying).

---

## ⚖️ The 2d6 Table System

ASH uses **2d6 rolls** for two crucial systems:
1. **Monster Reactions & Morale:** Unbiased, procedural determination of whether creatures attack, negotiate, or flee.
2. **Class Talents:** Roll on your class table at every odd level, including 1st (1, 3, 5, and so on through 21).

### Advancement and downtime

At every even level (2, 4, 6, and so on), gain one **automatic downtime success**. During a later downtime activity, spend it before rolling to succeed at one check that the activity requires. The activity must be possible and you must still meet its requirements, costs, and duration. One success does not complete extra steps or guarantee random rewards. Record unused successes; each can be spent once.

### Ability increases from class talents

Scores, including starting scores after ancestry adjustments, cannot go below 3 or above 18. Apply an increase only up to 18; excess points are lost unless the talent permits them to be assigned elsewhere. If a required decrease would go below 3, it stops at 3.

For this playtest, a **caster** is a class whose starting features grant spellcasting or a spell list; use the class's casting ability. A class that only gains a spell from an optional talent remains a non-caster. Patron spellcasting counts; a Warlock chooses Intelligence or Charisma as their casting ability when choosing a patron. If a class lets you choose its casting ability, choose one at character creation. Each non-caster chooses two prime abilities at character creation; for an ability archetype, the named ability must be one of them. These are not minimum score requirements and do not change saving throw assignments.

When a class talent increases ability scores, casters gain **+1 to their casting ability**. Non-casters gain **+2**, assigned as the class talent directs: a prime result goes to either or both prime abilities; a flexible result can go to any abilities. These rules replace conflicting ability-increase amounts or destinations in older class talent tables; other effects in a result remain unchanged. This is an initial playtest of a smaller caster increase, not a claim that every class has the same chance of rolling one.

If a caster's casting ability is already 18, or both of a non-caster's prime abilities are already 18, a player who rolls an ability-increase result may instead choose any other result on their class talent table. A result that also has a separate non-stat option may use that option. Do not roll an extra talent unless the chosen result explicitly grants one.

---

## 🕯️ Situational Light & Crawl Time

Light becomes a tracked resource only when it creates a meaningful problem. Ignore light bookkeeping in daylight, within a settlement, beside a campfire, or while the party has a fueled lantern.

* **Active Darkness:** Start tracking light when the party moves away from stable light into night, underground passages, or supernatural darkness without a lantern or equivalent durable source.
* **Torches:** In active darkness, one torch lasts **6 Crawling Turns** (about 1 in-game hour). There is no real-world countdown.
* **Dungeon Crawling Turns (10 Minutes in-game):** In a dangerous dungeon, every search, lock attempt, or room investigation consumes 1 Crawling Turn. Every 2 turns, make an encounter/hazard check.

If darkness is not currently changing the party's choices, do not run a light timer.
