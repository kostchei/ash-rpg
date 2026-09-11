import type { AshDatabase } from "../database.js";
import {
  type Currency,
  type EncounterGroup,
  type EncounterGroupPolicy,
  type OutcomeResolution,
  type ProgressionRulesProfile,
  type RewardSource,
  DEFAULT_RULES_PROFILE,
  currencyToCopper,
} from "../../shared/path-contracts.js";
import type { Character, RewardRecord } from "../../shared/types.js";
import { resolveGroupTreasure } from "./treasure.js";
import { applyXpEvent, calculateSplitCurrency, type ProgressionEventResult } from "./progression.js";

export class RewardService {
  constructor(
    private db: AshDatabase,
    private rulesProfile: ProgressionRulesProfile = DEFAULT_RULES_PROFILE,
  ) {}

  /**
   * Registers a persistent encounter group and performs its single 50% carried-treasure roll.
   * Saved negative results are permanently recorded in SQLite.
   */
  registerEncounterGroup(
    campaignId: number,
    group: {
      id: string;
      siteId?: string | null;
      roomId?: number | null;
      name: string;
      members: Array<{ key: string; name: string; count?: number; level?: number }>;
      policyType?: EncounterGroupPolicy;
      guardingSourceId?: string | null;
    },
    seed?: string,
  ): { group: EncounterGroup; present: boolean; sourceId: string | null } {
    const existing = this.db.getEncounterGroup(campaignId, group.id);
    if (existing) {
      const existingRoll = this.db.getTreasureRoll(campaignId, group.id);
      return {
        group: existing,
        present: existingRoll?.present ?? false,
        sourceId: existingRoll?.sourceId ?? null,
      };
    }

    const memberCount = group.members.reduce((acc, m) => acc + (m.count ?? 1), 0);
    const encGroup: EncounterGroup = {
      id: group.id,
      campaignId,
      siteId: group.siteId,
      roomId: group.roomId,
      name: group.name,
      memberCount,
      members: group.members.map((m) => ({
        key: m.key,
        name: m.name,
        count: m.count ?? 1,
        level: m.level ?? 1,
      })),
      policyType: group.policyType ?? "general_monster",
      guardingSourceId: group.guardingSourceId,
      status: "active",
    };
    this.db.saveEncounterGroup(encGroup);

    // Roll carried treasure once using group seed
    const highestLevel = Math.max(...encGroup.members.map((m) => m.level ?? 1), 1);
    const resolved = resolveGroupTreasure(
      group.id,
      highestLevel,
      seed ?? `camp_${campaignId}_group_${group.id}`,
      undefined,
      encGroup.policyType,
    );

    let sourceId: string | null = null;
    if (resolved.present) {
      sourceId = `src_enc_${group.id}`;
      const rewardSource: RewardSource = {
        id: sourceId,
        campaignId,
        sourceType: "encounter_group",
        sourceId,
        quality: resolved.quality,
        xpValue: resolved.xpValue,
        coins: resolved.coins,
        items: resolved.items,
        status: "unclaimed",
        accessState: "unrevealed",
        groupId: group.id,
        createdAt: new Date().toISOString(),
      };
      this.db.saveRewardSource(rewardSource);
    }

    // Persist roll record (whether positive or negative)
    this.db.saveTreasureRoll({
      campaignId,
      groupId: group.id,
      policySlot: "carried_treasure",
      policyVersion: "v1",
      seed: seed ?? `camp_${campaignId}_group_${group.id}`,
      roll: resolved.roll,
      present: resolved.present,
      sourceId,
      tableBasis: resolved.tableBasis,
      quality: resolved.quality,
      coins: resolved.coins,
      items: resolved.items,
      createdAt: new Date().toISOString(),
    });

    return {
      group: encGroup,
      present: resolved.present,
      sourceId,
    };
  }

