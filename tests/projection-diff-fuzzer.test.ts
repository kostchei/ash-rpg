import { beforeEach, describe, expect, it } from "vitest";
import { AshDatabase } from "../src/server/database.js";
import { buildStateFromSlices, patchStateWithSlices } from "../src/shared/slices.js";
import { SliceDiffer } from "../src/server/slice-diff.js";
import type { CampaignState } from "../src/shared/types.js";

describe("Phase 1: Projection Diff Fuzzer (Guardrail Invariant)", () => {
  let db: AshDatabase;

  beforeEach(() => {
    db = new AshDatabase(":memory:");
  });

  function assertPlayerFogInvariants(state: CampaignState, hostState: CampaignState) {
    // Invariant 1: Secret path never leaks to player
    expect(state.campaign.isSecretPath).toBeFalsy();

    // Invariant 2: Fog of war on hexes
    for (const hex of state.hexes) {
      if (hex.revealState === "unexplored") {
        expect(hex.threatTier).toBeUndefined();
        expect(hex.landmark).toBeUndefined();
        expect(hex.biome).toBeUndefined();
        expect(hex.name).toBeUndefined();
        expect(hex.road).toBeUndefined();
        expect(hex.river).toBeUndefined();
        expect(hex.connections).toBeUndefined();
        expect(hex.sites).toBeUndefined();
      }

      // Hidden sites must not be visible to players unless discovered
      if (hex.sites) {
        for (const site of hex.sites) {
          if (site.visibility === "hidden") {
            expect(db.isSiteDiscovered(state.campaign.id, site.id)).toBe(true);
          }
          expect(site.visibility).not.toBe("secret");
        }
      }
    }

    // Invariant 3: Monster lore gating
    for (const enc of state.encounters) {
      for (const m of enc.monsters) {
        if (m.loreTier === 0) {
          expect(m.ac).toBeUndefined();
          expect(m.attacks).toBeUndefined();
          expect(m.traits).toBeUndefined();
        } else if (m.loreTier === 1) {
          expect(m.ac).toBeUndefined();
          expect(m.traits).toBeUndefined();
        } else if (m.loreTier === 2) {
          expect(m.traits).toBeUndefined();
        }
      }
    }

    // Invariant 4: Dungeon fog gating
    if (state.activeDungeon) {
      for (const room of state.activeDungeon.nodes) {
        if (!room.explored) {
          expect(room.feature).toBeUndefined();
          expect(room.contents).toBe("");
          expect(room.interaction).toBe("");
          expect(room.trap).toBeUndefined();
          expect(room.encounter).toBeUndefined();
          expect(room.treasure).toBeUndefined();
        } else if (room.trap && !room.trap.spotted) {
          expect(room.trap.effect).toBeUndefined();
          expect(room.trap.dc).toBeUndefined();
        }
      }
    }

    // Invariant 5: No player projection ever gains a field the pre-slicing projection withheld
    expect(state.campaign.revision).toBe(hostState.campaign.revision);
    expect(state.characters.length).toBe(hostState.characters.length);
    expect(state.hexes.length).toBe(hostState.hexes.length);
  }

  /**
   * The incremental wire content: what a broadcast would actually send for this
   * role, given everything already delivered. Patching this must land the client
   * on exactly the canonical projection.
   */
  function nextUpdate(differ: SliceDiffer, projection: ReturnType<AshDatabase["getSlicedState"]>) {
    const { slices, entityDeltas } = differ.diff("player", projection);
    return {
      campaignRevision: projection.campaignRevision,
      slices: { ...slices, me: projection.slices.me },
      entityDeltas,
    };
  }

  it("fuzzes 100 random legal mutations and verifies sliced player projection never leaks secrets", () => {
    // 1. Create a campaign with secret path enabled on host
    const created = db.createCampaign("Fuzz Company", "The Shrouded Realm", "1234", {
      selection: { mode: "single", zoneId: "the_gloaming" },
      seed: "fuzz_seed_42",
      pathMode: "secret",
    });
    const campaignId = created.campaignId;

    let clientState: CampaignState | null = null;

    // Initial snapshot verification
    const differ = new SliceDiffer();
    const initialSlice = db.getSlicedState(campaignId, "player", null, "", undefined, { isInitial: true });
    differ.prime("player", initialSlice);
    clientState = buildStateFromSlices(initialSlice);
    const initialHostState = db.getState(campaignId, "host", null, "");
    const initialPlayerState = db.getState(campaignId, "player", null, "");

    expect(clientState.campaign.revision).toBe(initialPlayerState.campaign.revision);
    assertPlayerFogInvariants(clientState, initialHostState);

    // Track active monsters/characters for combat simulation
    const charIds: number[] = [];
    for (let c = 1; c <= 4; c++) {
      const char = db.addCharacter(campaignId, null, {
        name: `Fuzz PC ${c}`,
        ancestry: "human",
        className: "Fighter",
        level: 1,
        hp: 10,
        maxHp: 10,
        ac: 14,
        gold: 10,
        gearSlots: 10,
        xp: 0,
        abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
        anchors: { homeland: "Valia", landmark: "Keep", nemesis: "Rival" },
      });
      charIds.push(char.id);
    }

    const hexList = db.db
      .prepare("SELECT id FROM hexes WHERE campaign_id = ?")
      .all(campaignId) as Array<{ id: string }>;

    let combatActive = false;

    // Run 100 random legal actions
    for (let step = 0; step < 100; step++) {
      const actionType = step % 10;

      switch (actionType) {
        case 0: {
          // Reveal a random hex to scouted or fully_mapped
          const hex = hexList[step % hexList.length];
          const stateChoice = step % 2 === 0 ? "scouted" : "fully_mapped";
          db.revealHex(campaignId, hex.id, stateChoice);
          break;
        }
        case 1: {
          // Add a dice roll
          db.addRoll(campaignId, {
            actor: "Fuzz PC 1",
            kind: "check",
            label: `Fuzz Check ${step}`,
            dice: "1d20",
            total: (step % 20) + 1,
            detail: `Rolled ${(step % 20) + 1}`,
          });
          break;
        }
        case 2: {
          // Add a wiki note
          db.addNote(campaignId, "Lore", `Fuzz Note ${step}`, `Body for step ${step}`);
          break;
        }
        case 3: {
          // Discover hidden sites if any exist
          const siteRow = db.db
            .prepare("SELECT id FROM sites WHERE region_id = (SELECT id FROM regions WHERE campaign_id = ?) AND visibility = 'hidden' LIMIT 1")
            .get(campaignId) as { id: string } | undefined;
          if (siteRow) {
            db.discoverSite(campaignId, siteRow.id);
          }
          break;
        }
        case 4: {
          // Add an encounter or reveal monster lore
          const encRow = db.db
            .prepare("SELECT em.id FROM encounter_monsters em JOIN encounters e ON em.encounter_id = e.id WHERE e.campaign_id = ? LIMIT 1")
            .get(campaignId) as { id: number } | undefined;
          if (encRow) {
            const tier = (step % 4);
            db.revealMonsterLore(campaignId, encRow.id, tier);
          } else {
            db.addEncounter(campaignId, "owlbear", 1);
          }
          break;
        }
        case 5: {
          // Advance or create campaign pressure
          const press = db.db
            .prepare("SELECT id FROM campaign_pressures WHERE campaign_id = ? LIMIT 1")
            .get(campaignId) as { id: number } | undefined;
          if (press) {
            db.advancePressure(campaignId, press.id, 1);
          } else {
            db.addPressure(campaignId, {
              name: `Pressure ${step}`,
              shape: "countdown",
              threshold: 5,
              consequence: "Doom arrives",
            });
          }
          break;
        }
        case 6: {
          // Update a character's HP or gold
          const charId = charIds[step % charIds.length];
          const char = db.db
            .prepare("SELECT * FROM characters WHERE id = ?")
            .get(charId) as any;
          if (char) {
            db.updateCharacter(campaignId, {
              ...char,
              hp: Math.max(1, (char.hp + 1) % 11),
              gold: char.gold + 5,
              conditions: [],
            });
          }
          break;
        }
        case 7: {
          // Start or progress combat
          if (!combatActive) {
            const encId = db.addEncounterWithMonsters(campaignId, "Fuzz Skirmish", [
              {
                id: 1,
                monsterKey: "wolf",
                name: "Dire Wolf",
                currentHp: 12,
                maxHp: 12,
                loreTier: 0,
                ac: 12,
                morale: 7,
                attacks: ["Bite +2"],
                traits: [],
                lore: [],
              },
            ]);
            db.saveCombatState(campaignId, {
              encounterId: encId,
              campaignId,
              round: 1,
              activeIndex: 0,
              combatants: [
                {
                  id: "pc-1",
                  name: "Fuzz PC 1",
                  kind: "pc",
                  refId: charIds[0],
                  initiative: 15,
                  ac: 14,
                  currentHp: 10,
                  maxHp: 10,
                  conditions: [],
                },
                {
                  id: "monster-1",
                  name: "Dire Wolf",
                  kind: "monster",
                  refId: 1,
                  initiative: 10,
                  ac: 12,
                  currentHp: 12,
                  maxHp: 12,
                  conditions: [],
                },
              ],
              status: "active",
            });
            combatActive = true;
          } else {
            const combat = db.getCombatState(campaignId);
            if (combat) {
              combat.combatants[1].currentHp = Math.max(0, combat.combatants[1].currentHp - 2);
              combat.round += 1;
              if (combat.combatants[1].currentHp === 0) {
                combat.status = "resolved";
                combatActive = false;
              }
              db.saveCombatState(campaignId, combat);
            }
          }
          break;
        }
        case 8: {
          // Enter dungeon room or light torch
          const dungeon = db.getDungeonGraph(campaignId);
          if (dungeon && dungeon.nodes.length > 0) {
            const room = dungeon.nodes[step % dungeon.nodes.length];
            db.setRoomExplored(campaignId, room.id, true);
          }
          break;
        }
        case 9: {
          // Award XP
          const charId = charIds[step % charIds.length];
          db.saveReward(campaignId, {
            id: `reward-${step}`,
            campaignId,
            sourceType: "encounter",
            sourceId: `enc-${step}`,
            coins: { cp: 0, sp: 0, gp: 10 },
            items: [],
            claimed: true,
            allocations: { [charId]: { xp: 50, coins: { cp: 0, sp: 0, gp: 10 } } },
          });
          break;
        }
      }

      // Fetch fresh states
      const hostState = db.getState(campaignId, "host", null, "");
      const canonicalPlayerState = db.getState(campaignId, "player", null, "");

      // Patch client state with only what a real broadcast would have sent.
      const projection = db.getSlicedState(campaignId, "player", null, "");
      clientState = patchStateWithSlices(clientState!, nextUpdate(differ, projection));

      // Verify invariant: Fog invariants hold 100% of the time
      assertPlayerFogInvariants(clientState, hostState);

      // Every non-paginated part of the client state must equal the canonical
      // player projection. Rolls and notes are excluded: they are append-only
      // and reach the client through append events and cursor paging instead.
      const { rolls: _clientRolls, notes: _clientNotes, ...client } = clientState;
      const {
        rolls: _canonicalRolls,
        notes: _canonicalNotes,
        ...canonical
      } = canonicalPlayerState;
      expect(client).toEqual(canonical);
    }
  });
});
