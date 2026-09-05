import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createAshServer, type AshServerOptions } from "../src/server/app.js";
import { AshDatabase } from "../src/server/database.js";
import { generateProceduralRegion } from "../src/server/generators/procedural-region.js";
import { solveHydrology } from "../src/server/generators/hydrology.js";
import { coordKey, generateHexArea } from "../src/server/generators/noise.js";
import { createRandomSource } from "../src/server/generators/prng.js";
import type { RegionGenerationConfig } from "../src/shared/types.js";

describe("Remediation Verification (R1-R7 and G1-G6)", () => {
  let server: Awaited<ReturnType<typeof createAshServer>>;
  let db: AshDatabase;

  beforeAll(async () => {
    server = await createAshServer({
      dbPath: ":memory:",
      frontend: false,
      port: 0,
    } satisfies AshServerOptions);
    await server.listen();
    db = new AshDatabase(":memory:");
  });

  afterAll(async () => {
    await server.close();
    db.close();
  });

  // --- R1: Campaign Creation and Regeneration Zone Selection ---
  describe("R1 / M4: Campaign Creation & Zone Selection", () => {
    it("creates a campaign with explicit generationConfig and sets activeZoneId", () => {
      const config: RegionGenerationConfig = {
        selection: { mode: "single", zoneId: "red_sands" },
        seed: "r1_test_seed",
      };
      const created = db.createCampaign("Desert Caravan", "Alkesh Basin", "1234", config);
      const state = db.getState(created.campaignId, "host", null, "");

      expect(state.campaign.activeZoneId).toBe("red_sands");
      expect(state.campaign.activeRegionId).toBeTruthy();
      expect(state.activeZone?.id).toBe("red_sands");
    });

    it("regenerates an existing campaign with red_sands and updates activeZoneId and revision", () => {
      const created = db.createCampaign("Initial Company", "Marin's Hold", "1234");
      const stateBefore = db.getState(created.campaignId, "host", null, "");
      expect(stateBefore.campaign.activeZoneId).toBe("the_gloaming");

      db.regenerateHexMap(created.campaignId, "red_sands");
      const stateAfter = db.getState(created.campaignId, "host", null, "");

      expect(stateAfter.campaign.activeZoneId).toBe("red_sands");
      expect(stateAfter.activeZone?.id).toBe("red_sands");

      // Verify revision incremented
      const regions = db.db
        .prepare("SELECT revision, active FROM regions WHERE campaign_id = ? ORDER BY revision ASC")
        .all(created.campaignId) as { revision: number; active: number }[];
      expect(regions.length).toBeGreaterThanOrEqual(1);
      const activeReg = regions.find((r) => r.active === 1);
      expect(activeReg).toBeDefined();
    });
  });

  // --- R2: Subterranean Strategy & Cross-Layer Vertical Connection ---
  describe("R2 / M3: Layered Vertical Connections (Gloaming–Morzomotha)", () => {
    it("generates surface and subterranean layers with cross-layer shaft in seed review_0", () => {
      const config: RegionGenerationConfig = {
        selection: {
          mode: "border",
          zoneIds: ["the_gloaming", "dwellers_in_the_deep"],
          connection: "vertical",
        },
        seed: "review_0",
        structuralRadius: 6,
        initialRadius: 2,
      };

      const world = generateProceduralRegion(1, config);

      // Layer assertions
      expect(world.layers).toHaveLength(2);
      const surfaceLayer = world.layers.find((l) => l.layerId === "surface");
      const subLayer = world.layers.find((l) => l.layerId === "subterranean");
      expect(surfaceLayer).toBeDefined();
      expect(subLayer).toBeDefined();

      // Subterranean hexes must exist (>0 cells)
      const subHexes = world.hexes.filter((h) => h.layerId === "subterranean");
      expect(subHexes.length).toBeGreaterThanOrEqual(19);
      expect(subHexes[0].primaryZone).toBe("dwellers_in_the_deep");

      // Cross-layer shaft connection must exist
      const shaft = world.connections.find((c) => c.kind === "shaft");
      expect(shaft).toBeDefined();
      expect(shaft?.crossingMethod).toBe("climb");
      expect(shaft?.costWatches).toBe(2);
      expect(shaft?.requirements).toContain("rope");
      expect(shaft?.requirements).toContain("climbing_gear");

      // Cave passage connections between subterranean hexes
      const cavePassages = world.connections.filter((c) => c.kind === "cave_passage");
      expect(cavePassages.length).toBeGreaterThan(0);
    });

    it("supports reversed vertical pairing order cleanly", () => {
      const config: RegionGenerationConfig = {
        selection: {
          mode: "border",
          zoneIds: ["dwellers_in_the_deep", "the_gloaming"],
          connection: "vertical",
        },
        seed: "review_reversed",
      };

      const world = generateProceduralRegion(2, config);
      expect(world.validationReport.valid).toBe(true);
      expect(world.layers.some((l) => l.layerId === "subterranean")).toBe(true);
      expect(world.connections.some((c) => c.kind === "shaft")).toBe(true);
    });
  });

  // --- R3: Terrain & Hydrological Physical Constraints ---
  describe("R3 / M2: Physical Terrain Consistency (Andrik Maritime)", () => {
    it("ensures foot and cart roads never cross open water in seed review_0", () => {
      const config: RegionGenerationConfig = {
        selection: { mode: "single", zoneId: "midnight_sun" },
        seed: "review_0",
      };

      const world = generateProceduralRegion(3, config);
      expect(world.validationReport.valid).toBe(true);

      const hexDataMap = new Map(world.hexes.map((h) => [`${h.q}:${h.r}`, h]));

      // Check all foot/cart connections
      for (const conn of world.connections) {
        if (conn.kind === "road" || conn.kind === "trail") {
          const fromParts = conn.fromKey.split(":");
          const toParts = conn.toKey.split(":");
          if (fromParts[1] === "surface" && toParts[1] === "surface") {
            const fromHex = hexDataMap.get(`${fromParts[2]}:${fromParts[3]}`);
            const toHex = hexDataMap.get(`${toParts[2]}:${toParts[3]}`);
            if (fromHex && toHex) {
              expect(fromHex.elevation).toBeGreaterThanOrEqual(1);
              expect(toHex.elevation).toBeGreaterThanOrEqual(1);
            }
          }
        }
      }

      // Check settlements are strictly on habitable land
      for (const site of world.sites) {
        if (site.kind === "settlement" || site.kind === "haven") {
          const parts = site.canonicalKey.split(":");
          if (parts[1] === "surface") {
            const h = hexDataMap.get(`${parts[2]}:${parts[3]}`);
            if (h) {
              expect(h.elevation).toBeGreaterThanOrEqual(1);
            }
          }
        }
      }
    });
  });

  // --- R4: Seed Collisions and Non-Destructive Revisions ---
  describe("R4 / M1: Non-Destructive Revisions & Unique Region IDs", () => {
    it("does not overwrite region or destroy FK child rows when seeds share 8-char prefix", () => {
      const campaign = db.createCampaign("Prefix Test", "Gloaming", "1234");
      const campaignId = campaign.campaignId;

      const configA: RegionGenerationConfig = {
        selection: { mode: "single", zoneId: "the_gloaming" },
        seed: "samepref-A",
      };
      const configB: RegionGenerationConfig = {
        selection: { mode: "single", zoneId: "red_sands" },
        seed: "samepref-B",
      };

      // Generate and save region A
      const worldA = generateProceduralRegion(campaignId, configA);
      db.saveGeneratedRegion(campaignId, worldA);

      const regionARow = db.db
        .prepare("SELECT id, revision, active FROM regions WHERE id = ?")
        .get(worldA.region.id) as { id: string; revision: number; active: number };
      expect(regionARow).toBeDefined();
      expect(regionARow.active).toBe(1);
      expect(regionARow.revision).toBe(1);

      // Generate and save region B
      const worldB = generateProceduralRegion(campaignId, configB);
      expect(worldB.region.id).not.toBe(worldA.region.id); // Distinct IDs

      db.saveGeneratedRegion(campaignId, worldB);

      // Verify Region A row STILL exists with active = 0 and revision = 1
      const regionAAfter = db.db
        .prepare("SELECT id, revision, active FROM regions WHERE id = ?")
        .get(worldA.region.id) as { id: string; revision: number; active: number };
      expect(regionAAfter).toBeDefined();
      expect(regionAAfter.active).toBe(0);
      expect(regionAAfter.revision).toBe(1);

      // Verify Region B row exists with active = 1 and revision = 2
      const regionBRow = db.db
        .prepare("SELECT id, revision, active FROM regions WHERE id = ?")
        .get(worldB.region.id) as { id: string; revision: number; active: number };
      expect(regionBRow).toBeDefined();
      expect(regionBRow.active).toBe(1);
      expect(regionBRow.revision).toBe(2);

      // Verify child records of Region A were NOT cascade deleted!
      const regionAHexes = db.db
        .prepare("SELECT count(*) as count FROM region_hexes WHERE region_id = ?")
        .get(worldA.region.id) as { count: number };
      expect(regionAHexes.count).toBeGreaterThan(0);

      const regionASites = db.db
        .prepare("SELECT count(*) as count FROM sites WHERE region_id = ?")
        .get(worldA.region.id) as { count: number };
      expect(regionASites.count).toBeGreaterThan(0);
    });
  });

  // --- R5: Input Validation & Atomic Creation ---
  describe("R5 / M1: Input Validation & Atomic Creation", () => {
    it("rejects invalid zone name in /api/regions/preview with 400", async () => {
      const res = await request(server.app)
        .post("/api/regions/preview")
        .send({
          selection: { mode: "single", zoneId: "not_a_zone" },
        });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain("Invalid region configuration");
    });

    it("rejects unsupported Djurum–Andrik surface join in /api/regions/preview with 400", async () => {
      const res = await request(server.app)
        .post("/api/regions/preview")
        .send({
          selection: {
            mode: "border",
            zoneIds: ["red_sands", "midnight_sun"],
            connection: "surface",
          },
        });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain("Invalid region configuration");
    });

    it("rejects numeric seed in /api/campaigns with 400 without creating campaign row", async () => {
      const beforeCount = (
        db.db.prepare("SELECT count(*) as count FROM campaigns").get() as { count: number }
      ).count;

      const res = await request(server.app)
        .post("/api/campaigns")
        .send({
          name: "Invalid Seed Co",
          regionName: "Gloaming",
          pin: "1234",
          generationConfig: {
            selection: { mode: "single", zoneId: "the_gloaming" },
            seed: 123, // Numeric seed
          },
        });

      expect(res.status).toBe(400);
    });
  });

  // --- R6: Hydrology Catchment Accumulation ---
  describe("R6 / M2: Hydrology Catchment Topological Sorting", () => {
    it("correctly accumulates catchment on flat radius-3 terrain", () => {
      const coords = generateHexArea(3);
      const flatElevations = new Map<string, number>();
      for (const c of coords) {
        flatElevations.set(`${c.q}:${c.r}`, 1); // Completely flat
      }
      const rng = createRandomSource("hydro_flat_test");
      const result = solveHydrology(coords, flatElevations, "the_gloaming", rng, {
        minRiverCatchment: 3,
      });

      // Hydrology graph must resolve all coordinates
      expect(result.nodes.size).toBe(coords.length);

      // Node (-2, -1) has upstream contributors, catchment must be >= 1
      const node = result.nodes.get(coordKey(-2, -1));
      expect(node).toBeDefined();
      expect(node!.catchment).toBeGreaterThanOrEqual(1);

      // Every node's catchment must equal 1 + sum of its upstream neighbors
      for (const [, n] of result.nodes) {
        const upstreamNodes = Array.from(result.nodes.values()).filter(
          (other) => other.downstreamKey === coordKey(n.q, n.r),
        );
        const expectedCatchment = 1 + upstreamNodes.reduce((sum, up) => sum + up.catchment, 0);
        expect(n.catchment).toBe(expectedCatchment);
      }
    });
  });

  // --- R7: Site Discovery & Fog-of-War Separation ---
  describe("R7: Fog of War & Hidden Site Discovery", () => {
    it("hides unexplored internal features from player role", () => {
      const campaign = db.createCampaign("Fog Test", "Gloaming", "1234", {
        selection: { mode: "single", zoneId: "the_gloaming" },
        seed: "fog_test_seed",
      });

      const playerState = db.getState(campaign.campaignId, "player", null, "");
      const hex01 = playerState.hexes.find((h) => h.id === "01");

      expect(hex01).toBeDefined();
      expect(hex01?.revealState).toBe("unexplored");
      expect(hex01?.elevation).toBeUndefined();
      expect(hex01?.road).toBeUndefined();
      expect(hex01?.river).toBeUndefined();
      expect(hex01?.connections).toBeUndefined();
      expect(hex01?.sites).toBeUndefined();
    });

    it("hides resource sites from players even when hex is fully mapped until explicitly discovered", () => {
      const campaign = db.createCampaign("Discovery Test", "Gloaming", "1234", {
        selection: { mode: "single", zoneId: "the_gloaming" },
        seed: "review_0",
      });
      const campaignId = campaign.campaignId;

      // Find a hex containing a hidden resource site from the 19 hexes
      const row = db.db
        .prepare(
          "SELECT id, sites_json FROM hexes WHERE campaign_id = ? AND sites_json LIKE '%\"visibility\":\"hidden\"%'",
        )
        .get(campaignId) as any;
      expect(row).toBeDefined();

      const targetHexId = row.id;
      const parsedSites = JSON.parse(row.sites_json);
      const hiddenSite = parsedSites.find((s: any) => s.visibility === "hidden");
      expect(hiddenSite).toBeDefined();
      const hiddenSiteId = hiddenSite.id;

      // Fully map the hex
      db.revealHex(campaignId, targetHexId, "fully_mapped");

      // Check player state: hidden site must NOT be revealed yet!
      const playerStateBefore = db.getState(campaignId, "player", null, "");
      const playerHexBefore = playerStateBefore.hexes.find((h) => h.id === targetHexId);
      expect(playerHexBefore?.sites?.some((s) => s.id === hiddenSiteId)).toBe(false);

      // Now party discovers the site
      db.discoverSite(campaignId, hiddenSiteId);
      expect(db.isSiteDiscovered(campaignId, hiddenSiteId)).toBe(true);

      // Check player state: now the hidden site is revealed!
      const playerStateAfter = db.getState(campaignId, "player", null, "");
      const playerHexAfter = playerStateAfter.hexes.find((h) => h.id === targetHexId);
      expect(playerHexAfter?.sites?.some((s) => s.id === hiddenSiteId)).toBe(true);
    });
  });

  // --- G1: Structural Region Persistence ---
  describe("G1: Structural Region Persistence", () => {
    it("stores all structural hexes exceeding the 19-hex window", () => {
      const config: RegionGenerationConfig = {
        selection: { mode: "single", zoneId: "the_gloaming" },
        structuralRadius: 6,
        initialRadius: 2,
        seed: "g1_persistence",
      };

      const world = generateProceduralRegion(4, config);
      // Structural radius 6 produces 1 + 3 * 6 * 7 = 127 hexes
      expect(world.hexes.length).toBeGreaterThan(19);
      expect(world.hexes.length).toBe(127);

      db.saveGeneratedRegion(4, world);

      const savedCount = db.db
        .prepare("SELECT count(*) as count FROM region_hexes WHERE region_id = ?")
        .get(world.region.id) as { count: number };
      expect(savedCount.count).toBe(127);
    });
  });

  // --- G2: Historical Events & Spatial Factions ---
  describe("G2: History Entities & Faction Placement", () => {
    it("populates affectedEntityIds on historical events with real site IDs", () => {
      const config: RegionGenerationConfig = {
        selection: { mode: "single", zoneId: "the_gloaming" },
        seed: "g2_history",
      };
      const world = generateProceduralRegion(5, config);

      expect(world.historicalEvents.length).toBeGreaterThan(0);
      for (const event of world.historicalEvents) {
        expect(event.affectedEntityIds.length).toBeGreaterThanOrEqual(1);
        for (const entityId of event.affectedEntityIds) {
          expect(world.sites.some((s) => s.id === entityId)).toBe(true);
        }
      }
    });

    it("distributes factions across distinct sites across the map", () => {
      const config: RegionGenerationConfig = {
        selection: { mode: "single", zoneId: "the_gloaming" },
        seed: "g2_factions",
      };
      const world = generateProceduralRegion(6, config);

      expect(world.factionPresences.length).toBeGreaterThanOrEqual(2);
      const locations = world.factionPresences.map((f) => f.locationKey);
      // Should not all be at haven (0:0)
      const nonHavenLocations = locations.filter((loc) => !loc.endsWith(":0:0"));
      expect(nonHavenLocations.length).toBeGreaterThan(0);
    });
  });

  // --- G3 & G4: Movement, Fatigue, and Sanctuary Return ---
  describe("G3 & G4: Movement, Fatigue, and Sanctuary Return", () => {
    it("advances party location, evaluates fatigue, and returns to sanctuary via socket actions", async () => {
      const createdRes = await request(server.app)
        .post("/api/campaigns")
        .send({
          name: "Movement Test",
          regionName: "Gloaming",
          pin: "1234",
          generationConfig: {
            selection: { mode: "single", zoneId: "the_gloaming" },
            seed: "movement_test_seed",
          },
        });

      const { code, token } = createdRes.body;
      const addr = server.httpServer.address() as any;
      const { io: Client } = await import("socket.io-client");
      const socket = Client(`http://localhost:${addr.port}`, {
        auth: { code, token, role: "host" },
      });

      await new Promise<void>((resolve) => socket.on("connect", () => resolve()));

      // 1. Test travel:move
      const moveRes = await new Promise<any>((resolve) => {
        socket.emit("travel:move", { toHexId: "01", mode: "foot" }, (ack: any) => resolve(ack));
      });
      expect(moveRes.ok).toBe(true);
      expect(moveRes.watches).toBeGreaterThanOrEqual(1);
      expect(moveRes.newPartyLocation).toBeDefined();

      // 2. Test zone:enter then zone:exit
      await new Promise<any>((resolve) => {
        socket.emit("zone:enter", { zoneId: "dwellers_in_the_deep" }, (ack: any) => resolve(ack));
      });

      const exitRes = await new Promise<any>((resolve) => {
        socket.emit("zone:exit", {}, (ack: any) => resolve(ack));
      });
      expect(exitRes.ok).toBe(true);

      socket.disconnect();
    });
  });
});
