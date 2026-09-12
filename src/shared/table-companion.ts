import { ITEMS } from "./content.js";
import type { Character, CombatState, InventoryItem } from "./types.js";

export const MONSTER_SEAT = "monsters";
export function abilityMod(score: number): number {
  return score <= 3 ? -4 : score <= 5 ? -3 : score <= 8 ? -2 : score <= 11 ? 0 : score <= 13 ? 1 : score <= 15 ? 2 : score <= 17 ? 3 : 4;
}
export function weaponReference(
  character: {
    abilities: { str: number; dex: number };
    level: number;
    className: string;
    classChoices?: Record<string, any>;
    talents?: string[];
  },
  weapon: InventoryItem,
  mastered = false,
) {
  const definition = ITEMS.find((item) => item.id === weapon.itemId);
  const properties = weapon.properties ?? definition?.properties ?? [];
  const isRanged = properties.includes("ranged");
  const isFinesse = properties.includes("finesse");
  const str = abilityMod(character.abilities.str);
  const dex = abilityMod(character.abilities.dex);

  const statAtk = isRanged ? dex : isFinesse ? Math.max(str, dex) : str;
  const statDmg = isRanged ? 0 : isFinesse ? Math.max(str, dex) : str;

  const isFighter = character.className.toLowerCase() === "fighter";
  const mastery =
    mastered ||
    (isFighter && character.classChoices?.masteredWeapon === weapon.itemId);

  let attackBonus = statAtk + (mastery ? 1 : 0);
  let damageBonus = statDmg + (mastery ? 1 + Math.floor(character.level / 3) : 0);

  const talents = character.talents ?? [];
  for (const t of talents) {
    const tl = t.toLowerCase();
    if (tl.includes("+1 to melee and ranged attack rolls")) attackBonus += 1;
    if (tl.includes("+1 to melee and ranged damage rolls")) damageBonus += 1;
    if (tl.includes("+1 to attack rolls with ranged or finesse weapons") && (isRanged || isFinesse)) attackBonus += 1;
  }

  return {
    attackBonus,
    damageBonus,
    damageDie: weapon.damage ?? definition?.damage ?? "1d4",
  };
}
export function combatSeats(combat: CombatState): string[] {
  const available = [...combat.combatants.filter(c => c.kind === "pc").map(c => c.id), ...(combat.combatants.some(c => c.kind === "monster") ? [MONSTER_SEAT] : [])];
  const requested = (combat.seatingOrder ?? []).map(id => combat.combatants.find(c => c.id === id)?.kind === "monster" ? MONSTER_SEAT : id);
  return [...new Set([...requested, ...available])].filter(id => available.includes(id));
}
export function seatIndex(combat: CombatState, seat: string): number {
  return combat.combatants.findIndex(c => seat === MONSTER_SEAT ? c.kind === "monster" : c.id === seat);
}
export function activeSeat(combat: CombatState): string | undefined {
  const actor = combat.combatants[combat.activeIndex];
  return actor?.kind === "monster" ? MONSTER_SEAT : actor?.id;
}
export function projectCombat(combat: CombatState | null): CombatState | null {
  return combat && { ...combat, combatants: combat.combatants.map(c => c.kind === "pc" ? c : {
    ...c, ac: c.acRevealed ? c.ac : 0,
    currentHp: c.currentHp < c.maxHp / 2 ? c.currentHp : 0,
    maxHp: c.currentHp < c.maxHp / 2 ? c.maxHp : 0,
  }) };
}
