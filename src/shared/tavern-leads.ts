import type { PublicHex, TavernLead } from "./types.js";

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

export function reportedLeadDanger(lead: TavernLead, hexes: PublicHex[] = []): string {
  const report = lead.apparentDanger?.trim() || lead.dangerHint?.trim();
  if (report && /\btier\s+\d+/i.test(report)) return report;
  const destination = hexes.find((hex) => hex.id === lead.targetHexId);
  const tier = destination && ["scouted", "explored", "fully_mapped"].includes(destination.revealState) ? destination.threatTier : undefined;
  return [tier != null ? `Tier ${tier} (area estimate)` : "Level unknown", report || "No reliable hazard report"].join(" · ");
}
