# Minimal Table Companion Specification

Status: **Agreed Product & Architecture Specification** (Recorded 2026-09-12).  
This document defines the essential physical-table scope for the **ASH Table Companion**. It supersedes any previous plans that proposed automated virtual tabletop (VTT) combat simulation, virtual dice rolls, or intrusive micro-rules automation.

---

## 1. Core Philosophy: The Physical Table First

The ASH Table Companion is designed for **1 to 6 people playing solo or cooperatively at a real physical table** with physical dice, paper notes, and miniatures. 

### The Anti-Bloat Principle ("What We Need to Play — And Nothing Else")
1. **Dice Belong on the Table:** The app **never** rolls attacks or damage automatically. There are no "Roll to Hit" buttons. Players read their target numbers and modifiers from the screen, roll real dice in their trays, and announce results to the group.
2. **The Invisible Co-Referee:** The app acts as the campaign's memory, fog-of-war engine, and referee's screen. It holds secrets, manages fog of war, records things easily forgotten between sessions, and displays target numbers instantly.
3. **No Combat Automation:** The companion does not attempt to be a tactical grid simulator, video game, or autonomous combat resolver. It provides monster references, tracks HP changes, and runs the initiative spotlight.

```
       ┌─────────────────────────────────────────────────────────┐
       │                   THE CAMPAIGN BRAIN                    │
       ├────────────────────────────┬────────────────────────────┤
       │     OVERWORLD & SITES      │    CAMPAIGN PROGRESSION    │
       │  • Fog of War Hex Map      │  • Unknown Master Threat   │
       │  • Dungeon / Tomb Graphs   │  • Quests & Tavern Leads   │
       │  • Travel & Room Hazards   │  • Clues, "Widgets" & Lore │
       │  • Interactive Leverage    │  • Effective Gear / Loot   │
       └────────────────────────────┴────────────────────────────┘
                                    │
                                    ▼
       ┌─────────────────────────────────────────────────────────┐
       │               PHYSICAL TABLE PLAYERS (PHONES)           │
       │  • Stat Dashboard (AC, +To-Hit, Saves, DC — NO roll btns)│
       │  • Session Ledger (HP, Gold, Conditions, Torch/Rations) │
       │  • Physical Dice on the Table (Roll & announce)         │
       └─────────────────────────────────────────────────────────┘
```

---

## 2. The Nine Core Pillars

### 1. Blind / Emergent Adventure Path
* **No Spoilers for Players or Solo Hosts:** The overarching campaign threat (e.g. *The Night Below*, *Domains of Dread*, *The Stolen Dawn*) and its climactic boss/outcome are withheld from the party.
* **Emergent Discovery:** Players only see localized symptoms, rumors, and faction movements. The identity of the master antagonist and the endgame stakes are pieced together through physical clues and site exploration.

### 2. Quests and Missions
* **Grounded Starting Leads:** The starting settlement provides 3 initial leads (via tavern rumors or patrons):
  * **Two leads** connecting to separate nodes or victims of the hidden Adventure Path.
  * **One unrelated lead** (with a 50% chance of being an active local site and a 50% chance of being an old, depleted, or empty ruin with historical flavor and shelter).
* **Actionable Contracts:** Each lead provides a rumor source, claim, directional hint, apparent danger, and promised reward.

### 3. Overworld Map with Fog of War
* **6-Mile Hex Grid:** Layered terrain exploration.
* **Fog of War:** Unexplored hexes reveal neither biome, landmark, nor settlement name until traversed or surveyed from high vantage.
* **Dynamic Site Discovery:** Dungeons, caves, ruins, and shrines remain hidden on the hex until discovered through travel, scouting, or verified rumor leads.

