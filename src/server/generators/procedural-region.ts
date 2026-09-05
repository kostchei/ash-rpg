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
  generateLandmarkForZone,
  generateSettlementName,
  generateTavernForZone,
} from "./names.js";
import {
  BORDER_PAIRINGS,
  getBorderPairing,
  getZoneProfile,
  validateBorderPairing,
  ZONE_PROFILES,
  type ZoneGenerationProfile,
} from "../../shared/zone-profiles.js";
import type {
  AdventurePathRecord,
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
  TavernEstablishment,
  TavernLead,
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
  tavernEstablishment?: TavernEstablishment;
  adventurePath?: AdventurePathRecord;
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
};

export function generateProceduralRegion(
  campaignId: number,
  config: RegionGenerationConfig,
): GeneratedRegionWorld {
  if (config.seed !== undefined && typeof config.seed !== "string") {
    throw new Error("Seed must be a string if specified");
  }

  // Validate border selection mode
  if (config.selection.mode === "border") {
    const [z0, z1] = config.selection.zoneIds;
    const val = validateBorderPairing(z0, z1, config.selection.connection);
    if (!val.valid) {
      throw new Error(`Invalid border configuration: ${val.error}`);
    }
  }

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

  // Bounded deterministic retry exhausted: fail atomically
  throw new Error(
    `Procedural region generation failed strict validation after ${maxAttempts} attempts: ${
      lastCandidate?.validationReport.warnings.join("; ") || "Unknown constraint violation"
    }`,
  );
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
  let primaryZoneId: CursedZoneId = isBorder ? selection.zoneIds[0] : selection.zoneId;
  let secondaryZoneId: CursedZoneId | undefined = isBorder ? selection.zoneIds[1] : undefined;
  const borderPairing = isBorder && secondaryZoneId ? getBorderPairing(primaryZoneId, secondaryZoneId) : undefined;
  const connectionMode = isBorder ? selection.connection : "surface";

  // Check if reversed vertical pair (e.g. Morzomotha + Gloaming)
  let surfaceZoneId = primaryZoneId;
  let subterraneanZoneId: CursedZoneId | undefined =
    connectionMode === "vertical" ? "dwellers_in_the_deep" : undefined;

  if (connectionMode === "vertical") {
    if (primaryZoneId === "dwellers_in_the_deep" && secondaryZoneId) {
      surfaceZoneId = secondaryZoneId;
      subterraneanZoneId = "dwellers_in_the_deep";
    } else if (secondaryZoneId === "dwellers_in_the_deep") {
      surfaceZoneId = primaryZoneId;
      subterraneanZoneId = "dwellers_in_the_deep";
    }
  }

  const primaryProfile = getZoneProfile(primaryZoneId);
  const secondaryProfile = secondaryZoneId ? getZoneProfile(secondaryZoneId) : primaryProfile;
  const surfaceProfile = getZoneProfile(surfaceZoneId);

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
    biome?: string;
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
    if (elevVal < 0.28) elevation = 0;
    else if (elevVal < 0.6) elevation = 1;
    else if (elevVal < 0.82) elevation = 2;
    else elevation = 3;

    // Setting-specific elevation adjustment
    if (surfaceZoneId === "midnight_sun") {
      // Coastal archipelago: ensure some open water fjords and high peaks
      if (elevVal < 0.35) elevation = 0;
      else if (elevVal > 0.8) elevation = 3;
    } else if (surfaceZoneId === "red_sands") {
      // Desert: rarely open water
      if (elevation === 0 && elevVal > 0.15) elevation = 1;
    }

    // Zone attribution
    let zoneId = primaryZoneId;
    let isTransition = false;

    if (isBorder && secondaryZoneId) {
      if (connectionMode === "surface") {
        const borderVal = (c.q + c.r * 0.5) / structuralRadius + (noiseBorder.sample(nx, ny) * 0.35);
        if (borderVal < -0.15) {
          zoneId = primaryZoneId;
        } else if (borderVal > 0.15) {
          zoneId = secondaryZoneId;
        } else {
          zoneId = borderVal <= 0 ? primaryZoneId : secondaryZoneId;
          isTransition = true;
        }
      } else {
        zoneId = surfaceZoneId;
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
  const hydroResult = solveHydrology(rawCoords, elevationsMap, surfaceZoneId, geoRng, {
    minRiverCatchment: surfaceZoneId === "red_sands" ? 5 : 3,
  });

  // 3. Assign physically eligible terrain biomes based on elevation, moisture, and hydrology
  for (const [, d] of hexDataMap) {
    const prof = getZoneProfile(d.zoneId);
    const hydro = hydroResult.nodes.get(d.key);

    if (d.elevation === 0) {
      // Water / Trench
      if (d.zoneId === "midnight_sun") {
        d.biome = geoRng(2) === 0 ? "Open Cold Water" : "Glacial Fjord Sound";
      } else if (d.zoneId === "city_of_masks") {
        d.biome = "Estuary Reach";
      } else if (d.zoneId === "red_sands") {
        d.biome = geoRng(2) === 0 ? "Blinding Salt Flats" : "Dry Wadi Wash";
      } else if (d.zoneId === "river_of_night") {
        d.biome = "Sunken Floodplain";
      } else if (d.zoneId === "dwellers_in_the_deep") {
        d.biome = "Subterranean Lake";
      } else {
        d.biome = geoRng(2) === 0 ? "Deep Quagmire" : "Mist Fen";
      }
    } else if (d.elevation === 3) {
      // Highlands / Crags / Mountain
      const highGroup = prof.terrainPriors.find(
        (tp) =>
          tp.group.toLowerCase().includes("ridge") ||
          tp.group.toLowerCase().includes("canyon") ||
          tp.group.toLowerCase().includes("mountain") ||
          tp.group.toLowerCase().includes("rock"),
      ) ?? prof.terrainPriors[prof.terrainPriors.length - 1];
      d.biome = highGroup.biomes[geoRng(highGroup.biomes.length)];
    } else {
      // Habitable land (elevation 1 or 2)
      if (hydro?.isRiver) {
        if (d.zoneId === "river_of_night") d.biome = "River Corridor Silt";
        else if (d.zoneId === "red_sands") d.biome = "Palm Oasis Wash";
        else if (d.zoneId === "midnight_sun") d.biome = "Fjord Shore Verge";
        else if (d.zoneId === "city_of_masks") d.biome = "Canal Hinterland";
        else d.biome = "Riverbank Verge";
      } else {
        const landGroups = prof.terrainPriors.filter(
          (tp) =>
            !tp.group.toLowerCase().includes("water") &&
            !tp.group.toLowerCase().includes("sea"),
        );
        const chosen = deterministicWeightedPick(
          landGroups.map((lg) => ({ item: lg, weight: lg.weight })),
          geoRng,
        );
        d.biome = chosen.biomes[geoRng(chosen.biomes.length)];
      }
    }
  }

  // 4. Haven Selection (Strict constraint: Habitable land, elevation 1 or 2, water availability)
  const havenCandidates = rawCoords.filter((c) => {
    const distFromCenter = axialDistance(c, { q: 0, r: 0 });
    if (distFromCenter > 2) return false;
    const data = hexDataMap.get(coordKey(c.q, c.r))!;
    if (data.elevation === 0 || data.elevation === 3) return false; // Never in open water or extreme peaks
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

    if (hydroNode?.isRiver || hydroNode?.isStream) score += 20; // Water availability
    if (data.elevation === 1) score += 10; // Valley/basin preferred
    if (isBorder && connectionMode === "surface") {
      const neighbors = getAxialNeighbors(c);
      const neighborZones = new Set(neighbors.map((n) => hexDataMap.get(coordKey(n.q, n.r))?.zoneId).filter(Boolean));
      if (neighborZones.size >= 2) score += 30;
      if (data.isTransition) score += 20;
    }
    if (surfaceZoneId === "midnight_sun") {
      const neighbors = getAxialNeighbors(c);
      if (neighbors.some((n) => hexDataMap.get(coordKey(n.q, n.r))?.elevation === 0)) {
        score += 25; // Harbor location
      }
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

  // Rebuild grid relative to haven (0,0) with unique seed-independent region ID (R4)
  const seedHash = hashString(`${baseSeed}:${attempt}`).toString(16);
  const regionId = `reg_${campaignId}_${attempt}_${seedHash}`;
  const layerId = "surface";

  // 4. Generate the 19-cell local window matching HEX_GRID
  const hexGridLookup = new Map<string, (typeof HEX_GRID)[number]>();
  for (const hg of HEX_GRID) {
    hexGridLookup.set(coordKey(hg.q, hg.r), hg);
  }

  // 5. Historical Layers Generation (2-4 layers)
  const numHistoricalLayers = 2 + histRng(3);
  const availableHistoricalMotifs = [
    ...primaryProfile.historicalLayers,
    ...(isBorder && secondaryProfile ? secondaryProfile.historicalLayers : []),
  ];
  const selectedHistory = availableHistoricalMotifs.slice(0, numHistoricalLayers);

  // 6. Settlements & Sites Generation
  const sites: SiteEntity[] = [];
  const connections: ConnectionEntity[] = [];

  // Haven site at 00
  const havenProfile = surfaceProfile.havenDefaults;
  const havenSite: SiteEntity = {
    id: `site_haven_${regionId}`,
    regionId,
    canonicalKey: `${regionId}:${layerId}:0:0`,
    kind: "haven",
    name: havenProfile.name,
    currentState: "Active & Fortified Refuge",
    supportDependencies: {
      waterSource:
        surfaceZoneId === "red_sands"
          ? "Deep Sandstone Artesian Well"
          : surfaceZoneId === "midnight_sun"
            ? "Sheltered Fjord Sound & Mountain Stream"
            : surfaceProfile.settlementTypes[0]?.waterSource || "Protected natural spring",
      foodProvenance:
        surfaceProfile.settlementTypes[0]?.foodProvenance || "Stockpiled provisions and local agriculture",
      reasonForLocation:
        surfaceZoneId === "midnight_sun"
          ? "Sheltered deepwater harbor protected from arctic gales"
          : surfaceProfile.settlementTypes[0]?.reason || "Defensible crossroads sanctuary",
      vulnerability: "Dependent on open supply lines and watchful sentries",
    },
    historyRefIds: [],
    visibility: "visible",
  };
  sites.push(havenSite);

  // Inhabited Settlement Hubs (R3: strictly placed on habitable land elevation >= 1)
  const nonHavenGrid = HEX_GRID.filter((h) => h.id !== "00");
  const habitableCandidates = nonHavenGrid.filter((h) => {
    const d = translatedHexData.get(coordKey(h.q, h.r));
    return d && d.elevation >= 1 && d.elevation <= 2;
  });

  const hubBudget = Math.min(
    4,
    Math.max(
      2,
      primaryProfile.settlementHubRange[0] +
        settleRng(primaryProfile.settlementHubRange[1] - primaryProfile.settlementHubRange[0] + 1),
    ),
  );

  const selectedHubCells = habitableCandidates.slice(0, Math.min(hubBudget, habitableCandidates.length));

  selectedHubCells.forEach((cell, idx) => {
    const cellData = translatedHexData.get(coordKey(cell.q, cell.r))!;
    const localProf = getZoneProfile(cellData.zoneId);
    const sType = localProf.settlementTypes[idx % localProf.settlementTypes.length];

    const sName = generateSettlementName(cellData.zoneId, false, idx + 1, settleRng);
    const site: SiteEntity = {
      id: `site_settle_${cell.id}_${regionId}`,
      regionId,
      canonicalKey: `${regionId}:${layerId}:${cell.q}:${cell.r}`,
      kind: "settlement",
      name: sName,
      currentState: "Inhabited Community",
      supportDependencies: {
        waterSource: sType.waterSource,
        foodProvenance: sType.foodProvenance,
        reasonForLocation: sType.reason,
        vulnerability: "Threatened by wild border encounters and seasonal shortages",
      },
      historyRefIds: [],
      visibility: "visible",
    };
    sites.push(site);
  });

  // Major Destinations (ruins, shrines) & Minor Features (resources, caves, forts)
  const remainingCells = nonHavenGrid.filter((c) => !selectedHubCells.some((h) => h.id === c.id));
  const majorCount = 3 + siteRng(3);
  const majorCells = remainingCells.slice(0, majorCount);
  const minorCells = remainingCells.slice(majorCount);

  majorCells.forEach((cell, idx) => {
    const cellData = translatedHexData.get(coordKey(cell.q, cell.r))!;
    const kind = idx % 2 === 0 ? "ruin" : "shrine";
    const lm = generateLandmarkForZone(cellData.zoneId, kind, cell.id, siteRng);
    const site: SiteEntity = {
      id: `site_major_${cell.id}_${regionId}`,
      regionId,
      canonicalKey: `${regionId}:${layerId}:${cell.q}:${cell.r}`,
      kind,
      name: lm.name,
      currentState: "Ancient & Perilous",
      historyRefIds: [],
      visibility: "visible",
    };
    sites.push(site);
  });

  minorCells.forEach((cell, idx) => {
    const cellData = translatedHexData.get(coordKey(cell.q, cell.r))!;
    const kind = idx % 3 === 0 ? "resource" : idx % 3 === 1 ? "entrance" : "fort";
    const lm = generateLandmarkForZone(cellData.zoneId, kind, cell.id, siteRng);
    const site: SiteEntity = {
      id: `site_minor_${cell.id}_${regionId}`,
      regionId,
      canonicalKey: `${regionId}:${layerId}:${cell.q}:${cell.r}`,
      kind,
      name: lm.name,
      currentState: "Unoccupied Landmark",
      visibility: kind === "resource" ? "hidden" : "visible",
    };
    sites.push(site);
  });

  // Assign real affectedEntityIds to historical events (G2 fix)
  const historicalEvents: HistoricalEvent[] = selectedHistory.map((motif, index) => {
    const eventId = `hist_${index + 1}_${regionId}`;
    const targetSite1 = sites[index % sites.length];
    const targetSite2 = sites[(index + 1) % sites.length];
    const affected = [targetSite1.id, targetSite2.id].filter(Boolean);

    targetSite1.historyRefIds = targetSite1.historyRefIds ?? [];
    targetSite1.historyRefIds.push(eventId);
    if (targetSite2 && targetSite2.id !== targetSite1.id) {
      targetSite2.historyRefIds = targetSite2.historyRefIds ?? [];
      targetSite2.historyRefIds.push(eventId);
    }

    return {
      id: eventId,
      regionId,
      sequence: index + 1,
      name: motif.title,
      summary: motif.summary,
      affectedEntityIds: affected,
      consequences: [...motif.consequences],
    };
  });

  // STAGE 7: Factions Distributed to Actual Places (G2 fix)
  const activeFactions: FactionPresence[] = [];
  primaryProfile.factions.forEach((f, i) => {
    const assignedSite = sites[i % sites.length];
    activeFactions.push({
      id: `fac_${f.id}_${regionId}`,
      regionId,
      factionId: f.id,
      name: f.name,
      disposition: f.disposition,
      locationKey: assignedSite.canonicalKey,
      assetOrRole: f.asset,
      strengthOrControl: i === 0 ? "Dominant" : "Contested",
      agenda: f.agenda,
    });
    if (assignedSite.kind === "settlement" || assignedSite.kind === "haven") {
      assignedSite.ownerFactionId = `fac_${f.id}_${regionId}`;
    }
  });

  if (isBorder && secondaryProfile) {
    secondaryProfile.factions.slice(0, 2).forEach((f, i) => {
      const assignedSite = sites[(sites.length - 1 - i) % sites.length];
      activeFactions.push({
        id: `fac_${f.id}_${regionId}`,
        regionId,
        factionId: f.id,
        name: f.name,
        disposition: f.disposition,
        locationKey: assignedSite.canonicalKey,
        assetOrRole: f.asset,
        strengthOrControl: "Contested",
        agenda: f.agenda,
      });
    });
  }

  // STAGE 8: Mode-Aware Routes & Travel Connections (R3: no land roads across open sea)
  const roadNames = ROAD_PREFIXES[surfaceZoneId] ?? ROAD_PREFIXES.the_gloaming;
  const primaryRoadName = roadNames[geoRng(roadNames.length)];
  const secondaryRoadName = roadNames[(geoRng(roadNames.length) + 1) % roadNames.length];

  function addConnection(
    from: HexCoord,
    to: HexCoord,
    kind: ConnectionEntity["kind"],
    name: string,
    method?: ConnectionEntity["crossingMethod"],
    modes?: string[],
    costWatches?: number,
    requirements?: string[],
  ) {
    const fk = `${regionId}:${layerId}:${from.q}:${from.r}`;
    const tk = `${regionId}:${layerId}:${to.q}:${to.r}`;
    const toData = translatedHexData.get(coordKey(to.q, to.r));
    const defaultCost = toData ? (toData.elevation >= 2 ? 2 : 1) : 1;

    connections.push({
      id: `conn_${connections.length + 1}_${regionId}`,
      regionId,
      fromKey: fk,
      toKey: tk,
      kind,
      name,
      direction: kind === "river" ? "downstream" : "undirected",
      modes: modes ?? (kind === "river" || kind === "sea_lane" ? ["boat"] : ["foot", "cart"]),
      costWatches: costWatches ?? defaultCost,
      crossingMethod: method,
      requirements,
    });
  }

  // Connect haven to settlement hubs with mode-awareness
  for (let i = 0; i < selectedHubCells.length; i++) {
    const hub = selectedHubCells[i];
    const hubCoord = { q: hub.q, r: hub.r };
    const hubData = translatedHexData.get(coordKey(hub.q, hub.r))!;
    const havenData = translatedHexData.get(coordKey(0, 0))!;

    const rName = i % 2 === 0 ? primaryRoadName : secondaryRoadName;

    if (axialDistance({ q: 0, r: 0 }, hubCoord) === 1) {
      if (havenData.elevation === 0 || hubData.elevation === 0) {
        addConnection({ q: 0, r: 0 }, hubCoord, "sea_lane", `${rName} Sea Lane`, "boat", ["boat"]);
      } else {
        addConnection({ q: 0, r: 0 }, hubCoord, "road", rName);
      }
    } else {
      // Find intermediate ring 1 hex
      const step = HEX_GRID.filter((h) => h.ring === 1).find(
        (h) => axialDistance({ q: h.q, r: h.r }, hubCoord) === 1,
      );
      if (step) {
        const stepData = translatedHexData.get(coordKey(step.q, step.r))!;
        const kind1 = havenData.elevation === 0 || stepData.elevation === 0 ? "sea_lane" : "road";
        const kind2 = stepData.elevation === 0 || hubData.elevation === 0 ? "sea_lane" : "road";
        addConnection(
          { q: 0, r: 0 },
          { q: step.q, r: step.r },
          kind1,
          kind1 === "sea_lane" ? `${rName} Sound Passage` : rName,
          kind1 === "sea_lane" ? "boat" : undefined,
          kind1 === "sea_lane" ? ["boat"] : ["foot", "cart"],
        );
        addConnection(
          { q: step.q, r: step.r },
          hubCoord,
          kind2,
          kind2 === "sea_lane" ? `${rName} Sound Passage` : rName,
          kind2 === "sea_lane" ? "boat" : undefined,
          kind2 === "sea_lane" ? ["boat"] : ["foot", "cart"],
        );
      } else {
        const isWater = havenData.elevation === 0 || hubData.elevation === 0;
        addConnection(
          { q: 0, r: 0 },
          hubCoord,
          isWater ? "sea_lane" : "trail",
          isWater ? `${rName} Coastal Lane` : rName,
          isWater ? "boat" : undefined,
          isWater ? ["boat"] : ["foot", "cart"],
        );
      }
    }
  }

  // Connect adjacent settlement hubs for route loops
  for (let i = 0; i < selectedHubCells.length - 1; i++) {
    const h1 = selectedHubCells[i];
    const h2 = selectedHubCells[i + 1];
    if (axialDistance({ q: h1.q, r: h1.r }, { q: h2.q, r: h2.r }) <= 2) {
      const d1 = translatedHexData.get(coordKey(h1.q, h1.r))!;
      const d2 = translatedHexData.get(coordKey(h2.q, h2.r))!;
      const isWater = d1.elevation === 0 || d2.elevation === 0;
      addConnection(
        { q: h1.q, r: h1.r },
        { q: h2.q, r: h2.r },
        isWater ? "sea_lane" : "trail",
        secondaryRoadName,
        isWater ? "boat" : undefined,
        isWater ? ["boat"] : ["foot", "cart"],
      );
    }
  }

  // River connections from hydrology (R6 ternary precedence bug fixed)
  const havenHydro = hydroResult.nodes.get(coordKey(shiftQ, shiftR));
  const sampleRiverNode = Array.from(hydroResult.nodes.values()).find((n) => n.isRiver && n.riverName);
  const defaultRiverName = surfaceProfile.waterDrainageType === "river_network" ? "River Mor" : "Clear River";
  const riverName = havenHydro?.riverName || sampleRiverNode?.riverName || defaultRiverName;

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

  // STAGE 9: Subterranean Strategy & Cross-Layer Vertical Connection (R2)
  const layers: RegionLayer[] = [
    {
      regionId,
      layerId: "surface",
      kind: "surface",
      scale: config.regionalHexMiles ?? 6,
      depthContext: "Surface regional frontier",
    },
  ];

  const regionHexes: RegionHex[] = [];

  if (connectionMode === "vertical" && subterraneanZoneId) {
    layers.push({
      regionId,
      layerId: "subterranean",
      kind: "subterranean",
      scale: config.regionalHexMiles ?? 6,
      depthContext: "Deep karst caverns and sunless vaults (Morzomotha)",
    });

    // Generate subterranean hexes across the structural area
    const subPriors = getZoneProfile("dwellers_in_the_deep").terrainPriors;
    for (const hg of HEX_GRID) {
      const chosen = deterministicWeightedPick(
        subPriors.map((sp) => ({ item: sp, weight: sp.weight })),
        geoRng,
      );
      const caveBiome = chosen.biomes[geoRng(chosen.biomes.length)];
      const depth = hg.ring === 0 ? 1 : hg.ring === 1 ? 2 : 3;

      regionHexes.push({
        canonicalKey: `${regionId}:subterranean:${hg.q}:${hg.r}`,
        regionId,
        layerId: "subterranean",
        q: hg.q,
        r: hg.r,
        terrain: caveBiome,
        elevation: 1,
        depth,
        moisture: 0.8,
        primaryZone: "dwellers_in_the_deep",
        threatTier: hg.ring + 1,
        name: `${caveBiome} Vault ${hg.id}`,
        landmark: `Underground stalactite chamber and echoing grotto ${hg.id}`,
      });
    }

    // Connect subterranean hexes via cave passages (spanning tree / loops)
    for (let i = 0; i < HEX_GRID.length - 1; i++) {
      const h1 = HEX_GRID[i];
      const h2 = HEX_GRID[i + 1];
      if (axialDistance({ q: h1.q, r: h1.r }, { q: h2.q, r: h2.r }) === 1) {
        connections.push({
          id: `conn_sub_pass_${connections.length + 1}_${regionId}`,
          regionId,
          fromKey: `${regionId}:subterranean:${h1.q}:${h1.r}`,
          toKey: `${regionId}:subterranean:${h2.q}:${h2.r}`,
          kind: "cave_passage",
          name: "Echoing Karst Siphon",
          direction: "undirected",
          modes: ["foot"],
          costWatches: 2,
        });
      }
    }

    // Cross-layer vertical entrance shaft
    const surfEntrance = sites.find((s) => s.kind === "entrance") ?? sites[1];
    const subEntranceSite: SiteEntity = {
      id: `site_sub_ascent_${regionId}`,
      regionId,
      canonicalKey: `${regionId}:subterranean:0:0`,
      kind: "entrance",
      name: "Great Vault Ascent Shaft",
      currentState: "Deep Subterranean Landing",
      visibility: "visible",
    };
    sites.push(subEntranceSite);

    // Cross-layer shaft connection
    connections.push({
      id: `conn_shaft_${regionId}`,
      regionId,
      fromKey: surfEntrance.canonicalKey,
      toKey: subEntranceSite.canonicalKey,
      kind: "shaft",
      name: "Great Karst Descent Shaft",
      direction: "undirected",
      modes: ["climb", "foot"],
      costWatches: 2,
      crossingMethod: "climb",
      requirements: ["rope", "climbing_gear", "light"],
    });
  }

  // STAGE 10: Urban Strategy (Meridia / City of Masks)
  if (surfaceZoneId === "city_of_masks" || connectionMode === "urban") {
    layers.push({
      regionId,
      layerId: "urban_inset",
      kind: "urban_inset",
      scale: 1,
      depthContext: "Canal-threaded metropolis of Meridia",
    });

    const districtRoles = [
      { role: "castle", name: "Ducal Palace District" },
      { role: "university", name: "Bardic College Quarter" },
      { role: "temple", name: "Grand Basilica Ward" },
      { role: "high", name: "Canal Seren High Quarter" },
      { role: "market", name: "Grand Bazaar Basin" },
      { role: "artisan", name: "Canal Workshops" },
      { role: "low", name: "Rooks Market Ward" },
      { role: "slum", name: "Sinking Marsh Shallows" },
    ];

    districtRoles.forEach((d, idx) => {
      const dq = (idx % 3) - 1;
      const dr = Math.floor(idx / 3) - 1;
      const site: SiteEntity = {
        id: `site_district_${idx}_${regionId}`,
        regionId,
        canonicalKey: `${regionId}:urban_inset:${dq}:${dr}`,
        kind: "district",
        name: d.name,
        currentState: "Active Urban District",
        visibility: "visible",
      };
      sites.push(site);

      regionHexes.push({
        canonicalKey: `${regionId}:urban_inset:${dq}:${dr}`,
        regionId,
        layerId: "urban_inset",
        q: dq,
        r: dr,
        terrain: d.name,
        elevation: 1,
        depth: 0,
        moisture: 0.9,
        primaryZone: "city_of_masks",
        threatTier: idx >= 6 ? 2 : 1,
        name: d.name,
        landmark: `Civic landmarks and canal quays of ${d.name}`,
      });
    });
  }

  // STAGE 11: Distant Strategy (Multi-Watch Journey Connection)
  if (connectionMode === "distant" && secondaryZoneId) {
    const portSite: SiteEntity = {
      id: `site_distant_port_${regionId}`,
      regionId,
      canonicalKey: `${regionId}:${layerId}:1:1`,
      kind: "settlement",
      name: "Long-Voyage Caravan & Harbor Docks",
      currentState: "Active Expedition Departure Post",
      visibility: "visible",
    };
    sites.push(portSite);

    connections.push({
      id: `conn_voyage_${regionId}`,
      regionId,
      fromKey: portSite.canonicalKey,
      toKey: `reg_distant_${secondaryZoneId}:surface:0:0`,
      kind: "voyage",
      name: `Voyage to ${secondaryProfile.name}`,
      direction: "undirected",
      modes: ["boat", "foot"],
      costWatches: 16,
      requirements: ["vessel", "rations", "navigational_chart"],
    });
  }

  // STAGE 12: Adventure Path Situation & Haven Tavern Leads
  const nonHavenHexes = HEX_GRID.filter((h) => h.id !== "00");
  const waterworksCell =
    nonHavenHexes.find((h) => {
      const d = translatedHexData.get(coordKey(h.q, h.r));
      return d && (d.moisture > 0.4 || d.elevation === 1) && h.ring === 1;
    }) ||
    nonHavenHexes.find((h) => h.ring === 1) ||
    nonHavenHexes[0];

  const waterworksSite: SiteEntity = {
    id: `site_waterworks_${regionId}`,
    regionId,
    canonicalKey: `${regionId}:${layerId}:${waterworksCell.q}:${waterworksCell.r}`,
    kind: "ruin",
    name: "Disused River Waterworks & Pumping Cistern",
    currentState: "Active Scum Prisoner Waystation",
    visibility: "hidden", // hidden until scouted or searched
  };
  sites.push(waterworksSite);

  function getDirectionHint(tq: number, tr: number): string {
    if (tr < 0 && tq >= 0) return "to the northeast along the high road";
    if (tr < 0 && tq < 0) return "to the northwest through the scrub";
    if (tr > 0 && tq <= 0) return "to the southwest toward the river valley";
    if (tr > 0 && tq > 0) return "to the southeast across the lowlands";
    if (tq > 0) return "to the east into the broken borderlands";
    if (tq < 0) return "to the west toward the frontier verge";
    return "nearby in the surrounding verge";
  }

  const ordinaryRuin = sites.find((s) => s.kind === "ruin" && s.id !== waterworksSite.id) || sites[1];
  const ordinaryResourceOrSettle =
    sites.find(
      (s) =>
        (s.kind === "resource" || s.kind === "settlement" || s.kind === "shrine") &&
        s.id !== havenSite.id &&
        s.id !== ordinaryRuin.id &&
        s.id !== waterworksSite.id,
    ) || sites[2];

  const ruinCoordParts = ordinaryRuin.canonicalKey.split(":");
  const ruinCoord = { q: Number(ruinCoordParts[2]), r: Number(ruinCoordParts[3]) };
  const ruinHex = HEX_GRID.find((h) => h.q === ruinCoord.q && h.r === ruinCoord.r) ?? { id: "01" };

  const resCoordParts = ordinaryResourceOrSettle.canonicalKey.split(":");
  const resCoord = { q: Number(resCoordParts[2]), r: Number(resCoordParts[3]) };
  const resHex = HEX_GRID.find((h) => h.q === resCoord.q && h.r === resCoord.r) ?? { id: "02" };

  const tav = generateTavernForZone(surfaceZoneId, true, siteRng);
  const tavernEstablishment: TavernEstablishment = {
    name: tav.name,
    vibe: `${tav.knownFor}. Serving ${tav.drinkSpecialty} and ${tav.foodSpecialty}.`,
    barkeep: surfaceZoneId === "the_gloaming" ? "Tavernkeeper Tarley" : "Garrulous Barkeep Tomas",
    leads: [
      {
        id: `lead_path_${regionId}`,
        title: "Night Wagons & The Missing Surveyor",
        claim: "Master Surveyor Jonathan Vane went missing while surveying the old river pumping works. Town teamsters whisper of dark wagons moving muffled cargo along the water at midnight.",
        source: "Frightened Teamster by the tavern hearth",
        targetHexId: waterworksCell.id,
        targetSiteId: waterworksSite.id,
        directionHint: getDirectionHint(waterworksCell.q, waterworksCell.r),
        dangerHint: "Tier 2 Threat · Nocturnal patrols and amphibious wardens",
        preparationHint: "Torches, iron crowbar, and 2 days travel rations",
        accuracy: "true",
        isPathLead: true,
      },
      {
        id: `lead_ruin_${regionId}`,
        title: `Whispers of ${ordinaryRuin.name}`,
        claim: `A wounded prospector swears ancient coin and silver relics lie untouched within ${ordinaryRuin.name}, guarded by unquiet shades.`,
        source: "Wounded Scout recovering in the corner",
        targetHexId: ruinHex.id,
        targetSiteId: ordinaryRuin.id,
        directionHint: getDirectionHint(ruinCoord.q, ruinCoord.r),
        dangerHint: "Tier 2 Threat · Restless undead and stone deadfalls",
        preparationHint: "Holy water, blunt maces, and climbing cord",
        accuracy: "true",
        isPathLead: false,
      },
      {
        id: `lead_resource_${regionId}`,
        title: `Expedition Bounty: ${ordinaryResourceOrSettle.name}`,
        claim: `The Merchant Guild offers gold for anyone who maps the approach to ${ordinaryResourceOrSettle.name} and confirms safe passage for pack mule trains.`,
        source: "Mercantile Guild Factor posting a parchment notice",
        targetHexId: resHex.id,
        targetSiteId: ordinaryResourceOrSettle.id,
        directionHint: getDirectionHint(resCoord.q, resCoord.r),
        dangerHint: "Tier 1 Threat · Roaming predators and tricky terrain",
        preparationHint: "Pack mule, surveying compass, and sturdy boots",
        accuracy: "true",
        isPathLead: false,
      },
    ],
  };

  const adventurePath: AdventurePathRecord = {
    pathId: "the_mind_below",
    name: "The Mind Below",
    startingZoneId: surfaceZoneId,
    caveZoneId: "living_sandstone",
    endZoneId: "faerzress_sea",
    progress: { reach: 1, awakening: 0, knowledge: 0, access: 0 },
    installations: ["waterworks_cistern", "memory_well", "pressure_heart"],
    resolvedDeeds: [],
    toll: [],
    aquaticMethodsRevealed: [],
    activeSituation: {
      id: `sit_waterworks_${regionId}`,
      siteId: waterworksSite.id,
      hexId: waterworksCell.id,
      title: "The Missing Surveyor of the Waterworks",
      premise: "Night-soil wagons move sedated captives toward a disused waterworks on the river route.",
      npcName: "Surveyor Jonathan Vane",
      status: "active",
      clues: [
        "Night-soil wagons bypass city gates at midnight, heading along the river.",
        "Disused waterworks cistern has fresh wheel ruts and amphibious webbed tracks.",
        "A freight manifest found at the pumping house details captive minds bound for the Karst Deeps.",
      ],
      requiredDeed: "rescue_surveyor",
    },
  };

  const rumors: RumorRecord[] = tavernEstablishment.leads.map((l, i) => ({
    id: `rumor_${i + 1}_${regionId}`,
    regionId,
    originSiteId: havenSite.id,
    targetSiteId: l.targetSiteId,
    claim: l.claim,
    accuracy: l.accuracy,
    directionHint: l.directionHint,
  }));

  // STAGE 13: Assemble the 19 PublicHex entries and full structural hexes (G1 fix)
  const initial19PublicHexes: PublicHex[] = [];

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
      biome: "Wilderness",
    };

    const zoneForHex = data.zoneId;
    const prof = getZoneProfile(zoneForHex);
    const biome = data.biome || "Wilderness";

    const hexSites = sites.filter((s) => s.canonicalKey === `${regionId}:${layerId}:${hg.q}:${hg.r}`);
    let name = hexSites[0]?.name || `${biome} ${hg.id}`;
    let landmark =
      hexSites[0]?.kind === "haven"
        ? havenProfile.landmark
        : hexSites[0]
          ? `${hexSites[0].name} (${hexSites[0].currentState})`
          : `Natural ${biome} landmark`;

    if (hg.id === "00") {
      name = havenProfile.name;
      landmark = havenProfile.landmark;
    }

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

    const publicSites: PublicSiteSummary[] = hexSites.map((s) => ({
      id: s.id,
      name: s.name,
      kind: s.kind,
      description: s.supportDependencies?.reasonForLocation,
      isSecret: s.visibility === "secret",
      visibility: s.visibility,
    }));

    const roadConn = myConnEntities.find((c) => c.kind === "road" || c.kind === "trail");
    const riverConn = myConnEntities.find((c) => c.kind === "river");

    let exitDestination: string | undefined;
    let horizonRumor: string | undefined;

    if (hg.id === "00") {
      horizonRumor = rumors[0]?.claim ?? "The tavern fire burns warm; scouts trade whispers of uncharted reaches.";
    } else if (hg.ring === 2) {
      if (connectionMode === "distant" && secondaryZoneId) {
        exitDestination = `➔ Voyage to ${secondaryProfile.name} (16 watches)`;
        horizonRumor = `Sea lanes lead beyond the horizon to ${secondaryProfile.name}.`;
      } else if (isBorder && secondaryZoneId && data.zoneId === secondaryZoneId) {
        exitDestination = `➔ Into ${secondaryProfile.name}`;
        horizonRumor = `Trail continues into ${secondaryProfile.name} territory.`;
      } else {
        exitDestination = `➔ Outward to ${prof.name} Frontier`;
        horizonRumor = `Wandering tinkers warn that beyond this perimeter lies deep wilderness.`;
      }
    }

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
  }

  // Populate regionHexes with ALL structural hexes (G1 persistence)
  for (const [, d] of translatedHexData) {
    const hSites = sites.filter((s) => s.canonicalKey === `${regionId}:${layerId}:${d.q}:${d.r}`);
    const name = hSites[0]?.name || `${d.biome || "Wilderness"} (${d.q},${d.r})`;
    const landmark =
      hSites[0]?.kind === "haven"
        ? havenProfile.landmark
        : hSites[0]
          ? `${hSites[0].name} (${hSites[0].currentState})`
          : `Natural ${d.biome || "Wilderness"} landmark`;

    regionHexes.push({
      canonicalKey: `${regionId}:${layerId}:${d.q}:${d.r}`,
      regionId,
      layerId,
      q: d.q,
      r: d.r,
      terrain: d.biome || "Wilderness",
      elevation: d.elevation,
      depth: 0,
      moisture: d.moisture,
      primaryZone: d.zoneId,
      secondaryZone: isBorder ? secondaryZoneId : undefined,
      threatTier:
        d.q === 0 && d.r === 0 ? 0 : Math.min(3, Math.max(1, Math.floor(axialDistance({ q: 0, r: 0 }, { q: d.q, r: d.r }) / 2))),
      name,
      landmark,
    });
  }

  // STAGE 14: Validation Checks (R3, R5, R6)
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
    if (countA < 4 || countB < 4) {
      warnings.push(`Border representation unbalanced: ${primaryZoneId}=${countA}, ${secondaryZoneId}=${countB}`);
      isValid = false;
    }
  }

  // Ensure Haven is present at (0,0) and safe
  const haven00 = initial19PublicHexes.find((h) => h.id === "00");
  if (!haven00 || haven00.threatTier !== 0) {
    warnings.push("Haven at 00 missing or dangerous");
    isValid = false;
  }

  // Ensure settlements are not placed in open water
  for (const s of sites) {
    if (s.kind === "settlement" || s.kind === "haven") {
      const parts = s.canonicalKey.split(":");
      if (parts[1] === "surface") {
        const d = translatedHexData.get(coordKey(Number(parts[2]), Number(parts[3])));
        if (d && d.elevation === 0) {
          warnings.push(`Settlement ${s.name} is placed in open water`);
          isValid = false;
        }
      }
    }
  }

  // Ensure foot/cart roads on surface do not run across open water
  for (const c of connections) {
    if (c.kind === "road" || c.kind === "trail") {
      const fromParts = c.fromKey.split(":");
      const toParts = c.toKey.split(":");
      if (fromParts[1] === "surface" && toParts[1] === "surface") {
        const fromData = translatedHexData.get(coordKey(Number(fromParts[2]), Number(fromParts[3])));
        const toData = translatedHexData.get(coordKey(Number(toParts[2]), Number(toParts[3])));
        if ((fromData && fromData.elevation === 0) || (toData && toData.elevation === 0)) {
          warnings.push(`Foot/cart route ${c.name} crosses open water`);
          isValid = false;
        }
      }
    }
  }

  // Vertical border validation: ensure subterranean hexes and shaft exist
  if (connectionMode === "vertical" && subterraneanZoneId) {
    const subHexes = regionHexes.filter((h) => h.layerId === "subterranean");
    const shaft = connections.find((c) => c.kind === "shaft");
    if (subHexes.length === 0 || !shaft) {
      warnings.push("Vertical border missing subterranean hexes or cross-layer shaft");
      isValid = false;
    }
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
    tavernEstablishment,
    adventurePath,
    validationReport: {
      valid: isValid,
      attempt,
      warnings,
      zoneCounts,
    },
  };
}
