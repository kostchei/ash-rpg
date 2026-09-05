import type { PublicHex } from "../shared/types";
import tiles from "./hexcrawl-tiles.json";

// Pointy-top axial geometry: the same radius defines centers AND corners.
export const HEX_RADIUS = 76;
export const HEX_WIDTH = Math.sqrt(3) * HEX_RADIUS;
export const HEX_POINTS = [
  [0, -HEX_RADIUS], [HEX_WIDTH / 2, -HEX_RADIUS / 2],
  [HEX_WIDTH / 2, HEX_RADIUS / 2], [0, HEX_RADIUS],
  [-HEX_WIDTH / 2, HEX_RADIUS / 2], [-HEX_WIDTH / 2, -HEX_RADIUS / 2],
] as const;
export const HEX_POLYGON = HEX_POINTS.map((p) => p.join(",")).join(" ");

export function hexCenter(hex: { q: number; r: number }) {
  return { x: HEX_WIDTH * (hex.q + hex.r / 2), y: HEX_RADIUS * 1.5 * hex.r };
}

export function tileUrl(folder: string, name: string) {
  return `/hexcrawl-tiles/${encodeURIComponent(folder)}/${name}.png`;
}

function variant(hex: PublicHex, choices: string[]) {
  const key = `${hex.canonicalKey ?? `${hex.q},${hex.r}`}:${hex.name ?? ""}`;
  let hash = 2166136261;
  for (const char of key) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return choices[(hash >>> 0) % choices.length];
}

export function terrainTile(hex: PublicHex): string | null {
  if (hex.revealState === "unexplored" || !hex.biome) return null;
  const terrain = (hex.biome ?? "").toLowerCase();
  let group: keyof typeof tiles.terrain = "grass";
  if (/dead|arid|waste|blight|ash|barren/.test(terrain)) group = "deadlands";
  else if (/desert|dune|wadi|salt|canyon/.test(terrain)) group = "desert";
  else if (/mountain|peak|crag|ridge|glacier|karst/.test(terrain)) group = "mountains";
  else if (/sea|ocean|coast|harbor|beach|fjord|sound/.test(terrain)) group = "sea";
  else if (/marsh|swamp|wetland|fen|mire|bog|reed|delta|quagmire/.test(terrain)) group = "wetlands";
  else if (/field|farm|cultivat|pasture|orchard/.test(terrain)) group = "fields";
  else if (/forest|wood|copse|bramble|jungle|canopy|hollow/.test(terrain)) group = "forest";
  else if (/hill|scree|upland/.test(terrain)) group = "hills";
  return tileUrl(group, variant(hex, tiles.terrain[group]));
}

export function pointOfInterestTile(hex: PublicHex): string | null {
  if (hex.revealState === "unexplored") return null;
  const site = `${hex.sites?.map((s) => `${s.kind} ${s.name}`).join(" ") ?? ""} ${hex.name ?? ""}`.toLowerCase();
  const kinds = new Set(hex.sites?.map((s) => s.kind));
  let choices: string[] | null = null;
  if (hex.id === "00" || /haven|sanctuary/.test(site)) choices = ["s01"];
  else if (kinds.has("fort")) choices = ["s02", "s04", "s05"];
  else if (kinds.has("settlement") || kinds.has("district")) choices = ["s03", "s08", "s10", "s11", "s12"];
  else if (kinds.has("shrine")) choices = ["s07", "s09", "s15"];
  else if (/tower/.test(site)) choices = ["s18"];
  else if (/bridge|gate|arch/.test(site)) choices = ["s06"];
  else if (/fort|keep|castle|redoubt/.test(site)) choices = ["s02", "s04", "s05"];
  else if (/ruin|entrance|cave|pit|chasm|grotto|karst/.test(site)) choices = ["s13", "s14", "s17"];
  else if (/shrine|temple|abbey|church|waystone/.test(site)) choices = ["s07", "s09", "s15"];
  else if (/settlement|village|district|hamlet|town|camp|woodcutter/.test(site)) choices = ["s03", "s08", "s10", "s11", "s12"];
  return choices ? tileUrl("points of interest", variant(hex, choices)) : null;
}

export const HEX_DIRECTIONS = [
  { q: 1, r: 0 }, { q: 0, r: 1 }, { q: -1, r: 1 },
  { q: -1, r: 0 }, { q: 0, r: -1 }, { q: 1, r: -1 },
];
export const isWaterRoute = (kind: string) => /river|canal|ferry|sea_lane|voyage/.test(kind);

export function routeArtwork(hex: PublicHex, routes: ReturnType<typeof mapConnections>) {
  const result: Array<{ url?: string; edge?: number; water: boolean }> = [];
  for (const water of [false, true]) {
    const edges = new Set<number>();
    for (const route of routes) {
      if (isWaterRoute(route.kind) !== water) continue;
      const other = route.from.id === hex.id ? route.to : route.to.id === hex.id ? route.from : null;
      if (!other) continue;
      const edge = HEX_DIRECTIONS.findIndex((d) => d.q === other.q - hex.q && d.r === other.r - hex.r);
      if (edge !== -1) edges.add(edge);
    }
    const directions = [...edges].sort((a, b) => a - b);
    if (directions.length === 1) result.push({ edge: directions[0], water });
    for (let i = 1; i < directions.length; i++) {
      const key = `${directions[0]},${directions[i]}`;
      const catalog: Record<string, string> = water ? tiles.rivers : tiles.paths;
      result.push({ url: tileUrl(water ? "rivers" : "paths", catalog[key]), water });
    }
  }
  return result;
}

export function mapLabel(hex: PublicHex) {
  return hex.revealState === "unexplored"
    ? hex.road || hex.river || "Uncharted"
    : hex.name || hex.biome || "Unnamed country";
}

export function wrapMapLabel(label: string, maxLength = 19): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of label.split(/\s+/)) {
    if (line && `${line} ${word}`.length > maxLength) {
      lines.push(line);
      line = word;
    } else line = line ? `${line} ${word}` : word;
  }
  if (line) lines.push(line);
  return lines.slice(0, 2).map((text, index) =>
    text.length > maxLength || (index === 1 && lines.length > 2)
      ? `${text.slice(0, maxLength - 1).trimEnd()}…` : text,
  );
}

export function mapConnections(hexes: PublicHex[]) {
  const byId = new Map(hexes.map((hex) => [hex.id, hex]));
  const seen = new Set<string>();
  const routes: Array<{ id: string; from: PublicHex; to: PublicHex; kind: string; name: string }> = [];
  for (const hex of hexes) {
    for (const connection of hex.connections ?? []) {
      const from = byId.get(connection.fromId), to = byId.get(connection.toId);
      const key = [connection.fromId, connection.toId].sort().join(":") + `:${connection.kind}`;
      if (from && to && !seen.has(key)) {
        seen.add(key);
        routes.push({ ...connection, id: key, from, to });
      }
    }
  }
  // Legacy campaigns expose named roads/rivers on hexes instead of connections.
  // Join only neighboring cells with the same known route, never invented roads.
  if (!hexes.some((hex) => hex.connections?.length)) {
    for (const [i, from] of hexes.entries()) {
      for (const to of hexes.slice(i + 1)) {
        const dq = from.q - to.q, dr = from.r - to.r;
        if ((Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2 !== 1) continue;
        for (const kind of ["road", "river"] as const) {
          if (from[kind] && from[kind] === to[kind]) {
            routes.push({ id: `${from.id}:${to.id}:${kind}`, from, to, kind, name: from[kind]! });
          }
        }
      }
    }
  }
  return routes;
}
