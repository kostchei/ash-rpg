/**
 * Extracts the four core d100 treasure tables (Treasure 0-3, 4-6, 7-9, 10+) from
 * the extracted rulebook text into data/treasure/core-tables.json.
 *
 * Usage: npx tsx scripts/ingest/extract-treasure-tables.ts [path/to/Shadowdark_RPG_-_V4-8.json]
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const DEFAULT_SOURCE = "D:/Code/Core_Dark/tmp/extracted_text/Shadowdark_RPG_-_V4-8.json";

/** Page spreads holding each table, in book order. */
const BANDS = [
  { band: "0-3", pages: ["270", "271"], minLevel: 0, maxLevel: 3 },
  { band: "4-6", pages: ["272", "273"], minLevel: 4, maxLevel: 6 },
  { band: "7-9", pages: ["274", "275"], minLevel: 7, maxLevel: 9 },
  { band: "10+", pages: ["276", "277"], minLevel: 10, maxLevel: null },
] as const;

export interface TreasureTableEntry {
  /** Inclusive d100 range; a roll of 100 is printed as "00" and stored as 100. */
  min: number;
  max: number;
  description: string;
  /** Total value of the find in gp, including "each" multipliers. */
  valueGp: number;
  /** Set when the entry is loose coin rather than an object. */
  coins?: { gp: number; sp: number; cp: number };
}

const COIN_IN_GP = { gp: 1, sp: 0.1, cp: 0.01 } as const;

/** An "each" price always covers several objects, so articles are not counts. */
const COUNT_WORDS: Record<string, number> = {
  pair: 2, two: 2, both: 2, trio: 3, three: 3, four: 4,
  five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
};

/**
 * Number of objects an "each"-priced entry contains, e.g. "Matched trio of
 * warhammers" -> 3. The trailing price clause is stripped first so the unit
 * price is never mistaken for the count.
 */
function parseCount(description: string): number {
  const withoutPrice = description.replace(/\([^)]*\)\s*$/, "");
  const digits = withoutPrice.match(/\b(\d+)\b/);
  if (digits) return Number(digits[1]);
  for (const word of withoutPrice.toLowerCase().split(/[^a-z]+/)) {
    if (COUNT_WORDS[word] !== undefined) return COUNT_WORDS[word];
  }
  throw new Error(`Cannot determine the item count of an "each"-priced entry: ${description}`);
}

function parseRollRange(token: string): { min: number; max: number } {
  const single = token.match(/^(\d{2})$/);
  if (single) {
    const value = single[1] === "00" ? 100 : Number(single[1]);
    return { min: value, max: value };
  }
  const range = token.match(/^(\d{2})-(\d{2})$/);
  if (!range) throw new Error(`Unrecognised d100 roll token: ${token}`);
  return { min: Number(range[1]), max: Number(range[2]) };
}

function parseEntry(token: string, description: string): TreasureTableEntry {
  const { min, max } = parseRollRange(token);
  const priced = description.match(/\(([\d,]+) (cp|sp|gp)( each)?\)\s*$/);

  if (priced) {
    const unit = Number(priced[1].replace(/,/g, "")) * COIN_IN_GP[priced[2] as keyof typeof COIN_IN_GP];
    const count = priced[3] ? parseCount(description) : 1;
    return { min, max, description, valueGp: Math.round(unit * count * 100) / 100 };
  }

  // No parenthesised price: these entries are loose coin described in prose.
  const loose = description.match(/\b([\d,]+) (cp|sp|gp)\b/);
  if (!loose) throw new Error(`Treasure entry has neither a price nor a coin amount: ${description}`);
  const amount = Number(loose[1].replace(/,/g, ""));
  const denomination = loose[2] as "cp" | "sp" | "gp";
  return {
    min,
    max,
    description,
    valueGp: Math.round(amount * COIN_IN_GP[denomination] * 100) / 100,
    coins: { gp: denomination === "gp" ? amount : 0, sp: denomination === "sp" ? amount : 0, cp: denomination === "cp" ? amount : 0 },
  };
}

/** Rows are printed as a roll token line followed by its details line. */
function parseTablePage(text: string): TreasureTableEntry[] {
  const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
  const entries: TreasureTableEntry[] = [];
  for (let i = 0; i < lines.length - 1; i++) {
    if (!/^(\d{2})(-\d{2})?$/.test(lines[i])) continue;
    const next = lines[i + 1];
    if (/^(\d{2})(-\d{2})?$/.test(next)) continue; // page number followed by a roll token
    entries.push(parseEntry(lines[i], next));
    i++;
  }
  return entries;
}

function assertCoversD100(band: string, entries: TreasureTableEntry[]): void {
  const covered = new Set<number>();
  for (const entry of entries) {
    for (let roll = entry.min; roll <= entry.max; roll++) {
      if (covered.has(roll)) throw new Error(`Treasure ${band}: roll ${roll} is covered twice`);
      covered.add(roll);
    }
  }
  const missing = [];
  for (let roll = 1; roll <= 100; roll++) if (!covered.has(roll)) missing.push(roll);
  if (missing.length > 0) throw new Error(`Treasure ${band}: no entry for d100 roll(s) ${missing.join(", ")}`);
}

export function extractTreasureTables(sourcePath: string) {
  const book = JSON.parse(readFileSync(sourcePath, "utf-8")) as { pages: Array<{ text: string }> };
  const byLeadingNumber = new Map<string, string>();
  for (const page of book.pages) {
    const heading = page.text.trim().split("\n")[0].trim();
    if (/^\d{3}$/.test(heading) && !byLeadingNumber.has(heading)) byLeadingNumber.set(heading, page.text);
  }

  return BANDS.map(({ band, pages, minLevel, maxLevel }) => {
    const entries = pages.flatMap((pageNumber) => {
      const text = byLeadingNumber.get(pageNumber);
      if (!text) throw new Error(`Page ${pageNumber} is missing from ${sourcePath}`);
      return parseTablePage(text);
    });
    assertCoversD100(band, entries);
    return { band, minLevel, maxLevel, entries };
  });
}

const isEntryPoint = process.argv[1]?.replace(/\\/g, "/").endsWith("extract-treasure-tables.ts");
if (isEntryPoint) {
  const sourcePath = process.argv[2] ?? DEFAULT_SOURCE;
  const tables = extractTreasureTables(sourcePath);
  const outDir = resolve("data/treasure");
  mkdirSync(outDir, { recursive: true });
  const payload = {
    source: "Shadowdark RPG core rules, Treasure 0-3 / 4-6 / 7-9 / 10+ (pp. 270-277)",
    extractedFrom: sourcePath,
    tables,
  };
  writeFileSync(resolve(outDir, "core-tables.json"), `${JSON.stringify(payload, null, 2)}\n`, "utf-8");
  for (const table of tables) {
    const values = table.entries.map((e) => e.valueGp);
    console.log(
      `Treasure ${table.band}: ${table.entries.length} entries, ${Math.min(...values)}-${Math.max(...values)} gp`,
    );
  }
}
