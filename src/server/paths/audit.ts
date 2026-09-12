import {
  type ProgressionRulesProfile,
  DEFAULT_RULES_PROFILE,
} from "../../shared/path-contracts.js";
import type { Character } from "../../shared/types.js";
import { createRandomSource } from "../generators/prng.js";
import { applyXpEvent } from "../rewards/progression.js";
import { resolveGroupTreasure } from "../rewards/treasure.js";
import { generateUnguardedTreasure } from "../rewards/core-treasure.js";
import { roomFeature } from "../room-features.js";
import { siteRoomCount } from "../generators/site-layout.js";
import { buildCampaignPlan } from "./campaign-plan.js";

export interface AuditSimulationConfig {
  pathId?: string;
  iterations?: number;
  partySize?: number;
  accessRate?: number;
  explorationRate?: number;
  baseSeed?: string;
  profile?: ProgressionRulesProfile;
}

export interface SingleRunResult {
  runIndex: number;
  seed: string;
  finaleEntryLevel: number;
  finaleEntryXp: number;
  completionLevel: number;
  completionXp: number;
  totalTreasureXpEarned: number;
  totalStoryXpEarned: number;
  totalResetLoss: number;
  reachedLevel9BeforeFinale: boolean;
  reachedLevel10AtSuccess: boolean;
  positiveDropsCount: number;
  negativeDropsCount: number;
}

export interface AuditSummaryReport {
  pathId: string;
  totalRuns: number;
  partySize: number;
  accessRate: number;
  explorationRate: number;
  level9FinaleSuccessRate: number;
  level10CompletionSuccessRate: number;
  percentiles: {
    finaleEntryLevel: { p5: number; p50: number; p95: number };
    completionLevel: { p5: number; p50: number; p95: number };
    resetLoss: { p5: number; p50: number; p95: number };
  };
  averageDropsCount: { positive: number; negative: number; total: number };
  underLevelFinaleRuns: SingleRunResult[];
}

function computePercentile(values: number[], percentile: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.floor((percentile / 100) * sorted.length)),
  );
  return sorted[index];
}

/**
 * Runs seeded Monte Carlo progression simulations using production code.
 * Evaluates drop probabilities (p = 0.5), treasure quality distribution,
 * site/act story XP (+1/+3), exploration/access rates, and advancement reset losses.
 */