### 4. Mapped Adventure Sites (Dungeons, Ruins, Caves, Tombs)
* **Spatial Room Graphs:** Sites feature interconnected rooms with defined entrances, passageways, doors (wooden, iron, portcullis, secret), and elevation transitions.
* **Exploration Fog of War:** Rooms remain dark and unexplored until the party breaches the threshold.
* **Room Dressing & Sensory Tells:** Each room provides atmospheric details (smells, sounds, lighting) rollable via a d10 feature table (empty, trap, minor hazard, solo monster, NPC, mob, major hazard, treasure, boss).

### 5. Travel & Room Hazards Along the Way
* **Wilderness Hazards:** Off-road party navigation checks (DC 9/15/18 INT check), uniform 6-direction drift on failure, travel watch costs, and wandering encounter checks.
* **Dungeon Hazards & Traps:** Traps feature distinct sensory tells, activation triggers, disarm DCs, and consequences.

### 6. Site Objectives, Clues, Widgets & Tailored Loot
* **Information:** Letters, inscriptions, murals, captive testimony, and maps that advance path awareness.
* **Widgets (Physical Progression Keys):** Physical items existing in the game world that progress the campaign (e.g., *Psychic Shielding Crystals*, *Boundary Charms*, *Ward-Salt Plates*, *Threshold Keys*). Widgets occupy inventory slots, must be carried by a specific character, and physically bypass path barriers or neutralize boss mechanisms.
* **Anti-Boss Loot & Gear:** Cold-iron weaponry, silvered oil, sanctified reagents, and relics discovered across sites that grant the party mechanical leverage against the path's ultimate threat.

### 7. Interactive Leverage (Things to Improve Odds of Winning)
* **Tactical & Strategic Levers:** Sites feature interactable elements that reward player ingenuity rather than brute-force combat:
  * Severing ritual conduits to strip a boss's invulnerability.
  * Cleansing corrupted shrines to earn expedition blessings.
  * Rescuing captive scouts who reveal secret backdoors or patrols.
  * Sabotaging food/water reserves or collapsing access shafts.

### 8. Easy Access to Player Stats (No Roll Buttons)
* **High-Visibility Target Numbers:**
  * **Armor Class (AC)** and **Current / Max HP**.
  * **Attack Modifiers & Damage:** e.g., `Melee: +3 (1d8+2)`, `Ranged: +1 (1d6)`.
  * **Saving Throw Modifiers:** STR, DEX, CON, INT, WIS, CHA.
  * **Spell Casting Checks & Tier Slots:** e.g., `DC 11 | Tier 1: [x][ ]`.
  * **Passives:** Movement rate, senses/trapsense, initiative modifier.
* **Usage:** A player looks at the screen, reads `+3`, rolls their physical d20, and calls out `17!`.

### 9. Session-to-Session State Ledger
* **Consumables & Tracking:**
  * Current HP, dying strikes, death save stabilization.
  * Coin purse (GP, SP, CP) and party treasury.
  * Active conditions (Poisoned, Blinded, Paralyzed, Deafened, Exhausted).
  * Real-time / turn-based light trackers (Torches and Lanterns remaining).
  * Inventory slots, equipped gear, and carried path widgets.

### 10. Living World Directory (Settlements, Facilities & NPC Tracking)
* **Never Lose Track of Who is Where:** Between sessions, players and referees frequently forget NPC names, where shops are located, and who offered training or rumors. The companion pins people and establishments directly to the map.
* **Map-Linked Settlements & Facilities:**
  * **Taverns & Inns:** Name, keeper, vibe, lodging quality, rumor boards.
  * **Shops & Artisans:** Blacksmiths (armor/weapon forging and repair), Apothecaries/Herbalists (healing draughts, antitoxins, herbs), and General Provisioners (torches, rations, standard dungeoneering gear).
  * **Trainers & Mentors:** Martial weaponmasters (class talent advancement), Arcane academies/libraries (spell scrolls, spellbook transcription), and Divine temples/shrines (blessings, tithes, penance for spell mishaps).
  * **Adventure Site Denizens:** Rescued captives, hermit sages, parleyed monster chieftains, and lingering witnesses pinned to specific dungeon rooms or surface ruins.
