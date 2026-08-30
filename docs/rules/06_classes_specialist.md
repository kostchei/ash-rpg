# Specialist Classes: Monk, Druid, Alchemist, and Sage

> **Four essential archetypes designed for tactical depth, wilderness mastery, Monsternomicon harvesting, and GM-less party synergy.**

---

=== "Monk"

    ## 🥋 Monk (The Martial Ascetic)

    Disciplined seekers of spiritual and physical perfection who hone their bodies into living weapons and harness inner ki to defy physical limits.

    ```mermaid
    flowchart LR
        L1[Lv 1-2: 1d4 Strike] --> L3[Lv 3-4: 1d6 Strike]
        L3 --> L5[Lv 5-6: 1d8 Strike]
        L5 --> L7[Lv 7-8: 1d10 Strike]
        L7 --> L9[Lv 9-10: 1d12 Strike]
    ```

    * **Weapons:** Club, dagger, spear, staff, shuriken, strikes (unarmed)
    * **Armor:** None
    * **Hit Points:** 1d8 per level
    * **Unarmored Defense:** While wearing no armor and carrying no shield, your Armor Class is **10 + DEX modifier + WIS modifier (if positive)**.
    * **Martial Arts Strike:** Your unarmed strikes are lethal weapons that gain increasing damage and magical properties:
        * **Level 1–2:** 1d4 damage (+0 magical strike)
        * **Level 3–4:** 1d6 damage (+1 magical strike)
        * **Level 5–6:** 1d8 damage (+2 magical strike)
        * **Level 7–8:** 1d10 damage (+2 magical strike)
        * **Level 9–10:** 1d12 damage (+3 magical strike)
    * **Flurry of Blows:** When you take the attack action on your turn, you may make **one additional unarmed strike** as part of the same action.
    * **Deflect Missiles:** Once per round when you are hit by a ranged physical attack, make a DEX check vs. the attack roll. On a success, negate the damage completely.
    * **Still the Mind:** Immune to non-magical diseases and fear effects.

    ### Monk Talents (2d6)
    | 2d6 | Effect (Duplicates: +1 use/bonus) |
    | :---: | :--- |
    | **2** | **Ki Step:** 3/day, double your movement speed and ignore difficult terrain for 1 round. |
    | **3–6** | **+1 to unarmed attack and damage rolls.** |
    | **7–9** | **+2 to Dexterity or Wisdom stat.** |
    | **10–11** | **Stunning Palm:** 2/day, on a melee hit, target must pass a CON check vs DC 10 + half your level or be stunned for 1 round. |
    | **12** | Choose any talent or gain +2 points to distribute among your stats. |

=== "Druid"

    ## 🍃 Druid (Warden of the Wilds)

    Protectors of the primordial spheres who channel the raw elements, speak the secret tongue of beasts, and take the shapes of legendary predators.

    * **Weapons:** Club, dagger, handaxe, shortbow, spear, staff, sling
    * **Armor:** Leather armor, wooden shields
    * **Hit Points:** 1d6 per level
    * **Languages:** You know Sylvan and Druidic (the secret language of nature).
    * **Primal Spellcasting:** You use **Wisdom** to cast druid spells. The DC is **10 + the spell's Tier**.
        * *Failure:* You cannot cast that spell again until you complete a rest.
        * *Critical Failure (Natural 1):* You lose communion with nature and must perform penance to Gede or the Old Spirits.
    * **Wild Shape:** 2/day, you can transform into a natural beast you have observed (e.g., Wolf, Dire Badger, Hawk, Giant Snake, Bear) for up to 10 rounds:
        * You adopt the beast's STR, DEX, CON, HP, AC, speed, and natural attacks.
        * You retain your INT, WIS, and CHA.
        * If reduced to 0 HP while transformed, you revert to your true form at whatever HP you had before transforming.
    * **Nature Sense:** Advantage on all checks related to tracking, foraging, predicting weather, and navigating wild hexes.

    ### Druid Spells Known by Tier
    | Level | Tier 1 | Tier 2 | Tier 3 | Tier 4 | Tier 5 |
    | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
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

    ### Druid Talents (2d6)
    | 2d6 | Effect |
    | :---: | :--- |
    | **2** | Gain +1 daily use of Wild Shape, and you can transform into large/dire apex predators. |
    | **3–6** | **+1 to primal spellcasting checks.** |
    | **7–9** | **+2 to Wisdom, Constitution, or Dexterity stat.** |
    | **10–11** | Learn one additional druid spell of any tier you can cast. |
    | **12** | Choose any talent or gain +2 points to distribute among your stats. |

