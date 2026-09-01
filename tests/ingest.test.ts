import { describe, expect, it } from "vitest";
import { parseStatBlocksFromText, parseRollTable } from "../scripts/ingest/lib/pages.js";

describe("Extraction Toolkit", () => {
  it("parses a Shadowdark monster stat block correctly", () => {
    const sampleText = `
OWLBEAR
Cantankerous bears with owl eyes, beaks, and feathers.
AC 13, HP 30, ATK 2 claw +5 (1d10), MV near (climb), S +4, D +1, C +3, I -2, W +2, Ch -3, AL N, LV 6
Crush. Deals an extra die of damage if it hits the same target with both claws.
`;
    const parsed = parseStatBlocksFromText(sampleText);
    expect(parsed).toHaveLength(1);
    const m = parsed[0];
    expect(m.name).toBe("OWLBEAR");
    expect(m.ac).toBe(13);
    expect(m.hp).toBe(30);
    expect(m.level).toBe(6);
    expect(m.alignment).toBe("N");
    expect(m.str).toBe(4);
    expect(m.dex).toBe(1);
    expect(m.con).toBe(3);
    expect(m.int).toBe(-2);
    expect(m.wis).toBe(2);
    expect(m.cha).toBe(-3);
    expect(m.attacks).toContain("2 claw +5 (1d10)");
    expect(m.traits.length).toBeGreaterThan(0);
    expect(m.traits[0]).toContain("Crush");
  });

  it("parses a roll table with range rows", () => {
    const tableLines = ["1", "First option", "2-3", "Second option with details", "4-6", "Third option"];
    const rows = parseRollTable(tableLines);
    expect(rows).toHaveLength(3);
    expect(rows[0]).toEqual({ min: 1, max: 1, value: "First option" });
    expect(rows[1]).toEqual({ min: 2, max: 3, value: "Second option with details" });
    expect(rows[2]).toEqual({ min: 4, max: 6, value: "Third option" });
  });
});