* **NPC Dossiers:**
  * **Name, Role, & Ancestry:** e.g., *"Torvald Stonehand (Dwarf Smith)"*, *"Sister Alyssa (Human Priestess)"*, *"Jonathan Vane (Rescued Surveyor)"*.
  * **Current Location:** Pinned to town, shop, tavern, or adventure site room.
  * **Disposition & Memory:** Current attitude (Friendly, Neutral, Hostile) and session notes (rumors told, promised favors/debts, training unlocked).

---

## 3. Information Fog of War (Diegetic Revelation)

Information at the table is subject to the same fog of war as the map. Players only perceive what their characters have directly observed, tested, or deduced.

### A. Monsters: Unknown Until Tested
| Attribute | Initial State | Revealed State |
| :--- | :--- | :--- |
| **Armor Class** | **`AC: ?`** (Narrative hint: *"Thick bone carapace"*) | **Revealed on contact:** When the referee or caller notes a physical attack roll that hits or misses, the exact target AC is confirmed. |
| **Hit Points** | **Descriptive State Only:**<br>• **Unharmed** (100%)<br>• **Injured** (50%–99%) | **Revealed when Bloodied (<50%):**<br>When damage reduces the creature below 50%, it gains the **Bloodied!** status, revealing its exact or close approximate remaining HP count. <br>• **Near Death** (<20%) |
| **Morale & Reaction** | Hidden | Morale DC revealed only when a morale check triggers (e.g. leader falls or 50% casualties). |
| **Traits & Resistances** | Hidden | Revealed when triggered (e.g., acid fails to hurt it, or fire stops its regeneration). |

