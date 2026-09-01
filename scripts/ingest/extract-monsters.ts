import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { loadExtractedPdf, type ExtractedPdf, type ParsedMonsterStatBlock } from "./lib/pages.js";

export interface MonsterSchema {
  id: string;
  name: string;
  source: string;
  family?: string;
  level: number;
  ac: number;
  hp: number;
  morale: number;
  attacks: string[];
  move: string;
  abilities: {
    str: number;
    dex: number;
    con: number;
    int: number;
    wis: number;
    cha: number;
  };
  alignment: "L" | "N" | "C" | "U";
  traits: string[];
  loreTiers: {
    common: string;
    field: string;
    obscure: string;
    arcane: string;
  };
  harvest: Array<{
    reagent: string;
    dc: number;
    effect: string;
  }>;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function generateLoreTiers(name: string, level: number, flavor: string, traits: string[]): {
  common: string;
  field: string;
  obscure: string;
  arcane: string;
} {
  const traitSummary = traits.length > 0 ? traits[0] : "Known for dangerous physical ferocity.";
  return {
    common: flavor || `A level ${level} threat known in frontier folklore.`,
    field: `Tactical combat behavior: ${traitSummary}`,
    obscure: `Vulnerabilities, hunting grounds, or behavioral instincts documented by master rangers and delvers.`,
    arcane: `Alchemical compositions, planar ties, or ancient origins dating back to the primordial era.`,
  };
}

function generateHarvest(name: string, level: number, traits: string[]): Array<{ reagent: string; dc: number; effect: string }> {
  const dc = Math.min(18, 10 + Math.floor(level / 2));
  return [
    {
      reagent: `${name} Pelt / Chitin / Essence`,
      dc,
      effect: `Alchemical ingredient useful in crafting potions or enchanting warding gear.`,
    },
  ];
}

export function extractShadowdarkCoreMonsters(): MonsterSchema[] {
  const pdf = loadExtractedPdf("Shadowdark_RPG_-_V4-8.json");
  const monsterPages = pdf.pages.filter((p) => p.page_num >= 198 && p.page_num <= 269);
  const combinedText = monsterPages.map((p) => p.text).join("\n\n");

  // Map TOC families
  const tocEntries: Array<{ title: string; page: number; family?: string }> = [];
  let currentFamily: string | undefined = undefined;
  for (let i = 0; i < pdf.toc.length; i++) {
    const [depth, title, page] = pdf.toc[i];
    if (page >= 198 && page <= 269 && title !== "Monster Statistics") {
      const next = pdf.toc[i + 1];
      if (next && next[0] > depth) {
        currentFamily = title;
      } else {
        tocEntries.push({
          title,
          page,
          family: depth === 4 ? currentFamily : undefined,
        });
      }
    }
  }

  const statRegex = /AC\s+(\d+),\s*HP\s+(\d+),\s*ATK\s+([\s\S]+?),\s*MV\s+([\s\S]+?),\s*S\s+([+-]?\d+),\s*D\s+([+-]?\d+),\s*C\s+([+-]?\d+),\s*I\s+([+-]?\d+),\s*W\s+([+-]?\d+),\s*Ch\s+([+-]?\d+),\s*AL\s+([LNCU]),\s*LV\s+(\d+)/gi;

  const matches = [...combinedText.matchAll(statRegex)];
  const monsters: MonsterSchema[] = [];
  const seenIds = new Set<string>();

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const matchIndex = match.index ?? 0;
    const ac = parseInt(match[1], 10);
    const hp = parseInt(match[2], 10);
    const atkRaw = match[3].replace(/\s+/g, " ").trim();
    const mv = match[4].replace(/\s+/g, " ").trim();
    const str = parseInt(match[5], 10);
    const dex = parseInt(match[6], 10);
    const con = parseInt(match[7], 10);
    const int = parseInt(match[8], 10);
    const wis = parseInt(match[9], 10);
    const cha = parseInt(match[10], 10);
    const alignment = match[11].toUpperCase() as "L" | "N" | "C" | "U";
    const level = parseInt(match[12], 10);

    const textBefore = combinedText.slice(i === 0 ? 0 : (matches[i - 1].index ?? 0) + matches[i - 1][0].length, matchIndex).trim();
    const linesBefore = textBefore.split("\n").map((l) => l.trim()).filter(Boolean);

    let name = "UNKNOWN";
    let flavor = "";

    if (linesBefore.length > 0) {
      let nameIndex = -1;
      for (let j = linesBefore.length - 1; j >= 0; j--) {
        const line = linesBefore[j];
        if (line.length >= 2 && line === line.toUpperCase() && !line.includes("TABLE") && !line.includes("CHAPTER") && !line.startsWith("PAGE") && !/^\d+$/.test(line)) {
          nameIndex = j;
          break;
        }
      }

      if (nameIndex !== -1) {
        name = linesBefore[nameIndex];
        flavor = linesBefore.slice(nameIndex + 1).join(" ");
      } else {
        name = linesBefore[0];
        flavor = linesBefore.slice(1).join(" ");
      }
    }

    name = name.replace(/^\d+\s*/, "").replace(/[,\.]/g, "").trim();
    if (!name || name === "UNKNOWN" || name.length < 2) {
      continue;
    }

    const nextStart = i + 1 < matches.length ? (matches[i + 1].index ?? combinedText.length) : combinedText.length;
    const textAfter = combinedText.slice(matchIndex + match[0].length, nextStart).trim();
    const traitLines = textAfter.split("\n").map((l) => l.trim()).filter(Boolean);
    const traits: string[] = [];
    let currentTrait = "";

    for (const line of traitLines) {
      if (i + 1 === matches.length && line.length >= 2 && line === line.toUpperCase() && !line.endsWith(".")) {
        break;
      }
      if (/^[A-Z][a-zA-Z\s\-]+(?:\.|\:)/.test(line)) {
        if (currentTrait) traits.push(currentTrait);
        currentTrait = line;
      } else if (currentTrait) {
        currentTrait += " " + line;
      } else {
        currentTrait = line;
      }
    }
    if (currentTrait) traits.push(currentTrait);

    let id = slugify(name);
    if (seenIds.has(id)) {
      id = `${id}_${level}`;
    }
    seenIds.add(id);

    // Check TOC for family
    const matchedToc = tocEntries.find((t) => t.title.toLowerCase() === name.toLowerCase());
    const family = matchedToc?.family;

    const attacks = atkRaw.split(/\s+or\s+|\s*,\s*(?=\d+\s)/i).map((a) => a.trim());
    const morale = Math.min(12, Math.max(5, 7 + Math.floor(level / 2) + Math.max(0, cha)));

    monsters.push({
      id,
      name,
      source: "shadowdark_core",
      family,
      level,
      ac,
      hp,
      morale,
      attacks,
      move: mv,
      abilities: { str, dex, con, int, wis, cha },
      alignment,
      traits,
      loreTiers: generateLoreTiers(name, level, flavor, traits),
      harvest: generateHarvest(name, level, traits),
    });
  }

