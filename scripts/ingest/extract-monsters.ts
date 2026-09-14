import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { loadExtractedPdf } from "./lib/pages.js";

/**
 * Stats-only bestiary record. Hand-authored lore, vulnerabilities, hooks and components
 * live in data/bestiary/profiles (see docs/plans/monster_knowledge_and_authoring.md),
 * so this script can always be re-run without losing authored content.
 */
export interface MonsterSchema {
  id: string;
  name: string;
  source: string;
  family: string;
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
}

interface SourceRange {
  filename: string;
  source: string;
  startPage: number;
  endPage: number;
  /** Match headings against leaf TOC titles in the page range (core rulebook only). */
  useToc: boolean;
}

const STATS_DIR = "data/bestiary/stats";
const FAMILY_MAP_PATH = "data/bestiary/family-map.json";

const CORE_RANGE: SourceRange = { filename: "Shadowdark_RPG_-_V4-8.json", source: "shadowdark_core", startPage: 198, endPage: 269, useToc: true };
const CURSED_SCROLL_RANGES: SourceRange[] = [
  { filename: "Cursed_Scroll_1_-_Diablerie_V4-3.json", source: "cursed_scroll_1", startPage: 45, endPage: 48, useToc: false },
  { filename: "Cursed_Scroll_2_-_Red_Sands_V2-2.json", source: "cursed_scroll_2", startPage: 39, endPage: 44, useToc: false },
  { filename: "Cursed_Scroll_3_-_Midnight_Sun_V3-5.json", source: "cursed_scroll_3", startPage: 43, endPage: 48, useToc: false },
  { filename: "Cursed_Scroll_4_-_River_of_Night_V1-4.json", source: "cursed_scroll_4", startPage: 59, endPage: 65, useToc: false },
  { filename: "Cursed_Scroll_5_-_Dwellers_in_the_Deep_V1-3.json", source: "cursed_scroll_5", startPage: 33, endPage: 36, useToc: false },
];

// AC with optional armor text in parentheses e.g. "AC 15 (chainmail + shield)",
// optional comma before ATK, and dual HP/LV notation (e.g. HP 29/42, LV 6/9).
const STAT_REGEX = /AC\s+(\d+)(?:\s*\([^)]+\))?,\s*HP\s+(\d+(?:\/\d+)?),?\s*ATK\s+([\s\S]+?),\s*MV\s+([\s\S]+?),\s*S\s+([+-]?\d+),\s*D\s+([+-]?\d+),\s*C\s+([+-]?\d+),\s*I\s+([+-]?\d+),\s*W\s+([+-]?\d+),\s*Ch\s+([+-]?\d+),\s*AL\s+([LNCU]),\s*LV\s+(\d+(?:\/\d+)?)/gi;

/** "Relentless." / "Lightning Breath." / "Stink Bomb (WIS Spell)." — a short name, then a period or colon. */
export const TRAIT_HEADER = /^[A-Z][A-Za-z'’-]*(?: [A-Za-z'’-]+){0,4}(?: \([A-Z]{3} [Ss]pell\))?[.:](?:\s|$)/;
const RULE_WORDS = new Set(["DC", "HP", "AC", "STR", "DEX", "CON", "INT", "WIS", "CHA", "ADV", "DISADV"]);

// Monsters whose heading is detached from the stat block in the PDF layout. Keyed by file:page or file:page:level.
const PAGE_SPECIAL_NAMES: Record<string, string> = {
  "Shadowdark_RPG_-_V4-8.json:238": "Mordanticus the Flayed",
  "Shadowdark_RPG_-_V4-8.json:242": "Obe-Ixx of Azarumme",
  "Shadowdark_RPG_-_V4-8.json:250": "Rathgamnon",
  "Shadowdark_RPG_-_V4-8.json:259": "The Ten-Eyed Oracle",
  "Shadowdark_RPG_-_V4-8.json:260": "The Tarrasque",
  "Shadowdark_RPG_-_V4-8.json:262": "The Wandering Merchant",
  "Cursed_Scroll_1_-_Diablerie_V4-3.json:48:13": "Weeping Father",
  "Cursed_Scroll_2_-_Red_Sands_V2-2.json:43:18": "The Scourge",
};

