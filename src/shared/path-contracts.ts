import { z } from "zod";

// --- Treasure Quality & XP Guidance ---
export const TreasureQualitySchema = z.enum(["poor", "normal", "fabulous", "legendary"]);
export type TreasureQuality = z.infer<typeof TreasureQualitySchema>;

export const TREASURE_XP_BY_QUALITY: Record<TreasureQuality, number> = {
  poor: 0,
  normal: 1,
  fabulous: 3,
  legendary: 10,
};

// --- Currency Schema ---
export const CurrencySchema = z.object({
  cp: z.number().int().nonnegative().default(0),
  sp: z.number().int().nonnegative().default(0),
  gp: z.number().int().nonnegative().default(0),
});
export type Currency = z.infer<typeof CurrencySchema>;

// Convert all currency to copper pieces for exact integer math
export function currencyToCopper(c: Currency): number {
  return (c.gp ?? 0) * 100 + (c.sp ?? 0) * 10 + (c.cp ?? 0);
}

// Convert copper pieces back into gp, sp, cp
export function copperToCurrency(copper: number): Currency {
  const gp = Math.floor(copper / 100);
  const remainderAfterGp = copper % 100;
  const sp = Math.floor(remainderAfterGp / 10);
  const cp = remainderAfterGp % 10;
  return { gp, sp, cp };
}

// --- Encounter Group & Treasure Rolls ---
export const EncounterGroupPolicySchema = z.enum([
  "general_monster",
  "boss_hoard",
  "authored_cache",
]);
export type EncounterGroupPolicy = z.infer<typeof EncounterGroupPolicySchema>;

export const EncounterGroupMemberSchema = z.object({
  key: z.string(),
  name: z.string(),
  count: z.number().int().positive().default(1),
  level: z.number().int().positive().optional(),
});
export type EncounterGroupMember = z.infer<typeof EncounterGroupMemberSchema>;

export const EncounterGroupSchema = z.object({
  id: z.string(),
  campaignId: z.number().int(),
  siteId: z.string().nullable().optional(),
  roomId: z.number().int().nullable().optional(),
  name: z.string(),
  memberCount: z.number().int().positive(),
  members: z.array(EncounterGroupMemberSchema),
  policyType: EncounterGroupPolicySchema.default("general_monster"),
  guardingSourceId: z.string().nullable().optional(),
  status: z.enum(["active", "defeated", "avoided", "negotiated"]).default("active"),
});
export type EncounterGroup = z.infer<typeof EncounterGroupSchema>;

export const TreasureRollRecordSchema = z.object({
  id: z.number().int().optional(),
  campaignId: z.number().int(),
  groupId: z.string(),
  policySlot: z.string().default("carried_treasure"),
  policyVersion: z.string().default("v1"),
  seed: z.string(),
  roll: z.number().int().min(1).max(6),
  present: z.boolean(),
  sourceId: z.string().nullable(),
  tableBasis: z.string(),
  quality: TreasureQualitySchema,
  coins: CurrencySchema,
  items: z.array(z.string()),
  createdAt: z.string(),
});
export type TreasureRollRecord = z.infer<typeof TreasureRollRecordSchema>;

// --- Canonical Reward Source ---
export const RewardSourceTypeSchema = z.enum([
  "encounter_group",
  "authored_cache",
  "unguarded_treasure",
  "story_objective",
  "story_act",
  "boss_hoard",
  "legacy",
]);
export type RewardSourceType = z.infer<typeof RewardSourceTypeSchema>;

export const RewardSourceSchema = z.object({
  id: z.string(),
  campaignId: z.number().int(),
  sourceType: RewardSourceTypeSchema,
  sourceId: z.string(),
  quality: TreasureQualitySchema,
  xpValue: z.number().int().nonnegative(),
  coins: CurrencySchema,
  items: z.array(z.string()),
  status: z.enum(["unclaimed", "secured", "allocated"]).default("unclaimed"),
  accessState: z.enum(["unrevealed", "revealed", "accessible"]).default("unrevealed"),
  exclusionGroup: z.string().nullable().optional(),
  groupId: z.string().nullable().optional(),
  createdAt: z.string(),
});
export type RewardSource = z.infer<typeof RewardSourceSchema>;

// --- Progression & XP Recipients ---
export const XpAwardRecipientSchema = z.object({
  id: z.number().int().optional(),
  campaignId: z.number().int(),
  sourceId: z.string(),
  characterId: z.number().int(),
  awardSequence: z.number().int(),
  amount: z.number().int().positive(),
  levelBefore: z.number().int().positive(),
  xpBefore: z.number().int().nonnegative(),
  levelAfter: z.number().int().positive(),
  xpAfter: z.number().int().nonnegative(),
  resetLoss: z.number().int().nonnegative(),
  status: z.enum(["applied", "pending_choice"]).default("applied"),
  createdAt: z.string(),
});
export type XpAwardRecipient = z.infer<typeof XpAwardRecipientSchema>;