### B. Traps and Hazards: The Sensory Tell vs. The Mechanism
* **Entry:** Entering a room only presents the *sensory tell* (e.g., *"Scuff marks line the floor around the central altar; the air smells faintly of sulfur"*).
* **Investigation:** The trap remains hidden until actively searched or detected by a passive sense (e.g. Thief's trap sense). Once spotted, its trigger, DC, and bypass options are displayed.

### C. NPCs: Unresolved Reactions
* **Initial Contact:** The NPC's appearance and visible activity are described (e.g., *"An armored dwarven prospector barricaded behind timber"*).
* **Reaction Check:** The NPC's attitude starts as **Uncertain / Guarded**. When approached or addressed, a 2d6 OSR Reaction check is rolled (or adjudicated by the table), updating their status to **Hostile**, **Cautious / Neutral**, or **Friendly**.

### D. Widgets: Mystery Before Identification
* Newly discovered relics appear in inventory as mysterious physical objects (e.g., *"Carved Obsidian Disk"*).
* Their campaign function (e.g., *"Threshold Key to the Submerged Gate"*) is revealed only after consulting records, casting divination, or testing them in the field.

---

## 4. Shadowdark Initiative Tracker

The companion adheres strictly to the **Shadowdark RPG initiative system**:

```
      [Alice] ──(rolls highest)──► TAKES TURN 1
         │
         ▼
      [Bob]   ◄── Clockwise around the physical table
         │
         ▼
     [Charlie]
         │
         ▼
    [Monsters] ◄── Acts as a group on GM's table position
         │
         ▼
      [Dave]
```

### The Rules of Shadowdark Initiative
1. **The DEX Check:** When combat starts, every player makes a Dexterity check ($d20 + \text{DEX mod}$). The referee rolls **one check** for all monsters using the highest DEX modifier among them.
2. **First Turn:** The creature with the highest roll takes the first turn.
3. **Clockwise Flow:** Play immediately moves **clockwise around the physical table** from the first actor. Turn order is never sorted into a micro-managed numerical ladder.
4. **Monster Group Turn:** The monsters act together on their slot in the clockwise rotation (or on the GM's seat at the table).
5. **Always in Initiative:** The same clockwise rotation can be maintained during dungeon crawling to guarantee every player gets equal spotlight time.

### UI Implementation:
* **Table Seating:** Seating order is registered once (e.g., `Alice` → `Bob` → `Charlie` → `Monsters` → `Dave`).
* **Winner Selection:** One tap sets who won initiative (or enters the winning roll).
* **Next Turn Button:** A single large `Next Turn` button advances the active spotlight clockwise around the table.

---

## 5. Searchable Glossary (The Table Codex)

A fast, instant-filter reference drawer/modal accessible from any view:
* **Conditions:** Exact mechanical rules for *Blinded*, *Deafened*, *Paralyzed*, *Poisoned*, *Exhausted*, *Dying*, and *Lightless*.
* **Spells & Talents:** Spell tier, range (Close, Near, Far), duration, casting check DC, and critical mishap tables.
* **Equipment & Gear:** Item slot costs, weapon damage dice, armor values, torch durations, rations, and adventuring gear.
* **OSR Procedures:** 
  * 2d6 Monster/NPC Reaction Table.
  * Morale check trigger rules.
  * Wilderness navigation DCs and drift rules.
  * Falling, drowning, and suffocation rules.
* **Discovered Lore / Bestiary:** Entries unlocked through player discoveries, preserving Information Fog of War.

---

## 6. Target UI Layout

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  [ASH RPG TABLE COMPANION]       [👥 NPC Directory] [🔍 Codex] [Party Ledger]│
├───────────────────────────────┬──────────────────────────────────────────────┤
│ 1. MAP & SITES (Fog of War)   │ 2. SHADOWDARK INITIATIVE & ENCOUNTER         │
│ • Hex Map: Terrain & Towns    │ ┌──────────────────────────────────────────┐ │
│ • Town: Oakhaven              │ │ Turn: BOB (Clockwise: Bob → Dave → Mobs) │ │
│   - Tavern: The Ashen Tankard │ └──────────────────────────────────────────┘ │
│     NPC: Gundren (Barkeep)    │ Monster: Barrow Wight (x2)                   │
│   - Smithy: Torvald (Master)  │ • Wight A: [ Bloodied! ] (11/24 HP) | AC: 14 │
│   - Trainer: Vance (Fighter)  │ • Wight B: [ Unharmed  ] (??/?? HP) | AC: ?  │
│ • Dungeon: The Bone Crypt     │ Controls: [-1] [-5] HP | [Reaction: Neutral] │
│   - Rescued: Surveyor Vane    │                                              │
├───────────────────────────────┴──────────────────────────────────────────────┤
│ 3. PLAYER STAT DASHBOARD & LEDGER (No Roll Buttons)                          │
│ Alice (Fighter)   | AC 15 | HP: 12/18 | ATK: Melee +3 (1d8+2) | Saves: STR +2│
│ Bob (Thief)       | AC 13 | HP:  8/10 | ATK: Ranged +3 (1d6)   | Saves: DEX +3│
│ Charlie (Priest)  | AC 16 | HP:  9/14 | Spell DC 11 (T1: [x][ ])| Saves: WIS +2│
│ Dave (Wizard)     | AC 10 | HP:  4/6  | Spell DC 12 (T1: [ ][ ])| Saves: INT +3│
│ Party Wallet: 142 GP, 35 SP | Light: Torch (40 min) | Widgets: [Shield Crystal]│
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Explicit Exclusions ("What We Do NOT Build")

1. **No "Roll to Hit" / "Roll Damage" Buttons:** We have real dice.
2. **No Automated Combat Simulator:** No automated monster AI rounds, grid distances, or automatic attack resolution.
3. **No Spoilers in Host/Admin Views:** The host/solo view enforces the same fog of war as the player devices.
4. **No Complex Multi-Level Sub-Menus:** Every critical stat and action is accessible within 1 tap from the main view.
