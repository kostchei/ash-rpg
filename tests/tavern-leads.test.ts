import { describe, expect, it } from "vitest";
import { mergeTavernLeads, reportedLeadDanger } from "../src/shared/tavern-leads.js";
import type { PublicHex } from "../src/shared/types.js";

describe("tavern lead presentation", () => {
  it("combines duplicate lists while retaining rewards, danger and distinct follow-ups", () => {
    const leads = mergeTavernLeads(
      [{ id: "a", claim: "Rescue", promisedReward: "40 GP", apparentDanger: "Risky" }],
      [{ id: "a", claim: "Rescue", title: "Surveyor", promisedReward: undefined }, { id: "b", claim: "Follow-up" }],
    );
    expect(leads).toHaveLength(2);
    expect(leads[0]).toMatchObject({ title: "Surveyor", promisedReward: "40 GP", apparentDanger: "Risky" });
  });

  it("reads legacy danger hints and explicitly identifies unknown danger", () => {
    expect(reportedLeadDanger({ id: "a", claim: "Rescue", dangerHint: "Risky · Patrols" })).toBe("Risky · Patrols");
    expect(reportedLeadDanger({ id: "a", claim: "Rescue" })).toContain("Danger level unknown");
  });

  it("leads with a patron's explicit risk rating in Unsafe/Risky/Deadly terms", () => {
    const lead = { id: "a", claim: "Rescue", riskLevel: "deadly" as const, dangerHint: "Mind-siphoning slimes" };
    expect(reportedLeadDanger(lead)).toBe("Deadly (rated by the patron) · Mind-siphoning slimes");
  });

  it("uses surveyed area danger without exposing hidden hex tiers or replacing a report", () => {
    const lead = { id: "a", claim: "Rescue", targetHexId: "01", dangerHint: "Patrols" };
    const hex: PublicHex = { id: "01", q: 1, r: 0, ring: 1, revealState: "unexplored", threatTier: 3 };
    expect(reportedLeadDanger(lead, [hex])).toBe("Danger level unknown · Patrols");
    expect(reportedLeadDanger(lead, [{ ...hex, revealState: "scouted" }])).toBe("Deadly (area estimate) · Patrols");
    expect(reportedLeadDanger({ ...lead, apparentDanger: "Risky, by report" }, [hex])).toBe("Risky, by report");
  });
});
