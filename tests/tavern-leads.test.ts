import { describe, expect, it } from "vitest";
import { mergeTavernLeads, reportedLeadDanger } from "../src/shared/tavern-leads.js";
import type { PublicHex } from "../src/shared/types.js";

describe("tavern lead presentation", () => {
  it("combines duplicate lists while retaining rewards, danger and distinct follow-ups", () => {
    const leads = mergeTavernLeads(
      [{ id: "a", claim: "Rescue", promisedReward: "40 GP", apparentDanger: "Tier 2" }],
      [{ id: "a", claim: "Rescue", title: "Surveyor", promisedReward: undefined }, { id: "b", claim: "Follow-up" }],
    );
    expect(leads).toHaveLength(2);
    expect(leads[0]).toMatchObject({ title: "Surveyor", promisedReward: "40 GP", apparentDanger: "Tier 2" });
  });

  it("reads legacy danger hints and explicitly identifies unknown danger", () => {
    expect(reportedLeadDanger({ id: "a", claim: "Rescue", dangerHint: "Tier 2 Threat · Patrols" })).toBe("Tier 2 Threat · Patrols");
    expect(reportedLeadDanger({ id: "a", claim: "Rescue" })).toContain("Level unknown");
  });

  it("uses surveyed area danger without exposing hidden hex tiers or replacing a report", () => {
    const lead = { id: "a", claim: "Rescue", targetHexId: "01", dangerHint: "Patrols" };
    const hex: PublicHex = { id: "01", q: 1, r: 0, ring: 1, revealState: "unexplored", threatTier: 3 };
    expect(reportedLeadDanger(lead, [hex])).toBe("Level unknown · Patrols");
    expect(reportedLeadDanger(lead, [{ ...hex, revealState: "scouted" }])).toBe("Tier 3 (area estimate) · Patrols");
    expect(reportedLeadDanger({ ...lead, apparentDanger: "Tier 2 reported" }, [hex])).toBe("Tier 2 reported");
  });
});