  return monsters;
}

export function extractCursedScrollMonsters(zineNumber: number, filename: string, startPage: number, endPage: number): MonsterSchema[] {
  const pdf = loadExtractedPdf(filename);
  const monsterPages = pdf.pages.filter((p) => p.page_num >= startPage && p.page_num <= endPage);
  const combinedText = monsterPages.map((p) => p.text).join("\n\n");

  const statRegex = /AC\s+(\d+),\s*HP\s+(\d+),\s*ATK\s+([\s\S]+?),\s*MV\s+([\s\S]+?),\s*S\s+([+-]?\d+),\s*D\s+([+-]?\d+),\s*C\s+([+-]?\d+),\s*I\s+([+-]?\d+),\s*W\s+([+-]?\d+),\s*Ch\s+([+-]?\d+),\s*AL\s+([LNCU]),\s*LV\s+(\d+)/gi;

  const matches = [...combinedText.matchAll(statRegex)];
  const monsters: MonsterSchema[] = [];
  const sourceName = `cursed_scroll_${zineNumber}`;

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const matchIndex = match.index ?? 0;
    const ac = parseInt(match[1], 10);
    const hp = parseInt(match[2], 10);
    const atkRaw = match[3].replace(/\s+/g, " ").trim();
    const mv = match[4].replace(/\s+/g, " ").trim();
    const str = parseInt(match[5], 10);
    const dex = parseInt(match[6], 10);
    const con = parseInt(match[7], 10);
    const int = parseInt(match[8], 10);
    const wis = parseInt(match[9], 10);
    const cha = parseInt(match[10], 10);
    const alignment = match[11].toUpperCase() as "L" | "N" | "C" | "U";
    const level = parseInt(match[12], 10);

    const textBefore = combinedText.slice(i === 0 ? 0 : (matches[i - 1].index ?? 0) + matches[i - 1][0].length, matchIndex).trim();
    const linesBefore = textBefore.split("\n").map((l) => l.trim()).filter(Boolean);

    let name = "UNKNOWN";
    let flavor = "";

    if (linesBefore.length > 0) {
      let nameIndex = -1;
      for (let j = linesBefore.length - 1; j >= 0; j--) {
        const line = linesBefore[j];
        if (line.length >= 2 && line === line.toUpperCase() && !line.includes("TABLE") && !line.includes("CHAPTER") && !line.startsWith("PAGE") && !/^\d+$/.test(line)) {
          nameIndex = j;
          break;
        }
      }

      if (nameIndex !== -1) {
        name = linesBefore[nameIndex];
        flavor = linesBefore.slice(nameIndex + 1).join(" ");
      } else {
        name = linesBefore[0];
        flavor = linesBefore.slice(1).join(" ");
      }
    }

    name = name.replace(/^\d+\s*/, "").replace(/[,\.]/g, "").trim();
    if (!name || name === "UNKNOWN" || name.length < 2) {
      continue;
    }

    const nextStart = i + 1 < matches.length ? (matches[i + 1].index ?? combinedText.length) : combinedText.length;
    const textAfter = combinedText.slice(matchIndex + match[0].length, nextStart).trim();
    const traitLines = textAfter.split("\n").map((l) => l.trim()).filter(Boolean);
    const traits: string[] = [];
    let currentTrait = "";

    for (const line of traitLines) {
      if (/^[A-Z][a-zA-Z\s\-]+(?:\.|\:)/.test(line)) {
        if (currentTrait) traits.push(currentTrait);
        currentTrait = line;
      } else if (currentTrait) {
        currentTrait += " " + line;
      } else {
        currentTrait = line;
      }
    }
    if (currentTrait) traits.push(currentTrait);

    const id = slugify(name);
    const attacks = atkRaw.split(/\s+or\s+|\s*,\s*(?=\d+\s)/i).map((a) => a.trim());
    const morale = Math.min(12, Math.max(5, 7 + Math.floor(level / 2) + Math.max(0, cha)));

    monsters.push({
      id,
      name,
      source: sourceName,
      level,
      ac,
      hp,
      morale,
      attacks,
      move: mv,
      abilities: { str, dex, con, int, wis, cha },
      alignment,
      traits,
      loreTiers: generateLoreTiers(name, level, flavor, traits),
      harvest: generateHarvest(name, level, traits),
    });
  }

  return monsters;
}

