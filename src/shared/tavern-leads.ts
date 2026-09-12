import { DANGER_LEVELS, DANGER_LEVEL_LABEL, dangerLevelForThreatTier } from "./danger.js";
import type { PublicHex, TavernLead } from "./types.js";

const DANGER_WORD = new RegExp(String.raw`\b(${DANGER_LEVELS.join("|")})\b`, "i");

/** Combine the establishment and compatibility lists without repeating a lead. */
export function mergeTavernLeads(...lists: (TavernLead[] | undefined)[]): TavernLead[] {
  const leads = new Map<string, TavernLead>();
  for (const list of lists) {
    for (const lead of list ?? []) {
      const previous = leads.get(lead.id);
      const defined = Object.fromEntries(Object.entries(lead).filter(([, value]) => value !== undefined));
      leads.set(lead.id, { ...previous, ...defined } as TavernLead);
    }
  }
  return [...leads.values()];
}

/**
 * The danger a lead reports, in Unsafe/Risky/Deadly terms.
 * A patron's explicit quest risk rating wins; otherwise a surveyed area's danger
 * is offered as a labelled estimate. An unsurveyed destination stays unknown —
 * hidden hex tiers are never leaked, and a numeric tier is never treated as a
 * quest risk rating.
 */
export function reportedLeadDanger(lead: TavernLead, hexes: PublicHex[] = []): string {
  const report = lead.apparentDanger?.trim() || lead.dangerHint?.trim();
  if (lead.riskLevel) {
    return [`${DANGER_LEVEL_LABEL[lead.riskLevel]} (rated by the patron)`, report].filter(Boolean).join(" · ");
  }
  if (report && DANGER_WORD.test(report)) return report;
  const destination = hexes.find((hex) => hex.id === lead.targetHexId);
  const surveyed =
    destination?.threatTier != null && ["scouted", "explored", "fully_mapped"].includes(destination.revealState);
  const areaDanger = surveyed ? dangerLevelForThreatTier(destination.threatTier!) : undefined;
  return [
    areaDanger ? `${DANGER_LEVEL_LABEL[areaDanger]} (area estimate)` : "Danger level unknown",
    report || "No reliable hazard report",
  ].join(" · ");
}
