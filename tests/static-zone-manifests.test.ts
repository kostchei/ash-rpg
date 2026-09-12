import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { getStaticZoneManifest, listStaticZones, STATIC_ZONE_MANIFESTS } from "../src/shared/zone-manifests.js";
import { AshDatabase } from "../src/server/database.js";

/**
 * Zone manifests left the wire in Phase 1: the client imports them as build-time
 * constants and the server sends only the active zone id. That only holds while
 * the constants are byte-identical to the manifests the server loads at runtime.
 */
describe("static zone manifests", () => {
  const zoneIds = readdirSync("zones");

  it("covers every zone directory and nothing else", () => {
    expect(Object.keys(STATIC_ZONE_MANIFESTS).sort()).toEqual([...zoneIds].sort());
  });

  it.each(zoneIds)("matches zones/%s/manifest.json exactly", (zoneId) => {
    const onDisk = JSON.parse(readFileSync(`zones/${zoneId}/manifest.json`, "utf8"));
    expect(getStaticZoneManifest(zoneId)).toEqual(onDisk);
  });

  it("summarises zones the same way the server does", () => {
    const db = new AshDatabase(":memory:");
    const sortById = <T extends { id: string }>(list: T[]) =>
      [...list].sort((a, b) => a.id.localeCompare(b.id));
    expect(sortById(listStaticZones())).toEqual(sortById(db.listZones()));
  });
});
