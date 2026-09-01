import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { loadExtractedPdf } from "./lib/pages.js";

export interface MonsterGeneratorRow {
  roll: number;
  combatOffset: number; // e.g. -3, -2, -1, 0, +1, +2, +3, +4
  quality: string;
  strength: string;
  weakness: string;
}

export interface MonsterGeneratorOracle {
  name: string;
  description: string;
  rows: MonsterGeneratorRow[];
}

export function extractMonsterGenerator(): MonsterGeneratorOracle {
  const pdf = loadExtractedPdf("Shadowdark_RPG_-_V4-8.json");
  const p194 = pdf.pages.find((p) => p.page_num === 194);
  if (!p194) {
    throw new Error("Page 194 not found in Shadowdark Core PDF");
  }

  const lines = p194.text.split("\n").map((l) => l.trim()).filter(Boolean);
  
  // Find where d20 table starts
  const d20Idx = lines.findIndex((l) => l === "d20");
  if (d20Idx === -1) throw new Error("d20 header not found");

  // Headers: d20, Combat, Quality, Strength, Weakness
  const tableLines = lines.slice(d20Idx + 5);
  const rows: MonsterGeneratorRow[] = [];

  let i = 0;
  while (i < tableLines.length) {
    const rollStr = tableLines[i];
    const roll = parseInt(rollStr, 10);
    if (isNaN(roll) || roll < 1 || roll > 20) {
      i++;
      continue;
    }
    const combatStr = tableLines[i + 1] ?? "";
    const quality = tableLines[i + 2] ?? "";
    const strength = tableLines[i + 3] ?? "";
    const weakness = tableLines[i + 4] ?? "";

    let combatOffset = 0;
    if (combatStr.includes("-")) {
      const match = combatStr.match(/-(\d+)/);
      combatOffset = match ? -parseInt(match[1], 10) : 0;
    } else if (combatStr.includes("+")) {
      const match = combatStr.match(/\+(\d+)/);
      combatOffset = match ? parseInt(match[1], 10) : 0;
    }

    rows.push({
      roll,
      combatOffset,
      quality,
      strength,
      weakness,
    });
    i += 5;
  }

  return {
    name: "Shadowdark Monster Generator",
    description: "d20 table for procedural monster variant generation based on party level (PL).",
    rows,
  };
}

export function runMonsterGeneratorExtraction() {
  const oracle = extractMonsterGenerator();
  const outDir = resolve("data/oracles");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(resolve(outDir, "monster-generator.json"), JSON.stringify(oracle, null, 2), "utf-8");
  console.log(`Saved Monster Generator oracle (${oracle.rows.length} rows) to data/oracles/monster-generator.json`);
}

if (process.argv[1]?.endsWith("extract-monster-generator.ts")) {
  runMonsterGeneratorExtraction();
}
