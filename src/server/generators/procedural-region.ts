import {
  axialDistance,
  coordKey,
  generateHexArea,
  getAxialNeighbors,
  SimplexNoise2D,
  type HexCoord,
} from "./noise.js";
import {
  createRandomSource,
  deriveStream,
  deterministicPickOne,
  deterministicWeightedPick,
  hashString,
} from "./prng.js";
import { solveHydrology } from "./hydrology.js";
import {
  BORDER_PAIRINGS,
  getBorderPairing,
  getZoneProfile,
  ZONE_PROFILES,
  type ZoneGenerationProfile,
} from "../../shared/zone-profiles.js";
import type {
  ConnectionEntity,
  CursedZoneId,
  FactionPresence,
  HistoricalEvent,
  PublicConnectionSummary,
  PublicHex,
  PublicSiteSummary,
  RegionEntity,
  RegionGenerationConfig,
  RegionHex,
  RegionLayer,
  RegionSelection,
  RevealState,
  RumorRecord,
  SiteEntity,
} from "../../shared/types.js";
import { HEX_GRID } from "./hex-map.js";

export const GENERATOR_VERSION = "2.0.0";
export const CONTENT_VERSION = "2026.09";
export const RULES_VERSION = "ash_4watch_v1";

export interface GeneratedRegionWorld {
  region: RegionEntity;
  layers: RegionLayer[];
  hexes: RegionHex[];
  sites: SiteEntity[];
  connections: ConnectionEntity[];
  historicalEvents: HistoricalEvent[];
  factionPresences: FactionPresence[];
  rumors: RumorRecord[];
  initial19PublicHexes: PublicHex[];
  validationReport: {
    valid: boolean;
    attempt: number;
    warnings: string[];
    zoneCounts: Record<string, number>;
  };
}

const ROAD_PREFIXES: Record<string, string[]> = {
  the_gloaming: ["The Pilgrim's Trace", "Blackwood Causeway", "St. Ydris Way", "Barrow Post-Road", "The Lantern Track"],
  red_sands: ["The Spice Highway", "Alkesh Caravan Route", "The Salt Way", "Sunstone Trace", "Canyon Post-Road"],
  midnight_sun: ["The Coastal Bridleway", "Jarl's Highway", "Whalebone Path", "Fjord Shore Road", "Runestone Trace"],
  river_of_night: ["The Royal Aisle", "Basalt Causeway", "Serpent Trail", "Portage Trace", "Obsidian Highway"],
  dwellers_in_the_deep: ["The Silver Tramway", "Delver's Siphon Walk", "Leng Causeway", "Chasm High-Cable", "Grotto Trace"],
  city_of_masks: ["The Ducal Highway", "Canal Embankment Road", "The Silk Way", "High Harbor Post-Road", "Western Coast Trace"],
  oakhaven_borderlands: ["The King's Highroad", "The Old Coast Road", "The Miner's Trace", "The Lowland Way"],
};

export function generateProceduralRegion(
  campaignId: number,
  config: RegionGenerationConfig,
): GeneratedRegionWorld {
  const seedString = config.seed?.trim() || Math.random().toString(36).substring(2, 10);
  const structuralRadius = config.structuralRadius ?? 6;
  const initialRadius = config.initialRadius ?? 2;
  const maxAttempts = 32;

  let lastCandidate: GeneratedRegionWorld | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const attemptSeed = `${seedString}:attempt_${attempt}`;
    const candidate = buildRegionAttempt(
      campaignId,
      config,
      seedString,
      attemptSeed,
      attempt,
      structuralRadius,
      initialRadius,
    );

    if (candidate.validationReport.valid) {
      return candidate;
    }
    lastCandidate = candidate;
  }

  // If all attempts failed strict validation, return last candidate with validation warnings
  return lastCandidate!;
}

