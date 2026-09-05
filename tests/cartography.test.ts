import { describe, expect, it } from "vitest";
import { HEX_DIRECTIONS, HEX_POINTS, hexCenter, mapConnections, mapLabel, pointOfInterestTile, routeArtwork, terrainTile } from "../src/client/hex-cartography";
import type { PublicHex } from "../src/shared/types";
import catalog from "../src/client/hexcrawl-tiles.json";

const hex = (id: string, q = 0, r = 0, rest: Partial<PublicHex> = {}): PublicHex => ({ id, q, r, ring: 1, revealState: "explored", name: "Wild Country", biome: "forest", ...rest });

describe("frontier cartography", () => {
  it("shares exactly two corners with each of the six neighboring hexes", () => {
    for (const direction of HEX_DIRECTIONS) {
      const center = hexCenter(direction);
      const shared = HEX_POINTS.filter(([x, y]) => HEX_POINTS.some(([nx, ny]) => Math.hypot(x - nx - center.x, y - ny - center.y) < 1e-9));
      expect(shared).toHaveLength(2);
    }
  });

  it("has artwork for every pair of connected edges without adding extra exits", () => {
    const center = hex("00");
    for (const kind of ["road", "river"]) {
      for (let a = 0; a < 6; a++) for (let b = a + 1; b < 6; b++) {
        const routes = [a, b].map((edge) => ({ id: `${edge}`, from: center, to: hex(`${edge + 1}`, HEX_DIRECTIONS[edge].q, HEX_DIRECTIONS[edge].r), name: "Known route", kind }));
        const art = routeArtwork(center, routes);
        expect(art).toHaveLength(1);
        const group = kind === "river" ? "rivers" : "paths";
        expect(art[0].url).toBe(`/hexcrawl-tiles/${group}/${(catalog[group] as Record<string, string>)[`${a},${b}`]}.png`);
      }
    }
  });

  it("keeps a single route endpoint as one endpoint", () => {
    const center = hex("00");
    expect(routeArtwork(center, [{ id: "one", from: center, to: hex("01", 1, 0), name: "Track", kind: "trail" }])).toEqual([{ edge: 0, water: false }]);
  });

  it("only connects neighboring legacy cells with a matching known route", () => {
    const cells = [hex("00", 0, 0, { road: "Old Road" }), hex("01", 1, 0, { road: "Old Road" }), hex("02", 0, 1, { road: "Other Road" }), hex("03", 3, 0, { road: "Old Road" })];
    expect(mapConnections(cells).map((route) => route.id)).toEqual(["00:01:road"]);
    expect(mapConnections([hex("00"), hex("01", 1)])).toEqual([]);
  });

  it("conceals terrain, sites, and names in unexplored hexes", () => {
    const unknown = hex("01", 0, 0, { revealState: "unexplored", name: "Secret Keep", biome: "mountains" });
    expect(terrainTile(unknown)).toBeNull();
    expect(pointOfInterestTile(unknown)).toBeNull();
    expect(mapLabel(unknown)).toBe("Uncharted");
    expect(mapLabel({ ...unknown, road: "Old Road" })).toBe("Old Road");
  });

  it("chooses stable purchased artwork for all terrain families", () => {
    for (const biome of ["forest", "desert", "deadlands", "grass", "fields", "hills", "wetlands", "mountains", "sea"]) {
      const cell = hex("01", 1, -1, { biome });
      expect(terrainTile(cell)).toContain(`/hexcrawl-tiles/${biome}/`);
      expect(terrainTile({ ...cell })).toBe(terrainTile(cell));
    }
  });
});
