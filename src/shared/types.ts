export type Role = "host" | "player";
export type RevealState =
  | "unexplored"
  | "rumored"
  | "scouted"
  | "explored"
  | "fully_mapped";

export type CampaignPhase = "sanctuary" | "hexcrawl" | "dungeon";

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

export interface PublicHex {
  id: string;
  ring: number;
  q: number;
  r: number;
  revealState: RevealState;
  name?: string;
  biome?: string;
  threatTier?: number;
  landmark?: string;
  road?: string;
  river?: string;
  horizonRumor?: string;
  exitDestination?: string;
  elevation?: number;
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