=== "Alchemist"

    ## 🧪 Alchemist (The Field Harvester & Artificer)

    Cunning savants who extract volatile compounds from monsters, harvest primeval flora, and craft combat concoctions, mutagens, and elemental bombs on the fly.

    * **Weapons:** Blowgun, club, crossbow, dagger, dart, shortsword, sling
    * **Armor:** Leather armor
    * **Hit Points:** 1d6 per level
    * **Field Harvester (Monsternomicon Link):**
        * You have **Advantage on all Harvesting & Salvage checks** on slain monsters and exotic flora.
        * You can extract glands, venom sacs, ichor, and vital plates without risking contamination or self-poisoning.
    * **Volatile Bombcraft:** During camping or rest, you prepare **3 Alchemical Flasks** (occupying 1 gear slot total):
        * **Fire Flask:** Thrown (Near). 2d6 fire damage in a close radius.
        * **Acid Vial:** Thrown (Near). 1d8 acid damage and permanently lowers target AC by 1 (max -3).
        * **Choking Smoke:** Thrown (Near). Blinds and obscures a near-sized area for 3 rounds.
        * **Cryo Draught:** Thrown (Near). 1d6 cold damage; target’s movement speed is halved for 3 rounds.
    * **Mutagenic Tinctures:** 2/day, ingest an alchemical mutagen to gain **+2 to STR, DEX, or CON** and +1d4 temporary HP for 10 rounds. When it expires, pass a DC 10 CON check or gain 1 level of fatigue.

    ### Alchemist Talents (2d6)
    | 2d6 | Effect (Duplicates: +1 bonus or use) |
    | :---: | :--- |
    | **2** | Your bomb damage dice explode (roll again on maximum die result). |
    | **3–5** | **+1 to ranged attack rolls with thrown bombs and slings.** |
    | **6–8** | **+2 to Intelligence or Dexterity stat.** |
    | **9–11** | Prepare **+2 additional Alchemical Flasks** per rest. |
    | **12** | Choose any talent or gain +2 points to distribute among your stats. |

=== "Sage"

    ## 📜 Sage (The Chronicler & Tactician)

    Encyclopedic scholars of antiquity, planar secrets, and runic glyphs who serve as the intellectual vanguard and tactical heart of the party.

    * **Weapons:** Crossbow, dagger, staff
    * **Armor:** Leather armor
    * **Hit Points:** 1d4 per level
    * **Omniscience (Monsternomicon Lore Mastery):**
        * You automatically know all **Common & Field Lore** for any monster encountered.
        * You roll **Obscure and Arcane Lore checks with Advantage**, identifying monster vulnerabilities, resistances, and habitat behaviors before combat begins.
    * **Master of Tongues:** You can read, write, and speak all common and rare languages, including Dead Runic, Celestial, Diabolic, and Primordial.
    * **Tactical Counsel:** Once per combat round on an ally’s turn within Near range, you can shout tactical guidance to grant that ally **Advantage on their next attack roll, saving throw, or spellcasting check**.
    * **Universal Scroll Inscription:** You can activate and cast from **any spell scroll** (Wizard, Priest, Witch, Druid, Seer, or Necromancer) using your **Intelligence modifier**, without mishap on a failed check (scroll is simply unspent on normal failure; only destroyed on natural 1).
    * **Relic Attunement:** During downtime or resting, you can identify the full properties, curse triggers, and history of any magical relic or artifact with an INT check (DC 12).

    ### Sage Talents (2d6)
    | 2d6 | Effect |
    | :---: | :--- |
    | **2** | **Weakness Expose:** When you succeed on a Monsternomicon Lore check, your entire party deals **+1d6 damage** against that creature type for the combat. |
    | **3–6** | **+1 to Tactical Counsel bonus** (grants +1d4 extra damage to the advised ally). |
    | **7–9** | **+2 to Intelligence or Wisdom stat.** |
    | **10–11** | You gain **+2 additional Gear Slots** reserved exclusively for books, scrolls, and ancient tomes. |
    | **12** | Choose any talent or gain +2 points to distribute among your stats. |