const NAME_EXCEPTIONS: Record<string, string> = {
  "OBE-IXX OF AZARUMME": "Obe-Ixx of Azarumme",
  "MORDANTICUS THE FLAYED": "Mordanticus the Flayed",
  "THE TARRASQUE": "The Tarrasque",
  "THE TEN-EYED ORACLE": "The Ten-Eyed Oracle",
  "THE WANDERING MERCHANT": "The Wandering Merchant",
  "THE SCOURGE": "The Scourge",
  "WEEPING FATHER": "Weeping Father",
  "RATHGAMNON": "Rathgamnon",
  "WILL-O'-WISP": "Will-o'-the-Wisp",
  "WILL-O-WISP": "Will-o'-the-Wisp",
};

const LOWERCASE_WORDS = new Set(["of", "the", "in", "and", "or", "a", "an", "on", "at", "to", "for", "with"]);

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function toTitleCase(name: string): string {
  const cleanUpper = name.trim().toUpperCase();
  if (NAME_EXCEPTIONS[cleanUpper]) {
    return NAME_EXCEPTIONS[cleanUpper];
  }

  const tokens = name.trim().split(/([\s,\-\/]+)/);
  const result: string[] = [];
  let wordIdx = 0;
  for (const tok of tokens) {
    if (/^[\s,\-\/]+$/.test(tok)) {
      result.push(tok);
    } else {
      const lower = tok.toLowerCase();
      if (wordIdx > 0 && LOWERCASE_WORDS.has(lower)) {
        result.push(lower);
      } else {
        result.push(lower.charAt(0).toUpperCase() + lower.slice(1));
      }
      wordIdx++;
    }
  }
  return result.join("");
}

function loadFamilyMap(): Record<string, string> {
  const mapPath = resolve(FAMILY_MAP_PATH);
  if (!existsSync(mapPath)) {
    throw new Error(`Family map not found: ${mapPath}`);
  }
  return JSON.parse(readFileSync(mapPath, "utf-8"));
}

function isTraitHeader(line: string): boolean {
  return TRAIT_HEADER.test(line) && !RULE_WORDS.has(line.split(/[\s.:]/)[0]);
}

/**
 * Reads the trait block that follows a stat block. The caller cuts the lines at the next
 * monster's heading. A new trait starts at a short "Name." header after a finished sentence;
 * every other line is a continuation (PDF text wraps mid-sentence and after "DC 13.").
 * The block ends at an ALL-CAPS heading (family intros, zine back matter) or a pull quote.
 * When the next monster's heading is detached from its stat block there is no cut point,
 * so `stopAtDescription` also ends the block at an "A …"/"An …" description sentence.
 */
