# The Core Classes

> **The classic adventuring archetypes, refined through the streamlined Shadowdark d20 talent and resolution engine.**

Every class uses the **2d6 Talent Roll** system upon gaining odd-numbered levels (1, 3, 5, 7, 9) and features specific core class mechanics.

---

=== "Fighter"

    ## ⚔️ Fighter

    Unrivaled masters of weapon craft, battlefield dominance, and physical grit. As fighters gain experience, they strike with unmatched speed and power, delivering multiple devastating attacks per round.

    * **Weapons:** All weapons
    * **Armor:** All armor and shields
    * **Hit Points:** 1d8 per level (capped at 10 HD + CON mod + highest stat mod + Level)
    * **Hauler:** You add your Constitution modifier (if positive) to your total gear slots.
    * **Weapon Mastery & Martial Prowess:**
        * **Mastery Focus:** Choose one weapon group (e.g., Longswords, Greataxes, Bows).
        * **Mastery Bonus:** You gain **+1 to attack rolls** and **+1 to damage rolls** with your mastered weapon.
        * **Martial Prowess (Damage Scaling):** You add **+1/3 of your Fighter Level** (rounded down) to all damage rolls with your mastered weapon.
    * **Extra Attacks (Multi-Attack Progression):**
        * **Levels 1–5:** 1 attack per round.
        * **Levels 6–12:** 2 attacks per round on your turn.
        * **Levels 13–19:** 3 attacks per round on your turn.
        * **Levels 20–30:** **4 attacks** per round on your turn (Maximum).

    ```mermaid
    flowchart LR
        L1["Levels 1–5: 1 Attack"] --> L6["Levels 6–12: 2 Attacks"]
        L6 --> L13["Levels 13–19: 3 Attacks"]
        L13 --> L20["Levels 20–30: 4 Attacks (Max)"]
    ```

    ### Fighter Talents (2d6)
    | 2d6 | Effect (Duplicates: +1 bonus or choose another) |
    | :---: | :--- |
    | **2** | Gain Weapon Mastery with an additional weapon type. |
    | **3–6** | **+1 to melee and ranged attack rolls.** |
    | **7–9** | **+2 to Strength, Dexterity, or Constitution stat.** |
    | **10–11** | **+1 to melee and ranged damage rolls.** |
    | **12** | Choose any talent or gain +2 points to distribute among your stats. |

=== "Thief"

    ## 🗝️ Thief

    Shadow operatives, roof-runners, and infiltrators. Thieves possess an instinctive awareness of hazards and traps, detecting danger before a party member triggers it.

    * **Weapons:** Club, crossbow, dagger, shortbow, shortsword
    * **Armor:** Leather armor, mithral chainmail
    * **Hit Points:** 1d6 per level (capped at 10 HD + CON mod + highest stat mod + Level)
    * **Backstab:** If you hit an enemy who is unaware of your presence or flanked, you deal additional weapon damage dice equal to **half your level (rounded up)**:
        * *Level 1–2:* +1d6 damage
        * *Level 3–4:* +2d6 damage
        * *Level 5–6:* +3d6 damage
        * *Level 7–8:* +4d6 damage
        * *Level 9–10:* +5d6 damage
    * **Thievery:** You have Advantage on checks involving picking locks, disarming detected traps, pickpocketing, moving silently, and climbing walls.
    * **Passive Trap Sense (No Enunciation Needed):**
        * In ASH’s GM-less / procedural play, **the player does not need to declare looking for traps**.
        * Whenever the party enters a room, corridor, or hex containing a hidden trap or ambush hazard, the Thief **automatically rolls a DEX check (DC 12 or dungeon hazard DC)**.
        * *Success:* The hazard is spotted before being triggered, granting the party time to bypass, disarm, or exploit it.

    ### Thief Talents (2d6)
    | 2d6 | Effect (Duplicates: +1 bonus or choose another) |
    | :---: | :--- |
    | **2** | Roll your Backstab damage with Advantage (roll dice pool twice and take higher total). |
    | **3–5** | **+1 to attack rolls with ranged or finesse weapons.** |
    | **6–8** | **+2 to Dexterity or Charisma stat.** |
    | **9–11** | **+1 bonus on all Passive Trap Sense and Thievery checks.** |
    | **12** | Choose any talent or gain +2 points to distribute among your stats. |