export const ProgressionRulesProfileSchema = z.object({
  maxLevel: z.number().int().min(1).default(10),
  xpAdvancementFactor: z.number().int().min(1).default(10),
  resetXpOnLevelUp: z.boolean().default(true),
  siteStoryXp: z.number().int().nonnegative().default(1),
  actStoryXp: z.number().int().nonnegative().default(3),
});
export type ProgressionRulesProfile = z.infer<typeof ProgressionRulesProfileSchema>;

export const DEFAULT_RULES_PROFILE: ProgressionRulesProfile = {
  maxLevel: 10,
  xpAdvancementFactor: 10,
  resetXpOnLevelUp: true,
  siteStoryXp: 1,
  actStoryXp: 3,
};

// --- Three Act Zones ---
export const ActZoneAssignmentSchema = z.object({
  act: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  zoneId: z.string(),
  name: z.string(),
  levelRange: z.tuple([z.number().int(), z.number().int()]),
  description: z.string(),
  transitionRoute: z
    .object({
      sourceZoneId: z.string(),
      targetZoneId: z.string(),
      mechanism: z.string(),
      fictionalReason: z.string(),
      requiredPreparation: z.string().optional(),
    })
    .optional(),
});
export type ActZoneAssignment = z.infer<typeof ActZoneAssignmentSchema>;

export const CampaignActPlanSchema = z
  .object({
    acts: z.tuple([
      ActZoneAssignmentSchema,
      ActZoneAssignmentSchema,
      ActZoneAssignmentSchema,
    ]),
  })
  .refine(
    (plan) => {
      const [a1, a2, a3] = plan.acts;
      return a1.zoneId !== a2.zoneId && a2.zoneId !== a3.zoneId && a1.zoneId !== a3.zoneId;
    },
    { message: "All 3 act zones must be pairwise distinct persistent zone instances" },
  );
export type CampaignActPlan = z.infer<typeof CampaignActPlanSchema>;

// --- Site Plan & Objective ---
export const SiteRoleSchema = z.enum([
  "discovery",
  "lead",
  "relay",
  "preparation",
  "countermeasure",
  "node",
  "finale",
  "optional",
]);
export type SiteRole = z.infer<typeof SiteRoleSchema>;

export const ObjectivePlanSchema = z.object({
  deedId: z.string(),
  title: z.string(),
  description: z.string(),
  approaches: z.array(z.string()).default(["combat", "negotiation", "stealth", "sabotage"]),
  storyXp: z.number().int().default(1),
});
export type ObjectivePlan = z.infer<typeof ObjectivePlanSchema>;

export const AuthoredCacheSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  quality: TreasureQualitySchema,
  xpValue: z.number().int().positive().optional(),
  coins: CurrencySchema.optional(),
  items: z.array(z.string()).optional(),
});
export type AuthoredCache = z.infer<typeof AuthoredCacheSchema>;

export const SitePlanSchema = z.object({
  id: z.string(),
  act: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  zoneId: z.string(),
  role: SiteRoleSchema,
  name: z.string(),
  purpose: z.string(),
  siteFamily: z.enum(["cave", "ruin", "tomb", "overland", "dungeon"]),
  objective: ObjectivePlanSchema,
  clues: z.array(z.string()),
  monsterGroupsCount: z.number().int().min(0).default(2),
  hasAuthoredCache: z.boolean().default(false),
  cacheQuality: TreasureQualitySchema.optional(),
  authoredCaches: z.array(AuthoredCacheSchema).optional(),
  bossHoard: z
    .object({
      quality: TreasureQualitySchema,
      xpValue: z.number().int().positive(),
      coins: CurrencySchema,
      items: z.array(z.string()),
    })
    .optional(),
});
export type SitePlan = z.infer<typeof SitePlanSchema>;

// --- Outcome Resolution ---
export const OutcomeResolutionSchema = z.object({
  campaignId: z.number().int(),
  deedId: z.string(),
  outcomeType: z.enum(["site_objective", "act_transition", "campaign_ending"]),
  approach: z.string(),
  notes: z.string().optional(),
  storyXpAwarded: z.number().int().nonnegative(),
  alreadyResolved: z.boolean(),
  recipientIds: z.array(z.number().int()),
});
export type OutcomeResolution = z.infer<typeof OutcomeResolutionSchema>;