function buildRegionAttempt(
  campaignId: number,
  config: RegionGenerationConfig,
  baseSeed: string,
  attemptSeed: string,
  attempt: number,
  structuralRadius: number,
  initialRadius: number,
): GeneratedRegionWorld {
  const geoRng = deriveStream(attemptSeed, "geography");
  const settleRng = deriveStream(attemptSeed, "settlements");
  const histRng = deriveStream(attemptSeed, "history");
  const factionRng = deriveStream(attemptSeed, "factions");
  const siteRng = deriveStream(attemptSeed, "sites");
  const rumorRng = deriveStream(attemptSeed, "rumors");

  const selection = config.selection;
  const isBorder = selection.mode === "border";
  const primaryZoneId: CursedZoneId = isBorder ? selection.zoneIds[0] : selection.zoneId;
  const secondaryZoneId: CursedZoneId | undefined = isBorder ? selection.zoneIds[1] : undefined;
  const borderPairing = isBorder && secondaryZoneId ? getBorderPairing(primaryZoneId, secondaryZoneId) : undefined;
  const connectionMode = isBorder ? selection.connection : "surface";

  const primaryProfile = getZoneProfile(primaryZoneId);
  const secondaryProfile = secondaryZoneId ? getZoneProfile(secondaryZoneId) : primaryProfile;

  // 1. Generate structural axial grid
  const rawCoords = generateHexArea(structuralRadius);
  const noiseElev = new SimplexNoise2D(`${attemptSeed}:elev`);
  const noiseMoisture = new SimplexNoise2D(`${attemptSeed}:moist`);
  const noiseBorder = new SimplexNoise2D(`${attemptSeed}:border`);

  // Compute elevation, moisture, and zone attribution for each hex
  interface HexData {
    q: number;
    r: number;
    key: string;
    elevVal: number;
    elevation: number; // 0..3
    moisture: number;
    zoneId: CursedZoneId;
    isTransition: boolean;
  }

  const hexDataMap = new Map<string, HexData>();

  for (const c of rawCoords) {
    const key = coordKey(c.q, c.r);
    // Scale coordinates into noise domain
    const nx = c.q * 0.25;
    const ny = c.r * 0.25;
    const elevVal = noiseElev.fbm(nx, ny, 3, 0.5, 2.0);
    const moistVal = noiseMoisture.fbm(nx + 10, ny + 10, 3, 0.5, 2.0);

    // Discrete elevation: 0=low/water, 1=lowland, 2=midland, 3=highland
    let elevation = 1;
    if (elevVal < 0.25) elevation = 0;
    else if (elevVal < 0.55) elevation = 1;
    else if (elevVal < 0.8) elevation = 2;
    else elevation = 3;

    // Zone attribution
    let zoneId = primaryZoneId;
    let isTransition = false;

    if (isBorder && secondaryZoneId) {
      if (connectionMode === "surface") {
        // Dividing line roughly along q + r axis perturbed by border noise
        const borderVal = (c.q + c.r * 0.5) / structuralRadius + (noiseBorder.sample(nx, ny) * 0.35);
        if (borderVal < -0.15) {
          zoneId = primaryZoneId;
        } else if (borderVal > 0.15) {
          zoneId = secondaryZoneId;
        } else {
          // Transition corridor
          zoneId = borderVal <= 0 ? primaryZoneId : secondaryZoneId;
          isTransition = true;
        }
      } else {
        // Vertical, urban inset, distant: surface cells are primary zone
        zoneId = primaryZoneId;
      }
    }

    hexDataMap.set(key, {
      q: c.q,
      r: c.r,
      key,
      elevVal,
      elevation,
      moisture: moistVal,
      zoneId,
      isTransition,
    });
  }

  // 2. Solve Hydrology
  const elevationsMap = new Map<string, number>();
  for (const [k, d] of hexDataMap) {
    elevationsMap.set(k, d.elevation);
  }
  const hydroResult = solveHydrology(rawCoords, elevationsMap, primaryZoneId, geoRng, {
    minRiverCatchment: primaryZoneId === "red_sands" ? 5 : 3,
  });

  // 3. Haven Selection
  // The haven should be a viable settlement site in radius 2 from origin.
  // In border mode, haven should ideally sit in or adjacent to the transition zone so it can reach both zones.
  const havenCandidates = rawCoords.filter((c) => {
    const distFromCenter = axialDistance(c, { q: 0, r: 0 });
    if (distFromCenter > 2) return false;
    const data = hexDataMap.get(coordKey(c.q, c.r))!;
    if (data.elevation === 3 && primaryZoneId !== "midnight_sun") return false; // Not on extreme peaks
    if (data.elevation === 0 && primaryZoneId !== "midnight_sun" && primaryZoneId !== "city_of_masks") return false; // Not submerged
    return true;
  });

  // Score candidates
  let bestHavenCoord: HexCoord = havenCandidates[0] ?? { q: 0, r: 0 };
  let bestHavenScore = -999;

  for (const c of havenCandidates) {
    const key = coordKey(c.q, c.r);
    const data = hexDataMap.get(key)!;
    const hydroNode = hydroResult.nodes.get(key);
    let score = 10;

    if (hydroNode?.isRiver || hydroNode?.isStream) score += 15; // Water availability
    if (data.elevation === 1) score += 10; // Valley/basin preferred
    if (isBorder) {
      // Check if candidate neighbors both zones
      const neighbors = getAxialNeighbors(c);
      const neighborZones = new Set(neighbors.map((n) => hexDataMap.get(coordKey(n.q, n.r))?.zoneId).filter(Boolean));
      if (neighborZones.size >= 2) score += 25;
      if (data.isTransition) score += 15;
    }

    if (score > bestHavenScore) {
      bestHavenScore = score;
      bestHavenCoord = c;
    }
  }

  // Translate all coordinates so bestHavenCoord becomes (q=0, r=0)
  const shiftQ = bestHavenCoord.q;
  const shiftR = bestHavenCoord.r;

  const translatedHexData = new Map<string, HexData>();
  for (const [, d] of hexDataMap) {
    const tq = d.q - shiftQ;
    const tr = d.r - shiftR;
    const tKey = coordKey(tq, tr);
    translatedHexData.set(tKey, {
      ...d,
      q: tq,
      r: tr,
      key: tKey,
    });
  }

  // Rebuild grid relative to haven (0,0)
  const regionId = `reg_${campaignId}_${baseSeed.slice(0, 8)}`;
  const layerId = "surface";

  // 4. Generate the 19-cell local window matching HEX_GRID
  const hexGridLookup = new Map<string, (typeof HEX_GRID)[number]>();
  for (const hg of HEX_GRID) {
    hexGridLookup.set(coordKey(hg.q, hg.r), hg);
  }

  // 5. Historical Layers Generation (2-4 layers)
  const numHistoricalLayers = 2 + histRng(3); // 2 to 4 layers
  const availableHistoricalMotifs = [
    ...primaryProfile.historicalLayers,
    ...(isBorder && secondaryProfile ? secondaryProfile.historicalLayers : []),
  ];
  const selectedHistory = availableHistoricalMotifs.slice(0, numHistoricalLayers);

  const historicalEvents: HistoricalEvent[] = selectedHistory.map((motif, index) => ({
    id: `hist_${index + 1}_${regionId}`,
    regionId,
    sequence: index + 1,
    name: motif.title,
    summary: motif.summary,
    affectedEntityIds: [],
    consequences: [...motif.consequences],
  }));

  // 6. Factions Generation
  const activeFactions: FactionPresence[] = [
    ...primaryProfile.factions.map((f, i) => ({
      id: `fac_${f.id}_${regionId}`,
      regionId,
      factionId: f.id,
      name: f.name,
      disposition: f.disposition,
      locationKey: `${regionId}:${layerId}:0:0`, // assigned later to sites
      assetOrRole: f.asset,
      strengthOrControl: i === 0 ? "Dominant" : "Contested",
      agenda: f.agenda,
    })),
  ];
  if (isBorder && secondaryProfile) {
    for (const f of secondaryProfile.factions.slice(0, 2)) {
      activeFactions.push({
        id: `fac_${f.id}_${regionId}`,
        regionId,
        factionId: f.id,
        name: f.name,
        disposition: f.disposition,
        locationKey: `${regionId}:${layerId}:0:0`,
        assetOrRole: f.asset,
        strengthOrControl: "Contested",
        agenda: f.agenda,
      });
    }
  }

  // 7. Settlements & Sites Generation
  const sites: SiteEntity[] = [];
  const connections: ConnectionEntity[] = [];

  // Haven site at 00
  const havenProfile = primaryProfile.havenDefaults;
  const havenSite: SiteEntity = {
    id: `site_haven_${regionId}`,
    regionId,
    canonicalKey: `${regionId}:${layerId}:0:0`,
    kind: "haven",
    name: havenProfile.name,
    currentState: "Active & Fortified Refuge",
    ownerFactionId: activeFactions[0]?.id,
    supportDependencies: {
      waterSource: primaryProfile.settlementTypes[0]?.waterSource || "Protected natural spring",
      foodProvenance: primaryProfile.settlementTypes[0]?.foodProvenance || "Stockpiled grain and local foraging",
      reasonForLocation: primaryProfile.settlementTypes[0]?.reason || "Centuries-old defensible crossroads sanctuary",
      vulnerability: "Dependent on open supply lines and vigilant watchtowers",
    },
    historyRefIds: [historicalEvents[0]?.id].filter(Boolean),
    visibility: "visible",
  };
  sites.push(havenSite);

  // Settlement Hubs
  // For the 18 non-haven cells, place hubs matching profile ranges
  const hubBudget = Math.min(
    4,
    Math.max(2, primaryProfile.settlementHubRange[0] + settleRng(primaryProfile.settlementHubRange[1] - primaryProfile.settlementHubRange[0] + 1)),
  );

  const nonHavenGrid = HEX_GRID.filter((h) => h.id !== "00");
  const candidateHubHexes = [...nonHavenGrid].sort((a, b) => {
    // Prefer ring 1 and ring 2 cells with river / good elevation
    const da = translatedHexData.get(coordKey(a.q, a.r))!;
    const db = translatedHexData.get(coordKey(b.q, b.r))!;
    return da.elevation === 1 ? -1 : db.elevation === 1 ? 1 : 0;
  });

  const selectedHubCells = candidateHubHexes.slice(0, hubBudget);
  const settlementTypes = [
    ...primaryProfile.settlementTypes,
    ...(isBorder && secondaryProfile ? secondaryProfile.settlementTypes : []),
  ];

  selectedHubCells.forEach((cell, idx) => {
    const sType = settlementTypes[idx % settlementTypes.length];
    const cellData = translatedHexData.get(coordKey(cell.q, cell.r))!;
    const site: SiteEntity = {
      id: `site_settle_${cell.id}_${regionId}`,
      regionId,
      canonicalKey: `${regionId}:${layerId}:${cell.q}:${cell.r}`,
      kind: "settlement",
      name: `${sType.name} of Hex ${cell.id}`,
      currentState: "Inhabited Community",
      ownerFactionId: activeFactions[(idx + 1) % activeFactions.length]?.id,
      supportDependencies: {
        waterSource: sType.waterSource,
        foodProvenance: sType.foodProvenance,
        reasonForLocation: sType.reason,
        vulnerability: "Threatened by wild border encounters and seasonal shortages",
      },
      historyRefIds: [historicalEvents[idx % historicalEvents.length]?.id].filter(Boolean),
      visibility: "visible",
    };
    sites.push(site);
  });

  // Major Destinations & Minor Features Budget:
  // 3-5 Major Destinations (ruins, dungeons, temples)
  // 8-11 Minor Features (caves, shrines, lookouts, resources)
  const remainingCells = nonHavenGrid.filter((c) => !selectedHubCells.some((h) => h.id === c.id));
  const majorCount = 3 + siteRng(3); // 3..5
  const majorCells = remainingCells.slice(0, majorCount);
  const minorCells = remainingCells.slice(majorCount);

  majorCells.forEach((cell, idx) => {
    const cellData = translatedHexData.get(coordKey(cell.q, cell.r))!;
    const prof = cellData.zoneId === secondaryZoneId ? secondaryProfile : primaryProfile;
    const kind = idx % 2 === 0 ? "ruin" : "shrine";
    const site: SiteEntity = {
      id: `site_major_${cell.id}_${regionId}`,
      regionId,
      canonicalKey: `${regionId}:${layerId}:${cell.q}:${cell.r}`,
      kind,
      name: kind === "ruin" ? `Ruins of Old ${prof.name.split(" ")[1] || "Hold"} ${cell.id}` : `Ancient Shrine of ${prof.factions[0]?.name || "the Dawn"}`,
      currentState: "Ancient & Perilous",
      historyRefIds: [historicalEvents[0]?.id].filter(Boolean),
      visibility: "visible",
    };
    sites.push(site);
  });

  minorCells.forEach((cell, idx) => {
    const cellData = translatedHexData.get(coordKey(cell.q, cell.r))!;
    const kind = idx % 3 === 0 ? "resource" : idx % 3 === 1 ? "entrance" : "fort";
    const site: SiteEntity = {
      id: `site_minor_${cell.id}_${regionId}`,
      regionId,
      canonicalKey: `${regionId}:${layerId}:${cell.q}:${cell.r}`,
      kind,
      name: kind === "resource" ? `Mineral Seep & Herbal Glade ${cell.id}` : kind === "entrance" ? `Karst Descent Fissure ${cell.id}` : `Old Stone Watch-Redoubt ${cell.id}`,
      currentState: "Unoccupied Landmark",
      visibility: kind === "resource" ? "hidden" : "visible",
    };
    sites.push(site);
  });

  // 8. Routes & Travel Connections
  // Connect haven (00) to each settlement hub, and add loops/detours
  const roadNames = ROAD_PREFIXES[primaryZoneId] ?? ROAD_PREFIXES.the_gloaming;
  const primaryRoadName = roadNames[geoRng(roadNames.length)];
  const secondaryRoadName = roadNames[(geoRng(roadNames.length) + 1) % roadNames.length];

  // Helper to add edge
  function addConnection(from: HexCoord, to: HexCoord, kind: ConnectionEntity["kind"], name: string, method?: ConnectionEntity["crossingMethod"]) {
    const fk = `${regionId}:${layerId}:${from.q}:${from.r}`;
    const tk = `${regionId}:${layerId}:${to.q}:${to.r}`;
    const terrainData = translatedHexData.get(coordKey(to.q, to.r));
    const cost = terrainData ? (terrainData.elevation >= 2 ? 2 : 1) : 1;

    connections.push({
      id: `conn_${connections.length + 1}_${regionId}`,
      regionId,
      fromKey: fk,
      toKey: tk,
      kind,
      name,
      direction: kind === "river" ? "downstream" : "undirected",
      modes: kind === "river" ? ["boat"] : ["foot", "cart"],
      costWatches: cost,
      crossingMethod: method,
    });
  }

  // Connect haven to settlement hubs
  for (let i = 0; i < selectedHubCells.length; i++) {
    const hub = selectedHubCells[i];
    const hubCoord = { q: hub.q, r: hub.r };
    // If adjacent, direct connection; if distance 2, find intermediate hex
    if (axialDistance({ q: 0, r: 0 }, hubCoord) === 1) {
      addConnection({ q: 0, r: 0 }, hubCoord, "road", i % 2 === 0 ? primaryRoadName : secondaryRoadName);
    } else {
      // Find ring 1 step
      const step = HEX_GRID.filter((h) => h.ring === 1).find((h) => axialDistance({ q: h.q, r: h.r }, hubCoord) === 1);
      if (step) {
        addConnection({ q: 0, r: 0 }, { q: step.q, r: step.r }, "road", primaryRoadName);
        addConnection({ q: step.q, r: step.r }, hubCoord, "road", primaryRoadName);
      } else {
        addConnection({ q: 0, r: 0 }, hubCoord, "trail", secondaryRoadName);
      }
    }
  }

  // Connect some adjacent hubs for route loops
  for (let i = 0; i < selectedHubCells.length - 1; i++) {
    const h1 = selectedHubCells[i];
    const h2 = selectedHubCells[i + 1];
    if (axialDistance({ q: h1.q, r: h1.r }, { q: h2.q, r: h2.r }) <= 2) {
      addConnection({ q: h1.q, r: h1.r }, { q: h2.q, r: h2.r }, "trail", secondaryRoadName);
    }
  }

  // Add river connections for cells where hydrology indicates a river
  const riverName = hydroResult.nodes.get(coordKey(shiftQ, shiftR))?.riverName || primaryProfile.waterDrainageType === "river_network" ? "River Mor" : "Clear River";
  for (const hg of HEX_GRID) {
    const origQ = hg.q + shiftQ;
    const origR = hg.r + shiftR;
    const origKey = coordKey(origQ, origR);
    const node = hydroResult.nodes.get(origKey);
    if (node?.isRiver && node.downstreamKey) {
      const targetOrig = hydroResult.nodes.get(node.downstreamKey);
      if (targetOrig) {
        const targetQ = targetOrig.q - shiftQ;
        const targetR = targetOrig.r - shiftR;
        const targetHG = hexGridLookup.get(coordKey(targetQ, targetR));
        if (targetHG) {
          addConnection({ q: hg.q, r: hg.r }, { q: targetQ, r: targetR }, "river", riverName, "ford");
        }
      }
    }
  }

  // 9. Initial Rumors (At least 3 distinct opportunities originating from haven)
  const rumors: RumorRecord[] = [];
  const rumorTargets = sites.filter((s) => s.kind !== "haven").slice(0, 4);

  const rumorTemplates = [
    (site: SiteEntity) => `Tavern scouts speak of ${site.name}, warning that ancient guardians watch the approaches.`,
    (site: SiteEntity) => `Merchants returning from ${site.name} tell of valuable mineral veins and unguarded relics.`,
    (site: SiteEntity) => `A dying scout whispered directions toward ${site.name}, swearing treasure lies buried within.`,
    (site: SiteEntity) => `Herdsmen report strange lights and chanting near ${site.name} during the dark of the moon.`,
  ];

  rumorTargets.forEach((t, i) => {
    const coordParts = t.canonicalKey.split(":");
    const tq = Number(coordParts[2]);
    const tr = Number(coordParts[3]);
    let dir = "nearby";
    if (tr < 0 && tq >= 0) dir = "to the northeast";
    else if (tr < 0 && tq < 0) dir = "to the northwest";
    else if (tr > 0 && tq <= 0) dir = "to the southwest";
    else if (tr > 0 && tq > 0) dir = "to the southeast";
    else if (tq > 0) dir = "to the east";
    else if (tq < 0) dir = "to the west";

    rumors.push({
      id: `rumor_${i + 1}_${regionId}`,
      regionId,
      originSiteId: havenSite.id,
      targetSiteId: t.id,
      claim: rumorTemplates[i % rumorTemplates.length](t),
      accuracy: i === 0 ? "true" : i === 1 ? "distorted" : "true",
      directionHint: dir,
    });
  });

  // 10. Assemble the 19 PublicHex entries for the client window
  const initial19PublicHexes: PublicHex[] = [];
  const regionHexes: RegionHex[] = [];

  for (const hg of HEX_GRID) {
    const key = coordKey(hg.q, hg.r);
    const data = translatedHexData.get(key) || {
      q: hg.q,
      r: hg.r,
      key,
      elevVal: 0.5,
      elevation: 1,
      moisture: 0.5,
      zoneId: primaryZoneId,
      isTransition: false,
    };

    const zoneForHex = data.zoneId;
    const prof = zoneForHex === secondaryZoneId ? secondaryProfile : primaryProfile;

    // Biome assignment using zone terrain prior weights and moisture/elevation
    const chosenBiomeGroup = deterministicWeightedPick(
      prof.terrainPriors.map((tp) => ({ item: tp, weight: tp.weight })),
      geoRng,
    );
    const biome = chosenBiomeGroup.biomes[geoRng(chosenBiomeGroup.biomes.length)] || "Wilderness";

    // Name and landmark
    const hexSites = sites.filter((s) => s.canonicalKey === `${regionId}:${layerId}:${hg.q}:${hg.r}`);
    let name = hexSites[0]?.name || `${biome} ${hg.id}`;
    let landmark = hexSites[0]?.kind === "haven"
      ? havenProfile.landmark
      : hexSites[0]
        ? `${hexSites[0].name} (${hexSites[0].currentState})`
        : `Natural ${biome} landmark`;

    if (hg.id === "00") {
      name = havenProfile.name;
      landmark = havenProfile.landmark;
    }

    // Connections touching this hex
    const myConnEntities = connections.filter((c) => {
      const fk = `${regionId}:${layerId}:${hg.q}:${hg.r}`;
      return c.fromKey === fk || c.toKey === fk;
    });

    const publicConnSummaries: PublicConnectionSummary[] = myConnEntities.map((c) => {
      const fromParts = c.fromKey.split(":");
      const toParts = c.toKey.split(":");
      const fromHG = hexGridLookup.get(coordKey(Number(fromParts[2]), Number(fromParts[3])));
      const toHG = hexGridLookup.get(coordKey(Number(toParts[2]), Number(toParts[3])));
      return {
        id: c.id,
        fromId: fromHG?.id ?? "??",
        toId: toHG?.id ?? "??",
        kind: c.kind,
        name: c.name,
        costWatches: c.costWatches,
        crossingMethod: c.crossingMethod as any,
      };
    });

    // Public sites touching this hex
    const publicSites: PublicSiteSummary[] = hexSites.map((s) => ({
      id: s.id,
      name: s.name,
      kind: s.kind,
      description: s.supportDependencies?.reasonForLocation,
      isSecret: s.visibility === "secret",
    }));

    // Find road / river string for legacy compatibility
    const roadConn = myConnEntities.find((c) => c.kind === "road" || c.kind === "trail");
    const riverConn = myConnEntities.find((c) => c.kind === "river");

    // Exit destination on outer ring
    let exitDestination: string | undefined;
    let horizonRumor: string | undefined;

    if (hg.id === "00") {
      horizonRumor = rumors[0]?.claim ?? "The tavern fire burns warm; scouts trade whispers of uncharted reaches.";
    } else if (hg.ring === 2) {
      if (isBorder && secondaryZoneId && data.zoneId === secondaryZoneId) {
        exitDestination = `➔ Into ${secondaryProfile.name}`;
        horizonRumor = `Trail continues into ${secondaryProfile.name} territory.`;
      } else {
        exitDestination = `➔ Outward to ${prof.name} Frontier`;
        horizonRumor = `Wandering tinkers warn that beyond this perimeter lies deep wilderness.`;
      }
    }

    // Attach rumor if one targets this hex
    const targetRumor = rumors.find((r) => hexSites.some((s) => s.id === r.targetSiteId));
    if (targetRumor) {
      horizonRumor = targetRumor.claim;
    }

    const threatTier = hg.ring === 0 ? 0 : hg.ring === 1 ? 1 : data.elevation === 3 ? 3 : 2;
    const revealState: RevealState = hg.id === "00" ? "fully_mapped" : "unexplored";

    const publicHex: PublicHex = {
      id: hg.id,
      ring: hg.ring,
      q: hg.q,
      r: hg.r,
      revealState,
      canonicalKey: `${regionId}:${layerId}:${hg.q}:${hg.r}`,
      primaryZone: zoneForHex,
      secondaryZone: isBorder ? secondaryZoneId : undefined,
      name,
      biome,
      threatTier,
      landmark,
      road: roadConn?.name,
      river: riverConn?.name,
      horizonRumor,
      exitDestination,
      elevation: data.elevation,
      connections: publicConnSummaries,
      sites: publicSites,
    };

    initial19PublicHexes.push(publicHex);

    regionHexes.push({
      canonicalKey: `${regionId}:${layerId}:${hg.q}:${hg.r}`,
      regionId,
      layerId,
      q: hg.q,
      r: hg.r,
      terrain: biome,
      elevation: data.elevation,
      depth: 0,
      moisture: data.moisture,
      primaryZone: zoneForHex,
      secondaryZone: isBorder ? secondaryZoneId : undefined,
      threatTier,
      name,
      landmark,
    });
  }

  // 11. Validation checks
  const warnings: string[] = [];
  const zoneCounts: Record<string, number> = {};
  for (const h of initial19PublicHexes) {
    const z = h.primaryZone || primaryZoneId;
    zoneCounts[z] = (zoneCounts[z] || 0) + 1;
  }

  let isValid = true;
  if (isBorder && secondaryZoneId && connectionMode === "surface") {
    const countA = zoneCounts[primaryZoneId] || 0;
    const countB = zoneCounts[secondaryZoneId] || 0;
    // We expect at least 4-5 cells of each zone in surface border mode
    if (countA < 4 || countB < 4) {
      warnings.push(`Border representation unbalanced: ${primaryZoneId}=${countA}, ${secondaryZoneId}=${countB}`);
      isValid = false;
    }
  }

  // Ensure Haven is present at 00
  const haven00 = initial19PublicHexes.find((h) => h.id === "00");
  if (!haven00 || haven00.threatTier !== 0) {
    warnings.push("Haven at 00 missing or dangerous");
    isValid = false;
  }

  const regionEntity: RegionEntity = {
    id: regionId,
    campaignId,
    selection,
    seed: baseSeed,
    generatorVersion: GENERATOR_VERSION,
    contentVersion: CONTENT_VERSION,
    rulesVersion: RULES_VERSION,
    attempt,
    revision: 1,
    active: true,
    createdAt: new Date().toISOString(),
  };

  const layers: RegionLayer[] = [
    {
      regionId,
      layerId,
      kind: connectionMode === "vertical" ? "surface" : "surface",
      scale: config.regionalHexMiles ?? 6,
      depthContext: "Surface regional frontier",
    },
  ];

  if (connectionMode === "vertical" && secondaryZoneId) {
    layers.push({
      regionId,
      layerId: "subterranean",
      kind: "subterranean",
      scale: config.regionalHexMiles ?? 6,
      depthContext: "Deep karst caverns and sunless vaults",
    });
  }

  return {
    region: regionEntity,
    layers,
    hexes: regionHexes,
    sites,
    connections,
    historicalEvents,
    factionPresences: activeFactions,
    rumors,
    initial19PublicHexes,
    validationReport: {
      valid: isValid,
      attempt,
      warnings,
      zoneCounts,
    },
  };
}
