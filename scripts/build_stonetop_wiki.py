"""
Builds a fully navigable, multi-page Stonetop Wiki for MkDocs from the Stonetop Book I PDF.
Extracts each chapter, section, and playbook into dedicated, cross-linked Markdown files.
"""

import os
import sys
import time
from concurrent.futures import ThreadPoolExecutor
import pymupdf
import pymupdf4llm.helpers.pymupdf_rag as rag

PDF_PATH = r"C:\Users\Admin\Desktop\Book_I_-_Stonetop_(1-up)_-_2nd_printing.pdf"
DOCS_DIR = r"D:\Code\ash-rpg\docs\stonetop"
PLAYBOOKS_DIR = os.path.join(DOCS_DIR, "playbooks")

SECTIONS = [
    {
        "id": "01_welcome_and_setting",
        "file": "01_welcome_and_setting.md",
        "title": "Welcome to Stonetop & The Setting",
        "start_page": 7,
        "end_page": 14,
        "desc": "Hearth fantasy, an iron age that never was, setting overview, expectations, and why to play.",
    },
    {
        "id": "02_getting_started",
        "file": "02_getting_started.md",
        "title": "Getting Started & First Session",
        "start_page": 15,
        "end_page": 34,
        "desc": "Table preparation, setting expectations, tone & safety, character creation, introducing PCs, and spring arrival.",
    },
    {
        "id": "03_playing_the_game",
        "file": "03_playing_the_game.md",
        "title": "Playing the Game & Core Rules",
        "start_page": 35,
        "end_page": 102,
        "desc": "The conversation, player agenda, flow of play, dice & moves, principles, character gear, arcana, and followers.",
    },
    {
        "id": "04_running_the_game",
        "file": "04_running_the_game.md",
        "title": "Running the Game (GM Guide)",
        "start_page": 167,
        "end_page": 206,
        "desc": "GM agenda, the core conversation loop, spotlight management, GM moves, principles, and prep.",
    },
    {
        "id": "05_player_moves",
        "file": "05_player_moves.md",
        "title": "Player Moves & Basic Moves",
        "start_page": 207,
        "end_page": 236,
        "desc": "Defy Danger, Clash, Defend, Know Things, Let Fly, Persuade, Seek Insight, Burn Brightly, and Death's Door.",
    },
    {
        "id": "06_harm_and_healing",
        "file": "06_harm_and_healing.md",
        "title": "Harm, Wounds & Healing",
        "start_page": 237,
        "end_page": 250,
        "desc": "Hit points, damage, debilities, problematic wounds, death at Death's Door, and recovery.",
    },
    {
        "id": "07_first_adventure",
        "file": "07_first_adventure.md",
        "title": "The First Adventure",
        "start_page": 251,
        "end_page": 276,
        "desc": "Goals, adventure structure, background lore, setup questions, framing scenes, and launching the expedition.",
    },
    {
        "id": "08_threats",
        "file": "08_threats.md",
        "title": "Threats & Fronts",
        "start_page": 277,
        "end_page": 300,
        "desc": "Threat creation, impulses, countdown clocks, stakes, example threats, and updating threats.",
    },
    {
        "id": "09_expeditions",
        "file": "09_expeditions.md",
        "title": "Expeditions & Travel",
        "start_page": 301,
        "end_page": 344,
        "desc": "Journey preparation, travel mechanics, route navigation, expedition moves, making camp, and returning home.",
    },
    {
        "id": "10_sites",
        "file": "10_sites.md",
        "title": "Sites & Dungeons",
        "start_page": 345,
        "end_page": 378,
        "desc": "Environmental storytelling, running and exploring sites, procedural site generation, and The Green Lord's Tomb.",
    },
    {
        "id": "11_dangers",
        "file": "11_dangers.md",
        "title": "Dangers, Hazards & Monsters",
        "start_page": 379,
        "end_page": 420,
        "desc": "Environmental hazards, monster stat blocks, instinct, special qualities, tags, and running combat.",
    },
    {
        "id": "12_discoveries",
        "file": "12_discoveries.md",
        "title": "Discoveries, Artifacts & Arcana",
        "start_page": 421,
        "end_page": 448,
        "desc": "Clues, encounter opportunities, major artifacts, Maker relics, and strange arcana.",
    },
    {
        "id": "13_npcs_and_followers",
        "file": "13_npcs_and_followers.md",
        "title": "NPCs & Followers",
        "start_page": 449,
        "end_page": 482,
        "desc": "Bringing NPCs to life, NPC creation, followers in play, follower moves, quality, loyalty, and recruitment.",
    },
    {
        "id": "14_homefront",
        "file": "14_homefront.md",
        "title": "The Homefront & Seasons Change",
        "start_page": 483,
        "end_page": 548,
        "desc": "Village life, aftermath, homefront moves, steading mechanics, village improvements, and Seasons Change.",
    },
    {
        "id": "15_writing_moves",
        "file": "15_writing_moves.md",
        "title": "Writing Moves & Love Letters",
        "start_page": 549,
        "end_page": 570,
        "desc": "Move design methodology, triggers, choices, consequences, and personalized GM love letters.",
    },
    {
        "id": "16_the_game_ongoing",
        "file": "16_the_game_ongoing.md",
        "title": "The Ongoing Campaign & Advancement",
        "start_page": 571,
        "end_page": 596,
        "desc": "Session loops, character advancement, retiring PCs, PC conflict, time skips, and campaign climaxes.",
    },
    {
        "id": "17_reference_and_index",
        "file": "17_reference_and_index.md",
        "title": "Reference & Master Index",
        "start_page": 597,
        "end_page": 614,
        "desc": "Acknowledgements, inspirational media, and master alphabetical topic index.",
    }
]