export function runPathProgressionAudit(
  config: AuditSimulationConfig = {},
): AuditSummaryReport {
  const pathId = config.pathId ?? "the_mind_below";
  const iterations = config.iterations ?? 1000;
  const partySize = config.partySize ?? 4;
  const accessRate = config.accessRate ?? 0.90;
  const explorationRate = config.explorationRate ?? 0.95;
  const baseSeed = config.baseSeed ?? "audit_sim_seed";
  const profile = config.profile ?? DEFAULT_RULES_PROFILE;

  const runs: SingleRunResult[] = [];

  for (let i = 0; i < iterations; i++) {
    const runSeed = `${baseSeed}_run_${i}`;
    const runRng = createRandomSource(runSeed);

    const plan = buildCampaignPlan(pathId, { seed: runSeed });

    let char: Character = {
      id: 1,
      name: `Adventurer_${i}`,
      ancestry: "Human",
      className: "Fighter",
      level: 1,
      hp: 10,
      maxHp: 10,
      ac: 14,
      gold: 20,
      gearSlots: 10,
      abilities: { str: 14, dex: 10, con: 12, int: 10, wis: 10, cha: 10 },
      anchors: { homeland: "Borderlands", landmark: "Keep", nemesis: "Rival" },
      xp: 0,
    };

    let totalTreasureXp = 0;
    let totalStoryXp = 0;
    let totalResetLoss = 0;
    let positiveDrops = 0;
    let negativeDrops = 0;

    let finaleEntryLevel = 1;
    let finaleEntryXp = 0;

    // Separate sites by act
    const actSites = {
      1: plan.sites.filter((s) => s.act === 1),
      2: plan.sites.filter((s) => s.act === 2),
      3: plan.sites.filter((s) => s.act === 3),
    };

    for (const actNum of [1, 2, 3] as const) {
      const sites = actSites[actNum];

      for (let sIdx = 0; sIdx < sites.length; sIdx++) {
        const site = sites[sIdx];
        const isFinaleSite = actNum === 3 && site.role === "finale";

        // If about to enter the finale encounter in Act 3, record entry stats
        if (isFinaleSite) {
          finaleEntryLevel = char.level;
          finaleEntryXp = char.xp ?? 0;
        }

        // Exploration check
        const isExplored = (runRng(100) / 100) < explorationRate;
        if (!isExplored && !isFinaleSite) {
          continue;
        }

        // Walk the site's areas exactly as materializeSitePlan does: the site's
        // own d6 size roll sets how many areas there are, and each area rolls a
        // d10 feature. Monster areas register a group and make its one 50%
        // carried-treasure roll; treasure areas hold an unguarded find rolled on
        // the discovering character's table. The adventure's own caches are
        // placed separately, below, and are not competing for those areas.
        const authoredCaches =
          site.authoredCaches && site.authoredCaches.length > 0
            ? site.authoredCaches
            : site.hasAuthoredCache && site.cacheQuality
            ? [{ quality: site.cacheQuality, xpValue: undefined as number | undefined }]
            : [];

        const roomCount = siteRoomCount(runRng(6) + 1);
        const monsterLevel = actNum === 1 ? 2 : actNum === 2 ? 5 : 8;

        for (let room = 0; room < roomCount; room++) {
          const feature = roomFeature(runRng(10) + 1);

          if (feature === "solo_monster" || feature === "monster_mob" || feature === "boss_monster") {
            const groupId = `${site.id}_rm${room}`;
            const treasureResult = resolveGroupTreasure(
              groupId,
              monsterLevel,
              `${runSeed}_${groupId}`,
              runRng,
              isFinaleSite && feature === "boss_monster" ? "boss_hoard" : "general_monster",
            );

            if (!treasureResult.present) {
              negativeDrops++;
              continue;
            }
            positiveDrops++;
            const isAccessed = (runRng(100) / 100) < accessRate;
            if (isAccessed && treasureResult.xpValue > 0) {
              const prog = applyXpEvent(char, treasureResult.xpValue, profile, runRng);
              char = prog.character;
              totalTreasureXp += treasureResult.xpValue;
              totalResetLoss += prog.resetLoss;
            }
            continue;
          }

          if (feature !== "treasure") continue;

          // An unguarded find, rolled on the discovering character's table. This
          // is on top of the adventure's own placed caches, below.
          const isAccessed = (runRng(100) / 100) < accessRate;
          if (!isAccessed) continue;
          const findXp = generateUnguardedTreasure(char.level, runRng).xpValue;
          if (findXp === 0) continue;

          const prog = applyXpEvent(char, findXp, profile, runRng);
          char = prog.character;
          totalTreasureXp += findXp;
          totalResetLoss += prog.resetLoss;
        }

        // The adventure's own caches are placed content and are always in the
        // site, whatever the room features rolled.
        for (const authored of authoredCaches) {
          const isAccessed = (runRng(100) / 100) < accessRate;
          if (!isAccessed) continue;
          const cacheXp =
            authored.xpValue ??
            (authored.quality === "legendary" ? 10 : authored.quality === "fabulous" ? 3 : 1);
          const prog = applyXpEvent(char, cacheXp, profile, runRng);
          char = prog.character;
          totalTreasureXp += cacheXp;
          totalResetLoss += prog.resetLoss;
        }

        // 3. Site objective story XP (+1)
        const isObjectiveCompleted = (runRng(100) / 100) < accessRate;
        if (isObjectiveCompleted) {
          const prog = applyXpEvent(char, profile.siteStoryXp, profile, runRng);
          char = prog.character;
          totalStoryXp += profile.siteStoryXp;
          totalResetLoss += prog.resetLoss;
        }

        // 4. If finale site, claim boss hoard upon victory!
        if (isFinaleSite && site.bossHoard) {
          const prog = applyXpEvent(char, site.bossHoard.xpValue, profile, runRng);
          char = prog.character;
          totalTreasureXp += site.bossHoard.xpValue;
          totalResetLoss += prog.resetLoss;
        }
      }

      // Act transition story XP (+3)
      const prog = applyXpEvent(char, profile.actStoryXp, profile, runRng);
      char = prog.character;
      totalStoryXp += profile.actStoryXp;
      totalResetLoss += prog.resetLoss;
    }

    const runResult: SingleRunResult = {
      runIndex: i,
      seed: runSeed,
      finaleEntryLevel,
      finaleEntryXp,
      completionLevel: char.level,
      completionXp: char.xp ?? 0,
      totalTreasureXpEarned: totalTreasureXp,
      totalStoryXpEarned: totalStoryXp,
      totalResetLoss,
      reachedLevel9BeforeFinale: finaleEntryLevel >= 9,
      reachedLevel10AtSuccess: char.level >= 10,
      positiveDropsCount: positiveDrops,
      negativeDropsCount: negativeDrops,
    };

    runs.push(runResult);
  }

  const level9SuccessCount = runs.filter((r) => r.reachedLevel9BeforeFinale).length;
  const level10SuccessCount = runs.filter((r) => r.reachedLevel10AtSuccess).length;

  const finaleLevels = runs.map((r) => r.finaleEntryLevel);
  const completionLevels = runs.map((r) => r.completionLevel);
  const resetLosses = runs.map((r) => r.totalResetLoss);

  const avgPos = runs.reduce((acc, r) => acc + r.positiveDropsCount, 0) / runs.length;
  const avgNeg = runs.reduce((acc, r) => acc + r.negativeDropsCount, 0) / runs.length;

  return {
    pathId,
    totalRuns: runs.length,
    partySize,
    accessRate,
    explorationRate,
    level9FinaleSuccessRate: level9SuccessCount / runs.length,
    level10CompletionSuccessRate: level10SuccessCount / runs.length,
    percentiles: {
      finaleEntryLevel: {
        p5: computePercentile(finaleLevels, 5),
        p50: computePercentile(finaleLevels, 50),
        p95: computePercentile(finaleLevels, 95),
      },
      completionLevel: {
        p5: computePercentile(completionLevels, 5),
        p50: computePercentile(completionLevels, 50),
        p95: computePercentile(completionLevels, 95),
      },
      resetLoss: {
        p5: computePercentile(resetLosses, 5),
        p50: computePercentile(resetLosses, 50),
        p95: computePercentile(resetLosses, 95),
      },
    },
    averageDropsCount: {
      positive: avgPos,
      negative: avgNeg,
      total: avgPos + avgNeg,
    },
    underLevelFinaleRuns: runs.filter((r) => !r.reachedLevel9BeforeFinale).slice(0, 5),
  };
}

