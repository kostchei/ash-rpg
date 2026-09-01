export type MindBelowStartingZoneId =
  | "cesspit_city"
  | "ashen_shire"
  | "red_spires";

export type MindBelowCaveZoneId =
  | "emberglass_tubes"
  | "living_sandstone"
  | "dust_sepulchres";

export type MindBelowEndZoneId =
  | "faerzress_sea"
  | "black_abyss"
  | "mireforge";

export type MindBelowZoneId =
  | MindBelowStartingZoneId
  | MindBelowCaveZoneId
  | MindBelowEndZoneId;

export type MindBelowRandomSource = (maxExclusive: number) => number;

export type EncounterIntensity =
  | "pressure"
  | "standard"
  | "dangerous"
  | "major";

export type HazardSeverity = "none" | "minor" | "major" | "extreme";

export type AquaticCapability =
  | "breathing"
  | "pressure"
  | "movement"
  | "navigation"
  | "communication"
  | "heat";

export type AquaticMethodId =
  | "water_breathing_spell"
  | "merfolk_blessing"
  | "sahuagin_blood_rite"
  | "kuo_toa_gill_charm"
  | "nautilus_vessel"
  | "maker_diving_armour"
  | "scum_adaptation"
  | "mucous_cloud";

export interface MindBelowZone<TId extends string> {
  id: TId;
  name: string;
  act: 1 | 2 | 3;
  levelRange: readonly [number, number];
  description: string;
  encounters: readonly string[];
}

export interface MindBelowProgress {
  reach: number;
  awakening: number;
  knowledge: number;
  access: number;
}

export interface MindBelowPath {
  pathId: "the_mind_below";
  startingZone: MindBelowZone<MindBelowStartingZoneId>;
  caveZone: MindBelowZone<MindBelowCaveZoneId>;
  endZone: MindBelowZone<MindBelowEndZoneId> & {
    requiredCapabilities: readonly AquaticCapability[];
  };
  progress: MindBelowProgress;
  installations: readonly ["chorus", "memory_well", "pressure_heart"];
}

export interface EncounterBudgetInput {
  characterLevels: readonly number[];
  retainerLevels?: readonly number[];
  intensity: EncounterIntensity;
  hazard?: HazardSeverity;
  objectiveBurden?: boolean;
}

export interface EncounterBudget {
  partySize: number;
  partyPower: number;
  averageCharacterLevel: number;
  encounterCeiling: number;
  hazardCost: number;
  monsterLevelBudget: number;
  maxActiveHostiles: number;
}

export interface GeneratedMindBelowEncounter {
  zoneId: MindBelowZoneId;
  zoneName: string;
  premise: string;
  budget: EncounterBudget;
}

export interface CharacterAquaticLoadout {
  characterId: string;
  personalMethods: readonly AquaticMethodId[];
}

export interface AquaticAccessResult {
  canEnter: boolean;
  missingByCharacter: Array<{
    characterId: string;
    missing: AquaticCapability[];
  }>;
}

export const MIND_BELOW_STARTING_ZONES: Readonly<
  Record<MindBelowStartingZoneId, MindBelowZone<MindBelowStartingZoneId>>
> = {
  cesspit_city: {
    id: "cesspit_city",
    name: "The Cesspit City",
    act: 1,
    levelRange: [1, 3],
    description:
      "A temperate city of dung, canals, poor inns, crooked guilds, and old waterworks.",
    encounters: [
      "A returned clerk destroys records of subterranean property.",
      "Night-soil carts conceal sedated captives and an amphibious handler.",
      "A dry corpse contains water in its lungs and mucus beneath its nails.",
      "Guests share a dream while a sleepwalker opens a door to the night.",
      "Scum try to seize a scholar rather than kill witnesses.",
      "A sealed cistern contains an abandoned psychic relay.",
    ],
  },
  ashen_shire: {
    id: "ashen_shire",
    name: "The Ashen Shire",
    act: 1,
    levelRange: [1, 3],
    description:
      "A rural district of hedgerows, sacred wells, abandoned mines, and witch trials.",
    encounters: [
      "A child hears predictions from the village well and is accused of witchcraft.",
      "An entire farm household calmly walked into a flooded quarry.",
      "Scum raid a prisoner escort to capture an herbalist with a mental ward.",
      "A changed farmer prepares his family for transport underground.",
      "A singing well gives orders in the voice of someone the listener trusts.",
      "Controlled villagers excavate a sealed passage under armed protection.",
    ],
  },
  red_spires: {
    id: "red_spires",
    name: "The Red Spires",
    act: 1,
    levelRange: [1, 3],
    description:
      "A red desert of decadent courts, mystical fortresses, and buried aqueducts.",
    encounters: [
      "A mirage shows the party performing actions they have not yet taken.",
      "An observatory vanishes from the memories of its only survivor.",
      "A controlled noble buys every cistern connected to an ancient channel.",
      "Masked revelers are evaluated for minds worth stealing.",
      "Bound elementals redirect water toward a buried gate.",
      "A glass well trades answers for childhood memories.",
    ],
  },
};

