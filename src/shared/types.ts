export type Role = "host" | "player";
export type RevealState =
  | "unexplored"
  | "rumored"
  | "scouted"
  | "explored"
  | "fully_mapped";

export type CampaignPhase = "sanctuary" | "hexcrawl" | "dungeon";

export type CursedZoneId =
  | "the_gloaming"
  | "red_sands"
  | "midnight_sun"
  | "river_of_night"
  | "dwellers_in_the_deep"
  | "city_of_masks"
  | "oakhaven_borderlands";

export type ConnectionMode = "surface" | "vertical" | "urban" | "distant";

export type RegionSelection =
  | { mode: "single"; zoneId: CursedZoneId }
  | {
      mode: "border";
      zoneIds: [CursedZoneId, CursedZoneId];
      connection: ConnectionMode;
      borderProfileId: string;
    };

export type Season = "spring" | "summer" | "autumn" | "winter";
export type SourceContentMode = "adapted" | "named";

export interface RegionGenerationConfig {
  selection: RegionSelection;
  seed?: string;
  initialRadius?: number;
  structuralRadius?: number;
  regionalHexMiles?: number;
  season?: Season;
  sourceContent?: SourceContentMode;
  rulesProfileId?: string;
}

export interface ZoneSummary {
  id: string;
  name: string;
  theme: string;
  biomePalette: string[];
}

export interface MonsterCatalogEntry {
  key: string;
  name: string;
  level?: number;
  family?: string;
}

export interface ZoneManifest extends ZoneSummary {
  hazardTable: string[];
  weatherTable: string[];
  wanderingMonsterTable: string[];
  factions: Array<{ name: string; disposition: string; notes: string }>;
  uniqueFloraFauna: string[];
  entryConditions: string;
  exitConditions: string;
}

export interface CampaignSummary {
  id: number;
  code: string;
  name: string;
  regionName: string;
  act: number;
  phase: CampaignPhase;
  activeZoneId: string;
  joinUrl: string;
  activeRegionId?: string;
  partyLocation?: { q: number; r: number; layerId?: string };
  homeLocation?: { q: number; r: number; layerId?: string };
}

export interface Character {
  id: number;
  name: string;
  ancestry: string;
  className: string;
  level: number;
  hp: number;
  maxHp: number;
  ac: number;
  gold: number;
  gearSlots: number;
  abilities: Record<"str" | "dex" | "con" | "int" | "wis" | "cha", number>;
  anchors: { homeland: string; landmark: string; nemesis: string };
  talents?: string[];
  xp?: number;
  ownerToken?: string;
}

export interface PublicConnectionSummary {
  id: string;
  fromId: string;
  toId: string;
  kind: "road" | "trail" | "river" | "canal" | "ferry" | "sea_lane" | "shaft" | "cave_passage" | "voyage";
  name: string;
  costWatches: number;
  crossingMethod?: "ford" | "bridge" | "ferry" | "boat" | "climb";
}

export interface PublicSiteSummary {
  id: string;
  name: string;
  kind: "haven" | "settlement" | "ruin" | "fort" | "entrance" | "sanctuary" | "resource" | "shrine" | "district";
  description?: string;
  isSecret?: boolean;
}

export interface PublicHex {
  id: string;
  ring: number;
  q: number;
  r: number;
  revealState: RevealState;
  canonicalKey?: string;
  primaryZone?: string;
  secondaryZone?: string;
  name?: string;
  biome?: string;
  threatTier?: number;
  landmark?: string;
  road?: string;
  river?: string;
  horizonRumor?: string;
  exitDestination?: string;
  elevation?: number;
  connections?: PublicConnectionSummary[];
  sites?: PublicSiteSummary[];
}

export interface RegionEntity {
  id: string;
  campaignId: number;
  selection: RegionSelection;
  seed: string;
  generatorVersion: string;
  contentVersion: string;
  rulesVersion: string;
  attempt: number;
  revision: number;
  active: boolean;
  createdAt: string;
}

export interface RegionLayer {
  regionId: string;
  layerId: string;
  kind: "surface" | "subterranean" | "urban_inset";
  scale: number;
  depthContext?: string;
}

export interface RegionHex {
  canonicalKey: string;
  regionId: string;
  layerId: string;
  q: number;
  r: number;
  terrain: string;
  elevation: number;
  depth: number;
  moisture: number;
  primaryZone: string;
  secondaryZone?: string;
  threatTier: number;
  name: string;
  landmark?: string;
}