export function formatAuditMarkdown(report: AuditSummaryReport): string {
  return `# Progression Audit Report: ${report.pathId}

- **Total Simulations**: ${report.totalRuns} runs
- **Active Party Size**: ${report.partySize} characters
- **Standard Exploration Rate**: ${(report.explorationRate * 100).toFixed(1)}%
- **Treasure/Clue Access Rate**: ${(report.accessRate * 100).toFixed(1)}%
- **Level 9 Finale Entry Rate**: ${(report.level9FinaleSuccessRate * 100).toFixed(2)}% (Target: $\\ge 95\\%$)
- **Level 10 Campaign Success Rate**: ${(report.level10CompletionSuccessRate * 100).toFixed(2)}% (Target: $\\ge 95\\%$)

## Percentiles

| Metric | 5th Percentile | 50th Percentile (Median) | 95th Percentile |
| --- | ---: | ---: | ---: |
| **Finale Entry Level** | Level ${report.percentiles.finaleEntryLevel.p5} | Level ${report.percentiles.finaleEntryLevel.p50} | Level ${report.percentiles.finaleEntryLevel.p95} |
| **Completion Level** | Level ${report.percentiles.completionLevel.p5} | Level ${report.percentiles.completionLevel.p50} | Level ${report.percentiles.completionLevel.p95} |
| **Reset Losses (XP)** | ${report.percentiles.resetLoss.p5} XP | ${report.percentiles.resetLoss.p50} XP | ${report.percentiles.resetLoss.p95} XP |

## Encounter Group Loot Drops (50% Bernoulli)

- Average Positive Finds (Real Treasure $\\ge 1$ XP): ${report.averageDropsCount.positive.toFixed(1)}
- Average Empty Rolls (Durable Zero Drop): ${report.averageDropsCount.negative.toFixed(1)}
- Real-Treasure Drop Fraction: ${((report.averageDropsCount.positive / Math.max(1, report.averageDropsCount.total)) * 100).toFixed(1)}% (Nominal target: 50.0%)
`;
}