export const MIND_BELOW_CAVE_ZONES: Readonly<
  Record<MindBelowCaveZoneId, MindBelowZone<MindBelowCaveZoneId>>
> = {
  emberglass_tubes: {
    id: "emberglass_tubes",
    name: "The Emberglass Tubes",
    act: 2,
    levelRange: [4, 7],
    description:
      "Lava tubes of gems, metallic fungi, volcanic glass, toxic gas, and magma.",
    encounters: [
      "A gem seam repeats the final thoughts of dead miners.",
      "Cooling masks worn by controlled workers also transmit commands.",
      "A fungal forest demands a valuable memory for safe passage.",
      "Scum rupture their heated brine tank inside a narrow tube.",
      "A lava bridge can be redirected toward a psychic relay.",
      "A derro engineer has constructed a crude Nautilus.",
    ],
  },
  living_sandstone: {
    id: "living_sandstone",
    name: "The Living Sandstone",
    act: 2,
    levelRange: [4, 7],
    description:
      "Water-carved sandstone, running rivers, bats, slimes, fish, and complete ecosystems.",
    encounters: [
      "A bat colony forms words when seen from below.",
      "A slime contains a living messenger and an intact gill charm.",
      "Kuo-toa carry a captive whose dreams are making a minor god.",
      "A river reverses direction when the Savant issues a command.",
      "Sahuagin hunters mistake the party for Scum collaborators.",
      "Something can close the far gate of a short submerged passage.",
    ],
  },
  dust_sepulchres: {
    id: "dust_sepulchres",
    name: "The Dust Sepulchres",
    act: 2,
    levelRange: [4, 7],
    description:
      "Dry tomb tunnels haunted by demons, spirits, and mummified dead.",
    encounters: [
      "A mummy recognizes a character as a priest who died centuries ago.",
      "Controlled excavators break a seal to question the demon behind it.",
      "A spirit offers a mental ward in return for a character's voice.",
      "Murals depict the Savant under names from successive civilizations.",
      "A dry fountain trades water for a surrendered memory.",
      "A funerary barge begins sailing across sand when its rites are completed.",
    ],
  },
};

export const MIND_BELOW_END_ZONES: Readonly<
  Record<
    MindBelowEndZoneId,
    MindBelowZone<MindBelowEndZoneId> & {
      requiredCapabilities: readonly AquaticCapability[];
    }
  >
> = {
  faerzress_sea: {
    id: "faerzress_sea",
    name: "The Faerzress Sea",
    act: 3,
    levelRange: [8, 10],
    description:
      "A roofed subterranean sea surrounded by settlements and teleportation-warping faerzress.",
    requiredCapabilities: ["breathing"],
    encounters: [
      "A settlement is split between free citizens and controlled relatives.",
      "Every divination identifies a different lair.",
      "Duergar pressure armour contains hidden obedience runes.",
      "A new kuo-toa god can shield minds but demands worship.",
      "A free Scum community refuses an unwanted cure.",
      "An aboleth lieutenant rules through a beloved mortal mayor.",
    ],
  },
  black_abyss: {
    id: "black_abyss",
    name: "The Black Abyss",
    act: 3,
    levelRange: [8, 10],
    description:
      "An ultra-deep trench of crushing pressure, alien animals, luminous plants, and vertical ruins.",
    requiredCapabilities: ["breathing", "pressure", "navigation"],
    encounters: [
      "The descent crosses layers of increasingly hostile pressure.",
      "A blind predator follows psychic activity.",
      "A ruined station records the Savant's arrival.",
      "Controlled whales carry soldiers and fortifications.",
      "Luminous plants display stolen memories.",
      "The Nautilus cannot enter the final narrow trench.",
    ],
  },
  mireforge: {
    id: "mireforge",
    name: "The Mireforge",
    act: 3,
    levelRange: [8, 10],
    description:
      "A turbulent muddy basin of volcanic vents, mineral clouds, ash, and earthquakes.",
    requiredCapabilities: ["breathing", "heat", "navigation"],
    encounters: [
      "A volcanic plume separates the party and carries distant voices.",
      "Scum maintain psychic towers around a caldera.",
      "A mudslide exposes a city erased from history.",
      "Sahuagin launch a suicidal offensive.",
      "A Nautilus becomes trapped above an opening fissure.",
      "Clearing the Savant's sensory mud awakens something beneath it.",
    ],
  },
};

