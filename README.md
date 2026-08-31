# Automata for Swords and Hexes (ASH RPG)

> **A modern evolution of 1st Edition Advanced Dungeons & Dragons, combining Old-School Renaissance grit, modular procedural worldcraft, and an automated GM-less tabletop engine.**

---

## ⚔️ Overview

**Automata for Swords and Hexes (ASH)** is a unified tabletop roleplaying framework, campaign chronicler, procedural generator, and digital assistant. Designed for **1 to 6 players**, ASH enables deep, tactical, and emergent old-school fantasy roleplaying **without requiring a dedicated Dungeon Master**. 

By blending the deep flavor and crunch of **1st Edition AD&D** with the streamlined elegance of modern OSR games (**Shadowdark**, **B/X**, **DCC**), ASH places world-building, rule adjudication, and procedural storytelling directly into the hands of the adventuring party.

---

## 🌟 The Five Pillars of ASH

```mermaid
flowchart TD
    subgraph ASH [Automata for Swords and Hexes]
        A[Ruleset & Mechanics Engine]
        B[Procedural Oracle & Generator]
        C[World Recorder & Campaign Wiki]
        D[Thematic Zone Framework]
        E[3-Act Campaign Architect]
    end
    
    A --> P[1-6 Players / Solo & Co-Op Tabletop Play]
    B --> P
    C --> P
    D --> P
    E --> P
```

### 1. Unified Ruleset & Tabletop Engine
* **Modernized 1e DNA:** Retains the gritty, lethal, and wondrous atmosphere of 1st Edition AD&D while eliminating cumbersome charts in favor of streamlined, intuitive OSR mechanics.
* **Streamlined Resolution:** D20 roll-under or target-based checks, slot-based inventory systems, light/torch management timers, and high-stakes combat.
* **Danger & Resource Economy:** Exhaustion, ration depletion, ammunition tracking, spell mishaps, and real-time tension crawlers.
* **Morale & Reaction:** Automated 2d6 monster reaction checks, dynamic morale triggers, and distinct monster instincts rather than mindless combat-to-the-death.

### 2. Procedural Oracle & Generator
* **GM-less Adjudication:** Probability-driven oracle prompts, context-aware yes/and/no/but tables, hazard triggers, and surprise/encounter engines.
* **Settlement & City Generator:** Inspired by *Forgotten Realms Adventures*, generating detailed towns, garrisons, local laws, temple hierarchies, underworld networks, and tavern rumors.
* **Dungeon & Hex Builder:** On-the-fly generation of room layouts, dungeon dressings, traps, ecological encounters, and hidden caches.

### 3. Living World Recorder & Campaign Wiki
* **West Marches Style Log:** Automatic hex mapping, point-of-interest (POI) logging, faction standing, NPC relationship trees, and expedition debriefs.
* **Dynamic Chronicle:** Tracks calendar time, astronomical events, planar conjunctions, seasonal weather patterns, and regional doom clocks.
* **Codex & Bestiary:** Integrated rules reference, spell compendium, item glossary, and lore unlock engine.

### 4. Monsternomicon Ecology & Lore Engine
* **Lore Knowledge Rolls:** Inspired by Privateer Press' *Monsternomicon*, characters uncover progressive tiers of monster lore (Common Knowledge, Field Observations, Obscure Lore, and Arcane Secrets) based on skill and intelligence checks.
* **Harvesting & Anatomical Salvage:** Detailed harvesting tables for crafting potions, reagents, relics, and alchemical gear from fallen foes.
* **Adventure Hooks:** Every beast and entity comes pre-loaded with organic hooks, lair rumors, and regional ecosystem impacts.

### 5. Thematic Zone Framework & 3-Act Campaign Structure
* **Cursed Scroll / MMO-Themed Zones:** Self-contained, highly flavored regional zones (reminiscent of Shadowdark's *Cursed Scroll* zines and iconic thematic lands like Northrend, The Crossroads, or Un'Goro Crater). Each zone features bespoke weather matrices, wandering tables, unique flora/fauna, environmental hazards, and faction tensions.
* **Epic 3-Act Campaign Progression:** Structured campaign arcs scaling from level 1 to 10 across three distinct narrative tiers (inspired by classics like *Night Below* and *Out of the Abyss*):
  * **Act I (Levels 1–3) — The Frontier & Local Mystery:** Surface wilderness exploration, local banditry/cult investigations, outpost survival, and establishing a home base.
  * **Act II (Levels 4–7) — The Descent & Regional Expedition:** Deep wilderness treks, Underdark incursions, faction diplomacy, discovery of ancient ruins, and mega-dungeon delves.
  * **Act III (Levels 8–10) — The Cataclysm & Abyssal Climax:** Planar rifts, eldritch entities, regional cataclysms, domain-level warfare, and planar-scale confrontation.

---

## 🧭 Design Inspirations & Influences

