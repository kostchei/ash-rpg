# Combat & Hazards

> **"Combat in ASH is fast, brutal, and consequential. Avoid fights when you can; win decisively when you must."**

---

## ⚔️ Combat Flow & Round Structure

Combat is played in structured **Combat Rounds** (each round represents ~6 seconds of intense action):

```mermaid
flowchart TD
    Start[Encounter Triggered] --> React[1. 2d6 Monster Reaction Check]
    React -- Hostile --> Init[2. Party & Monster Initiative]
    React -- Neutral / Cautious --> Talk[Parley / Barter / Retreat]
    Init --> Turn[3. Round Turns: Move + Action]
    Turn --> MoraleCheck{Bloodied / Leader Dead?}
    MoraleCheck -- Yes --> Morale[4. 2d6 Morale Roll]
    MoraleCheck -- No --> Turn
    Morale -- Fail --> Flee[Monsters Route or Surrender]
    Morale -- Pass --> Turn
```

---

## 🎯 Distance & Zones

ASH uses intuitive spatial zones instead of rigid grid measurements:

| Range Zone | Distance | Typical Action |
| :--- | :--- | :--- |
| **Close** | Within 5 feet / Melee reach | Daggers, swords, unarmed strikes, grappling. |
| **Near** | Up to 30 feet / One move action | Thrown flasks, shortbows, movement across a chamber. |
| **Far** | Beyond 30 feet / Longbow range | Heavy crossbows, longbows, distant spells. |

---

## 🎲 2d6 Reaction & Morale Engines

### 1. Initial Encounter Reaction (2d6 + CHA Mod)
When an encounter begins and neither side has initiated an ambush:

| 2d6 Roll | Reaction | Behavior |
| :---: | :--- | :--- |
| **2–3** | **Hostile / Aggressive** | Attacks on sight; zero parley. |
| **4–6** | **Suspicious / Threatening** | Weapons drawn, demands tribute or withdrawal. |
| **7–9** | **Cautious / Neutral** | Willing to barter, trade rumors, or ignore party. |
| **10–11** | **Curious / Friendly** | Offers assistance, warnings, or trade opportunities. |
| **12+** | **Allied / Receptive** | Eager to cooperate, join as guides, or form a pact. |

### 2. Monster Morale Check (2d6 vs Monster Morale Score)
Monsters in ASH are living beings with self-preservation instincts. Roll **2d6** whenever:
* The first monster in a group is slain.
* The monster's Hit Points drop below 50% (Bloodied).
* The pack leader or boss is killed.

* **Result:** If the 2d6 roll **exceeds** the monster's Morale rating (typically 7 to 9), the creatures **rout, surrender, or scatter in panic**.

---

## 💥 Critical Hits & Fumbles

### Critical Hit (Natural 20)
* Deal **maximum weapon damage** + roll **one additional damage die**.
* Target must make a CON save or suffer a grievous wound (severed limb, stunned for 1 round, or knocked prone).

### Critical Fumble (Natural 1)
* Weapon drops to the floor or bowstring snaps.
* User grants Advantage to the next melee attack against them.

---

## ☠️ Death & Dying

When a character reaches **0 Hit Points**, they fall unconscious and begin dying.

1. **Start the timer:** Roll **1d4 + 1**. This is the number of the character's turns remaining before death. Do not add the Constitution modifier to the timer.
2. **On each of those turns:** Make a **DC 20 Constitution saving throw**, adding the character's Constitution modifier and class save bonus. On a success, the character regains 1 HP, wakes up, and stops dying. On a failure, reduce the timer by 1; if it reaches zero, the character dies. The character gets a save on the final turn before the timer expires.
3. **Help:** An ally within Close can use an action to attempt a DC 15 Intelligence check to stabilize the dying character. On success, the timer stops; the character remains unconscious at 0 HP. A stabilized character is no longer dying. Healing that restores at least 1 HP also stops the timer and wakes the character.

Roll a new timer each time a character is reduced to 0 HP and begins dying again. This uses the Shadowdark-style timer with ASH's fixed +1 and DC 20 Constitution save.
