# Character Creation Guide

> **"Roll your stats, claim your heritage, bind your anchors, and step into the perilous unknown."**

Creating a character in **Automata for Swords and Hexes** takes under 10 minutes. Follow these 7 steps to generate your adventurer and seed the campaign world.

---

## 🧭 The 7-Step Creation Flow

```mermaid
flowchart LR
    S1[1. Roll Stats] --> S2[2. Pick Ancestry]
    S2 --> S3[3. Pick Class]
    S3 --> S4[4. Roll Starting HP & Gear]
    S4 --> S5[5. Roll Level 1 Talent]
    S5 --> S6[6. Answer 3 Anchors]
    S6 --> S7[7. Calculate AC & Attacks]
```

---

### Step 1: Roll Ability Scores
Pick one of the two generation methods. You start with **one of each** — the minimum party size is 2, so you need both.

Iron Man characters are **unlimited** — roll as many as you need. Your **Unearthed Arcana character is once per campaign**; after that one is spoken for, any further chosen heroes have to be **rescued from dungeons** rather than rolled up.

Sets that fail a method's requirements are **rerolled silently behind the scenes**, so what you see is already legal. The one exception: **a set containing an 18 is always kept**, however badly it fails everything else.

#### Iron Man Method
Roll **3d6 in order** for the six core stats: **Strength, Dexterity, Constitution, Intelligence, Wisdom, and Charisma**. The set must have:

* at least one score of **16 or higher**;
* a second score of **12 or higher**;
* **no more than one** score below 6 (a 3, a 6 and a 7 is fine; a 5 and a 4 is not);
* a **total of 64 or higher**.

Class choice is restricted to classes whose Prime Requisite you meet.

#### Unearthed Arcana Method
Pick a class first — the class sets the priority order of the six abilities. Roll dice pools down that order, keeping the **best 3 dice** each time:

**8d6, 7d6, 6d6, 5d6, 4d6, 3d6.**

Once **two abilities have come up 16 or higher**, every remaining pool drops to **4d6 keep 3**, except the last ability, which is always **3d6**. The set must have:

* **no more than one** score below 6;
* a **total of 72 or higher**.

#### NPCs
* **Retainers are classless.** Hirelings from the guildhall simply roll **3d6 per stat**, with no requirements and no class.
* **NPCs met or rescued inside a dungeon have a class** — they are adventure site objectives. Roll **1d6**: on **1–5** they are an **Iron Man** character (roll the stats, then assign a class they qualify for); on a **6** they are an **Unearthed Arcana** character (roll a random class first, then roll down its ability order).
* **Rescued NPCs carry no gear.** Whatever they had was taken before you found them — equip them from party stores.
* **Rescued NPCs and companions join the party**, and generally must: an extra pair of hands is often how the party gets back out. They join the roster regardless of the marching cap below, since the cap is checked at the tavern, not underground.

---

### Party Adjustment — before you set off
There is no GM: the table's caller speaks for the group, and the party is set by the players.

Before leaving the haven, run the **party adjustment stage** and name exactly who marches:

* **At most 6 leave the tavern**, retainers included.
* **At least 2 leave the tavern.** Nobody sets off alone — a lone adventurer is turned back at the door.
* Anyone not marching waits on the **reserve roster** and can be swapped in at the haven or in camp.
* Companions rescued underground join on top of the six — you cannot leave them behind.

---

### Step 2: Choose Ancestry
Select one of the **17 Ancestries** from the [Ancestries Catalog](04_ancestries.md):
* **Common Peoples:** Human, Dwarf, High Elf, Halfling.
* **Wild & Primal:** Wood Elf, Forest Gnome, Lizardman, Orc, Half-Ogre.
* **Underdark:** Deep Gnome, Drow, Kuo-Toa, Derro, Quaggoth, Myconid.
* **Planar:** Tiefling, Deva.

Record your ancestry traits, senses (Infravision / Low-Light), and your cultural enclave seed.

---

### Step 3: Choose Class
Select one of the **8 Adventuring Classes**:
* **[Core Classes](05_classes_core.md):** Fighter, Thief, Cleric, Magic-User.
* **[Specialist Classes](06_classes_specialist.md):** Monk, Druid, Alchemist, Sage.

Record your class hit die, allowed armor & weapons, and starting class abilities.

---

### Step 4: Determine Hit Points & Gear Slots
* **Starting Hit Points (HP):** Roll your Class Hit Die + CON modifier (minimum 1 HP).
* **Gear Slot Capacity:** You have a number of inventory gear slots equal to **10 + STR modifier** (or higher if modified by traits like Fighter's *Hauler* or Half-Ogre brawn).
* **Starting Gold:** Roll **2d6 x 10 gold pieces (gp)** to purchase starting gear from the [Equipment Guide](07_equipment_and_services.md).

---

### Step 5: Roll Your 1st Level Talent
Consult your Class table and roll **2d6** to receive your 1st-level talent. This represents your hero's unique training, divine blessing, or natural knack.

---

### Step 6: Define Your 3 Cultural Anchors
Answer the three world-building prompts from the [World Seeding Rules](03_player_first_worldbuilding.md):
1. **The Homeland Truth:** A sacred custom, architectural quirk, or taboo of your people.
2. **The Local Landmark:** A mysterious wild ruin, sunken barrow, or sacred site you know of in the frontier.
3. **The Lingering Debt / Nemesis:** A rival guild, creditor, creature, or nemesis pursuing you.

*Log these anchors in your [Party Roster](../campaign_record/party_roster.md).*

---

### Step 7: Final Calculations
* **Armor Class (AC):** Base AC 10 + DEX modifier + Armor bonus + Shield bonus (+2).
* **Attack Bonus:**
  * Melee: STR modifier + Weapon Mastery bonus (if applicable).
  * Ranged: DEX modifier.
  * Spellcasting: INT (Arcane), WIS (Divine/Primal), or INT/WIS (Alchemist).
* **Languages:** Common + your Ancestral Tongue + 1 bonus language per positive INT modifier.