| Source | Core Concept Borrowed / Adapted |
| :--- | :--- |
| **AD&D 1st Edition / OSRIC** | Gritty tone, spell variety, high lethality, classic class archetypes, and deep treasure tables. |
| **Shadowdark RPG** | Real-time torch mechanics, clean d20 resolution, slot-based inventory, minimalist stat blocks, and quick-rolling tables. |
| **Dungeon Crawl Classics (DCC)** | Mighty deeds of arms, volatile spell casting, critical hit & fumble tables, and weird fantasy flavor. |
| **Forgotten Realms Adventures (1e/2e)** | Comprehensive city generation templates, guild structures, local magistrates, and urban adventuring tables. |
| **Monsternomicon (Privateer Press)** | Monster lore DCs, harvesting rules, behavioral tactics, and adventure hooks per creature. |
| **Night Below & Out of the Abyss** | Multi-tiered, 3-Act campaign arcs with rising stakes, pacing guidelines, and environmental dread. |
| **Cursed Scroll Zines** | Distinct thematic mini-settings, customized zone-specific encounter tables, and tight geographic sandboxes. |
| **Hexcrawl & West Marches** | Player-driven exploration, persistent cartography, emergent storytelling, and decentralized campaign play. |

---

## 🎲 Core Play Loops

```mermaid
stateDiagram-v2
    [*] --> Sanctuary : Start / Downtime
    
    state Sanctuary {
        [*] --> RestAndRecover
        RestAndRecover --> CityOracle : Proc-Gen Services & Rumors
        CityOracle --> FactionWork : Buy Gear / Hire Retainers
        FactionWork --> PlanExpedition : Select Zone & Quest Hook
    }
    
    Sanctuary --> Hexcrawl : Embark into Wilderness
    
    state Hexcrawl {
        [*] --> TravelTurn
        TravelTurn --> WeatherAndTerrain : Determine Environment
        WeatherAndTerrain --> NavigationCheck : Hex Movement
        NavigationCheck --> HazardOracle : Encounter / Discovery / Landmark
        HazardOracle --> TravelTurn : Continue Crawl
    }
    
    Hexcrawl --> DungeonIncursion : Enter Dungeon / Ruin / Lair
    
    state DungeonIncursion {
        [*] --> DungeonTurn : Advance Tension Counter
        DungeonTurn --> RoomGeneration : Explore Chamber / Corridor
        RoomGeneration --> Interaction : Trap / Riddle / Combat
        Interaction --> MonsterLoreAndHarvest : Harvest & Loot
        MonsterLoreAndHarvest --> DungeonTurn : Deeper Delve
    }
    
    DungeonIncursion --> Hexcrawl : Escape with Treasure
    Hexcrawl --> Sanctuary : Return & Chronicle State
```

---

## 📁 Repository Structure & Organization

```
ash-rpg/
├── docs/                     # Design documentation, system manifestos, and references
│   ├── rules/                # Core mechanics, combat, exploration, and character creation
│   ├── bestiary/             # Monster entries with lore DCs, harvesting, and tactics
│   ├── magic/                # Spell lists, rituals, mishaps, and relic catalog
│   └── oracles/              # Tables for settlements, dungeons, weather, and encounters
├── zones/                    # Thematic zone modules (Cursed Scroll style mini-settings)
│   ├── ashplains_of_mor/     # Example: High-volatility volcanic wilderness
│   └── drowned_fens/         # Example: Submerged crypts and sunken ruins
├── campaigns/                # 3-Act campaign modules (Levels 1-10)
│   └── deep_abyss/           # 3-Act overarching campaign framework
├── wiki/                     # Lore codex, faction rosters, and dynamic campaign recorder
└── src/                      # Digital companion & assistant codebase (Engine, CLI/UI)
```

---

## 🚀 Getting Started

### 🎲 Run the Table Companion

The repository now includes a local multiplayer campaign app for a shared screen and player phones. It stores each campaign in SQLite, synchronizes play live, and automates the ASH oracle, wilderness, dungeon, encounter, lore, and threat procedures.

```bash
npm install
npm run dev
```

Open `http://localhost:3000`, create a campaign, and let players scan the join QR code from the Frontier screen. See the [Table Companion guide](docs/table_companion.md) for the implemented scope, architecture, backup location, and production run commands.

### 📖 Accessing the Player's Handbook & Campaign Wiki
The full **Player's Handbook**, **Campaign Record**, **Procedural Oracles**, and **Monsternomicon** are available as an interactive searchable wiki:

* **Live GitHub Pages Wiki:** [`https://kostchei.github.io/ash-rpg/`](https://kostchei.github.io/ash-rpg/)

#### Local Development & Preview
To run the documentation site locally with live reload:
```bash
# Install dependencies
pip install mkdocs-material pymdown-extensions

# Launch local server
mkdocs serve
```
Open `http://127.0.0.1:8000/` in your browser.

---

## 🎲 Starting a Campaign

1. **Review the Rules:** Read the core rules in [`docs/rules/`](file:///d:/Code/ash-rpg/docs/rules/) or the [Live Rules Wiki](https://kostchei.github.io/ash-rpg/rules/01_system_overview/).
2. **Session Zero & World Seeding:** Follow the [Player-First Demographic Engine](file:///d:/Code/ash-rpg/docs/rules/03_player_first_worldbuilding/) to place Cultural Enclaves on the [19-Hex Atlas](file:///d:/Code/ash-rpg/docs/campaign_record/hex_atlas_19/).
3. **Assemble the Party:** Roll 1–6 characters and log them in the [Party Roster](file:///d:/Code/ash-rpg/docs/campaign_record/party_roster/).
4. **Launch an Expedition:** Track your turns, log your hexes, consult the procedural oracles, and log your journey in the [Session Logs](file:///d:/Code/ash-rpg/docs/campaign_record/session_logs/).

---

## 📜 License & Acknowledgments

* Designed for open-table and GM-less OSR gaming.
* Built under compatible Open Game License (OGL) / Creative Commons guidelines for old-school compatible systems.
