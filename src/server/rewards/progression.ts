import {
  type Currency,
  type ProgressionRulesProfile,
  DEFAULT_RULES_PROFILE,
  currencyToCopper,
  copperToCurrency,
} from "../../shared/path-contracts.js";
import type { Character } from "../../shared/types.js";
import {
  abilityModifier,
  calculateCharacterHp,
  rollClassTalent,
  type RandomSource,
  systemRandom,
} from "../rules.js";

export interface ProgressionEventResult {
  character: Character;
  gainedLevels: number;
  resetLoss: number;
  totalXpAwarded: number;
  levelBefore: number;
  xpBefore: number;
  levelAfter: number;
  xpAfter: number;
  gainedHp: number;
  newTalents: Array<{ roll: number; effect: string }>;
  log: string;
}

/**
 * Returns the exact XP required to advance from currentLevel to currentLevel + 1.
 * Shadowdark Core: Level L requires L * 10 XP.
 */
export function calculateAdvancementRequirement(
  currentLevel: number,
  profile: ProgressionRulesProfile = DEFAULT_RULES_PROFILE,
): number {
  return currentLevel * profile.xpAdvancementFactor;
}

/**
 * Minimum lifetime cost to enter level N = 5 * N * (N - 1).
 */
export function calculateLifetimeXpForLevel(targetLevel: number): number {
  if (targetLevel <= 1) return 0;
  return 5 * targetLevel * (targetLevel - 1);
}

/**
 * Pure function applying an XP award event to a character.
 * Implements Shadowdark Core advancement rules:
 * - Level L requires L * 10 XP.
 * - On advancement, XP resets to 0. Excess XP is discarded (reset loss).
 * - Standard campaign path rules profile caps at level 10.
 */
export function applyXpEvent(
  character: Character,
  xpAmount: number,
  profile: ProgressionRulesProfile = DEFAULT_RULES_PROFILE,
  rng: RandomSource = systemRandom,
): ProgressionEventResult {
  const levelBefore = character.level;
  const xpBefore = character.xp ?? 0;

  if (xpAmount <= 0 || character.conditions?.includes("dead")) {
    return {
      character: { ...character },
      gainedLevels: 0,
      resetLoss: 0,
      totalXpAwarded: 0,
      levelBefore,
      xpBefore,
      levelAfter: levelBefore,
      xpAfter: xpBefore,
      gainedHp: 0,
      newTalents: [],
      log: "No progression applied.",
    };
  }

  let currentLevel = character.level;
  let currentXp = xpBefore + xpAmount;
  let gainedLevels = 0;
  let resetLoss = 0;
  let gainedHpTotal = 0;
  const newTalents: Array<{ roll: number; effect: string }> = [];
  const updatedTalents = [...(character.talents ?? [])];
  let currentMaxHp = character.maxHp;
  let currentHp = character.hp;

  // Check if character can level up
  while (currentLevel < profile.maxLevel) {
    const requiredXp = calculateAdvancementRequirement(currentLevel, profile);
    if (currentXp >= requiredXp) {
      // Level advancement occurs!
      const excess = currentXp - requiredXp;
      if (profile.resetXpOnLevelUp) {
        resetLoss += excess;
        currentXp = 0; // strict reset to zero
      } else {
        currentXp = excess;
      }

      currentLevel += 1;
      gainedLevels += 1;

      // HP calculation
      const conMod = abilityModifier(character.abilities.con);
      const highestScore = Math.max(
        character.abilities.str,
        character.abilities.dex,
        character.abilities.con,
        character.abilities.int,
        character.abilities.wis,
        character.abilities.cha,
      );
      const highestStatMod = abilityModifier(highestScore);

      const newMaxHp = calculateCharacterHp(
        character.className,
        currentLevel,
        conMod,
        highestStatMod,
        currentMaxHp,
        rng,
      );
      const gainedHp = newMaxHp - currentMaxHp;
      gainedHpTotal += gainedHp;
      currentMaxHp = newMaxHp;
      currentHp += gainedHp;

      // Odd-level talent roll (1, 3, 5, 7, 9)
      if (currentLevel % 2 === 1) {
        const talent = rollClassTalent(character.className, rng);
        newTalents.push({ roll: talent.roll, effect: talent.effect });
        updatedTalents.push(`[Lvl ${currentLevel}] ${talent.effect}`);
      }
    } else {
      break;
    }
  }

  // If at or above max level, clamp XP
  if (currentLevel >= profile.maxLevel) {
    const capRequired = calculateAdvancementRequirement(profile.maxLevel, profile);
    currentXp = Math.min(currentXp, capRequired);
  }

  const updatedCharacter: Character = {
    ...character,
    level: currentLevel,
    xp: currentXp,
    maxHp: currentMaxHp,
    hp: currentHp,
    talents: updatedTalents,
  };

  let log = `${character.name} received +${xpAmount} XP. (Now: Level ${currentLevel}, ${currentXp}/${calculateAdvancementRequirement(currentLevel, profile)} XP).`;
  if (gainedLevels > 0) {
    log += ` Advanced to Level ${currentLevel}! Gained +${gainedHpTotal} HP.`;
    if (resetLoss > 0) {
      log += ` (${resetLoss} XP lost to advancement threshold reset).`;
    }
    if (newTalents.length > 0) {
      log += ` Rolled Talents: ${newTalents.map((t) => t.effect).join("; ")}.`;
    }
  }

  return {
    character: updatedCharacter,
    gainedLevels,
    resetLoss,
    totalXpAwarded: xpAmount,
    levelBefore,
    xpBefore,
    levelAfter: currentLevel,
    xpAfter: currentXp,
    gainedHp: gainedHpTotal,
    newTalents,
    log,
  };
}

/**
 * Splits currency among party members using exact integer copper accounting.
 * Preserves leftover copper without fractional rounding loss.
 */
export function calculateSplitCurrency(
  currency: Currency,
  partySize: number,
): {
  perCharacter: Currency;
  remainder: Currency;
  copperPerChar: number;
  remainderCopper: number;
} {
  const safePartySize = Math.max(1, partySize);
  const totalCopper = currencyToCopper(currency);
  const copperPerChar = Math.floor(totalCopper / safePartySize);
  const remainderCopper = totalCopper % safePartySize;

  return {
    perCharacter: copperToCurrency(copperPerChar),
    remainder: copperToCurrency(remainderCopper),
    copperPerChar,
    remainderCopper,
  };
}
