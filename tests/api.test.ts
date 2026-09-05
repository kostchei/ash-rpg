import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createAshServer, type AshServerOptions } from "../src/server/app.js";

describe("campaign HTTP API", () => {
  let server: Awaited<ReturnType<typeof createAshServer>>;
  beforeAll(async () => {
    server = await createAshServer({
      dbPath: ":memory:",
      frontend: false,
      port: 0,
    } satisfies AshServerOptions);
  });
  afterAll(() => {
    server.io.close();
    server.db.close();
  });

  it("reports service health", async () => {
    const response = await request(server.app).get("/api/health");
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ ok: true });
  });

  it("creates, joins, and reopens a campaign", async () => {
    const created = await request(server.app)
      .post("/api/campaigns")
      .send({
        name: "Ash Company",
        regionName: "Western Reaches",
        pin: "2468",
      });
    expect(created.status).toBe(201);
    expect(created.body.code).toMatch(/^[A-Z2-9]{6}$/);
    expect(created.body.token).toBeTruthy();
    const joined = await request(server.app)
      .post("/api/campaigns/join")
      .send({ code: created.body.code });
    expect(joined.status).toBe(200);
    expect(joined.body.role).toBe("player");
    const host = await request(server.app)
      .post("/api/campaigns/host")
      .send({ code: created.body.code, pin: "2468" });
    expect(host.status).toBe(200);
    expect(host.body.token).toBe(created.body.token);
  });

  it("returns content catalogs including 200+ monsters and 6 canonical zones", async () => {
    const response = await request(server.app).get("/api/content");
    expect(response.status).toBe(200);
    expect(response.body.ancestries.length).toBeGreaterThan(0);
    expect(response.body.classes.length).toBeGreaterThan(0);
    expect(response.body.monsters.length).toBeGreaterThan(200);
    expect(response.body.zones.length).toBe(6);
    expect(response.body.zoneProfiles.length).toBe(6);
    expect(response.body.borderPairings.length).toBe(15);

    // Verify monster shape
    const sample = response.body.monsters[0];
    expect(sample.key).toBeDefined();
    expect(sample.name).toBeDefined();
  });

  it("previews a procedural region and creates campaign with generationConfig", async () => {
    // 1. Preview endpoint
    const previewRes = await request(server.app)
      .post("/api/regions/preview")
      .send({
        selection: {
          mode: "border",
          zoneIds: ["the_gloaming", "red_sands"],
          connection: "surface",
        },
        seed: "api_test_preview_seed",
      });
    expect(previewRes.status).toBe(200);
    expect(previewRes.body.region).toBeDefined();
    expect(previewRes.body.initial19PublicHexes).toHaveLength(19);

    // 2. Create campaign with generationConfig
    const created = await request(server.app)
      .post("/api/campaigns")
      .send({
        name: "Gloaming March",
        regionName: "Pass of the Red Sun",
        pin: "5678",
        generationConfig: {
          selection: {
            mode: "border",
            zoneIds: ["the_gloaming", "red_sands"],
            connection: "surface",
          },
          seed: "api_campaign_seed",
        },
      });
    expect(created.status).toBe(201);
    expect(created.body.code).toBeTruthy();
  });

  it("rejects invalid campaign input and host credentials", async () => {
    expect(
      (
        await request(server.app)
          .post("/api/campaigns")
          .send({ name: "x", regionName: "y", pin: "1" })
      ).status,
    ).toBe(400);
    expect(
      (
        await request(server.app)
          .post("/api/campaigns/host")
          .send({ code: "ABCDEF", pin: "9999" })
      ).status,
    ).toBe(401);
  });
});