export const AQUATIC_METHODS: Readonly<
  Record<
    AquaticMethodId,
    {
      name: string;
      scope: "personal" | "party";
      capabilities: readonly AquaticCapability[];
      temporary?: boolean;
    }
  >
> = {
  water_breathing_spell: {
    name: "Water-breathing spell",
    scope: "party",
    capabilities: ["breathing"],
    temporary: true,
  },
  merfolk_blessing: {
    name: "Merfolk blessing",
    scope: "personal",
    capabilities: ["breathing", "movement", "communication"],
  },
  sahuagin_blood_rite: {
    name: "Sahuagin blood rite",
    scope: "personal",
    capabilities: ["breathing", "pressure", "movement"],
  },
  kuo_toa_gill_charm: {
    name: "Kuo-toa gill charm",
    scope: "personal",
    capabilities: ["breathing"],
  },
  nautilus_vessel: {
    name: "Nautilus vessel",
    scope: "party",
    capabilities: ["breathing", "pressure", "movement", "navigation", "heat"],
  },
  maker_diving_armour: {
    name: "Maker diving armour",
    scope: "personal",
    capabilities: ["breathing", "pressure", "heat"],
  },
  scum_adaptation: {
    name: "Scum adaptation",
    scope: "personal",
    capabilities: ["breathing", "pressure", "movement"],
  },
  mucous_cloud: {
    name: "Mucous Cloud Water-Lung",
    scope: "personal",
    capabilities: ["breathing"],
    temporary: true,
  },
};

const INTENSITY_MULTIPLIER: Record<EncounterIntensity, number> = {
  pressure: 0.5,
  standard: 1,
  dangerous: 1.5,
  major: 2,
};

function requireCharacterLevels(levels: readonly number[]): void {
  if (levels.length < 1 || levels.length > 6)
    throw new Error("The active party must contain 1–6 characters");
  if (levels.some((level) => !Number.isInteger(level) || level < 1))
    throw new Error("Character levels must be positive integers");
}

export function calculatePartyPower(
  characterLevels: readonly number[],
  retainerLevels: readonly number[] = [],
): number {
  requireCharacterLevels(characterLevels);
  if (retainerLevels.some((level) => !Number.isInteger(level) || level < 1))
    throw new Error("Retainer levels must be positive integers");

  return (
    characterLevels.reduce((total, level) => total + level, 0) +
    retainerLevels.reduce((total, level) => total + Math.floor(level / 2), 0)
  );
}

export function calculateMindBelowEncounterBudget(
  input: EncounterBudgetInput,
): EncounterBudget {
  const retainerLevels = input.retainerLevels ?? [];
  const partyPower = calculatePartyPower(input.characterLevels, retainerLevels);
  const partySize = input.characterLevels.length;
  const averageCharacterLevel =
    input.characterLevels.reduce((total, level) => total + level, 0) /
    partySize;
  const encounterCeiling = Math.max(
    1,
    Math.floor(partyPower * INTENSITY_MULTIPLIER[input.intensity]),
  );

  const hazardCostBySeverity: Record<HazardSeverity, number> = {
    none: 0,
    minor: Math.max(1, Math.ceil(averageCharacterLevel / 2)),
    major: Math.max(1, Math.ceil(averageCharacterLevel)),
    extreme: Math.max(1, Math.ceil(averageCharacterLevel * 2)),
  };
  const hazardCost = Math.min(
    encounterCeiling,
    hazardCostBySeverity[input.hazard ?? "none"],
  );
  const afterHazard = Math.max(0, encounterCeiling - hazardCost);
  const monsterLevelBudget = input.objectiveBurden
    ? Math.floor(afterHazard * 0.75)
    : afterHazard;

  return {
    partySize,
    partyPower,
    averageCharacterLevel,
    encounterCeiling,
    hazardCost,
    monsterLevelBudget,
    maxActiveHostiles: partySize + 1,
  };
}

export function createMindBelowPath(options: {
  startingZone: MindBelowStartingZoneId;
  caveZone: MindBelowCaveZoneId;
  endZone: MindBelowEndZoneId;
}): MindBelowPath {
  return {
    pathId: "the_mind_below",
    startingZone: MIND_BELOW_STARTING_ZONES[options.startingZone],
    caveZone: MIND_BELOW_CAVE_ZONES[options.caveZone],
    endZone: MIND_BELOW_END_ZONES[options.endZone],
    progress: { reach: 0, awakening: 0, knowledge: 0, access: 0 },
    installations: ["chorus", "memory_well", "pressure_heart"],
  };
}

function pick<T>(values: readonly T[], rng: MindBelowRandomSource): T {
  const index = rng(values.length);
  if (!Number.isInteger(index) || index < 0 || index >= values.length)
    throw new Error("Random source returned an out-of-range index");
  return values[index];
}