export interface SiteEntity {
  id: string;
  regionId: string;
  canonicalKey: string;
  kind: "haven" | "settlement" | "ruin" | "fort" | "entrance" | "sanctuary" | "resource" | "shrine" | "district";
  name: string;
  currentState: string;
  ownerFactionId?: string;
  supportDependencies?: {
    waterSource?: string;
    foodProvenance?: string;
    reasonForLocation?: string;
    vulnerability?: string;
  };
  historyRefIds?: string[];
  visibility: "visible" | "hidden" | "secret";
}

export interface ConnectionEntity {
  id: string;
  regionId: string;
  fromKey: string;
  toKey: string;
  kind: "road" | "trail" | "river" | "canal" | "ferry" | "sea_lane" | "shaft" | "cave_passage" | "voyage";
  name: string;
  direction: "undirected" | "downstream" | "forward";
  modes: string[];
  costWatches: number;
  crossingMethod?: "ford" | "bridge" | "ferry" | "boat" | "climb";
  requirements?: string[];
  physicalFeatureId?: string;
  ownerFactionId?: string;
}

export interface HistoricalEvent {
  id: string;
  regionId: string;
  sequence: number;
  name: string;
  summary: string;
  affectedEntityIds: string[];
  consequences: string[];
}

export interface FactionPresence {
  id: string;
  regionId: string;
  factionId: string;
  name: string;
  disposition: string;
  locationKey: string;
  assetOrRole: string;
  strengthOrControl: string;
  agenda: string;
}

export interface RumorRecord {
  id: string;
  regionId: string;
  originSiteId: string;
  targetSiteId: string;
  claim: string;
  accuracy: "true" | "distorted" | "false";
  directionHint: string;
}

export interface DungeonRoom {
  id: number;
  sequence: number;
  geometry: string;
  contents: string;
  interaction: string;
  exits: number;
  trap?: { name: string; trigger: string; effect: string; dc: number };
  createdAt: string;
}

export interface EncounterMonster {
  id: number;
  monsterKey: string;
  name: string;
  currentHp: number;
  maxHp: number;
  loreTier: number;
  ac?: number;
  morale?: number;
  level?: number;
  family?: string;
  move?: string;
  abilities?: Record<"str" | "dex" | "con" | "int" | "wis" | "cha", number>;
  alignment?: string;
  attacks?: string[];
  traits?: string[];
  lore?: string[];
  harvest?: Array<{ reagent: string; dc: number; effect: string }>;
  isVariant?: boolean;
  variantQuality?: string;
  variantStrength?: string;
  variantWeakness?: string;
}

export interface Encounter {
  id: number;
  name: string;
  status: "active" | "resolved";
  monsters: EncounterMonster[];
  createdAt: string;
}

export type PressureShape =
  | "countdown"
  | "pursuit"
  | "race"
  | "heat"
  | "spread"
  | "mystery"
  | "opportunity"
  | "ladder";

export interface CampaignPressure {
  id: number;
  name: string;
  shape: PressureShape;
  current: number;
  threshold: number;
  consequence: string;
  status: "active" | "resolved";
}

export interface RollRecord {
  id: number;
  campaignId?: number;
  actor: string;
  kind: string;
  label: string;
  dice: string;
  total: number;
  detail: string;
  createdAt: string;
}

export interface WikiNote {
  id: number;
  section: string;
  title: string;
  body: string;
  createdAt: string;
}

export interface CampaignState {
  campaign: CampaignSummary;
  me: { role: Role; characterId: number | null };
  characters: Character[];
  hexes: PublicHex[];
  rooms: DungeonRoom[];
  encounters: Encounter[];
  pressures: CampaignPressure[];
  rolls: RollRecord[];
  notes: WikiNote[];
  activeZone?: ZoneManifest;
  availableZones?: ZoneSummary[];
}

export interface SessionIdentity {
  code: string;
  role: Role;
  token: string;
}

export interface SettlementResult {
  scale: {
    name: string;
    population: string;
    defense: string;
    services: string;
  };
  tavern: {
    name: string;
    vibe: string;
  };
  rumor: {
    rumor: string;
    authenticity: string;
  };
}

export interface NpcResult {
  name?: string;
  ancestry: string;
  isWildcardAncestry: boolean;
  className: string;
  isWildcardClass: boolean;
  zoneSubclass?: string;
  demeanor: string;
  quirk: string;
  motive: string;
  interaction: string;
  retainerStats: {
    level: number;
    hp: number;
    morale: number;
    dailyWage: string;
  };
}