  /**
   * Secures a canonical reward source and awards full XP to active participants.
   * Atomically transitions source status and records per-character progression events.
   */
  secureRewardSource(
    campaignId: number,
    sourceId: string,
    activeCharacterIds?: number[],
  ): {
    secured: boolean;
    source: RewardSource | null;
    progressionResults: ProgressionEventResult[];
    rewardRecord: RewardRecord | null;
  } {
    const source = this.db.getRewardSource(campaignId, sourceId);
    if (!source) {
      return {
        secured: false,
        source: null,
        progressionResults: [],
        rewardRecord: null,
      };
    }

    if (source.status === "secured" || source.status === "allocated") {
      // Already secured; do not re-award XP
      const existingReward = this.db.getRewards(campaignId).find((r) => r.sourceId === sourceId) ?? null;
      return {
        secured: false,
        source,
        progressionResults: [],
        rewardRecord: existingReward,
      };
    }

    // Mark source as secured
    source.status = "secured";
    source.accessState = "accessible";
    this.db.saveRewardSource(source);

    // Identify active participants
    const state = this.db.getState(campaignId, "host", null, "");
    const participants = activeCharacterIds
      ? state.characters.filter((c) => activeCharacterIds.includes(c.id) && !c.conditions?.includes("dead"))
      : state.characters.filter((c) => !c.conditions?.includes("dead") && c.rosterStatus !== "reserve");

    const progressionResults: ProgressionEventResult[] = [];

    // Award full XP to each participant (not divided by party size)
    if (source.xpValue > 0 && participants.length > 0) {
      let awardSeq = 1;
      for (const char of participants) {
        const prog = applyXpEvent(char, source.xpValue, this.rulesProfile);
        this.db.updateCharacter(campaignId, prog.character);
        progressionResults.push(prog);

        this.db.recordXpAwardRecipient({
          campaignId,
          sourceId,
          characterId: char.id,
          awardSequence: awardSeq++,
          amount: source.xpValue,
          levelBefore: prog.levelBefore,
          xpBefore: prog.xpBefore,
          levelAfter: prog.levelAfter,
          xpAfter: prog.xpAfter,
          resetLoss: prog.resetLoss,
          status: "applied",
          createdAt: new Date().toISOString(),
        });
      }

      this.db.recordXpAward(
        campaignId,
        sourceId,
        source.xpValue,
        `Secured Treasure Find: ${source.quality.toUpperCase()} (${source.xpValue} XP)`,
        participants.map((c) => c.id),
      );
    }

    // Create or link RewardRecord in legacy rewards table for item/coin allocation
    const rewardRecord: RewardRecord = {
      id: `reward-${Date.now()}-${sourceId}`,
      campaignId,
      sourceType: source.sourceType as any,
      sourceId,
      coins: { cp: source.coins.cp, sp: source.coins.sp, gp: source.coins.gp },
      items: [...source.items],
      claimed: false,
      allocations: {},
      quality: source.quality,
      xpValue: source.xpValue,
      groupId: source.groupId ?? undefined,
    };
    this.db.saveReward(campaignId, rewardRecord);

    return {
      secured: true,
      source,
      progressionResults,
      rewardRecord,
    };
  }