export function generateMindBelowPath(
  rng: MindBelowRandomSource = (maxExclusive) =>
    Math.floor(Math.random() * maxExclusive),
): MindBelowPath {
  return createMindBelowPath({
    startingZone: pick(
      Object.keys(MIND_BELOW_STARTING_ZONES) as MindBelowStartingZoneId[],
      rng,
    ),
    caveZone: pick(
      Object.keys(MIND_BELOW_CAVE_ZONES) as MindBelowCaveZoneId[],
      rng,
    ),
    endZone: pick(
      Object.keys(MIND_BELOW_END_ZONES) as MindBelowEndZoneId[],
      rng,
    ),
  });
}

export function getMindBelowZone(
  zoneId: MindBelowZoneId,
): MindBelowZone<MindBelowZoneId> {
  if (zoneId in MIND_BELOW_STARTING_ZONES)
    return MIND_BELOW_STARTING_ZONES[zoneId as MindBelowStartingZoneId];
  if (zoneId in MIND_BELOW_CAVE_ZONES)
    return MIND_BELOW_CAVE_ZONES[zoneId as MindBelowCaveZoneId];
  return MIND_BELOW_END_ZONES[zoneId as MindBelowEndZoneId];
}

export function generateMindBelowEncounter(
  input: EncounterBudgetInput & { zoneId: MindBelowZoneId },
  rng: MindBelowRandomSource = (maxExclusive) =>
    Math.floor(Math.random() * maxExclusive),
): GeneratedMindBelowEncounter {
  const zone = getMindBelowZone(input.zoneId);
  return {
    zoneId: input.zoneId,
    zoneName: zone.name,
    premise: pick(zone.encounters, rng),
    budget: calculateMindBelowEncounterBudget(input),
  };
}

export function updateMindBelowProgress(
  current: MindBelowProgress,
  changes: Partial<MindBelowProgress>,
): MindBelowProgress {
  const clamp = (value: number) => Math.min(6, Math.max(0, value));
  const result = { ...current };

  for (const key of ["reach", "awakening", "knowledge", "access"] as const) {
    const delta = changes[key];
    if (delta === undefined) continue;
    if (!Number.isInteger(delta)) throw new Error("Progress changes must be integers");
    result[key] = clamp(current[key] + delta);
  }

  return result;
}

export function evaluateAquaticAccess(input: {
  endZone: MindBelowEndZoneId;
  characters: readonly CharacterAquaticLoadout[];
  partyMethods?: readonly AquaticMethodId[];
}): AquaticAccessResult {
  if (input.characters.length < 1 || input.characters.length > 6)
    throw new Error("Aquatic access must be checked for 1–6 characters");
  const required = MIND_BELOW_END_ZONES[input.endZone].requiredCapabilities;
  const partyMethods = input.partyMethods ?? [];
  const partyCapabilities = new Set<AquaticCapability>();

  for (const methodId of partyMethods) {
    const method = AQUATIC_METHODS[methodId];
    if (method.scope !== "party")
      throw new Error(`${method.name} must be assigned to an individual character`);
    method.capabilities.forEach((capability) => partyCapabilities.add(capability));
  }

  const missingByCharacter = input.characters.flatMap((character) => {
    const capabilities = new Set(partyCapabilities);
    for (const methodId of character.personalMethods) {
      const method = AQUATIC_METHODS[methodId];
      if (method.scope !== "personal")
        throw new Error(`${method.name} must be assigned as a party method`);
      method.capabilities.forEach((capability) => capabilities.add(capability));
    }
    const missing = required.filter((capability) => !capabilities.has(capability));
    return missing.length > 0 ? [{ characterId: character.characterId, missing }] : [];
  });

  return { canEnter: missingByCharacter.length === 0, missingByCharacter };
}

export function getMindBelowBossStructure(partySize: number): {
  activeLieutenants: number;
  reinforcementWaves: number;
  lairEffect: "none" | "intermittent" | "active";
  reducedTempo: boolean;
} {
  if (!Number.isInteger(partySize) || partySize < 1 || partySize > 6)
    throw new Error("Boss scaling supports 1–6 characters");

  if (partySize === 1)
    return {
      activeLieutenants: 0,
      reinforcementWaves: 0,
      lairEffect: "intermittent",
      reducedTempo: true,
    };
  if (partySize === 2)
    return {
      activeLieutenants: 1,
      reinforcementWaves: 0,
      lairEffect: "none",
      reducedTempo: false,
    };
  if (partySize <= 4)
    return {
      activeLieutenants: Math.floor(partySize / 2),
      reinforcementWaves: 0,
      lairEffect: "intermittent",
      reducedTempo: false,
    };
  return {
    activeLieutenants: Math.floor(partySize / 2),
    reinforcementWaves: 1,
    lairEffect: "active",
    reducedTempo: false,
  };
}
