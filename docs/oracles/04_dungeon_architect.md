# Dungeon & Ruin Architect

> **"Every dungeon tells the story of what built it, what abandoned it, and the predatory ecosystem that now inhabits its bones."**

---

## 🏛️ Step 1: Chamber Geometry & Exits (1d6)

When the party steps through a doorway or down stairs into an unmapped dungeon area:

```mermaid
flowchart LR
    Door[Open Dungeon Door] --> Size[1. Roll Chamber Size 1d6]
    Size --> Dressing[2. Roll Chamber Dressing 1d10]
    Dressing --> Hazard[3. Roll Chamber Contents 1d6]
    Hazard --> Exits[4. Roll Connecting Exits 1d4]
```

| 1d6 | Chamber Type & Dimensions | Connecting Exits (1d4) |
| :---: | :--- | :---: |
| **1** | Small Square Guard Post (20' x 20') | 1 Exit (Dead-end or single path forward) |
| **2** | Narrow Vaulted Corridor (10' wide, 40' long) | 2 Exits (T-junction or straight corridor) |
| **3** | Rectangular Burial Vault / Sarcophagus Room (30' x 50') | 2 Exits (Opposite walls) |
| **4** | Natural Limestone Cavern with Stagnant Pool (40' x 40') | 3 Exits (Branching tunnels) |
| **5** | Grand Pillared Hall / Temple Antechamber (50' x 70') | 3 Exits (Heavy archways) |
| **6** | Vast Multi-Tier Chasm / Pit Room with Ledges (60'+) | 4 Exits (Crossroad hub / vertical shaft) |

---

## 💀 Step 2: Chamber Contents & Hazards (1d6)

| 1d6 | Primary Chamber Contents | Mechanical Interaction |
| :---: | :--- | :--- |
| **1** | **Empty & Eerie** | Ancient dust, wind whistling through cracks. Free search turn. |
| **2** | **Dungeon Dressing / Lore Inscription** | Carved relief, fresco, or statue; reveals a clue or historical secret. |
| **3** | **Mechanical or Magical Trap** | Hidden tripwire, pitfall, or scything blade (DC 12–14 DEX check to avoid). |
| **4** | **Lair / Resident Monster** | Inhabitants guarding territory or sleeping (Roll 2d6 Reaction). |
| **5** | **Guarded Treasure Cache** | Locked iron chest, alcove urn, or hidden false-brick cache. |
| **6** | **Special Feature / Puzzle / Relic** | Sunken fountain of healing, glowing rune puzzle, or teleportation archway. |

---

## 🪤 Step 3: Dungeon Traps & Hazards (1d8)

| 1d8 | Trap Mechanism | Trigger | Damage & Effect | Disarm DC |
| :---: | :--- | :--- | :--- | :---: |
| **1** | **Spiked Pit Trap (10' deep)** | False stone flagstone | 1d6 falling + 1d6 piercing damage | DC 12 |
| **2** | **Poison Dart Volley** | Opening chest without key | 1d4 piercing + DC 12 CON save or paralyzed 1d4 rnds | DC 14 |
| **3** | **Scything Ceiling Blade** | Tripping wire across corridor | 2d8 slashing damage (DEX save DC 13 for half) | DC 13 |
| **4** | **Crushing Stone Block** | Pulling false lever/lever puzzle | 3d10 bludgeoning; completely seals doorway | DC 15 |
| **5** | **Toxic Spore Cloud** | Stepping near dried fungal colony | DC 11 CON check or suffer 1 fatigue level + blinded 3 rnds | DC 10 |
| **6** | **Flooding Sluice Gate** | Opening iron vault door | Chamber fills with water in 3 rounds | DC 14 |
| **7** | **Electrified Rune Floor** | Walking without speaking pass-phrase | 2d6 lightning damage + blows out all open flames | DC 15 |
| **8** | **Teleportation Slide** | Sliding ramp trapdoor | Slid 1 dungeon level down into monster pit | DC 13 |