  /**
   * Resolves a story deed or act transition atomically with deduplication.
   * Default: +1 XP per site objective, +3 XP per act completion.
   */
  resolveStoryAward(
    campaignId: number,
    deedId: string,
    outcomeType: "site_objective" | "act_transition" | "campaign_ending",
    approach: string = "table_ruling",
    notes?: string,
    activeCharacterIds?: number[],
  ): {
    alreadyResolved: boolean;
    storyXpAwarded: number;
    progressionResults: ProgressionEventResult[];
  } {
    if (this.db.isDeedResolved(campaignId, deedId) || this.db.isXpAwarded(campaignId, deedId)) {
      return {
        alreadyResolved: true,
        storyXpAwarded: 0,
        progressionResults: [],
      };
    }

    const storyXp =
      outcomeType === "act_transition"
        ? this.rulesProfile.actStoryXp
        : outcomeType === "campaign_ending"
        ? this.rulesProfile.actStoryXp
        : this.rulesProfile.siteStoryXp;

    const state = this.db.getState(campaignId, "host", null, "");
    const participants = activeCharacterIds
      ? state.characters.filter((c) => activeCharacterIds.includes(c.id) && !c.conditions?.includes("dead"))
      : state.characters.filter((c) => !c.conditions?.includes("dead") && c.rosterStatus !== "reserve");

    const progressionResults: ProgressionEventResult[] = [];

    if (storyXp > 0 && participants.length > 0) {
      let awardSeq = 1;
      for (const char of participants) {
        const prog = applyXpEvent(char, storyXp, this.rulesProfile);
        this.db.updateCharacter(campaignId, prog.character);
        progressionResults.push(prog);

        this.db.recordXpAwardRecipient({
          campaignId,
          sourceId: deedId,
          characterId: char.id,
          awardSequence: awardSeq++,
          amount: storyXp,
          levelBefore: prog.levelBefore,
          xpBefore: prog.xpBefore,
          levelAfter: prog.levelAfter,
          xpAfter: prog.xpAfter,
          resetLoss: prog.resetLoss,
          status: "applied",
          createdAt: new Date().toISOString(),
        });
      }

      this.db.recordXpAward(
        campaignId,
        deedId,
        storyXp,
        `Story Deed Accomplished: ${deedId} (+${storyXp} XP)`,
        participants.map((c) => c.id),
      );
    }

    const resolution: OutcomeResolution = {
      campaignId,
      deedId,
      outcomeType,
      approach,
      notes,
      storyXpAwarded: storyXp,
      alreadyResolved: false,
      recipientIds: participants.map((c) => c.id),
    };
    this.db.recordPathOutcome(campaignId, resolution);

    return {
      alreadyResolved: false,
      storyXpAwarded: storyXp,
      progressionResults,
    };
  }

  /**
   * Splits coins from a reward record with integer copper math, preserving leftovers.
   */
  splitRewardCoins(
    campaignId: number,
    rewardId: string,
  ): {
    success: boolean;
    copperPerChar: number;
    remainder: Currency;
    log: string;
  } {
    const rewards = this.db.getRewards(campaignId);
    const reward = rewards.find((r) => r.id === rewardId);
    if (!reward) throw new Error("Reward not found");

    const state = this.db.getState(campaignId, "host", null, "");
    const livingChars = state.characters.filter(
      (c) => !c.conditions?.includes("dead") && c.rosterStatus !== "reserve",
    );
    if (livingChars.length === 0) throw new Error("No living active party members to receive coins");

    const currentCurrency: Currency = {
      gp: reward.coins.gp ?? 0,
      sp: reward.coins.sp ?? 0,
      cp: reward.coins.cp ?? 0,
    };

    const { perCharacter, remainder, copperPerChar, remainderCopper } = calculateSplitCurrency(
      currentCurrency,
      livingChars.length,
    );

    // Update characters' gold based on their full copper share converted
    for (const char of livingChars) {
      // In Shadowdark gold is standard currency; convert copper to gp for character.gold
      const addedGp = perCharacter.gp + perCharacter.sp / 10 + perCharacter.cp / 100;
      this.db.updateCharacter(campaignId, {
        ...char,
        gold: Math.round((char.gold + addedGp) * 100) / 100,
      });
    }

    // Keep remainder in the reward record
    reward.coins = { cp: remainder.cp, sp: remainder.sp, gp: remainder.gp };
    reward.allocations["coins"] = { target: "party" };
    if (remainderCopper === 0 && (reward.items?.length ?? 0) === 0) {
      reward.claimed = true;
    }
    this.db.saveReward(campaignId, reward);

    return {
      success: true,
      copperPerChar,
      remainder,
      log: `Divided evenly among ${livingChars.length} members (${perCharacter.gp} gp, ${perCharacter.sp} sp, ${perCharacter.cp} cp each). Remainder: ${remainderCopper} cp.`,
    };
  }
}