=== "Priest (Cleric)"

    ## ⚖️ Priest (Cleric)

    Holy warriors and anointed conduits of the divine who channel radiant power, smite unnatural horrors, and mend the wounds of the fallen.

    * **Weapons:** Club, crossbow, dagger, mace, staff, warhammer
    * **Armor:** All armor and shields
    * **Hit Points:** 1d6 per level (capped at 10 HD + CON mod + highest stat mod + Level)
    * **Deity & Alignment:** Choose a deity matching your alignment (Lawful, Neutral, or Chaotic). Your deity grants access to specific divine spell spheres and holy days.
    * **Turn Undead:** You can rebuke the undead with holy authority. Undead within near must pass a CHA check vs. your spellcasting check or flee for 5 rounds (destroyed if they fail by 10+ points and are equal to or lower than your level).
    * **Divine Spellcasting:** You use **Wisdom** modifier to cast priest spells. The DC is **10 + the spell's Tier**.
        * *Failure:* You cannot cast that spell again until you complete a rest.
        * *Critical Failure (Natural 1):* You lose the spell until you complete divine **Penance**.

    ### Priest Spells Known by Tier
    | Level | Tier 1 | Tier 2 | Tier 3 | Tier 4 | Tier 5 |
    | :---: | :---: | :---: | :---: | :---: | :---: |
    | **1** | 2 | — | — | — | — |
    | **2** | 3 | — | — | — | — |
    | **3** | 3 | 1 | — | — | — |
    | **4** | 3 | 2 | — | — | — |
    | **5** | 3 | 2 | 1 | — | — |
    | **6** | 3 | 2 | 2 | — | — |
    | **7** | 3 | 3 | 2 | 1 | — |
    | **8** | 3 | 3 | 2 | 2 | — |
    | **9** | 3 | 3 | 2 | 2 | 1 |
    | **10** | 3 | 3 | 3 | 2 | 2 |

    ### Priest Talents (2d6)
    | 2d6 | Effect |
    | :---: | :--- |
    | **2** | Choose one priest spell you know; you can cast it with Advantage. |
    | **3–6** | **+1 to divine spellcasting checks.** |
    | **7–9** | **+2 to Strength, Constitution, or Wisdom stat.** |
    | **10–11** | **+1 to melee attack and damage rolls with bludgeoning weapons.** |
    | **12** | Choose any talent or gain +2 points to distribute among your stats. |

=== "Wizard (Magic-User)"

    ## 🔮 Wizard (Magic-User)

    Scholars of cosmic formulas, eldritch geometries, and forgotten arcana who alter reality at great peril.

    * **Weapons:** Dagger, staff
    * **Armor:** None
    * **Hit Points:** 1d4 per level (capped at 10 HD + CON mod + highest stat mod + Level)
    * **Spellbook:** You start with a spellbook containing 3 Tier 1 spells of your choice. You must have your spellbook on hand to study and cast spells.
    * **Arcane Spellcasting:** You use **Intelligence** modifier to cast wizard spells. The DC is **10 + the spell's Tier**.
        * *Failure:* You cannot cast that spell again until you complete a rest.
        * *Critical Failure (Natural 1):* Roll on the **Wizard Mishap Table** for that spell’s Tier.
    * **Learning Spells:** You can copy spells from found scrolls into your spellbook during downtime with a successful INT check (DC 10 + Spell Tier).

    ### Wizard Spells Known by Tier
    | Level | Tier 1 | Tier 2 | Tier 3 | Tier 4 | Tier 5 |
    | :---: | :---: | :---: | :---: | :---: | :---: |
    | **1** | 3 | — | — | — | — |
    | **2** | 4 | — | — | — | — |
    | **3** | 4 | 1 | — | — | — |
    | **4** | 4 | 2 | — | — | — |
    | **5** | 4 | 2 | 1 | — | — |
    | **6** | 4 | 3 | 2 | — | — |
    | **7** | 4 | 3 | 2 | 1 | — |
    | **8** | 4 | 4 | 2 | 2 | — |
    | **9** | 4 | 4 | 3 | 2 | 1 |
    | **10** | 4 | 4 | 4 | 2 | 2 |

    ### Wizard Talents (2d6)
    | 2d6 | Effect |
    | :---: | :--- |
    | **2** | Learn one additional wizard spell of any tier you can cast. |
    | **3–7** | **+1 to arcane spellcasting checks.** |
    | **8–9** | **+2 to Intelligence or Dexterity stat.** |
    | **10–11** | Modify one known spell to cast at Far range instead of Near/Close. |
    | **12** | Choose any talent or gain +2 points to distribute among your stats. |