PLAYBOOKS = [
    {
        "id": "the_blessed",
        "file": "the_blessed.md",
        "title": "The Blessed",
        "start_page": 105,
        "end_page": 108,
        "desc": "Servant and sacred vessel of Danu, goddess of the soil, hearth, and spring.",
    },
    {
        "id": "the_fox",
        "file": "the_fox.md",
        "title": "The Fox",
        "start_page": 109,
        "end_page": 112,
        "desc": "Cunning trickster, sharp opportunist, problem-solver, and survivor.",
    },
    {
        "id": "the_heavy",
        "file": "the_heavy.md",
        "title": "The Heavy",
        "start_page": 113,
        "end_page": 116,
        "desc": "The village's strongest arm, scarred protector, sheriff, or storm-marked brawler.",
    },
    {
        "id": "the_judge",
        "file": "the_judge.md",
        "title": "The Judge",
        "start_page": 117,
        "end_page": 120,
        "desc": "Keeper of the peace, voice of Aratis, wielder of the ancient symbol of law.",
    },
    {
        "id": "the_lightbearer",
        "file": "the_lightbearer.md",
        "title": "The Lightbearer",
        "start_page": 121,
        "end_page": 124,
        "desc": "Zealot, mystic, or preacher filled with the blazing radiance of Helior the Sun.",
    },
    {
        "id": "the_marshal",
        "file": "the_marshal.md",
        "title": "The Marshal",
        "start_page": 125,
        "end_page": 128,
        "desc": "Commander of the village militia, battlefield tactician, and leader of a loyal crew.",
    },
    {
        "id": "the_ranger",
        "file": "the_ranger.md",
        "title": "The Ranger",
        "start_page": 129,
        "end_page": 132,
        "desc": "Hunter of the Great Wood, wide wanderer, and companion to wild beasts.",
    },
    {
        "id": "the_seeker",
        "file": "the_seeker.md",
        "title": "The Seeker",
        "start_page": 133,
        "end_page": 136,
        "desc": "Delver into Things Below, scholar of the ancient Makers, and tamperer with arcana.",
    },
    {
        "id": "the_would_be_hero",
        "file": "the_would_be_hero.md",
        "title": "The Would-be Hero",
        "start_page": 137,
        "end_page": 140,
        "desc": "Eager youth driven by destiny, glory, or desperate courage to save their village.",
    },
    {
        "id": "inserts",
        "file": "inserts.md",
        "title": "Playbook Inserts & Special Moves",
        "start_page": 141,
        "end_page": 153,
        "desc": "Inventory, Animal Companions, Crew, Initiates of Danu, Invocations, Ghost, Revenant, Thrall.",
    },
    {
        "id": "steading_playbook",
        "file": "steading_playbook.md",
        "title": "The Steading Playbook (Stonetop Village Sheet)",
        "start_page": 154,
        "end_page": 166,
        "desc": "The shared character sheet for Stonetop itself: Population, Defenses, Prosperity, and Improvements.",
    },
]

def extract_page_range(pdf_path, start_page, end_page):
    """Extracts markdown for 1-based page numbers [start_page, end_page] inclusive."""
    doc = pymupdf.open(pdf_path)
    try:
        page_indices = list(range(start_page - 1, end_page))
        return rag.to_markdown(
            doc,
            pages=page_indices,
            ignore_images=True,
            ignore_graphics=True,
            page_separators=True
        )
    finally:
        doc.close()