export function runMonsterIngestion(): {
  core: MonsterSchema[];
  cursedScrolls: MonsterSchema[];
  total: number;
} {
  console.log("Extracting monsters from Shadowdark Core...");
  const coreMonsters = extractShadowdarkCoreMonsters();
  console.log(`Extracted ${coreMonsters.length} core monsters.`);

  console.log("Extracting monsters from Cursed Scrolls 1-6...");
  const cs1 = extractCursedScrollMonsters(1, "Cursed_Scroll_1_-_Diablerie_V4-3.json", 45, 48);
  const cs2 = extractCursedScrollMonsters(2, "Cursed_Scroll_2_-_Red_Sands_V2-2.json", 39, 44);
  const cs3 = extractCursedScrollMonsters(3, "Cursed_Scroll_3_-_Midnight_Sun_V3-5.json", 43, 48);
  const cs4 = extractCursedScrollMonsters(4, "Cursed_Scroll_4_-_River_of_Night_V1-4.json", 59, 65);
  const cs5 = extractCursedScrollMonsters(5, "Cursed_Scroll_5_-_Dwellers_in_the_Deep_V1-3.json", 33, 36);
  const cs6 = extractCursedScrollMonsters(6, "Cursed_Scroll_6_-_City_of_Masks_V1-1.json", 67, 67);

  const csMonsters = [...cs1, ...cs2, ...cs3, ...cs4, ...cs5, ...cs6];
  console.log(`Extracted ${csMonsters.length} Cursed Scroll monsters.`);

  const allMonstersMap = new Map<string, MonsterSchema>();
  for (const m of [...coreMonsters, ...csMonsters]) {
    allMonstersMap.set(m.id, m);
  }
  const allMonsters = Array.from(allMonstersMap.values());

  const outDir = resolve("data/bestiary");
  mkdirSync(outDir, { recursive: true });

  writeFileSync(resolve(outDir, "shadowdark-core.json"), JSON.stringify(coreMonsters, null, 2), "utf-8");
  writeFileSync(resolve(outDir, "cursed-scrolls.json"), JSON.stringify(csMonsters, null, 2), "utf-8");
  writeFileSync(resolve(outDir, "monsters.json"), JSON.stringify(allMonsters, null, 2), "utf-8");

  console.log(`Saved ${allMonsters.length} total monsters to data/bestiary/monsters.json.`);
  return { core: coreMonsters, cursedScrolls: csMonsters, total: allMonsters.length };
}

if (process.argv[1]?.endsWith("extract-monsters.ts")) {
  runMonsterIngestion();
}
