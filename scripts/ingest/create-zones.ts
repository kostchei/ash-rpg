import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import type { ZoneManifest } from "../../src/shared/types.js";
import { ZONE_PROFILES } from "../../src/shared/zone-profiles.js";

export const ZONES: Array<{ manifest: ZoneManifest; lore: string }> = Object.values(ZONE_PROFILES).map((profile) => {
  const allWeather = Object.values(profile.weatherTable).flat();
  // Pick 4 representative weather strings
  const weatherTable = [
    profile.weatherTable.spring[0],
    profile.weatherTable.summer[1],
    profile.weatherTable.autumn[0],
    profile.weatherTable.winter[1],
  ];

  const biomes = profile.terrainPriors.flatMap((tp) => tp.biomes.slice(0, 2));

  return {
    manifest: {
      id: profile.id,
      name: profile.name,
      theme: profile.theme,
      biomePalette: biomes,
      hazardTable: profile.hazardTable,
      weatherTable,
      wanderingMonsterTable: profile.wanderingMonsterKeys,
      factions: profile.factions.map((f) => ({
        name: f.name,
        disposition: f.disposition,
        notes: f.agenda,
      })),
      uniqueFloraFauna: [
        profile.settlementTypes[0]?.waterSource || "Natural springs",
        profile.settlementTypes[0]?.foodProvenance || "Local farming & foraging",
        profile.havenDefaults.landmark.split(",")[0]?.trim() || "Ancient landmarks",
      ],
      entryConditions: `Expedition access point into ${profile.name}.`,
      exitConditions: `Waymarked return route to ${profile.havenDefaults.name}.`,
    },
    lore: `# ${profile.name} (${profile.sourceVolume})

${profile.theme}
Source reference: ${profile.sourcePageRef} (${profile.provenance})

## Landform & Settlement
${profile.settlementTypes.map((s) => `### ${s.name}\n- **Water Source:** ${s.waterSource}\n- **Food Support:** ${s.foodProvenance}\n- **Purpose:** ${s.reason}\n- **Description:** ${s.description}`).join("\n\n")}

## Historical Layers
${profile.historicalLayers.map((h, i) => `${i + 1}. **${h.title}**: ${h.summary}`).join("\n")}
`,
  };
});

export function runZoneGeneration() {
  const zonesDir = resolve("zones");
  mkdirSync(zonesDir, { recursive: true });

  for (const { manifest, lore } of ZONES) {
    const dir = resolve(zonesDir, manifest.id);
    mkdirSync(dir, { recursive: true });
    writeFileSync(resolve(dir, "manifest.json"), JSON.stringify(manifest, null, 2), "utf-8");
    writeFileSync(resolve(dir, "lore.md"), lore, "utf-8");
    console.log(`Generated zone: ${manifest.name} -> zones/${manifest.id}`);
  }
}

if (process.argv[1]?.endsWith("create-zones.ts")) {
  runZoneGeneration();
}