export function extractTraitBlock(lines: string[], stopAtDescription: boolean): string[] {
  const traits: string[] = [];
  let current = "";
  for (const rawLine of lines) {
    // Page numbers and bare list markers ("1.") carry no trait text.
    if (/^\d+\.?$/.test(rawLine)) continue;
    // Tabbed list items: "2.\t Hold. DC 15 STR…" → "Hold. DC 15 STR…"
    const line = rawLine.replace(/^\d+\.\t\s*/, "");
    if (/^[“"]/.test(line) || isHeadingLine(line.replace(/^\d+\s*/, "").replace(/[,\.]/g, "").trim())) break;

    const endsSentence = /[.!?]["”')\]]*$/.test(current);
    if (!current) {
      if (!isTraitHeader(line)) break;
      current = line;
    } else if (endsSentence && isTraitHeader(line)) {
      traits.push(current);
      current = line;
    } else if (endsSentence && /^[A-Z][a-z]+s are /.test(line)) {
      // Family sidebar with no heading: "Elementals are semi-humanoid beings…"
      break;
    } else if (endsSentence && stopAtDescription && /^An? [a-z]/.test(line)) {
      break;
    } else {
      current += " " + line;
    }
  }
  if (current) traits.push(current);
  return traits;
}

function lettersOnly(text: string): string {
  return text.replace(/[^a-zA-Z]/g, "").toUpperCase();
}

function isHeadingLine(clean: string): boolean {
  return (
    /[A-Z]{2}/.test(clean) &&
    !/\d/.test(clean) &&
    clean === clean.toUpperCase() &&
    !clean.includes("TABLE") &&
    !clean.includes("CHAPTER") &&
    !clean.startsWith("PAGE") &&
    !clean.startsWith("AC ") &&
    !clean.startsWith("LV ")
  );
}

function tocLeafTitles(range: SourceRange): string[] {
  const pdf = loadExtractedPdf(range.filename);
  const titles: string[] = [];
  for (let i = 0; i < pdf.toc.length; i++) {
    const [depth, title, page] = pdf.toc[i];
    if (page < range.startPage || page > range.endPage || title === "Monster Statistics") continue;
    const next = pdf.toc[i + 1];
    if (!(next && next[0] > depth)) titles.push(title.toUpperCase());
  }
  return titles;
}

export function extractMonsters(range: SourceRange, familyMap: Record<string, string>): MonsterSchema[] {
  const pdf = loadExtractedPdf(range.filename);
  const monsterPages = pdf.pages.filter((p) => p.page_num >= range.startPage && p.page_num <= range.endPage);
  const combinedText = monsterPages.map((p) => p.text).join("\n\n");
  const tocTitles = range.useToc ? tocLeafTitles(range) : [];
  const toLines = (text: string) => text.split("\n").map((l) => l.trim()).filter(Boolean);

  const matches = [...combinedText.matchAll(STAT_REGEX)];

  // Pass 1: name each stat block and find where its heading sits in the text before it.
  const blocks = matches.map((match, i) => {
    const matchIndex = match.index;
    const level = parseInt(match[12].split("/")[0], 10);

    let charSum = 0;
    let pageNum = range.startPage;
    for (const p of monsterPages) {
      charSum += p.text.length + 2;
      if (charSum >= matchIndex) {
        pageNum = p.page_num;
        break;
      }
    }

    const prevEnd = i === 0 ? 0 : matches[i - 1].index + matches[i - 1][0].length;
    const linesBefore = toLines(combinedText.slice(prevEnd, matchIndex));

    const specialName =
      PAGE_SPECIAL_NAMES[`${range.filename}:${pageNum}:${level}`] ?? PAGE_SPECIAL_NAMES[`${range.filename}:${pageNum}`];
    let name = specialName;
    let headingIndex = -1;
    for (let j = linesBefore.length - 1; j >= 0; j--) {
      const clean = linesBefore[j].replace(/^\d+\s*/, "").replace(/[,\.]/g, "").trim();
      const isHeading = specialName
        ? lettersOnly(clean) === lettersOnly(specialName)
        : tocTitles.includes(clean.toUpperCase()) || isHeadingLine(clean);
      if (isHeading) {
        headingIndex = j;
        name ??= clean;
        break;
      }
    }
    if (!name) {
      throw new Error(`No name heading found for stat block "${match[0].slice(0, 40)}…" in ${range.filename} page ${pageNum}`);
    }
    return { match, level, pageNum, linesBefore, headingIndex, name: toTitleCase(name) };
  });

  // Pass 2: traits run from the end of each stat block to the next monster's heading.
  const monsters: MonsterSchema[] = [];
  const seenIds = new Set<string>();

  for (let i = 0; i < blocks.length; i++) {
    const { match, level, pageNum, name } = blocks[i];
    const next = blocks[i + 1];
    const traitLines = next
      ? next.headingIndex >= 0
        ? next.linesBefore.slice(0, next.headingIndex)
        : next.linesBefore
      : toLines(combinedText.slice(match.index + match[0].length));
    const traits = extractTraitBlock(traitLines, next !== undefined && next.headingIndex < 0);

    let id = slugify(name);
    if (seenIds.has(id)) id = `${id}_${level}`;
    if (seenIds.has(id)) {
      throw new Error(`Duplicate monster id "${id}" in ${range.filename} page ${pageNum}`);
    }
    seenIds.add(id);

    const family = familyMap[id];
    if (!family) {
      throw new Error(`No family for monster "${id}" in ${FAMILY_MAP_PATH}`);
    }

    const cha = parseInt(match[10], 10);
    monsters.push({
      id,
      name,
      source: range.source,
      family,
      level,
      ac: parseInt(match[1], 10),
      hp: parseInt(match[2].split("/")[0], 10),
      morale: Math.min(12, Math.max(5, 7 + Math.floor(level / 2) + Math.max(0, cha))),
      attacks: match[3].replace(/\s+/g, " ").trim().split(/\s+or\s+|\s*,\s*(?=\d+\s)/i).map((a) => a.trim()),
      move: match[4].replace(/\s+/g, " ").trim(),
      abilities: {
        str: parseInt(match[5], 10),
        dex: parseInt(match[6], 10),
        con: parseInt(match[7], 10),
        int: parseInt(match[8], 10),
        wis: parseInt(match[9], 10),
        cha,
      },
      alignment: match[11].toUpperCase() as MonsterSchema["alignment"],
      traits,
    });
  }

  return monsters;
}

export function runMonsterIngestion(): { core: MonsterSchema[]; cursedScrolls: MonsterSchema[]; total: number } {
  const familyMap = loadFamilyMap();

  console.log("Extracting monsters from Shadowdark Core...");
  const coreMonsters = extractMonsters(CORE_RANGE, familyMap);
  console.log(`Extracted ${coreMonsters.length} core monsters.`);

  console.log("Extracting monsters from Cursed Scrolls 1-5...");
  const csMonsters = CURSED_SCROLL_RANGES.flatMap((range) => extractMonsters(range, familyMap));
  console.log(`Extracted ${csMonsters.length} Cursed Scroll monsters.`);

  const allMonstersMap = new Map<string, MonsterSchema>();
  for (const m of [...coreMonsters, ...csMonsters]) {
    allMonstersMap.set(m.id, m);
  }
  const allMonsters = Array.from(allMonstersMap.values());

  const staleFamilyKeys = Object.keys(familyMap).filter((key) => !allMonstersMap.has(key));
  if (staleFamilyKeys.length) {
    throw new Error(`${FAMILY_MAP_PATH} has ids that match no extracted monster: ${staleFamilyKeys.join(", ")}`);
  }

  const outDir = resolve(STATS_DIR);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(resolve(outDir, "shadowdark-core.json"), JSON.stringify(coreMonsters, null, 2) + "\n", "utf-8");
  writeFileSync(resolve(outDir, "cursed-scrolls.json"), JSON.stringify(csMonsters, null, 2) + "\n", "utf-8");

  // Bundled copy for the client Codex until it moves to the redacted bestiary API (plan P5).
  const tsContent = `// Auto-generated by scripts/ingest/extract-monsters.ts from Shadowdark Core and Cursed Scrolls 1-5. Do not edit.
export interface BestiaryReferenceEntry {
  id: string;
  name: string;
  source: string;
  family: string;
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
}

export const BESTIARY_ENTRIES: BestiaryReferenceEntry[] = ${JSON.stringify(allMonsters, null, 2)};
`;

  writeFileSync(resolve("src/shared/bestiary-data.ts"), tsContent, "utf-8");
  console.log(`Saved ${allMonsters.length} total monsters to ${STATS_DIR}/ and src/shared/bestiary-data.ts.`);
  return { core: coreMonsters, cursedScrolls: csMonsters, total: allMonsters.length };
}

if (process.argv[1]?.endsWith("extract-monsters.ts")) {
  runMonsterIngestion();
}
