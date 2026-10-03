import type { CursedZoneId } from './types.js';
import type { SiteNameStyle } from './site-name-qualifiers.js';

export const DOSSIER_REQUIREMENTS = ['vampire', 'seawolf', 'demon_lord', 'giant'] as const;
export type DossierRequirement = typeof DOSSIER_REQUIREMENTS[number];
export type Provenance = 'input' | 'selected' | 'generated' | 'source' | 'unresolved';
export interface DossierInput {
  title: string; zoneId: CursedZoneId; seed: string; minimumLevel: number;
  maximumLevel?: number; monsterKeys?: string[];
  namingStyle?: SiteNameStyle;
  counts: { sites: number; encounters: number; npcs: number; treasures: number };
  required: DossierRequirement[]; allowProxies: boolean;
}
export interface DossierField { label: string; value: string; provenance: Provenance; source: string }
export interface DossierCard { id: string; category: 'site' | 'encounter' | 'npc' | 'treasure'; title: string; fields: DossierField[] }
export interface DossierReport {
  version: 1; input: DossierInput; zoneName: string;
  coverage: { requirement: string; status: 'met' | 'proxy' | 'unresolved'; detail: string }[];
  cards: DossierCard[]; raw: unknown;
  story: DossierField[];
  exportId?: string;
}
