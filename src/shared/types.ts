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
  | "city_of_masks";

export type ConnectionMode = "surface" | "vertical" | "urban" | "distant";

export type RegionSelection =
  | { mode: "single"; zoneId: CursedZoneId }
  | {
      mode: "border";
      zoneIds: [CursedZoneId, CursedZoneId];
      connection: ConnectionMode;
      borderProfileId?: string;
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

export interface SiteDiscovery {
  campaignId: number;
  siteId: string;
  discoveredAt: string;
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

export interface ExpeditionObjective {
  leadId?: string;
  title: string;
  targetHexId?: string;
  targetSiteId?: string;
  directionHint?: string;
  notes?: string;
}

export interface TavernLead {
  id: string;
  title: string;
  claim: string;
  source: string;
  targetHexId: string;
  targetSiteId: string;
  directionHint: string;
  dangerHint: string;
  preparationHint: string;
  accuracy: "true" | "distorted" | "false";
  isPathLead?: boolean;
  isFollowUp?: boolean;
}

export interface TavernEstablishment {
  name: string;
  vibe: string;
  barkeep: string;
  leads: TavernLead[];
}

export interface PublicAdventurePathSummary {
  pathId: string;
  name: string;
  activeSituation?: {
    title: string;
    premise: string;
    status: "active" | "resolved" | "neglected";
    knownClues: string[];
  } | null;
  narrativeTells: string[];
  revealedMethods: string[];
  hostDetails?: {
    startingZoneId: string;
    caveZoneId: string;
    endZoneId: string;
    progress: { reach: number; awakening: number; knowledge: number; access: number };
    toll: string[];
    resolvedDeeds: string[];
  };
}

export interface AdventurePathRecord {
  pathId: "the_mind_below" | string;
  name: string;
  startingZoneId: string;
  caveZoneId: string;
  endZoneId: string;
  progress: { reach: number; awakening: number; knowledge: number; access: number };
  installations: string[];
  resolvedDeeds: string[];
  toll: string[];
  aquaticMethodsRevealed: string[];
  activeSituation: {
    id: string;
    siteId: string;
    hexId: string;
    title: string;
    premise: string;
    npcName: string;
    status: "active" | "resolved" | "neglected";
    clues: string[];
    requiredDeed: string;
  } | null;
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
  day?: number;
  watch?: 1 | 2 | 3 | 4;
  watchesTraveledToday?: number;
  weather?: string;
  rations?: number;
  activeObjective?: ExpeditionObjective | null;
  activeSiteId?: string | null;
  tavernEstablishment?: TavernEstablishment | null;
  adventurePath?: PublicAdventurePathSummary | null;
  callerToken?: string | null;
  callerCharacterName?: string | null;
  revision?: number;
  activeSession?: ActivitySession | null;
  activeDungeon?: DungeonGraphState | null;
  activeCombat?: CombatState | null;
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
  fatigue?: number;
  ownerToken?: string;
  classId?: string;
  inventory?: InventoryItem[];
  spells?: CharacterSpell[];
  conditions?: string[];
  classChoices?: Record<string, any>;
  deathStrikes?: number;
  stabilized?: boolean;
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
  visibility?: "visible" | "hidden" | "secret";
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
  siteId?: string;
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
  me: { role: Role; characterId: number | null; isCaller?: boolean };
  characters: Character[];
  hexes: PublicHex[];
  rooms: DungeonRoom[];
  encounters: Encounter[];
  pressures: CampaignPressure[];
  rolls: RollRecord[];
  notes: WikiNote[];
  activeZone?: ZoneManifest;
  availableZones?: ZoneSummary[];
  activeSession?: ActivitySession | null;
  activeDungeon?: DungeonGraphState | null;
  activeCombat?: CombatState | null;
  rewards?: RewardRecord[];
}

export interface ItemDefinition {
  id: string;
  name: string;
  kind: "weapon" | "armor" | "shield" | "gear" | "consumable" | "valuable";
  costGp: number;
  slots: number;
  damage?: string;
  properties?: string[];
  baseAc?: number;
  acBonus?: number;
  maxDexMod?: number;
  description?: string;
}

export interface InventoryItem {
  /** Torches left in the currently opened bundle; absent means an unopened bundle of three. */
  remainingTorches?: number;
  instanceId: string;
  itemId: string;
  name: string;
  kind: "weapon" | "armor" | "shield" | "gear" | "consumable" | "valuable";
  slots: number;
  equipped?: boolean;
  quantity?: number;
  damage?: string;
  properties?: string[];
  baseAc?: number;
  acBonus?: number;
  maxDexMod?: number;
}

export interface SpellDefinition {
  id: string;
  name: string;
  tier: number;
  sphere: "arcane" | "divine" | "primal";
  range: "close" | "near" | "far" | "self" | "touch";
  duration: string;
  description: string;
}

export interface CharacterSpell {
  spellId: string;
  tier: number;
  available: boolean;
  penanceRequired?: boolean;
}

export interface ActivityChoice {
  characterId: number;
  characterName: string;
  activity: string;
  costGp?: number;
  details?: Record<string, any>;
}

export interface ActivitySession {
  id: string;
  campaignId: number;
  kind: "tavern" | "camp";
  status: "open" | "resolved";
  revision: number;
  choices: Record<string, ActivityChoice>;
  resolvedAt?: string;
  result?: any;
}

export interface DungeonRoomNode {
  feature?: "empty" | "trap" | "minor_hazard" | "solo_monster" | "npc" | "monster_mob" | "major_hazard" | "treasure" | "boss_monster";
  featureRoll?: number;
  resolution?: { outcome: string; notes: string };
  objective?: { title: string; deedId?: string; completed: boolean; notes?: string };
  id: number;
  title: string;
  x: number;
  y: number;
  geometry: string;
  contents: string;
  interaction: string;
  trap?: {
    name: string;
    trigger: string;
    effect: string;
    dc: number;
    spotted?: boolean;
    disarmed?: boolean;
  };
  encounter?: {
    encounterId?: number;
    monsterKey: string;
    name: string;
    count: number;
    defeated?: boolean;
  };
  treasure?: {
    access?: { method: string; notes: string };
    coins: number;
    items: string[];
    claimed?: boolean;
  };
  explored: boolean;
}

export interface DungeonConnectionEdge {
  fromRoomId: number;
  toRoomId: number;
  doorType: "open" | "wooden_door" | "iron_door" | "portcullis" | "secret";
  state: "open" | "closed" | "locked" | "stuck" | "barred";
}

export interface DungeonGraphState {
  siteId: string;
  campaignId: number;
  currentRoomId: number;
  entryRoomId: number;
  nodes: DungeonRoomNode[];
  edges: DungeonConnectionEdge[];
  explorationTurns: number;
  lightTurnsRemaining: number;
}

export interface Combatant {
  id: string;
  name: string;
  kind: "pc" | "monster";
  refId: number;
  initiative: number;
  ac: number;
  currentHp: number;
  maxHp: number;
  conditions: string[];
  deathStrikes?: number;
  stabilized?: boolean;
}

export interface CombatState {
  encounterId: number;
  campaignId: number;
  round: number;
  activeIndex: number;
  combatants: Combatant[];
  status: "active" | "resolved";
  moraleTriggerChecked?: boolean;
}

export interface RewardRecord {
  id: string;
  campaignId: number;
  sourceType: "dungeon_room" | "encounter" | "situation_deed";
  sourceId: string;
  coins: { cp?: number; sp?: number; gp?: number };
  items: string[];
  claimed: boolean;
  allocations: Record<string, { target: "party" | "character"; characterId?: number }>;
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