def generate_section_file(pdf_path, sec, prev_sec, next_sec):
    out_path = os.path.join(DOCS_DIR, sec["file"])
    print(f"Generating {sec['file']} (Pages {sec['start_page']}–{sec['end_page']})...")
    
    body = extract_page_range(pdf_path, sec["start_page"], sec["end_page"])

    # Frontmatter
    frontmatter = f"""---
title: "{sec['title']}"
description: "{sec['desc']}"
---

[Stonetop Wiki Index](index.md) › **{sec['title']}**

> **Source:** *Stonetop Book I, Pages {sec['start_page']}–{sec['end_page']}*

---

"""

    # Nav footer
    nav_links = []
    if prev_sec:
        nav_links.append(f"[← Previous: {prev_sec['title']}]({prev_sec['file']})")
    nav_links.append("[↑ Stonetop Wiki Index](index.md)")
    if next_sec:
        nav_links.append(f"[Next: {next_sec['title']} →]({next_sec['file']})")

    footer = f"\n\n---\n\n" + " | ".join(nav_links) + "\n"

    with open(out_path, "w", encoding="utf-8") as f:
        f.write(frontmatter + body + footer)

def generate_playbook_file(pdf_path, pb, prev_pb, next_pb):
    out_path = os.path.join(PLAYBOOKS_DIR, pb["file"])
    print(f"Generating playbooks/{pb['file']} (Pages {pb['start_page']}–{pb['end_page']})...")
    
    body = extract_page_range(pdf_path, pb["start_page"], pb["end_page"])

    frontmatter = f"""---
title: "{pb['title']}"
description: "{pb['desc']}"
---

[Stonetop Wiki Index](../index.md) › [Character Playbooks](index.md) › **{pb['title']}**

> **Source:** *Stonetop Book I, Pages {pb['start_page']}–{pb['end_page']}*

---

"""

    nav_links = []
    if prev_pb:
        nav_links.append(f"[← Previous: {prev_pb['title']}]({prev_pb['file']})")
    nav_links.append("[↑ Playbooks Index](index.md)")
    if next_pb:
        nav_links.append(f"[Next: {next_pb['title']} →]({next_pb['file']})")

    footer = f"\n\n---\n\n" + " | ".join(nav_links) + "\n"

    with open(out_path, "w", encoding="utf-8") as f:
        f.write(frontmatter + body + footer)

def generate_playbooks_index(pdf_path):
    out_path = os.path.join(PLAYBOOKS_DIR, "index.md")
    print("Generating playbooks/index.md...")
    
    overview_text = extract_page_range(pdf_path, 103, 104)

    content = f"""---
title: "Character Playbooks & Inserts"
description: "Overview and directory of all 9 character playbooks, inserts, and the steading playbook."
---

[Stonetop Wiki Index](../index.md) › **Character Playbooks**

> **Source:** *Stonetop Book I, Pages 103–104*

---

# Character Playbooks & Inserts

In Stonetop, every player character chooses an evocative **Playbook** that defines their place in the community, their instincts, their starting gear, and their relationship with the wider world.

## The 9 Core Playbooks

| Playbook | Archetype & Role | Key Focus & Strengths |
| :--- | :--- | :--- |
| [**The Blessed**](the_blessed.md) | Holy Vessel of Danu | Blessings, earth magic, communion with crops and beasts |
| [**The Fox**](the_fox.md) | Trickster & Problem Solver | Cunning, stealth, street-smarts, dirty fighting, opportunism |
| [**The Heavy**](the_heavy.md) | Protector & Strong Arm | Raw physical might, intimidation, weapon mastery, storm marks |
| [**The Judge**](the_judge.md) | Voice of Law & Justice | Authority of Aratis, dispute resolution, solemn judgment, hammer/helm |
| [**The Lightbearer**](the_lightbearer.md) | Zealot & Radiant Mystic | Searing sunlight, truth-speaking, divine ecstasy, banishing shadows |
| [**The Marshal**](the_marshal.md) | Militia Leader & Tactician | Commanding a loyal crew, battlefield tactics, discipline, shield-wall |
| [**The Ranger**](the_ranger.md) | Scout & Beast Master | Tracking in the Great Wood, foraging, beast companion, archery |
| [**The Seeker**](the_seeker.md) | Scholar of Arcana & Ruin | Deciphering Maker ruins, Things Below, dangerous magical artifacts |
| [**The Would-be Hero**](the_would_be_hero.md) | Fated & Audacious Youth | Raw luck, burning brightly, destiny, reckless courage, tragic stakes |

---

## Special Inserts & The Village Sheet

* [**Playbook Inserts**](inserts.md) — Inventory rules, Animal Companions, the Militia Crew, Initiates of Danu, Invocations, and special playbooks (Ghost, Revenant, Thrall).
* [**The Steading Playbook**](steading_playbook.md) — The shared character sheet for Stonetop itself, tracking Population, Defenses, Prosperity, and village improvements over time.

---

## Book Overview (Pages 103–104)

{overview_text}

---

| [← Playing the Game](../03_playing_the_game.md) | [↑ Stonetop Wiki Index](../index.md) | [Next: Running the Game →](../04_running_the_game.md) |
"""
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(content)

