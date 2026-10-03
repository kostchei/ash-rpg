export interface InventoryInput {
  id: string;
  traits: string[];
  move: string;
  ac: number;
  hp: number;
  attacks: string[];
}
export interface InventoryAbility {
  id: string;
  name: string;
  kind: string;
  references: Array<{ field: string; evidence: string }>;
}
export interface StockVulnerability {
  id: string;
  name: string;
  kind: string;
  effect: string;
  references: Array<{ field: string; evidence: string }>;
}
export function inventory(monster: InventoryInput): {
  abilities: InventoryAbility[];
  excluded: Array<{ field: string; evidence: string; reason: string }>;
  notes: string[];
  variants?: Array<{ name: string; extraAbilities: string[]; existingAbilityCount: number }>;
};
export function stockVulnerabilities(monster: InventoryInput): StockVulnerability[];
export function regenerationCounters(monster: InventoryInput): Array<{
  id: string; name: string; effect: string; references: Array<{ field: string; evidence: string }>;
}>;
