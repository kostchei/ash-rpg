export type Role = "host" | "player";
export type RevealState =
  | "unexplored"
  | "rumored"
  | "scouted"
  | "explored"
  | "fully_mapped";

export interface CampaignSummary {
  id: number;
  code: string;
  name: string;
  regionName: string;
  act: number;
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
  attacks?: string[];
  traits?: string[];
  lore?: string[];
}

export interface Encounter {
  id: number;
  name: string;
  status: "active" | "resolved";
  monsters: EncounterMonster[];
  createdAt: string;
}

export interface ThreatVector {
  id: number;
  key: string;
  name: string;
  shards: number;
  confirmed: boolean;
}

export interface RollRecord {
  id: number;
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
  threats: ThreatVector[];
  rolls: RollRecord[];
  notes: WikiNote[];
}

export interface SessionIdentity {
  code: string;
  role: Role;
  token: string;
}