def generate_master_wiki_index():
    out_path = os.path.join(DOCS_DIR, "index.md")
    print("Generating docs/stonetop/index.md...")

    content = """---
title: "Stonetop Compendium & Navigable Wiki"
description: "A complete, hyperlinked reference guide to Stonetop Book I: hearth fantasy roleplaying in an iron age that never was."
---

# 🏔️ Stonetop Compendium

> *"This village, Stonetop—it’s our home. It’s not a glamorous place. Far from it. But we look out for each other. Everyone contributes. Everyone shares. And right now, trouble is a-brewing."*

Welcome to the **Stonetop Navigable Wiki**, an interactive, hyperlinked compendium of **Stonetop Book I** (by Jeremy Strandberg). Stonetop is a tabletop roleplaying game of **hearth fantasy** powered by the Apocalypse engine, focusing on community survival, expeditionary mystery, and the weight of leadership in an isolated iron-age frontier.

---

## 🧭 Quick Navigation Directory

```mermaid
flowchart TD
    Hub[Stonetop Wiki] --> Play[Player Guide & Playbooks]
    Hub --> Moves[Player Moves & Harm]
    Hub --> GM[GM Guide & Running Play]
    Hub --> World[Expeditions, Sites & Dangers]
    Hub --> Hearth[Homefront & Seasons Change]

    Play --> PB1[The 9 Playbooks]
    Play --> PB2[Steading Sheet]
    Moves --> M1[Basic Moves]
    Moves --> M2[Harm & Healing]
    GM --> G1[Core Loop & Principles]
    GM --> G2[Threats & Fronts]
    World --> W1[Travel & Camps]
    World --> W2[Sites & Dungeons]
    World --> W3[Hazards & Monsters]
    Hearth --> H1[Village Moves]
    Hearth --> H2[Seasons Change]
```

---

## 📚 Table of Contents by Section

### 1. Foundation & First Steps
* [**01. Welcome to Stonetop & The Setting**](01_welcome_and_setting.md) — Hearth fantasy, the world, cultural expectations, and tone.
* [**02. Getting Started & First Session**](02_getting_started.md) — Setting up the table, tone & safety, character creation, and the first spring.
* [**03. Playing the Game & Core Rules**](03_playing_the_game.md) — The conversation, player agenda, flow of play, dice & moves, principles, and gear.

### 2. Character Playbooks
* [**Playbooks Directory & Overview**](playbooks/index.md) — Complete selection guide and playbook rules.
  * [**The Blessed**](playbooks/the_blessed.md) — Consecrated vessel of Danu, goddess of crops, spring, and the soil.
  * [**The Fox**](playbooks/the_fox.md) — Cunning problem solver, dirty fighter, and sharp survivor.
  * [**The Heavy**](playbooks/the_heavy.md) — The village champion, scarred veteran, sheriff, or storm-marked warrior.
  * [**The Judge**](playbooks/the_judge.md) — Arbiter of Aratis, upholder of ancient law, wielder of the holy hammer/helm.
  * [**The Lightbearer**](playbooks/the_lightbearer.md) — Fiery priest of Helior the Sun, bringer of radiant light and truth.
  * [**The Marshal**](playbooks/the_marshal.md) — Leader of the village militia, commander of a loyal crew, master tactician.
  * [**The Ranger**](playbooks/the_ranger.md) — Scout of the Great Wood, beast-bonded hunter, tracker of the wild.
  * [**The Seeker**](playbooks/the_seeker.md) — Scholar of Things Below, tamperer with arcana, delver into Maker ruins.
  * [**The Would-be Hero**](playbooks/the_would_be_hero.md) — Eager youth marked by destiny, burning brightly to save the village.
  * [**Playbook Inserts & Special Moves**](playbooks/inserts.md) — Inventory, animal companions, crew, initiates, invocations, and special playbooks.
  * [**The Steading Playbook**](playbooks/steading_playbook.md) — The communal village character sheet: Prosperity, Defenses, Population, and Improvements.

### 3. The Rules Engine
* [**04. Running the Game (GM Guide)**](04_running_the_game.md) — The GM agenda, core conversation loop, spotlight, GM moves, and preparation.
* [**05. Player Moves & Basic Moves**](05_player_moves.md) — Complete text of Defy Danger, Clash, Defend, Know Things, Let Fly, Persuade, Seek Insight, Burn Brightly, and Death's Door.
* [**06. Harm, Wounds & Healing**](06_harm_and_healing.md) — HP, damage, debilities, problematic wounds, recovery, and death.

### 4. Adventures, Expeditions & Dangers
* [**07. The First Adventure**](07_first_adventure.md) — Goals, structure, setup questions, framing scenes, and launching the campaign.
* [**08. Threats & Fronts**](08_threats.md) — Threat design, instincts, countdown clocks, stakes, and updating threats.
* [**09. Expeditions & Travel**](09_expeditions.md) — Route planning, journey moves, foraging, navigating the wild, making camp, and returning home.
* [**10. Sites & Dungeons**](10_sites.md) — Environmental storytelling, site exploration, site creation, and *The Green Lord's Tomb*.
* [**11. Dangers, Hazards & Monsters**](11_dangers.md) — Environmental hazards, monster stat blocks, running combat, and creature moves.
* [**12. Discoveries, Artifacts & Arcana**](12_discoveries.md) — Clues, sites, encounters, Maker relics, and strange arcana.

### 5. Community & Ongoing Play
* [**13. NPCs & Followers**](13_npcs_and_followers.md) — Creating NPCs, follower moves, quality, loyalty, and recruitment.
* [**14. The Homefront & Seasons Change**](14_homefront.md) — Bringing the village to life, aftermath, homefront moves, and the Seasons Change procedure.
* [**15. Writing Moves & Love Letters**](15_writing_moves.md) — Designing custom moves, triggers, choices, and customized love letters.
* [**16. The Ongoing Campaign & Advancement**](16_the_game_ongoing.md) — Session rhythm, advancement, retiring characters, time skips, and campaign climaxes.
* [**17. Reference & Master Index**](17_reference_and_index.md) — Acknowledgements, mediography, and master alphabetical index.

---

## ⚡ Core Moves Quick Reference

| Move | Trigger | Roll | Key Outcome |
| :--- | :--- | :--- | :--- |
| **Defy Danger** | When you act despite imminent peril | +Appropriate Stat | 10+: You succeed; 7–9: You stumble or face a hard choice |
| **Clash** | When you trade blows in close combat | +STR (or +DEX) | 10+: Deal your damage, avoid theirs; 7–9: Trade damage |
| **Defend** | When you stand firm against attack | +CON (or +WIS) | Hold 1–3 hold to absorb damage, protect allies, or strike back |
| **Let Fly** | When you attack a target at range | +DEX | 10+: Full damage; 7–9: Pick an obstacle, ammo loss, or weak hit |
| **Know Things** | When you consult your accumulated lore | +INT | 10+: Truthful, actionable facts; 7–9: Vague or concerning truth |
| **Seek Insight** | When you carefully study a person or situation | +WIS | Ask 1–3 questions from the list; take +1 forward when acting on it |
| **Persuade** | When you press, bribe, or cajole an NPC | +CHA | 10+: They do it or reveal what it takes; 7–9: They demand reassurance |
"""
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(content)

def main():
    t0 = time.time()
    os.makedirs(DOCS_DIR, exist_ok=True)
    os.makedirs(PLAYBOOKS_DIR, exist_ok=True)

    print("Building Stonetop Wiki from PDF...")
    
    # 1. Generate master index
    generate_master_wiki_index()

    # 2. Generate playbooks index
    generate_playbooks_index(PDF_PATH)

    # 3. Generate individual playbooks
    for i, pb in enumerate(PLAYBOOKS):
        prev_pb = PLAYBOOKS[i - 1] if i > 0 else None
        next_pb = PLAYBOOKS[i + 1] if i + 1 < len(PLAYBOOKS) else None
        generate_playbook_file(PDF_PATH, pb, prev_pb, next_pb)

    # 4. Generate main sections
    for i, sec in enumerate(SECTIONS):
        prev_sec = SECTIONS[i - 1] if i > 0 else None
        next_sec = SECTIONS[i + 1] if i + 1 < len(SECTIONS) else None
        generate_section_file(PDF_PATH, sec, prev_sec, next_sec)

    print(f"\nSuccessfully generated Stonetop Wiki in {time.time() - t0:.1f} seconds!")

if __name__ == "__main__":
    main()
