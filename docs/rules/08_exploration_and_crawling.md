# Exploration & Dungeon Crawling Procedures

> **"Track time when time can bite back. Let it pass quietly when nothing is pressing."**

---

## ⏳ The Crawling Turn Engine

Exploration in ASH operates on **Crawling Turns**. In a dungeon or ruin, time is strictly tracked:

```mermaid
flowchart LR
    Turn["1. Declare Crawling Action"] --> Check["2. Action Resolution"]
    Check --> Tension["3. Advance Tension Counter"]
    Tension --> Hazard{"Tension = 2 Turns?"}
    Hazard -- Yes --> RollWander["Roll 1d6 Hazard / Wandering Check"]
    Hazard -- No --> Turn
    RollWander --> Turn
```

### Turn Actions (1 Crawling Turn = ~10 Minutes in-game)
Each turn, the party performs one major synchronized action:
* **Move & Map:** Advance to an adjacent dungeon room or unmapped corridor.
* **Search for Secrets / Traps:** Thoroughly inspect stone walls, chests, or sarcophagi.
* **Pick Lock / Force Door:** Attempt to open a barred or locked gateway.
* **Short Rest (Breather):** Bandage wounds and catch breath (regains 1d4 HP; requires safe room).

---

## 🕯️ Situational Light Procedure

Do **not** keep a universal torch timer. Track light only when all of the following are true:

1. The party has moved away from stable light such as a campfire, settlement, or daylight.
2. The party does not have a fueled lantern, magical light, or another durable source.
3. Darkness matters to the current scene: underground exploration, night travel, a lightless ruin, or supernatural gloom.

When those conditions apply, a torch lasts **6 Crawling Turns** (about 1 in-game hour). Mark a turn when the party performs a crawling action. Extinguish the torch after the sixth marked turn. Stop tracking as soon as the party returns to stable light or produces a durable source.

!!! danger "Total Darkness"
    * Characters without Infravision cannot see, navigate, or cast targeted spells.
    * Attack rolls are made with **Disadvantage**.
    * Enemies gain **Advantage** on attacks against the party.
    * Wandering encounter checks occur every Crawling Turn until light returns.

A lantern avoids the short torch track. Refill or test its oil only after a long expedition, when the Oracle produces **Resource Peril**, or when the fiction specifically threatens it.

---

## ⚠️ Hazard & Wandering Checks

Every **2 Crawling Turns** (or immediately if the party makes excessive noise or breaks a door):
Roll **1d6 on the Dungeon Hazard Table**:

| 1d6 | Result | Effect |
| :---: | :--- | :--- |
| **1** | **Wandering Monster!** | Immediate encounter rolled on the dungeon's ecological table. |
| **2** | **Ominous Sign / Omen** | Sound of claws on stone, rising sulfur smoke, or a distant death cry. |
| **3** | **Environmental Hazard** | Cave-in tremor, toxic fungal spore burst, or flooding water. |
| **4** | **Resource Depletion** | Draft flickers a torch (lose 10 mins) or rations spoiled by dampness. |
| **5–6** | **Eerie Silence** | Clear for now. The darkness waits. |

---

## ⛺ Rests & Starvation

### Short Rest (1 Turn in Dungeon)
* Must be in a secured chamber (doors spiked shut).
* Consume 1 fresh water ration.
* Recover **1d4 HP** or restore 1 exhausted class talent.

### Long Rest (8 Hours in Sanctuary / Safe Enclave)
* Full recovery of all Hit Points and daily class abilities / spell slots.
* Requires 1 day of iron rations and a safe bed.
* In the wild, requires 2 party members on active watch rotation (roll 2 hazard checks overnight).

### Starvation & Dehydration
* Adventurers need **1 ration and water daily**.
* If a day passes without rations, gain **1 Level of Exhaustion** (Disadvantage on STR and CON checks; HP maximum reduced by 25%).
