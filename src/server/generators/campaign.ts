import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { rollDie, type RandomSource } from "../rules.js";
import type { CampaignPressure, PressureShape } from "../../shared/types.js";

interface CampaignOracleData {
  shapes: Array<{
    shape: PressureShape;
    description: string;
  }>;
  complications: string[];
}

let cachedCampaignData: CampaignOracleData | null = null;

function loadCampaignData(): CampaignOracleData {
  if (cachedCampaignData) return cachedCampaignData;
  const path = resolve("data/oracles/campaign.json");
  if (existsSync(path)) {
    cachedCampaignData = JSON.parse(readFileSync(path, "utf-8"));
  } else {
    cachedCampaignData = {
      shapes: [
        { shape: "countdown", description: "Fixed time or steps remaining before an inevitable occurrence." },
        { shape: "pursuit", description: "Distance between hunters and prey with gains and losses." },
        { shape: "race", description: "Multiple factions competing to achieve a milestone first." },
        { shape: "heat", description: "Escalating attention from law enforcement or syndicates." },
        { shape: "spread", description: "Geographic or contagion infection moving outward." },
        { shape: "mystery", description: "Clues accumulated toward uncovering a mastermind or hidden truth." },
        { shape: "opportunity", description: "A fleeting window of fortune closing as actions are taken." },
        { shape: "ladder", description: "Political hierarchy, reputation tiers, or faction standing." },
      ],
      complications: [
        "A supply line is severed by roving marauders.",
        "An unexpected weather anomaly delays travel by 1 day.",
        "A rival adventuring company arrives seeking the same bounty.",
        "A trusted merchant reveals they have been blackmailed by local syndicates.",
        "A planar tremor destabilizes arcane wards across the region.",
        "A dormant disease spreads from harvested monster carcasses.",
        "A local faction leader is replaced by a shadowy impostor.",
        "A hidden dungeon collapse exposes an unmapped deeper level.",
      ],
    };
  }
  return cachedCampaignData!;
}

export function generateCampaignComplication(
  activePressures: CampaignPressure[] = [],
  rng?: RandomSource,
): { complication: string; affectedPressure?: CampaignPressure } {
  const data = loadCampaignData();
  const cRoll = rollDie(data.complications.length, rng);
  const complication = data.complications[cRoll - 1] ?? data.complications[0];

  const affectedPressure =
    activePressures.length > 0
      ? activePressures[rollDie(activePressures.length, rng) - 1]
      : undefined;

  return {
    complication,
    affectedPressure,
  };
}

export function generateCampaignPressurePreset(
  shapeOption?: PressureShape,
  nameOption?: string,
  rng?: RandomSource,
): {
  name: string;
  shape: PressureShape;
  threshold: number;
  consequence: string;
} {
  const data = loadCampaignData();
  const shape =
    shapeOption ??
    data.shapes[rollDie(data.shapes.length, rng) - 1].shape;

  const presets: Record<PressureShape, { name: string; threshold: number; consequence: string }> = {
    countdown: {
      name: nameOption || "The Crimson Eclipse Approaches",
      threshold: 6,
      consequence: "Planar rift tears open across the active hex.",
    },
    pursuit: {
      name: nameOption || "Ash Rider Bounty Hunters",
      threshold: 5,
      consequence: "The hunters intercept and ambush the party during rest.",
    },
    race: {
      name: nameOption || "The Red Cartographers",
      threshold: 4,
      consequence: "Rivals claim and fortify the dungeon landmark first.",
    },
    heat: {
      name: nameOption || "Baronial Guard Suspicion",
      threshold: 5,
      consequence: "Bounty issued; sanctuary gates closed to party.",
    },
    spread: {
      name: nameOption || "Black River Spore Blight",
      threshold: 6,
      consequence: "Adjacent hex blighted, contaminating water and foraging.",
    },
    mystery: {
      name: nameOption || "The Faceless Syndicate Mastermind",
      threshold: 4,
      consequence: "The mastermind identity and base are revealed.",
    },
    opportunity: {
      name: nameOption || "Alchemical Caravan in Port",
      threshold: 3,
      consequence: "The merchant ships depart with their rare wares.",
    },
    ladder: {
      name: nameOption || "Standing with the Deep Delvers",
      threshold: 5,
      consequence: "Granted highest guild rank and secret shortcut maps.",
    },
  };

  const preset = presets[shape];
  return {
    ...preset,
    shape,
  };
}
